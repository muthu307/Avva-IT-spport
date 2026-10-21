import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parseDateTime } from '../utils/dateUtils';
import { 
  Search, 
  Eye, 
  Printer, 
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileJson,
  Filter,
  Download,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Hash,
  Tag,
  Package,
  IndianRupee,
  Receipt,
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  Check,
  AlertTriangle,
  TrendingUp,
  Calendar as CalendarIcon,
  Building2,
  Store,
  MessageCircle,
  Zap
} from 'lucide-react';

const Warranty = () => {
  const [billNumber, setBillNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [warrantyData, setWarrantyData] = useState(null);
  const [error, setError] = useState(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  
  // Company/Shop Details from Backend
  const [companyDetails, setCompanyDetails] = useState({
    name: "Avva Inventory",
    address: "No.71, M.T.H.road (Opp padi post office)",
    city: "Padi, Chennai - 600 050",
    phone: "93423 01582",
    email: "",
    gst: "",
    logo: null,
    logoUrl: null
  });
  
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [showCompanySelector, setShowCompanySelector] = useState(false);


  // Auto-hide message after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
  };

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies/list');
      console.log('Companies response:', response.data);
      
      if (response.data && response.data.length > 0) {
        setCompanies(response.data);
        const firstCompany = response.data[0];
        setSelectedCompanyId(firstCompany.id);
        await fetchCompanyDetails(firstCompany.id);
      } else {
        setCompanyDetails({
          name: "Avva Inventory",
          address: "",
          city: "",
          phone: "",
          email: "",
          gst: "",
          logo: null,
          logoUrl: null
        });
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      setCompanyDetails({
        name: "Avva Inventory",
        address: "",
        city: "",
        phone: "",
        email: "",
        gst: "",
        logo: null,
        logoUrl: null
      });
    }
  };

  const fetchCompanyDetails = async (companyId) => {
    try {
      const response = await api.get(`/companies/${companyId}`);
      const company = response.data;
      setCompanyDetails({
        name: company.name || "Avva Inventory",
        address: company.address || "",
        city: company.city || "",
        phone: company.phone || "",
        email: company.email || "",
        gst: company.gst_number || company.gst || "",
        logo: company.logo || null,
        logoUrl: company.logo_url || null
      });
    } catch (err) {
      console.error('Error fetching company details:', err);
    }
  };

  const handleCompanySelect = async (company) => {
    setSelectedCompanyId(company.id);
    setShowCompanySelector(false);
    await fetchCompanyDetails(company.id);
    showMessage("success", `✅ Switched to ${company.name}`);
  };

  const searchWarranty = async () => {
    if (!billNumber.trim()) {
      showMessage("error", "❌ Please enter a bill number");
      return;
    }

    setLoading(true);
    setError(null);
    setSearchPerformed(true);

    try {
      const response = await api.get('/billing/warranty/search', {
        params: { bill_number: billNumber }
      });
      
      setWarrantyData(response.data);
      showMessage("success", `✅ Warranty information loaded for ${response.data.billNumber}`);
    } catch (err) {
      console.error('Error fetching warranty data:', err);
      if (err.response?.status === 404) {
        setError('Bill not found. Please check the bill number.');
        showMessage("error", "❌ Bill not found");
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
        showMessage("error", `❌ ${err.response.data.error}`);
      } else {
        setError('Failed to fetch warranty information. Please try again.');
        showMessage("error", "❌ Failed to fetch warranty information");
      }
      setWarrantyData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchWarranty();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = parseDateTime(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = parseDateTime(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const getWarrantyStatusConfig = (status) => {
    if (status === 'active') {
      return {
        color: '#059669',
        bgColor: '#d1fae5',
        icon: <CheckCircle size={14} />,
        label: 'Active',
        textColor: '#065f46'
      };
    } else if (status === 'expired') {
      return {
        color: '#dc2626',
        bgColor: '#fee2e2',
        icon: <AlertCircle size={14} />,
        label: 'Expired',
        textColor: '#991b1b'
      };
    } else {
      return {
        color: '#f59e0b',
        bgColor: '#fed7aa',
        icon: <AlertTriangle size={14} />,
        label: 'Warning',
        textColor: '#92400e'
      };
    }
  };

  const calculateWarrantySummary = () => {
    if (!warrantyData?.items) return { active: 0, expired: 0, total: 0, totalValue: 0 };
    
    let active = 0;
    let expired = 0;
    let totalValue = 0;
    
    warrantyData.items.forEach(item => {
      const status = item.warranty?.warrantyStatus?.status;
      if (status === 'active') active++;
      if (status === 'expired') expired++;
      totalValue += (item.total || 0);
    });
    
    return {
      active,
      expired,
      total: warrantyData.items.length,
      totalValue
    };
  };

  const handleExportPDF = () => {
    if (!warrantyData) return;
    
    try {
      const doc = new jsPDF();
      const summary = calculateWarrantySummary();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(99, 102, 241);
      doc.text('Warranty Report', 14, 22);
      
      // Bill info
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Bill Number: ${warrantyData.billNumber}`, 14, 40);
      doc.text(`Customer: ${warrantyData.customerName || 'Walk-in Customer'}`, 14, 47);
      doc.text(`Billed Date: ${formatDate(warrantyData.billedDate)}`, 14, 54);
      
      // Summary
      doc.setFontSize(11);
      doc.text(`Total Products: ${summary.total}`, 14, 65);
      doc.text(`Active Warranties: ${summary.active}`, 14, 72);
      doc.text(`Expired Warranties: ${summary.expired}`, 14, 79);
      doc.text(`Total Value: ${formatCurrency(summary.totalValue)}`, 14, 86);
      
      // Products table
      const tableColumn = [
        '#', 'Product', 'Model', 'Warranty Period', 'Start Date', 'End Date', 'Status', 'Days Left'
      ];
      
      const tableRows = warrantyData.items.map((item, index) => {
        const warranty = item.warranty;
        const status = warranty?.warrantyStatus?.status || 'unknown';
        const daysLeft = warranty?.warrantyStatus?.days_left;
        const daysExpired = warranty?.warrantyStatus?.days_expired;
        const daysDisplay = status === 'active' ? `${daysLeft} days` : status === 'expired' ? `Expired ${daysExpired} days ago` : 'N/A';
        
        return [
          (index + 1).toString(),
          item.productName,
          item.productModel || 'N/A',
          `${warranty?.warrantyPeriodMonths || 12} months`,
          formatDate(warranty?.warrantyStartDate),
          formatDate(warranty?.warrantyEndDate),
          status.toUpperCase(),
          daysDisplay
        ];
      });
      
      const callAutoTable = (d, opts) => {
        if (typeof autoTable === 'function') autoTable(d, opts);
        else if (typeof d.autoTable === 'function') d.autoTable(opts);
      };
      
      callAutoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 95,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
      });

      
      const date = new Date().toISOString().split('T')[0];
      doc.save(`Warranty_${warrantyData.billNumber}_${date}.pdf`);
      
      showMessage("success", "✅ Warranty report exported to PDF");
    } catch (err) {
      console.error("PDF export error:", err);
      showMessage("error", "❌ Failed to export to PDF");
    }
  };

  const handleExportExcel = () => {
    if (!warrantyData) return;
    
    try {
      const exportData = warrantyData.items.map((item, index) => {
        const warranty = item.warranty;
        const status = warranty?.warrantyStatus?.status || 'unknown';
        const daysLeft = warranty?.warrantyStatus?.days_left;
        const daysExpired = warranty?.warrantyStatus?.days_expired;
        
        return {
          'S.No': index + 1,
          'Product Name': item.productName,
          'Product Model': item.productModel || 'N/A',
          'Quantity': item.quantity,
          'Price': item.sellPrice,
          'Total': item.total,
          'Warranty Period (Months)': warranty?.warrantyPeriodMonths || 12,
          'Warranty Start Date': formatDate(warranty?.warrantyStartDate),
          'Warranty End Date': formatDate(warranty?.warrantyEndDate),
          'Warranty Status': status.toUpperCase(),
          'Days Left/Expired': status === 'active' ? `${daysLeft} days remaining` : status === 'expired' ? `Expired ${daysExpired} days ago` : 'N/A',
          'Bill Number': warrantyData.billNumber,
          'Customer Name': warrantyData.customerName || 'Walk-in Customer',
          'Customer Phone': warrantyData.customerPhone || '',
          'Billed Date': formatDate(warrantyData.billedDate)
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Warranty Details");

      const wscols = [
        { wch: 6 }, { wch: 25 }, { wch: 15 }, { wch: 8 }, { wch: 12 },
        { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
        { wch: 15 }, { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 15 }
      ];
      worksheet['!cols'] = wscols;

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const file = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      const date = new Date().toISOString().split('T')[0];
      saveAs(file, `Warranty_${warrantyData.billNumber}_${date}.xlsx`);
      
      showMessage("success", `✅ Exported warranty details to Excel`);
    } catch (err) {
      console.error("Export error:", err);
      showMessage("error", "❌ Failed to export to Excel");
    }
  };

  const handlePrintWarranty = () => {
    if (!warrantyData) return;
    
    const printWindow = window.open('', '_blank');
    const summary = calculateWarrantySummary();
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Warranty Report - ${warrantyData.billNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              max-width: 1200px; 
              margin: 0 auto; 
              background: #fff; 
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px;
              border-bottom: 2px solid #6366f1;
              padding-bottom: 15px;
            }
            .header h1 { 
              font-size: 28px; 
              margin-bottom: 5px; 
              color: #6366f1;
            }
            .bill-info {
              background: #f3f4f6;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .bill-info h3 {
              margin-top: 0;
              color: #374151;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
            }
            .info-item {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .info-label {
              font-weight: bold;
              color: #6b7280;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            .summary-card {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
            }
            .summary-number {
              font-size: 28px;
              font-weight: bold;
            }
            .summary-label {
              font-size: 12px;
              margin-top: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background: #6366f1;
              color: white;
              padding: 10px;
              text-align: left;
            }
            td {
              padding: 8px;
              border-bottom: 1px solid #e5e7eb;
            }
            .status-active {
              color: #059669;
              font-weight: bold;
            }
            .status-expired {
              color: #dc2626;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #9ca3af;
              border-top: 1px solid #e5e7eb;
              padding-top: 15px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/avva-logo.jpeg" alt="Avva Inventory Logo" style="max-width: 150px; margin-bottom: 10px;">
            <h1>${companyDetails.name}</h1>
            <h2 style="color: #6b7280; font-size: 18px; margin-top: 0;">Warranty Report</h2>
          </div>
          
          <div class="bill-info">
            <h3>Bill Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Bill Number:</span>
                <span>${warrantyData.billNumber}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Customer Name:</span>
                <span>${warrantyData.customerName || 'Walk-in Customer'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Customer Phone:</span>
                <span>${warrantyData.customerPhone || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Billed Date:</span>
                <span>${formatDate(warrantyData.billedDate)}</span>
              </div>
            </div>
          </div>
          
          <div class="summary">
            <div class="summary-card">
              <div class="summary-number">${summary.total}</div>
              <div class="summary-label">Total Products</div>
            </div>
            <div class="summary-card">
              <div class="summary-number">${summary.active}</div>
              <div class="summary-label">Active Warranties</div>
            </div>
            <div class="summary-card">
              <div class="summary-number">${summary.expired}</div>
              <div class="summary-label">Expired Warranties</div>
            </div>
            <div class="summary-card">
              <div class="summary-number">${formatCurrency(summary.totalValue)}</div>
              <div class="summary-label">Total Value</div>
            </div>
          </div>
          
          <h3>Product Warranty Details</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product Name</th>
                <th>Model</th>
                <th>Warranty Period</th>
                <th>Warranty Start</th>
                <th>Warranty End</th>
                <th>Status</th>
                <th>Days Left/Expired</th>
              </tr>
            </thead>
            <tbody>
              ${warrantyData.items.map((item, index) => {
                const warranty = item.warranty;
                const status = warranty?.warrantyStatus?.status;
                const daysLeft = warranty?.warrantyStatus?.days_left;
                const daysExpired = warranty?.warrantyStatus?.days_expired;
                const daysDisplay = status === 'active' ? `${daysLeft} days remaining` : status === 'expired' ? `Expired ${daysExpired} days ago` : 'N/A';
                
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.productName}</td>
                    <td>${item.productModel || 'N/A'}</td>
                    <td>${warranty?.warrantyPeriodMonths || 12} months</td>
                    <td>${formatDate(warranty?.warrantyStartDate)}</td>
                    <td>${formatDate(warranty?.warrantyEndDate)}</td>
                    <td class="status-${status}">${status?.toUpperCase() || 'UNKNOWN'}</td>
                    <td>${daysDisplay}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>This is a computer generated warranty report</p>
            <p>For any warranty claims, please contact the store with this report</p>
          </div>
          
          <script>
            window.onload = function() { 
              setTimeout(function() {
                window.print(); 
                window.close();
              }, 200);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleViewProductDetails = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const summary = calculateWarrantySummary();

  // Styles
  const styles = {
    container: {
      padding: "30px 40px",
      backgroundColor: "#0a0c10",
      minHeight: "100vh",
      color: "#e5e7eb",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    shopHeader: {
      backgroundColor: "#1f2937",
      padding: "20px",
      borderRadius: "8px",
      border: "1px solid #374151",
      marginBottom: "20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "15px",
    },
    shopInfo: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      flex: 1,
    },
    shopLogo: {
      width: "60px",
      height: "60px",
      borderRadius: "8px",
      objectFit: "cover",
      marginRight: "15px",
    },
    shopName: {
      fontSize: "28px",
      fontWeight: "700",
      color: "#6366f1",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    companySelector: {
      backgroundColor: "#111827",
      padding: "8px 16px",
      borderRadius: "6px",
      cursor: "pointer",
      border: "1px solid #374151",
      transition: "all 0.2s",
    },
    companyDropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      backgroundColor: "#1f2937",
      border: "1px solid #374151",
      borderRadius: "6px",
      marginTop: "5px",
      zIndex: 100,
      minWidth: "200px",
      maxHeight: "300px",
      overflowY: "auto",
    },
    companyOption: {
      padding: "10px 15px",
      cursor: "pointer",
      transition: "background 0.2s",
      color: "#e5e7eb",
    },
    searchCard: {
      backgroundColor: "#1f2937",
      padding: "30px",
      borderRadius: "12px",
      border: "1px solid #374151",
      marginBottom: "30px",
    },
    searchBox: {
      display: "flex",
      gap: "15px",
      maxWidth: "600px",
      margin: "0 auto",
    },
    searchInput: {
      flex: 1,
      padding: "14px 18px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "8px",
      fontSize: "15px",
      outline: "none",
      transition: "border-color 0.2s",
    },
    searchButton: {
      padding: "14px 28px",
      backgroundColor: "#6366f1",
      color: "white",
      border: "none",
      borderRadius: "8px",
      fontSize: "15px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    message: {
      padding: "12px 20px",
      borderRadius: "6px",
      marginBottom: "20px",
      fontSize: "14px",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    successMessage: {
      backgroundColor: "rgba(5, 150, 105, 0.2)",
      color: "#34d399",
      border: "1px solid #059669",
    },
    errorMessage: {
      backgroundColor: "rgba(220, 38, 38, 0.2)",
      color: "#f87171",
      border: "1px solid #dc2626",
    },
    infoMessage: {
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      color: "#60a5fa",
      border: "1px solid #3b82f6",
    },
    loadingSpinner: {
      textAlign: "center",
      padding: "60px",
      color: "#9ca3af",
    },
    billInfoCard: {
      backgroundColor: "#1f2937",
      borderRadius: "12px",
      padding: "25px",
      marginBottom: "25px",
      border: "1px solid #374151",
    },
    cardHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      paddingBottom: "15px",
      borderBottom: "2px solid #374151",
    },
    billNumberBadge: {
      backgroundColor: "#6366f1",
      color: "white",
      padding: "6px 14px",
      borderRadius: "6px",
      fontWeight: "600",
      fontSize: "14px",
    },
    billDetails: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "15px",
    },
    detailRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px",
      backgroundColor: "#111827",
      borderRadius: "8px",
    },
    detailLabel: {
      fontWeight: "600",
      color: "#9ca3af",
    },
    detailValue: {
      color: "#f9fafb",
    },
    warrantyTableContainer: {
      backgroundColor: "#1f2937",
      borderRadius: "12px",
      padding: "25px",
      marginBottom: "25px",
      border: "1px solid #374151",
      overflowX: "auto",
    },
    warrantyTable: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: "1000px",
    },
    th: {
      backgroundColor: "#374151",
      padding: "12px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#f3f4f6",
      borderBottom: "1px solid #4b5563",
    },
    td: {
      padding: "12px",
      borderBottom: "1px solid #374151",
      fontSize: "13px",
      color: "#f9fafb",
    },
    warrantyStatusBadge: {
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      padding: "4px 10px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "600",
    },
    summaryStats: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "20px",
      marginTop: "20px",
    },
    statCard: {
      textAlign: "center",
      padding: "20px",
      background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
      borderRadius: "10px",
      border: "1px solid #374151",
      transition: "transform 0.3s",
    },
    statNumber: {
      fontSize: "36px",
      fontWeight: "bold",
      color: "#6366f1",
      marginBottom: "10px",
    },
    statLabel: {
      color: "#9ca3af",
      fontSize: "13px",
    },
    buttonGroup: {
      display: "flex",
      gap: "10px",
      marginTop: "20px",
      justifyContent: "flex-end",
    },
    button: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 14px",
      borderRadius: "6px",
      backgroundColor: "#374151",
      color: "#f9fafb",
      border: "1px solid #4b5563",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "500",
      transition: "all 0.2s",
    },
    primaryButton: {
      backgroundColor: "#6366f1",
      color: "#fff",
      border: "none",
    },
    successButton: {
      backgroundColor: "#059669",
      color: "#fff",
      border: "none",
    },
    actionButton: {
      padding: "6px 10px",
      margin: "0 2px",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      transition: "all 0.2s",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
    modal: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      backdropFilter: "blur(4px)",
    },
    modalContent: {
      backgroundColor: "#1f2937",
      padding: "30px",
      borderRadius: "12px",
      maxWidth: "500px",
      width: "95%",
      position: "relative",
      border: "1px solid #374151",
    },
    modalClose: {
      position: "absolute",
      top: "15px",
      right: "15px",
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.container}>
      {/* Shop Header - Only Warranty Management */}
      <div style={styles.shopHeader}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={styles.shopInfo}>
            <h1 style={styles.shopName}>
              <Shield size={32} color="#6366f1" />
              Warranty Management
            </h1>
          </div>
        </div>
        
        {companies.length > 0 && (
          <div style={{ position: 'relative' }}>
            <div 
              style={styles.companySelector}
              onClick={() => setShowCompanySelector(!showCompanySelector)}
            >
              <Building2 size={16} style={{ marginRight: '8px' }} />
              {companies.find(c => c.id === selectedCompanyId)?.name || 'Select Company'}
            </div>
            
            {showCompanySelector && (
              <div style={styles.companyDropdown}>
                {companies.map(company => (
                  <div
                    key={company.id}
                    style={{
                      ...styles.companyOption,
                      backgroundColor: selectedCompanyId === company.id ? '#374151' : 'transparent'
                    }}
                    onClick={() => handleCompanySelect(company)}
                  >
                    <Building2 size={14} style={{ marginRight: '8px', display: 'inline' }} />
                    {company.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message Display */}
      {message.text && (
        <div style={{
          ...styles.message,
          ...(message.type === "success" ? styles.successMessage : 
             message.type === "error" ? styles.errorMessage : 
             styles.infoMessage)
        }}>
          {message.type === "success" && <CheckCircle size={18} />}
          {message.type === "error" && <AlertCircle size={18} />}
          {message.type === "info" && <Filter size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Search Section */}
      <div style={styles.searchCard}>
        <div style={styles.searchBox}>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Enter Bill Number (e.g., BT-241201-ABC12345)"
            value={billNumber}
            onChange={(e) => setBillNumber(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button 
            style={styles.searchButton}
            onClick={searchWarranty}
            disabled={loading}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6366f1'}
          >
            {loading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
            {loading ? 'Searching...' : 'Search Warranty'}
          </button>
        </div>
      </div>

      {loading && (
        <div style={styles.loadingSpinner}>
          <RefreshCw size={30} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
          <div>Fetching warranty information...</div>
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#1f2937', borderRadius: '8px' }}>
          <AlertCircle size={48} color="#f87171" style={{ marginBottom: '15px' }} />
          <p style={{ color: '#f87171', fontSize: '16px' }}>{error}</p>
        </div>
      )}

      {searchPerformed && !loading && warrantyData && (
        <div>
          {/* Bill Information Card */}
          <div style={styles.billInfoCard}>
            <div style={styles.cardHeader}>
              <h2 style={{ margin: 0, color: '#f9fafb', fontSize: '20px' }}>
                <Receipt size={20} style={{ display: 'inline', marginRight: '8px' }} />
                Bill Information
              </h2>
              <span style={styles.billNumberBadge}>{warrantyData.billNumber}</span>
            </div>
            <div style={styles.billDetails}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Customer Name:</span>
                <span style={styles.detailValue}>{warrantyData.customerName || 'N/A'}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Customer Phone:</span>
                <span style={styles.detailValue}>{warrantyData.customerPhone || 'N/A'}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Customer Email:</span>
                <span style={styles.detailValue}>{warrantyData.customerEmail || 'N/A'}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Billed Date:</span>
                <span style={styles.detailValue}>{formatDateTime(warrantyData.billedDate)}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Total Amount:</span>
                <span style={{ ...styles.detailValue, fontWeight: 'bold', color: '#6366f1', fontSize: '16px' }}>
                  {formatCurrency(warrantyData.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Warranty Table */}
          <div style={styles.warrantyTableContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ margin: 0, color: '#f9fafb', fontSize: '20px' }}>
                <Shield size={20} style={{ display: 'inline', marginRight: '8px' }} />
                Product Warranty Status
              </h2>
              <div style={styles.buttonGroup}>
                <button 
                  style={{...styles.button, ...styles.primaryButton}}
                  onClick={handleExportExcel}
                >
                  <FileSpreadsheet size={14} /> Excel
                </button>
                <button 
                  style={{...styles.button, ...styles.successButton}}
                  onClick={handleExportPDF}
                >
                  <FileJson size={14} /> PDF
                </button>
                <button 
                  style={styles.button}
                  onClick={handlePrintWarranty}
                >
                  <Printer size={14} /> Print
                </button>
              </div>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.warrantyTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Product Name</th>
                    <th style={styles.th}>Model</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Price</th>
                    <th style={styles.th}>Warranty Period</th>
                    <th style={styles.th}>Warranty Start</th>
                    <th style={styles.th}>Warranty End</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Days Left/Expired</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {warrantyData.items.map((item, index) => {
                    const warranty = item.warranty;
                    const warrantyStatus = warranty?.warrantyStatus;
                    const statusConfig = getWarrantyStatusConfig(warrantyStatus?.status);
                    const isActive = warrantyStatus?.status === 'active';
                    const daysLeft = warrantyStatus?.days_left;
                    const daysExpired = warrantyStatus?.days_expired;
                    
                    return (
                      <tr key={item.productId || index}>
                        <td style={styles.td}>{index + 1}</td>
                        <td style={{...styles.td, fontWeight: '600'}}>{item.productName}</td>
                        <td style={styles.td}>{item.productModel || 'N/A'}</td>
                        <td style={styles.td}>{item.quantity}</td>
                        <td style={styles.td}>{formatCurrency(item.sellPrice)}</td>
                        <td style={styles.td}>{warranty?.warrantyPeriodMonths || 'N/A'} months</td>
                        <td style={styles.td}>{formatDate(warranty?.warrantyStartDate)}</td>
                        <td style={styles.td}>{formatDate(warranty?.warrantyEndDate)}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.warrantyStatusBadge,
                            backgroundColor: statusConfig.bgColor,
                            color: statusConfig.textColor
                          }}>
                            {statusConfig.icon} {statusConfig.label}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {isActive ? (
                            <span style={{ color: '#059669', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> {daysLeft} days remaining
                            </span>
                          ) : warrantyStatus?.status === 'expired' ? (
                            <span style={{ color: '#dc2626', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={12} /> Expired {daysExpired} days ago
                            </span>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>N/A</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <button
                            style={{...styles.actionButton, backgroundColor: '#3b82f6', color: 'white'}}
                            onClick={() => handleViewProductDetails(item)}
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Warranty Summary */}
          <div style={styles.billInfoCard}>
            <h3 style={{ marginBottom: '15px', color: '#f9fafb', fontSize: '18px' }}>
              <TrendingUp size={18} style={{ display: 'inline', marginRight: '8px' }} />
              Warranty Summary
            </h3>
            <div style={styles.summaryStats}>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{summary.total}</div>
                <div style={styles.statLabel}>Total Products</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{summary.active}</div>
                <div style={styles.statLabel}>Active Warranties</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{summary.expired}</div>
                <div style={styles.statLabel}>Expired Warranties</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statNumber}>{formatCurrency(summary.totalValue)}</div>
                <div style={styles.statLabel}>Total Value</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {searchPerformed && !loading && !warrantyData && !error && (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#1f2937', borderRadius: '8px' }}>
          <Search size={48} color="#9ca3af" style={{ marginBottom: '15px' }} />
          <h3 style={{ color: '#f9fafb', marginBottom: '10px' }}>No Results Found</h3>
          <p style={{ color: '#9ca3af' }}>Please enter a valid bill number to check warranty status.</p>
        </div>
      )}

      {/* Product Details Modal */}
      {showProductModal && selectedProduct && (
        <div style={styles.modal} onClick={() => setShowProductModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowProductModal(false)}>
              <X size={20} />
            </button>
            
            <h2 style={{ color: '#f9fafb', marginBottom: '20px', fontSize: '20px' }}>
              <Package size={20} style={{ display: 'inline', marginRight: '8px' }} />
              Product Details
            </h2>
            
            <div style={{ marginBottom: '15px' }}>
              <p style={{ color: '#9ca3af', marginBottom: '5px' }}>Product Name</p>
              <p style={{ color: '#f9fafb', fontWeight: '600', fontSize: '16px' }}>{selectedProduct.productName}</p>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <p style={{ color: '#9ca3af', marginBottom: '5px' }}>Model</p>
              <p style={{ color: '#f9fafb' }}>{selectedProduct.productModel || 'N/A'}</p>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <p style={{ color: '#9ca3af', marginBottom: '5px' }}>Quantity</p>
              <p style={{ color: '#f9fafb' }}>{selectedProduct.quantity}</p>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <p style={{ color: '#9ca3af', marginBottom: '5px' }}>Price</p>
              <p style={{ color: '#f9fafb' }}>{formatCurrency(selectedProduct.sellPrice)}</p>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <p style={{ color: '#9ca3af', marginBottom: '5px' }}>Total</p>
              <p style={{ color: '#f9fafb', fontWeight: '600' }}>{formatCurrency(selectedProduct.total)}</p>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <p style={{ color: '#9ca3af', marginBottom: '5px' }}>Warranty Period</p>
              <p style={{ color: '#f9fafb' }}>{selectedProduct.warranty?.warrantyPeriodMonths || 12} months</p>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <p style={{ color: '#9ca3af', marginBottom: '5px' }}>Warranty Start Date</p>
              <p style={{ color: '#f9fafb' }}>{formatDate(selectedProduct.warranty?.warrantyStartDate)}</p>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <p style={{ color: '#9ca3af', marginBottom: '5px' }}>Warranty End Date</p>
              <p style={{ color: '#f9fafb' }}>{formatDate(selectedProduct.warranty?.warrantyEndDate)}</p>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#9ca3af', marginBottom: '5px' }}>Warranty Status</p>
              <span style={{
                ...styles.warrantyStatusBadge,
                backgroundColor: getWarrantyStatusConfig(selectedProduct.warranty?.warrantyStatus?.status).bgColor,
                color: getWarrantyStatusConfig(selectedProduct.warranty?.warrantyStatus?.status).textColor
              }}>
                {getWarrantyStatusConfig(selectedProduct.warranty?.warrantyStatus?.status).icon}
                {getWarrantyStatusConfig(selectedProduct.warranty?.warrantyStatus?.status).label}
              </span>
            </div>
            
            <button
              style={{...styles.button, ...styles.primaryButton, width: '100%', justifyContent: 'center'}}
              onClick={() => setShowProductModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add keyframe animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default Warranty;