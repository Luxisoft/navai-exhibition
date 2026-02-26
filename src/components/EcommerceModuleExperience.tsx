'use client';

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import styles from "@/components/EcommerceModuleExperience.module.css";
import EcommerceCapabilityDemo from "@/components/EcommerceCapabilityDemo";
import { getEcommerceModuleExperienceText } from "@/i18n/ecommerce-module-experience";
import { useI18n } from "@/i18n/provider";
import {
  createEcommerceSuiteLocalRecord,
  getEcommerceSuiteModuleSnapshot,
  subscribeEcommerceSuiteLocalState,
  updateEcommerceSuiteLocalRecord,
  type EcommerceSuiteModuleSlug,
} from "@/lib/ecommerce-suite-local";

type Snapshot = ReturnType<typeof getEcommerceSuiteModuleSnapshot>;
type Row = Record<string, unknown>;
type Tab = "experience" | "data";
type CartLine = { productId: string; qty: number };
type SimOrder = { id: string; total: number; items: number; createdAt: string };

function isConsumerModule(slug: string) {
  return slug.includes("/consumer-");
}

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? (value.filter((v) => v && typeof v === "object" && !Array.isArray(v)) as Row[]) : [];
}

function txt(row: Row, key: string) {
  return String(row[key] ?? "");
}

