import { execute, generateId, query, queryOne } from "@/lib/db";
import { centsToBRL, parseBRLToCents } from "@/lib/money";

export type FinanceType = "income" | "expense" | "transfer";
export type FinanceStatus = "paid" | "pending" | "overdue" | "cancelled";
export type FinanceSource = "manual" | "daily" | "recurring" | "imported";
export type PeriodMode = "month" | "last30" | "year" | "custom";

export type FinancePeriod = {
  mode: PeriodMode;
  start: string;
  end: string;
  month: string;
};

export type FinanceTransaction = {
  id: string;
  user_id: string;
  daily_entry_id: string | null;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  title: string;
  description: string | null;
  transaction_type: FinanceType;
  amount_cents: number;
  transaction_date: string;
  due_date: string | null;
  paid_at: number | null;
  status: FinanceStatus;
  source: FinanceSource;
  recurrence_id: string | null;
  payment_method: string | null;
  account_name: string | null;
  created_at: number;
  updated_at: number;
};

export type FinanceCategory = {
  id: string;
  user_id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
  monthly_limit_cents: number | null;
  archived_at: number | null;
};

export type TransactionInput = {
  title: string;
  amount_cents: number;
  transaction_type: FinanceType;
  category_id?: string | null;
  category_name?: string;
  transaction_date: string;
  due_date?: string | null;
  status?: FinanceStatus;
  source?: FinanceSource;
  daily_entry_id?: string | null;
  recurrence_id?: string | null;
  description?: string | null;
  payment_method?: string | null;
  account_name?: string | null;
  recurring?: boolean;
  recurrence?: {
    frequency: "weekly" | "monthly" | "annual";
    due_day?: number | null;
    start_date: string;
    end_date?: string | null;
    repeat_count?: number | null;
  } | null;
};

export const expenseCategoryDefaults = [
  ["Moradia", "home", "#a78bfa"],
  ["Alimentação", "utensils", "#86efac"],
  ["Transporte", "car", "#93c5fd"],
  ["Saúde", "heart", "#f9a8d4"],
  ["Beleza", "sparkles", "#f0abfc"],
  ["Lazer", "ticket", "#fdba74"],
  ["Assinaturas", "repeat", "#c4b5fd"],
  ["Estudos", "book", "#67e8f9"],
  ["Trabalho", "briefcase", "#a7f3d0"],
  ["Casa", "home", "#ddd6fe"],
  ["Pets", "paw", "#fbcfe8"],
  ["Compras", "shopping-bag", "#fecaca"],
  ["Viagens", "plane", "#bfdbfe"],
  ["Dívidas", "receipt", "#fca5a5"],
  ["Outros", "wallet", "#cbd5e1"],
] as const;

export const incomeCategoryDefaults = [
  ["Salário", "wallet", "#86efac"],
  ["Trabalho freelance", "briefcase", "#a7f3d0"],
  ["Parceria", "sparkles", "#c4b5fd"],
  ["Venda", "shopping-bag", "#93c5fd"],
  ["Comissão", "receipt", "#67e8f9"],
  ["Presente", "heart", "#f9a8d4"],
  ["Reembolso", "repeat", "#ddd6fe"],
  ["Outros", "wallet", "#cbd5e1"],
] as const;

export { centsToBRL, parseBRLToCents };

