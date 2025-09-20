import os
from flask import Blueprint, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models.mock import Mock
from app.models.mistake import Mistake
import google.generativeai as genai
from PIL import Image
import pytesseract

api_blueprint = Blueprint('api', __name__)

@api_blueprint.route("/health")
def health_check():
    return jsonify({"status": "ok", "message": "Backend is running!"})

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
        # This is the validation line that likely had a typo in your file
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

        uploaded_paths = []
        for file in files:
            if file:
                filename = secure_filename(file.filename)
                upload_folder = os.path.join(os.getcwd(), 'uploads')
                os.makedirs(upload_folder, exist_ok=True)
                file_path = os.path.join(upload_folder, filename)
                file.save(file_path)
                new_mistake = Mistake(mock_id=mock_id, image_path=filename)
                db.session.add(new_mistake)
                uploaded_paths.append(file_path)

        db.session.commit()
        return jsonify({"message": f"{len(uploaded_paths)} files uploaded successfully"}), 201

@api_blueprint.route("/mistakes/<int:mistake_id>/analyze-visual", methods=['POST'])
def analyze_visual(mistake_id):
    mistake = Mistake.query.get_or_404(mistake_id)

    # --- FIX STARTS HERE ---
    # Rebuild the full path to the image file
    upload_folder = os.path.join(os.getcwd(), 'uploads')
    full_image_path = os.path.join(upload_folder, mistake.image_path) # mistake.image_path is just the filename

    api_key = os.environ.get('GEMINI_API_KEY')

    # Check for the API key and if the FULL path exists
    if not api_key or not os.path.exists(full_image_path):
        return jsonify({"error": "Configuration or file error"}), 500

    try:
        genai.configure(api_key=api_key)
        # Open the image from its FULL path
        img = Image.open(full_image_path)
        # --- FIX ENDS HERE ---

        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = "You are an expert tutor for the Indian SSC CGL exam..." # (rest of the prompt is the same)
        response = model.generate_content([prompt, img])
        analysis_text = response.text
        mistake.analysis_text = analysis_text
        db.session.commit()
        return jsonify({"analysis": analysis_text})
    except Exception as e:
        print(f"!!!!!!!! AN ERROR OCCURRED IN analyze_visual: {e} !!!!!!!!")
        return jsonify({"error": "Failed to analyze with Gemini Vision", "message": str(e)}), 500

@api_blueprint.route("/mistakes/<int:mistake_id>/analyze-text", methods=['POST'])
def analyze_text(mistake_id):
    mistake = Mistake.query.get_or_404(mistake_id)

    # --- FIX STARTS HERE ---
    upload_folder = os.path.join(os.getcwd(), 'uploads')
    full_image_path = os.path.join(upload_folder, mistake.image_path)

    api_key = os.environ.get('GEMINI_API_KEY')

    if not api_key or not os.path.exists(full_image_path):
        return jsonify({"error": "Configuration or file error"}), 500

    try:
        img = Image.open(full_image_path)
        # --- FIX ENDS HERE ---

        extracted_text = pytesseract.image_to_string(img)
        if not extracted_text.strip():
            return jsonify({"error": "OCR could not extract any text"}), 400

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""You are an expert SSC CGL exam tutor... "{extracted_text}" ...""" # (rest of the prompt is the same)
        response = model.generate_content(prompt)
        analysis_text = response.text
        mistake.analysis_text = analysis_text
        db.session.commit()
        return jsonify({"analysis": analysis_text})
    except Exception as e:
        print(f"!!!!!!!! AN ERROR OCCURRED IN analyze_text: {e} !!!!!!!!")
        return jsonify({"error": "Failed to analyze with Gemini Text model", "message": str(e)}), 500

@api_blueprint.route("/uploads/<path:filename>")
def serve_upload(filename):
    print("\n--- IMAGE REQUEST RECEIVED ---")
    print(f"1. Filename from browser: {filename}")

    # Get the absolute path to the 'backend' directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    upload_folder = os.path.join(backend_dir, 'uploads')
    print(f"2. Server is looking in folder: {upload_folder}")

    full_path_to_file = os.path.join(upload_folder, filename)
    print(f"3. Full path being checked: {full_path_to_file}")

    if os.path.exists(full_path_to_file):
        print("4. STATUS: SUCCESS - File was found at the path.")
    else:
        print("5. STATUS: FAILURE - File was NOT found at the path.")

    print("--------------------------\n")

    return send_from_directory(upload_folder, filename)

@api_blueprint.route("/mistakes/<int:mistake_id>", methods=['DELETE'])
def delete_mistake(mistake_id):
    try:
        mistake = Mistake.query.get_or_404(mistake_id)

        # Step 1: Delete the image file from the 'uploads' folder
        if os.path.exists(mistake.image_path):
            os.remove(mistake.image_path)

        # Step 2: Delete the record from the database
        db.session.delete(mistake)
        db.session.commit()

        return jsonify({"message": "Mistake deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete mistake", "message": str(e)}), 500