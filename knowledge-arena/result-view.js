const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function ranked(players,kind){const val=p=>kind==='streak'?Math.max(p.streak||0,p.maxStreak||0):p.score||0;const a=Object.entries(players||{}).filter(([,p])=>kind!=='streak'||val(p)>0).sort((x,y)=>val(y[1])-val(x[1])||x[0].localeCompare(y[0]));return a.map(([id,p])=>({id,p,rank:a.findIndex(([,q])=>val(q)===val(p))+1,value:val(p)}))}
// V15: grouping changes rank scope only; public projections never contain the bottom-list data.
export const groupLabel=group=>group==='staff'?'幹部':'部員';
export const playerGroup=p=>p?.staff===true?'staff':'member';
export const groupPlayers=(players={},group='member')=>Object.fromEntries(Object.entries(players||{}).filter(([,p])=>playerGroup(p)===group));
export const awardScope=(players,grouped=false)=>grouped?groupPlayers(players,'member'):players||{};
export function groupCounts(players={}){const n=Object.values(players||{});return {all:n.length,member:n.filter(p=>p.staff!==true).length,staff:n.filter(p=>p.staff===true).length};}
export function rankedGroups(players,kind='score',grouped=false){return grouped?['member','staff'].flatMap(g=>ranked(groupPlayers(players,g),kind)):ranked(players,kind);}
export function publicRankProjection(players={},grouped=false,final=false){
 const project=(kind,limit)=>Object.fromEntries(rankedGroups(players,kind,grouped).filter(e=>e.rank<=limit).map(({id,p,value})=>[id,{name:p.name,...(grouped?{staff:p.staff===true}:{}),...(kind==='score'?{score:value,...(!final?{correct:p.correct||0}:{})}:{maxStreak:value})}]));
 return {score:project('score',final?5:10),...(final?{streak:project('streak',5)}:{})};
}
export function lastFive(players={}){const rows=ranked(players,'score');if(rows.length<=5)return rows;const threshold=rows[rows.length-5].rank;return rows.filter(e=>e.rank>=threshold);}
export function scoreRows(players={},grouped=false,frontOrder=false){const scores=ranked(players,'score');if(frontOrder)scores.sort((a,b)=>a.rank-b.rank||(b.p.correct||0)-(a.p.correct||0)||a.id.localeCompare(b.id));const streak=ranked(players,'streak'),gs=rankedGroups(players,'score',grouped),gt=rankedGroups(players,'streak',grouped);return scores.map(({id,p,rank})=>({'排名':rank,'暱稱':p.name,'總分':p.score,'答對題數':p.correct,'最長連續答對':Math.max(p.streak||0,p.maxStreak||0),'連答排名':streak.find(x=>x.id===id)?.rank??'',...(grouped?{'身分':groupLabel(playerGroup(p)),'組內排名':gs.find(x=>x.id===id)?.rank??'','組內連答排名':gt.find(x=>x.id===id)?.rank??''}:{})}));}
export function resultGroup(group,counts){return counts?.[group]>0?group:counts?.member>0?'member':counts?.staff>0?'staff':'member';}
function groupTabs(group,counts){const available=['member','staff'].filter(g=>counts[g]>0);if(available.length<2)return available[0]==='staff'?'<h2 class="section-heading center">幹部</h2>':'';return `<div class="final-tabs result-group-tabs" role="group" aria-label="分組排名">${available.map(g=>`<button data-result-group="${g}" aria-pressed="${group===g}">${groupLabel(g)}</button>`).join('')}</div>`;}
function bottomHtml(players,summary){const rows=lastFive(players);return `<div class="panel bottom-rank-panel"><div class="review-heading"><h2>最後五名</h2><span class="muted bottom-private">僅主持人可見</span></div>${rows.map(({p,rank,value})=>{const eligible=Object.entries(summary||{}).filter(([i,h])=>+i>=(p.joinedIndex??0)&&!h.voided&&!h.unsettled).length;return `<div class="line rank rank-v6"><div class="rank-identity"><span class="rank-no">${rank}</span><div class="rank-name">${esc(p.name)}<small class="muted bottom-correct">答對 ${p.correct||0} / ${eligible} 題</small></div></div><b class="rank-score" data-label="總分">${value.toLocaleString()} 分</b></div>`;}).join('')||'<p>尚無符合條件的參加者</p>'}</div>`;}
function podium(kind,players){const entries=ranked(players,kind).filter(e=>e.rank<=3);if(!entries.length)return '<div class="panel center">尚無連續答對紀錄</div>';const groups=new Map();for(const e of entries){if(!groups.has(e.rank))groups.set(e.rank,[]);groups.get(e.rank).push(e)};return `<div class="podium-v6" style="grid-template-columns:${[2,1,3].filter(r=>groups.has(r)).map(r=>`minmax(0,${Math.min(3,groups.get(r).length)}fr)`).join(' ')}"><span class="podium-sparkles" aria-hidden="true">${[[8,13],[20,5],[89,11],[78,20],[4,32],[94,40]].map(([x,y])=>`<i style="left:${x}%;top:${y}%">✦</i>`).join('')}</span>${[2,1,3].map(rank=>{const group=groups.get(rank);return group?`<div class="podium-place place-${rank}${group.length>1?' tied':''}"><div class="podium-person"><span class="podium-medal">${['👑','🥈','🥉'][rank-1]}</span>${group.length>1?`<span class="tie-label">並列第 ${rank} 名（${group.length} 位）</span>`:''}<div class="podium-names">${group.map(e=>`<strong class="podium-name-chip">${esc(e.p.name)}</strong>`).join('')}</div><b>${kind==='streak'?group[0].value+' 題':group[0].value.toLocaleString()+' 分'}</b></div><div class="podium-step">${rank}</div></div>`:''}).join('')}</div>`}
export function statsHtml(stats={},voided=false){
 if(voided)return '<div class="panel">本題已作廢，不列入計分及統計。</div>';
 const n=stats.eligible||0,c=stats.correct||0,w=stats.wrong||0,m=stats.missed||0;
 const cells=[['答對',c,'correct'],['答錯',w,'wrong'],['未作答',m,'missed']];
 return `<div class="panel question-stats"><div class="question-stats-heading"><h3>本題答對率 ${n?Math.round(c/n*100)+'%':'—'}</h3><span>應作答 ${n} 人</span></div><div class="question-stats-grid">${cells.map(([label,count,kind])=>`<div class="question-stats-cell ${kind}"><span>${label}</span><div class="question-stats-value"><strong>${count}</strong><small>人</small></div></div>`).join('')}</div><div class="stats-bar" role="img" aria-label="答對 ${c} 人，答錯 ${w} 人，未作答 ${m} 人"><i style="flex:${c};background:#459b70"></i><i style="flex:${w};background:#da7782"></i><i style="flex:${m};background:#b7bdc8"></i></div></div>`;
}
function analysisHtml(summary){const list=Object.entries(summary).sort((a,b)=>+a[0]-+b[0]);const valid=list.filter(([,h])=>!h.unsettled&&!h.voided&&h.stats?.eligible);const rate=valid.length?Math.round(valid.reduce((a,[,h])=>a+h.stats.correct/h.stats.eligible,0)/valid.length*100):null;return `<div class="panel"><h2>題目分析</h2><p>平均各題答對率：${rate===null?'—':rate+'%'} · ${list.length} 題</p>${list.map(([i,h])=>`<h3>第 ${+i+1} 題｜${esc(h.question)}</h3>${h.unsettled?'<div class="panel">未作答（提前結算） · 不列入統計</div>':statsHtml(h.stats,h.voided)}`).join('')}</div>`}

