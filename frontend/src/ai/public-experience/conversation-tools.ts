import {
  getPublicExperienceConversationState as getPublicExperienceConversationStateTool,
  savePublicExperienceAnswer as savePublicExperienceAnswerTool,
} from "@/lib/public-experience-agent-tools";

function unwrapToolPayload(payload?: unknown) {
  if (typeof payload === "string" || typeof payload === "number" || typeof payload === "boolean") {
    return {
      answerText: String(payload),
    };
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const record = payload as {
    args?: unknown;
    questionId?: string;
    answerText?: string;
  };

  if (Array.isArray(record.args) && record.args.length > 0) {
    const firstArg = record.args[0];
    if (
      typeof firstArg === "string" ||
      typeof firstArg === "number" ||
      typeof firstArg === "boolean"
    ) {
      return {
        answerText: String(firstArg),
      };
    }

    if (firstArg && typeof firstArg === "object" && !Array.isArray(firstArg)) {
      return firstArg as { questionId?: string; answerText?: string };
    }
  }

  return record;
}

function logConversationToolDebug(event: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }

  console.log(`[navai public experience tool] ${event}`, payload);
}

export async function getPublicExperienceConversationState(payload?: unknown) {
  void payload;
  return await getPublicExperienceConversationStateTool();
}

export async function savePublicExperienceAnswer(payload?: unknown) {
  const input = unwrapToolPayload(payload);
  logConversationToolDebug("save_public_experience_answer_input", {
    rawPayload: payload,
    unwrappedInput: input ?? null,
  });
  return await savePublicExperienceAnswerTool(input);
}

export async function savePublicEvaluationAnswer(payload?: unknown) {
  return await savePublicExperienceAnswer(payload);
}

export async function savePublicSurveyAnswer(payload?: unknown) {
  return await savePublicExperienceAnswer(payload);
}
