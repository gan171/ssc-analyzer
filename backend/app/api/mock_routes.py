# backend/app/api/mock_routes.py

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

# --- NEW: DYNAMIC PROMPT GENERATION HELPER ---
def get_dynamic_prompt(section_name, user_mistake_description):
    """
    Generates a dynamic "MentorAI" prompt based on the section and user's mistake description.
    """
    persona = "You are 'MentorAI', a specialized AI assistant for competitive exam aspirants. Your tone must be encouraging, insightful, and supportive. Your goal is not just to provide solutions but to empower the user to learn from their errors and improve their strategy."

    user_input_section = f"The user has identified their mistake as: '{user_mistake_description}'." if user_mistake_description and user_mistake_description.strip() else "The user did not specify their mistake."

    # Subject-specific instructions
    if 'quantitative' in section_name.lower() or 'math' in section_name.lower():
        subject_instructions = """
        Your response MUST be structured with these exact headings:
        1.  **Initial Analysis**: Start by acknowledging the question and the user's analysis. State the topic (e.g., Profit and Loss).
        2.  **💡 The Smart Method**: Provide a clear, step-by-step solution. Explain why it's the most efficient method for a competitive exam.
        3.  **⚡️ Shortcut Arsenal**: Suggest alternative time-saving methods like Option Elimination, Unit Digit/Digital Sum, or Approximation. Explain when to use them.
        4.  **🎯 Key Takeaway**: End with a concise, one-liner conclusion.
        """
    elif 'english' in section_name.lower():
        subject_instructions = """
        Your response MUST be structured with these exact headings:
        1.  **Initial Analysis**: Acknowledge the question and the user's mistake. Identify the question type (e.g., Sentence Improvement, Vocabulary).
        2.  **✅ The Correct Approach**: Provide the correct answer and a detailed explanation, incorporating the user's point of view if they provided one.
        3.  **📖 Concept Spotlight**: Explain the underlying grammar rule, provide vocabulary meanings with synonyms/antonyms, or explain the idiom with examples.
        4.  **🤔 Analyzing the Other Options**: Explain why the other options are incorrect to provide a holistic understanding.
        """
    elif 'reasoning' in section_name.lower():
        subject_instructions = """
        Your response MUST be structured with these exact headings:
        1.  **Initial Analysis**: Acknowledge the problem and user's mistake. Categorize the reasoning type (e.g., Blood Relation, Syllogism).
        2.  **➡️ The Logical Flow**: Provide a step-by-step breakdown of the thought process required to reach the solution. Use diagrams in text if helpful.
        3.  **⏱️ Boost Your Speed**: Offer strategic advice (e.g., "For these questions, drawing a quick diagram is fastest...").
        4.  **🎯 Key Takeaway**: Conclude with a memorable one-liner strategy tip.
        """
    elif 'general' in section_name.lower():
        subject_instructions = """
        Your response MUST be structured with these exact headings:
        1.  **📌 The Right Answer & Why**: Provide the correct answer and a comprehensive but brief explanation.
        2.  **🔗 Connect the Dots**: This is crucial. Provide additional, related information and mention other probable questions from this topic.
        3.  **🔍 Learning from the Options**: Explain what the other (incorrect) options refer to, turning one question into four learning opportunities.
        """
    else:
        # A default fallback prompt that is still high quality
        subject_instructions = "Your response MUST be structured with these exact headings: 'Core Concept:', 'Your Mistake:', 'Correct Steps:', and 'Key Takeaway:'."

    return f"{persona}\n\nAnalyze the attached screenshot of a question the user answered incorrectly. {user_input_section}\n\nFollow these instructions precisely:\n{subject_instructions}"


@api_blueprint.route("/health")
def health_check():
    return jsonify({"status": "ok", "message": "Backend is running!"})

# --- MOCK ROUTES ---
@api_blueprint.route("/mocks", methods=['GET', 'POST'])
def handle_mocks():
    if request.method == 'GET':
        all_mocks = Mock.query.order_by(Mock.date_taken.desc()).all()
        result = [mock.to_dict() for mock in all_mocks]
        return jsonify(result), 200

    if request.method == 'POST':
        data = request.get_json()
        
        # 👇 NEW: Determine tier based on total_marks
        tier = None
        total_marks = data.get('total_marks', 0) # Get total_marks from request
        if total_marks == 200:
            tier = "Tier 1"
        elif total_marks == 390:
            tier = "Tier 2"

        new_mock = Mock(
            name=data['name'],
            total_marks=total_marks, # <-- SAVE THE NEW FIELD
            score_overall=data['score_overall'],
            percentile_overall=data['percentile_overall'],
            date_taken=data['date_taken'],
            tier=tier # <-- Save the correctly determined tier
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

@api_blueprint.route("/mocks/<int:mock_id>", methods=['GET', 'PUT'])
def get_mock_details(mock_id):
    mock = Mock.query.get_or_404(mock_id)
    if request.method == 'GET':
        return jsonify(mock.to_dict())
    
    if request.method == 'PUT':
        data = request.get_json()
        mock.name = data.get('name', mock.name)
        db.session.commit()
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
        # NEW: Get the user's mistake description from the form
        mistake_description = request.form.get('mistake_description', '')

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
                    question_type=question_type,
                    # NEW: Save the user's description to the 'notes' field in the database
                    notes=mistake_description 
                )
                db.session.add(new_mistake)
        
        db.session.commit()
        return jsonify({"message": "Mistakes added successfully!"}), 201

