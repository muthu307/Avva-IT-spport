import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const UserTypeManager = () => {
  const navigate = useNavigate();
  // State for the form input value
  const [userTypeInput, setUserTypeInput] = useState('');
  // State for the list of user types
  const [userTypes, setUserTypes] = useState([]);
  // State to track which item is being edited
  const [editingId, setEditingId] = useState(null);
  // State for the edit input value
  const [editValue, setEditValue] = useState('');
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all user types on component mount
  useEffect(() => {
    fetchUserTypes();
  }, []);

  // Fetch user types from API
  const fetchUserTypes = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/user-types');
      setUserTypes(response.data);
    } catch (err) {
      setError('Error fetching user types: ' + err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission to add a new user type
  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedValue = userTypeInput.trim();
    
    if (trimmedValue === '') {
      alert('Please enter a user type');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/user-types', { name: trimmedValue });
      const newUserType = response.data;
      setUserTypes([...userTypes, newUserType]);
      
      // Auto-set as active role for configuration
      localStorage.setItem("userType", trimmedValue);
      
      setUserTypeInput('');
      alert(`User Type "${trimmedValue}" added. Role is now active for configuration.`);
    } catch (err) {
      alert('Error: ' + err.message);
      console.error('Add error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Save the edited user type
  const saveEdit = async (id) => {
    const trimmedValue = editValue.trim();
    
    if (trimmedValue === '') {
      alert('User type cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put(`/user-types/${id}`, { name: trimmedValue });
      const updatedUserType = response.data;
      setUserTypes(userTypes.map(type =>
        type.id === id ? updatedUserType : type
      ));
      setEditingId(null);
      setEditValue('');
    } catch (err) {
      alert('Error: ' + err.message);
      console.error('Update error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Start editing a user type
  const startEditing = (userType) => {
    setEditingId(userType.id);
    setEditValue(userType.name);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  // Delete a user type
  const deleteUserType = async (id) => {
    if (window.confirm('Are you sure you want to delete this user type?')) {
      setLoading(true);
      try {
        await api.delete(`/user-types/${id}`);
        setUserTypes(userTypes.filter(type => type.id !== id));
      } catch (err) {
        alert('Error: ' + err.message);
        console.error('Delete error:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>User Type Manager</h1>
        
        {error && (
          <div style={styles.errorMessage}>
            {error}
            <button onClick={() => setError('')} style={styles.closeButton}>×</button>
          </div>
        )}
        
        {/* Form Section */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label htmlFor="userType" style={styles.label}>
              User Type:
            </label>
            <input
              type="text"
              id="userType"
              value={userTypeInput}
              onChange={(e) => setUserTypeInput(e.target.value)}
              placeholder="Enter user type (e.g., Manager, Guest)"
              style={styles.input}
              disabled={loading}
            />
          </div>
          <button 
            type="submit" 
            style={styles.addButton}
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add User Type'}
          </button>
        </form>

        {/* Table Section */}
        <div style={styles.tableContainer}>
          <h2 style={styles.subtitle}>User Types List</h2>
          {loading && userTypes.length === 0 ? (
            <p style={styles.loadingMessage}>Loading...</p>
          ) : userTypes.length === 0 ? (
            <p style={styles.emptyMessage}>No user types added yet. Add one above!</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.tableHeader}>S.No</th>
                  <th style={styles.tableHeader}>User Type</th>
                  <th style={styles.tableHeader}>Actions</th>
                 </tr>
              </thead>
              <tbody>
                {userTypes.map((userType, index) => (
                  <tr key={userType.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>{index + 1}</td>
                    <td style={styles.tableCell}>
                      {editingId === userType.id ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={styles.editInput}
                          autoFocus
                          disabled={loading}
                        />
                      ) : (
                        <span style={styles.userTypeName}>{userType.name}</span>
                      )}
                    </td>
                    <td style={styles.tableCell}>
                      {editingId === userType.id ? (
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => saveEdit(userType.id)}
                            style={{...styles.actionButton, ...styles.saveButton}}
                            disabled={loading}
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            style={{...styles.actionButton, ...styles.cancelButton}}
                            disabled={loading}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => {
                              localStorage.setItem("userType", userType.name);
                              navigate('/userSettings');
                            }}
                            style={{...styles.actionButton, ...styles.manageButton}}
                          >
                            Manage
                          </button>
                          <button
                            onClick={() => startEditing(userType)}
                            style={{...styles.actionButton, ...styles.editButton}}
                            disabled={loading}
                          >
                            Update
                          </button>
                          <button
                            onClick={() => deleteUserType(userType.id)}
                            style={{...styles.actionButton, ...styles.deleteButton}}
                            disabled={loading}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
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
    maxWidth: '900px',
    margin: '0 auto',
    backgroundColor: '#1a1f3e',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    padding: '30px',
    border: '1px solid #2a2f4a'
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '30px',
    textAlign: 'center',
    borderBottom: '2px solid #2a2f4a',
    paddingBottom: '15px'
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
  form: {
    display: 'flex',
    gap: '15px',
    alignItems: 'flex-end',
    marginBottom: '40px',
    flexWrap: 'wrap'
  },
  formGroup: {
    flex: 1,
    minWidth: '250px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#a0a5c0'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '16px',
    backgroundColor: '#0a0e27',
    border: '1px solid #2a2f4a',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    color: '#ffffff'
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#4c9aff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    height: '42px'
  },
  tableContainer: {
    marginTop: '20px'
  },
  subtitle: {
    fontSize: '20px',
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: '20px'
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
    fontSize: '14px',
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
    fontSize: '15px',
    color: '#e0e5f0'
  },
  userTypeName: {
    fontWeight: '500',
    color: '#ffffff'
  },
  editInput: {
    padding: '6px 10px',
    fontSize: '14px',
    backgroundColor: '#0a0e27',
    border: '1px solid #4c9aff',
    borderRadius: '4px',
    outline: 'none',
    width: '100%',
    maxWidth: '200px',
    color: '#ffffff'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  actionButton: {
    padding: '6px 12px',
    fontSize: '13px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'opacity 0.2s'
  },
  editButton: {
    backgroundColor: '#4c9aff',
    color: 'white'
  },
  deleteButton: {
    backgroundColor: '#ff6b6b',
    color: 'white'
  },
  saveButton: {
    backgroundColor: '#51cf66',
    color: 'white'
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    color: 'white'
  },
  manageButton: {
    backgroundColor: '#3b82f6',
    color: 'white'
  }
};

// Add hover effects
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  button:hover:not(:disabled) {
    opacity: 0.85;
    transform: translateY(-1px);
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  input:focus {
    border-color: #4c9aff;
    box-shadow: 0 0 0 2px rgba(76, 154, 255, 0.2);
  }
  tr:hover {
    background-color: #0f132e;
  }
`;
document.head.appendChild(styleSheet);

export default UserTypeManager;