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
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,

} from "recharts";

export default function Dashboard({ user }) {
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

