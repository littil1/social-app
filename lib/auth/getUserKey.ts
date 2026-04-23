export function getUserKey() {
  let userKey = localStorage.getItem("user_key");

  if (!userKey) {
    userKey = crypto.randomUUID();
    localStorage.setItem("user_key", userKey);
  }

  return userKey;
}