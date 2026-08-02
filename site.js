const VERIFY_KEY = "neonPeppersVerified";
let products = [];
let settings = {};

function esc(value){
  return String(value || "").replace(/[&<>"']/g, character => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[character]));
}

function getClient(){
  const config = window.NEON_CONFIG || {};

  if(!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase){
    return null;
  }

  return window.supabase.createClient(
    config.supabaseUrl,
    config.supabasePublishableKey
  );
}

function initGate(){
  const gate = document.getElementById("researchGate");

  if(!gate){
    return;
  }

  if(sessionStorage.getItem(VERIFY_KEY) !== "yes"){
    gate.classList.add("open");
    document.body.classList.add("gated");
  }

  const checkboxes = [...gate.querySelectorAll('input[type="checkbox"]')];
  const enterButton = document.getElementById("enterSite");

  const updateButton = () => {
    enterButton.disabled = !checkboxes.every(box => box.checked);
  };

  checkboxes.forEach(box => box.addEventListener("change", updateButton));

  enterButton.addEventListener("click", () => {
    sessionStorage.setItem(VERIFY_KEY, "yes");
    gate.classList.remove("open");
    document.body.classList.remove("gated");
  });
}

async function loadSettings(client){
  if(!client){
    return;
  }

  const { data, error } = await client
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if(error){
    console.warn(error);
    return;
  }

  settings = data || {};
  applySettings();
}

function applySettings(){
  const heroEyebrow = document.querySelector(".hero .eyebrow");
  const heroTitle = document.querySelector(".hero h1");
  const heroText = document.querySelector(".hero-copy > p");
  const heroBackground = document.querySelector(".hero-bg");
  const primaryButton = document.querySelector(".hero-actions .btn.pink");
  const secondaryButton = document.querySelector(".hero-actions .btn.blue");
  const stripLabel = document.querySelector(".strip-label");
  const stripCopy = document.querySelector(".strip-copy");
  const stripButton = document.querySelector(".research-strip .btn.green");

  if(heroEyebrow && settings.hero_eyebrow){
    heroEyebrow.textContent = settings.hero_eyebrow;
  }

  if(heroTitle && settings.hero_title){
    const words = settings.hero_title.trim().split(/\s+/);
    if(words.length > 1){
      const last = words.pop();
      heroTitle.innerHTML = `${esc(words.join(" "))}<br><span>${esc(last)}</span>`;
    }else{
      heroTitle.textContent = settings.hero_title;
    }
  }

  if(heroText && settings.hero_text){
    heroText.textContent = settings.hero_text;
  }

  if(heroBackground && settings.hero_image_url){
    heroBackground.style.backgroundImage = `url("${settings.hero_image_url}")`;
  }

  if(primaryButton && settings.primary_button_text){
    primaryButton.textContent = settings.primary_button_text;
  }

  if(secondaryButton && settings.secondary_button_text){
    secondaryButton.textContent = settings.secondary_button_text;
  }

  if(stripLabel && settings.research_banner_title){
    stripLabel.textContent = `⚗ ${settings.research_banner_title}`;
  }

  if(stripCopy && settings.research_banner_text){
    stripCopy.textContent = settings.research_banner_text;
  }

  if(stripButton && settings.research_banner_button){
    stripButton.textContent = settings.research_banner_button;
  }

  if(settings.logo_url){
    document.querySelectorAll(".brand img,.gate-logo").forEach(image => {
      image.src = settings.logo_url;
    });
  }

  if(settings.contact_email){
    document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
      link.href = `mailto:${settings.contact_email}`;
      if(link.textContent.includes("@")){
        link.textContent = settings.contact_email;
      }
    });
  }

  const footer = document.querySelector("footer > div:first-child");

  if(footer && settings.footer_disclaimer){
    footer.innerHTML = `<strong>Neon Peppers Research</strong><br>${esc(settings.footer_disclaimer)}`;
  }

  if(settings.announcement_visible && settings.announcement_text){
    const bar = document.createElement("div");
    bar.className = "site-announcement";
    bar.textContent = settings.announcement_text;
    document.body.insertBefore(bar, document.body.firstChild);
  }
}

