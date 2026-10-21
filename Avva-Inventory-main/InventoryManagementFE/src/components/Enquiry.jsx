import React, { useState, useEffect, useCallback } from "react";
import {
  FaUserPlus,
  FaBell,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaCheck,
  FaSearch,
  FaBriefcase,
  FaCalendarDay,
  FaBan,
} from "react-icons/fa";

const API = "http://localhost:5000/api";

const STATUS_COLORS = {
  Pending: { bg: "#fbbf24", text: "#000" },
  Visited: { bg: "#22c55e", text: "#fff" },
  Cancelled: { bg: "#ef4444", text: "#fff" },
};

// ─────────────────────── helpers ───────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];

const formatDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// ─────────────────────── Notification Banner ───────────────────────
const NotificationPanel = ({ notifications, onDismiss }) => {
  if (!notifications.length) return null;
  return (
    <div style={notifStyles.panel}>
      <div style={notifStyles.header}>
        <FaBell style={{ color: "#fbbf24", marginRight: 8 }} />
        <span style={{ fontWeight: 700, color: "#fbbf24" }}>
          {notifications.length} Alert{notifications.length > 1 ? "s" : ""}
        </span>
      </div>
      {notifications.map((n) => (
        <div key={n.id} style={notifStyles.item}>
          <div style={{ flex: 1 }}>
            <span style={notifStyles.name}>{n.customer_name}</span>
            <span style={notifStyles.sub}>
              {n.is_today
                ? n.is_coming_today
                  ? "📍 Coming TODAY — be ready!"
                  : "⚠️ Scheduled today — not confirmed yet"
                : n.is_followup_today
                ? "📅 Follow-up TODAY!"
                : `⏰ Overdue since ${formatDate(n.meetup_date)}`}
            </span>
            <span style={notifStyles.phone}>📞 {n.contact_number}</span>
          </div>
          <button style={notifStyles.dismiss} onClick={() => onDismiss(n.id)} title="Dismiss">
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
};

const notifStyles = {
  panel: {
    background: "linear-gradient(135deg, #1c1a2e, #2d1b4e)",
    border: "1px solid rgba(251,191,36,0.4)",
    borderRadius: 14,
    padding: "16px 20px",
    marginBottom: 24,
    boxShadow: "0 4px 30px rgba(251,191,36,0.15)",
    animation: "pulse 2s ease-in-out infinite",
  },
  header: {
    display: "flex",
    alignItems: "center",
    marginBottom: 12,
    fontSize: 16,
  },
  item: {
    display: "flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.05)",
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 8,
    gap: 12,
    borderLeft: "3px solid #fbbf24",
  },
  name: { fontWeight: 700, color: "#fff", display: "block", fontSize: 15 },
  sub: { color: "#f9a8d4", fontSize: 13, display: "block", marginTop: 2 },
  phone: { color: "#93c5fd", fontSize: 13, display: "block", marginTop: 2 },
  dismiss: {
    background: "rgba(255,255,255,0.1)",
    border: "none",
    borderRadius: 6,
    color: "#9ca3af",
    cursor: "pointer",
    padding: "4px 8px",
    fontSize: 14,
  },
};

// ─────────────────────── Modal ───────────────────────
const Modal = ({ show, onClose, onSave, initial }) => {
  const blank = {
    customer_name: "",
    contact_number: "",
    email: "",
    meetup_date: todayStr(),
    is_coming_today: false,
    work_interest: "",
    notes: "",
    status: "Pending", // Always default to Pending
  };

  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (initial) {
      const { next_followup_date, ...rest } = initial;
      setForm({ ...blank, ...rest, status: "Pending" }); // Ensure status stays Pending
    } else {
      setForm(blank);
    }
  }, [initial, show]);

  if (!show) return null;

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.customer_name.trim()) { alert("Customer Name is required"); return; }
    if (!form.contact_number.trim()) { alert("Contact Number is required"); return; }
    if (!form.meetup_date) { alert("Meet-up Date is required"); return; }
    onSave(form);
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.box}>
        <div style={modalStyles.header}>
          <h3 style={{ margin: 0, color: "#4da6ff" }}>
            {initial ? "✏️ Edit Enquiry" : "➕ New Enquiry"}
          </h3>
          <button style={modalStyles.closeBtn} onClick={onClose}><FaTimes /></button>
        </div>

        <div style={modalStyles.grid}>
          {/* Customer Name */}
          <div style={modalStyles.group}>
            <label style={modalStyles.label}>Customer Name *</label>
            <input style={modalStyles.input} value={form.customer_name}
              onChange={(e) => set("customer_name", e.target.value)} placeholder="Full Name" />
          </div>

          {/* Contact Number */}
          <div style={modalStyles.group}>
            <label style={modalStyles.label}>Contact Number *</label>
            <input style={modalStyles.input} value={form.contact_number}
              onChange={(e) => set("contact_number", e.target.value)} placeholder="10-digit mobile" />
          </div>

          {/* Email */}
          <div style={modalStyles.group}>
            <label style={modalStyles.label}>Email</label>
            <input style={modalStyles.input} type="email" value={form.email}
              onChange={(e) => set("email", e.target.value)} placeholder="customer@email.com" />
          </div>

          {/* Work Interest - Fixed to properly handle data */}
          <div style={modalStyles.group}>
            <label style={modalStyles.label}>Work Interest</label>
            <input style={modalStyles.input} value={form.work_interest || ""}
              onChange={(e) => set("work_interest", e.target.value)} placeholder="e.g. Software Development, Marketing..." />
          </div>

          {/* Meet-up Date */}
          <div style={modalStyles.group}>
            <label style={modalStyles.label}>Meet-up Date *</label>
            <input style={modalStyles.input} type="date" value={form.meetup_date}
              onChange={(e) => set("meetup_date", e.target.value)} />
          </div>
        </div>

        {/* Coming Today checkbox removed as requested */}

        {/* Notes */}
        <div style={modalStyles.group}>
          <label style={modalStyles.label}>Notes</label>
          <textarea style={{ ...modalStyles.input, resize: "vertical", minHeight: 70 }}
            value={form.notes} onChange={(e) => set("notes", e.target.value)}
            placeholder="Additional notes..." />
        </div>

        <div style={modalStyles.footer}>
          <button style={modalStyles.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={modalStyles.saveBtn} onClick={handleSave}>
            {initial ? "💾 Update" : "➕ Add Enquiry"}
          </button>
        </div>
      </div>
    </div>
  );
};

