'use client';

export type EcommerceSeedProduct = {
  id: number;
  sku: string;
  name: string;
  brand: string;
  category: string;
  categoryCode: string;
  description: string;
  price: number;
  cost: number;
  stock: number;
  status: string;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  unitsSold: number;
  revenue: number;
};

export type EcommerceSeedOrder = {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  city: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
};

export type EcommerceSeedCategory = {
  id: number;
  code: string;
  name: string;
  productCount: number;
};

export type EcommerceSeedSnapshot = {
  ok: true;
  readOnly: true;
  source: string;
  generatedAt: string;
  kpis: {
    productCount: number;
    categoryCount: number;
    customerCount: number;
    orderCount: number;
    lifetimeRevenue: number;
    recentOrderCount: number;
    recentRevenue: number;
    rangeDays: number;
  };
  categories: EcommerceSeedCategory[];
  products: EcommerceSeedProduct[];
  recentOrders: EcommerceSeedOrder[];
};

export type EcommerceLocalProduct = {
  id: string;
  ownerType: "user";
  sku: string;
  name: string;
  brand: string;
  categoryCode: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  status: "active" | "draft";
  createdAt: string;
  updatedAt: string;
};

export type EcommerceLocalPurchase = {
  id: string;
  source: "seed" | "user";
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  buyerName: string;
  buyerEmail: string;
  status: "paid";
  createdAt: string;
};

export type EcommerceLocalState = {
  version: 1;
  userProducts: EcommerceLocalProduct[];
  purchases: EcommerceLocalPurchase[];
};

type UserProductInput = {
  name: string;
  brand: string;
  categoryCode: string;
  category?: string;
  description?: string;
  price: number;
  stock: number;
  status?: "active" | "draft";
};

type PurchaseInput = {
  productId: string | number;
  quantity?: number;
  buyerName: string;
  buyerEmail: string;
  productName?: string;
  sku?: string;
  unitPrice?: number;
};

const STORAGE_KEY = "navai:ecommerce-demo:local-state:v1";
const EVENT_NAME = "navai:ecommerce-demo:local-change";
const SEED_CACHE_KEY = "__navaiEcommerceDemoSeedProducts";

function canUseBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function toMoneyNumber(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) / 100;
}

function sanitizeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function sanitizeCategoryLabel(categoryCode: string) {
  const map: Record<string, string> = {
    smartphones: "Smartphones",
    laptops: "Laptops",
    audio: "Audio",
    gaming: "Gaming",
    wearables: "Wearables",
    "home-office": "Home Office",
  };
  return map[categoryCode] ?? "Misc";
}

function createSku(name: string, brand: string) {
  const base = `${brand}-${name}`
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 18);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base || "USER-PROD"}-${suffix}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeLocalProduct(raw: unknown): EcommerceLocalProduct | null {
  if (!isRecord(raw)) return null;
  const id = sanitizeText(raw.id);
  if (!id.startsWith("usr-prod-")) return null;
  const price = toMoneyNumber(raw.price);
  const stockRaw = Number(raw.stock);
  if (price === null || !Number.isFinite(stockRaw)) return null;
  return {
    id,
    ownerType: "user",
    sku: sanitizeText(raw.sku) || createSku(sanitizeText(raw.name), sanitizeText(raw.brand)),
    name: sanitizeText(raw.name),
    brand: sanitizeText(raw.brand),
    categoryCode: sanitizeText(raw.categoryCode) || "misc",
    category: sanitizeText(raw.category) || sanitizeCategoryLabel(sanitizeText(raw.categoryCode) || "misc"),
    description: sanitizeText(raw.description),
    price,
    stock: Math.max(0, Math.floor(stockRaw)),
    status: raw.status === "draft" ? "draft" : "active",
    createdAt: sanitizeText(raw.createdAt) || nowIso(),
    updatedAt: sanitizeText(raw.updatedAt) || nowIso(),
  };
}

function normalizeLocalPurchase(raw: unknown): EcommerceLocalPurchase | null {
  if (!isRecord(raw)) return null;
  const id = sanitizeText(raw.id);
  if (!id.startsWith("usr-purchase-")) return null;
  const qty = Number(raw.quantity);
  const unitPrice = toMoneyNumber(raw.unitPrice);
  const total = toMoneyNumber(raw.totalAmount);
  if (!Number.isFinite(qty) || unitPrice === null || total === null) return null;
  return {
    id,
    source: raw.source === "user" ? "user" : "seed",
    productId: sanitizeText(raw.productId),
    productName: sanitizeText(raw.productName),
    sku: sanitizeText(raw.sku),
    unitPrice,
    quantity: Math.max(1, Math.floor(qty)),
    totalAmount: total,
    buyerName: sanitizeText(raw.buyerName),
    buyerEmail: sanitizeText(raw.buyerEmail),
    status: "paid",
    createdAt: sanitizeText(raw.createdAt) || nowIso(),
  };
}

