from flask import Blueprint, jsonify
from app.extensions import db
from ..models.mock import Mock
from ..models.mistake import Mistake
from ..models.section import Section
from sqlalchemy import func
import math

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
                "average_score": round(avg_score, 2) if avg_score else 0,
                "average_accuracy": round((avg_correct / (avg_correct + avg_incorrect)) * 100, 2) if (avg_correct and (avg_correct + avg_incorrect) > 0) else 0,
                "average_time_spent": round(avg_time / 60, 2) if avg_time else 0
            } for name, avg_score, avg_correct, avg_incorrect, avg_unattempted, avg_time in sectional_data
        ]
        return jsonify(summary)
    except Exception as e:
        return jsonify({"error": "Could not generate sectional deep dive", "message": str(e)}), 500


# --- NEW PERFORMANCE REPORT ROUTE ---
@analytics_blueprint.route("/analytics/performance-report", methods=['GET'])
def performance_report():
    try:
        all_mocks = Mock.query.order_by(Mock.date_taken.desc()).all()
        
        # --- FULL MOCK LOG (We'll calculate this first as we need the data) ---
        full_mock_log = []
        for mock in all_mocks:
            sections_data = {}
            total_data = {"attempts": {"right": 0, "wrong": 0, "left": 0}, "marks": {"positive": 0, "negative": 0}}
            for s in mock.sections:
                key = None
                if 'math' in s.name.lower() or 'quantitative' in s.name.lower(): key = "maths"
                elif 'reasoning' in s.name.lower(): key = "reasoning"
                elif 'english' in s.name.lower(): key = "english"
                elif 'general' in s.name.lower(): key = "gk"
                if key:
                    positive_marks, negative_marks = s.correct_count * 2, s.incorrect_count * 0.5
                    sections_data[key] = {
                        "attempts": {"right": s.correct_count, "wrong": s.incorrect_count, "left": s.unattempted_count},
                        "marks": {"positive": positive_marks, "negative": negative_marks, "net": s.score}
                    }
                    total_data["attempts"]["right"] += s.correct_count
                    total_data["attempts"]["wrong"] += s.incorrect_count
                    total_data["attempts"]["left"] += s.unattempted_count
                    total_data["marks"]["positive"] += positive_marks
                    total_data["marks"]["negative"] += negative_marks
            full_mock_log.append({
                "id": mock.id, "date": mock.date_taken.strftime('%d-%b-%Y'), "name": mock.name,
                "total_score": mock.score_overall, "percentile": mock.percentile_overall,
                "sections": sections_data, "totals": total_data, "is_analyzed": mock.is_analyzed
            })
        
        if not all_mocks:
            return jsonify({"full_mock_log": [], "report_card": {}})

        # --- REPORT CARD CALCULATIONS ---
        total_mocks = len(all_mocks)
        # Score Brackets
        score_brackets = {">"+str(s): 0 for s in range(120, 181, 10)}
        for m in all_mocks:
            for score_limit in range(120, 181, 10):
                if m.score_overall > score_limit:
                    score_brackets[">"+str(score_limit)] += 1
        
        # Percentile Brackets
        percentile_brackets = {">"+str(p): 0 for p in [40, 50, 60, 70, 80, 90, 95]}
        for m in all_mocks:
            for p_limit in [40, 50, 60, 70, 80, 90, 95]:
                if m.percentile_overall > p_limit:
                    percentile_brackets[">"+str(p_limit)] += 1
        
        # Last N Mocks
        def get_last_n_mocks(n):
            return [{
                "name": m["name"], "total": m["total_score"],
                "maths": m["sections"].get("maths", {}).get("marks", {}).get("net", 0),
                "reasoning": m["sections"].get("reasoning", {}).get("marks", {}).get("net", 0),
                "english": m["sections"].get("english", {}).get("marks", {}).get("net", 0),
                "gk": m["sections"].get("gk", {}).get("marks", {}).get("net", 0),
                "positive": m["totals"]["marks"]["positive"],
                "negative": m["totals"]["marks"]["negative"],
            } for m in full_mock_log[:n]]

        # Sectional Averages
        sectional_averages = {"maths": 0, "reasoning": 0, "english": 0, "gk": 0}
        for sec in sectional_averages.keys():
            scores = [m["sections"].get(sec, {}).get("marks", {}).get("net", 0) for m in full_mock_log]
            sectional_averages[sec] = round(sum(scores) / len(scores), 2) if scores else 0

        report_card_data = {
            "score_brackets": score_brackets,
            "percentile_brackets": percentile_brackets,
            "last_3_mocks": get_last_n_mocks(3),
            "last_5_mocks": get_last_n_mocks(5),
            "last_10_mocks": get_last_n_mocks(10),
            "sectional_averages": sectional_averages,
            "overall_avg_score": round(sum(m.score_overall for m in all_mocks) / total_mocks, 2),
            "total_mocks": total_mocks
        }

        return jsonify({"full_mock_log": full_mock_log, "report_card": report_card_data})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Could not generate performance report", "message": str(e)}), 500



