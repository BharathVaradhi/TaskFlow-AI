import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ["Admin", "Project Manager", "Team Member"], default: "Team Member" },
  avatar: String,
  department: String
}, { timestamps: true });
userSchema.pre("save", async function next() {
  if (this.isModified("password")) this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.verifyPassword = function (password) { return bcrypt.compare(password, this.password); };

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  startDate: Date,
  endDate: Date,
  priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
  status: { type: String, enum: ["Planning", "Active", "On Hold", "Completed", "Delayed"], default: "Planning" },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  progress: { type: Number, min: 0, max: 100, default: 0 }
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: String,
  priority: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
  dueDate: Date,
  status: { type: String, enum: ["Todo", "In Progress", "Review", "Completed"], default: "Todo" },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
export const Project = mongoose.model("Project", projectSchema);
export const Task = mongoose.model("Task", taskSchema);
