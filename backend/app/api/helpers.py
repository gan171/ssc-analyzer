from datetime import date
from app.models.api_call_counter import ApiCallCounter
from app.extensions import db
from flask import current_app
import google.generativeai as genai
from PIL import Image
import os

def increment_api_call_counter():
    """
    Finds today's API call counter and increments it.
    If it doesn't exist, it creates one.
    """
    today = date.today()
    counter = ApiCallCounter.query.filter_by(date=today).first()

    if counter:
        counter.count += 1
    else:
        counter = ApiCallCounter(date=today, count=1)
        db.session.add(counter)
    
    db.session.commit()

def get_dynamic_prompt(section_name, notes):
    """
    Generates a dynamic prompt for the Gemini API based on the section and notes.
    """
    # This is a placeholder. You can customize this prompt as needed.
    return f"Analyze the following question from the {section_name} section. Additional notes: {notes}"

def call_gemini_vision_api(mistake):
    """
    Calls the Gemini Vision API to get analysis for a mistake.
    """
    image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], mistake.image_path)
    
    increment_api_call_counter()
    genai.configure(api_key=current_app.config['GEMINI_API_KEY'])
    model = genai.GenerativeModel('gemini-2.5-flash') # Or your preferred model

    prompt = get_dynamic_prompt(mistake.section_name, mistake.notes)
    img = Image.open(image_path)
    
    response = model.generate_content([prompt, img])
    
    # Extract topic from response
    try:
        lines = response.text.split('\n')
        topic_line = next((line for line in lines if ':' in line), None)
        if topic_line:
            mistake.topic = topic_line.split(':', 1)[1].strip()
        else:
            mistake.topic = "General"
    except Exception:
        mistake.topic = "General"

    return response.text