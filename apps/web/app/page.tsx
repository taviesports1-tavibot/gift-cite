import Link from "next/link";
import Image from "next/image";
import { Activity, Gamepad2, Radio, ShieldCheck } from "lucide-react";

export default function Home() {
  const name = process.env.NEXT_PUBLIC_APP_NAME ?? "ХАОС ПОДАРКОВ";
  return <main className="launch-page">
    <section className="launch-card">
      <div className="brand-row"><span className="brand-mark"><Gamepad2 /></span><span>{name}</span><i>LIVE ARCADE</i></div>
      <div className="launch-grid">
        <div className="launch-copy"><p className="eyebrow"><span /> CLOUD ENGINE READY</p><h1>Зрители запускают<br/><em>настоящий хаос.</em></h1><p>Подарок попадает в realtime‑сервер, превращается в игровой эффект и мгновенно появляется в вертикальном overlay.</p>
          <div className="launch-actions"><Link className="primary-button" href="/demo"><Radio /> Открыть демо</Link><Link className="ghost-button" href="/admin"><ShieldCheck /> Control Center</Link></div>
          <div className="feature-strip"><span><Activity /> Realtime</span><span><ShieldCheck /> Server authoritative</span><span><Radio /> Cloud ready</span></div>
        </div>
        <Link href="/overlay?sessionId=demo" className="mini-stage" aria-label="Открыть overlay"><div className="mini-hp"><b>BOSS HP</b><span>7,420 / 10,000</span><i /></div><Image src="/game/grumpy-boss.webp" alt="The Grumpy Boss" width={520} height={920} priority/><div className="mini-combo">COMBO <b>×25</b></div><div className="mini-impact" /></Link>
      </div>
    </section>
  </main>;
}
