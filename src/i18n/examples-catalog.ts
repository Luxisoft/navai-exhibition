import { getLocalizedNavaiDocs } from "@/i18n/docs-catalog";
import { getEcommerceModuleExperienceText } from "@/i18n/ecommerce-module-experience";
import type { LanguageCode } from "@/i18n/messages";
import { ECOMMERCE_SUITE_MODULE_CATALOG, getEcommerceSuiteModuleCatalogItem } from "@/lib/ecommerce-suite-catalog";

export type ExampleSlug = string;
export type ExampleGroupKey = "ecommerce";
type EcommerceAudience = "consumer" | "admin";

type ExampleEntry = {
  title: string;
  summary: string;
};

type ExampleHomeSection = {
  id: string;
  title: string;
  description: string;
  bullets?: string[];
};

type LocalizedExamples = {
  homeItem: { slug: string; title: string };
  groups: Array<{
    groupKey: ExampleGroupKey;
    label: string;
    items: Array<{ slug: string; title: string; children?: Array<{ slug: string; title: string }> }>;
  }>;
  entries: Record<string, ExampleEntry>;
  homePage: {
    badge: string;
    title: string;
    description: string;
    sections: ExampleHomeSection[];
  };
};

const ECOMMERCE_BUYER_HOME_SLUG = "ecommerce-comprador";
const ECOMMERCE_ADMIN_HOME_SLUG = "ecommerce-administrador";

type EcommerceExampleEntrySpec = {
  slug: string;
  primaryAudience: EcommerceAudience;
  titleEn: string;
  titleEs: string;
  summaryEn: string;
  summaryEs: string;
  useStoresDocMeta?: boolean;
};

const ECOMMERCE_EXAMPLE_ENTRY_SPECS: EcommerceExampleEntrySpec[] = ECOMMERCE_SUITE_MODULE_CATALOG.map((module) => ({
  slug: module.slug,
  primaryAudience: module.audiences.includes("consumer") ? "consumer" : "admin",
  titleEn: module.title,
  titleEs: module.title,
  summaryEn: module.description,
  summaryEs: module.description,
}));

function getLocalizedEcommerceSpecEntry(language: LanguageCode, item: EcommerceExampleEntrySpec) {
  const suiteMeta = getEcommerceSuiteModuleCatalogItem(item.slug);
  const title = suiteMeta
    ? getEcommerceModuleExperienceText(language, suiteMeta.title)
    : getEcommerceModuleExperienceText(language, item.titleEn);
  const summary = suiteMeta
    ? getEcommerceModuleExperienceText(language, suiteMeta.description)
    : getEcommerceModuleExperienceText(language, item.summaryEn);

  return { title, summary };
}

const ECOMMERCE_AUDIENCE_TERMS: Record<LanguageCode, { consumer: string; admin: string }> = {
  en: { consumer: "Buyer", admin: "Administrator" },
  es: { consumer: "Comprador", admin: "Administrador" },
  fr: { consumer: "Consommateur", admin: "Administrateur" },
  pt: { consumer: "Consumidor", admin: "Administrador" },
  zh: { consumer: "消费者", admin: "管理员" },
  ja: { consumer: "利用者", admin: "管理者" },
  ru: { consumer: "Покупатель", admin: "Администратор" },
  ko: { consumer: "소비자", admin: "관리자" },
  hi: { consumer: "उपभोक्ता", admin: "प्रशासक" },
};

function getAudienceTerms(language: LanguageCode) {
  return ECOMMERCE_AUDIENCE_TERMS[language] ?? ECOMMERCE_AUDIENCE_TERMS.en;
}

