"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { io, type Socket } from "socket.io-client";
import { Crown, Heart, Radio, Trophy, Wifi, WifiOff } from "lucide-react";
import { DEFAULT_MAPPINGS, DEFAULT_SETTINGS, type GameState, type GiftMapping, type VisualEffectEvent } from "@gift-chaos/shared";
import { EffectIcon } from "./effect-icon";
import { GiftThumbnail } from "./gift-thumbnail";
import { PUBLIC_REALTIME_URL } from "@/lib/runtime-config";

const fallbackState: GameState = { sessionId: "live", status: "idle", connection: "disconnected", hp: 10_000, maxHp: 10_000, round: 1, combo: 0, likeProgress: 4230, lastUpdatedAt: new Date(0).toISOString(), leaderboard: [{ viewerId: "1", username: "ChaosKing", coins: 2840, damage: 3920, gifts: 19 }, { viewerId: "2", username: "Carolina", coins: 1440, damage: 2110, gifts: 11 }, { viewerId: "3", username: "Anton", coins: 820, damage: 1320, gifts: 8 }], feed: [], stats: { totalViewers: 0, totalGifts: 0, totalCoins: 0, totalLikes: 4230, newFollowers: 0, shares: 0, totalDamage: 0, bossesDefeated: 0, roundsCompleted: 0, longestCombo: 0 }, settings: DEFAULT_SETTINGS, overlayClients: 0 };

const EFFECT_LABELS: Record<GiftMapping["effect"], string> = { egg: "ЯЙЦО", tomato: "ТОМАТ", donut: "ПОНЧИК", shoe: "БОТИНОК", brick: "КИРПИЧ", bucket: "ВЕДРО", toilet: "УНИТАЗ", bomb: "БОМБА", meteor: "МЕТЕОР" };

