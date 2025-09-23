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
from app.models.section import Section
from app.api.testbook_scraper import scrape_testbook_data
import traceback
from flask import current_app
from datetime import date
from app.models.api_call_counter import ApiCallCounter
from app.api.helpers import increment_api_call_counter
import re

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
        new_mock = Mock(
            name=data['name'],
            score_overall=data['score_overall'],
            percentile_overall=data['percentile_overall'],
            date_taken=data['date_taken']
        )
        db.session.add(new_mock)
        db.session.commit()

        for section_data in data.get('sections', []):
            new_section = Section(
                mock_id=new_mock.id,
                name=section_data['name'],
                score=section_data['score'],
                correct_count=section_data['correct_count'],
                incorrect_count=section_data['incorrect_count'],
                unattempted_count=section_data['unattempted_count'],
                time_taken_seconds=section_data['time_taken_seconds']
            )
            db.session.add(new_section)
        
        db.session.commit()

        return jsonify({"id": new_mock.id, "message": "Mock created successfully!"}), 201

@api_blueprint.route("/mocks/<int:mock_id>", methods=['GET'])
def get_mock_details(mock_id):
    mock = Mock.query.get_or_404(mock_id)
    return jsonify(mock.to_dict())

@api_blueprint.route("/mocks/<int:mock_id>/mistakes", methods=['GET', 'POST'])
@cross_origin()
def handle_mistakes(mock_id):
    if request.method == 'GET':
        mock = Mock.query.get_or_404(mock_id)
        return jsonify([mistake.to_dict() for mistake in mock.mistakes])
    
    if request.method == 'POST':
        if 'screenshots' not in request.files:
            return jsonify({"error": "No screenshot files provided"}), 400

        files = request.files.getlist('screenshots')
        section_name = request.form.get('section_name')
        question_type = request.form.get('question_type')

        if not section_name or not question_type:
            return jsonify({"error": "Missing section_name or question_type"}), 400
        
        for file in files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)

                new_mistake = Mistake(
                    mock_id=mock_id,
                    image_path=filename,
                    section_name=section_name,
                    question_type=question_type
                )
                db.session.add(new_mistake)
        
        db.session.commit()
        return jsonify({"message": "Mistakes added successfully!"}), 201

@api_blueprint.route("/mistakes/<int:mistake_id>/analyze-<analysis_type>", methods=['POST'])
def analyze_mistake(mistake_id, analysis_type):
    mistake = Mistake.query.get_or_404(mistake_id)
    image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], mistake.image_path)

    try:
        increment_api_call_counter()
        genai.configure(api_key=current_app.config['GEMINI_API_KEY'])
        # Updated to use a current and versatile model
        model = genai.GenerativeModel('gemini-1.5-flash-latest')

        prompt = """Analyze the attached screenshot of a multiple-choice question the user answered incorrectly. 
        Identify the core concept being tested, explain the user's likely mistake, detail the correct steps to solve it, and provide a key takeaway.
        Structure the output clearly and concisely with these exact headings: 
        'Core Concept:', 'Your Mistake:', 'Correct Steps:', and 'Key Takeaway:'."""
        
        img = Image.open(image_path)
        
        response = model.generate_content([prompt, img])
        
        mistake.analysis_text = response.text
        # Simple topic extraction (you can improve this)
        mistake.topic = response.text.split('\n')[0].replace('Core Concept:', '').strip()
        
        db.session.commit()
        return jsonify(mistake.to_dict())

    except Exception as e:
        current_app.logger.error(f"Error during analysis: {e}")
        traceback.print_exc()
        return jsonify({"message": f"An error occurred during analysis: {str(e)}"}), 500

