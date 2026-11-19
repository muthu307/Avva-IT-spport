import React, { useState, useEffect } from "react";
import {
  FaTicketAlt,
  FaPaperPlane,
  FaWhatsapp,
  FaCheckCircle,
  FaClipboardList,
  FaExclamationTriangle,
  FaClock,
  FaTimesCircle,
  FaSpinner,
  FaHistory,
  FaPlus,
  FaEdit,
  FaTrashAlt,
  FaTh,
  FaList,
  FaTimes,
  FaEye,
} from "react-icons/fa";
import api from "../utils/api";

// ─── Constants ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Hardware",
  "Software",
  "Network",
  "Printer",
  "Email",
  "Access / Permissions",
  "Other",
];

const PRIORITIES = [
  { label: "Low", color: "#22c55e" },
  { label: "Medium", color: "#f59e0b" },
  { label: "High", color: "#f97316" },
  { label: "Critical", color: "#ef4444" },
];

const STATUS_CONFIG = {
  Open: { color: "#3b82f6", bg: "rgba(59,130,246,0.15)", icon: <FaClock /> },
  "In Progress": { color: "#f59e0b", bg: "rgba(245,158,11,0.15)", icon: <FaSpinner /> },
  Resolved: { color: "#22c55e", bg: "rgba(34,197,94,0.15)", icon: <FaCheckCircle /> },
  Closed: { color: "#6b7280", bg: "rgba(107,114,128,0.15)", icon: <FaTimesCircle /> },
};

