# app/routes/payment_tracking_routes.py
from flask import Blueprint, request, jsonify, session
from app import db
from app.models.supplier import Supplier
from app.models.supplier import Item
from app.models.payment import SupplierPayment
from datetime import datetime
import logging
import traceback

payment_tracking_bp = Blueprint('payment_tracking', __name__, url_prefix='/api')
logger = logging.getLogger(__name__)

# ==================== Supplier Payment Tracking Routes ====================

@payment_tracking_bp.route('/suppliers-with-items', methods=['GET'])
def get_suppliers_with_items():
    """Get all suppliers with their items and payment information"""
    try:
        # Get all suppliers
        suppliers = Supplier.query.order_by(Supplier.name).all()
        
        if not suppliers:
            return jsonify({
                'success': True,
                'suppliers': []
            }), 200
        
        suppliers_data = []
        for supplier in suppliers:
            # Get items for this supplier
            items = Item.query.filter_by(supplier_id=supplier.id).order_by(Item.created_at.desc()).all()
            
            suppliers_data.append({
                'id': supplier.id,
                'name': supplier.name,
                'company': supplier.company,
                'email': supplier.email,
                'phone': supplier.phone,
                'address': supplier.address,
                'created_at': supplier.created_at.isoformat() if supplier.created_at else None,
                'items': [{
                    'id': item.id,
                    'name': item.name,
                    'model': item.model,
                    'type': item.type,
                    'quantity': item.quantity,
                    'buy_price': item.buy_price,
                    'status': item.status,
                    'created_at': item.created_at.isoformat() if item.created_at else None
                } for item in items]
            })
        
        return jsonify({
            'success': True,
            'suppliers': suppliers_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching suppliers with items: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Failed to fetch suppliers'
        }), 500


@payment_tracking_bp.route('/suppliers/<int:supplier_id>/payments', methods=['GET'])
def get_supplier_payments(supplier_id):
    """Get all payments for a specific supplier"""
    try:
        # Check if supplier exists
        supplier = Supplier.query.get(supplier_id)
        if not supplier:
            return jsonify({
                'success': False,
                'error': 'Supplier not found'
            }), 404
        
        # Get all payments for this supplier
        payments = SupplierPayment.query.filter_by(supplier_id=supplier_id)\
            .order_by(SupplierPayment.payment_date.desc()).all()
        
        return jsonify({
            'success': True,
            'payments': [{
                'id': payment.id,
                'supplier_id': payment.supplier_id,
                'amount': float(payment.amount),
                'payment_method': payment.payment_method,
                'reference_number': payment.reference_number,
                'notes': payment.notes,
                'payment_date': payment.payment_date.isoformat() if payment.payment_date else None,
                'created_at': payment.created_at.isoformat() if payment.created_at else None
            } for payment in payments]
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching supplier payments: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch payments'
        }), 500


