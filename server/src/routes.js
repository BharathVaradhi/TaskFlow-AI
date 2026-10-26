import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User, Project, Task, Comment, Activity, Notification } from "./models.js";
import { generatePlan, generateSummary } from "./aiService.js";
import { canChangeRole, canEditProject, registrationRole } from "./policies.js";
import { formatTeamTaskMetrics } from "./teamMetrics.js";

const router = Router();

// JWT sign helper
const sign = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || "development-only-secret", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// Database connectivity check middleware
const requireDatabase = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database is currently disconnected. Please ensure MongoDB is running and MONGODB_URI is set in server/.env.",
      databaseConnected: false,
    });
  }
  next();
};

// Authentication middleware
export const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "development-only-secret");
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Helper to log workspace activities
async function logActivity({ project, task, actor, action, details = {} }) {
  try {
    if (!project || !actor) return;
    await Activity.create({ project, task, actor, action, details });
  } catch (err) {
    console.error("Failed to log activity:", err.message);
  }
}

// Helper to update project completion progress
async function updateProjectProgress(projectId) {
  if (!projectId) return;
  try {
    const total = await Task.countDocuments({ project: projectId });
    if (total === 0) {
      await Project.findByIdAndUpdate(projectId, { progress: 0 });
      return 0;
    }
    const completed = await Task.countDocuments({ project: projectId, status: "Completed" });
    const progress = Math.round((completed / total) * 100);
    await Project.findByIdAndUpdate(projectId, { progress });
    return progress;
  } catch (err) {
    console.error("Failed to update project progress:", err.message);
  }
}

// Helper to verify user access to a project
async function checkProjectAccess(projectId, userId) {
  if (!projectId || !userId) return false;
  const project = await Project.findOne({
    _id: projectId,
    $or: [{ owner: userId }, { members: userId }],
  });
  return Boolean(project);
}

// Apply database check to all routes below
router.use(requireDatabase);

/* ==========================================================================
   AUTHENTICATION ROUTES
   ========================================================================== */

// POST /auth/register
router.post("/auth/register", async (req, res, next) => {
  try {
    const { name, email, password, department } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Full name is required" });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ message: "A valid email address is required" });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ message: "An account with this email address already exists" });
    }

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      // Public registration must never grant privileged roles.
      role: registrationRole(),
      department: department || "Operations",
      avatar: name.trim().split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2),
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({ token: sign(user._id), user: userObj });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "An account with this email address already exists" });
    }
    next(err);
  }
});

// POST /auth/login
router.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail }).select("+password");
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const userObj = user.toObject();
    delete userObj.password;

    res.json({ token: sign(user._id), user: userObj });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
router.get("/auth/me", auth, (req, res) => {
  res.json(req.user);
});

// PATCH /auth/profile
router.patch("/auth/profile", auth, async (req, res, next) => {
  try {
    const { name, department, avatar } = req.body;
    const updates = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "Name is required" });
      updates.name = name.trim();
    }
    if (department !== undefined) {
      if (typeof department !== "string") return res.status(400).json({ message: "Department must be text" });
      updates.department = department.trim();
    }
    if (avatar !== undefined && typeof avatar === "string") updates.avatar = avatar.trim().slice(0, 80);

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-password");
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PATCH /auth/preferences
router.patch("/auth/preferences", auth, async (req, res, next) => {
  try {
    const { notificationsEnabled } = req.body;
    if (typeof notificationsEnabled !== "boolean") return res.status(400).json({ message: "notificationsEnabled must be a boolean" });
    const user = await User.findById(req.user._id);
    user.preferences = { ...user.preferences?.toObject?.(), notificationsEnabled };
    await user.save();
    res.json(user.toObject());
  } catch (err) {
    next(err);
  }
});

// PATCH /auth/password
router.patch("/auth/password", auth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== "string" || !currentPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({ message: "Provide your current password and a new password with at least 8 characters" });
    }
    const user = await User.findById(req.user._id).select("+password");
    if (!(await user.verifyPassword(currentPassword))) return res.status(400).json({ message: "Current password is incorrect" });
    user.password = newPassword;
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
});

/* ==========================================================================
   PROJECT ROUTES
   ========================================================================== */

