package store

import (
	"context"
	"sort"
	"time"

	"google.golang.org/api/iterator"

	"backend/internal/models"
)

// AllStories loads all event stories, sorted by Order ascending, then CreatedAt descending.
func (s *Store) AllStories(ctx context.Context) ([]*models.Story, error) {
	iter := s.FS.Collection(ColStories).Documents(ctx)
	defer iter.Stop()

	out := []*models.Story{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, wrap(err)
		}
		st, err := decodeStory(doc)
		if err != nil {
			return nil, err
		}
		out = append(out, st)
	}

	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Order != out[j].Order {
			return out[i].Order < out[j].Order
		}
		return out[i].CreatedAt.After(out[j].CreatedAt)
	})
	return out, nil
}

func (s *Store) GetStory(ctx context.Context, id string) (*models.Story, error) {
	doc, err := s.FS.Collection(ColStories).Doc(id).Get(ctx)
	if err != nil {
		return nil, wrap(err)
	}
	return decodeStory(doc)
}

func (s *Store) CreateStory(ctx context.Context, st *models.Story) error {
	ref := s.FS.Collection(ColStories).NewDoc()
	st.ID = ref.ID
	now := time.Now().UTC()
	if st.CreatedAt.IsZero() {
		st.CreatedAt = now
	}
	st.UpdatedAt = now
	st.Normalise()

	if _, err := ref.Create(ctx, st); err != nil {
		return wrap(err)
	}
	return nil
}

func (s *Store) SaveStory(ctx context.Context, st *models.Story) error {
	st.UpdatedAt = time.Now().UTC()
	st.Normalise()
	_, err := s.FS.Collection(ColStories).Doc(st.ID).Set(ctx, st)
	return wrap(err)
}

func (s *Store) DeleteStory(ctx context.Context, id string) error {
	_, err := s.FS.Collection(ColStories).Doc(id).Delete(ctx)
	return wrap(err)
}
