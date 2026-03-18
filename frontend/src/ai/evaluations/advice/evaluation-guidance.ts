type EvaluationGuidancePayload = {
  objective?: string;
  audience?: string;
  tone?: string;
};

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function recommendEvaluationSetup(
  payload?: EvaluationGuidancePayload,
) {
  const objective = readText(payload?.objective);
  const audience = readText(payload?.audience);
  const tone = readText(payload?.tone) || "claro y profesional";

  return {
    ok: true,
    recommendation: {
      suggestedName: objective
        ? `Evaluacion de ${objective}`
        : "Evaluacion guiada",
      suggestedDescription: [
        "Usa esta evaluacion para recopilar respuestas comparables y accionables.",
        objective ? `Objetivo principal: ${objective}.` : null,
        audience ? `Audiencia objetivo: ${audience}.` : null,
        `Tono recomendado: ${tone}.`,
      ]
        .filter(Boolean)
        .join(" "),
      suggestedWelcomeBody: [
        "Responde cada pregunta con calma y de forma concreta.",
        "NAVAI te guiara una pregunta a la vez.",
      ].join(" "),
      suggestedQuestions: [
        "¿Cual es tu situacion actual frente al tema evaluado?",
        "¿Que objetivo quieres lograr?",
        "¿Que principal dificultad estas enfrentando?",
      ],
    },
  };
}
