import assert from "node:assert/strict";

function summarize(transactions) {
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amountCents, 0);
  const expenses = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amountCents, 0);
  return { income, expenses, balance: income - expenses };
}

function categoryBreakdown(transactions) {
  return transactions.reduce((acc, item) => {
    if (item.type !== "expense") return acc;
    acc[item.category] = (acc[item.category] ?? 0) + item.amountCents;
    return acc;
  }, {});
}

function budgetPercent(usedCents, limitCents) {
  if (limitCents <= 0) return 0;
  return Math.round((usedCents / limitCents) * 100);
}

function nextMonthlyOccurrences(startDate, dueDay, count) {
  const start = new Date(`${startDate}T12:00:00`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, Math.min(dueDay, 28));
    return date.toISOString().slice(0, 10);
  });
}

function percentChange(previous, current) {
  if (previous === 0) return current === 0 ? null : 100;
  return Math.round(((current - previous) / previous) * 100);
}

const transactions = [
  { type: "income", category: "Salário", amountCents: 500000 },
  { type: "expense", category: "Alimentação", amountCents: 86000 },
  { type: "expense", category: "Lazer", amountCents: 24000 },
  { type: "expense", category: "Alimentação", amountCents: 14000 },
];

assert.deepEqual(summarize(transactions), { income: 500000, expenses: 124000, balance: 376000 });
assert.deepEqual(categoryBreakdown(transactions), { "Alimentação": 100000, Lazer: 24000 });
assert.equal(budgetPercent(60000, 80000), 75);
assert.deepEqual(nextMonthlyOccurrences("2026-06-10", 15, 3), ["2026-06-15", "2026-07-15", "2026-08-15"]);
assert.equal(percentChange(100000, 122000), 22);
assert.equal(percentChange(0, 0), null);

console.log("finance-calculations ok");
