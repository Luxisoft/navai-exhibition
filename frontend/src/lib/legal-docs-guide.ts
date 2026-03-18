import type { AppMessages, LanguageCode } from "@/lib/i18n/messages";
import { DEFAULT_LANGUAGE } from "@/lib/i18n/messages";

export type InteractiveLegalGuideSlug =
  | "legal-ai-evaluation-terms"
  | "legal-data-processing-policy"
  | "legal-data-and-ai-authorization"
  | "legal-privacy-policy"
  | "legal-checkout-flow"
  | "legal-compliance-checklist"
  | "legal-privacy-notice";

export type LegalGuideSection = {
  id: string;
  title: string;
  bodyMarkdown: string;
};

export type LegalGuideDoc = {
  value: InteractiveLegalGuideSlug;
  label: string;
  summary: string;
  href: string;
  introMarkdown: string;
  sections: LegalGuideSection[];
};

export type LegalGuideContent = {
  title: string;
  description: string;
  currentDoc: LegalGuideDoc;
  docs: LegalGuideDoc[];
};

type LegalGuideModel = {
  introMarkdown: string;
  sections: LegalGuideSection[];
};

export const LEGAL_GUIDE_SLUGS: InteractiveLegalGuideSlug[] = [
  "legal-ai-evaluation-terms",
  "legal-data-processing-policy",
  "legal-data-and-ai-authorization",
  "legal-privacy-policy",
  "legal-checkout-flow",
  "legal-compliance-checklist",
  "legal-privacy-notice",
];

