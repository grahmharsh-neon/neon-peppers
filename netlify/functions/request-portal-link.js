const crypto=require("crypto");
const out=(s,b)=>({statusCode:s,headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});
const esc=v=>String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
async function sf(url,key,options={}){return fetch(url,{...options,headers:{"Content-Type":"application/json",apikey:key,Authorization:`Bearer ${key}`,...(options.headers||{})}})}
exports.handler=async event=>{
  if(event.httpMethod!=="POST")return out(405,{error:"Method not allowed."});
  try{
    const email=String(JSON.parse(event.body||"{}").email||"").trim().toLowerCase();
    if(!email)return out(400,{error:"Enter your email."});
    const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,resend=process.env.RESEND_API_KEY;
    if(!url||!key||!resend)return out(500,{error:"Customer portal email is not configured."});
    const result=await sf(`${url}/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=*`,key);
    const customer=(await result.json())?.[0];
    if(!customer)return out(200,{ok:true});
    const token=crypto.randomBytes(32).toString("hex");
    const hash=crypto.createHash("sha256").update(token).digest("hex");
    const expires=new Date(Date.now()+30*60*1000).toISOString();
    await sf(`${url}/rest/v1/customer_portal_tokens`,key,{method:"POST",body:JSON.stringify({customer_id:customer.id,token_hash:hash,expires_at:expires})});
    const origin=process.env.PUBLIC_SITE_URL||"https://neonpeppers.com";
    const link=`${origin}/customer-portal.html?token=${token}`;
    await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${resend}`,"Content-Type":"application/json"},body:JSON.stringify({
      from:process.env.RESEND_FROM||"Neon Peppers <onboarding@resend.dev>",
      to:[email],reply_to:process.env.INQUIRY_EMAIL||"neonpeppers@gmail.com",
      subject:"Your Neon Peppers customer portal link",
      html:`<div style="font-family:Arial;max-width:620px;margin:auto"><h1>Customer Portal</h1><p>Hi ${esc(customer.name)},</p><p>Use the secure link below to view your requests, invoices, COAs, and referral credit. It expires in 30 minutes.</p><p><a href="${link}" style="display:inline-block;padding:12px 18px;background:#ff2f92;color:white;text-decoration:none;border-radius:6px">Open Customer Portal</a></p><p>If you did not request this link, you can ignore this email.</p></div>`
    })});
    return out(200,{ok:true});
  }catch(error){return out(500,{error:error.message||"The access link could not be sent."})}
};