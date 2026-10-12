package handlers

import (
	"context"
	"crypto/sha512"
	"crypto/subtle"
	"errors"
	"fmt"
	"html"
	"io"
	"log"
	"math"
	"net/http"
	"net/url"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"backend/internal/apierr"
	"backend/internal/middleware"
	"backend/internal/models"
	"backend/internal/random"
	"backend/internal/store"
)

// ─────────────────────────────────────────────────────────────────────────────
// Easebuzz helpers
// ─────────────────────────────────────────────────────────────────────────────

func (a *API) easebuzzBaseURL() string {
	if a.Cfg.EasebuzzEnv == "prod" {
		return "https://pay.easebuzz.in"
	}
	return "https://testpay.easebuzz.in"
}

// easebuzzInitiateURL is the server-to-server initiation endpoint.
func (a *API) easebuzzInitiateURL() string {
	return a.easebuzzBaseURL() + "/payment/initiateLink"
}

// easebuzzHash builds the SHA-512 request hash Easebuzz expects:
// key|txnid|amount|productinfo|firstname|email|udf1|...|udf10|salt
// All ten udf fields are empty here, which leaves eleven pipes between the
// email and the salt.
func easebuzzHash(key, txnid, amount, productinfo, firstname, email, salt string) string {
	plain := key + "|" + txnid + "|" + amount + "|" + productinfo + "|" + firstname + "|" + email + strings.Repeat("|", 11) + salt
	return fmt.Sprintf("%x", sha512.Sum512([]byte(plain)))
}

