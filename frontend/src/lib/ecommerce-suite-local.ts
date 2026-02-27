'use client';

import {
  ECOMMERCE_SUITE_MODULE_CATALOG,
  getEcommerceSuiteModuleCatalogItem,
  isEcommerceSuiteModuleSlug,
  type EcommerceSuiteActionConfig,
  type EcommerceSuiteEntitySeed,
  type EcommerceSuiteModuleCatalogItem,
  type EcommerceSuiteModuleSlug,
  type EcommerceSuiteSeedRow,
  type EcommerceSuiteSeedValue,
} from "@/lib/ecommerce-suite-catalog";

export type { EcommerceSuiteModuleSlug } from "@/lib/ecommerce-suite-catalog";

export type EcommerceSuiteFieldType = "text" | "number" | "boolean";
export type EcommerceSuiteFieldDefinition = {
  key: string;
  label: string;
  type: EcommerceSuiteFieldType;
  required?: boolean;
  editable?: boolean;
};

export type EcommerceSuiteActionInputDefinition = {
  key: string;
  label: string;
  type: EcommerceSuiteFieldType;
  required?: boolean;
};

export type EcommerceSuiteActionDefinition = EcommerceSuiteActionConfig & {
  inputs: EcommerceSuiteActionInputDefinition[];
};

export type EcommerceSuiteEntityDefinition = Omit<EcommerceSuiteEntitySeed, "rows"> & {
  fields: EcommerceSuiteFieldDefinition[];
};

export type EcommerceSuiteActionEvent = {
  id: string;
  moduleSlug: EcommerceSuiteModuleSlug;
  type: "seed-sync" | "create" | "update" | "delete" | "action";
  entityKey?: string;
  actionKey?: string;
  message: string;
  createdAt: string;
};

type EcommerceSuiteLocalWorkspace = {
  initializedAt: string;
  entities: Record<string, EcommerceSuiteSeedRow[]>;
  events: EcommerceSuiteActionEvent[];
};

type EcommerceSuiteLocalState = {
  version: 1;
  modules: Partial<Record<EcommerceSuiteModuleSlug, EcommerceSuiteLocalWorkspace>>;
};

const STORAGE_KEY = "navai:ecommerce-suite:local-state:v1";
const EVENT_NAME = "navai:ecommerce-suite:local-change";

function canUseBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) / 100;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "si";
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function humanizeKey(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function inferFieldType(value: EcommerceSuiteSeedValue): EcommerceSuiteFieldType {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "text";
}

function inferEntityFields(entity: EcommerceSuiteEntitySeed): EcommerceSuiteFieldDefinition[] {
  const keys = new Set<string>();
  for (const row of entity.rows) {
    Object.keys(row).forEach((key) => keys.add(key));
  }
  if (keys.size === 0) keys.add("id");
  const ordered = Array.from(keys).sort((a, b) => {
    if (a === "id") return -1;
    if (b === "id") return 1;
    return a.localeCompare(b);
  });

  return ordered.map((key) => {
    const sample = entity.rows.find((row) => Object.prototype.hasOwnProperty.call(row, key))?.[key] ?? "";
    return {
      key,
      label: humanizeKey(key),
      type: inferFieldType(sample),
      required: key === "id" ? true : false,
      editable: key !== "id",
    };
  });
}

function inferActionInputs(action: EcommerceSuiteActionConfig): EcommerceSuiteActionInputDefinition[] {
  return (action.inputKeys ?? []).map((key) => ({
    key,
    label: humanizeKey(key),
    type:
      key.toLowerCase().includes("amount") || key.toLowerCase().includes("price") || key.toLowerCase().includes("qty")
        ? "number"
        : "text",
    required: true,
  }));
}

function normalizeState(raw: unknown): EcommerceSuiteLocalState {
  if (!isRecord(raw) || !isRecord(raw.modules)) {
    return { version: 1, modules: {} };
  }
  return { version: 1, modules: raw.modules as EcommerceSuiteLocalState["modules"] };
}

function loadState(): EcommerceSuiteLocalState {
  if (!canUseBrowser()) return { version: 1, modules: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, modules: {} };
    return normalizeState(JSON.parse(raw));
  } catch {
    return { version: 1, modules: {} };
  }
}

function saveState(nextState: EcommerceSuiteLocalState) {
  if (!canUseBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { updatedAt: nowIso() } }));
}

function makeSeedSyncEvent(moduleSlug: EcommerceSuiteModuleSlug): EcommerceSuiteActionEvent {
  return {
    id: makeId("evt"),
    moduleSlug,
    type: "seed-sync",
    message: "Seed dataset copied to local workspace.",
    createdAt: nowIso(),
  };
}

