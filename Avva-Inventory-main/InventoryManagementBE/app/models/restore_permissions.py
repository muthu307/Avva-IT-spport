import pymysql
import json
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

def get_db_config():
    """Get database configuration from environment variables or config file"""
    config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'user': os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', 'root123'),
        'database': os.getenv('DB_NAME', 'm3cars'),
        'port': int(os.getenv('DB_PORT', 3306))
    }
    
    try:
        from config import Config
        if hasattr(Config, 'SQLALCHEMY_DATABASE_URI'):
            import urllib.parse
            url = urllib.parse.urlparse(Config.SQLALCHEMY_DATABASE_URI)
            if url.username: config['user'] = url.username
            if url.password: config['password'] = url.password
            if url.hostname: config['host'] = url.hostname
            if url.port: config['port'] = url.port
            if url.path: config['database'] = url.path.lstrip('/')
    except Exception:
        pass

    return config

# Database configuration
DB_CONFIG = get_db_config()

# All submodules from your modules configuration
SUBMODULES = [
    # Main module
    "dashboard",
    
    # Inventory module
    "products", "category", "stock_in", "stock_out", "low_stock",
    
    # Billing module
    "create_bill", "bill_reports", "service_bill", "service_bills", 
    "quotations", "invoices", "discount",
    
    # Suppliers module
    "add_supplier", "supplier_list", "payment_tracking", "employee", 
    "user_type", "attendance", "company",
    
    # CRM module
    "enquiries", "customer_details", "usersettings"
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
        'description': 'Standard staff access - can view and add, limited edit/delete',
        'base_template': 'staff_dashboard.html',
        'permissions': [
            {
                "submodule_id": submodule,
                "view": True,
                "add": True if submodule not in ["user_type", "company", "payment_tracking"] else False,
                "edit": True if submodule in ["products", "category", "enquiries"] else False,
                "delete": False
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
                "view": submodule in ["create_bill", "bill_reports", "service_bill", "service_bills", "quotations", "invoices", "discount", "customer_details"],
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
                "view": submodule in ["products", "category", "stock_in", "stock_out", "low_stock", "supplier_list", "add_supplier"],
                "add": submodule in ["products", "category", "stock_in", "add_supplier"],
                "edit": submodule in ["products", "category"],
                "delete": submodule in ["products", "category"]
            }
            for submodule in SUBMODULES
        ]
    }
}

def restore_permissions():
    """Restore or initialize permissions for all user types"""
    
    try:
        # Connect to database
        connection = pymysql.connect(**DB_CONFIG)
        cursor = connection.cursor(pymysql.cursors.DictCursor)
        
        print("=" * 60)
        print("PERMISSIONS RESTORE SCRIPT")
        print("=" * 60)
        print(f"Connected to database: {DB_CONFIG['database']} on {DB_CONFIG['host']}")
        print(f"Total submodules: {len(SUBMODULES)}")
        print()
        
        # Check existing user types
        cursor.execute("SELECT id, name, base_template FROM user_types")
        existing_types = {row['name']: row for row in cursor.fetchall()}
        
        print(f"Found {len(existing_types)} existing user types: {', '.join(existing_types.keys())}")
        print()
        
        # Restore permissions for each preset
        created_count = 0
        updated_count = 0
        
        for user_type_name, preset in PERMISSION_PRESETS.items():
            permissions_json = json.dumps(preset['permissions'], indent=2)
            
            if user_type_name in existing_types:
                # Update existing user type
                cursor.execute(
                    "UPDATE user_types SET permissions = %s, base_template = %s, updated_at = %s WHERE name = %s",
                    (permissions_json, preset['base_template'], datetime.now(), user_type_name)
                )
                updated_count += 1
                print(f"✅ Updated '{user_type_name}': {preset['description']}")
            else:
                # Create new user type
                cursor.execute(
                    "INSERT INTO user_types (name, base_template, permissions, created_at, updated_at) VALUES (%s, %s, %s, %s, %s)",
                    (user_type_name, preset['base_template'], permissions_json, datetime.now(), datetime.now())
                )
                created_count += 1
                print(f"✨ Created '{user_type_name}': {preset['description']}")
        
        print()
        print("-" * 60)
        print("PERMISSIONS DETAILS:")
        print("-" * 60)
        
        # Display permission summary for each user type
        for user_type_name in PERMISSION_PRESETS.keys():
            cursor.execute("SELECT name, permissions FROM user_types WHERE name = %s", (user_type_name,))
            result = cursor.fetchone()
            
            if result:
                perms = json.loads(result['permissions'])
                
                # Calculate statistics
                total_modules = len(perms)
                view_count = sum(1 for p in perms if p['view'])
                add_count = sum(1 for p in perms if p['add'])
                edit_count = sum(1 for p in perms if p['edit'])
                delete_count = sum(1 for p in perms if p['delete'])
                
                print(f"\n📋 {result['name']}:")
                print(f"   Total Permissions: {total_modules}")
                print(f"   View: {view_count}/{total_modules} ({view_count*100//total_modules}%)")
                print(f"   Add: {add_count}/{total_modules} ({add_count*100//total_modules}%)")
                print(f"   Edit: {edit_count}/{total_modules} ({edit_count*100//total_modules}%)")
                print(f"   Delete: {delete_count}/{total_modules} ({delete_count*100//total_modules}%)")
        
        # Commit changes
        connection.commit()
        
        print()
        print("=" * 60)
        print("SUMMARY:")
        print("=" * 60)
        print(f"✅ Created: {created_count} user types")
        print(f"✅ Updated: {updated_count} user types")
        print(f"✅ Total processed: {len(PERMISSION_PRESETS)} user types")
        print("=" * 60)
        
        cursor.close()
        connection.close()
        
        print("\n🎉 Permissions restored successfully!")
        
    except pymysql.Error as e:
        print(f"❌ Database Error: {e}")
        print("\n💡 Tip: Make sure your database credentials are correct.")
        print("   You can set them via environment variables:")
        print("   export DB_PASSWORD=yourpassword")
        print("   Or create a .env file in the project root")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

