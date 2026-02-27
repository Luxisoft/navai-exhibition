'use client';

import {
  clearEcommerceLocalDemoData,
  createEcommerceLocalProduct,
  deleteEcommerceLocalProduct,
  getEcommerceLocalStateReport,
  simulateEcommerceLocalPurchase,
  updateEcommerceLocalProduct,
} from "@/lib/ecommerce-demo-local";
import {
  clearEcommerceSuiteAllLocalData,
  createEcommerceSuiteLocalRecord,
  deleteEcommerceSuiteLocalRecord,
  getEcommerceSuiteModuleEntityTemplate,
  getEcommerceSuiteModuleSnapshot,
  getEcommerceSuiteSafetyPolicy,
  listEcommerceSuiteModuleRecords,
  listEcommerceSuiteModules,
  resetEcommerceSuiteModuleLocalWorkspace,
  runEcommerceSuiteLocalAction,
  updateEcommerceSuiteLocalRecord,
} from "@/lib/ecommerce-suite-local";

type BrowserPayload = Record<string, unknown> | undefined;

function asObject(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
}

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("This function is only available in the browser.");
  }
}

function ensureExpectedPath(expectedPath: unknown) {
  if (typeof expectedPath !== "string" || expectedPath.trim().length === 0) {
    return;
  }
  if (typeof window === "undefined") return;
  if (window.location.pathname !== expectedPath.trim()) {
    throw new Error(`User is on ${window.location.pathname}, expected ${expectedPath.trim()}. Navigate first.`);
  }
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function getEcommerceLocalDemoState(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  ensureExpectedPath(input.expectedPath);
  return getEcommerceLocalStateReport();
}

export async function createEcommerceDemoUserProduct(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  ensureExpectedPath(input.expectedPath);
  return createEcommerceLocalProduct({
    name: String(input.name ?? ""),
    brand: String(input.brand ?? ""),
    categoryCode: String(input.categoryCode ?? "misc"),
    category: typeof input.category === "string" ? input.category : undefined,
    description: typeof input.description === "string" ? input.description : undefined,
    price: Number(input.price ?? 0),
    stock: Number(input.stock ?? 0),
    status: input.status === "draft" ? "draft" : "active",
  });
}

export async function updateEcommerceDemoUserProduct(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  ensureExpectedPath(input.expectedPath);
  const productId = String(input.productId ?? input.id ?? "");
  if (!productId) {
    throw new Error("productId is required.");
  }
  return updateEcommerceLocalProduct(productId, {
    name: typeof input.name === "string" ? input.name : undefined,
    brand: typeof input.brand === "string" ? input.brand : undefined,
    categoryCode: typeof input.categoryCode === "string" ? input.categoryCode : undefined,
    category: typeof input.category === "string" ? input.category : undefined,
    description: typeof input.description === "string" ? input.description : undefined,
    price: toNumber(input.price),
    stock: toNumber(input.stock),
    status: input.status === "draft" ? "draft" : input.status === "active" ? "active" : undefined,
  });
}

export async function deleteEcommerceDemoUserProduct(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  ensureExpectedPath(input.expectedPath);
  const productId = String(input.productId ?? input.id ?? "");
  if (!productId) {
    throw new Error("productId is required.");
  }
  return deleteEcommerceLocalProduct(productId);
}

export async function buyEcommerceDemoProduct(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  ensureExpectedPath(input.expectedPath);
  return simulateEcommerceLocalPurchase({
    productId: String(input.productId ?? input.id ?? ""),
    quantity: Number(input.quantity ?? 1),
    buyerName: String(input.buyerName ?? input.customerName ?? "Demo Buyer"),
    buyerEmail: String(input.buyerEmail ?? input.customerEmail ?? "demo@example.com"),
    productName: typeof input.productName === "string" ? input.productName : undefined,
    sku: typeof input.sku === "string" ? input.sku : undefined,
    unitPrice: toNumber(input.unitPrice),
  });
}

export async function resetEcommerceDemoLocalData(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  ensureExpectedPath(input.expectedPath);
  return clearEcommerceLocalDemoData();
}

export async function listEcommerceSuiteModulesCatalog(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  if (typeof input.expectedPath === "string") {
    ensureExpectedPath(input.expectedPath);
  }
  return {
    ok: true,
    safetyPolicy: getEcommerceSuiteSafetyPolicy(),
    modules: listEcommerceSuiteModules(),
  };
}

export async function getEcommerceSuiteModuleLocalState(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  ensureExpectedPath(input.expectedPath);
  const moduleSlug = String(input.moduleSlug ?? "");
  return getEcommerceSuiteModuleSnapshot(moduleSlug as Parameters<typeof getEcommerceSuiteModuleSnapshot>[0]);
}

export async function resetEcommerceSuiteModuleState(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  ensureExpectedPath(input.expectedPath);
  const moduleSlug = String(input.moduleSlug ?? "");
  return resetEcommerceSuiteModuleLocalWorkspace(moduleSlug as Parameters<typeof resetEcommerceSuiteModuleLocalWorkspace>[0]);
}

export async function getEcommerceSuiteEntityTemplate(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  ensureExpectedPath(input.expectedPath);
  const moduleSlug = String(input.moduleSlug ?? "");
  const entityKey = String(input.entityKey ?? "");
  return getEcommerceSuiteModuleEntityTemplate({
    moduleSlug: moduleSlug as Parameters<typeof getEcommerceSuiteModuleEntityTemplate>[0]["moduleSlug"],
    entityKey,
  });
}

export async function listEcommerceSuiteRecords(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  ensureExpectedPath(input.expectedPath);
  return listEcommerceSuiteModuleRecords({
    moduleSlug: String(input.moduleSlug ?? "") as Parameters<typeof listEcommerceSuiteModuleRecords>[0]["moduleSlug"],
    entityKey: String(input.entityKey ?? ""),
    source: input.source === "seed" ? "seed" : "local",
  });
}

export async function createEcommerceSuiteRecord(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  ensureExpectedPath(input.expectedPath);
  const data = asObject(input.data);
  return createEcommerceSuiteLocalRecord({
    moduleSlug: String(input.moduleSlug ?? "") as Parameters<typeof createEcommerceSuiteLocalRecord>[0]["moduleSlug"],
    entityKey: String(input.entityKey ?? ""),
    data,
  });
}

export async function updateEcommerceSuiteRecord(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  ensureExpectedPath(input.expectedPath);
  const data = asObject(input.data);
  return updateEcommerceSuiteLocalRecord({
    moduleSlug: String(input.moduleSlug ?? "") as Parameters<typeof updateEcommerceSuiteLocalRecord>[0]["moduleSlug"],
    entityKey: String(input.entityKey ?? ""),
    recordId: String(input.recordId ?? input.id ?? ""),
    data,
  });
}

export async function deleteEcommerceSuiteRecord(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  ensureExpectedPath(input.expectedPath);
  return deleteEcommerceSuiteLocalRecord({
    moduleSlug: String(input.moduleSlug ?? "") as Parameters<typeof deleteEcommerceSuiteLocalRecord>[0]["moduleSlug"],
    entityKey: String(input.entityKey ?? ""),
    recordId: String(input.recordId ?? input.id ?? ""),
  });
}

export async function runEcommerceSuiteWorkflowAction(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  ensureExpectedPath(input.expectedPath);
  return runEcommerceSuiteLocalAction({
    moduleSlug: String(input.moduleSlug ?? "") as Parameters<typeof runEcommerceSuiteLocalAction>[0]["moduleSlug"],
    actionKey: String(input.actionKey ?? ""),
    input: asObject(input.input),
  });
}

export async function resetAllEcommerceSuiteLocalData(payload?: BrowserPayload) {
  ensureBrowser();
  const input = asObject(payload);
  if (typeof input.expectedPath === "string") {
    ensureExpectedPath(input.expectedPath);
  }
  return clearEcommerceSuiteAllLocalData();
}
