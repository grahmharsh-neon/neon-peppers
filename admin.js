var client = null;
var products = [];
let siteSettings = null;
let inquiries = [];
let orderRequests = [];
let orderRequestItems = [];
let orderFormItems = [];
let orderFormItemVariants = [];
let merchItems = [];
let merchVariants = [];
let dashboardInvoices = [];
let dashboardCustomers = [];
var dashboardCoas = [];
let dashboardCoupons = [];
let dashboardReferrals = [];

function el(id){
  return document.getElementById(id);
}

function createClient(){
  const config = window.NEON_CONFIG || {};

  if(!config.supabaseUrl){
    throw new Error("Supabase URL is missing from config.js.");
  }

  if(!config.supabasePublishableKey){
    throw new Error("Supabase publishable key is missing from config.js.");
  }

  if(!window.supabase){
    throw new Error("Supabase library did not load.");
  }

  return window.supabase.createClient(
    config.supabaseUrl.trim(),
    config.supabasePublishableKey.trim()
  );
}


function showPanelFromHash(){
  const requested=window.location.hash.replace("#","");

  if(!requested){
    return;
  }

  const allowed=[
    "dashboardPanel",
    "homepagePanel",
    "productsPanel",
    "merchPanel",
    "orderItemsPanel",
    "ordersPanel",
    "inquiriesPanel",
    "settingsPanel"
  ];

  if(allowed.includes(requested)){
    showPanel(requested);
  }
}

window.addEventListener("hashchange",showPanelFromHash);

async function init(){
  bindEvents();

  try{
    client = createClient();

    const {
      data: { session }
    } = await client.auth.getSession();

    if(session){
      await showAdmin();
      showPanelFromHash();
    }
  }catch(error){
    const warning = el("setupWarning");
    warning.textContent = error.message;
    warning.hidden = false;
  }
}

function bindEvents(){
  el("loginButton").addEventListener("click", login);
  el("logoutButton").addEventListener("click", logout);
  el("refreshButton").addEventListener("click", refreshAll);
  el("quickAddProduct").addEventListener("click", () => {
    showPanel("productsPanel");
    addProduct();
  });
  el("addProductButton").addEventListener("click", addProduct);
  el("saveHomepageButton").addEventListener("click", saveHomepage);
  el("saveSettingsButton").addEventListener("click", saveSettings);
  el("uploadHeroButton").addEventListener("click", uploadHeroImage);
  el("uploadLogoButton").addEventListener("click", uploadLogo);  el("adminProductSearch").addEventListener("input", renderProducts);
  el("adminProductFilter").addEventListener("change", renderProducts);




  document.querySelectorAll("[data-attention-filter]").forEach(button=>{
    button.addEventListener("click",()=>{
      window.productAttentionFilter=button.dataset.attentionFilter;
      window.productLifecycleFilter="all";
      const filter=el("adminProductFilter");
      if(filter)filter.value="needs_attention";
      history.replaceState(null,"","#productsPanel");
      showPanel("productsPanel");
      renderProducts();
    });
  });

  const expandAllProductsButton=el("expandAllProductsButton");
  if(expandAllProductsButton){
    expandAllProductsButton.addEventListener("click",()=>window.expandAllProducts?.());
  }

  const collapseAllProductsButton=el("collapseAllProductsButton");
  if(collapseAllProductsButton){
    collapseAllProductsButton.addEventListener("click",()=>window.collapseAllProducts?.());
  }

  const addMerchItemButton = el("addMerchItemButton");
  if(addMerchItemButton){
    addMerchItemButton.addEventListener("click", addMerchItem);
  }

  const merchAdminSearch = el("merchAdminSearch");
  if(merchAdminSearch){
    merchAdminSearch.addEventListener("input", renderMerchAdmin);
  }

  const merchAdminFilter = el("merchAdminFilter");
  if(merchAdminFilter){
    merchAdminFilter.addEventListener("change", renderMerchAdmin);
  }

  const addOrderItemButton = el("addOrderItemButton");
  if(addOrderItemButton){
    addOrderItemButton.addEventListener("click", addOrderFormItem);
  }

  const orderItemSearch = el("orderItemSearch");
  if(orderItemSearch){
    orderItemSearch.addEventListener("input", renderOrderFormItems);
  }

  const orderItemFilter = el("orderItemFilter");
  if(orderItemFilter){
    orderItemFilter.addEventListener("change", renderOrderFormItems);
  }

  const refreshOrders = el("refreshOrdersButton");
  if(refreshOrders) refreshOrders.addEventListener("click", loadOrderRequests);
  const orderAdminSearch = el("orderAdminSearch");
  if(orderAdminSearch) orderAdminSearch.addEventListener("input", renderOrderRequests);
  const orderAdminFilter = el("orderAdminFilter");
  if(orderAdminFilter) orderAdminFilter.addEventListener("change", renderOrderRequests);

  const refreshInquiries = el("refreshInquiriesButton");
  if(refreshInquiries) refreshInquiries.addEventListener("click", loadInquiries);

  const inquirySearch = el("inquirySearch");
  if(inquirySearch) inquirySearch.addEventListener("input", renderInquiries);

  const inquiryFilter = el("inquiryFilter");
  if(inquiryFilter) inquiryFilter.addEventListener("change", renderInquiries);

  document.querySelectorAll("[data-panel]").forEach(button => {
    button.addEventListener("click", () => showPanel(button.dataset.panel));
  });

  document.querySelectorAll("[data-panel-target]").forEach(button => {
    button.addEventListener("click", () => showPanel(button.dataset.panelTarget));
  });
}

async function login(){
  try{
    if(!client){
      client = createClient();
    }

    const { error } = await client.auth.signInWithPassword({
      email: el("email").value.trim(),
      password: el("password").value
    });

    if(error){
      throw error;
    }

    await showAdmin();
  }catch(error){
    alert(error.message);
  }
}

async function logout(){
  if(client){
    await client.auth.signOut();
  }
  location.reload();
}

async function showAdmin(){
  el("loginView").hidden = true;
  el("adminView").hidden = false;
  await refreshAll();
  await loadDashboardData();
  updateStats();
}

async function refreshAll(){
  await Promise.all([
    loadProducts(),
    loadSettings(),
    loadInquiries(),
    loadOrderRequests(),
    loadOrderFormItems(),
    loadMerchAdmin()
  ]);
  await loadDashboardData();
  updateStats();
  flash("Dashboard refreshed");
}

function showPanel(panelId){
  document.querySelectorAll(".panel-view").forEach(panel => {
    panel.classList.toggle("active", panel.id === panelId);
  });
}