def backup_permissions():
    """Backup current permissions to a JSON file"""
    
    try:
        connection = pymysql.connect(**DB_CONFIG)
        cursor = connection.cursor(pymysql.cursors.DictCursor)
        
        cursor.execute("SELECT id, name, base_template, permissions, created_at, updated_at FROM user_types")
        user_types = cursor.fetchall()
        
        # Parse permissions JSON for each user type
        for ut in user_types:
            if ut['permissions']:
                ut['permissions'] = json.loads(ut['permissions'])
        
        # Save to file
        backup_file = f"permissions_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(backup_file, 'w') as f:
            json.dump(user_types, f, indent=2, default=str)
        
        print(f"✅ Permissions backed up to {backup_file}")
        
        cursor.close()
        connection.close()
        
    except Exception as e:
        print(f"❌ Backup Error: {e}")

def list_all_permissions():
    """List all permissions for all user types"""
    
    try:
        connection = pymysql.connect(**DB_CONFIG)
        cursor = connection.cursor(pymysql.cursors.DictCursor)
        
        cursor.execute("SELECT id, name, base_template, permissions FROM user_types ORDER BY name")
        user_types = cursor.fetchall()
        
        print("\n" + "=" * 80)
        print("ALL USER TYPES AND PERMISSIONS")
        print("=" * 80)
        
        for ut in user_types:
            print(f"\n👤 User Type: {ut['name']}")
            print(f"   Template: {ut['base_template'] or 'default'}")
            
            if ut['permissions']:
                perms = json.loads(ut['permissions'])
                print(f"   Total Permissions: {len(perms)}")
                
                # Group by module (based on submodule_id)
                modules_dict = {}
                for perm in perms:
                    module = perm['submodule_id'].split('_')[0] if '_' in perm['submodule_id'] else perm['submodule_id']
                    if module not in modules_dict:
                        modules_dict[module] = []
                    modules_dict[module].append(perm)
                
                for module, module_perms in list(modules_dict.items())[:3]:
                    print(f"   📁 {module.upper()}: {len(module_perms)} submodules")
            else:
                print("   ⚠️ No permissions configured")
        
        cursor.close()
        connection.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == "backup":
            backup_permissions()
        elif command == "list":
            list_all_permissions()
        elif command == "restore":
            restore_permissions()
        else:
            print("Usage: python restore_permissions.py [restore|backup|list]")
            print("  restore - Restore permissions to default presets")
            print("  backup  - Backup current permissions to JSON file")
            print("  list    - List all current permissions")
    else:
        # Default action: restore permissions
        restore_permissions()