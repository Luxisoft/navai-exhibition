type SurveyGuidancePayload = {
  objective?: string;
  audience?: string;
  tone?: string;
};

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function recommendSurveySetup(payload?: SurveyGuidancePayload) {
  const objective = readText(payload?.objective);
  const audience = readText(payload?.audience);
  const tone = readText(payload?.tone) || "amigable y directo";

  return {
    ok: true,
    recommendation: {
      suggestedName: objective ? `Encuesta de ${objective}` : "Encuesta guiada",
      suggestedDescription: [
        "Usa esta encuesta para capturar opiniones y preferencias de forma ordenada.",
        objective ? `Objetivo principal: ${objective}.` : null,
        audience ? `Audiencia objetivo: ${audience}.` : null,
        `Tono recomendado: ${tone}.`,
      ]
        .filter(Boolean)
        .join(" "),
      suggestedWelcomeBody: [
        "Responde las preguntas con tu experiencia real.",
        "NAVAI te acompanara durante todo el recorrido.",
      ].join(" "),
      suggestedQuestions: [
        "¿Como calificarias tu experiencia general?",
        "¿Que fue lo mas util para ti?",
        "¿Que cambiarias o mejorarias?",
      ],
    },
  };
}
