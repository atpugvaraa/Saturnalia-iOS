package handlers

import (
	"crypto/sha512"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"backend/internal/config"
	"backend/internal/isotime"
	"backend/internal/models"
)

func sha(plain string) string { return fmt.Sprintf("%x", sha512.Sum512([]byte(plain))) }

// The pipe counts are the whole point: Easebuzz hashes udf1..udf10 even when
// they are empty, which leaves eleven separators on each side.
func TestEasebuzzHashSequences(t *testing.T) {
	fwd := easebuzzHash("KEY", "TXN", "100.00", "Event", "Ann", "a@b.c", "SALT")
	want := sha("KEY|TXN|100.00|Event|Ann|a@b.c|||||||||||SALT")
	if fwd != want {
		t.Errorf("forward hash does not follow key|txnid|amount|productinfo|firstname|email|udf1..udf10|salt")
	}

	rev := sha("SALT|success|||||||||||a@b.c|Ann|Event|100.00|TXN|KEY")
	if !verifyEasebuzzHash(rev, "SALT", "success", "TXN", "100.00", "Event", "Ann", "a@b.c", "KEY") {
		t.Error("a correct reverse hash should verify")
	}
	if !verifyEasebuzzHash(strings.ToUpper(rev), "SALT", "success", "TXN", "100.00", "Event", "Ann", "a@b.c", "KEY") {
		t.Error("hash comparison should ignore case")
	}
	if verifyEasebuzzHash(rev, "SALT", "failure", "TXN", "100.00", "Event", "Ann", "a@b.c", "KEY") {
		t.Error("a hash must not verify for a different status")
	}
	if verifyEasebuzzHash("", "SALT", "success", "TXN", "100.00", "Event", "Ann", "a@b.c", "KEY") {
		t.Error("an empty hash must never verify")
	}
}

func callback(t *testing.T, a *API, form url.Values) int {
	t.Helper()
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/payments/callback", strings.NewReader(form.Encode()))
	c.Request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	a.PaymentCallback(c)
	return c.Writer.Status()
}

// These return before the store is touched, so the API needs no database.
func TestCallbackRejectsUnverifiedRequests(t *testing.T) {
	forged := url.Values{"txnid": {"SAT25-X"}, "status": {"success"}, "amount": {"100.00"}}

	noSalt := &API{Cfg: &config.Config{}}
	if got := callback(t, noSalt, forged); got != http.StatusServiceUnavailable {
		t.Errorf("no salt configured: want 503, got %d", got)
	}

	a := &API{Cfg: &config.Config{EasebuzzSalt: "SALT", EasebuzzKey: "KEY"}}
	if got := callback(t, a, forged); got != http.StatusBadRequest {
		t.Errorf("missing hash: want 400, got %d", got)
	}
	forged.Set("hash", "deadbeef")
	if got := callback(t, a, forged); got != http.StatusBadRequest {
		t.Errorf("wrong hash: want 400, got %d", got)
	}
}

func TestRedirectPageEscapesOrderID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	a := &API{Cfg: &config.Config{FrontendDeepLinkBase: "saturnalia://payment"}}
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/", nil)

	a.redirectToApp(c, `"><script>alert(1)</script>`, "error")

	body := w.Body.String()
	if strings.Contains(body, "<script") || strings.Contains(body, "alert(1)") {
		t.Errorf("order id was not escaped:\n%s", body)
	}
}

func TestCheckCouponRules(t *testing.T) {
	a := &API{} // none of these rules reach the store (no usage limits set)
	host := &models.User{IsHostCollegeStudent: true}
	other := &models.User{}
	day := 24 * time.Hour
	ok := func() *models.Coupon {
		return &models.Coupon{Code: "C", IsActive: true, IsHostCollegeAllowed: true, IsOtherCollegeAllowed: true}
	}

	cases := []struct {
		name   string
		mutate func(*models.Coupon)
		user   *models.User
		cart   int
		code   string // "" means valid
	}{
		{"valid", func(*models.Coupon) {}, host, 100, ""},
		{"inactive", func(c *models.Coupon) { c.IsActive = false }, host, 100, "inactive_coupon"},
		{"expired", func(c *models.Coupon) { c.ValidUntil = isotime.Format(time.Now().Add(-day)) }, host, 100, "coupon_expired"},
		{"not started", func(c *models.Coupon) { c.ValidFrom = isotime.Format(time.Now().Add(day)) }, host, 100, "coupon_not_started"},
		{"below min cart", func(c *models.Coupon) { c.MinCartValue = 500 }, host, 100, "min_cart_value"},
		{"host not allowed", func(c *models.Coupon) { c.IsHostCollegeAllowed = false }, host, 100, "college_not_allowed"},
		{"other not allowed", func(c *models.Coupon) { c.IsOtherCollegeAllowed = false }, other, 100, "college_not_allowed"},
	}
	for _, tc := range cases {
		coupon := ok()
		tc.mutate(coupon)
		err := a.checkCoupon(t.Context(), coupon, tc.user, tc.cart)
		switch {
		case tc.code == "" && err != nil:
			t.Errorf("%s: want valid, got %v", tc.name, err)
		case tc.code != "" && (err == nil || err.Code != tc.code):
			t.Errorf("%s: want %s, got %v", tc.name, tc.code, err)
		}
	}
}

