# app/models/salary.py
from app import db
from datetime import datetime

class SalaryStructure(db.Model):
    """Salary Structure Model - Stores compensation details for employees"""
    __tablename__ = 'salary_structures'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False, unique=True)
    base_salary = db.Column(db.Float, nullable=False, default=0.0)
    hra = db.Column(db.Float, default=0.0)
    transport_allowance = db.Column(db.Float, default=0.0)
    medical_allowance = db.Column(db.Float, default=0.0)
    special_allowance = db.Column(db.Float, default=0.0)
    pf_deduction = db.Column(db.Float, default=0.0)
    esi_deduction = db.Column(db.Float, default=0.0)
    tds_deduction = db.Column(db.Float, default=0.0)
    other_deductions = db.Column(db.Float, default=0.0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    employee = db.relationship('Employee', backref=db.backref('salary_structure', uselist=False))
    
    @property
    def total_allowances(self):
        return (self.hra or 0.0) + (self.transport_allowance or 0.0) + (self.medical_allowance or 0.0) + (self.special_allowance or 0.0)

    @property
    def gross_salary(self):
        return (self.base_salary or 0.0) + self.total_allowances
        
    @property
    def total_deductions(self):
        return (self.pf_deduction or 0.0) + (self.esi_deduction or 0.0) + (self.tds_deduction or 0.0) + (self.other_deductions or 0.0)
        
    @property
    def net_salary(self):
        return self.gross_salary - self.total_deductions

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': self.employee.full_name if self.employee else None,
            'employee_code': self.employee.employee_id if self.employee else None,
            'department': self.employee.department if self.employee else None,
            'designation': self.employee.designation if self.employee else None,
            'base_salary': self.base_salary,
            'hra': self.hra,
            'transport_allowance': self.transport_allowance,
            'medical_allowance': self.medical_allowance,
            'special_allowance': self.special_allowance,
            'total_allowances': self.total_allowances,
            'pf_deduction': self.pf_deduction,
            'esi_deduction': self.esi_deduction,
            'tds_deduction': self.tds_deduction,
            'other_deductions': self.other_deductions,
            'gross_salary': self.gross_salary,
            'total_deductions': self.total_deductions,
            'net_salary': self.net_salary,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Payroll(db.Model):
    """Payroll Model - Monthly generated salary slips for employees"""
    __tablename__ = 'payrolls'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    month = db.Column(db.Integer, nullable=False)  # 1 to 12
    year = db.Column(db.Integer, nullable=False)   # e.g., 2026
    
    total_working_days = db.Column(db.Integer, default=26)
    present_days = db.Column(db.Float, default=0.0)
    absent_days = db.Column(db.Float, default=0.0)
    half_days = db.Column(db.Integer, default=0)
    overtime_hours = db.Column(db.Float, default=0.0)
    
    base_earned = db.Column(db.Float, default=0.0)
    allowances_earned = db.Column(db.Float, default=0.0)
    overtime_pay = db.Column(db.Float, default=0.0)
    bonus = db.Column(db.Float, default=0.0)
    gross_earnings = db.Column(db.Float, default=0.0)
    
    statutory_deductions = db.Column(db.Float, default=0.0)
    absenteeism_deductions = db.Column(db.Float, default=0.0)
    total_deductions = db.Column(db.Float, default=0.0)
    
    net_payable = db.Column(db.Float, default=0.0)
    
    payment_status = db.Column(db.String(20), default='Pending')  # Pending, Paid, Cancelled
    payment_date = db.Column(db.Date, nullable=True)
    payment_mode = db.Column(db.String(50), nullable=True)  # Bank Transfer, Cash, Cheque, UPI
    transaction_ref = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    notification_sent = db.Column(db.Boolean, default=False)
    notification_read = db.Column(db.Boolean, default=False)
    notification_message = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    employee = db.relationship('Employee', backref='payrolls')

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': self.employee.full_name if self.employee else None,
            'employee_code': self.employee.employee_id if self.employee else None,
            'department': self.employee.department if self.employee else None,
            'designation': self.employee.designation if self.employee else None,
            'month': self.month,
            'year': self.year,
            'total_working_days': self.total_working_days,
            'present_days': self.present_days,
            'absent_days': self.absent_days,
            'half_days': self.half_days,
            'overtime_hours': self.overtime_hours,
            'base_earned': self.base_earned,
            'allowances_earned': self.allowances_earned,
            'overtime_pay': self.overtime_pay,
            'bonus': self.bonus,
            'gross_earnings': self.gross_earnings,
            'statutory_deductions': self.statutory_deductions,
            'absenteeism_deductions': self.absenteeism_deductions,
            'total_deductions': self.total_deductions,
            'net_payable': self.net_payable,
            'payment_status': self.payment_status,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'payment_mode': self.payment_mode,
            'transaction_ref': self.transaction_ref,
            'notes': self.notes,
            'notification_sent': self.notification_sent,
            'notification_read': self.notification_read,
            'notification_message': self.notification_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
