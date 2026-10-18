import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,signInWithEmailAndPassword,GoogleAuthProvider,signInWithPopup,signInWithRedirect,getRedirectResult,onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getDatabase,ref,query,orderByChild,equalTo,get,set,remove,update} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {getStorage,ref as sref,uploadBytes,getDownloadURL} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
// ضع هنا إعدادات تطبيق الويب من Firebase Console > Project settings > Your apps > Web app
const firebaseConfig = {
  apiKey: "AIzaSyCIyLuEoutmgkXKH0BbganWRYHvtzC7dUw",
  authDomain: "tawasolapp-950ba.firebaseapp.com",
  databaseURL: "https://tawasolapp-950ba-default-rtdb.firebaseio.com",
  projectId: "tawasolapp-950ba",
  storageBucket: "tawasolapp-950ba.firebasestorage.app",
  messagingSenderId: "948966318939",
  appId: "1:948966318939:web:99305cdb1389cb0cc3b07e",
  measurementId: "G-E6WXR6794T"
};

const ADMIN_UID="PASTE_ADMIN_UID"; // UID حساب المديرة من Authentication (غير سري، والحماية الفعلية في القواعد)

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getDatabase(app),st=getStorage(app);
const $=s=>document.querySelector(s);
const h=(t,p={},...k)=>{const e=document.createElement(t);for(const[a,v]of Object.entries(p))a.startsWith("on")?e.addEventListener(a.slice(2),v):a in e?e[a]=v:e.setAttribute(a,v);e.append(...k.flat().filter(x=>x!=null));return e};
const money=n=>new Intl.NumberFormat("ar",{maximumFractionDigits:2}).format(n)+" ر.س";
const state={products:[],cat:"all",cart:JSON.parse(localStorage.getItem("cart")||"[]"),loc:null,user:null,sending:false,reqId:null};
let CATS=[["all","الكل"],["women","الملابس النسائية"],["other","منتجات أخرى"]];
const disc=p=>p.oldPrice>p.price?Math.round(100-p.price/p.oldPrice*100):0;
const img=p=>(p.images&&p.images[0])||"";

function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("on"),2600)}
const saveCart=()=>{localStorage.setItem("cart",JSON.stringify(state.cart));$("#cnt").textContent=state.cart.reduce((a,i)=>a+i.qty,0)};

// ---- Auth
async function login(){const pr=new GoogleAuthProvider();
  try{await signInWithPopup(auth,pr)}catch(e){
    if(["auth/popup-blocked","auth/operation-not-supported-in-this-environment"].includes(e.code))return signInWithRedirect(auth,pr);
    if(e.code!=="auth/popup-closed-by-user"){const M={"auth/unauthorized-domain":"الدومين غير مضاف في Authorized domains","auth/operation-not-allowed":"فعّلي Google في Authentication > Sign-in method","auth/configuration-not-found":"فعّلي Authentication من Firebase Console","auth/network-request-failed":"مشكلة بالاتصال"};console.error(e);toast((M[e.code]||"تعذّر تسجيل الدخول")+" ("+(e.code||"")+")")}}}
getRedirectResult(auth).catch(()=>toast("تعذّر إكمال تسجيل الدخول"));
onAuthStateChanged(auth,u=>{state.user=u;$("#acct").title=u?u.displayName||"حسابي":"تسجيل الدخول"});
$("#acct").onclick=()=>state.user?(confirm("تسجيل الخروج؟")&&signOut(auth).then(()=>toast("تم تسجيل الخروج"))):login();

// ---- Products
async function load(){
  $("#grid").replaceChildren(...Array(6).fill(0).map(()=>h("div",{className:"sk"})));
  try{const s=await get(query(ref(db,"products"),orderByChild("published"),equalTo(true)));
    state.products=Object.entries(s.val()||{}).map(([id,p])=>({id,...p}));
    const cv=(await get(ref(db,"categories")).catch(()=>null))?.val();if(cv)Object.entries(cv).forEach(([k,v])=>{if(!CATS.some(x=>x[0]===k))CATS.push([k,v.name])});
    const b=await get(ref(db,"banners")).catch(()=>null);renderBanners(b&&b.val());
  }catch(e){$("#grid").replaceChildren(h("p",{className:"empty"},"تعذّر تحميل المنتجات. تحققي من الاتصال وأعيدي المحاولة."));return}
  render()}