export function GameScene({ sessionId = "live", compact = false }: { sessionId?: string; compact?: boolean }) {
  const [state, setState] = useState<GameState>({ ...fallbackState, sessionId });
  const [mappings, setMappings] = useState<GiftMapping[]>(DEFAULT_MAPPINGS);
  const [effects, setEffects] = useState<VisualEffectEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [defeated, setDefeated] = useState<{ winner: string; round: number } | null>(null);
  const queue = useRef<VisualEffectEvent[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const settingsRef = useRef(state.settings);
  useEffect(() => { settingsRef.current = state.settings; }, [state.settings]);
  const activeLimit = state.settings.maxConcurrentEffects;
  const runQueued = useCallback(() => {
    setEffects(current => {
      if (current.length >= activeLimit || !queue.current.length) return current;
      const free = activeLimit - current.length;
      return [...current, ...queue.current.splice(0, free)];
    });
  }, [activeLimit]);

  useEffect(() => {
    const url = PUBLIC_REALTIME_URL;
    if (!url) return;
    const socket = io(url, { auth: { sessionId }, transports: ["websocket", "polling"], reconnection: true, reconnectionDelayMax: 5000 });
    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("game:state", (next: GameState) => setState(next));
    socket.on("game:mappings", (next: GiftMapping[]) => setMappings(next));
    socket.on("game:effect", (effect: VisualEffectEvent) => { queue.current.push(effect); playEffectSound(effect.asset, settingsRef.current.soundEnabled, settingsRef.current.masterVolume * settingsRef.current.effectsVolume); runQueued(); });
    socket.on("game:defeated", setDefeated);
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [sessionId, runQueued]);

  useEffect(() => { const id = window.setInterval(runQueued, 80); return () => window.clearInterval(id); }, [runQueued]);
  const finishEffect = (id: string) => { setEffects(current => current.filter(item => item.id !== id)); window.setTimeout(runQueued, 0); };
  const hpPercent = Math.max(0, Math.min(100, state.hp / state.maxHp * 100));
  const likePercent = Math.min(100, state.likeProgress / state.settings.likeGoal * 100);
  const items = useMemo(() => mappings.filter(item => item.enabled).slice(0, 9), [mappings]);

  return <div className={`game-shell ${compact ? "is-compact" : ""}`} style={{ "--safe-top": `${state.settings.safeZones.top}%`, "--safe-right": `${state.settings.safeZones.right}%`, "--safe-bottom": `${state.settings.safeZones.bottom}%`, "--safe-left": `${state.settings.safeZones.left}%` } as React.CSSProperties}>
    <div className="arena-bg"><div className="arena-grid"/><div className="spotlight one"/><div className="spotlight two"/><div className="arena-ring r1"/><div className="arena-ring r2"/></div>
    <header className="game-header">
      <div className="round-pill"><Radio size={14}/><span>РАУНД {state.round}</span><i>{state.status.toUpperCase()}</i></div>
      <div className="hp-panel"><div className="hp-title"><strong>ЗДОРОВЬЕ БОССА</strong><span>{state.hp.toLocaleString()} / {state.maxHp.toLocaleString()}</span></div><div className="hp-track"><motion.i animate={{ width: `${hpPercent}%` }} transition={{ type: "spring", stiffness: 90, damping: 18 }}/><b style={{ left: `${hpPercent}%` }}/></div></div>
      <div className={`connection-dot ${connected ? "online" : "offline"}`}>{connected ? <Wifi size={14}/> : <WifiOff size={14}/>}</div>
    </header>
    <aside className="supporters"><h3><Trophy size={15}/> ЛУЧШИЕ ИГРОКИ</h3>{state.settings.leaderboardEnabled && state.leaderboard.slice(0,3).map((row, index) => <div className="supporter" key={row.viewerId}><span className={`rank r${index+1}`}>{index+1}</span><i>{row.username.slice(0,1).toUpperCase()}</i><div><b>@{row.username}</b><small>{row.coins.toLocaleString()} монет · {row.damage.toLocaleString()} урона</small></div></div>)}</aside>
    <div className="item-rail left">{items.slice(0,5).map(item => <GiftCard mapping={item} key={item.giftId}/>)}</div>
    <div className="item-rail right">{items.slice(5).map(item => <GiftCard mapping={item} key={item.giftId}/>)}</div>
  <main className="boss-zone"><div className="target-halo"/><motion.div className="boss-wrap" animate={effects.length ? { x: [0,-10,12,-6,0], rotate: [0,-1,1.5,-.5,0] } : { y: [0,-4,0] }} transition={effects.length ? { duration: .35 } : { duration: 2.8, repeat: Infinity }}><Image src="/game/grumpy-boss.webp" width={720} height={1280} priority alt="Угрюмый Босс"/></motion.div><div className="boss-label"><Crown size={14}/><span>УГРЮМЫЙ БОСС</span></div></main>
    <AnimatePresence>{effects.map((effect) => <EffectAnimation key={effect.id} effect={effect} onDone={() => finishEffect(effect.id)}/>)}</AnimatePresence>
    <AnimatePresence>{effects.slice(-2).map(effect => <motion.div key={`d-${effect.id}`} className={`damage-number ${effect.critical ? "critical" : ""}`} initial={{ opacity:0, y:30, scale:.4 }} animate={{ opacity:1, y:-80, scale:1 }} exit={{ opacity:0, y:-130 }} transition={{ duration:1.15 }} onAnimationComplete={() => {}}>{effect.critical && <small>CRITICAL HIT!</small>}-{effect.damage.toLocaleString()}</motion.div>)}</AnimatePresence>
    {state.combo >= 2 && <motion.div className="combo-badge" key={state.combo} initial={{ scale:.5, rotate:-8 }} animate={{ scale:1, rotate:0 }}><span>КОМБО ХАОСА</span><b>×{state.combo}</b></motion.div>}
    <div className="live-feed"><AnimatePresence>{state.feed.filter(item=>state.settings.commentsEnabled||item.kind!=="comment").slice(0,3).map(item => <motion.div key={item.id} initial={{ opacity:0,x:-20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0 }}><i>{item.kind === "gift" ? "✦" : "•"}</i>{item.text}</motion.div>)}</AnimatePresence></div>
    <footer className="like-goal"><div><Heart size={18} fill="currentColor"/><span>ЦЕЛЬ ЛАЙКОВ</span><b>{state.likeProgress.toLocaleString()} / {state.settings.likeGoal.toLocaleString()}</b></div><div className="like-track"><i style={{ width: `${likePercent}%` }}/></div></footer>
    <AnimatePresence>{(defeated || state.hp <= 0) && <motion.div className="defeated-screen" initial={{ opacity:0,scale:1.2 }} animate={{ opacity:1,scale:1 }} exit={{ opacity:0 }}><span>РАУНД {defeated?.round ?? state.round} ЗАВЕРШЁН</span><h2>БОСС<br/>ПОБЕЖДЁН</h2><p>@{defeated?.winner ?? "КОМАНДА ХАОСА"}<b> УНИЧТОЖИЛ БОССА!</b></p><div className="confetti"/></motion.div>}</AnimatePresence>
  </div>;
}

function GiftCard({ mapping }: { mapping: GiftMapping }) {
  return <div className={`item-chip ${mapping.effect}`}>
    <GiftThumbnail image={mapping.giftImage} name={mapping.giftName} />
    <div><b>{mapping.giftName}</b><small>{mapping.coinValue} мон. → {EFFECT_LABELS[mapping.effect]}</small></div>
  </div>;
}

function playEffectSound(asset: VisualEffectEvent["asset"], enabled: boolean, volume: number) {
  if (!enabled || typeof window === "undefined" || volume <= 0) return;
  try {
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator(); const gain = context.createGain();
    const frequencies: Record<VisualEffectEvent["asset"], number> = { egg: 520, tomato: 360, donut: 440, shoe: 210, brick: 130, bucket: 680, toilet: 95, bomb: 70, meteor: 45 };
    oscillator.type = asset === "bomb" || asset === "meteor" ? "sawtooth" : "sine";
    oscillator.frequency.setValueAtTime(frequencies[asset], context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequencies[asset] * .32), context.currentTime + .22);
    gain.gain.setValueAtTime(Math.min(.25, volume * .18), context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .28);
    oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .3);
    oscillator.addEventListener("ended", () => void context.close());
  } catch { /* Some browser sources require explicit audio capture. */ }
}

