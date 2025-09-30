from flask import Blueprint, jsonify

health_check_bp = Blueprint('health_check_bp', __name__)

@health_check_bp.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})