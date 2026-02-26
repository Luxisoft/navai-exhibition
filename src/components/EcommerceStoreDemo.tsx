'use client';

import { useCallback, useEffect, useMemo, useState } from "react";

import styles from "@/components/EcommerceStoreDemo.module.css";
import {
  type EcommerceLocalProduct,
  type EcommerceLocalPurchase,
  type EcommerceSeedSnapshot,
  createEcommerceLocalProduct,
  deleteEcommerceLocalProduct,
  getEcommerceLocalStateReport,
  setEcommerceDemoSeedProductsCache,
  simulateEcommerceLocalPurchase,
  subscribeEcommerceLocalState,
  updateEcommerceLocalProduct,
} from "@/lib/ecommerce-demo-local";
import { useI18n } from "@/i18n/provider";
import {
  getEcommerceStoreDemoBuyerName,
  getEcommerceStoreDemoRuntimeMessage,
  getEcommerceStoreDemoStatusLabel,
  getEcommerceStoreDemoText,
  isEcommerceStoreDemoDefaultBuyerName,
} from "@/i18n/ecommerce-store-demo";

type OverviewResponse = {
  ok: boolean;
  readOnly: boolean;
  snapshot: EcommerceSeedSnapshot;
  overview: {
    ok: boolean;
    rangeDays: number;
    overview: {
      orderCount: number;
      revenuePaid: number;
      avgOrderValuePaid: number;
      unitsOrdered: number;
    };
    statusBreakdown: Array<{ status: string; orders: number; amount: number }>;
    topCategories: Array<{ categoryCode: string; categoryName: string; unitsSold: number; revenue: number }>;
    topProducts: Array<{ id: number; sku: string; name: string; brand: string; category: string; unitsSold: number; revenue: number }>;
  };
  salesByCategory: {
    ok: boolean;
    rows: Array<{ categoryCode: string; categoryName: string; orderCount: number; unitsSold: number; revenue: number }>;
  };
};

type CatalogRow = {
  id: string;
  source: "seed" | "user";
  name: string;
  brand: string;
  sku: string;
  category: string;
  categoryCode: string;
  description: string;
  price: number;
  stock: number;
  status: string;
  unitsSold: number;
  revenue: number;
  ratingAvg?: number;
  ratingCount?: number;
};

type ProductFormState = {
  id: string | null;
  name: string;
  brand: string;
  categoryCode: string;
  description: string;
  price: string;
  stock: string;
  status: "active" | "draft";
};

const EMPTY_SEED_PRODUCTS: EcommerceSeedSnapshot["products"] = [];
const EMPTY_SEED_CATEGORIES: EcommerceSeedSnapshot["categories"] = [];
const EMPTY_SEED_ORDERS: EcommerceSeedSnapshot["recentOrders"] = [];
const EMPTY_CATEGORY_REPORT: Array<{ categoryCode: string; categoryName: string; orderCount: number; unitsSold: number; revenue: number }> = [];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function emptyProductForm(): ProductFormState {
  return {
    id: null,
    name: "",
    brand: "",
    categoryCode: "smartphones",
    description: "",
    price: "",
    stock: "",
    status: "active",
  };
}

function productFormFromLocalProduct(product: EcommerceLocalProduct): ProductFormState {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    categoryCode: product.categoryCode,
    description: product.description,
    price: String(product.price),
    stock: String(product.stock),
    status: product.status,
  };
}



