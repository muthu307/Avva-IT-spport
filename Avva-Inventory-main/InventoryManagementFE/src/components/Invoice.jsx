import React, { useState, useEffect, useRef } from "react";
import api from '../utils/api';

const InvoicePage = () => {


  // Company details
  const companyDetails = {
    name: "Avva Inventory",
    address: "No.71, M.T.H.road (Opp padi post office), Padi, Chennai - 600 050",
    phone: "98657 09626",
    email: "hiprintsolutions@gmail.com",
    gstin: "33ABCDE1234F1Z5"
  };

  // State for invoices list
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    pages: 1
  });
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [filterStatus, setFilterStatus] = useState('all'); // all, paid, unpaid, partial
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, highest, lowest

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);

  // Form data
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", address: "", gstin: "" });
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState("fixed");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [customerErrors, setCustomerErrors] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savedInvoice, setSavedInvoice] = useState(null);

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [isInterState, setIsInterState] = useState(false);

  // Refs
  const searchRef = useRef(null);
  const modalRef = useRef(null);
  const viewModalRef = useRef(null);

  // Helper function to safely format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-IN');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Helper function to safely parse number
  const safeNumber = (value, defaultValue = 0) => {
    if (value === null || value === undefined) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  };

  // Check authentication on mount
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      setIsAuthenticated(false);
      setError('Please login first');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } else {
      testBackendConnection();
    }
  }, []);

  // Fetch invoices when page changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchInvoices();
    }
  }, [pagination.page]);

  // Apply filters
  useEffect(() => {
    if (invoices.length > 0) {
      applyFilters();
    }
  }, [invoices, searchTerm, dateRange, filterStatus, sortBy]);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        if (items.length > 0 || customer.name || customer.phone) {
          if (window.confirm("Are you sure you want to close? Your progress will be lost.")) {
            resetForm();
            setShowModal(false);
          }
        } else {
          setShowModal(false);
          resetForm();
        }
      }

      if (viewModalRef.current && !viewModalRef.current.contains(event.target) && showViewModal) {
        setShowViewModal(false);
        setViewingInvoice(null);
      }
    };

    if (showModal || showViewModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showModal, showViewModal, items, customer]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setProducts([]);
        setSearchError("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // SEARCH PRODUCT with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length >= 2) {
        fetchProducts();
      } else {
        setProducts([]);
        setSearchError("");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Test backend connection
  const testBackendConnection = async () => {
    try {
      console.log('Testing backend connection...');
      const response = await api.get('/invoice?page=1&per_page=1');
      console.log('Backend connection successful:', response.data);
      fetchInvoices();
      fetchDashboardStats();
    } catch (err) {
      console.error('Backend connection failed:', err);
      setError('Cannot connect to backend server. Please make sure it\'s running on port 5000.');
    }
  };

  // Fetch invoices from backend
  const fetchInvoices = async () => {
    if (!isAuthenticated) return;

    setInvoicesLoading(true);
    setError('');

    try {
      const url = `/invoice?page=${pagination.page}&per_page=${pagination.per_page}`;
      const response = await api.get(url);

      if (response.data && response.data.success) {
        setInvoices(response.data.items || []);
        setFilteredInvoices(response.data.items || []);
        setPagination({
          page: response.data.page || 1,
          per_page: response.data.per_page || 10,
          total: response.data.total || 0,
          pages: response.data.pages || 1
        });
      } else {
        setError(response.data?.error || 'Failed to load invoices');
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load invoices');
    } finally {
      setInvoicesLoading(false);
    }
  };

  // Apply filters to invoices
  const applyFilters = () => {
    let filtered = [...invoices];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(inv =>
        (inv.invoice_number?.toLowerCase().includes(term)) ||
        (inv.customer_name?.toLowerCase().includes(term)) ||
        (inv.customer_phone?.toLowerCase().includes(term)) ||
        (inv.customer_email?.toLowerCase().includes(term))
      );
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);

      filtered = filtered.filter(inv => {
        const invDate = new Date(inv.invoice_date);
        return invDate >= start && invDate <= end;
      });
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(inv =>
        (inv.payment_status || inv.paymentStatus) === filterStatus
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.invoice_date) - new Date(a.invoice_date);
        case 'oldest':
          return new Date(a.invoice_date) - new Date(b.invoice_date);
        case 'highest':
          return (b.total || 0) - (a.total || 0);
        case 'lowest':
          return (a.total || 0) - (b.total || 0);
        default:
          return 0;
      }
    });

    setFilteredInvoices(filtered);
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setDateRange({ start: '', end: '' });
    setFilterStatus('all');
    setSortBy('newest');
    setFilteredInvoices(invoices);
  };

  // Fetch dashboard stats
  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/invoice/stats/dashboard');
      if (response.data && response.data.success) {
        setDashboardStats(response.data.stats);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const fetchProducts = async () => {
    if (!isAuthenticated) return;

    setSearchLoading(true);
    setSearchError("");

    try {
      const response = await api.get(`/billing/search-products?q=${encodeURIComponent(search)}`);

      if (Array.isArray(response.data)) {
        setProducts(response.data);
        if (response.data.length === 0) {
          setSearchError("No products found matching your search");
        }
      } else if (response.data.items && Array.isArray(response.data.items)) {
        setProducts(response.data.items);
        if (response.data.items.length === 0) {
          setSearchError("No products found matching your search");
        }
      } else {
        setSearchError("Received unexpected data format from server");
        setProducts([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('Failed to search products');
      setProducts([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch single invoice details
  const fetchInvoiceDetails = async (id) => {
    try {
      const response = await api.get(`/invoice/${id}`);
      if (response.data && response.data.success) {
        setViewingInvoice(response.data.invoice);
        setShowViewModal(true);
      }
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      setError('Failed to load invoice details');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Update payment status
  const updatePaymentStatus = async (id, status, method = null) => {
    try {
      const response = await api.patch(`/invoice/${id}/payment`, {
        paymentStatus: status,
        paymentMethod: method
      });

      if (response.data && response.data.success) {
        setSuccess('Payment status updated successfully');
        fetchInvoices();
        fetchDashboardStats();
        if (viewingInvoice) {
          fetchInvoiceDetails(id);
        }
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error updating payment status:', err);
      setError('Failed to update payment status');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Validate customer form
  const validateCustomerForm = () => {
    const errors = {};
    if (!customer.name.trim()) errors.name = "Customer name is required";
    if (!customer.phone.trim()) errors.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(customer.phone.replace(/\D/g, ''))) errors.phone = "Phone must be 10 digits";

    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      errors.email = "Invalid email format";
    }

    if (customer.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(customer.gstin)) {
      errors.gstin = "Invalid GSTIN format";
    }

    setCustomerErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle next step
  const handleNextStep = () => {
    if (modalStep === 1 && validateCustomerForm()) {
      setModalStep(2);
    } else if (modalStep === 2 && items.length > 0) {
      setModalStep(3);
    }
  };

  // Handle back step
  const handleBackStep = () => {
    setModalStep(modalStep - 1);
  };

  // Reset form
  const resetForm = () => {
    setCustomer({ name: "", phone: "", email: "", address: "", gstin: "" });
    setItems([]);
    setDiscount(0);
    setDiscountType("fixed");
    setNotes("");
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setPaymentStatus('unpaid');
    setIsInterState(false);
    setModalStep(1);
    setCustomerErrors({});
    setSearch("");
    setProducts([]);
    setSearchError("");
    setError('');
    setSuccess('');
    setSavedInvoice(null);
  };

  // ADD PRODUCT
  const addProduct = (product) => {
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      setItems(
        items.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      );
      setSuccess(`${product.name} quantity increased`);
    } else {
      setItems([...items, {
        productId: product.id,
        name: product.name,
        model: product.model || '',
        price: product.sellPrice || product.price || 0,
        mrp: product.mrp || product.sellPrice || product.price || 0,
        quantity: 1,
        hsnCode: product.hsnCode || "",
        gst: product.gst || 0
      }]);
      setSuccess(`${product.name} added to invoice`);
    }
    setSearch("");
    setProducts([]);
    setSearchError("");

    setTimeout(() => setSuccess(''), 2000);
  };

  // CHANGE QTY
  const changeQty = (index, qty) => {
    if (qty < 1) qty = 1;
    const updated = [...items];
    updated[index].quantity = qty;
    setItems(updated);
  };

  // REMOVE PRODUCT
  const removeItem = (index) => {
    const updated = [...items];
    const removedItem = updated[index];
    updated.splice(index, 1);
    setItems(updated);
    setSuccess(`${removedItem.name} removed from invoice`);
    setTimeout(() => setSuccess(''), 2000);
  };

  // CALCULATIONS
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const calculateDiscount = () => {
    if (discountType === "percentage") {
      return (subtotal * discount) / 100;
    }
    return discount;
  };

  const discountAmount = calculateDiscount();
  const taxableAmount = subtotal - discountAmount;

  // Calculate GST
  const calculateGST = () => {
    const gstDetails = {};
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    items.forEach(item => {
      const gstRate = item.gst || 0;
      const itemTotal = (item.price * item.quantity);
      const taxableValue = itemTotal * (100 / (100 + gstRate));
      const gstAmount = itemTotal - taxableValue;

      if (!gstDetails[gstRate]) {
        gstDetails[gstRate] = {
          taxable: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total: 0
        };
      }

      if (gstRate > 0) {
        if (isInterState) {
          gstDetails[gstRate].igst += gstAmount;
          igstTotal += gstAmount;
        } else {
          gstDetails[gstRate].cgst += gstAmount / 2;
          gstDetails[gstRate].sgst += gstAmount / 2;
          cgstTotal += gstAmount / 2;
          sgstTotal += gstAmount / 2;
        }
        gstDetails[gstRate].taxable += taxableValue;
      } else {
        gstDetails[gstRate].taxable += itemTotal;
      }
      gstDetails[gstRate].total += itemTotal;
    });

    return { gstDetails, cgstTotal, sgstTotal, igstTotal };
  };

  const { gstDetails, cgstTotal, sgstTotal, igstTotal } = calculateGST();
  const total = taxableAmount + cgstTotal + sgstTotal + igstTotal;

  // SAVE INVOICE
  const saveInvoice = async () => {
    if (!isAuthenticated) {
      setError('Please login first');
      return;
    }

    if (items.length === 0) {
      setError("Add products first");
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const payload = {
      customerName: customer.name.trim(),
      customerPhone: customer.phone.replace(/\D/g, ''),
      customerEmail: customer.email.trim() || '',
      customerAddress: customer.address.trim() || '',
      customerGstin: customer.gstin.trim().toUpperCase() || '',
      invoiceDate,
      dueDate,
      discountType,
      discountRate: discount,
      notes: notes.trim() || '',
      paymentMethod,
      paymentStatus,
      isInterState,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        hsnCode: item.hsnCode,
        gst: item.gst || 0
      }))
    };

    try {
      const res = await api.post('/invoice', payload);

      if (res.data && res.data.success) {
        setSavedInvoice(res.data.invoice);
        setSuccess(`✅ Invoice Created Successfully!\nInvoice Number: ${res.data.invoiceNumber}`);

        fetchInvoices();
        fetchDashboardStats();

        setTimeout(() => {
          if (window.confirm(`Invoice ${res.data.invoiceNumber} saved successfully!\n\nDo you want to print it?`)) {
            handlePrintInvoice(res.data.invoice);
          }

          resetForm();
          setShowModal(false);
          setSuccess('');
        }, 2000);
      } else {
        setError(res.data?.error || 'Failed to save invoice');
      }

    } catch (err) {
      console.error("Error creating invoice:", err);

      let errorMessage = "Failed to save invoice. ";

      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = "Session expired. Please login again.";
        } else if (err.response.status === 400) {
          errorMessage = err.response.data?.error || "Invalid data. Please check your inputs.";
        } else if (err.response.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage = err.response.data?.message || `Error (Status: ${err.response.status})`;
        }
      } else if (err.request) {
        errorMessage = "No response from server. Please check your connection.";
      } else {
        errorMessage = "Error setting up request. Please try again.";
      }

      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Function to convert number to words
  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    const convertLessThanThousand = (n) => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + ' ' + ones[n % 10];
      return ones[Math.floor(n / 100)] + ' Hundred ' + convertLessThanThousand(n % 100);
    };

    let amount = Math.floor(num);
    const paise = Math.round((num - amount) * 100);

    let words = '';
    if (amount >= 10000000) {
      words += convertLessThanThousand(Math.floor(amount / 10000000)) + ' Crore ';
      amount %= 10000000;
    }
    if (amount >= 100000) {
      words += convertLessThanThousand(Math.floor(amount / 100000)) + ' Lakh ';
      amount %= 100000;
    }
    if (amount >= 1000) {
      words += convertLessThanThousand(Math.floor(amount / 1000)) + ' Thousand ';
      amount %= 1000;
    }
    words += convertLessThanThousand(amount);

    if (paise > 0) {
      words += ' and ' + convertLessThanThousand(paise) + ' Paise';
    }

    return words.trim() || 'Zero Rupees';
  };

  // Function to print invoice
  const handlePrintInvoice = (invoice) => {
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      const itemsHtml = invoice.items?.map(item => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.product_name || item.productName} ${item.product_model ? `(${item.product_model})` : ''}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.hsn_code || item.hsnCode || '-'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${safeNumber(item.price).toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${safeNumber(item.gst_rate || item.gst)}%</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${safeNumber(item.total).toFixed(2)}</td>
        </tr>
      `).join('') || '';

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${invoice.invoice_number || invoice.invoiceNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm 10mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              color: #1e293b;
              line-height: 1.35;
              font-size: 11px;
              padding: 5px 0;
            }
            p { margin: 2px 0; }
            .header { 
              text-align: center; 
              margin-bottom: 8px; 
              border-bottom: 2px solid #2563eb;
              padding-bottom: 6px;
            }
            .company-logo {
              max-height: 45px;
              margin-bottom: 4px;
              object-fit: contain;
            }
            .company-name { 
              font-size: 20px; 
              font-weight: bold; 
              color: #2563eb;
              margin-bottom: 2px;
            }
            .company-details {
              font-size: 10.5px;
              color: #475569;
            }
            .document-title {
              font-size: 16px;
              font-weight: 800;
              text-align: center;
              margin: 6px 0;
              color: #2563eb;
              letter-spacing: 1px;
            }
            .details-container {
              display: flex;
              justify-content: space-between;
              margin: 6px 0;
              gap: 10px;
            }
            .left-details, .right-details {
              flex: 1;
            }
            .detail-box {
              background: #f8fafc;
              padding: 8px 10px;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
              height: 100%;
            }
            .detail-box h3 {
              margin-top: 0;
              margin-bottom: 4px;
              color: #2563eb;
              font-size: 11.5px;
              border-bottom: 1px dashed #cbd5e1;
              padding-bottom: 2px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 6px 0; 
            }
            th { 
              background: #2563eb; 
              color: white; 
              padding: 5px 8px; 
              text-align: left; 
              font-size: 11px;
              font-weight: 600;
            }
            td { 
              padding: 5px 8px; 
              border: 1px solid #cbd5e1; 
              font-size: 10.5px;
            }
            .summary-wrapper {
              display: flex;
              justify-content: flex-end;
              margin-top: 4px;
            }
            .summary { 
              background: #f8fafc; 
              padding: 8px 12px; 
              border-radius: 6px; 
              border: 1px solid #e2e8f0;
              min-width: 270px;
              text-align: right; 
            }
            .summary-item {
              margin-bottom: 2px;
              display: flex;
              justify-content: space-between;
              gap: 10px;
              font-size: 10.5px;
            }
            .total { 
              font-size: 14px; 
              font-weight: bold; 
              color: #2563eb; 
              margin-top: 4px;
              padding-top: 4px;
              border-top: 1.5px solid #94a3b8;
              display: flex;
              justify-content: space-between;
            }
            .amount-words {
              font-style: italic;
              color: #1e40af;
              margin-top: 4px;
              font-size: 10px;
              text-align: right;
            }
            .status-badge { 
              padding: 2px 6px; 
              border-radius: 3px; 
              font-weight: bold; 
              display: inline-block;
              font-size: 10px;
            }
            .status-paid { background: #10b981; color: white; }
            .status-unpaid { background: #ef4444; color: white; }
            .status-partial { background: #f59e0b; color: white; }
            .terms-box {
              margin-top: 6px; 
              padding: 6px 10px; 
              background: #f8fafc; 
              border-radius: 6px;
              border: 1px solid #e2e8f0;
              font-size: 9.5px;
            }
            .terms-box h4 {
              margin: 0 0 2px 0;
              color: #2563eb;
              font-size: 10.5px;
            }
            .signature {
              display: flex;
              justify-content: space-between;
              margin-top: 12px;
              font-size: 10px;
            }
            .signature-line {
              width: 160px;
              border-bottom: 1px solid #333;
              margin-top: 18px;
              margin-bottom: 3px;
            }
            .footer { 
              margin-top: 8px; 
              text-align: center; 
              font-size: 9px; 
              color: #64748b;
              border-top: 1px solid #e2e8f0;
              padding-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/avva-logo.jpeg" class="company-logo" alt="Avva Inventory Logo">
            <div class="company-name">Avva Inventory</div>
            <div class="company-details">No.71, M.T.H.road (Opp padi post office), Padi, Chennai - 600 050</div>
            <div class="company-details">Phone: 98657 09626 | Email: hiprintsolutions@gmail.com | GST: 33ABCDE1234F1Z5</div>
          </div>
          
          <div class="document-title">TAX INVOICE</div>
          
          <div class="details-container">
            <div class="left-details">
              <div class="detail-box">
                <h3>Bill To:</h3>
                <p><strong>${invoice.customer_name || invoice.customerName}</strong></p>
                <p>Phone: ${invoice.customer_phone || invoice.customerPhone}</p>
                ${(invoice.customer_email || invoice.customerEmail) ? `<p>Email: ${invoice.customer_email || invoice.customerEmail}</p>` : ''}
                ${(invoice.customer_address || invoice.customerAddress) ? `<p>Address: ${invoice.customer_address || invoice.customerAddress}</p>` : ''}
                ${(invoice.customer_gstin || invoice.customerGstin) ? `<p>GSTIN: ${invoice.customer_gstin || invoice.customerGstin}</p>` : ''}
              </div>
            </div>
            
            <div class="right-details">
              <div class="detail-box">
                <h3>Invoice Details:</h3>
                <p><strong>Invoice No:</strong> ${invoice.invoice_number || invoice.invoiceNumber}</p>
                <p><strong>Date:</strong> ${formatDate(invoice.invoice_date || invoice.invoiceDate)}</p>
                <p><strong>Due Date:</strong> ${formatDate(invoice.due_date || invoice.dueDate)}</p>
                <p><strong>Payment Status:</strong> <span class="status-badge status-${invoice.payment_status || invoice.paymentStatus || 'unpaid'}">${(invoice.payment_status || invoice.paymentStatus || 'UNPAID').toUpperCase()}</span></p>
                <p><strong>Payment Method:</strong> ${(invoice.payment_method || invoice.paymentMethod || 'cash').toUpperCase()}</p>
                <p><strong>Transaction Type:</strong> ${safeNumber(invoice.igst_total || invoice.igstTotal) > 0 ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</p>
              </div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Product Description</th>
                <th style="text-align: center; width: 70px;">HSN</th>
                <th style="text-align: center; width: 50px;">Qty</th>
                <th style="text-align: right; width: 90px;">Unit Price</th>
                <th style="text-align: center; width: 60px;">GST%</th>
                <th style="text-align: right; width: 100px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="summary-wrapper">
            <div class="summary">
              <div class="summary-item"><span><strong>Subtotal:</strong></span><span>₹${safeNumber(invoice.subtotal).toFixed(2)}</span></div>
              ${invoice.discount > 0 ? `<div class="summary-item"><span><strong>Discount:</strong></span><span>-₹${safeNumber(invoice.discount).toFixed(2)}</span></div>` : ''}
              <div class="summary-item"><span><strong>Taxable Amount:</strong></span><span>₹${(safeNumber(invoice.subtotal) - safeNumber(invoice.discount)).toFixed(2)}</span></div>
              ${invoice.cgst_total > 0 ? `<div class="summary-item"><span><strong>CGST:</strong></span><span>₹${safeNumber(invoice.cgst_total).toFixed(2)}</span></div>` : ''}
              ${invoice.sgst_total > 0 ? `<div class="summary-item"><span><strong>SGST:</strong></span><span>₹${safeNumber(invoice.sgst_total).toFixed(2)}</span></div>` : ''}
              ${invoice.igst_total > 0 ? `<div class="summary-item"><span><strong>IGST:</strong></span><span>₹${safeNumber(invoice.igst_total).toFixed(2)}</span></div>` : ''}
              <div class="total"><span><strong>Total:</strong></span><span>₹${safeNumber(invoice.total).toFixed(2)}</span></div>
            </div>
          </div>
          <div class="amount-words"><strong>Amount in Words:</strong> ${numberToWords(safeNumber(invoice.total))} Only</div>
          
          ${invoice.notes ? `
            <div class="terms-box">
              <h4>Terms & Conditions:</h4>
              <p>${invoice.notes}</p>
            </div>
          ` : `
            <div class="terms-box">
              <h4>Terms & Conditions:</h4>
              <ul style="margin:0; padding-left:16px;">
                <li>Goods once sold will not be taken back</li>
                <li>Payment due by due date</li>
                <li>Interest @ 24% p.a. will be charged on delayed payments</li>
                <li>Subject to Chennai jurisdiction</li>
              </ul>
            </div>
          `}
          
          <div class="signature">
            <div>
              <p><strong>For Avva Inventory</strong></p>
              <div class="signature-line"></div>
              <p>Authorized Signatory</p>
            </div>
            <div>
              <p><strong>Customer Signature</strong></p>
              <div class="signature-line"></div>
            </div>
          </div>
          
          <div class="footer">
            <p>This is a computer generated invoice. Valid without signature. Thank you for your business!</p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      alert('Please allow pop-ups to print the invoice');
    }
  };

  // Show login required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Invoices</h2>
        </div>
        <div style={styles.authMessage}>
          <h3>🔒 Authentication Required</h3>
          <p style={{ color: '#dc3545', margin: '20px 0' }}>{error || 'Please login to access invoices'}</p>
          <button
            style={styles.createButton}
            onClick={() => window.location.href = '/login'}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header with Create Button */}
      <div style={styles.header}>
        <h2 style={styles.title}>Invoices</h2>
        <button
          style={styles.createButton}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Create New Invoice
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div style={{ ...styles.alert, ...styles.alertError, marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ ...styles.alert, ...styles.alertSuccess, marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
          ✅ {success}
        </div>
      )}

      {/* Search and Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Search by invoice #, customer name, phone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              style={styles.clearSearch}
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          )}
        </div>

        <input
          type="date"
          style={styles.filterInput}
          value={dateRange.start}
          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          placeholder="From Date"
        />

        <input
          type="date"
          style={styles.filterInput}
          value={dateRange.end}
          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          placeholder="To Date"
        />

        <select
          style={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
        </select>

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
          style={styles.resetButton}
          onClick={resetFilters}
        >
          Reset Filters
        </button>
      </div>

      {/* Results count */}
      {!invoicesLoading && (
        <div style={styles.resultsCount}>
          Showing {filteredInvoices.length} of {invoices.length} invoices
          {filteredInvoices.length !== invoices.length && (
            <span> (filtered)</span>
          )}
        </div>
      )}

      {/* Invoices Table */}
      <div style={styles.tableContainer}>
        {invoicesLoading ? (
          <div style={styles.loadingState}>Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No invoices found. Click "Create New Invoice" to get started.</p>
          </div>
        ) : (
          <>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Invoice #</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Due Date</th>
                  <th style={styles.th}>Total</th>
                  <th style={styles.th}>Payment</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td style={styles.td}>{invoice.invoice_number || invoice.invoiceNumber}</td>
                    <td style={styles.td}>{formatDate(invoice.invoice_date || invoice.invoiceDate)}</td>
                    <td style={styles.td}>{invoice.customer_name || invoice.customerName}</td>
                    <td style={styles.td}>{invoice.customer_phone || invoice.customerPhone}</td>
                    <td style={styles.td}>{formatDate(invoice.due_date || invoice.dueDate)}</td>
                    <td style={styles.td}>₹{safeNumber(invoice.total).toFixed(2)}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: (invoice.payment_status || invoice.paymentStatus) === 'paid' ? '#10b981' :
                          (invoice.payment_status || invoice.paymentStatus) === 'partial' ? '#f59e0b' : '#ef4444'
                      }}>
                        {invoice.payment_status || invoice.paymentStatus || 'unpaid'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          style={styles.viewButton}
                          onClick={() => fetchInvoiceDetails(invoice.id)}
                        >
                          View
                        </button>
                        <button
                          style={styles.printButton}
                          onClick={() => handlePrintInvoice(invoice)}
                        >
                          Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div style={styles.pagination}>
                <button
                  style={styles.pageButton}
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  Previous
                </button>
                <span style={styles.pageInfo}>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  style={styles.pageButton}
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.pages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Invoice Modal */}
      {showViewModal && viewingInvoice && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, maxWidth: '1000px' }} ref={viewModalRef}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                Invoice Details - {viewingInvoice.invoice_number || viewingInvoice.invoiceNumber}
              </h3>
              <button
                style={styles.closeButton}
                onClick={() => {
                  setShowViewModal(false);
                  setViewingInvoice(null);
                }}
              >
                ×
              </button>
            </div>

            <div style={styles.modalContent}>
              {/* Company Header */}
              <div style={styles.viewCompanyHeader}>
                <h3 style={{ color: '#3b82f6', margin: 0 }}>{companyDetails.name}</h3>
                <p style={{ margin: '5px 0', color: '#94a3b8' }}>{companyDetails.address}</p>
                <p style={{ margin: 0, color: '#94a3b8' }}>Phone: {companyDetails.phone} | Email: {companyDetails.email}</p>
              </div>

              {/* Status Update Section */}
              <div style={styles.statusUpdateSection}>
                <h4 style={styles.viewSectionTitle}>Update Payment Status</h4>
                <div style={styles.statusUpdateRow}>
                  <div style={styles.statusUpdateField}>
                    <label style={styles.label}>Payment Status</label>
                    <select
                      style={styles.statusSelect}
                      value={viewingInvoice.payment_status || viewingInvoice.paymentStatus || 'unpaid'}
                      onChange={(e) => updatePaymentStatus(viewingInvoice.id, e.target.value, viewingInvoice.payment_method || viewingInvoice.paymentMethod)}
                    >
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partial</option>
                    </select>
                  </div>
                  <div style={styles.statusUpdateField}>
                    <label style={styles.label}>Payment Method</label>
                    <select
                      style={styles.statusSelect}
                      value={viewingInvoice.payment_method || viewingInvoice.paymentMethod || 'cash'}
                      onChange={(e) => updatePaymentStatus(viewingInvoice.id, viewingInvoice.payment_status || viewingInvoice.paymentStatus, e.target.value)}
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={styles.viewTwoColumn}>
                <div style={styles.viewColumn}>
                  <div style={styles.viewSection}>
                    <h4 style={styles.viewSectionTitle}>Bill To:</h4>
                    <div style={styles.viewCard}>
                      <p><strong>{viewingInvoice.customer_name || viewingInvoice.customerName}</strong></p>
                      <p>Phone: {viewingInvoice.customer_phone || viewingInvoice.customerPhone}</p>
                      {(viewingInvoice.customer_email || viewingInvoice.customerEmail) && <p>Email: {viewingInvoice.customer_email || viewingInvoice.customerEmail}</p>}
                      {(viewingInvoice.customer_address || viewingInvoice.customerAddress) && <p>Address: {viewingInvoice.customer_address || viewingInvoice.customerAddress}</p>}
                      {(viewingInvoice.customer_gstin || viewingInvoice.customerGstin) && <p>GSTIN: {viewingInvoice.customer_gstin || viewingInvoice.customerGstin}</p>}
                    </div>
                  </div>
                </div>

                <div style={styles.viewColumn}>
                  <div style={styles.viewSection}>
                    <h4 style={styles.viewSectionTitle}>Invoice Details:</h4>
                    <div style={styles.viewCard}>
                      <p><strong>Invoice No:</strong> {viewingInvoice.invoice_number || viewingInvoice.invoiceNumber}</p>
                      <p><strong>Date:</strong> {formatDate(viewingInvoice.invoice_date || viewingInvoice.invoiceDate)}</p>
                      <p><strong>Due Date:</strong> {formatDate(viewingInvoice.due_date || viewingInvoice.dueDate)}</p>
                      <p><strong>Payment Method:</strong> {(viewingInvoice.payment_method || viewingInvoice.paymentMethod || 'cash').toUpperCase()}</p>
                      <p><strong>Transaction Type:</strong> {safeNumber(viewingInvoice.igst_total || viewingInvoice.igstTotal) > 0 ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.viewSection}>
                <h4 style={styles.viewSectionTitle}>Items</h4>
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Product</th>
                        <th style={styles.th}>HSN</th>
                        <th style={styles.th}>Price</th>
                        <th style={styles.th}>Qty</th>
                        <th style={styles.th}>GST%</th>
                        <th style={styles.th}>CGST</th>
                        <th style={styles.th}>SGST</th>
                        <th style={styles.th}>IGST</th>
                        <th style={styles.th}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingInvoice.items?.map((item, index) => (
                        <tr key={index}>
                          <td style={styles.td}>
                            <div>{item.product_name || item.productName}</div>
                            {(item.product_model || item.productModel) && <small style={styles.modelText}>{item.product_model || item.productModel}</small>}
                          </td>
                          <td style={styles.td}>{item.hsn_code || item.hsnCode || '-'}</td>
                          <td style={styles.td}>₹{safeNumber(item.price).toFixed(2)}</td>
                          <td style={styles.td}>{item.quantity}</td>
                          <td style={styles.td}>{safeNumber(item.gst_rate || item.gst)}%</td>
                          <td style={styles.td}>₹{safeNumber(item.cgst).toFixed(2)}</td>
                          <td style={styles.td}>₹{safeNumber(item.sgst).toFixed(2)}</td>
                          <td style={styles.td}>₹{safeNumber(item.igst).toFixed(2)}</td>
                          <td style={styles.td}>₹{safeNumber(item.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={styles.viewSummary}>
                <div style={styles.viewSummaryItem}><strong>Subtotal:</strong> ₹{safeNumber(viewingInvoice.subtotal).toFixed(2)}</div>
                {safeNumber(viewingInvoice.discount) > 0 && (
                  <div style={styles.viewSummaryItem}><strong>Discount:</strong> -₹{safeNumber(viewingInvoice.discount).toFixed(2)}</div>
                )}
                <div style={styles.viewSummaryItem}><strong>Taxable Amount:</strong> ₹{(safeNumber(viewingInvoice.subtotal) - safeNumber(viewingInvoice.discount)).toFixed(2)}</div>
                {safeNumber(viewingInvoice.cgst_total || viewingInvoice.cgstTotal) > 0 && (
                  <div style={styles.viewSummaryItem}><strong>CGST:</strong> ₹{safeNumber(viewingInvoice.cgst_total || viewingInvoice.cgstTotal).toFixed(2)}</div>
                )}
                {safeNumber(viewingInvoice.sgst_total || viewingInvoice.sgstTotal) > 0 && (
                  <div style={styles.viewSummaryItem}><strong>SGST:</strong> ₹{safeNumber(viewingInvoice.sgst_total || viewingInvoice.sgstTotal).toFixed(2)}</div>
                )}
                {safeNumber(viewingInvoice.igst_total || viewingInvoice.igstTotal) > 0 && (
                  <div style={styles.viewSummaryItem}><strong>IGST:</strong> ₹{safeNumber(viewingInvoice.igst_total || viewingInvoice.igstTotal).toFixed(2)}</div>
                )}
                <div style={{ ...styles.viewSummaryItem, ...styles.viewTotal }}>
                  <strong>Total:</strong> ₹{safeNumber(viewingInvoice.total).toFixed(2)}
                </div>
                <div style={styles.viewAmountWords}>
                  <strong>Amount in Words:</strong> {numberToWords(safeNumber(viewingInvoice.total))} Only
                </div>
              </div>

              {viewingInvoice.notes && (
                <div style={styles.viewSection}>
                  <h4 style={styles.viewSectionTitle}>Terms & Conditions</h4>
                  <div style={styles.viewCard}>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{viewingInvoice.notes}</p>
                  </div>
                </div>
              )}

              <div style={styles.viewActions}>
                <button
                  style={styles.printButton}
                  onClick={() => handlePrintInvoice(viewingInvoice)}
                >
                  🖨️ Print Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal} ref={modalRef}>
            {/* Modal Header */}
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {modalStep === 1 ? "Customer Details" :
                  modalStep === 2 ? "Add Products" :
                    "Payment & Summary"}
              </h3>
              <div style={styles.stepIndicator}>
                Step {modalStep} of 3
              </div>
              <button
                style={styles.closeButton}
                onClick={() => {
                  if (items.length > 0 || customer.name || customer.phone) {
                    if (window.confirm("Are you sure you want to close? Your progress will be lost.")) {
                      resetForm();
                      setShowModal(false);
                    }
                  } else {
                    resetForm();
                    setShowModal(false);
                  }
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div style={styles.modalContent}>
              {error && (
                <div style={{ ...styles.alert, ...styles.alertError, marginBottom: '20px' }}>
                  ⚠️ {error}
                </div>
              )}

              {success && (
                <div style={{ ...styles.alert, ...styles.alertSuccess, marginBottom: '20px' }}>
                  ✅ {success}
                </div>
              )}

              {/* Step 1: Customer Details */}
              {modalStep === 1 && (
                <div style={styles.stepContent}>
                  <div style={styles.formGrid}>
                    <div style={styles.formField}>
                      <label style={styles.label}>Customer Name *</label>
                      <input
                        style={{ ...styles.input, borderColor: customerErrors.name ? '#ef4444' : '#334155' }}
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                        placeholder="Enter customer name"
                      />
                      {customerErrors.name && (
                        <span style={styles.errorText}>{customerErrors.name}</span>
                      )}
                    </div>

                    <div style={styles.formField}>
                      <label style={styles.label}>Phone *</label>
                      <input
                        style={{ ...styles.input, borderColor: customerErrors.phone ? '#ef4444' : '#334155' }}
                        value={customer.phone}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                        placeholder="10 digit mobile number"
                        maxLength="10"
                      />
                      {customerErrors.phone && (
                        <span style={styles.errorText}>{customerErrors.phone}</span>
                      )}
                    </div>

                    <div style={styles.formField}>
                      <label style={styles.label}>Email</label>
                      <input
                        style={{ ...styles.input, borderColor: customerErrors.email ? '#ef4444' : '#334155' }}
                        type="email"
                        value={customer.email}
                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                      {customerErrors.email && (
                        <span style={styles.errorText}>{customerErrors.email}</span>
                      )}
                    </div>

                    <div style={styles.formField}>
                      <label style={styles.label}>Address</label>
                      <input
                        style={styles.input}
                        value={customer.address}
                        onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                        placeholder="Enter address"
                      />
                    </div>

                    <div style={styles.formField}>
                      <label style={styles.label}>GSTIN (Optional)</label>
                      <input
                        style={{ ...styles.input, borderColor: customerErrors.gstin ? '#ef4444' : '#334155' }}
                        value={customer.gstin}
                        onChange={(e) => setCustomer({ ...customer, gstin: e.target.value.toUpperCase() })}
                        placeholder="22AAAAA0000A1Z5"
                        maxLength="15"
                      />
                      {customerErrors.gstin && (
                        <span style={styles.errorText}>{customerErrors.gstin}</span>
                      )}
                    </div>
                  </div>

                  <div style={styles.dateSection}>
                    <div style={styles.dateField}>
                      <label style={styles.label}>Invoice Date</label>
                      <input
                        type="date"
                        style={styles.dateInput}
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                      />
                    </div>
                    <div style={styles.dateField}>
                      <label style={styles.label}>Due Date</label>
                      <input
                        type="date"
                        style={styles.dateInput}
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        min={invoiceDate}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Add Products */}
              {modalStep === 2 && (
                <div style={styles.stepContent}>
                  {/* Product Search */}
                  <div ref={searchRef} style={styles.searchWrapper}>
                    <div style={styles.searchContainer}>
                      <input
                        style={styles.searchInput}
                        placeholder="Search product by name, model or SKU... (min 2 characters)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      {searchLoading && <span style={styles.loadingText}>Searching...</span>}
                    </div>

                    {searchError && (
                      <div style={styles.searchError}>
                        {searchError}
                      </div>
                    )}

                    {products.length > 0 && (
                      <div style={styles.dropdown}>
                        {products.map((p) => (
                          <div key={p.id} style={styles.dropdownItem} onClick={() => addProduct(p)}>
                            <div style={styles.productInfo}>
                              <strong>{p.name}</strong>
                              {p.model && <span style={styles.productModel}>({p.model})</span>}
                              {p.type && <span style={styles.productType}> - {p.type}</span>}
                            </div>
                            <div style={styles.productPrice}>
                              ₹{p.sellPrice || p.price || 0}
                              {p.quantity !== undefined && (
                                <span style={{ ...styles.stockInfo, color: p.quantity < 5 ? '#ef4444' : '#94a3b8' }}>
                                  Stock: {p.quantity}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Products Table */}
                  {items.length > 0 && (
                    <div style={styles.tableContainer}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Product</th>
                            <th style={styles.th}>HSN</th>
                            <th style={styles.th}>Price</th>
                            <th style={styles.th}>Qty</th>
                            <th style={styles.th}>GST%</th>
                            <th style={styles.th}>Total</th>
                            <th style={styles.th}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => (
                            <tr key={index}>
                              <td style={styles.td}>
                                <div>{item.name}</div>
                                {item.model && <small style={styles.modelText}>{item.model}</small>}
                              </td>
                              <td style={styles.td}>{item.hsnCode || "-"}</td>
                              <td style={styles.td}>₹{safeNumber(item.price).toFixed(2)}</td>
                              <td style={styles.td}>
                                <input
                                  type="number"
                                  style={styles.qtyInput}
                                  value={item.quantity}
                                  min="1"
                                  onChange={(e) => changeQty(index, parseInt(e.target.value) || 1)}
                                />
                              </td>
                              <td style={styles.td}>{item.gst}%</td>
                              <td style={styles.td}>₹{(item.price * item.quantity).toFixed(2)}</td>
                              <td style={styles.td}>
                                <button style={styles.deleteBtn} onClick={() => removeItem(index)}>
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {items.length === 0 && !searchLoading && !searchError && (
                    <div style={styles.emptyState}>
                      <p>No products added yet. Search and add products above.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Payment & Summary */}
              {modalStep === 3 && (
                <div style={styles.stepContent}>
                  {/* Payment Details */}
                  <div style={styles.paymentSection}>
                    <h4 style={styles.sectionTitle}>Payment Details</h4>
                    <div style={styles.paymentGrid}>
                      <div style={styles.formField}>
                        <label style={styles.label}>Payment Method</label>
                        <select
                          style={styles.select}
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="cheque">Cheque</option>
                          <option value="online">Online</option>
                        </select>
                      </div>

                      <div style={styles.formField}>
                        <label style={styles.label}>Payment Status</label>
                        <select
                          style={styles.select}
                          value={paymentStatus}
                          onChange={(e) => setPaymentStatus(e.target.value)}
                        >
                          <option value="paid">Paid</option>
                          <option value="unpaid">Unpaid</option>
                          <option value="partial">Partial</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Type */}
                  <div style={styles.transactionSection}>
                    <h4 style={styles.sectionTitle}>Transaction Type</h4>
                    <div style={styles.transactionToggle}>
                      <label style={styles.radioLabel}>
                        <input
                          type="radio"
                          checked={!isInterState}
                          onChange={() => setIsInterState(false)}
                        />
                        Intra-State (CGST + SGST)
                      </label>
                      <label style={styles.radioLabel}>
                        <input
                          type="radio"
                          checked={isInterState}
                          onChange={() => setIsInterState(true)}
                        />
                        Inter-State (IGST)
                      </label>
                    </div>
                  </div>

                  {/* Summary */}
                  {items.length > 0 && (
                    <div style={styles.summarySection}>
                      <h4 style={styles.summaryTitle}>Summary</h4>

                      <div style={styles.summaryRow}>
                        <span>Subtotal:</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                      </div>

                      <div style={styles.discountRow}>
                        <select
                          style={styles.discountTypeSelect}
                          value={discountType}
                          onChange={(e) => {
                            setDiscountType(e.target.value);
                            setDiscount(0);
                          }}
                        >
                          <option value="fixed">Fixed (₹)</option>
                          <option value="percentage">Percentage (%)</option>
                        </select>
                        <input
                          type="number"
                          style={styles.discountInput}
                          placeholder={discountType === "fixed" ? "Discount amount" : "Discount %"}
                          value={discount}
                          min="0"
                          max={discountType === "percentage" ? "100" : subtotal}
                          step={discountType === "fixed" ? "1" : "0.1"}
                          onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      {discountAmount > 0 && (
                        <div style={styles.summaryRow}>
                          <span>Discount:</span>
                          <span style={styles.discountAmount}>-₹{discountAmount.toFixed(2)}</span>
                        </div>
                      )}

                      <div style={styles.summaryRow}>
                        <span>Taxable Amount:</span>
                        <span>₹{taxableAmount.toFixed(2)}</span>
                      </div>

                      {Object.keys(gstDetails).length > 0 && (
                        <>
                          <hr style={styles.divider} />
                          <h5 style={styles.gstTitle}>GST Breakdown</h5>
                          {Object.entries(gstDetails).map(([rate, details]) => (
                            rate > 0 ? (
                              <div key={rate} style={styles.gstRow}>
                                <span>GST @{rate}%:</span>
                                <span>
                                  {isInterState ? (
                                    <>IGST: ₹{details.igst.toFixed(2)}</>
                                  ) : (
                                    <>CGST: ₹{details.cgst.toFixed(2)} | SGST: ₹{details.sgst.toFixed(2)}</>
                                  )}
                                </span>
                              </div>
                            ) : null
                          ))}
                        </>
                      )}

                      <div style={styles.totalRow}>
                        <span>Total:</span>
                        <span style={styles.totalAmount}>₹{total.toFixed(2)}</span>
                      </div>

                      <div style={styles.amountWords}>
                        <strong>Amount in Words:</strong> {numberToWords(total)} Only
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div style={styles.notesSection}>
                    <label style={styles.label}>Notes / Terms & Conditions:</label>
                    <textarea
                      style={styles.notesInput}
                      rows="3"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter any additional notes, terms, or conditions..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={styles.modalFooter}>
              {modalStep > 1 && (
                <button
                  style={styles.backButton}
                  onClick={handleBackStep}
                >
                  Back
                </button>
              )}

              {modalStep < 3 ? (
                <button
                  style={styles.nextButton}
                  onClick={handleNextStep}
                  disabled={modalStep === 2 && items.length === 0}
                >
                  Next
                </button>
              ) : (
                <button
                  style={styles.saveButton}
                  onClick={saveInvoice}
                  disabled={loading || items.length === 0}
                >
                  {loading ? "Creating..." : "Save Invoice"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: "30px",
    color: "#fff",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: "#0b1120",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#fff",
    margin: 0,
  },
  authMessage: {
    background: "#1e293b",
    padding: "40px",
    borderRadius: "12px",
    textAlign: "center",
    maxWidth: "400px",
    margin: "100px auto",
  },
  createButton: {
    background: "#3b82f6",
    color: "#fff",
    padding: "12px 24px",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#2563eb",
    },
  },
  filterBar: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto",
    gap: "12px",
    marginBottom: "20px",
    padding: "16px",
    backgroundColor: "#1e293b",
    borderRadius: "8px",
    border: "1px solid #334155",
  },
  searchBox: {
    position: "relative",
  },
  searchInput: {
    width: "100%",
    padding: "10px 12px",
    paddingRight: "35px",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    color: "#fff",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
    ":focus": {
      borderColor: "#3b82f6",
    },
  },
  clearSearch: {
    position: "absolute",
    right: "8px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "20px",
    cursor: "pointer",
    padding: "0 4px",
    ":hover": {
      color: "#fff",
    },
  },
  filterInput: {
    padding: "10px",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    color: "#fff",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
  },
  filterSelect: {
    padding: "10px",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    color: "#fff",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    cursor: "pointer",
  },
  resetButton: {
    padding: "10px 16px",
    backgroundColor: "#475569",
    border: "none",
    color: "#fff",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#64748b",
    },
  },
  resultsCount: {
    marginBottom: "12px",
    color: "#94a3b8",
    fontSize: "14px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modal: {
    background: "#1e293b",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "1000px",
    maxHeight: "90vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)",
  },
  modalHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #334155",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#fff",
    margin: 0,
  },
  stepIndicator: {
    color: "#94a3b8",
    fontSize: "14px",
  },
  closeButton: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "24px",
    cursor: "pointer",
    padding: "0 8px",
    ":hover": {
      color: "#fff",
    },
  },
  modalContent: {
    padding: "24px",
    overflowY: "auto",
    flex: 1,
  },
  modalFooter: {
    padding: "20px 24px",
    borderTop: "1px solid #334155",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  stepContent: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  label: {
    color: "#e2e8f0",
    fontSize: "14px",
    fontWeight: "500",
  },
  input: {
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
    ":focus": {
      borderColor: "#3b82f6",
    },
  },
  select: {
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
  },
  alert: {
    padding: '12px',
    borderRadius: '5px',
    fontWeight: 'bold',
  },
  alertError: {
    background: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
  },
  alertSuccess: {
    background: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
  },
  errorText: {
    color: "#ef4444",
    fontSize: "12px",
    marginTop: "4px",
  },
  dateSection: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
    marginTop: "8px",
  },
  dateField: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  dateInput: {
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "#fff",
    fontSize: "14px",
  },
  searchWrapper: {
    position: "relative",
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px",
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: "14px",
  },
  searchError: {
    color: "#ef4444",
    fontSize: "14px",
    padding: "8px 12px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: "6px",
    marginBottom: "8px",
  },
  dropdown: {
    position: "absolute",
    background: "#1e293b",
    color: "#fff",
    width: "100%",
    marginTop: "4px",
    borderRadius: "6px",
    border: "1px solid #334155",
    maxHeight: "300px",
    overflowY: "auto",
    zIndex: 1001,
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
  },
  dropdownItem: {
    padding: "12px 16px",
    cursor: "pointer",
    borderBottom: "1px solid #334155",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#2d3a4f",
    },
  },
  productInfo: {
    display: "flex",
    flexDirection: "column",
  },
  productModel: {
    fontSize: "12px",
    color: "#94a3b8",
    marginLeft: "4px",
  },
  productType: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  productPrice: {
    fontWeight: "600",
    color: "#22c55e",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  stockInfo: {
    fontSize: "12px",
    marginLeft: "8px",
  },
  tableContainer: {
    overflowX: "auto",
    marginTop: "16px",
    maxHeight: "400px",
    overflowY: "auto",
    border: "1px solid #334155",
    borderRadius: "6px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },
  th: {
    textAlign: "left",
    padding: "12px 8px",
    borderBottom: "2px solid #334155",
    color: "#94a3b8",
    fontWeight: "600",
    position: "sticky",
    top: 0,
    backgroundColor: "#1e293b",
  },
  td: {
    padding: "12px 8px",
    borderBottom: "1px solid #334155",
  },
  modelText: {
    color: "#94a3b8",
    fontSize: "12px",
  },
  qtyInput: {
    width: "60px",
    padding: "6px",
    borderRadius: "4px",
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "#fff",
    textAlign: "center",
  },
  deleteBtn: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "500",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#dc2626",
    },
  },
  paymentSection: {
    background: "#0f172a",
    padding: "20px",
    borderRadius: "8px",
  },
  sectionTitle: {
    color: "#e2e8f0",
    fontSize: "16px",
    fontWeight: "600",
    marginBottom: "16px",
  },
  paymentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
  },
  transactionSection: {
    background: "#0f172a",
    padding: "20px",
    borderRadius: "8px",
  },
  transactionToggle: {
    display: "flex",
    gap: "24px",
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#e2e8f0",
    fontSize: "14px",
    cursor: "pointer",
  },
  summarySection: {
    background: "#0f172a",
    padding: "16px",
    borderRadius: "8px",
    marginTop: "16px",
  },
  summaryTitle: {
    color: "#e2e8f0",
    fontSize: "16px",
    fontWeight: "600",
    marginBottom: "12px",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
    color: "#e2e8f0",
  },
  discountRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "8px",
  },
  discountTypeSelect: {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "#fff",
    fontSize: "14px",
    flex: 1,
  },
  discountInput: {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "#fff",
    fontSize: "14px",
    flex: 2,
  },
  discountAmount: {
    color: "#ef4444",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "2px solid #334155",
    fontSize: "16px",
    fontWeight: "600",
    color: "#fff",
  },
  totalAmount: {
    color: "#22c55e",
  },
  divider: {
    border: "none",
    borderTop: "1px solid #334155",
    margin: "12px 0",
  },
  gstTitle: {
    color: "#e2e8f0",
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "8px",
  },
  gstRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    color: "#94a3b8",
    marginBottom: "4px",
  },
  notesSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "16px",
  },
  notesInput: {
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "#fff",
    fontSize: "14px",
    resize: "vertical",
    outline: "none",
    ":focus": {
      borderColor: "#3b82f6",
    },
  },
  emptyState: {
    textAlign: "center",
    padding: "40px",
    color: "#94a3b8",
    backgroundColor: "#0f172a",
    borderRadius: "8px",
  },
  loadingState: {
    textAlign: "center",
    padding: "40px",
    color: "#94a3b8",
  },
  nextButton: {
    background: "#3b82f6",
    color: "#fff",
    padding: "10px 24px",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#2563eb",
    },
    ":disabled": {
      backgroundColor: "#64748b",
      cursor: "not-allowed",
    },
  },
  backButton: {
    background: "#64748b",
    color: "#fff",
    padding: "10px 24px",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#475569",
    },
  },
  saveButton: {
    background: "#22c55e",
    color: "#fff",
    padding: "10px 24px",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
    ":disabled": {
      backgroundColor: "#94a3b8",
      cursor: "not-allowed",
    },
    ":hover:not(:disabled)": {
      backgroundColor: "#16a34a",
    },
  },
  actionButtons: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  viewButton: {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#2563eb",
    },
  },
  printButton: {
    background: "#64748b",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "4px",
    fontSize: "14px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#475569",
    },
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "20px",
    marginTop: "20px",
    padding: "10px",
  },
  pageButton: {
    background: "#334155",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: "4px",
    fontSize: "14px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    ":disabled": {
      backgroundColor: "#1e293b",
      color: "#64748b",
      cursor: "not-allowed",
    },
    ":hover:not(:disabled)": {
      backgroundColor: "#475569",
    },
  },
  pageInfo: {
    color: "#94a3b8",
    fontSize: "14px",
  },
  statusBadge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#fff",
    display: "inline-block",
  },
  viewCompanyHeader: {
    textAlign: "center",
    marginBottom: "24px",
    padding: "16px",
    background: "#0f172a",
    borderRadius: "8px",
    border: "1px solid #334155",
  },
  viewTwoColumn: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "24px",
  },
  viewColumn: {
    width: "100%",
  },
  viewSection: {
    marginBottom: "20px",
  },
  viewSectionTitle: {
    color: "#e2e8f0",
    fontSize: "16px",
    fontWeight: "600",
    marginBottom: "10px",
  },
  viewCard: {
    background: "#0f172a",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid #334155",
  },
  viewSummary: {
    background: "#0f172a",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "20px",
    border: "1px solid #334155",
  },
  viewSummaryItem: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
    color: "#e2e8f0",
  },
  viewTotal: {
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "2px solid #334155",
    fontSize: "18px",
    fontWeight: "600",
    color: "#22c55e",
  },
  viewAmountWords: {
    marginTop: "12px",
    paddingTop: "8px",
    color: "#94a3b8",
    fontSize: "14px",
    fontStyle: "italic",
  },
  viewActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
  },
  statusUpdateSection: {
    background: "#0f172a",
    padding: "16px",
    borderRadius: "8px",
    marginBottom: "20px",
    border: "1px solid #334155",
  },
  statusUpdateRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
  },
  statusUpdateField: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  statusSelect: {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #334155",
    backgroundColor: "#1e293b",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
  },
  amountWords: {
    marginTop: "8px",
    color: "#94a3b8",
    fontSize: "14px",
    fontStyle: "italic",
  },
};

export default InvoicePage;