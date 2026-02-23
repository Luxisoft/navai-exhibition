export type LanguageCode = "en" | "fr" | "es" | "pt" | "zh" | "ja" | "ru" | "ko" | "hi";

export type LocalizedSection = {
  id: string;
  title: string;
  description: string;
  bullets?: string[];
  code?: string;
};

export type LocalizedPlan = {
  name: string;
  menuRange: string;
  price: string;
  timeline: string;
  highlights: string[];
};

export type AppMessages = {
  common: {
    languageLabel: string;
    themeLabel: string;
    themeDark: string;
    themeLight: string;
    searchDocsAria: string;
    searchDocsPlaceholder: string;
    searchDocsEmpty: string;
    searchDocsSearching: string;
    searchDocsNoResults: string;
    searchDocsDocumentation: string;
    searchDocsImplementation: string;
    documentation: string;
    requestImplementation: string;
    sourceRepository: string;
    home: string;
  };
  home: {
    documentationButton: string;
    implementationButton: string;
  };
  mic: {
    apiKeyLabel: string;
    apiKeyPlaceholder: string;
    apiKeyNotice: string;
    apiKeyNoticeRepoLabel: string;
    ariaStart: string;
    ariaStop: string;
    connecting: string;
    active: string;
    activeDetail: string;
    stopped: string;
    missingKey: string;
    frontendKeyDisabled: string;
    clientSecretRejected: string;
    genericError: string;
  };
  docsPage: {
    badge: string;
    title: string;
    description: string;
    sidebarTitle: string;
    sections: LocalizedSection[];
  };
  implementationPage: {
    badge: string;
    title: string;
    description: string;
    sidebarTitle: string;
    sections: LocalizedSection[];
    plansTitle: string;
    plans: LocalizedPlan[];
    whatsappButtonLabel: string;
    whatsappPrefill: string;
    contactSectionTitle: string;
    contactSectionDescription: string;
    contactNameLabel: string;
    contactEmailLabel: string;
    contactCompanyLabel: string;
    contactWhatsappLabel: string;
    contactMessageLabel: string;
    contactNameRequiredMessage: string;
    contactEmailRequiredMessage: string;
    contactEmailInvalidMessage: string;
    contactMessageRequiredMessage: string;
    contactCaptchaRequiredMessage: string;
    contactCaptchaNotReadyMessage: string;
    contactCaptchaConfigMessage: string;
    contactSendingLabel: string;
    contactSuccessMessage: string;
    contactErrorMessage: string;
    contactSubmitLabel: string;
    contactDisclaimer: string;
    ctaLabel: string;
    ctaHref: string;
  };
};

export const DEFAULT_LANGUAGE: LanguageCode = "es";

export const LANGUAGE_OPTIONS: Array<{ code: LanguageCode; label: string }> = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ru", label: "Русский" },
  { code: "ko", label: "한국어" },
  { code: "hi", label: "हिन्दी" },
];

const sharedPlans: LocalizedPlan[] = [
  {
    name: "Starter",
    menuRange: "1-5 menus / sections",
    price: "USD 1,200",
    timeline: "5-7 business days",
    highlights: [
      "Voice navigation for core routes",
      "Backend contract setup (3 Navai endpoints)",
      "Basic intent tuning + QA handoff",
    ],
  },
  {
    name: "Growth",
    menuRange: "6-15 menus / sections",
    price: "USD 2,900",
    timeline: "2-3 weeks",
    highlights: [
      "Expanded route map and synonym coverage",
      "Frontend + backend tools execution bridge",
      "Observability events + production checklist",
    ],
  },
  {
    name: "Scale",
    menuRange: "16-35 menus / sections",
    price: "USD 5,800",
    timeline: "4-6 weeks",
    highlights: [
      "Complex navigation trees and fallback strategy",
      "Role-aware routing patterns",
      "Load and reliability hardening",
    ],
  },
  {
    name: "Enterprise",
    menuRange: "36+ menus / multi-app",
    price: "From USD 9,500",
    timeline: "Custom roadmap",
    highlights: [
      "Multi-surface architecture (web/mobile/backend)",
      "Dedicated rollout plan + enablement",
      "SLA and long-term support options",
    ],
  },
];

