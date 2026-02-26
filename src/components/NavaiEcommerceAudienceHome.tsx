'use client';

import Link from "next/link";

import { getEcommerceSuiteDemoText } from "@/i18n/ecommerce-suite-demo";
import { useI18n } from "@/i18n/provider";
import { getEcommerceSuiteModulesByAudience } from "@/lib/ecommerce-suite-catalog";

type Audience = "consumer" | "admin";

type AudienceCopy = {
  badge: string;
  title: string;
  description: string;
  overviewTitle: string;
  overviewBody: string;
  modulesTitle: string;
  modulesBody: string;
  dbTitle: string;
  dbBullets: string[];
  seedRowsLabel: string;
  tablesLabel: string;
  actionsLabel: string;
};

function isSpanish(language: string) {
  const normalized = String(language || "").toLowerCase();
  return normalized === "es" || normalized.startsWith("es-") || normalized.startsWith("es_");
}

function getCopy(language: string, audience: Audience): AudienceCopy {
  const es = isSpanish(language);

  if (audience === "consumer") {
    return es
      ? {
          badge: "Ecommerce - Comprador",
          title: "Comprador",
          description:
            "Submenu de ecommerce para escenarios del lado comprador con base SQLite (seed), tablas y datos de prueba.",
          overviewTitle: "Resumen",
          overviewBody:
            "Cada submenu abre un modulo interactivo con dataset seed (solo lectura) y workspace local (localStorage) para probar CRUD y acciones.",
          modulesTitle: "Submenus disponibles",
          modulesBody:
            "Submenus del cliente: descubrimiento, evaluacion/confianza, intencion, checkout, post-compra, devoluciones/reembolsos, cuenta/relacion y seguridad.",
          dbTitle: "Base de datos demo (SQLite + workspace local)",
          dbBullets: [
            "Cada modulo tiene tablas seed con datos de prueba (SQLite en backend).",
            "Los cambios interactivos se guardan solo en el navegador (localStorage).",
            "Puedes reiniciar cualquier modulo a su estado seed.",
          ],
          seedRowsLabel: "Filas seed",
          tablesLabel: "Tablas",
          actionsLabel: "Acciones",
        }
      : {
          badge: "Ecommerce - Buyer",
          title: "Buyer",
          description:
            "Ecommerce submenu for buyer-side scenarios with a SQLite seed database, tables, and test data.",
          overviewTitle: "Overview",
          overviewBody:
            "Each submenu opens an interactive module with a read-only seed dataset plus a localStorage workspace for CRUD and workflow actions.",
          modulesTitle: "Available submenus",
          modulesBody:
            "Buyer submenus: discovery, evaluation/trust, intent, checkout, post-purchase, returns/refunds, account/relationship, and security.",
          dbTitle: "Demo database (SQLite + local workspace)",
          dbBullets: [
            "Each module has seed tables with sample rows stored in backend SQLite.",
            "Interactive changes are stored only in the browser localStorage workspace.",
            "Any module can be reset back to its seed state.",
          ],
          seedRowsLabel: "Seed rows",
          tablesLabel: "Tables",
          actionsLabel: "Actions",
        };
  }

  return es
    ? {
        badge: "Ecommerce - Administrador",
        title: "Administrador",
        description:
          "Submenu de ecommerce para escenarios del lado administrador con base SQLite (seed), tablas y datos de prueba.",
        overviewTitle: "Resumen",
        overviewBody:
          "Incluye modulos de operacion y back-office: marketplace, B2B, logistica, marketing, analitica y administracion.",
        modulesTitle: "Submenus disponibles",
        modulesBody:
          "Submenus del negocio/operacion: catalogo, pagos/impuestos, promociones/pricing, OMS, logistica, CX, CRM, marketing, analitica/finanzas, seguridad/compliance, plataforma y estrategia.",
        dbTitle: "Base de datos demo (SQLite + workspace local)",
        dbBullets: [
          "Cada modulo trae tablas seed con registros de ejemplo (SQLite en backend).",
          "Las tablas seed son de solo lectura; se clonan a un workspace local editable.",
          "El reset restaura el workspace local desde seed.",
        ],
        seedRowsLabel: "Filas seed",
        tablesLabel: "Tablas",
        actionsLabel: "Acciones",
      }
    : {
        badge: "Ecommerce - Administrator",
        title: "Administrator",
        description:
          "Ecommerce submenu for administrator-side scenarios with a SQLite seed database, tables, and test data.",
        overviewTitle: "Overview",
        overviewBody:
          "Includes operations and back-office modules: marketplace, B2B, logistics, marketing, analytics, and administration.",
        modulesTitle: "Available submenus",
        modulesBody:
          "Business/operations submenus: catalog, payments/tax, promotions/pricing, OMS, logistics, CX, CRM, marketing, analytics/finance, security/compliance, platform, and strategy.",
        dbTitle: "Demo database (SQLite + local workspace)",
        dbBullets: [
          "Each module ships with seeded tables and sample records in backend SQLite.",
          "Seed tables are read-only and cloned into an editable local workspace.",
          "Reset restores the local workspace from seed.",
        ],
        seedRowsLabel: "Seed rows",
        tablesLabel: "Tables",
        actionsLabel: "Actions",
      };
}

export default function NavaiEcommerceAudienceHome({ audience }: { audience: Audience }) {
  const { language } = useI18n();
  const copy = getCopy(language, audience);
  const modules = getEcommerceSuiteModulesByAudience(audience);
  const t = (text: string) => getEcommerceSuiteDemoText(language, text);

  const totals = modules.reduce(
    (acc, module) => {
      acc.modules += 1;
      acc.tables += module.entities.length;
      acc.actions += module.actions.length;
      acc.seedRows += module.entities.reduce((rowSum, entity) => rowSum + entity.rows.length, 0);
      return acc;
    },
    { modules: 0, tables: 0, actions: 0, seedRows: 0 }
  );

  return (
    <div className="docs-markdown-body">
      <p className="docs-badge">{copy.badge}</p>
      <h1>{copy.title}</h1>
      <p>{copy.description}</p>

      <section>
        <h2 id="overview">{copy.overviewTitle}</h2>
        <p>{copy.overviewBody}</p>
        <ul>
          <li>{`${copy.modulesTitle}: ${totals.modules}`}</li>
          <li>{`${copy.tablesLabel}: ${totals.tables}`}</li>
          <li>{`${copy.actionsLabel}: ${totals.actions}`}</li>
          <li>{`${copy.seedRowsLabel}: ${totals.seedRows}`}</li>
        </ul>
      </section>

      <section>
        <h2 id="database">{copy.dbTitle}</h2>
        <ul>
          {copy.dbBullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 id="submenus">{copy.modulesTitle}</h2>
        <p>{copy.modulesBody}</p>
        {modules.map((module) => {
          const moduleSeedRows = module.entities.reduce((sum, entity) => sum + entity.rows.length, 0);
          return (
            <section key={module.slug}>
              <h3 id={module.slug.replace(/\//g, "-")}>
                <Link href={`/example/${module.slug}`}>{t(module.title)}</Link>
              </h3>
              <p>{t(module.description)}</p>
              <p>
                {`${copy.tablesLabel}: ${module.entities.length} | ${copy.actionsLabel}: ${module.actions.length} | ${copy.seedRowsLabel}: ${moduleSeedRows}`}
              </p>
              <ul>
                {module.entities.map((entity) => (
                  <li key={`${module.slug}-${entity.key}`}>
                    <code>{entity.key}</code>
                    {` - ${t(entity.label)} (${entity.rows.length})`}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </section>
    </div>
  );
}
