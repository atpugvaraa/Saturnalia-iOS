package store

import (
	"context"

	"backend/internal/models"
)

const ColCoupons = "coupons"
const ColCouponUsage = "couponUsage"

// GetCoupon gets a coupon by its code.
func (s *Store) GetCoupon(ctx context.Context, code string) (*models.Coupon, error) {
	doc, err := s.FS.Collection(ColCoupons).Doc(code).Get(ctx)
	if err != nil {
		return nil, wrap(err)
	}
	var coupon models.Coupon
	if err := doc.DataTo(&coupon); err != nil {
		return nil, err
	}
	coupon.Code = doc.Ref.ID
	return &coupon, nil
}

// GetCouponUsageCount returns how many times a coupon has been used globally.
func (s *Store) GetCouponUsageCount(ctx context.Context, code string) (int, error) {
	docs, err := s.FS.Collection(ColCouponUsage).Where("couponCode", "==", code).Documents(ctx).GetAll()
	if err != nil {
		return 0, wrap(err)
	}
	return len(docs), nil
}

// GetUserCouponUsageCount returns how many times a specific user has used a coupon.
func (s *Store) GetUserCouponUsageCount(ctx context.Context, code, userID string) (int, error) {
	docs, err := s.FS.Collection(ColCouponUsage).
		Where("couponCode", "==", code).
		Where("userId", "==", userID).
		Documents(ctx).GetAll()
	if err != nil {
		return 0, wrap(err)
	}
	return len(docs), nil
}
