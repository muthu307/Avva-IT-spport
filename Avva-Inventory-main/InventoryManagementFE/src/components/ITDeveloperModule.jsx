import React, { useState, useEffect, useCallback } from "react";
import {
  FaLaptopCode,
  FaCheckCircle,
  FaSpinner,
  FaSearch,
  FaSave,
  FaWhatsapp,
  FaExclamationTriangle,
  FaSyncAlt,
  FaChevronRight,
  FaClipboardList,
  FaBuilding,
  FaHistory,
  FaTimes,
  FaSlidersH,
  FaCalendarAlt,
  FaClock,
  FaCheckDouble,
  FaLock,
  FaTrashAlt,
  FaEdit,
  FaTh,
  FaList,
  FaEye,
} from "react-icons/fa";
import api from "../utils/api";
import { StatusBadge, PriorityBadge } from "./ITSupport";

// ── Helpers ──────────────────────────────────────────────────────────────────
const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentTimeStr = () => {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
};

const formatDisplayDateTime = (dtStr) => {
  if (!dtStr) return "N/A";
  try {
    const d = new Date(dtStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dtStr;
  }
};
const STATUS_OPTIONS = [
  "In Progress",
  "Pending Client Info",
  "Pending Parts",
  "Resolved",
  "Closed",
];

const PRESET_PERCENTAGES = [0, 25, 50, 75, 90, 100];

const getProgressGradient = (pct) => {
  if (pct >= 100) return "linear-gradient(90deg, #10b981, #059669)";
  if (pct >= 75) return "linear-gradient(90deg, #06b6d4, #10b981)";
  if (pct >= 50) return "linear-gradient(90deg, #3b82f6, #06b6d4)";
  if (pct >= 25) return "linear-gradient(90deg, #f59e0b, #3b82f6)";
  return "linear-gradient(90deg, #ef4444, #f59e0b)";
};

const getProgressColor = (pct) => {
  if (pct >= 100) return "#10b981";
  if (pct >= 75) return "#06b6d4";
  if (pct >= 50) return "#3b82f6";
  if (pct >= 25) return "#f59e0b";
  return "#ef4444";
};

// ── Component ────────────────────────────────────────────────────────────────
const ITDeveloperModule = () => {
  const [developers, setDevelopers] = useState([]);
  const [selectedDev, setSelectedDev] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    critical: 0,
    avg_progress: 0,
  });
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Drawer / Selected Ticket for work update
  const [activeTicket, setActiveTicket] = useState(null);
  const [workLogs, setWorkLogs] = useState([]);
  const [workLogsLoading, setWorkLogsLoading] = useState(false);

  // Form states for daily work update & progress
  const [progressVal, setProgressVal] = useState(0);
  const [ticketStatus, setTicketStatus] = useState("In Progress");
  const [devNotes, setDevNotes] = useState("");
  const [actionLogText, setActionLogText] = useState("");
  const [workDate, setWorkDate] = useState(getTodayDateStr());
  const [workStartTime, setWorkStartTime] = useState("09:30");
  const [workEndTime, setWorkEndTime] = useState("18:00");
  const [resolutionDetails, setResolutionDetails] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // View mode (Grid vs List) & Delete ticket state
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [deleteTicketTarget, setDeleteTicketTarget] = useState(null);
  const [deletingTicket, setDeletingTicket] = useState(false);
  const [viewingTicket, setViewingTicket] = useState(null);

  const handleDeleteTicket = (ticket) => {
    if (!ticket) return;
    setDeleteTicketTarget(ticket);
  };

  const confirmDeleteTicket = async () => {
    if (!deleteTicketTarget) return;
    setDeletingTicket(true);
    try {
      await api.delete(`/it-support/tickets/${deleteTicketTarget.id}`);
      setTickets((prev) => prev.filter((t) => t.id !== deleteTicketTarget.id));
      if (activeTicket?.id === deleteTicketTarget.id) {
        handleCloseTicket();
      }
      setSaveSuccessMsg(`Ticket ${deleteTicketTarget.ticket_number} deleted successfully!`);
      setTimeout(() => setSaveSuccessMsg(""), 4000);
      setDeleteTicketTarget(null);
      fetchDevTickets();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to delete ticket.");
    } finally {
      setDeletingTicket(false);
    }
  };

  // ── Fetch Developers ────────────────────────────────────────────────────────
  const fetchDevelopers = useCallback(async () => {
    try {
      const res = await api.get("/it-support/developers");
      const list = res.data.developers || [];
      setDevelopers(list);
      if (list.length > 0 && !selectedDev) {
        setSelectedDev(list[0]);
      }
    } catch (err) {
      console.error("Error fetching developers", err);
    }
  }, [selectedDev]);

  useEffect(() => {
    fetchDevelopers();
  }, [fetchDevelopers]);

  // ── Fetch Tickets for Selected Developer ───────────────────────────────────
  const fetchDevTickets = useCallback(async () => {
    if (!selectedDev) return;
    setTicketsLoading(true);
    try {
      const params = new URLSearchParams({
        developer_id: selectedDev.id,
        developer_name: selectedDev.name,
        ...(statusFilter && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery }),
      });
      const [ticketRes, statsRes] = await Promise.all([
        api.get(`/it-support/developer/tickets?${params}`),
        api.get(`/it-support/developer/stats?developer_id=${selectedDev.id}&developer_name=${encodeURIComponent(selectedDev.name)}`),
      ]);
      setTickets(ticketRes.data.tickets || []);
      setStats(statsRes.data || {});
    } catch (err) {
      console.error("Error fetching developer tickets", err);
    } finally {
      setTicketsLoading(false);
    }
  }, [selectedDev, statusFilter, searchQuery]);

  useEffect(() => {
    if (selectedDev) {
      fetchDevTickets();
    }
  }, [selectedDev, fetchDevTickets]);

  // ── Fetch Work Logs for Active Ticket ───────────────────────────────────────
  const fetchWorkLogs = async (ticketId) => {
    setWorkLogsLoading(true);
    try {
      const res = await api.get(`/it-support/tickets/${ticketId}/work-logs`);
      setWorkLogs(res.data.work_logs || []);
    } catch {
      setWorkLogs([]);
    } finally {
      setWorkLogsLoading(false);
    }
  };

  const handleOpenTicket = (ticket) => {
    setActiveTicket(ticket);
    setProgressVal(ticket.progress_percentage || 0);
    setTicketStatus(ticket.status || "In Progress");
    setDevNotes(ticket.developer_notes || "");
    setActionLogText("");
    setWorkDate(getTodayDateStr());
    setWorkStartTime(getCurrentTimeStr());
    setWorkEndTime("");
    setResolutionDetails("");
    setSaveSuccessMsg("");
    setShowCloseModal(false);
    fetchWorkLogs(ticket.id);
  };

  const handleCloseTicket = () => {
    setActiveTicket(null);
    setShowCloseModal(false);
    setSaveSuccessMsg("");
  };

  // ── Save Progress & Daily Work Log ─────────────────────────────────────────
  const handleSaveProgress = async (e) => {
    e?.preventDefault();
    if (!activeTicket) return;
    setSavingProgress(true);
    setSaveSuccessMsg("");

    try {
      const payload = {
        progress_percentage: Number(progressVal),
        status: ticketStatus,
        developer_notes: devNotes,
        developer_name: selectedDev?.name,
        logged_by: selectedDev?.name,
        work_date: workDate,
        work_start_time: workStartTime,
        work_end_time: workEndTime || undefined,
      };

      if (actionLogText.trim()) {
        payload.actions_taken = actionLogText.trim();
      }
      if (resolutionDetails.trim()) {
        payload.resolution_details = resolutionDetails.trim();
      }

      const res = await api.put(`/it-support/tickets/${activeTicket.id}/progress`, payload);
      const updated = res.data.ticket;

      setActiveTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setActionLogText("");
      setSaveSuccessMsg(`Daily work log & progress (${updated.progress_percentage}%) saved!`);
      setTimeout(() => setSaveSuccessMsg(""), 3500);

      // Refresh stats & work logs
      fetchDevTickets();
      fetchWorkLogs(updated.id);
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to update ticket progress.");
    } finally {
      setSavingProgress(false);
    }
  };

  // ── Resolve & Close Ticket After Issue Resolved ────────────────────────────
  const handleResolveAndClose = async (e) => {
    e?.preventDefault();
    if (!activeTicket) return;
    setClosingTicket(true);

    try {
      const resMsg = resolutionDetails.trim() || actionLogText.trim() || "Issue verified and resolved successfully by IT Support Engineer.";
      const payload = {
        progress_percentage: 100,
        status: "Closed",
        developer_notes: devNotes || `Resolved: ${resMsg}`,
        developer_name: selectedDev?.name,
        logged_by: selectedDev?.name,
        work_date: workDate || getTodayDateStr(),
        work_start_time: workStartTime || getCurrentTimeStr(),
        work_end_time: getCurrentTimeStr(),
        actions_taken: `[TICKET CLOSED & RESOLVED] ${resMsg}`,
        resolution_details: resMsg,
      };

      const res = await api.put(`/it-support/tickets/${activeTicket.id}/progress`, payload);
      const updated = res.data.ticket;

      setActiveTicket(updated);
      setProgressVal(100);
      setTicketStatus("Closed");
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setShowCloseModal(false);
      setActionLogText("");
      setSaveSuccessMsg("Ticket successfully RESOLVED and CLOSED (100%)!");
      setTimeout(() => setSaveSuccessMsg(""), 4000);

      fetchDevTickets();
      fetchWorkLogs(updated.id);
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to close ticket.");
    } finally {
      setClosingTicket(false);
    }
  };

  // Preset percentage handler
  const handleApplyPreset = (pct) => {
    setProgressVal(pct);
    if (pct === 100) {
      setTicketStatus("Resolved");
    } else if (ticketStatus === "Open" || ticketStatus === "Resolved" || ticketStatus === "Closed") {
      setTicketStatus("In Progress");
    }
  };

  // WhatsApp quick update link
  const buildWhatsAppClientMessage = () => {
    if (!activeTicket) return "";
    const msg =
      `Hello ${activeTicket.client_name}, this is ${selectedDev?.name || "your IT Support Engineer"} from IT Support regarding your ticket ${activeTicket.ticket_number} (${activeTicket.subject}).\n` +
      `Current Progress: ${progressVal}% (${ticketStatus}).\n` +
      (devNotes ? `Notes: ${devNotes}\n` : "") +
      `We are actively working on resolving your request. Thank you!`;
    const phone = (activeTicket.contact_number || "").replace(/[^0-9]/g, "");
    if (phone) {
      return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    }
    return `https://web.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
  };

  // Filtered tickets
  const displayedTickets = tickets.filter((t) => {
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });

  // ── Styles ─────────────────────────────────────────────────────────────────
  const styles = {
    container: {
      color: "#e2e8f0",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      minHeight: "100vh",
      paddingBottom: "40px",
    },
    headerCard: {
      background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "20px",
      padding: "24px 28px",
      marginBottom: "24px",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
    },
    titleRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "16px",
      marginBottom: "20px",
    },
    pageTitle: {
      fontSize: "26px",
      fontWeight: "800",
      background: "linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      letterSpacing: "-0.5px",
    },
    devPickerRow: {
      display: "flex",
      gap: "10px",
      overflowX: "auto",
      paddingBottom: "6px",
      alignItems: "center",
    },
    devPill: (active, color = "#3b82f6") => ({
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "8px 16px",
      borderRadius: "14px",
      background: active
        ? `linear-gradient(135deg, ${color}25, ${color}10)`
        : "rgba(255, 255, 255, 0.04)",
      border: `1.5px solid ${active ? color : "rgba(255, 255, 255, 0.08)"}`,
      color: active ? "#ffffff" : "#94a3b8",
      cursor: "pointer",
      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      whiteSpace: "nowrap",
      fontWeight: active ? "700" : "500",
      boxShadow: active ? `0 4px 16px ${color}30` : "none",
    }),
    devAvatar: (color = "#3b82f6") => ({
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      background: `linear-gradient(135deg, ${color}, ${color}99)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#ffffff",
      fontSize: "13px",
      fontWeight: "800",
      flexShrink: 0,
      boxShadow: `0 2px 8px ${color}50`,
    }),
    metricsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "16px",
      marginBottom: "24px",
    },
    metricCard: (color) => ({
      background: "rgba(30, 41, 59, 0.5)",
      border: `1px solid ${color}30`,
      borderRadius: "16px",
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      position: "relative",
      overflow: "hidden",
    }),
    metricValue: (color) => ({
      fontSize: "28px",
      fontWeight: "800",
      color: color || "#ffffff",
      lineHeight: 1,
    }),
    metricLabel: {
      fontSize: "12px",
      color: "#94a3b8",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    filterBar: {
      display: "flex",
      gap: "12px",
      flexWrap: "wrap",
      alignItems: "center",
      marginBottom: "20px",
    },
    searchBox: {
      flex: 1,
      minWidth: "240px",
      position: "relative",
    },
    input: {
      width: "100%",
      background: "rgba(30, 41, 59, 0.6)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "12px",
      padding: "10px 14px 10px 38px",
      color: "#ffffff",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box",
    },
    select: {
      background: "#1e293b",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      borderRadius: "12px",
      padding: "10px 14px",
      color: "#e2e8f0",
      fontSize: "13px",
      outline: "none",
      cursor: "pointer",
    },
    cardGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
      gap: "20px",
    },
    ticketCard: (priority) => ({
      background: "linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.7) 100%)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderLeft: `4px solid ${
        priority === "Critical"
          ? "#ef4444"
          : priority === "High"
          ? "#f97316"
          : priority === "Medium"
          ? "#3b82f6"
          : "#10b981"
      }`,
      borderRadius: "16px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      cursor: "pointer",
      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      position: "relative",
    }),
    progressBarBg: {
      width: "100%",
      height: "8px",
      background: "rgba(255, 255, 255, 0.08)",
      borderRadius: "6px",
      overflow: "hidden",
      position: "relative",
    },
    progressBarFill: (pct) => ({
      height: "100%",
      width: `${pct}%`,
      background: getProgressGradient(pct),
      borderRadius: "6px",
      transition: "width 0.4s ease",
    }),
    drawerOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.65)",
      backdropFilter: "blur(6px)",
      zIndex: 1050,
      display: "flex",
      justifyContent: "flex-end",
    },
    drawer: {
      width: "100%",
      maxWidth: "580px",
      background: "#0f172a",
      borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
      boxShadow: "-10px 0 50px rgba(0, 0, 0, 0.8)",
      height: "100vh",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
    },
    drawerHeader: {
      padding: "24px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
      background: "rgba(30, 41, 59, 0.5)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    drawerBody: {
      padding: "24px",
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: "24px",
    },
    sectionCard: {
      background: "rgba(30, 41, 59, 0.4)",
      border: "1px solid rgba(255, 255, 255, 0.06)",
      borderRadius: "14px",
      padding: "18px",
    },
    sectionTitle: {
      fontSize: "12px",
      fontWeight: "700",
      color: "#94a3b8",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      marginBottom: "12px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    presetBtn: (active) => ({
      padding: "6px 12px",
      borderRadius: "8px",
      fontSize: "12px",
      fontWeight: "700",
      cursor: "pointer",
      border: active ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
      background: active ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.05)",
      color: active ? "#38bdf8" : "#cbd5e1",
      transition: "all 0.15s ease",
    }),
    saveBtn: {
      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      color: "#ffffff",
      border: "none",
      borderRadius: "12px",
      padding: "14px 24px",
      fontSize: "15px",
      fontWeight: "700",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      width: "100%",
      boxShadow: "0 4px 16px rgba(16, 185, 129, 0.35)",
      transition: "all 0.2s ease",
    },
    waBtn: {
      background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)",
      color: "#ffffff",
      textDecoration: "none",
      borderRadius: "12px",
      padding: "12px 18px",
      fontSize: "14px",
      fontWeight: "700",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      boxShadow: "0 4px 16px rgba(37, 211, 102, 0.25)",
    },
  };

  return (
    <div style={styles.container}>
      <style>{`
        .dev-ticket-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(0,0,0,0.45);
          border-color: rgba(56, 189, 248, 0.35);
        }
        .dev-pill:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,0.08);
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #38bdf8;
          cursor: pointer;
          border: 3px solid #0f172a;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.8);
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 10px;
          border-radius: 5px;
          outline: none;
        }
      `}</style>

      {/* ── Top Header & Active Developer Selector ── */}
      <div style={styles.headerCard}>
        <div style={styles.titleRow}>
          <div>
            <div style={styles.pageTitle}>
              <FaLaptopCode style={{ color: "#38bdf8" }} />
              IT Support Engineer Workspace
            </div>
            <div style={{ color: "#94a3b8", fontSize: "14px", marginTop: "4px" }}>
              Update ticket progress, track work completion percentage, and resolve IT support issues
            </div>
          </div>

          <button
            onClick={() => {
              fetchDevelopers();
              fetchDevTickets();
            }}
            style={{
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              color: "#38bdf8",
              padding: "8px 16px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
            }}
          >
            <FaSyncAlt /> Refresh
          </button>
        </div>

        {/* ── IT Support Engineer Selection ── */}
        <div style={{ marginBottom: "6px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Select Active IT Support Engineer Profile:
          </div>
          <div style={styles.devPickerRow}>
            {developers.map((dev) => {
              const active = selectedDev?.id === dev.id;
              const color = dev.avatar_color || "#3b82f6";
              return (
                <div
                  key={dev.id}
                  className="dev-pill"
                  onClick={() => setSelectedDev(dev)}
                  style={styles.devPill(active, color)}
                >
                  <div style={styles.devAvatar(color)}>
                    {dev.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", lineHeight: "1.2" }}>{dev.name}</div>
                    <div style={{ fontSize: "11px", color: active ? color : "#64748b", marginTop: "2px" }}>
                      {dev.role}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── IT Support Engineer KPI Cards ── */}
      {selectedDev && (
        <div style={styles.metricsGrid}>
          <div style={styles.metricCard("#38bdf8")}>
            <div style={styles.metricLabel}>Assigned Tickets</div>
            <div style={styles.metricValue("#38bdf8")}>{stats.total}</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Assigned to {selectedDev.name}</div>
          </div>

          <div style={styles.metricCard("#f59e0b")}>
            <div style={styles.metricLabel}>In Progress</div>
            <div style={styles.metricValue("#f59e0b")}>{stats.in_progress}</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>Actively being resolved</div>
          </div>

          <div style={styles.metricCard("#10b981")}>
            <div style={styles.metricLabel}>Completed / Resolved</div>
            <div style={styles.metricValue("#10b981")}>{stats.resolved}</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>100% Finished</div>
          </div>

          <div style={styles.metricCard(getProgressColor(stats.avg_progress || 0))}>
            <div style={styles.metricLabel}>Avg. Work Completed</div>
            <div style={styles.metricValue(getProgressColor(stats.avg_progress || 0))}>
              {stats.avg_progress || 0}%
            </div>
            <div style={styles.progressBarBg}>
              <div style={styles.progressBarFill(stats.avg_progress || 0)} />
            </div>
          </div>

          {stats.critical > 0 && (
            <div style={styles.metricCard("#ef4444")}>
              <div style={styles.metricLabel}>Critical Priority</div>
              <div style={styles.metricValue("#ef4444")}>
                <FaExclamationTriangle style={{ fontSize: "20px", marginRight: "6px" }} />
                {stats.critical}
              </div>
              <div style={{ fontSize: "11px", color: "#f87171" }}>Requires immediate action</div>
            </div>
          )}
        </div>
      )}

      {/* ── Filters & Search ── */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <FaSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          <input
            style={styles.input}
            placeholder="Search ticket number, client, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          style={styles.select}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        <select
          style={styles.select}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {(statusFilter || priorityFilter || searchQuery) && (
          <button
            onClick={() => {
              setStatusFilter("");
              setPriorityFilter("");
              setSearchQuery("");
            }}
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: "10px 14px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FaTimes /> Clear
          </button>
        )}
      </div>

      {/* ── View Mode & Results Bar ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ color: "#94a3b8", fontSize: "14px", fontWeight: "600" }}>
          Assigned Tickets ({displayedTickets.length})
        </div>
        <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "3px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            style={{
              background: viewMode === "grid" ? "rgba(56, 189, 248, 0.2)" : "transparent",
              border: "none",
              color: viewMode === "grid" ? "#38bdf8" : "#94a3b8",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FaTh /> Grid View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            style={{
              background: viewMode === "list" ? "rgba(56, 189, 248, 0.2)" : "transparent",
              border: "none",
              color: viewMode === "list" ? "#38bdf8" : "#94a3b8",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FaList /> List View
          </button>
        </div>
      </div>

      {/* ── Ticket Grid / List View ── */}
      {ticketsLoading ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#64748b" }}>
          <FaSpinner style={{ fontSize: "32px", animation: "spin 1s linear infinite", marginBottom: "12px", color: "#38bdf8" }} />
          <div>Loading assigned tickets for {selectedDev?.name}...</div>
        </div>
      ) : displayedTickets.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            background: "rgba(30, 41, 59, 0.3)",
            borderRadius: "16px",
            border: "1px dashed rgba(255, 255, 255, 0.1)",
          }}
        >
          <FaClipboardList style={{ fontSize: "44px", color: "#475569", marginBottom: "12px" }} />
          <div style={{ fontSize: "16px", fontWeight: "600", color: "#94a3b8" }}>No tickets found</div>
          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
            {selectedDev?.name} has no tickets matching the current filter.
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div style={styles.cardGrid}>
          {displayedTickets.map((t) => {
            const pct = t.progress_percentage || 0;
            return (
              <div
                key={t.id}
                className="dev-ticket-card"
                onClick={() => handleOpenTicket(t)}
                style={styles.ticketCard(t.priority)}
              >
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: "800", color: "#38bdf8", letterSpacing: "0.5px" }}>
                      {t.ticket_number}
                    </span>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                      {t.category}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>

                {/* Subject & Description */}
                <div>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: "#ffffff", marginBottom: "6px" }}>
                    {t.subject}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#94a3b8",
                      lineHeight: "1.4",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {t.description}
                  </div>
                </div>

                {/* Client info */}
                <div
                  style={{
                    fontSize: "12px",
                    color: "#cbd5e1",
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: "600", color: "#ffffff" }}>{t.client_name}</span>
                    {t.company_name && <span style={{ color: "#64748b" }}> ({t.company_name})</span>}
                  </div>
                  {t.contact_number && (
                    <span style={{ color: "#94a3b8", fontSize: "11px" }}>📞 {t.contact_number}</span>
                  )}
                </div>

                {/* Progress bar section */}
                <div style={{ marginTop: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Work Completed
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: "800", color: getProgressColor(pct) }}>
                      {pct}%
                    </span>
                  </div>
                  <div style={styles.progressBarBg}>
                    <div style={styles.progressBarFill(pct)} />
                  </div>
                </div>

                {/* Footer action trigger + Edit and Delete Options */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "8px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                    fontSize: "12px",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingTicket(t);
                      }}
                      title="View Ticket"
                      style={{
                        background: "rgba(139, 92, 246, 0.15)",
                        border: "1px solid rgba(139, 92, 246, 0.3)",
                        color: "#a78bfa",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "11px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: "600",
                      }}
                    >
                      <FaEye /> View
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTicket(t);
                      }}
                      title="Edit Ticket"
                      style={{
                        background: "rgba(56, 189, 248, 0.15)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        color: "#38bdf8",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "11px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: "600",
                      }}
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTicket(t);
                      }}
                      style={{
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#f87171",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "11px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: "600",
                      }}
                    >
                      <FaTrashAlt /> Delete
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "#64748b", fontWeight: "normal", fontSize: "11px" }}>
                      {t.work_logs_count ? `📝 ${t.work_logs_count} updates` : "Update log"}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#38bdf8", fontWeight: "600" }}>
                      Update <FaChevronRight style={{ fontSize: "10px" }} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── List View (Table) ── */
        <div style={{
          background: "rgba(30, 41, 59, 0.5)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          overflow: "hidden",
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Ticket #", "Client", "Subject", "Category", "Priority", "Status", "Progress", "Actions"].map((h) => (
                    <th key={h} style={{
                      textAlign: "left",
                      padding: "14px 16px",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                      background: "rgba(0, 0, 0, 0.2)",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedTickets.map((t) => {
                  const pct = t.progress_percentage || 0;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenTicket(t)}
                      style={{
                        cursor: "pointer",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        background: activeTicket?.id === t.id ? "rgba(56, 189, 248, 0.08)" : "transparent",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(56, 189, 248, 0.05)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = activeTicket?.id === t.id ? "rgba(56, 189, 248, 0.08)" : "transparent"; }}
                    >
                      <td style={{ padding: "14px 16px", color: "#38bdf8", fontWeight: "800", fontSize: "13px" }}>
                        {t.ticket_number}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ color: "#ffffff", fontWeight: "600", fontSize: "13px" }}>{t.client_name}</div>
                        {t.company_name && <div style={{ color: "#64748b", fontSize: "11px" }}>{t.company_name}</div>}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#e2e8f0", fontSize: "13px", maxWidth: "240px" }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</div>
                      </td>
                      <td style={{ padding: "14px 16px", color: "#94a3b8", fontSize: "13px" }}>{t.category}</td>
                      <td style={{ padding: "14px 16px" }}><PriorityBadge priority={t.priority} /></td>
                      <td style={{ padding: "14px 16px" }}><StatusBadge status={t.status} /></td>
                      <td style={{ padding: "14px 16px", minWidth: "130px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "700", color: getProgressColor(pct) }}>{pct}%</span>
                        </div>
                        <div style={styles.progressBarBg}>
                          <div style={styles.progressBarFill(pct)} />
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => setViewingTicket(t)}
                            title="View Ticket"
                            style={{
                              background: "rgba(139, 92, 246, 0.15)",
                              border: "1px solid rgba(139, 92, 246, 0.3)",
                              color: "#a78bfa",
                              borderRadius: "6px",
                              padding: "6px 10px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <FaEye /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenTicket(t)}
                            title="Edit Ticket"
                            style={{
                              background: "rgba(56, 189, 248, 0.15)",
                              border: "1px solid rgba(56, 189, 248, 0.3)",
                              color: "#38bdf8",
                              borderRadius: "6px",
                              padding: "6px 10px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <FaEdit /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTicket(t)}
                            title="Delete Ticket"
                            style={{
                              background: "rgba(239, 68, 68, 0.15)",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              color: "#f87171",
                              borderRadius: "6px",
                              padding: "6px 10px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <FaTrashAlt /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Ticket Action & Work Progress Drawer ── */}
      {activeTicket && (
        <div style={styles.drawerOverlay} onClick={(e) => { if (e.target === e.currentTarget) handleCloseTicket(); }}>
          <div style={styles.drawer}>
            {/* Header */}
            <div style={styles.drawerHeader}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "18px", fontWeight: "800", color: "#38bdf8" }}>
                    {activeTicket.ticket_number}
                  </span>
                  <PriorityBadge priority={activeTicket.priority} />
                  <StatusBadge status={activeTicket.status} />
                </div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#ffffff" }}>
                  {activeTicket.subject}
                </div>
              </div>

              <button
                onClick={handleCloseTicket}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#94a3b8",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={styles.drawerBody}>
              {/* Client & Issue Details */}
              <div style={styles.sectionCard}>
                <div style={styles.sectionTitle}>
                  <FaBuilding /> Client & Ticket Context
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Client Name</div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff" }}>{activeTicket.client_name}</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>{activeTicket.client_email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Category & Company</div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#38bdf8" }}>{activeTicket.category}</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>{activeTicket.company_name || "N/A"}</div>
                  </div>
                </div>

                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Issue Description</div>
                <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5", whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.25)", padding: "10px", borderRadius: "8px" }}>
                  {activeTicket.description}
                </div>
              </div>

              {/* Work Progress Update Interactive Section */}
              <div style={{ ...styles.sectionCard, border: "1px solid rgba(56, 189, 248, 0.3)", background: "rgba(56, 189, 248, 0.03)" }}>
                <div style={{ ...styles.sectionTitle, color: "#38bdf8" }}>
                  <FaSlidersH /> Work Completion & Progress
                </div>

                {/* Progress Percentage Display & Slider */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "13px", color: "#cbd5e1", fontWeight: "600" }}>Percentage Completed:</span>
                    <span
                      style={{
                        fontSize: "22px",
                        fontWeight: "900",
                        color: getProgressColor(progressVal),
                        background: `${getProgressColor(progressVal)}20`,
                        padding: "4px 12px",
                        borderRadius: "8px",
                        border: `1px solid ${getProgressColor(progressVal)}40`,
                      }}
                    >
                      {progressVal}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progressVal}
                    onChange={(e) => handleApplyPreset(Number(e.target.value))}
                    style={{
                      background: `linear-gradient(to right, ${getProgressColor(progressVal)} 0%, ${getProgressColor(progressVal)} ${progressVal}%, rgba(255,255,255,0.1) ${progressVal}%, rgba(255,255,255,0.1) 100%)`,
                    }}
                  />

                  {/* Preset Pills */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                    {PRESET_PERCENTAGES.map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleApplyPreset(pct)}
                        style={styles.presetBtn(progressVal === pct)}
                      >
                        {pct === 100 ? "✓ 100% (Done)" : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Selector */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px", fontWeight: "600" }}>
                    Ticket Status:
                  </label>
                  <select
                    style={{ ...styles.select, width: "100%", padding: "10px 12px" }}
                    value={ticketStatus}
                    onChange={(e) => setTicketStatus(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Developer Notes */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px", fontWeight: "600" }}>
                    IT Support Engineer Internal Notes / Root Cause:
                  </label>
                  <textarea
                    rows={3}
                    style={{ ...styles.input, resize: "vertical", fontFamily: "inherit" }}
                    placeholder="Enter technical observations, troubleshooting steps, or blockers..."
                    value={devNotes}
                    onChange={(e) => setDevNotes(e.target.value)}
                  />
                </div>

                {/* Add Work Log Entry */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px", fontWeight: "600" }}>
                    Actions Taken (Recorded to Ticket Timeline):
                  </label>
                  <textarea
                    rows={2}
                    style={{ ...styles.input, resize: "vertical", fontFamily: "inherit" }}
                    placeholder="e.g. Cleared cache, updated connection pool configuration, verified in staging..."
                    value={actionLogText}
                    onChange={(e) => setActionLogText(e.target.value)}
                  />
                </div>

                {saveSuccessMsg && (
                  <div
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      color: "#10b981",
                      fontSize: "13px",
                      fontWeight: "600",
                      marginBottom: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <FaCheckCircle /> {saveSuccessMsg}
                  </div>
                )}

                {/* Save Button */}
                <button
                  type="button"
                  onClick={handleSaveProgress}
                  disabled={savingProgress}
                  style={{
                    ...styles.saveBtn,
                    opacity: savingProgress ? 0.6 : 1,
                    cursor: savingProgress ? "not-allowed" : "pointer",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    {savingProgress ? (
                      <FaSpinner style={{ animation: "spin 1s linear infinite" }} />
                    ) : (
                      <FaSave />
                    )}
                    <span>{savingProgress ? "Saving Progress..." : `Save Progress (${progressVal}%)`}</span>
                  </span>
                </button>
              </div>

              {/* Direct WhatsApp Update to Client */}
              <div style={styles.sectionCard}>
                <div style={styles.sectionTitle}>
                  <FaWhatsapp style={{ color: "#25d366" }} /> Notify Client via WhatsApp
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px" }}>
                  Send a pre-filled WhatsApp message with your current progress ({progressVal}%) and notes directly to the client.
                </div>
                <a
                  href={buildWhatsAppClientMessage()}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.waBtn}
                >
                  <FaWhatsapp style={{ fontSize: "18px" }} />
                  Message Client ({activeTicket.contact_number || "Direct Web"})
                </a>
              </div>

              {/* Work Log Timeline */}
              <div style={styles.sectionCard}>
                <div style={styles.sectionTitle}>
                  <FaHistory /> Activity & Work Log History
                </div>
                {workLogsLoading ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                    <FaSpinner style={{ animation: "spin 1s linear infinite" }} /> Loading history...
                  </div>
                ) : workLogs.length === 0 ? (
                  <div style={{ color: "#64748b", fontSize: "13px", fontStyle: "italic", textAlign: "center", padding: "16px 0" }}>
                    No work sessions logged yet for this ticket.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {workLogs.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          background: "rgba(0, 0, 0, 0.25)",
                          borderRadius: "10px",
                          padding: "12px 14px",
                          border: "1px solid rgba(255, 255, 255, 0.04)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontSize: "13px", fontWeight: "700", color: "#38bdf8" }}>
                            {log.developer_name}
                          </span>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>
                            {log.work_start ? new Date(log.work_start).toLocaleString() : ""}
                          </span>
                        </div>
                        <div style={{ fontSize: "13px", color: "#e2e8f0", marginBottom: "6px" }}>
                          {log.actions_taken}
                        </div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                          <span style={{ fontSize: "11px", color: "#10b981", fontWeight: "600" }}>
                            Status: {log.status_after}
                          </span>
                          {log.progress_percentage !== undefined && (
                            <span style={{ fontSize: "11px", color: "#38bdf8" }}>
                              Progress: {log.progress_percentage}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delete Ticket Option in Drawer */}
              <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <button
                  type="button"
                  onClick={() => handleDeleteTicket(activeTicket)}
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "10px",
                    padding: "12px 18px",
                    color: "#f87171",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "100%",
                  }}
                >
                  <FaTrashAlt /> Delete Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Ticket Delete Confirmation Modal ── */}
      {deleteTicketTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1300,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTicketTarget(null); }}
        >
          <div
            style={{
              background: "#1e293b",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "440px",
              width: "100%",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#f87171", fontSize: "18px", fontWeight: "800", marginBottom: "12px" }}>
              <FaTrashAlt /> Delete Support Ticket
            </div>
            <p style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: "1.6", margin: "0 0 20px" }}>
              Are you sure you want to permanently delete ticket <strong style={{ color: "#38bdf8" }}>{deleteTicketTarget.ticket_number}</strong> ({deleteTicketTarget.subject})? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setDeleteTicketTarget(null)}
                disabled={deletingTicket}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 16px",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "13px",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTicket}
                disabled={deletingTicket}
                style={{
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 18px",
                  color: "#ffffff",
                  cursor: deletingTicket ? "not-allowed" : "pointer",
                  fontWeight: "700",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {deletingTicket ? <FaSpinner style={{ animation: "spin 1s linear infinite" }} /> : <FaTrashAlt />}
                {deletingTicket ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Ticket Details Modal ── */}
      {viewingTicket && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1250,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingTicket(null);
          }}
        >
          <div
            style={{
              background: "#1e293b",
              border: "1px solid rgba(139, 92, 246, 0.35)",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "680px",
              width: "100%",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#a78bfa", fontSize: "18px", fontWeight: "700" }}>
                <FaEye /> View Ticket — {viewingTicket.ticket_number}
              </div>
              <button
                onClick={() => setViewingTicket(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              {[
                ["Ticket Number", viewingTicket.ticket_number],
                ["Subject", viewingTicket.subject],
                ["Category", viewingTicket.category],
                ["Priority", viewingTicket.priority],
                ["Status", viewingTicket.status],
                ["Company", viewingTicket.company_name || "—"],
                ["Client Name", viewingTicket.client_name || "—"],
                ["Client Email", viewingTicket.client_email || "—"],
                ["Contact Number", viewingTicket.contact_number || "—"],
                ["Created Date", new Date(viewingTicket.created_at).toLocaleString()],
                ["Assigned Engineer", viewingTicket.assigned_to || "Not Assigned"],
                ["Assignment Date & Time", viewingTicket.assigned_at ? new Date(viewingTicket.assigned_at).toLocaleString() : "—"],
                ["Progress", `${viewingTicket.progress_percentage || 0}%`],
                ["Work Logs Recorded", `${viewingTicket.work_logs_count || 0} updates`],
              ].map(([label, value]) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "10px 14px" }}>
                  <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
                  <div style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: "500" }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "14px", marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Description</div>
              <div style={{ color: "#e2e8f0", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                {viewingTicket.description || "—"}
              </div>
            </div>

            {viewingTicket.admin_notes && (
              <div style={{ background: "rgba(34,197,94,0.06)", borderRadius: "8px", padding: "14px", border: "1px solid rgba(34,197,94,0.15)", marginBottom: "12px" }}>
                <div style={{ fontSize: "11px", color: "#22c55e", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Admin Notes</div>
                <div style={{ color: "#e2e8f0", fontSize: "14px", lineHeight: "1.6" }}>{viewingTicket.admin_notes}</div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => {
                  const t = viewingTicket;
                  setViewingTicket(null);
                  handleOpenTicket(t);
                }}
                style={{
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  borderRadius: "8px",
                  padding: "10px 18px",
                  color: "#38bdf8",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaEdit /> Update / Edit Ticket
              </button>
              <button
                type="button"
                onClick={() => setViewingTicket(null)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 18px",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "13px",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITDeveloperModule;