window.loadProducts = async function loadProducts(){
  const { data, error } = await client
    .from("products")
    .select("*")
    .order("created_at", { ascending:false });

  if(error){
    alert(error.message);
    return;
  }

  products = data || [];
  renderProducts();
}

async function loadSettings(){
  const { data, error } = await client
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if(error && error.code !== "PGRST116"){
    console.warn(error);
    return;
  }

  siteSettings = data || {};

  const fields = [
    "hero_eyebrow",
    "hero_title",
    "hero_text",
    "primary_button_text",
    "secondary_button_text",
    "hero_image_url",
    "research_banner_title",
    "research_banner_text",
    "research_banner_button",
    "announcement_text",
    "announcement_visible",
    "contact_email",
    "footer_disclaimer",
    "logo_url",
    "vial_label_accent_color"
  ];

  fields.forEach(field => {
    const node = el(field);
    if(!node) return;

    if(field === "announcement_visible"){
      node.value = String(siteSettings[field] === true);
    }else{
      node.value = siteSettings[field] || "";
    }
  });

  updateImagePreview("heroPreview", siteSettings.hero_image_url);
  updateImagePreview("logoPreview", siteSettings.logo_url);}

async function loadDashboardData(){
  if(!client)return;

  const [invoiceResult,customerResult,coaResult,couponResult,referralResult]=await Promise.all([
    client.from("invoices").select("*").order("updated_at",{ascending:false}),
    client.from("customers").select("*").order("updated_at",{ascending:false}),
    client.from("product_coas").select("product_id"),
    client.from("coupon_codes").select("*"),
    client.from("referrals").select("*")
  ]);

  dashboardInvoices=invoiceResult.error?[]:invoiceResult.data||[];
  dashboardCustomers=customerResult.error?[]:customerResult.data||[];
  dashboardCoas=coaResult.error?[]:coaResult.data||[];
  dashboardCoupons=couponResult.error?[]:couponResult.data||[];
  dashboardReferrals=referralResult.error?[]:referralResult.data||[];
}

function updateStats(){
  const now=new Date();
  const today=now.toISOString().slice(0,10);
  const month=now.toISOString().slice(0,7);

  const requestsToday=orderRequests.filter(x=>
    String(x.created_at||"").slice(0,10)===today
  ).length;

  const drafts=dashboardInvoices.filter(x=>x.status==="draft").length;
  const paidMonth=dashboardInvoices
    .filter(x=>x.status==="paid"&&String(x.paid_at||x.updated_at||"").slice(0,7)===month)
    .reduce((sum,x)=>sum+Number(x.total||0),0);

  const lowStock=products.filter(x=>
    Number(x.stock_count||0)<=Number(x.low_stock_threshold||5)
  ).length;

  const productIdsWithCoa=new Set(dashboardCoas.map(x=>String(x.product_id)));
  const missingCoas=products.filter(x=>x.visible!==false&&!productIdsWithCoa.has(String(x.id))).length;

  const credits=dashboardCustomers.reduce((sum,x)=>sum+Number(x.referral_credit||0),0);

  const money=value=>new Intl.NumberFormat("en-US",{
    style:"currency",currency:"USD"
  }).format(Number(value||0));

  if(el("statRequestsToday"))el("statRequestsToday").textContent=requestsToday;
  if(el("statDraftInvoices"))el("statDraftInvoices").textContent=drafts;
  if(el("statPaidMonth"))el("statPaidMonth").textContent=money(paidMonth);
  if(el("statLowInventory"))el("statLowInventory").textContent=lowStock;
  if(el("statCustomers"))el("statCustomers").textContent=dashboardCustomers.length;
  if(el("statMissingCoas"))el("statMissingCoas").textContent=missingCoas;
  if(el("statActiveCoupons"))el("statActiveCoupons").textContent=dashboardCoupons.filter(x=>x.active).length;
  if(el("statReferralCredits"))el("statReferralCredits").textContent=money(credits);

  const publishedOrWorking=products.filter(x=>x.lifecycle_status!=="archived");
  const missingImage=publishedOrWorking.filter(x=>!String(x.image_url||"").trim()).length;
  const missingPrice=publishedOrWorking.filter(x=>Number(x.price||0)<=0).length;
  const missingDescription=publishedOrWorking.filter(x=>!String(x.description||"").trim()).length;
  const missingSizes=publishedOrWorking.filter(x=>!Array.isArray(x.option_values)||!x.option_values.length).length;
  const missingCoaCount=publishedOrWorking.filter(x=>!productIdsWithCoa.has(String(x.id))).length;

  if(el("attentionMissingImage"))el("attentionMissingImage").textContent=missingImage;
  if(el("attentionMissingCoa"))el("attentionMissingCoa").textContent=missingCoaCount;
  if(el("attentionMissingPrice"))el("attentionMissingPrice").textContent=missingPrice;
  if(el("attentionMissingDescription"))el("attentionMissingDescription").textContent=missingDescription;
  if(el("attentionMissingSizes"))el("attentionMissingSizes").textContent=missingSizes;
  if(el("attentionLowStock"))el("attentionLowStock").textContent=lowStock;

  renderDashboardActivity();
}

function renderDashboardActivity(){
  const box=el("dashboardRecentActivity");
  if(!box)return;

  const activity=[
    ...orderRequests.slice(0,5).map(x=>({
      date:x.created_at,
      title:`Order request from ${x.name}`,
      detail:x.invoice_number?`Invoice ${x.invoice_number}`:x.status||"new"
    })),
    ...dashboardInvoices.slice(0,5).map(x=>({
      date:x.updated_at||x.created_at,
      title:`Invoice ${x.invoice_number}`,
      detail:`${x.customer_name} · ${x.status}`
    }))
  ]
  .sort((a,b)=>new Date(b.date)-new Date(a.date))
  .slice(0,8);

  box.innerHTML=activity.length
    ?activity.map(x=>`
      <div class="dashboard-activity-row">
        <div><strong>${escapeHtml(x.title)}</strong><span>${escapeHtml(x.detail)}</span></div>
        <time>${new Date(x.date).toLocaleString()}</time>
      </div>
    `).join("")
    :'<p class="muted">No recent activity.</p>';
}