export function monthPeriod(month: string): FinancePeriod {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = `${month}-01`;
  const endDate = new Date(year, monthNumber, 0);
  const end = `${month}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { mode: "month", start, end, month };
}

export function getPeriodFromParams(params: URLSearchParams): FinancePeriod {
  const mode = (params.get("mode") as PeriodMode | null) ?? "month";
  const today = new Date();
  const month = params.get("month") ?? today.toISOString().slice(0, 7);

  if (mode === "last30") {
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    return { mode, start: start.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10), month };
  }

  if (mode === "year") {
    const year = month.slice(0, 4);
    return { mode, start: `${year}-01-01`, end: `${year}-12-31`, month };
  }

  if (mode === "custom") {
    return {
      mode,
      start: params.get("start") ?? monthPeriod(month).start,
      end: params.get("end") ?? monthPeriod(month).end,
      month,
    };
  }

  return monthPeriod(month);
}

export async function ensureDefaultFinanceCategories(userId: string) {
  const count = await queryOne<{ count: number }>(
    "SELECT COUNT(*) AS count FROM financial_categories WHERE user_id = ?",
    userId,
  );
  if (Number(count?.count ?? 0) > 0) return;

  for (const [name, icon, color] of incomeCategoryDefaults) {
    await execute(
      `INSERT OR IGNORE INTO financial_categories (id, user_id, name, type, icon, color, created_at, updated_at)
       VALUES (?, ?, ?, 'income', ?, ?, unixepoch(), unixepoch())`,
      generateId(),
      userId,
      name,
      icon,
      color,
    );
  }

  for (const [name, icon, color] of expenseCategoryDefaults) {
    await execute(
      `INSERT OR IGNORE INTO financial_categories (id, user_id, name, type, icon, color, created_at, updated_at)
       VALUES (?, ?, ?, 'expense', ?, ?, unixepoch(), unixepoch())`,
      generateId(),
      userId,
      name,
      icon,
      color,
    );
  }
}

export async function getFinanceCategories(userId: string) {
  await ensureDefaultFinanceCategories(userId);
  return query<FinanceCategory>(
    `SELECT * FROM financial_categories
     WHERE user_id = ? AND archived_at IS NULL
     ORDER BY type DESC, name ASC`,
    userId,
  );
}

export async function getCategoryByName(userId: string, name: string, type: FinanceType) {
  await ensureDefaultFinanceCategories(userId);
  return queryOne<FinanceCategory>(
    `SELECT * FROM financial_categories
     WHERE user_id = ? AND name = ? AND type = ? AND archived_at IS NULL
     LIMIT 1`,
    userId,
    name,
    type === "income" ? "income" : "expense",
  );
}

export async function createFinanceCategory(
  userId: string,
  payload: { name: string; type: "income" | "expense"; icon: string; color: string; monthly_limit_cents?: number | null },
) {
  const id = generateId();
  await execute(
    `INSERT INTO financial_categories (id, user_id, name, type, icon, color, monthly_limit_cents, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
    id,
    userId,
    payload.name,
    payload.type,
    payload.icon,
    payload.color,
    payload.monthly_limit_cents ?? null,
  );
  return queryOne<FinanceCategory>("SELECT * FROM financial_categories WHERE id = ? AND user_id = ?", id, userId);
}

export async function archiveFinanceCategory(userId: string, categoryId: string) {
  await execute(
    "UPDATE financial_categories SET archived_at = unixepoch(), updated_at = unixepoch() WHERE id = ? AND user_id = ?",
    categoryId,
    userId,
  );
}

