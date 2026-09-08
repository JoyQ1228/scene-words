export function searchCatalog(rows, query, offset = 0, limit = 30) {
  const needle = query.trim().toLowerCase();
  const matches = needle ? rows.filter(row => row.english.toLowerCase().includes(needle) || row.chinese.toLowerCase().includes(needle)) : [];
  return {query: query.trim(), total: matches.length, results: matches.slice(offset, offset + limit)};
}

export function mediaUrl(base, id, extension) {
  if (!base) throw new Error('视频资源地址尚未配置。');
  return `${base.replace(/\/+$/, '')}/${id}.${extension}`;
}