function appendEvent(
  workspace: EcommerceSuiteLocalWorkspace,
  event: Omit<EcommerceSuiteActionEvent, "id" | "createdAt">
): EcommerceSuiteLocalWorkspace {
  return {
    ...workspace,
    events: [
      {
        ...event,
        id: makeId("evt"),
        createdAt: nowIso(),
      },
      ...workspace.events,
    ].slice(0, 150),
  };
}

function ensureModuleCatalogItem(moduleSlug: string): EcommerceSuiteModuleCatalogItem {
  const moduleDef = getEcommerceSuiteModuleCatalogItem(moduleSlug);
  if (!moduleDef || !isEcommerceSuiteModuleSlug(moduleSlug)) {
    throw new Error(`Unknown ecommerce module '${moduleSlug}'.`);
  }
  return moduleDef;
}

function seedEntitiesToMap(moduleDef: EcommerceSuiteModuleCatalogItem) {
  return Object.fromEntries(moduleDef.entities.map((entity) => [entity.key, clonePlain(entity.rows)]));
}

function ensureWorkspace(moduleSlug: EcommerceSuiteModuleSlug, existingState = loadState()) {
  const moduleDef = ensureModuleCatalogItem(moduleSlug);
  const current = existingState.modules[moduleSlug];
  if (current) {
    return { moduleDef, workspace: current, state: existingState };
  }
  const workspace: EcommerceSuiteLocalWorkspace = {
    initializedAt: nowIso(),
    entities: seedEntitiesToMap(moduleDef),
    events: [makeSeedSyncEvent(moduleSlug)],
  };
  const nextState: EcommerceSuiteLocalState = {
    ...existingState,
    modules: {
      ...existingState.modules,
      [moduleSlug]: workspace,
    },
  };
  saveState(nextState);
  return { moduleDef, workspace, state: nextState };
}

function replaceWorkspace(
  moduleSlug: EcommerceSuiteModuleSlug,
  workspace: EcommerceSuiteLocalWorkspace,
  state = loadState()
) {
  const nextState: EcommerceSuiteLocalState = {
    ...state,
    modules: {
      ...state.modules,
      [moduleSlug]: workspace,
    },
  };
  saveState(nextState);
  return nextState;
}

function getEntitySeed(moduleDef: EcommerceSuiteModuleCatalogItem, entityKey: string) {
  const entity = moduleDef.entities.find((item) => item.key === entityKey);
  if (!entity) throw new Error(`Unknown entity '${entityKey}' for module ${moduleDef.slug}.`);
  return entity;
}

function getEntityIdPrefix(moduleDef: EcommerceSuiteModuleCatalogItem, entityKey: string) {
  return getEntitySeed(moduleDef, entityKey).idPrefix;
}

function findRowIndex(rows: EcommerceSuiteSeedRow[], recordId: string) {
  return rows.findIndex((row) => String(row.id ?? "") === recordId);
}

function sanitizeRowData(
  input: Record<string, unknown>,
  entityDef: EcommerceSuiteEntitySeed,
  existing?: EcommerceSuiteSeedRow
): EcommerceSuiteSeedRow {
  const base: EcommerceSuiteSeedRow = existing ? { ...existing } : {};
  const fields = inferEntityFields(entityDef);
  for (const field of fields) {
    if (field.key === "id") continue;
    if (!Object.prototype.hasOwnProperty.call(input, field.key)) continue;
    if (field.type === "number") {
      const parsed = toNumber(input[field.key]);
      if (parsed === null) throw new Error(`${field.label} must be a valid number.`);
      base[field.key] = parsed;
      continue;
    }
    if (field.type === "boolean") {
      base[field.key] = toBoolean(input[field.key]);
      continue;
    }
    base[field.key] = toText(input[field.key]);
  }
  const nextId = toText(input.id ?? existing?.id) || makeId(entityDef.idPrefix);
  base.id = nextId;
  if (!Object.prototype.hasOwnProperty.call(base, "createdAt")) base.createdAt = nowIso();
  base.updatedAt = nowIso();
  return base;
}

function summarize(moduleDef: EcommerceSuiteModuleCatalogItem, workspace: EcommerceSuiteLocalWorkspace) {
  const seedEntityCounts = Object.fromEntries(moduleDef.entities.map((entity) => [entity.key, entity.rows.length]));
  const localEntityCounts = Object.fromEntries(
    moduleDef.entities.map((entity) => [entity.key, (workspace.entities[entity.key] ?? []).length])
  );
  return {
    seedEntityCounts,
    localEntityCounts,
    eventCount: workspace.events.length,
    totalSeedRows: Object.values(seedEntityCounts).reduce((sum, value) => sum + Number(value || 0), 0),
    totalLocalRows: Object.values(localEntityCounts).reduce((sum, value) => sum + Number(value || 0), 0),
  };
}

