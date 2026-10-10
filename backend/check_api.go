package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"backend/internal/models"

	"cloud.google.com/go/firestore"
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

	// Get quizathon for user xcxmAJL6bJdT8iEdXjv573Hajsq2
	doc, err := client.Collection("userEventRegistrations").Doc("quizathon_xcxmAJL6bJdT8iEdXjv573Hajsq2").Get(ctx)
	if err != nil {
		log.Fatalln(err)
	}
	
	var reg models.Registration
	doc.DataTo(&reg)
	
	b, _ := json.MarshalIndent(reg, "", "  ")
	fmt.Println(string(b))
}
