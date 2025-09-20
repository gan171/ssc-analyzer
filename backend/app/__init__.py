from flask import Flask
from flask_cors import CORS
from config import Config
from .extensions import db, migrate # <-- Import from extensions.py
import os # <-- Add this import

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    CORS(app, resources={
        r"/api/*": {"origins": "*"},
        r"/uploads/*": {"origins": "*"}  # Add this for your upload route
    })

    # Initialize extensions with the app
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Add this line to ensure the upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Import and register blueprints
    from .api.mock_routes import api_blueprint
    app.register_blueprint(api_blueprint, url_prefix='/api')

    # Import models so Alembic can see them
    from .models import mock, mistake 

    return app