// GET /projects - list accessible projects
router.get("/projects", auth, async (req, res, next) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    })
      .populate("owner", "name email avatar")
      .populate("members", "name email avatar role department")
      .sort({ updatedAt: -1 });

    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// POST /projects - create project
router.post("/projects", auth, async (req, res, next) => {
  try {
    const { name, description, priority, status, startDate, endDate, members, color } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Project name is required" });
    }

    if (members !== undefined && (!Array.isArray(members) || members.some((id) => !mongoose.Types.ObjectId.isValid(id)))) {
      return res.status(400).json({ message: "Members must be valid user IDs" });
    }
    const memberIds = [...new Set([...(Array.isArray(members) ? members : []), req.user._id.toString()])];
    const validMembers = await User.countDocuments({ _id: { $in: memberIds } });
    if (validMembers !== memberIds.length) return res.status(400).json({ message: "One or more members do not exist" });

    // Ensure creator is included in members
    const memberSet = new Set(memberIds);
    memberSet.add(req.user._id.toString());

    const project = await Project.create({
      name: name.trim(),
      description: description || "",
      priority: priority || "Medium",
      status: status || "Planning",
      startDate: startDate || null,
      endDate: endDate || null,
      color: color || "#7c5cff",
      owner: req.user._id,
      members: Array.from(memberSet),
      progress: 0,
    });

    await logActivity({
      project: project._id,
      actor: req.user._id,
      action: "CREATED",
      details: { title: project.name, type: "Project" },
    });

    const populated = await Project.findById(project._id)
      .populate("owner", "name email avatar")
      .populate("members", "name email avatar role department");

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

// GET /projects/:id
router.get("/projects/:id", auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await Project.findById(req.params.id)
      .populate("owner", "name email avatar")
      .populate("members", "name email role avatar department");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const hasAccess =
      project.owner._id.equals(req.user._id) ||
      project.members.some((m) => m._id.equals(req.user._id));

    if (!hasAccess) {
      return res.status(403).json({ message: "You do not have permission to view this project" });
    }

    res.json(project);
  } catch (err) {
    next(err);
  }
});

// PATCH /projects/:id
router.patch("/projects/:id", auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isOwner = project.owner.equals(req.user._id);
    const isMember = project.members.some((m) => m.equals(req.user._id));
    const canManage = canEditProject({ isOwner, isMember, role: req.user.role });
    if (!isMember && !isOwner) {
      return res.status(403).json({ message: "You do not have permission to modify this project" });
    }
    if (!canManage) return res.status(403).json({ message: "Only project owners and project managers can edit project details" });

    if (req.body.members !== undefined) {
      if (!canManage) return res.status(403).json({ message: "Only project owners and managers can change project members" });
      if (!Array.isArray(req.body.members) || req.body.members.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
        return res.status(400).json({ message: "Members must be valid user IDs" });
      }
      const memberIds = [...new Set([...req.body.members, project.owner.toString()])];
      const validMembers = await User.countDocuments({ _id: { $in: memberIds } });
      if (validMembers !== memberIds.length) return res.status(400).json({ message: "One or more members do not exist" });
      req.body.members = memberIds;
    }
    if (req.body.progress !== undefined && !canManage) {
      return res.status(403).json({ message: "Only project owners and managers can change project progress" });
    }

    const previousStatus = project.status;
    const allowed = ["name", "description", "startDate", "endDate", "priority", "status", "members", "color", "progress"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        project[key] = req.body[key];
      }
    }

    await project.save();

    if (req.body.status && req.body.status !== previousStatus) {
      await logActivity({
        project: project._id,
        actor: req.user._id,
        action: "STATUS_CHANGED",
        details: { from: previousStatus, to: req.body.status, type: "Project" },
      });
    }

    const updated = await Project.findById(project._id)
      .populate("owner", "name email avatar")
      .populate("members", "name email role avatar department");

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /projects/:id
router.delete("/projects/:id", auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!project.owner.equals(req.user._id)) {
      return res.status(403).json({ message: "Only the project owner can delete this project" });
    }

    // Cascade delete project tasks, comments, activities
    const projectTasks = await Task.find({ project: project._id });
    const taskIds = projectTasks.map((t) => t._id);

    await Comment.deleteMany({ task: { $in: taskIds } });
    await Activity.deleteMany({ project: project._id });
    await Task.deleteMany({ project: project._id });
    await Project.findByIdAndDelete(project._id);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/* ==========================================================================
   TASK ROUTES
   ========================================================================== */

