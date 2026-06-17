import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3, Bell, BrainCircuit, CalendarDays, Check,
  ChevronDown, CircleHelp, ClipboardList, Clock3, Command, FolderKanban,
  Gauge, LayoutDashboard, Menu, Moon, MoreHorizontal, Plus, Search, Settings,
  Sparkles, Sun, Target, TrendingUp, Users, X, Zap, Layers3, CalendarRange
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { projects, tasks as seedTasks, team } from "./data";

const nav = [
  ["Dashboard", LayoutDashboard], ["Projects", FolderKanban], ["Tasks", ClipboardList],
  ["AI Workspace", BrainCircuit], ["Reports", BarChart3], ["Team", Users]
];

const progressData = [
  { name: "Jan", actual: 24, planned: 28 }, { name: "Feb", actual: 36, planned: 38 },
  { name: "Mar", actual: 45, planned: 48 }, { name: "Apr", actual: 58, planned: 57 },
  { name: "May", actual: 66, planned: 67 }, { name: "Jun", actual: 76, planned: 74 }
];
const productivity = [
  { name: "Mon", value: 62 }, { name: "Tue", value: 82 }, { name: "Wed", value: 71 },
  { name: "Thu", value: 91 }, { name: "Fri", value: 84 }, { name: "Sat", value: 42 }, { name: "Sun", value: 36 }
];

function App() {
  const [page, setPage] = useState("Dashboard");
  const [dark, setDark] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [tasks, setTasks] = useState(seedTasks);
  const [modal, setModal] = useState(null);

  const go = (next) => { setPage(next); setSidebar(false); window.scrollTo(0, 0); };
  return (
    <div className={dark ? "app dark" : "app"}>
      <Sidebar page={page} go={go} open={sidebar} close={() => setSidebar(false)} />
      <main className="main">
        <Header page={page} dark={dark} setDark={setDark} menu={() => setSidebar(true)} />
        <div className="content">
          <motion.div key={page} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>
            {page === "Dashboard" && <Dashboard go={go} />}
            {page === "Projects" && <Projects open={() => setModal("project")} />}
            {page === "Tasks" && <Tasks tasks={tasks} setTasks={setTasks} open={() => setModal("task")} />}
            {page === "AI Workspace" && <AIWorkspace />}
            {page === "Reports" && <Reports />}
            {page === "Team" && <Team />}
            {page === "Settings" && <SettingsPage dark={dark} setDark={setDark} />}
          </motion.div>
        </div>
      </main>
      {modal && <QuickModal type={modal} close={() => setModal(null)} addTask={(t) => setTasks([...tasks, t])} />}
    </div>
  );
}

function Sidebar({ page, go, open, close }) {
  const primary = nav.slice(0, 3);
  const intelligence = nav.slice(3);
  return <>
    {open && <div className="scrim" onClick={close} />}
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <button className="mobile-close icon-btn" onClick={close}><X size={18}/></button>
      <button className="brand" onClick={() => go("Dashboard")}><span className="brand-mark">T</span><span>taskflow<small>WORK OS</small></span></button>
      <div className="workspace"><span className="workspace-symbol">OS</span><div><strong>Orbit Studio</strong><small>Product operations</small></div><ChevronDown size={15}/></div>
      <span className="nav-label">Workspace</span>
      <nav>{primary.map(([label, Icon]) => <button key={label} onClick={() => go(label)} className={page === label ? "active" : ""}><Icon size={18}/><span>{label}</span>{page === label && <i className="nav-active-dot"/>}</button>)}</nav>
      <span className="nav-label">Intelligence</span>
      <nav>{intelligence.map(([label, Icon]) => <button key={label} onClick={() => go(label)} className={page === label ? "active" : ""}><Icon size={18}/><span>{label}</span>{label === "AI Workspace" && <i className="ai-signal">03</i>}</button>)}</nav>
      <div className="capacity-card"><div><span>Team capacity</span><b>78%</b></div><div className="capacity-track"><i/></div><small>12 hours available this week</small></div>
      <div className="sidebar-bottom">
        <button onClick={() => go("Settings")} className={page === "Settings" ? "active" : ""}><Settings size={18}/><span>Settings</span></button>
        <button><CircleHelp size={18}/><span>Help & support</span></button>
        <div className="user-card"><span className="avatar coral">BK</span><div><strong>Bharath Kumar</strong><small>Project lead</small></div><MoreHorizontal size={17}/></div>
      </div>
    </aside>
  </>;
}

