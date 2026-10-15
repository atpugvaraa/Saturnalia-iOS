package models

import "time"

// ReelEventInfo holds event summary data attached to a reel.
type ReelEventInfo struct {
	ID                 string `json:"id"                 firestore:"id"`
	Name               string `json:"name"               firestore:"name"`
	Description        string `json:"description"        firestore:"description"`
	IsRegistrationOpen bool   `json:"isRegistrationOpen" firestore:"isRegistrationOpen"`
}

// Reel represents a short-form video viewed by users.
type Reel struct {
	ID           string         `json:"id"                    firestore:"-"`
	Title        string         `json:"title"                 firestore:"title"`
	Description  string         `json:"description"           firestore:"description"`
	VideoURL     string         `json:"videoUrl"              firestore:"videoUrl"`
	VideoRef     string         `json:"videoRef,omitempty"    firestore:"videoRef,omitempty"`
	ThumbnailURL string         `json:"thumbnailUrl,omitempty" firestore:"thumbnailUrl,omitempty"`
	ThumbnailRef string         `json:"thumbnailRef,omitempty" firestore:"thumbnailRef,omitempty"`
	EventID      string         `json:"eventId,omitempty"     firestore:"eventId,omitempty"`
	Event        *ReelEventInfo `json:"event,omitempty"       firestore:"event,omitempty"`
	Duration     int            `json:"duration,omitempty"    firestore:"duration,omitempty"` // seconds
	Order        int            `json:"order"                 firestore:"order"`
	CreatedAt    time.Time      `json:"createdAt"             firestore:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"             firestore:"updatedAt"`
}
