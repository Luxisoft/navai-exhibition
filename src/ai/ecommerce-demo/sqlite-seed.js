import path from "node:path";
import initSqlJs from "sql.js";

let runtimePromise = null;

const CATEGORIES = [
  ["smartphones", "Smartphones"],
  ["laptops", "Laptops"],
  ["audio", "Audio"],
  ["gaming", "Gaming"],
  ["wearables", "Wearables"],
  ["home-office", "Home Office"],
];

const PRODUCT_BLUEPRINTS = [
  ["smartphones", "Apple", "iPhone 15 Pro 256GB", 1099, 832, 18, 4.8],
  ["smartphones", "Apple", "iPhone 15 128GB", 829, 610, 24, 4.7],
  ["smartphones", "Samsung", "Galaxy S24 Ultra 512GB", 1299, 960, 14, 4.8],
  ["smartphones", "Google", "Pixel 9 Pro 256GB", 999, 720, 16, 4.7],
  ["smartphones", "Xiaomi", "Xiaomi 14 256GB", 749, 520, 26, 4.5],
  ["laptops", "Apple", "MacBook Air 13 M3 16GB/512GB", 1499, 1120, 11, 4.9],
  ["laptops", "Dell", "XPS 13 Plus 16GB/1TB", 1799, 1310, 10, 4.6],
  ["laptops", "Lenovo", "ThinkPad X1 Carbon Gen 12", 1899, 1395, 9, 4.7],
  ["laptops", "ASUS", "Zenbook 14 OLED 16GB/1TB", 1399, 1020, 13, 4.6],
  ["audio", "Sony", "WH-1000XM5 Headphones", 399, 240, 30, 4.8],
  ["audio", "Apple", "AirPods Pro 2 USB-C", 249, 145, 45, 4.7],
  ["audio", "Bose", "QuietComfort Ultra Headphones", 429, 255, 20, 4.7],
  ["audio", "JBL", "Charge 5 Bluetooth Speaker", 179, 98, 34, 4.5],
  ["gaming", "Sony", "PlayStation 5 Slim Console", 499, 392, 12, 4.8],
  ["gaming", "Microsoft", "Xbox Series X Console", 499, 385, 10, 4.7],
  ["gaming", "Nintendo", "Nintendo Switch OLED", 349, 241, 28, 4.8],
  ["gaming", "Logitech G", "G Pro X Superlight 2 Mouse", 159, 89, 32, 4.6],
  ["wearables", "Apple", "Apple Watch Series 9 45mm GPS", 429, 278, 23, 4.7],
  ["wearables", "Samsung", "Galaxy Watch 6 Classic 47mm", 399, 260, 18, 4.5],
  ["wearables", "Garmin", "Forerunner 965", 599, 394, 12, 4.8],
  ["wearables", "Fitbit", "Charge 6", 159, 96, 25, 4.3],
  ["home-office", "Logitech", "MX Master 3S Mouse", 99, 54, 38, 4.8],
  ["home-office", "Logitech", "MX Keys S Keyboard", 109, 61, 31, 4.7],
  ["home-office", "BenQ", "27in QHD USB-C Monitor PD2705Q", 449, 305, 9, 4.6],
  ["home-office", "Anker", "Prime 12-in-1 USB-C Dock", 279, 171, 14, 4.5],
];

function rng(seed = 20260224) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function randInt(r, min, max) {
  return Math.floor(r() * (max - min + 1)) + min;
}

function pick(r, list) {
  return list[Math.floor(r() * list.length)];
}

function pad(v, n = 2) {
  return String(v).padStart(n, "0");
}

