from flask import Blueprint, request, jsonify
from datetime import datetime
from urllib.parse import quote
from app import db
from app.models.it_support import ITSupportTicket, ITSupportWorkLog

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


def build_whatsapp_message(ticket: ITSupportTicket) -> str:
    """Construct the pre-filled WhatsApp message for the IT support group (new ticket raised)."""
    created_local = ticket.created_at
    date_str = created_local.strftime('%d %b %Y') if created_local else 'N/A'
    time_str = created_local.strftime('%I:%M %p') if created_local else 'N/A'
    ticket_link = f"{FRONTEND_BASE_URL}/it-support-admin?ticket={ticket.ticket_number}"

    message = (
        f"🔔 *New IT Support Ticket Raised*\n\n"
        f"🎫 *Ticket No:* {ticket.ticket_number}\n"
        f"👤 *Client:* {ticket.client_name}\n"
        f"📧 *Email:* {ticket.client_email}\n"
        f"📞 *Contact:* {ticket.contact_number or 'N/A'}\n"
        f"📂 *Category:* {ticket.category}\n"
        f"🚨 *Priority:* {ticket.priority}\n"
        f"📝 *Subject:* {ticket.subject}\n"
        f"📅 *Date:* {date_str}\n"
        f"⏰ *Time:* {time_str} UTC\n\n"
        f"📋 *Details:*\n{ticket.description}\n\n"
        f"🔗 *View Ticket:* {ticket_link}\n\n"
        f"Please action this ticket at your earliest convenience."
    )
    return message


def build_assignment_whatsapp_message(ticket: ITSupportTicket) -> str:
    """Construct the WhatsApp notification message for ticket assignment."""
    # Ticket creation timestamps
    created_local = ticket.created_at
    ticket_date_str = created_local.strftime('%d %b %Y') if created_local else 'N/A'
    ticket_time_str = created_local.strftime('%I:%M %p') if created_local else 'N/A'

    # Assignment timestamps
    assigned_local = ticket.assigned_at
    assign_date_str = assigned_local.strftime('%d %b %Y') if assigned_local else 'N/A'
    assign_time_str = assigned_local.strftime('%I:%M %p') if assigned_local else 'N/A'

    ticket_link = f"{FRONTEND_BASE_URL}/it-support-admin?ticket={ticket.ticket_number}"

    message = (
        f"📌 *IT Support Ticket Assigned*\n\n"
        f"🎫 *Ticket No:* {ticket.ticket_number}\n"
        f"👤 *Client Name:* {ticket.client_name}\n"
        f"📝 *Support Request:* {ticket.subject}\n\n"
        f"📋 *Request Details:*\n{ticket.description}\n\n"
        f"─────────────────────\n"
        f"👨‍💻 *Assigned Developer:* {ticket.assigned_to}\n"
        f"🏷️ *Assigned By:* {ticket.assigned_by or 'Admin'}\n"
        f"📅 *Assignment Date:* {assign_date_str}\n"
        f"⏰ *Assignment Time:* {assign_time_str} UTC\n"
        f"─────────────────────\n\n"
        f"🗂️ *Ticket Details:*\n"
        f"   📂 Category: {ticket.category}\n"
        f"   🚨 Priority: {ticket.priority}\n"
        f"   📅 Raised On: {ticket_date_str} at {ticket_time_str} UTC\n\n"
        f"🔗 *Direct Ticket Link:* {ticket_link}\n\n"
        f"⚡ {ticket.assigned_to}, please review and action this ticket promptly."
    )
    return message


def build_whatsapp_url(ticket: ITSupportTicket) -> str:
    """Return a WhatsApp Web URL with a pre-filled new-ticket message."""
    message = build_whatsapp_message(ticket)
    encoded = quote(message)
    return f"https://web.whatsapp.com/send?text={encoded}"


