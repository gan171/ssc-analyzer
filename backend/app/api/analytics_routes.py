from flask import Blueprint, jsonify
from app.extensions import db
from app.models.mistake import Mistake

analytics_blueprint = Blueprint('analytics', __name__)

@analytics_blueprint.route("/analytics/topic-summary", methods=['GET'])
def topic_summary():
    try:
        summary_query = db.session.query(
            Mistake.topic, 
            db.func.count(Mistake.topic).label('mistake_count')
        ).filter(Mistake.topic.isnot(None)).group_by(Mistake.topic).order_by(
            db.func.count(Mistake.topic).desc()
        ).all()

        summary = [{"topic": topic, "count": count} for topic, count in summary_query]
        return jsonify(summary)
    except Exception as e:
        return jsonify({"error": "Could not generate summary", "message": str(e)}), 500