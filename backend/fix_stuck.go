package main

import (
	"context"
	"fmt"
	"log"

	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
    "cloud.google.com/go/firestore"
)

func main() {
	ctx := context.Background()
	sa := option.WithCredentialsFile("serviceAccountKey.json")
	app, err := firebase.NewApp(ctx, nil, sa)
	if err != nil {
		log.Fatalln(err)
	}
	client, err := app.Firestore(ctx)
	if err != nil {
		log.Fatalln(err)
	}
	defer client.Close()

	// Find all successful payments
	iter := client.Collection("payments").Where("status", "==", "success").Documents(ctx)
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Fatalf("Error: %v", err)
		}
		
		data := doc.Data()
		eventId, _ := data["eventId"].(string)
		teamId, _ := data["teamId"].(string)
        userId, _ := data["userId"].(string)

		if eventId != "" {
			// If it's a team event, update all team members
			if teamId != "" {
				regIter := client.Collection("userEventRegistrations").
					Where("eventId", "==", eventId).
					Where("teamId", "==", teamId).
					Documents(ctx)
				
				for {
					regDoc, err := regIter.Next()
					if err == iterator.Done {
						break
					}
					if err != nil {
						log.Printf("Error iterating team regs: %v", err)
						break
					}
					
					if regDoc.Data()["paymentStatus"] != "success" {
						fmt.Printf("Fixing stuck team registration: %s\n", regDoc.Ref.ID)
						regDoc.Ref.Update(ctx, []firestore.Update{
							{Path: "paymentStatus", Value: "success"},
						})
					}
				}
			} else {
                // Individual registration
                regID := eventId + "_" + userId
                regDoc, err := client.Collection("userEventRegistrations").Doc(regID).Get(ctx)
                if err == nil {
                    if regDoc.Data()["paymentStatus"] != "success" {
						fmt.Printf("Fixing stuck individual registration: %s\n", regDoc.Ref.ID)
						regDoc.Ref.Update(ctx, []firestore.Update{
							{Path: "paymentStatus", Value: "success"},
						})
					}
                }
            }
		}
	}
	fmt.Println("Done fixing stuck registrations!")
}
