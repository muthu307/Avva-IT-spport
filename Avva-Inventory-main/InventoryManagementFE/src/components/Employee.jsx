// EmployeeManager.js - Updated component with password field
import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const EmployeeManager = () => {
  // State for employee list
  const [employees, setEmployees] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    password: '',
    phone_number: '',
    department: '',
    designation: '',
    date_of_joining: '',
    user_type: '',
    current_company: '',
    company_id: '',
    aadhar_card_number: '',
    pan_card_number: '',
    address: '',
    emergency_contact: '',
    blood_group: '',
    marital_status: ''
  });
  
  // File upload state
  const [aadharFile, setAadharFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [existingFiles, setExistingFiles] = useState({
    aadhar_attachment: null,
    pan_attachment: null
  });

  // Sorting & Searching State
  const [sortField, setSortField] = useState('employee_id'); // 'employee_id' | 'full_name' | 'department'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedEmployees = employees
    .filter((emp) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (emp.employee_id && String(emp.employee_id).toLowerCase().includes(q)) ||
        (emp.full_name && emp.full_name.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q)) ||
        (emp.email && emp.email.toLowerCase().includes(q)) ||
        (emp.designation && emp.designation.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (typeof valA === 'string') valA = valA.trim().toLowerCase();
      if (typeof valB === 'string') valB = valB.trim().toLowerCase();

      if (sortField === 'employee_id') {
        const comp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        return sortOrder === 'asc' ? comp : -comp;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Fetch all employees, user types, and companies on component mount
  useEffect(() => {
    fetchEmployees();
    fetchUserTypes();
    fetchCompanies();
  }, []);

  // Fetch employees from API
  const fetchEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/employees');
      setEmployees(response.data);
    } catch (err) {
      setError('Error fetching employees: ' + err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user types from the User Type Manager API
  const fetchUserTypes = async () => {
    try {
      const response = await api.get('/user-types');
      const userTypeNames = response.data.map(item => item.name);
      setUserTypes(userTypeNames);
      
      if (userTypeNames.length > 0 && !formData.user_type) {
        setFormData(prev => ({ ...prev, user_type: userTypeNames[0] }));
      }
    } catch (err) {
      console.error('Error fetching user types:', err);
      setUserTypes(['admin', 'employee', 'manager']);
      if (!formData.user_type) {
        setFormData(prev => ({ ...prev, user_type: 'employee' }));
      }
    }
  };

  // Fetch companies from API
  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies/list');
      console.log('Companies loaded:', response.data);
      setCompanies(response.data);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setCompanies([]);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'company_id') {
      const selectedCompany = companies.find(c => c.id.toString() === value);
      if (selectedCompany) {
        setFormData(prev => ({
          ...prev,
          company_id: value,
          current_company: selectedCompany.name
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          company_id: value,
          current_company: ''
        }));
      }
    }
  };

  // Handle manual company name input
  const handleCompanyNameChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      current_company: value,
      company_id: ''
    }));
  };

  // Handle file changes
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (type === 'aadhar') {
      setAadharFile(file);
    } else if (type === 'pan') {
      setPanFile(file);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      employee_id: '',
      full_name: '',
      email: '',
      password: '',
      phone_number: '',
      department: '',
      designation: '',
      date_of_joining: '',
      user_type: userTypes.length > 0 ? userTypes[0] : 'employee',
      current_company: '',
      company_id: '',
      aadhar_card_number: '',
      pan_card_number: '',
      address: '',
      emergency_contact: '',
      blood_group: '',
      marital_status: ''
    });
    setAadharFile(null);
    setPanFile(null);
    setEditingId(null);
    setExistingFiles({ aadhar_attachment: null, pan_attachment: null });
    setShowPassword(false);
    setShowEditPassword(false);
  };

  // Open form modal for add
  const openAddModal = () => {
    resetForm();
    setEditingId(null);
    setShowFormModal(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email) {
      alert('Please fill in all required fields (Full Name and Email)');
      return;
    }
    
    // Only require password for new employees
    if (!editingId && !formData.password) {
      alert('Please enter a password for the new employee');
      return;
    }

    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (formData[key] && key !== 'employee_id') {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      if (aadharFile) {
        formDataToSend.append('aadhar_attachment', aadharFile);
      }
      if (panFile) {
        formDataToSend.append('pan_attachment', panFile);
      }
      
      if (editingId && formData.employee_id) {
        formDataToSend.append('employee_id', formData.employee_id);
      }
      
      const response = editingId
        ? await api.put(`/employees/${editingId}`, formDataToSend, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await api.post('/employees', formDataToSend, { headers: { 'Content-Type': 'multipart/form-data' } });
      const savedEmployee = response.data;
      
      if (editingId) {
        setEmployees(employees.map(emp => emp.id === editingId ? savedEmployee : emp));
      } else {
        setEmployees([savedEmployee, ...employees]);
      }
      
      resetForm();
      setShowFormModal(false);
      alert(`Employee ${editingId ? 'updated' : 'added'} successfully!`);
      
    } catch (err) {
      alert('Error: ' + err.message);
      console.error('Save error:', err);
    } finally {
      setLoading(false);
    }
  };

  // View employee details
  const viewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };

  // Edit employee
  const editEmployee = async (employee) => {
    setEditingId(employee.id);
    setFormData({
      employee_id: employee.employee_id,
      full_name: employee.full_name,
      email: employee.email,
      password: '', // Don't show existing password
      phone_number: employee.phone_number || '',
      department: employee.department || '',
      designation: employee.designation || '',
      date_of_joining: employee.date_of_joining || '',
      user_type: employee.user_type || (userTypes.length > 0 ? userTypes[0] : 'employee'),
      current_company: employee.current_company || '',
      company_id: employee.company_id || '',
      aadhar_card_number: employee.aadhar_card_number || '',
      pan_card_number: employee.pan_card_number || '',
      address: employee.address || '',
      emergency_contact: employee.emergency_contact || '',
      blood_group: employee.blood_group || '',
      marital_status: employee.marital_status || ''
    });
    setExistingFiles({
      aadhar_attachment: employee.aadhar_attachment,
      pan_attachment: employee.pan_attachment
    });
    setShowFormModal(true);
  };

  // Confirm delete
  const confirmDelete = (id) => {
    setEmployeeToDelete(id);
    setShowDeleteConfirm(true);
  };

  // Delete employee
  const deleteEmployee = async () => {
    if (!employeeToDelete) return;
    
    setLoading(true);
    try {
      await api.delete(`/employees/${employeeToDelete}`);
      
      setEmployees(employees.filter(emp => emp.id !== employeeToDelete));
      alert('Employee deleted successfully!');
      
      if (editingId === employeeToDelete) {
        resetForm();
      }
      
      setShowDeleteConfirm(false);
      setEmployeeToDelete(null);
    } catch (err) {
      alert('Error: ' + err.message);
      console.error('Delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Download attachment
  const downloadAttachment = async (filename, type) => {
    if (!filename) return;
    
    try {
      const response = await api.get(`/download/${filename}`, { responseType: 'blob' });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Download error:', err);
      alert(`Error downloading ${type} document: ${err.message}`);
    }
  };

  // Close modals
  const closeFormModal = () => {
    setShowFormModal(false);
    resetForm();
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedEmployee(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Employee Management System</h1>
          <button onClick={openAddModal} style={styles.addButton}>
            + Add New Employee
          </button>
        </div>
        
        {error && (
          <div style={styles.errorMessage}>
            {error}
            <button onClick={() => setError('')} style={styles.closeButton}>×</button>
          </div>
        )}
        
        <div style={styles.tableContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
            <h2 style={{ ...styles.subtitle, margin: 0 }}>Employee List ({filteredAndSortedEmployees.length})</h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Search ID, Name, Dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: '#1e293b',
                  color: '#fff',
                  border: '1px solid #334155',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  minWidth: '220px'
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Sort By:</span>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                  style={{
                    background: '#1e293b',
                    color: '#38bdf8',
                    border: '1px solid #334155',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="employee_id">Employee ID</option>
                  <option value="full_name">Name</option>
                  <option value="department">Department</option>
                </select>

                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  style={{
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid #334155',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                  title="Toggle Sort Order (Ascending / Descending)"
                >
                  {sortOrder === 'asc' ? '▲ Asc' : '▼ Desc'}
                </button>
              </div>
            </div>
          </div>

          {loading && employees.length === 0 ? (
            <p style={styles.loadingMessage}>Loading...</p>
          ) : filteredAndSortedEmployees.length === 0 ? (
            <p style={styles.emptyMessage}>No employees match your search or filter criteria.</p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th
                      onClick={() => handleSort('employee_id')}
                      style={{ ...styles.tableHeader, cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by Employee ID"
                    >
                      Emp ID {sortField === 'employee_id' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th
                      onClick={() => handleSort('full_name')}
                      style={{ ...styles.tableHeader, cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by Name"
                    >
                      Name {sortField === 'full_name' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th style={styles.tableHeader}>Email</th>
                    <th
                      onClick={() => handleSort('department')}
                      style={{ ...styles.tableHeader, cursor: 'pointer', userSelect: 'none' }}
                      title="Click to sort by Department"
                    >
                      Department {sortField === 'department' ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th style={styles.tableHeader}>Company</th>
                    <th style={styles.tableHeader}>User Type</th>
                    <th style={styles.tableHeader}>Phone</th>
                    <th style={styles.tableHeader}>DOJ</th>
                    <th style={styles.tableHeader}>Documents</th>
                    <th style={styles.tableHeader}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedEmployees.map((employee) => (
                    <tr key={employee.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>{employee.employee_id}</td>
                      <td style={styles.tableCell}>
                        <strong style={styles.whiteText}>{employee.full_name}</strong>
                        {employee.blood_group && (
                          <div style={styles.smallText}>Blood: {employee.blood_group}</div>
                        )}
                      </td>
                      <td style={styles.tableCell}>{employee.email}</td>
                      <td style={styles.tableCell}>{employee.department || '-'}</td>
                      <td style={styles.tableCell}>
                        <span style={styles.companyBadge}>
                          {employee.current_company || '-'}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={styles.userTypeBadge}>
                          {employee.user_type || 'N/A'}
                        </span>
                      </td>
                      <td style={styles.tableCell}>{employee.phone_number || '-'}</td>
                      <td style={styles.tableCell}>{employee.date_of_joining || '-'}</td>
                      <td style={styles.tableCell}>
                        {employee.aadhar_attachment && (
                          <button
                            onClick={() => downloadAttachment(employee.aadhar_attachment, 'aadhar')}
                            style={styles.docButton}
                          >
                            Aadhar
                          </button>
                        )}
                        {employee.pan_attachment && (
                          <button
                            onClick={() => downloadAttachment(employee.pan_attachment, 'pan')}
                            style={styles.docButton}
                          >
                            PAN
                          </button>
                        )}
                        {!employee.aadhar_attachment && !employee.pan_attachment && '-'}
                      </td>
                      <td style={styles.tableCell}>
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => viewEmployee(employee)}
                            style={{...styles.actionButton, ...styles.viewButton}}
                          >
                            View
                          </button>
                          <button
                            onClick={() => editEmployee(employee)}
                            style={{...styles.actionButton, ...styles.editButton}}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => confirmDelete(employee.id)}
                            style={{...styles.actionButton, ...styles.deleteButton}}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Employee Form Modal */}
      {showFormModal && (
        <div style={styles.modalOverlay} onClick={closeFormModal}>
          <div style={styles.modalLarge} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingId ? 'Edit Employee' : 'Add New Employee'}
              </h2>
              <button onClick={closeFormModal} style={styles.modalClose}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={styles.modalBody}>
                <div style={styles.formGrid}>
                  {/* Personal Information */}
                  <div style={styles.formSection}>
                    <h3 style={styles.sectionTitle}>Personal Information</h3>
                    
                    {editingId && (
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Employee ID</label>
                        <input
                          type="text"
                          name="employee_id"
                          value={formData.employee_id}
                          disabled
                          style={styles.input}
                        />
                      </div>
                    )}
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Full Name *</label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        style={styles.input}
                        required
                        placeholder="John Doe"
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        style={styles.input}
                        required
                        placeholder="john.doe@company.com"
                      />
                    </div>
                    
                    {/* Password Field with Eye Icon */}
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        {editingId ? 'Password (Leave blank to keep current)' : 'Password *'}
                      </label>
                      <div style={styles.passwordContainer}>
                        <input
                          type={editingId ? (showEditPassword ? 'text' : 'password') : (showPassword ? 'text' : 'password')}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          style={styles.passwordInput}
                          placeholder={editingId ? "Enter new password" : "Enter password"}
                        />
                        <button
                          type="button"
                          onClick={() => editingId ? setShowEditPassword(!showEditPassword) : setShowPassword(!showPassword)}
                          style={styles.eyeButton}
                        >
                          {editingId ? (showEditPassword ? '👁️' : '👁️‍🗨️') : (showPassword ? '👁️' : '👁️‍🗨️')}
                        </button>
                      </div>
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Phone Number</label>
                      <input
                        type="tel"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="+91 9876543210"
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Date of Joining</label>
                      <input
                        type="date"
                        name="date_of_joining"
                        value={formData.date_of_joining}
                        onChange={handleInputChange}
                        style={styles.input}
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Blood Group</label>
                      <select
                        name="blood_group"
                        value={formData.blood_group}
                        onChange={handleInputChange}
                        style={styles.input}
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Marital Status</label>
                      <select
                        name="marital_status"
                        value={formData.marital_status}
                        onChange={handleInputChange}
                        style={styles.input}
                      >
                        <option value="">Select Status</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Employment Details */}
                  <div style={styles.formSection}>
                    <h3 style={styles.sectionTitle}>Employment Details</h3>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Department</label>
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="Engineering, HR, Sales, etc."
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Designation</label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="Software Engineer, Manager, etc."
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Current Company</label>
                      <select
                        name="company_id"
                        value={formData.company_id}
                        onChange={handleInputChange}
                        style={styles.input}
                      >
                        <option value="">Select a company</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                      <small style={styles.helperText}>Or enter manually:</small>
                      <input
                        type="text"
                        name="current_company"
                        value={formData.current_company}
                        onChange={handleCompanyNameChange}
                        style={{...styles.input, marginTop: '8px'}}
                        placeholder="Enter company name manually"
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Address</label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        style={styles.textarea}
                        rows="3"
                        placeholder="Full address"
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Emergency Contact</label>
                      <input
                        type="text"
                        name="emergency_contact"
                        value={formData.emergency_contact}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="Name: Phone Number"
                      />
                    </div>
                  </div>
                  
                  {/* Document Details */}
                  <div style={styles.formSection}>
                    <h3 style={styles.sectionTitle}>Document Details</h3>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Aadhar Card Number</label>
                      <input
                        type="text"
                        name="aadhar_card_number"
                        value={formData.aadhar_card_number}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="XXXX-XXXX-XXXX"
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Aadhar Card Attachment</label>
                      <input
                        type="file"
                        onChange={(e) => handleFileChange(e, 'aadhar')}
                        style={styles.fileInput}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      {existingFiles.aadhar_attachment && (
                        <div style={styles.fileInfo}>
                          <span>Current: {existingFiles.aadhar_attachment}</span>
                          <button
                            type="button"
                            onClick={() => downloadAttachment(existingFiles.aadhar_attachment, 'aadhar')}
                            style={styles.downloadButton}
                          >
                            Download
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>PAN Card Number</label>
                      <input
                        type="text"
                        name="pan_card_number"
                        value={formData.pan_card_number}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="ABCDE1234F"
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>PAN Card Attachment</label>
                      <input
                        type="file"
                        onChange={(e) => handleFileChange(e, 'pan')}
                        style={styles.fileInput}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      {existingFiles.pan_attachment && (
                        <div style={styles.fileInfo}>
                          <span>Current: {existingFiles.pan_attachment}</span>
                          <button
                            type="button"
                            onClick={() => downloadAttachment(existingFiles.pan_attachment, 'pan')}
                            style={styles.downloadButton}
                          >
                            Download
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" onClick={closeFormModal} style={styles.cancelModalButton}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitModalButton} disabled={loading}>
                  {loading ? 'Saving...' : (editingId ? 'Update Employee' : 'Add Employee')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employee Modal */}
      {showViewModal && selectedEmployee && (
        <div style={styles.modalOverlay} onClick={closeViewModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Employee Details</h2>
              <button onClick={closeViewModal} style={styles.modalClose}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.detailSection}>
                <h3 style={styles.detailSectionTitle}>Personal Information</h3>
                <div style={styles.detailGrid}>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Employee ID:</label>
                    <span style={styles.detailValue}>{selectedEmployee.employee_id}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Full Name:</label>
                    <span style={styles.detailValue}>{selectedEmployee.full_name}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Email:</label>
                    <span style={styles.detailValue}>{selectedEmployee.email}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Phone Number:</label>
                    <span style={styles.detailValue}>{selectedEmployee.phone_number || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Date of Joining:</label>
                    <span style={styles.detailValue}>{formatDate(selectedEmployee.date_of_joining)}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>User Type:</label>
                    <span style={styles.detailValue}>{selectedEmployee.user_type || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Blood Group:</label>
                    <span style={styles.detailValue}>{selectedEmployee.blood_group || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Marital Status:</label>
                    <span style={styles.detailValue}>{selectedEmployee.marital_status || '-'}</span>
                  </div>
                </div>
              </div>

              <div style={styles.detailSection}>
                <h3 style={styles.detailSectionTitle}>Employment Details</h3>
                <div style={styles.detailGrid}>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Department:</label>
                    <span style={styles.detailValue}>{selectedEmployee.department || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Designation:</label>
                    <span style={styles.detailValue}>{selectedEmployee.designation || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Current Company:</label>
                    <span style={styles.detailValue}>{selectedEmployee.current_company || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Address:</label>
                    <span style={styles.detailValue}>{selectedEmployee.address || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Emergency Contact:</label>
                    <span style={styles.detailValue}>{selectedEmployee.emergency_contact || '-'}</span>
                  </div>
                </div>
              </div>

              <div style={styles.detailSection}>
                <h3 style={styles.detailSectionTitle}>Document Details</h3>
                <div style={styles.detailGrid}>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Aadhar Card Number:</label>
                    <span style={styles.detailValue}>{selectedEmployee.aadhar_card_number || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Aadhar Attachment:</label>
                    {selectedEmployee.aadhar_attachment ? (
                      <button
                        onClick={() => downloadAttachment(selectedEmployee.aadhar_attachment, 'aadhar')}
                        style={styles.modalDownloadButton}
                      >
                        Download Aadhar
                      </button>
                    ) : (
                      <span style={styles.detailValue}>-</span>
                    )}
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>PAN Card Number:</label>
                    <span style={styles.detailValue}>{selectedEmployee.pan_card_number || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>PAN Attachment:</label>
                    {selectedEmployee.pan_attachment ? (
                      <button
                        onClick={() => downloadAttachment(selectedEmployee.pan_attachment, 'pan')}
                        style={styles.modalDownloadButton}
                      >
                        Download PAN
                      </button>
                    ) : (
                      <span style={styles.detailValue}>-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={closeViewModal} style={styles.modalButton}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Confirm Delete</h2>
              <button onClick={() => setShowDeleteConfirm(false)} style={styles.modalClose}>×</button>
            </div>
            <div style={styles.modalBody}>
              <p style={styles.confirmMessage}>Are you sure you want to delete this employee?</p>
              <p style={styles.confirmWarning}>This action cannot be undone.</p>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowDeleteConfirm(false)} style={styles.cancelModalButton}>
                Cancel
              </button>
              <button onClick={deleteEmployee} style={styles.confirmDeleteButton}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Dark theme styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0e27',
    padding: '40px 20px',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
  },
  card: {
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#1a1f3e',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    padding: '30px',
    border: '1px solid #2a2f4a'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    borderBottom: '2px solid #2a2f4a',
    paddingBottom: '15px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0
  },
  addButton: {
    padding: '12px 24px',
    backgroundColor: '#4c9aff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  errorMessage: {
    backgroundColor: 'rgba(220, 53, 69, 0.2)',
    color: '#ff6b6b',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #dc3545'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#ff6b6b',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0 5px'
  },
  tableContainer: {
    marginTop: '20px'
  },
  subtitle: {
    fontSize: '24px',
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: '20px'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  loadingMessage: {
    textAlign: 'center',
    color: '#a0a5c0',
    padding: '40px',
    backgroundColor: '#0a0e27',
    borderRadius: '8px',
    fontSize: '16px'
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#a0a5c0',
    padding: '40px',
    backgroundColor: '#0a0e27',
    borderRadius: '8px',
    fontSize: '16px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#0a0e27',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
  },
  tableHeaderRow: {
    backgroundColor: '#0f132e',
    borderBottom: '2px solid #2a2f4a'
  },
  tableHeader: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#a0a5c0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  tableRow: {
    borderBottom: '1px solid #2a2f4a',
    transition: 'background-color 0.2s'
  },
  tableCell: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#e0e5f0'
  },
  whiteText: {
    color: '#ffffff'
  },
  smallText: {
    fontSize: '11px',
    color: '#a0a5c0',
    marginTop: '4px'
  },
  userTypeBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#4c9aff',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#ffffff'
  },
  companyBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#51cf66',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#ffffff'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  actionButton: {
    padding: '6px 12px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'opacity 0.2s'
  },
  viewButton: {
    backgroundColor: '#17a2b8',
    color: 'white'
  },
  editButton: {
    backgroundColor: '#4c9aff',
    color: 'white'
  },
  deleteButton: {
    backgroundColor: '#ff6b6b',
    color: 'white'
  },
  docButton: {
    padding: '4px 8px',
    backgroundColor: '#51cf66',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
    margin: '2px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease'
  },
  modal: {
    backgroundColor: '#1a1f3e',
    borderRadius: '12px',
    maxWidth: '800px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    border: '1px solid #2a2f4a',
    animation: 'slideUp 0.3s ease'
  },
  modalLarge: {
    backgroundColor: '#1a1f3e',
    borderRadius: '12px',
    maxWidth: '1200px',
    width: '95%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    border: '1px solid #2a2f4a',
    animation: 'slideUp 0.3s ease'
  },
  confirmModal: {
    backgroundColor: '#1a1f3e',
    borderRadius: '12px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    border: '1px solid #2a2f4a',
    animation: 'slideUp 0.3s ease'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #2a2f4a'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#a0a5c0',
    transition: 'color 0.2s',
    padding: '0 8px'
  },
  modalBody: {
    padding: '24px'
  },
  modalFooter: {
    padding: '20px 24px',
    borderTop: '1px solid #2a2f4a',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '30px'
  },
  formSection: {
    backgroundColor: '#0a0e27',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #2a2f4a'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#4c9aff',
    marginBottom: '20px',
    borderLeft: '3px solid #4c9aff',
    paddingLeft: '10px'
  },
  formGroup: {
    marginBottom: '15px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#a0a5c0'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    backgroundColor: '#0a0e27',
    border: '1px solid #2a2f4a',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    color: '#ffffff'
  },
  passwordContainer: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  passwordInput: {
    flex: 1,
    padding: '10px 12px',
    fontSize: '14px',
    backgroundColor: '#0a0e27',
    border: '1px solid #2a2f4a',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    color: '#ffffff'
  },
  eyeButton: {
    padding: '10px',
    backgroundColor: '#2a2f4a',
    border: '1px solid #3a3f5a',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'all 0.2s'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    backgroundColor: '#0a0e27',
    border: '1px solid #2a2f4a',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    color: '#ffffff',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  fileInput: {
    width: '100%',
    padding: '8px',
    fontSize: '14px',
    backgroundColor: '#0a0e27',
    border: '1px solid #2a2f4a',
    borderRadius: '6px',
    color: '#a0a5c0'
  },
  fileInfo: {
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '12px',
    color: '#a0a5c0'
  },
  downloadButton: {
    padding: '4px 8px',
    backgroundColor: '#4c9aff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer'
  },
  helperText: {
    fontSize: '11px',
    color: '#a0a5c0',
    marginTop: '4px',
    display: 'block'
  },
  detailSection: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#0a0e27',
    borderRadius: '8px',
    border: '1px solid #2a2f4a'
  },
  detailSectionTitle: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#4c9aff',
    marginBottom: '16px',
    borderLeft: '3px solid #4c9aff',
    paddingLeft: '10px'
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '12px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  detailLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#a0a5c0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  detailValue: {
    fontSize: '14px',
    color: '#ffffff',
    fontWeight: '500'
  },
  modalDownloadButton: {
    padding: '6px 12px',
    backgroundColor: '#4c9aff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    width: 'fit-content'
  },
  modalButton: {
    padding: '10px 20px',
    backgroundColor: '#4c9aff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  submitModalButton: {
    padding: '10px 20px',
    backgroundColor: '#4c9aff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  cancelModalButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  confirmDeleteButton: {
    padding: '10px 20px',
    backgroundColor: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  confirmMessage: {
    fontSize: '16px',
    color: '#ffffff',
    marginBottom: '12px',
    textAlign: 'center'
  },
  confirmWarning: {
    fontSize: '14px',
    color: '#ff6b6b',
    textAlign: 'center',
    margin: 0
  }
};

// Add animation keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(50px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  button:hover:not(:disabled) {
    opacity: 0.85;
    transform: translateY(-1px);
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  input:focus, textarea:focus, select:focus {
    border-color: #4c9aff;
    box-shadow: 0 0 0 2px rgba(76, 154, 255, 0.2);
    outline: none;
  }
  
  tr:hover {
    background-color: #0f132e;
  }
  
  .modal-close:hover {
    color: #ff6b6b;
  }
  
  .eye-button:hover {
    background-color: #3a3f5a;
  }
`;
document.head.appendChild(styleSheet);

export default EmployeeManager;