function addDays(dateString: string, days: number) {
  const base = new Date(`${dateString}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return dateString;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function updateRowStatus(
  workspace: EcommerceSuiteLocalWorkspace,
  entityKey: string,
  recordId: string,
  nextStatus: string,
  extras: EcommerceSuiteSeedRow = {}
) {
  const rows = [...(workspace.entities[entityKey] ?? [])];
  const index = findRowIndex(rows, recordId);
  if (index < 0) throw new Error(`Record '${recordId}' not found in ${entityKey}.`);
  rows[index] = { ...rows[index], status: nextStatus, ...extras, updatedAt: nowIso() };
  return {
    ...workspace,
    entities: { ...workspace.entities, [entityKey]: rows },
  };
}

function prependRow(workspace: EcommerceSuiteLocalWorkspace, entityKey: string, row: EcommerceSuiteSeedRow) {
  return {
    ...workspace,
    entities: {
      ...workspace.entities,
      [entityKey]: [row, ...(workspace.entities[entityKey] ?? [])],
    },
  };
}

function runModuleAction(
  moduleSlug: EcommerceSuiteModuleSlug,
  workspace: EcommerceSuiteLocalWorkspace,
  actionKey: string,
  input: Record<string, unknown>
) {
  if (moduleSlug === "ecommerce/product-sales" && actionKey === "open_store_demo_hint") {
    return {
      workspace,
      message: "Use the full product sales store demo on this page for catalog/orders/checkout interactions.",
    };
  }
  if (moduleSlug === "ecommerce/product-sales") {
    if (actionKey === "issue_digital_download") {
      return {
        workspace: prependRow(workspace, "digitalDownloads", {
          id: makeId("dl"),
          orderRef: toText(input.orderRef),
          sku: toText(input.sku),
          customerEmail: toText(input.customerEmail),
          status: "ready",
          downloadsRemaining: 3,
        }),
        message: "Digital download issued.",
      };
    }
    if (actionKey === "consume_download") {
      const rows = [...(workspace.entities.digitalDownloads ?? [])];
      const idx = findRowIndex(rows, toText(input.recordId));
      if (idx < 0) throw new Error(`Digital download '${toText(input.recordId)}' not found.`);
      const current = rows[idx];
      const remaining = Math.max(0, Number(current.downloadsRemaining ?? 0) - 1);
      rows[idx] = {
        ...current,
        downloadsRemaining: remaining,
        status: remaining <= 0 ? "exhausted" : "downloaded",
        updatedAt: nowIso(),
      };
      return { workspace: { ...workspace, entities: { ...workspace.entities, digitalDownloads: rows } }, message: "Digital download consumed." };
    }
  }

  if (moduleSlug === "ecommerce/services") {
    if (actionKey === "confirm_booking") {
      return { workspace: updateRowStatus(workspace, "bookings", toText(input.recordId), "confirmed", { note: toText(input.note) }), message: "Booking confirmed." };
    }
    if (actionKey === "complete_booking") {
      return { workspace: updateRowStatus(workspace, "bookings", toText(input.recordId), "completed"), message: "Booking completed." };
    }
    if (actionKey === "cancel_booking") {
      return { workspace: updateRowStatus(workspace, "bookings", toText(input.recordId), "cancelled"), message: "Booking cancelled." };
    }
    if (actionKey === "reschedule_booking") {
      return { workspace: updateRowStatus(workspace, "bookings", toText(input.recordId), "confirmed", { date: toText(input.date) }), message: "Booking rescheduled." };
    }
  }

  if (moduleSlug === "ecommerce/subscriptions-memberships") {
    if (actionKey === "mark_past_due") {
      return { workspace: updateRowStatus(workspace, "subscriptions", toText(input.recordId), "past_due"), message: "Subscription marked as past_due." };
    }
    if (actionKey === "renew_subscription") {
      const subId = toText(input.recordId);
      const subs = [...(workspace.entities.subscriptions ?? [])];
      const idx = findRowIndex(subs, subId);
      if (idx < 0) throw new Error(`Subscription '${subId}' not found.`);
      const current = subs[idx];
      subs[idx] = {
        ...current,
        status: "active",
        nextBillingDate: addDays(String(current.nextBillingDate ?? nowIso().slice(0, 10)), 30),
        updatedAt: nowIso(),
      };
      const nextWorkspace = prependRow(
        { ...workspace, entities: { ...workspace.entities, subscriptions: subs } },
        "subscriptionInvoices",
        {
          id: makeId("subinv"),
          subscriptionId: subId,
          amount: Number((workspace.entities.plans ?? []).find((row) => String(row.id ?? "") === String(current.planId ?? ""))?.monthlyPrice ?? 0),
          status: "paid",
          billingDate: nowIso().slice(0, 10),
        }
      );
      return { workspace: nextWorkspace, message: "Subscription renewed and invoice created." };
    }
    if (actionKey === "cancel_subscription") {
      return {
        workspace: updateRowStatus(workspace, "subscriptions", toText(input.recordId), "canceled"),
        message: "Subscription canceled.",
      };
    }
    if (actionKey === "upgrade_subscription") {
      const subId = toText(input.recordId);
      const rows = [...(workspace.entities.subscriptions ?? [])];
      const idx = findRowIndex(rows, subId);
      if (idx < 0) throw new Error(`Subscription '${subId}' not found.`);
      rows[idx] = {
        ...rows[idx],
        planId: toText(input.planId) || rows[idx].planId,
        accessLevel: toText(input.accessLevel) || rows[idx].accessLevel,
        status: "active",
        updatedAt: nowIso(),
      };
      return { workspace: { ...workspace, entities: { ...workspace.entities, subscriptions: rows } }, message: "Subscription upgraded." };
    }
    if (actionKey === "record_failed_renewal") {
      const subId = toText(input.recordId);
      const nextSubsWorkspace = updateRowStatus(workspace, "subscriptions", subId, "past_due");
      const currentSub = (workspace.entities.subscriptions ?? []).find((row) => String(row.id ?? "") === subId);
      const amount = Number(
        (workspace.entities.plans ?? []).find((row) => String(row.id ?? "") === String(currentSub?.planId ?? ""))?.monthlyPrice ?? 0
      );
      const nextWorkspace = prependRow(nextSubsWorkspace, "subscriptionInvoices", {
        id: makeId("subinv"),
        subscriptionId: subId,
        amount,
        status: "failed",
        billingDate: nowIso().slice(0, 10),
      });
      return { workspace: nextWorkspace, message: "Failed renewal recorded and subscription marked past_due." };
    }
  }

  if (moduleSlug === "ecommerce/marketplace-multi-vendor") {
    if (actionKey === "settle_vendor") {
      return { workspace: updateRowStatus(workspace, "settlements", toText(input.recordId), "paid"), message: "Settlement paid." };
    }
    if (actionKey === "approve_vendor") {
      return { workspace: updateRowStatus(workspace, "vendors", toText(input.recordId), "active"), message: "Vendor approved." };
    }
    if (actionKey === "suspend_vendor") {
      return { workspace: updateRowStatus(workspace, "vendors", toText(input.recordId), "suspended"), message: "Vendor suspended." };
    }
    if (actionKey === "create_settlement") {
      return {
        workspace: prependRow(workspace, "settlements", {
          id: makeId("settlement"),
          vendorId: toText(input.vendorId),
          amount: toNumber(input.amount) ?? 0,
          status: "pending",
          scheduledDate: toText(input.scheduledDate) || nowIso().slice(0, 10),
        }),
        message: "Settlement batch created.",
      };
    }
  }

  if (moduleSlug === "ecommerce/b2b") {
    if (actionKey === "reject_quote") {
      return { workspace: updateRowStatus(workspace, "quotes", toText(input.recordId), "rejected"), message: "Quote rejected." };
    }
    if (actionKey === "approve_quote") {
      const quoteId = toText(input.recordId);
      const quotes = [...(workspace.entities.quotes ?? [])];
      const idx = findRowIndex(quotes, quoteId);
      if (idx < 0) throw new Error(`Quote '${quoteId}' not found.`);
      const quote = quotes[idx];
      quotes[idx] = { ...quote, status: "approved", updatedAt: nowIso() };
      const nextWorkspace = prependRow(
        { ...workspace, entities: { ...workspace.entities, quotes } },
        "b2bOrders",
        {
          id: makeId("b2b-order"),
          quoteId,
          accountId: quote.accountId ?? "",
          total: Math.round(Number(quote.quantity ?? 0) * Number(quote.unitPrice ?? 0) * 100) / 100,
          status: "pending",
          invoiceDueDate: addDays(nowIso().slice(0, 10), 15),
        }
      );
      return { workspace: nextWorkspace, message: "Quote approved and B2B order created." };
    }
    if (actionKey === "issue_b2b_invoice") {
      const orderId = toText(input.recordId);
      const order = (workspace.entities.b2bOrders ?? []).find((row) => String(row.id ?? "") === orderId);
      if (!order) throw new Error(`B2B order '${orderId}' not found.`);
      return {
        workspace: prependRow(workspace, "b2bInvoices", {
          id: makeId("b2b-inv"),
          orderId,
          amount: Number(order.total ?? 0),
          status: "sent",
          dueDate: String(order.invoiceDueDate ?? addDays(nowIso().slice(0, 10), 15)),
        }),
        message: "B2B invoice issued.",
      };
    }
    if (actionKey === "mark_b2b_order_fulfilled") {
      return { workspace: updateRowStatus(workspace, "b2bOrders", toText(input.recordId), "fulfilled"), message: "B2B order fulfilled." };
    }
  }

  if (moduleSlug === "ecommerce/payments-checkout") {
    if (actionKey === "send_to_review") {
      const paymentId = toText(input.recordId);
      let nextWorkspace = updateRowStatus(workspace, "paymentAttempts", paymentId, "review", { fraudDecision: "review" });
      nextWorkspace = prependRow(nextWorkspace, "fraudCases", {
        id: makeId("fraud"),
        paymentAttemptId: paymentId,
        score: Math.round(60 + Math.random() * 35),
        decision: "review",
        status: "open",
      });
      return {
        workspace: nextWorkspace,
        message: "Payment attempt sent to review.",
      };
    }
    if (actionKey === "capture_payment") {
      const paymentId = toText(input.recordId);
      const paymentRows = [...(workspace.entities.paymentAttempts ?? [])];
      const idx = findRowIndex(paymentRows, paymentId);
      if (idx < 0) throw new Error(`Payment attempt '${paymentId}' not found.`);
      const payment = paymentRows[idx];
      paymentRows[idx] = { ...payment, status: "captured", fraudDecision: payment.fraudDecision ?? "approve", updatedAt: nowIso() };
      let nextWorkspace: EcommerceSuiteLocalWorkspace = { ...workspace, entities: { ...workspace.entities, paymentAttempts: paymentRows } };
      const checkoutId = toText(payment.checkoutId);
      if (checkoutId) nextWorkspace = updateRowStatus(nextWorkspace, "checkouts", checkoutId, "completed");
      return { workspace: nextWorkspace, message: "Payment captured and checkout completed." };
    }
    if (actionKey === "fail_payment") {
      const paymentId = toText(input.recordId);
      const rows = [...(workspace.entities.paymentAttempts ?? [])];
      const idx = findRowIndex(rows, paymentId);
      if (idx < 0) throw new Error(`Payment attempt '${paymentId}' not found.`);
      const row = rows[idx];
      rows[idx] = { ...row, status: "failed", updatedAt: nowIso() };
      let nextWorkspace: EcommerceSuiteLocalWorkspace = { ...workspace, entities: { ...workspace.entities, paymentAttempts: rows } };
      const checkoutId = toText(row.checkoutId);
      if (checkoutId) nextWorkspace = updateRowStatus(nextWorkspace, "checkouts", checkoutId, "open");
      return { workspace: nextWorkspace, message: "Payment attempt failed and checkout reopened." };
    }
    if (actionKey === "approve_fraud_case") {
      const fraudId = toText(input.recordId);
      const fraudRows = [...(workspace.entities.fraudCases ?? [])];
      const fraudIdx = findRowIndex(fraudRows, fraudId);
      if (fraudIdx < 0) throw new Error(`Fraud case '${fraudId}' not found.`);
      const fraud = fraudRows[fraudIdx];
      fraudRows[fraudIdx] = { ...fraud, decision: "approve", status: "closed", updatedAt: nowIso() };
      let nextWorkspace: EcommerceSuiteLocalWorkspace = { ...workspace, entities: { ...workspace.entities, fraudCases: fraudRows } };
      const paymentAttemptId = toText(fraud.paymentAttemptId);
      if (paymentAttemptId) {
        nextWorkspace = updateRowStatus(nextWorkspace, "paymentAttempts", paymentAttemptId, "authorized", {
          fraudDecision: "approve",
        });
      }
      return { workspace: nextWorkspace, message: "Fraud case approved." };
    }
    if (actionKey === "create_payment_refund") {
      const paymentId = toText(input.recordId);
      const amount = toNumber(input.amount) ?? 0;
      let nextWorkspace = prependRow(workspace, "paymentRefunds", {
        id: makeId("pay-refund"),
        paymentAttemptId: paymentId,
        amount,
        status: "created",
        createdDate: nowIso().slice(0, 10),
      });
      nextWorkspace = updateRowStatus(nextWorkspace, "paymentAttempts", paymentId, "refunded");
      return { workspace: nextWorkspace, message: "Payment refund created." };
    }
  }

  if (moduleSlug === "ecommerce/logistics-fulfillment") {
    if (actionKey === "ship_order") {
      const trackingCode = toText(input.trackingCode) || `TRK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      return {
        workspace: updateRowStatus(workspace, "shipments", toText(input.recordId), "in_transit", { trackingCode }),
        message: "Shipment marked in_transit.",
      };
    }
    if (actionKey === "create_rma") {
      return {
        workspace: prependRow(workspace, "returns", {
          id: makeId("rma"),
          orderRef: toText(input.orderRef),
          reason: toText(input.reason),
          status: "requested",
          refundAmount: toNumber(input.refundAmount) ?? 0,
        }),
        message: "RMA created.",
      };
    }
    if (actionKey === "deliver_shipment") {
      return { workspace: updateRowStatus(workspace, "shipments", toText(input.recordId), "delivered"), message: "Shipment delivered." };
    }
    if (actionKey === "approve_rma") {
      return { workspace: updateRowStatus(workspace, "returns", toText(input.recordId), "approved"), message: "RMA approved." };
    }
    if (actionKey === "refund_rma") {
      return { workspace: updateRowStatus(workspace, "returns", toText(input.recordId), "refunded"), message: "RMA refunded." };
    }
  }

  if (moduleSlug === "ecommerce/customer-support") {
    if (actionKey === "resolve_ticket") {
      return { workspace: updateRowStatus(workspace, "tickets", toText(input.recordId), "resolved"), message: "Ticket resolved." };
    }
    if (actionKey === "approve_refund_case") {
      return {
        workspace: updateRowStatus(workspace, "refundCases", toText(input.recordId), "paid", { paymentRef: toText(input.paymentRef) }),
        message: "Refund approved and marked paid.",
      };
    }
    if (actionKey === "escalate_ticket") {
      const rows = [...(workspace.entities.tickets ?? [])];
      const idx = findRowIndex(rows, toText(input.recordId));
      if (idx < 0) throw new Error(`Ticket '${toText(input.recordId)}' not found.`);
      rows[idx] = { ...rows[idx], priority: "urgent", status: rows[idx].status ?? "open", updatedAt: nowIso() };
      return { workspace: { ...workspace, entities: { ...workspace.entities, tickets: rows } }, message: "Ticket escalated." };
    }
    if (actionKey === "approve_warranty") {
      return { workspace: updateRowStatus(workspace, "warranties", toText(input.recordId), "approved"), message: "Warranty approved." };
    }
    if (actionKey === "close_chat_session") {
      return { workspace: updateRowStatus(workspace, "chatSessions", toText(input.recordId), "closed"), message: "Chat session closed." };
    }
  }

  if (moduleSlug === "ecommerce/marketing-conversion") {
    if (actionKey === "launch_campaign") {
      return { workspace: updateRowStatus(workspace, "campaigns", toText(input.recordId), "running"), message: "Campaign launched." };
    }
    if (actionKey === "recover_cart") {
      return {
        workspace: updateRowStatus(workspace, "abandonedCarts", toText(input.recordId), "recovered", { couponCode: toText(input.couponCode) }),
        message: "Abandoned cart recovered.",
      };
    }
    if (actionKey === "pause_coupon") {
      return { workspace: updateRowStatus(workspace, "coupons", toText(input.recordId), "paused"), message: "Coupon paused." };
    }
    if (actionKey === "send_cart_recovery_email") {
      return {
        workspace: updateRowStatus(workspace, "abandonedCarts", toText(input.recordId), "email_sent", { couponCode: toText(input.couponCode) }),
        message: "Recovery email sent for abandoned cart.",
      };
    }
    if (actionKey === "schedule_campaign") {
      return { workspace: updateRowStatus(workspace, "campaigns", toText(input.recordId), "scheduled"), message: "Campaign scheduled." };
    }
  }

  if (moduleSlug === "ecommerce/analytics-reporting" && actionKey === "generate_report_export") {
    return {
      workspace: prependRow(workspace, "reportExports", {
        id: makeId("report"),
        name: toText(input.name),
        type: toText(input.type),
        status: "ready",
        generatedDate: nowIso().slice(0, 10),
      }),
      message: "Report export generated.",
    };
  }
  if (moduleSlug === "ecommerce/analytics-reporting" && actionKey === "record_metric_snapshot") {
    return {
      workspace: prependRow(workspace, "metricSnapshots", {
        id: makeId("metric"),
        date: toText(input.date) || nowIso().slice(0, 10),
        sales: toNumber(input.sales) ?? 0,
        ltv: toNumber(input.ltv) ?? 0,
        cac: toNumber(input.cac) ?? 0,
        conversionRate: toNumber(input.conversionRate) ?? 0,
      }),
      message: "Metric snapshot recorded.",
    };
  }
  if (moduleSlug === "ecommerce/analytics-reporting" && actionKey === "queue_report_export") {
    return {
      workspace: prependRow(workspace, "reportExports", {
        id: makeId("report"),
        name: toText(input.name),
        type: toText(input.type),
        status: "queued",
        generatedDate: nowIso().slice(0, 10),
      }),
      message: "Report export queued.",
    };
  }

  if (moduleSlug === "ecommerce/operations-administration") {
    if (actionKey === "complete_sync_task") {
      return { workspace: updateRowStatus(workspace, "syncTasks", toText(input.recordId), "completed"), message: "Sync task completed." };
    }
    if (actionKey === "submit_einvoice") {
      return {
        workspace: updateRowStatus(workspace, "electronicInvoices", toText(input.recordId), "submitted", { authorityRef: toText(input.authorityRef) }),
        message: "Electronic invoice submitted.",
      };
    }
    if (actionKey === "fail_sync_task") {
      return { workspace: updateRowStatus(workspace, "syncTasks", toText(input.recordId), "failed"), message: "Sync task failed." };
    }
    if (actionKey === "accept_einvoice") {
      return {
        workspace: updateRowStatus(workspace, "electronicInvoices", toText(input.recordId), "accepted", {
          authorityRef: toText(input.authorityRef),
        }),
        message: "Electronic invoice accepted.",
      };
    }
    if (actionKey === "promote_crm_contact") {
      const rows = [...(workspace.entities.crmContacts ?? [])];
      const idx = findRowIndex(rows, toText(input.recordId));
      if (idx < 0) throw new Error(`CRM contact '${toText(input.recordId)}' not found.`);
      const currentStage = toText(rows[idx].stage);
      const nextStage =
        currentStage === "lead" ? "qualified" : currentStage === "qualified" ? "customer" : currentStage;
      rows[idx] = { ...rows[idx], stage: nextStage, updatedAt: nowIso() };
      return { workspace: { ...workspace, entities: { ...workspace.entities, crmContacts: rows } }, message: "CRM contact promoted." };
    }
    if (actionKey === "complete_backoffice_task") {
      return { workspace: updateRowStatus(workspace, "backofficeTasks", toText(input.recordId), "completed"), message: "Back-office task completed." };
    }
  }

  throw new Error(`Unsupported action '${actionKey}' for module ${moduleSlug}.`);
}