// GET /tasks - list tasks with filtering, sorting & search
router.get("/tasks", auth, async (req, res, next) => {
  try {
    // 1. Get all project IDs accessible to the current user
    const accessibleProjects = await Project.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    }).select("_id");
    const accessibleProjectIds = accessibleProjects.map((p) => p._id);

    const filter = {
      $or: [
        { project: { $in: accessibleProjectIds } },
        { createdBy: req.user._id },
        { assignee: req.user._id },
      ],
    };

    // Specific project filter
    if (req.query.project) {
      if (!mongoose.Types.ObjectId.isValid(req.query.project)) {
        return res.status(400).json({ message: "Invalid project ID in query" });
      }
      filter.project = req.query.project;
    }

    // Status filter
    if (req.query.status && req.query.status !== "All") {
      filter.status = req.query.status;
    }

    // Priority filter
    if (req.query.priority && req.query.priority !== "All") {
      filter.priority = req.query.priority;
    }

    // Assignee filter
    if (req.query.assignee && req.query.assignee !== "All") {
      if (req.query.assignee === "unassigned") {
        filter.assignee = null;
      } else if (mongoose.Types.ObjectId.isValid(req.query.assignee)) {
        filter.assignee = req.query.assignee;
      }
    }

    // Search query
    if (req.query.search) {
      if (typeof req.query.search !== "string" || req.query.search.length > 80) {
        return res.status(400).json({ message: "Search query is too long" });
      }
      const escapedSearch = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [{ title: searchRegex }, { description: searchRegex }],
      });
    }

    // Sort order
    let sort = { updatedAt: -1 };
    if (req.query.sortBy === "dueDate") {
      sort = { dueDate: 1 };
    } else if (req.query.sortBy === "priority") {
      sort = { priority: -1 };
    } else if (req.query.sortBy === "createdAt") {
      sort = { createdAt: -1 };
    }

    const tasks = await Task.find(filter)
      .populate("assignee", "name email avatar department")
      .populate("project", "name color")
      .populate("createdBy", "name email")
      .sort(sort);

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// POST /tasks - create task
router.post("/tasks", auth, async (req, res, next) => {
  try {
    const { title, description, priority, dueDate, status, assignee, project: projectId } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Task title is required" });
    }
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Valid project ID is required" });
    }

    // Verify user has access to the project
    const hasProjectAccess = await checkProjectAccess(projectId, req.user._id);
    if (!hasProjectAccess) {
      return res.status(403).json({ message: "You do not have permission to add tasks to this project" });
    }

    // Validate assignee if provided
    let assigneeId = null;
    if (assignee) {
      if (!mongoose.Types.ObjectId.isValid(assignee)) return res.status(400).json({ message: "Invalid assignee" });
      const assigneeUser = await User.findOne({ _id: assignee, $or: [{ _id: req.user._id }, { _id: { $in: (await Project.findById(projectId).select("members")).members } }] });
      if (!assigneeUser) return res.status(400).json({ message: "Assignee must be a member of this project" });
      assigneeId = assigneeUser._id;
    }

    const task = await Task.create({
      title: title.trim(),
      description: description || "",
      priority: priority || "Medium",
      status: status || "Todo",
      dueDate: dueDate ? new Date(dueDate) : null,
      assignee: assigneeId,
      project: projectId,
      createdBy: req.user._id,
    });

    await updateProjectProgress(projectId);

    await logActivity({
      project: projectId,
      task: task._id,
      actor: req.user._id,
      action: "CREATED",
      details: { title: task.title, status: task.status, priority: task.priority },
    });

    // Notify assignee if someone else assigned them
    if (assigneeId && !assigneeId.equals(req.user._id)) {
      await Notification.create({
        recipient: assigneeId,
        actor: req.user._id,
        type: "TASK_ASSIGNED",
        title: "New Task Assigned",
        message: `${req.user.name} assigned you to "${task.title}".`,
        link: `/tasks`,
      });
    }

    const populated = await Task.findById(task._id)
      .populate("assignee", "name email avatar department")
      .populate("project", "name color")
      .populate("createdBy", "name email");

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

// GET /tasks/:id
router.get("/tasks/:id", auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findById(req.params.id)
      .populate("assignee", "name email avatar department")
      .populate("project", "name color owner members")
      .populate("createdBy", "name email");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isAuthorized =
      task.createdBy?._id.equals(req.user._id) ||
      task.assignee?._id?.equals(req.user._id) ||
      task.project?.owner?.equals(req.user._id) ||
      task.project?.members?.some((m) => m.equals(req.user._id));

    if (!isAuthorized) {
      return res.status(403).json({ message: "You do not have access to this task" });
    }

    res.json(task);
  } catch (err) {
    next(err);
  }
});

