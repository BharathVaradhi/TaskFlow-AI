import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  Trash2,
  Send,
  MessageSquare,
  Activity as ActivityIcon,
  CheckCircle,
  Save,
  Tag
} from "lucide-react";
import taskService from "../services/taskService";

export default function TaskModal({
  task,
  projects = [],
  users = [],
  currentUser,
  onClose,
  onUpdate,
  onDelete
}) {
  const [activeTab, setActiveTab] = useState("details"); // 'details' | 'comments' | 'activity'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Form editable state
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState(task?.status || "Todo");
  const [priority, setPriority] = useState(task?.priority || "Medium");
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? new Date(task.dueDate).toISOString().substring(0, 10) : ""
  );
  const [assignee, setAssignee] = useState(task?.assignee?._id || task?.assignee || "");
  const [hasChanges, setHasChanges] = useState(false);

  // Comments state
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Activity state
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    if (task?._id) {
      loadComments();
      loadActivities();
    }
  }, [task?._id]);

  const loadComments = async () => {
    try {
      const data = await taskService.getComments(task._id);
      setComments(data);
    } catch (err) {
      console.error("Failed to load comments", err);
    }
  };

  const loadActivities = async () => {
    try {
      setActivityLoading(true);
      const data = await taskService.getActivities(task._id);
      setActivities(data);
    } catch (err) {
      console.error("Failed to load activities", err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const updated = await taskService.update(task._id, {
        title: title.trim(),
        description,
        status,
        priority,
        dueDate: dueDate || null,
        assignee: assignee || null
      });
      setHasChanges(false);
      onUpdate(updated);
      loadActivities();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update task");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      await taskService.delete(task._id);
      onDelete(task._id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete task");
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      const created = await taskService.addComment(task._id, newComment.trim());
      setComments([...comments, created]);
      setNewComment("");
      loadActivities();
    } catch (err) {
      setError("Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  // Overdue check
  const isOverdue =
    dueDate &&
    new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0)) &&
    status !== "Completed";

  return (
    <div className="modal-wrap" style={{ zIndex: 1050 }}>
      <div className="scrim" onClick={onClose} />
      <motion.div
        className="modal card task-detail-modal"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div
          className="modal-head"
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              className={`badge ${status.toLowerCase().replace(" ", "-")}`}
              style={{ fontSize: "11px" }}
            >
              {status}
            </span>
            <span className={`priority ${priority.toLowerCase()}`} style={{ fontSize: "11px" }}>
              {priority} Priority
            </span>
            {isOverdue && (
              <span
                style={{
                  background: "#e35f55",
                  color: "#fff",
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <AlertTriangle size={12} /> Overdue
              </span>
            )}
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--line)",
            background: "var(--surface-2)",
            padding: "0 16px"
          }}
        >
          <button
            onClick={() => setActiveTab("details")}
            style={{
              padding: "10px 14px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "details" ? "2px solid var(--purple, #7357f4)" : "2px solid transparent",
              color: activeTab === "details" ? "var(--text)" : "var(--muted)",
              fontWeight: activeTab === "details" ? 600 : 400,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer"
            }}
          >
            <Tag size={14} /> Task Details
          </button>
          <button
            onClick={() => setActiveTab("comments")}
            style={{
              padding: "10px 14px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "comments" ? "2px solid var(--purple, #7357f4)" : "2px solid transparent",
              color: activeTab === "comments" ? "var(--text)" : "var(--muted)",
              fontWeight: activeTab === "comments" ? 600 : 400,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer"
            }}
          >
            <MessageSquare size={14} /> Comments ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            style={{
              padding: "10px 14px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "activity" ? "2px solid var(--purple, #7357f4)" : "2px solid transparent",
              color: activeTab === "activity" ? "var(--text)" : "var(--muted)",
              fontWeight: activeTab === "activity" ? 600 : 400,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer"
            }}
          >
            <ActivityIcon size={14} /> Activity ({activities.length})
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              margin: "12px 20px 0 20px",
              padding: "8px 12px",
              background: "rgba(227, 95, 85, 0.12)",
              color: "#e35f55",
              borderRadius: "6px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {activeTab === "details" && (
            <form onSubmit={handleSave} id="task-edit-form" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <label>
                Task Title
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setHasChanges(true);
                  }}
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                    background: "var(--surface-2)",
                    color: "var(--text)"
                  }}
                />
              </label>

              <label>
                Description
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="Add more details or acceptance criteria..."
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    resize: "vertical"
                  }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <label>
                  Status
                  <select
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value);
                      setHasChanges(true);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--line)",
                      background: "var(--surface-2)",
                      color: "var(--text)"
                    }}
                  >
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </label>

                <label>
                  Priority
                  <select
                    value={priority}
                    onChange={(e) => {
                      setPriority(e.target.value);
                      setHasChanges(true);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--line)",
                      background: "var(--surface-2)",
                      color: "var(--text)"
                    }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <label>
                  Due Date
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      setHasChanges(true);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--line)",
                      background: "var(--surface-2)",
                      color: "var(--text)"
                    }}
                  />
                </label>

                <label>
                  Assignee
                  <select
                    value={assignee}
                    onChange={(e) => {
                      setAssignee(e.target.value);
                      setHasChanges(true);
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--line)",
                      background: "var(--surface-2)",
                      color: "var(--text)"
                    }}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.role || "Member"})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                Project: <strong>{task.project?.name || "Independent"}</strong> · Created by{" "}
                {task.createdBy?.name || "Team Member"}
              </div>
            </form>
          )}

          {activeTab === "comments" && (
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                {comments.length === 0 ? (
                  <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "13px", padding: "20px 0" }}>
                    No comments yet. Start the conversation below!
                  </p>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c._id}
                      style={{
                        padding: "10px 12px",
                        background: "var(--surface-2)",
                        borderRadius: "8px",
                        border: "1px solid var(--line)"
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px"
                        }}
                      >
                        <strong style={{ fontSize: "12px", color: "var(--text)" }}>
                          {c.author?.name || "Collaborator"}
                        </strong>
                        <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                          {new Date(c.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })} at{" "}
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p style={{ fontSize: "13px", margin: 0, color: "var(--text)", lineHeight: "1.5" }}>
                        {c.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--line)",
                    background: "var(--surface-2)",
                    color: "var(--text)",
                    fontSize: "13px"
                  }}
                />
                <button
                  type="submit"
                  className="primary"
                  disabled={commentLoading || !newComment.trim()}
                  style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <Send size={14} /> Send
                </button>
              </form>
            </div>
          )}

          {activeTab === "activity" && (
            <div>
              {activityLoading ? (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>
                  <span className="spinner" /> Loading history...
                </div>
              ) : activities.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "13px", padding: "20px 0" }}>
                  No recorded activities yet.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {activities.map((a) => (
                    <div
                      key={a._id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        fontSize: "12px",
                        borderLeft: "2px solid var(--line)",
                        paddingLeft: "12px"
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <strong>{a.actor?.name || "System"}</strong>{" "}
                        <span style={{ color: "var(--muted)" }}>
                          {a.action === "CREATED" && "created this task"}
                          {a.action === "STATUS_CHANGED" && `changed status to ${a.details?.to || "updated"}`}
                          {a.action === "PRIORITY_CHANGED" && `changed priority to ${a.details?.to || "updated"}`}
                          {a.action === "ASSIGNEE_CHANGED" && `updated task assignee`}
                          {a.action === "COMMENT_ADDED" && `added a comment`}
                          {a.action === "UPDATED" && `updated task details`}
                          {a.action === "DELETED" && `deleted task`}
                        </span>
                        <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                          {new Date(a.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--line)",
            background: "var(--surface)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          {confirmDelete ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#e35f55", fontWeight: 600 }}>Delete this task permanently?</span>
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  background: "#e35f55",
                  color: "#fff",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Yes, Delete
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setConfirmDelete(false)}
                style={{ padding: "5px 10px", fontSize: "12px" }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              style={{
                background: "none",
                border: "none",
                color: "#e35f55",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "13px",
                cursor: "pointer",
                padding: "6px"
              }}
            >
              <Trash2 size={15} /> Delete Task
            </button>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" className="secondary" onClick={onClose}>
              Close
            </button>
            {activeTab === "details" && (
              <button
                type="submit"
                form="task-edit-form"
                className="primary"
                disabled={loading || !hasChanges}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Save size={15} /> {loading ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
