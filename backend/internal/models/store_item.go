package models

import (
	"strings"
	"time"
)

// StoreItem represents a merchandise or shop product.
type StoreItem struct {
	ID          string    `json:"id"          firestore:"-"`
	Name        string    `json:"name"        firestore:"name"`
	Description string    `json:"description" firestore:"description"`
	Price       float64   `json:"price"       firestore:"price"`
	Image       string    `json:"image"       firestore:"image"`
	CreatedAt   time.Time `json:"createdAt"   firestore:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"   firestore:"updatedAt"`
}

func (s *StoreItem) Normalise() {
	s.Name = strings.TrimSpace(s.Name)
	s.Description = strings.TrimSpace(s.Description)
	s.Image = strings.TrimSpace(s.Image)
	if s.CreatedAt.IsZero() {
		s.CreatedAt = time.Now().UTC()
	}
	s.UpdatedAt = time.Now().UTC()
}