export function listEcommerceSuiteModules() {
  return ECOMMERCE_SUITE_MODULE_CATALOG.map((module) => ({
    slug: module.slug,
    title: module.title,
    description: module.description,
    audiences: module.audiences,
    entityCount: module.entities.length,
    actionCount: module.actions.length,
  }));
}

export function getEcommerceSuiteSafetyPolicy() {
  return {
    ok: true,
    readOnlySeedDatasets: true,
    seedMutationAllowed: false,
    localWorkspaceStorage: "localStorage (browser only)",
    localWorkspaceMutationAllowed: true,
    localWorkspaceInitBehavior: "Cloned from seed on first access or on reset",
    notes: [
      "Seed data is immutable and used as a baseline for examples.",
      "All user/NAVAI changes apply only to the local workspace stored in the browser.",
      "Reset restores the local workspace from the read-only seed dataset.",
    ],
  };
}

export function resetEcommerceSuiteModuleLocalWorkspace(moduleSlug: EcommerceSuiteModuleSlug) {
  const moduleDef = ensureModuleCatalogItem(moduleSlug);
  const workspace: EcommerceSuiteLocalWorkspace = {
    initializedAt: nowIso(),
    entities: seedEntitiesToMap(moduleDef),
    events: [makeSeedSyncEvent(moduleSlug)],
  };
  replaceWorkspace(moduleSlug, workspace);
  return { ok: true, moduleSlug, summary: summarize(moduleDef, workspace) };
}