function getEcommerceAudienceHubEntry(language: LanguageCode, audience: EcommerceAudience): ExampleEntry {
  const terms = getAudienceTerms(language);
  if (audience === "consumer") {
    if (language === "es") {
      return {
        title: "Ecommerce · Comprador",
        summary:
          "Ruta de pruebas del cliente: descubrimiento, confianza, intencion, checkout, post-compra, devoluciones, cuenta y seguridad.",
      };
    }
    return {
      title: `Ecommerce · ${terms.consumer}`,
      summary:
        "Testing path for customer-facing ecommerce flows: discovery, trust, intent, checkout, post-purchase, returns, account, and security.",
    };
  }

  if (language === "es") {
    return {
      title: "Ecommerce · Administrador",
      summary:
        "Ruta de pruebas de negocio/operacion: catalogo, pagos/impuestos, pricing, OMS, logistica, CX, CRM, marketing, analitica, seguridad, plataforma y estrategia.",
    };
  }
  return {
    title: `Ecommerce · ${terms.admin}`,
    summary:
      "Testing path for admin/operator ecommerce flows: catalog, payments/tax, pricing, OMS, logistics, CX, CRM, marketing, analytics, security, platform, and operations strategy.",
  };
}

const ECOMMERCE_ROLE_ORDER: Record<EcommerceAudience, Array<(typeof ECOMMERCE_SUITE_MODULE_CATALOG)[number]["slug"]>> = {
  consumer: [
    "ecommerce/consumer-discovery",
    "ecommerce/consumer-evaluation-trust",
    "ecommerce/consumer-intent",
    "ecommerce/consumer-checkout",
    "ecommerce/consumer-post-purchase",
    "ecommerce/consumer-returns-refunds",
    "ecommerce/consumer-account-relationship",
    "ecommerce/consumer-experience-security",
  ],
  admin: [
    "ecommerce/admin-catalog-content",
    "ecommerce/admin-checkout-payments-tax",
    "ecommerce/admin-promotions-pricing",
    "ecommerce/admin-orders-oms",
    "ecommerce/admin-logistics-fulfillment",
    "ecommerce/admin-cx-support",
    "ecommerce/admin-customers-crm",
    "ecommerce/admin-marketing-growth",
    "ecommerce/admin-analytics-finance",
    "ecommerce/admin-security-risk-compliance",
    "ecommerce/admin-platform-technology",
    "ecommerce/admin-operations-strategy",
  ],
};

function buildEcommerceAudienceItems(
  language: LanguageCode,
  audience: EcommerceAudience,
  storesEntry: ExampleEntry
) {
  const specsBySlug = new Map(ECOMMERCE_EXAMPLE_ENTRY_SPECS.map((item) => [item.slug, item]));
  const moduleBySlug = new Map(ECOMMERCE_SUITE_MODULE_CATALOG.map((module) => [module.slug, module]));
  const orderedSlugs = ECOMMERCE_ROLE_ORDER[audience];

  return orderedSlugs
    .filter((slug) => moduleBySlug.get(slug)?.audiences.includes(audience))
    .map((slug) => specsBySlug.get(slug))
    .filter((item): item is EcommerceExampleEntrySpec => Boolean(item))
    .map((item) => {
      if (item.useStoresDocMeta) {
        return { slug: item.slug, title: storesEntry.title };
      }
      const localized = getLocalizedEcommerceSpecEntry(language, item);
      return { slug: item.slug, title: localized.title };
    });
}

const EXAMPLES_LABELS: Record<
  LanguageCode,
  {
    homeTitle: string;
    ecommerceGroup: string;
    examplesBadge: string;
    examplesTitle: string;
    examplesDescription: string;
    sections: ExampleHomeSection[];
  }
