// Axiom background — optimized flowing ribbons
(function(){
  const cv=document.getElementById('bg'),c=cv.getContext('2d',{alpha:false});
  let W,H,t=0,raf;
  const DPR=Math.min(window.devicePixelRatio||1,2);
  const RENDER_SCALE=.65; // render at lower res for speed

  function sz(){
    W=window.innerWidth;H=window.innerHeight;
    cv.width=W*RENDER_SCALE;cv.height=H*RENDER_SCALE;
    cv.style.width=W+'px';cv.style.height=H+'px';
    c.setTransform(RENDER_SCALE,0,0,RENDER_SCALE,0,0);
    c.fillStyle='#030108';c.fillRect(0,0,W,H);
  }
  window.addEventListener('resize',sz);sz();

  // precompute ribbon data
  const RIBBONS=[];
  const configs=[
    {y:.22,hA:262,hB:282,th:130,sp:.55},
    {y:.42,hA:248,hB:272,th:95,sp:.45},
    {y:.58,hA:270,hB:298,th:75,sp:.6},
    {y:.33,hA:238,hB:268,th:105,sp:.4},
    {y:.68,hA:276,hB:302,th:55,sp:.5},
    {y:.12,hA:252,hB:278,th:45,sp:.58},
  ];

  for(const cfg of configs){
    const pts=[];
    for(let i=0;i<6;i++){
      pts.push({
        f:.0006+Math.random()*.003,
        a:30+Math.random()*130,
        s:(Math.random()-.5)*cfg.sp,
        o:Math.random()*6.28
      });
    }
    RIBBONS.push({...cfg,pts});
  }

  function gy(r,x,ti){
    let y=H*r.y;
    for(const p of r.pts)y+=Math.sin(x*p.f+ti*p.s+p.o)*p.a;
    return y;
  }

  // pre-create gradients (update on resize)
  let grads=[];
  function makeGrads(){
    grads=RIBBONS.map(r=>{
      const layers=[];
      for(let L=0;L<4;L++){
        const lS=[0,8,20,38][L];
        const a=[.035,.09,.26,.45][L];
        const g=c.createLinearGradient(0,0,W,0);
        g.addColorStop(0,`hsla(${r.hA},82%,${28+lS}%,${a})`);
        g.addColorStop(.5,`hsla(${(r.hA+r.hB)>>1},88%,${32+lS}%,${a*1.2})`);
        g.addColorStop(1,`hsla(${r.hB},78%,${28+lS}%,${a})`);
        layers.push(g);
      }
      return layers;
    });
  }
  makeGrads();
  window.addEventListener('resize',makeGrads);

  const STEP=4;
  const WIDTHS_MULT=[1,.5,.18,.012];

  function drawRibbon(ri,ti){
    const r=RIBBONS[ri];
    const gs=grads[ri];

    for(let L=0;L<4;L++){
      c.lineWidth=r.th*WIDTHS_MULT[L];
      c.strokeStyle=gs[L];
      c.globalCompositeOperation='lighter';
      if(L===0){
        c.shadowColor=`hsla(${(r.hA+r.hB)>>1},88%,45%,.3)`;
        c.shadowBlur=r.th*.5;
      }else{
        c.shadowColor='transparent';c.shadowBlur=0;
      }
      c.beginPath();
      let first=true;
      for(let x=0;x<=W;x+=STEP){
        const y=gy(r,x,ti);
        first?(c.moveTo(x,y),first=false):c.lineTo(x,y);
      }
      c.stroke();
    }
  }

  function frame(){
    t+=0.005;
    c.globalCompositeOperation='source-over';
    c.fillStyle='rgba(3,1,8,.2)';
    c.fillRect(0,0,W,H);
    for(let i=0;i<RIBBONS.length;i++)drawRibbon(i,t);
    raf=requestAnimationFrame(frame);
  }

  // pause when tab hidden
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(raf);}
    else{raf=requestAnimationFrame(frame);}
  });

  frame();
})();
