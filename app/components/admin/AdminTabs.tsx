"use client";

import { useEffect, useState, type ReactNode } from "react";

type AdminTabId = "reports" | "users" | "badges";

type AdminTabsProps = {
  initialTab?: AdminTabId;
  tabs: Array<{
    id: AdminTabId;
    label: string;
    content: ReactNode;
  }>;
};

export default function AdminTabs({
  initialTab = "users",
  tabs,
}: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<AdminTabId>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                isActive
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>
        {tabs.map((tab) =>
          tab.id === activeTab ? (
            <div key={tab.id}>{tab.content}</div>
          ) : null
        )}
      </div>
    </div>
  );
}
