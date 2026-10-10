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

	iter := client.Collection("userEventRegistrations").Documents(ctx)
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Printf("Error: %v", err)
			break
		}
		fmt.Printf("Reg: %s | EventID: %v | TeamID: %v | PaymentStatus: %v | Status: %v\n", 
            doc.Ref.ID, doc.Data()["eventId"], doc.Data()["teamId"], doc.Data()["paymentStatus"], doc.Data()["status"])
	}
}
