import os
from flask import Flask
from .extensions import db
from .api.mock_routes import api_blueprint
from .api.analytics_routes import analytics_blueprint
from flask_migrate import Migrate
from flask_cors import CORS # NEW: Import the CORS library

def create_app(config_class='config.Config'):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate = Migrate(app, db)

    # NEW: Enable CORS for the entire app, allowing your frontend to connect
    # This is the key change to fix the network errors.
    CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}}, supports_credentials=True)

    # Create upload folder if it doesn't exist
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    # Register blueprints
    app.register_blueprint(api_blueprint, url_prefix='/')
    app.register_blueprint(analytics_blueprint, url_prefix='/')

    return app
