const RECIPIENT =
  process.env.INQUIRY_EMAIL || "neonpeppers@gmail.com";

function response(statusCode, body){
  return {
    statusCode,
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify(body)
  };
}

function esc(value){
  return String(value || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function validEmail(value){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value || "")
  );
}

async function supabaseFetch(url, serviceKey, options = {}){
  return fetch(url,{
    ...options,
    headers:{
      "Content-Type":"application/json",
      "apikey":serviceKey,
      "Authorization":`Bearer ${serviceKey}`,
      ...(options.headers || {})
    }
  });
}

exports.handler = async event => {
  if(event.httpMethod !== "POST"){
    return response(405,{error:"Method not allowed."});
  }

  try{
    const body = JSON.parse(event.body || "{}");

    if(body.website){
      return response(200,{ok:true});
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const company = String(body.company || "").trim();
    const notes = String(body.notes || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if(!name){
      return response(400,{error:"Please enter your name."});
    }

    if(!validEmail(email)){
      return response(400,{error:"Please enter a valid email."});
    }

    if(body.research_acknowledged !== true){
      return response(
        400,
        {error:"The research-use acknowledgment is required."}
      );
    }

    if(!items.length){
      return response(400,{error:"Select at least one item."});
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    const fromAddress =
      process.env.RESEND_FROM ||
      "Neon Peppers <onboarding@resend.dev>";

    if(!supabaseUrl || !serviceKey){
      return response(
        500,
        {error:"The order request service is not configured."}
      );
    }

    const productIds = [
      ...new Set(
        items
          .map(item => String(item.product_id || "").trim())
          .filter(Boolean)
      )
    ];

    let productMap = new Map();

    if(productIds.length){
      const productQuery = encodeURIComponent(
        `(${productIds.join(",")})`
      );

      const productResponse = await supabaseFetch(
        `${supabaseUrl}/rest/v1/products?id=in.${productQuery}&select=id,name,price,price_note`,
        serviceKey
      );

      if(!productResponse.ok){
        console.error("Product price lookup failed:", await productResponse.text());
      }else{
        const products = await productResponse.json();
        productMap = new Map(
          products.map(product => [String(product.id), product])
        );
      }
    }

    const requestInsert = await supabaseFetch(
      `${supabaseUrl}/rest/v1/order_requests`,
      serviceKey,
      {
        method:"POST",
        headers:{"Prefer":"return=representation"},
        body:JSON.stringify({
          name,
          email,
          phone:phone || null,
          company:company || null,
          notes:notes || null,
          source_url:body.source_url || null,
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

    const requestRow = (await requestInsert.json())?.[0];
    const requestId = requestRow?.id;

    if(!requestId){
      return response(
        500,
        {error:"The order request could not be created."}
      );
    }

    const cleanItems = items.map(item => {
      const product = productMap.get(String(item.product_id || ""));
      const quantity = Math.max(
        1,
        Math.min(99,Number(item.quantity || 1))
      );
      const unitPrice = Math.max(
        0,
        Number(product?.price || item.unit_price || 0)
      );

      return {
        order_request_id:requestId,
        product_id:item.product_id || null,
        order_form_item_id:item.order_form_item_id || null,
        variant_id:item.variant_id || null,
        product_name:String(
          product?.name || item.product_name || ""
        ).slice(0,180),
        strength:String(item.strength || "").slice(0,100),
        quantity,
        unit_price:unitPrice,
        line_total:Number((unitPrice * quantity).toFixed(2))
      };
    });

    const requestItemRows = cleanItems.map(item => ({
      order_request_id:item.order_request_id,
      product_id:item.product_id,
      order_form_item_id:item.order_form_item_id,
      variant_id:item.variant_id,
      product_name:item.product_name,
      strength:item.strength,
      quantity:item.quantity
    }));

    const itemInsert = await supabaseFetch(
      `${supabaseUrl}/rest/v1/order_request_items`,
      serviceKey,
      {
        method:"POST",
        body:JSON.stringify(requestItemRows)
      }
    );

    if(!itemInsert.ok){
      console.error(await itemInsert.text());
      return response(
        500,
        {error:"The request was created, but its items could not be saved."}
      );
    }

    const subtotal = Number(
      cleanItems.reduce(
        (sum,item) => sum + Number(item.line_total || 0),
        0
      ).toFixed(2)
    );

    const invoiceInsert = await supabaseFetch(
      `${supabaseUrl}/rest/v1/invoices`,
      serviceKey,
      {
        method:"POST",
        headers:{"Prefer":"return=representation"},
        body:JSON.stringify({
          order_request_id:requestId,
          customer_name:name,
          customer_email:email,
          customer_phone:phone || null,
          customer_company:company || null,
          status:"draft",
          subtotal,
          discount:0,
          shipping:0,
          tax_rate:0,
          tax_amount:0,
          total:subtotal,
          notes:notes || null
        })
      }
    );

    if(!invoiceInsert.ok){
      console.error("Invoice creation failed:", await invoiceInsert.text());

      return response(
        500,
        {
          error:
            "The order request was saved, but the draft invoice could not be created."
        }
      );
    }

    const invoiceRow = (await invoiceInsert.json())?.[0];
    const invoiceId = invoiceRow?.id;
    const invoiceNumber = invoiceRow?.invoice_number;

    if(!invoiceId){
      return response(
        500,
        {
          error:
            "The order request was saved, but the draft invoice could not be completed."
        }
      );
    }

    const invoiceItems = cleanItems.map((item,index) => ({
      invoice_id:invoiceId,
      description:item.product_name || "Product",
      option_text:item.strength || null,
      quantity:item.quantity,
      unit_price:item.unit_price,
      line_total:item.line_total,
      sort_order:index
    }));

    const invoiceItemInsert = await supabaseFetch(
      `${supabaseUrl}/rest/v1/invoice_items`,
      serviceKey,
      {
        method:"POST",
        body:JSON.stringify(invoiceItems)
      }
    );

    if(!invoiceItemInsert.ok){
      console.error(
        "Invoice item creation failed:",
        await invoiceItemInsert.text()
      );

      return response(
        500,
        {
          error:
            "The draft invoice was created, but its item lines could not be added."
        }
      );
    }

    await supabaseFetch(
      `${supabaseUrl}/rest/v1/order_requests?id=eq.${encodeURIComponent(requestId)}`,
      serviceKey,
      {
        method:"PATCH",
        body:JSON.stringify({
          invoice_id:invoiceId,
          invoice_number:invoiceNumber,
          invoice_total:subtotal,
          status:"invoiced",
          updated_at:new Date().toISOString()
        })
      }
    );

    if(resendKey){
      const itemRows = cleanItems.map(item => `
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
          <td style="padding:10px;border-bottom:1px solid #ddd;text-align:right">
            $${item.unit_price.toFixed(2)}
          </td>
          <td style="padding:10px;border-bottom:1px solid #ddd;text-align:right">
            $${item.line_total.toFixed(2)}
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
          subject:
            `New Order Request + Draft Invoice ${invoiceNumber} — ${name}`,
          html:`
            <div style="font-family:Arial,sans-serif;max-width:760px;margin:auto">
              <h1>New Neon Peppers Order Request</h1>
              <p><strong>Draft Invoice:</strong> ${esc(invoiceNumber)}</p>
              <p><strong>Invoice Total:</strong> $${subtotal.toFixed(2)}</p>
              <p><strong>Name:</strong> ${esc(name)}</p>
              <p><strong>Email:</strong> ${esc(email)}</p>
              <p><strong>Phone:</strong> ${esc(phone || "Not provided")}</p>
              <p><strong>Company:</strong> ${esc(company || "Not provided")}</p>

              <table style="width:100%;border-collapse:collapse">
                <thead>
                  <tr>
                    <th style="padding:10px;text-align:left">Item</th>
                    <th style="padding:10px;text-align:left">Strength</th>
                    <th style="padding:10px;text-align:center">Qty</th>
                    <th style="padding:10px;text-align:right">Price</th>
                    <th style="padding:10px;text-align:right">Total</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
              </table>

              <h2>Notes</h2>
              <div style="white-space:pre-wrap">
                ${esc(notes || "No notes")}
              </div>
            </div>
          `
        })
      });
    }

    return response(200,{
      ok:true,
      id:requestId,
      invoice_id:invoiceId,
      invoice_number:invoiceNumber,
      invoice_total:subtotal
    });
  }catch(error){
    console.error(error);

    return response(
      500,
      {
        error:
          error.message ||
          "The order request could not be submitted."
      }
    );
  }
};
