export type EcommerceSuiteModuleSlug =
  | "ecommerce/product-sales"
  | "ecommerce/services"
  | "ecommerce/subscriptions-memberships"
  | "ecommerce/marketplace-multi-vendor"
  | "ecommerce/b2b"
  | "ecommerce/payments-checkout"
  | "ecommerce/logistics-fulfillment"
  | "ecommerce/customer-support"
  | "ecommerce/marketing-conversion"
  | "ecommerce/analytics-reporting"
  | "ecommerce/operations-administration"
  | "ecommerce/consumer-discovery"
  | "ecommerce/consumer-evaluation-trust"
  | "ecommerce/consumer-intent"
  | "ecommerce/consumer-checkout"
  | "ecommerce/consumer-post-purchase"
  | "ecommerce/consumer-returns-refunds"
  | "ecommerce/consumer-account-relationship"
  | "ecommerce/consumer-experience-security"
  | "ecommerce/admin-catalog-content"
  | "ecommerce/admin-checkout-payments-tax"
  | "ecommerce/admin-promotions-pricing"
  | "ecommerce/admin-orders-oms"
  | "ecommerce/admin-logistics-fulfillment"
  | "ecommerce/admin-cx-support"
  | "ecommerce/admin-customers-crm"
  | "ecommerce/admin-marketing-growth"
  | "ecommerce/admin-analytics-finance"
  | "ecommerce/admin-security-risk-compliance"
  | "ecommerce/admin-platform-technology"
  | "ecommerce/admin-operations-strategy";

export type EcommerceSuiteSeedValue = string | number | boolean | null;
export type EcommerceSuiteSeedRow = Record<string, EcommerceSuiteSeedValue>;

export type EcommerceSuiteActionConfig = {
  key: string;
  label: string;
  description: string;
  entityKey?: string;
  inputKeys?: string[];
};

export type EcommerceSuiteEntitySeed = {
  key: string;
  label: string;
  description: string;
  idPrefix: string;
  rows: EcommerceSuiteSeedRow[];
};

export type EcommerceSuiteModuleCatalogItem = {
  slug: EcommerceSuiteModuleSlug;
  title: string;
  description: string;
  audiences: Array<"consumer" | "admin">;
  entities: EcommerceSuiteEntitySeed[];
  actions: EcommerceSuiteActionConfig[];
  legacyStoreDemo?: boolean;
};

function entity(
  key: string,
  label: string,
  description: string,
  idPrefix: string,
  rows: EcommerceSuiteSeedRow[]
): EcommerceSuiteEntitySeed {
  return { key, label, description, idPrefix, rows };
}

function action(
  key: string,
  label: string,
  description: string,
  entityKey?: string,
  inputKeys?: string[]
): EcommerceSuiteActionConfig {
  return { key, label, description, entityKey, inputKeys };
}

