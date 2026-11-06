import sys

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)
    print("Creating Flask App...")
    app.config.from_object(Config)

    # Initialize database
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Initialize JWT
    jwt.init_app(app)

    # Enable CORS
    CORS(
        app,
        supports_credentials=True,
        resources={
            r"/*": {
                "origins": [
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                    r"^http://localhost:[0-9]+$",
                    r"^http://127\.0\.0\.1:[0-9]+$"
                ],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
                "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
                "expose_headers": ["Content-Type", "Authorization", "Content-Disposition"]
            }
        },
    )

    # Import models so Flask-Migrate detects them
    from app import models

    # Auto-add new break columns to attendance table if missing
    with app.app_context():
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            if 'attendance' in inspector.get_table_names():
                columns = [c['name'] for c in inspector.get_columns('attendance')]
                new_cols = [
                    ('break_1_start', 'DATETIME'),
                    ('break_1_end', 'DATETIME'),
                    ('break_2_start', 'DATETIME'),
                    ('break_2_end', 'DATETIME'),
                    ('total_break_time', 'FLOAT'),
                    ('excess_break_time', 'FLOAT')
                ]
                with db.engine.begin() as conn:
                    for col_name, col_type in new_cols:
                        if col_name not in columns:
                            conn.execute(text(f"ALTER TABLE attendance ADD COLUMN {col_name} {col_type}"))
                            print(f"[+] Added column {col_name} to attendance table")
        except Exception as e:
            print(f"Migration check info: {e}")

        # IT Support Auto-migration & Initial IT Support Engineer Seeding
        try:
            from sqlalchemy import inspect, text
            from app.models.it_support import ITDeveloper
            
            # Ensure it_developers table exists
            ITDeveloper.__table__.create(db.engine, checkfirst=True)

            inspector = inspect(db.engine)
            if 'it_support_tickets' in inspector.get_table_names():
                ticket_cols = [c['name'] for c in inspector.get_columns('it_support_tickets')]
                ticket_new_cols = [
                    ('progress_percentage', 'INT DEFAULT 0'),
                    ('assigned_developer_id', 'INT NULL'),
                    ('developer_notes', 'TEXT NULL'),
                    ('whatsapp_message', 'TEXT NULL'),
                    ('whatsapp_sent_at', 'DATETIME NULL'),
                ]
                with db.engine.begin() as conn:
                    for col_name, col_type in ticket_new_cols:
                        if col_name not in ticket_cols:
                            conn.execute(text(f"ALTER TABLE it_support_tickets ADD COLUMN {col_name} {col_type}"))
                            print(f"[+] Added column {col_name} to it_support_tickets table")

            if 'it_support_work_logs' in inspector.get_table_names():
                work_log_cols = [c['name'] for c in inspector.get_columns('it_support_work_logs')]
                if 'progress_percentage' not in work_log_cols:
                    with db.engine.begin() as conn:
                        conn.execute(text("ALTER TABLE it_support_work_logs ADD COLUMN progress_percentage INT DEFAULT 0"))
                        print("[+] Added column progress_percentage to it_support_work_logs table")

            # Pre-seed initial IT Support Engineers: Muthu, Naramatha, Kishore, Abishika, Babu, Keerthi
            INITIAL_DEVS = [
                {"name": "Muthu", "phone": "919876543210", "role": "Lead IT Support Engineer", "specialization": "Full Stack & Core Architecture", "avatar_color": "#3b82f6"},
                {"name": "Naramatha", "phone": "919812345678", "role": "Senior IT Support Engineer", "specialization": "Frontend & Web Applications", "avatar_color": "#ec4899"},
                {"name": "Kishore", "phone": "919823456789", "role": "DevOps & Systems Engineer", "specialization": "Infrastructure & Cloud Systems", "avatar_color": "#10b981"},
                {"name": "Abishika", "phone": "919834567890", "role": "IT Support Engineer", "specialization": "Backend APIs & Microservices", "avatar_color": "#8b5cf6"},
                {"name": "Babu", "phone": "919845678901", "role": "Network & Hardware Engineer", "specialization": "Network Security & Hardware Support", "avatar_color": "#f59e0b"},
                {"name": "Keerthi", "phone": "919856789012", "role": "Database & IT Support Engineer", "specialization": "Database Admin & Data Services", "avatar_color": "#06b6d4"},
            ]
            for dev_data in INITIAL_DEVS:
                existing = ITDeveloper.query.filter_by(name=dev_data['name']).first()
                if not existing:
                    dev = ITDeveloper(
                        name=dev_data['name'],
                        phone=dev_data['phone'],
                        email=f"{dev_data['name'].lower()}@avva.com",
                        role=dev_data['role'],
                        specialization=dev_data['specialization'],
                        status='Active',
                        avatar_color=dev_data['avatar_color']
                    )
                    db.session.add(dev)
            db.session.commit()
            print("[+] IT Support tables & initial IT Support Engineers verified successfully")
        except Exception as e:
            print(f"IT Support Migration / Seeding info: {e}")

    # Register Blueprints
    from app.routes.login_routes import login_bp
    from app.routes.product_routes import product_bp
    from app.routes.billing_routes import billing_bp
    from app.routes.supplier_routes import supplier_bp
    from app.routes.quotation_routes import quotation_bp
    from app.routes.invoice_routes import invoice_bp
    from app.routes.service_routes import service_bp
    from app.routes.usertype_routes import user_type_bp
    from app.routes.employee_routes import employee_bp
    from app.routes.attendance_routes import attendance_bp
    from app.routes.current_company_routes import company_bp
    from app.routes.enquiry_routes import enquiry_bp
    from app.routes.discount_routes import discount_bp
    from app.routes.permissions_routes import permissions_bp
    from app.routes.payment_routes import payment_tracking_bp
    from app.routes.Check_permissions_routes import check_permissions_bp
    from app.routes.restore_permissions_routes import restore_permissions_bp
    from app.routes.salary_routes import salary_bp
    from app.routes.it_support_routes import it_support_bp

    app.register_blueprint(login_bp, url_prefix="/api")
    app.register_blueprint(product_bp, url_prefix="/api")
    app.register_blueprint(billing_bp, url_prefix="/api")
    app.register_blueprint(supplier_bp)
    app.register_blueprint(quotation_bp, url_prefix='/api')
    app.register_blueprint(invoice_bp, url_prefix='/api')
    app.register_blueprint(service_bp)
    app.register_blueprint(user_type_bp)
    app.register_blueprint(employee_bp, url_prefix="/api")
    app.register_blueprint(attendance_bp, url_prefix="/api/attendance")
    app.register_blueprint(salary_bp, url_prefix="/api/salary")
    app.register_blueprint(company_bp)
    app.register_blueprint(enquiry_bp, url_prefix="/api") 
    app.register_blueprint(discount_bp)
    app.register_blueprint(permissions_bp)
    app.register_blueprint(payment_tracking_bp)
    app.register_blueprint(check_permissions_bp)
    app.register_blueprint(restore_permissions_bp)
    app.register_blueprint(it_support_bp, url_prefix='/api')

    # Health Check Route
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return {
            "status": "healthy",
            "message": "API is working"
        }, 200

    return app