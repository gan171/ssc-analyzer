from flask import Flask
from flask_cors import CORS
from config import Config
from .extensions import db, migrate 
import os 
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

def create_app(config_class=Config):
    # This line is the main change:
    app = Flask(__name__, static_folder='../uploads', static_url_path='/uploads')
    
    app.config.from_object(config_class)
    CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

    # This line is also important for allowing cross-origin requests to your uploads folder
    CORS(app, resources={
        r"/api/*": {"origins": "*"},
        r"/uploads/*": {"origins": "*"}
    })

    # Initialize extensions with the app
    db.init_app(app)
    migrate.init_app(app, db)
    
    # This line ensures the upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Import and register blueprints
    from .api.mock_routes import api_blueprint
    from .api.analytics_routes import analytics_blueprint
    app.register_blueprint(api_blueprint, url_prefix='/api')
    app.register_blueprint(analytics_blueprint, url_prefix='/api')

    # Import models so Alembic can see them
    from .models import mock, mistake 

    return app