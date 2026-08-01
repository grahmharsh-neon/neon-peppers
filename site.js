
const VERIFY_KEY = "neonPeppersVerified";
let products = [];

function esc(v){return String(v||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function getClient(){
  const c = window.NEON_CONFIG || {};
  if(!c.supabaseUrl || !c.supabasePublishableKey || !window.supabase) return null;
  return window.supabase.createClient(c.supabaseUrl, c.supabasePublishableKey);
}

function initGate(){
  const gate = document.getElementById("researchGate");
  if(!gate) return;
  if(sessionStorage.getItem(VERIFY_KEY)!=="yes"){gate.classList.add("open");document.body.classList.add("gated")}
  const boxes=[...gate.querySelectorAll('input[type="checkbox"]')];
  const enter=document.getElementById("enterSite");
  const update=()=>enter.disabled=!boxes.every(x=>x.checked);
  boxes.forEach(x=>x.addEventListener("change",update));
  enter.addEventListener("click",()=>{sessionStorage.setItem(VERIFY_KEY,"yes");gate.classList.remove("open");document.body.classList.remove("gated")});
}

async function loadProducts(){
  const client=getClient();
  if(!client){products=[];renderProducts();return}
  const {data,error}=await client.from("products").select("*").eq("visible",true).order("featured",{ascending:false}).order("created_at",{ascending:false});
  if(error){console.error(error);products=[]}else products=data||[];
  renderFilters();renderProducts();
}

function renderFilters(){
  const box=document.getElementById("filters");
  const cats=["All",...new Set(products.map(p=>p.category||"Research Compound"))];
  box.innerHTML=cats.map((c,i)=>`<button class="filter ${i===0?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  box.querySelectorAll(".filter").forEach(btn=>btn.onclick=()=>{box.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));btn.classList.add("active");renderProducts()});
}

function renderProducts(){
  const grid=document.getElementById("productGrid");
  const q=(document.getElementById("searchInput")?.value||"").toLowerCase();
  const cat=document.querySelector(".filter.active")?.dataset.cat||"All";
  const list=products.filter(p=>(cat==="All"||p.category===cat)&&(`${p.name} ${p.category} ${p.description}`.toLowerCase().includes(q)));
  if(!list.length){grid.innerHTML='<div style="grid-column:1/-1;color:#a6afbd;padding:30px;border:1px dashed rgba(255,255,255,.13);border-radius:14px;text-align:center">No products found.</div>';return}
  grid.innerHTML="";
  list.forEach(p=>{
    const card=document.createElement("article");
    card.className="card";
    card.onclick=()=>openProduct(p);
    const style=p.image_url?`style="background-image:url('${String(p.image_url).replace(/'/g,"%27")}')"`:"";
    card.innerHTML=`<div class="card-image" ${style}>${p.image_url?"":"⚗"}</div><div class="card-body"><div class="category">${esc(p.category||"Research Compound")}</div><h3>${esc(p.name)}</h3><p>${esc(p.description||"")}</p><div class="strength">${esc(p.strength||"")}</div></div>`;
    grid.appendChild(card);
  });
}

function openProduct(p){
  const modal=document.getElementById("productModal");
  const img=document.getElementById("modalImage");
  img.style.backgroundImage=p.image_url?`url("${p.image_url}")`:"";
  img.textContent=p.image_url?"":"⚗";
  document.getElementById("modalCategory").textContent=p.category||"Research Compound";
  document.getElementById("modalName").textContent=p.name;
  document.getElementById("modalDescription").textContent=p.description||"";
  document.getElementById("modalStrength").textContent=p.strength||"";
  const coa=document.getElementById("modalCoa");
  if(p.coa_url){coa.href=p.coa_url;coa.style.display="inline-flex"}else coa.style.display="none";
  modal.classList.add("open");
}
function closeProduct(){document.getElementById("productModal").classList.remove("open")}

document.addEventListener("DOMContentLoaded",()=>{
  initGate();loadProducts();
  document.getElementById("searchInput")?.addEventListener("input",renderProducts);
  document.getElementById("menuBtn")?.addEventListener("click",()=>document.getElementById("navLinks").classList.toggle("open"));
});
