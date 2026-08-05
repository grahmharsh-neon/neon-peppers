(() => {
  "use strict";
  const el=id=>document.getElementById(id);
  const config=window.NEON_CONFIG||{};
  const db=window.supabase.createClient(config.supabaseUrl.trim(),config.supabasePublishableKey.trim());
  const money=v=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(v||0));
  const esc=v=>String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  let coupons=[],referrals=[],customers=[],current=null;

  async function check(){
    const {data}=await db.auth.getSession();
    if(data?.session){el("growthAuthGate").hidden=true;await load()}
  }
  async function login(){
    const {error}=await db.auth.signInWithPassword({email:el("growthEmail").value.trim(),password:el("growthPassword").value});
    if(error){el("growthAuthMessage").textContent=error.message;return}
    await check();
  }
  async function load(){
    const [a,b,c]=await Promise.all([
      db.from("coupon_codes").select("*").order("created_at",{ascending:false}),
      db.from("referrals").select("*").order("created_at",{ascending:false}),
      db.from("customers").select("id,name,email,referral_code")
    ]);
    coupons=a.error?[]:a.data||[];
    referrals=b.error?[]:b.data||[];
    customers=c.error?[]:c.data||[];
    renderCoupons();renderReferrals();stats();
  }
  function stats(){
    el("growthActiveCoupons").textContent=coupons.filter(x=>x.active).length;
    el("growthTotalReferrals").textContent=referrals.length;
    el("growthRewardedReferrals").textContent=referrals.filter(x=>x.status==="rewarded").length;
    el("growthCreditsAwarded").textContent=money(referrals.filter(x=>x.status==="rewarded").reduce((s,x)=>s+Number(x.reward_amount||0),0));
  }
  function customerName(id){return customers.find(x=>String(x.id)===String(id))?.name||"Customer"}
  function renderCoupons(){
    el("couponList").innerHTML=coupons.length?coupons.map(x=>`
      <article class="coupon-card">
        <div class="coupon-head"><div><h3>${esc(x.code)}</h3><span class="muted">${esc(x.description||"")}</span></div><strong>${x.active?"Active":"Inactive"}</strong></div>
        <div class="coupon-meta">
          <div><span>Discount</span><strong>${x.discount_type==="percent"?`${Number(x.discount_value)}%`:money(x.discount_value)}</strong></div>
          <div><span>Minimum</span><strong>${money(x.minimum_subtotal)}</strong></div>
          <div><span>Uses</span><strong>${x.usage_count}${x.usage_limit?` / ${x.usage_limit}`:""}</strong></div>
          <div><span>Ends</span><strong>${x.ends_at?new Date(x.ends_at).toLocaleDateString():"No end"}</strong></div>
        </div>
        <div class="actions"><button class="btn blue" data-edit-coupon="${x.id}">Edit</button><button class="btn danger" data-delete-coupon="${x.id}">Delete</button></div>
      </article>`).join(""):'<p class="muted">No coupons.</p>';
  }
  function renderReferrals(){
    el("referralList").innerHTML=referrals.length?referrals.map(x=>`
      <div class="referral-row"><div><strong>${esc(customerName(x.referrer_customer_id))}</strong><span class="muted">Code ${esc(x.referral_code)}</span></div><div>${esc(x.referred_email)}</div><span>${esc(x.status)}</span><strong>${money(x.reward_amount)}</strong></div>`).join(""):'<p class="muted">No referrals yet.</p>';
  }
  function blank(){return{id:null,code:"",description:"",discount_type:"percent",discount_value:0,minimum_subtotal:0,usage_limit:null,active:true,starts_at:null,ends_at:null}}
  function openCoupon(id){
    current=id?{...coupons.find(x=>String(x.id)===String(id))}:blank();
    el("couponModalTitle").textContent=current.id?"Edit Coupon":"Add Coupon";
    el("couponCode").value=current.code||"";
    el("couponDescription").value=current.description||"";
    el("couponType").value=current.discount_type||"percent";
    el("couponValue").value=Number(current.discount_value||0);
    el("couponMinimum").value=Number(current.minimum_subtotal||0);
    el("couponLimit").value=current.usage_limit??"";
    el("couponStarts").value=current.starts_at?current.starts_at.slice(0,16):"";
    el("couponEnds").value=current.ends_at?current.ends_at.slice(0,16):"";
    el("couponActive").value=current.active===false?"false":"true";
    el("couponModal").classList.add("open");
  }
  async function saveCoupon(){
    const payload={
      code:el("couponCode").value.trim().toUpperCase(),
      description:el("couponDescription").value.trim()||null,
      discount_type:el("couponType").value,
      discount_value:Number(el("couponValue").value||0),
      minimum_subtotal:Number(el("couponMinimum").value||0),
      usage_limit:el("couponLimit").value===""?null:Number(el("couponLimit").value),
      starts_at:el("couponStarts").value?new Date(el("couponStarts").value).toISOString():null,
      ends_at:el("couponEnds").value?new Date(el("couponEnds").value).toISOString():null,
      active:el("couponActive").value==="true",
      updated_at:new Date().toISOString()
    };
    if(!payload.code){alert("Enter a coupon code.");return}
    const result=current.id?await db.from("coupon_codes").update(payload).eq("id",current.id):await db.from("coupon_codes").insert(payload);
    if(result.error){alert(result.error.message);return}
    el("couponModal").classList.remove("open");await load();
  }
  async function removeCoupon(id){
    if(!confirm("Delete this coupon?"))return;
    const {error}=await db.from("coupon_codes").delete().eq("id",id);
    if(error){alert(error.message);return}
    await load();
  }

  el("growthLoginButton").addEventListener("click",login);
  el("growthLogoutButton").addEventListener("click",async()=>{await db.auth.signOut();location.reload()});
  el("addCouponButton").addEventListener("click",()=>openCoupon());
  el("couponCloseButton").addEventListener("click",()=>el("couponModal").classList.remove("open"));
  el("couponSaveButton").addEventListener("click",saveCoupon);
  document.addEventListener("click",event=>{
    const edit=event.target.closest("[data-edit-coupon]");if(edit)openCoupon(edit.dataset.editCoupon);
    const del=event.target.closest("[data-delete-coupon]");if(del)removeCoupon(del.dataset.deleteCoupon);
  });
  check();
})();