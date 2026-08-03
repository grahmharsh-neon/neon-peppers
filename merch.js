let merchClient=null;
let merchItems=[];
let merchVariants=[];
let currentMerch=null;

function el(id){
  return document.getElementById(id);
}

function esc(value){
  return String(value||"").replace(/[&<>"']/g,c=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}

function getMerchClient(){
  const config=window.NEON_CONFIG||{};

  if(
    !window.supabase ||
    !config.supabaseUrl ||
    !config.supabasePublishableKey
  ){
    return null;
  }

  return window.supabase.createClient(
    config.supabaseUrl,
    config.supabasePublishableKey
  );
}

async function loadMerch(){
  merchClient=getMerchClient();

  if(!merchClient){
    el("merchGrid").innerHTML=
      '<div class="merch-loading">Merch connection is not configured.</div>';
    return;
  }

  const [itemsResult,variantsResult]=await Promise.all([
    merchClient
      .from("merch_items")
      .select("*")
      .eq("visible",true)
      .order("sort_order",{ascending:true})
      .order("name",{ascending:true}),

    merchClient
      .from("merch_variants")
      .select("*")
      .eq("visible",true)
      .order("sort_order",{ascending:true})
  ]);

  if(itemsResult.error){
    console.error(itemsResult.error);
    el("merchGrid").innerHTML=
      '<div class="merch-loading">Merch could not be loaded.</div>';
    return;
  }

  merchItems=itemsResult.data||[];
  merchVariants=variantsResult.error?[]:(variantsResult.data||[]);

  renderMerchCategories();
  renderMerch();
}

function variantsForMerch(itemId){
  return merchVariants.filter(v=>v.merch_item_id===itemId);
}

function renderMerchCategories(){
  const select=el("merchCategory");
  const categories=[
    ...new Set(merchItems.map(item=>item.category||"Merch"))
  ];

  select.innerHTML=
    '<option value="all">All categories</option>'+
    categories.map(category=>`
      <option value="${esc(category)}">${esc(category)}</option>
    `).join("");
}

function money(value){
  const number=Number(value||0);
  return number>0 ? `$${number.toFixed(2)}` : "Price on request";
}

function renderMerch(){
  const box=el("merchGrid");
  const query=el("merchSearch").value.trim().toLowerCase();
  const category=el("merchCategory").value;

  const filtered=merchItems.filter(item=>{
    const text=
      `${item.name} ${item.category||""} ${item.description||""}`
        .toLowerCase();

    return text.includes(query) &&
      (category==="all" || item.category===category);
  });

  if(!filtered.length){
    box.innerHTML='<div class="merch-loading">No matching merch.</div>';
    return;
  }

  box.innerHTML=filtered.map(item=>{
    const variants=variantsForMerch(item.id);
    const available=variants.some(v=>v.stock_status==="available");
    const coming=variants.length && variants.every(v=>v.stock_status==="coming_soon");

    const status=available
      ? "available"
      : coming
        ? "coming_soon"
        : "out_of_stock";

    const label=status==="available"
      ? "Available"
      : status==="coming_soon"
        ? "Coming Soon"
        : "Out of Stock";

    const lowestPrice=variants
      .map(v=>Number(v.price||0))
      .filter(v=>v>0)
      .sort((a,b)=>a-b)[0] || Number(item.base_price||0);

    const imageStyle=item.image_url
      ? `style="background-image:url('${String(item.image_url).replace(/'/g,"%27")}')"`
      : "";

    return `
      <article class="merch-card" onclick="openMerchModal('${esc(item.id)}')">
        <div class="merch-card-image" ${imageStyle}>
          ${item.image_url?"":"NP"}
        </div>

        <div class="merch-card-body">
          <div class="category">${esc(item.category||"Merch")}</div>
          <h3>${esc(item.name)}</h3>
          <p>${esc(item.description||"")}</p>

          <div class="merch-card-footer">
            <span class="merch-price">
              ${lowestPrice ? `From ${money(lowestPrice)}` : "Price on request"}
            </span>

            <span class="merch-status ${status}">
              ${label}
            </span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function openMerchModal(id){
  const item=merchItems.find(
    current=>String(current.id)===String(id)
  );

  if(!item) return;

  currentMerch=item;

  const image=el("merchModalImage");

  if(item.image_url){
    image.style.backgroundImage=`url("${item.image_url}")`;
    image.textContent="";
  }else{
    image.style.backgroundImage="";
    image.textContent="NP";
  }

  el("merchModalCategory").textContent=item.category||"Merch";
  el("merchModalName").textContent=item.name;
  el("merchModalDescription").textContent=item.description||"";

  const variants=variantsForMerch(item.id);
  const select=el("merchModalVariant");

  select.innerHTML=variants.length
    ? variants.map(variant=>`
        <option
          value="${esc(variant.id)}"
          ${variant.stock_status!=="available"?"disabled":""}
        >
          ${esc(variant.label)}
          ${variant.color ? ` — ${esc(variant.color)}` : ""}
          ${variant.size ? ` — ${esc(variant.size)}` : ""}
          — ${money(variant.price||item.base_price)}
          ${variant.stock_status!=="available" ? " — Unavailable" : ""}
        </option>
      `).join("")
    : '<option value="">No options available</option>';

  updateMerchModalPrice();
  select.addEventListener("change",updateMerchModalPrice,{once:false});

  el("merchRequestButton").onclick=requestMerch;
  el("merchModal").classList.add("open");
}

function updateMerchModalPrice(){
  if(!currentMerch) return;

  const variant=merchVariants.find(
    current=>String(current.id)===String(el("merchModalVariant").value)
  );

  const price=variant?.price||currentMerch.base_price;
  el("merchModalPrice").textContent=money(price);
}

function requestMerch(){
  window.location.href = "/order.html";
}

function closeMerchModal(){
  el("merchModal").classList.remove("open");
}

document.addEventListener("DOMContentLoaded",()=>{
  loadMerch();

  el("merchSearch").addEventListener("input",renderMerch);
  el("merchCategory").addEventListener("change",renderMerch);

  el("menuBtn")?.addEventListener("click",()=>{
    el("navLinks").classList.toggle("open");
  });

  el("merchModal").addEventListener("click",event=>{
    if(event.target.id==="merchModal"){
      closeMerchModal();
    }
  });
});
