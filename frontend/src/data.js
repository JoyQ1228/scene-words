import { searchCatalog, mediaUrl } from './catalog.js';

const staticMode = import.meta.env.VITE_DATA_MODE === 'static';
const base = import.meta.env.VITE_MEDIA_BASE_URL || './media';
let catalog;
async function loadCatalog() {
  if (!catalog) catalog = fetch(`${import.meta.env.BASE_URL}subtitles.json`).then(async response => {
    if (!response.ok) throw new Error('台词库加载失败，请刷新重试。');
    return response.json();
  }).catch(error => { catalog = undefined; throw error; });
  return catalog;
}
export async function quoteCount() {
  if (staticMode) return (await loadCatalog()).length;
  const response = await fetch('/api/health');
  if (!response.ok) throw new Error('台词库暂时不可用');
  return (await response.json()).quotes;
}
export async function findQuotes(q, offset, signal) {
  if (staticMode) return searchCatalog(await loadCatalog(), q, offset);
  const response = await fetch(`/api/search?${new URLSearchParams({q, offset})}`, {signal});
  if (!response.ok) throw new Error('搜索暂时不可用，请稍后重试。');
  return response.json();
}
export function posterUrl(id) {
  return staticMode ? mediaUrl(base, id, 'jpg') : `/api/clips/${id}/poster`;
}
export async function prepareVideo(id, signal) {
  if (staticMode) return {url: mediaUrl(base, id, 'mp4')};
  const response = await fetch(`/api/clips/${id}`, {method:'POST', signal});
  if (!response.ok) throw new Error((await response.json()).detail || '片段生成失败');
  return response.json();
}
