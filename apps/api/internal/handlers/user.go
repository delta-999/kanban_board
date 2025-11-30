package handlers

import (
	"net/http"

	"kanban-api/internal/database"
	"kanban-api/internal/models"

	"github.com/gin-gonic/gin"
)

// GetUsers lists all users
func GetUsers(c *gin.Context) {
	var users []models.User
	if err := database.DB.Select(&users, "SELECT * FROM users"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}
