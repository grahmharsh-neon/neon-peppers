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
  let bulkRows = [];

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


  function normalizeMatchText(value){
    return String(value || "")
      .toLowerCase()
      .replace(/\.[^.]+$/,"")
      .replace(/[^a-z0-9]+/g," ")
      .trim();
  }

  function productOptions(productId){
    const product=products.find(item=>String(item.id)===String(productId));
    return Array.isArray(product?.option_values)
      ? product.option_values.filter(Boolean)
      : [];
  }

  function inferProductId(fileName){
    const fileText=normalizeMatchText(fileName);
    if(!fileText) return "";

    const candidates=products
      .map(product=>{
        const productText=normalizeMatchText(product.name);
        if(!productText) return {id:product.id,score:0};

        let score=0;
        if(fileText===productText) score=1000;
        else if(fileText.includes(productText)) score=productText.length+100;
        else{
          const words=productText.split(/\s+/).filter(Boolean);
          score=words.reduce(
            (sum,word)=>sum+(fileText.includes(word)?word.length:0),
            0
          );
        }

        return {id:product.id,score};
      })
      .sort((a,b)=>b.score-a.score);

    return candidates[0]?.score>=4 ? candidates[0].id : "";
  }

  function inferSize(fileName,productId){
    const fileText=String(fileName||"").toLowerCase().replace(/\s+/g,"");
    const values=productOptions(productId);

    return values.find(value=>{
      const normalized=String(value).toLowerCase().replace(/\s+/g,"");
      return normalized && fileText.includes(normalized);
    }) || "";
  }

  function openBulkModal(){
    bulkRows=[];
    el("bulkCoaFiles").value="";
    el("bulkCoaPublic").value="true";
    renderBulkRows();
    el("bulkCoaMessage").textContent="";
    el("bulkCoaProgress").textContent="Ready";
    el("bulkCoaModal").classList.add("open");
    document.body.classList.add("modal-open");
  }

  function closeBulkModal(){
    el("bulkCoaModal").classList.remove("open");
    document.body.classList.remove("modal-open");
  }

  function clearBulkRows(){
    bulkRows=[];
    el("bulkCoaFiles").value="";
    renderBulkRows();
    el("bulkCoaMessage").textContent="";
    el("bulkCoaProgress").textContent="Ready";
  }

  function productSelectOptions(selectedId){
    return '<option value="">Select product</option>' +
      products.map(product=>`
        <option
          value="${escapeHtml(product.id)}"
          ${String(product.id)===String(selectedId)?"selected":""}
        >
          ${escapeHtml(product.name)}
        </option>
      `).join("") +
      '<option value="__add_new__">+ Add New Product</option>';
  }

  function sizeSelectOptions(productId,selectedValue){
    const values=productOptions(productId);

    if(!values.length){
      return '<option value="">No sizes configured</option>';
    }

    return '<option value="">Select size</option>' +
      values.map(value=>`
        <option
          value="${escapeHtml(value)}"
          ${String(value)===String(selectedValue)?"selected":""}
        >
          ${escapeHtml(value)}
        </option>
      `).join("");
  }

  function rowStatus(row){
    if(row.uploaded) return "Uploaded";
    if(row.error) return "Error";
    if(!row.product_id) return "Choose product";
    return "Ready";
  }

  async function addProductFromBulkRow(index){
    const row=bulkRows[index];
    if(!row)return;

    const name=window.prompt("New product name:");
    if(!name||!name.trim()){
      row.product_id="";
      renderBulkRows();
      return;
    }

    const cleanName=name.trim();

    const {data,error}=await db
      .from("products")
      .insert({
        name:cleanName,
        category:"Research Compound",
        description:"",
        strength:"",
        option_label:"Size",
        option_values:["5mg","10mg","20mg","30mg"],
        price:0,
        visible:false,
        featured:false,
        status:"available",
        lifecycle_status:"draft",
        stock_count:0,
        low_stock_threshold:5
      })
      .select("*")
      .single();

    if(error){
      alert(error.message);
      row.product_id="";
      renderBulkRows();
      return;
    }

    products.push(data);
    products.sort((a,b)=>String(a.name).localeCompare(String(b.name)));
    row.product_id=data.id;
    row.strength="";
    renderBulkRows();
  }

  function renderBulkRows(){
    const box=el("bulkCoaRows");
    const count=bulkRows.length;

    el("bulkCoaCount").textContent=`${count} File${count===1?"":"s"}`;

    const readyCount=bulkRows.filter(row=>rowStatus(row)==="Ready").length;
    el("uploadAllCoasButton").disabled=!count || readyCount!==count;

    if(!count){
      box.innerHTML='<p class="muted">Choose files to begin.</p>';
      return;
    }

    box.innerHTML=bulkRows.map((row,index)=>{
      const status=rowStatus(row);

      return `
        <div class="bulk-coa-row ${row.uploaded?"uploaded":""} ${row.error?"error":""}">
          <div class="bulk-coa-file">
            <strong>${escapeHtml(row.file.name)}</strong>
            <span>${(row.file.size/1024/1024).toFixed(2)} MB</span>
          </div>

          <select data-bulk-index="${index}" data-bulk-key="product_id">
            ${productSelectOptions(row.product_id)}
          </select>

          <select
            data-bulk-index="${index}"
            data-bulk-key="strength"
            ${productOptions(row.product_id).length?"":"disabled"}
          >
            ${sizeSelectOptions(row.product_id,row.strength)}
          </select>

          <div class="bulk-coa-status ${status.toLowerCase().replace(/\s+/g,"-")}">
            ${escapeHtml(status)}
            ${row.error?`<small>${escapeHtml(row.error)}</small>`:""}
          </div>
        </div>
      `;
    }).join("");

    box.querySelectorAll("[data-bulk-index]").forEach(node=>{
      const update=event=>{
        const index=Number(event.currentTarget.dataset.bulkIndex);
        const key=event.currentTarget.dataset.bulkKey;
        const row=bulkRows[index];
        if(!row)return;

        const nextValue=event.currentTarget.value;

        if(key==="product_id" && nextValue==="__add_new__"){
          addProductFromBulkRow(index);
          return;
        }

        row[key]=nextValue;
        row.error="";

        if(key==="product_id"){
          row.strength=inferSize(row.file.name,row.product_id);
          renderBulkRows();
        }else{
          const status=rowStatus(row);
          event.currentTarget.closest(".bulk-coa-row")
            ?.querySelector(".bulk-coa-status");
          el("uploadAllCoasButton").disabled=
            !bulkRows.length ||
            !bulkRows.every(item=>rowStatus(item)==="Ready");
        }
      };

      node.addEventListener("change",update);
      node.addEventListener("input",update);
    });
  }

  function loadBulkFiles(){
    const files=[...(el("bulkCoaFiles").files||[])];

    try{
      files.forEach(validateFile);
    }catch(error){
      alert(error.message);
      el("bulkCoaFiles").value="";
      return;
    }

    bulkRows=files.map((file,index)=>{
      const productId=inferProductId(file.name);
      return{
        file,
        product_id:productId,
        strength:inferSize(file.name,productId),
        uploaded:false,
        error:"",
        index
      };
    });

    renderBulkRows();
  }

  async function uploadOneBulkCoa(row,index,total){
    const extension=row.file.name.toLowerCase().split(".").pop();
    const isPublic=el("bulkCoaPublic").value==="true";
    const generatedLot=String(row.file.name||"")
      .replace(/\.[^.]+$/,"")
      .replace(/[^a-zA-Z0-9_-]+/g,"-")
      .replace(/^-+|-+$/g,"")
      .slice(0,80)
      || `BULK-${Date.now()}-${index+1}`;

    const insertResult=await db
      .from("product_coas")
      .insert({
        product_id:row.product_id,
        strength:row.strength||null,
        lot_number:generatedLot,
        lab_name:null,
        test_date:null,
        is_public:isPublic,
        sort_order:0,
        original_file_name:row.file.name,
        updated_at:new Date().toISOString()
      })
      .select("*")
      .single();

    if(insertResult.error){
      throw insertResult.error;
    }

    const coa=insertResult.data;
    const storagePath=
      `coas/${row.product_id}/${coa.id}-${crypto.randomUUID()}.${extension}`;

    const uploadResult=await db.storage
      .from("product-files")
      .upload(storagePath,row.file,{
        contentType:row.file.type||undefined,
        cacheControl:"3600",
        upsert:false
      });

    if(uploadResult.error){
      await db.from("product_coas").delete().eq("id",coa.id);
      throw uploadResult.error;
    }

    const publicUrl=db.storage
      .from("product-files")
      .getPublicUrl(storagePath).data.publicUrl;

    const updateResult=await db
      .from("product_coas")
      .update({
        file_url:publicUrl,
        file_path:storagePath,
        file_type:row.file.type||extension,
        original_file_name:row.file.name,
        updated_at:new Date().toISOString()
      })
      .eq("id",coa.id);

    if(updateResult.error){
      await db.storage.from("product-files").remove([storagePath]);
      await db.from("product_coas").delete().eq("id",coa.id);
      throw updateResult.error;
    }

    row.uploaded=true;
    row.error="";
    el("bulkCoaProgress").textContent=`Uploaded ${index+1} of ${total}`;
  }

  async function uploadAllCoas(){
    if(!bulkRows.length)return;

    if(!bulkRows.every(row=>rowStatus(row)==="Ready")){
      alert("Select a product for every file before uploading.");
      return;
    }

    const button=el("uploadAllCoasButton");
    button.disabled=true;
    button.textContent="Uploading…";
    el("bulkCoaMessage").textContent="";

    let uploaded=0;
    let failed=0;

    for(let index=0;index<bulkRows.length;index++){
      const row=bulkRows[index];

      try{
        await uploadOneBulkCoa(row,index,bulkRows.length);
        uploaded++;
      }catch(error){
        console.error(error);
        row.error=error.message||"Upload failed";
        failed++;
      }

      renderBulkRows();
    }

    await loadData();

    button.textContent="Upload All";

    if(failed){
      el("bulkCoaProgress").textContent=
        `${uploaded} uploaded · ${failed} failed`;
      el("bulkCoaMessage").textContent=
        "Fix the failed rows and upload them again.";
    }else{
      el("bulkCoaProgress").textContent=
        `${uploaded} COA${uploaded===1?"":"s"} uploaded`;
      el("bulkCoaMessage").textContent=
        "Bulk upload complete.";
    }
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
  el("bulkCoaButton").addEventListener("click",openBulkModal);
  el("closeBulkCoaButton").addEventListener("click",closeBulkModal);
  el("bulkCoaFiles").addEventListener("change",loadBulkFiles);
  el("clearBulkCoaButton").addEventListener("click",clearBulkRows);
  el("uploadAllCoasButton").addEventListener("click",uploadAllCoas);
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
    if(event.target.id === "bulkCoaModal") closeBulkModal();
  });

  checkSession();
})();