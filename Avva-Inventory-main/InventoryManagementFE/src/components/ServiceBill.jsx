import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { formatDate, formatTime, formatDateTime, parseDateTime } from '../utils/dateUtils';

const ServiceBill = () => {
  // State management
  const [manualServices, setManualServices] = useState([]);
  
  // New service entry form
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceGST, setNewServiceGST] = useState('18');
  const [newServiceCategory, setNewServiceCategory] = useState('General');
  
  // Bill information
  const [billNumber, setBillNumber] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  
  // Customer information
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGST, setCustomerGST] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerType, setCustomerType] = useState('regular'); // Changed from 'external' to 'regular'
  
  // Discount information
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage');
  const [manualDiscount, setManualDiscount] = useState(false);
  
  // Payment information
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  
  // Payment details
  const [cashReceived, setCashReceived] = useState(0);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [billSaved, setBillSaved] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [lastGeneratedBill, setLastGeneratedBill] = useState(null);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [savedBillId, setSavedBillId] = useState(null);
  const [fetchingCustomer, setFetchingCustomer] = useState(false);
  const [isDraftInitialized, setIsDraftInitialized] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Service categories
  const serviceCategories = [
    'General',
    'Repair',
    'Maintenance',
    'Installation',
    'Software',
    'Hardware',
    'Networking',
    'Security',
    'Data Recovery',
    'Consulting',
    'Training',
    'Other'
  ];

  
  const shopDetails = {
    name: 'Avva Inventory',
    phone: '+91 93423 01582',
    address: 'No.71, M.T.H.road (Opp padi post office), Padi',
    city: 'Chennai - 600 050',
    gst: '33ABCDE1234F1Z5'
  };

  // Refs
  const billPaperRef = useRef(null);
  const downloadLinkRef = useRef(null);
  const serviceNameInputRef = useRef(null);


  // Base styles (keeping your existing styles - I'll just show the changes needed)
  const baseStyles = {
    container: {
      display: 'grid',
      gridTemplateColumns: '1fr 350px',
      gap: '20px',
      padding: '20px',
      minHeight: '100vh',
      background: '#f0f0f0',
      fontFamily: "'Courier New', monospace",
    },
    productPanel: {
      background: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      overflow: 'auto',
      maxHeight: 'calc(100vh - 40px)',
    },
    productPanelTitle: {
      marginBottom: '20px',
      color: '#333',
      borderBottom: '2px solid #333',
      paddingBottom: '10px',
      fontSize: '24px',
    },
    alert: {
      padding: '12px',
      borderRadius: '5px',
      marginBottom: '20px',
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
    alertWarning: {
      background: '#fff3cd',
      color: '#856404',
      border: '1px solid #ffeeba',
    },
    manualEntrySection: {
      background: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #e9ecef',
    },
    manualEntryTitle: {
      marginBottom: '15px',
      color: '#333',
      borderBottom: '1px solid #ddd',
      paddingBottom: '8px',
      fontSize: '18px',
      fontWeight: 'bold',
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '10px',
      marginBottom: '15px',
    },
    formGroup: {
      marginBottom: '10px',
    },
    formLabel: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: 'bold',
      color: '#333',
      fontSize: '12px',
    },
    formInput: {
      width: '100%',
      padding: '8px 10px',
      border: '2px solid #ddd',
      borderRadius: '5px',
      fontSize: '14px',
      fontFamily: "'Courier New', monospace",
      outline: 'none',
    },
    formInputError: {
      border: '2px solid #dc3545',
    },
    formTextarea: {
      width: '100%',
      padding: '8px 10px',
      border: '2px solid #ddd',
      borderRadius: '5px',
      fontSize: '14px',
      fontFamily: "'Courier New', monospace",
      resize: 'vertical',
      minHeight: '60px',
    },
    formSelect: {
      width: '100%',
      padding: '8px 10px',
      border: '2px solid #ddd',
      borderRadius: '5px',
      fontSize: '14px',
      fontFamily: "'Courier New', monospace",
      background: 'white',
    },
    addButton: {
      background: '#28a745',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '5px',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      width: '100%',
      marginTop: '10px',
    },
    selectedProducts: {
      marginTop: '20px',
    },
    selectedProductsTitle: {
      marginBottom: '15px',
      color: '#333',
      borderBottom: '1px solid #ddd',
      paddingBottom: '8px',
      fontSize: '18px',
    },
    noItems: {
      textAlign: 'center',
      color: '#999',
      padding: '30px',
      fontStyle: 'italic',
      background: '#f8f9fa',
      borderRadius: '5px',
    },
    selectedItemsList: {
      maxHeight: '400px',
      overflowY: 'auto',
    },
    selectedItem: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 80px 100px 40px',
      gap: '10px',
      padding: '12px',
      background: '#f8f9fa',
      marginBottom: '8px',
      borderRadius: '5px',
      alignItems: 'center',
      border: '1px solid #e9ecef',
    },
    itemInfo: {
      display: 'flex',
      flexDirection: 'column',
    },
    itemName: {
      fontWeight: 'bold',
      color: '#333',
    },
    itemCategory: {
      fontSize: '10px',
      color: '#17a2b8',
    },
    itemDescription: {
      fontSize: '9px',
      color: '#666',
      fontStyle: 'italic',
    },
    itemGSTRate: {
      fontSize: '8px',
      color: '#dc3545',
    },
    itemPrice: {
      fontWeight: 'bold',
      color: '#17a2b8',
    },
    itemTotal: {
      fontWeight: 'bold',
      color: '#17a2b8',
    },
    itemQuantity: {
      width: '70px',
      padding: '5px',
      border: '1px solid #ddd',
      borderRadius: '3px',
      textAlign: 'center',
      fontFamily: "'Courier New', monospace",
    },
    removeBtn: {
      background: '#dc3545',
      color: 'white',
      border: 'none',
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      cursor: 'pointer',
      fontSize: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    billPanel: {
      background: 'white',
      borderRadius: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      position: 'sticky',
      top: '80px',
      height: 'fit-content',
      maxHeight: 'calc(100vh - 95px)',
      overflow: 'auto',
    },
    billContainer: {
      padding: '15px',
    },
    billPaper: {
      background: 'white',
      padding: '15px 12px',
      border: '1px solid #ccc',
      boxShadow: '0 0 10px rgba(0,0,0,0.1)',
      position: 'relative',
      marginBottom: '15px',
      borderRadius: '3px',
      width: '280px',
      margin: '0 auto',
      fontFamily: "'Courier New', monospace",
      fontSize: '11px',
      lineHeight: '1.3',
    },
    billHeader: {
      textAlign: 'center',
      marginBottom: '12px',
      paddingBottom: '8px',
      borderBottom: '1px dashed #333',
    },
    billHeaderH1: {
      fontSize: '16px',
      letterSpacing: '1px',
      marginBottom: '3px',
      color: '#333',
      fontWeight: 'bold',
    },
    billHeaderP: {
      fontSize: '9px',
      color: '#666',
      margin: '1px 0',
      lineHeight: '1.2',
    },
    billInfo: {
      margin: '10px 0',
      padding: '6px 0',
      borderTop: '1px dashed #333',
      borderBottom: '1px dashed #333',
    },
    billInfoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '2px',
      fontSize: '10px',
    },
    billNumber: {
      fontWeight: 'bold',
      color: '#17a2b8',
    },
    customerSection: {
      margin: '10px 0',
      padding: '8px',
      background: '#f9f9f9',
      borderRadius: '2px',
      border: '1px solid #e9ecef',
    },
    customerRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '4px',
      fontSize: '10px',
    },
    customerLabel: {
      fontWeight: 'bold',
      color: '#555',
    },
    customerValue: {
      color: '#333',
      maxWidth: '180px',
      textAlign: 'right',
    },
    customerTypeBadge: {
      padding: '2px 6px',
      borderRadius: '3px',
      fontSize: '9px',
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    internalBadge: {
      background: '#cce5ff',
      color: '#004085',
    },
    externalBadge: {
      background: '#fff3cd',
      color: '#856404',
    },
    customerInput: {
      width: '100%',
      padding: '4px 6px',
      marginBottom: '4px',
      border: '1px solid #ddd',
      borderRadius: '2px',
      fontFamily: "'Courier New', monospace",
      fontSize: '10px',
    },
    customerTypeSelect: {
      width: '100%',
      padding: '4px',
      marginBottom: '4px',
      border: '1px solid #ddd',
      borderRadius: '2px',
      fontFamily: "'Courier New', monospace",
      fontSize: '10px',
    },
    billItems: {
      margin: '10px 0',
    },
    billItemsHeader: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
      fontWeight: 'bold',
      padding: '4px 0',
      borderBottom: '1px solid #333',
      fontSize: '10px',
      background: '#f0f0f0',
      paddingLeft: '2px',
    },
    billItem: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
      padding: '3px 0',
      borderBottom: '1px dotted #ccc',
      fontSize: '9px',
      paddingLeft: '2px',
    },
    billItemEmpty: {
      textAlign: 'center',
      color: '#999',
      padding: '10px',
      fontStyle: 'italic',
      fontSize: '10px',
    },
    billItemName: {
      display: 'flex',
      flexDirection: 'column',
    },
    billItemSmall: {
      fontSize: '7px',
      color: '#666',
    },
    billItemGST: {
      fontSize: '6px',
      color: '#dc3545',
    },
    billSummary: {
      margin: '10px 0',
      padding: '8px 0',
      borderTop: '1px solid #333',
    },
    summaryRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '3px',
      fontSize: '10px',
    },
    summaryRowTotal: {
      fontWeight: 'bold',
      fontSize: '12px',
      borderTop: '1px dashed #333',
      paddingTop: '6px',
      marginTop: '6px',
      color: '#333',
    },
    discountSection: {
      margin: '8px 0',
      padding: '6px',
      background: '#f0f7ff',
      borderRadius: '3px',
      border: '1px solid #b8daff',
    },
    discountHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '5px',
      cursor: 'pointer',
    },
    discountTitle: {
      fontWeight: 'bold',
      color: '#004085',
      fontSize: '11px',
    },
    discountToggle: {
      color: '#007bff',
      fontSize: '12px',
    },
    discountControls: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '5px',
      marginTop: '5px',
    },
    discountInput: {
      padding: '4px',
      border: '1px solid #ddd',
      borderRadius: '3px',
      fontFamily: "'Courier New', monospace",
      fontSize: '10px',
      width: '100%',
    },
    discountTypeSelect: {
      padding: '4px',
      border: '1px solid #ddd',
      borderRadius: '3px',
      fontFamily: "'Courier New', monospace",
      fontSize: '10px',
      width: '100%',
    },
    discountAmount: {
      fontSize: '10px',
      color: '#28a745',
      fontWeight: 'bold',
      marginTop: '3px',
    },
    summaryInput: {
      width: '50px',
      padding: '2px',
      border: '1px solid #ddd',
      borderRadius: '2px',
      textAlign: 'right',
      fontFamily: "'Courier New', monospace",
      fontSize: '9px',
      marginLeft: '3px',
    },
    paymentSection: {
      margin: '10px 0',
      padding: '8px',
      background: '#f0f0f0',
      borderRadius: '2px',
      border: '1px solid #ddd',
      fontSize: '10px',
    },
    paymentRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '4px',
      alignItems: 'center',
    },
    paymentSelect: {
      padding: '4px',
      width: '100px',
      border: '1px solid #ddd',
      borderRadius: '2px',
      fontFamily: "'Courier New', monospace",
      fontSize: '9px',
    },
    paymentInput: {
      width: '80px',
      padding: '3px',
      border: '1px solid #ddd',
      borderRadius: '2px',
      textAlign: 'right',
      fontFamily: "'Courier New', monospace",
      fontSize: '9px',
    },
    paymentDetails: {
      marginTop: '8px',
      padding: '6px',
      background: 'white',
      borderRadius: '2px',
      border: '1px solid #ccc',
    },
    paymentDetailsInput: {
      width: '100%',
      padding: '4px',
      marginBottom: '4px',
      border: '1px solid #ddd',
      borderRadius: '2px',
      fontFamily: "'Courier New', monospace",
      fontSize: '9px',
    },
    billFooter: {
      textAlign: 'center',
      marginTop: '15px',
      paddingTop: '10px',
      borderTop: '1px dashed #333',
      fontSize: '8px',
    },
    billFooterP: {
      marginBottom: '2px',
      color: '#666',
    },
    actionButtons: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '8px',
      marginTop: '15px',
    },
    whatsappButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '10px',
      marginTop: '10px',
      background: '#25D366',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      fontWeight: 'bold',
      cursor: 'pointer',
      fontSize: '14px',
      width: '100%',
    },
    btn: {
      padding: '10px',
      border: 'none',
      borderRadius: '3px',
      fontWeight: 'bold',
      cursor: 'pointer',
      fontSize: '12px',
      fontFamily: "'Courier New', monospace",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '3px',
    },
    btnDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    btnPrimary: {
      background: '#17a2b8',
      color: 'white',
    },
    btnSuccess: {
      background: '#28a745',
      color: 'white',
    },
    btnDanger: {
      background: '#dc3545',
      color: 'white',
    },
    btnSecondary: {
      background: '#6c757d',
      color: 'white',
    },
    btnInfo: {
      background: '#17a2b8',
      color: 'white',
    },
    btnWarning: {
      background: '#ffc107',
      color: '#333',
    },
    downloadLink: {
      display: 'none',
    },
    serviceTag: {
      background: '#17a2b8',
      color: 'white',
      padding: '2px 6px',
      borderRadius: '3px',
      fontSize: '9px',
      marginLeft: '5px',
    },
    errorText: {
      fontSize: '10px',
      color: '#dc3545',
      marginTop: '2px',
    },
  };

  // Generate random bill number
  const generateBillNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let random = '';
    for (let i = 0; i < 8; i++) {
      random += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    
    setBillNumber(`HPS-SV-${year}${month}${day}-${random}`);
  };

  // Update date and time
  const updateDateTime = () => {
    const now = new Date();
    setCurrentDate(formatDate(now));
    setCurrentTime(formatTime(now));
  };

  // Initialize and restore draft service bill on mount
  useEffect(() => {
    generateBillNumber();
    updateDateTime();

    const savedDraft = localStorage.getItem('active_draft_service_bill');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.manualServices && Array.isArray(draft.manualServices) && draft.manualServices.length > 0) {
          setManualServices(draft.manualServices);
          if (draft.customerName !== undefined) setCustomerName(draft.customerName);
          if (draft.customerPhone !== undefined) setCustomerPhone(draft.customerPhone);
          if (draft.customerEmail !== undefined) setCustomerEmail(draft.customerEmail);
          if (draft.customerGST !== undefined) setCustomerGST(draft.customerGST);
          if (draft.customerAddress !== undefined) setCustomerAddress(draft.customerAddress);
          if (draft.discount !== undefined) setDiscount(draft.discount);
          if (draft.discountType !== undefined) setDiscountType(draft.discountType);
          if (draft.manualDiscount !== undefined) setManualDiscount(draft.manualDiscount);
          if (draft.paidAmount !== undefined) setPaidAmount(draft.paidAmount);
          if (draft.paymentMethod !== undefined) setPaymentMethod(draft.paymentMethod);
          if (draft.paymentStatus !== undefined) setPaymentStatus(draft.paymentStatus);
          if (draft.cashReceived !== undefined) setCashReceived(draft.cashReceived);
          if (draft.cardNumber !== undefined) setCardNumber(draft.cardNumber);
          if (draft.cardHolderName !== undefined) setCardHolderName(draft.cardHolderName);
          if (draft.upiId !== undefined) setUpiId(draft.upiId);
          if (draft.transactionId !== undefined) setTransactionId(draft.transactionId);
          if (draft.bankName !== undefined) setBankName(draft.bankName);
          if (draft.chequeNumber !== undefined) setChequeNumber(draft.chequeNumber);
          if (draft.billNumber) setBillNumber(draft.billNumber);
          
          setSuccess('Restored active draft service bill!');
          setTimeout(() => setSuccess(''), 2500);
        }
      } catch (err) {
        console.error('Failed to restore draft service bill:', err);
      }
    }

    setIsDraftInitialized(true);

    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Save active draft service bill to localStorage on state changes
  useEffect(() => {
    if (!isDraftInitialized) return;

    if (manualServices.length > 0 || customerPhone || (customerName && customerName !== 'Walk-in Customer')) {
      const draftData = {
        manualServices,
        customerName,
        customerPhone,
        customerEmail,
        customerGST,
        customerAddress,
        discount,
        discountType,
        manualDiscount,
        paidAmount,
        paymentMethod,
        paymentStatus,
        cashReceived,
        cardNumber,
        cardHolderName,
        upiId,
        transactionId,
        bankName,
        chequeNumber,
        billNumber
      };
      localStorage.setItem('active_draft_service_bill', JSON.stringify(draftData));
    } else {
      localStorage.removeItem('active_draft_service_bill');
    }
  }, [
    isDraftInitialized, manualServices, customerName, customerPhone, customerEmail,
    customerGST, customerAddress, discount, discountType, manualDiscount,
    paidAmount, paymentMethod, paymentStatus, cashReceived, cardNumber,
    cardHolderName, upiId, transactionId, bankName, chequeNumber, billNumber
  ]);

  // Update payment status when paid amount changes
  useEffect(() => {
    const total = calculateTotal();
    if (paidAmount === 0) {
      setPaymentStatus('pending');
    } else if (paidAmount < total) {
      setPaymentStatus('partial');
    } else if (paidAmount >= total) {
      setPaymentStatus('paid');
    }
  }, [paidAmount, manualServices, discount]);

  // Add thermal print styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }
        
        #billPaper, #billPaper * {
          visibility: visible !important;
          background: white !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }
        
        #billPaper {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 280px !important;
          margin: 0 !important;
          padding: 12px !important;
          border: none !important;
          box-shadow: none !important;
          background: white !important;
        }
        
        #billPaper div,
        #billPaper span,
        #billPaper p,
        #billPaper h1,
        #billPaper h2,
        #billPaper h3,
        #billPaper table,
        #billPaper tr,
        #billPaper td,
        #billPaper th {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
          background: white !important;
        }
        
        #billPaper .bill-header {
          border-bottom: 1px dashed #000 !important;
        }
        
        #billPaper .bill-info {
          border-top: 1px dashed #000 !important;
          border-bottom: 1px dashed #000 !important;
        }
        
        #billPaper .bill-items-header {
          border-bottom: 1px solid #000 !important;
        }
        
        #billPaper .bill-item {
          border-bottom: 1px dotted #000 !important;
        }
        
        #billPaper .bill-summary {
          border-top: 1px solid #000 !important;
        }
        
        #billPaper .bill-footer {
          border-top: 1px dashed #000 !important;
        }
        
        #billPaper * {
          background: white !important;
          color: black !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        #billPaper input,
        #billPaper select,
        #billPaper button,
        #billPaper .no-print {
          display: none !important;
        }
        
        #billPaper .payment-section {
          display: none !important;
        }
        
        #billPaper .customer-section input,
        #billPaper .customer-section select,
        #billPaper .customer-section button {
          display: none !important;
        }
        
        #billPaper .customer-section {
          border: none !important;
          padding: 0 !important;
          margin: 10px 0 !important;
        }
        
        #billPaper .discount-section {
          display: none !important;
        }
        
        @page {
          size: 80mm auto !important;
          margin: 0 !important;
        }
        
        .no-print {
          display: none !important;
        }
      }
      
      @media screen {
        #billPaper input,
        #billPaper select,
        #billPaper button {
          display: block;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Clear payment method specific fields when method changes
  useEffect(() => {
    setShowPaymentDetails(true);
    switch(paymentMethod) {
      case 'cash':
        setCardNumber('');
        setCardHolderName('');
        setUpiId('');
        setTransactionId('');
        setBankName('');
        setChequeNumber('');
        break;
      case 'card':
        setCashReceived(0);
        setUpiId('');
        setTransactionId('');
        setBankName('');
        setChequeNumber('');
        break;
      case 'upi':
        setCashReceived(0);
        setCardNumber('');
        setCardHolderName('');
        setBankName('');
        setChequeNumber('');
        break;
      case 'cheque':
        setCashReceived(0);
        setCardNumber('');
        setCardHolderName('');
        setUpiId('');
        setTransactionId('');
        break;
      default:
        break;
    }
  }, [paymentMethod]);

  // Focus on service name input when component mounts
  useEffect(() => {
    if (serviceNameInputRef.current) {
      serviceNameInputRef.current.focus();
    }
  }, []);

  // Validate form before saving
  const validateForm = () => {
    const errors = {};
    
    if (!customerName || customerName.trim() === '') {
      errors.customerName = 'Customer name is required';
    }
    
    const activeServices = manualServices.filter(s => s.quantity > 0);
    if (activeServices.length === 0) {
      errors.services = 'At least one service with quantity > 0 is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Add manual service to bill
  const addManualService = () => {
    // Validate
    if (!newServiceName.trim()) {
      setError('Please enter service name');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const price = parseFloat(newServicePrice);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid price');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const gstRate = parseFloat(newServiceGST) || 0;
    
    // Generate a temporary ID
    const tempId = Date.now() + Math.floor(Math.random() * 1000);
    
    // Calculate GST and total
    const gstAmount = (price * gstRate / 100);
    const total = price + gstAmount;
    
    // Add to manual services
    setManualServices([
      ...manualServices,
      {
        id: tempId,
        name: newServiceName.trim(),
        description: newServiceDescription.trim(),
        category: newServiceCategory,
        price: price,
        gstRate: gstRate,
        gstAmount: gstAmount,
        quantity: 1,
        total: total,
        isManual: true
      }
    ]);
    
    // Clear form
    setNewServiceName('');
    setNewServiceDescription('');
    setNewServicePrice('');
    setNewServiceGST('18');
    setNewServiceCategory('General');
    
    // Focus back on service name
    setTimeout(() => {
      if (serviceNameInputRef.current) {
        serviceNameInputRef.current.focus();
      }
    }, 100);
    
    setSuccess('Service added to bill');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Update quantity
  const updateQuantity = (serviceId, newQuantity) => {
    const service = manualServices.find(s => s.id === serviceId);
    
    if (service) {
      newQuantity = parseInt(newQuantity) || 0;
      
      if (newQuantity >= 0) {
        const gstAmount = (service.price * service.gstRate / 100) * newQuantity;
        const total = (service.price * newQuantity) + gstAmount;
        
        const updatedServices = manualServices.map(s =>
          s.id === serviceId
            ? { 
                ...s, 
                quantity: newQuantity,
                gstAmount: gstAmount,
                total: total
              }
            : s
        );
        setManualServices(updatedServices);
        
        if (newQuantity === 0) {
          setSuccess(`${service.name} quantity set to 0`);
        } else {
          setSuccess(`Updated ${service.name} quantity`);
        }
        setTimeout(() => setSuccess(''), 2000);
      }
    }
  };

  // Remove service
  const removeService = (serviceId) => {
    const service = manualServices.find(s => s.id === serviceId);
    setManualServices(manualServices.filter(s => s.id !== serviceId));
    setSuccess(`${service.name} removed from bill`);
    setTimeout(() => setSuccess(''), 2000);
  };

  // Calculate subtotal (services only, before GST)
  const calculateSubtotal = () => {
    return manualServices
      .filter(s => s.quantity > 0)
      .reduce((sum, s) => sum + (s.price * s.quantity), 0);
  };

  // Calculate total GST amount
  const calculateTotalGST = () => {
    return manualServices
      .filter(s => s.quantity > 0)
      .reduce((sum, s) => sum + s.gstAmount, 0);
  };

  // Calculate discount amount
  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) return 0;
    
    if (discountType === 'percentage') {
      return (subtotal * discount) / 100;
    }
    return Math.min(discount, subtotal);
  };

  // Calculate total (subtotal + GST - discount)
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const totalGST = calculateTotalGST();
    const discountAmount = calculateDiscountAmount();
    return Math.max(0, subtotal + totalGST - discountAmount);
  };

  // Calculate change
  const calculateChange = () => {
    const total = calculateTotal();
    return Math.max(0, paidAmount - total);
  };

  // Calculate due amount
  const calculateDue = () => {
    const total = calculateTotal();
    return Math.max(0, total - paidAmount);
  };

  // Handle discount change
  const handleDiscountChange = (value) => {
    setManualDiscount(true);
    const numValue = parseFloat(value) || 0;
    const subtotal = calculateSubtotal();
    
    if (discountType === 'percentage') {
      if (numValue > 100) {
        setError('Percentage discount cannot exceed 100%');
        setDiscount(100);
      } else if (numValue < 0) {
        setDiscount(0);
      } else {
        setDiscount(numValue);
      }
    } else {
      if (numValue > subtotal) {
        setError('Fixed discount cannot exceed subtotal');
        setDiscount(subtotal);
      } else if (numValue < 0) {
        setDiscount(0);
      } else {
        setDiscount(numValue);
      }
    }
    
    setTimeout(() => setError(''), 3000);
  };

  // Handle discount type change
  const handleDiscountTypeChange = (type) => {
    setManualDiscount(true);
    const subtotal = calculateSubtotal();
    setDiscountType(type);
    
    if (type === 'percentage') {
      if (discountType === 'fixed' && subtotal > 0) {
        const percentage = (discount / subtotal) * 100;
        setDiscount(Math.min(100, Math.round(percentage * 100) / 100));
      } else if (discount > 100) {
        setDiscount(100);
      }
    } else {
      if (discountType === 'percentage' && subtotal > 0) {
        const fixed = (subtotal * discount) / 100;
        setDiscount(Math.min(subtotal, Math.round(fixed * 100) / 100));
      } else if (discount > subtotal) {
        setDiscount(subtotal);
      }
    }
  };

  // Handle cash payment
  const handleCashPayment = (received) => {
    const amount = parseFloat(received) || 0;
    setCashReceived(amount);
    setPaidAmount(amount);
  };

  // Handle exact payment
  const handleExactPayment = () => {
    const total = calculateTotal();
    setPaidAmount(total);
    if (paymentMethod === 'cash') {
      setCashReceived(total);
    }
  };

  // Save service bill to database
  const saveBillToDatabase = async () => {
    // Validate form
    if (!validateForm()) {
      setError('Please fix validation errors');
      return null;
    }

    const activeServices = manualServices.filter(s => s.quantity > 0);
    
    if (activeServices.length === 0) {
      setError('No services with quantity > 0 to save!');
      return null;
    }

    setLoading(true);
    setError('');
    setValidationErrors({});

    try {
      // Prepare bill data with correct field names for backend
      const billData = {
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || '',
        customerEmail: customerEmail.trim() || '',
        customerGST: customerGST.trim() || '',
        customerAddress: customerAddress.trim() || '',
        customerType: customerType === 'internal' ? 'internal' : 'regular',
        discount: parseFloat(discount) || 0,
        discountType: discountType === 'percentage' ? 'percentage' : 'amount',
        paidAmount: parseFloat(paidAmount) || 0,
        paymentMethod: paymentMethod,
        items: activeServices.map(s => ({
          serviceName: s.name,
          serviceDescription: s.description || '',
          quantity: s.quantity,
          price: s.price,
          gst_rate: s.gstRate, // Using gst_rate as expected by backend
          category: s.category || 'General'
        }))
      };

      console.log('📤 Saving service bill:', JSON.stringify(billData, null, 2));

      // Use the service-bills endpoint
      const response = await api.post('/service-bills', billData);
      
      if (response.data.success) {
        setSuccess('✅ Service bill saved successfully!');
        setSavedBillId(response.data.billId);
        setBillNumber(response.data.billNumber);
        setLastGeneratedBill({
          billNumber: response.data.billNumber,
          customerPhone: customerPhone,
          customerName: customerName
        });
        setShowWhatsApp(true);
        setBillSaved(true);
        
        console.log('✅ Bill saved with ID:', response.data.billId);
        
        return {
          billId: response.data.billId,
          billNumber: response.data.billNumber
        };
      } else {
        throw new Error(response.data.error || 'Failed to save bill');
      }
    } catch (err) {
      console.error('❌ Save service bill error:', err);
      
      // Handle specific error cases
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to save bill. Please try again.');
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Generate HTML content for service bill
  const generateBillHTML = () => {
    const subtotal = calculateSubtotal();
    const totalGST = calculateTotalGST();
    const discountAmount = calculateDiscountAmount();
    const total = calculateTotal();
    const due = calculateDue();
    const change = calculateChange();
    const activeServices = manualServices.filter(s => s.quantity > 0);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Service Bill - ${billNumber}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              margin: 0;
              padding: 20px;
              width: 80mm;
              font-family: 'Courier New', monospace;
              font-size: 11px;
              line-height: 1.3;
              background: white;
            }
            
            #billPaper {
              width: 280px;
              margin: 0 auto;
              padding: 12px;
              background: white;
            }
            
            .bill-header {
              text-align: center;
              margin-bottom: 20px;
            }
            .bill-logo {
              max-width: 120px;
              max-height: 60px;
              margin-bottom: 5px;
              object-fit: contain;
            }
            .bill-header h1 {
              font-size: 16px;
              letter-spacing: 1px;
              margin-bottom: 3px;
              color: #333;
              font-weight: bold;
            }
            
            .bill-header p {
              font-size: 9px;
              color: #666;
              margin: 1px 0;
              line-height: 1.2;
            }
            
            .bill-info {
              margin: 10px 0;
              padding: 6px 0;
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
            }
            
            .bill-info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
              font-size: 10px;
            }
            
            .bill-number {
              font-weight: bold;
              color: #17a2b8;
            }
            
            .bill-type {
              background: #17a2b8;
              color: white;
              padding: 2px 5px;
              border-radius: 3px;
              font-size: 8px;
              font-weight: bold;
            }
            
            .customer-section {
              margin: 10px 0;
              padding: 8px;
              background: #f9f9f9;
              border-radius: 2px;
              border: 1px solid #e9ecef;
            }
            
            .customer-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 10px;
            }
            
            .customer-label {
              font-weight: bold;
              color: #555;
            }
            
            .customer-value {
              color: #333;
              max-width: 180px;
              text-align: right;
            }
            
            .bill-items {
              margin: 10px 0;
            }
            
            .bill-items-header {
              display: grid;
              grid-template-columns: 2fr 1fr 1fr 1.5fr;
              font-weight: bold;
              padding: 4px 0;
              border-bottom: 1px solid #000;
              font-size: 10px;
              background: #f0f0f0;
              padding-left: 2px;
            }
            
            .bill-item {
              display: grid;
              grid-template-columns: 2fr 1fr 1fr 1.5fr;
              padding: 3px 0;
              border-bottom: 1px dotted #ccc;
              font-size: 9px;
              padding-left: 2px;
            }
            
            .bill-item-name {
              display: flex;
              flex-direction: column;
            }
            
            .bill-item-small {
              font-size: 7px;
              color: #666;
            }
            
            .bill-item-gst {
              font-size: 6px;
              color: #dc3545;
            }
            
            .bill-summary {
              margin: 10px 0;
              padding: 8px 0;
              border-top: 1px solid #000;
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
              font-size: 10px;
            }
            
            .summary-row-total {
              font-weight: bold;
              font-size: 12px;
              border-top: 1px dashed #000;
              padding-top: 6px;
              margin-top: 6px;
              color: #333;
            }
            
            .payment-section {
              margin: 10px 0;
              padding: 8px;
              background: #f0f0f0;
              border-radius: 2px;
              border: 1px solid #ddd;
              font-size: 10px;
            }
            
            .payment-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              align-items: center;
            }
            
            .bill-footer {
              text-align: center;
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px dashed #000;
              font-size: 8px;
            }
            
            .bill-footer p {
              margin-bottom: 2px;
              color: #666;
            }
            
            .service-tag {
              background: #17a2b8;
              color: white;
              padding: 1px 3px;
              border-radius: 2px;
              font-size: 6px;
              margin-left: 2px;
            }
            
            .gst-highlight {
              color: #dc3545;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div id="billPaper">
            <div class="bill-header">
              <img src="/avva-logo.jpeg" class="bill-logo" alt="Avva Inventory Logo">
              <h1>${shopDetails.name}</h1>
              <p>${shopDetails.address}</p>
              <p>${shopDetails.city}</p>
              <p>Ph: ${shopDetails.phone}</p>
              <p>GST: ${shopDetails.gst}</p>
              <p><span class="bill-type">SERVICE BILL</span></p>
            </div>
            
            <div class="bill-info">
              <div class="bill-info-row">
                <span>Bill No:</span>
                <span class="bill-number">${billNumber}</span>
              </div>
              <div class="bill-info-row">
                <span>Date:</span>
                <span>${currentDate}</span>
              </div>
              <div class="bill-info-row">
                <span>Time:</span>
                <span>${currentTime}</span>
              </div>
            </div>
            
            <div class="customer-section">
              <div class="customer-row">
                <span class="customer-label">Customer:</span>
                <span class="customer-value">${customerName}</span>
              </div>
              
              ${customerPhone ? `
              <div class="customer-row">
                <span class="customer-label">Phone:</span>
                <span class="customer-value">${customerPhone}</span>
              </div>
              ` : ''}
              
              ${customerEmail ? `
              <div class="customer-row">
                <span class="customer-label">Email:</span>
                <span class="customer-value">${customerEmail}</span>
              </div>
              ` : ''}
              
              ${customerGST ? `
              <div class="customer-row">
                <span class="customer-label">GST:</span>
                <span class="customer-value">${customerGST}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="bill-items">
              <div class="bill-items-header">
                <span>Service</span>
                <span>Price</span>
                <span>Qty</span>
                <span>Total</span>
              </div>
              <div>
                ${activeServices.length === 0 ? `
                  <div class="bill-item-empty">
                    <span>--- No services in bill ---</span>
                  </div>
                ` : activeServices.map(service => `
                  <div class="bill-item">
                    <span class="bill-item-name">
                      ${service.name.length > 12 ? service.name.substring(0, 10) + '...' : service.name}
                      ${service.description ? `<small class="bill-item-small">${service.description.substring(0, 15)}${service.description.length > 15 ? '...' : ''}</small>` : ''}
                      ${service.gstRate > 0 ? `<small class="bill-item-gst">GST: ${service.gstRate}%</small>` : ''}
                    </span>
                    <span>₹${service.price.toFixed(2)}</span>
                    <span>${service.quantity}</span>
                    <span>₹${service.total.toFixed(2)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="bill-summary">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>₹${subtotal.toFixed(2)}</span>
              </div>
              
              <div class="summary-row">
                <span>GST Total:</span>
                <span class="gst-highlight">+₹${totalGST.toFixed(2)}</span>
              </div>
              
              ${discount > 0 ? `
              <div class="summary-row">
                <span>Discount (${discount}${discountType === 'percentage' ? '%' : '₹'}):</span>
                <span>-₹${discountAmount.toFixed(2)}</span>
              </div>
              ` : ''}
              
              <div class="summary-row summary-row-total">
                <span>Total:</span>
                <span>₹${total.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="payment-section">
              <div class="payment-row">
                <span>Payment Method:</span>
                <span>${paymentMethod.toUpperCase()}</span>
              </div>
              
              <div class="payment-row">
                <span>Paid Amount:</span>
                <span>₹${paidAmount.toFixed(2)}</span>
              </div>
              
              <div class="payment-row">
                <span>Payment Status:</span>
                <span style="color: ${paymentStatus === 'paid' ? '#28a745' : paymentStatus === 'partial' ? '#ffc107' : '#dc3545'}; font-weight: bold;">
                  ${paymentStatus.toUpperCase()}
                </span>
              </div>
              
              ${due > 0 ? `
              <div class="payment-row">
                <span>Due Amount:</span>
                <span>₹${due.toFixed(2)}</span>
              </div>
              ` : ''}
              
              ${paymentMethod === 'cash' && paidAmount >= total ? `
              <div class="payment-row">
                <span>Change:</span>
                <span>₹${change.toFixed(2)}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="bill-footer">
              <p>Thank you for using our services!</p>
              <p>For service queries, call ${shopDetails.phone}</p>
              <p>** Computer generated service bill **</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  // Download bill as HTML file
  const downloadBill = () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) {
      setError('No services with quantity > 0 to download!');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const billHTML = generateBillHTML();
    const blob = new Blob([billHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ServiceBill_${billNumber.replace(/[\/\\]/g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccess('Service bill downloaded successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Handle payment completion
  const handlePaymentComplete = async () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) {
      setError('No services with quantity > 0 in bill!');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const savedData = await saveBillToDatabase();
    
    if (savedData) {
      downloadBill();
    }
  };

  // Handle print
  const handlePrint = async () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) {
      setError('No services with quantity > 0 to print!');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const savedData = await saveBillToDatabase();
    
    if (savedData) {
      const billContent = billPaperRef.current.outerHTML;
      
      const printWindow = window.open('', '_blank');
      
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Service Bill - ${billNumber}</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { margin: 0; padding: 0; width: 80mm; font-family: 'Courier New', monospace; }
                #billPaper { width: 280px; margin: 0 auto; padding: 12px; }
                .bill-header { text-align: center; border-bottom: 1px dashed #000; }
                .bill-info { border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
                .bill-items-header { border-bottom: 1px solid #000; }
                .bill-item { border-bottom: 1px dotted #000; }
                .bill-summary { border-top: 1px solid #000; }
                .bill-footer { border-top: 1px dashed #000; }
                input, select, button { display: none !important; }
                .payment-section { display: none !important; }
                @page { size: 80mm auto; margin: 0; }
              </style>
            </head>
            <body>
              ${billContent}
              <script>
                window.onload = function() {
                  // Small delay to ensure styles are applied
                  setTimeout(function() {
                    window.print();
                    // Close after print dialog is handled
                    setTimeout(function() {
                      window.close();
                    }, 500);
                  }, 300);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        setError('Pop-up blocked! Please allow pop-ups for this site to print.');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  // Handle WhatsApp share
  const handleWhatsAppShare = () => {
    if (!customerPhone) {
      setError('Please enter customer phone number to share via WhatsApp');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const cleanPhone = customerPhone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const whatsappNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const subtotal = calculateSubtotal();
    const totalGST = calculateTotalGST();
    const discountAmount = calculateDiscountAmount();
    const total = calculateTotal();
    const due = calculateDue();
    const activeServices = manualServices.filter(s => s.quantity > 0);

    let message = `*Avva Inventory - SERVICE BILL*\n`;
    message += `${shopDetails.address}\n`;
    message += `${shopDetails.city}\n`;
    message += `Ph: ${shopDetails.phone}\n`;
    message += `Bill No: ${billNumber}\n`;
    message += `Date: ${currentDate} ${currentTime}\n`;
    message += `Customer: ${customerName}\n`;
    message += `================\n`;
    message += `SERVICES:\n`;
    
    activeServices.forEach(s => {
      message += `${s.name.substring(0, 15)}... ${s.quantity}x ₹${s.price.toFixed(2)}`;
      if (s.gstRate > 0) message += ` (GST: ${s.gstRate}%)`;
      message += ` = ₹${s.total.toFixed(2)}\n`;
    });
    
    message += `================\n`;
    message += `Subtotal: ₹${subtotal.toFixed(2)}\n`;
    message += `GST: +₹${totalGST.toFixed(2)}\n`;
    if (discountAmount > 0) message += `Discount: -₹${discountAmount.toFixed(2)}\n`;
    message += `*TOTAL: ₹${total.toFixed(2)}*\n`;
    message += `================\n`;
    message += `Payment: ${paymentMethod.toUpperCase()}\n`;
    message += `Paid: ₹${paidAmount.toFixed(2)}\n`;
    message += `Status: ${paymentStatus.toUpperCase()}\n`;
    if (due > 0) message += `Due: ₹${due.toFixed(2)}\n`;
    message += `================\n`;
    message += `Thank you for choosing Avva Inventory!\n`;
    message += `For service support, call ${shopDetails.phone}`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
    
    setSuccess('WhatsApp opened with service bill details!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Clear/delete draft bill
  const clearBill = (confirmUser = true) => {
    if (!confirmUser || window.confirm('Are you sure you want to delete this draft bill? All added services will be removed.')) {
      localStorage.removeItem('active_draft_service_bill');
      setManualServices([]);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerGST('');
      setCustomerAddress('');
      setDiscount(0);
      setDiscountType('percentage');
      setManualDiscount(false);
      setPaidAmount(0);
      setCashReceived(0);
      setPaymentMethod('cash');
      setPaymentStatus('pending');
      setCardNumber('');
      setCardHolderName('');
      setUpiId('');
      setTransactionId('');
      setBankName('');
      setChequeNumber('');
      setError('');
      if (confirmUser) {
        setSuccess('Draft service bill deleted');
        setTimeout(() => setSuccess(''), 2000);
      }
      setBillSaved(false);
      setShowWhatsApp(false);
      setLastGeneratedBill(null);
      setSavedBillId(null);
      setValidationErrors({});
      generateBillNumber();
    }
  };

  // Fetch customer by phone
  const fetchCustomerByPhone = async (phone) => {
    if (phone.length < 10) return;
    
    setFetchingCustomer(true);
    try {
      const response = await api.get(`/billing/customer/${phone}`);
      if (response.data && response.data.exists) {
        const customer = response.data.customer;
        setCustomerName(customer.name || 'Walk-in Customer');
        setCustomerEmail(customer.email || '');
        setCustomerAddress(customer.address || '');
        setCustomerGST(customer.gst || '');
        setCustomerType(customer.type || 'regular');
        setSuccess('Customer found! Details auto-filled.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error fetching customer:', err);
    } finally {
      setFetchingCustomer(false);
    }
  };

  // Auto-fetch customer when phone reaches 10 digits
  useEffect(() => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      fetchCustomerByPhone(cleanPhone);
    }
  }, [customerPhone]);

  // Handle phone number input change
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 10) {
      setCustomerPhone(value);
    }
  };

  // Handle new bill
  const handleNewBill = () => {
    clearBill();
  };

  // Handle Enter key in form
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addManualService();
    }
  };

  // Filter active services
  const activeServices = manualServices.filter(s => s.quantity > 0);
  const subtotal = calculateSubtotal();
  const totalGST = calculateTotalGST();
  const discountAmount = calculateDiscountAmount();
  const total = calculateTotal();
  const due = calculateDue();
  const change = calculateChange();

  // Dynamic styles
  const dynamicStyles = {
    changeAmount: {
      fontWeight: 'bold',
      color: paidAmount >= total ? '#28a745' : '#dc3545',
      fontSize: '10px',
    },
    zeroQuantity: {
      opacity: 0.5,
      background: '#fff3cd',
    }
  };

  return (
    <div style={baseStyles.container}>
      {/* Left Panel - Manual Service Entry */}
      <div style={baseStyles.productPanel} className="no-print">
        <h2 style={baseStyles.productPanelTitle}>🔧 Create Service Bill - Avva Inventory</h2>
        
        {error && (
          <div style={{...baseStyles.alert, ...baseStyles.alertError}}>
            ⚠️ {error}
          </div>
        )}
        
        {success && (
          <div style={{...baseStyles.alert, ...baseStyles.alertSuccess}}>
            ✅ {success}
          </div>
        )}
        
        <div style={baseStyles.manualEntrySection}>
          <h3 style={baseStyles.manualEntryTitle}>➕ Add Service Manually</h3>
          
          <div style={baseStyles.formGrid}>
            <div style={baseStyles.formGroup}>
              <label style={baseStyles.formLabel}>Service Name *</label>
              <input
                ref={serviceNameInputRef}
                type="text"
                style={{
                  ...baseStyles.formInput,
                  ...(validationErrors.services ? baseStyles.formInputError : {})
                }}
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., Printer Repair, Scanner Service"
                autoComplete="off"
              />
            </div>
            
            <div style={baseStyles.formGroup}>
              <label style={baseStyles.formLabel}>Category</label>
              <select
                style={baseStyles.formSelect}
                value={newServiceCategory}
                onChange={(e) => setNewServiceCategory(e.target.value)}
              >
                {serviceCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={baseStyles.formGroup}>
            <label style={baseStyles.formLabel}>Description (Optional)</label>
            <textarea
              style={baseStyles.formTextarea}
              value={newServiceDescription}
              onChange={(e) => setNewServiceDescription(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Brief description of the service"
              rows="2"
            />
          </div>
          
          <div style={baseStyles.formGrid}>
            <div style={baseStyles.formGroup}>
              <label style={baseStyles.formLabel}>Price (₹) *</label>
              <input
                type="number"
                style={baseStyles.formInput}
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            
            <div style={baseStyles.formGroup}>
              <label style={baseStyles.formLabel}>GST Rate (%)</label>
              <select
                style={baseStyles.formSelect}
                value={newServiceGST}
                onChange={(e) => setNewServiceGST(e.target.value)}
              >
                <option value="0">0% (No GST)</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
          </div>
          
          <button
            style={baseStyles.addButton}
            onClick={addManualService}
            onMouseEnter={(e) => e.currentTarget.style.background = '#218838'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#28a745'}
          >
            ➕ Add Service to Bill
          </button>
          
          <p style={{fontSize: '11px', color: '#666', marginTop: '10px', textAlign: 'center'}}>
            Press Enter to quickly add service
          </p>
        </div>
        
        <div style={baseStyles.selectedProducts}>
          <h3 style={baseStyles.selectedProductsTitle}>
            🛠️ Services in Bill ({activeServices.length} active / {manualServices.length} total)
          </h3>
          <div style={baseStyles.selectedItemsList}>
            {manualServices.length === 0 ? (
              <p style={baseStyles.noItems}>No services added yet. Fill the form above to add services.</p>
            ) : (
              manualServices.map(service => (
                <div 
                  key={service.id} 
                  style={{
                    ...baseStyles.selectedItem,
                    ...(service.quantity === 0 ? dynamicStyles.zeroQuantity : {})
                  }}
                >
                  <div style={baseStyles.itemInfo}>
                    <span style={baseStyles.itemName}>
                      {service.name}
                      <span style={baseStyles.itemCategory}> [{service.category}]</span>
                    </span>
                    {service.description && (
                      <span style={baseStyles.itemDescription}>
                        {service.description.substring(0, 20)}
                        {service.description.length > 20 ? '...' : ''}
                      </span>
                    )}
                    {service.gstRate > 0 && (
                      <span style={baseStyles.itemGSTRate}>GST: {service.gstRate}%</span>
                    )}
                    {service.quantity === 0 && (
                      <span style={{fontSize: '9px', color: '#856404'}}>(Zero quantity)</span>
                    )}
                  </div>
                  <div style={baseStyles.itemPrice}>₹{service.price.toFixed(2)}</div>
                  <input
                    type="number"
                    style={baseStyles.itemQuantity}
                    value={service.quantity}
                    min="0"
                    onChange={(e) => updateQuantity(service.id, e.target.value)}
                  />
                  <div style={baseStyles.itemTotal}>₹{service.total.toFixed(2)}</div>
                  <button
                    style={baseStyles.removeBtn}
                    onClick={() => removeService(service.id)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#c82333'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#dc3545'}
                    title="Remove completely"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
          {manualServices.length > 0 && (
            <p style={{fontSize: '11px', color: '#666', marginTop: '10px', textAlign: 'center'}}>
              💡 Set quantity to 0 to keep service in list (will not be billed)
            </p>
          )}
        </div>
        
        {/* Validation Errors */}
        {validationErrors.customerName && (
          <p style={baseStyles.errorText}>⚠️ {validationErrors.customerName}</p>
        )}
        {validationErrors.services && (
          <p style={baseStyles.errorText}>⚠️ {validationErrors.services}</p>
        )}
      </div>
      
      {/* Right Panel - Thermal Bill */}
      <div style={baseStyles.billPanel} className="no-print">
        <div style={baseStyles.billContainer}>
          <div 
            style={baseStyles.billPaper} 
            id="billPaper" 
            ref={billPaperRef}
          >
            <div className="bill-header">
              <img src="/avva-logo.jpeg" alt="Avva Inventory Logo" style={{ maxWidth: '100px', marginBottom: '5px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
              <h1 style={baseStyles.billHeaderH1}>{shopDetails.name}</h1>
              <p style={baseStyles.billHeaderP}>{shopDetails.address}</p>
              <p style={baseStyles.billHeaderP}>{shopDetails.city}</p>
              <p style={baseStyles.billHeaderP}>Ph: {shopDetails.phone}</p>
              <p style={baseStyles.billHeaderP}>GST: {shopDetails.gst}</p>
              <p style={{...baseStyles.billHeaderP, fontWeight: 'bold', color: '#17a2b8'}}>
                🔧 SERVICE BILL
              </p>
            </div>
            
            <div className="bill-info">
              <div style={baseStyles.billInfoRow}>
                <span>Bill No:</span>
                <span style={baseStyles.billNumber}>{billNumber}</span>
              </div>
              <div style={baseStyles.billInfoRow}>
                <span>Date:</span>
                <span>{currentDate}</span>
              </div>
              <div style={baseStyles.billInfoRow}>
                <span>Time:</span>
                <span>{currentTime}</span>
              </div>
            </div>
            
            <div className="customer-section">
              <div style={baseStyles.customerRow}>
                <span style={baseStyles.customerLabel}>Customer:</span>
                <span style={baseStyles.customerValue}>{customerName || 'Walk-in Customer'}</span>
              </div>
              
              {customerPhone && (
                <div style={baseStyles.customerRow}>
                  <span style={{...baseStyles.customerLabel, color: '#17a2b8'}}>Phone Number:</span>
                  <span style={baseStyles.customerValue}>{customerPhone}</span>
                </div>
              )}
              
              {customerEmail && (
                <div style={baseStyles.customerRow}>
                  <span style={baseStyles.customerLabel}>Email:</span>
                  <span style={baseStyles.customerValue}>{customerEmail}</span>
                </div>
              )}
              
              {customerGST && (
                <div style={baseStyles.customerRow}>
                  <span style={baseStyles.customerLabel}>GST:</span>
                  <span style={baseStyles.customerValue}>{customerGST}</span>
                </div>
              )}
            </div>
            
            <div style={baseStyles.customerSection} className="no-print">
              <input
                type="text"
                style={{
                  ...baseStyles.customerInput,
                  ...(validationErrors.customerName ? baseStyles.formInputError : {})
                }}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer Name *"
              />
              
              <input
                type="text"
                style={{
                  ...baseStyles.customerInput,
                  borderColor: fetchingCustomer ? '#17a2b8' : '#ddd',
                  background: fetchingCustomer ? '#f0faff' : 'white'
                }}
                value={customerPhone}
                onChange={handlePhoneChange}
                placeholder={fetchingCustomer ? "Searching..." : "Phone Number"}
                maxLength="10"
              />
              
              <input
                type="email"
                style={baseStyles.customerInput}
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Email Address"
              />
              
              <input
                type="text"
                style={baseStyles.customerInput}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Address"
              />
              
              <input
                type="text"
                style={baseStyles.customerInput}
                value={customerGST}
                onChange={(e) => setCustomerGST(e.target.value)}
                placeholder="GST Number (if applicable)"
              />
            </div>
            
            {/* Discount Section */}
            <div style={baseStyles.discountSection} className="no-print">
              <div 
                style={baseStyles.discountHeader}
                onClick={() => setShowDiscountInput(!showDiscountInput)}
              >
                <span style={baseStyles.discountTitle}>
                  {manualDiscount ? '✏️ Manual Discount' : '💰 Apply Discount'}
                </span>
                <span style={baseStyles.discountToggle}>
                  {showDiscountInput ? '▼' : '▶'}
                </span>
              </div>
              
              {showDiscountInput && (
                <div style={baseStyles.discountControls}>
                  <select
                    style={baseStyles.discountTypeSelect}
                    value={discountType}
                    onChange={(e) => handleDiscountTypeChange(e.target.value)}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                  
                  <input
                    type="number"
                    style={baseStyles.discountInput}
                    value={discount}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    min="0"
                    max={discountType === 'percentage' ? 100 : subtotal}
                    step={discountType === 'percentage' ? '1' : '0.01'}
                    placeholder={discountType === 'percentage' ? 'Enter %' : 'Enter amount'}
                  />
                </div>
              )}
              
              <div style={baseStyles.discountAmount}>
                Discount Amount: -₹{discountAmount.toFixed(2)}
              </div>
            </div>
            
            <div className="bill-items">
              <div className="bill-items-header">
                <span>Service</span>
                <span>Price</span>
                <span>Qty</span>
                <span>Total</span>
              </div>
              <div>
                {activeServices.length === 0 ? (
                  <div style={baseStyles.billItemEmpty}>
                    <span>--- No services in bill ---</span>
                  </div>
                ) : (
                  activeServices.map(service => (
                    <div key={service.id} className="bill-item">
                      <span style={baseStyles.billItemName}>
                        {service.name.length > 12 
                          ? service.name.substring(0, 10) + '...' 
                          : service.name
                        }
                        {service.gstRate > 0 && (
                          <small style={baseStyles.billItemGST}>GST: {service.gstRate}%</small>
                        )}
                      </span>
                      <span>₹{service.price.toFixed(2)}</span>
                      <span>{service.quantity}</span>
                      <span>₹{service.total.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="bill-summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              
              <div className="summary-row">
                <span>GST Total:</span>
                <span style={{color: '#dc3545'}}>+₹{totalGST.toFixed(2)}</span>
              </div>
              
              {discount > 0 && (
                <div className="summary-row">
                  <span>Discount ({discount}{discountType === 'percentage' ? '%' : '₹'}):</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="summary-row summary-row-total">
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="payment-section">
              <div style={baseStyles.paymentRow}>
                <span>Payment Method:</span>
                <select
                  style={baseStyles.paymentSelect}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="upi">📱 UPI</option>
                  <option value="cheque">📝 Cheque</option>
                </select>
              </div>
              
              {showPaymentDetails && (
                <div style={baseStyles.paymentDetails}>
                  {paymentMethod === 'cash' && (
                    <>
                      <div style={baseStyles.paymentRow}>
                        <span>Cash Received:</span>
                        <input
                          type="number"
                          style={baseStyles.paymentInput}
                          value={cashReceived}
                          onChange={(e) => handleCashPayment(e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div style={baseStyles.paymentRow}>
                        <span>Change:</span>
                        <span style={dynamicStyles.changeAmount}>₹{change.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  
                  {paymentMethod === 'card' && (
                    <>
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="Card Number (last 4 digits)"
                        maxLength="4"
                      />
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={cardHolderName}
                        onChange={(e) => setCardHolderName(e.target.value)}
                        placeholder="Card Holder Name"
                      />
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Transaction ID"
                      />
                    </>
                  )}
                  
                  {paymentMethod === 'upi' && (
                    <>
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="UPI ID"
                      />
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Transaction ID"
                      />
                    </>
                  )}
                  
                  {paymentMethod === 'cheque' && (
                    <>
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        placeholder="Cheque Number"
                      />
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Bank Name"
                      />
                    </>
                  )}
                </div>
              )}
              
              <div style={baseStyles.paymentRow}>
                <span>Paid Amount:</span>
                <input
                  type="number"
                  style={baseStyles.paymentInput}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div style={baseStyles.paymentRow}>
                <span>Payment Status:</span>
                <span style={{
                  color: paymentStatus === 'paid' ? '#28a745' : 
                         paymentStatus === 'partial' ? '#ffc107' : '#dc3545',
                  fontWeight: 'bold'
                }}>
                  {paymentStatus.toUpperCase()}
                </span>
              </div>
              
              {due > 0 && (
                <div style={baseStyles.paymentRow}>
                  <span>Due Amount:</span>
                  <span>₹{due.toFixed(2)}</span>
                </div>
              )}
              
              <button
                style={{
                  ...baseStyles.btn,
                  ...baseStyles.btnSecondary,
                  width: '100%',
                  marginTop: '5px',
                  padding: '5px'
                }}
                onClick={handleExactPayment}
              >
                Exact Amount
              </button>
            </div>
            
            <div className="bill-footer">
              <p style={baseStyles.billFooterP}>Thank you for choosing {shopDetails.name}!</p>
              <p style={baseStyles.billFooterP}>For service support, call {shopDetails.phone}</p>
              <p style={baseStyles.billFooterP}>** Computer generated service bill **</p>
            </div>
          </div>
          
          <div style={baseStyles.actionButtons} className="no-print">
            <button
              style={{
                ...baseStyles.btn,
                ...baseStyles.btnPrimary,
                ...(loading || activeServices.length === 0 ? baseStyles.btnDisabled : {})
              }}
              onClick={handlePrint}
              disabled={loading || activeServices.length === 0}
            >
              {loading ? '⏳ Saving...' : '🖨️ Print'}
            </button>
            <button
              style={{
                ...baseStyles.btn,
                ...baseStyles.btnSuccess,
                ...(loading || activeServices.length === 0 ? baseStyles.btnDisabled : {})
              }}
              onClick={handlePaymentComplete}
              disabled={loading || activeServices.length === 0}
            >
              {loading ? '⏳ Saving...' : '💰 Pay & Download'}
            </button>
            <button
              style={{
                ...baseStyles.btn,
                ...baseStyles.btnInfo,
                ...(loading ? baseStyles.btnDisabled : {})
              }}
              onClick={() => clearBill(true)}
              disabled={loading}
              title="Start a fresh service bill"
            >
              🆕 New Bill
            </button>
            <button
              style={{
                ...baseStyles.btn,
                ...baseStyles.btnDanger,
                ...(loading ? baseStyles.btnDisabled : {})
              }}
              onClick={() => clearBill(true)}
              disabled={loading}
              title="Delete current draft service bill"
            >
              🗑️ Delete Draft Bill
            </button>
          </div>

          {/* WhatsApp Share Button */}
          {showWhatsApp && lastGeneratedBill && (
            <button
              style={baseStyles.whatsappButton}
              onClick={handleWhatsAppShare}
              onMouseEnter={(e) => e.currentTarget.style.background = '#128C7E'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#25D366'}
            >
              <span>📱</span>
              Share Service Bill on WhatsApp
            </button>
          )}

          {billSaved && (
            <p style={{fontSize: '10px', color: '#28a745', textAlign: 'center', marginTop: '5px'}}>
              ✓ Service bill saved to database
            </p>
          )}
        </div>
      </div>
      
      {/* Hidden download link */}
      <a ref={downloadLinkRef} style={baseStyles.downloadLink}></a>
    </div>
  );
};

export default ServiceBill;