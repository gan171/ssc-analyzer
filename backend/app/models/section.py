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

    def __repr__(self):
        return f'<Section {self.name} for Mock {self.mock_id}>'