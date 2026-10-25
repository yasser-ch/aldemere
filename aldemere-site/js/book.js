/* Conquest of Aldemere, the book. Binds the page sections into sheets that turn, and runs the small
   toys on the pages (foe plates, hero sheet, the die). Without this file the pages just stack. */
(function () {
  'use strict';
  var book = document.getElementById('book');
  if (!book) return;
  var stage = document.getElementById('stage');
  var pages = [].slice.call(book.querySelectorAll(':scope > .page'));
  var N = pages.length;
  var mq = window.matchMedia('(max-width: 860px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var single = mq.matches;
  var sheets = [], U = 0, f = 0, timers = [];
  var TURN = reduce ? 0 : 1000, STEP = 135;

  var RIBBONS = [
    ['Game', 'about', '#8c2417'], ['Realm', 'realm', '#27457f'], ['Foes', 'bestiary', '#6b2f6e'], ['Gear', 'armoury', '#a56a1a'],
    ['Heroes', 'faces', '#2f6e57'], ['Cast', 'cast', '#27457f'], ['Scenes', 'gallery', '#8c2417'], ['Dice', 'dice', '#27457f'], ['Road', 'progress', '#6b2f6e'],
    ['News', 'chronicle', '#a56a1a'], ['Write', 'suggest', '#2f6e57']
  ];

  /* ── sound: a soft paper rustle, off until asked for ─────────────────── */
  var audio = null, soundOn = false;
  try { soundOn = localStorage.getItem('aldemere-sound') === '1'; } catch (e) {}
  function rustle() {
    if (!soundOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var len = Math.floor(audio.sampleRate * 0.34), buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) { var t = i / len; d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t) * (0.6 + 0.4 * Math.sin(t * 40)); }
      var src = audio.createBufferSource(); src.buffer = buf;
      var bp = audio.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 0.6;
      var g = audio.createGain(); g.gain.value = 0.16;
      src.connect(bp); bp.connect(g); g.connect(audio.destination); src.start();
    } catch (e) {}
  }

  /* ── building the sheets ─────────────────────────────────────────────── */
  var ui = {};
  function make(tag, cls) { var el = document.createElement(tag); if (cls) el.className = cls; return el; }

  function build() {
    [].slice.call(book.children).forEach(function (c) { if (!c.classList.contains('page')) book.removeChild(c); });
    pages.forEach(function (p) { if (p.parentNode !== book) book.appendChild(p); });
    [].slice.call(stage.querySelectorAll('.controls')).forEach(function (c) { stage.removeChild(c); });
    sheets = [];
    book.classList.toggle('single', single);
    pages.forEach(function (p, i) { if (i >= 2 && i < N - 1) p.setAttribute('data-n', i); else p.removeAttribute('data-n'); });

    if (!single) {
      book.appendChild(make('div', 'board l')); book.appendChild(make('div', 'board r'));
      book.appendChild(make('div', 'edge l')); book.appendChild(make('div', 'edge r'));
    }
    var units = [];
    if (single) pages.forEach(function (p) { units.push([p, null]); });
    else for (var i = 0; i < N; i += 2) units.push([pages[i], pages[i + 1]]);
    U = units.length;
    units.forEach(function (u, k) {
      var s = make('div', 'sheet'), fr = make('div', 'face front'), bk = make('div', 'face back');
      fr.appendChild(u[0]); if (u[1]) bk.appendChild(u[1]);
      s.appendChild(fr); s.appendChild(bk);
      s.addEventListener('transitionend', function (e) { if (e.target === s && e.propertyName === 'transform') settle(k); });
      book.appendChild(s); sheets.push(s);
    });

    ui.cr = make('button', 'corner r'); ui.cr.type = 'button'; ui.cr.setAttribute('aria-label', 'Next page');
    ui.cl = make('button', 'corner l'); ui.cl.type = 'button'; ui.cl.setAttribute('aria-label', 'Previous page');
    ui.cr.addEventListener('click', next); ui.cl.addEventListener('click', prev);
    book.appendChild(ui.cr); if (!single) book.appendChild(ui.cl);

    if (!single) {
      ui.rb = make('div', 'ribbons'); ui.rb.setAttribute('role', 'navigation'); ui.rb.setAttribute('aria-label', 'Chapters');
      RIBBONS.forEach(function (r) {
        var b = make('button'); b.type = 'button'; b.textContent = r[0]; b.style.setProperty('--c', r[2]); b.dataset.go = r[1];
        b.addEventListener('click', function () { goPage(r[1]); }); ui.rb.appendChild(b);
      });
      ui.rb.style.left = 'calc(100% + 2px)'; book.appendChild(ui.rb);
    }

    var c = make('div', 'controls');
    ui.prev = make('button'); ui.prev.type = 'button'; ui.prev.textContent = '< Back'; ui.prev.addEventListener('click', prev);
    ui.where = make('span', 'where');
    ui.nextb = make('button'); ui.nextb.type = 'button'; ui.nextb.textContent = 'Turn >'; ui.nextb.addEventListener('click', next);
    ui.toc = make('button'); ui.toc.type = 'button'; ui.toc.textContent = 'Contents'; ui.toc.addEventListener('click', function () { goPage('contents'); });
    ui.snd = make('button'); ui.snd.type = 'button'; ui.snd.addEventListener('click', function () {
      soundOn = !soundOn; try { localStorage.setItem('aldemere-sound', soundOn ? '1' : '0'); } catch (e) {} paintSound(); rustle();
    });
    [ui.prev, ui.where, ui.nextb, ui.toc, ui.snd].forEach(function (x) { c.appendChild(x); });
    stage.appendChild(c); paintSound();
  }
  function paintSound() { ui.snd.textContent = soundOn ? 'Sound on' : 'Sound off'; ui.snd.setAttribute('aria-pressed', soundOn ? 'true' : 'false'); }

  /* ── state ───────────────────────────────────────────────────────────── */
  function zFor(k) { return k < f ? k + 1 : U - k; }
  function settle(k) { sheets[k].classList.remove('flying'); sheets[k].style.zIndex = k < f ? k + 1 : U - k; }
  function paint(instant) {
    sheets.forEach(function (s, k) {
      var on = k < f; s.classList.toggle('flipped', on);
      if (instant) { s.classList.remove('flying'); s.style.zIndex = zFor(k); }
    });
    book.setAttribute('data-state', single ? 'single' : (f === 0 ? 'start' : (f === U ? 'end' : 'open')));
    var vis = visible();
    pages.forEach(function (p, i) { var on = vis.indexOf(i) >= 0; p.inert = !on; p.setAttribute('aria-hidden', on ? 'false' : 'true'); });
    ui.prev.disabled = f === 0; ui.nextb.disabled = f === U || (single && f === U - 1);
    ui.cr.disabled = ui.nextb.disabled; ui.cl.disabled = f === 0;
    if (single) ui.where.textContent = (f + 1) + ' / ' + N;
    else ui.where.textContent = f === 0 ? 'Cover' : (f === U ? 'The end' : 'Pages ' + vis.join('-'));
    var id = chapterId(vis);
    if (ui.rb) [].forEach.call(ui.rb.children, function (b) { b.setAttribute('aria-current', b.dataset.go === id ? 'true' : 'false'); });
  }
  function visible() {
    if (single) return [f];
    if (f === 0) return [0];
    if (f === U) return [N - 1];
    return [2 * f - 1, 2 * f];
  }
  function chapterId(vis) {
    var p = pages[vis[vis.length - 1]], id = p ? p.getAttribute('data-id') : '';
    if (id === 'cover' || id === 'endpaper') return '';
    return id.replace(/2$/, '');
  }
  function pageIndex() { return single ? f : (f === 0 ? 0 : (f === U ? N - 1 : 2 * f)); }
  function targetFor(p) { return single ? p : (p === 0 ? 0 : Math.ceil(p / 2)); }

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function go(target, instant) {
    target = Math.max(0, Math.min(U, target));
    clearTimers();
    if (instant || reduce) {
      book.classList.add('instant'); f = target; paint(true); void book.offsetWidth;
      requestAnimationFrame(function () { book.classList.remove('instant'); });
      hash(); return;
    }
    var dir = target > f ? 1 : -1, n = Math.abs(target - f);
    if (!n) { paint(); return; }
    var goal = target, step = 0;
    book.setAttribute('data-state', single ? 'single' : (goal === 0 ? 'start' : (goal === U ? 'end' : 'open')));
    function one() {
      var k = dir > 0 ? f : f - 1;
      sheets[k].classList.add('flying'); sheets[k].style.zIndex = U + 5;
      f += dir; rustle();
      sheets.forEach(function (s, j) { if (j !== k && !s.classList.contains('flying')) s.style.zIndex = zFor(j); });
      sheets[k].classList.toggle('flipped', dir > 0);
      paint(); step++;
      if (step < n) timers.push(setTimeout(one, Math.max(70, STEP - n * 4)));
      else hash();
    }
    one();
  }
  function next() { go(f + (single ? 1 : 1)); }
  function prev() { go(f - 1); }
  function goPage(id, instant) {
    id = (id || '').replace(/^#/, '');
    var idx = -1;
    pages.forEach(function (p, i) { if (idx < 0 && p.getAttribute('data-id') === id) idx = i; });
    if (idx < 0) return false;
    go(targetFor(idx), instant); return true;
  }
  function hash() {
    var id = chapterId(visible());
    try { history.replaceState(null, '', id ? '#' + id : location.pathname + location.search); } catch (e) {}
  }

  /* ── input: keys, swipes, links ──────────────────────────────────────── */
  function typing(t) { return t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName); }
  document.addEventListener('keydown', function (e) {
    if (typing(e.target) || document.querySelector('dialog[open]') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
  });
  var tx = null, ty = 0;
  stage.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; tx = t.clientX; ty = t.clientY; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (tx === null) return; var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty; tx = null;
    if (Math.abs(dx) > 55 && Math.abs(dy) < 60 && !typing(e.target)) { if (dx < 0) next(); else prev(); }
  }, { passive: true });
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-go]') : null;
    if (a && !a.closest('.ribbons')) { e.preventDefault(); goPage(a.dataset.go); return; }
    if (e.target.closest && e.target.closest('[data-next]')) { e.preventDefault(); next(); }
  });
  window.addEventListener('hashchange', function () {
    var id = location.hash.replace(/^#/, ''); if (!id) return;
    var vis = chapterId(visible());
    if (id !== vis) goPage(id);
  });
  mq.addEventListener ? mq.addEventListener('change', rebuild) : mq.addListener(rebuild);
  function rebuild() {
    var p = pageIndex(); single = mq.matches; clearTimers(); f = 0; build(); go(targetFor(p), true);
  }

  /* ── toys on the pages ───────────────────────────────────────────────── */
  // foe plates
  var fb = document.getElementById('foebox');
  document.addEventListener('click', function (e) {
    var p = e.target.closest ? e.target.closest('.plate') : null;
    if (!p || !fb || !fb.showModal) return;
    fb.querySelector('img').src = 'img/monsters/' + p.dataset.foe + '.webp'; fb.querySelector('img').alt = p.dataset.name;
    fb.querySelector('h3').textContent = p.dataset.name;
    var t = +p.dataset.tier, pips = '';
    for (var i = 0; i < 6; i++) pips += '<i class="' + (i < t ? 'on' : '') + '"></i>';
    fb.querySelector('.pips').innerHTML = pips;
    fb.querySelector('.vig').textContent = 'Threat ' + ['', 'I', 'II', 'III', 'IV', 'V', 'VI'][t] + ' of VI. Vigour ' + p.dataset.hp + '.';
    fb.querySelector('.lore').textContent = p.dataset.lore || 'No one has written much about this one. Most who learn more do it the hard way.';
    fb.showModal();
  });
  if (fb) fb.addEventListener('click', function (e) { if (e.target === fb) fb.close(); });
  // the cast
  var cb = document.getElementById('castbox');
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.cast-btn') : null;
    if (!b || !cb || !cb.showModal) return;
    var im = cb.querySelector('.cimg'); im.src = 'img/cast/' + b.dataset.cast + '.webp'; im.alt = b.dataset.name;
    cb.querySelector('h3').textContent = b.dataset.name;
    cb.querySelector('.vig').textContent = b.dataset.role;
    cb.querySelector('.lore').textContent = b.dataset.bio;
    cb.showModal();
  });
  if (cb) cb.addEventListener('click', function (e) { if (e.target === cb) cb.close(); });
  // dust drifting up through the lamplight, behind the book
  if (!reduce && !document.querySelector('.motes') && document.body.classList.contains('bookpage')) {
    var mo = document.createElement('div'); mo.className = 'motes'; mo.setAttribute('aria-hidden', 'true');
    for (var m = 0; m < 26; m++) {
      var s = document.createElement('i'), sz = 2 + Math.random() * 2.5;
      s.style.cssText = 'left:' + (Math.random() * 100) + '%;width:' + sz + 'px;height:' + sz + 'px;animation-duration:' + (14 + Math.random() * 18) + 's;animation-delay:-' + (Math.random() * 30) + 's;--dx:' + ((Math.random() - .5) * 120) + 'px';
      mo.appendChild(s);
    }
    document.body.insertBefore(mo, document.body.firstChild);
    var tl = document.createElement('div'); tl.className = 'torchlight'; tl.setAttribute('aria-hidden', 'true'); document.body.insertBefore(tl, mo);
  }
  // the map
  var mb = document.getElementById('mapbox');
  document.addEventListener('click', function (e) { if (mb && mb.showModal && e.target.closest && e.target.closest('.mapfig')) mb.showModal(); });
  if (mb) mb.addEventListener('click', function (e) { if (e.target === mb) mb.close(); });

  // hero sheet
  var heroes = [], CLASSES = {
    warrior: { d: 'Strong arms from years of hauling, splitting and ploughing. Hits hard, takes a beating.', s: [4, 2, 1, 3, 2] },
    ranger: { d: 'You know the Greywood paths and the wind. Always strikes first.', s: [2, 4, 3, 1, 2] },
    rogue: { d: 'Quick hands, quicker excuses. Dodges and lands the hits that matter.', s: [2, 3, 3, 1, 3] },
    mage: { d: 'The hedge-witch taught you three words that burn. Mends between blows.', s: [1, 2, 3, 4, 2] }
  }, STATS = ['Might', 'Agility', 'Wits', 'Spirit', 'Charm'];
  try { heroes = JSON.parse(document.getElementById('hero-data').textContent); } catch (e) {}
  var hero = 0, cls = 'warrior';
  function paintHero() {
    var h = heroes[hero]; if (!h) return;
    var img = document.getElementById('hs-img'); img.src = h.img; img.alt = h.name;
    document.getElementById('hs-name').textContent = h.name;
    document.getElementById('hs-ep').textContent = h.ep;
    document.getElementById('hs-bl').textContent = h.blurb;
    document.getElementById('hs-desc').textContent = CLASSES[cls].d;
    var box = document.getElementById('hs-stats'), rows = '';
    CLASSES[cls].s.forEach(function (v, i) {
      var pips = ''; for (var j = 0; j < 5; j++) pips += '<i class="' + (j < v ? 'on' : '') + '"></i>';
      rows += '<div><dt>' + STATS[i] + '</dt><dd>' + pips + '</dd><span>' + v + '</span></div>';
    });
    box.innerHTML = rows;
    [].forEach.call(document.querySelectorAll('.face-btn'), function (b, i) { b.setAttribute('aria-pressed', i === hero ? 'true' : 'false'); });
    [].forEach.call(document.querySelectorAll('.tabs button'), function (b) { b.setAttribute('aria-selected', b.dataset.class === cls ? 'true' : 'false'); });
  }
  document.addEventListener('click', function (e) {
    var fbn = e.target.closest ? e.target.closest('.face-btn') : null;
    if (fbn) { hero = +fbn.dataset.hero; paintHero(); return; }
    var tb = e.target.closest ? e.target.closest('.tabs button') : null;
    if (tb) { cls = tb.dataset.class; paintHero(); }
  });

  // the die
  var d20 = document.getElementById('d20'), dn = document.getElementById('d20-n'), verdict = document.getElementById('d20-v'), log = document.getElementById('d20-log');
  var bonus = 2, dc = 13, rolling = false, history20 = [];
  function pick(group, attr, val) {
    [].forEach.call(group.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute(attr) === String(val) ? 'true' : 'false'); });
  }
  [].forEach.call(document.querySelectorAll('.chips button'), function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.bonus !== undefined) { bonus = +b.dataset.bonus; pick(b.parentNode, 'data-bonus', bonus); }
      else { dc = +b.dataset.dc; pick(b.parentNode, 'data-dc', dc); }
    });
  });
  function rand20() {
    if (window.crypto && crypto.getRandomValues) { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % 20 + 1; }
    return Math.floor(Math.random() * 20) + 1;
  }
  if (d20) d20.addEventListener('click', function () {
    if (rolling) return; rolling = true;
    d20.classList.remove('nat20', 'nat1'); d20.classList.add('rolling'); verdict.className = 'verdict'; verdict.textContent = 'The die is in the air...';
    var ticks = reduce ? 1 : 14, t = 0, final = rand20();
    var iv = setInterval(function () {
      t++; dn.textContent = t >= ticks ? final : rand20();
      if (t >= ticks) {
        clearInterval(iv); d20.classList.remove('rolling'); rolling = false;
        var total = final + bonus, ok = total >= dc;
        if (final === 20) d20.classList.add('nat20'); if (final === 1) d20.classList.add('nat1');
        var line = final === 20 ? 'A natural 20. Legends begin like this.' : final === 1 ? 'A natural 1. Even legends begin somewhere.' : '';
        verdict.className = 'verdict ' + (ok ? 'win' : 'lose');
        verdict.textContent = (line ? line + ' ' : '') + total + ' against ' + dc + '. ' + (ok ? 'It holds.' : 'The die has opinions.');
        history20.unshift('<li class="' + (ok ? 'win' : 'lose') + '"><span>' + final + ' + ' + bonus + ' = ' + total + '</span><span>vs ' + dc + (ok ? ' success' : ' failure') + '</span></li>');
        history20 = history20.slice(0, 5); log.innerHTML = history20.join('');
        rustle();
      }
    }, 62);
  });

  /* ── go ──────────────────────────────────────────────────────────────── */
  build(); paintHero();
  var first = location.hash.replace(/^#/, '');
  if (!first || !goPage(first, true)) { go(0, true); }
})();