func TestAmountMatches(t *testing.T) {
	for _, tc := range []struct {
		got  string
		want int
		ok   bool
	}{
		{"400.00", 400, true}, {"400", 400, true}, {"1.00", 400, false}, {"401.00", 400, false}, {"", 400, false}, {"abc", 400, false},
	} {
		if got := amountMatches(tc.got, tc.want); got != tc.ok {
			t.Errorf("amountMatches(%q, %d) = %v, want %v", tc.got, tc.want, got, tc.ok)
		}
	}
}

func TestCouponDatesFailClosed(t *testing.T) {
	a := &API{}
	user := &models.User{IsHostCollegeStudent: true}
	mk := func(from, until string) *models.Coupon {
		return &models.Coupon{Code: "C", IsActive: true, IsHostCollegeAllowed: true, IsOtherCollegeAllowed: true, ValidFrom: from, ValidUntil: until}
	}
	yesterday := time.Now().UTC().AddDate(0, 0, -1).Format("2006-01-02")
	today := time.Now().UTC().Format("2006-01-02")

	if err := a.checkCoupon(t.Context(), mk("", yesterday), user, 100); err == nil || err.Code != "coupon_expired" {
		t.Errorf("a date-only validUntil in the past must expire the coupon, got %v", err)
	}
	if err := a.checkCoupon(t.Context(), mk("", today), user, 100); err != nil {
		t.Errorf("a date-only validUntil of today runs to the end of the day, got %v", err)
	}
	if err := a.checkCoupon(t.Context(), mk("", "next friday"), user, 100); err == nil || err.Code != "coupon_invalid" {
		t.Errorf("an unparseable date must reject the coupon, got %v", err)
	}
}

func TestStayCharge(t *testing.T) {
	days, fee, bad := stayCharge(map[string]bool{"day1": true, "day2": true, "day3": false}, map[string]bool{"day2": true}, 300)
	if bad != "" || fee != 300 || len(days) != 1 || days["day1"] != true {
		t.Errorf("only unowned, selected days are charged: days=%v fee=%d bad=%q", days, fee, bad)
	}
	if _, _, bad := stayCharge(map[string]bool{"day99": true}, nil, 300); bad != "day99" {
		t.Errorf("an unknown day must be rejected, got %q", bad)
	}
}

func TestEasebuzzInitiateParsingAndCleaning(t *testing.T) {
	key := strings.Repeat("ab", 32)
	if got, err := parseEasebuzzInitiate([]byte(`{"status":1,"data":"` + key + `"}`)); err != nil || got != key {
		t.Errorf("success reply: got %q, %v", got, err)
	}
	for _, bad := range []string{`{"status":0,"error_desc":"x","data":"Parameter validation failed"}`, key, `{"status":1,"data":"../x"}`} {
		if _, err := parseEasebuzzInitiate([]byte(bad)); err == nil {
			t.Errorf("accepted %s", bad)
		}
	}
	if got := ebClean("Robo Wars: 2.0 & Hack@Sat!", ebProductInfoBad, 45, "Payment"); got != "Robo Wars 2 0 Hack Sat" {
		t.Errorf("productinfo: %q", got)
	}
	if got := ebClean("यश", ebFirstnameBad, 150, "Participant"); got != "Participant" {
		t.Errorf("firstname fallback: %q", got)
	}
}

func TestPickRetrieveEntry(t *testing.T) {
	two := `{"status":true,"msg":[{"txnid":"T1","status":"userCancelled"},{"txnid":"T1","status":"success","amount":"100.0"}]}`
	if e := pickRetrieveEntry([]byte(two)); e == nil || e["status"] != "success" {
		t.Errorf("want the successful attempt, got %v", e)
	}
	one := `{"status":true,"msg":[{"txnid":"T1","status":"failure"}]}`
	if e := pickRetrieveEntry([]byte(one)); e == nil || e["status"] != "failure" {
		t.Errorf("want the only attempt, got %v", e)
	}
	for _, none := range []string{`{"status":false,"msg":"Transaction not found"}`, `{"status":true,"msg":[]}`, `oops`} {
		if e := pickRetrieveEntry([]byte(none)); e != nil {
			t.Errorf("%s: want nil, got %v", none, e)
		}
	}
}
