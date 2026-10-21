from flask import Blueprint, request, jsonify
from app import db
from app.models.current_company import Company
from datetime import datetime
import traceback
import re
import base64

# Create blueprint
company_bp = Blueprint('company', __name__, url_prefix='/api/companies')

# Allowed MIME types for logo uploads
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'}

def convert_boolean_field(value):
    """Convert various formats to boolean"""
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() == 'true'
    if isinstance(value, (int, float)):
        return bool(value)
    return bool(value)

def validate_gst_number(gst_number):
    """Validate GST number format"""
    if not gst_number:
        return True
    
    # GST number format: 15 characters
    # First 2 digits: state code
    # Next 10: PAN number
    # Next 1: entity number
    # Next 1: checksum digit
    pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$'
    return bool(re.match(pattern, gst_number))

def validate_ifsc_code(ifsc_code):
    """Validate IFSC code format"""
    if not ifsc_code:
        return True
    
    # IFSC format: 11 characters, first 4 letters, 5th character 0, last 6 alphanumeric
    pattern = r'^[A-Z]{4}0[A-Z0-9]{6}$'
    return bool(re.match(pattern, ifsc_code))

def validate_logo_file(file):
    """Validate logo file"""
    if not file or not file.filename:
        return True, ""
    
    # Check file size (max 5MB)
    file.seek(0, 2)  # Seek to end of file
    size = file.tell()
    file.seek(0)  # Reset file pointer
    
    if size > 5 * 1024 * 1024:  # 5MB limit
        return False, "Logo size should be less than 5MB"
    
    # Check MIME type
    mime_type = file.mimetype
    if mime_type not in ALLOWED_MIME_TYPES:
        return False, "Only JPEG, PNG, GIF, and WEBP images are allowed"
    
    return True, ""

