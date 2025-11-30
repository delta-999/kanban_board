package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"kanban-api/internal/database"
	"kanban-api/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

func GetIssues(c *gin.Context) {
	query := "SELECT DISTINCT i.* FROM issues i"
	
	var args []interface{}
	
	whereClauses := []string{}
	
	if statuses := c.QueryArray("status"); len(statuses) > 0 {
		whereClauses = append(whereClauses, "i.status IN (?)")
		args = append(args, statuses)
	}
	if priorities := c.QueryArray("priority"); len(priorities) > 0 {
		whereClauses = append(whereClauses, "i.priority IN (?)")
		args = append(args, priorities)
	}
	if assigneeIDs := c.QueryArray("assignee_id"); len(assigneeIDs) > 0 {
		whereClauses = append(whereClauses, "i.assignee_id IN (?)")
		args = append(args, assigneeIDs)
	}
	
	if labelIDs := c.QueryArray("label_id"); len(labelIDs) > 0 {
		query += " JOIN issue_labels il ON il.issue_id = i.id"
		whereClauses = append(whereClauses, "il.label_id IN (?)")
		args = append(args, labelIDs)
	}

	if len(whereClauses) > 0 {
		query += " WHERE " + strings.Join(whereClauses, " AND ")
	}

	
	var err error
	query, args, err = sqlx.In(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	query += " ORDER BY i.order_index ASC"

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
	offset := (page - 1) * pageSize
	
	query += " LIMIT ? OFFSET ?"
	args = append(args, pageSize, offset)

	query = database.DB.Rebind(query)

	var issues []*models.Issue
	if err := database.DB.Select(&issues, query, args...); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if len(issues) == 0 {
		c.JSON(http.StatusOK, []models.Issue{})
		return
	}

	issueIDs := make([]uint, len(issues))
	assigneeIDs := make([]uint, 0)
	for i, issue := range issues {
		issueIDs[i] = issue.ID
		if issue.AssigneeID != nil {
			assigneeIDs = append(assigneeIDs, *issue.AssigneeID)
		}
	}

	if len(issueIDs) > 0 {
		q, a, err := sqlx.In(`
			SELECT l.*, il.issue_id 
			FROM labels l 
			JOIN issue_labels il ON il.label_id = l.id 
			WHERE il.issue_id IN (?)`, issueIDs)
		if err == nil {
			q = database.DB.Rebind(q)
			rows, err := database.DB.Queryx(q, a...)
			if err == nil {
				defer rows.Close()
				labelsMap := make(map[uint][]*models.Label)
				for rows.Next() {
					type LabelRow struct {
						models.Label
						IssueID uint `db:"issue_id"`
					}
					var lr LabelRow
					rows.StructScan(&lr)
					labelsMap[lr.IssueID] = append(labelsMap[lr.IssueID], &lr.Label)
				}
				
				for _, issue := range issues {
					issue.Labels = labelsMap[issue.ID]
					if issue.Labels == nil {
						issue.Labels = []*models.Label{}
					}
				}
			}
		}
	}

	if len(assigneeIDs) > 0 {
		q, a, err := sqlx.In("SELECT * FROM users WHERE id IN (?)", assigneeIDs)
		if err == nil {
			q = database.DB.Rebind(q)
			var users []*models.User
			if err := database.DB.Select(&users, q, a...); err == nil {
				userMap := make(map[uint]*models.User)
				for _, u := range users {
					userMap[u.ID] = u
				}
				for _, issue := range issues {
					if issue.AssigneeID != nil {
						issue.Assignee = userMap[*issue.AssigneeID]
					}
				}
			}
		}
	}

	c.JSON(http.StatusOK, issues)
}

func CreateIssue(c *gin.Context) {
	var input struct {
		Title       string   `json:"title" binding:"required"`
		Description string   `json:"description"`
		Status      string   `json:"status"`
		Priority    string   `json:"priority"`
		AssigneeID  *uint    `json:"assignee_id"`
		LabelIDs    []uint   `json:"label_ids"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Status == "" {
		input.Status = "Backlog"
	}
	if input.Priority == "" {
		input.Priority = "Low"
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback()

	var maxOrder float64
	err = tx.Get(&maxOrder, "SELECT COALESCE(MAX(order_index), 0) FROM issues WHERE status = $1", input.Status)
	if err != nil {
		maxOrder = 0
	}
	orderIndex := maxOrder + 1000.0

	var issueID uint
	query := `
		INSERT INTO issues (title, description, status, priority, assignee_id, order_index)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`
	err = tx.QueryRow(query, input.Title, input.Description, input.Status, input.Priority, input.AssigneeID, orderIndex).Scan(&issueID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if len(input.LabelIDs) > 0 {
		for _, labelID := range input.LabelIDs {
			_, err := tx.Exec("INSERT INTO issue_labels (issue_id, label_id) VALUES ($1, $2)", issueID, labelID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":          issueID,
		"title":       input.Title,
		"description": input.Description,
		"status":      input.Status,
		"priority":    input.Priority,
		"assignee_id": input.AssigneeID,
		"order_index": orderIndex,
	})
}

func GetIssue(c *gin.Context) {
	id := c.Param("id")
	var issue models.Issue
	err := database.DB.Get(&issue, "SELECT * FROM issues WHERE id = $1", id)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Issue not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if issue.AssigneeID != nil {
		var user models.User
		if err := database.DB.Get(&user, "SELECT * FROM users WHERE id = $1", *issue.AssigneeID); err == nil {
			issue.Assignee = &user
		}
	}

	var labels []*models.Label
	err = database.DB.Select(&labels, `
		SELECT l.* FROM labels l
		JOIN issue_labels il ON il.label_id = l.id
		WHERE il.issue_id = $1
	`, issue.ID)
	if err == nil {
		issue.Labels = labels
	} else {
		issue.Labels = []*models.Label{}
	}

	c.JSON(http.StatusOK, issue)
}

func UpdateIssue(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		Status      *string `json:"status"`
		Priority    *string `json:"priority"`
		AssigneeID  *uint   `json:"assignee_id"`
		LabelIDs    []uint  `json:"label_ids"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := database.DB.Beginx()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback()

	setClauses := []string{}
	args := []interface{}{}
	argID := 1

	if input.Title != nil {
		setClauses = append(setClauses, fmt.Sprintf("title = $%d", argID))
		args = append(args, *input.Title)
		argID++
	}
	if input.Description != nil {
		setClauses = append(setClauses, fmt.Sprintf("description = $%d", argID))
		args = append(args, *input.Description)
		argID++
	}
	if input.Status != nil {
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", argID))
		args = append(args, *input.Status)
		argID++
	}
	if input.Priority != nil {
		setClauses = append(setClauses, fmt.Sprintf("priority = $%d", argID))
		args = append(args, *input.Priority)
		argID++
	}
	if input.AssigneeID != nil {
		
		setClauses = append(setClauses, fmt.Sprintf("assignee_id = $%d", argID))
		args = append(args, *input.AssigneeID)
		argID++
	}

	if len(setClauses) > 0 {
		setClauses = append(setClauses, fmt.Sprintf("updated_at = NOW()"))
		query := fmt.Sprintf("UPDATE issues SET %s WHERE id = $%d", strings.Join(setClauses, ", "), argID)
		args = append(args, id)
		_, err := tx.Exec(query, args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	if input.LabelIDs != nil {
		_, err := tx.Exec("DELETE FROM issue_labels WHERE issue_id = $1", id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		for _, labelID := range input.LabelIDs {
			_, err := tx.Exec("INSERT INTO issue_labels (issue_id, label_id) VALUES ($1, $2)", id, labelID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

func MoveIssue(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Status     string  `json:"status" binding:"required"`
		OrderIndex float64 `json:"order_index" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := database.DB.Exec("UPDATE issues SET status = $1, order_index = $2, updated_at = NOW() WHERE id = $3", input.Status, input.OrderIndex, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "moved"})
}

func DeleteIssue(c *gin.Context) {
	id := c.Param("id")
	_, err := database.DB.Exec("DELETE FROM issues WHERE id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}
