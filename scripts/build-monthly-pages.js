#!/usr/bin/env node
/**
 * MonthlyETFs.com — Programmatic Page Builder
 * ------------------------------------------------------------------
 * Generates one static page per ETF from the live Google Sheets CSV:
 *   /[ticker]-monthly-dividend.html
 *
 * Plus:
 *   /all-monthly-dividend-etfs.html   (crawl hub — links to every page)
 *   /sitemap.xml                      (regenerated each run)
 *
 * Every number on every generated page is DERIVED FROM THE SHEET.
 * Nothing is invented. If a fund has no usable yield, it is skipped.
 *
 * Usage:
 *   node scripts/build-monthly-pages.js              # build the batch limit
 *   MAX_PAGES=25 node scripts/build-monthly-pages.js # explicit batch size
 *   MAX_PAGES=0  node scripts/build-monthly-pages.js # build everything
 */

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSscSF78pEGxi9Lcx2YHZjHHAkyy75b5Icb6A8nK2aehtmEq-xgpFPA7sQdkmZYKjkUdrtPL1SdMm62/pub?output=csv';
const SITE = 'https://monthlyetfs.com';
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, '..');
const LOGO = 'https://raw.githubusercontent.com/benjiesiegel1414/monthlyetfs/main/monthly2-croppedd.png';
const OG_IMAGE = `${SITE}/month1222.jpg`;
const GA4 = 'G-0KJ1FQ12N4';
const ADSENSE = 'ca-pub-9929351005136304';

// Batch control. Ships the highest-AUM funds first (highest search volume).
// Set to 0 to build every fund in the sheet.
const MAX_PAGES = process.env.MAX_PAGES !== undefined ? parseInt(process.env.MAX_PAGES, 10) : 25;

const TODAY = new Date().toISOString().slice(0, 10);
const TODAY_LONG = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const jsonEsc = s => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');

const slug = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const money = n => '$' + Math.round(n).toLocaleString('en-US');

/** Proper CSV line parser — handles quoted fields containing commas. */
function parseCsvLine(line) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