const baseMessages: AppMessages = {
  common: {
    languageLabel: "Language",
    themeLabel: "Theme",
    themeDark: "Dark",
    themeLight: "Light",
    searchDocsAria: "Search documentation",
    searchDocsPlaceholder: "Search docs...",
    searchDocsEmpty: "Type to search in documentation and implementation.",
    searchDocsSearching: "Searching...",
    searchDocsNoResults: "No results found.",
    searchDocsDocumentation: "Documentation",
    searchDocsImplementation: "Implementation",
    documentation: "Documentation",
    requestImplementation: "Request implementation",
    sourceRepository: "Source repository",
    home: "Home",
  },
  home: {
    documentationButton: "Documentation",
    implementationButton: "Request implementation",
  },
  mic: {
    apiKeyLabel: "OpenAI API Key",
    apiKeyPlaceholder: "Paste your OpenAI API Key",
    apiKeyNotice: "The API key you enter is not stored. It is only used to test NAVAI.",
    apiKeyNoticeRepoLabel: "View repository",
    ariaStart: "Start Navai voice session",
    ariaStop: "Stop Navai voice session",
    connecting: "Connecting voice session...",
    active: "Voice session active",
    activeDetail: "Voice session active. Speak now or tap to stop.",
    stopped: "Voice session stopped.",
    missingKey: "Set OPENAI_API_KEY in backend or provide an OpenAI API key.",
    frontendKeyDisabled:
      "Backend does not allow API keys from frontend. Set NAVAI_ALLOW_FRONTEND_API_KEY=true.",
    clientSecretRejected: "OpenAI rejected client_secret. Check API key and realtime model.",
    genericError: "Unable to start voice session.",
  },
  docsPage: {
    badge: "Product Documentation",
    title: "Navai Voice Runtime Docs",
    description:
      "Technical summary extracted from the official Luxisoft/Navai repository: architecture, HTTP contract, runtime flow, and environment setup.",
    sidebarTitle: "On this page",
    sections: [
      {
        id: "overview",
        title: "What Navai provides",
        description:
          "Navai is a voice-first runtime that lets an AI agent navigate app UI and execute allowed frontend/backend functions in real time.",
        bullets: [
          "Core packages: @navai/voice-backend, @navai/voice-frontend, @navai/voice-mobile.",
          "Backend mints secure ephemeral client_secret for OpenAI Realtime.",
          "Frontend runtime resolves routes and executes safe tool calls.",
        ],
      },
      {
        id: "http-contract",
        title: "Backend HTTP contract",
        description: "Official routes from backend integration:",
        bullets: [
          "POST /navai/realtime/client-secret",
          "GET /navai/functions",
          "POST /navai/functions/execute",
          "If backend has OPENAI_API_KEY, server key always has priority over request apiKey.",
        ],
      },
      {
        id: "runtime-flow",
        title: "Realtime flow",
        description: "Documented runtime sequence used by playground integrations:",
        bullets: [
          "1) Client requests ephemeral secret from backend.",
          "2) Client fetches backend function registry.",
          "3) Agent is built with navigate_to + execute_app_function tools.",
          "4) RealtimeSession connects and executes navigation/function calls.",
        ],
      },
      {
        id: "env",
        title: "Key environment variables",
        description: "Most relevant variables from official docs:",
        bullets: [
          "OPENAI_API_KEY, OPENAI_REALTIME_MODEL, OPENAI_REALTIME_VOICE",
          "OPENAI_REALTIME_INSTRUCTIONS, OPENAI_REALTIME_LANGUAGE",
          "NAVAI_FUNCTIONS_FOLDERS, NAVAI_API_URL, NAVAI_ALLOW_FRONTEND_API_KEY",
        ],
      },
      {
        id: "quickstart",
        title: "Quick start commands",
        description: "Reference setup commands extracted from repository guides.",
        code: `npm install @navai/voice-backend @navai/voice-frontend @openai/agents zod
npx navai-setup-voice-frontend
navai-generate-web-loaders`,
      },
      {
        id: "sources",
        title: "Official source links",
        description: "Primary sources used for this page:",
        bullets: [
          "https://github.com/Luxisoft/navai",
          "packages/voice-backend/README.md",
          "packages/voice-frontend/README.md",
          "apps/playground-api and apps/playground-web README files",
        ],
      },
    ],
  },
  implementationPage: {
    badge: "Professional Services",
    title: "Request Navai implementation",
    description:
      "We can implement voice navigation and function execution in your website/app with production-ready routing, security, and handoff.",
    sidebarTitle: "Service scope",
    sections: [
      {
        id: "what-you-get",
        title: "What is included",
        description: "Delivery scope for every plan:",
        bullets: [
          "Integration of Navai backend contract and frontend runtime.",
          "Route mapping and synonyms for your app structure.",
          "Validation, QA checklist, and go-live support.",
        ],
      },
      {
        id: "process",
        title: "Delivery process",
        description: "Typical implementation process:",
        bullets: [
          "Discovery call + route/function inventory.",
          "Technical implementation in staging environment.",
          "Acceptance testing and production rollout.",
        ],
      },
      {
        id: "pricing-note",
        title: "Pricing model",
        description:
          "Pricing is based on number of menus/routes, complexity of navigation logic, and required tool execution depth.",
      },
    ],
    plansTitle: "Implementation plans",
    plans: sharedPlans,
    whatsappButtonLabel: "Contact via WhatsApp",
    whatsappPrefill:
      "Hi Luxisoft, I want a quote to implement Navai voice navigation in my website or app.",
    contactSectionTitle: "Contact form",
    contactSectionDescription:
      "Share your project details and we will prepare a quote. This form opens an email addressed to quote@luxisoft.com.",
    contactNameLabel: "Full name",
    contactEmailLabel: "Work email",
    contactCompanyLabel: "Company (optional)",
    contactWhatsappLabel: "WhatsApp number (optional)",
    contactMessageLabel: "Project details",
    contactNameRequiredMessage: "Name is required.",
    contactEmailRequiredMessage: "Email is required.",
    contactEmailInvalidMessage: "Invalid email address.",
    contactMessageRequiredMessage: "Project details are required.",
    contactCaptchaRequiredMessage: "Complete hCaptcha before sending.",
    contactCaptchaNotReadyMessage: "hCaptcha is not ready yet. Try again in a few seconds.",
    contactCaptchaConfigMessage: "hCaptcha site key is not configured.",
    contactSendingLabel: "Sending...",
    contactSuccessMessage: "Your request was sent successfully.",
    contactErrorMessage: "Unable to send your request. Please try again.",
    contactSubmitLabel: "Send quote request",
    contactDisclaimer: "Your request is sent securely to quote@luxisoft.com.",
    ctaLabel: "Request proposal",
    ctaHref: "mailto:quote@luxisoft.com?subject=Navai%20Implementation%20Request",
  },
};

