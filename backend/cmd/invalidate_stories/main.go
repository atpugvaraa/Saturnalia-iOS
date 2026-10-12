package main

import (
	"context"
	"log"

	"backend/internal/cache"
	"backend/internal/config"
	"backend/internal/store"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	ctx := context.Background()
	provider, err := cache.NewRedis(ctx, cfg.RedisURL, cfg.RedisNamespace)
	if err != nil {
		log.Fatalf("redis: %v", err)
	}
	defer provider.Close()

	if err := provider.Delete(ctx, store.KeyStories); err != nil {
		log.Fatalf("delete key error: %v", err)
	}
	log.Println("Successfully invalidated stories cache!")
}
