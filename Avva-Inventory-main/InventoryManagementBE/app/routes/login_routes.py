from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
import json

from app.models.login import db, login
from app.models.usertype import UserType

login_bp = Blueprint('login_bp', __name__)


# ---------- USER REGISTER ----------
@login_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    username = data.get('username')
    password = data.get('password')

    if not email or not username or not password:
        return jsonify({'error': 'All fields are required'}), 400

    if login.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 409

    # ❌ No hashing (plain password)
    new_user = login(
        email=email,
        username=username,
        password=password
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'User registered successfully'}), 201


# ---------- USER LOGIN ----------
@login_bp.route('/login', methods=['POST'])
def user_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = login.query.filter_by(email=email).first()

    # ✅ Direct password comparison
    if not user or user.password != password:
        return jsonify({'error': 'Invalid credentials'}), 401

    # ✅ Generate JWT token
    access_token = create_access_token(identity=user.id)

    # Fetch Admin permissions as default for login users
    admin_type = UserType.query.filter_by(name='Admin').first()
    permissions = {}
    if admin_type and admin_type.permissions:
        try:
            permissions = json.loads(admin_type.permissions)
        except Exception:
            permissions = {}

    # ✅ Password NOT returned
    return jsonify({
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'user_type': 'Admin',
            'permissions': permissions
        },
        'access_token': access_token
    }), 200

