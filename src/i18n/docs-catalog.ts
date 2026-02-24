import type { LanguageCode } from "@/i18n/messages";

export type NavaiDocSlug =
  | "home"
  | "installation-api"
  | "installation-web"
  | "installation-mobile"
  | "playground-api"
  | "playground-web"
  | "playground-mobile"
  | "playground-stores"
  | "voice-backend"
  | "voice-frontend"
  | "voice-mobile";

export type NavaiDocGroupKey = "home" | "installation" | "demo" | "examples" | "libraries";

type LocalizedDocEntry = {
  title: string;
  summary: string;
};

export type LocalizedNavaiDocs = {
  groupLabels: Partial<Record<NavaiDocGroupKey, string>>;
  entries: Partial<Record<NavaiDocSlug, LocalizedDocEntry>>;
};

const ENGLISH_DOCS: LocalizedNavaiDocs = {
  groupLabels: {
    home: "Home",
    installation: "Installation",
    demo: "Demo",
    libraries: "Libraries",
  },
  entries: {
    home: {
      title: "Home",
      summary: "Project overview, framework coverage, supported platforms, and architecture baseline.",
    },
    "installation-api": {
      title: "API",
      summary:
        "Backend setup with @navai/voice-backend, minimal environment variables, and Express route registration.",
    },
    "installation-web": {
      title: "Web",
      summary:
        "Frontend setup with @navai/voice-frontend, NAVAI environment variables, and base navigation wiring.",
    },
    "installation-mobile": {
      title: "Mobile",
      summary:
        "Mobile setup with @navai/voice-mobile, NAVAI environment variables, and module loader generation.",
    },
    "playground-api": {
      title: "API",
      summary: "Express demo backend: client_secret creation, function registry, and backend tool execution.",
    },
    "playground-web": {
      title: "Web",
      summary: "Reference React frontend for voice navigation, dynamic function loading, and realtime flow.",
    },
    "playground-mobile": {
      title: "Mobile",
      summary: "React Native/Expo reference with VoiceNavigator, local tools, and NAVAI backend integration.",
    },
    "playground-stores": {
      title: "Stores",
      summary:
        "Interactive ecommerce demo with read-only SQLite seed data, localStorage product CRUD, purchases, and NAVAI reports.",
    },
    "voice-backend": {
      title: "@navai/voice-backend",
      summary: "Official backend contract: realtime routes, dynamic function loading, and environment rules.",
    },
    "voice-frontend": {
      title: "@navai/voice-frontend",
      summary: "Official web runtime for voice agents with navigation, local tools, and backend function bridge.",
    },
    "voice-mobile": {
      title: "@navai/voice-mobile",
      summary:
        "Official mobile runtime for React Native voice agents with WebRTC transport and session orchestration.",
    },
  },
};

