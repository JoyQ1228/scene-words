"""Resume-safe export of the authoritative catalog and pre-rendered media."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import shutil
import sys
import time
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.config import ROOT, ASS
from backend.subtitles import parse_ass
from backend.clips import ClipStore

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--catalog-only', action='store_true')
    parser.add_argument('--limit', type=int)
    parser.add_argument('--workers', type=int, default=2)
    args = parser.parse_args()
    rows = parse_ass(ASS)
    public = ROOT / 'frontend/public'
    public.mkdir(parents=True, exist_ok=True)
    (public / 'subtitles.json').write_text(json.dumps(rows, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    if args.catalog_only:
        print(f'Exported {len(rows)} quotes.', flush=True)
        return
    store = ClipStore(rows)
    output = ROOT / 'release/media'
    output.mkdir(parents=True, exist_ok=True)
    selected = rows[:args.limit] if args.limit else rows
    started = time.monotonic()
    failed, completed = [], 0
    def export(row):
        for source in (store.generate(row['id']), store.poster(row['id'])):
            shutil.copyfile(source, output / source.name)
        return row['id']
    with ThreadPoolExecutor(max_workers=max(1, min(args.workers, 2))) as pool:
        jobs = {pool.submit(export, row): row['id'] for row in selected}
        for future in as_completed(jobs):
            try:
                future.result()
                completed += 1
            except Exception as error:
                failed.append({'id': jobs[future], 'error': str(error)})
            if (completed + len(failed)) % 25 == 0 or completed + len(failed) == len(selected):
                progress = {'completed':completed,'failed':failed,'total':len(selected),'seconds':round(time.monotonic()-started,1),'full_catalog':not args.limit}
                (ROOT / 'release/export-status.json').write_text(json.dumps(progress, indent=2), encoding='utf-8')
                print(f'{completed}/{len(selected)} exported; failures {len(failed)}; {progress["seconds"]}s', flush=True)
    if failed:
        raise SystemExit(1)
    print('Export complete. Upload release/media contents to object storage.', flush=True)

if __name__ == '__main__':
    main()
