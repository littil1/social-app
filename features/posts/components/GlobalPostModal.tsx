"use client";

import { useEffect, useState } from "react";
import CreatePostForm from "./CreatePostForm";
import { useRouter, usePathname } from "next/navigation";

type GlobalPostModalProps = {
  isLoggedIn: boolean;
  currentUserProfile?: {
    username: string;
    avatar_url: string | null;
  } | null;
};

export default function GlobalPostModal({
  isLoggedIn,
  currentUserProfile,
}: GlobalPostModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-create-post", handleOpen);
    return () => window.removeEventListener("open-create-post", handleOpen);
  }, []);

  const handlePostCreated = () => {
    setIsOpen(false);
    
    // Erzwingt den Daten-Refresh vom Server
    router.refresh(); 

    // Falls man nicht auf dem Leaderboard ist, dorthin leiten
    if (pathname !== "/leaderboard") {
      router.push("/leaderboard");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm soft-enter sm:items-center sm:p-6">
      <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
      <div className="soft-enter relative z-10 w-full rounded-t-[32px] bg-white p-6 shadow-2xl sm:max-w-xl sm:rounded-[32px]">
        <CreatePostForm
          onPostCreated={handlePostCreated}
          isLoggedIn={isLoggedIn}
          onClose={() => setIsOpen(false)}
          currentUserProfile={currentUserProfile}
        />
      </div>
    </div>
  );
}
