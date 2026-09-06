import type { Metadata } from "next";
import { DemoConsole } from "@/components/demo-console";
export const metadata: Metadata = { title: "Demo Mode" };
export default function DemoPage(){return <DemoConsole/>}