const modalStyles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex",
    justifyContent: "center", alignItems: "center", zIndex: 1000,
  },
  box: {
    background: "linear-gradient(135deg, #111827, #1e2a3a)",
    borderRadius: 18, padding: 28, width: "90%", maxWidth: 720,
    maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
    border: "1px solid rgba(77,166,255,0.2)",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20,
  },
  closeBtn: {
    background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8,
    color: "#9ca3af", cursor: "pointer", padding: "6px 10px", fontSize: 16,
  },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" },
  group: { display: "flex", flexDirection: "column" },
  label: { fontSize: 13, color: "#9ca3af", marginBottom: 5 },
  input: {
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(77,166,255,0.3)",
    borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, outline: "none",
  },
  toggle: { display: "flex", alignItems: "center", cursor: "pointer", fontSize: 14 },
  footer: { display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 },
  cancelBtn: {
    background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8,
    color: "#9ca3af", cursor: "pointer", padding: "10px 22px", fontSize: 14,
  },
  saveBtn: {
    background: "linear-gradient(135deg, #4da6ff, #a855f7)", border: "none", borderRadius: 8,
    color: "#fff", cursor: "pointer", padding: "10px 24px", fontSize: 14, fontWeight: 700,
  },
};

// ─────────────────────── Toast ───────────────────────
const Toast = ({ message, show }) => {
  if (!show) return null;
  return (
    <div style={{
      position: "fixed",
      top: 75,
      right: 24,
      zIndex: 9999,
      minWidth: 300,
      background: "linear-gradient(135deg, #14532d, #15803d)",
      border: "1px solid rgba(34,197,94,0.5)",
      color: "#fff",
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "0 12px 40px rgba(34,197,94,0.35)",
      animation: "toastSlideDown 0.35s cubic-bezier(.22,1,.36,1)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 18px",
      }}>
        <span style={{
          background: "rgba(255,255,255,0.15)", borderRadius: "50%",
          width: 36, height: 36, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 18, flexShrink: 0,
        }}>
          <FaCheckCircle />
        </span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>Customer Accepted!</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{message}</div>
        </div>
      </div>
      <div style={{
        height: 3,
        background: "rgba(255,255,255,0.15)",
      }}>
        <div style={{
          height: "100%",
          background: "#86efac",
          animation: "toastProgress 3s linear forwards",
        }} />
      </div>
    </div>
  );
};

