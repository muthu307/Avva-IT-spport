from app import create_app, db
from app.models.usertype import UserType
import json

def check_all_permissions():
    """Check and display all permissions for all user types"""
    app = create_app()
    with app.app_context():
        user_types = UserType.query.all()
        
        print("\n" + "="*60)
        print("PERMISSIONS REPORT")
        print("="*60)
        
        for ut in user_types:
            print(f"\n📋 User Type: {ut.name}")
            print("-" * 40)
            
            perms = []
            if ut.permissions:
                try:
                    perms = json.loads(ut.permissions)
                except Exception as e:
                    print(f"  Error parsing permissions: {str(e)}")
            
            if perms:
                # Group by module
                modules_dict = {}
                for perm in perms:
                    module_id = perm.get('module_id', 'unknown')
                    if module_id not in modules_dict:
                        modules_dict[module_id] = []
                    modules_dict[module_id].append(perm)
                
                for module_id, module_perms in modules_dict.items():
                    print(f"\n  📁 Module: {module_id}")
                    for perm in module_perms:
                        submodule = perm.get('submodule_id', 'unknown')
                        actions = []
                        if perm.get('can_view'): actions.append('VIEW')
                        if perm.get('can_create'): actions.append('CREATE')
                        if perm.get('can_edit'): actions.append('EDIT')
                        if perm.get('can_delete'): actions.append('DELETE')
                        
                        print(f"    └─ {submodule}: {', '.join(actions) if actions else 'NO ACCESS'}")
            else:
                print("  ⚠️  No permissions configured")
        
        print("\n" + "="*60)

if __name__ == "__main__":
    check_all_permissions()