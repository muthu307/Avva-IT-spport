from flask import Blueprint, request, jsonify
from datetime import datetime
from urllib.parse import quote
from app import db
from app.models.it_support import ITSupportTicket, ITSupportWorkLog, ITDeveloper

it_support_bp = Blueprint('it_support_bp', __name__)

# ─────────────────────────────────────────────
# Predefined IT Support Team Members
# Format: { id, name, phone (intl format, no +), role }
# ─────────────────────────────────────────────
IT_TEAM_MEMBERS = [
    {"id": 1, "name": "Ravi Kumar",    "phone": "919876543210", "role": "Senior Network Engineer"},
    {"id": 2, "name": "Priya Sharma",  "phone": "919812345678", "role": "Software Support Specialist"},
    {"id": 3, "name": "Amit Patel",    "phone": "919823456789", "role": "Hardware Technician"},
    {"id": 4, "name": "Sneha Nair",    "phone": "919834567890", "role": "IT Security Analyst"},
    {"id": 5, "name": "Deepak Raj",    "phone": "919845678901", "role": "Systems Administrator"},
    {"id": 6, "name": "Kavitha Menon", "phone": "919856789012", "role": "Database Administrator"},
]


# ─────────────────────────────────────────────
# Helper: Generate unique ticket number
# Format: TKT-YYYYMMDD-XXXX  e.g. TKT-20260910-0001
# ─────────────────────────────────────────────
def generate_ticket_number():
    today_str = datetime.utcnow().strftime('%Y%m%d')
    prefix = f'TKT-{today_str}-'

    # Find the highest sequence for today
    last = (
        ITSupportTicket.query
        .filter(ITSupportTicket.ticket_number.like(f'{prefix}%'))
        .order_by(ITSupportTicket.ticket_number.desc())
        .first()
    )

    if last:
        try:
            seq = int(last.ticket_number.split('-')[-1]) + 1
        except ValueError:
            seq = 1
    else:
        seq = 1

    return f'{prefix}{seq:04d}'


# ─────────────────────────────────────────────
# Helper: Build WhatsApp Click-to-Chat URL
# ─────────────────────────────────────────────
WHATSAPP_GROUP_INVITE = "https://chat.whatsapp.com/G660UKTsAmyIH5ZwRigP7E"
FRONTEND_BASE_URL = "http://localhost:3000"


def resolve_frontend_base_url(base_url: str = None) -> str:
    """Resolve the frontend base URL from param, request headers, or default."""
    if base_url and base_url.strip():
        return base_url.strip().rstrip('/')
    if request:
        origin = request.headers.get('Origin') or request.headers.get('Referer')
        if origin:
            from urllib.parse import urlparse
            parsed = urlparse(origin)
            return f"{parsed.scheme}://{parsed.netloc}".rstrip('/')
    return FRONTEND_BASE_URL.rstrip('/')


def build_whatsapp_message(ticket: ITSupportTicket, base_url: str = None) -> str:
    """
    Construct the pre-filled WhatsApp notification message containing:
      - Client Name
      - Ticket Number
      - Request Details (Subject, Category, Priority, Contact, Email, Company, Description)
      - Date
      - Time
      - Direct Ticket URL
    """
    created_local = ticket.created_at or datetime.utcnow()
    date_str = created_local.strftime('%d %b %Y')
    time_str = created_local.strftime('%I:%M %p')

    fe_url = resolve_frontend_base_url(base_url)
    ticket_link = f"{fe_url}/it-support-admin?ticket={ticket.ticket_number}"

    company_part = f"🏢 *Company:* {ticket.company_name}\n" if ticket.company_name else ""
    contact_part = f"📞 *Contact:* {ticket.contact_number}\n" if ticket.contact_number else ""

    message = (
        f"🔔 *New IT Support Ticket Notification*\n\n"
        f"👤 *Client Name:* {ticket.client_name}\n"
        f"🎫 *Ticket Number:* {ticket.ticket_number}\n"
        f"📅 *Date:* {date_str}\n"
        f"⏰ *Time:* {time_str} UTC\n\n"
        f"📋 *Request Details:*\n"
        f"• *Subject:* {ticket.subject}\n"
        f"• *Category:* {ticket.category}\n"
        f"• *Priority:* {ticket.priority}\n"
        f"• *Email:* {ticket.client_email}\n"
        + contact_part
        + company_part
        + f"• *Description:*\n{ticket.description}\n\n"
        f"🔗 *Direct Ticket URL:*\n{ticket_link}\n\n"
        f"⚡ *IT Support WhatsApp Group:* Please review and action this ticket."
    )
    return message


