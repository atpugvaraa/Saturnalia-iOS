package models

import "time"

// Banner represents a promotional banner or hero carousel item.
type Banner struct {
	ID          string    `json:"id"                    firestore:"-"`
	Title       string    `json:"title"                 firestore:"title"`
	Description string    `json:"description"           firestore:"description"`
	ImageURL    string    `json:"imageUrl"              firestore:"imageUrl"`
	ImageRef    string    `json:"imageRef,omitempty"    firestore:"imageRef,omitempty"`
	Link        string    `json:"link"                  firestore:"link"`
	LinkType    string    `json:"linkType,omitempty"    firestore:"linkType,omitempty"` // "internal" | "external"
	IsActive    bool      `json:"isActive"              firestore:"isActive"`
	Order       int       `json:"order"                 firestore:"order"`
	CreatedAt   time.Time `json:"createdAt"             firestore:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"             firestore:"updatedAt"`
}
