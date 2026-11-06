from app import db
from datetime import datetime


class ITDeveloper(db.Model):
    """
    IT Support Engineer / Support Team Member Model.
    Managed by Admin and used to assign IT tickets and track performance.
    """
    __tablename__ = 'it_developers'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True, index=True)
    phone = db.Column(db.String(30))
    email = db.Column(db.String(150))
    role = db.Column(db.String(100), default='IT Support Engineer')
    specialization = db.Column(db.String(150), default='Full Stack & IT Support')
    status = db.Column(db.String(30), default='Active')  # Active, On Leave, Busy, Inactive
    avatar_color = db.Column(db.String(30), default='#3b82f6')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'email': self.email,
            'role': self.role,
            'specialization': self.specialization,
            'status': self.status,
            'avatar_color': self.avatar_color,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<ITDeveloper {self.name} - {self.role}>'


class ITSupportTicket(db.Model):
    """IT Support Ticket Model"""
    __tablename__ = 'it_support_tickets'

    id = db.Column(db.Integer, primary_key=True)
    ticket_number = db.Column(db.String(30), unique=True, nullable=False, index=True)

    # Client info (captured at ticket creation time)
    client_name = db.Column(db.String(200), nullable=False)
    client_email = db.Column(db.String(150), nullable=False)
    company_name = db.Column(db.String(200))           # Customer's company / department
    contact_number = db.Column(db.String(30))

    # Ticket details
    category = db.Column(db.String(50), nullable=False, default='Other')
    # Category choices: Hardware, Software, Network, Printer, Email, Access, Other

    priority = db.Column(db.String(20), nullable=False, default='Medium')
    # Priority choices: Low, Medium, High, Critical

    subject = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, nullable=False)

    # Status management
    status = db.Column(db.String(30), nullable=False, default='Open')
    # Status choices: Open, In Progress, Resolved, Closed

    # Progress tracking (0 - 100%)
    progress_percentage = db.Column(db.Integer, default=0)
    developer_notes = db.Column(db.Text)

    # Admin fields
    admin_notes = db.Column(db.Text)
    assigned_to = db.Column(db.String(150))        # Developer/team member name
    assigned_developer_id = db.Column(db.Integer, nullable=True) # Linked developer id
    assigned_to_phone = db.Column(db.String(30))   # Developer phone (for WhatsApp)
    assigned_by = db.Column(db.String(150))        # Admin who made the assignment
    assigned_at = db.Column(db.DateTime)           # When the ticket was assigned

    # WhatsApp notification flag & pre-filled message
    whatsapp_notified = db.Column(db.Boolean, default=False)
    whatsapp_message = db.Column(db.Text, nullable=True)
    whatsapp_sent_at = db.Column(db.DateTime, nullable=True)
    assignment_whatsapp_sent = db.Column(db.Boolean, default=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)

    # Relationship to work logs
    work_logs = db.relationship(
        'ITSupportWorkLog', backref='ticket', lazy='dynamic',
        cascade='all, delete-orphan', order_by='ITSupportWorkLog.work_start'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'ticket_number': self.ticket_number,
            'client_name': self.client_name,
            'client_email': self.client_email,
            'company_name': self.company_name,
            'contact_number': self.contact_number,
            'category': self.category,
            'priority': self.priority,
            'subject': self.subject,
            'description': self.description,
            'status': self.status,
            'progress_percentage': self.progress_percentage if self.progress_percentage is not None else 0,
            'developer_notes': self.developer_notes,
            'admin_notes': self.admin_notes,
            'assigned_to': self.assigned_to,
            'assigned_developer_id': self.assigned_developer_id,
            'assigned_to_phone': self.assigned_to_phone,
            'assigned_by': self.assigned_by,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
            'whatsapp_notified': self.whatsapp_notified,
            'whatsapp_message': self.whatsapp_message,
            'whatsapp_sent_at': self.whatsapp_sent_at.isoformat() if self.whatsapp_sent_at else None,
            'assignment_whatsapp_sent': self.assignment_whatsapp_sent,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
        }

    def __repr__(self):
        return f'<ITSupportTicket {self.ticket_number} - {self.status}>'


class ITSupportWorkLog(db.Model):
    """
    Tracks all work performed by a developer on an IT support ticket.
    Each row represents one work session / action-log entry.
    """
    __tablename__ = 'it_support_work_logs'

    id = db.Column(db.Integer, primary_key=True)

    # Foreign key to the parent ticket
    ticket_id = db.Column(
        db.Integer, db.ForeignKey('it_support_tickets.id'),
        nullable=False, index=True
    )

    # Denormalised for fast reporting (avoids joins in report queries)
    ticket_number = db.Column(db.String(30), nullable=False, index=True)
    developer_name = db.Column(db.String(150), nullable=False, index=True)
    client_name = db.Column(db.String(200), nullable=False)
    support_issue = db.Column(db.Text, nullable=False)  # subject + description snapshot

    # Work tracking
    work_start = db.Column(db.DateTime, nullable=False)   # When developer started
    work_end = db.Column(db.DateTime)                     # When they finished (null while in progress)
    actions_taken = db.Column(db.Text, nullable=False)    # Steps / actions performed
    progress_percentage = db.Column(db.Integer, default=0) # Progress % at time of work log

    # Status after this work session
    status_after = db.Column(db.String(30), nullable=False, default='In Progress')
    # Choices: In Progress, Pending Client, Pending Parts, Resolved, Closed

    # Resolution fields (filled once ticket is resolved)
    resolution_details = db.Column(db.Text)

    # Audit
    logged_by = db.Column(db.String(150))  # Admin or developer who created this log entry
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'ticket_number': self.ticket_number,
            'developer_name': self.developer_name,
            'client_name': self.client_name,
            'support_issue': self.support_issue,
            'work_start': self.work_start.isoformat() if self.work_start else None,
            'work_end': self.work_end.isoformat() if self.work_end else None,
            'actions_taken': self.actions_taken,
            'progress_percentage': self.progress_percentage if self.progress_percentage is not None else 0,
            'status_after': self.status_after,
            'resolution_details': self.resolution_details,
            'logged_by': self.logged_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<ITSupportWorkLog ticket={self.ticket_number} dev={self.developer_name}>'
