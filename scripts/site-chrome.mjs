// Site-wide chrome for MonthlyETFs.com: OVL sponsor banner at the top and bottom of every page,
// plus the network footer. Runs on every .html page (root and etf-images/) after the page builders,
// so new pages and rebuilt pages always get it. Safe to run again and again (it replaces its own blocks).
//   node scripts/site-chrome.mjs
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

export function applyChrome(html, year) {
  const M = k => [`<!--mx:${k}-->`, `<!--/mx:${k}-->`];
  // blocks from an earlier run are replaced in place, so pages never shift around
  const has = k => html.indexOf(M(k)[0]) > -1;
  const swap = (k, block) => { const [a, b] = M(k); const i = html.indexOf(a), j = html.indexOf(b, i); html = html.slice(0, i) + block + html.slice(j + b.length); };
  const strip = k => { const [a, b] = M(k); let i; while ((i = html.indexOf(a)) > -1) { const j = html.indexOf(b, i); if (j < 0) break; html = html.slice(0, i) + html.slice(j + b.length); } };

  const banner = (k) => `${M(k)[0]}
<div class="mx-ovl">
  <a href="https://lsfunds.com/etfs/ovl" target="_blank" rel="sponsored noopener noreferrer"><img src="https://raw.githubusercontent.com/benjiesiegel1414/topdividendetfs-site/main/OVL%20new%20display%20ad%202.png" alt="Liquid Strategies OVL ETF" loading="${k === "ovl-top" ? "eager" : "lazy"}"></a>
  <small class="mx-ovl-lab">Sponsored By</small>
  <small class="mx-ovl-pro">Read carefully before investing. Prospectus: <a href="https://lsfunds.com/hubfs/Regulatory/Prospectus.pdf?hsLang=en" target="_blank" rel="noopener noreferrer">https://lsfunds.com/hubfs/Regulatory/Prospectus.pdf?hsLang=en</a></small>
</div>
${M(k)[1]}`;

  const css = `${M("css")[0]}<style>
.mx-ovl{width:92%;max-width:1000px;margin:16px auto;display:flex;flex-direction:column;align-items:center;gap:6px;box-sizing:border-box}
.mx-ovl a img{display:block;max-width:100%;height:auto;transition:transform .3s ease}
.mx-ovl a:hover img{transform:scale(1.02)}
.mx-ovl small{color:#666;font-size:.72rem;text-align:center;max-width:100%;overflow-wrap:anywhere;font-family:'Lato',Arial,sans-serif;line-height:1.4}
.mx-ovl .mx-ovl-lab{font-weight:700}
.mx-ovl .mx-ovl-pro a{color:#666;text-decoration:underline;font-weight:400}
.mx-foot{width:94%;max-width:1100px;margin:28px auto 22px;background:linear-gradient(150deg,#1f5148 0%,#30776C 70%,#3a8a7d 100%);color:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(31,81,72,.28);font-family:'Lato',Arial,sans-serif;text-align:left;box-sizing:border-box;overflow:hidden;position:relative;font-size:16px;line-height:1.5}
.mx-foot::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 90% -20%,rgba(255,215,106,.16),transparent 45%);pointer-events:none}
.mx-foot *{box-sizing:border-box}
.mx-foot-in{position:relative;display:grid;grid-template-columns:1.15fr 1fr 1.75fr .95fr;gap:26px;padding:30px 30px 22px}
.mx-foot h4{margin:0 0 12px;font-size:.72rem;letter-spacing:1.4px;text-transform:uppercase;color:#ffd76a;font-weight:900}
.mx-foot a{color:rgba(255,255,255,.88);text-decoration:none;font-weight:700}
.mx-foot a:hover{color:#ffd76a;text-decoration:underline}
.mx-foot ul{list-style:none;margin:0;padding:0}
.mx-foot li{margin:0 0 8px;font-size:.86rem}
.mx-foot .mx-logo{display:inline-block;font-size:1.12rem;font-weight:900;color:#fff;margin-bottom:8px;white-space:nowrap}
.mx-foot .mx-logo:hover{text-decoration:none;color:#fff}
.mx-foot p.mx-tag{margin:0 0 14px;font-size:.85rem;color:rgba(255,255,255,.75)}
.mx-foot .mx-btns{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.mx-foot .mx-btn{display:inline-block;padding:8px 14px;border-radius:8px;font-size:.8rem;font-weight:900}
.mx-foot .mx-btn.gold{background:#ffd76a;color:#1f5148}
.mx-foot .mx-btn.ghost{border:1px solid rgba(255,255,255,.45);color:#fff}
.mx-foot .mx-btn:hover{text-decoration:none;transform:translateY(-1px)}
.mx-foot .mx-net{display:grid;grid-template-columns:1fr 1fr;column-gap:14px}
.mx-foot .mx-net .here{color:#ffd76a}
.mx-foot .mx-net a{white-space:nowrap;font-size:.82rem}
.mx-foot .mx-bottom{position:relative;border-top:1px solid rgba(255,255,255,.18);padding:14px 30px 18px;font-size:.74rem;color:rgba(255,255,255,.65);display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}
@media(max-width:900px){.mx-foot-in{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.mx-foot-in{grid-template-columns:1fr;padding:24px 20px 16px;gap:22px}.mx-foot .mx-bottom{padding:14px 20px 18px}}
</style>${M("css")[1]}`;

  const pages = [
    ["/all-monthly-dividend-etfs.html", "All Monthly Dividend ETFs"],
    ["/top-10-highest-yield-monthly-etfs-2026.html", "Top 10 Highest Yield"],
    ["/monthly-dividend-etf-calendar-2026.html", "Monthly Dividend Calendar"],
    ["/best-etfs-for-monthly-income-2026.html", "Best ETFs for Monthly Income"],
    ["/etf-images/", "ETF Ticker Images"],
    ["/blog.html", "Blog"],
    ["/methodology.html", "Methodology"],
    ["/faq.html", "FAQ"],
  ];
  const net = [
    ["https://topdividendetfs.com/", "💵 TopDividendETFs"],
    ["https://topdividendetfspro.com/?utm_source=monthlyetfs&utm_medium=footer&utm_campaign=network", "🏆 TopDividendETFsPRO"],
    ["https://weeklyetfs.com/", "📅 WeeklyETFs"],
    ["https://monthlyetfs.com/", "🗓️ MonthlyETFs", true],
    ["https://growthetfs.com/", "📈 GrowthETFs"],
    ["https://etftotalreturns.com/", "📊 ETFTotalReturns"],
    ["https://topspaceetfs.com/", "🚀 TopSpaceETFs"],
    ["https://robotetfs.com/", "🤖 RobotETFs"],
    ["https://photonicsetfs.com/", "🔦 PhotonicsETFs"],
    ["https://topdividendtools.com/", "🛠️ TopDividendTools"],
    ["https://dividendprojection.com/", "🧮 DividendProjection"],
    ["https://topetfs.com/", "📰 TopETFs"],
  ];
  const footer = `${M("footer")[0]}
<footer class="mx-foot">
  <div class="mx-foot-in">
    <div>
      <a class="mx-logo" href="/">🗓️ MonthlyETFs.com</a>
      <p class="mx-tag">The top monthly dividend ETFs, ranked and updated daily. 100% free.</p>
      <div class="mx-btns">
        <a class="mx-btn gold" href="https://topdividendetfspro.com/?utm_source=monthlyetfs&amp;utm_medium=footer&amp;utm_campaign=pro" target="_blank" rel="noopener">🏆 Go PRO</a>
        <a class="mx-btn ghost" href="https://dividendempire2000.gumroad.com/l/DividendTracker?layout=profile" target="_blank" rel="noopener">Best Monthly Dividend Tracker</a>
      </div>
    </div>
    <div>
      <h4>MonthlyETFs</h4>
      <ul>${pages.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join("")}</ul>
    </div>
    <div>
      <h4>Our Network</h4>
      <ul class="mx-net">${net.map(([h, t, here]) => `<li><a href="${h}"${here ? ' class="here"' : ' target="_blank" rel="noopener"'}>${t}</a></li>`).join("")}</ul>
    </div>
    <div>
      <h4>Company</h4>
      <ul>
        <li><a href="/advertise">Advertise With Us</a></li>
        <li><a href="https://x.com/MonthlyETFs" target="_blank" rel="noopener">Follow @MonthlyETFs</a></li>
        <li><a href="/terms.html">Terms of Use</a></li>
        <li><a href="/privacy.html">Privacy Policy</a></li>
        <li><a href="mailto:Business@TopDividendETFs.com">Business@TopDividendETFs.com</a></li>
      </ul>
    </div>
  </div>
  <div class="mx-bottom"><span>© ${year} Dividend Empire LLC. All rights reserved.</span><span>Not financial advice. Data may be delayed or inaccurate.</span></div>
</footer>
${M("footer")[1]}`;

  // 2. styles
  if (has("css")) swap("css", css); else html = html.replace(/<\/head>/i, m => css + "\n" + m);

  // 3. sponsor banners: pages that already carry their own OVL banners keep them
  const withoutOurs = html.replace(/<!--mx:ovl-(top|bottom)-->[\s\S]*?<!--\/mx:ovl-\1-->/g, "");
  const own = (withoutOurs.match(/lsfunds\.com\/etfs\/ovl/g) || []).length;
  if (own > 0) strip("ovl-top");
  if (own > 1) strip("ovl-bottom");
  if (own === 0) {
    if (has("ovl-top")) swap("ovl-top", banner("ovl-top"));
    else {
      let at = -1;
      const nb = html.search(/<div class="site-network-bar"/);
      if (nb > -1) { // end of the network bar (balanced divs)
        let depth = 0; const re = /<div\b|<\/div>/g; re.lastIndex = nb; let m;
        while ((m = re.exec(html))) { depth += m[0] === "</div>" ? -1 : 1; if (depth === 0) { at = re.lastIndex; break; } }
      }
      if (at < 0) { const h = html.search(/<\/header>/i); if (h > -1) at = h + "</header>".length; }
      if (at < 0) { const b = html.match(/<body[^>]*>/i); if (b) at = b.index + b[0].length; }
      if (at > -1) html = html.slice(0, at) + "\n" + banner("ovl-top") + html.slice(at);
    }
  }
  if (own < 2) {
    if (has("ovl-bottom")) swap("ovl-bottom", banner("ovl-bottom"));
    else {
      const f = html.search(/<footer\b/i);
      const at = f > -1 ? f : html.search(/<\/body>/i);
      if (at > -1) html = html.slice(0, at) + banner("ovl-bottom") + "\n" + html.slice(at);
    }
  }

  // 4. footer: replace the page's own footer (or our footer from an earlier run)
  if (has("footer")) swap("footer", footer);
  else {
    const fs0 = html.search(/<footer\b/i);
    if (fs0 > -1) {
      const fe = html.indexOf("</footer>", fs0);
      if (fe > -1) html = html.slice(0, fs0) + footer + html.slice(fe + "</footer>".length);
    } else html = html.replace(/<\/body>/i, m => footer + "\n" + m);
  }
  return html;
}

// CLI: apply to every page in the site
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const year = new Date().getUTCFullYear();
  const files = [];
  for (const dir of ["", "etf-images"]) {
    const d = path.join(ROOT, dir); if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) if (f.endsWith(".html")) files.push(path.join(d, f));
  }
  let changed = 0;
  for (const f of files) {
    const a = fs.readFileSync(f, "utf8"), b = applyChrome(a, year);
    if (a !== b) { fs.writeFileSync(f, b); changed++; }
  }
  console.log(`site chrome: ${changed} of ${files.length} pages updated`);
}