export function clearEcommerceSuiteAllLocalData() {
  saveState({ version: 1, modules: {} });
  return { ok: true };
}

export function getEcommerceSuiteModuleSnapshot(moduleSlug: EcommerceSuiteModuleSlug) {
  const { moduleDef, workspace } = ensureWorkspace(moduleSlug);
  return {
    ok: true,
    readOnlySeed: true,
    localWorkspaceStorage: "localStorage",
    module: {
      slug: moduleDef.slug,
      title: moduleDef.title,
      description: moduleDef.description,
      entities: moduleDef.entities.map((entity) => ({
        key: entity.key,
        label: entity.label,
        description: entity.description,
        idPrefix: entity.idPrefix,
        fields: inferEntityFields(entity),
      })),
      actions: moduleDef.actions.map((action) => ({
        ...action,
        inputs: inferActionInputs(action),
      })),
    },
    seedEntities: clonePlain(Object.fromEntries(moduleDef.entities.map((entity) => [entity.key, entity.rows]))),
    localEntities: clonePlain(workspace.entities),
    events: clonePlain(workspace.events),
    summary: summarize(moduleDef, workspace),
  };
}

export function createEcommerceSuiteLocalRecord(payload: {
  moduleSlug: EcommerceSuiteModuleSlug;
  entityKey: string;
  data: Record<string, unknown>;
}) {
  const { moduleSlug, entityKey, data } = payload;
  const loaded = ensureWorkspace(moduleSlug);
  const entityDef = getEntitySeed(loaded.moduleDef, entityKey);
  const row = sanitizeRowData(data, entityDef);
  const nextWorkspace = appendEvent(
    {
      ...loaded.workspace,
      entities: {
        ...loaded.workspace.entities,
        [entityKey]: [row, ...(loaded.workspace.entities[entityKey] ?? [])],
      },
    },
    { moduleSlug, type: "create", entityKey, message: `Created local ${entityDef.label} record.` }
  );
  replaceWorkspace(moduleSlug, nextWorkspace, loaded.state);
  return { ok: true, row, snapshot: getEcommerceSuiteModuleSnapshot(moduleSlug) };
}

