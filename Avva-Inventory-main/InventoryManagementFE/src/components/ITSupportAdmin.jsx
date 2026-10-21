import React, { useState, useEffect, useCallback } from "react";
import {
  FaShieldAlt,
  FaTicketAlt,
  FaSearch,
  FaFilter,
  FaTimes,
  FaSpinner,
  FaCheckCircle,
  FaSyncAlt,
  FaUserTie,
  FaSave,
  FaClipboardList,
  FaExclamationCircle,
  FaChevronLeft,
  FaChevronRight,
  FaWhatsapp,
  FaCalendarAlt,
  FaUserCheck,
  FaPaperPlane,
  FaClock,
} from "react-icons/fa";
import api from "../utils/api";
import { StatusBadge, PriorityBadge } from "./ITSupport";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUSES = ["Open", "In Progress", "Resolved", "Closed"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const CATEGORIES = [
  "Hardware", "Software", "Network", "Printer",
  "Email", "Access / Permissions", "Other",
];

const STAT_CARDS = [
  { key: "total",       label: "Total",       color: "#818cf8", icon: <FaTicketAlt /> },
  { key: "open",        label: "Open",        color: "#3b82f6", icon: <FaClipboardList /> },
  { key: "in_progress", label: "In Progress", color: "#f59e0b", icon: <FaSpinner /> },
  { key: "resolved",    label: "Resolved",    color: "#22c55e", icon: <FaCheckCircle /> },
  { key: "critical",    label: "Critical",    color: "#ef4444", icon: <FaExclamationCircle /> },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const ITSupportAdmin = () => {
  const [tickets, setTickets]         = useState([]);
  const [stats, setStats]             = useState({});
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [updating, setUpdating]       = useState(false);

  // Team members from API
  const [teamMembers, setTeamMembers] = useState([]);

  // Filters
  const [search, setSearch]                 = useState("");
  const [filterStatus, setFilterStatus]     = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Pagination
  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const PER_PAGE = 15;

  // Edit state (for the detail panel)
  const [editStatus, setEditStatus]     = useState("");
  const [editNotes, setEditNotes]       = useState("");
  const [editAssigned, setEditAssigned] = useState("");   // free-text fallback
  const [editPriority, setEditPriority] = useState("");

  // Assignment modal state
  const [showAssignModal, setShowAssignModal]       = useState(false);
  const [selectedMemberId, setSelectedMemberId]     = useState("");
  const [assignedBy, setAssignedBy]                 = useState("");
  const [assignNotes, setAssignNotes]               = useState("");
  const [assigning, setAssigning]                   = useState(false);
  const [assignResult, setAssignResult]             = useState(null);  // { whatsapp_url, group_whatsapp_url, member }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        per_page: PER_PAGE,
        ...(search && { search }),
        ...(filterStatus && { status: filterStatus }),
        ...(filterPriority && { priority: filterPriority }),
        ...(filterCategory && { category: filterCategory }),
      });
      const res = await api.get(`/it-support/tickets?${params}`);
      setTickets(res.data.tickets || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterPriority, filterCategory]);

  const fetchStats = async () => {
    try {
      const res = await api.get("/it-support/stats");
      setStats(res.data);
    } catch { /* noop */ }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await api.get("/it-support/team-members");
      setTeamMembers(res.data.team_members || []);
    } catch { /* noop */ }
  };

  useEffect(() => { fetchTickets(); }, [fetchTickets]);
  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchTeamMembers(); }, []);

  // Check for ?ticket= URL param to auto-open a ticket (from WhatsApp link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tn = params.get("ticket");
    if (tn && tickets.length > 0) {
      const match = tickets.find(t => t.ticket_number === tn);
      if (match) openDetail(match);
    }
  }, [tickets]);

  // ── Detail Panel Helpers ───────────────────────────────────────────────────
  const openDetail = (ticket) => {
    setSelected(ticket);
    setEditStatus(ticket.status);
    setEditNotes(ticket.admin_notes || "");
    setEditAssigned(ticket.assigned_to || "");
    setEditPriority(ticket.priority || "");
    setAssignResult(null);
    setShowAssignModal(false);
  };

  const closeDetail = () => {
    setSelected(null);
    setAssignResult(null);
    setShowAssignModal(false);
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      const res = await api.put(`/it-support/tickets/${selected.id}`, {
        status: editStatus,
        admin_notes: editNotes,
        assigned_to: editAssigned,
        priority: editPriority,
      });
      const updated = res.data.ticket;
      setSelected(updated);
      setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      fetchStats();
      const btn = document.getElementById("save-btn");
      if (btn) { btn.textContent = "✓ Saved!"; setTimeout(() => { btn.textContent = "Save Changes"; }, 1800); }
    } catch {
      alert("Failed to update ticket. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleQuickStatus = async (status) => {
    setEditStatus(status);
    if (!selected) return;
    setUpdating(true);
    try {
      const res = await api.put(`/it-support/tickets/${selected.id}`, { status });
      const updated = res.data.ticket;
      setSelected(updated);
      setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      fetchStats();
    } catch { /* noop */ }
    finally { setUpdating(false); }
  };

  // ── Assign Ticket ──────────────────────────────────────────────────────────
  const handleAssign = async () => {
    if (!selected || !selectedMemberId) return;
    setAssigning(true);
    try {
      const res = await api.post(`/it-support/tickets/${selected.id}/assign`, {
        member_id: parseInt(selectedMemberId, 10),
        assigned_by: assignedBy.trim() || "Admin",
        admin_notes: assignNotes.trim() || undefined,
      });
      const updated = res.data.ticket;
      setSelected(updated);
      setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      fetchStats();
      setAssignResult({
        whatsapp_url: res.data.whatsapp_url,
        group_whatsapp_url: res.data.group_whatsapp_url,
        member: res.data.assigned_member,
      });
      setShowAssignModal(false);
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to assign ticket.");
    } finally {
      setAssigning(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch(""); setFilterStatus(""); setFilterPriority(""); setFilterCategory(""); setPage(1);
  };

  const hasFilters = search || filterStatus || filterPriority || filterCategory;

  // ── Format helpers ─────────────────────────────────────────────────────────
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString() : "—";
  const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
  const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString() : "—";

  // ── Styles ─────────────────────────────────────────────────────────────────
  const s = {
    page: {
      color: "#e2e8f0",
      fontFamily: "'Inter','Segoe UI',sans-serif",
      minHeight: "100vh",
    },
    header: {
      display: "flex", justifyContent: "space-between",
      alignItems: "flex-start", marginBottom: "28px",
    },
    title: {
      fontSize: "28px", fontWeight: "700",
      background: "linear-gradient(135deg,#818cf8,#4da6ff)",
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px",
    },
    sub: { color: "#6b7280", fontSize: "13px" },
    statGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: "16px", marginBottom: "28px",
    },
    statCard: (color) => ({
      background: `linear-gradient(135deg, ${color}15, ${color}08)`,
      border: `1px solid ${color}30`,
      borderRadius: "14px", padding: "20px",
      display: "flex", flexDirection: "column", gap: "8px",
    }),
    statNum: (color) => ({
      fontSize: "32px", fontWeight: "800", color,
      lineHeight: 1,
    }),
    statLabel: { fontSize: "12px", color: "#6b7280", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" },
    statIcon: (color) => ({ color, fontSize: "20px", opacity: 0.8 }),
    toolbar: {
      display: "flex", gap: "10px", marginBottom: "20px",
      flexWrap: "wrap", alignItems: "center",
    },
    searchBox: {
      flex: 1, minWidth: "220px", position: "relative",
    },
    searchInput: {
      width: "100%", background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
      padding: "10px 14px 10px 38px", color: "#e2e8f0", fontSize: "14px",
      outline: "none", boxSizing: "border-box",
    },
    searchIcon: {
      position: "absolute", left: "12px", top: "50%",
      transform: "translateY(-50%)", color: "#6b7280", fontSize: "14px",
      pointerEvents: "none",
    },
    filterSelect: {
      background: "rgba(30,41,59,0.9)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "10px", padding: "10px 14px", color: "#e2e8f0",
      fontSize: "13px", outline: "none", cursor: "pointer", minWidth: "140px",
    },
    clearBtn: {
      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
      borderRadius: "10px", padding: "10px 14px", color: "#ef4444",
      cursor: "pointer", fontSize: "13px", fontWeight: "600",
      display: "flex", alignItems: "center", gap: "6px",
    },
    refreshBtn: {
      background: "rgba(77,166,255,0.1)", border: "1px solid rgba(77,166,255,0.2)",
      borderRadius: "10px", padding: "10px 14px", color: "#4da6ff",
      cursor: "pointer", fontSize: "13px", fontWeight: "600",
      display: "flex", alignItems: "center", gap: "6px",
    },
    tableCard: {
      background: "linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px",
      overflow: "hidden",
    },
    th: {
      textAlign: "left", padding: "12px 16px", fontSize: "11px",
      fontWeight: "600", color: "#6b7280", textTransform: "uppercase",
      letterSpacing: "0.5px", background: "rgba(0,0,0,0.2)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      whiteSpace: "nowrap",
    },
    td: {
      padding: "13px 16px", fontSize: "13px",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    },
    detailPanel: {
      position: "fixed", top: 0, right: 0, bottom: 0,
      width: "460px", zIndex: 1000,
      background: "linear-gradient(180deg,#111827,#0d1424)",
      borderLeft: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter','Segoe UI',sans-serif",
      overflowY: "auto",
    },
    detailHeader: {
      padding: "24px", borderBottom: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.02)",
    },
    detailBody: { padding: "24px", flex: 1, display: "flex", flexDirection: "column", gap: "20px" },
    infoBox: (color = "rgba(255,255,255,0.04)") => ({
      background: color, borderRadius: "10px", padding: "14px 16px",
      border: "1px solid rgba(255,255,255,0.06)",
    }),
    infoLabel: {
      fontSize: "11px", color: "#6b7280", textTransform: "uppercase",
      letterSpacing: "0.5px", marginBottom: "6px",
    },
    infoValue: { color: "#e2e8f0", fontSize: "14px", lineHeight: "1.5" },
    inputStyle: {
      width: "100%", background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
      padding: "10px 12px", color: "#e2e8f0", fontSize: "13px",
      outline: "none", boxSizing: "border-box",
    },
    selectStyle: {
      width: "100%", background: "rgba(20,30,50,0.9)",
      border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px",
      padding: "10px 12px", color: "#e2e8f0", fontSize: "13px",
      outline: "none", boxSizing: "border-box", cursor: "pointer",
    },
    textareaStyle: {
      width: "100%", background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
      padding: "10px 12px", color: "#e2e8f0", fontSize: "13px",
      outline: "none", resize: "vertical", minHeight: "90px",
      boxSizing: "border-box", fontFamily: "inherit",
    },
    saveBtn: {
      background: "linear-gradient(135deg,#4da6ff,#818cf8)",
      border: "none", borderRadius: "10px", padding: "12px 20px",
      color: "#fff", fontWeight: "700", cursor: "pointer", fontSize: "14px",
      display: "flex", alignItems: "center", gap: "8px", width: "100%",
      justifyContent: "center",
    },
    assignBtn: {
      background: "linear-gradient(135deg,#22c55e,#16a34a)",
      border: "none", borderRadius: "10px", padding: "12px 20px",
      color: "#fff", fontWeight: "700", cursor: "pointer", fontSize: "14px",
      display: "flex", alignItems: "center", gap: "8px", width: "100%",
      justifyContent: "center",
    },
    waBtn: (variant = "direct") => ({
      background: variant === "direct"
        ? "linear-gradient(135deg,#25d366,#128c7e)"
        : "linear-gradient(135deg,rgba(37,211,102,0.15),rgba(18,140,126,0.1))",
      border: variant === "direct"
        ? "none"
        : "1px solid rgba(37,211,102,0.3)",
      borderRadius: "10px", padding: "12px 16px",
      color: variant === "direct" ? "#fff" : "#25d366",
      fontWeight: "700", cursor: "pointer", fontSize: "13px",
      display: "flex", alignItems: "center", gap: "8px",
      justifyContent: "center", textDecoration: "none",
      flex: 1,
    }),
  };

  // ── Modal ──────────────────────────────────────────────────────────────────
  const AssignModal = () => {
    const selMember = teamMembers.find(m => m.id === parseInt(selectedMemberId));
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 1100,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowAssignModal(false); }}
      >
        <div style={{
          background: "linear-gradient(180deg,#1a2540,#111827)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "18px", padding: "32px",
          width: "100%", maxWidth: "480px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}>
          <div style={{ marginBottom: "24px" }}>
            <div style={{
              fontSize: "20px", fontWeight: "800",
              background: "linear-gradient(135deg,#22c55e,#4da6ff)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text", marginBottom: "6px",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <FaUserCheck /> Assign Ticket
            </div>
            <div style={{ color: "#6b7280", fontSize: "13px" }}>
              Ticket <span style={{ color: "#4da6ff", fontWeight: "700" }}>{selected?.ticket_number}</span> &mdash; {selected?.subject}
            </div>
          </div>

          {/* Team Member Select */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "8px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Select Team Member *
            </label>
            <select
              style={s.selectStyle}
              value={selectedMemberId}
              onChange={e => setSelectedMemberId(e.target.value)}
            >
              <option value="">— Choose a developer / team member —</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.role}
                </option>
              ))}
            </select>
            {selMember && (
              <div style={{
                marginTop: "10px", padding: "10px 14px",
                background: "rgba(34,197,94,0.08)", borderRadius: "8px",
                border: "1px solid rgba(34,197,94,0.2)",
                display: "flex", alignItems: "center", gap: "10px",
              }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  background: "linear-gradient(135deg,#22c55e,#16a34a)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "16px", fontWeight: "700", color: "#fff", flexShrink: 0,
                }}>
                  {selMember.name.charAt(0)}
                </div>
                <div>
                  <div style={{ color: "#e2e8f0", fontWeight: "700", fontSize: "14px" }}>{selMember.name}</div>
                  <div style={{ color: "#22c55e", fontSize: "12px" }}>{selMember.role}</div>
                </div>
              </div>
            )}
          </div>

          {/* Assigned By */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "8px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Assigned By (Admin Name)
            </label>
            <input
              style={s.inputStyle}
              value={assignedBy}
              onChange={e => setAssignedBy(e.target.value)}
              placeholder="e.g. Admin / Manager name..."
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "8px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Assignment Notes (Optional)
            </label>
            <textarea
              style={s.textareaStyle}
              value={assignNotes}
              onChange={e => setAssignNotes(e.target.value)}
              placeholder="Any instructions or context for the developer..."
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => setShowAssignModal(false)}
              style={{
                flex: 1, background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
                padding: "12px", color: "#9ca3af", cursor: "pointer", fontSize: "14px", fontWeight: "600",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedMemberId || assigning}
              style={{
                ...s.assignBtn, flex: 2,
                opacity: (!selectedMemberId || assigning) ? 0.5 : 1,
                cursor: (!selectedMemberId || assigning) ? "not-allowed" : "pointer",
              }}
            >
              {assigning
                ? <><FaSpinner style={{ animation: "spin 1s linear infinite" }} /> Assigning...</>
                : <><FaPaperPlane /> Assign & Generate WhatsApp</>
              }
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Pagination ─────────────────────────────────────────────────────────────
  const Pagination = () => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ color: "#6b7280", fontSize: "13px" }}>
        Showing {tickets.length} of {total} tickets
      </span>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          style={{
            background: page === 1 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px",
            padding: "6px 12px", color: page === 1 ? "#374151" : "#e2e8f0",
            cursor: page === 1 ? "not-allowed" : "pointer", fontSize: "13px",
          }}
        >
          <FaChevronLeft />
        </button>
        <span style={{ padding: "6px 14px", color: "#e2e8f0", fontSize: "13px", background: "rgba(77,166,255,0.1)", borderRadius: "8px", border: "1px solid rgba(77,166,255,0.2)" }}>
          {page} / {pages}
        </span>
        <button
          onClick={() => setPage(p => Math.min(pages, p + 1))}
          disabled={page === pages}
          style={{
            background: page === pages ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px",
            padding: "6px 12px", color: page === pages ? "#374151" : "#e2e8f0",
            cursor: page === pages ? "not-allowed" : "pointer", fontSize: "13px",
          }}
        >
          <FaChevronRight />
        </button>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .ticket-row:hover { background: rgba(77,166,255,0.06) !important; cursor:pointer; }
        .ticket-row.selected { background: rgba(77,166,255,0.1) !important; }
        select:focus, input:focus, textarea:focus { border-color:#4da6ff !important; box-shadow:0 0 0 3px rgba(77,166,255,0.12); }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slideIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
        .quick-btn { transition: all 0.15s; }
        .quick-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .wa-btn-hover:hover { filter: brightness(1.08); transform: translateY(-1px); transition: all 0.15s; }
        .member-card:hover { background: rgba(34,197,94,0.12) !important; border-color: rgba(34,197,94,0.3) !important; }
      `}</style>

      {/* ── Page Header ── */}
      <div style={s.header}>
        <div>
          <div style={s.title}>
            <FaShieldAlt style={{ fontSize: "24px", color: "#818cf8" }} />
            IT Support Management
          </div>
          <div style={s.sub}>View, assign, and manage all client IT support tickets</div>
        </div>
        <button onClick={() => { fetchTickets(); fetchStats(); }} style={s.refreshBtn}>
          <FaSyncAlt /> Refresh
        </button>
      </div>

      {/* ── Stats Bar ── */}
      <div style={s.statGrid}>
        {STAT_CARDS.map(c => (
          <div key={c.key} style={s.statCard(c.color)}>
            <div style={s.statIcon(c.color)}>{c.icon}</div>
            <div style={s.statNum(c.color)}>{stats[c.key] ?? "—"}</div>
            <div style={s.statLabel}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={s.toolbar}>
        <div style={s.searchBox}>
          <FaSearch style={s.searchIcon} />
          <input
            style={s.searchInput}
            placeholder="Search ticket #, client, email, subject, assigned developer..."
            value={search}
            onChange={handleSearch}
          />
        </div>

        <select style={s.filterSelect} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select style={s.filterSelect} value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1); }}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select style={s.filterSelect} value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {hasFilters && (
          <button onClick={clearFilters} style={s.clearBtn}>
            <FaTimes /> Clear
          </button>
        )}
      </div>

      {/* ── Main Table ── */}
      <div style={s.tableCard}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#6b7280" }}>
            <FaSpinner style={{ fontSize: "28px", animation: "spin 1s linear infinite", marginBottom: "12px" }} />
            <div>Loading tickets...</div>
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <FaClipboardList style={{ fontSize: "48px", color: "#1f2937", marginBottom: "16px" }} />
            <div style={{ color: "#6b7280", fontSize: "15px" }}>No tickets found</div>
            {hasFilters && (
              <button onClick={clearFilters} style={{ ...s.clearBtn, margin: "12px auto 0", display: "inline-flex" }}>
                <FaTimes /> Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Ticket #", "Client", "Category", "Priority", "Subject", "Status", "Date", "Assigned To"].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr
                      key={t.id}
                      className={`ticket-row${selected?.id === t.id ? " selected" : ""}`}
                      onClick={() => openDetail(t)}
                      style={{ transition: "background 0.15s" }}
                    >
                      <td style={{ ...s.td, color: "#4da6ff", fontWeight: "700" }}>{t.ticket_number}</td>
                      <td style={s.td}>
                        <div style={{ color: "#e2e8f0", fontWeight: "600", fontSize: "13px" }}>{t.client_name}</div>
                        <div style={{ color: "#6b7280", fontSize: "11px" }}>{t.client_email}</div>
                      </td>
                      <td style={{ ...s.td, color: "#94a3b8" }}>{t.category}</td>
                      <td style={s.td}><PriorityBadge priority={t.priority} /></td>
                      <td style={s.td}>
                        <div style={{ color: "#e2e8f0", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.subject}
                        </div>
                      </td>
                      <td style={s.td}><StatusBadge status={t.status} /></td>
                      <td style={{ ...s.td, color: "#6b7280", fontSize: "12px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <FaCalendarAlt style={{ fontSize: "11px" }} />
                          {fmtDate(t.created_at)}
                        </div>
                        <div style={{ color: "#4b5563", fontSize: "11px" }}>
                          {fmtTime(t.created_at)}
                        </div>
                      </td>
                      <td style={{ ...s.td, fontSize: "12px" }}>
                        {t.assigned_to ? (
                          <div>
                            <div style={{ color: "#22c55e", fontWeight: "600" }}>{t.assigned_to}</div>
                            {t.assigned_at && (
                              <div style={{ color: "#4b5563", fontSize: "11px" }}>
                                {fmtDate(t.assigned_at)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#374151", fontStyle: "italic" }}>Unassigned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination />
          </>
        )}
      </div>

      {/* ── Assign Modal ── */}
      {showAssignModal && <AssignModal />}

      {/* ── Detail Side Panel ── */}
      {selected && (
        <>
          {/* Backdrop */}
          <div
            onClick={closeDetail}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
              zIndex: 999, backdropFilter: "blur(2px)",
            }}
          />

          <div style={{ ...s.detailPanel, animation: "slideIn 0.25s ease" }}>
            {/* Panel Header */}
            <div style={s.detailHeader}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                    Ticket
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#4da6ff", letterSpacing: "0.5px" }}>
                    {selected.ticket_number}
                  </div>
                </div>
                <button
                  onClick={closeDetail}
                  style={{
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px", padding: "6px 10px", color: "#9ca3af",
                    cursor: "pointer", fontSize: "14px",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Quick status buttons */}
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Quick Status
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {STATUSES.map(st => {
                    const isActive = (editStatus || selected.status) === st;
                    const colors = { Open: "#3b82f6", "In Progress": "#f59e0b", Resolved: "#22c55e", Closed: "#6b7280" };
                    const c = colors[st] || "#6b7280";
                    return (
                      <button
                        key={st}
                        className="quick-btn"
                        onClick={() => handleQuickStatus(st)}
                        disabled={updating}
                        style={{
                          padding: "6px 12px", borderRadius: "8px", border: `1px solid ${isActive ? c : "rgba(255,255,255,0.1)"}`,
                          background: isActive ? `${c}25` : "rgba(255,255,255,0.03)",
                          color: isActive ? c : "#6b7280", cursor: "pointer", fontSize: "12px", fontWeight: "600",
                        }}
                      >
                        {updating && isActive
                          ? <FaSpinner style={{ animation: "spin 1s linear infinite" }} />
                          : st
                        }
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Panel Body */}
            <div style={s.detailBody}>
              {/* Client Info */}
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Client Information
                </div>
                <div style={s.infoBox()}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg,#4da6ff,#818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "700", color: "#fff" }}>
                      {selected.client_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ color: "#e2e8f0", fontWeight: "600", fontSize: "14px" }}>{selected.client_name}</div>
                      <div style={{ color: "#6b7280", fontSize: "12px" }}>{selected.client_email}</div>
                    </div>
                  </div>
                  {selected.contact_number && (
                    <div style={{ color: "#94a3b8", fontSize: "12px" }}>📞 {selected.contact_number}</div>
                  )}
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <PriorityBadge priority={selected.priority} />
                    <span style={{ color: "#6b7280", fontSize: "12px", alignSelf: "center" }}>{selected.category}</span>
                  </div>
                </div>
              </div>

              {/* Ticket Details */}
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Issue Details
                </div>
                <div style={s.infoBox()}>
                  <div style={{ ...s.infoLabel }}>Subject</div>
                  <div style={{ ...s.infoValue, fontWeight: "600", marginBottom: "12px" }}>{selected.subject}</div>
                  <div style={s.infoLabel}>Description</div>
                  <div style={{ ...s.infoValue, whiteSpace: "pre-wrap", color: "#94a3b8" }}>{selected.description}</div>
                </div>
              </div>

              {/* ── Assignment Section ── */}
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Assignment
                </div>

                {/* Already Assigned Banner */}
                {selected.assigned_to ? (
                  <div style={{
                    background: "rgba(34,197,94,0.08)",
                    border: "1px solid rgba(34,197,94,0.2)",
                    borderRadius: "12px", padding: "16px",
                    marginBottom: "12px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                      <div style={{
                        width: "40px", height: "40px", borderRadius: "50%",
                        background: "linear-gradient(135deg,#22c55e,#16a34a)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "18px", fontWeight: "800", color: "#fff", flexShrink: 0,
                      }}>
                        {selected.assigned_to.charAt(0)}
                      </div>
                      <div>
                        <div style={{ color: "#22c55e", fontWeight: "700", fontSize: "15px" }}>
                          {selected.assigned_to}
                        </div>
                        {selected.assigned_by && (
                          <div style={{ color: "#6b7280", fontSize: "12px" }}>
                            Assigned by <span style={{ color: "#94a3b8" }}>{selected.assigned_by}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {selected.assigned_at && (
                      <div style={{ display: "flex", gap: "16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#6b7280", fontSize: "12px" }}>
                          <FaCalendarAlt style={{ color: "#22c55e", fontSize: "11px" }} />
                          {fmtDate(selected.assigned_at)}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#6b7280", fontSize: "12px" }}>
                          <FaClock style={{ color: "#22c55e", fontSize: "11px" }} />
                          {fmtTime(selected.assigned_at)}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    background: "rgba(239,68,68,0.06)", border: "1px dashed rgba(239,68,68,0.2)",
                    borderRadius: "10px", padding: "14px 16px", marginBottom: "12px",
                    color: "#ef4444", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px",
                  }}>
                    <FaUserTie /> This ticket is not yet assigned to a developer.
                  </div>
                )}

                {/* Assign / Re-assign Button */}
                <button
                  id="assign-ticket-btn"
                  onClick={() => {
                    setSelectedMemberId("");
                    setAssignedBy("");
                    setAssignNotes("");
                    setAssignResult(null);
                    setShowAssignModal(true);
                  }}
                  style={s.assignBtn}
                >
                  <FaUserCheck />
                  {selected.assigned_to ? "Re-assign Ticket" : "Assign to Developer"}
                </button>

                {/* WhatsApp Notification Buttons (after assignment) */}
                {assignResult && (
                  <div style={{
                    marginTop: "14px",
                    background: "rgba(37,211,102,0.06)",
                    border: "1px solid rgba(37,211,102,0.2)",
                    borderRadius: "12px", padding: "16px",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      marginBottom: "12px",
                    }}>
                      <FaWhatsapp style={{ color: "#25d366", fontSize: "18px" }} />
                      <div>
                        <div style={{ color: "#25d366", fontWeight: "700", fontSize: "14px" }}>
                          Ticket Assigned to {assignResult.member?.name}!
                        </div>
                        <div style={{ color: "#6b7280", fontSize: "12px" }}>
                          Send WhatsApp notification with assignment details
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <a
                        href={assignResult.whatsapp_url}
                        target="_blank"
                        rel="noreferrer"
                        className="wa-btn-hover"
                        style={s.waBtn("direct")}
                        title={`Send direct WhatsApp to ${assignResult.member?.name}`}
                      >
                        <FaWhatsapp style={{ fontSize: "16px" }} />
                        Message Developer
                      </a>
                      <a
                        href={assignResult.group_whatsapp_url}
                        target="_blank"
                        rel="noreferrer"
                        className="wa-btn-hover"
                        style={s.waBtn("group")}
                        title="Send to group"
                      >
                        <FaWhatsapp style={{ fontSize: "16px" }} />
                        Notify Group
                      </a>
                    </div>
                    <div style={{ marginTop: "10px", color: "#4b5563", fontSize: "11px", lineHeight: "1.5" }}>
                      💡 Message includes: client name, ticket no., support request, description, assigned developer, date &amp; time, and a direct ticket link.
                    </div>
                  </div>
                )}

                {/* Re-notify button for already-assigned tickets */}
                {!assignResult && selected.assigned_to && selected.assignment_whatsapp_sent && (
                  <div style={{
                    marginTop: "12px",
                    background: "rgba(37,211,102,0.04)",
                    border: "1px solid rgba(37,211,102,0.15)",
                    borderRadius: "10px", padding: "12px 14px",
                    display: "flex", alignItems: "center", gap: "8px",
                  }}>
                    <FaWhatsapp style={{ color: "#25d366", fontSize: "16px" }} />
                    <span style={{ color: "#6b7280", fontSize: "12px", flex: 1 }}>
                      WhatsApp notification was sent when this ticket was assigned.
                    </span>
                  </div>
                )}
              </div>

              {/* Timestamps */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={s.infoBox()}>
                  <div style={s.infoLabel}>Created</div>
                  <div style={{ color: "#e2e8f0", fontSize: "12px" }}>{fmtDateTime(selected.created_at)}</div>
                </div>
                {selected.resolved_at && (
                  <div style={s.infoBox("rgba(34,197,94,0.06)")}>
                    <div style={{ ...s.infoLabel, color: "#22c55e" }}>Resolved</div>
                    <div style={{ color: "#e2e8f0", fontSize: "12px" }}>{fmtDateTime(selected.resolved_at)}</div>
                  </div>
                )}
              </div>

              {/* Admin Fields */}
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Admin Actions
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px" }}>
                      Admin Notes / Resolution
                    </label>
                    <textarea
                      style={s.textareaStyle}
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      placeholder="Add internal notes, resolution steps, or follow-up actions..."
                    />
                  </div>
                  <button id="save-btn" onClick={handleUpdate} style={s.saveBtn} disabled={updating}>
                    {updating
                      ? <><FaSpinner style={{ animation: "spin 1s linear infinite" }} /> Saving...</>
                      : <><FaSave /> Save Changes</>
                    }
                  </button>
                </div>
              </div>

              {/* Initial WhatsApp notify status */}
              {selected.whatsapp_notified && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  background: "rgba(37,211,102,0.04)", border: "1px solid rgba(37,211,102,0.12)",
                  borderRadius: "10px", padding: "10px 14px",
                }}>
                  <FaWhatsapp style={{ color: "#25d366", fontSize: "16px" }} />
                  <span style={{ color: "#6b7280", fontSize: "12px" }}>Initial WhatsApp alert was sent when this ticket was first raised.</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ITSupportAdmin;
