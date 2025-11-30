package models

import (
	"time"
)

type Issue struct {
	ID          uint       `db:"id" json:"id"`
	Title       string     `db:"title" json:"title"`
	Description string     `db:"description" json:"description"`
	Status      string     `db:"status" json:"status"`
	Priority    string     `db:"priority" json:"priority"`
	AssigneeID  *uint      `db:"assignee_id" json:"assignee_id"`
	Assignee    *User      `db:"-" json:"assignee,omitempty"` 
	OrderIndex  float64    `db:"order_index" json:"order_index"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt   *time.Time `db:"deleted_at" json:"-"`
	Labels      []*Label   `db:"-" json:"labels"` 
}

type User struct {
	ID        uint      `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	AvatarURL string    `db:"avatar_url" json:"avatar_url"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

type Label struct {
	ID        uint      `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	Color     string    `db:"color" json:"color"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}
