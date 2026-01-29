import os, time, json, feedparser
import pyttsx3, speech_recognition as sr
from pathlib import Path
from collections import Counter

# Initialize TTS
engine = pyttsx3.init()
def speak(text):
    engine.say(text)
    engine.runAndWait()

# Voice recognition
def get_user_input(prompt="Say a command"):
    r = sr.Recognizer()
    with sr.Microphone() as source:
        speak(prompt)
        audio = r.listen(source, phrase_time_limit=5)
    try:
        return r.recognize_google(audio)
    except:
        return ""

# DLL logging
DLL_FILE = "ai_DLL.json"
def log_dll(entry):
    if os.path.exists(DLL_FILE):
        with open(DLL_FILE, "r") as f:
            dll = json.load(f)
    else:
        dll = []
    dll.append(entry)
    with open(DLL_FILE, "w") as f:
        json.dump(dll, f, indent=2)

# Fetch RSS
def fetch_rss(url):
    feed = feedparser.parse(url)
    items = []
    for entry in feed.entries:
        items.append({
            "title": entry.title,
            "link": entry.link,
            "description": getattr(entry, 'summary', '')
        })
    return items

# Summarize text
def summarize_text(text):
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    summary = " ".join(lines[:3])
    words = [w.lower() for w in text.split() if len(w)>4]
    freq = Counter(words)
    topics = [w for w,_ in freq.most_common(5)]
    return summary, topics

# Scan media & transcripts
MEDIA_EXT = (".mp3", ".m4a", ".wav", ".sw", ".aac", ".flac", ".mp4", ".mov")
TRANSCRIPT_EXT = (".txt", ".srt")

def scan_media(base_folder):
    media = []
    transcripts = []
    for root, _, files in os.walk(base_folder):
        for f in files:
            path = os.path.join(root,f)
            if f.endswith(MEDIA_EXT):
                media.append(path)
            elif f.endswith(TRANSCRIPT_EXT):
                transcripts.append(path)
    return media, transcripts

# Play media (using simple TTS placeholder)
def play_media(file_path):
    speak(f"Playing {os.path.basename(file_path)}")
    time.sleep(5)  # simulate snippet playback

# Summarize transcript file
def process_transcript(file_path):
    with open(file_path,"r",encoding="utf-8") as f:
        text = f.read()
    summary, topics = summarize_text(text)
    speak(f"Transcript: {os.path.basename(file_path)}")
    speak(f"Summary: {summary}")
    if topics: speak(f"Topics: {', '.join(topics)}")
    log_dll({"timestamp": time.time(), "type": "transcript", "file": file_path, "summary": summary, "topics": topics})

# Unified 24/7 Loop
def run_unified_ai(base_media_folder, rss_feeds):
    speak("Pudteeth Unified AI Assistant Online!")
    while True:
        # 1️⃣ Live News
        for feed in rss_feeds:
            speak("Fetching latest news...")
            items = fetch_rss(feed)
            for item in items:
                summary, topics = summarize_text(item['description'] or item['title'])
                speak(f"News: {item['title']}")
                speak(f"Summary: {summary}")
                if topics: speak(f"Topics: {', '.join(topics)}")
                log_dll({"timestamp": time.time(), "type":"news","source":feed,"title":item['title'], "summary":summary,"topics":topics})
                cmd = get_user_input("Command: 'next','skip','stop','repeat'")
                if "stop" in cmd.lower(): break

        # 2️⃣ Local Media Branches
        media, transcripts = scan_media(base_media_folder)
        for m in media:
            play_media(m)
            log_dll({"timestamp": time.time(), "type":"media","file":m})
            cmd = get_user_input("Command: 'next','skip','stop','repeat'")
            if "stop" in cmd.lower(): break
        for t in transcripts:
            process_transcript(t)
            cmd = get_user_input("Command: 'next','skip','stop','repeat'")
            if "stop" in cmd.lower(): break

        speak("Cycle complete. Checking again in 5 minutes...")
        time.sleep(300)  # wait 5 min