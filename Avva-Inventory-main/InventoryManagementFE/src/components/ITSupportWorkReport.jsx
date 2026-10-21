import React, { useState, useEffect, useCallback } from "react";
import {
  FaShieldAlt,
  FaSearch,
  FaTimes,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
  FaUserTie,
  FaTicketAlt,
  FaCalendarAlt,
  FaClock,
  FaCheckCircle,
  FaClipboardList,
  FaFilter,
  FaSyncAlt,
  FaExclamationCircle,
  FaTrashAlt,
  FaEdit,
  FaSave,
  FaTimes as FaX,
  FaChartBar,
  FaWrench,
} from "react-icons/fa";
import api from "../utils/api";

// ─── Status colours ────────────────────────────────────────────────────────
const STATUS_COLORS = {
  "In Progress":     { bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.3)",  text: "#f59e0b" },
  "Pending Client":  { bg: "rgba(99,102,241,0.15)",  border: "rgba(99,102,241,0.3)",  text: "#818cf8" },
  "Pending Parts":   { bg: "rgba(249,115,22,0.15)",  border: "rgba(249,115,22,0.3)",  text: "#f97316" },
  "Resolved":        { bg: "rgba(34,197,94,0.15)",   border: "rgba(34,197,94,0.3)",   text: "#22c55e" },
  "Closed":          { bg: "rgba(107,114,128,0.15)", border: "rgba(107,114,128,0.3)", text: "#6b7280" },
};

