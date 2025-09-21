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

    def __repr__(self):
        return f'<Mistake {self.id} for Mock {self.mock_id}>'