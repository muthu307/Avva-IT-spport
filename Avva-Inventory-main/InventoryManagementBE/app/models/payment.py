# app/models/supplier_payment.py
from app import db
from datetime import datetime

class SupplierPayment(db.Model):
    """Supplier Payment Model for tracking payments to suppliers"""
    __tablename__ = 'supplier_payments'
    
    id = db.Column(db.Integer, primary_key=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.String(50), nullable=False, default='Cash')
    reference_number = db.Column(db.String(100))
    notes = db.Column(db.Text)
    payment_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    supplier = db.relationship('Supplier', backref=db.backref('payments', lazy=True))
    
    def to_dict(self):
        """Convert payment object to dictionary"""
        return {
            'id': self.id,
            'supplier_id': self.supplier_id,
            'amount': float(self.amount) if self.amount else 0,
            'payment_method': self.payment_method,
            'reference_number': self.reference_number,
            'notes': self.notes,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'created_at': (self.created_at.isoformat() + 'Z') if self.created_at else None,
            'updated_at': (self.updated_at.isoformat() + 'Z') if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<SupplierPayment {self.id}: {self.amount} for Supplier {self.supplier_id}>'