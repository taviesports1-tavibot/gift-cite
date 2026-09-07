"use client";

import { useEffect, useRef } from "react";
import type { EffectId, VisualEffectEvent } from "@gift-chaos/shared";

type Shot = { event: VisualEffectEvent; start: number; hit: boolean; x: number; y: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; shard: boolean };
type Stain = { x: number; y: number; start: number; asset: EffectId; seed: number };
const COLORS: Record<EffectId, string> = { egg: "#ffc928", tomato: "#ed302c", donut: "#ed7aaa", shoe: "#b79472", brick: "#bb6540", bucket: "#55cfff", toilet: "#cbe6ec", bomb: "#ff9b36", meteor: "#ff652b" };
const flightTime = (asset: EffectId) => asset === "meteor" ? 1.6 : asset === "bomb" ? 1.8 : asset === "bucket" ? 1.3 : asset === "brick" ? .5 : .85;

/** Original procedural sprites. Local coordinates keep the same appearance at every overlay size. */
function object(ctx: CanvasRenderingContext2D, asset: EffectId, time: number) {
  const ellipse = (x: number, y: number, rx: number, ry: number, color: string) => { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.fill(); };
  ctx.lineWidth = 2.5; ctx.strokeStyle = "#282335";
  if (asset === "egg") { ellipse(0,0,13,18,"#fff4d4"); ellipse(-4,-5,4,8,"#fff"); }
  if (asset === "tomato") { ellipse(0,0,18,16,"#e73531"); ellipse(-6,-5,5,4,"#ff8970"); ctx.fillStyle="#46963f"; ctx.beginPath(); for(let i=0;i<10;i++){const a=i*Math.PI/5;ctx.lineTo(Math.cos(a)*(i%2?4:12),-13+Math.sin(a)*(i%2?4:8));}ctx.fill(); }
  if (asset === "donut") { ellipse(0,0,20,18,"#d48a41"); ellipse(0,-2,18,15,"#f583bc"); ellipse(0,0,7,6,"#582d2d"); for(let i=0;i<10;i++){ctx.fillStyle=i%2?"#ffe768":"#76f3ec";ctx.fillRect(Math.cos(i*2.4)*13,Math.sin(i*2.4)*10-2,4,2);} }
  if (asset === "brick") { ctx.fillStyle="#b95034";ctx.fillRect(-23,-12,46,24);ctx.fillStyle="#e88860";ctx.fillRect(-23,-12,46,7);ctx.strokeRect(-23,-12,46,24);ctx.fillStyle="#66382b";for(let i=0;i<3;i++)ctx.fillRect(-17+i*13,-9,8,3); }
  if (asset === "shoe") { ctx.fillStyle="#754f37";ctx.beginPath();ctx.moveTo(-22,10);ctx.lineTo(-18,-17);ctx.lineTo(-3,-17);ctx.lineTo(2,-1);ctx.quadraticCurveTo(29,-3,26,12);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="#e4caa4";ctx.fillRect(-23,10,50,5);ctx.strokeStyle="#eee0c7";for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-9,-10+i*5);ctx.lineTo(1,-8+i*5);ctx.stroke();} }
  if (asset === "bucket") { ctx.strokeStyle="#b7d2e5";ctx.beginPath();ctx.arc(0,-9,18,Math.PI,Math.PI*2);ctx.stroke();ctx.fillStyle="#5e9db9";ctx.beginPath();ctx.moveTo(-21,-13);ctx.lineTo(21,-13);ctx.lineTo(15,21);ctx.lineTo(-15,21);ctx.closePath();ctx.fill();ellipse(0,-13,21,6,"#a6efff");ctx.fillStyle="#a6c8d6";ctx.fillRect(-12,-8,4,24); }
  if (asset === "toilet") { ctx.fillStyle="#eef8ff";ctx.fillRect(-19,-28,31,24);ctx.strokeRect(-19,-28,31,24);ctx.fillRect(-9,8,19,17);ellipse(2,0,25,14,"#f4fcff");ellipse(2,-3,18,8,"#81b6cc");ellipse(2,-4,12,4,"#c3f1ff");ctx.fillStyle="#fff";ctx.fillRect(-13,23,30,5); }
  if (asset === "bomb") { ellipse(0,3,19,19,"#282d39");ellipse(-6,-3,5,6,"#5e6b80");ctx.fillStyle="#73684e";ctx.fillRect(-5,-20,10,7);ctx.strokeStyle="#deb877";ctx.beginPath();ctx.moveTo(0,-20);ctx.quadraticCurveTo(5,-36,15,-24);ctx.stroke();ellipse(15,-24,3+Math.sin(time*40)*2,4,"#ffcd54"); }
  if (asset === "meteor") { const glow=ctx.createRadialGradient(0,0,2,0,0,36);glow.addColorStop(0,"#fff4a8");glow.addColorStop(.5,"#ff7c20");glow.addColorStop(1,"#ff391000");ctx.fillStyle=glow;ctx.fillRect(-36,-36,72,72);ellipse(0,0,21,18,"#633b30");ellipse(-5,-4,10,8,"#b66537");ellipse(8,6,5,4,"#3e2729"); }
}

