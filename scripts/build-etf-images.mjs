// Builds evergreen ticker images for every ETF on MonthlyETFs.com (site colors).
//   etf-images/<sym>-etf.png       600x600 square (Google Images, social posts, threads)
//   etf-images/<sym>-etf-wide.png  1200x630 (link share previews on each fund page)
//   etf-images/<sym>.html          one page per image (what Google Images ranks)
//   etf-images/index.html          gallery of every image
//   etf-images/image-sitemap.xml   image sitemap for Search Console
//   etf-images/manifest.json       symbol -> name, so images only re-render when a name changes
// None of these are linked from existing pages; Google finds them through the image sitemap.
// Usage: node scripts/build-etf-images.mjs [csvFileOrUrl]
// Needs: npm i --no-save satori@0.35.0 @resvg/resvg-js@2.6.2 @fontsource/lato@5.3.0
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'etf-images');
const SITE = 'https://monthlyetfs.com';
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSscSF78pEGxi9Lcx2YHZjHHAkyy75b5Icb6A8nK2aehtmEq-xgpFPA7sQdkmZYKjkUdrtPL1SdMm62/pub?output=csv';
const src = process.argv[2] || CSV_URL;
const VERSION = 1; // bump to force every image to re-render after a design change

// ---------- data ----------
function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
let csvText;
if (/^https?:/.test(src)) { const r = await fetch(src + (src.includes('?') ? '&' : '?') + 't=' + Date.now()); if (!r.ok) throw new Error('CSV ' + r.status); csvText = await r.text(); }
else csvText = fs.readFileSync(src, 'utf8');
const rows = parseCSV(csvText);
const head = rows.shift().map(h => h.trim().toLowerCase());
const iS = head.findIndex(h => /^(symbol|ticker)/.test(h)), iN = head.findIndex(h => /^(etf name|fund name|name)/.test(h));
const seen = new Set();
const ETFS = rows.map(r => ({ sym: (r[iS] || '').trim().toUpperCase(), name: (r[iN] || '').replace(/\s+/g, ' ').trim() }))
  .filter(e => /^[A-Z0-9.]{1,6}$/.test(e.sym) && e.name && !seen.has(e.sym) && seen.add(e.sym))
  .sort((a, b) => a.sym.localeCompare(b.sym));
// Clean up a few sheet names so the evergreen images carry the fund's proper name
const NAME_FIX = {
  AMDW: 'Roundhill AMD WeeklyPay ETF',
  ODTE: 'VegaShares SPX NDX RTY Premium Income ETF',
  ULTI: 'REX IncomeMax Option Strategy ETF',
  QQQY: 'Defiance Nasdaq 100 Enhanced Options & 0DTE Income ETF'
};
for (const e of ETFS) {
  if (NAME_FIX[e.sym]) e.name = NAME_FIX[e.sym];
  else if (e.name.toUpperCase().startsWith(e.sym + ' ')) e.name = e.name.slice(e.sym.length + 1);
  e.slug = e.sym.toLowerCase();
  e.png = `${e.slug}-etf.png`; e.wide = `${e.slug}-etf-wide.png`;
  e.page = `/etf-images/${e.slug}`;
  e.fundPage = fs.existsSync(path.join(ROOT, `${e.slug}-monthly-dividend.html`)) ? `/${e.slug}-monthly-dividend.html` : '/all-monthly-dividend-etfs.html';
}

// ---------- render ----------
const fontDir = path.join(ROOT, 'node_modules/@fontsource/lato/files');
const font = w => fs.readFileSync(path.join(fontDir, `lato-latin-${w}-normal.woff`));
const FONTS = [{ name: 'Lato', data: font(900), weight: 900, style: 'normal' }, { name: 'Lato', data: font(700), weight: 700, style: 'normal' }];
const h = (type, style, children) => ({ type, props: { style, children } });
async function render(sym, name, w, hgt) {
  const sq = w === hgt;
  // approximate Lato Black advance widths (em) so wide letters like M and W never overflow
  const cw = c => 'MW'.includes(c) ? 0.98 : 'I.'.includes(c) ? 0.34 : /[0-9]/.test(c) ? 0.62 : 'J'.includes(c) ? 0.5 : 'OQGCD'.includes(c) ? 0.78 : 0.7;
  const em = [...sym].reduce((a, c) => a + cw(c), 0) + sym.length * 0.02;
  const tk = Math.floor(Math.min(sq ? 190 : 230, (sq ? 500 : 980) / em));
  const el = h('div', {
    width: w, height: hgt, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    backgroundImage: 'linear-gradient(135deg, #30776C 0%, #276459 55%, #1d4d46 100%)', color: '#fff', fontFamily: 'Lato', padding: sq ? '40px' : '50px 80px'
  }, [
    h('div', { fontSize: tk, fontWeight: 900, letterSpacing: '0.02em', lineHeight: 1 }, sym),
    h('div', { marginTop: sq ? 26 : 30, fontSize: sq ? 34 : 40, fontWeight: 700, textAlign: 'center', lineHeight: 1.25, color: '#e3f1ee', maxWidth: sq ? 500 : 1000, display: 'flex', justifyContent: 'center' }, name)
  ]);
  const svg = await satori(el, { width: w, height: hgt, fonts: FONTS });
  return new Resvg(svg, { fitTo: { mode: 'width', value: w } }).render().asPng();
}

