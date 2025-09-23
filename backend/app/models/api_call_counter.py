from app.extensions import db
from sqlalchemy import Date
from datetime import date

class ApiCallCounter(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # The date for which the count is recorded
    date = db.Column(Date, unique=True, nullable=False, default=date.today)
    # The number of API calls made on that date
    count = db.Column(db.Integer, nullable=False, default=0)

    def __repr__(self):
        return f'<ApiCallCounter {self.date}: {self.count}>'