export async function getFinancialTransactions(
  userId: string,
  period: FinancePeriod,
  filters: {
    search?: string;
    type?: string;
    status?: string;
    categoryId?: string;
    source?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  await ensureDefaultFinanceCategories(userId);
  const conditions = [
    "t.user_id = ?",
    "t.deleted_at IS NULL",
    "COALESCE(t.transaction_date, t.date) BETWEEN ? AND ?",
  ];
  const params: (string | number | null)[] = [userId, period.start, period.end];

  if (filters.search) {
    conditions.push("(t.title LIKE ? OR COALESCE(t.description, t.notes, '') LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.type && filters.type !== "all") {
    conditions.push("COALESCE(t.transaction_type, t.type) = ?");
    params.push(filters.type);
  }
  if (filters.status && filters.status !== "all") {
    conditions.push("t.status = ?");
    params.push(filters.status);
  }
  if (filters.categoryId && filters.categoryId !== "all") {
    conditions.push("t.category_id = ?");
    params.push(filters.categoryId);
  }
  if (filters.source && filters.source !== "all") {
    conditions.push("t.source = ?");
    params.push(filters.source);
  }

  const orderBy = {
    recent: "COALESCE(t.transaction_date, t.date) DESC, t.created_at DESC",
    amount_desc: "COALESCE(NULLIF(t.amount_cents, 0), CAST(ROUND(t.amount * 100) AS INTEGER)) DESC",
    amount_asc: "COALESCE(NULLIF(t.amount_cents, 0), CAST(ROUND(t.amount * 100) AS INTEGER)) ASC",
    category: "c.name ASC, COALESCE(t.transaction_date, t.date) DESC",
    due: "COALESCE(t.due_date, COALESCE(t.transaction_date, t.date)) ASC",
  }[filters.sort ?? "recent"];

  params.push(filters.limit ?? 80, filters.offset ?? 0);

  return query<FinanceTransaction>(
    `SELECT
       t.id, t.user_id, t.daily_entry_id, t.category_id,
       c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
       t.title,
       COALESCE(t.description, t.notes) AS description,
       COALESCE(t.transaction_type, t.type) AS transaction_type,
       COALESCE(NULLIF(t.amount_cents, 0), CAST(ROUND(t.amount * 100) AS INTEGER)) AS amount_cents,
       COALESCE(t.transaction_date, t.date) AS transaction_date,
       t.due_date, t.paid_at, t.status, t.source, t.recurrence_id, t.payment_method, t.account_name,
       t.created_at, t.updated_at
     FROM transactions t
     LEFT JOIN financial_categories c ON c.id = t.category_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    ...params,
  );
}

export async function getFinanceOverview(userId: string, period: FinancePeriod) {
  const previous = previousPeriod(period);
  const [current, prev, upcoming] = await Promise.all([
    queryOne<{ income: number; expenses: number; count_income: number; count_expense: number }>(
      `SELECT
        COALESCE(SUM(CASE WHEN COALESCE(transaction_type, type) = 'income' THEN COALESCE(NULLIF(amount_cents, 0), CAST(ROUND(amount * 100) AS INTEGER)) ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN COALESCE(transaction_type, type) = 'expense' THEN COALESCE(NULLIF(amount_cents, 0), CAST(ROUND(amount * 100) AS INTEGER)) ELSE 0 END), 0) AS expenses,
        SUM(CASE WHEN COALESCE(transaction_type, type) = 'income' THEN 1 ELSE 0 END) AS count_income,
        SUM(CASE WHEN COALESCE(transaction_type, type) = 'expense' THEN 1 ELSE 0 END) AS count_expense
       FROM transactions
       WHERE user_id = ? AND deleted_at IS NULL AND status != 'cancelled'
         AND COALESCE(transaction_date, date) BETWEEN ? AND ?`,
      userId,
      period.start,
      period.end,
    ),
    queryOne<{ income: number; expenses: number }>(
      `SELECT
        COALESCE(SUM(CASE WHEN COALESCE(transaction_type, type) = 'income' THEN COALESCE(NULLIF(amount_cents, 0), CAST(ROUND(amount * 100) AS INTEGER)) ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN COALESCE(transaction_type, type) = 'expense' THEN COALESCE(NULLIF(amount_cents, 0), CAST(ROUND(amount * 100) AS INTEGER)) ELSE 0 END), 0) AS expenses
       FROM transactions
       WHERE user_id = ? AND deleted_at IS NULL AND status != 'cancelled'
         AND COALESCE(transaction_date, date) BETWEEN ? AND ?`,
      userId,
      previous.start,
      previous.end,
    ),
    queryOne<{ amount: number; count: number }>(
      `SELECT
        COALESCE(SUM(COALESCE(NULLIF(amount_cents, 0), CAST(ROUND(amount * 100) AS INTEGER))), 0) AS amount,
        COUNT(*) AS count
       FROM transactions
       WHERE user_id = ? AND deleted_at IS NULL
         AND COALESCE(transaction_type, type) = 'expense'
         AND status IN ('pending', 'overdue')
         AND COALESCE(due_date, transaction_date, date) BETWEEN ? AND ?`,
      userId,
      new Date().toISOString().slice(0, 10),
      period.end,
    ),
  ]);

  const income = Number(current?.income ?? 0);
  const expenses = Number(current?.expenses ?? 0);
  const previousBalance = Number(prev?.income ?? 0) - Number(prev?.expenses ?? 0);
  const balance = income - expenses;

  return {
    income,
    expenses,
    balance,
    countIncome: Number(current?.count_income ?? 0),
    countExpense: Number(current?.count_expense ?? 0),
    previousBalance,
    balanceDelta: balance - previousBalance,
    previousExpense: Number(prev?.expenses ?? 0),
    expenseDeltaPercent: percentChange(Number(prev?.expenses ?? 0), expenses),
    upcomingAmount: Number(upcoming?.amount ?? 0),
    upcomingCount: Number(upcoming?.count ?? 0),
  };
}

export async function createTransaction(userId: string, payload: TransactionInput) {
  await ensureDefaultFinanceCategories(userId);
  const id = generateId();
  let categoryId = payload.category_id ?? null;
  if (!categoryId && payload.category_name) {
    const category = await getCategoryByName(userId, payload.category_name, payload.transaction_type);
    categoryId = category?.id ?? null;
  }

  const recurrenceId = payload.recurring && payload.recurrence ? generateId() : payload.recurrence_id ?? null;
  if (payload.recurring && payload.recurrence && recurrenceId) {
    await execute(
      `INSERT INTO financial_recurrences
       (id, user_id, title, category_id, transaction_type, amount_cents, frequency, due_day, start_date, end_date, repeat_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      recurrenceId,
      userId,
      payload.title,
      categoryId,
      payload.transaction_type,
      payload.amount_cents,
      payload.recurrence.frequency,
      payload.recurrence.due_day ?? null,
      payload.recurrence.start_date,
      payload.recurrence.end_date ?? null,
      payload.recurrence.repeat_count ?? null,
    );
  }

  const status = payload.status ?? "paid";
  const paidAt = status === "paid" ? Math.floor(Date.now() / 1000) : null;
  const dedupeKey = payload.daily_entry_id
    ? `daily:${payload.daily_entry_id}:${payload.title}:${payload.amount_cents}:${payload.transaction_type}:${payload.transaction_date}`
    : null;

  await execute(
    `INSERT OR IGNORE INTO transactions (
      id, user_id, daily_entry_id, category_id, title, amount, type, category, date, notes,
      transaction_type, amount_cents, description, transaction_date, due_date, paid_at, status, source,
      recurrence_id, payment_method, account_name, created_at, updated_at, dedupe_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch(), ?)`,
    id,
    userId,
    payload.daily_entry_id ?? null,
    categoryId,
    payload.title,
    payload.amount_cents / 100,
    payload.transaction_type === "transfer" ? "expense" : payload.transaction_type,
    payload.category_name ?? "Outros",
    payload.transaction_date,
    payload.description ?? null,
    payload.transaction_type,
    payload.amount_cents,
    payload.description ?? payload.title,
    payload.transaction_date,
    payload.due_date ?? payload.transaction_date,
    paidAt,
    status,
    payload.source ?? "manual",
    recurrenceId,
    payload.payment_method ?? null,
    payload.account_name ?? null,
    dedupeKey,
  );

  return queryOne<FinanceTransaction>(
    `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
      COALESCE(t.transaction_date, t.date) AS transaction_date,
      COALESCE(t.transaction_type, t.type) AS transaction_type,
      COALESCE(NULLIF(t.amount_cents, 0), CAST(ROUND(t.amount * 100) AS INTEGER)) AS amount_cents,
      COALESCE(t.description, t.notes) AS description
     FROM transactions t
     LEFT JOIN financial_categories c ON c.id = t.category_id
     WHERE t.id = ? AND t.user_id = ?`,
    id,
    userId,
  );
}

export async function updateTransaction(userId: string, transactionId: string, payload: Partial<TransactionInput>) {
  const updates: string[] = [];
  const params: (string | number | null)[] = [];
  if (payload.title !== undefined) { updates.push("title = ?"); params.push(payload.title); }
  if (payload.amount_cents !== undefined) {
    updates.push("amount_cents = ?", "amount = ?");
    params.push(payload.amount_cents, payload.amount_cents / 100);
  }
  if (payload.transaction_type !== undefined) {
    updates.push("transaction_type = ?", "type = ?");
    params.push(payload.transaction_type, payload.transaction_type === "transfer" ? "expense" : payload.transaction_type);
  }
  if (payload.category_id !== undefined) { updates.push("category_id = ?"); params.push(payload.category_id); }
  if (payload.transaction_date !== undefined) { updates.push("transaction_date = ?", "date = ?"); params.push(payload.transaction_date, payload.transaction_date); }
  if (payload.due_date !== undefined) { updates.push("due_date = ?"); params.push(payload.due_date); }
  if (payload.status !== undefined) { updates.push("status = ?", "paid_at = ?"); params.push(payload.status, payload.status === "paid" ? Math.floor(Date.now() / 1000) : null); }
  if (payload.description !== undefined) { updates.push("description = ?", "notes = ?"); params.push(payload.description, payload.description); }
  if (payload.payment_method !== undefined) { updates.push("payment_method = ?"); params.push(payload.payment_method); }
  if (payload.account_name !== undefined) { updates.push("account_name = ?"); params.push(payload.account_name); }
  if (updates.length === 0) return;
  updates.push("updated_at = unixepoch()");
  params.push(transactionId, userId);
  await execute(`UPDATE transactions SET ${updates.join(", ")} WHERE id = ? AND user_id = ? AND deleted_at IS NULL`, ...params);
}

export async function deleteTransaction(userId: string, transactionId: string) {
  await execute(
    "UPDATE transactions SET deleted_at = unixepoch(), updated_at = unixepoch() WHERE id = ? AND user_id = ?",
    transactionId,
    userId,
  );
}

export async function duplicateTransaction(userId: string, transactionId: string) {
  const existing = await queryOne<FinanceTransaction>(
    `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
      COALESCE(t.transaction_date, t.date) AS transaction_date,
      COALESCE(t.transaction_type, t.type) AS transaction_type,
      COALESCE(NULLIF(t.amount_cents, 0), CAST(ROUND(t.amount * 100) AS INTEGER)) AS amount_cents,
      COALESCE(t.description, t.notes) AS description
     FROM transactions t
     LEFT JOIN financial_categories c ON c.id = t.category_id
     WHERE t.id = ? AND t.user_id = ? AND t.deleted_at IS NULL`,
    transactionId,
    userId,
  );
  if (!existing) return null;
  return createTransaction(userId, {
    title: `${existing.title} (cópia)`,
    amount_cents: existing.amount_cents,
    transaction_type: existing.transaction_type,
    category_id: existing.category_id,
    category_name: existing.category_name ?? undefined,
    transaction_date: new Date().toISOString().slice(0, 10),
    due_date: existing.due_date,
    status: existing.status,
    source: "manual",
    description: existing.description,
    payment_method: existing.payment_method,
    account_name: existing.account_name,
  });
}

export async function markTransactionAsPaid(userId: string, transactionId: string) {
  await execute(
    "UPDATE transactions SET status = 'paid', paid_at = unixepoch(), updated_at = unixepoch() WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
    transactionId,
    userId,
  );
}

export async function postponeTransaction(userId: string, transactionId: string, newDate: string) {
  await execute(
    "UPDATE transactions SET due_date = ?, transaction_date = ?, date = ?, status = 'pending', updated_at = unixepoch() WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
    newDate,
    newDate,
    newDate,
    transactionId,
    userId,
  );
}

export async function getUpcomingBills(userId: string, period: FinancePeriod) {
  const today = new Date().toISOString().slice(0, 10);
  return query<FinanceTransaction>(
    `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
      COALESCE(t.transaction_date, t.date) AS transaction_date,
      COALESCE(t.transaction_type, t.type) AS transaction_type,
      COALESCE(NULLIF(t.amount_cents, 0), CAST(ROUND(t.amount * 100) AS INTEGER)) AS amount_cents,
      COALESCE(t.description, t.notes) AS description,
      CASE
        WHEN t.status = 'pending' AND COALESCE(t.due_date, t.transaction_date, t.date) < ? THEN 'overdue'
        ELSE t.status
      END AS status
     FROM transactions t
     LEFT JOIN financial_categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.deleted_at IS NULL
       AND COALESCE(t.transaction_type, t.type) = 'expense'
       AND t.status IN ('pending', 'overdue')
       AND COALESCE(t.due_date, t.transaction_date, t.date) BETWEEN ? AND ?
     ORDER BY COALESCE(t.due_date, t.transaction_date, t.date) ASC
     LIMIT 12`,
    today,
    userId,
    today,
    period.end,
  );
}

export async function getCategoryBreakdown(userId: string, period: FinancePeriod) {
  await ensureDefaultFinanceCategories(userId);
  return query<{
    category_id: string;
    name: string;
    type: "income" | "expense";
    icon: string;
    color: string;
    monthly_limit_cents: number | null;
    total_cents: number;
    count: number;
  }>(
    `SELECT
      c.id AS category_id, c.name, c.type, c.icon, c.color, c.monthly_limit_cents,
      COALESCE(SUM(COALESCE(NULLIF(t.amount_cents, 0), CAST(ROUND(t.amount * 100) AS INTEGER))), 0) AS total_cents,
      COUNT(t.id) AS count
     FROM financial_categories c
     LEFT JOIN transactions t ON t.category_id = c.id
      AND t.user_id = c.user_id
      AND t.deleted_at IS NULL
      AND t.status != 'cancelled'
      AND COALESCE(t.transaction_date, t.date) BETWEEN ? AND ?
     WHERE c.user_id = ? AND c.archived_at IS NULL
     GROUP BY c.id
     ORDER BY total_cents DESC, c.name ASC`,
    period.start,
    period.end,
    userId,
  );
}

export async function getFinanceEvolution(userId: string, months = 6) {
  const now = new Date();
  const rows: Array<{ month: string; label: string; income: number; expenses: number; balance: number }> = [];
  for (let index = months - 1; index >= 0; index--) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const month = date.toISOString().slice(0, 7);
    const period = monthPeriod(month);
    const overview = await getFinanceOverview(userId, period);
    rows.push({
      month,
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date),
      income: overview.income,
      expenses: overview.expenses,
      balance: overview.balance,
    });
  }
  return rows;
}