export function explanation(h,open=false,controlled=false){const img=ArenaRich.imageURL(h.explanationImage);const body=ArenaRich.render(h)+(img?`<img class="pic" src="${esc(img)}" alt="詳細解答圖片">`:'');return controlled?`<section class="panel explain-panel"><button class="explain-toggle" id="toggleExplanation" aria-expanded="${open}">詳細解答 <span>${open?'⌃':'⌄'}</span></button>${open?`<div class="explain-body">${body}</div>`:''}</section>`:`<details class="explain-panel" ${open?'open':''}><summary>詳細解答</summary><div class="explain-body">${body}</div></details>`}
function rankingHtml(players,kind){const ranks=ranked(players,kind);return `<p class="award-message">${kind==='score'?'恭喜本次知識競賽的獲勝者！':'恭喜本次競賽的連答高手！'}</p>${podium(kind,players)}<h2 class="section-heading">${kind==='score'?'總分':'最長連答'}前五名</h2><div class="panel">${ranks.filter(x=>x.rank<=5).map(({p,rank,value})=>`<div class="line rank rank-v6"><div class="rank-identity"><span class="rank-no">${rank}</span><span class="rank-name">${esc(p.name)}</span></div><b class="rank-score" data-label="${kind==='score'?'總分':'最長連答'}">${value.toLocaleString()} ${kind==='score'?'分':'題'}</b></div>`).join('')||'<p>尚無符合條件的參加者</p>'}</div>`;}
export function finalView(players,summary,kind='score',history=null,awards={},host=false,options={}){
 const {grouped=false,group='member',counts=groupCounts(players),canBottom=host}=options;
 if(kind==='bottom'&&!canBottom)kind='score';
 const chosen=resultGroup(group,counts),inGroup=grouped?groupPlayers(players,chosen):players;
 const groupable=['score','streak','bottom'].includes(kind);
 const tabs=[['score','🏆 總分排名'],['streak','🔥 最長連續答對'],['analysis','📊 題目分析'],['awards','🎁 特別獎項'],...(canBottom?[['bottom','最後五名']]:[])];
 const body=kind==='awards'?awardsView(awardScope(players,grouped),awards,host,grouped,grouped?counts.member:counts.all):kind==='analysis'?analysisHtml(summary||{})+(history?Object.entries(history).map(([i,h])=>`<section class="panel"><h3>第 ${+i+1} 題｜${esc(h.question?.question)}</h3>${explanation(h)}</section>`).join(''):''):kind==='bottom'?bottomHtml(inGroup,summary):rankingHtml(inGroup,kind);
 return `<div class="final-tabs" role="group" aria-label="競賽結果分類">${tabs.map(([k,l])=>`<button data-result-tab="${k}" aria-pressed="${kind===k}">${l}</button>`).join('')}</div>${grouped&&groupable?groupTabs(chosen,counts):''}${body}`;
}