function dateTimeDaysAgo(days, hour = 12, min = 0, sec = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, min, sec, 0);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(
    d.getUTCMinutes()
  )}:${pad(d.getUTCSeconds())}`;
}

function buildSeed() {
  const r = rng();
  const categories = CATEGORIES.map(([code, name], i) => ({ id: i + 1, code, name }));
  const byCode = new Map(categories.map((c) => [c.code, c.id]));
  const products = PRODUCT_BLUEPRINTS.map(([cat, brand, name, price, cost, stock, rating], i) => ({
    id: i + 1,
    category_id: byCode.get(cat),
    brand,
    name,
    sku: `${String(brand).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 4).padEnd(4, "X")}-${pad(i + 1, 4)}`,
    description: `${brand} ${name} (demo seed catalog, read-only).`,
    price,
    cost,
    stock,
    rating_avg: rating,
    rating_count: randInt(r, 40, 1400),
    status: stock <= 5 ? "low_stock" : "active",
    created_at: dateTimeDaysAgo(randInt(r, 20, 420), randInt(r, 8, 20), randInt(r, 0, 59), randInt(r, 0, 59)),
  }));

  const first = ["Sofia", "Daniel", "Valeria", "Mateo", "Camila", "Javier", "Emily", "Michael", "Olivia", "Ethan"];
  const last = ["Ramirez", "Gomez", "Torres", "Fernandez", "Miller", "Johnson", "Brown", "Davis", "Lopez", "Wilson"];
  const cities = [
    ["Miami", "US"], ["Austin", "US"], ["Dallas", "US"], ["New York", "US"], ["Seattle", "US"], ["Bogota", "CO"],
    ["Medellin", "CO"], ["Mexico City", "MX"], ["Guadalajara", "MX"], ["Lima", "PE"], ["Madrid", "ES"], ["Barcelona", "ES"],
  ];
  const segments = ["retail", "retail", "retail", "vip", "smb"];
  const customers = Array.from({ length: 48 }, (_, i) => {
    const fn = pick(r, first);
    const ln = pick(r, last);
    const [city, country] = pick(r, cities);
    return {
      id: i + 1,
      full_name: `${fn} ${ln}`,
      email: `${fn}.${ln}.${i + 1}`.toLowerCase() + "@" + pick(r, ["gmail.com", "outlook.com", "icloud.com", "corp-mail.com"]),
      city,
      country_code: country,
      segment: pick(r, segments),
      created_at: dateTimeDaysAgo(randInt(r, 30, 800), randInt(r, 8, 21), randInt(r, 0, 59), randInt(r, 0, 59)),
    };
  });

  const orders = [];
  const orderItems = [];
  let itemId = 1;
  for (let i = 1; i <= 156; i += 1) {
    const customer = pick(r, customers);
    const statusRoll = r();
    const status = statusRoll < 0.62 ? "delivered" : statusRoll < 0.79 ? "shipped" : statusRoll < 0.9 ? "processing" : statusRoll < 0.96 ? "cancelled" : "refunded";
    const payment_status = status === "cancelled" ? "voided" : status === "refunded" ? "refunded" : status === "processing" ? "pending" : "paid";
    const payment_method = pick(r, ["card", "paypal", "bank_transfer", "cash_on_delivery"]);
    const created_at = dateTimeDaysAgo(randInt(r, 0, 180), randInt(r, 8, 22), randInt(r, 0, 59), randInt(r, 0, 59));
    const used = new Set();
    const lines = [];
    const lineCount = randInt(r, 1, 4);
    while (lines.length < lineCount) {
      const p = pick(r, products);
      if (used.has(p.id)) continue;
      used.add(p.id);
      const qty = randInt(r, 1, p.price > 1000 ? 1 : p.price > 400 ? 2 : 3);
      const unit = Number((p.price * (1 - randInt(r, 0, 15) / 100)).toFixed(2));
      const line_total = Number((unit * qty).toFixed(2));
      lines.push({ id: itemId++, order_id: i, product_id: p.id, quantity: qty, unit_price: unit, line_total });
    }
    const subtotal = Number(lines.reduce((s, l) => s + l.line_total, 0).toFixed(2));
    const shipping_amount = subtotal >= 600 ? 0 : randInt(r, 7, 24);
    const tax_amount = Number((subtotal * 0.085).toFixed(2));
    const total_amount = Number((subtotal + shipping_amount + tax_amount).toFixed(2));
    orders.push({
      id: i,
      order_number: `ORD-${new Date(created_at.replace(" ", "T") + "Z").getUTCFullYear()}-${pad(i, 5)}`,
      customer_id: customer.id,
      status,
      payment_status,
      payment_method,
      subtotal,
      shipping_amount,
      tax_amount,
      total_amount,
      item_count: lines.reduce((s, l) => s + l.quantity, 0),
      created_at,
    });
    orderItems.push(...lines);
  }

  return { generatedAt: dateTimeDaysAgo(0), categories, products, customers, orders, orderItems };
}

async function createRuntime() {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
  });
  const db = new SQL.Database();
  const seed = buildSeed();

  db.run(`
    CREATE TABLE categories (id INTEGER PRIMARY KEY, code TEXT UNIQUE, name TEXT);
    CREATE TABLE products (
      id INTEGER PRIMARY KEY, category_id INTEGER, brand TEXT, name TEXT, sku TEXT UNIQUE, description TEXT,
      price REAL, cost REAL, stock INTEGER, rating_avg REAL, rating_count INTEGER, status TEXT, created_at TEXT
    );
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY, full_name TEXT, email TEXT UNIQUE, city TEXT, country_code TEXT, segment TEXT, created_at TEXT
    );
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY, order_number TEXT UNIQUE, customer_id INTEGER, status TEXT, payment_status TEXT,
      payment_method TEXT, subtotal REAL, shipping_amount REAL, tax_amount REAL, total_amount REAL, item_count INTEGER, created_at TEXT
    );
    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY, order_id INTEGER, product_id INTEGER, quantity INTEGER, unit_price REAL, line_total REAL
    );
  `);

  const insertAll = (table, rows) => {
    const keys = Object.keys(rows[0] ?? {});
    if (!keys.length) return;
    const stmt = db.prepare(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`);
    for (const row of rows) stmt.run(keys.map((k) => row[k]));
    stmt.free();
  };
  insertAll("categories", seed.categories);
  insertAll("products", seed.products);
  insertAll("customers", seed.customers);
  insertAll("orders", seed.orders);
  insertAll("order_items", seed.orderItems);

  return { db, seed };
}

