(function(){
  "use strict";

  var LEAD_EMAIL = 'ipranichnikov@yandex.ru';

  var doc = document, body = doc.body;
  var rm = matchMedia('(prefers-reduced-motion: reduce)');

  doc.documentElement.classList.add('ready');

  /* ambient dust: white particles drift slowly upward and twinkle on one fixed canvas behind the page;
     nearer (larger) specks move faster, the loop sleeps while the tab is hidden, reduced motion gets a still field */
  (function(){
    var env = doc.getElementById('env');
    if (!env) return;
    var cv = doc.createElement('canvas');
    cv.className = 'env-dust';
    var cx = cv.getContext && cv.getContext('2d');
    if (!cx) return;
    env.appendChild(cv);
    var W = 0, H = 0, dpr = 1, parts = [], raf = null, last = 0;

    var seed = function(p, anywhere){
      var depth = Math.random();                       // 0 far, 1 near
      p.r = .45 + depth * depth * 1.65;
      p.x = Math.random() * W;
      p.y = anywhere ? Math.random() * H : H + 8;
      p.vy = -(5 + depth * 22);                         // px per second, upward
      p.sway = 6 + Math.random() * 14;
      p.swayT = .15 + Math.random() * .35;
      p.ph = Math.random() * Math.PI * 2;
      p.a = .3 + depth * .6;
      p.tw = .6 + Math.random() * 1.8;
      p.glow = p.r > 1.35;
    };
    var size = function(){
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var want = Math.round(Math.max(48, Math.min(140, W * H / 11000)));
      while (parts.length < want){ var p = {}; seed(p, true); parts.push(p); }
      parts.length = want;
    };
    var draw = function(t){
      cx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++){
        var p = parts[i];
        var x = p.x + Math.sin(t * p.swayT + p.ph) * p.sway;
        var a = p.a * (.55 + .45 * Math.sin(t * p.tw + p.ph));
        if (p.glow){
          cx.fillStyle = 'rgba(236,242,244,' + (a * .16).toFixed(3) + ')';
          cx.beginPath(); cx.arc(x, p.y, p.r * 3.2, 0, 6.2832); cx.fill();
        }
        cx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
        cx.beginPath(); cx.arc(x, p.y, p.r, 0, 6.2832); cx.fill();
      }
    };
    var frame = function(now){
      var dt = Math.min(.05, (now - (last || now)) / 1000);
      last = now;
      for (var i = 0; i < parts.length; i++){
        var p = parts[i];
        p.y += p.vy * dt;
        if (p.y < -8) seed(p, false);
      }
      draw(now / 1000);
      raf = requestAnimationFrame(frame);
    };
    var run = function(){
      if (raf !== null){ cancelAnimationFrame(raf); raf = null; }
      last = 0;
      if (rm.matches){ draw(0); return; }
      if (!doc.hidden) raf = requestAnimationFrame(frame);
    };
    var resizeTick = null;
    addEventListener('resize', function(){
      if (resizeTick === null) resizeTick = requestAnimationFrame(function(){ resizeTick = null; size(); if (rm.matches) draw(0); });
    }, {passive:true});
    doc.addEventListener('visibilitychange', run);
    rm.addEventListener('change', run);
    size();
    run();
  })();

  /* header */
  var head = doc.getElementById('head');
  var burger = doc.getElementById('burger');
  var menu = doc.getElementById('menu');
  if (head){
    var alwaysSolid = head.hasAttribute('data-solid');
    var solid = false;
    var lastHeadY = Math.max(0, window.scrollY || 0);
    var headTravel = 0;
    var headIdleTimer = null;
    var revealHead = function(){
      head.classList.remove('is-hidden');
    };
    var setHeaderState = function(){
      var y = Math.max(0, window.scrollY || 0);
      var wantSolid = alwaysSolid || y > 24;
      if (wantSolid !== solid){ solid = wantSolid; head.classList.toggle('solid', wantSolid); }

      /* Keep the site identity and menu permanently visible while scrolling. */
      revealHead();
      headTravel = 0;
      lastHeadY = y;
      if (headIdleTimer !== null){ clearTimeout(headIdleTimer); headIdleTimer = null; }
    };
    addEventListener('scroll', setHeaderState, {passive:true});
    setHeaderState();

    var closeMenu = function(returnFocus){
      head.classList.remove('open');
      body.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Открыть меню');
      lastHeadY = Math.max(0, window.scrollY || 0);
      headTravel = 0;
      if (returnFocus) burger.focus();
    };
    if (burger && menu){
      burger.addEventListener('click', function(){
        var open = !head.classList.contains('open');
        head.classList.toggle('open', open);
        body.classList.toggle('menu-open', open);
        if (open){
          revealHead();
          headTravel = 0;
        }
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
        if (open){ var first = menu.querySelector('a'); if (first) first.focus(); }
      });
      menu.addEventListener('click', function(e){ if (e.target.closest('a')) closeMenu(false); });
      doc.addEventListener('keydown', function(e){ if (e.key === 'Escape' && head.classList.contains('open')) closeMenu(true); });
      matchMedia('(min-width: 881px)').addEventListener('change', function(e){ if (e.matches) closeMenu(false); });
    }
  }

  /* entrances */
  var entering = doc.querySelectorAll('.rise, [data-in]');
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {rootMargin:'0px 0px -10% 0px', threshold:.06});
    entering.forEach(function(el){
      // the first screen enters at once, so a button near the bottom edge of a phone is not left invisible
      if (el.closest('.hero')) el.classList.add('in'); else io.observe(el);
    });
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

  /* brief: three steps, sent through brief.php, with mailto and copy as the fallback */
  var brief = doc.getElementById('brief');
  if (brief){
    var bSteps = [].slice.call(brief.querySelectorAll('.bstep'));
    var last = bSteps.length - 1;
    var rail = doc.getElementById('rail');
    var railBtns = rail ? [].slice.call(rail.querySelectorAll('button')) : [];
    var bProg = doc.getElementById('brief-prog');
    var bCount = doc.getElementById('brief-count');
    var bCard = doc.getElementById('brief-card');
    var bBack = brief.querySelector('[data-back]'), bNext = brief.querySelector('[data-next]'), bSend = brief.querySelector('[data-submit]');
    var BRIEF_ENDPOINT = 'brief.php';
    var bOk = doc.getElementById('brief-ok'), bCopied = doc.getElementById('brief-copied');
    var bSent = doc.getElementById('brief-sent'), bFail = doc.getElementById('brief-fail');
    var bAns = doc.getElementById('brief-ans'), bPre = doc.getElementById('brief-text'), bMail = doc.getElementById('brief-mail');
    var TG = /^(?:@|(?:https?:\/\/)?t(?:elegram)?\.me\/)?[A-Za-z0-9_]{4,32}\/?$/;
    var cur = 0, reached = 0, briefText = '', mailHref = '';

    var valueOf = function(q){
      if (q.querySelector('input[type="radio"]')){
        var r = q.querySelector('input[type="radio"]:checked');
        return r ? r.value : '';
      }
      var f = q.querySelector('input, textarea');
      return f ? f.value.trim() : '';
    };
    var problemOf = function(q){
      var v = valueOf(q), kind = q.getAttribute('data-check');
      if (!v) return q.hasAttribute('data-req') ? (q.getAttribute('data-msg') || 'Ответьте на этот вопрос') : '';
      if (kind === 'phone' && v.replace(/\D/g, '').length < 10) return 'Проверьте номер: в нём должно быть не меньше 10 цифр';
      if (kind === 'tg' && !TG.test(v.replace(/\s/g, ''))) return 'Напишите ник в виде @username или ссылку t.me/username';
      return '';
    };
    var markQ = function(q, msg){
      var e = q.querySelector('.ferr'), errId = q.id + '-e';
      if (msg){
        if (!e){ e = doc.createElement('p'); e.className = 'ferr'; e.id = errId; q.appendChild(e); }
        if (e.textContent !== msg) e.textContent = msg;
      } else if (e){ e.parentNode.removeChild(e); }
      q.classList.toggle('bad', !!msg);
      q.querySelectorAll('input, textarea').forEach(function(f){
        if (f.getAttribute('data-desc') === null) f.setAttribute('data-desc', f.getAttribute('aria-describedby') || '');
        var desc = (f.getAttribute('data-desc') + (msg ? ' ' + errId : '')).trim();
        if (desc) f.setAttribute('aria-describedby', desc); else f.removeAttribute('aria-describedby');
        if (msg) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid');
      });
    };
    var stepOk = function(i){
      return [].every.call(bSteps[i].querySelectorAll('.bq'), function(q){ return !problemOf(q); });
    };
    var checkStep = function(i){
      var first = null;
      bSteps[i].querySelectorAll('.bq').forEach(function(q){
        var msg = problemOf(q);
        markQ(q, msg);
        if (msg && !first) first = q;
      });
      if (first){
        first.scrollIntoView({block:'center', behavior: rm.matches ? 'auto' : 'smooth'});
        var f = first.querySelector('input:checked') || first.querySelector('input, textarea');
        if (f) f.focus({preventScroll:true});
      }
      return !first;
    };
    var narrow = matchMedia('(max-width:900px)');
    var toCardTop = function(){
      var anchor = narrow.matches && rail ? rail : bCard;
      var gap = (head ? head.getBoundingClientRect().height : 72) + 24;
      var top = anchor.getBoundingClientRect().top;
      if (top < gap || top > innerHeight * 0.5) scrollTo({top: scrollY + top - gap, behavior: rm.matches ? 'auto' : 'smooth'});
    };
    var setProgress = function(barP, railP){
      bProg.style.setProperty('--p', barP.toFixed(4));
      if (rail) rail.style.setProperty('--p', railP.toFixed(4));
    };
    var showStep = function(i, move){
      cur = i;
      if (i > reached) reached = i;
      bSteps.forEach(function(s, n){ s.hidden = n !== i; });
      var s = bSteps[i];
      s.classList.remove('enter'); void s.offsetWidth; s.classList.add('enter');
      bBack.hidden = i === 0;
      bNext.hidden = i === last;
      bSend.hidden = i !== last;
      bCount.textContent = 'Шаг ' + (i + 1) + ' из ' + bSteps.length;
      setProgress((i + 1) / bSteps.length, i / last);
      railBtns.forEach(function(b, n){
        b.disabled = n > reached;
        b.classList.toggle('done', n < i);
        if (n === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      });
      if (move){
        toCardTop();
        s.querySelector('h2').focus({preventScroll:true});
      }
    };
    var buildText = function(){
      var out = ['Бриф с сайта Pryanik Studio'];
      bSteps.forEach(function(s, n){
        out.push('', (n + 1) + '. ' + s.getAttribute('data-title').toUpperCase());
        s.querySelectorAll('.bq').forEach(function(q){
          out.push(q.getAttribute('data-q') + ': ' + (valueOf(q) || 'не указано'));
        });
      });
      return out.join('\n').trim();
    };

    bNext.addEventListener('click', function(){ if (checkStep(cur)) showStep(cur + 1, true); });
    bBack.addEventListener('click', function(){ showStep(cur - 1, true); });
    railBtns.forEach(function(b){
      b.addEventListener('click', function(){
        var n = parseInt(b.getAttribute('data-step'), 10);
        if (n === cur || n > reached) return;
        if (n > cur && !checkStep(cur)) return;
        showStep(n, true);
      });
    });
    var clearIfFixed = function(e){
      var q = e.target.closest('.bq');
      if (q && q.classList.contains('bad') && !problemOf(q)) markQ(q, '');
    };
    brief.addEventListener('input', clearIfFixed);
    brief.addEventListener('change', clearIfFixed);

    brief.addEventListener('submit', function(e){
      e.preventDefault();
      if (cur < last){ if (checkStep(cur)) showStep(cur + 1, true); return; }
      for (var i = 0; i <= last; i++){
        if (!stepOk(i)){ if (i !== cur) showStep(i, false); checkStep(i); return; }
      }
      bSend.disabled = true;
      bSend.textContent = 'Отправляем';
      brief.setAttribute('aria-busy', 'true');
      sendBrief().then(function(){ finishBrief(true); }, function(){ finishBrief(false); });
    });

    /* direct send through brief.php on the hosting; anything else falls back to mailto */
    var sendBrief = function(){
      if (!window.fetch || !window.FormData || location.protocol === 'file:') return Promise.reject();
      var ctrl = 'AbortController' in window ? new AbortController() : null;
      var timer = setTimeout(function(){ if (ctrl) ctrl.abort(); }, 15000);
      return fetch(BRIEF_ENDPOINT, {method:'POST', body:new FormData(brief), headers:{'Accept':'application/json'}, signal: ctrl ? ctrl.signal : undefined})
        .then(function(r){ return r.json(); })
        .then(function(d){
          clearTimeout(timer);
          if (!d || d.ok !== true) throw new Error('brief not sent');
        }, function(err){ clearTimeout(timer); throw err; });
    };
    var finishBrief = function(sent){
      bSend.disabled = false;
      bSend.textContent = 'Отправить бриф';
      brief.removeAttribute('aria-busy');
      bSent.hidden = !sent;
      bFail.hidden = sent;
      brief.hidden = true;
      bOk.hidden = false;
      setProgress(1, 1);
      railBtns.forEach(function(b){ b.classList.add('done'); b.removeAttribute('aria-current'); b.disabled = true; });
      toCardTop();
      bOk.focus({preventScroll:true});
      if (sent) return;
      briefText = buildText();
      mailHref = 'mailto:' + LEAD_EMAIL + '?subject=' + encodeURIComponent('Бриф: ' + brief.elements.name.value.trim()) + '&body=' + encodeURIComponent(briefText.replace(/\n/g, '\r\n'));
      bPre.textContent = briefText;
      bMail.href = mailHref;
      bCopied.textContent = '';
      location.href = mailHref;
    };

    var bRetry = doc.getElementById('brief-retry');
    bRetry.addEventListener('click', function(){
      bRetry.disabled = true;
      bRetry.textContent = 'Отправляем';
      sendBrief().then(function(){ finishBrief(true); }, function(){
        bCopied.textContent = 'Снова не получилось. Откройте письмо в почте или напишите в Telegram.';
      }).then(function(){
        bRetry.disabled = false;
        bRetry.textContent = 'Попробовать отправить ещё раз';
      });
    });

    doc.getElementById('brief-edit').addEventListener('click', function(){
      bOk.hidden = true;
      brief.hidden = false;
      showStep(last, true);
    });
    doc.getElementById('brief-copy').addEventListener('click', function(){
      var done = function(){ bCopied.textContent = 'Ответы скопированы. Вставьте их в сообщение в Telegram.'; };
      var fail = function(){ bCopied.textContent = 'Скопировать не получилось. Ответы открыты ниже, их можно выделить вручную.'; bAns.open = true; };
      var legacy = function(){
        var t = doc.createElement('textarea');
        t.value = briefText;
        t.setAttribute('readonly', '');
        t.style.position = 'fixed'; t.style.top = '0'; t.style.opacity = '0';
        body.appendChild(t);
        t.select();
        var ok = false;
        try { ok = doc.execCommand('copy'); } catch (err) {}
        body.removeChild(t);
        if (ok) done(); else fail();
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(briefText).then(done, legacy);
      else legacy();
    });

    showStep(0, false);
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

  /* ticker bands: second copy of the group for a seamless loop */
  doc.querySelectorAll('.tk-track').forEach(function(t){
    var g = t.querySelector('.tk-g');
    if (g && t.children.length === 1) t.appendChild(g.cloneNode(true));
  });

  /* looping decorations run only while on screen */
  var liveEls = doc.querySelectorAll('[data-live]');
  if (liveEls.length && 'IntersectionObserver' in window){
    var lio = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.target.classList.contains('live') !== e.isIntersecting) e.target.classList.toggle('live', e.isIntersecting); });
    });
    liveEls.forEach(function(el){ lio.observe(el); });
  } else {
    liveEls.forEach(function(el){ el.classList.add('live'); });
  }


  /* spatial case carousel: the centre card in focus, neighbours fan back in depth */
  var spStage = doc.getElementById('sp-stage');
  if (spStage){
    var spDeck = doc.getElementById('sp-deck');
    var spAll = [].slice.call(spDeck.querySelectorAll('.sp-card'));
    var spList = spAll.slice();
    var spTitle = doc.getElementById('sp-title'), spPos = doc.getElementById('sp-pos'), spMini = doc.getElementById('sp-mini');
    var spProg = doc.getElementById('sp-progress'), spPlay = doc.getElementById('sp-play');
    var spChips = [].slice.call(doc.querySelectorAll('.sp-chip'));
    var spNarrow = matchMedia('(max-width:720px)');
    var SP_DUR = 4800;
    // the control dock is optional; without it (and so without a pause button) the deck never turns by itself
    var spActive = 0, spPlaying = !rm.matches && !!spPlay, spSeen = false, spCounted = false, spHover = false, spTimer = null, spDragged = false;
    var pad2 = function(n){ return (n < 10 ? '0' : '') + n; };

    var spCount = function(card){
      var el = card && card.querySelector('.spc-num');
      if (!el) return;
      var to = parseInt(el.getAttribute('data-n'), 10), suf = el.getAttribute('data-s') || '';
      var final = fmt(to) + suf;
      if (rm.matches || !to){ el.textContent = final; return; }
      var t0 = performance.now(), last = '';
      var step = function(now){
        if (!card.classList.contains('is-active')){ el.textContent = final; return; }
        var p = Math.min(1, (now - t0) / 900);
        var txt = fmt(Math.round(to * (1 - Math.pow(1 - p, 3)))) + suf;
        if (txt !== last){ last = txt; el.textContent = txt; }
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    var spPosF = 0, spRaf = null, spSwapRaf = null, spLastT = 0, spShown = null, spScrub = false;
    var spDots = doc.getElementById('sp-dots'), spDotOn = -1;

    var spFine = matchMedia('(hover: hover) and (pointer: fine)');

    /* p is a fractional deck position, so the cursor can hold the deck between two cards */
    var spLayout = function(p){
      if (p === undefined) p = spActive;
      var n = spList.length;
      var W = n ? spList[0].offsetWidth : 300;
      var m = spNarrow.matches;
      var gap = m ? 10 : Math.max(28, Math.min(44, W * .12));
      var step = W + gap;
      var act = n ? ((Math.round(p) % n) + n) % n : 0;

      spActive = act;
      if (spDotOn !== act){ spDotOn = act; spSyncDots(); }

      spAll.forEach(function(c){
        var i = spList.indexOf(c);
        if (i < 0){
          c.style.transform = 'translate(-50%,-50%) translate3d(0,30px,0) scale(.78)';
          c.style.opacity = '0';
          c.style.zIndex = '1';
          c.style.pointerEvents = 'none';
          c.classList.add('sp-out');
          c.classList.remove('is-active');
          c.tabIndex = -1;
          c.setAttribute('aria-hidden', 'true');
          return;
        }

        c.classList.remove('sp-out');
        var d = i - p;
        d = (((d + n / 2) % n) + n) % n - n / 2;
        var a = Math.abs(d);

        /* spatial ribbon: every card owns its own lane, so cards never overlap */
        var x = d * step;
        var focus = Math.max(0, 1 - Math.min(1, a));
        var y = 0;
        var sc = Math.max(.78, 1 - Math.min(a, 2.75) * (m ? .075 : .085)) + focus * (m ? .058 : .05);
        var op = Math.max(0, 1 - a * (m ? .38 : .32));
        var dim = Math.min(.58, a * .20);
        var depth = Math.max(Math.min(.65, a * .22), focus * .2);
        var photoX = Math.max(-8, Math.min(8, -d * 4));
        var photoScale = 1.035 + Math.min(.01, a * .004) + focus * .012;
        var contentO = Math.max(.58, 1 - a * .2);
        var contentY = Math.min(6, a * 3);
        var on = i === act;

        c.style.transform = 'translate(-50%,-50%) translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + sc.toFixed(3) + ')';
        c.style.opacity = op.toFixed(3);
        c.style.zIndex = String(on ? 200 : 100 - Math.round(a * 10));
        c.style.pointerEvents = op < .08 ? 'none' : '';

        c.style.setProperty('--dim', dim.toFixed(3));
        c.style.setProperty('--depth', depth.toFixed(3));
        c.style.setProperty('--photo-x', photoX.toFixed(1) + 'px');
        c.style.setProperty('--photo-scale', photoScale.toFixed(4));
        c.style.setProperty('--light-x', '50%');
        c.style.setProperty('--shade-dir', 'to bottom');
        c.style.setProperty('--shadow-x', '0px');
        c.style.setProperty('--content-o', contentO.toFixed(3));
        c.style.setProperty('--content-y', contentY.toFixed(1) + 'px');

        if (c.classList.contains('is-active') !== on) c.classList.toggle('is-active', on);
        if (c.tabIndex !== (on ? 0 : -1)) c.tabIndex = on ? 0 : -1;
        if (c.getAttribute('aria-hidden') !== (on ? 'false' : 'true')) c.setAttribute('aria-hidden', on ? 'false' : 'true');
      });

      var cur = spList[act];
      if (!cur || cur === spShown) return;
      spShown = cur;
      if (spTitle) spTitle.textContent = cur.querySelector('.spc-title').textContent;
      if (spPos) spPos.textContent = pad2(act + 1) + ' / ' + pad2(n);
      var v = (cur.className.match(/\bv-[a-z]+/) || [''])[0];
      if (spMini) spMini.className = 'sp-mini ' + v;
      spStage.setAttribute('data-glow', v);
      spCount(cur);
    };

    /* desktop joystick: cursor right of centre rolls the deck forward without end, left rolls it back,
       the further from centre the faster. In the centre the deck glides onto the nearest card */
    var SP_VMAX = 3.2;          // cards per second at the very edge
    var SP_DEAD = .16;          // calm zone around the centre, as a share of half the stage
    var spVel = 0, spMouseX = 0, spRect = null, spRest = null, spLayerDir = 1;
    var spFrame = function(now){
      var dt = Math.min(100, now - (spLastT || now));
      spLastT = now;
      var n = spList.length;
      if (!spScrub || n < 2 || !spRect){ spRaf = null; spLastT = 0; return; }
      var half = spRect.width / 2;
      var off = Math.max(-1, Math.min(1, (spMouseX - (spRect.left + half)) / half));
      var mag = Math.abs(off);
      var want = mag < SP_DEAD ? 0 : (off < 0 ? -1 : 1) * Math.pow((mag - SP_DEAD) / (1 - SP_DEAD), 1.5) * SP_VMAX;
      var ease = function(r){ return rm.matches ? 1 : 1 - Math.pow(1 - r, dt / 16.667); };
      if (want !== 0){
        spRest = null;
        spLayerDir = want < 0 ? -1 : 1;
        spVel += (want - spVel) * ease(.06);
        spPosF += spVel * dt / 1000;
      } else {
        if (spRest === null){
          spRest = Math.round(spPosF + spVel * .3);
          if (Math.abs(spRest - spPosF) > .001) spLayerDir = spRest < spPosF ? -1 : 1;
        }   // coast a little in the direction of travel
        spVel = 0;
        spPosF += (spRest - spPosF) * ease(.08);
        if (Math.abs(spRest - spPosF) < .001){
          spPosF = spRest;
          spLayout(spPosF);
          spRaf = null; spLastT = 0;
          return;
        }
      }
      spLayout(spPosF);
      spRaf = requestAnimationFrame(spFrame);
    };

    var spRestart = function(){
      clearTimeout(spTimer);
      var running = spPlaying && spSeen && !spHover && !doc.hidden && spList.length > 1;
      if (spProg){
        spProg.classList.remove('run');
        void spProg.offsetWidth;
        if (spPlaying && !rm.matches && spList.length > 1) spProg.classList.add('run');
        spProg.classList.toggle('hold', !running);
      }
      if (running) spTimer = setTimeout(function(){ spGo(spActive + 1); }, SP_DUR);
    };

    var spGo = function(i){
      var n = spList.length;
      if (!n) return;
      if (spRaf !== null){ cancelAnimationFrame(spRaf); spRaf = null; spLastT = 0; }
      if (spSwapRaf !== null){ cancelAnimationFrame(spSwapRaf); spSwapRaf = null; }
      spStage.classList.remove('swapping');

      var from = spPosF;
      if (!isFinite(from)) from = spActive;
      var next = ((i % n) + n) % n;
      var target = next;
      while (target - from > n / 2) target -= n;
      while (target - from < -n / 2) target += n;

      var delta = target - from;
      if (Math.abs(delta) < .001){
        spActive = next;
        spPosF = target;
        spLayout(target);
        spRestart();
        return;
      }

      spRest = null;
      if (rm.matches){
        spPosF = target;
        spLayout(target);
        spRestart();
        return;
      }

      spStage.classList.add('swapping');
      var t0 = performance.now();
      var dur = 520;
      var frame = function(now){
        var t = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - t, 4);
        spPosF = from + delta * e;
        spLayout(spPosF);
        if (t < 1){
          spSwapRaf = requestAnimationFrame(frame);
        } else {
          spSwapRaf = null;
          spPosF = target;
          spActive = next;
          spLayout(target);
          spStage.classList.remove('swapping');
          spRestart();
        }
      };
      spSwapRaf = requestAnimationFrame(frame);
    };

    var spSetPlaying = function(on){
      spPlaying = on && !!spPlay;
      if (spPlay){
        spPlay.setAttribute('aria-pressed', spPlaying ? 'true' : 'false');
        spPlay.setAttribute('aria-label', spPlaying ? 'Пауза' : 'Листать автоматически');
      }
      spRestart();
    };

    /* dots are rebuilt whenever the filter changes the deck, so their count always matches what is on stage */
    /* only three dots ever show, and they page rather than follow: the marker walks left to right through a
       group of three, then the group turns over. holding the current card in the middle would pin the lit dot
       in place for every card but the first and the last, which reads as a control that does not work */
    var SP_DOTS = 3;
    var spSyncDots = function(){
      if (!spDots) return;
      var ds = spDots.children, k = ds.length, n = spList.length;
      if (!k) return;
      var start = Math.max(0, Math.min(Math.floor(spActive / k) * k, n - k));
      for (var i = 0; i < k; i++){
        var idx = start + i, on = idx === spActive;
        ds[i].setAttribute('data-i', idx);
        ds[i].setAttribute('aria-label', 'Кейс ' + (idx + 1) + ' из ' + n);
        ds[i].classList.toggle('is-on', on);
        if (on) ds[i].setAttribute('aria-current', 'true'); else ds[i].removeAttribute('aria-current');
      }
    };
    var spBuildDots = function(){
      if (!spDots) return;
      var k = Math.min(SP_DOTS, spList.length);
      spDots.textContent = '';
      for (var i = 0; i < k; i++){
        var b = doc.createElement('button');
        b.type = 'button';
        b.className = 'sp-dot';
        b.addEventListener('click', function(){ spGo(+this.getAttribute('data-i')); });
        spDots.appendChild(b);
      }
      spDotOn = -1;
      spSyncDots();
    };

    var spPrev = doc.getElementById('sp-prev'), spNext = doc.getElementById('sp-next');
    if (spPrev) spPrev.addEventListener('click', function(){ spGo(spActive - 1); });
    if (spNext) spNext.addEventListener('click', function(){ spGo(spActive + 1); });
    if (spPlay) spPlay.addEventListener('click', function(){ spSetPlaying(!spPlaying); });

    var spFilterSelect = doc.getElementById('sp-filter-select');
    var spFilterTrigger = spFilterSelect && spFilterSelect.querySelector('.sp-filter-trigger');
    var spFilterCurrent = spFilterSelect && spFilterSelect.querySelector('.sp-filter-current');
    var spFilterOptions = spFilterSelect ? Array.from(spFilterSelect.querySelectorAll('.sp-filter-option')) : [];
    var spFilterLabels = {all:'Все проекты',marketing:'Маркетинг',smm:'SMM',video:'Видеопродакшн',it:'IT'};

    var spSetFilterMenu = function(open){
      if (!spFilterSelect || !spFilterTrigger) return;
      spFilterSelect.classList.toggle('is-open', open);
      spFilterTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open){
        var activeOpt = spFilterSelect.querySelector('.sp-filter-option.is-active');
        if (activeOpt) activeOpt.focus();
      }
    };

    var spApplyFilter = function(f, source){
      spChips.forEach(function(x){ x.setAttribute('aria-pressed', x.getAttribute('data-f') === f ? 'true' : 'false'); });
      spFilterOptions.forEach(function(x){
        var on = x.getAttribute('data-f') === f;
        x.classList.toggle('is-active', on);
        x.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      if (spFilterCurrent) spFilterCurrent.textContent = spFilterLabels[f] || 'Все проекты';
      spList = spAll.filter(function(c){ return f === 'all' || c.getAttribute('data-kind') === f; });
      spShown = null;
      spBuildDots();
      spGo(0);
      spSetFilterMenu(false);
      if (source && matchMedia('(max-width: 720px) and (pointer: coarse)').matches){
        source.scrollIntoView({behavior:rm.matches ? 'auto' : 'smooth',block:'nearest',inline:'center'});
      }
    };

    spChips.forEach(function(ch){
      ch.addEventListener('click', function(){
        spApplyFilter(ch.getAttribute('data-f'), ch);
      });
    });

    if (spFilterTrigger){
      spFilterTrigger.addEventListener('click', function(){
        spSetFilterMenu(!spFilterSelect.classList.contains('is-open'));
      });
    }
    spFilterOptions.forEach(function(opt){
      opt.addEventListener('click', function(){ spApplyFilter(opt.getAttribute('data-f'), null); });
      opt.addEventListener('keydown', function(e){
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        var i = spFilterOptions.indexOf(opt);
        var next = e.key === 'ArrowDown' ? i + 1 : i - 1;
        next = (next + spFilterOptions.length) % spFilterOptions.length;
        spFilterOptions[next].focus();
      });
    });
    doc.addEventListener('click', function(e){
      if (spFilterSelect && spFilterSelect.classList.contains('is-open') && !spFilterSelect.contains(e.target)) spSetFilterMenu(false);
    });
    doc.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && spFilterSelect && spFilterSelect.classList.contains('is-open')){
        spSetFilterMenu(false);
        if (spFilterTrigger) spFilterTrigger.focus();
      }
    });

    spAll.forEach(function(c){
      c.addEventListener('click', function(e){
        if (spDragged){ e.preventDefault(); return; }
        if (!c.classList.contains('is-active')){ e.preventDefault(); spGo(spList.indexOf(c)); }
      });
      c.addEventListener('dragstart', function(e){ e.preventDefault(); });
    });

    var spKick = function(){ if (spRaf === null) spRaf = requestAnimationFrame(spFrame); };
    spStage.addEventListener('mouseenter', function(e){
      if (!spFine.matches) return;
      if (spSwapRaf !== null){ cancelAnimationFrame(spSwapRaf); spSwapRaf = null; }
      spStage.classList.remove('swapping');
      spScrub = true;
      spRect = spStage.getBoundingClientRect();
      spMouseX = e.clientX;
      spPosF = spActive;
      spVel = 0;
      spRest = null;
      spStage.classList.add('scrub');
      spKick();
    });
    spStage.addEventListener('mousemove', function(e){
      if (!spScrub) return;
      spMouseX = e.clientX;
      spKick();
    });
    addEventListener('scroll', function(){ if (spScrub) spRect = spStage.getBoundingClientRect(); }, {passive:true});
    spStage.addEventListener('mouseleave', function(){
      if (!spScrub) return;
      spScrub = false;
      spStage.classList.remove('scrub');
      var land = Math.round(spPosF + spVel * .3);
      spVel = 0;
      spGo(land);
    });

    /* touch: RAF-driven direct follow. Read layout once, paint at most once per frame,
       and defer active-card/UI state changes until the finger is released. */
    var spDown = false, spX = 0, spY = 0, spLastX = 0, spStartT = 0, spAxis = '', spPointerId = null, spEdgeBlocked = false;
    var spTouchBase = 0, spTouchStep = 310, spTouchPos = 0, spTouchRaf = null;

    var spTouchPaint = function(){
      spTouchRaf = null;
      if (!spDown || spAxis !== 'x') return;
      var p = spTouchPos, n = spList.length;
      spList.forEach(function(card, i){
        var d = i - p;
        d = (((d + n / 2) % n) + n) % n - n / 2;
        var a = Math.abs(d);
        var focus = Math.max(0, 1 - Math.min(1, a));
        var sc = Math.max(.78, 1 - Math.min(a, 2.75) * .075) + focus * .058;
        var op = Math.max(0, 1 - a * .38);
        card.style.transform = 'translate(-50%,-50%) translate3d(' + (d * spTouchStep).toFixed(1) + 'px,0,0) scale(' + sc.toFixed(3) + ')';
        card.style.opacity = op.toFixed(3);
        card.style.zIndex = String(100 - Math.round(a * 10));
      });
    };
    var spTouchQueue = function(){
      if (spTouchRaf === null) spTouchRaf = requestAnimationFrame(spTouchPaint);
    };

    spStage.addEventListener('pointerdown', function(e){
      if (e.pointerType === 'mouse') return;
      var edgeGuard = Math.max(22, Math.min(34, innerWidth * .07));
      spEdgeBlocked = e.clientX <= edgeGuard || e.clientX >= innerWidth - edgeGuard;
      if (spEdgeBlocked) return;
      if (spSwapRaf !== null){ cancelAnimationFrame(spSwapRaf); spSwapRaf = null; }
      spStage.classList.remove('swapping');
      spDown = true; spDragged = false; spAxis = ''; spPointerId = e.pointerId;
      /* Dating-app style: the card owns the touch immediately. This prevents Safari
         from cancelling the pointer stream when the thumb initially drifts vertically. */
      if (spStage.setPointerCapture) try { spStage.setPointerCapture(e.pointerId); } catch (_) {}
      spX = spLastX = e.clientX; spY = e.clientY; spStartT = performance.now();
      spTouchBase = spActive;
      spTouchPos = spPosF = spActive;
      var W = spList.length ? spList[0].getBoundingClientRect().width : 300;
      spTouchStep = W + 10;
    });

    spStage.addEventListener('pointermove', function(e){
      if (!spDown) return;
      var dx = e.clientX - spX, dy = e.clientY - spY;
      spLastX = e.clientX;
      if (!spAxis){
        /* Card-first gesture. Inside the deck, vertical thumb drift is treated as part of
           the horizontal card gesture rather than handing control back to page scrolling. */
        if (Math.hypot(dx, dy) < 6) return;
        spAxis = 'x';
      }
      if (!spDragged){
        spDragged = true;
        spStage.classList.add('dragging');
        /* pointer already captured on pointerdown */
      }
      /* Fold the diagonal component into horizontal travel. A natural thumb arc therefore
         advances the carousel instead of feeling weaker than a perfectly straight swipe. */
      var sx = dx < 0 ? -1 : 1;
      var dragX = Math.abs(dx) < 1 ? 0 : sx * Math.hypot(dx, dy * .62);
      spTouchPos = spTouchBase - dragX / spTouchStep;
      spPosF = spTouchPos;
      spTouchQueue();
    }, {passive:true});

    var spTouchEnd = function(e, cancelled){
      if (!spDown) return;
      spDown = false;
      if (spTouchRaf !== null){ cancelAnimationFrame(spTouchRaf); spTouchRaf = null; }
      var dx = (e && isFinite(e.clientX) ? e.clientX : spLastX) - spX;
      var dt = Math.max(1, performance.now() - spStartT);
      var dy = (e && isFinite(e.clientY) ? e.clientY : spY) - spY;
      var sx = dx < 0 ? -1 : 1;
      var dragX = Math.abs(dx) < 1 ? 0 : sx * Math.hypot(dx, dy * .62);
      var vx = dragX / dt;
      var target = spTouchBase;
      if (!cancelled && spAxis === 'x' && (Math.abs(dragX) > 5 || Math.abs(vx) > .06)){
        target += dragX < 0 ? 1 : -1;
      } else if (cancelled && spAxis === 'x'){
        target = Math.round(spTouchPos);
      }
      spStage.classList.remove('dragging');
      spPosF = spTouchPos;
      spGo(target);
      setTimeout(function(){ spDragged = false; spAxis = ''; }, 0);
    };
    spStage.addEventListener('pointerup', function(e){ spTouchEnd(e, false); });
    spStage.addEventListener('pointercancel', function(e){ spTouchEnd(e, true); });

    spStage.addEventListener('keydown', function(e){
      if (e.key === 'ArrowRight'){ e.preventDefault(); spGo(spActive + 1); }
      else if (e.key === 'ArrowLeft'){ e.preventDefault(); spGo(spActive - 1); }
    });

    var spWheel = 0, spWheelLock = 0;
    spStage.addEventListener('wheel', function(e){
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      var now = performance.now();
      if (now < spWheelLock) return;
      spWheel += e.deltaX;
      if (Math.abs(spWheel) > 40){ spGo(spActive + (spWheel > 0 ? 1 : -1)); spWheel = 0; spWheelLock = now + 650; }
    }, {passive:false});

    spStage.addEventListener('mouseenter', function(){ spHover = true; spRestart(); });
    spStage.addEventListener('mouseleave', function(){ spHover = false; spRestart(); });
    doc.addEventListener('visibilitychange', spRestart);
    rm.addEventListener('change', function(e){ if (e.matches) spSetPlaying(false); });

    var spTick = null;
    addEventListener('resize', function(){
      if (spTick === null) spTick = requestAnimationFrame(function(){ spTick = null; spLayout(); });
    }, {passive:true});

    if ('IntersectionObserver' in window){
      new IntersectionObserver(function(es){
        spSeen = es[0].isIntersecting;
        if (spSeen && !spCounted){ spCounted = true; spCount(spList[spActive]); }
        spRestart();
      }, {threshold:.35}).observe(spStage);
    } else {
      spSeen = true;
    }

    spBuildDots();
    spStage.classList.add('sp-on');
    spSetPlaying(spPlaying);
    spLayout();
  }

  /* hero spotlight: the lit portrait shows through a soft circle. The circle eases after the cursor, drifts slowly
     over the face when there is no cursor, and widens with scroll until the whole portrait is revealed */
  var hsMedia = doc.getElementById('hs-media');
  if (hsMedia){
    var hsHero = hsMedia.parentNode;
    var hsImg = hsMedia.querySelector('.hs-base');
    var HS_FACE = [.5, .56];                      // face centre as a share of the source image
    var hsW = 0, hsH = 0, hsFx = 0, hsFy = 0, hsR0 = 80, hsSpan = 160, hsRMax = 1200;
    var hsX = 0, hsY = 0, hsR = 0, hsTx = 0, hsTy = 0, hsHasPointer = false, hsLastMove = 0;
    var hsRaf = null, hsLast = 0, hsSeen = true, hsTouching = false, hsPress = 1, hsRect = null, hsTouchRaf = null, hsTouchX = 0, hsTouchY = 0, hsTouchStartX = 0, hsTouchStartY = 0, hsTouchAxis = '', hsEdgeBlocked = false;

    var hsMeasure = function(){
      var r = hsMedia.getBoundingClientRect(), b = hsImg.getBoundingClientRect();
      hsW = r.width; hsH = r.height;
      // on phones the picture box is shorter than the hero, so the face is found inside the box itself
      var iw = hsImg.naturalWidth || 1536, ih = hsImg.naturalHeight || 864;
      var s = Math.max(b.width / iw, b.height / ih);
      var pos = getComputedStyle(hsImg).objectPosition.split(' ');
      var px = parseFloat(pos[0]) / 100, py = parseFloat(pos[1] || '50') / 100;
      hsFx = b.left - r.left + (b.width - iw * s) * px + HS_FACE[0] * iw * s;
      hsFy = b.top - r.top + (b.height - ih * s) * py + HS_FACE[1] * ih * s;
      hsSpan = Math.max(120, Math.min(hsW, hsH) * .2);   // how far the idle light wanders over the face
      hsR0 = hsSpan * .75;                                // resting radius of the light
      hsRMax = Math.hypot(hsW, hsH);
      if (!hsR){ hsX = hsTx = hsFx; hsY = hsTy = hsFy; hsR = hsR0; }
    };
    var hsApply = function(){
      hsMedia.style.setProperty('--sx', hsX.toFixed(1) + 'px');
      hsMedia.style.setProperty('--sy', hsY.toFixed(1) + 'px');
      hsMedia.style.setProperty('--sr', hsR.toFixed(1) + 'px');
    };
    var hsProgress = function(){
      var p = Math.max(0, Math.min(1, scrollY / (hsHero.offsetHeight * .65)));
      return p * p * (3 - 2 * p);                  // smoothstep for a soft start and landing
    };
    var hsFrame = function(now){
      var dt = Math.min(60, now - (hsLast || now)) / 16.667;
      hsLast = now;
      var t = now / 1000, p = hsProgress();
      // without a recent cursor the light wanders gently around the face
      if (!hsTouching && (!hsHasPointer || now - hsLastMove > 3200)){
        hsTx = hsFx + Math.cos(t * .429) * hsSpan * .45 + Math.sin(t * .221) * hsSpan * .2;
        hsTy = hsFy + Math.sin(t * .533) * hsSpan * .28;
      }
      // a finger gets a slightly quicker follow and a soft swell of the light while it rests on the screen
      var follow = 1 - Math.pow(1 - (hsTouching ? .11 : .075), dt), grow = 1 - Math.pow(1 - .09, dt);
      hsX += (hsTx - hsX) * follow;
      hsY += (hsTy - hsY) * follow;
      hsPress += ((hsTouching ? 1.22 : 1) - hsPress) * (1 - Math.pow(1 - .08, dt));
      var breathe = 1 + Math.sin(t * 1.1) * .025;
      var wantR = (hsR0 + (hsRMax - hsR0) * p) * breathe * hsPress;
      hsR += (wantR - hsR) * grow;
      hsApply();
      hsRaf = requestAnimationFrame(hsFrame);
    };
    var hsRun = function(){
      if (hsRaf !== null){ cancelAnimationFrame(hsRaf); hsRaf = null; }
      hsLast = 0;
      if (rm.matches){
        // no easing or drift here, but the light still jumps to where the reader points
        hsX = hsHasPointer ? hsTx : hsFx; hsY = hsHasPointer ? hsTy : hsFy;
        hsR = hsR0 + (hsRMax - hsR0) * Math.max(.45, hsProgress());
        hsApply();
        return;
      }
      if (hsSeen && !doc.hidden) hsRaf = requestAnimationFrame(hsFrame);
    };

    hsHero.addEventListener('pointermove', function(e){
      if (e.pointerType !== 'mouse') return;
      var r = hsMedia.getBoundingClientRect();
      hsTx = e.clientX - r.left; hsTy = e.clientY - r.top;
      hsHasPointer = true; hsLastMove = performance.now();
      if (rm.matches) hsRun();
    }, {passive:true});
    hsHero.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') hsHasPointer = false; });

    // touch: the light goes to the finger on tap and follows it while it slides. Listeners stay passive,
    // so the page still scrolls; after the finger lifts the light holds for a moment, then drifts back
    var hsTouchPaint = function(){
      hsTouchRaf = null;
      if (!hsRect) return;
      hsTx = hsTouchX - hsRect.left; hsTy = hsTouchY - hsRect.top;
      hsHasPointer = true; hsLastMove = performance.now();
      if (rm.matches) hsRun();
    };
    var hsTouchAt = function(e){
      if (hsEdgeBlocked) return;
      var f = e.touches[0];
      if (!f) return;
      hsTouchX = f.clientX; hsTouchY = f.clientY;
      var dx = hsTouchX - hsTouchStartX, dy = hsTouchY - hsTouchStartY;
      if (!hsTouchAxis && Math.hypot(dx, dy) > 7){
        hsTouchAxis = Math.abs(dx) >= Math.abs(dy) * .72 ? 'x' : 'y';
      }
      /* Horizontal/diagonal spotlight movement belongs to the hero interaction, not page scroll.
         Vertical intent is left native so the reader can still move down the page. */
      if (hsTouchAxis === 'x' && e.cancelable) e.preventDefault();
      if (hsTouchRaf === null) hsTouchRaf = requestAnimationFrame(hsTouchPaint);
    };
    hsHero.addEventListener('touchstart', function(e){
      var f = e.touches[0];
      var edgeGuard = Math.max(22, Math.min(34, innerWidth * .07));
      hsEdgeBlocked = !f || f.clientX <= edgeGuard || f.clientX >= innerWidth - edgeGuard;
      if (hsEdgeBlocked){ hsTouching = false; return; }
      hsTouching = true; hsTouchAxis = '';
      hsRect = hsMedia.getBoundingClientRect();
      hsTouchStartX = hsTouchX = f.clientX; hsTouchStartY = hsTouchY = f.clientY;
      hsTouchAt(e);
    }, {passive:true});
    hsHero.addEventListener('touchmove', hsTouchAt, {passive:false});
    var hsTouchEnd = function(e){
      if (e.touches.length) return;
      hsTouching = false; hsTouchAxis = ''; hsLastMove = performance.now(); hsRect = null;
      if (hsTouchRaf !== null){ cancelAnimationFrame(hsTouchRaf); hsTouchRaf = null; }
    };
    hsHero.addEventListener('touchend', hsTouchEnd, {passive:true});
    hsHero.addEventListener('touchcancel', hsTouchEnd, {passive:true});

    /* optional device tilt: permission is requested only from an explicit tap (required by iOS).
       Tilt adds a restrained, smoothed offset to the spotlight without replacing touch control. */
    var hsMotion = doc.getElementById('hs-motion');
    var hsTiltX = 0, hsTiltY = 0, hsTiltTX = 0, hsTiltTY = 0, hsTiltOn = false;
    var hsOrient = function(e){
      if (!hsTiltOn || hsTouching) return;
      var g = Math.max(-18, Math.min(18, Number(e.gamma) || 0));
      var b = Math.max(-18, Math.min(18, (Number(e.beta) || 0) - 45));
      hsTiltTX = g / 18 * 22;
      hsTiltTY = b / 18 * 14;
      hsTiltX += (hsTiltTX - hsTiltX) * .22;
      hsTiltY += (hsTiltTY - hsTiltY) * .22;
      hsTx = hsFx + hsTiltX;
      hsTy = hsFy + hsTiltY;
      hsHasPointer = true;
      hsLastMove = performance.now();
    };
    var hsEnableMotion = function(){
      var D = window.DeviceOrientationEvent;
      var enable = function(){
        hsTiltOn = true;
        addEventListener('deviceorientation', hsOrient, {passive:true});
        if (hsMotion){ hsMotion.textContent = 'Движение включено'; hsMotion.classList.add('is-on'); setTimeout(function(){ hsMotion.hidden = true; }, 900); }
      };
      if (D && typeof D.requestPermission === 'function'){
        D.requestPermission().then(function(state){ if (state === 'granted') enable(); }).catch(function(){});
      } else if ('DeviceOrientationEvent' in window) enable();
    };
    if (hsMotion){
      if (!('DeviceOrientationEvent' in window)) hsMotion.hidden = true;
      else hsMotion.addEventListener('click', hsEnableMotion);
    }

    var hsTick = null;
    addEventListener('resize', function(){
      if (hsTick === null) hsTick = requestAnimationFrame(function(){ hsTick = null; hsMeasure(); if (rm.matches) hsRun(); });
    }, {passive:true});
    if (rm.matches) addEventListener('scroll', hsRun, {passive:true});
    doc.addEventListener('visibilitychange', hsRun);
    rm.addEventListener('change', hsRun);
    if ('IntersectionObserver' in window){
      new IntersectionObserver(function(es){ hsSeen = es[0].isIntersecting; hsRun(); }).observe(hsHero);
    }
    if (hsImg.complete) hsMeasure(); else hsImg.addEventListener('load', function(){ hsMeasure(); hsRun(); }, {once:true});
    hsMeasure();
    hsRun();
  }

  /* phone action bar: one review button, shown once the page's own buttons are out of sight;
     it slides away while the reader scrolls down and returns on scroll up or when scrolling stops */
  if (!body.hasAttribute('data-no-mbar')){
    var mbar = doc.createElement('div');
    mbar.className = 'mbar';
    mbar.id = 'mbar';
    mbar.innerHTML = '<div class="mbar-shell"><a class="mbar-cta" href="kontakty.html#razbor">Хочу разбор</a></div>';
    body.appendChild(mbar);
    body.classList.add('has-mbar');
    var heroAct = doc.getElementById('hero-act');
    var quiet = [].slice.call(doc.querySelectorAll('.cta, #razbor, .site-foot'));
    var quietOn = 0, mbarShown = false, mbarAway = false, mbarLastY = scrollY, mbarIdle = 0;
    var syncMbar = function(){
      var past = heroAct ? heroAct.getBoundingClientRect().bottom < 0 : scrollY > innerHeight * 0.6;
      var want = past && quietOn === 0 && !mbarAway;
      if (want !== mbarShown){ mbarShown = want; mbar.classList.toggle('show', want); }
    };
    addEventListener('scroll', function(){
      var y = scrollY, dy = y - mbarLastY;
      if (Math.abs(dy) > 6){
        var away = dy > 0;
        if (away !== mbarAway){ mbarAway = away; syncMbar(); }
        mbarLastY = y;
      }
      clearTimeout(mbarIdle);
      if (mbarAway) mbarIdle = setTimeout(function(){ mbarAway = false; mbarLastY = scrollY; syncMbar(); }, 900);
    }, {passive:true});
    if ('IntersectionObserver' in window && quiet.length){
      var qio = new IntersectionObserver(function(es){
        es.forEach(function(e){
          var was = e.target.hasAttribute('data-quiet');
          if (e.isIntersecting === was) return;
          if (e.isIntersecting) e.target.setAttribute('data-quiet', ''); else e.target.removeAttribute('data-quiet');
          quietOn += e.isIntersecting ? 1 : -1;
        });
        syncMbar();
      });
      quiet.forEach(function(q){ qio.observe(q); });
    }
    addEventListener('scroll', syncMbar, {passive:true});
    syncMbar();
  }

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
