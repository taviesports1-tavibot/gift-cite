"use client";
import { useState } from "react";
import { Activity, Heart, MessageCircle, Radio, RotateCcw, Share2, UserPlus, Zap } from "lucide-react";
import { GameScene } from "./game-scene";
import { PUBLIC_REALTIME_URL } from "@/lib/runtime-config";

const gifts = [
  { label:"SEND ROSE", giftId:"rose", giftName:"Rose", coinValue:1 },
  { label:"SEND HEART", giftId:"finger-heart", giftName:"Finger Heart", coinValue:5 },
  { label:"SEND DOUGHNUT", giftId:"doughnut", giftName:"Doughnut", coinValue:30 },
  { label:"SEND HAT", giftId:"hat-and-mustache", giftName:"Hat and Mustache", coinValue:99 },
  { label:"SEND GALAXY", giftId:"galaxy", giftName:"Galaxy", coinValue:1000 }
];
export function DemoConsole() {
  const [pending,setPending]=useState(false); const [error,setError]=useState("");
  const api = PUBLIC_REALTIME_URL;
  async function send(body: Record<string,unknown>, endpoint="event") { if(!api){setError("REALTIME URL не настроен");return;} setPending(true);setError(""); try { const res=await fetch(`${api}/api/demo/${endpoint}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username:"TestViewer123",...body})}); if(!res.ok) throw new Error("Demo server unavailable"); } catch(e){setError(e instanceof Error?e.message:"Ошибка");} finally{setPending(false);} }
  return <main className="demo-page"><section className="demo-preview"><GameScene sessionId="demo" compact/></section><section className="demo-panel"><div className="demo-heading"><div><span><Radio size={15}/> DEMO PROVIDER</span><h1>LIVE тест без TikTok</h1><p>Все кнопки проходят через тот же серверный pipeline, что и реальные подарки.</p></div><i className={pending?"pulse":""}><Activity/></i></div>
    <div className="demo-section"><h2>GIFTS</h2><div className="gift-test-grid">{gifts.map(g=><button onClick={()=>send({kind:"gift",...g})} key={g.giftId} disabled={pending}><Zap size={17}/>{g.label}<small>{g.coinValue} coins</small></button>)}</div></div>
    <div className="demo-section"><h2>SOCIAL EVENTS</h2><div className="social-test-grid"><button onClick={()=>send({kind:"like"})}><Heart/>LIKE ×100</button><button onClick={()=>send({kind:"follow"})}><UserPlus/>FOLLOW</button><button onClick={()=>send({kind:"share"})}><Share2/>SHARE</button><button onClick={()=>send({kind:"comment",comment:"Кидайте метеор!"})}><MessageCircle/>COMMENT</button></div></div>
    <div className="demo-section"><h2>LOAD TEST</h2><div className="load-actions"><button className="busy-button" onClick={()=>send({count:100},"busy")}><Activity/> SIMULATE BUSY LIVE <small>100 events</small></button><a href="/overlay?sessionId=demo" target="_blank"><RotateCcw/> OPEN FULL OVERLAY</a></div></div>{error&&<p className="error-banner">{error}</p>}</section></main>;
}
