# app/routes/attendance_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from datetime import datetime, date
from sqlalchemy import and_, func
from app import db
from app.models import Attendance, Employee
import logging

attendance_bp = Blueprint('attendance', __name__)
logger = logging.getLogger(__name__)


# ✅ Check In - Simple check-in without location/device
@attendance_bp.route('/check-in', methods=['POST'])
def check_in():
    """Employee check-in - Simple version"""
    try:
        data = request.get_json() or {}
        current_user_id = None
        
        logger.info(f"Check-in request data: {data}")
        
        # Try to get JWT if provided (optional)
        try:
            verify_jwt_in_request(optional=True)
            current_user_id = get_jwt_identity()
            logger.info(f"JWT Identity: {current_user_id}")
        except:
            pass
        
        # Get employee by user_id, employee_id, or email
        employee = None
        if 'employee_id' in data:
            logger.info(f"Looking for employee by ID: {data['employee_id']}")
            employee = Employee.query.get(data['employee_id'])
        elif 'email' in data:
            logger.info(f"Looking for employee by email: {data['email']}")
            employee = Employee.query.filter_by(email=data['email']).first()
        elif current_user_id:
            logger.info(f"Looking for employee by user ID: {current_user_id}")
            employee = Employee.query.filter_by(id=current_user_id).first()
        
        if not employee:
            logger.error(f"Employee not found. Data: {data}, Current User ID: {current_user_id}")
            # Debug: return all employees for troubleshooting
            all_employees = Employee.query.all()
            return jsonify({
                'error': 'Employee not found. Please provide employee_id or email in request body.',
                'debug_employees_count': len(all_employees),
                'received_data': data
            }), 404
        
        today = date.today()
        
        # Check if already checked in today
        existing_attendance = Attendance.query.filter(
            and_(
                Attendance.employee_id == employee.id,
                Attendance.date == today
            )
        ).first()
        
        if existing_attendance and existing_attendance.check_in_time:
            return jsonify({'error': 'Already checked in today'}), 400
        
        # Create or update attendance record
        if existing_attendance:
            attendance = existing_attendance
            attendance.check_in_time = datetime.now()
            attendance.status = 'present'
        else:
            attendance = Attendance(
                employee_id=employee.id,
                date=today,
                check_in_time=datetime.now(),
                status='present'
            )
            db.session.add(attendance)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Check-in successful',
            'data': attendance.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Check-in error: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({'error': f"Internal server error: {str(e)}"}), 500