function EffectAnimation({ effect, onDone }: { effect: VisualEffectEvent; onDone: () => void }) {
  const side = effect.origin === "right" ? 1 : -1;
  const isDrop = effect.origin === "top";
  const duration = effect.asset === "bomb" ? 1.8 : effect.asset === "meteor" ? 1.4 : .8;
  return <motion.div className={`flying-effect ${effect.asset} ${effect.type}`} initial={isDrop ? { x: "48vw", y: "-20vh", rotate: -30, scale:.6 } : { x: side * 55 + "vw", y: "40vh", rotate: side * 80, scale:.7 }} animate={isDrop ? { x: "4vw", y: "43vh", rotate: 20, scale:1.3 } : { x: "0vw", y: "4vh", rotate: side * 540, scale:1.1 }} exit={{ opacity:0, scale:2.2 }} transition={{ duration, ease: effect.asset === "meteor" ? [0.2,.8,.2,1] : "easeIn" }} onAnimationComplete={onDone}><span><EffectIcon effect={effect.asset} size={effect.asset === "meteor" ? 88 : 54}/></span>{effect.repeatCount > 1 && <b>×{effect.repeatCount}</b>}<div className="particle-burst">{Array.from({ length: Math.min(24, 6 + Math.floor(effect.intensity * 5)) }).map((_,i)=><i key={i} style={{ "--i": i } as React.CSSProperties}/>)}</div></motion.div>;
}
