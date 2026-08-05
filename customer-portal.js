(() => {
  "use strict";
  const el=id=>document.getElementById(id);
  const money=v=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(v||0));
  const esc=v=>String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

  async function requestLink(){
    const email=el("portalEmail").value.trim();
    if(!email){el("portalAccessMessage").textContent="Enter your email.";return}
    el("portalSendLinkButton").disabled=true;
    el("portalAccessMessage").textContent="Sending secure link…";
    try{
      const response=await fetch("/.netlify/functions/request-portal-link",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||"The link could not be sent.");
      el("portalAccessMessage").textContent="Check your email for the secure access link.";
    }catch(error){
      el("portalAccessMessage").textContent=error.message;
    }finally{
      el("portalSendLinkButton").disabled=false;
    }
  }

  async function loadPortal(token){
    el("portalAccess").hidden=true;
    try{
      const response=await fetch(`/.netlify/functions/get-customer-portal?token=${encodeURIComponent(token)}`);
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||"Access link is invalid or expired.");
      render(result);
    }catch(error){
      el("portalAccess").hidden=false;
      el("portalAccessMessage").textContent=error.message;
    }
  }

  function render(data){
    const customer=data.customer;
    el("portalDashboard").hidden=false;
    el("portalCustomerName").textContent=customer.name||"Customer";
    el("portalCustomerEmail").textContent=customer.email||"";
    el("portalRequestCount").textContent=data.requests.length;
    el("portalInvoiceCount").textContent=data.invoices.length;
    el("portalReferralCredit").textContent=money(customer.referral_credit);
    el("portalReferralCode").textContent=customer.referral_code||"—";

    const referralLink=`${location.origin}/order.html?ref=${encodeURIComponent(customer.referral_code||"")}`;
    el("portalReferralLink").value=referralLink;

    el("portalRequests").innerHTML=data.requests.length
      ?data.requests.map(x=>`<div class="portal-list-item"><div><strong>${new Date(x.created_at).toLocaleDateString()}</strong><span>${esc(x.item_summary||"Order request")}</span></div><span class="portal-status">${esc(x.status||"new")}</span>${x.invoice_id?`<a class="btn" href="#invoice-${esc(x.invoice_id)}">Invoice</a>`:""}</div>`).join("")
      :'<p class="muted">No requests yet.</p>';

    el("portalInvoices").innerHTML=data.invoices.length
      ?data.invoices.map(x=>`<div class="portal-list-item" id="invoice-${esc(x.id)}"><div><strong>${esc(x.invoice_number)}</strong><span>${new Date(x.created_at).toLocaleDateString()}</span></div><span>${money(x.total)} · ${esc(x.status)}</span><button class="btn" data-print-invoice="${esc(x.id)}">View / Print</button></div>`).join("")
      :'<p class="muted">No invoices yet.</p>';

    el("portalCoas").innerHTML=data.coas.length
      ?data.coas.map(x=>`<div class="portal-list-item"><div><strong>${esc(x.product_name)}</strong><span>Lot ${esc(x.lot_number||"Not listed")}</span></div><span>${esc(x.test_date||"")}</span><a class="btn blue" href="${esc(x.file_url)}" target="_blank" rel="noopener">View COA</a></div>`).join("")
      :'<p class="muted">No matching public COAs are available.</p>';

    window.portalInvoices=data.invoices;
    window.portalInvoiceItems=data.invoice_items;
  }

  function printInvoice(id){
    const inv=(window.portalInvoices||[]).find(x=>String(x.id)===String(id));
    const items=(window.portalInvoiceItems||[]).filter(x=>String(x.invoice_id)===String(id));
    if(!inv)return;
    const rows=items.map(x=>`<tr><td>${esc(x.description)}</td><td>${esc(x.option_text||"")}</td><td>${x.quantity}</td><td>${money(x.unit_price)}</td><td>${money(x.line_total)}</td></tr>`).join("");
    const w=window.open("","_blank");
    w.document.write(`<!doctype html><html><head><title>${esc(inv.invoice_number)}</title><style>body{font-family:Arial;padding:40px}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}</style></head><body><h2>Neon Peppers</h2><h1>Invoice ${esc(inv.invoice_number)}</h1><p>${esc(inv.customer_name)}<br>${esc(inv.customer_email)}</p><table><tr><th>Item</th><th>Option</th><th>Qty</th><th>Price</th><th>Total</th></tr>${rows}</table><h2>Total: ${money(inv.total)}</h2><p>Research use only. Not for human or veterinary use.</p></body></html>`);
    w.document.close();setTimeout(()=>w.print(),200);
  }

  el("portalSendLinkButton").addEventListener("click",requestLink);
  el("portalCopyReferralButton").addEventListener("click",async()=>{
    await navigator.clipboard.writeText(el("portalReferralLink").value);
    el("portalCopyReferralButton").textContent="Copied";
    setTimeout(()=>el("portalCopyReferralButton").textContent="Copy Link",1200);
  });
  document.addEventListener("click",event=>{
    const button=event.target.closest("[data-print-invoice]");
    if(button)printInvoice(button.dataset.printInvoice);
  });

  const token=new URLSearchParams(location.search).get("token");
  if(token)loadPortal(token);
})();