async function generateProductDescription(index){
  const product = products[index];

  if(!product){
    alert("The product could not be found.");
    return;
  }

  const name = String(product.name || "").trim();
  const strength = Array.isArray(product.option_values)
    ? product.option_values.join(", ")
    : "";
  const category = String(product.category || "").trim();

  if(!name || name === "New Product"){
    alert("Enter the product name before generating a description.");
    return;
  }

  const button = el(`generateDescription-${index}`);
  const textarea = el(`productDescription-${index}`);

  if(!textarea){
    alert("The description field could not be found.");
    return;
  }

  const originalButtonText = button?.textContent || "Generate Description";

  if(button){
    button.disabled = true;
    button.textContent = "Generating…";
  }

  setDescriptionGenerationStatus(
    index,
    "Creating a neutral research-focused draft…",
    "working"
  );

  try{
    const response = await fetch(
      "/.netlify/functions/generate-product-description",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          name,
          strength,
          category,
          existing_description:String(product.description || "").trim()
        })
      }
    );

    const result = await response.json().catch(() => ({}));

    if(!response.ok){
      throw new Error(
        result.error || "The description could not be generated."
      );
    }

    const description = String(result.description || "").trim();

    if(!description){
      throw new Error("The generator returned an empty description.");
    }

    product.description = description;
    textarea.value = description;

    const preview = el(`descriptionPreview-${index}`);

    if(preview){
      preview.innerHTML = window.renderMarkdown
        ? window.renderMarkdown(description)
        : escapeHtml(description);

      preview.hidden = false;
    }

    // Trigger the same local update behavior as manual editing.
    textarea.dispatchEvent(
      new Event("input", { bubbles:true })
    );

    setDescriptionGenerationStatus(
      index,
      "Draft generated. Review it, make any edits, then click Save Product.",
      "success"
    );

    if(button){
      button.textContent = "↻ Regenerate Description";
    }
  }catch(error){
    console.error("Description generation failed:", error);

    setDescriptionGenerationStatus(
      index,
      error.message || "Description generation failed.",
      "error"
    );

    alert(error.message || "Description generation failed.");

    if(button){
      button.textContent = originalButtonText;
    }
  }finally{
    if(button){
      button.disabled = false;
    }
  }
}

window.saveProduct = async function saveProduct(index){
  const product = products[index];

  if(!product){
    return;
  }

  if(!product.name || !product.name.trim()){
    alert("Product name is required.");
    return;
  }

  const payload = {
    name:product.name.trim(),
    category:product.category || "Research Compound",
    description:product.description || "",
    strength:"",
    option_label:product.option_label || "Size",
    option_values:Array.isArray(product.option_values)?product.option_values:[],
    price:Number(product.price || 0),
    compare_at_price:
      product.compare_at_price === null ||
      product.compare_at_price === "" ||
      typeof product.compare_at_price === "undefined"
        ? null
        : Number(product.compare_at_price),
    price_note:product.price_note || null,
    slug:(product.slug||product.name||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""),
    tags:Array.isArray(product.tags)?product.tags:[],
    stock_count:Math.max(0,Number(product.stock_count||0)),
    low_stock_threshold:Math.max(0,Number(product.low_stock_threshold||5)),
    supplier:product.supplier||null,
    unit_cost:product.unit_cost==null?null:Number(product.unit_cost),
    shelf_location:product.shelf_location||null,
    seo_title:product.seo_title||`${product.name} | Neon Peppers`,
    seo_description:product.seo_description||String(product.description||"").replace(/[#*_`]/g,"").slice(0,155),
    image_url:product.image_url || null,
    coa_url:product.coa_url || null,
    visible:product.lifecycle_status==="published" ? product.visible !== false : false,
    featured:product.featured === true,
    status:product.status || "available",
    lifecycle_status:product.lifecycle_status || "draft",
    updated_at:new Date().toISOString()
  };

  const response = product.id
    ? await client.from("products").update(payload).eq("id", product.id).select().single()
    : await client.from("products").insert(payload).select().single();

  if(response.error){
    alert(response.error.message);
    return;
  }

  products[index] = response.data;
  flash("Product saved");
  await loadProducts();
  updateStats();
}

window.deleteProduct = async function deleteProduct(index){
  const product = products[index];

  if(!product){
    return;
  }

  if(!confirm(`Delete ${product.name || "this product"}?`)){
    return;
  }

  if(product.id){
    const { error } = await client
      .from("products")
      .delete()
      .eq("id", product.id);

    if(error){
      alert(error.message);
      return;
    }
  }

  products.splice(index, 1);
  renderProducts();
  updateStats();
  flash("Product deleted");
}

async function optimizeImage(file, maxSize = 1600, quality = 0.84){
  const objectUrl = URL.createObjectURL(file);

  try{
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("The selected image could not be opened."));
      img.src = objectUrl;
    });

    let width = image.naturalWidth;
    let height = image.naturalHeight;

    if(width > maxSize || height > maxSize){
      const scale = Math.min(maxSize / width, maxSize / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if(!context){
      throw new Error("Your browser could not process the image.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(result => {
        if(result){
          resolve(result);
        }else{
          reject(new Error("The optimized image could not be created."));
        }
      }, "image/webp", quality);
    });

    return new File(
      [blob],
      `${crypto.randomUUID()}.webp`,
      { type:"image/webp" }
    );
  }finally{
    URL.revokeObjectURL(objectUrl);
  }
}

async function uploadFile(path, file, contentType){
  const { error } = await client.storage
    .from(window.NEON_CONFIG.storageBucket)
    .upload(path, file, {
      cacheControl:"3600",
      contentType,
      upsert:false
    });

  if(error){
    throw error;
  }

  const { data } = client.storage
    .from(window.NEON_CONFIG.storageBucket)
    .getPublicUrl(path);

  if(!data?.publicUrl){
    throw new Error("The upload completed, but no public URL was returned.");
  }

  return data.publicUrl;
}

async function uploadProductImage(index){
  try{
    const input = el(`productImage-${index}`);
    const originalFile = input.files?.[0];

    if(!originalFile){
      throw new Error("Choose an image first.");
    }

    flash("Optimizing product image...");
    const optimized = await optimizeImage(originalFile, 1200, 0.84);
    const path = `products/${crypto.randomUUID()}.webp`;
    const publicUrl = await uploadFile(path, optimized, "image/webp");

    products[index].image_url = publicUrl;

    if(products[index].id){
      const { error } = await client
        .from("products")
        .update({
          image_url:publicUrl,
          updated_at:new Date().toISOString()
        })
        .eq("id", products[index].id);

      if(error){
        throw error;
      }
    }

    renderProducts();
    flash(products[index].id
      ? "Product image uploaded and saved"
      : "Product image uploaded. Save the product."
    );
  }catch(error){
    alert(error.message);
  }
}

