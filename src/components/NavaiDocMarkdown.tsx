'use client';

import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import localizedMarkdownRaw from "@/content/navai-readmes/localized-markdown.json";
import type { LanguageCode } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";
import { buildStableHeadingId, cleanHeadingText } from "@/lib/heading-id";

type NavaiDocSlug =
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

type NavaiDocPage = {
  slug: NavaiDocSlug;
  sourcePath: string;
  markdown: string;
};

type NavaiDocMarkdownProps = {
  doc: NavaiDocPage;
};

const GITHUB_BLOB_BASE = "https://github.com/Luxisoft/navai/blob/main";
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/Luxisoft/navai/main";

const README_PATH_TO_SLUG = new Map<string, NavaiDocSlug>([
  ["README.md", "home"],
  ["README.es.md", "installation-api"],
  ["apps/playground-api/README.md", "playground-api"],
  ["apps/playground-web/README.md", "playground-web"],
  ["apps/playground-mobile/README.md", "playground-mobile"],
  ["packages/voice-backend/README.md", "voice-backend"],
  ["packages/voice-frontend/README.md", "voice-frontend"],
  ["packages/voice-mobile/README.md", "voice-mobile"],
]);

type LocalizedMarkdownMap = Partial<
  Record<NavaiDocSlug, Partial<Record<Exclude<LanguageCode, "en">, string>>>
>;

const LOCALIZED_MARKDOWN = localizedMarkdownRaw as LocalizedMarkdownMap;