async function getRuntime() {
  if (!runtimePromise) {
    runtimePromise = createRuntime().catch((error) => {
      runtimePromise = null;
      throw error;
    });
  }
  return runtimePromise;
}

function rows(db, sql, params = []) {
  const stmt = db.prepare(sql);
  try {
    if (params.length) stmt.bind(params);
    const out = [];
    while (stmt.step()) out.push(stmt.getAsObject());
    return out;
  } finally {
    stmt.free();
  }
}

function one(db, sql, params = []) {
  return rows(db, sql, params)[0] ?? null;
}

function int(v, d, max = 500) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(max, Math.floor(n)) : d;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function norm(v) {
  return String(v ?? "").trim().toLowerCase();
}

function cutoff(rangeDays = 30) {
  return dateTimeDaysAgo(Math.max(1, Math.min(365, int(rangeDays, 30, 365))));
}

function mapProduct(row) {
  return {
    id: Number(row.id), sku: String(row.sku), name: String(row.name), brand: String(row.brand),
    category: String(row.category_name ?? ""), categoryCode: String(row.category_code ?? ""),
    description: String(row.description ?? ""), price: Number(row.price), cost: Number(row.cost),
    stock: Number(row.stock), status: String(row.status), ratingAvg: Number(row.rating_avg), ratingCount: Number(row.rating_count),
    createdAt: String(row.created_at), unitsSold: Number(row.units_sold ?? 0), revenue: Number(row.revenue ?? 0),
  };
}

function mapOrder(row) {
  return {
    id: Number(row.id), orderNumber: String(row.order_number), customerId: Number(row.customer_id),
    customerName: String(row.customer_name ?? ""), customerEmail: String(row.customer_email ?? ""), city: String(row.customer_city ?? ""),
    status: String(row.status), paymentStatus: String(row.payment_status), paymentMethod: String(row.payment_method),
    subtotal: Number(row.subtotal), shippingAmount: Number(row.shipping_amount), taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount), itemCount: Number(row.item_count), createdAt: String(row.created_at),
  };
}

