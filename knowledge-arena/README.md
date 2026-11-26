# 知識競技場｜GitHub Pages 版

## 第一次架設（免費 Spark 方案）
1. 到 https://console.firebase.google.com/ 建立專案，不需啟用 Analytics。
2. 專案總覽新增 Web 應用程式（</>），取得 firebaseConfig，填入 config.js。不要放入服務帳戶私鑰。
3. Authentication → Sign-in method → Anonymous（匿名）→ 啟用。
4. Realtime Database → Create Database，選擇適合地區（如新加坡，若有提供），以鎖定模式建立。把資料庫 URL 填入 config.js 的 databaseURL（Console 的 Data 頁可見）。Rules 頁貼上 database.rules.json 全文並發布。
5. GitHub 新建 public repository，將本資料夾所有檔案上傳至 main 分支根目錄。Settings → Pages → Deploy from a branch → main / (root) → Save。
6. 在 Firebase Authentication → Settings → Authorized domains 加入你的 `帳號.github.io`（不含 https、repo 路徑）。
7. 開啟 GitHub Pages 網址，確認右上角已連線。

## 活動操作
- 主持人：首頁「建立新競賽」，下載 Excel 範本、修改後匯入（或先用四題示範），建立房間；開啟獨立投影畫面，分享 QR Code。
- 參加者：掃 QR Code、輸入暱稱，加入後等待。手機與主持人可使用不同網路。排序題依序點選、按提交；其他題型點選即提交。
- 主持人：開始、等待倒數結束自動公布答案，亦可提前結束；解說完手動顯示排行榜、下一題，最後公布前三名及匯出 Excel。
- 音效：投影頁按右上角音效開啟，使用原創簡單合成音序列，不需額外音樂檔案。瀏覽器限制需手動點擊。
- 重連：同裝置、同瀏覽器、同一網站資料未清除時，重新開啟原網址即可恢復原匿名身分。換裝置或無痕模式不會恢復。主持人也須保留原瀏覽器。

## Excel 題庫
第一個工作表欄位：題型、題目、選項A、選項B、選項C、選項D、正確答案、秒數、圖片網址、答案解說。
- 單選／圖片：A～D 之一；是非：A=是，B=非；排序：例如 B,D,A,C。選項連續填寫，不要跳欄。秒數 5～180。最多 100 題。
- 圖片可上傳至同一 GitHub repo，圖片網址填入相對路徑（例如 images/01.jpg）或公開 HTTPS 網址。不支援 Excel 內嵌圖片。請避免公開個資或未授權圖片。
- 計分：答對 500 + 速度最多 500 + 連續答對加分（每多一題 100、上限 400）；答錯或逾時歸零連答。相同分數以答對題數、匿名 ID 排序（無同名次）。

## 注意事項與驗收
- 本版尚未在你的 Firebase 專案或 50 支手機實測；需正式活動前測試。建議兩台裝置、再 10 人、最後 50 人測試加入、逾時、排序、重連、排行榜、匯出。
- Firebase 免費方案同時連線上限 100。房間前端限制 50 人（同時加入時可能短暫超過），不等於已完成壓力測試。
- 主持人瀏覽器負責結算，活動中不要關閉；中斷時重開同瀏覽器主持人網址，若停在結算畫面可按繼續結算。請只開一個主持人控制頁。
- 匿名使用者可讀取已知房號的公開狀態、暱稱及分數；答案在公布前由主持人私有題庫保護。非高風險考試或防作弊系統，不要輸入敏感個資。房間資料可於活動後在 Firebase Data 頁刪除。
- CDN 載入 Firebase SDK、SheetJS、QRCode.js，需網路。正式活動前請測試網路及圖片。
- 規則及 JavaScript 已進行靜態檢查，未經 Firebase Rules 模擬器或實際雲端驗證。此版不是已部署公開網站。

## V3 網頁題庫管理
主持人入口即為題庫管理。新增、編輯、複製、刪除、拖曳或箭頭排序、預覽答題、Excel 匯入匯出、命名儲存多份題庫。題庫存於同網址同瀏覽器的 localStorage，不會跨裝置同步；請用 JSON 備份（含圖片）或 Excel 備份（圖片網址適用）。上傳圖片轉為 JPEG 並縮小至最長邊 1000px，單張壓縮後限制約 400KB；含大型圖片的 Excel 匯出會拒絕並提示 JSON 備份，避免 Excel 截斷。題庫與答案在開房後才寫入 Firebase 私有題庫。請避免大量內嵌圖片耗用資料庫流量及瀏覽器儲存空間。editor-preview.html 可透過 GitHub Pages 或本機 HTTP 伺服器測試題庫編輯，不需 Firebase；Excel 功能仍需 CDN 網路。正式開房使用 index.html。升級時保留自己設定的 config.js，其他檔案一併更新。此版僅做 JS 語法檢查，尚未完成實際瀏覽器與 Firebase 多人驗收。
