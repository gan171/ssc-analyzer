from app.extensions import db

class Mock(db.Model):
    __tablename__ = 'mocks'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    score_overall = db.Column(db.Float, nullable=False)
    percentile_overall = db.Column(db.Float)
    date_taken = db.Column(db.DateTime, server_default=db.func.now())

    def __repr__(self):
        return f'<Mock {self.name}>'