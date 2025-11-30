package handlers

import (
	"net/http"

	"kanban-api/internal/database"
	"kanban-api/internal/models"

	"github.com/gin-gonic/gin"
)

// GetLabels lists all labels
func GetLabels(c *gin.Context) {
	var labels []models.Label
	if err := database.DB.Select(&labels, "SELECT * FROM labels"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, labels)
}
