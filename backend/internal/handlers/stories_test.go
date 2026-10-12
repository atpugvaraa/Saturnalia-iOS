package handlers

import (
	"testing"
	"time"

	"backend/internal/models"
)

func TestApplyStoryBodyOverlaysOnlySuppliedFields(t *testing.T) {
	s := func(v string) *string { return &v }
	i := func(v int) *int { return &v }

	story := &models.Story{
		ID:        "s1",
		Name:      "Day 1 Highlights",
		EventID:   "ev1",
		Images:    []string{"https://example.com/1.jpg"},
		Order:     1,
		CreatedAt: time.Now().UTC(),
	}

	n := applyStoryBody(story, &storyBody{
		Name:  s("Day 1 Best Moments"),
		Order: i(3),
	})

	if n != 2 {
		t.Fatalf("expected 2 applied fields, got %d", n)
	}
	if story.Name != "Day 1 Best Moments" {
		t.Errorf("name = %q, want 'Day 1 Best Moments'", story.Name)
	}
	if story.Order != 3 {
		t.Errorf("order = %d, want 3", story.Order)
	}
	if story.EventID != "ev1" {
		t.Errorf("unpatched eventID should survive, got %q", story.EventID)
	}
	if len(story.Images) != 1 || story.Images[0] != "https://example.com/1.jpg" {
		t.Errorf("unpatched images should survive, got %v", story.Images)
	}
}

func TestApplyStoryBodyUpdatesImagesAndItems(t *testing.T) {
	story := &models.Story{
		ID:   "s1",
		Name: "Day 1",
	}

	images := []string{"https://example.com/1.jpg", "https://example.com/2.jpg"}
	n := applyStoryBody(story, &storyBody{
		Images: &images,
	})

	if n != 1 {
		t.Fatalf("expected 1 applied field, got %d", n)
	}
	if len(story.Images) != 2 {
		t.Errorf("images length = %d, want 2", len(story.Images))
	}
	if len(story.Items) != 2 {
		t.Errorf("items length = %d, want 2", len(story.Items))
	}
	if story.Items[0].URL != images[0] || story.Items[1].URL != images[1] {
		t.Errorf("items URLs do not match provided images: %v", story.Items)
	}
}

func TestValidateStory(t *testing.T) {
	cases := []struct {
		name    string
		story   models.Story
		wantErr bool
	}{
		{
			name: "valid story",
			story: models.Story{
				Name:   "Concert Night",
				Images: []string{"https://example.com/1.jpg"},
			},
			wantErr: false,
		},
		{
			name: "missing name",
			story: models.Story{
				Images: []string{"https://example.com/1.jpg"},
			},
			wantErr: true,
		},
		{
			name: "empty images",
			story: models.Story{
				Name:   "Concert Night",
				Images: []string{},
			},
			wantErr: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateStory(&tc.story)
			if (err != nil) != tc.wantErr {
				t.Errorf("validateStory() error = %v, wantErr %v", err, tc.wantErr)
			}
		})
	}
}