export async function getBudgetOverview(userId: string, month: string, breakdown?: Awaited<ReturnType<typeof getCategoryBreakdown>>) {
  const budget = await queryOne<{
    expected_income_cents: number;
    fixed_expenses_cents: number;
    reserve_goal_cents: number;
  }>("SELECT expected_income_cents, fixed_expenses_cents, reserve_goal_cents FROM monthly_budgets WHERE user_id = ? AND month = ?", userId, month);
  const categoryBudgets = await query<{ category_id: string; limit_cents: number }>(
    "SELECT category_id, limit_cents FROM monthly_category_budgets WHERE user_id = ? AND month = ?",
    userId,
    month,
  );
  const categoryLimits = new Map(categoryBudgets.map((item) => [item.category_id, item.limit_cents]));
  const items = (breakdown ?? []).filter((item) => item.type === "expense").map((item) => {
    const limit = categoryLimits.get(item.category_id) ?? item.monthly_limit_cents ?? 0;
    return {
      categoryId: item.category_id,
      name: item.name,
      color: item.color,
      usedCents: item.total_cents,
      limitCents: limit,
      percent: limit > 0 ? Math.round((item.total_cents / limit) * 100) : 0,
    };
  });
  const used = items.reduce((sum, item) => sum + item.usedCents, 0);
  const expectedIncome = Number(budget?.expected_income_cents ?? 0);
  const fixed = Number(budget?.fixed_expenses_cents ?? 0);
  const reserve = Number(budget?.reserve_goal_cents ?? 0);
  return {
    expectedIncomeCents: expectedIncome,
    fixedExpensesCents: fixed,
    reserveGoalCents: reserve,
    freeCents: expectedIncome - fixed - reserve - used,
    categories: items,
  };
}