> = {
  en: {
    homeTitle: "Home",
    ecommerceGroup: "Ecommerce",
    examplesBadge: "Examples",
    examplesTitle: "Examples Home",
    examplesDescription: "Browse interactive NAVAI examples grouped by domain and open the available demos.",
    sections: [
      {
        id: "overview",
        title: "Overview",
        description: "This section contains example experiences built on top of NAVAI runtime integrations.",
      },
      {
        id: "ecommerce",
        title: "Ecommerce",
        description: "Interactive ecommerce examples with realistic seed data and local sandbox actions.",
        bullets: [
          "Buyer: catalog, checkout, payments, subscriptions, and support flows.",
          "Administrator: marketplace, B2B, logistics, marketing, analytics, and operations.",
        ],
      },
    ],
  },
  es: {
    homeTitle: "Inicio",
    ecommerceGroup: "Ecommerce",
    examplesBadge: "Ejemplos",
    examplesTitle: "Inicio de ejemplos",
    examplesDescription: "Explora ejemplos interactivos de NAVAI agrupados por dominio y abre las demos disponibles.",
    sections: [
      {
        id: "overview",
        title: "Resumen",
        description: "Esta seccion contiene experiencias de ejemplo construidas sobre integraciones del runtime de NAVAI.",
      },
      {
        id: "ecommerce",
        title: "Ecommerce",
        description: "Ejemplos ecommerce interactivos con datos seed realistas y acciones sandbox locales.",
        bullets: [
          "Comprador: catalogo, checkout, pagos, suscripciones y soporte.",
          "Administrador: marketplace, B2B, logistica, marketing, analitica y operaciones.",
        ],
      },
    ],
  },
  fr: {
    homeTitle: "Accueil",
    ecommerceGroup: "Ecommerce",
    examplesBadge: "Exemples",
    examplesTitle: "Accueil des exemples",
    examplesDescription: "Parcourez des exemples NAVAI interactifs groupes par domaine.",
    sections: [
      { id: "overview", title: "Vue d'ensemble", description: "Cette section regroupe des experiences d'exemple NAVAI." },
      { id: "ecommerce", title: "Ecommerce", description: "Exemples ecommerce interactifs.", bullets: ["Boutiques: SQLite seed + localStorage"] },
    ],
  },
  pt: {
    homeTitle: "Inicio",
    ecommerceGroup: "Ecommerce",
    examplesBadge: "Exemplos",
    examplesTitle: "Inicio de exemplos",
    examplesDescription: "Navegue por exemplos interativos do NAVAI organizados por dominio.",
    sections: [
      { id: "overview", title: "Visao geral", description: "Esta secao agrupa experiencias de exemplo do NAVAI." },
      { id: "ecommerce", title: "Ecommerce", description: "Exemplos ecommerce interativos.", bullets: ["Lojas: SQLite seed + localStorage"] },
    ],
  },
  zh: {
    homeTitle: "首页",
    ecommerceGroup: "电商",
    examplesBadge: "示例",
    examplesTitle: "示例首页",
    examplesDescription: "按领域浏览 NAVAI 交互示例，并打开可用演示。",
    sections: [
      { id: "overview", title: "概览", description: "此区域包含基于 NAVAI 运行时集成构建的示例体验。" },
      { id: "ecommerce", title: "电商", description: "带真实感种子数据与本地沙箱操作的交互式电商示例。", bullets: ["商店：SQLite 种子目录 + localStorage CRUD/购买"] },
    ],
  },
  ja: {
    homeTitle: "ホーム",
    ecommerceGroup: "Ecommerce",
    examplesBadge: "例",
    examplesTitle: "例のホーム",
    examplesDescription: "ドメイン別に NAVAI のインタラクティブ例を参照できます。",
    sections: [
      { id: "overview", title: "概要", description: "このセクションには NAVAI のサンプル体験が含まれます。" },
      { id: "ecommerce", title: "Ecommerce", description: "EC のインタラクティブ例。", bullets: ["ストア: SQLite seed + localStorage"] },
    ],
  },
  ru: {
    homeTitle: "Главная",
    ecommerceGroup: "Ecommerce",
    examplesBadge: "Примеры",
    examplesTitle: "Главная примеров",
    examplesDescription: "Просматривайте интерактивные примеры NAVAI по категориям.",
    sections: [
      { id: "overview", title: "Обзор", description: "Раздел с примерами на базе интеграций NAVAI." },
      { id: "ecommerce", title: "Ecommerce", description: "Интерактивные ecommerce-примеры.", bullets: ["Магазины: SQLite seed + localStorage"] },
    ],
  },
  ko: {
    homeTitle: "홈",
    ecommerceGroup: "이커머스",
    examplesBadge: "예제",
    examplesTitle: "예제 홈",
    examplesDescription: "도메인별 NAVAI 인터랙티브 예제를 탐색하세요.",
    sections: [
      { id: "overview", title: "개요", description: "이 섹션은 NAVAI 예제 경험을 제공합니다." },
      { id: "ecommerce", title: "이커머스", description: "인터랙티브 이커머스 예제.", bullets: ["스토어: SQLite seed + localStorage"] },
    ],
  },
  hi: {
    homeTitle: "होम",
    ecommerceGroup: "ईकॉमर्स",
    examplesBadge: "उदाहरण",
    examplesTitle: "उदाहरण होम",
    examplesDescription: "डोमेन के अनुसार NAVAI इंटरैक्टिव उदाहरण देखें।",
    sections: [
      { id: "overview", title: "ओवरव्यू", description: "इस सेक्शन में NAVAI इंटीग्रेशन पर आधारित उदाहरण हैं।" },
      { id: "ecommerce", title: "ईकॉमर्स", description: "इंटरैक्टिव ईकॉमर्स उदाहरण।", bullets: ["स्टोर: SQLite seed + localStorage"] },
    ],
  },
};

