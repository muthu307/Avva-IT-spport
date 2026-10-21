import React, { useState, useEffect } from 'react';

const SupplierDuplicatePage = () => {
  // State for suppliers list
  const [suppliers, setSuppliers] = useState([]);
  const [groupedSuppliers, setGroupedSuppliers] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  
  // State for items
  const [items, setItems] = useState([]);
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // State for popup
  const [showSupplierDetails, setShowSupplierDetails] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Base URL for API
  const BASE_URL = 'http://localhost:5000';

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Filter groups when search term changes
  useEffect(() => {
    filterGroups();
  }, [searchTerm, searchField, groupedSuppliers]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchField]);

  // Check if user is authenticated
  const checkAuth = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/check-session`, {
        credentials: 'include',
        mode: 'cors'
      });
      const data = await response.json();
      setIsAuthenticated(data.authenticated);
      
      if (data.authenticated) {
        fetchSuppliers();
      } else {
        // Redirect to login if not authenticated
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Error checking auth:', err);
    }
  };

  // Fetch suppliers from API
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/suppliers`, {
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
        setSuppliers(data.suppliers);
        
        // Also fetch all items for these suppliers
        const allItems = [];
        data.suppliers.forEach(supplier => {
          if (supplier.items) {
            allItems.push(...supplier.items);
          }
        });
        setItems(allItems);
        
        // Group suppliers by name, company, address, phone
        groupSuppliers(data.suppliers);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group suppliers by name, company, address, phone
  const groupSuppliers = (suppliersList) => {
    const groups = {};
    
    suppliersList.forEach(supplier => {
      // Create a unique key based on name, company, address, phone
      // Using empty string for null/undefined values
      const name = supplier.name || '';
      const company = supplier.company || '';
      const address = supplier.address || '';
      const phone = supplier.phone || '';
      
      const key = `${name}|${company}|${address}|${phone}`.toLowerCase();
      
      if (!groups[key]) {
        groups[key] = {
          id: `group-${key}`,
          name: supplier.name,
          company: supplier.company,
          address: supplier.address,
          phone: supplier.phone,
          count: 0,
          suppliers: [],
          totalItems: 0
        };
      }
      
      groups[key].count++;
      groups[key].suppliers.push(supplier);
      
      // Count total items for this supplier
      const supplierItems = items.filter(item => item.supplier_id === supplier.id);
      groups[key].totalItems += supplierItems.length;
    });
    
    // Convert to array and sort by count (highest first)
    const groupedArray = Object.values(groups).sort((a, b) => b.count - a.count);
    setGroupedSuppliers(groupedArray);
    setFilteredGroups(groupedArray);
  };

  // Filter groups based on search term
  const filterGroups = () => {
    if (!searchTerm.trim()) {
      setFilteredGroups(groupedSuppliers);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = groupedSuppliers.filter(group => {
      switch (searchField) {
        case 'name':
          return group.name?.toLowerCase().includes(term);
        case 'company':
          return group.company?.toLowerCase().includes(term);
        case 'address':
          return group.address?.toLowerCase().includes(term);
        case 'phone':
          return group.phone?.toLowerCase().includes(term);
        case 'all':
        default:
          return (
            (group.name?.toLowerCase().includes(term)) ||
            (group.company?.toLowerCase().includes(term)) ||
            (group.address?.toLowerCase().includes(term)) ||
            (group.phone?.toLowerCase().includes(term))
          );
      }
    });

    setFilteredGroups(filtered);
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setSearchField('all');
  };

  // View group details
  const viewGroupDetails = (group) => {
    setSelectedGroup(group);
    setShowSupplierDetails(true);
  };

  // Close popup
  const closePopup = () => {
    setShowSupplierDetails(false);
    setSelectedGroup(null);
  };

  // Get item count for a specific supplier
  const getItemCountForSupplier = (supplierId) => {
    return items.filter(item => item.supplier_id === supplierId).length;
  };

  // Export to Excel/CSV
  const exportToExcel = () => {
    // Create CSV content with only Name, Company, Address, Phone
    let csvContent = "Name,Company,Address,Phone\n";
    
    filteredGroups.forEach(group => {
      const row = [
        `"${group.name || ''}"`,
        `"${group.company || ''}"`,
        `"${group.address || ''}"`,
        `"${group.phone || ''}"`
      ].join(',');
      csvContent += row + '\n';
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `supplier_list_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to PDF
  const exportToPDF = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    // Generate HTML content for PDF with only Name, Company, Address, Phone
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Supplier List Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background-color: #0f172a; color: #e2e8f0; }
          h1 { color: #4f46e5; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #2563eb; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #334155; }
          tr:nth-child(even) { background-color: #1e293b; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .date { color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Supplier List Report</h1>
          <div class="date">Generated: ${new Date().toLocaleDateString()}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Address</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    filteredGroups.forEach(group => {
      htmlContent += `
        <tr>
          <td>${group.name || ''}</td>
          <td>${group.company || ''}</td>
          <td>${group.address || ''}</td>
          <td>${group.phone || ''}</td>
        </tr>
      `;
    });
    
    htmlContent += `
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGroups = filteredGroups.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Styles - Updated to match Dashboard theme
  const styles = {
    container: {
      padding: "24px",
      backgroundColor: "#0f172a",  // Dark navy background like dashboard
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
      marginTop: "4px",
      fontSize: "14px",
    },
    searchContainer: {
      display: "flex",
      gap: "15px",
      marginBottom: "25px",
      alignItems: "center",
      flexWrap: "wrap",
    },
    searchInputWrapper: {
      flex: "1",
      minWidth: "300px",
      display: "flex",
      gap: "8px",
    },
    searchInput: {
      flex: "1",
      padding: "12px 16px",
      backgroundColor: "#1e293b",
      border: "1px solid #334155",
      borderRadius: "8px",
      color: "#fff",
      fontSize: "14px",
      outline: "none",
      transition: "all 0.2s",
    },
    searchSelect: {
      padding: "12px 16px",
      backgroundColor: "#1e293b",
      border: "1px solid #334155",
      borderRadius: "8px",
      color: "#fff",
      fontSize: "14px",
      outline: "none",
      cursor: "pointer",
      minWidth: "120px",
    },
    searchButton: {
      padding: "12px 24px",
      backgroundColor: "#2563eb",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.2s",
      boxShadow: "0 4px 10px rgba(37, 99, 235, 0.3)",
    },
    clearButton: {
      padding: "12px 24px",
      backgroundColor: "#1e293b",
      color: "#fff",
      border: "1px solid #334155",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    exportButtons: {
      display: "flex",
      gap: "10px",
      marginLeft: "auto",
    },
    exportButton: {
      padding: "10px 20px",
      borderRadius: "8px",
      backgroundColor: "#1e293b",
      color: "#e2e8f0",
      border: "1px solid #334155",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    excelButton: {
      backgroundColor: "#10b981",
      color: "#fff",
      border: "none",
    },
    pdfButton: {
      backgroundColor: "#ef4444",
      color: "#fff",
      border: "none",
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
      minWidth: "800px",
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
    badge: {
      display: "inline-block",
      padding: "4px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "500",
    },
    repeatBadge: {
      backgroundColor: "rgba(245, 158, 11, 0.2)",
      color: "#f59e0b",
    },
    viewButton: {
      background: "#2563eb",
      border: "none",
      color: "#fff",
      padding: "6px 12px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "500",
      transition: "all 0.2s",
    },
    emptyState: {
      textAlign: "center",
      padding: "50px",
      color: "#94a3b8",
      fontStyle: "italic",
      fontSize: "15px",
    },
    // Pagination Styles
    paginationContainer: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "25px",
      padding: "15px 0",
    },
    paginationInfo: {
      color: "#94a3b8",
      fontSize: "14px",
    },
    paginationControls: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
    paginationButton: {
      padding: "8px 14px",
      backgroundColor: "#1e293b",
      border: "1px solid #334155",
      borderRadius: "6px",
      color: "#e2e8f0",
      fontSize: "13px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.2s",
      minWidth: "40px",
    },
    activePageButton: {
      backgroundColor: "#2563eb",
      borderColor: "#2563eb",
      color: "#fff",
    },
    disabledButton: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    // Popup Styles
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
      width: "800px",
      maxWidth: "90%",
      maxHeight: "85vh",
      overflowY: "auto",
      border: "1px solid #334155",
      position: "relative",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
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
      letterSpacing: "-0.5px",
    },
    popupSubtitle: {
      color: "#94a3b8",
      fontSize: "13px",
      marginTop: "5px",
    },
    closeButton: {
      position: "absolute",
      top: "25px",
      right: "25px",
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
    popupButtonGroup: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
      marginTop: "30px",
      paddingTop: "20px",
      borderTop: "1px solid #334155",
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
      transition: "all 0.2s",
      boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
    },
    infoGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "20px",
      marginBottom: "20px",
      padding: "20px",
      backgroundColor: "#0f172a",
      borderRadius: "12px",
    },
    infoItem: {
      marginBottom: "10px",
    },
    infoLabel: {
      color: "#94a3b8",
      fontSize: "12px",
      textTransform: "uppercase",
      marginBottom: "4px",
    },
    infoValue: {
      color: "#fff",
      fontSize: "16px",
      fontWeight: "500",
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
    refreshButton: {
      padding: "10px 20px",
      backgroundColor: "#1e293b",
      color: "#e2e8f0",
      border: "1px solid #334155",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      transition: "all 0.2s",
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
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Calculate statistics
  const totalSuppliers = suppliers.length;
  const showingResults = filteredGroups.length;

  // Render popup for group details
  const renderGroupDetailsPopup = () => {
    if (!showSupplierDetails || !selectedGroup) return null;

    return (
      <div style={styles.overlay} onClick={closePopup}>
        <div style={styles.popup} onClick={(e) => e.stopPropagation()}>
          <button 
            style={styles.closeButton}
            onClick={closePopup}
          >
            ✕
          </button>
          
          <div style={styles.popupHeader}>
            <h2 style={styles.popupTitle}>Supplier Group Details</h2>
            <div style={styles.popupSubtitle}>
              Found {selectedGroup.count} suppliers with matching details
            </div>
          </div>
          
          <div style={styles.infoGrid}>
            <div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Name</div>
                <div style={styles.infoValue}>{selectedGroup.name || '—'}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Company</div>
                <div style={styles.infoValue}>{selectedGroup.company || '—'}</div>
              </div>
            </div>
            <div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Phone</div>
                <div style={styles.infoValue}>{selectedGroup.phone || '—'}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Address</div>
                <div style={styles.infoValue}>{selectedGroup.address || '—'}</div>
              </div>
            </div>
          </div>
          
          <h3 style={{ color: '#fff', margin: '20px 0 15px', fontSize: '18px' }}>Individual Entries</h3>
          
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Items Count</th>
                  <th style={styles.th}>Created At</th>
                </tr>
              </thead>
              <tbody>
                {selectedGroup.suppliers.map((supplier, index) => (
                  <tr key={supplier.id}>
                    <td style={styles.td}>
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>#{index + 1}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: '500', color: '#fff' }}>{supplier.name}</span>
                    </td>
                    <td style={styles.td}>{supplier.email || '—'}</td>
                    <td style={styles.td}>
                      <span>{getItemCountForSupplier(supplier.id)} items</span>
                    </td>
                    <td style={styles.td}>
                      {supplier.created_at ? new Date(supplier.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.popupButtonGroup}>
            <button 
              onClick={closePopup}
              style={styles.submitButton}
            >
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
          <h1 style={styles.title}>Supplier List</h1>
          <div style={styles.subtitle}>View all suppliers</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            style={{...styles.exportButton, ...styles.excelButton}}
            onClick={exportToExcel}
          >
            📊 Export Excel
          </button>
          <button 
            style={{...styles.exportButton, ...styles.pdfButton}}
            onClick={exportToPDF}
          >
            📄 Export PDF
          </button>
          <button 
            style={styles.refreshButton}
            onClick={fetchSuppliers}
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>

      {/* Summary Stats Line */}
      <div style={{ marginBottom: "20px", color: "#94a3b8", fontSize: "14px" }}>
        Total Suppliers: {totalSuppliers} | Showing {showingResults} group{showingResults !== 1 ? 's' : ''}
      </div>

      {/* Search Section */}
      <div style={styles.searchContainer}>
        <div style={styles.searchInputWrapper}>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            style={styles.searchSelect}
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          >
            <option value="all">All Fields</option>
            <option value="name">Name</option>
            <option value="company">Company</option>
            <option value="address">Address</option>
            <option value="phone">Phone</option>
          </select>
        </div>
        <button
          style={styles.searchButton}
          onClick={filterGroups}
        >
          🔍 Search
        </button>
        {searchTerm && (
          <button
            style={styles.clearButton}
            onClick={clearSearch}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Main Table */}
      <div style={{ backgroundColor: "#1e293b", padding: "30px", borderRadius: "16px", border: "1px solid #334155" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: "600" }}>
            Suppliers List
          </h2>
          {searchTerm && (
            <span style={{ color: "#94a3b8", fontSize: "14px" }}>
              Found {showingResults} result{showingResults !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        {loading && filteredGroups.length === 0 ? (
          <div style={styles.emptyState}>Loading suppliers...</div>
        ) : filteredGroups.length > 0 ? (
          <>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Company</th>
                    <th style={styles.th}>Address</th>
                    <th style={styles.th}>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {currentGroups.map(group => (
                    <tr key={group.id}>
                      <td style={styles.td}>
                        <span style={{ fontWeight: '500', color: '#fff' }}>{group.name || '—'}</span>
                      </td>
                      <td style={styles.td}>
                        <span>{group.company || '—'}</span>
                      </td>
                      <td style={styles.td}>{group.address || '—'}</td>
                      <td style={styles.td}>{group.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredGroups.length > itemsPerPage && (
              <div style={styles.paginationContainer}>
                <div style={styles.paginationInfo}>
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredGroups.length)} of {filteredGroups.length} entries
                </div>
                <div style={styles.paginationControls}>
                  <button
                    style={{
                      ...styles.paginationButton,
                      ...(currentPage === 1 ? styles.disabledButton : {})
                    }}
                    onClick={prevPage}
                    disabled={currentPage === 1}
                  >
                    ←
                  </button>
                  
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        style={{
                          ...styles.paginationButton,
                          ...(currentPage === pageNum ? styles.activePageButton : {})
                        }}
                        onClick={() => paginate(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    style={{
                      ...styles.paginationButton,
                      ...(currentPage === totalPages ? styles.disabledButton : {})
                    }}
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={styles.emptyState}>
            {searchTerm ? 'No suppliers match your search criteria.' : 'No suppliers found.'}
          </div>
        )}
      </div>

      {/* Popups */}
      {renderGroupDetailsPopup()}
    </div>
  );
};

export default SupplierDuplicatePage;