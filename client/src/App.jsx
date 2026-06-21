import { useEffect, useState, useMemo } from "react";
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3, Bell, BrainCircuit, CalendarDays, Check,
  ChevronDown, CircleHelp, ClipboardList, Clock3, FolderKanban,
  Gauge, LayoutDashboard, Menu, Moon, MoreHorizontal, Plus, Search, Settings,
  Sparkles, Sun, Target, TrendingUp, Users, X, Zap, Layers3, CalendarRange, LogOut, FileText
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

// Components
import Login from "./components/Login";
import Register from "./components/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import ProjectDetails from "./components/ProjectDetails";

// Services
import authService from "./services/authService";
import projectService from "./services/projectService";
import taskService from "./services/taskService";
import aiService from "./services/aiService";
import API from "./services/api";

const nav = [
  ["Dashboard", "/", LayoutDashboard], 
  ["Projects", "/projects", FolderKanban], 
  ["Tasks", "/tasks", ClipboardList],
  ["AI Workspace", "/ai", BrainCircuit], 
  ["Reports", "/reports", BarChart3], 
  ["Team", "/team", Users]
];

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [dark, setDark] = useState(false);
  const [sidebar, setSidebar] = useState(false);

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
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout
              user={user}
              logout={handleLogout}
              dark={dark}
              setDark={setDark}
              sidebar={sidebar}
              setSidebar={setSidebar}
            />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function MainLayout({ user, logout, dark, setDark, sidebar, setSidebar }) {
  return (
    <div className={dark ? "app dark" : "app"}>
      <Sidebar user={user} logout={logout} open={sidebar} close={() => setSidebar(false)} />
      <main className="main">
        <Header user={user} dark={dark} setDark={setDark} menu={() => setSidebar(true)} />
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/ai" element={<AIWorkspace />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/team" element={<Team />} />
            <Route path="/settings" element={<SettingsPage dark={dark} setDark={setDark} user={user} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function Sidebar({ user, logout, open, close }) {
  const location = useLocation();

  const getInitials = (name) => {
    if (!name) return "";
    return name.split(" ").map(n => n[0]).join("");
  };

  return (
    <>
      {open && <div className="scrim" onClick={close} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        {/* Mobile close toggle */}
        <button className="mobile-close icon-btn" onClick={close}><X size={16}/></button>
        
        {/* Header Branding Container */}
        <div className="sidebar-header">
          <Link to="/" className="brand" onClick={close}>
            <span className="brand-mark">T</span>
            <span className="brand-text">TaskFlow</span>
          </Link>
        </div>
        
        {/* Unified Navigation System */}
        <nav className="sidebar-nav">
          {nav.map(([label, path, Icon]) => {
            const isActive = location.pathname === path;
            return (
              <Link 
                key={label} 
                to={path} 
                onClick={close} 
                className={`sidebar-nav-item ${isActive ? "active" : ""}`}
              >
                <Icon size={16} className="nav-icon"/>
                <span className="nav-label-text">{label}</span>
                {label === "AI Workspace" && <span className="ai-badge">AI</span>}
              </Link>
            );
          })}
        </nav>
        
        {/* Grounded Utility Footer & Profile */}
        <div className="sidebar-footer">
          <div className="footer-utilities">
            <Link 
              to="/settings" 
              onClick={close} 
              className={`sidebar-utility-btn ${location.pathname === "/settings" ? "active" : ""}`}
            >
              <Settings size={15}/>
              <span>Settings</span>
            </Link>
            <button onClick={logout} className="sidebar-utility-btn logout">
              <LogOut size={15}/>
              <span>Log Out</span>
            </button>
          </div>
          
          <div className="user-profile-card">
            <span className="avatar coral">{getInitials(user?.name)}</span>
            <div className="user-info">
              <span className="user-name">{user?.name || "Member"}</span>
              <span className="user-role">{user?.role || "Team Member"}</span>
            </div>
            <MoreHorizontal size={14} className="profile-more"/>
          </div>
        </div>
      </aside>
    </>
  );
}

function Header({ user, dark, setDark, menu }) {
  const getInitials = (name) => {
    if (!name) return "";
    return name.split(" ").map(n => n[0]).join("");
  };

  return (
    <header className="header">
      <button className="menu icon-btn" onClick={menu}><Menu size={20}/></button>
      <div className="header-title">
        <span>Orbit Studio</span>
        <h1>Command Center</h1>
      </div>
      <div className="header-actions">
        <label className="global-search"><Search size={17}/><input placeholder="Search workspace"/><kbd>⌘ K</kbd></label>
        <button className="icon-btn" onClick={() => setDark(!dark)}>{dark ? <Sun size={19}/> : <Moon size={19}/>}</button>
        <button className="icon-btn notification"><Bell size={19}/><span/></button>
        <span className="avatar coral">{getInitials(user?.name)}</span>
      </div>
    </header>
  );
}

function Dashboard({ user }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await API.get("/dashboard");
        setDashboardData(response.data);
      } catch (err) {
        console.error("Dashboard data load failure", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="loading-state">
        <span className="spinner" />
        <p>Loading dashboard metrics...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="error-state card">
        <Zap size={32} className="orange" style={{ color: "#ee9135" }} />
        <h3>Workspace Connection Offline</h3>
        <p>Unable to connect to the backend services. Please ensure your Express server is running on port 5000 and MONGODB_URI is correctly configured.</p>
        <button className="primary" onClick={() => window.location.reload()}>
          Retry Connection
        </button>
      </div>
    );
  }

  const { metrics, statusCounts, projects, tasks, productivity } = dashboardData;

  const stats = [
    ["Portfolio value", metrics.totalProjects, "projects", "Live in MongoDB", FolderKanban, "ink"],
    ["Delivery pulse", `${metrics.healthScore}%`, "on track", "Active/Completed", Activity, "cobalt"],
    ["Work shipped", metrics.completedTasks, "tasks", "Completed", Check, "mint"],
    ["Risk exposure", metrics.delayedProjects, "projects", "Delayed/On Hold", Zap, "citrus"]
  ];

  // Recharts Pie Chart Formatter
  const donutData = [
    { name: "Active", v: statusCounts.Active || 0 },
    { name: "Planning", v: statusCounts.Planning || 0 },
    { name: "Completed", v: statusCounts.Completed || 0 },
    { name: "Delayed", v: statusCounts.Delayed || 0 },
    { name: "On Hold", v: statusCounts["On Hold"] || 0 }
  ].filter(item => item.v > 0);

  // Fill in fallback pie data if empty
  const pieData = donutData.length ? donutData : [
    { name: "Active", v: 1 }
  ];

  const colors = ["#3154d9", "#7357f4", "#1f9d78", "#e35f55", "#94a0b8"];

  // Planning chart progress trend data
  const progressData = [
    { name: "Jan", actual: 24, planned: 28 }, 
    { name: "Feb", actual: 36, planned: 38 },
    { name: "Mar", actual: 45, planned: 48 }, 
    { name: "Apr", actual: 58, planned: 57 },
    { name: "May", actual: 66, planned: 67 }, 
    { name: "Jun", actual: Math.max(metrics.healthScore, 60), planned: 74 }
  ];

  return (
    <>
      <section className="welcome command-hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="live-dot"/> LIVE PORTFOLIO OS</span>
          <h2>Hello, {user?.name || "Manager"}</h2>
          <p>TaskFlow AI connected to MongoDB Atlas. Your delivery engine is currently synchronized.</p>
        </div>
        <div className="hero-actions">
          <button className="hero-quiet"><CalendarRange size={17}/> Week 24</button>
          <button className="primary" onClick={() => navigate("/ai")}><Sparkles size={17}/> AI Assistant</button>
        </div>
      </section>

      <div className="stat-grid">
        {stats.map(([l, v, u, d, I, c]) => (
          <div className={`card stat metric-${c}`} key={l}>
            <div className="stat-top">
              <div className={`stat-icon ${c}`}><I size={19}/></div>
              <span className="metric-menu">•••</span>
            </div>
            <div className="stat-label">{l}</div>
            <div className="stat-value"><strong>{v}</strong><small>{u}</small></div>
            <span className="metric-trend"><ArrowUpRight size={13}/>{d}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="card chart-card velocity-card">
          <CardHead title="Delivery velocity" sub="Cumulative portfolio completion" action="Last 6 months"/>
          <div className="chart-kpis">
            <div>
              <span>Current Speed</span>
              <b>{metrics.healthScore}%</b>
              <small>Calculated on project states</small>
            </div>
            <div className="chart-key">
              <span><i className="key-actual"/>Actual</span>
              <span><i className="key-plan"/>Planned</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={progressData} margin={{top:10,right:8,left:-18,bottom:0}}>
              <defs>
                <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3154d9" stopOpacity=".22"/>
                  <stop offset="100%" stopColor="#3154d9" stopOpacity=".01"/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="2 6"/>
              <XAxis dataKey="name" axisLine={false} tickLine={false}/>
              <YAxis domain={[0, 100]} axisLine={false} tickLine={false}/>
              <Tooltip content={<VelocityTooltip/>}/>
              <Area type="monotone" dataKey="actual" stroke="#3154d9" strokeWidth={3} fill="url(#actualFill)" activeDot={{r:5,fill:"#3154d9",stroke:"#fff",strokeWidth:3}}/>
              <Line type="monotone" dataKey="planned" stroke="#a7a9b2" strokeWidth={2} strokeDasharray="6 6" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="card chart-card health-card">
          <CardHead title="Portfolio health" sub="Project distribution" action={`${projects.length} projects`}/>
          <div className="health-visual">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie 
                  data={pieData} 
                  dataKey="v" 
                  innerRadius={68} 
                  outerRadius={92} 
                  startAngle={90} 
                  endAngle={-270} 
                  paddingAngle={2} 
                  cornerRadius={8}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]}/>
                  ))}
                </Pie>
                <text x="50%" y="46%" textAnchor="middle" className="donut-num">{metrics.healthScore}</text>
                <text x="50%" y="58%" textAnchor="middle" className="donut-label">HEALTH SCORE</text>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="health-list">
            {pieData.map((item, idx) => (
              <div key={item.name}>
                <i style={{ backgroundColor: colors[idx % colors.length] }}/>
                <span>{item.name}</span>
                <b>{item.v}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid-2 lower operations-row">
        <section className="card focus-card">
          <CardHead title="Focus portfolio" sub="Live active projects in database" action="Open Portfolio" onClick={() => navigate("/projects")}/>
          <div className="project-list">
            {projects.slice(0, 4).map((p, i) => (
              <div className="project-row" key={p._id} style={{ cursor: "pointer" }} onClick={() => navigate(`/projects/${p._id}`)}>
                <span className="row-index">0{i+1}</span>
                <div className="grow">
                  <strong>{p.name}</strong>
                  <small>{p.status} · {p.members?.length || 0} members</small>
                </div>
                <div className="mini-progress">
                  <b>{p.progress}%</b>
                  <span><i style={{ width: `${p.progress}%`, backgroundColor: p.color || "#3154d9" }}/></span>
                </div>
                <ArrowRight size={16}/>
              </div>
            ))}
            {projects.length === 0 && (
              <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "13px", padding: "20px" }}>No projects registered yet.</p>
            )}
          </div>
        </section>

        <section className="card signal-card">
          <div className="signal-head">
            <div>
              <span className="eyebrow"><Sparkles size={13}/> TASKFLOW SIGNALS</span>
              <h3>Intelligence Insights</h3>
            </div>
            <span className="signal-count">02</span>
          </div>
          <div className="insights">
            {metrics.delayedProjects > 0 ? (
              <Insight color="orange" icon={Clock3} title="Schedule Slip warning" text={`${metrics.delayedProjects} project(s) require status overrides today.`}/>
            ) : (
              <Insight color="green" icon={TrendingUp} title="On-track delivery pulse" text="All registered projects are running within schedule boundaries."/>
            )}
            <Insight color="violet" icon={Layers3} title="Database Sync verified" text="React client is fully connected to Express server." />
          </div>
        </section>
      </div>
    </>
  );
}

const VelocityTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <small>{label} portfolio</small>
        <b>{payload[0].value}% actual</b>
        {payload[1] && <span>{payload[1].value}% planned</span>}
      </div>
    );
  }
  return null;
};

