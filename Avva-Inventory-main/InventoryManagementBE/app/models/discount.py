from app import db
from datetime import datetime
import json

class DiscountRange(db.Model):
    """Discount range configuration for automatic discounts"""
    __tablename__ = 'discount_ranges'
    
    id = db.Column(db.Integer, primary_key=True)
    min_amount = db.Column(db.Float, nullable=False)
    max_amount = db.Column(db.Float, nullable=True)  # None means infinity
    discount_percent = db.Column(db.Float, nullable=False, default=0)
    is_infinite = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    
    # Optional: Track who created/updated
    created_by = db.Column(db.Integer, nullable=True)
    updated_by = db.Column(db.Integer, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert discount range to dictionary"""
        return {
            'id': self.id,
            'min': self.min_amount,
            'max': self.max_amount,
            'discount': self.discount_percent,
            'isInfinite': self.is_infinite,
            'isActive': self.is_active,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        if self.is_infinite:
            return f'<DiscountRange ₹{self.min_amount} - ∞: {self.discount_percent}%>'
        return f'<DiscountRange ₹{self.min_amount} - ₹{self.max_amount}: {self.discount_percent}%>'


class DiscountLog(db.Model):
    """Audit log for discount range changes"""
    __tablename__ = 'discount_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    range_id = db.Column(db.Integer, db.ForeignKey('discount_ranges.id', ondelete='SET NULL'), nullable=True)
    action = db.Column(db.String(20), nullable=False)  # CREATE, UPDATE, DELETE, RESTORE, BULK_CREATE
    old_values = db.Column(db.Text, nullable=True)  # JSON string
    new_values = db.Column(db.Text, nullable=True)  # JSON string
    changed_by = db.Column(db.Integer, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'rangeId': self.range_id,
            'action': self.action,
            'oldValues': json.loads(self.old_values) if self.old_values else None,
            'newValues': json.loads(self.new_values) if self.new_values else None,
            'changedBy': self.changed_by,
            'ipAddress': self.ip_address,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<DiscountLog {self.action} - Range {self.range_id}>'