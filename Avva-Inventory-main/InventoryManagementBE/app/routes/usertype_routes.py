from flask import Blueprint, request, jsonify
from app import db
from app.models.usertype import UserType
from sqlalchemy import func
import traceback
import json

# Create blueprint
user_type_bp = Blueprint('user_type', __name__, url_prefix='/api')

@user_type_bp.route('/user-types', methods=['GET'])
def get_user_types():
    """Get all user types"""
    try:
        user_types = UserType.query.order_by(UserType.created_at.desc()).all()
        return jsonify([user_type.to_dict() for user_type in user_types]), 200
    except Exception as e:
        print(f"Error in get_user_types: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to fetch user types'}), 500

@user_type_bp.route('/user-types', methods=['POST'])
def create_user_type():
    """Create a new user type"""
    try:
        data = request.get_json()
        
        if not data or 'name' not in data:
            return jsonify({'error': 'Name is required'}), 400
        
        name = data['name'].strip()
        
        if not name:
            return jsonify({'error': 'Name cannot be empty'}), 400
        
        # Check for duplicate
        existing = UserType.query.filter(
            func.lower(UserType.name) == func.lower(name)
        ).first()
        
        if existing:
            return jsonify({'error': 'User type already exists'}), 400
        
        # Create new user type
        base_template = data.get('base_template')
        permissions_raw = data.get('permissions')
        permissions_json = json.dumps(permissions_raw) if permissions_raw else None
        
        user_type = UserType(name=name, base_template=base_template, permissions=permissions_json)
        db.session.add(user_type)
        db.session.commit()
        
        return jsonify(user_type.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in create_user_type: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to create user type'}), 500

@user_type_bp.route('/user-types/<int:id>', methods=['PUT'])
def update_user_type(id):
    """Update an existing user type"""
    try:
        user_type = UserType.query.get(id)
        
        if not user_type:
            return jsonify({'error': 'User type not found'}), 404
        
        data = request.get_json()
        
        if not data or 'name' not in data:
            return jsonify({'error': 'Name is required'}), 400
        
        name = data['name'].strip()
        
        if not name:
            return jsonify({'error': 'Name cannot be empty'}), 400
        
        # Check for duplicate (excluding current)
        existing = UserType.query.filter(
            func.lower(UserType.name) == func.lower(name),
            UserType.id != id
        ).first()
        
        if existing:
            return jsonify({'error': 'User type already exists'}), 400
        
        # Update user type
        user_type.name = name
        if 'base_template' in data:
            user_type.base_template = data['base_template']
        if 'permissions' in data:
            permissions_raw = data['permissions']
            user_type.permissions = json.dumps(permissions_raw) if permissions_raw else None
            
        db.session.commit()
        
        return jsonify(user_type.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in update_user_type: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to update user type'}), 500

@user_type_bp.route('/user-types/<int:id>', methods=['DELETE'])
def delete_user_type(id):
    """Delete a user type"""
    try:
        user_type = UserType.query.get(id)
        
        if not user_type:
            return jsonify({'error': 'User type not found'}), 404
        
        # Check if user type is being used (if you have users table)
        # if user_type.users:
        #     return jsonify({'error': 'Cannot delete user type that is assigned to users'}), 400
        
        db.session.delete(user_type)
        db.session.commit()
        
        return jsonify({'message': 'User type deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in delete_user_type: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to delete user type'}), 500