async function uploadCoa(index){
  try{
    const input = el(`coaFile-${index}`);
    const file = input.files?.[0];

    if(!file){
      throw new Error("Choose a PDF first.");
    }

    if(file.type !== "application/pdf"){
      throw new Error("The COA must be a PDF.");
    }

    flash("Uploading COA...");
    const path = `coa/${crypto.randomUUID()}.pdf`;
    const publicUrl = await uploadFile(path, file, "application/pdf");

    products[index].coa_url = publicUrl;

    if(products[index].id){
      const { error } = await client
        .from("products")
        .update({
          coa_url:publicUrl,
          updated_at:new Date().toISOString()
        })
        .eq("id", products[index].id);

      if(error){
        throw error;
      }
    }

    renderProducts();
    flash(products[index].id
      ? "COA uploaded and saved"
      : "COA uploaded. Save the product."
    );
  }catch(error){
    alert(error.message);
  }
}












async function uploadHeroImage(){
  try{
    const file = el("heroImageFile").files?.[0];

    if(!file){
      throw new Error("Choose a hero image first.");
    }

    flash("Optimizing hero image...");
    const optimized = await optimizeImage(file, 2200, 0.86);
    const path = `site/hero-${crypto.randomUUID()}.webp`;
    const publicUrl = await uploadFile(path, optimized, "image/webp");

    el("hero_image_url").value = publicUrl;
    updateImagePreview("heroPreview", publicUrl);
    flash("Hero image uploaded. Click Save Homepage.");
  }catch(error){
    alert(error.message);
  }
}

async function uploadLogo(){
  try{
    const file = el("logoFile").files?.[0];

    if(!file){
      throw new Error("Choose a logo first.");
    }

    flash("Optimizing logo...");
    const optimized = await optimizeImage(file, 1200, 0.9);
    const path = `site/logo-${crypto.randomUUID()}.webp`;
    const publicUrl = await uploadFile(path, optimized, "image/webp");

    el("logo_url").value = publicUrl;
    updateImagePreview("logoPreview", publicUrl);
    flash("Logo uploaded. Click Save Settings.");
  }catch(error){
    alert(error.message);
  }
}

function updateImagePreview(id, url){
  const image = el(id);

  if(url){
    image.src = url;
    image.hidden = false;
  }else{
    image.hidden = true;
  }
}

async function saveHomepage(){
  const payload = {
    id:1,
    hero_eyebrow:el("hero_eyebrow").value,
    hero_title:el("hero_title").value,
    hero_text:el("hero_text").value,
    primary_button_text:el("primary_button_text").value,
    secondary_button_text:el("secondary_button_text").value,
    hero_image_url:el("hero_image_url").value || null,
    research_banner_title:el("research_banner_title").value,
    research_banner_text:el("research_banner_text").value,
    research_banner_button:el("research_banner_button").value,
    announcement_text:el("announcement_text").value,
    announcement_visible:el("announcement_visible").value === "true",
    updated_at:new Date().toISOString()
  };

  const { error } = await client
    .from("site_settings")
    .upsert(payload);

  if(error){
    alert(error.message);
    return;
  }

  siteSettings = { ...siteSettings, ...payload };
  flash("Homepage saved");
}

async function saveSettings(){
  const payload = {
    id:1,
    contact_email:el("contact_email").value,
    footer_disclaimer:el("footer_disclaimer").value,
    logo_url:el("logo_url").value || null,
    updated_at:new Date().toISOString()
  };

  const { error } = await client
    .from("site_settings")
    .upsert(payload);

  if(error){
    alert(error.message);
    return;
  }

  siteSettings = { ...siteSettings, ...payload };
  flash("Settings saved");
}



async function loadMerchAdmin(){
  if(!client) return;

  const [itemsResult,variantsResult]=await Promise.all([
    client
      .from("merch_items")
      .select("*")
      .order("sort_order",{ascending:true})
      .order("created_at",{ascending:false}),

    client
      .from("merch_variants")
      .select("*")
      .order("sort_order",{ascending:true})
  ]);

  if(itemsResult.error){
    console.warn(itemsResult.error);
    return;
  }

  merchItems=itemsResult.data||[];
  merchVariants=variantsResult.error?[]:(variantsResult.data||[]);
  renderMerchAdmin();
}

function merchVariantsForItem(itemId){
  return merchVariants.filter(
    variant=>variant.merch_item_id===itemId
  );
}

