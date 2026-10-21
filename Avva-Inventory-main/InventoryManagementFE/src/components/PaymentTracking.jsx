import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/dateUtils';

const PaymentTracking = () => {
  // State for suppliers data
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  
  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'Cash',
    reference_number: '',
    notes: ''
  });
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  const BASE_URL = 'http://localhost:5000';

  // Check authentication
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/check-session`, {
        credentials: 'include',
        mode: 'cors'
      });
      const data = await response.json();
      
      if (data.authenticated) {
        fetchSuppliers();
      } else {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Error checking auth:', err);
    }
  };

  // Fetch suppliers with payment info
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/suppliers-with-items`, {
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch suppliers');
      }
      
      const data = await response.json();
      if (data.success) {
        // Calculate payment info for each supplier
        const suppliersWithPayments = await Promise.all(
          data.suppliers.map(async (supplier) => {
            try {
              const paymentResponse = await fetch(`${BASE_URL}/api/suppliers/${supplier.id}/payments`, {
                credentials: 'include',
                mode: 'cors'
              });
              const paymentData = await paymentResponse.json();
              
              // Calculate totals
              const totalPurchase = supplier.items.reduce((sum, item) => 
                sum + ((item.quantity || 0) * (item.buy_price || 0)), 0);
              const totalPaid = paymentData.success ? 
                paymentData.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
              const remainingBalance = totalPurchase - totalPaid;
              
              return {
                ...supplier,
                payments: paymentData.success ? paymentData.payments : [],
                total_purchase: totalPurchase,
                total_paid: totalPaid,
                remaining_balance: remainingBalance,
                payment_status: remainingBalance <= 0 ? 'Paid' : totalPaid > 0 ? 'Pending' : 'Unpaid'
              };
            } catch (err) {
              console.error(`Error fetching payments for supplier ${supplier.id}:`, err);
              return {
                ...supplier,
                payments: [],
                total_purchase: 0,
                total_paid: 0,
                remaining_balance: 0,
                payment_status: 'Unpaid'
              };
            }
          })
        );
        
        setSuppliers(suppliersWithPayments);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle payment input change
  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Record payment
  const recordPayment = async (e) => {
    e.preventDefault();
    if (!selectedSupplier || !paymentForm.amount) {
      alert('Please enter an amount');
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/suppliers/${selectedSupplier.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify({
          amount: parseFloat(paymentForm.amount),
          payment_method: paymentForm.payment_method,
          reference_number: paymentForm.reference_number || null,
          notes: paymentForm.notes || null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record payment');
      }
      
      const data = await response.json();
      if (data.success) {
        await fetchSuppliers();
        setShowPaymentPopup(false);
        setPaymentForm({
          amount: '',
          payment_method: 'Cash',
          reference_number: '',
          notes: ''
        });
        alert('Payment recorded successfully!');
      }
    } catch (err) {
      setError(err.message);
      alert('Failed to record payment: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete payment
  const deletePayment = async (paymentId) => {
    if (window.confirm('Are you sure you want to delete this payment record?')) {
      try {
        setLoading(true);
        const response = await fetch(`${BASE_URL}/api/payments/${paymentId}`, {
          method: 'DELETE',
          credentials: 'include',
          mode: 'cors'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete payment');
        }
        
        const data = await response.json();
        if (data.success) {
          await fetchSuppliers();
          alert('Payment deleted successfully!');
        }
      } catch (err) {
        setError(err.message);
        alert('Failed to delete payment: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Filter suppliers
  const getFilteredSuppliers = () => {
    let filtered = suppliers;
    
    if (searchTerm) {
      filtered = filtered.filter(supplier =>
        supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(supplier => 
        supplier.payment_status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }
    
    return filtered;
  };

  // Get current page suppliers
  const getCurrentSuppliers = () => {
    const filtered = getFilteredSuppliers();
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filtered.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'Paid': return '#10b981';
      case 'Pending': return '#f59e0b';
      case 'Unpaid': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Pagination
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Styles (matching SupplierPage)
  const styles = {
    container: {
      padding: "24px",
      backgroundColor: "#0f172a",
      minHeight: "100vh",
      color: "#e2e8f0",
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    header: {
      marginBottom: "32px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "16px",
    },
    title: {
      fontSize: "28px",
      fontWeight: "600",
      margin: 0,
      color: "#ffffff",
      letterSpacing: "-0.5px",
    },
    subtitle: {
      color: "#94a3b8",
      fontSize: "14px",
      marginTop: "8px",
    },
    searchContainer: {
      display: "flex",
      gap: "15px",
      marginBottom: "20px",
      alignItems: "center",
      flexWrap: "wrap",
    },
    searchInput: {
      flex: "1",
      minWidth: "300px",
      padding: "12px 16px",
      backgroundColor: "#1e293b",
      border: "1px solid #334155",
      color: "#fff",
      borderRadius: "8px",
      fontSize: "14px",
    },
    filterSelect: {
      padding: "12px 16px",
      backgroundColor: "#1e293b",
      border: "1px solid #334155",
      color: "#fff",
      borderRadius: "8px",
      fontSize: "14px",
      minWidth: "150px",
      cursor: "pointer",
    },
    tableContainer: {
      overflowX: "auto",
      borderRadius: "16px",
      border: "1px solid #334155",
      marginTop: "20px",
      backgroundColor: "#1e293b",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      backgroundColor: "#1e293b",
      minWidth: "1000px",
    },
    th: {
      backgroundColor: "#0f172a",
      padding: "16px",
      textAlign: "left",
      color: "#94a3b8",
      fontWeight: "500",
      fontSize: "13px",
      letterSpacing: "0.3px",
      textTransform: "uppercase",
      borderBottom: "2px solid #334155",
    },
    td: {
      padding: "14px 16px",
      borderBottom: "1px solid #334155",
      color: "#e2e8f0",
      fontSize: "14px",
    },
    statusBadge: {
      padding: "4px 12px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "600",
      display: "inline-block",
    },
    button: {
      padding: "8px 16px",
      borderRadius: "8px",
      backgroundColor: "#2563eb",
      color: "#fff",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      transition: "all 0.2s ease",
    },
    buttonSmall: {
      padding: "6px 12px",
      fontSize: "12px",
      marginRight: "8px",
    },
    deleteButton: {
      backgroundColor: "#ef4444",
    },
    viewButton: {
      backgroundColor: "#059669",
    },
    summaryCard: {
      backgroundColor: "#1e293b",
      borderRadius: "16px",
      padding: "20px",
      border: "1px solid #334155",
      marginBottom: "20px",
    },
    summaryGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "20px",
      marginTop: "20px",
    },
    summaryItem: {
      textAlign: "center",
      padding: "20px",
      backgroundColor: "#0f172a",
      borderRadius: "12px",
    },
    summaryLabel: {
      color: "#94a3b8",
      fontSize: "13px",
      textTransform: "uppercase",
      marginBottom: "10px",
    },
    summaryValue: {
      color: "#fff",
      fontSize: "28px",
      fontWeight: "600",
    },
    overlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
      backdropFilter: "blur(8px)",
    },
    popup: {
      backgroundColor: "#1e293b",
      padding: "35px",
      borderRadius: "16px",
      width: "600px",
      maxWidth: "90%",
      maxHeight: "85vh",
      overflowY: "auto",
      border: "1px solid #334155",
      position: "relative",
    },
    popupHeader: {
      marginBottom: "30px",
      borderBottom: "2px solid #334155",
      paddingBottom: "20px",
    },
    popupTitle: {
      color: "#fff",
      fontSize: "24px",
      fontWeight: "600",
      margin: 0,
    },
    formGroup: {
      marginBottom: "20px",
    },
    label: {
      display: "block",
      marginBottom: "8px",
      color: "#94a3b8",
      fontSize: "13px",
      fontWeight: "500",
    },
    input: {
      width: "100%",
      padding: "12px 16px",
      backgroundColor: "#0f172a",
      border: "1px solid #334155",
      color: "#fff",
      borderRadius: "8px",
      fontSize: "14px",
      boxSizing: "border-box",
    },
    select: {
      width: "100%",
      padding: "12px 16px",
      backgroundColor: "#0f172a",
      border: "1px solid #334155",
      color: "#fff",
      borderRadius: "8px",
      fontSize: "14px",
      cursor: "pointer",
    },
    textarea: {
      width: "100%",
      padding: "12px 16px",
      backgroundColor: "#0f172a",
      border: "1px solid #334155",
      color: "#fff",
      borderRadius: "8px",
      fontSize: "14px",
      fontFamily: "inherit",
      resize: "vertical",
      minHeight: "80px",
    },
    buttonGroup: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
      marginTop: "30px",
      paddingTop: "20px",
      borderTop: "1px solid #334155",
    },
    cancelButton: {
      padding: "12px 24px",
      borderRadius: "8px",
      backgroundColor: "transparent",
      color: "#94a3b8",
      border: "1px solid #334155",
      cursor: "pointer",
      fontSize: "14px",
    },
    submitButton: {
      padding: "12px 28px",
      borderRadius: "8px",
      backgroundColor: "#2563eb",
      color: "#fff",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
    },
    pagination: {
      display: "flex",
      justifyContent: "center",
      gap: "10px",
      marginTop: "30px",
      flexWrap: "wrap",
    },
    pageButton: {
      padding: "8px 12px",
      borderRadius: "6px",
      backgroundColor: "#1e293b",
      color: "#e2e8f0",
      border: "1px solid #334155",
      cursor: "pointer",
      fontSize: "14px",
      minWidth: "40px",
      transition: "all 0.2s",
    },
    pageButtonActive: {
      backgroundColor: "#2563eb",
      color: "#fff",
      border: "1px solid #3b82f6",
    },
    pageButtonDisabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    closeButton: {
      position: "absolute",
      top: "20px",
      right: "20px",
      background: "#334155",
      border: "none",
      color: "#94a3b8",
      fontSize: "20px",
      cursor: "pointer",
      width: "36px",
      height: "36px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s",
    },
    loadingOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2000,
    },
    loadingSpinner: {
      border: "4px solid #334155",
      borderTop: "4px solid #2563eb",
      borderRadius: "50%",
      width: "40px",
      height: "40px",
      animation: "spin 1s linear infinite",
    },
    resultsInfo: {
      color: "#94a3b8",
      fontSize: "14px",
      marginTop: "10px",
    },
  };

  // Add keyframe animation for spinner
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      button:hover {
        transform: translateY(-2px);
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Calculate overall totals
  const filteredSuppliers = getFilteredSuppliers();
  const overallTotal = filteredSuppliers.reduce((sum, s) => sum + (s.total_purchase || 0), 0);
  const overallPaid = filteredSuppliers.reduce((sum, s) => sum + (s.total_paid || 0), 0);
  const overallRemaining = overallTotal - overallPaid;

  const currentSuppliers = getCurrentSuppliers();
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);

  // Render payment popup
  const renderPaymentPopup = () => {
    if (!showPaymentPopup || !selectedSupplier) return null;
    
    return (
      <div style={styles.overlay} onClick={() => setShowPaymentPopup(false)}>
        <div style={styles.popup} onClick={(e) => e.stopPropagation()}>
          <button 
            style={styles.closeButton} 
            onClick={() => setShowPaymentPopup(false)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#334155'}
          >
            ✕
          </button>
          
          <div style={styles.popupHeader}>
            <h2 style={styles.popupTitle}>Record Payment</h2>
            <div style={{ color: '#94a3b8', marginTop: '8px' }}>
              Supplier: {selectedSupplier.name} - {selectedSupplier.company}
            </div>
            <div style={{ color: '#f59e0b', marginTop: '4px', fontSize: '14px', fontWeight: '500' }}>
              Remaining Balance: {formatCurrency(selectedSupplier.remaining_balance)}
            </div>
          </div>
          
          <form onSubmit={recordPayment}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Amount *</label>
              <input
                type="number"
                name="amount"
                value={paymentForm.amount}
                onChange={handlePaymentChange}
                placeholder="Enter amount"
                min="0.01"
                step="0.01"
                required
                style={styles.input}
                disabled={loading}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Payment Method</label>
              <select
                name="payment_method"
                value={paymentForm.payment_method}
                onChange={handlePaymentChange}
                style={styles.select}
                disabled={loading}
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Credit Card">Credit Card</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Reference Number (Optional)</label>
              <input
                type="text"
                name="reference_number"
                value={paymentForm.reference_number}
                onChange={handlePaymentChange}
                placeholder="Cheque number, transaction ID, etc."
                style={styles.input}
                disabled={loading}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Notes (Optional)</label>
              <textarea
                name="notes"
                value={paymentForm.notes}
                onChange={handlePaymentChange}
                placeholder="Additional notes..."
                style={styles.textarea}
                disabled={loading}
              />
            </div>
            
            <div style={styles.buttonGroup}>
              <button 
                type="button" 
                onClick={() => setShowPaymentPopup(false)} 
                style={styles.cancelButton}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                style={styles.submitButton} 
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Render details popup
  const renderDetailsPopup = () => {
    if (!showDetailsPopup || !selectedSupplier) return null;
    
    return (
      <div style={styles.overlay} onClick={() => setShowDetailsPopup(false)}>
        <div style={{...styles.popup, width: "900px"}} onClick={(e) => e.stopPropagation()}>
          <button 
            style={styles.closeButton} 
            onClick={() => setShowDetailsPopup(false)}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#334155'}
          >
            ✕
          </button>
          
          <div style={styles.popupHeader}>
            <h2 style={styles.popupTitle}>Supplier Details</h2>
            <div style={{ color: '#fff', fontSize: '18px', marginTop: '10px' }}>
              {selectedSupplier.name} - {selectedSupplier.company}
            </div>
            <div style={{ color: '#94a3b8', marginTop: '5px', fontSize: '13px' }}>
              {selectedSupplier.email && `📧 ${selectedSupplier.email}  `}
              {selectedSupplier.phone && `📞 ${selectedSupplier.phone}  `}
              {selectedSupplier.address && `📍 ${selectedSupplier.address}`}
            </div>
          </div>
          
          {/* Payment Summary */}
          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ color: '#fff', marginBottom: "15px", fontSize: "18px" }}>Payment Summary</h3>
            <div style={styles.summaryGrid}>
              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Total Purchase</div>
                <div style={styles.summaryValue}>{formatCurrency(selectedSupplier.total_purchase)}</div>
              </div>
              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Total Paid</div>
                <div style={styles.summaryValue}>{formatCurrency(selectedSupplier.total_paid)}</div>
              </div>
              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Remaining Balance</div>
                <div style={{...styles.summaryValue, color: selectedSupplier.remaining_balance > 0 ? '#f59e0b' : '#10b981'}}>
                  {formatCurrency(selectedSupplier.remaining_balance)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Items List */}
          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ color: '#fff', marginBottom: "15px", fontSize: "18px" }}>Items Purchased</h3>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Item Name</th>
                    <th style={styles.th}>Model</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Quantity</th>
                    <th style={styles.th}>Unit Price</th>
                    <th style={styles.th}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSupplier.items && selectedSupplier.items.length > 0 ? (
                    selectedSupplier.items.map(item => (
                      <tr key={item.id}>
                        <td style={styles.td}>
                          {item.name}
                          {item.status === 'Pending' && (
                            <span style={{ background: '#f59e0b', padding: '2px 6px', borderRadius: '12px', fontSize: '10px', marginLeft: '8px', color: '#000' }}>
                              Pending
                            </span>
                          )}
                        </td>
                        <td style={styles.td}>{item.model}</td>
                        <td style={styles.td}>{item.type || '—'}</td>
                        <td style={styles.td}>{item.quantity || 0}</td>
                        <td style={styles.td}>{formatCurrency(item.buy_price)}</td>
                        <td style={styles.td}>{formatCurrency((item.quantity || 0) * (item.buy_price || 0))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        No items found for this supplier
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Payment History */}
          <div>
            <h3 style={{ color: '#fff', marginBottom: "15px", fontSize: "18px" }}>Payment History</h3>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Method</th>
                    <th style={styles.th}>Reference</th>
                    <th style={styles.th}>Notes</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSupplier.payments && selectedSupplier.payments.length > 0 ? (
                    selectedSupplier.payments.map(payment => (
                      <tr key={payment.id}>
                        <td style={styles.td}>
                          {formatDate(payment.payment_date)}
                        </td>
                        <td style={styles.td}>{formatCurrency(payment.amount)}</td>
                        <td style={styles.td}>{payment.payment_method}</td>
                        <td style={styles.td}>{payment.reference_number || '—'}</td>
                        <td style={styles.td}>{payment.notes || '—'}</td>
                        <td style={styles.td}>
                          <button
                            onClick={() => deletePayment(payment.id)}
                            style={{...styles.button, ...styles.buttonSmall, ...styles.deleteButton}}
                            disabled={loading}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        No payment records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div style={styles.buttonGroup}>
            <button onClick={() => setShowDetailsPopup(false)} style={styles.submitButton}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Loading Overlay */}
      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingSpinner}></div>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Payment Tracking</h1>
          <p style={styles.subtitle}>Track supplier payments, view balances, and manage payment history</p>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div style={styles.summaryCard}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryItem}>
            <div style={styles.summaryLabel}>Total Purchase Amount</div>
            <div style={styles.summaryValue}>{formatCurrency(overallTotal)}</div>
          </div>
          <div style={styles.summaryItem}>
            <div style={styles.summaryLabel}>Total Paid Amount</div>
            <div style={styles.summaryValue}>{formatCurrency(overallPaid)}</div>
          </div>
          <div style={styles.summaryItem}>
            <div style={styles.summaryLabel}>Total Remaining Balance</div>
            <div style={{...styles.summaryValue, color: overallRemaining > 0 ? '#f59e0b' : '#10b981'}}>
              {formatCurrency(overallRemaining)}
            </div>
          </div>
          <div style={styles.summaryItem}>
            <div style={styles.summaryLabel}>Suppliers</div>
            <div style={styles.summaryValue}>{filteredSuppliers.length}</div>
          </div>
        </div>
      </div>
      
      {/* Search and Filter */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          style={styles.searchInput}
          placeholder="Search by name, company, or email..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
        <select
          style={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>
      
      {/* Suppliers Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Supplier Name</th>
              <th style={styles.th}>Company</th>
              <th style={styles.th}>Total Purchase</th>
              <th style={styles.th}>Paid Amount</th>
              <th style={styles.th}>Remaining</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && suppliers.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                  Loading suppliers...
                </td>
              </tr>
            ) : currentSuppliers.length > 0 ? (
              currentSuppliers.map(supplier => (
                <tr key={supplier.id}>
                  <td style={styles.td}>
                    <strong>{supplier.name || '—'}</strong>
                  </td>
                  <td style={styles.td}>{supplier.company || '—'}</td>
                  <td style={styles.td}>{formatCurrency(supplier.total_purchase)}</td>
                  <td style={styles.td}>{formatCurrency(supplier.total_paid)}</td>
                  <td style={styles.td}>
                    <span style={{ color: supplier.remaining_balance > 0 ? '#f59e0b' : '#10b981', fontWeight: '500' }}>
                      {formatCurrency(supplier.remaining_balance)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(supplier.payment_status) + '20',
                      color: getStatusColor(supplier.payment_status),
                      border: `1px solid ${getStatusColor(supplier.payment_status)}`
                    }}>
                      {supplier.payment_status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => {
                        setSelectedSupplier(supplier);
                        setShowPaymentPopup(true);
                      }}
                      style={{...styles.button, ...styles.buttonSmall}}
                    >
                      Record Payment
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSupplier(supplier);
                        setShowDetailsPopup(true);
                      }}
                      style={{...styles.button, ...styles.viewButton, ...styles.buttonSmall}}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                  {searchTerm || statusFilter !== 'all' ? 'No suppliers match your filters.' : 'No suppliers found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            style={{
              ...styles.pageButton,
              ...(currentPage === 1 ? styles.pageButtonDisabled : {})
            }}
            onClick={() => currentPage > 1 && paginate(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ←
          </button>
          
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
                  style={{
                    ...styles.pageButton,
                    ...(currentPage === pageNumber ? styles.pageButtonActive : {})
                  }}
                  onClick={() => paginate(pageNumber)}
                >
                  {pageNumber}
                </button>
              );
            } else if (pageNumber === currentPage - 3 || pageNumber === currentPage + 3) {
              return <span key={pageNumber} style={{ color: '#6b7280' }}>...</span>;
            }
            return null;
          })}
          
          <button
            style={{
              ...styles.pageButton,
              ...(currentPage === totalPages ? styles.pageButtonDisabled : {})
            }}
            onClick={() => currentPage < totalPages && paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            →
          </button>
        </div>
      )}
      
      {/* Results Info */}
      {filteredSuppliers.length > 0 && (
        <div style={styles.resultsInfo}>
          Showing {currentSuppliers.length} of {filteredSuppliers.length} suppliers
        </div>
      )}
      
      {/* Popups */}
      {renderPaymentPopup()}
      {renderDetailsPopup()}
    </div>
  );
};

export default PaymentTracking;