// Only call after early finalization (or when an authorized host reads an old final room).
export function fullHistory(history={},bank=[],early=false){
 const result={...history};
 if(early) Object.entries(bank||{}).forEach(([i,q])=>{
  if(result[i]||!q)return;
  const {correct,explanation,explanationImage,explanationRich,...question}=q;
  result[i]={question,unsettled:true,solution:correct||[],explanation:explanation||'',explanationImage:explanationImage||'',explanationRich:ArenaRich.clean(explanationRich||'')};
 });
 return result;
}
export function historySummary(history={}){return Object.fromEntries(Object.entries(history).map(([i,h])=>[i,{question:h.question?.question||'',voided:!!h.voided,...(h.unsettled?{unsettled:true}:{stats:h.stats||{}})}]));}
export function personalArchive(history={},own={}){return Object.fromEntries(Object.entries(history).map(([i,h])=>[i,{...h,...(h.unsettled?{status:'early',points:0,choice:[]}:own[i]||{status:h.voided?'voided':'late',points:0})}]));}
export const reviewLabels={correct:'答對',wrong:'答錯',missed:'未作答',voided:'作廢',late:'未作答',early:'未作答'};
export const isUnanswered=h=>['missed','late','early'].includes(h.status);
export const reviewReason=h=>h.status==='early'?'未作答（競賽提前結算）':h.status==='late'?'未作答（中途加入競賽）':'';
export function analysisRows(history={}){return Object.entries(history).sort((a,b)=>+a[0]-+b[0]).map(([i,h])=>({題號:+i+1,題目:h.question?.question||'',狀態:h.unsettled?'未作答（提前結算）':h.voided?'作廢':'已結算',作廢:h.voided?'是':'否',答對:h.unsettled?'':h.stats?.correct||0,答錯:h.unsettled?'':h.stats?.wrong||0,未答:h.unsettled?'':h.stats?.missed||0,應答:h.unsettled?'':h.stats?.eligible||0,答對率:h.unsettled||h.voided?'不列入統計':h.stats?.eligible?Math.round(h.stats.correct/h.stats.eligible*100)+'%':'—'}));}
export function personalRows(history={},players={},reviews={},grouped=false){return Object.entries(players).flatMap(([id,p])=>Object.entries(personalArchive(history,reviews[id]||{})).sort((a,b)=>+a[0]-+b[0]).map(([i,h])=>({暱稱:p.name,...(grouped?{身分:groupLabel(playerGroup(p))}:{}),題號:+i+1,題目:h.question?.question||'',狀態:reviewReason(h)||reviewLabels[h.status]||'',本題得分:h.unsettled?'不列入計分':h.points||0})));}