// PATCH /tasks/:id
router.patch("/tasks/:id", auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findById(req.params.id).populate("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check authorization: must have access to task project or be creator/assignee
    const isProjectMemberOrOwner = await checkProjectAccess(task.project._id, req.user._id);
    const isCreatorOrAssignee =
      task.createdBy.equals(req.user._id) || (task.assignee && task.assignee.equals(req.user._id));

    if (!isProjectMemberOrOwner && !isCreatorOrAssignee) {
      return res.status(403).json({ message: "You do not have permission to update this task" });
    }

    const prevStatus = task.status;
    const prevPriority = task.priority;
    const prevAssignee = task.assignee?.toString();

    // Allowed updates
    if (req.body.title !== undefined) task.title = req.body.title.trim();
    if (req.body.description !== undefined) task.description = req.body.description;
    if (req.body.priority !== undefined) task.priority = req.body.priority;
    if (req.body.status !== undefined) task.status = req.body.status;
    if (req.body.dueDate !== undefined) task.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    if (req.body.assignee !== undefined) {
      if (req.body.assignee) {
        if (!mongoose.Types.ObjectId.isValid(req.body.assignee)) return res.status(400).json({ message: "Invalid assignee" });
        const memberIds = task.project.members || [];
        if (!memberIds.some((memberId) => memberId.equals(req.body.assignee))) {
          return res.status(400).json({ message: "Assignee must be a member of this project" });
        }
        task.assignee = req.body.assignee;
      } else {
        task.assignee = null;
      }
    }

    await task.save();

    // If status changed, recalculate project progress and log activity
    if (req.body.status && req.body.status !== prevStatus) {
      await updateProjectProgress(task.project._id);
      await logActivity({
        project: task.project._id,
        task: task._id,
        actor: req.user._id,
        action: "STATUS_CHANGED",
        details: { from: prevStatus, to: req.body.status, title: task.title },
      });
    }

    // If priority changed
    if (req.body.priority && req.body.priority !== prevPriority) {
      await logActivity({
        project: task.project._id,
        task: task._id,
        actor: req.user._id,
        action: "PRIORITY_CHANGED",
        details: { from: prevPriority, to: req.body.priority, title: task.title },
      });
    }

    // If assignee changed
    if (req.body.assignee !== undefined && task.assignee?.toString() !== prevAssignee) {
      await logActivity({
        project: task.project._id,
        task: task._id,
        actor: req.user._id,
        action: "ASSIGNEE_CHANGED",
        details: { title: task.title },
      });

      if (task.assignee && !task.assignee.equals(req.user._id)) {
        await Notification.create({
          recipient: task.assignee,
          actor: req.user._id,
          type: "TASK_ASSIGNED",
          title: "Task Assigned",
          message: `${req.user.name} assigned you to "${task.title}".`,
          link: "/tasks",
        });
      }
    }

    const populated = await Task.findById(task._id)
      .populate("assignee", "name email avatar department")
      .populate("project", "name color")
      .populate("createdBy", "name email");

    res.json(populated);
  } catch (err) {
    next(err);
  }
});

