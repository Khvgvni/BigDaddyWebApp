/* ======== НАСТРОЙКИ И ИНТЕГРАЦИЯ ========

ВАЖНО: На фронтенде мы НЕ используем токен Telegram.
Ставьте свой прокси-бэкенд (на вашей VM / хостинге), который примет POST
и отправит сообщение в чат админов через Telegram Bot API.

Пример эндпоинтов бэкенда (рекомендуется):
  POST {BACKEND_URL}/api/order
  POST {BACKEND_URL}/api/reservation
  POST {BACKEND_URL}/api/feedback
  POST {BACKEND_URL}/api/admin/list   (опц., для админ-панели)
  POST {BACKEND_URL}/api/event/create (опц.)
  GET  {BACKEND_URL}/api/events       (список афиши)

Каждый POST содержит JSON с данными заказа/брони/мероприятия.
Бэкенд формирует красивый текст и шлёт в Telegram chat_id админов.

*/
const BACKEND_URL = 'https://app.bigdaddycafe.ru';// <= ЗАМЕНИТЕ на адрес вашей VM

window.addEventListener('load', () => {
  if (window.Telegram && Telegram.WebApp) {
    const tg = Telegram.WebApp;
    tg.ready();
    tg.expand();          // развернуть на всю высоту
    tg.enableClosingConfirmation(); // предупреждение при закрытии (по желанию)
    // Пример доступа к пользователю: tg.initDataUnsafe?.user
    // TODO: здесь можно читать tg.initDataUnsafe и слать на бэкенд для авторизации по Telegram WebApp initData
  }
});

/* ======== ДАННЫЕ ДЛЯ ДЕМО ======== */
const DISHES = [
  {id:'p1', title:'Маргарита', desc:'Классическая пицца с томатами и моцареллой', price: 550, img:'https://images.unsplash.com/photo-1548365328-9f547fb09530?q=80&w=800&auto=format&fit=crop'},
  {id:'p2', title:'Бургер BBQ', desc:'Сочный говяжий бургер с фирменным соусом', price: 490, img:'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=800&auto=format&fit=crop'},
  {id:'p3', title:'Боул с лососем', desc:'Рис, лосось, авокадо, соус понзу', price: 620, img:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop'},
  {id:'p4', title:'Паста Карбонара', desc:'Гуанчале, пармезан, сливочный соус', price: 570, img:'https://images.unsplash.com/photo-1523986371872-9d3ba2e2f642?q=80&w=800&auto=format&fit=crop'},
  {id:'p5', title:'Стейк', desc:'Мраморная говядина, прожарка на выбор', price: 1290, img:'https://images.unsplash.com/photo-1604908177222-cb9b6b7893be?q=80&w=800&auto=format&fit=crop'},
  {id:'p6', title:'Салат Цезарь', desc:'Курица, романо, пармезан, соус цезарь', price: 420, img:'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=800&auto=format&fit=crop'},
  {id:'p7', title:'Рамен', desc:'Куриный бульон, лапша, яйцо, нори', price: 480, img:'https://images.unsplash.com/photo-1542444459-db63c4f6d8d1?q=80&w=800&auto=format&fit=crop'},
  {id:'p8', title:'Лимонад', desc:'Домашний, лимон-мята', price: 190, img:'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=800&auto=format&fit=crop'}
];
const CATEGORIES = ['Все','Пицца','Бургеры','Пасты','Салаты','Горячее','Напитки'];

let EVENTS = [
  {id:'e1', title:'Джаз-вечер', date:'2025-11-08', desc:'Живой джаз, welcome-drink'},
  {id:'e2', title:'Квиз-ночь', date:'2025-11-14', desc:'Командная викторина, призы'},
];

const DELIVERY_FEE = 0; // если есть платная доставка — укажите сумму

/* ======== СОСТОЯНИЕ ======== */
const state = {
  cart: /** @type {Record<string, number>} */ (JSON.parse(localStorage.getItem('cart')||'{}')),
  user: /** @type {{name?:string,phone?:string}|null} */ (JSON.parse(localStorage.getItem('user')||'null')),
  admin: false
};

/* ======== УТИЛИТЫ ======== */
const $ = (q)=>document.querySelector(q);
const $$ = (q)=>document.querySelectorAll(q);
const money = (n)=>`${n.toLocaleString('ru-RU')} ₽`;
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2000);
}
function saveCart(){ localStorage.setItem('cart', JSON.stringify(state.cart)); updateCartBadge(); }
function setUser(u){ state.user = u; localStorage.setItem('user', JSON.stringify(u)); renderProfile(); }

