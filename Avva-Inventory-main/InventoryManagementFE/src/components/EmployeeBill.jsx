import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Pagination,
  Stack,
  useTheme,
  alpha
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  ShoppingCart as CartIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../utils/api';
import * as XLSX from 'xlsx';

const RecentBills = () => {
  const theme = useTheme();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBills, setTotalBills] = useState(0);
  const [selectedBill, setSelectedBill] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    billCount: 0,
    averageBill: 0,
    uniqueCustomers: 0
  });

  const rowsPerPage = 20;

  // Calculate last 48 hours date range
  const getLast48HoursRange = useCallback(() => {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    return {
      start_date: fortyEightHoursAgo.toISOString(),
      end_date: now.toISOString()
    };
  }, []);

  // Fetch bills from last 48 hours
  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dateRange = getLast48HoursRange();
      let url = `/billing/bills?page=${page}&per_page=${rowsPerPage}`;
      
      // Add date filters for last 48 hours
      url += `&start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`;
      
      // Add other filters
      if (searchTerm) {
        url += `&customer=${encodeURIComponent(searchTerm)}`;
      }
      if (customerTypeFilter !== 'all') {
        url += `&customer_type=${customerTypeFilter}`;
      }
      if (paymentMethodFilter !== 'all') {
        url += `&payment_method=${paymentMethodFilter}`;
      }
      if (paymentStatusFilter !== 'all') {
        url += `&payment_status=${paymentStatusFilter}`;
      }
      if (startDate) {
        url += `&start_date=${startDate.toISOString()}`;
      }
      if (endDate) {
        url += `&end_date=${endDate.toISOString()}`;
      }

      const response = await api.get(url);
      
      if (response.data && response.data.bills) {
        setBills(response.data.bills);
        setTotalPages(response.data.pages || 1);
        setTotalBills(response.data.total || 0);
        calculateStats(response.data.bills);
      } else {
        setBills([]);
        setTotalPages(1);
        setTotalBills(0);
      }
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError(err.response?.data?.error || 'Failed to fetch bills');
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, customerTypeFilter, paymentMethodFilter, paymentStatusFilter, startDate, endDate, getLast48HoursRange]);

  // Calculate statistics from bills
  const calculateStats = (billsData) => {
    const totalSales = billsData.reduce((sum, bill) => sum + bill.total, 0);
    const billCount = billsData.length;
    const averageBill = billCount > 0 ? totalSales / billCount : 0;
    const uniqueCustomers = new Set(billsData.map(bill => bill.customerPhone).filter(phone => phone)).size;
    
    setStats({
      totalSales,
      billCount,
      averageBill,
      uniqueCustomers
    });
  };

  // View bill details
  const viewBillDetails = async (billId) => {
    try {
      const response = await api.get(`/billing/bills/${billId}`);
      if (response.data) {
        setSelectedBill(response.data);
        setDialogOpen(true);
      }
    } catch (err) {
      console.error('Error fetching bill details:', err);
      setError('Failed to fetch bill details');
    }
  };

  // Print bill
  const printBill = (bill) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Bill ${bill.billNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; }
            .bill-title { font-size: 18px; margin: 10px 0; }
            .customer-info { margin: 20px 0; padding: 10px; background: #f5f5f5; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .totals { text-align: right; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${bill.company?.name || 'Brain Tech'}</div>
            <div>${bill.company?.address || ''}</div>
            <div>GST: ${bill.company?.gst || ''}</div>
            <div class="bill-title">BILL ${bill.billNumber}</div>
          </div>
          
          <div class="customer-info">
            <strong>Customer:</strong> ${bill.customerName}<br/>
            <strong>Phone:</strong> ${bill.customerPhone || 'N/A'}<br/>
            <strong>Date:</strong> ${new Date(bill.createdAt).toLocaleString()}
          </div>
          
          <table>
            <thead>
              <tr><th>Product</th><th>Model</th><th>Qty</th><th>Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${bill.items.map(item => `
                <tr>
                  <td>${item.product_name}</td>
                  <td>${item.product_model || '-'}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.sell_price}</td>
                  <td>₹${item.total}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div>Subtotal: ₹${bill.subtotal}</div>
            <div>Discount: ₹${bill.discount}</div>
            <div>Tax: ₹${bill.tax}</div>
            <div><strong>Total: ₹${bill.total}</strong></div>
            <div>Paid: ₹${bill.paidAmount}</div>
            <div>Balance: ₹${(bill.total - bill.paidAmount).toFixed(2)}</div>
          </div>
          
          <div class="footer">
            Thank you for your business!<br/>
            This is a computer generated bill
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportData = bills.map(bill => ({
      'Bill Number': bill.billNumber,
      'Customer Name': bill.customerName,
      'Customer Phone': bill.customerPhone,
      'Customer Type': bill.customerType,
      'Vehicle Number': bill.vehicleNumber || 'N/A',
      'Subtotal': bill.subtotal,
      'Discount': bill.discount,
      'Tax': bill.tax,
      'Total': bill.total,
      'Paid Amount': bill.paidAmount,
      'Payment Method': bill.paymentMethod,
      'Payment Status': bill.paymentStatus,
      'Date': new Date(bill.createdAt).toLocaleString(),
      'Created By': bill.createdByName || 'System'
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Last 48 Hours Bills');
    XLSX.writeFile(wb, `bills_last_48h_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Auto refresh every 30 seconds
  useEffect(() => {
    fetchBills();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchBills();
      }, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchBills, autoRefresh]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, customerTypeFilter, paymentMethodFilter, paymentStatusFilter, startDate, endDate]);

  // Get status chip color
  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'partial': return 'warning';
      case 'pending': return 'error';
      default: return 'default';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`, color: 'white' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
            <Box>
              <Typography variant="h4" gutterBottom display="flex" alignItems="center" gap={1}>
                <TimeIcon /> Recent Bills - Last 48 Hours
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Showing bills from the last 48 hours • Auto-refreshes every 30 seconds
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Tooltip title="Refresh">
                <IconButton onClick={fetchBills} sx={{ color: 'white', bgcolor: alpha(theme.palette.common.white, 0.2), '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.3) } }}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export to Excel">
                <IconButton onClick={exportToExcel} sx={{ color: 'white', bgcolor: alpha(theme.palette.common.white, 0.2), '&:hover': { bgcolor: alpha(theme.palette.common.white, 0.3) } }}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total Bills
                    </Typography>
                    <Typography variant="h4">
                      {stats.billCount}
                    </Typography>
                  </Box>
                  <ReceiptIcon sx={{ fontSize: 40, color: theme.palette.primary.main, opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total Sales
                    </Typography>
                    <Typography variant="h4">
                      ₹{stats.totalSales.toLocaleString()}
                    </Typography>
                  </Box>
                  <MoneyIcon sx={{ fontSize: 40, color: theme.palette.success.main, opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Average Bill
                    </Typography>
                    <Typography variant="h4">
                      ₹{stats.averageBill.toLocaleString()}
                    </Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 40, color: theme.palette.warning.main, opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Unique Customers
                    </Typography>
                    <Typography variant="h4">
                      {stats.uniqueCustomers}
                    </Typography>
                  </Box>
                  <PeopleIcon sx={{ fontSize: 40, color: theme.palette.info.main, opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by customer name or phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Customer Type</InputLabel>
                <Select
                  value={customerTypeFilter}
                  onChange={(e) => setCustomerTypeFilter(e.target.value)}
                  label="Customer Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="regular">Regular</MenuItem>
                  <MenuItem value="wholesale">Wholesale</MenuItem>
                  <MenuItem value="corporate">Corporate</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  label="Payment Method"
                >
                  <MenuItem value="all">All Methods</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="upi">UPI</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Status</InputLabel>
                <Select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  label="Payment Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="partial">Partial</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Box display="flex" gap={1}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={setStartDate}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={setEndDate}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Bills Table */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Bill Number</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Vehicle</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Paid</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date & Time</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Alert severity="error">{error}</Alert>
                    </TableCell>
                  </TableRow>
                ) : bills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Alert severity="info">No bills found in the last 48 hours</Alert>
                    </TableCell>
                  </TableRow>
                ) : (
                  bills.map((bill) => (
                    <TableRow 
                      key={bill.id} 
                      hover
                      onClick={() => viewBillDetails(bill.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          {bill.billNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>{bill.customerName}</TableCell>
                      <TableCell>{bill.customerPhone || '-'}</TableCell>
                      <TableCell>{bill.vehicleNumber || '-'}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold">
                          ₹{bill.total.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        ₹{bill.paidAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={bill.paymentMethod?.toUpperCase() || 'CASH'} 
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={bill.paymentStatus?.toUpperCase() || 'PENDING'} 
                          color={getPaymentStatusColor(bill.paymentStatus)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(bill.createdAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              viewBillDetails(bill.id);
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Print Bill">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={(e) => {
                              e.stopPropagation();
                              printBill(bill);
                            }}
                          >
                            <PrintIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" p={2}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={(e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </Paper>

        {/* Bill Details Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          {selectedBill && (
            <>
              <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">Bill Details - {selectedBill.billNumber}</Typography>
                  <IconButton onClick={() => setDialogOpen(false)} size="small">
                    <RefreshIcon />
                  </IconButton>
                </Box>
              </DialogTitle>
              <DialogContent dividers>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">Customer Information</Typography>
                    <Typography><strong>Name:</strong> {selectedBill.customerName}</Typography>
                    <Typography><strong>Phone:</strong> {selectedBill.customerPhone || 'N/A'}</Typography>
                    <Typography><strong>Email:</strong> {selectedBill.customerEmail || 'N/A'}</Typography>
                    <Typography><strong>Type:</strong> {selectedBill.customerType}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">Vehicle Information</Typography>
                    <Typography><strong>Vehicle:</strong> {selectedBill.vehicleName || 'N/A'}</Typography>
                    <Typography><strong>Number:</strong> {selectedBill.vehicleNumber || 'N/A'}</Typography>
                    <Typography><strong>Bill Date:</strong> {new Date(selectedBill.createdAt).toLocaleString()}</Typography>
                    <Typography><strong>Created By:</strong> {selectedBill.createdByName}</Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>Items</Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Product</TableCell>
                            <TableCell>Model</TableCell>
                            <TableCell align="right">Qty</TableCell>
                            <TableCell align="right">Price</TableCell>
                            <TableCell align="right">Total</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedBill.items?.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{item.product_name}</TableCell>
                              <TableCell>{item.product_model || '-'}</TableCell>
                              <TableCell align="right">{item.quantity}</TableCell>
                              <TableCell align="right">₹{item.sell_price}</TableCell>
                              <TableCell align="right">₹{item.total}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="flex-end" mt={2}>
                      <Box textAlign="right">
                        <Typography>Subtotal: ₹{selectedBill.subtotal}</Typography>
                        <Typography>Discount: ₹{selectedBill.discount}</Typography>
                        <Typography>Tax: ₹{selectedBill.tax}</Typography>
                        <Typography variant="h6">Total: ₹{selectedBill.total}</Typography>
                        <Typography color="success.main">Paid: ₹{selectedBill.paidAmount}</Typography>
                        <Typography color="error.main">Balance: ₹{(selectedBill.total - selectedBill.paidAmount).toFixed(2)}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => printBill(selectedBill)} startIcon={<PrintIcon />} color="primary">
                  Print Bill
                </Button>
                <Button onClick={() => setDialogOpen(false)}>Close</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default RecentBills;