// DELETE /tasks/:id
router.delete("/tasks/:id", auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findById(req.params.id).populate("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isProjectOwner = task.project?.owner?.equals(req.user._id);
    const isCreator = task.createdBy.equals(req.user._id);
    const isPM = req.user.role === "Project Manager" || req.user.role === "Admin";

    if (!isProjectOwner && !isCreator && !isPM) {
      return res.status(403).json({ message: "You do not have permission to delete this task" });
    }

    const projectId = task.project._id;
    await Comment.deleteMany({ task: task._id });
    await Activity.deleteMany({ task: task._id });
    await Task.findByIdAndDelete(task._id);

    await updateProjectProgress(projectId);

    await logActivity({
      project: projectId,
      actor: req.user._id,
      action: "DELETED",
      details: { title: task.title },
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// POST /tasks/bulk - bulk create tasks (e.g. from AI plan)
router.post("/tasks/bulk", auth, async (req, res, next) => {
  try {
    const { tasks, projectId } = req.body;
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Valid projectId is required" });
    }
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ message: "Non-empty tasks array is required" });
    }

    const hasAccess = await checkProjectAccess(projectId, req.user._id);
    if (!hasAccess) {
      return res.status(403).json({ message: "You do not have access to this project" });
    }

    if (tasks.length > 100) return res.status(400).json({ message: "A maximum of 100 tasks can be imported at once" });
    const project = await Project.findById(projectId).select("members");
    const projectMemberIds = new Set((project?.members || []).map(String));
    const tasksToCreate = tasks.map((t) => ({
      title: t.title?.trim() || "Untitled Subtask",
      description: t.description || "",
      priority: ["Low", "Medium", "High", "Critical"].includes(t.priority) ? t.priority : "Medium",
      dueDate: t.dueDate ? new Date(t.dueDate) : null,
      status: ["Todo", "In Progress", "Review", "Completed"].includes(t.status) ? t.status : "Todo",
      assignee: t.assignee && mongoose.Types.ObjectId.isValid(t.assignee) && projectMemberIds.has(String(t.assignee)) ? t.assignee : null,
      project: projectId,
      createdBy: req.user._id,
    }));

    const createdTasks = await Task.insertMany(tasksToCreate);
    await updateProjectProgress(projectId);

    await logActivity({
      project: projectId,
      actor: req.user._id,
      action: "CREATED",
      details: { count: createdTasks.length, note: "Bulk tasks imported" },
    });

    const populated = await Task.find({ _id: { $in: createdTasks.map((t) => t._id) } })
      .populate("assignee", "name avatar email")
      .populate("project", "name color");

    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

/* ==========================================================================
   COMMENTS ROUTES (P2)
   ========================================================================== */

// GET /tasks/:id/comments
router.get("/tasks/:id/comments", auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const hasAccess = await checkProjectAccess(task.project, req.user._id);
    if (!hasAccess && !task.createdBy.equals(req.user._id) && !task.assignee?.equals(req.user._id)) {
      return res.status(403).json({ message: "You do not have access to this task" });
    }

    const comments = await Comment.find({ task: task._id })
      .populate("author", "name email avatar role")
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (err) {
    next(err);
  }
});

// POST /tasks/:id/comments
router.post("/tasks/:id/comments", auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const { content } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ message: "Comment content cannot be empty" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const hasAccess = await checkProjectAccess(task.project, req.user._id);
    if (!hasAccess && !task.createdBy.equals(req.user._id) && !task.assignee?.equals(req.user._id)) {
      return res.status(403).json({ message: "You do not have permission to comment on this task" });
    }

    const comment = await Comment.create({
      task: task._id,
      author: req.user._id,
      content: content.trim(),
    });

    await logActivity({
      project: task.project,
      task: task._id,
      actor: req.user._id,
      action: "COMMENT_ADDED",
      details: { title: task.title },
    });

    // Notify task assignee if someone else comments
    if (task.assignee && !task.assignee.equals(req.user._id)) {
      await Notification.create({
        recipient: task.assignee,
        actor: req.user._id,
        type: "COMMENT_ADDED",
        title: "New Task Comment",
        message: `${req.user.name} commented on "${task.title}".`,
        link: `/tasks`,
      });
    }

    const populated = await Comment.findById(comment._id).populate("author", "name email avatar role");
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

// DELETE /comments/:commentId
router.delete("/comments/:commentId", auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.commentId)) {
      return res.status(400).json({ message: "Invalid comment ID" });
    }

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (!comment.author.equals(req.user._id) && req.user.role !== "Admin") {
      return res.status(403).json({ message: "You can only delete your own comments" });
    }

    await Comment.findByIdAndDelete(comment._id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/* ==========================================================================
   ACTIVITY ROUTES (P2)
   ========================================================================== */

// GET /tasks/:id/activity
router.get("/tasks/:id/activity", auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const activities = await Activity.find({ task: task._id })
      .populate("actor", "name email avatar role")
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(activities);
  } catch (err) {
    next(err);
  }
});

// GET /projects/:id/activity
router.get("/projects/:id/activity", auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const hasAccess = await checkProjectAccess(req.params.id, req.user._id);
    if (!hasAccess) {
      return res.status(403).json({ message: "You do not have access to this project's activity" });
    }

    const activities = await Activity.find({ project: req.params.id })
      .populate("actor", "name email avatar role")
      .populate("task", "title")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(activities);
  } catch (err) {
    next(err);
  }
});