fs.mkdirSync(OUT, { recursive: true });
const manPath = path.join(OUT, 'manifest.json');
const manifest = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : { version: VERSION, images: {} };
if (manifest.version !== VERSION) { manifest.images = {}; manifest.version = VERSION; }
let made = 0;
for (const e of ETFS) {
  const fresh = manifest.images[e.sym] === e.name && fs.existsSync(path.join(OUT, e.png)) && fs.existsSync(path.join(OUT, e.wide));
  if (fresh) continue;
  fs.writeFileSync(path.join(OUT, e.png), await render(e.sym, e.name, 600, 600));
  fs.writeFileSync(path.join(OUT, e.wide), await render(e.sym, e.name, 1200, 630));
  manifest.images[e.sym] = e.name; made++;
}
// keep images for ETFs that leave the sheet (evergreen URLs other sites may use), but list only current ones
fs.writeFileSync(manPath, JSON.stringify(manifest, null, 1));

// ---------- pages ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const BANNER = `<div class="banner">
    <a href="https://lsfunds.com/etfs/ovl" target="_blank" rel="sponsored noopener noreferrer">
        <img src="https://raw.githubusercontent.com/benjiesiegel1414/topdividendetfs-site/main/OVL%20new%20display%20ad%202.png" alt="Liquid Strategies OVL ETF" loading="lazy">
    </a>
    <small style="color:#666; font-size:0.78em; font-weight:600;">Sponsored By</small>
    <small style="color:#666; font-size:0.78em; font-weight:400; text-align:center; max-width:100%; overflow-wrap:anywhere;">Read carefully before investing. Prospectus: <a href="https://lsfunds.com/hubfs/Regulatory/Prospectus.pdf?hsLang=en" target="_blank" rel="noopener noreferrer" style="color:#666 !important; font-family:inherit !important; font-size:inherit !important; font-weight:400 !important; text-shadow:none !important; background:none !important; letter-spacing:normal; text-decoration:underline !important;">https://lsfunds.com/hubfs/Regulatory/Prospectus.pdf?hsLang=en</a></small>
</div>`;
const BANNER2 = `<div class="banner">
    <a href="https://lsfunds.com/etfs/ovl" target="_blank" rel="sponsored noopener noreferrer">
        <img src="https://raw.githubusercontent.com/benjiesiegel1414/topdividendetfs-site/main/OVL%20new%20display%20ad%202.png" alt="Liquid Strategies OVL ETF" loading="lazy">
    </a>
    <small style="color:#666; font-size:0.78em; font-weight:600;">Sponsored By</small>
    <small style="color:#666; font-size:0.78em; font-weight:400; text-align:center; max-width:100%; overflow-wrap:anywhere;">Read carefully before investing. Prospectus: <a href="https://lsfunds.com/hubfs/Regulatory/Prospectus.pdf?hsLang=en" target="_blank" rel="noopener noreferrer" style="color:#666 !important; font-family:inherit !important; font-size:inherit !important; font-weight:400 !important; text-shadow:none !important; background:none !important; letter-spacing:normal; text-decoration:underline !important;">https://lsfunds.com/hubfs/Regulatory/Prospectus.pdf?hsLang=en</a></small>
