(() => {
  "use strict";

  const SHOPPING_HOURS = [
    { match:["the landing"], title:"The Landing · Renton", timezone:"America/Los_Angeles", visitDate:"2026-08-11", stores:[
      {name:"Ross Dress for Less",open:"09:00",close:"22:00",priority:true},
      {name:"Marshalls",open:"09:30",close:"21:30",priority:true},
      {name:"Target",open:"08:00",close:"22:00",priority:true},
      {name:"World Market",open:"10:00",close:"20:00"},
      {name:"Ulta Beauty",open:"10:00",close:"21:00"}
    ]},
    { match:["southcenter square","southcenter"], title:"Southcenter Square", timezone:"America/Los_Angeles", visitDate:"2026-08-12", stores:[
      {name:"Nordstrom Rack",open:"10:00",close:"20:00",priority:true},
      {name:"Burlington",open:"09:00",close:"22:00",priority:true},
      {name:"Ross Dress for Less",open:"09:00",close:"22:00",priority:true},
      {name:"TJ Maxx",open:"09:30",close:"21:30",priority:true},
      {name:"Marshalls",open:"09:30",close:"21:30",priority:true},
      {name:"Macy’s Backstage",open:"10:00",close:"21:00"}
    ]},
    { match:["canyon ridge plaza","canyon ridge"], title:"Canyon Ridge Plaza", timezone:"America/Los_Angeles", visitDate:"2026-08-12", stores:[
      {name:"TJ Maxx",open:"09:30",close:"21:30",priority:true},
      {name:"Ross Dress for Less",open:"09:00",close:"22:00",priority:true},
      {name:"HomeGoods",open:"09:30",close:"21:30",priority:true},
      {name:"Walmart Supercenter",open:"06:00",close:"23:00",priority:true},
      {name:"Michaels",open:"09:00",close:"21:00"}
    ]},
    { match:["triangle center"], title:"Triangle Center · Longview", timezone:"America/Los_Angeles", visitDate:"2026-08-13", stores:[
      {name:"TJ Maxx",open:"09:30",close:"21:30",priority:true},
      {name:"Ross Dress for Less",open:"09:00",close:"22:00",priority:true},
      {name:"Target",open:"08:00",close:"22:00",priority:true},
      {name:"Dollar Tree",open:"09:00",close:"22:00",priority:true},
      {name:"Panda Express",open:"10:30",close:"21:00"}
    ]},
    { match:["market crossing","big bend crossing"], title:"Big Bend / Market Crossing · Burnaby", timezone:"America/Vancouver", visitDate:"2026-08-16", stores:[
      {name:"Winners & HomeSense",open:"10:00",close:"21:00",priority:true},
      {name:"Dollarama",open:"08:00",close:"20:00",priority:true},
      {name:"Michaels",open:"10:00",close:"19:00"},
      {name:"PetSmart",open:"10:00",close:"19:00"},
      {name:"Staples",open:"10:00",close:"18:00"}
    ]},
    { match:["lacey retail district","lacey crossing","capital mall"], title:"Lacey Retail District", timezone:"America/Los_Angeles", visitDate:"2026-08-18", stores:[
      {name:"Ross Dress for Less",open:"09:00",close:"22:00",priority:true},
      {name:"TJ Maxx",open:"09:30",close:"21:30",priority:true},
      {name:"Burlington",open:"09:00",close:"22:00",priority:true},
      {name:"Nordstrom Rack",open:"10:00",close:"20:00",priority:true},
      {name:"Marshalls",open:"09:30",close:"21:30",priority:true},
      {name:"HomeGoods",open:"09:30",close:"21:30",priority:true},
      {name:"Target",open:"08:00",close:"22:00"}
    ]},
    { match:["outlet collection","auburn"], title:"The Outlet Collection Seattle · Auburn", timezone:"America/Los_Angeles", visitDate:"2026-08-18", stores:[
      {name:"Nordstrom Rack",open:"10:00",close:"20:00",priority:true},
      {name:"Burlington",open:"09:00",close:"23:00",priority:true},
      {name:"Nike Factory Store",open:"10:00",close:"20:00"},
      {name:"adidas Outlet",open:"10:00",close:"20:00"},
      {name:"Coach Outlet",open:"10:00",close:"20:00"},
      {name:"Levi’s Outlet",open:"10:00",close:"20:00"},
      {name:"Columbia Factory Store",open:"10:00",close:"20:00"},
      {name:"Under Armour",open:"10:00",close:"20:00"}
    ]}
  ];

  const norm=v=>String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const mins=v=>{const [h,m]=v.split(":").map(Number);return h*60+m};
  const fmt=v=>{const [h,m]=v.split(":").map(Number);return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"p.m.":"a.m."}`};
  function localNow(tz){const p=new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());const x=Object.fromEntries(p.map(a=>[a.type,a.value]));return{date:`${x.year}-${x.month}-${x.day}`,minutes:+x.hour*60 + +x.minute}}
  function findPlace(row){const text=norm([row?.nombre,row?.categoria,row?.descripcion,row?.maps_query].join(" "));return SHOPPING_HOURS.find(p=>p.match.some(m=>text.includes(norm(m))))}
  function status(place,store){const now=localNow(place.timezone),o=mins(store.open),c=mins(store.close);if(now.date!==place.visitDate)return{icon:"🕒",label:`${fmt(store.open)}–${fmt(store.close)}`,detail:"Horario regular para el día de la visita"};if(now.minutes<o)return{icon:"🔴",label:"Cerrado",detail:`Abre ${fmt(store.open)}`};if(now.minutes>=c)return{icon:"🔴",label:"Cerrado",detail:`Horario de hoy: ${fmt(store.open)}–${fmt(store.close)}`};const r=c-now.minutes;if(r<=60)return{icon:"🟠",label:"Cierra pronto",detail:`Cierra en ${r} min · ${fmt(store.close)}`};return{icon:"🟢",label:"Abierto",detail:`Cierra ${fmt(store.close)}`}}

  function installStyles(){if(document.getElementById("shoppingHoursStyles"))return;const s=document.createElement("style");s.id="shoppingHoursStyles";s.textContent=`
    .shopping-hours-grid{display:grid;gap:10px}.shopping-store{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:10px;align-items:center;padding:13px;border:1px solid var(--border,rgba(32,35,33,.09));border-radius:18px;background:var(--surface,#fff)}.shopping-store.priority{border-color:rgba(239,128,99,.25);background:linear-gradient(135deg,rgba(252,232,225,.7),#fff)}.shopping-store-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:12px;background:var(--surface-soft,#f0f2ee);font-size:16px}.shopping-store-name{font-size:14px;font-weight:800;line-height:1.3}.shopping-store-detail{margin-top:3px;color:var(--muted,#7e8781);font-size:11px;line-height:1.35}.shopping-store-status{text-align:right;font-size:11px;font-weight:800;white-space:nowrap}.shopping-hours-note{margin-top:11px;color:var(--muted,#7e8781);font-size:10px;line-height:1.45}.offline-banner{position:fixed;z-index:150;top:calc(10px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);max-width:calc(100% - 28px);padding:9px 13px;border:1px solid rgba(99,149,179,.22);border-radius:16px;background:rgba(234,243,248,.96);color:#365d73;box-shadow:0 8px 24px rgba(38,45,41,.14);font:700 11px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center}.offline-banner[hidden]{display:none}`;document.head.appendChild(s)}

  function render(row){const place=findPlace(row);if(!place)return"";const stores=[...place.stores].sort((a,b)=>Number(!!b.priority)-Number(!!a.priority));return `<section class="detail-section shopping-hours-section"><div class="detail-section-label">Tiendas y horarios</div><div class="shopping-hours-grid">${stores.map(store=>{const st=status(place,store);return `<div class="shopping-store ${store.priority?"priority":""}"><div class="shopping-store-icon">${st.icon}</div><div><div class="shopping-store-name">${escapeHTML(store.name)}</div><div class="shopping-store-detail">${escapeHTML(st.detail)}</div></div><div class="shopping-store-status">${escapeHTML(st.label)}</div></div>`}).join("")}</div><div class="shopping-hours-note">Horarios regulares de referencia. Confirmen el mismo día por posibles cambios, días festivos o cierres especiales.</div></section>`}

  function offlineBanner(){if(document.getElementById("roadtripOfflineBanner"))return;const b=document.createElement("div");b.id="roadtripOfflineBanner";b.className="offline-banner";b.textContent="📶 Sin conexión · Mostrando itinerario guardado";document.body.appendChild(b);const u=()=>b.hidden=navigator.onLine;addEventListener("online",u);addEventListener("offline",u);u()}

  function wrap(){if(typeof window.openDetail!=="function"){setTimeout(wrap,100);return}if(window.openDetail.__shoppingHoursWrapped)return;const original=window.openDetail;function enhanced(order,resetScroll=true){original(order,resetScroll);try{const row=typeof window.getRow==="function"?window.getRow(order):null;if(!row)return;const content=document.querySelector(".detail-content");if(!content||content.querySelector(".shopping-hours-section"))return;const section=render(row);if(!section)return;const task=[...content.querySelectorAll(".detail-section")].find(el=>norm(el.querySelector(".detail-section-label")?.textContent).includes("que hacer"));(task||content).insertAdjacentHTML(task?"afterend":"beforeend",section)}catch(e){console.warn("Horarios no disponibles",e)}}enhanced.__shoppingHoursWrapped=true;window.openDetail=enhanced}

  function start(){installStyles();offlineBanner();wrap()}
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start):start();
})();