type Override = {
  common?: Partial<AppMessages["common"]>;
  home?: Partial<AppMessages["home"]>;
  mic?: Partial<AppMessages["mic"]>;
  docsPage?: Partial<Pick<AppMessages["docsPage"], "badge" | "title" | "description" | "sidebarTitle">>;
  implementationPage?: Partial<
    Pick<
      AppMessages["implementationPage"],
      | "badge"
      | "title"
      | "description"
      | "sidebarTitle"
      | "plansTitle"
      | "whatsappButtonLabel"
      | "whatsappPrefill"
      | "contactSectionTitle"
      | "contactSectionDescription"
      | "contactNameLabel"
      | "contactEmailLabel"
      | "contactCompanyLabel"
      | "contactWhatsappLabel"
      | "contactMessageLabel"
      | "contactNameRequiredMessage"
      | "contactEmailRequiredMessage"
      | "contactEmailInvalidMessage"
      | "contactMessageRequiredMessage"
      | "contactCaptchaRequiredMessage"
      | "contactCaptchaNotReadyMessage"
      | "contactCaptchaConfigMessage"
      | "contactSendingLabel"
      | "contactSuccessMessage"
      | "contactErrorMessage"
      | "contactSubmitLabel"
      | "contactDisclaimer"
      | "ctaLabel"
    >
  >;
};

