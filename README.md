# ZenSchedule

**Intelligent AI-powered wellness management system** that analyzes your calendar, tasks, and mood to prevent burnout and optimize daily well-being.

---

## Overview

ZenSchedule connects to **Google Calendar**, **Notion**, and your daily mood reports to detect stress patterns, predict burnout risk, and provide personalized recommendations for breaks, music, and wellness activities.

---

## Key Features

- **Stress Analysis**: Detects back-to-back meetings, long sessions, deadlines, and overdue tasks
- **7-Day Forecasting**: Predicts daily stress levels with reasoning
- **Mood Tracking**: 3 daily check-ins (morning/afternoon/night)
- **Personalized Recommendations**: Optimal breaks, Spotify playlists, YouTube wellness videos
- **AI Coaching**: Context-aware guidance using Groq's Llama 3.3 70B

---

## Architecture
```
Google Calendar + Notion → Flask API → Groq AI → Spotify + YouTube Recommendations
```

**Tech Stack**: Flask (Python 3.8+), Groq API, Google Calendar API, Notion API, Spotify API, YouTube API

---

## Quick Setup

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/zenschedule.git
cd zenschedule
pip install flask requests google-api-python-client google-auth-httplib2 google-auth-oauthlib spotipy
```

### 2. Configure API Keys in `app.py`
```python
NOTION_API_KEY = "ntn_xxxxxxxxxxxxx"
NOTION_DATABASE_ID = "xxxxxxxxxxxxx"
GROQ_API_KEY = "gsk_xxxxxxxxxxxxx"
SPOTIFY_CLIENT_ID = "xxxxxxxxxxxxx"
SPOTIFY_CLIENT_SECRET = "xxxxxxxxxxxxx"
YOUTUBE_API_KEY = "xxxxxxxxxxxxx"
```

### 3. Run
```bash
python app.py
```

Visit `http://localhost:5000`

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/stress-prediction` | GET | 7-day stress forecast |
| `/mood-checkin` | POST | Log mood/energy/stress |
| `/daily-optimization` | GET | Today's optimized plan |
| `/break-schedule` | GET | Optimal break times |
| `/music-therapy` | GET | Spotify playlists |
| `/youtube-wellness` | GET | Wellness videos |

---

## Example Usage
```bash
curl -X POST http://localhost:5000/mood-checkin \
  -H "Content-Type: application/json" \
  -d '{"time_of_day":"morning","mood_score":8,"energy_level":7,"stress_level":3}'

curl http://localhost:5000/stress-prediction
```

---

## Stress Scoring Formula
```python
stress_score = (
    high_stress_events * 2 +
    back_to_back_meetings +
    long_meetings_count +
    overdue_tasks * 3 +
    high_priority_tasks +
    upcoming_deadlines
)
# 0-5: Low | 6-10: Moderate | 11-15: High | 16+: Critical
```

---

## Project Structure
```
zenschedule/
├── app.py
├── requirements.txt
├── token_calendar.json (auto-generated)
└── README.md
```

---

## Contributors

- Ananya I
- Gauri Sudharsini P

**Stay balanced. Stay productive. Stay zen.** 🧘‍♀️
