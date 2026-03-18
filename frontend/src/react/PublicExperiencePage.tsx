"use client";

import { NavaiVoiceHeroOrb } from "@navai/voice-frontend";
import {
  Bot,
  Camera,
  Clock3,
  CreditCard,
  FileCheck2,
  Gift,
  Loader2,
  MessageSquareText,
  MessageSquarePlus,
  Package,
  Pencil,
  Star,
  Trophy,
  Trash2,
  VolumeX,
} from "lucide-react";
import Image from "@/platform/image";
import { useCallback, useEffect, useRef, useState } from "react";

import FirebaseGoogleAuthButton from "@/components/FirebaseGoogleAuthButton";
import HomeFooterBar from "@/components/HomeFooterBar";
import NavaiMicButton from "@/components/NavaiMicButton";
import { PublicExperienceLoadingSkeleton } from "@/components/AppShellSkeletons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HCaptchaGate, {
  type HCaptchaGateRef,
} from "@/components/security/HCaptchaGate";
import { Textarea } from "@/components/ui/textarea";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import {
  clearNavaiVoiceSessionContext,
  setNavaiVoiceSessionContext,
  type NavaiVoiceConversationStopPayload,
  type NavaiVoiceConversationTurn,
} from "@/lib/navai-voice-controller";
import {
  clearPublicExperienceAgentToolsContext,
  setPublicExperienceAgentToolsContext,
} from "@/lib/public-experience-agent-tools";
import { useI18n } from "@/lib/i18n/provider";
import { LEGAL_GUIDE_SLUGS } from "@/lib/legal-docs-guide";
import {
  createNavaiEntryOrder,
  createCloudflareStreamDirectUpload,
  createCloudflareStreamDownload,
  createPublicNavaiExperienceComment,
  createPublicNavaiConversation,
  deletePublicNavaiExperienceComment,
  getHCaptchaSiteKey,
  getNavaiEntryBilling,
  getPublicNavaiEvaluation,
  getPublicNavaiExperienceAccess,
  getPublicNavaiSurvey,
  getPublicNavaiUserProfile,
  listPublicNavaiExperienceComments,
  listPublicNavaiExperienceTop,
  NAVAI_EXPERIENCE_REWARD_PAYMENT_METHOD_LABELS,
  trackPublicNavaiEvaluationLaunch,
  trackPublicNavaiSurveyLaunch,
  type NavaiExperienceRewardDeliveryMethod,
  type NavaiExperienceRewardPaymentMethod,
  type NavaiExperienceRewardType,
  type NavaiPublicExperienceComment,
  type NavaiPublicExperienceTopEntry,
  updatePublicNavaiConversationProgress,
  updatePublicNavaiExperienceComment,
  uploadCloudflareStreamBlob,
  type NavaiPublicConversation,
  type NavaiPublicConversationAnswer,
  type NavaiEntryBilling,
  type NavaiPublicExperience,
  type NavaiUserProfile,
} from "@/lib/navai-panel-api";
import { useNavaiPanelAccess } from "@/lib/navai-panel-access";
import { useNavaiVoiceOrbAgent } from "@/lib/navai-voice-orb";
import { usePathname } from "@/platform/navigation";
import { useTheme } from "@/theme/provider";

import AppProvidersShell from "./AppProvidersShell";

type PublicExperiencePageProps = {
  kind: "evaluation" | "survey";
  slug?: string;
};

function buildExperienceInstructionsWithProgress(
  item: NavaiPublicExperience,
  pendingQuestionIds: string[],
  latestAnswers: NavaiPublicConversationAnswer[],
) {
  const answeredQuestionIds = new Set(
    latestAnswers.map((answer) => answer.questionId),
  );
  const orderedPendingQuestions = item.questions.filter((question) =>
    pendingQuestionIds.length > 0
      ? pendingQuestionIds.includes(question.id)
      : !answeredQuestionIds.has(question.id),
  );
  const lines = [
    `You are assisting on a public NAVAI ${item.kind}.`,
    `Experience name: ${item.name}.`,
    `Goal and behavior context: ${item.description || "Guide the visitor through the shared conversational flow."}`,
    item.welcomeBody ? `Opening guidance: ${item.welcomeBody}` : "",
    item.domain?.label ? `Related domain: ${item.domain.label}.` : "",
    item.domain?.routes?.length
      ? `Relevant routes: ${item.domain.routes.map((route) => `${route.label} (${route.url})`).join("; ")}`
      : "",
    "This is a guided structured conversation. Ask exactly one pending question at a time and wait for the user's answer before continuing.",
    "Treat the next user answer as the answer for the current pending question unless the user explicitly says they want to stop.",
    latestAnswers.length > 0
      ? `Already answered questions: ${latestAnswers.map((answer) => `${answer.questionText || answer.questionId}: ${answer.answerText}`).join(" | ")}`
      : "No questions have been answered yet.",
    orderedPendingQuestions.length > 0
      ? `Pending questions in order: ${orderedPendingQuestions.map((question, index) => `${index + 1}. ${question.question}`).join(" | ")}`
      : "All questions are already answered. Thank the user briefly and confirm the process is complete.",
  ].filter(Boolean);

  return lines.join("\n");
}

function logPublicExperiencePageDebug(
  event: string,
  payload: Record<string, unknown>,
) {
  if (typeof window === "undefined") {
    return;
  }

  console.log(`[navai public experience page] ${event}`, payload);
}

function buildExperienceAutoStartMessage(
  item: NavaiPublicExperience,
  pendingQuestionIds: string[],
  latestAnswers: NavaiPublicConversationAnswer[],
) {
  const answeredQuestionIds = new Set(
    latestAnswers.map((answer) => answer.questionId),
  );
  const orderedPendingQuestions = item.questions.filter((question) =>
    pendingQuestionIds.length > 0
      ? pendingQuestionIds.includes(question.id)
      : !answeredQuestionIds.has(question.id),
  );
  const firstPendingQuestion = orderedPendingQuestions[0]?.question ?? "";

  return [
    `The user just connected to the public NAVAI ${item.kind} "${item.name}".`,
    item.description
      ? `Use this description as behavior context: ${item.description}`
      : "",
    item.welcomeBody
      ? `Visible start instructions for the user: ${item.welcomeBody}`
      : "",
    orderedPendingQuestions.length > 0
      ? `Start the conversation now. Greet the user briefly and ask the first pending question immediately: ${firstPendingQuestion}`
      : "Start the conversation now, thank the user briefly, and explain that all questions are already completed.",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatExperienceDateTime(value: string) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatUsdCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.max(0, value));
}

function formatCopCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}

function resolveRewardMonetaryValues(item: NavaiPublicExperience) {
  const rewardPoints = Math.max(0, Math.round(Number(item.rewardPoints || 0)));
  const rewardAmountCop =
    Math.max(0, Math.round(Number(item.rewardAmountCop || 0))) ||
    rewardPoints * 4000;
  const rewardAmountUsdFromRate = item.exchangeRate?.rate
    ? Math.max(
        0,
        Math.round((rewardAmountCop / item.exchangeRate.rate) * 100) / 100,
      )
    : 0;
  const rewardAmountUsd =
    Math.max(0, Math.round(Number(item.rewardAmountUsd || 0) * 100) / 100) ||
    rewardAmountUsdFromRate;

  return {
    rewardPoints,
    rewardAmountCop,
    rewardAmountUsd,
  };
}

function getRewardTypeLabel(
  messages: ReturnType<typeof useI18n>["messages"],
  value: NavaiExperienceRewardType,
) {
  switch (value) {
    case "object":
      return messages.panelPage.experienceRewardTypeObjectLabel;
    case "travel":
      return messages.panelPage.experienceRewardTypeTravelLabel;
    case "voucher":
      return messages.panelPage.experienceRewardTypeVoucherLabel;
    case "other":
      return messages.panelPage.experienceRewardTypeOtherLabel;
    case "money":
    default:
      return messages.panelPage.experienceRewardTypeMoneyLabel;
  }
}

function getRewardDeliveryMethodLabel(
  messages: ReturnType<typeof useI18n>["messages"],
  value: NavaiExperienceRewardDeliveryMethod,
) {
  switch (value) {
    case "bank_transfer":
      return messages.panelPage.experienceRewardDeliveryBankTransferLabel;
    case "digital_wallet":
      return messages.panelPage.experienceRewardDeliveryDigitalWalletLabel;
    case "hybrid":
      return messages.panelPage.experienceRewardDeliveryHybridLabel;
    case "in_person":
      return messages.panelPage.experienceRewardDeliveryInPersonLabel;
    case "manual_coordination":
    default:
      return messages.panelPage.experienceRewardDeliveryManualLabel;
  }
}

function fillMessageTemplate(
  template: string,
  replacements: Record<string, string>,
) {
  return Object.entries(replacements).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, value),
    template,
  );
}

function formatFallbackPersonName(email: string, userId: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail) {
    return (
      normalizedEmail
        .split("@")[0]
        ?.replace(/[._-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase()) || normalizedEmail
    );
  }

  return userId ? `Usuario ${userId.slice(0, 6)}` : "Usuario";
}

function resolvePersonName(person: {
  displayName?: string;
  email?: string;
  userId?: string;
}) {
  const displayName = person.displayName?.trim();
  if (displayName) {
    return displayName;
  }

  return formatFallbackPersonName(person.email ?? "", person.userId ?? "");
}

function resolvePersonInitials(person: {
  displayName?: string;
  email?: string;
  userId?: string;
}) {
  const label = resolvePersonName(person)
    .split(/\s+/g)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return label || "NA";
}

function resolveExperienceAvailabilityState(
  item: NavaiPublicExperience | null,
  messages: ReturnType<typeof useI18n>["messages"],
) {
  if (!item) {
    return {
      code: "missing" as const,
      message: "",
      reactivatesAt: null as number | null,
    };
  }

  const now = Date.now();
  if (item.startsAt) {
    const startsAt = new Date(item.startsAt).getTime();
    if (Number.isFinite(startsAt) && now < startsAt) {
      return {
        code: "scheduled" as const,
        message: fillMessageTemplate(
          messages.panelPage.publicExperienceStartsAtMessage,
          { start: formatExperienceDateTime(item.startsAt) },
        ),
        reactivatesAt: startsAt,
      };
    }
  }

  if (item.endsAt) {
    const endsAt = new Date(item.endsAt).getTime();
    if (Number.isFinite(endsAt) && now > endsAt) {
      return {
        code: "ended" as const,
        message: fillMessageTemplate(
          messages.panelPage.publicExperienceEndsAtMessage,
          { end: formatExperienceDateTime(item.endsAt) },
        ),
        reactivatesAt: null,
      };
    }
  }

  return { code: "available" as const, message: "", reactivatesAt: null };
}

function resolveNextBogotaMidnightTimestamp() {
  const bogotaOffsetMs = -5 * 60 * 60 * 1000;
  const nowMs = Date.now();
  const bogotaLocalDate = new Date(nowMs + bogotaOffsetMs);
  const nextMidnightLocalMs = Date.UTC(
    bogotaLocalDate.getUTCFullYear(),
    bogotaLocalDate.getUTCMonth(),
    bogotaLocalDate.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );

  return nextMidnightLocalMs - bogotaOffsetMs;
}

function formatCountdownClock(totalMs: number) {
  const clampedSeconds = Math.max(0, Math.ceil(totalMs / 1000));
  const days = Math.floor(clampedSeconds / 86400);
  const hours = Math.floor((clampedSeconds % 86400) / 3600);
  const minutes = Math.floor((clampedSeconds % 3600) / 60);
  const seconds = clampedSeconds % 60;

  return [days, hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function PublicExperiencePersonAvatar({
  displayName,
  email,
  photoUrl,
  userId,
}: {
  displayName: string;
  email: string;
  photoUrl: string;
  userId: string;
}) {
  const initials = resolvePersonInitials({ displayName, email, userId });
  const resolvedName = resolvePersonName({ displayName, email, userId });

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={resolvedName}
        className="navai-public-experience-avatar"
        loading="lazy"
      />
    );
  }

  return (
    <div className="navai-public-experience-avatar navai-public-experience-avatar--fallback">
      <span>{initials}</span>
    </div>
  );
}

const MIN_CLOUDFLARE_UPLOAD_DURATION_SECONDS = 600;
const MAX_CLOUDFLARE_UPLOAD_DURATION_SECONDS = 60 * 60 * 4;

function resolveCloudflareUploadDurationSeconds(durationMs: number) {
  const roundedSeconds = Math.ceil(Math.max(0, durationMs) / 1000) + 120;
  return Math.min(
    MAX_CLOUDFLARE_UPLOAD_DURATION_SECONDS,
    Math.max(MIN_CLOUDFLARE_UPLOAD_DURATION_SECONDS, roundedSeconds),
  );
}