async function loadProducts(client){
  if(!client){
    products = [];
    renderProducts();
    return;
  }

  const { data, error } = await client
    .from("products")
    .select("*")
    .eq("visible", true)
    .order("featured", { ascending:false })
    .order("created_at", { ascending:false });

  if(error){
    console.error(error);
    products = [];
  }else{
    products = data || [];
  }

  renderFilters();
  renderProducts();
}

function renderFilters(){
  const box = document.getElementById("filters");

  if(!box){
    return;
  }

  const categories = [
    "All",
    ...new Set(products.map(product => product.category || "Research Compound"))
  ];

  box.innerHTML = categories.map((category, index) => `
    <button class="filter ${index === 0 ? "active" : ""}" data-cat="${esc(category)}">
      ${esc(category)}
    </button>
  `).join("");

  box.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
      box.querySelectorAll(".filter").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      renderProducts();
    });
  });
}

function renderProducts(){
  const grid = document.getElementById("productGrid");

  if(!grid){
    return;
  }

  const query = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const activeCategory = document.querySelector(".filter.active")?.dataset.cat || "All";

  const filtered = products.filter(product => {
    const matchesCategory =
      activeCategory === "All" ||
      product.category === activeCategory;

    const searchableText =
      `${product.name} ${product.category} ${product.description}`.toLowerCase();

    return matchesCategory && searchableText.includes(query);
  });

  if(!filtered.length){
    grid.innerHTML = `
      <div style="grid-column:1/-1;padding:35px;border:1px dashed rgba(255,255,255,.18);text-align:center;color:#a7aeb9;border-radius:10px">
        No products found.
      </div>
    `;
    return;
  }

  grid.innerHTML = "";

  filtered.forEach(product => {
    const card = document.createElement("article");
    card.className = "card";
    card.addEventListener("click", () => openProduct(product));

    const imageStyle = product.image_url
      ? `style="background-image:url('${String(product.image_url).replace(/'/g,"%27")}')"`
      : "";

    const statusLabel = product.status === "coming_soon"
      ? '<div class="product-status coming">Coming Soon</div>'
      : product.status === "out_of_stock"
        ? '<div class="product-status out">Out of Stock</div>'
        : "";

    card.innerHTML = `
      <div class="card-image" ${imageStyle}>
        ${product.image_url ? "" : "⚗"}
        ${statusLabel}
      </div>

      <div class="card-body">
        <div class="category">${esc(product.category || "Research Compound")}</div>
        <h3>${esc(product.name)}</h3>
        <p>${esc(product.description || "")}</p>
        <div class="strength">${esc(product.strength || "")}</div>
      </div>
    `;

    grid.appendChild(card);
  });
}

function openProduct(product){
  const modal = document.getElementById("productModal");
  const image = document.getElementById("modalImage");

  image.style.backgroundImage = product.image_url
    ? `url("${product.image_url}")`
    : "";

  image.textContent = product.image_url ? "" : "⚗";

  document.getElementById("modalCategory").textContent =
    product.category || "Research Compound";

  document.getElementById("modalName").textContent =
    product.name;

  document.getElementById("modalDescription").textContent =
    product.description || "";

  document.getElementById("modalStrength").textContent =
    product.strength || "";

  const coa = document.getElementById("modalCoa");

  if(product.coa_url){
    coa.href = product.coa_url;
    coa.style.display = "inline-flex";
  }else{
    coa.style.display = "none";
  }

  modal.classList.add("open");
}

function closeProduct(){
  document.getElementById("productModal").classList.remove("open");
}

document.addEventListener("DOMContentLoaded", async () => {
  initGate();

  const client = getClient();

  await Promise.all([
    loadSettings(client),
    loadProducts(client)
  ]);

  document.getElementById("searchInput")
    ?.addEventListener("input", renderProducts);

  document.getElementById("menuBtn")
    ?.addEventListener("click", () => {
      document.getElementById("navLinks").classList.toggle("open");
    });

  document.getElementById("productModal")
    ?.addEventListener("click", event => {
      if(event.target.id === "productModal"){
        closeProduct();
      }
    });
});
