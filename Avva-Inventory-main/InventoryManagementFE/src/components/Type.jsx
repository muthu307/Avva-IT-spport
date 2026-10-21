// ItemsByTypePage.jsx
import React, { useEffect, useState } from "react";
import { 
  Download, Upload, Trash2, Search, RefreshCw, 
  ArrowLeft, Package, Grid, List, Edit2, X,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const API_URL = "http://localhost:5000/api/products";
const ITEMS_PER_PAGE = 9;

export default function ItemsByTypePage() {
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [viewMode, setViewMode] = useState("types"); // 'types' or 'products'
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // ================= LOAD FROM BACKEND =================
  useEffect(() => {
    loadProducts();
  }, []);

  // Reset to first page when type changes or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedType, search]);

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

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Fetch all products (no pagination params to get all for type grouping)
      const res = await fetch(`${API_URL}?page=1&per_page=1000`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      
      // Handle different response formats (based on ItemsPage.jsx)
      let productsArray = [];
      if (data && data.items && Array.isArray(data.items)) {
        productsArray = data.items;
      } else if (Array.isArray(data)) {
        productsArray = data;
      } else if (data && data.data && Array.isArray(data.data)) {
        productsArray = data.data;
      } else {
        console.warn('Unexpected API response format:', data);
        productsArray = [];
      }
      
      // Calculate values for each product and ensure valid items
      const processedItems = productsArray
        .filter(item => item && item.id) // Filter out invalid items
        .map(item => calculateValues(item));
      
      setItems(processedItems);
      
      // Extract unique types safely
      const uniqueTypes = [...new Set(processedItems
        .map(item => item.type || '')
        .filter(type => type && type.trim() !== '')
      )].sort();
      
      setTypes(uniqueTypes);
      
      if (processedItems.length > 0) {
        showMessage("success", `Loaded ${processedItems.length} products successfully!`);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      showMessage("error", "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  // ================= AUTO CALCULATION =================
  const calculateValues = (item) => {
    // Safely parse values with defaults
    const buy = parseFloat(item.buyPrice) || 0;
    const sell = parseFloat(item.sellPrice) || 0;
    const qty = parseInt(item.quantity) || 0;

    const profitPercent = buy > 0 ? (((sell - buy) / buy) * 100).toFixed(2) : "0.00";
    const amount = (sell * qty).toFixed(2);

    return { 
      ...item,
      id: item.id, // Explicitly preserve ID
      name: item.name || '',
      model: item.model || '',
      type: item.type || '',
      watts: item.watts || '',
      buyPrice: buy,
      sellPrice: sell,
      quantity: qty,
      profitPercent, 
      amount,
    };
  };

  // ================= HANDLE TYPE CLICK =================
  const handleTypeClick = (type) => {
    setSelectedType(type);
    setViewMode("products");
    setSearch("");
    setCurrentPage(1);
  };

  // ================= BACK TO TYPES VIEW =================
  const handleBackToTypes = () => {
    setSelectedType(null);
    setViewMode("types");
    setSearch("");
    setCurrentPage(1);
  };

  // ================= OPEN EDIT MODAL =================
  const handleEditItem = (item) => {
    if (!item) return;
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  // ================= HANDLE EDIT CHANGE =================
  const handleEditChange = (field, value) => {
    setEditingItem(prev => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      return calculateValues(updated);
    });
  };

  // ================= SAVE EDIT =================
  const handleSaveEdit = async () => {
    if (!editingItem || !editingItem.id) return;

    setSaving(true);
    try {
      const productData = {
        name: editingItem.name || '',
        model: editingItem.model || '',
        type: editingItem.type || '',
        watts: editingItem.watts || '',
        buyPrice: parseFloat(editingItem.buyPrice) || 0,
        sellPrice: parseFloat(editingItem.sellPrice) || 0,
        quantity: parseInt(editingItem.quantity) || 0,
      };

      const res = await fetch(`${API_URL}/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update product (${res.status})`);
      }

      // Update local state
      const updatedItem = calculateValues({ ...editingItem, ...productData });
      setItems(prev => prev.map(item => 
        item.id === editingItem.id ? updatedItem : item
      ));

      // Update types if type changed
      const updatedTypes = [...new Set(items
        .map(item => item.id === editingItem.id ? editingItem.type : item.type)
        .filter(type => type && type.trim() !== '')
      )].sort();
      setTypes(updatedTypes);

      setShowEditModal(false);
      setEditingItem(null);
      showMessage("success", "Product updated successfully!");
    } catch (err) {
      console.error("Update error:", err);
      showMessage("error", `Failed to update: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ================= DELETE ITEM =================
  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete product");
      }

      // Remove from items
      const updatedItems = items.filter(item => item.id !== id);
      setItems(updatedItems);

      // Update types
      const updatedTypes = [...new Set(updatedItems
        .map(item => item.type || '')
        .filter(type => type && type.trim() !== '')
      )].sort();
      setTypes(updatedTypes);

      // If current type has no items, go back to types view
      if (selectedType) {
        const typeStillExists = updatedItems.some(item => item.type === selectedType);
        if (!typeStillExists) {
          setSelectedType(null);
          setViewMode("types");
        }
      }

      // Adjust current page if needed
      const filteredCount = getFilteredItems(updatedItems).length;
      const totalPages = Math.ceil(filteredCount / ITEMS_PER_PAGE);
      if (currentPage > totalPages) {
        setCurrentPage(Math.max(1, totalPages));
      }

      showMessage("success", "Item deleted successfully");
    } catch (err) {
      console.error("Delete error:", err);
      showMessage("error", `Failed to delete: ${err.message}`);
    }
  };

  // ================= EXPORT TO EXCEL =================
  const handleExport = () => {
    try {
      const dataToExport = selectedType 
        ? items.filter(item => item.type === selectedType)
        : items;

      if (dataToExport.length === 0) {
        showMessage("info", "No data to export");
        return;
      }

      const exportData = dataToExport.map(item => ({
        'Name': item.name || '',
        'Model': item.model || '',
        'Type': item.type || '',
        'Watts': item.watts || '',
        'Buy Price': item.buyPrice || 0,
        'Sell Price': item.sellPrice || 0,
        'Quantity': item.quantity || 0,
        'Profit %': item.profitPercent || '0.00',
        'Amount': item.amount || '0.00'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

      // Auto-size columns
      const wscols = [
        { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
        { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }
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
      const filename = selectedType 
        ? `Products_${selectedType.replace(/[^a-z0-9]/gi, '_')}_${date}.xlsx`
        : `All_Products_${date}.xlsx`;
      
      saveAs(file, filename);
      
      showMessage("success", `Exported ${exportData.length} items successfully!`);
    } catch (err) {
      console.error("Export error:", err);
      showMessage("error", "Failed to export");
    }
  };

  // ================= FILTER ITEMS =================
  const getFilteredItems = (itemsList = items) => {
    let filtered = itemsList;
    
    if (selectedType) {
      filtered = filtered.filter(item => item.type === selectedType);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(item =>
        (item.name || '').toLowerCase().includes(searchLower) ||
        (item.model || '').toLowerCase().includes(searchLower) ||
        (item.watts || '').toString().includes(search)
      );
    }
    
    return filtered;
  };

  // ================= PAGINATION FUNCTIONS =================
  const getPaginatedItems = () => {
    const filtered = getFilteredItems();
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filtered = getFilteredItems();
    return Math.ceil(filtered.length / ITEMS_PER_PAGE);
  };

  const handlePageChange = (page) => {
    const totalPages = getTotalPages();
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleFirstPage = () => handlePageChange(1);
  const handleLastPage = () => handlePageChange(getTotalPages());
  const handlePrevPage = () => handlePageChange(currentPage - 1);
  const handleNextPage = () => handlePageChange(currentPage + 1);

  // ================= GET STATS FOR TYPE =================
  const getTypeStats = (type) => {
    const typeItems = items.filter(item => item.type === type);
    const totalItems = typeItems.length;
    const totalValue = typeItems.reduce((sum, item) => 
      sum + (parseFloat(item.amount) || 0), 0
    ).toFixed(2);
    const totalQuantity = typeItems.reduce((sum, item) => 
      sum + (item.quantity || 0), 0
    );
    
    return { totalItems, totalValue, totalQuantity };
  };

  // ================= DARK STYLES =================
  const styles = {
    container: {
      padding: "60px",
      backgroundColor: "#111827",
      minHeight: "100vh",
      color: "#f9fafb",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "25px",
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
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    backButton: {
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
      padding: "8px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      gap: "5px",
      fontSize: "14px",
      transition: "all 0.2s",
      ':hover': {
        color: "#f9fafb",
        backgroundColor: "#374151",
      }
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
      ':hover': {
        color: "#f9fafb",
        backgroundColor: "#374151",
      }
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
      ':hover': {
        backgroundColor: "#374151",
      }
    },
    viewToggle: {
      display: "flex",
      gap: "5px",
      marginRight: "10px",
    },
    viewButton: {
      padding: "8px",
      borderRadius: "6px",
      backgroundColor: "#1f2937",
      border: "1px solid #374151",
      color: "#9ca3af",
      cursor: "pointer",
      transition: "all 0.2s",
      ':hover': {
        backgroundColor: "#374151",
        color: "#f9fafb",
      },
      ':disabled': {
        opacity: 0.5,
        cursor: "not-allowed",
      }
    },
    activeViewButton: {
      backgroundColor: "#6366f1",
      color: "#fff",
      borderColor: "#6366f1",
    },
    searchContainer: {
      marginBottom: "30px",
      display: "flex",
      gap: "15px",
      alignItems: "center",
    },
    searchWrapper: {
      position: "relative",
      flex: 1,
      maxWidth: "400px",
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
      padding: "10px 10px 10px 40px",
      backgroundColor: "#1f2937",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "14px",
      outline: "none",
      transition: "all 0.2s",
      ':focus': {
        borderColor: "#6366f1",
        boxShadow: "0 0 0 2px rgba(99, 102, 241, 0.2)",
      }
    },
    
    // Types Grid Styles
    typesGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: "20px",
      marginTop: "20px",
    },
    typeCard: {
      backgroundColor: "#1f2937",
      borderRadius: "12px",
      padding: "24px",
      border: "1px solid #374151",
      cursor: "pointer",
      transition: "all 0.2s",
      position: "relative",
      overflow: "hidden",
    },
    typeCardHover: {
      transform: "translateY(-2px)",
      borderColor: "#6366f1",
      boxShadow: "0 4px 20px rgba(99, 102, 241, 0.2)",
    },
    typeIcon: {
      width: "48px",
      height: "48px",
      borderRadius: "12px",
      backgroundColor: "#374151",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "16px",
    },
    typeName: {
      fontSize: "20px",
      fontWeight: "600",
      marginBottom: "12px",
      color: "#f9fafb",
    },
    typeStats: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px",
      marginBottom: "16px",
    },
    statItem: {
      backgroundColor: "#111827",
      padding: "10px",
      borderRadius: "8px",
      textAlign: "center",
    },
    statLabel: {
      fontSize: "11px",
      color: "#9ca3af",
      marginBottom: "4px",
      textTransform: "uppercase",
    },
    statValue: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#f9fafb",
    },
    typeFooter: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      borderTop: "1px solid #374151",
      paddingTop: "16px",
    },
    productCount: {
      color: "#9ca3af",
      fontSize: "13px",
    },
    viewLink: {
      color: "#6366f1",
      fontSize: "13px",
      fontWeight: "500",
    },

    // Products Table Styles
    tableContainer: {
      overflowX: "auto",
      borderRadius: "8px",
      border: "1px solid #374151",
      marginTop: "20px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      backgroundColor: "#1f2937",
      minWidth: "1000px",
    },
    th: {
      backgroundColor: "#374151",
      padding: "12px",
      textAlign: "left",
      color: "#f3f4f6",
      fontWeight: "500",
      fontSize: "13px",
      whiteSpace: "nowrap",
    },
    td: {
      padding: "12px",
      borderTop: "1px solid #374151",
      color: "#f9fafb",
    },
    productInfo: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
    },
    productName: {
      fontWeight: "500",
      color: "#f9fafb",
    },
    productModel: {
      fontSize: "12px",
      color: "#9ca3af",
    },
    priceInfo: {
      display: "flex",
      flexDirection: "column",
      gap: "2px",
    },
    buyPrice: {
      fontSize: "12px",
      color: "#9ca3af",
    },
    sellPrice: {
      fontWeight: "500",
      color: "#4ade80",
    },
    quantity: {
      fontWeight: "600",
      color: "#f9fafb",
    },
    profitBadge: {
      display: "inline-block",
      padding: "4px 8px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: "500",
    },
    profitPositive: {
      backgroundColor: "rgba(74, 222, 128, 0.2)",
      color: "#4ade80",
    },
    profitNegative: {
      backgroundColor: "rgba(248, 113, 113, 0.2)",
      color: "#f87171",
    },
    actionButtons: {
      display: "flex",
      gap: "8px",
    },
    iconButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "6px",
      borderRadius: "4px",
      color: "#9ca3af",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s",
      ':hover': {
        backgroundColor: "#374151",
      }
    },
    editButton: {
      color: "#6366f1",
    },
    deleteButton: {
      color: "#ef4444",
    },

    // Pagination Styles
    paginationContainer: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "20px",
      padding: "12px 0",
    },
    paginationInfo: {
      color: "#9ca3af",
      fontSize: "14px",
    },
    paginationControls: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
    paginationButton: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "8px 12px",
      backgroundColor: "#1f2937",
      border: "1px solid #374151",
      color: "#f9fafb",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      minWidth: "36px",
      transition: "all 0.2s",
      ':hover:not(:disabled)': {
        backgroundColor: "#374151",
      }
    },
    paginationButtonDisabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    paginationButtonActive: {
      backgroundColor: "#6366f1",
      borderColor: "#6366f1",
    },
    pageNumbers: {
      display: "flex",
      gap: "4px",
    },

    // Modal Styles
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: '#1f2937',
      padding: '24px',
      borderRadius: '12px',
      width: '90%',
      maxWidth: '500px',
      border: '1px solid #374151',
      maxHeight: '90vh',
      overflow: 'auto',
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#f9fafb',
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#9ca3af',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '4px',
      transition: 'all 0.2s',
      ':hover': {
        color: '#f9fafb',
        backgroundColor: '#374151',
      }
    },
    formGroup: {
      marginBottom: '16px',
    },
    label: {
      display: 'block',
      marginBottom: '6px',
      fontSize: '13px',
      color: '#9ca3af',
    },
    input: {
      width: '100%',
      padding: '10px',
      backgroundColor: '#111827',
      border: '1px solid #374151',
      color: '#fff',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.2s',
      ':focus': {
        borderColor: '#6366f1',
        boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.2)',
      }
    },
    modalFooter: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      marginTop: '24px',
    },
    message: {
      padding: "12px 20px",
      borderRadius: "6px",
      marginBottom: "20px",
      fontSize: "14px",
      fontWeight: "500",
    },
    successMessage: {
      backgroundColor: "rgba(22, 163, 74, 0.2)",
      color: "#4ade80",
      border: "1px solid #16a34a",
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
    loadingOverlay: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "60px",
      color: "#9ca3af",
    },
    emptyState: {
      textAlign: "center",
      padding: "60px",
      color: "#9ca3af",
      fontStyle: "italic",
    },
  };

  // Edit Modal Component
  const EditModal = () => {
    if (!editingItem) return null;

    return (
      <div style={styles.modalOverlay} onClick={(e) => {
        if (e.target === e.currentTarget) setShowEditModal(false);
      }}>
        <div style={styles.modalContent}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>Edit Product</h3>
            <button 
              style={styles.closeButton}
              onClick={() => setShowEditModal(false)}
            >
              <X size={20} />
            </button>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Name *</label>
            <input
              style={styles.input}
              value={editingItem.name || ''}
              onChange={(e) => handleEditChange('name', e.target.value)}
              placeholder="Product name"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Model</label>
            <input
              style={styles.input}
              value={editingItem.model || ''}
              onChange={(e) => handleEditChange('model', e.target.value)}
              placeholder="Model"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Type</label>
            <input
              style={styles.input}
              value={editingItem.type || ''}
              onChange={(e) => handleEditChange('type', e.target.value)}
              placeholder="Type"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Warrenty</label>
            <input
              style={styles.input}
              value={editingItem.watts || ''}
              onChange={(e) => handleEditChange('watts', e.target.value)}
              placeholder="Watts"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Buy Price (₹)</label>
            <input
              style={styles.input}
              type="number"
              min="0"
              step="0.01"
              value={editingItem.buyPrice || ''}
              onChange={(e) => handleEditChange('buyPrice', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Sell Price (₹)</label>
            <input
              style={styles.input}
              type="number"
              min="0"
              step="0.01"
              value={editingItem.sellPrice || ''}
              onChange={(e) => handleEditChange('sellPrice', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Quantity</label>
            <input
              style={styles.input}
              type="number"
              min="0"
              step="1"
              value={editingItem.quantity || ''}
              onChange={(e) => handleEditChange('quantity', e.target.value)}
              placeholder="0"
            />
          </div>

          <div style={styles.modalFooter}>
            <button 
              style={styles.button}
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </button>
            <button 
              style={{...styles.button, backgroundColor: '#6366f1', borderColor: '#6366f1', color: '#fff'}}
              onClick={handleSaveEdit}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Pagination Component
  const Pagination = () => {
    const totalPages = getTotalPages();
    const filteredItems = getFilteredItems();
    
    if (totalPages <= 1 || filteredItems.length === 0) return null;
    
    const startItem = ((currentPage - 1) * ITEMS_PER_PAGE) + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length);

    // Generate page numbers to display
    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;
      
      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        }
      }
      
      return pages;
    };

    return (
      <div style={styles.paginationContainer}>
        <div style={styles.paginationInfo}>
          Showing {startItem} to {endItem} of {filteredItems.length} items
        </div>
        <div style={styles.paginationControls}>
          <button
            style={{
              ...styles.paginationButton,
              ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
            }}
            onClick={handleFirstPage}
            disabled={currentPage === 1}
            title="First Page"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            style={{
              ...styles.paginationButton,
              ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
            }}
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div style={styles.pageNumbers}>
            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} style={{ padding: '8px 12px', color: '#9ca3af' }}>...</span>
              ) : (
                <button
                  key={page}
                  style={{
                    ...styles.paginationButton,
                    ...(currentPage === page ? styles.paginationButtonActive : {})
                  }}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          <button
            style={{
              ...styles.paginationButton,
              ...(currentPage === totalPages ? styles.paginationButtonDisabled : {})
            }}
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>
          <button
            style={{
              ...styles.paginationButton,
              ...(currentPage === totalPages ? styles.paginationButtonDisabled : {})
            }}
            onClick={handleLastPage}
            disabled={currentPage === totalPages}
            title="Last Page"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  const filteredItems = getFilteredItems();
  const paginatedItems = getPaginatedItems();

  return (
    <div style={styles.container}>
      {/* Edit Modal */}
      {showEditModal && <EditModal />}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          {viewMode === "products" && (
            <button style={styles.backButton} onClick={handleBackToTypes}>
              <ArrowLeft size={18} /> Back to Types
            </button>
          )}
          <h1 style={styles.title}>
            <Package size={28} color="#6366f1" />
            {viewMode === "products" ? `${selectedType || ''} Products` : "Products by Type"}
          </h1>
          <button 
            style={styles.refreshButton}
            onClick={loadProducts}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div style={styles.buttonGroup}>
          <div style={styles.viewToggle}>
            <button
              style={{
                ...styles.viewButton,
                ...(viewMode === "types" ? styles.activeViewButton : {})
              }}
              onClick={handleBackToTypes}
              title="Grid View"
              disabled={viewMode === "types"}
            >
              <Grid size={18} />
            </button>
            <button
              style={{
                ...styles.viewButton,
                ...(viewMode === "products" ? styles.activeViewButton : {})
              }}
              onClick={() => selectedType && setViewMode("products")}
              title="List View"
              disabled={!selectedType}
            >
              <List size={18} />
            </button>
          </div>

          <button style={styles.button} onClick={handleExport}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Messages */}
      {message.text && (
        <div style={{
          ...styles.message,
          ...(message.type === "success" ? styles.successMessage : 
             message.type === "error" ? styles.errorMessage : 
             styles.infoMessage)
        }}>
          {message.text}
        </div>
      )}

      {/* Search */}
      <div style={styles.searchContainer}>
        <div style={styles.searchWrapper}>
          <Search size={16} style={styles.searchIcon} />
          <input
            type="text"
            placeholder={viewMode === "products" ? "Search by name, model, or watts..." : "Search types..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <span style={{ color: "#9ca3af", fontSize: "13px" }}>
          {viewMode === "products" 
            ? `${filteredItems.length} product(s)`
            : `${types.length} type(s)`
          }
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div style={styles.loadingOverlay}>Loading products...</div>
      ) : viewMode === "types" ? (
        // Types Grid View
        types.length === 0 ? (
          <div style={styles.emptyState}>
            No product types found. Add types to your products to see them here.
          </div>
        ) : (
          <div style={styles.typesGrid}>
            {types
              .filter(type => type.toLowerCase().includes(search.toLowerCase()))
              .map((type) => {
                const stats = getTypeStats(type);
                return (
                  <div
                    key={type}
                    style={styles.typeCard}
                    onClick={() => handleTypeClick(type)}
                    onMouseEnter={(e) => {
                      Object.assign(e.currentTarget.style, styles.typeCardHover);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = '';
                      e.currentTarget.style.borderColor = '#374151';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <div style={styles.typeIcon}>
                      <Package size={24} color="#6366f1" />
                    </div>
                    <h3 style={styles.typeName}>{type}</h3>
                    
                    <div style={styles.typeStats}>
                      <div style={styles.statItem}>
                        <div style={styles.statLabel}>Products</div>
                        <div style={styles.statValue}>{stats.totalItems}</div>
                      </div>
                      <div style={styles.statItem}>
                        <div style={styles.statLabel}>Quantity</div>
                        <div style={styles.statValue}>{stats.totalQuantity}</div>
                      </div>
                    </div>

                    <div style={styles.typeFooter}>
                      <span style={styles.productCount}>
                        Total: ₹{stats.totalValue}
                      </span>
                      <span style={styles.viewLink}>View Products →</span>
                    </div>
                  </div>
                );
              })}
          </div>
        )
      ) : (
        // Products Table View
        <>
          <div style={styles.tableContainer}>
            {filteredItems.length === 0 ? (
              <div style={styles.emptyState}>
                {search 
                  ? "No products match your search" 
                  : `No products found in type "${selectedType || ''}"`
                }
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Model</th>
                    <th style={styles.th}>Warrenty</th>
                    <th style={styles.th}>Buy Price</th>
                    <th style={styles.th}>Sell Price</th>
                    <th style={styles.th}>Quantity</th>
                    <th style={styles.th}>Profit %</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item) => (
                    <tr key={item.id}>
                      <td style={styles.td}>
                        <div style={styles.productInfo}>
                          <span style={styles.productName}>{item.name || '-'}</span>
                        </div>
                      </td>
                      
                      <td style={styles.td}>
                        <span style={styles.productModel}>{item.model || '-'}</span>
                      </td>
                      
                      <td style={styles.td}>
                        <span>{item.watts || '-'}</span>
                      </td>
                      
                      <td style={styles.td}>
                        <span style={styles.buyPrice}>₹{item.buyPrice.toFixed(2)}</span>
                      </td>
                      
                      <td style={styles.td}>
                        <span style={styles.sellPrice}>₹{item.sellPrice.toFixed(2)}</span>
                      </td>
                      
                      <td style={styles.td}>
                        <span style={styles.quantity}>{item.quantity}</span>
                      </td>
                      
                      <td style={styles.td}>
                        <span style={{
                          ...styles.profitBadge,
                          ...(parseFloat(item.profitPercent) >= 0 
                            ? styles.profitPositive 
                            : styles.profitNegative)
                        }}>
                          {item.profitPercent}%
                        </span>
                      </td>
                      
                      <td style={styles.td}>
                        <span>₹{parseFloat(item.amount).toFixed(2)}</span>
                      </td>
                      
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          <button
                            style={{...styles.iconButton, ...styles.editButton}}
                            onClick={() => handleEditItem(item)}
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            style={{...styles.iconButton, ...styles.deleteButton}}
                            onClick={() => handleDelete(item.id)}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination */}
          <Pagination />
        </>
      )}
    </div>
  );
}