function renderBanners(b){const box=$("#banners");box.replaceChildren();const now=Date.now(),L=Object.values(b||{}).filter(x=>x.active&&(!x.endsAt||x.endsAt>now));
  const hero=L.find(x=>x.place==="hero");if(hero){$("#heroimg").style.backgroundImage=`url("${hero.image}")`;$("#heroT").textContent=hero.title;$("#heroP").textContent=hero.text||""}
  L.filter(x=>x.place!=="hero").forEach(x=>box.append(h("div",{className:"wrap"},h("div",{className:"bn",style:`background-image:url("${x.image}")`},h("div",{},h("h2",{},x.title),h("p",{},x.text||""),/^https:/.test(x.link||"")?h("a",{className:"btn",href:x.link,rel:"noopener"},x.btn||"اكتشفي"):null)))))}
function renderHome(){const home=$("#home"),on=state.cat==="all"&&!$("#q").value.trim()&&!$("#onlySale").checked;home.replaceChildren();
  $("#catcards").replaceChildren(...CATS.filter(c=>c[0]!=="all"&&state.products.some(p=>p.cat===c[0])).map(([k,l])=>h("button",{className:"cc",onclick:()=>{state.cat=k;render();$("#shop").scrollIntoView({behavior:"smooth"})}},h("span",{},l),h("small",{},state.products.filter(p=>p.cat===k).length+" منتج"))));
  if(!on)return;const sec=(t,id,l)=>l.length&&home.append(h("section",{className:"wrap",id},h("h2",{className:"st"},t),h("div",{className:"grid"},...l.slice(0,4).map(card))));
  sec("منتجات مميزة","feat",state.products.filter(p=>p.featured));sec("الملابس النسائية","w",state.products.filter(p=>p.cat==="women"));
  sec("منتجات أخرى","o",state.products.filter(p=>p.cat==="other"));sec("العروض والخصومات","offers",state.products.filter(disc));
  sec("وصل حديثًا","new",[...state.products].sort((x,y)=>(y.createdAt||0)-(x.createdAt||0)))}
function ldjson(p){document.getElementById("ld")?.remove();document.head.append(h("script",{id:"ld",type:"application/ld+json",textContent:JSON.stringify({"@context":"https://schema.org","@type":"Product",name:p.name,image:p.images||[],description:p.desc||"",offers:{"@type":"Offer",priceCurrency:"SAR",price:p.price,availability:p.stock>0?"https://schema.org/InStock":"https://schema.org/OutOfStock"}})}))}
async function myOrders(){if(!state.user){toast("سجّلي الدخول أولًا");return login()}
  const d=$("#mo"),box=h("div",{},"جارٍ التحميل…");d.replaceChildren(h("form",{method:"dialog",className:"dh"},h("h2",{},"طلباتي"),h("button",{className:"x","aria-label":"إغلاق"},"✕")),box);d.showModal();
  try{const v=(await get(query(ref(db,"orders"),orderByChild("uid"),equalTo(state.user.uid)))).val()||{},L=Object.entries(v).sort((x,y)=>y[1].createdAt-x[1].createdAt);
    box.replaceChildren(...(L.length?L.map(([id,o])=>h("div",{className:"row"},h("div",{},"#"+id.slice(-6).toUpperCase()+" · "+(ST[o.status]||o.status),h("br"),h("small",{},o.lines.map(l=>l.name+"×"+l.qty).join("، ")+" — "+money(o.lines.reduce((s,l)=>s+l.price*l.qty,0))+" · "+new Date(o.createdAt).toLocaleDateString("ar"))))):[h("p",{className:"hint"},"لا توجد طلبات بعد.")]))}
  catch{box.textContent="تعذّر تحميل الطلبات."}}