export async function createBudgetCategory(
  userId: string,
  payload: { month: string; category_id: string; limit_cents: number },
) {
  const id = generateId();
  await execute(
    `INSERT INTO monthly_category_budgets (id, user_id, month, category_id, limit_cents, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())
     ON CONFLICT(user_id, month, category_id) DO UPDATE SET limit_cents = excluded.limit_cents, updated_at = unixepoch()`,
    id,
    userId,
    payload.month,
    payload.category_id,
    payload.limit_cents,
  );
}

export function getFinancialInsights(args: {
  overview: Awaited<ReturnType<typeof getFinanceOverview>>;
  breakdown: Awaited<ReturnType<typeof getCategoryBreakdown>>;
  upcoming: FinanceTransaction[];
}) {
  const insights: string[] = [];
  const topExpense = args.breakdown.filter((item) => item.type === "expense" && item.total_cents > 0).sort((a, b) => b.total_cents - a.total_cents)[0];
  if (topExpense) insights.push(`Sua maior categoria foi ${topExpense.name}.`);
  if (args.overview.balance > 0) insights.push("Você recebeu mais do que gastou neste período.");
  if (args.overview.balance < 0) insights.push("Este mês está mais apertado. Vamos olhar para o que ainda pode ser ajustado.");
  if (args.upcoming.length > 0) insights.push(`Você ainda tem ${centsToBRL(args.overview.upcomingAmount)} planejados para os próximos dias.`);
  if (args.overview.expenseDeltaPercent !== null) {
    insights.push(`Suas despesas ficaram ${Math.abs(args.overview.expenseDeltaPercent)}% ${args.overview.expenseDeltaPercent >= 0 ? "maiores" : "menores"} que no período anterior.`);
  }
  return insights.slice(0, 5);
}

export function previousPeriod(period: FinancePeriod): FinancePeriod {
  if (period.mode === "year") {
    const year = Number(period.month.slice(0, 4)) - 1;
    return { mode: period.mode, start: `${year}-01-01`, end: `${year}-12-31`, month: `${year}-01` };
  }
  const [year, month] = period.month.split("-").map(Number);
  const prev = new Date(year, month - 2, 1);
  return monthPeriod(prev.toISOString().slice(0, 7));
}

export function percentChange(previous: number, current: number) {
  if (previous === 0) return current === 0 ? null : 100;
  return Math.round(((current - previous) / previous) * 100);
}
