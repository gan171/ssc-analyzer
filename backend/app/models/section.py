from app.extensions import db

class Section(db.Model):
    __tablename__ = 'sections'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    score = db.Column(db.Float, nullable=False)
    correct_count = db.Column(db.Integer, nullable=False)
    incorrect_count = db.Column(db.Integer, nullable=False)
    unattempted_count = db.Column(db.Integer, nullable=False)
    time_taken_seconds = db.Column(db.Integer, nullable=False)

    # Foreign Key to link to the mocks table
    mock_id = db.Column(db.Integer, db.ForeignKey('mocks.id'), nullable=False)

    def to_dict(self):
        """Serializes the object to a dictionary."""
        return {
            'id': self.id,
            'mock_id': self.mock_id,
            'name': self.name,
            'score': self.score,
            'correct_count': self.correct_count,
            'incorrect_count': self.incorrect_count,
            'unattempted_count': self.unattempted_count,
            'time_taken_seconds': self.time_taken_seconds
        }

    def __repr__(self):
        return f'<Section {self.name} for Mock {self.mock_id}>'