def build_assignment_whatsapp_message(ticket: ITSupportTicket, base_url: str = None) -> str:
    """Construct the WhatsApp notification message for ticket assignment."""
    created_local = ticket.created_at or datetime.utcnow()
    ticket_date_str = created_local.strftime('%d %b %Y')
    ticket_time_str = created_local.strftime('%I:%M %p')

    assigned_local = ticket.assigned_at or datetime.utcnow()
    assign_date_str = assigned_local.strftime('%d %b %Y')
    assign_time_str = assigned_local.strftime('%I:%M %p')

    fe_url = resolve_frontend_base_url(base_url)
    ticket_link = f"{fe_url}/it-support-admin?ticket={ticket.ticket_number}"

    company_part = f"• *Company:* {ticket.company_name}\n" if ticket.company_name else ""
    contact_part = f"• *Contact:* {ticket.contact_number}\n" if ticket.contact_number else ""

    message = (
        f"📌 *IT Support Ticket Assigned*\n\n"
        f"🎫 *Ticket / Token Number:* {ticket.ticket_number}\n"
        f"👤 *Client Name:* {ticket.client_name}\n"
        f"📝 *Support Request:* {ticket.subject}\n\n"
        f"📋 *Support Request Details:*\n"
        f"• *Category:* {ticket.category}\n"
        f"• *Priority:* {ticket.priority}\n"
        f"• *Email:* {ticket.client_email}\n"
        + contact_part
        + company_part
        + f"• *Description:*\n{ticket.description}\n\n"
        f"─────────────────────\n"
        f"👨‍💻 *Assigned IT Support Engineer:* {ticket.assigned_to}\n"
        f"🏷️ *Assigned By:* {ticket.assigned_by or 'Admin'}\n"
        f"📅 *Assignment Date:* {assign_date_str}\n"
        f"⏰ *Assignment Time:* {assign_time_str} UTC\n"
        f"─────────────────────\n\n"
        f"🔗 *Direct Ticket Link:*\n{ticket_link}\n\n"
        f"⚡ *IT Support WhatsApp Group:* Ticket assigned to {ticket.assigned_to}. Please review and action this ticket promptly."
    )
    return message


def build_whatsapp_url(ticket: ITSupportTicket, base_url: str = None) -> str:
    """Return a WhatsApp Web URL with a pre-filled new-ticket message."""
    message = build_whatsapp_message(ticket, base_url=base_url)
    encoded = quote(message)
    return f"https://web.whatsapp.com/send?text={encoded}"


def build_whatsapp_app_url(ticket: ITSupportTicket, base_url: str = None) -> str:
    """Return a universal/app WhatsApp URL with a pre-filled message."""
    message = build_whatsapp_message(ticket, base_url=base_url)
    encoded = quote(message)
    return f"https://api.whatsapp.com/send?text={encoded}"


def build_whatsapp_desktop_url(ticket: ITSupportTicket, base_url: str = None) -> str:
    """Return a direct whatsapp:// protocol URL for installed WhatsApp Desktop."""
    message = build_whatsapp_message(ticket, base_url=base_url)
    encoded = quote(message)
    return f"whatsapp://send?text={encoded}"


def build_assignment_whatsapp_url(ticket: ITSupportTicket, developer_phone: str = None, base_url: str = None) -> str:
    """
    Return a WhatsApp URL for the assignment notification.
    If developer_phone is provided, opens a direct chat to the developer.
    Otherwise returns a sendable group message URL.
    """
    message = build_assignment_whatsapp_message(ticket, base_url=base_url)
    encoded = quote(message)

    if developer_phone:
        phone_clean = developer_phone.replace('+', '').replace(' ', '').replace('-', '')
        return f"https://wa.me/{phone_clean}?text={encoded}"
    else:
        return f"https://web.whatsapp.com/send?text={encoded}"


# ─────────────────────────────────────────────
# GET /api/it-support/team-members — Team list
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/team-members', methods=['GET'])
def get_team_members():
    """Return the list of IT support developers / team members."""
    devs = ITDeveloper.query.filter_by(status='Active').order_by(ITDeveloper.name.asc()).all()
    if devs:
        return jsonify({
            'team_members': [
                {
                    'id': d.id,
                    'name': d.name,
                    'phone': d.phone or '',
                    'role': d.role or 'IT Support Engineer',
                    'specialization': d.specialization or '',
                    'email': d.email or '',
                    'avatar_color': d.avatar_color or '#3b82f6',
                    'status': d.status
                }
                for d in devs
            ]
        }), 200

    return jsonify({'team_members': IT_TEAM_MEMBERS}), 200


# ─────────────────────────────────────────────
# IT SUPPORT ENGINEER MANAGEMENT (ADMIN)
# ─────────────────────────────────────────────

@it_support_bp.route('/it-support/developers', methods=['GET'])
def get_developers():
    """List all IT Support Engineers with their ticket workloads and completion stats."""
    developers = ITDeveloper.query.order_by(ITDeveloper.name.asc()).all()
    all_tickets = ITSupportTicket.query.all()

    # Precompute metrics for each IT Support Engineer
    ticket_map = {}
    for t in all_tickets:
        key = t.assigned_developer_id if t.assigned_developer_id else t.assigned_to
        if not key:
            continue
        ticket_map.setdefault(key, []).append(t)

    result = []
    for d in developers:
        dev_tickets = ticket_map.get(d.id, []) or ticket_map.get(d.name, [])
        total_assigned = len(dev_tickets)
        in_progress = sum(1 for t in dev_tickets if t.status == 'In Progress')
        open_count = sum(1 for t in dev_tickets if t.status == 'Open')
        resolved_count = sum(1 for t in dev_tickets if t.status in ('Resolved', 'Closed'))
        
        # Calculate average progress
        if total_assigned > 0:
            avg_progress = round(sum(t.progress_percentage or 0 for t in dev_tickets) / total_assigned, 1)
        else:
            avg_progress = 0

        dev_data = d.to_dict()
        dev_data.update({
            'total_assigned': total_assigned,
            'in_progress': in_progress,
            'open_count': open_count,
            'resolved_count': resolved_count,
            'avg_progress': avg_progress,
        })
        result.append(dev_data)

    return jsonify({'developers': result, 'total': len(result)}), 200


