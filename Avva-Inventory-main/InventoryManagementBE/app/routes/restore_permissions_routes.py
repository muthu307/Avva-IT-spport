from flask import Blueprint, request, jsonify
from app import db
from app.models.usertype import UserType
import json
from datetime import datetime

# Create blueprint with correct name
restore_permissions_bp = Blueprint('restore_permissions', __name__)

# All submodules from your modules configuration
SUBMODULES = [
    "dashboard", "products", "category", "stock_in", "stock_out", "low_stock",
    "create_bill", "bill_reports", "service_bill", "service_bills", 
    "quotations", "invoices", "discount", "add_supplier", "supplier_list", 
    "payment_tracking", "employee", "user_type", "attendance", "company", 
    "enquiries", "customer_details", "usersettings", "salary"
]

# Define permission presets for different user types
PERMISSION_PRESETS = {
    'Admin': {
        'description': 'Full access to everything',
        'base_template': 'admin_dashboard.html',
        'permissions': [
            {
                "submodule_id": submodule,
                "view": True,
                "add": True,
                "edit": True,
                "delete": True
            }
            for submodule in SUBMODULES
        ]
    },
    'staff': {
        'description': 'Standard staff access - full access to all sections',
        'base_template': 'staff_dashboard.html',
        'permissions': [
            {
                "submodule_id": submodule,
                "view": True,
                "add": True,
                "edit": True,
                "delete": True
            }
            for submodule in SUBMODULES
        ]
    },
    'employee': {
        'description': 'Employee access - full access to all sections',
        'base_template': 'employee_dashboard.html',
        'permissions': [
            {
                "submodule_id": submodule,
                "view": True,
                "add": True,
                "edit": True,
                "delete": True
            }
            for submodule in SUBMODULES
        ]
    },
    'manager': {
        'description': 'Manager access - can view, add, edit but limited delete',
        'base_template': 'manager_dashboard.html',
        'permissions': [
            {
                "submodule_id": submodule,
                "view": True,
                "add": True,
                "edit": True,
                "delete": True if submodule in ["products", "enquiries", "quotations", "invoices"] else False
            }
            for submodule in SUBMODULES
        ]
    },
    'viewer': {
        'description': 'Read-only access',
        'base_template': 'viewer_dashboard.html',
        'permissions': [
            {
                "submodule_id": submodule,
                "view": True,
                "add": False,
                "edit": False,
                "delete": False
            }
            for submodule in SUBMODULES
        ]
    },
    'billing_staff': {
        'description': 'Billing department - focused on billing modules',
        'base_template': 'billing_dashboard.html',
        'permissions': [
            {
                "submodule_id": submodule,
                "view": submodule in ["create_bill", "bill_reports", "service_bill", "service_bills", "quotations", "invoices", "discount", "customer_details", "salary"],
                "add": submodule in ["create_bill", "service_bill", "quotations", "invoices"],
                "edit": submodule in ["create_bill", "quotations", "invoices"],
                "delete": False
            }
            for submodule in SUBMODULES
        ]
    },
    'inventory_staff': {
        'description': 'Inventory department - focused on inventory modules',
        'base_template': 'inventory_dashboard.html',
        'permissions': [
            {
                "submodule_id": submodule,
                "view": submodule in ["products", "category", "stock_in", "stock_out", "low_stock", "supplier_list", "add_supplier", "salary"],
                "add": submodule in ["products", "category", "stock_in", "add_supplier"],
                "edit": submodule in ["products", "category"],
                "delete": submodule in ["products", "category"]
            }
            for submodule in SUBMODULES
        ]
    }
}


@restore_permissions_bp.route('/restore-permissions', methods=['POST'])
def restore_all_permissions():
    """Restore permissions for all user types to default presets"""
    try:
        results = {}
        created_count = 0
        updated_count = 0
        
        for user_type_name, preset in PERMISSION_PRESETS.items():
            user_type = UserType.query.filter_by(name=user_type_name).first()
            permissions_json = json.dumps(preset['permissions'])
            
            if user_type:
                # Update existing
                user_type.permissions = permissions_json
                user_type.base_template = preset['base_template']
                user_type.updated_at = datetime.utcnow()
                updated_count += 1
                results[user_type_name] = 'updated'
            else:
                # Create new
                user_type = UserType(
                    name=user_type_name,
                    base_template=preset['base_template'],
                    permissions=permissions_json
                )
                db.session.add(user_type)
                created_count += 1
                results[user_type_name] = 'created'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Permissions restored successfully',
            'created': created_count,
            'updated': updated_count,
            'results': results
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500


