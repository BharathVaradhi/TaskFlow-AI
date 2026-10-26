import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ["Admin", "Project Manager", "Team Member"], default: "Team Member" },
  avatar: String,
  department: String,
  preferences: {
    notificationsEnabled: { type: Boolean, default: true }
  }
}, { timestamps: true });

userSchema.pre("save", async function next() {
  if (this.isModified("password")) this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.verifyPassword = function (password) {
  if (!password || !this.password) return false;
  return bcrypt.compare(password, this.password);
};

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  startDate: Date,
  endDate: Date,
  priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
  status: { type: String, enum: ["Planning", "Active", "On Hold", "Completed", "Delayed"], default: "Planning" },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  color: { type: String, default: "#7c5cff" }
}, { timestamps: true });

projectSchema.index({ owner: 1 });
projectSchema.index({ members: 1 });

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
  dueDate: Date,
  status: { type: String, enum: ["Todo", "In Progress", "Review", "Completed"], default: "Todo" },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

taskSchema.index({ project: 1 });
taskSchema.index({ assignee: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ status: 1 });

const commentSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 }
}, { timestamps: true });

commentSchema.index({ task: 1, createdAt: 1 });

const activitySchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: {
    type: String,
    enum: ["CREATED", "STATUS_CHANGED", "PRIORITY_CHANGED", "ASSIGNEE_CHANGED", "UPDATED", "DELETED", "COMMENT_ADDED"],
    required: true
  },
  details: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ task: 1, createdAt: -1 });

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: {
    type: String,
    enum: ["TASK_ASSIGNED", "STATUS_CHANGED", "COMMENT_ADDED", "PROJECT_ADDED", "SYSTEM"],
    default: "SYSTEM"
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, default: "" },
  read: { type: Boolean, default: false, index: true }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export const User = mongoose.model("User", userSchema);
export const Project = mongoose.model("Project", projectSchema);
export const Task = mongoose.model("Task", taskSchema);
export const Comment = mongoose.model("Comment", commentSchema);
export const Activity = mongoose.model("Activity", activitySchema);
export const Notification = mongoose.model("Notification", notificationSchema);
