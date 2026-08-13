(() => {
  "use strict";

  const el=id=>document.getElementById(id);
  const core=window.NeonCore||{};
  const esc=core.esc||((v)=>String(v||""));
  const money=core.money||((v)=>`$${Number(v||0).toFixed(2)}`);
  const config=window.NEON_CONFIG||{};
  const db=window.supabase.createClient(
    config.supabaseUrl.trim(),
    config.supabasePublishableKey.trim()
  );

  let rows=[];
  let products=[];
  let current=null;

  function calc(cost,price,qty){
    cost=Number(cost||0);
    price=Number(price||0);
    qty=Number(qty||0);

    const profit=price-cost;
    const margin=price>0?(profit/price)*100:0;

    return {
      profit,
      margin,
      inventory:cost*qty,
      retail:price*qty
    };
  }

  async function checkSession(){
    const {data}=await db.auth.getSession();
    if(data?.session){
      el("supplierAuthGate").hidden=true;
      await load();
    }
  }

  async function login(){
    const {error}=await db.auth.signInWithPassword({
      email:el("supplierEmail").value.trim(),
      password:el("supplierPassword").value
    });

    if(error){
      el("supplierAuthMessage").textContent=error.message;
      return;
    }

    await checkSession();
  }

  async function load(){
    const [priceResult,productResult]=await Promise.all([
      db.from("supplier_pricing").select("*").order("product_name",{ascending:true}),
      db.from("products").select("id,name,price,option_values,lifecycle_status").order("name",{ascending:true})
    ]);

    if(priceResult.error){
      el("supplierRows").innerHTML=`<p class="muted">${esc(priceResult.error.message)}</p>`;
      return;
    }

    rows=priceResult.data||[];
    products=productResult.error?[]:(productResult.data||[]);

    fillProducts();
    render();
    updateStats();
  }

  function fillProducts(){
    const select=el("supplierProductId");
    const value=select.value;

    select.innerHTML=
      '<option value="">Not matched</option>'+
      products.map(product=>`
        <option value="${esc(product.id)}">${esc(product.name)}</option>
      `).join("");

    select.value=value||"";
  }

  function render(){
    const query=el("supplierSearch").value.trim().toLowerCase();
    const filter=el("supplierFilter").value;

    const visible=rows.filter(row=>{
      const text=`${row.product_name} ${row.size||""} ${row.supplier_name||""}`.toLowerCase();
      const metrics=calc(row.supplier_cost,row.retail_price,row.quantity);

      const filterMatch=
        filter==="all" ||
        (filter==="matched" && row.product_id) ||
        (filter==="unmatched" && !row.product_id) ||
        (filter==="low_margin" && metrics.margin<40);

      return text.includes(query)&&filterMatch;
    });

    if(!visible.length){
      el("supplierRows").innerHTML='<p class="muted">No matching supplier pricing.</p>';
      return;
    }

    el("supplierRows").innerHTML=visible.map(row=>{
      const metrics=calc(row.supplier_cost,row.retail_price,row.quantity);
      const marginClass=metrics.margin>=40?"good":"low";

      return `
        <div class="supplier-table supplier-row ${metrics.margin<40?"low-margin":""}">
          <strong>${esc(row.product_name)}</strong>
          <span>${esc(row.size||"—")}</span>
          <span>${money(row.supplier_cost)}</span>
          <span>${money(row.retail_price)}</span>
          <span>${money(metrics.profit)}</span>
          <span class="supplier-margin ${marginClass}">${metrics.margin.toFixed(1)}%</span>
          <span>${Number(row.quantity||0)}</span>
          <button class="btn" type="button" data-edit-supplier="${row.id}">Edit</button>
        </div>
      `;
    }).join("");
  }

  function updateStats(){
    const active=rows.filter(row=>row.active!==false);
    const metrics=active.map(row=>calc(row.supplier_cost,row.retail_price,row.quantity));
    const avgMargin=metrics.length
      ? metrics.reduce((sum,item)=>sum+item.margin,0)/metrics.length
      : 0;
    const avgProfit=metrics.length
      ? metrics.reduce((sum,item)=>sum+item.profit,0)/metrics.length
      : 0;
    const totalRetail=metrics.reduce((sum,item)=>sum+item.retail,0);

    el("supplierStatItems").textContent=active.length;
    el("supplierStatMargin").textContent=`${avgMargin.toFixed(1)}%`;
    el("supplierStatProfit").textContent=money(avgProfit);
    el("supplierStatRetail").textContent=money(totalRetail);
  }

  function blank(){
    return {
      id:null,
      product_id:null,
      product_name:"",
      size:"",
      supplier_name:"",
      supplier_cost:0,
      retail_price:0,
      quantity:0,
      active:true,
      notes:""
    };
  }

  function openNew(){
    current=blank();
    fillModal();
  }

  function openExisting(id){
    const found=rows.find(row=>String(row.id)===String(id));
    if(!found)return;
    current={...found};
    fillModal();
  }

  function fillModal(){
    fillProducts();

    el("supplierModalTitle").textContent=current.id?"Edit Supplier Price":"Add Supplier Price";
    el("supplierProductId").value=current.product_id||"";
    el("supplierProductName").value=current.product_name||"";
    el("supplierSize").value=current.size||"";
    el("supplierName").value=current.supplier_name||"";
    el("supplierCost").value=Number(current.supplier_cost||0);
    el("supplierRetailPrice").value=Number(current.retail_price||0);
    el("supplierQuantity").value=Number(current.quantity||0);
    el("supplierActive").value=current.active===false?"false":"true";
    el("supplierNotes").value=current.notes||"";

    preview();
    el("supplierModal").classList.add("open");
  }

  function close(){
    el("supplierModal").classList.remove("open");
    current=null;
  }

  function preview(){
    const metrics=calc(
      el("supplierCost").value,
      el("supplierRetailPrice").value,
      el("supplierQuantity").value
    );

    el("supplierPreviewProfit").textContent=money(metrics.profit);
    el("supplierPreviewMargin").textContent=`${metrics.margin.toFixed(1)}%`;
    el("supplierPreviewInventory").textContent=money(metrics.inventory);
    el("supplierPreviewRetail").textContent=money(metrics.retail);
  }

  async function save(){
    const payload={
      product_id:el("supplierProductId").value||null,
      product_name:el("supplierProductName").value.trim(),
      size:el("supplierSize").value.trim()||null,
      supplier_name:el("supplierName").value.trim()||null,
      supplier_cost:Number(el("supplierCost").value||0),
      retail_price:Number(el("supplierRetailPrice").value||0),
      quantity:Number(el("supplierQuantity").value||0),
      active:el("supplierActive").value==="true",
      notes:el("supplierNotes").value.trim()||null,
      updated_at:new Date().toISOString()
    };

    if(!payload.product_name){
      alert("Enter the product name.");
      return;
    }

    const result=current.id
      ? await db.from("supplier_pricing").update(payload).eq("id",current.id)
      : await db.from("supplier_pricing").insert(payload);

    if(result.error){
      alert(result.error.message);
      return;
    }

    close();
    await load();
  }

  el("supplierLoginButton").addEventListener("click",login);
  el("supplierLogoutButton").addEventListener("click",async()=>{
    await db.auth.signOut();
    location.reload();
  });

  el("supplierAddButton").addEventListener("click",openNew);
  el("supplierCloseButton").addEventListener("click",close);
  el("supplierSaveButton").addEventListener("click",save);
  el("supplierSearch").addEventListener("input",render);
  el("supplierFilter").addEventListener("change",render);

  ["supplierCost","supplierRetailPrice","supplierQuantity"].forEach(id=>{
    el(id).addEventListener("input",preview);
  });

  el("supplierProductId").addEventListener("change",()=>{
    const product=products.find(item=>String(item.id)===String(el("supplierProductId").value));
    if(!product)return;

    el("supplierProductName").value=product.name||"";
    el("supplierRetailPrice").value=Number(product.price||0);
    preview();
  });

  document.addEventListener("click",event=>{
    const edit=event.target.closest("[data-edit-supplier]");
    if(edit)openExisting(edit.dataset.editSupplier);
    if(event.target.id==="supplierModal")close();
  });

  checkSession();
})();