package handlers

import (
	"testing"
	"time"

	"backend/internal/models"
)

func TestApplyBannerBodyOverlaysOnlySuppliedFields(t *testing.T) {
	s := func(v string) *string { return &v }
	b := func(v bool) *bool { return &v }
	i := func(v int) *int { return &v }

	banner := &models.Banner{
		ID:          "b1",
		Title:       "Original Title",
		Description: "Original Desc",
		ImageURL:    "https://example.com/original.jpg",
		Link:        "https://example.com/link",
		LinkType:    "external",
		IsActive:    true,
		Order:       1,
		CreatedAt:   time.Now().UTC(),
	}

	n := applyBannerBody(banner, &bannerBody{
		Title:    s("Updated Title"),
		IsActive: b(false),
		Order:    i(5),
	})

	if n != 3 {
		t.Fatalf("expected 3 applied fields, got %d", n)
	}
	if banner.Title != "Updated Title" {
		t.Errorf("title = %q, want 'Updated Title'", banner.Title)
	}
	if banner.IsActive != false {
		t.Errorf("isActive = %v, want false", banner.IsActive)
	}
	if banner.Order != 5 {
		t.Errorf("order = %d, want 5", banner.Order)
	}
	if banner.Description != "Original Desc" {
		t.Errorf("unpatched description should survive, got %q", banner.Description)
	}
	if banner.ImageURL != "https://example.com/original.jpg" {
		t.Errorf("unpatched imageURL should survive, got %q", banner.ImageURL)
	}
}

func TestValidateBanner(t *testing.T) {
	cases := []struct {
		name    string
		banner  models.Banner
		wantErr bool
	}{
		{
			name: "valid banner",
			banner: models.Banner{
				Title:    "Welcome",
				ImageURL: "https://example.com/img.png",
				Link:     "/events/1",
			},
			wantErr: false,
		},
		{
			name: "missing title",
			banner: models.Banner{
				ImageURL: "https://example.com/img.png",
				Link:     "/events/1",
			},
			wantErr: true,
		},
		{
			name: "missing image url",
			banner: models.Banner{
				Title: "Welcome",
				Link:  "/events/1",
			},
			wantErr: true,
		},
		{
			name: "missing link",
			banner: models.Banner{
				Title:    "Welcome",
				ImageURL: "https://example.com/img.png",
			},
			wantErr: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateBanner(&tc.banner)
			if (err != nil) != tc.wantErr {
				t.Errorf("validateBanner() error = %v, wantErr %v", err, tc.wantErr)
			}
		})
	}
}
