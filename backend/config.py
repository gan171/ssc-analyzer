import os
from dotenv import load_dotenv

load_dotenv()

# Define the absolute path for the base directory
basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'a_default_secret_key')
    # This is the correct way to load the key
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY') 
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'postgresql://user:password@ssc_analyzer')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(basedir, 'uploads')