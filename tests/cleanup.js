import mongoose from "../server/node_modules/mongoose/index.js";
import { Activity, Comment, Notification, Project, Task, User } from "../server/src/models.js";
import { testDb } from "./safety.mjs";

export async function cleanupRun({ emails = [], userIds = [], projectIds = [], taskIds = [] }) {
  if (!testDb) throw new Error("Cleanup is forbidden without a verified disposable database.");
  await mongoose.connect(testDb.uri, { serverSelectionTimeoutMS: 8000 });
  try {
    const ids = (values) => values.map((id) => new mongoose.Types.ObjectId(id));
    const users = ids(userIds);
    const projects = ids(projectIds);
    const tasks = ids(taskIds);
    if (projects.length) {
      const owned = await Project.find({ owner: { $in: users } }).distinct("_id");
      for (const id of owned) if (!projects.some((item) => item.equals(id))) projects.push(id);
    }
    if (projects.length) {
      const foundTasks = await Task.find({ project: { $in: projects } }).distinct("_id");
      for (const id of foundTasks) if (!tasks.some((item) => item.equals(id))) tasks.push(id);
    }
    if (tasks.length) {
      await Comment.deleteMany({ task: { $in: tasks } });
      await Activity.deleteMany({ task: { $in: tasks } });
      await Task.deleteMany({ _id: { $in: tasks } });
    }
    if (projects.length) {
      await Activity.deleteMany({ project: { $in: projects } });
      await Task.deleteMany({ project: { $in: projects } });
      await Project.deleteMany({ _id: { $in: projects } });
    }
    if (users.length) {
      await Notification.deleteMany({ $or: [{ recipient: { $in: users } }, { actor: { $in: users } }] });
    }
    if (emails.length) await User.deleteMany({ email: { $in: emails } });
  } finally {
    await mongoose.disconnect();
  }
}
