const RECIPIENT=process.env.INQUIRY_EMAIL||"neonpeppers@gmail.com";
const response=(statusCode,body)=>({statusCode,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
const esc=v=>String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||""));
async function sf(url,key,options={}){return fetch(url,{...options,headers:{"Content-Type":"application/json",apikey:key,Authorization:`Bearer ${key}`,...(options.headers||{})}})}

exports.handler=async event=>{
  if(event.httpMethod!=="POST")return response(405,{error:"Method not allowed."});
  try{
    const body=JSON.parse(event.body||"{}");
    if(body.website)return response(200,{ok:true});

    const name=String(body.name||"").trim();
    const email=String(body.email||"").trim().toLowerCase();
    const phone=String(body.phone||"").trim();
    const company=String(body.company||"").trim();
    const notes=String(body.notes||"").trim();
    const requested=Array.isArray(body.items)?body.items:[];

    if(!name)return response(400,{error:"Please enter your name."});
    if(!validEmail(email))return response(400,{error:"Please enter a valid email."});
    if(body.research_acknowledged!==true)return response(400,{error:"The research-use acknowledgment is required."});
    if(!requested.length)return response(400,{error:"Select at least one item."});

    const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resend=process.env.RESEND_API_KEY;
    const from=process.env.RESEND_FROM||"Neon Peppers <onboarding@resend.dev>";
    if(!url||!key)return response(500,{error:"The order request service is not configured."});

    const ids=[...new Set(requested.map(x=>String(x.product_id||"").trim()).filter(Boolean))];
    let productMap=new Map();
    if(ids.length){
      const r=await sf(`${url}/rest/v1/products?id=in.(${ids.join(",")})&select=id,name,price`,key);
      if(r.ok){const data=await r.json();productMap=new Map(data.map(x=>[String(x.id),x]))}
    }

    const requestResponse=await sf(`${url}/rest/v1/order_requests`,key,{
      method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({name,email,phone:phone||null,company:company||null,notes:notes||null,source_url:body.source_url||null,research_acknowledged:true,status:"new"})
    });
    if(!requestResponse.ok)return response(500,{error:"The order request could not be saved."});
    const request=(await requestResponse.json())[0];

    const clean=requested.map(x=>{
      const product=productMap.get(String(x.product_id||""));
      const quantity=Math.max(1,Math.min(99,Number(x.quantity||1)));
      const unitPrice=Math.max(0,Number(product?.price||x.unit_price||0));
      return{
        product_id:x.product_id||null,order_form_item_id:x.order_form_item_id||null,variant_id:x.variant_id||null,
        product_name:String(product?.name||x.product_name||"Item").slice(0,180),
        strength:String(x.strength||"").slice(0,100),quantity,unit_price:unitPrice,
        line_total:Number((unitPrice*quantity).toFixed(2))
      };
    });

    const requestItems=clean.map(x=>({...x,order_request_id:request.id}));
    const requestItemPayload=requestItems.map(({unit_price,line_total,...x})=>x);
    const itemResponse=await sf(`${url}/rest/v1/order_request_items`,key,{method:"POST",body:JSON.stringify(requestItemPayload)});
    if(!itemResponse.ok)return response(500,{error:"The request was saved, but its items could not be saved."});

    const subtotal=Number(clean.reduce((s,x)=>s+x.line_total,0).toFixed(2));
    const invoiceResponse=await sf(`${url}/rest/v1/invoices`,key,{
      method:"POST",headers:{Prefer:"return=representation"},
      body:JSON.stringify({
        order_request_id:request.id,customer_name:name,customer_email:email,
        customer_phone:phone||null,customer_company:company||null,status:"draft",
        subtotal,discount:0,shipping:0,tax_rate:0,tax_amount:0,total:subtotal,notes:notes||null
      })
    });
    if(!invoiceResponse.ok)return response(500,{error:"The request was saved, but the draft invoice could not be created."});
    const invoice=(await invoiceResponse.json())[0];

    const invoiceItems=clean.map((x,i)=>({
      invoice_id:invoice.id,description:x.product_name,option_text:x.strength||null,
      quantity:x.quantity,unit_price:x.unit_price,line_total:x.line_total,sort_order:i
    }));
    const invoiceItemResponse=await sf(`${url}/rest/v1/invoice_items`,key,{method:"POST",body:JSON.stringify(invoiceItems)});
    if(!invoiceItemResponse.ok)return response(500,{error:"The draft invoice was created, but its item lines could not be added."});

    await sf(`${url}/rest/v1/order_requests?id=eq.${request.id}`,key,{
      method:"PATCH",
      body:JSON.stringify({invoice_id:invoice.id,invoice_number:invoice.invoice_number,invoice_total:subtotal,status:"invoiced",updated_at:new Date().toISOString()})
    });

    if(resend){
      const rows=clean.map(x=>`<tr><td>${esc(x.product_name)}</td><td>${esc(x.strength)}</td><td>${x.quantity}</td><td>$${x.line_total.toFixed(2)}</td></tr>`).join("");
      await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${resend}`,"Content-Type":"application/json"},body:JSON.stringify({
        from,to:[RECIPIENT],reply_to:email,subject:`New Order Request — ${invoice.invoice_number}`,
        html:`<h1>New Order Request</h1><p>${esc(name)}<br>${esc(email)}</p><table>${rows}</table><h2>Total: $${subtotal.toFixed(2)}</h2>`
      })});
      await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${resend}`,"Content-Type":"application/json"},body:JSON.stringify({
        from,to:[email],reply_to:RECIPIENT,subject:"We received your Neon Peppers request",
        html:`<h1>Request Received</h1><p>Hi ${esc(name)},</p><p>We received your request and will follow up after reviewing availability.</p><p><strong>Reference:</strong> ${esc(invoice.invoice_number)}</p><p>Research use only. Not for human or veterinary use.</p>`
      })});
    }

    return response(200,{ok:true,id:request.id,invoice_id:invoice.id,invoice_number:invoice.invoice_number,invoice_total:subtotal});
  }catch(error){
    console.error(error);
    return response(500,{error:error.message||"The order request could not be submitted."});
  }
};