const CardHead = ({ title, sub, action, onClick }) => (
  <div className="card-head">
    <div>
      <h3>{title}</h3>
      {sub && <p>{sub}</p>}
    </div>
    {action && <button onClick={onClick}>{action}<ChevronDown size={14}/></button>}
  </div>
);

const Insight = ({ color, icon: Icon, title, text }) => (
  <div className="insight">
    <span className={`insight-icon ${color}`}><Icon size={18}/></span>
    <div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
    <ArrowRight size={17}/>
  </div>
);

function Projects() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
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
      setProjects([...projects, created]);
      setModalOpen(false);
    } catch (err) {
      console.error("Project creation failed", err);
    }
  };

  const shown = projects.filter((p) => {
    const matchesFilter = filter === "All" || p.status === filter;
    const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  return (
    <>
      <div className="page-top">
        <div>
          <h2>Your projects</h2>
          <p>Plan, track, and deliver exceptional work.</p>
        </div>
        <button className="primary" onClick={() => setModalOpen(true)}>
          <Plus size={17}/> New Project
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
          <Search size={17}/>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects..."/>
        </label>
      </div>

      {loading ? (
        <div className="loading-state">
          <span className="spinner" />
          <p>Loading projects...</p>
        </div>
      ) : (
        <div className="project-grid">
          {shown.map((p, i) => (
            <motion.article 
              className="card project-card" 
              key={p._id} 
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/projects/${p._id}`)}
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.04 }}
            >
              <div className="project-card-top">
                <span className="project-logo large" style={{ background: p.color || "#7c5cff" }}>
                  {p.name[0]}
                </span>
                <MoreHorizontal size={19}/>
              </div>
              <span className={`badge ${p.status.toLowerCase().replace(" ", "-")}`}>{p.status}</span>
              <h3>{p.name}</h3>
              <p>{p.description || "No description provided."}</p>
              
              <div className="project-meta">
                <span>
                  <CalendarDays size={15}/> Due {p.endDate ? new Date(p.endDate).toLocaleDateString() : "N/A"}
                </span>
                <span className={`priority ${p.priority.toLowerCase()}`}>{p.priority}</span>
              </div>
              
              <div className="progress-title">
                <span>Progress</span>
                <b>{p.progress}%</b>
              </div>
              <div className="progress">
                <i style={{ width: `${p.progress}%`, background: p.color || "#7c5cff" }}/>
              </div>
              
              <div className="project-footer" style={{ marginTop: "20px" }}>
                <div className="avatar-stack">
                  {p.members?.map((m, j) => (
                    <span className="avatar tiny" key={m._id} style={{ background: ["#7c5cff", "#ec7a9c", "#42bfa5"][j % 3] }}>
                      {m.avatar || m.name[0]}
                    </span>
                  ))}
                </div>
                <button onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p._id}`); }}>
                  Open project <ArrowRight size={15}/>
                </button>
              </div>
            </motion.article>
          ))}
          {!loading && shown.length === 0 && (
            <div className="card" style={{ gridColumn: "1/-1", padding: "40px", textAlign: "center", color: "var(--muted)" }}>
              <FolderKanban size={32} style={{ marginBottom: "12px" }} />
              <h3>No Projects Found</h3>
              <p>Try resetting filters or query parameters.</p>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <QuickModal 
          type="project" 
          close={() => setModalOpen(false)} 
          onSubmit={handleCreateProject}
        />
      )}
    </>
  );
}