$("#myo").onclick=e=>{e.preventDefault();myOrders()};
function render(){renderHome();
  $("#chips").replaceChildren(...CATS.map(([k,l])=>h("button",{className:"chip"+(state.cat===k?" on":""),onclick:()=>{state.cat=k;render()}},l)));
  const q=$("#q").value.trim().toLowerCase(),sale=$("#onlySale").checked||state.cat==="sale";
  let l=state.products.filter(p=>(["all","sale"].includes(state.cat)||p.cat===state.cat)&&(!q||(p.name+" "+(p.desc||"")).toLowerCase().includes(q))&&(!sale||disc(p)));
  const s=$("#sort").value;l.sort((a,b)=>s==="pl"?a.price-b.price:s==="ph"?b.price-a.price:s==="disc"?disc(b)-disc(a):(b.createdAt||0)-(a.createdAt||0));
  $("#grid").replaceChildren(...(l.length?l.map(card):[h("p",{className:"empty"},"لا توجد منتجات مطابقة حاليًا.")]))}
const card=p=>h("article",{className:"pc",tabIndex:0,onclick:()=>detail(p),onkeydown:e=>e.key==="Enter"&&detail(p)},
  h("div",{className:"im"},img(p)?h("img",{src:img(p),alt:p.name,loading:"lazy",width:300,height:400}):null,p.stock<=0?h("span",{className:"tag"},"نفد"):p.tag?h("span",{className:"tag"},p.tag):null),
  h("div",{className:"bd"},h("div",{},p.name),h("div",{className:"pr"},money(p.price),disc(p)?h("span",{className:"old"},money(p.oldPrice)):null,disc(p)?` −${disc(p)}%`:""),h("button",{className:"btn",disabled:p.stock<=0},"اطلب الآن")));
["#q","#sort","#onlySale"].forEach(s=>$(s).addEventListener("input",render));
document.querySelectorAll("nav a").forEach(a=>a.onclick=()=>{state.cat=a.dataset.cat;render()});

function detail(p){ldjson(p);const d=$("#pd");const big=h("img",{className:"big",src:img(p),alt:p.name});
  const sz=p.sizes?.length?h("select",{},...p.sizes.map(x=>h("option",{},x))):null,cl=p.colors?.length?h("select",{},...p.colors.map(x=>h("option",{},x))):null;
  const qty=h("input",{type:"number",min:1,max:Math.min(p.stock,20),value:1});
  d.replaceChildren(h("form",{method:"dialog",className:"dh"},h("h2",{},p.name),h("button",{className:"x","aria-label":"إغلاق"},"✕")),big,
    h("div",{className:"gal"},...(p.images||[]).map(u=>h("img",{src:u,alt:"",loading:"lazy",onclick:()=>big.src=u}))),
    h("p",{},p.desc||""),h("p",{className:"pr"},money(p.price),disc(p)?h("span",{className:"old"},money(p.oldPrice)):null),
    sz&&h("label",{},"المقاس",sz),cl&&h("label",{},"اللون",cl),h("label",{},"الكمية",qty),
    h("button",{className:"btn",disabled:p.stock<=0,onclick:()=>{addCart(p,+qty.value,sz?.value,cl?.value);d.close();openCart()}},"اطلب الآن"));
  d.showModal()}
function addCart(p,qty,size,color){qty=Math.max(1,Math.min(20,qty|0));const k=state.cart.find(i=>i.id===p.id&&i.size===size&&i.color===color);k?k.qty+=qty:state.cart.push({id:p.id,qty,size,color});saveCart();toast("أُضيف إلى السلة")}

// ---- Cart (display only; prices re-validated server-side)
function cartLines(){return state.cart.map(i=>({...i,p:state.products.find(p=>p.id===i.id)})).filter(i=>i.p)}
const total=()=>cartLines().reduce((a,i)=>a+i.p.price*i.qty,0);
function openCart(){const L=cartLines(),b=$("#cartBody");
  b.replaceChildren(...(L.length?L.map(i=>h("div",{className:"row"},h("img",{src:img(i.p),alt:""}),h("div",{},i.p.name,h("br"),h("small",{},[i.size,i.color].filter(Boolean).join(" · ")),h("br"),`${i.qty} × ${money(i.p.price)}`),
    h("button",{className:"x","aria-label":"حذف",onclick:()=>{state.cart=state.cart.filter(c=>c!==state.cart.find(z=>z.id===i.id&&z.size===i.size&&z.color===i.color));saveCart();openCart()}},"🗑"))):[h("p",{className:"empty"},"سلتك فارغة")]),
    L.length?h("p",{className:"pr"},"الإجمالي المبدئي: "+money(total())):null,L.length?h("button",{className:"btn",onclick:startCheckout},"متابعة الطلب"):null);
  $("#cart").showModal()}
