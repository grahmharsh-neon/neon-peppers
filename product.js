let client = null;
let settings = {};
let allProducts = [];
let currentProduct = null;

function el(id){
  return document.getElementById(id);
}

function esc(value){
  return String(value || "").replace(/[&<>"']/g, character => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[character]));
}

function createClient(){
  const config = window.NEON_CONFIG || {};

  if(!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase){
    return null;
  }

  return window.supabase.createClient(
    config.supabaseUrl,
    config.supabasePublishableKey
  );
}

function slugify(value){
  return String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getRequestedProduct(){
  const path = decodeURIComponent(window.location.pathname);
  const parts = path.split("/").filter(Boolean);
  const params = new URLSearchParams(window.location.search);

  return {
    slug:
      parts[0] === "products" && parts[1]
        ? parts.slice(1).join("-")
        : params.get("slug") || "",
    id:params.get("id") || ""
  };
}

async function loadData(){
  client=createClient();

  if(!client){
    showNotFound();
    return;
  }

  const requested=
    typeof getRequestedProduct==="function"
      ? getRequestedProduct()
      : {id:new URLSearchParams(window.location.search).get("id")||"",slug:""};

  if(!requested.id && !requested.slug){
    console.error("No product ID or slug was provided.");
    showNotFound();
    return;
  }

  try{
    const settingsResult=await client
      .from("site_settings")
      .select("*")
      .eq("id",1)
      .maybeSingle();

    if(!settingsResult.error){
      settings=settingsResult.data||{};
      applySettings();
    }

    let exactProduct=null;

    if(requested.id){
      const exactResult=await client
        .from("products")
        .select("*")
        .eq("id",requested.id)
        .eq("lifecycle_status","published")
        .eq("visible",true)
        .maybeSingle();

      if(exactResult.error){
        console.error("Product ID lookup failed:",exactResult.error);
      }else{
        exactProduct=exactResult.data;
      }
    }

    const allResult=await client
      .from("products")
      .select("*")
      .eq("lifecycle_status","published")
      .eq("visible",true)
      .order("created_at",{ascending:false});

    if(allResult.error){
      console.error("Product list failed:",allResult.error);
      showNotFound();
      return;
    }

    allProducts=allResult.data||[];
    currentProduct=exactProduct;

    if(!currentProduct&&requested.slug){
      currentProduct=allProducts.find(item=>
        slugify(item.name)===slugify(requested.slug)
      );
    }

    if(!currentProduct){
      showNotFound();
      return;
    }


    renderProduct(currentProduct);
    applyProductSeo(currentProduct);
    trackProductView(currentProduct.id);
    renderRelated();

    if(typeof loadProductCoas==="function"){
      loadProductCoas(currentProduct.id);
    }
  }catch(error){
    console.error("Product page error:",error);
    showNotFound();
  }
}


function applySettings(){
  if(settings.logo_url){
    document.querySelectorAll(".brand img").forEach(image => {
      image.src = settings.logo_url;
    });
  }

  if(settings.contact_email){
    const emailLink = el("productEmail");
    emailLink.href = "/order.html";
  }

  const footer = document.querySelector("footer > div:first-child");

  if(footer && settings.footer_disclaimer){
    footer.innerHTML = `<strong>Neon Peppers Research</strong><br>${esc(settings.footer_disclaimer)}`;
  }
}

function statusText(product){
  if(product.status === "coming_soon") return "Coming Soon";
  if(product.status === "out_of_stock") return "Out of Stock";
  return "Available";
}

function applyProductSeo(product){
  document.title=product.seo_title||`${product.name} | Neon Peppers`;
  const meta=document.querySelector('meta[name="description"]');
  if(meta)meta.setAttribute("content",product.seo_description||String(product.description||"").replace(/[#*_`]/g,"").slice(0,155));
  history.replaceState(null,"",`/products/${encodeURIComponent(product.slug||slugify(product.name))}?id=${encodeURIComponent(product.id)}`);
}
async function trackProductView(productId){
  try{await client.from("product_events").insert({
    product_id:productId,event_type:"view",source_url:window.location.href
  });}catch(error){}
}

function renderProduct(product){
  const productPage = el("productPage");
  const notFound = el("productNotFound");
  const orderSection = el("productOrderSection");

  if(notFound){
    notFound.hidden = true;
  }

  if(productPage){
    productPage.hidden = false;
  }

  if(orderSection){
    orderSection.hidden = false;
  }

  document.title = `${product.name} | Neon Peppers Research`;
  document.querySelector('meta[name="description"]').setAttribute(
    "content",
    product.description || `${product.name} research material reference page.`
  );

  el("breadcrumbName").textContent = product.name;
  el("productCategory").textContent = product.category || "Research Compound";
  el("productName").textContent = product.name;
  const optionLabel = product.option_label || "Size";
  const optionText = Array.isArray(product.option_values) && product.option_values.length
    ? product.option_values.join(" · ")
    : "Not listed";

  el("productOptionLabel").textContent = optionLabel;
  el("productStrength").textContent = optionText;

  const priceBox=el("productPrice");
  if(priceBox){
    const price=Number(product.price||0);
    const compare=Number(product.compare_at_price||0);
    const note=String(product.price_note||"").trim();

    priceBox.innerHTML=price>0
      ? `
          <div class="product-page-price-main">$${price.toFixed(2)}</div>
          ${compare>price ? `<div class="product-page-price-compare">$${compare.toFixed(2)}</div>` : ""}
          ${note ? `<div class="product-page-price-note">${esc(note)}</div>` : ""}
        `
      : '<div class="product-page-price-main">Price on request</div>';
  }

  el("productDescription").innerHTML =
    window.renderMarkdown
      ? window.renderMarkdown(
          product.description || "No description is currently available."
        )
      : esc(
          product.description || "No description is currently available."
        );

  el("identityName").textContent = product.name;
  el("identityCategory").textContent = product.category || "Research Compound";
  el("identityOptionLabel").textContent = optionLabel;
  el("identityStrength").textContent = optionText;
  el("identityStatus").textContent = statusText(product);

  const image = el("productHeroImage");

  if(product.image_url){
    image.style.backgroundImage = `url("${product.image_url}")`;
    image.textContent = "";
  }

  const status = el("productStatus");
  status.classList.remove("coming","out");
  status.textContent = statusText(product);

  if(product.status === "coming_soon"){
    status.classList.add("coming");
  }else if(product.status === "out_of_stock"){
    status.classList.add("out");
  }

  const coaButtons = [el("productCoa"), el("detailCoa")];

  if(product.coa_url){
    coaButtons.forEach(button => {
      button.href = product.coa_url;
      button.style.display = "";
    });
  }else{
    coaButtons.forEach(button => {
      button.style.display = "none";
    });
  }
}

function renderRelated(){
  const related = allProducts
    .filter(product =>
      product.id !== currentProduct.id &&
      product.category === currentProduct.category
    )
    .slice(0, 3);

  const fallback = allProducts
    .filter(product => product.id !== currentProduct.id)
    .slice(0, 3);

  const list = related.length ? related : fallback;

  if(!list.length){
    return;
  }

  const section = el("relatedSection");
  const grid = el("relatedProducts");

  grid.innerHTML = list.map(product => {
    const image = product.image_url
      ? `style="background-image:url('${String(product.image_url).replace(/'/g,"%27")}')"`
      : "";

    return `
      <article class="card" data-slug="${esc(slugify(product.name))}">
        <div class="card-image" ${image}>${product.image_url ? "" : "⚗"}</div>
        <div class="card-body">
          <div class="category">${esc(product.category || "Research Compound")}</div>
          <h3>${esc(product.name)}</h3>
          <p>${esc(product.description || "")}</p>
          <div class="card-actions">
            <div class="strength">${esc(product.strength || "")}</div>
            <div class="card-view">View details</div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const selected = allProducts.find(
        item => slugify(item.name) === card.dataset.slug
      );

      if(!selected?.id){
        return;
      }

      window.location.href =
        `/product.html?id=${encodeURIComponent(selected.id)}`;
    });
  });

  section.hidden = false;
}

function showNotFound(){
  const productPage = el("productPage");
  const orderSection = el("productOrderSection");
  const relatedSection = el("relatedSection");
  const notFound = el("productNotFound");

  if(productPage){
    productPage.hidden = true;
  }

  if(orderSection){
    orderSection.hidden = true;
  }

  if(relatedSection){
    relatedSection.hidden = true;
  }

  if(notFound){
    notFound.hidden = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  el("menuBtn")?.addEventListener("click", () => {
    el("navLinks").classList.toggle("open");
  });

  loadData();
});