</div>`;
const CSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{overflow-x:hidden}
body{font-family:'Lato',Arial,sans-serif;background:#EEF1F1;color:#333;display:flex;flex-direction:column;align-items:center;min-height:100vh;line-height:1.6}
header{background:#30776C;padding:15px 20px;color:#fff;text-align:center;width:100%;box-shadow:0 2px 5px rgba(0,0,0,.2);cursor:pointer}
.logo{font-size:clamp(22px,6vw,36px);font-weight:900;color:#fff}
.content{width:94%;max-width:960px;display:flex;flex-direction:column;padding-bottom:30px}
.breadcrumb{font-size:.82rem;color:#666;padding:12px 0 4px}.breadcrumb a{color:#1d4d46;text-decoration:none;font-weight:700}.breadcrumb span{margin:0 5px;color:#aaa}
h1{color:#30776C;font-size:clamp(1.5rem,4vw,2.2rem);font-weight:900;margin:14px 0 6px}
h2{color:#30776C;font-size:1.25rem;font-weight:900;margin:28px 0 8px}
p{margin:0 0 12px}
a{color:#1d4d46;font-weight:700}
.lead{color:#555}
.banner{width:100%;max-width:1000px;margin:15px auto;display:flex;flex-direction:column;align-items:center;gap:6px}
.banner img{display:block;width:auto;height:auto;max-width:100%}
.hero-img{display:block;width:100%;max-width:600px;height:auto;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.18);margin:14px auto}
.btns{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:10px 0 6px}
.btn{display:inline-block;background:#30776C;color:#fff !important;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:900}
.btn.alt{background:#fff;color:#30776C !important;border:2px solid #30776C}
.box{background:#fff;border:2px solid #cfe1dd;border-radius:10px;padding:16px 20px;margin:14px 0}
.box code{background:#eef5f3;padding:2px 6px;border-radius:4px;font-size:.88em;word-break:break-all}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin:14px 0}
.grid a{display:block;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.08);text-decoration:none;color:#30776C}
.grid img{display:block;width:100%;height:auto}
.grid span{display:block;padding:6px 8px;font-size:.8rem;font-weight:900;text-align:center}
.pn{display:flex;justify-content:space-between;gap:10px;margin:18px 0}
.pn a{background:#fff;border:2px solid #cfe1dd;border-radius:8px;padding:10px 14px;text-decoration:none}
.disc{font-size:.8rem;color:#777;border-left:4px solid #ccc;background:#fff;padding:12px 16px;margin:20px 0}
footer{font-size:.9em;color:#666;margin:10px auto;padding-top:10px;border-top:1px solid #ddd;max-width:960px;width:94%;text-align:center}
footer a{color:#30776C;text-decoration:none}`;
const FOOT = `<footer><p><a href="/">MonthlyETFs.com</a> · <a href="/etf-images/">Monthly ETF Ticker Images</a> · <a href="/all-monthly-dividend-etfs.html">All Monthly ETFs</a> · <a href="/blog.html">Blog</a></p><p style="margin-top:6px">Contact: <a href="mailto:Business@TopDividendETFs.com">Business@TopDividendETFs.com</a></p></footer>`;
const LICENSE_TXT = 'Free to use on websites, blogs, social media posts and videos. Please credit MonthlyETFs.com with a link when you can.';
function shell({ title, desc, canonical, ogImage, schema, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogImage}">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-0KJ1FQ12N4"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-0KJ1FQ12N4');</script>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<header onclick="location.href='/'"><div class="logo">MonthlyETFs.com</div></header>
<div class="content">
${BANNER}
${body}
${BANNER2}
</div>
${FOOT}
</body>
</html>
`;
}
const imageObj = e => ({
  '@type': 'ImageObject',
  contentUrl: `${SITE}/etf-images/${e.png}`,
  url: `${SITE}/etf-images/${e.png}`,
  name: `${e.sym} ETF logo and ticker symbol image`,
  caption: `${e.sym}: ${e.name}`,
  description: `${e.sym} ETF logo and ticker symbol image for the ${e.name}.`,
  width: 600, height: 600, encodingFormat: 'image/png',
  creditText: 'MonthlyETFs.com',
  creator: { '@type': 'Organization', name: 'MonthlyETFs.com', url: SITE },
  copyrightNotice: 'MonthlyETFs.com',
  license: `${SITE}/etf-images/#license`,
  acquireLicensePage: `${SITE}/etf-images/#license`
});

