import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { quoteCount, findQuotes, posterUrl, prepareVideo } from './data.js';

function Icon({ name, size = 20 }) {
  const paths = { search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></>, play: <path d="m9 5 11 7-11 7Z"/>, arrow: <><path d="M5 12h14m-5-5 5 5-5 5"/></>, replay: <><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></>, close: <path d="m6 6 12 12M6 18 18 6"/> };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Highlight({ text, query }) {
  if (!query) return text;
  const lower = text.toLowerCase(), needle = query.toLowerCase(), pieces = [];
  let cursor = 0, found;
  while ((found = lower.indexOf(needle, cursor)) !== -1) {
    pieces.push(text.slice(cursor, found), <mark key={found}>{text.slice(found, found + query.length)}</mark>);
    cursor = found + query.length;
  }
  pieces.push(text.slice(cursor));
  return pieces;
}

const timestamp = n => `${String(Math.floor(n / 3600)).padStart(2, '0')}:${String(Math.floor(n / 60) % 60).padStart(2, '0')}:${String(Math.floor(n % 60)).padStart(2, '0')}`;

function Player({ row, active, onActivate }) {
  const [status, setStatus] = useState('idle'), [url, setUrl] = useState(''), [error, setError] = useState(''), [visible, setVisible] = useState(false);
  const video = useRef(null), stage = useRef(null), request = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '200px' });
    observer.observe(stage.current);
    return () => { observer.disconnect(); request.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!video.current || !url) return;
    if (active === row.id) video.current.play().catch(() => setStatus('paused'));
    else video.current.pause();
  }, [active, url, row.id]);
  async function play() {
    onActivate(row.id);
    if (url && status !== 'error') {
      if (video.current.ended) video.current.currentTime = 0;
      video.current.play().catch(() => setStatus('paused'));
      return;
    }
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setStatus('loading'); setError('');
    try {
      const data = await prepareVideo(row.id, controller.signal);
      setStatus('ready'); setUrl(data.url);
    } catch (e) {
      if (e.name !== 'AbortError') { setStatus('error'); setError(e.message); }
    }
  }
  function replay() {
    if (!video.current || !url) return;
    video.current.currentTime = 0;
    onActivate(row.id);
    video.current.play().catch(() => setStatus('paused'));
  }
  return <div className="player-wrap">
    <div className="player-stage" ref={stage}>
      <video ref={video} src={url || undefined} poster={visible ? posterUrl(row.id) : undefined} controls={!!url} preload="none" playsInline
        onPlay={() => { onActivate(row.id); setStatus('playing'); }} onPause={() => setStatus(current => current === 'error' ? current : 'paused')} onEnded={() => setStatus('ended')}
        onError={() => { setError('视频加载失败，请重新尝试。'); setUrl(''); setStatus('error'); }}/>
      {!url && status !== 'loading' && status !== 'error' && <button className="preview-play" onClick={play} aria-label={`播放片段：${row.english}`}><span className="preview-play-icon"><Icon name="play" size={25}/></span><span className="preview-hint">单击播放</span><span className="preview-duration">{(row.end - row.start).toFixed(2)} 秒</span></button>}
      {status === 'loading' && <div className="player-message" role="status"><span className="spinner"/><strong>正在准备片段…</strong></div>}
      {status === 'error' && <div className="player-message" role="alert"><span>{error}</span><button className="retry" onClick={play}>重新尝试</button></div>}
    </div>
    <div className="player-bottom"><span>{status === 'playing' ? '正在播放 · 原声' : '原声 · 中英双语'}</span><button disabled={!url || status === 'loading' || status === 'error'} onClick={replay}><Icon name="replay" size={14}/>Replay 重播</button></div>
  </div>;
}

