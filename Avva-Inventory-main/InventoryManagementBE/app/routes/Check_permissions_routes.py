from flask import Blueprint, request, jsonify
from app import db
from app.models.usertype import UserType
import json
import traceback
from sqlalchemy import func

# Create blueprint with correct name
check_permissions_bp = Blueprint('check_permissions', __name__)

# Predefined modules structure
MODULES_JSON = {
    "modules": [
        {
            "id": "main",
            "name": "Main",
            "submodules": [
                {"id": "dashboard", "name": "Dashboard"}
            ]
        },
        {
            "id": "inventory",
            "name": "Inventory",
            "submodules": [
                {"id": "products", "name": "Products"},
                {"id": "category", "name": "Category"},
                {"id": "stock_in", "name": "Stock In"},
                {"id": "stock_out", "name": "Stock Out"},
                {"id": "low_stock", "name": "Low Stock"}
            ]
        },
        {
            "id": "warranty",
            "name": "Warranty",
            "submodules": [
                {"id": "warranty", "name": "Warranty"}
            ]
        },
        {
            "id": "billing",
            "name": "Billing",
            "submodules": [
                {"id": "create_bill", "name": "Create Bill"},
                {"id": "bill_reports", "name": "Bill Reports"},
                {"id": "service_bill", "name": "Service Bill"},
                {"id": "service_bills", "name": "Service Bills"},
                {"id": "sales_bills", "name": "Sales Bills"},
                {"id": "quotations", "name": "Quotations"},
                {"id": "invoices", "name": "Invoices"},
                {"id": "discount", "name": "Discount"}
            ]
        },
        {
            "id": "suppliers",
            "name": "Suppliers & HR",
            "submodules": [
                {"id": "add_supplier", "name": "Add Supplier"},
                {"id": "supplier_list", "name": "Supplier List"},
                {"id": "payment_tracking", "name": "Payment Tracking"},
                {"id": "employee", "name": "Employee"},
                {"id": "user_type", "name": "User Type"},
                {"id": "attendance", "name": "Attendance"},
                {"id": "salary", "name": "Salary"},
                {"id": "company", "name": "Company"}
            ]
        },
        {
            "id": "crm",
            "name": "CRM",
            "submodules": [
                {"id": "enquiries", "name": "Enquiries"},
                {"id": "customer_details", "name": "Customer Details"},
                {"id": "usersettings", "name": "User Settings"}
            ]
        }
    ]
}

@check_permissions_bp.route('/modules', methods=['GET'])
def get_modules():
    """Return the predefined modules JSON architecture."""
    return jsonify(MODULES_JSON), 200

@check_permissions_bp.route('/permissions', methods=['GET'])
def get_permissions():
    """Get active permissions for a given userType."""
    user_type_name = request.args.get('userType')
    if not user_type_name:
        return jsonify({'error': 'userType is required'}), 400

    try:
        user_type = UserType.query.filter(func.lower(UserType.name) == func.lower(user_type_name)).first()
        if not user_type:
            return jsonify({'error': f'UserType {user_type_name} not found'}), 404
        
        perms = []
        if user_type.permissions:
            try:
                perms = json.loads(user_type.permissions)
            except Exception as e:
                print(f"Error parsing permissions: {e}")
                perms = []
        
        return jsonify(perms), 200
        
    except Exception as e:
        print(f"Error in get_permissions: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to fetch permissions'}), 500

@check_permissions_bp.route('/save-permissions', methods=['POST'])
def save_permissions():
    """Save permissions mapping for a userType."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Invalid payload'}), 400
            
        user_type_name = None
        permissions_array = []
        
        if isinstance(data, dict):
            user_type_name = data.get('user_type')
            permissions_array = data.get('permissions', [])
        elif isinstance(data, list) and len(data) > 0:
            user_type_name = data[0].get('user_type')
            permissions_array = data
            
        if not user_type_name:
            return jsonify({'error': 'user_type is required in the payload'}), 400
            
        user_type = UserType.query.filter(func.lower(UserType.name) == func.lower(user_type_name)).first()
        
        if not user_type:
            return jsonify({'error': f'UserType {user_type_name} not found'}), 404
        
        # Format permissions
        formatted_permissions = []
        for perm in permissions_array:
            formatted_perm = {
                "module_id": perm.get('module_id'),
                "submodule_id": perm.get('submodule_id') or perm.get('id'),
                "view": perm.get('view', False),
                "add": perm.get('add', False),
                "edit": perm.get('edit', False),
                "delete": perm.get('delete', False)
            }
            formatted_permissions.append(formatted_perm)
        
        # Serialize as JSON and store it
        user_type.permissions = json.dumps(formatted_permissions)
        db.session.commit()
        
        return jsonify({
            'message': 'Permissions saved successfully',
            'user_type': user_type_name,
            'permissions_count': len(formatted_permissions)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in save_permissions: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to save permissions'}), 500

@check_permissions_bp.route('/check-permission', methods=['POST'])
def check_permission():
    """Check if a user type has specific permission."""
    try:
        data = request.get_json()
        user_type_name = data.get('user_type')
        submodule_id = data.get('submodule_id')
        action = data.get('action')  # 'view', 'add', 'edit', 'delete'
        
        if not all([user_type_name, submodule_id, action]):
            return jsonify({'error': 'Missing required fields: user_type, submodule_id, action'}), 400
        
        user_type = UserType.query.filter(func.lower(UserType.name) == func.lower(user_type_name)).first()
        if not user_type:
            return jsonify({'error': 'User type not found'}), 404
        
        # Get permissions from JSON field
        permissions = []
        if user_type.permissions:
            try:
                permissions = json.loads(user_type.permissions)
            except Exception:
                permissions = []
        
        # Find permission for the specific submodule
        has_permission = False
        for perm in permissions:
            if perm.get('submodule_id') == submodule_id:
                has_permission = perm.get(action, False)
                break
        
        return jsonify({
            'has_permission': has_permission,
            'user_type': user_type_name,
            'submodule_id': submodule_id,
            'action': action
        }), 200
        
    except Exception as e:
        print(f"Error in check_permission: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to check permission'}), 500

@check_permissions_bp.route('/user-types', methods=['GET'])
def get_user_types():
    """Get all user types for dropdown selection."""
    try:
        user_types = UserType.query.all()
        result = [{'id': ut.id, 'name': ut.name, 'base_template': ut.base_template} for ut in user_types]
        return jsonify(result), 200
    except Exception as e:
        print(f"Error in get_user_types: {str(e)}")
        return jsonify({'error': 'Failed to fetch user types'}), 500