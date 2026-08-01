let client = null;
let products = [];

function getConfig() {
  return window.NEON_CONFIG || {};
}

function createClient() {
  const config = getConfig();

  if (!config.supabaseUrl || !config.supabasePublishableKey) {
    throw new Error("Supabase URL or publishable key is missing from config.js.");
  }

  if (!window.supabase) {
    throw new Error("The Supabase library did not load.");
  }

  return window.supabase.createClient(
    config.supabaseUrl,
    config.supabasePublishableKey
  );
}

async function init() {
  try {
    client = createClient();

    const {
      data: { session },
    } = await client.auth.getSession();

    if (session) {
      await showAdmin();
    }
  } catch (error) {
    console.error(error);

    const warning = document.getElementById("setupWarning");
    if (warning) {
      warning.textContent = error.message;
      warning.style.display = "block";
    }
  }
}

async function login() {
  try {
    if (!client) {
      client = createClient();
    }

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    const { error } = await client.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value,
    });

    if (error) {
      alert(error.message);
      return;
    }

    await showAdmin();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

async function logout() {
  if (client) {
    await client.auth.signOut();
  }

  location.reload();
}async function login(){const {error}=await client.auth.signInWithPassword({email:email.value.trim(),password:password.value});if(error)return alert(error.message);showAdmin()}
async function logout(){await client.auth.signOut();location.reload()}
async function showAdmin(){loginView.style.display="none";adminView.style.display="grid";await loadProducts()}
async function loadProducts(){const {data,error}=await client.from("products").select("*").order("created_at",{ascending:false});if(error)return alert(error.message);products=data||[];renderProducts()}
function esc(v){return String(v||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}
function renderProducts(){const box=document.getElementById("products");box.innerHTML="";products.forEach((p,i)=>{const el=document.createElement("div");el.className="product";el.innerHTML=`<div class="grid"><div><label>Name</label><input data-i="${i}" data-k="name" value="${esc(p.name)}"></div><div><label>Category</label><input data-i="${i}" data-k="category" value="${esc(p.category||"")}"></div><div><label>Strength</label><input data-i="${i}" data-k="strength" value="${esc(p.strength||"")}"></div><div><label>Product image</label><input type="file" accept="image/*" onchange="uploadProductImage(event,${i})"></div></div><label>Description</label><textarea data-i="${i}" data-k="description">${esc(p.description||"")}</textarea><div class="grid"><div><label>COA URL</label><input data-i="${i}" data-k="coa_url" value="${esc(p.coa_url||"")}"></div><div><label>Visible</label><select data-i="${i}" data-k="visible"><option value="true" ${p.visible!==false?"selected":""}>Yes</option><option value="false" ${p.visible===false?"selected":""}>No</option></select></div></div><div class="actions"><button class="btn pink" onclick="saveProduct(${i})">Save Product</button><button class="btn danger" onclick="deleteProduct(${i})">Delete</button></div>`;box.appendChild(el)});box.querySelectorAll("[data-i]").forEach(e=>e.oninput=ev=>{let v=ev.target.value;if(ev.target.dataset.k==="visible")v=v==="true";products[+ev.target.dataset.i][ev.target.dataset.k]=v})}
function addProduct(){products.unshift({name:"New Product",category:"Research Compound",description:"",strength:"",image_url:"",coa_url:"",visible:true});renderProducts()}
async function saveProduct(i){const p=products[i],payload={name:p.name,category:p.category,description:p.description,strength:p.strength,image_url:p.image_url||null,coa_url:p.coa_url||null,visible:p.visible!==false,updated_at:new Date().toISOString()};const q=p.id?client.from("products").update(payload).eq("id",p.id):client.from("products").insert(payload).select().single();const {data,error}=await q;if(error)return alert(error.message);if(data)products[i]=data;flash("Product saved");await loadProducts()}
async function deleteProduct(i){if(!confirm("Delete this product?"))return;const p=products[i];if(p.id){const {error}=await client.from("products").delete().eq("id",p.id);if(error)return alert(error.message)}products.splice(i,1);renderProducts();flash("Product deleted")}
async function uploadProductImage(e,i){try{const file=e.target.files[0],ext=file.name.split(".").pop(),name=`products/${crypto.randomUUID()}.${ext}`;const {error}=await client.storage.from(window.NEON_CONFIG.storageBucket).upload(name,file);if(error)throw error;products[i].image_url=client.storage.from(window.NEON_CONFIG.storageBucket).getPublicUrl(name).data.publicUrl;flash("Image uploaded. Save the product.")}catch(x){alert(x.message)}}
function flash(message) {
  const statusBox = document.getElementById("status");

  if (!statusBox) {
    console.log(message);
    return;
  }

  statusBox.textContent = message;
  statusBox.style.display = "block";

  setTimeout(() => {
    statusBox.style.display = "none";
  }, 1800);
}