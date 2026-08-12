(() => {
  "use strict";

  const esc=value=>window.NeonCore?window.NeonCore.esc(value):String(value||"");
  const SIZE_CHOICES=["5mg","10mg","20mg","30mg"];
  window.productLifecycleFilter=window.productLifecycleFilter||"all";
  window.productAttentionFilter=window.productAttentionFilter||"";

  window.setDescriptionGenerationStatus=function(index,message,state=""){
    const node=document.getElementById(`descriptionStatus-${index}`);
    if(!node)return;
    node.textContent=message||"";
    node.className=`description-ai-status ${state}`.trim();
  };

  window.toggleDescriptionPreview=function(index){
    const product=window.products?.[index];
    const preview=document.getElementById(`descriptionPreview-${index}`);
    if(!product||!preview)return;
    if(!preview.hidden){preview.hidden=true;return}
    preview.innerHTML=window.renderMarkdown
      ?window.renderMarkdown(product.description||"")
      :esc(product.description||"");
    preview.hidden=false;
  };

  window.addProduct=function(){
    if(!Array.isArray(window.products))window.products=[];
    window.products.unshift({
      id:null,
      name:"New Product",
      category:"Research Compound",
      description:"",
      strength:"",
      option_label:"Size",
      option_values:[],
      price:0,
      compare_at_price:null,
      price_note:"",
      image_url:null,
      coa_url:null,
      visible:true,
      featured:false,
      status:"available",
      lifecycle_status:"draft",
      stock_count:0,
      low_stock_threshold:5,
      tags:[],
      slug:"",
      supplier:"",
      unit_cost:null,
      shelf_location:"",
      seo_title:"",
      seo_description:""
    });
    window.renderProducts();
    document.querySelector("#products .product-editor")
      ?.scrollIntoView({behavior:"smooth",block:"start"});
  };

  window.toggleProductSize=function(index,size,checked){
    const product=window.products?.[index];
    if(!product)return;
    const current=Array.isArray(product.option_values)?[...product.option_values]:[];
    const normalized=current.filter(Boolean);
    const exists=normalized.includes(size);
    if(checked&&!exists)normalized.push(size);
    if(!checked&&exists){
      const pos=normalized.indexOf(size);
      normalized.splice(pos,1);
    }
    product.option_values=SIZE_CHOICES.filter(item=>normalized.includes(item));
  };

  window.selectAllProductSizes=function(index){
    const product=window.products?.[index];
    if(!product)return;
    const custom=(Array.isArray(product.option_values)?product.option_values:[])
      .filter(value=>!SIZE_CHOICES.includes(value));
    product.option_label="Size";
    product.option_values=[...SIZE_CHOICES,...custom];
    window.renderProducts();
  };

  window.addCustomProductSize=function(index){
    const product=window.products?.[index];
    const input=document.getElementById(`customSize-${index}`);
    if(!product||!input)return;

    const value=input.value.trim();
    if(!value)return;

    const current=Array.isArray(product.option_values)?[...product.option_values]:[];

    if(!current.some(item=>String(item).toLowerCase()===value.toLowerCase())){
      current.push(value);
      product.option_values=current;
    }

    input.value="";
    window.renderProducts();
  };

  window.removeCustomProductSize=function(index,value){
    const product=window.products?.[index];
    if(!product)return;

    product.option_values=(Array.isArray(product.option_values)?product.option_values:[])
      .filter(item=>item!==value);

    window.renderProducts();
  };

  window.clearProductSizes=function(index){
    if(!window.products?.[index])return;
    window.products[index].option_values=[];
    window.renderProducts();
  };

  function lifecycleLabel(value){
    return value==="inventory"?"Inventory":
      value==="published"?"Published":
      value==="archived"?"Archived":"Draft";
  }

  function lifecycleClass(value){
    return ["draft","inventory","published","archived"].includes(value)
      ? value
      : "draft";
  }

  async function hasCoa(productId){
    if(!productId)return false;
    const {count,error}=await window.client
      .from("product_coas")
      .select("id",{count:"exact",head:true})
      .eq("product_id",productId);

    if(error){
      console.warn(error);
      return false;
    }
    return Number(count||0)>0;
  }

  window.setProductLifecycle=async function(index,status){
    const product=window.products?.[index];
    if(!product)return;

    if(status==="published"){
      await window.publishProduct(index);
      return;
    }

    product.lifecycle_status=status;
    product.visible=false;

    if(product.id){
      const {error}=await window.client
        .from("products")
        .update({
          lifecycle_status:status,
          visible:false,
          updated_at:new Date().toISOString()
        })
        .eq("id",product.id);

      if(error){
        alert(error.message);
        return;
      }
    }

    window.flash?.(`Product moved to ${lifecycleLabel(status)}`);
    if(typeof window.loadProducts==="function"){
      await window.loadProducts();
    }else{
      window.renderProducts();
    }
  };

  window.publishProduct=async function(index){
    const product=window.products?.[index];
    if(!product)return;

    if(!product.id){
      alert("Save the product before publishing it.");
      return;
    }

    const coaExists=await hasCoa(product.id);
    const checks=[
      ["Image",Boolean(String(product.image_url||"").trim())],
      ["Description",Boolean(String(product.description||"").trim())],
      ["Price",Number(product.price||0)>0],
      ["Size",Array.isArray(product.option_values)&&product.option_values.length>0],
      ["COA",coaExists],
      ["Category",Boolean(String(product.category||"").trim())]
    ];

    const missing=checks.filter(([,ok])=>!ok).map(([label])=>label);

    if(missing.length){
      alert(
        "This product is not ready to publish.\\n\\nMissing:\\n• "+
        missing.join("\\n• ")
      );
      return;
    }

    const {error}=await window.client
      .from("products")
      .update({
        lifecycle_status:"published",
        visible:true,
        updated_at:new Date().toISOString()
      })
      .eq("id",product.id);

    if(error){
      alert(error.message);
      return;
    }

    window.flash?.("Product published");
    if(typeof window.loadProducts==="function"){
      await window.loadProducts();
    }
  };

  function matchesAttention(product){
    const type=window.productAttentionFilter||"";
    if(!type)return true;
    if(type==="image")return !String(product.image_url||"").trim();
    if(type==="price")return Number(product.price||0)<=0;
    if(type==="description")return !String(product.description||"").trim();
    if(type==="sizes")return !Array.isArray(product.option_values)||!product.option_values.length;
    if(type==="low_stock")return Number(product.stock_count||0)<=Number(product.low_stock_threshold||5);
    if(type==="coa"){
      const ids=new Set((window.dashboardCoas||[]).map(x=>String(x.product_id)));
      return !ids.has(String(product.id));
    }
    return true;
  }

  function updateLifecycleCounts(products){
    const counts={
      all:products.length,
      draft:0,
      inventory:0,
      published:0,
      archived:0
    };

    products.forEach(product=>{
      const key=product.lifecycle_status||"published";
      if(Object.prototype.hasOwnProperty.call(counts,key))counts[key]++;
    });

    const map={
      all:"lifeCountAll",
      draft:"lifeCountDraft",
      inventory:"lifeCountInventory",
      published:"lifeCountPublished",
      archived:"lifeCountArchived"
    };

    Object.entries(map).forEach(([key,id])=>{
      const node=document.getElementById(id);
      if(node)node.textContent=counts[key]||0;
    });
  }

  function bindLifecycleTabs(){
    document.querySelectorAll("[data-lifecycle]").forEach(button=>{
      button.onclick=()=>{
        window.productLifecycleFilter=button.dataset.lifecycle||"all";
        window.productAttentionFilter="";
        document.querySelectorAll("[data-lifecycle]").forEach(item=>
          item.classList.toggle("active",item===button)
        );
        const filter=document.getElementById("adminProductFilter");
        if(filter&&filter.value==="needs_attention")filter.value="all";
        window.renderProducts();
      };
    });
  }

  function bindInputs(){
    document.querySelectorAll("#products [data-product-index][data-product-key]")
      .forEach(node=>{
        const handler=event=>{
          const index=Number(event.currentTarget.dataset.productIndex);
          const key=event.currentTarget.dataset.productKey;
          const product=window.products?.[index];
          if(!product)return;
          let value=event.currentTarget.value;

          if(["visible","featured"].includes(key))value=value==="true";
          if(["price","compare_at_price","stock_count","low_stock_threshold","unit_cost"].includes(key)){
            value=value===""?null:Number(value);
          }
          if(key==="tags_text"){
            product.tags=value.split(",").map(v=>v.trim()).filter(Boolean);
            return;
          }
          product[key]=value;
        };
        node.addEventListener("input",handler);
        node.addEventListener("change",handler);
      });
  }

  window.renderProducts=function(){
    const box=document.getElementById("products");
    if(!box)return;
    const products=Array.isArray(window.products)?window.products:[];
    const query=(document.getElementById("adminProductSearch")?.value||"").trim().toLowerCase();
    const filter=document.getElementById("adminProductFilter")?.value||"all";
    const lifecycle=window.productLifecycleFilter||"all";

    updateLifecycleCounts(products);

    const entries=products.map((product,index)=>({product,index})).filter(({product})=>{
      const searchable=[
        product.name,product.category,product.description,
        ...(Array.isArray(product.tags)?product.tags:[])
      ].filter(Boolean).join(" ").toLowerCase();

      let matchesFilter=true;
      if(filter==="visible")matchesFilter=product.visible!==false;
      if(filter==="hidden")matchesFilter=product.visible===false;
      if(filter==="featured")matchesFilter=product.featured===true;
      if(filter==="needs_attention")matchesFilter=matchesAttention(product);

      const lifecycleMatch=
        lifecycle==="all" ||
        (product.lifecycle_status||"published")===lifecycle;

      return searchable.includes(query)&&matchesFilter&&lifecycleMatch;
    });

    if(!entries.length){
      box.innerHTML='<p class="muted">No matching products.</p>';
      return;
    }

    box.innerHTML=entries.map(({product,index})=>{
      const optionLabel=product.option_label||"Size";
      const selected=Array.isArray(product.option_values)?product.option_values:[];
      return `
      <article class="product-editor">
        <div class="product-editor-head">
          <div>
            <div class="eyebrow">${esc(product.category||"Research Compound")}</div>
            <div class="product-title-row">
              <h3>${esc(product.name||"New Product")}</h3>
              <span class="lifecycle-badge ${lifecycleClass(product.lifecycle_status||"draft")}">
                ${lifecycleLabel(product.lifecycle_status||"draft")}
              </span>
            </div>
            <div class="muted">${selected.length?`${esc(optionLabel)}: ${selected.map(esc).join(", ")}`:"No size selected"}</div>
          </div>
          <div class="actions lifecycle-actions">
            <button class="btn pink" type="button" onclick="saveProduct(${index})">Save Product</button>
            ${product.lifecycle_status!=="published"
              ? `<button class="btn green" type="button" onclick="publishProduct(${index})">Publish Product</button>`
              : `<button class="btn" type="button" onclick="setProductLifecycle(${index},'inventory')">Unpublish</button>`
            }
            <button class="btn blue" type="button" onclick="setProductLifecycle(${index},'inventory')">Inventory</button>
            <button class="btn" type="button" onclick="setProductLifecycle(${index},'draft')">Draft</button>
            <button class="btn danger" type="button" onclick="setProductLifecycle(${index},'archived')">Archive</button>
          </div>
        </div>

        <div class="grid three">
          <div><label>Product Name</label><input data-product-index="${index}" data-product-key="name" value="${esc(product.name||"")}"></div>
          <div><label>Category</label><input data-product-index="${index}" data-product-key="category" value="${esc(product.category||"")}"></div>
          <div>
            <label>Lifecycle</label>
            <select data-product-index="${index}" data-product-key="lifecycle_status">
              <option value="draft" ${(product.lifecycle_status||"draft")==="draft"?"selected":""}>Draft</option>
              <option value="inventory" ${product.lifecycle_status==="inventory"?"selected":""}>Inventory</option>
              <option value="published" ${product.lifecycle_status==="published"?"selected":""}>Published</option>
              <option value="archived" ${product.lifecycle_status==="archived"?"selected":""}>Archived</option>
            </select>
          </div>
        </div>

        <section class="size-selector-admin">
          <div class="size-selector-head">
            <div>
              <label>Available Sizes</label>
              <p class="muted">Select every size available for this product.</p>
            </div>
            <div class="actions">
              <button class="btn blue" type="button" onclick="selectAllProductSizes(${index})">Select All</button>
              <button class="btn" type="button" onclick="clearProductSizes(${index})">Clear</button>
            </div>
          </div>

          <div class="size-choice-grid">
            ${SIZE_CHOICES.map(size=>`
              <label class="size-choice ${selected.includes(size)?"selected":""}">
                <input
                  type="checkbox"
                  ${selected.includes(size)?"checked":""}
                  onchange="toggleProductSize(${index},'${size}',this.checked); this.closest('.size-choice').classList.toggle('selected',this.checked)"
                >
                <span>${esc(size)}</span>
              </label>
            `).join("")}
          </div>

          <div class="custom-size-admin">
            <div>
              <label>Add New Size</label>
              <div class="custom-size-entry">
                <input id="customSize-${index}" placeholder="Example: 15mg">
                <button class="btn green" type="button" onclick="addCustomProductSize(${index})">
                  + Add Size
                </button>
              </div>
            </div>

            ${(selected||[]).filter(value=>!SIZE_CHOICES.includes(value)).length
              ? `<div class="custom-size-list">
                  ${(selected||[]).filter(value=>!SIZE_CHOICES.includes(value)).map(value=>`
                    <button
                      class="custom-size-chip"
                      type="button"
                      onclick="removeCustomProductSize(${index},'${String(value).replace(/'/g,"\'")}')"
                      title="Remove ${esc(value)}"
                    >
                      ${esc(value)} ×
                    </button>
                  `).join("")}
                </div>`
              : ""
            }
          </div>
        </section>

        <div class="grid three">
          <div><label>Price</label><input type="number" min="0" step="0.01" data-product-index="${index}" data-product-key="price" value="${Number(product.price||0)}"></div>
          <div><label>Compare-at Price</label><input type="number" min="0" step="0.01" data-product-index="${index}" data-product-key="compare_at_price" value="${product.compare_at_price==null?"":Number(product.compare_at_price)}"></div>
          <div><label>Price Note</label><input data-product-index="${index}" data-product-key="price_note" value="${esc(product.price_note||"")}"></div>
        </div>

        <div class="grid three">
          <div><label>Stock Count</label><input type="number" min="0" step="1" data-product-index="${index}" data-product-key="stock_count" value="${Number(product.stock_count||0)}"></div>
          <div><label>Low Stock Alert</label><input type="number" min="0" step="1" data-product-index="${index}" data-product-key="low_stock_threshold" value="${Number(product.low_stock_threshold||5)}"></div>
          <div><label>Tags</label><input data-product-index="${index}" data-product-key="tags_text" value="${esc((product.tags||[]).join(", "))}"></div>
        </div>

        <div class="grid three">
          <div><label>Visibility</label><select data-product-index="${index}" data-product-key="visible"><option value="true" ${product.visible!==false?"selected":""}>Visible</option><option value="false" ${product.visible===false?"selected":""}>Hidden</option></select></div>
          <div><label>Featured</label><select data-product-index="${index}" data-product-key="featured"><option value="false" ${product.featured!==true?"selected":""}>No</option><option value="true" ${product.featured===true?"selected":""}>Yes</option></select></div>
          <div><label>Status</label><select data-product-index="${index}" data-product-key="status"><option value="available" ${product.status==="available"?"selected":""}>Available</option><option value="low_stock" ${product.status==="low_stock"?"selected":""}>Low Stock</option><option value="out_of_stock" ${product.status==="out_of_stock"?"selected":""}>Out of Stock</option><option value="coming_soon" ${product.status==="coming_soon"?"selected":""}>Coming Soon</option></select></div>
        </div>

        <div class="description-heading">
          <div><label>Description</label><div class="muted">Generate, edit, then save.</div></div>
          <div class="description-ai-actions">
            <button class="btn blue" id="generateDescription-${index}" type="button" onclick="generateProductDescription(${index})">✨ Generate Description</button>
            <button class="btn" type="button" onclick="toggleDescriptionPreview(${index})">Preview</button>
          </div>
        </div>

        <textarea id="productDescription-${index}" data-product-index="${index}" data-product-key="description" class="product-description-textarea">${esc(product.description||"")}</textarea>
        <div id="descriptionStatus-${index}" class="description-ai-status" aria-live="polite"></div>
        <div id="descriptionPreview-${index}" class="description-preview markdown-description" hidden></div>

        <div class="grid two">
          <div>
            <label>Product Image URL</label>
            <input data-product-index="${index}" data-product-key="image_url" value="${esc(product.image_url||"")}">
            <input id="productImage-${index}" type="file" accept="image/*">
            <button class="btn blue" type="button" onclick="uploadProductImage(${index})">Upload Product Image</button>
            ${product.image_url?`<img class="preview product-image" src="${esc(product.image_url)}" alt="">`:""}
          </div>
          <div>
            <label>SEO Title</label><input data-product-index="${index}" data-product-key="seo_title" value="${esc(product.seo_title||"")}">
            <label>SEO Description</label><textarea data-product-index="${index}" data-product-key="seo_description">${esc(product.seo_description||"")}</textarea>
          </div>
        </div>
      </article>`;
    }).join("");

    bindInputs();
    bindLifecycleTabs();
  };
})();