from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import json
import os
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from breaks import breaks_bp
import spotipy  # type: ignore
from spotipy.oauth2 import SpotifyOAuth  # type: ignore

app = Flask(__name__)
CORS(app)
app.register_blueprint(breaks_bp)

checkin_data = {}

# API Keys
NOTION_API_KEY = os.getenv("NOTION_API_KEY")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

SCOPES = ['https://www.googleapis.com/auth/calendar']
TOKEN_FILE = 'token_calendar.json'

notion_headers = {
    "Authorization": f"Bearer {NOTION_API_KEY}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
}
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://127.0.0.1:5000/callback")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
SPOTIFY_SCOPE = (
    "user-library-read "
    "user-top-read "
    "playlist-modify-public "
    "playlist-modify-private"
)

# ============= GOOGLE CALENDAR HELPERS =============
def get_google_credentials():
    creds = None
    if os.path.exists(TOKEN_FILE):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
            print(f"Loaded credentials from {TOKEN_FILE}")
        except Exception as e:
            print(f"Error loading credentials: {e}")
            return None
    
    if creds and creds.expired and creds.refresh_token:
        try:
            print(" Token expired, refreshing...")
            creds.refresh(Request())
            with open(TOKEN_FILE, 'w') as token:
                token.write(creds.to_json())
            print("Token refreshed!")
        except Exception as e:
            print(f" Token refresh failed: {e}")
            return None
    elif creds and not creds.valid:
        print(" Credentials invalid")
        return None
    return creds

def get_calendar_service():
    try:
        creds = get_google_credentials()
        if not creds:
            return None
        return build('calendar', 'v3', credentials=creds)
    except Exception as e:
        print(f" Calendar service error: {e}")
        return None

def fetch_calendar_events(days=7):
    try:
        service = get_calendar_service()
        if not service:
            print(" Calendar not available")
            return []
        
        now = datetime.utcnow()
        time_min = now.isoformat() + 'Z'
        time_max = (now + timedelta(days=days)).isoformat() + 'Z'
        
        print(f" Fetching events...")
        events_result = service.events().list(
            calendarId='primary', timeMin=time_min, timeMax=time_max,
            singleEvents=True, orderBy='startTime', maxResults=100
        ).execute()
        
        events = events_result.get('items', [])
        parsed = []
        for event in events:
            start = event.get('start', {})
            end = event.get('end', {})
            parsed.append({
                "id": event.get('id'),
                "summary": event.get('summary', 'No Title'),
                "description": event.get('description', ''),
                "start": start.get('dateTime', start.get('date')),
                "end": end.get('dateTime', end.get('date')),
                "location": event.get('location', ''),
                "attendees": len(event.get('attendees', [])),
                "htmlLink": event.get('htmlLink', '')
            })
        print(f" Fetched {len(parsed)} events")
        return parsed
    except Exception as e:
        print(f" Calendar fetch error: {e}")
        return []

def insert_wellness_break_to_calendar(start_time, duration_minutes, break_type, reason):
    try:
        service = get_calendar_service()
        if not service:
            return {"success": False, "error": "Calendar unavailable"}
        
        end_time = start_time + timedelta(minutes=duration_minutes)
        event = {
            'summary': f'🧘 AI Wellness Break - {break_type.title()}',
            'description': f'AI-suggested wellness break\n\nType: {break_type}\nReason: {reason}\n\n Auto-scheduled by Wellness Analyzer',
            'start': {'dateTime': start_time.isoformat(), 'timeZone': 'Asia/Kolkata'},
            'end': {'dateTime': end_time.isoformat(), 'timeZone': 'Asia/Kolkata'},
            'colorId': '10',
            'reminders': {
                'useDefault': False,
                'overrides': [{'method': 'popup', 'minutes': 5}, {'method': 'popup', 'minutes': 1}]
            }
        }
        
        created_event = service.events().insert(calendarId='primary', body=event).execute()
        print(f" Break inserted: {break_type} at {start_time.strftime('%H:%M')}")
        
        return {
            "success": True,
            "event_link": created_event.get('htmlLink'),
            "event_id": created_event.get('id'),
            "summary": created_event.get('summary'),
            "start": start_time.isoformat(),
            "end": end_time.isoformat()
        }
    except Exception as e:
        print(f" Insert error: {e}")
        return {"success": False, "error": str(e)}

# ============= NOTION HELPERS =============
def fetch_notion_tasks():
    try:
        print(f"Fetching Notion tasks...")
        response = requests.post(
            f"https://api.notion.com/v1/databases/{NOTION_DATABASE_ID}/query",
            headers=notion_headers, timeout=10
        )
        response.raise_for_status()
        
        tasks = []
        for page in response.json().get("results", []):
            props = page.get("properties", {})
            task = {
                "id": page.get("id"),
                "name": props.get("Name", {}).get("title", [{}])[0].get("plain_text", "Untitled") if props.get("Name", {}).get("title") else "Untitled",
                "due_date": props.get("Due date", {}).get("date", {}).get("start") if props.get("Due date", {}).get("date") else None,
                "priority": props.get("Priority Level", {}).get("select", {}).get("name") if props.get("Priority Level", {}).get("select") else None,
                "status": props.get("Status", {}).get("status", {}).get("name") if props.get("Status", {}).get("status") else None,
                "type": props.get("Type", {}).get("rich_text", [{}])[0].get("plain_text") if props.get("Type", {}).get("rich_text") else None
            }
            tasks.append(task)
        print(f"Fetched {len(tasks)} tasks")
        return tasks
    except Exception as e:
        print(f"Notion error: {e}")
        return []

def analyze_calendar_stress_patterns(events):
    stress_keywords = ['deadline', 'review', 'interview', 'presentation', 'demo', 'urgent', 
                       'critical', 'board', 'client', 'crisis', 'emergency', 'evaluation', 
                       'assessment', 'performance', 'meeting', 'call', 'sync']
    
    back_to_back = 0
    long_meetings = []
    stress_events = []
    total_hours = 0
    
    for i, event in enumerate(events):
        summary = event.get('summary', '').lower()
        desc = event.get('description', '').lower()
        found_keywords = [kw for kw in stress_keywords if kw in summary or kw in desc]
        if found_keywords:
            stress_events.append({'title': event.get('summary'), 'start': event.get('start'), 'keywords': found_keywords})
        
        start_str = event.get('start')
        end_str = event.get('end')
        if start_str and end_str:
            try:
                start_dt = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
                end_dt = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
                duration_hours = (end_dt - start_dt).total_seconds() / 3600
                total_hours += duration_hours
                if duration_hours >= 2:
                    long_meetings.append({'title': event.get('summary'), 'hours': round(duration_hours, 1)})
            except:
                pass
        
        if i > 0:
            prev_end = events[i-1].get('end')
            curr_start = event.get('start')
            if prev_end and curr_start:
                try:
                    prev_end_dt = datetime.fromisoformat(prev_end.replace('Z', '+00:00'))
                    curr_start_dt = datetime.fromisoformat(curr_start.replace('Z', '+00:00'))
                    if (curr_start_dt - prev_end_dt).total_seconds() <= 900:
                        back_to_back += 1
                except:
                    pass
    
    return {
        'total_events': len(events),
        'stress_events': stress_events,
        'stress_count': len(stress_events),
        'back_to_back': back_to_back,
        'long_meetings': long_meetings,
        'total_hours': round(total_hours, 2)
    }

