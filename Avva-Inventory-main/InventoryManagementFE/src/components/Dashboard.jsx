import React, { useState, useEffect } from "react";
import {
  FaUsers,
  FaShoppingCart,
  FaMoneyBillWave,
  FaChartLine,
  FaBoxes,
  FaExclamationTriangle,
  FaSpinner,
  FaArrowRight,
  FaEye,
} from "react-icons/fa";
import api from '../utils/api';
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    products: {
      total: 0,
      totalQuantity: 0,
      lowStock: 0,
    },
    billing: {
      today: {
        bills: 0,
        sales: 0,
        average: 0,
      },
      thisWeek: {
        bills: 0,
        sales: 0,
      },
      thisMonth: {
        bills: 0,
        sales: 0,
      },
      pendingItems: 0,
    },
    lowStockProducts: [],
    paymentMethods: [],
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch product statistics
      const productStatsResponse = await api.get('/products/statistics');
      
      // Fetch billing statistics
      const billingStatsResponse = await api.get('/billing/statistics');
      
      // Fetch low stock products (quantity < 10)
      const lowStockResponse = await api.get('/products?per_page=100');
      
      // Process data
      const productStats = productStatsResponse.data;
      const billingStats = billingStatsResponse.data;
      
      // Filter low stock products
      const allProducts = lowStockResponse.data.items || [];
      const lowStockProducts = allProducts
        .filter(product => product.quantity < 10)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 10); // Show top 10 lowest stock
      
      // Calculate total payments from payment methods
      const totalPayments = (billingStats.paymentMethods || []).reduce(
        (sum, method) => sum + (method.total || 0), 
        0
      );
      
      setStats({
        products: {
          total: productStats.total_products || 0,
          totalQuantity: productStats.total_quantity || 0,
          lowStock: lowStockProducts.length,
        },
        billing: {
          today: billingStats.today || { bills: 0, sales: 0, average: 0 },
          thisWeek: billingStats.thisWeek || { bills: 0, sales: 0 },
          thisMonth: billingStats.thisMonth || { bills: 0, sales: 0 },
          pendingItems: billingStats.pendingItems || 0,
          totalPayments: totalPayments,
        },
        lowStockProducts: lowStockProducts,
        paymentMethods: billingStats.paymentMethods || [],
      });
      
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleViewAllLowStock = () => {
    navigate('/lowstock'); // Updated to match your NavLink path
  };

  const styles = {
    container: {
      padding: "24px",
      backgroundColor: "#0f172a",
      minHeight: "100vh",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      color: "#e2e8f0",
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
      margin: 0,
      color: "#ffffff",
      fontSize: "28px",
      fontWeight: "600",
    },
    subtitle: {
      color: "#94a3b8",
      marginTop: "4px",
      fontSize: "14px",
    },
    refreshButton: {
      backgroundColor: "#2563eb",
      color: "white",
      border: "none",
      padding: "10px 20px",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s",
      ':hover': {
        backgroundColor: "#1d4ed8",
      }
    },
    cards: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "20px",
      marginBottom: "30px",
    },
    card: {
      backgroundColor: "#1e293b",
      padding: "24px",
      borderRadius: "16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      transition: "transform 0.2s, box-shadow 0.2s",
      cursor: "pointer",
      border: "1px solid #334155",
    },
    icon: {
      fontSize: "36px",
      padding: "12px",
      borderRadius: "12px",
      backgroundColor: "rgba(255,255,255,0.1)",
    },
    cardContent: {
      flex: 1,
    },
    cardLabel: {
      color: "#94a3b8",
      fontSize: "14px",
      marginBottom: "4px",
    },
    cardValue: {
      color: "#ffffff",
      fontSize: "24px",
      fontWeight: "600",
      margin: 0,
    },
    cardSmallValue: {
      color: "#94a3b8",
      fontSize: "13px",
      marginTop: "4px",
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr",
      gap: "24px",
      marginBottom: "24px",
    },
    tableContainer: {
      backgroundColor: "#1e293b",
      padding: "20px",
      borderRadius: "16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      border: "1px solid #334155",
    },
    tableHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px",
    },
    tableTitle: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#ffffff",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    viewAllLink: {
      color: "#3b82f6",
      fontSize: "14px",
      cursor: "pointer",
      textDecoration: "none",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "6px 12px",
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      borderRadius: "20px",
      transition: "all 0.2s",
      ':hover': {
        backgroundColor: "rgba(59, 130, 246, 0.2)",
      }
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      padding: "12px",
      borderBottom: "2px solid #334155",
      textAlign: "left",
      color: "#94a3b8",
      fontWeight: "500",
      fontSize: "13px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    td: {
      padding: "12px",
      borderBottom: "1px solid #334155",
      textAlign: "left",
      fontSize: "14px",
    },
    statusBadge: {
      padding: "4px 8px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "500",
      display: "inline-block",
    },
    lowStock: {
      backgroundColor: "rgba(239, 68, 68, 0.2)",
      color: "#ef4444",
    },
    criticalStock: {
      backgroundColor: "rgba(127, 29, 29, 0.4)",
      color: "#fca5a5",
      border: "1px solid #7f1d1d",
    },
    loadingContainer: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "400px",
      flexDirection: "column",
      gap: "16px",
    },
    errorContainer: {
      backgroundColor: "rgba(239, 68, 68, 0.2)",
      color: "#ef4444",
      padding: "16px",
      borderRadius: "8px",
      marginBottom: "20px",
      border: "1px solid rgba(239, 68, 68, 0.3)",
    },
    spinner: {
      animation: "spin 1s linear infinite",
    },
    paymentGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "16px",
      marginTop: "16px",
    },
    paymentCard: {
      backgroundColor: "#0f172a",
      padding: "16px",
      borderRadius: "12px",
      border: "1px solid #334155",
    },
    paymentMethod: {
      color: "#94a3b8",
      fontSize: "14px",
      textTransform: "capitalize",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    paymentAmount: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#ffffff",
      marginTop: "8px",
    },
    paymentCount: {
      color: "#94a3b8",
      fontSize: "13px",
      marginTop: "4px",
    },
    viewAllText: {
      color: "#3b82f6", 
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      fontSize: "13px",
      transition: "all 0.2s",
      ':hover': {
        color: "#60a5fa",
      }
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <FaSpinner style={{ ...styles.spinner, fontSize: "40px", color: "#3b82f6" }} />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.4);
          }
          .view-all:hover {
            background-color: rgba(59, 130, 246, 0.2) !important;
          }
          .view-all-text:hover {
            color: #60a5fa !important;
          }
        `}
      </style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Dashboard</h2>
          <p style={styles.subtitle}>
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <button 
          style={styles.refreshButton}
          onClick={fetchDashboardData}
        >
          <FaChartLine /> Refresh Data
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorContainer}>
          <FaExclamationTriangle style={{ marginRight: "8px" }} />
          {error}
        </div>
      )}

      {/* Cards */}
      <div style={styles.cards}>
        <div className="card" style={styles.card}>
          <FaBoxes style={{ ...styles.icon, color: "#3b82f6" }} />
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Total Products</div>
            <div style={styles.cardValue}>{stats.products.total}</div>
            <div style={styles.cardSmallValue}>
              {stats.products.totalQuantity} units in stock
            </div>
          </div>
        </div>

        <div className="card" style={styles.card}>
          <FaShoppingCart style={{ ...styles.icon, color: "#f59e0b" }} />
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Today's Sales</div>
            <div style={styles.cardValue}>
              {formatCurrency(stats.billing.today.sales)}
            </div>
            <div style={styles.cardSmallValue}>
              {stats.billing.today.bills} bills · Avg {formatCurrency(stats.billing.today.average)}
            </div>
          </div>
        </div>

        <div className="card" style={styles.card}>
          <FaMoneyBillWave style={{ ...styles.icon, color: "#10b981" }} />
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>Total Payments</div>
            <div style={styles.cardValue}>
              {formatCurrency(stats.billing.totalPayments || 0)}
            </div>
            <div style={styles.cardSmallValue}>
              All time payments received
            </div>
          </div>
        </div>

        <div className="card" style={styles.card}>
          <FaChartLine style={{ ...styles.icon, color: "#8b5cf6" }} />
          <div style={styles.cardContent}>
            <div style={styles.cardLabel}>This Month</div>
            <div style={styles.cardValue}>
              {formatCurrency(stats.billing.thisMonth.sales)}
            </div>
            <div style={styles.cardSmallValue}>
              {stats.billing.thisMonth.bills} bills · {stats.billing.pendingItems} pending items
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={styles.grid2}>
        {/* Low Stock Products */}
        <div style={styles.tableContainer}>
          <div style={styles.tableHeader}>
            <h3 style={styles.tableTitle}>
              <FaExclamationTriangle color="#ef4444" />
              Low Stock Alert ({stats.lowStockProducts.length} items)
            </h3>
            <span 
              style={styles.viewAllLink}
              onClick={handleViewAllLowStock}
              className="view-all"
            >
              View All <FaArrowRight size={12} />
            </span>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Model</th>
                <th style={styles.th}>Stock</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.lowStockProducts.length > 0 ? (
                stats.lowStockProducts.slice(0, 5).map((product) => (
                  <tr key={product.id}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: "500" }}>{product.name}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: "#94a3b8" }}>{product.model || '-'}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ 
                        fontWeight: "600",
                        color: product.quantity === 0 ? "#ef4444" : "#f59e0b"
                      }}>
                        {product.quantity}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...(product.quantity === 0 
                            ? styles.criticalStock 
                            : styles.lowStock),
                        }}
                      >
                        {product.quantity === 0 ? "Out of Stock" : "Low Stock"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ ...styles.td, textAlign: "center", padding: "40px" }}>
                    <FaBoxes size={32} style={{ opacity: 0.5, marginBottom: "12px" }} />
                    <div>All products are well stocked ✓</div>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>
                      No items with quantity less than 10
                    </div>
                  </td>
                </tr>
              )}
              
              {stats.lowStockProducts.length > 5 && (
                <tr>
                  <td colSpan="4" style={{ ...styles.td, textAlign: "center", backgroundColor: "#0f172a" }}>
                    <span 
                      onClick={handleViewAllLowStock}
                      style={styles.viewAllText}
                      className="view-all-text"
                    >
                      <FaEye size={12} /> View all {stats.lowStockProducts.length} low stock items
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Payment Methods Summary */}
        <div style={styles.tableContainer}>
          <div style={styles.tableHeader}>
            <h3 style={styles.tableTitle}>
              <FaMoneyBillWave color="#10b981" />
              Payment Methods
            </h3>
          </div>
          
          {stats.paymentMethods.length > 0 ? (
            <div style={styles.paymentGrid}>
              {stats.paymentMethods.map((method, index) => (
                <div key={index} style={styles.paymentCard}>
                  <div style={styles.paymentMethod}>
                    <span style={{ 
                      width: "8px", 
                      height: "8px", 
                      borderRadius: "50%",
                      backgroundColor: 
                        method.method === 'cash' ? '#10b981' :
                        method.method === 'card' ? '#3b82f6' :
                        method.method === 'upi' ? '#8b5cf6' : '#f59e0b'
                    }} />
                    {method.method}
                  </div>
                  <div style={styles.paymentAmount}>
                    {formatCurrency(method.total)}
                  </div>
                  <div style={styles.paymentCount}>
                    {method.count} {method.count === 1 ? 'transaction' : 'transactions'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <FaMoneyBillWave size={32} style={{ opacity: 0.5, marginBottom: "12px" }} />
              <p style={{ color: "#94a3b8" }}>No payment data available</p>
            </div>
          )}
          
          {/* Total Payments Summary */}
          {stats.paymentMethods.length > 0 && (
            <div style={{ 
              marginTop: "20px", 
              padding: "16px", 
              backgroundColor: "#0f172a",
              borderRadius: "12px",
              border: "1px solid #334155"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#94a3b8" }}>Total Payments</span>
                <span style={{ fontSize: "20px", fontWeight: "600", color: "#10b981" }}>
                  {formatCurrency(stats.billing.totalPayments || 0)}
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                All time total
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;