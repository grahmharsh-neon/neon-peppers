(() => {
  "use strict";
  const el=id=>document.getElementById(id);
  const config=window.NEON_CONFIG||{};
  const db=window.supabase.createClient(
    config.supabaseUrl.trim(),
    config.supabasePublishableKey.trim()
  );

  let invoices=[];
  let items=[];
  let current=null;
  let lines=[];

  const esc=v=>String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const money=v=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(v||0));
  const statusLabel=s=>s==="sent"?"Sent":s==="paid"?"Paid":s==="void"?"Void":"Draft";

  async function checkSession(){
    const {data}=await db.auth.getSession();
    if(data?.session){
      el("invoiceAuthGate").hidden=true;
      await load();
    }else{
      el("invoiceAuthGate").hidden=false;
    }
  }

  async function login(){
    el("invoiceAuthMessage").textContent="";
    const {error}=await db.auth.signInWithPassword({
      email:el("invoiceLoginEmail").value.trim(),
      password:el("invoiceLoginPassword").value
    });
    if(error){el("invoiceAuthMessage").textContent=error.message;return}
    await checkSession();
  }

  async function logout(){
    await db.auth.signOut();
    location.reload();
  }

  async function load(){
    const [a,b]=await Promise.all([
      db.from("invoices").select("*").order("created_at",{ascending:false}),
      db.from("invoice_items").select("*").order("sort_order",{ascending:true})
    ]);
    if(a.error){el("invoiceList").innerHTML=`<p class="muted">${esc(a.error.message)}</p>`;return}
    invoices=a.data||[];
    items=b.error?[]:(b.data||[]);
    render();
    updateStats();

    const params=new URLSearchParams(location.search);
    const invoiceId=params.get("invoice");
    const requestId=params.get("request");

    if(invoiceId){
      openExisting(invoiceId);
      history.replaceState(null,"","/invoice-admin.html");
    }else if(requestId){
      await createFromRequest(requestId);
      history.replaceState(null,"","/invoice-admin.html");
    }
  }

  function updateStats(){
    el("invoiceStatDraft").textContent=invoices.filter(x=>x.status==="draft").length;
    el("invoiceStatSent").textContent=invoices.filter(x=>x.status==="sent").length;
    el("invoiceStatPaid").textContent=invoices.filter(x=>x.status==="paid").length;
    const outstanding=invoices.filter(x=>["draft","sent"].includes(x.status)).reduce((s,x)=>s+Number(x.total||0),0);
    el("invoiceStatOutstanding").textContent=money(outstanding);
  }

  function render(){
    const box=el("invoiceList");
    const q=el("invoiceSearch").value.toLowerCase();
    const f=el("invoiceFilter").value;
    const list=invoices.filter(x=>
      `${x.invoice_number} ${x.customer_name} ${x.customer_email} ${x.customer_company||""}`.toLowerCase().includes(q)
      &&(f==="all"||x.status===f)
    );
    if(!list.length){box.innerHTML='<p class="muted">No matching invoices.</p>';return}
    box.innerHTML=list.map(x=>`
      <article class="invoice-card">
        <div class="invoice-card-head">
          <div><h3>${esc(x.invoice_number)}</h3><div class="muted">${new Date(x.created_at).toLocaleString()}</div></div>
          <span class="invoice-status-badge ${esc(x.status)}">${esc(statusLabel(x.status))}</span>
        </div>
        <div class="invoice-card-meta">
          <div><span>Customer</span><strong>${esc(x.customer_name)}</strong></div>
          <div><span>Email</span><a href="mailto:${esc(x.customer_email)}">${esc(x.customer_email)}</a></div>
          <div><span>Total</span><strong>${money(x.total)}</strong></div>
          <div><span>Due</span><strong>${esc(x.due_date||"Not set")}</strong></div>
        </div>
        <div class="actions">
          <button class="btn blue" data-open="${x.id}">Open</button>
          <button class="btn pink" data-send="${x.id}">Send</button>
          <button class="btn green" data-status="${x.id}" data-value="paid">Mark Paid</button>
          <button class="btn" data-print="${x.id}">Print</button>
          <button class="btn" data-duplicate="${x.id}">Duplicate</button>
          <button class="btn danger" data-status="${x.id}" data-value="void">Void</button>
        </div>
      </article>
    `).join("");
  }


  async function createFromRequest(requestId){
    const [requestResult,itemResult]=await Promise.all([
      db.from("order_requests").select("*").eq("id",requestId).single(),
      db.from("order_request_items").select("*").eq("order_request_id",requestId)
    ]);
    if(requestResult.error){alert(requestResult.error.message);return}
    const request=requestResult.data;
    current=blank();
    Object.assign(current,{
      order_request_id:request.id,
      customer_name:request.name||"",
      customer_email:request.email||"",
      customer_phone:request.phone||"",
      customer_company:request.company||"",
      notes:request.notes||""
    });
    lines=(itemResult.data||[]).map((x,i)=>({
      description:x.product_name||"Item",option_text:x.strength||"",
      quantity:Number(x.quantity||1),unit_price:0,line_total:0,sort_order:i
    }));
    if(!lines.length)lines=[{description:"",option_text:"",quantity:1,unit_price:0,line_total:0,sort_order:0}];
    fill();
  }

  function blank(){
    const due=new Date();due.setDate(due.getDate()+7);
    return {
      id:null,invoice_number:"Assigned when saved",
      customer_name:"",customer_email:"",customer_phone:"",
      customer_company:"",status:"draft",due_date:due.toISOString().slice(0,10),
      subtotal:0,discount:0,shipping:0,tax_rate:0,tax_amount:0,total:0,
      notes:"",internal_notes:""
    };
  }

  function openNew(){
    current=blank();
    lines=[{description:"",option_text:"",quantity:1,unit_price:0,line_total:0,sort_order:0}];
    fill();
  }

  function openExisting(id){
    const found=invoices.find(x=>String(x.id)===String(id));
    if(!found)return;
    current={...found};
    lines=items.filter(x=>String(x.invoice_id)===String(id)).map(x=>({...x}));
    if(!lines.length)lines=[{description:"",option_text:"",quantity:1,unit_price:0,line_total:0,sort_order:0}];
    fill();
  }

  function fill(){
    el("invoiceModalTitle").textContent=current.id?"Edit Invoice":"New Invoice";
    el("invoiceNumber").value=current.invoice_number||"Assigned when saved";
    el("invoiceCustomerName").value=current.customer_name||"";
    el("invoiceCustomerEmail").value=current.customer_email||"";
    el("invoiceCustomerPhone").value=current.customer_phone||"";
    el("invoiceCustomerCompany").value=current.customer_company||"";
    el("invoiceDueDate").value=current.due_date||"";
    el("invoiceStatus").value=current.status||"draft";
    el("invoiceDiscount").value=Number(current.discount||0);
    el("invoiceShipping").value=Number(current.shipping||0);
    el("invoiceTaxRate").value=Number(current.tax_rate||0);
    el("invoiceNotes").value=current.notes||"";
    el("invoicePrivateNotes").value=current.internal_notes||"";
    updateBadge();
    renderLines();
    recalc();
    el("invoiceMessage").textContent="";
    el("invoiceModal").classList.add("open");
    document.body.classList.add("modal-open");
  }

  function close(){
    el("invoiceModal").classList.remove("open");
    document.body.classList.remove("modal-open");
    current=null;lines=[];
  }

  function updateBadge(){
    const status=el("invoiceStatus").value||"draft";
    const badge=el("invoiceStatusBadge");
    badge.className=`invoice-status-badge ${status}`;
    badge.textContent=statusLabel(status);
  }

  function renderLines(){
    el("invoiceLines").innerHTML=lines.map((x,i)=>`
      <div class="invoice-line">
        <input value="${esc(x.description)}" data-line="${i}" data-key="description">
        <input value="${esc(x.option_text||"")}" data-line="${i}" data-key="option_text">
        <input type="number" min="1" step="1" value="${Number(x.quantity||1)}" data-line="${i}" data-key="quantity">
        <input type="number" min="0" step="0.01" value="${Number(x.unit_price||0)}" data-line="${i}" data-key="unit_price">
        <strong>${money(x.line_total)}</strong>
        <button class="btn danger" data-remove-line="${i}">×</button>
      </div>
    `).join("");
  }

  function recalc(){
    lines.forEach(x=>x.line_total=Number(x.quantity||0)*Number(x.unit_price||0));
    const subtotal=lines.reduce((s,x)=>s+Number(x.line_total||0),0);
    const discount=Math.max(0,Number(el("invoiceDiscount").value||0));
    const shipping=Math.max(0,Number(el("invoiceShipping").value||0));
    const rate=Math.max(0,Number(el("invoiceTaxRate").value||0));
    const taxable=Math.max(0,subtotal-discount+shipping);
    const tax=taxable*rate/100,total=taxable+tax;
    Object.assign(current,{subtotal,discount,shipping,tax_rate:rate,tax_amount:tax,total});
    el("invoiceSubtotal").textContent=money(subtotal);
    el("invoiceTax").textContent=money(tax);
    el("invoiceTotal").textContent=money(total);
  }

  function collect(){
    Object.assign(current,{
      customer_name:el("invoiceCustomerName").value.trim(),
      customer_email:el("invoiceCustomerEmail").value.trim(),
      customer_phone:el("invoiceCustomerPhone").value.trim(),
      customer_company:el("invoiceCustomerCompany").value.trim(),
      due_date:el("invoiceDueDate").value||null,
      status:el("invoiceStatus").value,
      notes:el("invoiceNotes").value.trim(),
      internal_notes:el("invoicePrivateNotes").value.trim()
    });
    recalc();
  }

  async function save(){
    collect();
    if(!current.customer_name||!current.customer_email){alert("Customer name and email are required.");return null}
    if(!lines.length){alert("Add at least one item.");return null}
    const payload={
      order_request_id:current.order_request_id||null,
      customer_name:current.customer_name,customer_email:current.customer_email,
      customer_phone:current.customer_phone||null,customer_company:current.customer_company||null,
      status:current.status,due_date:current.due_date,
      subtotal:current.subtotal,discount:current.discount,shipping:current.shipping,
      tax_rate:current.tax_rate,tax_amount:current.tax_amount,total:current.total,
      notes:current.notes||null,internal_notes:current.internal_notes||null,
      updated_at:new Date().toISOString()
    };
    const result=current.id
      ?await db.from("invoices").update(payload).eq("id",current.id).select("*").single()
      :await db.from("invoices").insert(payload).select("*").single();
    if(result.error){alert(result.error.message);return null}
    current={...result.data};
    await db.from("invoice_items").delete().eq("invoice_id",current.id);
    const rows=lines.map((x,i)=>({
      invoice_id:current.id,description:x.description||"Item",option_text:x.option_text||null,
      quantity:Number(x.quantity||1),unit_price:Number(x.unit_price||0),
      line_total:Number(x.line_total||0),sort_order:i
    }));
    const itemResult=await db.from("invoice_items").insert(rows).select("*");
    if(itemResult.error){alert(itemResult.error.message);return null}
    lines=itemResult.data||[];
    if(current.order_request_id){
      await db.from("order_requests").update({
        invoice_id:current.id,invoice_number:current.invoice_number,
        invoice_total:current.total,status:"invoiced",updated_at:new Date().toISOString()
      }).eq("id",current.order_request_id);
    }
    el("invoiceNumber").value=current.invoice_number;
    el("invoiceMessage").textContent="Invoice saved.";
    await load();
    return current;
  }

  async function send(){
    if(!current?.id){const saved=await save();if(!saved)return}
    else await save();
    const response=await fetch("/.netlify/functions/send-invoice",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({invoice_id:current.id})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok){alert(result.error||"Invoice could not be sent.");return}
    await db.from("invoices").update({
      status:"sent",sent_at:new Date().toISOString(),updated_at:new Date().toISOString()
    }).eq("id",current.id);
    current.status="sent";
    el("invoiceStatus").value="sent";
    updateBadge();
    el("invoiceMessage").textContent="Invoice emailed.";
    await load();
  }

  async function sendById(id){openExisting(id);await send()}

  async function setStatus(id,status){
    const update={status,updated_at:new Date().toISOString()};
    if(status==="paid")update.paid_at=new Date().toISOString();
    const {error}=await db.from("invoices").update(update).eq("id",id);
    if(error){alert(error.message);return}
    await load();
  }

  async function duplicate(id){
    const source=invoices.find(x=>String(x.id)===String(id));
    if(!source)return;
    current={...source,id:null,invoice_number:"Assigned when saved",status:"draft",sent_at:null,paid_at:null,created_at:null};
    lines=items.filter(x=>String(x.invoice_id)===String(id)).map(x=>({...x,id:null,invoice_id:null}));
    fill();
  }

  function printMarkup(inv,list){
    const rows=list.map(x=>`<tr><td>${esc(x.description)}</td><td>${esc(x.option_text||"")}</td><td class="n">${x.quantity}</td><td class="n">${money(x.unit_price)}</td><td class="n">${money(x.line_total)}</td></tr>`).join("");
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.invoice_number)}</title><style>body{font-family:Arial;padding:40px;color:#111}.top{display:flex;justify-content:space-between;margin-bottom:35px}table{width:100%;border-collapse:collapse;margin:30px 0}th,td{padding:12px;border-bottom:1px solid #ddd;text-align:left}.n{text-align:right}.totals{width:330px;margin-left:auto}.row{display:flex;justify-content:space-between;padding:7px 0}.grand{font-size:20px;font-weight:bold;border-top:2px solid #111;padding-top:12px}@media print{body{padding:0}}</style></head><body><div class="top"><div><h2>Neon Peppers</h2><div>support@neonpeppers.com</div></div><div><h1>INVOICE</h1><strong>${esc(inv.invoice_number)}</strong><div>Due: ${esc(inv.due_date||"Upon receipt")}</div></div></div><p><b>Bill To</b><br>${esc(inv.customer_name)}<br>${esc(inv.customer_company||"")}<br>${esc(inv.customer_email)}<br>${esc(inv.customer_phone||"")}</p><table><tr><th>Description</th><th>Option</th><th class="n">Qty</th><th class="n">Price</th><th class="n">Total</th></tr>${rows}</table><div class="totals"><div class="row"><span>Subtotal</span><b>${money(inv.subtotal)}</b></div><div class="row"><span>Discount</span><b>-${money(inv.discount)}</b></div><div class="row"><span>Shipping</span><b>${money(inv.shipping)}</b></div><div class="row"><span>Tax</span><b>${money(inv.tax_amount)}</b></div><div class="row grand"><span>Total</span><b>${money(inv.total)}</b></div></div>${inv.notes?`<p><b>Notes</b><br>${esc(inv.notes)}</p>`:""}</body></html>`;
  }

  function printCurrent(){
    collect();
    const w=window.open("","_blank");
    w.document.write(printMarkup(current,lines));w.document.close();setTimeout(()=>w.print(),200);
  }

  function printById(id){
    const inv=invoices.find(x=>String(x.id)===String(id));if(!inv)return;
    const list=items.filter(x=>String(x.invoice_id)===String(id));
    const w=window.open("","_blank");w.document.write(printMarkup(inv,list));w.document.close();setTimeout(()=>w.print(),200);
  }

  el("invoiceLoginButton").addEventListener("click",login);
  el("invoiceLogoutButton").addEventListener("click",logout);
  el("newInvoiceButton").addEventListener("click",openNew);
  el("invoiceRefreshButton").addEventListener("click",load);
  el("invoiceSearch").addEventListener("input",render);
  el("invoiceFilter").addEventListener("change",render);
  el("invoiceCloseButton").addEventListener("click",close);
  el("invoiceAddLineButton").addEventListener("click",()=>{lines.push({description:"",option_text:"",quantity:1,unit_price:0,line_total:0,sort_order:lines.length});renderLines()});
  el("invoiceSaveButton").addEventListener("click",save);
  el("invoiceSendButton").addEventListener("click",send);
  el("invoicePrintButton").addEventListener("click",printCurrent);
  el("invoiceDuplicateButton").addEventListener("click",()=>{if(current?.id)duplicate(current.id)});
  el("invoiceStatus").addEventListener("change",updateBadge);
  ["invoiceDiscount","invoiceShipping","invoiceTaxRate"].forEach(id=>el(id).addEventListener("input",recalc));

  document.addEventListener("input",event=>{
    const input=event.target.closest("[data-line]");
    if(!input)return;
    const i=Number(input.dataset.line),key=input.dataset.key;
    lines[i][key]=["quantity","unit_price"].includes(key)?Number(input.value||0):input.value;
    lines[i].quantity=Math.max(1,Number(lines[i].quantity||1));
    lines[i].unit_price=Math.max(0,Number(lines[i].unit_price||0));
    recalc();renderLines();
  });

  document.addEventListener("click",event=>{
    const remove=event.target.closest("[data-remove-line]");
    if(remove){lines.splice(Number(remove.dataset.removeLine),1);renderLines();recalc();return}
    const open=event.target.closest("[data-open]");if(open){openExisting(open.dataset.open);return}
    const sendButton=event.target.closest("[data-send]");if(sendButton){sendById(sendButton.dataset.send);return}
    const status=event.target.closest("[data-status]");if(status){setStatus(status.dataset.status,status.dataset.value);return}
    const print=event.target.closest("[data-print]");if(print){printById(print.dataset.print);return}
    const dup=event.target.closest("[data-duplicate]");if(dup){duplicate(dup.dataset.duplicate);return}
    if(event.target.id==="invoiceModal")close();
  });

  checkSession();
})();