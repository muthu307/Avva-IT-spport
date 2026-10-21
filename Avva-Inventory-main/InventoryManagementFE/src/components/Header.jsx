import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBars, FaBell, FaSignOutAlt, FaUserCircle,
  FaCalendarAlt, FaPhone, FaTimes, FaExclamationCircle,
  FaClock, FaCheckCircle, FaCheck,
} from "react-icons/fa";

const API = "http://localhost:5000/api";

const formatDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const Header = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dismissed_enquiries") || "[]"); }
    catch { return []; }
  });

  // ── Accepted success banner (shown inside the panel) ──
  const [acceptedMsg, setAcceptedMsg] = useState(null); // { name }
  const acceptTimerRef = useRef(null);

  const panelRef = useRef(null);

  // Fetch pending enquiry notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API}/enquiries/notifications`);
      if (res.ok) setNotifications(await res.json());
    } catch (_) { }
  }, []);

  // Poll every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Listen for accept event fired from Enquiry page
  useEffect(() => {
    const handler = (e) => {
      const { name } = e.detail;

      // Open the bell panel
      setShowPanel(true);

      // Show the accepted banner inside
      setAcceptedMsg({ name });

      // Re-fetch so the item disappears from live list
      fetchNotifications();

      // Auto-close panel + clear banner after 3s
      clearTimeout(acceptTimerRef.current);
      acceptTimerRef.current = setTimeout(() => {
        setAcceptedMsg(null);
        setShowPanel(false);
      }, 3000);
    };

    window.addEventListener("enquiry-accepted", handler);
    return () => {
      window.removeEventListener("enquiry-accepted", handler);
      clearTimeout(acceptTimerRef.current);
    };
  }, [fetchNotifications]);

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowPanel(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleDismiss = (id) => {
    const updated = [...dismissed, id];
    setDismissed(updated);
    localStorage.setItem("dismissed_enquiries", JSON.stringify(updated));
  };

  const handleClearAll = () => {
    const ids = notifications.map((n) => n.id);
    const updated = [...dismissed, ...ids];
    setDismissed(updated);
    localStorage.setItem("dismissed_enquiries", JSON.stringify(updated));
    setShowPanel(false);
  };

  const visible = notifications.filter((n) => !dismissed.includes(n.id));
  const today = new Date().toISOString().split("T")[0];

  const getNotifType = (n) => {
    if (n.status === "Visited") return "visited";
    if (n.status === "Cancelled") return "cancelled";
    if (n.meetup_date < today) return "overdue";
    if (n.meetup_date === today) return "today";
    return "upcoming";
  };

  const notifColors = {
    overdue: { icon: <FaExclamationCircle />, color: "#ef4444", label: "OVERDUE", bg: "rgba(239,68,68,0.12)" },
    today: { icon: <FaCheckCircle />, color: "#fbbf24", label: "TODAY", bg: "rgba(251,191,36,0.12)" },
    upcoming: { icon: <FaClock />, color: "#4da6ff", label: "UPCOMING", bg: "rgba(77,166,255,0.08)" },
    visited: { icon: <FaCheckCircle />, color: "#22c55e", label: "VISITED", bg: "rgba(34,197,94,0.12)" },
    cancelled: { icon: <FaTimes />, color: "#9ca3af", label: "CANCELLED", bg: "rgba(156,163,175,0.12)" },
  };

  return (
    <div style={styles.header}>
      {/* Left */}
      <div style={styles.left}>
        <FaBars style={styles.toggleBtn} onClick={toggleSidebar} />
        <h3 style={styles.title}>Avva Inventory</h3>
      </div>

      {/* Right */}
      <div style={styles.right}>

        {/* 🔔 Notification Bell */}
        <div ref={panelRef} style={{ position: "relative" }}>
          <button
            style={{ ...styles.bellBtn, background: showPanel ? "rgba(77,166,255,0.2)" : "rgba(255,255,255,0.07)" }}
            onClick={() => setShowPanel((p) => !p)}
            title="Enquiry Notifications"
          >
            <FaBell style={{ fontSize: 18, color: visible.length > 0 || acceptedMsg ? "#fbbf24" : "#9ca3af" }} />
            {visible.length > 0 && !acceptedMsg && (
              <span style={styles.badge}>{visible.length > 9 ? "9+" : visible.length}</span>
            )}
          </button>

          {/* ── Dropdown Panel ── */}
          {showPanel && (
            <div style={styles.panel}>

              {/* Panel Header */}
              <div style={styles.panelHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FaBell style={{ color: "#fbbf24" }} />
                  <span style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>
                    Enquiry Reminders
                  </span>
                  {visible.length > 0 && !acceptedMsg && (
                    <span style={styles.countPill}>{visible.length}</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {visible.length > 0 && !acceptedMsg && (
                    <button style={styles.clearBtn} onClick={handleClearAll}>Clear All</button>
                  )}
                  <button style={styles.closeBtn} onClick={() => setShowPanel(false)}>
                    <FaTimes />
                  </button>
                </div>
              </div>

              {/* ── Accepted Success Banner (shown inside panel) ── */}
              {acceptedMsg && (
                <div style={styles.acceptedBanner}>
                  {/* Icon */}
                  <div style={styles.acceptedIconWrap}>
                    <FaCheck style={{ color: "#fff", fontSize: 20 }} />
                  </div>
                  {/* Text */}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>
                      Customer Accepted! ✅
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
                      <strong style={{ color: "#86efac" }}>{acceptedMsg.name}</strong> has been marked as Visited.
                    </div>
                  </div>
                  {/* Auto-close progress bar */}
                  <div style={styles.progressTrack}>
                    <div style={styles.progressBar} />
                  </div>
                </div>
              )}

              {/* ── Notification List ── */}
              {!acceptedMsg && (
                <div style={styles.panelBody}>
                  {visible.length === 0 ? (
                    <div style={styles.emptyState}>
                      <FaCheckCircle style={{ fontSize: 32, color: "#22c55e", marginBottom: 8 }} />
                      <div style={{ color: "#6b7280", fontSize: 14 }}>All caught up! No active enquiries.</div>
                    </div>
                  ) : (
                    visible.map((n) => {
                      const type = getNotifType(n);
                      const cfg = notifColors[type];
                      return (
                        <div key={n.id} style={{ ...styles.notifItem, background: cfg.bg, borderLeft: `3px solid ${cfg.color}` }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ color: cfg.color, fontSize: 14 }}>{cfg.icon}</span>
                              <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{n.customer_name}</span>
                              <span style={{ ...styles.typeBadge, background: cfg.color }}>{cfg.label}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#9ca3af", fontSize: 12, marginBottom: 4 }}>
                              <FaCalendarAlt style={{ color: cfg.color }} />
                              Meet-up: <strong style={{ color: "#d1d5db" }}>{formatDate(n.meetup_date)}</strong>
                              {n.is_coming_today && (
                                <span style={{ color: "#22c55e", fontWeight: 700, marginLeft: 4 }}>✅ Confirmed</span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#9ca3af", fontSize: 12 }}>
                              <FaPhone style={{ color: "#4da6ff" }} />
                              <span>{n.contact_number}</span>
                              {n.car_interest && (
                                <span style={{ color: "#a855f7", marginLeft: 6 }}>🚗 {n.car_interest}</span>
                              )}
                            </div>
                          </div>
                          <button style={styles.dismissBtn} onClick={() => handleDismiss(n.id)} title="Dismiss">
                            <FaTimes />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Footer */}
              {!acceptedMsg && visible.length > 0 && (
                <div style={styles.panelFooter}>
                  <button style={styles.viewAllBtn} onClick={() => { navigate("/enquiry"); setShowPanel(false); }}>
                    View All Enquiries →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User */}
        <div style={styles.userSection}>
          <FaUserCircle style={{ fontSize: "18px", color: "#4da6ff" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span style={styles.username}>
              {user?.full_name || user?.username || user?.name || user?.email || "User"}
            </span>
            <span style={styles.userRole}>
              {((user?.user_type || localStorage.getItem("userType") || "Admin")).charAt(0).toUpperCase() + ((user?.user_type || localStorage.getItem("userType") || "Admin")).slice(1)}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button style={styles.logoutBtn} onClick={handleLogout}>
          <FaSignOutAlt />
          Logout
        </button>
      </div>
    </div>
  );
};

// ───────────────── Styles ─────────────────
const styles = {
  header: {
    position: "fixed", top: 0, left: 0, right: 0, height: "65px",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "0 25px", background: "rgba(17,24,39,0.97)",
    backdropFilter: "blur(14px)", boxShadow: "0 2px 20px rgba(0,0,0,0.5)",
    zIndex: 2000, color: "#fff",
  },
  left: { display: "flex", alignItems: "center", gap: "18px" },
  toggleBtn: { cursor: "pointer", fontSize: "20px", color: "#4da6ff" },
  title: { margin: 0, fontWeight: "700", fontSize: "18px", letterSpacing: "0.5px", color: "#fff" },
  right: { display: "flex", alignItems: "center", gap: "14px" },

  bellBtn: {
    position: "relative", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
    padding: "8px 11px", cursor: "pointer", display: "flex", alignItems: "center",
    transition: "background 0.2s",
  },
  badge: {
    position: "absolute", top: -5, right: -5,
    background: "linear-gradient(135deg, #ef4444, #fbbf24)",
    color: "#fff", borderRadius: "50%", width: 18, height: 18,
    fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 0 8px rgba(239,68,68,0.6)",
    animation: "bellPulse 1.5s ease-in-out infinite",
  },

  panel: {
    position: "absolute", top: "calc(100% + 10px)", right: 0,
    width: 380, background: "linear-gradient(135deg, #111827, #1a2235)",
    border: "1px solid rgba(77,166,255,0.2)", borderRadius: 16,
    boxShadow: "0 20px 60px rgba(0,0,0,0.7)", zIndex: 3000,
    overflow: "hidden", animation: "dropIn 0.2s ease",
  },
  panelHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.2)",
  },
  countPill: {
    background: "rgba(251,191,36,0.2)", color: "#fbbf24",
    borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700,
  },
  clearBtn: {
    background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
    color: "#ef4444", borderRadius: 6, cursor: "pointer", fontSize: 12, padding: "4px 10px",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.08)", border: "none", color: "#9ca3af",
    borderRadius: 6, cursor: "pointer", padding: "4px 8px", fontSize: 14,
  },

  // ── Accepted Banner ──
  acceptedBanner: {
    margin: 12,
    background: "linear-gradient(135deg, #14532d, #166534)",
    border: "1px solid rgba(34,197,94,0.4)",
    borderRadius: 12,
    padding: "16px",
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    position: "relative",
    overflow: "hidden",
    animation: "fadeIn 0.3s ease",
  },
  acceptedIconWrap: {
    background: "rgba(34,197,94,0.3)",
    borderRadius: "50%",
    width: 44, height: 44,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
    border: "2px solid rgba(34,197,94,0.5)",
  },
  // progress bar absolutely inside acceptedBanner
  progressTrack: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    height: 3, background: "rgba(255,255,255,0.1)",
  },
  progressBar: {
    height: "100%", background: "#86efac",
    animation: "toastProgress 3s linear forwards",
  },

  panelBody: { maxHeight: 360, overflowY: "auto", padding: "8px" },
  notifItem: {
    display: "flex", alignItems: "flex-start", gap: 12,
    borderRadius: 10, padding: "10px 12px", marginBottom: 6,
  },
  typeBadge: {
    fontSize: 9, fontWeight: 800, letterSpacing: 0.5, color: "#000",
    padding: "2px 6px", borderRadius: 4,
  },
  dismissBtn: {
    background: "rgba(255,255,255,0.06)", border: "none", color: "#6b7280",
    borderRadius: 6, cursor: "pointer", padding: "4px 7px", fontSize: 11,
    flexShrink: 0,
  },
  emptyState: { textAlign: "center", padding: "30px 16px" },
  panelFooter: { padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" },
  viewAllBtn: {
    width: "100%", background: "linear-gradient(135deg, #4da6ff22, #a855f722)",
    border: "1px solid rgba(77,166,255,0.3)", color: "#4da6ff",
    borderRadius: 8, padding: "9px", cursor: "pointer", fontWeight: 600, fontSize: 13,
  },

  userSection: {
    display: "flex", alignItems: "center", gap: "10px",
    backgroundColor: "#1f2937", padding: "6px 14px", borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.08)"
  },
  username: { fontSize: "13px", fontWeight: "600", color: "#fff" },
  userRole: {
    fontSize: "10px", fontWeight: "700", color: "#4da6ff",
    textTransform: "uppercase", letterSpacing: "0.5px"
  },
  logoutBtn: {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "6px 14px", backgroundColor: "#ef4444", color: "#fff",
    border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: "500",
  },
};

export default Header;