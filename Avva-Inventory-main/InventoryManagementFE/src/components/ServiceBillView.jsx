// pages/ServiceBills.jsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  Button,
  Box,
  Chip,
  IconButton,
  Collapse,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import api from '../utils/api';
import { parseDateTime } from '../utils/dateUtils';

const ServiceBills = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    customer_name: '',
    from_date: null,
    to_date: null,
    page: 1,
    bill_number: 'HPS' // Add bill number filter with HPS prefix
  });
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 1,
    current_page: 1,
  });
  const [selectedBill, setSelectedBill] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [dialogLoading, setDialogLoading] = useState(false);

  // Fetch bills on component mount and filter changes
  useEffect(() => {
    fetchBills();
  }, [filters.page]);

  const fetchBills = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', filters.page);
      params.append('per_page', '10');
      
      if (filters.customer_name) {
        params.append('customer_name', filters.customer_name);
      }
      if (filters.from_date) {
        params.append('from_date', format(filters.from_date, 'yyyy-MM-dd'));
      }
      if (filters.to_date) {
        params.append('to_date', format(filters.to_date, 'yyyy-MM-dd'));
      }
      // Always append bill_number filter with HPS to show only HPS bills
      params.append('bill_number', 'HPS');

      console.log('Fetching bills with params:', params.toString());
      
      const response = await api.get(`/service-bills?${params.toString()}`);
      
      if (response.data) {
        // Additional client-side filtering to ensure only HPS bills are shown
        const hpsBills = (response.data.bills || []).filter(bill => 
          bill.billNumber && bill.billNumber.startsWith('HPS')
        );
        
        setBills(hpsBills);
        setPagination({
          total: hpsBills.length,
          pages: Math.ceil(hpsBills.length / 10) || 1,
          current_page: response.data.current_page || 1,
        });
      }
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError(err.response?.data?.error || 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchBillDetails = async (billId) => {
    setDialogLoading(true);
    try {
      console.log('Fetching bill details for ID:', billId);
      const response = await api.get(`/service-bills/${billId}`);
      
      if (response.data) {
        setSelectedBill(response.data);
        setOpenDialog(true);
      }
    } catch (err) {
      console.error('Error fetching bill details:', err);
      setError(err.response?.data?.error || 'Failed to fetch bill details');
    } finally {
      setDialogLoading(false);
    }
  };

  const fetchServiceItems = async (billId) => {
    try {
      console.log('Fetching service items for bill:', billId);
      const response = await api.get(`/bills/${billId}/service-items`);
      return response.data;
    } catch (err) {
      console.error('Error fetching service items:', err);
      return [];
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1, // Reset to first page on filter change
    }));
  };

  const handleSearch = () => {
    fetchBills();
  };

  const handleReset = () => {
    setFilters({
      customer_name: '',
      from_date: null,
      to_date: null,
      page: 1,
      bill_number: 'HPS', // Keep HPS filter on reset
    });
    // Fetch after state update
    setTimeout(() => fetchBills(), 0);
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const toggleRowExpand = (billId) => {
    setExpandedRows(prev => ({
      ...prev,
      [billId]: !prev[billId]
    }));
  };

  const getPaymentStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'partial':
        return 'warning';
      case 'pending':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const Row = ({ bill }) => {
    const [items, setItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);

    const loadItems = async () => {
      if (expandedRows[bill.id] && items.length === 0) {
        setLoadingItems(true);
        const data = await fetchServiceItems(bill.id);
        setItems(data);
        setLoadingItems(false);
      }
    };

    useEffect(() => {
      if (expandedRows[bill.id]) {
        loadItems();
      }
    }, [expandedRows[bill.id]]);

    return (
      <>
        <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
          <TableCell>
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => toggleRowExpand(bill.id)}
            >
              {expandedRows[bill.id] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
          </TableCell>
          <TableCell>
            <Typography variant="body2" fontWeight="medium">
              {bill.billNumber}
            </Typography>
          </TableCell>
          <TableCell>{bill.customerName}</TableCell>
          <TableCell>{bill.customerPhone || 'N/A'}</TableCell>
          <TableCell align="right">{formatCurrency(bill.total)}</TableCell>
          <TableCell align="right">{formatCurrency(bill.paidAmount)}</TableCell>
          <TableCell>
            <Chip
              label={bill.paymentStatus || 'pending'}
              color={getPaymentStatusColor(bill.paymentStatus)}
              size="small"
            />
          </TableCell>
          <TableCell>
            {bill.createdAt ? format(parseDateTime(bill.createdAt), 'dd/MM/yyyy HH:mm') : 'N/A'}
          </TableCell>
          <TableCell>
            <IconButton
              size="small"
              color="primary"
              onClick={() => fetchBillDetails(bill.id)}
            >
              <ViewIcon />
            </IconButton>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
            <Collapse in={expandedRows[bill.id]} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 2 }}>
                <Typography variant="h6" gutterBottom component="div">
                  Service Items
                </Typography>
                {loadingItems ? (
                  <Box display="flex" justifyContent="center" p={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : items.length > 0 ? (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Service Name</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">GST %</TableCell>
                        <TableCell align="right">GST Amount</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.serviceName}</TableCell>
                          <TableCell>{item.serviceDescription || '-'}</TableCell>
                          <TableCell align="right">{formatCurrency(item.price)}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{item.gstRate}%</TableCell>
                          <TableCell align="right">{formatCurrency(item.gstAmount)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography variant="body2" color="textSecondary" align="center">
                    No items found
                  </Typography>
                )}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h1">
            Service Bills (HPS Only)
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchBills}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {/* Filters */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="Customer Name"
              value={filters.customer_name}
              onChange={(e) => handleFilterChange('customer_name', e.target.value)}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="From Date"
                value={filters.from_date}
                onChange={(date) => handleFilterChange('from_date', date)}
                disabled={loading}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small'
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="To Date"
                value={filters.to_date}
                onChange={(date) => handleFilterChange('to_date', date)}
                disabled={loading}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small'
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Box display="flex" gap={1}>
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={handleSearch}
                fullWidth
                disabled={loading}
              >
                Search
              </Button>
              <Button 
                variant="outlined" 
                onClick={handleReset}
                disabled={loading}
              >
                Reset
              </Button>
            </Box>
          </Grid>
        </Grid>
        
        {/* HPS Filter Indicator */}
        <Box mt={2}>
          <Chip 
            label="Filtering: HPS bills only" 
            color="primary" 
            size="small"
            icon={<ReceiptIcon />}
          />
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Bill Number</TableCell>
              <TableCell>Customer Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Paid</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : bills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="textSecondary">
                    No HPS service bills found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              bills.map((bill) => <Row key={bill.id} bill={bill} />)
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
          <Button
            variant="outlined"
            disabled={filters.page === 1 || loading}
            onClick={() => handlePageChange(filters.page - 1)}
          >
            Previous
          </Button>
          <Typography sx={{ mx: 2 }}>
            Page {filters.page} of {pagination.pages}
          </Typography>
          <Button
            variant="outlined"
            disabled={filters.page === pagination.pages || loading}
            onClick={() => handlePageChange(filters.page + 1)}
          >
            Next
          </Button>
        </Box>
      )}

      {/* Bill Details Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedBill && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={1}>
                <ReceiptIcon />
                <Typography variant="h6">
                  Bill Details - {selectedBill.bill?.billNumber}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              {dialogLoading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {/* Customer Information */}
                  <Card variant="outlined" sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                        Customer Information
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            Name: {selectedBill.bill?.customerName || 'N/A'}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Phone: {selectedBill.bill?.customerPhone || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            Email: {selectedBill.bill?.customerEmail || 'N/A'}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            GST: {selectedBill.bill?.customerGST || 'N/A'}
                          </Typography>
                        </Grid>
                        {selectedBill.bill?.customerAddress && (
                          <Grid item xs={12}>
                            <Typography variant="body2" color="textSecondary">
                              Address: {selectedBill.bill.customerAddress}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Service Items */}
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    Service Items
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Service</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell align="right">Price</TableCell>
                          <TableCell align="right">Qty</TableCell>
                          <TableCell align="right">GST %</TableCell>
                          <TableCell align="right">GST Amt</TableCell>
                          <TableCell align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedBill.items && selectedBill.items.length > 0 ? (
                          selectedBill.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.serviceName}</TableCell>
                              <TableCell>{item.serviceDescription || '-'}</TableCell>
                              <TableCell align="right">{formatCurrency(item.price)}</TableCell>
                              <TableCell align="right">{item.quantity}</TableCell>
                              <TableCell align="right">{item.gstRate}%</TableCell>
                              <TableCell align="right">{formatCurrency(item.gstAmount)}</TableCell>
                              <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              No items found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Bill Summary */}
                  <Card variant="outlined">
                    <CardContent>
                      <Grid container spacing={2} justifyContent="flex-end">
                        <Grid item xs={6} sm={4}>
                          <Typography variant="body2" color="textSecondary">
                            Subtotal:
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Tax (GST):
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Discount:
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            Total:
                          </Typography>
                          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Paid Amount:
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Due Amount:
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={4}>
                          <Typography variant="body2" align="right">
                            {formatCurrency(selectedBill.bill?.subtotal)}
                          </Typography>
                          <Typography variant="body2" align="right">
                            {formatCurrency(selectedBill.bill?.tax)}
                          </Typography>
                          <Typography variant="body2" align="right">
                            {formatCurrency(selectedBill.bill?.discount)} 
                            {selectedBill.bill?.discountType && ` (${selectedBill.bill.discountType})`}
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" align="right">
                            {formatCurrency(selectedBill.bill?.total)}
                          </Typography>
                          <Typography variant="body2" align="right" sx={{ mt: 1 }}>
                            {formatCurrency(selectedBill.bill?.paidAmount)}
                          </Typography>
                          <Typography variant="body2" align="right">
                            {formatCurrency((selectedBill.bill?.total || 0) - (selectedBill.bill?.paidAmount || 0))}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Box display="flex" justifyContent="flex-end" mt={2}>
                            <Chip
                              label={`Payment Status: ${selectedBill.bill?.paymentStatus || 'pending'}`}
                              color={getPaymentStatusColor(selectedBill.bill?.paymentStatus)}
                            />
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>Close</Button>
              <Button
                variant="contained"
                onClick={() => window.open(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/service-bills/${selectedBill.bill?.id}/pdf`, '_blank')}
                disabled={!selectedBill.bill?.id}
              >
                Download PDF
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default ServiceBills;