// ─────────────────────── Main Page ───────────────────────
const EnquiryPage = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [loading, setLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "" });
  const [updatingCalled, setUpdatingCalled] = useState(null);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [newFollowupDate, setNewFollowupDate] = useState("");
  const [updatingFollowup, setUpdatingFollowup] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [eq, nf] = await Promise.all([
        fetch(`${API}/enquiries`).then((r) => r.json()),
        fetch(`${API}/enquiries/notifications`).then((r) => r.json()),
      ]);
      setEnquiries(eq);
      setNotifications(nf);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async (form) => {
    const method = editTarget ? "PUT" : "POST";
    const url = editTarget ? `${API}/enquiries/${editTarget.id}` : `${API}/enquiries`;
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, called: false, status: "Pending" }), // Ensure status is Pending for new entries
      });
      if (!res.ok) { const d = await res.json(); alert(d.error || "Error"); return; }
      setShowModal(false);
      setEditTarget(null);
      fetchAll();
    } catch (err) {
      alert("Server error. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this enquiry?")) return;
    await fetch(`${API}/enquiries/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const handleAccept = async (enq) => {
    if (enq.status === "Visited") return;
    setAcceptingId(enq.id);
    try {
      await fetch(`${API}/enquiries/${enq.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...enq, status: "Visited" }),
      });
      setToast({ show: true, message: `${enq.customer_name} marked as visited!` });
      setTimeout(() => setToast({ show: false, message: "" }), 3000);
      fetchAll();
    } catch (err) {
      alert("Error updating status.");
    } finally {
      setAcceptingId(null);
    }
  };

  const handleCancel = async (enq) => {
    if (enq.status === "Cancelled") return;
    if (!window.confirm(`Cancel enquiry for ${enq.customer_name}?`)) return;
    try {
      await fetch(`${API}/enquiries/${enq.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...enq, status: "Cancelled" }),
      });
      fetchAll();
    } catch (err) {
      alert("Error updating status.");
    }
  };

  const handleToggleCalled = async (enq) => {
    setUpdatingCalled(enq.id);
    try {
      await fetch(`${API}/enquiries/${enq.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...enq, called: !enq.called }),
      });
      fetchAll();
    } catch (err) {
      alert("Error updating called status.");
    } finally {
      setUpdatingCalled(null);
    }
  };

  const handleUpdateFollowup = async () => {
    if (!newFollowupDate) {
      alert("Please select a follow-up date");
      return;
    }
    setUpdatingFollowup(selectedEnquiry.id);
    try {
      await fetch(`${API}/enquiries/${selectedEnquiry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...selectedEnquiry, next_followup_date: newFollowupDate }),
      });
      setShowFollowupModal(false);
      setSelectedEnquiry(null);
      setNewFollowupDate("");
      fetchAll();
    } catch (err) {
      alert("Error updating follow-up date.");
    } finally {
      setUpdatingFollowup(null);
    }
  };

  const openFollowupModal = (enq) => {
    setSelectedEnquiry(enq);
    setNewFollowupDate(enq.next_followup_date || "");
    setShowFollowupModal(true);
  };

  const handleDismiss = (id) => setDismissed((p) => [...p, id]);

  const visibleNotifs = notifications.filter((n) => !dismissed.includes(n.id));

  const filtered = enquiries.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = e.customer_name.toLowerCase().includes(q) ||
      e.contact_number.includes(q) || (e.email || "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "All" || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: enquiries.length,
    pending: enquiries.filter((e) => e.status === "Pending").length,
    visited: enquiries.filter((e) => e.status === "Visited").length,
    today: enquiries.filter((e) => e.is_today).length,
  };

  return (
    <div style={pageStyles.container}>
      <style>{`
        @keyframes pulse { 0%,100%{box-shadow:0 4px 30px rgba(251,191,36,0.15)} 50%{box-shadow:0 4px 40px rgba(251,191,36,0.35)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastSlideDown { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastProgress { from{width:100%} to{width:0%} }
        .enquiry-row:hover { background: rgba(77,166,255,0.07) !important; }
        input[type=checkbox] { accent-color: #4da6ff; width:16px; height:16px; cursor:pointer; }
      `}</style>

      {/* Header */}
      <div style={pageStyles.pageHeader}>
        <div>
          <h2 style={pageStyles.title}>📋 Enquiry Management</h2>
          <p style={pageStyles.subtitle}>Manage customer enquiries and follow-ups</p>
        </div>
        <button style={pageStyles.addBtn} onClick={() => { setEditTarget(null); setShowModal(true); }}>
          <FaUserPlus style={{ marginRight: 8 }} /> New Enquiry
        </button>
      </div>

      {/* Stats */}
      <div style={pageStyles.statsGrid}>
        {[
          { label: "Total", value: stats.total, color: "#4da6ff", icon: "📋" },
          { label: "Pending", value: stats.pending, color: "#fbbf24", icon: "⏳" },
          { label: "Visited", value: stats.visited, color: "#22c55e", icon: "✅" },
          { label: "Today", value: stats.today, color: "#a855f7", icon: "📅" },
        ].map((s) => (
          <div key={s.label} style={{ ...pageStyles.statCard, borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ color: s.color, fontSize: 28, fontWeight: 800 }}>{s.value}</div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Notifications */}
      <NotificationPanel notifications={visibleNotifs} onDismiss={handleDismiss} />

      {/* Filters */}
      <div style={pageStyles.toolbar}>
        <div style={pageStyles.searchBox}>
          <FaSearch style={{ color: "#6b7280", marginRight: 8 }} />
          <input style={pageStyles.searchInput} placeholder="Search name, phone, email..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={pageStyles.filterGroup}>
          {["All", "Pending", "Visited", "Cancelled"].map((s) => (
            <button key={s} style={{
              ...pageStyles.filterBtn,
              ...(filterStatus === s ? pageStyles.filterBtnActive : {}),
            }} onClick={() => setFilterStatus(s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#6b7280" }}>Loading enquiries...</div>
      ) : filtered.length === 0 ? (
        <div style={pageStyles.emptyState}>
          <div style={{ fontSize: 56 }}>📭</div>
          <div style={{ color: "#6b7280", marginTop: 12 }}>No enquiries found</div>
          <button style={pageStyles.addBtn} onClick={() => { setEditTarget(null); setShowModal(true); }}>
            Create your first enquiry
          </button>
        </div>
      ) : (
        <div style={pageStyles.tableWrapper}>
          <table style={pageStyles.table}>
            <thead>
              <tr>
                {["Customer", "Contact", "Email", "Work Interest", "Meet-up Date", "Coming Today?", "Status", "Called", "Next Follow-up", "Actions"].map((h) => (
                  <th key={h} style={pageStyles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const rowAlert = e.is_today || e.is_overdue;
                return (
                  <tr key={e.id} className="enquiry-row" style={{
                    ...pageStyles.tr,
                    borderLeft: rowAlert ? "3px solid #fbbf24" : "3px solid transparent",
                  }}>
                    <td style={pageStyles.td}>
                      <div style={{ fontWeight: 700, color: "#fff" }}>{e.customer_name}</div>
                      {e.is_today && <span style={pageStyles.todayBadge}>TODAY</span>}
                      {e.is_overdue && !e.is_today && <span style={pageStyles.overdueBadge}>OVERDUE</span>}
                    </td>
                    <td style={pageStyles.td}><FaPhone style={{ color: "#4da6ff", marginRight: 5 }} />{e.contact_number}</td>
                    <td style={pageStyles.td}>{e.email ? <><FaEnvelope style={{ color: "#a855f7", marginRight: 5 }} />{e.email}</> : "—"}</td>
                    <td style={pageStyles.td}>{e.work_interest ? <><FaBriefcase style={{ color: "#22c55e", marginRight: 5 }} />{e.work_interest}</> : "—"}</td>
                    <td style={pageStyles.td}>
                      <FaCalendarAlt style={{ color: "#fbbf24", marginRight: 5 }} />
                      {formatDate(e.meetup_date)}
                    </td>
                    <td style={{ ...pageStyles.td, textAlign: "center" }}>
                      {e.is_coming_today
                        ? <FaCheckCircle style={{ color: "#22c55e", fontSize: 18 }} />
                        : <FaClock style={{ color: "#9ca3af", fontSize: 18 }} />}
                    </td>
                    <td style={pageStyles.td}>
                      {e.status === "Visited" ? (
                        <span style={pageStyles.visitedChip}>✅ Visited</span>
                      ) : e.status === "Cancelled" ? (
                        <span style={{ ...pageStyles.badge, background: "#ef4444", color: "#fff" }}>Cancelled</span>
                      ) : (
                        <button
                          style={pageStyles.visitBtn}
                          onClick={() => handleAccept(e)}
                          disabled={acceptingId === e.id}
                          title="Mark as Visited"
                        >
                          {acceptingId === e.id ? "..." : "Mark Visited"}
                        </button>
                      )}
                    </td>
                    <td style={{ ...pageStyles.td, textAlign: "center" }}>
                      <button
                        style={{
                          ...pageStyles.calledBtn,
                          background: e.called ? "#22c55e" : "rgba(255,255,255,0.1)",
                          color: e.called ? "#fff" : "#9ca3af",
                        }}
                        onClick={() => handleToggleCalled(e)}
                        disabled={updatingCalled === e.id}
                        title={e.called ? "Mark as Not Called" : "Mark as Called"}
                      >
                        {updatingCalled === e.id ? "..." : <FaCheck />}
                        <span style={{ marginLeft: 6 }}>{e.called ? "Called" : "Not Called"}</span>
                      </button>
                    </td>
                    <td style={pageStyles.td}>
                      {e.next_followup_date ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <FaCalendarDay style={{ color: "#fbbf24" }} />
                          <span>{formatDate(e.next_followup_date)}</span>
                        </div>
                      ) : "—"}
                    </td>
                    <td style={pageStyles.td}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          style={pageStyles.followupBtn}
                          onClick={() => openFollowupModal(e)}
                          title="Set Next Follow-up Date"
                        >
                          <FaCalendarDay />
                        </button>
                        {e.status !== "Cancelled" && e.status !== "Visited" && (
                          <button
                            style={pageStyles.cancelBtn}
                            onClick={() => handleCancel(e)}
                            title="Cancel Enquiry"
                          >
                            <FaBan />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal show={showModal} onClose={() => { setShowModal(false); setEditTarget(null); }}
        onSave={handleSave} initial={editTarget} />

      {/* Follow-up Modal */}
      {showFollowupModal && selectedEnquiry && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.box}>
            <div style={modalStyles.header}>
              <h3 style={{ margin: 0, color: "#4da6ff" }}>
                📅 Set Next Follow-up Date
              </h3>
              <button style={modalStyles.closeBtn} onClick={() => setShowFollowupModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div style={{ padding: "20px 0" }}>
              <div style={modalStyles.group}>
                <label style={modalStyles.label}>Customer: {selectedEnquiry.customer_name}</label>
                <input
                  style={modalStyles.input}
                  type="date"
                  value={newFollowupDate}
                  onChange={(e) => setNewFollowupDate(e.target.value)}
                  min={todayStr()}
                />
              </div>
            </div>
            <div style={modalStyles.footer}>
              <button style={modalStyles.cancelBtn} onClick={() => setShowFollowupModal(false)}>
                Cancel
              </button>
              <button
                style={modalStyles.saveBtn}
                onClick={handleUpdateFollowup}
                disabled={updatingFollowup === selectedEnquiry.id}
              >
                {updatingFollowup === selectedEnquiry.id ? "Saving..." : "Save Follow-up Date"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast show={toast.show} message={toast.message} />
    </div>
  );
};

// ─────────────────────── Styles ───────────────────────
const pageStyles = {
  container: { padding: "0", animation: "fadeIn 0.4s ease", color: "#fff", minHeight: "100vh" },
  pageHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 28, flexWrap: "wrap", gap: 12,
  },
  title: { margin: 0, fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" },
  subtitle: { margin: "4px 0 0", color: "#6b7280", fontSize: 14 },
  addBtn: {
    display: "flex", alignItems: "center", background: "linear-gradient(135deg, #4da6ff, #a855f7)",
    border: "none", borderRadius: 10, color: "#fff", cursor: "pointer",
    padding: "11px 22px", fontWeight: 700, fontSize: 14,
    boxShadow: "0 4px 15px rgba(77,166,255,0.3)", transition: "transform 0.2s, box-shadow 0.2s",
  },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 },
  statCard: {
    background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "18px 20px",
    display: "flex", flexDirection: "column", gap: 4, textAlign: "center",
    backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.08)",
  },
  toolbar: { display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
  searchBox: {
    display: "flex", alignItems: "center", background: "rgba(255,255,255,0.07)",
    borderRadius: 10, padding: "9px 14px", flex: 1, minWidth: 200,
    border: "1px solid rgba(77,166,255,0.2)",
  },
  searchInput: { background: "transparent", border: "none", color: "#fff", outline: "none", flex: 1, fontSize: 14 },
  filterGroup: { display: "flex", gap: 6 },
  filterBtn: {
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "#9ca3af", cursor: "pointer", padding: "8px 16px", fontSize: 13,
    transition: "all 0.2s",
  },
  filterBtnActive: { background: "rgba(77,166,255,0.2)", color: "#4da6ff", borderColor: "#4da6ff" },
  tableWrapper: { overflowX: "auto", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    background: "rgba(255,255,255,0.06)", color: "#6b7280", fontWeight: 600,
    padding: "13px 14px", textAlign: "left", whiteSpace: "nowrap",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  tr: { borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" },
  td: { padding: "12px 14px", color: "#d1d5db", verticalAlign: "middle" },
  badge: { borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700 },
  todayBadge: {
    background: "rgba(168,85,247,0.2)", color: "#a855f7", borderRadius: 6,
    fontSize: 10, fontWeight: 700, padding: "2px 7px", marginLeft: 6, letterSpacing: 0.5,
  },
  overdueBadge: {
    background: "rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: 6,
    fontSize: 10, fontWeight: 700, padding: "2px 7px", marginLeft: 6, letterSpacing: 0.5,
  },
  acceptBtn: {
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    border: "none", borderRadius: 7,
    color: "#fff", cursor: "pointer", padding: "7px 11px", fontSize: 15,
    fontWeight: 700, boxShadow: "0 2px 10px rgba(34,197,94,0.35)",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  visitBtn: {
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    border: "none", borderRadius: 7,
    color: "#fff", cursor: "pointer", padding: "6px 14px", fontSize: 12,
    fontWeight: 600, boxShadow: "0 2px 8px rgba(34,197,94,0.3)",
    transition: "transform 0.15s, box-shadow 0.15s",
    whiteSpace: "nowrap",
  },
  cancelBtn: {
    background: "linear-gradient(135deg, #ef4444, #dc2626)",
    border: "none", borderRadius: 7,
    color: "#fff", cursor: "pointer", padding: "7px 11px", fontSize: 15,
    fontWeight: 700, boxShadow: "0 2px 10px rgba(239,68,68,0.35)",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  followupBtn: {
    background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
    border: "none", borderRadius: 7,
    color: "#000", cursor: "pointer", padding: "7px 11px", fontSize: 15,
    fontWeight: 700, boxShadow: "0 2px 10px rgba(251,191,36,0.35)",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  calledBtn: {
    border: "none", borderRadius: 7, cursor: "pointer", padding: "7px 12px",
    fontSize: 12, fontWeight: 600, transition: "all 0.15s", display: "flex",
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  visitedChip: {
    background: "rgba(34,197,94,0.15)", color: "#22c55e",
    borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 700,
    whiteSpace: "nowrap", display: "inline-block",
  },
  emptyState: { textAlign: "center", padding: "60px 20px" },
};

export default EnquiryPage;