export function updateEcommerceSuiteLocalRecord(payload: {
  moduleSlug: EcommerceSuiteModuleSlug;
  entityKey: string;
  recordId: string;
  data: Record<string, unknown>;
}) {
  const { moduleSlug, entityKey, recordId, data } = payload;
  const loaded = ensureWorkspace(moduleSlug);
  const entityDef = getEntitySeed(loaded.moduleDef, entityKey);
  const rows = [...(loaded.workspace.entities[entityKey] ?? [])];
  const index = findRowIndex(rows, recordId);
  if (index < 0) throw new Error(`${entityDef.label} record not found.`);
  rows[index] = sanitizeRowData(data, entityDef, rows[index]);
  const nextWorkspace = appendEvent(
    { ...loaded.workspace, entities: { ...loaded.workspace.entities, [entityKey]: rows } },
    { moduleSlug, type: "update", entityKey, message: `Updated local ${entityDef.label} record ${recordId}.` }
  );
  replaceWorkspace(moduleSlug, nextWorkspace, loaded.state);
  return { ok: true, row: rows[index], snapshot: getEcommerceSuiteModuleSnapshot(moduleSlug) };
}

export function deleteEcommerceSuiteLocalRecord(payload: {
  moduleSlug: EcommerceSuiteModuleSlug;
  entityKey: string;
  recordId: string;
}) {
  const { moduleSlug, entityKey, recordId } = payload;
  const loaded = ensureWorkspace(moduleSlug);
  const entityDef = getEntitySeed(loaded.moduleDef, entityKey);
  const currentRows = loaded.workspace.entities[entityKey] ?? [];
  const nextRows = currentRows.filter((row) => String(row.id ?? "") !== recordId);
  if (nextRows.length === currentRows.length) throw new Error(`${entityDef.label} record not found.`);
  const nextWorkspace = appendEvent(
    { ...loaded.workspace, entities: { ...loaded.workspace.entities, [entityKey]: nextRows } },
    { moduleSlug, type: "delete", entityKey, message: `Deleted local ${entityDef.label} record ${recordId}.` }
  );
  replaceWorkspace(moduleSlug, nextWorkspace, loaded.state);
  return { ok: true, deletedRecordId: recordId, snapshot: getEcommerceSuiteModuleSnapshot(moduleSlug) };
}

