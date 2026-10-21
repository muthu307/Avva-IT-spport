# app/routes/salary_routes.py
from flask import Blueprint, request, jsonify
from datetime import datetime, date
import calendar
from sqlalchemy import and_
from app import db
from app.models import Employee, Attendance
from app.models.salary import SalaryStructure, Payroll
import logging

salary_bp = Blueprint('salary', __name__)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------
# SALARY STRUCTURE ENDPOINTS
# ---------------------------------------------------------

@salary_bp.route('/salary/structures', methods=['GET'])
def get_all_salary_structures():
    """Get salary structures for all employees"""
    try:
        employees = Employee.query.all()
        structures_list = []
        for emp in employees:
            struct = SalaryStructure.query.filter_by(employee_id=emp.id).first()
            if struct:
                structures_list.append(struct.to_dict())
            else:
                # Return default zero structure for employee
                structures_list.append({
                    'id': None,
                    'employee_id': emp.id,
                    'employee_name': emp.full_name,
                    'employee_code': emp.employee_id,
                    'department': emp.department,
                    'designation': emp.designation,
                    'base_salary': 0.0,
                    'hra': 0.0,
                    'transport_allowance': 0.0,
                    'medical_allowance': 0.0,
                    'special_allowance': 0.0,
                    'pf_deduction': 0.0,
                    'esi_deduction': 0.0,
                    'tds_deduction': 0.0,
                    'other_deductions': 0.0,
                    'gross_salary': 0.0,
                    'total_deductions': 0.0,
                    'net_salary': 0.0,
                    'created_at': None,
                    'updated_at': None
                })
        return jsonify(structures_list), 200
    except Exception as e:
        logger.error(f"Error fetching salary structures: {str(e)}")
        return jsonify({'error': str(e)}), 500


@salary_bp.route('/salary/structure/<int:employee_id>', methods=['GET'])
def get_salary_structure(employee_id):
    """Get salary structure for a specific employee"""
    try:
        employee = Employee.query.get_or_404(employee_id)
        struct = SalaryStructure.query.filter_by(employee_id=employee.id).first()
        if not struct:
            return jsonify({
                'employee_id': employee.id,
                'employee_name': employee.full_name,
                'base_salary': 0.0,
                'hra': 0.0,
                'transport_allowance': 0.0,
                'medical_allowance': 0.0,
                'special_allowance': 0.0,
                'pf_deduction': 0.0,
                'esi_deduction': 0.0,
                'tds_deduction': 0.0,
                'other_deductions': 0.0,
                'gross_salary': 0.0,
                'total_deductions': 0.0,
                'net_salary': 0.0
            }), 200
        return jsonify(struct.to_dict()), 200
    except Exception as e:
        logger.error(f"Error fetching salary structure: {str(e)}")
        return jsonify({'error': str(e)}), 500


