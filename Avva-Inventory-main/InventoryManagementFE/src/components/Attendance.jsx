import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { 
  FaBarcode, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaFileExcel, 
  FaPrint, 
  FaChartBar, 
  FaHistory, 
  FaPlusCircle,
  FaFileAlt,
  FaCamera,
  FaStopCircle,
  FaIdCard,
  FaQrcode,
  FaSyncAlt,
  FaUserTie
} from "react-icons/fa";

const API_BASE_URL = "http://localhost:5000/api";

export default function Attendance() {
  const [activeTab, setActiveTab] = useState("scanner"); // scanner, dashboard, history, reports
  
  // Shared Data States
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Hardware/Text Scanner States
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const barcodeInputRef = useRef(null);
  const lastScanRef = useRef({ code: "", time: 0 });

  // Camera Scanner States
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const html5QrcodeScannerRef = useRef(null);

  // Success / Scan Result Popup Modal States
  const [popupResult, setPopupResult] = useState(null);
  const [autoResetCountdown, setAutoResetCountdown] = useState(0);
  const processingLockRef = useRef(false);
  const popupTimerRef = useRef(null);

  // Employee ID Card Modal
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [idCardEmployeeId, setIdCardEmployeeId] = useState("");

  // Dashboard Stats State
  const [dashboardStats, setDashboardStats] = useState({
    total_working_days: 0,
    present_days: 0,
    absent_days: 0,
    paid_leave: 0,
    half_days: 0,
    permissions: 0,
    late_entries: 0,
    overtime_hours: 0,
    total_hours: 0
  });

  // History State
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    employee_id: "",
    date: new Date().toISOString().split("T")[0],
    status: "present",
    notes: "",
    overtime: 0
  });

  // Reports State
  const [reportType, setReportType] = useState("daily"); // daily, monthly, employee

  // Axios instance
  const token = localStorage.getItem("token");
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : ""
    }
  });

  // Synthesized audio beep on scan
  const playBeep = (isError = false) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isError ? "sawtooth" : "sine";
      osc.frequency.setValueAtTime(isError ? 240 : 880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (isError ? 0.35 : 0.15));
    } catch (e) {
      // Audio context suppressed or unsupported
    }
  };

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Auto start/stop camera on tab change
  useEffect(() => {
    if (activeTab === "scanner") {
      setIsCameraActive(true);
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    } else {
      setIsCameraActive(false);
      stopCamera();
    }

    if (activeTab === "dashboard") {
      fetchDashboardStats();
    } else if (activeTab === "history" || activeTab === "reports") {
      fetchAttendanceRecords();
    }
  }, [activeTab, selectedMonth, selectedYear, selectedEmployee, startDate, endDate, statusFilter]);

  // Camera Scanner Lifecycle Management
  useEffect(() => {
    if (isCameraActive && activeTab === "scanner") {
      setCameraError("");
      const timer = setTimeout(() => {
        startCamera();
      }, 150);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
  }, [isCameraActive, activeTab]);

  // Auto-close countdown timer & scanner reset
  const closePopupAndResetScanner = () => {
    if (popupTimerRef.current) {
      clearInterval(popupTimerRef.current);
      popupTimerRef.current = null;
    }
    setPopupResult(null);
    setAutoResetCountdown(0);
    setScannedBarcode("");
    // 300ms buffer to prevent duplicate frame capture on resume
    setTimeout(() => {
      processingLockRef.current = false;
    }, 300);
  };

  const startPopupAutoCloseTimer = () => {
    if (popupTimerRef.current) clearInterval(popupTimerRef.current);
    let secondsLeft = 4;
    setAutoResetCountdown(secondsLeft);

    popupTimerRef.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearInterval(popupTimerRef.current);
        popupTimerRef.current = null;
        setPopupResult(null);
        setAutoResetCountdown(0);
        setScannedBarcode("");
        setTimeout(() => {
          processingLockRef.current = false;
        }, 300);
      } else {
        setAutoResetCountdown(secondsLeft);
      }
    }, 1000);
  };

  const startCamera = async () => {
    try {
      const element = document.getElementById("camera-reader");
      if (!element) return;

      // Stop any existing scanner instance
      await stopCamera();

      const html5Qrcode = new Html5Qrcode("camera-reader");
      html5QrcodeScannerRef.current = html5Qrcode;

      const config = { 
        fps: 25, 
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.max(180, Math.floor(minEdge * 0.85));
          return { width: boxSize, height: boxSize };
        },
        aspectRatio: 1.0,
        disableFlip: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.CODE_39
        ]
      };

      // Try fetching cameras first
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        // Use back camera if multiple exist, otherwise use default available camera
        const selectedCamera = devices.length > 1 ? devices[devices.length - 1] : devices[0];
        await html5Qrcode.start(
          selectedCamera.id,
          config,
          (decodedText) => {
            if (decodedText) handleScanCode(decodedText);
          },
          () => {}
        );
        return;
      }

      // Fallback: Start using environment or user facing mode constraint
      await html5Qrcode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          if (decodedText) handleScanCode(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error("Camera start failure:", err);
      const errStr = String(err).toLowerCase();
      
      // Try secondary fallback to user facing camera
      try {
        if (html5QrcodeScannerRef.current) {
          const fallbackConfig = { fps: 20, qrbox: { width: 250, height: 250 } };
          await html5QrcodeScannerRef.current.start(
            { facingMode: "user" },
            fallbackConfig,
            (decodedText) => {
              if (decodedText) handleScanCode(decodedText);
            },
            () => {}
          );
          return;
        }
      } catch (fallbackErr) {
        console.error("Fallback camera failure:", fallbackErr);
      }

      if (errStr.includes("notallowed") || errStr.includes("permission") || errStr.includes("denied")) {
        setCameraError("Camera permission blocked in browser. Click the lock icon 🔒 next to URL in address bar -> Site Settings -> Allow Camera.");
      } else if (errStr.includes("notfound") || errStr.includes("devicesnotfound") || errStr.includes("no camera")) {
        setCameraError("No webcam / camera hardware detected on this device. Please connect a webcam or scan via barcode scanner input below.");
      } else if (errStr.includes("notreadable") || errStr.includes("in use")) {
        setCameraError("Camera is currently being used by another application (Zoom, Teams, Skype, etc.). Please close other apps using the camera.");
      } else {
        setCameraError("Camera access failed or permission denied. Please allow camera access in browser settings or use barcode input below.");
      }
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrcodeScannerRef.current) {
      try {
        if (html5QrcodeScannerRef.current.isScanning) {
          await html5QrcodeScannerRef.current.stop();
        }
        html5QrcodeScannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping camera:", err);
      } finally {
        html5QrcodeScannerRef.current = null;
      }
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/employees");
      const data = Array.isArray(res.data) ? res.data : (res.data.employees || []);
      setEmployees(data);
      if (data.length > 0 && !idCardEmployeeId) {
        setIdCardEmployeeId(data[0].id);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: selectedYear,
        month: selectedMonth
      });
      if (selectedEmployee) params.append("employee_id", selectedEmployee);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const res = await api.get(`/attendance/dashboard-stats?${params.toString()}`);
      setDashboardStats(res.data);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedEmployee) params.append("employee_id", selectedEmployee);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);

      const res = await api.get(`/attendance/all-records?${params.toString()}`);
      setAttendanceRecords(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching records:", err);
    } finally {
      setLoading(false);
    }
  };

  // Core Barcode / QR Code Processor Function
  const handleScanCode = async (code) => {
    const cleanCode = code ? String(code).trim() : "";
    if (!cleanCode) return;

    // Ignore scanning if locked during popup display or active request
    if (processingLockRef.current) return;

    // Cooldown check (3s window for same code to prevent rapid multi-triggers)
    const now = Date.now();
    if (lastScanRef.current.code === cleanCode && (now - lastScanRef.current.time) < 3000) {
      return;
    }
    lastScanRef.current = { code: cleanCode, time: now };
    processingLockRef.current = true; // Activate scan lock to prevent duplicates

    setIsScanning(true);
    try {
      const res = await api.post("/attendance/scan-barcode", { barcode: cleanCode });
      playBeep(false);
      
      const isCheckOut = res.data.scan_action === "check_out";
      const isAlreadyDone = res.data.scan_action === "already_completed";
      
      const resultObj = {
        success: true,
        message: res.data.message,
        employee: res.data.employee,
        scan_action: res.data.scan_action,
        data: res.data.data
      };

      setScanResult(resultObj);
      setPopupResult(resultObj);
      startPopupAutoCloseTimer();

      showToast(
        isAlreadyDone
          ? `⚠️ ${res.data.message}`
          : isCheckOut
          ? `👋 Check-Out Successful for ${res.data.employee?.full_name}`
          : `✅ Check-In Successful for ${res.data.employee?.full_name}`
      );
      setScannedBarcode("");
      fetchAttendanceRecords();
    } catch (err) {
      playBeep(true);
      const errMsg = err.response?.data?.error || "Invalid QR code / Barcode or employee not found";
      const errObj = {
        success: false,
        message: errMsg
      };
      setScanResult(errObj);
      setPopupResult(errObj);
      startPopupAutoCloseTimer();
      showToast(errMsg, true);
    } finally {
      setIsScanning(false);
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }
  };

  // Text Form Submit
  const handleBarcodeSubmit = async (e) => {
    if (e) e.preventDefault();
    handleScanCode(scannedBarcode);
  };

  // Manual Attendance Submit
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.employee_id) {
      showToast("Please select an employee", true);
      return;
    }

    try {
      await api.post("/attendance/manual-entry", manualForm);
      showToast("Attendance entry saved successfully!");
      setShowManualModal(false);
      fetchAttendanceRecords();
    } catch (err) {
      showToast("Failed to save entry", true);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = attendanceRecords.map(r => ({
      "Date": r.date,
      "Emp ID": r.employee_code || r.employee_id,
      "Employee Name": r.employee_name,
      "Department": r.department,
      "Check-In": r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : "-",
      "Break 1 Start": r.break_1_start ? new Date(r.break_1_start).toLocaleTimeString() : "-",
      "Break 1 End": r.break_1_end ? new Date(r.break_1_end).toLocaleTimeString() : "-",
      "Break 2 Start": r.break_2_start ? new Date(r.break_2_start).toLocaleTimeString() : "-",
      "Break 2 End": r.break_2_end ? new Date(r.break_2_end).toLocaleTimeString() : "-",
      "Total Break Time (mins)": r.total_break_time || 0,
      "Excess Break Time (mins)": r.excess_break_time || 0,
      "Check-Out": r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : "-",
      "Status": r.status?.toUpperCase(),
      "Net Working Hours": r.total_hours || 0,
      "Overtime (Hrs)": r.overtime || 0,
      "Notes": r.notes || ""
    }));

    const filename = `Attendance_Report_${selectedYear}_${selectedMonth}.xlsx`;
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
    XLSX.writeFile(workbook, filename);
    showToast("Excel report exported successfully!");
  };

  // Selected Employee for ID Card Modal
  const currentCardEmp = employees.find(e => String(e.id) === String(idCardEmployeeId)) || employees[0];

  return (
    <div style={styles.container}>
      {/* Top Header Card */}
      <div style={styles.headerCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
          <div>
            <h1 style={styles.pageTitle}>Attendance Module</h1>
            <p style={styles.pageSubtitle}>Manage employee camera barcode scanning, dashboards, records, and reports</p>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={() => setShowIdCardModal(true)} style={styles.idCardButton}>
              <FaIdCard style={{ marginRight: "6px" }} /> Employee ID Cards
            </button>
            <button onClick={handleExportExcel} style={styles.excelButton}>
              <FaFileExcel style={{ marginRight: "6px" }} /> Export Excel
            </button>
            <button onClick={() => window.print()} style={styles.pdfButton}>
              <FaPrint style={{ marginRight: "6px" }} /> Print Report
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={styles.tabsContainer}>
          <button
            style={activeTab === "scanner" ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab("scanner")}
          >
            <FaBarcode style={{ marginRight: "8px" }} /> Barcode & Camera Scanner
          </button>
          <button
            style={activeTab === "dashboard" ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab("dashboard")}
          >
            <FaChartBar style={{ marginRight: "8px" }} /> Dashboard
          </button>
          <button
            style={activeTab === "history" ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab("history")}
          >
            <FaHistory style={{ marginRight: "8px" }} /> Attendance Records
          </button>
          <button
            style={activeTab === "reports" ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab("reports")}
          >
            <FaFileAlt style={{ marginRight: "8px" }} /> Reports
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div style={{ ...styles.toast, backgroundColor: toast.isError ? "#ef4444" : "#10b981" }}>
          {toast.msg}
        </div>
      )}

      {/* ================= TAB 1: BARCODE & CAMERA SCANNER ================= */}
      {activeTab === "scanner" && (
        <div style={styles.contentCard}>
          <div style={{ textAlign: "center", maxWidth: "680px", margin: "0 auto", padding: "10px 0" }}>
            
            {/* Camera Toggle Control */}
            <div style={{ marginBottom: "20px", display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
              {!isCameraActive ? (
                <button
                  onClick={() => setIsCameraActive(true)}
                  style={{
                    backgroundColor: "#0284c7",
                    color: "#fff",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "12px",
                    fontSize: "15px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    boxShadow: "0 4px 15px rgba(2, 132, 199, 0.4)",
                    transition: "all 0.2s ease"
                  }}
                >
                  <FaCamera style={{ marginRight: "8px", fontSize: "18px" }} /> Enable Live Camera Scan
                </button>
              ) : (
                <button
                  onClick={() => setIsCameraActive(false)}
                  style={{
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "12px",
                    fontSize: "15px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    boxShadow: "0 4px 15px rgba(239, 68, 68, 0.4)"
                  }}
                >
                  <FaStopCircle style={{ marginRight: "8px", fontSize: "18px" }} /> Stop Camera Scan
                </button>
              )}
            </div>

            {/* Camera Viewport Container */}
            {isCameraActive && (
              <div style={{
                position: "relative",
                width: "100%",
                maxWidth: "480px",
                margin: "0 auto 25px auto",
                borderRadius: "16px",
                overflow: "hidden",
                border: "3px solid #38bdf8",
                boxShadow: "0 0 25px rgba(56, 189, 248, 0.3)",
                backgroundColor: "#000"
              }}>
                <div id="camera-reader" style={{ width: "100%" }}></div>
                
                {/* Visual Target Frame Overlay */}
                <div style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0, bottom: 0,
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <div style={{
                    width: "220px",
                    height: "220px",
                    border: "2px dashed #38bdf8",
                    borderRadius: "16px",
                    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.4)",
                    position: "relative"
                  }}>
                    <div style={{
                      position: "absolute",
                      top: "50%",
                      left: "5%",
                      right: "5%",
                      height: "2px",
                      backgroundColor: "#ef4444",
                      boxShadow: "0 0 8px #ef4444",
                      animation: "scanLine 2s infinite alternate ease-in-out"
                    }}></div>
                  </div>
                </div>
                
                <div style={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  color: "#38bdf8",
                  padding: "8px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  📷 Position Employee QR Code / ID Card inside box
                </div>
                <div style={{ backgroundColor: "#1e293b", color: "#facc15", padding: "6px", fontSize: "11px" }}>
                  💡 Tip: If scanning from a mobile phone screen, reduce phone brightness to avoid camera glare.
                </div>
              </div>
            )}

            {cameraError && (
              <div style={{ backgroundColor: "#7f1d1d", color: "#f87171", padding: "12px", borderRadius: "10px", marginBottom: "20px", fontSize: "13px" }}>
                ⚠️ {cameraError}
              </div>
            )}

            {!isCameraActive && (
              <div style={styles.scannerIconBox}>
                <FaBarcode style={{ fontSize: "50px", color: "#38bdf8" }} />
              </div>
            )}

            <h2 style={{ fontSize: "22px", color: "#f8fafc", marginBottom: "8px" }}>
              Scan Employee ID Card
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "25px" }}>
              Scan barcode via device camera or automatic handheld scanner for instant <strong>Check-In</strong> / <strong>Check-Out</strong>.
            </p>

            {/* Hardware Reader Input */}
            <form onSubmit={handleBarcodeSubmit} style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
              <input
                ref={barcodeInputRef}
                type="text"
                value={scannedBarcode}
                onChange={(e) => setScannedBarcode(e.target.value)}
                placeholder="Scan or enter Barcode / Employee ID..."
                style={styles.scannerInput}
                autoFocus
              />
              <button type="submit" style={styles.scanButton} disabled={isScanning}>
                {isScanning ? "Processing..." : "Submit"}
              </button>
            </form>

            {/* Scan Confirmation Result Card */}
            {scanResult && (
              <div style={{
                backgroundColor: scanResult.scan_action === "already_completed" ? "#854d0e" : scanResult.success ? "#064e3b" : "#7f1d1d",
                border: `2px solid ${scanResult.scan_action === "already_completed" ? "#eab308" : scanResult.success ? "#10b981" : "#ef4444"}`,
                borderRadius: "16px",
                padding: "24px",
                textAlign: "left",
                boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
                  {scanResult.success ? (
                    <FaCheckCircle style={{ fontSize: "36px", color: scanResult.scan_action === "already_completed" ? "#fde047" : "#34d399" }} />
                  ) : (
                    <FaTimesCircle style={{ fontSize: "36px", color: "#f87171" }} />
                  )}
                  <div>
                    <h3 style={{ fontSize: "20px", color: "#fff", margin: 0, fontWeight: "bold" }}>
                      {scanResult.scan_action === "check_in" && "✅ Check-In Successful"}
                      {scanResult.scan_action === "check_out" && "👋 Check-Out Successful"}
                      {scanResult.scan_action === "already_completed" && "⚠️ Attendance Completed Today"}
                      {!scanResult.success && "Scan Error"}
                    </h3>
                    <div style={{ fontSize: "14px", color: "#e2e8f0", marginTop: "4px" }}>{scanResult.message}</div>
                  </div>
                </div>

                {scanResult.employee && (
                  <div style={{ backgroundColor: "rgba(0,0,0,0.35)", padding: "18px", borderRadius: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "14px", color: "#f8fafc" }}>
                    <div><span style={{ color: "#94a3b8" }}>Employee Name:</span> <strong style={{ color: "#38bdf8", fontSize: "15px" }}>{scanResult.employee.full_name}</strong></div>
                    <div><span style={{ color: "#94a3b8" }}>Employee ID:</span> <strong>{scanResult.employee.employee_id}</strong></div>
                    <div><span style={{ color: "#94a3b8" }}>Department:</span> <strong>{scanResult.employee.department || "N/A"}</strong></div>
                    <div><span style={{ color: "#94a3b8" }}>Designation:</span> <strong>{scanResult.employee.designation || "N/A"}</strong></div>
                    
                    {scanResult.data?.check_in_time && (
                      <div><span style={{ color: "#94a3b8" }}>Entry Time (Check-In):</span> <strong style={{ color: "#34d399", fontSize: "15px" }}>{new Date(scanResult.data.check_in_time).toLocaleTimeString()}</strong></div>
                    )}
                    {scanResult.data?.check_out_time ? (
                      <div><span style={{ color: "#94a3b8" }}>Exit Time (Check-Out):</span> <strong style={{ color: "#60a5fa", fontSize: "15px" }}>{new Date(scanResult.data.check_out_time).toLocaleTimeString()}</strong></div>
                    ) : (
                      <div><span style={{ color: "#94a3b8" }}>Exit Time:</span> <span style={{ color: "#fbbf24", fontStyle: "italic" }}>Currently On Duty</span></div>
                    )}
                    
                    {scanResult.data?.total_hours > 0 && (
                      <div style={{ gridColumn: "span 2", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "8px", marginTop: "4px" }}>
                        <span style={{ color: "#94a3b8" }}>Total Working Hours:</span> <strong style={{ color: "#f472b6", fontSize: "16px" }}>{scanResult.data.total_hours} Hours</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: DASHBOARD ================= */}
      {activeTab === "dashboard" && (
        <div>
          {/* Filters Bar */}
          <div style={styles.filterCard}>
            <div style={styles.filterGrid}>
              <div>
                <label style={styles.filterLabel}>Employee</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.filterLabel}>Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  style={styles.filterSelect}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleString("default", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.filterLabel}>Year</label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={styles.filterSelect}
                />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div style={styles.statsGrid}>
            <div style={{ ...styles.statCard, borderLeft: "5px solid #3b82f6" }}>
              <div style={styles.statTitle}>Total Working Days</div>
              <div style={styles.statValue}>{dashboardStats.total_working_days}</div>
              <div style={styles.statDesc}>Recorded working entries</div>
            </div>

            <div style={{ ...styles.statCard, borderLeft: "5px solid #10b981" }}>
              <div style={styles.statTitle}>Present Days</div>
              <div style={{ ...styles.statValue, color: "#10b981" }}>{dashboardStats.present_days}</div>
              <div style={styles.statDesc}>Full present attendance</div>
            </div>

            <div style={{ ...styles.statCard, borderLeft: "5px solid #ef4444" }}>
              <div style={styles.statTitle}>Absent Days</div>
              <div style={{ ...styles.statValue, color: "#ef4444" }}>{dashboardStats.absent_days}</div>
              <div style={styles.statDesc}>Unexcused absentees</div>
            </div>

            <div style={{ ...styles.statCard, borderLeft: "5px solid #8b5cf6" }}>
              <div style={styles.statTitle}>Paid Leave (PL)</div>
              <div style={{ ...styles.statValue, color: "#8b5cf6" }}>{dashboardStats.paid_leave}</div>
              <div style={styles.statDesc}>Approved paid leave</div>
            </div>

            <div style={{ ...styles.statCard, borderLeft: "5px solid #f59e0b" }}>
              <div style={styles.statTitle}>Half Days</div>
              <div style={{ ...styles.statValue, color: "#f59e0b" }}>{dashboardStats.half_days}</div>
              <div style={styles.statDesc}>Half day shifts</div>
            </div>

            <div style={{ ...styles.statCard, borderLeft: "5px solid #06b6d4" }}>
              <div style={styles.statTitle}>Permissions</div>
              <div style={{ ...styles.statValue, color: "#06b6d4" }}>{dashboardStats.permissions}</div>
              <div style={styles.statDesc}>Approved permissions</div>
            </div>

            <div style={{ ...styles.statCard, borderLeft: "5px solid #ec4899" }}>
              <div style={styles.statTitle}>Late Entries</div>
              <div style={{ ...styles.statValue, color: "#ec4899" }}>{dashboardStats.late_entries}</div>
              <div style={styles.statDesc}>Late check-ins</div>
            </div>

            <div style={{ ...styles.statCard, borderLeft: "5px solid #eab308" }}>
              <div style={styles.statTitle}>Total Working Hours</div>
              <div style={{ ...styles.statValue, color: "#eab308" }}>{dashboardStats.total_hours || 0} hrs</div>
              <div style={styles.statDesc}>Accumulated duty hours</div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: ATTENDANCE RECORDS ================= */}
      {activeTab === "history" && (
        <div style={styles.contentCard}>
          {/* Controls Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Search Employee / ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={styles.filterSelectSmall}
              >
                <option value="all">All Statuses</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="paid_leave">Paid Leave (PL)</option>
                <option value="half_day">Half Day</option>
                <option value="permission">Permission</option>
                <option value="late">Late</option>
              </select>
            </div>

            <button onClick={() => setShowManualModal(true)} style={styles.primaryButton}>
              <FaPlusCircle style={{ marginRight: "6px" }} /> Add / Override Entry
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Emp ID</th>
                  <th style={styles.th}>Employee Name</th>
                  <th style={styles.th}>Check-In</th>
                  <th style={styles.th}>Break 1</th>
                  <th style={styles.th}>Break 2</th>
                  <th style={styles.th}>Total Break</th>
                  <th style={styles.th}>Excess Break</th>
                  <th style={styles.th}>Check-Out</th>
                  <th style={styles.th}>Net Hours</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                      Loading attendance history...
                    </td>
                  </tr>
                ) : attendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                      No attendance records found matching filters.
                    </td>
                  </tr>
                ) : (
                  attendanceRecords.map((r) => (
                    <tr key={r.id} style={styles.tableRow}>
                      <td style={styles.td}><strong>{r.date}</strong></td>
                      <td style={styles.td}>{r.employee_code || r.employee_id}</td>
                      <td style={styles.td}><strong style={{ color: "#f8fafc" }}>{r.employee_name}</strong></td>
                      <td style={styles.td}>{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : "-"}</td>
                      <td style={styles.td}>
                        {r.break_1_start ? (
                          <span style={{ fontSize: "11px", color: "#22d3ee" }}>
                            {new Date(r.break_1_start).toLocaleTimeString()}
                            {r.break_1_end ? ` - ${new Date(r.break_1_end).toLocaleTimeString()}` : ""}
                          </span>
                        ) : "-"}
                      </td>
                      <td style={styles.td}>
                        {r.break_2_start ? (
                          <span style={{ fontSize: "11px", color: "#c084fc" }}>
                            {new Date(r.break_2_start).toLocaleTimeString()}
                            {r.break_2_end ? ` - ${new Date(r.break_2_end).toLocaleTimeString()}` : ""}
                          </span>
                        ) : "-"}
                      </td>
                      <td style={styles.td}>{r.total_break_time ? `${r.total_break_time} mins` : "-"}</td>
                      <td style={styles.td}>
                        {r.excess_break_time > 0 ? (
                          <strong style={{ color: "#ef4444" }}>{r.excess_break_time} mins</strong>
                        ) : "-"}
                      </td>
                      <td style={styles.td}>{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : "-"}</td>
                      <td style={styles.td}><strong>{r.total_hours ? `${r.total_hours} hrs` : "-"}</strong></td>
                      <td style={styles.td}>
                        <span style={getStatusBadgeStyle(r.status)}>
                          {r.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: REPORTS & EXPORTS ================= */}
      {activeTab === "reports" && (
        <div style={styles.contentCard}>
          <div style={{ display: "flex", gap: "15px", marginBottom: "25px", flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <label style={styles.filterLabel}>Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                style={styles.filterSelectSmall}
              >
                <option value="daily">Daily Attendance Report</option>
                <option value="monthly">Monthly Attendance Summary</option>
                <option value="employee">Employee-wise Attendance Report</option>
              </select>
            </div>

            <button onClick={handleExportExcel} style={styles.excelButton}>
              <FaFileExcel style={{ marginRight: "6px" }} /> Export Excel (.xlsx)
            </button>
            <button onClick={() => window.print()} style={styles.pdfButton}>
              <FaPrint style={{ marginRight: "6px" }} /> Print Report / Save PDF
            </button>
          </div>

          <div style={{ backgroundColor: "#0f172a", padding: "20px", borderRadius: "12px", border: "1px solid #334155" }}>
            <h3 style={{ fontSize: "18px", color: "#f8fafc", marginBottom: "15px" }}>
              {reportType === "daily" && "Daily Attendance Report"}
              {reportType === "monthly" && `Monthly Attendance Summary (${selectedYear}-${selectedMonth})`}
              {reportType === "employee" && "Employee-wise Attendance Report"}
            </h3>

            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Emp ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Check-In</th>
                  <th style={styles.th}>Check-Out</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((r) => (
                  <tr key={r.id} style={styles.tableRow}>
                    <td style={styles.td}>{r.date}</td>
                    <td style={styles.td}>{r.employee_code}</td>
                    <td style={styles.td}>{r.employee_name}</td>
                    <td style={styles.td}>{r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : "-"}</td>
                    <td style={styles.td}>{r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : "-"}</td>
                    <td style={styles.td}><span style={getStatusBadgeStyle(r.status)}>{r.status?.toUpperCase()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div style={styles.modalOverlay} onClick={() => setShowManualModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ color: "#fff", margin: 0 }}>Add / Override Attendance Entry</h3>
              <button onClick={() => setShowManualModal(false)} style={styles.modalClose}>×</button>
            </div>
            <form onSubmit={handleManualSubmit} style={{ padding: "20px" }}>
              <div style={{ marginBottom: "15px" }}>
                <label style={styles.filterLabel}>Select Employee</label>
                <select
                  value={manualForm.employee_id}
                  onChange={(e) => setManualForm({ ...manualForm, employee_id: e.target.value })}
                  style={styles.filterSelect}
                  required
                >
                  <option value="">Choose Employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_id})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={styles.filterLabel}>Date</label>
                <input
                  type="date"
                  value={manualForm.date}
                  onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                  style={styles.filterSelect}
                  required
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={styles.filterLabel}>Attendance Status</label>
                <select
                  value={manualForm.status}
                  onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                  style={styles.filterSelect}
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="paid_leave">Paid Leave (PL)</option>
                  <option value="half_day">Half Day</option>
                  <option value="permission">Permission</option>
                  <option value="late">Late Entry</option>
                </select>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={styles.filterLabel}>Overtime Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={manualForm.overtime}
                  onChange={(e) => setManualForm({ ...manualForm, overtime: Number(e.target.value) })}
                  style={styles.filterSelect}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={styles.filterLabel}>Notes / Reason</label>
                <textarea
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  style={{ ...styles.filterSelect, height: "60px" }}
                  placeholder="Optional details..."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setShowManualModal(false)} style={styles.secondaryButton}>
                  Cancel
                </button>
                <button type="submit" style={styles.primaryButton}>
                  Save Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real-time Scan Result Popup Modal */}
      {popupResult && (
        <div style={styles.modalOverlay} onClick={closePopupAndResetScanner}>
          <div 
            style={{
              ...styles.modalContent,
              maxWidth: "500px",
              border: `3px solid ${
                popupResult.scan_action === "check_out" ? "#3b82f6" :
                popupResult.scan_action?.startsWith("break") ? "#06b6d4" :
                popupResult.scan_action === "already_completed" ? "#eab308" :
                popupResult.success ? "#10b981" : "#ef4444"
              }`,
              boxShadow: `0 20px 50px ${
                popupResult.scan_action === "check_out" ? "rgba(59, 130, 246, 0.4)" :
                popupResult.scan_action?.startsWith("break") ? "rgba(6, 182, 212, 0.4)" :
                popupResult.scan_action === "already_completed" ? "rgba(234, 179, 8, 0.4)" :
                popupResult.success ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"
              }`
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              backgroundColor: popupResult.scan_action === "check_out" ? "#1e3a8a" :
                popupResult.scan_action?.startsWith("break") ? "#164e63" :
                popupResult.scan_action === "already_completed" ? "#713f12" :
                popupResult.success ? "#064e3b" : "#7f1d1d",
              padding: "24px 24px 18px 24px",
              textAlign: "center",
              borderBottom: "1px solid rgba(255,255,255,0.1)"
            }}>
              <div style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                backgroundColor: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px auto"
              }}>
                {popupResult.success ? (
                  <FaCheckCircle style={{ fontSize: "40px", color: popupResult.scan_action === "already_completed" ? "#fde047" : "#34d399" }} />
                ) : (
                  <FaTimesCircle style={{ fontSize: "40px", color: "#f87171" }} />
                )}
              </div>
              <h2 style={{ color: "#fff", margin: 0, fontSize: "24px", fontWeight: "bold" }}>
                {popupResult.scan_action === "check_in" && "✓ Check-In Successful"}
                {popupResult.scan_action === "break_1_start" && "☕ Break 1 Started"}
                {popupResult.scan_action === "break_1_end" && "✅ Break 1 Completed"}
                {popupResult.scan_action === "break_2_start" && "☕ Break 2 Started"}
                {popupResult.scan_action === "break_2_end" && "✅ Break 2 Completed"}
                {popupResult.scan_action === "check_out" && "👋 Check-Out Successful"}
                {popupResult.scan_action === "already_completed" && "⚠️ Attendance Completed Today"}
                {!popupResult.success && "❌ Scan Error"}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "14px", marginTop: "6px", marginBottom: 0 }}>
                {popupResult.message}
              </p>
            </div>

            {/* Modal Details Body */}
            {popupResult.employee && (
              <div style={{ padding: "20px 24px" }}>
                <div style={{
                  backgroundColor: "#0f172a",
                  borderRadius: "14px",
                  padding: "18px 20px",
                  border: "1px solid #334155",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1e293b", paddingBottom: "10px" }}>
                    <span style={{ color: "#94a3b8", fontSize: "13px" }}>Employee Name</span>
                    <strong style={{ color: "#38bdf8", fontSize: "16px" }}>{popupResult.employee.full_name}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1e293b", paddingBottom: "10px" }}>
                    <span style={{ color: "#94a3b8", fontSize: "13px" }}>Employee ID</span>
                    <strong style={{ color: "#f8fafc", fontSize: "14px" }}>{popupResult.employee.employee_id}</strong>
                  </div>

                  {/* Check-In Time */}
                  {popupResult.data?.check_in_time && (
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1e293b", paddingBottom: "10px" }}>
                      <span style={{ color: "#94a3b8", fontSize: "13px" }}>Entry Time (Check-In)</span>
                      <strong style={{ color: "#34d399", fontSize: "15px" }}>
                        {popupResult.data?.b1_start_time || popupResult.data?.entry_time || new Date(popupResult.data.check_in_time).toLocaleTimeString()}
                      </strong>
                    </div>
                  )}

                  {/* Break 1 Timings */}
                  {popupResult.data?.break_1_start && (
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1e293b", paddingBottom: "10px" }}>
                      <span style={{ color: "#94a3b8", fontSize: "13px" }}>Break 1 Time</span>
                      <strong style={{ color: "#22d3ee", fontSize: "14px" }}>
                        {new Date(popupResult.data.break_1_start).toLocaleTimeString()}
                        {popupResult.data?.break_1_end ? ` - ${new Date(popupResult.data.break_1_end).toLocaleTimeString()}` : " (Active)"}
                      </strong>
                    </div>
                  )}

                  {/* Break 2 Timings */}
                  {popupResult.data?.break_2_start && (
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1e293b", paddingBottom: "10px" }}>
                      <span style={{ color: "#94a3b8", fontSize: "13px" }}>Break 2 Time</span>
                      <strong style={{ color: "#c084fc", fontSize: "14px" }}>
                        {new Date(popupResult.data.break_2_start).toLocaleTimeString()}
                        {popupResult.data?.break_2_end ? ` - ${new Date(popupResult.data.break_2_end).toLocaleTimeString()}` : " (Active)"}
                      </strong>
                    </div>
                  )}

                  {/* Total & Excess Break Metrics */}
                  {popupResult.data?.total_break_time > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#1e293b", padding: "10px 14px", borderRadius: "8px" }}>
                      <span style={{ color: "#94a3b8", fontSize: "13px" }}>Total Break Time</span>
                      <strong style={{ color: "#facc15", fontSize: "15px" }}>{popupResult.data.total_break_time} Mins</strong>
                    </div>
                  )}

                  {popupResult.data?.excess_break_time > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#311b1b", padding: "10px 14px", borderRadius: "8px", border: "1px solid #7f1d1d" }}>
                      <span style={{ color: "#f87171", fontSize: "13px", fontWeight: "bold" }}>⚠️ Excess Break Time</span>
                      <strong style={{ color: "#ef4444", fontSize: "15px" }}>{popupResult.data.excess_break_time} Mins</strong>
                    </div>
                  )}

                  {/* Check-Out Details */}
                  {popupResult.scan_action === "check_out" && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1e293b", paddingBottom: "10px" }}>
                        <span style={{ color: "#94a3b8", fontSize: "13px" }}>Exit Time (Check-Out)</span>
                        <strong style={{ color: "#60a5fa", fontSize: "15px" }}>
                          {popupResult.data?.exit_time || new Date(popupResult.data.check_out_time).toLocaleTimeString()}
                        </strong>
                      </div>

                      {popupResult.data?.total_hours > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#1e293b", padding: "12px 16px", borderRadius: "10px", border: "1px solid #38bdf8" }}>
                          <span style={{ color: "#38bdf8", fontSize: "14px", fontWeight: "bold" }}>Net Working Hours</span>
                          <strong style={{ color: "#38bdf8", fontSize: "18px" }}>{popupResult.data.total_hours} Hours</strong>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer / Auto Reset Indicator */}
            <div style={{
              backgroundColor: "#0f172a",
              padding: "16px 24px",
              display: "flex",
              justify: "space-between",
              alignItems: "center",
              borderTop: "1px solid #334155"
            }}>
              <div style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
                <FaSyncAlt style={{ animation: "spin 2s linear infinite" }} />
                Auto-resetting scanner in <strong style={{ color: "#38bdf8" }}>{autoResetCountdown}s</strong>...
              </div>

              <button
                type="button"
                onClick={closePopupAndResetScanner}
                style={{
                  backgroundColor: "#38bdf8",
                  color: "#0f172a",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                Scan Next Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Employee ID Card Generator Modal */}
      {showIdCardModal && (
        <div style={styles.modalOverlay} onClick={() => setShowIdCardModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: "560px", padding: "0" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ backgroundColor: "#0f172a", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FaIdCard style={{ color: "#38bdf8", fontSize: "22px" }} />
                <h3 style={{ color: "#fff", margin: 0, fontSize: "18px" }}>Employee ID Card Generator</h3>
              </div>
              <button onClick={() => setShowIdCardModal(false)} style={styles.modalClose}>×</button>
            </div>

            <div style={{ padding: "20px" }}>
              <div style={{ marginBottom: "20px" }}>
                <label style={styles.filterLabel}>Select Employee</label>
                <select
                  value={idCardEmployeeId}
                  onChange={(e) => setIdCardEmployeeId(e.target.value)}
                  style={styles.filterSelect}
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_id})</option>
                  ))}
                </select>
              </div>

              {/* ID Card Visual Badge */}
              {currentCardEmp && (
                <div id="printable-id-card" style={{
                  width: "340px",
                  height: "225px",
                  margin: "0 auto 20px auto",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                  border: "2px solid #38bdf8",
                  padding: "16px",
                  boxShadow: "0 15px 30px rgba(0,0,0,0.6)",
                  position: "relative",
                  color: "#fff",
                  fontFamily: "system-ui, sans-serif",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}>
                  {/* Company Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", paddingBottom: "8px" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#38bdf8", letterSpacing: "1px" }}>EAZYWORLD</div>
                      <div style={{ fontSize: "9px", color: "#94a3b8" }}>OFFICIAL EMPLOYEE ID CARD</div>
                    </div>
                    <div style={{ backgroundColor: "#0284c7", color: "#fff", fontSize: "9px", fontWeight: "bold", padding: "2px 6px", borderRadius: "4px" }}>
                      STAFF
                    </div>
                  </div>

                  {/* Profile & Info Grid */}
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", margin: "8px 0" }}>
                    <div style={{ width: "60px", height: "60px", borderRadius: "50%", backgroundColor: "#334155", border: "2px solid #38bdf8", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                      {currentCardEmp.avatar ? (
                        <img src={currentCardEmp.avatar} alt="Employee" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <FaUserTie style={{ fontSize: "32px", color: "#94a3b8" }} />
                      )}
                    </div>

                    <div style={{ fontSize: "11px", flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#f8fafc", marginBottom: "2px" }}>{currentCardEmp.full_name}</div>
                      <div style={{ color: "#38bdf8", fontWeight: "bold", marginBottom: "2px" }}>ID: {currentCardEmp.employee_id}</div>
                      <div style={{ color: "#cbd5e1" }}>Dept: {currentCardEmp.department || "General"}</div>
                    </div>

                    {/* High Definition QR Code */}
                    <div style={{ backgroundColor: "#ffffff", padding: "4px", borderRadius: "6px", flexShrink: 0 }}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=55x55&data=${encodeURIComponent(currentCardEmp.employee_id || currentCardEmp.id)}`}
                        alt="QR Code" 
                        style={{ width: "50px", height: "50px", display: "block" }}
                      />
                    </div>
                  </div>

                  {/* Barcode Footer */}
                  <div style={{ backgroundColor: "#ffffff", padding: "5px 8px", borderRadius: "6px", textAlign: "center" }}>
                    <img 
                      src={`https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(currentCardEmp.employee_id || currentCardEmp.id)}&scale=2&height=10&alttext=0`}
                      alt="Barcode" 
                      style={{ height: "22px", maxWidth: "100%", display: "block", margin: "0 auto" }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <div style={{ fontSize: "9px", color: "#000", fontWeight: "bold", letterSpacing: "2px", marginTop: "1px" }}>
                      *{currentCardEmp.employee_id || currentCardEmp.id}*
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "15px" }}>
                <button type="button" onClick={() => setShowIdCardModal(false)} style={styles.secondaryButton}>
                  Close
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const printContent = document.getElementById("printable-id-card").outerHTML;
                    const win = window.open("", "_blank");
                    win.document.write(`
                      <html>
                        <head>
                          <title>Employee ID Card - ${currentCardEmp?.full_name}</title>
                          <style>
                            body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fff; }
                            @media print { body { background: none; } }
                          </style>
                        </head>
                        <body>
                          ${printContent}
                          <script>window.onload = function() { window.print(); window.close(); }</script>
                        </body>
                      </html>
                    `);
                    win.document.close();
                  }} 
                  style={styles.primaryButton}
                >
                  <FaPrint style={{ marginRight: "6px" }} /> Print ID Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
const getStatusBadgeStyle = (status) => {
  const base = { padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", display: "inline-block" };
  switch (status) {
    case "present": return { ...base, backgroundColor: "#064e3b", color: "#34d399" };
    case "absent": return { ...base, backgroundColor: "#7f1d1d", color: "#f87171" };
    case "paid_leave": case "pl": return { ...base, backgroundColor: "#4c1d95", color: "#c084fc" };
    case "half_day": return { ...base, backgroundColor: "#78350f", color: "#fbbf24" };
    case "permission": return { ...base, backgroundColor: "#164e63", color: "#22d3ee" };
    case "late": return { ...base, backgroundColor: "#831843", color: "#f472b6" };
    default: return { ...base, backgroundColor: "#334155", color: "#94a3b8" };
  }
};

const styles = {
  container: {
    padding: "20px",
    backgroundColor: "#0f172a",
    minHeight: "100vh",
    fontFamily: "system-ui, -apple-system, sans-serif"
  },
  headerCard: {
    backgroundColor: "#1e293b",
    padding: "24px",
    borderRadius: "16px",
    marginBottom: "20px",
    border: "1px solid #334155",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)"
  },
  pageTitle: {
    fontSize: "26px",
    fontWeight: "bold",
    color: "#f8fafc",
    margin: 0
  },
  pageSubtitle: {
    fontSize: "14px",
    color: "#94a3b8",
    marginTop: "4px",
    margin: 0
  },
  idCardButton: {
    backgroundColor: "#8b5cf6",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "10px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center"
  },
  excelButton: {
    backgroundColor: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "10px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center"
  },
  pdfButton: {
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "10px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center"
  },
  tabsContainer: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
    borderTop: "1px solid #334155",
    paddingTop: "15px",
    flexWrap: "wrap"
  },
  tab: {
    backgroundColor: "transparent",
    color: "#94a3b8",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center"
  },
  activeTab: {
    backgroundColor: "#0284c7",
    color: "#ffffff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center"
  },
  contentCard: {
    backgroundColor: "#1e293b",
    padding: "24px",
    borderRadius: "16px",
    border: "1px solid #334155",
    marginBottom: "20px"
  },
  scannerIconBox: {
    width: "90px",
    height: "90px",
    borderRadius: "50%",
    backgroundColor: "#0f172a",
    border: "2px solid #38bdf8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px auto",
    boxShadow: "0 0 20px rgba(56, 189, 248, 0.2)"
  },
  scannerInput: {
    flex: 1,
    backgroundColor: "#0f172a",
    border: "2px solid #38bdf8",
    borderRadius: "12px",
    padding: "14px 18px",
    color: "#f8fafc",
    fontSize: "16px",
    outline: "none"
  },
  scanButton: {
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    border: "none",
    padding: "14px 28px",
    borderRadius: "12px",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer"
  },
  filterCard: {
    backgroundColor: "#1e293b",
    padding: "20px",
    borderRadius: "16px",
    marginBottom: "20px",
    border: "1px solid #334155"
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px"
  },
  filterLabel: {
    display: "block",
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: "600",
    marginBottom: "6px",
    textTransform: "uppercase"
  },
  filterSelect: {
    width: "100%",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "14px",
    outline: "none"
  },
  filterSelectSmall: {
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "13px",
    outline: "none"
  },
  searchInput: {
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "8px 14px",
    fontSize: "13px",
    outline: "none",
    width: "220px"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "15px",
    marginBottom: "20px"
  },
  statCard: {
    backgroundColor: "#1e293b",
    padding: "20px",
    borderRadius: "14px",
    border: "1px solid #334155"
  },
  statTitle: {
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: "600",
    textTransform: "uppercase"
  },
  statValue: {
    fontSize: "24px",
    fontWeight: "bold",
    margin: "8px 0 4px 0",
    color: "#f8fafc"
  },
  statDesc: {
    color: "#64748b",
    fontSize: "12px"
  },
  primaryButton: {
    padding: "9px 18px",
    borderRadius: "8px",
    backgroundColor: "#38bdf8",
    color: "#0f172a",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "13px"
  },
  secondaryButton: {
    padding: "9px 18px",
    borderRadius: "8px",
    backgroundColor: "#334155",
    color: "#f8fafc",
    border: "none",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "13px"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  tableHeaderRow: {
    backgroundColor: "#0f172a",
    borderBottom: "2px solid #334155"
  },
  th: {
    padding: "12px 14px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "bold",
    color: "#94a3b8",
    textTransform: "uppercase"
  },
  tableRow: {
    borderBottom: "1px solid #334155"
  },
  td: {
    padding: "12px 14px",
    fontSize: "13px",
    color: "#cbd5e1"
  },
  toast: {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    padding: "14px 24px",
    borderRadius: "10px",
    color: "#fff",
    fontWeight: "bold",
    boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
    zIndex: 1100
  },
  modalOverlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderRadius: "16px",
    width: "90%",
    maxWidth: "500px",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    border: "1px solid #334155"
  },
  modalHeader: {
    padding: "18px 24px",
    backgroundColor: "#0f172a",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #334155"
  },
  modalClose: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "24px",
    cursor: "pointer"
  }
};