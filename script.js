document.addEventListener('DOMContentLoaded', ()=>{
  // Trigger confetti on page load
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
  
  const canvas = document.getElementById('scratchCanvas');
  const revealBtn = document.getElementById('revealButton');
  const revealWrapper = document.querySelector('.reveal-wrapper');
  const revealContent = document.querySelector('.reveal-content');
  if(!canvas) return;

  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let lastPoint = null;
  const brushSize = 36; // CSS px, will feel consistent because of ctx.scale below
  let dpr = Math.max(window.devicePixelRatio || 1, 1);
  dpr = Math.min(dpr, 2); // cap DPR for memory/perf

  function resizeCanvas(){
    const rect = revealWrapper.getBoundingClientRect();
    const cssW = Math.floor(rect.width);
    const cssH = Math.floor(rect.height);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.scale(dpr, dpr);
    drawOverlay();
  }

  // draw gold texture overlay (or fallback gradient)
  const overlayImg = new Image();
  overlayImg.crossOrigin = 'anonymous';
  overlayImg.src = 'assets/images/gold-texture.jpg';
  function drawOverlay(){
    const rect = revealWrapper.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    // clear then draw
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(overlayImg.complete && overlayImg.naturalWidth){
      // draw image covering area
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      // draw scaled to CSS pixels (context is scaled by DPR)
      ctx.drawImage(overlayImg, 0, 0, w, h);
      ctx.restore();
    } else {
      // fallback: simple gold gradient
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      const g = ctx.createLinearGradient(0,0,w,0);
      g.addColorStop(0,'#b78b2b'); g.addColorStop(0.5,'#ffd85a'); g.addColorStop(1,'#f2c94c');
      ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  }

  overlayImg.onload = ()=>{
    drawOverlay();
  }

  // pointer utilities
  function getPoint(e){
    const rect = canvas.getBoundingClientRect();
    return {x: e.clientX - rect.left, y: e.clientY - rect.top, pressure: e.pressure || 0.5};
  }

  function beginStroke(pt){
    isDrawing = true; lastPoint = pt;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x+0.01, pt.y+0.01);
    ctx.stroke();
    ctx.restore();
  }

  function strokeTo(pt){
    if(!isDrawing || !lastPoint) return;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    const midX = (lastPoint.x + pt.x)/2;
    const midY = (lastPoint.y + pt.y)/2;
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midX, midY);
    ctx.stroke();
    ctx.restore();
    lastPoint = pt;
  }

  function endStroke(){
    isDrawing = false; lastPoint = null;
  }

  // reveal detection (throttled)
  let lastCheck = 0; const CHECK_DELAY = 300; const REVEAL_THRESHOLD = 0.30; // 30%
  function checkReveal(){
    const now = Date.now();
    if(now - lastCheck < CHECK_DELAY) return;
    lastCheck = now;
    // sample alpha across canvas
    try{
      const w = canvas.width; const h = canvas.height;
      const img = ctx.getImageData(0,0,w,h);
      const total = w*h; let cleared = 0;
      // sample every 4th pixel for speed
      for(let i=3;i<img.data.length;i+=16){
        if(img.data[i] === 0) cleared++;
      }
      const sampled = img.data.length/16;
      const percent = cleared / sampled;
      if(percent >= REVEAL_THRESHOLD){
        revealComplete();
      }
    }catch(err){
      // canvas may be tainted or getImageData failed — stop checking
      console.warn('Reveal check failed', err);
      // as a fallback, do nothing
    }
  }

  function revealComplete(){
    // fade out canvas
    canvas.style.transition = 'opacity 600ms ease';
    canvas.style.opacity = '0';
    setTimeout(()=>{ canvas.style.pointerEvents = 'none'; },650);
  }

  // events
  canvas.addEventListener('pointerdown',(e)=>{
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    const pt = getPoint(e); beginStroke(pt);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove',(e)=>{
    if(!isDrawing) return;
    const pt = getPoint(e); strokeTo(pt); checkReveal();
    e.preventDefault();
  });
  canvas.addEventListener('pointerup',(e)=>{ canvas.releasePointerCapture && canvas.releasePointerCapture(e.pointerId); endStroke(); checkReveal(); });
  canvas.addEventListener('pointercancel',()=>{ endStroke(); });

  // reveal button
  revealBtn.addEventListener('click', ()=>{
    // fully clear the overlay
    ctx.clearRect(0,0,canvas.width,canvas.height);
    revealComplete();
  });

  // init
  window.addEventListener('resize', ()=>{
    // debounce
    clearTimeout(window._scratchResize);
    window._scratchResize = setTimeout(()=>{ resizeCanvas(); },120);
  });
  // initial sizing
  resizeCanvas();
});

// CAROUSEL FUNCTIONALITY
document.addEventListener('DOMContentLoaded', ()=>{
  const carousel = document.querySelector('.carousel-container');
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');
  const indicators = document.querySelectorAll('.indicator');
  const cards = document.querySelectorAll('.carousel-container .info-card');
  
  if(!carousel || !prevBtn || !nextBtn) return;
  
  let currentIndex = 0;
  const cardWidth = cards[0]?.offsetWidth || 0;
  const gap = 16; // 1rem in pixels
  
  function updateCarousel(){
    const scrollLeft = currentIndex * (cardWidth + gap);
    carousel.scrollTo({left: scrollLeft, behavior: 'smooth'});
    
    // Update indicators
    indicators.forEach((indicator, idx)=>{
      indicator.classList.toggle('active', idx === currentIndex);
    });
  }
  
  function nextSlide(){
    currentIndex = (currentIndex + 1) % cards.length;
    updateCarousel();
  }
  
  function prevSlide(){
    currentIndex = (currentIndex - 1 + cards.length) % cards.length;
    updateCarousel();
  }
  
  prevBtn.addEventListener('click', prevSlide);
  nextBtn.addEventListener('click', nextSlide);
  
  // Indicator click
  indicators.forEach((indicator)=>{
    indicator.addEventListener('click', ()=>{
      currentIndex = parseInt(indicator.dataset.index);
      updateCarousel();
    });
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowLeft') prevSlide();
    if(e.key === 'ArrowRight') nextSlide();
  });
});