const INLINE_LOCALIZED_MARKDOWN: LocalizedMarkdownMap = {
  "playground-stores": {
    es: `# Demo de Tiendas Ecommerce (SQLite + localStorage)

Esta pagina demuestra como NAVAI puede operar en un entorno ecommerce realista sin exponer ni modificar datos productivos.

## Modelo de seguridad

- El catalogo seed, clientes y ordenes vienen de una **base de datos SQLite de demo en solo lectura**.
- Los usuarios pueden consultar los datos seed y generar reportes con tools de NAVAI.
- Los usuarios no pueden editar ni eliminar productos seed.

## Datos generados por el usuario

- Los productos creados por visitantes se guardan solo en **localStorage**.
- Las ediciones, eliminaciones y compras simuladas de productos del usuario tambien quedan en localStorage.
- Esto mantiene la demo publica segura y evita contaminar la base seed compartida.

## Que probar con NAVAI

- Pedir reportes de ventas o catalogo con base en los datos seed en SQLite.
- Pedir a NAVAI listar productos, ordenes recientes o rendimiento por categoria.
- Pedir a NAVAI crear, editar, eliminar o comprar productos en esta pagina (acciones locales de demo).
- Pedir a NAVAI navegar y hacer scroll a secciones especificas como formularios o reportes.

## Secciones de la demo

- Dashboard de KPIs y reporte por categoria
- Catalogo combinado (seed + productos del usuario)
- Formulario CRUD para productos del usuario
- Simulador de compra
- Tabla de ordenes recientes seed
`,
    fr: `# Demo Boutiques Ecommerce (SQLite + localStorage)

Cette page montre comment NAVAI peut fonctionner dans un environnement ecommerce realiste sans exposer ni modifier des donnees de production.

## Modele de securite

- Le catalogue seed, les clients et les commandes proviennent d'une **base SQLite de demo en lecture seule**.
- Les utilisateurs peuvent consulter ces donnees et generer des rapports avec les tools NAVAI.
- Les utilisateurs ne peuvent pas modifier ou supprimer les produits seed.

## Donnees generees par l'utilisateur

- Les produits crees par les visiteurs sont stockes uniquement dans **localStorage**.
- Les modifications, suppressions et achats simules des produits utilisateur restent aussi dans localStorage.
- Cela protege la demo publique et evite de polluer la base seed partagee.

## Que tester avec NAVAI

- Demander des rapports de ventes ou de catalogue a partir des donnees SQLite seed.
- Demander a NAVAI la liste des produits, commandes recentes ou performances par categorie.
- Demander a NAVAI de creer, modifier, supprimer ou acheter des produits sur cette page (actions locales).
- Demander a NAVAI de naviguer et scroller vers des sections precises.

## Sections de demo

- Tableau de bord KPI et ventes par categorie
- Catalogue combine (seed + produits utilisateur)
- Formulaire CRUD pour produits utilisateur
- Simulateur d'achat
- Tableau des commandes seed recentes
`,
    pt: `# Demo de Lojas Ecommerce (SQLite + localStorage)

Esta pagina demonstra como o NAVAI pode operar em um ambiente ecommerce realista sem expor nem modificar dados de producao.

## Modelo de seguranca

- Catalogo seed, clientes e pedidos vem de um **banco SQLite de demo em somente leitura**.
- Usuarios podem consultar os dados seed e gerar relatorios com tools do NAVAI.
- Usuarios nao podem editar nem excluir produtos seed.

## Dados gerados pelo usuario

- Produtos criados pelos visitantes ficam apenas no **localStorage**.
- Edicoes, exclusoes e compras simuladas de produtos do usuario tambem ficam no localStorage.
- Isso protege a demo publica e evita poluir a base seed compartilhada.

## O que testar com NAVAI

- Pedir relatorios de vendas ou catalogo com base nos dados seed em SQLite.
- Pedir ao NAVAI para listar produtos, pedidos recentes ou desempenho por categoria.
- Pedir ao NAVAI para criar, editar, excluir ou comprar produtos nesta pagina (acoes locais).
- Pedir ao NAVAI para navegar e rolar para secoes especificas.

## Secoes da demo

- Dashboard de KPIs e vendas por categoria
- Catalogo combinado (seed + produtos do usuario)
- Formulario CRUD de produtos do usuario
- Simulador de compra
- Tabela de pedidos seed recentes
`,
    zh: `# 电商商店演示 (SQLite + localStorage)

此页面演示 NAVAI 如何在真实感电商环境中工作，同时不会暴露或修改真实生产数据。

## 安全模型

- 种子目录、客户和订单来自**只读 SQLite 演示数据库**。
- 用户可以查询种子数据，并通过 NAVAI 工具生成报表。
- 用户不能编辑或删除种子商品。

## 用户生成数据

- 访客创建的商品只保存在 **localStorage**。
- 用户商品的编辑、删除和模拟购买也只保存在 localStorage。
- 这样可保护公共演示，避免污染共享种子数据库。

## 可用 NAVAI 测试内容

- 基于 SQLite 种子数据请求销售或商品报表。
- 让 NAVAI 列出商品、最近订单或分类表现。
- 让 NAVAI 在此页面创建、编辑、删除或购买商品（本地演示操作）。
- 让 NAVAI 导航并滚动到表单或报表等指定区域。

## 演示区块

- KPI 仪表盘与分类销售报表
- 合并商品目录（种子 + 用户商品）
- 用户商品 CRUD 表单
- 购买模拟器
- 种子最近订单表
`,
    ja: `# ECストアデモ (SQLite + localStorage)

このページでは、実データを公開・変更せずに、NAVAI が現実的なEC環境で動作する方法を示します。

## セキュリティモデル

- シードカタログ、顧客、注文は**読み取り専用の SQLite デモDB**から取得されます。
- ユーザーはシードデータを参照し、NAVAI ツールでレポートを作成できます。
- シード商品は編集・削除できません。

## ユーザー生成データ

- 訪問者が作成した商品は **localStorage** のみに保存されます。
- ユーザー商品の編集・削除・購入シミュレーションも localStorage にのみ保存されます。
- これにより公開デモを安全に保ち、共有シードDBの汚染を防ぎます。

## NAVAI で試せること

- SQLite シードデータに基づく売上/カタログレポートの依頼
- 商品一覧、最近の注文、カテゴリ別パフォーマンスの取得
- このページでの商品の作成・編集・削除・購入（ローカル操作）
- フォームやレポートなど特定セクションへの移動とスクロール

## デモセクション

- KPIダッシュボードとカテゴリ別売上レポート
- 統合カタログ（シード + ユーザー商品）
- ユーザー商品CRUDフォーム
- 購入シミュレーター
- シード最近注文テーブル
`,
    ru: `# Демо Магазины Ecommerce (SQLite + localStorage)

Эта страница показывает, как NAVAI может работать в реалистичной ecommerce-среде без доступа к реальным данным и без их изменения.

## Модель безопасности

- Seed-каталог, клиенты и заказы берутся из **демо SQLite базы только для чтения**.
- Пользователь может запрашивать seed-данные и строить отчеты через tools NAVAI.
- Seed-продукты нельзя редактировать или удалять.

## Пользовательские данные

- Продукты, созданные посетителями, сохраняются только в **localStorage**.
- Изменения, удаления и симуляции покупок пользовательских продуктов также хранятся только в localStorage.
- Это защищает публичную демо-среду и не засоряет общую seed-базу.

## Что тестировать с NAVAI

- Запрашивать отчеты по продажам и каталогу на основе SQLite seed-данных.
- Просить NAVAI показать товары, последние заказы или эффективность категорий.
- Просить NAVAI создавать, редактировать, удалять и покупать товары на этой странице (локальные действия).
- Просить NAVAI переходить и скроллить к нужным секциям.

## Разделы демо

- KPI-панель и отчет по категориям
- Общий каталог (seed + пользовательские товары)
- CRUD-форма пользовательских товаров
- Симулятор покупки
- Таблица последних seed-заказов
`,
    ko: `# 이커머스 스토어 데모 (SQLite + localStorage)

이 페이지는 실제 운영 데이터를 노출하거나 수정하지 않고도 NAVAI가 현실적인 이커머스 환경에서 동작하는 방식을 보여줍니다.

## 보안 모델

- 시드 카탈로그, 고객, 주문은 **읽기 전용 SQLite 데모 데이터베이스**에서 제공됩니다.
- 사용자는 시드 데이터를 조회하고 NAVAI 도구로 리포트를 만들 수 있습니다.
- 시드 상품은 수정/삭제할 수 없습니다.

## 사용자 생성 데이터

- 방문자가 만든 상품은 **localStorage** 에만 저장됩니다.
- 사용자 상품의 수정, 삭제, 구매 시뮬레이션도 localStorage 에만 저장됩니다.
- 이를 통해 공개 데모를 안전하게 유지하고 공유 시드 DB 오염을 방지합니다.

## NAVAI 테스트 예시

- SQLite 시드 데이터를 기반으로 매출/카탈로그 리포트 요청
- NAVAI에게 상품, 최근 주문, 카테고리 성과 조회 요청
- 이 페이지에서 상품 생성/수정/삭제/구매 요청 (로컬 데모 동작)
- 폼/리포트 섹션으로 이동 및 스크롤 요청

## 데모 섹션

- KPI 대시보드 및 카테고리 매출 리포트
- 통합 카탈로그 (시드 + 사용자 상품)
- 사용자 상품 CRUD 폼
- 구매 시뮬레이터
- 시드 최근 주문 테이블
`,
    hi: `# ईकॉमर्स स्टोर डेमो (SQLite + localStorage)

यह पेज दिखाता है कि NAVAI वास्तविक उत्पादन डेटा को उजागर या संशोधित किए बिना एक वास्तविक ईकॉमर्स वातावरण में कैसे काम कर सकता है।

## सुरक्षा मॉडल

- seed कैटलॉग, ग्राहक और ऑर्डर **read-only SQLite demo database** से आते हैं।
- उपयोगकर्ता seed डेटा को क्वेरी कर सकते हैं और NAVAI tools से रिपोर्ट बना सकते हैं।
- उपयोगकर्ता seed products को edit या delete नहीं कर सकते।

## उपयोगकर्ता द्वारा बनाया गया डेटा

- विज़िटर द्वारा बनाए गए products केवल **localStorage** में सेव होते हैं।
- user products के edits, deletes और simulated purchases भी localStorage में रहते हैं।
- इससे public demo सुरक्षित रहता है और shared seed database प्रदूषित नहीं होती।

## NAVAI के साथ क्या टेस्ट करें

- SQLite seed data पर आधारित sales या catalog reports मांगें।
- NAVAI से products, recent orders, या category performance पूछें।
- NAVAI से इस पेज पर products create, edit, delete या buy करवाएं (local demo actions)।
- NAVAI से forms या reports जैसी sections पर navigate/scroll करवाएं।

## डेमो सेक्शन

- KPI dashboard और category sales report
- Combined catalog (seed + user products)
- User products के लिए CRUD form
- Purchase simulator
- Seed recent orders table
`,
  },
};