def build_assignment_whatsapp_url(ticket: ITSupportTicket, developer_phone: str = None) -> str:
    """
    Return a WhatsApp URL for the assignment notification.
    If developer_phone is provided, opens a direct chat to the developer.
    Otherwise returns a sendable group message URL.
    """
    message = build_assignment_whatsapp_message(ticket)
    encoded = quote(message)

    if developer_phone:
        # Direct WhatsApp message to the developer
        phone_clean = developer_phone.replace('+', '').replace(' ', '').replace('-', '')
        return f"https://wa.me/{phone_clean}?text={encoded}"
    else:
        return f"https://web.whatsapp.com/send?text={encoded}"


# ─────────────────────────────────────────────
# GET /api/it-support/team-members — Predefined team list
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/team-members', methods=['GET'])
def get_team_members():
    """Return the predefined list of IT support team members."""
    return jsonify({'team_members': IT_TEAM_MEMBERS}), 200


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
        whatsapp_notified=False,
        assignment_whatsapp_sent=False,
    )

    db.session.add(ticket)
    db.session.commit()

    # Build WhatsApp notification URL (new ticket alert)
    whatsapp_url = build_whatsapp_url(ticket)
    ticket.whatsapp_notified = True
    db.session.commit()

    return jsonify({
        'message': 'Ticket raised successfully',
        'ticket': ticket.to_dict(),
        'whatsapp_url': whatsapp_url,
    }), 201


# ─────────────────────────────────────────────
# GET /api/it-support/tickets — List all tickets (admin)
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/tickets', methods=['GET'])
def get_all_tickets():
    status_filter = request.args.get('status')
    priority_filter = request.args.get('priority')
    category_filter = request.args.get('category')
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
# Assign ticket to a predefined team member + generate WhatsApp notification
# ─────────────────────────────────────────────
@it_support_bp.route('/it-support/tickets/<int:ticket_id>/assign', methods=['POST'])
def assign_ticket(ticket_id):
    """
    Assign a ticket to a specific IT team member and generate a
    WhatsApp notification URL with full assignment details.

    Expected JSON body:
    {
        "member_id": 1,            # ID from IT_TEAM_MEMBERS list
        "assigned_by": "Admin",    # Who is making the assignment (optional)
        "admin_notes": "..."       # Optional notes
    }
    """
    ticket = ITSupportTicket.query.get_or_404(ticket_id)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    member_id = data.get('member_id')
    if not member_id:
        return jsonify({'error': 'member_id is required'}), 400

    # Look up the team member from predefined list
    member = next((m for m in IT_TEAM_MEMBERS if m['id'] == int(member_id)), None)
    if not member:
        return jsonify({'error': f'Team member with id {member_id} not found'}), 404

    # Update ticket assignment fields
    ticket.assigned_to = member['name']
    ticket.assigned_to_phone = member['phone']
    ticket.assigned_by = data.get('assigned_by', 'Admin').strip() or 'Admin'
    ticket.assigned_at = datetime.utcnow()

    # Update status to In Progress if currently Open
    if ticket.status == 'Open':
        ticket.status = 'In Progress'

    # Optionally update admin notes
    if data.get('admin_notes'):
        ticket.admin_notes = data['admin_notes'].strip()

    ticket.updated_at = datetime.utcnow()
    db.session.commit()

    # Build the assignment WhatsApp notification URL
    # Sends direct message to the assigned developer
    whatsapp_url = build_assignment_whatsapp_url(ticket, developer_phone=member['phone'])

    # Also build a group notification URL
    group_whatsapp_url = build_assignment_whatsapp_url(ticket, developer_phone=None)

    # Mark that assignment WhatsApp was generated
    ticket.assignment_whatsapp_sent = True
    db.session.commit()

    return jsonify({
        'message': f'Ticket assigned to {member["name"]} successfully',
        'ticket': ticket.to_dict(),
        'assigned_member': member,
        'whatsapp_url': whatsapp_url,          # Direct message to developer
        'group_whatsapp_url': group_whatsapp_url,  # For group notification
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

    return jsonify({
        'total': total,
        'open': open_count,
        'in_progress': in_progress,
        'resolved': resolved,
        'closed': closed,
        'critical': critical,
        'high': high,
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
