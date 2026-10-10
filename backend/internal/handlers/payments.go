package handlers

import (
	"context"
	"crypto/sha512"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"backend/internal/apierr"
	"backend/internal/isotime"
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

// generateHash builds the SHA-512 hash Easebuzz expects.
// Forward hash: key|txnid|amount|productinfo|firstname|email|udf1-10|||||||||salt
func easebuzzHash(key, txnid, amount, productinfo, firstname, email, salt string) string {
	// UDF fields 1-10 are all empty for us
	udfs := strings.Repeat("|", 10) // 10 pipes = udf1 through udf10 all empty
	plain := key + "|" + txnid + "|" + amount + "|" + productinfo + "|" + firstname + "|" + email + udfs + salt
	h := sha512.Sum512([]byte(plain))
	return fmt.Sprintf("%x", h)
}

// verifyWebhookHash checks the reverse hash Easebuzz sends on webhook/redirect.
// Reverse hash: salt|status||udf10-1|email|firstname|productinfo|amount|txnid|key
func verifyEasebuzzHash(received, salt, status, txnid, amount, productinfo, firstname, email, key string) bool {
	udfs := strings.Repeat("|", 10)
	plain := salt + "|" + status + udfs + email + "|" + firstname + "|" + productinfo + "|" + amount + "|" + txnid + "|" + key
	h := sha512.Sum512([]byte(plain))
	computed := fmt.Sprintf("%x", h)
	return computed == strings.ToLower(received)
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/payments/initiate  — called by the app to start a payment
// ─────────────────────────────────────────────────────────────────────────────

type initiatePaymentBody struct {
	EventID string `json:"eventId"`
	TeamID  string `json:"teamId"` // empty for individual events
}

// InitiatePayment creates a Payment document in Firestore and returns the
// Easebuzz checkout URL that the mobile app should open in a WebView.
func (a *API) InitiatePayment(c *gin.Context) {
	ctx := c.Request.Context()
	user := middleware.CurrentUser(c)

	var body initiatePaymentBody
	if !bind(c, &body) {
		return
	}
	if body.EventID == "" {
		apierr.Respond(c, apierr.BadRequest("missing_event_id", "eventId is required"))
		return
	}

	event, ok := a.loadVisibleEvent(c, body.EventID)
	if !ok {
		return
	}

	if !event.PaymentRequired {
		apierr.Respond(c, apierr.BadRequest("no_payment_required", "this event does not require payment"))
		return
	}

	// For team events the caller must be the team leader.
	var teamID, teamName string
	eventPaymentType := models.EventPaymentTypeIndividual

	if event.EventType == models.EventTypeTeam {
		eventPaymentType = models.EventPaymentTypeTeam
		if body.TeamID == "" {
			apierr.Respond(c, apierr.BadRequest("missing_team_id", "teamId is required for team events"))
			return
		}
		team, err := a.Store.GetTeam(ctx, body.TeamID)
		if err != nil {
			apierr.Respond(c, apierr.NotFound("team_not_found", "team not found"))
			return
		}
		if !team.IsLeader(user.UserID) {
			apierr.Respond(c, apierr.Forbidden("leader_only", "only the team leader can initiate payment"))
			return
		}
		teamID = team.TeamID
		teamName = team.TeamName
	}

	// Verify that a registration exists and is in payment_pending state
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

	// Compute the fee.
	fee := event.FeeFor(user.IsHostCollegeStudent)

	if event.EventType == models.EventTypeTeam && event.PaymentType == "per_individual" {
		// Calculate accumulated fee for all current team members
		teamRegs, err := a.Store.ListRegistrationsByTeam(ctx, teamID)
		if err == nil && len(teamRegs) > 0 {
			totalFee := 0
			for _, tr := range teamRegs {
				if amt, ok := tr.PaymentDetails["amount"].(float64); ok {
					totalFee += int(amt)
				} else if amt, ok := tr.PaymentDetails["amount"].(int); ok {
					totalFee += amt
				} else if amt, ok := tr.PaymentDetails["amount"].(int64); ok {
					totalFee += int(amt)
				}
			}
			fee = totalFee
		}
	}

	if fee <= 0 {
		apierr.Respond(c, apierr.BadRequest("no_fee", "fee is zero for this event"))
		return
	}

	// Check if there's already a pending payment — reuse it if so.
	existing, _ := a.Store.GetPaymentsByEventAndUser(ctx, event.EventID, user.UserID)
	for _, p := range existing {
		if p.Status == models.PaymentStatusPending {
			link, linkErr := a.getEasebuzzLink(ctx, p.MerchantOrderID, fee, event, user)
			if linkErr == nil {
				c.JSON(http.StatusOK, gin.H{"paymentUrl": link, "merchantOrderId": p.MerchantOrderID})
				return
			}
			// If re-fetching the link fails, just create a new one below.
			break
		}
	}

	// Generate a new merchantOrderId and create the payment document.
	merchantOrderID := models.NewPaymentID(random.Code(3))

	intention := models.EventRegistrationIntention{
		EventID:   event.EventID,
		EventType: eventPaymentType,
		TeamID:    teamID,
		TeamName:  teamName,
		Amount:    fee,
	}

	payment := models.NewPayment(merchantOrderID, user.UserID, event.EventID, teamID, fee, intention)
	if err := a.Store.CreatePayment(ctx, payment); err != nil {
		apierr.Respond(c, apierr.Internal("could not create payment record"))
		return
	}

	link, err := a.getEasebuzzLink(ctx, merchantOrderID, fee, event, user)
	if err != nil {
		apierr.Respond(c, apierr.Internal("could not initiate payment with gateway"))
		return
	}

	c.JSON(http.StatusOK, gin.H{"paymentUrl": link, "merchantOrderId": merchantOrderID})
}

// getEasebuzzLink calls the Easebuzz initiate API and returns the checkout URL.
func (a *API) getEasebuzzLink(
	_ context.Context,
	merchantOrderID string,
	amount int,
	event *models.Event,
	user *models.User,
) (string, error) {
	if a.Cfg.EasebuzzKey == "" || a.Cfg.EasebuzzSalt == "" {
		if a.Cfg.EasebuzzEnv == "test" {
			// Dummy mode: return our own mock endpoint that instantly confirms the payment
			dummyURL := fmt.Sprintf("%s/api/v1/payments/dummy?txnid=%s", a.Cfg.AppBaseURL, merchantOrderID)
			return dummyURL, nil
		}
		return "", fmt.Errorf("easebuzz credentials not configured")
	}

	amountStr := fmt.Sprintf("%.2f", float64(amount))
	productinfo := event.Title
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

// DummyPayment is a mock endpoint that simulates a successful payment redirect
// when testing without real Easebuzz credentials.
func (a *API) DummyPayment(c *gin.Context) {
	ctx := c.Request.Context()
	txnid := c.Query("txnid")
	if txnid == "" {
		apierr.Respond(c, apierr.BadRequest("missing_txnid", "txnid is required"))
		return
	}

	payment, err := a.Store.GetPayment(ctx, txnid)
	if err != nil {
		apierr.Respond(c, apierr.NotFound("payment_not_found", "payment not found"))
		return
	}

	now := isotime.Now()
	updates := map[string]any{
		"status":      models.PaymentStatusSuccess,
		"completedAt": now,
	}

	if err := a.Store.UpdatePaymentFull(ctx, txnid, updates); err != nil {
		log.Printf("[dummy_payment] could not update payment %s: %v", txnid, err)
	}

	a.confirmRegistrationPayment(ctx, payment, now)
	a.redirectToApp(c, txnid, models.PaymentStatusSuccess)
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/payments/callback  — Easebuzz redirects here after payment
// Also serves as the webhook endpoint.
// ─────────────────────────────────────────────────────────────────────────────

// PaymentCallback handles both the browser redirect (surl/furl) and the
// server-to-server webhook from Easebuzz. Both carry the same form fields.
func (a *API) PaymentCallback(c *gin.Context) {
	ctx := c.Request.Context()

	// Easebuzz posts a form; read all values.
	if err := c.Request.ParseForm(); err != nil {
		c.Status(http.StatusBadRequest)
		return
	}

	txnid := c.Request.FormValue("txnid") // this is our merchantOrderId
	status := c.Request.FormValue("status")
	amount := c.Request.FormValue("amount")
	productinfo := c.Request.FormValue("productinfo")
	firstname := c.Request.FormValue("firstname")
	email := c.Request.FormValue("email")
	easeTxnID := c.Request.FormValue("easepayid")
	hash := c.Request.FormValue("hash")

	if txnid == "" || status == "" {
		c.Status(http.StatusBadRequest)
		return
	}

	// Verify hash if salt is configured.
	if a.Cfg.EasebuzzSalt != "" && hash != "" {
		if !verifyEasebuzzHash(hash, a.Cfg.EasebuzzSalt, status, txnid, amount, productinfo, firstname, email, a.Cfg.EasebuzzKey) {
			log.Printf("[payment] hash mismatch for txnid=%s", txnid)
			c.Status(http.StatusBadRequest)
			return
		}
	}

	payment, err := a.Store.GetPayment(ctx, txnid)
	if err != nil {
		log.Printf("[payment] payment not found txnid=%s: %v", txnid, err)
		// Still return 200 to Easebuzz so it doesn't retry
		a.redirectToApp(c, txnid, "error")
		return
	}

	// Idempotency: if already processed, just redirect.
	if payment.Status == models.PaymentStatusSuccess {
		a.redirectToApp(c, txnid, "success")
		return
	}

	paymentStatus := models.PaymentStatusFailure
	if status == "success" {
		paymentStatus = models.PaymentStatusSuccess
	}

	now := isotime.Now()

	// Parse transaction fees if provided (Easebuzz may send them).
	txnFees := 0
	if f := c.Request.FormValue("net_amount_debit"); f != "" {
		if v, err := strconv.ParseFloat(f, 64); err == nil {
			orig := float64(payment.OriginalAmount)
			txnFees = int(v*100) - int(orig*100)
			if txnFees < 0 {
				txnFees = 0
			}
		}
	}

	updates := map[string]any{
		"status":          paymentStatus,
		"easebuzzTxnId":   easeTxnID,
		"completedAt":     now,
		"transactionFees": txnFees,
		"finalAmount":     payment.OriginalAmount + txnFees,
	}
	if err := a.Store.UpdatePaymentFull(ctx, txnid, updates); err != nil {
		log.Printf("[payment] could not update payment %s: %v", txnid, err)
	}

	// Update registration(s) payment status.
	if paymentStatus == models.PaymentStatusSuccess {
		a.confirmRegistrationPayment(ctx, payment, now)
	}

	a.redirectToApp(c, txnid, paymentStatus)
}

// confirmRegistrationPayment marks the registration(s) as paid.
func (a *API) confirmRegistrationPayment(ctx context.Context, payment *models.Payment, paidAt string) {
	intention := payment.ProcessedIntentions.EventRegistration
	if intention == nil {
		return
	}

	if intention.EventType == models.EventPaymentTypeTeam && payment.TeamID != "" {
		// Update all team members' registrations.
		if err := a.Store.UpdateRegistrationsByTeam(ctx, payment.EventID, payment.TeamID, models.PaymentStatusSuccess, paidAt); err != nil {
			log.Printf("[payment] could not update team registrations for %s: %v", payment.TeamID, err)
		}
	} else {
		// Individual registration.
		regID := models.RegistrationID(payment.EventID, payment.UserID)
		if err := a.Store.UpdateRegistrationPaymentStatus(ctx, regID, models.PaymentStatusSuccess, paidAt); err != nil {
			log.Printf("[payment] could not update registration %s: %v", regID, err)
		}
	}

	a.Cache.Invalidate()
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

	// Deep-link redirect so the app's WebView can detect completion.
	deepLink := fmt.Sprintf("%s?status=%s&merchantOrderId=%s",
		a.Cfg.FrontendDeepLinkBase, status, merchantOrderID)

	// Render a small HTML page that both redirects via deep-link and provides
	// a fallback message.
	html := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Payment %s</title>
<meta http-equiv="refresh" content="0;url=%s">
</head>
<body>
<p>Payment %s. Redirecting back to the app…</p>
<a href="%s">Tap here if not redirected</a>
<script>window.location.href = %q;</script>
</body>
</html>`, status, deepLink, status, deepLink, deepLink)

	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
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
