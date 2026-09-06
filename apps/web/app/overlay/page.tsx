import type { Metadata } from "next";
import { GameScene } from "@/components/game-scene";
export const metadata: Metadata = { title: "LIVE Overlay" };
export default async function OverlayPage({ searchParams }: { searchParams: Promise<{ sessionId?: string }> }) { const { sessionId = "live" } = await searchParams; return <main className="overlay-page"><GameScene sessionId={sessionId}/></main>; }
