from pathlib import Path
import pytest
from backend.subtitles import parse_ass, search

SOURCE = Path(r'D:\桌面\怦然心动\flipped.ass')

def test_real_source():
    rows = parse_ass(SOURCE)
    assert len(rows) > 1000
    assert rows[0]['start'] == 49.24
    assert rows[0]['end'] == 52.47
    assert rows[0]['english'] == 'All I ever wanted was for Juli Baker to leave me alone.'
    assert search(rows, 'LEAVE ME ALONE') == search(rows, 'leave me alone')
    assert search(rows, '朱莉')
    assert search(rows, 'summer of 1957,')
    assert not search(rows, '不存在的台词abcdef')
    assert not search(rows, '  ')
    assert all('{' not in r['english'] and '\\N' not in r['chinese'] for r in rows)

def test_short_quote_and_comma(tmp_path):
    source = tmp_path / 'test.ass'
    source.write_text('[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'
      'Dialogue: 0,0:00:01.00,0:00:01.20,Chs,,0,0,0,,你好\\N{\\rEng}{\\i1}Hi, there!\n'
      'Dialogue: 0,0:00:02.00,0:00:01.00,Chs,,0,0,0,,你好\\N{\\rEng}Hi\n', encoding='utf-8')
    rows = parse_ass(source)
    assert len(rows) == 1
    assert rows[0]['english'] == 'Hi, there!'
    assert rows[0]['end'] - rows[0]['start'] == pytest.approx(.2)

def test_api():
    from fastapi.testclient import TestClient
    from backend.app import app
    with TestClient(app) as client:
        for q in ['朱莉', 'leave me alone', 'SUMMER']:
            result = client.get('/api/search', params={'q': q}).json()
            assert result['total'] > 0
            assert len(result['results']) <= 30
        assert client.get('/api/search?q=').json()['total'] == 0
        assert client.get('/api/search?q=abcxyznotfound').json()['results'] == []
        assert client.get('/api/search?q=a&offset=-1').status_code == 422
        assert client.post('/api/clips/999999').status_code == 404
        assert client.get('/api/clips/999999/video').status_code == 404

def test_video_preview():
    from fastapi.testclient import TestClient
    from backend.app import app
    with TestClient(app) as client:
        response = client.get('/api/clips/1/poster')
        assert response.status_code == 200
        assert response.headers['content-type'] == 'image/jpeg'
        assert response.content.startswith(b'\xff\xd8')
        assert client.get('/api/clips/1/poster').content == response.content
        assert client.get('/api/clips/999999/poster').status_code == 404
