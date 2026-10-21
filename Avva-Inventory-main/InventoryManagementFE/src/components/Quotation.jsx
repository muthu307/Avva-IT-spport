import React, { useState, useEffect, useRef } from "react";
import api from '../utils/api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const QuotationPage = () => {


  // Company details
  const companyDetails = {
    name: "Avva Inventory",
    address: "No.71, M.T.H.road (Opp padi post office), Padi, Chennai - 600 050",
    phone: "98657 09626",
    email: "hiprintsolutions@gmail.com",
    gstin: "33ABCDE1234F1Z5"
  };

  // State for quotations list
  const [quotations, setQuotations] = useState([]);
  const [filteredQuotations, setFilteredQuotations] = useState([]);
  const [quotationsLoading, setQuotationsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    pages: 1
  });
  const [viewingQuotation, setViewingQuotation] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [sortBy, setSortBy] = useState('newest');

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
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [customerErrors, setCustomerErrors] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savedQuotation, setSavedQuotation] = useState(null);

  const searchRef = useRef(null);
  const modalRef = useRef(null);
  const viewModalRef = useRef(null);

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
      fetchQuotations();
    }
  }, []);

  // Fetch quotations when page changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchQuotations();
    }
  }, [pagination.page]);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    if (quotations.length > 0) {
      applyFilters();
    }
  }, [quotations, searchTerm, dateRange, sortBy]);

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
        setViewingQuotation(null);
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

  // Fetch quotations from backend
  const fetchQuotations = async () => {
    if (!isAuthenticated) return;

    setQuotationsLoading(true);

    try {
      let url = `/quotation?page=${pagination.page}&per_page=10`;

      const response = await api.get(url);

      if (response.data) {
        const quotationsData = response.data.items || [];
        setQuotations(quotationsData);
        setFilteredQuotations(quotationsData);
        setPagination({
          page: response.data.current_page || 1,
          per_page: 10,
          total: response.data.total || 0,
          pages: response.data.pages || 1
        });
      }
    } catch (err) {
      console.error('Error fetching quotations:', err);
      setError('Failed to load quotations');
      setTimeout(() => setError(''), 3000);
    } finally {
      setQuotationsLoading(false);
    }
  };

  // Apply filters to quotations
  const applyFilters = () => {
    let filtered = [...quotations];

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(q =>
        (q.quotationNumber?.toLowerCase().includes(term)) ||
        (q.customerName?.toLowerCase().includes(term)) ||
        (q.customerPhone?.toLowerCase().includes(term)) ||
        (q.customerEmail?.toLowerCase().includes(term)) ||
        (q.customerGstin?.toLowerCase().includes(term))
      );
    }

    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);

      filtered = filtered.filter(q => {
        const qDate = new Date(q.quotationDate);
        return qDate >= start && qDate <= end;
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.quotationDate) - new Date(a.quotationDate);
        case 'oldest':
          return new Date(a.quotationDate) - new Date(b.quotationDate);
        case 'highest':
          return (b.total || 0) - (a.total || 0);
        case 'lowest':
          return (a.total || 0) - (b.total || 0);
        default:
          return 0;
      }
    });

    setFilteredQuotations(filtered);
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setDateRange({ start: '', end: '' });
    setSortBy('newest');
    setFilteredQuotations(quotations);
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const exportData = filteredQuotations.map(q => ({
        'Quotation #': q.quotationNumber || '',
        'Date': new Date(q.quotationDate).toLocaleDateString(),
        'Customer Name': q.customerName || '',
        'Customer Phone': q.customerPhone || '',
        'Customer Email': q.customerEmail || '',
        'Valid Until': new Date(q.validUntil).toLocaleDateString(),
        'Subtotal (₹)': (q.subtotal || 0).toFixed(2),
        'Discount (₹)': (q.discount || 0).toFixed(2),
        'Total (₹)': (q.total || 0).toFixed(2),
        'Items Count': q.items?.length || 0
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Quotations");

      const wscols = [
        { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 15 },
        { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
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
      saveAs(file, `Quotations_${date}.xlsx`);

      setSuccess(`✅ Exported ${filteredQuotations.length} quotations to Excel`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error("Export error:", err);
      setError("❌ Failed to export to Excel");
      setTimeout(() => setError(''), 3000);
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

  // Export Summary List to PDF (Beautifully Aligned & Professional)
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('portrait');
      const pageWidth = doc.internal.pageSize.width || 210;
      const pageHeight = doc.internal.pageSize.height || 297;

      // 1. Company Header Banner
      doc.setFontSize(18);
      doc.setTextColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
      doc.text(companyDetails.name, 14, 18);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(companyDetails.address, 14, 24);
      doc.text(`Phone: ${companyDetails.phone} | Email: ${companyDetails.email} | GST: ${companyDetails.gstin}`, 14, 29);

      // Blue Divider Line
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.8);
      doc.line(14, 33, pageWidth - 14, 33);

      // 2. Report Title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('QUOTATIONS SUMMARY REPORT', 14, 42);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - 14, 42, { align: 'right' });

      // 3. Filter Criteria & Summary KPI Box
      let currentY = 47;
      if (searchTerm || (dateRange.start && dateRange.end)) {
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, currentY, pageWidth - 28, 10, 2, 2, 'FD');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        let filterText = 'Active Filters: ';
        if (searchTerm) filterText += `Search: "${searchTerm}"  `;
        if (dateRange.start && dateRange.end) filterText += `Date Range: ${dateRange.start} to ${dateRange.end}`;
        doc.text(filterText, 18, currentY + 6.5);
        currentY += 13;
      } else {
        currentY += 3;
      }

      // Summary KPI Cards (Total Quotations & Total Value)
      const totalAmount = filteredQuotations.reduce((sum, q) => sum + (parseFloat(q.total) || 0), 0);
      const cardWidth = (pageWidth - 34) / 2;

      // KPI Card 1: Count
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.roundedRect(14, currentY, cardWidth, 16, 2, 2, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL QUOTATIONS', 18, currentY + 6);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`${filteredQuotations.length}`, 18, currentY + 12);

      // KPI Card 2: Total Amount
      doc.setFillColor(238, 242, 255);
      doc.setDrawColor(199, 210, 254);
      doc.roundedRect(14 + cardWidth + 6, currentY, cardWidth, 16, 2, 2, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(79, 70, 229);
      doc.text('TOTAL VALUE', 18 + cardWidth + 6, currentY + 6);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(67, 56, 202);
      doc.text(`Rs. ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 18 + cardWidth + 6, currentY + 12);

      currentY += 21;

      // 4. Quotations Table (Perfect Alignment & Column Widths)
      const tableColumn = [
        'Quotation #', 'Date', 'Customer Name', 'Phone', 'Valid Until', 'Total Amount'
      ];

      const tableRows = filteredQuotations.map(q => {
        const qDateStr = q.quotationDate ? new Date(q.quotationDate).toLocaleDateString('en-IN') : 'N/A';
        const validUntilStr = q.validUntil ? new Date(q.validUntil).toLocaleDateString('en-IN') : 'N/A';
        const amt = parseFloat(q.total) || 0;

        return [
          q.quotationNumber || '',
          qDateStr,
          q.customerName || 'N/A',
          q.customerPhone || 'N/A',
          validUntilStr,
          `Rs. ${amt.toFixed(2)}`
        ];
      });

      callAutoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: currentY,
        styles: {
          fontSize: 8.5,
          cellPadding: 4,
          font: 'helvetica',
          textColor: [30, 41, 59],
          overflow: 'ellipsize' // Default all cells to single-line
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 32, overflow: 'linebreak' }, // Quotation #
          1: { halign: 'center', cellWidth: 24, overflow: 'ellipsize' },
          2: { halign: 'left',   cellWidth: 50, overflow: 'ellipsize' },
          3: { halign: 'center', cellWidth: 28, overflow: 'ellipsize' },
          4: { halign: 'center', cellWidth: 24, overflow: 'ellipsize' },
          5: { halign: 'right',  cellWidth: 24, overflow: 'ellipsize' }
        },
        didDrawPage: (data) => {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(148, 163, 184);
          doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
          doc.text('Avva Inventory System', 14, pageHeight - 10);
        }
      });

      const date = new Date().toISOString().split('T')[0];
      doc.save(`Quotations_Report_${date}.pdf`);

      setSuccess(`✅ Exported ${filteredQuotations.length} quotations to PDF`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error("PDF export error:", err);
      setError("❌ Failed to export to PDF");
      setTimeout(() => setError(''), 3000);
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
        console.error("Unexpected response format:", response.data);
        setSearchError("Received unexpected data format from server");
        setProducts([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      if (err.response) {
        if (err.response.status === 401) {
          setSearchError('Session expired. Please login again.');
        } else if (err.response.status === 404) {
          setSearchError('Search endpoint not found. Please check API configuration.');
        } else {
          setSearchError(err.response.data?.error || `Failed to search products (Status: ${err.response.status})`);
        }
      } else if (err.request) {
        setSearchError('No response from server. Please check your connection.');
      } else {
        setSearchError('Error setting up search request. Please try again.');
      }
      setProducts([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch single quotation details
  const fetchQuotationDetails = async (id) => {
    try {
      const response = await api.get(`/quotation/${id}`);
      setViewingQuotation(response.data);
      setShowViewModal(true);
    } catch (err) {
      console.error('Error fetching quotation details:', err);
      setError('Failed to load quotation details');
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
    }
  };

  // Handle back step
  const handleBackStep = () => {
    setModalStep(1);
  };

  // Reset form
  const resetForm = () => {
    setCustomer({ name: "", phone: "", email: "", address: "", gstin: "" });
    setItems([]);
    setDiscount(0);
    setDiscountType("fixed");
    setNotes("");
    setQuotationDate(new Date().toISOString().split('T')[0]);
    setValidUntil(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setModalStep(1);
    setCustomerErrors({});
    setSearch("");
    setProducts([]);
    setSearchError("");
    setError('');
    setSuccess('');
    setSavedQuotation(null);
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
      setSuccess(`${product.name} added to quotation`);
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
    setSuccess(`${removedItem.name} removed from quotation`);
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
  const total = subtotal - discountAmount;

  // Calculate GST
  const calculateGST = () => {
    const gstDetails = {};
    items.forEach(item => {
      const gstRate = item.gst || 0;
      const itemTotal = item.price * item.quantity;
      if (!gstDetails[gstRate]) {
        gstDetails[gstRate] = {
          taxable: 0,
          cgst: 0,
          sgst: 0,
          total: 0
        };
      }

      if (gstRate > 0) {
        const taxableValue = itemTotal * (100 / (100 + gstRate));
        const gstAmount = itemTotal - taxableValue;

        gstDetails[gstRate].taxable += taxableValue;
        gstDetails[gstRate].cgst += gstAmount / 2;
        gstDetails[gstRate].sgst += gstAmount / 2;
      } else {
        gstDetails[gstRate].taxable += itemTotal;
      }
      gstDetails[gstRate].total += itemTotal;
    });
    return gstDetails;
  };

  // SAVE QUOTATION
  const saveQuotation = async () => {
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
      quotationDate,
      validUntil,
      discount: discountAmount,
      discountType,
      discountRate: discount,
      notes: notes.trim() || '',
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        gst: item.gst || 0
      }))
    };

    console.log('Saving quotation with payload:', payload);

    try {
      const res = await api.post('/quotation', payload);
      console.log('Quotation saved successfully:', res.data);

      setSavedQuotation(res.data.quotation);
      setSuccess(`✅ Quotation Created Successfully!\nQuotation Number: ${res.data.quotationNumber}`);

      fetchQuotations();

      setTimeout(() => {
        if (window.confirm(`Quotation ${res.data.quotationNumber} saved successfully!\n\nDo you want to print it?`)) {
          handlePrintQuotation(res.data.quotation);
        }

        resetForm();
        setShowModal(false);
        setSuccess('');
      }, 2000);

    } catch (err) {
      console.error("Error creating quotation:", err);

      let errorMessage = "Failed to save quotation. ";

      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = "Session expired. Please login again.";
        } else if (err.response.status === 400) {
          errorMessage = err.response.data?.error || "Invalid data. Please check your inputs.";

          if (err.response.data?.errors) {
            const fieldErrors = Object.entries(err.response.data.errors)
              .map(([field, msg]) => `${field}: ${msg}`)
              .join('\n');
            errorMessage += `\n${fieldErrors}`;
          }
        } else if (err.response.status === 422) {
          errorMessage = err.response.data?.error || "Validation failed. Please check your inputs.";
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

  // Function to print quotation
  const handlePrintQuotation = (quotation) => {
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      const itemsHtml = quotation.items.map(item => `
        <tr>
          <td style="padding: 5px 8px; border: 1px solid #cbd5e1;">${item.productName} ${item.productModel ? `(${item.productModel})` : ''}</td>
          <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center;">${item.quantity}</td>
          <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right;">₹${item.price.toFixed(2)}</td>
          <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right;">₹${item.total.toFixed(2)}</td>
        </tr>
      `).join('');

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Quotation ${quotation.quotationNumber}</title>
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
              border-bottom: 2px solid #3b82f6;
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
              color: #3b82f6;
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
              color: #1e293b;
              letter-spacing: 1px;
            }
            .details-table {
              width: 100%;
              margin: 6px 0;
              border-spacing: 0;
            }
            .details-table td {
              vertical-align: top;
              padding: 0;
            }
            .detail-box {
              background: #f8fafc;
              padding: 8px 10px;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
            }
            .detail-box h3 {
              margin-top: 0;
              margin-bottom: 4px;
              color: #3b82f6;
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
              background-color: #3b82f6; 
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
            .summary { 
              margin: 6px 0; 
              text-align: right; 
            }
            .summary-item {
              margin-bottom: 2px;
              font-size: 10.5px;
            }
            .total { 
              font-size: 14px; 
              font-weight: bold; 
              color: #22c55e; 
              margin-top: 4px;
              padding-top: 4px;
              border-top: 1.5px solid #333;
            }
            .notes {
              margin-top: 6px;
              padding: 6px 10px;
              background: #f8fafc;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
              border-left: 4px solid #3b82f6;
              font-size: 9.5px;
            }
            .notes h4 {
              margin: 0 0 2px 0;
              color: #3b82f6;
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
          
          <div class="document-title">QUOTATION</div>
          
          <table class="details-table">
            <tr>
              <td style="width: 48%;">
                <div class="detail-box">
                  <h3>Bill To:</h3>
                  <p><strong>${quotation.customerName}</strong></p>
                  <p>Phone: ${quotation.customerPhone}</p>
                  ${quotation.customerEmail ? `<p>Email: ${quotation.customerEmail}</p>` : ''}
                  ${quotation.customerAddress ? `<p>Address: ${quotation.customerAddress}</p>` : ''}
                  ${quotation.customerGstin ? `<p>GSTIN: ${quotation.customerGstin}</p>` : ''}
                </div>
              </td>
              <td style="width: 4%;"></td>
              <td style="width: 48%;">
                <div class="detail-box">
                  <h3>Quotation Details:</h3>
                  <p><strong>Quotation No:</strong> ${quotation.quotationNumber}</p>
                  <p><strong>Date:</strong> ${new Date(quotation.quotationDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                  <p><strong>Valid Until:</strong> ${new Date(quotation.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                  <p><strong>Prepared By:</strong> ${JSON.parse(localStorage.getItem('user'))?.username || 'Admin'}</p>
                </div>
              </td>
            </tr>
          </table>
          
          <table>
            <thead>
              <tr>
                <th style="padding: 5px 8px; border: 1px solid #cbd5e1;">Product Description</th>
                <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center; width: 60px;">Qty</th>
                <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right; width: 100px;">Unit Price</th>
                <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right; width: 120px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="summary">
            <div style="width: 250px; margin-left: auto;">
              <div class="summary-item">
                <span style="display: inline-block; width: 120px; text-align: left;"><strong>Subtotal:</strong></span>
                <span style="display: inline-block; width: 100px; text-align: right;">₹${quotation.subtotal.toFixed(2)}</span>
              </div>
              ${quotation.discount > 0 ? `
              <div class="summary-item">
                <span style="display: inline-block; width: 120px; text-align: left;"><strong>Discount:</strong></span>
                <span style="display: inline-block; width: 100px; text-align: right; color: #ef4444;">-₹${quotation.discount.toFixed(2)}</span>
              </div>` : ''}
              <div class="total">
                <span style="display: inline-block; width: 120px; text-align: left;"><strong>Total:</strong></span>
                <span style="display: inline-block; width: 100px; text-align: right;">₹${quotation.total.toFixed(2)}</span>
              </div>
              <div style="font-size: 9.5px; margin-top: 3px; color: #64748b; font-style: italic;">(Inclusive of all taxes)</div>
            </div>
          </div>
          
          ${quotation.notes ? `
            <div class="notes">
              <h4>Terms & Conditions:</h4>
              <p>${quotation.notes}</p>
            </div>
          ` : `
            <div class="notes">
              <h4>Terms & Conditions:</h4>
              <ul style="margin:0; padding-left:16px;">
                <li>Quotation valid for 7 days from the date of issue</li>
                <li>Prices are subject to change without prior notice</li>
                <li>Payment terms: 100% advance or as agreed</li>
                <li>Delivery: As per availability</li>
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
            <p>This is a computer generated quotation. Valid until specified date. Thank you for your business!</p>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              }, 500);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
    } else {
      alert('Please allow pop-ups to print the quotation');
    }
  };

  const gstDetails = calculateGST();

  // Show login required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Quotations</h2>
        </div>
        <div style={styles.authMessage}>
          <h3>🔒 Authentication Required</h3>
          <p style={{ color: '#dc3545', margin: '20px 0' }}>{error || 'Please login to access quotations'}</p>
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
      {/* Header with Create Button and Export Buttons - Logo/Title on Left */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h2 style={styles.title}>Quotations</h2>
        </div>
        <div style={styles.headerButtons}>
          <button
            style={styles.exportButton}
            onClick={handleExportExcel}
            title="Export to Excel"
          >
            📊 Excel
          </button>
          <button
            style={styles.exportButton}
            onClick={handleExportPDF}
            title="Export to PDF"
          >
            📄 PDF
          </button>
          <button
            style={styles.createButton}
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            + Create New Quotation
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
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

      {/* Search and Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Search by quotation #, customer name, phone, email..."
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
      {!quotationsLoading && (
        <div style={styles.resultsCount}>
          Showing {filteredQuotations.length} of {quotations.length} quotations
          {filteredQuotations.length !== quotations.length && (
            <span> (filtered)</span>
          )}
        </div>
      )}

      {/* Quotations Table */}
      <div style={styles.tableContainer}>
        {quotationsLoading ? (
          <div style={styles.loadingState}>Loading quotations...</div>
        ) : filteredQuotations.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No quotations found. Click "Create New Quotation" to get started.</p>
          </div>
        ) : (
          <>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Quotation #</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Valid Until</th>
                  <th style={styles.th}>Total</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotations.map((quotation) => (
                  <tr key={quotation.id}>
                    <td style={styles.td}>{quotation.quotationNumber}</td>
                    <td style={styles.td}>{new Date(quotation.quotationDate).toLocaleDateString()}</td>
                    <td style={styles.td}>{quotation.customerName}</td>
                    <td style={styles.td}>{quotation.customerPhone}</td>
                    <td style={styles.td}>{new Date(quotation.validUntil).toLocaleDateString()}</td>
                    <td style={styles.td}>₹{quotation.total?.toFixed(2)}</td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          style={styles.viewButton}
                          onClick={() => fetchQuotationDetails(quotation.id)}
                        >
                          View
                        </button>
                        <button
                          style={styles.printButton}
                          onClick={() => handlePrintQuotation(quotation)}
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
                  Page {pagination.page} of {pagination.pages} (Showing 10 per page)
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

      {/* View Quotation Modal */}
      {showViewModal && viewingQuotation && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, maxWidth: '900px' }} ref={viewModalRef}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                Quotation Details - {viewingQuotation.quotationNumber}
              </h3>
              <button
                style={styles.closeButton}
                onClick={() => {
                  setShowViewModal(false);
                  setViewingQuotation(null);
                }}
              >
                ×
              </button>
            </div>

            <div style={styles.modalContent}>
              {/* Company Header */}
              <div style={styles.viewCompanyHeader}>
                <img src="/avva-logo.jpeg" alt="Avva Inventory Logo" style={{ maxWidth: '120px', marginBottom: '10px' }} />
                <h3 style={{ color: '#3b82f6', margin: 0 }}>{companyDetails.name}</h3>
                <p style={{ margin: '5px 0', color: '#94a3b8' }}>{companyDetails.address}</p>
                <p style={{ margin: 0, color: '#94a3b8' }}>Phone: {companyDetails.phone} | Email: {companyDetails.email}</p>
              </div>

              <div style={styles.viewTwoColumn}>
                <div style={styles.viewColumn}>
                  <div style={styles.viewSection}>
                    <h4 style={styles.viewSectionTitle}>Bill To:</h4>
                    <div style={styles.viewCard}>
                      <p><strong>{viewingQuotation.customerName}</strong></p>
                      <p>Phone: {viewingQuotation.customerPhone}</p>
                      {viewingQuotation.customerEmail && <p>Email: {viewingQuotation.customerEmail}</p>}
                      {viewingQuotation.customerAddress && <p>Address: {viewingQuotation.customerAddress}</p>}
                      {viewingQuotation.customerGstin && <p>GSTIN: {viewingQuotation.customerGstin}</p>}
                    </div>
                  </div>
                </div>

                <div style={styles.viewColumn}>
                  <div style={styles.viewSection}>
                    <h4 style={styles.viewSectionTitle}>Quotation Details:</h4>
                    <div style={styles.viewCard}>
                      <p><strong>Quotation No:</strong> {viewingQuotation.quotationNumber}</p>
                      <p><strong>Date:</strong> {new Date(viewingQuotation.quotationDate).toLocaleDateString('en-IN')}</p>
                      <p><strong>Valid Until:</strong> {new Date(viewingQuotation.validUntil).toLocaleDateString('en-IN')}</p>
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
                        <th style={styles.th}>Price</th>
                        <th style={styles.th}>Qty</th>
                        <th style={styles.th}>GST</th>
                        <th style={styles.th}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingQuotation.items?.map((item, index) => (
                        <tr key={index}>
                          <td style={styles.td}>
                            <div>{item.productName}</div>
                            {item.productModel && <small style={{ color: '#94a3b8' }}>{item.productModel}</small>}
                          </td>
                          <td style={styles.td}>₹{item.price.toFixed(2)}</td>
                          <td style={styles.td}>{item.quantity}</td>
                          <td style={styles.td}>{item.gst}%</td>
                          <td style={styles.td}>₹{item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={styles.viewSummary}>
                <div style={styles.viewSummaryItem}>
                  <span>Subtotal:</span>
                  <span>₹{viewingQuotation.subtotal?.toFixed(2)}</span>
                </div>
                {viewingQuotation.discount > 0 && (
                  <div style={styles.viewSummaryItem}>
                    <span>Discount:</span>
                    <span style={{ color: '#ef4444' }}>-₹{viewingQuotation.discount?.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ ...styles.viewSummaryItem, ...styles.viewTotal }}>
                  <span>Total:</span>
                  <span>₹{viewingQuotation.total?.toFixed(2)}</span>
                </div>
              </div>

              {viewingQuotation.notes && (
                <div style={styles.viewSection}>
                  <h4 style={styles.viewSectionTitle}>Notes / Terms</h4>
                  <div style={styles.viewCard}>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{viewingQuotation.notes}</p>
                  </div>
                </div>
              )}

              <div style={styles.viewActions}>
                <button
                  style={styles.printButton}
                  onClick={() => handlePrintQuotation(viewingQuotation)}
                >
                  🖨️ Print Quotation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Quotation Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal} ref={modalRef}>
            {/* Modal Header */}
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {modalStep === 1 ? "Customer Details" : "Add Products"}
              </h3>
              <div style={styles.stepIndicator}>
                Step {modalStep} of 2
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
                <div style={{ ...styles.alert, ...styles.alertError, marginBottom: '16px' }}>
                  ⚠️ {error}
                </div>
              )}

              {success && (
                <div style={{ ...styles.alert, ...styles.alertSuccess, marginBottom: '16px' }}>
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
                      <label style={styles.label}>Quotation Date</label>
                      <input
                        type="date"
                        style={styles.dateInput}
                        value={quotationDate}
                        onChange={(e) => setQuotationDate(e.target.value)}
                      />
                    </div>
                    <div style={styles.dateField}>
                      <label style={styles.label}>Valid Until</label>
                      <input
                        type="date"
                        style={styles.dateInput}
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        min={quotationDate}
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
                              {p.stock !== undefined && (
                                <span style={{ ...styles.stockInfo, color: p.stock < 5 ? '#ef4444' : '#94a3b8' }}>
                                  Stock: {p.stock}
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
                            <th style={styles.th}>GST</th>
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
                              <td style={styles.td}>₹{item.price.toFixed(2)}</td>
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

                      <div style={styles.totalRow}>
                        <span>Total:</span>
                        <span style={styles.totalAmount}>₹{total.toFixed(2)}</span>
                      </div>

                      {Object.keys(gstDetails).length > 0 && Object.keys(gstDetails).some(rate => rate > 0) && (
                        <div style={styles.gstBreakdown}>
                          <hr style={styles.divider} />
                          <h5 style={styles.gstTitle}>GST Breakdown</h5>
                          {Object.entries(gstDetails).map(([rate, details]) => (
                            rate > 0 ? (
                              <div key={rate} style={styles.gstRow}>
                                <span>GST @{rate}%:</span>
                                <span>
                                  CGST: ₹{details.cgst.toFixed(2)} | SGST: ₹{details.sgst.toFixed(2)}
                                </span>
                              </div>
                            ) : null
                          ))}
                        </div>
                      )}
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

                  {items.length === 0 && !searchLoading && !searchError && (
                    <div style={styles.emptyState}>
                      <p>No products added yet. Search and add products above.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={styles.modalFooter}>
              {modalStep === 2 && (
                <button
                  style={styles.backButton}
                  onClick={handleBackStep}
                >
                  Back
                </button>
              )}

              {modalStep === 1 ? (
                <button
                  style={styles.nextButton}
                  onClick={handleNextStep}
                >
                  Next
                </button>
              ) : (
                <button
                  style={styles.saveButton}
                  onClick={saveQuotation}
                  disabled={loading || items.length === 0}
                >
                  {loading ? "Creating..." : "Save Quotation"}
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
  headerLeft: {
    flex: 1,
  },
  headerButtons: {
    display: "flex",
    gap: "10px",
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
  exportButton: {
    background: "#10b981",
    color: "#fff",
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#059669",
    },
  },
  filterBar: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
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
  gstBreakdown: {
    marginTop: "12px",
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
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
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
  // View modal styles
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
  viewActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
  },
};

export default QuotationPage;