// Award records do not change competition scores. Only completed award decisions enter public state.
// Expand each tie group into its original occupied slots BEFORE filtering winners.
export function awardCandidates(players={},awards={}){
 const excluded=new Set(Object.values(awards||{}).map(a=>a.id).filter(Boolean));
 const usedSlots=new Set(['mystery1','mystery2'].map(key=>awards?.[key]?.luckyRank??awards?.[key]?.rank));
 const all=ranked(players,'score'),sizes=new Map();
 for(const e of all)sizes.set(e.rank,(sizes.get(e.rank)||0)+1);
 return all.filter(e=>e.rank>3&&!excluded.has(e.id)).flatMap(e=>Array.from({length:sizes.get(e.rank)},(_,i)=>({...e,luckyRank:e.rank+i})).filter(e=>!usedSlots.has(e.luckyRank)));
}
export function luckyRankOptions(players={},awards={}){
 const groups=new Map();
 for(const e of awardCandidates(players,awards)){
  const group=groups.get(e.luckyRank)||{slot:e.luckyRank,rank:e.rank,count:0};
  group.count++;groups.set(e.luckyRank,group);
 }
 return [...groups.values()].sort((a,b)=>a.slot-b.slot);
}
export function awardReady(key,awards={}){
 return !awards[key]&&(key==='comeback'||(key==='mystery1'&&!!awards.comeback)||(key==='mystery2'&&!!awards.comeback&&!!awards.mystery1));
}
export function comebackCandidates(r){
 const indices=Object.keys(r.history||{}).filter(i=>r.history[i]&&!r.history[i].voided&&!r.history[i].unsettled).sort((a,b)=>+a-+b);
 if(indices.length<2)return [];
 const scoped=awardScope(r.players,r.state?.grouped===true);
 const cohort=Object.entries(scoped).filter(([id,p])=>p.joinedIndex===0);
 if(cohort.length<2||cohort.some(([id])=>indices.some(i=>!r.reviews?.[id]?.[i]||!Number.isFinite(r.reviews[id][i].points)||!['correct','wrong','missed'].includes(r.reviews[id][i].status))))return [];
 const mid=indices.slice(0,Math.floor(indices.length/2)),late=indices.slice(mid.length);
 const stats=(id,items)=>({count:items.length,correct:items.filter(i=>r.reviews[id][i].status==='correct').length,points:items.reduce((sum,i)=>sum+r.reviews[id][i].points,0)});
 const halves=Object.fromEntries(cohort.map(([id])=>[id,{first:stats(id,mid),second:stats(id,late)}]));
 if(cohort.some(([id,p])=>halves[id].first.points+halves[id].second.points!==(p.score||0)))return [];
 const scores=Object.fromEntries(cohort.map(([id,p])=>[id,{...p,score:halves[id].first.points}]));
 const start=ranked(scores,'score'),end=ranked(Object.fromEntries(cohort),'score'),overall=ranked(scoped,'score');
 const excluded=new Set(overall.filter(x=>x.rank<=3).map(x=>x.id).concat(Object.values(r.state.awards||{}).map(a=>a.id).filter(Boolean)));
 return end.map(e=>({...e,midRank:start.find(x=>x.id===e.id).rank,gain:start.find(x=>x.id===e.id).rank-e.rank,overallRank:overall.find(x=>x.id===e.id).rank,...halves[e.id]})).filter(e=>e.gain>0&&!excluded.has(e.id)).sort((a,b)=>b.gain-a.gain||b.value-a.value||a.id.localeCompare(b.id));
}
export function awardRecord(r,key,rank,seed){
 const awards=r.state.awards||{};
 if(!awardReady(key,awards))return null;
 const list=key==='comeback'?comebackCandidates(r):awardCandidates(awardScope(r.players,r.state.grouped===true),awards).filter(e=>e.luckyRank===rank);
 if(!list.length)return null;
 const pool=key==='comeback'?list.filter(e=>e.gain===list[0].gain&&e.value===list[0].value):list;
 const winner=pool[Math.floor(seed*pool.length)];
 return {id:winner.id,name:winner.p.name,rank:winner.rank,...(r.state.grouped===true?{group:'member'}:{}),...(key==='comeback'?{midRank:winner.midRank,gain:winner.gain,overallRank:winner.overallRank,first:winner.first,second:winner.second,total:winner.value}:{luckyRank:winner.luckyRank})};
}
function comebackDetails(a){
 const metric=(label,value)=>`<div class="award-metric"><span>${label}</span><strong>${value}</strong></div>`;
 const half=(label,h)=>`<div class="award-half"><h3>${label}</h3><span>有效題 ${h.count} 題</span><strong>${h.correct} / ${h.count}</strong><span>答對題數</span><b>${h.points.toLocaleString()} 分</b></div>`;
 return `<div class="award-metrics">${metric('上半場排名',a.midRank+' 名')}${metric('最終排名',a.rank+' 名')}${metric('進步名次','↑ '+a.gain+' 名')}</div><p class="muted award-rank-note">排名以首題參與者的同一組人員比較${Number.isInteger(a.overallRank)?' · '+(a.group==='member'?'部員':'全體')+'總分第 '+a.overallRank+' 名':''}</p>${a.first&&a.second&&Number.isFinite(a.total)?`<div class="award-halves">${half('上半場',a.first)}${half('下半場',a.second)}</div><p class="award-total">最終總分 <strong>${a.total.toLocaleString()} 分</strong></p>`:'<p class="muted">舊版獎項未保留上下半場成績。</p>'}`;
}
function awardsView(players,awards,host,grouped=false,count=Object.keys(players||{}).length){
 const ranks=luckyRankOptions(players,awards);
 const card=(key,title,emoji)=>{
 const a=awards?.[key],ready=awardReady(key,awards),comeback=key==='comeback';
 const waiting=!awards.comeback?'請先公布逆襲之星，或確認不頒發。':'請先公布超級幸運星 ①。';
 return `<section class="panel award-card center${comeback?' award-comeback':''}"><div class="award-icon">${emoji}</div><h2>${title}</h2>${a?a.skipped?'<p class="muted">本次不頒發</p>':`<strong class="podium-name-chip">${esc(a.name)}</strong>${comeback?comebackDetails(a):`<p>幸運名次：第 ${a.luckyRank??a.rank} 名</p><p class="muted">實際排名：第 ${a.rank} 名</p>`}<p class="award-congrats">恭喜獲獎！</p>`:`<p class="muted">得獎者尚未揭曉</p>${host?(comeback?'<button id="award-comeback">公布得獎者</button>':`<label>選擇幸運名次<select id="rank-${key}" ${ready&&ranks.length?'':'disabled'}><option value="">請選擇名次</option>${ranks.map(n=>`<option value="${n.slot}" data-rank="${n.rank}" data-count="${n.count}">第 ${n.slot} 名${n.slot!==n.rank?`（並列第 ${n.rank} 名）`:""}</option>`).join('')}</select></label><p id="hint-${key}" class="muted" aria-live="polite" hidden></p><button id="award-${key}" disabled>公布得獎者</button>${!ready?`<p class="muted">${waiting}</p>`:!ranks.length?'<p class="muted">沒有符合資格的名次。</p>':''}`):''}`}</section>`;
 };
 return `<p class="muted center">${grouped?'特別獎項僅限部員 · 部員共':'本次競賽共有'} ${count} 位參賽者</p><div class="award-grid">${card('comeback','逆襲之星','🌟')}${card('mystery1','超級幸運星 ①','🍀')}${card('mystery2','超級幸運星 ②','🍀')}</div>${host?'<p class="muted">前三名（含並列）及已獲特別獎者不重複領獎。幸運名次涵蓋並列順位，從符合資格者中抽出一人；逆襲之星比較首題參與者在有效題目前半場與最終的排名。</p>':''}`;
}
export function awardRows(awards={},grouped=false){return ['comeback','mystery1','mystery2'].filter(key=>awards[key]).map(key=>{const a=awards[key];return {獎項:key==='comeback'?'逆襲之星':key==='mystery1'?'超級幸運星 1':'超級幸運星 2',狀態:a.skipped?'不頒發':'已公布',暱稱:a.name??'',...(grouped?{身分:a.skipped?'':'部員'}:{}),名次:a.rank??'',幸運名次:key==='comeback'?'':a.luckyRank??a.rank??'',實際排名:key==='comeback'?a.overallRank??'':a.rank??'',前半場名次:a.midRank??'',進步名次:a.gain??'',[grouped?'部員總分名次':'全體總分名次']:a.overallRank??'',上半場有效題數:a.first?.count??'',上半場答對題數:a.first?.correct??'',上半場得分:a.first?.points??'',下半場有效題數:a.second?.count??'',下半場答對題數:a.second?.correct??'',下半場得分:a.second?.points??'',最終總分:a.total??''}});}

// Keep the selected result tab visible after a rerender without moving the page vertically.
export function scrollActiveResultTab(root){
 const tabs=root.querySelector('.final-tabs'),active=tabs?.querySelector('[aria-pressed="true"]');
 if(!active)return;
 const outer=tabs.getBoundingClientRect(),inner=active.getBoundingClientRect();
 if(inner.right>outer.right)tabs.scrollLeft+=inner.right-outer.right;
 else if(inner.left<outer.left)tabs.scrollLeft-=outer.left-inner.left;
}