function renderMerchAdmin(){
  const box=el("merchAdminItems");
  if(!box) return;

  const query=
    (el("merchAdminSearch")?.value||"").trim().toLowerCase();

  const filter=el("merchAdminFilter")?.value||"all";

  const filtered=merchItems.filter(item=>{
    const text=
      `${item.name} ${item.category||""} ${item.description||""}`
        .toLowerCase();

    const matchesSearch=text.includes(query);

    const matchesFilter=
      filter==="all" ||
      (filter==="visible" && item.visible!==false) ||
      (filter==="hidden" && item.visible===false);

    return matchesSearch && matchesFilter;
  });

  if(!filtered.length){
    box.innerHTML='<p class="muted">No merch items yet.</p>';
    return;
  }

  box.innerHTML=filtered.map(item=>{
    const variants=merchVariantsForItem(item.id);

    return `
      <article class="product merch-admin-item">
        <div class="product-head">
          <div>
            <h3>${escapeHtml(item.name||"New Merch Item")}</h3>
            <div class="muted">
              ${item.visible!==false?"Visible":"Hidden"}
            </div>
          </div>
        </div>

        <div class="grid two">
          <div>
            <label>Name</label>
            <input
              data-merch-id="${escapeHtml(item.id)}"
              data-merch-key="name"
              value="${escapeHtml(item.name||"")}"
            >
          </div>

          <div>
            <label>Category</label>
            <input
              data-merch-id="${escapeHtml(item.id)}"
              data-merch-key="category"
              value="${escapeHtml(item.category||"")}"
            >
          </div>
        </div>

        <label>Description</label>
        <textarea
          data-merch-id="${escapeHtml(item.id)}"
          data-merch-key="description"
        >${escapeHtml(item.description||"")}</textarea>

        <div class="grid two">
          <div>
            <label>Base Price</label>
            <input
              type="number"
              step="0.01"
              min="0"
              data-merch-id="${escapeHtml(item.id)}"
              data-merch-key="base_price"
              value="${Number(item.base_price||0)}"
            >
          </div>

          <div>
            <label>Sort Order</label>
            <input
              type="number"
              data-merch-id="${escapeHtml(item.id)}"
              data-merch-key="sort_order"
              value="${Number(item.sort_order||0)}"
            >
          </div>
        </div>

        <label>Image URL</label>
        <input
          data-merch-id="${escapeHtml(item.id)}"
          data-merch-key="image_url"
          value="${escapeHtml(item.image_url||"")}"
        >

        <div class="upload-row">
          <input id="merchImage-${escapeHtml(item.id)}" type="file" accept="image/*">
          <button
            class="btn blue"
            type="button"
            onclick="uploadMerchImage('${escapeHtml(item.id)}')"
          >
            Upload Merch Image
          </button>
        </div>

        <label>Visible</label>
        <select
          data-merch-id="${escapeHtml(item.id)}"
          data-merch-key="visible"
        >
          <option value="true" ${item.visible!==false?"selected":""}>Yes</option>
          <option value="false" ${item.visible===false?"selected":""}>No</option>
        </select>

        <div class="variant-admin">
          <div class="variant-admin-head">
            <h4>Sizes, Colors & Stock</h4>
            <button
              class="btn green"
              type="button"
              onclick="addMerchVariant('${escapeHtml(item.id)}')"
            >
              + Add Option
            </button>
          </div>

          <div class="variant-list">
            ${
              variants.length
                ? variants.map(variant=>`
                    <div class="merch-variant-editor">
                      <input
                        data-merch-variant-id="${escapeHtml(variant.id)}"
                        data-merch-variant-key="label"
                        value="${escapeHtml(variant.label||"")}"
                        placeholder="Option label"
                      >

                      <input
                        data-merch-variant-id="${escapeHtml(variant.id)}"
                        data-merch-variant-key="size"
                        value="${escapeHtml(variant.size||"")}"
                        placeholder="Size"
                      >

                      <input
                        data-merch-variant-id="${escapeHtml(variant.id)}"
                        data-merch-variant-key="color"
                        value="${escapeHtml(variant.color||"")}"
                        placeholder="Color"
                      >

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        data-merch-variant-id="${escapeHtml(variant.id)}"
                        data-merch-variant-key="price"
                        value="${Number(variant.price||0)}"
                        placeholder="Price"
                      >

                      <select
                        data-merch-variant-id="${escapeHtml(variant.id)}"
                        data-merch-variant-key="stock_status"
                      >
                        <option value="available" ${variant.stock_status==="available"?"selected":""}>Available</option>
                        <option value="low_stock" ${variant.stock_status==="low_stock"?"selected":""}>Low Stock</option>
                        <option value="out_of_stock" ${variant.stock_status==="out_of_stock"?"selected":""}>Out of Stock</option>
                        <option value="coming_soon" ${variant.stock_status==="coming_soon"?"selected":""}>Coming Soon</option>
                      </select>

                      <select
                        data-merch-variant-id="${escapeHtml(variant.id)}"
                        data-merch-variant-key="visible"
                      >
                        <option value="true" ${variant.visible!==false?"selected":""}>Visible</option>
                        <option value="false" ${variant.visible===false?"selected":""}>Hidden</option>
                      </select>

                      <button
                        class="btn blue"
                        type="button"
                        onclick="saveMerchVariant('${escapeHtml(variant.id)}')"
                      >
                        Save
                      </button>

                      <button
                        class="btn danger"
                        type="button"
                        onclick="deleteMerchVariant('${escapeHtml(variant.id)}')"
                      >
                        Delete
                      </button>
                    </div>
                  `).join("")
                : '<p class="muted">No options added yet.</p>'
            }
          </div>
        </div>

        <div class="actions">
          <button
            class="btn pink"
            type="button"
            onclick="saveMerchItem('${escapeHtml(item.id)}')"
          >
            Save Merch Item
          </button>

          <button
            class="btn danger"
            type="button"
            onclick="deleteMerchItem('${escapeHtml(item.id)}')"
          >
            Delete
          </button>
        </div>
      </article>
    `;
  }).join("");

  box.querySelectorAll("[data-merch-id]").forEach(node=>{
    const update=event=>{
      const item=merchItems.find(
        current=>String(current.id)===event.target.dataset.merchId
      );

      if(!item) return;

      const key=event.target.dataset.merchKey;
      let value=event.target.value;

      if(key==="visible"){
        value=value==="true";
      }

      if(key==="base_price" || key==="sort_order"){
        value=Number(value||0);
      }

      item[key]=value;
    };

    node.addEventListener("input",update);
    node.addEventListener("change",update);
  });

  box.querySelectorAll("[data-merch-variant-id]").forEach(node=>{
    const update=event=>{
      const variant=merchVariants.find(
        current=>
          String(current.id)===event.target.dataset.merchVariantId
      );

      if(!variant) return;

      const key=event.target.dataset.merchVariantKey;
      let value=event.target.value;

      if(key==="visible"){
        value=value==="true";
      }

      if(key==="price" || key==="sort_order"){
        value=Number(value||0);
      }

      variant[key]=value;
    };

    node.addEventListener("input",update);
    node.addEventListener("change",update);
  });
}

async function addMerchItem(){
  try{
    if(!client){
      client = createClient();
    }

    const { data, error } = await client
      .from("merch_items")
      .insert({
        name:"New Merch Item",
        category:"Apparel",
        description:"",
        image_url:null,
        base_price:0,
        visible:true,
        sort_order:merchItems.length
      })
      .select("*")
      .single();

    if(error){
      throw error;
    }

    merchItems.push(data);
    renderMerchAdmin();
    showPanel("merchPanel");
    flash("Merch item added");
  }catch(error){
    console.error("Add merch item failed:", error);

    let message = error?.message || "The merch item could not be added.";

    if(
      message.includes("merch_items") &&
      (
        message.includes("does not exist") ||
        message.includes("schema cache") ||
        message.includes("relation")
      )
    ){
      message =
        "The merch tables are missing in Supabase. Run supabase-merch-v10.sql in the Supabase SQL Editor, then refresh Admin.";
    }

    alert(message);
  }
}

async function saveMerchItem(id){
  const item=merchItems.find(
    current=>String(current.id)===String(id)
  );

  if(!item) return;

  const {error}=await client
    .from("merch_items")
    .update({
      name:item.name,
      category:item.category||"Merch",
      description:item.description||"",
      image_url:item.image_url||null,
      base_price:Number(item.base_price||0),
      visible:item.visible!==false,
      sort_order:Number(item.sort_order||0),
      updated_at:new Date().toISOString()
    })
    .eq("id",item.id);

  if(error){
    alert(error.message);
    return;
  }

  flash("Merch item saved");
  await loadMerchAdmin();
}

async function deleteMerchItem(id){
  if(!confirm("Delete this merch item?")) return;

  const {error}=await client
    .from("merch_items")
    .delete()
    .eq("id",id);

  if(error){
    alert(error.message);
    return;
  }

  await loadMerchAdmin();
  flash("Merch item deleted");
}

async function addMerchVariant(itemId){
  const {data,error}=await client
    .from("merch_variants")
    .insert({
      merch_item_id:itemId,
      label:"Standard",
      size:"",
      color:"",
      price:0,
      stock_status:"available",
      visible:true,
      sort_order:merchVariantsForItem(itemId).length
    })
    .select()
    .single();

  if(error){
    alert(error.message);
    return;
  }

  merchVariants.push(data);
  renderMerchAdmin();
  flash("Merch option added");
}

