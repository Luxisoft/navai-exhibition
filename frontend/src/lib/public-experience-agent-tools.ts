'use client';

import type {
  NavaiPublicConversationAnswer,
  NavaiPublicExperience,
} from "@/lib/navai-panel-api";

type SavePublicExperienceAnswerInput = {
  questionId: string;
  questionText: string;
  answerText: string;
};

type PublicExperienceAgentToolsContext = {
  item: NavaiPublicExperience | null;
  latestAnswers: NavaiPublicConversationAnswer[];
  pendingQuestionIds: string[];
  getConversationId: () => string | null;
  saveAnswer: (
    input: SavePublicExperienceAnswerInput
  ) => Promise<{
    latestAnswers: NavaiPublicConversationAnswer[];
    pendingQuestionIds: string[];
  }>;
};

let currentContext: PublicExperienceAgentToolsContext | null = null;
const saveAnswerRequestCache = new Map<
  string,
  Promise<{
    ok: boolean;
    conversationId?: string;
    savedQuestion?: {
      id: string;
      question: string;
    };
    answerText?: string;
    latestAnswers?: NavaiPublicConversationAnswer[];
    pendingQuestionIds?: string[];
    nextQuestion?: {
      id: string;
      question: string;
      expectedAnswer: string;
    } | null;
    isComplete?: boolean;
    error?: string;
    requestedQuestionId?: string;
  }>
>();

function logPublicExperienceAnswerDebug(
  event: string,
  payload: Record<string, unknown>
) {
  if (typeof window === "undefined") {
    return;
  }

  console.log(`[navai public experience] ${event}`, payload);
}

function getContext() {
  return currentContext;
}

function getPendingQuestions(context: PublicExperienceAgentToolsContext) {
  const pendingIds = new Set(context.pendingQuestionIds);
  return context.item?.questions.filter((question) => pendingIds.has(question.id)) ?? [];
}

export function setPublicExperienceAgentToolsContext(
  context: PublicExperienceAgentToolsContext
) {
  currentContext = context;
}

export function clearPublicExperienceAgentToolsContext() {
  currentContext = null;
}

export async function getPublicExperienceConversationState() {
  const context = getContext();
  if (!context || !context.item) {
    return {
      ok: false,
      error: "Public experience context is not available.",
    };
  }

  const pendingQuestions = getPendingQuestions(context);
  const currentQuestion = pendingQuestions[0] ?? null;

  return {
    ok: true,
    kind: context.item.kind,
    name: context.item.name,
    description: context.item.description,
    instructions: context.item.welcomeBody,
    conversationId: context.getConversationId(),
    totalQuestions: context.item.questions.length,
    answeredCount: context.latestAnswers.length,
    pendingCount: pendingQuestions.length,
    isComplete: pendingQuestions.length === 0,
    currentQuestion: currentQuestion
      ? {
          id: currentQuestion.id,
          question: currentQuestion.question,
          expectedAnswer: currentQuestion.expectedAnswer,
        }
      : null,
    pendingQuestions: pendingQuestions.map((question) => ({
      id: question.id,
      question: question.question,
      expectedAnswer: question.expectedAnswer,
    })),
    latestAnswers: context.latestAnswers.map((answer) => ({
      questionId: answer.questionId,
      questionText: answer.questionText,
      answerText: answer.answerText,
    })),
  };
}

