(() => {
  "use strict";

  let rows = [];
  let current = null;
  let coaClient = null;

  const $ = id => document.getElementById(id);

  const esc = value =>
    String(value || "").replace(/[&<>"']/g, char => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[char]));

  function getClient(){
    if(coaClient) return coaClient;

    if(typeof client !== "undefined" && client){
      coaClient = client;
      return coaClient;
    }

    const config = window.NEON_CONFIG || {};

    if(!window.supabase){
      throw new Error("Supabase library did not load.");
    }

    if(!config.supabaseUrl || !config.supabasePublishableKey){
      throw new Error("Supabase settings are missing from config.js.");
    }

    coaClient = window.supabase.createClient(
      config.supabaseUrl.trim(),
      config.supabasePublishableKey.trim()
    );

    return coaClient;
  }

  function productList(){
    return Array.isArray(window.products)
      ? window.products
      : (typeof products !== "undefined" && Array.isArray(products) ? products : []);
  }

  async function ensureProducts(){
    let list = productList();

    if(list.length) return list;

    const db = getClient();
    const result = await db
      .from("products")
      .select("*")
      .order("name",{ascending:true});

    if(result.error) throw result.error;

    if(typeof products !== "undefined"){
      products = result.data || [];
    }

    return result.data || [];
  }

  function productName(id){
    return productList().find(item => String(item.id) === String(id))?.name || "Unknown Product";
  }

  function fileLabel(item){
    const value = String(item?.file_type || item?.file_url || "").toLowerCase();
    if(value.includes("pdf")) return "PDF";
    if(value.includes("png")) return "PNG";
    if(value.includes("jpg") || value.includes("jpeg")) return "JPG";
    return item?.file_url ? "FILE" : "NO FILE";
  }

  async function load(){
    try{
      const db = getClient();
      await ensureProducts();

      const result = await db
        .from("product_coas")
        .select("*")
        .order("sort_order",{ascending:true})
        .order("created_at",{ascending:false});

      if(result.error) throw result.error;

      rows = result.data || [];
      render();
      fillProductSelect();
    }catch(error){
      console.error("COA load error:", error);

      const box = $("coaList");
      if(box){
        box.innerHTML = `
          <div class="coa-error-card">
            <strong>COAs could not be loaded.</strong>
            <p>${esc(error.message || "Unknown error")}</p>
            <p>Run <code>supabase-coa-library-v16-4.sql</code> in Supabase, then refresh this page.</p>
          </div>
        `;
      }
    }
  }

  function fillProductSelect(){
    const select = $("coaProduct");
    if(!select) return;

    const selected = select.value;
    const list = productList();

    select.innerHTML =
      '<option value="">Select a product</option>' +
      list.map(item => `
        <option value="${esc(item.id)}">${esc(item.name)}</option>
      `).join("");

    if(selected) select.value = selected;
  }

  function render(){
    const box = $("coaList");
    if(!box) return;

    const query = ($("coaSearch")?.value || "").toLowerCase();
    const filter = $("coaFilter")?.value || "all";

    const filtered = rows.filter(item => {
      const text = `
        ${productName(item.product_id)}
        ${item.strength || ""}
        ${item.lot_number || ""}
        ${item.batch_number || ""}
        ${item.lab_name || ""}
      `.toLowerCase();

      return text.includes(query) &&
        (
          filter === "all" ||
          (filter === "public" && item.is_public !== false) ||
          (filter === "private" && item.is_public === false)
        );
    });

    if(!filtered.length){
      box.innerHTML = '<p class="muted">No matching COAs.</p>';
      return;
    }

    box.innerHTML = filtered.map(item => `
      <article class="coa-admin-card">
        <div class="coa-admin-head">
          <div>
            <h3>${esc(productName(item.product_id))}</h3>
            <div class="muted">
              ${esc(item.strength || "No strength")}
              ${item.lot_number ? ` · Lot ${esc(item.lot_number)}` : ""}
            </div>
          </div>

          <div>
            <span class="coa-file-badge">${fileLabel(item)}</span>
            <span class="coa-visibility-badge ${item.is_public === false ? "private" : "public"}">
              ${item.is_public === false ? "Admin Only" : "Public"}
            </span>
          </div>
        </div>

        <div class="coa-admin-meta">
          <div><span>Lab</span><strong>${esc(item.lab_name || "Not provided")}</strong></div>
          <div><span>Test Date</span><strong>${esc(item.test_date || "Not provided")}</strong></div>
          <div><span>Purity</span><strong>${item.purity_percent != null ? Number(item.purity_percent).toFixed(2) + "%" : "Not provided"}</strong></div>
          <div><span>Batch</span><strong>${esc(item.batch_number || "Not provided")}</strong></div>
        </div>

        <div class="actions">
          <button class="btn blue" type="button" data-coa-edit="${esc(item.id)}">Edit</button>
          ${item.file_url ? `<a class="btn" href="${esc(item.file_url)}" target="_blank" rel="noopener">View</a>` : ""}
          <button class="btn danger" type="button" data-coa-delete="${esc(item.id)}">Delete</button>
        </div>
      </article>
    `).join("");
  }

  function newRecord(){
    return {
      id:null,
      product_id:"",
      strength:"",
      lot_number:"",
      batch_number:"",
      lab_name:"",
      purity_percent:null,
      test_date:null,
      expiration_date:null,
      is_public:true,
      sort_order:0,
      notes:"",
      file_url:null,
      file_path:null,
      file_type:null,
      original_file_name:null
    };
  }

  async function openNew(){
    try{
      await ensureProducts();
      current = newRecord();
      fillEditor();
    }catch(error){
      console.error(error);
      alert(error.message || "The COA editor could not be opened.");
    }
  }

  function openExisting(id){
    const found = rows.find(item => String(item.id) === String(id));
    if(!found) return;
    current = {...found};
    fillEditor();
  }

  function fillEditor(){
    if(!current) return;

    fillProductSelect();

    $("coaTitle").textContent = current.id ? "Edit COA" : "Add COA";
    $("coaProduct").value = current.product_id || "";
    $("coaStrength").value = current.strength || "";
    $("coaLot").value = current.lot_number || "";
    $("coaBatch").value = current.batch_number || "";
    $("coaLab").value = current.lab_name || "";
    $("coaPurity").value = current.purity_percent ?? "";
    $("coaTestDate").value = current.test_date || "";
    $("coaExpiration").value = current.expiration_date || "";
    $("coaPublic").value = current.is_public === false ? "false" : "true";
    $("coaSort").value = Number(current.sort_order || 0);
    $("coaNotes").value = current.notes || "";
    $("coaFile").value = "";
    $("coaBadge").textContent = fileLabel(current);
    $("coaCurrent").innerHTML = current.file_url
      ? `<a href="${esc(current.file_url)}" target="_blank" rel="noopener">${esc(current.original_file_name || "View current COA")}</a>`
      : '<span class="muted">No file uploaded.</span>';
    $("coaMessage").textContent = "";

    $("coaModal").classList.add("open");
    document.body.classList.add("modal-open");
  }

  function close(){
    $("coaModal")?.classList.remove("open");
    document.body.classList.remove("modal-open");
    current = null;
  }

  function collect(){
    current.product_id = $("coaProduct").value || null;
    current.strength = $("coaStrength").value.trim() || null;
    current.lot_number = $("coaLot").value.trim();
    current.batch_number = $("coaBatch").value.trim() || null;
    current.lab_name = $("coaLab").value.trim() || null;
    current.purity_percent = $("coaPurity").value === "" ? null : Number($("coaPurity").value);
    current.test_date = $("coaTestDate").value || null;
    current.expiration_date = $("coaExpiration").value || null;
    current.is_public = $("coaPublic").value === "true";
    current.sort_order = Number($("coaSort").value || 0);
    current.notes = $("coaNotes").value.trim() || null;
  }

  async function save(){
    try{
      if(!current) return;
      collect();

      if(!current.product_id){
        throw new Error("Select a product.");
      }

      if(!current.lot_number){
        throw new Error("Enter a lot number.");
      }

      const db = getClient();
      const payload = {
        product_id:current.product_id,
        strength:current.strength,
        lot_number:current.lot_number,
        batch_number:current.batch_number,
        lab_name:current.lab_name,
        purity_percent:current.purity_percent,
        test_date:current.test_date,
        expiration_date:current.expiration_date,
        is_public:current.is_public,
        sort_order:current.sort_order,
        notes:current.notes,
        file_url:current.file_url,
        file_path:current.file_path,
        file_type:current.file_type,
        original_file_name:current.original_file_name,
        updated_at:new Date().toISOString()
      };

      const result = current.id
        ? await db.from("product_coas").update(payload).eq("id",current.id).select("*").single()
        : await db.from("product_coas").insert(payload).select("*").single();

      if(result.error) throw result.error;

      current = {...result.data};
      $("coaMessage").textContent = "COA saved.";
      await load();
      fillEditor();
      return current;
    }catch(error){
      console.error(error);
      alert(error.message || "The COA could not be saved.");
      return null;
    }
  }

  function validateFile(file){
    const extension = String(file.name || "").toLowerCase().split(".").pop();

    if(!["pdf","png","jpg","jpeg"].includes(extension)){
      throw new Error("Choose a PDF, PNG, JPG, or JPEG file.");
    }

    if(file.size > 10 * 1024 * 1024){
      throw new Error("The file must be 10 MB or smaller.");
    }
  }

  async function upload(){
    try{
      if(!current) throw new Error("Open a COA first.");

      if(!current.id){
        const saved = await save();
        if(!saved?.id) return;
      }

      const file = $("coaFile")?.files?.[0];
      if(!file) throw new Error("Choose a file first.");

      validateFile(file);

      const db = getClient();
      const extension = file.name.toLowerCase().split(".").pop();
      const path = `coas/${current.product_id}/${current.id}-${crypto.randomUUID()}.${extension}`;

      const uploadResult = await db.storage
        .from("product-files")
        .upload(path,file,{
          contentType:file.type || undefined,
          cacheControl:"3600",
          upsert:false
        });

      if(uploadResult.error) throw uploadResult.error;

      const publicUrl = db.storage
        .from("product-files")
        .getPublicUrl(path).data.publicUrl;

      const oldPath = current.file_path;

      const updateResult = await db
        .from("product_coas")
        .update({
          file_url:publicUrl,
          file_path:path,
          file_type:file.type || extension,
          original_file_name:file.name,
          updated_at:new Date().toISOString()
        })
        .eq("id",current.id)
        .select("*")
        .single();

      if(updateResult.error) throw updateResult.error;

      if(oldPath && oldPath !== path){
        await db.storage.from("product-files").remove([oldPath]);
      }

      current = {...updateResult.data};
      await load();
      fillEditor();
      $("coaMessage").textContent = "COA file uploaded.";
    }catch(error){
      console.error(error);
      alert(error.message || "The COA file could not be uploaded.");
    }
  }

  function view(){
    if(!current?.file_url){
      alert("No file has been uploaded.");
      return;
    }

    window.open(current.file_url,"_blank","noopener");
  }

  async function remove(id){
    if(!confirm("Delete this COA and its uploaded file?")) return;

    try{
      const db = getClient();
      const item = rows.find(row => String(row.id) === String(id));

      if(item?.file_path){
        await db.storage.from("product-files").remove([item.file_path]);
      }

      const result = await db.from("product_coas").delete().eq("id",id);
      if(result.error) throw result.error;

      await load();
    }catch(error){
      console.error(error);
      alert(error.message || "The COA could not be deleted.");
    }
  }

  document.addEventListener("click", event => {
    const add = event.target.closest("#addCoaDirectButton");
    if(add){
      event.preventDefault();
      openNew();
      return;
    }

    const edit = event.target.closest("[data-coa-edit]");
    if(edit){
      event.preventDefault();
      openExisting(edit.dataset.coaEdit);
      return;
    }

    const del = event.target.closest("[data-coa-delete]");
    if(del){
      event.preventDefault();
      remove(del.dataset.coaDelete);
    }
  });

  document.addEventListener("input", event => {
    if(event.target.id === "coaSearch") render();
  });

  document.addEventListener("change", event => {
    if(event.target.id === "coaFilter") render();
  });

  window.loadCoaBatches = load;
  window.openNewCoaEditor = openNew;
  window.openCoaEditor = openExisting;
  window.closeCoaEditor = close;
  window.saveCoa = save;
  window.uploadCoa = upload;
  window.viewCoa = view;
  window.deleteCoa = remove;
})();