import { describe, expect, it } from "vitest";
import { GameEngine, aggregateRepeatVisual, calculateDamage, createInitialState, updateLeaderboard } from "../packages/game-engine/src/index";
import { DEFAULT_MAPPINGS, type NormalizedTikTokEvent } from "@gift-chaos/shared";
const gift=(id:string,repeatCount=1):NormalizedTikTokEvent=>({id,kind:"gift",viewer:{id:"viewer-1",username:"Anton"},occurredAt:new Date().toISOString(),giftId:"rose",giftName:"Rose",coinValue:1,repeatCount});
const runningState=()=>({...createInitialState(),status:"running" as const});
describe("Gift Chaos game engine",()=>{
 it("calculates mapping damage with repeat and multipliers",()=>expect(calculateDamage({...DEFAULT_MAPPINGS[0]!,multiplier:2},10,3)).toBe(300));
 it("aggregates long egg streaks into a rain effect",()=>expect(aggregateRepeatVisual(50,DEFAULT_MAPPINGS[0]!).type).toBe("rain"));
 it("deduplicates the same provider event",()=>{const engine=new GameEngine(runningState());expect(engine.process(gift("same")).duplicate).toBe(false);expect(engine.process(gift("same")).duplicate).toBe(true);expect(engine.state.hp).toBe(9995)});
 it("updates leaderboard coins, damage and gift count",()=>{const rows=updateLeaderboard([],gift("1",5),25);expect(rows[0]).toMatchObject({coins:5,damage:25,gifts:5})});
 it("completes a round exactly when hp reaches zero",()=>{const engine=new GameEngine({...runningState(),hp:5});const result=engine.process(gift("kill"));expect(result.roundCompleted).toBe(true);expect(result.state.hp).toBe(0);expect(result.state.stats.bossesDefeated).toBe(1)});
 it("processes a burst without lost updates",()=>{const engine=new GameEngine(runningState());for(let i=0;i<100;i++)engine.process(gift(`burst-${i}`));expect(engine.state.hp).toBe(9500);expect(engine.state.stats.totalGifts).toBe(100);expect(engine.state.leaderboard[0]?.damage).toBe(500)});
});