function Header({ page, dark, setDark, menu }) {
  return <header className="header">
    <button className="menu icon-btn" onClick={menu}><Menu size={20}/></button>
    <div className="header-title"><span>Orbit Studio / <b>{page}</b></span><h1>{page === "Dashboard" ? "Command center" : page}</h1></div>
    <div className="header-actions">
      <label className="global-search"><Search size={17}/><input placeholder="Search workspace"/><kbd>⌘ K</kbd></label>
      <button className="icon-btn" onClick={() => setDark(!dark)}>{dark ? <Sun size={19}/> : <Moon size={19}/>}</button>
      <button className="icon-btn notification"><Bell size={19}/><span/></button>
      <span className="avatar coral">BK</span>
    </div>
  </header>;
}

function Dashboard({ go }) {
  const stats = [
    ["Portfolio value", "24", "projects", "+3 this quarter", FolderKanban, "ink"],
    ["Delivery pulse", "86%", "on track", "+6.4% velocity", Activity, "cobalt"],
    ["Work shipped", "148", "tasks", "18% above target", Check, "mint"],
    ["Risk exposure", "03", "projects", "2 need action", Zap, "citrus"]
  ];
  return <>
    <section className="welcome command-hero">
      <div className="hero-copy"><span className="eyebrow"><span className="live-dot"/> LIVE PORTFOLIO · JUNE 10</span><h2>Move the work that matters.</h2><p>Delivery is ahead of plan, but <b>Cloud Migration</b> needs a decision before Friday.</p></div>
      <div className="hero-actions"><button className="hero-quiet"><CalendarRange size={17}/> Week 24</button><button className="primary" onClick={() => go("AI Workspace")}><Sparkles size={17}/> Ask TaskFlow</button></div>
    </section>
    <div className="stat-grid">{stats.map(([l,v,u,d,I,c]) => <div className={`card stat metric-${c}`} key={l}><div className="stat-top"><div className={`stat-icon ${c}`}><I size={19}/></div><span className="metric-menu">•••</span></div><div className="stat-label">{l}</div><div className="stat-value"><strong>{v}</strong><small>{u}</small></div><span className="metric-trend"><ArrowUpRight size={13}/>{d}</span></div>)}</div>
    <div className="dashboard-grid">
      <section className="card chart-card velocity-card">
        <CardHead title="Delivery velocity" sub="Cumulative portfolio completion" action="Last 6 months"/>
        <div className="chart-kpis"><div><span>Current</span><b>76%</b><small>+9 pts since May</small></div><div className="chart-key"><span><i className="key-actual"/>Actual</span><span><i className="key-plan"/>Planned</span></div></div>
        <ResponsiveContainer width="100%" height={280}><AreaChart data={progressData} margin={{top:10,right:8,left:-18,bottom:0}}><defs><linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3154d9" stopOpacity=".22"/><stop offset="100%" stopColor="#3154d9" stopOpacity=".01"/></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="2 6"/><XAxis dataKey="name" axisLine={false} tickLine={false}/><YAxis domain={[0,100]} axisLine={false} tickLine={false}/><Tooltip content={<VelocityTooltip/>}/><Area type="monotone" dataKey="actual" stroke="#3154d9" strokeWidth={3} fill="url(#actualFill)" activeDot={{r:5,fill:"#3154d9",stroke:"#fff",strokeWidth:3}}/><Line type="monotone" dataKey="planned" stroke="#a7a9b2" strokeWidth={2} strokeDasharray="6 6" dot={false}/></AreaChart></ResponsiveContainer>
      </section>
      <section className="card chart-card health-card">
        <CardHead title="Portfolio health" sub="Project status, weighted by scope" action="24 projects"/>
        <div className="health-visual"><ResponsiveContainer width="100%" height={210}><PieChart><Pie data={[{name:"On track",v:68},{name:"At risk",v:20},{name:"Blocked",v:12}]} dataKey="v" innerRadius={68} outerRadius={92} startAngle={90} endAngle={-270} paddingAngle={2} cornerRadius={8}>{["#3154d9","#e9a23b","#e35f55"].map(c=><Cell key={c} fill={c}/>)}</Pie><text x="50%" y="46%" textAnchor="middle" className="donut-num">86</text><text x="50%" y="58%" textAnchor="middle" className="donut-label">HEALTH SCORE</text></PieChart></ResponsiveContainer></div>
        <div className="health-list">{[["On track","16","68%","blue"],["At risk","5","20%","amber"],["Blocked","3","12%","red"]].map(x=><div key={x[0]}><i className={x[3]}/><span>{x[0]}</span><b>{x[1]}</b><small>{x[2]}</small></div>)}</div>
      </section>
    </div>
    <div className="grid-2 lower operations-row">
      <section className="card focus-card"><CardHead title="Focus portfolio" sub="Highest-impact work right now" action="Open portfolio" onClick={() => go("Projects")}/><div className="project-list">{projects.slice(0,4).map((p,i)=><div className="project-row" key={p.id}><span className="row-index">0{i+1}</span><div className="grow"><strong>{p.name}</strong><small>{p.status} · {p.members.length} owners · Due {p.due}</small></div><div className="mini-progress"><b>{p.progress}%</b><span><i style={{width:`${p.progress}%`}}/></span></div><ArrowRight size={16}/></div>)}</div></section>
      <section className="card signal-card"><div className="signal-head"><div><span className="eyebrow"><Sparkles size={13}/> TASKFLOW SIGNALS</span><h3>Three things need your attention.</h3></div><span className="signal-count">03</span></div><div className="insights"><Insight color="orange" icon={Clock3} title="Cloud Migration is slipping" text="Approve the revised infrastructure scope today."/><Insight color="green" icon={TrendingUp} title="Design velocity is accelerating" text="Mobile App Redesign is 9 points ahead of plan."/><Insight color="violet" icon={Layers3} title="Sara is above capacity" text="Move two review tasks to Jordan for this sprint." /></div></section>
    </div>
  </>;
}