async function saveMerchVariant(id){
  const variant=merchVariants.find(
    current=>String(current.id)===String(id)
  );

  if(!variant) return;

  const {error}=await client
    .from("merch_variants")
    .update({
      label:variant.label||"Standard",
      size:variant.size||null,
      color:variant.color||null,
      price:Number(variant.price||0),
      stock_status:variant.stock_status||"available",
      visible:variant.visible!==false,
      sort_order:Number(variant.sort_order||0),
      updated_at:new Date().toISOString()
    })
    .eq("id",variant.id);

  if(error){
    alert(error.message);
    return;
  }

  flash("Merch option saved");
  await loadMerchAdmin();
}

async function deleteMerchVariant(id){
  if(!confirm("Delete this merch option?")) return;

  const {error}=await client
    .from("merch_variants")
    .delete()
    .eq("id",id);

  if(error){
    alert(error.message);
    return;
  }

  await loadMerchAdmin();
  flash("Merch option deleted");
}

async function uploadMerchImage(itemId){
  try{
    const input=el(`merchImage-${itemId}`);
    const file=input?.files?.[0];

    if(!file){
      throw new Error("Choose an image first.");
    }

    flash("Optimizing merch image...");

    const optimized=await optimizeImage(file,1400,0.86);
    const path=`merch/${itemId}-${crypto.randomUUID()}.webp`;
    const publicUrl=await uploadFile(path,optimized,"image/webp");

    const {error}=await client
      .from("merch_items")
      .update({
        image_url:publicUrl,
        updated_at:new Date().toISOString()
      })
      .eq("id",itemId);

    if(error){
      throw error;
    }

    await loadMerchAdmin();
    flash("Merch image uploaded");
  }catch(error){
    console.error(error);
    alert(error.message||"Merch image upload failed.");
  }
}


async function loadOrderFormItems(){
  if(!client) return;

  const [itemsResult,variantsResult]=await Promise.all([
    client
      .from("order_form_items")
      .select("*")
      .order("sort_order",{ascending:true})
      .order("created_at",{ascending:false}),

    client
      .from("order_form_item_variants")
      .select("*")
      .order("sort_order",{ascending:true})
  ]);

  if(itemsResult.error){
    console.warn(itemsResult.error);
    return;
  }

  orderFormItems=itemsResult.data||[];
  orderFormItemVariants=
    variantsResult.error?[]:(variantsResult.data||[]);

  renderOrderFormItems();
}

function orderVariantsForItem(itemId){
  return orderFormItemVariants.filter(
    variant=>variant.order_form_item_id===itemId
  );
}

function renderOrderFormItems(){
  const box=el("orderFormItems");
  if(!box) return;

  const query=
    (el("orderItemSearch")?.value||"").trim().toLowerCase();

  const filter=
    el("orderItemFilter")?.value||"all";

  const filtered=orderFormItems.filter(item=>{
    const text=
      `${item.name} ${item.category||""} ${item.description||""}`
        .toLowerCase();

    const matchesSearch=text.includes(query);

    const matchesFilter=
      filter==="all" ||
      (filter==="visible" && item.visible!==false) ||
      (filter==="hidden" && item.visible===false);

    return matchesSearch && matchesFilter;
  });

  if(!filtered.length){
    box.innerHTML=
      '<p class="muted">No order form items yet.</p>';
    return;
  }

  box.innerHTML=filtered.map(item=>{
    const variants=orderVariantsForItem(item.id);

    return `
      <article class="product order-form-admin-item">
        <div class="product-head">
          <div>
            <h3>${escapeHtml(item.name||"New Order Item")}</h3>
            <div class="muted">
              ${item.visible!==false ? "Visible on order form" : "Hidden"}
            </div>
          </div>

          <div class="order-item-position">
            Sort: ${Number(item.sort_order||0)}
          </div>
        </div>

        <div class="grid two">
          <div>
            <label>Name</label>
            <input
              data-order-item-id="${escapeHtml(item.id)}"
              data-order-item-key="name"
              value="${escapeHtml(item.name||"")}"
            >
          </div>

          <div>
            <label>Category</label>
            <input
              data-order-item-id="${escapeHtml(item.id)}"
              data-order-item-key="category"
              value="${escapeHtml(item.category||"")}"
            >
          </div>
        </div>

        <label>Description</label>
        <textarea
          data-order-item-id="${escapeHtml(item.id)}"
          data-order-item-key="description"
        >${escapeHtml(item.description||"")}</textarea>

        <label>Image URL</label>
        <input
          data-order-item-id="${escapeHtml(item.id)}"
          data-order-item-key="image_url"
          value="${escapeHtml(item.image_url||"")}"
        >

        <div class="grid two">
          <div>
            <label>Visible</label>
            <select
              data-order-item-id="${escapeHtml(item.id)}"
              data-order-item-key="visible"
            >
              <option value="true" ${item.visible!==false?"selected":""}>
                Yes
              </option>
              <option value="false" ${item.visible===false?"selected":""}>
                No
              </option>
            </select>
          </div>

          <div>
            <label>Sort order</label>
            <input
              type="number"
              data-order-item-id="${escapeHtml(item.id)}"
              data-order-item-key="sort_order"
              value="${Number(item.sort_order||0)}"
            >
          </div>
        </div>

        <div class="variant-admin">
          <div class="variant-admin-head">
            <h4>Strengths & Stock</h4>

            <button
              class="btn green"
              type="button"
              onclick="addOrderFormItemVariant('${escapeHtml(item.id)}')"
            >
              + Add Strength
            </button>
          </div>

          <div class="variant-list">
            ${
              variants.length
                ? variants.map(variant=>`
                    <div class="variant-editor">
                      <input
                        data-order-form-variant-id="${escapeHtml(variant.id)}"
                        data-order-form-variant-key="strength"
                        value="${escapeHtml(variant.strength||"")}"
                        placeholder="Strength"
                      >

                      <select
                        data-order-form-variant-id="${escapeHtml(variant.id)}"
                        data-order-form-variant-key="stock_status"
                      >
                        <option value="available" ${variant.stock_status==="available"?"selected":""}>Available</option>
                        <option value="low_stock" ${variant.stock_status==="low_stock"?"selected":""}>Low Stock</option>
                        <option value="out_of_stock" ${variant.stock_status==="out_of_stock"?"selected":""}>Out of Stock</option>
                        <option value="coming_soon" ${variant.stock_status==="coming_soon"?"selected":""}>Coming Soon</option>
                      </select>

                      <select
                        data-order-form-variant-id="${escapeHtml(variant.id)}"
                        data-order-form-variant-key="visible"
                      >
                        <option value="true" ${variant.visible!==false?"selected":""}>Visible</option>
                        <option value="false" ${variant.visible===false?"selected":""}>Hidden</option>
                      </select>

                      <input
                        type="number"
                        data-order-form-variant-id="${escapeHtml(variant.id)}"
                        data-order-form-variant-key="sort_order"
                        value="${Number(variant.sort_order||0)}"
                        title="Sort order"
                      >

                      <button
                        class="btn blue"
                        type="button"
                        onclick="saveOrderFormItemVariant('${escapeHtml(variant.id)}')"
                      >
                        Save
                      </button>

                      <button
                        class="btn danger"
                        type="button"
                        onclick="deleteOrderFormItemVariant('${escapeHtml(variant.id)}')"
                      >
                        Delete
                      </button>
                    </div>
                  `).join("")
                : '<p class="muted">No options added yet.</p>'
            }
          </div>
        </div>

        <div class="actions">
          <button
            class="btn pink"
            type="button"
            onclick="saveOrderFormItem('${escapeHtml(item.id)}')"
          >
            Save Item
          </button>

          <button
            class="btn danger"
            type="button"
            onclick="deleteOrderFormItem('${escapeHtml(item.id)}')"
          >
            Delete Item
          </button>
        </div>
      </article>
    `;
  }).join("");

  box.querySelectorAll("[data-order-item-id]").forEach(node=>{
    const update=event=>{
      const item=orderFormItems.find(
        current=>
          String(current.id)===event.target.dataset.orderItemId
      );

      if(!item) return;

      const key=event.target.dataset.orderItemKey;
      let value=event.target.value;

      if(key==="visible"){
        value=value==="true";
      }

      if(key==="sort_order"){
        value=Number(value||0);
      }

      item[key]=value;
    };

    node.addEventListener("input",update);
    node.addEventListener("change",update);
  });

  box
    .querySelectorAll("[data-order-form-variant-id]")
    .forEach(node=>{
      const update=event=>{
        const variant=orderFormItemVariants.find(
          current=>
            String(current.id)===
            event.target.dataset.orderFormVariantId
        );

        if(!variant) return;

        const key=event.target.dataset.orderFormVariantKey;
        let value=event.target.value;

        if(key==="visible"){
          value=value==="true";
        }

        if(key==="sort_order"){
          value=Number(value||0);
        }

        variant[key]=value;
      };

      node.addEventListener("input",update);
      node.addEventListener("change",update);
    });
}

