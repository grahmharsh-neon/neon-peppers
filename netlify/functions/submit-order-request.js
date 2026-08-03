const RECIPIENT=
  process.env.INQUIRY_EMAIL||"neonpeppers@gmail.com";

function response(statusCode,body){
  return{
    statusCode,
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  };
}

function esc(value){
  return String(value||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function validEmail(value){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value||"")
  );
}

exports.handler=async event=>{
  if(event.httpMethod!=="POST"){
    return response(405,{error:"Method not allowed."});
  }

  try{
    const body=JSON.parse(event.body||"{}");

    if(body.website){
      return response(200,{ok:true});
    }

    const name=String(body.name||"").trim();
    const email=String(body.email||"").trim().toLowerCase();
    const phone=String(body.phone||"").trim();
    const company=String(body.company||"").trim();
    const notes=String(body.notes||"").trim();
    const items=Array.isArray(body.items)?body.items:[];

    if(!name){
      return response(400,{error:"Please enter your name."});
    }

    if(!validEmail(email)){
      return response(400,{error:"Please enter a valid email."});
    }

    if(body.research_acknowledged!==true){
      return response(
        400,
        {error:"The research-use acknowledgment is required."}
      );
    }

    if(!items.length){
      return response(400,{error:"Select at least one item."});
    }

    const supabaseUrl=process.env.SUPABASE_URL;
    const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey=process.env.RESEND_API_KEY;
    const fromAddress=
      process.env.RESEND_FROM||
      "Neon Peppers <onboarding@resend.dev>";

    if(!supabaseUrl||!serviceKey){
      return response(
        500,
        {error:"The order request service is not configured."}
      );
    }

    const requestInsert=await fetch(
      `${supabaseUrl}/rest/v1/order_requests`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "apikey":serviceKey,
          "Authorization":`Bearer ${serviceKey}`,
          "Prefer":"return=representation"
        },
        body:JSON.stringify({
          name,
          email,
          phone:phone||null,
          company:company||null,
          notes:notes||null,
          source_url:body.source_url||null,
          research_acknowledged:true,
          status:"new"
        })
      }
    );

    if(!requestInsert.ok){
      console.error(await requestInsert.text());
      return response(
        500,
        {error:"The order request could not be saved."}
      );
    }

    const requestRow=(await requestInsert.json())?.[0];
    const requestId=requestRow?.id;

    if(!requestId){
      return response(
        500,
        {error:"The order request could not be created."}
      );
    }

    const cleanItems=items.map(item=>({
      order_request_id:requestId,
      product_id:item.product_id||null,
      order_form_item_id:item.order_form_item_id||null,
      variant_id:item.variant_id||null,
      product_name:String(item.product_name||"").slice(0,180),
      strength:String(item.strength||"").slice(0,100),
      quantity:Math.max(
        1,
        Math.min(99,Number(item.quantity||1))
      )
    }));

    const itemInsert=await fetch(
      `${supabaseUrl}/rest/v1/order_request_items`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "apikey":serviceKey,
          "Authorization":`Bearer ${serviceKey}`
        },
        body:JSON.stringify(cleanItems)
      }
    );

    if(!itemInsert.ok){
      console.error(await itemInsert.text());
      return response(
        500,
        {error:"The request was created, but its items could not be saved."}
      );
    }

    if(resendKey){
      const itemRows=cleanItems.map(item=>`
        <tr>
          <td style="padding:10px;border-bottom:1px solid #ddd">
            ${esc(item.product_name)}
          </td>
          <td style="padding:10px;border-bottom:1px solid #ddd">
            ${esc(item.strength)}
          </td>
          <td style="padding:10px;border-bottom:1px solid #ddd;text-align:center">
            ${item.quantity}
          </td>
        </tr>
      `).join("");

      await fetch("https://api.resend.com/emails",{
        method:"POST",
        headers:{
          "Authorization":`Bearer ${resendKey}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          from:fromAddress,
          to:[RECIPIENT],
          reply_to:email,
          subject:`New Neon Peppers Order Request — ${name}`,
          html:`
            <div style="font-family:Arial,sans-serif;max-width:720px;margin:auto">
              <h1>New Neon Peppers Order Request</h1>
              <p><strong>Name:</strong> ${esc(name)}</p>
              <p><strong>Email:</strong> ${esc(email)}</p>
              <p><strong>Phone:</strong> ${esc(phone||"Not provided")}</p>
              <p><strong>Company:</strong> ${esc(company||"Not provided")}</p>

              <table style="width:100%;border-collapse:collapse">
                <thead>
                  <tr>
                    <th style="padding:10px;text-align:left">Item</th>
                    <th style="padding:10px;text-align:left">Strength</th>
                    <th style="padding:10px;text-align:center">Qty</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
              </table>

              <h2>Notes</h2>
              <div style="white-space:pre-wrap">
                ${esc(notes||"No notes")}
              </div>
            </div>
          `
        })
      });
    }

    return response(200,{ok:true,id:requestId});
  }catch(error){
    console.error(error);

    return response(
      500,
      {error:"The order request could not be submitted."}
    );
  }
};
