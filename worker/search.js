export function candidates(rows, terms) {
 const words=[...new Set((Array.isArray(terms)?terms:[]).filter(t=>typeof t==='string' && t.trim().length>=2 && t.length<=60).map(t=>t.trim().toLowerCase()))].slice(0,24);
 return rows.map(row=>({row,score:words.reduce((s,w)=>s+(row.english.toLowerCase().includes(w)||row.chinese.includes(w)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,60).map(x=>x.row);
}
export function validateMatches(matches, rows) {
 const ids=new Set(rows.map(r=>r.id)), seen=new Set();
 return (Array.isArray(matches)?matches:[]).filter(m=>{
  if(!m || !ids.has(m.id)||seen.has(m.id)||typeof m.score!=='number'||m.score<.78||m.score>1||typeof m.reason!=='string'||!m.reason.trim())return false;
  seen.add(m.id); return true;
 }).slice(0,8).map(m=>({id:m.id,reason:m.reason.slice(0,70)}));
}
