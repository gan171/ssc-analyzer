from app.extensions import db
from sqlalchemy.dialects.postgresql import JSON
import datetime

class Mistake(db.Model):
    __tablename__ = 'mistakes'
    id = db.Column(db.Integer, primary_key=True)
    image_path = db.Column(db.String(255), nullable=False)
    analysis_text = db.Column(db.Text, nullable=True)
    topic = db.Column(db.Text, nullable=True)
    section_name = db.Column(db.String(100), nullable=False)
    question_type = db.Column(db.String(50), nullable=False) # incorrect or unattempted
    mock_id = db.Column(db.Integer, db.ForeignKey('mocks.id'), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    
    # Fields for detailed question data
    question_text = db.Column(db.Text, nullable=True)
    options = db.Column(JSON, nullable=True)
    
    # --- MODIFIED/NEW FIELDS ---
    # To store the full text of the user's selected answer, e.g., "A. Option Text"
    user_answer = db.Column(db.Text, nullable=True) 
    # Renamed and changed to Text to store the full correct answer text
    correct_answer = db.Column(db.Text, nullable=True) 
    # --- END OF CHANGES ---

    difficulty = db.Column(db.String(50), nullable=True, default='unseen')
    tier = db.Column(db.String(50))
    is_recalled = db.Column(db.Boolean, default=False)
    is_practiced = db.Column(db.Boolean, default=False)
    last_practiced_date = db.Column(db.DateTime, nullable=True)


    def __repr__(self):
        return f'<Mistake {self.id} for Mock {self.mock_id}>'

    def to_dict(self):
        """Serializes the object to a dictionary."""
        return {
            'id': self.id,
            'mock_id': self.mock_id,
            'image_path': self.image_path,
            'analysis_text': self.analysis_text,
            'topic': self.topic,
            'section_name': self.section_name,
            'question_type': self.question_type,
            'notes': self.notes,
            'question_text': self.question_text,
            'options': self.options,
            'user_answer': self.user_answer,
            'correct_answer': self.correct_answer,
            'difficulty': self.difficulty,
            'tier': self.tier,
            'is_recalled': self.is_recalled,
            'is_practiced': self.is_practiced,
            'last_practiced_date': self.last_practiced_date.isoformat() if self.last_practiced_date else None
        }