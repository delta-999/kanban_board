package main

import (
	"log"
	"os"

	"kanban-api/internal/database"
	"kanban-api/internal/handlers"
	"kanban-api/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		if err := godotenv.Load(".env"); err != nil {
			log.Println("No .env file found, using system environment variables")
		}
	}

	database.Connect()

	r := gin.Default()

	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-API-Key"}
	r.Use(cors.New(config))

	
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		api.GET("/ping", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "pong",
			})
		})

		api.GET("/issues", handlers.GetIssues)
		api.POST("/issues", handlers.CreateIssue)
		api.GET("/issues/:id", handlers.GetIssue)
		api.PATCH("/issues/:id", handlers.UpdateIssue)
		api.PATCH("/issues/:id/move", handlers.MoveIssue)
		api.DELETE("/issues/:id", handlers.DeleteIssue)

		api.GET("/users", handlers.GetUsers)

		api.GET("/labels", handlers.GetLabels)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	r.Run(":" + port)
}