const overrides: Record<Exclude<LanguageCode, "en">, Override> = {
  es: {
    common: {
      languageLabel: "Idioma",
      themeLabel: "Tema",
      themeDark: "Oscuro",
      themeLight: "Claro",
      searchDocsAria: "Buscar en documentación",
      searchDocsPlaceholder: "Buscar docs...",
      searchDocsEmpty: "Escribe para buscar en documentación e implementación.",
      searchDocsSearching: "Buscando...",
      searchDocsNoResults: "No se encontraron resultados.",
      searchDocsDocumentation: "Documentación",
      searchDocsImplementation: "Implementación",
      documentation: "Documentación",
      requestImplementation: "Pedir implementación",
      sourceRepository: "Repositorio fuente",
      home: "Inicio",
    },
    home: { documentationButton: "Documentación", implementationButton: "Pedir implementación" },
    mic: {
      apiKeyLabel: "API KEY de OpenAI",
      apiKeyPlaceholder: "Pega tu API KEY de OpenAI",
      apiKeyNotice: "La API KEY que ingreses no se almacena. Solo se usa para probar el funcionamiento de NAVAI.",
      apiKeyNoticeRepoLabel: "Ver repositorio",
      ariaStart: "Iniciar sesión de voz con Navai",
      ariaStop: "Detener sesión de voz de Navai",
      connecting: "Conectando sesión de voz...",
      active: "Sesión de voz activa",
      activeDetail: "Sesión de voz activa. Habla ahora o toca el botón para detener.",
      stopped: "Sesión de voz detenida.",
      missingKey: "Configura OPENAI_API_KEY en backend o ingresa una API key de OpenAI.",
      frontendKeyDisabled: "El backend no permite API keys desde frontend. Activa NAVAI_ALLOW_FRONTEND_API_KEY=true.",
      clientSecretRejected: "OpenAI rechazó el client_secret. Verifica API key y modelo realtime.",
      genericError: "No se pudo iniciar la sesión de voz.",
    },
    docsPage: {
      badge: "Documentación del Producto",
      title: "Documentación de Navai Voice Runtime",
      description:
        "Resumen técnico extraído del repositorio oficial Luxisoft/Navai: arquitectura, contrato HTTP, flujo runtime y configuración.",
      sidebarTitle: "En esta página",
    },
    implementationPage: {
      badge: "Servicios Profesionales",
      title: "Pedir implementación de Navai",
      description:
        "Implementamos navegación por voz y ejecución de funciones en tu sitio/app con configuración lista para producción.",
      sidebarTitle: "Alcance del servicio",
      plansTitle: "Planes de implementación",
      whatsappButtonLabel: "Contactar por WhatsApp",
      whatsappPrefill: "Hola Luxisoft, quiero una cotización para implementar Navai en mi sitio web o aplicación.",
      contactSectionTitle: "Formulario de contacto",
      contactSectionDescription:
        "Comparte los detalles de tu proyecto y te prepararemos una cotización. Este formulario abre un correo a quote@luxisoft.com.",
      contactNameLabel: "Nombre completo",
      contactEmailLabel: "Correo de trabajo",
      contactCompanyLabel: "Empresa (opcional)",
      contactWhatsappLabel: "Número de WhatsApp (opcional)",
      contactMessageLabel: "Detalles del proyecto",
      contactNameRequiredMessage: "El nombre es obligatorio.",
      contactEmailRequiredMessage: "El correo es obligatorio.",
      contactEmailInvalidMessage: "Correo inválido.",
      contactMessageRequiredMessage: "Los detalles del proyecto son obligatorios.",
      contactCaptchaRequiredMessage: "Completa hCaptcha antes de enviar.",
      contactCaptchaNotReadyMessage: "hCaptcha aún no está listo. Intenta de nuevo en unos segundos.",
      contactCaptchaConfigMessage: "hCaptcha no está configurado.",
      contactSendingLabel: "Enviando...",
      contactSuccessMessage: "Tu solicitud se envió correctamente.",
      contactErrorMessage: "No se pudo enviar tu solicitud. Intenta de nuevo.",
      contactSubmitLabel: "Enviar solicitud de cotización",
      contactDisclaimer: "Tu solicitud se envía de forma segura a quote@luxisoft.com.",
      ctaLabel: "Solicitar propuesta",
    },
  },
  fr: {
    common: {
      languageLabel: "Langue",
      documentation: "Documentation",
      requestImplementation: "Demander une implémentation",
      sourceRepository: "Référentiel source",
      home: "Accueil",
    },
    home: { documentationButton: "Documentation", implementationButton: "Demander une implémentation" },
    mic: {
      apiKeyLabel: "Clé API OpenAI",
      apiKeyPlaceholder: "Collez votre clé API OpenAI",
      apiKeyNotice:
        "La clé API saisie n'est pas stockée. Elle est utilisée uniquement pour tester NAVAI.",
      apiKeyNoticeRepoLabel: "Voir le dépôt",
    },
    docsPage: {
      badge: "Documentation Produit",
      title: "Documentation Navai Voice Runtime",
      description: "Résumé technique du dépôt officiel Luxisoft/Navai.",
      sidebarTitle: "Sur cette page",
    },
    implementationPage: {
      badge: "Services Professionnels",
      title: "Demander une implémentation Navai",
      description: "Intégration voice-ready pour votre web/app.",
      sidebarTitle: "Portée du service",
      plansTitle: "Plans d'implémentation",
      ctaLabel: "Demander une proposition",
    },
  },
  pt: {
    common: {
      languageLabel: "Idioma",
      documentation: "Documentação",
      requestImplementation: "Solicitar implementação",
      sourceRepository: "Repositório de origem",
      home: "Início",
    },
    home: { documentationButton: "Documentação", implementationButton: "Solicitar implementação" },
    mic: {
      apiKeyLabel: "Chave de API da OpenAI",
      apiKeyPlaceholder: "Cole sua chave de API da OpenAI",
      apiKeyNotice:
        "A chave de API informada não é armazenada. Ela é usada somente para testar o NAVAI.",
      apiKeyNoticeRepoLabel: "Ver repositório",
    },
    docsPage: {
      badge: "Documentação do Produto",
      title: "Navai Voice Runtime Docs",
      description: "Resumo técnico do repositório oficial Luxisoft/Navai.",
      sidebarTitle: "Nesta página",
    },
    implementationPage: {
      badge: "Serviços Profissionais",
      title: "Solicitar implementação Navai",
      description: "Integração de voz pronta para produção no seu site/app.",
      sidebarTitle: "Escopo do serviço",
      plansTitle: "Planos de implementação",
      ctaLabel: "Solicitar proposta",
    },
  },
  zh: {
    common: {
      languageLabel: "语言",
      documentation: "文档",
      requestImplementation: "请求实施",
      sourceRepository: "源码仓库",
      home: "首页",
    },
    home: { documentationButton: "文档", implementationButton: "请求实施" },
    mic: {
      apiKeyLabel: "OpenAI API 密钥",
      apiKeyPlaceholder: "粘贴你的 OpenAI API 密钥",
      apiKeyNotice: "你输入的 API 密钥不会被存储，仅用于测试 NAVAI。",
      apiKeyNoticeRepoLabel: "查看仓库",
    },
    docsPage: {
      badge: "产品文档",
      title: "Navai Voice Runtime 文档",
      description: "基于官方 Luxisoft/Navai 仓库整理的技术摘要。",
      sidebarTitle: "目录",
    },
    implementationPage: {
      badge: "专业服务",
      title: "请求 Navai 实施",
      description: "为你的网站/应用提供可上线的语音实现。",
      sidebarTitle: "服务范围",
      plansTitle: "实施套餐",
      ctaLabel: "获取报价",
    },
  },
  ja: {
    common: {
      languageLabel: "言語",
      documentation: "ドキュメント",
      requestImplementation: "導入依頼",
      sourceRepository: "ソースリポジトリ",
      home: "ホーム",
    },
    home: { documentationButton: "ドキュメント", implementationButton: "導入依頼" },
    mic: {
      apiKeyLabel: "OpenAI APIキー",
      apiKeyPlaceholder: "OpenAI APIキーを貼り付け",
      apiKeyNotice:
        "入力したAPIキーは保存されません。NAVAIの動作確認のためだけに使用されます。",
      apiKeyNoticeRepoLabel: "リポジトリを見る",
    },
    docsPage: {
      badge: "製品ドキュメント",
      title: "Navai Voice Runtime ドキュメント",
      description: "公式 Luxisoft/Navai リポジトリに基づく技術要約。",
      sidebarTitle: "このページ",
    },
    implementationPage: {
      badge: "プロフェッショナルサービス",
      title: "Navai 導入のご相談",
      description: "Web/アプリへの音声導入を本番品質で実装します。",
      sidebarTitle: "サービス範囲",
      plansTitle: "導入プラン",
      ctaLabel: "見積もりを依頼",
    },
  },
  ru: {
    common: {
      languageLabel: "Язык",
      documentation: "Документация",
      requestImplementation: "Заказать внедрение",
      sourceRepository: "Исходный репозиторий",
      home: "Главная",
    },
    home: { documentationButton: "Документация", implementationButton: "Заказать внедрение" },
    mic: {
      apiKeyLabel: "API-ключ OpenAI",
      apiKeyPlaceholder: "Вставьте API-ключ OpenAI",
      apiKeyNotice:
        "Введенный API-ключ не сохраняется. Он используется только для проверки работы NAVAI.",
      apiKeyNoticeRepoLabel: "Открыть репозиторий",
    },
    docsPage: {
      badge: "Документация продукта",
      title: "Документация Navai Voice Runtime",
      description: "Техническое резюме на основе официального репозитория Luxisoft/Navai.",
      sidebarTitle: "Содержание",
    },
    implementationPage: {
      badge: "Профессиональные услуги",
      title: "Заказать внедрение Navai",
      description: "Реализация голосовой навигации для сайта/приложения.",
      sidebarTitle: "Объем работ",
      plansTitle: "Планы внедрения",
      ctaLabel: "Запросить предложение",
    },
  },
  ko: {
    common: {
      languageLabel: "언어",
      documentation: "문서",
      requestImplementation: "구현 문의",
      sourceRepository: "소스 저장소",
      home: "홈",
    },
    home: { documentationButton: "문서", implementationButton: "구현 문의" },
    mic: {
      apiKeyLabel: "OpenAI API 키",
      apiKeyPlaceholder: "OpenAI API 키를 입력하세요",
      apiKeyNotice:
        "입력한 API 키는 저장되지 않으며, NAVAI 동작 테스트에만 사용됩니다.",
      apiKeyNoticeRepoLabel: "저장소 보기",
    },
    docsPage: {
      badge: "제품 문서",
      title: "Navai Voice Runtime 문서",
      description: "공식 Luxisoft/Navai 저장소 기반 기술 요약.",
      sidebarTitle: "이 페이지",
    },
    implementationPage: {
      badge: "전문 서비스",
      title: "Navai 구현 요청",
      description: "웹/앱에 음성 내비게이션을 프로덕션 수준으로 구현합니다.",
      sidebarTitle: "서비스 범위",
      plansTitle: "구현 플랜",
      ctaLabel: "견적 요청",
    },
  },
  hi: {
    common: {
      languageLabel: "भाषा",
      documentation: "डॉक्यूमेंटेशन",
      requestImplementation: "इम्प्लीमेंटेशन अनुरोध",
      sourceRepository: "सोर्स रिपॉजिटरी",
      home: "होम",
    },
    home: { documentationButton: "डॉक्यूमेंटेशन", implementationButton: "इम्प्लीमेंटेशन अनुरोध" },
    mic: {
      apiKeyLabel: "OpenAI API कुंजी",
      apiKeyPlaceholder: "अपनी OpenAI API कुंजी पेस्ट करें",
      apiKeyNotice:
        "आपकी दर्ज की गई API कुंजी संग्रहीत नहीं की जाती। इसका उपयोग केवल NAVAI का परीक्षण करने के लिए होता है।",
      apiKeyNoticeRepoLabel: "रिपॉजिटरी देखें",
    },
    docsPage: {
      badge: "प्रोडक्ट डॉक्यूमेंटेशन",
      title: "Navai Voice Runtime दस्तावेज़",
      description: "Luxisoft/Navai आधिकारिक रिपॉजिटरी से तकनीकी सारांश।",
      sidebarTitle: "इस पेज पर",
    },
    implementationPage: {
      badge: "प्रोफेशनल सर्विस",
      title: "Navai इम्प्लीमेंटेशन अनुरोध",
      description: "आपके वेबसाइट/ऐप में प्रोडक्शन-रेडी वॉइस इंटीग्रेशन।",
      sidebarTitle: "सेवा दायरा",
      plansTitle: "इम्प्लीमेंटेशन प्लान",
      ctaLabel: "प्रस्ताव मांगें",
    },
  },
};

function applyOverride(override: Override): AppMessages {
  return {
    common: { ...baseMessages.common, ...override.common },
    home: { ...baseMessages.home, ...override.home },
    mic: { ...baseMessages.mic, ...override.mic },
    docsPage: { ...baseMessages.docsPage, ...override.docsPage, sections: baseMessages.docsPage.sections },
    implementationPage: {
      ...baseMessages.implementationPage,
      ...override.implementationPage,
      sections: baseMessages.implementationPage.sections,
      plans: baseMessages.implementationPage.plans,
      ctaHref: baseMessages.implementationPage.ctaHref,
    },
  };
}

export const APP_MESSAGES: Record<LanguageCode, AppMessages> = {
  en: baseMessages,
  es: applyOverride(overrides.es),
  fr: applyOverride(overrides.fr),
  pt: applyOverride(overrides.pt),
  zh: applyOverride(overrides.zh),
  ja: applyOverride(overrides.ja),
  ru: applyOverride(overrides.ru),
  ko: applyOverride(overrides.ko),
  hi: applyOverride(overrides.hi),
};
