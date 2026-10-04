/*
 * Network email signup box (7 Free ETF Picks) -> MailerLite form "Network Signup - 7 Free ETF Picks".
 * One file serves every site in the network. Usage:
 *   <div class="etf-signup" data-variant="subtle|featured" data-color="#1A3C34" data-accent="#2E5D54" data-source="topdividendetfs"></div>
 *   <script src="https://topdividendetfs.com/email-signup.js" defer></script>
 * "subtle" = slim strip (homepages, under the table). "featured" = card (sub-pages).
 */
(function () {
  var ENDPOINT = 'https://assets.mailerlite.com/jsonp/2512297/forms/200418199604299666/subscribe';
  var HEAD = '7 Free ETF Picks';
  var SUB = 'Growth + income potential, 5 to 10% yields, no price decay. Sent straight to your inbox.';
  var BULLETS = ['7 ETFs that passed our no-price-decay filter', 'Yields in the 5 to 10% range, with real growth exposure', 'A short, plain-English breakdown of each one'];

  function tint(hex, al) {
    var h = hex.replace('#', ''); if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
    var n = parseInt(h, 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + al + ')';
  }

  function css(c, a) {
    return '' +
      '.etfsu{box-sizing:border-box;font-family:inherit;color:#1f2b27;margin:22px auto;max-width:900px;width:100%}' +
      '.etfsu *{box-sizing:border-box}' +
      '.etfsu form{display:flex;gap:8px;flex-wrap:wrap;margin:0}' +
      '.etfsu input[type=email]{flex:1 1 220px;min-width:0;padding:11px 13px;border:1px solid #cfd8d4;border-radius:7px;font-size:15px;font-family:inherit;background:#fff;color:#1f2b27}' +
      '.etfsu input[type=email]:focus{outline:2px solid ' + a + ';outline-offset:1px;border-color:' + a + '}' +
      '.etfsu button{flex:0 0 auto;padding:11px 18px;border:0;border-radius:7px;background:' + c + ';color:#fff;font-weight:800;font-size:15px;font-family:inherit;cursor:pointer}' +
      '.etfsu button:hover{filter:brightness(1.15)}.etfsu button[disabled]{opacity:.6;cursor:default}' +
      '.etfsu .hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
      '.etfsu .fine{font-size:12px;color:#6b7772;margin-top:7px}' +
      '.etfsu .msg{font-size:15px;font-weight:700;color:' + c + ';padding:6px 0}' +
      '.etfsu .err{font-size:13px;color:#b3261e;margin-top:6px}' +
      /* subtle strip */
      '.etfsu.subtle{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:16px 20px;border:2px solid ' + a + ';border-left:6px solid ' + c + ';border-radius:10px;background:' + tint(a, .12) + ';box-shadow:0 3px 12px rgba(0,0,0,.07)}' +
      '.etfsu.subtle .txt{flex:1 1 260px;font-size:16px;line-height:1.4}.etfsu.subtle .txt b{color:' + c + '}' +
      '.etfsu.subtle .frm{flex:1 1 320px}' +
      /* featured card */
      '.etfsu.featured{border-radius:12px;overflow:hidden;border:1px solid #dfe6e3;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.05)}' +
      '.etfsu.featured .top{background:' + c + ';color:#fff;padding:16px 20px}' +
      '.etfsu.featured .top .k{font-size:11px;letter-spacing:1.5px;font-weight:800;opacity:.75;text-transform:uppercase}' +
      '.etfsu.featured .top h3{margin:4px 0 2px;font-size:22px;line-height:1.2;color:#fff;font-weight:900}' +
      '.etfsu.featured .top p{margin:0;font-size:14px;opacity:.9;color:#fff}' +
      '.etfsu.featured .body{padding:16px 20px 18px}' +
      '.etfsu.featured ul{margin:0 0 14px;padding-left:20px;font-size:14px;line-height:1.6}' +
      '@media(max-width:560px){.etfsu button{width:100%}.etfsu.subtle{padding:14px}}';
  }

  function formHTML() {
    return '<form novalidate>' +
      '<input type="email" name="fields[email]" placeholder="Your email address" aria-label="Email address" autocomplete="email" required>' +
      '<span class="hp" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off"></span>' +
      '<button type="submit">Send My Picks</button>' +
      '</form><div class="err" role="alert" hidden></div>' +
      '<div class="fine">Free. No spam. Unsubscribe anytime.</div>';
  }

  function build(el, i) {
    if (el.getAttribute('data-ready')) return;
    el.setAttribute('data-ready', '1');
    var v = el.getAttribute('data-variant') === 'featured' ? 'featured' : 'subtle';
    var c = el.getAttribute('data-color') || '#1A3C34';
    var a = el.getAttribute('data-accent') || c;
    var src = el.getAttribute('data-source') || location.hostname.replace(/^www\./, '');
    if (!document.getElementById('etfsu-css-' + c.replace('#', ''))) {
      var s = document.createElement('style');
      s.id = 'etfsu-css-' + c.replace('#', '');
      s.textContent = css(c, a).replace(/\.etfsu/g, '.etfsu.c' + c.replace('#', ''));
      document.head.appendChild(s);
    }
    el.className += ' etfsu ' + v + ' c' + c.replace('#', '');
    if (v === 'featured') {
      el.innerHTML = '<div class="top"><div class="k">Free email</div><h3>' + HEAD + '</h3><p>' + SUB + '</p></div>' +
        '<div class="body"><ul>' + BULLETS.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>' + formHTML() + '</div>';
    } else {
      el.innerHTML = '<div class="txt"><b>Get ' + HEAD + '</b> with growth + income potential and no price decay.</div><div class="frm">' + formHTML() + '</div>';
    }
    var f = el.querySelector('form'), inp = f.querySelector('input[type=email]'), btn = f.querySelector('button'), err = el.querySelector('.err');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true;
      if (f.website.value) return; // bot
      var email = (inp.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.textContent = 'Please enter a valid email address.'; err.hidden = false; return; }
      btn.disabled = true; btn.textContent = 'Sending...';
      var fd = new FormData();
      fd.append('fields[email]', email);
      fd.append('ml-submit', '1');
      fd.append('anticsrf', 'true');
      fetch(ENDPOINT, { method: 'POST', body: fd, mode: 'cors' })
        .then(function (r) { return r.json().catch(function () { return { success: r.ok }; }); })
        .catch(function () { return fetch(ENDPOINT, { method: 'POST', body: fd, mode: 'no-cors' }).then(function () { return { success: true }; }); })
        .then(function (res) {
          if (res && res.success) {
            var box = el.querySelector(v === 'featured' ? '.body' : '.frm');
            box.innerHTML = '<div class="msg">You\'re in! Check your inbox for your 7 free ETF picks.</div><div class="fine">Don\'t see it in a few minutes? Check your Promotions or Spam folder.</div>';
            if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { form: 'etf_picks_signup', variant: v, source: src });
          } else {
            throw new Error((res && res.errors && JSON.stringify(res.errors)) || 'failed');
          }
        })
        .catch(function () {
          btn.disabled = false; btn.textContent = 'Send My Picks';
          err.textContent = 'Something went wrong. Please try again.'; err.hidden = false;
        });
    });
  }

  function init() { [].forEach.call(document.querySelectorAll('.etf-signup'), build); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
