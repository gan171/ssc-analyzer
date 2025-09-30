from app.extensions import db
from sqlalchemy.dialects.postgresql import JSON

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
    question_text = db.Column(db.Text, nullable=True)
    options = db.Column(JSON, nullable=True)
    correct_option = db.Column(db.String(1), nullable=True)
    difficulty = db.Column(db.String(50), nullable=True, default='unseen')
    tier = db.Column(db.String(50)) 

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
            'correct_option': self.correct_option,
            'difficulty': self.difficulty,
            'tier': self.tier
        }