@api_blueprint.route("/mistakes/<int:mistake_id>/analyze-text", methods=['POST'])
def analyze_mistake(mistake_id): # Renamed for clarity, though not strictly required
    mistake = Mistake.query.get_or_404(mistake_id)
    image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], mistake.image_path)

    try:
        increment_api_call_counter()
        genai.configure(api_key=current_app.config['GEMINI_API_KEY'])
        model = genai.GenerativeModel('gemini-2.5-flash')

        # CHANGED: Use the dynamic prompt function with data from the DB
        prompt = get_dynamic_prompt(mistake.section_name, mistake.notes)
        
        img = Image.open(image_path)
        
        response = model.generate_content([prompt, img])
        
        mistake.analysis_text = response.text
        # CHANGED: More robust topic extraction
        try:
            # Split by lines, find the first one with content after a colon, and take that.
            lines = response.text.split('\n')
            topic_line = next((line for line in lines if ':' in line), None)
            if topic_line:
                mistake.topic = topic_line.split(':', 1)[1].strip()
            else:
                mistake.topic = "General"
        except Exception:
            mistake.topic = "General" # Fallback
        
        db.session.commit()
        return jsonify(mistake.to_dict())

    except Exception as e:
        current_app.logger.error(f"Error during analysis for mistake {mistake_id}: {e}")
        traceback.print_exc()
        return jsonify({"message": f"An error occurred during analysis: {str(e)}"}), 500

# CHANGED: Rewritten for simplicity and to support dynamic prompts
@api_blueprint.route("/mocks/<int:mock_id>/analyze-all-mistakes", methods=['POST'])
def bulk_analyze_mistakes(mock_id):
    mock = Mock.query.get_or_404(mock_id)
    unanalyzed_mistakes = [m for m in mock.mistakes if not m.analysis_text]

    if not unanalyzed_mistakes:
        mock.is_analyzed = True # Mark the mock as fully analyzed
        db.session.commit()
        return jsonify({"message": "All mistakes were already analyzed."}), 200

    genai.configure(api_key=current_app.config['GEMINI_API_KEY'])
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    analyzed_count = 0
    errors = []

    for mistake in unanalyzed_mistakes:
        try:
            increment_api_call_counter()
            image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], mistake.image_path)
            
            # Use the dynamic prompt for each mistake
            prompt = get_dynamic_prompt(mistake.section_name, mistake.notes)
            
            img = Image.open(image_path)
            response = model.generate_content([prompt, img])
            
            mistake.analysis_text = response.text
            # Use the same robust topic extraction
            try:
                lines = response.text.split('\n')
                topic_line = next((line for line in lines if ':' in line), None)
                if topic_line:
                    mistake.topic = topic_line.split(':', 1)[1].strip()
                else:
                    mistake.topic = "General"
            except Exception:
                mistake.topic = "General"

            analyzed_count += 1
        except Exception as e:
            error_message = f"Could not analyze mistake {mistake.id}: {e}"
            current_app.logger.error(error_message)
            errors.append(error_message)
            continue # Continue to the next mistake
    
    mock.is_analyzed = True # Mark as analyzed even if some fail
    db.session.commit()

    if errors:
         return jsonify({"message": f"Successfully analyzed {analyzed_count} out of {len(unanalyzed_mistakes)} mistakes. Some errors occurred."}), 207 # Multi-Status
    
    return jsonify({"message": f"Successfully analyzed all {analyzed_count} remaining mistakes."})

# --- Other routes remain the same ---
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
    today = date.today()
    counter = ApiCallCounter.query.filter_by(date=today).first()
    return jsonify({"count": counter.count if counter else 0})

@api_blueprint.route("/mocks/backfill-tiers", methods=['POST'])
def backfill_mock_tiers():
    """
    Updates the tier for mocks that have total_marks populated
    but do not have a tier assigned yet.
    """
    # Find mocks where the tier has not been set
    mocks_to_update = Mock.query.filter(Mock.tier.is_(None)).all()
    
    updated_count = 0
    for mock in mocks_to_update:
        # 👇 This logic now correctly uses the total_marks field
        if mock.total_marks == 200:
            mock.tier = "Tier 1"
            updated_count += 1
        elif mock.total_marks == 390:
            mock.tier = "Tier 2"
            updated_count += 1
    
    if updated_count > 0:
        db.session.commit()
        
    return jsonify({
        "message": f"Successfully updated tiers for {updated_count} mocks."
    }), 200

@api_blueprint.route("/mocks/<int:mock_id>", methods=['GET', 'PUT', 'DELETE'])
def handle_mock(mock_id):
    mock = Mock.query.get_or_404(mock_id)
    if request.method == 'GET':
        return jsonify(mock.to_dict())
    
    if request.method == 'PUT':
        data = request.get_json()
        mock.name = data.get('name', mock.name)
        db.session.commit()
        return jsonify(mock.to_dict())

    if request.method == 'DELETE':
        try:
            # Delete associated mistake images first
            for mistake in mock.mistakes:
                full_image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], mistake.image_path)
                if os.path.exists(full_image_path):
                    os.remove(full_image_path)
            
            db.session.delete(mock)
            db.session.commit()
            return jsonify({"message": "Mock and all associated data deleted successfully"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": "Failed to delete mock", "message": str(e)}), 500