package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"backend/internal/apierr"
	"backend/internal/models"
	"backend/internal/random"
	"backend/internal/store"
)

type storyBody struct {
	Name    *string   `json:"name"    form:"name"`
	EventID *string   `json:"eventId" form:"eventId"`
	Images  *[]string `json:"images"`
	Order   *int      `json:"order"   form:"order"`
}

// ListStories returns all event stories for users.
func (a *API) ListStories(c *gin.Context) {
	all, err := a.Stories.All(c.Request.Context())
	if err != nil {
		log.Printf("ListStories error: %v", err)
		apierr.Respond(c, apierr.Internal("could not load stories"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": all})
}

// GetStory returns a single event story by ID for users.
func (a *API) GetStory(c *gin.Context) {
	st, err := a.Store.GetStory(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondStoryLookup(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"story": st})
}

// AdminListStories returns all stories for admins.
func (a *API) AdminListStories(c *gin.Context) {
	all, err := a.Stories.All(c.Request.Context())
	if err != nil {
		log.Printf("AdminListStories error: %v", err)
		apierr.Respond(c, apierr.Internal("could not load stories"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": all})
}

// AdminGetStory returns any story by ID for admins.
func (a *API) AdminGetStory(c *gin.Context) {
	st, err := a.Store.GetStory(c.Request.Context(), c.Param("id"))
	if err != nil {
		respondStoryLookup(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"story": st})
}

// CreateStory handles creating a story. Supports multipart images upload
// or JSON with images array.
func (a *API) CreateStory(c *gin.Context) {
	var body storyBody

	contentType := c.ContentType()
	isMultipart := strings.HasPrefix(contentType, "multipart/form-data")

	if isMultipart {
		if err := c.ShouldBind(&body); err != nil {
			apierr.Respond(c, apierr.BadRequest("invalid_form", err.Error()))
			return
		}
	} else {
		if !bind(c, &body) {
			return
		}
	}

	story := &models.Story{}
	applyStoryBody(story, &body)

	// If images were uploaded in multipart form, upload each to ImageKit
	if isMultipart {
		if err := a.handleStoryFileUploads(c, story); err != nil {
			apierr.Respond(c, err)
			return
		}
	}

	if err := validateStory(story); err != nil {
		apierr.Respond(c, err)
		return
	}

	if err := a.Store.CreateStory(c.Request.Context(), story); err != nil {
		log.Printf("CreateStory error: %v", err)
		apierr.Respond(c, apierr.Internal("could not create story"))
		return
	}
	a.Stories.Invalidate()

	c.JSON(http.StatusCreated, gin.H{"story": story})
}

// UpdateStory applies a partial update to an existing story.
func (a *API) UpdateStory(c *gin.Context) {
	ctx := c.Request.Context()
	id := c.Param("id")

	story, err := a.Store.GetStory(ctx, id)
	if err != nil {
		respondStoryLookup(c, err)
		return
	}

	var body storyBody
	contentType := c.ContentType()
	isMultipart := strings.HasPrefix(contentType, "multipart/form-data")

	if isMultipart {
		if err := c.ShouldBind(&body); err != nil {
			apierr.Respond(c, apierr.BadRequest("invalid_form", err.Error()))
			return
		}
	} else {
		if !bind(c, &body) {
			return
		}
	}

	n := applyStoryBody(story, &body)

	if isMultipart {
		beforeCount := len(story.Images)
		if err := a.handleStoryFileUploads(c, story); err != nil {
			apierr.Respond(c, err)
			return
		}
		if len(story.Images) > beforeCount {
			n++
		}
	}

	if n == 0 {
		apierr.Respond(c, apierr.BadRequest("empty_patch", "no updatable fields supplied"))
		return
	}

	if err := validateStory(story); err != nil {
		apierr.Respond(c, err)
		return
	}

	if err := a.Store.SaveStory(ctx, story); err != nil {
		log.Printf("SaveStory error: %v", err)
		apierr.Respond(c, apierr.Internal("could not update story"))
		return
	}
	a.Stories.Invalidate()

	c.JSON(http.StatusOK, gin.H{"story": story})
}

// DeleteStory removes a story.
func (a *API) DeleteStory(c *gin.Context) {
	ctx := c.Request.Context()
	id := c.Param("id")

	story, err := a.Store.GetStory(ctx, id)
	if err != nil {
		respondStoryLookup(c, err)
		return
	}

	if err := a.Store.DeleteStory(ctx, id); err != nil {
		log.Printf("DeleteStory error: %v", err)
		apierr.Respond(c, apierr.Internal("could not delete story"))
		return
	}
	a.Stories.Invalidate()

	// Clean up ImageKit assets if stored with references
	if len(story.Items) > 0 && a.Storage != nil {
		refs := make([]string, 0, len(story.Items))
		for _, it := range story.Items {
			if it.Ref != "" {
				refs = append(refs, it.Ref)
			}
		}
		if len(refs) > 0 {
			go func(toDelete []string) {
				for _, ref := range toDelete {
					if err := a.Storage.Delete(context.Background(), ref); err != nil {
						log.Printf("storage: deleting story image %q: %v", ref, err)
					}
				}
			}(refs)
		}
	}

	c.Status(http.StatusNoContent)
}

func (a *API) handleStoryFileUploads(c *gin.Context, story *models.Story) *apierr.Error {
	form, err := c.MultipartForm()
	if err != nil {
		return nil // no multipart form files
	}

	fileHeaders := form.File["images"]
	if len(fileHeaders) == 0 {
		fileHeaders = form.File["files"]
	}
	if len(fileHeaders) == 0 {
		if fh, err := c.FormFile("image"); err == nil && fh != nil {
			fileHeaders = append(fileHeaders, fh)
		}
	}

	if len(fileHeaders) == 0 {
		return nil
	}

	if a.Storage == nil {
		return apierr.BadRequest("storage_not_configured", "ImageKit storage is not configured")
	}

	now := time.Now().UTC()
	for _, fh := range fileHeaders {
		f, err := fh.Open()
		if err != nil {
			return apierr.BadRequest("file_read_error", err.Error())
		}
		defer f.Close()

		ref, url, err := a.Storage.UploadFile(c.Request.Context(), "stories", fh.Filename, f)
		if err != nil {
			log.Printf("ImageKit story image upload error: %v", err)
			return apierr.Internal("failed to upload story image to ImageKit")
		}

		story.Images = append(story.Images, url)
		story.Items = append(story.Items, models.StoryItem{
			ID:         random.Code(12),
			URL:        url,
			Ref:        ref,
			MediaType:  "image",
			UploadedAt: now,
		})
	}

	return nil
}

func respondStoryLookup(c *gin.Context, err error) {
	if errors.Is(err, store.ErrNotFound) {
		apierr.Respond(c, apierr.NotFound("story_not_found", "no such story"))
		return
	}
	apierr.Respond(c, apierr.Internal("could not load story"))
}

func applyStoryBody(st *models.Story, body *storyBody) int {
	n := 0
	if body.Name != nil {
		st.Name = strings.TrimSpace(*body.Name)
		n++
	}
	if body.EventID != nil {
		st.EventID = strings.TrimSpace(*body.EventID)
		n++
	}
	if body.Order != nil {
		st.Order = *body.Order
		n++
	}
	if body.Images != nil {
		st.Images = *body.Images
		now := time.Now().UTC()
		st.Items = make([]models.StoryItem, len(st.Images))
		for i, img := range st.Images {
			st.Items[i] = models.StoryItem{
				ID:         random.Code(12),
				URL:        img,
				MediaType:  "image",
				UploadedAt: now,
			}
		}
		n++
	}
	return n
}

func validateStory(st *models.Story) *apierr.Error {
	if st.Name == "" {
		return apierr.BadRequest("missing_fields", "story name is required")
	}
	if len(st.Images) == 0 {
		return apierr.BadRequest("missing_fields", "at least one image is required for the story")
	}
	return nil
}