$("#cartBtn").onclick=openCart;

// ---- Checkout
async function startCheckout(){if(!state.user){toast("سجّلي الدخول بحساب Google لإكمال الطلب");return login()}
  state.reqId=crypto.randomUUID().replaceAll("-","").slice(0,24);$("#cart").close();
  $("#coSum").replaceChildren(...cartLines().map(i=>h("div",{},`${i.p.name} (${i.qty})`)),h("b",{},"الإجمالي: "+money(total())));$("#coErr").textContent="";$("#co").showModal()}
$("#gps").onclick=()=>{$("#gpsS").textContent="جارٍ تحديد الموقع…";
  navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>{state.loc={lat:p.coords.latitude,lng:p.coords.longitude};$("#gpsS").textContent="✓ تم تحديد الموقع"},
    e=>{state.loc=null;$("#gpsS").textContent=e.code===1?"تم رفض الإذن. فعّلي إذن الموقع من إعدادات المتصفح ثم أعيدي المحاولة.":"تعذّر تحديد الموقع، حاولي مجددًا."},{enableHighAccuracy:true,timeout:15000,maximumAge:0}):$("#gpsS").textContent="متصفحك لا يدعم تحديد الموقع."};
$("#send").onclick=async()=>{if(state.sending)return;const err=$("#coErr"),phone=$("#ph").value.trim(),address=$("#ad").value.trim();
  if(!/^\+?\d{9,15}$/.test(phone.replace(/[\s-]/g,"")))return err.textContent="أدخلي رقم هاتف صحيحًا.";
  if(address.length<8)return err.textContent="أدخلي عنوان توصيل واضحًا.";
  if(!state.loc)return err.textContent="حدّدي موقع التوصيل أولًا.";
  state.sending=true;$("#send").disabled=true;err.textContent="";
  try{const L=cartLines();if(!L.length)throw 0;const id=state.user.uid.slice(0,6)+"_"+state.reqId;
    await set(ref(db,"orders/"+id),{uid:state.user.uid,name:state.user.displayName||"",email:state.user.email||"",phone,address,note:$("#nt").value.trim().slice(0,300),loc:state.loc,
      lines:L.map(i=>({id:i.id,name:i.p.name,price:i.p.price,qty:i.qty,size:i.size||null,color:i.color||null})),status:"new",createdAt:Date.now()});
    state.cart=[];saveCart();$("#co").close();toast("تم إرسال طلبك ✓ رقم الطلب: "+id.slice(-6).toUpperCase());load()}
  catch(e){err.textContent="تعذّر إرسال الطلب (تأكدي من الاتصال وأن المنتجات ما زالت متاحة)."}
  finally{state.sending=false;$("#send").disabled=false}};
$("#privacyL").onclick=e=>{e.preventDefault();$("#pv").showModal()};
saveCart();load();

// ================= الإدارة =================
const ST={new:"جديد",confirming:"قيد التأكيد",preparing:"قيد التجهيز",out:"خرج للتوصيل",done:"مكتمل",cancelled:"ملغي"};
let editing=null,products={};
$("#lb").onclick=async()=>{$("#le").textContent="";try{await signInWithEmailAndPassword(auth,$("#em").value.trim(),$("#pw").value)}catch{$("#le").textContent="بيانات الدخول غير صحيحة."}};
$("#out").onclick=()=>signOut(auth);
onAuthStateChanged(auth,async u=>{
  const ok=u&&(await u.getIdTokenResult(true)).claims.admin===true;
  if(u&&!ok){$("#le").textContent="هذا الحساب غير مخوّل للإدارة.";await signOut(auth)}
  $("#login").hidden=!!ok;$("#app").hidden=!ok;if(ok)refresh()});
