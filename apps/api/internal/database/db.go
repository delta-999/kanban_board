package database

import (
	"fmt"
	"log"
	"os"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

var DB *sqlx.DB

func Connect() {
	var err error
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	DB, err = sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
	}

	if err := DB.Ping(); err != nil {
		log.Fatal("Failed to ping database: ", err)
	}

	log.Println("Connected to database successfully")
}

func ApplyMigrations() {
	log.Println("Applying migrations...")
	
	paths := []string{
		"migrations/000001_init_schema.up.sql",
		"../../migrations/000001_init_schema.up.sql",
	}

	var schemaBytes []byte
	var err error

	for _, path := range paths {
		schemaBytes, err = os.ReadFile(path)
		if err == nil {
			break
		}
	}

	if len(schemaBytes) == 0 {
		log.Printf("Warning: Could not read migration file. Skipping auto-migration.")
		return
	}

	schema := string(schemaBytes)
	_, err = DB.Exec(schema)
	if err != nil {
		log.Printf("Error applying migrations: %v", err)
	} else {
		log.Println("Migrations applied successfully")
	}
}
