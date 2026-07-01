# TaskFlow AI

**An AI-powered project management platform that helps individuals and teams plan, organize, track, and execute projects efficiently using intelligent automation and real-time collaboration.**

## 🚀 Overview

TaskFlow AI is a full-stack project management application that combines traditional project management workflows with AI-powered assistance. Users can create projects, manage tasks, monitor progress, and leverage AI to simplify planning and decision-making.

The primary goal of this project is to reduce manual project planning efforts while providing an intuitive and intelligent workspace for managing projects from start to finish.

# 🚀 Demo Credentials

To explore the application without creating a new account, use the following credentials:

Email: demo@taskflow.ai
Password: Demo@123


Alternatively, you can register a new account and start managing your own projects.

 **Project Status:** 🚧 Actively Under Development


   Features

🔐 Authentication
- Secure User Registration
- User Login
- JWT-based Authentication
- Password Encryption using bcrypt
- Protected API Routes

📊 Dashboard
- Project Overview
- Project Health Metrics
- Task Statistics
- Productivity Insights
- Status Visualization

📁 Project Management
- Create New Projects
- View Project Details
- Automatic Project Progress Tracking
- Project Priority Management

✅ Task Management
- Create Tasks
- Task Priority Management
- Task Status Tracking
- Due Date Management
- Automatic Progress Updates

🤖 AI Features
- AI Project Planner
- AI Task Breakdown Generator
- AI Executive Summary Generator
- Intelligent Project Assistance using Groq LLM

💾 Database
- MongoDB Integration
- User Management
- Project Management
- Task Management
- Secure Data Storage


# 🛠 Tech Stack

### Frontend
- React
- Vite
- React Router
- Axios
- Tailwind CSS

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- bcrypt
- Groq API


# 📂 Project Structure


TaskFlow-AI/
│
├── client/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── ...
│
├── server/
│   ├── src/
│   ├── models.js
│   ├── routes.js
│   ├── server.js
│   └── ...
│
└── README.md

# ⚙️ Installation

Clone the repository

```bash
git clone <repository-url>
```

Install dependencies

```bash
npm install
npm install --prefix client
npm install --prefix server
```

---

# Environment Variables

Create

```text
server/.env
```

Example

```env
PORT=5000

MONGODB_URI=your_mongodb_uri

JWT_SECRET=your_secret

GROQ_API_KEY=your_groq_api_key
```

---

# Run Locally

```bash
npm run dev
```

This starts both:

- Frontend (React + Vite)
- Backend (Express + Node.js)

---

# AI Capabilities

TaskFlow AI currently provides:

- AI-assisted Project Planning
- AI-powered Task Breakdown
- AI Executive Summary Generation
- Intelligent Project Assistance using Groq LLM

---

# Security

- JWT Authentication
- Password Hashing using bcrypt
- Protected API Endpoints
- Environment Variable Configuration
- Secure MongoDB Connection

---

# 🚧 Current Development Status

The core workflow of the application is functional and continuously being improved.

### ✅ Currently Working

- User Registration & Login
- Authentication & Authorization
- Dashboard
- Project Creation
- Task Creation
- AI Project Planner
- AI Task Breakdown
- AI Executive Summary
- MongoDB Integration

### 🔄 Features Under Improvement

The following features are currently under development and may not behave as expected in all scenarios:

- Project Editing
- Project Deletion
- Search Functionality
- Team Members Module
- UI/UX Improvements
- Additional Validations
- Performance Optimizations
- Better Error Handling

These features are actively being refined and will be included in upcoming updates.

# 🎯 Future Enhancements

- Role-Based Access Control
- Real-Time Collaboration
- File Attachments
- Notifications
- Calendar Integration
- AI Risk Prediction
- Gantt Charts
- Deployment Enhancements



**Note:** TaskFlow AI is an ongoing project. The current version demonstrates the core functionality of an AI-assisted project management system, with additional features, refinements, and optimizations planned in future updates.