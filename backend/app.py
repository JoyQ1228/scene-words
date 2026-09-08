import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from .config import ROOT, ASS
from .subtitles import parse_ass, search
from .clips import ClipStore

@asynccontextmanager
async def lifespan(app):
    app.state.rows = parse_ass(ASS)
    if not app.state.rows:
        raise RuntimeError('flipped.ass 没有有效双语台词。')
    data = ROOT / 'data'
    data.mkdir(exist_ok=True)
    (data / 'subtitles.json').write_text(json.dumps(app.state.rows, ensure_ascii=False, indent=2), encoding='utf-8')
    app.state.clips = ClipStore(app.state.rows)
    yield

app = FastAPI(title='Scene Words', lifespan=lifespan)

@app.get('/api/health')
def health():
    return {'status': 'ok', 'quotes': len(app.state.rows)}

@app.get('/api/search')
def quotes(q: str = Query('', max_length=300), offset: int = Query(0, ge=0), limit: int = Query(30, ge=1, le=100)):
    rows = search(app.state.rows, q)
    return {'query': q.strip(), 'total': len(rows), 'results': rows[offset:offset + limit]}

@app.post('/api/clips/{key}')
def prepare(key: int):
    try:
        app.state.clips.generate(key)
    except KeyError:
        raise HTTPException(404, '台词不存在')
    except Exception:
        raise HTTPException(503, '片段暂时生成失败，请重试；若仍失败请查看服务日志和 FFmpeg 配置。')
    return {'url': f'/api/clips/{key}/video'}

@app.get('/api/clips/{key}/video')
def video(key: int):
    try:
        path = app.state.clips.path(key)
    except KeyError:
        raise HTTPException(404, '台词不存在')
    if not path.exists():
        raise HTTPException(404, '片段尚未生成')
    return FileResponse(path, media_type='video/mp4')

@app.get('/api/clips/{key}/poster')
def poster(key: int):
    try:
        path = app.state.clips.poster(key)
    except KeyError:
        raise HTTPException(404, '台词不存在')
    except Exception:
        raise HTTPException(503, '预览画面暂时不可用')
    return FileResponse(path, media_type='image/jpeg')

dist = ROOT / 'frontend/dist'
if dist.exists():
    app.mount('/', StaticFiles(directory=dist, html=True), name='frontend')