const VelocityTooltip = ({active,payload,label}) => active && payload?.length ? <div className="chart-tooltip"><small>{label} portfolio</small><b>{payload[0].value}% actual</b><span>{payload[1]?.value}% planned</span></div> : null;
const CardHead = ({title,sub,action,onClick}) => <div className="card-head"><div><h3>{title}</h3>{sub&&<p>{sub}</p>}</div>{action&&<button onClick={onClick}>{action}<ChevronDown size={14}/></button>}</div>;
const Insight = ({color,icon:Icon,title,text}) => <div className="insight"><span className={`insight-icon ${color}`}><Icon size={18}/></span><div><strong>{title}</strong><p>{text}</p></div><ArrowRight size={17}/></div>;

function Projects({ open }) {
  const [filter,setFilter]=useState("All");
  const [query,setQuery]=useState("");
  const shown=projects.filter(p=>(filter==="All"||p.status===filter)&&p.name.toLowerCase().includes(query.toLowerCase()));
  return <>
    <PageTop title="Your projects" text="Plan, track, and deliver exceptional work." button="New project" onClick={open}/>
    <div className="toolbar"><div className="tabs">{["All","Active","Planning","Completed","Delayed"].map(x=><button className={filter===x?"selected":""} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div><label className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search projects"/></label></div>
    <div className="project-grid">{shown.map((p,i)=><motion.article className="card project-card" key={p.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*.04}}><div className="project-card-top"><span className="project-logo large" style={{background:p.color}}>{p.name[0]}</span><MoreHorizontal size={19}/></div><span className={`badge ${p.status.toLowerCase().replace(" ","-")}`}>{p.status}</span><h3>{p.name}</h3><p>{p.desc}</p><div className="project-meta"><span><CalendarDays size={15}/> Due {p.due}</span><span className={`priority ${p.priority.toLowerCase()}`}>{p.priority}</span></div><div className="progress-title"><span>Progress</span><b>{p.progress}%</b></div><div className="progress"><i style={{width:`${p.progress}%`,background:p.color}}/></div><div className="project-footer"><div className="avatar-stack">{p.members.map((m,j)=><span className="avatar tiny" key={m} style={{background:["#7c5cff","#ec7a9c","#42bfa5"][j]}}>{m}</span>)}</div><button>Open project <ArrowRight size={15}/></button></div></motion.article>)}</div>
  </>;
}

function Tasks({tasks,setTasks,open}) {
  const cols=["Todo","In Progress","Review","Completed"];
  const advance=(task)=>{const i=cols.indexOf(task.status); if(i<3)setTasks(tasks.map(t=>t.id===task.id?{...t,status:cols[i+1]}:t));};
  return <>
    <PageTop title="Task board" text="Stay focused and move work forward." button="Add task" onClick={open}/>
    <div className="kanban">{cols.map((col,ci)=><section className="kanban-col" key={col}><div className="kanban-head"><div><i className={`dot c${ci}`}/><b>{col}</b><span>{tasks.filter(t=>t.status===col).length}</span></div><Plus size={17}/></div><div className="task-stack">{tasks.filter(t=>t.status===col).map(t=><article className="card task-card" key={t.id}><div><span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span><MoreHorizontal size={17}/></div><h4>{t.title}</h4><p>{t.project}</p><div className="task-footer"><span className={t.due==="Today"?"due-now":""}><Clock3 size={14}/>{t.due}</span><span className="avatar tiny">{t.assignee}</span></div>{col!=="Completed"&&<button className="advance" onClick={()=>advance(t)}>Move to {cols[ci+1]} <ArrowRight size={13}/></button>}</article>)}</div></section>)}</div>
  </>;
}

function AIWorkspace() {
  const [tool,setTool]=useState("Project planner");
  const [prompt,setPrompt]=useState("Build an e-commerce website in 8 weeks");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const run=()=>{setLoading(true);setResult(null);setTimeout(()=>{setLoading(false);setResult({
    phases:[["Discovery & Strategy","Week 1","Requirements, market research, technical architecture"],["Design & Prototype","Weeks 2–3","User flows, design system, interactive prototype"],["Development","Weeks 4–6","Storefront, checkout, admin dashboard, integrations"],["QA & Launch","Weeks 7–8","Testing, optimization, deployment and handoff"]],
    risks:["Payment integration delays","Scope growth during development","Insufficient load testing"],
    roles:["Product Manager","UI/UX Designer","2 Full-stack Engineers","QA Engineer"]
  })},1200)};
  const tools=[["Project planner",Target],["Task breakdown",ClipboardList],["Sprint planner",Zap],["Risk analyzer",Gauge],["Weekly report",BarChart3]];
  return <div className="ai-layout">
    <aside className="ai-tools"><span className="eyebrow"><Sparkles size={14}/> AI TOOLKIT</span><h2>Work smarter.</h2><p>Turn ideas into actionable plans in seconds.</p>{tools.map(([x,I])=><button className={tool===x?"active":""} onClick={()=>{setTool(x);setResult(null)}} key={x}><I size={18}/><span>{x}</span><ArrowRight size={15}/></button>)}</aside>
    <div className="ai-main"><section className="ai-hero"><div className="ai-orb"><BrainCircuit size={34}/></div><span className="eyebrow">TASKFLOW INTELLIGENCE</span><h2>{tool}</h2><p>Describe what you want to accomplish. Our AI will build a clear, practical plan around your team and timeline.</p><div className="prompt-box"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe your project or task..."/><div><span>{prompt.length}/500</span><button className="primary" onClick={run} disabled={loading}>{loading?<span className="spinner"/>:<Sparkles size={17}/>} {loading?"Thinking...":"Generate plan"}</button></div></div><div className="suggestions"><span>Try:</span>{["Launch a mobile app","Plan a 2-week sprint","Analyze delivery risks"].map(x=><button onClick={()=>setPrompt(x)} key={x}>{x}</button>)}</div></section>
    {result&&<motion.section className="results" initial={{opacity:0,y:15}} animate={{opacity:1,y:0}}><div className="result-title"><div><span className="eyebrow"><Sparkles size={14}/> GENERATED PLAN</span><h2>8-week e-commerce launch</h2></div><button className="secondary"><Plus size={16}/> Import to projects</button></div><div className="phase-list">{result.phases.map((p,i)=><div className="card phase" key={p[0]}><span>{i+1}</span><div><small>{p[1]}</small><h3>{p[0]}</h3><p>{p[2]}</p></div></div>)}</div><div className="result-grid"><div className="card"><h3>Recommended team</h3>{result.roles.map(x=><p className="checkline" key={x}><Check size={15}/>{x}</p>)}</div><div className="card"><h3>Estimated risks</h3>{result.risks.map(x=><p className="riskline" key={x}><Zap size={15}/>{x}</p>)}</div></div></motion.section>}</div>
  </div>;
}

function Reports() {
  return <>
    <PageTop title="Reports & insights" text="A clear view of performance, progress, and risk." button="Generate AI report"/>
    <div className="report-banner"><div><span className="eyebrow"><Sparkles size={14}/> WEEKLY INTELLIGENCE</span><h2>Your executive report is ready.</h2><p>AI analyzed 24 projects, 228 tasks, and your team's workload for June 3–9.</p></div><button>Open report <ArrowRight size={16}/></button></div>
    <div className="stat-grid report-stats">{[["Delivery rate","92%","+6.4%"],["Avg. cycle time","3.2d","-0.8d"],["Team utilization","78%","+3.1%"],["Risk exposure","Medium","Improving"]].map(x=><div className="card stat" key={x[0]}><div className="stat-label">{x[0]}</div><strong>{x[1]}</strong><span className="good">{x[2]}</span></div>)}</div>
    <div className="grid-2"><section className="card chart-card"><CardHead title="Team productivity" sub="Tasks completed by day"/><ResponsiveContainer width="100%" height={250}><BarChart data={productivity}><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3"/><XAxis dataKey="name" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="value" fill="#7c5cff" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></section><section className="card report-summary"><CardHead title="AI executive summary" sub="Generated from workspace activity"/><p>Delivery velocity improved this week, driven by strong progress on the Mobile App Redesign and Customer Portal. Cloud Migration remains the primary schedule risk.</p><h4>Recommendations</h4><p className="checkline"><Check size={16}/>Move two backend tasks from Taylor to Jordan.</p><p className="checkline"><Check size={16}/>Schedule a scope review for Cloud Migration.</p><p className="checkline"><Check size={16}/>Prioritize overdue review-stage tasks.</p></section></div>
  </>;
}

function Team() {
  return <>
    <PageTop title="Your team" text="Manage capacity, assignments, and performance." button="Invite member"/>
    <div className="team-grid">{team.map(m=><article className="card member" key={m.name}><div className="member-top"><span className="avatar big" style={{background:m.color}}>{m.initials}</span><MoreHorizontal size={18}/></div><h3>{m.name}</h3><p>{m.role}</p><div className="member-stats"><div><b>{m.tasks}</b><span>Assigned</span></div><div><b>{m.done}</b><span>Completed</span></div><div><b>{Math.round(m.done/m.tasks*100)}%</b><span>Success</span></div></div><div className="progress-title"><span>Workload</span><b>{m.workload}%</b></div><div className="progress"><i style={{width:`${m.workload}%`,background:m.workload>85?"#ec7a9c":"#7c5cff"}}/></div></article>)}</div>
  </>;
}

function SettingsPage({dark,setDark}) {
  const [email,setEmail]=useState(true); const [desktop,setDesktop]=useState(true);
  return <div className="settings-wrap"><div className="settings-nav card"><h3>Workspace settings</h3>{["My profile","Appearance","Notifications","Security","Billing"].map((x,i)=><button className={i===0?"active":""} key={x}>{x}</button>)}</div><div className="settings-content"><section className="card settings-section"><CardHead title="Personal information" sub="Update your profile details"/><div className="profile-edit"><span className="avatar huge">BK</span><button className="secondary">Change photo</button></div><div className="form-grid"><label>Full name<input defaultValue="Bharath Kumar"/></label><label>Email address<input defaultValue="bharath@taskflow.ai"/></label><label>Department<input defaultValue="Product & Operations"/></label><label>Role<input defaultValue="Project Manager"/></label></div><button className="primary">Save changes</button></section><section className="card settings-section"><CardHead title="Preferences" sub="Personalize your TaskFlow experience"/><SettingRow title="Dark mode" text="Use the dark interface across the workspace" value={dark} change={setDark}/><SettingRow title="Email notifications" text="Receive important updates by email" value={email} change={setEmail}/><SettingRow title="Desktop notifications" text="Show real-time alerts on this device" value={desktop} change={setDesktop}/></section></div></div>;
}
const SettingRow=({title,text,value,change})=><div className="setting-row"><div><strong>{title}</strong><p>{text}</p></div><button className={`toggle ${value?"on":""}`} onClick={()=>change(!value)}><i/></button></div>;
const PageTop=({title,text,button,onClick})=><div className="page-top"><div><h2>{title}</h2><p>{text}</p></div><button className="primary" onClick={onClick}><Plus size={17}/>{button}</button></div>;

function QuickModal({type,close,addTask}) {
  const submit=e=>{e.preventDefault(); if(type==="task"){const f=new FormData(e.currentTarget);addTask({id:Date.now(),title:f.get("title"),project:f.get("project"),priority:"Medium",due:"Jun 20",assignee:"BK",status:"Todo"})}close()};
  return <div className="modal-wrap"><div className="scrim" onClick={close}/><motion.form className="modal card" onSubmit={submit} initial={{opacity:0,scale:.96,y:10}} animate={{opacity:1,scale:1,y:0}}><div className="modal-head"><div><h2>Create {type}</h2><p>Add the essentials now. You can refine details later.</p></div><button type="button" className="icon-btn" onClick={close}><X size={18}/></button></div><label>{type==="task"?"Task title":"Project name"}<input name="title" required placeholder={type==="task"?"e.g. Design onboarding flow":"e.g. Website redesign"}/></label><label>Description<textarea placeholder="What needs to be accomplished?"/></label><label>Project<input name="project" defaultValue={type==="task"?"Mobile App Redesign":""} placeholder="Select a project"/></label><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Create {type}</button></div></motion.form></div>;
}

export default App;
