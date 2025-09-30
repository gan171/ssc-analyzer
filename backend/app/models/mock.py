# backend/app/models/mock.py

from app.extensions import db
from app.models.mistake import Mistake
from datetime import datetime

class Mock(db.Model):
    __tablename__ = 'mocks'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    total_marks = db.Column(db.Integer, nullable=False, server_default='200')
    score_overall = db.Column(db.Float, nullable=False)
    percentile_overall = db.Column(db.Float)
    date_taken = db.Column(db.DateTime, server_default=db.func.now())
    mistakes = db.relationship('Mistake', backref='mock', lazy=True, cascade="all, delete-orphan")
    sections = db.relationship('Section', backref='mock', lazy=True, cascade="all, delete-orphan")
    is_analyzed = db.Column(db.Boolean, default=False, nullable=False)
    tier = db.Column(db.String(50), nullable=True) 

    def to_dict(self):
        """Serializes the object to a dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'score_overall': self.score_overall,
            'percentile_overall': self.percentile_overall,
            'date_taken': self.date_taken.isoformat(),
            'sections': [section.to_dict() for section in self.sections],
            'mistakes': [mistake.to_dict() for mistake in self.mistakes],
            'is_analyzed': self.is_analyzed,
            'tier': self.tier
        }
    
    def __repr__(self):
        return f'<Mock {self.name}>'