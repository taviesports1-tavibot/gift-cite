import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, expectedAdminToken } from "@/lib/admin-auth";
const schema=z.object({password:z.string().min(1).max(200)});
export async function POST(request:Request){if(!process.env.ADMIN_PASSWORD||!process.env.AUTH_SECRET)return NextResponse.json({error:"Вход не настроен: проверьте ADMIN_PASSWORD и AUTH_SECRET в Vercel и выполните Redeploy."},{status:503});const body=schema.safeParse(await request.json().catch(()=>null));if(!body.success||!process.env.ADMIN_PASSWORD||!process.env.AUTH_SECRET||body.data.password!==process.env.ADMIN_PASSWORD)return NextResponse.json({error:"Неверный пароль"},{status:401});const response=NextResponse.json({ok:true});response.cookies.set(ADMIN_COOKIE,expectedAdminToken(),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:60*60*12});return response;}
