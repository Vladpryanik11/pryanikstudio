(function(){
  "use strict";

  var VIDEO_URL = 'assets/hero-scrub.mp4';
  var VIDEO_BYTES = 8488711;
  var POSTER_URL = 'assets/hero-poster.jpg';
  var ENDING_URL = 'assets/hero-ending.jpg';

  var hero = document.getElementById('hero');
  var stage = document.getElementById('stage');
  if (!hero || !stage) return;
  var video = document.getElementById('hero-video');
  var poster = document.getElementById('poster');
  var ring = document.getElementById('ring');
  var cue = document.getElementById('cue');

  var target = 0, shown = 0, rafId = null, lastTick = 0, heroOn = true;
  var seekBusy = false, pendingTime = null;
  var started = false, scrubOn = false, cueGone = false;

  function heroProgress(){
    var range = hero.offsetHeight - window.innerHeight;
    if (range <= 0) return 0;
    return Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / range));
  }

  function requestSeek(t){
    if (!video.duration) return;
    if (seekBusy){ pendingTime = t; return; }
    seekBusy = true;
    video.currentTime = t;
  }
  video.addEventListener('seeked', function(){
    seekBusy = false;
    if (pendingTime !== null){ var t = pendingTime; pendingTime = null; requestSeek(t); }
  });
  video.addEventListener('error', function(){ seekBusy = false; pendingTime = null; failVideo(); });

  function tick(now){
    var dt = Math.min(100, now - (lastTick || now));
    lastTick = now;
    shown += (target - shown) * (1 - Math.pow(1 - 0.16, dt / 16.667));
    if (Math.abs(target - shown) < 0.0005){ shown = target; rafId = null; lastTick = 0; }
    else { rafId = requestAnimationFrame(tick); }
    requestSeek(shown * video.duration);
  }

  function onScroll(){
    target = heroProgress();
    if (!cueGone && target > 0.02){ cueGone = true; cue.classList.add('gone'); }
    if (rafId === null && heroOn) rafId = requestAnimationFrame(tick);
  }

  new IntersectionObserver(function(es){ heroOn = es[0].isIntersecting; }).observe(stage);

  function failVideo(){
    ring.style.display = 'none';
    stage.classList.add('video-failed');
  }

  function startBlobFetch(){
    if (started) return;
    started = true;
    ring.style.display = '';
    loadHeroBlob().catch(failVideo);
  }

  var initialized = false;
  function initHeroOnce(){
    if (initialized) return;
    initialized = true;
    var img = new Image();
    img.onload = startBlobFetch;
    img.onerror = startBlobFetch;
    img.src = POSTER_URL;
    setTimeout(startBlobFetch, 4000);
  }

  function loadHeroBlob(){
    var ctrl = new AbortController();
    var watchdog = setTimeout(function(){ ctrl.abort(); }, 20000);
    return fetch(VIDEO_URL, {signal: ctrl.signal, priority: 'low'}).then(function(res){
      if (!res.ok || !res.body) throw new Error('video ' + res.status);
      var total = Number(res.headers.get('Content-Length')) || VIDEO_BYTES;
      var reader = res.body.getReader();
      var chunks = [], got = 0, lastRing = 0;
      function pump(){
        return reader.read().then(function(r){
          if (r.done) return;
          clearTimeout(watchdog);
          watchdog = setTimeout(function(){ ctrl.abort(); }, 20000);
          chunks.push(r.value);
          got += r.value.length;
          var frac = Math.min(1, got / total), now = performance.now();
          if (now - lastRing > 100 || frac === 1){ lastRing = now; ring.style.setProperty('--ld', Math.round(126 * (1 - frac))); }
          return pump();
        });
      }
      return pump().then(function(){
        clearTimeout(watchdog);
        ring.style.setProperty('--ld', 0);
        ring.style.display = 'none';
        video.src = URL.createObjectURL(new Blob(chunks, {type:'video/mp4'}));
        video.load();
        video.addEventListener('canplay', function(){
          requestSeek(heroProgress() * video.duration);
          stage.classList.add('video-ready');
        }, {once:true});
      });
    });
  }

  var GATES = [
    '(max-width: 720px)',
    '(orientation: portrait) and (max-width: 1024px)',
    '(orientation: portrait) and (pointer: coarse)',
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(prefers-reduced-motion: reduce)'
  ];
  var MQLS = GATES.map(function(q){ return matchMedia(q); });

  function enableScrub(){
    if (scrubOn) return;
    scrubOn = true;
    poster.style.backgroundImage = "url('" + POSTER_URL + "')";
    initHeroOnce();
    addEventListener('scroll', onScroll, {passive:true});
    onScroll();
  }
  function disableScrub(){
    if (scrubOn){
      scrubOn = false;
      removeEventListener('scroll', onScroll);
      if (rafId !== null){ cancelAnimationFrame(rafId); rafId = null; }
    }
    poster.style.backgroundImage = "url('" + ENDING_URL + "')";
  }
  function applyHeroMode(){
    if (MQLS.some(function(m){ return m.matches; })) disableScrub();
    else enableScrub();
  }
  MQLS.forEach(function(m){ m.addEventListener('change', applyHeroMode); });
  applyHeroMode();
})();
