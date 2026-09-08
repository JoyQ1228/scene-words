import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEDIA = Path(os.environ.get('SCENE_WORDS_MEDIA', str(ROOT.parent)))
if not (MEDIA / 'flipped.ass').exists() and 'SCENE_WORDS_MEDIA' not in os.environ:
    MEDIA = Path(r'D:\桌面\怦然心动')
ASS = MEDIA / 'flipped.ass'
VIDEO = MEDIA / '怦然心动.Flipped.2010.Bluray.1080p.mkv'
CACHE = ROOT / 'data' / 'clips'

def ffmpeg_path():
    explicit = os.environ.get('FFMPEG_PATH')
    if explicit:
        return explicit
    found = shutil.which('ffmpeg')
    if found:
        return found
    winget = Path(os.environ.get('LOCALAPPDATA', '')) / 'Microsoft/WinGet/Packages'
    for candidate in winget.glob('Gyan.FFmpeg*/ffmpeg-*/bin/ffmpeg.exe'):
        return str(candidate)
    raise RuntimeError('未找到 FFmpeg，请设置 FFMPEG_PATH 为 ffmpeg.exe 的完整路径。')
