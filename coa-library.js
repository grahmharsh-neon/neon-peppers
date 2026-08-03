let publicCoas=[];
let publicProducts=[];

const byId=id=>document.getElementById(id);
const safe=value=>String(value||"").replace(/[&<>"']/g,c=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[c]));

function publicClient(){
  const config=window.NEON_CONFIG||{};
  return window.supabase.createClient(
    config.supabaseUrl.trim(),
    config.supabasePublishableKey.trim()
  );
}

function publicProductName(id){
  return publicProducts.find(item=>String(item.id)===String(id))?.name||"Unknown Product";
}

async function loadPublicCoas(){
  try{
    const client=publicClient();

    const [productsResult,coaResult]=await Promise.all([
      client.from("products").select("id,name").eq("visible",true).order("name"),
      client.from("product_coas").select("*").eq("is_public",true).not("file_url","is",null).order("test_date",{ascending:false})
    ]);

    if(productsResult.error) throw productsResult.error;
    if(coaResult.error) throw coaResult.error;

    publicProducts=productsResult.data||[];
    publicCoas=coaResult.data||[];

    byId("publicCoaProduct").innerHTML=
      '<option value="all">All products</option>'+
      publicProducts.map(item=>`<option value="${safe(item.id)}">${safe(item.name)}</option>`).join("");

    renderPublicCoas();
  }catch(error){
    console.error(error);
    byId("publicCoaGrid").innerHTML=
      `<div class="public-coa-empty"><strong>COAs could not be loaded.</strong><p>${safe(error.message)}</p></div>`;
  }
}

function renderPublicCoas(){
  const query=(byId("publicCoaSearch").value||"").toLowerCase();
  const selected=byId("publicCoaProduct").value;

  const rows=publicCoas.filter(item=>{
    const text=`${publicProductName(item.product_id)} ${item.lot_number||""} ${item.strength||""} ${item.lab_name||""}`.toLowerCase();
    return text.includes(query)&&(selected==="all"||String(item.product_id)===String(selected));
  });

  byId("publicCoaGrid").innerHTML=rows.length?rows.map(item=>`
    <article class="public-coa-card">
      <div class="public-coa-card-head">
        <div>
          <div class="category">${safe(publicProductName(item.product_id))}</div>
          <h2>${safe(item.lot_number||"Certificate of Analysis")}</h2>
        </div>
        <span class="public-coa-type">${String(item.file_type||item.file_url).toLowerCase().includes("pdf")?"PDF":"IMAGE"}</span>
      </div>

      <div class="public-coa-details">
        <div><span>Strength</span><strong>${safe(item.strength||"Not listed")}</strong></div>
        <div><span>Lab</span><strong>${safe(item.lab_name||"Not listed")}</strong></div>
        <div><span>Test Date</span><strong>${safe(item.test_date||"Not listed")}</strong></div>
        <div><span>Purity</span><strong>${item.purity_percent!=null?Number(item.purity_percent).toFixed(2)+"%":"Not listed"}</strong></div>
      </div>

      <a class="btn blue" href="${safe(item.file_url)}" target="_blank" rel="noopener">View COA</a>
    </article>
  `).join(""):'<div class="public-coa-empty">No public COAs match your search.</div>';
}

document.addEventListener("DOMContentLoaded",()=>{
  loadPublicCoas();
  byId("publicCoaSearch").addEventListener("input",renderPublicCoas);
  byId("publicCoaProduct").addEventListener("change",renderPublicCoas);
  byId("menuBtn")?.addEventListener("click",()=>byId("navLinks").classList.toggle("open"));
});