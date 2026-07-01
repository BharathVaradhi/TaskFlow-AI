import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Project, Task } from "./models.js";

const USERS_DATA = [
  { name: "Alex Morgan", email: "alex@taskflow.ai", role: "Project Manager", initials: "AM", color: "#7c5cff", department: "Product & Operations" },
  { name: "Sara Kim", email: "sara@taskflow.ai", role: "Team Member", initials: "SK", color: "#ec7a9c", department: "Product & Operations" },
  { name: "Jordan Reed", email: "jordan@taskflow.ai", role: "Team Member", initials: "JR", color: "#42bfa5", department: "Research & Development" },
  { name: "Noah Patel", email: "noah@taskflow.ai", role: "Team Member", initials: "NP", color: "#f3a44a", department: "Growth" },
  { name: "Taylor Diaz", email: "taylor@taskflow.ai", role: "Team Member", initials: "TD", color: "#4f8df7", department: "Engineering" }
];

const PROJECTS_DATA = [
  { name: "Mobile App Redesign", description: "Reimagine the customer mobile experience", status: "Active", priority: "High", progress: 72, color: "#7c5cff", dueOffsetDays: 8 },
  { name: "Q3 Marketing Campaign", description: "Multi-channel product launch campaign", status: "Active", priority: "Medium", progress: 48, color: "#ec7a9c", dueOffsetDays: 25 },
  { name: "Analytics Dashboard", description: "Unified business intelligence platform", status: "Planning", priority: "High", progress: 24, color: "#42bfa5", dueOffsetDays: 43 },
  { name: "Cloud Migration", description: "Migrate core services to new infrastructure", status: "Delayed", priority: "Critical", progress: 61, color: "#f3a44a", dueOffsetDays: 0 },
  { name: "Customer Portal", description: "Self-service support and billing portal", status: "Completed", priority: "Medium", progress: 100, color: "#4f8df7", dueOffsetDays: -21 },
  { name: "Security Audit", description: "Annual security and compliance review", status: "On Hold", priority: "Low", progress: 35, color: "#94a0b8", dueOffsetDays: 31 }
];

const TASKS_DATA = [
  { title: "Create user flow diagrams", projectIndex: 0, priority: "High", dueOffsetDays: 0, assigneeInitials: "AM", status: "Todo" },
  { title: "Prepare campaign brief", projectIndex: 1, priority: "Medium", dueOffsetDays: -8, assigneeInitials: "NP", status: "Todo" },
  { title: "Build navigation prototype", projectIndex: 0, priority: "High", dueOffsetDays: -6, assigneeInitials: "SK", status: "In Progress" },
  { title: "Configure analytics events", projectIndex: 2, priority: "Medium", dueOffsetDays: -4, assigneeInitials: "TD", status: "In Progress" },
  { title: "Review onboarding screens", projectIndex: 0, priority: "Low", dueOffsetDays: -7, assigneeInitials: "JR", status: "Review" },
  { title: "Approve production release", projectIndex: 4, priority: "High", dueOffsetDays: -10, assigneeInitials: "AM", status: "Review" },
  { title: "Finalize API documentation", projectIndex: 4, priority: "Medium", dueOffsetDays: -12, assigneeInitials: "TD", status: "Completed" },
  { title: "User acceptance testing", projectIndex: 4, priority: "High", dueOffsetDays: -14, assigneeInitials: "NP", status: "Completed" }
];

async function seed() {
  console.log("Connecting to MongoDB...");
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI env variable is missing!");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected successfully.");

  

  // Seed Users
  console.log("Seeding users...");

  const createdUsers = [];
  for (const u of USERS_DATA) {
    const user = await User.create({
      name: u.name,
      email: u.email,
      password: "password123",
      role: u.role,
      avatar: u.initials,
      department: u.department
    });
    createdUsers.push({ ...u, _id: user._id });
  }
  console.log(`Seeded ${createdUsers.length} users.`);

  // Map helper
  const findUserByInitials = (initials) => {
    return createdUsers.find(u => u.initials === initials)?._id;
  };

  // Seed Projects
  console.log("Seeding projects...");
  const createdProjects = [];
  const pmUser = createdUsers.find(u => u.role === "Project Manager") || createdUsers[0];

  for (const p of PROJECTS_DATA) {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + p.dueOffsetDays);
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30); // 30 days before end date

    // assign random members from our seed list (e.g. 2-3 members)
    const members = createdUsers
      .filter(() => Math.random() > 0.3)
      .map(u => u._id);

    const project = await Project.create({
      name: p.name,
      description: p.description,
      status: p.status,
      priority: p.priority,
      progress: p.progress,
      startDate,
      endDate,
      owner: pmUser._id,
      members: members.length ? members : [pmUser._id]
    });
    createdProjects.push(project);
  }
  console.log(`Seeded ${createdProjects.length} projects.`);

  // Seed Tasks
  console.log("Seeding tasks...");
  let tasksCount = 0;
  for (const t of TASKS_DATA) {
    const targetProject = createdProjects[t.projectIndex];
    if (!targetProject) continue;

    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + t.dueOffsetDays);

    const assigneeId = findUserByInitials(t.assigneeInitials) || pmUser._id;

    await Task.create({
      title: t.title,
      description: `Task corresponding to ${t.title} for project ${targetProject.name}`,
      priority: t.priority,
      dueDate,
      status: t.status,
      assignee: assigneeId,
      project: targetProject._id,
      createdBy: pmUser._id
    });
    tasksCount++;
  }
  console.log(`Seeded ${tasksCount} tasks.`);

  console.log("Database seeding completed successfully!");
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error("Seeding error:", err);
  process.exit(1);
});