def analyze_task_workload(tasks):
    """PRECISE task workload analysis - ONLY UPCOMING 7 DAYS"""
    now = datetime.now()
    seven_days_from_now = now + timedelta(days=7)
    
    priority_counts = {'High': 0, 'Medium': 0, 'Low': 0}
    overdue = []
    urgent_24h = []
    upcoming_3d = []
    upcoming_week = []
    
    relevant_tasks = []
    
    for task in tasks:
        status = task.get('status', '').lower()
        
        if status in ['done', 'completed', 'finished']:
            continue
        
        due_date = task.get('due_date')
        
        if not due_date:
            continue
        
        try:
            due_dt = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
            
            if due_dt > seven_days_from_now.replace(tzinfo=due_dt.tzinfo):
                continue  
            
            relevant_tasks.append(task)
            priority = task.get('priority', 'None')
            if priority in priority_counts:
                priority_counts[priority] += 1
            
            hours_until = (due_dt - now.replace(tzinfo=due_dt.tzinfo)).total_seconds() / 3600
            
            if hours_until < 0:
                overdue.append(task)
            elif hours_until <= 24:
                urgent_24h.append(task)
            elif hours_until <= 72:
                upcoming_3d.append(task)
            elif hours_until <= 168:  # 7 days
                upcoming_week.append(task)
                
        except Exception as e:
            print(f"Error parsing task date: {e}")
            continue
    
    incomplete = len(relevant_tasks)
    
    return {
        'total': len(tasks),  
        'relevant': len(relevant_tasks),  
        'by_priority': priority_counts,
        'incomplete': incomplete,
        'overdue': overdue,
        'overdue_count': len(overdue),
        'urgent_24h': urgent_24h,
        'urgent_count': len(urgent_24h),
        'upcoming_3d': upcoming_3d,
        'upcoming_count': len(upcoming_3d),
        'upcoming_week': upcoming_week,
        'upcoming_week_count': len(upcoming_week)
    }
def comprehensive_stress_intelligence(calendar_events, notion_tasks):
    """AI wellness expert with PRECISE and REALISTIC analysis"""
    try:
        cal_analysis = analyze_calendar_stress_patterns(calendar_events)
        task_analysis = analyze_task_workload(notion_tasks)
        
       
        task_details = []
        for task in task_analysis['overdue']:
            task_details.append(f"OVERDUE: {task.get('name')} (Priority: {task.get('priority', 'None')})")
        for task in task_analysis['urgent_24h']:
            task_details.append(f"URGENT (24h): {task.get('name')} (Priority: {task.get('priority', 'None')})")
        for task in task_analysis['upcoming_3d']:
            task_details.append(f"DUE SOON (3d): {task.get('name')} (Priority: {task.get('priority', 'None')})")
        
        task_summary = "\n".join(task_details[:10]) if task_details else "No urgent tasks in the next 7 days"
        
       
        prompt = f"""You are an expert AI wellness psychologist. Analyze this person's workload PRECISELY and REALISTICALLY.

IMPORTANT: Be REALISTIC with stress scores. Don't overestimate. Most people function fine with moderate workload.

TASK ANALYSIS (Next 7 days ONLY):
- Total tasks in Notion: {task_analysis['total']}
- Relevant tasks (next 7 days, incomplete): {task_analysis['relevant']}
- Overdue: {task_analysis['overdue_count']} tasks
- Urgent (next 24h): {task_analysis['urgent_count']} tasks  
- Due Soon (next 3d): {task_analysis['upcoming_count']} tasks
- Priority: High={task_analysis['by_priority']['High']}, Medium={task_analysis['by_priority']['Medium']}, Low={task_analysis['by_priority']['Low']}

SPECIFIC TASKS:
{task_summary}

CALENDAR ANALYSIS (Next 7 days):
- Total Events: {cal_analysis['total_events']}
- Back-to-back meetings: {cal_analysis['back_to_back']}
- Stress events detected: {cal_analysis['stress_count']}
- Total meeting hours: {cal_analysis['total_hours']}
- Long meetings (2+hrs): {len(cal_analysis['long_meetings'])}

===========================================
REALISTIC STRESS SCORING GUIDELINES
===========================================

MINIMAL (1-2): 
- 0-2 relevant tasks, no overdue, no urgent
- 0-3 calendar events
- No high priority items

LOW (3-4):
- 3-5 relevant tasks, 0-1 overdue, 0-1 urgent
- 4-8 calendar events
- 1-2 high priority items
- Light workload, easily manageable

MODERATE (5-6):
- 6-10 relevant tasks, 1-2 overdue, 1-2 urgent
- 9-15 calendar events
- 2-3 high priority items
- Normal workload, manageable with planning

HIGH (7-8):
- 11-15 relevant tasks OR 3-4 overdue OR 3-4 urgent
- 16-25 calendar events
- 4-5 high priority items
- Heavy workload, requires active management

SEVERE (9):
- 16-20 relevant tasks OR 5+ overdue OR 5+ urgent
- 26-35 calendar events
- 6+ high priority items
- Very heavy workload, potential overwhelm

CRITICAL (10):
- 20+ relevant tasks OR 8+ overdue OR 8+ urgent
- 36+ calendar events, many back-to-back
- 8+ high priority items
- Unsustainable workload, immediate intervention needed

CRITICAL RULES:
1. If relevant tasks ≤ 5 and no overdue → stress CANNOT exceed 5
2. If relevant tasks ≤ 10 and overdue ≤ 2 → stress CANNOT exceed 7
3. Calendar events alone rarely justify high stress unless 20+ events
4. Consider both calendar AND tasks together, not in isolation
5. Don't inflate scores - most people can handle 10-15 tasks over a week

Return ONLY valid JSON:
{{
  "stress_level": "critical/severe/high/moderate/low/minimal",
  "stress_score": <1-10>,
  "burnout_risk": "imminent/high/moderate/low/minimal",
  "mood_state": "overwhelmed/stressed/anxious/coping/balanced/calm",
  "energy_forecast": "depleted/low/moderate/stable/good/high",
  "key_patterns": ["pattern1", "pattern2"],
  "wellness_recommendations": [
    {{"action": "specific action", "priority": "critical/high/medium/low", "reasoning": "why this matters"}}
  ],
  "recommended_music_genres": ["genre1", "genre2", "genre3"],
  "detailed_assessment": "Explain the score based on ACTUAL numbers. Be specific about why this score was chosen."
}}"""

        headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": "You are an expert wellness psychologist. Be PRECISE and REALISTIC. Don't inflate stress scores. Return ONLY valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,  
            "max_tokens": 2000,
            "response_format": {"type": "json_object"}
        }
        
        print(" Calling Groq AI for precise stress analysis...")
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        
        analysis = json.loads(response.json()["choices"][0]["message"]["content"])
        analysis["raw_metrics"] = {
            "calendar": cal_analysis,
            "tasks": task_analysis
        }
        
        print(f" Analysis complete! Stress: {analysis['stress_score']}/10 ({analysis['stress_level']})")
        print(f"  Relevant tasks: {task_analysis['relevant']} (Overdue: {task_analysis['overdue_count']}, Urgent: {task_analysis['urgent_count']})")
        print(f"  Calendar events: {cal_analysis['total_events']}")
        
        return analysis
        
    except Exception as e:
        print(f" Analysis error: {e}")
        
        task_analysis = analyze_task_workload(notion_tasks)
        cal_analysis = analyze_calendar_stress_patterns(calendar_events)
        stress_score = 1
        if task_analysis['relevant'] <= 5:
            stress_score += 1
        elif task_analysis['relevant'] <= 10:
            stress_score += 2
        elif task_analysis['relevant'] <= 15:
            stress_score += 3
        else:
            stress_score += 4
        stress_score += min(task_analysis['overdue_count'] * 1.5, 3)
        stress_score += min(task_analysis['urgent_count'], 2)
        if cal_analysis['total_events'] >= 20:
            stress_score += 2
        elif cal_analysis['total_events'] >= 10:
            stress_score += 1
        if cal_analysis['back_to_back'] >= 5:
            stress_score += 1
        
        stress_score = min(int(stress_score), 10)
        
        stress_levels_map = {
            (1, 2): "minimal",
            (3, 4): "low",
            (5, 6): "moderate",
            (7, 8): "high",
            (9, 9): "severe",
            (10, 10): "critical"
        }
        
        stress_level = "moderate"
        for (min_s, max_s), level in stress_levels_map.items():
            if min_s <= stress_score <= max_s:
                stress_level = level
                break
        
        return {
            "stress_level": stress_level,
            "stress_score": stress_score,
            "burnout_risk": "high" if stress_score >= 8 else "moderate" if stress_score >= 5 else "low",
            "mood_state": "overwhelmed" if stress_score >= 9 else "stressed" if stress_score >= 7 else "coping" if stress_score >= 5 else "balanced",
            "energy_forecast": "depleted" if stress_score >= 9 else "low" if stress_score >= 7 else "moderate" if stress_score >= 5 else "stable",
            "key_patterns": [
                f"{task_analysis['relevant']} tasks in next 7 days",
                f"{cal_analysis['total_events']} calendar events"
            ],
            "wellness_recommendations": [
                {"action": "Review task priorities", "priority": "high" if task_analysis['overdue_count'] > 2 else "medium", "reasoning": f"{task_analysis['overdue_count']} overdue tasks"}
            ],
            "recommended_music_genres": ["chill", "ambient", "lo-fi"],
            "detailed_assessment": f"Based on {task_analysis['relevant']} relevant tasks (next 7 days) and {cal_analysis['total_events']} events. {task_analysis['overdue_count']} overdue, {task_analysis['urgent_count']} urgent.",
            "error": str(e),
            "raw_metrics": {
                "calendar": cal_analysis,
                "tasks": task_analysis
            }
        }


