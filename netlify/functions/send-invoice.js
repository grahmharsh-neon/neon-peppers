const out=(s,b)=>({statusCode:s,headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});
const esc=v=>String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const money=v=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(v||0));
exports.handler=async e=>{
  if(e.httpMethod!=="POST")return out(405,{error:"Method not allowed."});
  try{
    const id=JSON.parse(e.body||"{}").invoice_id;
    const u=process.env.SUPABASE_URL,k=process.env.SUPABASE_SERVICE_ROLE_KEY,r=process.env.RESEND_API_KEY;
    if(!id||!u||!k||!r)return out(500,{error:"Invoice email service is not configured."});
    const h={apikey:k,Authorization:`Bearer ${k}`};
    const invRes=await fetch(`${u}/rest/v1/invoices?id=eq.${encodeURIComponent(id)}&select=*`,{headers:h});
    const inv=(await invRes.json())?.[0];
    if(!inv)return out(404,{error:"Invoice not found."});
    const itemRes=await fetch(`${u}/rest/v1/invoice_items?invoice_id=eq.${encodeURIComponent(id)}&select=*&order=sort_order.asc`,{headers:h});
    const items=await itemRes.json();
    const rows=items.map(x=>`<tr><td style="padding:10px;border-bottom:1px solid #ddd">${esc(x.description)}</td><td>${esc(x.option_text||"")}</td><td style="text-align:right">${x.quantity}</td><td style="text-align:right">${money(x.unit_price)}</td><td style="text-align:right">${money(x.line_total)}</td></tr>`).join("");
    const html=`<div style="font-family:Arial;max-width:760px;margin:auto"><h2>Neon Peppers</h2><h1>Invoice ${esc(inv.invoice_number)}</h1><p><b>Bill To</b><br>${esc(inv.customer_name)}<br>${esc(inv.customer_email)}</p><table style="width:100%;border-collapse:collapse"><tr><th>Description</th><th>Option</th><th>Qty</th><th>Price</th><th>Total</th></tr>${rows}</table><div style="margin-left:auto;width:320px"><p>Subtotal: <b>${money(inv.subtotal)}</b></p><p>Discount: <b>-${money(inv.discount)}</b></p><p>Shipping: <b>${money(inv.shipping)}</b></p><p>Tax: <b>${money(inv.tax_amount)}</b></p><h2>Total: ${money(inv.total)}</h2></div>${inv.notes?`<p><b>Notes</b><br>${esc(inv.notes)}</p>`:""}<p>Research use only. Not for human or veterinary use.</p></div>`;
    const er=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${r}`,"Content-Type":"application/json"},body:JSON.stringify({
      from:process.env.RESEND_FROM||"Neon Peppers <onboarding@resend.dev>",
      to:[inv.customer_email],reply_to:process.env.INQUIRY_EMAIL||"neonpeppers@gmail.com",
      subject:`Invoice ${inv.invoice_number} from Neon Peppers`,html
    })});
    const result=await er.json().catch(()=>({}));
    if(!er.ok)return out(er.status,{error:result.message||"Invoice email failed."});
    return out(200,{ok:true});
  }catch(error){return out(500,{error:error.message||"Invoice email failed."})}
};