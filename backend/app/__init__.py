from flask import Flask
from flask_cors import CORS  # Import CORS
from .extensions import db, migrate
from .api.mock_routes import api_blueprint
from .api.analytics_routes import analytics_blueprint
import os

def create_app():
    app = Flask(__name__)
    
    # --- ADD THIS SECTION ---
    # Initialize CORS and allow requests from your frontend's origin
    CORS(app) 
    # ------------------------

    # Database configuration
    db_path = os.path.join(os.path.dirname(app.root_path), 'instance', 'app.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Register blueprints
    app.register_blueprint(api_blueprint, url_prefix='/api')
    app.register_blueprint(analytics_blueprint, url_prefix='/api')

    return app