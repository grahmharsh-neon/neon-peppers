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
    .toLowerCase()
    .trim()
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
  client = createClient();

  if(!client){
    showNotFound();
    return;
  }

  const requested = getRequestedProduct();

  const settingsPromise = client
    .from("site_settings")
    .select("*")
    .eq("id",1)
    .maybeSingle();

  let productResult;

  if(requested.id){
    productResult = await client
      .from("products")
      .select("*")
      .eq("id",requested.id)
      .eq("visible",true)
      .maybeSingle();
  }else{
    productResult = {
      data:null,
      error:null
    };
  }

  const settingsResult = await settingsPromise;

  if(!settingsResult.error){
    settings = settingsResult.data || {};
    applySettings();
  }

  if(productResult.error){
    console.error(productResult.error);
  }

  if(productResult.data){
    currentProduct = productResult.data;
  }else{
    const productsResult = await client
      .from("products")
      .select("*")
      .eq("visible",true)
      .order("created_at",{ascending:false});

    if(productsResult.error){
      console.error(productsResult.error);
      showNotFound();
      return;
    }

    allProducts = productsResult.data || [];

    currentProduct = allProducts.find(product =>
      requested.slug &&
      slugify(product.name) === requested.slug
    );
  }

  if(!currentProduct){
    showNotFound();
    return;
  }

  if(!allProducts.length){
    const allResult = await client
      .from("products")
      .select("*")
      .eq("visible",true)
      .order("created_at",{ascending:false});

    if(!allResult.error){
      allProducts = allResult.data || [];
    }
  }

  renderProduct(currentProduct);
  renderRelated();

  if(typeof loadProductCoas === "function"){
    loadProductCoas(currentProduct.id);
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

function renderProduct(product){
  document.title = `${product.name} | Neon Peppers Research`;
  document.querySelector('meta[name="description"]').setAttribute(
    "content",
    product.description || `${product.name} research material reference page.`
  );

  el("productLoading").hidden = true;
  el("productPage").hidden = false;

  el("breadcrumbName").textContent = product.name;
  el("productCategory").textContent = product.category || "Research Compound";
  el("productName").textContent = product.name;
  el("productStrength").textContent = product.strength || "Not listed";
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
  el("identityStrength").textContent = product.strength || "Not listed";
  el("identityStatus").textContent = statusText(product);

  const image = el("productHeroImage");

  if(product.image_url){
    image.style.backgroundImage = `url("${product.image_url}")`;
    image.textContent = "";
  }

  const status = el("productStatus");
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
      const product = allProducts.find(
        item => slugify(item.name) === card.dataset.slug
      );

      const id = encodeURIComponent(product?.id || "");

      window.location.href =
        `/products/${encodeURIComponent(card.dataset.slug)}?id=${id}`;
    });
  });

  section.hidden = false;
}

function showNotFound(){
  el("productLoading").hidden = true;
  el("productNotFound").hidden = false;
}

document.addEventListener("DOMContentLoaded", () => {
  el("menuBtn")?.addEventListener("click", () => {
    el("navLinks").classList.toggle("open");
  });

  loadData();
});