function normalizeState(raw: unknown): EcommerceLocalState {
  if (!isRecord(raw)) {
    return { version: 1, userProducts: [], purchases: [] };
  }
  const userProducts = Array.isArray(raw.userProducts) ? raw.userProducts.map(normalizeLocalProduct).filter(Boolean) as EcommerceLocalProduct[] : [];
  const purchases = Array.isArray(raw.purchases) ? raw.purchases.map(normalizeLocalPurchase).filter(Boolean) as EcommerceLocalPurchase[] : [];
  return { version: 1, userProducts, purchases };
}

export function loadEcommerceLocalState(): EcommerceLocalState {
  if (!canUseBrowser()) {
    return { version: 1, userProducts: [], purchases: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, userProducts: [], purchases: [] };
    return normalizeState(JSON.parse(raw));
  } catch {
    return { version: 1, userProducts: [], purchases: [] };
  }
}

function saveState(nextState: EcommerceLocalState) {
  if (!canUseBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { updatedAt: nowIso() } }));
}

export function setEcommerceDemoSeedProductsCache(products: EcommerceSeedProduct[]) {
  if (!canUseBrowser()) return;
  (window as unknown as Record<string, unknown>)[SEED_CACHE_KEY] = Array.isArray(products) ? products : [];
}

export function getEcommerceDemoSeedProductsCache(): EcommerceSeedProduct[] {
  if (!canUseBrowser()) return [];
  const value = (window as unknown as Record<string, unknown>)[SEED_CACHE_KEY];
  return Array.isArray(value) ? (value as EcommerceSeedProduct[]) : [];
}

export function isUserProductId(id: string | number) {
  return String(id).startsWith("usr-prod-");
}

function assertUserProductMutable(id: string | number) {
  if (!isUserProductId(id)) {
    throw new Error("Seed products are read-only. Only user-created products can be edited or deleted.");
  }
}