@payment_tracking_bp.route('/suppliers/<int:supplier_id>/payments', methods=['POST'])
def create_payment(supplier_id):
    """Create a new payment record for a supplier"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('amount'):
            return jsonify({
                'success': False,
                'error': 'Amount is required'
            }), 400
        
        # Check if supplier exists
        supplier = Supplier.query.get(supplier_id)
        if not supplier:
            return jsonify({
                'success': False,
                'error': 'Supplier not found'
            }), 404
        
        # Validate amount is positive
        amount = float(data['amount'])
        if amount <= 0:
            return jsonify({
                'success': False,
                'error': 'Amount must be greater than 0'
            }), 400
        
        # Create new payment
        payment = SupplierPayment(
            supplier_id=supplier_id,
            amount=amount,
            payment_method=data.get('payment_method', 'Cash'),
            reference_number=data.get('reference_number'),
            notes=data.get('notes'),
            payment_date=datetime.utcnow()
        )
        
        db.session.add(payment)
        db.session.commit()
        
        logger.info(f"Payment of {amount} recorded for supplier {supplier_id}")
        
        return jsonify({
            'success': True,
            'message': 'Payment recorded successfully',
            'payment': {
                'id': payment.id,
                'supplier_id': payment.supplier_id,
                'amount': float(payment.amount),
                'payment_method': payment.payment_method,
                'reference_number': payment.reference_number,
                'notes': payment.notes,
                'payment_date': payment.payment_date.isoformat() if payment.payment_date else None
            }
        }), 201
        
    except ValueError as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Invalid amount value'
        }), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating payment: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Failed to record payment'
        }), 500


@payment_tracking_bp.route('/payments/<int:payment_id>', methods=['DELETE'])
def delete_payment(payment_id):
    """Delete a payment record"""
    try:
        payment = SupplierPayment.query.get(payment_id)
        if not payment:
            return jsonify({
                'success': False,
                'error': 'Payment record not found'
            }), 404
        
        # Store supplier_id for logging
        supplier_id = payment.supplier_id
        amount = payment.amount
        
        db.session.delete(payment)
        db.session.commit()
        
        logger.info(f"Payment of {amount} deleted for supplier {supplier_id}")
        
        return jsonify({
            'success': True,
            'message': 'Payment deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting payment: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to delete payment'
        }), 500


@payment_tracking_bp.route('/payments/<int:payment_id>', methods=['PUT'])
def update_payment(payment_id):
    """Update a payment record"""
    try:
        payment = SupplierPayment.query.get(payment_id)
        if not payment:
            return jsonify({
                'success': False,
                'error': 'Payment record not found'
            }), 404
        
        data = request.get_json()
        
        # Update fields if provided
        if 'amount' in data:
            amount = float(data['amount'])
            if amount <= 0:
                return jsonify({
                    'success': False,
                    'error': 'Amount must be greater than 0'
                }), 400
            payment.amount = amount
        
        if 'payment_method' in data:
            payment.payment_method = data['payment_method']
        
        if 'reference_number' in data:
            payment.reference_number = data['reference_number']
        
        if 'notes' in data:
            payment.notes = data['notes']
        
        payment.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Payment {payment_id} updated for supplier {payment.supplier_id}")
        
        return jsonify({
            'success': True,
            'message': 'Payment updated successfully',
            'payment': {
                'id': payment.id,
                'supplier_id': payment.supplier_id,
                'amount': float(payment.amount),
                'payment_method': payment.payment_method,
                'reference_number': payment.reference_number,
                'notes': payment.notes,
                'payment_date': payment.payment_date.isoformat() if payment.payment_date else None
            }
        }), 200
        
    except ValueError as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Invalid amount value'
        }), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating payment: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to update payment'
        }), 500


@payment_tracking_bp.route('/suppliers/<int:supplier_id>/payment-summary', methods=['GET'])
def get_supplier_payment_summary(supplier_id):
    """Get payment summary for a specific supplier"""
    try:
        # Check if supplier exists
        supplier = Supplier.query.get(supplier_id)
        if not supplier:
            return jsonify({
                'success': False,
                'error': 'Supplier not found'
            }), 404
        
        # Get all items for this supplier
        items = Item.query.filter_by(supplier_id=supplier_id).all()
        
        # Calculate total purchase amount (quantity × buy_price)
        total_purchase = sum((item.quantity or 0) * (item.buy_price or 0) for item in items)
        
        # Get all payments
        payments = SupplierPayment.query.filter_by(supplier_id=supplier_id).all()
        total_paid = sum(payment.amount for payment in payments)
        
        remaining_balance = total_purchase - total_paid
        
        # Determine payment status
        if remaining_balance <= 0:
            payment_status = 'Paid'
        elif total_paid > 0:
            payment_status = 'Pending'
        else:
            payment_status = 'Unpaid'
        
        return jsonify({
            'success': True,
            'summary': {
                'supplier_id': supplier_id,
                'supplier_name': supplier.name,
                'supplier_company': supplier.company,
                'total_purchase': float(total_purchase),
                'total_paid': float(total_paid),
                'remaining_balance': float(remaining_balance),
                'payment_status': payment_status,
                'items_count': len(items),
                'payments_count': len(payments)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching payment summary: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch payment summary'
        }), 500


@payment_tracking_bp.route('/payment-analytics/overview', methods=['GET'])
def get_payment_analytics():
    """Get overall payment analytics"""
    try:
        # Get all suppliers
        suppliers = Supplier.query.all()
        
        total_suppliers = len(suppliers)
        total_purchase = 0
        total_paid = 0
        
        # Calculate totals
        for supplier in suppliers:
            items = Item.query.filter_by(supplier_id=supplier.id).all()
            total_purchase += sum((item.quantity or 0) * (item.buy_price or 0) for item in items)
            
            payments = SupplierPayment.query.filter_by(supplier_id=supplier.id).all()
            total_paid += sum(payment.amount for payment in payments)
        
        remaining_balance = total_purchase - total_paid
        
        # Get payment method distribution
        payment_methods = db.session.query(
            SupplierPayment.payment_method,
            db.func.count(SupplierPayment.id).label('count'),
            db.func.sum(SupplierPayment.amount).label('total_amount')
        ).group_by(SupplierPayment.payment_method).all()
        
        # Get monthly payment trends (last 6 months)
        from sqlalchemy import func, extract
        monthly_trends = db.session.query(
            func.date_format(SupplierPayment.payment_date, '%Y-%m').label('month'),
            func.sum(SupplierPayment.amount).label('total_amount'),
            func.count(SupplierPayment.id).label('payment_count')
        ).filter(
            SupplierPayment.payment_date >= datetime.utcnow().replace(day=1)
        ).group_by('month').order_by('month').limit(6).all()
        
        return jsonify({
            'success': True,
            'analytics': {
                'total_suppliers': total_suppliers,
                'total_purchase': float(total_purchase),
                'total_paid': float(total_paid),
                'remaining_balance': float(remaining_balance),
                'payment_methods': [{
                    'method': pm[0],
                    'count': pm[1],
                    'total_amount': float(pm[2]) if pm[2] else 0
                } for pm in payment_methods],
                'monthly_trends': [{
                    'month': mt[0],
                    'total_amount': float(mt[1]) if mt[1] else 0,
                    'payment_count': mt[2]
                } for mt in monthly_trends]
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching payment analytics: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Failed to fetch analytics'
        }), 500


@payment_tracking_bp.route('/payments/search', methods=['GET'])
def search_payments():
    """Search payments by reference number, supplier name, or date range"""
    try:
        query = request.args.get('q', '')
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        
        payments_query = SupplierPayment.query.join(Supplier)
        
        # Search by reference number or supplier name
        if query:
            payments_query = payments_query.filter(
                db.or_(
                    SupplierPayment.reference_number.ilike(f'%{query}%'),
                    Supplier.name.ilike(f'%{query}%'),
                    Supplier.company.ilike(f'%{query}%')
                )
            )
        
        # Filter by date range
        if from_date:
            from_datetime = datetime.strptime(from_date, '%Y-%m-%d')
            payments_query = payments_query.filter(SupplierPayment.payment_date >= from_datetime)
        
        if to_date:
            to_datetime = datetime.strptime(to_date, '%Y-%m-%d')
            to_datetime = to_datetime.replace(hour=23, minute=59, second=59)
            payments_query = payments_query.filter(SupplierPayment.payment_date <= to_datetime)
        
        # Order by most recent first
        payments = payments_query.order_by(SupplierPayment.payment_date.desc()).limit(50).all()
        
        return jsonify({
            'success': True,
            'payments': [{
                'id': payment.id,
                'supplier_id': payment.supplier_id,
                'supplier_name': payment.supplier.name,
                'supplier_company': payment.supplier.company,
                'amount': float(payment.amount),
                'payment_method': payment.payment_method,
                'reference_number': payment.reference_number,
                'notes': payment.notes,
                'payment_date': payment.payment_date.isoformat() if payment.payment_date else None
            } for payment in payments]
        }), 200
        
    except Exception as e:
        logger.error(f"Error searching payments: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to search payments'
        }), 500


@payment_tracking_bp.route('/suppliers/<int:supplier_id>/payment-history', methods=['GET'])
def get_payment_history(supplier_id):
    """Get paginated payment history for a supplier"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Check if supplier exists
        supplier = Supplier.query.get(supplier_id)
        if not supplier:
            return jsonify({
                'success': False,
                'error': 'Supplier not found'
            }), 404
        
        # Get paginated payments
        paginated_payments = SupplierPayment.query.filter_by(supplier_id=supplier_id)\
            .order_by(SupplierPayment.payment_date.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'payments': [{
                'id': payment.id,
                'amount': float(payment.amount),
                'payment_method': payment.payment_method,
                'reference_number': payment.reference_number,
                'notes': payment.notes,
                'payment_date': payment.payment_date.isoformat() if payment.payment_date else None
            } for payment in paginated_payments.items],
            'total': paginated_payments.total,
            'pages': paginated_payments.pages,
            'current_page': paginated_payments.page
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching payment history: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch payment history'
        }), 500