function Tasks() {
  const cols = ["Todo", "In Progress", "Review", "Completed"];
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  useEffect(() => {
    fetchTasksAndProjects();
  }, []);

  const fetchTasksAndProjects = async () => {
    setLoading(true);
    try {
      const taskList = await taskService.getAll();
      setTasks(taskList);
      const projList = await projectService.getAll();
      setProjects(projList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const created = await taskService.create(taskData);
      // Reload lists to populate linked references
      const refreshed = await taskService.getAll();
      setTasks(refreshed);
      setModalOpen(false);
    } catch (err) {
      console.error("Task creation failed", err);
    }
  };

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

    // optimistic local state update
    const previousTasks = [...tasks];
    setTasks(tasks.map(t => t._id === taskId ? { ...t, status: targetStatus } : t));
    setDraggingId(null);
    setDragOverCol(null);

    try {
      await taskService.update(taskId, { status: targetStatus });
      
      // Compute project progress automatically when tasks are updated
      const movedTask = tasks.find(t => t._id === taskId);
      if (movedTask && movedTask.project?._id) {
        const projectId = movedTask.project._id;
        const projectTasks = tasks.map(t => t._id === taskId ? { ...t, status: targetStatus } : t)
                                  .filter(t => t.project?._id === projectId);
        const completedCount = projectTasks.filter(t => t.status === "Completed").length;
        const progress = projectTasks.length ? Math.round((completedCount / projectTasks.length) * 100) : 0;
        await projectService.update(projectId, { progress });
      }
    } catch (err) {
      console.error("Drop update failed", err);
      setTasks(previousTasks); // roll back
    }
  };

  const advance = async (task) => {
    const i = cols.indexOf(task.status);
    if (i < 3) {
      const nextCol = cols[i + 1];
      const previousTasks = [...tasks];
      setTasks(tasks.map(t => t._id === task._id ? { ...t, status: nextCol } : t));

      try {
        await taskService.update(task._id, { status: nextCol });
        
        if (task.project?._id) {
          const projectTasks = tasks.map(t => t._id === task._id ? { ...t, status: nextCol } : t)
                                    .filter(t => t.project?._id === task.project._id);
          const completedCount = projectTasks.filter(t => t.status === "Completed").length;
          const progress = projectTasks.length ? Math.round((completedCount / projectTasks.length) * 100) : 0;
          await projectService.update(task.project._id, { progress });
        }
      } catch (err) {
        console.error("Advance status failure", err);
        setTasks(previousTasks);
      }
    }
  };

  return (
    <>
      <div className="page-top">
        <div>
          <h2>Task board</h2>
          <p>Stay focused and move work forward.</p>
        </div>
        <button className="primary" onClick={() => setModalOpen(true)}>
          <Plus size={17}/> Add Task
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <span className="spinner" />
          <p>Loading task workflow...</p>
        </div>
      ) : (
        <div className="kanban">
          {cols.map((col, ci) => {
            const colTasks = tasks.filter(t => t.status === col);
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
                    <i className={`dot c${ci}`}/>
                    <b>{col}</b>
                    <span>{colTasks.length}</span>
                  </div>
                  <Plus size={17} style={{ cursor: "pointer" }} onClick={() => setModalOpen(true)}/>
                </div>

                <div className="task-stack" style={{ minHeight: "350px" }}>
                  {colTasks.map(t => {
                    const isDragging = draggingId === t._id;
                    return (
                      <article 
                        className={`card task-card ${isDragging ? "dragging" : ""}`} 
                        key={t._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t._id)}
                        onDragEnd={handleDragEnd}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className={`priority ${t.priority?.toLowerCase() || "medium"}`}>{t.priority || "Medium"}</span>
                          <MoreHorizontal size={17} style={{ color: "var(--muted)", cursor: "pointer" }}/>
                        </div>
                        <h4>{t.title}</h4>
                        <p>{t.project?.name || "Independent Task"}</p>
                        <div className="task-footer">
                          <span className={t.dueDate ? "" : ""}><Clock3 size={14}/> {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Today"}</span>
                          <span className="avatar tiny">{t.assignee?.name ? t.assignee.name.split(" ").map(n=>n[0]).join("") : "BK"}</span>
                        </div>
                        {col !== "Completed" && (
                          <button className="advance" onClick={() => advance(t)}>
                            Move to {cols[ci+1]} <ArrowRight size={13}/>
                          </button>
                        )}
                      </article>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div style={{ padding: "16px", textRendering: "geometricPrecision", textAlign: "center", border: "1px dashed var(--line)", borderRadius: "8px", color: "var(--muted)", fontSize: "11px" }}>
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
          close={() => setModalOpen(false)} 
          onSubmit={handleCreateTask}
        />
      )}
    </>
  );
}

function AIWorkspace() {
  const [tool, setTool] = useState("Project planner");
  const [prompt, setPrompt] = useState("Build an e-commerce website in 8 weeks");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const navigate = useNavigate();

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const plan = await aiService.generate(tool, prompt);
      setResult(plan);
    } catch (err) {
      console.error(err);
      alert("AI planning model generation failed. Ensure GEMINI_API_KEY is configured.");
    } finally {
      setLoading(false);
    }
  };

  const handleImportToDatabase = async () => {
    if (!result) return;
    setImporting(true);
    try {
      // 1. Create a project
      const createdProject = await projectService.create({
        name: result.name || prompt.substring(0, 30),
        description: result.description || `AI Generated Workspace for: ${prompt}`,
        status: "Planning",
        priority: "Medium"
      });

      // 2. Iterate phases and save as tasks linked to project
      if (result.phases && result.phases.length > 0) {
        for (const phase of result.phases) {
          await taskService.create({
            title: phase[0],
            description: `${phase[1]}: ${phase[2]}`,
            project: createdProject._id,
            priority: "Medium",
            status: "Todo"
          });
        }
      }

      alert(`AI Plan successfully imported! Created project "${createdProject.name}" with ${result.phases?.length || 0} subtasks.`);
      navigate(`/projects/${createdProject._id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to import AI workspace structures.");
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
        <span className="eyebrow"><Sparkles size={14}/> AI TOOLKIT</span>
        <h2>Work Smarter.</h2>
        <p>Turn ideas into actionable structures in seconds.</p>
        {tools.map(([x, Icon]) => (
          <button className={tool === x ? "active" : ""} onClick={() => { setTool(x); setResult(null); }} key={x}>
            <Icon size={18}/>
            <span>{x}</span>
            <ArrowRight size={15}/>
          </button>
        ))}
      </aside>
      
      <div className="ai-main">
        <section className="ai-hero">
          <div className="ai-orb"><BrainCircuit size={34}/></div>
          <span className="eyebrow">TASKFLOW INTELLIGENCE</span>
          <h2>{tool}</h2>
          <p>Describe your goal. Our AI model will extract milestones, project phases, and estimates.</p>
          <div className="prompt-box">
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe your project or task..."/>
            <div>
              <span>{prompt.length}/500</span>
              <button className="primary" onClick={run} disabled={loading}>
                {loading ? <span className="spinner"/> : <Sparkles size={17}/>} 
                {loading ? "Thinking..." : "Generate plan"}
              </button>
            </div>
          </div>
          <div className="suggestions">
            <span>Try:</span>
            {["Launch a mobile app", "Plan a 2-week sprint", "Analyze delivery risks"].map(x => (
              <button onClick={() => setPrompt(x)} key={x}>{x}</button>
            ))}
          </div>
        </section>

        {result && (
          <motion.section className="results" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <div className="result-title">
              <div>
                <span className="eyebrow"><Sparkles size={14}/> GENERATED PLAN</span>
                <h2>{result.name || "TaskFlow Schedule Layout"}</h2>
                <p>{result.description || "Synthesized timeline structures"}</p>
              </div>
              <button className="secondary" onClick={handleImportToDatabase} disabled={importing}>
                {importing ? <span className="spinner" /> : <Plus size={16}/>}
                {importing ? "Importing..." : "Import to projects"}
              </button>
            </div>
            
            <div className="phase-list">
              {result.phases?.map((p, i) => (
                <div className="card phase" key={i}>
                  <span>{i + 1}</span>
                  <div>
                    <small>{p[1]}</small>
                    <h3>{p[0]}</h3>
                    <p>{p[2]}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="result-grid">
              <div className="card">
                <h3>Recommended Team</h3>
                {result.roles?.map(x => <p className="checkline" key={x}><Check size={15}/>{x}</p>)}
              </div>
              <div className="card">
                <h3>Estimated Risks</h3>
                {result.risks?.map(x => <p className="riskline" key={x}><Zap size={15}/>{x}</p>)}
              </div>
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}

function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await API.get("/dashboard");
        setData(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

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
        <p>Unable to retrieve report analytics from database services. Please check server logs.</p>
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
          <p>A clear view of performance, progress, and risk.</p>
        </div>
        <button className="primary" onClick={handlePrint}>
          <FileText size={17}/> Export PDF
        </button>
      </div>

      <div className="report-banner">
        <div>
          <span className="eyebrow"><Sparkles size={14}/> SYSTEM DIAGNOSTICS</span>
          <h2>Your project reports are ready.</h2>
          <p>Workspace aggregates are loaded from database endpoints.</p>
        </div>
        <button onClick={handlePrint}>Print report <ArrowRight size={16}/></button>
      </div>

      <div className="stat-grid report-stats">
        {[
          ["Delivery rate", `${metrics.healthScore}%`, "Pulse score"],
          ["Completed tasks", metrics.completedTasks, "Shipped work"],
          ["Active members", "5", "Occupied seats"],
          ["Delayed scopes", metrics.delayedProjects, "Watchlist items"]
        ].map(x => (
          <div className="card stat" key={x[0]}>
            <div className="stat-label">{x[0]}</div>
            <strong>{x[1]}</strong>
            <span className="good">{x[2]}</span>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <section className="card chart-card">
          <CardHead title="Team productivity" sub="Tasks completed by day of week"/>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={productivity}>
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3"/>
              <XAxis dataKey="name" axisLine={false} tickLine={false}/>
              <YAxis axisLine={false} tickLine={false}/>
              <Tooltip/>
              <Bar dataKey="value" fill="#3154d9" radius={[6, 6, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </section>
        
        <section className="card report-summary">
          <CardHead title="AI Executive Summary" sub="Workspace activity summary"/>
          <p>
            Delivery pulse calculations show <b>{metrics.healthScore}%</b> overall health. 
            A total of <b>{metrics.completedTasks}</b> tasks have been marked completed. 
            Schedule alerts pinpoint {metrics.delayedProjects} project scopes on watchlist.
          </p>
          <h4>Seeded Team Status</h4>
          <p className="checkline"><Check size={16}/>Alex Morgan (Project Manager) has overall owner access.</p>
          <p className="checkline"><Check size={16}/>Sara Kim (Frontend Engineer) is allocated to Mobile redesign.</p>
          <p className="checkline"><Check size={16}/>Taylor Diaz (Backend Engineer) is managing data integrations.</p>
        </section>
      </div>
    </>
  );
}

function Team() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await API.get("/users");
        setTeamMembers(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  return (
    <>
      <div className="page-top">
        <div>
          <h2>Your team</h2>
          <p>Manage capacity, assignments, and performance.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <span className="spinner" />
          <p>Loading team workloads...</p>
        </div>
      ) : (
        <div className="team-grid">
          {teamMembers.map(m => (
            <article className="card member" key={m._id}>
              <div className="member-top">
                <span className="avatar big" style={{ background: m.color }}>{m.initials}</span>
                <MoreHorizontal size={18} style={{ color: "var(--muted)", cursor: "pointer" }}/>
              </div>
              <h3>{m.name}</h3>
              <p>{m.role || "Team Member"} · {m.department || "Operations"}</p>
              
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
                  <b>{m.tasks > 0 ? `${Math.round((m.done / m.tasks) * 100)}%` : "0%"}</b>
                  <span>Success</span>
                </div>
              </div>
              
              <div className="progress-title">
                <span>Workload</span>
                <b>{m.workload}%</b>
              </div>
              <div className="progress">
                <i style={{ width: `${m.workload}%`, background: m.workload > 85 ? "#e35f55" : "#3154d9" }}/>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function SettingsPage({ dark, setDark, user }) {
  const [email, setEmail] = useState(true);
  const [desktop, setDesktop] = useState(true);

  return (
    <div className="settings-wrap">
      <div className="settings-nav card">
        <h3>Workspace settings</h3>
        {["My profile", "Appearance", "Notifications", "Security", "Billing"].map((x, i) => (
          <button className={i === 0 ? "active" : ""} key={x}>{x}</button>
        ))}
      </div>
      
      <div className="settings-content">
        <section className="card settings-section">
          <CardHead title="Personal information" sub="Your details in workspace database"/>
          <div className="profile-edit">
            <span className="avatar huge" style={{ background: "#3154d9" }}>
              {user?.name ? user.name.split(" ").map(n=>n[0]).join("") : "BK"}
            </span>
            <button className="secondary">Change photo</button>
          </div>
          <div className="form-grid">
            <label>Full name<input defaultValue={user?.name} readOnly /></label>
            <label>Email address<input defaultValue={user?.email} readOnly /></label>
            <label>Department<input defaultValue={user?.department || "Operations"} readOnly /></label>
            <label>Role<input defaultValue={user?.role} readOnly /></label>
          </div>
          <button className="primary" onClick={() => alert("Personal details are locked under security policies.")}>Edit profile</button>
        </section>

        <section className="card settings-section">
          <CardHead title="Preferences" sub="Personalize your TaskFlow experience"/>
          <SettingRow title="Dark mode" text="Use the dark interface across the workspace" value={dark} change={setDark}/>
          <SettingRow title="Email notifications" text="Receive important updates by email" value={email} change={setEmail}/>
          <SettingRow title="Desktop notifications" text="Show real-time alerts on this device" value={desktop} change={setDesktop}/>
        </section>
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
      <i/>
    </button>
  </div>
);

function QuickModal({ type, projects, close, onSubmit }) {
  const submit = e => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    
    if (type === "task") {
      onSubmit({
        title: f.get("title"),
        description: f.get("description"),
        project: f.get("project"), // Real project object ID selected
        priority: f.get("priority") || "Medium",
        status: "Todo"
      });
    } else {
      // project
      onSubmit({
        name: f.get("title"),
        description: f.get("description"),
        priority: f.get("priority") || "Medium",
        status: "Planning"
      });
    }
  };

  return (
    <div className="modal-wrap">
      <div className="scrim" onClick={close}/>
      <motion.form 
        className="modal card" 
        onSubmit={submit} 
        initial={{ opacity: 0, scale: .96, y: 10 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        <div className="modal-head">
          <div>
            <h2>Create {type}</h2>
            <p>Add details to register on database.</p>
          </div>
          <button type="button" className="icon-btn" onClick={close}><X size={18}/></button>
        </div>

        <label>
          {type === "task" ? "Task title" : "Project name"}
          <input name="title" required placeholder={type === "task" ? "e.g. Design onboarding flow" : "e.g. Website redesign"}/>
        </label>
        
        <label>
          Description
          <textarea name="description" placeholder="What needs to be accomplished?"/>
        </label>

        {type === "task" && (
          <label>
            Project
            <select name="project" required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}>
              {projects && projects.length > 0 ? (
                projects.map(p => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))
              ) : (
                <option value="">No projects created yet</option>
              )}
            </select>
          </label>
        )}

        <label>
          Priority
          <select name="priority" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}>
            <option value="Low">Low</option>
            <option value="Medium" defaultValue>Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </label>

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={close}>Cancel</button>
          <button className="primary">Create {type}</button>
        </div>
      </motion.form>
    </div>
  );
}

export default App;
