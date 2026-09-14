(function(){
  "use strict";

  var LEAD_EMAIL = 'ipranichnikov@yandex.ru';

  var doc = document, body = doc.body;
  var rm = matchMedia('(prefers-reduced-motion: reduce)');

  doc.documentElement.classList.add('ready');

  /* ambient motes */
  (function(){
    var env = doc.getElementById('env');
    if (!env || rm.matches) return;
    for (var i = 0; i < 12; i++){
      var m = doc.createElement('span');
      m.className = 'mote';
      m.style.left = (Math.random() * 100).toFixed(2) + '%';
      m.style.top = (60 + Math.random() * 50).toFixed(2) + '%';
      m.style.animationDuration = (26 + Math.random() * 22).toFixed(1) + 's';
      m.style.animationDelay = '-' + (Math.random() * 40).toFixed(1) + 's';
      m.style.opacity = (0.06 + Math.random() * 0.12).toFixed(2);
      env.appendChild(m);
    }
  })();

  /* header */
  var head = doc.getElementById('head');
  var burger = doc.getElementById('burger');
  var menu = doc.getElementById('menu');
  if (head){
    var alwaysSolid = head.hasAttribute('data-solid');
    var solid = false;
    var setSolid = function(){
      var want = alwaysSolid || window.scrollY > 24;
      if (want !== solid){ solid = want; head.classList.toggle('solid', want); }
    };
    addEventListener('scroll', setSolid, {passive:true});
    setSolid();

    var closeMenu = function(returnFocus){
      head.classList.remove('open');
      body.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Открыть меню');
      if (returnFocus) burger.focus();
    };
    if (burger && menu){
      burger.addEventListener('click', function(){
        var open = !head.classList.contains('open');
        head.classList.toggle('open', open);
        body.classList.toggle('menu-open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
        if (open){ var first = menu.querySelector('a'); if (first) first.focus(); }
      });
      menu.addEventListener('click', function(e){ if (e.target.closest('a')) closeMenu(false); });
      doc.addEventListener('keydown', function(e){ if (e.key === 'Escape' && head.classList.contains('open')) closeMenu(true); });
      matchMedia('(min-width: 1181px)').addEventListener('change', function(e){ if (e.matches) closeMenu(false); });
    }
  }

  /* entrances */
  var entering = doc.querySelectorAll('.rise, [data-in]');
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {rootMargin:'0px 0px -10% 0px', threshold:.06});
    entering.forEach(function(el){ io.observe(el); });
  } else {
    entering.forEach(function(el){ el.classList.add('in'); });
  }

  /* counters */
  var fmt = function(n){ return n.toLocaleString('ru-RU'); };
  var finishCount = function(el){ el.textContent = fmt(parseInt(el.getAttribute('data-to'), 10)) + (el.getAttribute('data-suffix') || ''); };
  var runCount = function(el){
    if (rm.matches){ finishCount(el); return; }
    var to = parseInt(el.getAttribute('data-to'), 10), suf = el.getAttribute('data-suffix') || '';
    var t0 = performance.now(), dur = 1500, last = '', lastAt = 0;
    var step = function(now){
      var p = Math.min(1, (now - t0) / dur);
      var txt = fmt(Math.round(to * (1 - Math.pow(1 - p, 3)))) + suf;
      if (p === 1 || (now - lastAt > 90 && txt !== last)){ last = txt; lastAt = now; el.textContent = txt; }
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  var numsBlocks = doc.querySelectorAll('[data-count]');
  if (numsBlocks.length && 'IntersectionObserver' in window){
    var cio = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        e.target.querySelectorAll('[data-to]').forEach(runCount);
      });
    }, {threshold:.3});
    numsBlocks.forEach(function(b){ cio.observe(b); });
  } else {
    doc.querySelectorAll('[data-to]').forEach(finishCount);
  }

  /* faq */
  doc.querySelectorAll('.q').forEach(function(q){
    var btn = q.querySelector('button'), panel = q.querySelector('.a');
    if (!btn || !panel) return;
    btn.addEventListener('click', function(){
      var open = q.getAttribute('data-open') === 'true';
      q.setAttribute('data-open', open ? 'false' : 'true');
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      panel.style.height = open ? '0px' : panel.scrollHeight + 'px';
    });
  });

  /* lead form */
  var form = doc.getElementById('form');
  if (form){
    var err = doc.getElementById('err'), ok = doc.getElementById('ok');
    var showErr = function(msg, field){ err.textContent = msg; err.hidden = false; field.focus(); };
    form.addEventListener('input', function(){ err.hidden = true; });
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var name = form.elements.name.value.trim(), contact = form.elements.contact.value.trim(), site = form.elements.site.value.trim();
      if (!name){ showErr('Напишите, как к вам обращаться', form.elements.name); return; }
      if (!contact){ showErr('Оставьте телефон или Telegram, иначе разбор некуда прислать', form.elements.contact); return; }
      err.hidden = true;
      var text = 'Имя: ' + name + '\nКонтакт: ' + contact + '\nСайт: ' + (site || 'не указан');
      form.hidden = true;
      ok.hidden = false;
      location.href = 'mailto:' + LEAD_EMAIL + '?subject=' + encodeURIComponent('Заявка на разбор сайта') + '&body=' + encodeURIComponent(text);
    });
  }

  /* case filters, one group per section */
  var live = doc.getElementById('cases-live');
  doc.querySelectorAll('.filters[data-for]').forEach(function(group){
    var scope = doc.getElementById(group.getAttribute('data-for'));
    if (!scope) return;
    var cards = [].slice.call(scope.querySelectorAll('.case'));
    var chips = [].slice.call(group.querySelectorAll('.chip'));
    chips.forEach(function(ch){
      var f = ch.getAttribute('data-f');
      var n = f === 'all' ? cards.length : cards.filter(function(c){ return c.getAttribute('data-kind') === f; }).length;
      var badge = ch.querySelector('.c'); if (badge) badge.textContent = n;
      ch.addEventListener('click', function(){
        chips.forEach(function(x){ x.setAttribute('aria-pressed', x === ch ? 'true' : 'false'); });
        var shown = 0;
        cards.forEach(function(c){
          var on = f === 'all' || c.getAttribute('data-kind') === f;
          c.hidden = !on; if (on) shown++;
        });
        if (live) live.textContent = 'Показано кейсов: ' + shown;
      });
    });
  });

  /* hidden tabs stop all loops */
  doc.addEventListener('visibilitychange', function(){ body.classList.toggle('paused', doc.hidden); });

  /* reduced motion, honored live in both directions */
  rm.addEventListener('change', function(e){
    if (e.matches){
      body.classList.add('pinned');
      entering.forEach(function(el){ el.classList.add('in'); });
      doc.querySelectorAll('[data-to]').forEach(finishCount);
    } else {
      body.classList.remove('pinned');
    }
  });
})();