def intelligent_break_scheduler(calendar_events, notion_tasks, stress_analysis, checkin_intel):
    try:
        now = datetime.now()
        today = now.date()

        work_start = datetime.combine(today, datetime.min.time()).replace(hour=9)
        work_end = datetime.combine(today, datetime.min.time()).replace(hour=18)

        today_events = [
            e for e in calendar_events
            if e.get('start', '').startswith(today.isoformat())
        ]
        today_events.sort(key=lambda x: x.get('start', ''))

        available_slots = []
        current_time = max(now, work_start)

        for event in today_events:
            try:
                event_start = datetime.fromisoformat(
                    event['start'].replace('Z', '+00:00')
                )
                gap_minutes = (event_start - current_time).total_seconds() / 60

                if gap_minutes >= 20:
                    available_slots.append({
                        "start": current_time.strftime("%H:%M"),
                        "end": event_start.strftime("%H:%M"),
                        "gap_minutes": int(gap_minutes),
                        "context": f"Before {event.get('summary', 'next event')}"
                    })

                event_end = datetime.fromisoformat(
                    event['end'].replace('Z', '+00:00')
                )
                current_time = event_end
            except:
                continue

        if current_time < work_end:
            gap_minutes = (work_end - current_time).total_seconds() / 60
            if gap_minutes >= 15:
                available_slots.append({
                    "start": current_time.strftime("%H:%M"),
                    "end": work_end.strftime("%H:%M"),
                    "gap_minutes": int(gap_minutes),
                    "context": "End of workday"
                })

        
        prompt = f"""
        You are an AI wellness coach inside a mobile wellness app.
        Your goal is to intelligently schedule wellness breaks that feel helpful,
        timely, and non-intrusive based on user stress, energy, and daily patterns.

        ========================
        USER WELLNESS INTELLIGENCE
        ========================
        From recent check-ins:
        - Average Stress (7 days): {checkin_intel.get('avg_stress')}/10
        - Average Energy (7 days): {checkin_intel.get('avg_energy')}/10
        - Afternoon Energy Slump: {checkin_intel.get('afternoon_slump')}
        - Burnout Risk Level: {checkin_intel.get('burnout_risk')}

        Current Stress Analysis:
        - Stress Level: {stress_analysis.get('stress_level')}
        - Stress Score: {stress_analysis.get('stress_score')}/10

        ========================
        AVAILABLE TIME SLOTS (Today)
        ========================
        {json.dumps(available_slots, indent=2)}

        ========================
        TASK
        ========================
        Design **2–3 personalized wellness breaks** for today.
        Schedule breaks ONLY within the available time slots.

        ========================
        BREAK SELECTION LOGIC
        ========================
        - If Stress ≥ 7 OR Burnout Risk is HIGH → prioritize breathing or meditation
        - If Energy ≤ 4 → prioritize light walking or stretching (avoid meditation)
        - If Afternoon Slump = TRUE → place at least one movement-based break between 13:00–16:00
        - Avoid repeating the same break type consecutively
        - Match break duration to slot size (5–15 minutes)
        - Keep breaks supportive, not overwhelming

        ========================
        RULES
        ========================
        - Do NOT overlap breaks
        - Do NOT exceed available slot duration
        - Break duration: 5–15 minutes
        - Use empathetic, human-friendly language
        - No medical claims

        ========================
        RETURN FORMAT (STRICT JSON ONLY)
        ========================
        {{
        "recommended_breaks": [
            {{
            "time_slot": "HH:MM - HH:MM",
            "break_type": "breathing | meditation | walk | stretch",
            "duration_minutes": 5-15,
            "reasoning": "Why this break was chosen based on stress, energy, or patterns",
            "reason_tag": "High Stress | Low Energy | Afternoon Slump | Focus Reset | Burnout Prevention",
            "ui_message": "Short friendly message shown in the app",
            "confidence": 0.0-1.0
            }}
        ],
        "daily_strategy": "One-line personalized wellness strategy for today"
        }}
        """



        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": "Return ONLY valid JSON. No explanations."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.6,
            "max_tokens": 1200,
            "response_format": {"type": "json_object"}
        }

        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=25
        )

        response.raise_for_status()
        return json.loads(response.json()["choices"][0]["message"]["content"])

    except Exception as e:
        print(f" Break scheduler error: {e}")
        now = datetime.now()
        return {
            "recommended_breaks": [{
                "time_slot": f"{(now.hour + 1) % 24:02d}:00 - {(now.hour + 1) % 24:02d}:10",
                "break_type": "breathing",
                "duration_minutes": 10,
                "reasoning": "Fallback stress relief break",
                "reason_tag": "Fallback",
                "ui_message": "Take a short pause to reset",
                "confidence": 0.5
            }],
            "daily_strategy": "Keep things light and balanced"
        }

def save_checkin(user_id, checkin_type, data):
    if user_id not in checkin_data:
        checkin_data[user_id] = {
            'morning': [],
            'afternoon': [],
            'evening': []
        }

    checkin_entry = {
        'timestamp': datetime.now().isoformat(),
        'type': checkin_type,
        'data': data,
        'signals': {
            'stress': data.get('stress', 5),
            'energy': data.get('energy', 5),
            'mood': data.get('mood', 5),
            'focus': data.get('focus', None)
        }
    }

    checkin_data[user_id][checkin_type].append(checkin_entry)

    cutoff = datetime.now() - timedelta(days=30)
    checkin_data[user_id][checkin_type] = [
        c for c in checkin_data[user_id][checkin_type]
        if datetime.fromisoformat(c['timestamp']) > cutoff
    ]

    return checkin_entry
def derive_checkin_intelligence(checkins, days=7):
    cutoff = datetime.now() - timedelta(days=days)

    flattened = []
    for period in ['morning', 'afternoon', 'evening']:
        flattened.extend([
            c for c in checkins.get(period, [])
            if datetime.fromisoformat(c['timestamp']) > cutoff
        ])

    if not flattened:
        return {
            "avg_stress": 5,
            "avg_energy": 5,
            "afternoon_slump": False,
            "burnout_risk": "low"
        }

    stress_vals = [c['signals']['stress'] for c in flattened]
    energy_vals = [c['signals']['energy'] for c in flattened]

    afternoon_energy = [
        c['signals']['energy']
        for c in checkins.get('afternoon', [])
        if datetime.fromisoformat(c['timestamp']) > cutoff
    ]

    avg_stress = round(sum(stress_vals) / len(stress_vals), 1)
    avg_energy = round(sum(energy_vals) / len(energy_vals), 1)

    afternoon_slump = (
        len(afternoon_energy) >= 2 and
        sum(afternoon_energy) / len(afternoon_energy) <= 4
    )

    burnout_risk = (
        "high" if avg_stress >= 7 and avg_energy <= 4
        else "medium" if avg_stress >= 6
        else "low"
    )

    return {
        "avg_stress": avg_stress,
        "avg_energy": avg_energy,
        "afternoon_slump": afternoon_slump,
        "burnout_risk": burnout_risk
    }

