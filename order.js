const VERIFY_KEY="neonPeppersVerified";let client=null,products=[],variants=[],formItems=[],formItemVariants=[],cart=[];const el=id=>document.getElementById(id);function esc(v){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}function getClient(){const c=window.NEON_CONFIG||{};return window.supabase&&c.supabaseUrl&&c.supabasePublishableKey?window.supabase.createClient(c.supabaseUrl,c.supabasePublishableKey):null}function initGate(){const g=el("researchGate");if(!g)return;if(sessionStorage.getItem(VERIFY_KEY)!=="yes"){g.classList.add("open");document.body.classList.add("gated")}const boxes=[...g.querySelectorAll('input[type="checkbox"]')],b=el("enterSite");const u=()=>b.disabled=!boxes.every(x=>x.checked);boxes.forEach(x=>x.addEventListener("change",u));b.addEventListener("click",()=>{sessionStorage.setItem(VERIFY_KEY,"yes");g.classList.remove("open");document.body.classList.remove("gated")})}async function loadCatalog(){
  client=getClient();

  if(!client){
    el("orderProducts").innerHTML=
      '<div class="order-loading">Catalog connection is not configured.</div>';
    return;
  }

  const [p,v,f,fv]=await Promise.all([
    client.from("products")
      .select("*")
      .eq("visible",true)
      .order("name",{ascending:true}),
    client.from("product_variants")
      .select("*")
      .eq("visible",true)
      .order("sort_order",{ascending:true}),
    client.from("order_form_items")
      .select("*")
      .eq("visible",true)
      .order("sort_order",{ascending:true}),
    client.from("order_form_item_variants")
      .select("*")
      .eq("visible",true)
      .order("sort_order",{ascending:true})
  ]);

  if(p.error){
    el("orderProducts").innerHTML=
      '<div class="order-loading">The catalog could not be loaded.</div>';
    return;
  }

  products=p.data||[];
  variants=v.error?[]:(v.data||[]);
  formItems=f.error?[]:(f.data||[]);
  formItemVariants=fv.error?[]:(fv.data||[]);

  renderCategories();
  renderProducts();
}function renderCategories(){
  const s=el("orderCategory");
  const cats=[...new Set([
    ...products.map(p=>p.category||"Research Compound"),
    ...formItems.map(i=>i.category||"Research Material")
  ])];

  s.innerHTML=
    '<option value="all">All categories</option>'+
    cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");
}">${esc(c)}</option>`).join("")}function productVariants(p){const list=variants.filter(v=>v.product_id===p.id);return list.length?list:[{id:`fallback-${p.id}`,product_id:p.id,strength:p.strength||"Standard",stock_status:p.status||"available",visible:true,sort_order:0}]}function formVariantsForItem(item){
  const list=formItemVariants.filter(
    variant=>variant.order_form_item_id===item.id
  );

  return list.length
    ? list
    : [{
        id:`form-fallback-${item.id}`,
        order_form_item_id:item.id,
        strength:"Standard",
        stock_status:"available",
        visible:true,
        sort_order:0
      }];
}

function combinedOrderItems(){
  const publicProducts=products.map(product=>({
    source_type:"product",
    id:product.id,
    name:product.name,
    category:product.category||"Research Compound",
    description:product.description||"",
    image_url:product.image_url||"",
    variants:productVariants(product)
  }));

  const adminOnlyItems=formItems.map(item=>({
    source_type:"form_item",
    id:item.id,
    name:item.name,
    category:item.category||"Research Material",
    description:item.description||"",
    image_url:item.image_url||"",
    variants:formVariantsForItem(item)
  }));

  return [...publicProducts,...adminOnlyItems];
}