/* ==========================================================================
   NOTIFICATIONS ROUTES (P2)
   ========================================================================== */

// GET /notifications
router.get("/notifications", auth, async (req, res, next) => {
  try {
    if (req.user.preferences?.notificationsEnabled === false) return res.json({ notifications: [], unreadCount: 0 });
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate("actor", "name email avatar")
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

// PATCH /notifications/:id/read
router.patch("/notifications/:id/read", auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (err) {
    next(err);
  }
});

// POST /notifications/read-all
router.post("/notifications/read-all", auth, async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
});

/* ==========================================================================
   DASHBOARD & METRICS ROUTES (P1)
   ========================================================================== */

router.get("/dashboard", auth, async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Fetch user accessible projects
    let userProjects = await Project.find({
      $or: [{ owner: userId }, { members: userId }],
    })
      .populate("owner", "name email avatar")
      .populate("members", "name email avatar role department")
      .sort({ updatedAt: -1 });

    if (req.query.project) {
      if (!mongoose.Types.ObjectId.isValid(req.query.project)) return res.status(400).json({ message: "Invalid project ID" });
      userProjects = userProjects.filter((project) => project._id.equals(req.query.project));
      if (!userProjects.length) return res.status(404).json({ message: "Project not found in your workspace" });
    }

    const projectIds = userProjects.map((p) => p._id);

    // 2. Fetch tasks for these projects
    const userTasks = await Task.find({
      $or: [
        { project: { $in: projectIds } },
        { createdBy: userId },
        { assignee: userId },
      ],
    })
      .populate("assignee", "name avatar email")
      .populate("project", "name color");

    // 3. Accurate real metrics calculation (no hardcoded mock figures)
    const now = new Date();
    const totalTasks = userTasks.length;
    const completedTasks = userTasks.filter((t) => t.status === "Completed").length;
    const inProgressTasks = userTasks.filter((t) => t.status === "In Progress").length;
    const pendingTasks = totalTasks - completedTasks;
    const overdueTasks = userTasks.filter(
      (t) => t.status !== "Completed" && t.dueDate && new Date(t.dueDate) < now
    ).length;

    const totalProjects = userProjects.length;
    const activeProjects = userProjects.filter((p) => p.status === "Active").length;
    const delayedProjects = userProjects.filter((p) => ["Delayed", "On Hold"].includes(p.status)).length;

    // Delivery pulse / health score:
    // If tasks exist, based on % of completed tasks. If no tasks, based on active/completed projects.
    let healthScore = 0;
    if (totalTasks > 0) {
      healthScore = Math.round((completedTasks / totalTasks) * 100);
    } else if (totalProjects > 0) {
      const activeOrDone = userProjects.filter((p) => ["Active", "Completed"].includes(p.status)).length;
      healthScore = Math.round((activeOrDone / totalProjects) * 100);
    }

    // Status counts for projects
    const statusCounts = {
      Active: userProjects.filter((p) => p.status === "Active").length,
      Planning: userProjects.filter((p) => p.status === "Planning").length,
      Completed: userProjects.filter((p) => p.status === "Completed").length,
      Delayed: userProjects.filter((p) => p.status === "Delayed").length,
      "On Hold": userProjects.filter((p) => p.status === "On Hold").length,
    };

    // Task status counts
    const taskStatusCounts = {
      Todo: userTasks.filter((t) => t.status === "Todo").length,
      "In Progress": inProgressTasks,
      Review: userTasks.filter((t) => t.status === "Review").length,
      Completed: completedTasks,
    };

    // Real Productivity: tasks completed in the last 7 days grouped by weekday
    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const productivity = weekdayNames.map((day) => ({ name: day, value: 0 }));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCompletedTasks = userTasks.filter(
      (t) => t.status === "Completed" && t.updatedAt && new Date(t.updatedAt) >= sevenDaysAgo
    );

    recentCompletedTasks.forEach((t) => {
      const dayIndex = new Date(t.updatedAt).getDay();
      const dayName = weekdayNames[dayIndex];
      const dayObj = productivity.find((d) => d.name === dayName);
      if (dayObj) dayObj.value += 1;
    });

    res.json({
      metrics: {
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
        totalProjects,
        activeProjects,
        delayedProjects,
        healthScore,
      },
      statusCounts,
      taskStatusCounts,
      projects: userProjects,
      tasks: userTasks,
      productivity,
    });
  } catch (err) {
    next(err);
  }
});

