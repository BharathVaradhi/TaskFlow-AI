import { Router } from "express";
import jwt from "jsonwebtoken";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Project, Task, User } from "./models.js";

const router = Router();
const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET || "development-only-secret", { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "Authentication required" });
    const { id } = jwt.verify(token, process.env.JWT_SECRET || "development-only-secret");
    req.user = await User.findById(id);
    if (!req.user) return res.status(401).json({ message: "User no longer exists" });
    next();
  } catch { res.status(401).json({ message: "Invalid or expired token" }); }
};

router.post("/auth/register", async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({ token: sign(user.id), user });
  } catch (e) { next(e); }
});
router.post("/auth/login", async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email }).select("+password");
    if (!user || !(await user.verifyPassword(req.body.password))) return res.status(401).json({ message: "Invalid email or password" });
    user.password = undefined;
    res.json({ token: sign(user.id), user });
  } catch (e) { next(e); }
});
router.get("/auth/me", auth, (req, res) => res.json(req.user));

router.route("/projects").get(auth, async (req, res, next) => {
  try { res.json(await Project.find({ $or: [{ owner: req.user.id }, { members: req.user.id }] }).populate("members", "name email avatar")); } catch (e) { next(e); }
}).post(auth, async (req, res, next) => {
  try { res.status(201).json(await Project.create({ ...req.body, owner: req.user.id })); } catch (e) { next(e); }
});
router.route("/projects/:id").get(auth, async (req, res, next) => {
  try { res.json(await Project.findById(req.params.id).populate("members", "name email role avatar")); } catch (e) { next(e); }
}).patch(auth, async (req, res, next) => {
  try { res.json(await Project.findOneAndUpdate({ _id: req.params.id, owner: req.user.id }, req.body, { new: true, runValidators: true })); } catch (e) { next(e); }
}).delete(auth, async (req, res, next) => {
  try { await Project.findOneAndDelete({ _id: req.params.id, owner: req.user.id }); res.status(204).end(); } catch (e) { next(e); }
});

router.route("/tasks").get(auth, async (req, res, next) => {
  try {
    const query = req.query.project ? { project: req.query.project } : {};
    res.json(await Task.find(query).populate("assignee", "name avatar").populate("project", "name"));
  } catch (e) { next(e); }
}).post(auth, async (req, res, next) => {
  try { res.status(201).json(await Task.create({ ...req.body, createdBy: req.user.id })); } catch (e) { next(e); }
});
router.route("/tasks/:id").patch(auth, async (req, res, next) => {
  try { res.json(await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })); } catch (e) { next(e); }
}).delete(auth, async (req, res, next) => {
  try { await Task.findByIdAndDelete(req.params.id); res.status(204).end(); } catch (e) { next(e); }
});

router.get("/dashboard", auth, async (_req, res, next) => {
  try {
    const [projects, tasks] = await Promise.all([
      Project.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Task.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
    ]);
    res.json({ projects, tasks });
  } catch (e) { next(e); }
});

router.post("/ai/generate", auth, async (req, res, next) => {
  try {
    if (!process.env.GEMINI_API_KEY) return res.status(503).json({ message: "Gemini API key is not configured" });
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const instruction = `You are TaskFlow AI, an expert project manager. Return only valid JSON. Tool: ${req.body.tool}. Input: ${req.body.prompt}. Include practical phases, milestones, roles, risks, dependencies, and estimates where relevant.`;
    const result = await model.generateContent(instruction);
    const text = result.response.text().replace(/^```json|```$/g, "").trim();
    res.json(JSON.parse(text));
  } catch (e) { next(e); }
});

export default router;
