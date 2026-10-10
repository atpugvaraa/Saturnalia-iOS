package models

type Coupon struct {
	Code                  string  `json:"code"                  firestore:"-"`
	Description           string  `json:"description"           firestore:"description"`
	DiscountType          string  `json:"discountType"          firestore:"discountType"` // "percentage" or "flat"
	DiscountValue         float64 `json:"discountValue"         firestore:"discountValue"`
	IsActive              bool    `json:"isActive"              firestore:"isActive"`
	IsHostCollegeAllowed  bool    `json:"isHostCollegeAllowed"  firestore:"isHostCollegeAllowed"`
	IsOtherCollegeAllowed bool    `json:"isOtherCollegeAllowed" firestore:"isOtherCollegeAllowed"`
	MinCartValue          int     `json:"minCartValue"          firestore:"minCartValue"`
	UsageLimit            int     `json:"usageLimit"            firestore:"usageLimit"`
	UsagePerUserLimit     int     `json:"usagePerUserLimit"     firestore:"usagePerUserLimit"`
	ValidFrom             string  `json:"validFrom"             firestore:"validFrom"`
	ValidUntil            string  `json:"validUntil"            firestore:"validUntil"`
	CreatedAt             string  `json:"createdAt"             firestore:"createdAt"`
	UpdatedAt             string  `json:"updatedAt"             firestore:"updatedAt"`
}

type CouponUsage struct {
	ID             string `json:"id"             firestore:"-"`
	Amount         int    `json:"amount"         firestore:"amount"`
	CouponCode     string `json:"couponCode"     firestore:"couponCode"`
	DiscountAmount int    `json:"discountAmount" firestore:"discountAmount"`
	EventID        string `json:"eventId"        firestore:"eventId"`
	UsedAt         string `json:"usedAt"         firestore:"usedAt"`
	UserID         string `json:"userId"         firestore:"userId"`
}
