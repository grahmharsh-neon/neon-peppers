const RECIPIENT = process.env.INQUIRY_EMAIL || "neonpeppers@gmail.com";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function json(statusCode, body){
  return {
    statusCode,
    headers:{
      "Content-Type":"application/json",
      "Access-Control-Allow-Origin":"*",
      "Access-Control-Allow-Headers":"Content-Type",
      "Access-Control-Allow-Methods":"POST, OPTIONS"
    },
    body:JSON.stringify(body)
  };
}

function escapeHtml(value){
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function validEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

exports.handler = async function(event){
  if(event.httpMethod === "OPTIONS"){
    return json(200, { ok:true });
  }

  if(event.httpMethod !== "POST"){
    return json(405, { error:"Method not allowed." });
  }

  try{
    const payload = JSON.parse(event.body || "{}");

    // Honeypot: act successful but do nothing.
    if(payload.website){
      return json(200, { ok:true });
    }

    const name = String(payload.name || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const company = String(payload.company || "").trim();
    const product = String(payload.product || "").trim();
    const message = String(payload.message || "").trim();
    const sourceUrl = String(payload.source_url || "").trim();
    const acknowledged = payload.research_acknowledged === true;

    if(!name || name.length > 100){
      return json(400, { error:"Please enter your name." });
    }

    if(!validEmail(email) || email.length > 180){
      return json(400, { error:"Please enter a valid email address." });
    }

    if(!message || message.length > 3000){
      return json(400, { error:"Please enter a message." });
    }

    if(!acknowledged){
      return json(400, { error:"The research-use acknowledgment is required." });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM || "Neon Peppers <onboarding@resend.dev>";

    if(!supabaseUrl || !serviceKey){
      console.error("Missing Supabase server environment variables.");
      return json(500, { error:"The inquiry service is not configured." });
    }

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/inquiries`, {
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
        company:company || null,
        product:product || null,
        message,
        research_acknowledged:true,
        source_url:sourceUrl || null,
        status:"new"
      })
    });

    if(!insertResponse.ok){
      const databaseError = await insertResponse.text();
      console.error("Supabase inquiry insert failed:", databaseError);
      return json(500, { error:"The inquiry could not be saved." });
    }

    // Save first, then email. If email is not configured, the inquiry still exists in admin.
    if(resendKey){
      const emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#16181c">
          <h1 style="margin-bottom:6px">New Neon Peppers Inquiry</h1>
          <p style="color:#5b6470;margin-top:0">A new inquiry was submitted through the website.</p>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:10px;border-bottom:1px solid #ddd;font-weight:bold">Name</td><td style="padding:10px;border-bottom:1px solid #ddd">${escapeHtml(name)}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #ddd;font-weight:bold">Email</td><td style="padding:10px;border-bottom:1px solid #ddd">${escapeHtml(email)}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #ddd;font-weight:bold">Company</td><td style="padding:10px;border-bottom:1px solid #ddd">${escapeHtml(company || "Not provided")}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #ddd;font-weight:bold">Product</td><td style="padding:10px;border-bottom:1px solid #ddd">${escapeHtml(product || "General inquiry")}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #ddd;font-weight:bold">Source</td><td style="padding:10px;border-bottom:1px solid #ddd">${escapeHtml(sourceUrl || "Website")}</td></tr>
          </table>
          <h2 style="margin-top:28px">Message</h2>
          <div style="padding:16px;background:#f3f5f7;border-radius:8px;white-space:pre-wrap">${escapeHtml(message)}</div>
          <p style="margin-top:25px"><a href="mailto:${encodeURIComponent(email)}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Reply to ${escapeHtml(name)}</a></p>
        </div>
      `;

      const emailResponse = await fetch(RESEND_ENDPOINT, {
        method:"POST",
        headers:{
          "Authorization":`Bearer ${resendKey}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          from:fromAddress,
          to:[RECIPIENT],
          reply_to:email,
          subject:`New Neon Peppers Inquiry${product ? ` — ${product}` : ""}`,
          html:emailHtml
        })
      });

      if(!emailResponse.ok){
        const emailError = await emailResponse.text();
        console.error("Resend email failed:", emailError);
        // The record was saved, so still return success.
        return json(200, {
          ok:true,
          saved:true,
          emailed:false
        });
      }
    }

    return json(200, {
      ok:true,
      saved:true,
      emailed:Boolean(resendKey)
    });
  }catch(error){
    console.error(error);
    return json(500, { error:"The inquiry could not be submitted." });
  }
};