/* ======== РЕНДЕР МЕНЮ ======== */
function renderCategories(){
  const wrap = $('#categories'); wrap.innerHTML='';
  CATEGORIES.forEach((c,i)=>{
    const b=document.createElement('button'); b.className='chip'+(i===0?' active':''); b.textContent=c;
    b.onclick=()=>{ $$('.chip').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderMenu(c); };
    wrap.appendChild(b);
  });
}
function renderMenu(filter='Все', search=''){
  const grid = $('#menuGrid'); grid.innerHTML='';
  const q = search.trim().toLowerCase();
  DISHES.filter(d=>{
    const byCat = filter==='Все' || (filter==='Пицца' && d.title.toLowerCase().includes('пиц'))
      || (filter==='Бургеры' && /бургер/i.test(d.title))
      || (filter==='Пасты' && /паста|карбон/i.test(d.title))
      || (filter==='Салаты' && /салат|цезар/i.test(d.title))
      || (filter==='Горячее' && /стейк|рамен/i.test(d.title))
      || (filter==='Напитки' && /лимонад|чай|кофе/i.test(d.title));
    const bySearch = !q || d.title.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q);
    return byCat && bySearch;
  }).forEach(d=>{
    const card=document.createElement('article'); card.className='card blur';
    card.innerHTML=`
      <img class="img" src="${d.img}" alt="${d.title}">
      <div class="content">
        <h4>${d.title}</h4>
        <p>${d.desc}</p>
        <div class="price-row">
          <span class="price">${money(d.price)}</span>
          <button class="btn glass small">В корзину</button>
        </div>
      </div>`;
    card.querySelector('button').onclick=()=>addToCart(d.id,1);
    grid.appendChild(card);
  });
}

/* ======== КОРЗИНА ======== */
function addToCart(id, qty){
  state.cart[id]=(state.cart[id]||0)+qty;
  if(state.cart[id]<=0) delete state.cart[id];
  saveCart();
  renderCart();
  toast('Добавлено в корзину');
}
function updateCartBadge(){
  const count = Object.values(state.cart).reduce((a,b)=>a+b,0);
  const badge = $('#cartBadge');
  if(count>0){ badge.textContent = String(count); badge.classList.remove('hidden'); } else badge.classList.add('hidden');
}
function cartItems(){
  return Object.entries(state.cart).map(([id,qty])=>{
    const item = DISHES.find(d=>d.id===id);
    return {...item, qty, total:item.price*qty};
  });
}
function renderCart(){
  const list = $('#cartList'), empty = $('#cartEmpty');
  const items = cartItems();
  if(items.length===0){ list.innerHTML=''; empty.classList.remove('hidden'); $('#checkout').style.display='none'; return; }
  empty.classList.add('hidden'); $('#checkout').style.display='';
  list.innerHTML='';
  items.forEach(it=>{
    const row=document.createElement('div'); row.className='cart-item';
    row.innerHTML=`
      <img src="${it.img}" alt="${it.title}">
      <div class="meta">
        <h5>${it.title}</h5>
        <div class="muted">${money(it.price)} • ${it.desc}</div>
      </div>
      <div class="qty">
        <button aria-label="минус">−</button>
        <strong>${it.qty}</strong>
        <button aria-label="плюс">+</button>
      </div>`;
    const [btnMinus, , btnPlus] = row.querySelectorAll('.qty button, .qty strong');
    btnMinus.onclick=()=>{ addToCart(it.id,-1); };
    btnPlus.onclick =()=>{ addToCart(it.id, 1); };
    list.appendChild(row);
  });
  const subtotal = items.reduce((a,b)=>a+b.total,0);
  const total = subtotal + DELIVERY_FEE;
  $('#sumSubtotal').textContent = money(subtotal);
  $('#sumDelivery').textContent = DELIVERY_FEE ? money(DELIVERY_FEE) : 'бесплатно';
  $('#sumTotal').textContent = money(total);
}

/* ======== ОФОРМЛЕНИЕ ЗАКАЗА ======== */
$('#orderForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const form = new FormData(e.target);
  const items = cartItems();
  if(items.length===0){ toast('Добавьте блюда'); return; }

  const payload = {
    type:'order',
    user: {
      name: form.get('name') || state.user?.name || '',
      phone: form.get('phone') || state.user?.phone || ''
    },
    address: form.get('address'),
    when: form.get('when'),
    payment: form.get('payment'),
    comment: form.get('comment'),
    items: items.map(i=>({id:i.id, title:i.title, qty:i.qty, price:i.price})),
    sum: items.reduce((a,b)=>a+b.total,0),
    delivery: DELIVERY_FEE,
    total: items.reduce((a,b)=>a+b.total,0)+DELIVERY_FEE,
    createdAt: new Date().toISOString()
  };

  try{
    await sendToBackend('/api/order', payload);
    toast('Заказ отправлен админам');
    state.cart = {}; saveCart(); renderCart();
    openTab('profile');
  }catch(err){
    console.error(err);
    toast('Ошибка отправки. Проверьте соединение.');
  }
});

