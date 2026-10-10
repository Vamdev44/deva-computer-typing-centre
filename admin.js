const DB_NAME='deva_db', STORE='pdfs', F_KEY='deva_folders', R_KEY='deva_reviews', D_KEY='deva_downloads', A_ID='deva_admin_id', A_PASS='deva_admin_pass';
const TM_KEY='deva_typing_matters', TR_KEY='deva_typing_results';

// ===== LOGIN =====
function getAdminId(){return localStorage.getItem(A_ID)||'devaadmin'}
function getAdminPass(){return localStorage.getItem(A_PASS)||'deva123'}
function checkLogin(){
  if(sessionStorage.getItem('deva_logged')==='yes'){
    document.getElementById('loginScreen').style.display='none'
  }else{
    document.getElementById('loginScreen').style.display='flex'
  }
}
function login(){
  let id=document.getElementById('adminId').value.trim(), pass=document.getElementById('adminPass').value.trim();
  if(id===getAdminId() && pass===getAdminPass()){
    sessionStorage.setItem('deva_logged','yes');
    document.getElementById('loginScreen').style.display='none'
  }else{
    document.getElementById('loginErr').innerText='Galat ID ya Password!'
  }
}
function logout(){sessionStorage.removeItem('deva_logged');location.reload()}
function changeCreds(){
  let nid=document.getElementById('newId').value.trim(), np=document.getElementById('newPass').value.trim();
  if(nid.length>=3) localStorage.setItem(A_ID,nid);
  if(np.length>=4) localStorage.setItem(A_PASS,np);
  alert('Update ho gaya! ID: '+getAdminId()+' Pass: '+getAdminPass());
}

// ===== DB =====
const openDB=()=>new Promise((res,rej)=>{
  let r=indexedDB.open(DB_NAME,1);
  r.onupgradeneeded=e=>{if(!e.target.result.objectStoreNames.contains(STORE)) e.target.result.createObjectStore(STORE,{keyPath:'id'})};
  r.onsuccess=()=>res(r.result);
  r.onerror=()=>rej(r.error);
});

function getFolders(){
  return JSON.parse(localStorage.getItem(F_KEY)||'[{"id":"1","name":"CCC"},{"id":"2","name":"Typing"},{"id":"3","name":"O Level"}]')
}
function saveFolders(f){localStorage.setItem(F_KEY,JSON.stringify(f));renderFolders()}
function addFolder(){
  let n=document.getElementById('fName').value.trim();if(!n)return;
  let f=getFolders();f.push({id:Date.now().toString(),name:n});
  saveFolders(f);document.getElementById('fName').value='';
}
function renderFolders(){
  let f=getFolders();
  let listEl=document.getElementById('fList');
  if(listEl) listEl.innerHTML=f.map(x=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee"><span>📁 ${x.name}</span><button class="btn-del" onclick="delFolder('${x.id}')">❌</button></div>`).join('');
  let sel=document.getElementById('pFolder');
  if(sel) sel.innerHTML=f.map(x=>`<option value="${x.id}">${x.name}</option>`).join('');
}
function delFolder(id){if(!confirm('Folder Delete? PDFs rahenge.'))return;saveFolders(getFolders().filter(x=>x.id!==id))}

// ===== PDF UPLOAD =====
async function uploadPdf(){
  let file=document.getElementById('pFile').files[0], name=document.getElementById('pName').value||(file?file.name:''), folderId=document.getElementById('pFolder').value;
  if(!file) return alert('PDF select karo');
  document.getElementById('status').innerText='Uploading...';
  let buf=await file.arrayBuffer();
  let db=await openDB(); let tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).put({id:Date.now().toString(), name:name, folderId:folderId, data:buf});
  tx.oncomplete=()=>{
    document.getElementById('status').innerText='Ho gaya ✅';
    listPdfs(); document.getElementById('pName').value=''; document.getElementById('pFile').value='';
  }
}
async function listPdfs(){
  let db=await openDB(); let req=db.transaction(STORE,'readonly').objectStore(STORE).getAll();
  req.onsuccess=()=>{
    let el=document.getElementById('pdfList');
    if(!el) return;
    el.innerHTML=req.result.map(p=>`<div style="display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:8px 0"><span>📄 ${p.name}</span><button class="btn-del" onclick="delPdf('${p.id}')">Delete</button></div>`).join('')||'Koi PDF nahi';
  }
}
async function delPdf(id){
  if(!confirm('Delete PDF?'))return;
  let db=await openDB(); let tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).delete(id); tx.oncomplete=listPdfs;
}

