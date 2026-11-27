import {mountEditor,validate} from './editor.js?v=13.2';
import {firebaseConfig} from './config.js';
import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithPopup,GoogleAuthProvider,signOut} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getDatabase,ref,get,runTransaction,onValue,remove,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
const demo=[{type:'單選題',question:'下列何者不屬於六波羅蜜？',options:['布施','持戒','祈願','精進'],correct:[2],seconds:30,explanation:'六波羅蜜為布施、持戒、忍辱、精進、禪定、般若。'},{type:'是非題',question:'六波羅蜜包含禪定。',options:['是','非'],correct:[0],seconds:15,explanation:'禪定是六波羅蜜之一。'},{type:'排序題',question:'請將數字由小到大排列。',options:['3','1','4','2'],correct:[1,3,0,2],seconds:30,explanation:'正確順序是 1、2、3、4。'},{type:'圖片辨識題',question:'圖片中的形狀為何？',options:['圓形','三角形','正方形','星形'],correct:[1],seconds:20,image:'triangle.svg',explanation:'圖片是三角形。'}];
function importBank(rows){return rows.map((r,i)=>{let type=String(r['題型']||'單選題').trim(),question=String(r['題目']||'').trim(),options=type==='是非題'?['是','非']:['A','B','C','D'].map(k=>String(r['選項'+k]??'').trim()).filter(Boolean),correct=String(r['正確答案']||'').toUpperCase().split(/[,，、\s]+/).filter(Boolean).map(x=>'ABCD'.indexOf(x)),seconds=Number(r['秒數']||30);if(!['單選題','是非題','排序題','圖片辨識題'].includes(type)||!question||options.length<2||correct.some(x=>x<0||x>=options.length)||correct.length!==(type==='排序題'?options.length:1)||new Set(correct).size!==correct.length||!Number.isInteger(seconds)||seconds<5||seconds>180)throw Error(`Excel 第 ${i+2} 列格式錯誤`);return {type,question,options,correct,seconds,image:String(r['圖片網址']||''),explanation:String(r['答案解說']||''),explanationImage:String(r['解答圖片網址']||''),explanationRich:ArenaRich.clean(r['格式化解答']||'')}})}
function template(){const rows=demo.map(q=>({'題型':q.type,'題目':q.question,'選項A':q.options[0],'選項B':q.options[1],'選項C':q.options[2]||'','選項D':q.options[3]||'','正確答案':q.correct.map(x=>'ABCD'[x]).join(','),'秒數':q.seconds,'圖片網址':q.image||'','答案解說':q.explanation,'解答圖片網址':q.explanationImage||'','格式化解答':q.explanationRich||''}));exportX(rows,'題庫範本.xlsx')}
function exportX(rows,name){if(!window.XLSX)throw Error('Excel 元件尚未載入，請確認網路後重新整理。');const w=XLSX.utils.book_new();XLSX.utils.book_append_sheet(w,XLSX.utils.json_to_sheet(rows),'資料');XLSX.writeFile(w,name)}


