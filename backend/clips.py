import hashlib
import logging
import shutil
import subprocess
import threading
from .config import ASS, VIDEO, CACHE, ffmpeg_path

log = logging.getLogger(__name__)

class ClipStore:
    def __init__(self, rows):
        self.rows = {row['id']: row for row in rows}
        # Source changes invalidate all derived clips, including subtitle style changes.
        fingerprint = ASS.read_bytes() + str((VIDEO.stat().st_size, VIDEO.stat().st_mtime_ns)).encode() + b'v1-720p'
        self.folder = CACHE / hashlib.sha256(fingerprint).hexdigest()[:16]
        self.folder.mkdir(parents=True, exist_ok=True)
        # A plain relative name avoids FFmpeg filter escaping of Windows drive letters.
        shutil.copyfile(ASS, self.folder / 'source.ass')
        self.locks = {key: threading.Lock() for key in self.rows}
        self.slots = threading.BoundedSemaphore(2)
        self.poster_slots = threading.BoundedSemaphore(2)

    def poster(self, key):
        target = self.path(key).with_suffix('.jpg')
        with self.locks[key]:
            if target.exists():
                return target
            row = self.rows[key]
            midpoint = (row['start'] + row['end']) / 2
            temp = target.with_suffix('.pending.jpg')
            try:
                with self.poster_slots:
                    subprocess.run([ffmpeg_path(), '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
                        '-ss', f'{midpoint:.3f}', '-i', str(VIDEO), '-map', '0:v:0', '-frames:v', '1',
                        '-vf', 'scale=640:-2,setsar=1', '-q:v', '3', '-threads', '2', str(temp)],
                        capture_output=True, check=True, timeout=60,
                        creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
                temp.replace(target)
            except Exception:
                temp.unlink(missing_ok=True)
                log.exception('Poster generation failed for cue %s', key)
                raise
        return target

    def path(self, key):
        if key not in self.rows:
            raise KeyError(key)
        return self.folder / f'{key}.mp4'

    def generate(self, key):
        target = self.path(key)
        with self.locks[key]:
            if target.exists():
                return target
            row = self.rows[key]
            temp = target.with_suffix('.pending.mp4')
            start, duration = row['start'], row['end'] - row['start']
            filters = f'setpts=PTS-STARTPTS+{start:.2f}/TB,ass=source.ass,setpts=PTS-STARTPTS,scale=1280:-2,setsar=1'
            command = [ffmpeg_path(), '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
                '-ss', f'{start:.2f}', '-i', str(VIDEO), '-t', f'{duration:.2f}',
                '-map', '0:v:0', '-map', '0:a:0', '-sn', '-dn', '-vf', filters,
                '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-threads', '2',
                '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
                '-movflags', '+faststart', str(temp)]
            try:
                with self.slots:
                    subprocess.run(command, cwd=self.folder, capture_output=True, check=True, timeout=180,
                                   creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
                temp.replace(target)
            except Exception:
                temp.unlink(missing_ok=True)
                log.exception('Clip generation failed for cue %s', key)
                raise
        return target