/* ==========================================================================
   AI INTELLIGENCE ROUTES (P1)
   ========================================================================== */

// POST /ai/generate

router.post("/ai/generate", auth, async (req, res, next) => {
  try {
    const { tool, prompt, projectId } = req.body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim() || prompt.length > 500) {
      return res.status(400).json({
        message: "Prompt must contain between 1 and 500 characters",
      });
    }

    const allowedTools = ["Project planner", "Task breakdown", "Sprint planner", "Risk analyzer", "Weekly report"];
    if (!allowedTools.includes(tool)) return res.status(400).json({ message: "Select a supported AI tool" });

    let workspaceContext = "";
    if (projectId) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json({ message: "Invalid project ID" });
      const project = await Project.findById(projectId).populate("members", "name role");
      if (!project) return res.status(404).json({ message: "Project not found" });
      const hasAccess = project.owner.equals(req.user._id) || project.members.some((member) => member._id.equals(req.user._id));
      if (!hasAccess) return res.status(403).json({ message: "You do not have access to this project" });
      const tasks = await Task.find({ project: project._id })
        .populate("assignee", "name")
        .select("title description status priority dueDate updatedAt assignee")
        .sort({ updatedAt: -1 })
        .limit(150);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const reportTasks = tool === "Weekly report" ? tasks.filter((task) => task.updatedAt >= weekStart) : tasks;
      workspaceContext = JSON.stringify({
        reportingWindow: tool === "Weekly report" ? `Records last updated on or after ${weekStart.toISOString()}` : undefined,
        project: { name: project.name, description: project.description, status: project.status, progress: project.progress, startDate: project.startDate, endDate: project.endDate, members: project.members.map((member) => ({ name: member.name, role: member.role })) },
        taskUpdateCount: reportTasks.length,
        tasks: reportTasks.map((task) => ({ title: task.title, description: task.description, status: task.status, priority: task.priority, dueDate: task.dueDate, updatedAt: task.updatedAt, assignee: task.assignee?.name || null }))
      });
    } else if (tool === "Weekly report") {
      return res.status(400).json({ message: "Select a project so the weekly report can use recorded project data" });
    }

    console.log("[AI] Generation requested:", tool || "Project planner");

    const plan = await generatePlan(tool, prompt.trim(), workspaceContext);

    console.log("[AI] Generation succeeded");

    return res.json(plan);
  } catch (err) {
    // Log the actual error on the backend, without exposing secrets.
    console.error("[AI] Generation failed:", {
      message: err.message,
      status: err.status,
      code: err.code,
    });

    return res.status(err.status || 500).json({
      message: err.message || "AI generation failed",
    });
  }
});


// GET /ai/summary
router.get("/ai/summary", auth, async (req, res, next) => {
  try {
    let userProjects = await Project.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    });
    if (req.query.project) {
      if (!mongoose.Types.ObjectId.isValid(req.query.project)) return res.status(400).json({ message: "Invalid project ID" });
      userProjects = userProjects.filter((project) => project._id.equals(req.query.project));
      if (!userProjects.length) return res.status(404).json({ message: "Project not found in your workspace" });
    }
    const projectIds = userProjects.map((p) => p._id);
    const userTasks = await Task.find({ project: { $in: projectIds } });

    const totalProjects = userProjects.length;
    const completedTasks = userTasks.filter((t) => t.status === "Completed").length;
    const pendingTasks = userTasks.length - completedTasks;
    const delayedProjects = userProjects.filter((p) => ["Delayed", "On Hold"].includes(p.status)).length;

    const summaryText = await generateSummary({
      totalProjects,
      completedTasks,
      pendingTasks,
      delayedProjects,
    });

    res.json({ summary: summaryText });
  } catch (err) {
    res.json({
      summary: "AI summary generation is currently offline. Please configure GROQ_API_KEY or GEMINI_API_KEY in server/.env.",
    });
  }
});

