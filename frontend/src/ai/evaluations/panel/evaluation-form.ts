type EvaluationFormPayload = {
  name?: string;
  status?: "Draft" | "Active" | "Completed";
  accessMode?: "public" | "private";
  allowedEmails?: string[] | string;
  allowPlusUsers?: boolean;
  allowNonPlusUsers?: boolean;
  startsAt?: string;
  endsAt?: string;
  delegateAiGrading?: boolean;
  enableRanking?: boolean;
  enableComments?: boolean;
  rewardType?: "money" | "object" | "travel" | "voucher" | "other";
  rewardTitle?: string;
  rewardDescription?: string;
  rewardDeliveryMethod?:
    | "manual_coordination"
    | "bank_transfer"
    | "digital_wallet"
    | "hybrid"
    | "in_person";
  rewardDeliveryDetails?: string;
  rewardPaymentMethods?: string[];
  rewardWinnerCount?: number;
  rewardUsdAmount?: number;
  dailyAttemptLimit?: number;
  description?: string;
  welcomeBody?: string;
  autoStartConversation?: boolean;
  enableEntryModal?: boolean;
  enableHCaptcha?: boolean;
  openDialog?: boolean;
};

const EVALUATION_FORM_EVENT = "navai:panel-evaluation-form";
const EVALUATION_PATH = "/panel/evaluations";

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("This function is only available in the browser.");
  }
}

export async function completeEvaluationForm(payload?: EvaluationFormPayload) {
  ensureBrowser();

  if (window.location.pathname !== EVALUATION_PATH) {
    return {
      ok: false,
      error: "Open the Evaluations panel before using this function.",
      expectedPath: EVALUATION_PATH,
      currentPath: window.location.pathname,
    };
  }

  const patch = {
    ...(typeof payload?.name === "string" ? { name: payload.name } : {}),
    ...(typeof payload?.status === "string" ? { status: payload.status } : {}),
    ...(typeof payload?.accessMode === "string"
      ? { accessMode: payload.accessMode }
      : {}),
    ...(Array.isArray(payload?.allowedEmails)
      ? { allowedEmails: payload.allowedEmails }
      : typeof payload?.allowedEmails === "string"
        ? {
            allowedEmails: payload.allowedEmails
              .split(/[\n,;]+/g)
              .map((entry) => entry.trim().toLowerCase())
              .filter(Boolean),
          }
        : {}),
    ...(typeof payload?.allowPlusUsers === "boolean"
      ? { allowPlusUsers: payload.allowPlusUsers }
      : {}),
    ...(typeof payload?.allowNonPlusUsers === "boolean"
      ? { allowNonPlusUsers: payload.allowNonPlusUsers }
      : {}),
    ...(typeof payload?.startsAt === "string"
      ? { startsAt: payload.startsAt }
      : {}),
    ...(typeof payload?.endsAt === "string" ? { endsAt: payload.endsAt } : {}),
    ...(typeof payload?.delegateAiGrading === "boolean"
      ? { delegateAiGrading: payload.delegateAiGrading }
      : {}),
    ...(typeof payload?.enableRanking === "boolean"
      ? { enableRanking: payload.enableRanking }
      : {}),
    ...(typeof payload?.enableComments === "boolean"
      ? { enableComments: payload.enableComments }
      : {}),
    ...(typeof payload?.rewardType === "string"
      ? { rewardType: payload.rewardType }
      : {}),
    ...(typeof payload?.rewardTitle === "string"
      ? { rewardTitle: payload.rewardTitle }
      : {}),
    ...(typeof payload?.rewardDescription === "string"
      ? { rewardDescription: payload.rewardDescription }
      : {}),
    ...(typeof payload?.rewardDeliveryMethod === "string"
      ? { rewardDeliveryMethod: payload.rewardDeliveryMethod }
      : {}),
    ...(typeof payload?.rewardDeliveryDetails === "string"
      ? { rewardDeliveryDetails: payload.rewardDeliveryDetails }
      : {}),
    ...(Array.isArray(payload?.rewardPaymentMethods)
      ? { rewardPaymentMethods: payload.rewardPaymentMethods }
      : {}),
    ...(typeof payload?.rewardWinnerCount === "number"
      ? { rewardWinnerCount: payload.rewardWinnerCount }
      : {}),
    ...(typeof payload?.rewardUsdAmount === "number"
      ? { rewardUsdAmount: payload.rewardUsdAmount }
      : {}),
    ...(typeof payload?.dailyAttemptLimit === "number"
      ? { dailyAttemptLimit: payload.dailyAttemptLimit }
      : {}),
    ...(typeof payload?.description === "string"
      ? { description: payload.description }
      : {}),
    ...(typeof payload?.welcomeBody === "string"
      ? { welcomeBody: payload.welcomeBody }
      : {}),
    ...(typeof payload?.autoStartConversation === "boolean"
      ? { autoStartConversation: payload.autoStartConversation }
      : {}),
    ...(typeof payload?.enableEntryModal === "boolean"
      ? { enableEntryModal: payload.enableEntryModal }
      : {}),
    ...(typeof payload?.enableHCaptcha === "boolean"
      ? { enableHCaptcha: payload.enableHCaptcha }
      : {}),
  };

  window.dispatchEvent(
    new CustomEvent(EVALUATION_FORM_EVENT, {
      detail: {
        openDialog: payload?.openDialog !== false,
        patch,
      },
    })
  );

  return {
    ok: true,
    action: "complete_evaluation_form",
    appliedFields: Object.keys(patch),
  };
}
