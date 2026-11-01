import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocForge · 动态技术文档",
  description: "支持版本管理和审核发布的动态技术文档站",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
