"use client";

import { useEffect, useState } from "react";

export default function UserKeyInput() {
  const [userKey, setUserKey] = useState("");

  useEffect(() => {
    let existingKey = localStorage.getItem("user_key");

    if (!existingKey) {
      existingKey = crypto.randomUUID();
      localStorage.setItem("user_key", existingKey);
    }

    setUserKey(existingKey);
  }, []);

  return <input type="hidden" name="userKey" value={userKey} />;
}