// verifyEasebuzzHash checks the reverse hash Easebuzz sends on the callback:
// salt|status|udf10|...|udf1|email|firstname|productinfo|amount|txnid|key
// With empty udfs that is eleven pipes between the status and the email.
func verifyEasebuzzHash(received, salt, status, txnid, amount, productinfo, firstname, email, key string) bool {
	plain := salt + "|" + status + strings.Repeat("|", 11) + email + "|" + firstname + "|" + productinfo + "|" + amount + "|" + txnid + "|" + key
	computed := fmt.Sprintf("%x", sha512.Sum512([]byte(plain)))
	return subtle.ConstantTimeCompare([]byte(computed), []byte(strings.ToLower(received))) == 1
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/payments/initiate  — called by the app to start a payment
// ─────────────────────────────────────────────────────────────────────────────

type initiatePaymentBody struct {
	EventID       string          `json:"eventId"` // empty for pure accommodation
	TeamID        string          `json:"teamId"`  // empty for individual events
	PaymentType   string          `json:"paymentType"`
	CouponCode    string          `json:"couponCode"`
	Accommodation map[string]bool `json:"accommodation"` // e.g. "day1": true
	Food          map[string]bool `json:"food"`
}

// Per-day prices in rupees. The app shows the same numbers (ACCOMMODATION_PRICE
// and FOOD_PRICE in Payment.tsx), so change both together.
const (
	AccommodationPricePerDay = 300
	FoodPricePerDay          = 200
)

// stayDays are the day keys accommodation and food can be bought for; they match
// the keys the app and the hostel check-in screen use.
var stayDays = map[string]bool{"day0": true, "day1": true, "day2": true, "day3": true, "day4": true}

var paymentTypes = map[string]bool{
	models.PaymentTypeEvent:                        true,
	models.PaymentTypeAccommodation:                true,
	models.PaymentTypeAccommodationAndFood:         true,
	models.PaymentTypeEventAndAccommodation:        true,
	models.PaymentTypeEventAndAccommodationAndFood: true,
}

// stayCharge validates the requested days and returns the days actually being
// bought. Days the user already holds are dropped rather than charged again.
func stayCharge(requested map[string]bool, owned map[string]bool, unitPrice int) (days map[string]any, fee int, bad string) {
	days = map[string]any{}
	for day, selected := range requested {
		if !stayDays[day] {
			return nil, 0, day
		}
		if selected && !owned[day] {
			days[day] = true
			fee += unitPrice
		}
	}
	return days, fee, ""
}

// InitiatePayment creates a Payment document in Firestore and returns the
// Easebuzz checkout URL that the mobile app should open in a WebView. Calling
// it again with the same cart returns the same payment (see Store.BeginCheckout).
func (a *API) InitiatePayment(c *gin.Context) {
	ctx := c.Request.Context()
	user := middleware.CurrentUser(c)

	var body initiatePaymentBody
	if !bind(c, &body) {
		return
	}

	paymentType := body.PaymentType
	if paymentType == "" {
		paymentType = models.PaymentTypeEvent
		if body.EventID == "" {
			paymentType = models.PaymentTypeAccommodation
		}
	}
	if !paymentTypes[paymentType] {
		apierr.Respond(c, apierr.BadRequest("invalid_payment_type", "unknown paymentType"))
		return
	}

	var event *models.Event
	var team *models.Team
	eventPaymentType := models.EventPaymentTypeIndividual
	covered := []string{}

	if body.EventID != "" {
		var ok bool
		event, ok = a.loadVisibleEvent(c, body.EventID)
		if !ok {
			return
		}

		if !event.PaymentRequired {
			apierr.Respond(c, apierr.BadRequest("no_payment_required", "this event does not require payment"))
			return
		}

		if event.EventType == models.EventTypeTeam {
			eventPaymentType = models.EventPaymentTypeTeam
			if body.TeamID == "" {
				apierr.Respond(c, apierr.BadRequest("missing_team_id", "teamId is required for team events"))
				return
			}
			var err error
			team, err = a.Store.GetTeam(ctx, body.TeamID)
			if err != nil || team.EventID != event.EventID {
				apierr.Respond(c, apierr.NotFound("team_not_found", "team not found"))
				return
			}
			if !team.IsLeader(user.UserID) {
				apierr.Respond(c, apierr.Forbidden("leader_only", "only the team leader can initiate payment"))
				return
			}
			if team.Paid {
				apierr.Respond(c, apierr.Conflict("already_paid", "payment has already been completed"))
				return
			}
			covered = slices.Clone(team.MemberIDs)
		} else {
			covered = []string{user.UserID}
		}

		// The payer must be registered, and not already paid.
		regID := models.RegistrationID(event.EventID, user.UserID)
		reg, err := a.Store.GetRegistration(ctx, regID)
		if err != nil {
			apierr.Respond(c, apierr.NotFound("not_registered", "you are not registered for this event"))
			return
		}
		if reg.PaymentStatus == models.PaymentStatusSuccess {
			apierr.Respond(c, apierr.Conflict("already_paid", "payment has already been completed"))
			return
		}
	}

	// Event fee. A per-individual team event is priced per member, each by their
	// own host status; the roster is frozen for the checkout (JoinTeam is locked).
	eventFee := 0
	if event != nil {
		eventFee = event.FeeFor(user.IsHostCollegeStudent)
		if team != nil && event.PaymentType == "per_individual" {
			members, err := a.Store.GetUsers(ctx, team.MemberIDs)
			if err != nil {
				apierr.Respond(c, apierr.Internal("could not price the team"))
				return
			}
			if len(members) != len(team.MemberIDs) {
				apierr.Respond(c, apierr.Internal("a team member's profile is missing; contact the organisers"))
				return
			}
			eventFee = 0
			for _, m := range members {
				m.ResolveHostStatus(a.Cfg.HostEmailDomain)
				eventFee += event.FeeFor(m.IsHostCollegeStudent)
			}
		}
	}

	accommodationMap, accFee, bad := stayCharge(body.Accommodation, user.Accommodation, AccommodationPricePerDay)
	if bad != "" {
		apierr.Respond(c, apierr.BadRequest("invalid_day", "unknown accommodation day: "+bad))
		return
	}
	foodMap, foodFee, bad := stayCharge(body.Food, user.Food, FoodPricePerDay)
	if bad != "" {
		apierr.Respond(c, apierr.BadRequest("invalid_day", "unknown food day: "+bad))
		return
	}

	a.initiate(c, user, event, team, eventPaymentType, paymentType, body.CouponCode,
		covered, eventFee, accommodationMap, accFee, foodMap, foodFee)
}

// initiate prices the cart, applies the coupon and opens the checkout.
func (a *API) initiate(
	c *gin.Context,
	user *models.User,
	event *models.Event,
	team *models.Team,
	eventPaymentType, paymentType, couponCode string,
	covered []string,
	eventFee int,
	accommodationMap map[string]any, accFee int,
	foodMap map[string]any, foodFee int,
) {
	ctx := c.Request.Context()

	originalAmount := eventFee + accFee + foodFee
	if originalAmount <= 0 {
		apierr.Respond(c, apierr.BadRequest("no_fee", "total fee is zero"))
		return
	}

	discountAmount := 0
	var couponDetails *models.CouponDetails
	if couponCode != "" {
		coupon, err := a.Store.GetCoupon(ctx, couponCode)
		if err != nil {
			apierr.Respond(c, apierr.BadRequest("invalid_coupon", "Coupon not found"))
			return
		}
		if apiErr := a.checkCoupon(ctx, coupon, user, originalAmount); apiErr != nil {
			apierr.Respond(c, apiErr)
			return
		}
		discount := 0.0
		switch coupon.DiscountType {
		case "flat":
			discount = coupon.DiscountValue
		case "percentage":
			discount = float64(originalAmount) * (coupon.DiscountValue / 100.0)
		}
		discountAmount = min(int(discount), originalAmount)
		couponDetails = &models.CouponDetails{
			Code:          coupon.Code,
			DiscountType:  coupon.DiscountType,
			DiscountValue: coupon.DiscountValue,
		}
		couponCode = coupon.Code
	}

	var evtIntention *models.EventRegistrationIntention
	eventID, teamID, checkoutID := "", "", user.UserID+"_stay"
	if event != nil {
		eventID = event.EventID
		checkoutID = user.UserID + "_" + eventID
		evtIntention = &models.EventRegistrationIntention{
			EventID:        event.EventID,
			EventType:      eventPaymentType,
			Amount:         eventFee,
			CoveredUserIDs: covered,
		}
		if team != nil {
			teamID = team.TeamID
			checkoutID = team.TeamID
			evtIntention.TeamID = team.TeamID
			evtIntention.TeamName = team.TeamName
		}
	}

	payment := models.NewPayment(
		models.NewPaymentID(random.Code(8)), user.UserID, eventID, teamID,
		paymentType, originalAmount, discountAmount,
		couponCode, couponDetails,
		models.ProcessedIntentions{
			EventRegistration: evtIntention,
			Accommodation:     accommodationMap,
			Food:              foodMap,
		},
	)

	payment, checkout, err := a.Store.BeginCheckout(ctx, checkoutID, payment)
	switch {
	case errors.Is(err, store.ErrCheckoutBusy):
		apierr.Respond(c, apierr.Conflict("checkout_in_progress", "a payment for this cart is already being created; retry in a moment"))
		return
	case errors.Is(err, store.ErrRosterChanged):
		apierr.Respond(c, apierr.Conflict("team_changed", "the team's members changed while you were paying; review the team and try again"))
		return
	case errors.Is(err, store.ErrTeamLocked):
		apierr.Respond(c, apierr.Conflict("already_paid", "payment has already been completed"))
		return
	case err != nil:
		apierr.Respond(c, apierr.Internal("could not create payment record"))
		return
	case checkout.PaymentURL != "": // a retried initiate: same cart, same link
		c.JSON(http.StatusOK, gin.H{"paymentUrl": checkout.PaymentURL, "merchantOrderId": payment.MerchantOrderID})
		return
	}

	productInfo := "Payment"
	if event != nil {
		productInfo = event.Title
	}

	link, err := a.getEasebuzzLink(ctx, payment.MerchantOrderID, payment.FinalAmount, productInfo, user)
	if err != nil {
		log.Printf("[payment] gateway initiation failed for %s: %v", payment.MerchantOrderID, err)
		if err := a.Store.MarkPaymentFailed(ctx, payment.MerchantOrderID, "", ""); err != nil {
			log.Printf("[payment] could not release checkout %s: %v", checkoutID, err)
		}
		apierr.Respond(c, apierr.Internal("could not initiate payment with gateway"))
		return
	}
	if err := a.Store.SetCheckoutURL(ctx, checkoutID, payment.MerchantOrderID, link); err != nil {
		log.Printf("[payment] could not store checkout link for %s: %v", payment.MerchantOrderID, err)
	}

	c.JSON(http.StatusOK, gin.H{"paymentUrl": link, "merchantOrderId": payment.MerchantOrderID})
}

// getEasebuzzLink calls the Easebuzz initiate API and returns the checkout URL.
func (a *API) getEasebuzzLink(
	_ context.Context,
	merchantOrderID string,
	amount int,
	productInfo string,
	user *models.User,
) (string, error) {
	if a.Cfg.PaymentsDummy || a.Cfg.EasebuzzKey == "" || a.Cfg.EasebuzzSalt == "" {
		return fmt.Sprintf("%s/api/v1/payments/dummy?txnid=%s", a.Cfg.AppBaseURL, url.QueryEscape(merchantOrderID)), nil
	}

	amountStr := fmt.Sprintf("%.2f", float64(amount))
	productinfo := productInfo
	firstname := user.DisplayName
	if firstname == "" {
		firstname = "Participant"
	}
	email := user.Email
	phone := user.PhoneNumber
	if phone == "" {
		phone = "9999999999"
	}

	hash := easebuzzHash(a.Cfg.EasebuzzKey, merchantOrderID, amountStr, productinfo, firstname, email, a.Cfg.EasebuzzSalt)

	surl := a.Cfg.AppBaseURL + "/api/v1/payments/callback?status=success"
	furl := a.Cfg.AppBaseURL + "/api/v1/payments/callback?status=failure"

	form := url.Values{}
	form.Set("key", a.Cfg.EasebuzzKey)
	form.Set("txnid", merchantOrderID)
	form.Set("amount", amountStr)
	form.Set("productinfo", productinfo)
	form.Set("firstname", firstname)
	form.Set("email", email)
	form.Set("phone", phone)
	form.Set("surl", surl)
	form.Set("furl", furl)
	form.Set("hash", hash)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.PostForm(a.easebuzzInitiateURL(), form)
	if err != nil {
		return "", fmt.Errorf("easebuzz request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	bodyStr := strings.TrimSpace(string(body))

	if resp.StatusCode != http.StatusOK || bodyStr == "" {
		return "", fmt.Errorf("easebuzz returned %d: %s", resp.StatusCode, bodyStr)
	}

	// Easebuzz returns just the access key / payment URL in the body.
	// The checkout page is at: {base}/pay/{accessKey}
	checkoutURL := a.easebuzzBaseURL() + "/pay/" + bodyStr
	return checkoutURL, nil
}

// DummyPayment is a mock checkout that settles a payment without a gateway. The
// route only exists when PAYMENTS_DUMMY is on.
func (a *API) DummyPayment(c *gin.Context) {
	txnid := c.Query("txnid")
	if txnid == "" {
		apierr.Respond(c, apierr.BadRequest("missing_txnid", "txnid is required"))
		return
	}
	a.finishPayment(c, txnid, true, store.SettleInfo{TxnID: "dummy"})
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/payments/callback  — Easebuzz redirects here after payment
// Also serves as the webhook endpoint.
// ─────────────────────────────────────────────────────────────────────────────

// PaymentCallback handles both the browser redirect (surl/furl) and the
// server-to-server webhook from Easebuzz. Both carry the same form fields, and
// both can arrive for the same payment, in any order, more than once: the
// outcome is applied by Store.SettlePayment / MarkPaymentFailed, which are
// idempotent.
func (a *API) PaymentCallback(c *gin.Context) {
	if err := c.Request.ParseForm(); err != nil {
		c.Status(http.StatusBadRequest)
		return
	}
	f := c.Request.FormValue

	txnid, status, amount := f("txnid"), f("status"), f("amount") // txnid is our merchantOrderId
	if txnid == "" || status == "" {
		c.Status(http.StatusBadRequest)
		return
	}

	// The hash is what proves this came from Easebuzz, so without a salt to
	// check it against nothing can be trusted.
	if a.Cfg.EasebuzzSalt == "" {
		log.Printf("[payment] callback for %s rejected: EASEBUZZ_SALT not configured", txnid)
		c.Status(http.StatusServiceUnavailable)
		return
	}
	if !verifyEasebuzzHash(f("hash"), a.Cfg.EasebuzzSalt, status, txnid, amount, f("productinfo"), f("firstname"), f("email"), a.Cfg.EasebuzzKey) {
		log.Printf("[payment] hash mismatch or missing for txnid=%s", txnid)
		c.Status(http.StatusBadRequest)
		return
	}

	payment, err := a.Store.GetPayment(c.Request.Context(), txnid)
	if errors.Is(err, store.ErrNotFound) {
		a.redirectToApp(c, txnid, "error")
		return
	} else if err != nil {
		log.Printf("[payment] could not load payment %s: %v", txnid, err)
		c.Status(http.StatusInternalServerError)
		return
	}

	// What the gateway says it collected must be what we asked for.
	if !amountMatches(amount, payment.FinalAmount) {
		log.Printf("[payment] amount mismatch for %s: gateway %q, expected %d", txnid, amount, payment.FinalAmount)
		c.Status(http.StatusBadRequest)
		return
	}

	switch strings.ToLower(status) {
	case "success":
		fees := 0
		if net, err := strconv.ParseFloat(f("net_amount_debit"), 64); err == nil {
			fees = max(int(math.Round(net-float64(payment.FinalAmount))), 0)
		}
		a.finishPayment(c, txnid, true, store.SettleInfo{
			TxnID:          f("easepayid"),
			NetAmountDebit: f("net_amount_debit"),
			Fees:           fees,
		})
	case "pending":
		a.redirectToApp(c, txnid, models.PaymentStatusPending)
	case "failure", "failed", "usercancelled", "dropped", "bounced":
		a.finishPayment(c, txnid, false, store.SettleInfo{TxnID: f("easepayid")})
	default:
		// An in-flight status we don't know (e.g. "initiated") must not fail
		// the payment: a failure unlocks the team and frees the checkout.
		log.Printf("[payment] %s: unrecognised gateway status %q, leaving pending", txnid, status)
		a.redirectToApp(c, txnid, models.PaymentStatusPending)
	}
}

// amountMatches compares the amount Easebuzz reports with the amount charged.
func amountMatches(got string, want int) bool {
	v, err := strconv.ParseFloat(got, 64)
	return err == nil && math.Abs(v-float64(want)) <= 0.009
}

// finishPayment applies a verified outcome and answers the caller. A storage
// failure returns 500 so the gateway retries the webhook; that is safe because
// both outcomes are idempotent.
func (a *API) finishPayment(c *gin.Context, id string, success bool, info store.SettleInfo) {
	ctx := c.Request.Context()

	if success {
		already, err := a.Store.SettlePayment(ctx, id, info)
		if errors.Is(err, store.ErrNotFound) {
			apierr.Respond(c, apierr.NotFound("payment_not_found", "payment not found"))
			return
		}
		if err != nil {
			log.Printf("[payment] could not settle %s: %v", id, err)
			c.Status(http.StatusInternalServerError)
			return
		}
		if !already {
			a.Cache.Invalidate()
		}
		a.redirectToApp(c, id, models.PaymentStatusSuccess)
		return
	}

	if err := a.Store.MarkPaymentFailed(ctx, id, info.TxnID, info.AdminID); err != nil {
		log.Printf("[payment] could not mark %s failed: %v", id, err)
		c.Status(http.StatusInternalServerError)
		return
	}
	// MarkPaymentFailed leaves a paid payment alone, so report what is stored.
	status := models.PaymentStatusFailure
	if p, err := a.Store.GetPayment(ctx, id); err == nil && p.Status == models.PaymentStatusSuccess {
		status = models.PaymentStatusSuccess
	}
	a.redirectToApp(c, id, status)
}

// redirectToApp sends the user back to the app via a deep-link or a simple
// HTML page that closes the WebView.
func (a *API) redirectToApp(c *gin.Context, merchantOrderID, status string) {
	// Return JSON for webhook (server-to-server) calls; HTML for browser redirects.
	accept := c.GetHeader("Accept")
	if strings.Contains(accept, "application/json") {
		c.JSON(http.StatusOK, gin.H{"status": status, "merchantOrderId": merchantOrderID})
		return
	}

	sep := "?"
	if strings.Contains(a.Cfg.FrontendDeepLinkBase, "?") {
		sep = "&"
	}
	deepLink := html.EscapeString(a.Cfg.FrontendDeepLinkBase + sep +
		url.Values{"status": {status}, "merchantOrderId": {merchantOrderID}}.Encode())
	title := html.EscapeString(status)

	// Every interpolated value is escaped: merchantOrderID can come from a
	// request, and this page is served on the API's own origin.
	page := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Payment %s</title>
<meta http-equiv="refresh" content="0;url=%s">
</head>
<body>
<p>Payment %s. Redirecting back to the app…</p>
<a href="%s">Tap here if not redirected</a>
</body>
</html>`, title, deepLink, title, deepLink)

	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(page))
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/payments/:merchantOrderId  — check status (for polling)
// ─────────────────────────────────────────────────────────────────────────────

func (a *API) GetPayment(c *gin.Context) {
	ctx := c.Request.Context()
	user := middleware.CurrentUser(c)

	payment, err := a.Store.GetPayment(ctx, c.Param("merchantOrderId"))
	if err != nil {
		if err == store.ErrNotFound {
			apierr.Respond(c, apierr.NotFound("payment_not_found", "no such payment"))
		} else {
			apierr.Respond(c, apierr.Internal("could not fetch payment"))
		}
		return
	}

	if payment.UserID != user.UserID && !user.IsAdmin() {
		apierr.Respond(c, apierr.Forbidden("not_yours", "this payment belongs to someone else"))
		return
	}

	c.JSON(http.StatusOK, gin.H{"payment": payment})
}