const DOCS_BY_LANGUAGE: Record<LanguageCode, LocalizedNavaiDocs> = {
  en: ENGLISH_DOCS,
  es: {
    groupLabels: {
      home: "Inicio",
      installation: "Instalación",
      demo: "Demo",
      libraries: "Librerías",
    },
    entries: {
      home: {
        title: "Inicio",
        summary: "Vista general del proyecto, cobertura de frameworks, plataformas compatibles y arquitectura base.",
      },
      "installation-api": {
        title: "API",
        summary:
          "Instalación backend con @navai/voice-backend, variables mínimas y registro de rutas en Express.",
      },
      "installation-web": {
        title: "Web",
        summary:
          "Instalación frontend con @navai/voice-frontend, variables NAVAI y configuración de navegación base.",
      },
      "installation-mobile": {
        title: "Mobile",
        summary:
          "Instalación mobile con @navai/voice-mobile, variables NAVAI y generación de module loaders.",
      },
      "playground-api": {
        title: "API",
        summary: "Backend de demo con Express: client_secret, registro de funciones y ejecución de tools backend.",
      },
      "playground-web": {
        title: "Web",
        summary: "Frontend React de referencia para navegación por voz, carga dinámica de funciones y flujo realtime.",
      },
      "playground-mobile": {
        title: "Mobile",
        summary: "Referencia React Native/Expo con VoiceNavigator, tools locales e integración con backend NAVAI.",
      },
      "voice-backend": {
        title: "@navai/voice-backend",
        summary: "Contrato backend oficial: rutas realtime, carga dinámica de funciones y reglas de entorno.",
      },
      "voice-frontend": {
        title: "@navai/voice-frontend",
        summary: "Runtime web oficial para agentes de voz con navegación, tools locales y puente backend.",
      },
      "voice-mobile": {
        title: "@navai/voice-mobile",
        summary: "Runtime mobile oficial para React Native con transporte WebRTC y orquestación de sesiones.",
      },
    },
  },
  fr: {
    groupLabels: {
      home: "Accueil",
      installation: "Installation",
      demo: "Démo",
      libraries: "Bibliothèques",
    },
    entries: {
      home: {
        title: "Accueil",
        summary:
          "Vue d'ensemble du projet, couverture des frameworks, plateformes prises en charge et architecture de base.",
      },
      "installation-api": {
        title: "API",
        summary:
          "Configuration backend avec @navai/voice-backend, variables minimales et enregistrement des routes Express.",
      },
      "installation-web": {
        title: "Web",
        summary:
          "Configuration frontend avec @navai/voice-frontend, variables NAVAI et structure de navigation de base.",
      },
      "installation-mobile": {
        title: "Mobile",
        summary:
          "Configuration mobile avec @navai/voice-mobile, variables NAVAI et génération des module loaders.",
      },
      "playground-api": {
        title: "API",
        summary: "Backend de démonstration Express: client_secret, registre de fonctions et exécution des tools backend.",
      },
      "playground-web": {
        title: "Web",
        summary:
          "Frontend React de référence pour la navigation vocale, le chargement dynamique des fonctions et le flux realtime.",
      },
      "playground-mobile": {
        title: "Mobile",
        summary:
          "Référence React Native/Expo avec VoiceNavigator, tools locaux et intégration backend NAVAI.",
      },
      "voice-backend": {
        title: "@navai/voice-backend",
        summary:
          "Contrat backend officiel: routes realtime, chargement dynamique des fonctions et règles d'environnement.",
      },
      "voice-frontend": {
        title: "@navai/voice-frontend",
        summary: "Runtime web officiel pour agents vocaux avec navigation, tools locaux et pont backend.",
      },
      "voice-mobile": {
        title: "@navai/voice-mobile",
        summary: "Runtime mobile officiel pour React Native avec transport WebRTC et orchestration de session.",
      },
    },
  },
  pt: {
    groupLabels: {
      home: "Início",
      installation: "Instalação",
      demo: "Demo",
      libraries: "Bibliotecas",
    },
    entries: {
      home: {
        title: "Início",
        summary:
          "Visão geral do projeto, cobertura de frameworks, plataformas suportadas e arquitetura base.",
      },
      "installation-api": {
        title: "API",
        summary:
          "Configuração backend com @navai/voice-backend, variáveis mínimas e registro de rotas no Express.",
      },
      "installation-web": {
        title: "Web",
        summary:
          "Configuração frontend com @navai/voice-frontend, variáveis NAVAI e estrutura base de navegação.",
      },
      "installation-mobile": {
        title: "Mobile",
        summary:
          "Configuração mobile com @navai/voice-mobile, variáveis NAVAI e geração de module loaders.",
      },
      "playground-api": {
        title: "API",
        summary: "Backend demo com Express: client_secret, registro de funções e execução de tools backend.",
      },
      "playground-web": {
        title: "Web",
        summary: "Frontend React de referência para navegação por voz, carga dinâmica de funções e fluxo realtime.",
      },
      "playground-mobile": {
        title: "Mobile",
        summary: "Referência React Native/Expo com VoiceNavigator, tools locais e integração com backend NAVAI.",
      },
      "voice-backend": {
        title: "@navai/voice-backend",
        summary: "Contrato backend oficial: rotas realtime, carga dinâmica de funções e regras de ambiente.",
      },
      "voice-frontend": {
        title: "@navai/voice-frontend",
        summary: "Runtime web oficial para agentes de voz com navegação, tools locais e ponte backend.",
      },
      "voice-mobile": {
        title: "@navai/voice-mobile",
        summary: "Runtime mobile oficial para React Native com transporte WebRTC e orquestração de sessão.",
      },
    },
  },
  zh: {
    groupLabels: {
      home: "首页",
      installation: "安装",
      demo: "演示",
      libraries: "库",
    },
    entries: {
      home: {
        title: "首页",
        summary: "项目概览、框架覆盖、支持平台与基础架构说明。",
      },
      "installation-api": {
        title: "API",
        summary: "使用 @navai/voice-backend 的后端安装：最小环境变量与 Express 路由注册。",
      },
      "installation-web": {
        title: "网页",
        summary: "使用 @navai/voice-frontend 的前端安装：NAVAI 变量与基础导航配置。",
      },
      "installation-mobile": {
        title: "移动端",
        summary: "使用 @navai/voice-mobile 的移动端安装：NAVAI 变量与模块加载器生成。",
      },
      "playground-api": {
        title: "API",
        summary: "Express 演示后端：client_secret、函数注册与后端工具执行。",
      },
      "playground-web": {
        title: "网页",
        summary: "React 演示前端：语音导航、函数动态加载与 realtime 流程。",
      },
      "playground-mobile": {
        title: "移动端",
        summary: "React Native/Expo 演示：VoiceNavigator、本地工具与 NAVAI 后端集成。",
      },
      "voice-backend": {
        title: "@navai/voice-backend",
        summary: "官方后端协议：realtime 路由、动态函数加载与环境规则。",
      },
      "voice-frontend": {
        title: "@navai/voice-frontend",
        summary: "官方 Web 语音运行时：导航、本地工具与后端桥接。",
      },
      "voice-mobile": {
        title: "@navai/voice-mobile",
        summary: "官方移动语音运行时：React Native + WebRTC 传输与会话编排。",
      },
    },
  },
  ja: {
    groupLabels: {
      home: "ホーム",
      installation: "インストール",
      demo: "デモ",
      libraries: "ライブラリ",
    },
    entries: {
      home: {
        title: "ホーム",
        summary: "プロジェクト概要、対応フレームワーク、対応プラットフォーム、基本アーキテクチャ。",
      },
      "installation-api": {
        title: "API",
        summary: "@navai/voice-backend を使ったバックエンド導入：最小環境変数と Express ルート登録。",
      },
      "installation-web": {
        title: "Web",
        summary: "@navai/voice-frontend を使ったフロントエンド導入：NAVAI 変数と基本ナビゲーション。",
      },
      "installation-mobile": {
        title: "Mobile",
        summary: "@navai/voice-mobile を使ったモバイル導入：NAVAI 変数とモジュールローダー生成。",
      },
      "playground-api": {
        title: "API",
        summary: "Express デモバックエンド：client_secret、関数レジストリ、バックエンドツール実行。",
      },
      "playground-web": {
        title: "Web",
        summary: "React デモフロントエンド：音声ナビゲーション、関数の動的ロード、realtime フロー。",
      },
      "playground-mobile": {
        title: "Mobile",
        summary: "React Native/Expo デモ：VoiceNavigator、ローカルツール、NAVAI バックエンド連携。",
      },
      "voice-backend": {
        title: "@navai/voice-backend",
        summary: "公式バックエンド契約：realtime ルート、動的関数ロード、環境ルール。",
      },
      "voice-frontend": {
        title: "@navai/voice-frontend",
        summary: "公式 Web 音声ランタイム：ナビゲーション、ローカルツール、バックエンド連携。",
      },
      "voice-mobile": {
        title: "@navai/voice-mobile",
        summary: "公式モバイル音声ランタイム：React Native + WebRTC とセッション制御。",
      },
    },
  },
  ru: {
    groupLabels: {
      home: "Главная",
      installation: "Установка",
      demo: "Демо",
      libraries: "Библиотеки",
    },
    entries: {
      home: {
        title: "Главная",
        summary: "Обзор проекта, покрытие фреймворков, поддерживаемые платформы и базовая архитектура.",
      },
      "installation-api": {
        title: "API",
        summary: "Настройка backend с @navai/voice-backend: минимальные переменные окружения и маршруты Express.",
      },
      "installation-web": {
        title: "Веб",
        summary: "Настройка frontend с @navai/voice-frontend: переменные NAVAI и базовая схема навигации.",
      },
      "installation-mobile": {
        title: "Мобайл",
        summary: "Настройка mobile с @navai/voice-mobile: переменные NAVAI и генерация module loaders.",
      },
      "playground-api": {
        title: "API",
        summary: "Демо backend на Express: client_secret, реестр функций и выполнение backend tools.",
      },
      "playground-web": {
        title: "Веб",
        summary: "Референсный React frontend: голосовая навигация, динамическая загрузка функций и realtime-поток.",
      },
      "playground-mobile": {
        title: "Мобайл",
        summary: "Референс React Native/Expo: VoiceNavigator, локальные tools и интеграция с backend NAVAI.",
      },
      "voice-backend": {
        title: "@navai/voice-backend",
        summary: "Официальный backend-контракт: realtime маршруты, динамическая загрузка функций и правила окружения.",
      },
      "voice-frontend": {
        title: "@navai/voice-frontend",
        summary: "Официальный web runtime для голосовых агентов: навигация, локальные tools и backend bridge.",
      },
      "voice-mobile": {
        title: "@navai/voice-mobile",
        summary: "Официальный mobile runtime для React Native: WebRTC транспорт и оркестрация сессий.",
      },
    },
  },
  ko: {
    groupLabels: {
      home: "홈",
      installation: "설치",
      demo: "데모",
      libraries: "라이브러리",
    },
    entries: {
      home: {
        title: "홈",
        summary: "프로젝트 개요, 프레임워크 지원 범위, 지원 플랫폼, 기본 아키텍처를 제공합니다.",
      },
      "installation-api": {
        title: "API",
        summary: "@navai/voice-backend 백엔드 설치: 최소 환경 변수와 Express 라우트 등록.",
      },
      "installation-web": {
        title: "웹",
        summary: "@navai/voice-frontend 프런트엔드 설치: NAVAI 변수와 기본 내비게이션 구성.",
      },
      "installation-mobile": {
        title: "모바일",
        summary: "@navai/voice-mobile 모바일 설치: NAVAI 변수와 모듈 로더 생성.",
      },
      "playground-api": {
        title: "API",
        summary: "Express 데모 백엔드: client_secret, 함수 레지스트리, 백엔드 툴 실행.",
      },
      "playground-web": {
        title: "웹",
        summary: "React 데모 프런트엔드: 음성 내비게이션, 함수 동적 로딩, realtime 흐름.",
      },
      "playground-mobile": {
        title: "모바일",
        summary: "React Native/Expo 데모: VoiceNavigator, 로컬 툴, NAVAI 백엔드 연동.",
      },
      "voice-backend": {
        title: "@navai/voice-backend",
        summary: "공식 백엔드 계약: realtime 라우트, 동적 함수 로딩, 환경 규칙.",
      },
      "voice-frontend": {
        title: "@navai/voice-frontend",
        summary: "공식 웹 음성 런타임: 내비게이션, 로컬 툴, 백엔드 브리지.",
      },
      "voice-mobile": {
        title: "@navai/voice-mobile",
        summary: "공식 모바일 음성 런타임: React Native + WebRTC 전송 및 세션 오케스트레이션.",
      },
    },
  },
  hi: {
    groupLabels: {
      home: "होम",
      installation: "इंस्टॉलेशन",
      demo: "डेमो",
      libraries: "लाइब्रेरी",
    },
    entries: {
      home: {
        title: "होम",
        summary: "प्रोजेक्ट ओवरव्यू, फ्रेमवर्क कवरेज, समर्थित प्लेटफॉर्म और बेस आर्किटेक्चर।",
      },
      "installation-api": {
        title: "API",
        summary: "@navai/voice-backend के साथ बैकएंड सेटअप: न्यूनतम एनवायरनमेंट वैरिएबल और Express रूट रजिस्ट्रेशन।",
      },
      "installation-web": {
        title: "वेब",
        summary: "@navai/voice-frontend के साथ फ्रंटएंड सेटअप: NAVAI वैरिएबल और बेस नेविगेशन कॉन्फ़िगरेशन।",
      },
      "installation-mobile": {
        title: "मोबाइल",
        summary: "@navai/voice-mobile के साथ मोबाइल सेटअप: NAVAI वैरिएबल और मॉड्यूल लोडर जनरेशन।",
      },
      "playground-api": {
        title: "API",
        summary: "Express डेमो बैकएंड: client_secret, फ़ंक्शन रजिस्ट्री और बैकएंड टूल एग्ज़िक्यूशन।",
      },
      "playground-web": {
        title: "वेब",
        summary: "React रेफरेंस फ्रंटएंड: वॉइस नेविगेशन, डायनामिक फ़ंक्शन लोडिंग और realtime फ्लो।",
      },
      "playground-mobile": {
        title: "मोबाइल",
        summary: "React Native/Expo रेफरेंस: VoiceNavigator, लोकल टूल्स और NAVAI बैकएंड इंटीग्रेशन।",
      },
      "voice-backend": {
        title: "@navai/voice-backend",
        summary: "ऑफिशियल बैकएंड कॉन्ट्रैक्ट: realtime रूट्स, डायनामिक फ़ंक्शन लोडिंग और एनवायरनमेंट नियम।",
      },
      "voice-frontend": {
        title: "@navai/voice-frontend",
        summary: "ऑफिशियल वेब वॉइस रनटाइम: नेविगेशन, लोकल टूल्स और बैकएंड ब्रिज।",
      },
      "voice-mobile": {
        title: "@navai/voice-mobile",
        summary: "ऑफिशियल मोबाइल वॉइस रनटाइम: React Native + WebRTC ट्रांसपोर्ट और सेशन ऑर्केस्ट्रेशन।",
      },
    },
  },
};

