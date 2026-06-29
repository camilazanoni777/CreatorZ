/**
 * Route Handler: /api/transactions
 * Central financeira: overview, lancamentos, categorias, orcamento e acoes.
 */
import { badRequest, json, parseBody, serverError } from "@/lib/api";
import {
  archiveFinanceCategory,
  createBudgetCategory,
  createFinanceCategory,
  createTransaction,
  deleteTransaction,
  duplicateTransaction,
  getBudgetOverview,
  getCategoryBreakdown,
  getFinanceCategories,
  getFinanceEvolution,
  getFinanceOverview,
  getFinancialInsights,
  getFinancialTransactions,
  getPeriodFromParams,
  getUpcomingBills,
  markTransactionAsPaid,
  parseBRLToCents,
  postponeTransaction,
  updateTransaction,
} from "@/lib/finance";
import { requireSession } from "@/lib/session";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(255),
  amount_cents: z.number().int().positive().optional(),
  amount: z.union([z.number(), z.string()]).optional(),
  transaction_type: z.enum(["income", "expense", "transfer"]).optional(),
  type: z.enum(["income", "expense", "transfer"]).optional(),
  category_id: z.string().nullable().optional(),
  category_name: z.string().optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.enum(["paid", "pending", "overdue", "cancelled"]).default("paid"),
  source: z.enum(["manual", "daily", "recurring", "imported"]).default("manual"),
  daily_entry_id: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  account_name: z.string().nullable().optional(),
  recurring: z.boolean().default(false),
  recurrence: z.object({
    frequency: z.enum(["weekly", "monthly", "annual"]),
    due_day: z.number().int().min(1).max(31).nullable().optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    repeat_count: z.number().int().positive().nullable().optional(),
  }).nullable().optional(),
});

const updateSchema = createSchema.partial().extend({
  action: z.enum(["update", "delete", "duplicate", "mark_paid", "postpone", "archive_category", "budget_category"]).optional(),
  new_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  limit_cents: z.number().int().min(0).optional(),
});

const categorySchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(["income", "expense"]),
  icon: z.string().default("wallet"),
  color: z.string().default("#a78bfa"),
  monthly_limit_cents: z.number().int().min(0).nullable().optional(),
});

function payloadAmountCents(payload: z.infer<typeof createSchema>) {
  if (payload.amount_cents) return payload.amount_cents;
  if (payload.amount !== undefined) return parseBRLToCents(payload.amount);
  return 0;
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const period = getPeriodFromParams(searchParams);
    const action = searchParams.get("action") ?? "bundle";
    const month = period.month;

    if (action === "categories") {
      return json(await getFinanceCategories(session.user.id));
    }

    const filters = {
      search: searchParams.get("search") ?? undefined,
      type: searchParams.get("type") ?? "all",
      status: searchParams.get("status") ?? "all",
      categoryId: searchParams.get("category_id") ?? "all",
      source: searchParams.get("source") ?? "all",
      sort: searchParams.get("sort") ?? "recent",
      limit: Number(searchParams.get("limit") ?? 80),
      offset: Number(searchParams.get("offset") ?? 0),
    };

    const [overview, transactions, upcoming, breakdown, evolution, categories] = await Promise.all([
      getFinanceOverview(session.user.id, period),
      getFinancialTransactions(session.user.id, period, filters),
      getUpcomingBills(session.user.id, period),
      getCategoryBreakdown(session.user.id, period),
      getFinanceEvolution(session.user.id, Number(searchParams.get("months") ?? 6)),
      getFinanceCategories(session.user.id),
    ]);
    const budget = await getBudgetOverview(session.user.id, month, breakdown);

    return json({
      period,
      overview,
      transactions,
      upcoming,
      breakdown,
      evolution,
      budget,
      categories,
      insights: getFinancialInsights({ overview, breakdown, upcoming }),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await parseBody(request);

    if ((body as { kind?: string }).kind === "category") {
      const parsedCategory = categorySchema.safeParse(body);
      if (!parsedCategory.success) return badRequest(parsedCategory.error.issues[0]?.message);
      return json(await createFinanceCategory(session.user.id, parsedCategory.data), 201);
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);
    const amountCents = payloadAmountCents(parsed.data);
    if (amountCents <= 0) return badRequest("Informe um valor valido.");

    const transaction = await createTransaction(session.user.id, {
      title: parsed.data.title,
      amount_cents: amountCents,
      transaction_type: parsed.data.transaction_type ?? parsed.data.type ?? "expense",
      category_id: parsed.data.category_id,
      category_name: parsed.data.category_name,
      transaction_date: parsed.data.transaction_date ?? parsed.data.date ?? new Date().toISOString().slice(0, 10),
      due_date: parsed.data.due_date,
      status: parsed.data.status,
      source: parsed.data.source,
      daily_entry_id: parsed.data.daily_entry_id,
      description: parsed.data.description ?? parsed.data.notes,
      payment_method: parsed.data.payment_method,
      account_name: parsed.data.account_name,
      recurring: parsed.data.recurring,
      recurrence: parsed.data.recurrence,
    });

    return json(transaction, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const body = await parseBody(request);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.issues[0]?.message);

    const action = parsed.data.action ?? "update";

    if (action === "budget_category") {
      if (!parsed.data.month || !parsed.data.category_id || parsed.data.limit_cents === undefined) {
        return badRequest("Mes, categoria e limite sao obrigatorios.");
      }
      await createBudgetCategory(session.user.id, {
        month: parsed.data.month,
        category_id: parsed.data.category_id,
        limit_cents: parsed.data.limit_cents,
      });
      return json({ success: true });
    }

    if (action === "archive_category") {
      if (!id) return badRequest("ID obrigatorio.");
      await archiveFinanceCategory(session.user.id, id);
      return json({ success: true });
    }

    if (!id) return badRequest("ID obrigatorio.");

    if (action === "delete") {
      await deleteTransaction(session.user.id, id);
      return json({ success: true });
    }
    if (action === "duplicate") {
      return json(await duplicateTransaction(session.user.id, id), 201);
    }
    if (action === "mark_paid") {
      await markTransactionAsPaid(session.user.id, id);
      return json({ success: true });
    }
    if (action === "postpone") {
      if (!parsed.data.new_date) return badRequest("Nova data obrigatoria.");
      await postponeTransaction(session.user.id, id, parsed.data.new_date);
      return json({ success: true });
    }

    await updateTransaction(session.user.id, id, {
      ...parsed.data,
      amount_cents: parsed.data.amount_cents ?? (parsed.data.amount !== undefined ? parseBRLToCents(parsed.data.amount) : undefined),
      transaction_type: parsed.data.transaction_type ?? parsed.data.type,
      transaction_date: parsed.data.transaction_date ?? parsed.data.date,
      description: parsed.data.description ?? parsed.data.notes,
    });
    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return badRequest("ID obrigatorio.");
    await deleteTransaction(session.user.id, id);
    return json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return serverError(err);
  }
}
