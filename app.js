const DB_NAME='deva_db', STORE='pdfs', F_KEY='deva_folders', R_KEY='deva_reviews', D_KEY='deva_downloads';
const openDB=()=>new Promise((res,rej)=>{let r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=e=>{if(!e.target.result.objectStoreNames.contains(STORE))e.target.result.createObjectStore(STORE,{keyPath:'id'})};r.onsuccess=()=>res(r.result)});
function getFolders(){return JSON.parse(localStorage.getItem(F_KEY)||'[{"id":"1","name":"CCC"},{"id":"2","name":"Typing"},{"id":"3","name":"O Level"}]')}
let allPdfs=[], pendingPdf=null, currentShareFile=null, currentShareName="";
function showTab(id){document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));document.getElementById(id).classList.add('active');if(id==='library')renderAll();}
async function init(){await loadPdfs();renderHome();renderAll();loadReviews()}
async function loadPdfs(){let db=await openDB();let req=db.transaction(STORE,'readonly').objectStore(STORE).getAll();req.onsuccess=()=>{allPdfs=req.result;renderHome();renderAll()}}
function renderHome(){
  let f=getFolders();
  document.getElementById('folderListHome').innerHTML=f.map(x=>`<div class="folder-card" onclick="showTab('library');filterLib('${x.id}')"><span>📁 ${x.name}</span></div>`).join('');
  document.getElementById('recentPdfs').innerHTML=allPdfs.slice(-6).reverse().map(p=>`<div class="pdf-card"><b>📄 ${p.name}</b><button class="btn-primary" style="margin-top:8px" onclick="askGate('${p.id}')">Open</button></div>`).join('') || '<p>Koi PDF nahi</p>';
}
function renderAll(){let f=getFolders();document.getElementById('folderListLib').innerHTML=`<div class="folder-card active" onclick="filterLib(null)"><span>All</span></div>`+f.map(x=>`<div class="folder-card" onclick="filterLib('${x.id}')"><span>📁 ${x.name}</span></div>`).join('');filterLib(null)}
function filterLib(fid){
  let list=fid?allPdfs.filter(p=>p.folderId===fid):allPdfs;
  document.getElementById('pdfList').innerHTML=list.map(p=>`<div class="pdf-card"><b>📄 ${p.name}</b><button class="btn-primary" style="margin-top:8px" onclick="askGate('${p.id}')">Open</button></div>`).join('') || '<p>Koi PDF nahi</p>';
}
function searchPDFs(){let q=document.getElementById('searchInput').value.toLowerCase();if(!q){renderAll();return}let res=allPdfs.filter(p=>p.name.toLowerCase().includes(q));document.getElementById('pdfList').innerHTML=res.map(p=>`<div class="pdf-card"><b>📄 ${p.name}</b><button class="btn-primary" style="margin-top:8px" onclick="askGate('${p.id}')">Open</button></div>`).join('');showTab('library')}
function askGate(id){pendingPdf=allPdfs.find(p=>p.id===id);document.getElementById('gateModal').style.display='flex'}
function closeGate(){document.getElementById('gateModal').style.display='none'}
function confirmDownload(){
  let n=document.getElementById('dName').value.trim(), m=document.getElementById('dMobile').value.trim();
  if(n.length<2||m.length<10)return alert('Sahi Naam Mobile bharo');
  let logs=JSON.parse(localStorage.getItem(D_KEY)||'[]');logs.push({date:new Date().toLocaleString(),name:n,mobile:m,pdfName:pendingPdf.name});localStorage.setItem(D_KEY,JSON.stringify(logs));
  closeGate();openPdfViewer(pendingPdf);
}

