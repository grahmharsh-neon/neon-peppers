(() => {
  "use strict";

  const el=id=>document.getElementById(id);
  const config=window.NEON_CONFIG||{};
  const db=window.supabase.createClient(
    config.supabaseUrl.trim(),
    config.supabasePublishableKey.trim()
  );

  let customers=[];
  let requests=[];
  let requestItems=[];
  let invoices=[];
  let current=null;

  const esc=v=>String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const money=v=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(v||0));

  async function checkSession(){
    const {data}=await db.auth.getSession();
    if(data?.session){
      el("crmAuthGate").hidden=true;
      await load();
    }else{
      el("crmAuthGate").hidden=false;
    }
  }

  async function login(){
    el("crmAuthMessage").textContent="";
    const {error}=await db.auth.signInWithPassword({
      email:el("crmEmail").value.trim(),
      password:el("crmPassword").value
    });
    if(error){el("crmAuthMessage").textContent=error.message;return}
    await checkSession();
  }

  async function logout(){
    await db.auth.signOut();
    location.reload();
  }

  async function load(){
    const [customerResult,requestResult,itemResult,invoiceResult]=await Promise.all([
      db.from("customers").select("*").order("updated_at",{ascending:false}),
      db.from("order_requests").select("*").order("created_at",{ascending:false}),
      db.from("order_request_items").select("*"),
      db.from("invoices").select("*").order("created_at",{ascending:false})
    ]);

    if(customerResult.error){
      el("crmList").innerHTML=`<p class="muted">${esc(customerResult.error.message)}</p>`;
      return;
    }

    customers=customerResult.data||[];
    requests=requestResult.error?[]:(requestResult.data||[]);
    requestItems=itemResult.error?[]:(itemResult.data||[]);
    invoices=invoiceResult.error?[]:(invoiceResult.data||[]);

    render();
    updateStats();
  }

  function customerRequests(email){
    return requests.filter(x=>String(x.email||"").toLowerCase()===String(email||"").toLowerCase());
  }

  function customerInvoices(email){
    return invoices.filter(x=>String(x.customer_email||"").toLowerCase()===String(email||"").toLowerCase());
  }

  function updateStats(){
    el("crmStatCustomers").textContent=customers.length;
    el("crmStatActive").textContent=customers.filter(x=>["active","vip"].includes(x.status)).length;
    el("crmStatRequested").textContent=money(invoices.reduce((s,x)=>s+Number(x.total||0),0));
    el("crmStatPaid").textContent=money(invoices.filter(x=>x.status==="paid").reduce((s,x)=>s+Number(x.total||0),0));
  }

  function render(){
    const q=el("crmSearch").value.toLowerCase();
    const f=el("crmFilter").value;

    const list=customers.filter(customer=>{
      const reqs=customerRequests(customer.email);
      const items=reqs.flatMap(r=>requestItems.filter(i=>String(i.order_request_id)===String(r.id)));
      const text=`${customer.name} ${customer.email} ${customer.phone||""} ${customer.company||""} ${items.map(i=>`${i.product_name} ${i.strength}`).join(" ")}`.toLowerCase();
      return text.includes(q)&&(f==="all"||customer.status===f);
    });

    if(!list.length){
      el("crmList").innerHTML='<p class="muted">No matching customers.</p>';
      return;
    }

    el("crmList").innerHTML=list.map(customer=>{
      const reqs=customerRequests(customer.email);
      const invs=customerInvoices(customer.email);
      const paid=invs.filter(x=>x.status==="paid").reduce((s,x)=>s+Number(x.total||0),0);
      const last=reqs[0]?.created_at||customer.updated_at||customer.created_at;

      return `
        <article class="crm-card">
          <div class="crm-card-head">
            <div>
              <h3>${esc(customer.name)}</h3>
              <div class="muted">${esc(customer.email)}</div>
            </div>
            <span class="crm-status ${esc(customer.status||"new")}">${esc(customer.status||"new")}</span>
          </div>

          <div class="crm-card-meta">
            <div><span>Requests</span><strong>${reqs.length}</strong></div>
            <div><span>Invoices</span><strong>${invs.length}</strong></div>
            <div><span>Paid</span><strong>${money(paid)}</strong></div>
            <div><span>Last Activity</span><strong>${last?new Date(last).toLocaleDateString():"—"}</strong></div>
          </div>

          <div class="actions">
            <button class="btn blue" data-open-customer="${customer.id}">Open Profile</button>
            <a class="btn" href="mailto:${esc(customer.email)}">Email</a>
            <a class="btn pink" href="/invoice-admin.html?customer=${encodeURIComponent(customer.email)}">New Invoice</a>
          </div>
        </article>
      `;
    }).join("");
  }

  function openCustomer(id){
    const found=customers.find(x=>String(x.id)===String(id));
    if(!found)return;

    current={...found};
    const reqs=customerRequests(current.email);
    const invs=customerInvoices(current.email);
    const requested=invs.reduce((s,x)=>s+Number(x.total||0),0);
    const paid=invs.filter(x=>x.status==="paid").reduce((s,x)=>s+Number(x.total||0),0);

    el("crmCustomerName").textContent=current.name||"Customer";
    el("crmCustomerEmail").value=current.email||"";
    el("crmCustomerPhone").value=current.phone||"";
    el("crmCustomerCompany").value=current.company||"";
    el("crmStatus").value=current.status||"new";
    el("crmNotes").value=current.notes||"";
    el("crmRequestCount").textContent=reqs.length;
    el("crmInvoiceCount").textContent=invs.length;
    el("crmRequestedTotal").textContent=money(requested);
    el("crmPaidTotal").textContent=money(paid);
    el("crmEmailButton").href=`mailto:${encodeURIComponent(current.email)}`;

    updateStatusBadge();

    el("crmRequests").innerHTML=reqs.length
      ? reqs.map(request=>{
          const count=requestItems.filter(i=>String(i.order_request_id)===String(request.id)).length;
          return `<div class="crm-history-item"><div><strong>${new Date(request.created_at).toLocaleDateString()}</strong><span>${count} item${count===1?"":"s"}</span></div><span>${esc(request.status||"new")}</span>${request.invoice_id?`<a class="btn" href="/invoice-admin.html?invoice=${esc(request.invoice_id)}">Invoice</a>`:""}</div>`;
        }).join("")
      : '<p class="muted">No requests.</p>';

    el("crmInvoices").innerHTML=invs.length
      ? invs.map(invoice=>`<div class="crm-history-item"><div><strong>${esc(invoice.invoice_number)}</strong><span>${new Date(invoice.created_at).toLocaleDateString()}</span></div><span>${money(invoice.total)} · ${esc(invoice.status)}</span><a class="btn" href="/invoice-admin.html?invoice=${esc(invoice.id)}">Open</a></div>`).join("")
      : '<p class="muted">No invoices.</p>';

    el("crmMessage").textContent="";
    el("crmModal").classList.add("open");
    document.body.classList.add("modal-open");
  }

  function close(){
    el("crmModal").classList.remove("open");
    document.body.classList.remove("modal-open");
    current=null;
  }

  function updateStatusBadge(){
    const status=el("crmStatus").value||"new";
    const badge=el("crmCustomerStatus");
    badge.className=`crm-status ${status}`;
    badge.textContent=status;
  }

  async function save(){
    if(!current)return;
    const payload={
      phone:el("crmCustomerPhone").value.trim()||null,
      company:el("crmCustomerCompany").value.trim()||null,
      status:el("crmStatus").value,
      notes:el("crmNotes").value.trim()||null,
      updated_at:new Date().toISOString()
    };

    const {error}=await db.from("customers").update(payload).eq("id",current.id);
    if(error){alert(error.message);return}

    el("crmMessage").textContent="Customer saved.";
    await load();
    openCustomer(current.id);
  }

  el("crmLoginButton").addEventListener("click",login);
  el("crmLogoutButton").addEventListener("click",logout);
  el("crmRefreshButton").addEventListener("click",load);
  el("crmSearch").addEventListener("input",render);
  el("crmFilter").addEventListener("change",render);
  el("crmCloseButton").addEventListener("click",close);
  el("crmSaveButton").addEventListener("click",save);
  el("crmStatus").addEventListener("change",updateStatusBadge);

  document.addEventListener("click",event=>{
    const open=event.target.closest("[data-open-customer]");
    if(open){openCustomer(open.dataset.openCustomer);return}
    if(event.target.id==="crmModal")close();
  });

  checkSession();
})();