@it_support_bp.route('/it-support/developers', methods=['POST'])
def create_developer():
    """Admin adds a new IT Support Engineer to the team."""
    data = request.get_json()
    if not data or not data.get('name', '').strip():
        return jsonify({'error': 'IT Support Engineer name is required'}), 400

    name = data['name'].strip()
    existing = ITDeveloper.query.filter(ITDeveloper.name.ilike(name)).first()
    if existing:
        return jsonify({'error': f"IT Support Engineer '{name}' already exists"}), 409

    dev = ITDeveloper(
        name=name,
        phone=data.get('phone', '').strip(),
        email=data.get('email', '').strip() or f"{name.lower().replace(' ', '')}@avva.com",
        role=data.get('role', 'IT Support Engineer').strip() or 'IT Support Engineer',
        specialization=data.get('specialization', 'Full Stack & IT Support').strip(),
        status=data.get('status', 'Active').strip(),
        avatar_color=data.get('avatar_color', '#3b82f6'),
    )
    db.session.add(dev)
    db.session.commit()

    return jsonify({'message': f"IT Support Engineer '{name}' added successfully", 'developer': dev.to_dict()}), 201


@it_support_bp.route('/it-support/developers/<int:dev_id>', methods=['PUT'])
def update_developer(dev_id):
    """Admin updates IT Support Engineer profile details."""
    dev = ITDeveloper.query.get_or_404(dev_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if 'name' in data and data['name'].strip():
        new_name = data['name'].strip()
        existing = ITDeveloper.query.filter(ITDeveloper.name.ilike(new_name), ITDeveloper.id != dev_id).first()
        if existing:
            return jsonify({'error': f"Another IT Support Engineer named '{new_name}' already exists"}), 409
        dev.name = new_name

    if 'phone' in data:
        dev.phone = data['phone'].strip()
    if 'email' in data:
        dev.email = data['email'].strip()
    if 'role' in data:
        dev.role = data['role'].strip()
    if 'specialization' in data:
        dev.specialization = data['specialization'].strip()
    if 'status' in data:
        dev.status = data['status'].strip()
    if 'avatar_color' in data:
        dev.avatar_color = data['avatar_color'].strip()

    dev.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({'message': 'IT Support Engineer updated', 'developer': dev.to_dict()}), 200


@it_support_bp.route('/it-support/developers/<int:dev_id>', methods=['DELETE'])
def delete_developer(dev_id):
    """Admin removes or deactivates an IT Support Engineer."""
    dev = ITDeveloper.query.get_or_404(dev_id)
    name = dev.name
    # Unassign any active tickets
    ITSupportTicket.query.filter_by(assigned_developer_id=dev.id).update({
        'assigned_developer_id': None
    })
    db.session.delete(dev)
    db.session.commit()
    return jsonify({'message': f"IT Support Engineer '{name}' removed successfully"}), 200


@it_support_bp.route('/it-support/developers/overview', methods=['GET'])
def get_developers_overview():
    """
    Comprehensive IT Support Engineer Workload & Progress Overview for Admin Dashboard.
    Provides detailed ticket progress, workload status, and performance metrics.
    """
    developers = ITDeveloper.query.order_by(ITDeveloper.name.asc()).all()
    all_tickets = ITSupportTicket.query.order_by(ITSupportTicket.created_at.desc()).all()

    ticket_map = {}
    for t in all_tickets:
        key = t.assigned_developer_id if t.assigned_developer_id else t.assigned_to
        if key:
            ticket_map.setdefault(key, []).append(t)

    overview = []
    total_assigned_tickets = 0
    total_progress_sum = 0

    for d in developers:
        dev_tickets = ticket_map.get(d.id, []) or ticket_map.get(d.name, [])
        active_tickets = [t for t in dev_tickets if t.status in ('Open', 'In Progress')]
        resolved_tickets = [t for t in dev_tickets if t.status in ('Resolved', 'Closed')]
        
        avg_progress = (
            round(sum(t.progress_percentage or 0 for t in dev_tickets) / len(dev_tickets), 1)
            if dev_tickets else 0
        )

        total_assigned_tickets += len(dev_tickets)
        total_progress_sum += sum(t.progress_percentage or 0 for t in dev_tickets)

        overview.append({
            'developer': d.to_dict(),
            'total_assigned': len(dev_tickets),
            'active_count': len(active_tickets),
            'resolved_count': len(resolved_tickets),
            'avg_progress': avg_progress,
            'tickets': [
                {
                    'id': t.id,
                    'ticket_number': t.ticket_number,
                    'client_name': t.client_name,
                    'category': t.category,
                    'priority': t.priority,
                    'subject': t.subject,
                    'status': t.status,
                    'progress_percentage': t.progress_percentage or 0,
                    'developer_notes': t.developer_notes,
                    'assigned_at': t.assigned_at.isoformat() if t.assigned_at else None,
                    'updated_at': t.updated_at.isoformat() if t.updated_at else None,
                }
                for t in dev_tickets
            ]
        })

    overall_avg_progress = (
        round(total_progress_sum / total_assigned_tickets, 1)
        if total_assigned_tickets > 0 else 0
    )
    unassigned_count = ITSupportTicket.query.filter(
        db.or_(ITSupportTicket.assigned_to.is_(None), ITSupportTicket.assigned_to == '')
    ).count()

    return jsonify({
        'overview': overview,
        'overall_avg_progress': overall_avg_progress,
        'total_assigned': total_assigned_tickets,
        'unassigned_count': unassigned_count,
        'total_developers': len(developers),
    }), 200


# ─────────────────────────────────────────────
# POST /api/it-support/tickets — Raise a ticket
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/tickets', methods=['POST'])
def create_ticket():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    required = ['client_name', 'client_email', 'category', 'priority', 'subject', 'description']
    missing = [f for f in required if not data.get(f, '').strip()]
    if missing:
        return jsonify({'error': f'Missing required fields: {", ".join(missing)}'}), 400

    ticket_number = generate_ticket_number()

    ticket = ITSupportTicket(
        ticket_number=ticket_number,
        client_name=data['client_name'].strip(),
        client_email=data['client_email'].strip(),
        company_name=data.get('company_name', '').strip() or None,
        contact_number=data.get('contact_number', '').strip(),
        category=data['category'].strip(),
        priority=data['priority'].strip(),
        subject=data['subject'].strip(),
        description=data['description'].strip(),
        status='Open',
        progress_percentage=0,
        whatsapp_notified=False,
        assignment_whatsapp_sent=False,
    )

    db.session.add(ticket)
    db.session.commit()

    # Pre-fill WhatsApp notification message and save with ticket details
    base_url = data.get('base_url')
    whatsapp_msg = build_whatsapp_message(ticket, base_url=base_url)
    ticket.whatsapp_message = whatsapp_msg
    ticket.whatsapp_notified = False
    db.session.commit()

    whatsapp_web_url = build_whatsapp_url(ticket, base_url=base_url)
    whatsapp_app_url = build_whatsapp_app_url(ticket, base_url=base_url)
    whatsapp_desktop_url = build_whatsapp_desktop_url(ticket, base_url=base_url)

    return jsonify({
        'message': 'Ticket raised successfully',
        'ticket': ticket.to_dict(),
        'whatsapp_message': whatsapp_msg,
        'whatsapp_url': whatsapp_web_url,
        'whatsapp_web_url': whatsapp_web_url,
        'whatsapp_app_url': whatsapp_app_url,
        'whatsapp_desktop_url': whatsapp_desktop_url,
        'whatsapp_group_invite': WHATSAPP_GROUP_INVITE,
    }), 201


# ─────────────────────────────────────────────
# GET /api/it-support/tickets — List all tickets (admin)
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/tickets', methods=['GET'])
def get_all_tickets():
    status_filter = request.args.get('status')
    priority_filter = request.args.get('priority')
    category_filter = request.args.get('category')
    assigned_to_filter = request.args.get('assigned_to')
    search = request.args.get('search', '').strip()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    query = ITSupportTicket.query

    if status_filter:
        query = query.filter(ITSupportTicket.status == status_filter)
    if priority_filter:
        query = query.filter(ITSupportTicket.priority == priority_filter)
    if category_filter:
        query = query.filter(ITSupportTicket.category == category_filter)
    if assigned_to_filter:
        query = query.filter(ITSupportTicket.assigned_to.ilike(f'%{assigned_to_filter}%'))
    if search:
        like = f'%{search}%'
        query = query.filter(
            db.or_(
                ITSupportTicket.ticket_number.ilike(like),
                ITSupportTicket.client_name.ilike(like),
                ITSupportTicket.subject.ilike(like),
                ITSupportTicket.client_email.ilike(like),
                ITSupportTicket.assigned_to.ilike(like),
            )
        )

    query = query.order_by(ITSupportTicket.created_at.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'tickets': [t.to_dict() for t in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'current_page': paginated.page,
    }), 200


# ─────────────────────────────────────────────
# GET /api/it-support/tickets/my — My tickets (by email)
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/tickets/my', methods=['GET'])
def get_my_tickets():
    email = request.args.get('email', '').strip()
    if not email:
        return jsonify({'error': 'Email is required'}), 400

    tickets = (
        ITSupportTicket.query
        .filter(ITSupportTicket.client_email.ilike(email))
        .order_by(ITSupportTicket.created_at.desc())
        .all()
    )
    return jsonify({'tickets': [t.to_dict() for t in tickets]}), 200


# ─────────────────────────────────────────────
# GET /api/it-support/tickets/<id> — Single ticket
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/tickets/<int:ticket_id>', methods=['GET'])
def get_ticket(ticket_id):
    ticket = ITSupportTicket.query.get_or_404(ticket_id)
    return jsonify({'ticket': ticket.to_dict()}), 200


# ─────────────────────────────────────────────
# GET /api/it-support/tickets/by-number/<ticket_number>
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/tickets/by-number/<ticket_number>', methods=['GET'])
def get_ticket_by_number(ticket_number):
    ticket = ITSupportTicket.query.filter_by(ticket_number=ticket_number).first()
    if not ticket:
        return jsonify({'error': f"Ticket '{ticket_number}' not found"}), 404
    return jsonify({'ticket': ticket.to_dict()}), 200


# ─────────────────────────────────────────────
# GET /api/it-support/tickets/<id>/whatsapp-notification
# Generate/retrieve pre-filled notification message & WhatsApp Web/App URLs
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/tickets/<int:ticket_id>/whatsapp-notification', methods=['GET'])
def get_ticket_whatsapp_notification(ticket_id):
    ticket = ITSupportTicket.query.get_or_404(ticket_id)
    base_url = request.args.get('base_url')

    # Construct the pre-filled message with latest details
    message = build_whatsapp_message(ticket, base_url=base_url)
    if not ticket.whatsapp_message:
        ticket.whatsapp_message = message
        db.session.commit()

    whatsapp_web_url = build_whatsapp_url(ticket, base_url=base_url)
    whatsapp_app_url = build_whatsapp_app_url(ticket, base_url=base_url)
    whatsapp_desktop_url = build_whatsapp_desktop_url(ticket, base_url=base_url)

    return jsonify({
        'ticket_id': ticket.id,
        'ticket_number': ticket.ticket_number,
        'client_name': ticket.client_name,
        'whatsapp_message': message,
        'whatsapp_web_url': whatsapp_web_url,
        'whatsapp_app_url': whatsapp_app_url,
        'whatsapp_desktop_url': whatsapp_desktop_url,
        'whatsapp_notified': ticket.whatsapp_notified,
        'whatsapp_sent_at': ticket.whatsapp_sent_at.isoformat() if ticket.whatsapp_sent_at else None,
        'whatsapp_group_invite': WHATSAPP_GROUP_INVITE,
    }), 200


# ─────────────────────────────────────────────
# POST /api/it-support/tickets/<id>/mark-whatsapp-sent
# Manually mark WhatsApp notification as dispatched by admin
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/tickets/<int:ticket_id>/mark-whatsapp-sent', methods=['POST'])
def mark_ticket_whatsapp_sent(ticket_id):
    ticket = ITSupportTicket.query.get_or_404(ticket_id)
    ticket.whatsapp_notified = True
    ticket.whatsapp_sent_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'message': f'WhatsApp notification recorded as sent for ticket {ticket.ticket_number}',
        'ticket': ticket.to_dict(),
    }), 200