function stockLabel(s){return s==="out_of_stock"?"Out of stock":s==="coming_soon"?"Coming soon":s==="low_stock"?"Low stock":"Available"}function renderProducts(){
  const box=el("orderProducts");
  const q=el("orderSearch").value.trim().toLowerCase();
  const cat=el("orderCategory").value;

  const filtered=combinedOrderItems().filter(item=>{
    const text=
      `${item.name} ${item.category} ${item.description}`.toLowerCase();

    return (cat==="all"||item.category===cat) && text.includes(q);
  });

  if(!filtered.length){
    box.innerHTML='<div class="order-loading">No matching items.</div>';
    return;
  }

  box.innerHTML=filtered.map(item=>{
    const options=item.variants.map(variant=>`
      <option value="${esc(variant.id)}">
        ${esc(variant.strength)} — ${esc(stockLabel(variant.stock_status))}
      </option>
    `).join("");

    const image=item.image_url
      ? `style="background-image:url('${String(item.image_url).replace(/'/g,"%27")}')"`
      : "";

    return `
      <article class="order-product">
        <div class="order-product-image" ${image}>
          ${item.image_url?"":"⚗"}
        </div>

        <div class="order-product-body">
          <div class="category">${esc(item.category)}</div>
          <h3>${esc(item.name)}</h3>
          <p>${esc(item.description)}</p>

          <div class="variant-row">
            <select id="variant-${item.source_type}-${esc(item.id)}">
              ${options}
            </select>

            <input
              id="qty-${item.source_type}-${esc(item.id)}"
              type="number"
              min="1"
              max="99"
              value="1"
            >

            <button
              class="btn blue"
              type="button"
              onclick="addToCart('${item.source_type}','${esc(item.id)}')"
            >
              Add
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function addToCart(sourceType,id){
  const item=combinedOrderItems().find(
    current=>
      current.source_type===sourceType &&
      String(current.id)===String(id)
  );

  const select=el(`variant-${sourceType}-${id}`);
  const quantityInput=el(`qty-${sourceType}-${id}`);

  if(!item||!select)return;

  const variant=item.variants.find(
    current=>String(current.id)===String(select.value)
  );

  const quantity=Math.max(1,Number(quantityInput.value||1));

  if(!variant)return;

  if(variant.stock_status==="out_of_stock"){
    alert("That strength is currently out of stock.");
    return;
  }

  if(variant.stock_status==="coming_soon"){
    alert("That strength is marked coming soon.");
    return;
  }

  const existing=cart.find(current=>
    current.source_type===sourceType &&
    String(current.item_id)===String(item.id) &&
    String(current.variant_id)===String(variant.id)
  );

  if(existing){
    existing.quantity+=quantity;
  }else{
    cart.push({
      source_type:sourceType,
      item_id:item.id,
      product_id:sourceType==="product" ? item.id : null,
      order_form_item_id:sourceType==="form_item" ? item.id : null,
      product_name:item.name,
      variant_id:variant.id,
      strength:variant.strength,
      quantity
    });
  }

  quantityInput.value=1;
  renderCart();
}function renderCart(){const box=el("orderCart"),total=cart.reduce((s,i)=>s+i.quantity,0);el("orderItemCount").textContent=`${total} ${total===1?"item":"items"}`;if(!cart.length){box.innerHTML='<p class="empty-cart">No products selected.</p>';return}box.innerHTML=cart.map((i,n)=>`<div class="cart-item"><div class="cart-item-head"><div><strong>${esc(i.product_name)}</strong><small>${esc(i.strength)}</small></div><strong>×${i.quantity}</strong></div><div class="cart-controls"><button type="button" onclick="changeQuantity(${n},-1)">−</button><span>${i.quantity}</span><button type="button" onclick="changeQuantity(${n},1)">+</button><button type="button" class="cart-remove" onclick="removeCartItem(${n})">×</button></div></div>`).join("")}function changeQuantity(i,a){if(!cart[i])return;cart[i].quantity+=a;if(cart[i].quantity<=0)cart.splice(i,1);renderCart()}function removeCartItem(i){cart.splice(i,1);renderCart()}function setStatus(m,t=""){const s=el("orderStatus");s.textContent=m;s.className=`form-status ${t}`.trim()}async function submitOrder(e){e.preventDefault();if(!cart.length){setStatus("Add at least one item.","error");return}if(!e.currentTarget.reportValidity())return;const b=el("submitOrderButton");b.disabled=true;b.textContent="Submitting…";setStatus("");try{const r=await fetch("/.netlify/functions/submit-order-request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:el("orderName").value.trim(),email:el("orderEmail").value.trim(),company:el("orderCompany").value.trim(),phone:el("orderPhone").value.trim(),notes:el("orderNotes").value.trim(),research_acknowledged:el("orderConsent").checked,website:el("orderWebsite").value,source_url:location.href,items:cart})}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"The request could not be submitted.");e.currentTarget.reset();cart=[];renderCart();setStatus("Thank you. Your order request was submitted.","success")}catch(err){setStatus(err.message||"The request could not be submitted.","error")}finally{b.disabled=false;b.textContent="Submit Order Request"}}document.addEventListener("DOMContentLoaded",()=>{initGate();loadCatalog();el("orderSearch").addEventListener("input",renderProducts);el("orderCategory").addEventListener("change",renderProducts);el("orderRequestForm").addEventListener("submit",submitOrder);el("menuBtn")?.addEventListener("click",()=>el("navLinks").classList.toggle("open"))});