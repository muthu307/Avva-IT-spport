from app import db
from datetime import datetime

class Attendance(db.Model):
    __tablename__ = 'attendance'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    check_in_time = db.Column(db.DateTime, nullable=True)
    break_1_start = db.Column(db.DateTime, nullable=True)
    break_1_end = db.Column(db.DateTime, nullable=True)
    break_2_start = db.Column(db.DateTime, nullable=True)
    break_2_end = db.Column(db.DateTime, nullable=True)
    check_out_time = db.Column(db.DateTime, nullable=True)
    total_break_time = db.Column(db.Float, default=0.0)  # total break duration in minutes
    excess_break_time = db.Column(db.Float, default=0.0) # excess break duration in minutes (>15 mins per break)
    status = db.Column(db.String(20), default='present')  # present, absent, late, half-day
    total_hours = db.Column(db.Float, default=0.0)  # net working hours excluding break time
    overtime = db.Column(db.Float, default=0.0)  # overtime hours
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    employee = db.relationship('Employee', backref='attendances')
    
    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_code': self.employee.employee_id if self.employee else None,
            'employee_name': self.employee.full_name if self.employee else None,
            'department': self.employee.department if self.employee else None,
            'designation': self.employee.designation if self.employee else None,
            'barcode': self.employee.barcode if self.employee else None,
            'date': self.date.isoformat() if self.date else None,
            'check_in_time': self.check_in_time.isoformat() if self.check_in_time else None,
            'break_1_start': self.break_1_start.isoformat() if self.break_1_start else None,
            'break_1_end': self.break_1_end.isoformat() if self.break_1_end else None,
            'break_2_start': self.break_2_start.isoformat() if self.break_2_start else None,
            'break_2_end': self.break_2_end.isoformat() if self.break_2_end else None,
            'check_out_time': self.check_out_time.isoformat() if self.check_out_time else None,
            'total_break_time': self.total_break_time or 0.0,
            'excess_break_time': self.excess_break_time or 0.0,
            'status': self.status,
            'total_hours': self.total_hours or 0.0,
            'overtime': self.overtime or 0.0,
            'notes': self.notes
        }