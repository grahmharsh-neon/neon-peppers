
let client = null;
let products = [];

function el(id){return document.getElementById(id)}

function createClient(){
  const config = window.NEON_CONFIG || {};
  if(!config.supabaseUrl) throw new Error("Supabase URL is missing from config.js.");
  if(!config.supabasePublishableKey) throw new Error("Supabase publishable key is missing from config.js.");
  if(!window.supabase) throw new Error("Supabase library did not load.");
  return window.supabase.createClient(config.supabaseUrl.trim(), config.supabasePublishableKey.trim());
}

async function init(){
  try{
    client = createClient();
    const {data:{session}} = await client.auth.getSession();
    if(session) await showAdmin();
  }catch(error){
    const warning=el("setupWarning");
    if(warning){warning.textContent=error.message;warning.style.display="block"}
  }
}

async function login(){
  try{
    if(!client) client=createClient();
    const {error}=await client.auth.signInWithPassword({email:el("email").value.trim(),password:el("password").value});
    if(error) throw error;
    await showAdmin();
  }catch(error){alert(error.message)}
}

async function logout(){if(client) await client.auth.signOut();location.reload()}

async function showAdmin(){
  el("loginView").style.display="none";
  el("adminView").style.display="grid";
  await loadProducts();
}

async function loadProducts(){
  const {data,error}=await client.from("products").select("*").order("created_at",{ascending:false});
  if(error){alert(error.message);return}
  products=data||[];
  renderProducts();
}

function esc(v){return String(v||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}

function renderProducts(){
  const box=el("products");
  box.innerHTML="";
  if(!products.length){box.innerHTML='<p class="note">No products yet. Click + Add Product.</p>';return}
  products.forEach((p,i)=>{
    const row=document.createElement("div");
    row.className="product";
    row.innerHTML=`
      <div class="grid">
        <div><label>Name</label><input data-i="${i}" data-k="name" value="${esc(p.name)}"></div>
        <div><label>Category</label><input data-i="${i}" data-k="category" value="${esc(p.category||"")}"></div>
        <div><label>Strength</label><input data-i="${i}" data-k="strength" value="${esc(p.strength||"")}"></div>
        <div><label>Product image</label><input type="file" accept="image/*" onchange="uploadProductImage(event,${i})"></div>
      </div>
      ${p.image_url?`<img src="${esc(p.image_url)}" style="max-width:180px;max-height:180px;margin-top:12px;border-radius:10px">`:""}
      <label>Description</label><textarea data-i="${i}" data-k="description">${esc(p.description||"")}</textarea>
      <div class="grid">
        <div><label>COA URL</label><input data-i="${i}" data-k="coa_url" value="${esc(p.coa_url||"")}"></div>
        <div><label>Visible</label><select data-i="${i}" data-k="visible"><option value="true" ${p.visible!==false?"selected":""}>Yes</option><option value="false" ${p.visible===false?"selected":""}>No</option></select></div>
      </div>
      <div class="actions"><button class="btn pink" onclick="saveProduct(${i})">Save Product</button><button class="btn danger" onclick="deleteProduct(${i})">Delete</button></div>`;
    box.appendChild(row);
  });
  box.querySelectorAll("[data-i]").forEach(node=>{
    const update=e=>{let value=e.target.value;if(e.target.dataset.k==="visible")value=value==="true";products[Number(e.target.dataset.i)][e.target.dataset.k]=value};
    node.addEventListener("input",update);node.addEventListener("change",update);
  });
}

function addProduct(){
  products.unshift({id:null,name:"New Product",category:"Research Compound",description:"",strength:"",image_url:"",coa_url:"",visible:true,featured:false});
  renderProducts();
}

async function saveProduct(i){
  const p=products[i];
  if(!p.name.trim()){alert("Product name is required.");return}
  const payload={name:p.name.trim(),category:p.category||"Research Compound",description:p.description||"",strength:p.strength||"",image_url:p.image_url||null,coa_url:p.coa_url||null,visible:p.visible!==false,featured:p.featured===true,updated_at:new Date().toISOString()};
  const response=p.id
    ? await client.from("products").update(payload).eq("id",p.id).select().single()
    : await client.from("products").insert(payload).select().single();
  if(response.error){alert(response.error.message);return}
  products[i]=response.data;
  flash("Product saved");
  await loadProducts();
}

async function deleteProduct(i){
  if(!confirm("Delete this product?"))return;
  const p=products[i];
  if(p.id){
    const {error}=await client.from("products").delete().eq("id",p.id);
    if(error){alert(error.message);return}
  }
  products.splice(i,1);
  renderProducts();
  flash("Product deleted");
}

async function optimizeProductImage(file) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Unable to load image."));

      image.src = imageUrl;
    });

    const MAX_SIZE = 1000;

    let width = img.naturalWidth;
    let height = img.naturalHeight;

    // Resize while keeping aspect ratio
    if (width > height) {
      if (width > MAX_SIZE) {
        height = Math.round(height * (MAX_SIZE / width));
        width = MAX_SIZE;
      }
    } else {
      if (height > MAX_SIZE) {
        width = Math.round(width * (MAX_SIZE / height));
        height = MAX_SIZE;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, "image/webp", 0.85)
    );

    return new File(
      [blob],
      file.name.replace(/\.[^.]+$/, ".webp"),
      {
        type: "image/webp"
      }
    );

  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
async function uploadProductImage(event, index) {
  try {
const originalFile = event.target.files?.[0];

if (!originalFile) {
    return;
}

const optimizedFile = await optimizeProductImage(originalFile);
    const product = products[index];

    if (!product) {
      throw new Error("Product could not be found.");
    }

    flash("Resizing image...");

    const optimizedFile = await optimizeProductImage(originalFile);

    const filePath =
      `products/${crypto.randomUUID()}.webp`;

    const { error: uploadError } = await client.storage
      .from(window.NEON_CONFIG.storageBucket)
      .upload(filePath, optimizedFile, {
        cacheControl: "3600",
        contentType: "image/webp",
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } = client.storage
      .from(window.NEON_CONFIG.storageBucket)
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData?.publicUrl;

    if (!imageUrl) {
      throw new Error(
        "The image uploaded, but no public URL was created."
      );
    }

    product.image_url = imageUrl;

    if (product.id) {
      const { error: updateError } = await client
        .from("products")
        .update({
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", product.id);

      if (updateError) {
        throw updateError;
      }
    }

    renderProducts();

    flash(
      product.id
        ? "Image resized, uploaded, and saved."
        : "Image resized and uploaded. Click Save Product."
    );
  } catch (error) {
    console.error(error);
    alert(error.message || "Image upload failed.");
  }
}
function flash(message){
  const box=el("status");
  if(!box){console.log(message);return}
  box.textContent=message;box.style.display="block";
  setTimeout(()=>box.style.display="none",1800);
}

document.addEventListener("DOMContentLoaded",init);