for (let i = 0; i < ETFS.length; i++) {
  const e = ETFS[i], prev = ETFS[(i - 1 + ETFS.length) % ETFS.length], next = ETFS[(i + 1) % ETFS.length];
  const body = `
<nav class="breadcrumb"><a href="/">Home</a><span>›</span><a href="/etf-images/">Monthly ETF Ticker Images</a><span>›</span>${e.sym}</nav>
<h1>${e.sym} ETF Logo &amp; Ticker Symbol Image</h1>
<p class="lead">Logo-style ticker symbol image for the <strong>${esc(e.name)}</strong> (${e.sym}). Clean, evergreen and free to use. Need a ${e.sym} ETF logo for a post, article or video? Download it below.</p>
<img class="hero-img" src="/etf-images/${e.png}" alt="${e.sym} ETF logo and ticker symbol, ${esc(e.name)}" width="600" height="600">
<div class="btns">
  <a class="btn" href="/etf-images/${e.png}" download>Download square (600×600)</a>
  <a class="btn alt" href="/etf-images/${e.wide}" download>Download wide (1200×630)</a>
</div>
<div class="box" id="use">
  <p><strong>Free to use.</strong> ${LICENSE_TXT}</p>
  <p>Direct image link: <code>${SITE}/etf-images/${e.png}</code></p>
</div>
<h2>About ${e.sym}</h2>
${`<p>${e.sym} is the ticker symbol for the ${esc(e.name)}, a monthly paying ETF. See its yield, assets and price decay on <a href="${e.fundPage}">MonthlyETFs.com</a>.</p>`}
<div class="pn"><a href="${prev.page}">← ${prev.sym}</a><a href="/etf-images/">All ticker images</a><a href="${next.page}">${next.sym} →</a></div>
<p class="disc">These are ticker symbol graphics, not the issuers' official fund logos. Ticker symbols and fund names belong to their respective issuers. MonthlyETFs.com is not affiliated with ${esc(e.name)}'s issuer. Images are provided for identification and educational use only and are not investment advice.</p>`;
  fs.writeFileSync(path.join(OUT, `${e.slug}.html`), shell({
    title: `${e.sym} ETF Logo & Ticker Image (Free PNG) | ${e.name} | MonthlyETFs`,
    desc: `Free ${e.sym} ETF logo and ticker symbol image for the ${e.name}. Download a 600×600 square or 1200×630 wide PNG for posts, articles and videos.`,
    canonical: `${SITE}${e.page}`,
    ogImage: `${SITE}/etf-images/${e.wide}`,
    schema: { '@context': 'https://schema.org', ...imageObj(e) },
    body
  }));
}

const galleryBody = `
<nav class="breadcrumb"><a href="/">Home</a><span>›</span>Monthly ETF Ticker Images</nav>
<h1>Monthly ETF Logos &amp; Ticker Symbol Images</h1>
<p class="lead">Clean, evergreen ticker images for ${ETFS.length} monthly paying ETFs. Tap any image for a download page with square and wide versions.</p>
<div class="grid">
${ETFS.map(e => `<a href="${e.page}"><img src="/etf-images/${e.png}" alt="${e.sym} ETF logo and ticker symbol, ${esc(e.name)}" width="600" height="600" loading="lazy"><span>${e.sym}</span></a>`).join('\n')}
</div>
<div class="box" id="license">
  <h2 style="margin-top:0">Free to use</h2>
  <p>${LICENSE_TXT}</p>
  <p>Every image has a permanent address: <code>${SITE}/etf-images/[ticker]-etf.png</code> for the square version and <code>${SITE}/etf-images/[ticker]-etf-wide.png</code> for the wide version, for example <code>${SITE}/etf-images/qqqi-etf.png</code>.</p>
</div>
<p class="disc">These are ticker symbol graphics, not the issuers' official fund logos. Ticker symbols and fund names belong to their respective issuers. MonthlyETFs.com is not affiliated with any issuer shown. Images are provided for identification and educational use only and are not investment advice.</p>`;
fs.writeFileSync(path.join(OUT, 'index.html'), shell({
  title: `Monthly ETF Logos & Ticker Symbol Images: ${ETFS.length} Free Monthly ETF PNGs | MonthlyETFs`,
  desc: `Free, evergreen ETF logo and ticker symbol images for ${ETFS.length} monthly paying ETFs including JEPI, QQQI, SPYI and more. Square and wide PNGs for posts, articles and videos.`,
  canonical: `${SITE}/etf-images/`,
  ogImage: `${SITE}/etf-images/${(ETFS.find(e => e.sym === 'QQQI') || ETFS[0]).wide}`,
  schema: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Monthly ETF Ticker Symbol Images', url: `${SITE}/etf-images/`, hasPart: ETFS.slice(0, 50).map(imageObj) },
  body: galleryBody
}));

const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const urls = [
  `  <url><loc>${SITE}/etf-images/</loc>${ETFS.map(e => `<image:image><image:loc>${SITE}/etf-images/${e.png}</image:loc></image:image>`).slice(0, 1000).join('')}</url>`,
  ...ETFS.map(e => `  <url><loc>${SITE}${e.page}</loc><image:image><image:loc>${SITE}/etf-images/${e.png}</image:loc></image:image><image:image><image:loc>${SITE}/etf-images/${e.wide}</image:loc></image:image></url>`)
];
fs.writeFileSync(path.join(OUT, 'image-sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>
`);
console.log(`ETF images: ${ETFS.length} tickers, ${made} rendered, pages + image sitemap written.`);
