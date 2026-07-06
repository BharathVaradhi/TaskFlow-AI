import { Link, useLocation } from "react-router-dom";

import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  BrainCircuit,
  BarChart3,
  Users,
  Settings,
  LogOut,
  MoreHorizontal,
  X,
} from "lucide-react";
const nav = [
  ["Dashboard", "/", LayoutDashboard], 
  ["Projects", "/projects", FolderKanban], 
  ["Tasks", "/tasks", ClipboardList],
  ["AI Workspace", "/ai", BrainCircuit], 
  ["Reports", "/reports", BarChart3], 
  ["Team", "/team", Users]
];
export default function Sidebar({ user, logout, open, close }) {
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