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
export async function relatedQuotes(q, signal) {
  const endpoint = import.meta.env.VITE_SEARCH_API_URL;
  if (!endpoint) throw new Error('意思匹配暂未启用');
  const response = await fetch(`${endpoint}/search?${new URLSearchParams({q})}`, {signal});
  if (!response.ok) throw new Error(response.status === 429 ? '搜索较频繁，请稍后再试。' : '意思匹配暂时不可用，仍可查看原文结果。');
  const {matches} = await response.json();
  const all = await loadCatalog();
  const exactIds = new Set(searchCatalog(all, q, 0, all.length).results.map(r => r.id));
  return matches.filter(m => !exactIds.has(m.id)).map(m => {
    const row = all.find(r => r.id === m.id);
    return row ? {...row, reason:m.reason} : null;
  }).filter(Boolean);
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
