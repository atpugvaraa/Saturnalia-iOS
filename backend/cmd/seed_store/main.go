package main

import (
	"context"
	"log"
	"time"

	"backend/internal/models"

	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

func main() {
	ctx := context.Background()

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

	// Check if items already exist
	iter := client.Collection("store").Limit(1).Documents(ctx)
	doc, err := iter.Next()
	iter.Stop()
	if err == nil && doc != nil && doc.Exists() {
		log.Println("Store collection already has items, skipping seed.")
		return
	}
	if err != nil && err != iterator.Done {
		log.Fatalf("error checking store collection: %v", err)
	}

	now := time.Now().UTC()
	sampleItems := []*models.StoreItem{
		{
			Name:        "Saturnalia Official Hoodie",
			Description: "Premium heavyweight fleece hoodie curated in a way that you wear to feel the vibes of Saturnalia.",
			Price:       800,
			Image:       "", // Left empty so question.png fallback displays as requested
			CreatedAt:   now,
			UpdatedAt:   now,
		},
		{
			Name:        "Saturnalia ID Card & Lanyard",
			Description: "Official delegate ID card and premium satin lanyard for festival access and souvenirs.",
			Price:       150,
			Image:       "", // Left empty so question.png fallback displays as requested
			CreatedAt:   now.Add(time.Second),
			UpdatedAt:   now.Add(time.Second),
		},
		{
			Name:        "Classic Saturnalia Tee",
			Description: "100% Combed cotton commemorative Saturnalia t-shirt with signature festival art.",
			Price:       499,
			Image:       "", // Left empty so question.png fallback displays as requested
			CreatedAt:   now.Add(2 * time.Second),
			UpdatedAt:   now.Add(2 * time.Second),
		},
	}

	for _, item := range sampleItems {
		item.Normalise()
		ref, _, err := client.Collection("store").Add(ctx, item)
		if err != nil {
			log.Fatalf("failed to add %s: %v", item.Name, err)
		}
		log.Printf("Seeded store item: %s (%s) - ₹%.0f", item.Name, ref.ID, item.Price)
	}
	log.Println("Seeding complete!")
}