# ✅ Check Out - Simple check-out without location/device
@attendance_bp.route('/check-out', methods=['PUT'])
def check_out():
    """Employee check-out - Simple version"""
    try:
        data = request.get_json() or {}
        current_user_id = None
        
        # Try to get JWT if provided (optional)
        try:
            verify_jwt_in_request(optional=True)
            current_user_id = get_jwt_identity()
        except:
            pass
        
        # Get employee
        employee = None
        if 'employee_id' in data:
            employee = Employee.query.get(data['employee_id'])
        elif 'email' in data:
            employee = Employee.query.filter_by(email=data['email']).first()
        elif current_user_id:
            employee = Employee.query.filter_by(id=current_user_id).first()
        
        if not employee:
            return jsonify({'error': 'Employee not found. Please provide employee_id or email in request body.'}), 404
        
        today = date.today()
        
        attendance = Attendance.query.filter(
            and_(
                Attendance.employee_id == employee.id,
                Attendance.date == today
            )
        ).first()
        
        if not attendance or not attendance.check_in_time:
            return jsonify({'error': 'No check-in record found for today'}), 404
        
        if attendance.check_out_time:
            return jsonify({'error': 'Already checked out today'}), 400
        
        # Set check-out time
        attendance.check_out_time = datetime.now()
        
        # Calculate total hours
        if attendance.check_in_time and attendance.check_out_time:
            time_diff = attendance.check_out_time - attendance.check_in_time
            attendance.total_hours = round(time_diff.total_seconds() / 3600, 2)
            
            # Calculate overtime (assuming 8 hours standard workday)
            standard_hours = 8
            if attendance.total_hours > standard_hours:
                attendance.overtime = round(attendance.total_hours - standard_hours, 2)
        
        attendance.status = 'present'
        db.session.commit()
        
        return jsonify({
            'message': 'Check-out successful',
            'data': attendance.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Check-out error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ✅ Get today's attendance for current user
@attendance_bp.route('/today', methods=['GET'])
def get_today_attendance():
    """Get today's attendance for current user"""
    try:
        current_user_id = None
        
        # Try to get JWT if provided (optional)
        try:
            verify_jwt_in_request(optional=True)
            current_user_id = get_jwt_identity()
        except:
            pass
        
        employee_id = request.args.get('employee_id')
        
        # Get employee
        if employee_id:
            employee = Employee.query.get(employee_id)
        elif current_user_id:
            employee = Employee.query.filter_by(id=current_user_id).first()
        else:
            return jsonify({'error': 'Please provide employee_id as query parameter or JWT token'}), 400
        
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
        
        today = date.today()
        
        attendance = Attendance.query.filter(
            and_(
                Attendance.employee_id == employee.id,
                Attendance.date == today
            )
        ).first()
        
        if attendance:
            return jsonify(attendance.to_dict()), 200
        else:
            return jsonify({
                'employee_id': employee.id,
                'employee_name': employee.name,
                'date': today.isoformat(),
                'check_in_time': None,
                'check_out_time': None,
                'status': 'not_started',
                'total_hours': 0
            }), 200
            
    except Exception as e:
        logger.error(f"Get today's attendance error: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ✅ Get attendance history for current user
@attendance_bp.route('/history', methods=['GET'])
def get_attendance_history():
    """Get attendance history for current user"""
    try:
        current_user_id = None
        
        # Try to get JWT if provided (optional)
        try:
            verify_jwt_in_request(optional=True)
            current_user_id = get_jwt_identity()
        except:
            pass
        
        employee_id = request.args.get('employee_id')
        
        # Get employee
        if employee_id:
            employee = Employee.query.get(employee_id)
        elif current_user_id:
            employee = Employee.query.filter_by(id=current_user_id).first()
        else:
            return jsonify({'error': 'Please provide employee_id as query parameter or JWT token'}), 400
        
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
        
        # Get query parameters for filtering
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 30, type=int)
        
        query = Attendance.query.filter(Attendance.employee_id == employee.id)
        
        # Apply filters
        if start_date:
            query = query.filter(Attendance.date >= start_date)
        if end_date:
            query = query.filter(Attendance.date <= end_date)
        
        # Order by date descending and limit
        attendances = query.order_by(Attendance.date.desc()).limit(limit).all()
        
        # Calculate summary
        total_present = sum(1 for a in attendances if a.status == 'present')
        total_absent = sum(1 for a in attendances if a.status == 'absent')
        total_late = sum(1 for a in attendances if a.status == 'late')
        total_hours = sum(a.total_hours or 0 for a in attendances)
        total_overtime = sum(a.overtime or 0 for a in attendances)
        
        return jsonify({
            'attendances': [a.to_dict() for a in attendances],
            'summary': {
                'total_days': len(attendances),
                'present': total_present,
                'absent': total_absent,
                'late': total_late,
                'total_hours': round(total_hours, 2),
                'total_overtime': round(total_overtime, 2)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get attendance history error: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ✅ Get monthly summary for dashboard
@attendance_bp.route('/monthly-summary', methods=['GET'])
def get_monthly_summary():
    """Get monthly attendance summary"""
    try:
        current_user_id = None
        
        # Try to get JWT if provided (optional)
        try:
            verify_jwt_in_request(optional=True)
            current_user_id = get_jwt_identity()
        except:
            pass
        
        employee_id = request.args.get('employee_id')
        
        # Get employee
        if employee_id:
            employee = Employee.query.get(employee_id)
        elif current_user_id:
            employee = Employee.query.filter_by(id=current_user_id).first()
        else:
            return jsonify({'error': 'Please provide employee_id as query parameter or JWT token'}), 400
        
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
        
        year = request.args.get('year', datetime.now().year, type=int)
        month = request.args.get('month', datetime.now().month, type=int)
        
        # Get attendance for the month
        attendances = Attendance.query.filter(
            and_(
                Attendance.employee_id == employee.id,
                func.year(Attendance.date) == year,
                func.month(Attendance.date) == month
            )
        ).all()
        
        # Calculate statistics
        total_days = len(attendances)
        present_days = sum(1 for a in attendances if a.status == 'present')
        absent_days = sum(1 for a in attendances if a.status == 'absent')
        late_days = sum(1 for a in attendances if a.status == 'late')
        total_hours = sum(a.total_hours or 0 for a in attendances)
        
        return jsonify({
            'year': year,
            'month': month,
            'statistics': {
                'total_days': total_days,
                'present': present_days,
                'absent': absent_days,
                'late': late_days,
                'attendance_rate': round((present_days / total_days * 100) if total_days > 0 else 0, 2),
                'total_hours': round(total_hours, 2)
            },
            'attendances': [a.to_dict() for a in attendances]
        }), 200
        
    except Exception as e:
        logger.error(f"Get monthly summary error: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ✅ Get all employees for attendance tracking (Admin)
@attendance_bp.route('/employees', methods=['GET'])
def get_employees():
    """Get list of employees for attendance tracking"""
    try:
        employees = Employee.query.all()
        
        logger.info(f"Total employees in database: {len(employees)}")
        
        return jsonify({
            'total_employees': len(employees),
            'employees': [{
                'id': e.id,
                'employee_id': e.employee_id,
                'full_name': e.full_name,
                'email': e.email,
                'department': e.department,
                'designation': e.designation
            } for e in employees]
        }), 200
        
    except Exception as e:
        logger.error(f"Get employees error: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ✅ Update attendance record (Admin only)
@attendance_bp.route('/update/<int:attendance_id>', methods=['PUT'])
def update_attendance(attendance_id):
    """Update attendance record (admin only)"""
    try:
        data = request.get_json()
        
        attendance = Attendance.query.get(attendance_id)
        if not attendance:
            return jsonify({'error': 'Attendance record not found'}), 404
        
        # Update fields
        if 'check_in_time' in data:
            attendance.check_in_time = datetime.fromisoformat(data['check_in_time'])
        if 'check_out_time' in data:
            attendance.check_out_time = datetime.fromisoformat(data['check_out_time'])
        if 'status' in data:
            attendance.status = data['status']
        if 'notes' in data:
            attendance.notes = data['notes']
        
        # Recalculate hours if times updated
        if attendance.check_in_time and attendance.check_out_time:
            time_diff = attendance.check_out_time - attendance.check_in_time
            attendance.total_hours = round(time_diff.total_seconds() / 3600, 2)
            
            standard_hours = 8
            if attendance.total_hours > standard_hours:
                attendance.overtime = round(attendance.total_hours - standard_hours, 2)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Attendance updated successfully',
            'data': attendance.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Update attendance error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ✅ Scan Barcode for Instant Attendance Check-In / Check-Out
@attendance_bp.route('/scan-barcode', methods=['POST'])
def scan_barcode():
    """Barcode / QR Code scanner instant check-in / check-out"""
    import json
    try:
        data = request.get_json() or {}
        raw_code = str(data.get('barcode', '') or data.get('employee_id', '')).strip()
        
        if not raw_code:
            return jsonify({'error': 'Please scan a valid Barcode / QR Code'}), 400

        code = raw_code
        # Decode JSON encoded QR payloads if applicable
        if code.startswith('{') and code.endswith('}'):
            try:
                parsed = json.loads(code)
                code = str(parsed.get('employee_id') or parsed.get('id') or parsed.get('barcode') or parsed.get('code') or raw_code).strip()
            except Exception:
                pass
        
        # Match employee by barcode, employee_id, or id
        employee = Employee.query.filter(
            (Employee.barcode == code) | 
            (Employee.employee_id == code) |
            (Employee.barcode == raw_code) |
            (Employee.employee_id == raw_code)
        ).first()
        
        if not employee and code.isdigit():
            employee = Employee.query.get(int(code))
            
        if not employee:
            return jsonify({'error': f'No employee found matching code "{code}"'}), 404
        
        today = date.today()
        now = datetime.now()
        
        # Find attendance record for today
        attendance = Attendance.query.filter(
            and_(
                Attendance.employee_id == employee.id,
                Attendance.date == today
            )
        ).first()
        
        scan_action = "check_in"
        message = ""
        
        if not attendance:
            # Step 1: Check-In
            attendance = Attendance(
                employee_id=employee.id,
                date=today,
                check_in_time=now,
                status='present'
            )
            db.session.add(attendance)
            scan_action = "check_in"
            message = f"Check-In successful for {employee.full_name}"

        elif not attendance.check_in_time:
            # Step 1 Fallback: Check-In
            attendance.check_in_time = now
            attendance.status = 'present'
            scan_action = "check_in"
            message = f"Check-In successful for {employee.full_name}"

        elif not attendance.break_1_start:
            # Step 2: Break 1 Start
            attendance.break_1_start = now
            scan_action = "break_1_start"
            message = f"Break 1 Started for {employee.full_name} at {now.strftime('%I:%M %p')}"

        elif not attendance.break_1_end:
            # Step 3: Break 1 End
            attendance.break_1_end = now
            scan_action = "break_1_end"
            b1_mins = round((now - attendance.break_1_start).total_seconds() / 60.0, 2)
            b1_excess = max(0.0, round(b1_mins - 15.0, 2))
            attendance.total_break_time = b1_mins
            attendance.excess_break_time = b1_excess
            message = f"Break 1 Completed for {employee.full_name} ({b1_mins} mins)"
            if b1_excess > 0:
                message += f" [Excess: {b1_excess} mins]"

        elif not attendance.break_2_start:
            # Step 4: Break 2 Start
            attendance.break_2_start = now
            scan_action = "break_2_start"
            message = f"Break 2 Started for {employee.full_name} at {now.strftime('%I:%M %p')}"

        elif not attendance.break_2_end:
            # Step 5: Break 2 End
            attendance.break_2_end = now
            scan_action = "break_2_end"
            
            b1_mins = round((attendance.break_1_end - attendance.break_1_start).total_seconds() / 60.0, 2) if attendance.break_1_start and attendance.break_1_end else 0.0
            b1_excess = max(0.0, round(b1_mins - 15.0, 2))
            
            b2_mins = round((now - attendance.break_2_start).total_seconds() / 60.0, 2)
            b2_excess = max(0.0, round(b2_mins - 15.0, 2))
            
            attendance.total_break_time = round(b1_mins + b2_mins, 2)
            attendance.excess_break_time = round(b1_excess + b2_excess, 2)
            message = f"Break 2 Completed for {employee.full_name} ({b2_mins} mins)"
            if b2_excess > 0:
                message += f" [Excess: {b2_excess} mins]"

        elif not attendance.check_out_time:
            # Step 6: Check-Out
            attendance.check_out_time = now
            scan_action = "check_out"
            
            total_elapsed_seconds = (now - attendance.check_in_time).total_seconds()
            total_break_seconds = (attendance.total_break_time or 0.0) * 60.0
            net_working_seconds = max(0.0, total_elapsed_seconds - total_break_seconds)
            
            attendance.total_hours = round(net_working_seconds / 3600.0, 2)
            standard_hours = 8.0
            if attendance.total_hours > standard_hours:
                attendance.overtime = round(attendance.total_hours - standard_hours, 2)
            message = f"Check-Out successful for {employee.full_name} (Net Working Hours: {attendance.total_hours} hrs)"
            
        else:
            scan_action = "already_completed"
            message = f"{employee.full_name} has already completed Check-In, Breaks, and Check-Out for today."
            
        db.session.commit()
        
        att_dict = attendance.to_dict()
        att_dict['entry_date'] = attendance.date.strftime('%d %b %Y') if attendance.date else None
        att_dict['entry_time'] = attendance.check_in_time.strftime('%I:%M:%S %p') if attendance.check_in_time else None
        att_dict['b1_start_time'] = attendance.break_1_start.strftime('%I:%M:%S %p') if attendance.break_1_start else None
        att_dict['b1_end_time'] = attendance.break_1_end.strftime('%I:%M:%S %p') if attendance.break_1_end else None
        att_dict['b2_start_time'] = attendance.break_2_start.strftime('%I:%M:%S %p') if attendance.break_2_start else None
        att_dict['b2_end_time'] = attendance.break_2_end.strftime('%I:%M:%S %p') if attendance.break_2_end else None
        att_dict['exit_date'] = attendance.date.strftime('%d %b %Y') if attendance.check_out_time else None
        att_dict['exit_time'] = attendance.check_out_time.strftime('%I:%M:%S %p') if attendance.check_out_time else None

        return jsonify({
            'message': message,
            'scan_action': scan_action,
            'employee': employee.to_dict(),
            'data': att_dict
        }), 200
        
    except Exception as e:
        logger.error(f"Scan barcode error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ✅ Get Attendance Dashboard Stats (All Employees / Filtered)
@attendance_bp.route('/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    """Get Attendance Dashboard metrics"""
    try:
        employee_id = request.args.get('employee_id')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        year = request.args.get('year', datetime.now().year, type=int)
        month = request.args.get('month', datetime.now().month, type=int)
        
        query = Attendance.query
        
        if employee_id:
            query = query.filter(Attendance.employee_id == employee_id)
            
        if start_date_str and end_date_str:
            query = query.filter(and_(Attendance.date >= start_date_str, Attendance.date <= end_date_str))
        elif year and month:
            query = query.filter(and_(func.year(Attendance.date) == year, func.month(Attendance.date) == month))
            
        attendances = query.all()
        
        total_records = len(attendances)
        present_count = sum(1 for a in attendances if a.status == 'present')
        absent_count = sum(1 for a in attendances if a.status == 'absent')
        paid_leave_count = sum(1 for a in attendances if a.status in ['paid_leave', 'pl', 'leave'])
        half_day_count = sum(1 for a in attendances if a.status in ['half_day', 'halfday'])
        permission_count = sum(1 for a in attendances if a.status in ['permission'])
        late_count = sum(1 for a in attendances if a.status in ['late'])
        total_overtime = round(sum(a.overtime or 0.0 for a in attendances), 2)
        total_hours = round(sum(a.total_hours or 0.0 for a in attendances), 2)
        
        return jsonify({
            'total_working_days': total_records,
            'present_days': present_count,
            'absent_days': absent_count,
            'paid_leave': paid_leave_count,
            'half_days': half_day_count,
            'permissions': permission_count,
            'late_entries': late_count,
            'overtime_hours': total_overtime,
            'total_hours': total_hours
        }), 200
    except Exception as e:
        logger.error(f"Dashboard stats error: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ✅ Get All Attendance Records (Chronological & Filtered)
@attendance_bp.route('/all-records', methods=['GET'])
def get_all_records():
    """Get all attendance records with filters"""
    try:
        employee_id = request.args.get('employee_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        status = request.args.get('status')
        search = request.args.get('search', '').strip()
        
        query = Attendance.query.join(Employee)
        
        if employee_id:
            query = query.filter(Attendance.employee_id == employee_id)
        if start_date:
            query = query.filter(Attendance.date >= start_date)
        if end_date:
            query = query.filter(Attendance.date <= end_date)
        if status and status != 'all':
            query = query.filter(Attendance.status == status)
        if search:
            query = query.filter(
                (Employee.full_name.ilike(f'%{search}%')) |
                (Employee.employee_id.ilike(f'%{search}%')) |
                (Employee.department.ilike(f'%{search}%'))
            )
            
        attendances = query.order_by(Attendance.date.desc(), Attendance.id.desc()).all()
        return jsonify([a.to_dict() for a in attendances]), 200
        
    except Exception as e:
        logger.error(f"Get all records error: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ✅ Create or Update Manual Attendance Entry (Admin)
@attendance_bp.route('/manual-entry', methods=['POST'])
def manual_entry():
    """Add or override attendance manually"""
    try:
        data = request.get_json() or {}
        emp_id = data.get('employee_id')
        entry_date_str = data.get('date', date.today().isoformat())
        status = data.get('status', 'present')
        notes = data.get('notes', '')
        
        if not emp_id:
            return jsonify({'error': 'Employee ID is required'}), 400
            
        entry_date = datetime.strptime(entry_date_str, '%Y-%m-%d').date()
        
        attendance = Attendance.query.filter(
            and_(Attendance.employee_id == emp_id, Attendance.date == entry_date)
        ).first()
        
        if not attendance:
            attendance = Attendance(
                employee_id=emp_id,
                date=entry_date,
                status=status,
                notes=notes
            )
            db.session.add(attendance)
        else:
            attendance.status = status
            attendance.notes = notes
            
        if 'check_in_time' in data and data['check_in_time']:
            attendance.check_in_time = datetime.fromisoformat(data['check_in_time'])
        if 'check_out_time' in data and data['check_out_time']:
            attendance.check_out_time = datetime.fromisoformat(data['check_out_time'])
        if 'overtime' in data:
            attendance.overtime = float(data['overtime'])
            
        db.session.commit()
        return jsonify({'message': 'Attendance saved successfully', 'data': attendance.to_dict()}), 200
        
    except Exception as e:
        logger.error(f"Manual entry error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
