package store

import (
	"context"

	"cloud.google.com/go/firestore"

	"backend/internal/isotime"
	"backend/internal/models"
)

const ColPayments = "payments"

func (s *Store) CreatePayment(ctx context.Context, p *models.Payment) error {
	_, err := s.FS.Collection(ColPayments).Doc(p.MerchantOrderID).Create(ctx, p)
	return wrap(err)
}

func (s *Store) GetPayment(ctx context.Context, merchantOrderID string) (*models.Payment, error) {
	doc, err := s.FS.Collection(ColPayments).Doc(merchantOrderID).Get(ctx)
	if err != nil {
		return nil, wrap(err)
	}
	var p models.Payment
	if err := doc.DataTo(&p); err != nil {
		return nil, err
	}
	p.ID = doc.Ref.ID
	return &p, nil
}

// GetPaymentByEventAndUser returns the most recent pending/success payment for
// a user on an event. Used to check if a user has already started payment.
func (s *Store) GetPaymentsByEventAndUser(ctx context.Context, eventID, userID string) ([]*models.Payment, error) {
	iter := s.FS.Collection(ColPayments).
		Where("eventId", "==", eventID).
		Where("userId", "==", userID).
		Documents(ctx)
	defer iter.Stop()

	var payments []*models.Payment
	for {
		doc, err := iter.Next()
		if err != nil {
			break
		}
		var p models.Payment
		if err := doc.DataTo(&p); err != nil {
			continue
		}
		p.ID = doc.Ref.ID
		payments = append(payments, &p)
	}
	return payments, nil
}

// GetPaymentsByTeam returns payments for a specific team.
func (s *Store) GetPaymentsByTeam(ctx context.Context, teamID string) ([]*models.Payment, error) {
	iter := s.FS.Collection(ColPayments).
		Where("teamId", "==", teamID).
		Documents(ctx)
	defer iter.Stop()

	var payments []*models.Payment
	for {
		doc, err := iter.Next()
		if err != nil {
			break
		}
		var p models.Payment
		if err := doc.DataTo(&p); err != nil {
			continue
		}
		p.ID = doc.Ref.ID
		payments = append(payments, &p)
	}
	return payments, nil
}

// UpdatePaymentStatus updates the status, easebuzzTxnId and completedAt on a
// payment document. Called when a webhook or redirect confirms the outcome.
func (s *Store) UpdatePaymentStatus(ctx context.Context, merchantOrderID, status, txnID string) error {
	updates := map[string]any{
		"status":        status,
		"easebuzzTxnId": txnID,
		"completedAt":   isotime.Now(),
	}
	_, err := s.FS.Collection(ColPayments).Doc(merchantOrderID).Set(ctx, updates, firestore.MergeAll)
	return wrap(err)
}

// UpdatePaymentFull stores the complete payment outcome (fees, finalAmount, etc.)
// from the Easebuzz webhook.
func (s *Store) UpdatePaymentFull(ctx context.Context, merchantOrderID string, updates map[string]any) error {
	_, err := s.FS.Collection(ColPayments).Doc(merchantOrderID).Set(ctx, updates, firestore.MergeAll)
	return wrap(err)
}

// ListAllPayments returns all payments in the system.
func (s *Store) ListAllPayments(ctx context.Context) ([]*models.Payment, error) {
	iter := s.FS.Collection(ColPayments).OrderBy("createdAt", firestore.Desc).Documents(ctx)
	defer iter.Stop()

	var payments []*models.Payment
	for {
		doc, err := iter.Next()
		if err != nil {
			break
		}
		var p models.Payment
		if err := doc.DataTo(&p); err != nil {
			continue
		}
		p.ID = doc.Ref.ID
		payments = append(payments, &p)
	}
	return payments, nil
}
