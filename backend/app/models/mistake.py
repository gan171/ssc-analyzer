from app.extensions import db

class Mistake(db.Model):
    __tablename__ = 'mistakes'
    id = db.Column(db.Integer, primary_key=True)
    image_path = db.Column(db.String(255), nullable=False)
    analysis_text = db.Column(db.Text, nullable=True)
    topic = db.Column(db.String(255), nullable=True)
    section_name = db.Column(db.String(100), nullable=False)
    question_type = db.Column(db.String(50), nullable=False) # incorrect or unattempted
    mock_id = db.Column(db.Integer, db.ForeignKey('mocks.id'), nullable=False)
    notes = db.Column(db.Text, nullable=True)

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
            'notes': self.notes
        }