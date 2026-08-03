(() => {
  "use strict";

  const el = id => document.getElementById(id);
  const config = window.NEON_CONFIG || {};

  const db = window.supabase.createClient(
    config.supabaseUrl.trim(),
    config.supabasePublishableKey.trim()
  );

  let products = [];
  let coas = [];
  let current = null;

  const escapeHtml = value =>
    String(value || "").replace(/[&<>"']/g, char => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[char]));

  function fileLabel(item){
    const value = String(item?.file_type || item?.file_url || "").toLowerCase();
    if(value.includes("pdf")) return "PDF";
    if(value.includes("png")) return "PNG";
    if(value.includes("jpg") || value.includes("jpeg")) return "JPG";
    return item?.file_url ? "FILE" : "NO FILE";
  }

  function productName(id){
    return products.find(item => String(item.id) === String(id))?.name || "Unknown Product";
  }

  async function checkSession(){
    const {data} = await db.auth.getSession();
    const session = data?.session;

    if(session){
      el("coaAuthGate").hidden = true;
      document.body.classList.add("coa-authenticated");
      await loadData();
    }else{
      el("coaAuthGate").hidden = false;
    }
  }

  async function login(){
    el("coaAuthMessage").textContent = "";

    const email = el("coaAdminEmail").value.trim();
    const password = el("coaAdminPassword").value;

    const {error} = await db.auth.signInWithPassword({email,password});

    if(error){
      el("coaAuthMessage").textContent = error.message;
      return;
    }

    await checkSession();
  }

  async function signOut(){
    await db.auth.signOut();
    window.location.reload();
  }

  async function loadData(){
    const [productsResult,coasResult] = await Promise.all([
      db.from("products").select("*").order("name",{ascending:true}),
      db.from("product_coas").select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:false})
    ]);

    if(productsResult.error){
      showError(productsResult.error.message);
      return;
    }

    if(coasResult.error){
      showError(
        `${coasResult.error.message}. Run supabase-coa-rebuild-v17.sql in Supabase.`
      );
      return;
    }

    products = productsResult.data || [];
    coas = coasResult.data || [];

    fillProductOptions();
    render();
  }

  function showError(message){
    el("coaAdminList").innerHTML = `
      <div class="coa-error">
        <strong>COA Admin could not load.</strong>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  function fillProductOptions(){
    const select = el("coaProduct");
    const selected = select.value;

    select.innerHTML =
      '<option value="">Select a product</option>' +
      products.map(item =>
        `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`
      ).join("");

    if(selected) select.value = selected;
  }

  function render(){
    const query = el("coaSearch").value.toLowerCase();
    const filter = el("coaFilter").value;

    const visible = coas.filter(item => {
      const text = `
        ${productName(item.product_id)}
        ${item.strength || ""}
        ${item.lot_number || ""}
        ${item.batch_number || ""}
        ${item.lab_name || ""}
      `.toLowerCase();

      const filterMatch =
        filter === "all" ||
        (filter === "public" && item.is_public !== false) ||
        (filter === "private" && item.is_public === false) ||
        (filter === "missing" && !item.file_url);

      return text.includes(query) && filterMatch;
    });

    if(!visible.length){
      el("coaAdminList").innerHTML = '<p class="muted">No matching COAs.</p>';
      return;
    }

    el("coaAdminList").innerHTML = visible.map(item => `
      <article class="coa-row">
        <div class="coa-row-head">
          <div>
            <h3>${escapeHtml(productName(item.product_id))}</h3>
            <p>
              ${escapeHtml(item.strength || "No strength")}
              ${item.lot_number ? ` · Lot ${escapeHtml(item.lot_number)}` : ""}
            </p>
          </div>

          <div class="coa-badges">
            <span class="coa-file-badge">${fileLabel(item)}</span>
            <span class="coa-visibility ${item.is_public === false ? "private" : "public"}">
              ${item.is_public === false ? "Admin Only" : "Public"}
            </span>
          </div>
        </div>

        <div class="coa-row-meta">
          <div><span>Lab</span><strong>${escapeHtml(item.lab_name || "Not provided")}</strong></div>
          <div><span>Test Date</span><strong>${escapeHtml(item.test_date || "Not provided")}</strong></div>
          <div><span>Purity</span><strong>${item.purity_percent != null ? Number(item.purity_percent).toFixed(2) + "%" : "Not provided"}</strong></div>
          <div><span>Batch</span><strong>${escapeHtml(item.batch_number || "Not provided")}</strong></div>
        </div>

        <div class="actions">
          <button class="btn blue" type="button" data-edit-coa="${escapeHtml(item.id)}">Edit</button>
          ${item.file_url ? `<a class="btn" href="${escapeHtml(item.file_url)}" target="_blank" rel="noopener">View</a>` : ""}
          <button class="btn danger" type="button" data-delete-coa="${escapeHtml(item.id)}">Delete</button>
        </div>
      </article>
    `).join("");
  }

  function blankCoa(){
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

  function openNew(){
    current = blankCoa();
    fillModal();
  }

  function openExisting(id){
    const found = coas.find(item => String(item.id) === String(id));
    if(!found) return;
    current = {...found};
    fillModal();
  }

  function fillModal(){
    fillProductOptions();

    el("coaModalTitle").textContent = current.id ? "Edit COA" : "Add COA";
    el("coaProduct").value = current.product_id || "";
    el("coaStrength").value = current.strength || "";
    el("coaLot").value = current.lot_number || "";
    el("coaBatch").value = current.batch_number || "";
    el("coaLab").value = current.lab_name || "";
    el("coaPurity").value = current.purity_percent ?? "";
    el("coaTestDate").value = current.test_date || "";
    el("coaExpiration").value = current.expiration_date || "";
    el("coaPublic").value = current.is_public === false ? "false" : "true";
    el("coaSort").value = Number(current.sort_order || 0);
    el("coaNotes").value = current.notes || "";
    el("coaFile").value = "";
    el("coaFileBadge").textContent = fileLabel(current);
    el("coaCurrentFile").innerHTML = current.file_url
      ? `<a href="${escapeHtml(current.file_url)}" target="_blank" rel="noopener">${escapeHtml(current.original_file_name || "View current file")}</a>`
      : '<span class="muted">No file uploaded.</span>';
    el("coaMessage").textContent = "";

    el("coaModal").classList.add("open");
    document.body.classList.add("modal-open");
  }

  function closeModal(){
    el("coaModal").classList.remove("open");
    document.body.classList.remove("modal-open");
    current = null;
  }

  function collect(){
    current.product_id = el("coaProduct").value || null;
    current.strength = el("coaStrength").value.trim() || null;
    current.lot_number = el("coaLot").value.trim();
    current.batch_number = el("coaBatch").value.trim() || null;
    current.lab_name = el("coaLab").value.trim() || null;
    current.purity_percent = el("coaPurity").value === "" ? null : Number(el("coaPurity").value);
    current.test_date = el("coaTestDate").value || null;
    current.expiration_date = el("coaExpiration").value || null;
    current.is_public = el("coaPublic").value === "true";
    current.sort_order = Number(el("coaSort").value || 0);
    current.notes = el("coaNotes").value.trim() || null;
  }

  async function save(){
    collect();

    if(!current.product_id){
      alert("Select a product.");
      return null;
    }

    if(!current.lot_number){
      alert("Enter a lot number.");
      return null;
    }

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

    if(result.error){
      alert(result.error.message);
      return null;
    }

    current = {...result.data};
    el("coaMessage").textContent = "COA saved.";

    await loadData();
    fillModal();

    return current;
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
      if(!current.id){
        const saved = await save();
        if(!saved?.id) return;
      }

      const file = el("coaFile").files?.[0];
      if(!file) throw new Error("Choose a file first.");

      validateFile(file);

      const extension = file.name.toLowerCase().split(".").pop();
      const path = `coas/${current.product_id}/${current.id}-${crypto.randomUUID()}.${extension}`;
      const oldPath = current.file_path;

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
      await loadData();
      fillModal();
      el("coaMessage").textContent = "COA file uploaded.";
    }catch(error){
      alert(error.message || "The file could not be uploaded.");
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
    if(!confirm("Delete this COA and its file?")) return;

    const item = coas.find(row => String(row.id) === String(id));

    if(item?.file_path){
      await db.storage.from("product-files").remove([item.file_path]);
    }

    const result = await db.from("product_coas").delete().eq("id",id);

    if(result.error){
      alert(result.error.message);
      return;
    }

    await loadData();
  }

  el("coaAdminLoginButton").addEventListener("click",login);
  el("coaSignOutButton").addEventListener("click",signOut);
  el("addCoaButton").addEventListener("click",openNew);
  el("closeCoaButton").addEventListener("click",closeModal);
  el("saveCoaButton").addEventListener("click",save);
  el("uploadCoaButton").addEventListener("click",upload);
  el("viewCoaButton").addEventListener("click",view);
  el("coaSearch").addEventListener("input",render);
  el("coaFilter").addEventListener("change",render);

  document.addEventListener("click",event => {
    const edit = event.target.closest("[data-edit-coa]");
    if(edit) openExisting(edit.dataset.editCoa);

    const del = event.target.closest("[data-delete-coa]");
    if(del) remove(del.dataset.deleteCoa);

    if(event.target.id === "coaModal") closeModal();
  });

  checkSession();
})();