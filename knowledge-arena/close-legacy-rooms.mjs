// 管理員一次性遷移；預設只預覽。不在瀏覽器執行，不包含憑證。
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';
const databaseURL=process.env.FIREBASE_DATABASE_URL;
if(!databaseURL||!/^https:\/\//.test(databaseURL))throw Error('請設定 FIREBASE_DATABASE_URL');
const apply=process.argv.includes('--apply');
const app=initializeApp({credential:applicationDefault(),databaseURL});
const db=getDatabase(app);try{
 const snapshot=await db.ref('rooms').once('value');
 const candidates=[];snapshot.forEach(room=>{const s=room.child('state').val();if(s&&s.version!==10&&s.stage!=='closed')candidates.push(room.key)});
 console.log(`${apply?'執行':'預覽'}：${candidates.length} 個舊版未關閉房間`,candidates.join(', '));
 if(apply)for(const id of candidates){const tx=await db.ref(`rooms/${id}/state`).transaction(s=>s&&s.version!==10&&s.stage!=='closed'?{...s,stage:'closed',allowLateJoin:false,showJoinQR:false,closedAt:Date.now(),closeReason:'legacy-v10-migration'}:undefined);console.log(id,tx.committed?'已關閉':'略過')}
 else console.log('確認資料庫備份及候選名單後，再以 --apply 執行。');
}finally{await app.delete()}
