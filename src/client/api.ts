// API client for backend communication

const API_BASE = "/api";

export async function fetchStateSync() {
  const res = await fetch(`${API_BASE}/stateSync`);
  if (!res.ok) throw new Error("Failed to fetch state sync");
  return res.json(); // Returns state directly
}

export async function postPoll() {
  const res = await fetch(`${API_BASE}/poll`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to poll");
  return res.json(); // Returns { ok, boost?, rateLimited }
}

export async function postDemoBoost() {
  const res = await fetch(`${API_BASE}/poll?demo=1`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to demo boost");
  return res.json(); // Returns { ok, demo, boost, rateLimited }
}

export async function postVote(optionId: string) {
  const res = await fetch(`${API_BASE}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionId }),
  });
  if (!res.ok) throw new Error("Failed to vote");
  return res.json(); // Returns { ok, dayKey, userHasVoted }
}

export async function postClaim() {
  const res = await fetch(`${API_BASE}/claim`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to claim");
  return res.json(); // Returns { ok, state }
}

export async function postResetDay() {
  const res = await fetch(`${API_BASE}/admin/resetDay`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(data.error || `Reset failed (${res.status})`);
  }
  return res.json(); // Returns { ok, dayKey, resetAtMs }
}
