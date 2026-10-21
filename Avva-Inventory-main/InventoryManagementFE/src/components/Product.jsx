// ItemsPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { 
  Plus, Download, Upload, Trash2, Save, Search, RefreshCw, 
  X, CheckCircle, Clock, ChevronLeft, ChevronRight,
  Edit, Hash
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { formatDate } from "../utils/dateUtils";

const API_URL = "http://localhost:5000/api/products";
const SUPPLIER_API_URL = "http://localhost:5000/api";
const BILLING_API_URL = "http://localhost:5000/api/billing";

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedItems, setImportedItems] = useState([]);
  const [processingImport, setProcessingImport] = useState(false);
  const [importStats, setImportStats] = useState({ added: 0, updated: 0, skipped: 0 });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Pending bills modal state
  const [showPendingBillsModal, setShowPendingBillsModal] = useState(false);
  const [pendingBills, setPendingBills] = useState([]);
  const [loadingPendingBills, setLoadingPendingBills] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [processingBill, setProcessingBill] = useState(false);

  // Track processed supply items to prevent duplicates
  const processedItemIds = useRef(new Set());
  const isProcessing = useRef(false);

  // ================= LOAD FROM BACKEND =================
  useEffect(() => {
    loadProducts(1);
  }, []);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Auto-hide message after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Check for pending supply items on component mount and periodically
  useEffect(() => {
    // Initial check with a small delay to ensure component is ready
    const initialCheck = setTimeout(() => {
      checkAndProcessPendingSupplies();
    }, 1000);
    
    // Check every 30 seconds for new pending supplies
    const interval = setInterval(checkAndProcessPendingSupplies, 30000);
    
    return () => {
      clearTimeout(initialCheck);
      clearInterval(interval);
    };
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
  };

  const loadProducts = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?page=${page}&per_page=${itemsPerPage}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      
      let productsArray = [];
      if (data && data.items && Array.isArray(data.items)) {
        productsArray = data.items;
        setTotalItems(data.total || 0);
        setTotalPages(data.pages || 1);
        setCurrentPage(data.current_page || page);
      } else if (Array.isArray(data)) {
        productsArray = data;
        setTotalItems(productsArray.length);
        setTotalPages(Math.ceil(productsArray.length / itemsPerPage));
      } else if (data && data.data && Array.isArray(data.data)) {
        productsArray = data.data;
        setTotalItems(productsArray.length);
        setTotalPages(Math.ceil(productsArray.length / itemsPerPage));
      } else {
        console.warn('Unexpected API response format:', data);
        productsArray = [];
        setTotalItems(0);
        setTotalPages(1);
      }
      
      // Calculate amount for each product
      const processedItems = productsArray.map(item => 
        calculateAmount({ ...item, id: item.id })
      );
      
      setItems(processedItems);
    } catch (err) {
      console.error("Error fetching products:", err);
      showMessage("error", "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  // ================= AUTO-PROCESS PENDING SUPPLIES =================
  const checkAndProcessPendingSupplies = async () => {
    // Prevent concurrent processing
    if (isProcessing.current) {
      console.log("Already processing supplies, skipping...");
      return;
    }

    try {
      isProcessing.current = true;
      console.log("Checking for pending supply items...");
      
      // Fetch all suppliers with their items
      const res = await fetch(`${SUPPLIER_API_URL}/suppliers-with-items`, {
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      
      if (data.success && data.suppliers) {
        // Find all items with status "Pending" that haven't been processed yet
        const pendingItems = [];
        
        data.suppliers.forEach(supplier => {
          if (supplier.items && supplier.items.length > 0) {
            supplier.items.forEach(item => {
              // Only process if status is "Pending" and we haven't processed it in this session
              if (item.status === "Pending" && !processedItemIds.current.has(item.id)) {
                pendingItems.push({
                  ...item,
                  supplierName: supplier.name,
                  supplierCompany: supplier.company,
                  supplierId: supplier.id
                });
              }
            });
          }
        });
        
        if (pendingItems.length > 0) {
          console.log(`Found ${pendingItems.length} new pending supply items, auto-processing...`);
          await processPendingSupplies(pendingItems);
        } else {
          console.log("No new pending supply items found");
        }
      }
    } catch (err) {
      console.error("Error checking pending supplies:", err);
    } finally {
      isProcessing.current = false;
    }
  };

  const processPendingSupplies = async (pendingItems) => {
    try {
      // Fetch all products to check for duplicates
      const allProductsRes = await fetch(`${API_URL}?page=1&per_page=1000`);
      const allProductsData = await allProductsRes.json();
      let allProducts = [];
      
      if (allProductsData && allProductsData.items && Array.isArray(allProductsData.items)) {
        allProducts = allProductsData.items;
      }

      let addedCount = 0;
      let updatedCount = 0;
      const successfullyProcessed = [];

      for (const supplyItem of pendingItems) {
        try {
          // Double-check if this item hasn't been processed by another instance
          if (processedItemIds.current.has(supplyItem.id)) {
            console.log(`Item ${supplyItem.id} already processed, skipping...`);
            continue;
          }

          // Check if product already exists in inventory
          const existingItem = allProducts.find(item => 
            isSameProduct(item, supplyItem)
          );

          if (existingItem) {
            // Update quantity of existing item
            const supplyQty = parseInt(supplyItem.quantity) || 1;
            const currentQty = parseInt(existingItem.quantity) || 0;
            const newQty = currentQty + supplyQty;
            
            console.log(`Updating ${existingItem.name}: ${currentQty} + ${supplyQty} = ${newQty}`);
            
            // Update in backend
            const updateRes = await fetch(`${API_URL}/${existingItem.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: existingItem.name,
                model: existingItem.model || "",
                type: existingItem.type || "",
                watts: existingItem.watts || "",
                buyPrice: existingItem.buyPrice || 0,
                sellPrice: existingItem.sellPrice || 0,
                quantity: newQty,
              }),
            });

            if (updateRes.ok) {
              updatedCount++;
              successfullyProcessed.push(supplyItem.id);
            }
          } else {
            // Create new product
            const supplyQty = parseInt(supplyItem.quantity) || 1;
            
            const newItem = {
              name: supplyItem.name,
              model: supplyItem.model || "",
              type: supplyItem.type || "",
              watts: supplyItem.watts || "",
              buyPrice: parseFloat(supplyItem.buy_price || supplyItem.buyPrice || 0),
              sellPrice: parseFloat(supplyItem.sell_price || supplyItem.sellPrice || 0),
              quantity: supplyQty,
            };

            console.log('Creating new product:', newItem);

            const createRes = await fetch(API_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newItem),
            });

            if (createRes.ok) {
              addedCount++;
              successfullyProcessed.push(supplyItem.id);
            } else {
              const errorData = await createRes.json();
              console.error('Failed to create product:', errorData);
            }
          }

          // Only update status if the product operation was successful
          if (successfullyProcessed.includes(supplyItem.id)) {
            // Mark as processed in our local set
            processedItemIds.current.add(supplyItem.id);
            
            // Update the supply item status to "In Inventory"
            await updateSupplyItemStatus(supplyItem.id, "In Inventory");
          }
        } catch (itemError) {
          console.error(`Error processing supply item ${supplyItem.id}:`, itemError);
        }
      }

      if (addedCount > 0 || updatedCount > 0) {
        // Refresh products to get latest data
        await loadProducts(currentPage);
        
        showMessage("success", 
          `Auto-processed ${successfullyProcessed.length} supply item(s):\n` +
          `📦 ${addedCount} new product(s) added\n` +
          `📈 ${updatedCount} existing product(s) updated`
        );
      }
      
    } catch (err) {
      console.error("Error processing pending supplies:", err);
    }
  };

  // ================= UPDATE SUPPLY ITEM STATUS =================
  const updateSupplyItemStatus = async (itemId, newStatus) => {
    try {
      const response = await fetch(`${SUPPLIER_API_URL}/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        console.error(`Failed to update status for item ${itemId}`);
      }
    } catch (err) {
      console.error(`Error updating status for item ${itemId}:`, err);
    }
  };

  // ================= LOAD PENDING BILLS =================
  const loadPendingBills = async () => {
    setLoadingPendingBills(true);
    try {
      const res = await fetch(`${BILLING_API_URL}/bills/pending-items`, {
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      
      if (data.success && data.bills) {
        setPendingBills(data.bills);
      }
    } catch (err) {
      console.error("Error loading pending bills:", err);
      showMessage("error", "Failed to load pending bills");
    } finally {
      setLoadingPendingBills(false);
    }
  };

  // ================= LOAD BILL ITEMS =================
  const loadBillItems = async (billId) => {
    try {
      const res = await fetch(`${BILLING_API_URL}/bills/${billId}/items/pending`, {
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      
      if (data.success && data.items) {
        setBillItems(data.items);
      }
    } catch (err) {
      console.error("Error loading bill items:", err);
      showMessage("error", "Failed to load bill items");
    }
  };

  // ================= SELECT BILL TO VIEW ITEMS =================
  const handleSelectBill = (bill) => {
    setSelectedBill(bill);
    loadBillItems(bill.id);
  };

  // ================= PROCESS BILL ITEM (COMPLETE) =================
  const handleProcessBillItem = async (itemId, billId) => {
    try {
      const res = await fetch(`${BILLING_API_URL}/bills/${billId}/items/${itemId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include'
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();

      if (data.success) {
        showMessage("success", "Item completed successfully!");
        
        setBillItems(prevItems =>
          prevItems.map(item =>
            item.id === itemId ? { ...item, item_status: 'completed' } : item
          )
        );

        await loadProducts(currentPage);
        
        const updatedItems = billItems.map(item =>
          item.id === itemId ? { ...item, item_status: 'completed' } : item
        );
        
        const allCompleted = updatedItems.every(item => item.item_status === 'completed');
        
        if (allCompleted) {
          await loadPendingBills();
          setSelectedBill(null);
          setBillItems([]);
        }
      }
    } catch (err) {
      console.error("Error processing bill item:", err);
      showMessage("error", `Failed to process item: ${err.message}`);
    }
  };

  // ================= PROCESS ENTIRE BILL =================
  const handleProcessBill = async (billId) => {
    if (!window.confirm("Are you sure you want to complete all pending items in this bill?")) return;

    setProcessingBill(true);
    try {
      const res = await fetch(`${BILLING_API_URL}/bills/${billId}/complete-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include'
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();

      if (data.success) {
        showMessage("success", `Successfully completed ${data.completedCount} items!`);
        
        await loadProducts(currentPage);
        await loadPendingBills();
        setSelectedBill(null);
        setBillItems([]);
      }
    } catch (err) {
      console.error("Error processing bill:", err);
      showMessage("error", `Failed to process bill: ${err.message}`);
    } finally {
      setProcessingBill(false);
    }
  };

  // ================= CALCULATE AMOUNT =================
  const calculateAmount = (item) => {
    const sell = parseFloat(item.sellPrice) || 0;
    const qty = parseInt(item.quantity) || 0;
    const amount = (sell * qty).toFixed(2);

    return { 
      ...item, 
      amount,
      buyPrice: parseFloat(item.buyPrice) || 0,
      sellPrice: sell,
      quantity: qty
    };
  };

  // ================= DUPLICATE CHECK =================
  const isSameProduct = (a, b) => {
    const aBuyPrice = parseFloat(a.buyPrice || a.buy_price || 0);
    const bBuyPrice = parseFloat(b.buyPrice || b.buy_price || 0);
    
    return (
      a.name?.toLowerCase() === b.name?.toLowerCase() &&
      a.model?.toLowerCase() === (b.model || '').toLowerCase() &&
      a.type?.toLowerCase() === (b.type || '').toLowerCase() &&
      parseFloat(a.watts || 0) === parseFloat(b.watts || 0) &&
      aBuyPrice === bBuyPrice
    );
  };

  // ================= EDIT ITEM FUNCTIONS =================
  const handleEditClick = (item) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  const handleEditChange = (field, value) => {
    setEditingItem(prev => {
      const updated = { ...prev, [field]: value };
      return calculateAmount(updated);
    });
  };

  const handleEditSave = async () => {
    if (!editingItem) return;

    // Validate required fields
    if (!editingItem.name || editingItem.name.trim() === '') {
      showMessage("error", "Product name is required");
      return;
    }

    setSaving(true);
    try {
      // Prepare the data for API - ensure all fields are properly formatted
      const productData = {
        name: editingItem.name.trim(),
        model: editingItem.model?.trim() || "",
        type: editingItem.type?.trim() || "",
        watts: editingItem.watts?.toString() || "", // Keep as watts in API
        buyPrice: parseFloat(editingItem.buyPrice) || 0,
        sellPrice: parseFloat(editingItem.sellPrice) || 0,
        quantity: parseInt(editingItem.quantity) || 0,
      };

      console.log('Saving product data:', productData);

      let response;
      if (editingItem.isNew) {
        // Create new product
        response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });
      } else {
        // Update existing product
        response = await fetch(`${API_URL}/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.errors ? errorData.errors.join(', ') : `Failed to ${editingItem.isNew ? 'create' : 'update'} product`);
      }

      const savedProduct = await response.json();
      console.log('Product saved successfully:', savedProduct);

      showMessage("success", `Item ${editingItem.isNew ? 'created' : 'updated'} successfully!`);
      setShowEditModal(false);
      setEditingItem(null);
      
      // Reload products to show the new/updated item
      await loadProducts(currentPage);
      
    } catch (err) {
      console.error("Save error:", err);
      showMessage("error", `Failed to save item: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ================= ADD NEW ITEM =================
  const handleAddNewItem = () => {
    // Create a new empty item with default values
    const newItem = calculateAmount({
      id: `new-${Date.now()}`,
      name: "",
      model: "",
      type: "",
      watts: "", // This will be displayed as Warranty
      buyPrice: "",
      sellPrice: "",
      quantity: "",
      isNew: true,
    });
    
    console.log('Creating new item:', newItem);
    setEditingItem(newItem);
    setShowEditModal(true);
  };

  // ================= SAVE/REFRESH =================
  const handleRefresh = async () => {
    await loadProducts(currentPage);
    showMessage("success", "Data refreshed!");
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      // Only try to delete from backend if it's not a temporary new item
      if (!String(id).startsWith("new-")) {
        const res = await fetch(`${API_URL}/${id}`, {
          method: "DELETE",
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to delete product");
        }
      }

      showMessage("success", "Item deleted successfully");
      await loadProducts(currentPage);
      
    } catch (err) {
      console.error("Delete error:", err);
      showMessage("error", `Failed to delete item: ${err.message}`);
    }
  };

  // ================= EXPORT TO EXCEL =================
  const handleExport = async () => {
    try {
      const res = await fetch(`${API_URL}?page=1&per_page=1000`);
      const data = await res.json();
      
      let productsArray = [];
      if (data && data.items && Array.isArray(data.items)) {
        productsArray = data.items;
      } else if (Array.isArray(data)) {
        productsArray = data;
      }

      const exportData = productsArray.map(item => ({
        'ID': item.id || '',
        'Name': item.name || '',
        'Model': item.model || '',
        'Type': item.type || '',
        'Warranty': item.watts || '', // Changed from 'Watts' to 'Warranty'
        'Buy Price': item.buyPrice || 0,
        'Sell Price': item.sellPrice || 0,
        'Quantity': item.quantity || 0,
        'Amount': (item.sellPrice * item.quantity).toFixed(2) || '0.00'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

      const wscols = [
        { wch: 8 },  // ID
        { wch: 20 }, // Name
        { wch: 15 }, // Model
        { wch: 15 }, // Type
        { wch: 12 }, // Warranty (was Watts)
        { wch: 12 }, // Buy Price
        { wch: 12 }, // Sell Price
        { wch: 10 }, // Quantity
        { wch: 12 }, // Amount
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
      saveAs(file, `Products_${date}.xlsx`);
      
      showMessage("success", "Export successful!");
    } catch (err) {
      console.error("Export error:", err);
      showMessage("error", "Failed to export");
    }
  };

  // ================= UPDATED IMPORT FROM EXCEL =================
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          showMessage("error", "No data found in the file");
          return;
        }

        console.log('Imported data:', jsonData);

        // Process each row and map to our data structure
        const processedItems = jsonData.map((row, index) => {
          // Try different possible column names
          const name = row['Name'] || row['name'] || row['Product'] || row['product'] || '';
          const model = row['Model'] || row['model'] || '';
          const type = row['Type'] || row['type'] || '';
          const warranty = row['Warranty'] || row['watts'] || row['Warranty'] || row['Warranty Period'] || '';
          const buyPrice = parseFloat(row['Buy Price'] || row['buyPrice'] || row['Buy Price'] || row['BuyPrice'] || 0);
          const sellPrice = parseFloat(row['Sell Price'] || row['sellPrice'] || row['Sell Price'] || row['SellPrice'] || 0);
          const quantity = parseInt(row['Quantity'] || row['quantity'] || row['Qty'] || 0);

          return {
            id: `import-${Date.now()}-${index}`,
            name,
            model,
            type,
            watts: warranty,
            buyPrice,
            sellPrice,
            quantity,
            isNew: true,
            selected: true, // Default selected for import
          };
        }).filter(item => item.name); // Only keep items with a name

        if (processedItems.length === 0) {
          showMessage("error", "No valid items found in the file. Please ensure 'Name' column exists.");
          return;
        }

        setImportedItems(processedItems);
        setShowImportModal(true);
        setImportStats({ added: 0, updated: 0, skipped: 0 });
        
        e.target.value = '';
      } catch (err) {
        console.error("Import error:", err);
        showMessage("error", "Failed to import file: " + err.message);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // ================= PROCESS IMPORTED ITEMS =================
  const processImportedItems = async () => {
    const itemsToProcess = importedItems.filter(item => item.selected);
    
    if (itemsToProcess.length === 0) {
      showMessage("error", "No items selected for import");
      return;
    }

    setProcessingImport(true);
    
    try {
      // Fetch all existing products to check for duplicates
      const allProductsRes = await fetch(`${API_URL}?page=1&per_page=1000`);
      const allProductsData = await allProductsRes.json();
      let existingProducts = [];
      
      if (allProductsData && allProductsData.items && Array.isArray(allProductsData.items)) {
        existingProducts = allProductsData.items;
      }

      let added = 0;
      let updated = 0;
      let skipped = 0;

      for (const importItem of itemsToProcess) {
        try {
          // Check if product already exists
          const existingItem = existingProducts.find(item => 
            isSameProduct(item, importItem)
          );

          if (existingItem) {
            // Check if sell price is 0 or same as existing
            const importSellPrice = parseFloat(importItem.sellPrice) || 0;
            const existingSellPrice = parseFloat(existingItem.sellPrice) || 0;
            
            // If sell price is 0 or matches existing, just add quantity
            if (importSellPrice === 0 || Math.abs(importSellPrice - existingSellPrice) < 0.01) {
              // Update quantity only
              const importQty = parseInt(importItem.quantity) || 0;
              const currentQty = parseInt(existingItem.quantity) || 0;
              const newQty = currentQty + importQty;
              
              const updateRes = await fetch(`${API_URL}/${existingItem.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: existingItem.name,
                  model: existingItem.model || "",
                  type: existingItem.type || "",
                  watts: existingItem.watts || "",
                  buyPrice: existingItem.buyPrice || 0,
                  sellPrice: existingItem.sellPrice || 0,
                  quantity: newQty,
                }),
              });

              if (updateRes.ok) {
                updated++;
              } else {
                skipped++;
              }
            } else {
              // Different sell price - create as new item
              const newItem = {
                name: importItem.name,
                model: importItem.model || "",
                type: importItem.type || "",
                watts: importItem.watts || "",
                buyPrice: parseFloat(importItem.buyPrice) || 0,
                sellPrice: importSellPrice,
                quantity: parseInt(importItem.quantity) || 0,
              };

              const createRes = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newItem),
              });

              if (createRes.ok) {
                added++;
              } else {
                skipped++;
              }
            }
          } else {
            // Create new product
            const newItem = {
              name: importItem.name,
              model: importItem.model || "",
              type: importItem.type || "",
              watts: importItem.watts || "",
              buyPrice: parseFloat(importItem.buyPrice) || 0,
              sellPrice: parseFloat(importItem.sellPrice) || 0,
              quantity: parseInt(importItem.quantity) || 0,
            };

            const createRes = await fetch(API_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newItem),
            });

            if (createRes.ok) {
              added++;
            } else {
              skipped++;
            }
          }
        } catch (itemError) {
          console.error('Error processing item:', itemError);
          skipped++;
        }
      }

      setImportStats({ added, updated, skipped });
      
      // Refresh products
      await loadProducts(currentPage);
      
      showMessage("success", 
        `Import completed!\n` +
        `✅ ${added} new items added\n` +
        `📈 ${updated} existing items updated\n` +
        `⏭️ ${skipped} items skipped`
      );
      
      // Close modal after 3 seconds
      setTimeout(() => {
        setShowImportModal(false);
        setImportedItems([]);
      }, 3000);
      
    } catch (err) {
      console.error("Import processing error:", err);
      showMessage("error", "Failed to process import: " + err.message);
    } finally {
      setProcessingImport(false);
    }
  };

  // ================= TOGGLE IMPORT ITEM SELECTION =================
  const toggleImportItem = (index) => {
    setImportedItems(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // ================= TOGGLE ALL IMPORT ITEMS =================
  const toggleAllImportItems = () => {
    const allSelected = importedItems.every(item => item.selected);
    setImportedItems(prev => 
      prev.map(item => ({ ...item, selected: !allSelected }))
    );
  };

  // ================= PAGINATION FUNCTIONS =================
  const getCurrentPageItems = () => {
    if (search) {
      return items.filter(
        (item) =>
          item.name?.toLowerCase().includes(search.toLowerCase()) ||
          item.model?.toLowerCase().includes(search.toLowerCase()) ||
          item.type?.toLowerCase().includes(search.toLowerCase()) ||
          String(item.id).includes(search)
      );
    }
    return items;
  };

  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      loadProducts(pageNumber);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      loadProducts(newPage);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      loadProducts(newPage);
    }
  };

  // ================= SEARCH =================
  const filteredItems = items.filter(
    (item) =>
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.model?.toLowerCase().includes(search.toLowerCase()) ||
      item.type?.toLowerCase().includes(search.toLowerCase()) ||
      String(item.id).toLowerCase().includes(search.toLowerCase())
  );

  const currentItems = getCurrentPageItems();

  // ================= MODAL STYLES =================
  const modalStyles = {
    overlay: {
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
    content: {
      backgroundColor: '#1f2937',
      padding: '24px',
      borderRadius: '8px',
      width: '90%',
      maxWidth: '600px',
      maxHeight: '80vh',
      overflow: 'auto',
      border: '1px solid #374151',
    },
    largeContent: {
      backgroundColor: '#1f2937',
      padding: '24px',
      borderRadius: '8px',
      width: '90%',
      maxWidth: '900px',
      maxHeight: '80vh',
      overflow: 'auto',
      border: '1px solid #374151',
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
    },
    formGroup: {
      marginBottom: '15px',
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      color: '#9ca3af',
      fontSize: '13px',
      fontWeight: '500',
    },
    input: {
      width: '100%',
      padding: '10px',
      backgroundColor: '#111827',
      border: '1px solid #374151',
      color: '#fff',
      borderRadius: '4px',
      fontSize: '14px',
    },
    readOnlyField: {
      padding: '10px',
      backgroundColor: '#1f2937',
      border: '1px solid #374151',
      color: '#9ca3af',
      borderRadius: '4px',
      fontSize: '14px',
    },
    modalFooter: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      marginTop: '20px',
      paddingTop: '20px',
      borderTop: '1px solid #374151',
    },
    importTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '15px',
    },
    importTh: {
      backgroundColor: '#374151',
      padding: '10px',
      textAlign: 'left',
      color: '#f3f4f6',
      fontSize: '12px',
      position: 'sticky',
      top: 0,
    },
    importTd: {
      padding: '10px',
      borderBottom: '1px solid #374151',
      color: '#f9fafb',
      fontSize: '13px',
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer',
      accentColor: '#6366f1',
    },
    statsContainer: {
      display: 'flex',
      gap: '15px',
      marginTop: '15px',
      padding: '15px',
      backgroundColor: '#111827',
      borderRadius: '6px',
    },
    statBox: {
      flex: 1,
      textAlign: 'center',
      padding: '10px',
      borderRadius: '4px',
    },
    statAdded: {
      backgroundColor: 'rgba(22, 163, 74, 0.2)',
      color: '#4ade80',
    },
    statUpdated: {
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      color: '#818cf8',
    },
    statSkipped: {
      backgroundColor: 'rgba(156, 163, 175, 0.2)',
      color: '#9ca3af',
    },
  };

  // ================= PAGINATION STYLES =================
  const paginationStyles = {
    container: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '20px',
      padding: '10px 0',
    },
    info: {
      color: '#9ca3af',
      fontSize: '14px',
    },
    controls: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px 12px',
      backgroundColor: '#1f2937',
      border: '1px solid #374151',
      color: '#f9fafb',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s',
      minWidth: '40px',
    },
    activeButton: {
      backgroundColor: '#6366f1',
      borderColor: '#6366f1',
    },
    disabledButton: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    pageNumbers: {
      display: 'flex',
      gap: '4px',
    },
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
    },
    pendingBillButton: {
      backgroundColor: "#7c3aed",
      color: "#fff",
      border: "none",
    },
    primaryButton: {
      backgroundColor: "#6366f1",
      color: "#fff",
      border: "none",
    },
    saveButton: {
      backgroundColor: "#16a34a",
      color: "#fff",
      border: "none",
    },
    searchContainer: {
      marginBottom: "20px",
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
    },
    tableContainer: {
      overflowX: "auto",
      borderRadius: "8px",
      border: "1px solid #374151",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      backgroundColor: "#1f2937",
      minWidth: "1300px",
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
      fontSize: "14px",
    },
    actionButtons: {
      display: "flex",
      gap: "8px",
    },
    editButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "6px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#6366f1",
      transition: "background 0.2s",
    },
    deleteButton: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "6px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#ef4444",
      transition: "background 0.2s",
    },
    message: {
      padding: "12px 20px",
      borderRadius: "6px",
      marginBottom: "20px",
      fontSize: "14px",
      fontWeight: "500",
      whiteSpace: "pre-line",
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
      padding: "40px",
      color: "#9ca3af",
    },
    emptyState: {
      textAlign: "center",
      padding: "40px",
      color: "#9ca3af",
      fontStyle: "italic",
    },
    badge: {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "12px",
      fontSize: "11px",
      fontWeight: "500",
      marginLeft: "8px",
    },
    newBadge: {
      backgroundColor: "#6366f1",
      color: "#fff",
    },
  };

  return (
    <div style={styles.container}>
      {/* Edit Item Modal */}
      {showEditModal && editingItem && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.content}>
            <div style={modalStyles.modalHeader}>
              <h2 style={modalStyles.modalTitle}>
                <Edit size={20} style={{ marginRight: '8px', display: 'inline' }} />
                {editingItem.isNew ? 'Add New Item' : 'Edit Item'}
              </h2>
              <button 
                style={modalStyles.closeButton}
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Product Name *</label>
              <input
                style={modalStyles.input}
                value={editingItem.name || ""}
                onChange={(e) => handleEditChange("name", e.target.value)}
                placeholder="Enter product name"
              />
            </div>

            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Model</label>
              <input
                style={modalStyles.input}
                value={editingItem.model || ""}
                onChange={(e) => handleEditChange("model", e.target.value)}
                placeholder="Enter model"
              />
            </div>

            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Type</label>
              <input
                style={modalStyles.input}
                value={editingItem.type || ""}
                onChange={(e) => handleEditChange("type", e.target.value)}
                placeholder="Enter type"
              />
            </div>

            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Warranty</label>
              <input
                style={modalStyles.input}
                value={editingItem.watts || ""}
                onChange={(e) => handleEditChange("watts", e.target.value)}
                placeholder="Enter warranty period"
              />
            </div>

            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Buy Price (₹)</label>
              <input
                style={modalStyles.input}
                type="number"
                min="0"
                step="0.01"
                value={editingItem.buyPrice || ""}
                onChange={(e) => handleEditChange("buyPrice", e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Sell Price (₹)</label>
              <input
                style={modalStyles.input}
                type="number"
                min="0"
                step="0.01"
                value={editingItem.sellPrice || ""}
                onChange={(e) => handleEditChange("sellPrice", e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Quantity</label>
              <input
                style={modalStyles.input}
                type="number"
                min="0"
                step="1"
                value={editingItem.quantity || ""}
                onChange={(e) => handleEditChange("quantity", e.target.value)}
                placeholder="0"
              />
            </div>

            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Amount (₹)</label>
              <div style={modalStyles.readOnlyField}>
                ₹{parseFloat(editingItem.amount || 0).toFixed(2)}
              </div>
            </div>

            <div style={modalStyles.modalFooter}>
              <button 
                style={{...styles.button}}
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                }}
              >
                Cancel
              </button>
              <button 
                style={{...styles.button, ...styles.primaryButton}}
                onClick={handleEditSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : (editingItem.isNew ? 'Create Item' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Items Modal */}
      {showImportModal && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.largeContent}>
            <div style={modalStyles.modalHeader}>
              <h2 style={modalStyles.modalTitle}>
                <Upload size={20} style={{ marginRight: '8px', display: 'inline' }} />
                Import Items ({importedItems.length} found)
              </h2>
              <button 
                style={modalStyles.closeButton}
                onClick={() => {
                  setShowImportModal(false);
                  setImportedItems([]);
                }}
              >
                <X size={20} />
              </button>
            </div>

            {importStats.added > 0 || importStats.updated > 0 || importStats.skipped > 0 ? (
              <div style={modalStyles.statsContainer}>
                <div style={{...modalStyles.statBox, ...modalStyles.statAdded}}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{importStats.added}</div>
                  <div style={{ fontSize: '12px' }}>Added</div>
                </div>
                <div style={{...modalStyles.statBox, ...modalStyles.statUpdated}}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{importStats.updated}</div>
                  <div style={{ fontSize: '12px' }}>Updated</div>
                </div>
                <div style={{...modalStyles.statBox, ...modalStyles.statSkipped}}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{importStats.skipped}</div>
                  <div style={{ fontSize: '12px' }}>Skipped</div>
                </div>
              </div>
            ) : (
              <>
                <p style={{ color: '#9ca3af', marginBottom: '15px' }}>
                  Select the items you want to import. Items with the same name, model, type, watts, and buy price will be updated (quantity added).
                  Items with different sell prices will be created as new items.
                </p>

                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  <table style={modalStyles.importTable}>
                    <thead>
                      <tr>
                        <th style={modalStyles.importTh}>
                          <input
                            type="checkbox"
                            checked={importedItems.every(item => item.selected)}
                            onChange={toggleAllImportItems}
                            style={modalStyles.checkbox}
                          />
                        </th>
                        <th style={modalStyles.importTh}>Name</th>
                        <th style={modalStyles.importTh}>Model</th>
                        <th style={modalStyles.importTh}>Type</th>
                        <th style={modalStyles.importTh}>Warranty</th>
                        <th style={modalStyles.importTh}>Buy Price</th>
                        <th style={modalStyles.importTh}>Sell Price</th>
                        <th style={modalStyles.importTh}>Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importedItems.map((item, index) => (
                        <tr key={item.id}>
                          <td style={modalStyles.importTd}>
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => toggleImportItem(index)}
                              style={modalStyles.checkbox}
                            />
                          </td>
                          <td style={modalStyles.importTd}>{item.name || '-'}</td>
                          <td style={modalStyles.importTd}>{item.model || '-'}</td>
                          <td style={modalStyles.importTd}>{item.type || '-'}</td>
                          <td style={modalStyles.importTd}>{item.watts || '-'}</td>
                          <td style={modalStyles.importTd}>₹{item.buyPrice.toFixed(2)}</td>
                          <td style={modalStyles.importTd}>₹{item.sellPrice.toFixed(2)}</td>
                          <td style={modalStyles.importTd}>{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={modalStyles.modalFooter}>
                  <button 
                    style={{...styles.button}}
                    onClick={() => {
                      setShowImportModal(false);
                      setImportedItems([]);
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    style={{...styles.button, ...styles.primaryButton}}
                    onClick={processImportedItems}
                    disabled={processingImport}
                  >
                    {processingImport ? 'Processing...' : 'Import Selected Items'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pending Bills Modal */}
      {showPendingBillsModal && (
        <div style={modalStyles.overlay}>
          <div style={{...modalStyles.content, maxWidth: '1000px'}}>
            <div style={modalStyles.modalHeader}>
              <h2 style={modalStyles.modalTitle}>
                <Clock size={20} style={{ marginRight: '8px', display: 'inline' }} />
                Pending Bills & Items
              </h2>
              <button 
                style={modalStyles.closeButton}
                onClick={() => {
                  setShowPendingBillsModal(false);
                  setSelectedBill(null);
                  setBillItems([]);
                }}
              >
                <X size={20} />
              </button>
            </div>

            {loadingPendingBills ? (
              <div style={styles.loadingOverlay}>Loading pending bills...</div>
            ) : pendingBills.length === 0 ? (
              <div style={styles.emptyState}>No pending bills found</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
                {/* Bills List */}
                <div style={{ borderRight: '1px solid #374151', paddingRight: '15px' }}>
                  <h3 style={{ color: '#f9fafb', fontSize: '14px', marginBottom: '10px' }}>
                    Bills with Pending Items ({pendingBills.length})
                  </h3>
                  {pendingBills.map((bill) => (
                    <div
                      key={bill.id}
                      style={{
                        backgroundColor: '#374151',
                        padding: '15px',
                        borderRadius: '6px',
                        marginBottom: '10px',
                        cursor: 'pointer',
                        border: selectedBill?.id === bill.id ? '2px solid #6366f1' : '1px solid transparent',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => handleSelectBill(bill)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontWeight: '600', color: '#f9fafb' }}>{bill.billNumber}</span>
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>
                          {formatDate(bill.createdAt)}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        Customer: {bill.customerName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '5px' }}>
                        Pending Items: {bill.pendingItems}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bill Items */}
                <div>
                  {selectedBill ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ color: '#f9fafb', fontSize: '14px', margin: 0 }}>
                          Items for Bill: {selectedBill.billNumber}
                        </h3>
                        <button
                          style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
                          onClick={() => handleProcessBill(selectedBill.id)}
                          disabled={processingBill}
                        >
                          {processingBill ? 'Processing...' : 'Complete All Items'}
                        </button>
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ backgroundColor: '#374151', padding: '10px', textAlign: 'left', color: '#f3f4f6' }}>Product</th>
                            <th style={{ backgroundColor: '#374151', padding: '10px', textAlign: 'left', color: '#f3f4f6' }}>Model</th>
                            <th style={{ backgroundColor: '#374151', padding: '10px', textAlign: 'left', color: '#f3f4f6' }}>Quantity</th>
                            <th style={{ backgroundColor: '#374151', padding: '10px', textAlign: 'left', color: '#f3f4f6' }}>Price</th>
                            <th style={{ backgroundColor: '#374151', padding: '10px', textAlign: 'left', color: '#f3f4f6' }}>Total</th>
                            <th style={{ backgroundColor: '#374151', padding: '10px', textAlign: 'left', color: '#f3f4f6' }}>Status</th>
                            <th style={{ backgroundColor: '#374151', padding: '10px', textAlign: 'left', color: '#f3f4f6' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {billItems.map((item) => (
                            <tr key={item.id}>
                              <td style={{ padding: '10px', borderBottom: '1px solid #374151', color: '#f9fafb' }}>{item.product_name}</td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #374151', color: '#f9fafb' }}>{item.product_model}</td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #374151', color: '#f9fafb' }}>{item.quantity}</td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #374151', color: '#f9fafb' }}>₹{item.sell_price}</td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #374151', color: '#f9fafb' }}>₹{item.total}</td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #374151' }}>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: item.item_status === 'pending' ? '#b45309' : '#059669',
                                  color: '#fff',
                                  fontSize: '11px'
                                }}>
                                  {item.item_status}
                                </span>
                              </td>
                              <td style={{ padding: '10px', borderBottom: '1px solid #374151' }}>
                                {item.item_status === 'pending' && (
                                  <button
                                    style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                    onClick={() => handleProcessBillItem(item.id, selectedBill.id)}
                                  >
                                    <CheckCircle size={14} style={{ marginRight: '4px', display: 'inline' }} />
                                    Complete
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  ) : (
                    <div style={styles.emptyState}>Select a bill to view items</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <h1 style={styles.title}>📦 Products Inventory</h1>
          <button 
            style={styles.refreshButton}
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.button} onClick={handleExport}>
            <Download size={16} /> Export
          </button>

          <label style={styles.button}>
            <Upload size={16} /> Import
            <input 
              type="file" 
              hidden 
              onChange={handleImport}
              accept=".xlsx,.xls,.csv"
            />
          </label>

          <button
            style={{ ...styles.button, ...styles.primaryButton }}
            onClick={handleAddNewItem}
          >
            <Plus size={16} /> Add New
          </button>

          <button
            style={{ ...styles.button, ...styles.saveButton }}
            onClick={handleRefresh}
            disabled={saving}
          >
            <Save size={16} /> {saving ? "Saving..." : "Refresh"}
          </button>
        </div>
      </div>

      {message.text && (
        <div style={{
          ...styles.message,
          ...(message.type === "success" ? styles.successMessage : 
             message.type === "error" ? styles.errorMessage : 
             styles.infoMessage)
        }}>
          {message.text.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      <div style={styles.searchContainer}>
        <div style={styles.searchWrapper}>
          <Search size={16} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by ID, name, model, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <span style={{ color: "#9ca3af", fontSize: "13px" }}>
          {filteredItems.length} item(s) on this page
        </span>
      </div>

      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loadingOverlay}>Loading products...</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>
                  <Hash size={14} style={{ marginRight: '4px', display: 'inline' }} />
                  ID
                </th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Model</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Warranty</th>
                <th style={styles.th}>Buy Price (₹)</th>
                <th style={styles.th}>Sell Price (₹)</th>
                <th style={styles.th}>Quantity</th>
                <th style={styles.th}>Amount (₹)</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="10" style={styles.emptyState}>
                    {search ? "No products match your search on this page" : "No products found. Click 'Add New' to get started."}
                  </td>
                </tr>
              ) : (
                currentItems.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>
                      <span style={{ fontFamily: 'monospace', color: '#9ca3af' }}>
                        #{item.id}
                      </span>
                      {item.isNew && <span style={{...styles.badge, ...styles.newBadge}}>NEW</span>}
                    </td>
                    
                    <td style={styles.td}>{item.name || '-'}</td>
                    
                    <td style={styles.td}>{item.model || '-'}</td>
                    
                    <td style={styles.td}>{item.type || '-'}</td>
                    
                    <td style={styles.td}>{item.watts || '-'}</td>
                    
                    <td style={styles.td}>₹{item.buyPrice?.toFixed(2) || '0.00'}</td>
                    
                    <td style={styles.td}>₹{item.sellPrice?.toFixed(2) || '0.00'}</td>
                    
                    <td style={styles.td}>{item.quantity || 0}</td>
                    
                    <td style={styles.td}>₹{parseFloat(item.amount || 0).toFixed(2)}</td>
                    
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          style={styles.editButton}
                          onClick={() => handleEditClick(item)}
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          style={styles.deleteButton}
                          onClick={() => handleDelete(item.id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div style={paginationStyles.container}>
          <div style={paginationStyles.info}>
            Showing page {currentPage} of {totalPages} | Total items: {totalItems}
          </div>
          
          <div style={paginationStyles.controls}>
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              style={{
                ...paginationStyles.button,
                ...(currentPage === 1 ? paginationStyles.disabledButton : {})
              }}
            >
              <ChevronLeft size={16} />
            </button>
            
            <div style={paginationStyles.pageNumbers}>
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
                      onClick={() => paginate(pageNumber)}
                      style={{
                        ...paginationStyles.button,
                        ...(currentPage === pageNumber ? paginationStyles.activeButton : {})
                      }}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (
                  pageNumber === currentPage - 3 ||
                  pageNumber === currentPage + 3
                ) {
                  return <span key={pageNumber} style={{ color: '#9ca3af', padding: '0 4px' }}>...</span>;
                }
                return null;
              })}
            </div>
            
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              style={{
                ...paginationStyles.button,
                ...(currentPage === totalPages ? paginationStyles.disabledButton : {})
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}