// --- YAHI HAI ASLI KAAM ---
async function makeWatermarkedForDownload(originalData){
  try{
    const pdfDoc = await PDFLib.PDFDocument.load(originalData);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

    const text1 = 'DEVA COMPUTER TYPING CENTER';
    const text2 = 'KHAIRAGARH - 7748099814';

    pages.forEach(page=>{
      const {width, height} = page.getSize();

      const w1 = font.widthOfTextAtSize(text1, 18);
      const w2 = font.widthOfTextAtSize(text2, 14);

      // upar wala - thoda upar
      page.drawText(text1, {
        x: (width - w1) / 5,
        y: height/5 + 20, // 30 pe
        size: 45,
        font: font,
        color: PDFLib.rgb(0.5, 0.5, 0.5),
        opacity: 0.18,
        rotate: PDFLib.degrees(30)
      });

      // neeche wala - ab gap jyada, dhakega nahi
      page.drawText(text2, {
        x: (width - w2) / 2,
        y: height/3 - 30, // 40 ka gap ho gaya
        size: 20,
        font: font,
        color: PDFLib.rgb(0.5, 0.5, 0.5),
        opacity: 0.18,
        rotate: PDFLib.degrees(30)
      });
    });
    const newBytes = await pdfDoc.save();
    return new Blob([newBytes], {type:'application/pdf'});
  }catch(e){console.error(e); return new Blob([originalData], {type:'application/pdf'});}
}

async function openPdfViewer(p){
  document.getElementById('pdfViewerTitle').innerText=p.name;
  currentShareName=p.name;
  document.getElementById('pdfModal').style.display='flex';
  let cont=document.getElementById('pdfContainer');cont.innerHTML='Watermark laga raha hu...';

  let watermarkedBlob = await makeWatermarkedForDownload(p.data);
  let watermarkedBytes = await watermarkedBlob.arrayBuffer();

  let url=URL.createObjectURL(watermarkedBlob);
  document.getElementById('pdfDownloadLink').href=url;
  document.getElementById('pdfDownloadLink').download=p.name+'-DCTC.pdf';
  currentShareFile=new File([watermarkedBlob], p.name+'-DCTC.pdf', {type:'application/pdf'});

  try{
    let pdf=await pdfjsLib.getDocument({data:watermarkedBytes}).promise;
    cont.innerHTML='';
    for(let i=1;i<=pdf.numPages;i++){
      let page=await pdf.getPage(i);
      let vp=page.getViewport({scale:1.2});
      let canvas=document.createElement('canvas');
      canvas.width=vp.width; canvas.height=vp.height;
      canvas.style.width='100%'; canvas.style.margin='10px auto'; canvas.style.display='block';
      cont.appendChild(canvas);
      await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
    }
  }catch(e){cont.innerHTML='Error: '+e.message}
}
function closePdf(){document.getElementById('pdfModal').style.display='none';document.getElementById('pdfContainer').innerHTML=''}
async function sharePdf(){
  let t=`${currentShareName} - Deva Computer Typing Center`; let u=window.location.href;
  if(navigator.canShare && currentShareFile && navigator.canShare({files:[currentShareFile]})){try{await navigator.share({title:currentShareName, text:t, files:[currentShareFile]});return}catch(e){}}
  if(navigator.share){try{await navigator.share({title:currentShareName, text:t, url:u});return}catch(e){}}
  window.open(`https://wa.me/?text=${encodeURIComponent(t+' '+u)}`,'_blank');
}
function submitReview(){let n=document.getElementById('rName').value.trim(), t=document.getElementById('rText').value.trim();if(!n||!t)return alert('Bharo');let arr=JSON.parse(localStorage.getItem(R_KEY)||'[]');arr.push({name:n,text:t,date:new Date().toLocaleDateString()});localStorage.setItem(R_KEY,JSON.stringify(arr));document.getElementById('rName').value='';document.getElementById('rText').value='';loadReviews()}
function loadReviews(){let arr=JSON.parse(localStorage.getItem(R_KEY)||'[]');document.getElementById('reviewList').innerHTML=arr.slice(-20).reverse().map(x=>`<div style="background:#fff;padding:10px;border-radius:8px;margin:8px 0"><b>${x.name}</b> <small>${x.date}</small><br>${x.text}</div>`).join('')||'Koi samiksha nahi'}
init();