export async function getEcommerceDemoSeedSnapshot(payload = {}) {
  const { db, seed } = await getRuntime();
  const c = cutoff(payload.rangeDays ?? 30);
  const productLimit = Math.max(1, int(payload.productLimit, 40, 120));
  const orderLimit = Math.max(1, int(payload.recentOrdersLimit, 24, 120));
  const k = one(
    db,
    `SELECT
      (SELECT COUNT(*) FROM products) product_count,
      (SELECT COUNT(*) FROM categories) category_count,
      (SELECT COUNT(*) FROM customers) customer_count,
      (SELECT COUNT(*) FROM orders) order_count,
      (SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE payment_status='paid') lifetime_revenue,
      (SELECT COUNT(*) FROM orders WHERE created_at>=?) recent_order_count,
      (SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE created_at>=? AND payment_status='paid') recent_revenue`,
    [c, c]
  );
  const categories = rows(db, `SELECT c.id, c.code, c.name, COUNT(p.id) product_count FROM categories c LEFT JOIN products p ON p.category_id=c.id GROUP BY c.id ORDER BY c.name`)
    .map((r) => ({ id: Number(r.id), code: String(r.code), name: String(r.name), productCount: Number(r.product_count) }));
  const products = rows(
    db,
    `SELECT p.*, c.name category_name, c.code category_code, COALESCE(SUM(oi.quantity),0) units_sold, COALESCE(SUM(oi.line_total),0) revenue
     FROM products p JOIN categories c ON c.id=p.category_id
     LEFT JOIN order_items oi ON oi.product_id=p.id
     GROUP BY p.id ORDER BY revenue DESC, p.rating_avg DESC LIMIT ?`,
    [productLimit]
  ).map(mapProduct);
  const recentOrders = rows(
    db,
    `SELECT o.*, c.full_name customer_name, c.email customer_email, c.city customer_city
     FROM orders o JOIN customers c ON c.id=o.customer_id ORDER BY o.created_at DESC, o.id DESC LIMIT ?`,
    [orderLimit]
  ).map(mapOrder);
  return {
    ok: true, readOnly: true, source: "sqlite_seed_runtime", generatedAt: seed.generatedAt,
    kpis: {
      productCount: Number(k?.product_count ?? 0), categoryCount: Number(k?.category_count ?? 0), customerCount: Number(k?.customer_count ?? 0),
      orderCount: Number(k?.order_count ?? 0), lifetimeRevenue: Number(k?.lifetime_revenue ?? 0),
      recentOrderCount: Number(k?.recent_order_count ?? 0), recentRevenue: Number(k?.recent_revenue ?? 0), rangeDays: int(payload.rangeDays, 30, 365),
    },
    categories, products, recentOrders,
  };
}

export async function getEcommerceDemoOverview(payload = {}) {
  const { db, seed } = await getRuntime();
  const rangeDays = Math.max(1, int(payload.rangeDays, 30, 365));
  const c = cutoff(rangeDays);
  const overview = one(
    db,
    `SELECT COUNT(*) order_count, COALESCE(SUM(CASE WHEN payment_status='paid' THEN total_amount ELSE 0 END),0) revenue_paid,
            COALESCE(AVG(CASE WHEN payment_status='paid' THEN total_amount END),0) avg_order_value_paid,
            COALESCE(SUM(item_count),0) units_ordered
     FROM orders WHERE created_at>=?`,
    [c]
  );
  const statusBreakdown = rows(
    db,
    `SELECT status, COUNT(*) orders, COALESCE(SUM(total_amount),0) amount FROM orders WHERE created_at>=? GROUP BY status ORDER BY orders DESC`,
    [c]
  ).map((r) => ({ status: String(r.status), orders: Number(r.orders), amount: Number(r.amount) }));
  const topCategories = rows(
    db,
    `SELECT c.code category_code, c.name category_name, COALESCE(SUM(oi.quantity),0) units_sold, COALESCE(SUM(oi.line_total),0) revenue
     FROM categories c JOIN products p ON p.category_id=c.id JOIN order_items oi ON oi.product_id=p.id JOIN orders o ON o.id=oi.order_id
     WHERE o.created_at>=? AND o.payment_status='paid' GROUP BY c.id ORDER BY revenue DESC LIMIT 6`,
    [c]
  ).map((r) => ({ categoryCode: String(r.category_code), categoryName: String(r.category_name), unitsSold: Number(r.units_sold), revenue: Number(r.revenue) }));
  const topProducts = rows(
    db,
    `SELECT p.id,p.sku,p.name,p.brand,c.name category_name,COALESCE(SUM(oi.quantity),0) units_sold,COALESCE(SUM(oi.line_total),0) revenue
     FROM products p JOIN categories c ON c.id=p.category_id JOIN order_items oi ON oi.product_id=p.id JOIN orders o ON o.id=oi.order_id
     WHERE o.created_at>=? AND o.payment_status='paid' GROUP BY p.id ORDER BY revenue DESC LIMIT 8`,
    [c]
  ).map((r) => ({ id: Number(r.id), sku: String(r.sku), name: String(r.name), brand: String(r.brand), category: String(r.category_name), unitsSold: Number(r.units_sold), revenue: Number(r.revenue) }));
  return {
    ok: true, readOnly: true, source: "sqlite_seed_runtime", generatedAt: seed.generatedAt, rangeDays,
    overview: { orderCount: Number(overview?.order_count ?? 0), revenuePaid: Number(overview?.revenue_paid ?? 0), avgOrderValuePaid: Number(overview?.avg_order_value_paid ?? 0), unitsOrdered: Number(overview?.units_ordered ?? 0) },
    statusBreakdown, topCategories, topProducts,
  };
}