export function EffectStage({ effects, onImpact, onDone }: { effects: VisualEffectEvent[]; onImpact: (event: VisualEffectEvent) => void; onDone: (id: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const props = useRef({ effects, onImpact, onDone });
  useEffect(() => { props.current = { effects, onImpact, onDone }; }, [effects, onImpact, onDone]);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const shots = new Map<string, Shot>(); let particles: Particle[] = []; let stains: Stain[] = [];
    let width=1, height=1, targetX=.5, targetY=.45, frame=0, previous=performance.now();
    const measure = () => {
      const bounds=canvas.getBoundingClientRect();width=bounds.width;height=bounds.height;
      const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
      const boss=canvas.parentElement?.querySelector(".boss-wrap img")?.getBoundingClientRect();
      if(boss){targetX=(boss.left+boss.width*.5-bounds.left)/width;targetY=(boss.top+boss.height*.22-bounds.top)/height;}
    };
    const resize=new ResizeObserver(measure);resize.observe(canvas);const bossImage=canvas.parentElement?.querySelector(".boss-wrap img");if(bossImage)resize.observe(bossImage);measure();
    const burst = (shot: Shot, now: number) => {
      const asset=shot.event.asset;const heavy=asset==="meteor"||asset==="bomb";
      stains.push({x:shot.x,y:shot.y,start:now,asset,seed:Math.random()*10});stains=stains.slice(-24);
      const count=Math.min(70,Math.round(24+shot.event.intensity*10));
      for(let i=0;i<count && particles.length<320;i++){const angle=Math.random()*Math.PI*2;const speed=(heavy?180:100)*(Math.random()+.3);const life=.45+Math.random()*1.1;particles.push({x:shot.x,y:shot.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-70,life,max:life,size:2+Math.random()*5,color:asset==="egg"&&i%3===0?"#fff8df":heavy&&i%3===0?"#665963":COLORS[asset],shard:asset==="egg"&&i%3===0||asset==="brick"});}
      props.current.onImpact(shot.event);
    };
    const draw = (now: number) => {
      const dt=Math.min((now-previous)/1000,.04);previous=now;ctx.clearRect(0,0,width,height);const unit=width/420;
      const current=new Set(props.current.effects.map(e=>e.id));for(const id of shots.keys())if(!current.has(id))shots.delete(id);
      for(const event of props.current.effects)if(!shots.has(event.id))shots.set(event.id,{event,start:now,hit:false,x:targetX*width,y:targetY*height});
      for(const shot of shots.values()) {
        const e=shot.event, age=(now-shot.start)/1000, duration=flightTime(e.asset), t=Math.min(1,age/duration), tx=targetX*width, ty=targetY*height;
        shot.x=tx;shot.y=ty;
        const drop=["bucket","toilet","bomb","meteor"].includes(e.asset);
        const sx=e.origin==="right"?width+30:-30;let x=sx+(tx-sx)*t,y=ty+height*.12*(1-t)-height*.24*4*t*(1-t);
        if(drop){const p=e.asset==="bomb"?Math.min(1,t*2):e.asset==="meteor"?Math.max(0,(t-.3)/.7):t;x=tx+(e.asset==="meteor"?width*.4*(1-p):0);y=-60+(ty+60)*p*p;if(e.asset==="bucket")y=-60+(ty-30*unit)*Math.min(1,t*2);}
        if(!shot.hit && t>=1){shot.hit=true;burst(shot,now);}
        if(!shot.hit){
          if(e.asset==="meteor"){ctx.fillStyle="rgba(30,6,24,.26)";ctx.fillRect(0,0,width,height);ctx.fillStyle="#ffe092";ctx.textAlign="center";ctx.font=`900 ${16*unit}px sans-serif`;ctx.fillText("МЕТЕОР • @"+e.username,width*.5,height*.3);if(t>.3){const tail=ctx.createLinearGradient(x,y,x+70*unit,y-150*unit);tail.addColorStop(0,"#ffca55");tail.addColorStop(1,"#ff3d0000");ctx.fillStyle=tail;ctx.beginPath();ctx.moveTo(x-20*unit,y);ctx.lineTo(x+75*unit,y-160*unit);ctx.lineTo(x+18*unit,y+10*unit);ctx.fill();}}
          if(e.asset==="bucket"&&t>.5){ctx.strokeStyle="#83e8ffb0";ctx.lineWidth=6*unit;for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(x+(i-3)*4*unit,y);ctx.quadraticCurveTo(x+(i-3)*6*unit,y+35*unit,tx+(i-3)*8*unit,ty);ctx.stroke();}}
          ctx.save();ctx.translate(x,y);ctx.scale(unit,unit);ctx.rotate(e.asset==="bucket"?Math.max(0,t-.45)*-3:e.asset==="shoe"?t*12:e.asset==="egg"?t*4:drop?0:t*6);object(ctx,e.asset,age);ctx.restore();
          if(e.repeatCount>1){ctx.fillStyle="#fff";ctx.font=`bold ${16*unit}px sans-serif`;ctx.textAlign="center";ctx.fillText(`×${e.repeatCount}`,x,y-30*unit);}
        }
        if(age>duration+.7){shots.delete(e.id);props.current.onDone(e.id);}
      }
      stains=stains.filter(s=>now-s.start<4200);
      for(const s of stains){const age=(now-s.start)/1000;const wet=s.asset==="bucket";const splat=s.asset==="egg"||s.asset==="tomato"||wet;ctx.save();ctx.translate(s.x,s.y);ctx.scale(unit,unit);ctx.globalAlpha=Math.min(1,(4.2-age)/1.4);
        if(splat){ctx.fillStyle=wet?"#65dcff99":s.asset==="egg"?"#fff5d9d9":"#c92225dd";for(let i=0;i<11;i++){const a=i*2.4+s.seed;ctx.beginPath();ctx.ellipse(Math.cos(a)*17,Math.sin(a)*13,10+Math.sin(i)*4,7, a,0,Math.PI*2);ctx.fill();}ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=4;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo((i-1.5)*10,8);ctx.lineTo((i-1.5)*10,12+age*(7+i*2));ctx.stroke();}if(s.asset==="egg"){ctx.fillStyle="#ffbe11";ctx.beginPath();ctx.ellipse(0,3,12,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ffe77e";ctx.beginPath();ctx.arc(-4,0,3,0,Math.PI*2);ctx.fill();}}
        else if(age<.65){const heavy=s.asset==="bomb"||s.asset==="meteor";ctx.globalAlpha=1-age/.65;ctx.strokeStyle=heavy?"#ffcc65":"#fff4d8";ctx.lineWidth=5*(1-age/.65);ctx.beginPath();ctx.arc(0,0,10+age*(heavy?170:75),0,Math.PI*2);ctx.stroke();if(heavy){const g=ctx.createRadialGradient(0,0,0,0,0,80);g.addColorStop(0,"#fff4b8");g.addColorStop(.3,"#ff9127");g.addColorStop(1,"#ff301000");ctx.fillStyle=g;ctx.fillRect(-80,-80,160,160);}}
        ctx.restore();}
      particles=particles.filter(p=>p.life>0);for(const p of particles){p.life-=dt;p.vy+=180*dt;p.x+=p.vx*dt*unit;p.y+=p.vy*dt*unit;ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();if(p.shard){ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+p.size*unit,p.y+2*unit);ctx.lineTo(p.x-2*unit,p.y+p.size*unit);}else ctx.ellipse(p.x,p.y,p.size*unit,p.size*unit*.7,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(frame);resize.disconnect();};
  },[]);
  return <canvas ref={canvasRef} aria-hidden="true" data-effect-engine="canvas" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:8}}/>;
}
