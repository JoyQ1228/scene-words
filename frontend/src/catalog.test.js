import test from 'node:test';
import assert from 'node:assert/strict';
import { searchCatalog, mediaUrl } from './catalog.js';

test('static bilingual search preserves paging and ignores English case', () => {
  const rows = [{id:1,english:'Hello, Juli.',chinese:'你好 朱莉'}, {id:2,english:'HELLO.',chinese:'你好'}];
  assert.equal(searchCatalog(rows, 'hello').total, 2);
  assert.equal(searchCatalog(rows, '朱莉').results[0].id, 1);
  assert.equal(searchCatalog(rows, '  ').total, 0);
  assert.equal(searchCatalog(rows, 'hello', 1, 1).results[0].id, 2);
  assert.equal(searchCatalog(rows, 'absent').total, 0);
});

test('media URL supports repository subpaths and external storage', () => {
  assert.equal(mediaUrl('https://cdn.example.com/flipped/', 12, 'mp4'), 'https://cdn.example.com/flipped/12.mp4');
  assert.equal(mediaUrl('./media', 12, 'jpg'), './media/12.jpg');
  assert.throws(() => mediaUrl('', 12, 'mp4'));
});
