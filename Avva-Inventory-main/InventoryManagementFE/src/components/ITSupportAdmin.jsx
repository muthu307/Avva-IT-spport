import React, { useState, useEffect, useCallback } from "react";
import {
  FaShieldAlt,
  FaTicketAlt,
  FaSearch,
  FaTimes,
  FaSpinner,
  FaCheckCircle,
  FaSyncAlt,
  FaSave,
  FaClipboardList,
  FaExclamationCircle,
  FaChevronLeft,
  FaChevronRight,
  FaWhatsapp,
  FaUserCheck,
  FaPaperPlane,
  FaUsers,
  FaUserPlus,
  FaChartLine,
  FaTasks,
  FaTrashAlt,
  FaEdit,
  FaCopy,
  FaExternalLinkAlt,
  FaInfoCircle,
  FaCheck,
} from "react-icons/fa";
import api from "../utils/api";
import { StatusBadge, PriorityBadge } from "./ITSupport";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUSES = ["Open", "In Progress", "Pending Client Info", "Pending Parts", "Resolved", "Closed"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const CATEGORIES = [
  "Hardware", "Software", "Network", "Printer",
  "Email", "Access / Permissions", "Other",
];

const STAT_CARDS = [
  { key: "total",       label: "Total Tickets",   color: "#818cf8", icon: <FaTicketAlt /> },
  { key: "open",        label: "Open",            color: "#38bdf8", icon: <FaClipboardList /> },
  { key: "in_progress", label: "In Progress",     color: "#f59e0b", icon: <FaSpinner /> },
  { key: "resolved",    label: "Resolved",        color: "#10b981", icon: <FaCheckCircle /> },
  { key: "critical",    label: "Critical",        color: "#ef4444", icon: <FaExclamationCircle /> },
];

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

// ── Main Component ────────────────────────────────────────────────────────────
const ITSupportAdmin = () => {
  // Inject global styles into <head> to avoid React DOM reconciliation errors
  // (inline <style> tags inside JSX cause removeChild/insertBefore failures)
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-itsupportadmin", "1");
    styleEl.textContent = `
      .ticket-row:hover { background: rgba(56, 189, 248, 0.06) !important; cursor: pointer; }
      .ticket-row.selected { background: rgba(56, 189, 248, 0.12) !important; }
      @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      @keyframes slideIn { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
      .dev-card-hover:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(0,0,0,0.5); }
    `;
    document.head.appendChild(styleEl);
    return () => { document.head.removeChild(styleEl); };
  }, []);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState("tickets"); // "tickets" | "workload" | "developers"

  // Ticket list state
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Developers & Overview State
  const [developers, setDevelopers] = useState([]);
  const [devOverview, setDevOverview] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [expandedDevId, setExpandedDevId] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDeveloper, setFilterDeveloper] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const PER_PAGE = 15;

  // Detail panel edit state
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editAssigned, setEditAssigned] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editProgress, setEditProgress] = useState(0);

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [assignedBy, setAssignedBy] = useState("Admin");
  const [assignNotes, setAssignNotes] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState(null);
  const [showAssignNotificationModal, setShowAssignNotificationModal] = useState(false);
  const [assignNotificationCopied, setAssignNotificationCopied] = useState(false);

  // Manual WhatsApp Notification modal state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppModalTicket, setWhatsAppModalTicket] = useState(null);
  const [whatsAppModalData, setWhatsAppModalData] = useState(null);
  const [loadingWhatsAppModal, setLoadingWhatsAppModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // IT Support Engineer CRUD modal state
  const [showDevModal, setShowDevModal] = useState(false);
  const [devFormMode, setDevFormMode] = useState("add"); // "add" | "edit"
  const [editingDevId, setEditingDevId] = useState(null);
  const [devFormData, setDevFormData] = useState({
    name: "",
    phone: "",
    email: "",
    role: "IT Support Engineer",
    specialization: "Full Stack & IT Support",
    status: "Active",
    avatar_color: "#3b82f6",
  });
  const [devSubmitting, setDevSubmitting] = useState(false);

  // ── Fetch Tickets ───────────────────────────────────────────────────────────
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
        ...(filterDeveloper && { assigned_to: filterDeveloper }),
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
  }, [page, search, filterStatus, filterPriority, filterCategory, filterDeveloper]);

  const fetchStats = async () => {
    try {
      const res = await api.get("/it-support/stats");
      setStats(res.data || {});
    } catch { /* noop */ }
  };

  const fetchDevelopers = async () => {
    try {
      const res = await api.get("/it-support/developers");
      setDevelopers(res.data.developers || []);
    } catch { /* noop */ }
  };

  const fetchDevelopersOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await api.get("/it-support/developers/overview");
      setDevOverview(res.data.overview || []);
      if (!expandedDevId && res.data.overview?.length > 0) {
        setExpandedDevId(res.data.overview[0].developer.id);
      }
    } catch { /* noop */ }
    finally {
      setOverviewLoading(false);
    }
  }, [expandedDevId]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    fetchStats();
    fetchDevelopers();
  }, []);

  useEffect(() => {
    if (activeTab === "workload") {
      fetchDevelopersOverview();
    }
  }, [activeTab, fetchDevelopersOverview]);

  // Deep linking ?ticket= URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tn = params.get("ticket");
    if (!tn) return;

    if (tickets.length > 0) {
      const match = tickets.find((t) => t.ticket_number === tn);
      if (match) {
        openDetail(match);
        return;
      }
    }

    // If not in current page, fetch it directly
    api.get(`/it-support/tickets/by-number/${encodeURIComponent(tn)}`)
      .then((res) => {
        if (res.data?.ticket) {
          openDetail(res.data.ticket);
        }
      })
      .catch(() => {
        api.get(`/it-support/tickets?search=${encodeURIComponent(tn)}`)
          .then((res) => {
            const found = res.data?.tickets?.find((t) => t.ticket_number === tn);
            if (found) openDetail(found);
          })
          .catch(() => {});
      });
  }, [tickets]);

  // ── WhatsApp Notification Helpers ──────────────────────────────────────────
  const buildLocalWhatsAppMessage = (ticket) => {
    if (!ticket) return "";
    const createdDate = ticket.created_at ? new Date(ticket.created_at) : new Date();
    const dateStr = createdDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr = createdDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const directUrl = `${window.location.origin}/it-support-admin?ticket=${ticket.ticket_number}`;

    const contactLine = ticket.contact_number ? `📞 *Contact:* ${ticket.contact_number}\n` : "";
    const companyLine = ticket.company_name ? `🏢 *Company:* ${ticket.company_name}\n` : "";

    return (
      `🔔 *New IT Support Ticket Notification*\n\n` +
      `👤 *Client Name:* ${ticket.client_name}\n` +
      `🎫 *Ticket Number:* ${ticket.ticket_number}\n` +
      `📅 *Date:* ${dateStr}\n` +
      `⏰ *Time:* ${timeStr}\n\n` +
      `📋 *Request Details:*\n` +
      `• *Subject:* ${ticket.subject}\n` +
      `• *Category:* ${ticket.category}\n` +
      `• *Priority:* ${ticket.priority}\n` +
      `• *Email:* ${ticket.client_email}\n` +
      contactLine +
      companyLine +
      `• *Description:*\n${ticket.description}\n\n` +
      `🔗 *Direct Ticket URL:*\n${directUrl}\n\n` +
      `⚡ *IT Support WhatsApp Group:* Please review and action this ticket.`
    );
  };

  const openWhatsAppModal = async (ticket) => {
    if (!ticket) return;
    setWhatsAppModalTicket(ticket);
    setCopyFeedback(false);
    setShowWhatsAppModal(true);
    setLoadingWhatsAppModal(true);

    const localMsg = ticket.whatsapp_message || buildLocalWhatsAppMessage(ticket);
    const encoded = encodeURIComponent(localMsg);
    setWhatsAppModalData({
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      client_name: ticket.client_name,
      whatsapp_message: localMsg,
      whatsapp_web_url: `https://web.whatsapp.com/send?text=${encoded}`,
      whatsapp_app_url: `https://api.whatsapp.com/send?text=${encoded}`,
      whatsapp_desktop_url: `whatsapp://send?text=${encoded}`,
      whatsapp_group_invite: "https://chat.whatsapp.com/G660UKTsAmyIH5ZwRigP7E",
      whatsapp_notified: ticket.whatsapp_notified,
      whatsapp_sent_at: ticket.whatsapp_sent_at,
    });

    try {
      const res = await api.get(
        `/it-support/tickets/${ticket.id}/whatsapp-notification?base_url=${encodeURIComponent(window.location.origin)}`
      );
      if (res.data) {
        setWhatsAppModalData(res.data);
      }
    } catch (err) {
      console.warn("Could not fetch WhatsApp notification details from server, using local fallback", err);
    } finally {
      setLoadingWhatsAppModal(false);
    }
  };

  const closeWhatsAppModal = () => {
    setShowWhatsAppModal(false);
    setWhatsAppModalTicket(null);
    setWhatsAppModalData(null);
    setCopyFeedback(false);
  };

  const handleMarkWhatsAppSent = async (ticketId) => {
    try {
      const res = await api.post(`/it-support/tickets/${ticketId}/mark-whatsapp-sent`);
      const updated = res.data.ticket;
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, ...updated } : t)));
      if (selected?.id === ticketId) {
        setSelected((prev) => ({ ...prev, ...updated }));
      }
      if (whatsAppModalTicket?.id === ticketId) {
        setWhatsAppModalTicket((prev) => ({ ...prev, ...updated }));
      }
      if (whatsAppModalData) {
        setWhatsAppModalData((prev) => ({
          ...prev,
          whatsapp_notified: true,
          whatsapp_sent_at: updated.whatsapp_sent_at,
        }));
      }
    } catch (err) {
      console.error("Failed to mark WhatsApp sent", err);
    }
  };

  const handleLaunchWhatsAppWeb = async () => {
    if (!whatsAppModalData?.whatsapp_web_url) return;
    window.open(whatsAppModalData.whatsapp_web_url, "_blank", "noopener,noreferrer");
    if (whatsAppModalTicket?.id) {
      await handleMarkWhatsAppSent(whatsAppModalTicket.id);
    }
  };

  const handleLaunchWhatsAppApp = async () => {
    if (!whatsAppModalData) return;
    const desktopUrl = whatsAppModalData.whatsapp_desktop_url;
    const appUrl = whatsAppModalData.whatsapp_app_url || whatsAppModalData.whatsapp_web_url;

    if (desktopUrl) {
      window.location.href = desktopUrl;
    } else {
      window.open(appUrl, "_blank", "noopener,noreferrer");
    }

    if (whatsAppModalTicket?.id) {
      await handleMarkWhatsAppSent(whatsAppModalTicket.id);
    }
  };

  const handleCopyWhatsAppMessage = () => {
    if (!whatsAppModalData?.whatsapp_message) return;
    navigator.clipboard.writeText(whatsAppModalData.whatsapp_message).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2200);
    });
  };

  // ── Detail Panel Helpers ───────────────────────────────────────────────────
  const openDetail = (ticket) => {
    setSelected(ticket);
    setEditStatus(ticket.status);
    setEditNotes(ticket.admin_notes || "");
    setEditAssigned(ticket.assigned_to || "");
    setEditPriority(ticket.priority || "");
    setEditProgress(ticket.progress_percentage || 0);
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
        progress_percentage: Number(editProgress),
      });
      const updated = res.data.ticket;
      setSelected(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      fetchStats();
      fetchDevelopers();
      const btn = document.getElementById("save-btn");
      if (btn) {
        btn.textContent = "✓ Saved!";
        setTimeout(() => {
          btn.textContent = "Save Changes";
        }, 1800);
      }
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
      const payload = { status };
      if (status === "Resolved" || status === "Closed") {
        payload.progress_percentage = 100;
        setEditProgress(100);
      }
      const res = await api.put(`/it-support/tickets/${selected.id}`, payload);
      const updated = res.data.ticket;
      setSelected(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      fetchStats();
      fetchDevelopers();
    } catch { /* noop */ }
    finally {
      setUpdating(false);
    }
  };

  // ── Assignment ─────────────────────────────────────────────────────────────
  const handleAssign = async () => {
    if (!selected || !selectedMemberId) return;
    setAssigning(true);
    try {
      const res = await api.post(`/it-support/tickets/${selected.id}/assign`, {
        developer_id: parseInt(selectedMemberId, 10),
        assigned_by: assignedBy.trim() || "Admin",
        admin_notes: assignNotes.trim() || undefined,
        base_url: window.location.origin,
      });
      const updated = res.data.ticket;
      setSelected(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      fetchStats();
      fetchDevelopers();
      if (activeTab === "workload") fetchDevelopersOverview();

      const assignData = {
        ticket: updated,
        member: res.data.assigned_member,
        assigned_engineer_name: res.data.assigned_engineer_name || updated.assigned_to,
        assignment_date: res.data.assignment_date,
        assignment_time: res.data.assignment_time,
        whatsapp_message: res.data.whatsapp_message,
        whatsapp_url: res.data.whatsapp_url,
        group_whatsapp_url: res.data.group_whatsapp_url,
        group_whatsapp_web_url: res.data.group_whatsapp_web_url || res.data.group_whatsapp_url,
        group_whatsapp_app_url: res.data.group_whatsapp_app_url,
        group_whatsapp_desktop_url: res.data.group_whatsapp_desktop_url,
        whatsapp_group_invite: res.data.whatsapp_group_invite,
      };

      setAssignResult(assignData);
      setShowAssignModal(false);
      setShowAssignNotificationModal(true);

      // Trigger pre-filled notification dispatch to the IT Support WhatsApp Group after successful submission
      const groupUrl = res.data.group_whatsapp_web_url || res.data.group_whatsapp_url;
      if (groupUrl) {
        window.open(groupUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to assign ticket.");
    } finally {
      setAssigning(false);
    }
  };

  // ── IT Support Engineer CRUD Handlers ─────────────────────────────────────
  const handleOpenAddDevModal = () => {
    setDevFormMode("add");
    setEditingDevId(null);
    setDevFormData({
      name: "",
      phone: "",
      email: "",
      role: "IT Support Engineer",
      specialization: "Full Stack & IT Support",
      status: "Active",
      avatar_color: "#3b82f6",
    });
    setShowDevModal(true);
  };

  const handleOpenEditDevModal = (dev) => {
    setDevFormMode("edit");
    setEditingDevId(dev.id);
    setDevFormData({
      name: dev.name,
      phone: dev.phone || "",
      email: dev.email || "",
      role: dev.role || "IT Support Engineer",
      specialization: dev.specialization || "",
      status: dev.status || "Active",
      avatar_color: dev.avatar_color || "#3b82f6",
    });
    setShowDevModal(true);
  };

  const handleSaveDeveloper = async (e) => {
    e.preventDefault();
    if (!devFormData.name.trim()) {
      alert("IT Support Engineer name is required.");
      return;
    }
    setDevSubmitting(true);
    try {
      if (devFormMode === "add") {
        await api.post("/it-support/developers", devFormData);
      } else {
        await api.put(`/it-support/developers/${editingDevId}`, devFormData);
      }
      setShowDevModal(false);
      fetchDevelopers();
      if (activeTab === "workload") fetchDevelopersOverview();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to save IT Support Engineer.");
    } finally {
      setDevSubmitting(false);
    }
  };

  const handleDeleteDeveloper = async (dev) => {
    if (!window.confirm(`Are you sure you want to remove ${dev.name}? Any assigned tickets will become unassigned.`)) {
      return;
    }
    try {
      await api.delete(`/it-support/developers/${dev.id}`);
      fetchDevelopers();
      fetchTickets();
      if (activeTab === "workload") fetchDevelopersOverview();
    } catch {
      alert("Failed to remove IT Support Engineer.");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("");
    setFilterPriority("");
    setFilterCategory("");
    setFilterDeveloper("");
    setPage(1);
  };

  const hasFilters = search || filterStatus || filterPriority || filterCategory || filterDeveloper;
  const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "—");
  const fmtDateTime = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return iso;
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const s = {
    page: {
      color: "#e2e8f0",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      minHeight: "100vh",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "20px",
      flexWrap: "wrap",
      gap: "16px",
    },
    title: {
      fontSize: "26px",
      fontWeight: "800",
      background: "linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    sub: { color: "#94a3b8", fontSize: "13px", marginTop: "4px" },
    tabNav: {
      display: "flex",
      gap: "8px",
      marginBottom: "24px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
      paddingBottom: "12px",
    },
    tabBtn: (active) => ({
      padding: "10px 20px",
      borderRadius: "12px",
      fontSize: "14px",
      fontWeight: active ? "700" : "500",
      cursor: "pointer",
      border: active ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid transparent",
      background: active ? "rgba(56, 189, 248, 0.15)" : "transparent",
      color: active ? "#38bdf8" : "#94a3b8",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s ease",
    }),
    statGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "16px",
      marginBottom: "24px",
    },
    statCard: (color) => ({
      background: "rgba(30, 41, 59, 0.5)",
      border: `1px solid ${color}30`,
      borderRadius: "16px",
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    }),
    statNum: (color) => ({ fontSize: "28px", fontWeight: "800", color, lineHeight: 1 }),
    statLabel: { fontSize: "11px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" },
    toolbar: {
      display: "flex",
      gap: "10px",
      marginBottom: "20px",
      flexWrap: "wrap",
      alignItems: "center",
    },
    searchBox: { flex: 1, minWidth: "220px", position: "relative" },
    searchInput: {
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
    filterSelect: {
      background: "#1e293b",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      borderRadius: "12px",
      padding: "10px 14px",
      color: "#e2e8f0",
      fontSize: "13px",
      outline: "none",
      cursor: "pointer",
    },
    tableCard: {
      background: "rgba(30, 41, 59, 0.4)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "16px",
      overflow: "hidden",
    },
    th: {
      textAlign: "left",
      padding: "12px 16px",
      fontSize: "11px",
      fontWeight: "700",
      color: "#94a3b8",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      background: "rgba(15, 23, 42, 0.7)",
      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
      whiteSpace: "nowrap",
    },
    td: {
      padding: "13px 16px",
      fontSize: "13px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
    },
    detailPanel: {
      position: "fixed",
      top: 0,
      right: 0,
      bottom: 0,
      width: "480px",
      zIndex: 1000,
      background: "linear-gradient(180deg, #111827 0%, #0d1424 100%)",
      borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
      boxShadow: "-20px 0 60px rgba(0, 0, 0, 0.7)",
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
    },
    inputStyle: {
      width: "100%",
      background: "rgba(255, 255, 255, 0.06)",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      borderRadius: "10px",
      padding: "10px 12px",
      color: "#ffffff",
      fontSize: "13px",
      outline: "none",
      boxSizing: "border-box",
    },
    assignBtn: {
      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      border: "none",
      borderRadius: "10px",
      padding: "12px 20px",
      color: "#ffffff",
      fontWeight: "700",
      cursor: "pointer",
      fontSize: "14px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      width: "100%",
      justifyContent: "center",
      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
    },
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
  };

  return (
    <div style={s.page}>

      {/* ── Page Header ── */}
      <div style={s.header}>
        <div>
          <div style={s.title}>
            <FaShieldAlt style={{ color: "#38bdf8" }} />
            IT Support Admin Dashboard
          </div>
          <div style={s.sub}>
            Manage IT Support Engineers (Muthu, Naramatha, Kishore, Abishika, Babu, Keerthi), assign tickets, and monitor % work progress
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => {
              fetchTickets();
              fetchStats();
              fetchDevelopers();
              if (activeTab === "workload") fetchDevelopersOverview();
            }}
            style={{
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.2)",
              borderRadius: "10px",
              padding: "10px 16px",
              color: "#38bdf8",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FaSyncAlt /> Refresh
          </button>

          <button
            onClick={handleOpenAddDevModal}
            style={{
              background: "linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)",
              border: "none",
              borderRadius: "10px",
              padding: "10px 16px",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 12px rgba(56, 189, 248, 0.3)",
            }}
          >
            <FaUserPlus /> Add IT Support Engineer
          </button>
        </div>
      </div>

      {/* ── KPI Stats Bar ── */}
      <div style={s.statGrid}>
        {STAT_CARDS.map((c) => (
          <div key={c.key} style={s.statCard(c.color)}>
            <div style={{ color: c.color, fontSize: "20px" }}>{c.icon}</div>
            <div style={s.statNum(c.color)}>{stats[c.key] ?? "—"}</div>
            <div style={s.statLabel}>{c.label}</div>
          </div>
        ))}

        <div style={s.statCard("#06b6d4")}>
          <div style={{ color: "#06b6d4", fontSize: "20px" }}><FaChartLine /></div>
          <div style={s.statNum("#06b6d4")}>{stats.avg_progress ?? 0}%</div>
          <div style={s.statLabel}>Avg. Work Progress</div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div style={s.tabNav}>
        <button
          onClick={() => setActiveTab("tickets")}
          style={s.tabBtn(activeTab === "tickets")}
        >
          <FaTicketAlt /> All Support Tickets
        </button>

        <button
          onClick={() => setActiveTab("workload")}
          style={s.tabBtn(activeTab === "workload")}
        >
          <FaTasks /> IT Support Engineer Progress & Workload
        </button>

        <button
          onClick={() => setActiveTab("developers")}
          style={s.tabBtn(activeTab === "developers")}
        >
          <FaUsers /> Manage IT Support Engineers ({developers.length})
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: TICKETS MANAGEMENT
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "tickets" && (
        <>
          {/* Toolbar */}
          <div style={s.toolbar}>
            <div style={s.searchBox}>
              <FaSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
              <input
                style={s.searchInput}
                placeholder="Search ticket #, client, email, subject, assigned IT Support Engineer..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            <select
              style={s.filterSelect}
              value={filterDeveloper}
              onChange={(e) => { setFilterDeveloper(e.target.value); setPage(1); }}
            >
              <option value="">All IT Support Engineers</option>
              {developers.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} ({d.role})
                </option>
              ))}
            </select>

            <select
              style={s.filterSelect}
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <select
              style={s.filterSelect}
              value={filterPriority}
              onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
            >
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              style={s.filterSelect}
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  color: "#f87171",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaTimes /> Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div style={s.tableCard}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>
                <FaSpinner style={{ fontSize: "28px", animation: "spin 1s linear infinite", marginBottom: "12px", color: "#38bdf8" }} />
                <div>Loading tickets...</div>
              </div>
            ) : tickets.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <FaClipboardList style={{ fontSize: "44px", color: "#475569", marginBottom: "14px" }} />
                <div style={{ color: "#94a3b8", fontSize: "16px", fontWeight: "600" }}>No tickets found</div>
              </div>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Ticket #", "Client", "Category", "Priority", "Subject", "Status", "Work Progress", "Assigned Dev", "Date", "WhatsApp Notification"].map((h) => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((t) => {
                        const pct = t.progress_percentage || 0;
                        return (
                          <tr
                            key={t.id}
                            className={`ticket-row${selected?.id === t.id ? " selected" : ""}`}
                            onClick={() => openDetail(t)}
                            style={{ transition: "background 0.15s" }}
                          >
                            <td style={{ ...s.td, color: "#38bdf8", fontWeight: "800" }}>
                              {t.ticket_number}
                            </td>
                            <td style={s.td}>
                              <div style={{ color: "#ffffff", fontWeight: "600", fontSize: "13px" }}>{t.client_name}</div>
                              <div style={{ color: "#64748b", fontSize: "11px" }}>{t.client_email}</div>
                            </td>
                            <td style={{ ...s.td, color: "#94a3b8" }}>{t.category}</td>
                            <td style={s.td}><PriorityBadge priority={t.priority} /></td>
                            <td style={s.td}>
                              <div style={{ color: "#e2e8f0", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {t.subject}
                              </div>
                            </td>
                            <td style={s.td}><StatusBadge status={t.status} /></td>

                            {/* Progress bar column */}
                            <td style={{ ...s.td, minWidth: "140px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                <span style={{ fontSize: "11px", fontWeight: "700", color: getProgressColor(pct) }}>
                                  {pct}%
                                </span>
                              </div>
                              <div style={s.progressBarBg}>
                                <div style={s.progressBarFill(pct)} />
                              </div>
                            </td>

                            {/* Assigned IT Support Engineer */}
                            <td style={s.td}>
                              {t.assigned_to ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <div
                                    style={{
                                      width: "24px",
                                      height: "24px",
                                      borderRadius: "50%",
                                      background: "linear-gradient(135deg, #38bdf8, #3b82f6)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "#ffffff",
                                      fontSize: "11px",
                                      fontWeight: "800",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {t.assigned_to.charAt(0)}
                                  </div>
                                  <div>
                                    <div style={{ color: "#ffffff", fontWeight: "600", fontSize: "12px" }}>{t.assigned_to}</div>
                                    {t.assigned_at && (
                                      <div style={{ color: "#64748b", fontSize: "10px", marginTop: "2px" }} title={`Assigned on ${fmtDateTime(t.assigned_at)}`}>
                                        {fmtDateTime(t.assigned_at)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: "#64748b", fontStyle: "italic", fontSize: "12px" }}>Unassigned</span>
                              )}
                            </td>

                            <td style={{ ...s.td, color: "#94a3b8", fontSize: "12px", whiteSpace: "nowrap" }}>
                              <div>{fmtDate(t.created_at)}</div>
                            </td>

                            {/* WhatsApp Notification Column */}
                            <td style={{ ...s.td, whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openWhatsAppModal(t)}
                                title="Send pre-filled WhatsApp notification to IT Support Group"
                                style={{
                                  background: t.whatsapp_notified
                                    ? "rgba(37, 211, 102, 0.12)"
                                    : "linear-gradient(135deg, #25d366 0%, #128c7e 100%)",
                                  border: t.whatsapp_notified
                                    ? "1px solid rgba(37, 211, 102, 0.35)"
                                    : "none",
                                  color: t.whatsapp_notified ? "#25d366" : "#ffffff",
                                  padding: "7px 13px",
                                  borderRadius: "8px",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  boxShadow: t.whatsapp_notified
                                    ? "none"
                                    : "0 2px 10px rgba(37, 211, 102, 0.3)",
                                  transition: "all 0.2s ease",
                                }}
                              >
                                <FaWhatsapp style={{ fontSize: "14px" }} />
                                {t.whatsapp_notified ? "Re-send WhatsApp" : "Send WhatsApp Notification"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "#64748b", fontSize: "13px" }}>
                    Showing {tickets.length} of {total} tickets
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      style={{
                        background: page === 1 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        color: page === 1 ? "#475569" : "#ffffff",
                        cursor: page === 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      <FaChevronLeft />
                    </button>
                    <span style={{ padding: "6px 14px", color: "#38bdf8", fontSize: "13px", background: "rgba(56, 189, 248, 0.1)", borderRadius: "8px" }}>
                      {page} / {pages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      disabled={page === pages}
                      style={{
                        background: page === pages ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        padding: "6px 12px",
                        color: page === pages ? "#475569" : "#ffffff",
                        cursor: page === pages ? "not-allowed" : "pointer",
                      }}
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: IT SUPPORT ENGINEER PROGRESS & WORKLOAD TRACKER
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "workload" && (
        <div>
          {overviewLoading ? (
            <div style={{ textAlign: "center", padding: "80px", color: "#64748b" }}>
              <FaSpinner style={{ fontSize: "32px", animation: "spin 1s linear infinite", marginBottom: "12px", color: "#38bdf8" }} />
              <div>Loading IT Support Engineer workload &amp; progress...</div>
            </div>
          ) : devOverview.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px" }}>
              <FaUsers style={{ fontSize: "40px", color: "#475569", marginBottom: "12px" }} />
              <div style={{ color: "#94a3b8" }}>No IT Support Engineer workload data available</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {devOverview.map((item) => {
                const dev = item.developer;
                const isExpanded = expandedDevId === dev.id;
                const avgPct = item.avg_progress || 0;

                return (
                  <div
                    key={dev.id}
                    style={{
                      background: "rgba(30, 41, 59, 0.5)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "18px",
                      overflow: "hidden",
                      transition: "all 0.25s ease",
                    }}
                  >
                    {/* Developer Card Summary Header */}
                    <div
                      onClick={() => setExpandedDevId(isExpanded ? null : dev.id)}
                      style={{
                        padding: "22px 24px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "16px",
                        background: isExpanded ? "rgba(56, 189, 248, 0.05)" : "transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            background: `linear-gradient(135deg, ${dev.avatar_color || "#3b82f6"}, ${dev.avatar_color || "#3b82f6"}88)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "18px",
                            fontWeight: "800",
                            color: "#ffffff",
                            boxShadow: `0 4px 14px ${dev.avatar_color || "#3b82f6"}40`,
                          }}
                        >
                          {dev.name.charAt(0)}
                        </div>

                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "17px", fontWeight: "700", color: "#ffffff" }}>
                              {dev.name}
                            </span>
                            <span
                              style={{
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                background: dev.status === "Active" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                                color: dev.status === "Active" ? "#10b981" : "#f59e0b",
                                fontWeight: "600",
                              }}
                            >
                              {dev.status}
                            </span>
                          </div>
                          <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "2px" }}>
                            {dev.role} &bull; <span style={{ color: "#38bdf8" }}>{dev.specialization}</span>
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                            📞 {dev.phone || "No phone"} &bull; ✉️ {dev.email}
                          </div>
                        </div>
                      </div>

                      {/* Workload Stats & Progress */}
                      <div style={{ display: "flex", alignItems: "center", gap: "28px", flexWrap: "wrap" }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff" }}>{item.total_assigned}</div>
                          <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Assigned</div>
                        </div>

                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "18px", fontWeight: "800", color: "#f59e0b" }}>{item.active_count}</div>
                          <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Active</div>
                        </div>

                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "18px", fontWeight: "800", color: "#10b981" }}>{item.resolved_count}</div>
                          <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Resolved</div>
                        </div>

                        <div style={{ minWidth: "160px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                            <span style={{ color: "#94a3b8" }}>Work Completion:</span>
                            <span style={{ fontWeight: "800", color: getProgressColor(avgPct) }}>{avgPct}%</span>
                          </div>
                          <div style={s.progressBarBg}>
                            <div style={s.progressBarFill(avgPct)} />
                          </div>
                        </div>

                        <button
                          style={{
                            background: "rgba(255, 255, 255, 0.06)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            color: "#38bdf8",
                            padding: "8px 14px",
                            borderRadius: "10px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          {isExpanded ? "Collapse" : `View ${item.tickets.length} Tickets`}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Tickets for this Developer */}
                    {isExpanded && (
                      <div
                        style={{
                          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                          padding: "20px 24px",
                          background: "rgba(15, 23, 42, 0.5)",
                        }}
                      >
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "14px" }}>
                          Tickets Assigned to {dev.name} ({item.tickets.length})
                        </div>

                        {item.tickets.length === 0 ? (
                          <div style={{ color: "#64748b", fontSize: "13px", fontStyle: "italic", padding: "10px 0" }}>
                            No tickets currently assigned to {dev.name}.
                          </div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
                            {item.tickets.map((t) => {
                              const pct = t.progress_percentage || 0;
                              return (
                                <div
                                  key={t.id}
                                  onClick={() => {
                                    const fullTicket = tickets.find((tk) => tk.id === t.id);
                                    if (fullTicket) openDetail(fullTicket);
                                  }}
                                  style={{
                                    background: "rgba(30, 41, 59, 0.6)",
                                    border: "1px solid rgba(255, 255, 255, 0.06)",
                                    borderRadius: "12px",
                                    padding: "14px",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                    <span style={{ fontSize: "13px", fontWeight: "800", color: "#38bdf8" }}>{t.ticket_number}</span>
                                    <div style={{ display: "flex", gap: "4px" }}>
                                      <PriorityBadge priority={t.priority} />
                                      <StatusBadge status={t.status} />
                                    </div>
                                  </div>

                                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#ffffff", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {t.subject}
                                  </div>

                                  <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "10px" }}>
                                    Client: {t.client_name} &bull; {t.category}
                                  </div>

                                  {/* Progress bar */}
                                  <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>Work Completed</span>
                                      <span style={{ fontSize: "12px", fontWeight: "800", color: getProgressColor(pct) }}>{pct}%</span>
                                    </div>
                                    <div style={s.progressBarBg}>
                                      <div style={s.progressBarFill(pct)} />
                                    </div>
                                  </div>

                                  {t.developer_notes && (
                                    <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "8px", fontStyle: "italic", background: "rgba(0,0,0,0.2)", padding: "6px 8px", borderRadius: "6px" }}>
                                      Dev Notes: {t.developer_notes}
                                    </div>
                                  )}

                                  <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const fullTicket = tickets.find((tk) => tk.id === t.id) || t;
                                        openWhatsAppModal(fullTicket);
                                      }}
                                      style={{
                                        background: "rgba(37, 211, 102, 0.15)",
                                        border: "1px solid rgba(37, 211, 102, 0.35)",
                                        color: "#25d366",
                                        padding: "5px 10px",
                                        borderRadius: "6px",
                                        fontSize: "11px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      <FaWhatsapp /> Send WhatsApp
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: MANAGE DEVELOPERS
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "developers" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#ffffff" }}>
                IT Support Team Engineers
              </div>
              <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                Active IT Support Engineers available for ticket assignment and progress tracking
              </div>
            </div>

            <button
              onClick={handleOpenAddDevModal}
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                border: "none",
                borderRadius: "10px",
                padding: "10px 18px",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FaUserPlus /> Add New IT Support Engineer
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
            {developers.map((dev) => (
              <div
                key={dev.id}
                style={{
                  background: "rgba(30, 41, 59, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${dev.avatar_color || "#3b82f6"}, ${dev.avatar_color || "#3b82f6"}88)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "17px",
                        fontWeight: "800",
                        color: "#ffffff",
                      }}
                    >
                      {dev.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "#ffffff" }}>{dev.name}</div>
                      <div style={{ fontSize: "12px", color: "#38bdf8", fontWeight: "500" }}>{dev.role}</div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: dev.status === "Active" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                      color: dev.status === "Active" ? "#10b981" : "#f59e0b",
                      fontWeight: "700",
                    }}
                  >
                    {dev.status}
                  </span>
                </div>

                <div style={{ fontSize: "13px", color: "#94a3b8", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div>🎯 Specialization: <span style={{ color: "#ffffff" }}>{dev.specialization}</span></div>
                  <div>📞 WhatsApp / Phone: <span style={{ color: "#ffffff" }}>{dev.phone || "Not configured"}</span></div>
                  <div>✉️ Email: <span style={{ color: "#ffffff" }}>{dev.email}</span></div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "12px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Assigned: <strong style={{ color: "#ffffff" }}>{dev.total_assigned ?? 0}</strong> tickets
                  </span>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleOpenEditDevModal(dev)}
                      style={{
                        background: "rgba(56, 189, 248, 0.15)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        color: "#38bdf8",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        fontSize: "12px",
                        cursor: "pointer",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteDeveloper(dev)}
                      style={{
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#f87171",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        fontSize: "12px",
                        cursor: "pointer",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FaTrashAlt />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Add / Edit Developer Modal ── */}
      {showDevModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowDevModal(false); }}
        >
          <div
            style={{
              background: "#1e293b",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "18px",
              padding: "28px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
            }}
          >
            <div style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <FaUserPlus style={{ color: "#38bdf8" }} />
              {devFormMode === "add" ? "Add IT Support Engineer" : "Edit IT Support Engineer Profile"}
            </div>

            <form onSubmit={handleSaveDeveloper} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px", fontWeight: "600" }}>
                  IT Support Engineer Name *
                </label>
                <input
                  style={s.inputStyle}
                  required
                  placeholder="e.g. Muthu, Naramatha, Kishore, Babu, etc."
                  value={devFormData.name}
                  onChange={(e) => setDevFormData({ ...devFormData, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px", fontWeight: "600" }}>
                  Phone / WhatsApp (International format, e.g. 919876543210)
                </label>
                <input
                  style={s.inputStyle}
                  placeholder="e.g. 919876543210"
                  value={devFormData.phone}
                  onChange={(e) => setDevFormData({ ...devFormData, phone: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px", fontWeight: "600" }}>
                  Email Address
                </label>
                <input
                  style={s.inputStyle}
                  type="email"
                  placeholder="engineer@avva.com"
                  value={devFormData.email}
                  onChange={(e) => setDevFormData({ ...devFormData, email: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px", fontWeight: "600" }}>
                  Role / Title
                </label>
                <input
                  style={s.inputStyle}
                  placeholder="e.g. Lead IT Support Engineer, Senior Systems Engineer"
                  value={devFormData.role}
                  onChange={(e) => setDevFormData({ ...devFormData, role: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px", fontWeight: "600" }}>
                  Specialization / Domain
                </label>
                <input
                  style={s.inputStyle}
                  placeholder="e.g. Full Stack, Cloud Systems, Network Security"
                  value={devFormData.specialization}
                  onChange={(e) => setDevFormData({ ...devFormData, specialization: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px", fontWeight: "600" }}>
                  Status
                </label>
                <select
                  style={{ ...s.inputStyle, background: "#0f172a", cursor: "pointer" }}
                  value={devFormData.status}
                  onChange={(e) => setDevFormData({ ...devFormData, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Busy">Busy</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowDevModal(false)}
                  style={{
                    flex: 1,
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "none",
                    borderRadius: "10px",
                    padding: "12px",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={devSubmitting}
                  style={{
                    flex: 2,
                    background: "linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)",
                    border: "none",
                    borderRadius: "10px",
                    padding: "12px",
                    color: "#ffffff",
                    fontWeight: "700",
                    cursor: devSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {devSubmitting ? "Saving..." : devFormMode === "add" ? "Add IT Support Engineer" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Ticket Modal ── */}
      {showAssignModal && selected && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAssignModal(false); }}
        >
          <div
            style={{
              background: "#1e293b",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "18px",
              padding: "28px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#10b981", display: "flex", alignItems: "center", gap: "8px" }}>
                <FaUserCheck /> Assign Ticket to IT Support Engineer
              </div>
              <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "4px" }}>
                Ticket <strong style={{ color: "#38bdf8" }}>{selected.ticket_number}</strong>: {selected.subject}
              </div>
            </div>

            {/* IT Support Engineer Select */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "8px", fontWeight: "600" }}>
                Select IT Support Engineer *
              </label>
              <select
                style={{ ...s.inputStyle, background: "#0f172a", cursor: "pointer" }}
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
              >
                <option value="">— Choose an IT Support Engineer —</option>
                {developers.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name} — {dev.role} ({dev.specialization})
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned by */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px", fontWeight: "600" }}>
                Assigned By
              </label>
              <input
                style={s.inputStyle}
                value={assignedBy}
                onChange={(e) => setAssignedBy(e.target.value)}
                placeholder="e.g. Admin"
              />
            </div>

            {/* Assignment notes */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px", fontWeight: "600" }}>
                Instructions / Notes for IT Support Engineer
              </label>
              <textarea
                style={{ ...s.inputStyle, minHeight: "80px", resize: "vertical" }}
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="Context or priority notes..."
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowAssignModal(false)}
                style={{
                  flex: 1,
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedMemberId || assigning}
                style={{
                  ...s.assignBtn,
                  flex: 2,
                  opacity: (!selectedMemberId || assigning) ? 0.5 : 1,
                  cursor: (!selectedMemberId || assigning) ? "not-allowed" : "pointer",
                }}
              >
                {assigning ? (
                  <>
                    <FaSpinner style={{ animation: "spin 1s linear infinite" }} /> Assigning...
                  </>
                ) : (
                  <>
                    <FaPaperPlane /> Assign &amp; Notify WhatsApp Group
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assignment WhatsApp Notification Modal (dispatched to IT Support WhatsApp Group) ── */}
      {showAssignNotificationModal && assignResult && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1150,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAssignNotificationModal(false);
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(37, 211, 102, 0.4)",
              borderRadius: "18px",
              padding: "24px 28px",
              width: "100%",
              maxWidth: "560px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.85)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#25d366", fontSize: "17px", fontWeight: "800" }}>
                  <FaCheckCircle /> Ticket Assignment Submitted!
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                  Notification message generated for the IT Support WhatsApp Group.
                </div>
              </div>
              <button
                onClick={() => setShowAssignNotificationModal(false)}
                style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "18px", cursor: "pointer" }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Assignment Summary Details */}
            <div
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "12px",
                padding: "12px 14px",
                marginBottom: "16px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                fontSize: "12px",
              }}
            >
              <div>
                <div style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: "700" }}>Assigned Engineer</div>
                <div style={{ color: "#10b981", fontWeight: "700", fontSize: "14px", marginTop: "2px" }}>
                  {assignResult.assigned_engineer_name || assignResult.member?.name || assignResult.ticket?.assigned_to}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: "700" }}>Assignment Date &amp; Time</div>
                <div style={{ color: "#ffffff", fontWeight: "600", marginTop: "2px" }}>
                  {assignResult.assignment_date} • {assignResult.assignment_time}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: "700" }}>Client Name</div>
                <div style={{ color: "#cbd5e1", fontWeight: "600", marginTop: "2px" }}>
                  {assignResult.ticket?.client_name}
                </div>
              </div>
              <div>
                <div style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: "700" }}>Ticket / Token Number</div>
                <div style={{ color: "#38bdf8", fontWeight: "700", marginTop: "2px" }}>
                  {assignResult.ticket?.ticket_number}
                </div>
              </div>
            </div>

            {/* Group info callout */}
            <div
              style={{
                background: "rgba(37, 211, 102, 0.08)",
                border: "1px solid rgba(37, 211, 102, 0.25)",
                borderRadius: "10px",
                padding: "10px 14px",
                marginBottom: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#cbd5e1" }}>
                <FaWhatsapp style={{ color: "#25d366", fontSize: "16px" }} />
                <span>Recipient: <strong>IT Support WhatsApp Group</strong></span>
              </div>
              {assignResult.whatsapp_group_invite && (
                <a
                  href={assignResult.whatsapp_group_invite}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: "11px",
                    color: "#38bdf8",
                    textDecoration: "underline",
                    fontWeight: "600",
                  }}
                >
                  Join / Open Group
                </a>
              )}
            </div>

            {/* Message Preview */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>
                Generated WhatsApp Notification Message:
              </div>
              <textarea
                readOnly
                value={assignResult.whatsapp_message || ""}
                style={{
                  width: "100%",
                  minHeight: "180px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  lineHeight: "1.5",
                  background: "#020617",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "10px",
                  color: "#e2e8f0",
                  padding: "12px",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => {
                    if (assignResult.group_whatsapp_web_url || assignResult.group_whatsapp_url) {
                      window.open(assignResult.group_whatsapp_web_url || assignResult.group_whatsapp_url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  style={{
                    flex: 1,
                    background: "#25d366",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "12px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(37, 211, 102, 0.35)",
                  }}
                >
                  <FaWhatsapp style={{ fontSize: "16px" }} />
                  Send to WhatsApp Group (Web)
                </button>
                <button
                  onClick={() => {
                    const appUrl = assignResult.group_whatsapp_app_url || assignResult.group_whatsapp_desktop_url || assignResult.group_whatsapp_web_url || assignResult.group_whatsapp_url;
                    if (appUrl) {
                      window.open(appUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                  style={{
                    flex: 1,
                    background: "rgba(37, 211, 102, 0.15)",
                    border: "1px solid rgba(37, 211, 102, 0.4)",
                    color: "#25d366",
                    borderRadius: "10px",
                    padding: "12px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <FaWhatsapp style={{ fontSize: "16px" }} />
                  Send via WhatsApp App
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => {
                    if (assignResult.whatsapp_message) {
                      navigator.clipboard.writeText(assignResult.whatsapp_message).then(() => {
                        setAssignNotificationCopied(true);
                        setTimeout(() => setAssignNotificationCopied(false), 2000);
                      });
                    }
                  }}
                  style={{
                    flex: 1,
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: assignNotificationCopied ? "#10b981" : "#cbd5e1",
                    borderRadius: "10px",
                    padding: "10px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <FaCopy /> {assignNotificationCopied ? "✓ Message Copied!" : "Copy Notification Message"}
                </button>
                <button
                  onClick={() => setShowAssignNotificationModal(false)}
                  style={{
                    width: "110px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "none",
                    borderRadius: "10px",
                    padding: "10px",
                    color: "#94a3b8",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Side Panel ── */}
      {selected && (
        <>
          <div
            onClick={closeDetail}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 999,
              backdropFilter: "blur(3px)",
            }}
          />

          <div style={{ ...s.detailPanel, animation: "slideIn 0.25s ease" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(30,41,59,0.5)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Ticket Details
                </div>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#38bdf8" }}>
                  {selected.ticket_number}
                </div>
              </div>
              <button
                onClick={closeDetail}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#94a3b8",
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Status Bar */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                Quick Status Change:
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["Open", "In Progress", "Resolved", "Closed"].map((st) => {
                  const isActive = (editStatus || selected.status) === st;
                  return (
                    <button
                      key={st}
                      onClick={() => handleQuickStatus(st)}
                      disabled={updating}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        border: isActive ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.1)",
                        background: isActive ? "rgba(56, 189, 248, 0.2)" : "rgba(255,255,255,0.04)",
                        color: isActive ? "#38bdf8" : "#94a3b8",
                      }}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Progress Slider (Admin can also track & inspect) */}
              <div style={{ background: "rgba(56, 189, 248, 0.04)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "12px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "12px", color: "#38bdf8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Work Progress Completion
                  </span>
                  <span style={{ fontSize: "18px", fontWeight: "900", color: getProgressColor(editProgress) }}>
                    {editProgress}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={editProgress}
                  onChange={(e) => setEditProgress(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, ${getProgressColor(editProgress)} 0%, ${getProgressColor(editProgress)} ${editProgress}%, rgba(255,255,255,0.1) ${editProgress}%, rgba(255,255,255,0.1) 100%)`,
                  }}
                />
              </div>

              {/* WhatsApp Notification Card */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(37, 211, 102, 0.12), rgba(18, 140, 126, 0.08))",
                  border: "1px solid rgba(37, 211, 102, 0.35)",
                  borderRadius: "14px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FaWhatsapp style={{ color: "#25d366", fontSize: "20px" }} />
                    <span style={{ fontWeight: "700", color: "#ffffff", fontSize: "14px" }}>
                      WhatsApp Group Notification
                    </span>
                  </div>
                  {selected.whatsapp_notified ? (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        background: "rgba(37, 211, 102, 0.2)",
                        color: "#25d366",
                        padding: "3px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      ✓ Sent {selected.whatsapp_sent_at ? `(${fmtDate(selected.whatsapp_sent_at)})` : ""}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        background: "rgba(245, 158, 11, 0.2)",
                        color: "#f59e0b",
                        padding: "3px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      Pending Alert
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: "1.4" }}>
                  Generate and send a pre-filled WhatsApp notification to the IT Support WhatsApp Group with client name, ticket number, request details, date, time, and direct URL.
                </div>
                <button
                  onClick={() => openWhatsAppModal(selected)}
                  style={{
                    background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)",
                    border: "none",
                    borderRadius: "10px",
                    padding: "11px 18px",
                    color: "#ffffff",
                    fontWeight: "700",
                    cursor: "pointer",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 14px rgba(37, 211, 102, 0.35)",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <FaWhatsapp style={{ fontSize: "16px" }} />
                  Send WhatsApp Notification
                </button>
              </div>

              {/* Assigned IT Support Engineer Card */}
              <div>
                <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", marginBottom: "8px" }}>
                  Assigned IT Support Engineer
                </div>
                {selected.assigned_to ? (
                  <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "12px", padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ color: "#10b981", fontWeight: "700", fontSize: "15px" }}>
                        {selected.assigned_to}
                      </div>
                      <div style={{ color: "#cbd5e1", fontSize: "12px", marginTop: "2px" }}>
                        Assigned by {selected.assigned_by || "Admin"} &bull; {fmtDateTime(selected.assigned_at)}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAssignModal(true)}
                      style={{
                        background: "rgba(16, 185, 129, 0.2)",
                        border: "1px solid rgba(16, 185, 129, 0.4)",
                        color: "#10b981",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Re-assign
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAssignModal(true)}
                    style={s.assignBtn}
                  >
                    <FaUserCheck /> Assign to IT Support Engineer
                  </button>
                )}

                {assignResult && (
                  <div
                    style={{
                      marginTop: "12px",
                      background: "rgba(37, 211, 102, 0.1)",
                      border: "1px solid rgba(37, 211, 102, 0.3)",
                      borderRadius: "12px",
                      padding: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#25d366" }}>
                      ✓ Ticket Assigned to {assignResult.assigned_engineer_name || assignResult.member?.name}!
                    </div>
                    <div style={{ fontSize: "11px", color: "#cbd5e1" }}>
                      Assigned on: <strong>{assignResult.assignment_date} at {assignResult.assignment_time}</strong>
                    </div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      <button
                        onClick={() => setShowAssignNotificationModal(true)}
                        style={{
                          flex: 1,
                          background: "#25d366",
                          color: "#ffffff",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <FaWhatsapp /> View / Send WhatsApp
                      </button>
                      <a
                        href={assignResult.group_whatsapp_web_url || assignResult.group_whatsapp_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flex: 1,
                          background: "rgba(37, 211, 102, 0.15)",
                          border: "1px solid rgba(37, 211, 102, 0.35)",
                          color: "#25d366",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "700",
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <FaWhatsapp /> IT Support Group
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Client & Issue */}
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "16px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Client</div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff" }}>{selected.client_name}</div>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>{selected.client_email} {selected.contact_number && `• ${selected.contact_number}`}</div>

                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginTop: "12px" }}>Subject</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff" }}>{selected.subject}</div>

                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginTop: "12px" }}>Description</div>
                <div style={{ fontSize: "13px", color: "#cbd5e1", whiteSpace: "pre-wrap", marginTop: "4px" }}>
                  {selected.description}
                </div>
              </div>

              {/* IT Support Engineer Internal Notes */}
              {selected.developer_notes && (
                <div style={{ background: "rgba(56, 189, 248, 0.05)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "12px", padding: "14px" }}>
                  <div style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "700", textTransform: "uppercase" }}>
                    IT Support Engineer Internal Notes
                  </div>
                  <div style={{ fontSize: "13px", color: "#ffffff", marginTop: "4px", whiteSpace: "pre-wrap" }}>
                    {selected.developer_notes}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label style={{ fontSize: "12px", color: "#94a3b8", display: "block", marginBottom: "6px", fontWeight: "600" }}>
                  Admin Notes
                </label>
                <textarea
                  style={{ ...s.inputStyle, minHeight: "80px", resize: "vertical" }}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Internal admin instructions or remarks..."
                />
              </div>

              {/* Save */}
              <button
                id="save-btn"
                onClick={handleUpdate}
                disabled={updating}
                style={{
                  background: "linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px 20px",
                  color: "#ffffff",
                  fontWeight: "700",
                  cursor: updating ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {updating ? <FaSpinner style={{ animation: "spin 1s linear infinite" }} /> : <FaSave />}
                Save Changes
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── WhatsApp Notification Modal ── */}
      {showWhatsAppModal && whatsAppModalTicket && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={closeWhatsAppModal}
        >
          <div
            style={{
              background: "linear-gradient(180deg, #131d2e 0%, #0d1424 100%)",
              border: "1px solid rgba(37, 211, 102, 0.4)",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "660px",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(37, 211, 102, 0.15)",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                background: "linear-gradient(90deg, rgba(37, 211, 102, 0.15) 0%, transparent 100%)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: "22px",
                    boxShadow: "0 4px 14px rgba(37, 211, 102, 0.4)",
                  }}
                >
                  <FaWhatsapp />
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                    Send WhatsApp Notification
                  </div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                    Ticket: <span style={{ color: "#38bdf8", fontWeight: "700" }}>{whatsAppModalTicket.ticket_number}</span> &bull; Client: <span style={{ color: "#ffffff", fontWeight: "600" }}>{whatsAppModalTicket.client_name}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={closeWhatsAppModal}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "none",
                  borderRadius: "10px",
                  color: "#94a3b8",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>

              {/* Status / Notice Banner */}
              <div
                style={{
                  background: "rgba(37, 211, 102, 0.08)",
                  border: "1px solid rgba(37, 211, 102, 0.25)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
              >
                <FaInfoCircle style={{ color: "#25d366", fontSize: "18px", marginTop: "2px", flexShrink: 0 }} />
                <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: "1.6" }}>
                  <span style={{ color: "#25d366", fontWeight: "700" }}>How to deliver this notification:</span>
                  <ol style={{ margin: "6px 0 0 0", paddingLeft: "18px" }}>
                    <li>Click <strong>Open WhatsApp Web</strong> or <strong>Open WhatsApp App</strong> below.</li>
                    <li>WhatsApp opens with your pre-filled message. Select the <strong>IT Support WhatsApp Group</strong> from your chat list.</li>
                    <li>Review the pre-filled text and manually click the WhatsApp <strong>Send</strong> button (▶).</li>
                  </ol>
                  <div style={{ marginTop: "6px", color: "#94a3b8", fontSize: "11px", fontStyle: "italic" }}>
                    * In compliance with WhatsApp policies, notifications are never sent automatically. You retain full control to preview and manually dispatch.
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: "10px" }}>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Notification Status:
                </span>
                {whatsAppModalTicket.whatsapp_notified ? (
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#25d366", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FaCheckCircle /> Dispatched {whatsAppModalTicket.whatsapp_sent_at ? `(${fmtDate(whatsAppModalTicket.whatsapp_sent_at)})` : ""}
                  </span>
                ) : (
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#f59e0b", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FaExclamationCircle /> Pending Manual Send
                  </span>
                )}
              </div>

              {/* Pre-filled Message Preview Box */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Pre-filled WhatsApp Notification Message
                  </label>
                  <button
                    onClick={handleCopyWhatsAppMessage}
                    style={{
                      background: copyFeedback ? "rgba(37, 211, 102, 0.25)" : "rgba(255, 255, 255, 0.08)",
                      border: copyFeedback ? "1px solid #25d366" : "1px solid rgba(255, 255, 255, 0.12)",
                      color: copyFeedback ? "#25d366" : "#cbd5e1",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    {copyFeedback ? <><FaCheck /> Copied to Clipboard!</> : <><FaCopy /> Copy Message</>}
                  </button>
                </div>

                <div
                  style={{
                    background: "#0a0f1d",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "12px",
                    padding: "14px",
                    fontSize: "12px",
                    color: "#e2e8f0",
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                    maxHeight: "220px",
                    overflowY: "auto",
                    lineHeight: "1.6",
                  }}
                >
                  {loadingWhatsAppModal ? (
                    <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                      <FaSpinner style={{ animation: "spin 1s linear infinite", fontSize: "20px" }} />
                      <div style={{ marginTop: "8px" }}>Loading pre-filled notification...</div>
                    </div>
                  ) : (
                    whatsAppModalData?.whatsapp_message || "Generating message..."
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {/* WhatsApp Web Button */}
                  <button
                    onClick={handleLaunchWhatsAppWeb}
                    disabled={loadingWhatsAppModal}
                    style={{
                      flex: 1,
                      minWidth: "220px",
                      background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)",
                      border: "none",
                      borderRadius: "12px",
                      padding: "14px 20px",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 16px rgba(37, 211, 102, 0.4)",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <FaWhatsapp style={{ fontSize: "18px" }} />
                    Open WhatsApp Web
                  </button>

                  {/* WhatsApp Application Button */}
                  <button
                    onClick={handleLaunchWhatsAppApp}
                    disabled={loadingWhatsAppModal}
                    style={{
                      flex: 1,
                      minWidth: "220px",
                      background: "rgba(37, 211, 102, 0.15)",
                      border: "1px solid rgba(37, 211, 102, 0.4)",
                      borderRadius: "12px",
                      padding: "14px 20px",
                      color: "#25d366",
                      fontSize: "14px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <FaExternalLinkAlt style={{ fontSize: "14px" }} />
                    Open WhatsApp App
                  </button>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <button
                    onClick={() => handleMarkWhatsAppSent(whatsAppModalTicket.id)}
                    style={{
                      flex: 1,
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "10px",
                      padding: "10px",
                      color: "#94a3b8",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <FaCheck /> Mark as Sent
                  </button>

                  <a
                    href="https://chat.whatsapp.com/G660UKTsAmyIH5ZwRigP7E"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1,
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "10px",
                      padding: "10px",
                      color: "#38bdf8",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <FaUsers /> IT Group Invite Link
                  </a>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITSupportAdmin;
