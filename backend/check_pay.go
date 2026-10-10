package main

import (
	"context"
	"fmt"
	"log"

	"google.golang.org/api/iterator"
	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/option"
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

	iter := client.Collection("payments").Documents(ctx)
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Printf("Error: %v", err)
			break
		}
        data := doc.Data()
		fmt.Printf("Pay: %s | EventID: %v | TeamID: %v | Status: %v | Intentions: %+v\n", 
            doc.Ref.ID, data["eventId"], data["teamId"], data["status"], data["processedIntentions"])
	}
}
