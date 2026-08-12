const VERIFY_KEY="neonPeppersVerified";

let client=null;
let orderItems=[];
let orderVariants=[];
let cart=[];

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

function getClient(){
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

function initGate(){
  const gate=el("researchGate");
  if(!gate) return;

  if(sessionStorage.getItem(VERIFY_KEY)!=="yes"){
    gate.classList.add("open");
    document.body.classList.add("gated");
  }

  const boxes=[...gate.querySelectorAll('input[type="checkbox"]')];
  const button=el("enterSite");

  const update=()=>{
    button.disabled=!boxes.every(box=>box.checked);
  };

  boxes.forEach(box=>box.addEventListener("change",update));

  button.addEventListener("click",()=>{
    sessionStorage.setItem(VERIFY_KEY,"yes");
    gate.classList.remove("open");
    document.body.classList.remove("gated");
  });
}

async function loadOrderForm(){
  client=getClient();

  if(!client){
    el("orderItemsList").innerHTML=
      '<div class="order-loading">Order form connection is not configured.</div>';
    return;
  }

  const [productsResult,variantsResult]=await Promise.all([
    client
      .from("products")
      .select("*")
      .eq("visible",true)
      .order("name",{ascending:true}),

    client
      .from("product_variants")
      .select("*")
      .eq("visible",true)
      .order("sort_order",{ascending:true})
  ]);

  if(productsResult.error){
    console.error(productsResult.error);
    el("orderItemsList").innerHTML=
      '<div class="order-loading">The product list could not be loaded.</div>';
    return;
  }

  orderItems=(productsResult.data||[])
  .map(product=>({
    id:product.id,
    name:product.name,
    category:product.category||"Research Material",
    description:product.description||"",
    image_url:product.image_url||"",
    strength:product.strength||"",
    status:Number(product.stock_count||0)<=0
      ? "out_of_stock"
      : (Number(product.stock_count||0)<=Number(product.low_stock_threshold||5)
          ? "low_stock"
          : (product.status||"available")),
    stock_count:Number(product.stock_count||0),
    low_stock_threshold:Number(product.low_stock_threshold||5),
    price:Number(product.price||0),
    compare_at_price:product.compare_at_price==null?null:Number(product.compare_at_price),
    price_note:product.price_note||""
  }));

  orderVariants=variantsResult.error?[]:(variantsResult.data||[]);

  renderCategories();
  renderOrderItems();
}

function variantsForItem(itemId){
  const item=orderItems.find(
    current=>String(current.id)===String(itemId)
  );

  const variants=orderVariants.filter(
    variant=>String(variant.product_id)===String(itemId)
  );

  if(variants.length){
    return variants;
  }

  return [{
    id:`fallback-${itemId}`,
    product_id:itemId,
    strength:item?.strength||"Standard",
    stock_status:item?.status||"available",
    visible:true,
    sort_order:0
  }];
}

function stockLabel(status){
  if(status==="low_stock") return "Low stock";
  if(status==="out_of_stock") return "Out of stock";
  if(status==="coming_soon") return "Coming soon";
  return "Available";
}

function renderCategories(){
  const select=el("orderCategory");

  const categories=[
    ...new Set(orderItems.map(item=>item.category||"Research Material"))
  ];

  select.innerHTML=
    '<option value="all">All categories</option>'+
    categories.map(category=>`
      <option value="${esc(category)}">${esc(category)}</option>
    `).join("");
}

function renderOrderItems(){
  const box=el("orderItemsList");
  const query=el("orderSearch").value.trim().toLowerCase();
  const category=el("orderCategory").value;

  const filtered=orderItems.filter(item=>{
    const text=
      `${item.name} ${item.category||""} ${item.description||""}`.toLowerCase();

    const matchesSearch=text.includes(query);
    const matchesCategory=
      category==="all" || item.category===category;

    return matchesSearch && matchesCategory;
  });

  if(!filtered.length){
    box.innerHTML='<div class="order-loading">No matching peptides.</div>';
    return;
  }

  box.innerHTML=filtered.map(item=>{
    const variants=variantsForItem(item.id);

    const options=variants.length
      ? variants.map(variant=>`
          <option
            value="${esc(variant.id)}"
            data-status="${esc(variant.stock_status)}"
          >
            ${esc(variant.strength)} — ${esc(stockLabel(variant.stock_status))}
          </option>
        `).join("")
      : '<option value="">No options available</option>';

    const imageStyle=item.image_url
      ? `style="background-image:url('${String(item.image_url).replace(/'/g,"%27")}')"`
      : "";

    const firstStatus=variants[0]?.stock_status||"out_of_stock";

    return `
      <article class="quick-order-row">
        <div class="quick-order-product">
          <div class="quick-order-thumb" ${imageStyle}>
            ${item.image_url?"":"⚗"}
          </div>

          <div class="quick-order-copy">
            <div class="quick-order-category">
              ${esc(item.category||"Research Material")}
            </div>

            <strong>${esc(item.name)}</strong>
            <small>${esc(item.description||"")}</small>
            <div class="quick-order-price">${Number(item.price||0)>0 ? `$${Number(item.price).toFixed(2)}${item.price_note ? ` · ${esc(item.price_note)}` : ""}` : "Price on request"}</div>
          </div>
        </div>

        <div>
          <label class="quick-order-option-label" for="strength-${esc(item.id)}">
            ${esc(item.option_label||"Size")}
          </label>
          <select
            id="strength-${esc(item.id)}"
            onchange="updateRowStatus('${esc(item.id)}')"
            ${variants.length?"":"disabled"}
          >
            ${options}
          </select>

          <span
            id="status-${esc(item.id)}"
            class="stock-badge ${esc(firstStatus)}"
          >
            ${esc(stockLabel(firstStatus))}
          </span>
        </div>

        <div class="quick-order-qty">
          <button
            type="button"
            onclick="changeRowQuantity('${esc(item.id)}',-1)"
          >
            −
          </button>

          <input
            id="qty-${esc(item.id)}"
            type="number"
            min="0"
            max="99"
            value="0"
            onchange="syncCartFromRow('${esc(item.id)}')"
          >

          <button
            type="button"
            onclick="changeRowQuantity('${esc(item.id)}',1)"
          >
            +
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function selectedVariant(itemId){
  const select=el(`strength-${itemId}`);
  if(!select || !select.value) return null;

  const savedVariant=orderVariants.find(
    variant=>String(variant.id)===String(select.value)
  );

  if(savedVariant){
    return savedVariant;
  }

  const item=orderItems.find(
    current=>String(current.id)===String(itemId)
  );

  if(String(select.value).startsWith("fallback-") && item){
    return {
      id:select.value,
      product_id:item.id,
      strength:item.strength||"Standard",
      stock_status:item.status||"available",
      visible:true,
      sort_order:0
    };
  }

  return null;
}

function updateRowStatus(itemId){
  const variant=selectedVariant(itemId);
  const badge=el(`status-${itemId}`);

  if(!variant || !badge) return;

  badge.className=`stock-badge ${variant.stock_status}`;
  badge.textContent=stockLabel(variant.stock_status);

  syncCartFromRow(itemId);
}

function changeRowQuantity(itemId,amount){
  const input=el(`qty-${itemId}`);
  if(!input) return;

  const next=Math.max(
    0,
    Math.min(99,Number(input.value||0)+amount)
  );

  input.value=next;
  syncCartFromRow(itemId);
}

function syncCartFromRow(itemId){
  const item=orderItems.find(
    current=>String(current.id)===String(itemId)
  );

  const variant=selectedVariant(itemId);
  const input=el(`qty-${itemId}`);

  if(!item || !variant || !input) return;

  const quantity=Math.max(
    0,
    Math.min(99,Number(input.value||0))
  );

  if(
    quantity>0 &&
    (variant.stock_status==="out_of_stock" ||
     variant.stock_status==="coming_soon")
  ){
    alert(
      variant.stock_status==="out_of_stock"
        ? "That option is currently out of stock."
        : "That option is marked coming soon."
    );

    input.value=0;
    removeCartCombination(itemId,variant.id);
    renderCart();
    return;
  }

  removeCartItemByItemId(itemId);

  if(quantity>0){
    cart.push({
      order_form_item_id:null,
      product_id:item.id,
      variant_id:String(variant.id).startsWith("fallback-")
        ? null
        : variant.id,
      product_name:item.name,
      strength:variant.strength || item.strength || "Standard",
      quantity,
      unit_price:Number(item.price || 0)
    });
  }

  renderCart();
}

function removeCartCombination(itemId,variantId){
  cart=cart.filter(item=>!(
    String(item.order_form_item_id)===String(itemId) &&
    String(item.variant_id)===String(variantId)
  ));
}

function removeCartItemByItemId(itemId){
  cart=cart.filter(
    item=>String(item.order_form_item_id)!==String(itemId)
  );
}

function removeCartItem(index){
  const item=cart[index];
  if(!item) return;

  const input=el(`qty-${item.order_form_item_id}`);
  if(input) input.value=0;

  cart.splice(index,1);
  renderCart();
}

function renderCart(){
  const box=el("orderCart");
  const count=cart.reduce((sum,item)=>sum+item.quantity,0);

  el("orderItemCount").textContent=
    `${count} ${count===1?"item":"items"}`;

  if(!cart.length){
    box.innerHTML='<p class="empty-cart">No items selected.</p>';
    return;
  }

  box.innerHTML=cart.map((item,index)=>`
    <div class="cart-item">
      <div>
        <strong>${esc(item.product_name)}</strong>
        <small>${esc(item.strength)} × ${item.quantity}</small>
        ${Number(item.unit_price||0)>0 ? `<div class="cart-price">$${(Number(item.unit_price)*Number(item.quantity)).toFixed(2)}</div>` : ""}
      </div>

      <button
        type="button"
        class="cart-remove"
        onclick="removeCartItem(${index})"
        aria-label="Remove item"
      >
        ×
      </button>
    </div>
  `).join("");
}

function setStatus(message,type=""){
  const status=el("orderStatus");
  status.textContent=message;
  status.className=`form-status ${type}`.trim();
}

async function submitOrder(event){
  event.preventDefault();

  if(!cart.length){
    setStatus("Select at least one item.","error");
    return;
  }

  if(!event.currentTarget.reportValidity()) return;

  const button=el("submitOrderButton");
  button.disabled=true;
  button.textContent="Sending…";
  setStatus("");

  const payload={
    name:el("orderName").value.trim(),
    email:el("orderEmail").value.trim(),
    phone:el("orderPhone").value.trim(),
    company:el("orderCompany").value.trim(),
    notes:el("orderNotes").value.trim(),
    coupon_code:el("orderCoupon")?.value.trim().toUpperCase()||"",
    referral_code:el("orderReferral")?.value.trim().toUpperCase()||"",
    research_acknowledged:el("orderConsent").checked,
    website:el("orderWebsite").value,
    source_url:window.location.href,
    items:cart
  };

  try{
    const response=await fetch(
      "/.netlify/functions/submit-order-request",
      {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      }
    );

    const result=await response.json().catch(()=>({}));

    if(!response.ok){
      throw new Error(
        result.error||"The request could not be submitted."
      );
    }

    event.currentTarget.reset();

    document
      .querySelectorAll('[id^="qty-"]')
      .forEach(input=>input.value=0);

    cart=[];
    renderCart();

    const discountText=Number(result.discount_amount||0)>0
      ? ` Coupon ${result.coupon_code} saved $${Number(result.discount_amount).toFixed(2)}.`
      : "";

    const invoiceText=result.invoice_number
      ? ` Draft invoice ${result.invoice_number} was created for $${Number(result.invoice_total||0).toFixed(2)}.${discountText}`
      : discountText;

    setStatus(
      `Thank you. Your order request was sent.${invoiceText}`,
      "success"
    );
  }catch(error){
    console.error(error);
    setStatus(
      error.message||"The request could not be submitted.",
      "error"
    );
  }finally{
    button.disabled=false;
    button.textContent="Send Order Request";
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  initReferralCode();
  initGate();
  loadOrderForm();

  el("orderSearch").addEventListener("input",renderOrderItems);
  el("orderCategory").addEventListener("change",renderOrderItems);
  el("orderRequestForm").addEventListener("submit",submitOrder);

  el("menuBtn")?.addEventListener("click",()=>{
    el("navLinks").classList.toggle("open");
  });
});


function initReferralCode(){
  const code=new URLSearchParams(window.location.search).get("ref");
  if(code&&el("orderReferral")){
    el("orderReferral").value=String(code).trim().toUpperCase();
  }
}
