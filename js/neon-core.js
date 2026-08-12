(() => {
  "use strict";

  window.NeonCore = {
    esc(value){
      return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#039;"
      }[char]));
    },

    money(value){
      return new Intl.NumberFormat("en-US", {
        style:"currency",
        currency:"USD"
      }).format(Number(value || 0));
    },

    slug(value){
      return String(value || "")
        .normalize("NFKD")
        .toLowerCase()
        .trim()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }
  };

  // Backward-compatible global used throughout the older Admin code.
  if(typeof window.escapeHtml !== "function"){
    window.escapeHtml = window.NeonCore.esc;
  }
})();