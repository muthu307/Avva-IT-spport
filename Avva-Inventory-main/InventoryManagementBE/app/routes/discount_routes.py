from flask import Blueprint, request, jsonify
from app.models import DiscountRange, DiscountLog
from app import db
from datetime import datetime
import traceback
import json

# Create blueprint
discount_bp = Blueprint('discount', __name__, url_prefix='/api')


@discount_bp.route('/discounts', methods=['GET'])
def get_discount_ranges():
    """Get all discount ranges"""
    try:
        ranges = DiscountRange.query.filter_by(is_active=True).order_by(DiscountRange.min_amount).all()
        return jsonify([r.to_dict() for r in ranges]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@discount_bp.route('/discounts', methods=['POST'])
def create_discount_range():
    """Create a new discount range"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'min' not in data or 'discount' not in data:
            return jsonify({"error": "Missing required fields: min, discount"}), 400
        
        min_amount = float(data['min'])
        discount_percent = float(data['discount'])
        is_infinite = data.get('isInfinite', False)
        max_amount = None if is_infinite else data.get('max')
        
        if max_amount is not None:
            max_amount = float(max_amount)
        
        # Validate ranges
        if min_amount < 0:
            return jsonify({"error": "Min amount must be >= 0"}), 400
        if discount_percent < 0 or discount_percent > 100:
            return jsonify({"error": "Discount must be between 0 and 100"}), 400
        if max_amount is not None and max_amount <= min_amount:
            return jsonify({"error": "Max amount must be greater than min amount"}), 400
        
        # Check for overlaps
        validation = validate_range_overlap(min_amount, max_amount, is_infinite)
        if not validation['valid']:
            return jsonify({"error": validation['error']}), 400
        
        # Create new range
        new_range = DiscountRange(
            min_amount=min_amount,
            max_amount=max_amount,
            discount_percent=discount_percent,
            is_infinite=is_infinite,
            is_active=True
        )
        
        db.session.add(new_range)
        db.session.commit()
        
        # Log the creation
        log_entry = DiscountLog(
            range_id=new_range.id,
            action='CREATE',
            old_values=None,
            new_values=json.dumps(new_range.to_dict())
        )
        db.session.add(log_entry)
        db.session.commit()
        
        return jsonify({
            "message": "Discount range created successfully",
            "range": new_range.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating discount range: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@discount_bp.route('/discounts/<int:range_id>', methods=['PUT'])
def update_discount_range(range_id):
    """Update a discount range"""
    try:
        data = request.get_json()
        discount_range = DiscountRange.query.get(range_id)
        
        if not discount_range:
            return jsonify({"error": "Discount range not found"}), 404
        
        # Store old values for logging
        old_values = discount_range.to_dict()
        
        # Update fields
        if 'min' in data:
            discount_range.min_amount = float(data['min'])
        if 'discount' in data:
            discount_range.discount_percent = float(data['discount'])
        if 'isInfinite' in data:
            discount_range.is_infinite = bool(data['isInfinite'])
        if 'max' in data:
            discount_range.max_amount = float(data['max']) if data['max'] is not None else None
        
        # Validate
        if discount_range.min_amount < 0:
            db.session.rollback()
            return jsonify({"error": "Min amount must be >= 0"}), 400
        if discount_range.discount_percent < 0 or discount_range.discount_percent > 100:
            db.session.rollback()
            return jsonify({"error": "Discount must be between 0 and 100"}), 400
        if discount_range.max_amount is not None and discount_range.max_amount <= discount_range.min_amount:
            db.session.rollback()
            return jsonify({"error": "Max amount must be greater than min amount"}), 400
        
        # Check for overlaps (exclude current range)
        validation = validate_range_overlap(
            discount_range.min_amount,
            discount_range.max_amount,
            discount_range.is_infinite,
            exclude_id=range_id
        )
        if not validation['valid']:
            db.session.rollback()
            return jsonify({"error": validation['error']}), 400
        
        discount_range.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Log the update
        log_entry = DiscountLog(
            range_id=range_id,
            action='UPDATE',
            old_values=json.dumps(old_values),
            new_values=json.dumps(discount_range.to_dict())
        )
        db.session.add(log_entry)
        db.session.commit()
        
        return jsonify({
            "message": "Discount range updated successfully",
            "range": discount_range.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating discount range: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@discount_bp.route('/discounts/<int:range_id>', methods=['DELETE'])
def delete_discount_range(range_id):
    """Delete a discount range"""
    try:
        discount_range = DiscountRange.query.get(range_id)
        
        if not discount_range:
            return jsonify({"error": "Discount range not found"}), 404
        
        # Store values before deletion for logging
        old_values = discount_range.to_dict()
        
        db.session.delete(discount_range)
        db.session.commit()
        
        # Log the deletion
        log_entry = DiscountLog(
            range_id=range_id,
            action='DELETE',
            old_values=json.dumps(old_values),
            new_values=None
        )
        db.session.add(log_entry)
        db.session.commit()
        
        return jsonify({"message": "Discount range deleted successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting discount range: {str(e)}")
        return jsonify({"error": str(e)}), 500


@discount_bp.route('/discounts/calculate', methods=['POST'])
def calculate_discount():
    """Calculate discount for a given amount"""
    try:
        data = request.get_json()
        amount = float(data.get('amount', 0))
        
        if amount < 0:
            return jsonify({"error": "Amount must be >= 0"}), 400
        
        # Find matching range
        ranges = DiscountRange.query.filter_by(is_active=True).order_by(DiscountRange.min_amount).all()
        matched_range = None
        
        for r in ranges:
            if r.min_amount <= amount:
                if r.is_infinite or (r.max_amount is not None and amount <= r.max_amount):
                    matched_range = r
                    break
        
        if matched_range is None:
            return jsonify({
                "amount": amount,
                "matched_range": None,
                "discount_percent": 0,
                "discount_amount": 0,
                "final_amount": amount
            }), 200
        
        discount_amount = amount * (matched_range.discount_percent / 100)
        final_amount = amount - discount_amount
        
        return jsonify({
            "amount": amount,
            "matched_range": matched_range.to_dict(),
            "discount_percent": matched_range.discount_percent,
            "discount_amount": round(discount_amount, 2),
            "final_amount": round(final_amount, 2)
        }), 200
        
    except Exception as e:
        print(f"Error calculating discount: {str(e)}")
        return jsonify({"error": str(e)}), 500


@discount_bp.route('/discounts/validate-range', methods=['POST'])
def validate_range_endpoint():
    """Validate a discount range for overlaps"""
    try:
        data = request.get_json()
        min_amount = float(data.get('min', 0))
        max_amount = data.get('max')
        is_infinite = data.get('isInfinite', False)
        exclude_id = data.get('id')
        
        if max_amount is not None:
            max_amount = float(max_amount)
        
        if min_amount < 0:
            return jsonify({"valid": False, "error": "Min amount must be >= 0"}), 400
        if max_amount is not None and max_amount <= min_amount:
            return jsonify({"valid": False, "error": "Max amount must be greater than min amount"}), 400
        
        validation = validate_range_overlap(min_amount, max_amount, is_infinite, exclude_id)
        
        return jsonify(validation), 200 if validation['valid'] else 400
        
    except Exception as e:
        return jsonify({"valid": False, "error": str(e)}), 500


def validate_range_overlap(min_amount, max_amount, is_infinite, exclude_id=None):
    """Check if a range overlaps with existing ranges"""
    try:
        query = DiscountRange.query.filter_by(is_active=True)
        
        if exclude_id:
            query = query.filter(DiscountRange.id != exclude_id)
        
        existing_ranges = query.all()
        
        # Check for overlaps
        for existing in existing_ranges:
            if overlaps(min_amount, max_amount, is_infinite, 
                       existing.min_amount, existing.max_amount, existing.is_infinite):
                return {
                    "valid": False,
                    "error": f"Range overlaps with existing range: ₹{existing.min_amount:,.2f} - {'∞' if existing.is_infinite else f'₹{existing.max_amount:,.2f}'}"
                }
        
        return {"valid": True}
        
    except Exception as e:
        return {"valid": False, "error": str(e)}


def overlaps(min1, max1, infinite1, min2, max2, infinite2):
    """Check if two ranges overlap"""
    # If one range is infinite, check if the other starts within it
    if infinite1:
        return min2 >= min1
    if infinite2:
        return min1 >= min2
    
    # Both ranges are finite
    # They overlap if one starts before the other ends
    return not (max1 <= min2 or max2 <= min1)