async function addOrderFormItem(){
  try{
    if(!client){
      client=createClient();
    }

    const {data,error}=await client
      .from("order_form_items")
      .insert({
        name:"New Order Item",
        category:"Research Material",
        description:"",
        image_url:null,
        visible:true,
        sort_order:orderFormItems.length
      })
      .select()
      .single();

    if(error){
      throw error;
    }

    orderFormItems.push(data);

    const variantResult=await client
      .from("order_form_item_variants")
      .insert({
        order_form_item_id:data.id,
        strength:"Standard",
        stock_status:"available",
        visible:true,
        sort_order:0
      })
      .select()
      .single();

    if(!variantResult.error && variantResult.data){
      orderFormItemVariants.push(variantResult.data);
    }

    renderOrderFormItems();
    showPanel("orderItemsPanel");
    flash("Order item added");
  }catch(error){
    console.error(error);
    alert(error.message||"Order item could not be added.");
  }
}

async function saveOrderFormItem(id){
  const item=orderFormItems.find(
    current=>String(current.id)===String(id)
  );

  if(!item) return;

  const {error}=await client
    .from("order_form_items")
    .update({
      name:item.name,
      category:item.category||"Research Material",
      description:item.description||"",
      image_url:item.image_url||null,
      visible:item.visible!==false,
      sort_order:Number(item.sort_order||0),
      updated_at:new Date().toISOString()
    })
    .eq("id",item.id);

  if(error){
    alert(error.message);
    return;
  }

  flash("Order item saved");
  await loadOrderFormItems();
}

async function deleteOrderFormItem(id){
  if(!confirm("Delete this order item?")) return;

  const {error}=await client
    .from("order_form_items")
    .delete()
    .eq("id",id);

  if(error){
    alert(error.message);
    return;
  }

  orderFormItems=orderFormItems.filter(
    item=>String(item.id)!==String(id)
  );

  orderFormItemVariants=orderFormItemVariants.filter(
    variant=>
      String(variant.order_form_item_id)!==String(id)
  );

  renderOrderFormItems();
  flash("Order item deleted");
}

async function addOrderFormItemVariant(itemId){
  const {data,error}=await client
    .from("order_form_item_variants")
    .insert({
      order_form_item_id:itemId,
      strength:"New option",
      stock_status:"available",
      visible:true,
      sort_order:orderVariantsForItem(itemId).length
    })
    .select()
    .single();

  if(error){
    alert(error.message);
    return;
  }

  orderFormItemVariants.push(data);
  renderOrderFormItems();
  flash("Option added");
}

async function saveOrderFormItemVariant(id){
  const variant=orderFormItemVariants.find(
    current=>String(current.id)===String(id)
  );

  if(!variant) return;

  const {error}=await client
    .from("order_form_item_variants")
    .update({
      strength:variant.strength,
      stock_status:variant.stock_status,
      visible:variant.visible!==false,
      sort_order:Number(variant.sort_order||0),
      updated_at:new Date().toISOString()
    })
    .eq("id",variant.id);

  if(error){
    alert(error.message);
    return;
  }

  flash("Option saved");
  await loadOrderFormItems();
}

async function deleteOrderFormItemVariant(id){
  if(!confirm("Delete this option?")) return;

  const {error}=await client
    .from("order_form_item_variants")
    .delete()
    .eq("id",id);

  if(error){
    alert(error.message);
    return;
  }

  orderFormItemVariants=orderFormItemVariants.filter(
    variant=>String(variant.id)!==String(id)
  );

  renderOrderFormItems();
  flash("Option deleted");
}


