"""Bilingual extraction adapted from the supplied verify_flipped.py.

Unlike the sampling script, the index keeps short valid dialogue cues.
"""
import re
from pathlib import Path

def seconds(value):
    h, m, s = value.strip().split(':')
    return round(int(h) * 3600 + int(m) * 60 + float(s), 2)

def clean(text):
    text = re.sub(r'\{[^}]*\}', '', text)
    return re.sub(r'\s+', ' ', text.replace(r'\N', ' ').replace(r'\n', ' ').replace(r'\h', ' ')).strip()

def parse_ass(path: Path):
    rows, fields, in_events = [], [], False
    for line in path.read_text(encoding='utf-8-sig').splitlines():
        line = line.strip()
        if line.startswith('['):
            in_events = line == '[Events]'
        if not in_events:
            continue
        if line.startswith('Format:'):
            fields = [f.strip().lower() for f in line.split(':', 1)[1].split(',')]
        if not line.startswith('Dialogue:') or not fields:
            continue
        values = line.split(':', 1)[1].lstrip().split(',', len(fields) - 1)
        if len(values) != len(fields):
            continue
        event = dict(zip(fields, values))
        if event.get('style', '').lower().startswith('lyrics'):
            continue
        parts = event.get('text', '').split(r'{\rEng}', 1)
        if len(parts) != 2:
            continue
        zh, en = map(clean, parts)
        if not re.search(r'[\u4e00-\u9fff]', zh) or not re.search(r'[A-Za-z]', en):
            continue
        try:
            start, end = seconds(event['start']), seconds(event['end'])
        except (ValueError, KeyError):
            continue
        if end <= start or start < 0:
            continue
        rows.append(dict(id=len(rows) + 1, start=start, end=end, english=en, chinese=zh, movie='怦然心动 · Flipped', year=2010))
    return sorted(rows, key=lambda row: row['start'])

def search(rows, query):
    query = query.strip().casefold()
    return [r for r in rows if query and (query in r['english'].casefold() or query in r['chinese'].casefold())]