export default function EcommerceStoreDemo() {
  const { language } = useI18n();
  const t = (en: string) => getEcommerceStoreDemoText(language, en);

  const [serverData, setServerData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [localProducts, setLocalProducts] = useState<EcommerceLocalProduct[]>([]);
  const [localPurchases, setLocalPurchases] = useState<EcommerceLocalPurchase[]>([]);
  const [localRevenue, setLocalRevenue] = useState(0);

  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm());
  const [productFormMessage, setProductFormMessage] = useState<string | null>(null);

  const [purchaseProductId, setPurchaseProductId] = useState("");
  const [purchaseQty, setPurchaseQty] = useState("1");
  const [buyerName, setBuyerName] = useState(() => getEcommerceStoreDemoBuyerName(language));
  const [buyerEmail, setBuyerEmail] = useState("demo.buyer@example.com");
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const loadSeedDemo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ecommerce-demo/seed?rangeDays=30&productLimit=60&recentOrdersLimit=18", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as OverviewResponse;
      setServerData(payload);
      if (payload.snapshot?.products) {
        setEcommerceDemoSeedProductsCache(payload.snapshot.products);
        setPurchaseProductId((current) => {
          const exists = payload.snapshot.products.some((item) => String(item.id) === current);
          return current && exists ? current : payload.snapshot.products[0] ? String(payload.snapshot.products[0].id) : "";
        });
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? getEcommerceStoreDemoRuntimeMessage(language, nextError.message)
          : getEcommerceStoreDemoText(language, "Failed to load demo seed.")
      );
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    void loadSeedDemo();
  }, [refreshKey, loadSeedDemo]);

  useEffect(() => {
    const sync = () => {
      const report = getEcommerceLocalStateReport();
      setLocalProducts(report.userProducts);
      setLocalPurchases(report.purchases);
      setLocalRevenue(report.summary.localRevenue);
    };
    sync();
    return subscribeEcommerceLocalState(sync);
  }, []);

  useEffect(() => {
    setBuyerName((current) => {
      if (isEcommerceStoreDemoDefaultBuyerName(current)) {
        return getEcommerceStoreDemoBuyerName(language);
      }
      return current;
    });
  }, [language]);

  const seedProducts = serverData?.snapshot.products ?? EMPTY_SEED_PRODUCTS;
  const seedCategories = serverData?.snapshot.categories ?? EMPTY_SEED_CATEGORIES;
  const seedRecentOrders = serverData?.snapshot.recentOrders ?? EMPTY_SEED_ORDERS;
  const overview = serverData?.overview;
  const salesByCategory = serverData?.salesByCategory?.rows ?? EMPTY_CATEGORY_REPORT;

  const localPurchaseTotalsByUserProductId = useMemo(() => {
    const map = new Map<string, { units: number; revenue: number }>();
    for (const purchase of localPurchases) {
      if (purchase.source !== "user") continue;
      const current = map.get(purchase.productId) ?? { units: 0, revenue: 0 };
      current.units += purchase.quantity;
      current.revenue += purchase.totalAmount;
      map.set(purchase.productId, current);
    }
    return map;
  }, [localPurchases]);

  const catalogRows = useMemo<CatalogRow[]>(() => {
    const seedRows: CatalogRow[] = seedProducts.map((product) => ({
      id: String(product.id),
      source: "seed",
      name: product.name,
      brand: product.brand,
      sku: product.sku,
      category: product.category,
      categoryCode: product.categoryCode,
      description: product.description,
      price: product.price,
      stock: product.stock,
      status: product.status,
      unitsSold: product.unitsSold,
      revenue: product.revenue,
      ratingAvg: product.ratingAvg,
      ratingCount: product.ratingCount,
    }));

    const userRows: CatalogRow[] = localProducts.map((product) => {
      const totals = localPurchaseTotalsByUserProductId.get(product.id) ?? { units: 0, revenue: 0 };
      return {
        id: product.id,
        source: "user",
        name: product.name,
        brand: product.brand,
        sku: product.sku,
        category: product.category,
        categoryCode: product.categoryCode,
        description: product.description,
        price: product.price,
        stock: product.stock,
        status: product.status,
        unitsSold: totals.units,
        revenue: totals.revenue,
      };
    });

    return [...userRows, ...seedRows];
  }, [seedProducts, localProducts, localPurchaseTotalsByUserProductId]);

  const filteredCatalogRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return catalogRows.filter((item) => {
      if (categoryFilter !== "all" && item.categoryCode !== categoryFilter) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        item.brand.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    });
  }, [catalogRows, categoryFilter, searchQuery]);

  const combinedCategories = useMemo(() => {
    const set = new Map<string, string>();
    for (const category of seedCategories) set.set(category.code, category.name);
    for (const product of localProducts) set.set(product.categoryCode, product.category || product.categoryCode);
    return [...set.entries()].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [seedCategories, localProducts]);

  function handleProductFormChange<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setProductForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmitProductForm(event: React.FormEvent) {
    event.preventDefault();
    setProductFormMessage(null);
    try {
      if (productForm.id) {
        updateEcommerceLocalProduct(productForm.id, {
          name: productForm.name,
          brand: productForm.brand,
          categoryCode: productForm.categoryCode,
          description: productForm.description,
          price: Number(productForm.price),
          stock: Number(productForm.stock),
          status: productForm.status,
        });
        setProductFormMessage(
          t("Product updated in localStorage (seed data remains read-only).")
        );
      } else {
        createEcommerceLocalProduct({
          name: productForm.name,
          brand: productForm.brand,
          categoryCode: productForm.categoryCode,
          description: productForm.description,
          price: Number(productForm.price),
          stock: Number(productForm.stock),
          status: productForm.status,
        });
        setProductFormMessage(t("Product created in localStorage."));
      }
      setProductForm(emptyProductForm());
    } catch (nextError) {
      setProductFormMessage(
        nextError instanceof Error
          ? getEcommerceStoreDemoRuntimeMessage(language, nextError.message)
          : t("Failed to save product.")
      );
    }
  }

  function handleEditUserProduct(product: EcommerceLocalProduct) {
    setProductForm(productFormFromLocalProduct(product));
    setProductFormMessage(
      t("Editing your local product (seed products cannot be edited).")
    );
  }

  function handleDeleteUserProduct(productId: string) {
    setProductFormMessage(null);
    try {
      deleteEcommerceLocalProduct(productId);
      if (productForm.id === productId) setProductForm(emptyProductForm());
      setProductFormMessage(t("Local product deleted."));
    } catch (nextError) {
      setProductFormMessage(
        nextError instanceof Error
          ? getEcommerceStoreDemoRuntimeMessage(language, nextError.message)
          : t("Failed to delete product.")
      );
    }
  }

  function handleSubmitPurchaseForm(event: React.FormEvent) {
    event.preventDefault();
    setPurchaseMessage(null);
    try {
      const result = simulateEcommerceLocalPurchase({
        productId: purchaseProductId,
        quantity: Number(purchaseQty),
        buyerName,
        buyerEmail,
      });
      setPurchaseMessage(getEcommerceStoreDemoRuntimeMessage(language, result.note));
      setPurchaseQty("1");
    } catch (nextError) {
      setPurchaseMessage(
        nextError instanceof Error
          ? getEcommerceStoreDemoRuntimeMessage(language, nextError.message)
          : t("Failed to simulate purchase.")
      );
    }
  }

  const selectedCatalogRow = catalogRows.find((item) => item.id === purchaseProductId);

  return (
    <div className={`docs-markdown-body ${styles.root}`}>
      <h2 id="ecommerce-demo-overview">{t("Ecommerce Demo Overview")}</h2>
      <p>
        {t("This demo simulates a realistic ecommerce environment for NAVAI. The seed catalog, customers, and orders are read-only and come from a SQLite demo database. User-created products and purchase simulations are stored only in localStorage.")}
      </p>

      {loading ? <p className={styles.info}>{t("Loading SQLite demo seed...")}</p> : null}
      {error ? (
        <div className={styles.errorBox}>
          <p><strong>{t("Could not load the ecommerce demo seed.")}</strong></p>
          <p>{error}</p>
          <button type="button" className={styles.smallButton} onClick={() => setRefreshKey((v) => v + 1)}>
            {t("Retry")}
          </button>
        </div>
      ) : null}

      {serverData ? (
        <>
          <div className={styles.banner}>
            <div>
              <p className={styles.badge}>{t("SQLite Seed (Read-Only)")}</p>
              <h3 className={styles.bannerTitle}>{t("Safe ecommerce sandbox for NAVAI demos")}</h3>
              <p className={styles.bannerText}>
                {t("Users can query/report on realistic seed data and create their own products locally without modifying the seed database.")}
              </p>
            </div>
            <div className={styles.bannerActions}>
              <button type="button" className={styles.smallButton} onClick={() => setRefreshKey((v) => v + 1)}>
                {t("Refresh seed snapshot")}
              </button>
              <span className={styles.meta}>{t("Generated")}: {serverData.snapshot.generatedAt}</span>
            </div>
          </div>

          <h2 id="ecommerce-demo-reports">{t("Reports & KPIs (SQLite)")}</h2>
          <div className={styles.gridCards}>
            <article className={styles.card}><span>{t("Seed Products")}</span><strong>{serverData.snapshot.kpis.productCount}</strong></article>
            <article className={styles.card}><span>{t("Customers")}</span><strong>{serverData.snapshot.kpis.customerCount}</strong></article>
            <article className={styles.card}><span>{t("Orders (30d)")}</span><strong>{overview?.overview.orderCount ?? 0}</strong></article>
            <article className={styles.card}><span>{t("Revenue Paid (30d)")}</span><strong>{formatCurrency(overview?.overview.revenuePaid ?? 0)}</strong></article>
            <article className={styles.card}><span>{t("AOV (30d)")}</span><strong>{formatCurrency(overview?.overview.avgOrderValuePaid ?? 0)}</strong></article>
            <article className={styles.card}><span>{t("Units Ordered (30d)")}</span><strong>{overview?.overview.unitsOrdered ?? 0}</strong></article>
            <article className={styles.card}><span>{t("User Products (local)")}</span><strong>{localProducts.length}</strong></article>
            <article className={styles.card}><span>{t("Local Purchases")}</span><strong>{localPurchases.length}</strong></article>
            <article className={styles.card}><span>{t("Local Revenue")}</span><strong>{formatCurrency(localRevenue)}</strong></article>
          </div>

          <div className={styles.twoCols}>
            <section className={styles.panel}>
              <h3>{t("Sales by Category (30d)")}</h3>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>{t("Category")}</th><th>{t("Orders")}</th><th>{t("Units")}</th><th>{t("Revenue")}</th></tr>
                  </thead>
                  <tbody>
                    {salesByCategory.map((row) => (
                      <tr key={row.categoryCode}>
                        <td>{row.categoryName}</td>
                        <td>{row.orderCount}</td>
                        <td>{row.unitsSold}</td>
                        <td>{formatCurrency(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.panel}>
              <h3>{t("Order Status Breakdown (30d)")}</h3>
              <ul className={styles.list}>
                {(overview?.statusBreakdown ?? []).map((row) => (
                  <li key={row.status} className={styles.listRow}>
                    <span>{getEcommerceStoreDemoStatusLabel(language, row.status)}</span>
                    <span>{row.orders} {t("orders")}</span>
                    <strong>{formatCurrency(row.amount)}</strong>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <h2 id="ecommerce-demo-catalog">{t("Catalog Browser (Seed + User products)")}</h2>
          <div className={styles.filters}>
            <input
              className={styles.input}
              type="search"
              placeholder={t("Search by product, brand, SKU...")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <select className={styles.select} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">{t("All categories")}</option>
              {combinedCategories.map((category) => (
                <option key={category.code} value={category.code}>{category.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("Source")}</th><th>{t("Product")}</th><th>SKU</th><th>{t("Category")}</th><th>{t("Price")}</th><th>{t("Stock")}</th><th>{t("Units Sold")}</th><th>{t("Revenue")}</th><th>{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalogRows.slice(0, 80).map((row) => (
                  <tr key={`${row.source}-${row.id}`}>
                    <td>
                      <span className={`${styles.sourceTag} ${row.source === "seed" ? styles.seedTag : styles.userTag}`}>
                        {row.source === "seed" ? t("Seed SQLite") : t("User local")}
                      </span>
                    </td>
                    <td>
                      <div className={styles.productCell}>
                        <strong>{row.name}</strong>
                        <small>{row.brand}</small>
                      </div>
                    </td>
                    <td>{row.sku}</td>
                    <td>{row.category}</td>
                    <td>{formatCurrency(row.price)}</td>
                    <td>{row.stock}</td>
                    <td>{row.unitsSold}</td>
                    <td>{formatCurrency(row.revenue)}</td>
                    <td>
                      {row.source === "user" ? (
                        <div className={styles.inlineActions}>
                          <button
                            type="button"
                            className={styles.tableButton}
                            onClick={() => {
                              const local = localProducts.find((item) => item.id === row.id);
                              if (local) handleEditUserProduct(local);
                            }}
                          >
                            {t("Edit")}
                          </button>
                          <button
                            type="button"
                            className={`${styles.tableButton} ${styles.danger}`}
                            onClick={() => handleDeleteUserProduct(row.id)}
                          >
                            {t("Delete")}
                          </button>
                        </div>
                      ) : (
                        <span className={styles.lockedNote}>{t("Read-only")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 id="ecommerce-demo-product-crud">{t("Create / Edit / Delete User Products (localStorage)")}</h2>
          <p>
            {t("This form only writes to localStorage. Seed SQLite products are immutable and cannot be edited/deleted.")}
          </p>
          <form className={styles.formPanel} onSubmit={handleSubmitProductForm}>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>{t("Name")}</span>
                <input className={styles.input} value={productForm.name} onChange={(e) => handleProductFormChange("name", e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>{t("Brand")}</span>
                <input className={styles.input} value={productForm.brand} onChange={(e) => handleProductFormChange("brand", e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>{t("Category")}</span>
                <select className={styles.select} value={productForm.categoryCode} onChange={(e) => handleProductFormChange("categoryCode", e.target.value)}>
                  {combinedCategories.map((category) => (
                    <option key={category.code} value={category.code}>{category.name}</option>
                  ))}
                  <option value="misc">{t("Misc")}</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>{t("Status")}</span>
                <select className={styles.select} value={productForm.status} onChange={(e) => handleProductFormChange("status", e.target.value as "active" | "draft")}>
                  <option value="active">{t("Active")}</option>
                  <option value="draft">{t("Draft")}</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>{t("Price (USD)")}</span>
                <input className={styles.input} type="number" min="0" step="0.01" value={productForm.price} onChange={(e) => handleProductFormChange("price", e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>{t("Stock")}</span>
                <input className={styles.input} type="number" min="0" step="1" value={productForm.stock} onChange={(e) => handleProductFormChange("stock", e.target.value)} />
              </label>
              <label className={`${styles.field} ${styles.span2}`}>
                <span>{t("Description")}</span>
                <textarea className={styles.textarea} value={productForm.description} onChange={(e) => handleProductFormChange("description", e.target.value)} rows={3} />
              </label>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryButton}>
                {productForm.id ? t("Update local product") : t("Create local product")}
              </button>
              {productForm.id ? (
                <button type="button" className={styles.smallButton} onClick={() => setProductForm(emptyProductForm())}>
                  {t("Cancel edit")}
                </button>
              ) : null}
            </div>
            {productFormMessage ? <p className={styles.info}>{productFormMessage}</p> : null}
          </form>

          <h2 id="ecommerce-demo-purchase-form">{t("Purchase Simulator (localStorage)")}</h2>
          <p>
            {t("Buying a seed product records a local purchase only (for demo/testing). Buying a user product also updates local stock.")}
          </p>
          <form className={styles.formPanel} onSubmit={handleSubmitPurchaseForm}>
            <div className={styles.formGrid}>
              <label className={`${styles.field} ${styles.span2}`}>
                <span>{t("Product")}</span>
                <select className={styles.select} value={purchaseProductId} onChange={(e) => setPurchaseProductId(e.target.value)}>
                  {catalogRows.map((row) => (
                    <option key={`${row.source}-${row.id}`} value={row.id}>
                      [{row.source === "seed" ? t("Seed") : t("User")}] {row.name} - {formatCurrency(row.price)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>{t("Quantity")}</span>
                <input className={styles.input} type="number" min="1" step="1" value={purchaseQty} onChange={(e) => setPurchaseQty(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>{t("Buyer name")}</span>
                <input className={styles.input} value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>{t("Buyer email")}</span>
                <input className={styles.input} type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} />
              </label>
              <div className={styles.previewBox}>
                <span>{t("Selected product")}</span>
                <strong>{selectedCatalogRow ? selectedCatalogRow.name : t("Select a product")}</strong>
                <small>
                  {selectedCatalogRow
                    ? `${selectedCatalogRow.source === "seed" ? t("Seed SQLite (read-only)") : t("User local product")} - ${formatCurrency(selectedCatalogRow.price)}`
                    : ""}
                </small>
              </div>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryButton}>{t("Simulate purchase")}</button>
            </div>
            {purchaseMessage ? <p className={styles.info}>{purchaseMessage}</p> : null}
          </form>

          <h3 id="ecommerce-demo-local-purchases">{t("Recent local purchases")}</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>{t("Date")}</th><th>{t("Source")}</th><th>{t("Product")}</th><th>{t("Qty")}</th><th>{t("Buyer")}</th><th>{t("Total")}</th></tr>
              </thead>
              <tbody>
                {localPurchases.length === 0 ? (
                  <tr><td colSpan={6}>{t("No local purchases yet. Use the simulator or ask NAVAI to call the purchase tool.")}</td></tr>
                ) : (
                  localPurchases.slice(0, 12).map((purchase) => (
                    <tr key={purchase.id}>
                      <td>{purchase.createdAt}</td>
                      <td>{purchase.source === "seed" ? t("Seed") : t("User")}</td>
                      <td>{purchase.productName}</td>
                      <td>{purchase.quantity}</td>
                      <td>{purchase.buyerName}</td>
                      <td>{formatCurrency(purchase.totalAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h2 id="ecommerce-demo-seed-orders">{t("Seed recent orders (SQLite, read-only)")}</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>{t("Order")}</th><th>{t("Customer")}</th><th>{t("City")}</th><th>{t("Status")}</th><th>{t("Payment")}</th><th>{t("Total")}</th><th>{t("Date")}</th></tr>
              </thead>
              <tbody>
                {seedRecentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.orderNumber}</td>
                    <td>{order.customerName}</td>
                    <td>{order.city}</td>
                    <td>{getEcommerceStoreDemoStatusLabel(language, order.status)}</td>
                    <td>{getEcommerceStoreDemoStatusLabel(language, order.paymentStatus)}</td>
                    <td>{formatCurrency(order.totalAmount)}</td>
                    <td>{order.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