@restore_permissions_bp.route('/restore-permissions/<string:user_type_name>', methods=['POST'])
def restore_single_permissions(user_type_name):
    """Restore permissions for a single user type"""
    try:
        if user_type_name not in PERMISSION_PRESETS:
            return jsonify({
                'success': False, 
                'error': f'No preset found for user type: {user_type_name}'
            }), 404
        
        preset = PERMISSION_PRESETS[user_type_name]
        permissions_json = json.dumps(preset['permissions'])
        
        user_type = UserType.query.filter_by(name=user_type_name).first()
        
        if user_type:
            # Update existing
            user_type.permissions = permissions_json
            user_type.base_template = preset['base_template']
            user_type.updated_at = datetime.utcnow()
            action = 'updated'
        else:
            # Create new
            user_type = UserType(
                name=user_type_name,
                base_template=preset['base_template'],
                permissions=permissions_json
            )
            db.session.add(user_type)
            action = 'created'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Permissions {action} for {user_type_name}',
            'action': action,
            'user_type': user_type_name,
            'permissions_count': len(preset['permissions'])
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500


@restore_permissions_bp.route('/permission-presets', methods=['GET'])
def get_permission_presets():
    """Get all available permission presets"""
    try:
        presets = {}
        for name, preset in PERMISSION_PRESETS.items():
            presets[name] = {
                'description': preset['description'],
                'base_template': preset['base_template'],
                'permissions_count': len(preset['permissions']),
                'submodules': [p['submodule_id'] for p in preset['permissions'][:10]]  # First 10 as sample
            }
        
        return jsonify({
            'success': True,
            'presets': presets,
            'total_presets': len(presets)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500


@restore_permissions_bp.route('/permission-presets/<string:user_type_name>', methods=['GET'])
def get_single_preset(user_type_name):
    """Get a specific permission preset"""
    try:
        if user_type_name not in PERMISSION_PRESETS:
            return jsonify({
                'success': False, 
                'error': f'No preset found for user type: {user_type_name}'
            }), 404
        
        preset = PERMISSION_PRESETS[user_type_name]
        
        return jsonify({
            'success': True,
            'user_type': user_type_name,
            'description': preset['description'],
            'base_template': preset['base_template'],
            'permissions': preset['permissions']
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500


@restore_permissions_bp.route('/backup-permissions', methods=['GET'])
def backup_current_permissions():
    """Backup current permissions to JSON response"""
    try:
        user_types = UserType.query.all()
        backup_data = []
        
        for ut in user_types:
            permissions = []
            if ut.permissions:
                try:
                    permissions = json.loads(ut.permissions)
                except:
                    permissions = []
            
            backup_data.append({
                'name': ut.name,
                'base_template': ut.base_template,
                'permissions': permissions,
                'created_at': ut.created_at.isoformat() if ut.created_at else None,
                'updated_at': ut.updated_at.isoformat() if ut.updated_at else None
            })
        
        return jsonify({
            'success': True,
            'backup_date': datetime.utcnow().isoformat(),
            'total_user_types': len(backup_data),
            'data': backup_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500


@restore_permissions_bp.route('/reset-user-type/<string:user_type_name>', methods=['DELETE'])
def reset_user_type(user_type_name):
    """Reset a user type to default (delete and recreate with default permissions)"""
    try:
        if user_type_name not in PERMISSION_PRESETS:
            return jsonify({
                'success': False, 
                'error': f'No preset found for user type: {user_type_name}'
            }), 404
        
        # Delete existing
        UserType.query.filter_by(name=user_type_name).delete()
        
        # Create new with default preset
        preset = PERMISSION_PRESETS[user_type_name]
        permissions_json = json.dumps(preset['permissions'])
        
        user_type = UserType(
            name=user_type_name,
            base_template=preset['base_template'],
            permissions=permissions_json
        )
        db.session.add(user_type)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'User type "{user_type_name}" has been reset to default',
            'user_type': user_type_name,
            'permissions_count': len(preset['permissions'])
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500