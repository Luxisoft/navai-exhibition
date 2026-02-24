'use client';

import {
  clearEcommerceLocalDemoData,
  createEcommerceLocalProduct,
  deleteEcommerceLocalProduct,
  getEcommerceLocalStateReport,
  simulateEcommerceLocalPurchase,
  updateEcommerceLocalProduct,
} from "@/lib/ecommerce-demo-local";

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

