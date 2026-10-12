package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"backend/internal/apierr"
	"backend/internal/models"
	"backend/internal/store"
)

type bannerBody struct {
	Title       *string `json:"title"       form:"title"`
	Description *string `json:"description" form:"description"`
	ImageURL    *string `json:"imageUrl"    form:"imageUrl"`
	ImageLink   *string `json:"imageLink"   form:"imageLink"`
	Link        *string `json:"link"        form:"link"`
	LinkURL     *string `json:"linkUrl"     form:"linkUrl"`
	LinkType    *string `json:"linkType"    form:"linkType"`
	IsActive    *bool   `json:"isActive"    form:"isActive"`
	Order       *int    `json:"order"       form:"order"`
}

// ListBanners returns all active banners for public/user view.
func (a *API) ListBanners(c *gin.Context) {
	all, err := a.Banners.All(c.Request.Context())
	if err != nil {
		log.Printf("ListBanners error: %v", err)
		apierr.Respond(c, apierr.Internal("could not load banners"))
		return
	}

	active := make([]*models.Banner, 0, len(all))
	for _, b := range all {
		if b.IsActive {
			active = append(active, b)
		}
	}
	c.JSON(http.StatusOK, gin.H{"items": active})
}

// GetBanner returns a single banner by ID for users.
func (a *API) GetBanner(c *gin.Context) {
	b, err := a.Store.GetBanner(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondBannerLookup(c, err)
		return
	}
	if !b.IsActive {
		apierr.Respond(c, apierr.NotFound("banner_not_found", "no such banner"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"banner": b})
}

// AdminListBanners returns all banners (including inactive) for admin management.
func (a *API) AdminListBanners(c *gin.Context) {
	all, err := a.Banners.All(c.Request.Context())
	if err != nil {
		log.Printf("AdminListBanners error: %v", err)
		apierr.Respond(c, apierr.Internal("could not load banners"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": all})
}

// AdminGetBanner returns any banner by ID for admins.
func (a *API) AdminGetBanner(c *gin.Context) {
	b, err := a.Store.GetBanner(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondBannerLookup(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"banner": b})
}

// CreateBanner handles creating a banner. It supports multipart file upload
// (field "image" or "file") or JSON with an imageUrl/imageLink.
func (a *API) CreateBanner(c *gin.Context) {
	var body bannerBody

	contentType := c.ContentType()
	if strings.HasPrefix(contentType, "multipart/form-data") {
		if err := c.ShouldBind(&body); err != nil {
			apierr.Respond(c, apierr.BadRequest("invalid_form", err.Error()))
			return
		}
	} else {
		if !bind(c, &body) {
			return
		}
	}

	banner := &models.Banner{IsActive: true}
	applyBannerBody(banner, &body)

	// If a file was uploaded in multipart form, upload to ImageKit
	if strings.HasPrefix(contentType, "multipart/form-data") {
		fileHeader, err := c.FormFile("image")
		if errors.Is(err, http.ErrMissingFile) {
			fileHeader, err = c.FormFile("file")
		}
		if err == nil && fileHeader != nil {
			if a.Storage == nil {
				apierr.Respond(c, apierr.BadRequest("storage_not_configured", "ImageKit storage is not configured"))
				return
			}
			file, err := fileHeader.Open()
			if err != nil {
				apierr.Respond(c, apierr.BadRequest("file_read_error", err.Error()))
				return
			}
			defer file.Close()

			ref, url, err := a.Storage.UploadFile(c.Request.Context(), "banners", fileHeader.Filename, file)
			if err != nil {
				log.Printf("ImageKit upload error: %v", err)
				apierr.Respond(c, apierr.Internal("failed to upload image to ImageKit"))
				return
			}
			banner.ImageURL = url
			banner.ImageRef = ref
		}
	}

	if err := validateBanner(banner); err != nil {
		apierr.Respond(c, err)
		return
	}

	if err := a.Store.CreateBanner(c.Request.Context(), banner); err != nil {
		log.Printf("CreateBanner error: %v", err)
		apierr.Respond(c, apierr.Internal("could not create banner"))
		return
	}
	a.Banners.Invalidate()

	c.JSON(http.StatusCreated, gin.H{"banner": banner})
}

// UpdateBanner applies a partial update to an existing banner.
func (a *API) UpdateBanner(c *gin.Context) {
	ctx := c.Request.Context()
	id := c.Param("id")

	banner, err := a.Store.GetBanner(ctx, id)
	if err != nil {
		respondBannerLookup(c, err)
		return
	}

	var body bannerBody
	contentType := c.ContentType()
	if strings.HasPrefix(contentType, "multipart/form-data") {
		if err := c.ShouldBind(&body); err != nil {
			apierr.Respond(c, apierr.BadRequest("invalid_form", err.Error()))
			return
		}
	} else {
		if !bind(c, &body) {
			return
		}
	}

	n := applyBannerBody(banner, &body)

	// Check if a new image was uploaded
	if strings.HasPrefix(contentType, "multipart/form-data") {
		fileHeader, err := c.FormFile("image")
		if errors.Is(err, http.ErrMissingFile) {
			fileHeader, err = c.FormFile("file")
		}
		if err == nil && fileHeader != nil {
			if a.Storage == nil {
				apierr.Respond(c, apierr.BadRequest("storage_not_configured", "ImageKit storage is not configured"))
				return
			}
			file, err := fileHeader.Open()
			if err != nil {
				apierr.Respond(c, apierr.BadRequest("file_read_error", err.Error()))
				return
			}
			defer file.Close()

			ref, url, err := a.Storage.UploadFile(ctx, "banners", fileHeader.Filename, file)
			if err != nil {
				log.Printf("ImageKit upload error: %v", err)
				apierr.Respond(c, apierr.Internal("failed to upload image to ImageKit"))
				return
			}
			banner.ImageURL = url
			banner.ImageRef = ref
			n++
		}
	}

	if n == 0 {
		apierr.Respond(c, apierr.BadRequest("empty_patch", "no updatable fields supplied"))
		return
	}

	if err := validateBanner(banner); err != nil {
		apierr.Respond(c, err)
		return
	}

	if err := a.Store.SaveBanner(ctx, banner); err != nil {
		log.Printf("SaveBanner error: %v", err)
		apierr.Respond(c, apierr.Internal("could not update banner"))
		return
	}
	a.Banners.Invalidate()

	c.JSON(http.StatusOK, gin.H{"banner": banner})
}

// DeleteBanner removes a banner.
func (a *API) DeleteBanner(c *gin.Context) {
	ctx := c.Request.Context()
	id := c.Param("id")

	banner, err := a.Store.GetBanner(ctx, id)
	if err != nil {
		respondBannerLookup(c, err)
		return
	}

	if err := a.Store.DeleteBanner(ctx, id); err != nil {
		log.Printf("DeleteBanner error: %v", err)
		apierr.Respond(c, apierr.Internal("could not delete banner"))
		return
	}
	a.Banners.Invalidate()

	// Clean up ImageKit asset if stored with reference
	if banner.ImageRef != "" && a.Storage != nil {
		go func(ref string) {
			if err := a.Storage.Delete(context.Background(), ref); err != nil {
				log.Printf("storage: deleting banner image %q: %v", ref, err)
			}
		}(banner.ImageRef)
	}

	c.Status(http.StatusNoContent)
}

func respondBannerLookup(c *gin.Context, err error) {
	if errors.Is(err, store.ErrNotFound) {
		apierr.Respond(c, apierr.NotFound("banner_not_found", "no such banner"))
		return
	}
	apierr.Respond(c, apierr.Internal("could not load banner"))
}

func applyBannerBody(b *models.Banner, body *bannerBody) int {
	n := 0
	if body.Title != nil {
		b.Title = strings.TrimSpace(*body.Title)
		n++
	}
	if body.Description != nil {
		b.Description = strings.TrimSpace(*body.Description)
		n++
	}
	if body.ImageURL != nil {
		b.ImageURL = strings.TrimSpace(*body.ImageURL)
		n++
	} else if body.ImageLink != nil {
		b.ImageURL = strings.TrimSpace(*body.ImageLink)
		n++
	}
	if body.Link != nil {
		b.Link = strings.TrimSpace(*body.Link)
		n++
	} else if body.LinkURL != nil {
		b.Link = strings.TrimSpace(*body.LinkURL)
		n++
	}
	if body.LinkType != nil {
		b.LinkType = strings.TrimSpace(*body.LinkType)
		n++
	}
	if body.IsActive != nil {
		b.IsActive = *body.IsActive
		n++
	}
	if body.Order != nil {
		b.Order = *body.Order
		n++
	}
	return n
}

func validateBanner(b *models.Banner) *apierr.Error {
	if b.Title == "" {
		return apierr.BadRequest("missing_fields", "banner title is required")
	}
	if b.ImageURL == "" {
		return apierr.BadRequest("missing_fields", "banner image URL or image file is required")
	}
	if b.Link == "" {
		return apierr.BadRequest("missing_fields", "banner link is required")
	}
	return nil
}
