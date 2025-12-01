package main

import (
	"fmt"
	"log"
	"math/rand"

	"kanban-api/internal/database"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load("../../.env"); err != nil {
		if err := godotenv.Load(".env"); err != nil {
			log.Println("No .env file found, using system environment variables")
		}
	}

	database.Connect()

	database.ApplyMigrations()

	// Clean up
	log.Println("Cleaning up database...")
	database.DB.Exec("DELETE FROM issue_labels")
	database.DB.Exec("DELETE FROM issues")
	database.DB.Exec("DELETE FROM labels")
	database.DB.Exec("DELETE FROM users")

	// Seed Users
	log.Println("Seeding users...")
	users := []string{"Alice", "Bob", "Charlie", "Dave", "Eve"}
	userIDs := make([]int, 0)
	for _, name := range users {
		var id int
		err := database.DB.QueryRow("INSERT INTO users (name, avatar_url) VALUES ($1, $2) RETURNING id", name, fmt.Sprintf("https://ui-avatars.com/api/?name=%s", name)).Scan(&id)
		if err != nil {
			log.Fatal(err)
		}
		userIDs = append(userIDs, id)
	}

	// Seed Labels
	log.Println("Seeding labels...")
	labels := []struct {
		Name  string
		Color string
	}{
		{"Bug", "#ef4444"},
		{"Feature", "#3b82f6"},
		{"Enhancement", "#10b981"},
		{"Documentation", "#f59e0b"},
		{"Design", "#8b5cf6"},
	}
	labelIDs := make([]int, 0)
	for _, l := range labels {
		var id int
		err := database.DB.QueryRow("INSERT INTO labels (name, color) VALUES ($1, $2) RETURNING id", l.Name, l.Color).Scan(&id)
		if err != nil {
			log.Fatal(err)
		}
		labelIDs = append(labelIDs, id)
	}

	// Seed Issues
	log.Println("Seeding issues...")
	statuses := []string{"Backlog", "Todo", "InProgress", "Done", "Canceled"}
	priorities := []string{"Low", "Med", "High", "Critical"}

	for i := 1; i <= 20; i++ {
		status := statuses[rand.Intn(len(statuses))]
		priority := priorities[rand.Intn(len(priorities))]
		assigneeID := userIDs[rand.Intn(len(userIDs))]
		
		var issueID int
		err := database.DB.QueryRow(`
			INSERT INTO issues (title, description, status, priority, assignee_id, order_index) 
			VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
			fmt.Sprintf("Issue %d", i),
			fmt.Sprintf("Description for issue %d", i),
			status,
			priority,
			assigneeID,
			float64(i)*1000,
		).Scan(&issueID)
		if err != nil {
			log.Fatal(err)
		}

		// Assign random labels
		numLabels := rand.Intn(3)
		for j := 0; j < numLabels; j++ {
			labelID := labelIDs[rand.Intn(len(labelIDs))]
			database.DB.Exec("INSERT INTO issue_labels (issue_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", issueID, labelID)
		}
	}

	log.Println("Seeding complete!")
}
