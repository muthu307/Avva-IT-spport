// CustomerDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  FileSpreadsheet, 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  Car, 
  Receipt,
  X,
  CheckCircle,
  AlertCircle,
  Users
} from 'lucide-react';

import { BASE_URL, API_BASE_URL } from '../utils/api';

const CustomerDetailsPage = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerType, setSelectedCustomerType] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Bill modal state
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBills, setCustomerBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);

  // Add/Edit Customer Modal State
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [customerFormData, setCustomerFormData] = useState({
    id: null,
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerGST: '',
    customerAddress: '',
    customerType: 'regular',
    vehicleName: '',
    vehicleNumber: '',
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Fetch all bills and extract unique customers
  useEffect(() => {
    fetchAllCustomers();
  }, []);

  const fetchAllCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all bills with pagination to get all customers
      let allBills = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await fetch(`${API_BASE_URL}/billing/bills?page=${page}&per_page=100`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch bills');
        }
        
        const data = await response.json();
        const fetchedBills = data.bills || [];
        allBills = [...allBills, ...fetchedBills];
        
        hasMore = page < (data.pages || 1);
        page++;
      }
      
      // Extract unique customers by phone number or name combination
      const customerMap = new Map();
      
      allBills.forEach(bill => {
        const customerKey = bill.customer?.phone || bill.customerPhone || bill.customer?.name || bill.customerName;
        if (!customerKey) return;
        
        if (!customerMap.has(customerKey)) {
          customerMap.set(customerKey, {
            id: bill.id,
            customerName: bill.customer?.name || bill.customerName || 'Unknown Customer',
            customerPhone: bill.customer?.phone || bill.customerPhone || '',
            customerEmail: bill.customer?.email || bill.customerEmail || '',
            customerGST: bill.customer?.gst || bill.customerGST || '',
            customerAddress: bill.customer?.address || bill.customerAddress || '',
            customerType: bill.customer?.type || bill.customerType || 'regular',
            vehicleName: bill.vehicle?.name || bill.vehicleName || '',
            vehicleNumber: bill.vehicle?.number || bill.vehicleNumber || '',
            totalSpent: bill.summary?.total || bill.total || 0,
            billCount: 1,
            lastBillDate: bill.createdAt || new Date().toISOString()
          });
        } else {
          const existing = customerMap.get(customerKey);
          existing.totalSpent += (bill.summary?.total || bill.total || 0);
          existing.billCount += 1;
          
          if (bill.createdAt && new Date(bill.createdAt) > new Date(existing.lastBillDate)) {
            existing.lastBillDate = bill.createdAt;
          }
        }
      });
      
      const customersList = Array.from(customerMap.values());
      setCustomers(customersList);
      setFilteredCustomers(customersList);
      
    } catch (err) {
      setError(err.message);
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Filter customers based on search and filters
  useEffect(() => {
    let filtered = [...customers];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(customer =>
        (customer.customerName && customer.customerName.toLowerCase().includes(term)) ||
        (customer.customerPhone && customer.customerPhone.includes(term)) ||
        (customer.customerEmail && customer.customerEmail.toLowerCase().includes(term)) ||
        (customer.vehicleNumber && customer.vehicleNumber.toLowerCase().includes(term)) ||
        (customer.customerGST && customer.customerGST.toLowerCase().includes(term))
      );
    }
    
    // Filter by customer type
    if (selectedCustomerType !== 'all') {
      filtered = filtered.filter(customer => customer.customerType === selectedCustomerType);
    }
    
    setFilteredCustomers(filtered);
    setCurrentPage(1);
  }, [searchTerm, selectedCustomerType, customers]);
  
  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return 'Invalid Date';
    }
  };
  
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0.00';
    return `₹${amount.toFixed(2)}`;
  };
  
  const handleViewCustomerBills = async (customer, e) => {
    if (e) e.stopPropagation();
    setSelectedCustomer(customer);
    setShowBillModal(true);
    setLoadingBills(true);
    
    try {
      let allBills = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await fetch(`${API_BASE_URL}/billing/bills?page=${page}&per_page=100`);
        if (!response.ok) throw new Error('Failed to fetch bills');
        
        const data = await response.json();
        const fetchedBills = data.bills || [];
        
        const customerBillsData = fetchedBills.filter(bill => {
          const billPhone = bill.customer?.phone || bill.customerPhone;
          const billName = bill.customer?.name || bill.customerName;
          
          return (billPhone && billPhone === customer.customerPhone) ||
                 (billName && billName === customer.customerName);
        });
        
        allBills = [...allBills, ...customerBillsData];
        hasMore = page < (data.pages || 1);
        page++;
      }
      
      setCustomerBills(allBills);
    } catch (err) {
      console.error('Error fetching customer bills:', err);
      setError('Failed to fetch customer bills');
    } finally {
      setLoadingBills(false);
    }
  };
  
  const closeBillModal = () => {
    setShowBillModal(false);
    setSelectedCustomer(null);
    setCustomerBills([]);
  };

  // Add / Edit Customer Handlers
  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCustomerFormData({
      id: null,
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerGST: '',
      customerAddress: '',
      customerType: 'regular',
      vehicleName: '',
      vehicleNumber: '',
    });
    setShowCustomerModal(true);
  };

  const handleOpenEditModal = (customer, e) => {
    e.stopPropagation();
    setIsEditing(true);
    setCustomerFormData({
      id: customer.id,
      customerName: customer.customerName || '',
      customerPhone: customer.customerPhone || '',
      customerEmail: customer.customerEmail || '',
      customerGST: customer.customerGST || '',
      customerAddress: customer.customerAddress || '',
      customerType: customer.customerType || 'regular',
      vehicleName: customer.vehicleName || '',
      vehicleNumber: customer.vehicleNumber || '',
    });
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = (e) => {
    e.preventDefault();
    if (!customerFormData.customerName.trim()) {
      setError('Customer name is required!');
      return;
    }

    if (isEditing) {
      const updatedList = customers.map(c => 
        (c.id === customerFormData.id || (c.customerPhone && c.customerPhone === customerFormData.customerPhone))
          ? { ...c, ...customerFormData }
          : c
      );
      setCustomers(updatedList);
      showMessage('success', `✅ Updated customer ${customerFormData.customerName}`);
    } else {
      const newCustomer = {
        ...customerFormData,
        id: Date.now(),
        totalSpent: 0,
        billCount: 0,
        lastBillDate: new Date().toISOString()
      };
      setCustomers([newCustomer, ...customers]);
      showMessage('success', `✅ Added customer ${customerFormData.customerName}`);
    }

    setShowCustomerModal(false);
  };

  const handleDeleteCustomer = (customer, e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete customer "${customer.customerName}"?`)) {
      setCustomers(customers.filter(c => c !== customer));
      showMessage('success', `🗑️ Deleted customer ${customer.customerName}`);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      const dataToExport = filteredCustomers.map((cust, idx) => ({
        "S.No": idx + 1,
        "Customer Name": cust.customerName || 'N/A',
        "Phone": cust.customerPhone || 'N/A',
        "Email": cust.customerEmail || 'N/A',
        "Address": cust.customerAddress || 'N/A',
        "GST Number": cust.customerGST || 'N/A',
        "Type": cust.customerType === 'internal' ? 'Internal' : 'Regular',
        "Vehicle Number": cust.vehicleNumber || 'N/A',
        "Vehicle Name": cust.vehicleName || 'N/A',
        "Total Spent (₹)": cust.totalSpent || 0,
        "Bill Count": cust.billCount || 0,
        "Last Bill Date": formatDate(cust.lastBillDate)
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
      XLSX.writeFile(workbook, `Customer_Details_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showMessage('success', '📊 Excel report downloaded successfully!');
    } catch (err) {
      console.error("Excel Export Error:", err);
      setError("Failed to export Excel report");
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text("Customer Details Report", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')} | Total Customers: ${filteredCustomers.length}`, 14, 28);

      const tableColumn = ["S.No", "Customer Name", "Phone", "GST Number", "Type", "Vehicle No", "Total Spent", "Bills"];
      const tableRows = filteredCustomers.map((cust, idx) => [
        idx + 1,
        cust.customerName || 'N/A',
        cust.customerPhone || 'N/A',
        cust.customerGST || '—',
        cust.customerType === 'internal' ? 'Internal' : 'Regular',
        cust.vehicleNumber || '—',
        `INR ${(cust.totalSpent || 0).toFixed(2)}`,
        cust.billCount || 0
      ]);

      const autoTableFunc = typeof autoTable === 'function' ? autoTable : doc.autoTable;
      if (typeof autoTableFunc === 'function') {
        autoTableFunc(doc, {
          startY: 34,
          head: [tableColumn],
          body: tableRows,
          theme: 'striped',
          headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { fontSize: 9, cellPadding: 3 }
        });
      } else if (typeof doc.autoTable === 'function') {
        doc.autoTable({
          startY: 34,
          head: [tableColumn],
          body: tableRows,
          theme: 'striped',
          headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { fontSize: 9, cellPadding: 3 }
        });
      }

      doc.save(`Customer_Details_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      showMessage('success', '📄 PDF report downloaded successfully!');
    } catch (err) {
      console.error("PDF Export Error:", err);
      printPDFReport();
    }
  };

  const printPDFReport = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setError("Pop-up blocked. Please allow pop-ups to print/download PDF.");
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Customer Details Report</title>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #1e293b; }
              h1 { margin-bottom: 4px; color: #0f172a; }
              p { color: #64748b; font-size: 13px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 12px; }
              th { background: #1e293b; color: white; }
              tr:nth-child(even) { background: #f8fafc; }
            </style>
          </head>
          <body>
            <h1>Customer Details Report</h1>
            <p>Generated: ${new Date().toLocaleDateString('en-IN')} | Total Customers: ${filteredCustomers.length}</p>
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Customer Name</th>
                  <th>Phone</th>
                  <th>GST Number</th>
                  <th>Type</th>
                  <th>Vehicle No</th>
                  <th>Total Spent</th>
                  <th>Bills</th>
                </tr>
              </thead>
              <tbody>
                ${filteredCustomers.map((cust, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${cust.customerName || 'N/A'}</td>
                    <td>${cust.customerPhone || 'N/A'}</td>
                    <td>${cust.customerGST || '—'}</td>
                    <td>${cust.customerType === 'internal' ? 'Internal' : 'Regular'}</td>
                    <td>${cust.vehicleNumber || '—'}</td>
                    <td>₹${(cust.totalSpent || 0).toFixed(2)}</td>
                    <td>${cust.billCount || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      showMessage('success', '📄 PDF Report ready for print/download!');
    } catch (printErr) {
      console.error("Print PDF Error:", printErr);
      setError("Failed to generate PDF report");
    }
  };
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#0f172a',
        color: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #334155',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading customer details...</p>
        </div>
      </div>
    );
  }

  // Styles object matching standard app UI
  const styles = {
    container: {
      padding: '24px',
      color: '#f8fafc',
      fontFamily: "'Inter', sans-serif",
      maxWidth: '1400px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    subtitle: {
      color: '#94a3b8',
      fontSize: '14px',
      marginTop: '4px',
    },
    actionGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flexWrap: 'wrap',
    },
    btn: {
      padding: '10px 16px',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '13px',
      border: 'none',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s ease',
    },
    btnAdd: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      color: '#ffffff',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    },
    btnExcel: {
      background: '#1e293b',
      color: '#34d399',
      border: '1px solid #334155',
    },
    btnPdf: {
      background: '#1e293b',
      color: '#f87171',
      border: '1px solid #334155',
    },
    card: {
      background: 'linear-gradient(145deg, #1e293b, #0f172a)',
      borderRadius: '16px',
      border: '1px solid #334155',
      padding: '20px',
      marginBottom: '24px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
    },
    filterGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px',
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      background: '#0f172a',
      color: '#f8fafc',
      border: '1px solid #334155',
      borderRadius: '8px',
      outline: 'none',
      fontSize: '13px',
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '10px 14px',
      background: '#0f172a',
      color: '#f8fafc',
      border: '1px solid #334155',
      borderRadius: '8px',
      outline: 'none',
      fontSize: '13px',
      cursor: 'pointer',
      boxSizing: 'border-box',
    },
    tableContainer: {
      background: 'linear-gradient(145deg, #1e293b, #0f172a)',
      borderRadius: '16px',
      border: '1px solid #334155',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px',
    },
    th: {
      padding: '14px 16px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: '700',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      background: '#0f172a',
      borderBottom: '1px solid #334155',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '14px 16px',
      borderBottom: '1px solid #1e293b',
      color: '#f8fafc',
      verticalAlign: 'middle',
    },
    badgeRegular: {
      background: 'rgba(59, 130, 246, 0.15)',
      color: '#60a5fa',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      padding: '3px 10px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    badgeInternal: {
      background: 'rgba(168, 85, 247, 0.15)',
      color: '#c084fc',
      border: '1px solid rgba(168, 85, 247, 0.3)',
      padding: '3px 10px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    iconBtn: {
      padding: '6px 10px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      fontSize: '12px',
      fontWeight: '600',
    }
  };

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <Users size={32} color="#6366f1" />
            Customer Details
          </h1>
          <p style={styles.subtitle}>
            View, add, edit, and export all customer information
          </p>
        </div>
        
        <div style={styles.actionGroup}>
          <button 
            style={{...styles.btn, ...styles.btnAdd}}
            onClick={handleOpenAddModal}
          >
            <UserPlus size={16} /> Add Customer
          </button>

          <button 
            style={{...styles.btn, ...styles.btnExcel}}
            onClick={exportToExcel}
            title="Download Excel Report"
          >
            <FileSpreadsheet size={16} /> Export Excel
          </button>

          <button 
            style={{...styles.btn, ...styles.btnPdf}}
            onClick={exportToPDF}
            title="Download PDF Report"
          >
            <FileText size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Messages */}
      {message.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontWeight: '600',
          fontSize: '13px',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: message.type === 'success' ? '#6ee7b7' : '#fca5a5',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filters Card */}
      <div style={styles.card}>
        <div style={styles.filterGrid}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
              🔍 Search Customers
            </label>
            <input
              type="text"
              placeholder="Search by name, phone, email, GST, or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.input}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
              🏷️ Customer Type
            </label>
            <select
              value={selectedCustomerType}
              onChange={(e) => setSelectedCustomerType(e.target.value)}
              style={styles.select}
            >
              <option value="all">All Types</option>
              <option value="regular">Regular</option>
              <option value="internal">Internal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div style={styles.tableContainer}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Customer Name</th>
                <th style={styles.th}>Contact Info</th>
                <th style={styles.th}>GST Number</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Vehicle Details</th>
                <th style={{...styles.th, textAlign: 'right'}}>Total Spent</th>
                <th style={{...styles.th, textAlign: 'center'}}>Bills</th>
                <th style={styles.th}>Last Bill Date</th>
                <th style={{...styles.th, textAlign: 'center'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentCustomers.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No customers found matching filters.
                  </td>
                </tr>
              ) : (
                currentCustomers.map((customer, index) => {
                  const serialNumber = indexOfFirstItem + index + 1;
                  return (
                    <tr 
                      key={customer.id || index} 
                      style={{ transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#1e293b'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={styles.td}>{serialNumber}</td>
                      
                      {/* Customer Name & Address */}
                      <td style={{...styles.td, minWidth: '180px'}}>
                        <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '14px' }}>
                          {customer.customerName}
                        </div>
                        {customer.customerAddress && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={10} color="#64748b" />
                            <span>{customer.customerAddress}</span>
                          </div>
                        )}
                      </td>

                      {/* Contact Info */}
                      <td style={{...styles.td, minWidth: '160px'}}>
                        {customer.customerPhone && (
                          <div style={{ fontSize: '13px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={11} color="#38bdf8" />
                            <span>{customer.customerPhone}</span>
                          </div>
                        )}
                        {customer.customerEmail && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={10} color="#64748b" />
                            <span>{customer.customerEmail}</span>
                          </div>
                        )}
                      </td>

                      {/* GST */}
                      <td style={{...styles.td, whiteSpace: 'nowrap'}}>
                        {customer.customerGST ? (
                          <span style={{ color: '#fbbf24', fontFamily: 'monospace', fontWeight: '600' }}>
                            {customer.customerGST}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>—</span>
                        )}
                      </td>

                      {/* Customer Type */}
                      <td style={{...styles.td, whiteSpace: 'nowrap'}}>
                        <span style={customer.customerType === 'internal' ? styles.badgeInternal : styles.badgeRegular}>
                          {customer.customerType === 'internal' ? '🏢 Internal' : '👤 Regular'}
                        </span>
                      </td>

                      {/* Vehicle */}
                      <td style={{...styles.td, minWidth: '140px'}}>
                        {customer.vehicleNumber && (
                          <div style={{ fontSize: '13px', color: '#f8fafc', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Car size={12} color="#a78bfa" />
                            <span>{customer.vehicleNumber}</span>
                          </div>
                        )}
                        {customer.vehicleName && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            {customer.vehicleName}
                          </div>
                        )}
                        {!customer.vehicleNumber && !customer.vehicleName && (
                          <span style={{ color: '#64748b' }}>—</span>
                        )}
                      </td>

                      {/* Total Spent */}
                      <td style={{...styles.td, textAlign: 'right', whiteSpace: 'nowrap'}}>
                        <div style={{ fontWeight: '700', color: '#34d399', fontSize: '14px' }}>
                          {formatCurrency(customer.totalSpent)}
                        </div>
                      </td>

                      {/* Bill Count */}
                      <td style={{...styles.td, textAlign: 'center', whiteSpace: 'nowrap'}}>
                        <span style={{ 
                          background: '#1e293b', 
                          padding: '3px 10px', 
                          borderRadius: '12px', 
                          color: '#f8fafc', 
                          fontWeight: '600',
                          border: '1px solid #334155'
                        }}>
                          {customer.billCount || 0}
                        </span>
                      </td>

                      {/* Last Bill Date */}
                      <td style={{...styles.td, whiteSpace: 'nowrap'}}>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {formatDate(customer.lastBillDate)}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td style={{...styles.td, textAlign: 'center', whiteSpace: 'nowrap'}}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            style={{...styles.iconBtn, background: '#3b82f6', color: 'white'}}
                            onClick={(e) => handleViewCustomerBills(customer, e)}
                            title="View Bills"
                          >
                            <Eye size={13} /> Bills
                          </button>

                          <button
                            style={{...styles.iconBtn, background: '#334155', color: '#38bdf8'}}
                            onClick={(e) => handleOpenEditModal(customer, e)}
                            title="Edit Customer"
                          >
                            <Edit size={13} />
                          </button>

                          <button
                            style={{...styles.iconBtn, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171'}}
                            onClick={(e) => handleDeleteCustomer(customer, e)}
                            title="Delete Customer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ 
            padding: '16px 20px', 
            background: '#0f172a', 
            borderTop: '1px solid #334155', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCustomers.length)} of {filteredCustomers.length} customers
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  ...styles.btn,
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                ← Prev
              </button>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  ...styles.btn,
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      {showCustomerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }} onClick={() => setShowCustomerModal(false)}>
          <div style={{
            background: '#1e293b',
            borderRadius: '16px',
            border: '1px solid #334155',
            width: '100%',
            maxWidth: '550px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            color: '#f8fafc'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0f172a'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
                {isEditing ? <Edit size={18} color="#38bdf8" /> : <UserPlus size={18} color="#34d399" />}
                {isEditing ? 'Edit Customer Details' : 'Add New Customer'}
              </h2>
              <button 
                onClick={() => setShowCustomerModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={customerFormData.customerName}
                    onChange={(e) => setCustomerFormData({...customerFormData, customerName: e.target.value})}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="10-digit mobile"
                    value={customerFormData.customerPhone}
                    onChange={(e) => setCustomerFormData({...customerFormData, customerPhone: e.target.value})}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={customerFormData.customerEmail}
                    onChange={(e) => setCustomerFormData({...customerFormData, customerEmail: e.target.value})}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>
                    Customer Type
                  </label>
                  <select
                    value={customerFormData.customerType}
                    onChange={(e) => setCustomerFormData({...customerFormData, customerType: e.target.value})}
                    style={styles.select}
                  >
                    <option value="regular">Regular</option>
                    <option value="internal">Internal (Staff)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>
                  GST Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 33AAAAA0000A1Z5"
                  value={customerFormData.customerGST}
                  onChange={(e) => setCustomerFormData({...customerFormData, customerGST: e.target.value})}
                  style={styles.input}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>
                  Address
                </label>
                <input
                  type="text"
                  placeholder="Street, City, Pincode"
                  value={customerFormData.customerAddress}
                  onChange={(e) => setCustomerFormData({...customerFormData, customerAddress: e.target.value})}
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>
                    Vehicle Name / Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hero Splendor"
                    value={customerFormData.vehicleName}
                    onChange={(e) => setCustomerFormData({...customerFormData, vehicleName: e.target.value})}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px' }}>
                    Vehicle Reg Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TN-01-AB-1234"
                    value={customerFormData.vehicleNumber}
                    onChange={(e) => setCustomerFormData({...customerFormData, vehicleNumber: e.target.value})}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  style={{ ...styles.btn, background: '#334155', color: '#f8fafc' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ ...styles.btn, ...styles.btnAdd }}
                >
                  {isEditing ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Details Modal */}
      {showBillModal && selectedCustomer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }} onClick={closeBillModal}>
          <div style={{
            background: '#1e293b',
            borderRadius: '16px',
            border: '1px solid #334155',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            color: '#f8fafc'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0f172a'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', marginBottom: '4px' }}>
                  Bill History — {selectedCustomer.customerName}
                </h2>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#94a3b8' }}>
                  <span>📞 {selectedCustomer.customerPhone || 'N/A'}</span>
                  <span>GST: {selectedCustomer.customerGST || 'N/A'}</span>
                  <span>Total Bills: {customerBills.length}</span>
                </div>
              </div>
              <button
                onClick={closeBillModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '20px' }}>
              {loadingBills ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>Loading bills...</p>
                </div>
              ) : customerBills.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <p>No bills found for this customer</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>#</th>
                        <th style={styles.th}>Bill Number</th>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Vehicle</th>
                        <th style={{...styles.th, textAlign: 'right'}}>Total Amount</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerBills.map((bill, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={styles.td}>{index + 1}</td>
                          <td style={{...styles.td, fontWeight: '700', color: '#38bdf8'}}>{bill.billNumber || `#${bill.id}`}</td>
                          <td style={styles.td}>{formatDate(bill.createdAt)}</td>
                          <td style={styles.td}>
                            {bill.vehicle?.number || bill.vehicleNumber || '—'}
                          </td>
                          <td style={{...styles.td, fontWeight: '700', color: '#34d399', textAlign: 'right'}}>
                            {formatCurrency(bill.summary?.total || bill.total || 0)}
                          </td>
                          <td style={styles.td}>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              background: (bill.payment?.status || bill.paymentStatus) === 'paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: (bill.payment?.status || bill.paymentStatus) === 'paid' ? '#34d399' : '#fbbf24',
                              border: `1px solid ${(bill.payment?.status || bill.paymentStatus) === 'paid' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                            }}>
                              {(bill.payment?.status || bill.paymentStatus || 'pending').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetailsPage;