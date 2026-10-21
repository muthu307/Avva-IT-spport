import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

const Company = () => {
  const [companyInfo, setCompanyInfo] = useState({
    // Basic Information
    name: '',
    address: '',
    phone: '',
    alternate_phone: '',
    email: '',
    
    // GST Information
    gst_number: '',
    
    // Registration Details
    registration_date: '',
    
    // Banking Details
    bank_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_branch: '',
    upi_id: '',
    
    // Logo
    logo: null,
    logo_preview: '',
    logo_filename: '',
    logo_mime_type: '',
    
    // Additional
    notes: '',
    is_active: true
  });
  
  const [companies, setCompanies] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Load saved data from API on component mount
  useEffect(() => {
    fetchCompanies();
  }, [currentPage, searchTerm]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      let response;
      
      if (searchTerm.trim() === '') {
        // Fetch with pagination
        response = await api.get(`/companies/?page=${currentPage}&limit=${itemsPerPage}`);
      } else {
        // Search with pagination
        response = await api.get(`/companies/search?q=${encodeURIComponent(searchTerm)}&page=${currentPage}&limit=${itemsPerPage}`);
      }
      
      if (response.data) {
        const companiesData = response.data.companies || response.data;
        // Process logo data for each company
        const processedCompanies = companiesData.map(company => ({
          ...company,
          logo_url: company.logo_data ? `data:${company.logo_mime_type || 'image/jpeg'};base64,${company.logo_data}` : null
        }));
        setCompanies(processedCompanies);
        setTotalItems(response.data.total || (Array.isArray(response.data) ? response.data.length : 0));
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      showNotification(error.response?.data?.error || 'Error fetching companies', 'error');
    } finally {
      setLoading(false);
    }
  };

  const searchCompanies = async (term) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page when searching
    if (term.trim() === '') {
      fetchCompanies();
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.get(`/companies/search?q=${encodeURIComponent(term)}&page=1&limit=${itemsPerPage}`);
      if (response.data) {
        const companiesData = response.data.companies || response.data;
        const processedCompanies = companiesData.map(company => ({
          ...company,
          logo_url: company.logo_data ? `data:${company.logo_mime_type || 'image/jpeg'};base64,${company.logo_data}` : null
        }));
        setCompanies(processedCompanies);
        setTotalItems(response.data.total || (Array.isArray(response.data) ? response.data.length : 0));
      }
    } catch (error) {
      console.error('Error searching companies:', error);
      showNotification(error.response?.data?.error || 'Error searching companies', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCompanyInfo(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (value === '' ? null : value)
    }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        showNotification('Please select a valid image file (JPEG, PNG, GIF, WEBP)', 'error');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Logo size should be less than 5MB', 'error');
        return;
      }
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyInfo(prev => ({
          ...prev,
          logo: file,
          logo_preview: reader.result,
          logo_filename: file.name,
          logo_mime_type: file.type
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setCompanyInfo(prev => ({
      ...prev,
      logo: null,
      logo_preview: '',
      logo_filename: '',
      logo_mime_type: ''
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const showNotification = (message, type = 'success') => {
    setSaveStatus({ message, type });
    setTimeout(() => {
      setSaveStatus({ message: '', type: '' });
    }, 3000);
  };

  const handleSave = async () => {
    // Validate required fields
    if (!companyInfo.name || !companyInfo.name.trim()) {
      showNotification('Please fill in Company Name', 'error');
      return;
    }
    if (!companyInfo.address || !companyInfo.address.trim()) {
      showNotification('Please fill in Address', 'error');
      return;
    }
    if (!companyInfo.phone || !companyInfo.phone.trim()) {
      showNotification('Please fill in Phone Number', 'error');
      return;
    }
    
    try {
      setLoading(true);
      setUploadProgress(0);
      
      // Prepare data for API
      const formData = new FormData();
      formData.append('name', companyInfo.name.trim());
      formData.append('address', companyInfo.address.trim());
      formData.append('phone', companyInfo.phone.trim());
      formData.append('alternate_phone', companyInfo.alternate_phone?.trim() || '');
      formData.append('email', companyInfo.email?.trim() || '');
      formData.append('gst_number', companyInfo.gst_number?.trim() || '');
      formData.append('registration_date', companyInfo.registration_date || '');
      formData.append('bank_name', companyInfo.bank_name?.trim() || '');
      formData.append('bank_account_number', companyInfo.bank_account_number?.trim() || '');
      formData.append('bank_ifsc', companyInfo.bank_ifsc?.trim() || '');
      formData.append('bank_branch', companyInfo.bank_branch?.trim() || '');
      formData.append('upi_id', companyInfo.upi_id?.trim() || '');
      formData.append('notes', companyInfo.notes?.trim() || '');
      formData.append('is_active', companyInfo.is_active);
      
      if (companyInfo.logo instanceof File) {
        formData.append('logo', companyInfo.logo);
      } else if (editingId && companyInfo.remove_logo) {
        formData.append('remove_logo', 'true');
      }
      
      let response;
      if (editingId) {
        // Update existing company
        response = await api.put(`/companies/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percentCompleted);
            }
          }
        });
        if (response.status === 200) {
          showNotification('Company information updated successfully!', 'success');
          await fetchCompanies();
        }
      } else {
        // Create new company
        response = await api.post('/companies/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percentCompleted);
            }
          }
        });
        if (response.status === 200 || response.status === 201) {
          showNotification('Company information saved successfully!', 'success');
          await fetchCompanies();
        }
      }
      
      // Reset form and close popup
      resetForm();
      setIsPopupOpen(false);
      setIsViewing(false);
      setEditingId(null);
      setIsEditing(false);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error saving company:', error);
      console.error('Error response:', error.response?.data);
      showNotification(error.response?.data?.error || 'Error saving company information', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (company) => {
    // Convert logo_data to preview URL if exists
    let logoPreview = '';
    if (company.logo_data) {
      logoPreview = `data:${company.logo_mime_type || 'image/jpeg'};base64,${company.logo_data}`;
    }
    
    setCompanyInfo({
      // Basic Information
      name: company.name || '',
      address: company.address || '',
      phone: company.phone || '',
      alternate_phone: company.alternate_phone || '',
      email: company.email || '',
      
      // GST Information
      gst_number: company.gst_number || '',
      
      // Registration Details
      registration_date: company.registration_date ? company.registration_date.split('T')[0] : '',
      
      // Banking Details
      bank_name: company.bank_name || '',
      bank_account_number: company.bank_account_number || '',
      bank_ifsc: company.bank_ifsc || '',
      bank_branch: company.bank_branch || '',
      upi_id: company.upi_id || '',
      
      // Logo
      logo: null,
      logo_preview: logoPreview,
      logo_filename: company.logo_filename || '',
      logo_mime_type: company.logo_mime_type || '',
      remove_logo: false,
      
      // Additional
      notes: company.notes || '',
      is_active: company.is_active !== undefined ? company.is_active : true
    });
    setEditingId(company.id);
    setIsEditing(true);
    setIsViewing(false);
    setIsPopupOpen(true);
    setActiveTab('basic');
  };

  const handleView = (company) => {
    // Convert logo_data to preview URL if exists
    let logoPreview = '';
    if (company.logo_data) {
      logoPreview = `data:${company.logo_mime_type || 'image/jpeg'};base64,${company.logo_data}`;
    }
    
    setCompanyInfo({
      // Basic Information
      name: company.name || '',
      address: company.address || '',
      phone: company.phone || '',
      alternate_phone: company.alternate_phone || '',
      email: company.email || '',
      
      // GST Information
      gst_number: company.gst_number || '',
      
      // Registration Details
      registration_date: company.registration_date ? company.registration_date.split('T')[0] : '',
      
      // Banking Details
      bank_name: company.bank_name || '',
      bank_account_number: company.bank_account_number || '',
      bank_ifsc: company.bank_ifsc || '',
      bank_branch: company.bank_branch || '',
      upi_id: company.upi_id || '',
      
      // Logo
      logo: null,
      logo_preview: logoPreview,
      logo_filename: company.logo_filename || '',
      logo_mime_type: company.logo_mime_type || '',
      
      // Additional
      notes: company.notes || '',
      is_active: company.is_active !== undefined ? company.is_active : true
    });
    setEditingId(company.id);
    setIsEditing(false);
    setIsViewing(true);
    setIsPopupOpen(true);
    setActiveTab('basic');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this company?')) {
      try {
        setLoading(true);
        await api.delete(`/companies/${id}`);
        showNotification('Company deleted successfully!', 'success');
        await fetchCompanies();
      } catch (error) {
        console.error('Error deleting company:', error);
        showNotification(error.response?.data?.error || 'Error deleting company', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRestore = async (id) => {
    try {
      setLoading(true);
      await api.post(`/companies/${id}/restore`);
      showNotification('Company restored successfully!', 'success');
      await fetchCompanies();
    } catch (error) {
      console.error('Error restoring company:', error);
      showNotification(error.response?.data?.error || 'Error restoring company', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openPopup = () => {
    resetForm();
    setEditingId(null);
    setIsEditing(false);
    setIsViewing(false);
    setIsPopupOpen(true);
    setActiveTab('basic');
  };

  const closePopup = () => {
    setIsPopupOpen(false);
    resetForm();
    setEditingId(null);
    setIsEditing(false);
    setIsViewing(false);
    setUploadProgress(0);
  };

  const resetForm = () => {
    setCompanyInfo({
      name: '',
      address: '',
      phone: '',
      alternate_phone: '',
      email: '',
      gst_number: '',
      registration_date: '',
      bank_name: '',
      bank_account_number: '',
      bank_ifsc: '',
      bank_branch: '',
      upi_id: '',
      logo: null,
      logo_preview: '',
      logo_filename: '',
      logo_mime_type: '',
      notes: '',
      is_active: true
    });
  };

  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < Math.ceil(totalItems / itemsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

  // Navigation handlers for form tabs
  const handleNextTab = () => {
    // Only validate in edit/add mode
    if (!isViewing && activeTab === 'basic') {
      if (!companyInfo.name || !companyInfo.name.trim()) {
        showNotification('Please fill in Company Name', 'error');
        return;
      }
      if (!companyInfo.address || !companyInfo.address.trim()) {
        showNotification('Please fill in Address', 'error');
        return;
      }
      if (!companyInfo.phone || !companyInfo.phone.trim()) {
        showNotification('Please fill in Phone Number', 'error');
        return;
      }
      setActiveTab('tax');
    } else if (activeTab === 'tax') {
      setActiveTab('banking');
    } else if (activeTab === 'basic' && isViewing) {
      setActiveTab('tax');
    }
  };

  const handlePrevTab = () => {
    if (activeTab === 'tax') {
      setActiveTab('basic');
    } else if (activeTab === 'banking') {
      setActiveTab('tax');
    }
  };

  return (
    <div className="company-wrapper">
      <div className="company-container">
        <div className="header-section">
          <h1>Company Management System</h1>
          <button onClick={openPopup} className="btn-add">
            <span className="plus-icon">+</span> Add New Company
          </button>
        </div>

        {/* Search Bar */}
        <div className="search-section">
          <div className="search-container">
            <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search companies by name, GST, phone, or email..."
              value={searchTerm}
              onChange={(e) => searchCompanies(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button onClick={() => searchCompanies('')} className="clear-search">
                ×
              </button>
            )}
          </div>
        </div>

        {/* Companies Table */}
        <div className="table-container">
          <table className="companies-table">
            <thead>
              <tr>
                <th>Logo</th>
                <th>#</th>
                <th>Company Name</th>
                <th>GST Number</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && companies.length === 0 ? (
                <tr>
                  <td colSpan="8" className="loading-cell">
                    <div className="loader"></div>
                    <p>Loading companies...</p>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-cell">
                    <div className="empty-state">
                      <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p>No companies found</p>
                      <button onClick={openPopup} className="btn-add-small">
                        Add your first company
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                companies.map((company, index) => (
                  <tr key={company.id}>
                    <td className="logo-cell">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="company-logo-thumb" />
                      ) : (
                        <div className="logo-placeholder">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="company-name">{company.name}</td>
                    <td>{company.gst_number || '-'}</td>
                    <td>{company.phone}</td>
                    <td>{company.email || '-'}</td>
                    <td>
                      <span className={`status-badge ${company.is_active ? 'active' : 'inactive'}`}>
                        {company.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="actions">
                      <button 
                        onClick={() => handleView(company)} 
                        className="btn-view-table"
                        title="View"
                      >
                        <svg className="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleEdit(company)} 
                        className="btn-edit-table"
                        title="Edit"
                      >
                        <svg className="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {!company.is_active ? (
                        <button 
                          onClick={() => handleRestore(company.id)} 
                          className="btn-restore-table"
                          title="Restore"
                        >
                          <svg className="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      ) : null}
                      <button 
                        onClick={() => handleDelete(company.id)} 
                        className="btn-delete-table"
                        title="Delete Permanently"
                      >
                        <svg className="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalItems > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} companies
              </div>
              <div className="pagination-controls">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  <svg className="pagination-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                
                <div className="pagination-numbers">
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`dots-${index}`} className="pagination-dots">...</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                      >
                        {page}
                      </button>
                    )
                  ))}
                </div>
                
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next
                  <svg className="pagination-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Popup Form Modal with Navigation Buttons */}
        {isPopupOpen && (
          <div className="popup-overlay" onClick={closePopup}>
            <div className="popup-content" onClick={(e) => e.stopPropagation()}>
              <div className="popup-header">
                <h2>
                  {isViewing ? 'View Company Details' : (editingId ? 'Edit Company' : 'Add New Company')}
                </h2>
                <button onClick={closePopup} className="close-btn">&times;</button>
              </div>
              
              {/* Notification inside popup */}
              {saveStatus.message && (
                <div className={`popup-notification ${saveStatus.type}`}>
                  {saveStatus.message}
                </div>
              )}
              
              {/* Progress Indicator */}
              <div className="progress-indicator">
                <div className={`progress-step ${activeTab === 'basic' ? 'active' : (activeTab === 'tax' || activeTab === 'banking') && !isViewing ? 'completed' : ''}`}>
                  <div className="step-number">{(activeTab === 'tax' || activeTab === 'banking') && !isViewing ? '✓' : '1'}</div>
                  <div className="step-label">Basic Info</div>
                </div>
                <div className={`progress-line ${(activeTab === 'tax' || activeTab === 'banking') && !isViewing ? 'completed' : ''}`}></div>
                <div className={`progress-step ${activeTab === 'tax' ? 'active' : (activeTab === 'banking' && !isViewing ? 'completed' : '')}`}>
                  <div className="step-number">{activeTab === 'banking' && !isViewing ? '✓' : '2'}</div>
                  <div className="step-label">Tax Info</div>
                </div>
                <div className={`progress-line ${activeTab === 'banking' && !isViewing ? 'completed' : ''}`}></div>
                <div className={`progress-step ${activeTab === 'banking' ? 'active' : ''}`}>
                  <div className="step-number">3</div>
                  <div className="step-label">Banking</div>
                </div>
              </div>
              
              <div className="popup-body">
                {/* Basic Information Tab */}
                {activeTab === 'basic' && (
                  <>
                    {/* Logo Upload Section */}
                    <div className="form-group logo-upload-section">
                      <label>Company Logo</label>
                      <div className="logo-upload-container">
                        {companyInfo.logo_preview ? (
                          <div className="logo-preview">
                            <img src={companyInfo.logo_preview} alt="Company Logo" className="logo-preview-img" />
                            {!isViewing && (
                              <button type="button" onClick={removeLogo} className="remove-logo-btn" title="Remove logo">
                                ×
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="logo-upload-placeholder">
                            <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p>No logo uploaded</p>
                          </div>
                        )}
                        {!isViewing && (
                          <div className="logo-upload-buttons">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                              onChange={handleLogoChange}
                              style={{ display: 'none' }}
                              id="logo-upload"
                            />
                            <label htmlFor="logo-upload" className="upload-logo-btn">
                              <svg className="upload-icon-small" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              {companyInfo.logo_preview ? 'Change Logo' : 'Upload Logo'}
                            </label>
                            <small className="logo-hint">Max size: 5MB. Allowed: JPG, PNG, GIF, WEBP</small>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Company Name {!isViewing && '*'}</label>
                      <input
                        type="text"
                        name="name"
                        value={companyInfo.name}
                        onChange={handleInputChange}
                        placeholder="Enter company name"
                        required
                        disabled={isViewing}
                        className={isViewing ? 'readonly-input' : ''}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Address {!isViewing && '*'}</label>
                      <textarea
                        name="address"
                        value={companyInfo.address}
                        onChange={handleInputChange}
                        placeholder="Enter company address"
                        rows="3"
                        required
                        disabled={isViewing}
                        className={isViewing ? 'readonly-input' : ''}
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Phone {!isViewing && '*'}</label>
                        <input
                          type="tel"
                          name="phone"
                          value={companyInfo.phone}
                          onChange={handleInputChange}
                          placeholder="Enter phone number"
                          required
                          disabled={isViewing}
                          className={isViewing ? 'readonly-input' : ''}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Alternate Phone</label>
                        <input
                          type="tel"
                          name="alternate_phone"
                          value={companyInfo.alternate_phone}
                          onChange={handleInputChange}
                          placeholder="Enter alternate phone"
                          disabled={isViewing}
                          className={isViewing ? 'readonly-input' : ''}
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={companyInfo.email}
                        onChange={handleInputChange}
                        placeholder="Enter email address"
                        disabled={isViewing}
                        className={isViewing ? 'readonly-input' : ''}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Registration Date</label>
                      <input
                        type="date"
                        name="registration_date"
                        value={companyInfo.registration_date}
                        onChange={handleInputChange}
                        disabled={isViewing}
                        className={isViewing ? 'readonly-input' : ''}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Notes</label>
                      <textarea
                        name="notes"
                        value={companyInfo.notes}
                        onChange={handleInputChange}
                        placeholder="Additional notes about the company"
                        rows="2"
                        disabled={isViewing}
                        className={isViewing ? 'readonly-input' : ''}
                      />
                    </div>
                  </>
                )}
                
                {/* Tax Info Tab */}
                {activeTab === 'tax' && (
                  <>
                    <div className="form-group">
                      <label>GST Number</label>
                      <input
                        type="text"
                        name="gst_number"
                        value={companyInfo.gst_number}
                        onChange={handleInputChange}
                        placeholder="Enter GST number (e.g., 22AAAAA0000A1Z5)"
                        disabled={isViewing}
                        className={isViewing ? 'readonly-input' : ''}
                      />
                      {!isViewing && (
                        <small style={{color: '#718096', fontSize: '0.75rem', marginTop: '4px', display: 'block'}}>
                          Format: 15 characters (e.g., 22AAAAA0000A1Z5)
                        </small>
                      )}
                    </div>
                  </>
                )}
                
                {/* Banking Tab */}
                {activeTab === 'banking' && (
                  <>
                    <div className="form-group">
                      <label>Bank Name</label>
                      <input
                        type="text"
                        name="bank_name"
                        value={companyInfo.bank_name}
                        onChange={handleInputChange}
                        placeholder="Enter bank name"
                        disabled={isViewing}
                        className={isViewing ? 'readonly-input' : ''}
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Account Number</label>
                        <input
                          type="text"
                          name="bank_account_number"
                          value={companyInfo.bank_account_number}
                          onChange={handleInputChange}
                          placeholder="Enter account number"
                          disabled={isViewing}
                          className={isViewing ? 'readonly-input' : ''}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>IFSC Code</label>
                        <input
                          type="text"
                          name="bank_ifsc"
                          value={companyInfo.bank_ifsc}
                          onChange={handleInputChange}
                          placeholder="Enter IFSC code"
                          disabled={isViewing}
                          className={isViewing ? 'readonly-input' : ''}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Bank Branch</label>
                        <input
                          type="text"
                          name="bank_branch"
                          value={companyInfo.bank_branch}
                          onChange={handleInputChange}
                          placeholder="Enter bank branch"
                          disabled={isViewing}
                          className={isViewing ? 'readonly-input' : ''}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>UPI ID</label>
                        <input
                          type="text"
                          name="upi_id"
                          value={companyInfo.upi_id}
                          onChange={handleInputChange}
                          placeholder="Enter UPI ID (e.g., company@bank)"
                          disabled={isViewing}
                          className={isViewing ? 'readonly-input' : ''}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="popup-footer">
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={companyInfo.is_active}
                      onChange={handleInputChange}
                      disabled={isViewing}
                    />
                    Active Company
                  </label>
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="upload-progress">
                    <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                    <span>{uploadProgress}%</span>
                  </div>
                )}
                <div className="footer-buttons">
                  <button onClick={closePopup} className="btn-cancel">
                    {isViewing ? 'Close' : 'Cancel'}
                  </button>
                  {!isViewing && (
                    <div className="nav-buttons">
                      {activeTab !== 'basic' && (
                        <button onClick={handlePrevTab} className="btn-prev">
                          <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          Previous
                        </button>
                      )}
                      
                      {activeTab !== 'banking' ? (
                        <button onClick={handleNextTab} className="btn-next">
                          Next
                          <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ) : (
                        <button onClick={handleSave} className="btn-save" disabled={loading}>
                          {loading ? 'Saving...' : (editingId ? 'Update' : 'Save')}
                        </button>
                      )}
                    </div>
                  )}
                  {isViewing && (
                    <div className="nav-buttons">
                      {activeTab !== 'basic' && (
                        <button onClick={handlePrevTab} className="btn-prev">
                          <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          Previous
                        </button>
                      )}
                      {activeTab !== 'banking' && (
                        <button onClick={handleNextTab} className="btn-next">
                          Next
                          <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .company-wrapper {
          width: 100%;
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #2e1a5e 100%);
          padding: 40px 20px;
        }

        .company-container {
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .header-section {
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        h1 {
          color: white;
          font-size: 2rem;
          font-weight: 600;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          background: linear-gradient(135deg, #a78bfa, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
        }

        .btn-add {
          background: linear-gradient(135deg, #a855f7 0%, #ec489a 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }

        .btn-add:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(168, 85, 247, 0.4);
        }

        .plus-icon {
          font-size: 1.2rem;
          font-weight: bold;
        }

        .search-section {
          margin-bottom: 20px;
        }

        .search-container {
          position: relative;
          max-width: 400px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
          color: #9ca3af;
        }

        .search-input {
          width: 100%;
          padding: 12px 40px 12px 40px;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          background: #1e293b;
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          transition: all 0.3s;
          border: 1px solid #334155;
        }

        .search-input:focus {
          outline: none;
          border-color: #a855f7;
          box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
        }

        .search-input::placeholder {
          color: #64748b;
        }

        .clear-search {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #94a3b8;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        .clear-search:hover {
          background: #334155;
          color: white;
        }

        .table-container {
          background: #1e293b;
          border-radius: 12px;
          overflow-x: auto;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          animation: fadeIn 0.5s ease;
        }

        .companies-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        .companies-table thead {
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          color: white;
          border-bottom: 2px solid #a855f7;
        }

        .companies-table th {
          padding: 16px;
          text-align: left;
          font-weight: 600;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #c084fc;
        }

        .companies-table td {
          padding: 16px;
          border-bottom: 1px solid #334155;
          color: #e2e8f0;
        }

        .companies-table tbody tr:hover {
          background-color: #334155;
          transition: background-color 0.2s;
        }

        .logo-cell {
          width: 50px;
        }

        .company-logo-thumb {
          width: 40px;
          height: 40px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid #a855f7;
        }

        .logo-placeholder {
          width: 40px;
          height: 40px;
          background: #334155;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
        }

        .logo-placeholder svg {
          width: 24px;
          height: 24px;
        }

        .company-name {
          font-weight: 600;
          color: #f0f9ff;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge.active {
          background-color: #10b981;
          color: white;
        }

        .status-badge.inactive {
          background-color: #6b7280;
          color: white;
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .btn-view-table, .btn-edit-table, .btn-delete-table, .btn-restore-table {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
        }

        .btn-view-table {
          color: #60a5fa;
        }

        .btn-view-table:hover {
          background-color: #60a5fa20;
          transform: scale(1.1);
        }

        .btn-edit-table {
          color: #34d399;
        }

        .btn-edit-table:hover {
          background-color: #34d39920;
          transform: scale(1.1);
        }

        .btn-restore-table {
          color: #60a5fa;
        }

        .btn-restore-table:hover {
          background-color: #60a5fa20;
          transform: scale(1.1);
        }

        .btn-delete-table {
          color: #f87171;
        }

        .btn-delete-table:hover {
          background-color: #f8717120;
          transform: scale(1.1);
        }

        .action-icon {
          width: 18px;
          height: 18px;
        }

        .loading-cell, .empty-cell {
          text-align: center;
          padding: 60px 20px !important;
        }

        .loader {
          border: 3px solid #334155;
          border-top: 3px solid #a855f7;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        .empty-state {
          text-align: center;
        }

        .empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          color: #475569;
        }

        .empty-state p {
          color: #94a3b8;
          margin-bottom: 16px;
          font-size: 1rem;
        }

        .btn-add-small {
          background: linear-gradient(135deg, #a855f7 0%, #ec489a 100%);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .btn-add-small:hover {
          transform: translateY(-1px);
        }

        /* Progress Indicator Styles */
        .progress-indicator {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 24px 16px;
          background: #0f172a;
          border-bottom: 1px solid #334155;
        }

        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          position: relative;
        }

        .step-number {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #334155;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.3s ease;
          margin-bottom: 8px;
        }

        .progress-step.active .step-number {
          background: linear-gradient(135deg, #a855f7 0%, #ec489a 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
        }

        .progress-step.completed .step-number {
          background: #10b981;
          color: white;
        }

        .step-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #94a3b8;
          text-align: center;
        }

        .progress-step.active .step-label {
          color: #c084fc;
          font-weight: 600;
        }

        .progress-step.completed .step-label {
          color: #10b981;
        }

        .progress-line {
          flex: 1;
          height: 2px;
          background: #334155;
          margin: 0 8px;
          position: relative;
          top: -12px;
        }

        .progress-line.completed {
          background: #10b981;
        }

        /* Popup Notification */
        .popup-notification {
          margin: 16px 24px 0;
          padding: 12px;
          border-radius: 8px;
          text-align: center;
          animation: slideDown 0.3s ease;
        }

        .popup-notification.success {
          background-color: #059669;
          color: white;
          border: 1px solid #10b981;
        }

        .popup-notification.error {
          background-color: #dc2626;
          color: white;
          border: 1px solid #ef4444;
        }

        /* Logo Upload Styles */
        .logo-upload-section {
          margin-bottom: 24px;
        }

        .logo-upload-container {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .logo-preview {
          position: relative;
          width: 100px;
          height: 100px;
        }

        .logo-preview-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 12px;
          border: 2px solid #a855f7;
        }

        .remove-logo-btn {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #dc2626;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s;
        }

        .remove-logo-btn:hover {
          background: #ef4444;
          transform: scale(1.1);
        }

        .logo-upload-placeholder {
          width: 100px;
          height: 100px;
          background: #334155;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px dashed #a855f7;
        }

        .logo-upload-placeholder svg {
          width: 32px;
          height: 32px;
          color: #94a3b8;
          margin-bottom: 8px;
        }

        .logo-upload-placeholder p {
          font-size: 0.7rem;
          color: #94a3b8;
          margin: 0;
        }

        .logo-upload-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .upload-logo-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #a855f7 0%, #ec489a 100%);
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
          border: none;
        }

        .upload-logo-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
        }

        .upload-icon-small {
          width: 16px;
          height: 16px;
        }

        .logo-hint {
          font-size: 0.7rem;
          color: #94a3b8;
        }

        /* Upload Progress */
        .upload-progress {
          flex: 1;
          margin: 0 16px;
          position: relative;
          background: #334155;
          border-radius: 4px;
          overflow: hidden;
          height: 8px;
        }

        .progress-bar {
          background: linear-gradient(90deg, #a855f7, #ec489a);
          height: 100%;
          transition: width 0.3s ease;
        }

        .upload-progress span {
          position: absolute;
          right: 0;
          top: -20px;
          font-size: 0.7rem;
          color: #c084fc;
        }

        /* Pagination Styles */
        .pagination-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-top: 1px solid #334155;
          background: #0f172a;
          border-radius: 0 0 12px 12px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .pagination-info {
          color: #94a3b8;
          font-size: 0.875rem;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pagination-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          color: #cbd5e1;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #334155;
          border-color: #a855f7;
          color: white;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-icon {
          width: 16px;
          height: 16px;
        }

        .pagination-numbers {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pagination-number {
          min-width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          color: #cbd5e1;
          transition: all 0.2s;
        }

        .pagination-number:hover {
          background: #334155;
          border-color: #a855f7;
          color: white;
        }

        .pagination-number.active {
          background: linear-gradient(135deg, #a855f7 0%, #ec489a 100%);
          color: white;
          border-color: #a855f7;
        }

        .pagination-dots {
          padding: 0 4px;
          color: #64748b;
        }

        /* Popup Styles */
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        .popup-content {
          background: #1e293b;
          border-radius: 16px;
          width: 90%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          animation: slideUp 0.3s ease;
          border: 1px solid #334155;
        }

        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #334155;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          color: white;
          border-radius: 16px 16px 0 0;
        }

        .popup-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0;
          background: linear-gradient(135deg, #c084fc, #f472b6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #94a3b8;
          transition: transform 0.2s;
          line-height: 1;
        }

        .close-btn:hover {
          transform: scale(1.1);
          color: white;
        }

        .popup-body {
          padding: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #cbd5e1;
          font-size: 0.9rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #334155;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s;
          font-family: inherit;
          background: #0f172a;
          color: white;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #a855f7;
          box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
        }

        .readonly-input {
          background-color: #334155;
          cursor: not-allowed;
          opacity: 0.8;
        }

        .popup-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-top: 1px solid #334155;
          background: #0f172a;
          border-radius: 0 0 16px 16px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .checkbox-group {
          margin: 0;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          cursor: pointer;
          margin: 0;
          color: #cbd5e1;
        }

        .checkbox-group input {
          width: auto;
          cursor: pointer;
        }

        .footer-buttons {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .nav-buttons {
          display: flex;
          gap: 12px;
        }

        .btn-cancel, .btn-save, .btn-prev, .btn-next {
          padding: 10px 24px;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel {
          background: #334155;
          color: #cbd5e1;
        }

        .btn-cancel:hover {
          background: #475569;
          color: white;
        }

        .btn-prev {
          background: #334155;
          color: #cbd5e1;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-prev:hover {
          background: #475569;
          transform: translateX(-2px);
        }

        .btn-next {
          background: linear-gradient(135deg, #a855f7 0%, #ec489a 100%);
          color: white;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-next:hover {
          transform: translateX(2px);
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
        }

        .btn-save {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .btn-save:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .nav-icon {
          width: 18px;
          height: 18px;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .company-wrapper {
            padding: 20px 16px;
          }
          
          .header-section {
            flex-direction: column;
            text-align: center;
          }
          
          h1 {
            font-size: 1.5rem;
          }
          
          .form-row {
            grid-template-columns: 1fr;
          }
          
          .popup-footer {
            flex-direction: column;
          }
          
          .footer-buttons {
            width: 100%;
            justify-content: center;
          }
          
          .nav-buttons {
            width: 100%;
          }
          
          .btn-cancel, .btn-save, .btn-prev, .btn-next {
            flex: 1;
            justify-content: center;
          }

          .pagination-container {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .pagination-controls {
            justify-content: center;
          }

          .progress-indicator {
            padding: 16px;
          }
          
          .step-label {
            font-size: 0.65rem;
          }
          
          .step-number {
            width: 28px;
            height: 28px;
            font-size: 0.75rem;
          }

          .logo-upload-container {
            flex-direction: column;
            align-items: center;
          }

          .logo-upload-buttons {
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Company;