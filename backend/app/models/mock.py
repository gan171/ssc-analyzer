from app.extensions import db
from app.models.mistake import Mistake

class Mock(db.Model):
    __tablename__ = 'mocks'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    score_overall = db.Column(db.Float, nullable=False)
    percentile_overall = db.Column(db.Float)
    date_taken = db.Column(db.DateTime, server_default=db.func.now())
    mistakes = db.relationship('Mistake', backref='mock', lazy=True, cascade="all, delete-orphan")
    sections = db.relationship('Section', backref='mock', lazy=True, cascade="all, delete-orphan")
    is_analyzed = db.Column(db.Boolean, default=False, nullable=False)

    def __repr__(self):
        return f'<Mock {self.name}>'