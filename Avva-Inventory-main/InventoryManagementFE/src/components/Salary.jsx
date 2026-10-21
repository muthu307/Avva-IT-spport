import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  FaFileInvoiceDollar,
  FaCalculator,
  FaUserCog,
  FaSearch,
  FaEdit,
  FaCheckCircle,
  FaClock,
  FaPrint,
  FaUser,
  FaTimes,
  FaShieldAlt,
  FaLock,
  FaRegFileAlt,
  FaChartPie,
  FaUniversity,
  FaMobileAlt,
  FaMoneyCheckAlt,
  FaMoneyBillAlt,
  FaCreditCard,
  FaBell,
  FaCheckDouble,
  FaExclamationCircle,
  FaArrowUp,
  FaReceipt,
  FaInfoCircle,
  FaSyncAlt,
  FaCoins,
  FaBuilding,
  FaWallet,
  FaHistory,
  FaChartLine,
  FaFileAlt,
  FaMoneyBillWave
} from 'react-icons/fa';

const Salary = () => {
  const API_BASE_URL = 'http://localhost:5000/api';

  // Logged-in user context
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userType = currentUser?.user_type || currentUser?.role || '';
  const isAdmin = userType.toLowerCase() === 'admin' || currentUser?.email === 'admin@m3cars.com';

  const [activeTab, setActiveTab] = useState('payroll'); // 'payroll' | 'report' | 'history' | 'structures'
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Data states
  const [employees, setEmployees] = useState([]);
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [myStructure, setMyStructure] = useState(null);

  // Report & History states
  const [reportData, setReportData] = useState({});
  const [selectedHistoryEmp, setSelectedHistoryEmp] = useState('');
  const [historyPayrolls, setHistoryPayrolls] = useState([]);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [structureFormData, setStructureFormData] = useState({
    employee_id: '',
    base_salary: 0,
    hra: 0,
    transport_allowance: 0,
    medical_allowance: 0,
    special_allowance: 0,
    pf_deduction: 0,
    esi_deduction: 0,
    tds_deduction: 0,
    other_deductions: 0
  });

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [genWorkingDays, setGenWorkingDays] = useState(26);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payrollToPay, setPayrollToPay] = useState(null);
  const [payFormData, setPayFormData] = useState({
    payment_mode: 'Bank Transfer',
    transaction_ref: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [payslipData, setPayslipData] = useState(null);

  const showToastMsg = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      const userEmail = currentUser?.email?.toLowerCase() || '';
      const userName = currentUser?.username?.toLowerCase() || currentUser?.name?.toLowerCase() || '';

      let matched = employees.find(
        (e) =>
          (userEmail && e.email?.toLowerCase() === userEmail) ||
          (e.employee_id && e.employee_id === currentUser?.employee_id) ||
          e.id === currentUser?.id ||
          (userName && e.full_name?.toLowerCase().includes(userName))
      );

      if (!isAdmin && !matched && employees.length > 0) {
        matched = employees[0];
      }

      if (matched) {
        setCurrentEmployee(matched);
        fetchMySalaryStructure(matched.id);
      }

      if (isAdmin) {
        fetchSalaryStructures();
        fetchPayrolls();
        fetchReportSummary();
        if (employees.length > 0 && !selectedHistoryEmp) {
          setSelectedHistoryEmp(employees[0].id);
          fetchEmployeeHistory(employees[0].id);
        }
      } else if (matched) {
        fetchPayrolls(matched.id);
      }
    }
  }, [employees, selectedMonth, selectedYear, statusFilter, isAdmin]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      if (res.status === 200) setEmployees(res.data);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchSalaryStructures = async () => {
    try {
      setLoading(true);
      const res = await api.get('/salary/structures');
      if (res.status === 200) setSalaryStructures(res.data);
    } catch (err) {
      console.error('Error fetching salary structures:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMySalaryStructure = async (employeeId) => {
    try {
      const res = await api.get(`/salary/structure/${employeeId}`);
      if (res.status === 200) setMyStructure(res.data);
    } catch (err) {
      console.error('Error fetching employee structure:', err);
    }
  };

  const fetchPayrolls = async (empIdFilter = null) => {
    try {
      setLoading(true);
      let url = `${API_BASE_URL}/salary/payroll?month=${selectedMonth}&year=${selectedYear}`;

      const targetEmpId = empIdFilter || (!isAdmin && currentEmployee ? currentEmployee.id : null);
      if (targetEmpId) {
        url += `&employee_id=${targetEmpId}`;
      }
      if (statusFilter !== 'All') {
        url += `&status=${statusFilter}`;
      }
      if (searchTerm && isAdmin) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      const res = await api.get(url);
      if (res.status === 200) setPayrolls(res.data);
    } catch (err) {
      console.error('Error fetching payrolls:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportSummary = async () => {
    try {
      const res = await api.get(`/salary/report/summary?month=${selectedMonth}&year=${selectedYear}`);
      if (res.status === 200) setReportData(res.data);
    } catch (err) {
      console.error('Error fetching report summary:', err);
    }
  };

  const fetchEmployeeHistory = async (empId) => {
    if (!empId) return;
    try {
      setLoading(true);
      const res = await api.get(`/salary/payroll?employee_id=${empId}`);
      if (res.status === 200) setHistoryPayrolls(res.data);
    } catch (err) {
      console.error('Error fetching employee history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEmployeeInModal = (empId) => {
    const numericEmpId = Number(empId);
    const existing = salaryStructures.find(s => s.employee_id === numericEmpId);
    if (existing) {
      setStructureFormData({
        employee_id: numericEmpId,
        base_salary: existing.base_salary || 0,
        hra: existing.hra || 0,
        transport_allowance: existing.transport_allowance || 0,
        medical_allowance: existing.medical_allowance || 0,
        special_allowance: existing.special_allowance || 0,
        pf_deduction: existing.pf_deduction || 0,
        esi_deduction: existing.esi_deduction || 0,
        tds_deduction: existing.tds_deduction || 0,
        other_deductions: existing.other_deductions || 0
      });
    } else {
      setStructureFormData({
        employee_id: numericEmpId || '',
        base_salary: 0,
        hra: 0,
        transport_allowance: 0,
        medical_allowance: 0,
        special_allowance: 0,
        pf_deduction: 0,
        esi_deduction: 0,
        tds_deduction: 0,
        other_deductions: 0
      });
    }
  };

  const handleOpenStructureModal = (struct) => {
    const empId = struct?.employee_id || struct?.id || (employees.length > 0 ? employees[0].id : '');
    handleSelectEmployeeInModal(empId);
    setShowStructureModal(true);
  };

  const handleSaveStructure = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/salary/structure', structureFormData);
      if (res.status === 200 || res.status === 201) {
        showToastMsg('Salary structure saved successfully!');
        setShowStructureModal(false);
        fetchSalaryStructures();
      } else {
        showToastMsg(res.data?.error || 'Failed to save salary structure', 'error');
      }
    } catch (err) {
      showToastMsg('Error connecting to server', 'error');
    }
  };

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.post('/salary/payroll/generate', { month: genMonth, year: genYear, total_working_days: genWorkingDays });
      if (res.status === 200 || res.status === 201) {
        showToastMsg(res.data?.message || 'Payroll generated successfully!');
        setShowGenerateModal(false);
        setSelectedMonth(genMonth);
        setSelectedYear(genYear);
        fetchPayrolls();
        fetchReportSummary();
      } else {
        showToastMsg(res.data?.error || 'Failed to generate payroll', 'error');
      }
    } catch (err) {
      showToastMsg('Error generating payroll', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayModal = (payroll) => {
    setPayrollToPay(payroll);
    setPayFormData({
      payment_mode: 'Bank Transfer',
      transaction_ref: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowPayModal(true);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!payrollToPay) return;
    try {
      const res = await api.post(`/salary/payroll/${payrollToPay.id}/pay`, payFormData);
      if (res.status === 200 || res.status === 201) {
        showToastMsg(`Disbursed ₹${payrollToPay.net_payable.toLocaleString()} & sent notification to employee!`);
        setShowPayModal(false);
        fetchPayrolls();
        fetchReportSummary();
      } else {
        showToastMsg(res.data?.error || 'Failed to process payment', 'error');
      }
    } catch (err) {
      showToastMsg('Error processing payment', 'error');
    }
  };

  const handleDismissNotification = async (payrollId) => {
    try {
      const res = await api.post(`/salary/payroll/${payrollId}/read-notification`);
      if (res.status === 200 || res.status === 201) {
        showToastMsg('Notification acknowledged');
        fetchPayrolls(currentEmployee?.id);
      }
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleResetPayment = async (payrollId) => {
    if (!window.confirm('Reset this salary disbursal status back to Pending?')) return;
    try {
      const res = await api.put(`/salary/payroll/${payrollId}`, { payment_status: 'Pending' });
      if (res.status === 200 || res.status === 201) {
        showToastMsg('Salary status reset to Pending!');
        fetchPayrolls();
        fetchReportSummary();
      } else {
        showToastMsg('Failed to reset status', 'error');
      }
    } catch (err) {
      showToastMsg('Error resetting payment status', 'error');
    }
  };

  const handleViewPayslip = async (payrollId) => {
    try {
      const res = await api.get(`/salary/payroll/${payrollId}/slip`);
      if (res.status === 200) {
        setPayslipData(res.data);
        setShowPayslipModal(true);
      } else {
        showToastMsg('Failed to load payslip data', 'error');
      }
    } catch (err) {
      showToastMsg('Error loading payslip', 'error');
    }
  };

  const totalNetPayable = payrolls.reduce((sum, p) => sum + (p.net_payable || 0), 0);
  const totalPaid = payrolls.filter(p => p.payment_status === 'Paid').reduce((sum, p) => sum + (p.net_payable || 0), 0);
  const totalPending = payrolls.filter(p => p.payment_status === 'Pending').reduce((sum, p) => sum + (p.net_payable || 0), 0);

  const unreadNotifications = payrolls.filter(p => p.notification_sent && !p.notification_read);

  const historyEmpObject = employees.find(e => e.id === Number(selectedHistoryEmp));
  const historyTotalEarned = historyPayrolls.reduce((sum, p) => sum + (p.net_payable || 0), 0);

  const monthsList = [
    { id: 1, name: 'January' },
    { id: 2, name: 'February' },
    { id: 3, name: 'March' },
    { id: 4, name: 'April' },
    { id: 5, name: 'May' },
    { id: 6, name: 'June' },
    { id: 7, name: 'July' },
    { id: 8, name: 'August' },
    { id: 9, name: 'September' },
    { id: 10, name: 'October' },
    { id: 11, name: 'November' },
    { id: 12, name: 'December' }
  ];

  const paymentModes = [
    { id: 'Bank Transfer', name: 'Direct Bank Transfer (NEFT / RTGS)', icon: <FaUniversity /> },
    { id: 'UPI', name: 'UPI (GPay / PhonePe / Paytm)', icon: <FaMobileAlt /> },
    { id: 'Cheque', name: 'Cheque Payment', icon: <FaMoneyCheckAlt /> },
    { id: 'Cash', name: 'Cash Disbursal', icon: <FaMoneyBillAlt /> },
    { id: 'Corporate Transfer', name: 'Corporate Account Transfer', icon: <FaCreditCard /> }
  ];

  return (
    <div style={{ color: '#f8fafc', paddingBottom: '50px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Dynamic Global Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.25); }
          50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.6); }
          100% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.25); }
        }
        .glass-card {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.7) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-card:hover {
          border-color: rgba(56, 189, 248, 0.35);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
        }
        .gradient-btn-primary {
          background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
          transition: all 0.2s ease;
        }
        .gradient-btn-primary:hover {
          filter: brightness(1.15);
          box-shadow: 0 6px 22px rgba(56, 189, 248, 0.5);
          transform: translateY(-1px);
        }
        .gradient-btn-emerald {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
          transition: all 0.2s ease;
        }
        .gradient-btn-emerald:hover {
          filter: brightness(1.15);
          box-shadow: 0 6px 22px rgba(16, 185, 129, 0.55);
          transform: translateY(-1px);
        }
        .pay-mode-card {
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid #334155;
          padding: 14px 18px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .pay-mode-card:hover {
          border-color: #38bdf8;
          background: rgba(30, 41, 59, 0.9);
        }
        .pay-mode-card.selected {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.25);
        }
        .table-row-hover {
          transition: background-color 0.2s ease;
        }
        .table-row-hover:hover {
          background-color: rgba(51, 65, 85, 0.45) !important;
        }
        @media print {
          body * { visibility: hidden !important; }
          header, nav, .sidebar, .sidebar *, header *, .no-print { display: none !important; visibility: hidden !important; height: 0 !important; margin: 0 !important; padding: 0 !important; }
          #printable-payslip, #printable-payslip *, #printable-report, #printable-report * { visibility: visible !important; }
          #printable-payslip, #printable-report { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; }
        }
      `}</style>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            background: toast.type === 'error' ? 'linear-gradient(135deg, #ef4444, #991b1b)' : 'linear-gradient(135deg, #10b981, #047857)',
            color: '#fff',
            padding: '14px 22px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          {toast.type === 'error' ? <FaExclamationCircle /> : <FaCheckCircle />}
          {toast.message}
        </div>
      )}

      {/* TOP HEADER & ACTION BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
            <div style={{ background: 'linear-gradient(135deg, #38bdf8, #2563eb)', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#fff', boxShadow: '0 4px 16px rgba(56, 189, 248, 0.4)' }}>
              <FaMoneyBillWave />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px', background: 'linear-gradient(90deg, #ffffff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Salary & Payroll Portal
            </h1>
            <span style={{ background: isAdmin ? 'rgba(56, 189, 248, 0.15)' : 'rgba(168, 85, 247, 0.15)', color: isAdmin ? '#38bdf8' : '#c084fc', border: `1px solid ${isAdmin ? 'rgba(56, 189, 248, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isAdmin ? 'Admin Dashboard' : 'Employee Self-Service'}
            </span>
          </div>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>
            {isAdmin ? 'Manage employee salary structures, process monthly payrolls, view analytics reports, and history.' : 'View your assigned salary package, personal monthly payslips, and credit alerts.'}
          </p>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (employees.length > 0) {
                  handleOpenStructureModal({ employee_id: employees[0].id });
                }
              }}
              style={{ background: '#1e293b', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '11px 18px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
            >
              <FaUserCog /> Configure Salary Package
            </button>

            <button
              onClick={() => setShowGenerateModal(true)}
              className="gradient-btn-primary"
              style={{ color: '#fff', border: 'none', padding: '11px 22px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FaCalculator /> Generate Monthly Payroll
            </button>
          </div>
        )}
      </div>

      {/* EMPLOYEE PORTAL: ASSIGNED SALARY STRUCTURE CARD AT THE VERY TOP */}
      {!isAdmin && currentEmployee && (
        <div style={{ marginBottom: '28px', animation: 'fadeIn 0.3s ease' }}>
          <div className="glass-card" style={{ padding: '28px', border: '1px solid rgba(16, 185, 129, 0.35)', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))' }}>
            
            {/* Top Header Row of Assigned Structure Card */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}>
                  <FaWallet />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#fff' }}>My Assigned Salary Structure</h3>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                    Employee: <strong style={{ color: '#fff' }}>{currentEmployee.full_name}</strong> | ID: <span style={{ color: '#38bdf8', fontWeight: '600' }}>{currentEmployee.employee_id || `EMP-${currentEmployee.id}`}</span> | Dept: <strong>{currentEmployee.department || 'General'}</strong>
                  </div>
                </div>
              </div>

              {myStructure && (
                <div style={{ textAlign: 'right', background: 'rgba(16, 185, 129, 0.1)', padding: '10px 18px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Monthly Net CTC</div>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#10b981' }}>₹{myStructure.net_salary?.toLocaleString()}</div>
                </div>
              )}
            </div>

            {myStructure ? (
              <div>
                {/* Main Core Figures Row: Base Salary, Total Allowances, Statutory Deductions */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px 20px', borderRadius: '14px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>Base Monthly Salary</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff' }}>₹{myStructure.base_salary?.toLocaleString()}</div>
                  </div>

                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '16px 20px', borderRadius: '14px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>Total Monthly Allowances</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#10b981' }}>+₹{(myStructure.total_allowances ?? ((myStructure.hra || 0) + (myStructure.transport_allowance || 0) + (myStructure.medical_allowance || 0) + (myStructure.special_allowance || 0))).toLocaleString()}</div>
                  </div>

                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '16px 20px', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                    <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>Statutory Deductions (PF/ESI/TDS)</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#ef4444' }}>-₹{myStructure.total_deductions?.toLocaleString()}</div>
                  </div>
                </div>

                {/* SEPARATE ALLOWANCES BREAKDOWN SECTION */}
                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '20px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FaCoins /> Itemized Monthly Allowances Breakdown:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                    {/* HRA */}
                    <div style={{ background: '#0f172a', padding: '14px 16px', borderRadius: '10px', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginBottom: '2px' }}>House Rent Allowance (HRA)</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#34d399' }}>₹{(myStructure.hra || 0).toLocaleString()}</div>
                    </div>

                    {/* Transport */}
                    <div style={{ background: '#0f172a', padding: '14px 16px', borderRadius: '10px', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginBottom: '2px' }}>Transport Allowance</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#34d399' }}>₹{(myStructure.transport_allowance || 0).toLocaleString()}</div>
                    </div>

                    {/* Medical */}
                    <div style={{ background: '#0f172a', padding: '14px 16px', borderRadius: '10px', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginBottom: '2px' }}>Medical Allowance</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#34d399' }}>₹{(myStructure.medical_allowance || 0).toLocaleString()}</div>
                    </div>

                    {/* Special */}
                    <div style={{ background: '#0f172a', padding: '14px 16px', borderRadius: '10px', border: '1px solid #334155' }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', marginBottom: '2px' }}>Special Allowance</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#34d399' }}>₹{(myStructure.special_allowance || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', background: '#0f172a', borderRadius: '12px' }}>
                <FaInfoCircle style={{ fontSize: '24px', marginBottom: '8px', color: '#38bdf8' }} />
                <div>Your salary package structure is currently being configured by HR/Admin.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EMPLOYEE VIEW: UNREAD CREDIT NOTIFICATION BANNER */}
      {!isAdmin && unreadNotifications.length > 0 && (
        <div style={{ marginBottom: '28px', animation: 'fadeIn 0.3s ease' }}>
          {unreadNotifications.map((notif) => (
            <div
              key={notif.id}
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1))',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '16px',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                gap: '16px',
                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.2)',
                animation: 'pulseGlow 2.5s infinite'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: '#10b981', color: '#fff', width: '46px', height: '46px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)' }}>
                  <FaBell />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#34d399', marginBottom: '2px' }}>
                    Salary Credited Notification! 💸
                  </div>
                  <div style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '500' }}>
                    {notif.notification_message || `Your salary of ₹${notif.net_payable?.toLocaleString()} for ${monthsList.find(m => m.id === notif.month)?.name} ${notif.year} has been successfully disbursed!`}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDismissNotification(notif.id)}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                Acknowledge & Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* KPI METRIC SUMMARY CARDS (4 CARDS GRID) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Net Payroll
            </div>
            <div style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '10px', borderRadius: '12px', fontSize: '18px' }}>
              <FaCoins />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#fff', marginBottom: '4px', letterSpacing: '-0.5px' }}>
            ₹{totalNetPayable.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FaInfoCircle style={{ color: '#38bdf8' }} /> {monthsList.find(m => m.id === selectedMonth)?.name} {selectedYear} Payroll
          </div>
        </div>

        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Disbursed / Paid
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '10px', borderRadius: '12px', fontSize: '18px' }}>
              <FaCheckDouble />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', marginBottom: '4px', letterSpacing: '-0.5px' }}>
            ₹{totalPaid.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
            <FaArrowUp /> Cleared & Employee Notified
          </div>
        </div>

        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pending Disbursal
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '10px', borderRadius: '12px', fontSize: '18px' }}>
              <FaClock />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b', marginBottom: '4px', letterSpacing: '-0.5px' }}>
            ₹{totalPending.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
            <FaExclamationCircle /> Payment pending
          </div>
        </div>

        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Payrolls Processed
            </div>
            <div style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '10px', borderRadius: '12px', fontSize: '18px' }}>
              <FaUser />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#fff', marginBottom: '4px', letterSpacing: '-0.5px' }}>
            {payrolls.length} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>Records</span>
          </div>
          <div style={{ fontSize: '12px', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FaReceipt /> Monthly salary logs
          </div>
        </div>
      </div>

      {/* ADMIN NAVIGATION TABS & FILTERS BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', background: '#0f172a', padding: '5px', borderRadius: '12px', border: '1px solid #334155', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('payroll')}
            style={{
              background: activeTab === 'payroll' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'transparent',
              color: activeTab === 'payroll' ? '#fff' : '#94a3b8',
              border: 'none',
              padding: '9px 18px',
              borderRadius: '9px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <FaFileInvoiceDollar /> Monthly Payroll
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab('report');
                fetchReportSummary();
              }}
              style={{
                background: activeTab === 'report' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'transparent',
                color: activeTab === 'report' ? '#fff' : '#94a3b8',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '9px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <FaChartLine /> Monthly Salary Report
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab('history');
                if (selectedHistoryEmp) fetchEmployeeHistory(selectedHistoryEmp);
              }}
              style={{
                background: activeTab === 'history' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'transparent',
                color: activeTab === 'history' ? '#fff' : '#94a3b8',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '9px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <FaHistory /> Employee Salary History
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab('structures')}
              style={{
                background: activeTab === 'structures' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'transparent',
                color: activeTab === 'structures' ? '#fff' : '#94a3b8',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '9px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <FaUserCog /> Salary Catalog ({salaryStructures.length})
            </button>
          )}
        </div>

        {/* Month, Year & Status Selectors */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '6px 12px', borderRadius: '10px', border: '1px solid #334155' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
              }}
              style={{ background: 'transparent', color: '#38bdf8', border: 'none', fontWeight: '700', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
            >
              {monthsList.map((m) => (
                <option key={m.id} value={m.id} style={{ background: '#0f172a', color: '#fff' }}>{m.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '6px 12px', borderRadius: '10px', border: '1px solid #334155' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{ background: 'transparent', color: '#38bdf8', border: 'none', fontWeight: '700', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y} style={{ background: '#0f172a', color: '#fff' }}>{y}</option>
              ))}
            </select>
          </div>

          {activeTab === 'payroll' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '6px 12px', borderRadius: '10px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ background: 'transparent', color: statusFilter === 'Paid' ? '#10b981' : statusFilter === 'Pending' ? '#f59e0b' : '#38bdf8', border: 'none', fontWeight: '700', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="All" style={{ background: '#0f172a', color: '#fff' }}>All</option>
                <option value="Pending" style={{ background: '#0f172a', color: '#fff' }}>Pending</option>
                <option value="Paid" style={{ background: '#0f172a', color: '#fff' }}>Paid</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: MONTHLY PAYROLL TABLE */}
      {(activeTab === 'payroll' || !isAdmin) && (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.95)', color: '#94a3b8', borderBottom: '1px solid #334155', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '16px 20px' }}>Employee Details</th>
                  <th style={{ padding: '16px 20px' }}>Attendance Days</th>
                  <th style={{ padding: '16px 20px' }}>Overtime</th>
                  <th style={{ padding: '16px 20px' }}>Gross Earnings</th>
                  <th style={{ padding: '16px 20px' }}>Deductions</th>
                  <th style={{ padding: '16px 20px' }}>Net Payable</th>
                  <th style={{ padding: '16px 20px' }}>Disbursal Mode & Status</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payrolls.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                      <FaReceipt style={{ fontSize: '36px', marginBottom: '12px', display: 'block', margin: '0 auto 12px', color: '#475569' }} />
                      No payroll records found for this month. {isAdmin && 'Click "Generate Monthly Payroll" above to compute.'}
                    </td>
                  </tr>
                ) : (
                  payrolls.map((p) => (
                    <tr key={p.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: '#fff', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {(p.employee_name || 'E').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#fff', fontSize: '15px' }}>{p.employee_name}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                              ID: <span style={{ color: '#38bdf8', fontWeight: '600' }}>{p.employee_code}</span> | {p.department || 'General'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '700', color: '#fff', fontSize: '14px' }}>
                          {p.present_days} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '400' }}>/ {p.total_working_days} Days</span>
                        </div>
                        {p.absent_days > 0 && (
                          <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: '500' }}>
                            {p.absent_days} Days Absent
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '600', color: '#fff', fontSize: '13px' }}>
                          {p.overtime_hours || 0} hrs
                        </div>
                        <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
                          +₹{p.overtime_pay || 0}
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '700', color: '#10b981', fontSize: '15px' }}>
                          ₹{p.gross_earnings?.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Base + Allowances
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '700', color: '#ef4444', fontSize: '15px' }}>
                          -₹{p.total_deductions?.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          PF / ESI / TDS
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '800', color: '#38bdf8', fontSize: '17px' }}>
                          ₹{p.net_payable?.toLocaleString()}
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '700',
                            width: 'fit-content',
                            background: p.payment_status === 'Paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: p.payment_status === 'Paid' ? '#10b981' : '#f59e0b',
                            border: `1px solid ${p.payment_status === 'Paid' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                          }}>
                            {p.payment_status === 'Paid' ? <FaCheckCircle /> : <FaClock />} {p.payment_status}
                          </span>
                          {p.payment_mode && (
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              via {p.payment_mode}
                            </div>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleViewPayslip(p.id)}
                            style={{
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              padding: '7px 14px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <FaRegFileAlt /> Payslip
                          </button>

                          {isAdmin && p.payment_status !== 'Paid' && (
                            <button
                              onClick={() => handleOpenPayModal(p)}
                              className="gradient-btn-emerald"
                              style={{
                                color: '#fff',
                                border: 'none',
                                padding: '7px 16px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <FaCheckCircle /> Pay Now
                            </button>
                          )}

                          {isAdmin && p.payment_status === 'Paid' && (
                            <button
                              onClick={() => handleResetPayment(p.id)}
                              style={{
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '7px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}
                            >
                              <FaSyncAlt /> Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: MONTHLY SALARY REPORT (ADMIN ONLY) */}
      {activeTab === 'report' && isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaChartLine style={{ color: '#38bdf8' }} /> Executive Monthly Payroll Financial Summary
                </h3>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                  Period: <strong style={{ color: '#38bdf8' }}>{monthsList.find(m => m.id === selectedMonth)?.name} {selectedYear}</strong> | Total Employees Processed: <strong>{reportData.count || 0}</strong>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="gradient-btn-primary"
                style={{ color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FaPrint /> Print Monthly Report
              </button>
            </div>

            {/* Financial Aggregate Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Gross Earnings</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>₹{(reportData.total_gross || 0).toLocaleString()}</div>
              </div>

              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Base Earned</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff', marginTop: '4px' }}>₹{(reportData.total_base || 0).toLocaleString()}</div>
              </div>

              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Total Allowances</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#38bdf8', marginTop: '4px' }}>+₹{(reportData.total_allowances || 0).toLocaleString()}</div>
              </div>

              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Overtime Disbursed</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#fbbf24', marginTop: '4px' }}>+₹{(reportData.total_overtime || 0).toLocaleString()}</div>
              </div>

              <div style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Statutory Deductions</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#ef4444', marginTop: '4px' }}>-₹{(reportData.total_deductions || 0).toLocaleString()}</div>
              </div>

              <div style={{ background: 'rgba(56, 189, 248, 0.12)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '700', textTransform: 'uppercase' }}>Net Disbursable</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#38bdf8', marginTop: '4px' }}>₹{(reportData.total_net || 0).toLocaleString()}</div>
              </div>
            </div>

            {/* Department Breakdown Table */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaBuilding style={{ color: '#c084fc' }} /> Department-wise Payroll Breakdown
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155', textTransform: 'uppercase', fontSize: '11px' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Department</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Headcount</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Gross Earnings</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Statutory Deductions</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Net Disbursed</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(reportData.department_summary || {}).length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No department data available for this month.</td></tr>
                  ) : (
                    Object.entries(reportData.department_summary || {}).map(([dept, info]) => (
                      <tr key={dept} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#fff' }}>{dept}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#38bdf8', fontWeight: '700' }}>{info.count} employees</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#10b981', fontWeight: '600' }}>₹{info.total_gross?.toLocaleString()}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#ef4444', fontWeight: '600' }}>-₹{info.total_deductions?.toLocaleString()}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#38bdf8', fontWeight: '800' }}>₹{info.total_net?.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: EMPLOYEE SALARY HISTORY (ADMIN LOOKUP) */}
      {activeTab === 'history' && isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaHistory style={{ color: '#c084fc' }} /> Employee Multi-Month Salary History Lookup
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Select Employee:</span>
                <select
                  value={selectedHistoryEmp}
                  onChange={(e) => {
                    setSelectedHistoryEmp(e.target.value);
                    fetchEmployeeHistory(e.target.value);
                  }}
                  style={{ background: '#0f172a', color: '#fff', border: '1px solid #334155', padding: '10px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', outline: 'none' }}
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_id || `EMP-${emp.id}`})</option>
                  ))}
                </select>
              </div>
            </div>

            {historyEmpObject && (
              <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))', padding: '20px', borderRadius: '14px', border: '1px solid #334155', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff', fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {(historyEmpObject.full_name || 'E').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>{historyEmpObject.full_name}</div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                      ID: <span style={{ color: '#c084fc', fontWeight: '700' }}>{historyEmpObject.employee_id || `EMP-${historyEmpObject.id}`}</span> | Dept: <strong>{historyEmpObject.department || 'General'}</strong> | Designation: <strong>{historyEmpObject.designation || 'Staff'}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', background: 'rgba(168, 85, 247, 0.12)', padding: '10px 18px', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Cumulative Lifetime Earned</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#c084fc' }}>₹{historyTotalEarned.toLocaleString()}</div>
                </div>
              </div>
            )}

            {/* History Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155', textTransform: 'uppercase', fontSize: '11px' }}>
                    <th style={{ padding: '14px 16px', textAlign: 'left' }}>Period (Month / Year)</th>
                    <th style={{ padding: '14px 16px' }}>Attendance Days</th>
                    <th style={{ padding: '14px 16px' }}>Base Earned</th>
                    <th style={{ padding: '14px 16px' }}>Allowances Earned</th>
                    <th style={{ padding: '14px 16px' }}>Overtime Pay</th>
                    <th style={{ padding: '14px 16px' }}>Gross Earnings</th>
                    <th style={{ padding: '14px 16px' }}>Deductions</th>
                    <th style={{ padding: '14px 16px' }}>Net Paid</th>
                    <th style={{ padding: '14px 16px' }}>Status & Ref</th>
                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Payslip Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyPayrolls.length === 0 ? (
                    <tr><td colSpan="10" style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>No historical payroll logs recorded for this employee.</td></tr>
                  ) : (
                    historyPayrolls.map((hp) => (
                      <tr key={hp.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '14px 16px', fontWeight: '700', color: '#fff' }}>
                          {monthsList.find(m => m.id === hp.month)?.name} {hp.year}
                        </td>
                        <td style={{ padding: '14px 16px', color: '#fff', fontWeight: '600' }}>
                          {hp.present_days} / {hp.total_working_days} Days
                        </td>
                        <td style={{ padding: '14px 16px', color: '#fff' }}>₹{hp.base_earned}</td>
                        <td style={{ padding: '14px 16px', color: '#10b981' }}>+₹{hp.allowances_earned}</td>
                        <td style={{ padding: '14px 16px', color: '#fbbf24' }}>+₹{hp.overtime_pay}</td>
                        <td style={{ padding: '14px 16px', fontWeight: '700', color: '#10b981' }}>₹{hp.gross_earnings}</td>
                        <td style={{ padding: '14px 16px', color: '#ef4444' }}>-₹{hp.total_deductions}</td>
                        <td style={{ padding: '14px 16px', fontWeight: '800', color: '#38bdf8', fontSize: '15px' }}>₹{hp.net_payable}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '12px', fontWeight: '700', background: hp.payment_status === 'Paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: hp.payment_status === 'Paid' ? '#10b981' : '#f59e0b' }}>
                            {hp.payment_status}
                          </span>
                          {hp.transaction_ref && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{hp.transaction_ref}</div>}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleViewPayslip(hp.id)}
                            style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                          >
                            <FaRegFileAlt /> View Slip
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: SALARY STRUCTURE CATALOG (ADMIN ONLY) */}
      {activeTab === 'structures' && isAdmin && (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.95)', color: '#94a3b8', borderBottom: '1px solid #334155', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '16px 20px' }}>Employee</th>
                  <th style={{ padding: '16px 20px' }}>Base Salary</th>
                  <th style={{ padding: '16px 20px' }}>Allowances Breakdown</th>
                  <th style={{ padding: '16px 20px' }}>Statutory Deductions</th>
                  <th style={{ padding: '16px 20px' }}>Gross Salary</th>
                  <th style={{ padding: '16px 20px' }}>Monthly Net Pay</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right' }}>Configure</th>
                </tr>
              </thead>
              <tbody>
                {salaryStructures.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                      No salary structures configured yet. Click "Configure Salary Package" above to set up employee compensation.
                    </td>
                  </tr>
                ) : (
                  salaryStructures.map((s) => (
                    <tr key={s.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '700', color: '#fff', fontSize: '15px' }}>{s.employee_name}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>ID: {s.employee_code} | {s.department || 'General'}</div>
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: '700', color: '#fff' }}>
                        ₹{s.base_salary?.toLocaleString()}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '12px', color: '#94a3b8' }}>
                        <div>HRA: ₹{s.hra} | Transport: ₹{s.transport_allowance}</div>
                        <div>Medical: ₹{s.medical_allowance} | Special: ₹{s.special_allowance}</div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '12px', color: '#ef4444' }}>
                        <div>PF: ₹{s.pf_deduction} | ESI: ₹{s.esi_deduction}</div>
                        <div>TDS: ₹{s.tds_deduction} | Other: ₹{s.other_deductions}</div>
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: '700', color: '#10b981' }}>
                        ₹{s.gross_salary?.toLocaleString()}
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: '800', color: '#38bdf8', fontSize: '16px' }}>
                        ₹{s.net_salary?.toLocaleString()}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenStructureModal(s)}
                          style={{
                            background: '#1e293b',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            padding: '7px 14px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600'
                          }}
                        >
                          <FaEdit /> Edit Package
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT SALARY STRUCTURE */}
      {showStructureModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ background: '#0f172a', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaUserCog /> Configure Employee Salary Structure
              </h2>
              <button onClick={() => setShowStructureModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSaveStructure}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Select Employee</label>
                <select
                  value={structureFormData.employee_id}
                  onChange={(e) => handleSelectEmployeeInModal(e.target.value)}
                  style={{ width: '100%', background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '12px 14px', borderRadius: '10px', fontSize: '14px' }}
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_id || `EMP-${emp.id}`}) - {emp.department || 'General'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Base Monthly Salary (₹)</label>
                  <input
                    type="number"
                    value={structureFormData.base_salary}
                    onChange={(e) => setStructureFormData({ ...structureFormData, base_salary: Number(e.target.value) })}
                    style={{ width: '100%', background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '12px 14px', borderRadius: '10px', fontSize: '14px' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>HRA Allowance (₹)</label>
                  <input
                    type="number"
                    value={structureFormData.hra}
                    onChange={(e) => setStructureFormData({ ...structureFormData, hra: Number(e.target.value) })}
                    style={{ width: '100%', background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '12px 14px', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Transport Allowance (₹)</label>
                  <input
                    type="number"
                    value={structureFormData.transport_allowance}
                    onChange={(e) => setStructureFormData({ ...structureFormData, transport_allowance: Number(e.target.value) })}
                    style={{ width: '100%', background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '12px 14px', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Medical Allowance (₹)</label>
                  <input
                    type="number"
                    value={structureFormData.medical_allowance}
                    onChange={(e) => setStructureFormData({ ...structureFormData, medical_allowance: Number(e.target.value) })}
                    style={{ width: '100%', background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '12px 14px', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Special Allowance (₹)</label>
                  <input
                    type="number"
                    value={structureFormData.special_allowance}
                    onChange={(e) => setStructureFormData({ ...structureFormData, special_allowance: Number(e.target.value) })}
                    style={{ width: '100%', background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '12px 14px', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>PF Deduction (₹)</label>
                  <input
                    type="number"
                    value={structureFormData.pf_deduction}
                    onChange={(e) => setStructureFormData({ ...structureFormData, pf_deduction: Number(e.target.value) })}
                    style={{ width: '100%', background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '12px 14px', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>ESI Deduction (₹)</label>
                  <input
                    type="number"
                    value={structureFormData.esi_deduction}
                    onChange={(e) => setStructureFormData({ ...structureFormData, esi_deduction: Number(e.target.value) })}
                    style={{ width: '100%', background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '12px 14px', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>TDS Tax Deduction (₹)</label>
                  <input
                    type="number"
                    value={structureFormData.tds_deduction}
                    onChange={(e) => setStructureFormData({ ...structureFormData, tds_deduction: Number(e.target.value) })}
                    style={{ width: '100%', background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '12px 14px', borderRadius: '10px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowStructureModal(false)}
                  style={{ background: '#334155', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gradient-btn-primary"
                  style={{ color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Save Salary Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GENERATE PAYROLL */}
      {showGenerateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ background: '#0f172a', width: '100%', maxWidth: '500px', padding: '32px', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaCalculator /> Generate Monthly Payroll
              </h2>
              <button onClick={() => setShowGenerateModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleGeneratePayroll}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Select Month</label>
                <select
                  value={genMonth}
                  onChange={(e) => setGenMonth(Number(e.target.value))}
                  style={{ width: '100%', background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '12px 14px', borderRadius: '10px', fontSize: '14px' }}
                >
                  {monthsList.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Select Year</label>
                <select
                  value={genYear}
                  onChange={(e) => setGenYear(Number(e.target.value))}
                  style={{ width: '100%', background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '12px 14px', borderRadius: '10px', fontSize: '14px' }}
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Standard Monthly Working Days</label>
                <input
                  type="number"
                  value={genWorkingDays}
                  onChange={(e) => setGenWorkingDays(Number(e.target.value))}
                  style={{ width: '100%', background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '12px 14px', borderRadius: '10px', fontSize: '14px' }}
                  required
                />
              </div>

              <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '14px', borderRadius: '10px', marginBottom: '24px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
                <FaCheckCircle style={{ color: '#38bdf8', marginRight: '6px' }} />
                Generating payroll automatically pulls employee attendance logs, half-days, and overtime hours for the selected month.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  style={{ background: '#334155', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gradient-btn-primary"
                  disabled={loading}
                  style={{ color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {loading ? 'Calculating...' : 'Start Payroll Calculation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DISBURSEMENT & PAYMENT METHOD SELECTION */}
      {showPayModal && payrollToPay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ background: '#0f172a', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaCheckCircle /> Process Salary Disbursal
              </h2>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>
                <FaTimes />
              </button>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))', padding: '18px 22px', borderRadius: '14px', marginBottom: '22px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '17px', color: '#fff', fontWeight: '800' }}>{payrollToPay.employee_name}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                    ID: {payrollToPay.employee_code} | {monthsList.find(m => m.id === payrollToPay.month)?.name} {payrollToPay.year}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Net Disbursal</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>
                    ₹{payrollToPay.net_payable.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleProcessPayment}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '10px', textTransform: 'uppercase' }}>
                  Select Payment Disbursal Mode
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  {paymentModes.map((mode) => (
                    <div
                      key={mode.id}
                      onClick={() => setPayFormData({ ...payFormData, payment_mode: mode.id })}
                      className={`pay-mode-card ${payFormData.payment_mode === mode.id ? 'selected' : ''}`}
                    >
                      <div style={{ fontSize: '20px' }}>{mode.icon}</div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>{mode.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Transaction Ref / Cheque No. (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UTR12938402 / CHQ-00492"
                  value={payFormData.transaction_ref}
                  onChange={(e) => setPayFormData({ ...payFormData, transaction_ref: e.target.value })}
                  style={{ width: '100%', background: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '12px 14px', borderRadius: '10px', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  style={{ background: '#334155', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gradient-btn-emerald"
                  style={{ color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <FaCheckCircle /> Disburse & Send Notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PAYSLIP PREVIEW & PRINT */}
      {showPayslipModal && payslipData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', color: '#0f172a', borderRadius: '16px', width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', padding: '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '2px solid #f1f5f9', paddingBottom: '18px' }}>
              <div style={{ fontWeight: '800', fontSize: '20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaRegFileAlt style={{ color: '#2563eb' }} /> Employee Salary Statement
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => window.print()}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
                >
                  <FaPrint /> Print Payslip
                </button>
                <button
                  onClick={() => setShowPayslipModal(false)}
                  style={{ background: '#64748b', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>

            <div id="printable-payslip">
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '20px', marginBottom: '28px' }}>
                <h1 style={{ margin: 0, fontSize: '26px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#0f172a', fontWeight: '800' }}>Avva Inventory Solution</h1>
                <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#475569', fontWeight: '500' }}>Official Payslip Statement for {payslipData.period}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '13px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '28px', border: '1px solid #e2e8f0' }}>
                <div><strong style={{ color: '#475569' }}>Employee Name:</strong> <span style={{ fontWeight: '700', color: '#0f172a' }}>{payslipData.employee.full_name}</span></div>
                <div><strong style={{ color: '#475569' }}>Employee ID:</strong> <span style={{ fontWeight: '700', color: '#2563eb' }}>{payslipData.employee.employee_id}</span></div>
                <div><strong style={{ color: '#475569' }}>Department:</strong> {payslipData.employee.department || 'N/A'}</div>
                <div><strong style={{ color: '#475569' }}>Designation:</strong> {payslipData.employee.designation || 'N/A'}</div>
                <div><strong style={{ color: '#475569' }}>Total Working Days:</strong> {payslipData.payroll.total_working_days} Days</div>
                <div><strong style={{ color: '#475569' }}>Present Days:</strong> <span style={{ fontWeight: '700', color: '#16a34a' }}>{payslipData.payroll.present_days} Days</span></div>
                <div><strong style={{ color: '#475569' }}>PAN Number:</strong> {payslipData.employee.pan_card_number || 'N/A'}</div>
                <div><strong style={{ color: '#475569' }}>Payment Status:</strong> <span style={{ fontWeight: '800', color: payslipData.payroll.payment_status === 'Paid' ? '#16a34a' : '#d97706' }}>{payslipData.payroll.payment_status}</span></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '2px solid #16a34a', paddingBottom: '8px', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    EARNINGS
                  </h3>
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0' }}>Base Salary Earned:</td><td style={{ textAlign: 'right', fontWeight: '600' }}>₹{payslipData.payroll.base_earned}</td></tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0' }}>Allowances Earned:</td><td style={{ textAlign: 'right', fontWeight: '600' }}>₹{payslipData.payroll.allowances_earned}</td></tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0' }}>Overtime Pay ({payslipData.payroll.overtime_hours} hrs):</td><td style={{ textAlign: 'right', fontWeight: '600' }}>₹{payslipData.payroll.overtime_pay}</td></tr>
                      {payslipData.payroll.bonus > 0 && <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0' }}>Bonus / Incentive:</td><td style={{ textAlign: 'right', fontWeight: '600' }}>₹{payslipData.payroll.bonus}</td></tr>}
                      <tr style={{ fontWeight: '800', fontSize: '14px' }}><td style={{ padding: '12px 0 6px' }}>Total Gross Earnings:</td><td style={{ textAlign: 'right', padding: '12px 0 6px', color: '#0f172a' }}>₹{payslipData.payroll.gross_earnings}</td></tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', borderBottom: '2px solid #dc2626', paddingBottom: '8px', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    DEDUCTIONS
                  </h3>
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0' }}>Statutory Deductions (PF/ESI/TDS):</td><td style={{ textAlign: 'right', fontWeight: '600' }}>₹{payslipData.payroll.statutory_deductions}</td></tr>
                      <tr style={{ fontWeight: '800', fontSize: '14px' }}><td style={{ padding: '12px 0 6px' }}>Total Deductions:</td><td style={{ textAlign: 'right', padding: '12px 0 6px', color: '#dc2626' }}>-₹{payslipData.payroll.statutory_deductions}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ backgroundColor: '#0f172a', color: '#fff', padding: '20px 24px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '0.5px' }}>TOTAL NET PAYABLE:</span>
                <span style={{ fontSize: '26px', fontWeight: '800', color: '#4ade80' }}>₹{payslipData.payroll.net_payable.toLocaleString()}</span>
              </div>

              {payslipData.payroll.transaction_ref && (
                <div style={{ marginTop: '20px', fontSize: '13px', color: '#64748b', textAlign: 'center', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                  Payment Method: <strong>{payslipData.payroll.payment_mode}</strong> | Ref ID: <strong>{payslipData.payroll.transaction_ref}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Salary;