export function getLocalizedNavaiExamples(language: LanguageCode): LocalizedExamples {
  const docs = getLocalizedNavaiDocs(language);
  const labels = EXAMPLES_LABELS[language] ?? EXAMPLES_LABELS.en;
  const audienceTerms = getAudienceTerms(language);
  const storesEntry = docs.entries["playground-stores"] ?? {
    title: "Stores",
    summary: "Interactive ecommerce demo with NAVAI.",
  };
  const ecommerceBuyerItems = [
    ...buildEcommerceAudienceItems(language, "consumer", storesEntry),
  ];
  const ecommerceAdminItems = [
    ...buildEcommerceAudienceItems(language, "admin", storesEntry),
  ];

  const exampleEntries: Record<string, ExampleEntry> = {
    home: {
      title: labels.examplesTitle,
      summary: labels.examplesDescription,
    },
    [ECOMMERCE_BUYER_HOME_SLUG]: getEcommerceAudienceHubEntry(language, "consumer"),
    [ECOMMERCE_ADMIN_HOME_SLUG]: getEcommerceAudienceHubEntry(language, "admin"),
    "ecommerce/stores": {
      title: storesEntry.title,
      summary: storesEntry.summary,
    },
  };

  for (const item of ECOMMERCE_EXAMPLE_ENTRY_SPECS) {
    exampleEntries[item.slug] = item.useStoresDocMeta
      ? {
          title: storesEntry.title,
          summary: storesEntry.summary,
        }
      : getLocalizedEcommerceSpecEntry(language, item);
  }

  return {
    homeItem: { slug: "home", title: labels.homeTitle },
    groups: [
      {
        groupKey: "ecommerce",
        label: labels.ecommerceGroup,
        items: [
          {
            slug: ECOMMERCE_BUYER_HOME_SLUG,
            title: audienceTerms.consumer,
            children: ecommerceBuyerItems,
          },
          {
            slug: ECOMMERCE_ADMIN_HOME_SLUG,
            title: audienceTerms.admin,
            children: ecommerceAdminItems,
          },
        ],
      },
    ],
    entries: exampleEntries,
    homePage: {
      badge: labels.examplesBadge,
      title: labels.examplesTitle,
      description: labels.examplesDescription,
      sections: labels.sections,
    },
  };
}
