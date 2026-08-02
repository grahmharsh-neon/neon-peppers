let inquiryProductsLoaded = false;

async function getInquiryProducts(){
  const select = document.getElementById("inquiryProduct");
  if(!select || inquiryProductsLoaded) return;

  const config = window.NEON_CONFIG || {};
  if(!window.supabase || !config.supabaseUrl || !config.supabasePublishableKey) return;

  try{
    const client = window.supabase.createClient(
      config.supabaseUrl,
      config.supabasePublishableKey
    );

    const { data, error } = await client
      .from("products")
      .select("name")
      .eq("visible", true)
      .order("name", { ascending:true });

    if(error) throw error;

    (data || []).forEach(product => {
      const option = document.createElement("option");
      option.value = product.name;
      option.textContent = product.name;
      select.appendChild(option);
    });

    const pathParts = decodeURIComponent(window.location.pathname)
      .split("/")
      .filter(Boolean);

    if(pathParts[0] === "products" && pathParts[1]){
      const slug = pathParts.slice(1).join("-");
      const match = (data || []).find(product =>
        String(product.name || "")
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") === slug
      );

      if(match){
        select.value = match.name;
      }
    }

    inquiryProductsLoaded = true;
  }catch(error){
    console.warn("Could not load inquiry products:", error);
  }
}

function setInquiryStatus(message, type = ""){
  const status = document.getElementById("inquiryStatus");
  if(!status) return;
  status.textContent = message;
  status.className = `form-status ${type}`.trim();
}

async function submitInquiry(event){
  event.preventDefault();

  const form = event.currentTarget;
  const button = document.getElementById("sendInquiryButton");
  const consent = document.getElementById("inquiryConsent");

  if(!form.reportValidity()) return;

  if(!consent.checked){
    setInquiryStatus("Please confirm the research-use statement.", "error");
    return;
  }

  const payload = {
    name: document.getElementById("inquiryName").value.trim(),
    email: document.getElementById("inquiryEmail").value.trim(),
    company: document.getElementById("inquiryCompany").value.trim(),
    product: document.getElementById("inquiryProduct").value,
    message: document.getElementById("inquiryMessage").value.trim(),
    research_acknowledged: consent.checked,
    website: document.getElementById("inquiryWebsite").value,
    source_url: window.location.href
  };

  button.disabled = true;
  button.textContent = "Sending…";
  setInquiryStatus("");

  try{
    const response = await fetch("/.netlify/functions/submit-inquiry", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if(!response.ok){
      throw new Error(result.error || "The inquiry could not be sent.");
    }

    form.reset();
    await getInquiryProducts();

    const pathParts = decodeURIComponent(window.location.pathname)
      .split("/")
      .filter(Boolean);

    if(pathParts[0] === "products"){
      await getInquiryProducts();
    }

    setInquiryStatus("Thank you. Your inquiry was sent.", "success");
  }catch(error){
    console.error(error);
    setInquiryStatus(error.message || "The inquiry could not be sent.", "error");
  }finally{
    button.disabled = false;
    button.textContent = "Send Inquiry";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("inquiryForm");
  if(!form) return;

  getInquiryProducts();
  form.addEventListener("submit", submitInquiry);
});