function normalizeRepoPath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\.?\//, "");
}

function canonicalizeReadmePath(value: string) {
  return value.replace(/README\.(en|es)\.md$/i, "README.md");
}

function resolveReadmeLinkHref(href: string, sourcePath: string) {
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("/") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("#")
  ) {
    return href;
  }

  const [rawPath, rawHash] = href.split("#");
  const sourceDir = sourcePath.includes("/") ? sourcePath.slice(0, sourcePath.lastIndexOf("/")) : ".";
  const joined = rawPath.startsWith("/")
    ? rawPath.slice(1)
    : normalizeRepoPath(`${sourceDir}/${rawPath}`);
  const resolvedPath = normalizeRepoPath(joined);
  const canonicalPath = canonicalizeReadmePath(resolvedPath);
  const maybeSlug = README_PATH_TO_SLUG.get(canonicalPath);
  const hash = rawHash ? `#${rawHash}` : "";

  if (maybeSlug) {
    return `/documentation/${maybeSlug}${hash}`;
  }

  return `${GITHUB_BLOB_BASE}/${encodeURI(resolvedPath)}${hash}`;
}

function resolveReadmeImageSrc(src: string, sourcePath: string) {
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }

  const sourceDir = sourcePath.includes("/") ? sourcePath.slice(0, sourcePath.lastIndexOf("/")) : ".";
  const joined = src.startsWith("/") ? src.slice(1) : normalizeRepoPath(`${sourceDir}/${src}`);
  const resolvedPath = normalizeRepoPath(joined);

  return `${GITHUB_RAW_BASE}/${encodeURI(resolvedPath)}`;
}

function extractNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => extractNodeText(child)).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractNodeText(node.props.children);
  }

  return "";
}

export default function NavaiDocMarkdown({ doc }: NavaiDocMarkdownProps) {
  const { language, messages } = useI18n();
  const localizedMarkdownInline = INLINE_LOCALIZED_MARKDOWN[doc.slug]?.[language as Exclude<LanguageCode, "en">];
  const localizedMarkdown = LOCALIZED_MARKDOWN[doc.slug]?.[language as Exclude<LanguageCode, "en">];
  const markdownContent = localizedMarkdownInline ?? localizedMarkdown ?? doc.markdown;

  const installLinksByHref: Record<string, string> = {
    "/documentation/installation-api": messages.common.docsInstallApi,
    "/documentation/installation-web": messages.common.docsInstallWeb,
    "/documentation/installation-mobile": messages.common.docsInstallMobile,
  };

  return (
    <div className={`docs-markdown-body${doc.slug === "home" ? " is-root-doc" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h2: ({ children, node }) => {
            const id = buildStableHeadingId({
              title: cleanHeadingText(extractNodeText(children)),
              offset: node?.position?.start?.offset ?? null,
              line: node?.position?.start?.line ?? null,
              column: node?.position?.start?.column ?? null,
            });
            return <h2 id={id}>{children}</h2>;
          },
          h3: ({ children, node }) => {
            const id = buildStableHeadingId({
              title: cleanHeadingText(extractNodeText(children)),
              offset: node?.position?.start?.offset ?? null,
              line: node?.position?.start?.line ?? null,
              column: node?.position?.start?.column ?? null,
            });
            return <h3 id={id}>{children}</h3>;
          },
          a: ({ href = "", children, className }) => {
            const resolvedHref = resolveReadmeLinkHref(href, doc.sourcePath);
            const isExternal =
              resolvedHref.startsWith("http://") || resolvedHref.startsWith("https://");

            const isInstallLink = typeof className === "string" && className.includes("docs-install-link");
            const installLabel =
              doc.slug === "home" && isInstallLink ? installLinksByHref[resolvedHref] : undefined;

            return (
              <a
                className={className}
                href={resolvedHref}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noreferrer noopener" : undefined}
              >
                {installLabel ?? children}
              </a>
            );
          },
          img: ({ src = "", alt = "" }) => {
            const safeSrc = typeof src === "string" ? src : "";
            const safeAlt = typeof alt === "string" ? alt : "";
            const resolvedSrc = resolveReadmeImageSrc(safeSrc, doc.sourcePath);
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={resolvedSrc} alt={safeAlt} loading="lazy" />;
          },
        }}
      >
        {markdownContent}
      </ReactMarkdown>
    </div>
  );
}
