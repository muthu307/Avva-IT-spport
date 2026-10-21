import React, { useState, useEffect } from 'react';
import api, { API_BASE_URL } from '../utils/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, formatTime, formatDateTime, parseDateTime } from '../utils/dateUtils';
import { 
  Search, 
  Eye, 
  Printer, 
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Smartphone,
  FileText,
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
  Home,
  Briefcase,
  Users,
  TrendingUp,
  Wallet,
  Banknote,
  Landmark,
  MessageCircle,
  Building2,
  Store,
  Globe
} from 'lucide-react';

// Crown icon component for VIP customers
const Crown = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={props.size || 24} 
    height={props.size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M2 4l3 12h14l3-12-6 3-4-6-4 3-6-3z" />
  </svg>
);

const VisitBillPage = () => {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [copiedBillNo, setCopiedBillNo] = useState(null);
  const [whatsappStatus, setWhatsappStatus] = useState({});
  
  // Company/Shop Details from Backend
  const [companyDetails, setCompanyDetails] = useState({
    name: "Avva Inventory",
    address: "No.71, M.T.H.road (Opp padi post office)",
    city: "Padi, Chennai - 600 050",
    phone: "98657 09626",
    email: "",
    gst: "",
    logo: null,
    logoUrl: null
  });
  
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [filterCustomerType, setFilterCustomerType] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [sortBy, setSortBy] = useState('newest');


  // Payment method icons and colors
  const paymentMethodMap = {
    cash: { icon: <DollarSign size={14} />, color: '#059669', label: 'Cash' },
    card: { icon: <CreditCard size={14} />, color: '#3b82f6', label: 'Card' },
    upi: { icon: <Smartphone size={14} />, color: '#8b5cf6', label: 'UPI' },
    cheque: { icon: <FileText size={14} />, color: '#f59e0b', label: 'Cheque' },
    mixed: { icon: <Filter size={14} />, color: '#6b7280', label: 'Mixed' }
  };

  // Customer type icons and colors
  const customerTypeMap = {
    internal: { icon: <Briefcase size={14} />, color: '#3b82f6', label: 'Internal' },
    external: { icon: <Users size={14} />, color: '#f59e0b', label: 'External' },
    regular: { icon: <User size={14} />, color: '#6b7280', label: 'Regular' },
    wholesale: { icon: <TrendingUp size={14} />, color: '#8b5cf6', label: 'Wholesale' },
    vip: { icon: <Crown size={14} />, color: '#d97706', label: 'VIP' },
    corporate: { icon: <Briefcase size={14} />, color: '#2563eb', label: 'Corporate' }
  };

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Load bills on component mount
  useEffect(() => {
    if (selectedCompanyId) {
      fetchBills();
    }
  }, [selectedCompanyId]);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    applyFilters();
  }, [bills, searchTerm, filterPaymentMethod, filterCustomerType, dateRange, sortBy]);

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

  // Fetch companies from backend
  const fetchCompanies = async () => {
    setLoadingCompany(true);
    try {
      const response = await api.get('/companies/list');
      console.log('Companies response:', response.data);
      
      if (response.data && response.data.length > 0) {
        setCompanies(response.data);
        // Auto-select first company
        const firstCompany = response.data[0];
        setSelectedCompanyId(firstCompany.id);
        await fetchCompanyDetails(firstCompany.id);
      } else {
        // Use default company details
        setCompanyDetails({
          name: "Avva Inventory",
          address: "No.71, M.T.H.road (Opp padi post office)",
          city: "Padi, Chennai - 600 050",
          phone: "98657 09626",
          email: "",
          gst: "",
          logo: null,
          logoUrl: null
        });
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      showMessage("error", "❌ Failed to fetch company details");
      // Use default company details
      setCompanyDetails({
        name: "Avva Inventory",
        address: "No.71, M.T.H.road (Opp padi post office)",
        city: "Padi, Chennai - 600 050",
        phone: "93423 01582",
        email: "",
        gst: "",
        logo: null,
        logoUrl: null
      });
    } finally {
      setLoadingCompany(false);
    }
  };

  // Fetch company details by ID
  const fetchCompanyDetails = async (companyId) => {
    try {
      const response = await api.get(`/companies/${companyId}`);
      console.log('Company details:', response.data);
      
      const company = response.data;
      setCompanyDetails({
        name: company.name || "Avva Inventory",
        address: company.address || "No.71, M.T.H.road (Opp padi post office)",
        city: company.city || "Padi, Chennai - 600 050",
        phone: company.phone || "93423 01582",
        email: company.email || "",
        gst: company.gst_number || company.gst || "",
        logo: company.logo || null,
        logoUrl: company.logo_url || null
      });
    } catch (err) {
      console.error('Error fetching company details:', err);
      // Keep existing company details if fetch fails
    }
  };

  // Handle company selection
  const handleCompanySelect = async (company) => {
    setSelectedCompanyId(company.id);
    setShowCompanySelector(false);
    await fetchCompanyDetails(company.id);
    showMessage("success", `✅ Switched to ${company.name}`);
    fetchBills(); // Refresh bills for the selected company
  };

  const fetchBills = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Build query string to request all bills and filter by selected company if set
      let queryParams = `?per_page=500`;
      if (selectedCompanyId) {
        queryParams += `&company_id=${selectedCompanyId}`;
      }
      
      // Try different possible endpoints
      const endpoints = [
        `${API_BASE_URL}/billing/bills${queryParams}`,
        `${API_BASE_URL}/bills${queryParams}`,
        `${API_BASE_URL}/visit-bills${queryParams}`,
        `${API_BASE_URL}/billing/visit-bills${queryParams}`
      ];
      
      let response = null;
      let success = false;
      
      for (const endpoint of endpoints) {
        try {
          console.log('Trying endpoint:', endpoint);
          response = await api.get(endpoint);
          if (response.data) {
            success = true;
            console.log('Success with endpoint:', endpoint);
            break;
          }
        } catch (err) {
          console.log(`Endpoint ${endpoint} failed:`, err.message);
        }
      }
      
      if (!success || !response) {
        throw new Error('Could not fetch bills from any endpoint');
      }
      
      console.log('API Response:', response.data);
      
      // Extract bills data from response
      let billsData = [];
      
      if (Array.isArray(response.data)) {
        billsData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        billsData = response.data.data;
      } else if (response.data.bills && Array.isArray(response.data.bills)) {
        billsData = response.data.bills;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        billsData = response.data.results;
      } else if (typeof response.data === 'object') {
        // Try to find any array property
        for (const key in response.data) {
          if (Array.isArray(response.data[key])) {
            billsData = response.data[key];
            break;
          }
        }
      }
      
      if (billsData.length === 0) {
        console.log('No bills data found in response');
        setBills([]);
        setFilteredBills([]);
        showMessage("info", "ℹ️ No bills found");
        setLoading(false);
        return;
      }
      
      // Process bills to ensure all fields are properly mapped
      const processedBills = billsData.map(bill => {
        // Handle discount - it could be amount or percentage
        let discountValue = parseFloat(bill.discount || bill.discount_amount || 0);
        let discountType = bill.discountType || bill.discount_type || 'amount';
        let subtotal = parseFloat(bill.subtotal || bill.sub_total || 0);
        
        // Calculate actual discount amount
        let discountAmount = discountValue;
        if (discountType === 'percentage' && subtotal > 0) {
          discountAmount = (subtotal * discountValue) / 100;
        }
        
        return {
          id: bill.id || bill._id || Math.random().toString(),
          billNumber: bill.billNumber || bill.bill_number || bill.billNo || bill.invoiceNo || `BILL-${Date.now()}`,
          customerName: bill.customerName || bill.customer_name || bill.customer?.name || 'Walk-in Customer',
          customerPhone: bill.customerPhone || bill.customer_phone || bill.customer?.phone || '',
          customerEmail: bill.customerEmail || bill.customer_email || bill.customer?.email || '',
          customerGst: bill.customerGst || bill.customer_gst || bill.customer?.gst || '',
          customerAddress: bill.customerAddress || bill.customer_address || bill.customer?.address || '',
          customerType: bill.customerType || bill.customer_type || bill.customer?.type || 'external',
          subtotal: subtotal,
          discountValue: discountValue,
          discountAmount: discountAmount,
          discountType: discountType,
          tax: parseFloat(bill.tax || bill.taxAmount || 0),
          taxType: bill.taxType || bill.tax_type || 'percentage',
          total: parseFloat(bill.total || bill.grandTotal || bill.amount || 0),
          paidAmount: parseFloat(bill.paidAmount || bill.paid_amount || bill.paid || 0),
          changeAmount: parseFloat(bill.changeAmount || bill.change_amount || bill.change || 0),
          paymentMethod: bill.paymentMethod || bill.payment_method || bill.payment?.method || 'cash',
          createdAt: bill.createdAt || bill.created_at || bill.date || new Date().toISOString(),
          updatedAt: bill.updatedAt || bill.updated_at,
          createdBy: bill.createdBy || bill.created_by,
          items: Array.isArray(bill.items) ? bill.items.map(item => ({
            id: item.id || item._id,
            productId: item.productId || item.product_id || item.product,
            productName: item.productName || item.product_name || item.name || 'Unknown',
            productModel: item.productModel || item.product_model || item.model || '',
            productType: item.productType || item.product_type || item.type || '',
            sellPrice: parseFloat(item.sellPrice || item.sell_price || item.price || 0),
            quantity: parseInt(item.quantity || item.qty || 1),
            total: parseFloat(item.total || item.subtotal || 0),
          })) : [],
          payments: Array.isArray(bill.payments) ? bill.payments.map(payment => ({
            id: payment.id || payment._id,
            paymentId: payment.paymentId || payment.payment_id,
            amount: parseFloat(payment.amount || 0),
            method: payment.method || 'cash',
            status: payment.status || 'completed',
            reference: payment.reference || '',
            notes: payment.notes || '',
            createdAt: payment.createdAt || payment.created_at
          })) : []
        };
      });
      
      // Calculate item count and due amount for each bill
      processedBills.forEach(bill => {
        bill.itemCount = bill.itemCount || (bill.items ? bill.items.length : 0);
        bill.dueAmount = bill.total - bill.paidAmount;
      });
      
      // Filter to show bills (matching BT series or fallback to all bills if none filtered)
      const btBills = processedBills.filter(bill => 
        bill.billNumber && bill.billNumber.toUpperCase().startsWith('BT')
      );
      const displayBills = btBills.length > 0 ? btBills : processedBills;
      
      console.log('Processed Bills:', displayBills);
      
      setBills(displayBills);
      setFilteredBills(displayBills);
      
      showMessage("success", `✅ Loaded ${displayBills.length} bills successfully!`);
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load bills. Please try again.');
      showMessage("error", "❌ Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  const fetchBillDetails = async (billId) => {
    try {
      setLoading(true);
      
      // First check if we already have the bill in state
      const existingBill = bills.find(b => b.id === billId);
      if (existingBill && existingBill.items && existingBill.items.length > 0) {
        console.log('Using existing bill data');
        setSelectedBill(existingBill);
        setShowBillModal(true);
        setLoading(false);
        return;
      }
      
      // Try different endpoints for single bill
      const endpoints = [
        `${API_BASE_URL}/billing/bills/${billId}`,
        `${API_BASE_URL}/bills/${billId}`,
        `${API_BASE_URL}/visit-bills/${billId}`,
        `${API_BASE_URL}/billing/visit-bills/${billId}`
      ];
      
      let response = null;
      let success = false;
      
      for (const endpoint of endpoints) {
        try {
          console.log('Trying details endpoint:', endpoint);
          response = await api.get(endpoint);
          if (response.data) {
            success = true;
            console.log('Success with details endpoint:', endpoint);
            break;
          }
        } catch (err) {
          console.log(`Endpoint ${endpoint} failed:`, err.message);
        }
      }
      
      if (!success || !response) {
        // If API fails, use the existing bill data
        const billFromList = bills.find(b => b.id === billId);
        if (billFromList) {
          console.log('Using bill from list as fallback');
          setSelectedBill(billFromList);
          setShowBillModal(true);
          setLoading(false);
          return;
        }
        throw new Error('Could not fetch bill details');
      }
      
      console.log('Bill Details Response:', response.data);
      
      // Process the bill data
      const billData = response.data;
      
      // Handle discount - it could be amount or percentage
      let discountValue = parseFloat(billData.discount || billData.discount_amount || 0);
      let discountType = billData.discountType || billData.discount_type || 'amount';
      let subtotal = parseFloat(billData.subtotal || billData.sub_total || 0);
      
      // Calculate actual discount amount
      let discountAmount = discountValue;
      if (discountType === 'percentage' && subtotal > 0) {
        discountAmount = (subtotal * discountValue) / 100;
      }
      
      const processedBill = {
        id: billData.id || billData._id || billId,
        billNumber: billData.billNumber || billData.bill_number || billData.billNo || 'N/A',
        customerName: billData.customerName || billData.customer_name || billData.customer?.name || 'Walk-in Customer',
        customerPhone: billData.customerPhone || billData.customer_phone || billData.customer?.phone || '',
        customerEmail: billData.customerEmail || billData.customer_email || billData.customer?.email || '',
        customerGst: billData.customerGst || billData.customer_gst || billData.customer?.gst || '',
        customerAddress: billData.customerAddress || billData.customer_address || billData.customer?.address || '',
        customerType: billData.customerType || billData.customer_type || billData.customer?.type || 'external',
        subtotal: subtotal,
        discountValue: discountValue,
        discountAmount: discountAmount,
        discountType: discountType,
        tax: parseFloat(billData.tax || billData.taxAmount || 0),
        taxType: billData.taxType || billData.tax_type || 'percentage',
        total: parseFloat(billData.total || billData.grandTotal || billData.amount || 0),
        paidAmount: parseFloat(billData.paidAmount || billData.paid_amount || billData.paid || 0),
        changeAmount: parseFloat(billData.changeAmount || billData.change_amount || billData.change || 0),
        paymentMethod: billData.paymentMethod || billData.payment_method || billData.payment?.method || 'cash',
        createdAt: billData.createdAt || billData.created_at || billData.date || new Date().toISOString(),
        updatedAt: billData.updatedAt || billData.updated_at,
        createdBy: billData.createdBy || billData.created_by,
        items: Array.isArray(billData.items) ? billData.items.map(item => ({
          id: item.id || item._id,
          productId: item.productId || item.product_id || item.product,
          productName: item.productName || item.product_name || item.name || 'Unknown',
          productModel: item.productModel || item.product_model || item.model || '',
          productType: item.productType || item.product_type || item.type || '',
          sellPrice: parseFloat(item.sellPrice || item.sell_price || item.price || 0),
          quantity: parseInt(item.quantity || item.qty || 1),
          total: parseFloat(item.total || item.subtotal || 0),
        })) : [],
        payments: Array.isArray(billData.payments) ? billData.payments.map(payment => ({
          id: payment.id || payment._id,
          paymentId: payment.paymentId || payment.payment_id,
          amount: parseFloat(payment.amount || 0),
          method: payment.method || 'cash',
          status: payment.status || 'completed',
          reference: payment.reference || '',
          notes: payment.notes || '',
          createdAt: payment.createdAt || payment.created_at
        })) : []
      };
      
      // Calculate item count and due amount
      processedBill.itemCount = processedBill.items.length;
      processedBill.dueAmount = processedBill.total - processedBill.paidAmount;
      
      console.log('Processed Bill Details:', processedBill);
      
      setSelectedBill(processedBill);
      setShowBillModal(true);
    } catch (err) {
      console.error('Error fetching bill details:', err);
      
      // Try to use the bill from the list as fallback
      const billFromList = bills.find(b => b.id === billId);
      if (billFromList) {
        console.log('Using bill from list as fallback after error');
        setSelectedBill(billFromList);
        setShowBillModal(true);
      } else {
        showMessage("error", "❌ Failed to load bill details");
      }
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp share function with company details
  const handleWhatsAppShare = (bill) => {
    if (!bill.customerPhone) {
      showMessage("error", "❌ No phone number available for this customer");
      return;
    }

    // Show sending status
    setWhatsappStatus(prev => ({ ...prev, [bill.id]: 'sending' }));

    // Clean phone number (remove non-digits)
    const cleanPhone = bill.customerPhone.replace(/\D/g, '');
    
    // Check if phone number is valid
    if (cleanPhone.length < 10) {
      showMessage("error", "❌ Please enter a valid 10-digit phone number");
      setWhatsappStatus(prev => ({ ...prev, [bill.id]: 'error' }));
      setTimeout(() => {
        setWhatsappStatus(prev => ({ ...prev, [bill.id]: null }));
      }, 2000);
      return;
    }

    // Format phone number for WhatsApp (add country code if not present)
    const whatsappNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    // Create message with company details
    const dueAmount = (bill.total || 0) - (bill.paidAmount || 0);
    const items = bill.items || [];
    
    let message = `*${companyDetails.name}*\n`;
    message += `${companyDetails.address}\n`;
    message += `${companyDetails.city}\n`;
    if (companyDetails.phone) message += `Ph: ${companyDetails.phone}\n`;
    if (companyDetails.email) message += `Email: ${companyDetails.email}\n`;
    if (companyDetails.gst) message += `GST: ${companyDetails.gst}\n`;
    message += `═══════════════════════\n`;
    message += `*BILL DETAILS*\n`;
    message += `═══════════════════════\n`;
    message += `*Bill No:* ${bill.billNumber}\n`;
    message += `*Date:* ${formatDate(bill.createdAt)}\n`;
    message += `*Time:* ${formatTime(bill.createdAt)}\n`;
    message += `*Customer:* ${bill.customerName || 'Walk-in Customer'}\n`;
    message += `*Type:* ${(bill.customerType || 'external').toUpperCase()}\n`;
    
    if (bill.customerPhone) {
      message += `*Phone:* ${bill.customerPhone}\n`;
    }
    
    message += `═══════════════════════\n`;
    message += `*ITEMS PURCHASED:*\n`;
    
    items.slice(0, 5).forEach(item => {
      const productName = item.productName || item.product_name || 'Unknown';
      const qty = item.quantity || 0;
      const price = parseFloat(item.sellPrice || item.sell_price || 0);
      const total = parseFloat(item.total || 0);
      message += `• ${productName.substring(0, 20)}${productName.length > 20 ? '...' : ''}\n`;
      message += `  ${qty} x ₹${price.toFixed(2)} = ₹${total.toFixed(2)}\n`;
    });
    
    if (items.length > 5) {
      message += `  ...and ${items.length - 5} more items\n`;
    }
    
    message += `═══════════════════════\n`;
    message += `*Subtotal:* ₹${(bill.subtotal || 0).toFixed(2)}\n`;
    
    if (bill.discountAmount > 0) {
      if (bill.discountType === 'percentage') {
        message += `*Discount:* ${bill.discountValue}% (₹${bill.discountAmount.toFixed(2)})\n`;
      } else {
        message += `*Discount:* ₹${bill.discountAmount.toFixed(2)}\n`;
      }
    }
    
    if (bill.tax > 0) {
      message += `*Tax:* ₹${(bill.tax || 0).toFixed(2)}\n`;
    }
    
    message += `*TOTAL AMOUNT:* ₹${(bill.total || 0).toFixed(2)}\n`;
    message += `*Paid:* ₹${(bill.paidAmount || 0).toFixed(2)}\n`;
    
    if (dueAmount > 0) {
      message += `*Due:* ₹${dueAmount.toFixed(2)}\n`;
    }
    
    if (bill.changeAmount > 0) {
      message += `*Change:* ₹${bill.changeAmount.toFixed(2)}\n`;
    }
    
    message += `*Payment Method:* ${(bill.paymentMethod || 'cash').toUpperCase()}\n`;
    message += `═══════════════════════\n`;
    message += `Thank you for shopping with us!\n`;
    message += `Goods once sold will not be taken back\n`;
    message += `** Computer generated bill **\n`;

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Open WhatsApp
    window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
    
    // Update status
    setWhatsappStatus(prev => ({ ...prev, [bill.id]: 'sent' }));
    showMessage("success", "✅ WhatsApp opened successfully!");
    
    setTimeout(() => {
      setWhatsappStatus(prev => ({ ...prev, [bill.id]: null }));
    }, 3000);
  };

  const applyFilters = () => {
    let filtered = [...bills];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(bill => 
        (bill.billNumber?.toLowerCase().includes(term)) ||
        (bill.customerName?.toLowerCase().includes(term)) ||
        (bill.customerPhone?.toLowerCase().includes(term)) ||
        (bill.customerEmail?.toLowerCase().includes(term)) ||
        (bill.customerGst?.toLowerCase().includes(term))
      );
    }

    // Payment method filter
    if (filterPaymentMethod !== 'all') {
      filtered = filtered.filter(bill => 
        bill.paymentMethod?.toLowerCase() === filterPaymentMethod.toLowerCase()
      );
    }

    // Customer type filter
    if (filterCustomerType !== 'all') {
      filtered = filtered.filter(bill => 
        bill.customerType?.toLowerCase() === filterCustomerType.toLowerCase()
      );
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(bill => {
        const billDate = parseDateTime(bill.createdAt);
        return billDate >= start && billDate <= end;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'newest':
          return parseDateTime(b.createdAt) - parseDateTime(a.createdAt);
        case 'oldest':
          return parseDateTime(a.createdAt) - parseDateTime(b.createdAt);
        case 'highest':
          return (b.total || 0) - (a.total || 0);
        case 'lowest':
          return (a.total || 0) - (b.total || 0);
        default:
          return 0;
      }
    });

    setFilteredBills(filtered);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterPaymentMethod('all');
    setFilterCustomerType('all');
    setDateRange({ start: '', end: '' });
    setSortBy('newest');
    setFilteredBills(bills);
    setCurrentPage(1);
    showMessage("info", "🔍 Filters cleared");
  };

  const handleExportExcel = () => {
    try {
      const exportData = filteredBills.map(bill => ({
        'Bill Number': bill.billNumber || '',
        'Date': formatDate(bill.createdAt),
        'Time': formatTime(bill.createdAt),
        'Customer Name': bill.customerName || 'Walk-in Customer',
        'Customer Phone': bill.customerPhone || '',
        'Customer Email': bill.customerEmail || '',
        'Customer Type': (bill.customerType || 'external').toUpperCase(),
        'Items Count': bill.itemCount || 0,
        'Subtotal (₹)': (bill.subtotal || 0).toFixed(2),
        'Discount Value': bill.discountType === 'percentage' ? `${bill.discountValue}%` : `₹${bill.discountValue.toFixed(2)}`,
        'Discount Amount (₹)': (bill.discountAmount || 0).toFixed(2),
        'Discount Type': bill.discountType || 'amount',
        'Tax (₹)': (bill.tax || 0).toFixed(2),
        'Total (₹)': (bill.total || 0).toFixed(2),
        'Paid (₹)': (bill.paidAmount || 0).toFixed(2),
        'Change (₹)': (bill.changeAmount || 0).toFixed(2),
        'Due (₹)': ((bill.total || 0) - (bill.paidAmount || 0)).toFixed(2),
        'Payment Method': (bill.paymentMethod || 'cash').toUpperCase()
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Bills");

      const wscols = [
        { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 15 },
        { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 },
        { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 15 }
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
      saveAs(file, `Bills_${date}.xlsx`);
      
      showMessage("success", `✅ Exported ${filteredBills.length} bills to Excel`);
    } catch (err) {
      console.error("Export error:", err);
      showMessage("error", "❌ Failed to export to Excel");
    }
  };

  // Helper for safe autoTable invocation
  const callAutoTable = (doc, options) => {
    if (typeof autoTable === 'function') {
      autoTable(doc, options);
    } else if (typeof doc.autoTable === 'function') {
      doc.autoTable(options);
    } else {
      console.error('autoTable function not found');
    }
  };

  const safeNum = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const handleExportPDF = () => {
    try {
      // Use LANDSCAPE mode so all 11 columns fit comfortably without truncation
      const doc = new jsPDF('landscape');
      const pageWidth = doc.internal.pageSize.width || 297;
      const pageHeight = doc.internal.pageSize.height || 210;

      // 1. Company Header
      doc.setFontSize(18);
      doc.setTextColor(37, 99, 235); // #2563eb Primary Blue
      doc.setFont('helvetica', 'bold');
      doc.text(companyDetails.name || 'Avva Inventory', 14, 18);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const companySub = `${companyDetails.address || ''} | Ph: ${companyDetails.phone || ''} | GST: ${companyDetails.gst || ''}`;
      doc.text(companySub, 14, 24);

      // Blue Divider
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.8);
      doc.line(14, 28, pageWidth - 14, 28);

      // 2. Title & Date
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('BILLS & SALES REPORT', 14, 36);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${formatDateTime(new Date())}`, pageWidth - 14, 36, { align: 'right' });

      // 3. Active Filters Bar
      let currentY = 41;
      const activeFilters = [];
      if (searchTerm) activeFilters.push(`Search: "${searchTerm}"`);
      if (filterPaymentMethod && filterPaymentMethod !== 'all') activeFilters.push(`Method: ${filterPaymentMethod}`);
      if (filterCustomerType && filterCustomerType !== 'all') activeFilters.push(`Customer: ${filterCustomerType}`);
      if (dateRange.start && dateRange.end) activeFilters.push(`Date Range: ${dateRange.start} to ${dateRange.end}`);

      if (activeFilters.length > 0) {
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, currentY, pageWidth - 28, 9, 2, 2, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(`Active Filters: ${activeFilters.join('  |  ')}`, 18, currentY + 6);
        currentY += 12;
      } else {
        currentY += 2;
      }

      // 4. Financial KPI Summary Cards (5 columns across landscape page)
      const totalAmount = filteredBills.reduce((sum, bill) => sum + safeNum(bill.total), 0);
      const totalPaid = filteredBills.reduce((sum, bill) => sum + safeNum(bill.paidAmount), 0);
      const totalDue = totalAmount - totalPaid;
      const totalDiscount = filteredBills.reduce((sum, bill) => sum + safeNum(bill.discountAmount), 0);

      const cardGap = 5;
      const totalCards = 5;
      const totalCardWidth = pageWidth - 28 - (cardGap * (totalCards - 1));
      const cardW = totalCardWidth / totalCards;

      const kpis = [
        { label: 'TOTAL BILLS', value: `${filteredBills.length}`, bg: [248, 250, 252], border: [203, 213, 225], text: [30, 41, 59] },
        { label: 'TOTAL SALES', value: `Rs. ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, bg: [238, 242, 255], border: [199, 210, 254], text: [67, 56, 202] },
        { label: 'TOTAL DISCOUNT', value: `Rs. ${totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, bg: [254, 242, 242], border: [254, 202, 202], text: [153, 27, 27] },
        { label: 'TOTAL RECEIVED', value: `Rs. ${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, bg: [240, 253, 244], border: [187, 247, 208], text: [22, 101, 52] },
        { label: 'TOTAL DUE', value: `Rs. ${totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, bg: [255, 251, 235], border: [253, 230, 138], text: [146, 64, 14] },
      ];

      kpis.forEach((kpi, idx) => {
        const xPos = 14 + idx * (cardW + cardGap);
        doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
        doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
        doc.setLineWidth(0.4);
        doc.roundedRect(xPos, currentY, cardW, 15, 2, 2, 'FD');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, xPos + 4, currentY + 5.5);

        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
        doc.text(kpi.value, xPos + 4, currentY + 11.5);
      });

      currentY += 20;

      // 5. Perfectly Aligned & Styled Table
      const tableColumn = [
        'Bill No', 'Date', 'Customer', 'Type', 'Items', 'Subtotal', 'Discount',
        'Total', 'Paid', 'Due', 'Method'
      ];

      const tableRows = filteredBills.map(bill => {
        let discountDisplay = '';
        if (bill.discountType === 'percentage') {
          discountDisplay = `${safeNum(bill.discountValue)}%`;
        } else {
          discountDisplay = `Rs. ${safeNum(bill.discountAmount).toFixed(2)}`;
        }

        return [
          bill.billNumber || '',
          formatDate(bill.createdAt),
          bill.customerName || 'Walk-in Customer',
          (bill.customerType || 'regular').toUpperCase(),
          bill.itemCount || 0,
          `Rs. ${safeNum(bill.subtotal).toFixed(2)}`,
          discountDisplay,
          `Rs. ${safeNum(bill.total).toFixed(2)}`,
          `Rs. ${safeNum(bill.paidAmount).toFixed(2)}`,
          `Rs. ${(safeNum(bill.total) - safeNum(bill.paidAmount)).toFixed(2)}`,
          (bill.paymentMethod || 'cash').toUpperCase()
        ];
      });

      callAutoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: currentY,
        styles: {
          fontSize: 7.5,
          cellPadding: 3,
          font: 'helvetica',
          textColor: [30, 41, 59],
          overflow: 'ellipsize' // Default all cells to single-line ellipsize
        },
        headStyles: {
          fillColor: [30, 64, 175], // Deep Blue #1e40af
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 26, overflow: 'linebreak' }, // Bill No (only field allowed to wrap)
          1: { halign: 'center', cellWidth: 22, overflow: 'ellipsize' }, // Date
          2: { halign: 'left',   cellWidth: 52, overflow: 'ellipsize' }, // Customer Name
          3: { halign: 'center', cellWidth: 22, overflow: 'ellipsize' }, // Type
          4: { halign: 'center', cellWidth: 14, overflow: 'ellipsize' }, // Items
          5: { halign: 'right',  cellWidth: 25, overflow: 'ellipsize' }, // Subtotal
          6: { halign: 'right',  cellWidth: 21, overflow: 'ellipsize' }, // Discount
          7: { halign: 'right',  cellWidth: 25, overflow: 'ellipsize' }, // Total
          8: { halign: 'right',  cellWidth: 22, overflow: 'ellipsize' }, // Paid
          9: { halign: 'right',  cellWidth: 20, overflow: 'ellipsize' }, // Due
          10: { halign: 'center', cellWidth: 20, overflow: 'ellipsize' }  // Method
        },
        didDrawPage: (data) => {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(148, 163, 184);
          doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
          doc.text('Avva Inventory Billing System', 14, pageHeight - 8);
        }
      });

      const date = new Date().toISOString().split('T')[0];
      doc.save(`Bills_Report_${date}.pdf`);

      showMessage("success", `✅ Exported ${filteredBills.length} bills to PDF`);
    } catch (err) {
      console.error("PDF export error:", err);
      showMessage("error", "❌ Failed to export to PDF");
    }
  };

  const handlePrintBill = (bill) => {
    const printWindow = window.open('', '_blank');
    
    const processedBill = {
      ...bill,
      subtotal: parseFloat(bill.subtotal) || 0,
      discountValue: parseFloat(bill.discountValue) || 0,
      discountAmount: parseFloat(bill.discountAmount) || 0,
      discountType: bill.discountType || 'amount',
      tax: parseFloat(bill.tax) || 0,
      total: parseFloat(bill.total) || 0,
      paidAmount: parseFloat(bill.paidAmount) || 0,
      changeAmount: parseFloat(bill.changeAmount) || 0,
      dueAmount: (parseFloat(bill.total) || 0) - (parseFloat(bill.paidAmount) || 0)
    };
    
    // Format discount display
    let discountDisplay = '';
    if (processedBill.discountType === 'percentage') {
      discountDisplay = `${processedBill.discountValue}% (₹${processedBill.discountAmount.toFixed(2)})`;
    } else {
      discountDisplay = `₹${processedBill.discountAmount.toFixed(2)}`;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Bill - ${processedBill.billNumber}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              padding: 20px; 
              max-width: 300px; 
              margin: 0 auto; 
              background: #fff; 
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
            }
            .header h1 { 
              font-size: 24px; 
              margin-bottom: 2px; 
              color: #000; 
            }
            .header h3 {
              font-size: 14px;
              margin: 2px 0;
              color: #333;
            }
            .header p { 
              margin: 2px 0; 
              font-size: 12px; 
              color: #333; 
            }
            .logo {
              max-width: 80px;
              max-height: 80px;
              margin-bottom: 10px;
            }
            .info { 
              border-top: 1px dashed #000; 
              border-bottom: 1px dashed #000; 
              padding: 10px 0; 
              margin: 15px 0; 
            }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              font-size: 12px; 
              margin-bottom: 3px; 
              color: #000; 
            }
            .customer-section {
              margin: 10px 0;
              padding: 8px;
              background: #f9f9f9;
              border: 1px solid #ddd;
            }
            .customer-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 3px;
            }
            .customer-type {
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 10px;
              font-weight: bold;
              background: ${processedBill.customerType === 'internal' ? '#cce5ff' : '#fff3cd'};
              color: ${processedBill.customerType === 'internal' ? '#004085' : '#856404'};
            }
            .items { 
              margin: 15px 0; 
            }
            .item-header { 
              display: grid; 
              grid-template-columns: 2fr 1fr 1fr 1fr; 
              font-weight: bold; 
              font-size: 11px; 
              border-bottom: 1px solid #000; 
              padding-bottom: 5px; 
              color: #000; 
            }
            .item { 
              display: grid; 
              grid-template-columns: 2fr 1fr 1fr 1fr; 
              font-size: 11px; 
              padding: 3px 0; 
              border-bottom: 1px dotted #ccc; 
              color: #000; 
            }
            .summary { 
              margin: 15px 0; 
              border-top: 1px solid #000; 
              padding-top: 10px; 
            }
            .summary-row { 
              display: flex; 
              justify-content: space-between; 
              font-size: 12px; 
              margin-bottom: 3px; 
              color: #000; 
            }
            .total { 
              font-weight: bold; 
              font-size: 14px; 
              border-top: 1px dashed #000; 
              padding-top: 5px; 
              margin-top: 5px; 
              color: #000; 
            }
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              font-size: 10px; 
              border-top: 1px dashed #000; 
              padding-top: 10px; 
              color: #666; 
            }
            .amount-due {
              font-weight: bold;
              color: ${processedBill.dueAmount > 0 ? '#dc2626' : '#059669'};
            }
            .shop-details {
              margin-bottom: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/avva-logo.jpeg" class="logo" alt="Avva Inventory Logo" />
            <h1>${companyDetails.name}</h1>
            <p>${companyDetails.address}</p>
            <p>${companyDetails.city}</p>
            ${companyDetails.phone ? `<p>Phone: ${companyDetails.phone}</p>` : ''}
            ${companyDetails.gst ? `<p>GST: ${companyDetails.gst}</p>` : ''}
          </div>
          
          <div class="info">
            <div class="info-row"><span>Bill No:</span><span>${processedBill.billNumber}</span></div>
            <div class="info-row"><span>Date:</span><span>${formatDate(processedBill.createdAt)}</span></div>
            <div class="info-row"><span>Time:</span><span>${formatTime(processedBill.createdAt)}</span></div>
          </div>
          
          <div class="customer-section">
            <div class="customer-row">
              <span><strong>Customer Type:</strong></span>
              <span class="customer-type">${(processedBill.customerType || 'external').toUpperCase()}</span>
            </div>
            <div class="customer-row">
              <span><strong>Name:</strong></span>
              <span>${processedBill.customerName || 'Walk-in Customer'}</span>
            </div>
            ${processedBill.customerPhone ? `
            <div class="customer-row">
              <span><strong>Phone:</strong></span>
              <span>${processedBill.customerPhone}</span>
            </div>` : ''}
            ${processedBill.customerEmail ? `
            <div class="customer-row">
              <span><strong>Email:</strong></span>
              <span>${processedBill.customerEmail}</span>
            </div>` : ''}
            ${processedBill.customerAddress ? `
            <div class="customer-row">
              <span><strong>Address:</strong></span>
              <span>${processedBill.customerAddress}</span>
            </div>` : ''}
            ${processedBill.customerGst ? `
            <div class="customer-row">
              <span><strong>GST:</strong></span>
              <span>${processedBill.customerGst}</span>
            </div>` : ''}
          </div>
          
          <div class="items">
            <div class="item-header">
              <span>Item</span>
              <span>Price</span>
              <span>Qty</span>
              <span>Total</span>
            </div>
            ${processedBill.items && processedBill.items.length > 0 ? processedBill.items.map(item => {
              const productName = item.productName || item.product_name || 'Unknown';
              const productModel = item.productModel || item.product_model || '';
              const sellPrice = parseFloat(item.sellPrice || item.sell_price || 0);
              const quantity = item.quantity || 0;
              const total = parseFloat(item.total || 0);
              
              return `
                <div class="item">
                  <span>${productName} ${productModel ? `(${productModel})` : ''}</span>
                  <span>₹${sellPrice.toFixed(2)}</span>
                  <span>${quantity}</span>
                  <span>₹${total.toFixed(2)}</span>
                </div>
              `;
            }).join('') : '<div class="item"><span colspan="4">No items found</span></div>'}
          </div>
          
          <div class="summary">
            <div class="summary-row"><span>Subtotal:</span><span>₹${processedBill.subtotal.toFixed(2)}</span></div>
            <div class="summary-row"><span>Discount:</span><span>${discountDisplay}</span></div>
            <div class="summary-row"><span>Tax:</span><span>₹${processedBill.tax.toFixed(2)}</span></div>
            <div class="summary-row total"><span>Total:</span><span>₹${processedBill.total.toFixed(2)}</span></div>
            <div class="summary-row"><span>Paid:</span><span>₹${processedBill.paidAmount.toFixed(2)}</span></div>
            <div class="summary-row"><span>Change:</span><span>₹${processedBill.changeAmount.toFixed(2)}</span></div>
            <div class="summary-row"><span>Due:</span><span class="amount-due">₹${processedBill.dueAmount.toFixed(2)}</span></div>
            <div class="summary-row"><span>Payment:</span><span>${(processedBill.paymentMethod || 'cash').toUpperCase()}</span></div>
          </div>
          
          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Goods once sold will not be taken back</p>
            <p>** Computer generated bill **</p>
            ${(processedBill.createdByName || processedBill.createdBy) ? `<p>Created by: ${processedBill.createdByName || processedBill.createdBy}</p>` : ''}
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

  const handleCopyBillNumber = (billNumber) => {
    navigator.clipboard.writeText(billNumber);
    setCopiedBillNo(billNumber);
    setTimeout(() => setCopiedBillNo(null), 2000);
    showMessage("success", "📋 Bill number copied!");
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBills = filteredBills.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getPaymentIcon = (method) => {
    return paymentMethodMap[method?.toLowerCase()]?.icon || <DollarSign size={14} />;
  };

  const getPaymentColor = (method) => {
    return paymentMethodMap[method?.toLowerCase()]?.color || '#6b7280';
  };

  const getCustomerTypeIcon = (type) => {
    return customerTypeMap[type?.toLowerCase()]?.icon || <User size={14} />;
  };

  const getCustomerTypeColor = (type) => {
    return customerTypeMap[type?.toLowerCase()]?.color || '#6b7280';
  };

  const formatCurrency = (amount) => {
    return `₹${(parseFloat(amount) || 0).toFixed(2)}`;
  };

  // Dark Theme Styles
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
      fontSize: "24px",
      fontWeight: "600",
      color: "#6366f1",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    shopAddress: {
      fontSize: "14px",
      color: "#d1d5db",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    shopContact: {
      fontSize: "14px",
      color: "#d1d5db",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "4px",
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
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "25px",
      flexWrap: "wrap",
      gap: "15px",
    },
    headerTitle: {
      display: "flex",
      alignItems: "center",
      gap: "15px",
    },
    title: {
      fontSize: "28px",
      fontWeight: "600",
      margin: 0,
      color: "#f9fafb",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    refreshButton: {
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
      padding: "8px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s",
    },
    buttonGroup: {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
    },
    button: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 14px",
      borderRadius: "6px",
      backgroundColor: "#1f2937",
      color: "#f9fafb",
      border: "1px solid #374151",
      cursor: "pointer",
      fontSize: "14px",
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
    infoButton: {
      backgroundColor: "#3b82f6",
      color: "#fff",
      border: "none",
    },
    filterBar: {
      backgroundColor: "#1f2937",
      padding: "20px",
      borderRadius: "8px",
      border: "1px solid #374151",
      marginBottom: "20px",
      display: "grid",
      gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr auto",
      gap: "12px",
      alignItems: "center",
    },
    searchBox: {
      position: "relative",
      width: "100%",
    },
    searchIcon: {
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#6b7280",
    },
    searchInput: {
      width: "100%",
      padding: "10px 12px 10px 38px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "13px",
      outline: "none",
      transition: "border-color 0.2s",
      boxSizing: "border-box",
    },
    filterSelect: {
      width: "100%",
      padding: "10px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "13px",
      outline: "none",
      cursor: "pointer",
      transition: "border-color 0.2s",
      boxSizing: "border-box",
    },
    dateInput: {
      width: "100%",
      padding: "10px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "13px",
      outline: "none",
      transition: "border-color 0.2s",
      boxSizing: "border-box",
    },
    filterButton: {
      padding: "10px 16px",
      backgroundColor: "#1f2937",
      border: "1px solid #374151",
      color: "#f9fafb",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "13px",
      fontWeight: "500",
      transition: "all 0.2s",
      whiteSpace: "nowrap",
      height: "41px",
    },
    tableContainer: {
      backgroundColor: "#1f2937",
      borderRadius: "8px",
      border: "1px solid #374151",
      overflow: "auto",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: "1400px",
    },
    th: {
      backgroundColor: "#374151",
      padding: "14px 12px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#f3f4f6",
      borderBottom: "1px solid #4b5563",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    td: {
      padding: "14px 12px",
      borderBottom: "1px solid #374151",
      fontSize: "13px",
      color: "#f9fafb",
    },
    paymentBadge: {
      padding: "4px 10px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "600",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      backgroundColor: "rgba(255,255,255,0.1)",
    },
    customerTypeBadge: {
      padding: "4px 10px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "600",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
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
    whatsappButton: {
      padding: "6px 10px",
      margin: "0 2px",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      transition: "all 0.2s",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#25D366",
      color: "white",
    },
    message: {
      padding: "12px 20px",
      borderRadius: "6px",
      marginBottom: "20px",
      fontSize: "14px",
      fontWeight: "500",
      whiteSpace: "pre-line",
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
      fontSize: "16px",
    },
    noData: {
      textAlign: "center",
      padding: "60px",
      color: "#6b7280",
      fontStyle: "italic",
    },
    pagination: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "20px",
      padding: "10px 0",
    },
    paginationInfo: {
      color: "#9ca3af",
      fontSize: "13px",
    },
    paginationControls: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
    pageButton: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "8px 12px",
      backgroundColor: "#1f2937",
      border: "1px solid #374151",
      color: "#f9fafb",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "13px",
      transition: "all 0.2s",
      minWidth: "38px",
    },
    activePageButton: {
      backgroundColor: "#6366f1",
      borderColor: "#6366f1",
    },
    disabledButton: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    pageNumbers: {
      display: "flex",
      gap: "4px",
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
      maxWidth: "700px",
      width: "95%",
      maxHeight: "85vh",
      overflow: "auto",
      position: "relative",
      border: "1px solid #374151",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
    },
    modalClose: {
      position: "absolute",
      top: "15px",
      right: "15px",
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
      padding: "4px",
      borderRadius: "4px",
    },
    modalTitle: {
      fontSize: "22px",
      fontWeight: "600",
      color: "#f9fafb",
      marginBottom: "20px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    modalSection: {
      marginBottom: "20px",
      padding: "15px",
      backgroundColor: "#111827",
      borderRadius: "8px",
      border: "1px solid #374151",
    },
    modalText: {
      color: "#d1d5db",
      fontSize: "14px",
      lineHeight: "1.6",
      marginBottom: "6px",
    },
    modalTable: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: "20px",
    },
    modalTh: {
      backgroundColor: "#374151",
      padding: "10px",
      textAlign: "left",
      color: "#f3f4f6",
      fontWeight: "500",
      fontSize: "12px",
    },
    modalTd: {
      padding: "8px",
      borderBottom: "1px solid #374151",
      color: "#f9fafb",
      fontSize: "13px",
    },
    modalFooter: {
      display: "flex",
      gap: "10px",
      marginTop: "20px",
    },
    itemsPerPageSelect: {
      padding: "8px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "13px",
      marginLeft: "10px",
    },
    copyButton: {
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
      padding: "4px",
      marginLeft: "5px",
    },
  };

  if (loading && bills.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingSpinner}>
          <RefreshCw size={30} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
          <div>Loading BT bills...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Shop Header with Company Details */}
      <div style={styles.shopHeader}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          {companyDetails.logoUrl && (
            <img 
              src={companyDetails.logoUrl} 
              alt="Company Logo" 
              style={styles.shopLogo}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div style={styles.shopInfo}>
            <h1 style={styles.shopName}>
              <Store size={28} color="#6366f1" />
              {companyDetails.name}
            </h1>
            <p style={styles.shopAddress}>
              <MapPin size={14} color="#9ca3af" />
              {companyDetails.address}, {companyDetails.city}
            </p>
            <p style={styles.shopContact}>
              <Phone size={14} color="#9ca3af" />
              {companyDetails.phone}
              {companyDetails.email && (
                <>
                  <Mail size={14} color="#9ca3af" style={{ marginLeft: '15px' }} />
                  {companyDetails.email}
                </>
              )}
              {companyDetails.gst && (
                <>
                  <Building2 size={14} color="#9ca3af" style={{ marginLeft: '15px' }} />
                  GST: {companyDetails.gst}
                </>
              )}
            </p>
          </div>
        </div>
        
        {/* Company Selector */}
        {companies.length > 0 && (
          <div style={{ position: 'relative' }}>
            <div 
              style={styles.companySelector}
              onClick={() => setShowCompanySelector(!showCompanySelector)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1f2937';
                e.currentTarget.style.borderColor = '#6366f1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#111827';
                e.currentTarget.style.borderColor = '#374151';
              }}
            >
              <Building2 size={16} style={{ marginRight: '8px' }} />
              {companies.find(c => c.id === selectedCompanyId)?.name || 'Select Company'}
              <span style={{ marginLeft: '8px' }}>{showCompanySelector ? '▲' : '▼'}</span>
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
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d3748'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedCompanyId === company.id ? '#374151' : 'transparent'}
                  >
                    <Building2 size={14} style={{ marginRight: '8px', display: 'inline' }} />
                    {company.name}
                    {company.gst_number && (
                      <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: '8px' }}>
                        GST: {company.gst_number}
                      </span>
                    )}
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

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <h1 style={styles.title}>
            <Receipt size={32} color="#6366f1" />
            Visit Bills (BT Series)
          </h1>
          <button 
            style={styles.refreshButton}
            onClick={fetchBills}
            title="Refresh"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#f9fafb';
              e.currentTarget.style.backgroundColor = '#1f2937';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <RefreshCw size={18} />
          </button>
          <select
            style={styles.itemsPerPageSelect}
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>

        <div style={styles.buttonGroup}>
          <button 
            style={{...styles.button, ...styles.infoButton}} 
            onClick={handleExportExcel}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button 
            style={{...styles.button, ...styles.successButton}} 
            onClick={handleExportPDF}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <FileJson size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <Search size={16} style={styles.searchIcon} />
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Search bill no, customer name, phone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          style={styles.filterSelect}
          value={filterPaymentMethod}
          onChange={(e) => setFilterPaymentMethod(e.target.value)}
        >
          <option value="all">All Methods</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="upi">UPI</option>
          <option value="cheque">Cheque</option>
          <option value="mixed">Mixed</option>
        </select>

        <select
          style={styles.filterSelect}
          value={filterCustomerType}
          onChange={(e) => setFilterCustomerType(e.target.value)}
        >
          <option value="all">All Customers</option>
          <option value="internal">Internal (Staff)</option>
          <option value="external">External</option>
          <option value="regular">Regular</option>
          <option value="wholesale">Wholesale</option>
          <option value="vip">VIP</option>
          <option value="corporate">Corporate</option>
        </select>

        <input
          type="date"
          style={styles.dateInput}
          value={dateRange.start}
          onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
          placeholder="From Date"
        />

        <input
          type="date"
          style={styles.dateInput}
          value={dateRange.end}
          onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
          placeholder="To Date"
        />

        <select
          style={styles.filterSelect}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Amount</option>
          <option value="lowest">Lowest Amount</option>
        </select>

        <button 
          style={styles.filterButton}
          onClick={resetFilters}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2d3748';
            e.currentTarget.style.borderColor = '#4b5563';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1f2937';
            e.currentTarget.style.borderColor = '#374151';
          }}
        >
          <X size={16} /> Clear
        </button>
      </div>

      {/* Bills Table */}
      <div style={styles.tableContainer}>
        {error && <div style={{padding: '30px', color: '#f87171', textAlign: 'center'}}>{error}</div>}
        
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Bill No.</th>
              <th style={styles.th}>Date & Time</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Contact</th>
              <th style={styles.th}>Items</th>
              <th style={styles.th}>Subtotal</th>
              <th style={styles.th}>Discount</th>
              <th style={styles.th}>Tax</th>
              <th style={styles.th}>Total</th>
              <th style={styles.th}>Paid</th>
              <th style={styles.th}>Due</th>
              <th style={styles.th}>Payment</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentBills.length === 0 ? (
              <tr>
                <td colSpan="14" style={styles.noData}>
                  {searchTerm || filterPaymentMethod !== 'all' || filterCustomerType !== 'all' || dateRange.start 
                    ? <div>
                        <Filter size={30} style={{marginBottom: '10px', opacity: 0.5}} />
                        <div>No BT bills match your filters</div>
                        <button 
                          onClick={resetFilters}
                          style={{...styles.button, marginTop: '15px', display: 'inline-flex'}}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#2d3748';
                            e.currentTarget.style.borderColor = '#4b5563';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#1f2937';
                            e.currentTarget.style.borderColor = '#374151';
                          }}
                        >
                          <X size={14} /> Clear Filters
                        </button>
                      </div>
                    : <div>
                        <Receipt size={30} style={{marginBottom: '10px', opacity: 0.5}} />
                        <div>No BT bills found</div>
                      </div>}
                </td>
              </tr>
            ) : (
              currentBills.map((bill) => {
                const dueAmount = (bill.total || 0) - (bill.paidAmount || 0);
                
                // Format discount display
                let discountDisplay = '';
                if (bill.discountType === 'percentage') {
                  discountDisplay = `${bill.discountValue}%`;
                } else {
                  discountDisplay = formatCurrency(bill.discountAmount);
                }
                
                return (
                  <tr 
                    key={bill.id}
                    onClick={() => fetchBillDetails(bill.id)}
                    style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1f2937'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={styles.td}>
                      <div style={{display: 'flex', alignItems: 'center'}}>
                        <strong style={{ color: '#818cf8', cursor: 'pointer' }} title="Click to open bill">
                          {bill.billNumber}
                        </strong>
                        <button
                          style={styles.copyButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyBillNumber(bill.billNumber);
                          }}
                          title="Copy bill number"
                          onMouseEnter={(e) => e.currentTarget.style.color = '#f9fafb'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                        >
                          {copiedBillNo === bill.billNumber ? <CheckCircle size={14} color="#059669" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div>{formatDate(bill.createdAt)}</div>
                      <small style={{color: '#9ca3af', fontSize: '11px'}}>
                        {formatTime(bill.createdAt)}
                      </small>
                    </td>
                    <td style={styles.td}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                        <User size={12} color="#9ca3af" />
                        <span>{bill.customerName || 'Walk-in'}</span>
                      </div>
                      {bill.customerEmail && (
                        <small style={{color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px'}}>
                          <Mail size={10} /> {bill.customerEmail}
                        </small>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.customerTypeBadge,
                        backgroundColor: `${getCustomerTypeColor(bill.customerType)}20`,
                        color: getCustomerTypeColor(bill.customerType),
                        border: `1px solid ${getCustomerTypeColor(bill.customerType)}40`
                      }}>
                        {getCustomerTypeIcon(bill.customerType)}
                        <span style={{textTransform: 'capitalize'}}>{bill.customerType || 'external'}</span>
                      </span>
                    </td>
                    <td style={styles.td}>
                      {bill.customerPhone && (
                        <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                          <Phone size={10} color="#9ca3af" />
                          <span>{bill.customerPhone}</span>
                        </div>
                      )}
                      {bill.customerGst && (
                        <small style={{color: '#9ca3af', fontSize: '10px'}}>
                          GST: {bill.customerGst}
                        </small>
                      )}
                    </td>
                    <td style={styles.td}>{bill.itemCount || 0}</td>
                    <td style={styles.td}>{formatCurrency(bill.subtotal)}</td>
                    <td style={styles.td}>
                      <span title={`${bill.discountType === 'percentage' ? 'Percentage' : 'Fixed'} discount`}>
                        {discountDisplay}
                        {bill.discountType === 'percentage' && (
                          <small style={{color: '#9ca3af', marginLeft: '4px', fontSize: '10px'}}>
                            (₹{bill.discountAmount.toFixed(2)})
                          </small>
                        )}
                      </span>
                    </td>
                    <td style={styles.td}>{formatCurrency(bill.tax)}</td>
                    <td style={styles.td}><strong>{formatCurrency(bill.total)}</strong></td>
                    <td style={styles.td}>{formatCurrency(bill.paidAmount)}</td>
                    <td style={styles.td}>
                      <span style={{
                        color: dueAmount > 0 ? '#f87171' : '#34d399',
                        fontWeight: '600'
                      }}>
                        {formatCurrency(dueAmount)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{
                        ...styles.paymentBadge,
                        color: getPaymentColor(bill.paymentMethod),
                        border: `1px solid ${getPaymentColor(bill.paymentMethod)}30`
                      }}>
                        {getPaymentIcon(bill.paymentMethod)}
                        <span style={{textTransform: 'capitalize'}}>{bill.paymentMethod}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={{...styles.actionButton, backgroundColor: '#3b82f6', color: 'white', marginRight: '4px'}}
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchBillDetails(bill.id);
                        }}
                        title="View Details"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#2563eb';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#3b82f6';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        style={{...styles.actionButton, backgroundColor: '#059669', color: 'white', marginRight: '4px'}}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintBill(bill);
                        }}
                        title="Print Bill"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#047857';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#059669';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Printer size={14} />
                      </button>
                      <button
                        style={{
                          ...styles.whatsappButton,
                          opacity: whatsappStatus[bill.id] === 'sending' ? 0.7 : 1,
                          cursor: whatsappStatus[bill.id] === 'sending' ? 'wait' : 'pointer',
                          backgroundColor: whatsappStatus[bill.id] === 'sent' ? '#059669' : '#25D366'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWhatsAppShare(bill);
                        }}
                        title="Share on WhatsApp"
                        disabled={whatsappStatus[bill.id] === 'sending'}
                        onMouseEnter={(e) => {
                          if (!whatsappStatus[bill.id]) {
                            e.currentTarget.style.backgroundColor = '#128C7E';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!whatsappStatus[bill.id]) {
                            e.currentTarget.style.backgroundColor = '#25D366';
                            e.currentTarget.style.transform = 'scale(1)';
                          }
                        }}
                      >
                        {whatsappStatus[bill.id] === 'sending' ? (
                          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : whatsappStatus[bill.id] === 'sent' ? (
                          <CheckCircle size={14} />
                        ) : (
                          <MessageCircle size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredBills.length > 0 && (
        <div style={styles.pagination}>
          <div style={styles.paginationInfo}>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredBills.length)} of {filteredBills.length} BT bills
          </div>
          
          <div style={styles.paginationControls}>
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              style={{
                ...styles.pageButton,
                ...(currentPage === 1 ? styles.disabledButton : {})
              }}
              onMouseEnter={(e) => {
                if (currentPage !== 1) {
                  e.currentTarget.style.backgroundColor = '#2d3748';
                  e.currentTarget.style.borderColor = '#4b5563';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== 1) {
                  e.currentTarget.style.backgroundColor = '#1f2937';
                  e.currentTarget.style.borderColor = '#374151';
                }
              }}
            >
              <ChevronLeft size={16} />
            </button>
            
            <div style={styles.pageNumbers}>
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => paginate(pageNumber)}
                      style={{
                        ...styles.pageButton,
                        ...(currentPage === pageNumber ? styles.activePageButton : {})
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== pageNumber) {
                          e.currentTarget.style.backgroundColor = '#2d3748';
                          e.currentTarget.style.borderColor = '#4b5563';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== pageNumber) {
                          e.currentTarget.style.backgroundColor = '#1f2937';
                          e.currentTarget.style.borderColor = '#374151';
                        }
                      }}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (
                  pageNumber === currentPage - 3 ||
                  pageNumber === currentPage + 3
                ) {
                  return <span key={pageNumber} style={{ color: '#9ca3af', padding: '0 4px' }}>...</span>;
                }
                return null;
              })}
            </div>
            
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              style={{
                ...styles.pageButton,
                ...(currentPage === totalPages ? styles.disabledButton : {})
              }}
              onMouseEnter={(e) => {
                if (currentPage !== totalPages) {
                  e.currentTarget.style.backgroundColor = '#2d3748';
                  e.currentTarget.style.borderColor = '#4b5563';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== totalPages) {
                  e.currentTarget.style.backgroundColor = '#1f2937';
                  e.currentTarget.style.borderColor = '#374151';
                }
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Bill Details Modal */}
      {showBillModal && selectedBill && (
        <div style={styles.modal} onClick={() => setShowBillModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button 
              style={styles.modalClose} 
              onClick={() => setShowBillModal(false)}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#f9fafb';
                e.currentTarget.style.backgroundColor = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#9ca3af';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X size={20} />
            </button>
            
            <h2 style={styles.modalTitle}>
              <Receipt size={24} color="#6366f1" />
              Bill Details - {selectedBill.billNumber}
            </h2>
            
            <div style={styles.modalSection}>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px'}}>
                <div>
                  <p style={styles.modalText}>
                    <strong>Bill Number:</strong> {selectedBill.billNumber}
                  </p>
                  <p style={styles.modalText}>
                    <strong>Date:</strong> {formatDate(selectedBill.createdAt)}
                  </p>
                  <p style={styles.modalText}>
                    <strong>Time:</strong> {formatTime(selectedBill.createdAt)}
                  </p>
                  <p style={styles.modalText}>
                    <strong>Customer Type:</strong>{' '}
                    <span style={{
                      color: getCustomerTypeColor(selectedBill.customerType),
                      fontWeight: '600'
                    }}>
                      {(selectedBill.customerType || 'external').toUpperCase()}
                    </span>
                  </p>
                </div>
                <div>
                  <p style={styles.modalText}>
                    <strong>Customer:</strong> {selectedBill.customerName || 'Walk-in Customer'}
                  </p>
                  {selectedBill.customerPhone && (
                    <p style={styles.modalText}>
                      <strong>Phone:</strong> {selectedBill.customerPhone}
                    </p>
                  )}
                  {selectedBill.customerEmail && (
                    <p style={styles.modalText}>
                      <strong>Email:</strong> {selectedBill.customerEmail}
                    </p>
                  )}
                </div>
              </div>
              
              {selectedBill.customerAddress && (
                <p style={styles.modalText}>
                  <strong>Address:</strong> {selectedBill.customerAddress}
                </p>
              )}
              {selectedBill.customerGst && (
                <p style={styles.modalText}>
                  <strong>GST:</strong> {selectedBill.customerGst}
                </p>
              )}
            </div>

            <h3 style={{color: '#f9fafb', marginBottom: '10px', fontSize: '16px'}}>
              Items ({selectedBill.items?.length || 0})
            </h3>
            
            <table style={styles.modalTable}>
              <thead>
                <tr>
                  <th style={styles.modalTh}>Item</th>
                  <th style={styles.modalTh}>Model</th>
                  <th style={styles.modalTh}>Price</th>
                  <th style={styles.modalTh}>Qty</th>
                  <th style={styles.modalTh}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedBill.items && selectedBill.items.length > 0 ? (
                  selectedBill.items.map((item, index) => {
                    const productName = item.productName || item.product_name || 'Unknown';
                    const productModel = item.productModel || item.product_model || '';
                    const sellPrice = parseFloat(item.sellPrice || item.sell_price || 0);
                    const quantity = item.quantity || 0;
                    const total = parseFloat(item.total || 0);
                    
                    return (
                      <tr key={index}>
                        <td style={styles.modalTd}>
                          <strong>{productName}</strong>
                        </td>
                        <td style={styles.modalTd}>
                          {productModel || '-'}
                        </td>
                        <td style={styles.modalTd}>₹{sellPrice.toFixed(2)}</td>
                        <td style={styles.modalTd}>{quantity}</td>
                        <td style={styles.modalTd}>₹{total.toFixed(2)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" style={{...styles.modalTd, textAlign: 'center', color: '#9ca3af'}}>
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Payment History if available */}
            {selectedBill.payments && selectedBill.payments.length > 0 && (
              <div style={{marginTop: '20px'}}>
                <h4 style={{color: '#f9fafb', marginBottom: '10px', fontSize: '14px'}}>Payment History</h4>
                <div style={{backgroundColor: '#111827', borderRadius: '6px', padding: '10px'}}>
                  {selectedBill.payments.map((payment, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '5px 0',
                      borderBottom: index < selectedBill.payments.length - 1 ? '1px solid #374151' : 'none'
                    }}>
                      <span style={{color: '#d1d5db', fontSize: '12px'}}>
                        {formatTime(payment.createdAt)} - {payment.method?.toUpperCase()}
                      </span>
                      <span style={{color: '#f9fafb', fontWeight: '500'}}>
                        ₹{payment.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.modalFooter}>
              <button
                style={{...styles.actionButton, backgroundColor: '#059669', color: 'white', padding: '12px 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '6px', fontSize: '14px', fontWeight: '500'}}
                onClick={() => {
                  setShowBillModal(false);
                  handlePrintBill(selectedBill);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#047857';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Printer size={16} /> Print Bill
              </button>
              <button
                style={{...styles.actionButton, backgroundColor: '#25D366', color: 'white', padding: '12px 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '6px', fontSize: '14px', fontWeight: '500'}}
                onClick={() => {
                  setShowBillModal(false);
                  handleWhatsAppShare(selectedBill);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#128C7E';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#25D366';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                disabled={!selectedBill.customerPhone}
                title={!selectedBill.customerPhone ? "No phone number available" : "Share on WhatsApp"}
              >
                <MessageCircle size={16} /> WhatsApp
              </button>
              <button
                style={{...styles.actionButton, backgroundColor: '#374151', color: 'white', padding: '12px 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '6px', fontSize: '14px', fontWeight: '500'}}
                onClick={() => setShowBillModal(false)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4b5563';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#374151';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add keyframe animation for spinner */}
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

export default VisitBillPage;