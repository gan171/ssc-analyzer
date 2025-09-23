from datetime import date
from app.models.api_call_counter import ApiCallCounter
from app.extensions import db

def increment_api_call_counter():
    """
    Finds today's API call counter and increments it.
    If it doesn't exist, it creates one.
    """
    today = date.today()
    counter = ApiCallCounter.query.filter_by(date=today).first()

    if counter:
        counter.count += 1
    else:
        # Create a new counter for today, starting at 1
        counter = ApiCallCounter(date=today, count=1)
        db.session.add(counter)
    
    db.session.commit()