import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { useAndroidBackButton } from "../hooks/useAndroidBackButton";

export function Layout({
  title,
  showBack,
  children,
}: {
  title: string;
  showBack?: boolean;
  children: ReactNode;
}) {
  useAndroidBackButton();

  return (
    <div className="flex min-h-dvh flex-col bg-soil-50">
      <TopBar title={title} showBack={showBack} />
      <main className="flex-1 overflow-y-auto px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
