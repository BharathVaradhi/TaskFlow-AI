import { useEffect, useState, useMemo, useCallback } from "react";
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, ArrowRight, ArrowLeft, ArrowUpRight, BarChart3, Bell, BrainCircuit, CalendarDays, Check,
  ChevronDown, CircleHelp, ClipboardList, Clock3, FolderKanban,
  Gauge, LayoutDashboard, Menu, Moon, MoreHorizontal, Plus, Search, Settings,
  Sparkles, Sun, Target, TrendingUp, Users, X, Zap, Layers3, CalendarRange, LogOut, FileText,
  AlertTriangle, Filter, RotateCcw, RotateCw, Trash2
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

// Components
import Login from "./components/Login";
import Register from "./components/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import ProjectDetails from "./components/ProjectDetails";
import QuickModal from "./components/QuickModal";
import TaskModal from "./components/TaskModal";

// Services
import authService from "./services/authService";
import projectService from "./services/projectService";
import taskService from "./services/taskService";
import aiService from "./services/aiService";
import API from "./services/api";

import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import Dashboard from "./pages/Dashboard";

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [dark, setDark] = useState(() => localStorage.getItem("darkMode") === "true");
  const [sidebar, setSidebar] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    localStorage.setItem("darkMode", dark);
  }, [dark]);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const userData = await authService.getMe();
          setUser(userData);
        } catch (e) {
          console.error("Invalid token on boot", e);
          authService.logout();
        }
      }
      setCheckingAuth(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (user) {
      const fetchUsers = async () => {
        try {
          const response = await API.get("/users");
          setUsers(response.data);
        } catch (e) {
          console.error("Error loading team members", e);
        }
      };
      fetchUsers();
    }
  }, [user]);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  if (checkingAuth) {
    return (
      <div className="loading-state" style={{ height: "100vh" }}>
        <span className="spinner" />
        <p>Loading TaskFlow Work OS...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onAuthenticated={setUser} />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register onAuthenticated={setUser} />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout
              user={user}
              setUser={setUser}
              logout={handleLogout}
              dark={dark}
              setDark={setDark}
              sidebar={sidebar}
              setSidebar={setSidebar}
              users={users}
            />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function MainLayout({ user, setUser, logout, dark, setDark, sidebar, setSidebar, users }) {
  return (
    <div className={dark ? "app dark" : "app"}>
      <Sidebar user={user} logout={logout} open={sidebar} close={() => setSidebar(false)} />
      <main className="main">
        <Header user={user} dark={dark} setDark={setDark} menu={() => setSidebar(true)} />
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/projects" element={<Projects users={users} currentUser={user} />} />
            <Route path="/projects/:id" element={<ProjectDetails users={users} currentUser={user} />} />
            <Route path="/tasks" element={<Tasks users={users} currentUser={user} />} />
            <Route path="/ai" element={<AIWorkspace users={users} currentUser={user} />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/team" element={<Team />} />
            <Route path="/settings" element={<SettingsPage dark={dark} setDark={setDark} user={user} setUser={setUser} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

/* ==========================================================================
   PROJECTS VIEW (P0)
   ========================================================================== */

function Projects({ users, currentUser }) {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await projectService.getAll();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projData) => {
    try {
      const created = await projectService.create(projData);
      setProjects([created, ...projects]);
      setModalOpen(false);
    } catch (err) {
      console.error("Project creation failed", err);
      alert(err.response?.data?.message || "Failed to create project");
    }
  };

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation();
    try {
      await projectService.delete(projectId);
      setProjects(projects.filter((p) => p._id !== projectId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete project", err);
      alert(err.response?.data?.message || "Failed to delete project");
    }
  };

  const shown = projects.filter((p) => {
    const matchesFilter = filter === "All" || p.status === filter;
    const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(query.toLowerCase()));
    return matchesFilter && matchesQuery;
  });

  return (
    <>
      <div className="page-top">
        <div>
          <h2>Your projects</h2>
          <p>Plan, track, and deliver exceptional work across teams.</p>
        </div>
        <button className="primary" onClick={() => setModalOpen(true)}>
          <Plus size={17} /> New Project
        </button>
      </div>

      <div className="toolbar">
        <div className="tabs">
          {["All", "Active", "Planning", "Completed", "Delayed", "On Hold"].map((x) => (
            <button className={filter === x ? "selected" : ""} onClick={() => setFilter(x)} key={x}>
              {x}
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={17} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects..." />
        </label>
      </div>

      {loading ? (
        <div className="loading-state">
          <span className="spinner" />
          <p>Loading projects...</p>
        </div>
      ) : (
        <div className="project-grid">
          {shown.map((p, i) => {
            const isOwner = p.owner?._id === currentUser?._id || p.owner === currentUser?._id;
            return (
              <motion.article
                className="card project-card"
                key={p._id}
                style={{ cursor: "pointer", position: "relative" }}
                onClick={() => navigate(`/projects/${p._id}`)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <div className="project-card-top">
                  <span className="project-logo large" style={{ background: p.color || "#7c5cff" }}>
                    {p.name[0]}
                  </span>
                  {isOwner && (
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(deleteConfirmId === p._id ? null : p._id);
                      }}
                      title="Project options"
                      style={{ padding: "4px" }}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  )}
                </div>

                {deleteConfirmId === p._id && (
                  <div
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      padding: "8px",
                      marginBottom: "10px",
                      fontSize: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span style={{ color: "#e35f55" }}>Delete this project?</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={(e) => handleDeleteProject(e, p._id)}
                        style={{
                          background: "#e35f55",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "3px 8px",
                          fontSize: "11px",
                          cursor: "pointer"
                        }}
                      >
                        Delete
                      </button>
                      <button
                        className="secondary"
                        onClick={() => setDeleteConfirmId(null)}
                        style={{ padding: "3px 8px", fontSize: "11px" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <span className={`badge ${p.status.toLowerCase().replace(" ", "-")}`}>{p.status}</span>
                <h3>{p.name}</h3>
                <p>{p.description || "No description provided."}</p>

                <div className="project-meta">
                  <span>
                    <CalendarDays size={15} /> Due {p.endDate ? new Date(p.endDate).toLocaleDateString() : "N/A"}
                  </span>
                  <span className={`priority ${p.priority.toLowerCase()}`}>{p.priority}</span>
                </div>

                <div className="progress-title">
                  <span>Progress</span>
                  <b>{p.progress}%</b>
                </div>
                <div className="progress">
                  <i style={{ width: `${p.progress}%`, background: p.color || "#7c5cff" }} />
                </div>

                <div className="project-footer" style={{ marginTop: "20px" }}>
                  <div className="avatar-stack">
                    {p.members?.map((m, j) => (
                      <span
                        className="avatar tiny"
                        key={m._id || j}
                        style={{ background: ["#7c5cff", "#ec7a9c", "#42bfa5", "#f3a44a"][j % 4] }}
                        title={m.name || "Member"}
                      >
                        {m.avatar || (m.name ? m.name[0] : "M")}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/projects/${p._id}`);
                    }}
                  >
                    Open project <ArrowRight size={15} />
                  </button>
                </div>
              </motion.article>
            );
          })}
          {!loading && shown.length === 0 && (
            <div
              className="card"
              style={{ gridColumn: "1/-1", padding: "40px", textAlign: "center", color: "var(--muted)" }}
            >
              <FolderKanban size={32} style={{ marginBottom: "12px" }} />
              <h3>No Projects Found</h3>
              <p>Try resetting filters or creating a new project to get started.</p>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <QuickModal
          type="project"
          users={users}
          currentUser={currentUser}
          close={() => setModalOpen(false)}
          onSubmit={handleCreateProject}
        />
      )}
    </>
  );
}

/* ==========================================================================
   TASKS VIEW — KANBAN + ADVANCED TRACKING & FILTERING (P0, P2)
   ========================================================================== */

function Tasks({ users, currentUser }) {
  const cols = ["Todo", "In Progress", "Review", "Completed"];
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Filters & Search (P0 Requirement)
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [projectFilter, setProjectFilter] = useState("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Drag-and-drop state
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  useEffect(() => {
    fetchTasksAndProjects();

    // Polling sync interval for task updates
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchTasksAndProjects(false);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const fetchTasksAndProjects = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const taskList = await taskService.getAll();
      setTasks(taskList);
      const projList = await projectService.getAll();
      setProjects(projList);
    } catch (err) {
      console.error("Task fetch error", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      await taskService.create(taskData);
      const refreshed = await taskService.getAll();
      setTasks(refreshed);
      setModalOpen(false);
    } catch (err) {
      console.error("Task creation failed", err);
      alert(err.response?.data?.message || "Task creation failed");
    }
  };

  const handleTaskModalUpdate = (updatedTask) => {
    setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
    setSelectedTask(updatedTask);
  };

  const handleTaskModalDelete = (deletedTaskId) => {
    setTasks((prev) => prev.filter((t) => t._id !== deletedTaskId));
    setSelectedTask(null);
  };

  // Drag and drop handlers
  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggingId(id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e, col) => {
    e.preventDefault();
    setDragOverCol(col);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const previousTasks = [...tasks];
    setTasks(tasks.map((t) => (t._id === taskId ? { ...t, status: targetStatus } : t)));
    setDraggingId(null);
    setDragOverCol(null);

    try {
      await taskService.update(taskId, { status: targetStatus });
    } catch (err) {
      console.error("Drop update failed", err);
      setTasks(previousTasks); // roll back
    }
  };

  // Accessible move forward
  const advance = async (task, e) => {
    e.stopPropagation();
    const i = cols.indexOf(task.status);
    if (i < cols.length - 1) {
      const nextCol = cols[i + 1];
      const previousTasks = [...tasks];
      setTasks(tasks.map((t) => (t._id === task._id ? { ...t, status: nextCol } : t)));

      try {
        await taskService.update(task._id, { status: nextCol });
      } catch (err) {
        console.error("Advance failed", err);
        setTasks(previousTasks);
      }
    }
  };

  // Accessible move backward
  const regress = async (task, e) => {
    e.stopPropagation();
    const i = cols.indexOf(task.status);
    if (i > 0) {
      const prevCol = cols[i - 1];
      const previousTasks = [...tasks];
      setTasks(tasks.map((t) => (t._id === task._id ? { ...t, status: prevCol } : t)));

      try {
        await taskService.update(task._id, { status: prevCol });
      } catch (err) {
        console.error("Regress failed", err);
        setTasks(previousTasks);
      }
    }
  };

  // Clear filters
  const resetFilters = () => {
    setSearchQuery("");
    setPriorityFilter("All");
    setProjectFilter("All");
    setAssigneeFilter("All");
    setStatusFilter("All");
  };

  const hasActiveFilters =
    searchQuery ||
    priorityFilter !== "All" ||
    projectFilter !== "All" ||
    assigneeFilter !== "All" ||
    statusFilter !== "All";

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
    if (projectFilter !== "All" && t.project?._id !== projectFilter && t.project !== projectFilter) return false;
    if (assigneeFilter !== "All") {
      if (assigneeFilter === "unassigned" && t.assignee) return false;
      if (assigneeFilter !== "unassigned" && t.assignee?._id !== assigneeFilter && t.assignee !== assigneeFilter) return false;
    }
    if (statusFilter !== "All" && t.status !== statusFilter) return false;
    return true;
  });

  const now = new Date();

  return (
    <>
      <div className="page-top">
        <div>
          <h2>Task board</h2>
          <p>Organize, prioritize, and collaborate in real-time.</p>
        </div>
        <button className="primary" onClick={() => setModalOpen(true)}>
          <Plus size={17} /> Add Task
        </button>
      </div>

      {/* Filter and Search Bar (P0 Requirement) */}
      <div
        className="card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          alignItems: "center",
          padding: "12px 16px",
          marginBottom: "20px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "1 1 200px" }}>
          <Search size={16} style={{ color: "var(--muted)" }} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontSize: "13px"
            }}
          />
        </div>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            color: "var(--text)",
            fontSize: "12px"
          }}
        >
          <option value="All">All Priorities</option>
          <option value="Low">Low Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="High">High Priority</option>
          <option value="Critical">Critical Priority</option>
        </select>

        {/* Project Filter */}
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            color: "var(--text)",
            fontSize: "12px"
          }}
        >
          <option value="All">All Projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Assignee Filter */}
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          style={{
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid var(--line)",
            background: "var(--surface-2)",
            color: "var(--text)",
            fontSize: "12px"
          }}
        >
          <option value="All">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid var(--line)",
              background: "transparent",
              color: "var(--muted)",
              fontSize: "12px",
              cursor: "pointer"
            }}
          >
            <RotateCcw size={13} /> Reset
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-state">
          <span className="spinner" />
          <p>Loading task workflow...</p>
        </div>
      ) : (
        <div className="kanban">
          {cols.map((col, ci) => {
            const colTasks = filteredTasks.filter((t) => t.status === col);
            const isOver = dragOverCol === col;

            return (
              <section
                className={`kanban-col ${isOver ? "drag-over" : ""}`}
                key={col}
                onDragOver={(e) => handleDragOver(e, col)}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, col)}
              >
                <div className="kanban-head">
                  <div>
                    <i className={`dot c${ci}`} />
                    <b>{col}</b>
                    <span>{colTasks.length}</span>
                  </div>
                  <Plus size={17} style={{ cursor: "pointer" }} onClick={() => setModalOpen(true)} />
                </div>

                <div className="task-stack" style={{ minHeight: "350px" }}>
                  {colTasks.map((t) => {
                    const isDragging = draggingId === t._id;
                    const isOverdue =
                      t.dueDate &&
                      new Date(t.dueDate) < new Date(new Date().setHours(0, 0, 0, 0)) &&
                      t.status !== "Completed";

                    return (
                      <article
                        className={`card task-card ${isDragging ? "dragging" : ""}`}
                        key={t._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t._id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedTask(t)}
                        style={{ cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span className={`priority ${t.priority?.toLowerCase() || "medium"}`}>
                              {t.priority || "Medium"}
                            </span>
                            {isOverdue && (
                              <span
                                style={{
                                  background: "#e35f55",
                                  color: "#fff",
                                  fontSize: "10px",
                                  padding: "1px 5px",
                                  borderRadius: "10px",
                                  fontWeight: 700,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "3px"
                                }}
                              >
                                <AlertTriangle size={10} /> Late
                              </span>
                            )}
                          </div>
                          <MoreHorizontal size={17} style={{ color: "var(--muted)", cursor: "pointer" }} />
                        </div>

                        <h4>{t.title}</h4>
                        <p>{t.project?.name || "Independent Task"}</p>

                        <div className="task-footer">
                          <span style={{ color: isOverdue ? "#e35f55" : "inherit" }}>
                            <Clock3 size={14} />{" "}
                            {t.dueDate
                              ? new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                              : "No due date"}
                          </span>
                          <span
                            className="avatar tiny"
                            style={{ background: t.assignee ? "var(--purple, #7357f4)" : "#94a0b8" }}
                            title={t.assignee?.name || "Unassigned"}
                          >
                            {t.assignee?.name ? t.assignee.name.split(" ").map((n) => n[0]).join("") : "—"}
                          </span>
                        </div>

                        {/* Accessible Move buttons */}
                        <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                          {ci > 0 && (
                            <button
                              className="advance"
                              onClick={(e) => regress(t, e)}
                              style={{ flex: 1, padding: "4px 8px", fontSize: "11px" }}
                            >
                              <ArrowLeft size={11} /> {cols[ci - 1]}
                            </button>
                          )}
                          {ci < cols.length - 1 && (
                            <button
                              className="advance"
                              onClick={(e) => advance(t, e)}
                              style={{ flex: 1, padding: "4px 8px", fontSize: "11px" }}
                            >
                              {cols[ci + 1]} <ArrowRight size={11} />
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div
                      style={{
                        padding: "16px",
                        textAlign: "center",
                        border: "1px dashed var(--line)",
                        borderRadius: "8px",
                        color: "var(--muted)",
                        fontSize: "11px"
                      }}
                    >
                      Drop tasks here
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <QuickModal
          type="task"
          projects={projects}
          users={users}
          currentUser={currentUser}
          close={() => setModalOpen(false)}
          onSubmit={handleCreateTask}
        />
      )}

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projects={projects}
          users={users}
          currentUser={currentUser}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskModalUpdate}
          onDelete={handleTaskModalDelete}
        />
      )}
    </>
  );
}

/* ==========================================================================
   AI WORKSPACE (P1)
   ========================================================================== */

function AIWorkspace({ users, currentUser }) {
  const [tool, setTool] = useState("Project planner");
  const [prompt, setPrompt] = useState("Build an e-commerce website in 8 weeks");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [projects, setProjects] = useState([]);
  const [targetMode, setTargetMode] = useState("new"); // "new" | "existing"
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedPhases, setSelectedPhases] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    projectService.getAll().then((data) => {
      setProjects(data);
      if (data.length > 0) setSelectedProjectId(data[0]._id);
    });
  }, []);

  const run = async () => {
    setLoading(true);
    setResult(null);
    setErrorMessage("");
    try {
      if (tool === "Weekly report" && !selectedProjectId) {
        setErrorMessage("Create or select a project to build a report from its recorded data.");
        return;
      }
      const contextProjectId = targetMode === "existing" || tool === "Weekly report" ? selectedProjectId : undefined;
      const plan = await aiService.generate(tool, prompt, contextProjectId);
      setResult(plan);
      // Select all phases by default
      const initialSelected = {};
      plan.phases?.forEach((_, idx) => {
        initialSelected[idx] = true;
      });
      setSelectedPhases(initialSelected);
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err.response?.data?.message ||
        "AI model generation failed. Ensure GROQ_API_KEY or GEMINI_API_KEY is configured in server/.env."
      );
    } finally {
      setLoading(false);
    }
  };

  const togglePhase = (idx) => {
    setSelectedPhases((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleImportToDatabase = async () => {
    if (!result || importing) return;
    setImporting(true);
    setErrorMessage("");

    try {
      let destProjectId = selectedProjectId;

      if (targetMode === "new") {
        const createdProject = await projectService.create({
          name: result.name || prompt.substring(0, 30),
          description: result.description || `AI Generated Workspace for: ${prompt}`,
          status: "Planning",
          priority: "Medium"
        });
        destProjectId = createdProject._id;
      }

      if (!destProjectId) {
        throw new Error("No target project selected");
      }

      // Filter only selected phases
      const approvedPhases = (result.phases || []).filter((_, idx) => selectedPhases[idx]);

      if (approvedPhases.length > 0) {
        const tasksToImport = approvedPhases.map((phase) => ({
          title: phase[0],
          description: `${phase[1] || ""}: ${phase[2] || ""}`,
          priority: ["Low", "Medium", "High", "Critical"].includes(phase[3]) ? phase[3] : "Medium",
          status: "Todo"
        }));
        await taskService.bulkCreate(tasksToImport, destProjectId);
      }

      alert(`Successfully saved ${approvedPhases.length} tasks!`);
      navigate(`/projects/${destProjectId}`);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || "Failed to import AI tasks.");
    } finally {
      setImporting(false);
    }
  };

  const tools = [
    ["Project planner", Target],
    ["Task breakdown", ClipboardList],
    ["Sprint planner", Zap],
    ["Risk analyzer", Gauge],
    ["Weekly report", BarChart3]
  ];

  return (
    <div className="ai-layout">
      <aside className="ai-tools">
        <span className="eyebrow">
          <Sparkles size={14} /> AI TOOLKIT
        </span>
        <h2>Work Smarter.</h2>
        <p>Turn ideas into actionable structures in seconds.</p>
        {tools.map(([x, Icon]) => (
          <button
            className={tool === x ? "active" : ""}
            onClick={() => {
              setTool(x);
              if (x === "Weekly report") setTargetMode("existing");
              setResult(null);
              setErrorMessage("");
            }}
            key={x}
          >
            <Icon size={18} />
            <span>{x}</span>
            <ArrowRight size={15} />
          </button>
        ))}
      </aside>

      <div className="ai-main">
        <section className="ai-hero">
          <div className="ai-orb">
            <BrainCircuit size={34} />
          </div>
          <span className="eyebrow">TASKFLOW INTELLIGENCE</span>
          <h2>{tool}</h2>
          <p>{tool === "Weekly report"
            ? "Choose a project to summarize its recorded tasks, blockers, and upcoming work."
            : "Describe your goal. TaskFlow AI will create a structured result tailored to this tool."}</p>

          {errorMessage && (
            <div
              style={{
                background: "rgba(227, 95, 85, 0.12)",
                border: "1px solid rgba(227, 95, 85, 0.3)",
                color: "#e35f55",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <AlertTriangle size={18} />
              <div>{errorMessage}</div>
            </div>
          )}

          <div className="prompt-box">
            <textarea
              maxLength={500}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your project, sprint goal, or task breakdown..."
            />
            <div>
              <span>{prompt.length}/500</span>
              <button className="primary" onClick={run} disabled={loading || !prompt.trim() || (tool === "Weekly report" && !selectedProjectId)}>
                {loading ? <span className="spinner" /> : <Sparkles size={17} />}
                {loading ? "Thinking..." : "Generate plan"}
              </button>
            </div>
          </div>
          <div className="suggestions">
            <span>Try:</span>
            {[
              "Launch a mobile app in 6 weeks",
              "Plan a 2-week sprint for authentication system",
              "Analyze delivery risks for database migration"
            ].map((x) => (
              <button
                onClick={() => {
                  setPrompt(x);
                }}
                key={x}
              >
                {x}
              </button>
            ))}
          </div>
        </section>

        {result && (
          <motion.section className="results" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <div className="result-title" style={{ flexWrap: "wrap", gap: "12px" }}>
              <div>
                <span className="eyebrow">
                  <Sparkles size={14} /> GENERATED PLAN
                </span>
                <h2>{result.name || "TaskFlow Schedule Layout"}</h2>
                <p>{result.description || "Synthesized timeline structures"}</p>
              </div>

              {/* Destination selector & Import button */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <select
                    value={targetMode}
                    onChange={(e) => setTargetMode(e.target.value)}
                    style={{
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid var(--line)",
                      background: "var(--surface)",
                      color: "var(--text)",
                      fontSize: "12px"
                    }}
                  >
                    {tool !== "Weekly report" && <option value="new">Create New Project</option>}
                    {projects.length > 0 && <option value="existing">Add to Existing Project</option>}
                  </select>

                  {targetMode === "existing" && (
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      style={{
                        padding: "8px",
                        borderRadius: "6px",
                        border: "1px solid var(--line)",
                        background: "var(--surface)",
                        color: "var(--text)",
                        fontSize: "12px"
                      }}
                    >
                      {projects.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {tool !== "Weekly report" && (
                  <button className="primary" onClick={handleImportToDatabase} disabled={importing}>
                    {importing ? <span className="spinner" /> : <Plus size={16} />}
                    {importing ? "Importing..." : "Save to Database"}
                  </button>
                )}
              </div>
            </div>

            <div style={{ margin: "16px 0 8px 0", fontSize: "12px", color: "var(--muted)" }}>
              Select which subtasks to include in your workspace:
            </div>

            <div className="phase-list">
              {result.phases?.map((p, i) => (
                <div
                  className="card phase"
                  key={i}
                  style={{
                    opacity: selectedPhases[i] ? 1 : 0.5,
                    borderLeft: selectedPhases[i] ? "3px solid var(--purple, #7357f4)" : "3px solid transparent",
                    cursor: "pointer"
                  }}
                  onClick={() => togglePhase(i)}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(selectedPhases[i])}
                    onChange={() => togglePhase(i)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginRight: "10px", width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <span>{i + 1}</span>
                  <div>
                    <small>
                      {p[1]} · Suggested: {p[3] || "Medium"}
                    </small>
                    <h3>{p[0]}</h3>
                    <p>{p[2]}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="result-grid">
              <div className="card">
                <h3>Recommended Roles</h3>
                {result.roles?.map((x) => (
                  <p className="checkline" key={x}>
                    <Check size={15} />
                    {x}
                  </p>
                ))}
              </div>
              <div className="card">
                <h3>Estimated Risks</h3>
                {result.risks?.map((x) => (
                  <p className="riskline" key={x}>
                    <Zap size={15} />
                    {x}
                  </p>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   REPORTS & INSIGHTS (P1)
   ========================================================================== */

function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState("Loading AI executive summary...");
  const [projectOptions, setProjectOptions] = useState([]);
  const [projectFilter, setProjectFilter] = useState("");

  useEffect(() => {
    API.get("/projects").then((response) => setProjectOptions(response.data)).catch(() => setProjectOptions([]));
  }, []);

  useEffect(() => {
    const fetchStatsAndSummary = async () => {
      setLoading(true);
      try {
        const response = await API.get("/dashboard", { params: projectFilter ? { project: projectFilter } : {} });
        setData(response.data);

        try {
          const summaryRes = await API.get("/ai/summary", { params: projectFilter ? { project: projectFilter } : {} });
          setAiSummary(summaryRes.data.summary);
        } catch (e) {
          setAiSummary("AI executive summary is offline. Ensure GROQ_API_KEY or GEMINI_API_KEY is configured in server/.env.");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatsAndSummary();
  }, [projectFilter]);

  if (loading) {
    return (
      <div className="loading-state">
        <span className="spinner" />
        <p>Loading analytics reports...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="error-state card">
        <Zap size={32} className="orange" style={{ color: "#ee9135" }} />
        <h3>Reports Engine Offline</h3>
        <p>Unable to retrieve report analytics from database services.</p>
        <button className="primary" onClick={() => window.location.reload()}>
          Retry Connection
        </button>
      </div>
    );
  }

  const { metrics, productivity } = data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="page-top">
        <div>
          <h2>Reports & insights</h2>
          <p>A clear view of performance, progress, and team throughput.</p>
        </div>
        <button className="primary" onClick={handlePrint}>
          <FileText size={17} /> Print / Export PDF
        </button>
      </div>

      <label className="form-grid" style={{ maxWidth: 360, marginBottom: 18 }}>
        Project filter
        <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
          <option value="">All accessible projects</option>
          {projectOptions.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
        </select>
      </label>

      <div className="report-banner">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} /> SYSTEM DIAGNOSTICS
          </span>
          <h2>Your project reports are synchronized.</h2>
          <p>Aggregates calculated from real tasks and projects in MongoDB.</p>
        </div>
        <button onClick={handlePrint}>
          Print report <ArrowRight size={16} />
        </button>
      </div>

      <div className="stat-grid report-stats">
        {[
          ["Health Score", `${metrics.healthScore}%`, "Delivery Pulse"],
          ["Total Tasks", metrics.totalTasks, "Registered tasks"],
          ["Completed Tasks", metrics.completedTasks, "Shipped work"],
          ["Delayed Scopes", metrics.delayedProjects, "Watchlist projects"]
        ].map((x) => (
          <div className="card stat" key={x[0]}>
            <div className="stat-label">{x[0]}</div>
            <strong>{x[1]}</strong>
            <span className="good">{x[2]}</span>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <section className="card chart-card">
          <div className="card-head">
            <div>
              <h3>Team productivity</h3>
              <p>Tasks completed by day of week</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={productivity}>
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#3154d9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="card report-summary">
          <div className="card-head">
            <div>
              <h3>AI Executive Summary</h3>
              <p>Dynamic workspace intelligence summary</p>
            </div>
          </div>
          <p style={{ fontStyle: "italic", lineHeight: "1.6", color: "var(--text)" }}>
            &quot;{aiSummary}&quot;
          </p>
          <hr style={{ margin: "16px 0", border: 0, borderTop: "1px solid var(--line)" }} />
          <h4>Portfolio Statistics</h4>
          <p className="checkline">
            <Check size={16} />
            Delivery pulse is computed at {metrics.healthScore}% overall health.
          </p>
          <p className="checkline">
            <Check size={16} />
            {metrics.completedTasks} of {metrics.totalTasks} total tasks completed.
          </p>
          <p className="checkline">
            <Check size={16} />
            {metrics.delayedProjects} projects currently flagged as delayed or on-hold.
          </p>
        </section>
      </div>
    </>
  );
}

/* ==========================================================================
   TEAM VIEW (P0)
   ========================================================================== */

function Team() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [query, setQuery] = useState("");

  const fetchTeam = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setTeamError("");
    try {
      const response = await API.get("/users");
      setTeamMembers(response.data);
      setLastUpdated(new Date());
    } catch (err) {
      setTeamError(err.response?.data?.message || "Unable to load team members.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam(true);
    const refresh = () => {
      if (document.visibilityState === "visible") fetchTeam(false);
    };
    const interval = setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchTeam]);
  const shownMembers = teamMembers.filter((member) => `${member.name} ${member.role} ${member.department}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <div className="page-top">
        <div>
          <h2>Your team</h2>
          <p>Task assignments and completion counts refresh automatically every 15 seconds.</p>
        </div>
        <button className="secondary" onClick={() => fetchTeam(false)} disabled={refreshing}>
          <RotateCw size={15} className={refreshing ? "spinner" : ""} /> {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {lastUpdated && <p className="muted" style={{ fontSize: 11, margin: "-8px 0 14px" }}>Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>}
      {teamError && teamMembers.length > 0 && <p role="status" className="form-error">Refresh failed; showing the last loaded team data. {teamError}</p>}

      <label className="search-box" style={{ marginBottom: 18, maxWidth: 360 }}>
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search team members..." />
      </label>

      {loading ? (
        <div className="loading-state">
          <span className="spinner" />
          <p>Loading team workloads...</p>
        </div>
      ) : (
        teamError && teamMembers.length === 0 ? (
          <div className="error-state card" role="alert">
            <h3>Team directory unavailable</h3>
            <p>{teamError}</p>
            <button className="primary" onClick={fetchTeam}>Retry</button>
          </div>
        ) : <div className="team-grid">
          {shownMembers.map((m) => (
            <article className="card member" key={m._id}>
              <div className="member-top">
                <span className="avatar big" style={{ background: m.color }}>
                  {m.initials}
                </span>
                <span className="badge">{m.tasks} assigned</span>
              </div>
              <h3>{m.name}</h3>
              <p>
                {m.role || "Team Member"} · {m.department || "Operations"}
              </p>

              <div className="member-stats">
                <div>
                  <b>{m.tasks}</b>
                  <span>Assigned</span>
                </div>
                <div>
                  <b>{m.done}</b>
                  <span>Completed</span>
                </div>
                <div>
                  <b>{m.active}</b>
                  <span>Active</span>
                </div>
              </div>

              <div className="progress-title">
                <span>Completion rate</span>
                <b>{m.completionRate}%</b>
              </div>
              <div className="progress">
                <i
                  style={{
                    width: `${m.completionRate}%`,
                    background: m.overdue > 0 ? "#e35f55" : "#3154d9"
                  }}
                />
              </div>
              {m.overdue > 0 && <p role="status" style={{ color: "#e35f55", fontSize: 11, marginBottom: 0 }}>{m.overdue} overdue {m.overdue === 1 ? "task" : "tasks"}</p>}
            </article>
          ))}
          {shownMembers.length === 0 && <div className="card" style={{ gridColumn: "1 / -1", padding: 28, textAlign: "center" }}>No team members match this search.</div>}
        </div>
      )}
    </>
  );
}

/* ==========================================================================
   SETTINGS VIEW (P2)
   ========================================================================== */

function SettingsPage({ dark, setDark, user, setUser }) {
  const [name, setName] = useState(user?.name || "");
  const [department, setDepartment] = useState(user?.department || "Operations");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [settingsTab, setSettingsTab] = useState("My profile");
  const [profileError, setProfileError] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.preferences?.notificationsEnabled !== false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setProfileError("");
    try {
      const response = await API.patch("/auth/profile", { name: name.trim(), department: department.trim() });
      setUser(response.data);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Profile save error", err);
      setProfileError(err.response?.data?.message || "Failed to update profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotificationPreference = async () => {
    setSettingsSaving(true);
    setSettingsMessage("");
    setSettingsError("");
    try {
      const response = await API.patch("/auth/preferences", { notificationsEnabled });
      setUser(response.data);
      setSettingsMessage("Notification preference saved.");
    } catch (err) {
      setSettingsError(err.response?.data?.message || "Could not save notification preference.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setSettingsMessage("");
    setSettingsError("");
    if (newPassword !== confirmPassword) {
      setSettingsError("New passwords do not match.");
      return;
    }
    setSettingsSaving(true);
    try {
      const response = await API.patch("/auth/password", { currentPassword, newPassword });
      setSettingsMessage(response.data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setSettingsError(err.response?.data?.message || "Could not update password.");
    } finally {
      setSettingsSaving(false);
    }
  };

  return (
    <div className="settings-wrap">
      <div className="settings-nav card">
        <h3>Workspace settings</h3>
        {["My profile", "Appearance", "Notifications", "Security"].map((x) => (
          <button className={settingsTab === x ? "active" : ""} key={x} onClick={() => setSettingsTab(x)}>
            {x}
          </button>
        ))}
      </div>

      <div className="settings-content">
        {settingsTab === "My profile" && <section className="card settings-section">
          <div className="card-head">
            <div>
              <h3>Personal information</h3>
              <p>Your details in the workspace database</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className="profile-edit" style={{ marginBottom: "16px" }}>
              <span className="avatar huge" style={{ background: "#3154d9" }}>
                {user?.name ? user.name.split(" ").map((n) => n[0]).join("") : "U"}
              </span>
            </div>

            {savedSuccess && (
              <div
                style={{
                  background: "rgba(31, 157, 120, 0.15)",
                  color: "#1f9d78",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  marginBottom: "12px",
                  fontSize: "12px"
                }}
              >
                Profile updated successfully!
              </div>
            )}
            {profileError && <p role="alert" className="form-error">{profileError}</p>}

            <div className="form-grid">
              <label>
                Full name
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label>
                Email address
                <input value={user?.email || ""} readOnly disabled style={{ opacity: 0.7 }} />
              </label>
              <label>
                Department
                <input value={department} onChange={(e) => setDepartment(e.target.value)} />
              </label>
              <label>
                Role
                <input value={user?.role || "Team Member"} readOnly disabled style={{ opacity: 0.7 }} />
              </label>
            </div>

            <button type="submit" className="primary" disabled={saving} style={{ marginTop: "16px" }}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </section>}

        {settingsTab === "Appearance" && <section className="card settings-section">
          <div className="card-head">
            <div>
              <h3>Preferences</h3>
              <p>Personalize your TaskFlow interface</p>
            </div>
          </div>
          <SettingRow
            title="Dark mode"
            text="Use the dark interface across the workspace"
            value={dark}
            change={setDark}
          />
        </section>}

        {settingsTab === "Notifications" && <section className="card settings-section">
          <div className="card-head"><div><h3>Notifications</h3><p>Choose whether in-app notifications appear in your workspace.</p></div></div>
          {settingsMessage && <p role="status" className="checkline">{settingsMessage}</p>}
          {settingsError && <p role="alert" className="form-error">{settingsError}</p>}
          <SettingRow title="In-app notifications" text="Show task assignment and activity notifications" value={notificationsEnabled} change={setNotificationsEnabled} />
          <button className="primary" onClick={handleSaveNotificationPreference} disabled={settingsSaving}>{settingsSaving ? "Saving..." : "Save preference"}</button>
        </section>}

        {settingsTab === "Security" && <section className="card settings-section">
          <div className="card-head"><div><h3>Change password</h3><p>Confirm your current password before choosing a new one.</p></div></div>
          {settingsMessage && <p role="status" className="checkline">{settingsMessage}</p>}
          {settingsError && <p role="alert" className="form-error">{settingsError}</p>}
          <form onSubmit={handleChangePassword}>
            <div className="form-grid">
              <label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
              <label>New password<input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
              <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
            </div>
            <button className="primary" type="submit" disabled={settingsSaving}>{settingsSaving ? "Updating..." : "Update password"}</button>
          </form>
        </section>}
      </div>
    </div>
  );
}

const SettingRow = ({ title, text, value, change }) => (
  <div className="setting-row">
    <div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
    <button className={`toggle ${value ? "on" : ""}`} onClick={() => change(!value)}>
      <i />
    </button>
  </div>
);

export default App;