# ─────────────────────────────────────────────
# PUT /api/it-support/tickets/<id> — Update ticket (admin)
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/tickets/<int:ticket_id>', methods=['PUT'])
def update_ticket(ticket_id):
    ticket = ITSupportTicket.query.get_or_404(ticket_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if 'status' in data:
        ticket.status = data['status']
        if data['status'] in ('Resolved', 'Closed') and not ticket.resolved_at:
            ticket.resolved_at = datetime.utcnow()
            if ticket.progress_percentage is None or ticket.progress_percentage < 100:
                ticket.progress_percentage = 100

    if 'progress_percentage' in data:
        try:
            val = int(data['progress_percentage'])
            ticket.progress_percentage = max(0, min(100, val))
            if ticket.progress_percentage == 100 and ticket.status not in ('Resolved', 'Closed'):
                ticket.status = 'Resolved'
                if not ticket.resolved_at:
                    ticket.resolved_at = datetime.utcnow()
        except (ValueError, TypeError):
            pass

    if 'developer_notes' in data:
        ticket.developer_notes = data['developer_notes']

    if 'admin_notes' in data:
        ticket.admin_notes = data['admin_notes']

    if 'assigned_to' in data:
        ticket.assigned_to = data['assigned_to']

    if 'priority' in data:
        ticket.priority = data['priority']

    ticket.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({'message': 'Ticket updated', 'ticket': ticket.to_dict()}), 200


# ─────────────────────────────────────────────
# POST /api/it-support/tickets/<id>/assign
# Assign ticket to an IT Support Engineer + record date & time + generate WhatsApp notification
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/tickets/<int:ticket_id>/assign', methods=['POST'])
def assign_ticket(ticket_id):
    """
    Assign a ticket to an IT Support Engineer, record engineer name and assignment date/time,
    and generate WhatsApp notification for the IT Support WhatsApp Group.
    """
    ticket = ITSupportTicket.query.get_or_404(ticket_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    member_id = data.get('developer_id') or data.get('member_id')
    developer_name = data.get('developer_name')
    base_url = data.get('base_url')

    if not member_id and not developer_name:
        return jsonify({'error': 'IT Support Engineer ID or name is required'}), 400

    # Look up engineer in database
    dev = None
    if member_id:
        try:
            dev = ITDeveloper.query.get(int(member_id))
        except (ValueError, TypeError):
            pass
    if not dev and developer_name:
        dev = ITDeveloper.query.filter(ITDeveloper.name.ilike(developer_name.strip())).first()

    if dev:
        ticket.assigned_developer_id = dev.id
        ticket.assigned_to = dev.name
        ticket.assigned_to_phone = dev.phone
        assigned_member = dev.to_dict()
    else:
        # Fallback to predefined list
        member = next((m for m in IT_TEAM_MEMBERS if m['id'] == int(member_id or 0)), None)
        if not member:
            return jsonify({'error': 'IT Support Engineer not found'}), 404
        ticket.assigned_to = member['name']
        ticket.assigned_to_phone = member['phone']
        assigned_member = member

    ticket.assigned_by = data.get('assigned_by', 'Admin').strip() or 'Admin'
    ticket.assigned_at = datetime.utcnow()

    # Update status to In Progress if currently Open
    if ticket.status == 'Open':
        ticket.status = 'In Progress'

    if ticket.progress_percentage is None:
        ticket.progress_percentage = 0

    if data.get('admin_notes'):
        ticket.admin_notes = data['admin_notes'].strip()

    ticket.updated_at = datetime.utcnow()

    # Create work log entry recording the assignment
    try:
        assign_note_text = f"Assigned to {ticket.assigned_to} on {ticket.assigned_at.strftime('%d %b %Y at %I:%M %p UTC')} by {ticket.assigned_by}."
        if ticket.admin_notes:
            assign_note_text += f" Notes: {ticket.admin_notes}"
        work_log = ITSupportWorkLog(
            ticket_id=ticket.id,
            ticket_number=ticket.ticket_number,
            developer_name=ticket.assigned_to,
            client_name=ticket.client_name,
            support_issue=f"{ticket.subject}\n\n{ticket.description}",
            work_start=ticket.assigned_at,
            work_end=ticket.assigned_at,
            actions_taken=f"Ticket assigned to IT Support Engineer {ticket.assigned_to}. {assign_note_text}",
            progress_percentage=ticket.progress_percentage or 0,
            status_after=ticket.status,
            logged_by=ticket.assigned_by,
            created_at=ticket.assigned_at
        )
        db.session.add(work_log)
    except Exception as log_err:
        print(f"Work log creation warning: {log_err}")

    # Build the assignment WhatsApp notification message and URLs for the IT Support WhatsApp Group
    assignment_message = build_assignment_whatsapp_message(ticket, base_url=base_url)
    ticket.whatsapp_message = assignment_message
    ticket.assignment_whatsapp_sent = True
    db.session.commit()

    encoded = quote(assignment_message)
    group_whatsapp_web_url = f"https://web.whatsapp.com/send?text={encoded}"
    group_whatsapp_app_url = f"https://api.whatsapp.com/send?text={encoded}"
    group_whatsapp_desktop_url = f"whatsapp://send?text={encoded}"
    direct_dev_whatsapp_url = build_assignment_whatsapp_url(ticket, developer_phone=ticket.assigned_to_phone, base_url=base_url)

    return jsonify({
        'message': f'Ticket assigned to {ticket.assigned_to} successfully',
        'ticket': ticket.to_dict(),
        'assigned_member': assigned_member,
        'assigned_engineer_name': ticket.assigned_to,
        'assignment_date': ticket.assigned_at.strftime('%d %b %Y'),
        'assignment_time': ticket.assigned_at.strftime('%I:%M %p UTC'),
        'whatsapp_message': assignment_message,
        'whatsapp_url': direct_dev_whatsapp_url,
        'group_whatsapp_url': group_whatsapp_web_url,
        'group_whatsapp_web_url': group_whatsapp_web_url,
        'group_whatsapp_app_url': group_whatsapp_app_url,
        'group_whatsapp_desktop_url': group_whatsapp_desktop_url,
        'whatsapp_group_invite': WHATSAPP_GROUP_INVITE,
    }), 200


# ═════════════════════════════════════════════════════════════════════════════
# DEVELOPER WORKSPACE / MODULE ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

@it_support_bp.route('/it-support/developer/tickets', methods=['GET'])
def get_developer_tickets():
    """
    Get all tickets assigned to a specific developer.
    Filterable by developer_name or developer_id, status, and search query.
    """
    dev_name = request.args.get('developer_name', '').strip()
    dev_id = request.args.get('developer_id', type=int)
    status_filter = request.args.get('status', '').strip()
    search = request.args.get('search', '').strip()

    query = ITSupportTicket.query

    if dev_id:
        query = query.filter(
            db.or_(
                ITSupportTicket.assigned_developer_id == dev_id,
                ITSupportTicket.assigned_to == dev_name if dev_name else False
            )
        )
    elif dev_name:
        query = query.filter(ITSupportTicket.assigned_to.ilike(f'%{dev_name}%'))
    else:
        # If neither provided, return all assigned tickets
        query = query.filter(ITSupportTicket.assigned_to.isnot(None))

    if status_filter:
        query = query.filter(ITSupportTicket.status == status_filter)

    if search:
        like = f'%{search}%'
        query = query.filter(
            db.or_(
                ITSupportTicket.ticket_number.ilike(like),
                ITSupportTicket.client_name.ilike(like),
                ITSupportTicket.subject.ilike(like),
                ITSupportTicket.description.ilike(like),
            )
        )

    # Order critical/high priority first, then updated_at
    query = query.order_by(
        db.case(
            (ITSupportTicket.priority == 'Critical', 1),
            (ITSupportTicket.priority == 'High', 2),
            (ITSupportTicket.priority == 'Medium', 3),
            else_=4
        ),
        ITSupportTicket.updated_at.desc()
    )

    tickets = query.all()

    # Include work log count for each ticket
    ticket_list = []
    for t in tickets:
        d = t.to_dict()
        d['work_logs_count'] = t.work_logs.count()
        ticket_list.append(d)

    return jsonify({
        'tickets': ticket_list,
        'total': len(ticket_list),
        'developer_name': dev_name,
    }), 200


@it_support_bp.route('/it-support/tickets/<int:ticket_id>/progress', methods=['PUT'])
def update_ticket_progress(ticket_id):
    """
    Developer updates ticket work progress (percentage 0-100%, status, notes, work log).
    """
    ticket = ITSupportTicket.query.get_or_404(ticket_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # 1. Update Progress Percentage
    if 'progress_percentage' in data:
        try:
            val = int(data['progress_percentage'])
            ticket.progress_percentage = max(0, min(100, val))
        except (ValueError, TypeError):
            return jsonify({'error': 'progress_percentage must be an integer between 0 and 100'}), 400

    # 2. Update Status
    if 'status' in data and data['status']:
        ticket.status = data['status'].strip()

    # Auto-resolve if 100% completed
    if ticket.progress_percentage == 100:
        if ticket.status not in ('Resolved', 'Closed'):
            ticket.status = 'Resolved'
        if not ticket.resolved_at:
            ticket.resolved_at = datetime.utcnow()
    elif ticket.status in ('Resolved', 'Closed'):
        if ticket.progress_percentage < 100:
            ticket.progress_percentage = 100
        if not ticket.resolved_at:
            ticket.resolved_at = datetime.utcnow()

    # 3. Developer Notes
    if 'developer_notes' in data:
        ticket.developer_notes = data['developer_notes'].strip() or None

    # 4. Optional: Log Work Session Action
    work_log = None
    if data.get('actions_taken') and data['actions_taken'].strip():
        dev_name = data.get('developer_name') or ticket.assigned_to or 'Developer'
        now = datetime.utcnow()
        work_start = now
        work_end = now

        # Parse custom work date and times if provided
        if data.get('work_start'):
            try:
                work_start = datetime.fromisoformat(data['work_start'].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                pass
        elif data.get('work_date'):
            try:
                w_date_str = data['work_date'].strip()
                w_start_str = data.get('work_start_time', '').strip() or '09:00'
                work_start = datetime.strptime(f"{w_date_str} {w_start_str}", "%Y-%m-%d %H:%M")
            except (ValueError, AttributeError):
                work_start = now

        if data.get('work_end'):
            try:
                work_end = datetime.fromisoformat(data['work_end'].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                work_end = work_start
        elif data.get('work_date') and data.get('work_end_time'):
            try:
                w_date_str = data['work_date'].strip()
                w_end_str = data['work_end_time'].strip()
                work_end = datetime.strptime(f"{w_date_str} {w_end_str}", "%Y-%m-%d %H:%M")
            except (ValueError, AttributeError):
                work_end = work_start

        work_log = ITSupportWorkLog(
            ticket_id=ticket.id,
            ticket_number=ticket.ticket_number,
            developer_name=dev_name,
            client_name=ticket.client_name,
            support_issue=f"{ticket.subject}\n\n{ticket.description}",
            work_start=work_start,
            work_end=work_end,
            actions_taken=data['actions_taken'].strip(),
            progress_percentage=ticket.progress_percentage,
            status_after=ticket.status,
            resolution_details=data.get('resolution_details', '').strip() or None,
            logged_by=data.get('logged_by', dev_name),
        )
        db.session.add(work_log)

    ticket.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'message': f"Ticket progress updated to {ticket.progress_percentage}% ({ticket.status})",
        'ticket': ticket.to_dict(),
        'work_log': work_log.to_dict() if work_log else None,
    }), 200


@it_support_bp.route('/it-support/developer/stats', methods=['GET'])
def get_developer_stats():
    """Get metrics and workload statistics for a developer."""
    dev_name = request.args.get('developer_name', '').strip()
    dev_id = request.args.get('developer_id', type=int)

    query = ITSupportTicket.query
    if dev_id:
        query = query.filter(
            db.or_(
                ITSupportTicket.assigned_developer_id == dev_id,
                ITSupportTicket.assigned_to == dev_name if dev_name else False
            )
        )
    elif dev_name:
        query = query.filter(ITSupportTicket.assigned_to.ilike(f'%{dev_name}%'))
    else:
        return jsonify({'error': 'IT Support Engineer name or ID is required'}), 400

    tickets = query.all()
    total = len(tickets)
    open_count = sum(1 for t in tickets if t.status == 'Open')
    in_progress = sum(1 for t in tickets if t.status == 'In Progress')
    resolved = sum(1 for t in tickets if t.status in ('Resolved', 'Closed'))
    critical = sum(1 for t in tickets if t.priority == 'Critical' and t.status not in ('Resolved', 'Closed'))

    avg_progress = round(sum(t.progress_percentage or 0 for t in tickets) / total, 1) if total > 0 else 0

    return jsonify({
        'total': total,
        'open': open_count,
        'in_progress': in_progress,
        'resolved': resolved,
        'critical': critical,
        'avg_progress': avg_progress,
    }), 200


# ─────────────────────────────────────────────
# GET /api/it-support/stats — Admin dashboard stats
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/stats', methods=['GET'])
def get_stats():
    total = ITSupportTicket.query.count()
    open_count = ITSupportTicket.query.filter_by(status='Open').count()
    in_progress = ITSupportTicket.query.filter_by(status='In Progress').count()
    resolved = ITSupportTicket.query.filter_by(status='Resolved').count()
    closed = ITSupportTicket.query.filter_by(status='Closed').count()

    # Priority breakdown
    critical = ITSupportTicket.query.filter_by(priority='Critical').count()
    high = ITSupportTicket.query.filter_by(priority='High').count()

    # Average progress across non-closed tickets
    all_active = ITSupportTicket.query.filter(ITSupportTicket.status != 'Closed').all()
    avg_progress = (
        round(sum(t.progress_percentage or 0 for t in all_active) / len(all_active), 1)
        if all_active else 0
    )

    unassigned_count = ITSupportTicket.query.filter(
        db.or_(ITSupportTicket.assigned_to.is_(None), ITSupportTicket.assigned_to == '')
    ).count()

    total_developers = ITDeveloper.query.filter_by(status='Active').count()

    return jsonify({
        'total': total,
        'open': open_count,
        'in_progress': in_progress,
        'resolved': resolved,
        'closed': closed,
        'critical': critical,
        'high': high,
        'avg_progress': avg_progress,
        'unassigned': unassigned_count,
        'total_developers': total_developers,
    }), 200


# ═════════════════════════════════════════════════════════════════════════════
# WORK LOG ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────
# POST /api/it-support/tickets/<id>/work-logs
# Log a new work entry for a ticket
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/tickets/<int:ticket_id>/work-logs', methods=['POST'])
def create_work_log(ticket_id):
    """
    Create a work log entry for a ticket.

    Required JSON fields:
      - developer_name  : str
      - work_start      : ISO datetime string (e.g. '2026-09-27T09:00:00')
      - actions_taken   : str
      - status_after    : str  (In Progress | Pending Client | Pending Parts | Resolved | Closed)

    Optional JSON fields:
      - work_end            : ISO datetime string
      - resolution_details  : str
      - logged_by           : str
    """
    ticket = ITSupportTicket.query.get_or_404(ticket_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    required = ['developer_name', 'work_start', 'actions_taken', 'status_after']
    missing = [f for f in required if not data.get(f, '')]
    if missing:
        return jsonify({'error': f'Missing required fields: {", ".join(missing)}'}), 400

    # Parse datetimes
    try:
        work_start = datetime.fromisoformat(data['work_start'].replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return jsonify({'error': 'Invalid work_start datetime format. Use ISO 8601.'}), 400

    work_end = None
    if data.get('work_end'):
        try:
            work_end = datetime.fromisoformat(data['work_end'].replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return jsonify({'error': 'Invalid work_end datetime format. Use ISO 8601.'}), 400

    log = ITSupportWorkLog(
        ticket_id=ticket.id,
        ticket_number=ticket.ticket_number,
        developer_name=data['developer_name'].strip(),
        client_name=ticket.client_name,
        support_issue=f"{ticket.subject}\n\n{ticket.description}",
        work_start=work_start,
        work_end=work_end,
        actions_taken=data['actions_taken'].strip(),
        status_after=data['status_after'].strip(),
        resolution_details=data.get('resolution_details', '').strip() or None,
        logged_by=data.get('logged_by', '').strip() or None,
    )
    db.session.add(log)

    # Keep ticket status in sync if the work log marks it resolved/closed
    if data['status_after'] in ('Resolved', 'Closed'):
        ticket.status = data['status_after']
        if not ticket.resolved_at:
            ticket.resolved_at = work_end or datetime.utcnow()
    elif data['status_after'] == 'In Progress' and ticket.status == 'Open':
        ticket.status = 'In Progress'

    ticket.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'message': 'Work log created successfully',
        'work_log': log.to_dict(),
        'ticket': ticket.to_dict(),
    }), 201


# ─────────────────────────────────────────────
# GET /api/it-support/tickets/<id>/work-logs
# List all work logs for a specific ticket
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/tickets/<int:ticket_id>/work-logs', methods=['GET'])
def get_ticket_work_logs(ticket_id):
    ticket = ITSupportTicket.query.get_or_404(ticket_id)
    logs = ITSupportWorkLog.query.filter_by(ticket_id=ticket.id).order_by(
        ITSupportWorkLog.work_start.asc()
    ).all()
    return jsonify({
        'ticket_number': ticket.ticket_number,
        'work_logs': [l.to_dict() for l in logs],
        'total': len(logs),
    }), 200


# ─────────────────────────────────────────────
# PUT /api/it-support/work-logs/<id>
# Update a work log entry
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/work-logs/<int:log_id>', methods=['PUT'])
def update_work_log(log_id):
    log = ITSupportWorkLog.query.get_or_404(log_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if 'developer_name' in data:
        log.developer_name = data['developer_name'].strip()
    if 'work_start' in data:
        try:
            log.work_start = datetime.fromisoformat(data['work_start'].replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return jsonify({'error': 'Invalid work_start datetime format'}), 400
    if 'work_end' in data:
        if data['work_end']:
            try:
                log.work_end = datetime.fromisoformat(data['work_end'].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                return jsonify({'error': 'Invalid work_end datetime format'}), 400
        else:
            log.work_end = None
    if 'actions_taken' in data:
        log.actions_taken = data['actions_taken'].strip()
    if 'status_after' in data:
        log.status_after = data['status_after'].strip()
    if 'resolution_details' in data:
        log.resolution_details = data['resolution_details'].strip() or None
    if 'logged_by' in data:
        log.logged_by = data['logged_by'].strip() or None

    log.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({'message': 'Work log updated', 'work_log': log.to_dict()}), 200


# ─────────────────────────────────────────────
# DELETE /api/it-support/work-logs/<id>
# Delete a work log entry
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/work-logs/<int:log_id>', methods=['DELETE'])
def delete_work_log(log_id):
    log = ITSupportWorkLog.query.get_or_404(log_id)
    db.session.delete(log)
    db.session.commit()
    return jsonify({'message': f'Work log {log_id} deleted'}), 200


# ─────────────────────────────────────────────
# GET /api/it-support/work-logs/report
# Full developer work report — filterable by developer, date range, status
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/work-logs/report', methods=['GET'])
def get_work_report():
    """
    Admin report: all work logs with optional filters.

    Query params:
      - developer   : filter by developer_name (partial match)
      - ticket      : filter by ticket_number (partial match)
      - status      : exact match on status_after
      - date_from   : ISO date (YYYY-MM-DD)
      - date_to     : ISO date (YYYY-MM-DD)
      - page        : int (default 1)
      - per_page    : int (default 25)
    """
    developer = request.args.get('developer', '').strip()
    ticket_filter = request.args.get('ticket', '').strip()
    status_filter = request.args.get('status', '').strip()
    date_from_str = request.args.get('date_from', '').strip()
    date_to_str = request.args.get('date_to', '').strip()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 25, type=int)

    query = ITSupportWorkLog.query

    if developer:
        query = query.filter(ITSupportWorkLog.developer_name.ilike(f'%{developer}%'))
    if ticket_filter:
        query = query.filter(ITSupportWorkLog.ticket_number.ilike(f'%{ticket_filter}%'))
    if status_filter:
        query = query.filter(ITSupportWorkLog.status_after == status_filter)
    if date_from_str:
        try:
            date_from = datetime.strptime(date_from_str, '%Y-%m-%d')
            query = query.filter(ITSupportWorkLog.work_start >= date_from)
        except ValueError:
            pass
    if date_to_str:
        try:
            date_to = datetime.strptime(date_to_str, '%Y-%m-%d')
            # Include full day
            date_to = date_to.replace(hour=23, minute=59, second=59)
            query = query.filter(ITSupportWorkLog.work_start <= date_to)
        except ValueError:
            pass

    query = query.order_by(ITSupportWorkLog.work_start.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    # Summary: unique developers and their log counts
    all_logs = ITSupportWorkLog.query.all()
    dev_summary = {}
    for l in all_logs:
        dev_summary[l.developer_name] = dev_summary.get(l.developer_name, 0) + 1

    return jsonify({
        'work_logs': [l.to_dict() for l in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'current_page': paginated.page,
        'developer_summary': [
            {'developer': k, 'total_logs': v}
            for k, v in sorted(dev_summary.items(), key=lambda x: -x[1])
        ],
    }), 200
