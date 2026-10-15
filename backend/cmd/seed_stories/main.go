package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"backend/internal/cache"
	"backend/internal/config"
	"backend/internal/models"
	"backend/internal/storage"

	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/option"
)

func main() {
	ctx := context.Background()

	// Initialize ImageKit storage against the same Redis counters the API uses,
	// so seeded bytes count toward each account's quota.
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	counters, err := cache.NewRedis(ctx, cfg.RedisURL, cfg.RedisNamespace)
	if err != nil {
		log.Fatalf("redis: %v", err)
	}
	defer counters.Close()
	store, err := storage.New("imagekit.json", counters)
	if err != nil {
		log.Fatalf("failed to init imagekit storage: %v", err)
	}

	sa := option.WithCredentialsFile("serviceAccountKey.json")
	app, err := firebase.NewApp(ctx, nil, sa)
	if err != nil {
		log.Fatalf("error initializing app: %v\n", err)
	}

	client, err := app.Firestore(ctx)
	if err != nil {
		log.Fatalln(err)
	}
	defer client.Close()

	now := time.Now().UTC()

	// Upload asset helper
	uploadAsset := func(relPath string) (string, string, error) {
		fullPath := filepath.Join("../app/assets", relPath)
		f, err := os.Open(fullPath)
		if err != nil {
			return "", "", fmt.Errorf("open %s: %w", fullPath, err)
		}
		defer f.Close()

		baseName := filepath.Base(relPath)
		folder := "stories/" + filepath.Dir(relPath)
		ref, url, err := store.UploadFile(ctx, folder, baseName, f)
		if err != nil {
			return "", "", fmt.Errorf("upload %s: %w", relPath, err)
		}
		log.Printf("Uploaded %s -> %s (ref: %s)", relPath, url, ref)
		return ref, url, nil
	}

	type eventSeed struct {
		Name   string
		Order  int
		Assets []string
	}

	seeds := []eventSeed{
		{
			Name:  "Event 1",
			Order: 1,
			Assets: []string{
				"story1/Copy_of_DSC_2885_ehyu7g.jpg",
				"story1/Copy_of_JPG06242_hugpaw.jpg",
			},
		},
		{
			Name:  "Event 2",
			Order: 2,
			Assets: []string{
				"story2/Copy_of_DSC09217_cesaci.jpg",
				"story2/Copy_of_JPG06985_hrr7ta.jpg",
				"story2/Copy_of_OWL02218_ofmovh.jpg",
			},
		},
		{
			Name:  "Event 3",
			Order: 3,
			Assets: []string{
				"story3/Copy_of_KAREE_SAT_PBKS-87_pllsr4.jpg",
				"story3/Copy_of_OWL02359_lyncrp.jpg",
			},
		},
	}

	for _, s := range seeds {
		var imgURLs []string
		var items []models.StoryItem

		for i, asset := range s.Assets {
			ref, url, err := uploadAsset(asset)
			if err != nil {
				log.Fatalf("failed to upload asset %s: %v", asset, err)
			}
			imgURLs = append(imgURLs, url)
			items = append(items, models.StoryItem{
				ID:         fmt.Sprintf("%s-%d", s.Name, i+1),
				URL:        url,
				Ref:        ref,
				MediaType:  "image",
				UploadedAt: now,
			})
		}

		story := models.Story{
			Name:      s.Name,
			Order:     s.Order,
			Images:    imgURLs,
			Items:     items,
			CreatedAt: now,
			UpdatedAt: now,
		}

		docRef := client.Collection("stories").Doc(s.Name)
		if _, err := docRef.Set(ctx, story); err != nil {
			log.Fatalf("Failed to save story %s in firestore: %v", s.Name, err)
		}
		log.Printf("Successfully saved %s to Firestore with %d ImageKit URLs!", s.Name, len(imgURLs))
	}

	log.Println("All stories uploaded to ImageKit and seeded in Firestore successfully!")
}
