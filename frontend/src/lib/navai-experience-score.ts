export type NavaiExperienceScoreConversationInput = {
  status: "Open" | "Completed" | "Abandoned";
  startedAt: string;
  updatedAt: string;
  endedAt: string;
  totalQuestions: number;
  answeredQuestions: number;
  answers: Array<{
    aiScore: number;
  }>;
};

export type NavaiExperienceCompositeScore = {
  totalScore: number;
  averageAiScore: number;
  averageSecondsPerAnswer: number;
  conversationsCount: number;
  completedCount: number;
  openCount: number;
  abandonedCount: number;
  answeredQuestions: number;
  totalQuestions: number;
  gradedAnswersCount: number;
};

const MAX_ANSWER_DEPTH = 8;
const MAX_CONVERSATION_COUNT = 4;
const FULL_RESPONSE_PACE_SECONDS = 30;

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function getConversationDurationSeconds(
  startedAt: string,
  endedAt: string,
  updatedAt: string
) {
  const startedTime = new Date(startedAt).getTime();
  const finishedTime = new Date(endedAt || updatedAt).getTime();

  if (
    !Number.isFinite(startedTime) ||
    !Number.isFinite(finishedTime) ||
    finishedTime < startedTime
  ) {
    return 0;
  }

  return Math.max(0, Math.round((finishedTime - startedTime) / 1000));
}

export function calculateExperienceCompositeScore(
  conversations: NavaiExperienceScoreConversationInput[]
): NavaiExperienceCompositeScore {
  let completedCount = 0;
  let openCount = 0;
  let abandonedCount = 0;
  let answeredQuestions = 0;
  let totalQuestions = 0;
  let totalAiScore = 0;
  let gradedAnswersCount = 0;
  let totalDurationSeconds = 0;

  for (const conversation of conversations) {
    if (conversation.status === "Completed") {
      completedCount += 1;
    } else if (conversation.status === "Abandoned") {
      abandonedCount += 1;
    } else {
      openCount += 1;
    }

    answeredQuestions += conversation.answeredQuestions;
    totalQuestions += conversation.totalQuestions;
    totalDurationSeconds += getConversationDurationSeconds(
      conversation.startedAt,
      conversation.endedAt,
      conversation.updatedAt
    );

    for (const answer of conversation.answers) {
      if (Number.isFinite(answer.aiScore) && answer.aiScore >= 1) {
        totalAiScore += answer.aiScore;
        gradedAnswersCount += 1;
      }
    }
  }

  const conversationsCount = conversations.length;
  const coverageFactor =
    totalQuestions > 0 ? clamp01(answeredQuestions / totalQuestions) : 0;
  const answerDepthFactor = clamp01(answeredQuestions / MAX_ANSWER_DEPTH);
  const conversationFactor = clamp01(
    conversationsCount / MAX_CONVERSATION_COUNT
  );
  const statusFactor =
    conversationsCount > 0
      ? clamp01(
          (completedCount + openCount * 0.4 - abandonedCount * 0.35) /
            conversationsCount
        )
      : 0;
  const averageAiScore =
    gradedAnswersCount > 0 ? totalAiScore / gradedAnswersCount : 0;
  const averageSecondsPerAnswer =
    answeredQuestions > 0 ? totalDurationSeconds / answeredQuestions : 0;
  const responsePaceFactor =
    answeredQuestions > 0
      ? clamp01(averageSecondsPerAnswer / FULL_RESPONSE_PACE_SECONDS)
      : 0;
  const qualityFactor =
    gradedAnswersCount > 0
      ? clamp01(averageAiScore / 10)
      : coverageFactor * 0.5;
  const totalScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        qualityFactor * 35 +
          statusFactor * 20 +
          coverageFactor * 15 +
          answerDepthFactor * 10 +
          conversationFactor * 5 +
          responsePaceFactor * 15
      )
    )
  );

  return {
    totalScore,
    averageAiScore,
    averageSecondsPerAnswer,
    conversationsCount,
    completedCount,
    openCount,
    abandonedCount,
    answeredQuestions,
    totalQuestions,
    gradedAnswersCount,
  };
}
