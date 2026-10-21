import React, { useState, useEffect } from 'react';

const SupplierPage = () => {
  // State for current step (1: Supplier Details, 2: Add Items)
  const [currentStep, setCurrentStep] = useState(1);
  
  // State for suppliers list
  const [suppliers, setSuppliers] = useState([]);
  
  // State for current supplier form
  const [currentSupplier, setCurrentSupplier] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: ''
  });

  // State for items list - now each supplier has their own items
  const [items, setItems] = useState([]);
  
  // State for current item form
  const [currentItem, setCurrentItem] = useState({
    name: '',
    type: '',
    model: '',
    watts: '',
    buyPrice: '',
    quantity: 0,
    attachment: ''     
  });

  // State for file upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [filePreview, setFilePreview] = useState(null);

  // State to track selected supplier
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // State to track if adding new supplier
  const [isAddingNew, setIsAddingNew] = useState(false);

  // State for popup visibility
  const [showSupplierPopup, setShowSupplierPopup] = useState(false);
  const [showItemPopup, setShowItemPopup] = useState(false);
  
  // State for view items popup
  const [showViewItemsPopup, setShowViewItemsPopup] = useState(false);
  const [viewingSupplier, setViewingSupplier] = useState(null);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Pagination and Search States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState('all');

  // Base URL for API
  const BASE_URL = 'http://localhost:5000';

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Cleanup file previews on unmount
  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

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
        setSuppliers(data.suppliers);
        
        // Extract all items from suppliers
        const allItems = [];
        data.suppliers.forEach(supplier => {
          if (supplier.items && supplier.items.length > 0) {
            allItems.push(...supplier.items);
          }
        });
        setItems(allItems);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle supplier input change
  const handleSupplierChange = (e) => {
    const { name, value } = e.target;
    setCurrentSupplier(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle item input change
  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (limit to 16MB)
      if (file.size > 16 * 1024 * 1024) {
        alert('File size should be less than 16MB');
        e.target.value = null;
        return;
      }
      
      // Check file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert('File type not allowed. Please upload PDF, DOC, DOCX, JPG, PNG, or TXT files.');
        e.target.value = null;
        return;
      }
      
      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        setFilePreview(previewUrl);
      } else {
        setFilePreview(null);
      }
      
      // Clear any previous attachment path
      setCurrentItem(prev => ({
        ...prev,
        attachment: ''
      }));
    }
  };

  // Upload file to server
  const uploadFile = async (file) => {
    if (!file) return null;
    
    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        mode: 'cors'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }
      
      const data = await response.json();
      return data.filePath; // Returns path like "/uploads/filename.jpg"
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Failed to upload file. Please try again.');
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  // Save supplier and move to next step
  const saveSupplierAndNext = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const supplierData = {
        name: currentSupplier.name || 'Unnamed Supplier',
        company: currentSupplier.company || 'Unnamed Company',
        email: currentSupplier.email || null,
        phone: currentSupplier.phone || null,
        address: currentSupplier.address || null
      };

      console.log('Sending supplier data:', supplierData);

      const response = await fetch(`${BASE_URL}/api/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify(supplierData)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to create supplier');
      }

      const data = await response.json();
      console.log('Success response:', data);
      
      if (data.success) {
        const newSupplier = data.supplier;
        setSuppliers([...suppliers, newSupplier]);
        setSelectedSupplier(newSupplier);
        setShowSupplierPopup(false);
        setCurrentStep(2);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error creating supplier:', err);
      alert('Failed to create supplier. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add new item - ALWAYS sets status to "Pending" for auto-processing
  const addItem = async (e) => {
    e.preventDefault();
    if (selectedSupplier) {
      try {
        setLoading(true);
        
        // Upload file if selected
        let attachmentPath = null;
        if (selectedFile) {
          const uploadedPath = await uploadFile(selectedFile);
          if (uploadedPath) {
            attachmentPath = uploadedPath;
          } else {
            // If upload fails, ask user if they want to continue without attachment
            const continueWithoutAttachment = window.confirm(
              'File upload failed. Do you want to continue without attachment?'
            );
            if (!continueWithoutAttachment) {
              setLoading(false);
              return;
            }
          }
        }
        
        const itemData = {
          name: currentItem.name,
          type: currentItem.type || null,
          model: currentItem.model,
          watts: parseFloat(currentItem.watts) || 0,
          buy_price: parseFloat(currentItem.buyPrice) || 0,
          quantity: parseInt(currentItem.quantity) || 0,
          status: "Pending", // Hardcoded as Pending for auto-processing
          attachment: attachmentPath
        };

        console.log('Sending item data:', itemData);

        const response = await fetch(`${BASE_URL}/api/suppliers/${selectedSupplier.id}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          mode: 'cors',
          body: JSON.stringify(itemData)
        });

        console.log('Item response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          throw new Error(errorData.error || 'Failed to create item');
        }

        const data = await response.json();
        console.log('Item success response:', data);
        
        if (data.success) {
          const newItem = data.item;
          
          // Add to global items array
          setItems([...items, newItem]);
          
          // Update supplier's items in suppliers list
          setSuppliers(suppliers.map(supplier => 
            supplier.id === selectedSupplier.id 
              ? { 
                  ...supplier, 
                  items: [...(supplier.items || []), newItem] 
                }
              : supplier
          ));
          
          // Reset form
          setCurrentItem({
            name: '',
            type: '',
            model: '',
            watts: '',
            buyPrice: '',
            quantity: 0,
            attachment: ''
          });
          
          // Clear file selection and preview
          setSelectedFile(null);
          if (filePreview) {
            URL.revokeObjectURL(filePreview);
            setFilePreview(null);
          }
          
          // Reset file input
          const fileInput = document.querySelector('input[type="file"]');
          if (fileInput) fileInput.value = '';
          
          setShowItemPopup(false);
          
          // Show success message
          alert('Item added successfully! It will be automatically added to inventory.');
        }
      } catch (err) {
        setError(err.message);
        console.error('Error creating item:', err);
        alert('Failed to create item. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Select a supplier and load their items
  const selectSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setCurrentStep(2);
  };

  // View items for a supplier
  const viewSupplierItems = (supplier, e) => {
    e.stopPropagation();
    setViewingSupplier(supplier);
    setShowViewItemsPopup(true);
  };

  // Delete item
  const deleteItem = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        setLoading(true);
        const response = await fetch(`${BASE_URL}/api/items/${itemId}`, {
          method: 'DELETE',
          credentials: 'include',
          mode: 'cors'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete item');
        }

        const data = await response.json();
        if (data.success) {
          const itemToDelete = items.find(item => item.id === itemId);
          
          // Remove from global items
          setItems(items.filter(item => item.id !== itemId));
          
          // Remove from supplier's items
          if (itemToDelete) {
            setSuppliers(suppliers.map(supplier => 
              supplier.id === itemToDelete.supplier_id 
                ? { 
                    ...supplier, 
                    items: (supplier.items || []).filter(item => item.id !== itemId) 
                  }
                : supplier
            ));
          }
          
          alert('Item deleted successfully!');
        }
      } catch (err) {
        setError(err.message);
        console.error('Error deleting item:', err);
        alert('Failed to delete item. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Delete supplier
  const deleteSupplier = async (supplierId) => {
    if (window.confirm('Are you sure you want to delete this supplier? All associated items will also be deleted.')) {
      try {
        setLoading(true);
        const response = await fetch(`${BASE_URL}/api/suppliers/${supplierId}`, {
          method: 'DELETE',
          credentials: 'include',
          mode: 'cors'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete supplier');
        }

        const data = await response.json();
        if (data.success) {
          // Remove all items associated with this supplier from global items
          setItems(items.filter(item => item.supplier_id !== supplierId));
          
          // Remove the supplier
          setSuppliers(suppliers.filter(supplier => supplier.id !== supplierId));
          
          if (selectedSupplier?.id === supplierId) {
            setSelectedSupplier(null);
            setCurrentStep(1);
          }
          
          alert('Supplier deleted successfully!');
        }
      } catch (err) {
        setError(err.message);
        console.error('Error deleting supplier:', err);
        alert('Failed to delete supplier. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Start adding new supplier
  const startNewSupplier = () => {
    setIsAddingNew(true);
    setCurrentSupplier({
      name: '',
      email: '',
      phone: '',
      address: '',
      company: ''
    });
    setShowSupplierPopup(true);
  };

  // Go back to supplier selection
  const goToSupplierSelection = () => {
    setIsAddingNew(false);
    setCurrentStep(1);
  };

  // Finish and reset
  const finishAndReset = () => {
    setCurrentStep(1);
    setIsAddingNew(false);
    setSelectedSupplier(null);
    setCurrentSupplier({
      name: '',
      email: '',
      phone: '',
      address: '',
      company: ''
    });
  };

  // Open item popup
  const openItemPopup = () => {
    setCurrentItem({
      name: '',
      type: '',
      model: '',
      watts: '',
      buyPrice: '',
      quantity: 0,
      attachment: ''
    });
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    setShowItemPopup(true);
  };

  // Close popups
  const closePopup = () => {
    setShowSupplierPopup(false);
    setShowItemPopup(false);
    setShowViewItemsPopup(false);
    setViewingSupplier(null);
    setSelectedFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
  };

  // Get full URL for attachment
  const getAttachmentUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${BASE_URL}${path}`;
  };

  // Filter suppliers based on search term
  const getFilteredSuppliers = () => {
    if (!searchTerm) return suppliers;
    
    return suppliers.filter(supplier => {
      if (searchField === 'all') {
        return (
          supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.address?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      } else {
        const fieldValue = supplier[searchField];
        return fieldValue?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      }
    });
  };

  // Get current suppliers for pagination
  const getCurrentSuppliers = () => {
    const filtered = getFilteredSuppliers();
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filtered.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // ================= DARK STYLES (Matching Dashboard) =================
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
    headerTitle: {
      display: "flex",
      alignItems: "center",
      gap: "20px",
      flexWrap: "wrap",
    },
    title: {
      fontSize: "28px",
      fontWeight: "600",
      margin: 0,
      color: "#ffffff",
      letterSpacing: "-0.5px",
    },
    stepIndicator: {
      display: "flex",
      gap: "8px",
    },
    step: {
      padding: "6px 16px",
      backgroundColor: "#1e293b",
      borderRadius: "20px",
      color: "#94a3b8",
      fontSize: "13px",
      fontWeight: "600",
      border: "1px solid #334155",
    },
    stepActive: {
      padding: "6px 16px",
      backgroundColor: "#2563eb",
      borderRadius: "20px",
      color: "#fff",
      fontSize: "13px",
      fontWeight: "600",
      border: "1px solid #3b82f6",
      boxShadow: "0 4px 10px rgba(37, 99, 235, 0.3)",
    },
    buttonGroup: {
      display: "flex",
      gap: "12px",
    },
    button: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 20px",
      borderRadius: "8px",
      backgroundColor: "#1e293b",
      color: "#e2e8f0",
      border: "1px solid #334155",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      transition: "all 0.2s ease",
    },
    primaryButton: {
      backgroundColor: "#2563eb",
      color: "#fff",
      border: "none",
      boxShadow: "0 4px 10px rgba(37, 99, 235, 0.3)",
    },
    successButton: {
      backgroundColor: "#059669",
      color: "#fff",
      border: "none",
      boxShadow: "0 4px 10px rgba(5, 150, 105, 0.3)",
    },
    viewButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "8px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s",
      color: "#3b82f6",
      fontSize: "16px",
      marginRight: "5px",
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
      minWidth: "1200px",
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
    emptyState: {
      textAlign: "center",
      padding: "50px",
      color: "#94a3b8",
      fontStyle: "italic",
      fontSize: "15px",
    },
    deleteButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "8px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s",
      color: "#ef4444",
      fontSize: "16px",
    },
    addNewButton: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 20px",
      borderRadius: "8px",
      backgroundColor: "#2563eb",
      color: "#fff",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      transition: "all 0.2s ease",
      boxShadow: "0 4px 10px rgba(37, 99, 235, 0.3)",
    },
    selectedSupplierInfo: {
      backgroundColor: "#1e293b",
      padding: "20px",
      borderRadius: "16px",
      border: "1px solid #334155",
      marginBottom: "25px",
      color: "#e2e8f0",
      fontSize: "14px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
    },
    actionButtons: {
      display: "flex",
      gap: "5px",
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
      width: "750px",
      maxWidth: "90%",
      maxHeight: "85vh",
      overflowY: "auto",
      border: "1px solid #334155",
      position: "relative",
      marginTop: "60px",
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
    formGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "20px",
      marginBottom: "10px",
    },
    formGroup: {
      marginBottom: "20px",
    },
    fullWidth: {
      gridColumn: "span 2",
    },
    label: {
      display: "block",
      marginBottom: "8px",
      color: "#94a3b8",
      fontSize: "13px",
      fontWeight: "500",
      letterSpacing: "0.3px",
      textTransform: "uppercase",
    },
    input: {
      width: "100%",
      padding: "12px 16px",
      backgroundColor: "#0f172a",
      border: "1px solid #334155",
      color: "#fff",
      borderRadius: "8px",
      fontSize: "14px",
      transition: "all 0.2s",
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
      transition: "all 0.2s",
      boxSizing: "border-box",
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
      boxSizing: "border-box",
      minHeight: "80px",
    },
    fileInput: {
      width: "100%",
      padding: "8px",
      backgroundColor: "#0f172a",
      border: "1px solid #334155",
      color: "#fff",
      borderRadius: "8px",
      fontSize: "14px",
      cursor: "pointer",
    },
    fileInfo: {
      marginTop: "10px",
      padding: "10px",
      backgroundColor: "#0f172a",
      borderRadius: "8px",
      border: "1px solid #334155",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    filePreview: {
      maxWidth: "100px",
      maxHeight: "100px",
      borderRadius: "4px",
    },
    fileName: {
      color: "#10b981",
      fontSize: "13px",
      wordBreak: "break-all",
    },
    popupButtonGroup: {
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
      fontWeight: "500",
      transition: "all 0.2s",
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
    noData: {
      textAlign: "center",
      color: "#94a3b8",
      padding: "50px",
      fontStyle: "italic",
      fontSize: "15px",
    },
    itemBadge: {
      background: "#334155",
      padding: "4px 8px",
      borderRadius: "12px",
      fontSize: "12px",
      color: "#94a3b8",
      marginLeft: "10px",
    },
    // Removed background color from quantity badge
    quantityBadge: {
      padding: "4px 8px",
      borderRadius: "12px",
      fontSize: "12px",
      color: "#e2e8f0",
      fontWeight: "500",
    },
    attachmentLink: {
      color: "#3b82f6",
      textDecoration: "none",
      fontSize: "12px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      cursor: "pointer",
      padding: "4px 8px",
      backgroundColor: "#334155",
      borderRadius: "4px",
      width: "fit-content",
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
    // New styles for search and pagination
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
    searchSelect: {
      padding: "12px 16px",
      backgroundColor: "#1e293b",
      border: "1px solid #334155",
      color: "#fff",
      borderRadius: "8px",
      fontSize: "14px",
      minWidth: "150px",
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
    resultsInfo: {
      color: "#94a3b8",
      fontSize: "14px",
      marginTop: "10px",
    },
  };

  // Check if mobile view
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add keyframe animation for spinner
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
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

  // Render step 1: Supplier Details in Table Format with Pagination and Search
  const renderSupplierStep = () => {
    const filteredSuppliers = getFilteredSuppliers();
    const currentSuppliers = getCurrentSuppliers();
    const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);

    return (
      <div>
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <h1 style={styles.title}>Supplier Management</h1>
            <button 
              onClick={startNewSupplier}
              style={styles.addNewButton}
            >
              + Add New Supplier
            </button>
          </div>
        </div>

        {/* Search Section */}
        <div style={styles.searchContainer}>
          <select 
            style={styles.searchSelect}
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          >
            <option value="all">All Fields</option>
            <option value="name">Name</option>
            <option value="company">Company</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="address">Address</option>
          </select>
          
          <input
            type="text"
            style={styles.searchInput}
            placeholder={`Search by ${searchField === 'all' ? 'any field' : searchField}...`}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
          />
        </div>

        <div style={{ backgroundColor: "#1e293b", padding: "30px", borderRadius: "16px", border: "1px solid #334155" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ color: "#fff", fontSize: "20px", fontWeight: "600", margin: 0 }}>
              Supplier List
            </h2>
            <span style={styles.resultsInfo}>
              Showing {currentSuppliers.length} of {filteredSuppliers.length} suppliers
            </span>
          </div>
          
          {loading && suppliers.length === 0 ? (
            <div style={styles.noData}>Loading suppliers...</div>
          ) : filteredSuppliers.length > 0 ? (
            <>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Company</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Phone</th>
                      <th style={styles.th}>Address</th>
                      <th style={styles.th}>Items</th>
                      <th style={styles.th}>Total Qty</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSuppliers.map(supplier => {
                      const supplierItems = items.filter(item => item.supplier_id === supplier.id);
                      const totalQuantity = supplierItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
                      const pendingCount = supplierItems.filter(item => item.status === 'Pending').length;
                      return (
                        <tr 
                          key={supplier.id}
                          onClick={() => selectSupplier(supplier)}
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#334155';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <td style={styles.td}>
                            <span style={{ fontWeight: '500', color: '#fff' }}>{supplier.name}</span>
                          </td>
                          <td style={styles.td}>
                            <span>{supplier.company}</span>
                          </td>
                          <td style={styles.td}>{supplier.email || '—'}</td>
                          <td style={styles.td}>{supplier.phone || '—'}</td>
                          <td style={styles.td}>{supplier.address || '—'}</td>
                          <td style={styles.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={styles.itemBadge}>
                                {supplierItems.length} {supplierItems.length === 1 ? 'item' : 'items'}
                              </span>
                              {pendingCount > 0 && (
                                <span style={{ background: '#f59e0b', padding: '2px 6px', borderRadius: '12px', fontSize: '11px', color: '#000' }}>
                                  {pendingCount} pending
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.quantityBadge}>
                              {totalQuantity}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.actionButtons}>
                              <button
                                style={styles.viewButton}
                                onClick={(e) => viewSupplierItems(supplier, e)}
                                title="View Items"
                              >
                                👁️
                              </button>
                              <button
                                style={styles.deleteButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSupplier(supplier.id);
                                }}
                                title="Delete Supplier"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
                    // Show first page, last page, and pages around current page
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
                    } else if (
                      pageNumber === currentPage - 3 ||
                      pageNumber === currentPage + 3
                    ) {
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
            </>
          ) : (
            <div style={styles.noData}>
              {searchTerm ? 'No suppliers match your search.' : 'No suppliers added yet. Click the button below to add your first supplier.'}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render step 2: Add Items (Table format) - Status is hidden but exists in data
  const renderItemsStep = () => {
    const supplierItems = items.filter(item => item.supplier_id === selectedSupplier?.id);

    return (
      <div>
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <h1 style={styles.title}>Supplier Management</h1>
          </div>

          <div style={styles.buttonGroup}>
            <button 
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={openItemPopup}
            >
              + Add Item
            </button>
            <button 
              style={{ ...styles.button, ...styles.successButton }}
              onClick={finishAndReset}
            >
              Finish
            </button>
          </div>
        </div>

        {selectedSupplier && (
          <div style={styles.selectedSupplierInfo}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ background: '#2563eb', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', color: '#fff' }}>
                SELECTED
              </span>
              <strong style={{ color: "#fff", fontSize: "16px" }}>{selectedSupplier.company}</strong>
              <span style={{ color: "#94a3b8" }}>({selectedSupplier.name})</span>
              <span style={styles.itemBadge}>
                {supplierItems.length} {supplierItems.length === 1 ? 'item' : 'items'}
              </span>
              <span style={styles.quantityBadge}>
                Total Qty: {supplierItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}
              </span>
            </div>
            <div style={{ color: "#94a3b8", marginTop: "8px", fontSize: "13px", display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <span>📧 {selectedSupplier.email || 'No email'}</span>
              <span>📞 {selectedSupplier.phone || 'No phone'}</span>
              <span>📍 {selectedSupplier.address || 'No address'}</span>
            </div>
          </div>
        )}

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Item Name</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Model</th>
                <th style={styles.th}>Warranty</th>
                <th style={styles.th}>Buy Price (₹)</th>
                <th style={styles.th}>Quantity</th>
                <th style={styles.th}>Attachment</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {supplierItems.length === 0 ? (
                <tr>
                  <td colSpan="8" style={styles.emptyState}>
                    No items added yet for this supplier. Click "Add Item" to add products.
                  </td>
                </tr>
              ) : (
                supplierItems.map(item => (
                  <tr key={item.id}>
                    <td style={styles.td}>
                      <span style={{ fontWeight: '500', color: '#fff' }}>{item.name}</span>
                      {item.status === 'Pending' && (
                        <span style={{ background: '#f59e0b', padding: '2px 6px', borderRadius: '12px', fontSize: '10px', marginLeft: '8px', color: '#000' }}>
                          Pending
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={{ background: '#334155', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                        {item.type || '—'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontFamily: 'monospace' }}>{item.model}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: '#f59e0b' }}>{item.watts}W</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: '600', color: '#10b981' }}>₹{item.buy_price?.toFixed(2)}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.quantityBadge}>{item.quantity || 0}</span>
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
                          📎 View File
                        </a>
                      ) : (
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.deleteButton}
                        onClick={() => deleteItem(item.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // View Items Popup - Status is hidden but exists in data
  const renderViewItemsPopup = () => {
    if (!showViewItemsPopup || !viewingSupplier) return null;

    const supplierItems = items.filter(item => item.supplier_id === viewingSupplier.id);

    return (
      <div style={styles.overlay} onClick={closePopup}>
        <div style={{...styles.popup, width: "900px"}} onClick={(e) => e.stopPropagation()}>
          <button 
            style={styles.closeButton}
            onClick={closePopup}
          >
            ✕
          </button>
          
          <div style={styles.popupHeader}>
            <h2 style={styles.popupTitle}>Items for {viewingSupplier.company}</h2>
            <div style={styles.popupSubtitle}>
              Supplier: {viewingSupplier.name} | Total Items: {supplierItems.length} | 
              Total Quantity: {supplierItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}
            </div>
          </div>
          
          {supplierItems.length > 0 ? (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Item Name</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Model</th>
                    <th style={styles.th}>Warranty</th>
                    <th style={styles.th}>Buy Price (₹)</th>
                    <th style={styles.th}>Quantity</th>
                    <th style={styles.th}>Attachment</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierItems.map(item => (
                    <tr key={item.id}>
                      <td style={styles.td}>
                        <span style={{ fontWeight: '500', color: '#fff' }}>{item.name}</span>
                        {item.status === 'Pending' && (
                          <span style={{ background: '#f59e0b', padding: '2px 6px', borderRadius: '12px', fontSize: '10px', marginLeft: '8px', color: '#000' }}>
                            Pending
                          </span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={{ background: '#334155', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                          {item.type || '—'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontFamily: 'monospace' }}>{item.model}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: '#f59e0b' }}>{item.watts}W</span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontWeight: '600', color: '#10b981' }}>₹{item.buy_price?.toFixed(2)}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.quantityBadge}>{item.quantity || 0}</span>
                      </td>
                      <td style={styles.td}>
                        {item.attachment ? (
                          <a 
                            href={getAttachmentUrl(item.attachment)}
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={styles.attachmentLink}
                          >
                            📎 View File
                          </a>
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.noData}>No items found for this supplier.</div>
          )}

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

  // Supplier Popup with Two Columns
  const renderSupplierPopup = () => {
    if (!showSupplierPopup) return null;

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
            <h2 style={styles.popupTitle}>Add New Supplier</h2>
            <div style={styles.popupSubtitle}>Fill in the supplier details below</div>
          </div>
          
          <form onSubmit={saveSupplierAndNext}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Supplier Name</label>
                <input
                  type="text"
                  name="name"
                  value={currentSupplier.name}
                  onChange={handleSupplierChange}
                  placeholder="e.g., John Doe"
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Company Name</label>
                <input
                  type="text"
                  name="company"
                  value={currentSupplier.company}
                  onChange={handleSupplierChange}
                  placeholder="e.g., ABC Corp"
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={currentSupplier.email}
                  onChange={handleSupplierChange}
                  placeholder="e.g., john@company.com"
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={currentSupplier.phone}
                  onChange={handleSupplierChange}
                  placeholder="e.g., +91 98765 43210"
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div style={{ ...styles.formGroup, ...styles.fullWidth }}>
                <label style={styles.label}>Address</label>
                <textarea
                  name="address"
                  value={currentSupplier.address}
                  onChange={handleSupplierChange}
                  placeholder="Enter complete address"
                  rows="2"
                  style={styles.textarea}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={styles.popupButtonGroup}>
              <button 
                type="button" 
                onClick={closePopup}
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
                {loading ? 'Saving...' : 'Next → Add Items'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Item Popup with Two Columns - Status is hidden from UI but will be sent as "Pending"
  const renderItemPopup = () => {
    if (!showItemPopup) return null;

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
            <h2 style={styles.popupTitle}>Add New Item</h2>
            <div style={styles.popupSubtitle}>Enter item details for {selectedSupplier?.company}</div>
          </div>
          
          <form onSubmit={addItem}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Item Name</label>
                <input
                  type="text"
                  name="name"
                  value={currentItem.name}
                  onChange={handleItemChange}
                  placeholder="e.g., LED Bulb"
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Type</label>
                <input
                  type="text"
                  name="type"
                  value={currentItem.type}
                  onChange={handleItemChange}
                  placeholder="e.g., Electronics"
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Model</label>
                <input
                  type="text"
                  name="model"
                  value={currentItem.model}
                  onChange={handleItemChange}
                  placeholder="e.g., B22-9W"
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Warranty</label>
                <input
                  type="number"
                  name="watts"
                  value={currentItem.watts}
                  onChange={handleItemChange}
                  placeholder="e.g., 9"
                  min="0"
                  step="1"
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Buy Price (₹)</label>
                <input
                  type="number"
                  name="buyPrice"
                  value={currentItem.buyPrice}
                  onChange={handleItemChange}
                  placeholder="e.g., 150"
                  min="0"
                  step="0.01"
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={currentItem.quantity}
                  onChange={handleItemChange}
                  placeholder="e.g., 100"
                  min="0"
                  step="1"
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div style={{ ...styles.formGroup, ...styles.fullWidth }}>
                <label style={styles.label}>Attachment (File)</label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  style={styles.fileInput}
                  disabled={loading || uploadingFile}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                />
                {selectedFile && (
                  <div style={styles.fileInfo}>
                    {filePreview ? (
                      <img src={filePreview} alt="Preview" style={styles.filePreview} />
                    ) : (
                      <span style={{ fontSize: '24px' }}>📄</span>
                    )}
                    <div>
                      <div style={styles.fileName}>{selectedFile.name}</div>
                      <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </div>
                    </div>
                  </div>
                )}
                {uploadingFile && (
                  <div style={{ marginTop: '10px', color: '#2563eb', fontSize: '12px' }}>
                    Uploading file...
                  </div>
                )}
              </div>
            </div>

            <div style={styles.popupButtonGroup}>
              <button 
                type="button" 
                onClick={closePopup}
                style={styles.cancelButton}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                style={styles.submitButton}
                disabled={loading || uploadingFile}
              >
                {uploadingFile ? 'Uploading...' : (loading ? 'Adding...' : 'Add Item')}
              </button>
            </div>
          </form>
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

      {/* Main Content */}
      {currentStep === 1 && renderSupplierStep()}
      {currentStep === 2 && renderItemsStep()}

      {/* Popups */}
      {renderSupplierPopup()}
      {renderItemPopup()}
      {renderViewItemsPopup()}
    </div>
  );
};

export default SupplierPage;