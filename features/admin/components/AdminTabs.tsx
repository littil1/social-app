"use client";

import { useEffect, useState, type ReactNode } from "react";

type AdminTabId = "moderation" | "users" | "badges";

type AdminTabsProps = {
  initialTab?: AdminTabId;
  tabs: Array<{
    id: AdminTabId;
    label: string;
    content: ReactNode;
  }>;
};

export default function AdminTabs({
  initialTab = "moderation",
  tabs,
}: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<AdminTabId>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="w-full min-w-0 space-y-3 overflow-hidden">
      <div className="flex min-w-0 flex-wrap gap-1.5 overflow-hidden rounded-2xl border border-neutral-200 bg-white/85 p-1.5 shadow-sm">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`motion-button rounded-full border px-4 py-2 text-sm font-bold transition ${
                isActive
                  ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                  : "border-transparent bg-transparent text-neutral-600 hover:border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-w-0 overflow-hidden">
        {tabs.map((tab) =>
          tab.id === activeTab ? (
            <div key={tab.id} className="soft-enter min-w-0 overflow-hidden">
              {tab.content}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
