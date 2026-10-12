package handlers

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"backend/internal/apierr"
)

type deleteMediaBody struct {
	Ref string `json:"ref" form:"ref"`
}

// UploadMedia handles uploading any media file (image or video) to ImageKit.
// Accepts multipart/form-data with file field ("file", "media", "image", or "video")
// and optional "folder" form field (defaults to "general").
func (a *API) UploadMedia(c *gin.Context) {
	if a.Storage == nil {
		apierr.Respond(c, apierr.BadRequest("storage_not_configured", "ImageKit storage is not configured"))
		return
	}

	folder := strings.TrimSpace(c.DefaultPostForm("folder", "general"))
	if folder == "" {
		folder = "general"
	}

	fileHeader, err := c.FormFile("file")
	if errors.Is(err, http.ErrMissingFile) {
		fileHeader, err = c.FormFile("media")
	}
	if errors.Is(err, http.ErrMissingFile) {
		fileHeader, err = c.FormFile("image")
	}
	if errors.Is(err, http.ErrMissingFile) {
		fileHeader, err = c.FormFile("video")
	}
	if err != nil || fileHeader == nil {
		apierr.Respond(c, apierr.BadRequest("missing_file", "media file is required"))
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		apierr.Respond(c, apierr.BadRequest("file_read_error", err.Error()))
		return
	}
	defer file.Close()

	ref, url, err := a.Storage.UploadFile(c.Request.Context(), folder, fileHeader.Filename, file)
	if err != nil {
		log.Printf("UploadMedia error: %v", err)
		apierr.Respond(c, apierr.Internal("failed to upload media to ImageKit"))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"url":    url,
		"ref":    ref,
		"name":   fileHeader.Filename,
		"size":   fileHeader.Size,
		"folder": folder,
	})
}

// DeleteMedia deletes a file from ImageKit given its reference string.
func (a *API) DeleteMedia(c *gin.Context) {
	if a.Storage == nil {
		apierr.Respond(c, apierr.BadRequest("storage_not_configured", "ImageKit storage is not configured"))
		return
	}

	ref := strings.TrimSpace(c.Query("ref"))
	if ref == "" {
		var body deleteMediaBody
		_ = c.ShouldBind(&body)
		ref = strings.TrimSpace(body.Ref)
	}

	if ref == "" {
		apierr.Respond(c, apierr.BadRequest("missing_ref", "ref parameter is required"))
		return
	}

	if err := a.Storage.Delete(c.Request.Context(), ref); err != nil {
		log.Printf("DeleteMedia error: %v", err)
		apierr.Respond(c, apierr.Internal("failed to delete media from ImageKit"))
		return
	}

	c.Status(http.StatusNoContent)
}