@salary_bp.route('/salary/structure', methods=['POST'])
def save_salary_structure():
    """Create or update employee salary structure"""
    try:
        data = request.get_json() or {}
        employee_id = data.get('employee_id')
        
        if not employee_id:
            return jsonify({'error': 'employee_id is required'}), 400
            
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
            
        struct = SalaryStructure.query.filter_by(employee_id=employee_id).first()
        if not struct:
            struct = SalaryStructure(employee_id=employee_id)
            db.session.add(struct)
            
        struct.base_salary = float(data.get('base_salary', 0.0))
        struct.hra = float(data.get('hra', 0.0))
        struct.transport_allowance = float(data.get('transport_allowance', 0.0))
        struct.medical_allowance = float(data.get('medical_allowance', 0.0))
        struct.special_allowance = float(data.get('special_allowance', 0.0))
        struct.pf_deduction = float(data.get('pf_deduction', 0.0))
        struct.esi_deduction = float(data.get('esi_deduction', 0.0))
        struct.tds_deduction = float(data.get('tds_deduction', 0.0))
        struct.other_deductions = float(data.get('other_deductions', 0.0))
        
        db.session.commit()
        return jsonify({'message': 'Salary structure saved successfully', 'structure': struct.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving salary structure: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ---------------------------------------------------------
# PAYROLL GENERATION & MANAGEMENT ENDPOINTS
# ---------------------------------------------------------

@salary_bp.route('/salary/payroll/generate', methods=['POST'])
def generate_payroll():
    """Generate monthly payroll by inspecting Attendance logs for selected month/year"""
    try:
        data = request.get_json() or {}
        month = int(data.get('month', datetime.now().month))
        year = int(data.get('year', datetime.now().year))
        total_working_days = int(data.get('total_working_days', 26))
        
        if total_working_days <= 0:
            total_working_days = 26

        # Calculate start and end date of the month
        _, num_days_in_month = calendar.monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, num_days_in_month)
        
        employees = Employee.query.all()
        generated_payrolls = []
        
        for emp in employees:
            # Ensure salary structure exists for employee
            struct = SalaryStructure.query.filter_by(employee_id=emp.id).first()
            if not struct:
                struct = SalaryStructure(
                    employee_id=emp.id,
                    base_salary=0.0,
                    hra=0.0,
                    transport_allowance=0.0,
                    medical_allowance=0.0,
                    special_allowance=0.0,
                    pf_deduction=0.0,
                    esi_deduction=0.0,
                    tds_deduction=0.0,
                    other_deductions=0.0
                )
                db.session.add(struct)
                db.session.flush()

            # Query attendance records for this month
            attendances = Attendance.query.filter(
                and_(
                    Attendance.employee_id == emp.id,
                    Attendance.date >= start_date,
                    Attendance.date <= end_date
                )
            ).all()
            
            if attendances and len(attendances) > 0:
                present_days = 0.0
                half_days = 0
                overtime_hours = 0.0
                
                for att in attendances:
                    status = (att.status or 'present').lower()
                    if status == 'present':
                        present_days += 1.0
                    elif status in ['half-day', 'half_day', 'halfday']:
                        present_days += 0.5
                        half_days += 1
                    elif status == 'late':
                        present_days += 1.0
                    
                    overtime_hours += float(att.overtime or 0.0)
                
                absent_days = max(0.0, float(total_working_days) - present_days)
            else:
                # Fallback if no attendance logs exist for the employee: default to full working days attendance
                present_days = float(total_working_days)
                half_days = 0
                absent_days = 0.0
                overtime_hours = 0.0

            # Compute Base Earned & Allowances Earned
            base_sal = float(struct.base_salary or 0.0)
            total_allowances = float(struct.hra or 0.0) + float(struct.transport_allowance or 0.0) + \
                               float(struct.medical_allowance or 0.0) + float(struct.special_allowance or 0.0)

            if present_days >= total_working_days:
                base_earned = round(base_sal, 2)
                allowances_earned = round(total_allowances, 2)
            else:
                daily_base_rate = base_sal / total_working_days
                daily_allowance_rate = total_allowances / total_working_days
                base_earned = round(present_days * daily_base_rate, 2)
                allowances_earned = round(present_days * daily_allowance_rate, 2)

            # Overtime pay rate = 1.5x hourly rate (base / (working_days * 8))
            hourly_rate = base_sal / (total_working_days * 8.0) if total_working_days > 0 else 0.0
            overtime_pay = round(overtime_hours * (hourly_rate * 1.5), 2)
            
            # Find or create payroll record
            payroll = Payroll.query.filter_by(employee_id=emp.id, month=month, year=year).first()
            if not payroll:
                payroll = Payroll(
                    employee_id=emp.id,
                    month=month,
                    year=year
                )
                db.session.add(payroll)

            bonus = float(payroll.bonus or 0.0)
            gross_earnings = round(base_earned + allowances_earned + overtime_pay + bonus, 2)
            
            statutory_deductions = round(float(struct.total_deductions or 0.0), 2)
            absenteeism_deductions = round(absent_days * (base_sal / total_working_days), 2) if present_days < total_working_days else 0.0
            total_deductions = round(statutory_deductions, 2)
            
            net_payable = max(0.0, round(gross_earnings - total_deductions, 2))
            
            payroll.total_working_days = total_working_days
            payroll.present_days = present_days
            payroll.absent_days = absent_days
            payroll.half_days = half_days
            payroll.overtime_hours = overtime_hours
            payroll.base_earned = base_earned
            payroll.allowances_earned = allowances_earned
            payroll.overtime_pay = overtime_pay
            payroll.bonus = bonus
            payroll.gross_earnings = gross_earnings
            payroll.statutory_deductions = statutory_deductions
            payroll.absenteeism_deductions = absenteeism_deductions
            payroll.total_deductions = total_deductions
            payroll.net_payable = net_payable
            if not payroll.payment_status:
                payroll.payment_status = 'Pending'
                
            generated_payrolls.append(payroll)
            
        db.session.commit()
        return jsonify({
            'message': f'Successfully generated payroll for {calendar.month_name[month]} {year}',
            'count': len(generated_payrolls),
            'payrolls': [p.to_dict() for p in generated_payrolls]
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error generating payroll: {str(e)}")
        return jsonify({'error': str(e)}), 500


@salary_bp.route('/salary/payroll', methods=['GET'])
def get_payrolls():
    """Get payroll history with filtering by month, year, status, search"""
    try:
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        status = request.args.get('status')
        search = request.args.get('search')
        
        query = Payroll.query.join(Employee)
        
        employee_id = request.args.get('employee_id', type=int)
        
        if employee_id:
            query = query.filter(Payroll.employee_id == employee_id)
        if month:
            query = query.filter(Payroll.month == month)
        if year:
            query = query.filter(Payroll.year == year)
        if status and status != 'All':
            query = query.filter(Payroll.payment_status == status)
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (Employee.full_name.ilike(search_pattern)) | 
                (Employee.employee_id.ilike(search_pattern)) |
                (Employee.department.ilike(search_pattern))
            )
            
        payrolls = query.order_by(Payroll.year.desc(), Payroll.month.desc(), Employee.full_name).all()
        return jsonify([p.to_dict() for p in payrolls]), 200
    except Exception as e:
        logger.error(f"Error fetching payrolls: {str(e)}")
        return jsonify({'error': str(e)}), 500


@salary_bp.route('/salary/report/summary', methods=['GET'])
def get_payroll_report_summary():
    """Get aggregated report summary for month/year and employee history analytics"""
    try:
        month = request.args.get('month', type=int)
        year = request.args.get('year', type=int)
        employee_id = request.args.get('employee_id', type=int)
        
        query = Payroll.query.join(Employee)
        if month:
            query = query.filter(Payroll.month == month)
        if year:
            query = query.filter(Payroll.year == year)
        if employee_id:
            query = query.filter(Payroll.employee_id == employee_id)
            
        payrolls = query.all()
        
        total_gross = sum(p.gross_earnings or 0.0 for p in payrolls)
        total_base = sum(p.base_earned or 0.0 for p in payrolls)
        total_allowances = sum(p.allowances_earned or 0.0 for p in payrolls)
        total_overtime = sum(p.overtime_pay or 0.0 for p in payrolls)
        total_deductions = sum(p.total_deductions or 0.0 for p in payrolls)
        total_net = sum(p.net_payable or 0.0 for p in payrolls)
        total_paid = sum(p.net_payable or 0.0 for p in payrolls if p.payment_status == 'Paid')
        total_pending = sum(p.net_payable or 0.0 for p in payrolls if p.payment_status == 'Pending')
        
        mode_counts = {}
        for p in payrolls:
            if p.payment_status == 'Paid':
                mode = p.payment_mode or 'Other'
                mode_counts[mode] = mode_counts.get(mode, 0) + 1

        dept_summary = {}
        for p in payrolls:
            dept = p.employee.department if p.employee and p.employee.department else 'General'
            if dept not in dept_summary:
                dept_summary[dept] = {'count': 0, 'total_net': 0.0, 'total_gross': 0.0, 'total_deductions': 0.0}
            dept_summary[dept]['count'] += 1
            dept_summary[dept]['total_net'] += (p.net_payable or 0.0)
            dept_summary[dept]['total_gross'] += (p.gross_earnings or 0.0)
            dept_summary[dept]['total_deductions'] += (p.total_deductions or 0.0)

        # Format values
        for d in dept_summary:
            dept_summary[d]['total_net'] = round(dept_summary[d]['total_net'], 2)
            dept_summary[d]['total_gross'] = round(dept_summary[d]['total_gross'], 2)
            dept_summary[d]['total_deductions'] = round(dept_summary[d]['total_deductions'], 2)

        return jsonify({
            'count': len(payrolls),
            'total_gross': round(total_gross, 2),
            'total_base': round(total_base, 2),
            'total_allowances': round(total_allowances, 2),
            'total_overtime': round(total_overtime, 2),
            'total_deductions': round(total_deductions, 2),
            'total_net': round(total_net, 2),
            'total_paid': round(total_paid, 2),
            'total_pending': round(total_pending, 2),
            'mode_counts': mode_counts,
            'department_summary': dept_summary
        }), 200
    except Exception as e:
        logger.error(f"Error generating report summary: {str(e)}")
        return jsonify({'error': str(e)}), 500


@salary_bp.route('/salary/payroll/<int:payroll_id>', methods=['PUT'])
def update_payroll(payroll_id):
    """Update payroll details (e.g. bonus, deductions, notes)"""
    try:
        payroll = Payroll.query.get_or_404(payroll_id)
        data = request.get_json() or {}
        
        if 'bonus' in data:
            payroll.bonus = float(data['bonus'])
        if 'statutory_deductions' in data:
            payroll.statutory_deductions = float(data['statutory_deductions'])
        if 'notes' in data:
            payroll.notes = data['notes']
        if 'payment_status' in data:
            payroll.payment_status = data['payment_status']
            if data['payment_status'] == 'Pending':
                payroll.payment_date = None
                payroll.payment_mode = None
                payroll.transaction_ref = None
                payroll.notification_sent = False
                payroll.notification_read = False
                payroll.notification_message = None
        if 'payment_mode' in data:
            payroll.payment_mode = data['payment_mode']
        if 'transaction_ref' in data:
            payroll.transaction_ref = data['transaction_ref']
        if 'payment_date' in data and data['payment_date']:
            payroll.payment_date = datetime.strptime(data['payment_date'], '%Y-%m-%d').date()
            
        # Recalculate totals
        payroll.gross_earnings = round(payroll.base_earned + payroll.allowances_earned + payroll.overtime_pay + payroll.bonus, 2)
        payroll.total_deductions = round(payroll.statutory_deductions, 2)
        payroll.net_payable = max(0.0, round(payroll.gross_earnings - payroll.total_deductions, 2))
        
        db.session.commit()
        return jsonify({'message': 'Payroll updated successfully', 'payroll': payroll.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating payroll: {str(e)}")
        return jsonify({'error': str(e)}), 500


@salary_bp.route('/salary/payroll/<int:payroll_id>/pay', methods=['POST'])
def process_payroll_payment(payroll_id):
    """Mark payroll as Paid with payment date, mode, and transaction reference & generate notification"""
    try:
        payroll = Payroll.query.get_or_404(payroll_id)
        data = request.get_json() or {}
        
        payroll.payment_status = 'Paid'
        payroll.payment_mode = data.get('payment_mode', 'Bank Transfer')
        payroll.transaction_ref = data.get('transaction_ref', '')
        payroll.notes = data.get('notes', payroll.notes)
        
        pay_date_str = data.get('payment_date')
        if pay_date_str:
            payroll.payment_date = datetime.strptime(pay_date_str, '%Y-%m-%d').date()
        else:
            payroll.payment_date = date.today()
            
        # Trigger notification for employee
        payroll.notification_sent = True
        payroll.notification_read = False
        month_name = calendar.month_name[payroll.month]
        ref_text = f" (Ref: {payroll.transaction_ref})" if payroll.transaction_ref else ""
        payroll.notification_message = (
            f"🎉 Salary Credited! Your net salary of ₹{payroll.net_payable:,.2f} for {month_name} {payroll.year} "
            f"has been disbursed via {payroll.payment_mode}{ref_text} on {payroll.payment_date.strftime('%d %b %Y')}."
        )
            
        db.session.commit()
        return jsonify({
            'message': 'Payment processed and employee notified successfully!',
            'payroll': payroll.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error processing payment: {str(e)}")
        return jsonify({'error': str(e)}), 500


@salary_bp.route('/salary/payroll/<int:payroll_id>/read-notification', methods=['POST'])
def mark_notification_read(payroll_id):
    """Mark employee salary notification as read"""
    try:
        payroll = Payroll.query.get_or_404(payroll_id)
        payroll.notification_read = True
        db.session.commit()
        return jsonify({'message': 'Notification marked as read'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error marking notification read: {str(e)}")
        return jsonify({'error': str(e)}), 500


@salary_bp.route('/salary/payroll/<int:payroll_id>/slip', methods=['GET'])
def get_payslip_data(payroll_id):
    """Get full detailed payslip document data"""
    try:
        payroll = Payroll.query.get_or_404(payroll_id)
        struct = SalaryStructure.query.filter_by(employee_id=payroll.employee_id).first()
        emp = payroll.employee
        
        slip_data = {
            'payroll': payroll.to_dict(),
            'salary_structure': struct.to_dict() if struct else None,
            'employee': {
                'id': emp.id,
                'employee_id': emp.employee_id,
                'full_name': emp.full_name,
                'email': emp.email,
                'department': emp.department,
                'designation': emp.designation,
                'date_of_joining': emp.date_of_joining.isoformat() if emp.date_of_joining else None,
                'pan_card_number': emp.pan_card_number,
                'aadhar_card_number': emp.aadhar_card_number
            },
            'period': f"{calendar.month_name[payroll.month]} {payroll.year}"
        }
        return jsonify(slip_data), 200
    except Exception as e:
        logger.error(f"Error fetching payslip data: {str(e)}")
        return jsonify({'error': str(e)}), 500


@salary_bp.route('/salary/payroll/reset', methods=['DELETE'])
def reset_all_payrolls():
    """Clear all payroll records (Admin reset)"""
    try:
        num_deleted = Payroll.query.delete()
        db.session.commit()
        return jsonify({'message': f'Successfully cleared {num_deleted} payroll record(s)'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error resetting payrolls: {str(e)}")
        return jsonify({'error': str(e)}), 500
