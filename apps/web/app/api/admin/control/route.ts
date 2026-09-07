import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { SERVER_REALTIME_URL } from "@/lib/runtime-config";
export async function POST(request:Request){
 if(!await isAdmin())return NextResponse.json({error:"Требуется вход"},{status:401});
 const token=process.env.REALTIME_ADMIN_TOKEN;
 if(!token)return NextResponse.json({error:"Управление не подключено: добавьте в Vercel переменную REALTIME_ADMIN_TOKEN с тем же значением, что в Railway, затем выполните Redeploy."},{status:503});
 const body=await request.text();
 if(body.length>32000)return NextResponse.json({error:"Слишком большой запрос"},{status:413});
 const upstream=await fetch(`${SERVER_REALTIME_URL}/api/admin/command`,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${token}`},body,cache:"no-store",signal:AbortSignal.timeout(15000)}).catch(()=>null);
 if(!upstream)return NextResponse.json({error:"Нет ответа от Railway. Попробуйте ещё раз."},{status:502});
 if(upstream.status===401)return NextResponse.json({error:"Ключ REALTIME_ADMIN_TOKEN в Vercel не совпадает с ключом в Railway."},{status:503});
 return new NextResponse(await upstream.text(),{status:upstream.status,headers:{"content-type":"application/json"}});
}