/* ======== АФИША ======== */
async function fetchEvents(){
  try{
    const res = await fetch(`${BACKEND_URL}/api/events`, {method:'GET'});
    if(res.ok){
      const remote = await res.json();
      if(Array.isArray(remote) && remote.length) EVENTS = remote;
    }
  }catch{/* молча — используем локальные */}
  renderEvents();
}
function renderEvents(){
  const wrap = $('#eventsList'); wrap.innerHTML='';
  const now = new Date().toISOString().slice(0,10);
  EVENTS.sort((a,b)=>a.date.localeCompare(b.date));
  EVENTS.forEach(ev=>{
    const dt = new Date(ev.date+'T00:00:00');
    const d = String(dt.getDate()).padStart(2,'0');
    const m = dt.toLocaleString('ru-RU',{month:'short'}).replace('.','');
    const card = document.createElement('div'); card.className='event';
    card.innerHTML=`
      <div class="date"><div class="d">${d}</div><div class="m">${m}</div></div>
      <div class="body"><h4>${ev.title}</h4><p>${ev.desc||''}</p></div>
      <div class="cta"><button class="btn glass small">Записаться</button></div>`;
    card.querySelector('button').onclick=()=>eventSignup(ev);
    wrap.appendChild(card);
  });
}
async function eventSignup(ev){
  const name = state.user?.name || prompt('Ваше имя:');
  if(!name) return;
  const phone = state.user?.phone || prompt('Телефон для связи:');
  if(!phone) return;
  try{
    await sendToBackend('/api/feedback', {type:'event_signup', event:ev, user:{name,phone}, createdAt:new Date().toISOString()});
    toast('Заявка отправлена');
  }catch{ toast('Не удалось отправить'); }
}

/* ======== БРОНИРОВАНИЕ ======== */
$('#reserveForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const f = new FormData(e.target);
  const payload = {
    type:'reservation',
    date: f.get('date'),
    time: f.get('time'),
    guests: Number(f.get('guests')),
    comment: f.get('comment'),
    user: { name: f.get('name'), phone: f.get('phone') },
    createdAt: new Date().toISOString()
  };
  try{
    await sendToBackend('/api/reservation', payload);
    toast('Заявка на бронь отправлена');
    e.target.reset();
  }catch{ toast('Ошибка отправки'); }
});

/* ======== ПРОФИЛЬ / АВТОРИЗАЦИЯ ======== */
function renderProfile(){
  $('#profileName').textContent = state.user?.name || 'Гость';
  $('#profilePhone').textContent = state.user?.phone || 'Не авторизован';
  $('#loginBtn').textContent = state.user ? 'Изменить' : 'Войти';
}
$('#loginBtn')?.addEventListener('click', ()=>{
  const dlg = $('#authDialog');
  const form = $('#authForm');
  form.name.value = state.user?.name || '';
  form.phone.value = state.user?.phone || '';
  dlg.showModal();
  form.addEventListener('close', ()=>dlg.close(), {once:true});
});
$('#authForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const f = new FormData(e.target);
  setUser({name:f.get('name'), phone:f.get('phone')});
  $('#authDialog').close();
  toast('Профиль сохранён');
});

/* ======== АДМИН-ПАНЕЛЬ (локальный просмотр + хук на бэкенд) ======== */
$('#enterAdminBtn')?.addEventListener('click', async ()=>{
  const pin = $('#adminPin').value.trim();
  try{
    const res = await fetch(`${BACKEND_URL}/api/admin/login`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({pin})});
    if(res.ok){
      state.admin = true; $('#adminPanel').classList.remove('hidden'); $('#adminGate').classList.add('hidden');
      loadAdminData();
      toast('Админ-режим активирован');
    }else{
      throw new Error('bad pin');
    }
  }catch{ toast('Неверный пин или нет связи'); }
});
$('#exitAdminBtn')?.addEventListener('click', ()=>{
  state.admin=false; $('#adminPanel').classList.add('hidden'); $('#adminGate').classList.remove('hidden');
});

