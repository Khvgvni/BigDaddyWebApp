import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_IDS = (process.env.ADMIN_CHAT_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (!BOT_TOKEN || ADMIN_CHAT_IDS.length === 0) {
  console.error('BOT_TOKEN или ADMIN_CHAT_IDS не заданы в .env');
  process.exit(1);
}

const tgUrl = (method) => `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
const esc = (s='') => String(s).replace(/[<&>]/g, m => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[m]);

async function notifyAdmins(html) {
  const body = { parse_mode: 'HTML', disable_web_page_preview: true };
  for (const chat_id of ADMIN_CHAT_IDS) {
    await fetch(tgUrl('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, text: html, ...body })
    });
  }
}

app.get('/api/ping', (_,res) => res.json({ ok:true, ts:Date.now() }));

app.post('/api/order', async (req,res) => {
  const o = req.body || {};
  const items = (o.items||[]).map(i=>`${esc(i.title)}×${i.qty}`).join(', ');
  const text =
    `<b>🛒 Новый заказ</b>\n`+
    `Имя: <b>${esc(o.user?.name||'')}</b>\n`+
    `Тел: <code>${esc(o.user?.phone||'')}</code>\n`+
    `Адрес: ${esc(o.address||'')}\n`+
    `Когда: ${esc(o.when||'')}\n`+
    `Оплата: ${esc(o.payment||'')}\n`+
    `Состав: ${items}\n`+
    `Комментарий: ${esc(o.comment||'')}\n`+
    `Итого: <b>${o.total??0} ₽</b>`;
  try { await notifyAdmins(text); res.json({ ok:true }); }
  catch(e){ console.error(e); res.status(500).json({ ok:false }); }
});

app.post('/api/reservation', async (req,res) => {
  const r = req.body || {};
  const text =
    `<b>📅 Бронь столика</b>\n`+
    `Дата/время: <b>${esc(r.date)} ${esc(r.time)}</b>\n`+
    `Гостей: ${esc(r.guests)}</b>\n`+
    `Имя: <b>${esc(r.user?.name||'')}</b>\n`+
    `Тел: <code>${esc(r.user?.phone||'')}</code>\n`+
    `Пожелания: ${esc(r.comment||'')}`;
  try { await notifyAdmins(text); res.json({ ok:true }); }
  catch(e){ console.error(e); res.status(500).json({ ok:false }); }
});

app.post('/api/feedback', async (req,res) => {
  const f = req.body || {};
  const text =
    `<b>✉️ Заявка</b>\n`+
    `Тип: ${esc(f.type||'feedback')}\n`+
    (f.event ? `Событие: <b>${esc(f.event.title)}</b> (${esc(f.event.date)})\n` : '')+
    (f.user ? `От: <b>${esc(f.user.name||'')}</b>, <code>${esc(f.user.phone||'')}</code>\n` : '')+
    (f.message ? `Текст: ${esc(f.message)}` : '');
  try { await notifyAdmins(text); res.json({ ok:true }); }
  catch(e){ console.error(e); res.status(500).json({ ok:false }); }
});

app.get('/api/events', (req,res) => {
  res.json([
    {id:'e1', title:'Джаз-вечер', date:'2025-11-08', desc:'Живой джаз, welcome-drink'},
    {id:'e2', title:'Квиз-ночь', date:'2025-11-14', desc:'Командная викторина, призы'}
  ]);
});

app.post('/api/admin/login', (req,res) => res.json({ ok:true }));
app.post('/api/admin/list',  (req,res) => res.json({ orders:[], reservations:[], events:[] }));
app.post('/api/event/create', async (req,res) => {
  const ev = req.body || {};
  try {
    await notifyAdmins(`<b>🎉 Новое событие</b>\n${esc(ev.title)} — ${esc(ev.date)}\n${esc(ev.desc||'')}`);
    res.json({ ok:true });
  } catch(e){ console.error(e); res.status(500).json({ ok:false }); }
});

app.listen(PORT, () => console.log(`bigdaddy-api listening on ${PORT}`));