// ===== PDF DOWNLOAD LOGS =====
function loadLogs(){
  let logs=JSON.parse(localStorage.getItem(D_KEY)||'[]');
  let tbody=document.getElementById('logBody'); if(!tbody) return;
  let noLog=document.getElementById('noLog');
  if(logs.length===0){ if(noLog) noLog.style.display='block'; tbody.innerHTML=''; return}
  if(noLog) noLog.style.display='none';
  tbody.innerHTML=logs.slice(-200).reverse().map(l=>`<tr><td>${l.date}</td><td>${l.name}</td><td><a href="https://wa.me/91${l.mobile}" target="_blank">${l.mobile}</a></td><td>${l.pdfName}</td></tr>`).join('');
}
function clearLogs(){if(!confirm('Clear all download logs?'))return;localStorage.removeItem(D_KEY);loadLogs()}
function exportLogs(){
  let logs=JSON.parse(localStorage.getItem(D_KEY)||'[]'); if(logs.length===0)return alert('Koi data nahi');
  let csv='Date,Name,Mobile,PDF\n'+logs.map(l=>`"${l.date}","${l.name}","${l.mobile}","${l.pdfName}"`).join('\n');
  let blob=new Blob([csv],{type:'text/csv'}); let a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='deva_students.csv'; a.click();
}

// ===== REVIEWS =====
function loadReviews(){
  let arr=JSON.parse(localStorage.getItem(R_KEY)||'[]');
  let el=document.getElementById('reviewAdminList'); if(!el) return;
  el.innerHTML=arr.slice(-100).reverse().map((x,i)=>`<div style="border-bottom:1px solid #eee;padding:8px 0"><b>${x.name}</b> - ${x.date}<br>${x.text} <button class="btn-del" style="float:right" onclick="delReview(${arr.length-1-i})">Delete</button></div>`).join('')||'Koi samiksha nahi';
}
function delReview(idx){let arr=JSON.parse(localStorage.getItem(R_KEY)||'[]');arr.splice(idx,1);localStorage.setItem(R_KEY,JSON.stringify(arr));loadReviews()}

// ===== BULK FOLDER UPLOAD =====
function getOrCreateFolderId(folderName){
  let folders=getFolders();
  let f=folders.find(x=>x.name.toLowerCase()===folderName.toLowerCase());
  if(f) return f.id;
  let newId=Date.now().toString()+'_'+Math.random().toString().slice(2,6);
  folders.push({id:newId, name:folderName}); saveFolders(folders);
  return newId;
}
function initBulkUpload(){
  let inp=document.getElementById('bulkFolderInput'); if(!inp) return;
  inp.addEventListener('change', async (e)=>{
    let files=[...e.target.files].filter(f=>f.name.toLowerCase().endsWith('.pdf'));
    if(!files.length) return alert('Is folder me PDF nahi mila');
    let db=await openDB(); let status=document.getElementById('bulkStatus');
    let bar=document.getElementById('bulkBar'); let prog=document.getElementById('bulkProgress');
    if(prog) prog.style.display='block'; let done=0;
    for(let file of files){
      let parts=file.webkitRelativePath.split('/');
      let folderName=parts.length>=2? parts[parts.length-2] : 'General';
      let folderId=getOrCreateFolderId(folderName);
      let buf=await file.arrayBuffer();
      await new Promise(r=>{
        let tx=db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).put({id: Date.now()+'_'+done+'_'+Math.random(), name: file.name.replace(/\.pdf$/i,''), data: buf, folderId: folderId});
        tx.oncomplete=r;
      });
      done++;
      if(status) status.innerText=`${done}/${files.length} - ${folderName}/${file.name}`;
      if(bar) bar.style.width=Math.round(done*100/files.length)+'%';
    }
    if(status) status.innerText=`✅ ${done} PDFs upload ho gaye!`;
    listPdfs(); setTimeout(()=>{ if(prog) prog.style.display='none'; },1500);
  });
}

// ===== INIT =====
checkLogin();renderFolders();listPdfs();loadLogs();loadReviews();
initBulkUpload();
document.addEventListener('DOMContentLoaded',initBulkUpload);
setInterval(()=>{loadLogs();loadReviews()},3000);