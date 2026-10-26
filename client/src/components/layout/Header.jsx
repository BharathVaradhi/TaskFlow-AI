import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, Sun, Moon, Bell, Check, Clock, ExternalLink } from "lucide-react";
import API from "../../services/api";
import notificationService from "../../services/notificationService";

export default function Header({ user, dark, setDark, menu }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ projects: [], tasks: [] });
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useMemo(() => ({ current: null }), []);
  const navigate = useNavigate();

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  const getInitials = (name) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Keyboard shortcut for Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchInputRef]);

  // Click outside to close notifications dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications
  const loadNotifications = async () => {
    try {
      const data = await notificationService.getAll();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      // Graceful fallback if database offline
    }
  };

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    // Polling sync interval for cross-user collaboration
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadNotifications();
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [user]);

  // Search debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults({ projects: [], tasks: [] });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const response = await API.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(response.data);
      } catch (err) {
        console.error("Search error", err);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications read", err);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.read) {
        await notificationService.markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      setShowNotifications(false);
      if (notif.link) {
        navigate(notif.link);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="header" style={{ position: "relative" }}>
      <button className="menu icon-btn" onClick={menu} aria-label="Toggle menu">
        <Menu size={20} />
      </button>
      <div className="header-title">
        <span>Orbit Studio</span>
        <h1>Command Center</h1>
      </div>
      <div className="header-actions">
        {/* Global Search Bar */}
        <div style={{ position: "relative" }}>
          <label className="global-search">
            <Search size={17} />
            <input
              ref={(el) => {
                searchInputRef.current = el;
              }}
              placeholder="Search workspace (⌘K)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 250)}
            />
            <kbd>⌘ K</kbd>
          </label>

          {showResults && query.trim() && (
            <div
              className="card search-results-dropdown"
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: "8px",
                zIndex: 999,
                background: "var(--surface-1, var(--surface))",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                maxHeight: "320px",
                overflowY: "auto",
                boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
                padding: "12px",
              }}
            >
              {results.projects.length === 0 && results.tasks.length === 0 ? (
                <div style={{ padding: "8px", color: "var(--muted)", fontSize: "13px" }}>
                  No matches found for &quot;{query}&quot;
                </div>
              ) : (
                <>
                  {results.projects.length > 0 && (
                    <div style={{ marginBottom: "12px" }}>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: "var(--muted)",
                          marginBottom: "4px",
                        }}
                      >
                        Projects
                      </div>
                      {results.projects.map((p) => (
                        <div
                          key={p._id}
                          style={{
                            padding: "6px 8px",
                            cursor: "pointer",
                            borderRadius: "4px",
                            fontSize: "13px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                          className="search-result-item"
                          onClick={() => {
                            setShowResults(false);
                            navigate(`/projects/${p._id}`);
                          }}
                        >
                          <strong>{p.name}</strong>
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>{p.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {results.tasks.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: "var(--muted)",
                          marginBottom: "4px",
                        }}
                      >
                        Tasks
                      </div>
                      {results.tasks.map((t) => (
                        <div
                          key={t._id}
                          style={{
                            padding: "6px 8px",
                            cursor: "pointer",
                            borderRadius: "4px",
                            fontSize: "13px",
                          }}
                          className="search-result-item"
                          onClick={() => {
                            setShowResults(false);
                            navigate(`/tasks`);
                          }}
                        >
                          <strong>{t.title}</strong>
                          <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "8px" }}>
                            in {t.project?.name || "Workspace"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          className="icon-btn"
          onClick={() => setDark(!dark)}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          title={dark ? "Light mode" : "Dark mode"}
        >
          {dark ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        {/* Notifications Dropdown */}
        <div style={{ position: "relative" }} ref={notifRef}>
          <button
            className={`icon-btn notification ${unreadCount > 0 ? "has-unread" : ""}`}
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="View notifications"
            title="Notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>

          {showNotifications && (
            <div
              className="card notifications-popover"
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "10px",
                width: "320px",
                maxHeight: "420px",
                zIndex: 1000,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "10px",
                boxShadow: "0 10px 35px rgba(0,0,0,0.2)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <strong style={{ fontSize: "13px" }}>Notifications</strong>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        background: "var(--purple, #7357f4)",
                        color: "#fff",
                        fontSize: "10px",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        fontWeight: 600,
                      }}
                    >
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--purple, #7357f4)",
                      fontSize: "11px",
                      cursor: "pointer",
                      padding: "2px 4px",
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ overflowY: "auto", flex: 1, padding: "8px" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                    <Bell size={24} style={{ opacity: 0.4, marginBottom: "8px" }} />
                    <p style={{ margin: 0 }}>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => handleNotificationClick(n)}
                      style={{
                        padding: "10px",
                        borderRadius: "6px",
                        marginBottom: "4px",
                        cursor: "pointer",
                        background: n.read ? "transparent" : "var(--surface-2)",
                        borderLeft: n.read ? "3px solid transparent" : "3px solid var(--purple, #7357f4)",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: n.read ? 500 : 700,
                          color: "var(--text)",
                          marginBottom: "2px",
                        }}
                      >
                        {n.title}
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--muted)", margin: "0 0 4px 0", lineHeight: "1.4" }}>
                        {n.message}
                      </p>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "var(--muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Clock size={10} />
                        {new Date(n.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })} at{" "}
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <span className="avatar coral" title={user?.name || "User"}>
          {getInitials(user?.name)}
        </span>
      </div>
    </header>
  );
}