export async function savePublicExperienceAnswer(payload?: {
  questionId?: string;
  answerText?: string;
}) {
  const context = getContext();
  if (!context || !context.item) {
    return {
      ok: false,
      error: "Public experience context is not available.",
    };
  }

  const conversationId = context.getConversationId();
  if (!conversationId) {
    return {
      ok: false,
      error: "The public conversation has not started yet.",
    };
  }

  const answerText =
    typeof payload?.answerText === "string" ? payload.answerText.trim() : "";
  if (!answerText) {
    return {
      ok: false,
      error: "The answer text is required.",
    };
  }

  const pendingQuestions = getPendingQuestions(context);
  const fallbackQuestion = pendingQuestions[0] ?? null;
  const requestedQuestionId =
    typeof payload?.questionId === "string" ? payload.questionId.trim() : "";
  const latestSavedAnswer = context.latestAnswers[context.latestAnswers.length - 1] ?? null;
  const normalizedLatestSavedAnswerText = latestSavedAnswer?.answerText.trim().toLowerCase() ?? "";
  const normalizedAnswerText = answerText.toLowerCase();

  logPublicExperienceAnswerDebug("save_requested", {
    conversationId,
    requestedQuestionId,
    answerText,
    pendingQuestionIds: context.pendingQuestionIds,
    latestAnswerQuestionId: latestSavedAnswer?.questionId ?? null,
  });

  if (!requestedQuestionId && latestSavedAnswer && normalizedLatestSavedAnswerText === normalizedAnswerText) {
    const remainingQuestions = context.item.questions.filter((item) =>
      context.pendingQuestionIds.includes(item.id)
    );

    logPublicExperienceAnswerDebug("save_deduped_latest_answer", {
      conversationId,
      requestedQuestionId,
      matchedQuestionId: latestSavedAnswer.questionId,
      answerText: latestSavedAnswer.answerText,
      nextQuestionId: remainingQuestions[0]?.id ?? null,
    });

    return {
      ok: true,
      conversationId,
      savedQuestion: {
        id: latestSavedAnswer.questionId,
        question: latestSavedAnswer.questionText,
      },
      answerText: latestSavedAnswer.answerText,
      latestAnswers: context.latestAnswers,
      pendingQuestionIds: context.pendingQuestionIds,
      nextQuestion: remainingQuestions[0]
        ? {
            id: remainingQuestions[0].id,
            question: remainingQuestions[0].question,
            expectedAnswer: remainingQuestions[0].expectedAnswer,
          }
        : null,
      isComplete: context.pendingQuestionIds.length === 0,
      deduped: true,
    };
  }

  const requestedPendingQuestion = requestedQuestionId
    ? pendingQuestions.find((item) => item.id === requestedQuestionId) ?? null
    : null;

  if (requestedQuestionId && !requestedPendingQuestion) {
    logPublicExperienceAnswerDebug("save_rejected_question_not_pending", {
      conversationId,
      requestedQuestionId,
      pendingQuestionIds: pendingQuestions.map((question) => question.id),
    });

    return {
      ok: false,
      error: "The provided question is not pending anymore.",
      requestedQuestionId,
      pendingQuestionIds: pendingQuestions.map((question) => question.id),
    };
  }

  const question = requestedPendingQuestion ?? fallbackQuestion;

  if (!question) {
    logPublicExperienceAnswerDebug("save_rejected_no_pending_question", {
      conversationId,
      requestedQuestionId,
      answerText,
    });

    return {
      ok: false,
      error: "There is no pending question available to save.",
    };
  }

  const cacheKey = [conversationId, question.id, normalizedAnswerText].join("::");
  const existingAnswer = context.latestAnswers.find((answer) => answer.questionId === question.id);

  if (existingAnswer && existingAnswer.answerText.trim().toLowerCase() === normalizedAnswerText) {
    const remainingQuestions = context.item.questions.filter((item) =>
      context.pendingQuestionIds.includes(item.id)
    );

    logPublicExperienceAnswerDebug("save_deduped_existing_question_answer", {
      conversationId,
      questionId: question.id,
      answerText: existingAnswer.answerText,
      nextQuestionId: remainingQuestions[0]?.id ?? null,
    });

    return {
      ok: true,
      conversationId,
      savedQuestion: {
        id: question.id,
        question: question.question,
      },
      answerText: existingAnswer.answerText,
      latestAnswers: context.latestAnswers,
      pendingQuestionIds: context.pendingQuestionIds,
      nextQuestion: remainingQuestions[0]
        ? {
            id: remainingQuestions[0].id,
            question: remainingQuestions[0].question,
            expectedAnswer: remainingQuestions[0].expectedAnswer,
          }
        : null,
      isComplete: context.pendingQuestionIds.length === 0,
    };
  }

  const inFlightRequest =
    saveAnswerRequestCache.get(cacheKey) ??
    (async () => {
      const contextItem = context.item;
      if (!contextItem) {
        return {
          ok: false,
          error: "Public experience context is not available.",
        };
      }

      logPublicExperienceAnswerDebug("save_persist_start", {
        conversationId,
        requestedQuestionId,
        resolvedQuestionId: question.id,
        questionText: question.question,
        answerText,
      });

      const result = await context.saveAnswer({
        questionId: question.id,
        questionText: question.question,
        answerText,
      });

      if (currentContext === context) {
        currentContext = {
          ...context,
          latestAnswers: result.latestAnswers,
          pendingQuestionIds: result.pendingQuestionIds,
        };
      }

      const remainingQuestions = contextItem.questions.filter((item) =>
        result.pendingQuestionIds.includes(item.id)
      );

      logPublicExperienceAnswerDebug("save_persist_success", {
        conversationId,
        resolvedQuestionId: question.id,
        answerText,
        pendingQuestionIds: result.pendingQuestionIds,
        nextQuestionId: remainingQuestions[0]?.id ?? null,
        isComplete: result.pendingQuestionIds.length === 0,
      });

      return {
        ok: true,
        conversationId,
        savedQuestion: {
          id: question.id,
          question: question.question,
        },
        answerText,
        latestAnswers: result.latestAnswers,
        pendingQuestionIds: result.pendingQuestionIds,
        nextQuestion: remainingQuestions[0]
          ? {
              id: remainingQuestions[0].id,
              question: remainingQuestions[0].question,
              expectedAnswer: remainingQuestions[0].expectedAnswer,
            }
          : null,
        isComplete: result.pendingQuestionIds.length === 0,
      };
    })();

  if (!saveAnswerRequestCache.has(cacheKey)) {
    saveAnswerRequestCache.set(cacheKey, inFlightRequest);
  } else {
    logPublicExperienceAnswerDebug("save_reused_inflight_request", {
      conversationId,
      requestedQuestionId,
      resolvedQuestionId: question.id,
      answerText,
    });
  }

  try {
    return await inFlightRequest;
  } finally {
    if (saveAnswerRequestCache.get(cacheKey) === inFlightRequest) {
      saveAnswerRequestCache.delete(cacheKey);
    }
  }
}
