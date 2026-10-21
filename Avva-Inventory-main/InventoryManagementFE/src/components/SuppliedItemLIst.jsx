import React, { useState, useEffect } from 'react';

const ItemsListPage = () => {
  // State for items
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter states
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date filters
  const [dateFilterType, setDateFilterType] = useState('all'); // 'all', 'month', 'date', 'range'
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // PDF export state
  const [exportLoading, setExportLoading] = useState(false);
  
  // Base URL for API
  const BASE_URL = 'http://localhost:5000';

  // Get current date for defaults
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');

  // Months for dropdown
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  // Years for dropdown (last 5 years to next year)
  const years = [];
  for (let i = currentYear - 5; i <= currentYear + 1; i++) {
    years.push(i);
  }

  // Fetch suppliers and items on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/suppliers-with-items`, {
        credentials: 'include',
        mode: 'cors'
      });
      
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      if (data.success) {
        setSuppliers(data.suppliers);
        
        // Extract all items from suppliers with created_at dates
        const allItems = [];
        data.suppliers.forEach(supplier => {
          if (supplier.items && supplier.items.length > 0) {
            const itemsWithSupplier = supplier.items.map(item => ({
              ...item,
              supplier_name: supplier.name,
              supplier_company: supplier.company,
              supplier_id: supplier.id,
              // Use created_at if available, otherwise use current date for demo
              created_at: item.created_at || new Date().toISOString()
            }));
            allItems.push(...itemsWithSupplier);
          }
        });
        setItems(allItems);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get full URL for attachment
  const getAttachmentUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${BASE_URL}${path}`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // Check if item matches date filters
  const matchesDateFilter = (item) => {
    if (dateFilterType === 'all') return true;
    
    const itemDate = new Date(item.created_at);
    
    switch (dateFilterType) {
      case 'month':
        if (!selectedMonth || !selectedYear) return true;
        return (
          itemDate.getMonth() + 1 === parseInt(selectedMonth) &&
          itemDate.getFullYear() === parseInt(selectedYear)
        );
      
      case 'date':
        if (!selectedDate) return true;
        const filterDate = new Date(selectedDate);
        return (
          itemDate.getDate() === filterDate.getDate() &&
          itemDate.getMonth() === filterDate.getMonth() &&
          itemDate.getFullYear() === filterDate.getFullYear()
        );
      
      case 'range':
        if (!dateRangeStart || !dateRangeEnd) return true;
        const start = new Date(dateRangeStart);
        const end = new Date(dateRangeEnd);
        end.setHours(23, 59, 59, 999); // Include the entire end day
        return itemDate >= start && itemDate <= end;
      
      default:
        return true;
    }
  };

  // Filter items based on selected filters
  const getFilteredItems = () => {
    return items.filter(item => {
      // Supplier filter
      if (selectedSupplier !== 'all' && item.supplier_id !== parseInt(selectedSupplier)) {
        return false;
      }
      
      // Date filter
      if (!matchesDateFilter(item)) {
        return false;
      }
      
      // Search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          item.name?.toLowerCase().includes(searchLower) ||
          item.model?.toLowerCase().includes(searchLower) ||
          item.type?.toLowerCase().includes(searchLower) ||
          item.id?.toString().includes(searchLower)
        );
      }
      
      return true;
    });
  };

  // Sort items by date (newest first)
  const getSortedItems = () => {
    return getFilteredItems().sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });
  };

  // Get current items for pagination
  const getCurrentItems = () => {
    const sorted = getSortedItems();
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return sorted.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Get total pages
  const totalPages = Math.ceil(getSortedItems().length / itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSupplier, searchTerm, dateFilterType, selectedMonth, selectedYear, selectedDate, dateRangeStart, dateRangeEnd]);

  // Export to PDF function
  const exportToPDF = () => {
    setExportLoading(true);
    
    const filteredItems = getSortedItems();
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    // Generate HTML content for PDF with dark theme
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Items Inventory Report</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 30px; 
            background-color: #0f172a;
            color: #e2e8f0;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
          }
          h1 { 
            color: #ffffff; 
            margin: 0 0 10px 0;
            font-size: 28px;
          }
          .date { 
            color: #94a3b8; 
            font-size: 14px;
            margin-bottom: 10px;
          }
          .filters-applied {
            background-color: #1e293b;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #2563eb;
          }
          .filters-applied h3 {
            margin: 0 0 10px 0;
            color: #ffffff;
            font-size: 16px;
          }
          .filter-tag {
            background-color: #334155;
            color: #94a3b8;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            display: inline-block;
            margin: 0 5px 5px 0;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            font-size: 12px;
          }
          th { 
            background-color: #2563eb; 
            color: white; 
            padding: 12px; 
            text-align: left; 
            font-weight: 600;
          }
          td { 
            padding: 10px; 
            border-bottom: 1px solid #334155; 
            color: #e2e8f0;
          }
          tr:nth-child(even) { 
            background-color: #1e293b; 
          }
          .footer {
            margin-top: 30px;
            text-align: right;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #334155;
            padding-top: 10px;
          }
          .summary {
            display: flex;
            justify-content: space-between;
            background-color: #1e293b;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .summary-item {
            text-align: center;
          }
          .summary-label {
            font-size: 12px;
            color: #94a3b8;
          }
          .summary-value {
            font-size: 20px;
            font-weight: 600;
            color: #2563eb;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📦 Items Inventory Report</h1>
          <div class="date">Generated: ${new Date().toLocaleString()}</div>
        </div>
        
        <div class="summary">
          <div class="summary-item">
            <div class="summary-label">Total Items</div>
            <div class="summary-value">${filteredItems.length}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Value</div>
            <div class="summary-value">₹${filteredItems.reduce((sum, item) => sum + (item.buy_price || 0), 0).toFixed(2)}</div>
          </div>
        </div>
        
        <div class="filters-applied">
          <h3>📊 Applied Filters:</h3>
    `;
    
    // Add filter tags
    if (selectedSupplier !== 'all') {
      const supplier = suppliers.find(s => s.id === parseInt(selectedSupplier));
      htmlContent += `<span class="filter-tag">Supplier: ${supplier?.company || 'Selected'}</span>`;
    }
    if (dateFilterType === 'month' && selectedMonth && selectedYear) {
      const monthName = months.find(m => m.value === selectedMonth)?.label;
      htmlContent += `<span class="filter-tag">Month: ${monthName} ${selectedYear}</span>`;
    }
    if (dateFilterType === 'date' && selectedDate) {
      htmlContent += `<span class="filter-tag">Date: ${new Date(selectedDate).toLocaleDateString()}</span>`;
    }
    if (dateFilterType === 'range' && dateRangeStart && dateRangeEnd) {
      htmlContent += `<span class="filter-tag">From: ${new Date(dateRangeStart).toLocaleDateString()} To: ${new Date(dateRangeEnd).toLocaleDateString()}</span>`;
    }
    if (searchTerm) {
      htmlContent += `<span class="filter-tag">Search: "${searchTerm}"</span>`;
    }
    if (dateFilterType === 'all' && selectedSupplier === 'all' && !searchTerm) {
      htmlContent += `<span class="filter-tag">All Items</span>`;
    }
    
    htmlContent += `
        </div>
        
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Model</th>
              <th>Type</th>
              <th>Warrenty</th>
              <th>Buy Price (₹)</th>
              <th>Added Date</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    filteredItems.forEach(item => {
      htmlContent += `
        <tr>
          <td>${item.id || '—'}</td>
          <td><strong>${item.name || ''}</strong></td>
          <td>${item.model || ''}</td>
          <td>${item.type || '—'}</td>
          <td>${item.watts || 0}W</td>
          <td>₹${item.buy_price?.toFixed(2) || '0.00'}</td>
          <td>${formatDate(item.created_at)}</td>
        </tr>
      `;
    });
    
    htmlContent += `
          </tbody>
        </table>
        
        <div class="footer">
          Report generated on ${new Date().toLocaleString()} | Items Inventory System
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; background-color: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer;">
            🖨️ Print / Save as PDF
          </button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      setExportLoading(false);
    }, 1000);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedSupplier('all');
    setSearchTerm('');
    setDateFilterType('all');
    setSelectedMonth('');
    setSelectedYear('');
    setSelectedDate('');
    setDateRangeStart('');
    setDateRangeEnd('');
  };

  // Dark theme styles matching Dashboard
  const styles = {
    container: {
      padding: '24px',
      backgroundColor: '#0f172a',
      minHeight: '100vh',
      color: '#e2e8f0',
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    header: {
      marginBottom: '32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '16px',
    },
    titleSection: {
      flex: 1,
    },
    title: {
      fontSize: '28px',
      fontWeight: '600',
      margin: '0 0 8px 0',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    titleIcon: {
      fontSize: '32px',
    },
    subtitle: {
      color: '#94a3b8',
      fontSize: '14px',
      margin: 0,
    },
    exportButton: {
      padding: '10px 20px',
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)',
      transition: 'all 0.2s ease',
    },
    filtersCard: {
      backgroundColor: '#1e293b',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      border: '1px solid #334155',
    },
    filtersTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#ffffff',
      margin: '0 0 20px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    filterRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '20px',
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    label: {
      fontSize: '13px',
      fontWeight: '500',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    select: {
      padding: '10px 12px',
      border: '1px solid #334155',
      borderRadius: '8px',
      fontSize: '14px',
      color: '#fff',
      backgroundColor: '#0f172a',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      outline: 'none',
    },
    input: {
      padding: '10px 12px',
      border: '1px solid #334155',
      borderRadius: '8px',
      fontSize: '14px',
      color: '#fff',
      backgroundColor: '#0f172a',
      transition: 'all 0.2s ease',
      outline: 'none',
    },
    dateFilterToggle: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      flexWrap: 'wrap',
    },
    dateToggleButton: {
      padding: '8px 16px',
      border: '1px solid #334155',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      backgroundColor: 'transparent',
      color: '#94a3b8',
      transition: 'all 0.2s ease',
    },
    dateToggleButtonActive: {
      backgroundColor: '#2563eb',
      color: 'white',
      borderColor: '#2563eb',
    },
    clearFiltersButton: {
      padding: '10px 20px',
      backgroundColor: 'transparent',
      color: '#94a3b8',
      border: '1px solid #334155',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s ease',
    },
    tableContainer: {
      backgroundColor: '#1e293b',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      border: '1px solid #334155',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    th: {
      textAlign: 'left',
      padding: '16px',
      backgroundColor: '#0f172a',
      color: '#94a3b8',
      fontSize: '13px',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      borderBottom: '2px solid #334155',
    },
    td: {
      padding: '16px',
      borderBottom: '1px solid #334155',
      color: '#e2e8f0',
      fontSize: '14px',
    },
    tr: {
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    attachmentLink: {
      color: '#3b82f6',
      textDecoration: 'none',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      backgroundColor: '#334155',
      borderRadius: '4px',
      width: 'fit-content',
    },
    dateBadge: {
      fontSize: '11px',
      color: '#94a3b8',
      marginTop: '4px',
    },
    pagination: {
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      marginTop: '24px',
      flexWrap: 'wrap',
    },
    pageButton: {
      padding: '8px 12px',
      border: '1px solid #334155',
      backgroundColor: '#1e293b',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      color: '#e2e8f0',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      minWidth: '40px',
    },
    pageButtonActive: {
      backgroundColor: '#2563eb',
      color: 'white',
      borderColor: '#2563eb',
    },
    pageButtonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px',
      color: '#94a3b8',
      backgroundColor: '#1e293b',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      border: '1px solid #334155',
    },
    loadingOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    loadingSpinner: {
      width: '50px',
      height: '50px',
      border: '4px solid #334155',
      borderTopColor: '#2563eb',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    filterBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '4px 12px',
      backgroundColor: '#334155',
      borderRadius: '20px',
      fontSize: '12px',
      color: '#94a3b8',
      marginRight: '10px',
      marginBottom: '10px',
    },
  };

  const filteredItems = getSortedItems();
  const currentItems = getCurrentItems();

  return (
    <div style={styles.container}>
      {/* Loading Overlay */}
      {(loading || exportLoading) && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingSpinner}></div>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>
            <span style={styles.titleIcon}>📋</span>
            Items Inventory
          </h1>
          <p style={styles.subtitle}>Track and manage all items</p>
        </div>
        
        <button 
          style={styles.exportButton}
          onClick={exportToPDF}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
        >
          <span>📄</span>
          Export PDF Report
        </button>
      </div>

      {/* Filters Card */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersTitle}>
          <span>🔍</span>
          Filter Items
        </div>

        {/* Date Filter Toggle */}
        <div style={styles.dateFilterToggle}>
          <button
            style={{
              ...styles.dateToggleButton,
              ...(dateFilterType === 'all' ? styles.dateToggleButtonActive : {})
            }}
            onClick={() => setDateFilterType('all')}
          >
            All Time
          </button>
          <button
            style={{
              ...styles.dateToggleButton,
              ...(dateFilterType === 'month' ? styles.dateToggleButtonActive : {})
            }}
            onClick={() => setDateFilterType('month')}
          >
            By Month
          </button>
          <button
            style={{
              ...styles.dateToggleButton,
              ...(dateFilterType === 'date' ? styles.dateToggleButtonActive : {})
            }}
            onClick={() => setDateFilterType('date')}
          >
            By Date
          </button>
          <button
            style={{
              ...styles.dateToggleButton,
              ...(dateFilterType === 'range' ? styles.dateToggleButtonActive : {})
            }}
            onClick={() => setDateFilterType('range')}
          >
            Date Range
          </button>
        </div>

        {/* Filter Rows */}
        <div style={styles.filterRow}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Supplier</label>
            <select 
              style={styles.select}
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#334155'}
            >
              <option value="all">All Suppliers</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.company} ({supplier.name})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Search</label>
            <input
              type="text"
              style={styles.input}
              placeholder="Search by ID, name, model, type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#334155'}
            />
          </div>
        </div>

        {/* Dynamic Date Filters */}
        {dateFilterType === 'month' && (
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Month</label>
              <select
                style={styles.select}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="">Select Month</option>
                {months.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Year</label>
              <select
                style={styles.select}
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="">Select Year</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {dateFilterType === 'date' && (
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Select Date</label>
              <input
                type="date"
                style={styles.input}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {dateFilterType === 'range' && (
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>From Date</label>
              <input
                type="date"
                style={styles.input}
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
              />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.label}>To Date</label>
              <input
                type="date"
                style={styles.input}
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
          {selectedSupplier !== 'all' && (
            <span style={styles.filterBadge}>
              Supplier: {suppliers.find(s => s.id === parseInt(selectedSupplier))?.company}
            </span>
          )}
          {dateFilterType === 'month' && selectedMonth && selectedYear && (
            <span style={styles.filterBadge}>
              Month: {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </span>
          )}
          {dateFilterType === 'date' && selectedDate && (
            <span style={styles.filterBadge}>
              Date: {new Date(selectedDate).toLocaleDateString()}
            </span>
          )}
          {dateFilterType === 'range' && dateRangeStart && dateRangeEnd && (
            <span style={styles.filterBadge}>
              Range: {new Date(dateRangeStart).toLocaleDateString()} - {new Date(dateRangeEnd).toLocaleDateString()}
            </span>
          )}
          {searchTerm && (
            <span style={styles.filterBadge}>
              Search: "{searchTerm}"
            </span>
          )}
          {(selectedSupplier !== 'all' || searchTerm || dateFilterType !== 'all') && (
            <button
              style={styles.clearFiltersButton}
              onClick={clearFilters}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#334155';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#94a3b8';
              }}
            >
              ✕ Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Items Table */}
      {currentItems.length > 0 ? (
        <>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Model</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Warrenty</th>
                  <th style={styles.th}>Buy Price (₹)</th>
                  <th style={styles.th}>Added Date</th>
                  <th style={styles.th}>Attachment</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map(item => (
                  <tr 
                    key={item.id} 
                    style={styles.tr}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={styles.td}>
                      <strong style={{ color: '#3b82f6' }}>#{item.id}</strong>
                    </td>
                    <td style={styles.td}>
                      <strong style={{ color: '#ffffff' }}>{item.name}</strong>
                    </td>
                    <td style={styles.td}>
                      {item.model || '—'}
                    </td>
                    <td style={styles.td}>
                      {item.type || '—'}
                    </td>
                    <td style={styles.td}>
                      {item.watts ? `${item.watts}W` : '—'}
                    </td>
                    <td style={styles.td}>
                      <strong style={{ color: '#10b981', fontSize: '16px' }}>
                        ₹{item.buy_price?.toFixed(2) || '0.00'}
                      </strong>
                    </td>
                    <td style={styles.td}>
                      <div>{formatDate(item.created_at)}</div>
                    </td>
                    <td style={styles.td}>
                      {item.attachment ? (
                        <a 
                          href={getAttachmentUrl(item.attachment)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.attachmentLink}
                          onClick={(e) => e.stopPropagation()}
                        >
                          📎 View
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
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
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) e.target.style.backgroundColor = '#334155';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#1e293b';
                }}
              >
                ←
              </button>
              
              {[...Array(totalPages)].map((_, i) => {
                const pageNumber = i + 1;
                // Show first, last, and pages around current
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
                      onClick={() => setCurrentPage(pageNumber)}
                      onMouseEnter={(e) => {
                        if (currentPage !== pageNumber) {
                          e.target.style.backgroundColor = '#334155';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== pageNumber) {
                          e.target.style.backgroundColor = '#1e293b';
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
                  return <span key={pageNumber} style={{ color: '#94a3b8' }}>...</span>;
                }
                return null;
              })}
              
              <button
                style={{
                  ...styles.pageButton,
                  ...(currentPage === totalPages ? styles.pageButtonDisabled : {})
                }}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                onMouseEnter={(e) => {
                  if (currentPage !== totalPages) e.target.style.backgroundColor = '#334155';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#1e293b';
                }}
              >
                →
              </button>
            </div>
          )}

          {/* Results info */}
          <div style={{ textAlign: 'center', marginTop: '20px', color: '#94a3b8', fontSize: '13px' }}>
            Showing {currentItems.length} of {filteredItems.length} items
          </div>
        </>
      ) : (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📭</div>
          <h3 style={{ color: '#ffffff', marginBottom: '10px' }}>No Items Found</h3>
          <p style={{ color: '#94a3b8' }}>
            {searchTerm || selectedSupplier !== 'all' || dateFilterType !== 'all'
              ? 'No items match your current filters. Try adjusting your search criteria.'
              : 'No items have been added yet. Add some items to get started.'}
          </p>
        </div>
      )}

      {/* Add keyframe animation for spinner */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default ItemsListPage;