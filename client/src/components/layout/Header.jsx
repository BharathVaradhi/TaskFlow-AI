import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, Sun, Moon, Bell } from "lucide-react";
import API from "../../services/api";

export default function Header({ user, dark, setDark, menu }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ projects: [], tasks: [] });
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useMemo(() => ({ current: null }), []);
  const navigate = useNavigate();

  const getInitials = (name) => {
    if (!name) return "";
    return name.split(" ").map(n => n[0]).join("");
  };

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
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  return (
    <header className="header" style={{ position: "relative" }}>
      <button className="menu icon-btn" onClick={menu}><Menu size={20}/></button>
      <div className="header-title">
        <span>Orbit Studio</span>
        <h1>Command Center</h1>
      </div>
      <div className="header-actions">
        <div style={{ position: "relative" }}>
          <label className="global-search">
            <Search size={17}/>
            <input 
              ref={(el) => { searchInputRef.current = el; }}
              placeholder="Search workspace" 
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
            />
            <kbd>⌘ K</kbd>
          </label>
          
          {showResults && query.trim() && (
            <div className="card search-results-dropdown" style={{ 
              position: "absolute", 
              top: "100%", 
              left: 0, 
              right: 0, 
              marginTop: "8px", 
              zIndex: 999, 
              background: "var(--surface-1)", 
              border: "1px solid var(--line)", 
              borderRadius: "8px", 
              maxHeight: "300px", 
              overflowY: "auto",
              boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
              padding: "12px"
            }}>
              <style>{`
                .search-result-item:hover {
                  background: var(--surface-2);
                }
              `}</style>
              {results.projects.length === 0 && results.tasks.length === 0 ? (
                <div style={{ padding: "8px", color: "var(--muted)", fontSize: "13px" }}>No results found</div>
              ) : (
                <>
                  {results.projects.length > 0 && (
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>Projects</div>
                      {results.projects.map(p => (
                        <div key={p._id} style={{ padding: "6px 8px", cursor: "pointer", borderRadius: "4px", fontSize: "13px" }} className="search-result-item" onClick={() => navigate(`/projects/${p._id}`)}>
                          <strong>{p.name}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                  {results.tasks.length > 0 && (
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>Tasks</div>
                      {results.tasks.map(t => (
                        <div key={t._id} style={{ padding: "6px 8px", cursor: "pointer", borderRadius: "4px", fontSize: "13px" }} className="search-result-item" onClick={() => navigate(`/projects/${t.project?._id || ""}`)}>
                          <strong>{t.title}</strong>
                          <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "8px" }}>in {t.project?.name || "Independent"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <button className="icon-btn" onClick={() => setDark(!dark)}>{dark ? <Sun size={19}/> : <Moon size={19}/>}</button>
        <button className="icon-btn notification"><Bell size={19}/><span/></button>
        <span className="avatar coral">{getInitials(user?.name)}</span>
      </div>
    </header>
  );
}