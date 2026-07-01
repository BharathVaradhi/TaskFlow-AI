import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function QuickModal({ type, projects, users = [], currentUser, close, onSubmit }) {
  const submit = e => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    
    if (type === "task") {
      onSubmit({
        title: f.get("title"),
        description: f.get("description"),
        project: f.get("project"),
        assignee: f.get("assignee") || null,
        priority: f.get("priority") || "Medium",
        status: "Todo"
      });
    } else {
      // project
      const selectedMembers = [];
      const checkboxElements = e.currentTarget.querySelectorAll("input[name='members']:checked");
      checkboxElements.forEach(cb => selectedMembers.push(cb.value));

      onSubmit({
        name: f.get("title"),
        description: f.get("description"),
        priority: f.get("priority") || "Medium",
        status: "Planning",
        members: selectedMembers
      });
    }
  };

  return (
    <div className="modal-wrap" style={{ zIndex: 1000 }}>
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

        {type === "task" && users.length > 0 && (
          <label>
            Assignee
            <select name="assignee" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--text)" }}>
              <option value="">Unassigned</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.role || "Member"})</option>
              ))}
            </select>
          </label>
        )}

        {type === "project" && users.length > 0 && (
          <label>
            Assign Team Members
            <div className="members-select-grid" style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr", 
              gap: "8px", 
              marginTop: "5px", 
              maxHeight: "120px", 
              overflowY: "auto", 
              padding: "8px", 
              border: "1px solid var(--line)", 
              borderRadius: "8px", 
              background: "var(--surface-2)" 
            }}>
              {users.filter(u => u._id !== currentUser?._id).map(u => (
                <label key={u._id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer", margin: 0 }}>
                  <input type="checkbox" name="members" value={u._id} style={{ width: "auto", margin: 0 }} />
                  <span>{u.name}</span>
                </label>
              ))}
            </div>
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