const StatusChip = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS["In Progress"];
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`,
      color: c.text, borderRadius: "20px", padding: "3px 10px",
      fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
};

const WORK_STATUSES = ["In Progress", "Pending Client", "Pending Parts", "Resolved", "Closed"];

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmtDate   = (iso) => iso ? new Date(iso).toLocaleDateString() : "—";
const fmtTime   = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDT     = (iso) => iso ? new Date(iso).toLocaleString()     : "—";

function calcDuration(start, end) {
  if (!start || !end) return null;
  const ms = new Date(end) - new Date(start);
  if (ms < 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Local datetime input value (to avoid timezone shift in <input datetime-local>) ──
function toLocalInputVal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputVal(val) {
  if (!val) return null;
  return new Date(val).toISOString();
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════
const ITSupportWorkReport = () => {
  const [logs, setLogs]               = useState([]);
  const [devSummary, setDevSummary]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [total, setTotal]             = useState(0);
  const [pages, setPages]             = useState(1);
  const [page, setPage]               = useState(1);
  const PER_PAGE = 20;

  // Filters
  const [fDev,    setFDev]    = useState("");
  const [fTicket, setFTicket] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fFrom,   setFFrom]   = useState("");
  const [fTo,     setFTo]     = useState("");

  // Detail / edit
  const [selected,   setSelected]   = useState(null);  // view detail
  const [editing,    setEditing]     = useState(null);  // edit copy
  const [saving,     setSaving]      = useState(false);
  const [deleting,   setDeleting]    = useState(false);
  const [confirmDel, setConfirmDel]  = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        per_page: PER_PAGE,
        ...(fDev    && { developer: fDev }),
        ...(fTicket && { ticket: fTicket }),
        ...(fStatus && { status: fStatus }),
        ...(fFrom   && { date_from: fFrom }),
        ...(fTo     && { date_to:   fTo }),
      });
      const res = await api.get(`/it-support/work-logs/report?${params}`);
      setLogs(res.data.work_logs   || []);
      setTotal(res.data.total      || 0);
      setPages(res.data.pages      || 1);
      setDevSummary(res.data.developer_summary || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, fDev, fTicket, fStatus, fFrom, fTo]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const hasFilters = fDev || fTicket || fStatus || fFrom || fTo;
  const clearFilters = () => {
    setFDev(""); setFTicket(""); setFStatus(""); setFFrom(""); setFTo(""); setPage(1);
  };

  // ── Edit helpers ───────────────────────────────────────────────────────
  const openDetail = (log) => {
    setSelected(log);
    setEditing({ ...log });
    setConfirmDel(false);
  };
  const closeDetail = () => { setSelected(null); setEditing(null); setConfirmDel(false); };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        developer_name:    editing.developer_name,
        work_start:        fromLocalInputVal(toLocalInputVal(editing.work_start)),
        work_end:          editing.work_end ? fromLocalInputVal(toLocalInputVal(editing.work_end)) : null,
        actions_taken:     editing.actions_taken,
        status_after:      editing.status_after,
        resolution_details: editing.resolution_details || null,
        logged_by:         editing.logged_by || null,
      };
      const res = await api.put(`/it-support/work-logs/${editing.id}`, payload);
      const updated = res.data.work_log;
      setLogs(prev => prev.map(l => l.id === updated.id ? updated : l));
      setSelected(updated);
      setEditing({ ...updated });
      fetchReport();
    } catch {
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await api.delete(`/it-support/work-logs/${selected.id}`);
      setLogs(prev => prev.filter(l => l.id !== selected.id));
      setTotal(t => t - 1);
      closeDetail();
      fetchReport();
    } catch {
      alert("Failed to delete. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────
  const s = {
    page: { color: "#e2e8f0", fontFamily: "'Inter','Segoe UI',sans-serif", minHeight: "100vh" },
    title: {
      fontSize: "26px", fontWeight: "800",
      background: "linear-gradient(135deg,#818cf8,#4da6ff)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      backgroundClip: "text", display: "flex", alignItems: "center", gap: "12px",
    },
    sub: { color: "#6b7280", fontSize: "13px", marginTop: "4px" },
    card: {
      background: "linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px",
    },
    th: {
      textAlign: "left", padding: "11px 14px", fontSize: "11px",
      fontWeight: "700", color: "#6b7280", textTransform: "uppercase",
      letterSpacing: "0.5px", background: "rgba(0,0,0,0.2)",
      borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap",
    },
    td: { padding: "12px 14px", fontSize: "13px", borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "top" },
    filterInput: {
      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "10px", padding: "9px 12px", color: "#e2e8f0",
      fontSize: "13px", outline: "none",
    },
    filterSelect: {
      background: "rgba(30,41,59,0.9)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "10px", padding: "9px 12px", color: "#e2e8f0",
      fontSize: "13px", outline: "none", cursor: "pointer",
    },
    panelOverlay: {
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      zIndex: 999, backdropFilter: "blur(3px)",
    },
    panel: {
      position: "fixed", top: 0, right: 0, bottom: 0, width: "520px",
      zIndex: 1000, background: "linear-gradient(180deg,#111827,#0d1424)",
      borderLeft: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "-24px 0 60px rgba(0,0,0,0.6)",
      overflowY: "auto", fontFamily: "'Inter','Segoe UI',sans-serif",
    },
    inputStyle: {
      width: "100%", background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
      padding: "9px 12px", color: "#e2e8f0", fontSize: "13px",
      outline: "none", boxSizing: "border-box",
    },
    textareaStyle: {
      width: "100%", background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
      padding: "9px 12px", color: "#e2e8f0", fontSize: "13px",
      outline: "none", resize: "vertical", minHeight: "90px",
      boxSizing: "border-box", fontFamily: "inherit",
    },
    selectStyle: {
      width: "100%", background: "rgba(20,30,50,0.9)",
      border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px",
      padding: "9px 12px", color: "#e2e8f0", fontSize: "13px",
      outline: "none", boxSizing: "border-box", cursor: "pointer",
    },
    labelStyle: {
      fontSize: "11px", color: "#6b7280", textTransform: "uppercase",
      letterSpacing: "0.5px", fontWeight: "700", display: "block", marginBottom: "6px",
    },
    saveBtn: {
      background: "linear-gradient(135deg,#4da6ff,#818cf8)",
      border: "none", borderRadius: "10px", padding: "11px 18px",
      color: "#fff", fontWeight: "700", cursor: "pointer", fontSize: "13px",
      display: "flex", alignItems: "center", gap: "8px", flex: 1, justifyContent: "center",
    },
    deleteBtn: (confirm) => ({
      background: confirm ? "linear-gradient(135deg,#ef4444,#b91c1c)" : "rgba(239,68,68,0.1)",
      border: confirm ? "none" : "1px solid rgba(239,68,68,0.25)",
      borderRadius: "10px", padding: "11px 18px",
      color: confirm ? "#fff" : "#ef4444",
      fontWeight: "700", cursor: "pointer", fontSize: "13px",
      display: "flex", alignItems: "center", gap: "8px",
    }),
  };

  // ── Summary cards ──────────────────────────────────────────────────────
  const SummaryCards = () => {
    const top3 = devSummary.slice(0, 3);
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "22px" }}>
        {[
          { label: "Total Work Logs", value: total, color: "#818cf8", icon: <FaClipboardList /> },
          { label: "Developers Active", value: devSummary.length, color: "#4da6ff", icon: <FaUserTie /> },
          { label: "Filtered Results", value: total, color: "#22c55e", icon: <FaChartBar /> },
        ].map((c, i) => (
          <div key={i} style={{
            background: `linear-gradient(135deg,${c.color}15,${c.color}08)`,
            border: `1px solid ${c.color}30`, borderRadius: "14px", padding: "18px",
          }}>
            <div style={{ color: c.color, fontSize: "18px", marginBottom: "8px" }}>{c.icon}</div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: c.color, lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "4px" }}>{c.label}</div>
          </div>
        ))}
      </div>
    );
  };

  // ── Developer summary bar ──────────────────────────────────────────────
  const DevSummaryBar = () => {
    if (!devSummary.length) return null;
    const max = devSummary[0]?.total_logs || 1;
    return (
      <div style={{ ...s.card, padding: "20px", marginBottom: "22px" }}>
        <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" }}>
          Developer Activity Summary
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {devSummary.map((d, i) => {
            const pct = Math.round((d.total_logs / max) * 100);
            const colors = ["#818cf8","#4da6ff","#22c55e","#f59e0b","#f97316","#ec4899"];
            const c = colors[i % colors.length];
            return (
              <div key={d.developer} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "120px", color: "#e2e8f0", fontSize: "13px", fontWeight: "600", flexShrink: 0 }}>{d.developer}</div>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: "6px", height: "8px", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,${c},${c}aa)`, borderRadius: "6px", transition: "width 0.4s ease" }} />
                </div>
                <div style={{ color: c, fontSize: "13px", fontWeight: "700", width: "30px", textAlign: "right" }}>{d.total_logs}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Edit panel ─────────────────────────────────────────────────────────
  const EditPanel = () => {
    if (!selected) return null;
    const dur = calcDuration(editing?.work_start, editing?.work_end);
    return (
      <>
        <div style={s.panelOverlay} onClick={closeDetail} />
        <div style={{ ...s.panel, animation: "slideIn 0.25s ease" }}>
          <div style={{ padding: "24px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Work Log Entry</div>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#4da6ff" }}>#{selected.id} · {selected.ticket_number}</div>
                <div style={{ color: "#22c55e", fontSize: "13px", fontWeight: "600", marginTop: "2px" }}>{selected.developer_name}</div>
              </div>
              <button onClick={closeDetail} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "6px 10px", color: "#9ca3af", cursor: "pointer", fontSize: "14px" }}>✕</button>
            </div>
          </div>

          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* Read-only info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                { label: "Client", value: selected.client_name },
                { label: "Ticket #", value: selected.ticket_number },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={s.labelStyle}>{label}</div>
                  <div style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: "600" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Support Issue */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px 14px" }}>
              <div style={s.labelStyle}>Support Issue</div>
              <div style={{ color: "#94a3b8", fontSize: "13px", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{selected.support_issue}</div>
            </div>

            {/* Editable fields */}
            <div>
              <label style={s.labelStyle}>Developer Name</label>
              <input style={s.inputStyle} value={editing?.developer_name || ""} onChange={e => setEditing(p => ({ ...p, developer_name: e.target.value }))} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={s.labelStyle}>Work Start</label>
                <input type="datetime-local" style={s.inputStyle} value={toLocalInputVal(editing?.work_start)} onChange={e => setEditing(p => ({ ...p, work_start: fromLocalInputVal(e.target.value) }))} />
              </div>
              <div>
                <label style={s.labelStyle}>Work End {dur && <span style={{ color: "#4da6ff", fontWeight: "600", fontSize: "11px", textTransform: "none", letterSpacing: 0 }}>({dur})</span>}</label>
                <input type="datetime-local" style={s.inputStyle} value={toLocalInputVal(editing?.work_end)} onChange={e => setEditing(p => ({ ...p, work_end: fromLocalInputVal(e.target.value) }))} />
              </div>
            </div>

            <div>
              <label style={s.labelStyle}>Status After This Work</label>
              <select style={s.selectStyle} value={editing?.status_after || ""} onChange={e => setEditing(p => ({ ...p, status_after: e.target.value }))}>
                {WORK_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>

            <div>
              <label style={s.labelStyle}>Actions Taken / Work Performed</label>
              <textarea style={{ ...s.textareaStyle, minHeight: "110px" }} value={editing?.actions_taken || ""} onChange={e => setEditing(p => ({ ...p, actions_taken: e.target.value }))} placeholder="Describe the steps and actions taken..." />
            </div>

            <div>
              <label style={s.labelStyle}>Resolution Details (if resolved)</label>
              <textarea style={s.textareaStyle} value={editing?.resolution_details || ""} onChange={e => setEditing(p => ({ ...p, resolution_details: e.target.value }))} placeholder="Root cause, fix applied, final resolution..." />
            </div>

            <div>
              <label style={s.labelStyle}>Logged By</label>
              <input style={s.inputStyle} value={editing?.logged_by || ""} onChange={e => setEditing(p => ({ ...p, logged_by: e.target.value }))} placeholder="Admin / manager name..." />
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => { if (!confirmDel) { setConfirmDel(true); return; } handleDelete(); }}
                style={s.deleteBtn(confirmDel)}
                disabled={deleting}
              >
                {deleting ? <FaSpinner style={{ animation: "spin 1s linear infinite" }} /> : <FaTrashAlt />}
                {confirmDel ? "Confirm Delete" : "Delete"}
              </button>
              {confirmDel && (
                <button onClick={() => setConfirmDel(false)} style={{ ...s.deleteBtn(false), flex: 0 }}>Cancel</button>
              )}
              <button onClick={handleSave} style={s.saveBtn} disabled={saving}>
                {saving ? <><FaSpinner style={{ animation: "spin 1s linear infinite" }} /> Saving...</> : <><FaSave /> Save Changes</>}
              </button>
            </div>

            <div style={{ color: "#4b5563", fontSize: "11px" }}>
              Entry created: {fmtDT(selected.created_at)} · Last updated: {fmtDT(selected.updated_at)}
            </div>
          </div>
        </div>
      </>
    );
  };

  // ── Pagination ─────────────────────────────────────────────────────────
  const Pagination = () => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ color: "#6b7280", fontSize: "12px" }}>Showing {logs.length} of {total} entries</span>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          style={{ background: page === 1 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "5px 11px", color: page === 1 ? "#374151" : "#e2e8f0", cursor: page === 1 ? "not-allowed" : "pointer" }}>
          <FaChevronLeft style={{ fontSize: "11px" }} />
        </button>
        <span style={{ padding: "5px 12px", color: "#e2e8f0", fontSize: "12px", background: "rgba(77,166,255,0.1)", borderRadius: "8px", border: "1px solid rgba(77,166,255,0.2)" }}>{page}/{pages}</span>
        <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
          style={{ background: page === pages ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "5px 11px", color: page === pages ? "#374151" : "#e2e8f0", cursor: page === pages ? "not-allowed" : "pointer" }}>
          <FaChevronRight style={{ fontSize: "11px" }} />
        </button>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slideIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
        .log-row:hover { background: rgba(77,166,255,0.06) !important; cursor: pointer; }
        .log-row.active { background: rgba(77,166,255,0.1) !important; }
        input[type=datetime-local]::-webkit-calendar-picker-indicator { filter: invert(0.7); cursor: pointer; }
        select:focus, input:focus, textarea:focus { border-color:#4da6ff !important; box-shadow:0 0 0 3px rgba(77,166,255,0.12); }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "26px" }}>
        <div>
          <div style={s.title}>
            <FaWrench style={{ fontSize: "22px", color: "#818cf8" }} />
            Developer Work Report
          </div>
          <div style={s.sub}>Complete log of work performed by each IT support developer</div>
        </div>
        <button onClick={fetchReport} style={{ background: "rgba(77,166,255,0.1)", border: "1px solid rgba(77,166,255,0.2)", borderRadius: "10px", padding: "9px 14px", color: "#4da6ff", cursor: "pointer", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
          <FaSyncAlt /> Refresh
        </button>
      </div>

      <SummaryCards />
      <DevSummaryBar />

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
          <FaSearch style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#6b7280", fontSize: "13px", pointerEvents: "none" }} />
          <input style={{ ...s.filterInput, paddingLeft: "34px", width: "100%", boxSizing: "border-box" }}
            placeholder="Search developer name..." value={fDev}
            onChange={e => { setFDev(e.target.value); setPage(1); }} />
        </div>
        <input style={s.filterInput} placeholder="Ticket #" value={fTicket}
          onChange={e => { setFTicket(e.target.value); setPage(1); }} />
        <select style={s.filterSelect} value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {WORK_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "#6b7280", fontSize: "12px" }}>From</span>
          <input type="date" style={s.filterInput} value={fFrom}
            onChange={e => { setFFrom(e.target.value); setPage(1); }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "#6b7280", fontSize: "12px" }}>To</span>
          <input type="date" style={s.filterInput} value={fTo}
            onChange={e => { setFTo(e.target.value); setPage(1); }} />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "9px 14px", color: "#ef4444", cursor: "pointer", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
            <FaTimes /> Clear
          </button>
        )}
      </div>

      {/* Main Table */}
      <div style={s.card}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#6b7280" }}>
            <FaSpinner style={{ fontSize: "28px", animation: "spin 1s linear infinite", marginBottom: "12px" }} />
            <div>Loading work logs...</div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#6b7280" }}>
            <FaClipboardList style={{ fontSize: "46px", color: "#1f2937", marginBottom: "14px" }} />
            <div style={{ fontSize: "15px" }}>No work logs found</div>
            {hasFilters && (
              <button onClick={clearFilters} style={{ marginTop: "12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px", padding: "8px 16px", color: "#ef4444", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>Clear Filters</button>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["#","Developer","Ticket / Client","Support Issue","Work Start","Work End","Duration","Actions Taken","Status","Resolution"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const dur = calcDuration(log.work_start, log.work_end);
                    const isActive = selected?.id === log.id;
                    return (
                      <tr key={log.id}
                        className={`log-row${isActive ? " active" : ""}`}
                        onClick={() => openDetail(log)}
                        style={{ transition: "background 0.15s" }}
                      >
                        <td style={{ ...s.td, color: "#4b5563", fontSize: "11px", fontWeight: "700" }}>#{log.id}</td>
                        <td style={s.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "800", color: "#fff", flexShrink: 0 }}>
                              {log.developer_name.charAt(0)}
                            </div>
                            <div style={{ color: "#22c55e", fontWeight: "700", fontSize: "13px" }}>{log.developer_name}</div>
                          </div>
                        </td>
                        <td style={s.td}>
                          <div style={{ color: "#4da6ff", fontWeight: "700", fontSize: "12px" }}>{log.ticket_number}</div>
                          <div style={{ color: "#e2e8f0", fontSize: "12px", marginTop: "2px" }}>{log.client_name}</div>
                        </td>
                        <td style={{ ...s.td, maxWidth: "180px" }}>
                          <div style={{ color: "#94a3b8", fontSize: "12px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                            {log.support_issue?.split("\n")[0]}
                          </div>
                        </td>
                        <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                          <div style={{ color: "#e2e8f0", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                            <FaCalendarAlt style={{ color: "#4da6ff", fontSize: "10px" }} />{fmtDate(log.work_start)}
                          </div>
                          <div style={{ color: "#6b7280", fontSize: "11px", marginTop: "2px", display: "flex", alignItems: "center", gap: "5px" }}>
                            <FaClock style={{ fontSize: "10px" }} />{fmtTime(log.work_start)}
                          </div>
                        </td>
                        <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                          {log.work_end ? (
                            <>
                              <div style={{ color: "#e2e8f0", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                                <FaCalendarAlt style={{ color: "#22c55e", fontSize: "10px" }} />{fmtDate(log.work_end)}
                              </div>
                              <div style={{ color: "#6b7280", fontSize: "11px", marginTop: "2px", display: "flex", alignItems: "center", gap: "5px" }}>
                                <FaClock style={{ fontSize: "10px" }} />{fmtTime(log.work_end)}
                              </div>
                            </>
                          ) : <span style={{ color: "#374151", fontStyle: "italic", fontSize: "12px" }}>In progress…</span>}
                        </td>
                        <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                          {dur ? (
                            <span style={{ background: "rgba(77,166,255,0.1)", border: "1px solid rgba(77,166,255,0.2)", color: "#4da6ff", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", fontWeight: "700" }}>
                              {dur}
                            </span>
                          ) : "—"}
                        </td>
                        <td style={{ ...s.td, maxWidth: "200px" }}>
                          <div style={{ color: "#e2e8f0", fontSize: "12px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", lineHeight: "1.5" }}>
                            {log.actions_taken}
                          </div>
                        </td>
                        <td style={s.td}><StatusChip status={log.status_after} /></td>
                        <td style={{ ...s.td, maxWidth: "160px" }}>
                          {log.resolution_details ? (
                            <div style={{ color: "#22c55e", fontSize: "12px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                              {log.resolution_details}
                            </div>
                          ) : (
                            <span style={{ color: "#374151", fontSize: "12px", fontStyle: "italic" }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination />
          </>
        )}
      </div>

      {selected && <EditPanel />}
    </div>
  );
};

export default ITSupportWorkReport;
