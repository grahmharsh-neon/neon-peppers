
const VERIFY_KEY = "neonPeppersVerified";
let products = [];

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
  if(!gate) return;

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

async function loadProducts(){
  const client = getClient();

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
  if(!box) return;

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
  if(!grid) return;

  const query = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const activeCategory = document.querySelector(".filter.active")?.dataset.cat || "All";

  const filtered = products.filter(product => {
    const matchesCategory = activeCategory === "All" || product.category === activeCategory;
    const haystack = `${product.name} ${product.category} ${product.description}`.toLowerCase();
    return matchesCategory && haystack.includes(query);
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

    card.innerHTML = `
      <div class="card-image" ${imageStyle}>${product.image_url ? "" : "⚗"}</div>
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
  document.getElementById("modalName").textContent = product.name;
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

document.addEventListener("DOMContentLoaded", () => {
  initGate();
  loadProducts();

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
