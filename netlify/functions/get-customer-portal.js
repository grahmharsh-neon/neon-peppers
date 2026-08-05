const crypto=require("crypto");
const out=(s,b)=>({statusCode:s,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify(b)});
async function sf(url,key){return fetch(url,{headers:{apikey:key,Authorization:`Bearer ${key}`}})}
exports.handler=async event=>{
  try{
    const token=String(event.queryStringParameters?.token||"");
    if(!token)return out(400,{error:"Access token is missing."});
    const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key)return out(500,{error:"Customer portal is not configured."});
    const hash=crypto.createHash("sha256").update(token).digest("hex");
    const tokenRes=await sf(`${url}/rest/v1/customer_portal_tokens?token_hash=eq.${hash}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=*`,key);
    const tokenRow=(await tokenRes.json())?.[0];
    if(!tokenRow)return out(401,{error:"This access link is invalid or expired."});
    const customer=(await(await sf(`${url}/rest/v1/customers?id=eq.${tokenRow.customer_id}&select=id,name,email,phone,company,status,referral_code,referral_credit`,key)).json())?.[0];
    if(!customer)return out(404,{error:"Customer record not found."});
    const email=encodeURIComponent(customer.email);
    const [requests,invoices]=await Promise.all([
      sf(`${url}/rest/v1/order_requests?email=eq.${email}&select=*&order=created_at.desc`,key).then(r=>r.json()),
      sf(`${url}/rest/v1/invoices?customer_email=eq.${email}&select=*&order=created_at.desc`,key).then(r=>r.json())
    ]);
    const requestIds=requests.map(x=>x.id);
    const invoiceIds=invoices.map(x=>x.id);
    let requestItems=[],invoiceItems=[];
    if(requestIds.length)requestItems=await(await sf(`${url}/rest/v1/order_request_items?order_request_id=in.(${requestIds.join(",")})&select=*`,key)).json();
    if(invoiceIds.length)invoiceItems=await(await sf(`${url}/rest/v1/invoice_items?invoice_id=in.(${invoiceIds.join(",")})&select=*`,key)).json();
    requests.forEach(r=>{
      const list=requestItems.filter(x=>x.order_request_id===r.id);
      r.item_summary=list.map(x=>`${x.product_name}${x.strength?` ${x.strength}`:""} × ${x.quantity}`).join(", ");
    });
    const productIds=[...new Set(requestItems.map(x=>x.product_id).filter(Boolean))];
    let coas=[];
    if(productIds.length){
      const products=await(await sf(`${url}/rest/v1/products?id=in.(${productIds.join(",")})&select=id,name`,key)).json();
      const productMap=new Map(products.map(x=>[x.id,x.name]));
      coas=await(await sf(`${url}/rest/v1/product_coas?product_id=in.(${productIds.join(",")})&is_public=eq.true&file_url=not.is.null&select=*`,key)).json();
      coas=coas.map(x=>({...x,product_name:productMap.get(x.product_id)||"Product"}));
    }
    return out(200,{customer,requests,invoices,invoice_items:invoiceItems,coas});
  }catch(error){return out(500,{error:error.message||"The customer portal could not be loaded."})}
};