@api_blueprint.route("/mocks/<int:mock_id>/analyze-all-mistakes", methods=['POST'])
def bulk_analyze_mistakes(mock_id):
    mock = Mock.query.get_or_404(mock_id)
    unanalyzed_mistakes = [m for m in mock.mistakes if not m.analysis_text]

    if not unanalyzed_mistakes:
        return jsonify({"message": "All mistakes are already analyzed."}), 200

    genai.configure(api_key=current_app.config['GEMINI_API_KEY'])
    model = genai.GenerativeModel('gemini-1.5-flash-latest')

    text_based_mistakes = []
    image_based_mistakes = []

    # --- Step 1: Segregate mistakes using OCR ---
    for mistake in unanalyzed_mistakes:
        try:
            increment_api_call_counter()
            image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], mistake.image_path)
            img = Image.open(image_path)
            # Use pytesseract to extract text
            extracted_text = pytesseract.image_to_string(img)
            
            # Simple heuristic: if we get more than 20 words, it's likely a text question
            if len(extracted_text.split()) > 20:
                text_based_mistakes.append({'mistake_obj': mistake, 'text': extracted_text})
            else:
                image_based_mistakes.append(mistake)
        except Exception as e:
            current_app.logger.error(f"OCR failed for mistake {mistake.id}: {e}")
            image_based_mistakes.append(mistake) # Treat as image if OCR fails

    analyzed_count = 0

    # --- Step 2: Batch process text-based mistakes ---
    if text_based_mistakes:
        # Create one large prompt with all text questions
        # We assign a unique ID to each question for easy parsing later
        batched_prompt_text = "Analyze the following questions. For each question, provide the Core Concept, Your Mistake, Correct Steps, and Key Takeaway.\n\n"
        for i, item in enumerate(text_based_mistakes):
            batched_prompt_text += f"--- QUESTION {i+1} ---\n{item['text']}\n\n"
        
        batched_prompt_text += "Provide the analysis for each question under the heading '--- ANALYSIS FOR QUESTION X ---'."

        try:
            response = model.generate_content(batched_prompt_text)
            
            # --- Step 3: Parse the batched response ---
            # Use regex to split the response for each question
            analyses = re.split(r'--- ANALYSIS FOR QUESTION \d+ ---', response.text)
            
            # The first item is usually empty, so we skip it
            for i, analysis_text in enumerate(analyses[1:]):
                if i < len(text_based_mistakes):
                    mistake_item = text_based_mistakes[i]
                    mistake = mistake_item['mistake_obj']
                    mistake.analysis_text = analysis_text.strip()
                    mistake.topic = analysis_text.strip().split('\n')[0].replace('Core Concept:', '').strip()
                    analyzed_count += 1

        except Exception as e:
            current_app.logger.error(f"Bulk text analysis failed: {e}")

    # --- Step 4: Process image-based mistakes individually (the old way) ---
    image_prompt = """Analyze the attached screenshot of a multiple-choice question the user answered incorrectly. 
        Identify the core concept being tested, explain the user's likely mistake, detail the correct steps to solve it, and provide a key takeaway.
        Structure the output clearly and concisely with these exact headings: 
        'Core Concept:', 'Your Mistake:', 'Correct Steps:', and 'Key Takeaway:'."""
        
    for mistake in image_based_mistakes:
        try:
            increment_api_call_counter()
            image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], mistake.image_path)
            img = Image.open(image_path)
            response = model.generate_content([image_prompt, img])
            mistake.analysis_text = response.text
            mistake.topic = response.text.split('\n')[0].replace('Core Concept:', '').strip()
            analyzed_count += 1
        except Exception as e:
            current_app.logger.error(f"Could not analyze image mistake {mistake.id}: {e}")
            continue
    
    db.session.commit()
    return jsonify({"message": f"Successfully analyzed {analyzed_count} out of {len(unanalyzed_mistakes)} mistakes."})


# --- New route for updating notes ---
@api_blueprint.route('/mistakes/<int:mistake_id>/notes', methods=['PUT'])
def update_notes(mistake_id):
    data = request.get_json()
    mistake = Mistake.query.get_or_404(mistake_id)
    mistake.notes = data.get('notes', '')
    db.session.commit()
    return jsonify(mistake.to_dict())

@api_blueprint.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

@api_blueprint.route("/mistakes/<int:mistake_id>", methods=['DELETE'])
def delete_mistake(mistake_id):
    try:
        mistake = Mistake.query.get_or_404(mistake_id)
        full_image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], mistake.image_path)
        if os.path.exists(full_image_path):
            os.remove(full_image_path)

        db.session.delete(mistake)
        db.session.commit()
        return jsonify({"message": "Mistake deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete mistake", "message": str(e)}), 500

@api_blueprint.route("/mocks/import-from-testbook", methods=['POST'])
def import_from_testbook():
    try:
        data = request.get_json()
        cookies = data.get('cookies')
        url = data.get('url')

        if not cookies or not url:
            return jsonify({"error": "Missing cookies or URL"}), 400

        mock_id = scrape_testbook_data(cookies, url)

        if mock_id:
            return jsonify({"message": "Mock imported successfully", "mock_id": mock_id}), 200
        else:
            return jsonify({"error": "Failed to import mock"}), 500
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "An internal error occurred", "message": str(e)}), 500

@api_blueprint.route("/analytics/today-api-calls", methods=['GET'])
@cross_origin()
def get_today_api_calls():
    """
    Returns the number of API calls made today.
    """
    today = date.today()
    counter = ApiCallCounter.query.filter_by(date=today).first()
    
    if counter:
        return jsonify({"count": counter.count})
    else:
        # If no calls have been made today, return 0
        return jsonify({"count": 0})