def get_recent_checkins(user_id, days=7):
    if user_id not in checkin_data:
        return {'morning': [], 'afternoon': [], 'evening': []}
    cutoff = datetime.now() - timedelta(days=days)
    return {
        'morning': [c for c in checkin_data[user_id]['morning'] if datetime.fromisoformat(c['timestamp']) > cutoff],
        'afternoon': [c for c in checkin_data[user_id]['afternoon'] if datetime.fromisoformat(c['timestamp']) > cutoff],
        'evening': [c for c in checkin_data[user_id]['evening'] if datetime.fromisoformat(c['timestamp']) > cutoff]
    }

def analyze_mood_with_ai(checkin_history, current_checkin):
    try:
        intelligence = derive_checkin_intelligence(checkin_history, days=7)

        mood_summary = []
        for period in ['morning', 'afternoon', 'evening']:
            for c in checkin_history.get(period, [])[-5:]:
                d = c.get('data', {})
                mood_summary.append({
                    "date": c['timestamp'][:10],
                    "period": period,
                    "mood": d.get('mood', 5),
                    "energy": d.get('energy', 5),
                    "stress": d.get('stress', 5)
                })

        prompt = f"""
You are an AI wellness psychologist.

RECENT CHECK-IN INTELLIGENCE:
- Avg Stress: {intelligence['avg_stress']}/10
- Avg Energy: {intelligence['avg_energy']}/10
- Afternoon Slump: {intelligence['afternoon_slump']}
- Burnout Risk: {intelligence['burnout_risk']}

CURRENT CHECK-IN:
Mood {current_checkin.get('mood',5)}/10
Energy {current_checkin.get('energy',5)}/10
Stress {current_checkin.get('stress',5)}/10

HISTORY:
{json.dumps(mood_summary, indent=2)}

Return ONLY valid JSON:
{{
  "mood_state":"excellent/good/fair/concerning",
  "mood_trend":"improving/stable/declining",
  "mood_score":1-10,
  "key_insights":["..."],
  "recommendations":[{{"action":"...","priority":"high/medium","reasoning":"..."}}],
  "motivational_message":"..."
}}
"""

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": "Return ONLY JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.4,
            "max_tokens": 1200,
            "response_format": {"type": "json_object"}
        }

        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )

        response.raise_for_status()
        return json.loads(response.json()["choices"][0]["message"]["content"])

    except Exception as e:
        return {
            "mood_state": "fair",
            "mood_trend": "stable",
            "mood_score": current_checkin.get('mood', 5),
            "key_insights": ["Mood recorded"],
            "recommendations": [
                {"action": "Continue check-ins", "priority": "medium", "reasoning": "Tracking helps awareness"}
            ],
            "motivational_message": "One step at a time 💙",
            "error": str(e)
        }

@app.route("/")
def home():
    return jsonify({
        "service": " Wellness Analyzer v2.0", "status": "running",
        "endpoints": {
            "GET /calendar": "Calendar events", "GET /tasks": "Notion tasks",
            "GET /analyze": "AI stress analysis", "GET /schedule-breaks": "Break scheduler",
            "POST /checkin/morning": "Morning check-in", "POST /checkin/afternoon": "Afternoon check-in",
            "POST /checkin/evening": "Evening check-in", "GET /checkin/history": "Check-in history",
            "GET /checkin/status": "Today's check-in status", "GET /checkin/analytics": "Check-in analytics"
        }
    })

@app.route("/calendar")
def get_calendar():
    days = request.args.get('days', 7, type=int)
    events = fetch_calendar_events(days)
    return jsonify({"success": True, "total": len(events), "events": events})

@app.route("/tasks")
def get_tasks():
    tasks = fetch_notion_tasks()
    return jsonify({"success": True, "total": len(tasks), "tasks": tasks})

@app.route("/analyze")
def analyze():
    """Comprehensive stress analysis with realistic scoring"""
    print("\n" + "="*70)
    print(" COMPREHENSIVE WELLNESS ANALYSIS")
    print("="*70)
    
    calendar_events = fetch_calendar_events(7)
    notion_tasks = fetch_notion_tasks()
    
    print(f"\nCalendar: {len(calendar_events)} events")
    print(f"Notion: {len(notion_tasks)} total tasks")
    
    stress_analysis = comprehensive_stress_intelligence(calendar_events, notion_tasks)
    
    # Log the filtered results
    task_metrics = stress_analysis.get('raw_metrics', {}).get('tasks', {})
    print(f"\n Filtered Analysis:")
    print(f"   Relevant tasks (next 7 days): {task_metrics.get('relevant', 0)}")
    print(f"   Overdue: {task_metrics.get('overdue_count', 0)}")
    print(f"   Urgent (24h): {task_metrics.get('urgent_count', 0)}")
    print(f"   Due soon (3d): {task_metrics.get('upcoming_count', 0)}")
    print(f"\nFinal Stress: {stress_analysis['stress_level'].upper()} ({stress_analysis['stress_score']}/10)")
    print(f"   Burnout Risk: {stress_analysis.get('burnout_risk', 'unknown').upper()}\n")
    
    return jsonify({
        "success": True,
        "timestamp": datetime.now().isoformat(),
        "stress_intelligence": stress_analysis,
        "data_sources": {
            "calendar_events": len(calendar_events),
            "notion_tasks_total": len(notion_tasks),
            "notion_tasks_relevant": task_metrics.get('relevant', 0)
        }
    })