function sanitizeUserProductInput(input: UserProductInput, existing?: EcommerceLocalProduct): EcommerceLocalProduct {
  const name = sanitizeText(input.name);
  const brand = sanitizeText(input.brand);
  const categoryCode = sanitizeText(input.categoryCode).toLowerCase() || "misc";
  const price = toMoneyNumber(input.price);
  const stockRaw = Number(input.stock);
  if (name.length < 2) throw new Error("Product name must have at least 2 characters.");
  if (brand.length < 2) throw new Error("Brand must have at least 2 characters.");
  if (price === null || price <= 0) throw new Error("Price must be a valid number greater than 0.");
  if (!Number.isFinite(stockRaw) || stockRaw < 0) throw new Error("Stock must be a valid non-negative number.");

  const timestamp = nowIso();
  const id = existing?.id ?? `usr-prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    ownerType: "user",
    sku: existing?.sku ?? createSku(name, brand),
    name,
    brand,
    categoryCode,
    category: sanitizeText(input.category) || sanitizeCategoryLabel(categoryCode),
    description: sanitizeText(input.description),
    price,
    stock: Math.floor(stockRaw),
    status: input.status === "draft" ? "draft" : "active",
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function createEcommerceLocalProduct(input: UserProductInput) {
  const state = loadEcommerceLocalState();
  const product = sanitizeUserProductInput(input);
  const next = { ...state, userProducts: [product, ...state.userProducts] };
  saveState(next);
  return { ok: true, product, userProductCount: next.userProducts.length };
}

export function updateEcommerceLocalProduct(
  productId: string,
  input: Partial<UserProductInput>
) {
  assertUserProductMutable(productId);
  const state = loadEcommerceLocalState();
  const index = state.userProducts.findIndex((item) => item.id === productId);
  if (index < 0) {
    throw new Error("User product not found.");
  }
  const current = state.userProducts[index];
  const nextProduct = sanitizeUserProductInput(
    {
      name: input.name ?? current.name,
      brand: input.brand ?? current.brand,
      categoryCode: input.categoryCode ?? current.categoryCode,
      category: input.category ?? current.category,
      description: input.description ?? current.description,
      price: input.price ?? current.price,
      stock: input.stock ?? current.stock,
      status: input.status ?? current.status,
    },
    current
  );
  const nextProducts = [...state.userProducts];
  nextProducts[index] = nextProduct;
  saveState({ ...state, userProducts: nextProducts });
  return { ok: true, product: nextProduct };
}

export function deleteEcommerceLocalProduct(productId: string) {
  assertUserProductMutable(productId);
  const state = loadEcommerceLocalState();
  const nextProducts = state.userProducts.filter((item) => item.id !== productId);
  if (nextProducts.length === state.userProducts.length) {
    throw new Error("User product not found.");
  }
  saveState({ ...state, userProducts: nextProducts });
  return { ok: true, deletedProductId: productId, userProductCount: nextProducts.length };
}

function resolvePurchaseProduct(input: PurchaseInput) {
  const productId = String(input.productId ?? "").trim();
  if (!productId) throw new Error("productId is required.");

  const state = loadEcommerceLocalState();
  if (isUserProductId(productId)) {
    const userProduct = state.userProducts.find((item) => item.id === productId);
    if (!userProduct) throw new Error("User product not found.");
    return {
      source: "user" as const,
      productId,
      name: userProduct.name,
      sku: userProduct.sku,
      unitPrice: userProduct.price,
      currentStock: userProduct.stock,
    };
  }

  const seedProducts = getEcommerceDemoSeedProductsCache();
  const seedMatch =
    seedProducts.find((item) => String(item.id) === productId) ??
    (input.sku ? seedProducts.find((item) => item.sku === input.sku) : undefined);
  if (!seedMatch) {
    const fallbackPrice = toMoneyNumber(input.unitPrice);
    if (fallbackPrice === null) {
      throw new Error("Seed product not found in page cache. Open the Ecommerce Demo page first.");
    }
    return {
      source: "seed" as const,
      productId,
      name: sanitizeText(input.productName) || "Seed product",
      sku: sanitizeText(input.sku) || `SEED-${productId}`,
      unitPrice: fallbackPrice,
      currentStock: null,
    };
  }
  return {
    source: "seed" as const,
    productId: String(seedMatch.id),
    name: seedMatch.name,
    sku: seedMatch.sku,
    unitPrice: seedMatch.price,
    currentStock: seedMatch.stock,
  };
}

export function simulateEcommerceLocalPurchase(input: PurchaseInput) {
  const buyerName = sanitizeText(input.buyerName);
  const buyerEmail = sanitizeText(input.buyerEmail);
  const quantity = Math.max(1, Math.floor(Number(input.quantity ?? 1) || 1));
  if (buyerName.length < 2) throw new Error("Buyer name must have at least 2 characters.");
  if (!buyerEmail.includes("@")) throw new Error("Buyer email is invalid.");

  const productRef = resolvePurchaseProduct(input);
  if (typeof productRef.currentStock === "number" && productRef.currentStock < quantity) {
    throw new Error("Not enough stock for this user product.");
  }

  const state = loadEcommerceLocalState();
  const purchase: EcommerceLocalPurchase = {
    id: `usr-purchase-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: productRef.source,
    productId: productRef.productId,
    productName: productRef.name,
    sku: productRef.sku,
    unitPrice: productRef.unitPrice,
    quantity,
    totalAmount: Math.round(productRef.unitPrice * quantity * 100) / 100,
    buyerName,
    buyerEmail,
    status: "paid",
    createdAt: nowIso(),
  };

  let nextProducts = state.userProducts;
  if (productRef.source === "user") {
    nextProducts = state.userProducts.map((item) =>
      item.id === productRef.productId
        ? { ...item, stock: Math.max(0, item.stock - quantity), updatedAt: nowIso() }
        : item
    );
  }

  const nextState: EcommerceLocalState = {
    ...state,
    userProducts: nextProducts,
    purchases: [purchase, ...state.purchases].slice(0, 400),
  };
  saveState(nextState);
  return {
    ok: true,
    purchase,
    note:
      productRef.source === "seed"
        ? "Seed purchase was simulated locally only. SQLite seed data remains unchanged."
        : "User product purchase saved in localStorage only.",
  };
}

export function clearEcommerceLocalDemoData() {
  const nextState: EcommerceLocalState = { version: 1, userProducts: [], purchases: [] };
  saveState(nextState);
  return { ok: true };
}

export function getEcommerceLocalStateReport() {
  const state = loadEcommerceLocalState();
  const revenue = state.purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
  return {
    ok: true,
    storage: "localStorage",
    userProducts: state.userProducts,
    purchases: state.purchases,
    summary: {
      userProductCount: state.userProducts.length,
      purchaseCount: state.purchases.length,
      localRevenue: Math.round(revenue * 100) / 100,
    },
  };
}
