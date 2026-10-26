import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

import {
  FolderKanban,
  Activity,
  Check,
  Zap,
  CalendarRange,
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  Clock3,
  ChevronDown,
  TrendingUp,
  Layers3,
  AlertTriangle,
  RotateCw,
  ClipboardList
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function Dashboard({ user }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchDashboard = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const response = await API.get("/dashboard");
      setDashboardData(response.data);
    } catch (err) {
      console.error("Dashboard data load failure", err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // Polling interval for live dashboard sync
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchDashboard();
      }
    }, 20000);

    return () => clearInterval(interval);
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
        <p>
          Unable to connect to the backend services. Please ensure your Express server is running on port 5000 and MONGODB_URI is correctly configured in server/.env.
        </p>
        <button className="primary" onClick={() => fetchDashboard(true)}>
          Retry Connection
        </button>
      </div>
    );
  }

  const { metrics, statusCounts, projects, tasks, productivity } = dashboardData;

  // Mutually consistent metrics (P1 Requirement)
  const totalTasks = metrics.totalTasks || tasks.length;
  const completedTasks = metrics.completedTasks || tasks.filter((t) => t.status === "Completed").length;
  const inProgressTasks = metrics.inProgressTasks || tasks.filter((t) => t.status === "In Progress").length;
  const pendingTasks = metrics.pendingTasks !== undefined ? metrics.pendingTasks : (totalTasks - completedTasks);
  const overdueTasks = metrics.overdueTasks || 0;

  const stats = [
    {
      label: "Total tasks",
      value: totalTasks,
      unit: "tasks",
      sub: "All accessible",
      icon: ClipboardList,
      color: "ink",
      link: "/tasks"
    },
    {
      label: "Pending tasks",
      value: pendingTasks,
      unit: "to do",
      sub: "Active workload",
      icon: Activity,
      color: "cobalt",
      link: "/tasks"
    },
    {
      label: "In progress",
      value: inProgressTasks,
      unit: "running",
      sub: "Under development",
      icon: TrendingUp,
      color: "purple",
      link: "/tasks"
    },
    {
      label: "Completed tasks",
      value: completedTasks,
      unit: "shipped",
      sub: `${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% completion`,
      icon: Check,
      color: "mint",
      link: "/tasks"
    },
    {
      label: "Overdue tasks",
      value: overdueTasks,
      unit: "delayed",
      sub: overdueTasks > 0 ? "Requires attention" : "All on schedule",
      icon: AlertTriangle,
      color: overdueTasks > 0 ? "citrus" : "mint",
      link: "/tasks"
    }
  ];

  // Pie chart data
  const donutData = [
    { name: "Active", v: statusCounts.Active || 0 },
    { name: "Planning", v: statusCounts.Planning || 0 },
    { name: "Completed", v: statusCounts.Completed || 0 },
    { name: "Delayed", v: statusCounts.Delayed || 0 },
    { name: "On Hold", v: statusCounts["On Hold"] || 0 }
  ].filter((item) => item.v > 0);

  const pieData = donutData.length ? donutData : [{ name: "No Projects", v: 1 }];
  const pieColors = ["#3154d9", "#7357f4", "#1f9d78", "#e35f55", "#94a0b8"];

  return (
    <>
      <section className="welcome command-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="live-dot" /> LIVE PORTFOLIO OS
          </span>
          <h2>Hello, {user?.name || "Workspace Lead"}</h2>
          <p>
            TaskFlow AI operational status: {metrics.totalProjects} projects registered, {totalTasks} tracked tasks.
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="hero-quiet"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            title="Refresh metrics"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <RotateCw size={15} className={refreshing ? "spinner" : ""} />
            {refreshing ? "Refreshing..." : "Sync"}
          </button>
          <button className="primary" onClick={() => navigate("/ai")}>
            <Sparkles size={17} /> AI Assistant
          </button>
        </div>
      </section>

      {/* Primary Lifecycle Metric Cards */}
      <div
        className="stat-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginBottom: "24px"
        }}
      >
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              className={`card stat metric-${s.color}`}
              key={s.label}
              onClick={() => navigate(s.link)}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-top">
                <div className={`stat-icon ${s.color}`}>
                  <Icon size={18} />
                </div>
                <span className="metric-menu" style={{ fontSize: "11px", color: "var(--muted)" }}>
                  Live
                </span>
              </div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">
                <strong>{s.value}</strong>
                <small>{s.unit}</small>
              </div>
              <span className="metric-trend" style={{ fontSize: "11px" }}>
                <ArrowUpRight size={12} />
                {s.sub}
              </span>
            </div>
          );
        })}
      </div>

      <div className="dashboard-grid">
        {/* Productivity Bar Chart */}
        <section className="card chart-card velocity-card">
          <CardHead
            title="Team productivity"
            sub="Tasks completed in the past 7 days"
            action={`${completedTasks} total shipped`}
            onClick={() => navigate("/tasks")}
          />
          <div className="chart-kpis">
            <div>
              <span>Delivery Health Score</span>
              <b>{metrics.healthScore}%</b>
              <small>Based on completed vs active workload</small>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={productivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  borderColor: "var(--line)",
                  borderRadius: "8px",
                  color: "var(--text)"
                }}
              />
              <Bar dataKey="value" fill="#3154d9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Portfolio Health Donut Chart */}
        <section className="card chart-card health-card">
          <CardHead
            title="Portfolio distribution"
            sub="Project status segmentation"
            action={`${projects.length} projects`}
            onClick={() => navigate("/projects")}
          />
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
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <text x="50%" y="46%" textAnchor="middle" className="donut-num" fill="var(--text)">
                  {metrics.healthScore}%
                </text>
                <text x="50%" y="58%" textAnchor="middle" className="donut-label" fill="var(--muted)">
                  HEALTH SCORE
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="health-list">
            {pieData.map((item, idx) => (
              <div key={item.name}>
                <i style={{ backgroundColor: pieColors[idx % pieColors.length] }} />
                <span>{item.name}</span>
                <b>{item.v}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid-2 lower operations-row">
        {/* Active Projects List */}
        <section className="card focus-card">
          <CardHead
            title="Focus portfolio"
            sub="Your active projects in workspace"
            action="View All"
            onClick={() => navigate("/projects")}
          />
          <div className="project-list">
            {projects.slice(0, 4).map((p, i) => (
              <div
                className="project-row"
                key={p._id}
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/projects/${p._id}`)}
              >
                <span className="row-index">0{i + 1}</span>
                <div className="grow">
                  <strong>{p.name}</strong>
                  <small>
                    {p.status} · {p.members?.length || 0} members · {p.priority} priority
                  </small>
                </div>
                <div className="mini-progress">
                  <b>{p.progress}%</b>
                  <span>
                    <i style={{ width: `${p.progress}%`, backgroundColor: p.color || "#3154d9" }} />
                  </span>
                </div>
                <ArrowRight size={16} />
              </div>
            ))}
            {projects.length === 0 && (
              <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "13px", padding: "20px" }}>
                No projects registered yet.
              </p>
            )}
          </div>
        </section>

        {/* Intelligence Signals */}
        <section className="card signal-card">
          <div className="signal-head">
            <div>
              <span className="eyebrow">
                <Sparkles size={13} /> TASKFLOW SIGNALS
              </span>
              <h3>Intelligence Insights</h3>
            </div>
            <span className="signal-count">02</span>
          </div>
          <div className="insights">
            {overdueTasks > 0 ? (
              <Insight
                color="orange"
                icon={Clock3}
                title="Overdue Tasks Detected"
                text={`${overdueTasks} task(s) have passed their due date and need status updates.`}
                onClick={() => navigate("/tasks")}
              />
            ) : (
              <Insight
                color="green"
                icon={TrendingUp}
                title="Delivery On Track"
                text="All tasks with due dates are currently within their target schedule."
                onClick={() => navigate("/tasks")}
              />
            )}
            {metrics.delayedProjects > 0 ? (
              <Insight
                color="orange"
                icon={AlertTriangle}
                title="Project Schedule Slip"
                text={`${metrics.delayedProjects} project(s) are delayed or placed on hold.`}
                onClick={() => navigate("/projects")}
              />
            ) : (
              <Insight
                color="violet"
                icon={Layers3}
                title="Portfolio Synchronized"
                text="Workspace database engine is active and serving real-time metrics."
                onClick={() => navigate("/projects")}
              />
            )}
          </div>
        </section>
      </div>
    </>
  );
}

const CardHead = ({ title, sub, action, onClick }) => (
  <div className="card-head">
    <div>
      <h3>{title}</h3>
      {sub && <p>{sub}</p>}
    </div>
    {action && (
      <button onClick={onClick} style={{ cursor: "pointer" }}>
        {action}
        <ChevronDown size={14} />
      </button>
    )}
  </div>
);

const Insight = ({ color, icon: Icon, title, text, onClick }) => (
  <div className="insight" onClick={onClick} style={{ cursor: "pointer" }}>
    <span className={`insight-icon ${color}`}>
      <Icon size={18} />
    </span>
    <div>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
    <ArrowRight size={17} />
  </div>
);