@app.route("/schedule-breaks")
def schedule_breaks():
    try:
        print("\nINTELLIGENT BREAK SCHEDULING\n")
        user_id = request.args.get("user_id", "default_user")
        recent_checkins = get_recent_checkins(user_id, days=7)
        checkin_intel = derive_checkin_intelligence(recent_checkins)

        calendar_events = fetch_calendar_events(7)
        notion_tasks = fetch_notion_tasks()
        stress_analysis = comprehensive_stress_intelligence(calendar_events, notion_tasks)

        break_schedule = intelligent_break_scheduler(
            calendar_events,
            notion_tasks,
            stress_analysis, 
            checkin_intel
        )

        auto_insert = request.args.get('auto_insert', 'false').lower() == 'true'
        inserted_breaks = []

        if auto_insert:
            print("Auto-inserting breaks into Google Calendar...")
            for rec in break_schedule.get('recommended_breaks', []):
                try:
                    time_slot = rec.get('time_slot', '')
                    start_time_str = time_slot.split(' - ')[0]
                    start_hour, start_minute = map(int, start_time_str.split(':'))

                    now = datetime.now()
                    start_time = now.replace(
                        hour=start_hour,
                        minute=start_minute,
                        second=0,
                        microsecond=0
                    )

                    result = insert_wellness_break_to_calendar(
                        start_time=start_time,
                        duration_minutes=rec.get('duration_minutes', 10),
                        break_type=rec.get('break_type', 'wellness'),
                        reason=rec.get('reasoning', 'AI-recommended')
                    )

                    if result.get('success'):
                        inserted_breaks.append(result)
                        print(f"   ✓ Inserted: {rec.get('break_type')} at {start_time_str}")

                except Exception as e:
                    print(f"   ✗ Failed to insert break: {e}")

            print(f"\nSuccessfully inserted {len(inserted_breaks)} breaks\n")

        return jsonify({
            "success": True,
            "stress_assessment": {
                "level": stress_analysis['stress_level'],
                "score": stress_analysis['stress_score']
            },
            "break_schedule": break_schedule,
            "auto_inserted": auto_insert,
            "inserted_breaks": inserted_breaks if auto_insert else [],
            "note": "Use ?auto_insert=true to insert breaks into Google Calendar"
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/checkin/morning", methods=["POST"])
def morning_checkin():
    try:
        data = request.json
        user_id = data.get('user_id', 'default_user')
        checkin_input = {
            'mood': data.get('mood', 5), 'energy': data.get('energy', 5),
            'sleep_quality': data.get('sleep_quality', 5), 'stress': data.get('stress', 5),
            'notes': data.get('notes', ''), 'goals': data.get('goals', [])
        }
        saved_checkin = save_checkin(user_id, 'morning', checkin_input)
        history = get_recent_checkins(user_id, 7)
        all_checkins = history['morning'] + history['afternoon'] + history['evening']
        mood_analysis = analyze_mood_with_ai(all_checkins, checkin_input)
        return jsonify({"success": True, "checkin": saved_checkin, "mood_analysis": mood_analysis})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/checkin/afternoon", methods=["POST"])
def afternoon_checkin():
    try:
        data = request.json
        user_id = data.get('user_id', 'default_user')
        checkin_input = {
            'mood': data.get('mood', 5), 'energy': data.get('energy', 5),
            'stress': data.get('stress', 5), 'focus': data.get('focus', 5),
            'notes': data.get('notes', '')
        }
        saved_checkin = save_checkin(user_id, 'afternoon', checkin_input)
        history = get_recent_checkins(user_id, 7)
        all_checkins = history['morning'] + history['afternoon'] + history['evening']
        mood_analysis = analyze_mood_with_ai(all_checkins, checkin_input)
        return jsonify({"success": True, "checkin": saved_checkin, "mood_analysis": mood_analysis})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/checkin/evening", methods=["POST"])
def evening_checkin():
    try:
        data = request.json
        user_id = data.get('user_id', 'default_user')
        checkin_input = {
            'mood': data.get('mood', 5), 'energy': data.get('energy', 5),
            'stress': data.get('stress', 5), 'productivity': data.get('productivity', 5),
            'notes': data.get('notes', ''), 'gratitude': data.get('gratitude', []),
            'goals_achieved': data.get('goals_achieved', False)
        }
        saved_checkin = save_checkin(user_id, 'evening', checkin_input)
        history = get_recent_checkins(user_id, 7)
        all_checkins = history['morning'] + history['afternoon'] + history['evening']
        mood_analysis = analyze_mood_with_ai(all_checkins, checkin_input)
        return jsonify({"success": True, "checkin": saved_checkin, "mood_analysis": mood_analysis})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
@app.route("/checkin/history")
def get_checkin_history():
    user_id = request.args.get('user_id', 'default_user')
    days = request.args.get('days', 7, type=int)
    history = get_recent_checkins(user_id, days)
    return jsonify({
        "success": True, "history": history,
        "total_morning": len(history['morning']),
        "total_afternoon": len(history['afternoon']),
        "total_evening": len(history['evening'])
    })

@app.route("/checkin/status")
def checkin_status():
    user_id = request.args.get('user_id', 'default_user')
    today = datetime.now().date()
    history = get_recent_checkins(user_id, 1)
    
    morning_done = any(datetime.fromisoformat(c['timestamp']).date() == today for c in history['morning'])
    afternoon_done = any(datetime.fromisoformat(c['timestamp']).date() == today for c in history['afternoon'])
    evening_done = any(datetime.fromisoformat(c['timestamp']).date() == today for c in history['evening'])
    
    current_hour = datetime.now().hour
    if not morning_done and current_hour < 12:
        next_checkin = "morning"
    elif not afternoon_done and 12 <= current_hour < 17:
        next_checkin = "afternoon"
    elif not evening_done and current_hour >= 17:
        next_checkin = "evening"
    else:
        next_checkin = None
    
    return jsonify({
        "success": True, "morning_completed": morning_done,
        "afternoon_completed": afternoon_done, "evening_completed": evening_done,
        "next_checkin": next_checkin, "current_hour": current_hour
    })

@app.route("/checkin/analytics")
def checkin_analytics():
    user_id = request.args.get('user_id', 'default_user')
    days = request.args.get('days', 30, type=int)
    history = get_recent_checkins(user_id, days)
    all_checkins = history['morning'] + history['afternoon'] + history['evening']
    
    if not all_checkins:
        return jsonify({
            "success": True,
            "analytics": {
                "average_mood": 5, "average_energy": 5, "average_stress": 5,
                "trend": "stable", "total_checkins": 0
            }
        })
    
    moods = [c['data'].get('mood', 5) for c in all_checkins]
    energies = [c['data'].get('energy', 5) for c in all_checkins]
    stresses = [c['data'].get('stress', 5) for c in all_checkins]
    
    avg_mood = sum(moods) / len(moods)
    avg_energy = sum(energies) / len(energies)
    avg_stress = sum(stresses) / len(stresses)
    
    if len(moods) >= 2:
        recent_avg = sum(moods[-3:]) / len(moods[-3:])
        older_avg = sum(moods[:3]) / len(moods[:3])
        trend = "improving" if recent_avg > older_avg + 0.5 else "declining" if recent_avg < older_avg - 0.5 else "stable"
    else:
        trend = "stable"
    
    return jsonify({
        "success": True,
        "analytics": {
            "average_mood": round(avg_mood, 1), "average_energy": round(avg_energy, 1),
            "average_stress": round(avg_stress, 1), "trend": trend,
            "total_checkins": len(all_checkins),
            "checkin_streak": len(history['morning']) + len(history['afternoon']) + len(history['evening']),
            "mood_history": moods, "energy_history": energies, "stress_history": stresses
        }
    })

def get_spotify_client():
    try:
        sp_oauth = SpotifyOAuth(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET,
            redirect_uri=SPOTIFY_REDIRECT_URI,
            scope="user-library-read user-top-read playlist-modify-public playlist-modify-private",
            cache_path=".spotify_cache"
        )
        
        token_info = sp_oauth.get_cached_token()
        
        if token_info:
            print("Using cached Spotify token")
            return spotipy.Spotify(auth=token_info['access_token'])
        else:
            print("No Spotify token found - need authentication")
            return None
            
    except Exception as e:
        print(f"Spotify client error: {e}")
        return None


def get_ai_music_recommendations(stress_analysis, user_mood=None, user_preferences=None):
    """Use Groq AI to get intelligent music recommendations based on wellness state"""
    try:
        user_context = {
            "stress_level": stress_analysis.get('stress_level'),
            "stress_score": stress_analysis.get('stress_score'),
            "mood_state": stress_analysis.get('mood_state'),
            "energy_forecast": stress_analysis.get('energy_forecast'),
            "burnout_risk": stress_analysis.get('burnout_risk')
        }
        
        if user_mood:
            user_context["current_mood"] = user_mood
        
        if user_preferences:
            user_context["preferences"] = user_preferences

        prompt = f"""You are an expert music therapist and wellness psychologist.

IMPORTANT SAFETY RULES (STRICT):
- DO NOT recommend explicit, E-rated, or sexually explicit songs.
- DO NOT recommend songs with profanity, violence, substance abuse, or aggressive themes.
- DO NOT recommend songs whose song names are 18+
- DO NOT recommend songs from genres known for explicit content
- DO NOT recommend songs from artists like Cardi B , Doja Cat
- Prefer clean, instrumental, lyrical-safe, and emotionally supportive music.
- If unsure about lyrical safety, prefer instrumental tracks.
- All recommendations must be suitable for public, academic, and wellness environments.

CURRENT USER STATE:
- Stress Level: {user_context['stress_level']} ({user_context['stress_score']}/10)
- Mood State: {user_context['mood_state']}
- Energy Level: {user_context['energy_forecast']}
- Burnout Risk: {user_context['burnout_risk']}
{f"- User Mood: {user_context.get('current_mood')}" if user_mood else ""}
{f"- Music Preferences: {user_context.get('preferences')}" if user_preferences else ""}

Provide therapeutic music recommendations that are SAFE, CLEAN, and WELLNESS-APPROPRIATE.

Return ONLY valid JSON in the following format:

{{
  "primary_mood_category": "calm/energize/focus/sleep/motivation/healing",
  "therapeutic_goal": "specific therapeutic goal for this music session",
  "recommended_genres": ["genre1", "genre2", "genre3", "genre4", "genre5"],
  "recommended_artists": ["artist1", "artist2", "artist3", "artist4", "artist5"],
  "recommended_tracks": [
    {{
      "artist": "Artist Name",
      "track": "Track Name",
      "reason": "why this clean and non-explicit track supports mental wellness"
    }}
  ],
  "playlist_structure": {{
    "phase_1": {{"duration": "10-15 min", "purpose": "initial emotional regulation", "genres": ["genre1"]}},
    "phase_2": {{"duration": "15-20 min", "purpose": "deep therapeutic focus", "genres": ["genre2"]}},
    "phase_3": {{"duration": "10-15 min", "purpose": "balanced and grounded conclusion", "genres": ["genre3"]}}
  }},
  "tempo_recommendation": "slow/medium/upbeat/varied",
  "listening_context": "background/focused/meditation/study",
  "therapeutic_explanation": "clinical-style explanation of how this music supports mental health",
  "avoid_genres": ["explicit rap", "aggressive EDM", "heavy metal", "violent themes"],
  "session_duration": "recommended total duration"
}}
"""

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": "You are an expert music therapist. Return ONLY valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 2000,
            "response_format": {"type": "json_object"}
        }

        print("🎵 Requesting AI music recommendations from Groq...")
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        
        ai_recommendations = json.loads(response.json()["choices"][0]["message"]["content"])
        print(f"AI recommendations received: {ai_recommendations.get('primary_mood_category')}")
        
        return ai_recommendations

    except Exception as e:
        print(f"AI recommendation error: {e}")
        return {
            "primary_mood_category": "calm",
            "therapeutic_goal": "Stress relief and relaxation",
            "recommended_genres": ["ambient", "chill", "lo-fi", "classical", "meditation"],
            "recommended_artists": ["Ólafur Arnalds", "Nils Frahm", "Max Richter", "Ludovico Einaudi"],
            "recommended_tracks": [],
            "playlist_structure": {
                "phase_1": {"duration": "10 min", "purpose": "calming", "genres": ["ambient"]},
                "phase_2": {"duration": "15 min", "purpose": "deepening", "genres": ["classical"]},
                "phase_3": {"duration": "10 min", "purpose": "balance", "genres": ["chill"]}
            },
            "tempo_recommendation": "slow",
            "listening_context": "background",
            "therapeutic_explanation": "Calming music to reduce stress and promote relaxation",
            "avoid_genres": ["heavy metal", "aggressive rap", "high-energy EDM"],
            "session_duration": "30-45 minutes"
        }


def search_spotify_tracks_with_ai(sp, ai_recommendations, limit=30):
    """Search Spotify for tracks based on AI recommendations"""
    tracks = []
    
    print("Searching for AI-recommended tracks...")
    for track_rec in ai_recommendations.get('recommended_tracks', [])[:5]:
        try:
            query = f"{track_rec.get('track')} {track_rec.get('artist')}"
            results = sp.search(q=query, type='track', limit=3)
            
            for item in results['tracks']['items']:
                if len(tracks) >= limit:
                    break
                    
                tracks.append({
                    "name": item['name'],
                    "artist": ", ".join([a['name'] for a in item['artists']]),
                    "uri": item['uri'],
                    "url": item['external_urls']['spotify'],
                    "popularity": item['popularity'],
                    "album": item['album']['name'],
                    "album_image": item['album']['images'][0]['url'] if item['album']['images'] else None,
                    "ai_reason": track_rec.get('reason'),
                    "recommended_by": "AI - Specific Track"
                })
        except Exception as e:
            print(f"Track search error: {e}")
            continue
    
    print("Searching by recommended artists...")
    for artist in ai_recommendations.get('recommended_artists', [])[:5]:
        try:
            if len(tracks) >= limit:
                break
                
            results = sp.search(q=f"artist:{artist}", type='track', limit=5)
            
            for item in results['tracks']['items']:
                if len(tracks) >= limit:
                    break
                    
                # Avoid duplicates
                if not any(t['uri'] == item['uri'] for t in tracks):
                    tracks.append({
                        "name": item['name'],
                        "artist": ", ".join([a['name'] for a in item['artists']]),
                        "uri": item['uri'],
                        "url": item['external_urls']['spotify'],
                        "popularity": item['popularity'],
                        "album": item['album']['name'],
                        "album_image": item['album']['images'][0]['url'] if item['album']['images'] else None,
                        "recommended_by": f"AI - Artist: {artist}"
                    })
        except Exception as e:
            print(f"Artist search error: {e}")
            continue
    
    print("Searching by genres...")
    for genre in ai_recommendations.get('recommended_genres', [])[:5]:
        try:
            if len(tracks) >= limit:
                break
                
            results = sp.search(q=f"genre:{genre}", type='track', limit=8)
            
            for item in results['tracks']['items']:
                if len(tracks) >= limit:
                    break
                    
                # Avoid duplicates
                if not any(t['uri'] == item['uri'] for t in tracks):
                    tracks.append({
                        "name": item['name'],
                        "artist": ", ".join([a['name'] for a in item['artists']]),
                        "uri": item['uri'],
                        "url": item['external_urls']['spotify'],
                        "popularity": item['popularity'],
                        "album": item['album']['name'],
                        "album_image": item['album']['images'][0]['url'] if item['album']['images'] else None,
                        "recommended_by": f"Genre: {genre}"
                    })
        except Exception as e:
            print(f" Genre search error: {e}")
            continue
    
    # Sort: AI-specific tracks first, then by popularity
    ai_specific = [t for t in tracks if t.get('ai_reason')]
    others = sorted([t for t in tracks if not t.get('ai_reason')], 
                   key=lambda x: x['popularity'], reverse=True)
    
    final_tracks = ai_specific + others
    print(f" Found {len(final_tracks)} total tracks")
    
    return final_tracks


def get_curated_playlists(sp, stress_level):
    """Get curated Spotify playlists based on stress level"""
    query_map = {
        "critical": ["emergency calm", "deep relaxation", "anxiety relief"],
        "severe": ["stress relief", "calm anxiety", "peaceful meditation"],
        "high": ["calm", "peaceful", "relaxing"],
        "moderate": ["focus", "chill", "ambient"],
        "low": ["upbeat", "happy", "energizing"],
        "minimal": ["motivational", "positive vibes", "uplifting"]
    }
    
    queries = query_map.get(stress_level, ["chill", "relaxing"])
    playlists = []
    
    print(f"Searching for playlists with queries: {queries}")
    
    for query in queries[:2]:
        try:
            results = sp.search(q=query, type='playlist', limit=5)
            for item in results['playlists']['items']:
                playlists.append({
                    "name": item['name'],
                    "url": item['external_urls']['spotify'],
                    "tracks": item['tracks']['total'],
                    "description": item.get('description', ''),
                    "image": item['images'][0]['url'] if item['images'] else None,
                    "owner": item['owner']['display_name']
                })
        except Exception as e:
            print(f"Playlist search error for '{query}': {e}")
            continue
    
    print(f"Found {len(playlists)} curated playlists")
    return playlists[:10]



@app.route("/spotify-login")
def spotify_login():
    sp_oauth = SpotifyOAuth(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET,
        redirect_uri=SPOTIFY_REDIRECT_URI,
        scope=SPOTIFY_SCOPE,
        show_dialog=True
    )

    return jsonify({
        "success": True,
        "auth_url": sp_oauth.get_authorize_url()
    })

@app.route("/callback")
def spotify_callback():
    try:
        code = request.args.get("code")
        if not code:
            return jsonify({"error": "No auth code"}), 400

        sp_oauth = SpotifyOAuth(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET,
            redirect_uri=SPOTIFY_REDIRECT_URI,
            scope=SPOTIFY_SCOPE,
            cache_path=".spotify_cache"
        )

        token_info = sp_oauth.get_access_token(code, as_dict=True)

        sp = spotipy.Spotify(auth=token_info["access_token"])
        user = sp.current_user()

        return jsonify({
            "success": True,
            "user": {
                "id": user["id"],
                "name": user["display_name"]
            }
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/spotify-status")
def spotify_status():
    """
    Check if Spotify is authenticated
    Returns user info if authenticated, or needs_auth flag
    """
    try:
        print("🎵 Checking Spotify authentication status...")
        
        sp = get_spotify_client()
        
        if sp:
            user_info = sp.current_user()
            print(f"✅ Spotify authenticated: {user_info.get('display_name')}")
            
            return jsonify({
                "success": True,
                "authenticated": True,
                "user": {
                    "name": user_info.get('display_name'),
                    "email": user_info.get('email'),
                    "id": user_info.get('id'),
                    "country": user_info.get('country'),
                    "product": user_info.get('product')  # premium/free
                }
            })
        else:
            print("Spotify not authenticated")
            return jsonify({
                "success": True,
                "authenticated": False,
                "message": "Not authenticated. Call /spotify-login to get authorization URL."
            })
            
    except Exception as e:
        print(f"Spotify status error: {e}")
        return jsonify({
            "success": False,
            "authenticated": False,
            "error": str(e)
        }), 500


@app.route("/music-therapy")
def music_therapy():
    """
    Main endpoint: Get AI-powered music recommendations
    
    Query params:
    - mood: Optional user mood (e.g., "anxious", "tired", "excited")
    - preferences: Optional music preferences (e.g., "pop,rock,indie")
    
    Returns:
    - AI analysis of user's wellness state
    - Personalized track recommendations
    - Curated playlists
    - Therapeutic explanation
    """
    try:
        print("\n" + "="*70)
        print("MUSIC THERAPY REQUEST")
        print("="*70)
        
        user_mood = request.args.get('mood')
        user_preferences = request.args.get('preferences')
        
        if user_mood:
            print(f" User mood: {user_mood}")
        if user_preferences:
            print(f"User preferences: {user_preferences}")
        
        # Check Spotify authentication
        sp = get_spotify_client()
        if not sp:
            print("Spotify not authenticated")
            return jsonify({
                "success": False,
                "error": "Spotify not authenticated",
                "needs_auth": True,
                "auth_url_endpoint": "/spotify-login"
            }), 401
        
        # Get user's stress analysis
        print("Analyzing stress and wellness...")
        calendar_events = fetch_calendar_events(7)
        notion_tasks = fetch_notion_tasks()
        stress_analysis = comprehensive_stress_intelligence(calendar_events, notion_tasks)
        
        print(f"   Stress: {stress_analysis['stress_level']} ({stress_analysis['stress_score']}/10)")
        print(f"   Mood: {stress_analysis.get('mood_state')}")
        print(f"   Energy: {stress_analysis.get('energy_forecast')}")
        
        # Get AI music recommendations
        ai_recommendations = get_ai_music_recommendations(
            stress_analysis,
            user_mood,
            user_preferences
        )
        
        print(f"AI Goal: {ai_recommendations.get('therapeutic_goal')}")
        
        tracks = search_spotify_tracks_with_ai(sp, ai_recommendations, limit=30)
        
        playlists = get_curated_playlists(sp, stress_analysis['stress_level'])
        
        print(f"Compiled {len(tracks)} tracks and {len(playlists)} playlists")
        print("="*70 + "\n")
        
        return jsonify({
            "success": True,
            "stress_assessment": {
                "level": stress_analysis['stress_level'],
                "score": stress_analysis['stress_score'],
                "mood_state": stress_analysis.get('mood_state'),
                "energy_forecast": stress_analysis.get('energy_forecast'),
                "burnout_risk": stress_analysis.get('burnout_risk')
            },
            "user_input": {
                "mood": user_mood,
                "preferences": user_preferences
            },
            "ai_music_intelligence": {
                "primary_mood_category": ai_recommendations.get('primary_mood_category'),
                "therapeutic_goal": ai_recommendations.get('therapeutic_goal'),
                "recommended_genres": ai_recommendations.get('recommended_genres'),
                "recommended_artists": ai_recommendations.get('recommended_artists'),
                "playlist_structure": ai_recommendations.get('playlist_structure'),
                "tempo_recommendation": ai_recommendations.get('tempo_recommendation'),
                "listening_context": ai_recommendations.get('listening_context'),
                "therapeutic_explanation": ai_recommendations.get('therapeutic_explanation'),
                "avoid_genres": ai_recommendations.get('avoid_genres'),
                "session_duration": ai_recommendations.get('session_duration')
            },
            "tracks": tracks,
            "playlists": playlists,
            "total_tracks": len(tracks),
            "total_playlists": len(playlists),
            "usage_tip": "Add ?mood=anxious&preferences=indie,pop to personalize"
        })
        
    except Exception as e:
        print(f" Music therapy error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/create-playlist", methods=["POST"])
def create_playlist():
    try:
        data = request.get_json() or {}
        user_mood = data.get("mood")
        user_preferences = data.get("preferences")
        playlist_name_custom = data.get("playlist_name")

        sp = get_spotify_client()
        if not sp:
            return jsonify({
                "success": False,
                "needs_auth": True
            }), 401

        calendar_events = fetch_calendar_events(7)
        notion_tasks = fetch_notion_tasks()
        stress_analysis = comprehensive_stress_intelligence(
            calendar_events,
            notion_tasks
        )

        ai_recs = get_ai_music_recommendations(
            stress_analysis,
            user_mood,
            user_preferences
        )

        tracks = search_spotify_tracks_with_ai(sp, ai_recs, limit=40)
        if not tracks:
            return jsonify({"error": "No tracks found"}), 404

        if playlist_name_custom and playlist_name_custom.strip():
            playlist_name = playlist_name_custom.strip()
        else:
            mood = ai_recs.get("primary_mood_category", "Wellness").title()
            playlist_name = f"AI Wellness: {mood} ({datetime.now():%b %d})"

        playlist_desc = (
            f"AI Wellness Playlist\n"
            f"Goal: {ai_recs.get('therapeutic_goal')}\n"
            f"Stress: {stress_analysis['stress_score']}/10"
        )

        user_id = sp.current_user()["id"]

        playlist = sp.user_playlist_create(
            user=user_id,
            name=playlist_name,
            public=False,
            description=playlist_desc[:300]
        )

        track_uris = [t["uri"] for t in tracks]

        for i in range(0, len(track_uris), 100):
            sp.playlist_add_items(
                playlist["id"],
                track_uris[i:i+100]
            )

        return jsonify({
            "success": True,
            "playlist": {
                "id": playlist["id"],
                "name": playlist_name,
                "url": playlist["external_urls"]["spotify"],
                "tracks": len(track_uris)
            }
        })

    except Exception as e:
        print("Playlist error:", e)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def search_youtube_videos(queries, max_results=4):
    """Search YouTube for videos based on query list"""
    all_videos = []
    
    for query in queries:
        try:
            print(f"Searching YouTube for: {query}")
            
            response = requests.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "q": query,
                    "type": "video",
                    "maxResults": max_results,
                    "key": YOUTUBE_API_KEY,
                    "videoDuration": "medium", # Filters for 4-20 minute videos
                    "order": "relevance"
                },
                timeout=10
            )
            
            response.raise_for_status()
            
            for item in response.json().get("items", []):
                video_data = {
                    "video_id": item["id"]["videoId"],
                    "title": item["snippet"]["title"],
                    "description": item["snippet"]["description"],
                    "thumbnail": item["snippet"]["thumbnails"]["high"]["url"],
                    "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
                    "channel": item["snippet"]["channelTitle"],
                    "published_at": item["snippet"]["publishedAt"],
                    "query_used": query
                }
                all_videos.append(video_data)
                
        except requests.exceptions.HTTPError as e:
            print(f"YouTube API error for query '{query}': {e}")
            if e.response.status_code == 403:
                print("YouTube API quota exceeded or invalid key")
            continue
        except Exception as e:
            print(f" YouTube search error for '{query}': {e}")
            continue
    
    print(f" Found {len(all_videos)} YouTube videos")
    return all_videos


def get_youtube_queries_for_stress(stress_level):
    """Get appropriate YouTube search queries based on stress level"""
    query_map = {
        "critical": [
            "5 minute emergency calm meditation",
            "instant anxiety relief breathing",
            "panic attack calming technique"
        ],
        "severe": [
            "10 minute stress relief meditation",
            "deep calm breathing exercise",
            "guided relaxation for anxiety"
        ],
        "high": [
            "stress relief meditation",
            "calming music for anxiety",
            "guided breathing for stress"
        ],
        "moderate": [
            "focus music for work",
            "relaxing study music",
            "mindfulness meditation"
        ],
        "low": [
            "uplifting music",
            "motivation video",
            "positive affirmations"
        ],
        "minimal": [
            "energizing music",
            "productivity boost meditation",
            "morning motivation"
        ]
    }
    
    return query_map.get(stress_level, ["relaxing music", "meditation"])


def get_ai_youtube_recommendations(stress_analysis, user_mood=None):
    """Use Groq AI to generate personalized YouTube video recommendations"""
    try:
        user_context = {
            "stress_level": stress_analysis.get('stress_level'),
            "stress_score": stress_analysis.get('stress_score'),
            "mood_state": stress_analysis.get('mood_state'),
            "energy_forecast": stress_analysis.get('energy_forecast'),
            "burnout_risk": stress_analysis.get('burnout_risk')
        }
        
        if user_mood:
            user_context["current_mood"] = user_mood

        prompt = f"""You are an expert wellness therapist specializing in video-based therapy.

CURRENT USER STATE:
- Stress Level: {user_context['stress_level']} ({user_context['stress_score']}/10)
- Mood State: {user_context['mood_state']}
- Energy Level: {user_context['energy_forecast']}
- Burnout Risk: {user_context['burnout_risk']}
{f"- User Mood: {user_context.get('current_mood')}" if user_mood else ""}

Recommend YouTube video search queries that will therapeutically help this person RIGHT NOW.

Consider:
1. Their stress level and what type of content will help
2. Video length preference (5-20 minutes ideal)
3. Progression: immediate relief → deeper practice → sustained wellbeing

Return ONLY valid JSON:
{{
  "primary_video_category": "meditation/breathing/music/motivation/exercise/sleep",
  "therapeutic_goal": "what these videos should help achieve",
  "recommended_searches": [
    {{"query": "search query for YouTube", "reason": "why this search", "priority": "high/medium/low"}},
    {{"query": "search query for YouTube", "reason": "why this search", "priority": "high/medium/low"}},
    {{"query": "search query for YouTube", "reason": "why this search", "priority": "high/medium/low"}}
  ],
  "video_duration_preference": "5-10 min / 10-15 min / 15-20 min",
  "viewing_context": "immediate relief / deep practice / background viewing",
  "therapeutic_explanation": "why these videos will help",
  "avoid_content": ["types of videos to avoid"]
}}"""

        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": "You are an expert video therapy specialist. Return ONLY valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 1500,
            "response_format": {"type": "json_object"}
        }

        print("Requesting AI video recommendations from Groq...")
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        
        ai_recommendations = json.loads(response.json()["choices"][0]["message"]["content"])
        print(f" AI video recommendations received: {ai_recommendations.get('primary_video_category')}")
        
        return ai_recommendations

    except Exception as e:
        print(f" AI video recommendation error: {e}")
        # Fallback recommendations
        return {
            "primary_video_category": "meditation",
            "therapeutic_goal": "Immediate stress relief and calm",
            "recommended_searches": [
                {"query": "10 minute guided meditation stress relief", "reason": "Quick calming practice", "priority": "high"},
                {"query": "breathing exercises for anxiety", "reason": "Immediate anxiety relief", "priority": "high"},
                {"query": "calming music for stress", "reason": "Background relaxation", "priority": "medium"}
            ],
            "video_duration_preference": "10-15 min",
            "viewing_context": "immediate relief",
            "therapeutic_explanation": "These videos provide quick, effective stress relief techniques",
            "avoid_content": ["intense workouts", "high-energy content"]
        }