export function getLocalizedNavaiDocs(language: LanguageCode): LocalizedNavaiDocs {
  const base = DOCS_BY_LANGUAGE[language] ?? DOCS_BY_LANGUAGE.en;
  const groupLabelsByLanguage: Record<LanguageCode, string> = {
    en: "Examples",
    es: "Ejemplos",
    fr: "Exemples",
    pt: "Exemplos",
    zh: "示例",
    ja: "Examples",
    ru: "Примеры",
    ko: "예시",
    hi: "उदाहरण",
  };

  const storesEntryByLanguage: Record<LanguageCode, LocalizedDocEntry> = {
    en: {
      title: "Stores",
      summary:
        "Interactive ecommerce demo with read-only SQLite seed data, localStorage product CRUD, purchases, and NAVAI reports.",
    },
    es: {
      title: "Tiendas",
      summary:
        "Demo ecommerce interactiva con datos seed en SQLite (solo lectura), CRUD local en localStorage, compras simuladas y reportes con NAVAI.",
    },
    fr: {
      title: "Boutiques",
      summary:
        "Demo ecommerce interactive avec donnees SQLite seed en lecture seule, CRUD localStorage, achats simules et rapports NAVAI.",
    },
    pt: {
      title: "Lojas",
      summary:
        "Demo ecommerce interativa com dados seed em SQLite somente leitura, CRUD em localStorage, compras simuladas e relatorios NAVAI.",
    },
    zh: {
      title: "商店",
      summary: "交互式电商演示，使用只读 SQLite 种子数据、本地 localStorage CRUD、模拟购买和 NAVAI 报表。",
    },
    ja: {
      title: "ストア",
      summary: "読み取り専用 SQLite シードデータ、localStorage CRUD、購入シミュレーション、NAVAI レポートを含むECデモ。",
    },
    ru: {
      title: "Магазины",
      summary:
        "Интерактивная ecommerce-демо страница с SQLite seed (только чтение), CRUD в localStorage, симуляцией покупок и отчетами NAVAI.",
    },
    ko: {
      title: "스토어",
      summary: "읽기 전용 SQLite 시드 데이터, localStorage CRUD, 구매 시뮬레이션 및 NAVAI 리포트를 포함한 이커머스 데모.",
    },
    hi: {
      title: "स्टोर",
      summary:
        "रीड-ओनली SQLite seed डेटा, localStorage CRUD, खरीद सिमुलेशन और NAVAI रिपोर्ट्स के साथ इंटरैक्टिव ईकॉमर्स डेमो।",
    },
  };

  return {
    ...base,
    groupLabels: {
      ...base.groupLabels,
      examples: groupLabelsByLanguage[language] ?? groupLabelsByLanguage.en,
    },
    entries: {
      ...base.entries,
      "playground-stores": storesEntryByLanguage[language] ?? storesEntryByLanguage.en,
    },
  };
}