@company_bp.route('/', methods=['GET'])
def get_companies():
    """Get all active companies with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        
        # Get paginated results
        paginated = Company.query.filter_by(
            deleted_at=None
        ).order_by(
            Company.created_at.desc()
        ).paginate(
            page=page, per_page=limit, error_out=False
        )
        
        companies = [company.to_dict() for company in paginated.items]
        
        return jsonify({
            'companies': companies,
            'total': paginated.total,
            'page': page,
            'pages': paginated.pages,
            'per_page': limit
        }), 200
        
    except Exception as e:
        print(f"Error in get_companies: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to fetch companies'}), 500

@company_bp.route('/list', methods=['GET'])
def get_companies_list():
    """Get simplified list of companies for dropdown (only id and name)"""
    try:
        companies = Company.query.filter_by(deleted_at=None, is_active=True).order_by(Company.name).all()
        companies_list = [{'id': company.id, 'name': company.name} for company in companies]
        return jsonify(companies_list), 200
    except Exception as e:
        print(f"Error in get_companies_list: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': 'Failed to fetch companies list'}), 500

@company_bp.route('/all', methods=['GET'])
def get_all_companies():
    """Get all companies including inactive ones"""
    try:
        companies = Company.query.order_by(Company.created_at.desc()).all()
        return jsonify([company.to_dict() for company in companies]), 200
    except Exception as e:
        print(f"Error in get_all_companies: {str(e)}")
        return jsonify({'error': 'Failed to fetch companies'}), 500

@company_bp.route('/<int:id>', methods=['GET'])
def get_company(id):
    """Get a single company by ID"""
    try:
        company = Company.query.get(id)
        if not company or company.deleted_at:
            return jsonify({'error': 'Company not found'}), 404
        return jsonify(company.to_dict()), 200
    except Exception as e:
        print(f"Error in get_company: {str(e)}")
        return jsonify({'error': 'Failed to fetch company'}), 500

@company_bp.route('/', methods=['POST'])
def create_company():
    """Create a new company with logo attachment"""
    try:
        # Check if request is multipart/form-data (for file upload)
        if request.content_type and 'multipart/form-data' in request.content_type:
            data = request.form
            logo_file = request.files.get('logo')
        else:
            data = request.get_json()
            logo_file = None
        
        # Convert data to dictionary if it's not already
        if hasattr(data, 'to_dict'):
            data = data.to_dict()
        
        # Validate required fields
        required_fields = ['name', 'address', 'phone']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field.replace("_", " ").title()} is required'}), 400
        
        # Validate GST number if provided
        if data.get('gst_number'):
            if not validate_gst_number(data['gst_number']):
                return jsonify({'error': 'Invalid GST number format'}), 400
            
            # Check if GST number already exists
            existing = Company.query.filter_by(gst_number=data['gst_number'], deleted_at=None).first()
            if existing:
                return jsonify({'error': 'GST number already exists'}), 400
        
        # Validate IFSC code if provided
        if data.get('bank_ifsc'):
            if not validate_ifsc_code(data['bank_ifsc']):
                return jsonify({'error': 'Invalid IFSC code format'}), 400
        
        # Handle logo attachment
        logo_binary = None
        logo_filename = None
        logo_mime_type = None
        
        if logo_file and logo_file.filename:
            # Validate logo
            is_valid, error_msg = validate_logo_file(logo_file)
            if not is_valid:
                return jsonify({'error': error_msg}), 400
            
            # Read logo binary data
            logo_binary = logo_file.read()
            logo_filename = logo_file.filename
            logo_mime_type = logo_file.mimetype
        
        # Handle registration date
        registration_date = None
        if data.get('registration_date'):
            try:
                registration_date = datetime.strptime(data['registration_date'], '%Y-%m-%d').date()
            except:
                pass
        
        # Convert is_active to boolean
        is_active = True  # Default value
        if 'is_active' in data:
            is_active = convert_boolean_field(data['is_active'])
        elif 'isActive' in data:
            is_active = convert_boolean_field(data['isActive'])
        
        # Create company
        company = Company(
            name=data['name'],
            address=data['address'],
            phone=data['phone'],
            alternate_phone=data.get('alternate_phone'),
            email=data.get('email'),
            gst_number=data.get('gst_number'),
            registration_date=registration_date,
            bank_name=data.get('bank_name'),
            bank_account_number=data.get('bank_account_number'),
            bank_ifsc=data.get('bank_ifsc'),
            bank_branch=data.get('bank_branch'),
            upi_id=data.get('upi_id'),
            logo=logo_binary,
            logo_filename=logo_filename,
            logo_mime_type=logo_mime_type,
            notes=data.get('notes'),
            is_active=is_active
        )
        
        db.session.add(company)
        db.session.commit()
        
        return jsonify(company.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in create_company: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Failed to create company: {str(e)}'}), 500

@company_bp.route('/<int:id>', methods=['PUT'])
def update_company(id):
    """Update an existing company with logo attachment"""
    try:
        company = Company.query.get(id)
        if not company or company.deleted_at:
            return jsonify({'error': 'Company not found'}), 404
        
        # Check if request is multipart/form-data (for file upload)
        if request.content_type and 'multipart/form-data' in request.content_type:
            data = request.form
            logo_file = request.files.get('logo')
        else:
            data = request.get_json()
            logo_file = None
        
        # Convert data to dictionary if it's not already
        if hasattr(data, 'to_dict'):
            data = data.to_dict()
        
        # Validate GST number if provided
        if data.get('gst_number'):
            if not validate_gst_number(data['gst_number']):
                return jsonify({'error': 'Invalid GST number format'}), 400
            
            # Check if GST number already exists for another company
            existing = Company.query.filter(
                Company.gst_number == data['gst_number'],
                Company.id != id,
                Company.deleted_at == None
            ).first()
            if existing:
                return jsonify({'error': 'GST number already exists'}), 400
        
        # Validate IFSC code if provided
        if data.get('bank_ifsc'):
            if not validate_ifsc_code(data['bank_ifsc']):
                return jsonify({'error': 'Invalid IFSC code format'}), 400
        
        # Handle logo attachment
        if logo_file and logo_file.filename:
            # Validate logo
            is_valid, error_msg = validate_logo_file(logo_file)
            if not is_valid:
                return jsonify({'error': error_msg}), 400
            
            # Update logo
            company.logo = logo_file.read()
            company.logo_filename = logo_file.filename
            company.logo_mime_type = logo_file.mimetype
        elif data.get('remove_logo') == 'true' or data.get('remove_logo') == True:
            # Remove logo if requested
            company.logo = None
            company.logo_filename = None
            company.logo_mime_type = None
        
        # Handle registration date
        registration_date = company.registration_date
        if data.get('registration_date'):
            try:
                registration_date = datetime.strptime(data['registration_date'], '%Y-%m-%d').date()
            except:
                pass
        
        # Update fields
        company.name = data.get('name', company.name)
        company.address = data.get('address', company.address)
        company.phone = data.get('phone', company.phone)
        company.alternate_phone = data.get('alternate_phone', company.alternate_phone)
        company.email = data.get('email', company.email)
        company.gst_number = data.get('gst_number', company.gst_number)
        company.registration_date = registration_date
        company.bank_name = data.get('bank_name', company.bank_name)
        company.bank_account_number = data.get('bank_account_number', company.bank_account_number)
        company.bank_ifsc = data.get('bank_ifsc', company.bank_ifsc)
        company.bank_branch = data.get('bank_branch', company.bank_branch)
        company.upi_id = data.get('upi_id', company.upi_id)
        company.notes = data.get('notes', company.notes)
        
        # Convert is_active to boolean if provided
        if 'is_active' in data:
            company.is_active = convert_boolean_field(data['is_active'])
        elif 'isActive' in data:
            company.is_active = convert_boolean_field(data['isActive'])
        
        db.session.commit()
        
        return jsonify(company.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in update_company: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Failed to update company: {str(e)}'}), 500

@company_bp.route('/<int:id>', methods=['DELETE'])
def delete_company(id):
    """Permanently delete a company"""
    try:
        company = Company.query.get(id)
        if not company:
            return jsonify({'error': 'Company not found'}), 404
        
        db.session.delete(company)
        db.session.commit()
        
        return jsonify({'message': 'Company deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in delete_company: {str(e)}")
        return jsonify({'error': 'Failed to delete company'}), 500

@company_bp.route('/<int:id>/soft-delete', methods=['POST'])
def soft_delete_company(id):
    """Soft delete a company"""
    try:
        company = Company.query.get(id)
        if not company or company.deleted_at:
            return jsonify({'error': 'Company not found'}), 404
        
        company.soft_delete()
        
        return jsonify({'message': 'Company deactivated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in soft_delete_company: {str(e)}")
        return jsonify({'error': 'Failed to deactivate company'}), 500

@company_bp.route('/<int:id>/restore', methods=['POST'])
def restore_company(id):
    """Restore a soft-deleted company"""
    try:
        company = Company.query.get(id)
        if not company:
            return jsonify({'error': 'Company not found'}), 404
        
        if not company.deleted_at:
            return jsonify({'error': 'Company is already active'}), 400
        
        company.restore()
        
        return jsonify({'message': 'Company restored successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in restore_company: {str(e)}")
        return jsonify({'error': 'Failed to restore company'}), 500

@company_bp.route('/<int:id>/toggle-status', methods=['POST'])
def toggle_company_status(id):
    """Toggle company active/inactive status"""
    try:
        company = Company.query.get(id)
        if not company or company.deleted_at:
            return jsonify({'error': 'Company not found'}), 404
        
        company.is_active = not company.is_active
        db.session.commit()
        
        status = 'activated' if company.is_active else 'deactivated'
        return jsonify({'message': f'Company {status} successfully', 'is_active': company.is_active}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in toggle_company_status: {str(e)}")
        return jsonify({'error': 'Failed to toggle company status'}), 500

@company_bp.route('/search', methods=['GET'])
def search_companies():
    """Search companies by name, GST, phone, or email with pagination"""
    try:
        query = request.args.get('q', '')
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        
        if not query:
            return jsonify({'companies': [], 'total': 0}), 200
        
        # Search in multiple fields
        search_query = Company.query.filter(
            Company.deleted_at == None,
            db.or_(
                Company.name.ilike(f'%{query}%'),
                Company.gst_number.ilike(f'%{query}%'),
                Company.phone.ilike(f'%{query}%'),
                Company.email.ilike(f'%{query}%')
            )
        ).order_by(Company.created_at.desc())
        
        # Get paginated results
        paginated = search_query.paginate(page=page, per_page=limit, error_out=False)
        
        companies = [company.to_dict() for company in paginated.items]
        
        return jsonify({
            'companies': companies,
            'total': paginated.total,
            'page': page,
            'pages': paginated.pages,
            'per_page': limit
        }), 200
        
    except Exception as e:
        print(f"Error in search_companies: {str(e)}")
        return jsonify({'error': 'Failed to search companies'}), 500

@company_bp.route('/<int:id>/logo', methods=['GET'])
def get_company_logo(id):
    """Get company logo image"""
    try:
        company = Company.query.get(id)
        if not company or not company.logo:
            return jsonify({'error': 'Logo not found'}), 404
        
        # Return the image data with proper MIME type
        return company.logo, 200, {
            'Content-Type': company.logo_mime_type or 'image/jpeg',
            'Content-Disposition': f'inline; filename="{company.logo_filename or "logo"}"'
        }
        
    except Exception as e:
        print(f"Error in get_company_logo: {str(e)}")
        return jsonify({'error': 'Failed to fetch logo'}), 500

@company_bp.route('/bulk', methods=['POST'])
def bulk_create_companies():
    """Create multiple companies at once"""
    try:
        data = request.get_json()
        if not isinstance(data, list):
            return jsonify({'error': 'Expected a list of companies'}), 400
        
        companies = []
        errors = []
        
        for idx, company_data in enumerate(data):
            try:
                # Validate required fields
                if not company_data.get('name') or not company_data.get('address') or not company_data.get('phone'):
                    errors.append({
                        'index': idx,
                        'error': 'Name, address, and phone are required'
                    })
                    continue
                
                # Convert is_active to boolean
                if 'is_active' in company_data:
                    company_data['is_active'] = convert_boolean_field(company_data['is_active'])
                
                # Handle registration date
                registration_date = None
                if company_data.get('registration_date'):
                    try:
                        registration_date = datetime.strptime(company_data['registration_date'], '%Y-%m-%d').date()
                    except:
                        pass
                
                company = Company(
                    name=company_data['name'],
                    address=company_data['address'],
                    phone=company_data['phone'],
                    alternate_phone=company_data.get('alternate_phone'),
                    email=company_data.get('email'),
                    gst_number=company_data.get('gst_number'),
                    registration_date=registration_date,
                    bank_name=company_data.get('bank_name'),
                    bank_account_number=company_data.get('bank_account_number'),
                    bank_ifsc=company_data.get('bank_ifsc'),
                    bank_branch=company_data.get('bank_branch'),
                    upi_id=company_data.get('upi_id'),
                    notes=company_data.get('notes'),
                    is_active=company_data.get('is_active', True)
                )
                
                companies.append(company)
                
            except Exception as e:
                errors.append({
                    'index': idx,
                    'error': str(e)
                })
        
        if companies:
            db.session.add_all(companies)
            db.session.commit()
        
        return jsonify({
            'message': f'Successfully created {len(companies)} companies',
            'created': len(companies),
            'errors': errors
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in bulk_create_companies: {str(e)}")
        return jsonify({'error': 'Failed to create companies'}), 500