async function refresh(){refresh2();
  products=(await get(ref(db,"products"))).val()||{};const orders=(await get(ref(db,"orders"))).val()||{};
  const P=Object.entries(products),O=Object.entries(orders).sort((a,b)=>b[1].createdAt-a[1].createdAt);
  const stat=(l,n)=>h("div",{},h("b",{},String(n)),l);
  $("#stats").replaceChildren(stat("منشورة",P.filter(([,p])=>p.published).length),stat("مخفية",P.filter(([,p])=>!p.published).length),stat("طلبات جديدة",O.filter(([,o])=>o.status==="new").length),stat("قيد المعالجة",O.filter(([,o])=>["confirming","preparing","out"].includes(o.status)).length),stat("مخزون منخفض",P.filter(([,p])=>p.stock<=3).length));
  $("#plist").replaceChildren(...(P.length?P.map(([id,p])=>h("div",{className:"row"},h("img",{src:p.images?.[0]||"",alt:""}),h("div",{},p.name,h("br"),h("small",{},`${p.price} · مخزون ${p.stock} · ${p.published?"منشور":"مخفي"}`)),
    h("button",{className:"btn ghost",onclick:()=>fill(id)},"تعديل"),h("button",{className:"btn ghost",onclick:async()=>{await update(ref(db,"products/"+id),{published:!p.published,updatedAt:Date.now()});refresh()}},p.published?"إخفاء":"نشر"),
    h("button",{className:"btn ghost",onclick:async()=>{if(confirm("حذف المنتج نهائيًا؟")){await remove(ref(db,"products/"+id));toast("تم الحذف");refresh()}}},"حذف"))):[h("p",{className:"hint"},"لا توجد منتجات بعد.")]));
  $("#olist").replaceChildren(...(O.length?O.map(([id,o])=>h("div",{className:"row"},h("div",{},`#${id.slice(-6).toUpperCase()} · ${o.name||o.email}`,h("br"),h("small",{},`${o.phone} · ${o.address}`),h("br"),h("small",{},o.lines.map(l=>`${l.name}×${l.qty}${l.size?" "+l.size:""}`).join("، ")+` — ${o.lines.reduce((a,l)=>a+l.price*l.qty,0)}`),h("br"),h("small",{},new Date(o.createdAt).toLocaleString("ar")+(o.note?" · "+o.note:"")),h("br"),
    h("a",{href:`https://maps.google.com/?q=${o.loc.lat},${o.loc.lng}`,target:"_blank",rel:"noopener"},"📍 الموقع")),
    h("select",{onchange:async e=>{try{await update(ref(db,"orders/"+id),{status:e.target.value,updatedAt:Date.now()});toast("تم تحديث الحالة")}catch{toast("تعذّر التحديث")}}},...Object.entries(ST).map(([k,v])=>h("option",{value:k,selected:k===o.status},v))))):[h("p",{className:"hint"},"لا توجد طلبات بعد.")]))}
function fill(id){editing=id;const p=products[id],f=$("#f");for(const k of["name","cat","price","oldPrice","stock","tag","desc"])f[k].value=p[k]??"";f.sizes.value=(p.sizes||[]).join("،");f.colors.value=(p.colors||[]).join("،");f.published.checked=!!p.published;f.featured.checked=!!p.featured;scrollTo(0,0)}
$("#rs").onclick=()=>{editing=null;$("#prev").replaceChildren()};
$("#f").elements.files.onchange=e=>$("#prev").replaceChildren(...[...e.target.files].map(f=>h("img",{src:URL.createObjectURL(f),alt:""})));
const webp=(file,max=1400)=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>{const s=Math.min(1,max/Math.max(i.width,i.height)),c=document.createElement("canvas");c.width=i.width*s;c.height=i.height*s;c.getContext("2d").drawImage(i,0,0,c.width,c.height);c.toBlob(b=>b?res(b):rej(),"image/webp",.82)};i.onerror=rej;i.src=URL.createObjectURL(file)});
$("#f").onsubmit=async e=>{e.preventDefault();const f=e.target,err=$("#fe"),btn=$("#sb");err.textContent="";
  const list=s=>s.split(/[,،]/).map(x=>x.trim()).filter(Boolean),price=+f.price.value,old=+f.oldPrice.value||0;
  if(f.name.value.trim().length<2)return err.textContent="اكتبي اسم المنتج.";if(!(price>=0))return err.textContent="السعر غير صحيح.";if(old&&old<=price)return err.textContent="السعر السابق يجب أن يكون أعلى من السعر الحالي.";
  btn.disabled=true;
  try{const id=editing||crypto.randomUUID().slice(0,12),prev=products[id]||{};let images=prev.images||[];
    const files=[...f.files.files];if(files.some(x=>!x.type.startsWith("image/")))throw new Error("ملف غير مدعوم");
    if(files.length){images=[];for(const [n,x] of files.entries()){const b=await webp(x);const r=sref(st,`products/${id}/${Date.now()}_${n}.webp`);await uploadBytes(r,b,{contentType:"image/webp"});images.push(await getDownloadURL(r))}}
    const data={name:f.name.value.trim(),desc:f.desc.value.trim(),cat:f.cat.value,price,oldPrice:old||null,stock:+f.stock.value|0,tag:f.tag.value.trim()||null,sizes:list(f.sizes.value),colors:list(f.colors.value),images,published:f.published.checked,featured:f.featured.checked,createdAt:prev.createdAt||Date.now(),updatedAt:Date.now()};
    await set(ref(db,"products/"+id),data);toast("تم الحفظ ✓");f.reset();$("#prev").replaceChildren();editing=null;refresh()}
  catch(x){err.textContent="تعذّر الحفظ: تحققي من الصلاحيات والاتصال."}finally{btn.disabled=false}};

