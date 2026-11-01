// Moteur d'affichage minimal des pages de la maquette (variables, boucles, conditions, événements)
(function () {
  class DCLogic { constructor(props) { this.props = props; this.state = {}; } setState(s) { Object.assign(this.state, s); } }
  window.DCLogic = DCLogic;
  const get = (ctx, p) => {
    p = p.trim();
    if (p === 'true') return true; if (p === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(p)) return +p;
    return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
  };
  const interp = (s, ctx) => s.replace(/\{\{([^}]+)\}\}/g, (m, p) => { const v = get(ctx, p); return v == null ? '' : String(v); });
  const whole = (v) => { const m = /^\s*\{\{([^}]+)\}\}\s*$/.exec(v); return m ? m[1] : null; };
  function proc(node, ctx) {
    for (const ch of Array.from(node.childNodes)) {
      if (ch.nodeType === 3) { if (ch.nodeValue.includes('{{')) ch.nodeValue = interp(ch.nodeValue, ctx); continue; }
      if (ch.nodeType !== 1) continue;
      const tag = ch.tagName.toLowerCase();
      if (tag === 'sc-for') {
        const list = get(ctx, whole(ch.getAttribute('list')) || '') || [];
        const as = ch.getAttribute('as'); const tpl = ch.innerHTML; const frag = document.createDocumentFragment();
        const parentTag = ch.parentElement ? ch.parentElement.tagName.toLowerCase() : 'div';
        list.forEach((it, i) => {
          const w = document.createElement(parentTag === 'tbody' ? 'tbody' : 'div');
          w.innerHTML = tpl; proc(w, Object.assign({}, ctx, { [as]: it, $index: i }));
          while (w.firstChild) frag.appendChild(w.firstChild);
        });
        ch.replaceWith(frag); continue;
      }
      if (tag === 'sc-if') {
        if (get(ctx, whole(ch.getAttribute('value')) || '')) { proc(ch, ctx); ch.replaceWith(...ch.childNodes); } else ch.remove();
        continue;
      }
      for (const a of Array.from(ch.attributes)) {
        if (!a.value.includes('{{')) continue;
        const key = whole(a.value);
        if (/^on[a-z]/i.test(a.name) && key) {
          const fn = get(ctx, key);
          ch.removeAttribute(a.name);
          if (typeof fn === 'function') ch.addEventListener(a.name.slice(2).toLowerCase(), fn);
        } else ch.setAttribute(a.name, interp(a.value, ctx));
      }
      proc(ch, ctx);
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const sc = document.querySelector('script[data-dc-script]');
    const defs = JSON.parse(sc.getAttribute('data-props') || '{}');
    const props = {}; for (const k in defs) if (k[0] !== '$' && 'default' in defs[k]) props[k] = defs[k].default;
    const Comp = new Function('DCLogic', sc.textContent + '\nreturn Component;')(DCLogic);
    const ctx = new Comp(props).renderVals();
    const x = document.querySelector('x-dc');
    const h = x.querySelector('helmet'); if (h) { while (h.firstChild) document.head.appendChild(h.firstChild); h.remove(); }
    if (!document.querySelector('meta[name=viewport]')) {
      const m = document.createElement('meta'); m.name = 'viewport'; m.content = 'width=device-width, initial-scale=1'; document.head.appendChild(m);
    }
    proc(x, ctx);
  });
})();