// ─── Main Component ──────────────────────────────────────────────────────────
const ITSupport = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [activeTab, setActiveTab] = useState("raise"); // raise | history
  const [form, setForm] = useState({
    client_name: user?.username || "",
    client_email: user?.email || "",
    company_name: "",
    contact_number: "",
    category: "",
    priority: "Medium",
    subject: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null); // { ticket, whatsapp_url }
  const [errors, setErrors] = useState({});
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [editingTicket, setEditingTicket] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // "list" | "grid"
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState("");
  const [viewingTicket, setViewingTicket] = useState(null);

  const handleOpenEdit = (ticket) => {
    if (!ticket) return;
    setEditingTicket(ticket);
    setEditForm({
      subject: ticket.subject || "",
      category: ticket.category || "",
      priority: ticket.priority || "Medium",
      contact_number: ticket.contact_number || "",
      company_name: ticket.company_name || "",
      description: ticket.description || "",
    });
    setEditErrors({});
  };

  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editingTicket) return;
    const errs = {};
    if (!editForm.subject?.trim()) errs.subject = "Subject is required";
    if (!editForm.category) errs.category = "Category is required";
    if (!editForm.description?.trim()) errs.description = "Description is required";
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }
    setEditSubmitting(true);
    try {
      const res = await api.put(`/it-support/tickets/${editingTicket.id}/edit`, editForm);
      const updated = res.data.ticket;
      setMyTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (selectedTicket?.id === updated.id) {
        setSelectedTicket(updated);
      }
      setDeleteSuccessMsg(`Ticket ${updated.ticket_number} updated successfully!`);
      setTimeout(() => setDeleteSuccessMsg(""), 4000);
      setEditingTicket(null);
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to update ticket. Please try again.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteTicket = (ticket) => {
    if (!ticket) return;
    setDeleteTarget(ticket);
  };

  const confirmDeleteTicket = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/it-support/tickets/${deleteTarget.id}`);
      setMyTickets((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      if (selectedTicket?.id === deleteTarget.id) {
        setSelectedTicket(null);
      }
      setDeleteSuccessMsg(`Ticket ${deleteTarget.ticket_number} deleted successfully!`);
      setTimeout(() => setDeleteSuccessMsg(""), 4000);
      setDeleteTarget(null);
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to delete ticket. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") fetchMyTickets();
  }, [activeTab]);

  const fetchMyTickets = async () => {
    if (!user?.email) return;
    setLoadingTickets(true);
    try {
      const res = await api.get(`/it-support/tickets/my?email=${encodeURIComponent(user.email)}`);
      setMyTickets(res.data.tickets || []);
    } catch {
      setMyTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.client_name.trim()) e.client_name = "Name is required";
    if (!form.client_email.trim()) e.client_email = "Email is required";
    if (!form.category) e.category = "Category is required";
    if (!form.priority) e.priority = "Priority is required";
    if (!form.subject.trim()) e.subject = "Subject is required";
    if (!form.description.trim()) e.description = "Description is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await api.post("/it-support/tickets", {
        ...form,
        base_url: window.location.origin,
      });
      setSuccessData(res.data);
      setForm({
        client_name: user?.username || "",
        client_email: user?.email || "",
        company_name: "",
        contact_number: "",
        category: "",
        priority: "Medium",
        subject: "",
        description: "",
      });
      setErrors({});
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsAppOpen = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const s = {
    page: {
      minHeight: "100vh",
      color: "#e2e8f0",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    header: {
      marginBottom: "32px",
    },
    headerTitle: {
      fontSize: "28px",
      fontWeight: "700",
      background: "linear-gradient(135deg, #4da6ff, #818cf8)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginBottom: "6px",
    },
    headerSub: {
      color: "#6b7280",
      fontSize: "14px",
    },
    tabs: {
      display: "flex",
      gap: "8px",
      marginBottom: "28px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      paddingBottom: "0",
    },
    tab: (active) => ({
      padding: "10px 20px",
      borderRadius: "8px 8px 0 0",
      border: "none",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "14px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s",
      background: active ? "rgba(77,166,255,0.15)" : "transparent",
      color: active ? "#4da6ff" : "#6b7280",
      borderBottom: active ? "2px solid #4da6ff" : "2px solid transparent",
    }),
    card: {
      background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "16px",
      padding: "32px",
      backdropFilter: "blur(10px)",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "20px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    formGroupFull: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      gridColumn: "1 / -1",
    },
    label: {
      fontSize: "13px",
      fontWeight: "600",
      color: "#94a3b8",
      letterSpacing: "0.4px",
    },
    input: (hasErr) => ({
      background: "rgba(255,255,255,0.06)",
      border: `1px solid ${hasErr ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
      borderRadius: "10px",
      padding: "12px 14px",
      color: "#e2e8f0",
      fontSize: "14px",
      outline: "none",
      transition: "border-color 0.2s",
      width: "100%",
      boxSizing: "border-box",
    }),
    textarea: (hasErr) => ({
      background: "rgba(255,255,255,0.06)",
      border: `1px solid ${hasErr ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
      borderRadius: "10px",
      padding: "12px 14px",
      color: "#e2e8f0",
      fontSize: "14px",
      outline: "none",
      resize: "vertical",
      minHeight: "120px",
      width: "100%",
      boxSizing: "border-box",
      fontFamily: "inherit",
    }),
    select: (hasErr) => ({
      background: "rgba(30,41,59,0.9)",
      border: `1px solid ${hasErr ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
      borderRadius: "10px",
      padding: "12px 14px",
      color: "#e2e8f0",
      fontSize: "14px",
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
      cursor: "pointer",
    }),
    errMsg: {
      color: "#ef4444",
      fontSize: "12px",
      marginTop: "2px",
    },
    priorityGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "8px",
    },
    priorityBtn: (p, selected) => ({
      padding: "10px 8px",
      borderRadius: "8px",
      border: `2px solid ${selected ? p.color : "rgba(255,255,255,0.1)"}`,
      background: selected ? `${p.color}20` : "rgba(255,255,255,0.03)",
      color: selected ? p.color : "#6b7280",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "600",
      transition: "all 0.2s",
      textAlign: "center",
    }),
    submitBtn: {
      background: "linear-gradient(135deg, #4da6ff, #818cf8)",
      border: "none",
      borderRadius: "12px",
      padding: "16px 32px",
      color: "#fff",
      fontSize: "16px",
      fontWeight: "700",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      transition: "all 0.25s",
      marginTop: "8px",
      width: "100%",
      boxShadow: "0 4px 24px rgba(77,166,255,0.35)",
      letterSpacing: "0.5px",
    },
  };

  // ── Success Modal ─────────────────────────────────────────────────────────
  if (successData) {
    const t = successData.ticket;
    return (
      <div style={s.page}>
        <div style={{ maxWidth: "600px", margin: "60px auto", textAlign: "center" }}>
          {/* Animated checkmark */}
          <div style={{
            width: "80px", height: "80px", borderRadius: "50%",
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 0 40px rgba(34,197,94,0.4)",
            animation: "pulse 2s infinite",
          }}>
            <FaCheckCircle style={{ fontSize: "36px", color: "#fff" }} />
          </div>

          <h2 style={{ fontSize: "26px", fontWeight: "700", color: "#e2e8f0", marginBottom: "8px" }}>
            Ticket Raised Successfully!
          </h2>
          <p style={{ color: "#6b7280", marginBottom: "32px", fontSize: "15px" }}>
            Your IT support request has been submitted. The IT team has been notified.
          </p>

          {/* Ticket Details Card */}
          <div style={{
            background: "linear-gradient(135deg, rgba(77,166,255,0.08), rgba(129,140,248,0.08))",
            border: "1px solid rgba(77,166,255,0.2)",
            borderRadius: "16px",
            padding: "28px",
            textAlign: "left",
            marginBottom: "24px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Ticket Number</div>
                <div style={{ fontSize: "22px", fontWeight: "800", color: "#4da6ff", letterSpacing: "1px" }}>
                  {t.ticket_number}
                </div>
              </div>
              <span style={{
                background: "rgba(59,130,246,0.2)", color: "#3b82f6",
                padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "600",
              }}>
                Open
              </span>
            </div>

            {[
              ["Client", t.client_name],
              ["Email", t.client_email],
              ...(t.company_name ? [["Company", t.company_name]] : []),
              ["Category", t.category],
              ["Priority", t.priority],
              ["Subject", t.subject],
              ["Date & Time", new Date(t.created_at).toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ color: "#6b7280", fontSize: "13px" }}>{label}</span>
                <span style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: "500", maxWidth: "60%", textAlign: "right" }}>{value}</span>
              </div>
            ))}
          </div>

          {/* WhatsApp Notify Button */}
          <button
            onClick={() => handleWhatsAppOpen(successData.whatsapp_url)}
            style={{
              background: "linear-gradient(135deg, #25d366, #128c7e)",
              border: "none", borderRadius: "12px", padding: "14px 28px",
              color: "#fff", fontSize: "15px", fontWeight: "700",
              cursor: "pointer", display: "flex", alignItems: "center",
              gap: "10px", margin: "0 auto 16px", width: "100%",
              justifyContent: "center", boxShadow: "0 4px 20px rgba(37,211,102,0.3)",
            }}
          >
            <FaWhatsapp style={{ fontSize: "20px" }} />
            Send WhatsApp Notification to IT Group
          </button>
          <p style={{ color: "#6b7280", fontSize: "12px", marginBottom: "24px" }}>
            Click above to open WhatsApp Web with a pre-filled message for the IT Support Group
          </p>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              onClick={() => { setSuccessData(null); setActiveTab("raise"); }}
              style={{
                background: "linear-gradient(135deg, #4da6ff, #818cf8)",
                border: "none", borderRadius: "10px", padding: "12px 24px",
                color: "#fff", fontWeight: "600", cursor: "pointer", fontSize: "14px",
                display: "flex", alignItems: "center", gap: "8px",
              }}
            >
              <FaPlus /> Raise Another Ticket
            </button>
            <button
              onClick={() => { setSuccessData(null); setActiveTab("history"); }}
              style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px", padding: "12px 24px",
                color: "#e2e8f0", fontWeight: "600", cursor: "pointer", fontSize: "14px",
                display: "flex", alignItems: "center", gap: "8px",
              }}
            >
              <FaHistory /> View My Tickets
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Render ────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        input:focus, select:focus, textarea:focus { border-color: #4da6ff !important; box-shadow: 0 0 0 3px rgba(77,166,255,0.15); }
        @keyframes pulse { 0%,100%{box-shadow:0 0 40px rgba(34,197,94,0.4)} 50%{box-shadow:0 0 60px rgba(34,197,94,0.6)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .ticket-row:hover { background: rgba(77,166,255,0.06) !important; cursor:pointer; }
      `}</style>

      {/* Page Header */}
      <div style={s.header}>
        <div style={s.headerTitle}>
          <FaTicketAlt style={{ fontSize: "26px", color: "#4da6ff" }} />
          IT Support
        </div>
        <div style={s.headerSub}>
          Raise a new IT support ticket or track your existing requests
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        <button style={s.tab(activeTab === "raise")} onClick={() => setActiveTab("raise")}>
          <FaPaperPlane /> Raise a Ticket
        </button>
        <button style={s.tab(activeTab === "history")} onClick={() => setActiveTab("history")}>
          <FaHistory /> My Tickets
        </button>
      </div>

      {/* ── TAB: Raise Ticket ── */}
      {activeTab === "raise" && (
        <div style={s.card}>
          {/* Company branding header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "24px",
            paddingBottom: "20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #4da6ff, #818cf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: "800",
              color: "#fff",
              flexShrink: 0,
              boxShadow: "0 4px 16px rgba(77,166,255,0.35)",
            }}>EW</div>
            <div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#e2e8f0", lineHeight: 1.2 }}>
                EazyWorld IT Support
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                Submit a new support request — we'll get back to you shortly
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={s.formGrid}>
              {/* Client Name */}
              <div style={s.formGroup}>
                <label style={s.label}>Full Name *</label>
                <input
                  style={s.input(errors.client_name)}
                  value={form.client_name}
                  onChange={e => setForm({ ...form, client_name: e.target.value })}
                  placeholder="Your full name"
                />
                {errors.client_name && <span style={s.errMsg}>{errors.client_name}</span>}
              </div>

              {/* Email */}
              <div style={s.formGroup}>
                <label style={s.label}>Email Address *</label>
                <input
                  style={s.input(errors.client_email)}
                  value={form.client_email}
                  onChange={e => setForm({ ...form, client_email: e.target.value })}
                  placeholder="your@email.com"
                />
                {errors.client_email && <span style={s.errMsg}>{errors.client_email}</span>}
              </div>

              {/* Company Name */}
              <div style={s.formGroup}>
                <label style={s.label}>Company Name</label>
                <input
                  style={s.input(false)}
                  value={form.company_name}
                  onChange={e => setForm({ ...form, company_name: e.target.value })}
                  placeholder="Your company or department"
                />
              </div>

              {/* Contact Number */}
              <div style={s.formGroup}>
                <label style={s.label}>Contact Number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  style={s.input(false)}
                  value={form.contact_number}
                  onChange={e => setForm({ ...form, contact_number: e.target.value.replace(/[^0-9]/g, '') })}
                  onKeyDown={e => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'].includes(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault(); }}
                  placeholder="0123456789"
                  maxLength={15}
                />
              </div>

              {/* Category */}
              <div style={s.formGroup}>
                <label style={s.label}>Issue Category *</label>
                <select
                  style={s.select(errors.category)}
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option value="">— Select Category —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <span style={s.errMsg}>{errors.category}</span>}
              </div>

              {/* Priority */}
              <div style={{ ...s.formGroup, gridColumn: "1 / -1" }}>
                <label style={s.label}>Priority *</label>
                <div style={s.priorityGrid}>
                  {PRIORITIES.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      style={s.priorityBtn(p, form.priority === p.label)}
                      onClick={() => setForm({ ...form, priority: p.label })}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {errors.priority && <span style={s.errMsg}>{errors.priority}</span>}
              </div>

              {/* Subject */}
              <div style={{ ...s.formGroup, gridColumn: "1 / -1" }}>
                <label style={s.label}>Subject / Issue Title *</label>
                <input
                  style={s.input(errors.subject)}
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  placeholder="Brief summary of the issue..."
                />
                {errors.subject && <span style={s.errMsg}>{errors.subject}</span>}
              </div>

              {/* Description */}
              <div style={{ ...s.formGroup, gridColumn: "1 / -1" }}>
                <label style={s.label}>Detailed Description *</label>
                <textarea
                  style={s.textarea(errors.description)}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the issue in detail — what happened, when it started, steps to reproduce, error messages, etc."
                />
                {errors.description && <span style={s.errMsg}>{errors.description}</span>}
              </div>
            </div>

            {/* WhatsApp notice */}
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)",
              borderRadius: "10px", padding: "12px 16px", marginTop: "20px",
            }}>
              <FaWhatsapp style={{ color: "#25d366", fontSize: "18px", flexShrink: 0 }} />
              <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                Upon submission, a WhatsApp notification will be generated for the IT Support Group —
                you'll be prompted to send it via WhatsApp Web.
              </span>
            </div>

            <div style={{ marginTop: "24px" }}>
              <button
                type="submit"
                style={{
                  ...s.submitBtn,
                  opacity: submitting ? 0.75 : 1,
                  transform: submitting ? "scale(0.99)" : "scale(1)",
                }}
                disabled={submitting}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.boxShadow = "0 6px 32px rgba(77,166,255,0.55)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 24px rgba(77,166,255,0.35)"; }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                  {submitting ? (
                    <FaSpinner style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <FaPaperPlane />
                  )}
                  <span>{submitting ? "Submitting your ticket..." : "Submit IT Support Ticket"}</span>
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB: My Tickets ── */}
      {activeTab === "history" && (
        <div>
          {loadingTickets ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#6b7280" }}>
              <FaSpinner style={{ fontSize: "32px", animation: "spin 1s linear infinite", marginBottom: "16px" }} />
              <div>Loading your tickets...</div>
            </div>
          ) : myTickets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <FaClipboardList style={{ fontSize: "48px", color: "#374151", marginBottom: "16px" }} />
              <div style={{ color: "#6b7280", fontSize: "16px" }}>No tickets raised yet.</div>
              <button
                onClick={() => setActiveTab("raise")}
                style={{
                  marginTop: "16px", background: "linear-gradient(135deg,#4da6ff,#818cf8)",
                  border: "none", borderRadius: "10px", padding: "10px 24px",
                  color: "#fff", fontWeight: "600", cursor: "pointer", fontSize: "14px",
                }}
              >
                Raise Your First Ticket
              </button>
            </div>
          ) : (
            <div>
              {/* Selected ticket detail */}
              {selectedTicket && (
                <div style={{
                  ...s.card, marginBottom: "20px",
                  border: "1px solid rgba(77,166,255,0.25)",
                  background: "linear-gradient(135deg, rgba(77,166,255,0.06), rgba(129,140,248,0.04))",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <div>
                      <div style={{ fontSize: "12px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px" }}>Ticket</div>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "#4da6ff" }}>{selectedTicket.ticket_number}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <StatusBadge status={selectedTicket.status} />
                      <button
                        onClick={() => handleOpenEdit(selectedTicket)}
                        style={{
                          background: "rgba(56, 189, 248, 0.15)",
                          border: "1px solid rgba(56, 189, 248, 0.3)",
                          borderRadius: "8px",
                          padding: "6px 14px",
                          color: "#38bdf8",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <FaEdit /> Edit Ticket
                      </button>
                      <button
                        onClick={() => handleDeleteTicket(selectedTicket)}
                        style={{
                          background: "rgba(239, 68, 68, 0.15)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          borderRadius: "8px",
                          padding: "6px 14px",
                          color: "#f87171",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <FaTrashAlt /> Delete Ticket
                      </button>
                      <button onClick={() => setSelectedTicket(null)} style={{
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px", padding: "6px 14px", color: "#9ca3af",
                        cursor: "pointer", fontSize: "13px",
                      }}>✕ Close</button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {[
                      ["Subject", selectedTicket.subject],
                      ["Category", selectedTicket.category],
                      ["Priority", selectedTicket.priority],
                      ["Date", new Date(selectedTicket.created_at).toLocaleString()],
                    ].map(([k, v]) => (
                      <div key={k} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "10px 14px" }}>
                        <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px", textTransform: "uppercase" }}>{k}</div>
                        <div style={{ color: "#e2e8f0", fontSize: "14px" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "14px" }}>
                    <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px", textTransform: "uppercase" }}>Description</div>
                    <div style={{ color: "#e2e8f0", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{selectedTicket.description}</div>
                  </div>
                  {selectedTicket.admin_notes && (
                    <div style={{ marginTop: "12px", background: "rgba(34,197,94,0.06)", borderRadius: "8px", padding: "14px", border: "1px solid rgba(34,197,94,0.15)" }}>
                      <div style={{ fontSize: "11px", color: "#22c55e", marginBottom: "8px", textTransform: "uppercase" }}>Admin Notes</div>
                      <div style={{ color: "#e2e8f0", fontSize: "14px", lineHeight: "1.6" }}>{selectedTicket.admin_notes}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Success Notification Banner */}
              {deleteSuccessMsg && (
                <div style={{
                  marginBottom: "16px",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid #10b981",
                  borderRadius: "10px",
                  padding: "12px 18px",
                  color: "#6ee7b7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "14px",
                  fontWeight: "600",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FaCheckCircle style={{ color: "#10b981" }} />
                    <span>{deleteSuccessMsg}</span>
                  </div>
                  <button
                    onClick={() => setDeleteSuccessMsg("")}
                    style={{ background: "none", border: "none", color: "#6ee7b7", cursor: "pointer", fontSize: "14px" }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Tickets Section with List / Grid View Toggle */}
              <div style={s.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#e2e8f0" }}>
                    My Tickets ({myTickets.length})
                  </h3>

                  {/* View Mode Toggle */}
                  <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "3px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <button
                      onClick={() => setViewMode("list")}
                      style={{
                        background: viewMode === "list" ? "rgba(77, 166, 255, 0.2)" : "transparent",
                        border: "none",
                        color: viewMode === "list" ? "#4da6ff" : "#94a3b8",
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
                    <button
                      onClick={() => setViewMode("grid")}
                      style={{
                        background: viewMode === "grid" ? "rgba(77, 166, 255, 0.2)" : "transparent",
                        border: "none",
                        color: viewMode === "grid" ? "#4da6ff" : "#94a3b8",
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
                  </div>
                </div>

                {viewMode === "list" ? (
                  /* ── List View (Table) ── */
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["Ticket #", "Subject", "Category", "Priority", "Status", "Date", "Actions"].map(h => (
                            <th key={h} style={{
                              textAlign: "left", padding: "10px 14px", fontSize: "11px",
                              fontWeight: "600", color: "#6b7280", textTransform: "uppercase",
                              letterSpacing: "0.5px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {myTickets.map(t => (
                          <tr
                            key={t.id}
                            className="ticket-row"
                            onClick={() => setSelectedTicket(t)}
                            style={{
                              transition: "background 0.15s",
                              background: selectedTicket?.id === t.id ? "rgba(77,166,255,0.08)" : "transparent",
                            }}
                          >
                            <td style={{ padding: "12px 14px", color: "#4da6ff", fontWeight: "700", fontSize: "13px" }}>{t.ticket_number}</td>
                            <td style={{ padding: "12px 14px", color: "#e2e8f0", fontSize: "13px", maxWidth: "220px" }}>
                              <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</div>
                            </td>
                            <td style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "13px" }}>{t.category}</td>
                            <td style={{ padding: "12px 14px" }}><PriorityBadge priority={t.priority} /></td>
                            <td style={{ padding: "12px 14px" }}><StatusBadge status={t.status} /></td>
                            <td style={{ padding: "12px 14px", color: "#6b7280", fontSize: "12px" }}>
                              {new Date(t.created_at).toLocaleDateString()}
                            </td>
                            <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <button
                                  onClick={() => setViewingTicket(t)}
                                  title="View Ticket"
                                  style={{
                                    background: "rgba(139, 92, 246, 0.15)",
                                    border: "1px solid rgba(139, 92, 246, 0.3)",
                                    borderRadius: "6px",
                                    padding: "6px 10px",
                                    color: "#a78bfa",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <FaEye /> View
                                </button>
                                <button
                                  onClick={() => handleOpenEdit(t)}
                                  title="Edit Ticket"
                                  style={{
                                    background: "rgba(56, 189, 248, 0.15)",
                                    border: "1px solid rgba(56, 189, 248, 0.3)",
                                    borderRadius: "6px",
                                    padding: "6px 10px",
                                    color: "#38bdf8",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <FaEdit /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteTicket(t)}
                                  title="Delete Ticket"
                                  style={{
                                    background: "rgba(239, 68, 68, 0.15)",
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    borderRadius: "6px",
                                    padding: "6px 10px",
                                    color: "#f87171",
                                    cursor: "pointer",
                                    fontSize: "12px",
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* ── Grid View ── */
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                    {myTickets.map(t => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        style={{
                          background: selectedTicket?.id === t.id ? "rgba(77,166,255,0.08)" : "rgba(255,255,255,0.02)",
                          border: selectedTicket?.id === t.id ? "1px solid rgba(77,166,255,0.3)" : "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "12px",
                          padding: "18px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                          transition: "all 0.2s",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ color: "#4da6ff", fontWeight: "700", fontSize: "14px" }}>{t.ticket_number}</div>
                            <div style={{ color: "#6b7280", fontSize: "11px", marginTop: "2px" }}>{t.category}</div>
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <PriorityBadge priority={t.priority} />
                            <StatusBadge status={t.status} />
                          </div>
                        </div>

                        <div>
                          <div style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>{t.subject}</div>
                          <div style={{ color: "#94a3b8", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: "1.4" }}>
                            {t.description}
                          </div>
                        </div>

                        <div style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)",
                          fontSize: "12px", color: "#6b7280"
                        }}>
                          <span>{new Date(t.created_at).toLocaleDateString()}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setViewingTicket(t); }}
                              style={{
                                background: "rgba(139, 92, 246, 0.15)",
                                border: "1px solid rgba(139, 92, 246, 0.3)",
                                borderRadius: "6px",
                                padding: "6px 12px",
                                color: "#a78bfa",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "600",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <FaEye /> View
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenEdit(t); }}
                              style={{
                                background: "rgba(56, 189, 248, 0.15)",
                                border: "1px solid rgba(56, 189, 248, 0.3)",
                                borderRadius: "6px",
                                padding: "6px 12px",
                                color: "#38bdf8",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "600",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <FaEdit /> Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteTicket(t); }}
                              style={{
                                background: "rgba(239, 68, 68, 0.15)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                borderRadius: "6px",
                                padding: "6px 12px",
                                color: "#f87171",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "600",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <FaTrashAlt /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Edit Ticket Modal ── */}
              {editingTicket && (
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 1200,
                    background: "rgba(0,0,0,0.75)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px",
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget && !editSubmitting) setEditingTicket(null);
                  }}
                >
                  <div
                    style={{
                      background: "#1e293b",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      borderRadius: "16px",
                      padding: "24px",
                      maxWidth: "560px",
                      width: "100%",
                      boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#38bdf8", fontSize: "18px", fontWeight: "700" }}>
                        <FaEdit /> Edit Ticket — {editingTicket.ticket_number}
                      </div>
                      <button
                        onClick={() => !editSubmitting && setEditingTicket(null)}
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

                    <form onSubmit={handleSaveEdit}>
                      <div style={{ marginBottom: "14px" }}>
                        <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", marginBottom: "6px", fontWeight: "600" }}>
                          Subject *
                        </label>
                        <input
                          type="text"
                          value={editForm.subject || ""}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, subject: e.target.value }))}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            background: "#0f172a",
                            border: editErrors.subject ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            color: "#f8fafc",
                            fontSize: "14px",
                            boxSizing: "border-box",
                          }}
                        />
                        {editErrors.subject && <span style={{ color: "#ef4444", fontSize: "11px" }}>{editErrors.subject}</span>}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                        <div>
                          <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", marginBottom: "6px", fontWeight: "600" }}>
                            Category *
                          </label>
                          <select
                            value={editForm.category || ""}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              background: "#0f172a",
                              border: editErrors.category ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "8px",
                              color: "#f8fafc",
                              fontSize: "14px",
                              boxSizing: "border-box",
                            }}
                          >
                            <option value="">Select category...</option>
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          {editErrors.category && <span style={{ color: "#ef4444", fontSize: "11px" }}>{editErrors.category}</span>}
                        </div>

                        <div>
                          <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", marginBottom: "6px", fontWeight: "600" }}>
                            Priority
                          </label>
                          <select
                            value={editForm.priority || "Medium"}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, priority: e.target.value }))}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              background: "#0f172a",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "8px",
                              color: "#f8fafc",
                              fontSize: "14px",
                              boxSizing: "border-box",
                            }}
                          >
                            {PRIORITIES.map((p) => (
                              <option key={p.label} value={p.label}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ marginBottom: "14px" }}>
                        <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", marginBottom: "6px", fontWeight: "600" }}>
                          Contact Number
                        </label>
                        <input
                          type="text"
                          value={editForm.contact_number || ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9+ ]/g, "");
                            setEditForm((prev) => ({ ...prev, contact_number: val }));
                          }}
                          placeholder="e.g. 9876543210"
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            background: "#0f172a",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            color: "#f8fafc",
                            fontSize: "14px",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: "18px" }}>
                        <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", marginBottom: "6px", fontWeight: "600" }}>
                          Description *
                        </label>
                        <textarea
                          rows={4}
                          value={editForm.description || ""}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            background: "#0f172a",
                            border: editErrors.description ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            color: "#f8fafc",
                            fontSize: "14px",
                            boxSizing: "border-box",
                            resize: "vertical",
                          }}
                        />
                        {editErrors.description && <span style={{ color: "#ef4444", fontSize: "11px" }}>{editErrors.description}</span>}
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                        <button
                          type="button"
                          onClick={() => setEditingTicket(null)}
                          disabled={editSubmitting}
                          style={{
                            background: "rgba(255,255,255,0.08)",
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
                          type="submit"
                          disabled={editSubmitting}
                          style={{
                            background: "linear-gradient(135deg, #0284c7, #0369a1)",
                            border: "none",
                            borderRadius: "8px",
                            padding: "10px 18px",
                            color: "#fff",
                            cursor: editSubmitting ? "not-allowed" : "pointer",
                            fontWeight: "700",
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {editSubmitting ? <FaSpinner style={{ animation: "spin 1s linear infinite" }} /> : <FaEdit />}
                          {editSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ── View Ticket Modal ── */}
              {viewingTicket && (
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 1200,
                    background: "rgba(0,0,0,0.75)",
                    backdropFilter: "blur(4px)",
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
                      border: "1px solid rgba(139, 92, 246, 0.3)",
                      borderRadius: "16px",
                      padding: "24px",
                      maxWidth: "620px",
                      width: "100%",
                      boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
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
                        ["Assigned To", viewingTicket.assigned_to || "Not Assigned"],
                        ["Progress", `${viewingTicket.progress_percentage || 0}%`],
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

              {/* ── Delete Confirmation Modal ── */}
              {deleteTarget && (
                <div style={{
                  position: "fixed", inset: 0, zIndex: 1200,
                  background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
                }} onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
                  <div style={{
                    background: "#1e293b", border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "16px", padding: "24px", maxWidth: "420px", width: "100%",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.8)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#f87171", fontSize: "18px", fontWeight: "700", marginBottom: "12px" }}>
                      <FaTrashAlt /> Delete Ticket
                    </div>
                    <p style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: "1.5", margin: "0 0 20px" }}>
                      Are you sure you want to delete ticket <strong style={{ color: "#4da6ff" }}>{deleteTarget.ticket_number}</strong> ({deleteTarget.subject})? This action cannot be undone.
                    </p>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(null)}
                        disabled={deleting}
                        style={{
                          background: "rgba(255,255,255,0.08)", border: "none",
                          borderRadius: "8px", padding: "10px 16px", color: "#94a3b8",
                          cursor: "pointer", fontWeight: "600", fontSize: "13px"
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmDeleteTicket}
                        disabled={deleting}
                        style={{
                          background: "linear-gradient(135deg, #ef4444, #dc2626)",
                          border: "none", borderRadius: "8px", padding: "10px 18px",
                          color: "#fff", cursor: deleting ? "not-allowed" : "pointer",
                          fontWeight: "700", fontSize: "13px",
                          display: "flex", alignItems: "center", gap: "6px"
                        }}
                      >
                        {deleting ? <FaSpinner style={{ animation: "spin 1s linear infinite" }} /> : <FaTrashAlt />}
                        {deleting ? "Deleting..." : "Confirm Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Shared Sub-components ────────────────────────────────────────────────────
export const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { color: "#6b7280", bg: "rgba(107,114,128,0.15)", icon: null };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      background: cfg.bg, color: cfg.color,
      padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600",
      border: `1px solid ${cfg.color}30`,
    }}>
      {cfg.icon} {status}
    </span>
  );
};

export const PriorityBadge = ({ priority }) => {
  const colorMap = { Low: "#22c55e", Medium: "#f59e0b", High: "#f97316", Critical: "#ef4444" };
  const color = colorMap[priority] || "#6b7280";
  return (
    <span style={{
      display: "inline-block", background: `${color}20`,
      color, padding: "3px 10px", borderRadius: "12px",
      fontSize: "11px", fontWeight: "700", border: `1px solid ${color}40`,
      textTransform: "uppercase", letterSpacing: "0.5px",
    }}>
      {priority}
    </span>
  );
};

export default ITSupport;
