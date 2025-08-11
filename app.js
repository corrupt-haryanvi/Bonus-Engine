// Minimal shareable bonus calculator PWA
const $ = (id) => document.getElementById(id);

const INR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function formatINR(n) {
  return INR.format(Math.max(0, Math.floor(Number(n)||0)));
}

let TIERS = [];
const PRESETS = [500, 1000, 5000, 10000, 25000, 50000];

async function loadTiers() {
  try {
    const res = await fetch("tiers.json", { cache: "no-store" });
    TIERS = await res.json();
  } catch (e) {
    console.warn("Could not load tiers.json", e);
    TIERS = [];
  }
}

function findTier(amount) {
  return TIERS
    .filter(t => amount >= t.min && (t.max === undefined || amount < t.max))
    .sort((a, b) => b.min - a.min)[0];
}

function computeBonus(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return { bonus: 0, tier: null, message: "Invalid amount." };
  const tier = findTier(amount);
  if (!tier) return { bonus: 0, tier: null, message: "No bonus." };
  const raw = amount * Number(tier.rate);
  const capped = tier.cap ? Math.min(raw, Number(tier.cap)) : raw;
  const bonus = Math.floor(capped); // change to Math.round if policy requires
  const message = [
    `Deposit: ₹${formatINR(amount)}`,
    `Bonus: ₹${formatINR(bonus)} (${(tier.rate*100).toFixed(0)}%${tier.cap ? `, cap ₹${formatINR(tier.cap)}` : ""})`,
    `Total credit: ₹${formatINR(amount + bonus)}`
  ].join(" | ");
  return { bonus, tier, message };
}

async function main() {
  // PWA registration
  if ("serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("sw.js"); } catch {}
  }

  await loadTiers();

  // Preset chips
  const presetEl = $("presets");
  presetEl.innerHTML = "";
  PRESETS.forEach(n => {
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
