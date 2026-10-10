package main

import (
	"context"
	"log"

	"backend/internal/models"

	firebase "firebase.google.com/go/v4"
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

	coupons := []models.Coupon{
		{
			Code:                  "TEST50",
			Description:           "Flat 50 Rs Off",
			DiscountType:          "flat",
			DiscountValue:         50,
			IsActive:              true,
			IsHostCollegeAllowed:  true,
			IsOtherCollegeAllowed: true,
			MinCartValue:          0,
			UsageLimit:            100,
			UsagePerUserLimit:     10,
		},
		{
			Code:                  "HALFOFF",
			Description:           "50% Off",
			DiscountType:          "percentage",
			DiscountValue:         50,
			IsActive:              true,
			IsHostCollegeAllowed:  true,
			IsOtherCollegeAllowed: true,
			MinCartValue:          0,
			UsageLimit:            100,
			UsagePerUserLimit:     2,
		},
		{
			Code:                  "TEST100",
			Description:           "Flat 100 Rs Off",
			DiscountType:          "flat",
			DiscountValue:         100,
			IsActive:              true,
			IsHostCollegeAllowed:  true,
			IsOtherCollegeAllowed: true,
			MinCartValue:          0,
			UsageLimit:            100,
			UsagePerUserLimit:     10,
		},
	}

	for _, c := range coupons {
		_, err := client.Collection("coupons").Doc(c.Code).Set(ctx, c)
		if err != nil {
			log.Printf("Failed to insert coupon %s: %v\n", c.Code, err)
		} else {
			log.Printf("Successfully inserted coupon: %s\n", c.Code)
		}
	}
	log.Println("Coupons seeded successfully!")
}