function App() {
  const [input, setInput] = useState(''), [query, setQuery] = useState(''), [rows, setRows] = useState([]), [total, setTotal] = useState(0), [count, setCount] = useState(null);
  const [loading, setLoading] = useState(false), [more, setMore] = useState(false), [error, setError] = useState(''), [active, setActive] = useState(null), [searched, setSearched] = useState(false);
  const request = useRef(null), serial = useRef(0), inputRef = useRef(null);
  useEffect(() => { quoteCount().then(setCount).catch(() => {}); return () => request.current?.abort(); }, []);
  async function runSearch(value, append = false) {
    const trimmed = value.trim();
    if (!trimmed) { inputRef.current?.focus(); return; }
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const current = ++serial.current;
    setInput(value); setError('');
    if (append) setMore(true); else { setQuery(trimmed); setLoading(true); setMore(false); setRows([]); setTotal(0); setActive(null); setSearched(true); }
    try {
      const data = await findQuotes(trimmed, append ? rows.length : 0, controller.signal);
      if (current === serial.current) { setRows(old => append ? [...old, ...data.results] : data.results); setTotal(data.total); }
    } catch (e) { if (e.name !== 'AbortError' && current === serial.current) setError(e.message === 'Failed to fetch' ? '连接暂时失败，请检查网络后重试。' : e.message); }
    finally { if (current === serial.current) { setLoading(false); setMore(false); } }
  }
  function reset() { request.current?.abort(); ++serial.current; setInput(''); setQuery(''); setSearched(false); setRows([]); setActive(null); setError(''); setLoading(false); setMore(false); inputRef.current?.focus(); }
  return <div className="app">
    <header><button className="brand" onClick={reset} aria-label="Scene Words 首页"><span className="brand-symbol">s<span>ᴡ</span></span><span>scene<span className="brand-light">words</span><i/></span></button><span className="header-note">A LITTLE ENGLISH. A LITTLE CINEMA.</span></header>
    <main>
      <section className={`hero ${searched ? 'compact' : ''}`}>
        
        <h1>在电影里，<em>遇见英语。</em></h1>
        <p className="intro">那些记住的台词，会慢慢变成你的表达。<br className="mobile-break"/> 搜一句，听一遍，回到那个瞬间。</p>
        <form className="search-box" onSubmit={e => { e.preventDefault(); runSearch(input); }}><Icon name="search" size={24}/><input ref={inputRef} aria-label="搜索中英文台词" placeholder="输入中文或英文，找一句电影台词…" value={input} maxLength={300} onChange={e => setInput(e.target.value)}/>{input && <button className="clear" type="button" aria-label="清空搜索" onClick={reset}><Icon name="close" size={17}/></button>}<button className="search-submit" type="submit" disabled={!input.trim()}>寻找台词 <Icon name="arrow" size={18}/></button></form>
        <div className="suggestions"><span>试着搜</span>{['leave me alone', '喜欢', 'beautiful', '勇敢'].map(word => <button key={word} onClick={() => runSearch(word)}>{word}<span>↗</span></button>)}</div>
      </section>
      {!searched ? <section className="collection"><div className="section-top"><h2>从这一部开始</h2><span>THE FIRST CHAPTER — 01</span></div><div className="film-card"><div className="film-art" aria-label="梧桐树与落日插画"><div className="sun"/><div className="hill back"/><div className="hill front"/><div className="tree"><span className="trunk"/><span className="crown one"/><span className="crown two"/><span className="crown three"/></div><span className="art-caption">FLIPPED</span><span className="art-year">a story about seeing things differently.</span></div><div className="film-info"><span className="film-label">本期电影 / 2010</span><h3>怦然心动 <span>Flipped</span></h3><p>从一棵梧桐树、一双明亮的眼睛开始，<br/>在朱莉和布莱斯的故事里，听懂心动与成长。</p><div className="film-tags"><span>{count ? `${count.toLocaleString()} 句` : '中英'}双语台词</span><span>原声片段</span></div><button className="explore" onClick={() => runSearch('beautiful')}>找一句 beautiful <Icon name="arrow" size={18}/></button></div></div><div className="steps"><span><b>01</b> 搜索一句表达</span><span><b>02</b> 在场景中听懂</span><span><b>03</b> 再听一遍，记住它</span></div></section> : <section className="results" aria-label="台词搜索结果"><div className="section-top"><h2>{loading ? '正在寻找…' : <>关于「{query}」的台词 <span className="result-count">{total}</span></>}</h2><span>怦然心动 · FLIPPED (2010)</span></div><div aria-live="polite">{error && <div className="empty" role="alert"><h3>搜索遇到了一点问题</h3><p>{error}</p><button onClick={() => runSearch(query)}>重新搜索</button></div>}{loading ? <div className="skeleton" role="status">正在电影中寻找这句表达…</div> : !error && rows.length === 0 ? <div className="empty"><span className="empty-icon">“ ”</span><h3>这部电影里，还没有找到这句话</h3><p>试试更短的词，或换一种中英文表达。</p><button onClick={() => runSearch('喜欢')}>试试「喜欢」 <Icon name="arrow" size={16}/></button></div> : null}</div>
        <div className="video-grid">{rows.map((row, i) => <article className={`quote-card ${active === row.id ? 'selected' : ''}`} key={row.id}>
          <Player row={row} active={active} onActivate={setActive}/>
          <div className="quote-details"><div className="quote-meta"><span className="quote-number">{String(i + 1).padStart(2, '0')}</span><span>怦然心动 · Flipped</span><time>{timestamp(row.start)}</time></div>
          <div className="quote-content"><div><p className="en" tabIndex={0} title={row.english} aria-label={row.english}><Highlight text={row.english} query={query}/></p><p className="zh" tabIndex={0} title={row.chinese} aria-label={row.chinese}><Highlight text={row.chinese} query={query}/></p></div></div></div>
        </article>)}</div>
        {!loading && rows.length > 0 && rows.length < total && <button className="load-more" disabled={more} onClick={() => runSearch(query, true)}>{more ? '正在加载…' : `继续发现 · 已展示 ${rows.length} / ${total} 句`}</button>}
        {!loading && rows.length > 0 && rows.length === total && <p className="results-end">这一句的所有瞬间，都在这里了。</p>}
      </section>}
    </main><footer><span>scene words <span className="footer-dot">·</span> 让表达，有画面。</span><span>ONE FILM. A THOUSAND WAYS TO SAY IT.</span></footer>
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