export function runEcommerceSuiteLocalAction(payload: {
  moduleSlug: EcommerceSuiteModuleSlug;
  actionKey: string;
  input?: Record<string, unknown>;
}) {
  const { moduleSlug, actionKey, input = {} } = payload;
  const loaded = ensureWorkspace(moduleSlug);
  const actionDef = loaded.moduleDef.actions.find((action) => action.key === actionKey);
  if (!actionDef) throw new Error(`Unknown action '${actionKey}' for module ${moduleSlug}.`);
  for (const key of actionDef.inputKeys ?? []) {
    const value = input[key];
    if (value == null || String(value).trim().length === 0) {
      throw new Error(`${humanizeKey(key)} is required.`);
    }
  }
  const result = runModuleAction(moduleSlug, loaded.workspace, actionKey, input);
  const nextWorkspace = appendEvent(result.workspace, {
    moduleSlug,
    type: "action",
    entityKey: actionDef.entityKey,
    actionKey,
    message: result.message,
  });
  replaceWorkspace(moduleSlug, nextWorkspace, loaded.state);
  return { ok: true, actionKey, message: result.message, snapshot: getEcommerceSuiteModuleSnapshot(moduleSlug) };
}

export function listEcommerceSuiteModuleRecords(payload: {
  moduleSlug: EcommerceSuiteModuleSlug;
  entityKey: string;
  source?: "seed" | "local";
}) {
  const { moduleSlug, entityKey, source = "local" } = payload;
  const loaded = ensureWorkspace(moduleSlug);
  getEntitySeed(loaded.moduleDef, entityKey);
  const rows = source === "seed" ? getEntitySeed(loaded.moduleDef, entityKey).rows : loaded.workspace.entities[entityKey] ?? [];
  return { ok: true, moduleSlug, entityKey, source, count: rows.length, rows: clonePlain(rows) };
}

export function getEcommerceSuiteModuleEntityTemplate(payload: {
  moduleSlug: EcommerceSuiteModuleSlug;
  entityKey: string;
}) {
  const { moduleSlug, entityKey } = payload;
  const moduleDef = ensureModuleCatalogItem(moduleSlug);
  const entity = getEntitySeed(moduleDef, entityKey);
  const fields = inferEntityFields(entity);
  const template: EcommerceSuiteSeedRow = { id: makeId(getEntityIdPrefix(moduleDef, entityKey)) };
  for (const field of fields) {
    if (field.key === "id") continue;
    template[field.key] = field.type === "number" ? 0 : field.type === "boolean" ? false : "";
  }
  return { ok: true, moduleSlug, entityKey, fields, template };
}
