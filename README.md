# TaskFlow AI

A modern AI-powered project management SaaS application. The repository contains a responsive React product experience and an Express/Mongoose API foundation with JWT authentication and Gemini integration.

## Highlights

- Analytics dashboard with progress, task, productivity, and risk insights
- Searchable project portfolio with status and progress tracking
- Interactive Kanban board with task workflow transitions
- AI workspace for project planning, task breakdown, sprint planning, risk analysis, and reports
- Team workload and performance views
- Light and dark themes, responsive navigation, animations, and settings
- REST APIs for auth, projects, tasks, dashboard analytics, and Gemini generation

## Run locally

```bash
npm run install:all
copy server\.env.example server\.env
npm run dev
```

The client runs at `http://localhost:5173` and the API at `http://localhost:5000`.

The frontend includes realistic demo data and works without external services. Add `MONGODB_URI`, `JWT_SECRET`, and `GEMINI_API_KEY` to `server/.env` to enable persistent API workflows.

## API overview

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Authenticate and receive a JWT |
| GET | `/api/auth/me` | Fetch the signed-in user |
| GET/POST | `/api/projects` | List or create projects |
| GET/PATCH/DELETE | `/api/projects/:id` | Manage one project |
| GET/POST | `/api/tasks` | List or create tasks |
| PATCH/DELETE | `/api/tasks/:id` | Manage one task |
| GET | `/api/dashboard` | Aggregated project and task metrics |
| POST | `/api/ai/generate` | Generate structured plans with Gemini |

Protected endpoints require `Authorization: Bearer <token>`.