/** "14.62%" -> 14.62 ; returns null when unusable. */
function parseYield(raw) {
  if (!raw) return null;
  const n = parseFloat(String(raw).replace(/[%,$\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "$13.1B" / "1.2M" / "950,000" -> number of dollars. */
function parseAum(raw) {
  if (!raw) return null;
  const s = String(raw).replace(/[$,\s]/g, '').toUpperCase();
  const m = s.match(/^([\d.]+)\s*([BMK])?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const mult = { B: 1e9, M: 1e6, K: 1e3 }[m[2]] || 1;
  return n * mult;
}

function fmtAum(n) {
  if (n == null) return 'N/A';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2).replace(/\.00$/, '') + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + Math.round(n);
}

/** Light category inference from the fund name. Used for internal linking only. */
function categorize(name) {
  const n = String(name).toLowerCase();
  if (/covered call|buy-?write|premium income|high income|option/.test(n)) return 'Covered Call / Options Income';
  if (/reit|real estate|mortgage/.test(n)) return 'Real Estate / REIT';
  if (/bond|treasury|aggregate|credit|loan|income fund|municipal|corporate/.test(n)) return 'Bond / Fixed Income';
  if (/preferred/.test(n)) return 'Preferred Shares';
  if (/dividend|equity income/.test(n)) return 'Dividend Equity';
  if (/bitcoin|crypto|ether/.test(n)) return 'Crypto-Linked Income';
  return 'Monthly Income ETF';
}

function yieldTier(y) {
  if (y < 5) return { label: 'Conservative', note: 'a modest payout that generally signals a more stable underlying strategy' };
  if (y < 10) return { label: 'Moderate High Yield', note: 'a meaningful payout that is still within the range many diversified income funds sustain' };
  if (y < 25) return { label: 'High Yield', note: 'a payout that typically requires an options overlay or leverage to produce' };
  if (y < 50) return { label: 'Ultra High Yield', note: 'a payout level where distribution sustainability and NAV erosion deserve close scrutiny' };
  return { label: 'Extreme Yield', note: 'a payout level almost always tied to single-stock or highly leveraged option strategies, where price decay risk is greatest' };
}

const INCOME_TARGETS = [100, 250, 500, 1000, 2500, 5000];

// ─────────────────────────────────────────────────────────────
// SHARED MARKUP
// ─────────────────────────────────────────────────────────────
const NETWORK_BAR = `
<div class="site-network-bar">
  <div class="site-network-track">
    <span class="site-network-label">Our Sites:</span>
    <a href="https://topdividendetfs.com/" class="site-pill">💵 TopDividendETFs.com</a>
    <a href="https://weeklyetfs.com/" class="site-pill">📅 WeeklyETFs.com</a>
    <span class="site-pill current">🗓️ MonthlyETFs.com</span>
    <a href="https://growthetfs.com/" class="site-pill">📈 GrowthETFs.com</a>
    <a href="https://topspaceetfs.com/" class="site-pill">🚀 TopSpaceETFs.com</a>
    <a href="https://etftotalreturns.com/" class="site-pill">📊 ETFTotalReturns.com</a>
    <a href="https://topdividendtools.com/" class="site-pill">🛠️ TopDividendTools.com</a>
  </div>
</div>`;

const FOOTER = `
<footer class="footer">
  <p>
    <a href="/terms.html">Terms of Use</a> |
    <a href="/privacy.html">Privacy Policy</a> |
    <a href="/faq.html">FAQ</a> |
    <a href="/blog.html">Blog</a> |
    <a href="/all-monthly-dividend-etfs.html">All ETFs</a> |
    <a href="https://topdividendetfs.com/" target="_blank" rel="noopener">Top Dividend ETFs</a><br><br>
    <a href="https://topdividendtools.com/" target="_blank" rel="noopener">Top Dividend Tools 🛠️</a><br><br>
    <a href="/advertise" target="_blank" rel="noopener">Advertise</a><br><br>
    Contact email: <a href="mailto:Business@TopDividendETFs.com">Business@TopDividendETFs.com</a>
  </p>
  <div class="tagline">
    <a href="https://dividendempire2000.gumroad.com/l/DividendTracker?layout=profile" target="_blank" rel="noopener"
       style="display:inline-block;background:#30776C;color:#fff !important;font-weight:900;font-size:.78em;padding:5px 12px;border-radius:5px;text-decoration:none;margin:20px 0;box-shadow:0 2px 6px rgba(0,0,0,.15)">
       Best Monthly Dividend Tracker!
    </a>
  </div>
  <p style="font-size:.85em;color:#777;margin-top:12px">© ${new Date().getFullYear()} MonthlyETFs.com. For entertainment purposes only. Not financial advice.</p>
</footer>`;

const STYLES = `
html{font-size:17.6px}
@media(min-width:1024px){html{font-size:18.2px}}
html,body{margin:0;padding:0;overflow-x:hidden !important;width:100%}
:root{--primary:#30776C;--light:#EEF1F1;--mid:#9BBCB6;--accent:#62A196;--warn:#c62828}
body{font-family:'Lato',Arial,sans-serif;background:var(--light);color:#333;display:flex;flex-direction:column;align-items:center;min-height:100vh;line-height:1.65}
header{background:var(--primary);text-align:center;width:100%;box-shadow:0 2px 5px rgba(0,0,0,.3);background-image:url('https://www.transparenttextures.com/patterns/noise.png');background-blend-mode:overlay;cursor:pointer;position:sticky;top:0;z-index:10}
.banner-img{max-width:100%;height:auto;display:block;margin:0 auto}
@media(min-width:768px){.banner-img{max-width:484px}}
@media(max-width:767px){.banner-img{max-width:90%;padding:10px 0}header{padding:10px 0}}
.content{width:95%;max-width:1150px;margin:0 auto;display:flex;flex-direction:column;align-items:center}
.site-network-bar{width:100%;background:#fff;border-bottom:1px solid #ddd;padding:6px 0}
.site-network-track{max-width:1150px;margin:0 auto;padding:0 15px;display:flex;align-items:center;gap:6px;overflow-x:auto;white-space:nowrap;scrollbar-width:none}
.site-network-track::-webkit-scrollbar{display:none}
.site-network-label{font-size:.51em;text-transform:uppercase;letter-spacing:.5px;color:#999;font-weight:900;flex-shrink:0}
.site-pill{display:inline-flex;align-items:center;gap:4px;padding:4px 9px;border-radius:999px;border:1px solid var(--primary);background:#fff;color:var(--primary);font-size:.6em;font-weight:700;text-decoration:none;flex-shrink:0}
.site-pill:hover{background:var(--primary);color:#fff}
.site-pill.current{background:var(--primary);color:#fff}
@media(min-width:1150px){.site-network-track{justify-content:center}}
.breadcrumb{width:100%;max-width:880px;margin:18px auto 0;padding:0 16px;font-size:.72em;color:#777;box-sizing:border-box}
.breadcrumb a{color:var(--primary);text-decoration:none;font-weight:700}
main{width:100%;max-width:880px;margin:0 auto;padding:0 16px 10px;box-sizing:border-box}
h1{font-size:1.8em;line-height:1.25;color:var(--primary);font-weight:900;margin:14px 0 8px;letter-spacing:-.3px}
.byline{font-size:.74em;color:#777;font-weight:700;margin:0 0 6px}
.lede{font-size:1.04em;color:#222;font-weight:700;margin:14px 0 22px}
h2{font-size:1.35em;color:var(--primary);font-weight:900;margin:36px 0 12px;border-bottom:3px solid var(--mid);padding-bottom:8px}
h3{font-size:1.06em;color:#1f4f48;font-weight:900;margin:24px 0 8px}
p{margin:0 0 15px}
ul{margin:0 0 18px;padding-left:22px}li{margin-bottom:7px}
a{color:var(--primary);font-weight:700}
strong{font-weight:900;color:#111}
.keyfacts{background:#fff;border:3px solid var(--primary);border-radius:9px;box-shadow:0 4px 16px rgba(0,0,0,.14);padding:18px 20px;margin:8px 0 26px}
.keyfacts h2{margin:0 0 12px;font-size:1em;border:none;padding:0;text-transform:uppercase;letter-spacing:.5px}
.kf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px}
.kf-item{background:var(--light);border-radius:7px;padding:10px 12px}
.kf-label{display:block;font-size:.64em;text-transform:uppercase;letter-spacing:.6px;color:#666;font-weight:900}
.kf-value{display:block;font-size:1.08em;font-weight:900;color:var(--primary)}
.tablewrap{width:100%;overflow-x:auto;margin:0 0 22px}
table.data{width:100%;border-collapse:collapse;background:#fff;border:3px solid var(--primary);border-radius:9px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.18);font-size:.88em}
table.data th{background:var(--primary);color:#fff;padding:11px 8px;text-align:left;font-weight:900;white-space:nowrap}
table.data td{padding:10px 8px;border-top:1px solid #e3e8e7}
table.data tr:nth-child(even) td{background:var(--light)}
table.data tr:hover td{background:#e0f0ed}
table.data td a{text-decoration:none}
.this-row td{background:#fff8e1 !important;font-weight:900}
.callout{border-radius:8px;padding:15px 18px;margin:0 0 24px;font-size:.93em}
.callout strong:first-child{display:block;margin-bottom:5px}
.callout.tip{background:#e6f2f0;border-left:6px solid var(--primary)}
.callout.warn{background:#fff4f4;border-left:6px solid var(--warn)}
.callout.note{background:#fff8e1;border-left:6px solid #d9a441}
details.faq{background:#fff;border-radius:8px;margin-bottom:9px;box-shadow:0 2px 6px rgba(0,0,0,.08)}
details.faq summary{cursor:pointer;padding:13px 16px;font-weight:900;color:var(--primary);font-size:.95em;list-style:none}
details.faq summary::-webkit-details-marker{display:none}
details.faq summary::before{content:"+ "}
details.faq[open] summary::before{content:"– "}
details.faq .faq-body{padding:0 16px 14px;font-size:.92em}
.cta-box{background:var(--primary);color:#fff;border-radius:10px;padding:22px;text-align:center;margin:32px 0;box-shadow:0 6px 18px rgba(0,0,0,.2)}
.cta-box h3{color:#fff;margin:0 0 8px}
.cta-box p{margin:0 0 14px;font-size:.9em;opacity:.95}
.cta-btn{display:inline-block;background:#fff;color:var(--primary) !important;font-weight:900;padding:11px 24px;border-radius:7px;text-decoration:none}
.prevnext{display:flex;justify-content:space-between;gap:12px;margin:28px 0;flex-wrap:wrap}
.prevnext a{background:#fff;border:2px solid var(--mid);border-radius:8px;padding:12px 16px;text-decoration:none;flex:1;min-width:200px;box-shadow:0 2px 6px rgba(0,0,0,.07)}
.prevnext a:hover{border-color:var(--primary)}
.prevnext span{display:block;font-size:.66em;text-transform:uppercase;letter-spacing:.6px;color:#888;font-weight:900}
.prevnext b{color:var(--primary);font-size:.95em}
.disclaimer{font-size:.8em;color:#666;margin:26px auto;line-height:1.55;background:#fff;border-radius:8px;padding:16px 18px;border:1px solid #ddd}
.footer{margin-top:40px;padding:25px;background:#fff;width:100%;text-align:center;font-size:.9em;color:#555;border-top:1px solid #ddd}
.footer a{color:var(--primary);text-decoration:none;margin:0 10px;font-weight:700}
.tagline{margin:16px 0}
.badge{display:inline-block;font-size:.68em;font-weight:900;text-transform:uppercase;letter-spacing:.5px;padding:4px 11px;border-radius:100px;margin-right:6px}
.badge-ok{background:#e3f5e9;color:#1b7a3d;border:1px solid #9fd7b4}
.badge-bad{background:#fdeaea;color:var(--warn);border:1px solid #f0b4b4}
.badge-tier{background:rgba(48,119,108,.1);color:var(--primary);border:1px solid var(--mid)}
`;

function head({ title, desc, canonical, extraJsonLd }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<meta name="theme-color" content="#ffffff">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="MonthlyETFs.com">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${OG_IMAGE}">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE}" crossorigin="anonymous"></script>
<meta name="google-site-verification" content="XmPDmAe5OeTWMAVQVs3PENLebSFlRYF-04j1-QogGLU">
<meta name="msvalidate.01" content="C66A48BDFAA2F813D992F39A8BBB3EF1">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4}');</script>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet">
<style>${STYLES}</style>
${extraJsonLd || ''}
</head>
<body>
<div class="content">
<header onclick="location.href='/'">
  <img src="${LOGO}" alt="MonthlyETFs.com Logo" class="banner-img">
</header>
${NETWORK_BAR}`;
}

// ─────────────────────────────────────────────────────────────
// TICKER PAGE
// ─────────────────────────────────────────────────────────────
function buildTickerPage(f, all, idx) {
  const t = f.symbol;
  const url = `${SITE}/${slug(t)}-monthly-dividend.html`;
  const tier = yieldTier(f.yield);
  const decayYes = /^y/i.test(f.decay || '');
  const decayKnown = /^(y|n)/i.test(f.decay || '');

  // Peers: 5 nearest by yield (excluding self)
  const peers = all
    .filter(x => x.symbol !== t)
    .map(x => ({ ...x, dist: Math.abs(x.yield - f.yield) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 5)
    .sort((a, b) => b.yield - a.yield);

  const prev = all[idx - 1];
  const next = all[idx + 1];
  const pct = Math.round((1 - idx / all.length) * 100);

  const incomeRows = INCOME_TARGETS.map(m => {
    const annual = m * 12;
    const capital = annual / (f.yield / 100);
    return `<tr><td><strong>${money(m)} / month</strong></td><td>${money(annual)}</td><td>${money(capital)}</td></tr>`;
  }).join('\n');

  const peerRows = peers.map(p =>
    `<tr><td><a href="/${slug(p.symbol)}-monthly-dividend.html"><strong>$${esc(p.symbol)}</strong></a></td><td>${esc(p.name)}</td><td>${p.yield.toFixed(2)}%</td><td>${/^y/i.test(p.decay || '') ? '<span class="badge badge-bad">Yes</span>' : '<span class="badge badge-ok">No</span>'}</td></tr>`
  ).join('\n');

  const decayCopy = !decayKnown
    ? `<p>Price decay data for $${esc(t)} is not currently flagged in our dataset. Price decay measures whether an ETF's share price has fallen below its inception price — it is a share-price-only measure and does not account for distributions received.</p>`
    : decayYes
      ? `<p><strong>$${esc(t)} is currently flagged with price decay.</strong> That means its share price sits below where it started at inception. For a high-yield fund this is the pattern worth understanding closely: some of the cash you receive each month may effectively be your own principal being returned rather than income generated on top of a stable asset base.</p>
         <p>Price decay is not automatically disqualifying. What matters is <em>total return</em> — price change plus every distribution reinvested. A fund can decay 8% in price while paying 20% and still leave you ahead. It can also decay 30% while paying 20% and leave you well behind. The decay flag tells you to check that math, not to skip the fund.</p>`
      : `<p><strong>$${esc(t)} is not currently flagged for price decay.</strong> Its share price is at or above its inception level, meaning the distributions paid have not come at the cost of a shrinking share price. Among ${tier.label.toLowerCase()} funds this is the more favorable configuration, since the payout has been funded without eroding the underlying asset base.</p>
         <p>This is a point-in-time measurement of share price versus inception price only. It does not guarantee future behavior, and it does not by itself tell you the fund's total return.</p>`;

  const faqs = [
    {
      q: `How much do I need to invest in $${t} to make $1,000 a month?`,
      a: `At a ${f.yield.toFixed(2)}% distribution rate, generating $1,000 per month ($12,000 per year) from $${t} would require approximately ${money(12000 / (f.yield / 100))} invested. This is a straight yield calculation using the current rate — actual monthly amounts vary, and the distribution rate itself changes over time.`
    },
    {
      q: `Does $${t} pay dividends monthly?`,
      a: `Yes. $${t} appears in the MonthlyETFs.com database of monthly-paying funds, meaning it distributes income on a monthly rather than quarterly schedule. Exact payment amounts and ex-dividend dates are set by the fund issuer and vary period to period.`
    },
    {
      q: `What is $${t}'s dividend yield?`,
      a: `$${t} currently shows a distribution rate of ${f.yield.toFixed(2)}%, which places it in the ${tier.label} tier and ranks it #${idx + 1} out of ${all.length} monthly-paying ETFs we track. Distribution rates are not guaranteed and move with the fund's underlying strategy and market conditions.`
    },
    {
      q: `Does $${t} have price decay?`,
      a: decayKnown
        ? (decayYes
          ? `Yes. $${t} is currently flagged for price decay, meaning its share price is below its inception price. Price decay measures share price only and does not account for the distributions you have received along the way — check total return before drawing conclusions.`
          : `No. $${t} is not currently flagged for price decay — its share price is at or above its inception level. This measures share price only and is a point-in-time reading, not a guarantee about future price behavior.`)
        : `Price decay data for $${t} is not currently flagged in our dataset. Price decay compares an ETF's current share price to its inception price and is a share-price-only measure.`
    },
    {
      q: `Is $${t} a good investment?`,
      a: `MonthlyETFs.com does not give buy or sell signals. What we can tell you is where $${t} sits on the data: a ${f.yield.toFixed(2)}% distribution rate, ${f.aum != null ? fmtAum(f.aum) + ' in assets' : 'assets not currently reported in our dataset'}, ${decayKnown ? (decayYes ? 'and a price decay flag' : 'and no price decay flag') : 'and no price decay flag on file'}. Whether that fits your situation depends on your income needs, tax situation, and risk tolerance. Consult a licensed financial advisor.`
    }
  ];

  const faqHtml = faqs.map(x =>
    `<details class="faq"><summary>${esc(x.q)}</summary><div class="faq-body"><p>${esc(x.a)}</p></div></details>`
  ).join('\n');

  const jsonLd = `<script type="application/ld+json">
{
 "@context":"https://schema.org",
 "@graph":[
  {"@type":"BreadcrumbList","itemListElement":[
    {"@type":"ListItem","position":1,"name":"MonthlyETFs.com","item":"${SITE}/"},
    {"@type":"ListItem","position":2,"name":"All Monthly Dividend ETFs","item":"${SITE}/all-monthly-dividend-etfs.html"},
    {"@type":"ListItem","position":3,"name":"${jsonEsc(t)} Monthly Dividend","item":"${url}"}
  ]},
  {"@type":"WebPage","name":"${jsonEsc(t)} Monthly Dividend: Yield, Income Calculator & Price Decay",
   "url":"${url}","datePublished":"${TODAY}","dateModified":"${TODAY}",
   "description":"${jsonEsc(`${t} monthly dividend data: ${f.yield.toFixed(2)}% distribution rate, income calculator, price decay status and peer comparison.`)}",
   "publisher":{"@type":"Organization","name":"MonthlyETFs.com","url":"${SITE}/"}},
  {"@type":"FAQPage","mainEntity":[
   ${faqs.map(x => `{"@type":"Question","name":"${jsonEsc(x.q)}","acceptedAnswer":{"@type":"Answer","text":"${jsonEsc(x.a)}"}}`).join(',\n   ')}
  ]}
 ]
}
</script>`;

  const title = `$${t} Monthly Dividend 2026: ${f.yield.toFixed(2)}% Yield, Income Calculator & Price Decay`;
  const desc = `${t} monthly dividend data — ${f.yield.toFixed(2)}% distribution rate, ranked #${idx + 1} of ${all.length} monthly payers. See how much you need to invest for $1,000/month, price decay status, and the closest alternatives.`;

  return `${head({ title: title.replace(/^\$/, ''), desc, canonical: url, extraJsonLd: jsonLd })}

<nav class="breadcrumb"><a href="/">Home</a> › <a href="/all-monthly-dividend-etfs.html">All Monthly ETFs</a> › $${esc(t)}</nav>

<main>
<h1>$${esc(t)} Monthly Dividend: ${f.yield.toFixed(2)}% Yield, Income Calculator &amp; Price Decay</h1>
<p class="byline">Data updated ${TODAY_LONG} · MonthlyETFs.com</p>

<p class="lede">$${esc(t)} — ${esc(f.name)} — currently shows a <strong>${f.yield.toFixed(2)}% distribution rate</strong> and pays monthly. That ranks it <strong>#${idx + 1} out of ${all.length}</strong> monthly-paying ETFs in our database. Below: exactly how much capital it takes to hit your income target, where $${esc(t)} sits against its closest peers, and whether it carries a price decay flag.</p>

<div class="keyfacts">
  <h2>$${esc(t)} At a Glance</h2>
  <div class="kf-grid">
    <div class="kf-item"><span class="kf-label">Ticker</span><span class="kf-value">$${esc(t)}</span></div>
    <div class="kf-item"><span class="kf-label">Distribution Rate</span><span class="kf-value">${f.yield.toFixed(2)}%</span></div>
    <div class="kf-item"><span class="kf-label">Pay Frequency</span><span class="kf-value">Monthly</span></div>
    <div class="kf-item"><span class="kf-label">Assets (AUM)</span><span class="kf-value">${fmtAum(f.aum)}</span></div>
    <div class="kf-item"><span class="kf-label">Price Decay</span><span class="kf-value">${decayKnown ? (decayYes ? 'Yes' : 'No') : 'N/A'}</span></div>
    <div class="kf-item"><span class="kf-label">Yield Rank</span><span class="kf-value">#${idx + 1} of ${all.length}</span></div>
    <div class="kf-item"><span class="kf-label">Yield Tier</span><span class="kf-value" style="font-size:.85em">${tier.label}</span></div>
    <div class="kf-item"><span class="kf-label">Category</span><span class="kf-value" style="font-size:.8em">${esc(f.category)}</span></div>
  </div>
</div>

<p>
  ${decayKnown ? (decayYes ? '<span class="badge badge-bad">⚠ Price Decay: Yes</span>' : '<span class="badge badge-ok">✓ No Price Decay</span>') : ''}
  <span class="badge badge-tier">${esc(tier.label)}</span>
  <span class="badge badge-tier">Top ${pct}% by yield</span>
</p>

<h2>How Much $${esc(t)} Do You Need for Monthly Income?</h2>

<p>This is the calculation most people actually want. At $${esc(t)}'s current <strong>${f.yield.toFixed(2)}%</strong> distribution rate, here is the capital required to hit common monthly income targets:</p>

<div class="tablewrap">
<table class="data">
  <thead><tr><th>Monthly Income Goal</th><th>Annual Income</th><th>Capital Required in $${esc(t)}</th></tr></thead>
  <tbody>
${incomeRows}
  </tbody>
</table>
</div>

<div class="callout warn">
  <strong>Read this before you use those numbers</strong>
  These figures assume the current ${f.yield.toFixed(2)}% distribution rate holds steady. It will not. Monthly distributions from income ETFs move with the underlying strategy — option premium, interest rates, and market volatility all feed into the payout. Treat this table as a sizing exercise, not a guaranteed income schedule. All figures are pre-tax.
</div>

<h2>Where $${esc(t)} Ranks Among Monthly Dividend ETFs</h2>

<p>$${esc(t)}'s ${f.yield.toFixed(2)}% distribution rate places it in the <strong>${esc(tier.label)}</strong> tier — ${esc(tier.note)}. It sits at <strong>#${idx + 1} of ${all.length}</strong> funds by yield, putting it in the top ${pct}% of monthly payers we track.</p>

<p>Yield rank alone is a weak signal. A fund at the very top of the list is usually there because it is running an aggressive single-stock option strategy, not because it is a better fund. Rank is useful for finding candidates, not for choosing between them.</p>

<h3>Closest peers by yield</h3>

<div class="tablewrap">
<table class="data">
  <thead><tr><th>Ticker</th><th>Fund Name</th><th>Yield</th><th>Price Decay</th></tr></thead>
  <tbody>
${peerRows}
    <tr class="this-row"><td>$${esc(t)}</td><td>${esc(f.name)}</td><td>${f.yield.toFixed(2)}%</td><td>${decayKnown ? (decayYes ? 'Yes' : 'No') : 'N/A'}</td></tr>
  </tbody>
</table>
</div>

<h2>$${esc(t)} Price Decay Analysis</h2>
${decayCopy}

<div class="callout tip">
  <strong>The one check that matters most</strong>
  Put the distribution rate next to the total return. If $${esc(t)} pays ${f.yield.toFixed(2)}% and its total return over the same period is comfortably positive, the payout is being funded by real gains. If total return badly trails the payout, you are being handed your own capital back. Run it yourself on <a href="https://etftotalreturns.com/" target="_blank" rel="noopener">ETFTotalReturns.com</a>.
</div>

<div class="cta-box">
  <h3>📊 See the Full $${esc(t)} Scorecard</h3>
  <p>Live data, complete metrics, and side-by-side comparison against every monthly payer we track.</p>
  <a href="/etf.html?symbol=${encodeURIComponent(t)}" class="cta-btn">Open the $${esc(t)} Scorecard →</a>
</div>

<h2>$${esc(t)} Monthly Dividend FAQ</h2>
${faqHtml}

<div class="prevnext">
  ${prev ? `<a href="/${slug(prev.symbol)}-monthly-dividend.html"><span>← Higher Yield</span><b>$${esc(prev.symbol)} — ${prev.yield.toFixed(2)}%</b></a>` : '<span></span>'}
  ${next ? `<a href="/${slug(next.symbol)}-monthly-dividend.html" style="text-align:right"><span>Lower Yield →</span><b>$${esc(next.symbol)} — ${next.yield.toFixed(2)}%</b></a>` : '<span></span>'}
</div>

<h2>Keep Researching</h2>
<ul>
  <li><a href="/all-monthly-dividend-etfs.html">Every monthly dividend ETF we track</a> — full index, ranked by yield</li>
  <li><a href="/">The live monthly ETF screener</a> — filter by yield range and price decay</li>
  <li><a href="/best-etfs-for-monthly-income-2026.html">Best ETFs for Monthly Income 2026</a> — every category explained</li>
  <li><a href="/qqqi-etf-dividend-guide-2026.html">$QQQI deep dive</a> and <a href="/spyi-etf-dividend-guide-2026.html">$SPYI deep dive</a> — full fund guides</li>
  <li><a href="https://weeklyetfs.com/" target="_blank" rel="noopener">Prefer weekly income?</a> — every weekly paying ETF ranked</li>
</ul>

<p class="disclaimer">
<strong>Disclaimer:</strong> MonthlyETFs.com is for entertainment and educational purposes ONLY. Nothing here is a buy or sell signal, investment advice, or tax advice. Yield, AUM and price decay figures are sourced from public data and refreshed automatically — they may be inaccurate or outdated and can change dramatically without notice. Distribution rates are not guaranteed and may be reduced or suspended at any time. Price decay reflects share price versus inception price only and does not account for distributions. Past performance does not predict future results. Investing carries risk including loss of principal. We are not financial advisors. Always verify current figures with the fund issuer and consult a licensed financial advisor before investing.
</p>

</main>
${FOOTER}
</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// HUB PAGE  (this is what makes Google actually crawl the set)
// ─────────────────────────────────────────────────────────────
function buildHubPage(built, allCount) {
  const url = `${SITE}/all-monthly-dividend-etfs.html`;
  const rows = built.map((f, i) =>
    `<tr><td>${i + 1}</td><td><a href="/${slug(f.symbol)}-monthly-dividend.html"><strong>$${esc(f.symbol)}</strong></a></td><td><a href="/${slug(f.symbol)}-monthly-dividend.html">${esc(f.name)}</a></td><td>${f.yield.toFixed(2)}%</td><td>${fmtAum(f.aum)}</td><td>${/^y/i.test(f.decay || '') ? '<span class="badge badge-bad">Yes</span>' : /^n/i.test(f.decay || '') ? '<span class="badge badge-ok">No</span>' : '—'}</td></tr>`
  ).join('\n');

  const jsonLd = `<script type="application/ld+json">
{
 "@context":"https://schema.org",
 "@graph":[
  {"@type":"BreadcrumbList","itemListElement":[
    {"@type":"ListItem","position":1,"name":"MonthlyETFs.com","item":"${SITE}/"},
    {"@type":"ListItem","position":2,"name":"All Monthly Dividend ETFs","item":"${url}"}
  ]},
  {"@type":"CollectionPage","name":"All Monthly Dividend ETFs","url":"${url}","dateModified":"${TODAY}",
   "description":"Complete index of monthly dividend ETFs with distribution rates, assets and price decay status."}
 ]
}
</script>`;

  return `${head({
    title: `All Monthly Dividend ETFs 2026 — Full List Ranked by Yield`,
    desc: `Complete index of ${built.length} monthly dividend ETFs ranked by distribution rate. Yield, assets under management, and price decay status for every monthly payer — with a full data page for each fund.`,
    canonical: url,
    extraJsonLd: jsonLd
  })}

<nav class="breadcrumb"><a href="/">Home</a> › All Monthly Dividend ETFs</nav>

<main>
<h1>All Monthly Dividend ETFs — Full List Ranked by Yield</h1>
<p class="byline">Data updated ${TODAY_LONG} · ${built.length} funds indexed</p>

<p class="lede">Every monthly-paying ETF in our database, ranked by distribution rate. Each fund has its own data page with an income calculator, peer comparison, and price decay analysis.</p>

<div class="callout tip">
  <strong>How to use this list</strong>
  Sort your thinking in this order: price decay first, then yield. A 40% yield with a decay flag is often worse than a 12% yield without one. Click any ticker for the full breakdown including how much capital it takes to reach your monthly income target.
</div>

<div class="tablewrap">
<table class="data">
  <thead><tr><th>#</th><th>Ticker</th><th>Fund Name</th><th>Yield</th><th>AUM</th><th>Price Decay</th></tr></thead>
  <tbody>
${rows}
  </tbody>
</table>
</div>

${allCount > built.length ? `<p><em>Showing ${built.length} of ${allCount} funds in our dataset. Additional fund pages are being added in batches.</em> The complete live list — including every fund not yet indexed here — is always available on <a href="/">the main screener</a>.</p>` : ''}

<div class="cta-box">
  <h3>🗓️ Use the Live Screener Instead</h3>
  <p>Filter all monthly payers by yield range and price decay in real time.</p>
  <a href="/" class="cta-btn">Open the Screener →</a>
</div>

<h2>Related Guides</h2>
<ul>
  <li><a href="/best-etfs-for-monthly-income-2026.html">Best ETFs for Monthly Income 2026</a></li>
  <li><a href="/top-10-highest-yield-monthly-etfs-2026">Top 10 Highest Yield Monthly ETFs 2026</a></li>
  <li><a href="/qqqi-etf-dividend-guide-2026.html">$QQQI ETF Dividend Guide 2026</a></li>
  <li><a href="/spyi-etf-dividend-guide-2026.html">$SPYI ETF Dividend Guide 2026</a></li>
</ul>

<p class="disclaimer">
<strong>Disclaimer:</strong> MonthlyETFs.com is for entertainment and educational purposes ONLY. Nothing here is a buy or sell signal or investment advice. Data is sourced from public sources, refreshed automatically, and may be inaccurate or outdated. Distribution rates are not guaranteed. Price decay reflects share price versus inception price only. Investing carries risk including loss of principal. We are not financial advisors.
</p>

</main>
${FOOTER}
</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// SITEMAP
// ─────────────────────────────────────────────────────────────
function buildSitemap(built) {
  const statics = [
    { loc: `${SITE}/`, pri: '1.0', freq: 'daily' },
    { loc: `${SITE}/all-monthly-dividend-etfs.html`, pri: '0.9', freq: 'daily' },
    { loc: `${SITE}/blog.html`, pri: '0.8', freq: 'weekly' },
    { loc: `${SITE}/best-etfs-for-monthly-income-2026.html`, pri: '0.8', freq: 'monthly' },
    { loc: `${SITE}/top-10-highest-yield-monthly-etfs-2026`, pri: '0.7', freq: 'monthly' },
    { loc: `${SITE}/qqqi-etf-dividend-guide-2026.html`, pri: '0.8', freq: 'monthly' },
    { loc: `${SITE}/spyi-etf-dividend-guide-2026.html`, pri: '0.8', freq: 'monthly' },
    { loc: `${SITE}/advertise`, pri: '0.5', freq: 'monthly' },
    { loc: `${SITE}/faq.html`, pri: '0.4', freq: 'yearly' },
    { loc: `${SITE}/terms.html`, pri: '0.3', freq: 'yearly' },
    { loc: `${SITE}/privacy.html`, pri: '0.3', freq: 'yearly' }
  ];

  const urls = [
    ...statics.map(s => `  <url><loc>${s.loc}</loc><lastmod>${TODAY}</lastmod><changefreq>${s.freq}</changefreq><priority>${s.pri}</priority></url>`),
    ...built.map(f => `  <url><loc>${SITE}/${slug(f.symbol)}-monthly-dividend.html</loc><lastmod>${TODAY}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>`)
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function main() {
  console.log('→ Fetching CSV…');
  const res = await fetch(CSV_URL + '&t=' + Date.now());
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
  const csv = await res.text();

  const lines = csv.split(/\r?\n/).filter(l => l.trim());
  console.log(`→ ${lines.length - 1} data rows in sheet`);

  const funds = [];
  const skipped = [];

  for (let i = 1; i < lines.length; i++) {
    const c = parseCsvLine(lines[i]);
    const symbol = (c[0] || '').replace(/[^A-Za-z0-9.\-]/g, '').toUpperCase();
    const name = c[1] || '';
    const y = parseYield(c[2]);

    if (!symbol) continue;
    if (!y) { skipped.push(`${symbol || '(blank)'} — no usable yield`); continue; }
    if (!name) { skipped.push(`${symbol} — no fund name`); continue; }

    funds.push({
      symbol,
      name,
      yield: y,
      aum: parseAum(c[3]),
      decay: c[4] || '',
      category: categorize(name)
    });
  }

  // Dedupe by ticker, keep first occurrence
  const seen = new Set();
  const unique = funds.filter(f => (seen.has(f.symbol) ? false : (seen.add(f.symbol), true)));

  // Canonical ordering: yield descending. Rank + prev/next derive from this.
  unique.sort((a, b) => b.yield - a.yield);

  // Batch selection: highest AUM first (best search volume), then re-sorted by yield
  let selected = unique;
  if (MAX_PAGES > 0 && unique.length > MAX_PAGES) {
    selected = [...unique]
      .sort((a, b) => (b.aum || 0) - (a.aum || 0))
      .slice(0, MAX_PAGES)
      .sort((a, b) => b.yield - a.yield);
  }

  console.log(`→ ${unique.length} valid funds, building ${selected.length} pages`);
  if (skipped.length) console.log(`→ Skipped ${skipped.length}: ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? '…' : ''}`);

  let written = 0;
  selected.forEach((f, i) => {
    const html = buildTickerPage(f, selected, i);
    fs.writeFileSync(path.join(OUT_DIR, `${slug(f.symbol)}-monthly-dividend.html`), html, 'utf8');
    written++;
  });

  fs.writeFileSync(path.join(OUT_DIR, 'all-monthly-dividend-etfs.html'), buildHubPage(selected, unique.length), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), buildSitemap(selected), 'utf8');

  console.log(`✓ ${written} ticker pages`);
  console.log(`✓ all-monthly-dividend-etfs.html (hub)`);
  console.log(`✓ sitemap.xml (${written + 10} URLs)`);
}

main().catch(e => { console.error('BUILD FAILED:', e.message); process.exit(1); });
