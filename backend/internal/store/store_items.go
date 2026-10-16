package store

import (
	"context"
	"sort"

	"google.golang.org/api/iterator"

	"backend/internal/models"
)

// AllStoreItems loads the whole store collection.
func (s *Store) AllStoreItems(ctx context.Context) ([]*models.StoreItem, error) {
	iter := s.FS.Collection(ColStore).Documents(ctx)
	defer iter.Stop()

	out := []*models.StoreItem{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, wrap(err)
		}
		item, err := decodeStoreItem(doc)
		if err != nil {
			return nil, err
		}
		out = append(out, item)
	}

	sort.SliceStable(out, func(i, j int) bool {
		if !out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].CreatedAt.After(out[j].CreatedAt)
		}
		return out[i].Name < out[j].Name
	})
	return out, nil
}

func (s *Store) GetStoreItem(ctx context.Context, id string) (*models.StoreItem, error) {
	doc, err := s.FS.Collection(ColStore).Doc(id).Get(ctx)
	if err != nil {
		return nil, wrap(err)
	}
	return decodeStoreItem(doc)
}

func (s *Store) CreateStoreItem(ctx context.Context, item *models.StoreItem) error {
	item.Normalise()
	ref := s.FS.Collection(ColStore).NewDoc()
	if _, err := ref.Create(ctx, item); err != nil {
		return wrap(err)
	}
	item.ID = ref.ID
	return nil
}

func (s *Store) SaveStoreItem(ctx context.Context, item *models.StoreItem) error {
	item.Normalise()
	if _, err := s.FS.Collection(ColStore).Doc(item.ID).Set(ctx, item); err != nil {
		return wrap(err)
	}
	return nil
}

func (s *Store) DeleteStoreItem(ctx context.Context, id string) error {
	if _, err := s.FS.Collection(ColStore).Doc(id).Delete(ctx); err != nil {
		return wrap(err)
	}
	return nil
}
