(() => {
  "use strict";

  const esc = value =>
    window.NeonCore ? window.NeonCore.esc(value) : String(value || "");

  function productVariantsFor(productId){
    if(typeof window.variantsForProduct === "function"){
      return window.variantsForProduct(productId);
    }

    return (window.productVariants || []).filter(
      variant => String(variant.product_id) === String(productId)
    );
  }

  window.setDescriptionGenerationStatus = function(index, message, state=""){
    const node = document.getElementById(`descriptionStatus-${index}`);
    if(!node) return;

    node.textContent = message || "";
    node.className = `description-ai-status ${state}`.trim();
  };

  window.toggleDescriptionPreview = function(index){
    const product = window.products?.[index];
    const preview = document.getElementById(`descriptionPreview-${index}`);

    if(!product || !preview) return;

    if(!preview.hidden){
      preview.hidden = true;
      return;
    }

    preview.innerHTML = window.renderMarkdown
      ? window.renderMarkdown(product.description || "")
      : esc(product.description || "");

    preview.hidden = false;
  };

  window.addProduct = function(){
    if(!Array.isArray(window.products)){
      window.products = [];
    }

    window.products.unshift({
      id:null,
      name:"New Product",
      category:"Research Compound",
      description:"",
      strength:"",
      option_label:"Size",
      price:0,
      compare_at_price:null,
      price_note:"",
      image_url:null,
      coa_url:null,
      visible:true,
      featured:false,
      status:"available",
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

    const first = document.querySelector("#products .product-editor");
    first?.scrollIntoView({behavior:"smooth", block:"start"});
  };

  function bindProductInputs(){
    document
      .querySelectorAll("#products [data-product-index][data-product-key]")
      .forEach(node => {
        const handler = event => {
          const index = Number(event.currentTarget.dataset.productIndex);
          const key = event.currentTarget.dataset.productKey;

          if(!window.products?.[index]) return;

          let value = event.currentTarget.value;

          if(["visible","featured"].includes(key)){
            value = value === "true";
          }

          if([
            "price",
            "compare_at_price",
            "stock_count",
            "low_stock_threshold",
            "unit_cost"
          ].includes(key)){
            value = value === "" ? null : Number(value);
          }

          if(key === "tags_text"){
            window.products[index].tags = value
              .split(",")
              .map(item => item.trim())
              .filter(Boolean);
            return;
          }

          window.products[index][key] = value;
        };

        node.addEventListener("input", handler);
        node.addEventListener("change", handler);
      });
  }

  window.renderProducts = function(){
    const box = document.getElementById("products");
    if(!box) return;

    const products = Array.isArray(window.products) ? window.products : [];
    const query = (
      document.getElementById("adminProductSearch")?.value || ""
    ).trim().toLowerCase();

    const filter =
      document.getElementById("adminProductFilter")?.value || "all";

    const entries = products
      .map((product, index) => ({product, index}))
      .filter(({product}) => {
        const searchable = [
          product.name,
          product.category,
          product.description,
          ...(Array.isArray(product.tags) ? product.tags : [])
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesQuery = searchable.includes(query);

        let matchesFilter = true;

        if(filter === "visible"){
          matchesFilter = product.visible !== false;
        }else if(filter === "hidden"){
          matchesFilter = product.visible === false;
        }else if(filter === "featured"){
          matchesFilter = product.featured === true;
        }

        return matchesQuery && matchesFilter;
      });

    if(!entries.length){
      box.innerHTML = '<p class="muted">No matching products.</p>';
      return;
    }

    box.innerHTML = entries.map(({product, index}) => {
      const variants = product.id ? productVariantsFor(product.id) : [];
      const optionLabel = product.option_label || "Size";
      const firstOption = variants[0]?.strength || "";

      return `
        <article class="product-editor" data-product-id="${esc(product.id || "")}">
          <div class="product-editor-head">
            <div>
              <div class="eyebrow">${esc(product.category || "Research Compound")}</div>
              <h3>${esc(product.name || "New Product")}</h3>
              ${firstOption ? `<div class="muted">${esc(optionLabel)}: ${esc(firstOption)}${variants.length > 1 ? ` +${variants.length - 1}` : ""}</div>` : ""}
            </div>

            <div class="actions">
              <button class="btn pink" type="button" onclick="saveProduct(${index})">
                Save Product
              </button>
              <button class="btn danger" type="button" onclick="deleteProduct(${index})">
                Delete
              </button>
            </div>
          </div>

          <div class="grid three">
            <div>
              <label>Product Name</label>
              <input
                data-product-index="${index}"
                data-product-key="name"
                value="${esc(product.name || "")}"
              >
            </div>

            <div>
              <label>Category</label>
              <input
                data-product-index="${index}"
                data-product-key="category"
                value="${esc(product.category || "")}"
              >
            </div>

            <div>
              <label>Product Option Label</label>
              <input
                data-product-index="${index}"
                data-product-key="option_label"
                value="${esc(optionLabel)}"
                placeholder="Size"
              >
            </div>
          </div>

          <div class="grid three">
            <div>
              <label>Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                data-product-index="${index}"
                data-product-key="price"
                value="${Number(product.price || 0)}"
              >
            </div>

            <div>
              <label>Compare-at Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                data-product-index="${index}"
                data-product-key="compare_at_price"
                value="${product.compare_at_price == null ? "" : Number(product.compare_at_price)}"
              >
            </div>

            <div>
              <label>Price Note</label>
              <input
                data-product-index="${index}"
                data-product-key="price_note"
                value="${esc(product.price_note || "")}"
                placeholder="Optional"
              >
            </div>
          </div>

          <section class="variant-admin product-option-admin">
            <div class="variant-admin-head">
              <div>
                <h4>${esc(optionLabel)} Options</h4>
                <p class="muted">Example: 5 mL, 10 mL, 20 mL, 30 mL</p>
              </div>

              <div class="actions">
                <button
                  class="btn green"
                  type="button"
                  onclick="addVariant(${index})"
                  ${product.id ? "" : "disabled"}
                >
                  + Add Option
                </button>

                <button
                  class="btn blue"
                  type="button"
                  onclick="applySizePreset(${index})"
                  ${product.id ? "" : "disabled"}
                >
                  Add 5/10/20/30 mL
                </button>
              </div>
            </div>

            <div id="variants-${index}">
              ${product.id ? "" : '<p class="muted">Save the product before adding options.</p>'}
            </div>
          </section>

          <div class="grid three">
            <div>
              <label>Stock Count</label>
              <input
                type="number"
                min="0"
                step="1"
                data-product-index="${index}"
                data-product-key="stock_count"
                value="${Number(product.stock_count || 0)}"
              >
            </div>

            <div>
              <label>Low Stock Alert</label>
              <input
                type="number"
                min="0"
                step="1"
                data-product-index="${index}"
                data-product-key="low_stock_threshold"
                value="${Number(product.low_stock_threshold || 5)}"
              >
            </div>

            <div>
              <label>Tags</label>
              <input
                data-product-index="${index}"
                data-product-key="tags_text"
                value="${esc((product.tags || []).join(", "))}"
                placeholder="Recovery, GLP, Skin"
              >
            </div>
          </div>

          <div class="grid three">
            <div>
              <label>Visibility</label>
              <select
                data-product-index="${index}"
                data-product-key="visible"
              >
                <option value="true" ${product.visible !== false ? "selected" : ""}>Visible</option>
                <option value="false" ${product.visible === false ? "selected" : ""}>Hidden</option>
              </select>
            </div>

            <div>
              <label>Featured</label>
              <select
                data-product-index="${index}"
                data-product-key="featured"
              >
                <option value="false" ${product.featured !== true ? "selected" : ""}>No</option>
                <option value="true" ${product.featured === true ? "selected" : ""}>Yes</option>
              </select>
            </div>

            <div>
              <label>Status</label>
              <select
                data-product-index="${index}"
                data-product-key="status"
              >
                <option value="available" ${product.status === "available" ? "selected" : ""}>Available</option>
                <option value="low_stock" ${product.status === "low_stock" ? "selected" : ""}>Low Stock</option>
                <option value="out_of_stock" ${product.status === "out_of_stock" ? "selected" : ""}>Out of Stock</option>
                <option value="coming_soon" ${product.status === "coming_soon" ? "selected" : ""}>Coming Soon</option>
              </select>
            </div>
          </div>

          <div class="description-heading">
            <div>
              <label>Description</label>
              <div class="muted">Generate a draft, edit it, then save the product.</div>
            </div>

            <div class="description-ai-actions">
              <button
                class="btn blue"
                id="generateDescription-${index}"
                type="button"
                onclick="generateProductDescription(${index})"
              >
                ✨ Generate Description
              </button>

              <button
                class="btn"
                type="button"
                onclick="toggleDescriptionPreview(${index})"
              >
                Preview
              </button>
            </div>
          </div>

          <textarea
            id="productDescription-${index}"
            data-product-index="${index}"
            data-product-key="description"
            class="product-description-textarea"
          >${esc(product.description || "")}</textarea>

          <div
            id="descriptionStatus-${index}"
            class="description-ai-status"
            aria-live="polite"
          ></div>

          <div
            id="descriptionPreview-${index}"
            class="description-preview markdown-description"
            hidden
          ></div>

          <div class="grid two">
            <div>
              <label>Product Image URL</label>
              <input
                data-product-index="${index}"
                data-product-key="image_url"
                value="${esc(product.image_url || "")}"
              >
              <input id="productImage-${index}" type="file" accept="image/*">
              <button class="btn blue" type="button" onclick="uploadProductImage(${index})">
                Upload Product Image
              </button>
              ${product.image_url ? `<img class="preview product-image" src="${esc(product.image_url)}" alt="">` : ""}
            </div>

            <div>
              <label>SEO Title</label>
              <input
                data-product-index="${index}"
                data-product-key="seo_title"
                value="${esc(product.seo_title || "")}"
              >

              <label>SEO Description</label>
              <textarea
                data-product-index="${index}"
                data-product-key="seo_description"
              >${esc(product.seo_description || "")}</textarea>
            </div>
          </div>

          <details class="product-private-details">
            <summary>Private inventory details</summary>

            <div class="grid three">
              <div>
                <label>Supplier</label>
                <input
                  data-product-index="${index}"
                  data-product-key="supplier"
                  value="${esc(product.supplier || "")}"
                >
              </div>

              <div>
                <label>Unit Cost</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  data-product-index="${index}"
                  data-product-key="unit_cost"
                  value="${product.unit_cost == null ? "" : Number(product.unit_cost)}"
                >
              </div>

              <div>
                <label>Shelf Location</label>
                <input
                  data-product-index="${index}"
                  data-product-key="shelf_location"
                  value="${esc(product.shelf_location || "")}"
                >
              </div>
            </div>
          </details>
        </article>
      `;
    }).join("");

    bindProductInputs();

    entries.forEach(({product, index}) => {
      if(product.id && typeof window.renderVariantsForProduct === "function"){
        window.renderVariantsForProduct(index);
      }
    });
  };

  window.applySizePreset = async function(index){
    const product = window.products?.[index];

    if(!product?.id){
      alert("Save the product before adding options.");
      return;
    }

    const existing = productVariantsFor(product.id)
      .map(item => String(item.strength || "").trim().toLowerCase());

    const preset = ["5 mL","10 mL","20 mL","30 mL"];
    const missing = preset.filter(
      value => !existing.includes(value.toLowerCase())
    );

    if(!missing.length){
      alert("The 5 mL, 10 mL, 20 mL, and 30 mL options already exist.");
      return;
    }

    const start = productVariantsFor(product.id).length;

    const rows = missing.map((value, offset) => ({
      product_id:product.id,
      strength:value,
      stock_status:"available",
      visible:true,
      sort_order:start + offset
    }));

    const {data, error} = await window.client
      .from("product_variants")
      .insert(rows)
      .select("*");

    if(error){
      alert(error.message);
      return;
    }

    window.productVariants.push(...(data || []));
    window.renderProducts();
    window.flash?.("Size options added");
  };
})();