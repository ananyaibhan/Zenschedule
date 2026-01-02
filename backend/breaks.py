from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta

breaks_bp = Blueprint("breaks", __name__, url_prefix="/breaks")

ACTIVE_BREAK = None
BREAK_HISTORY = []

BREAK_CONTENT = {
    "breathing": {
        "title": "Box Breathing",
        "steps": [
            {"text": "Sit comfortably and relax shoulders", "seconds": 10},
            {"text": "Inhale slowly", "seconds": 4},
            {"text": "Hold breath", "seconds": 4},
            {"text": "Exhale slowly", "seconds": 4},
            {"text": "Hold breath", "seconds": 4}
        ],
        "animation": "breathing_circle",
        "background_music": "calm.mp3"
    },
    "stretch": {
        "title": "Desk Stretch",
        "steps": [
            {"text": "Neck stretch", "seconds": 15},
            {"text": "Shoulder rolls", "seconds": 20},
            {"text": "Back stretch", "seconds": 20}
        ],
        "animation": "stretch_pose",
        "background_music": "light_ambient.mp3"
    },
    "walk": {
        "title": "Mindful Walk",
        "steps": [
            {"text": "Stand up and start walking", "seconds": 60},
            {"text": "Breathe naturally and observe surroundings", "seconds": 240}
        ],
        "animation": "walking_loop",
        "background_music": None
    },
    "meditation": {
        "title": "Quick Meditation",
        "steps": [
            {"text": "Find a comfortable position", "seconds": 10},
            {"text": "Close your eyes", "seconds": 5},
            {"text": "Focus on your breath", "seconds": 180},
            {"text": "Slowly open your eyes", "seconds": 5}
        ],
        "animation": "meditation_lotus",
        "background_music": "meditation.mp3"
    }
}

@breaks_bp.route("/current", methods=["GET"])
def get_current_break():
    """Get currently active break"""
    global ACTIVE_BREAK
    
    if not ACTIVE_BREAK:
        return jsonify({"active": False})

    now = datetime.now()
    if now > ACTIVE_BREAK["end_time"]:
        return jsonify({"active": False})

    return jsonify({
        "active": True,
        "break_id": ACTIVE_BREAK["id"],
        "type": ACTIVE_BREAK["type"],
        "title": ACTIVE_BREAK["title"],
        "duration_minutes": ACTIVE_BREAK["duration"],
        "start_time": ACTIVE_BREAK["start_time"].strftime("%H:%M"),
        "end_time": ACTIVE_BREAK["end_time"].strftime("%H:%M"),
        "ai_reason": ACTIVE_BREAK["ai_reason"],
        "elapsed_seconds": int((now - ACTIVE_BREAK["start_time"]).total_seconds())
    })

@breaks_bp.route("/content", methods=["GET"])
def get_break_content():
    """Get guided content for a specific break type"""
    break_type = request.args.get("type")

    if not break_type or break_type not in BREAK_CONTENT:
        return jsonify({"error": "Invalid break type"}), 400

    content = BREAK_CONTENT[break_type]

    return jsonify({
        "type": break_type,
        "title": content["title"],
        "steps": content["steps"],
        "animation": content["animation"],
        "background_music": content["background_music"],
        "total_duration": sum(step["seconds"] for step in content["steps"])
    })

@breaks_bp.route("/start", methods=["POST"])
def start_break():
    """Start a break session"""
    global ACTIVE_BREAK

    data = request.json
    break_id = data.get("break_id")
    break_type = data.get("type", "breathing")
    duration = data.get("duration", 5)
    ai_reason = data.get("ai_reason", "Scheduled wellness break")

    start_time = datetime.now()
    end_time = start_time + timedelta(minutes=duration)

    title = BREAK_CONTENT.get(break_type, {}).get("title", "Wellness Break")

    ACTIVE_BREAK = {
        "id": break_id or f"br_{int(start_time.timestamp())}",
        "type": break_type,
        "title": title,
        "duration": duration,
        "start_time": start_time,
        "end_time": end_time,
        "ai_reason": ai_reason,
        "status": "active"
    }

    print(f"Break started: {break_type} for {duration} minutes")

    return jsonify({
        "success": True,
        "status": "started",
        "break_id": ACTIVE_BREAK["id"],
        "start_time": start_time.strftime("%H:%M"),
        "end_time": end_time.strftime("%H:%M")
    })

@breaks_bp.route("/complete", methods=["POST"])
def complete_break():
    """Complete a break session"""
    global ACTIVE_BREAK

    if not ACTIVE_BREAK:
        return jsonify({"error": "No active break"}), 400

    data = request.json
    break_id = data.get("break_id")
    completed = data.get("completed", True)
    feedback = data.get("feedback", "")

    if break_id and ACTIVE_BREAK["id"] != break_id:
        return jsonify({"error": "Break ID mismatch"}), 400

    record = {
        "break_id": ACTIVE_BREAK["id"],
        "type": ACTIVE_BREAK["type"],
        "duration": ACTIVE_BREAK["duration"],
        "completed": completed,
        "feedback": feedback,
        "timestamp": datetime.now().isoformat()
    }

    BREAK_HISTORY.append(record)
    
    print(f"Break completed: {ACTIVE_BREAK['type']}")
    
    ACTIVE_BREAK = None

    return jsonify({
        "success": True,
        "status": "completed",
        "reward": "calm_point",
        "next_recommendation": "Great job! Your next break is in 90 minutes"
    })



@breaks_bp.route("/skip", methods=["POST"])
def skip_break():
    """Skip a break"""
    global ACTIVE_BREAK
    
    data = request.json
    break_id = data.get("break_id")
    reason = data.get("reason", "user_skip")

    if ACTIVE_BREAK and ACTIVE_BREAK["id"] == break_id:
        ACTIVE_BREAK = None

    print(f"Break skipped: {break_id} (Reason: {reason})")

    return jsonify({
        "success": True,
        "status": "skipped"
    })

@breaks_bp.route("/history", methods=["GET"])
def get_break_history():
    """Get break completion history"""
    days = request.args.get("days", 7, type=int)
    
    cutoff = datetime.now() - timedelta(days=days)
    
    recent_history = [
        record for record in BREAK_HISTORY
        if datetime.fromisoformat(record["timestamp"]) > cutoff
    ]

    # Calculate stats
    total_breaks = len(recent_history)
    completed_breaks = sum(1 for r in recent_history if r["completed"])
    completion_rate = (completed_breaks / total_breaks * 100) if total_breaks > 0 else 0

    return jsonify({
        "success": True,
        "history": recent_history,
        "stats": {
            "total_breaks": total_breaks,
            "completed_breaks": completed_breaks,
            "completion_rate": round(completion_rate, 1),
            "days": days
        }
    })

@breaks_bp.route("/types", methods=["GET"])
def get_break_types():
    """Get all available break types"""
    types = []
    for break_type, content in BREAK_CONTENT.items():
        total_duration = sum(step["seconds"] for step in content["steps"])
        types.append({
            "type": break_type,
            "title": content["title"],
            "duration_seconds": total_duration,
            "duration_minutes": round(total_duration / 60, 1),
            "has_animation": bool(content["animation"]),
            "has_music": bool(content["background_music"])
        })
    
    return jsonify({
        "success": True,
        "break_types": types
    })