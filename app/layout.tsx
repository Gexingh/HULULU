import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "呼噜噜 TruthLens｜双模型公共信息核验",
  description: "基于 Gonka 去中心化推理网络，由 Kimi 与 MiniMax 交叉核验网络信息并生成可追溯 Truth Score。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
