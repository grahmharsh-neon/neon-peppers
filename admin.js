let client = null;
let products = [];
let siteSettings = null;
let inquiries = [];
let productVariants = [];
let orderRequests = [];
let orderRequestItems = [];

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

async function init(){
  bindEvents();

  try{
    client = createClient();

    const {
      data: { session }
    } = await client.auth.getSession();

    if(session){
      await showAdmin();
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
  el("uploadLogoButton").addEventListener("click", uploadLogo);
  el("adminProductSearch").addEventListener("input", renderProducts);
  el("adminProductFilter").addEventListener("change", renderProducts);


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
}

async function refreshAll(){
  await Promise.all([
    loadProducts(),
    loadSettings(),
    loadInquiries(),
    loadProductVariants(),
    loadOrderRequests()
  ]);
  updateStats();
  flash("Dashboard refreshed");
}

function showPanel(panelId){
  document.querySelectorAll(".panel-view").forEach(panel => {
    panel.classList.toggle("active", panel.id === panelId);
  });
}

async function loadProducts(){
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
    "logo_url"
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
  updateImagePreview("logoPreview", siteSettings.logo_url);
}

function updateStats(){
  el("statTotal").textContent = products.length;
  el("statVisible").textContent = products.filter(product => product.visible !== false).length;
  el("statFeatured").textContent = products.filter(product => product.featured === true).length;
  el("statCoa").textContent = products.filter(product => Boolean(product.coa_url)).length;
}

function escapeHtml(value){
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderProducts(){
  const box = el("products");
  const query = el("adminProductSearch").value.trim().toLowerCase();
  const filter = el("adminProductFilter").value;

  const filtered = products.filter(product => {
    const searchable = `${product.name} ${product.category} ${product.description}`.toLowerCase();
    const matchesSearch = searchable.includes(query);

    let matchesFilter = true;

    if(filter === "visible"){
      matchesFilter = product.visible !== false;
    }else if(filter === "hidden"){
      matchesFilter = product.visible === false;
    }else if(filter === "featured"){
      matchesFilter = product.featured === true;
    }

    return matchesSearch && matchesFilter;
  });

  box.innerHTML = "";

  if(!filtered.length){
    box.innerHTML = '<p class="muted">No matching products.</p>';
    return;
  }

  filtered.forEach(product => {
    const index = products.indexOf(product);
    const row = document.createElement("article");
    row.className = "product";

    row.innerHTML = `
      <div class="product-head">
        <h3>${escapeHtml(product.name || "New Product")}</h3>
        <span class="muted">${product.id ? "Saved product" : "Unsaved product"}</span>
      </div>

      <div class="grid two">
        <div>
          <label>Name</label>
          <input data-index="${index}" data-key="name" value="${escapeHtml(product.name)}">
        </div>

        <div>
          <label>Category</label>
          <input data-index="${index}" data-key="category" value="${escapeHtml(product.category)}">
        </div>

        <div>
          <label>Strength</label>
          <input data-index="${index}" data-key="strength" value="${escapeHtml(product.strength)}">
        </div>

        <div>
          <label>Status</label>
          <select data-index="${index}" data-key="status">
            <option value="available" ${product.status === "available" || !product.status ? "selected" : ""}>Available</option>
            <option value="coming_soon" ${product.status === "coming_soon" ? "selected" : ""}>Coming Soon</option>
            <option value="out_of_stock" ${product.status === "out_of_stock" ? "selected" : ""}>Out of Stock</option>
          </select>
        </div>
      </div>

      <label>Description</label>
      <textarea data-index="${index}" data-key="description">${escapeHtml(product.description)}</textarea>

      <div class="grid two">
        <div>
          <label>Visible</label>
          <select data-index="${index}" data-key="visible">
            <option value="true" ${product.visible !== false ? "selected" : ""}>Yes</option>
            <option value="false" ${product.visible === false ? "selected" : ""}>No</option>
          </select>
        </div>

        <div>
          <label>Featured</label>
          <select data-index="${index}" data-key="featured">
            <option value="false" ${product.featured !== true ? "selected" : ""}>No</option>
            <option value="true" ${product.featured === true ? "selected" : ""}>Yes</option>
          </select>
        </div>
      </div>

      <label>Product image URL</label>
      <input data-index="${index}" data-key="image_url" value="${escapeHtml(product.image_url)}">

      <div class="upload-row">
        <input id="productImage-${index}" type="file" accept="image/*">
        <button class="btn blue" onclick="uploadProductImage(${index})">Upload Product Image</button>
      </div>

      ${product.image_url
        ? `<img class="product-image" src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}">`
        : ""
      }

      <div class="variant-admin"><div class="variant-admin-head"><h4>Strengths & Stock</h4><button class="btn green" type="button" onclick="addVariant(${index})">+ Add Strength</button></div><div id="variants-${index}" class="variant-list"></div></div>

      <label>COA URL</label>
      <input data-index="${index}" data-key="coa_url" value="${escapeHtml(product.coa_url)}">

      <div class="upload-row">
        <input id="coaFile-${index}" type="file" accept="application/pdf">
        <button class="btn blue" onclick="uploadCoa(${index})">Upload COA PDF</button>
      </div>

      <div class="actions">
        <button class="btn pink" onclick="saveProduct(${index})">Save Product</button>
        <button class="btn danger" onclick="deleteProduct(${index})">Delete</button>
      </div>
    `;

    box.appendChild(row);
    renderVariantsForProduct(index);
  });

  box.querySelectorAll("[data-index]").forEach(node => {
    const update = event => {
      const index = Number(event.target.dataset.index);
      const key = event.target.dataset.key;

      if(!products[index]){
        return;
      }

      let value = event.target.value;

      if(key === "visible" || key === "featured"){
        value = value === "true";
      }

      products[index][key] = value;
    };

    node.addEventListener("input", update);
    node.addEventListener("change", update);
  });
}

function addProduct(){
  products.unshift({
    id:null,
    name:"New Product",
    category:"Research Compound",
    description:"",
    strength:"",
    image_url:"",
    coa_url:"",
    visible:true,
    featured:false,
    status:"available"
  });

  renderProducts();
  updateStats();
  showPanel("productsPanel");
}

async function saveProduct(index){
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
    strength:product.strength || "",
    image_url:product.image_url || null,
    coa_url:product.coa_url || null,
    visible:product.visible !== false,
    featured:product.featured === true,
    status:product.status || "available",
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

async function deleteProduct(index){
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



async function loadProductVariants(){
  if(!client) return;
  const {data,error}=await client.from("product_variants").select("*").order("sort_order",{ascending:true});
  if(error){console.warn(error);return}
  productVariants=data||[];
  renderProducts();
}
function variantsForProduct(productId){return productVariants.filter(v=>v.product_id===productId)}
function renderVariantsForProduct(index){
  const product=products[index],box=el(`variants-${index}`);
  if(!product||!box)return;
  if(!product.id){box.innerHTML='<p class="muted">Save the product before adding strengths.</p>';return}
  const list=variantsForProduct(product.id);
  if(!list.length){box.innerHTML='<p class="muted">No strengths added yet.</p>';return}
  box.innerHTML=list.map(v=>`<div class="variant-editor"><input data-variant-id="${escapeHtml(v.id)}" data-variant-key="strength" value="${escapeHtml(v.strength)}"><select data-variant-id="${escapeHtml(v.id)}" data-variant-key="stock_status"><option value="available" ${v.stock_status==="available"?"selected":""}>Available</option><option value="low_stock" ${v.stock_status==="low_stock"?"selected":""}>Low Stock</option><option value="out_of_stock" ${v.stock_status==="out_of_stock"?"selected":""}>Out of Stock</option><option value="coming_soon" ${v.stock_status==="coming_soon"?"selected":""}>Coming Soon</option></select><select data-variant-id="${escapeHtml(v.id)}" data-variant-key="visible"><option value="true" ${v.visible!==false?"selected":""}>Visible</option><option value="false" ${v.visible===false?"selected":""}>Hidden</option></select><button class="btn blue" onclick="saveVariant('${escapeHtml(v.id)}')">Save</button><button class="btn danger" onclick="deleteVariant('${escapeHtml(v.id)}')">Delete</button></div>`).join("");
  box.querySelectorAll("[data-variant-id]").forEach(node=>{const update=e=>{const v=productVariants.find(x=>String(x.id)===e.target.dataset.variantId);if(!v)return;let value=e.target.value;if(e.target.dataset.variantKey==="visible")value=value==="true";v[e.target.dataset.variantKey]=value};node.addEventListener("input",update);node.addEventListener("change",update)})
}
async function addVariant(index){
  const product=products[index];
  if(!product?.id){alert("Save the product before adding strengths.");return}
  const {data,error}=await client.from("product_variants").insert({product_id:product.id,strength:"New strength",stock_status:"available",visible:true,sort_order:variantsForProduct(product.id).length}).select().single();
  if(error){alert(error.message);return}
  productVariants.push(data);renderVariantsForProduct(index);flash("Strength added")
}
async function saveVariant(id){
  const v=productVariants.find(x=>String(x.id)===String(id));if(!v)return;
  const {error}=await client.from("product_variants").update({strength:v.strength,stock_status:v.stock_status,visible:v.visible!==false,sort_order:v.sort_order||0,updated_at:new Date().toISOString()}).eq("id",v.id);
  if(error){alert(error.message);return}flash("Strength saved")
}
async function deleteVariant(id){
  if(!confirm("Delete this strength?"))return;
  const {error}=await client.from("product_variants").delete().eq("id",id);
  if(error){alert(error.message);return}
  productVariants=productVariants.filter(x=>String(x.id)!==String(id));renderProducts();flash("Strength deleted")
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
  box.innerHTML=list.map(o=>{const items=orderRequestItems.filter(i=>i.order_request_id===o.id),date=o.created_at?new Date(o.created_at).toLocaleString():"";return `<article class="order-admin-item"><div class="inquiry-head"><div><h3>${escapeHtml(o.name)}</h3><div class="inquiry-date">${escapeHtml(date)}</div></div><span class="inquiry-badge ${escapeHtml(o.status||"new")}">${escapeHtml(o.status||"new")}</span></div><div class="inquiry-meta"><div><span>Email</span><a href="mailto:${escapeHtml(o.email)}">${escapeHtml(o.email)}</a></div><div><span>Company</span>${escapeHtml(o.company||"Not provided")}</div><div><span>Phone</span>${escapeHtml(o.phone||"Not provided")}</div></div><div class="order-admin-products">${items.map(i=>`<div><strong>${escapeHtml(i.product_name)}</strong><span>${escapeHtml(i.strength)} × ${i.quantity}</span></div>`).join("")}</div>${o.notes?`<div class="inquiry-message">${escapeHtml(o.notes)}</div>`:""}<div class="actions"><a class="btn pink" href="mailto:${escapeHtml(o.email)}?subject=${encodeURIComponent("Re: Neon Peppers order request")}">Reply</a><button class="btn blue" onclick="updateOrderStatus('${escapeHtml(o.id)}','contacted')">Contacted</button><button class="btn green" onclick="updateOrderStatus('${escapeHtml(o.id)}','approved')">Approved</button><button class="btn" onclick="updateOrderStatus('${escapeHtml(o.id)}','closed')">Close</button><button class="btn danger" onclick="deleteOrderRequest('${escapeHtml(o.id)}')">Delete</button></div></article>`}).join("")
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
