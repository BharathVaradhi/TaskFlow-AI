import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Users,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Play,
  Plus,
  Check,
  Clock3,
  MoreHorizontal,
  Sparkles,
  BrainCircuit,
  Activity,
  Trash2,
  History
} from "lucide-react";
import projectService from "../services/projectService";
import taskService from "../services/taskService";
import aiService from "../services/aiService";
import QuickModal from "./QuickModal";
import TaskModal from "./TaskModal";

export default function ProjectDetails({ users = [], currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // AI recommendations state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiImporting, setAiImporting] = useState(false);
  const [aiMode, setAiMode] = useState("risk"); // "risk" | "breakdown"

  // Modal and assignment states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState("");
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectError, setProjectError] = useState("");

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    setLoading(true);
    setError("");
    try {
      const projData = await projectService.getById(id);
      setProject(projData);

      const taskData = await taskService.getAll(id);
      setTasks(taskData);

      try {
        const actData = await projectService.getActivity(id);
        setActivities(actData);
      } catch (e) {
        // Activity optional
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load project details.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, currentStatus) => {
    const cols = ["Todo", "In Progress", "Review", "Completed"];
    const currentIndex = cols.indexOf(currentStatus);
    if (currentIndex < 3) {
      const nextStatus = cols[currentIndex + 1];
      try {
        const updated = await taskService.update(taskId, { status: nextStatus });
        const updatedTasks = tasks.map((t) => (t._id === taskId ? updated : t));
        setTasks(updatedTasks);

        const completedCount = updatedTasks.filter((t) => t.status === "Completed").length;
        const newProgress = updatedTasks.length ? Math.round((completedCount / updatedTasks.length) * 100) : 0;
        setProject((prev) => ({ ...prev, progress: newProgress }));
      } catch (err) {
        console.error("Failed to update task status:", err);
      }
    }
  };

  const handleCreateTaskFromModal = async (taskData) => {
    try {
      const created = await taskService.create({
        ...taskData,
        project: id,
      });
      const refreshedTasks = [...tasks, created];
      setTasks(refreshedTasks);

      const completedCount = refreshedTasks.filter((t) => t.status === "Completed").length;
      const newProgress = refreshedTasks.length ? Math.round((completedCount / refreshedTasks.length) * 100) : 0;
      setProject((prev) => ({ ...prev, progress: newProgress }));

      setModalOpen(false);
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  const handleProjectSave = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setProjectSaving(true);
    setProjectError("");
    try {
      const updated = await projectService.update(id, {
        name: form.get("name"),
        description: form.get("description"),
        priority: form.get("priority"),
        status: form.get("status"),
        endDate: form.get("endDate") || null,
      });
      setProject(updated);
      setEditProjectOpen(false);
    } catch (err) {
      setProjectError(err.response?.data?.message || "Could not save project changes.");
    } finally {
      setProjectSaving(false);
    }
  };

  const handleTaskModalUpdate = (updatedTask) => {
    const updated = tasks.map((t) => (t._id === updatedTask._id ? updatedTask : t));
    setTasks(updated);

    const completedCount = updated.filter((t) => t.status === "Completed").length;
    const newProgress = updated.length ? Math.round((completedCount / updated.length) * 100) : 0;
    setProject((prev) => ({ ...prev, progress: newProgress }));
    setSelectedTask(updatedTask);
  };

  const handleTaskModalDelete = (deletedTaskId) => {
    const remaining = tasks.filter((t) => t._id !== deletedTaskId);
    setTasks(remaining);

    const completedCount = remaining.filter((t) => t.status === "Completed").length;
    const newProgress = remaining.length ? Math.round((completedCount / remaining.length) * 100) : 0;
    setProject((prev) => ({ ...prev, progress: newProgress }));
    setSelectedTask(null);
  };

  const generateProjectRiskAnalysis = async () => {
    if (!project) return;
    setAiLoading(true);
    setAiResult(null);
    setAiMode("risk");
    try {
      const prompt = `Analyze operational and delivery risks for project "${project.name}" (Description: "${project.description}"). Status: ${project.status}, Priority: ${project.priority}, Progress: ${project.progress}%. Existing tasks: ${tasks.map((t) => t.title).join(", ")}`;
      const result = await aiService.generate("Risk analyzer", prompt, id);
      setAiResult(result);
    } catch (err) {
      console.error("AI Generation failed:", err);
      alert(err.response?.data?.message || "AI Analysis unavailable. Ensure API keys are set in server/.env.");
    } finally {
      setAiLoading(false);
    }
  };

  const generateTaskBreakdown = async () => {
    if (!project) return;
    setAiLoading(true);
    setAiResult(null);
    setAiMode("breakdown");
    try {
      const prompt = `Break down actionable delivery tasks for project "${project.name}". Scope: "${project.description}". Existing tasks already logged: ${tasks.map((t) => t.title).join(", ") || "None"}. Generate new high-impact subtasks to complete this project.`;
      const result = await aiService.generate("Task breakdown", prompt, id);
      setAiResult(result);
    } catch (err) {
      console.error("AI Generation failed:", err);
      alert(err.response?.data?.message || "AI Breakdown unavailable. Ensure API keys are set in server/.env.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleImportAiSubtasks = async () => {
    if (!aiResult?.phases?.length) return;
    setAiImporting(true);
    try {
      const tasksToImport = aiResult.phases.map((phase) => ({
        title: phase[0],
        description: `${phase[1] || ""}: ${phase[2] || ""}`,
        priority: ["Low", "Medium", "High", "Critical"].includes(phase[3]) ? phase[3] : "Medium",
        status: "Todo",
      }));

      await taskService.bulkCreate(tasksToImport, id);
      const refreshedTasks = await taskService.getAll(id);
      setTasks(refreshedTasks);

      const completedCount = refreshedTasks.filter((t) => t.status === "Completed").length;
      const newProgress = refreshedTasks.length ? Math.round((completedCount / refreshedTasks.length) * 100) : 0;
      setProject((prev) => ({ ...prev, progress: newProgress }));

      setAiResult(null);
      alert(`Imported ${tasksToImport.length} AI-generated subtasks into ${project.name}!`);
    } catch (err) {
      console.error("Import failed:", err);
      alert("Failed to import subtasks");
    } finally {
      setAiImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <span className="spinner" />
        <p>Loading project details...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="error-state card">
        <AlertTriangle size={32} className="orange" />
        <h3>Error Loading Project</h3>
        <p>{error || "The project you are looking for does not exist or you do not have permission to view it."}</p>
        <button className="primary" onClick={() => navigate("/projects")}>
          <ArrowLeft size={16} /> Back to Projects
        </button>
      </div>
    );
  }

  const completedTasks = tasks.filter((t) => t.status === "Completed");
  const canEditProject = project.owner?._id === currentUser?._id || (project.members?.some((member) => member._id === currentUser?._id) && ["Project Manager", "Admin"].includes(currentUser?.role));

  return (
    <div className="project-details-page">
      <div className="project-details-header">
        <Link to="/projects" className="back-link">
          <ArrowLeft size={16} /> Back to Projects
        </Link>
        <div className="project-details-title-row">
          <div className="project-identity">
            <span className="project-logo large" style={{ background: project.color || "#7c5cff" }}>
              {project.name[0]}
            </span>
            <div>
              <h1>{project.name}</h1>
              <p>{project.description || "No description provided."}</p>
            </div>
          </div>
          <div className="project-details-meta">
            <span className={`badge ${project.status.toLowerCase().replace(" ", "-")}`}>{project.status}</span>
            <span className={`priority ${project.priority.toLowerCase()}`}>{project.priority} Priority</span>
            {canEditProject && <button className="secondary" onClick={() => setEditProjectOpen((open) => !open)}>{editProjectOpen ? "Close editor" : "Edit project"}</button>}
          </div>
        </div>
      </div>

      {editProjectOpen && (
        <form className="card" onSubmit={handleProjectSave} style={{ marginBottom: 18, padding: 20 }}>
          <h3>Edit project details</h3>
          {projectError && <p role="alert" className="form-error">{projectError}</p>}
          <div className="form-grid">
            <label>Project name<input name="name" defaultValue={project.name} required maxLength={120} /></label>
            <label>Status<select name="status" defaultValue={project.status}>{["Planning", "Active", "On Hold", "Completed", "Delayed"].map((status) => <option key={status}>{status}</option>)}</select></label>
            <label>Priority<select name="priority" defaultValue={project.priority}>{["Low", "Medium", "High", "Critical"].map((priority) => <option key={priority}>{priority}</option>)}</select></label>
            <label>Due date<input name="endDate" type="date" defaultValue={project.endDate ? new Date(project.endDate).toISOString().slice(0, 10) : ""} /></label>
          </div>
          <label>Description<textarea name="description" defaultValue={project.description || ""} maxLength={4000} /></label>
          <button className="primary" type="submit" disabled={projectSaving}>{projectSaving ? "Saving..." : "Save project"}</button>
        </form>
      )}

      <div className="project-details-grid">
        {/* Left Side: Tasks & Operations */}
        <div className="project-main-info">
          <section className="card project-tasks-card">
            <div className="card-head">
              <div>
                <h3>Project Tasks ({tasks.length})</h3>
                <p>Click any task to inspect details, add comments, or edit.</p>
              </div>
              <button className="primary" onClick={() => setModalOpen(true)}>
                <Plus size={15} /> Add Task
              </button>
            </div>

            <div className="details-task-list">
              {tasks.length === 0 ? (
                <div className="empty-tasks-placeholder">
                  <ClipboardList size={28} />
                  <p>No tasks added to this project yet.</p>
                </div>
              ) : (
                tasks.map((t) => (
                  <div
                    className="project-task-row"
                    key={t._id}
                    onClick={() => setSelectedTask(t)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="task-status-checker">
                      {t.status === "Completed" ? (
                        <CheckCircle2 className="task-complete-check" size={18} />
                      ) : (
                        <div className="task-incomplete-dot" />
                      )}
                      <div>
                        <strong>{t.title}</strong>
                        <span className="task-row-status">{t.status}</span>
                      </div>
                    </div>

                    <div className="task-row-actions">
                      <span className={`priority ${t.priority?.toLowerCase() || "medium"}`}>
                        {t.priority || "Medium"}
                      </span>
                      {t.status !== "Completed" && (
                        <button
                          className="advance-task-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(t._id, t.status);
                          }}
                        >
                          <Play size={12} /> Advance
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* AI Intelligence Workspace Inside Project Details */}
          <section className="card project-ai-card">
            <div className="ai-intelligence-header">
              <div className="ai-header-title">
                <Sparkles className="sparkle-ai-icon" size={18} />
                <h3>Project AI Intelligence</h3>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="secondary ai-analyze-btn"
                  onClick={generateTaskBreakdown}
                  disabled={aiLoading}
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                >
                  <BrainCircuit size={14} />
                  {aiLoading && aiMode === "breakdown" ? "Generating..." : "Generate Subtasks"}
                </button>
                <button
                  className="primary ai-analyze-btn"
                  onClick={generateProjectRiskAnalysis}
                  disabled={aiLoading}
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                >
                  {aiLoading && aiMode === "risk" ? <span className="spinner" /> : <Sparkles size={14} />}
                  {aiLoading && aiMode === "risk" ? "Analyzing..." : "Analyze Risks"}
                </button>
              </div>
            </div>

            <p className="ai-box-description">
              Query LLM to scan scope and generate automated task breakdowns or delivery risk analysis for &quot;{project.name}&quot;.
            </p>

            {aiResult && (
              <motion.div className="ai-result-details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {aiMode === "breakdown" && aiResult.phases?.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <h4>Generated Subtasks ({aiResult.phases.length})</h4>
                      <button
                        className="primary"
                        onClick={handleImportAiSubtasks}
                        disabled={aiImporting}
                        style={{ fontSize: "11px", padding: "5px 10px" }}
                      >
                        {aiImporting ? "Importing..." : "Add All to Project"}
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {aiResult.phases.map((p, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "8px 12px",
                            background: "var(--surface-2)",
                            borderRadius: "6px",
                            border: "1px solid var(--line)",
                            fontSize: "12px",
                          }}
                        >
                          <strong>{p[0]}</strong> <span style={{ color: "var(--muted)" }}>({p[1]})</span>
                          <p style={{ margin: "2px 0 0 0", color: "var(--muted)", fontSize: "11px" }}>{p[2]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h4>Estimated Risks ({aiResult.risks?.length || 0})</h4>
                <div className="ai-risks-list">
                  {aiResult.risks?.map((risk, index) => (
                    <div key={index} className="riskline">
                      <AlertTriangle size={14} />
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>

                <h4 style={{ marginTop: "16px" }}>Recommended Roles</h4>
                <div className="ai-roles-list">
                  {aiResult.roles?.map((role, index) => (
                    <div key={index} className="checkline">
                      <Check size={14} />
                      <span>{role}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </section>

          {/* Project Activity Audit Trail */}
          {activities.length > 0 && (
            <section className="card project-activity-card" style={{ marginTop: "20px" }}>
              <div className="card-head">
                <div>
                  <h3 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <History size={16} /> Recent Project Activity
                  </h3>
                  <p>Audit trail of operations on this project and its tasks.</p>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                {activities.slice(0, 8).map((act) => (
                  <div
                    key={act._id}
                    style={{
                      fontSize: "12px",
                      borderLeft: "2px solid var(--line)",
                      paddingLeft: "10px",
                    }}
                  >
                    <strong>{act.actor?.name || "Member"}</strong>{" "}
                    <span style={{ color: "var(--muted)" }}>
                      {act.action === "CREATED" && "created " + (act.details?.title || "item")}
                      {act.action === "STATUS_CHANGED" && `updated status to ${act.details?.to || "new state"}`}
                      {act.action === "COMMENT_ADDED" && "added a comment"}
                      {act.action === "DELETED" && "deleted task"}
                    </span>
                    <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                      {new Date(act.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Side: Quick Stats, Dates, Team */}
        <div className="project-sidebar-info">
          <section className="card project-stats-details-card">
            <h3>Overview Metrics</h3>
            <div className="details-metric-row">
              <span>Progress</span>
              <b>{project.progress}%</b>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${project.progress}%`, background: project.color || "#3154d9" }}
              />
            </div>

            <div className="details-metric-row">
              <span>Task Completion</span>
              <b>
                {completedTasks.length} / {tasks.length} tasks
              </b>
            </div>

            <hr className="details-divider" />

            <div className="details-icon-row">
              <Calendar size={16} />
              <div>
                <small>Timeline</small>
                <strong>
                  {project.startDate ? new Date(project.startDate).toLocaleDateString() : "N/A"} -{" "}
                  {project.endDate ? new Date(project.endDate).toLocaleDateString() : "N/A"}
                </strong>
              </div>
            </div>

            <div className="details-icon-row">
              <Activity size={16} />
              <div>
                <small>Work Velocity</small>
                <strong>
                  {tasks.length > 0
                    ? `${Math.round((completedTasks.length / tasks.length) * 100)}% Shipped`
                    : "No tasks logged"}
                </strong>
              </div>
            </div>
          </section>

          <section className="card project-team-card">
            <h3>Project Team</h3>

            {project.owner?._id === currentUser?._id &&
              users.filter((u) => !project.members?.some((m) => m._id === u._id) && u._id !== project.owner?._id)
                .length > 0 && (
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px", marginTop: "8px" }}>
                  <select
                    value={selectedMemberToAdd}
                    onChange={(e) => setSelectedMemberToAdd(e.target.value)}
                    style={{
                      flexGrow: 1,
                      padding: "6px",
                      borderRadius: "6px",
                      border: "1px solid var(--line)",
                      background: "var(--surface-2)",
                      color: "var(--text)",
                      fontSize: "12px",
                    }}
                  >
                    <option value="">Add member...</option>
                    {users
                      .filter(
                        (u) =>
                          !project.members?.some((m) => m._id === u._id) &&
                          u._id !== (project.owner?._id || project.owner)
                      )
                      .map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                  <button
                    className="primary"
                    onClick={async () => {
                      if (!selectedMemberToAdd) return;
                      try {
                        const updatedMemberIds = [
                          ...(project.members?.map((m) => m._id) || []),
                          selectedMemberToAdd,
                        ];
                        const updatedProj = await projectService.update(id, { members: updatedMemberIds });
                        setProject(updatedProj);
                        setSelectedMemberToAdd("");
                      } catch (err) {
                        console.error("Failed to add member", err);
                      }
                    }}
                    style={{ padding: "6px 12px", fontSize: "12px", borderRadius: "6px" }}
                  >
                    Add
                  </button>
                </div>
              )}

            <div className="details-team-list">
              {project.members && project.members.length > 0 ? (
                project.members.map((m) => (
                  <div key={m._id} className="details-member-row">
                    <span className="avatar coral">{m.avatar || m.name[0]}</span>
                    <div>
                      <strong>{m.name}</strong>
                      <small>{m.role || "Team Member"}</small>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-members-text">No team members assigned.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      {modalOpen && (
        <QuickModal
          type="task"
          projects={[project]}
          users={users}
          currentUser={currentUser}
          close={() => setModalOpen(false)}
          onSubmit={handleCreateTaskFromModal}
        />
      )}

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projects={[project]}
          users={users}
          currentUser={currentUser}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskModalUpdate}
          onDelete={handleTaskModalDelete}
        />
      )}
    </div>
  );
}