/* ==========================================================================
   TEAM DIRECTORY ROUTES
   ========================================================================== */

// GET /users
router.get("/users", auth, async (req, res, next) => {
  try {
    const projects = await Project.find({ $or: [{ owner: req.user._id }, { members: req.user._id }] }).select("_id members owner");
    const projectIds = projects.map((project) => project._id);
    const taskMetrics = projectIds.length
      ? await Task.aggregate([
          { $match: { project: { $in: projectIds }, assignee: { $ne: null } } },
          { $group: {
            _id: "$assignee",
            total: { $sum: 1 },
            done: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
            active: { $sum: { $cond: [{ $ne: ["$status", "Completed"] }, 1, 0] } },
            overdue: { $sum: { $cond: [{ $and: [{ $ne: ["$status", "Completed"] }, { $ne: ["$dueDate", null] }, { $lt: ["$dueDate", new Date()] }] }, 1, 0] } },
          } },
        ])
      : [];
    // Include people assigned to visible project work, even if older seed data
    // did not also add them to that project's members array.
    const memberIds = [...new Set([
      req.user._id.toString(),
      ...projects.flatMap((project) => [project.owner, ...project.members].map(String)),
      ...taskMetrics.map((entry) => entry._id.toString()),
    ])];
    const users = await User.find({ _id: { $in: memberIds } }).select("name role department avatar").sort({ name: 1 });
    const colors = ["#7c5cff", "#ec7a9c", "#42bfa5", "#f3a44a", "#4f8df7"];
    const metricsByUser = new Map(taskMetrics.map((entry) => [entry._id.toString(), entry]));

    const populatedUsers = users.map((u, idx) => {
        const metrics = formatTeamTaskMetrics(metricsByUser.get(u._id.toString()));

        return {
          _id: u._id,
          name: u.name,
          role: u.role,
          department: u.department,
          initials: u.avatar || u.name.split(" ").map((n) => n[0]).join("").toUpperCase(),
          color: colors[idx % colors.length],
          ...metrics,
        };
      });

    res.json(populatedUsers);
  } catch (err) {
    next(err);
  }
});

// GET /users/:id/tasks - get tasks assigned to a specific user within accessible projects
router.get("/users/:id/tasks", auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const accessibleProjects = await Project.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    }).select("_id");
    const projectIds = accessibleProjects.map((p) => p._id);

    const tasks = await Task.find({
      assignee: req.params.id,
      project: { $in: projectIds },
    })
      .populate("project", "name color")
      .populate("createdBy", "name")
      .sort({ updatedAt: -1 });

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// PATCH /users/:id - update a team member's role or department
router.patch("/users/:id", auth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const isSelf = req.user._id.equals(req.params.id);
    const isPMOrAdmin = ["Project Manager", "Admin"].includes(req.user.role);

    if (!isSelf && !isPMOrAdmin) {
      return res.status(403).json({ message: "You do not have permission to modify team members" });
    }

    const { role, department, name } = req.body;
    const updates = {};
    if (name && typeof name === "string") updates.name = name.trim();
    if (department && typeof department === "string") updates.department = department.trim();
    if (role !== undefined) {
      if (!canChangeRole(req.user.role, role)) {
        return res.status(403).json({ message: "Only administrators can change team roles" });
      }
      updates.role = role;
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-password");
    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/* ==========================================================================
   GLOBAL SEARCH ROUTE
   ========================================================================== */

// GET /search?q=...
router.get("/search", auth, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== "string" || !q.trim()) {
      return res.json({ projects: [], tasks: [] });
    }

    if (q.length > 80) return res.status(400).json({ message: "Search query is too long" });
    const escapedQuery = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedQuery, "i");

    const projects = await Project.find({
      name: regex,
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    })
      .limit(6)
      .populate("members", "name email avatar");

    const tasks = await Task.find({
      $or: [
        { title: regex },
        { description: regex },
      ],
      $and: [
        {
          $or: [
            { createdBy: req.user._id },
            { assignee: req.user._id },
          ],
        },
      ],
    })
      .limit(8)
      .populate("assignee", "name avatar")
      .populate("project", "name color");

    res.json({ projects, tasks });
  } catch (err) {
    next(err);
  }
});

export default router;
