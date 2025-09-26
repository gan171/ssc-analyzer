from flask import Blueprint, jsonify
from app.extensions import db
from ..models.mock import Mock
from ..models.mistake import Mistake
from ..models.section import Section
from ..models.api_call_counter import ApiCallCounter
from sqlalchemy import func, desc # Import desc
from collections import defaultdict
import math
from datetime import date

analytics_blueprint = Blueprint('analytics', __name__)


@analytics_blueprint.route("/analytics/today-api-calls", methods=['GET'])
def today_api_calls():
    """
    Returns the number of API calls made today.
    """
    try:
        today = date.today()
        counter = ApiCallCounter.query.filter_by(date=today).first()
        count = counter.count if counter else 0
        return jsonify({"count": count})
    except Exception as e:
        return jsonify({"error": "Could not fetch API call count", "message": str(e)}), 500

@analytics_blueprint.route("/analytics/weakness-breakdown", methods=['GET'])
def weakness_breakdown():
    """
    Generates a hierarchical breakdown of mistakes by subject, topic, and sub-topic.
    """
    try:
        mistake_count_label = func.count(Mistake.id).label('mistake_count')

        mistakes_query = db.session.query(
            Mistake.subject,
            Mistake.topic,
            Mistake.sub_topic,
            mistake_count_label
        ).filter(
            Mistake.subject.isnot(None),
            Mistake.topic.isnot(None)
        ).group_by(
            Mistake.subject,
            Mistake.topic,
            Mistake.sub_topic
        ).order_by(
            Mistake.subject,
            Mistake.topic,
            desc(mistake_count_label) # --- CORRECTED THIS LINE ---
        ).all()

        weakness_tree = defaultdict(lambda: defaultdict(list))
        for subject, topic, sub_topic, count in mistakes_query:
            sub_topic_name = sub_topic if sub_topic else "General"
            weakness_tree[subject][topic].append({"name": sub_topic_name, "value": count})

        formatted_summary = []
        for subject, topics in weakness_tree.items():
            subject_children = []
            for topic, sub_topics in topics.items():
                subject_children.append({"name": topic, "children": sub_topics})
            formatted_summary.append({"name": subject, "children": subject_children})

        return jsonify(formatted_summary)
    except Exception as e:
        return jsonify({"error": "Could not generate weakness breakdown", "message": str(e)}), 500


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


@analytics_blueprint.route("/analytics/performance-report", methods=['GET'])
def performance_report():
    try:
        all_mocks = Mock.query.order_by(Mock.date_taken.desc()).all()
        
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

        total_mocks = len(all_mocks)
        score_brackets = {">"+str(s): 0 for s in range(120, 181, 10)}
        for m in all_mocks:
            for score_limit in range(120, 181, 10):
                if m.score_overall > score_limit:
                    score_brackets[">"+str(score_limit)] += 1
        
        percentile_brackets = {">"+str(p): 0 for p in [40, 50, 60, 70, 80, 90, 95]}
        for m in all_mocks:
            if m.percentile_overall:
                for p_limit in [40, 50, 60, 70, 80, 90, 95]:
                    if m.percentile_overall > p_limit:
                        percentile_brackets[">"+str(p_limit)] += 1
        
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

        sectional_averages = {"maths": 0, "reasoning": 0, "english": 0, "gk": 0}
        for sec in sectional_averages.keys():
            scores = [m["sections"].get(sec, {}).get("marks", {}).get("net", 0) for m in full_mock_log]
            sectional_averages[sec] = round(sum(scores) / len(scores), 2) if scores else 0

        overall_avg = round(sum(m.score_overall for m in all_mocks) / total_mocks, 2) if total_mocks > 0 else 0

        report_card_data = {
            "score_brackets": score_brackets,
            "percentile_brackets": percentile_brackets,
            "last_3_mocks": get_last_n_mocks(3),
            "last_5_mocks": get_last_n_mocks(5),
            "last_10_mocks": get_last_n_mocks(10),
            "sectional_averages": sectional_averages,
            "overall_avg_score": overall_avg,
            "total_mocks": total_mocks
        }

        return jsonify({"full_mock_log": full_mock_log, "report_card": report_card_data})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Could not generate performance report", "message": str(e)}), 500