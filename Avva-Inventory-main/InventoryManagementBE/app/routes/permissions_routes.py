from flask import Blueprint, request, jsonify
from app import db
from app.models.usertype import UserType
import json
import traceback
from sqlalchemy import func

permissions_bp = Blueprint('permissions', __name__, url_prefix='/api')

MODULES_JSON = {
  "modules": [
    {
      "id": "main",
      "name": "Main",
      "submodules": [
        { "id": "dashboard", "name": "Dashboard" }
      ]
    },
    {
      "id": "inventory",
      "name": "Inventory",
      "submodules": [
        { "id": "products", "name": "Products" },
        { "id": "category", "name": "Category" },
        { "id": "stock_in", "name": "Stock In" },
        { "id": "stock_out", "name": "Stock Out" },
        { "id": "low_stock", "name": "Low Stock" }
      ]
    },
    {
      "id": "warranty",
      "name": "Warranty",
      "submodules": [
        { "id": "warranty", "name": "Warranty" }
      ]
    },
    {
      "id": "billing",
      "name": "Billing",
      "submodules": [
        { "id": "create_bill", "name": "Create Bill" },
        { "id": "bill_reports", "name": "Bill Reports" },
        { "id": "service_bill", "name": "Service Bill" },
        { "id": "service_bills", "name": "Service Bills" },
        { "id": "sales_bills", "name": "Sales Bills" },
        { "id": "quotations", "name": "Quotations" },
        { "id": "invoices", "name": "Invoices" },
        { "id": "discount", "name": "Discount" }
      ]
    },
    {
      "id": "suppliers",
      "name": "Suppliers & HR",
      "submodules": [
        { "id": "add_supplier", "name": "Add Supplier" },
        { "id": "supplier_list", "name": "Supplier List" },
        { "id": "payment_tracking", "name": "Payment Tracking" },
        { "id": "employee", "name": "Employee" },
        { "id": "user_type", "name": "User Type" },
        { "id": "attendance", "name": "Attendance" },
        { "id": "salary", "name": "Salary" },
        { "id": "company", "name": "Company" }
      ]
    },
    {
      "id": "crm",
      "name": "CRM",
      "submodules": [
        { "id": "enquiries", "name": "Enquiries" },
        { "id": "customer_details", "name": "Customer Details" },
        { "id": "usersettings", "name": "User Settings" }
      ]
    }
  ]
}

@permissions_bp.route('/modules', methods=['GET'])
def get_modules():
    """Return the predefined modules JSON architecture."""
    return jsonify(MODULES_JSON), 200

@permissions_bp.route('/permissions', methods=['GET'])
def get_permissions():
    """Get active permissions for a given userType."""
    user_type_name = request.args.get('userType')
    if not user_type_name:
        return jsonify({'error': 'userType is required'}), 400

    try:
        user_type = UserType.query.filter(func.lower(UserType.name) == func.lower(user_type_name)).first()
        if not user_type:
            # If user type doesn't exist, just return empty permissions
            return jsonify([]), 200
        
        perms = []
        if user_type.permissions:
            try:
                perms = json.loads(user_type.permissions)
            except Exception:
                perms = []
        
        return jsonify(perms), 200
        
    except Exception as e:
        print(f"Error in get_permissions: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to fetch permissions'}), 500

@permissions_bp.route('/save-permissions', methods=['POST'])
def save_permissions():
    """Save permissions mapping for a userType."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Invalid payload'}), 400
            
        # Payload can be:
        # { "user_type": "admin", "permissions": [ ... array of perms ... ] }
        # OR an array of permission objects (where each has user_type, module_id, etc.)
        
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
            
        # Serialize simply as JSON and store it
        user_type.permissions = json.dumps(permissions_array)
        db.session.commit()
        
        return jsonify({'message': 'Permissions saved successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in save_permissions: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to save permissions'}), 500
@permissions_bp.route('/bulk-save-permissions', methods=['POST'])
def bulk_save_permissions():
    """Bulk update permissions for multiple user types in one transaction."""
    try:
        data = request.get_json()
        if not data or not isinstance(data, dict):
            return jsonify({'error': 'Payload must be a dictionary of user_type to permissions_array'}), 400
            
        # Payload: { "admin": [..], "staff": [..] }
        for user_type_name, perms_array in data.items():
            user_type = UserType.query.filter(func.lower(UserType.name) == func.lower(user_type_name)).first()
            if user_type:
                user_type.permissions = json.dumps(perms_array)
        
        db.session.commit()
        return jsonify({'message': 'All permissions updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in bulk_save_permissions: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to perform bulk update'}), 500