async function loadOrderRequests(){
  if(!client)return;
  const [r,i]=await Promise.all([client.from("order_requests").select("*").order("created_at",{ascending:false}),client.from("order_request_items").select("*").order("created_at",{ascending:true})]);
  if(r.error){console.warn(r.error);return}
  orderRequests=r.data||[];orderRequestItems=i.error?[]:(i.data||[]);renderOrderRequests()
}
function renderOrderRequests(){
  const box=el("adminOrders");if(!box)return;
  const q=(el("orderAdminSearch")?.value||"").trim().toLowerCase(),f=el("orderAdminFilter")?.value||"all";
  const list=orderRequests.filter(o=>{const items=orderRequestItems.filter(i=>i.order_request_id===o.id),text=`${o.name} ${o.email} ${o.company||""} ${o.phone||""} ${o.notes||""} ${items.map(i=>`${i.product_name} ${i.strength}`).join(" ")}`.toLowerCase();return text.includes(q)&&(f==="all"||o.status===f)});
  if(!list.length){box.innerHTML='<p class="muted">No matching order requests.</p>';return}
  box.innerHTML=list.map(o=>{const items=orderRequestItems.filter(i=>i.order_request_id===o.id),date=o.created_at?new Date(o.created_at).toLocaleString():"";return `<article class="order-admin-item"><div class="inquiry-head"><div><h3>${escapeHtml(o.name)}</h3><div class="inquiry-date">${escapeHtml(date)}</div></div><span class="inquiry-badge ${escapeHtml(o.status||"new")}">${escapeHtml(o.status||"new")}</span></div><div class="inquiry-meta"><div><span>Email</span><a href="mailto:${escapeHtml(o.email)}">${escapeHtml(o.email)}</a></div><div><span>Company</span>${escapeHtml(o.company||"Not provided")}</div><div><span>Phone</span>${escapeHtml(o.phone||"Not provided")}</div></div><div class="order-admin-products">${items.map(i=>`<div><strong>${escapeHtml(i.product_name)}</strong><span>${escapeHtml(i.strength)} × ${i.quantity}</span></div>`).join("")}</div>
${o.invoice_number ? `
  <div class="order-invoice-summary">
    <div>
      <span>Draft Invoice</span>
      <strong>${escapeHtml(o.invoice_number)}</strong>
    </div>
    <div>
      <span>Invoice Total</span>
      <strong>$${Number(o.invoice_total||0).toFixed(2)}</strong>
    </div>
  </div>
` : ""}
${o.notes?`<div class="inquiry-message">${escapeHtml(o.notes)}</div>`:""}<div class="actions">
${o.invoice_id
  ? `<a class="btn pink" href="/invoice-admin.html?invoice=${escapeHtml(o.invoice_id)}">Open Invoice</a>`
  : `<a class="btn pink" href="/invoice-admin.html?request=${escapeHtml(o.id)}">Create Invoice</a>`
}
<a class="btn" href="mailto:${escapeHtml(o.email)}?subject=${encodeURIComponent("Re: Neon Peppers order request")}">Reply</a><button class="btn blue" onclick="updateOrderStatus('${escapeHtml(o.id)}','contacted')">Contacted</button><button class="btn green" onclick="updateOrderStatus('${escapeHtml(o.id)}','approved')">Approved</button><button class="btn" onclick="updateOrderStatus('${escapeHtml(o.id)}','closed')">Close</button><button class="btn danger" onclick="deleteOrderRequest('${escapeHtml(o.id)}')">Delete</button></div></article>`}).join("")
}
async function updateOrderStatus(id,status){const {error}=await client.from("order_requests").update({status,updated_at:new Date().toISOString()}).eq("id",id);if(error){alert(error.message);return}await loadOrderRequests();flash(`Order request marked ${status}`)}
async function deleteOrderRequest(id){if(!confirm("Delete this order request?"))return;const {error}=await client.from("order_requests").delete().eq("id",id);if(error){alert(error.message);return}await loadOrderRequests();flash("Order request deleted")}

async function loadInquiries(){
  if(!client) return;

  const { data, error } = await client
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending:false });

  if(error){
    console.warn(error);
    return;
  }

  inquiries = data || [];
  renderInquiries();
}

function renderInquiries(){
  const box = el("inquiries");
  if(!box) return;

  const query = (el("inquirySearch")?.value || "").trim().toLowerCase();
  const filter = el("inquiryFilter")?.value || "all";

  const filtered = inquiries.filter(inquiry => {
    const searchable = `${inquiry.name} ${inquiry.email} ${inquiry.company || ""} ${inquiry.product || ""} ${inquiry.message || ""}`.toLowerCase();
    const matchesSearch = searchable.includes(query);
    const matchesFilter = filter === "all" || inquiry.status === filter;
    return matchesSearch && matchesFilter;
  });

  if(!filtered.length){
    box.innerHTML = '<p class="muted">No matching inquiries.</p>';
    return;
  }

  box.innerHTML = filtered.map(inquiry => {
    const date = inquiry.created_at
      ? new Date(inquiry.created_at).toLocaleString()
      : "";

    const status = inquiry.status || "new";

    return `
      <article class="inquiry-item">
        <div class="inquiry-head">
          <div>
            <h3>${escapeHtml(inquiry.name)}</h3>
            <div class="inquiry-date">${escapeHtml(date)}</div>
          </div>
          <span class="inquiry-badge ${escapeHtml(status)}">${escapeHtml(status)}</span>
        </div>

        <div class="inquiry-meta">
          <div><span>Email</span><a href="mailto:${escapeHtml(inquiry.email)}">${escapeHtml(inquiry.email)}</a></div>
          <div><span>Company</span>${escapeHtml(inquiry.company || "Not provided")}</div>
          <div><span>Product</span>${escapeHtml(inquiry.product || "General inquiry")}</div>
        </div>

        <div class="inquiry-message">${escapeHtml(inquiry.message)}</div>

        <div class="actions">
          <a class="btn pink" href="mailto:${escapeHtml(inquiry.email)}?subject=${encodeURIComponent("Re: Neon Peppers inquiry")}">Reply by Email</a>
          <button class="btn blue" onclick="updateInquiryStatus('${escapeHtml(inquiry.id)}','replied')">Mark Replied</button>
          <button class="btn" onclick="updateInquiryStatus('${escapeHtml(inquiry.id)}','closed')">Close</button>
          <button class="btn danger" onclick="deleteInquiry('${escapeHtml(inquiry.id)}')">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

async function updateInquiryStatus(id, status){
  const { error } = await client
    .from("inquiries")
    .update({ status, updated_at:new Date().toISOString() })
    .eq("id", id);

  if(error){
    alert(error.message);
    return;
  }

  await loadInquiries();
  flash(`Inquiry marked ${status}`);
}

async function deleteInquiry(id){
  if(!confirm("Delete this inquiry?")) return;

  const { error } = await client
    .from("inquiries")
    .delete()
    .eq("id", id);

  if(error){
    alert(error.message);
    return;
  }

  await loadInquiries();
  flash("Inquiry deleted");
}


function flash(message){
  const box = el("status");

  box.textContent = message;
  box.style.display = "block";

  window.setTimeout(() => {
    box.style.display = "none";
  }, 1900);
}

document.addEventListener("DOMContentLoaded", init);