function num(row: Row, key: string) {
  const parsed = Number(row[key]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function humanize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function tone(status: string) {
  const s = status.toLowerCase();
  if (/(active|approved|completed|paid|healthy|ready|published|confirmed|running)/.test(s)) return "good";
  if (/(pending|review|warning|draft|processing|scheduled|in_progress|diagnosis|watch)/.test(s)) return "warn";
  if (/(failed|risk|degraded|paused|suspended|rejected|closed)/.test(s)) return "danger";
  return "neutral";
}

function tableCols(rows: Row[], max = 6) {
  const keys = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
  return [...keys].sort((a, b) => (a === "id" ? -1 : b === "id" ? 1 : a.localeCompare(b))).slice(0, max);
}

export default function EcommerceModuleExperience({ moduleSlug }: { moduleSlug: EcommerceSuiteModuleSlug }) {
  const { language } = useI18n();
  const t = (englishText: string) => getEcommerceModuleExperienceText(language, englishText);
  const [tab, setTab] = useState<Tab>("experience");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [storeSnapshot, setStoreSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [wishlist, setWishlist] = useState<Record<string, true>>({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [buyerEmail, setBuyerEmail] = useState("demo.buyer@example.com");
  const [shipping, setShipping] = useState("standard");
  const [payment, setPayment] = useState("card");
  const [orders, setOrders] = useState<SimOrder[]>([]);

  const [adminEntityKey, setAdminEntityKey] = useState("");
  const [adminQuery, setAdminQuery] = useState("");
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [rightbarWidgetSlot, setRightbarWidgetSlot] = useState<HTMLElement | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    try {
      const mod = getEcommerceSuiteModuleSnapshot(moduleSlug);
      const store = getEcommerceSuiteModuleSnapshot("ecommerce/product-sales");
      setSnapshot(mod);
      setStoreSnapshot(store);
      setAdminEntityKey((current) => current || mod.module.entities[0]?.key || "");
      setLoading(false);
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    load();
    return subscribeEcommerceSuiteLocalState(() => load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleSlug]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    setRightbarWidgetSlot(document.getElementById("docs-rightbar-extra-slot"));
  }, []);

  const entities = useMemo(() => {
    if (!snapshot) return [] as Array<{ key: string; label: string; description: string; rows: Row[] }>;
    return snapshot.module.entities.map((entity) => ({
      key: entity.key,
      label: entity.label,
      description: entity.description,
      rows: asRows(snapshot.localEntities[entity.key] ?? snapshot.seedEntities[entity.key] ?? []),
    }));
  }, [snapshot]);

  const products = useMemo(() => asRows(storeSnapshot?.localEntities.products ?? storeSnapshot?.seedEntities.products ?? []), [storeSnapshot]);

  const categories = useMemo(() => {
    const items = new Set<string>();
    products.forEach((p) => {
      const c = txt(p, "category").toLowerCase();
      if (c) items.add(c);
    });
    return ["all", ...Array.from(items).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const c = txt(p, "category").toLowerCase();
      if (category !== "all" && c !== category) return false;
      if (!q) return true;
      const blob = [p.id, p.name, p.brand, p.sku, p.category, p.description].map((v) => String(v ?? "").toLowerCase()).join(" ");
      return blob.includes(q);
    });
  }, [products, search, category]);

  const cartItems = useMemo(() => {
    return cart
      .map((line) => {
        const product = products.find((p) => String(p.id ?? "") === line.productId);
        if (!product) return null;
        const price = num(product, "price");
        return {
          id: line.productId,
          name: txt(product, "name") || line.productId,
          sku: txt(product, "sku"),
          qty: line.qty,
          price,
          total: price * line.qty,
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; sku: string; qty: number; price: number; total: number }>;
  }, [cart, products]);

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.19;
    const ship = subtotal === 0 ? 0 : shipping === "express" ? 12.9 : shipping === "pickup" ? 0 : 6.5;
    return { subtotal, tax, shipping: ship, total: subtotal + tax + ship };
  }, [cartItems, shipping]);

  const statusBuckets = useMemo(() => {
    const map: Record<string, number> = {};
    entities.forEach((entity) => {
      entity.rows.forEach((row) => {
        const status = txt(row, "status") || "unknown";
        map[status] = (map[status] ?? 0) + 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [entities]);

  const selectedEntity = useMemo(() => entities.find((e) => e.key === adminEntityKey) ?? entities[0] ?? null, [entities, adminEntityKey]);
  const adminRows = useMemo(() => {
    if (!selectedEntity) return [] as Row[];
    const q = adminQuery.trim().toLowerCase();
    if (!q) return selectedEntity.rows;
    return selectedEntity.rows.filter((row) => Object.values(row).map((v) => String(v ?? "").toLowerCase()).join(" ").includes(q));
  }, [selectedEntity, adminQuery]);
  const entityIndex = useMemo(() => new Map(entities.map((entity) => [entity.key, entity] as const)), [entities]);

  const labels = {
    simulator: t("Visual simulation"),
    data: t("Tables / Data Lab"),
    buyerTitle: t("Storefront view (buyer)"),
    adminTitle: t("Admin operations panel"),
    search: t("Search product"),
    all: t("All"),
    add: t("Add"),
    fav: t("Wishlist"),
    saved: t("Saved"),
    cart: t("Cart"),
    checkout: t("Checkout"),
    shipping: t("Shipping"),
    payment: t("Payment"),
    confirm: t("Confirm purchase"),
    entities: t("Module tables"),
    rows: t("rows"),
    adminFilter: t("Filter rows"),
    quick: t("Quick actions"),
    sqliteNote: t("Seed in backend SQLite + editable local workspace in browser."),
    email: t("Email"),
    stock: t("Stock"),
    remove: t("Remove"),
    standard: t("Standard"),
    express: t("Express"),
    pickup: t("Pickup"),
    card: t("Card"),
    transfer: t("Transfer"),
    wallet: t("Wallet"),
    cod: t("COD"),
    subtotal: t("Subtotal"),
    tax: t("Tax"),
    total: t("Total"),
    cartEmpty: t("Cart is empty."),
    noData: t("No data."),
    noStatuses: t("No statuses."),
    loadingSimulator: t("Loading simulator..."),
    noOrdersYet: t("No simulated orders yet."),
    noEntitySelected: t("No entity selected."),
    noRowsFound: t("No rows found."),
    noStatus: t("No status"),
    entitySelection: t("Entity selection"),
    analysisTable: t("Analysis table"),
    entity: t("Entity"),
    table: t("Table"),
    controls: t("Controls"),
    entitiesCount: t("Entities"),
    statuses: t("Statuses"),
    sources: t("Sources"),
    actions: t("Actions"),
    rowsLabel: t("Rows"),
    orderTimeline: t("Purchase timeline"),
    simulatedOrders: t("Simulated orders"),
    noPurchasesYet: t("No simulated orders yet."),
    itemCountSuffix: t("items"),
    noResults: t("No results."),
    noOrders: t("No simulated orders yet."),
    unknown: t("unknown"),
    moduleTabsAria: t("module tabs"),
    statusChangedTo: t("Status changed to"),
    addProductsFirst: t("Add products first."),
    productAdded: t("Product added to cart."),
    purchaseConfirmed: t("Simulated purchase confirmed."),
  };

  function addToCart(productId: string) {
    setCart((current) => {
      const existing = current.find((line) => line.productId === productId);
      if (existing) return current.map((line) => (line.productId === productId ? { ...line, qty: Math.min(99, line.qty + 1) } : line));
      return [...current, { productId, qty: 1 }];
    });
    setMessage(t("Product added to cart."));
  }

  function toggleWishlist(productId: string) {
    setWishlist((current) => {
      const next = { ...current };
      if (next[productId]) delete next[productId];
      else next[productId] = true;
      return next;
    });
  }

  function setQty(productId: string, qty: number) {
    setCart((current) => current.map((line) => (line.productId === productId ? { ...line, qty: Math.max(1, Math.min(99, qty)) } : line)));
  }

  function removeCart(productId: string) {
    setCart((current) => current.filter((line) => line.productId !== productId));
  }

  async function confirmCheckout() {
    if (cartItems.length === 0) {
      setMessage(t("Add products first."));
      return;
    }

    const simOrder = {
      id: `sim-${Date.now()}`,
      total: totals.total,
      items: cartItems.reduce((sum, item) => sum + item.qty, 0),
      createdAt: new Date().toISOString(),
    } satisfies SimOrder;
    setOrders((current) => [simOrder, ...current].slice(0, 10));
    setCart([]);
    setMessage(t("Simulated purchase confirmed."));

    try {
      if (moduleSlug === "ecommerce/consumer-checkout") {
        await createEcommerceSuiteLocalRecord({
          moduleSlug,
          entityKey: "checkoutConfirmations",
          data: {
            orderNumber: `SO-${new Date().getUTCFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            customerEmail: buyerEmail,
            items: simOrder.items,
            total: Math.round(simOrder.total * 100) / 100,
            status: "confirmed",
          },
        });
      }
    } catch {
      // entity may not exist for this module
    }
  }

  async function updateStatus(row: Row, nextStatus: string) {
    if (!selectedEntity) return;
    const id = txt(row, "id");
    if (!id) return;
    setBusyRow(id);
    try {
      await updateEcommerceSuiteLocalRecord({
        moduleSlug,
        entityKey: selectedEntity.key,
        recordId: id,
        data: { status: nextStatus },
      });
      setMessage(`${labels.statusChangedTo}: ${t(nextStatus)}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyRow(null);
    }
  }

  function getEntityRows(entityKey: string) {
    return entityIndex.get(entityKey)?.rows ?? [];
  }

  function firstReadableValue(row: Row) {
    const preferred = ["title", "name", "orderNumber", "customerEmail", "sku", "channel", "segment", "supplier", "environment", "region"];
    for (const key of preferred) {
      const value = row[key];
      if (typeof value === "string" && value.trim()) return value;
    }
    for (const [key, value] of Object.entries(row)) {
      if (key === "id" || key === "status") continue;
      if (typeof value === "string" && value.trim()) return value;
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
      if (typeof value === "boolean") return value ? "true" : "false";
    }
    return txt(row, "id") || t("row");
  }

  function renderFocusRows(title: string, rows: Row[]) {
    return (
      <section className={styles.panel}>
        <div className={styles.panelTop}><h3>{t(title)}</h3><span className={styles.pill}>{rows.length}</span></div>
        {rows.length === 0 ? <p className={styles.empty}>{labels.noData}</p> : (
          <ul className={styles.timeline}>
            {rows.slice(0, 10).map((row) => {
              const id = txt(row, "id") || JSON.stringify(row);
              const status = txt(row, "status");
              const entries = Object.entries(row).filter(([k]) => k !== "id").slice(0, 3);
              return (
                <li key={id}>
                  <div>
                    <strong>{t(firstReadableValue(row))}</strong>
                    {entries.map(([k, v]) => <p key={`${id}-${k}`}>{`${t(humanize(k))}: ${t(String(v ?? "-"))}`}</p>)}
                  </div>
                  {status ? <span className={`${styles.badge} ${styles[`tone_${tone(status)}`]}`}>{t(status)}</span> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  }

  function renderStatusSummaryPanel(title: string, rows: Row[]) {
    const map: Record<string, number> = {};
    rows.forEach((row) => {
      const status = txt(row, "status") || "unknown";
      map[status] = (map[status] ?? 0) + 1;
    });
    const items = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return (
      <section className={styles.panel}>
        <div className={styles.panelTop}><h3>{t(title)}</h3><span className={styles.pill}>{items.length}</span></div>
        {items.length === 0 ? <p className={styles.empty}>{labels.noStatuses}</p> : (
          <div className={styles.statusGrid}>
            {items.map(([status, count]) => (
              <div key={status} className={styles.statusCard}>
                <span className={`${styles.badge} ${styles[`tone_${tone(status)}`]}`}>{t(status)}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  function renderCartPanel(className?: string) {
    return (
      <section className={[styles.panel, className].filter(Boolean).join(" ")}>
        <div className={styles.panelTop}><h3>{labels.cart}</h3><span className={styles.pill}>{cartItems.reduce((s, i) => s + i.qty, 0)}</span></div>
        {cartItems.length === 0 ? <p className={styles.empty}>{labels.cartEmpty}</p> : (
          <ul className={styles.cartList}>
            {cartItems.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{t(item.name)}</strong>
                  <p>{item.sku}</p>
                  <p>{money(item.price)}</p>
                </div>
                <div className={styles.cartControls}>
                  <input className={styles.qty} type="number" min={1} max={99} value={item.qty} onChange={(e) => setQty(item.id, Number(e.target.value || 1))} />
                  <button type="button" className={styles.linkBtn} onClick={() => removeCart(item.id)}>{labels.remove}</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {(consumerConfig?.showCheckoutBox ?? true) ? (
          <div className={styles.checkoutBox}>
            <h4>{labels.checkout}</h4>
            <label><span>{labels.email}</span><input className={styles.input} type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} /></label>
            <label>
              <span>{labels.shipping}</span>
              <select className={styles.select} value={shipping} onChange={(e) => setShipping(e.target.value)}>
                <option value="standard">{labels.standard}</option>
                <option value="express">{labels.express}</option>
                <option value="pickup">{labels.pickup}</option>
              </select>
            </label>
            <label>
              <span>{labels.payment}</span>
              <select className={styles.select} value={payment} onChange={(e) => setPayment(e.target.value)}>
                <option value="card">{labels.card}</option>
                <option value="transfer">{labels.transfer}</option>
                <option value="wallet">{labels.wallet}</option>
                <option value="cod">{labels.cod}</option>
              </select>
            </label>
            <div className={styles.totals}>
              <p><span>{labels.subtotal}</span><strong>{money(totals.subtotal)}</strong></p>
              <p><span>{labels.tax}</span><strong>{money(totals.tax)}</strong></p>
              <p><span>{labels.shipping}</span><strong>{money(totals.shipping)}</strong></p>
              <p className={styles.total}><span>{labels.total}</span><strong>{money(totals.total)}</strong></p>
            </div>
            <button type="button" className={styles.primaryWide} onClick={confirmCheckout}>{labels.confirm}</button>
          </div>
        ) : null}
      </section>
    );
  }

  if (loading && !snapshot) return <p className={styles.info}>{labels.loadingSimulator}</p>;
  if (error && !snapshot) return <p className={styles.error}>{error}</p>;
  if (!snapshot) return null;

  const consumer = isConsumerModule(moduleSlug);
  const kpiRows = entities.reduce((sum, e) => sum + e.rows.length, 0);
  const consumerViewConfig: Partial<Record<EcommerceSuiteModuleSlug, {
    mode: "storefront" | "entity";
    title: string;
    subtitle?: string;
    productLimit?: number;
    showCart: boolean;
    showCheckoutBox: boolean;
    mainPanels?: Array<{ title: string; entityKeys: string[]; statusSummary?: boolean }>;
    sidePanels?: Array<{ title: string; entityKeys: string[]; statusSummary?: boolean }>;
  }>> = {
    "ecommerce/consumer-discovery": {
      mode: "storefront",
      title: t("Explore catalog"),
      subtitle: t("Home, categories, search, filters, and recommendations."),
      productLimit: 16,
      showCart: true,
      showCheckoutBox: true,
      mainPanels: [
        { title: t("Discovery engine"), entityKeys: ["discoveryCatalog", "discoveryPersonalization", "discoveryContent"], statusSummary: true },
      ],
      sidePanels: [],
    },
    "ecommerce/consumer-evaluation-trust": {
      mode: "storefront",
      title: t("Evaluate product and trust"),
      subtitle: t("PDP, reviews, shipping, policy, and trust signals."),
      productLimit: 6,
      showCart: true,
      showCheckoutBox: false,
      mainPanels: [
        { title: t("Reviews, Q&A, and ratings"), entityKeys: ["socialProofAndQna"] },
      ],
      sidePanels: [
        { title: t("Shipping and policies"), entityKeys: ["shippingPolicyTrust"] },
        { title: t("Product card status"), entityKeys: ["productEvaluationCards"], statusSummary: true },
      ],
    },
    "ecommerce/consumer-intent": {
      mode: "storefront",
      title: t("Wishlist, compare, and offers"),
      subtitle: t("Purchase intent with wishlists, comparison, and promotions."),
      productLimit: 8,
      showCart: true,
      showCheckoutBox: false,
      mainPanels: [
        { title: t("Active comparisons"), entityKeys: ["comparisons"] },
        { title: t("Saved carts and offers"), entityKeys: ["savedCartsAndOffers"] },
      ],
      sidePanels: [
        { title: t("Wishlists / favorites"), entityKeys: ["wishlists"] },
      ],
    },
    "ecommerce/consumer-checkout": {
      mode: "storefront",
      title: t("Checkout and payment"),
      subtitle: t("Cart, address, shipping, payment, and confirmation."),
      productLimit: 10,
      showCart: true,
      showCheckoutBox: true,
      mainPanels: [
        { title: t("Checkout steps"), entityKeys: ["checkoutCartFlow", "checkoutDelivery", "checkoutPayments", "checkoutConfirmations"], statusSummary: true },
      ],
      sidePanels: [
        { title: t("Stored confirmations"), entityKeys: ["checkoutConfirmations"] },
      ],
    },
    "ecommerce/consumer-post-purchase": {
      mode: "entity",
      title: t("Post-purchase center"),
      showCart: false,
      showCheckoutBox: false,
      mainPanels: [
        { title: t("Notifications"), entityKeys: ["postPurchaseNotifications"] },
        { title: t("Tracking and statuses"), entityKeys: ["orderTrackingConsumer"] },
      ],
      sidePanels: [
        { title: t("Invoices and support"), entityKeys: ["postPurchaseDocumentsSupport"] },
      ],
    },
    "ecommerce/consumer-returns-refunds": {
      mode: "entity",
      title: t("Returns and refunds"),
      showCart: false,
      showCheckoutBox: false,
      mainPanels: [
        { title: t("Overall case status"), entityKeys: ["consumerRmaRequests", "consumerReverseLogistics", "consumerRefundResolutions", "consumerWarrantySupport"], statusSummary: true },
        { title: t("RMA requests"), entityKeys: ["consumerRmaRequests"] },
        { title: t("Reverse logistics"), entityKeys: ["consumerReverseLogistics"] },
      ],
      sidePanels: [
        { title: t("Resolutions / refunds"), entityKeys: ["consumerRefundResolutions"] },
        { title: t("Warranty / technical support"), entityKeys: ["consumerWarrantySupport"] },
      ],
    },
    "ecommerce/consumer-account-relationship": {
      mode: "entity",
      title: t("Account and relationship"),
      showCart: false,
      showCheckoutBox: false,
      mainPanels: [
        { title: t("Profile and account"), entityKeys: ["consumerProfiles", "consumerAddressesPayments"] },
        { title: t("Order history"), entityKeys: ["consumerOrderHistory"] },
      ],
      sidePanels: [
        { title: t("Loyalty and memberships"), entityKeys: ["consumerLoyaltyMemberships"] },
        { title: t("Preferences and consents"), entityKeys: ["consumerCommunicationPreferences"] },
      ],
    },
    "ecommerce/consumer-experience-security": {
      mode: "entity",
      title: t("Experience and security"),
      showCart: false,
      showCheckoutBox: false,
      mainPanels: [
        { title: t("Experience and security health"), entityKeys: ["consumerExperienceMetrics", "consumerSecurityPrivacy", "consumerInvisibleAntifraud"], statusSummary: true },
        { title: t("Performance and accessibility"), entityKeys: ["consumerExperienceMetrics"] },
      ],
      sidePanels: [
        { title: t("Privacy and account security"), entityKeys: ["consumerSecurityPrivacy"] },
        { title: t("Invisible antifraud"), entityKeys: ["consumerInvisibleAntifraud"] },
      ],
    },
  };
  const adminFocusConfig: Partial<Record<EcommerceSuiteModuleSlug, {
    headline: string;
    summaryTitle: string;
    focusKeys: string[];
    mode: "ops" | "analysis" | "control" | "config";
  }>> = {
    "ecommerce/admin-catalog-content": { headline: t("Catalog and inventory desk"), summaryTitle: t("Catalog and content"), focusKeys: ["adminCatalogProducts", "adminCatalogInventory", "adminCatalogContentSeo"], mode: "config" },
    "ecommerce/admin-checkout-payments-tax": { headline: t("Payments and tax control"), summaryTitle: t("Payments, reconciliation, and tax"), focusKeys: ["adminPaymentGateways", "adminPaymentReconciliation", "adminTaxInvoiceRules"], mode: "control" },
    "ecommerce/admin-promotions-pricing": { headline: t("Promotions and pricing engine"), summaryTitle: t("Promotions and pricing"), focusKeys: ["adminCouponsDiscountRules", "adminPricingSegments", "adminAbandonedCartOffers"], mode: "config" },
    "ecommerce/admin-orders-oms": { headline: t("OMS order center"), summaryTitle: t("Order operations"), focusKeys: ["adminOmsOrders", "adminOmsOperations", "adminOmsRiskRefunds"], mode: "ops" },
    "ecommerce/admin-logistics-fulfillment": { headline: t("Logistics and fulfillment tower"), summaryTitle: t("Shipping and fulfillment"), focusKeys: ["adminShippingConfig", "adminFulfillmentOps", "adminTrackingReverseLogistics"], mode: "ops" },
    "ecommerce/admin-cx-support": { headline: t("Customer support center"), summaryTitle: t("CX and support"), focusKeys: ["adminCxTicketsSla", "adminCxChannelsKnowledge", "adminCxQuality"], mode: "ops" },
    "ecommerce/admin-customers-crm": { headline: t("CRM and customers"), summaryTitle: t("Customers and CRM"), focusKeys: ["adminCustomerSegmentationCrm", "adminLoyaltySubscriptionsDunning", "adminB2BCrm"], mode: "analysis" },
    "ecommerce/admin-marketing-growth": { headline: t("Marketing and growth panel"), summaryTitle: t("Marketing and growth"), focusKeys: ["adminCampaignAutomation", "adminAttributionChannels", "adminPersonalizationExperiments"], mode: "analysis" },
    "ecommerce/admin-analytics-finance": { headline: t("Analytics and finance"), summaryTitle: t("KPIs and finance"), focusKeys: ["adminKpiSnapshots", "adminFunnelsCohortsReports", "adminFinanceReconciliation"], mode: "analysis" },
    "ecommerce/admin-security-risk-compliance": { headline: t("Security, risk, and compliance"), summaryTitle: t("Controls and compliance"), focusKeys: ["adminRolesAudit", "adminPrivacyCompliance", "adminSecurityControls"], mode: "control" },
    "ecommerce/admin-platform-technology": { headline: t("Platform and technology"), summaryTitle: t("Infra and observability"), focusKeys: ["adminPlatformPerformance", "adminIntegrationsApis", "adminEnvironmentsObservability"], mode: "control" },
    "ecommerce/admin-operations-strategy": { headline: t("Operations and strategy"), summaryTitle: t("Procurement, forecasting, and SOPs"), focusKeys: ["adminSuppliersProcurement", "adminPlanningMerchandising", "adminSopsTraining"], mode: "config" },
  };
  const consumerConfig = consumer ? consumerViewConfig[moduleSlug] : undefined;
  const adminConfig = !consumer ? adminFocusConfig[moduleSlug] : undefined;
  const adminFocusRows = !consumer && adminConfig ? adminConfig.focusKeys.flatMap((key) => getEntityRows(key)) : [];
  const showConsumerCart = consumer && tab === "experience" && (consumerConfig?.showCart ?? true);
  const hasRightbarCartSlot = Boolean(rightbarWidgetSlot);
  const rightbarCart =
    showConsumerCart && rightbarWidgetSlot
      ? createPortal(<div className={styles.rightbarCartDesktopOnly}>{renderCartPanel(styles.rightbarCartPanel)}</div>, rightbarWidgetSlot)
      : null;

  return (
    <div className={styles.root}>
      {rightbarCart}
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>{consumer ? labels.buyerTitle : labels.adminTitle}</p>
          <h2>{t(snapshot.module.title)}</h2>
          <p>{t(snapshot.module.description)}</p>
          <p className={styles.note}>{labels.sqliteNote}</p>
        </div>
        <div className={styles.tabs} role="tablist" aria-label={labels.moduleTabsAria}>
          <button type="button" className={`${styles.tab} ${tab === "experience" ? styles.tabActive : ""}`} onClick={() => setTab("experience")}>{labels.simulator}</button>
          <button type="button" className={`${styles.tab} ${tab === "data" ? styles.tabActive : ""}`} onClick={() => setTab("data")}>{labels.data}</button>
        </div>
      </section>

      {message ? <p className={styles.info}>{message}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {tab === "data" ? (
        <section className={styles.panel}><EcommerceCapabilityDemo moduleSlug={moduleSlug} /></section>
      ) : consumer ? (
        <div className={styles.buyerLayout}>
          <div className={styles.mainColumn}>
            {consumerConfig?.mode === "storefront" || !consumerConfig ? (
              <section className={styles.panel}>
                <div className={styles.panelTop}>
                  <div>
                    <h3>{consumerConfig?.title ?? labels.buyerTitle}</h3>
                    {consumerConfig?.subtitle ? <p className={styles.note}>{consumerConfig.subtitle}</p> : null}
                  </div>
                  <span className={styles.pill}>{filteredProducts.length}</span>
                </div>
                <div className={styles.filters}>
                  <input className={styles.input} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={labels.search} />
                  <div className={styles.chips}>
                    {categories.map((c) => (
                      <button key={c} type="button" className={`${styles.chip} ${category === c ? styles.chipActive : ""}`} onClick={() => setCategory(c)}>{c === "all" ? labels.all : c}</button>
                    ))}
                  </div>
                </div>
                <div className={styles.productGrid}>
                  {filteredProducts.slice(0, consumerConfig?.productLimit ?? 16).map((p) => {
                    const id = String(p.id ?? "");
                    const status = txt(p, "status") || "active";
                    return (
                      <article key={id} className={styles.card}>
                        <div className={styles.cardBody}>
                          <p className={styles.brand}>{t(txt(p, "brand"))}</p>
                          <h4>{t(txt(p, "name"))}</h4>
                          <p className={styles.metaLine}>{txt(p, "sku")}</p>
                          <div className={styles.rowBetween}>
                            <strong>{money(num(p, "price"))}</strong>
                            <span className={`${styles.badge} ${styles[`tone_${tone(status)}`]}`}>{t(status)}</span>
                          </div>
                          <p className={styles.metaLine}>{`${labels.stock}: ${num(p, "stock")}`}</p>
                          <div className={styles.actions}>
                            <button type="button" className={styles.secondaryBtn} onClick={() => toggleWishlist(id)}>{wishlist[id] ? labels.saved : labels.fav}</button>
                            <button type="button" className={styles.primaryBtn} onClick={() => addToCart(id)}>{labels.add}</button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : (
              <>
                <section className={styles.panel}>
                  <div className={styles.panelTop}>
                    <h3>{consumerConfig.title}</h3>
                    <span className={styles.pill}>{entities.length}</span>
                  </div>
                  <p className={styles.note}>{t(snapshot.module.description)}</p>
                  <div className={styles.statusGrid}>
                    {entities.map((entity) => (
                      <div key={entity.key} className={styles.statusCard}>
                        <span>{t(entity.label)}</span>
                        <strong>{entity.rows.length}</strong>
                      </div>
                    ))}
                  </div>
                </section>
                {consumerConfig.mainPanels?.map((panel) =>
                  panel.statusSummary
                    ? <div key={`${panel.title}-status`}>{renderStatusSummaryPanel(panel.title, panel.entityKeys.flatMap((key) => getEntityRows(key)))}</div>
                    : <div key={panel.title}>{renderFocusRows(panel.title, panel.entityKeys.flatMap((key) => getEntityRows(key)))}</div>
                )}
              </>
            )}

            {consumerConfig?.mode === "storefront" ? consumerConfig.mainPanels?.map((panel) =>
              panel.statusSummary
                ? <div key={`${panel.title}-status`}>{renderStatusSummaryPanel(panel.title, panel.entityKeys.flatMap((key) => getEntityRows(key)))}</div>
                : <div key={panel.title}>{renderFocusRows(panel.title, panel.entityKeys.flatMap((key) => getEntityRows(key)))}</div>
            ) : null}

            <section className={styles.panel}>
              <div className={styles.panelTop}><h3>{consumerConfig?.title ?? labels.entities}</h3><span className={styles.pill}>{entities.length}</span></div>
              <div className={styles.entityGrid}>
                {entities.map((entity) => (
                  <div key={entity.key} className={styles.entityCard}>
                    <div className={styles.rowBetween}><h4>{t(entity.label)}</h4><span className={styles.pill}>{entity.rows.length}</span></div>
                    <p>{t(entity.description)}</p>
                    <ul className={styles.miniList}>
                      {entity.rows.slice(0, 2).map((row) => (
                        <li key={txt(row, "id") || JSON.stringify(row)}>
                          <code>{txt(row, "id") || t("row")}</code>
                          <span>{t(firstReadableValue(row))}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            {showConsumerCart ? (
              hasRightbarCartSlot
                ? <div className={styles.mobileCartOnly}>{renderCartPanel(`${styles.stickyPanel} ${styles.mobileFallbackCartPanel}`)}</div>
                : renderCartPanel(`${styles.stickyPanel} ${styles.sideCartPanel}`)
            ) : null}

            {consumerConfig?.sidePanels?.map((panel) =>
              panel.statusSummary
                ? <div key={`${panel.title}-status`}>{renderStatusSummaryPanel(panel.title, panel.entityKeys.flatMap((key) => getEntityRows(key)))}</div>
                : <div key={panel.title}>{renderFocusRows(panel.title, panel.entityKeys.flatMap((key) => getEntityRows(key)))}</div>
            )}

            {moduleSlug === "ecommerce/consumer-post-purchase" || moduleSlug === "ecommerce/consumer-checkout" || (consumerConfig?.showCart ?? true) ? (
              <section className={styles.panel}>
                <div className={styles.panelTop}><h3>{moduleSlug === "ecommerce/consumer-post-purchase" ? labels.orderTimeline : labels.simulatedOrders}</h3><span className={styles.pill}>{orders.length}</span></div>
                {orders.length === 0 ? <p className={styles.empty}>{labels.noOrdersYet}</p> : (
                  <ul className={styles.timeline}>
                    {orders.map((o) => (
                      <li key={o.id}><div><strong>{o.id}</strong><p>{new Date(o.createdAt).toLocaleString(language)}</p><p>{`${o.items} ${labels.itemCountSuffix}`}</p></div><span>{money(o.total)}</span></li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </aside>
        </div>
      ) : (
        <div className={styles.adminLayout}>
          <section className={styles.kpiGrid}>
            <div className={styles.kpi}><p>{adminConfig?.mode === "control" ? (t("Controls")) : t("Entities")}</p><strong>{entities.length}</strong></div>
            <div className={styles.kpi}><p>{t("Rows")}</p><strong>{kpiRows}</strong></div>
            <div className={styles.kpi}><p>{t("Statuses")}</p><strong>{statusBuckets.length}</strong></div>
            <div className={styles.kpi}><p>{adminConfig?.mode === "analysis" ? (t("Sources")) : t("Actions")}</p><strong>{adminConfig?.focusKeys.length ?? snapshot.module.actions.length}</strong></div>
          </section>

          <div className={styles.adminBoard}>
            {adminConfig?.mode === "analysis" ? (
              <>
                {renderFocusRows(adminConfig.headline, adminFocusRows)}
                {renderStatusSummaryPanel(adminConfig.summaryTitle, adminFocusRows)}
              </>
            ) : null}
            {adminConfig?.mode === "control" ? (
              <>
                {renderStatusSummaryPanel(adminConfig.headline, adminFocusRows)}
                {renderFocusRows(adminConfig.summaryTitle, adminFocusRows)}
              </>
            ) : null}
            {adminConfig?.mode === "config" ? renderFocusRows(adminConfig.headline, adminFocusRows) : null}
            <section className={styles.panel}>
              <div className={styles.panelTop}><h3>{adminConfig?.mode === "ops" ? adminConfig.headline : (t("Entity selection"))}</h3><span className={styles.pill}>{statusBuckets.length}</span></div>
              <div className={styles.statusGrid}>
                {statusBuckets.slice(0, 12).map(([status, count]) => (
                  <div key={status} className={styles.statusCard}><span className={`${styles.badge} ${styles[`tone_${tone(status)}`]}`}>{t(status)}</span><strong>{count}</strong></div>
                ))}
              </div>
              <div className={styles.entityTabs}>
                {entities.map((entity) => (
                  <button key={entity.key} type="button" className={`${styles.entityTab} ${adminEntityKey === entity.key ? styles.entityTabActive : ""}`} onClick={() => setAdminEntityKey(entity.key)}>
                    <span>{t(entity.label)}</span><small>{entity.rows.length}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelTop}><h3>{adminConfig?.mode === "analysis" ? labels.analysisTable : t(selectedEntity?.label ?? labels.entity)}</h3><span className={styles.pill}>{adminRows.length}</span></div>
              <p className={styles.note}>{selectedEntity?.description ? t(selectedEntity.description) : ""}</p>
              <input className={styles.input} type="search" value={adminQuery} onChange={(e) => setAdminQuery(e.target.value)} placeholder={labels.adminFilter} />
              {!selectedEntity ? <p className={styles.empty}>{labels.noEntitySelected}</p> : adminRows.length === 0 ? <p className={styles.empty}>{labels.noRowsFound}</p> : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {tableCols(adminRows).map((col) => <th key={col}>{humanize(col)}</th>)}
                        <th>{labels.quick}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminRows.slice(0, 12).map((row) => {
                        const id = txt(row, "id");
                        const cols = tableCols(adminRows);
                        const status = txt(row, "status");
                        return (
                          <tr key={id || JSON.stringify(row)}>
                            {cols.map((col) => <td key={`${id}-${col}`}>{String(row[col] ?? "-")}</td>)}
                            <td>
                              {status ? (
                                <div className={styles.quickBtns}>
                                  {["review", "approved", "completed"].filter((s) => s !== status).map((s) => (
                                    <button key={`${id}-${s}`} type="button" className={styles.secondaryBtn} disabled={busyRow === id} onClick={() => void updateStatus(row, s)}>{t(s)}</button>
                                  ))}
                                </div>
                              ) : (
                                <span className={styles.muted}>{labels.noStatus}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {adminConfig?.mode === "ops" ? renderFocusRows(adminConfig.summaryTitle, adminFocusRows) : null}

            <section className={styles.panel}>
              <div className={styles.panelTop}><h3>{adminConfig?.summaryTitle ?? labels.entities}</h3><span className={styles.pill}>{entities.length}</span></div>
              <div className={styles.entityGrid}>
                {entities.map((entity) => {
                  const first = entity.rows[0] ?? {};
                  const status = txt(first, "status");
                  return (
                    <div key={entity.key} className={styles.entityCard}>
                      <div className={styles.rowBetween}><h4>{t(entity.label)}</h4><span className={styles.pill}>{entity.rows.length}</span></div>
                      <p>{t(entity.description)}</p>
                      {status ? <span className={`${styles.badge} ${styles[`tone_${tone(status)}`]}`}>{t(status)}</span> : null}
                      <ul className={styles.miniList}>
                        {Object.entries(first).slice(0, 3).map(([k, v]) => <li key={`${entity.key}-${k}`}><code>{k}</code><span>{t(String(v ?? "-"))}</span></li>)}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

