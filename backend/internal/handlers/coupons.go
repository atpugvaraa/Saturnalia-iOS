package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"backend/internal/apierr"
	"backend/internal/middleware"
)

type validateCouponBody struct {
	CouponCode string `json:"couponCode"`
	EventID    string `json:"eventId"`
}

func (a *API) ValidateCoupon(c *gin.Context) {
	ctx := c.Request.Context()
	user := middleware.CurrentUser(c)

	var body validateCouponBody
	if !bind(c, &body) {
		return
	}

	coupon, err := a.Store.GetCoupon(ctx, body.CouponCode)
	if err != nil {
		apierr.Respond(c, apierr.NotFound("invalid_coupon", "Coupon not found"))
		return
	}

	if !coupon.IsActive {
		apierr.Respond(c, apierr.BadRequest("inactive_coupon", "This coupon is no longer active"))
		return
	}

	if !coupon.IsHostCollegeAllowed && user.IsHostCollegeStudent {
		apierr.Respond(c, apierr.Forbidden("college_not_allowed", "This coupon is not valid for host college students"))
		return
	}

	if !coupon.IsOtherCollegeAllowed && !user.IsHostCollegeStudent {
		apierr.Respond(c, apierr.Forbidden("college_not_allowed", "This coupon is only valid for host college students"))
		return
	}

	// Check usage limits
	if coupon.UsageLimit > 0 {
		globalUsage, _ := a.Store.GetCouponUsageCount(ctx, coupon.Code)
		if globalUsage >= coupon.UsageLimit {
			apierr.Respond(c, apierr.Conflict("coupon_exhausted", "This coupon has reached its maximum usage limit"))
			return
		}
	}

	if coupon.UsagePerUserLimit > 0 {
		userUsage, _ := a.Store.GetUserCouponUsageCount(ctx, coupon.Code, user.UserID)
		if userUsage >= coupon.UsagePerUserLimit {
			apierr.Respond(c, apierr.Conflict("coupon_used", "You have reached the maximum usage limit for this coupon"))
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"code":          coupon.Code,
		"description":   coupon.Description,
		"discountType":  coupon.DiscountType,
		"discountValue": coupon.DiscountValue,
		"minCartValue":  coupon.MinCartValue,
	})
}
