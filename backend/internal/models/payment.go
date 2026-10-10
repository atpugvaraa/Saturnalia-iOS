package models

import (
	"fmt"
	"time"

	"backend/internal/isotime"
)

// Payment statuses
const (
	PaymentStatusPending = "pending"
	PaymentStatusSuccess = "success"
	PaymentStatusFailure = "failure"

	// PaymentType values
	PaymentTypeEvent = "event"

	// EventPaymentType (per-individual or per-team)
	EventPaymentTypeIndividual = "individual"
	EventPaymentTypeTeam       = "team"
)

// EventRegistrationIntention is the nested map inside processedIntentions.eventRegistration.
type EventRegistrationIntention struct {
	EventID   string `json:"eventId"   firestore:"eventId"`
	EventType string `json:"eventType" firestore:"eventType"` // "individual" | "team"
	TeamID    string `json:"teamId"    firestore:"teamId"`
	TeamName  string `json:"teamName"  firestore:"teamName"`
	Amount    int    `json:"amount"    firestore:"amount"`
}

// ProcessedIntentions holds what the payment covers.
type ProcessedIntentions struct {
	EventRegistration *EventRegistrationIntention `json:"eventRegistration" firestore:"eventRegistration"`
	Accommodation     interface{}                 `json:"accommodation"     firestore:"accommodation"`
}

// Payment is a document in the "payments" Firestore collection.
// MerchantOrderID is also the document ID.
type Payment struct {
	// ID is the document ID — same value as MerchantOrderID.
	ID string `json:"id" firestore:"-"`

	MerchantOrderID string `json:"merchantOrderId" firestore:"merchantOrderId"`
	UserID          string `json:"userId"          firestore:"userId"`
	EventID         string `json:"eventId"         firestore:"eventId"`
	TeamID          string `json:"teamId"          firestore:"teamId"`

	PaymentType string `json:"paymentType" firestore:"paymentType"` // "event"

	OriginalAmount  int `json:"originalAmount"  firestore:"originalAmount"`
	TransactionFees int `json:"transactionFees" firestore:"transactionFees"`
	FinalAmount     int `json:"finalAmount"     firestore:"finalAmount"`

	ProcessedIntentions ProcessedIntentions `json:"processedIntentions" firestore:"processedIntentions"`

	Status      string `json:"status"                firestore:"status"`
	CreatedAt   string `json:"createdAt"             firestore:"createdAt"`
	CompletedAt string `json:"completedAt,omitempty" firestore:"completedAt"`

	// Easebuzz-specific fields stored for audit / webhook verification.
	EasebuzzTxnID string `json:"easebuzzTxnId,omitempty" firestore:"easebuzzTxnId"`
}

// NewPaymentID generates the merchantOrderId / document ID:
// "SAT25-{date}-{time}-{rand}"
// rand should be a short alphanumeric string (e.g. "809").
func NewPaymentID(rand string) string {
	now := time.Now().UTC()
	return fmt.Sprintf("SAT25-%s-%s", now.Format("20060102-150405"), rand)
}

// NewPayment constructs a Payment ready to be stored.
func NewPayment(
	merchantOrderID, userID, eventID, teamID string,
	originalAmount int,
	intention EventRegistrationIntention,
) *Payment {
	// Easebuzz charges ~1.5% + GST. We store what actually gets charged.
	// The finalAmount and transactionFees will be updated from the webhook;
	// until then, set finalAmount == originalAmount and fees == 0.
	return &Payment{
		MerchantOrderID: merchantOrderID,
		UserID:          userID,
		EventID:         eventID,
		TeamID:          teamID,
		PaymentType:     PaymentTypeEvent,
		OriginalAmount:  originalAmount,
		TransactionFees: 0,
		FinalAmount:     originalAmount,
		ProcessedIntentions: ProcessedIntentions{
			EventRegistration: &intention,
			Accommodation:     nil,
		},
		Status:    PaymentStatusPending,
		CreatedAt: isotime.Now(),
	}
}
