const RECIPIENT=process.env.INQUIRY_EMAIL||"neonpeppers@gmail.com";
const response=(statusCode,body)=>({statusCode,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
const esc=v=>String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||""));
async function sf(url,key,options={}){
  return fetch(url,{
    ...options,
    headers:{
      "Content-Type":"application/json",
      apikey:key,
      Authorization:`Bearer ${key}`,
      ...(options.headers||{})
    }
  });
}

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
    const couponCode=String(body.coupon_code||"").trim().toUpperCase();
    const referralCode=String(body.referral_code||"").trim().toUpperCase();
    const requested=Array.isArray(body.items)?body.items:[];

    if(!name)return response(400,{error:"Please enter your name."});
    if(!validEmail(email))return response(400,{error:"Please enter a valid email."});
    if(body.research_acknowledged!==true)return response(400,{error:"The research-use acknowledgment is required."});
    if(!requested.length)return response(400,{error:"Select at least one item."});

    const url=process.env.SUPABASE_URL;
    const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resend=process.env.RESEND_API_KEY;
    const from=process.env.RESEND_FROM||"Neon Peppers <onboarding@resend.dev>";

    if(!url||!key)return response(500,{error:"The order request service is not configured."});

    const productIds=[...new Set(
      requested.map(item=>String(item.product_id||"").trim()).filter(Boolean)
    )];

    let productMap=new Map();

    if(productIds.length){
      const productResponse=await sf(
        `${url}/rest/v1/products?id=in.(${productIds.join(",")})&select=id,name,price`,
        key
      );

      if(productResponse.ok){
        const productRows=await productResponse.json();
        productMap=new Map(productRows.map(product=>[String(product.id),product]));
      }
    }

    const cleanItems=requested.map(item=>{
      const product=productMap.get(String(item.product_id||""));
      const quantity=Math.max(1,Math.min(99,Number(item.quantity||1)));
      const unitPrice=Math.max(0,Number(product?.price||item.unit_price||0));

      return{
        product_id:item.product_id||null,
        order_form_item_id:item.order_form_item_id||null,
        variant_id:item.variant_id||null,
        product_name:String(product?.name||item.product_name||"Item").slice(0,180),
        strength:String(item.strength||"").slice(0,100),
        quantity,
        unit_price:unitPrice,
        line_total:Number((unitPrice*quantity).toFixed(2))
      };
    });

    const subtotal=Number(
      cleanItems.reduce((sum,item)=>sum+item.line_total,0).toFixed(2)
    );

    let discountAmount=0;
    let appliedCoupon=null;

    if(couponCode){
      const couponResponse=await sf(
        `${url}/rest/v1/coupon_codes?code=eq.${encodeURIComponent(couponCode)}&active=eq.true&select=*`,
        key
      );

      const coupon=(await couponResponse.json())?.[0];
      const now=Date.now();

      const valid=
        coupon &&
        (!coupon.starts_at||new Date(coupon.starts_at).getTime()<=now) &&
        (!coupon.ends_at||new Date(coupon.ends_at).getTime()>=now) &&
        (!coupon.usage_limit||Number(coupon.usage_count||0)<Number(coupon.usage_limit)) &&
        subtotal>=Number(coupon.minimum_subtotal||0);

      if(!valid){
        return response(400,{
          error:"The coupon code is invalid, expired, or does not meet the minimum subtotal."
        });
      }

      discountAmount=coupon.discount_type==="percent"
        ? subtotal*(Number(coupon.discount_value||0)/100)
        : Number(coupon.discount_value||0);

      discountAmount=Number(
        Math.min(subtotal,Math.max(0,discountAmount)).toFixed(2)
      );
      appliedCoupon=coupon;
    }

    const invoiceTotal=Number(
      Math.max(0,subtotal-discountAmount).toFixed(2)
    );

    let referrer=null;

    if(referralCode){
      const referrerResponse=await sf(
        `${url}/rest/v1/customers?referral_code=eq.${encodeURIComponent(referralCode)}&select=*`,
        key
      );
      referrer=(await referrerResponse.json())?.[0]||null;

      if(referrer&&String(referrer.email||"").toLowerCase()===email){
        referrer=null;
      }
    }

    const customerUpsert=await sf(
      `${url}/rest/v1/customers?on_conflict=email`,
      key,
      {
        method:"POST",
        headers:{Prefer:"resolution=merge-duplicates,return=representation"},
        body:JSON.stringify({
          name,
          email,
          phone:phone||null,
          company:company||null,
          status:"active",
          first_request_at:new Date().toISOString(),
          last_request_at:new Date().toISOString(),
          updated_at:new Date().toISOString()
        })
      }
    );

    let customer=(customerUpsert.ok?await customerUpsert.json():[])?.[0];

    if(!customer){
      const lookup=await sf(
        `${url}/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=*`,
        key
      );
      customer=(await lookup.json())?.[0];
    }

    const requestResponse=await sf(
      `${url}/rest/v1/order_requests`,
      key,
      {
        method:"POST",
        headers:{Prefer:"return=representation"},
        body:JSON.stringify({
          name,
          email,
          phone:phone||null,
          company:company||null,
          notes:notes||null,
          source_url:body.source_url||null,
          research_acknowledged:true,
          status:"new",
          coupon_code:appliedCoupon?.code||null,
          discount_amount:discountAmount,
          referral_code:referrer?referralCode:null
        })
      }
    );

    if(!requestResponse.ok){
      return response(500,{error:"The order request could not be saved."});
    }

    const request=(await requestResponse.json())?.[0];

    const requestItemPayload=cleanItems.map(item=>({
      order_request_id:request.id,
      product_id:item.product_id,
      order_form_item_id:item.order_form_item_id,
      variant_id:item.variant_id,
      product_name:item.product_name,
      strength:item.strength,
      quantity:item.quantity
    }));

    const requestItemResponse=await sf(
      `${url}/rest/v1/order_request_items`,
      key,
      {method:"POST",body:JSON.stringify(requestItemPayload)}
    );

    if(!requestItemResponse.ok){
      return response(500,{
        error:"The request was saved, but its items could not be saved."
      });
    }

    const invoiceResponse=await sf(
      `${url}/rest/v1/invoices`,
      key,
      {
        method:"POST",
        headers:{Prefer:"return=representation"},
        body:JSON.stringify({
          order_request_id:request.id,
          customer_name:name,
          customer_email:email,
          customer_phone:phone||null,
          customer_company:company||null,
          status:"draft",
          subtotal,
          discount:discountAmount,
          shipping:0,
          tax_rate:0,
          tax_amount:0,
          total:invoiceTotal,
          notes:notes||null,
          coupon_code:appliedCoupon?.code||null,
          referral_code:referrer?referralCode:null
        })
      }
    );

    if(!invoiceResponse.ok){
      return response(500,{
        error:"The request was saved, but the draft invoice could not be created."
      });
    }

    const invoice=(await invoiceResponse.json())?.[0];

    const invoiceItems=cleanItems.map((item,index)=>({
      invoice_id:invoice.id,
      description:item.product_name,
      option_text:item.strength||null,
      quantity:item.quantity,
      unit_price:item.unit_price,
      line_total:item.line_total,
      sort_order:index
    }));

    const invoiceItemResponse=await sf(
      `${url}/rest/v1/invoice_items`,
      key,
      {method:"POST",body:JSON.stringify(invoiceItems)}
    );

    if(!invoiceItemResponse.ok){
      return response(500,{
        error:"The draft invoice was created, but its item lines could not be added."
      });
    }

    await sf(
      `${url}/rest/v1/order_requests?id=eq.${request.id}`,
      key,
      {
        method:"PATCH",
        body:JSON.stringify({
          invoice_id:invoice.id,
          invoice_number:invoice.invoice_number,
          invoice_total:invoiceTotal,
          status:"invoiced",
          updated_at:new Date().toISOString()
        })
      }
    );

    if(appliedCoupon){
      await sf(
        `${url}/rest/v1/coupon_codes?id=eq.${appliedCoupon.id}`,
        key,
        {
          method:"PATCH",
          body:JSON.stringify({
            usage_count:Number(appliedCoupon.usage_count||0)+1,
            updated_at:new Date().toISOString()
          })
        }
      );
    }

    if(referrer&&customer){
      await sf(
        `${url}/rest/v1/referrals`,
        key,
        {
          method:"POST",
          body:JSON.stringify({
            referrer_customer_id:referrer.id,
            referred_customer_id:customer.id,
            referred_email:email,
            referral_code:referralCode,
            order_request_id:request.id,
            invoice_id:invoice.id,
            reward_amount:20,
            status:"pending"
          })
        }
      );
    }

    if(resend){
      const rows=cleanItems.map(item=>`
        <tr>
          <td>${esc(item.product_name)}</td>
          <td>${esc(item.strength)}</td>
          <td>${item.quantity}</td>
          <td>$${item.line_total.toFixed(2)}</td>
        </tr>
      `).join("");

      await fetch("https://api.resend.com/emails",{
        method:"POST",
        headers:{
          Authorization:`Bearer ${resend}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          from,
          to:[RECIPIENT],
          reply_to:email,
          subject:`New Order Request — ${invoice.invoice_number}`,
          html:`<h1>New Order Request</h1><p>${esc(name)}<br>${esc(email)}</p><table>${rows}</table>${appliedCoupon?`<p>Coupon: ${esc(appliedCoupon.code)} (-$${discountAmount.toFixed(2)})</p>`:""}<h2>Total: $${invoiceTotal.toFixed(2)}</h2>`
        })
      });

      await fetch("https://api.resend.com/emails",{
        method:"POST",
        headers:{
          Authorization:`Bearer ${resend}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          from,
          to:[email],
          reply_to:RECIPIENT,
          subject:"We received your Neon Peppers request",
          html:`<h1>Request Received</h1><p>Hi ${esc(name)},</p><p>We received your request and will follow up after reviewing availability.</p><p><strong>Reference:</strong> ${esc(invoice.invoice_number)}</p><p><strong>Estimated total:</strong> $${invoiceTotal.toFixed(2)}</p><p>Research use only. Not for human or veterinary use.</p>`
        })
      });
    }

    return response(200,{
      ok:true,
      id:request.id,
      invoice_id:invoice.id,
      invoice_number:invoice.invoice_number,
      invoice_total:invoiceTotal,
      discount_amount:discountAmount,
      coupon_code:appliedCoupon?.code||null
    });
  }catch(error){
    console.error(error);
    return response(500,{
      error:error.message||"The order request could not be submitted."
    });
  }
};