package handlers

import (
	"slices"
	"testing"

	"backend/internal/models"
)

func TestMissingRefs(t *testing.T) {
	// Saved update: the replaced ref goes, the kept one and blanks do not.
	if got := missingRefs([]string{"old", "keep", ""}, []string{"keep", "new"}); !slices.Equal(got, []string{"old"}) {
		t.Errorf("replaced = %v", got)
	}
	// Failed update: only the fresh upload goes.
	if got := missingRefs([]string{"keep", "new"}, []string{"old", "keep", ""}); !slices.Equal(got, []string{"new"}) {
		t.Errorf("orphaned = %v", got)
	}
}

func TestApplyStoryBodyKeepsRefs(t *testing.T) {
	st := &models.Story{Items: []models.StoryItem{{URL: "a", Ref: "ra"}, {URL: "b", Ref: "rb"}}}
	imgs := []string{"b", "c"}
	applyStoryBody(st, &storyBody{Images: &imgs})
	if got := storyRefs(st); !slices.Equal(got, []string{"rb", ""}) {
		t.Errorf("refs = %v", got)
	}
}
