package models

import "time"

// StoryItem represents an individual media item in an event story.
type StoryItem struct {
	ID         string    `json:"id"              firestore:"id"`
	URL        string    `json:"url"             firestore:"url"`
	Ref        string    `json:"ref,omitempty"   firestore:"ref,omitempty"`
	MediaType  string    `json:"mediaType"       firestore:"mediaType"` // "image" | "video"
	UploadedAt time.Time `json:"uploadedAt"      firestore:"uploadedAt"`
}

// Story represents an event story containing a collection of images.
type Story struct {
	ID        string      `json:"id"                 firestore:"-"`
	Name      string      `json:"name"               firestore:"name"`
	EventID   string      `json:"eventId,omitempty"  firestore:"eventId,omitempty"`
	Images    []string    `json:"images"             firestore:"images"`
	Items     []StoryItem `json:"items,omitempty"    firestore:"items,omitempty"`
	Order     int         `json:"order"              firestore:"order"`
	CreatedAt time.Time   `json:"createdAt"          firestore:"createdAt"`
	UpdatedAt time.Time   `json:"updatedAt"          firestore:"updatedAt"`
}

func (s *Story) Normalise() {
	if s.Images == nil {
		s.Images = []string{}
	}
	if s.Items == nil {
		s.Items = []StoryItem{}
	}
}