const BASE_LEGAL_GUIDES: Record<InteractiveLegalGuideSlug, LegalGuideModel> = {
  "legal-ai-evaluation-terms": {
    introMarkdown:
      "Resumen estructurado de los términos y condiciones para la contratación y uso de la evaluación online asistida con inteligencia artificial de LUXISOFT.",
    sections: [
      {
        id: "provider-and-service-scope",
        title: "Proveedor y alcance del servicio",
        bodyMarkdown:
          "- Identifica a LUXISOFT, al responsable del servicio y a los canales de soporte.\n- Explica que el servicio consiste en dar acceso a una evaluación digital online y procesar las respuestas del usuario.\n- Indica que la evaluación mide habilidades, desempeño, razonamiento, rapidez, comprensión u otras capacidades definidas para cada caso.",
      },
      {
        id: "digital-service-and-limits",
        title: "Naturaleza digital y límites",
        bodyMarkdown:
          "- El servicio se define como un servicio digital o de acceso online.\n- Sus resultados tienen fines informativos, educativos, recreativos o de medición interna, salvo aviso expreso en contrario.\n- No reemplaza diagnósticos clínicos, psicológicos, psiquiátricos, médicos ni valoraciones profesionales reguladas.",
      },
      {
        id: "electronic-contracting-and-evidence",
        title: "Contratación electrónica y evidencia",
        bodyMarkdown:
          "- La aceptación puede darse al navegar, registrarse, marcar casillas, pagar o iniciar la evaluación.\n- LUXISOFT puede perfeccionar el contrato mediante clics, registros electrónicos, mensajes de datos y mecanismos técnicos equivalentes.\n- Debe conservar evidencia verificable de la aceptación, la transacción y la prestación del servicio.",
      },
      {
        id: "eligibility-access-and-fraud-rules",
        title: "Elegibilidad, acceso y prevención de fraude",
        bodyMarkdown:
          "- El servicio está dirigido a mayores de 18 años, salvo modalidades especiales legalmente habilitadas.\n- El acceso es personal e intransferible, salvo indicación comercial expresa.\n- LUXISOFT puede suspender cuentas, invalidar intentos o anular resultados ante fraude, suplantación, automatización o alteración del sistema.",
      },
      {
        id: "pricing-immediate-start-and-withdrawal",
        title: "Precio, inicio inmediato y retracto",
        bodyMarkdown:
          "- Antes de pagar se debe informar nombre de la evaluación, alcance, número de preguntas, modalidad, duración, reglas de calificación y precio total.\n- El servicio puede iniciar inmediatamente tras el pago o al presionar iniciar evaluación.\n- Cuando la ejecución ya comenzó con acuerdo del consumidor, no procede el derecho de retracto en los términos indicados por la ley colombiana.",
      },
      {
        id: "results-ai-availability-and-support",
        title: "Resultados, IA, disponibilidad y soporte",
        bodyMarkdown:
          "- Los resultados reflejan el desempeño dentro de la evaluación y no garantizan beneficios académicos, laborales o personales.\n- La plataforma puede usar IA para formular preguntas, transcribir, calificar reglas objetivas y generar reportes.\n- LUXISOFT hará esfuerzos razonables para mantener la plataforma disponible y atender PQR por los canales informados.",
      },
    ],
  },
  "legal-data-processing-policy": {
    introMarkdown:
      "Política marco sobre cómo LUXISOFT recolecta, usa, conserva, protege y atiende solicitudes relacionadas con datos personales dentro de sus servicios digitales.",
    sections: [
      {
        id: "controller-and-legal-framework",
        title: "Responsable y marco normativo",
        bodyMarkdown:
          "- Identifica al responsable del tratamiento, sus datos de contacto y su sitio web.\n- Define que la política se apoya principalmente en la Constitución, la Ley 1581 de 2012, el Decreto 1377 de 2013, la Ley 527 de 1999 y la Ley 1480 de 2011.\n- Señala que prevalecen las definiciones legales aplicables en protección de datos personales.",
      },
      {
        id: "personal-data-collected",
        title: "Datos que pueden recolectarse",
        bodyMarkdown:
          "- Incluye datos de identificación, contacto, facturación, transacción y soporte.\n- También abarca datos técnicos, de uso de la plataforma, resultados, tiempos, historial e incidencias.\n- Cuando el servicio use voz, chat o transcripción, puede tratar audio, texto y metadatos operativos asociados.",
      },
      {
        id: "processing-purposes",
        title: "Finalidades del tratamiento",
        bodyMarkdown:
          "- Crear cuentas, validar acceso y prestar el servicio contratado.\n- Procesar pagos, generar resultados, soporte, analítica, auditoría y trazabilidad.\n- Prevenir fraude, conservar evidencia contractual y cumplir obligaciones legales, regulatorias y contables.",
      },
      {
        id: "holder-rights-and-authorization",
        title: "Derechos del titular y autorización",
        bodyMarkdown:
          "- El titular puede conocer, actualizar, rectificar, suprimir datos y revocar autorizaciones cuando proceda.\n- LUXISOFT debe solicitar autorización previa, expresa e informada, salvo excepciones legales.\n- La autorización debe poder probarse y el silencio no se considera consentimiento válido.",
      },
      {
        id: "sensitive-data-minors-and-microphone",
        title: "Datos sensibles, menores y micrófono",
        bodyMarkdown:
          "- El servicio no está dirigido por regla general a menores de 18 años.\n- El usuario no está obligado a suministrar datos sensibles.\n- Si se habilitan micrófono o grabación, debe informarse la finalidad y, cuando sea posible, ofrecer alternativa no basada en audio.",
      },
      {
        id: "transfers-security-and-retention",
        title: "Transferencias, seguridad y conservación",
        bodyMarkdown:
          "- LUXISOFT puede transmitir datos a proveedores tecnológicos, cloud, pagos, correo, analítica o IA cuando sea necesario operar el servicio.\n- Debe adoptar medidas razonables de seguridad y confidencialidad.\n- Los datos se conservan por el tiempo necesario para cumplir finalidades, deberes legales, defensa de reclamaciones o trazabilidad probatoria.",
      },
      {
        id: "consultations-and-claims",
        title: "Consultas y reclamos",
        bodyMarkdown:
          "- El titular puede presentar consultas y reclamos por correo o por el canal definido por LUXISOFT.\n- La política fija tiempos de respuesta, subsanación y prórroga conforme a la ley.\n- Antes de acudir a la SIC, debe agotarse el trámite interno cuando así lo exija la normativa aplicable.",
      },
    ],
  },
  "legal-data-and-ai-authorization": {
    introMarkdown:
      "Autorización expresa para el tratamiento de datos personales y el uso de herramientas de inteligencia artificial dentro de la evaluación online de LUXISOFT.",
    sections: [
      {
        id: "general-authorization",
        title: "Autorización general",
        bodyMarkdown:
          "- El titular autoriza de forma previa, expresa, informada e inequívoca a LUXISOFT para recolectar, almacenar, usar, circular, transmitir, actualizar, conservar y suprimir datos cuando proceda.\n- La autorización remite a la Política de Tratamiento de Datos Personales publicada por LUXISOFT.",
      },
      {
        id: "authorized-purposes",
        title: "Finalidades autorizadas",
        bodyMarkdown:
          "- Crear y administrar cuenta, validar identidad, procesar pago, facturación y soporte.\n- Ejecutar la evaluación online, registrar respuestas, tiempos, resultados e historial de uso.\n- Prevenir fraude, conservar evidencia contractual, atender PQR y cumplir obligaciones legales y regulatorias.",
      },
      {
        id: "artificial-intelligence-usage",
        title: "Uso de inteligencia artificial",
        bodyMarkdown:
          "- El titular autoriza que la plataforma utilice IA para formular preguntas, gestionar interacción por texto o voz, transcribir respuestas, apoyar evaluación objetiva y generar retroalimentación o reportes.\n- El documento deja claro que estas funciones hacen parte operativa del servicio.",
      },
      {
        id: "audio-authorization",
        title: "Autorización sobre audio",
        bodyMarkdown:
          "- Si se habilita micrófono, el usuario puede autorizar el tratamiento de audio y texto para interacción, transcripción, soporte operativo y mejora del servicio.\n- Salvo aviso expreso, el audio no se usa para identificación biométrica.\n- Cuando exista una alternativa por texto, el usuario puede optar por ella.",
      },
      {
        id: "holder-information-and-rights",
        title: "Información suministrada y derechos",
        bodyMarkdown:
          "- El usuario declara haber sido informado sobre finalidades, derechos, datos del responsable y existencia de la política aplicable.\n- Puede conocer, actualizar, rectificar, suprimir datos, revocar autorizaciones y solicitar prueba del consentimiento.\n- Los canales de ejercicio de derechos incluyen correo y WhatsApp de soporte.",
      },
    ],
  },
  "legal-privacy-policy": {
    introMarkdown:
      "Política de privacidad del sitio web y la plataforma, enfocada en la recolección y uso de información personal y no personal dentro de las evaluaciones online asistidas con IA.",
    sections: [
      {
        id: "scope-and-collected-data",
        title: "Alcance y datos recolectados",
        bodyMarkdown:
          "- La política aplica al sitio web, formularios, checkout, soporte, evaluaciones online y demás interacciones automatizadas.\n- Puede recolectar datos de identificación, contacto, transacción, navegación, uso del servicio y contenido generado durante la interacción con IA.\n- Incluye textos escritos, audio, transcripciones, resultados y metadatos necesarios para prestar el servicio.",
      },
      {
        id: "purposes-of-use",
        title: "Finalidades de uso",
        bodyMarkdown:
          "- Crear cuentas, procesar compras, validar pagos y prestar la evaluación online contratada.\n- Formular preguntas, procesar respuestas, calcular resultados y generar reportes con apoyo automatizado.\n- Conservar evidencia contractual, atender soporte y prevenir fraude o accesos no autorizados.",
      },
      {
        id: "ai-and-automated-tools",
        title: "IA y herramientas automatizadas",
        bodyMarkdown:
          "- La plataforma puede utilizar sistemas automatizados o IA para apoyar interacción, transcripción, reglas objetivas o reportes.\n- LUXISOFT debe informar de forma clara el uso de estas herramientas.\n- El usuario debe evitar incluir datos sensibles no solicitados o información de terceros sin autorización.",
      },
      {
        id: "sharing-cookies-and-security",
        title: "Compartición, cookies y seguridad",
        bodyMarkdown:
          "- Los datos pueden compartirse con pasarelas de pago, hosting, correo, seguridad, soporte y otros proveedores necesarios para operar el servicio.\n- El sitio puede usar cookies, almacenamiento local y tecnologías similares para sesión, seguridad, navegación y analítica técnica.\n- LUXISOFT adopta medidas razonables de seguridad, aunque no puede garantizar infalibilidad absoluta.",
      },
      {
        id: "rights-minors-and-third-parties",
        title: "Derechos, menores y terceros",
        bodyMarkdown:
          "- El titular puede ejercer derechos de acceso, actualización, rectificación, supresión, revocatoria y reclamación.\n- El servicio está dirigido a mayores de 18 años salvo una modalidad especial reforzada.\n- El sitio puede enlazar servicios de terceros con políticas propias, y LUXISOFT puede actualizar esta política por cambios legales u operativos.",
      },
    ],
  },
  "legal-checkout-flow": {
    introMarkdown:
      "Guía práctica para implementar textos, checkboxes y validaciones legales en la compra y el inicio de una evaluación online asistida con IA.",
    sections: [
      {
        id: "purchase-summary",
        title: "Resumen de compra obligatorio",
        bodyMarkdown:
          "- Antes del botón de pago deben mostrarse nombre de la evaluación, tema, número de preguntas, duración, intentos, precio total, impuestos, plazo de acceso, resultado y soporte.\n- El usuario debe poder revisar el resumen, corregir información o cancelar la transacción antes de pagar.",
      },
      {
        id: "mandatory-checkboxes",
        title: "Checkboxes obligatorios",
        bodyMarkdown:
          "- Debe existir una casilla de aceptación contractual de términos y condiciones.\n- Debe incluirse una casilla de autorización de tratamiento de datos e información sobre uso de IA.\n- También debe existir una casilla para autorizar el inicio inmediato del servicio y explicar el efecto sobre el derecho de retracto.",
      },
      {
        id: "optional-audio-checkbox",
        title: "Checkbox opcional de micrófono",
        bodyMarkdown:
          "- Si la evaluación usa voz o audio, puede mostrarse una casilla adicional para autorizar su uso.\n- El texto debe vincular la autorización con la interacción, la transcripción y la operación técnica del servicio.",
      },
      {
        id: "payment-receipt-and-support",
        title: "Pago, recibo y soporte",
        bodyMarkdown:
          "- El botón de pago sugerido es `Pagar y continuar`.\n- Después de la compra debe mostrarse o enviarse un acuse con servicio, valor, fecha, acceso y canal de soporte.\n- Debe existir un texto visible para PQR o soporte con correo y WhatsApp.",
      },
      {
        id: "pre-start-screen-and-disclaimer",
        title: "Pantalla previa y disclaimer",
        bodyMarkdown:
          "- Antes de iniciar la evaluación se recomienda una pantalla que recuerde presentación personal, prohibición de bots, alcance del resultado y ausencia de diagnóstico clínico o psicológico.\n- También se sugiere un disclaimer corto en la landing o ficha del servicio para delimitar el alcance del producto.",
      },
    ],
  },
  "legal-compliance-checklist": {
    introMarkdown:
      "Checklist legal orientado a revisar rápidamente si el modelo de cobro por acceso a una evaluación online asistida con IA cumple los mínimos operativos y regulatorios en Colombia.",
    sections: [
      {
        id: "website-publication-requirements",
        title: "Lo que debe publicarse en la web",
        bodyMarkdown:
          "- Identidad completa del proveedor, términos y condiciones, política de datos y aviso de privacidad.\n- Precio total, descripción clara del servicio, resumen del pedido y canales de atención.\n- Acuse de recibo de compra y páginas visibles con términos descargables.",
      },
      {
        id: "checkout-requirements",
        title: "Lo que debe existir en el checkout",
        bodyMarkdown:
          "- Casillas para términos, datos personales e inicio inmediato del servicio.\n- Opción de corregir o cancelar antes de pagar.\n- Evidencia técnica verificable de aceptación, trazabilidad del pago y comprobante posterior.",
      },
      {
        id: "practices-to-avoid",
        title: "Prácticas que deben evitarse",
        bodyMarkdown:
          "- No prometer diagnósticos clínicos o psicológicos si no corresponde.\n- No afirmar que la IA es infalible ni presumir consentimiento por silencio.\n- No ocultar precios, exigir datos sensibles innecesarios ni habilitar menores sin capa legal especial.",
      },
      {
        id: "data-protection-and-rnbd",
        title: "Protección de datos y RNBD",
        bodyMarkdown:
          "- Deben existir política interna, prueba de autorización, controles de acceso y canal de habeas data.\n- También se recomienda revisar si existe obligación de registrar bases de datos en el RNBD.\n- Si hay transferencias internacionales, deben documentarse autorizaciones y cláusulas correspondientes.",
      },
      {
        id: "taxes-ai-and-strategy",
        title: "Facturación, IA y recomendación estratégica",
        bodyMarkdown:
          "- Debe revisarse con contador la obligación de facturar, la actividad económica y el régimen tributario aplicable.\n- La plataforma debe informar que usa IA, explicar su alcance y mantener canal humano para reclamos.\n- Como estrategia de menor fricción legal, se recomienda tratar el producto como evaluación digital pagada para mayores de edad, sin promesas clínicas y con trazabilidad desde el día uno.",
      },
      {
        id: "future-prizes-and-promotions",
        title: "Si más adelante se agregan premios",
        bodyMarkdown:
          "- Si se añaden premios o concursos, deben publicarse reglas claras de tiempo, modo, lugar y requisitos.\n- Debe dejarse claro que gana el mejor desempeño y no el azar.\n- También se recomienda revisar publicidad de promociones y la estructura contractual si intervienen terceros.",
      },
    ],
  },
  "legal-privacy-notice": {
    introMarkdown:
      "Aviso breve que puede mostrarse al momento de la recolección de datos cuando no sea posible desplegar en ese instante la política completa de tratamiento.",
    sections: [
      {
        id: "controller-and-purpose",
        title: "Responsable y finalidad general",
        bodyMarkdown:
          "- Identifica a LUXISOFT y al responsable del tratamiento, con domicilio, correo, WhatsApp y sitio web.\n- Indica que los datos se recolectan a través del sitio web y la plataforma de evaluaciones online asistidas con IA.",
      },
      {
        id: "main-processing-purposes",
        title: "Finalidades principales",
        bodyMarkdown:
          "- Registro y autenticación del usuario.\n- Procesamiento de compras, ejecución del servicio, resultados, historial, soporte, prevención de fraude y cumplimiento legal.\n- Envío de comunicaciones transaccionales y, cuando aplique, comerciales autorizadas.",
      },
      {
        id: "holder-rights",
        title: "Derechos del titular",
        bodyMarkdown:
          "- El titular puede conocer, actualizar, rectificar y suprimir sus datos.\n- También puede solicitar prueba de la autorización, presentar consultas y reclamos, acceder gratuitamente a sus datos y acudir a la SIC cuando proceda.",
      },
      {
        id: "policy-consultation-and-contact",
        title: "Consulta de la política y contacto",
        bodyMarkdown:
          "- La política completa de tratamiento y la política de privacidad deben poder consultarse en una URL publicada por LUXISOFT o solicitarse por correo.\n- El aviso recuerda los canales de contacto oficiales para ejercer derechos o resolver dudas.",
      },
      {
        id: "legal-support",
        title: "Soporte normativo mínimo",
        bodyMarkdown:
          "- El aviso se apoya en la Ley 1581 de 2012, el Decreto 1377 de 2013, el Decreto 1074 de 2015 y la Ley 527 de 1999.\n- Debe mostrarse o enlazarse como mínimo al momento de recolección de los datos, cuando no sea posible exhibir la política completa en ese mismo instante.",
      },
    ],
  },
};

