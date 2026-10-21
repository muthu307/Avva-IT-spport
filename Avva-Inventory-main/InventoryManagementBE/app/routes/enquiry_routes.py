from flask import Blueprint, request, jsonify
from datetime import date, datetime

from app import db
from app.models.enquiry import Enquiry

enquiry_bp = Blueprint('enquiry_bp', __name__)


# ---------- GET ALL ENQUIRIES ----------
@enquiry_bp.route('/enquiries', methods=['GET'])
def get_enquiries():
    enquiries = Enquiry.query.order_by(Enquiry.meetup_date.asc()).all()
    return jsonify([e.to_dict() for e in enquiries]), 200


# ---------- GET ALL PENDING NOTIFICATIONS (today + upcoming + overdue) ----------
@enquiry_bp.route('/enquiries/notifications', methods=['GET'])
def get_notifications():
    # All pending, visited, and cancelled enquiries — overdue, today, and upcoming
    due = Enquiry.query.filter(
        Enquiry.status.in_(['Pending', 'Visited', 'Cancelled'])
    ).order_by(Enquiry.meetup_date.asc()).all()
    return jsonify([e.to_dict() for e in due]), 200


# ---------- CREATE ENQUIRY ----------
@enquiry_bp.route('/enquiries', methods=['POST'])
def create_enquiry():
    data = request.json

    customer_name = data.get('customer_name')
    contact_number = data.get('contact_number')
    if not customer_name or not contact_number:
        return jsonify({'error': 'Customer name and contact number are required'}), 400

    meetup_date_str = data.get('meetup_date')
    if not meetup_date_str:
        return jsonify({'error': 'Meetup date is required'}), 400

    try:
        meetup_date = datetime.strptime(meetup_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    next_followup_str = data.get('next_followup_date')
    next_followup_date = None
    if next_followup_str:
        try:
            next_followup_date = datetime.strptime(next_followup_str, '%Y-%m-%d').date()
        except ValueError:
            pass

    enquiry = Enquiry(
        customer_name=customer_name,
        contact_number=contact_number,
        email=data.get('email'),
        age=data.get('age'),
        meetup_date=meetup_date,
        is_coming_today=data.get('is_coming_today', False),
        car_interest=data.get('car_interest'),
        notes=data.get('notes'),
        status=data.get('status', 'Pending'),
        called=data.get('called', False),
        next_followup_date=next_followup_date,
    )

    db.session.add(enquiry)
    db.session.commit()
    return jsonify({'message': 'Enquiry created successfully', 'enquiry': enquiry.to_dict()}), 201


# ---------- UPDATE ENQUIRY ----------
@enquiry_bp.route('/enquiries/<int:enquiry_id>', methods=['PUT'])
def update_enquiry(enquiry_id):
    enquiry = Enquiry.query.get_or_404(enquiry_id)
    data = request.json

    enquiry.customer_name = data.get('customer_name', enquiry.customer_name)
    enquiry.contact_number = data.get('contact_number', enquiry.contact_number)
    enquiry.email = data.get('email', enquiry.email)
    enquiry.age = data.get('age', enquiry.age)
    enquiry.is_coming_today = data.get('is_coming_today', enquiry.is_coming_today)
    enquiry.car_interest = data.get('car_interest', enquiry.car_interest)
    enquiry.notes = data.get('notes', enquiry.notes)
    enquiry.status = data.get('status', enquiry.status)
    enquiry.called = data.get('called', enquiry.called)

    meetup_date_str = data.get('meetup_date')
    if meetup_date_str:
        try:
            enquiry.meetup_date = datetime.strptime(meetup_date_str, '%Y-%m-%d').date()
        except ValueError:
            pass

    next_followup_str = data.get('next_followup_date')
    if next_followup_str:
        try:
            enquiry.next_followup_date = datetime.strptime(next_followup_str, '%Y-%m-%d').date()
        except ValueError:
            pass

    db.session.commit()
    return jsonify({'message': 'Enquiry updated successfully', 'enquiry': enquiry.to_dict()}), 200


# ---------- DELETE ENQUIRY ----------
@enquiry_bp.route('/enquiries/<int:enquiry_id>', methods=['DELETE'])
def delete_enquiry(enquiry_id):
    enquiry = Enquiry.query.get_or_404(enquiry_id)
    db.session.delete(enquiry)
    db.session.commit()
    return jsonify({'message': 'Enquiry deleted successfully'}), 200