function getPublicExperienceCommentTimestamp(
  comment: NavaiPublicExperienceComment,
) {
  const parsed = new Date(comment.updatedAt || comment.createdAt).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getVisiblePublicExperienceComments(
  comments: NavaiPublicExperienceComment[],
  currentUserId: string,
  ratingFilter: number,
) {
  return [...comments]
    .filter((comment) =>
      ratingFilter > 0 ? comment.rating === ratingFilter : true,
    )
    .sort((left, right) => {
      const leftIsCurrentUser = currentUserId
        ? left.authorUserId === currentUserId
        : false;
      const rightIsCurrentUser = currentUserId
        ? right.authorUserId === currentUserId
        : false;
      if (leftIsCurrentUser !== rightIsCurrentUser) {
        return Number(rightIsCurrentUser) - Number(leftIsCurrentUser);
      }

      return (
        getPublicExperienceCommentTimestamp(right) -
        getPublicExperienceCommentTimestamp(left)
      );
    });
}

function upsertPublicExperienceCommentInList(
  comments: NavaiPublicExperienceComment[],
  nextComment: NavaiPublicExperienceComment,
) {
  return [
    nextComment,
    ...comments.filter(
      (comment) =>
        comment.id !== nextComment.id &&
        !(
          comment.experienceId === nextComment.experienceId &&
          comment.authorUserId === nextComment.authorUserId
        ),
    ),
  ];
}

function PublicExperienceStarRating({
  value,
  onChange,
  interactive = false,
}: {
  value: number;
  onChange?: (value: number) => void;
  interactive?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1;
        const isActive = starValue <= value;

        if (!interactive || !onChange) {
          return (
            <Star
              key={starValue}
              aria-hidden="true"
              className={`h-4 w-4 ${
                isActive ? "fill-amber-300 text-amber-300" : "text-white/25"
              }`}
            />
          );
        }

        return (
          <button
            key={starValue}
            type="button"
            className="rounded-sm p-0.5 transition hover:scale-105"
            onClick={() => onChange(starValue)}
            aria-label={`${starValue}`}
          >
            <Star
              aria-hidden="true"
              className={`h-5 w-5 ${
                isActive ? "fill-amber-300 text-amber-300" : "text-white/30"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

function PublicExperiencePageContent({
  kind,
  slug,
}: PublicExperiencePageProps) {
  const { messages } = useI18n();
  const { isInitializing, user } = useFirebaseAuth();
  const { isAdmin } = useNavaiPanelAccess();
  const { theme } = useTheme();
  const pathname = usePathname();
  const voiceOrbAgent = useNavaiVoiceOrbAgent();
  const [item, setItem] = useState<NavaiPublicExperience | null>(null);
  const [error, setError] = useState("");
  const [accessError, setAccessError] = useState("");
  const [isAccessStatusLoading, setIsAccessStatusLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [communityError, setCommunityError] = useState("");
  const [isCommunityLoading, setIsCommunityLoading] = useState(false);
  const [topEntries, setTopEntries] = useState<NavaiPublicExperienceTopEntry[]>(
    [],
  );
  const [comments, setComments] = useState<NavaiPublicExperienceComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentRating, setCommentRating] = useState(5);
  const [editingCommentId, setEditingCommentId] = useState("");
  const [isCommentEditorOpen, setIsCommentEditorOpen] = useState(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [communityDialog, setCommunityDialog] = useState<
    "top" | "comments" | null
  >(null);
  const [hasAcceptedEntryTerms, setHasAcceptedEntryTerms] = useState(false);
  const [hasAcceptedEntryRequirements, setHasAcceptedEntryRequirements] =
    useState(false);
  const [entryError, setEntryError] = useState("");
  const [entryPurchaseBilling, setEntryPurchaseBilling] =
    useState<NavaiEntryBilling | null>(null);
  const [entryPurchasePackageKey, setEntryPurchasePackageKey] = useState("");
  const [entryPurchaseError, setEntryPurchaseError] = useState("");
  const [entryPurchaseNotice, setEntryPurchaseNotice] = useState("");
  const [isEntryPurchaseLoading, setIsEntryPurchaseLoading] = useState(false);
  const [isEntryPurchaseCreating, setIsEntryPurchaseCreating] = useState(false);
  const [isPreparingEntryRequirements, setIsPreparingEntryRequirements] =
    useState(false);
  const [isCaptchaSiteKeyLoading, setIsCaptchaSiteKeyLoading] = useState(true);
  const [captchaSiteKey, setCaptchaSiteKey] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaEkey, setCaptchaEkey] = useState("");
  const [isCaptchaReady, setIsCaptchaReady] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [selectedProfile, setSelectedProfile] =
    useState<NavaiUserProfile | null>(null);
  const captchaGateRef = useRef<HCaptchaGateRef | null>(null);
  const hasTrackedLaunchRef = useRef(false);
  const [resolvedSlug, setResolvedSlug] = useState(slug ?? "");
  const [returnHref, setReturnHref] = useState("");
  const [latestAnswers, setLatestAnswers] = useState<
    NavaiPublicConversationAnswer[]
  >([]);
  const [pendingQuestionIds, setPendingQuestionIds] = useState<string[]>([]);
  const [countdownNowMs, setCountdownNowMs] = useState(() => Date.now());
  const activeConversationRef = useRef<NavaiPublicConversation | null>(null);
  const persistedTurnIdsRef = useRef<Set<string>>(new Set());
  const answeredQuestionIdsRef = useRef<Set<string>>(new Set());
  const latestAnswersRef = useRef<NavaiPublicConversationAnswer[]>([]);
  const pendingQuestionIdsRef = useRef<string[]>([]);
  const progressQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    if (slug) {
      setResolvedSlug(slug);
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    setResolvedSlug(searchParams.get("slug")?.trim() ?? "");
  }, [slug]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setReturnHref(
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    const loadItem = async () => {
      if (!resolvedSlug) {
        setItem(null);
        setError(messages.panelPage.publicExperienceNotFoundMessage);
        setIsLoading(false);
        return;
      }

      setItem(null);
      setIsLoading(true);

      try {
        const response =
          kind === "evaluation"
            ? await getPublicNavaiEvaluation(resolvedSlug)
            : await getPublicNavaiSurvey(resolvedSlug);
        if (!isMounted) {
          return;
        }

        setItem(response.item);
        setError("");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setItem(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : messages.panelPage.publicExperienceNotFoundMessage,
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadItem();

    return () => {
      isMounted = false;
    };
  }, [kind, messages.panelPage.publicExperienceNotFoundMessage, resolvedSlug]);

  useEffect(() => {
    if (!item) {
      return;
    }

    setLatestAnswers([]);
    setPendingQuestionIds(item.questions.map((question) => question.id));
    latestAnswersRef.current = [];
    pendingQuestionIdsRef.current = item.questions.map(
      (question) => question.id,
    );
    answeredQuestionIdsRef.current = new Set();
  }, [item]);

  useEffect(() => {
    setCommunityError("");
    setCommentDraft("");
    setCommentRating(5);
    setEditingCommentId("");
    setIsCommentEditorOpen(false);
    setCommunityDialog(null);
    setHasAcceptedEntryTerms(false);
    setHasAcceptedEntryRequirements(false);
    setEntryError("");
    setEntryPurchaseBilling(null);
    setEntryPurchasePackageKey("");
    setEntryPurchaseError("");
    setEntryPurchaseNotice("");
    setCaptchaToken("");
    setCaptchaEkey("");
    setIsCaptchaReady(false);
    setSelectedProfile(null);
    setProfileError("");
    setIsProfileDialogOpen(false);
  }, [item?.id]);

  useEffect(() => {
    setAccessError("");
  }, [resolvedSlug, user?.uid]);

  const isEntryModalEnabled = item?.enableEntryModal ?? true;
  const isHCaptchaEnabled = item?.enableHCaptcha ?? true;
  const resolveConversationAccessErrorMessage = useCallback(
    (message: string) => {
      if (message === "Daily attempt limit reached for this experience.") {
        return messages.panelPage
          .publicExperienceDailyAttemptLimitReachedMessage;
      }
      if (
        message === "This experience requires at least one available entry."
      ) {
        return messages.panelPage.publicExperiencePlusRequiredMessage;
      }
      if (message === "This experience is not currently active.") {
        return messages.panelPage.publicExperienceInactiveMessage;
      }

      return message;
    },
    [
      messages.panelPage.publicExperienceDailyAttemptLimitReachedMessage,
      messages.panelPage.publicExperienceInactiveMessage,
      messages.panelPage.publicExperiencePlusRequiredMessage,
    ],
  );

  useEffect(() => {
    let isMounted = true;

    const loadCaptchaSiteKey = async () => {
      if (!isHCaptchaEnabled) {
        if (!isMounted) {
          return;
        }

        setCaptchaSiteKey("");
        setIsCaptchaSiteKeyLoading(false);
        return;
      }

      setIsCaptchaSiteKeyLoading(true);
      try {
        const response = await getHCaptchaSiteKey();
        if (!isMounted) {
          return;
        }

        setCaptchaSiteKey(response.siteKey.trim());
      } catch {
        if (!isMounted) {
          return;
        }

        setCaptchaSiteKey("");
      } finally {
        if (isMounted) {
          setIsCaptchaSiteKeyLoading(false);
        }
      }
    };

    void loadCaptchaSiteKey();

    return () => {
      isMounted = false;
    };
  }, [isHCaptchaEnabled]);

  useEffect(() => {
    let isMounted = true;

    const loadAccessStatus = async () => {
      if (
        !item ||
        !user ||
        item.status !== "Active" ||
        resolveExperienceAvailabilityState(item, messages).message
      ) {
        if (!isMounted) {
          return;
        }

        setIsAccessStatusLoading(false);
        return;
      }

      setIsAccessStatusLoading(true);
      try {
        const idToken = await user.getIdToken();
        const response = await getPublicNavaiExperienceAccess(
          idToken,
          kind,
          item.slug,
        );
        if (!isMounted) {
          return;
        }

        setAccessError(
          response.canStart
            ? ""
            : resolveConversationAccessErrorMessage(response.error),
        );
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setAccessError(
          loadError instanceof Error
            ? resolveConversationAccessErrorMessage(loadError.message)
            : messages.panelPage.publicExperienceNotFoundMessage,
        );
      } finally {
        if (isMounted) {
          setIsAccessStatusLoading(false);
        }
      }
    };

    void loadAccessStatus();

    return () => {
      isMounted = false;
    };
  }, [item, kind, messages, resolveConversationAccessErrorMessage, user]);

  useEffect(() => {
    let isMounted = true;

    const loadEntryPurchaseBilling = async () => {
      if (!shouldShowPurchaseTab || !user) {
        if (!isMounted) {
          return;
        }

        setEntryPurchaseBilling(null);
        setEntryPurchasePackageKey("");
        setEntryPurchaseError("");
        setEntryPurchaseNotice("");
        setIsEntryPurchaseLoading(false);
        return;
      }

      setIsEntryPurchaseLoading(true);
      try {
        const idToken = await user.getIdToken();
        const response = await getNavaiEntryBilling(idToken);
        if (!isMounted) {
          return;
        }

        const activePackages = response.billing.packages.filter(
          (entryPackage) => entryPackage.isActive,
        );
        const fallbackKey =
          activePackages[0]?.key || response.billing.catalog.key || "";

        setEntryPurchaseBilling(response.billing);
        setEntryPurchasePackageKey((current) => {
          if (current && activePackages.some((entryPackage) => entryPackage.key === current)) {
            return current;
          }
          return fallbackKey;
        });
        setEntryPurchaseError("");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setEntryPurchaseBilling(null);
        setEntryPurchaseError(
          loadError instanceof Error
            ? loadError.message
            : messages.panelPage.publicExperiencePurchaseLoadErrorMessage,
        );
      } finally {
        if (isMounted) {
          setIsEntryPurchaseLoading(false);
        }
      }
    };

    void loadEntryPurchaseBilling();

    return () => {
      isMounted = false;
    };
  }, [
    messages.panelPage.publicExperiencePurchaseLoadErrorMessage,
    shouldShowPurchaseTab,
    user,
  ]);

  const loadCommunityData = useCallback(async () => {
    if (!item) {
      setTopEntries([]);
      setComments([]);
      setCommunityError("");
      return;
    }

    setIsCommunityLoading(true);
    try {
      const [topResponse, commentsResponse] = await Promise.all([
        item.enableRanking
          ? listPublicNavaiExperienceTop(kind, item.slug)
          : Promise.resolve({ ok: true as const, items: [] }),
        item.enableComments
          ? listPublicNavaiExperienceComments(kind, item.slug)
          : Promise.resolve({ ok: true as const, items: [] }),
      ]);

      setTopEntries(topResponse.items);
      setComments(commentsResponse.items);
      setCommunityError("");
    } catch (communityLoadError) {
      setCommunityError(
        communityLoadError instanceof Error
          ? communityLoadError.message
          : messages.panelPage.publicExperienceCommunityLoadErrorMessage,
      );
    } finally {
      setIsCommunityLoading(false);
    }
  }, [
    item,
    kind,
    messages.panelPage.publicExperienceCommunityLoadErrorMessage,
  ]);

  useEffect(() => {
    void loadCommunityData();
  }, [loadCommunityData]);

  const handlePurchaseEntryPackage = useCallback(async () => {
    if (!user) {
      setEntryPurchaseError(
        messages.panelPage.publicExperiencePurchaseRequiredAuthMessage,
      );
      return;
    }

    if (!entryPurchasePackageKey) {
      setEntryPurchaseError(messages.panelPage.entryPackagesNoActiveMessage);
      return;
    }

    setIsEntryPurchaseCreating(true);
    setEntryPurchaseError("");
    setEntryPurchaseNotice("");

    try {
      const idToken = await user.getIdToken();
      const response = await createNavaiEntryOrder(idToken, {
        packageKey: entryPurchasePackageKey,
      });
      if (typeof window !== "undefined" && response.checkoutUrl) {
        window.open(response.checkoutUrl, "_blank", "noopener,noreferrer");
      }
      setEntryPurchaseNotice(
        messages.panelPage.publicExperiencePurchaseCheckoutMessage,
      );
    } catch (purchaseError) {
      setEntryPurchaseError(
        purchaseError instanceof Error
          ? purchaseError.message
          : messages.panelPage.plusCreateOrderErrorMessage,
      );
    } finally {
      setIsEntryPurchaseCreating(false);
    }
  }, [
    entryPurchasePackageKey,
    messages.panelPage.entryPackagesNoActiveMessage,
    messages.panelPage.plusCreateOrderErrorMessage,
    messages.panelPage.publicExperiencePurchaseCheckoutMessage,
    messages.panelPage.publicExperiencePurchaseRequiredAuthMessage,
    user,
  ]);

  const openUserProfile = useCallback(
    async (userId: string) => {
      if (!userId) {
        return;
      }

      setIsProfileDialogOpen(true);
      setIsProfileLoading(true);
      setProfileError("");
      setSelectedProfile(null);

      try {
        const response = await getPublicNavaiUserProfile(userId);
        setSelectedProfile(response.profile);
      } catch (profileLoadError) {
        setSelectedProfile(null);
        setProfileError(
          profileLoadError instanceof Error
            ? profileLoadError.message
            : messages.panelPage.publicExperienceProfileLoadErrorMessage,
        );
      } finally {
        setIsProfileLoading(false);
      }
    },
    [messages.panelPage.publicExperienceProfileLoadErrorMessage],
  );

  const resetCommentComposer = useCallback(() => {
    setCommentDraft("");
    setCommentRating(5);
    setEditingCommentId("");
  }, []);

  const closeCommentEditor = useCallback(() => {
    setCommunityError("");
    setIsCommentEditorOpen(false);
    resetCommentComposer();
  }, [resetCommentComposer]);

  const submitComment = useCallback(async () => {
    if (!item || !item.enableComments) {
      return;
    }
    if (!user) {
      setCommunityError(messages.panelPage.publicExperienceCommentsAuthMessage);
      return;
    }

    const body = commentDraft.trim();
    if (!body) {
      setCommunityError(
        messages.panelPage.publicExperienceCommentRequiredMessage,
      );
      return;
    }
    const rating = Math.min(5, Math.max(1, commentRating || 5));

    setIsCommentSubmitting(true);
    setCommunityError("");

    try {
      const idToken = await user.getIdToken();
      if (editingCommentId) {
        const response = await updatePublicNavaiExperienceComment(
          idToken,
          editingCommentId,
          {
            body,
            rating,
          },
        );
        setComments((current) =>
          upsertPublicExperienceCommentInList(current, response.item),
        );
      } else {
        const response = await createPublicNavaiExperienceComment(
          idToken,
          kind,
          item.slug,
          { body, rating },
        );
        setComments((current) =>
          upsertPublicExperienceCommentInList(current, response.item),
        );
      }
      resetCommentComposer();
      setIsCommentEditorOpen(false);
    } catch (commentError) {
      setCommunityError(
        commentError instanceof Error
          ? commentError.message
          : messages.panelPage.publicExperienceCommentSaveErrorMessage,
      );
    } finally {
      setIsCommentSubmitting(false);
    }
  }, [
    commentDraft,
    commentRating,
    editingCommentId,
    item,
    kind,
    messages.panelPage.publicExperienceCommentRequiredMessage,
    messages.panelPage.publicExperienceCommentSaveErrorMessage,
    messages.panelPage.publicExperienceCommentsAuthMessage,
    resetCommentComposer,
    user,
  ]);

  const startCommentEdit = useCallback(
    (comment: NavaiPublicExperienceComment) => {
      setEditingCommentId(comment.id);
      setCommentDraft(comment.body);
      setCommentRating(comment.rating || 5);
      setIsCommentEditorOpen(true);
    },
    [],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!user || !commentId) {
        return;
      }

      setCommunityError("");

      try {
        const idToken = await user.getIdToken();
        await deletePublicNavaiExperienceComment(idToken, commentId);
        setComments((current) =>
          current.filter((comment) => comment.id !== commentId),
        );
        if (editingCommentId === commentId) {
          closeCommentEditor();
        }
      } catch (commentError) {
        setCommunityError(
          commentError instanceof Error
            ? commentError.message
            : messages.panelPage.publicExperienceCommentDeleteErrorMessage,
        );
      }
    },
    [
      closeCommentEditor,
      editingCommentId,
      messages.panelPage.publicExperienceCommentDeleteErrorMessage,
      user,
    ],
  );

  const enqueueProgressUpdate = useCallback(
    async (updater: () => Promise<void>) => {
      progressQueueRef.current = progressQueueRef.current
        .catch(() => undefined)
        .then(updater);
      await progressQueueRef.current;
    },
    [],
  );

  const buildAnsweredStateFromAnswers = useCallback(
    (
      answers: NavaiPublicConversationAnswer[],
      currentItem: NavaiPublicExperience,
    ) => {
      const answeredQuestionIds = new Set(
        answers.map((answer) => answer.questionId),
      );
      answeredQuestionIdsRef.current = answeredQuestionIds;
      latestAnswersRef.current = answers;
      const nextPendingQuestionIds = currentItem.questions
        .map((question) => question.id)
        .filter((questionId) => !answeredQuestionIds.has(questionId));
      pendingQuestionIdsRef.current = nextPendingQuestionIds;
      setLatestAnswers(answers);
      setPendingQuestionIds(nextPendingQuestionIds);
    },
    [],
  );

  const persistConversationUpdate = useCallback(
    async (
      input: Parameters<typeof updatePublicNavaiConversationProgress>[2],
    ) => {
      if (!user || !activeConversationRef.current) {
        return null;
      }

      const idToken = await user.getIdToken();
      logPublicExperiencePageDebug("progress_request", {
        conversationId: activeConversationRef.current.id,
        turnsCount: input.turns?.length ?? 0,
        answersCount: input.answers?.length ?? 0,
        answerQuestionIds:
          input.answers?.map((answer) => answer.questionId) ?? [],
        status: input.status ?? null,
      });
      const response = await updatePublicNavaiConversationProgress(
        idToken,
        activeConversationRef.current.id,
        input,
      );
      logPublicExperiencePageDebug("progress_response", {
        conversationId: response.conversation.id,
        latestAnswers: response.latestAnswers.map((answer) => ({
          questionId: answer.questionId,
          answerText: answer.answerText,
        })),
        answeredQuestions: response.conversation.answeredQuestions,
        status: response.conversation.status,
      });
      activeConversationRef.current = response.conversation;
      if (item) {
        buildAnsweredStateFromAnswers(response.latestAnswers, item);
      }
      return response;
    },
    [buildAnsweredStateFromAnswers, item, user],
  );

  const persistConversationAnswer = useCallback(
    async (input: {
      questionId: string;
      questionText: string;
      answerText: string;
    }) => {
      logPublicExperiencePageDebug("answer_persist_requested", {
        conversationId: activeConversationRef.current?.id ?? null,
        questionId: input.questionId,
        questionText: input.questionText,
        answerText: input.answerText,
      });

      const response = await persistConversationUpdate({
        answers: [
          {
            questionId: input.questionId,
            questionText: input.questionText,
            answerText: input.answerText,
          },
        ],
      });

      return {
        latestAnswers: response?.latestAnswers ?? latestAnswersRef.current,
        pendingQuestionIds:
          item?.questions
            .map((question) => question.id)
            .filter(
              (questionId) =>
                !(response?.latestAnswers ?? latestAnswersRef.current).some(
                  (answer) => answer.questionId === questionId,
                ),
            ) ?? pendingQuestionIdsRef.current,
      };
    },
    [item, persistConversationUpdate],
  );

  const handleConversationTurn = useCallback(
    async (turn: NavaiVoiceConversationTurn) => {
      if (
        !item ||
        !user ||
        !activeConversationRef.current ||
        persistedTurnIdsRef.current.has(turn.id)
      ) {
        return;
      }

      persistedTurnIdsRef.current.add(turn.id);

      await enqueueProgressUpdate(async () => {
        try {
          await persistConversationUpdate({
            turns: [
              {
                clientTurnId: turn.id,
                role: turn.role,
                transcript: turn.transcript,
                sourceEventType: turn.sourceEventType,
              },
            ],
          });
        } catch {
          persistedTurnIdsRef.current.delete(turn.id);
        }
      });
    },
    [enqueueProgressUpdate, item, persistConversationUpdate, user],
  );

  const handleConversationStopped = useCallback(
    async (payload: NavaiVoiceConversationStopPayload) => {
      const activeConversation = activeConversationRef.current;
      if (!item || !user || !activeConversation) {
        return;
      }

      await enqueueProgressUpdate(async () => {
        let audio:
          | {
              storagePath: string;
              downloadUrl: string;
              contentType: string;
              sizeBytes: number;
              durationMs: number;
            }
          | undefined;
        let video:
          | {
              storagePath: string;
              downloadUrl: string;
              contentType: string;
              sizeBytes: number;
              durationMs: number;
            }
          | undefined;

        if (payload.videoBlob && payload.videoBlob.size > 0) {
          try {
            const idToken = await user.getIdToken();
            const streamUpload = await createCloudflareStreamDirectUpload(
              idToken,
              {
                maxDurationSeconds: resolveCloudflareUploadDurationSeconds(
                  payload.videoDurationMs || payload.audioDurationMs,
                ),
              },
            );
            const uploadedVideo = await uploadCloudflareStreamBlob(
              streamUpload.uploadURL,
              streamUpload.uid,
              payload.videoBlob,
              `${activeConversation.id}-${Date.now()}.webm`,
              payload.videoMimeType || payload.videoBlob.type || "video/webm",
            );

            video = {
              storagePath: uploadedVideo.uid,
              downloadUrl: uploadedVideo.playbackUrl,
              contentType: uploadedVideo.contentType,
              sizeBytes: uploadedVideo.sizeBytes,
              durationMs: payload.videoDurationMs || payload.audioDurationMs,
            };

            try {
              const audioDownload = await createCloudflareStreamDownload(
                idToken,
                uploadedVideo.uid,
                { type: "audio" },
              );
              if (audioDownload.url) {
                audio = {
                  storagePath: `${uploadedVideo.uid}/downloads/audio`,
                  downloadUrl: audioDownload.url,
                  contentType: "audio/mp4",
                  sizeBytes: payload.audioBlob?.size ?? 0,
                  durationMs:
                    payload.audioDurationMs || payload.videoDurationMs,
                };
              }
            } catch {
              audio = undefined;
            }
          } catch {
            audio = undefined;
            video = undefined;
          }
        }

        await persistConversationUpdate({
          status:
            answeredQuestionIdsRef.current.size >= item.questions.length
              ? "Completed"
              : "Abandoned",
          audio,
          video,
        });

        activeConversationRef.current = null;
        persistedTurnIdsRef.current = new Set();
        setCaptchaToken("");
        setCaptchaEkey("");
        setIsCaptchaReady(false);
        captchaGateRef.current?.reset();
      });
    },
    [enqueueProgressUpdate, item, persistConversationUpdate, user],
  );

  useEffect(() => {
    if (!item) {
      setLatestAnswers([]);
      setPendingQuestionIds([]);
      activeConversationRef.current = null;
      persistedTurnIdsRef.current = new Set();
      answeredQuestionIdsRef.current = new Set();
      clearNavaiVoiceSessionContext();
      clearPublicExperienceAgentToolsContext();
      return;
    }

    setPublicExperienceAgentToolsContext({
      item,
      latestAnswers,
      pendingQuestionIds,
      getConversationId: () => activeConversationRef.current?.id ?? null,
      saveAnswer: persistConversationAnswer,
    });

    setNavaiVoiceSessionContext({
      agentProfile: "public-experience",
      model: item.agentModel || undefined,
      voice: item.agentVoice || undefined,
      instructions: item.description || item.systemPrompt,
      language: item.agentLanguage || undefined,
      extraInstructions: buildExperienceInstructionsWithProgress(
        item,
        pendingQuestionIds,
        latestAnswers,
      ),
      autoStartMessage: buildExperienceAutoStartMessage(
        item,
        pendingQuestionIds,
        latestAnswers,
      ),
      autoStartResponse: true,
      captureConversationAudio: true,
      captureConversationVideo: true,
      onConversationTurn: (turn) => {
        void handleConversationTurn(turn);
      },
      onConversationSessionStopped: (payload) => {
        void handleConversationStopped(payload);
      },
    });

    return () => {
      clearNavaiVoiceSessionContext();
      clearPublicExperienceAgentToolsContext();
    };
  }, [
    handleConversationStopped,
    handleConversationTurn,
    item,
    latestAnswers,
    pendingQuestionIds,
    persistConversationAnswer,
  ]);

  const ensureUserCameraVerification = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      throw new Error(
        messages.panelPage.publicExperienceEntryCameraPermissionMessage,
      );
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
      },
      audio: false,
    });

    for (const track of stream.getTracks()) {
      track.stop();
    }
  }, [messages.panelPage.publicExperienceEntryCameraPermissionMessage]);

  const completeEntryRequirements = useCallback(async () => {
    setEntryError("");

    if (isEntryModalEnabled && !hasAcceptedEntryTerms) {
      return;
    }
    if (isHCaptchaEnabled && !captchaSiteKey) {
      setEntryError(
        messages.panelPage.publicExperienceEntryCaptchaLoadErrorMessage,
      );
      return;
    }
    if (isHCaptchaEnabled && !captchaToken) {
      setEntryError(
        messages.panelPage.publicExperienceEntryCaptchaRequiredMessage,
      );
      return;
    }

    setIsPreparingEntryRequirements(true);
    try {
      if (isEntryModalEnabled) {
        await ensureUserCameraVerification();
      }
      setHasAcceptedEntryRequirements(true);
    } catch {
      setEntryError(
        messages.panelPage.publicExperienceEntryCameraPermissionMessage,
      );
    } finally {
      setIsPreparingEntryRequirements(false);
    }
  }, [
    captchaSiteKey,
    captchaToken,
    ensureUserCameraVerification,
    hasAcceptedEntryTerms,
    isEntryModalEnabled,
    isHCaptchaEnabled,
    messages.panelPage.publicExperienceEntryCaptchaLoadErrorMessage,
    messages.panelPage.publicExperienceEntryCameraPermissionMessage,
    messages.panelPage.publicExperienceEntryCaptchaRequiredMessage,
  ]);

  const handleBeforeStart = async () => {
    if (!item) {
      return;
    }

    if (
      (isEntryModalEnabled || isHCaptchaEnabled) &&
      !hasAcceptedEntryRequirements
    ) {
      throw new Error("captcha_required");
    }

    if (isHCaptchaEnabled && !captchaToken) {
      setHasAcceptedEntryRequirements(false);
      setEntryError(
        messages.panelPage.publicExperienceEntryCaptchaRequiredMessage,
      );
      captchaGateRef.current?.reset();
      throw new Error("captcha_required");
    }

    setAccessError("");
    setEntryError("");

    if (!hasTrackedLaunchRef.current) {
      hasTrackedLaunchRef.current = true;
      try {
        if (kind === "evaluation") {
          await trackPublicNavaiEvaluationLaunch(item.slug);
        } else {
          await trackPublicNavaiSurveyLaunch(item.slug);
        }
      } catch {
        hasTrackedLaunchRef.current = false;
      }
    }

    if (!user) {
      return;
    }

    const idToken = await user.getIdToken();
    let response;
    try {
      response = await createPublicNavaiConversation(idToken, kind, item.slug, {
        ...(isHCaptchaEnabled
          ? {
              hcaptchaToken: captchaToken,
              hcaptchaEkey: captchaEkey || undefined,
            }
          : {}),
      });
    } catch (conversationError) {
      const message =
        conversationError instanceof Error
          ? conversationError.message
          : messages.panelPage.publicExperienceNotFoundMessage;
      if (message === "captcha_invalid" || message === "captcha_required") {
        setHasAcceptedEntryRequirements(false);
        setEntryError(
          messages.panelPage.publicExperienceEntryCaptchaRequiredMessage,
        );
        setCaptchaToken("");
        setCaptchaEkey("");
        setIsCaptchaReady(false);
        captchaGateRef.current?.reset();
      } else if (
        message === "Daily attempt limit reached for this experience."
      ) {
        setAccessError(
          messages.panelPage.publicExperienceDailyAttemptLimitReachedMessage,
        );
      } else if (
        message === "This experience requires at least one available entry."
      ) {
        setAccessError(messages.panelPage.publicExperiencePlusRequiredMessage);
      } else if (
        message === "captcha_not_configured" ||
        message === "captcha_service_unavailable"
      ) {
        setHasAcceptedEntryRequirements(false);
        setEntryError(
          messages.panelPage.publicExperienceEntryCaptchaLoadErrorMessage,
        );
      } else {
        setAccessError(message);
      }
      throw conversationError;
    }
    activeConversationRef.current = response.conversation;
    persistedTurnIdsRef.current = new Set();
    buildAnsweredStateFromAnswers(response.latestAnswers, item);
    setCaptchaToken("");
    setCaptchaEkey("");
    setIsCaptchaReady(false);
    captchaGateRef.current?.reset();
  };

  const isActiveExperience = item?.status === "Active";
  const availabilityState = resolveExperienceAvailabilityState(item, messages);
  const availabilityMessage = availabilityState.message;
  const hasActiveSession = Boolean(user);
  const authRedirectHref =
    returnHref || (typeof window !== "undefined" ? window.location.href : "");
  const startInstructions =
    item?.welcomeBody || item?.description || messages.home.tagline;
  const authCardMessage = [
    item?.accessMode === "private"
      ? messages.panelPage.publicExperiencePrivateAuthMessage
      : startInstructions,
  ]
    .filter(Boolean)
    .join(" ");
  const unauthenticatedAccessMessage =
    !user && item
      ? item.accessMode === "private"
        ? messages.panelPage.publicExperiencePrivateAuthMessage
        : ""
      : "";
  const shouldShowMissingState = !isLoading && (!item || Boolean(error));
  const shouldShowRestrictedState =
    !isLoading &&
    Boolean(item) &&
    !error &&
    (Boolean(accessError) ||
      Boolean(unauthenticatedAccessMessage) ||
      !isActiveExperience ||
      Boolean(availabilityMessage));
  const shouldShowEntryHub = Boolean(
    !isLoading &&
    item &&
    user &&
    !isAccessStatusLoading &&
    !error &&
    !accessError &&
    isActiveExperience &&
    !availabilityMessage &&
    (isEntryModalEnabled || isHCaptchaEnabled) &&
    !hasAcceptedEntryRequirements,
  );
  const shouldShowCommunityRail = Boolean(
    item?.enableRanking || item?.enableComments,
  );
  const shouldShowCommunityAside = Boolean(
    !shouldShowRestrictedState &&
    !shouldShowEntryHub &&
    !shouldShowMissingState &&
    item &&
    shouldShowCommunityRail,
  );
  const canSubmitComments = Boolean(user && item?.enableComments);
  const currentUserComment =
    comments.find((comment) => comment.authorUserId === (user?.uid ?? "")) ??
    null;
  const currentUserTopEntry =
    topEntries.find((entry) => entry.userId === (user?.uid ?? "")) ?? null;
  const currentUserTopPosition = currentUserTopEntry
    ? topEntries.findIndex(
        (entry) => entry.userId === currentUserTopEntry.userId,
      ) + 1
    : null;
  const editingComment =
    comments.find((comment) => comment.id === editingCommentId) ?? null;
  const visibleComments = getVisiblePublicExperienceComments(
    comments,
    user?.uid ?? "",
    0,
  );
  const unavailableReasonMessage =
    accessError ||
    unauthenticatedAccessMessage ||
    availabilityMessage ||
    (item && !isActiveExperience
      ? messages.panelPage.publicExperienceInactiveMessage
      : "");
  const isMissingEntriesAccess =
    accessError === messages.panelPage.publicExperiencePlusRequiredMessage;
  const shouldShowPurchaseTab = Boolean(
    shouldShowRestrictedState && isMissingEntriesAccess,
  );
  const unavailableCountdownTargetMs =
    availabilityState.code === "scheduled"
      ? availabilityState.reactivatesAt
      : accessError ===
          messages.panelPage.publicExperienceDailyAttemptLimitReachedMessage
        ? resolveNextBogotaMidnightTimestamp()
        : null;
  const shouldShowUnavailableReactivationBox = Boolean(
    shouldShowRestrictedState && availabilityState.code !== "ended",
  );
  const shouldShowUnavailableReasonInMainCopy = !(
    shouldShowUnavailableReactivationBox && !unavailableCountdownTargetMs
  );
  const unavailableCountdownDisplay = unavailableCountdownTargetMs
    ? formatCountdownClock(unavailableCountdownTargetMs - countdownNowMs)
    : "";
  const startsAtTimestamp = item?.startsAt
    ? new Date(item.startsAt).getTime()
    : Number.NaN;
  const endsAtTimestamp = item?.endsAt
    ? new Date(item.endsAt).getTime()
    : Number.NaN;
  const hasConfiguredScheduleWindow =
    Number.isFinite(startsAtTimestamp) && Number.isFinite(endsAtTimestamp);
  const shouldShowEntryHubExpirationBox = Boolean(
    shouldShowEntryHub && hasConfiguredScheduleWindow,
  );
  const entryHubExpirationDateLabel =
    item?.endsAt && Number.isFinite(endsAtTimestamp)
      ? fillMessageTemplate(
          messages.panelPage.publicExperienceExpirationDateLabel,
          {
            end: formatExperienceDateTime(item.endsAt),
          },
        )
      : "";
  const canShowFullCommunityResults =
    availabilityState.code === "ended" ||
    (!isActiveExperience && availabilityState.code !== "scheduled");
  const isReadyToStartConversation = Boolean(
    item &&
    (!(isEntryModalEnabled || isHCaptchaEnabled) ||
      hasAcceptedEntryRequirements),
  );
  const isPrimaryLoadingPhase = isLoading;
  const isAccessResolvingPhase = Boolean(
    !isPrimaryLoadingPhase &&
    item &&
    user &&
    isAccessStatusLoading &&
    !error &&
    !accessError &&
    !availabilityMessage,
  );
  const entryHubTabLabel = isEntryModalEnabled
    ? messages.panelPage.publicExperienceEntryDialogTitle
    : messages.panelPage.publicExperienceEntryCaptchaTitle;
  const entryHubMessage = isEntryModalEnabled
    ? messages.panelPage.publicExperienceEntryDialogDescription
    : messages.panelPage.publicExperienceEntryCaptchaDescription;

  const openCommentEditor = useCallback(() => {
    setCommunityError("");
    if (currentUserComment) {
      setEditingCommentId(currentUserComment.id);
      setCommentDraft(currentUserComment.body);
      setCommentRating(currentUserComment.rating || 5);
    } else {
      resetCommentComposer();
    }
    setIsCommentEditorOpen(true);
  }, [currentUserComment, resetCommentComposer]);
  const entryGuidelines = [
    {
      icon: Clock3,
      title: messages.panelPage.publicExperienceEntryTimeTitle,
      description: messages.panelPage.publicExperienceEntryTimeDescription,
    },
    {
      icon: VolumeX,
      title: messages.panelPage.publicExperienceEntryNoiseTitle,
      description: messages.panelPage.publicExperienceEntryNoiseDescription,
    },
    {
      icon: Camera,
      title: messages.panelPage.publicExperienceEntryVideoTitle,
      description: messages.panelPage.publicExperienceEntryVideoDescription,
    },
    {
      icon: Bot,
      title: messages.panelPage.publicExperienceEntryBotTitle,
      description: messages.panelPage.publicExperienceEntryBotDescription,
    },
    {
      icon: FileCheck2,
      title: messages.panelPage.publicExperienceEntryTermsTitle,
      description: messages.panelPage.publicExperienceEntryTermsDescription,
    },
  ];
  const publicExperienceLegalDocs = LEGAL_GUIDE_SLUGS.map((docSlug) => ({
    slug: docSlug,
    title: messages.docsCatalog.entries[docSlug]?.title ?? docSlug,
    href: `/documentation/${docSlug}`,
  }));

  const renderTopSection = (variant: "sidebar" | "dialog") => {
    if (!item?.enableRanking) {
      return null;
    }

    return (
      <section
        className={`navai-public-experience-sidecard ${variant === "dialog" ? "is-dialog" : ""}`}
      >
        <header className="navai-public-experience-sidecard-header">
          <div>
            <p className="navai-public-experience-sidecard-eyebrow">
              {messages.panelPage.publicExperienceRankingEyebrow}
            </p>
            <h2>{messages.panelPage.publicExperienceRankingTitle}</h2>
          </div>
          <Trophy aria-hidden="true" />
        </header>

        {isCommunityLoading ? (
          <p className="navai-public-experience-sidecard-empty">
            {messages.panelPage.publicExperienceCommunityLoadingLabel}
          </p>
        ) : !canShowFullCommunityResults ? (
          <div className="grid gap-3">
            <p className="text-sm leading-6 text-muted-foreground">
              {messages.panelPage.publicExperienceRankingDuringEventMessage}
            </p>

            {currentUserTopEntry ? (
              <div className="navai-public-experience-rewards-metrics">
                <div className="navai-public-experience-rewards-metric">
                  <span className="navai-public-experience-rewards-metric-label">
                    {messages.panelPage.publicExperienceRankingScoreLabel}
                  </span>
                  <strong className="navai-public-experience-rewards-metric-value">
                    {currentUserTopEntry.totalScore}
                  </strong>
                </div>
                <div className="navai-public-experience-rewards-metric">
                  <span className="navai-public-experience-rewards-metric-label">
                    {messages.panelPage.publicExperienceRankingPositionLabel}
                  </span>
                  <strong className="navai-public-experience-rewards-metric-value">
                    #{currentUserTopPosition}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="navai-public-experience-sidecard-empty">
                {
                  messages.panelPage
                    .publicExperienceRankingCurrentUserEmptyMessage
                }
              </p>
            )}
          </div>
        ) : topEntries.length === 0 ? (
          <p className="navai-public-experience-sidecard-empty">
            {messages.panelPage.publicExperienceRankingEmptyMessage}
          </p>
        ) : (
          <div className="navai-public-experience-person-list">
            {topEntries.map((entry, index) => (
              <button
                key={`${entry.userId}:${index}`}
                type="button"
                className="navai-public-experience-person-card"
                onClick={() => {
                  void openUserProfile(entry.userId);
                }}
              >
                <div className="navai-public-experience-person-meta">
                  <PublicExperiencePersonAvatar
                    displayName={entry.displayName}
                    email={entry.email}
                    photoUrl={entry.photoUrl}
                    userId={entry.userId}
                  />
                  <div>
                    <strong>{resolvePersonName(entry)}</strong>
                    <span>{entry.email}</span>
                  </div>
                </div>
                <div className="navai-public-experience-person-value">
                  <strong>{entry.totalScore}</strong>
                  <span>
                    {messages.panelPage.publicExperienceRankingScoreLabel}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderCommentsSection = (variant: "sidebar" | "dialog") => {
    if (!item?.enableComments) {
      return null;
    }

    return (
      <section
        className={`navai-public-experience-sidecard ${variant === "dialog" ? "is-dialog" : ""}`}
      >
        <header className="navai-public-experience-sidecard-header">
          <div>
            <p className="navai-public-experience-sidecard-eyebrow">
              {messages.panelPage.publicExperienceCommentsEyebrow}
            </p>
            <h2>{messages.panelPage.publicExperienceCommentsTitle}</h2>
          </div>
          {item.enableComments ? (
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/80 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
              onClick={openCommentEditor}
              aria-label={
                currentUserComment
                  ? messages.panelPage.publicExperienceCommentEditOwnActionLabel
                  : messages.panelPage.publicExperienceCommentOpenActionLabel
              }
            >
              <MessageSquarePlus aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : (
            <MessageSquareText aria-hidden="true" />
          )}
        </header>

        {communityError ? (
          <p className="navai-public-experience-sidecard-error">
            {communityError}
          </p>
        ) : null}

        {isCommunityLoading ? (
          <p className="navai-public-experience-sidecard-empty">
            {messages.panelPage.publicExperienceCommunityLoadingLabel}
          </p>
        ) : !canShowFullCommunityResults ? (
          <div className="grid gap-3">
            <p className="text-sm leading-6 text-muted-foreground">
              {messages.panelPage.publicExperienceCommentsDuringEventMessage}
            </p>

            {currentUserComment ? (
              <article className="navai-public-experience-comment-card">
                <button
                  type="button"
                  className="navai-public-experience-person-meta"
                  onClick={() => {
                    void openUserProfile(currentUserComment.authorUserId);
                  }}
                >
                  <PublicExperiencePersonAvatar
                    displayName={currentUserComment.authorDisplayName}
                    email={currentUserComment.authorEmail}
                    photoUrl={currentUserComment.authorPhotoUrl}
                    userId={currentUserComment.authorUserId}
                  />
                  <div>
                    <strong>
                      {resolvePersonName({
                        displayName: currentUserComment.authorDisplayName,
                        email: currentUserComment.authorEmail,
                        userId: currentUserComment.authorUserId,
                      })}
                    </strong>
                    <span>
                      {formatExperienceDateTime(
                        currentUserComment.updatedAt ||
                          currentUserComment.createdAt,
                      )}
                    </span>
                  </div>
                </button>

                <div className="flex items-center justify-between gap-3">
                  <PublicExperienceStarRating
                    value={currentUserComment.rating}
                  />
                  <span className="text-sm text-white/55">
                    {currentUserComment.rating}/5
                  </span>
                </div>

                <p>{currentUserComment.body}</p>

                <div className="navai-public-experience-comment-actions">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => startCommentEdit(currentUserComment)}
                  >
                    <Pencil aria-hidden="true" />
                    {messages.panelPage.editActionLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void deleteComment(currentUserComment.id);
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                    {messages.panelPage.deleteActionLabel}
                  </Button>
                </div>
              </article>
            ) : (
              <p className="navai-public-experience-sidecard-empty">
                {
                  messages.panelPage
                    .publicExperienceCommentsCurrentUserEmptyMessage
                }
              </p>
            )}
          </div>
        ) : visibleComments.length === 0 ? (
          <p className="navai-public-experience-sidecard-empty">
            {messages.panelPage.publicExperienceCommentsEmptyMessage}
          </p>
        ) : (
          <div className="navai-public-experience-comment-list">
            {visibleComments.map((comment) => {
              const canManageComment =
                isAdmin || comment.authorUserId === user?.uid;
              return (
                <article
                  key={comment.id}
                  className="navai-public-experience-comment-card"
                >
                  <button
                    type="button"
                    className="navai-public-experience-person-meta"
                    onClick={() => {
                      void openUserProfile(comment.authorUserId);
                    }}
                  >
                    <PublicExperiencePersonAvatar
                      displayName={comment.authorDisplayName}
                      email={comment.authorEmail}
                      photoUrl={comment.authorPhotoUrl}
                      userId={comment.authorUserId}
                    />
                    <div>
                      <strong>
                        {resolvePersonName({
                          displayName: comment.authorDisplayName,
                          email: comment.authorEmail,
                          userId: comment.authorUserId,
                        })}
                      </strong>
                      <span>
                        {formatExperienceDateTime(
                          comment.updatedAt || comment.createdAt,
                        )}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center justify-between gap-3">
                    <PublicExperienceStarRating value={comment.rating} />
                    <span className="text-sm text-white/55">
                      {comment.rating}/5
                    </span>
                  </div>

                  <p>{comment.body}</p>

                  {canManageComment ? (
                    <div className="navai-public-experience-comment-actions">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startCommentEdit(comment)}
                      >
                        <Pencil aria-hidden="true" />
                        {messages.panelPage.editActionLabel}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void deleteComment(comment.id);
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                        {messages.panelPage.deleteActionLabel}
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const renderRewardsSection = () => {
    if (!item) {
      return null;
    }

    const { rewardPoints, rewardAmountUsd } = resolveRewardMonetaryValues(item);
    const formattedRewardUsdAmount = formatUsdCurrency(rewardAmountUsd);
    const rewardTitle = item.rewardTitle.trim();
    const rewardDescription = item.rewardDescription.trim();
    const rewardDeliveryDetails = item.rewardDeliveryDetails.trim();
    const rewardPaymentMethodLabels = item.rewardPaymentMethods
      .map(
        (paymentMethod) =>
          NAVAI_EXPERIENCE_REWARD_PAYMENT_METHOD_LABELS[
            paymentMethod as NavaiExperienceRewardPaymentMethod
          ] ?? paymentMethod,
      )
      .filter(Boolean);
    const hasRewardConfigured =
      rewardPoints > 0 ||
      item.rewardType !== "money" ||
      Math.max(1, item.rewardWinnerCount || 1) > 1 ||
      item.rewardDeliveryMethod !== "manual_coordination" ||
      Boolean(rewardTitle) ||
      Boolean(rewardDescription) ||
      Boolean(rewardDeliveryDetails) ||
      rewardPaymentMethodLabels.length > 0;

    return (
      <section className="navai-public-experience-sidecard">
        <header className="navai-public-experience-sidecard-header">
          <div>
            <p className="navai-public-experience-sidecard-eyebrow">
              {messages.panelPage.publicExperienceRewardsEyebrow}
            </p>
            <h2>{messages.panelPage.publicExperienceRewardsTabLabel}</h2>
          </div>
          <Gift aria-hidden="true" />
        </header>

        <div className="navai-public-experience-rewards-metrics">
          <div className="navai-public-experience-rewards-metric">
            <span className="navai-public-experience-rewards-metric-label">
              {messages.panelPage.publicExperienceRewardTypeLabel}
            </span>
            <strong className="navai-public-experience-rewards-metric-value">
              {getRewardTypeLabel(messages, item.rewardType)}
            </strong>
          </div>
          <div className="navai-public-experience-rewards-metric">
            <span className="navai-public-experience-rewards-metric-label">
              {messages.panelPage.publicExperienceRewardWinnerCountLabel}
            </span>
            <strong className="navai-public-experience-rewards-metric-value">
              {String(Math.max(1, item.rewardWinnerCount || 1))}
            </strong>
          </div>
          <div className="navai-public-experience-rewards-metric">
            <span className="navai-public-experience-rewards-metric-label">
              {messages.panelPage.publicExperienceRewardAmountLabel}
            </span>
            <strong className="navai-public-experience-rewards-metric-value">
              {rewardAmountUsd > 0 ? formattedRewardUsdAmount : "-"}
            </strong>
          </div>
        </div>

        {hasRewardConfigured ? (
          <div className="grid gap-3">
            {rewardTitle ? (
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                <span className="navai-public-experience-rewards-metric-label">
                  {messages.panelPage.publicExperienceRewardTitleLabel}
                </span>
                <p className="mt-2 text-base font-semibold text-foreground">
                  {rewardTitle}
                </p>
              </div>
            ) : null}

            {rewardDescription ? (
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                <span className="navai-public-experience-rewards-metric-label">
                  {messages.panelPage.publicExperienceRewardDescriptionLabel}
                </span>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {rewardDescription}
                </p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
              <span className="navai-public-experience-rewards-metric-label">
                {messages.panelPage.publicExperienceRewardDeliveryMethodLabel}
              </span>
              <p className="mt-2 text-sm font-medium text-foreground">
                {getRewardDeliveryMethodLabel(
                  messages,
                  item.rewardDeliveryMethod,
                )}
              </p>
            </div>

            {rewardPaymentMethodLabels.length > 0 ? (
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                <span className="navai-public-experience-rewards-metric-label">
                  {messages.panelPage.publicExperienceRewardPaymentMethodsLabel}
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {rewardPaymentMethodLabels.map((paymentMethod) => (
                    <span
                      key={paymentMethod}
                      className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {paymentMethod}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {rewardDeliveryDetails ? (
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                <span className="navai-public-experience-rewards-metric-label">
                  {
                    messages.panelPage
                      .publicExperienceRewardDeliveryDetailsLabel
                  }
                </span>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {rewardDeliveryDetails}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="navai-public-experience-sidecard-empty">
            {messages.panelPage.publicExperienceRewardEmptyMessage}
          </p>
        )}
      </section>
    );
  };

  const renderOrganizerSection = () => {
    if (!item?.organizer) {
      return (
        <section className="navai-public-experience-sidecard navai-public-experience-sidecard--organizer">
          <header className="navai-public-experience-sidecard-header navai-public-experience-sidecard-header--organizer">
            <div>
              <p className="navai-public-experience-sidecard-eyebrow">
                {messages.panelPage.publicExperienceOrganizerEyebrow}
              </p>
              <h2>{messages.panelPage.publicExperienceOrganizerTitle}</h2>
            </div>
          </header>
          <p className="navai-public-experience-sidecard-empty">
            {messages.panelPage.publicExperienceOrganizerEmptyMessage}
          </p>
        </section>
      );
    }

    const organizer = item.organizer;
    const organizerName = resolvePersonName({
      displayName: organizer.displayName,
      email: organizer.email,
      userId: organizer.userId,
    });
    const organizerHeadline = organizer.professionalHeadline.trim();
    const organizerBio = organizer.bio.trim();
    const organizerProfessionalSummary = [organizer.jobTitle, organizer.company]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" / ");
    const organizerNetworks = [
      {
        label: messages.panelPage.userProfileWebsiteFieldLabel,
        href: organizer.websiteUrl,
      },
      {
        label: messages.panelPage.userProfileLinkedinFieldLabel,
        href: organizer.linkedinUrl,
      },
      {
        label: messages.panelPage.userProfileGithubFieldLabel,
        href: organizer.githubUrl,
      },
      {
        label: messages.panelPage.userProfileXFieldLabel,
        href: organizer.xUrl,
      },
      {
        label: messages.panelPage.userProfileInstagramFieldLabel,
        href: organizer.instagramUrl,
      },
      {
        label: messages.panelPage.userProfileFacebookFieldLabel,
        href: organizer.facebookUrl,
      },
    ].filter((entry) => entry.href.trim().length > 0);
    const { rewardPoints } = resolveRewardMonetaryValues(item);
    const hasRewardConfigured =
      rewardPoints > 0 ||
      item.rewardType !== "money" ||
      Math.max(1, item.rewardWinnerCount || 1) > 1 ||
      item.rewardDeliveryMethod !== "manual_coordination" ||
      Boolean(item.rewardTitle.trim()) ||
      Boolean(item.rewardDescription.trim()) ||
      Boolean(item.rewardDeliveryDetails.trim()) ||
      item.rewardPaymentMethods.length > 0;

    return (
      <section className="navai-public-experience-sidecard navai-public-experience-sidecard--organizer">
        <header className="navai-public-experience-sidecard-header navai-public-experience-sidecard-header--organizer">
          <div>
            <p className="navai-public-experience-sidecard-eyebrow">
              {messages.panelPage.publicExperienceOrganizerEyebrow}
            </p>
            <h2>{messages.panelPage.publicExperienceOrganizerTitle}</h2>
          </div>
        </header>

        <div className="navai-public-experience-profile-card navai-public-experience-profile-card--organizer">
          <div className="navai-public-experience-profile-hero navai-public-experience-profile-hero--organizer">
            <PublicExperiencePersonAvatar
              displayName={organizer.displayName}
              email={organizer.email}
              photoUrl={organizer.photoUrl}
              userId={organizer.userId}
            />
            <div className="grid gap-2 navai-public-experience-profile-hero-copy--organizer">
              <div className="flex flex-wrap items-center gap-2">
                <h2>{organizerName}</h2>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    organizer.isVerified
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-border/60 bg-muted/15 text-muted-foreground"
                  }`}
                >
                  {organizer.isVerified
                    ? messages.panelPage.publicExperienceOrganizerVerifiedLabel
                    : messages.panelPage
                        .publicExperienceOrganizerUnverifiedLabel}
                </span>
              </div>
              <p>{organizerHeadline || organizer.email}</p>
            </div>
          </div>

          {organizerBio ? (
            <p className="navai-public-experience-profile-bio">
              {organizerBio}
            </p>
          ) : null}

          <div className="navai-public-experience-profile-grid navai-public-experience-profile-grid--organizer">
            <div>
              <strong>
                {messages.panelPage.publicExperienceOrganizerUsernameLabel}
              </strong>
              <span>{organizer.email}</span>
            </div>
            <div>
              <strong>
                {messages.panelPage.publicExperienceOrganizerVerificationLabel}
              </strong>
              <span>
                {organizer.isVerified
                  ? messages.panelPage.publicExperienceOrganizerVerifiedLabel
                  : messages.panelPage.publicExperienceOrganizerUnverifiedLabel}
              </span>
            </div>
            <div>
              <strong>{messages.panelPage.userProfilePhotoUrlFieldLabel}</strong>
              {organizer.photoUrl ? (
                <a
                  href={organizer.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="navai-public-experience-profile-link navai-public-experience-profile-link--photo"
                >
                  <img
                    src={organizer.photoUrl}
                    alt={organizerName}
                    loading="lazy"
                    className="navai-public-experience-organizer-photo-preview"
                  />
                </a>
              ) : (
                <span>-</span>
              )}
            </div>
            {organizerProfessionalSummary ? (
              <div>
                <strong>
                  {messages.panelPage.userProfileProfessionalSectionTitle}
                </strong>
                <span>{organizerProfessionalSummary}</span>
              </div>
            ) : null}
            {organizer.location ? (
              <div>
                <strong>
                  {messages.panelPage.userProfileLocationFieldLabel}
                </strong>
                <span>{organizer.location}</span>
              </div>
            ) : null}
            {organizer.phone ? (
              <div>
                <strong>{messages.panelPage.userProfilePhoneFieldLabel}</strong>
                <span>{organizer.phone}</span>
              </div>
            ) : null}
          </div>

          {organizerNetworks.length > 0 ? (
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
              <span className="navai-public-experience-rewards-metric-label">
                {messages.panelPage.publicExperienceOrganizerNetworksLabel}
              </span>
              <div className="mt-3 flex flex-wrap gap-2 navai-public-experience-profile-chip-list">
                {organizerNetworks.map((network) => (
                  <a
                    key={`${network.label}:${network.href}`}
                    href={network.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-foreground transition hover:border-foreground/30 hover:bg-background"
                  >
                    {network.label}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {hasRewardConfigured ? (
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
              <span className="navai-public-experience-rewards-metric-label">
                {messages.panelPage.publicExperienceRewardsTabLabel}
              </span>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {
                  messages.panelPage
                    .publicExperienceOrganizerRewardResponsibleMessage
                }
              </p>
            </div>
          ) : null}
        </div>
      </section>
    );
  };

  const renderParticipationRulesSection = () => {
    if (!item) {
      return null;
    }

    const { rewardPoints, rewardAmountUsd } = resolveRewardMonetaryValues(item);
    const formattedRewardUsdAmount = formatUsdCurrency(rewardAmountUsd);
    const formattedRewardAmount = formattedRewardUsdAmount;
    const hasRewardConfigured =
      rewardPoints > 0 ||
      item.rewardType !== "money" ||
      Math.max(1, item.rewardWinnerCount || 1) > 1 ||
      item.rewardDeliveryMethod !== "manual_coordination" ||
      Boolean(item.rewardTitle.trim()) ||
      Boolean(item.rewardDescription.trim()) ||
      Boolean(item.rewardDeliveryDetails.trim()) ||
      item.rewardPaymentMethods.length > 0;
    const hasConfiguredScheduleWindow = Boolean(item.startsAt && item.endsAt);
    const participationRules = [
      messages.panelPage.publicExperienceRulesAgeRule,
      messages.panelPage.publicExperienceRulesSingleAccountRule,
      messages.panelPage.publicExperienceRulesAuthenticResponsesRule,
      fillMessageTemplate(
        messages.panelPage.publicExperienceRulesDailyLimitRule,
        {
          count: String(Math.max(1, item.dailyAttemptLimit || 1)),
        },
      ),
      hasConfiguredScheduleWindow
        ? fillMessageTemplate(
            messages.panelPage.publicExperienceRulesScheduleRule,
            {
              start: formatExperienceDateTime(item.startsAt),
              end: formatExperienceDateTime(item.endsAt),
            },
          )
        : messages.panelPage.publicExperienceRulesNoScheduleRule,
      ...(hasRewardConfigured
        ? [
            messages.panelPage.publicExperienceRulesRewardQuotaRule,
            fillMessageTemplate(
              messages.panelPage.publicExperienceRulesRewardDistributionRule,
              {
                count: String(Math.max(1, item.rewardWinnerCount || 1)),
                amount: formattedRewardAmount,
              },
            ),
            messages.panelPage.publicExperienceRulesNoRefundRule,
            messages.panelPage.publicExperienceRulesValidationRule,
          ]
        : []),
      messages.panelPage.publicExperienceRulesLegalAcceptanceRule,
    ].filter(Boolean);

    return (
      <section className="navai-public-experience-sidecard">
        <header className="navai-public-experience-sidecard-header">
          <div>
            <p className="navai-public-experience-sidecard-eyebrow">
              {messages.panelPage.publicExperienceRulesEyebrow}
            </p>
            <h2>{messages.panelPage.publicExperienceRulesTitle}</h2>
          </div>
          <FileCheck2 aria-hidden="true" />
        </header>

        <div className="navai-public-experience-rewards-rules">
          <ul className="navai-public-experience-rewards-rules-list">
            {participationRules.map((rule, index) => (
              <li key={`participation-rule:${index}`}>{rule}</li>
            ))}
          </ul>
        </div>
      </section>
    );
  };

  const renderCaptchaGate = () => {
    if (!isHCaptchaEnabled) {
      return null;
    }

    if (isCaptchaSiteKeyLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          <span>{messages.panelPage.publicExperienceEntryCaptchaTitle}</span>
        </div>
      );
    }

    if (!captchaSiteKey) {
      return (
        <p className="text-sm text-muted-foreground">
          {messages.panelPage.publicExperienceEntryCaptchaLoadErrorMessage}
        </p>
      );
    }

    return (
      <HCaptchaGate
        ref={captchaGateRef}
        sitekey={captchaSiteKey}
        theme={theme === "dark" ? "dark" : "light"}
        fallbackErrorMessage={
          messages.panelPage.publicExperienceEntryCaptchaLoadErrorMessage
        }
        onReadyChange={setIsCaptchaReady}
        onTokenChange={(token, ekey) => {
          setCaptchaToken(token ?? "");
          setCaptchaEkey(ekey ?? "");
          if (token) {
            setEntryError("");
          }
        }}
        onError={(message) => {
          setEntryError(
            message ||
              messages.panelPage.publicExperienceEntryCaptchaLoadErrorMessage,
          );
        }}
      />
    );
  };

  const renderEntrySection = () => (
    <section className="navai-public-experience-sidecard">
      <header className="navai-public-experience-sidecard-header">
        <div>
          <p className="navai-public-experience-sidecard-eyebrow">
            {messages.panelPage.publicExperienceEntryDialogTitle}
          </p>
          <h2>{entryHubTabLabel}</h2>
        </div>
        <FileCheck2 aria-hidden="true" />
      </header>

      <div className="space-y-5">
        {isEntryModalEnabled ? (
          <>
            <p className="text-sm leading-6 text-muted-foreground">
              {messages.panelPage.publicExperienceEntryDialogDescription}
            </p>

            <div className="grid gap-3 grid-cols-1">
              {entryGuidelines.map((guideline) => {
                const Icon = guideline.icon;
                return (
                  <div
                    key={guideline.title}
                    className="flex items-start gap-4 rounded-2xl border border-border/60 bg-background/50 p-4 shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {guideline.title}
                      </h3>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {guideline.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/50 p-4 text-sm text-foreground shadow-sm">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded border-border bg-background text-primary accent-primary shadow-sm"
                checked={hasAcceptedEntryTerms}
                onChange={(event) =>
                  setHasAcceptedEntryTerms(event.target.checked)
                }
              />
              <span className="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap">
                <span>
                  {messages.panelPage.publicExperienceEntryTermsCheckboxPrefix}
                </span>
                {publicExperienceLegalDocs.map((doc, index) => (
                  <span key={doc.slug} className="contents">
                    <a
                      href={doc.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-medium text-primary underline underline-offset-4 transition hover:text-primary/80"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {doc.title}
                    </a>
                    {index < publicExperienceLegalDocs.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground"
                      >
                        ·
                      </span>
                    ) : null}
                  </span>
                ))}
                <span>
                  {messages.panelPage.publicExperienceEntryTermsCheckboxSuffix}
                </span>
              </span>
            </label>
          </>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            {messages.panelPage.publicExperienceEntryCaptchaDescription}
          </p>
        )}

        {isHCaptchaEnabled ? (
          <div className="space-y-3 rounded-2xl border border-border/60 bg-background/50 p-4 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {messages.panelPage.publicExperienceEntryCaptchaTitle}
              </p>
              <p className="text-sm text-muted-foreground">
                {messages.panelPage.publicExperienceEntryCaptchaDescription}
              </p>
            </div>

            {renderCaptchaGate()}
          </div>
        ) : null}

        {entryError ? (
          <p className="navai-public-experience-sidecard-error">{entryError}</p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={
              (isEntryModalEnabled && !hasAcceptedEntryTerms) ||
              (isHCaptchaEnabled &&
                (isCaptchaSiteKeyLoading ||
                  !captchaSiteKey ||
                  !captchaToken ||
                  !isCaptchaReady)) ||
              isPreparingEntryRequirements
            }
            onClick={() => {
              void completeEntryRequirements();
            }}
          >
            {isPreparingEntryRequirements ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <FileCheck2 aria-hidden="true" />
            )}
            {messages.panelPage.publicExperienceEntryContinueActionLabel}
          </Button>
        </div>
      </div>
    </section>
  );

  const renderEntryPurchaseSection = () => {
    const activePackages =
      entryPurchaseBilling?.packages.filter((entryPackage) => entryPackage.isActive) ?? [];
    const selectedPackage =
      activePackages.find((entryPackage) => entryPackage.key === entryPurchasePackageKey) ??
      activePackages[0] ??
      null;

    return (
      <section className="navai-public-experience-sidecard">
        <header className="navai-public-experience-sidecard-header">
          <div>
            <p className="navai-public-experience-sidecard-eyebrow">
              {messages.panelPage.entryPackagesTitle}
            </p>
            <h2>{messages.panelPage.entryPackagesTitle}</h2>
          </div>
          <Package aria-hidden="true" />
        </header>

        <p className="text-sm leading-6 text-muted-foreground">
          {messages.panelPage.publicExperiencePurchaseDescription}
        </p>

        {isEntryPurchaseLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            <span>{messages.panelPage.publicExperiencePurchaseLoadingLabel}</span>
          </div>
        ) : activePackages.length === 0 ? (
          <p className="navai-public-experience-sidecard-empty">
            {messages.panelPage.entryPackagesNoActiveMessage}
          </p>
        ) : (
          <div className="grid gap-3">
            {activePackages.map((entryPackage) => {
              const isSelected = selectedPackage?.key === entryPackage.key;
              return (
                <button
                  key={entryPackage.key}
                  type="button"
                  className={`rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/60 bg-background/50 hover:border-primary/40"
                  }`}
                  onClick={() => setEntryPurchasePackageKey(entryPackage.key)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-sm text-foreground">{entryPackage.name}</strong>
                    {isSelected ? (
                      <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {messages.panelPage.entryPackagesSelectedLabel}
                      </span>
                    ) : null}
                  </div>
                  {entryPackage.description ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {entryPackage.description}
                    </p>
                  ) : null}
                  <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                    <p>
                      <strong>{messages.panelPage.plusOrderEntriesColumnLabel}</strong>{" "}
                      {entryPackage.entriesCount}
                    </p>
                    <p>
                      <strong>{messages.panelPage.entryPackagesUsdColumnLabel}</strong>{" "}
                      {formatUsdCurrency(entryPackage.totalUsd)}
                    </p>
                    <p>
                      <strong>{messages.panelPage.plusOrderAmountColumnLabel}</strong>{" "}
                      {formatCopCurrency(entryPackage.totalCopCents / 100)}
                    </p>
                    <p>
                      <strong>{messages.panelPage.entryPackagesVatLabel}</strong>{" "}
                      {entryPackage.vatPercentage}%
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {entryPurchaseError ? (
          <p className="navai-public-experience-sidecard-error">{entryPurchaseError}</p>
        ) : null}
        {entryPurchaseNotice ? (
          <p className="text-sm text-emerald-300">{entryPurchaseNotice}</p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={
              !selectedPackage || isEntryPurchaseLoading || isEntryPurchaseCreating
            }
            onClick={() => {
              void handlePurchaseEntryPackage();
            }}
          >
            {isEntryPurchaseCreating ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <CreditCard aria-hidden="true" />
            )}
            {messages.panelPage.plusPurchaseButtonLabel}
          </Button>
        </div>
      </section>
    );
  };

  useEffect(() => {
    if (!unavailableCountdownTargetMs) {
      return;
    }

    setCountdownNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setCountdownNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [unavailableCountdownTargetMs]);

  useEffect(() => {
    if (
      accessError !==
        messages.panelPage.publicExperienceDailyAttemptLimitReachedMessage ||
      !unavailableCountdownTargetMs ||
      countdownNowMs < unavailableCountdownTargetMs
    ) {
      return;
    }

    setAccessError("");
  }, [
    accessError,
    countdownNowMs,
    messages.panelPage.publicExperienceDailyAttemptLimitReachedMessage,
    unavailableCountdownTargetMs,
  ]);

  return (
    <section className="home-section navai-public-experience">
      {isPrimaryLoadingPhase ? (
        <PublicExperienceLoadingSkeleton />
      ) : isAccessResolvingPhase && item ? (
        <div className="navai-public-experience-shell">
          <div className="navai-public-experience-brand">
            <Image
              src="/navai_banner.webp"
              alt={messages.common.bannerAlt}
              width={250}
              height={89}
              priority
            />
          </div>

          <div className="navai-public-experience-card navai-public-experience-card--status">
            <div className="navai-public-experience-status-header">
              <div className="navai-public-experience-status-copy">
                <p className="navai-public-experience-eyebrow">
                  {messages.panelPage.publicExperienceLoadingLabel}
                </p>
                <h1 className="navai-public-experience-status-title">
                  {item.name}
                </h1>
                <p className="navai-public-experience-status-message">
                  {startInstructions}
                </p>
              </div>

              <div className="navai-public-experience-status-timer">
                <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
                <span className="navai-public-experience-status-timer-format">
                  {messages.panelPage.publicExperienceLoadingLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : !error &&
        !accessError &&
        item &&
        isActiveExperience &&
        !availabilityMessage &&
        !isAccessStatusLoading &&
        !shouldShowEntryHub &&
        hasActiveSession ? (
        <>
          <div className="home-orb-layer">
            <div className="home-hero-orb-wrap">
              <NavaiVoiceHeroOrb
                agent={voiceOrbAgent}
                themeMode={theme}
                backgroundColorLight="#000000"
                revealDelayMs={0}
                autoplayDelayMs={0}
              />
            </div>
          </div>

          <div className="home-voice-slot">
            <NavaiMicButton
              onBeforeStart={handleBeforeStart}
              showTeleprompter={false}
              autoStart={Boolean(
                item.autoStartConversation && isReadyToStartConversation,
              )}
              autoStartKey={`${item.id}:${item.autoStartConversation ? "auto" : "manual"}:${isReadyToStartConversation ? "accepted" : "pending"}`}
            />
          </div>

          <div className="home-content navai-public-experience-active-stack">
            <div className="home-brand navai-public-experience-home-brand">
              <Image
                src="/navai_banner.webp"
                alt={messages.common.bannerAlt}
                width={250}
                height={89}
                priority
              />
            </div>
          </div>

          <div className="navai-public-experience-instructions">
            <p className="navai-public-experience-home-title">
              {startInstructions}
            </p>
          </div>
        </>
      ) : !error &&
        !accessError &&
        item &&
        isActiveExperience &&
        !availabilityMessage &&
        !isAccessStatusLoading &&
        !hasActiveSession &&
        !shouldShowRestrictedState &&
        !shouldShowEntryHub &&
        !isInitializing ? (
        <div className="navai-public-experience-shell">
          <div className="navai-public-experience-brand">
            <Image
              src="/navai_banner.webp"
              alt={messages.common.bannerAlt}
              width={250}
              height={89}
              priority
            />
          </div>

          <div className="navai-public-experience-card navai-public-experience-auth-card">
            <h1>{item.name}</h1>
            <p>{authCardMessage}</p>

            <div className="navai-public-experience-auth-actions">
              <FirebaseGoogleAuthButton
                className="navai-public-experience-auth-button"
                redirectHref={authRedirectHref}
              />
            </div>
          </div>
        </div>
      ) : shouldShowEntryHub && item ? (
        <div className="navai-public-experience-shell">
          <div className="navai-public-experience-brand">
            <Image
              src="/navai_banner.webp"
              alt={messages.common.bannerAlt}
              width={250}
              height={89}
              priority
            />
          </div>

          <div className="navai-public-experience-card navai-public-experience-card--status">
            <div className="navai-public-experience-status-header">
              <div className="navai-public-experience-status-copy">
                <p className="navai-public-experience-eyebrow">
                  {entryHubTabLabel}
                </p>
                <h1 className="navai-public-experience-status-title">
                  {item.name}
                </h1>
                {!user ? (
                  <div className="navai-public-experience-status-auth">
                    <FirebaseGoogleAuthButton
                      className="navai-public-experience-auth-button"
                      redirectHref={authRedirectHref}
                    />
                  </div>
                ) : null}
                <p className="navai-public-experience-status-message">
                  {entryHubMessage}
                </p>
                {!shouldShowEntryHubExpirationBox ? (
                  <p className="navai-public-experience-status-message">
                    {messages.panelPage.publicExperienceMissingScheduleMessage}
                  </p>
                ) : null}
              </div>

              {shouldShowEntryHubExpirationBox ? (
                <div className="navai-public-experience-status-timer">
                  <span className="navai-public-experience-status-timer-label">
                    {messages.panelPage.publicExperienceExpirationLabel}
                  </span>
                  <strong className="navai-public-experience-status-timer-value">
                    00:00:00
                  </strong>
                  <span className="navai-public-experience-status-timer-format">
                    {entryHubExpirationDateLabel}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="navai-public-experience-card navai-public-experience-card--community">
            <Tabs defaultValue="entry" className="grid gap-4">
              <TabsList className="navai-public-experience-restricted-tabs">
                <TabsTrigger
                  value="entry"
                  className="navai-public-experience-restricted-tab-trigger"
                >
                  {entryHubTabLabel}
                </TabsTrigger>
                <TabsTrigger
                  value="rewards"
                  className="navai-public-experience-restricted-tab-trigger"
                >
                  {messages.panelPage.publicExperienceRewardsTabLabel}
                </TabsTrigger>
                {item.enableRanking ? (
                  <TabsTrigger
                    value="ranking"
                    className="navai-public-experience-restricted-tab-trigger"
                  >
                    {messages.panelPage.publicExperienceRankingTitle}
                  </TabsTrigger>
                ) : null}
                {item.enableComments ? (
                  <TabsTrigger
                    value="comments"
                    className="navai-public-experience-restricted-tab-trigger"
                  >
                    {messages.panelPage.publicExperienceCommentsTitle}
                  </TabsTrigger>
                ) : null}
                <TabsTrigger
                  value="organizer"
                  className="navai-public-experience-restricted-tab-trigger"
                >
                  {messages.panelPage.publicExperienceOrganizerTabLabel}
                </TabsTrigger>
                <TabsTrigger
                  value="rules"
                  className="navai-public-experience-restricted-tab-trigger"
                >
                  {messages.panelPage.publicExperienceRulesTabLabel}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="entry" className="mt-0">
                {renderEntrySection()}
              </TabsContent>
              <TabsContent value="rewards" className="mt-0">
                {renderRewardsSection()}
              </TabsContent>
              {item.enableRanking ? (
                <TabsContent value="ranking" className="mt-0">
                  {renderTopSection("sidebar")}
                </TabsContent>
              ) : null}
              {item.enableComments ? (
                <TabsContent value="comments" className="mt-0">
                  {renderCommentsSection("sidebar")}
                </TabsContent>
              ) : null}
              <TabsContent value="organizer" className="mt-0">
                {renderOrganizerSection()}
              </TabsContent>
              <TabsContent value="rules" className="mt-0">
                {renderParticipationRulesSection()}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : shouldShowRestrictedState && item ? (
        <div className="navai-public-experience-shell">
          <div className="navai-public-experience-brand">
            <Image
              src="/navai_banner.webp"
              alt={messages.common.bannerAlt}
              width={250}
              height={89}
              priority
            />
          </div>

          <div className="navai-public-experience-card navai-public-experience-card--status">
            <div className="navai-public-experience-status-header">
              <div className="navai-public-experience-status-copy">
                <p className="navai-public-experience-eyebrow">
                  {messages.panelPage.publicExperienceNotFoundLabel}
                </p>
                <h1 className="navai-public-experience-status-title">
                  {item.name}
                </h1>
                {!user ? (
                  <div className="navai-public-experience-status-auth">
                    <FirebaseGoogleAuthButton
                      className="navai-public-experience-auth-button"
                      redirectHref={authRedirectHref}
                    />
                  </div>
                ) : null}
                {shouldShowUnavailableReasonInMainCopy ? (
                  <p className="navai-public-experience-status-message">
                    {unavailableReasonMessage}
                  </p>
                ) : null}
              </div>

              {shouldShowUnavailableReactivationBox ? (
                <div className="navai-public-experience-status-timer">
                  <span className="navai-public-experience-status-timer-label">
                    {messages.panelPage.publicExperienceReactivationLabel}
                  </span>
                  {unavailableCountdownTargetMs ? (
                    <>
                      <strong className="navai-public-experience-status-timer-value">
                        {unavailableCountdownDisplay}
                      </strong>
                      <span className="navai-public-experience-status-timer-format">
                        {
                          messages.panelPage
                            .publicExperienceCountdownFormatLabel
                        }
                      </span>
                    </>
                  ) : (
                    <p className="navai-public-experience-status-timer-pending">
                      {unavailableReasonMessage ||
                        messages.panelPage
                          .publicExperienceReactivationPendingLabel}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="navai-public-experience-card navai-public-experience-card--community">
            <Tabs
              defaultValue={shouldShowPurchaseTab ? "purchase" : "rewards"}
              className="grid gap-4"
            >
              <TabsList className="navai-public-experience-restricted-tabs">
                {shouldShowPurchaseTab ? (
                  <TabsTrigger
                    value="purchase"
                    className="navai-public-experience-restricted-tab-trigger"
                  >
                    {messages.panelPage.entryPackagesTitle}
                  </TabsTrigger>
                ) : null}
                <TabsTrigger
                  value="rewards"
                  className="navai-public-experience-restricted-tab-trigger"
                >
                  {messages.panelPage.publicExperienceRewardsTabLabel}
                </TabsTrigger>
                {item.enableRanking ? (
                  <TabsTrigger
                    value="ranking"
                    className="navai-public-experience-restricted-tab-trigger"
                  >
                    {messages.panelPage.publicExperienceRankingTitle}
                  </TabsTrigger>
                ) : null}
                {item.enableComments ? (
                  <TabsTrigger
                    value="comments"
                    className="navai-public-experience-restricted-tab-trigger"
                  >
                    {messages.panelPage.publicExperienceCommentsTitle}
                  </TabsTrigger>
                ) : null}
                <TabsTrigger
                  value="organizer"
                  className="navai-public-experience-restricted-tab-trigger"
                >
                  {messages.panelPage.publicExperienceOrganizerTabLabel}
                </TabsTrigger>
                <TabsTrigger
                  value="rules"
                  className="navai-public-experience-restricted-tab-trigger"
                >
                  {messages.panelPage.publicExperienceRulesTabLabel}
                </TabsTrigger>
              </TabsList>

              {shouldShowPurchaseTab ? (
                <TabsContent value="purchase" className="mt-0">
                  {renderEntryPurchaseSection()}
                </TabsContent>
              ) : null}
              <TabsContent value="rewards" className="mt-0">
                {renderRewardsSection()}
              </TabsContent>
              {item.enableRanking ? (
                <TabsContent value="ranking" className="mt-0">
                  {renderTopSection("sidebar")}
                </TabsContent>
              ) : null}
              {item.enableComments ? (
                <TabsContent value="comments" className="mt-0">
                  {renderCommentsSection("sidebar")}
                </TabsContent>
              ) : null}
              <TabsContent value="organizer" className="mt-0">
                {renderOrganizerSection()}
              </TabsContent>
              <TabsContent value="rules" className="mt-0">
                {renderParticipationRulesSection()}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : shouldShowMissingState ? (
        <div className="navai-public-experience-shell">
          <div className="navai-public-experience-brand">
            <Image
              src="/navai_banner.webp"
              alt={messages.common.bannerAlt}
              width={250}
              height={89}
              priority
            />
          </div>

          <div className="navai-public-experience-card">
            <p className="navai-public-experience-eyebrow">
              {messages.panelPage.publicExperienceNotFoundLabel}
            </p>
            <h1>{messages.panelPage.publicExperienceNotFoundLabel}</h1>
            <p>
              {accessError ||
                availabilityMessage ||
                error ||
                messages.panelPage.publicExperienceNotFoundMessage}
            </p>
          </div>
        </div>
      ) : null}

      {shouldShowCommunityAside &&
      item &&
      !isPrimaryLoadingPhase &&
      !isAccessResolvingPhase ? (
        <>
          {item.enableComments ? (
            <aside className="navai-public-experience-aside navai-public-experience-aside--left">
              {renderCommentsSection("sidebar")}
            </aside>
          ) : null}

          {item.enableRanking ? (
            <aside className="navai-public-experience-aside">
              {renderTopSection("sidebar")}
            </aside>
          ) : null}

          <div className="navai-public-experience-mobile-actions">
            {item.enableRanking ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCommunityDialog("top")}
              >
                <Trophy aria-hidden="true" />
                {messages.panelPage.publicExperienceRankingTitle}
              </Button>
            ) : null}
            {item.enableComments ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCommunityDialog("comments")}
              >
                <MessageSquareText aria-hidden="true" />
                {messages.panelPage.publicExperienceCommentsTitle}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}

      <Dialog
        open={isCommentEditorOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeCommentEditor();
            return;
          }
          setIsCommentEditorOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingComment
                ? messages.panelPage.publicExperienceCommentDialogEditTitle
                : messages.panelPage.publicExperienceCommentDialogCreateTitle}
            </DialogTitle>
          </DialogHeader>

          {canSubmitComments ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.28em] text-white/60">
                  {messages.panelPage.publicExperienceCommentRatingFieldLabel}
                </p>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <PublicExperienceStarRating
                    value={commentRating}
                    onChange={setCommentRating}
                    interactive
                  />
                  <span className="text-sm text-white/70">
                    {commentRating}/5
                  </span>
                </div>
              </div>

              <Textarea
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder={
                  messages.panelPage.publicExperienceCommentPlaceholder
                }
                className="min-h-[8rem]"
              />

              {communityError ? (
                <p className="navai-public-experience-sidecard-error">
                  {communityError}
                </p>
              ) : null}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeCommentEditor}
                >
                  {messages.panelPage.cancelActionLabel}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    void submitComment();
                  }}
                  disabled={isCommentSubmitting}
                >
                  {isCommentSubmitting ? (
                    <Loader2 aria-hidden="true" className="animate-spin" />
                  ) : null}
                  {editingComment
                    ? messages.panelPage.publicExperienceCommentSaveActionLabel
                    : messages.panelPage
                        .publicExperienceCommentCreateActionLabel}
                </Button>
              </div>
            </div>
          ) : (
            <div className="navai-public-experience-comment-auth">
              <p>{messages.panelPage.publicExperienceCommentsAuthMessage}</p>
              {!user ? (
                <FirebaseGoogleAuthButton
                  className="navai-public-experience-auth-button"
                  redirectHref={authRedirectHref}
                />
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={communityDialog === "top"}
        onOpenChange={(isOpen) => setCommunityDialog(isOpen ? "top" : null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {messages.panelPage.publicExperienceRankingTitle}
            </DialogTitle>
          </DialogHeader>
          {renderTopSection("dialog")}
        </DialogContent>
      </Dialog>

      <Dialog
        open={communityDialog === "comments"}
        onOpenChange={(isOpen) =>
          setCommunityDialog(isOpen ? "comments" : null)
        }
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {messages.panelPage.publicExperienceCommentsTitle}
            </DialogTitle>
          </DialogHeader>
          {renderCommentsSection("dialog")}
        </DialogContent>
      </Dialog>

      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {messages.panelPage.publicExperienceProfileTitle}
            </DialogTitle>
          </DialogHeader>
          {isProfileLoading ? (
            <div className="navai-public-experience-profile-state">
              <Loader2 aria-hidden="true" className="animate-spin" />
              <p>{messages.panelPage.publicExperienceProfileLoadingMessage}</p>
            </div>
          ) : profileError ? (
            <p className="navai-public-experience-sidecard-error">
              {profileError}
            </p>
          ) : selectedProfile ? (
            <div className="navai-public-experience-profile-card">
              <div className="navai-public-experience-profile-hero">
                <PublicExperiencePersonAvatar
                  displayName={selectedProfile.displayName}
                  email={selectedProfile.email}
                  photoUrl={selectedProfile.photoUrl}
                  userId={selectedProfile.userId}
                />
                <div>
                  <h2>
                    {resolvePersonName({
                      displayName: selectedProfile.displayName,
                      email: selectedProfile.email,
                      userId: selectedProfile.userId,
                    })}
                  </h2>
                  <p>
                    {selectedProfile.professionalHeadline ||
                      selectedProfile.email}
                  </p>
                </div>
              </div>

              {selectedProfile.bio ? (
                <p className="navai-public-experience-profile-bio">
                  {selectedProfile.bio}
                </p>
              ) : null}

              <div className="navai-public-experience-profile-grid">
                {selectedProfile.jobTitle || selectedProfile.company ? (
                  <div>
                    <strong>
                      {messages.panelPage.userProfileProfessionalSectionTitle}
                    </strong>
                    <span>
                      {[selectedProfile.jobTitle, selectedProfile.company]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                ) : null}
                {selectedProfile.location ? (
                  <div>
                    <strong>
                      {messages.panelPage.userProfileLocationFieldLabel}
                    </strong>
                    <span>{selectedProfile.location}</span>
                  </div>
                ) : null}
                {selectedProfile.phone ? (
                  <div>
                    <strong>
                      {messages.panelPage.userProfilePhoneFieldLabel}
                    </strong>
                    <span>{selectedProfile.phone}</span>
                  </div>
                ) : null}
                {selectedProfile.websiteUrl ? (
                  <div>
                    <strong>
                      {messages.panelPage.userProfileWebsiteFieldLabel}
                    </strong>
                    <a
                      href={selectedProfile.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {selectedProfile.websiteUrl}
                    </a>
                  </div>
                ) : null}
                {selectedProfile.linkedinUrl ? (
                  <div>
                    <strong>
                      {messages.panelPage.userProfileLinkedinFieldLabel}
                    </strong>
                    <a
                      href={selectedProfile.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {selectedProfile.linkedinUrl}
                    </a>
                  </div>
                ) : null}
                {selectedProfile.githubUrl ? (
                  <div>
                    <strong>
                      {messages.panelPage.userProfileGithubFieldLabel}
                    </strong>
                    <a
                      href={selectedProfile.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {selectedProfile.githubUrl}
                    </a>
                  </div>
                ) : null}
                {selectedProfile.xUrl ? (
                  <div>
                    <strong>{messages.panelPage.userProfileXFieldLabel}</strong>
                    <a
                      href={selectedProfile.xUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {selectedProfile.xUrl}
                    </a>
                  </div>
                ) : null}
                {selectedProfile.instagramUrl ? (
                  <div>
                    <strong>
                      {messages.panelPage.userProfileInstagramFieldLabel}
                    </strong>
                    <a
                      href={selectedProfile.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {selectedProfile.instagramUrl}
                    </a>
                  </div>
                ) : null}
                {selectedProfile.facebookUrl ? (
                  <div>
                    <strong>
                      {messages.panelPage.userProfileFacebookFieldLabel}
                    </strong>
                    <a
                      href={selectedProfile.facebookUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {selectedProfile.facebookUrl}
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="navai-public-experience-sidecard-empty">
              {messages.panelPage.publicExperienceProfileEmptyMessage}
            </p>
          )}
        </DialogContent>
      </Dialog>

      <HomeFooterBar />
    </section>
  );
}

export default function PublicExperiencePage(props: PublicExperiencePageProps) {
  return (
    <AppProvidersShell showMiniDock={false}>
      <PublicExperiencePageContent {...props} />
    </AppProvidersShell>
  );
}

