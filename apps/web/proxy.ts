import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "./lib/admin-auth";
async function digest(value:string){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");}
export async function proxy(request:NextRequest){if(request.nextUrl.pathname==="/admin/login")return NextResponse.next();const password=process.env.ADMIN_PASSWORD??"";const secret=process.env.AUTH_SECRET??"";const valid=await digest(`${password}:${secret}`);if(!password||!secret||request.cookies.get(ADMIN_COOKIE)?.value!==valid){const login=new URL("/admin/login",request.url);login.searchParams.set("returnTo",request.nextUrl.pathname);return NextResponse.redirect(login);}return NextResponse.next();}
export const config={matcher:["/admin/:path*"]};
