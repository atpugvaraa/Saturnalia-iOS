package handlers

import (
	"testing"
	"time"

	"backend/internal/models"
)

func TestApplyReelBodyOverlaysOnlySuppliedFields(t *testing.T) {
	s := func(v string) *string { return &v }
	i := func(v int) *int { return &v }

	reel := &models.Reel{
		ID:          "r1",
		Title:       "Original Reel",
		Description: "Original Reel Desc",
		VideoURL:    "https://example.com/video.mp4",
		EventID:     "ev1",
		Duration:    30,
		Order:       1,
		CreatedAt:   time.Now().UTC(),
	}

	n := applyReelBody(reel, &reelBody{
		Title:    s("Updated Reel Title"),
		Duration: i(45),
		Order:    i(2),
	})

	if n != 3 {
		t.Fatalf("expected 3 applied fields, got %d", n)
	}
	if reel.Title != "Updated Reel Title" {
		t.Errorf("title = %q, want 'Updated Reel Title'", reel.Title)
	}
	if reel.Duration != 45 {
		t.Errorf("duration = %d, want 45", reel.Duration)
	}
	if reel.Order != 2 {
		t.Errorf("order = %d, want 2", reel.Order)
	}
	if reel.VideoURL != "https://example.com/video.mp4" {
		t.Errorf("unpatched videoURL should survive, got %q", reel.VideoURL)
	}
	if reel.EventID != "ev1" {
		t.Errorf("unpatched eventID should survive, got %q", reel.EventID)
	}
}

func TestValidateReel(t *testing.T) {
	cases := []struct {
		name    string
		reel    models.Reel
		wantErr bool
	}{
		{
			name: "valid reel",
			reel: models.Reel{
				Title:    "Great Highlights",
				VideoURL: "https://example.com/video.mp4",
			},
			wantErr: false,
		},
		{
			name: "missing title",
			reel: models.Reel{
				VideoURL: "https://example.com/video.mp4",
			},
			wantErr: true,
		},
		{
			name: "missing video url",
			reel: models.Reel{
				Title: "Great Highlights",
			},
			wantErr: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateReel(&tc.reel)
			if (err != nil) != tc.wantErr {
				t.Errorf("validateReel() error = %v, wantErr %v", err, tc.wantErr)
			}
		})
	}
}