export function isInteractiveLegalGuideSlug(
  slug: string,
): slug is InteractiveLegalGuideSlug {
  return LEGAL_GUIDE_SLUGS.includes(slug as InteractiveLegalGuideSlug);
}

export function supportsInteractiveLegalGuide(
  _language: LanguageCode = DEFAULT_LANGUAGE,
) {
  return true;
}

export function getLegalGuideSections(slug: InteractiveLegalGuideSlug) {
  return BASE_LEGAL_GUIDES[slug].sections.map((section) => ({
    id: section.id,
    title: section.title,
    depth: 2 as const,
  }));
}

export function getLocalizedLegalGuide(
  messages: AppMessages,
  slug: InteractiveLegalGuideSlug,
  _language: LanguageCode = DEFAULT_LANGUAGE,
): LegalGuideContent {
  const docs = LEGAL_GUIDE_SLUGS.map((value) => {
    const entry = messages.docsCatalog.entries[value];
    const guide = BASE_LEGAL_GUIDES[value];

    return {
      value,
      label: entry?.title ?? value,
      summary: entry?.summary ?? "",
      href: `/documentation/${value}`,
      introMarkdown: guide.introMarkdown,
      sections: guide.sections,
    };
  });

  const currentDoc = docs.find((doc) => doc.value === slug) ?? docs[0];

  return {
    title: messages.docsCatalog.groupLabels.legal ?? "Legal",
    description: currentDoc.summary,
    currentDoc,
    docs,
  };
}