export const ECOMMERCE_SUITE_MODULE_CATALOG: EcommerceSuiteModuleCatalogItem[] = [
  {
    slug: "ecommerce/product-sales",
    title: "Storefront & Purchases (Physical + Digital)",
    description:
      "Buyer storefront experience: catalog browsing, carts, purchases, and digital downloads.",
    audiences: [],
    legacyStoreDemo: true,
    entities: [
      entity("products", "Products", "Buyer product catalog rows for browsing and purchase.", "prod", [
        { id: "prod-1001", sku: "TSHIRT-BLK-M", name: "Navai T-Shirt Black M", price: 29.9, stock: 84, type: "physical", status: "active" },
        { id: "prod-1002", sku: "MUG-WHT-01", name: "Navai Coffee Mug", price: 14.5, stock: 120, type: "physical", status: "active" },
        { id: "prod-1003", sku: "EBOOK-AI-001", name: "AI Commerce Playbook (PDF)", price: 39, stock: 9999, type: "digital", status: "active" },
      ]),
      entity("checkoutCarts", "Checkout carts", "Buyer cart and purchase contexts.", "cart", [
        {
          id: "cart-1001",
          orderRef: "SO-2026-1001",
          customerEmail: "buyer.alpha@example.com",
          subtotal: 39,
          tax: 3.12,
          shipping: 0,
          total: 42.12,
          status: "pending",
        },
        {
          id: "cart-1002",
          orderRef: "SO-2026-1002",
          customerEmail: "buyer.beta@example.com",
          subtotal: 44.4,
          tax: 3.55,
          shipping: 5.99,
          total: 53.94,
          status: "completed",
        },
      ]),
      entity("digitalDownloads", "Digital downloads", "Digital delivery links and usage status.", "dl", [
        {
          id: "dl-1001",
          orderRef: "SO-2026-1002",
          sku: "EBOOK-AI-001",
          customerEmail: "buyer.beta@example.com",
          status: "ready",
          downloadsRemaining: 3,
        },
        {
          id: "dl-1002",
          orderRef: "SO-2026-0995",
          sku: "EBOOK-AI-001",
          customerEmail: "buyer.gamma@example.com",
          status: "downloaded",
          downloadsRemaining: 1,
        },
      ]),
    ],
    actions: [
      action(
        "open_store_demo_hint",
        "Use full store demo",
        "Reminder action for NAVAI to use the storefront/store demo page tools and UI."
      ),
      action(
        "issue_digital_download",
        "Issue digital download",
        "Create or refresh a digital download record for an order.",
        "digitalDownloads",
        ["orderRef", "sku", "customerEmail"]
      ),
      action(
        "consume_download",
        "Consume download",
        "Consume one digital download and update remaining downloads.",
        "digitalDownloads",
        ["recordId"]
      ),
    ],
  },
  {
    slug: "ecommerce/services",
    title: "Services (Bookings, Packages, Classes)",
    description: "Bookings, packages, classes, and service scheduling workflows.",
    audiences: [],
    entities: [
      entity("services", "Services", "Service catalog.", "svc", [
        { id: "svc-1001", serviceId: "CONS-60", name: "Consulting Session 60m", kind: "booking", price: 120, capacity: 8, status: "active" },
        { id: "svc-1002", serviceId: "WKSHOP-TEAM", name: "Team Workshop Pack", kind: "package", price: 790, capacity: 4, status: "active" },
        { id: "svc-1003", serviceId: "CLASS-SEO-01", name: "SEO Ecommerce Class", kind: "class", price: 49, capacity: 40, status: "active" },
      ]),
      entity("bookings", "Bookings", "Appointments and service reservations.", "book", [
        {
          id: "book-1001",
          serviceId: "svc-1001",
          customer: "Ana Perez",
          customerEmail: "ana.perez@example.com",
          date: "2026-02-26",
          status: "pending",
          note: "Needs checkout review",
        },
        {
          id: "book-1002",
          serviceId: "svc-1003",
          customer: "Luis Ramos",
          customerEmail: "luis.ramos@example.com",
          date: "2026-02-28",
          status: "confirmed",
          note: "Online class seat",
        },
        {
          id: "book-1003",
          serviceId: "svc-1002",
          customer: "Nova Retail",
          customerEmail: "ops@novaretail.example",
          date: "2026-03-03",
          status: "completed",
          note: "Onsite package completed",
        },
      ]),
    ],
    actions: [
      action("confirm_booking", "Confirm booking", "Set booking status to confirmed.", "bookings", ["recordId", "note"]),
      action("complete_booking", "Complete booking", "Set booking status to completed.", "bookings", ["recordId"]),
      action("cancel_booking", "Cancel booking", "Cancel a booking and free capacity.", "bookings", ["recordId"]),
      action(
        "reschedule_booking",
        "Reschedule booking",
        "Change booking date and set status to confirmed.",
        "bookings",
        ["recordId", "date"]
      ),
    ],
  },
  {
    slug: "ecommerce/subscriptions-memberships",
    title: "Subscriptions & Memberships",
    description: "Recurring billing, plans, renewals, and membership access tiers.",
    audiences: [],
    entities: [
      entity("plans", "Plans", "Recurring plans and levels.", "plan", [
        { id: "plan-1001", planId: "STARTER", name: "Starter", monthlyPrice: 19, yearlyPrice: 190, accessLevel: "basic", active: true },
        { id: "plan-1002", planId: "PRO", name: "Pro", monthlyPrice: 49, yearlyPrice: 490, accessLevel: "pro", active: true },
        { id: "plan-1003", planId: "TEAM", name: "Team", monthlyPrice: 129, yearlyPrice: 1290, accessLevel: "team", active: true },
      ]),
      entity("subscriptions", "Subscriptions", "Customer subscriptions and billing state.", "sub", [
        {
          id: "sub-1001",
          subscriptionId: "SUB-ALPHA",
          customer: "Ana Perez",
          customerEmail: "ana.perez@example.com",
          planId: "plan-1001",
          accessLevel: "basic",
          status: "active",
          nextBillingDate: "2026-03-10",
        },
        {
          id: "sub-1002",
          subscriptionId: "SUB-BETA",
          customer: "Luis Ramos",
          customerEmail: "luis.ramos@example.com",
          planId: "plan-1002",
          accessLevel: "pro",
          status: "past_due",
          nextBillingDate: "2026-02-20",
        },
      ]),
      entity("subscriptionInvoices", "Recurring invoices", "Invoices generated by subscription renewals.", "subinv", [
        { id: "subinv-1001", subscriptionId: "sub-1001", amount: 19, status: "paid", billingDate: "2026-02-10" },
        { id: "subinv-1002", subscriptionId: "sub-1002", amount: 49, status: "failed", billingDate: "2026-02-20" },
      ]),
    ],
    actions: [
      action("mark_past_due", "Mark past due", "Mark subscription as past due.", "subscriptions", ["recordId"]),
      action(
        "renew_subscription",
        "Renew subscription",
        "Advance billing and create invoice.",
        "subscriptions",
        ["recordId"]
      ),
      action(
        "cancel_subscription",
        "Cancel subscription",
        "Cancel a subscription and revoke recurring billing.",
        "subscriptions",
        ["recordId"]
      ),
      action(
        "upgrade_subscription",
        "Upgrade subscription",
        "Change subscription to a new plan and access level.",
        "subscriptions",
        ["recordId", "planId", "accessLevel"]
      ),
      action(
        "record_failed_renewal",
        "Record failed renewal",
        "Create failed recurring invoice and mark subscription past due.",
        "subscriptions",
        ["recordId"]
      ),
    ],
  },
  {
    slug: "ecommerce/marketplace-multi-vendor",
    title: "Marketplace / Multi-vendor",
    description: "Vendors, commissions, settlements, and split order ownership.",
    audiences: [],
    entities: [
      entity("vendors", "Vendors", "Marketplace sellers.", "vendor", [
        {
          id: "vendor-1001",
          vendorId: "VEND-ALPHA",
          name: "Alpha Gadgets",
          status: "pending",
          commissionPct: 12,
          payoutMethod: "bank_transfer",
        },
        {
          id: "vendor-1002",
          vendorId: "VEND-BETA",
          name: "Beta Studio",
          status: "active",
          commissionPct: 15,
          payoutMethod: "wallet",
        },
        {
          id: "vendor-1003",
          vendorId: "VEND-GAMMA",
          name: "Gamma Imports",
          status: "suspended",
          commissionPct: 10,
          payoutMethod: "bank_transfer",
        },
      ]),
      entity("vendorOrders", "Vendor orders", "Orders split by vendor.", "vorder", [
        {
          id: "vorder-1001",
          vendorId: "vendor-1002",
          orderNumber: "MP-2026-1001",
          grossAmount: 240,
          commissionAmount: 36,
          status: "paid_out",
        },
        {
          id: "vorder-1002",
          vendorId: "vendor-1001",
          orderNumber: "MP-2026-1002",
          grossAmount: 129,
          commissionAmount: 15.48,
          status: "pending_settlement",
        },
      ]),
      entity("settlements", "Settlements", "Vendor payout settlement batches.", "settlement", [
        { id: "settlement-1001", vendorId: "vendor-1002", amount: 204, scheduledDate: "2026-02-25", status: "pending" },
        { id: "settlement-1002", vendorId: "vendor-1003", amount: 88.7, scheduledDate: "2026-02-20", status: "paid" },
      ]),
    ],
    actions: [
      action("approve_vendor", "Approve vendor", "Approve a pending vendor for selling.", "vendors", ["recordId"]),
      action("suspend_vendor", "Suspend vendor", "Suspend vendor and pause operations.", "vendors", ["recordId"]),
      action("settle_vendor", "Mark settlement paid", "Mark vendor settlement as paid.", "settlements", ["recordId"]),
      action(
        "create_settlement",
        "Create settlement batch",
        "Create a pending settlement for a vendor.",
        "settlements",
        ["vendorId", "amount", "scheduledDate"]
      ),
    ],
  },
  {
    slug: "ecommerce/b2b",
    title: "B2B Commerce",
    description: "Quotes, customer pricing, volume orders, and invoice workflows.",
    audiences: [],
    entities: [
      entity("b2bAccounts", "B2B accounts", "Business customers and pricing tiers.", "acct", [
        {
          id: "acct-1001",
          accountId: "ACME-001",
          company: "Acme Stores",
          pricingTier: "gold",
          creditLimit: 50000,
          taxExempt: true,
          status: "active",
        },
        {
          id: "acct-1002",
          accountId: "NOVA-002",
          company: "Nova Retail",
          pricingTier: "silver",
          creditLimit: 20000,
          taxExempt: false,
          status: "active",
        },
      ]),
      entity("quotes", "Quotes", "B2B quotes before order conversion.", "quote", [
        { id: "quote-1001", quoteId: "Q-1001", accountId: "acct-1001", sku: "TSHIRT-BLK-M", quantity: 300, unitPrice: 19.5, status: "pending" },
        { id: "quote-1002", quoteId: "Q-1002", accountId: "acct-1002", sku: "MUG-WHT-01", quantity: 150, unitPrice: 9.8, status: "approved" },
      ]),
      entity("b2bOrders", "B2B orders", "Approved quotes converted into orders.", "b2b-order", [
        {
          id: "b2b-order-1001",
          quoteId: "quote-1002",
          accountId: "acct-1002",
          total: 1470,
          status: "pending",
          invoiceDueDate: "2026-03-05",
        },
      ]),
      entity("b2bInvoices", "B2B invoices", "Invoices issued for B2B orders.", "b2b-inv", [
        { id: "b2b-inv-1001", orderId: "b2b-order-1001", invoiceNumber: "INV-B2B-1001", amount: 1470, status: "sent", dueDate: "2026-03-05" },
      ]),
    ],
    actions: [
      action("reject_quote", "Reject quote", "Reject quote.", "quotes", ["recordId"]),
      action("approve_quote", "Approve quote", "Approve quote and create B2B order.", "quotes", ["recordId"]),
      action("issue_b2b_invoice", "Issue B2B invoice", "Create invoice for a B2B order.", "b2bInvoices", ["recordId"]),
      action(
        "mark_b2b_order_fulfilled",
        "Mark B2B order fulfilled",
        "Set B2B order status to fulfilled.",
        "b2bOrders",
        ["recordId"]
      ),
    ],
  },
  {
    slug: "ecommerce/payments-checkout",
    title: "Payments & Checkout",
    description: "Gateways, antifraud review, wallets, installments, and taxes in checkout.",
    audiences: [],
    entities: [
      entity("checkouts", "Checkout sessions", "Checkout sessions and totals.", "checkout", [
        {
          id: "checkout-1001",
          checkoutId: "CHK-1001",
          customerEmail: "ana.perez@example.com",
          cartValue: 129,
          subtotal: 119,
          tax: 9.52,
          shipping: 5.99,
          wallet: "main_wallet",
          installments: 1,
          status: "open",
        },
        {
          id: "checkout-1002",
          checkoutId: "CHK-1002",
          customerEmail: "buyer.beta@example.com",
          cartValue: 42.12,
          subtotal: 39,
          tax: 3.12,
          shipping: 0,
          wallet: "card",
          installments: 1,
          status: "completed",
        },
      ]),
      entity("paymentAttempts", "Payment attempts", "Gateway attempts with fraud outcomes.", "pay", [
        {
          id: "pay-1001",
          paymentAttemptId: "PAY-1001",
          checkoutId: "checkout-1001",
          gateway: "stripe",
          amount: 134.51,
          status: "authorized",
          fraudDecision: "approve",
          customerEmail: "ana.perez@example.com",
        },
        {
          id: "pay-1002",
          paymentAttemptId: "PAY-1002",
          checkoutId: "checkout-1001",
          gateway: "adyen",
          amount: 134.51,
          status: "review",
          fraudDecision: "review",
          customerEmail: "ana.perez@example.com",
        },
      ]),
      entity(
        "fraudCases",
        "Fraud review cases",
        "Antifraud manual review decisions linked to payment attempts.",
        "fraud",
        [
          { id: "fraud-1001", paymentAttemptId: "pay-1002", score: 87, decision: "review", status: "open", agent: "risk.team.01" },
          { id: "fraud-1002", paymentAttemptId: "pay-1001", score: 24, decision: "approve", status: "closed", agent: "risk.team.02" },
        ]
      ),
      entity("paymentRefunds", "Payment refunds", "Refund transactions created after capture.", "pay-refund", [
        { id: "pay-refund-1001", paymentAttemptId: "pay-1001", amount: 14.5, status: "created", createdDate: "2026-02-22" },
      ]),
    ],
    actions: [
      action("send_to_review", "Send to review", "Flag payment attempt for manual review.", "paymentAttempts", ["recordId"]),
      action("capture_payment", "Capture payment", "Capture payment and complete checkout.", "paymentAttempts", ["recordId"]),
      action(
        "fail_payment",
        "Fail payment",
        "Mark payment attempt as failed and reopen checkout.",
        "paymentAttempts",
        ["recordId"]
      ),
      action(
        "approve_fraud_case",
        "Approve fraud case",
        "Approve manual fraud case and set payment review to approve.",
        "fraudCases",
        ["recordId"]
      ),
      action(
        "create_payment_refund",
        "Create payment refund",
        "Create refund record and mark payment refunded.",
        "paymentRefunds",
        ["recordId", "amount"]
      ),
    ],
  },
  {
    slug: "ecommerce/logistics-fulfillment",
    title: "Logistics & Fulfillment",
    description: "Inventory movements, shipments, tracking, and returns (RMA).",
    audiences: [],
    entities: [
      entity("inventoryMovements", "Inventory movements", "Warehouse inventory movement log.", "inv", [
        { id: "inv-1001", sku: "TSHIRT-BLK-M", warehouse: "MX-CEN-01", qty: -2, type: "sale", status: "posted", date: "2026-02-23" },
        { id: "inv-1002", sku: "MUG-WHT-01", warehouse: "MX-CEN-01", qty: 40, type: "restock", status: "posted", date: "2026-02-22" },
        { id: "inv-1003", sku: "TSHIRT-BLK-M", warehouse: "US-TX-02", qty: -10, type: "transfer", status: "in_transit", date: "2026-02-24" },
      ]),
      entity("shipments", "Shipments", "Shipment records and tracking state.", "ship", [
        {
          id: "ship-1001",
          orderRef: "SO-2026-1001",
          carrier: "dhl",
          trackingCode: "",
          warehouse: "MX-CEN-01",
          eta: "2026-02-27",
          status: "ready",
        },
        {
          id: "ship-1002",
          orderRef: "SO-2026-0999",
          carrier: "fedex",
          trackingCode: "TRK-9A1BC2D3",
          warehouse: "US-TX-02",
          eta: "2026-02-24",
          status: "in_transit",
        },
      ]),
      entity("returns", "Returns / RMA", "Returns and RMA cases.", "rma", [
        { id: "rma-1001", orderRef: "SO-2026-0984", reason: "damaged", refundAmount: 29.9, status: "requested" },
        { id: "rma-1002", orderRef: "SO-2026-0970", reason: "wrong_size", refundAmount: 29.9, status: "approved" },
      ]),
    ],
    actions: [
      action("ship_order", "Ship order", "Set shipment to in_transit and assign tracking.", "shipments", ["recordId", "trackingCode"]),
      action("deliver_shipment", "Deliver shipment", "Mark shipment as delivered.", "shipments", ["recordId"]),
      action("create_rma", "Create RMA", "Create a return request.", "returns", ["orderRef", "reason", "refundAmount"]),
      action("approve_rma", "Approve RMA", "Approve return request.", "returns", ["recordId"]),
      action("refund_rma", "Refund RMA", "Mark return as refunded.", "returns", ["recordId"]),
    ],
  },
  {
    slug: "ecommerce/customer-support",
    title: "Customer Support",
    description: "Tickets, post-sale chat, warranties, and refunds.",
    audiences: [],
    entities: [
      entity("tickets", "Support tickets", "Customer support cases.", "ticket", [
        {
          id: "ticket-1001",
          ticketId: "SUP-1001",
          customer: "Ana Perez",
          customerEmail: "ana.perez@example.com",
          subject: "Order delayed",
          priority: "normal",
          agent: "sofia",
          status: "open",
        },
        {
          id: "ticket-1002",
          ticketId: "SUP-1002",
          customer: "Luis Ramos",
          customerEmail: "luis.ramos@example.com",
          subject: "Download link issue",
          priority: "high",
          agent: "marco",
          status: "pending",
        },
      ]),
      entity("chatSessions", "Chat sessions", "Customer support chat and post-sale interactions.", "chat", [
        { id: "chat-1001", customer: "Ana Perez", agent: "sofia", topic: "shipping", status: "open" },
        { id: "chat-1002", customer: "Luis Ramos", agent: "marco", topic: "refund", status: "closed" },
      ]),
      entity("refundCases", "Refund cases", "Refund workflow cases.", "refund", [
        { id: "refund-1001", orderRef: "SO-2026-0984", amount: 29.9, reason: "damaged", status: "approved", paymentRef: "" },
        { id: "refund-1002", orderRef: "SO-2026-0977", amount: 14.5, reason: "duplicate", status: "paid", paymentRef: "RF-2026-2001" },
      ]),
      entity("warranties", "Warranty claims", "Warranty claim pipeline.", "war", [
        { id: "war-1001", orderRef: "SO-2026-0901", sku: "MUG-WHT-01", reason: "crack", status: "pending" },
        { id: "war-1002", orderRef: "SO-2026-0888", sku: "TSHIRT-BLK-M", reason: "stitching", status: "approved" },
      ]),
    ],
    actions: [
      action("resolve_ticket", "Resolve ticket", "Resolve support ticket.", "tickets", ["recordId"]),
      action("escalate_ticket", "Escalate ticket", "Escalate ticket priority to urgent.", "tickets", ["recordId"]),
      action("approve_refund_case", "Approve refund", "Approve and pay a refund case.", "refundCases", ["recordId", "paymentRef"]),
      action("approve_warranty", "Approve warranty", "Approve warranty claim.", "warranties", ["recordId"]),
      action("close_chat_session", "Close chat session", "Close a support chat session.", "chatSessions", ["recordId"]),
    ],
  },
  {
    slug: "ecommerce/marketing-conversion",
    title: "Marketing & Conversion",
    description: "Coupons, campaigns, upsells/cross-sells, and abandoned carts.",
    audiences: [],
    entities: [
      entity("campaigns", "Campaigns", "Email and onsite campaigns.", "camp", [
        { id: "camp-1001", name: "Weekend Retargeting", channel: "email", budget: 1200, status: "draft" },
        { id: "camp-1002", name: "Homepage Upsell Banner", channel: "onsite", budget: 450, status: "running" },
      ]),
      entity("coupons", "Coupons", "Discount codes and usage limits.", "coupon", [
        { id: "coupon-1001", code: "WELCOME10", maxUses: 5000, status: "active" },
        { id: "coupon-1002", code: "WINBACK20", maxUses: 800, status: "paused" },
      ]),
      entity("abandonedCarts", "Abandoned carts", "Recovery opportunities and status.", "acart", [
        {
          id: "acart-1001",
          customerEmail: "buyer.alpha@example.com",
          cartValue: 89.4,
          couponCode: "",
          status: "open",
        },
        {
          id: "acart-1002",
          customerEmail: "buyer.beta@example.com",
          cartValue: 42.12,
          couponCode: "WELCOME10",
          status: "email_sent",
        },
      ]),
    ],
    actions: [
      action("launch_campaign", "Launch campaign", "Set campaign to running.", "campaigns", ["recordId"]),
      action("schedule_campaign", "Schedule campaign", "Set campaign to scheduled.", "campaigns", ["recordId"]),
      action("pause_coupon", "Pause coupon", "Pause coupon to stop redemption.", "coupons", ["recordId"]),
      action("recover_cart", "Recover cart", "Mark abandoned cart as recovered.", "abandonedCarts", ["recordId", "couponCode"]),
      action(
        "send_cart_recovery_email",
        "Send recovery email",
        "Mark abandoned cart as email_sent.",
        "abandonedCarts",
        ["recordId", "couponCode"]
      ),
    ],
  },
  {
    slug: "ecommerce/analytics-reporting",
    title: "Analytics & Reporting",
    description: "Sales, LTV/CAC, cohorts, attribution, and report snapshots.",
    audiences: [],
    entities: [
      entity("metricSnapshots", "Metric snapshots", "Daily analytics metrics.", "metric", [
        { id: "metric-1001", date: "2026-02-22", sales: 18450, ltv: 210, cac: 32, conversionRate: 2.8 },
        { id: "metric-1002", date: "2026-02-23", sales: 20120, ltv: 214, cac: 31.5, conversionRate: 3.1 },
      ]),
      entity("cohorts", "Cohorts", "Retention and revenue cohorts.", "cohort", [
        { id: "cohort-2025-11", cohortMonth: "2025-11", users: 420, m1Retention: 58, m3Retention: 34, revenue: 68400 },
        { id: "cohort-2025-12", cohortMonth: "2025-12", users: 510, m1Retention: 62, m3Retention: 37, revenue: 79200 },
      ]),
      entity("attributionModels", "Attribution models", "Attribution snapshots by model and channel.", "attrib", [
        { id: "attrib-1001", model: "last_click", channel: "paid_social", conversions: 124, revenue: 15400 },
        { id: "attrib-1002", model: "data_driven", channel: "email", conversions: 93, revenue: 11820 },
      ]),
      entity("reportExports", "Report exports", "Generated reports for stakeholders.", "report", [
        { id: "report-1001", name: "Executive Weekly", type: "pdf", owner: "growth.lead", status: "ready", generatedDate: "2026-02-23" },
        { id: "report-1002", name: "Finance Daily", type: "csv", owner: "finance.ops", status: "queued", generatedDate: "2026-02-24" },
      ]),
    ],
    actions: [
      action("generate_report_export", "Generate report export", "Create report export row.", "reportExports", ["name", "type"]),
      action(
        "record_metric_snapshot",
        "Record metric snapshot",
        "Create new daily metric snapshot row.",
        "metricSnapshots",
        ["date", "sales", "ltv", "cac", "conversionRate"]
      ),
      action("queue_report_export", "Queue report export", "Create queued report export row.", "reportExports", ["name", "type"]),
    ],
  },
  {
    slug: "ecommerce/operations-administration",
    title: "Operations & Administration",
    description: "ERP/accounting sync, e-invoicing, CRM records, and back-office operations.",
    audiences: [],
    entities: [
      entity("syncTasks", "ERP/accounting sync tasks", "Back-office sync jobs.", "sync", [
        {
          id: "sync-1001",
          system: "erp",
          entity: "orders",
          owner: "ops.ana",
          scheduledDate: "2026-02-24",
          status: "pending",
        },
        {
          id: "sync-1002",
          system: "accounting",
          entity: "payments",
          owner: "fin.luis",
          scheduledDate: "2026-02-23",
          status: "completed",
        },
      ]),
      entity("electronicInvoices", "Electronic invoices", "Tax authority submission workflow.", "einv", [
        {
          id: "einv-1001",
          invoiceNumber: "FE-2026-0101",
          customer: "Acme Stores",
          total: 1470,
          authorityRef: "",
          generatedDate: "2026-02-24",
          status: "generated",
        },
        {
          id: "einv-1002",
          invoiceNumber: "FE-2026-0100",
          customer: "Nova Retail",
          total: 980,
          authorityRef: "SAT-ACK-9981",
          generatedDate: "2026-02-23",
          status: "submitted",
        },
      ]),
      entity("crmContacts", "CRM contacts", "CRM contact/account records.", "crm", [
        {
          id: "crm-1001",
          company: "Acme Stores",
          customerEmail: "procurement@acme.example",
          stage: "lead",
          owner: "sales.maria",
          status: "active",
        },
        {
          id: "crm-1002",
          company: "Nova Retail",
          customerEmail: "ops@novaretail.example",
          stage: "qualified",
          owner: "sales.maria",
          status: "active",
        },
      ]),
      entity("backofficeTasks", "Back-office tasks", "Administrative operation tasks and assignments.", "bo", [
        {
          id: "bo-1001",
          title: "Reconcile weekend payments",
          owner: "fin.luis",
          priority: "high",
          dueDate: "2026-02-25",
          status: "pending",
          note: "Match PSP settlement files",
        },
        {
          id: "bo-1002",
          title: "CRM lead enrichment",
          owner: "ops.ana",
          priority: "normal",
          dueDate: "2026-02-26",
          status: "in_progress",
          note: "Complete firmographic fields",
        },
      ]),
    ],
    actions: [
      action("complete_sync_task", "Complete sync task", "Mark sync task as completed.", "syncTasks", ["recordId"]),
      action("fail_sync_task", "Fail sync task", "Mark sync task as failed.", "syncTasks", ["recordId"]),
      action("submit_einvoice", "Submit e-invoice", "Submit e-invoice to authority.", "electronicInvoices", ["recordId", "authorityRef"]),
      action("accept_einvoice", "Accept e-invoice", "Mark e-invoice accepted by authority.", "electronicInvoices", ["recordId", "authorityRef"]),
      action(
        "promote_crm_contact",
        "Promote CRM contact",
        "Promote CRM contact stage (lead->qualified->customer).",
        "crmContacts",
        ["recordId"]
      ),
      action(
        "complete_backoffice_task",
        "Complete back-office task",
        "Complete administrative task.",
        "backofficeTasks",
        ["recordId"]
      ),
    ],
  },
  {
    slug: "ecommerce/consumer-discovery",
    title: "Descubrimiento",
    description: "Home, categories, search, filters, recommendations, and discovery content for shoppers.",
    audiences: ["consumer"],
    entities: [
      entity("discoveryCatalog", "Discovery catalog", "Home, categories, collections, search, and filter presets.", "cdisc", [
        { id: "cdisc-1001", section: "home", category: "electronics", collection: "new_arrivals", searchQuery: "wireless headphones", filters: "price<150,color:black", status: "active" },
        { id: "cdisc-1002", section: "category", category: "fashion", collection: "best_sellers", searchQuery: "running shoes", filters: "size:42,brand:navai", status: "active" },
      ]),
      entity("discoveryPersonalization", "Discovery personalization", "Recommendations and personalized blocks ('for you').", "cpers", [
        { id: "cpers-1001", customerEmail: "ana.perez@example.com", widget: "for_you", algorithm: "collaborative", impressions: 182, clicks: 26, status: "active" },
        { id: "cpers-1002", customerEmail: "luis.ramos@example.com", widget: "recently_viewed", algorithm: "behavioral", impressions: 94, clicks: 11, status: "active" },
      ]),
      entity("discoveryContent", "Discovery content", "Blog, guides, videos, comparisons, and UGC content assets.", "ccont", [
        { id: "ccont-1001", type: "guide", title: "How to choose a gaming laptop", channel: "blog", status: "published", views: 5400 },
        { id: "ccont-1002", type: "ugc_video", title: "Customer unboxing short", channel: "video", status: "published", views: 12800 },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/consumer-evaluation-trust",
    title: "Evaluacion y confianza",
    description: "Product detail evaluation, reviews/Q&A, shipping info, policies, and trust signals.",
    audiences: ["consumer"],
    entities: [
      entity("productEvaluationCards", "Product evaluation cards", "Product page details: media, price, variants, stock, and warranty.", "ceval", [
        { id: "ceval-1001", sku: "LAPTOP-G15", mediaCount: 9, hasVideo: true, variants: "ram,storage,color", stock: 12, warranty: "12m", price: 1199, status: "published" },
        { id: "ceval-1002", sku: "HEADSET-X2", mediaCount: 6, hasVideo: false, variants: "color", stock: 48, warranty: "6m", price: 89, status: "published" },
      ]),
      entity("socialProofAndQna", "Social proof and Q&A", "Reviews, ratings, customer questions, and answers.", "cproof", [
        { id: "cproof-1001", sku: "LAPTOP-G15", ratingAvg: 4.7, ratingCount: 324, questionsOpen: 3, answersPublished: 22, status: "healthy" },
        { id: "cproof-1002", sku: "HEADSET-X2", ratingAvg: 4.3, ratingCount: 191, questionsOpen: 1, answersPublished: 17, status: "healthy" },
      ]),
      entity("shippingPolicyTrust", "Shipping, policies, and trust", "Shipping times/costs, policies, payment badges, and support trust signals.", "ctrust", [
        { id: "ctrust-1001", region: "MX-CDMX", eta: "24-48h", shippingCost: 4.99, returnsPolicyDays: 30, trackingAvailable: true, trustBadges: "visa,mastercard,ssl", status: "active" },
        { id: "ctrust-1002", region: "CO-BOG", eta: "2-4d", shippingCost: 6.5, returnsPolicyDays: 15, trackingAvailable: true, trustBadges: "pse,wompi,ssl", status: "active" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/consumer-intent",
    title: "Intencion y decision",
    description: "Wishlist, compare, saved carts, visible coupons, bundles, and cross-sell suggestions.",
    audiences: ["consumer"],
    entities: [
      entity("wishlists", "Wishlists", "Wishlist and favorites saved by shoppers.", "cwish", [
        { id: "cwish-1001", customerEmail: "ana.perez@example.com", name: "Birthday list", items: 6, status: "active" },
        { id: "cwish-1002", customerEmail: "luis.ramos@example.com", name: "Office setup", items: 4, status: "active" },
      ]),
      entity("comparisons", "Comparisons", "Product comparison sessions and selected attributes.", "ccmp", [
        { id: "ccmp-1001", customerEmail: "ana.perez@example.com", category: "laptops", items: 3, attributes: "cpu,ram,price,screen", status: "open" },
        { id: "ccmp-1002", customerEmail: "luis.ramos@example.com", category: "headphones", items: 2, attributes: "battery,anc,price", status: "open" },
      ]),
      entity("savedCartsAndOffers", "Saved carts and offers", "Saved carts, visible coupons, bundles, and 'buy with' suggestions.", "cintent", [
        { id: "cintent-1001", customerEmail: "ana.perez@example.com", cartValue: 249, couponVisible: "WELCOME10", bundleOffer: "mouse+keyboard", buyWith: "warranty", status: "saved" },
        { id: "cintent-1002", customerEmail: "luis.ramos@example.com", cartValue: 89, couponVisible: "FREESHIP", bundleOffer: "case+screenprotector", buyWith: "charger", status: "saved" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/consumer-checkout",
    title: "Pago y checkout",
    description: "Cart, delivery details, shipping methods, taxes/totals, payment methods, and confirmation.",
    audiences: ["consumer"],
    entities: [
      entity("checkoutCartFlow", "Checkout cart flow", "Cart quantities, variants, removal, and suggested add-ons.", "ccart", [
        { id: "ccart-1001", customerEmail: "ana.perez@example.com", items: 2, variantsValid: true, suggestions: "mousepad,warranty", subtotal: 1299, status: "active" },
        { id: "ccart-1002", customerEmail: "luis.ramos@example.com", items: 1, variantsValid: true, suggestions: "cable,case", subtotal: 89, status: "active" },
      ]),
      entity("checkoutDelivery", "Checkout delivery", "Address, contact, delivery instructions, and shipping method selection.", "cdel", [
        { id: "cdel-1001", customerEmail: "ana.perez@example.com", city: "Bogota", method: "express", pickup: false, instructions: "Porteria torre B", status: "confirmed" },
        { id: "cdel-1002", customerEmail: "luis.ramos@example.com", city: "Medellin", method: "pickup", pickup: true, instructions: "Retiro sabado", status: "confirmed" },
      ]),
      entity("checkoutPayments", "Checkout payments", "Taxes/total, payment method, installments, and 3DS/OTP authentication state.", "cpay", [
        { id: "cpay-1001", customerEmail: "ana.perez@example.com", tax: 247, total: 1551, paymentMethod: "card", installments: 6, authStep: "3ds_ok", status: "paid" },
        { id: "cpay-1002", customerEmail: "luis.ramos@example.com", tax: 16.91, total: 105.91, paymentMethod: "pse", installments: 1, authStep: "otp_ok", status: "paid" },
      ]),
      entity("checkoutConfirmations", "Checkout confirmations", "Order number and checkout confirmation summary.", "cconf", [
        { id: "cconf-1001", orderNumber: "SO-2026-3001", customerEmail: "ana.perez@example.com", items: 2, total: 1551, status: "confirmed" },
        { id: "cconf-1002", orderNumber: "SO-2026-3002", customerEmail: "luis.ramos@example.com", items: 1, total: 105.91, status: "confirmed" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/consumer-post-purchase",
    title: "Postcompra",
    description: "Order notifications, tracking, receipts/invoices, and support channels after checkout.",
    audiences: ["consumer"],
    entities: [
      entity("postPurchaseNotifications", "Post-purchase notifications", "Email/WhatsApp notifications for order lifecycle.", "cpn", [
        { id: "cpn-1001", orderNumber: "SO-2026-3001", channel: "email", event: "confirmed", sentAt: "2026-02-24T10:10:00Z", status: "sent" },
        { id: "cpn-1002", orderNumber: "SO-2026-3001", channel: "whatsapp", event: "shipped", sentAt: "2026-02-24T18:05:00Z", status: "sent" },
      ]),
      entity("orderTrackingConsumer", "Order tracking", "Tracking and current order delivery status for customers.", "ctrk", [
        { id: "ctrk-1001", orderNumber: "SO-2026-3001", carrier: "servientrega", trackingCode: "SV-900110", status: "in_transit", eta: "2026-02-26" },
        { id: "ctrk-1002", orderNumber: "SO-2026-3002", carrier: "pickup", trackingCode: "STORE-PICK-02", status: "ready_pickup", eta: "2026-02-25" },
      ]),
      entity("postPurchaseDocumentsSupport", "Documents and support channels", "Receipts/invoices and available support contact channels.", "cpdoc", [
        { id: "cpdoc-1001", orderNumber: "SO-2026-3001", receipt: true, invoice: true, supportChannel: "chat", helpCenter: true, status: "available" },
        { id: "cpdoc-1002", orderNumber: "SO-2026-3002", receipt: true, invoice: false, supportChannel: "whatsapp", helpCenter: true, status: "available" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/consumer-returns-refunds",
    title: "Devoluciones, cambios y reembolsos",
    description: "RMA requests, reverse logistics, refunds/exchanges, and warranty/technical support.",
    audiences: ["consumer"],
    entities: [
      entity("consumerRmaRequests", "Consumer RMA requests", "RMA requests with reason, evidence, and current status.", "crma", [
        { id: "crma-1001", orderNumber: "SO-2026-2991", reason: "damaged", evidence: "photo_3", status: "requested", amount: 89.9 },
        { id: "crma-1002", orderNumber: "SO-2026-2980", reason: "wrong_size", evidence: "photo_1", status: "approved", amount: 29.9 },
      ]),
      entity("consumerReverseLogistics", "Consumer reverse logistics", "Pickup or drop-off return logistics tracking.", "crlog", [
        { id: "crlog-1001", rmaId: "crma-1001", mode: "pickup", carrier: "coordinadora", trackingCode: "RET-1102", status: "scheduled" },
        { id: "crlog-1002", rmaId: "crma-1002", mode: "dropoff", carrier: "store_point", trackingCode: "DROP-2201", status: "received" },
      ]),
      entity("consumerRefundResolutions", "Consumer refund resolutions", "Refunds (partial/total), store credits, or exchanges.", "cref", [
        { id: "cref-1001", rmaId: "crma-1001", resolution: "refund_total", amount: 89.9, creditIssued: false, status: "processing" },
        { id: "cref-1002", rmaId: "crma-1002", resolution: "exchange", amount: 0, creditIssued: false, status: "completed" },
      ]),
      entity("consumerWarrantySupport", "Consumer warranty support", "Warranty and technical support follow-up cases.", "cwarx", [
        { id: "cwarx-1001", orderNumber: "SO-2026-2870", sku: "LAPTOP-G15", issue: "battery", channel: "ticket", status: "diagnosis" },
        { id: "cwarx-1002", orderNumber: "SO-2026-2802", sku: "HEADSET-X2", issue: "mic", channel: "whatsapp", status: "resolved" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/consumer-account-relationship",
    title: "Cuenta y relacion",
    description: "Profile, addresses, saved payment methods, order history, memberships, loyalty, referrals, and preferences.",
    audiences: ["consumer"],
    entities: [
      entity("consumerProfiles", "Consumer profiles", "Customer profile and account preferences.", "cprof", [
        { id: "cprof-1001", customerEmail: "ana.perez@example.com", fullName: "Ana Perez", twoFactorEnabled: false, language: "es", status: "active" },
        { id: "cprof-1002", customerEmail: "luis.ramos@example.com", fullName: "Luis Ramos", twoFactorEnabled: true, language: "es", status: "active" },
      ]),
      entity("consumerAddressesPayments", "Addresses and payment methods", "Saved addresses and saved payment methods (tokenized).", "caddr", [
        { id: "caddr-1001", customerEmail: "ana.perez@example.com", addressCount: 2, savedPaymentMethods: 1, defaultCity: "Bogota", status: "active" },
        { id: "caddr-1002", customerEmail: "luis.ramos@example.com", addressCount: 1, savedPaymentMethods: 2, defaultCity: "Medellin", status: "active" },
      ]),
      entity("consumerOrderHistory", "Consumer order history", "Order history summary and repeat-purchase stats.", "chist", [
        { id: "chist-1001", customerEmail: "ana.perez@example.com", orders: 14, lastOrder: "2026-02-24", aov: 210.4, status: "vip" },
        { id: "chist-1002", customerEmail: "luis.ramos@example.com", orders: 5, lastOrder: "2026-02-24", aov: 79.2, status: "active" },
      ]),
      entity("consumerLoyaltyMemberships", "Loyalty and memberships", "Points, rewards, referrals, and memberships/subscriptions status.", "cloy", [
        { id: "cloy-1001", customerEmail: "ana.perez@example.com", points: 4200, tier: "gold", referrals: 3, membership: "plus", status: "active" },
        { id: "cloy-1002", customerEmail: "luis.ramos@example.com", points: 860, tier: "silver", referrals: 1, membership: "none", status: "active" },
      ]),
      entity("consumerCommunicationPreferences", "Communication preferences", "Consent and channel preferences for communications.", "ccons", [
        { id: "ccons-1001", customerEmail: "ana.perez@example.com", emailMarketing: true, smsMarketing: false, whatsappMarketing: true, consentVersion: "2026-01", status: "granted" },
        { id: "ccons-1002", customerEmail: "luis.ramos@example.com", emailMarketing: true, smsMarketing: true, whatsappMarketing: false, consentVersion: "2025-11", status: "granted" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/consumer-experience-security",
    title: "Experiencia, accesibilidad y seguridad",
    description: "Mobile performance, UX/accessibility signals, privacy, account security, and invisible antifraud checks.",
    audiences: ["consumer"],
    entities: [
      entity("consumerExperienceMetrics", "Consumer experience metrics", "Mobile/web performance and UX quality metrics.", "cux", [
        { id: "cux-1001", page: "home_mobile", lcpMs: 1850, cls: 0.03, ttiMs: 2300, accessibilityScore: 93, status: "healthy" },
        { id: "cux-1002", page: "checkout_mobile", lcpMs: 2120, cls: 0.02, ttiMs: 2600, accessibilityScore: 91, status: "healthy" },
      ]),
      entity("consumerSecurityPrivacy", "Consumer security and privacy", "2FA, privacy settings, and account protection controls.", "csec", [
        { id: "csec-1001", customerEmail: "ana.perez@example.com", twoFactorOptional: true, twoFactorEnabled: false, privacyMode: "standard", loginAlerts: true, status: "active" },
        { id: "csec-1002", customerEmail: "luis.ramos@example.com", twoFactorOptional: true, twoFactorEnabled: true, privacyMode: "strict", loginAlerts: true, status: "active" },
      ]),
      entity("consumerInvisibleAntifraud", "Consumer invisible antifraud", "Background verifications, risk checks, and invisible fraud prevention events.", "cfraud", [
        { id: "cfraud-1001", customerEmail: "ana.perez@example.com", event: "checkout_risk_screen", score: 18, action: "allow", status: "closed" },
        { id: "cfraud-1002", customerEmail: "luis.ramos@example.com", event: "login_device_check", score: 42, action: "step_up", status: "closed" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/admin-catalog-content",
    title: "Catalogo y contenido",
    description: "Products, variants, SKUs, pricing, inventory, media, SEO, collections, and commercial content.",
    audiences: ["admin"],
    entities: [
      entity("adminCatalogProducts", "Admin catalog products", "Products, product types, bundles/kits, and merchandising metadata.", "acp", [
        { id: "acp-1001", sku: "LAPTOP-G15", type: "variable", title: "Gaming Laptop G15", priceBase: 1199, bundleEligible: true, status: "active" },
        { id: "acp-1002", sku: "OFFICE-KIT-01", type: "bundle", title: "Home Office Kit", priceBase: 399, bundleEligible: false, status: "active" },
      ]),
      entity("adminCatalogInventory", "Admin catalog inventory", "Variants, barcode/SKU, stock, minimums, backorders, and multi-warehouse inventory.", "aci", [
        { id: "aci-1001", sku: "LAPTOP-G15-16-512", barcode: "770123456001", warehouse: "CO-BOG-01", stock: 12, minStock: 4, backorder: false, status: "active" },
        { id: "aci-1002", sku: "MOUSE-PRO-BLK", barcode: "770123456188", warehouse: "CO-MDE-02", stock: 3, minStock: 10, backorder: true, status: "restock" },
      ]),
      entity("adminCatalogContentSeo", "Admin catalog content and SEO", "Media assets, SEO metadata, collections, landing pages, blog, and content publishing.", "acseo", [
        { id: "acseo-1001", objectType: "product", objectRef: "LAPTOP-G15", mediaAssets: 9, schema: "Product", canonical: true, sitemap: true, status: "published" },
        { id: "acseo-1002", objectType: "landing", objectRef: "back-to-school", mediaAssets: 5, schema: "CollectionPage", canonical: true, sitemap: true, status: "draft" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/admin-checkout-payments-tax",
    title: "Checkout, pagos e impuestos",
    description: "Gateways, alternative payment methods, reconciliation, antifraud/3DS, disputes, taxes, and invoicing.",
    audiences: ["admin"],
    entities: [
      entity("adminPaymentGateways", "Admin payment gateways", "Gateway configuration and enabled payment methods.", "apg", [
        { id: "apg-1001", provider: "stripe", region: "global", methods: "card,applepay,googlepay", threeDS: true, status: "active" },
        { id: "apg-1002", provider: "wompi", region: "co", methods: "card,pse,nequi", threeDS: true, status: "active" },
      ]),
      entity("adminPaymentReconciliation", "Admin payment reconciliation", "Payment states, retries, reconciliations, chargebacks, and dispute handling.", "aprec", [
        { id: "aprec-1001", date: "2026-02-24", provider: "stripe", captured: 120, retries: 7, reconciledAmount: 28450, chargebacks: 1, status: "reconciled" },
        { id: "aprec-1002", date: "2026-02-24", provider: "wompi", captured: 84, retries: 5, reconciledAmount: 19320, chargebacks: 0, status: "pending" },
      ]),
      entity("adminTaxInvoiceRules", "Admin tax and invoice rules", "IVA/tax rules by region, retentions, and electronic invoicing policies.", "atax", [
        { id: "atax-1001", region: "CO", taxName: "IVA", rate: 19, retentionRule: "retefuente", eInvoice: true, status: "active" },
        { id: "atax-1002", region: "MX", taxName: "IVA", rate: 16, retentionRule: "ISR/IVA", eInvoice: true, status: "active" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/admin-promotions-pricing",
    title: "Promociones y precios",
    description: "Coupons, discount rules, BOGO/bundles, segment pricing, channel pricing, and abandoned cart offers.",
    audiences: ["admin"],
    entities: [
      entity("adminCouponsDiscountRules", "Admin coupons and discount rules", "Coupon rules, minimums, product/date restrictions, and automatic discounts.", "apromo", [
        { id: "apromo-1001", code: "WELCOME10", ruleType: "coupon", minAmount: 50, appliesTo: "all", validUntil: "2026-03-31", status: "active" },
        { id: "apromo-1002", code: "BOGO-HEADSET", ruleType: "bogo", minAmount: 0, appliesTo: "HEADSET-*", validUntil: "2026-03-10", status: "active" },
      ]),
      entity("adminPricingSegments", "Admin pricing segments", "Volume, segment, and channel-based pricing rules.", "aprice", [
        { id: "aprice-1001", segment: "VIP", channel: "web", skuPattern: "LAPTOP-*", priceRule: "base-8%", minQty: 1, status: "active" },
        { id: "aprice-1002", segment: "B2B_GOLD", channel: "sales", skuPattern: "*", priceRule: "tier_gold", minQty: 20, status: "active" },
      ]),
      entity("adminAbandonedCartOffers", "Admin abandoned cart offers", "Cart recovery offers and personalized incentives.", "acartoffer", [
        { id: "acartoffer-1001", campaign: "winback_24h", segment: "new_users", couponCode: "COME-BACK", discountPct: 10, status: "running" },
        { id: "acartoffer-1002", campaign: "high_value_cart", segment: "repeaters", couponCode: "SHIPFREE", discountPct: 0, status: "scheduled" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/admin-orders-oms",
    title: "Pedidos y OMS",
    description: "Order lifecycle, OMS status flow, edits, notes, split shipments, cancellations, refunds, and manual fraud review.",
    audiences: ["admin"],
    entities: [
      entity("adminOmsOrders", "Admin OMS orders", "Orders and lifecycle states from new to delivered.", "aoms", [
        { id: "aoms-1001", orderNumber: "SO-2026-3001", status: "paid", paymentStatus: "captured", total: 1551, channel: "web", statusFlow: "new>paid", riskFlag: false },
        { id: "aoms-1002", orderNumber: "SO-2026-3002", status: "preparing", paymentStatus: "captured", total: 105.91, channel: "app", statusFlow: "new>paid>preparing", riskFlag: true },
      ]),
      entity("adminOmsOperations", "Admin OMS operations", "Order edits, internal notes, and split shipments.", "aomso", [
        { id: "aomso-1001", orderNumber: "SO-2026-3001", internalNotes: 2, editedAfterCheckout: false, splitShipments: 1, owner: "ops.juan", status: "ok" },
        { id: "aomso-1002", orderNumber: "SO-2026-3002", internalNotes: 4, editedAfterCheckout: true, splitShipments: 2, owner: "ops.lina", status: "review" },
      ]),
      entity("adminOmsRiskRefunds", "Admin OMS risk and refunds", "Cancellation, partial/total refunds, and manual fraud reviews.", "aomsr", [
        { id: "aomsr-1001", orderNumber: "SO-2026-2998", cancelRequested: true, refundType: "total", fraudReview: "manual_pending", status: "open" },
        { id: "aomsr-1002", orderNumber: "SO-2026-2987", cancelRequested: false, refundType: "partial", fraudReview: "approved", status: "closed" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/admin-logistics-fulfillment",
    title: "Logistica y fulfillment",
    description: "Shipping methods, zones, carriers, labels, pick/pack, 3PL, tracking incidents, and reverse logistics.",
    audiences: ["admin"],
    entities: [
      entity("adminShippingConfig", "Admin shipping config", "Shipping methods, zones, rates, carriers, and SLAs.", "ashipcfg", [
        { id: "ashipcfg-1001", zone: "CO_CENTRO", method: "standard", carrier: "coordinadora", rate: 5.9, sla: "2-4d", status: "active" },
        { id: "ashipcfg-1002", zone: "CO_CAPITAL", method: "express", carrier: "servientrega", rate: 8.5, sla: "24h", status: "active" },
      ]),
      entity("adminFulfillmentOps", "Admin fulfillment ops", "Pick/pack, QC, labels/packing slips, and 3PL fulfillment batches.", "aful", [
        { id: "aful-1001", warehouse: "CO-BOG-01", wave: "W-2402-1", picks: 124, packed: 118, qcRejected: 3, thirdParty3PL: false, status: "in_progress" },
        { id: "aful-1002", warehouse: "3PL-COL-01", wave: "W-2402-2", picks: 86, packed: 86, qcRejected: 0, thirdParty3PL: true, status: "completed" },
      ]),
      entity("adminTrackingReverseLogistics", "Admin tracking and reverse logistics", "Tracking incidents, re-dispatch, and returns logistics.", "atrack", [
        { id: "atrack-1001", orderNumber: "SO-2026-3002", incident: "address_issue", redispatch: true, reverseLogistics: false, status: "open" },
        { id: "atrack-1002", orderNumber: "SO-2026-2991", incident: "return_pickup", redispatch: false, reverseLogistics: true, status: "scheduled" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/admin-cx-support",
    title: "Atencion al cliente (CX)",
    description: "Helpdesk/tickets, SLA/macros, chat/WhatsApp, self-service FAQ/KB, warranties, UGC moderation, and NPS/CSAT.",
    audiences: ["admin"],
    entities: [
      entity("adminCxTicketsSla", "Admin CX tickets and SLA", "Helpdesk tickets, SLA timers, and macro usage.", "acx", [
        { id: "acx-1001", queue: "post_sale", openTickets: 124, slaBreaches: 6, macrosUsed: 320, status: "healthy" },
        { id: "acx-1002", queue: "returns", openTickets: 48, slaBreaches: 9, macrosUsed: 145, status: "warning" },
      ]),
      entity("adminCxChannelsKnowledge", "Admin CX channels and self-service", "Chat/WhatsApp operations and FAQ/knowledge base coverage.", "acxch", [
        { id: "acxch-1001", channel: "whatsapp", agentsOnline: 12, avgFirstResponseMin: 3.4, faqCoveragePct: 72, status: "active" },
        { id: "acxch-1002", channel: "chat", agentsOnline: 8, avgFirstResponseMin: 1.9, faqCoveragePct: 72, status: "active" },
      ]),
      entity("adminCxQuality", "Admin CX quality and moderation", "Warranty/support cases, UGC moderation, and NPS/CSAT results.", "acxq", [
        { id: "acxq-1001", period: "2026-02", warrantyCases: 34, ugcModerationBacklog: 12, nps: 54, csat: 4.5, status: "tracked" },
        { id: "acxq-1002", period: "2026-01", warrantyCases: 28, ugcModerationBacklog: 9, nps: 50, csat: 4.4, status: "tracked" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/admin-customers-crm",
    title: "Clientes y CRM",
    description: "Segmentation, customer history, loyalty/referrals, subscriptions/dunning, and B2B accounts/credit/quotes/POs.",
    audiences: ["admin"],
    entities: [
      entity("adminCustomerSegmentationCrm", "Admin customer segmentation and CRM", "Segments, tags, notes, and customer history snapshots.", "acrm", [
        { id: "acrm-1001", segment: "VIP_repeaters", customers: 820, avgLtv: 640, consentCoveragePct: 94, status: "active" },
        { id: "acrm-1002", segment: "new_30d", customers: 2140, avgLtv: 88, consentCoveragePct: 89, status: "active" },
      ]),
      entity("adminLoyaltySubscriptionsDunning", "Admin loyalty, subscriptions, and dunning", "Loyalty programs, referrals, memberships, renewals, and failed-charge recovery.", "adun", [
        { id: "adun-1001", program: "loyalty_plus", activeMembers: 4200, renewalRatePct: 84, dunningOpen: 61, referralsMonthly: 180, status: "healthy" },
        { id: "adun-1002", program: "club_pro", activeMembers: 930, renewalRatePct: 78, dunningOpen: 34, referralsMonthly: 42, status: "warning" },
      ]),
      entity("adminB2BCrm", "Admin B2B CRM", "Company accounts, credit, quotes, purchase orders, and approval workflow.", "ab2bcrm", [
        { id: "ab2bcrm-1001", company: "Acme Stores", creditLimit: 50000, openQuotes: 4, purchaseOrders: 12, accountStatus: "active", status: "healthy" },
        { id: "ab2bcrm-1002", company: "Nova Retail", creditLimit: 20000, openQuotes: 1, purchaseOrders: 5, accountStatus: "review", status: "warning" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/admin-marketing-growth",
    title: "Marketing y crecimiento",
    description: "Email/SMS/WhatsApp marketing, automations, attribution/pixels/CAPI, affiliates, influencers, personalization, and A/B testing.",
    audiences: ["admin"],
    entities: [
      entity("adminCampaignAutomation", "Admin campaigns and automation", "Outbound campaigns and automation journeys (welcome, post-purchase, winback).", "amkt", [
        { id: "amkt-1001", channel: "email", journey: "welcome_series", activeFlows: 4, sendsToday: 18400, conversionRate: 3.2, status: "running" },
        { id: "amkt-1002", channel: "whatsapp", journey: "post_purchase", activeFlows: 2, sendsToday: 3200, conversionRate: 8.6, status: "running" },
      ]),
      entity("adminAttributionChannels", "Admin attribution and channels", "UTMs, pixels, conversion API, affiliates, influencers, and marketplaces channels.", "aattr", [
        { id: "aattr-1001", channel: "meta_ads", pixelHealth: "ok", capiEnabled: true, attributedRevenue: 18400, status: "active" },
        { id: "aattr-1002", channel: "influencers", pixelHealth: "n/a", capiEnabled: false, attributedRevenue: 7600, status: "active" },
      ]),
      entity("adminPersonalizationExperiments", "Admin personalization and experiments", "Recommendations, personalization segments, and A/B tests.", "aexp", [
        { id: "aexp-1001", experiment: "home_banner_v2", segment: "new_users", variants: 2, winner: "B", upliftPct: 6.4, status: "completed" },
        { id: "aexp-1002", experiment: "pdp_recommendation_slot", segment: "repeaters", variants: 3, winner: "", upliftPct: 0, status: "running" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/admin-analytics-finance",
    title: "Analitica y finanzas",
    description: "KPIs, cohorts, funnels, channel/product reports, ERP/accounting, taxes/COGS/inventory, and reconciliations.",
    audiences: ["admin"],
    entities: [
      entity("adminKpiSnapshots", "Admin KPI snapshots", "Sales, conversion, AOV, LTV, CAC, margin, and return rate snapshots.", "akpi", [
        { id: "akpi-1001", date: "2026-02-24", sales: 47780, conversionRate: 2.9, aov: 112.4, ltv: 218, cac: 34, marginPct: 38, returnRatePct: 4.6 },
        { id: "akpi-1002", date: "2026-02-23", sales: 45210, conversionRate: 2.8, aov: 108.7, ltv: 214, cac: 35, marginPct: 37.5, returnRatePct: 4.8 },
      ]),
      entity("adminFunnelsCohortsReports", "Admin funnels, cohorts, and reports", "Funnels, cohort retention, and reporting by channel/product/campaign.", "afun", [
        { id: "afun-1001", report: "weekly_channel", funnelStepDropPct: 21, cohortRetentionM1: 61, cohortRetentionM3: 36, status: "ready" },
        { id: "afun-1002", report: "product_margin", funnelStepDropPct: 18, cohortRetentionM1: 59, cohortRetentionM3: 34, status: "queued" },
      ]),
      entity("adminFinanceReconciliation", "Admin finance and reconciliation", "ERP/accounting sync, taxes, COGS/inventory, and payment/shipping/refund reconciliation.", "afin", [
        { id: "afin-1001", period: "2026-02-24", erpSync: "completed", taxClose: "in_progress", cogsPosted: true, paymentRecon: "ok", shippingRecon: "ok", refundRecon: "pending" },
        { id: "afin-1002", period: "2026-02-23", erpSync: "completed", taxClose: "completed", cogsPosted: true, paymentRecon: "ok", shippingRecon: "ok", refundRecon: "ok" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/admin-security-risk-compliance",
    title: "Seguridad, riesgo y cumplimiento",
    description: "Roles/permissions, audit logs, privacy/consent, PCI/PII handling, backups, monitoring, WAF/anti-bot, and antifraud policy.",
    audiences: ["admin"],
    entities: [
      entity("adminRolesAudit", "Admin roles and audit", "Role/permission assignments and audit trail records.", "arole", [
        { id: "arole-1001", role: "ops_manager", users: 12, criticalPermissions: 8, auditEvents24h: 124, status: "active" },
        { id: "arole-1002", role: "finance_admin", users: 4, criticalPermissions: 11, auditEvents24h: 38, status: "active" },
      ]),
      entity("adminPrivacyCompliance", "Admin privacy and compliance", "Consent/cookies, GDPR/local compliance, PCI scope, and PII handling policies.", "apriv", [
        { id: "apriv-1001", region: "EU", cookiesConsent: true, gdprWorkflow: "active", pciScope: "saq_a", piiRetentionDays: 365, status: "compliant" },
        { id: "apriv-1002", region: "LATAM", cookiesConsent: true, gdprWorkflow: "n/a", pciScope: "gateway_tokenized", piiRetentionDays: 540, status: "review" },
      ]),
      entity("adminSecurityControls", "Admin security controls", "Backups, WAF, anti-bots, fraud policies, abuse prevention, and monitoring posture.", "asec", [
        { id: "asec-1001", controlArea: "waf_antibot", enabled: true, incidents30d: 12, policyVersion: "2026.02", status: "healthy" },
        { id: "asec-1002", controlArea: "backup_monitoring", enabled: true, incidents30d: 1, policyVersion: "2026.01", status: "healthy" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/admin-platform-technology",
    title: "Plataforma y tecnologia",
    description: "Performance, cache/CDN, DB optimization, integrations, multi-store/localization, environments, APIs/webhooks, and observability.",
    audiences: ["admin"],
    entities: [
      entity("adminPlatformPerformance", "Admin platform performance", "Cache/CDN, database optimization, and storefront performance baselines.", "aplat", [
        { id: "aplat-1001", environment: "production", cacheHitPct: 92, cdnHitPct: 88, p95ApiMs: 340, dbSlowQueries: 7, status: "healthy" },
        { id: "aplat-1002", environment: "staging", cacheHitPct: 74, cdnHitPct: 66, p95ApiMs: 510, dbSlowQueries: 18, status: "watch" },
      ]),
      entity("adminIntegrationsApis", "Admin integrations and APIs", "CRM/ERP/logistics/BI/POS integrations, plugins, webhooks, and API health.", "aapi", [
        { id: "aapi-1001", integration: "erp_sap", type: "erp", webhooks: 4, apiErrors24h: 2, multiStoreAware: true, status: "active" },
        { id: "aapi-1002", integration: "last_mile_3pl", type: "logistics", webhooks: 7, apiErrors24h: 9, multiStoreAware: true, status: "degraded" },
      ]),
      entity("adminEnvironmentsObservability", "Admin environments and observability", "Staging/production deploys, versioning, logs, tracing, and alerts.", "aobs", [
        { id: "aobs-1001", environment: "production", release: "2026.02.24.3", deployStatus: "success", alertsOpen: 4, tracingEnabled: true, status: "stable" },
        { id: "aobs-1002", environment: "staging", release: "2026.02.24.5-rc", deployStatus: "success", alertsOpen: 2, tracingEnabled: true, status: "testing" },
      ]),
    ],
    actions: [],
  },
  {
    slug: "ecommerce/admin-operations-strategy",
    title: "Operacion y estrategia",
    description: "Suppliers/procurement, inventory forecasting, pricing strategy, merchandising, SOPs, and internal operating processes.",
    audiences: ["admin"],
    entities: [
      entity("adminSuppliersProcurement", "Admin suppliers and procurement", "Supplier management, purchasing, lead times, and procurement status.", "asup", [
        { id: "asup-1001", supplier: "Gamma Imports", openPOs: 12, avgLeadTimeDays: 18, onTimePct: 87, status: "active" },
        { id: "asup-1002", supplier: "Alpha Gadgets", openPOs: 5, avgLeadTimeDays: 27, onTimePct: 74, status: "risk" },
      ]),
      entity("adminPlanningMerchandising", "Admin planning and merchandising", "Forecasting, assortment, pricing strategy, and merchandising plans.", "amer", [
        { id: "amer-1001", season: "Q2-2026", forecastAccuracyPct: 81, topCategory: "laptops", pricingStrategy: "margin_mix", merchandisingPlan: "back_to_school", status: "active" },
        { id: "amer-1002", season: "Q3-2026", forecastAccuracyPct: 0, topCategory: "audio", pricingStrategy: "volume_growth", merchandisingPlan: "gaming_event", status: "draft" },
      ]),
      entity("adminSopsTraining", "Admin SOPs and training", "Internal processes, training completion, and SOP governance.", "asop", [
        { id: "asop-1001", team: "ops", sopCoveragePct: 92, trainingCompletionPct: 88, lastAudit: "2026-02-12", status: "healthy" },
        { id: "asop-1002", team: "cx", sopCoveragePct: 84, trainingCompletionPct: 79, lastAudit: "2026-02-08", status: "improving" },
      ]),
    ],
    actions: [],
  },
];

export function getEcommerceSuiteModuleCatalogItem(moduleSlug: string) {
  return ECOMMERCE_SUITE_MODULE_CATALOG.find((module) => module.slug === moduleSlug) ?? null;
}

export function isEcommerceSuiteModuleSlug(moduleSlug: string): moduleSlug is EcommerceSuiteModuleSlug {
  return Boolean(getEcommerceSuiteModuleCatalogItem(moduleSlug));
}

export function getEcommerceSuiteModulesByAudience(audience: "consumer" | "admin") {
  return ECOMMERCE_SUITE_MODULE_CATALOG.filter((module) => module.audiences.includes(audience));
}
