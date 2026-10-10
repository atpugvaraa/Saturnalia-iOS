package main

import (
	"context"
	"fmt"
	"log"

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

	doc, err := client.Collection("teamRegistrations").Doc("sathack_DD7989").Get(ctx)
	if err != nil {
		log.Fatalln(err)
	}
	
	fmt.Printf("LeaderUserId: %v\n", doc.Data()["leaderUserId"])
}