const f=getApps().length?getApp():initializeApp(firebaseConfig),auth=getAuth(f),db=getDatabase(f),gate=document.querySelector('#adminGate'),nav=document.querySelector('#adminNav'),root=document.querySelector('#app');
// The first transaction callback can receive null despite a remote record existing.
// A null -> null compare-and-set is a no-op on a missing record and retries on a stale cache.
// Never treat that callback alone as evidence of another device editing the bank.
function bankError(e){
 const code=String(e?.code||'').toLowerCase(),msg=String(e?.message||e);
 if(/permission[_ -]?denied|permission denied/.test(code+' '+msg.toLowerCase()))return Error('Firebase 拒絕此操作，請確認登入帳號及資料庫權限。');
 if(/network|disconnect|unavailable|offline|timeout/i.test(code+' '+msg))return Error('網路連線異常，未能確認雲端操作結果。請保留編輯內容，待連線恢復後重試。');
 return e instanceof Error?e:Error(msg);
}
async function bankTransaction(r,expected,existing,operation){
 // Keep an active listener while comparing and writing, rather than relying on get() to seed transaction cache.
 let stop=()=>{},timer;
 try{
  const initial=await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('網路連線逾時，無法讀取題庫。')),15000);stop=onValue(r,s=>resolve(s),reject)});
  clearTimeout(timer);
  const before=(await get(r)).val();
  if(existing&&!before)throw Error('此題庫已不存在，可能已被刪除。請先備份編輯內容，再重新載入題庫。');
  if(existing&&before.revision!==expected)throw Error('題庫已在其他裝置修改。請先備份目前編輯內容，再重新載入題庫。');
  if(!existing&&before)throw Error('題庫識別碼已存在，請重新儲存。');
  let decision='unknown';
  const tx=await runTransaction(r,old=>{
   if(existing&&!old){decision='missing';return null;}
   if(existing&&old.revision!==expected){decision='conflict';return;}
   if(!existing&&old){decision='collision';return;}
   decision='write';return operation(old);
  },{applyLocally:false});
  if(!tx.committed||decision!=='write'){
   const current=(await get(r)).val();
   if(existing&&!current)throw Error('此題庫已不存在，可能已被刪除。請先備份編輯內容，再重新載入題庫。');
   if(existing&&current.revision!==expected)throw Error('題庫已在其他裝置修改。請先備份目前編輯內容，再重新載入題庫。');
   if(!existing&&current)throw Error('題庫識別碼已存在，請重新儲存。');
   throw Error('雲端資料暫時無法確認，請保留編輯內容並重新操作。');
  }
  return tx;
 }catch(e){throw bankError(e)}finally{clearTimeout(timer);stop()}
}
let generation=0;window.arenaEditor=null;
const warn=e=>ArenaUI.alert(e.message||e);const guarded=async fn=>{if(!window.arenaEditor||await window.arenaEditor.leave())return fn()};
window.addEventListener('beforeunload',e=>{if(window.arenaEditor?.dirty()){e.preventDefault();e.returnValue=''}});
nav.querySelector('a').addEventListener('click',e=>{e.preventDefault();guarded(()=>{location.href='index.html'}).catch(warn)});
onAuthStateChanged(auth,async u=>{const g=++generation;window.arenaEditor=null;root.hidden=true;root.replaceChildren();nav.hidden=true;document.querySelector('#historyPanel').hidden=true;gate.hidden=false;gate.replaceChildren();if(!u||u.isAnonymous){const b=document.createElement('button');b.textContent='Google 主持人登入';b.onclick=()=>signInWithPopup(auth,new GoogleAuthProvider()).catch(warn);gate.append(b);return}try{gate.textContent='載入雲端題庫…';const base=ref(db,'banks/'+u.uid),data=(await get(base)).val()||{};if(g!==generation)return;const cloud={banks:Object.create(null),meta:Object.create(null),ids:Object.create(null),async save(n,questions,original=''){if(auth.currentUser?.uid!==u.uid)throw Error('登入已失效');if(!questions.length||questions.length>100)throw Error('題庫須有 1～100 題');if(new TextEncoder().encode(JSON.stringify(questions)).length>2500000)throw Error('題庫超過 2.5 MB');questions.forEach(validate);if(n!==original&&Object.hasOwn(cloud.banks,n))throw Error('已存在同名題庫');const id=original?cloud.ids[original]:crypto.randomUUID();if(!id)throw Error('找不到原題庫');const r=ref(db,'banks/'+u.uid+'/'+id),expected=original?cloud.meta[original]?.revision:undefined;const tx=await bankTransaction(r,expected,!!original,old=>({name:n,questions:structuredClone(questions),createdAt:old?.createdAt??serverTimestamp(),createdUid:u.uid,createdEmail:old?.createdEmail??u.email,modifiedAt:serverTimestamp(),modifiedUid:u.uid,modifiedEmail:u.email,revision:(old?.revision||0)+1}));if(original&&original!==n){delete cloud.banks[original];delete cloud.meta[original];delete cloud.ids[original]}cloud.banks[n]=structuredClone(questions);cloud.meta[n]=tx.snapshot.val();cloud.ids[n]=id;},async remove(n){if(auth.currentUser?.uid!==u.uid)throw Error('登入已失效');const r=ref(db,'banks/'+u.uid+'/'+cloud.ids[n]),expected=cloud.meta[n]?.revision;await bankTransaction(r,expected,true,()=>null);delete cloud.banks[n];delete cloud.meta[n];delete cloud.ids[n]}};for(const [id,b] of Object.entries(data)){if(b.name&&Array.isArray(b.questions)){cloud.banks[b.name]=b.questions;cloud.meta[b.name]=b;cloud.ids[b.name]=id}}gate.replaceChildren();const info=document.createElement('span');info.className='admin-identity';info.textContent='主持人：'+u.email;const logout=document.createElement('button');logout.className='text-action';logout.textContent='登出';logout.onclick=()=>guarded(()=>signOut(auth)).catch(warn);const migrate=document.createElement('button');migrate.textContent='匯入舊版瀏覽器題庫';migrate.onclick=()=>guarded(async()=>{const local=JSON.parse(localStorage.getItem('arena-banks-v3')||'{}');const entries=Object.entries(local).filter(([n,q])=>!Object.hasOwn(cloud.banks,n)&&Array.isArray(q)&&q.length);if(!entries.length)return ArenaUI.alert('無可匯入的新題庫（同名雲端題庫不覆蓋）。');if(!await ArenaUI.confirm('將 '+entries.length+' 個本機題庫匯入目前 Google 帳號？'))return;for(const [n,q] of entries)await cloud.save(n,q);window.arenaEditor?.refresh();await ArenaUI.alert('匯入完成。原本機資料保留。')}).catch(warn);const actions=document.createElement('div');actions.className='tools admin-gate-actions';actions.append(migrate,logout);gate.append(info,actions);nav.hidden=false;root.hidden=false;window.arenaEditor=mountEditor(root,{demo,importBank,exportX,template,cloud});}catch(e){gate.textContent='題庫載入失敗：'+e.message}});
