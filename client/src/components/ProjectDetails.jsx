import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Calendar, Users, ClipboardList, AlertTriangle, CheckCircle2,
  Play, Plus, Check, Clock3, MoreHorizontal, Sparkles, BrainCircuit, Activity
} from "lucide-react";
import projectService from "../services/projectService";
import taskService from "../services/taskService";
import aiService from "../services/aiService";

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // AI recommendations state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // New task modal-like state for project details
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);

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
        // Update local tasks
        setTasks(tasks.map(t => t._id === taskId ? { ...t, status: nextStatus } : t));
        
        // Recalculate project progress based on completed tasks
        const updatedTasks = tasks.map(t => t._id === taskId ? { ...t, status: nextStatus } : t);
        const completedCount = updatedTasks.filter(t => t.status === "Completed").length;
        const newProgress = updatedTasks.length ? Math.round((completedCount / updatedTasks.length) * 100) : 0;
        
        // Update on database
        await projectService.update(id, { progress: newProgress });
        setProject(prev => ({ ...prev, progress: newProgress }));
      } catch (err) {
        console.error("Failed to update task status:", err);
      }
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const newTask = await taskService.create({
        title: newTaskTitle,
        project: id,
        priority: "Medium",
        status: "Todo"
      });
      
      const newTasks = [...tasks, newTask];
      setTasks(newTasks);
      setNewTaskTitle("");
      setAddingTask(false);

      // Update project progress
      const completedCount = newTasks.filter(t => t.status === "Completed").length;
      const newProgress = Math.round((completedCount / newTasks.length) * 100);
      await projectService.update(id, { progress: newProgress });
      setProject(prev => ({ ...prev, progress: newProgress }));
    } catch (err) {
      console.error("Failed to add task:", err);
    }
  };

  const generateProjectRiskAnalysis = async () => {
    if (!project) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const prompt = `Analyze risks for project "${project.name}" describe as: "${project.description}". Current status: ${project.status}, Priority: ${project.priority}, Progress: ${project.progress}%. Current tasks: ${tasks.map(t => t.title).join(", ")}`;
      const result = await aiService.generate("Risk analyzer", prompt);
      setAiResult(result);
    } catch (err) {
      console.error("AI Generation failed:", err);
    } finally {
      setAiLoading(false);
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
        <p>{error || "The project you are looking for does not exist."}</p>
        <button className="primary" onClick={() => navigate("/projects")}>
          <ArrowLeft size={16} /> Back to Projects
        </button>
      </div>
    );
  }

  const completedTasks = tasks.filter(t => t.status === "Completed");

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
            <span className={`badge ${project.status.toLowerCase().replace(" ", "-")}`}>
              {project.status}
            </span>
            <span className={`priority ${project.priority.toLowerCase()}`}>
              {project.priority} Priority
            </span>
          </div>
        </div>
      </div>

      <div className="project-details-grid">
        {/* Left Side: Tasks & Operations */}
        <div className="project-main-info">
          <section className="card project-tasks-card">
            <div className="card-head">
              <h3>Project Tasks ({tasks.length})</h3>
              <button className="primary" onClick={() => setAddingTask(true)}>
                <Plus size={15} /> Add Task
              </button>
            </div>

            {addingTask && (
              <form onSubmit={handleAddTask} className="add-task-form">
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  autoFocus
                />
                <div className="add-task-actions">
                  <button type="button" className="secondary" onClick={() => setAddingTask(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary">
                    Create Task
                  </button>
                </div>
              </form>
            )}

            <div className="details-task-list">
              {tasks.length === 0 ? (
                <div className="empty-tasks-placeholder">
                  <ClipboardList size={28} />
                  <p>No tasks added to this project yet.</p>
                </div>
              ) : (
                tasks.map(t => (
                  <div className="project-task-row" key={t._id}>
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
                      <span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span>
                      {t.status !== "Completed" && (
                        <button 
                          className="advance-task-btn" 
                          onClick={() => handleStatusChange(t._id, t.status)}
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
              <button 
                className="primary ai-analyze-btn" 
                onClick={generateProjectRiskAnalysis}
                disabled={aiLoading}
              >
                {aiLoading ? <span className="spinner" /> : <BrainCircuit size={15} />}
                {aiLoading ? "Analyzing..." : "Analyze Risks"}
              </button>
            </div>
            
            <p className="ai-box-description">
              Query Gemini AI to scan the project scope, tasks, and completion metrics for scheduling risks or critical blockers.
            </p>

            {aiResult && (
              <motion.div 
                className="ai-result-details"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
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
              <b>{completedTasks.length} / {tasks.length} tasks</b>
            </div>

            <hr className="details-divider" />

            <div className="details-icon-row">
              <Calendar size={16} />
              <div>
                <small>Timeline</small>
                <strong>
                  {project.startDate ? new Date(project.startDate).toLocaleDateString() : "N/A"} - {project.endDate ? new Date(project.endDate).toLocaleDateString() : "N/A"}
                </strong>
              </div>
            </div>

            <div className="details-icon-row">
              <Activity size={16} />
              <div>
                <small>Work Velocity</small>
                <strong>
                  {tasks.length > 0 ? `${Math.round((completedTasks.length / tasks.length) * 100)}% Shipped` : "No tasks logged"}
                </strong>
              </div>
            </div>
          </section>

          <section className="card project-team-card">
            <h3>Project Team</h3>
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
    </div>
  );
}