@app.route("/video-therapy")
def video_therapy():
    """
    Get AI-powered YouTube video recommendations for wellness
    
    Query params:
    - mood: Optional user mood (e.g., "anxious", "tired", "stressed")
    - use_ai: Optional boolean to use AI recommendations (default: true)
    
    Returns:
    - AI-powered video recommendations
    - Curated YouTube videos based on stress level
    - Therapeutic explanation
    """
    try:
        print("\n" + "="*70)
        print("VIDEO THERAPY REQUEST")
        
        user_mood = request.args.get('mood')
        use_ai = request.args.get('use_ai', 'true').lower() == 'true'
        
        if user_mood:
            print(f" User mood: {user_mood}")
        
        print(" Analyzing stress and wellness...")
        calendar_events = fetch_calendar_events(7)
        notion_tasks = fetch_notion_tasks()
        stress_analysis = comprehensive_stress_intelligence(calendar_events, notion_tasks)
        
        print(f"   Stress: {stress_analysis['stress_level']} ({stress_analysis['stress_score']}/10)")
        print(f"   Mood: {stress_analysis.get('mood_state')}")
        
        videos = []
        ai_recommendations = None
        
        if use_ai:
            ai_recommendations = get_ai_youtube_recommendations(stress_analysis, user_mood)
            
            print(f" AI Goal: {ai_recommendations.get('therapeutic_goal')}")
            
            search_queries = [
                item['query'] 
                for item in ai_recommendations.get('recommended_searches', [])
            ]
            
            if search_queries:
                videos = search_youtube_videos(search_queries, max_results=3)
        else:
            queries = get_youtube_queries_for_stress(stress_analysis['stress_level'])
            videos = search_youtube_videos(queries, max_results=4)
        
        print(f"Found {len(videos)} therapeutic videos")
        print("="*70 + "\n")
        
        response_data = {
            "success": True,
            "stress_assessment": {
                "level": stress_analysis['stress_level'],
                "score": stress_analysis['stress_score'],
                "mood_state": stress_analysis.get('mood_state'),
                "energy_forecast": stress_analysis.get('energy_forecast'),
                "burnout_risk": stress_analysis.get('burnout_risk')
            },
            "therapeutic_videos": videos,
            "total_videos": len(videos),
            "user_input": {
                "mood": user_mood
            },
            "usage_tip": "Add ?mood=anxious to personalize recommendations"
        }
        
        if use_ai and ai_recommendations:
            response_data["ai_video_intelligence"] = {
                "primary_video_category": ai_recommendations.get('primary_video_category'),
                "therapeutic_goal": ai_recommendations.get('therapeutic_goal'),
                "video_duration_preference": ai_recommendations.get('video_duration_preference'),
                "viewing_context": ai_recommendations.get('viewing_context'),
                "therapeutic_explanation": ai_recommendations.get('therapeutic_explanation'),
                "avoid_content": ai_recommendations.get('avoid_content')
            }
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f" Video therapy error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)