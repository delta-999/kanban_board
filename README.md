# Kanban Board Application

A full-stack Kanban board application built with Go (Gin), Next.js, and PostgreSQL.

## Features

- **Kanban Board**: Drag-and-drop issues between columns (Backlog, Todo, In Progress, Done, Canceled).
- **Issue Management**: Create, edit, delete, and move issues.
- **Filtering**: Filter issues by Status, Priority, and Assignee (Multi-select supported).
- **Searchable Assignees**: Assign users to issues using a searchable dropdown.
- **Persistent Order**: Issue order is preserved within columns.
- **Responsive Design**: Built with Tailwind CSS and shadcn/ui.

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui, dnd-kit, Bun.
- **Backend**: Go 1.23, Gin Web Framework, sqlx.
- **Database**: PostgreSQL.
- **Containerization**: Docker, Docker Compose.

## Prerequisites

- Docker & Docker Compose
- Bun (for local frontend development)
- Go 1.23+ (for local backend development)

## Getting Started

### Option 1: Docker Compose (Recommended)

Run the entire application stack (DB, API, Web) with a single command.

```bash
docker-compose up -d --build
```

- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API**: [http://localhost:8081/api](http://localhost:8081/api)
- **Database**: Port 5433

### Option 2: Local Development

#### 1. Database
Start PostgreSQL using Docker:
```bash
docker-compose up -d postgres
```

#### 2. Backend (API)
Navigate to `apps/api`:
```bash
cd apps/api
cp .env.example .env # Create .env if needed
go mod download
```

Run the server:
```bash
export DB_HOST=localhost DB_USER=postgres DB_PASSWORD=password DB_NAME=kanban DB_PORT=5433 PORT=8081
go run cmd/server/main.go
```

Seed the database (optional):
```bash
go run cmd/seed/main.go
```

#### 3. Frontend (Web)
Navigate to `apps/web`:
```bash
cd apps/web
bun install
```

Run the development server:
```bash
bun run dev
```