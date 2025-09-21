from flask import Blueprint, jsonify
from app.extensions import db
from app.models.mistake import Mistake
from app.models.mock import Mock
from app.models.section import Section
from sqlalchemy import func

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

@analytics_blueprint.route("/analytics/performance-trajectory", methods=['GET'])
def performance_trajectory():
    try:
        mocks = Mock.query.order_by(Mock.date_taken.asc()).all()
        trajectory_data = [
            {
                "date": mock.date_taken.strftime('%Y-%m-%d'),
                "overall_score": mock.score_overall,
                "percentile": mock.percentile_overall
            } for mock in mocks
        ]
        return jsonify(trajectory_data)
    except Exception as e:
        return jsonify({"error": "Could not fetch performance trajectory", "message": str(e)}), 500

@analytics_blueprint.route("/analytics/sectional-deep-dive", methods=['GET'])
def sectional_deep_dive():
    try:
        sectional_data = db.session.query(
            Section.name,
            func.avg(Section.score).label('average_score'),
            func.avg(Section.correct_count).label('average_correct'),
            func.avg(Section.incorrect_count).label('average_incorrect'),
            func.avg(Section.unattempted_count).label('average_unattempted'),
            func.avg(Section.time_taken_seconds).label('average_time')
        ).group_by(Section.name).all()

        summary = [
            {
                "section": name,
                "average_score": round(avg_score, 2),
                "average_accuracy": round((avg_correct / (avg_correct + avg_incorrect)) * 100, 2) if (avg_correct + avg_incorrect) > 0 else 0,
                "average_time_spent": round(avg_time / 60, 2) # in minutes
            } for name, avg_score, avg_correct, avg_incorrect, avg_unattempted, avg_time in sectional_data
        ]
        return jsonify(summary)
    except Exception as e:
        return jsonify({"error": "Could not generate sectional deep dive", "message": str(e)}), 500