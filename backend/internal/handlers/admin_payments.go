package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"backend/internal/apierr"
	"backend/internal/models"
)

// AdminListPayments returns all payments.
func (a *API) AdminListPayments(c *gin.Context) {
	ctx := c.Request.Context()

	payments, err := a.Store.ListAllPayments(ctx)
	if err != nil {
		apierr.Respond(c, apierr.Internal("could not load payments"))
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": payments, "total": len(payments)})
}

// AdminUpdatePaymentStatus allows an admin to manually verify or override a payment.
func (a *API) AdminUpdatePaymentStatus(c *gin.Context) {
	ctx := c.Request.Context()
	id := c.Param("id") // MerchantOrderID

	var body struct {
		Status string `json:"status"` // e.g. "success", "failed", "pending"
	}
	if !bind(c, &body) {
		return
	}

	payment, err := a.Store.GetPayment(ctx, id)
	if err != nil {
		apierr.Respond(c, apierr.NotFound("payment_not_found", "payment not found"))
		return
	}

	if err := a.Store.UpdatePaymentStatus(ctx, id, body.Status, "admin-override"); err != nil {
		apierr.Respond(c, apierr.Internal("could not update payment status"))
		return
	}

	// Also update the registrations associated with this payment if it's marked as success.
	// (You can only mark success or failed, not pending).
	if body.Status == models.PaymentStatusSuccess {
		if payment.TeamID != "" {
			if err := a.Store.UpdateRegistrationsByTeam(ctx, payment.EventID, payment.TeamID, body.Status, ""); err != nil {
				apierr.Respond(c, apierr.Internal("could not update team registrations"))
				return
			}
		} else {
			regID := models.RegistrationID(payment.EventID, payment.UserID)
			if err := a.Store.UpdateRegistrationPaymentStatus(ctx, regID, body.Status, ""); err != nil {
				apierr.Respond(c, apierr.Internal("could not update registration"))
				return
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "payment updated successfully"})
}
