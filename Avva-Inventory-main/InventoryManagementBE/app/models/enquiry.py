from app import db
from datetime import datetime, date


class Enquiry(db.Model):
    """Customer Enquiry / CRM Model"""
    __tablename__ = 'enquiries'

    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(200), nullable=False)
    contact_number = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(150))
    age = db.Column(db.Integer)

    # Meet-up / Visit details
    meetup_date = db.Column(db.Date, nullable=False)  # date customer is expected to visit
    is_coming_today = db.Column(db.Boolean, default=False)  # Did customer confirm today?

    # Car interest
    car_interest = db.Column(db.String(200))  # which car they are interested in
    notes = db.Column(db.Text)

    # Follow-up / Status
    status = db.Column(db.String(50), default='Pending')  # Pending / Visited / Cancelled
    called = db.Column(db.Boolean, default=False)
    next_followup_date = db.Column(db.Date)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        today = date.today()
        meetup = self.meetup_date
        is_today = meetup == today if meetup else False
        is_overdue = meetup < today if meetup else False

        return {
            'id': self.id,
            'customer_name': self.customer_name,
            'contact_number': self.contact_number,
            'email': self.email,
            'age': self.age,
            'meetup_date': self.meetup_date.isoformat() if self.meetup_date else None,
            'is_coming_today': self.is_coming_today,
            'is_today': is_today,
            'is_overdue': is_overdue,
            'car_interest': self.car_interest,
            'notes': self.notes,
            'status': self.status,
            'called': self.called,
            'next_followup_date': self.next_followup_date.isoformat() if self.next_followup_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<Enquiry {self.id} - {self.customer_name}>'
