package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"backend/internal/middleware"
	"backend/internal/store"
)

func (a *API) DeleteSelf(c *gin.Context) {
	user := middleware.CurrentUser(c)

	if err := store.DeleteUser(c.Request.Context(), user.UserID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
	})
}
