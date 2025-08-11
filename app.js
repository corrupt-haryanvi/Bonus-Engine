// app.js — Bonus Calculator (with cache-busted tiers.json fetch)

// Bump this whenever you change tiers.json so clients fetch fresh rules.
const TIERS_VERSION = "v4";

const $ = (id) => document.getElementById(id);
const INR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function formatINR(n) {
  return INR.format(Math.max(0, Math.floor(Number(n) || 0)));
}

let TIERS = [];
const PRESETS = [500, 1000, 5000, 10000, 25000, 50000];

async function loadTiers() {
  // Cache-busted + no-store ensures we bypass stale SW cache
  const res = await fetch(`tiers.json?${encodeURIComponent(TIERS_VERSION)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load tiers.json");
  TIERS = await res.json();
}

function findTier(amount) {
  // Note: max is exclusive. If you want inclusive, adjust here.
  return TIERS
    .filter((t) => amount >= t.min && (t.max === undefined || amount < t.max))
    .sort((a, b) => b.min - a.min)[0];
}

function computeBonus(amount) {
  if (!Number.isFinite(amount) || amount <= 0)
    return { bonus: 0, tier: null, message: "Invalid amount." };

  const tier = findTier(amount);
  if (!tier) return { bonus: 0, tier: null, message: "No bonus." };

  const raw = amount * Number(tier.rate);
  const capped = tier.cap ? Math.min(raw, Number(tier.cap)) : raw;
  const bonus = Math.floor(capped); // change to Math.round if your policy needs

  const message = [
    `Deposit: ₹${formatINR(amount)}`,
    `Bonus: ₹${formatINR(bonus)} (${(tier.rate * 100).toFixed(0)}%${
      tier.cap ? `, cap ₹${formatINR(tier.cap)}` : ""
    })`,
    `Total credit: ₹${formatINR(amount + bonus)}`,
  ].join(" | ");

  return { bonus, tier, message };
}

async function main() {
  // Register/update the service worker (safe to ignore failures)
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.register("sw.js");
      // Optional: activate updated SW immediately on next load
      if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
    } catch {}
  }

  try {
    await loadTiers();
  } catch (e) {
    console.error(e);
    TIERS = []; // fallback
  }

  // Preset chips
  const presetEl = $("presets");
  presetEl.innerHTML = "";
  PRESETS.forEach((n) => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = `₹${formatINR(n)}`;
    b.addEventListener("click", () => {
      $("amount").value = String(n);
      onAmountChange();
    });
    presetEl.appendChild(b);
  });

  $("amount").addEventListener("input", onAmountChange);

  $("copyBtn").addEventListener("click", async () => {
    const amount = Number($("amount").value.replace(/[^\d]/g, ""));
    const { message } = computeBonus(amount);
    try {
      await navigator.clipboard.writeText(message);
      const btn = $("copyBtn");
      const old = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = old), 1200);
    } catch {}
  });

  onAmountChange();
}

function onAmountChange() {
  const input = $("amount");
  input.value = input.value.replace(/[^\d]/g, "");

  const amount = Number(input.value || 0);
  const notice = $("notice");

  if (amount > 0 && amount < 100) {
    notice.hidden = false;
    notice.textContent = "Tip: enter whole amount in rupees, e.g., 12500";
  } else {
    notice.hidden = true;
  }

  const { bonus, tier } = computeBonus(amount);
  $("bonus").textContent = `₹${formatINR(bonus)}`;
  $("total").textContent = `₹${formatINR(amount + bonus)}`;
  $("tier").textContent = `Selected tier: ${tier?.label ?? "—"}`;
  $("copyBtn").disabled = !amount;
}

main();