# app/models/billing.py
from app import db
from datetime import datetime

class Bill(db.Model):
    __tablename__ = "bills"

    id = db.Column(db.Integer, primary_key=True)
    bill_number = db.Column(db.String(50), unique=True, nullable=False)
    
    # Customer Information
    customer_name = db.Column(db.String(100), nullable=False, default='Walk-in Customer')
    customer_phone = db.Column(db.String(20))
    customer_email = db.Column(db.String(100))
    customer_gst = db.Column(db.String(50))
    customer_address = db.Column(db.String(200))
    customer_type = db.Column(db.String(50), default='regular')  # regular, wholesale, vip, corporate, internal
    
    # Vehicle Information
    vehicle_name = db.Column(db.String(100))
    vehicle_number = db.Column(db.String(50))
    
    # Company Information (from selected company at time of billing)
    company_id = db.Column(db.Integer, nullable=True)  # Reference to company table
    company_name = db.Column(db.String(200), nullable=True)
    company_logo = db.Column(db.String(500), nullable=True)  # Store logo path or URL
    company_address = db.Column(db.String(500), nullable=True)
    company_city = db.Column(db.String(100), nullable=True)
    company_phone = db.Column(db.String(50), nullable=True)
    company_email = db.Column(db.String(100), nullable=True)
    company_gst = db.Column(db.String(50), nullable=True)
    company_alternate_phone = db.Column(db.String(50), nullable=True)
    company_bank_name = db.Column(db.String(100), nullable=True)
    company_bank_account = db.Column(db.String(50), nullable=True)
    company_bank_ifsc = db.Column(db.String(50), nullable=True)
    company_bank_branch = db.Column(db.String(100), nullable=True)
    company_upi_id = db.Column(db.String(100), nullable=True)
    
    # Bill Summary
    subtotal = db.Column(db.Float, default=0)
    discount = db.Column(db.Float, default=0)
    discount_type = db.Column(db.String(20), default='amount')  # 'amount' or 'percentage'
    tax = db.Column(db.Float, default=0)
    tax_type = db.Column(db.String(20), default='percentage')  # 'amount' or 'percentage'
    total = db.Column(db.Float, default=0)
    
    # Payment Information
    paid_amount = db.Column(db.Float, default=0)
    change_amount = db.Column(db.Float, default=0)
    payment_method = db.Column(db.String(50), default='cash')  # cash, card, upi, credit
    payment_status = db.Column(db.String(20), default='pending')  # paid, partial, pending
    
    # Payment details (snapshot at time of billing)
    payment_card_number = db.Column(db.String(20), nullable=True)
    payment_card_holder = db.Column(db.String(100), nullable=True)
    payment_upi_id = db.Column(db.String(100), nullable=True)
    payment_transaction_id = db.Column(db.String(100), nullable=True)
    payment_bank_name = db.Column(db.String(100), nullable=True)
    payment_cheque_number = db.Column(db.String(50), nullable=True)
    cash_received = db.Column(db.Float, default=0)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, nullable=True)  # User ID who created the bill
    created_by_name = db.Column(db.String(100), nullable=True)  # User name for display
    
    # Relationships
    items = db.relationship('BillItem', backref='bill', lazy=True, cascade='all, delete-orphan')
    
    def calculate_totals(self):
        """Calculate all bill totals"""
        self.subtotal = sum(item.total for item in self.items)
        
        # Apply discount
        if self.discount_type == 'percentage':
            discount_amount = (self.subtotal * self.discount) / 100
        else:
            discount_amount = self.discount
        
        # Apply tax
        if self.tax_type == 'percentage':
            tax_amount = ((self.subtotal - discount_amount) * self.tax) / 100
        else:
            tax_amount = self.tax
        
        self.total = self.subtotal - discount_amount + tax_amount
        self.change_amount = max(0, self.paid_amount - self.total)
        
        # Update payment status
        if self.paid_amount >= self.total:
            self.payment_status = 'paid'
        elif self.paid_amount > 0:
            self.payment_status = 'partial'
        else:
            self.payment_status = 'pending'
    
    def to_dict(self):
        return {
            'id': self.id,
            'billNumber': self.bill_number,
            'customer': {
                'name': self.customer_name,
                'phone': self.customer_phone,
                'email': self.customer_email,
                'gst': self.customer_gst,
                'address': self.customer_address,
                'type': self.customer_type
            },
            'company': {
                'id': self.company_id,
                'name': self.company_name,
                'address': self.company_address,
                'city': self.company_city,
                'phone': self.company_phone,
                'email': self.company_email,
                'gst': self.company_gst,
                'alternatePhone': self.company_alternate_phone,
                'bankName': self.company_bank_name,
                'bankAccount': self.company_bank_account,
                'bankIfsc': self.company_bank_ifsc,
                'bankBranch': self.company_bank_branch,
                'upiId': self.company_upi_id
            },
            'vehicle': {
                'name': self.vehicle_name,
                'number': self.vehicle_number
            },
            'summary': {
                'subtotal': round(self.subtotal, 2),
                'discount': round(self.discount, 2),
                'discountType': self.discount_type,
                'tax': round(self.tax, 2),
                'taxType': self.tax_type,
                'total': round(self.total, 2)
            },
            'payment': {
                'paidAmount': round(self.paid_amount, 2),
                'changeAmount': round(self.change_amount, 2),
                'method': self.payment_method,
                'status': self.payment_status,
                'cardNumber': self.payment_card_number,
                'cardHolder': self.payment_card_holder,
                'upiId': self.payment_upi_id,
                'transactionId': self.payment_transaction_id,
                'bankName': self.payment_bank_name,
                'chequeNumber': self.payment_cheque_number,
                'cashReceived': round(self.cash_received, 2) if self.cash_received else 0
            },
            'items': [item.to_dict() for item in self.items],
            'createdAt': (self.created_at.isoformat() + 'Z') if self.created_at else None,
            'updatedAt': (self.updated_at.isoformat() + 'Z') if self.updated_at else None,
            'createdBy': self.created_by,
            'createdByName': self.created_by_name
        }


class BillItem(db.Model):
    __tablename__ = "bill_items"
    
    id = db.Column(db.Integer, primary_key=True)
    bill_id = db.Column(db.Integer, db.ForeignKey('bills.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    
    # Snapshot of product details at time of billing
    product_name = db.Column(db.String(100), nullable=False)
    product_model = db.Column(db.String(100))
    product_type = db.Column(db.String(100))
    sell_price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    total = db.Column(db.Float, nullable=False)
    
    # Item Status
    item_status = db.Column(db.String(20), nullable=False, default='pending')  # pending, completed, cancelled
    
    # Relationship
    product = db.relationship('Product')
    
    def to_dict(self):
        return {
            'id': self.id,
            'productId': self.product_id,
            'productName': self.product_name,
            'productModel': self.product_model,
            'productType': self.product_type,
            'sellPrice': round(self.sell_price, 2),
            'quantity': self.quantity,
            'total': round(self.total, 2),
            'itemStatus': self.item_status
        }


class Payment(db.Model):
    __tablename__ = "payments"
    
    id = db.Column(db.Integer, primary_key=True)
    bill_id = db.Column(db.Integer, db.ForeignKey('bills.id'), nullable=False)
    payment_id = db.Column(db.String(100), unique=True)
    amount = db.Column(db.Float, nullable=False)
    method = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='completed')
    reference = db.Column(db.String(100))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    bill = db.relationship('Bill', backref='payments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'paymentId': self.payment_id,
            'amount': round(self.amount, 2),
            'method': self.method,
            'status': self.status,
            'reference': self.reference,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }