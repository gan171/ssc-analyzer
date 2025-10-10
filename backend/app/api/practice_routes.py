from flask import Blueprint, request, jsonify, current_app
from app.models.mistake import Mistake
from app.extensions import db
from app.api.helpers import call_gemini_vision_api
import os
import traceback

practice_routes = Blueprint('practice_routes', __name__)

@practice_routes.route('/practice/quiz', methods=['GET'])
def get_quiz():
    section_name = request.args.get('section_name')
    if section_name:
        mistakes = Mistake.query.filter_by(section_name=section_name).all()
    else:
        mistakes = Mistake.query.all()
    return jsonify([m.to_dict() for m in mistakes])

@practice_routes.route('/practice/submit', methods=['POST'])
def submit_answer():
    data = request.get_json()
    mistake_id = data.get('mistake_id')
    difficulty = data.get('difficulty')

    if not mistake_id or not difficulty:
        return jsonify({"error": "mistake_id and difficulty are required"}), 400

    mistake = Mistake.query.get(mistake_id)
    if not mistake:
        return jsonify({"error": "Mistake not found"}), 404

    mistake.difficulty = difficulty
    db.session.commit()

    if mistake.analysis_text:
        return jsonify(mistake.to_dict())

    try:
        analysis_text = call_gemini_vision_api(mistake)
        mistake.analysis_text = analysis_text
        db.session.commit()
        return jsonify(mistake.to_dict())
    except Exception as e:
        current_app.logger.error(f"Error during analysis for mistake {mistake_id}: {e}")
        traceback.print_exc()
        return jsonify({"message": f"An error occurred during analysis: {str(e)}"}), 500