export async function listEcommerceDemoProducts(payload = {}) {
  const { db } = await getRuntime();
  const limit = Math.max(1, int(payload.limit, 24, 100));
  const offset = int(payload.offset, 0, 10000);
  const query = String(payload.query ?? "").trim().toLowerCase();
  const category = norm(payload.category);
  const lowStockOnly = payload.lowStockOnly === true;
  const minPrice = num(payload.minPrice);
  const maxPrice = num(payload.maxPrice);
  const sortBy = norm(payload.sortBy) || "name_asc";
  const where = [];
  const params = [];
  if (query) { where.push("(LOWER(p.name) LIKE ? OR LOWER(p.brand) LIKE ? OR LOWER(p.sku) LIKE ?)"); const q = `%${query}%`; params.push(q, q, q); }
  if (category) { where.push("(LOWER(c.code)=? OR LOWER(c.name)=?)"); params.push(category, category); }
  if (lowStockOnly) where.push("p.stock <= 10");
  if (minPrice !== null) { where.push("p.price >= ?"); params.push(minPrice); }
  if (maxPrice !== null) { where.push("p.price <= ?"); params.push(maxPrice); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql =
    sortBy === "price_desc" ? "p.price DESC" :
    sortBy === "price_asc" ? "p.price ASC" :
    sortBy === "stock_desc" ? "p.stock DESC, p.name ASC" :
    sortBy === "rating_desc" ? "p.rating_avg DESC, p.rating_count DESC" :
    sortBy === "revenue_desc" ? "revenue DESC, units_sold DESC" :
    "p.name ASC";
  const total = Number(one(db, `SELECT COUNT(*) total FROM products p JOIN categories c ON c.id=p.category_id ${whereSql}`, params)?.total ?? 0);
  const items = rows(
    db,
    `SELECT p.*, c.name category_name, c.code category_code, COALESCE(SUM(oi.quantity),0) units_sold, COALESCE(SUM(oi.line_total),0) revenue
     FROM products p JOIN categories c ON c.id=p.category_id LEFT JOIN order_items oi ON oi.product_id=p.id
     ${whereSql} GROUP BY p.id ORDER BY ${orderSql} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  ).map(mapProduct);
  return { ok: true, readOnly: true, total, filters: { query: query || null, category: category || null, lowStockOnly, minPrice, maxPrice, sortBy, limit, offset }, items };
}

export async function listEcommerceDemoOrders(payload = {}) {
  const { db } = await getRuntime();
  const limit = Math.max(1, int(payload.limit, 20, 100));
  const offset = int(payload.offset, 0, 10000);
  const status = norm(payload.status);
  const paymentStatus = norm(payload.paymentStatus);
  const customerQuery = String(payload.customerQuery ?? "").trim().toLowerCase();
  const minTotal = num(payload.minTotal);
  const maxTotal = num(payload.maxTotal);
  const rangeDays = payload.rangeDays == null ? null : Math.max(1, int(payload.rangeDays, 30, 365));
  const where = [];
  const params = [];
  if (status) { where.push("LOWER(o.status)=?"); params.push(status); }
  if (paymentStatus) { where.push("LOWER(o.payment_status)=?"); params.push(paymentStatus); }
  if (customerQuery) { where.push("(LOWER(c.full_name) LIKE ? OR LOWER(c.email) LIKE ? OR LOWER(o.order_number) LIKE ?)"); const q = `%${customerQuery}%`; params.push(q, q, q); }
  if (minTotal !== null) { where.push("o.total_amount >= ?"); params.push(minTotal); }
  if (maxTotal !== null) { where.push("o.total_amount <= ?"); params.push(maxTotal); }
  if (rangeDays !== null) { where.push("o.created_at >= ?"); params.push(cutoff(rangeDays)); }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = Number(one(db, `SELECT COUNT(*) total FROM orders o JOIN customers c ON c.id=o.customer_id ${whereSql}`, params)?.total ?? 0);
  const items = rows(
    db,
    `SELECT o.*, c.full_name customer_name, c.email customer_email, c.city customer_city
     FROM orders o JOIN customers c ON c.id=o.customer_id ${whereSql}
     ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  ).map(mapOrder);
  return { ok: true, readOnly: true, total, filters: { status: status || null, paymentStatus: paymentStatus || null, customerQuery: customerQuery || null, minTotal, maxTotal, rangeDays, limit, offset }, items };
}

export async function getEcommerceDemoSalesReport(payload = {}) {
  const { db } = await getRuntime();
  const rangeDays = Math.max(1, int(payload.rangeDays, 30, 365));
  const groupBy = norm(payload.groupBy) || "day";
  const c = cutoff(rangeDays);
  if (groupBy === "category") {
    const rowsOut = rows(
      db,
      `SELECT c.code category_code, c.name category_name, COUNT(DISTINCT o.id) order_count, COALESCE(SUM(oi.quantity),0) units_sold, COALESCE(SUM(oi.line_total),0) revenue
       FROM categories c JOIN products p ON p.category_id=c.id JOIN order_items oi ON oi.product_id=p.id JOIN orders o ON o.id=oi.order_id
       WHERE o.created_at>=? AND o.payment_status='paid' GROUP BY c.id ORDER BY revenue DESC`,
      [c]
    ).map((r) => ({ categoryCode: String(r.category_code), categoryName: String(r.category_name), orderCount: Number(r.order_count), unitsSold: Number(r.units_sold), revenue: Number(r.revenue) }));
    return { ok: true, readOnly: true, rangeDays, groupBy: "category", rows: rowsOut };
  }
  if (groupBy === "status") {
    const rowsOut = rows(
      db,
      `SELECT status, payment_status, COUNT(*) order_count, COALESCE(SUM(total_amount),0) total_amount
       FROM orders WHERE created_at>=? GROUP BY status, payment_status ORDER BY order_count DESC`,
      [c]
    ).map((r) => ({ status: String(r.status), paymentStatus: String(r.payment_status), orderCount: Number(r.order_count), totalAmount: Number(r.total_amount) }));
    return { ok: true, readOnly: true, rangeDays, groupBy: "status", rows: rowsOut };
  }
  const rowsOut = rows(
    db,
    `SELECT substr(created_at,1,10) day, COUNT(*) order_count,
            COALESCE(SUM(CASE WHEN payment_status='paid' THEN total_amount ELSE 0 END),0) revenue_paid,
            COALESCE(AVG(CASE WHEN payment_status='paid' THEN total_amount END),0) avg_order_value_paid
     FROM orders WHERE created_at>=? GROUP BY substr(created_at,1,10) ORDER BY day`,
    [c]
  ).map((r) => ({ day: String(r.day), orderCount: Number(r.order_count), revenuePaid: Number(r.revenue_paid), avgOrderValuePaid: Number(r.avg_order_value_paid) }));
  return { ok: true, readOnly: true, rangeDays, groupBy: "day", rows: rowsOut };
}
