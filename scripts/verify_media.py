"""Generate actual clips across the film and record timing/codec evidence."""
import json
import subprocess
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.config import ASS, ROOT, ffmpeg_path
from backend.subtitles import parse_ass
from backend.clips import ClipStore

rows = parse_ass(ASS)
store = ClipStore(rows)
ffmpeg = ffmpeg_path()
ffprobe = str(Path(ffmpeg).with_name('ffprobe.exe'))
out = ROOT / 'data/verification'
out.mkdir(parents=True, exist_ok=True)
report = []
samples = [rows[0], rows[len(rows)//2], rows[-10]]
for row in samples:
    clip = store.generate(row['id'])
    probe = json.loads(subprocess.check_output([ffprobe, '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(clip)]))
    streams = probe['streams']
    assert any(s['codec_name'] == 'h264' for s in streams)
    assert any(s['codec_name'] == 'aac' for s in streams)
    duration = float(probe['format']['duration'])
    expected = round(row['end'] - row['start'], 2)
    assert abs(duration - expected) < .15, (duration, expected)
    frame = out / f"cue-{row['id']}.jpg"
    subprocess.run([ffmpeg, '-v', 'error', '-y', '-ss', str(expected/2), '-i', str(clip), '-frames:v', '1', str(frame)], check=True)
    report.append(dict(**row, actual_duration=duration, expected_duration=expected, codecs=[s['codec_name'] for s in streams], frame=str(frame)))
    print(f"cue {row['id']}: duration {duration}, expected {expected}; h264/aac OK", flush=True)
(out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print('Verified 3 real clips.', flush=True)