function route(){const a=location.hash==="#admin";$("#adminView").hidden=!a;document.querySelector("main").hidden=a}
addEventListener("hashchange",route);route();

async function refresh2(){
  const cats=(await get(ref(db,"categories"))).val()||{},bn=(await get(ref(db,"banners"))).val()||{},sel=$("#f").cat,cur=sel.value;
  sel.replaceChildren(h("option",{value:"women"},"الملابس النسائية"),h("option",{value:"other"},"منتجات أخرى"),...Object.entries(cats).map(([k,v])=>h("option",{value:k},v.name)));sel.value=cur||"women";
  $("#clist").replaceChildren(...Object.entries(cats).map(([k,v])=>h("div",{className:"row"},h("div",{},v.name),h("button",{className:"btn ghost",onclick:async()=>{if(confirm("حذف التصنيف؟")){await remove(ref(db,"categories/"+k));refresh()}}},"حذف"))));
  $("#blist").replaceChildren(...Object.entries(bn).map(([k,b])=>h("div",{className:"row"},h("img",{src:b.image,alt:""}),h("div",{},b.title,h("br"),h("small",{},(b.place==="hero"?"واجهة":"رئيسية")+(b.active?" · مفعّل":" · موقوف"))),
    h("button",{className:"btn ghost",onclick:async()=>{await update(ref(db,"banners/"+k),{active:!b.active});refresh()}},b.active?"إيقاف":"تفعيل"),
    h("button",{className:"btn ghost",onclick:async()=>{if(confirm("حذف العرض؟")){await remove(ref(db,"banners/"+k));refresh()}}},"حذف"))))}
$("#cf").onsubmit=async e=>{e.preventDefault();const n=e.target.name.value.trim();if(n.length<2)return;await set(ref(db,"categories/c"+Date.now().toString(36)),{name:n});e.target.reset();toast("أُضيف التصنيف");refresh()};
$("#bf").onsubmit=async e=>{e.preventDefault();const f=e.target,er=$("#be");er.textContent="";
  try{const x=f.img.files[0];if(!x?.type.startsWith("image/"))throw 0;const id="b"+Date.now().toString(36),r=sref(st,`products/banners/${id}.webp`);await uploadBytes(r,await webp(x,1800),{contentType:"image/webp"});
    await set(ref(db,"banners/"+id),{title:f.title.value.trim(),text:f.text.value.trim(),link:f.link.value.trim(),btn:f.btn.value.trim(),place:f.place.value,endsAt:f.end.value?new Date(f.end.value).getTime()+864e5:null,image:await getDownloadURL(r),active:true,createdAt:Date.now()});
    f.reset();toast("تمت الإضافة ✓");refresh()}catch{er.textContent="تعذّر الحفظ: اختاري صورة وتحققي من الصلاحيات."}};
