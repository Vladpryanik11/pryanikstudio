  /* cases infographic: hovering a peak lights it up and shows its exact numbers */
  var land = doc.getElementById('land');
  if (land){
    var lTip = doc.getElementById('land-tip');
    var lStage = land.querySelector('.land-stage');
    var lSvg = land.querySelector('.land-svg');
    var lHits = [].slice.call(land.querySelectorAll('.land-hit'));
    var lPeaks = [].slice.call(land.querySelectorAll('.pk, .pk-dot, .pk-lead'));
    var lLabels = [].slice.call(land.querySelectorAll('.land-labels li'));
    var lHot = -1, lHideTimer = null;
    var lMark = function(i){
      lPeaks.forEach(function(el){ el.classList.toggle('hot', +el.getAttribute('data-i') === i); });
      lLabels.forEach(function(li, n){ li.classList.toggle('hot', n === i); });
    };
    var lShow = function(b){
      clearTimeout(lHideTimer);
      var i = +b.getAttribute('data-i');
      if (i === lHot) return;
      lHot = i;
      land.classList.add('hov');
      lMark(i);
      lTip.querySelector('.lt-name').textContent = b.getAttribute('data-name');
      lTip.querySelector('.lt-sum').textContent = b.getAttribute('data-sum') + ' заявок и лидов';
      lTip.querySelector('.lt-meta').textContent = b.getAttribute('data-share') + ' от всех · ' + b.getAttribute('data-cases');
      lTip.querySelector('.lt-best').textContent = 'Лучший: ' + b.getAttribute('data-best');
      lTip.style.setProperty('--tc', b.getAttribute('data-color'));
      var W = lStage.clientWidth, H = lSvg.getBoundingClientRect().height;
      var x = parseFloat(b.getAttribute('data-x')) / 100 * W, half = Math.min(140, W / 2);
      lTip.style.left = Math.max(half, Math.min(W - half, x)).toFixed(1) + 'px';
      lTip.style.top = (parseFloat(b.getAttribute('data-top')) / 100 * H).toFixed(1) + 'px';
      lTip.classList.add('show');
    };
    var lHide = function(){
      clearTimeout(lHideTimer);
      lHideTimer = setTimeout(function(){
        lHot = -1;
        land.classList.remove('hov');
        lMark(-1);
        lTip.classList.remove('show');
      }, 80);
    };
    lHits.forEach(function(b){
      b.addEventListener('mouseenter', function(){ lShow(b); });
      b.addEventListener('focus', function(){ lShow(b); });
      b.addEventListener('mouseleave', lHide);
      b.addEventListener('blur', lHide);
    });
    /* once the peaks have grown, drop the entrance delays so hover answers at once */
    if ('IntersectionObserver' in window){
      var lSeen = new IntersectionObserver(function(es){
        if (!es[0].isIntersecting) return;
        lSeen.disconnect();
        setTimeout(function(){ land.classList.add('done'); }, rm.matches ? 0 : 2800);
      }, {threshold:.15});
      lSeen.observe(land);
    } else {
      land.classList.add('done');
    }
  }

