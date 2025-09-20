import os
from flask import Blueprint, jsonify, request, send_from_directory, current_app
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models.mock import Mock
from app.models.mistake import Mistake
import google.generativeai as genai
from PIL import Image
import pytesseract
from flask_cors import cross_origin

api_blueprint = Blueprint('api', __name__)

@api_blueprint.route("/health")
def health_check():
    return jsonify({"status": "ok", "message": "Backend is running!"})

# --- MOCK ROUTES ---
@api_blueprint.route("/mocks", methods=['GET', 'POST'])
def handle_mocks():
    if request.method == 'GET':
        all_mocks = Mock.query.order_by(Mock.date_taken.desc()).all()
        result = [
            {
                "id": mock.id,
                "name": mock.name,
                "score_overall": mock.score_overall,
                "percentile_overall": mock.percentile_overall,
                "date_taken": mock.date_taken.strftime('%Y-%m-%d %H:%M:%S')
            } for mock in all_mocks
        ]
        return jsonify(result), 200

    if request.method == 'POST':
        data = request.get_json()
        if not data or not 'name' in data or not 'score_overall' in data:
            return jsonify({"error": "Missing required fields"}), 400

        new_mock = Mock(
            name=data['name'],
            score_overall=data['score_overall'],
            percentile_overall=data.get('percentile_overall')
        )
        db.session.add(new_mock)
        db.session.commit()
        return jsonify({"message": "Mock created successfully!", "mock_id": new_mock.id}), 201

@api_blueprint.route("/mocks/<int:mock_id>", methods=['GET'])
def get_mock(mock_id):
    mock = Mock.query.get_or_404(mock_id)
    result = {
        "id": mock.id,
        "name": mock.name,
        "score_overall": mock.score_overall,
        "percentile_overall": mock.percentile_overall,
        "date_taken": mock.date_taken.strftime('%Y-%m-%d %H:%M:%S')
    }
    return jsonify(result), 200

# --- MISTAKE ROUTES ---
@api_blueprint.route("/mocks/<int:mock_id>/mistakes", methods=['GET', 'POST'])
def handle_mistakes(mock_id):
    if request.method == 'GET':
        mistakes = Mistake.query.filter_by(mock_id=mock_id).all()
        result = [
            {
                "id": mistake.id,
                "image_path": mistake.image_path.replace('\\', '/'),
                "analysis_text": mistake.analysis_text
            } for mistake in mistakes
        ]
        return jsonify(result), 200

    if request.method == 'POST':
        if 'files[]' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        files = request.files.getlist('files[]')
        
        if not files or all(file.filename == '' for file in files):
            return jsonify({"error": "No selected files"}), 400

        for file in files:
            if file:
                filename = secure_filename(file.filename)
                # Use the reliable path from the app config
                file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                new_mistake = Mistake(mock_id=mock_id, image_path=filename)
                db.session.add(new_mistake)
        
        db.session.commit()
        return jsonify({"message": f"{len(files)} files uploaded successfully"}), 201

@api_blueprint.route("/mistakes/<int:mistake_id>/analyze-visual", methods=['POST'])
def analyze_visual(mistake_id):
    mistake = Mistake.query.get_or_404(mistake_id)
    # Use the reliable path from the app config
    full_image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], mistake.image_path)
    api_key = os.environ.get('GEMINI_API_KEY')

    if not api_key or not os.path.exists(full_image_path):
        return jsonify({"error": "Configuration or file error"}), 500

    try:
        genai.configure(api_key=api_key)
        img = Image.open(full_image_path)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = "You are an expert tutor for the Indian SSC CGL exam. Analyze the provided screenshot of a multiple-choice question the user got wrong. Explain the underlying concept, why their answer was incorrect, and why the correct answer is right. Keep the tone encouraging and clear. Structure the output in markdown with headings for 'Concept', 'Mistake Analysis', and 'Correct Answer Explanation'."
        response = model.generate_content([prompt, img])
        analysis_text = response.text
        mistake.analysis_text = analysis_text
        db.session.commit()
        return jsonify({"analysis": analysis_text})
    except Exception as e:
        return jsonify({"error": "Failed to analyze with Gemini Vision", "message": str(e)}), 500

@api_blueprint.route("/mistakes/<int:mistake_id>/analyze-text", methods=['POST'])
def analyze_text(mistake_id):
    mistake = Mistake.query.get_or_404(mistake_id)
    # Use the reliable path from the app config
    full_image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], mistake.image_path)
    api_key = os.environ.get('GEMINI_API_KEY')

    if not api_key or not os.path.exists(full_image_path):
        return jsonify({"error": "Configuration or file error"}), 500

    try:
        img = Image.open(full_image_path)
        extracted_text = pytesseract.image_to_string(img)
        if not extracted_text.strip():
            return jsonify({"error": "OCR could not extract any text"}), 400

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""You are an expert SSC CGL exam tutor. Analyze the following text extracted from a screenshot of a multiple-choice question the user got wrong: "{extracted_text}". Explain the underlying concept, why their answer was incorrect, and why the correct answer is right. Keep the tone encouraging and clear. Structure the output in markdown with headings for 'Concept', 'Mistake Analysis', and 'Correct Answer Explanation'."""
        response = model.generate_content(prompt)
        analysis_text = response.text
        mistake.analysis_text = analysis_text
        db.session.commit()
        return jsonify({"analysis": analysis_text})
    except Exception as e:
        return jsonify({"error": "Failed to analyze with Gemini Text model", "message": str(e)}), 500

@api_blueprint.route("/uploads/<path:filename>")
@cross_origin()
def serve_upload(filename):
    # Use the reliable path from the app config
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

@api_blueprint.route("/mistakes/<int:mistake_id>", methods=['DELETE'])
def delete_mistake(mistake_id):
    try:
        mistake = Mistake.query.get_or_404(mistake_id)
        # Use the reliable path from the app config
        full_image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], mistake.image_path)

        if os.path.exists(full_image_path):
            os.remove(full_image_path)

        db.session.delete(mistake)
        db.session.commit()

        return jsonify({"message": "Mistake deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete mistake", "message": str(e)}), 500

@api_blueprint.route("/test")
def test_route():
    return jsonify({"message": "Blueprint is working!"})