$$('[data-admin-tab]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $$('[data-admin-tab]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.getAttribute('data-admin-tab');
    $('#adminOrders').classList.toggle('hidden', tab!=='orders');
    $('#adminReservations').classList.toggle('hidden', tab!=='reservations');
    $('#adminEvents').classList.toggle('hidden', tab!=='events');
  });
});

async function loadAdminData(){
  try{
    const res = await fetch(`${BACKEND_URL}/api/admin/list`, {method:'POST'});
    if(!res.ok) throw new Error();
    const data = await res.json();
    renderAdminOrders(data.orders||[]);
    renderAdminReservations(data.reservations||[]);
    // события админом
    $('#adminEventsList').innerHTML='';
    (data.events||EVENTS).forEach(addEventAdminCard);
  }catch{
    // fallback: локально пусто
    renderAdminOrders([]);
    renderAdminReservations([]);
    $('#adminEventsList').innerHTML='Нет данных';
  }
}
function renderAdminOrders(list){
  const box = $('#adminOrders'); box.innerHTML='';
  if(!list.length){ box.innerHTML='<p class="muted">Нет заказов</p>'; return; }
  list.forEach(o=>{
    const el=document.createElement('div'); el.className='event';
    el.innerHTML=`
      <div class="date"><div class="d">№</div><div class="m">${(o.id||'—')}</div></div>
      <div class="body"><h4>${o.user?.name||'Клиент'} — ${o.user?.phone||''}</h4>
        <p>${o.address||''}</p>
        <p class="muted">${(o.items||[]).map(i=>`${i.title}×${i.qty}`).join(', ')} • Итого: ${money(o.total||0)}</p>
      </div>
      <div class="cta"><button class="btn glass small">Принято</button></div>`;
    box.appendChild(el);
  });
}
function renderAdminReservations(list){
  const box = $('#adminReservations'); box.innerHTML='';
  if(!list.length){ box.innerHTML='<p class="muted">Нет заявок</p>'; return; }
  list.forEach(r=>{
    const el=document.createElement('div'); el.className='event';
    el.innerHTML=`
      <div class="date"><div class="d">${String(r.guests||'?')}</div><div class="m">гостей</div></div>
      <div class="body"><h4>${r.date} ${r.time}</h4><p>${r.user?.name||''} • ${r.user?.phone||''}</p></div>
      <div class="cta"><button class="btn glass small">OK</button></div>`;
    box.appendChild(el);
  });
}

$('#createEventForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const f = new FormData(e.target);
  const ev = {title:f.get('title'), date:f.get('date'), desc:f.get('desc')};
  addEventAdminCard(ev);
  try{
    await sendToBackend('/api/event/create', {type:'event', ...ev});
    toast('Событие отправлено на сервер');
  }catch{/* no-op */}
  e.target.reset();
});
function addEventAdminCard(ev){
  const wrap = $('#adminEventsList');
  const el=document.createElement('div'); el.className='event';
  const d = new Date(ev.date); const dd = String(d.getDate()).padStart(2,'0');
  const m = d.toLocaleString('ru-RU',{month:'short'}).replace('.','');
  el.innerHTML=`
    <div class="date"><div class="d">${dd}</div><div class="m">${m}</div></div>
    <div class="body"><h4>${ev.title}</h4><p>${ev.desc||''}</p></div>`;
  wrap.appendChild(el);
}

/* ======== ПОИСК ======== */
$('#searchInput')?.addEventListener('input', (e)=>{
  renderMenu(getActiveCategory(), e.target.value);
});
function getActiveCategory(){
  const active = Array.from($$('.chips .chip')).find(c=>c.classList.contains('active'));
  return active ? active.textContent : 'Все';
}

/* ======== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ======== */
function openTab(name){
  $$('.page').forEach(p=>p.classList.remove('active'));
  $(`#page-${name}`).classList.add('active');
  $$('.tab').forEach(t=>t.classList.remove('active'));
  $(`#tab-${name}`).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}
$$('.tab').forEach(b=>b.addEventListener('click', ()=>openTab(b.dataset.open)));
$$('[data-open="menu"]')?.forEach?.((b)=>b.addEventListener('click', ()=>openTab('menu')));

/* ======== СЕТЕВЫЕ ЗАПРОСЫ ======== */
async function sendToBackend(path, body){
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json().catch(()=> ({}));
}

/* ======== ИНИЦИАЛИЗАЦИЯ ======== */
function init(){
  renderCategories();
  renderMenu();
  renderCart();
  renderProfile();
  fetchEvents();
  updateCartBadge();

  // Автоподстановка профиля в форму заказа
  if(state.user){
    const form = $('#orderForm');
    if(form){ form.name.value = state.user.name || ''; form.phone.value = state.user.phone || ''; }
  }
}
init();
