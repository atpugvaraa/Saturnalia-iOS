package store

import (
	"context"
	"sort"
	"time"

	"google.golang.org/api/iterator"

	"backend/internal/models"
)

// AllBanners loads the entire banners collection, sorted by Order ascending, then CreatedAt descending.
func (s *Store) AllBanners(ctx context.Context) ([]*models.Banner, error) {
	iter := s.FS.Collection(ColBanners).Documents(ctx)
	defer iter.Stop()

	out := []*models.Banner{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, wrap(err)
		}
		b, err := decodeBanner(doc)
		if err != nil {
			return nil, err
		}
		out = append(out, b)
	}

	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Order != out[j].Order {
			return out[i].Order < out[j].Order
		}
		return out[i].CreatedAt.After(out[j].CreatedAt)
	})
	return out, nil
}

// ActiveBanners returns only banners marked active.
func (s *Store) ActiveBanners(ctx context.Context) ([]*models.Banner, error) {
	all, err := s.AllBanners(ctx)
	if err != nil {
		return nil, err
	}
	active := make([]*models.Banner, 0, len(all))
	for _, b := range all {
		if b.IsActive {
			active = append(active, b)
		}
	}
	return active, nil
}

func (s *Store) GetBanner(ctx context.Context, id string) (*models.Banner, error) {
	doc, err := s.FS.Collection(ColBanners).Doc(id).Get(ctx)
	if err != nil {
		return nil, wrap(err)
	}
	return decodeBanner(doc)
}

func (s *Store) CreateBanner(ctx context.Context, b *models.Banner) error {
	ref := s.FS.Collection(ColBanners).NewDoc()
	b.ID = ref.ID
	now := time.Now().UTC()
	if b.CreatedAt.IsZero() {
		b.CreatedAt = now
	}
	b.UpdatedAt = now

	if _, err := ref.Create(ctx, b); err != nil {
		return wrap(err)
	}
	return nil
}

func (s *Store) SaveBanner(ctx context.Context, b *models.Banner) error {
	b.UpdatedAt = time.Now().UTC()
	_, err := s.FS.Collection(ColBanners).Doc(b.ID).Set(ctx, b)
	return wrap(err)
}

func (s *Store) DeleteBanner(ctx context.Context, id string) error {
	_, err := s.FS.Collection(ColBanners).Doc(id).Delete(ctx)
	return wrap(err)
}
