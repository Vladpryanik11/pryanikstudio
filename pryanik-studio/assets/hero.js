(function(){
  "use strict";

  // Two films, one engine. Wide screens scrub the horizontal cut, portrait
  // screens scrub a vertical one shot for them. Neither is downloaded until
  // the screen it belongs to is the screen in front of the visitor.
  var SETS = {
    wide: {
      video: 'assets/hero-scrub.mp4', bytes: 8488711,
      poster: 'assets/hero-poster.jpg', ending: 'assets/hero-ending.jpg'
    },
    portrait: {
      video: 'assets/hero-m.mp4', bytes: 469000,
      poster: 'assets/hero-m-poster.jpg', ending: 'assets/hero-m-ending.jpg'
    }
  };
  var set = SETS.wide;

  var hero = document.getElementById('hero');
  var stage = document.getElementById('stage');
  if (!hero || !stage) return;
  var video = document.getElementById('hero-video');
  var poster = document.getElementById('poster');
  var ring = document.getElementById('ring');
  var cue = document.getElementById('cue');
  var film = document.getElementById('film');
  var playBtn = document.getElementById('playfilm');
  var wear = document.getElementById('wear');
  var filmOpened = false, geared = false, wearShown = false;

  // The glasses are offered at the end of the film and the visitor accepts them.
  // Until then the site's navigation is not there to be used.
  function updateGate(p){
    if (!wear || geared || !scrubOn) return;
    var show = p > 0.985;
    if (show === wearShown) return;
    wearShown = show;
    if (show){
      wear.hidden = false;
      requestAnimationFrame(function(){ wear.classList.add('in'); });
    } else {
      wear.classList.remove('in');
      setTimeout(function(){ if (!wearShown) wear.hidden = true; }, 560);
    }
  }

  if (wear){
    wear.addEventListener('click', function(){
      geared = true;
      wearShown = false;
      document.body.classList.remove('gated');
      document.body.classList.add('geared');
      wear.classList.remove('in');
      setTimeout(function(){ wear.hidden = true; }, 560);
      var brand = document.querySelector('.site-head .brand');
      if (brand && brand.focus) brand.focus({preventScroll: true});
    });
  }

  var target = 0, shown = 0, rafId = null, lastTick = 0, heroOn = true;
  var seekBusy = false, pendingTime = null;
  var started = false, scrubOn = false, cueGone = false;
  var blobSet = false, directTried = false, initialized = false;

  // Visitors who get the still hero (reduced motion, a phone held sideways) can
  // still choose to watch the film. Nothing downloads until they ask for it.
  if (film && playBtn){
    playBtn.addEventListener('click', function(){
      filmOpened = true;
      playBtn.hidden = true;
      film.hidden = false;
      if (!film.src) film.src = set.video;
      var p = film.play();
      if (p && p.catch) p.catch(function(){});
    });
  }

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
  video.addEventListener('error', function(){
    seekBusy = false;
    pendingTime = null;
    // Tearing the element down to swap films fires error with no source left.
    // That is not a failed load, and treating it as one starts a second download.
    if (!video.src && !video.currentSrc) return;
    if (blobSet) failVideo();   // the file arrived and still will not play: refetching cannot help
    else useDirectSrc();
  });

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
    updateGate(target);
    if (rafId === null && heroOn) rafId = requestAnimationFrame(tick);
  }

  new IntersectionObserver(function(es){ heroOn = es[0].isIntersecting; }).observe(stage);

  function failVideo(){
    ring.style.display = 'none';
    stage.classList.add('video-failed');
  }

  function onCanPlay(){
    requestSeek(heroProgress() * video.duration);
    stage.classList.add('video-ready');
  }

  // The Blob path needs fetch, which browsers block on file:// URLs. Play the
  // file straight from its own address instead, so a double-clicked page scrubs too.
  function useDirectSrc(){
    if (directTried){ failVideo(); return; }
    directTried = true;
    ring.style.display = 'none';
    video.addEventListener('canplay', onCanPlay, {once:true});
    video.src = set.video;
    video.load();
  }

  function startBlobFetch(){
    if (started) return;
    started = true;
    if (location.protocol === 'file:'){ useDirectSrc(); return; }
    ring.style.display = '';
    loadHeroBlob().catch(useDirectSrc);
  }

  function initHeroOnce(){
    if (initialized) return;
    initialized = true;
    var img = new Image();
    img.onload = startBlobFetch;
    img.onerror = startBlobFetch;
    img.src = set.poster;
    setTimeout(startBlobFetch, 4000);
  }

  function loadHeroBlob(){
    var url = set.video, total0 = set.bytes;
    var ctrl = new AbortController();
    var watchdog = setTimeout(function(){ ctrl.abort(); }, 20000);
    return fetch(url, {signal: ctrl.signal, priority: 'low'}).then(function(res){
      if (!res.ok || !res.body) throw new Error('video ' + res.status);
      var total = Number(res.headers.get('Content-Length')) || total0;
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
        blobSet = true;
        video.src = URL.createObjectURL(new Blob(chunks, {type:'video/mp4'}));
        video.load();
        video.addEventListener('canplay', onCanPlay, {once:true});
      });
    });
  }

  // Three modes, decided live. A phone with no room for any film, or a visitor
  // who asked for less motion, gets one composed still instead.
  var STILL = [
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(prefers-reduced-motion: reduce)'
  ];
  var PORTRAIT = [
    '(max-width: 720px)',
    '(orientation: portrait) and (max-width: 1024px)',
    '(orientation: portrait) and (pointer: coarse)'
  ];
  var STILL_MQ = STILL.map(function(q){ return matchMedia(q); });
  var PORTRAIT_MQ = PORTRAIT.map(function(q){ return matchMedia(q); });
  var mode = null;

  function enableScrub(){
    if (scrubOn) return;
    scrubOn = true;
    poster.style.backgroundImage = "url('" + set.poster + "')";
    if (!geared) document.body.classList.add('gated');
    initHeroOnce();
    addEventListener('scroll', onScroll, {passive:true});
    onScroll();
    if (playBtn && !filmOpened) playBtn.hidden = true;
  }
  function disableScrub(){
    if (scrubOn){
      scrubOn = false;
      removeEventListener('scroll', onScroll);
      if (rafId !== null){ cancelAnimationFrame(rafId); rafId = null; }
    }
    poster.style.backgroundImage = "url('" + set.ending + "')";
    // A still hero has no end to reach, so nothing is gated behind the glasses.
    document.body.classList.remove('gated');
    if (wear){ wearShown = false; wear.classList.remove('in'); wear.hidden = true; }
    if (playBtn && !filmOpened) playBtn.hidden = false;
  }

  // Swapping films means the loader starts over from nothing.
  function resetVideo(){
    if (scrubOn){
      scrubOn = false;
      removeEventListener('scroll', onScroll);
    }
    if (rafId !== null){ cancelAnimationFrame(rafId); rafId = null; }
    started = initialized = blobSet = directTried = false;
    seekBusy = false; pendingTime = null;
    shown = target = 0; lastTick = 0;
    stage.classList.remove('video-ready', 'video-failed');
    var old = video.src;
    video.removeAttribute('src');
    video.load();
    if (old && old.indexOf('blob:') === 0) URL.revokeObjectURL(old);
    ring.style.setProperty('--ld', 126);
    ring.style.display = 'none';
  }

  function applyHeroMode(){
    var portraitish = PORTRAIT_MQ.some(function(m){ return m.matches; });
    var wanted = portraitish ? SETS.portrait : SETS.wide;
    var next = STILL_MQ.some(function(m){ return m.matches; })
      ? 'still' : (portraitish ? 'portrait' : 'wide');
    if (next === mode && wanted === set) return;
    var swapped = wanted !== set;
    mode = next;
    set = wanted;
    if (swapped) resetVideo();
    if (next === 'still') disableScrub();
    else enableScrub();
  }

  STILL_MQ.concat(PORTRAIT_MQ).forEach(function(m){ m.addEventListener('change', applyHeroMode); });
  applyHeroMode();
})();
