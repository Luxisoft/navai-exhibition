import fs from "node:fs/promises";
import path from "node:path";
import { randomInt, randomUUID } from "node:crypto";

import initSqlJs from "sql.js";

import { calculateExperienceCompositeScore } from "./navai-experience-score";
import { gradeExperienceAnswersWithAi } from "./navai-panel-ai-grading";
import {
  getNavaiPanelMessageAuthor,
  getNavaiPanelMessageAuthorRole,
  isNavaiPanelSupportActor,
  type NavaiPanelActor,
} from "./navai-panel-access";
import {
  getNavaiPanelDomainById,
  listNavaiPanelDomains,
  type NavaiPanelDomainRecord,
} from "./navai-panel-sqlite";
import { resolveProjectRoot } from "./project-root";
import {
  createWompiPaymentLink,
  extractCheckoutLinkCode,
  fetchWompiTransaction,
  getWompiEnvironment,
  NAVAI_ENTRY_CURRENCY,
  NAVAI_ENTRY_PRICE_CENTS,
  NAVAI_ENTRY_PRODUCT_KEY,
  NAVAI_ENTRY_PRODUCT_NAME,
  validateWompiSignature,
  type WompiEnvironment,
  type WompiTransaction,
} from "./wompi";
import {
  fetchUsdCopRate,
  getLocalDateYmd,
  NAVAI_USD_COP_RATE_KEY,
} from "./navai-fx";

type SqlJsDatabase = any;

const NAVAI_EXPERIENCE_REWARD_TYPES = new Set<NavaiExperienceRewardType>([
  "money",
  "object",
  "travel",
  "voucher",
  "other",
]);

const NAVAI_EXPERIENCE_REWARD_DELIVERY_METHODS =
  new Set<NavaiExperienceRewardDeliveryMethod>([
    "manual_coordination",
    "bank_transfer",
    "digital_wallet",
    "hybrid",
    "in_person",
  ]);

const NAVAI_EXPERIENCE_REWARD_PAYMENT_METHODS =
  new Set<NavaiExperienceRewardPaymentMethod>([
    "bancolombia",
    "nequi",
    "daviplata",
    "davivienda",
    "banco_de_bogota",
    "bbva_colombia",
    "paypal",
  ]);

const NAVAI_USER_VERIFICATION_STATUSES = new Set<NavaiUserVerificationStatus>([
  "not_submitted",
  "pending",
  "approved",
  "rejected",
  "changes_requested",
]);

const NAVAI_USER_VERIFICATION_DOCUMENT_TYPES =
  new Set<NavaiUserVerificationDocumentType>([
    "citizenship_card",
    "identity_card",
    "passport",
    "drivers_license",
    "foreign_id",
    "other",
  ]);

const NAVAI_USER_ACCOUNT_STATUSES = new Set<NavaiUserAccountStatus>([
  "active",
  "deletion_pending",
  "inactive",
]);

const NAVAI_POINTS_CASHOUT_STATUSES = new Set<NavaiPointsCashoutStatus>([
  "pending",
  "processing",
  "paid",
  "rejected",
]);

const NAVAI_POINTS_CASHOUT_PAYMENT_METHODS = new Set<NavaiPointsCashoutPaymentMethod>([
  "bancolombia",
  "nequi",
  "daviplata",
  "davivienda",
  "banco_de_bogota",
  "bbva_colombia",
  "paypal",
]);

export const NAVAI_POINT_VALUE_COP = 4000;
const NAVAI_DEFAULT_USD_COP_RATE = 4000;
const NAVAI_DEFAULT_ENTRY_PACKAGE_KEY = "ENTRY_STANDARD";
const NAVAI_DEFAULT_ENTRY_PACKAGE_ENTRIES = 1;
const NAVAI_DEFAULT_ENTRY_PACKAGE_VAT_PERCENTAGE = 19;
const NAVAI_DEFAULT_ENTRY_PACKAGE_PRICE_USD = Math.round(
  (NAVAI_ENTRY_PRICE_CENTS / 100 / NAVAI_DEFAULT_USD_COP_RATE) * 10000
) / 10000;

export type NavaiPanelExperienceKind = "evaluation" | "survey";
export type NavaiPanelExperienceStatus = "Draft" | "Active" | "Completed";
export type NavaiPanelExperienceAccessMode = "public" | "private";
export type NavaiExperienceRewardType = "money" | "object" | "travel" | "voucher" | "other";
export type NavaiExperienceRewardDeliveryMethod =
  | "manual_coordination"
  | "bank_transfer"
  | "digital_wallet"
  | "hybrid"
  | "in_person";
export type NavaiExperienceRewardPaymentMethod =
  | "bancolombia"
  | "nequi"
  | "daviplata"
  | "davivienda"
  | "banco_de_bogota"
  | "bbva_colombia"
  | "paypal";
export type NavaiUserVerificationStatus =
  | "not_submitted"
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested";
export type NavaiUserVerificationDocumentType =
  | "citizenship_card"
  | "identity_card"
  | "passport"
  | "drivers_license"
  | "foreign_id"
  | "other";
export type NavaiUserAccountStatus = "active" | "deletion_pending" | "inactive";
export type NavaiPointsCashoutStatus = "pending" | "processing" | "paid" | "rejected";
export type NavaiPointsCashoutPaymentMethod =
  | "bancolombia"
  | "nequi"
  | "daviplata"
  | "davivienda"
  | "banco_de_bogota"
  | "bbva_colombia"
  | "paypal";
export type NavaiPointsLedgerReason =
  | "experience_reward"
  | "cashout_request"
  | "cashout_reverted"
  | "manual_adjustment";

export type NavaiPanelEvaluationQuestionRecord = {
  id: string;
  question: string;
  expectedAnswer: string;
  allowAiGrading: boolean;
};

export type NavaiPanelEvaluationRecord = {
  id: string;
  userId: string;
  kind: "evaluation";
  domainId: string;
  domainLabel: string;
  name: string;
  slug: string;
  description: string;
  status: NavaiPanelExperienceStatus;
  accessMode: NavaiPanelExperienceAccessMode;
  allowedEmails: string[];
  allowPlusUsers: boolean;
  allowNonPlusUsers: boolean;
  startsAt: string;
  endsAt: string;
  delegateAiGrading: boolean;
  enableRanking: boolean;
  enableComments: boolean;
  rewardType: NavaiExperienceRewardType;
  rewardTitle: string;
  rewardDescription: string;
  rewardDeliveryMethod: NavaiExperienceRewardDeliveryMethod;
  rewardDeliveryDetails: string;
  rewardPaymentMethods: NavaiExperienceRewardPaymentMethod[];
  rewardWinnerCount: number;
  rewardPoints: number;
  rewardUsdAmount: number;
  dailyAttemptLimit: number;
  agentId: string;
  agentName: string;
  questions: NavaiPanelEvaluationQuestionRecord[];
  welcomeTitle: string;
  welcomeBody: string;
  autoStartConversation: boolean;
  enableEntryModal: boolean;
  enableHCaptcha: boolean;
  systemPrompt: string;
  agentModel: string;
  agentVoice: string;
  agentLanguage: string;
  agentVoiceAccent: string;
  agentVoiceTone: string;
  launches: number;
  conversations: number;
  publicPath: string;
  createdAt: string;
  updatedAt: string;
};

export type NavaiCurrencyExchangeRateRecord = {
  key: typeof NAVAI_USD_COP_RATE_KEY;
  rate: number;
  sourceDate: string;
  fetchedAt: string;
  updatedAt: string;
};

export type NavaiPanelSurveyRecord = {
  id: string;
  userId: string;
  kind: "survey";
  domainId: string;
  domainLabel: string;
  name: string;
  slug: string;
  description: string;
  status: NavaiPanelExperienceStatus;
  accessMode: NavaiPanelExperienceAccessMode;
  allowedEmails: string[];
  allowPlusUsers: boolean;
  allowNonPlusUsers: boolean;
  startsAt: string;
  endsAt: string;
  delegateAiGrading: boolean;
  enableRanking: boolean;
  enableComments: boolean;
  rewardType: NavaiExperienceRewardType;
  rewardTitle: string;
  rewardDescription: string;
  rewardDeliveryMethod: NavaiExperienceRewardDeliveryMethod;
  rewardDeliveryDetails: string;
  rewardPaymentMethods: NavaiExperienceRewardPaymentMethod[];
  rewardWinnerCount: number;
  rewardPoints: number;
  rewardUsdAmount: number;
  dailyAttemptLimit: number;
  agentId: string;
  agentName: string;
  questions: NavaiPanelEvaluationQuestionRecord[];
  welcomeTitle: string;
  welcomeBody: string;
  autoStartConversation: boolean;
  enableEntryModal: boolean;
  enableHCaptcha: boolean;
  systemPrompt: string;
  agentModel: string;
  agentVoice: string;
  agentLanguage: string;
  agentVoiceAccent: string;
  agentVoiceTone: string;
  launches: number;
  conversations: number;
  publicPath: string;
  createdAt: string;
  updatedAt: string;
};

export type NavaiPublicExperienceRecord = {
  id: string;
  kind: NavaiPanelExperienceKind;
  name: string;
  slug: string;
  description: string;
  status: NavaiPanelExperienceStatus;
  accessMode: NavaiPanelExperienceAccessMode;
  allowPlusUsers: boolean;
  allowNonPlusUsers: boolean;
  startsAt: string;
  endsAt: string;
  delegateAiGrading: boolean;
  enableRanking: boolean;
  enableComments: boolean;
  rewardType: NavaiExperienceRewardType;
  rewardTitle: string;
  rewardDescription: string;
  rewardDeliveryMethod: NavaiExperienceRewardDeliveryMethod;
  rewardDeliveryDetails: string;
  rewardPaymentMethods: NavaiExperienceRewardPaymentMethod[];
  rewardWinnerCount: number;
  rewardPoints: number;
  rewardUsdAmount: number;
  rewardAmountCop: number;
  rewardAmountUsd: number;
  dailyAttemptLimit: number;
  agentId: string;
  agentName: string;
  questions: NavaiPanelEvaluationQuestionRecord[];
  welcomeTitle: string;
  welcomeBody: string;
  autoStartConversation: boolean;
  enableEntryModal: boolean;
  enableHCaptcha: boolean;
  systemPrompt: string;
  agentModel: string;
  agentVoice: string;
  agentLanguage: string;
  agentVoiceAccent: string;
  agentVoiceTone: string;
  publicPath: string;
  exchangeRate: NavaiCurrencyExchangeRateRecord;
  organizer: NavaiPublicExperienceOrganizerRecord | null;
  domain: Pick<
    NavaiPanelDomainRecord,
    "id" | "domain" | "label" | "description" | "routes" | "parameters"
  > | null;
};

export type NavaiPublicExperienceConversationStatus = "Open" | "Completed" | "Abandoned";

export type NavaiPublicExperienceConversationTurnInput = {
  clientTurnId?: unknown;
  role?: unknown;
  transcript?: unknown;
  sourceEventType?: unknown;
};

export type NavaiPublicExperienceConversationAnswerInput = {
  questionId?: unknown;
  questionText?: unknown;
  answerText?: unknown;
};

export type NavaiPublicExperienceConversationAudioInput = {
  storagePath?: unknown;
  downloadUrl?: unknown;
  contentType?: unknown;
  sizeBytes?: unknown;
  durationMs?: unknown;
};

export type NavaiPublicExperienceConversationVideoInput = {
  storagePath?: unknown;
  downloadUrl?: unknown;
  contentType?: unknown;
  sizeBytes?: unknown;
  durationMs?: unknown;
};

export type NavaiPublicExperienceConversationProgressInput = {
  turns?: unknown;
  answers?: unknown;
  status?: unknown;
  audio?: unknown;
  video?: unknown;
};

export type NavaiPublicExperienceConversationAnswerRecord = {
  id: string;
  conversationId: string;
  questionId: string;
  questionText: string;
  answerText: string;
  aiScore: number;
  aiFeedback: string;
  aiScoredAt: string;
  createdAt: string;
  updatedAt: string;
};

export type NavaiPublicExperienceConversationRecord = {
  id: string;
  experienceId: string;
  experienceKind: NavaiPanelExperienceKind;
  experienceSlug: string;
  respondentUserId: string;
  respondentEmail: string;
  status: NavaiPublicExperienceConversationStatus;
  startedAt: string;
  updatedAt: string;
  endedAt: string;
  totalQuestions: number;
  answeredQuestions: number;
  audioStoragePath: string;
  audioDownloadUrl: string;
  audioContentType: string;
  audioSizeBytes: number;
  audioDurationMs: number;
  videoStoragePath: string;
  videoDownloadUrl: string;
  videoContentType: string;
  videoSizeBytes: number;
  videoDurationMs: number;
  answers: NavaiPublicExperienceConversationAnswerRecord[];
};

export type NavaiPublicExperienceTopEntryRecord = {
  userId: string;
  email: string;
  displayName: string;
  photoUrl: string;
  totalScore: number;
  answeredQuestions: number;
  conversationsCount: number;
  latestActivityAt: string;
};

export type NavaiPublicExperienceCommentRecord = {
  id: string;
  experienceId: string;
  experienceKind: NavaiPanelExperienceKind;
  experienceSlug: string;
  authorUserId: string;
  authorEmail: string;
  authorDisplayName: string;
  authorPhotoUrl: string;
  body: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
};

export type NavaiUserProfileRecord = {
  userId: string;
  email: string;
  accountStatus: NavaiUserAccountStatus;
  deletionRequestedAt: string;
  scheduledDeletionAt: string;
  deactivatedAt: string;
  displayName: string;
  photoUrl: string;
  bio: string;
  professionalHeadline: string;
  jobTitle: string;
  company: string;
  location: string;
  phone: string;
  websiteUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  xUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type NavaiUserVerificationAssetRecord = {
  assetId: string;
  url: string;
};

export type NavaiUserVerificationRecord = {
  userId: string;
  email: string;
  status: NavaiUserVerificationStatus;
  fullName: string;
  documentType: NavaiUserVerificationDocumentType;
  documentNumber: string;
  documentCountry: string;
  selfieImage: NavaiUserVerificationAssetRecord | null;
  documentFrontImage: NavaiUserVerificationAssetRecord | null;
  documentBackImage: NavaiUserVerificationAssetRecord | null;
  responseMessage: string;
  submittedAt: string;
  reviewedAt: string;
  reviewedByUserId: string;
  reviewedByEmail: string;
  createdAt: string;
  updatedAt: string;
};

export type NavaiPanelPendingUserVerificationRecord = {
  verification: NavaiUserVerificationRecord;
  profile: NavaiUserProfileRecord;
};

export type NavaiPublicExperienceOrganizerRecord = NavaiUserProfileRecord & {
  isVerified: boolean;
};

export type NavaiPublicExperienceConversationStartResult = {
  conversation: NavaiPublicExperienceConversationRecord;
  latestAnswers: NavaiPublicExperienceConversationAnswerRecord[];
  pendingQuestionIds: string[];
};

export type NavaiPanelDashboardSummary = {
  domainsCount: number;
  evaluationsCount: number;
  surveyResponsesCount: number;
  openTicketsCount: number;
};

export type NavaiEntryBalanceRecord = {
  availableEntries: number;
  purchasedEntries: number;
  bonusEntries: number;
  consumedPurchasedEntries: number;
  consumedBonusEntries: number;
  totalPurchasedEntries: number;
  totalBonusEntries: number;
  lastOrderId: string;
};

export type NavaiEntryOrderRecord = {
  id: string;
  userId: string;
  userEmail: string;
  product: string;
  productName: string;
  packageKey: string;
  entriesCount: number;
  unitPriceUsd: number;
  vatPercentage: number;
  environment: WompiEnvironment;
  currency: string;
  amountCents: number;
  status: string;
  checkoutUrl: string;
  wompiLinkId: string;
  referralCode: string;
  referrerUserId: string;
  wompiTransactionId: string;
  wompiStatus: string;
  wompiReference: string;
  wompiEmail: string;
  confirmedAt: string;
  creditedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type NavaiEntryAccountingSummaryRecord = {
  totalOrders: number;
  approvedOrders: number;
  pendingOrders: number;
  approvedAmountCents: number;
  soldEntries: number;
};

export type NavaiEntryPackageRecord = {
  key: string;
  name: string;
  description: string;
  entriesCount: number;
  priceUsd: number;
  vatPercentage: number;
  subtotalUsd: number;
  taxUsd: number;
  totalUsd: number;
  subtotalCopCents: number;
  taxCopCents: number;
  totalCopCents: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
};

export type NavaiEntryBillingRecord = {
  environment: WompiEnvironment;
  exchangeRate: NavaiCurrencyExchangeRateRecord;
  catalog: {
    key: string;
    name: string;
    priceCents: number;
    currency: string;
    entriesCount: number;
    vatPercentage: number;
  };
  packages: NavaiEntryPackageRecord[];
  balance: NavaiEntryBalanceRecord;
  orders: NavaiEntryOrderRecord[];
  accounting: NavaiEntryAccountingSummaryRecord;
  allOrders: NavaiEntryOrderRecord[];
};

export type NavaiPointsCashoutPaymentSettingsRecord = {
  userId: string;
  paymentMethod: NavaiPointsCashoutPaymentMethod;
  accountHolder: string;
  accountReference: string;
  notes: string;
  updatedAt: string;
};

export type NavaiPointsCashoutRequestRecord = {
  id: string;
  userId: string;
  userEmail: string;
  status: NavaiPointsCashoutStatus;
  requestedPoints: number;
  requestedAmountCop: number;
  paymentMethod: NavaiPointsCashoutPaymentMethod;
  accountHolder: string;
  accountReference: string;
  notes: string;
  responseMessage: string;
  processedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type NavaiPointsLedgerRecord = {
  id: string;
  userId: string;
  experienceId: string;
  experienceKind: NavaiPanelExperienceKind | "";
  experienceSlug: string;
  relatedCashoutId: string;
  relatedDistributionId: string;
  relatedUserId: string;
  relatedUserEmail: string;
  reason: NavaiPointsLedgerReason;
  deltaPoints: number;
  createdAt: string;
};

export type NavaiPointsRewardDistributionRecord = {
  id: string;
  experienceId: string;
  experienceKind: NavaiPanelExperienceKind;
  experienceSlug: string;
  winnerUserId: string;
  winnerEmail: string;
  winnerRank: number;
  awardedPoints: number;
  awardedAmountCop: number;
  createdAt: string;
};

export type NavaiPointsWalletRecord = {
  pointValueCop: number;
  availablePoints: number;
  availableAmountCop: number;
  totalEarnedPoints: number;
  totalEarnedAmountCop: number;
  totalRedeemedPoints: number;
  totalRedeemedAmountCop: number;
  pendingRedeemPoints: number;
  pendingRedeemAmountCop: number;
  paymentSettings: NavaiPointsCashoutPaymentSettingsRecord | null;
  cashoutRequests: NavaiPointsCashoutRequestRecord[];
  ledger: NavaiPointsLedgerRecord[];
};

export type NavaiReferralAttributionStatusRecord =
  | "none"
  | "accepted"
  | "invalid"
  | "self"
  | "already_assigned"
  | "ineligible";

export type NavaiReferralAttributionRecord = {
  code: string;
  status: NavaiReferralAttributionStatusRecord;
  referrerUserId: string;
  referralId: string;
};

export type NavaiReferralRecord = {
  id: string;
  referrerUserId: string;
  referrerCode: string;
  referredUserId: string;
  referredEmail: string;
  sourceOrderId: string;
  status: "pending" | "rewarded" | "rejected";
  rewardEntries: number;
  rewardAppliedAt: string;
  rejectionReason: string;
  createdAt: string;
  updatedAt: string;
};

export type NavaiReferralEntryLedgerRecord = {
  id: string;
  userId: string;
  referralId: string;
  orderId: string;
  experienceId: string;
  experienceKind: NavaiPanelExperienceKind | "";
  experienceSlug: string;
  conversationId: string;
  relatedUserId: string;
  relatedUserEmail: string;
  reason: "referral_reward" | "entry_consumed" | "manual_adjustment";
  deltaEntries: number;
  createdAt: string;
};

export type NavaiReferralProgramRecord = {
  code: string;
  rewardEntriesPerReferral: number;
  totalReferrals: number;
  pendingReferrals: number;
  rewardedReferrals: number;
  earnedEntries: number;
  consumedEntries: number;
  availableEntries: number;
  referrals: NavaiReferralRecord[];
  ledger: NavaiReferralEntryLedgerRecord[];
};

export type NavaiEntryOrderCreateResult = {
  order: NavaiEntryOrderRecord;
  checkoutUrl: string;
  environment: WompiEnvironment;
  referralAttribution: NavaiReferralAttributionRecord;
};

export type NavaiEntryOrderConfirmResult = {
  status: string;
  applied: boolean;
  order: NavaiEntryOrderRecord | null;
  balance: NavaiEntryBalanceRecord;
  details: {
    transactionId: string;
    reference: string;
    email: string;
    amountInCents: number;
    currency: string;
    paymentMethod: string;
    paymentLinkId: string;
    createdAt: string;
  } | null;
};

export type NavaiPanelExperienceInput = {
  domainId?: unknown;
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  status?: unknown;
  accessMode?: unknown;
  allowedEmails?: unknown;
  allowPlusUsers?: unknown;
  allowNonPlusUsers?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  delegateAiGrading?: unknown;
  enableRanking?: unknown;
  enableComments?: unknown;
  rewardType?: unknown;
  rewardTitle?: unknown;
  rewardDescription?: unknown;
  rewardDeliveryMethod?: unknown;
  rewardDeliveryDetails?: unknown;
  rewardPaymentMethods?: unknown;
  rewardWinnerCount?: unknown;
  rewardPoints?: unknown;
  rewardUsdAmount?: unknown;
  dailyAttemptLimit?: unknown;
  agentId?: unknown;
  questions?: unknown;
  welcomeTitle?: unknown;
  welcomeBody?: unknown;
  autoStartConversation?: unknown;
  enableEntryModal?: unknown;
  enableHCaptcha?: unknown;
  systemPrompt?: unknown;
};

export type NavaiPanelAgentSettingsInput = {
  name?: unknown;
  agentModel?: unknown;
  agentVoice?: unknown;
  agentLanguage?: unknown;
  agentVoiceAccent?: unknown;
  agentVoiceTone?: unknown;
};

export type NavaiPublicExperienceCommentInput = {
  body?: unknown;
  rating?: unknown;
};

export type NavaiUserProfileInput = {
  displayName?: unknown;
  photoUrl?: unknown;
  bio?: unknown;
  professionalHeadline?: unknown;
  jobTitle?: unknown;
  company?: unknown;
  location?: unknown;
  phone?: unknown;
  websiteUrl?: unknown;
  linkedinUrl?: unknown;
  githubUrl?: unknown;
  xUrl?: unknown;
  instagramUrl?: unknown;
  facebookUrl?: unknown;
};

export type NavaiUserVerificationInput = {
  fullName?: unknown;
  documentType?: unknown;
  documentNumber?: unknown;
  documentCountry?: unknown;
  selfieImageId?: unknown;
  selfieImageUrl?: unknown;
  documentFrontImageId?: unknown;
  documentFrontImageUrl?: unknown;
  documentBackImageId?: unknown;
  documentBackImageUrl?: unknown;
};

export type NavaiUserVerificationReviewInput = {
  status?: unknown;
  responseMessage?: unknown;
};

export type NavaiPointsCashoutPaymentSettingsInput = {
  paymentMethod?: unknown;
  accountHolder?: unknown;
  accountReference?: unknown;
  notes?: unknown;
};

export type NavaiPointsCashoutRequestInput = {
  requestedPoints?: unknown;
  paymentMethod?: unknown;
  accountHolder?: unknown;
  accountReference?: unknown;
  notes?: unknown;
};

export type NavaiPointsCashoutReviewInput = {
  status?: unknown;
  responseMessage?: unknown;
};

export type NavaiEntryPackageInput = {
  name?: unknown;
  description?: unknown;
  entriesCount?: unknown;
  priceUsd?: unknown;
  vatPercentage?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
};

export type NavaiPanelAgentSettingsRecord = {
  userId: string;
  kind: NavaiPanelExperienceKind;
  name: string;
  agentModel: string;
  agentVoice: string;
  agentLanguage: string;
  agentVoiceAccent: string;
  agentVoiceTone: string;
  updatedAt: string;
};

export type NavaiPanelAgentRecord = {
  id: string;
  userId: string;
  kind: NavaiPanelExperienceKind;
  name: string;
  agentModel: string;
  agentVoice: string;
  agentLanguage: string;
  agentVoiceAccent: string;
  agentVoiceTone: string;
  createdAt: string;
  updatedAt: string;
};

export type NavaiPanelAgentInput = {
  name?: unknown;
  agentModel?: unknown;
  agentVoice?: unknown;
  agentLanguage?: unknown;
  agentVoiceAccent?: unknown;
  agentVoiceTone?: unknown;
};

export type NavaiPanelSupportTicketInput = {
  subject?: unknown;
  channel?: unknown;
  category?: unknown;
  priority?: unknown;
  message?: unknown;
  attachments?: unknown;
};

export type NavaiPanelSupportMessageInput = {
  body?: unknown;
  attachments?: unknown;
};

export type NavaiPanelSupportAttachmentKind = "image" | "video";

export type NavaiPanelSupportAttachmentInput = {
  kind?: unknown;
  assetId?: unknown;
  url?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  sizeBytes?: unknown;
};

export type NavaiPanelSupportAttachmentRecord = {
  id: string;
  messageId: string;
  kind: NavaiPanelSupportAttachmentKind;
  assetId: string;
  url: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

export type NavaiPanelSupportMessageRecord = {
  id: string;
  ticketId: string;
  author: string;
  authorRole: "customer" | "support";
  body: string;
  attachments: NavaiPanelSupportAttachmentRecord[];
  createdAt: string;
};

export type NavaiPanelSupportTicketRecord = {
  id: string;
  userId: string;
  requesterEmail: string;
  requesterProfile: NavaiUserProfileRecord;
  subject: string;
  channel: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: NavaiPanelSupportMessageRecord[];
};

type NavaiPanelWorkspaceSqliteState = {
  db: SqlJsDatabase;
  filePath: string;
};

type NormalizedExperienceInput = {
  domainId: string;
  name: string;
  slug: string;
  description: string;
  status: NavaiPanelExperienceStatus;
  accessMode: NavaiPanelExperienceAccessMode;
  allowedEmails: string[];
  allowPlusUsers: boolean;
  allowNonPlusUsers: boolean;
  startsAt: string;
  endsAt: string;
  delegateAiGrading: boolean;
  enableRanking: boolean;
  enableComments: boolean;
  rewardType: NavaiExperienceRewardType;
  rewardTitle: string;
  rewardDescription: string;
  rewardDeliveryMethod: NavaiExperienceRewardDeliveryMethod;
  rewardDeliveryDetails: string;
  rewardPaymentMethods: NavaiExperienceRewardPaymentMethod[];
  rewardWinnerCount: number;
  rewardPoints: number;
  dailyAttemptLimit: number;
  agentId: string;
  questions: NavaiPanelEvaluationQuestionRecord[];
  welcomeTitle: string;
  welcomeBody: string;
  autoStartConversation: boolean;
  enableEntryModal: boolean;
  enableHCaptcha: boolean;
  systemPrompt: string;
};

type NormalizedAgentSettingsInput = {
  name: string;
  agentModel: string;
  agentVoice: string;
  agentLanguage: string;
  agentVoiceAccent: string;
  agentVoiceTone: string;
};

type NormalizedAgentInput = {
  name: string;
  agentModel: string;
  agentVoice: string;
  agentLanguage: string;
  agentVoiceAccent: string;
  agentVoiceTone: string;
};

type NormalizedPublicConversationTurnInput = {
  clientTurnId: string;
  role: "assistant" | "user";
  transcript: string;
  sourceEventType: string;
};

type NormalizedPublicConversationAnswerInput = {
  questionId: string;
  questionText: string;
  answerText: string;
};

type NormalizedPublicConversationAudioInput = {
  storagePath: string;
  downloadUrl: string;
  contentType: string;
  sizeBytes: number;
  durationMs: number;
};

type NormalizedPublicConversationVideoInput = {
  storagePath: string;
  downloadUrl: string;
  contentType: string;
  sizeBytes: number;
  durationMs: number;
};

type NormalizedPublicConversationProgressInput = {
  turns: NormalizedPublicConversationTurnInput[];
  answers: NormalizedPublicConversationAnswerInput[];
  status: NavaiPublicExperienceConversationStatus | null;
  audio: NormalizedPublicConversationAudioInput | null;
  video: NormalizedPublicConversationVideoInput | null;
};

type NormalizedPublicCommentInput = {
  body: string;
  rating: number;
};

type NormalizedUserProfileInput = {
  displayName: string;
  photoUrl: string;
  bio: string;
  professionalHeadline: string;
  jobTitle: string;
  company: string;
  location: string;
  phone: string;
  websiteUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  xUrl: string;
  instagramUrl: string;
  facebookUrl: string;
};

type NormalizedUserVerificationAssetInput = {
  assetId: string;
  url: string;
};

type NormalizedUserVerificationInput = {
  fullName: string;
  documentType: NavaiUserVerificationDocumentType;
  documentNumber: string;
  documentCountry: string;
  selfieImage: NormalizedUserVerificationAssetInput;
  documentFrontImage: NormalizedUserVerificationAssetInput;
  documentBackImage: NormalizedUserVerificationAssetInput;
};

type NormalizedUserVerificationReviewInput = {
  status: Exclude<NavaiUserVerificationStatus, "not_submitted">;
  responseMessage: string;
};

type NormalizedPointsCashoutPaymentSettingsInput = {
  paymentMethod: NavaiPointsCashoutPaymentMethod;
  accountHolder: string;
  accountReference: string;
  notes: string;
};

type NormalizedPointsCashoutRequestInput = NormalizedPointsCashoutPaymentSettingsInput & {
  requestedPoints: number;
};

type NormalizedPointsCashoutReviewInput = {
  status: Exclude<NavaiPointsCashoutStatus, "pending">;
  responseMessage: string;
};

type NormalizedEntryPackageInput = {
  name: string;
  description: string;
  entriesCount: number;
  priceUsd: number;
  vatPercentage: number;
  isActive: boolean;
  sortOrder: number;
};

type EntryPackagePricing = {
  subtotalUsd: number;
  taxUsd: number;
  totalUsd: number;
  subtotalCopCents: number;
  taxCopCents: number;
  totalCopCents: number;
};

type NormalizedSupportAttachmentInput = {
  kind: NavaiPanelSupportAttachmentKind;
  assetId: string;
  url: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

let sqliteStatePromise: Promise<NavaiPanelWorkspaceSqliteState> | null = null;
let sqliteMutationQueue = Promise.resolve();
const PUBLIC_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const PUBLIC_CODE_LENGTH = 23;
const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_REWARD_ENTRIES = 3;
const POINTS_FALLBACK_PAYMENT_METHOD: NavaiPointsCashoutPaymentMethod = "nequi";
const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalUrl(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return "";
  }

  try {
    const parsed = new URL(normalized);
    return parsed.toString();
  } catch {
    return normalized;
  }
}

function normalizeInteger(value: unknown) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePositiveInteger(value: unknown, fallback = 1) {
  const parsed = normalizeInteger(value);
  return parsed >= 1 ? parsed : fallback;
}

function normalizeCurrencyAmount(value: unknown, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? fallback));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.round(parsed * 100) / 100);
}

function normalizePointAmount(value: unknown, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(parsed)) {
    return Math.max(0, normalizeInteger(fallback));
  }
  return Math.max(0, parsed);
}

function normalizePointsCashoutStatus(value: unknown): NavaiPointsCashoutStatus {
  const normalized = normalizeString(value).toLowerCase();
  return NAVAI_POINTS_CASHOUT_STATUSES.has(normalized as NavaiPointsCashoutStatus)
    ? (normalized as NavaiPointsCashoutStatus)
    : "pending";
}

function normalizePointsCashoutPaymentMethod(value: unknown): NavaiPointsCashoutPaymentMethod {
  const normalized = normalizeString(value).toLowerCase();
  if (NAVAI_POINTS_CASHOUT_PAYMENT_METHODS.has(normalized as NavaiPointsCashoutPaymentMethod)) {
    return normalized as NavaiPointsCashoutPaymentMethod;
  }
  return POINTS_FALLBACK_PAYMENT_METHOD;
}

function convertPointsToCop(points: number) {
  return Math.max(0, normalizePointAmount(points)) * NAVAI_POINT_VALUE_COP;
}

function normalizeExchangeRate(value: unknown, fallback = NAVAI_DEFAULT_USD_COP_RATE) {
  const parsed = Number.parseFloat(String(value ?? fallback));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.max(0, Math.round(parsed * 100) / 100);
}

function convertCopToUsd(amountCop: number, usdCopRate: number) {
  if (!Number.isFinite(usdCopRate) || usdCopRate <= 0) {
    return 0;
  }
  return Math.max(0, Math.round((Math.max(0, amountCop) / usdCopRate) * 100) / 100);
}

function buildFallbackExchangeRateRecord(
  sourceDate = getLocalDateYmd()
): NavaiCurrencyExchangeRateRecord {
  const now = new Date().toISOString();
  return {
    key: NAVAI_USD_COP_RATE_KEY,
    rate: NAVAI_DEFAULT_USD_COP_RATE,
    sourceDate,
    fetchedAt: now,
    updatedAt: now,
  };
}

function mapExchangeRateRow(
  row: Record<string, unknown>,
  fallbackSourceDate = getLocalDateYmd()
): NavaiCurrencyExchangeRateRecord {
  const now = new Date().toISOString();
  const updatedAt = normalizeString(row.updated_at) || now;
  const fetchedAt = normalizeString(row.fetched_at) || updatedAt;
  const sourceDate = normalizeString(row.source_date) || fallbackSourceDate;

  return {
    key: NAVAI_USD_COP_RATE_KEY,
    rate: normalizeExchangeRate(row.rate),
    sourceDate,
    fetchedAt,
    updatedAt,
  };
}

function readStoredUsdCopExchangeRate(db: SqlJsDatabase) {
  const row = readFirstRow(
    db,
    `
      SELECT key, rate, source_date, fetched_at, updated_at
      FROM navai_exchange_rates
      WHERE key = ?
      LIMIT 1
    `,
    [NAVAI_USD_COP_RATE_KEY]
  );
  return row ? mapExchangeRateRow(row) : null;
}

async function resolveUsdCopExchangeRateRecord(): Promise<NavaiCurrencyExchangeRateRecord> {
  const sourceDate = getLocalDateYmd();
  const { db } = await getWorkspaceSqliteState();
  const stored = readStoredUsdCopExchangeRate(db);
  if (stored && stored.sourceDate === sourceDate) {
    return stored;
  }

  try {
    const fetched = await fetchUsdCopRate(sourceDate);
    const normalizedRate = normalizeExchangeRate(fetched.rate);
    const normalizedSourceDate = normalizeString(fetched.sourceDate) || sourceDate;
    const now = new Date().toISOString();

    return runSerializedMutation((serializedDb) => {
      serializedDb.run(
        `
          INSERT INTO navai_exchange_rates (
            key,
            rate,
            source_date,
            fetched_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            rate = excluded.rate,
            source_date = excluded.source_date,
            fetched_at = excluded.fetched_at,
            updated_at = excluded.updated_at
        `,
        [NAVAI_USD_COP_RATE_KEY, normalizedRate, normalizedSourceDate, now, now]
      );

      const updatedRow = readFirstRow(
        serializedDb,
        `
          SELECT key, rate, source_date, fetched_at, updated_at
          FROM navai_exchange_rates
          WHERE key = ?
          LIMIT 1
        `,
        [NAVAI_USD_COP_RATE_KEY]
      );

      return updatedRow
        ? mapExchangeRateRow(updatedRow, normalizedSourceDate)
        : {
            key: NAVAI_USD_COP_RATE_KEY,
            rate: normalizedRate,
            sourceDate: normalizedSourceDate,
            fetchedAt: now,
            updatedAt: now,
          };
    });
  } catch {
    return stored ?? buildFallbackExchangeRateRecord(sourceDate);
  }
}

function normalizeOptionalInteger(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSupportAttachmentKind(value: unknown): NavaiPanelSupportAttachmentKind {
  return normalizeString(value).toLowerCase() === "video" ? "video" : "image";
}

function normalizeSupportAttachmentsInput(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as NormalizedSupportAttachmentInput[];
  }

  return value
    .map((entry) => {
      const input = (entry ?? {}) as NavaiPanelSupportAttachmentInput;
      return {
        kind: normalizeSupportAttachmentKind(input.kind),
        assetId: normalizeString(input.assetId),
        url: normalizeOptionalUrl(input.url),
        fileName: normalizeString(input.fileName),
        contentType: normalizeString(input.contentType),
        sizeBytes: Math.max(0, normalizeInteger(input.sizeBytes)),
      } satisfies NormalizedSupportAttachmentInput;
    })
    .filter((entry) => entry.url)
    .slice(0, 10);
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  }

  return false;
}

function normalizeBooleanWithFallback(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return normalizeBoolean(value);
}

function normalizeExperienceMembershipAccessFlag(value: unknown, fallback = true) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return normalizeBoolean(value);
}

function parseJsonArray(value: unknown) {
  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeEmailAddress(value: unknown) {
  return normalizeString(value).toLowerCase();
}

function normalizeReferralCode(value: unknown) {
  return normalizeString(value).replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function normalizeEntryPackageKey(
  value: unknown,
  fallback = NAVAI_DEFAULT_ENTRY_PACKAGE_KEY
) {
  const normalized = normalizeString(value)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
  return normalized || fallback;
}

function normalizeEntryPriceUsd(value: unknown, fallback = NAVAI_DEFAULT_ENTRY_PACKAGE_PRICE_USD) {
  const parsed = Number.parseFloat(String(value ?? fallback));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.max(0.01, Math.round(parsed * 10000) / 10000);
}

function normalizeVatPercentage(
  value: unknown,
  fallback = NAVAI_DEFAULT_ENTRY_PACKAGE_VAT_PERCENTAGE
) {
  const parsed = Number.parseFloat(String(value ?? fallback));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(100, Math.round(parsed * 100) / 100));
}

function buildEntryPackagePricing(
  priceUsd: number,
  vatPercentage: number,
  usdCopRate: number
): EntryPackagePricing {
  const normalizedRate = normalizeExchangeRate(usdCopRate, NAVAI_DEFAULT_USD_COP_RATE);
  const subtotalUsd = normalizeEntryPriceUsd(priceUsd);
  const normalizedVat = normalizeVatPercentage(vatPercentage);
  const taxUsd = Math.round((subtotalUsd * normalizedVat) / 100 * 10000) / 10000;
  const totalUsd = Math.round((subtotalUsd + taxUsd) * 10000) / 10000;
  const subtotalCopCents = Math.max(1, Math.round(subtotalUsd * normalizedRate * 100));
  const taxCopCents = Math.max(0, Math.round(taxUsd * normalizedRate * 100));
  const totalCopCents = Math.max(1, subtotalCopCents + taxCopCents);

  return {
    subtotalUsd,
    taxUsd,
    totalUsd,
    subtotalCopCents,
    taxCopCents,
    totalCopCents,
  };
}

function buildReferralAttribution(
  status: NavaiReferralAttributionStatusRecord,
  options: {
    code?: string;
    referrerUserId?: string;
    referralId?: string;
  } = {}
): NavaiReferralAttributionRecord {
  return {
    code: normalizeReferralCode(options.code),
    status,
    referrerUserId: normalizeString(options.referrerUserId),
    referralId: normalizeString(options.referralId),
  };
}

function resolveExperienceAttemptDateKey(value: string) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(parsed);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return year && month && day ? `${year}-${month}-${day}` : "";
}

function normalizeExperienceAccessMode(value: unknown): NavaiPanelExperienceAccessMode {
  return normalizeString(value).toLowerCase() === "private" ? "private" : "public";
}

function normalizeRewardType(value: unknown): NavaiExperienceRewardType {
  const normalized = normalizeString(value).toLowerCase() as NavaiExperienceRewardType;
  return NAVAI_EXPERIENCE_REWARD_TYPES.has(normalized) ? normalized : "money";
}

function normalizeRewardDeliveryMethod(value: unknown): NavaiExperienceRewardDeliveryMethod {
  const normalized = normalizeString(value).toLowerCase() as NavaiExperienceRewardDeliveryMethod;
  return NAVAI_EXPERIENCE_REWARD_DELIVERY_METHODS.has(normalized)
    ? normalized
    : "manual_coordination";
}

function normalizeRewardPaymentMethods(value: unknown): NavaiExperienceRewardPaymentMethod[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? parseJsonArray(value).length > 0
        ? parseJsonArray(value)
        : value.split(/[\n,;]+/g)
      : [];

  return Array.from(
    new Set(
      rawValues
        .map((entry) =>
          normalizeString(entry).toLowerCase() as NavaiExperienceRewardPaymentMethod
        )
        .filter((entry) => NAVAI_EXPERIENCE_REWARD_PAYMENT_METHODS.has(entry))
    )
  );
}

function normalizeUserVerificationStatus(value: unknown): NavaiUserVerificationStatus {
  const normalized = normalizeString(value).toLowerCase() as NavaiUserVerificationStatus;
  return NAVAI_USER_VERIFICATION_STATUSES.has(normalized)
    ? normalized
    : "not_submitted";
}

function normalizeUserAccountStatus(value: unknown): NavaiUserAccountStatus {
  const normalized = normalizeString(value).toLowerCase() as NavaiUserAccountStatus;
  return NAVAI_USER_ACCOUNT_STATUSES.has(normalized) ? normalized : "active";
}

function normalizeUserVerificationDocumentType(
  value: unknown
): NavaiUserVerificationDocumentType {
  const normalized = normalizeString(value).toLowerCase() as NavaiUserVerificationDocumentType;
  return NAVAI_USER_VERIFICATION_DOCUMENT_TYPES.has(normalized)
    ? normalized
    : "citizenship_card";
}

function normalizeUserVerificationAssetInput(
  assetIdValue: unknown,
  urlValue: unknown,
  fieldLabel: string
): NormalizedUserVerificationAssetInput {
  const assetId = normalizeString(assetIdValue);
  const url = normalizeOptionalUrl(urlValue);

  if (!assetId || !url) {
    throw new Error(`${fieldLabel} is required.`);
  }

  return { assetId, url };
}

function validateUserVerificationInput(
  input: NavaiUserVerificationInput
): NormalizedUserVerificationInput {
  const fullName = normalizeString(input.fullName);
  const documentNumber = normalizeString(input.documentNumber);
  const documentCountry = normalizeString(input.documentCountry);

  if (!fullName) {
    throw new Error("Verification full name is required.");
  }
  if (!documentNumber) {
    throw new Error("Verification document number is required.");
  }
  if (!documentCountry) {
    throw new Error("Verification document country is required.");
  }

  return {
    fullName,
    documentType: normalizeUserVerificationDocumentType(input.documentType),
    documentNumber,
    documentCountry,
    selfieImage: normalizeUserVerificationAssetInput(
      input.selfieImageId,
      input.selfieImageUrl,
      "Verification face image"
    ),
    documentFrontImage: normalizeUserVerificationAssetInput(
      input.documentFrontImageId,
      input.documentFrontImageUrl,
      "Verification document front image"
    ),
    documentBackImage: normalizeUserVerificationAssetInput(
      input.documentBackImageId,
      input.documentBackImageUrl,
      "Verification document back image"
    ),
  };
}

function validateUserVerificationReviewInput(
  input: NavaiUserVerificationReviewInput
): NormalizedUserVerificationReviewInput {
  const status = normalizeUserVerificationStatus(input.status);
  if (status === "not_submitted") {
    throw new Error("Verification review status is required.");
  }

  return {
    status,
    responseMessage: normalizeString(input.responseMessage),
  };
}

function normalizePublicCommentInput(
  input: NavaiPublicExperienceCommentInput
): NormalizedPublicCommentInput {
  const body = normalizeString(input.body);
  if (!body) {
    throw new Error("Comment body is required.");
  }

  const rating = normalizeOptionalInteger(input.rating) ?? 5;
  if (rating < 1 || rating > 5) {
    throw new Error("Comment rating must be between 1 and 5.");
  }

  return { body, rating };
}

function validateUserProfileInput(input: NavaiUserProfileInput): NormalizedUserProfileInput {
  return {
    displayName: normalizeString(input.displayName),
    photoUrl: normalizeOptionalUrl(input.photoUrl),
    bio: normalizeString(input.bio),
    professionalHeadline: normalizeString(input.professionalHeadline),
    jobTitle: normalizeString(input.jobTitle),
    company: normalizeString(input.company),
    location: normalizeString(input.location),
    phone: normalizeString(input.phone),
    websiteUrl: normalizeOptionalUrl(input.websiteUrl),
    linkedinUrl: normalizeOptionalUrl(input.linkedinUrl),
    githubUrl: normalizeOptionalUrl(input.githubUrl),
    xUrl: normalizeOptionalUrl(input.xUrl),
    instagramUrl: normalizeOptionalUrl(input.instagramUrl),
    facebookUrl: normalizeOptionalUrl(input.facebookUrl),
  };
}

function normalizeAllowedEmails(value: unknown) {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,;]+/g)
      : [];

  const normalized = rawValues
    .map((entry) => normalizeEmailAddress(entry))
    .filter(Boolean);
  const unique = Array.from(new Set(normalized));

  for (const email of unique) {
    if (!EMAIL_ADDRESS_PATTERN.test(email)) {
      throw new Error(`Invalid email address: ${email}.`);
    }
  }

  return unique;
}

function normalizeIsoDateTime(value: unknown, label: string) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return "";
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} is invalid.`);
  }

  return parsed.toISOString();
}

function slugifyIdentifier(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "item";
}

function normalizePublicCode(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function generateRandomPublicCode() {
  let code = "";
  for (let index = 0; index < PUBLIC_CODE_LENGTH; index += 1) {
    code += PUBLIC_CODE_ALPHABET[randomInt(0, PUBLIC_CODE_ALPHABET.length)];
  }
  return code;
}

function generateRandomReferralCode() {
  let code = "";
  for (let index = 0; index < REFERRAL_CODE_LENGTH; index += 1) {
    code += REFERRAL_CODE_ALPHABET[randomInt(0, REFERRAL_CODE_ALPHABET.length)];
  }
  return code;
}

function doesPublicCodeExist(db: SqlJsDatabase, slug: string, excludedId = "") {
  const normalizedSlug = normalizePublicCode(slug);
  if (!normalizedSlug) {
    return false;
  }

  const params = excludedId ? [normalizedSlug, excludedId] : [normalizedSlug];
  const row = readFirstRow(
    db,
    `SELECT id FROM navai_workspace_experiences WHERE slug = ?${excludedId ? " AND id <> ?" : ""}`,
    params
  );

  return Boolean(row);
}

function generateUniquePublicCode(db: SqlJsDatabase) {
  for (let attempts = 0; attempts < 100; attempts += 1) {
    const candidate = generateRandomPublicCode();
    if (!doesPublicCodeExist(db, candidate)) {
      return candidate;
    }
  }

  throw new Error("Could not generate a unique public URL code.");
}

function normalizeQuestionItem(value: unknown, index: number): NavaiPanelEvaluationQuestionRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const question = normalizeString(record.question);
  const expectedAnswer = normalizeString(record.expectedAnswer);
  if (!question) {
    return null;
  }

  const providedId = normalizeString(record.id);
  return {
    id: providedId || `question-${index + 1}-${slugifyIdentifier(question)}`,
    question,
    expectedAnswer,
    allowAiGrading: normalizeBoolean(record.allowAiGrading),
  };
}

function normalizeQuestions(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => normalizeQuestionItem(item, index))
    .filter((item): item is NavaiPanelEvaluationQuestionRecord => Boolean(item));
}

function normalizeExperienceStatus(value: unknown): NavaiPanelExperienceStatus {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === "active") {
    return "Active";
  }
  if (normalized === "completed") {
    return "Completed";
  }
  return "Draft";
}

function normalizePublicConversationStatus(value: unknown): NavaiPublicExperienceConversationStatus {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === "completed") {
    return "Completed";
  }
  if (normalized === "abandoned") {
    return "Abandoned";
  }
  return "Open";
}

function resolveExperiencePublicPath(kind: NavaiPanelExperienceKind, slug: string) {
  const pathname = kind === "evaluation" ? "/evaluation" : "/survey";
  return `${pathname}/${encodeURIComponent(slug)}`;
}

function readStatementRows(db: SqlJsDatabase, sql: string, params: unknown[] = []) {
  const statement = db.prepare(sql);
  if (params.length > 0) {
    statement.bind(params);
  }

  const rows: Array<Record<string, unknown>> = [];
  while (statement.step()) {
    rows.push(statement.getAsObject());
  }
  statement.free();
  return rows;
}

function readFirstRow(db: SqlJsDatabase, sql: string, params: unknown[] = []) {
  return readStatementRows(db, sql, params)[0] ?? null;
}

function formatFallbackDisplayName(email: string, userId: string) {
  const normalizedEmail = normalizeEmailAddress(email);
  if (normalizedEmail) {
    const localPart = normalizedEmail.split("@")[0] ?? normalizedEmail;
    return localPart
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return userId ? `Usuario ${userId.slice(0, 6)}` : "Usuario";
}

function mapUserProfileRow(row: Record<string, unknown> | null): NavaiUserProfileRecord | null {
  if (!row) {
    return null;
  }

  return {
    userId: String(row.user_id ?? ""),
    email: String(row.email ?? ""),
    accountStatus: normalizeUserAccountStatus(row.account_status),
    deletionRequestedAt: String(row.deletion_requested_at ?? ""),
    scheduledDeletionAt: String(row.scheduled_deletion_at ?? ""),
    deactivatedAt: String(row.deactivated_at ?? ""),
    displayName: String(row.display_name ?? ""),
    photoUrl: String(row.photo_url ?? ""),
    bio: String(row.bio ?? ""),
    professionalHeadline: String(row.professional_headline ?? ""),
    jobTitle: String(row.job_title ?? ""),
    company: String(row.company ?? ""),
    location: String(row.location ?? ""),
    phone: String(row.phone ?? ""),
    websiteUrl: String(row.website_url ?? ""),
    linkedinUrl: String(row.linkedin_url ?? ""),
    githubUrl: String(row.github_url ?? ""),
    xUrl: String(row.x_url ?? ""),
    instagramUrl: String(row.instagram_url ?? ""),
    facebookUrl: String(row.facebook_url ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapUserVerificationAsset(
  assetId: unknown,
  url: unknown
): NavaiUserVerificationAssetRecord | null {
  const normalizedAssetId = normalizeString(assetId);
  const normalizedUrl = normalizeOptionalUrl(url);
  if (!normalizedAssetId || !normalizedUrl) {
    return null;
  }

  return {
    assetId: normalizedAssetId,
    url: normalizedUrl,
  };
}

function mapUserVerificationRow(
  row: Record<string, unknown> | null
): NavaiUserVerificationRecord | null {
  if (!row) {
    return null;
  }

  return {
    userId: String(row.user_id ?? ""),
    email: String(row.email ?? ""),
    status: normalizeUserVerificationStatus(row.status),
    fullName: String(row.full_name ?? ""),
    documentType: normalizeUserVerificationDocumentType(row.document_type),
    documentNumber: String(row.document_number ?? ""),
    documentCountry: String(row.document_country ?? ""),
    selfieImage: mapUserVerificationAsset(row.selfie_image_id, row.selfie_image_url),
    documentFrontImage: mapUserVerificationAsset(
      row.document_front_image_id,
      row.document_front_image_url
    ),
    documentBackImage: mapUserVerificationAsset(
      row.document_back_image_id,
      row.document_back_image_url
    ),
    responseMessage: String(row.response_message ?? ""),
    submittedAt: String(row.submitted_at ?? ""),
    reviewedAt: String(row.reviewed_at ?? ""),
    reviewedByUserId: String(row.reviewed_by_user_id ?? ""),
    reviewedByEmail: String(row.reviewed_by_email ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function buildResolvedUserProfile(
  profile: NavaiUserProfileRecord | null,
  fallback: { userId: string; email: string }
) {
  const userId = profile?.userId || fallback.userId;
  const email = profile?.email || fallback.email;
  return {
    userId,
    email,
    accountStatus: profile?.accountStatus ?? "active",
    deletionRequestedAt: profile?.deletionRequestedAt ?? "",
    scheduledDeletionAt: profile?.scheduledDeletionAt ?? "",
    deactivatedAt: profile?.deactivatedAt ?? "",
    displayName:
      normalizeString(profile?.displayName) || formatFallbackDisplayName(email, userId),
    photoUrl: normalizeOptionalUrl(profile?.photoUrl),
    bio: normalizeString(profile?.bio),
    professionalHeadline: normalizeString(profile?.professionalHeadline),
    jobTitle: normalizeString(profile?.jobTitle),
    company: normalizeString(profile?.company),
    location: normalizeString(profile?.location),
    phone: normalizeString(profile?.phone),
    websiteUrl: normalizeOptionalUrl(profile?.websiteUrl),
    linkedinUrl: normalizeOptionalUrl(profile?.linkedinUrl),
    githubUrl: normalizeOptionalUrl(profile?.githubUrl),
    xUrl: normalizeOptionalUrl(profile?.xUrl),
    instagramUrl: normalizeOptionalUrl(profile?.instagramUrl),
    facebookUrl: normalizeOptionalUrl(profile?.facebookUrl),
    createdAt: profile?.createdAt ?? "",
    updatedAt: profile?.updatedAt ?? "",
  } satisfies NavaiUserProfileRecord;
}

function buildPublicFacingUserProfile(profile: NavaiUserProfileRecord) {
  if (profile.accountStatus !== "inactive") {
    return profile;
  }

  return {
    ...profile,
    email: "",
    displayName: "Usuario no disponible",
    photoUrl: "",
    bio: "",
    professionalHeadline: "",
    jobTitle: "",
    company: "",
    location: "",
    phone: "",
    websiteUrl: "",
    linkedinUrl: "",
    githubUrl: "",
    xUrl: "",
    instagramUrl: "",
    facebookUrl: "",
  } satisfies NavaiUserProfileRecord;
}

function buildResolvedUserVerification(
  verification: NavaiUserVerificationRecord | null,
  fallback: { userId: string; email: string }
) {
  return {
    userId: verification?.userId || fallback.userId,
    email: verification?.email || fallback.email,
    status: verification?.status ?? "not_submitted",
    fullName: normalizeString(verification?.fullName),
    documentType: verification?.documentType ?? "citizenship_card",
    documentNumber: normalizeString(verification?.documentNumber),
    documentCountry: normalizeString(verification?.documentCountry),
    selfieImage: verification?.selfieImage ?? null,
    documentFrontImage: verification?.documentFrontImage ?? null,
    documentBackImage: verification?.documentBackImage ?? null,
    responseMessage: normalizeString(verification?.responseMessage),
    submittedAt: verification?.submittedAt ?? "",
    reviewedAt: verification?.reviewedAt ?? "",
    reviewedByUserId: verification?.reviewedByUserId ?? "",
    reviewedByEmail: verification?.reviewedByEmail ?? "",
    createdAt: verification?.createdAt ?? "",
    updatedAt: verification?.updatedAt ?? "",
  } satisfies NavaiUserVerificationRecord;
}

async function resolveWorkspaceSqliteFilePath() {
  const projectRoot = resolveProjectRoot();
  const directory = path.join(projectRoot, "backend", ".data");
  await fs.mkdir(directory, { recursive: true });
  return path.join(directory, "navai-workspace.sqlite");
}

function mapSupportMessageRow(row: Record<string, unknown>): NavaiPanelSupportMessageRecord {
  return {
    id: String(row.id ?? ""),
    ticketId: String(row.ticket_id ?? ""),
    author: String(row.author ?? ""),
    authorRole: String(row.author_role ?? "") === "support" ? "support" : "customer",
    body: String(row.body ?? ""),
    attachments: [],
    createdAt: String(row.created_at ?? ""),
  };
}

function mapSupportAttachmentRow(
  row: Record<string, unknown>
): NavaiPanelSupportAttachmentRecord {
  return {
    id: String(row.id ?? ""),
    messageId: String(row.message_id ?? ""),
    kind: String(row.kind ?? "") === "video" ? "video" : "image",
    assetId: String(row.asset_id ?? ""),
    url: String(row.url ?? ""),
    fileName: String(row.file_name ?? ""),
    contentType: String(row.content_type ?? ""),
    sizeBytes: normalizeInteger(row.size_bytes),
    createdAt: String(row.created_at ?? ""),
  };
}

function readSupportMessageAttachmentsByMessageId(db: SqlJsDatabase, messageId: string) {
  return readStatementRows(
    db,
    `
      SELECT id, message_id, kind, asset_id, url, file_name, content_type, size_bytes, created_at
      FROM navai_support_message_attachments
      WHERE message_id = ?
      ORDER BY created_at ASC
    `,
    [messageId]
  ).map(mapSupportAttachmentRow);
}

function mapSupportTicketRow(
  row: Record<string, unknown>,
  messages: NavaiPanelSupportMessageRecord[],
  requesterProfile: NavaiUserProfileRecord
): NavaiPanelSupportTicketRecord {
  return {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    requesterEmail: String(row.requester_email ?? ""),
    requesterProfile,
    subject: String(row.subject ?? ""),
    channel: String(row.channel ?? ""),
    category: String(row.category ?? ""),
    priority: String(row.priority ?? ""),
    status: String(row.status ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    messages,
  };
}

function buildDefaultAgentSettings(
  userId: string,
  kind: NavaiPanelExperienceKind
): NavaiPanelAgentSettingsRecord {
  return {
    userId,
    kind,
    name: "",
    agentModel: "",
    agentVoice: "",
    agentLanguage: "",
    agentVoiceAccent: "",
    agentVoiceTone: "",
    updatedAt: "",
  };
}

function mapAgentRow(row: Record<string, unknown>): NavaiPanelAgentRecord {
  return {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    kind: String(row.kind ?? "") === "survey" ? "survey" : "evaluation",
    name: String(row.name ?? ""),
    agentModel: String(row.agent_model ?? ""),
    agentVoice: String(row.agent_voice ?? ""),
    agentLanguage: String(row.agent_language ?? ""),
    agentVoiceAccent: String(row.agent_voice_accent ?? ""),
    agentVoiceTone: String(row.agent_voice_tone ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapExperienceRow(
  row: Record<string, unknown>,
  domainById: Map<string, NavaiPanelDomainRecord>,
  agentById: Map<string, NavaiPanelAgentRecord>
): NavaiPanelEvaluationRecord | NavaiPanelSurveyRecord {
  const kind = String(row.kind ?? "") === "survey" ? "survey" : "evaluation";
  const domainId = String(row.domain_id ?? "");
  const domain = domainById.get(domainId);
  const agentId = String(row.agent_id ?? "");
  const agent = agentById.get(agentId);
  const rewardPoints = normalizePointAmount(
    row.reward_points ?? row.reward_usd_amount ?? 0,
    0
  );
  const rewardUsdAmount = normalizeCurrencyAmount(row.reward_usd_amount ?? rewardPoints, rewardPoints);
  const base = {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    kind,
    domainId,
    domainLabel: domain?.label || domain?.domain || "",
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    description: String(row.description ?? ""),
    status: normalizeExperienceStatus(row.status),
    accessMode: normalizeExperienceAccessMode(row.access_mode),
    allowedEmails: normalizeAllowedEmails(parseJsonArray(row.allowed_emails_json)),
    allowPlusUsers: true,
    allowNonPlusUsers: true,
    startsAt: String(row.starts_at ?? ""),
    endsAt: String(row.ends_at ?? ""),
    delegateAiGrading: normalizeBoolean(row.delegate_ai_grading),
    enableRanking: normalizeBoolean(row.enable_ranking),
    enableComments: normalizeBoolean(row.enable_comments),
    rewardType: normalizeRewardType(row.reward_type),
    rewardTitle: String(row.reward_title ?? ""),
    rewardDescription: String(row.reward_description ?? ""),
    rewardDeliveryMethod: normalizeRewardDeliveryMethod(row.reward_delivery_method),
    rewardDeliveryDetails: String(row.reward_delivery_details ?? ""),
    rewardPaymentMethods: normalizeRewardPaymentMethods(
      parseJsonArray(row.reward_payment_methods_json)
    ),
    rewardWinnerCount: normalizePositiveInteger(row.reward_winner_count, 1),
    rewardPoints,
    rewardUsdAmount,
    dailyAttemptLimit: normalizePositiveInteger(row.daily_attempt_limit, 1),
    agentId,
    agentName: agent?.name ?? "",
    questions: normalizeQuestions(parseJsonArray(row.questions_json)),
    welcomeTitle: String(row.welcome_title ?? ""),
    welcomeBody: String(row.welcome_body ?? ""),
    autoStartConversation: normalizeBoolean(row.auto_start_conversation),
    enableEntryModal: normalizeBooleanWithFallback(row.enable_entry_modal, true),
    enableHCaptcha: normalizeBooleanWithFallback(row.enable_hcaptcha, true),
    systemPrompt: String(row.system_prompt ?? ""),
    agentModel: agent?.agentModel ?? "",
    agentVoice: agent?.agentVoice ?? "",
    agentLanguage: agent?.agentLanguage ?? "",
    agentVoiceAccent: agent?.agentVoiceAccent ?? "",
    agentVoiceTone: agent?.agentVoiceTone ?? "",
    launches: normalizeInteger(row.launches_count),
    conversations: normalizeInteger(row.conversations_count),
    publicPath: resolveExperiencePublicPath(kind, String(row.slug ?? "")),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };

  if (kind === "survey") {
    return base as NavaiPanelSurveyRecord;
  }

  return base as NavaiPanelEvaluationRecord;
}

function validateUserId(userId: string) {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    throw new Error("Authentication required.");
  }

  return normalizedUserId;
}

function validateExperienceInput(input: NavaiPanelExperienceInput): NormalizedExperienceInput {
  const name = normalizeString(input.name);
  if (!name) {
    throw new Error("Experience name is required.");
  }

  const slug = normalizePublicCode(input.slug);
  const domainId = normalizeString(input.domainId);
  const accessMode = normalizeExperienceAccessMode(input.accessMode);
  const allowedEmails = normalizeAllowedEmails(input.allowedEmails);
  const allowPlusUsers = true;
  const allowNonPlusUsers = true;
  const startsAt = normalizeIsoDateTime(input.startsAt, "Start date and time");
  const endsAt = normalizeIsoDateTime(input.endsAt, "End date and time");
  const dailyAttemptLimit = normalizePositiveInteger(input.dailyAttemptLimit, 1);
  const rewardWinnerCount = Math.min(100, normalizePositiveInteger(input.rewardWinnerCount, 1));
  const rewardPoints = normalizePointAmount(
    input.rewardPoints ?? input.rewardUsdAmount,
    0
  );

  if (accessMode === "private" && allowedEmails.length === 0) {
    throw new Error("Private experiences require at least one allowed email.");
  }
  if (startsAt && endsAt && new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
    throw new Error("End date and time must be later than start date and time.");
  }

  return {
    domainId,
    name,
    slug,
    description: normalizeString(input.description),
    status: normalizeExperienceStatus(input.status),
    accessMode,
    allowedEmails,
    allowPlusUsers,
    allowNonPlusUsers,
    startsAt,
    endsAt,
    delegateAiGrading: normalizeBoolean(input.delegateAiGrading),
    enableRanking: normalizeBoolean(input.enableRanking),
    enableComments: normalizeBoolean(input.enableComments),
    rewardType: normalizeRewardType(input.rewardType),
    rewardTitle: normalizeString(input.rewardTitle),
    rewardDescription: normalizeString(input.rewardDescription),
    rewardDeliveryMethod: normalizeRewardDeliveryMethod(input.rewardDeliveryMethod),
    rewardDeliveryDetails: normalizeString(input.rewardDeliveryDetails),
    rewardPaymentMethods: normalizeRewardPaymentMethods(input.rewardPaymentMethods),
    rewardWinnerCount,
    rewardPoints,
    dailyAttemptLimit,
    agentId: normalizeString(input.agentId),
    questions: normalizeQuestions(input.questions),
    welcomeTitle: normalizeString(input.welcomeTitle),
    welcomeBody: normalizeString(input.welcomeBody),
    autoStartConversation: normalizeBoolean(input.autoStartConversation),
    enableEntryModal: normalizeBooleanWithFallback(input.enableEntryModal, true),
    enableHCaptcha: normalizeBooleanWithFallback(input.enableHCaptcha, true),
    systemPrompt: normalizeString(input.systemPrompt) || normalizeString(input.description),
  };
}

function validatePointsCashoutPaymentSettingsInput(
  input: NavaiPointsCashoutPaymentSettingsInput
): NormalizedPointsCashoutPaymentSettingsInput {
  const accountReference = normalizeString(input.accountReference);
  if (!accountReference) {
    throw new Error("Cashout account reference is required.");
  }

  return {
    paymentMethod: normalizePointsCashoutPaymentMethod(input.paymentMethod),
    accountHolder: normalizeString(input.accountHolder),
    accountReference,
    notes: normalizeString(input.notes),
  };
}

function validatePointsCashoutRequestInput(
  input: NavaiPointsCashoutRequestInput
): NormalizedPointsCashoutRequestInput {
  const base = validatePointsCashoutPaymentSettingsInput(input);
  const requestedPoints = normalizePointAmount(input.requestedPoints, 0);
  if (requestedPoints < 1) {
    throw new Error("Requested points must be at least 1.");
  }

  return {
    ...base,
    requestedPoints,
  };
}

function validatePointsCashoutReviewInput(
  input: NavaiPointsCashoutReviewInput
): NormalizedPointsCashoutReviewInput {
  const status = normalizePointsCashoutStatus(input.status);
  if (status === "pending") {
    throw new Error("Cashout review status is required.");
  }

  return {
    status,
    responseMessage: normalizeString(input.responseMessage),
  };
}

function validateEntryPackageInput(input: NavaiEntryPackageInput): NormalizedEntryPackageInput {
  const name = normalizeString(input.name);
  if (!name) {
    throw new Error("Entry package name is required.");
  }

  const entriesCount = Math.max(1, Math.min(100000, normalizePositiveInteger(input.entriesCount, 1)));
  const priceUsd = normalizeEntryPriceUsd(input.priceUsd, NAVAI_DEFAULT_ENTRY_PACKAGE_PRICE_USD);
  const vatPercentage = normalizeVatPercentage(
    input.vatPercentage,
    NAVAI_DEFAULT_ENTRY_PACKAGE_VAT_PERCENTAGE
  );
  const sortOrder = Math.max(0, Math.min(100000, normalizeInteger(input.sortOrder)));

  return {
    name,
    description: normalizeString(input.description),
    entriesCount,
    priceUsd,
    vatPercentage,
    isActive: normalizeBooleanWithFallback(input.isActive, true),
    sortOrder,
  };
}

function validateAgentSettingsInput(
  input: NavaiPanelAgentSettingsInput
): NormalizedAgentSettingsInput {
  return {
    name: normalizeString(input.name),
    agentModel: normalizeString(input.agentModel),
    agentVoice: normalizeString(input.agentVoice),
    agentLanguage: normalizeString(input.agentLanguage),
    agentVoiceAccent: normalizeString(input.agentVoiceAccent),
    agentVoiceTone: normalizeString(input.agentVoiceTone),
  };
}

function validateAgentInput(input: NavaiPanelAgentInput): NormalizedAgentInput {
  const name = normalizeString(input.name);
  if (!name) {
    throw new Error("Agent name is required.");
  }

  return {
    name,
    agentModel: normalizeString(input.agentModel),
    agentVoice: normalizeString(input.agentVoice),
    agentLanguage: normalizeString(input.agentLanguage),
    agentVoiceAccent: normalizeString(input.agentVoiceAccent),
    agentVoiceTone: normalizeString(input.agentVoiceTone),
  };
}

function normalizePublicConversationTurnInput(
  value: unknown,
  index: number
): NormalizedPublicConversationTurnInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const transcript = normalizeString(record.transcript);
  if (!transcript) {
    return null;
  }

  const role = normalizeString(record.role).toLowerCase() === "assistant" ? "assistant" : "user";
  const providedClientTurnId = normalizeString(record.clientTurnId);
  return {
    clientTurnId: providedClientTurnId || `turn-${index + 1}-${randomUUID()}`,
    role,
    transcript,
    sourceEventType: normalizeString(record.sourceEventType),
  };
}

function normalizePublicConversationAnswerInput(
  value: unknown
): NormalizedPublicConversationAnswerInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const questionId = normalizeString(record.questionId);
  const answerText = normalizeString(record.answerText);
  if (!questionId || !answerText) {
    return null;
  }

  return {
    questionId,
    questionText: normalizeString(record.questionText),
    answerText,
  };
}

function normalizePublicConversationMediaInput(
  value: unknown
): NormalizedPublicConversationAudioInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const storagePath = normalizeString(record.storagePath);
  if (!storagePath) {
    return null;
  }

  return {
    storagePath,
    downloadUrl: normalizeString(record.downloadUrl),
    contentType: normalizeString(record.contentType),
    sizeBytes: normalizeInteger(record.sizeBytes),
    durationMs: normalizeInteger(record.durationMs),
  };
}

function validatePublicConversationProgressInput(
  input: NavaiPublicExperienceConversationProgressInput
): NormalizedPublicConversationProgressInput {
  return {
    turns: Array.isArray(input.turns)
      ? input.turns
          .map((item, index) => normalizePublicConversationTurnInput(item, index))
          .filter((item): item is NormalizedPublicConversationTurnInput => Boolean(item))
      : [],
    answers: Array.isArray(input.answers)
      ? input.answers
          .map((item) => normalizePublicConversationAnswerInput(item))
          .filter((item): item is NormalizedPublicConversationAnswerInput => Boolean(item))
      : [],
    status:
      input.status === undefined || input.status === null
        ? null
        : normalizePublicConversationStatus(input.status),
    audio: normalizePublicConversationMediaInput(input.audio),
    video: normalizePublicConversationMediaInput(input.video),
  };
}

function mapPublicConversationAnswerRow(
  row: Record<string, unknown>
): NavaiPublicExperienceConversationAnswerRecord {
  return {
    id: String(row.id ?? ""),
    conversationId: String(row.conversation_id ?? ""),
    questionId: String(row.question_id ?? ""),
    questionText: String(row.question_text ?? ""),
    answerText: String(row.answer_text ?? ""),
    aiScore: normalizeInteger(row.ai_score),
    aiFeedback: String(row.ai_feedback ?? ""),
    aiScoredAt: String(row.ai_scored_at ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapPublicConversationRow(
  row: Record<string, unknown>,
  answers: NavaiPublicExperienceConversationAnswerRecord[]
): NavaiPublicExperienceConversationRecord {
  return {
    id: String(row.id ?? ""),
    experienceId: String(row.experience_id ?? ""),
    experienceKind: String(row.experience_kind ?? "") === "survey" ? "survey" : "evaluation",
    experienceSlug: String(row.experience_slug ?? ""),
    respondentUserId: String(row.respondent_user_id ?? ""),
    respondentEmail: String(row.respondent_email ?? ""),
    status: normalizePublicConversationStatus(row.status),
    startedAt: String(row.started_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    endedAt: String(row.ended_at ?? ""),
    totalQuestions: normalizeInteger(row.total_questions_count),
    answeredQuestions: normalizeInteger(row.answered_questions_count),
    audioStoragePath: String(row.audio_storage_path ?? ""),
    audioDownloadUrl: String(row.audio_download_url ?? ""),
    audioContentType: String(row.audio_content_type ?? ""),
    audioSizeBytes: normalizeInteger(row.audio_size_bytes),
    audioDurationMs: normalizeInteger(row.audio_duration_ms),
    videoStoragePath: String(row.video_storage_path ?? ""),
    videoDownloadUrl: String(row.video_download_url ?? ""),
    videoContentType: String(row.video_content_type ?? ""),
    videoSizeBytes: normalizeInteger(row.video_size_bytes),
    videoDurationMs: normalizeInteger(row.video_duration_ms),
    answers,
  };
}

function readPublicConversationAnswers(
  db: SqlJsDatabase,
  conversationId: string
) {
  return readStatementRows(
    db,
    `
      SELECT
        id,
        conversation_id,
        question_id,
        question_text,
        answer_text,
        ai_score,
        ai_feedback,
        ai_scored_at,
        created_at,
        updated_at
      FROM navai_public_experience_conversation_answers
      WHERE conversation_id = ?
      ORDER BY updated_at ASC, created_at ASC
    `,
    [conversationId]
  ).map(mapPublicConversationAnswerRow);
}

function readPublicConversationById(
  db: SqlJsDatabase,
  conversationId: string
) {
  const row = readFirstRow(
    db,
    `
      SELECT
        id,
        experience_id,
        experience_kind,
        experience_slug,
        respondent_user_id,
        respondent_email,
        status,
        started_at,
        updated_at,
        ended_at,
        total_questions_count,
        answered_questions_count,
        audio_storage_path,
        audio_download_url,
        audio_content_type,
        audio_size_bytes,
        audio_duration_ms,
        video_storage_path,
        video_download_url,
        video_content_type,
        video_size_bytes,
        video_duration_ms
      FROM navai_public_experience_conversations
      WHERE id = ?
    `,
    [conversationId]
  );

  if (!row) {
    return null;
  }

  return mapPublicConversationRow(row, readPublicConversationAnswers(db, conversationId));
}

function readUserProfileByUserId(db: SqlJsDatabase, userId: string) {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    return null;
  }

  const row = readFirstRow(
    db,
    `
      SELECT
        user_id,
        email,
        account_status,
        deletion_requested_at,
        scheduled_deletion_at,
        deactivated_at,
        display_name,
        photo_url,
        bio,
        professional_headline,
        job_title,
        company,
        location,
        phone,
        website_url,
        linkedin_url,
        github_url,
        x_url,
        instagram_url,
        facebook_url,
        created_at,
        updated_at
      FROM navai_user_profiles
      WHERE user_id = ?
      LIMIT 1
    `,
    [normalizedUserId]
  );

  return mapUserProfileRow(row);
}

function readUserVerificationByUserId(db: SqlJsDatabase, userId: string) {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    return null;
  }

  const row = readFirstRow(
    db,
    `
      SELECT
        user_id,
        email,
        status,
        full_name,
        document_type,
        document_number,
        document_country,
        selfie_image_id,
        selfie_image_url,
        document_front_image_id,
        document_front_image_url,
        document_back_image_id,
        document_back_image_url,
        response_message,
        submitted_at,
        reviewed_at,
        reviewed_by_user_id,
        reviewed_by_email,
        created_at,
        updated_at
      FROM navai_user_verifications
      WHERE user_id = ?
      LIMIT 1
    `,
    [normalizedUserId]
  );

  return mapUserVerificationRow(row);
}

function readFallbackEmailForUser(
  db: SqlJsDatabase,
  userId: string,
  options?: { preferredEmail?: string }
) {
  const preferredEmail = normalizeEmailAddress(options?.preferredEmail);
  if (preferredEmail) {
    return preferredEmail;
  }

  const profile = readUserProfileByUserId(db, userId);
  const profileEmail = normalizeEmailAddress(profile?.email);
  if (profileEmail) {
    return profileEmail;
  }

  const commentRow = readFirstRow(
    db,
    `
      SELECT author_email
      FROM navai_public_experience_comments
      WHERE author_user_id = ?
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
    `,
    [userId]
  );
  const commentEmail = normalizeEmailAddress(commentRow?.author_email);
  if (commentEmail) {
    return commentEmail;
  }

  const conversationRow = readFirstRow(
    db,
    `
      SELECT respondent_email
      FROM navai_public_experience_conversations
      WHERE respondent_user_id = ?
      ORDER BY updated_at DESC, started_at DESC
      LIMIT 1
    `,
    [userId]
  );

  return normalizeEmailAddress(conversationRow?.respondent_email);
}

function readResolvedUserProfile(
  db: SqlJsDatabase,
  userId: string,
  options?: { preferredEmail?: string }
) {
  const normalizedUserId = normalizeString(userId);
  const profile = readUserProfileByUserId(db, normalizedUserId);
  return buildResolvedUserProfile(profile, {
    userId: normalizedUserId,
    email: readFallbackEmailForUser(db, normalizedUserId, options),
  });
}

function readPublicFacingUserProfile(
  db: SqlJsDatabase,
  userId: string,
  options?: { preferredEmail?: string }
) {
  return buildPublicFacingUserProfile(readResolvedUserProfile(db, userId, options));
}

function readResolvedUserVerification(
  db: SqlJsDatabase,
  userId: string,
  options?: { preferredEmail?: string }
) {
  const normalizedUserId = normalizeString(userId);
  const verification = readUserVerificationByUserId(db, normalizedUserId);
  return buildResolvedUserVerification(verification, {
    userId: normalizedUserId,
    email: readFallbackEmailForUser(db, normalizedUserId, options),
  });
}

function mapPublicExperienceCommentRow(
  db: SqlJsDatabase,
  row: Record<string, unknown>
): NavaiPublicExperienceCommentRecord {
  const authorUserId = String(row.author_user_id ?? "");
  const authorEmail = String(row.author_email ?? "");
  const profile = readPublicFacingUserProfile(db, authorUserId, {
    preferredEmail: authorEmail,
  });

  return {
    id: String(row.id ?? ""),
    experienceId: String(row.experience_id ?? ""),
    experienceKind:
      String(row.experience_kind ?? "") === "survey" ? "survey" : "evaluation",
    experienceSlug: String(row.experience_slug ?? ""),
    authorUserId,
    authorEmail: profile.email,
    authorDisplayName: profile.displayName,
    authorPhotoUrl: profile.photoUrl,
    body: String(row.body ?? ""),
    rating: normalizeInteger(row.rating),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function readPublicExperienceComments(
  db: SqlJsDatabase,
  experienceId: string
) {
  return readStatementRows(
    db,
    `
      SELECT
        id,
        experience_id,
        experience_kind,
        experience_slug,
        author_user_id,
        author_email,
        body,
        rating,
        created_at,
        updated_at
      FROM navai_public_experience_comments
      WHERE experience_id = ?
      ORDER BY updated_at DESC, created_at DESC
    `,
    [experienceId]
  ).map((row) => mapPublicExperienceCommentRow(db, row));
}

function readPublicExperienceCommentById(db: SqlJsDatabase, commentId: string) {
  const normalizedCommentId = normalizeString(commentId);
  if (!normalizedCommentId) {
    return null;
  }

  const row = readFirstRow(
    db,
    `
      SELECT
        id,
        experience_id,
        experience_kind,
        experience_slug,
        author_user_id,
        author_email,
        body,
        rating,
        created_at,
        updated_at
      FROM navai_public_experience_comments
      WHERE id = ?
      LIMIT 1
    `,
    [normalizedCommentId]
  );

  return row ? mapPublicExperienceCommentRow(db, row) : null;
}

function readPublicExperienceCommentByExperienceAndAuthor(
  db: SqlJsDatabase,
  experienceId: string,
  authorUserId: string
) {
  const normalizedExperienceId = normalizeString(experienceId);
  const normalizedAuthorUserId = normalizeString(authorUserId);
  if (!normalizedExperienceId || !normalizedAuthorUserId) {
    return null;
  }

  const row = readFirstRow(
    db,
    `
      SELECT
        id,
        experience_id,
        experience_kind,
        experience_slug,
        author_user_id,
        author_email,
        body,
        rating,
        created_at,
        updated_at
      FROM navai_public_experience_comments
      WHERE experience_id = ? AND author_user_id = ?
      LIMIT 1
    `,
    [normalizedExperienceId, normalizedAuthorUserId]
  );

  return row ? mapPublicExperienceCommentRow(db, row) : null;
}

function resolveTopEntryRow(
  db: SqlJsDatabase,
  row: Record<string, unknown>
): NavaiPublicExperienceTopEntryRecord {
  const userId = String(row.respondent_user_id ?? "");
  const email = String(row.respondent_email ?? "");
  const profile = readPublicFacingUserProfile(db, userId, { preferredEmail: email });

  return {
    userId,
    email: profile.email,
    displayName: profile.displayName,
    photoUrl: profile.photoUrl,
    totalScore: normalizeInteger(row.total_score),
    answeredQuestions: normalizeInteger(row.answered_questions),
    conversationsCount: normalizeInteger(row.conversations_count),
    latestActivityAt: String(row.latest_activity_at ?? ""),
  };
}

function readLatestPublicExperienceAnswers(
  db: SqlJsDatabase,
  experienceId: string,
  respondentUserId: string
) {
  const rows = readStatementRows(
    db,
    `
      SELECT
        answers.id,
        answers.conversation_id,
        answers.question_id,
        answers.question_text,
        answers.answer_text,
        answers.ai_score,
        answers.ai_feedback,
        answers.ai_scored_at,
        answers.created_at,
        answers.updated_at
      FROM navai_public_experience_conversation_answers AS answers
      INNER JOIN navai_public_experience_conversations AS conversations
        ON conversations.id = answers.conversation_id
      WHERE conversations.experience_id = ? AND conversations.respondent_user_id = ?
      ORDER BY answers.updated_at DESC, answers.created_at DESC
    `,
    [experienceId, respondentUserId]
  );

  const latestByQuestionId = new Map<string, NavaiPublicExperienceConversationAnswerRecord>();
  for (const row of rows) {
    const mapped = mapPublicConversationAnswerRow(row);
    if (!mapped.questionId || latestByQuestionId.has(mapped.questionId)) {
      continue;
    }
    latestByQuestionId.set(mapped.questionId, mapped);
  }

  return Array.from(latestByQuestionId.values());
}

function readWorkspaceExperienceQuestionsForConversation(
  db: SqlJsDatabase,
  conversation: Pick<
    NavaiPublicExperienceConversationRecord,
    "experienceId" | "experienceKind"
  >
) {
  const row = readFirstRow(
    db,
    `
      SELECT name, questions_json, delegate_ai_grading
      FROM navai_workspace_experiences
      WHERE id = ? AND kind = ?
    `,
    [conversation.experienceId, conversation.experienceKind]
  );

  return {
    experienceName: String(row?.name ?? ""),
    questions: normalizeQuestions(parseJsonArray(row?.questions_json)),
    delegateAiGrading: normalizeBoolean(row?.delegate_ai_grading),
  };
}

function readWorkspaceExperienceAccessSettings(
  db: SqlJsDatabase,
  experienceId: string
) {
  const row = readFirstRow(
    db,
    `
      SELECT
        status,
        access_mode,
        allowed_emails_json,
        allow_plus_users,
        allow_non_plus_users,
        starts_at,
        ends_at,
        delegate_ai_grading,
        enable_ranking,
        enable_comments,
        reward_type,
        reward_title,
        reward_description,
        reward_delivery_method,
        reward_delivery_details,
        reward_payment_methods_json,
        reward_winner_count,
        reward_points,
        reward_usd_amount,
        daily_attempt_limit,
        enable_entry_modal,
        enable_hcaptcha
      FROM navai_workspace_experiences
      WHERE id = ?
    `,
    [experienceId]
  );

  return {
    status: normalizeExperienceStatus(row?.status),
    accessMode: normalizeExperienceAccessMode(row?.access_mode),
    allowedEmails: normalizeAllowedEmails(parseJsonArray(row?.allowed_emails_json)),
    allowPlusUsers: true,
    allowNonPlusUsers: true,
    startsAt: String(row?.starts_at ?? ""),
    endsAt: String(row?.ends_at ?? ""),
    delegateAiGrading: normalizeBoolean(row?.delegate_ai_grading),
    enableRanking: normalizeBoolean(row?.enable_ranking),
    enableComments: normalizeBoolean(row?.enable_comments),
    dailyAttemptLimit: normalizePositiveInteger(row?.daily_attempt_limit, 1),
    enableEntryModal: normalizeBooleanWithFallback(row?.enable_entry_modal, true),
    enableHCaptcha: normalizeBooleanWithFallback(row?.enable_hcaptcha, true),
  };
}

function assertExperienceCanStartConversation(
  db: SqlJsDatabase,
  experience: Pick<NavaiPublicExperienceRecord, "status">,
  settings: ReturnType<typeof readWorkspaceExperienceAccessSettings>,
  respondentUserId: string,
  respondentEmail: string
) {
  if (experience.status !== "Active") {
    throw new Error("This experience is not currently active.");
  }

  const now = Date.now();
  if (settings.startsAt) {
    const startsAt = new Date(settings.startsAt).getTime();
    if (Number.isFinite(startsAt) && now < startsAt) {
      throw new Error("This experience is not available yet.");
    }
  }
  if (settings.endsAt) {
    const endsAt = new Date(settings.endsAt).getTime();
    if (Number.isFinite(endsAt) && now > endsAt) {
      throw new Error("This experience is no longer available.");
    }
  }

  if (settings.accessMode === "private") {
    const normalizedRespondentEmail = normalizeEmailAddress(respondentEmail);
    if (
      !normalizedRespondentEmail ||
      !settings.allowedEmails.includes(normalizedRespondentEmail)
    ) {
      throw new Error("This private experience is only available to selected email accounts.");
    }
  }

  const availableEntries = readAvailableEntryBalance(db, respondentUserId);
  if (availableEntries < 1) {
    throw new Error("This experience requires at least one available entry.");
  }
}

function resolveAnswersToGrade(
  conversation: NavaiPublicExperienceConversationRecord,
  experience: {
    experienceName: string;
    questions: NavaiPanelEvaluationQuestionRecord[];
  },
  options: { forceAll: boolean }
) {
  const questionsById = new Map(experience.questions.map((question) => [question.id, question]));

  return conversation.answers
    .map((answer) => {
      const question = questionsById.get(answer.questionId);
      if (!options.forceAll && !question?.allowAiGrading) {
        return null;
      }
      if (!options.forceAll && answer.aiScore >= 1 && answer.aiScoredAt) {
        return null;
      }
      if (!normalizeString(answer.answerText)) {
        return null;
      }

      return {
        questionId: answer.questionId,
        questionText: answer.questionText || question?.question || "",
        expectedAnswer: question?.expectedAnswer ?? "",
        answerText: answer.answerText,
      };
    })
    .filter(
      (
        item
      ): item is {
        questionId: string;
        questionText: string;
        expectedAnswer: string;
        answerText: string;
      } => Boolean(item)
    );
}

function persistConversationAnswerGrades(
  db: SqlJsDatabase,
  conversationId: string,
  grades: Array<{
    questionId: string;
    score: number;
    feedback: string;
    scoredAt: string;
  }>
) {
  for (const grade of grades) {
    db.run(
      `
        UPDATE navai_public_experience_conversation_answers
        SET ai_score = ?, ai_feedback = ?, ai_scored_at = ?, updated_at = updated_at
        WHERE conversation_id = ? AND question_id = ?
      `,
      [grade.score, grade.feedback, grade.scoredAt, conversationId, grade.questionId]
    );
  }
}

async function createWorkspaceSqliteState(): Promise<NavaiPanelWorkspaceSqliteState> {
  const projectRoot = resolveProjectRoot();
  const filePath = await resolveWorkspaceSqliteFilePath();
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(projectRoot, "node_modules", "sql.js", "dist", file),
  });

  let db: SqlJsDatabase;
  try {
    const fileBuffer = await fs.readFile(filePath);
    db = new SQL.Database(new Uint8Array(fileBuffer));
  } catch {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS navai_workspace_experiences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      domain_id TEXT NOT NULL DEFAULT '',
      agent_id TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Draft',
      access_mode TEXT NOT NULL DEFAULT 'public',
      allowed_emails_json TEXT NOT NULL DEFAULT '[]',
      allow_plus_users INTEGER NOT NULL DEFAULT 1,
      allow_non_plus_users INTEGER NOT NULL DEFAULT 1,
      starts_at TEXT NOT NULL DEFAULT '',
      ends_at TEXT NOT NULL DEFAULT '',
      delegate_ai_grading INTEGER NOT NULL DEFAULT 0,
      enable_ranking INTEGER NOT NULL DEFAULT 0,
      enable_comments INTEGER NOT NULL DEFAULT 0,
      reward_type TEXT NOT NULL DEFAULT 'money',
      reward_title TEXT NOT NULL DEFAULT '',
      reward_description TEXT NOT NULL DEFAULT '',
      reward_delivery_method TEXT NOT NULL DEFAULT 'manual_coordination',
      reward_delivery_details TEXT NOT NULL DEFAULT '',
      reward_payment_methods_json TEXT NOT NULL DEFAULT '[]',
      reward_winner_count INTEGER NOT NULL DEFAULT 1,
      reward_points INTEGER NOT NULL DEFAULT 0,
      reward_usd_amount REAL NOT NULL DEFAULT 0,
      daily_attempt_limit INTEGER NOT NULL DEFAULT 1,
      questions_json TEXT NOT NULL DEFAULT '[]',
      welcome_title TEXT NOT NULL DEFAULT '',
      welcome_body TEXT NOT NULL DEFAULT '',
      auto_start_conversation INTEGER NOT NULL DEFAULT 0,
      enable_entry_modal INTEGER NOT NULL DEFAULT 1,
      enable_hcaptcha INTEGER NOT NULL DEFAULT 1,
      system_prompt TEXT NOT NULL DEFAULT '',
      launches_count INTEGER NOT NULL DEFAULT 0,
      conversations_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_workspace_agent_settings (
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      agent_model TEXT NOT NULL DEFAULT '',
      agent_voice TEXT NOT NULL DEFAULT '',
      agent_language TEXT NOT NULL DEFAULT '',
      agent_voice_accent TEXT NOT NULL DEFAULT '',
      agent_voice_tone TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, kind)
    );

    CREATE TABLE IF NOT EXISTS navai_workspace_agents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      agent_model TEXT NOT NULL DEFAULT '',
      agent_voice TEXT NOT NULL DEFAULT '',
      agent_language TEXT NOT NULL DEFAULT '',
      agent_voice_accent TEXT NOT NULL DEFAULT '',
      agent_voice_tone TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      requester_email TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'Web',
      category TEXT NOT NULL DEFAULT 'General',
      priority TEXT NOT NULL DEFAULT 'Medium',
      status TEXT NOT NULL DEFAULT 'Open',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_support_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      author TEXT NOT NULL,
      author_role TEXT NOT NULL DEFAULT 'customer',
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_support_message_attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'image',
      asset_id TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL,
      file_name TEXT NOT NULL DEFAULT '',
      content_type TEXT NOT NULL DEFAULT '',
      size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_public_experience_conversations (
      id TEXT PRIMARY KEY,
      experience_id TEXT NOT NULL,
      experience_kind TEXT NOT NULL,
      experience_slug TEXT NOT NULL,
      respondent_user_id TEXT NOT NULL,
      respondent_email TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Open',
      started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      ended_at TEXT NOT NULL DEFAULT '',
      total_questions_count INTEGER NOT NULL DEFAULT 0,
      answered_questions_count INTEGER NOT NULL DEFAULT 0,
      audio_storage_path TEXT NOT NULL DEFAULT '',
      audio_download_url TEXT NOT NULL DEFAULT '',
      audio_content_type TEXT NOT NULL DEFAULT '',
      audio_size_bytes INTEGER NOT NULL DEFAULT 0,
      audio_duration_ms INTEGER NOT NULL DEFAULT 0,
      video_storage_path TEXT NOT NULL DEFAULT '',
      video_download_url TEXT NOT NULL DEFAULT '',
      video_content_type TEXT NOT NULL DEFAULT '',
      video_size_bytes INTEGER NOT NULL DEFAULT 0,
      video_duration_ms INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS navai_public_experience_conversation_turns (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      client_turn_id TEXT NOT NULL,
      role TEXT NOT NULL,
      transcript TEXT NOT NULL,
      source_event_type TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_public_experience_conversation_answers (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      question_text TEXT NOT NULL DEFAULT '',
      answer_text TEXT NOT NULL,
      ai_score INTEGER NOT NULL DEFAULT 0,
      ai_feedback TEXT NOT NULL DEFAULT '',
      ai_scored_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_public_experience_comments (
      id TEXT PRIMARY KEY,
      experience_id TEXT NOT NULL,
      experience_kind TEXT NOT NULL,
      experience_slug TEXT NOT NULL,
      author_user_id TEXT NOT NULL,
      author_email TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL,
      rating INTEGER NOT NULL DEFAULT 5,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_user_profiles (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL DEFAULT '',
      account_status TEXT NOT NULL DEFAULT 'active',
      deletion_requested_at TEXT NOT NULL DEFAULT '',
      scheduled_deletion_at TEXT NOT NULL DEFAULT '',
      deactivated_at TEXT NOT NULL DEFAULT '',
      display_name TEXT NOT NULL DEFAULT '',
      photo_url TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      professional_headline TEXT NOT NULL DEFAULT '',
      job_title TEXT NOT NULL DEFAULT '',
      company TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      website_url TEXT NOT NULL DEFAULT '',
      linkedin_url TEXT NOT NULL DEFAULT '',
      github_url TEXT NOT NULL DEFAULT '',
      x_url TEXT NOT NULL DEFAULT '',
      instagram_url TEXT NOT NULL DEFAULT '',
      facebook_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_user_verifications (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'not_submitted',
      full_name TEXT NOT NULL DEFAULT '',
      document_type TEXT NOT NULL DEFAULT 'citizenship_card',
      document_number TEXT NOT NULL DEFAULT '',
      document_country TEXT NOT NULL DEFAULT '',
      selfie_image_id TEXT NOT NULL DEFAULT '',
      selfie_image_url TEXT NOT NULL DEFAULT '',
      document_front_image_id TEXT NOT NULL DEFAULT '',
      document_front_image_url TEXT NOT NULL DEFAULT '',
      document_back_image_id TEXT NOT NULL DEFAULT '',
      document_back_image_url TEXT NOT NULL DEFAULT '',
      response_message TEXT NOT NULL DEFAULT '',
      submitted_at TEXT NOT NULL DEFAULT '',
      reviewed_at TEXT NOT NULL DEFAULT '',
      reviewed_by_user_id TEXT NOT NULL DEFAULT '',
      reviewed_by_email TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_exchange_rates (
      key TEXT PRIMARY KEY,
      rate REAL NOT NULL DEFAULT 0,
      source_date TEXT NOT NULL DEFAULT '',
      fetched_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_plus_memberships (
      user_id TEXT PRIMARY KEY,
      plan TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL DEFAULT 'wompi',
      status TEXT NOT NULL DEFAULT 'inactive',
      current_period_end TEXT NOT NULL DEFAULT '',
      last_order_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_entry_packages (
      key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      entries_count INTEGER NOT NULL DEFAULT 1,
      price_usd REAL NOT NULL DEFAULT 0,
      vat_percentage REAL NOT NULL DEFAULT 19,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_plus_orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL DEFAULT '',
      plan TEXT NOT NULL DEFAULT 'PLUS',
      product_name TEXT NOT NULL DEFAULT '',
      package_key TEXT NOT NULL DEFAULT '',
      entries_count INTEGER NOT NULL DEFAULT 1,
      unit_price_usd REAL NOT NULL DEFAULT 0,
      vat_percentage REAL NOT NULL DEFAULT 19,
      environment TEXT NOT NULL DEFAULT 'sandbox',
      currency TEXT NOT NULL DEFAULT 'COP',
      amount_cents INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'created',
      checkout_url TEXT NOT NULL DEFAULT '',
      wompi_link_id TEXT NOT NULL DEFAULT '',
      referral_code TEXT NOT NULL DEFAULT '',
      referrer_user_id TEXT NOT NULL DEFAULT '',
      wompi_transaction_id TEXT NOT NULL DEFAULT '',
      wompi_status TEXT NOT NULL DEFAULT '',
      wompi_reference TEXT NOT NULL DEFAULT '',
      wompi_email TEXT NOT NULL DEFAULT '',
      confirmed_at TEXT NOT NULL DEFAULT '',
      activated_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_plus_activations (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'PLUS',
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_wompi_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL DEFAULT '',
      signature TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_referral_codes (
      user_id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_referrals (
      id TEXT PRIMARY KEY,
      referrer_user_id TEXT NOT NULL,
      referrer_code TEXT NOT NULL,
      referred_user_id TEXT NOT NULL,
      referred_email TEXT NOT NULL DEFAULT '',
      source_order_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      reward_credits INTEGER NOT NULL DEFAULT 0,
      reward_applied_at TEXT NOT NULL DEFAULT '',
      rejection_reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_referral_credit_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      referral_id TEXT NOT NULL DEFAULT '',
      order_id TEXT NOT NULL DEFAULT '',
      experience_id TEXT NOT NULL DEFAULT '',
      experience_kind TEXT NOT NULL DEFAULT '',
      experience_slug TEXT NOT NULL DEFAULT '',
      conversation_id TEXT NOT NULL DEFAULT '',
      related_user_id TEXT NOT NULL DEFAULT '',
      related_user_email TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '',
      delta_credits INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_entry_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      order_id TEXT NOT NULL DEFAULT '',
      experience_id TEXT NOT NULL DEFAULT '',
      experience_kind TEXT NOT NULL DEFAULT '',
      experience_slug TEXT NOT NULL DEFAULT '',
      conversation_id TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '',
      delta_entries INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_points_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      experience_id TEXT NOT NULL DEFAULT '',
      experience_kind TEXT NOT NULL DEFAULT '',
      experience_slug TEXT NOT NULL DEFAULT '',
      related_cashout_id TEXT NOT NULL DEFAULT '',
      related_distribution_id TEXT NOT NULL DEFAULT '',
      related_user_id TEXT NOT NULL DEFAULT '',
      related_user_email TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '',
      delta_points INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_points_cashout_payment_settings (
      user_id TEXT PRIMARY KEY,
      payment_method TEXT NOT NULL DEFAULT 'nequi',
      account_holder TEXT NOT NULL DEFAULT '',
      account_reference TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_points_cashout_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      requested_points INTEGER NOT NULL DEFAULT 0,
      requested_amount_cop INTEGER NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'nequi',
      account_holder TEXT NOT NULL DEFAULT '',
      account_reference TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      response_message TEXT NOT NULL DEFAULT '',
      processed_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_experience_reward_distributions (
      id TEXT PRIMARY KEY,
      experience_id TEXT NOT NULL,
      experience_kind TEXT NOT NULL,
      experience_slug TEXT NOT NULL DEFAULT '',
      winner_user_id TEXT NOT NULL,
      winner_email TEXT NOT NULL DEFAULT '',
      winner_rank INTEGER NOT NULL DEFAULT 0,
      awarded_points INTEGER NOT NULL DEFAULT 0,
      awarded_amount_cop INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  const workspaceTableInfo = readStatementRows(db, "PRAGMA table_info(navai_workspace_experiences)");
  const workspaceColumns = new Set(workspaceTableInfo.map((column) => String(column.name ?? "")));
  const hasQuestionsColumn = workspaceColumns.has("questions_json");
  if (!hasQuestionsColumn) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN questions_json TEXT NOT NULL DEFAULT '[]'"
    );
  }
  if (!workspaceColumns.has("agent_id")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN agent_id TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!workspaceColumns.has("auto_start_conversation")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN auto_start_conversation INTEGER NOT NULL DEFAULT 0"
    );
  }
  if (!workspaceColumns.has("access_mode")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN access_mode TEXT NOT NULL DEFAULT 'public'"
    );
  }
  if (!workspaceColumns.has("allowed_emails_json")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN allowed_emails_json TEXT NOT NULL DEFAULT '[]'"
    );
  }
  if (!workspaceColumns.has("allow_plus_users")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN allow_plus_users INTEGER NOT NULL DEFAULT 1"
    );
  }
  if (!workspaceColumns.has("allow_non_plus_users")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN allow_non_plus_users INTEGER NOT NULL DEFAULT 1"
    );
  }
  if (!workspaceColumns.has("starts_at")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN starts_at TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!workspaceColumns.has("ends_at")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN ends_at TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!workspaceColumns.has("delegate_ai_grading")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN delegate_ai_grading INTEGER NOT NULL DEFAULT 0"
    );
  }
  if (!workspaceColumns.has("enable_ranking")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN enable_ranking INTEGER NOT NULL DEFAULT 0"
    );
  }
  if (!workspaceColumns.has("enable_comments")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN enable_comments INTEGER NOT NULL DEFAULT 0"
    );
  }
  if (!workspaceColumns.has("daily_attempt_limit")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN daily_attempt_limit INTEGER NOT NULL DEFAULT 1"
    );
  }
  if (!workspaceColumns.has("enable_entry_modal")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN enable_entry_modal INTEGER NOT NULL DEFAULT 1"
    );
  }
  if (!workspaceColumns.has("enable_hcaptcha")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN enable_hcaptcha INTEGER NOT NULL DEFAULT 1"
    );
  }
  if (!workspaceColumns.has("reward_points")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN reward_points INTEGER NOT NULL DEFAULT 0"
    );
    if (workspaceColumns.has("reward_usd_amount")) {
      db.run(
        "UPDATE navai_workspace_experiences SET reward_points = CAST(ROUND(COALESCE(reward_usd_amount, 0)) AS INTEGER) WHERE reward_points <= 0 AND reward_usd_amount > 0"
      );
    }
  }
  if (!workspaceColumns.has("reward_usd_amount")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN reward_usd_amount REAL NOT NULL DEFAULT 0"
    );
  }
  if (!workspaceColumns.has("reward_type")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN reward_type TEXT NOT NULL DEFAULT 'money'"
    );
  }
  if (!workspaceColumns.has("reward_title")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN reward_title TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!workspaceColumns.has("reward_description")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN reward_description TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!workspaceColumns.has("reward_delivery_method")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN reward_delivery_method TEXT NOT NULL DEFAULT 'manual_coordination'"
    );
  }
  if (!workspaceColumns.has("reward_delivery_details")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN reward_delivery_details TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!workspaceColumns.has("reward_payment_methods_json")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN reward_payment_methods_json TEXT NOT NULL DEFAULT '[]'"
    );
  }
  if (!workspaceColumns.has("reward_winner_count")) {
    db.run(
      "ALTER TABLE navai_workspace_experiences ADD COLUMN reward_winner_count INTEGER NOT NULL DEFAULT 1"
    );
  }

  const agentSettingsTableInfo = readStatementRows(db, "PRAGMA table_info(navai_workspace_agent_settings)");
  const agentSettingsColumns = new Set(
    agentSettingsTableInfo.map((column) => String(column.name ?? ""))
  );
  if (!agentSettingsColumns.has("name")) {
    db.run(
      "ALTER TABLE navai_workspace_agent_settings ADD COLUMN name TEXT NOT NULL DEFAULT ''"
    );
  }

  const supportTicketTableInfo = readStatementRows(db, "PRAGMA table_info(navai_support_tickets)");
  const hasRequesterEmailColumn = supportTicketTableInfo.some(
    (column) => String(column.name ?? "") === "requester_email"
  );
  if (!hasRequesterEmailColumn) {
    db.run(
      "ALTER TABLE navai_support_tickets ADD COLUMN requester_email TEXT NOT NULL DEFAULT ''"
    );
  }
  const hasCategoryColumn = supportTicketTableInfo.some(
    (column) => String(column.name ?? "") === "category"
  );
  if (!hasCategoryColumn) {
    db.run(
      "ALTER TABLE navai_support_tickets ADD COLUMN category TEXT NOT NULL DEFAULT 'General'"
    );
  }
  const hasPriorityColumn = supportTicketTableInfo.some(
    (column) => String(column.name ?? "") === "priority"
  );
  if (!hasPriorityColumn) {
    db.run(
      "ALTER TABLE navai_support_tickets ADD COLUMN priority TEXT NOT NULL DEFAULT 'Medium'"
    );
  }

  const supportMessageTableInfo = readStatementRows(db, "PRAGMA table_info(navai_support_messages)");
  const hasAuthorRoleColumn = supportMessageTableInfo.some(
    (column) => String(column.name ?? "") === "author_role"
  );
  if (!hasAuthorRoleColumn) {
    db.run(
      "ALTER TABLE navai_support_messages ADD COLUMN author_role TEXT NOT NULL DEFAULT 'customer'"
    );
  }

  const userProfileTableInfo = readStatementRows(db, "PRAGMA table_info(navai_user_profiles)");
  const userProfileColumns = new Set(
    userProfileTableInfo.map((column) => String(column.name ?? ""))
  );
  if (!userProfileColumns.has("account_status")) {
    db.run(
      "ALTER TABLE navai_user_profiles ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'"
    );
  }
  if (!userProfileColumns.has("deletion_requested_at")) {
    db.run(
      "ALTER TABLE navai_user_profiles ADD COLUMN deletion_requested_at TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!userProfileColumns.has("scheduled_deletion_at")) {
    db.run(
      "ALTER TABLE navai_user_profiles ADD COLUMN scheduled_deletion_at TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!userProfileColumns.has("deactivated_at")) {
    db.run(
      "ALTER TABLE navai_user_profiles ADD COLUMN deactivated_at TEXT NOT NULL DEFAULT ''"
    );
  }

  const publicConversationTableInfo = readStatementRows(
    db,
    "PRAGMA table_info(navai_public_experience_conversations)"
  );
  const publicConversationColumns = new Set(
    publicConversationTableInfo.map((column) => String(column.name ?? ""))
  );
  if (!publicConversationColumns.has("audio_storage_path")) {
    db.run(
      "ALTER TABLE navai_public_experience_conversations ADD COLUMN audio_storage_path TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!publicConversationColumns.has("audio_download_url")) {
    db.run(
      "ALTER TABLE navai_public_experience_conversations ADD COLUMN audio_download_url TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!publicConversationColumns.has("audio_content_type")) {
    db.run(
      "ALTER TABLE navai_public_experience_conversations ADD COLUMN audio_content_type TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!publicConversationColumns.has("audio_size_bytes")) {
    db.run(
      "ALTER TABLE navai_public_experience_conversations ADD COLUMN audio_size_bytes INTEGER NOT NULL DEFAULT 0"
    );
  }
  if (!publicConversationColumns.has("audio_duration_ms")) {
    db.run(
      "ALTER TABLE navai_public_experience_conversations ADD COLUMN audio_duration_ms INTEGER NOT NULL DEFAULT 0"
    );
  }
  if (!publicConversationColumns.has("video_storage_path")) {
    db.run(
      "ALTER TABLE navai_public_experience_conversations ADD COLUMN video_storage_path TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!publicConversationColumns.has("video_download_url")) {
    db.run(
      "ALTER TABLE navai_public_experience_conversations ADD COLUMN video_download_url TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!publicConversationColumns.has("video_content_type")) {
    db.run(
      "ALTER TABLE navai_public_experience_conversations ADD COLUMN video_content_type TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!publicConversationColumns.has("video_size_bytes")) {
    db.run(
      "ALTER TABLE navai_public_experience_conversations ADD COLUMN video_size_bytes INTEGER NOT NULL DEFAULT 0"
    );
  }
  if (!publicConversationColumns.has("video_duration_ms")) {
    db.run(
      "ALTER TABLE navai_public_experience_conversations ADD COLUMN video_duration_ms INTEGER NOT NULL DEFAULT 0"
    );
  }

  const publicConversationAnswerTableInfo = readStatementRows(
    db,
    "PRAGMA table_info(navai_public_experience_conversation_answers)"
  );
  const publicConversationAnswerColumns = new Set(
    publicConversationAnswerTableInfo.map((column) => String(column.name ?? ""))
  );
  if (!publicConversationAnswerColumns.has("ai_score")) {
    db.run(
      "ALTER TABLE navai_public_experience_conversation_answers ADD COLUMN ai_score INTEGER NOT NULL DEFAULT 0"
    );
  }
  if (!publicConversationAnswerColumns.has("ai_feedback")) {
    db.run(
      "ALTER TABLE navai_public_experience_conversation_answers ADD COLUMN ai_feedback TEXT NOT NULL DEFAULT ''"
    );
  }
  if (!publicConversationAnswerColumns.has("ai_scored_at")) {
    db.run(
      "ALTER TABLE navai_public_experience_conversation_answers ADD COLUMN ai_scored_at TEXT NOT NULL DEFAULT ''"
    );
  }

  const publicCommentsTableInfo = readStatementRows(
    db,
    "PRAGMA table_info(navai_public_experience_comments)"
  );
  const publicCommentsColumns = new Set(
    publicCommentsTableInfo.map((column) => String(column.name ?? ""))
  );
  if (!publicCommentsColumns.has("rating")) {
    db.run(
      "ALTER TABLE navai_public_experience_comments ADD COLUMN rating INTEGER NOT NULL DEFAULT 5"
    );
  }

  const duplicateCommentRows = readStatementRows(
    db,
    `
      SELECT
        id,
        experience_id,
        author_user_id
      FROM navai_public_experience_comments
      ORDER BY experience_id ASC, author_user_id ASC, updated_at DESC, created_at DESC, id DESC
    `
  );
  const seenExperienceAuthorPairs = new Set<string>();
  for (const row of duplicateCommentRows) {
    const pairKey = `${String(row.experience_id ?? "")}:${String(row.author_user_id ?? "")}`;
    const commentId = String(row.id ?? "");
    if (!pairKey || !commentId) {
      continue;
    }
    if (seenExperienceAuthorPairs.has(pairKey)) {
      db.run("DELETE FROM navai_public_experience_comments WHERE id = ?", [commentId]);
      continue;
    }
    seenExperienceAuthorPairs.add(pairKey);
  }

  const plusOrdersTableInfo = readStatementRows(db, "PRAGMA table_info(navai_plus_orders)");
  const plusOrdersColumns = new Set(
    plusOrdersTableInfo.map((column) => String(column.name ?? ""))
  );
  if (!plusOrdersColumns.has("product_name")) {
    db.run("ALTER TABLE navai_plus_orders ADD COLUMN product_name TEXT NOT NULL DEFAULT ''");
  }
  if (!plusOrdersColumns.has("package_key")) {
    db.run("ALTER TABLE navai_plus_orders ADD COLUMN package_key TEXT NOT NULL DEFAULT ''");
  }
  if (!plusOrdersColumns.has("entries_count")) {
    db.run("ALTER TABLE navai_plus_orders ADD COLUMN entries_count INTEGER NOT NULL DEFAULT 1");
  }
  if (!plusOrdersColumns.has("unit_price_usd")) {
    db.run("ALTER TABLE navai_plus_orders ADD COLUMN unit_price_usd REAL NOT NULL DEFAULT 0");
  }
  if (!plusOrdersColumns.has("vat_percentage")) {
    db.run("ALTER TABLE navai_plus_orders ADD COLUMN vat_percentage REAL NOT NULL DEFAULT 19");
  }
  if (!plusOrdersColumns.has("referral_code")) {
    db.run("ALTER TABLE navai_plus_orders ADD COLUMN referral_code TEXT NOT NULL DEFAULT ''");
  }
  if (!plusOrdersColumns.has("referrer_user_id")) {
    db.run("ALTER TABLE navai_plus_orders ADD COLUMN referrer_user_id TEXT NOT NULL DEFAULT ''");
  }
  db.run(
    `
      UPDATE navai_plus_orders
      SET
        product_name = CASE
          WHEN product_name = '' THEN ?
          ELSE product_name
        END,
        package_key = CASE
          WHEN package_key = '' THEN ?
          ELSE package_key
        END,
        entries_count = CASE
          WHEN entries_count <= 0 THEN 1
          ELSE entries_count
        END,
        unit_price_usd = CASE
          WHEN unit_price_usd <= 0 AND amount_cents > 0
            THEN ROUND((amount_cents / 100.0) / ?, 4)
          WHEN unit_price_usd <= 0
            THEN ?
          ELSE unit_price_usd
        END,
        vat_percentage = CASE
          WHEN vat_percentage < 0 THEN 0
          ELSE vat_percentage
        END
    `,
    [
      NAVAI_ENTRY_PRODUCT_NAME,
      NAVAI_DEFAULT_ENTRY_PACKAGE_KEY,
      NAVAI_DEFAULT_USD_COP_RATE,
      NAVAI_DEFAULT_ENTRY_PACKAGE_PRICE_USD,
    ]
  );

  const now = new Date().toISOString();
  db.run(
    `
      INSERT INTO navai_entry_packages (
        key,
        name,
        description,
        entries_count,
        price_usd,
        vat_percentage,
        is_active,
        sort_order,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(key) DO NOTHING
    `,
    [
      NAVAI_DEFAULT_ENTRY_PACKAGE_KEY,
      NAVAI_ENTRY_PRODUCT_NAME,
      "",
      NAVAI_DEFAULT_ENTRY_PACKAGE_ENTRIES,
      NAVAI_DEFAULT_ENTRY_PACKAGE_PRICE_USD,
      NAVAI_DEFAULT_ENTRY_PACKAGE_VAT_PERCENTAGE,
      1,
      0,
      now,
      now,
    ]
  );

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_navai_workspace_experiences_user_kind
      ON navai_workspace_experiences(user_id, kind);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_navai_workspace_experiences_kind_slug
      ON navai_workspace_experiences(kind, slug);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_navai_workspace_agent_settings_user_kind
      ON navai_workspace_agent_settings(user_id, kind);
    CREATE INDEX IF NOT EXISTS idx_navai_workspace_agents_user_kind
      ON navai_workspace_agents(user_id, kind);
    CREATE INDEX IF NOT EXISTS idx_navai_support_tickets_user_id
      ON navai_support_tickets(user_id);
    CREATE INDEX IF NOT EXISTS idx_navai_support_messages_ticket_id
      ON navai_support_messages(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_navai_support_message_attachments_message_id
      ON navai_support_message_attachments(message_id);
    CREATE INDEX IF NOT EXISTS idx_navai_public_experience_conversations_experience_user
      ON navai_public_experience_conversations(experience_id, respondent_user_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_navai_public_experience_conversation_turns_conversation_id
      ON navai_public_experience_conversation_turns(conversation_id, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_navai_public_experience_conversation_turns_client_turn
      ON navai_public_experience_conversation_turns(conversation_id, client_turn_id);
    CREATE INDEX IF NOT EXISTS idx_navai_public_experience_conversation_answers_conversation_id
      ON navai_public_experience_conversation_answers(conversation_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_navai_public_experience_conversation_answers_question_id
      ON navai_public_experience_conversation_answers(question_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_navai_public_experience_comments_experience_id
      ON navai_public_experience_comments(experience_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_navai_public_experience_comments_author_user_id
      ON navai_public_experience_comments(author_user_id, updated_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_navai_public_experience_comments_experience_author
      ON navai_public_experience_comments(experience_id, author_user_id);
    CREATE INDEX IF NOT EXISTS idx_navai_user_profiles_email
      ON navai_user_profiles(email);
    CREATE INDEX IF NOT EXISTS idx_navai_user_profiles_account_status
      ON navai_user_profiles(account_status, scheduled_deletion_at ASC, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_navai_user_verifications_status_submitted
      ON navai_user_verifications(status, submitted_at ASC);
    CREATE INDEX IF NOT EXISTS idx_navai_user_verifications_reviewed_at
      ON navai_user_verifications(reviewed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_navai_entry_packages_active_sort
      ON navai_entry_packages(is_active, sort_order ASC, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_navai_exchange_rates_source_date
      ON navai_exchange_rates(source_date DESC, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_navai_plus_orders_user_created
      ON navai_plus_orders(user_id, created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_navai_plus_orders_wompi_tx
      ON navai_plus_orders(wompi_transaction_id)
      WHERE wompi_transaction_id <> '';
    CREATE INDEX IF NOT EXISTS idx_navai_plus_orders_email_created
      ON navai_plus_orders(wompi_email, created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_navai_plus_activations_order_id
      ON navai_plus_activations(order_id);
    CREATE INDEX IF NOT EXISTS idx_navai_plus_activations_user_period_end
      ON navai_plus_activations(user_id, period_end DESC);
    CREATE INDEX IF NOT EXISTS idx_navai_wompi_events_created_at
      ON navai_wompi_events(created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_navai_referral_codes_code
      ON navai_referral_codes(code);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_navai_referrals_referred_user_id
      ON navai_referrals(referred_user_id);
    CREATE INDEX IF NOT EXISTS idx_navai_referrals_referrer_user_created
      ON navai_referrals(referrer_user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_navai_referrals_source_order_id
      ON navai_referrals(source_order_id);
    CREATE INDEX IF NOT EXISTS idx_navai_referral_credit_ledger_user_created
      ON navai_referral_credit_ledger(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_navai_referral_credit_ledger_referral_id
      ON navai_referral_credit_ledger(referral_id);
    CREATE INDEX IF NOT EXISTS idx_navai_entry_ledger_user_created
      ON navai_entry_ledger(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_navai_entry_ledger_order_id
      ON navai_entry_ledger(order_id);
    CREATE INDEX IF NOT EXISTS idx_navai_points_ledger_user_created
      ON navai_points_ledger(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_navai_points_ledger_experience
      ON navai_points_ledger(experience_id, experience_kind, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_navai_points_cashout_requests_user_created
      ON navai_points_cashout_requests(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_navai_points_cashout_requests_status_created
      ON navai_points_cashout_requests(status, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_navai_experience_reward_distributions_experience
      ON navai_experience_reward_distributions(experience_id, winner_rank ASC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_navai_experience_reward_distributions_unique_winner
      ON navai_experience_reward_distributions(experience_id, winner_user_id);
  `);

  return { db, filePath };
}

async function getWorkspaceSqliteState() {
  if (!sqliteStatePromise) {
    sqliteStatePromise = createWorkspaceSqliteState().catch((error) => {
      sqliteStatePromise = null;
      throw error;
    });
  }

  return sqliteStatePromise;
}

async function persistWorkspaceSqlite(state: NavaiPanelWorkspaceSqliteState) {
  await fs.mkdir(path.dirname(state.filePath), { recursive: true });
  const exported = state.db.export();
  await fs.writeFile(state.filePath, Buffer.from(exported));
}

async function runSerializedMutation<T>(mutation: (db: SqlJsDatabase) => T | Promise<T>) {
  const state = await getWorkspaceSqliteState();
  let result!: T;

  const nextMutation = sqliteMutationQueue.then(async () => {
    result = await mutation(state.db);
    await persistWorkspaceSqlite(state);
  });

  sqliteMutationQueue = nextMutation.catch(() => undefined);
  await nextMutation;
  return result;
}

async function listWorkspaceExperiences(
  userId: string,
  kind: NavaiPanelExperienceKind
) {
  const normalizedUserId = validateUserId(userId);
  const [state, domains, agents] = await Promise.all([
    getWorkspaceSqliteState(),
    listNavaiPanelDomains(normalizedUserId),
    listWorkspaceAgents(normalizedUserId, kind),
  ]);
  const domainById = new Map(domains.map((item) => [item.id, item]));
  const agentById = new Map(agents.map((item) => [item.id, item]));
  const rows = readStatementRows(
    state.db,
    `
      SELECT
        id,
        user_id,
        kind,
        domain_id,
        agent_id,
        name,
        slug,
        description,
        status,
        access_mode,
        allowed_emails_json,
        allow_plus_users,
        allow_non_plus_users,
        starts_at,
        ends_at,
        delegate_ai_grading,
        enable_ranking,
        enable_comments,
        reward_type,
        reward_title,
        reward_description,
        reward_delivery_method,
        reward_delivery_details,
        reward_payment_methods_json,
        reward_winner_count,
        reward_points,
        reward_usd_amount,
        daily_attempt_limit,
        questions_json,
        welcome_title,
        welcome_body,
        auto_start_conversation,
        enable_entry_modal,
        enable_hcaptcha,
        system_prompt,
        launches_count,
        conversations_count,
        created_at,
        updated_at
      FROM navai_workspace_experiences
      WHERE user_id = ? AND kind = ?
      ORDER BY updated_at DESC, created_at DESC
    `,
    [normalizedUserId, kind]
  );

  return rows.map((row) => mapExperienceRow(row, domainById, agentById));
}

async function getWorkspaceExperienceById(
  userId: string,
  kind: NavaiPanelExperienceKind,
  id: string
) {
  const normalizedUserId = validateUserId(userId);
  const normalizedId = normalizeString(id);
  if (!normalizedId) {
    return null;
  }

  const [state, domains, agents] = await Promise.all([
    getWorkspaceSqliteState(),
    listNavaiPanelDomains(normalizedUserId),
    listWorkspaceAgents(normalizedUserId, kind),
  ]);
  const domainById = new Map(domains.map((item) => [item.id, item]));
  const agentById = new Map(agents.map((item) => [item.id, item]));
  const row = readFirstRow(
    state.db,
    `
      SELECT
        id,
        user_id,
        kind,
        domain_id,
        agent_id,
        name,
        slug,
        description,
        status,
        access_mode,
        allowed_emails_json,
        allow_plus_users,
        allow_non_plus_users,
        starts_at,
        ends_at,
        delegate_ai_grading,
        enable_ranking,
        enable_comments,
        reward_type,
        reward_title,
        reward_description,
        reward_delivery_method,
        reward_delivery_details,
        reward_payment_methods_json,
        reward_winner_count,
        reward_points,
        reward_usd_amount,
        daily_attempt_limit,
        questions_json,
        welcome_title,
        welcome_body,
        auto_start_conversation,
        enable_entry_modal,
        enable_hcaptcha,
        system_prompt,
        launches_count,
        conversations_count,
        created_at,
        updated_at
      FROM navai_workspace_experiences
      WHERE user_id = ? AND kind = ? AND id = ?
    `,
    [normalizedUserId, kind, normalizedId]
  );

  return row ? mapExperienceRow(row, domainById, agentById) : null;
}

async function createWorkspaceExperience(
  userId: string,
  kind: NavaiPanelExperienceKind,
  input: NavaiPanelExperienceInput
) {
  const normalizedUserId = validateUserId(userId);
  const normalizedInput = validateExperienceInput(input);

  if (normalizedInput.domainId) {
    const domain = await getNavaiPanelDomainById(normalizedUserId, normalizedInput.domainId);
    if (!domain) {
      throw new Error("Domain not found.");
    }
  }
  if (normalizedInput.agentId) {
    const agent = await getWorkspaceAgentById(normalizedUserId, kind, normalizedInput.agentId);
    if (!agent) {
      throw new Error("Agent not found.");
    }
  }
  if (normalizedInput.agentId) {
    const agent = await getWorkspaceAgentById(normalizedUserId, kind, normalizedInput.agentId);
    if (!agent) {
      throw new Error("Agent not found.");
    }
  }

  return runSerializedMutation(async (db) => {
    const publicCode = generateUniquePublicCode(db);

    const now = new Date().toISOString();
    const id = randomUUID();
    db.run(
      `
        INSERT INTO navai_workspace_experiences (
          id,
          user_id,
          kind,
          domain_id,
          agent_id,
          name,
          slug,
          description,
          status,
          access_mode,
          allowed_emails_json,
          allow_plus_users,
          allow_non_plus_users,
          starts_at,
          ends_at,
          delegate_ai_grading,
          enable_ranking,
          enable_comments,
          reward_type,
          reward_title,
          reward_description,
          reward_delivery_method,
          reward_delivery_details,
          reward_payment_methods_json,
          reward_winner_count,
          reward_points,
          reward_usd_amount,
          daily_attempt_limit,
          questions_json,
          welcome_title,
          welcome_body,
          auto_start_conversation,
          enable_entry_modal,
          enable_hcaptcha,
          system_prompt,
          launches_count,
          conversations_count,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        normalizedUserId,
        kind,
        normalizedInput.domainId,
        normalizedInput.agentId,
        normalizedInput.name,
        publicCode,
        normalizedInput.description,
        normalizedInput.status,
        normalizedInput.accessMode,
        JSON.stringify(normalizedInput.allowedEmails),
        normalizedInput.allowPlusUsers ? 1 : 0,
        normalizedInput.allowNonPlusUsers ? 1 : 0,
        normalizedInput.startsAt,
        normalizedInput.endsAt,
        normalizedInput.delegateAiGrading ? 1 : 0,
        normalizedInput.enableRanking ? 1 : 0,
        normalizedInput.enableComments ? 1 : 0,
        normalizedInput.rewardType,
        normalizedInput.rewardTitle,
        normalizedInput.rewardDescription,
        normalizedInput.rewardDeliveryMethod,
        normalizedInput.rewardDeliveryDetails,
        JSON.stringify(normalizedInput.rewardPaymentMethods),
        normalizedInput.rewardWinnerCount,
        normalizedInput.rewardPoints,
        normalizedInput.rewardPoints,
        normalizedInput.dailyAttemptLimit,
        JSON.stringify(normalizedInput.questions),
        normalizedInput.welcomeTitle,
        normalizedInput.welcomeBody,
        normalizedInput.autoStartConversation ? 1 : 0,
        normalizedInput.enableEntryModal ? 1 : 0,
        normalizedInput.enableHCaptcha ? 1 : 0,
        normalizedInput.systemPrompt,
        0,
        0,
        now,
        now,
      ]
    );

    const created = await getWorkspaceExperienceById(normalizedUserId, kind, id);
    if (!created) {
      throw new Error("Experience was created but could not be loaded.");
    }
    return created;
  });
}

async function updateWorkspaceExperience(
  userId: string,
  kind: NavaiPanelExperienceKind,
  id: string,
  input: NavaiPanelExperienceInput
) {
  const normalizedUserId = validateUserId(userId);
  const normalizedId = normalizeString(id);
  if (!normalizedId) {
    throw new Error("Experience id is required.");
  }

  const normalizedInput = validateExperienceInput(input);
  if (normalizedInput.domainId) {
    const domain = await getNavaiPanelDomainById(normalizedUserId, normalizedInput.domainId);
    if (!domain) {
      throw new Error("Domain not found.");
    }
  }

  return runSerializedMutation(async (db) => {
    const existing = readFirstRow(
      db,
      "SELECT id, slug FROM navai_workspace_experiences WHERE user_id = ? AND kind = ? AND id = ?",
      [normalizedUserId, kind, normalizedId]
    );
    if (!existing) {
      throw new Error("Experience not found.");
    }

    if (normalizedInput.slug && doesPublicCodeExist(db, normalizedInput.slug, normalizedId)) {
      throw new Error("A public URL with that slug already exists.");
    }

    db.run(
      `
        UPDATE navai_workspace_experiences
        SET
          domain_id = ?,
          agent_id = ?,
          name = ?,
          slug = ?,
          description = ?,
          status = ?,
          access_mode = ?,
          allowed_emails_json = ?,
          allow_plus_users = ?,
          allow_non_plus_users = ?,
          starts_at = ?,
          ends_at = ?,
          delegate_ai_grading = ?,
          enable_ranking = ?,
          enable_comments = ?,
          reward_type = ?,
          reward_title = ?,
          reward_description = ?,
          reward_delivery_method = ?,
          reward_delivery_details = ?,
          reward_payment_methods_json = ?,
          reward_winner_count = ?,
          reward_points = ?,
          reward_usd_amount = ?,
          daily_attempt_limit = ?,
          questions_json = ?,
          welcome_title = ?,
          welcome_body = ?,
          auto_start_conversation = ?,
          enable_entry_modal = ?,
          enable_hcaptcha = ?,
          system_prompt = ?,
          updated_at = ?
        WHERE user_id = ? AND kind = ? AND id = ?
      `,
      [
        normalizedInput.domainId,
        normalizedInput.agentId,
        normalizedInput.name,
        normalizedInput.slug || String(existing.slug ?? ""),
        normalizedInput.description,
        normalizedInput.status,
        normalizedInput.accessMode,
        JSON.stringify(normalizedInput.allowedEmails),
        normalizedInput.allowPlusUsers ? 1 : 0,
        normalizedInput.allowNonPlusUsers ? 1 : 0,
        normalizedInput.startsAt,
        normalizedInput.endsAt,
        normalizedInput.delegateAiGrading ? 1 : 0,
        normalizedInput.enableRanking ? 1 : 0,
        normalizedInput.enableComments ? 1 : 0,
        normalizedInput.rewardType,
        normalizedInput.rewardTitle,
        normalizedInput.rewardDescription,
        normalizedInput.rewardDeliveryMethod,
        normalizedInput.rewardDeliveryDetails,
        JSON.stringify(normalizedInput.rewardPaymentMethods),
        normalizedInput.rewardWinnerCount,
        normalizedInput.rewardPoints,
        normalizedInput.rewardPoints,
        normalizedInput.dailyAttemptLimit,
        JSON.stringify(normalizedInput.questions),
        normalizedInput.welcomeTitle,
        normalizedInput.welcomeBody,
        normalizedInput.autoStartConversation ? 1 : 0,
        normalizedInput.enableEntryModal ? 1 : 0,
        normalizedInput.enableHCaptcha ? 1 : 0,
        normalizedInput.systemPrompt,
        new Date().toISOString(),
        normalizedUserId,
        kind,
        normalizedId,
      ]
    );

    const updated = await getWorkspaceExperienceById(normalizedUserId, kind, normalizedId);
    if (!updated) {
      throw new Error("Experience was updated but could not be loaded.");
    }
    return updated;
  });
}

function deleteWorkspaceExperienceRelatedData(
  db: SqlJsDatabase,
  kind: NavaiPanelExperienceKind,
  experienceId: string
) {
  db.run(
    `
      DELETE FROM navai_public_experience_conversation_answers
      WHERE conversation_id IN (
        SELECT id
        FROM navai_public_experience_conversations
        WHERE experience_id = ? AND experience_kind = ?
      )
    `,
    [experienceId, kind]
  );
  db.run(
    `
      DELETE FROM navai_public_experience_conversation_turns
      WHERE conversation_id IN (
        SELECT id
        FROM navai_public_experience_conversations
        WHERE experience_id = ? AND experience_kind = ?
      )
    `,
    [experienceId, kind]
  );
  db.run(
    "DELETE FROM navai_public_experience_comments WHERE experience_id = ? AND experience_kind = ?",
    [experienceId, kind]
  );
  db.run(
    "DELETE FROM navai_public_experience_conversations WHERE experience_id = ? AND experience_kind = ?",
    [experienceId, kind]
  );
}

async function deleteWorkspaceExperience(
  userId: string,
  kind: NavaiPanelExperienceKind,
  id: string
) {
  const normalizedUserId = validateUserId(userId);
  const normalizedId = normalizeString(id);
  if (!normalizedId) {
    throw new Error("Experience id is required.");
  }

  return runSerializedMutation((db) => {
    const existing = readFirstRow(
      db,
      "SELECT id FROM navai_workspace_experiences WHERE user_id = ? AND kind = ? AND id = ?",
      [normalizedUserId, kind, normalizedId]
    );
    if (!existing) {
      throw new Error("Experience not found.");
    }

    db.run("BEGIN");
    try {
      deleteWorkspaceExperienceRelatedData(db, kind, normalizedId);
      db.run("DELETE FROM navai_workspace_experiences WHERE user_id = ? AND kind = ? AND id = ?", [
        normalizedUserId,
        kind,
        normalizedId,
      ]);
      db.run("COMMIT");
    } catch (error) {
      db.run("ROLLBACK");
      throw error;
    }

    return { id: normalizedId };
  });
}

async function getPublicWorkspaceExperience(
  kind: NavaiPanelExperienceKind,
  slug: string
): Promise<NavaiPublicExperienceRecord | null> {
  const normalizedSlug = normalizePublicCode(slug);
  const { db } = await getWorkspaceSqliteState();
  const row = readFirstRow(
    db,
    `
      SELECT
        id,
        user_id,
        kind,
        domain_id,
        agent_id,
        name,
        slug,
        description,
        status,
        access_mode,
        allow_plus_users,
        allow_non_plus_users,
        starts_at,
        ends_at,
        delegate_ai_grading,
        enable_ranking,
        enable_comments,
        reward_type,
        reward_title,
        reward_description,
        reward_delivery_method,
        reward_delivery_details,
        reward_payment_methods_json,
        reward_winner_count,
        reward_points,
        reward_usd_amount,
        daily_attempt_limit,
        questions_json,
        welcome_title,
        welcome_body,
        auto_start_conversation,
        enable_entry_modal,
        enable_hcaptcha,
        system_prompt
      FROM navai_workspace_experiences
      WHERE kind = ? AND slug = ? AND status <> 'Draft'
    `,
    [kind, normalizedSlug]
  );

  if (!row) {
    return null;
  }

  const exchangeRate = await resolveUsdCopExchangeRateRecord();
  const domainId = String(row.domain_id ?? "");
  const agentId = String(row.agent_id ?? "");
  const userId = String(row.user_id ?? "");
  const domain = domainId ? await getNavaiPanelDomainById(userId, domainId) : null;
  const agent = agentId ? await getWorkspaceAgentById(userId, kind, agentId) : null;
  const organizerProfile = userId ? readPublicFacingUserProfile(db, userId) : null;
  const organizerVerification = userId ? readUserVerificationByUserId(db, userId) : null;
  const rewardPoints = normalizePointAmount(
    row.reward_points ?? row.reward_usd_amount ?? 0,
    0
  );
  const rewardAmountCop = convertPointsToCop(rewardPoints);
  const rewardAmountUsd = convertCopToUsd(rewardAmountCop, exchangeRate.rate);

  return {
    id: String(row.id ?? ""),
    kind,
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    description: String(row.description ?? ""),
    status: normalizeExperienceStatus(row.status),
    accessMode: normalizeExperienceAccessMode(row.access_mode),
    allowPlusUsers: true,
    allowNonPlusUsers: true,
    startsAt: String(row.starts_at ?? ""),
    endsAt: String(row.ends_at ?? ""),
    delegateAiGrading: normalizeBoolean(row.delegate_ai_grading),
    enableRanking: normalizeBoolean(row.enable_ranking),
    enableComments: normalizeBoolean(row.enable_comments),
    rewardType: normalizeRewardType(row.reward_type),
    rewardTitle: String(row.reward_title ?? ""),
    rewardDescription: String(row.reward_description ?? ""),
    rewardDeliveryMethod: normalizeRewardDeliveryMethod(row.reward_delivery_method),
    rewardDeliveryDetails: String(row.reward_delivery_details ?? ""),
    rewardPaymentMethods: normalizeRewardPaymentMethods(
      parseJsonArray(row.reward_payment_methods_json)
    ),
    rewardWinnerCount: normalizePositiveInteger(row.reward_winner_count, 1),
    rewardPoints,
    rewardUsdAmount: rewardAmountUsd,
    rewardAmountCop,
    rewardAmountUsd,
    dailyAttemptLimit: normalizePositiveInteger(row.daily_attempt_limit, 1),
    agentId,
    agentName: agent?.name ?? "",
    questions: normalizeQuestions(parseJsonArray(row.questions_json)),
    welcomeTitle: String(row.welcome_title ?? ""),
    welcomeBody: String(row.welcome_body ?? ""),
    autoStartConversation: normalizeBoolean(row.auto_start_conversation),
    enableEntryModal: normalizeBooleanWithFallback(row.enable_entry_modal, true),
    enableHCaptcha: normalizeBooleanWithFallback(row.enable_hcaptcha, true),
    systemPrompt: String(row.system_prompt ?? ""),
    agentModel: agent?.agentModel ?? "",
    agentVoice: agent?.agentVoice ?? "",
    agentLanguage: agent?.agentLanguage ?? "",
    agentVoiceAccent: agent?.agentVoiceAccent ?? "",
    agentVoiceTone: agent?.agentVoiceTone ?? "",
    publicPath: resolveExperiencePublicPath(kind, String(row.slug ?? "")),
    exchangeRate,
    organizer: organizerProfile
      ? {
          ...organizerProfile,
          isVerified:
            organizerProfile.accountStatus !== "inactive" &&
            organizerVerification?.status === "approved",
        }
      : null,
    domain: domain
      ? {
          id: domain.id,
          domain: domain.domain,
          label: domain.label,
          description: domain.description,
          routes: domain.routes,
          parameters: domain.parameters,
        }
      : null,
  };
}

export async function listPublicWorkspaceExperienceSlugs(kind: NavaiPanelExperienceKind) {
  const { db } = await getWorkspaceSqliteState();
  const rows = readStatementRows(
    db,
    `
      SELECT slug
      FROM navai_workspace_experiences
      WHERE kind = ? AND status <> 'Draft'
      ORDER BY updated_at DESC
    `,
    [kind]
  );

  return rows
    .map((row) => normalizePublicCode(String(row.slug ?? "")))
    .filter(Boolean);
}

async function getNavaiPanelAgentSettings(
  userId: string,
  kind: NavaiPanelExperienceKind
) {
  const normalizedUserId = validateUserId(userId);
  const { db } = await getWorkspaceSqliteState();
  const row = readFirstRow(
    db,
    `
      SELECT
        user_id,
        kind,
        name,
        agent_model,
        agent_voice,
        agent_language,
        agent_voice_accent,
        agent_voice_tone,
        updated_at
      FROM navai_workspace_agent_settings
      WHERE user_id = ? AND kind = ?
    `,
    [normalizedUserId, kind]
  );

  if (!row) {
    return buildDefaultAgentSettings(normalizedUserId, kind);
  }

  return {
    userId: String(row.user_id ?? ""),
    kind,
    name: String(row.name ?? ""),
    agentModel: String(row.agent_model ?? ""),
    agentVoice: String(row.agent_voice ?? ""),
    agentLanguage: String(row.agent_language ?? ""),
    agentVoiceAccent: String(row.agent_voice_accent ?? ""),
    agentVoiceTone: String(row.agent_voice_tone ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  } satisfies NavaiPanelAgentSettingsRecord;
}

async function updateNavaiPanelAgentSettings(
  userId: string,
  kind: NavaiPanelExperienceKind,
  input: NavaiPanelAgentSettingsInput
) {
  const normalizedUserId = validateUserId(userId);
  const normalizedInput = validateAgentSettingsInput(input);

  return runSerializedMutation(async (db) => {
    const now = new Date().toISOString();
    const existing = readFirstRow(
      db,
      "SELECT user_id FROM navai_workspace_agent_settings WHERE user_id = ? AND kind = ?",
      [normalizedUserId, kind]
    );

    if (existing) {
      db.run(
        `
          UPDATE navai_workspace_agent_settings
          SET
            name = ?,
            agent_model = ?,
            agent_voice = ?,
            agent_language = ?,
            agent_voice_accent = ?,
            agent_voice_tone = ?,
            updated_at = ?
          WHERE user_id = ? AND kind = ?
        `,
        [
          normalizedInput.name,
          normalizedInput.agentModel,
          normalizedInput.agentVoice,
          normalizedInput.agentLanguage,
          normalizedInput.agentVoiceAccent,
          normalizedInput.agentVoiceTone,
          now,
          normalizedUserId,
          kind,
        ]
      );
    } else {
      db.run(
        `
          INSERT INTO navai_workspace_agent_settings (
            user_id,
            kind,
            name,
            agent_model,
            agent_voice,
            agent_language,
            agent_voice_accent,
            agent_voice_tone,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          normalizedUserId,
          kind,
          normalizedInput.name,
          normalizedInput.agentModel,
          normalizedInput.agentVoice,
          normalizedInput.agentLanguage,
          normalizedInput.agentVoiceAccent,
          normalizedInput.agentVoiceTone,
          now,
        ]
      );
    }

    return getNavaiPanelAgentSettings(normalizedUserId, kind);
  });
}

async function listWorkspaceAgents(userId: string, kind: NavaiPanelExperienceKind) {
  const normalizedUserId = validateUserId(userId);
  const { db } = await getWorkspaceSqliteState();
  const rows = readStatementRows(
    db,
    `
      SELECT
        id,
        user_id,
        kind,
        name,
        agent_model,
        agent_voice,
        agent_language,
        agent_voice_accent,
        agent_voice_tone,
        created_at,
        updated_at
      FROM navai_workspace_agents
      WHERE user_id = ? AND kind = ?
      ORDER BY updated_at DESC, created_at DESC
    `,
    [normalizedUserId, kind]
  );

  return rows.map(mapAgentRow);
}

async function getWorkspaceAgentById(
  userId: string,
  kind: NavaiPanelExperienceKind,
  id: string
) {
  const normalizedUserId = validateUserId(userId);
  const normalizedId = normalizeString(id);
  if (!normalizedId) {
    return null;
  }

  const { db } = await getWorkspaceSqliteState();
  const row = readFirstRow(
    db,
    `
      SELECT
        id,
        user_id,
        kind,
        name,
        agent_model,
        agent_voice,
        agent_language,
        agent_voice_accent,
        agent_voice_tone,
        created_at,
        updated_at
      FROM navai_workspace_agents
      WHERE user_id = ? AND kind = ? AND id = ?
    `,
    [normalizedUserId, kind, normalizedId]
  );

  return row ? mapAgentRow(row) : null;
}

async function createWorkspaceAgent(
  userId: string,
  kind: NavaiPanelExperienceKind,
  input: NavaiPanelAgentInput
) {
  const normalizedUserId = validateUserId(userId);
  const normalizedInput = validateAgentInput(input);

  return runSerializedMutation(async (db) => {
    const id = randomUUID();
    const now = new Date().toISOString();
    db.run(
      `
        INSERT INTO navai_workspace_agents (
          id,
          user_id,
          kind,
          name,
          agent_model,
          agent_voice,
          agent_language,
          agent_voice_accent,
          agent_voice_tone,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        normalizedUserId,
        kind,
        normalizedInput.name,
        normalizedInput.agentModel,
        normalizedInput.agentVoice,
        normalizedInput.agentLanguage,
        normalizedInput.agentVoiceAccent,
        normalizedInput.agentVoiceTone,
        now,
        now,
      ]
    );

    const created = await getWorkspaceAgentById(normalizedUserId, kind, id);
    if (!created) {
      throw new Error("Agent was created but could not be loaded.");
    }
    return created;
  });
}

async function updateWorkspaceAgent(
  userId: string,
  kind: NavaiPanelExperienceKind,
  id: string,
  input: NavaiPanelAgentInput
) {
  const normalizedUserId = validateUserId(userId);
  const normalizedId = normalizeString(id);
  if (!normalizedId) {
    throw new Error("Agent id is required.");
  }
  const normalizedInput = validateAgentInput(input);

  return runSerializedMutation(async (db) => {
    const existing = readFirstRow(
      db,
      "SELECT id FROM navai_workspace_agents WHERE user_id = ? AND kind = ? AND id = ?",
      [normalizedUserId, kind, normalizedId]
    );
    if (!existing) {
      throw new Error("Agent not found.");
    }

    db.run(
      `
        UPDATE navai_workspace_agents
        SET
          name = ?,
          agent_model = ?,
          agent_voice = ?,
          agent_language = ?,
          agent_voice_accent = ?,
          agent_voice_tone = ?,
          updated_at = ?
        WHERE user_id = ? AND kind = ? AND id = ?
      `,
      [
        normalizedInput.name,
        normalizedInput.agentModel,
        normalizedInput.agentVoice,
        normalizedInput.agentLanguage,
        normalizedInput.agentVoiceAccent,
        normalizedInput.agentVoiceTone,
        new Date().toISOString(),
        normalizedUserId,
        kind,
        normalizedId,
      ]
    );

    const updated = await getWorkspaceAgentById(normalizedUserId, kind, normalizedId);
    if (!updated) {
      throw new Error("Agent was updated but could not be loaded.");
    }
    return updated;
  });
}

async function deleteWorkspaceAgent(
  userId: string,
  kind: NavaiPanelExperienceKind,
  id: string
) {
  const normalizedUserId = validateUserId(userId);
  const normalizedId = normalizeString(id);
  if (!normalizedId) {
    throw new Error("Agent id is required.");
  }

  return runSerializedMutation((db) => {
    const existing = readFirstRow(
      db,
      "SELECT id FROM navai_workspace_agents WHERE user_id = ? AND kind = ? AND id = ?",
      [normalizedUserId, kind, normalizedId]
    );
    if (!existing) {
      throw new Error("Agent not found.");
    }

    db.run(
      "UPDATE navai_workspace_experiences SET agent_id = '' WHERE user_id = ? AND kind = ? AND agent_id = ?",
      [normalizedUserId, kind, normalizedId]
    );
    db.run("DELETE FROM navai_workspace_agents WHERE user_id = ? AND kind = ? AND id = ?", [
      normalizedUserId,
      kind,
      normalizedId,
    ]);
    return { id: normalizedId };
  });
}

async function trackPublicWorkspaceExperienceLaunch(
  kind: NavaiPanelExperienceKind,
  slug: string
) {
  const normalizedSlug = normalizePublicCode(slug);

  return runSerializedMutation(async (db) => {
    const existing = readFirstRow(
      db,
      "SELECT id FROM navai_workspace_experiences WHERE kind = ? AND slug = ? AND status <> 'Draft'",
      [kind, normalizedSlug]
    );
    if (!existing) {
      throw new Error("Public experience not found.");
    }

    db.run(
      `
        UPDATE navai_workspace_experiences
        SET
          launches_count = launches_count + 1,
          conversations_count = conversations_count + 1,
          updated_at = ?
        WHERE kind = ? AND slug = ?
      `,
      [new Date().toISOString(), kind, normalizedSlug]
    );

    const updated = await getPublicWorkspaceExperience(kind, normalizedSlug);
    if (!updated) {
      throw new Error("Public experience was updated but could not be loaded.");
    }

    return updated;
  });
}

export async function listNavaiPanelEvaluations(userId: string) {
  const items = await listWorkspaceExperiences(userId, "evaluation");
  return items as NavaiPanelEvaluationRecord[];
}

export async function listNavaiPanelEvaluationAgents(userId: string) {
  return listWorkspaceAgents(userId, "evaluation");
}

export async function listNavaiPanelSurveys(userId: string) {
  const items = await listWorkspaceExperiences(userId, "survey");
  return items as NavaiPanelSurveyRecord[];
}

export async function listNavaiPanelSurveyAgents(userId: string) {
  return listWorkspaceAgents(userId, "survey");
}

export async function createNavaiPanelEvaluation(
  userId: string,
  input: NavaiPanelExperienceInput
) {
  return (await createWorkspaceExperience(userId, "evaluation", input)) as NavaiPanelEvaluationRecord;
}

export async function createNavaiPanelEvaluationAgent(userId: string, input: NavaiPanelAgentInput) {
  return createWorkspaceAgent(userId, "evaluation", input);
}

export async function updateNavaiPanelEvaluation(
  userId: string,
  id: string,
  input: NavaiPanelExperienceInput
) {
  return (await updateWorkspaceExperience(userId, "evaluation", id, input)) as NavaiPanelEvaluationRecord;
}

export async function updateNavaiPanelEvaluationAgent(
  userId: string,
  id: string,
  input: NavaiPanelAgentInput
) {
  return updateWorkspaceAgent(userId, "evaluation", id, input);
}

export async function deleteNavaiPanelEvaluation(userId: string, id: string) {
  return deleteWorkspaceExperience(userId, "evaluation", id);
}

export async function deleteNavaiPanelEvaluationAgent(userId: string, id: string) {
  return deleteWorkspaceAgent(userId, "evaluation", id);
}

export async function createNavaiPanelSurvey(userId: string, input: NavaiPanelExperienceInput) {
  return (await createWorkspaceExperience(userId, "survey", input)) as NavaiPanelSurveyRecord;
}

export async function createNavaiPanelSurveyAgent(userId: string, input: NavaiPanelAgentInput) {
  return createWorkspaceAgent(userId, "survey", input);
}

export async function updateNavaiPanelSurvey(
  userId: string,
  id: string,
  input: NavaiPanelExperienceInput
) {
  return (await updateWorkspaceExperience(userId, "survey", id, input)) as NavaiPanelSurveyRecord;
}

export async function updateNavaiPanelSurveyAgent(
  userId: string,
  id: string,
  input: NavaiPanelAgentInput
) {
  return updateWorkspaceAgent(userId, "survey", id, input);
}

export async function deleteNavaiPanelSurvey(userId: string, id: string) {
  return deleteWorkspaceExperience(userId, "survey", id);
}

export async function deleteNavaiPanelSurveyAgent(userId: string, id: string) {
  return deleteWorkspaceAgent(userId, "survey", id);
}

export async function deleteNavaiWorkspaceItemsByDomain(userId: string, domainId: string) {
  const normalizedUserId = validateUserId(userId);
  const normalizedDomainId = normalizeString(domainId);
  if (!normalizedDomainId) {
    return;
  }

  await runSerializedMutation((db) => {
    const experiences = readStatementRows(
      db,
      "SELECT id, kind FROM navai_workspace_experiences WHERE user_id = ? AND domain_id = ?",
      [normalizedUserId, normalizedDomainId]
    );

    db.run("BEGIN");
    try {
      for (const experience of experiences) {
        const experienceId = normalizeString(experience.id);
        const experienceKind: NavaiPanelExperienceKind =
          normalizeString(experience.kind) === "survey" ? "survey" : "evaluation";
        if (!experienceId) {
          continue;
        }

        deleteWorkspaceExperienceRelatedData(db, experienceKind, experienceId);
      }

      db.run(
        "DELETE FROM navai_workspace_experiences WHERE user_id = ? AND domain_id = ?",
        [normalizedUserId, normalizedDomainId]
      );
      db.run("COMMIT");
    } catch (error) {
      db.run("ROLLBACK");
      throw error;
    }
  });
}

type RankedExperienceEntry = {
  respondentUserId: string;
  respondentEmail: string;
  latestActivityAt: string;
  totalScore: number;
  answeredQuestions: number;
  conversationsCount: number;
  completedCount: number;
};

function listRankedExperienceEntries(
  db: SqlJsDatabase,
  experienceId: string,
  kind: NavaiPanelExperienceKind
) {
  const conversationRows = readStatementRows(
    db,
    `
      SELECT
        conversations.respondent_user_id,
        conversations.respondent_email,
        conversations.id,
        conversations.experience_id,
        conversations.experience_kind,
        conversations.experience_slug,
        conversations.status,
        conversations.started_at,
        conversations.updated_at,
        conversations.ended_at,
        conversations.total_questions_count,
        conversations.answered_questions_count,
        conversations.audio_storage_path,
        conversations.audio_download_url,
        conversations.audio_content_type,
        conversations.audio_size_bytes,
        conversations.audio_duration_ms,
        conversations.video_storage_path,
        conversations.video_download_url,
        conversations.video_content_type,
        conversations.video_size_bytes,
        conversations.video_duration_ms
      FROM navai_public_experience_conversations AS conversations
      WHERE conversations.experience_id = ? AND conversations.experience_kind = ?
      ORDER BY conversations.updated_at DESC, conversations.started_at DESC
    `,
    [experienceId, kind]
  );

  if (conversationRows.length === 0) {
    return [] as RankedExperienceEntry[];
  }

  const answerRows = readStatementRows(
    db,
    `
      SELECT
        answers.id,
        answers.conversation_id,
        answers.question_id,
        answers.question_text,
        answers.answer_text,
        answers.ai_score,
        answers.ai_feedback,
        answers.ai_scored_at,
        answers.created_at,
        answers.updated_at
      FROM navai_public_experience_conversation_answers AS answers
      INNER JOIN navai_public_experience_conversations AS conversations
        ON conversations.id = answers.conversation_id
      WHERE conversations.experience_id = ? AND conversations.experience_kind = ?
      ORDER BY answers.updated_at ASC, answers.created_at ASC
    `,
    [experienceId, kind]
  );
  const answersByConversationId = new Map<
    string,
    NavaiPublicExperienceConversationAnswerRecord[]
  >();

  for (const row of answerRows) {
    const answer = mapPublicConversationAnswerRow(row);
    const existing = answersByConversationId.get(answer.conversationId);
    if (existing) {
      existing.push(answer);
      continue;
    }

    answersByConversationId.set(answer.conversationId, [answer]);
  }

  const groups = new Map<
    string,
    {
      respondentUserId: string;
      respondentEmail: string;
      latestActivityAt: string;
      conversations: NavaiPublicExperienceConversationRecord[];
    }
  >();

  for (const row of conversationRows) {
    const conversationId = String(row.id ?? "");
    const conversation = mapPublicConversationRow(
      row,
      answersByConversationId.get(conversationId) ?? []
    );
    const groupKey =
      conversation.respondentEmail.trim().toLowerCase() ||
      conversation.respondentUserId.trim().toLowerCase() ||
      "__anonymous__";
    const latestActivityAt =
      conversation.endedAt || conversation.updatedAt || conversation.startedAt;
    const existing = groups.get(groupKey);

    if (!existing) {
      groups.set(groupKey, {
        respondentUserId: conversation.respondentUserId,
        respondentEmail: conversation.respondentEmail,
        latestActivityAt,
        conversations: [conversation],
      });
      continue;
    }

    if (!existing.respondentUserId && conversation.respondentUserId) {
      existing.respondentUserId = conversation.respondentUserId;
    }
    if (!existing.respondentEmail && conversation.respondentEmail) {
      existing.respondentEmail = conversation.respondentEmail;
    }

    existing.conversations.push(conversation);
    if (
      new Date(latestActivityAt).getTime() >
      new Date(existing.latestActivityAt).getTime()
    ) {
      existing.latestActivityAt = latestActivityAt;
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      group,
      score: calculateExperienceCompositeScore(group.conversations),
    }))
    .sort(
      (left, right) =>
        right.score.totalScore - left.score.totalScore ||
        right.score.completedCount - left.score.completedCount ||
        right.score.answeredQuestions - left.score.answeredQuestions ||
        right.score.conversationsCount - left.score.conversationsCount ||
        new Date(right.group.latestActivityAt).getTime() -
          new Date(left.group.latestActivityAt).getTime()
    )
    .map(({ group, score }) => ({
      respondentUserId: group.respondentUserId,
      respondentEmail: group.respondentEmail,
      latestActivityAt: group.latestActivityAt,
      totalScore: score.totalScore,
      answeredQuestions: score.answeredQuestions,
      conversationsCount: score.conversationsCount,
      completedCount: score.completedCount,
    }));
}

function distributeEndedExperienceRewardsInTransaction(
  db: SqlJsDatabase,
  now = new Date()
) {
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  let distributionsApplied = 0;

  const rewardRows = readStatementRows(
    db,
    `
      SELECT
        id,
        kind,
        slug,
        status,
        ends_at,
        enable_ranking,
        reward_points,
        reward_winner_count
      FROM navai_workspace_experiences
      WHERE enable_ranking = 1
        AND status <> 'Draft'
        AND reward_points > 0
        AND ends_at <> ''
      ORDER BY ends_at ASC
    `
  );

  for (const row of rewardRows) {
    const experienceId = String(row.id ?? "");
    const kind = normalizeString(row.kind) === "survey" ? "survey" : "evaluation";
    const experienceSlug = String(row.slug ?? "");
    const endsAtMs = new Date(String(row.ends_at ?? "")).getTime();
    if (!experienceId || !Number.isFinite(endsAtMs) || endsAtMs > nowMs) {
      continue;
    }

    const totalPoints = normalizePointAmount(row.reward_points, 0);
    if (totalPoints < 1) {
      continue;
    }

    const ranked = listRankedExperienceEntries(db, experienceId, kind);
    if (ranked.length === 0) {
      continue;
    }

    const winnerSlots = Math.min(
      ranked.length,
      Math.max(1, normalizePositiveInteger(row.reward_winner_count, 1))
    );
    const selectedWinners = ranked.slice(0, winnerSlots);
    if (selectedWinners.length === 0) {
      continue;
    }

    const pointsPerWinner = Math.floor(totalPoints / selectedWinners.length);
    const remainder = totalPoints % selectedWinners.length;

    selectedWinners.forEach((winner, index) => {
      const alreadyDistributed = readFirstRow(
        db,
        `
          SELECT id
          FROM navai_experience_reward_distributions
          WHERE experience_id = ? AND winner_user_id = ?
          LIMIT 1
        `,
        [experienceId, winner.respondentUserId]
      );
      if (alreadyDistributed) {
        return;
      }

      const awardedPoints = pointsPerWinner + (index < remainder ? 1 : 0);
      if (awardedPoints < 1) {
        return;
      }

      const distributionId = randomUUID();
      db.run(
        `
          INSERT INTO navai_experience_reward_distributions (
            id,
            experience_id,
            experience_kind,
            experience_slug,
            winner_user_id,
            winner_email,
            winner_rank,
            awarded_points,
            awarded_amount_cop,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          distributionId,
          experienceId,
          kind,
          experienceSlug,
          winner.respondentUserId,
          normalizeEmailAddress(winner.respondentEmail),
          index + 1,
          awardedPoints,
          convertPointsToCop(awardedPoints),
          nowIso,
        ]
      );

      appendPointsLedgerEntry(db, {
        userId: winner.respondentUserId,
        experienceId,
        experienceKind: kind,
        experienceSlug,
        relatedDistributionId: distributionId,
        relatedUserId: winner.respondentUserId,
        relatedUserEmail: winner.respondentEmail,
        reason: "experience_reward",
        deltaPoints: awardedPoints,
      });

      distributionsApplied += 1;
    });
  }

  return distributionsApplied;
}

async function runEndedExperienceRewardsDistributionSweep(now = new Date()) {
  return runSerializedMutation((db) => distributeEndedExperienceRewardsInTransaction(db, now));
}

export async function listPublicNavaiExperienceTop(
  kind: NavaiPanelExperienceKind,
  slug: string
) {
  const experience = await getPublicWorkspaceExperience(kind, slug);
  if (!experience) {
    throw new Error("Public experience not found.");
  }
  if (!experience.enableRanking) {
    return [];
  }

  await runEndedExperienceRewardsDistributionSweep();
  const { db } = await getWorkspaceSqliteState();
  return listRankedExperienceEntries(db, experience.id, kind)
    .slice(0, 10)
    .map((entry) =>
      resolveTopEntryRow(db, {
        respondent_user_id: entry.respondentUserId,
        respondent_email: entry.respondentEmail,
        total_score: entry.totalScore,
        answered_questions: entry.answeredQuestions,
        conversations_count: entry.conversationsCount,
        latest_activity_at: entry.latestActivityAt,
      })
    );
}

export async function listPublicNavaiExperienceComments(
  kind: NavaiPanelExperienceKind,
  slug: string
) {
  await runEndedExperienceRewardsDistributionSweep();
  const experience = await getPublicWorkspaceExperience(kind, slug);
  if (!experience) {
    throw new Error("Public experience not found.");
  }
  if (!experience.enableComments) {
    return [];
  }

  const { db } = await getWorkspaceSqliteState();
  return readPublicExperienceComments(db, experience.id);
}

export async function createPublicNavaiExperienceComment(
  kind: NavaiPanelExperienceKind,
  slug: string,
  requester: { uid: string; email: string },
  input: NavaiPublicExperienceCommentInput
) {
  const normalizedUserId = validateUserId(requester.uid);
  const normalizedEmail = normalizeEmailAddress(requester.email);
  const normalizedInput = normalizePublicCommentInput(input);
  const experience = await getPublicWorkspaceExperience(kind, slug);
  if (!experience) {
    throw new Error("Public experience not found.");
  }

  const { db } = await getWorkspaceSqliteState();
  const settings = readWorkspaceExperienceAccessSettings(db, experience.id);
  if (!settings.enableComments) {
    throw new Error("Comments are not enabled for this experience.");
  }
  if (
    settings.accessMode === "private" &&
    (!normalizedEmail || !settings.allowedEmails.includes(normalizedEmail))
  ) {
    throw new Error("This private experience is only available to selected email accounts.");
  }

  return runSerializedMutation((mutationDb) => {
    const now = new Date().toISOString();
    const commentId = randomUUID();
    mutationDb.run(
      `
        INSERT INTO navai_public_experience_comments (
          id,
          experience_id,
          experience_kind,
          experience_slug,
          author_user_id,
          author_email,
          body,
          rating,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(experience_id, author_user_id) DO UPDATE SET
          experience_kind = excluded.experience_kind,
          experience_slug = excluded.experience_slug,
          author_email = excluded.author_email,
          body = excluded.body,
          rating = excluded.rating,
          updated_at = excluded.updated_at
      `,
      [
        commentId,
        experience.id,
        kind,
        experience.slug,
        normalizedUserId,
        normalizedEmail,
        normalizedInput.body,
        normalizedInput.rating,
        now,
        now,
      ]
    );

    const created = readPublicExperienceCommentByExperienceAndAuthor(
      mutationDb,
      experience.id,
      normalizedUserId
    );
    if (!created) {
      throw new Error("Comment was created but could not be loaded.");
    }
    return created;
  });
}

export async function updatePublicNavaiExperienceComment(
  commentId: string,
  requester: { uid: string; isAdmin: boolean },
  input: NavaiPublicExperienceCommentInput
) {
  const normalizedCommentId = normalizeString(commentId);
  if (!normalizedCommentId) {
    throw new Error("Comment id is required.");
  }

  const normalizedInput = normalizePublicCommentInput(input);

  return runSerializedMutation((db) => {
    const existing = readPublicExperienceCommentById(db, normalizedCommentId);
    if (!existing) {
      throw new Error("Comment not found.");
    }
    if (!requester.isAdmin && existing.authorUserId !== validateUserId(requester.uid)) {
      throw new Error("You do not have permission to manage this comment.");
    }

    db.run(
      `
        UPDATE navai_public_experience_comments
        SET body = ?, rating = ?, updated_at = ?
        WHERE id = ?
      `,
      [
        normalizedInput.body,
        normalizedInput.rating,
        new Date().toISOString(),
        normalizedCommentId,
      ]
    );

    const updated = readPublicExperienceCommentById(db, normalizedCommentId);
    if (!updated) {
      throw new Error("Comment was updated but could not be loaded.");
    }
    return updated;
  });
}

export async function deletePublicNavaiExperienceComment(
  commentId: string,
  requester: { uid: string; isAdmin: boolean }
) {
  const normalizedCommentId = normalizeString(commentId);
  if (!normalizedCommentId) {
    throw new Error("Comment id is required.");
  }

  return runSerializedMutation((db) => {
    const existing = readPublicExperienceCommentById(db, normalizedCommentId);
    if (!existing) {
      throw new Error("Comment not found.");
    }
    if (!requester.isAdmin && existing.authorUserId !== validateUserId(requester.uid)) {
      throw new Error("You do not have permission to manage this comment.");
    }

    db.run("DELETE FROM navai_public_experience_comments WHERE id = ?", [normalizedCommentId]);
    return { id: normalizedCommentId };
  });
}

export async function getNavaiPublicUserProfile(userId: string) {
  const normalizedUserId = normalizeString(userId);
  if (!normalizedUserId) {
    throw new Error("User id is required.");
  }

  const { db } = await getWorkspaceSqliteState();
  const profile = readResolvedUserProfile(db, normalizedUserId);
  if (profile.accountStatus === "inactive") {
    throw new Error("Public profile not available.");
  }

  return profile;
}

export async function getNavaiPanelUserProfile(userId: string, email: string) {
  const normalizedUserId = validateUserId(userId);
  const normalizedEmail = normalizeEmailAddress(email);
  const { db } = await getWorkspaceSqliteState();
  return readResolvedUserProfile(db, normalizedUserId, { preferredEmail: normalizedEmail });
}

export async function getNavaiPanelUserVerification(userId: string, email: string) {
  const normalizedUserId = validateUserId(userId);
  const normalizedEmail = normalizeEmailAddress(email);
  const { db } = await getWorkspaceSqliteState();
  return readResolvedUserVerification(db, normalizedUserId, {
    preferredEmail: normalizedEmail,
  });
}

export async function updateNavaiPanelUserProfile(
  userId: string,
  email: string,
  input: NavaiUserProfileInput
) {
  const normalizedUserId = validateUserId(userId);
  const normalizedEmail = normalizeEmailAddress(email);
  const normalizedInput = validateUserProfileInput(input);

  return runSerializedMutation((db) => {
    const existing = readUserProfileByUserId(db, normalizedUserId);
    const now = new Date().toISOString();
    const createdAt = existing?.createdAt || now;

    db.run(
      `
        INSERT INTO navai_user_profiles (
          user_id,
          email,
          account_status,
          deletion_requested_at,
          scheduled_deletion_at,
          deactivated_at,
          display_name,
          photo_url,
          bio,
          professional_headline,
          job_title,
          company,
          location,
          phone,
          website_url,
          linkedin_url,
          github_url,
          x_url,
          instagram_url,
          facebook_url,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          email = excluded.email,
          display_name = excluded.display_name,
          photo_url = excluded.photo_url,
          bio = excluded.bio,
          professional_headline = excluded.professional_headline,
          job_title = excluded.job_title,
          company = excluded.company,
          location = excluded.location,
          phone = excluded.phone,
          website_url = excluded.website_url,
          linkedin_url = excluded.linkedin_url,
          github_url = excluded.github_url,
          x_url = excluded.x_url,
          instagram_url = excluded.instagram_url,
          facebook_url = excluded.facebook_url,
          updated_at = excluded.updated_at
      `,
      [
        normalizedUserId,
        normalizedEmail,
        existing?.accountStatus ?? "active",
        existing?.deletionRequestedAt ?? "",
        existing?.scheduledDeletionAt ?? "",
        existing?.deactivatedAt ?? "",
        normalizedInput.displayName,
        normalizedInput.photoUrl,
        normalizedInput.bio,
        normalizedInput.professionalHeadline,
        normalizedInput.jobTitle,
        normalizedInput.company,
        normalizedInput.location,
        normalizedInput.phone,
        normalizedInput.websiteUrl,
        normalizedInput.linkedinUrl,
        normalizedInput.githubUrl,
        normalizedInput.xUrl,
        normalizedInput.instagramUrl,
        normalizedInput.facebookUrl,
        createdAt,
        now,
      ]
    );

    return readResolvedUserProfile(db, normalizedUserId, {
      preferredEmail: normalizedEmail,
    });
  });
}

export async function requestNavaiPanelUserAccountDeletion(userId: string, email: string) {
  const normalizedUserId = validateUserId(userId);
  const normalizedEmail = normalizeEmailAddress(email);

  return runSerializedMutation((db) => {
    const existing = readUserProfileByUserId(db, normalizedUserId);
    const now = new Date();
    const nowIso = now.toISOString();
    const createdAt = existing?.createdAt || nowIso;
    const currentStatus = existing?.accountStatus ?? "active";
    const deletionRequestedAt =
      currentStatus === "deletion_pending" && existing?.deletionRequestedAt
        ? existing.deletionRequestedAt
        : nowIso;
    const scheduledDeletionAt =
      currentStatus === "deletion_pending" && existing?.scheduledDeletionAt
        ? existing.scheduledDeletionAt
        : new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const nextStatus = currentStatus === "inactive" ? "inactive" : "deletion_pending";

    db.run(
      `
        INSERT INTO navai_user_profiles (
          user_id,
          email,
          account_status,
          deletion_requested_at,
          scheduled_deletion_at,
          deactivated_at,
          display_name,
          photo_url,
          bio,
          professional_headline,
          job_title,
          company,
          location,
          phone,
          website_url,
          linkedin_url,
          github_url,
          x_url,
          instagram_url,
          facebook_url,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          email = excluded.email,
          account_status = excluded.account_status,
          deletion_requested_at = excluded.deletion_requested_at,
          scheduled_deletion_at = excluded.scheduled_deletion_at,
          deactivated_at = excluded.deactivated_at,
          updated_at = excluded.updated_at
      `,
      [
        normalizedUserId,
        normalizedEmail,
        nextStatus,
        deletionRequestedAt,
        scheduledDeletionAt,
        existing?.deactivatedAt ?? "",
        existing?.displayName ?? "",
        existing?.photoUrl ?? "",
        existing?.bio ?? "",
        existing?.professionalHeadline ?? "",
        existing?.jobTitle ?? "",
        existing?.company ?? "",
        existing?.location ?? "",
        existing?.phone ?? "",
        existing?.websiteUrl ?? "",
        existing?.linkedinUrl ?? "",
        existing?.githubUrl ?? "",
        existing?.xUrl ?? "",
        existing?.instagramUrl ?? "",
        existing?.facebookUrl ?? "",
        createdAt,
        nowIso,
      ]
    );

    return readResolvedUserProfile(db, normalizedUserId, {
      preferredEmail: normalizedEmail,
    });
  });
}

export async function deactivateExpiredNavaiPanelUserAccounts(now = new Date()) {
  const nowIso = now.toISOString();
  return runSerializedMutation((db) => {
    db.run(
      `
        UPDATE navai_user_profiles
        SET
          account_status = 'inactive',
          deactivated_at = CASE
            WHEN deactivated_at = '' THEN ?
            ELSE deactivated_at
          END,
          updated_at = ?
        WHERE account_status = 'deletion_pending'
          AND scheduled_deletion_at <> ''
          AND scheduled_deletion_at <= ?
      `,
      [nowIso, nowIso, nowIso]
    );

    const row = readFirstRow(db, "SELECT changes() AS count");
    return normalizeInteger(row?.count);
  });
}

export async function submitNavaiPanelUserVerification(
  userId: string,
  email: string,
  input: NavaiUserVerificationInput
) {
  const normalizedUserId = validateUserId(userId);
  const normalizedEmail = normalizeEmailAddress(email);
  const normalizedInput = validateUserVerificationInput(input);

  return runSerializedMutation((db) => {
    const existing = readUserVerificationByUserId(db, normalizedUserId);
    const now = new Date().toISOString();
    const createdAt = existing?.createdAt || now;

    db.run(
      `
        INSERT INTO navai_user_verifications (
          user_id,
          email,
          status,
          full_name,
          document_type,
          document_number,
          document_country,
          selfie_image_id,
          selfie_image_url,
          document_front_image_id,
          document_front_image_url,
          document_back_image_id,
          document_back_image_url,
          response_message,
          submitted_at,
          reviewed_at,
          reviewed_by_user_id,
          reviewed_by_email,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          email = excluded.email,
          status = excluded.status,
          full_name = excluded.full_name,
          document_type = excluded.document_type,
          document_number = excluded.document_number,
          document_country = excluded.document_country,
          selfie_image_id = excluded.selfie_image_id,
          selfie_image_url = excluded.selfie_image_url,
          document_front_image_id = excluded.document_front_image_id,
          document_front_image_url = excluded.document_front_image_url,
          document_back_image_id = excluded.document_back_image_id,
          document_back_image_url = excluded.document_back_image_url,
          response_message = excluded.response_message,
          submitted_at = excluded.submitted_at,
          reviewed_at = excluded.reviewed_at,
          reviewed_by_user_id = excluded.reviewed_by_user_id,
          reviewed_by_email = excluded.reviewed_by_email,
          updated_at = excluded.updated_at
      `,
      [
        normalizedUserId,
        normalizedEmail,
        "pending",
        normalizedInput.fullName,
        normalizedInput.documentType,
        normalizedInput.documentNumber,
        normalizedInput.documentCountry,
        normalizedInput.selfieImage.assetId,
        normalizedInput.selfieImage.url,
        normalizedInput.documentFrontImage.assetId,
        normalizedInput.documentFrontImage.url,
        normalizedInput.documentBackImage.assetId,
        normalizedInput.documentBackImage.url,
        "",
        now,
        "",
        "",
        "",
        createdAt,
        now,
      ]
    );

    return readResolvedUserVerification(db, normalizedUserId, {
      preferredEmail: normalizedEmail,
    });
  });
}

function assertAdminVerificationActor(actor: NavaiPanelActor) {
  if (!actor.permissions.canManageUsers || actor.role !== "admin") {
    throw new Error("Administrator permissions are required.");
  }
}

function assertSupportCashoutActor(actor: NavaiPanelActor) {
  if (!isNavaiPanelSupportActor(actor)) {
    throw new Error("Administrator permissions are required.");
  }
}

export async function listNavaiPanelPendingUserVerifications(actor: NavaiPanelActor) {
  assertAdminVerificationActor(actor);
  const { db } = await getWorkspaceSqliteState();
  const rows = readStatementRows(
    db,
    `
      SELECT user_id
      FROM navai_user_verifications
      WHERE status = 'pending' AND submitted_at <> ''
      ORDER BY submitted_at ASC, created_at ASC, updated_at ASC
    `
  );

  return rows.map((row) => {
    const userId = normalizeString(row.user_id);
    const verification = readResolvedUserVerification(db, userId);
    const profile = readResolvedUserProfile(db, userId, {
      preferredEmail: verification.email,
    });

    return {
      verification,
      profile,
    } satisfies NavaiPanelPendingUserVerificationRecord;
  });
}

export async function reviewNavaiPanelUserVerification(
  actor: NavaiPanelActor,
  targetUserId: string,
  input: NavaiUserVerificationReviewInput
) {
  assertAdminVerificationActor(actor);
  const normalizedUserId = validateUserId(targetUserId);
  const normalizedInput = validateUserVerificationReviewInput(input);

  return runSerializedMutation((db) => {
    const existing = readUserVerificationByUserId(db, normalizedUserId);
    if (!existing || existing.status === "not_submitted" || !existing.submittedAt) {
      throw new Error("Verification request not found.");
    }

    db.run(
      `
        UPDATE navai_user_verifications
        SET
          status = ?,
          response_message = ?,
          reviewed_at = ?,
          reviewed_by_user_id = ?,
          reviewed_by_email = ?,
          updated_at = ?
        WHERE user_id = ?
      `,
      [
        normalizedInput.status,
        normalizedInput.responseMessage,
        new Date().toISOString(),
        validateUserId(actor.uid),
        normalizeEmailAddress(actor.email),
        new Date().toISOString(),
        normalizedUserId,
      ]
    );

    const verification = readResolvedUserVerification(db, normalizedUserId);
    const profile = readResolvedUserProfile(db, normalizedUserId, {
      preferredEmail: verification.email,
    });

    return {
      verification,
      profile,
    } satisfies NavaiPanelPendingUserVerificationRecord;
  });
}

export async function getPublicNavaiEvaluation(slug: string) {
  await runEndedExperienceRewardsDistributionSweep();
  return getPublicWorkspaceExperience("evaluation", slug);
}

export async function getPublicNavaiSurvey(slug: string) {
  await runEndedExperienceRewardsDistributionSweep();
  return getPublicWorkspaceExperience("survey", slug);
}

export async function getNavaiPanelEvaluationAgentSettings(userId: string) {
  return getNavaiPanelAgentSettings(userId, "evaluation");
}

export async function getNavaiPanelSurveyAgentSettings(userId: string) {
  return getNavaiPanelAgentSettings(userId, "survey");
}

export async function updateNavaiPanelEvaluationAgentSettings(
  userId: string,
  input: NavaiPanelAgentSettingsInput
) {
  return updateNavaiPanelAgentSettings(userId, "evaluation", input);
}

export async function updateNavaiPanelSurveyAgentSettings(
  userId: string,
  input: NavaiPanelAgentSettingsInput
) {
  return updateNavaiPanelAgentSettings(userId, "survey", input);
}

export async function trackPublicNavaiEvaluationLaunch(slug: string) {
  return trackPublicWorkspaceExperienceLaunch("evaluation", slug);
}

export async function trackPublicNavaiSurveyLaunch(slug: string) {
  return trackPublicWorkspaceExperienceLaunch("survey", slug);
}

async function listWorkspaceExperienceConversations(
  userId: string,
  kind: NavaiPanelExperienceKind,
  experienceId: string
) {
  const normalizedUserId = validateUserId(userId);
  const normalizedExperienceId = normalizeString(experienceId);
  if (!normalizedExperienceId) {
    throw new Error("Experience id is required.");
  }

  const experience = await getWorkspaceExperienceById(normalizedUserId, kind, normalizedExperienceId);
  if (!experience) {
    throw new Error("Experience not found.");
  }

  const { db } = await getWorkspaceSqliteState();
  const rows = readStatementRows(
    db,
    `
      SELECT
        id,
        experience_id,
        experience_kind,
        experience_slug,
        respondent_user_id,
        respondent_email,
        status,
        started_at,
        updated_at,
        ended_at,
        total_questions_count,
        answered_questions_count,
        audio_storage_path,
        audio_download_url,
        audio_content_type,
        audio_size_bytes,
        audio_duration_ms,
        video_storage_path,
        video_download_url,
        video_content_type,
        video_size_bytes,
        video_duration_ms
      FROM navai_public_experience_conversations
      WHERE experience_id = ? AND experience_kind = ?
      ORDER BY updated_at DESC, started_at DESC
    `,
    [normalizedExperienceId, kind]
  );

  return rows.map((row) =>
    mapPublicConversationRow(row, readPublicConversationAnswers(db, String(row.id ?? "")))
  );
}

export async function startPublicNavaiExperienceConversation(
  kind: NavaiPanelExperienceKind,
  slug: string,
  respondentUserId: string,
  respondentEmail: string
) {
  await runEndedExperienceRewardsDistributionSweep();
  const normalizedRespondentUserId = validateUserId(respondentUserId);
  const experience = await getPublicWorkspaceExperience(kind, slug);
  if (!experience) {
    throw new Error("Public experience not found.");
  }
  const { db } = await getWorkspaceSqliteState();
  const accessSettings = readWorkspaceExperienceAccessSettings(db, experience.id);
  assertExperienceCanStartConversation(
    db,
    experience,
    accessSettings,
    normalizedRespondentUserId,
    respondentEmail
  );

  return runSerializedMutation((db) => {
    const now = new Date().toISOString();
    const todayKey = resolveExperienceAttemptDateKey(now);
    const attemptRows = readStatementRows(
      db,
      `
        SELECT started_at
        FROM navai_public_experience_conversations
        WHERE experience_id = ? AND respondent_user_id = ?
        ORDER BY started_at DESC
      `,
      [experience.id, normalizedRespondentUserId]
    );
    const attemptsToday = attemptRows.filter(
      (row) => resolveExperienceAttemptDateKey(String(row.started_at ?? "")) === todayKey
    ).length;
    if (attemptsToday >= accessSettings.dailyAttemptLimit) {
      throw new Error("Daily attempt limit reached for this experience.");
    }

    const availableReferralEntries = readReferralEntryTotals(db, normalizedRespondentUserId)
      .availableEntries;
    const availablePurchasedEntries = readPurchasedEntryTotals(db, normalizedRespondentUserId)
      .availableEntries;
    if (availablePurchasedEntries + availableReferralEntries < 1) {
      throw new Error("This experience requires at least one available entry.");
    }

    const conversationId = randomUUID();
    db.run(
      `
        INSERT INTO navai_public_experience_conversations (
          id,
          experience_id,
          experience_kind,
          experience_slug,
          respondent_user_id,
          respondent_email,
          status,
          started_at,
          updated_at,
          ended_at,
          total_questions_count,
          answered_questions_count,
          audio_storage_path,
          audio_download_url,
          audio_content_type,
          audio_size_bytes,
          audio_duration_ms,
          video_storage_path,
          video_download_url,
          video_content_type,
          video_size_bytes,
          video_duration_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        conversationId,
        experience.id,
        experience.kind,
        experience.slug,
        normalizedRespondentUserId,
        normalizeString(respondentEmail),
        "Open",
        now,
        now,
        "",
        experience.questions.length,
        0,
        "",
        "",
        "",
        0,
        0,
        "",
        "",
        "",
        0,
        0,
      ]
    );

    if (availablePurchasedEntries > 0) {
      appendPurchasedEntryLedgerEntry(db, {
        userId: normalizedRespondentUserId,
        experienceId: experience.id,
        experienceKind: experience.kind,
        experienceSlug: experience.slug,
        conversationId,
        orderId: "",
        reason: "experience_entry",
        deltaEntries: -1,
      });
    } else {
      appendReferralEntryLedgerEntry(db, {
        userId: normalizedRespondentUserId,
        experienceId: experience.id,
        experienceKind: experience.kind,
        experienceSlug: experience.slug,
        conversationId,
        relatedUserId: normalizedRespondentUserId,
        relatedUserEmail: respondentEmail,
        reason: "entry_consumed",
        deltaEntries: -1,
      });
    }

    const conversation = readPublicConversationById(db, conversationId);
    if (!conversation) {
      throw new Error("Conversation was created but could not be loaded.");
    }

    return {
      conversation,
      latestAnswers: [],
      pendingQuestionIds: experience.questions.map((question) => question.id),
    } satisfies NavaiPublicExperienceConversationStartResult;
  });
}

export async function getPublicNavaiExperienceAccessStatus(
  kind: NavaiPanelExperienceKind,
  slug: string,
  respondentUserId: string,
  respondentEmail: string
) {
  await runEndedExperienceRewardsDistributionSweep();
  const normalizedRespondentUserId = validateUserId(respondentUserId);
  const experience = await getPublicWorkspaceExperience(kind, slug);
  if (!experience) {
    throw new Error("Public experience not found.");
  }

  const { db } = await getWorkspaceSqliteState();
  const accessSettings = readWorkspaceExperienceAccessSettings(db, experience.id);

  try {
    assertExperienceCanStartConversation(
      db,
      experience,
      accessSettings,
      normalizedRespondentUserId,
      respondentEmail
    );
  } catch (error) {
    return {
      canStart: false,
      error: error instanceof Error ? error.message : "Could not validate experience access.",
    };
  }

  const todayKey = resolveExperienceAttemptDateKey(new Date().toISOString());
  const attemptRows = readStatementRows(
    db,
    `
      SELECT started_at
      FROM navai_public_experience_conversations
      WHERE experience_id = ? AND respondent_user_id = ?
      ORDER BY started_at DESC
    `,
    [experience.id, normalizedRespondentUserId]
  );
  const attemptsToday = attemptRows.filter(
    (row) => resolveExperienceAttemptDateKey(String(row.started_at ?? "")) === todayKey
  ).length;
  if (attemptsToday >= accessSettings.dailyAttemptLimit) {
    return {
      canStart: false,
      error: "Daily attempt limit reached for this experience.",
    };
  }

  if (readAvailableEntryBalance(db, normalizedRespondentUserId) < 1) {
    return {
      canStart: false,
      error: "This experience requires at least one available entry.",
    };
  }

  return {
    canStart: true,
    error: "",
  };
}

export async function updatePublicNavaiExperienceConversationProgress(
  conversationId: string,
  respondentUserId: string,
  input: NavaiPublicExperienceConversationProgressInput
) {
  const normalizedRespondentUserId = validateUserId(respondentUserId);
  const normalizedConversationId = normalizeString(conversationId);
  if (!normalizedConversationId) {
    throw new Error("Conversation id is required.");
  }

  const normalizedInput = validatePublicConversationProgressInput(input);

  const persisted = await runSerializedMutation((db) => {
    const conversationRow = readFirstRow(
      db,
      `
        SELECT id, experience_id, respondent_user_id
        FROM navai_public_experience_conversations
        WHERE id = ? AND respondent_user_id = ?
      `,
      [normalizedConversationId, normalizedRespondentUserId]
    );
    if (!conversationRow) {
      throw new Error("Conversation not found.");
    }

    const now = new Date().toISOString();

    for (const turn of normalizedInput.turns) {
      const existingTurn = readFirstRow(
        db,
        `
          SELECT id
          FROM navai_public_experience_conversation_turns
          WHERE conversation_id = ? AND client_turn_id = ?
        `,
        [normalizedConversationId, turn.clientTurnId]
      );
      if (existingTurn) {
        continue;
      }

      db.run(
        `
          INSERT INTO navai_public_experience_conversation_turns (
            id,
            conversation_id,
            client_turn_id,
            role,
            transcript,
            source_event_type,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          randomUUID(),
          normalizedConversationId,
          turn.clientTurnId,
          turn.role,
          turn.transcript,
          turn.sourceEventType,
          now,
        ]
      );
    }

    for (const answer of normalizedInput.answers) {
      const existingAnswer = readFirstRow(
        db,
        `
          SELECT id, created_at
          FROM navai_public_experience_conversation_answers
          WHERE conversation_id = ? AND question_id = ?
        `,
        [normalizedConversationId, answer.questionId]
      );

      if (existingAnswer) {
        db.run(
          `
            UPDATE navai_public_experience_conversation_answers
            SET
              question_text = ?,
              answer_text = ?,
              ai_score = 0,
              ai_feedback = '',
              ai_scored_at = '',
              updated_at = ?
            WHERE id = ?
          `,
          [answer.questionText, answer.answerText, now, String(existingAnswer.id ?? "")]
        );
        continue;
      }

      db.run(
        `
          INSERT INTO navai_public_experience_conversation_answers (
            id,
            conversation_id,
            question_id,
            question_text,
            answer_text,
            ai_score,
            ai_feedback,
            ai_scored_at,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          randomUUID(),
          normalizedConversationId,
          answer.questionId,
          answer.questionText,
          answer.answerText,
          0,
          "",
          "",
          now,
          now,
        ]
      );
    }

    const currentAnswerCountRow = readFirstRow(
      db,
      `
        SELECT COUNT(*) AS count
        FROM navai_public_experience_conversation_answers
        WHERE conversation_id = ?
      `,
      [normalizedConversationId]
    );
    const answeredQuestionsCount = normalizeInteger(currentAnswerCountRow?.count);
    const status = normalizedInput.status ?? "Open";
    const endedAt = status === "Open" ? "" : now;

    db.run(
      `
        UPDATE navai_public_experience_conversations
        SET
          status = ?,
          updated_at = ?,
          ended_at = ?,
          answered_questions_count = ?,
          audio_storage_path = ?,
          audio_download_url = ?,
          audio_content_type = ?,
          audio_size_bytes = ?,
          audio_duration_ms = ?,
          video_storage_path = ?,
          video_download_url = ?,
          video_content_type = ?,
          video_size_bytes = ?,
          video_duration_ms = ?
        WHERE id = ?
      `,
      [
        status,
        now,
        endedAt,
        answeredQuestionsCount,
        normalizedInput.audio?.storagePath ?? "",
        normalizedInput.audio?.downloadUrl ?? "",
        normalizedInput.audio?.contentType ?? "",
        normalizedInput.audio?.sizeBytes ?? 0,
        normalizedInput.audio?.durationMs ?? 0,
        normalizedInput.video?.storagePath ?? "",
        normalizedInput.video?.downloadUrl ?? "",
        normalizedInput.video?.contentType ?? "",
        normalizedInput.video?.sizeBytes ?? 0,
        normalizedInput.video?.durationMs ?? 0,
        normalizedConversationId,
      ]
    );

    const updatedConversation = readPublicConversationById(db, normalizedConversationId);
    if (!updatedConversation) {
      throw new Error("Conversation was updated but could not be loaded.");
    }

    return {
      conversation: updatedConversation,
      latestAnswers: updatedConversation.answers,
    };
  });

  if (normalizedInput.answers.length === 0) {
    return persisted;
  }

  const { db } = await getWorkspaceSqliteState();
  const conversation = readPublicConversationById(db, normalizedConversationId);
  if (!conversation || conversation.respondentUserId !== normalizedRespondentUserId) {
    return persisted;
  }

  const experience = readWorkspaceExperienceQuestionsForConversation(db, conversation);
  if (!experience.delegateAiGrading) {
    return persisted;
  }

  try {
    const updatedConversation = await gradeConversationAnswers(conversation, experience, {
      forceAll: false,
    });
    return {
      conversation: updatedConversation,
      latestAnswers: updatedConversation.answers,
    };
  } catch (error) {
    console.error("[navai panel] automatic AI grading failed", error);
    return persisted;
  }
}

async function gradeConversationAnswers(
  conversation: NavaiPublicExperienceConversationRecord,
  experience: {
    experienceName: string;
    questions: NavaiPanelEvaluationQuestionRecord[];
  },
  options: { forceAll: boolean }
) {
  const answersToGrade = resolveAnswersToGrade(conversation, experience, options);
  if (answersToGrade.length === 0) {
    return conversation;
  }

  const grades = await gradeExperienceAnswersWithAi({
    kind: conversation.experienceKind,
    experienceName: experience.experienceName,
    answers: answersToGrade,
  });

  if (grades.length === 0) {
    return conversation;
  }

  const gradesByQuestionId = new Map(
    grades.map((grade) => [grade.questionId, grade] as const)
  );
  const scoredAt = new Date().toISOString();

  return runSerializedMutation((db) => {
    persistConversationAnswerGrades(
      db,
      conversation.id,
      conversation.answers
        .map((answer) => {
          const grade = gradesByQuestionId.get(answer.questionId);
          if (!grade) {
            return null;
          }

          return {
            questionId: answer.questionId,
            score: grade.score,
            feedback: grade.feedback,
            scoredAt,
          };
        })
        .filter(
          (
            item
          ): item is {
            questionId: string;
            score: number;
            feedback: string;
            scoredAt: string;
          } => Boolean(item)
        )
    );

    const updatedConversation = readPublicConversationById(db, conversation.id);
    if (!updatedConversation) {
      throw new Error("Conversation was graded but could not be loaded.");
    }

    return updatedConversation;
  });
}

async function gradePublicConversationAnswersForRespondent(
  conversationId: string,
  respondentUserId: string
) {
  const normalizedConversationId = normalizeString(conversationId);
  const normalizedRespondentUserId = validateUserId(respondentUserId);
  const { db } = await getWorkspaceSqliteState();
  const conversation = readPublicConversationById(db, normalizedConversationId);
  if (!conversation || conversation.respondentUserId !== normalizedRespondentUserId) {
    throw new Error("Conversation not found.");
  }

  const experience = readWorkspaceExperienceQuestionsForConversation(db, conversation);
  return gradeConversationAnswers(conversation, experience, { forceAll: false }).then((updated) => ({
    conversation: updated,
    latestAnswers: updated.answers,
  }));
}

async function getWorkspaceConversationForGrading(
  userId: string,
  kind: NavaiPanelExperienceKind,
  experienceId: string,
  conversationId: string
) {
  const normalizedUserId = validateUserId(userId);
  const normalizedConversationId = normalizeString(conversationId);
  if (!normalizedConversationId) {
    throw new Error("Conversation id is required.");
  }

  const experience = await getWorkspaceExperienceById(normalizedUserId, kind, experienceId);
  if (!experience) {
    throw new Error("Experience not found.");
  }

  const { db } = await getWorkspaceSqliteState();
  const conversation = readPublicConversationById(db, normalizedConversationId);
  if (
    !conversation ||
    conversation.experienceId !== experience.id ||
    conversation.experienceKind !== kind
  ) {
    throw new Error("Conversation not found.");
  }

  return {
    conversation,
    experience: {
      experienceName: experience.name,
      questions: experience.questions,
    },
  };
}

async function gradeWorkspaceExperienceConversation(
  userId: string,
  kind: NavaiPanelExperienceKind,
  experienceId: string,
  conversationId: string
) {
  const payload = await getWorkspaceConversationForGrading(
    userId,
    kind,
    experienceId,
    conversationId
  );
  return gradeConversationAnswers(payload.conversation, payload.experience, {
    forceAll: true,
  });
}

export async function gradeNavaiPanelEvaluationResponse(
  userId: string,
  experienceId: string,
  conversationId: string
) {
  return gradeWorkspaceExperienceConversation(
    userId,
    "evaluation",
    experienceId,
    conversationId
  );
}

export async function gradeNavaiPanelSurveyResponse(
  userId: string,
  experienceId: string,
  conversationId: string
) {
  return gradeWorkspaceExperienceConversation(
    userId,
    "survey",
    experienceId,
    conversationId
  );
}

export async function listNavaiPanelEvaluationResponses(userId: string, experienceId: string) {
  return listWorkspaceExperienceConversations(userId, "evaluation", experienceId);
}

export async function listNavaiPanelSurveyResponses(userId: string, experienceId: string) {
  return listWorkspaceExperienceConversations(userId, "survey", experienceId);
}

export async function listNavaiPanelSupportTickets(actor: NavaiPanelActor) {
  const normalizedUserId = validateUserId(actor.uid);
  const { db } = await getWorkspaceSqliteState();
  const canViewAllTickets = isNavaiPanelSupportActor(actor);
  const ticketRows = readStatementRows(
    db,
    `
      SELECT id, user_id, requester_email, subject, channel, category, priority, status, created_at, updated_at
      FROM navai_support_tickets
      ${canViewAllTickets ? "" : "WHERE user_id = ?"}
      ORDER BY created_at ASC, updated_at ASC
    `,
    canViewAllTickets ? [] : [normalizedUserId]
  );

  return ticketRows.map((row) => {
    const messages = readStatementRows(
      db,
      `
        SELECT id, ticket_id, author, author_role, body, created_at
        FROM navai_support_messages
        WHERE ticket_id = ?
        ORDER BY created_at ASC
      `,
      [String(row.id ?? "")]
    ).map((messageRow) => {
      const message = mapSupportMessageRow(messageRow);
      return {
        ...message,
        attachments: readSupportMessageAttachmentsByMessageId(db, message.id),
      } satisfies NavaiPanelSupportMessageRecord;
    });

    const requesterProfile = buildResolvedUserProfile(
      readUserProfileByUserId(db, String(row.user_id ?? "")),
      {
        userId: String(row.user_id ?? ""),
        email: String(row.requester_email ?? ""),
      }
    );

    return mapSupportTicketRow(row, messages, requesterProfile);
  });
}

export async function getNavaiPanelDashboardSummary(
  actor: NavaiPanelActor
): Promise<NavaiPanelDashboardSummary> {
  const normalizedUserId = validateUserId(actor.uid);
  const [domains, evaluations, surveys, tickets] = await Promise.all([
    listNavaiPanelDomains(normalizedUserId),
    listNavaiPanelEvaluations(normalizedUserId),
    listNavaiPanelSurveys(normalizedUserId),
    listNavaiPanelSupportTickets(actor),
  ]);

  return {
    domainsCount: domains.length,
    evaluationsCount: evaluations.length,
    surveyResponsesCount: surveys.reduce((total, item) => total + item.conversations, 0),
    openTicketsCount: tickets.filter((ticket) => ticket.status !== "Solved").length,
  };
}

export async function createNavaiPanelSupportTicket(
  actor: NavaiPanelActor,
  input: NavaiPanelSupportTicketInput
) {
  const normalizedUserId = validateUserId(actor.uid);
  const subject = normalizeString(input.subject);
  if (!subject) {
    throw new Error("Ticket subject is required.");
  }

  const channel = normalizeString(input.channel) || "Web";
  const category = normalizeString(input.category) || "General";
  const priority = normalizeString(input.priority) || "Medium";
  const message = normalizeString(input.message);
  const attachments = normalizeSupportAttachmentsInput(input.attachments);

  const ticketId = await runSerializedMutation((db) => {
    const now = new Date().toISOString();
    const nextTicketId = randomUUID();
    db.run(
      `
        INSERT INTO navai_support_tickets (
          id, user_id, requester_email, subject, channel, category, priority, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        nextTicketId,
        normalizedUserId,
        actor.email,
        subject,
        channel,
        category,
        priority,
        "Open",
        now,
        now,
      ]
    );

    if (message || attachments.length > 0) {
      const nextMessageId = randomUUID();
      db.run(
        `
          INSERT INTO navai_support_messages (
            id, ticket_id, author, author_role, body, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          nextMessageId,
          nextTicketId,
          getNavaiPanelMessageAuthor(actor),
          getNavaiPanelMessageAuthorRole(actor),
          message,
          now,
        ]
      );

      for (const attachment of attachments) {
        db.run(
          `
            INSERT INTO navai_support_message_attachments (
              id, message_id, kind, asset_id, url, file_name, content_type, size_bytes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            randomUUID(),
            nextMessageId,
            attachment.kind,
            attachment.assetId,
            attachment.url,
            attachment.fileName,
            attachment.contentType,
            attachment.sizeBytes,
            now,
          ]
        );
      }
    }

    return nextTicketId;
  });

  const tickets = await listNavaiPanelSupportTickets(actor);
  const ticket = tickets.find((item) => item.id === ticketId);
  if (!ticket) {
    throw new Error("Ticket was created but could not be loaded.");
  }

  return ticket;
}

export async function createNavaiPanelSupportMessage(
  actor: NavaiPanelActor,
  ticketId: string,
  input: NavaiPanelSupportMessageInput
) {
  const normalizedUserId = validateUserId(actor.uid);
  const normalizedTicketId = normalizeString(ticketId);
  if (!normalizedTicketId) {
    throw new Error("Ticket id is required.");
  }

  const body = normalizeString(input.body);
  const attachments = normalizeSupportAttachmentsInput(input.attachments);
  if (!body && attachments.length === 0) {
    throw new Error("Message body is required.");
  }

  await runSerializedMutation((db) => {
    const existingTicket = readFirstRow(
      db,
      isNavaiPanelSupportActor(actor)
        ? "SELECT id FROM navai_support_tickets WHERE id = ?"
        : "SELECT id FROM navai_support_tickets WHERE user_id = ? AND id = ?",
      isNavaiPanelSupportActor(actor) ? [normalizedTicketId] : [normalizedUserId, normalizedTicketId]
    );
    if (!existingTicket) {
      throw new Error("Ticket not found.");
    }

    const now = new Date().toISOString();
    const messageId = randomUUID();
    db.run(
      `
        INSERT INTO navai_support_messages (
          id, ticket_id, author, author_role, body, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        messageId,
        normalizedTicketId,
        getNavaiPanelMessageAuthor(actor),
        getNavaiPanelMessageAuthorRole(actor),
        body,
        now,
      ]
    );
    for (const attachment of attachments) {
      db.run(
        `
          INSERT INTO navai_support_message_attachments (
            id, message_id, kind, asset_id, url, file_name, content_type, size_bytes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          randomUUID(),
          messageId,
          attachment.kind,
          attachment.assetId,
          attachment.url,
          attachment.fileName,
          attachment.contentType,
          attachment.sizeBytes,
          now,
        ]
      );
    }
    db.run(
      "UPDATE navai_support_tickets SET updated_at = ?, status = ? WHERE id = ?",
      [now, "Open", normalizedTicketId]
    );
  });

  const tickets = await listNavaiPanelSupportTickets(actor);
  const ticket = tickets.find((item) => item.id === normalizedTicketId);
  if (!ticket) {
    throw new Error("Ticket was updated but could not be loaded.");
  }

  return ticket;
}

type NavaiEntryTotalsRecord = {
  earnedEntries: number;
  consumedEntries: number;
  availableEntries: number;
};

function mapEntryOrderRow(row: Record<string, unknown>): NavaiEntryOrderRecord {
  const environment =
    String(row.environment ?? "") === "production" ? "production" : "sandbox";
  const wompiStatus = normalizeString(row.wompi_status);
  const baseStatus = normalizeString(row.status) || "created";
  const packageKey = normalizeEntryPackageKey(row.package_key);
  const entriesCount = Math.max(1, normalizePositiveInteger(row.entries_count, 1));

  return {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    userEmail: String(row.user_email ?? ""),
    product: String(row.plan ?? packageKey) || packageKey,
    productName: normalizeString(row.product_name) || NAVAI_ENTRY_PRODUCT_NAME,
    packageKey,
    entriesCount,
    unitPriceUsd: normalizeEntryPriceUsd(row.unit_price_usd, NAVAI_DEFAULT_ENTRY_PACKAGE_PRICE_USD),
    vatPercentage: normalizeVatPercentage(
      row.vat_percentage,
      NAVAI_DEFAULT_ENTRY_PACKAGE_VAT_PERCENTAGE
    ),
    environment,
    currency: String(row.currency ?? NAVAI_ENTRY_CURRENCY) || NAVAI_ENTRY_CURRENCY,
    amountCents: normalizeInteger(row.amount_cents),
    status: wompiStatus || baseStatus,
    checkoutUrl: String(row.checkout_url ?? ""),
    wompiLinkId: String(row.wompi_link_id ?? ""),
    referralCode: normalizeReferralCode(row.referral_code),
    referrerUserId: String(row.referrer_user_id ?? ""),
    wompiTransactionId: String(row.wompi_transaction_id ?? ""),
    wompiStatus,
    wompiReference: String(row.wompi_reference ?? ""),
    wompiEmail: String(row.wompi_email ?? ""),
    confirmedAt: String(row.confirmed_at ?? ""),
    creditedAt: String(row.activated_at ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapEntryPackageRow(
  row: Record<string, unknown>,
  exchangeRate: NavaiCurrencyExchangeRateRecord
): NavaiEntryPackageRecord {
  const key = normalizeEntryPackageKey(row.key);
  const priceUsd = normalizeEntryPriceUsd(
    row.price_usd,
    NAVAI_DEFAULT_ENTRY_PACKAGE_PRICE_USD
  );
  const vatPercentage = normalizeVatPercentage(
    row.vat_percentage,
    NAVAI_DEFAULT_ENTRY_PACKAGE_VAT_PERCENTAGE
  );
  const pricing = buildEntryPackagePricing(priceUsd, vatPercentage, exchangeRate.rate);

  return {
    key,
    name: normalizeString(row.name) || NAVAI_ENTRY_PRODUCT_NAME,
    description: normalizeString(row.description),
    entriesCount: Math.max(1, normalizePositiveInteger(row.entries_count, 1)),
    priceUsd,
    vatPercentage,
    subtotalUsd: pricing.subtotalUsd,
    taxUsd: pricing.taxUsd,
    totalUsd: pricing.totalUsd,
    subtotalCopCents: pricing.subtotalCopCents,
    taxCopCents: pricing.taxCopCents,
    totalCopCents: pricing.totalCopCents,
    currency: NAVAI_ENTRY_CURRENCY,
    isActive: normalizeBooleanWithFallback(row.is_active, true),
    sortOrder: normalizeInteger(row.sort_order),
    updatedAt: normalizeString(row.updated_at),
  };
}

function mapReferralRow(row: Record<string, unknown>): NavaiReferralRecord {
  const normalizedStatus = normalizeString(row.status).toLowerCase();
  const status =
    normalizedStatus === "rewarded"
      ? "rewarded"
      : normalizedStatus === "rejected"
        ? "rejected"
        : "pending";

  return {
    id: String(row.id ?? ""),
    referrerUserId: String(row.referrer_user_id ?? ""),
    referrerCode: normalizeReferralCode(row.referrer_code),
    referredUserId: String(row.referred_user_id ?? ""),
    referredEmail: normalizeEmailAddress(row.referred_email),
    sourceOrderId: String(row.source_order_id ?? ""),
    status,
    rewardEntries: normalizeInteger(row.reward_credits),
    rewardAppliedAt: String(row.reward_applied_at ?? ""),
    rejectionReason: String(row.rejection_reason ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapReferralEntryLedgerRow(
  row: Record<string, unknown>
): NavaiReferralEntryLedgerRecord {
  const normalizedReason = normalizeString(row.reason).toLowerCase();
  const reason =
    normalizedReason === "entry_consumed" || normalizedReason === "daily_limit_bypass"
      ? "entry_consumed"
      : normalizedReason === "manual_adjustment"
        ? "manual_adjustment"
        : "referral_reward";

  return {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    referralId: String(row.referral_id ?? ""),
    orderId: String(row.order_id ?? ""),
    experienceId: String(row.experience_id ?? ""),
    experienceKind: normalizeString(row.experience_kind) === "survey" ? "survey" : normalizeString(row.experience_kind) === "evaluation" ? "evaluation" : "",
    experienceSlug: String(row.experience_slug ?? ""),
    conversationId: String(row.conversation_id ?? ""),
    relatedUserId: String(row.related_user_id ?? ""),
    relatedUserEmail: normalizeEmailAddress(row.related_user_email),
    reason,
    deltaEntries: normalizeInteger(row.delta_credits),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapPointsCashoutPaymentSettingsRow(
  row: Record<string, unknown> | null
): NavaiPointsCashoutPaymentSettingsRecord | null {
  if (!row) {
    return null;
  }

  return {
    userId: String(row.user_id ?? ""),
    paymentMethod: normalizePointsCashoutPaymentMethod(row.payment_method),
    accountHolder: String(row.account_holder ?? ""),
    accountReference: String(row.account_reference ?? ""),
    notes: String(row.notes ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapPointsCashoutRequestRow(
  row: Record<string, unknown>
): NavaiPointsCashoutRequestRecord {
  return {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    userEmail: normalizeEmailAddress(row.user_email),
    status: normalizePointsCashoutStatus(row.status),
    requestedPoints: normalizePointAmount(row.requested_points, 0),
    requestedAmountCop: normalizeInteger(row.requested_amount_cop),
    paymentMethod: normalizePointsCashoutPaymentMethod(row.payment_method),
    accountHolder: String(row.account_holder ?? ""),
    accountReference: String(row.account_reference ?? ""),
    notes: String(row.notes ?? ""),
    responseMessage: String(row.response_message ?? ""),
    processedAt: String(row.processed_at ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapPointsLedgerRow(row: Record<string, unknown>): NavaiPointsLedgerRecord {
  const normalizedReason = normalizeString(row.reason).toLowerCase();
  const reason: NavaiPointsLedgerReason =
    normalizedReason === "cashout_request"
      ? "cashout_request"
      : normalizedReason === "cashout_reverted"
        ? "cashout_reverted"
        : normalizedReason === "manual_adjustment"
          ? "manual_adjustment"
          : "experience_reward";

  return {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    experienceId: String(row.experience_id ?? ""),
    experienceKind:
      normalizeString(row.experience_kind) === "survey"
        ? "survey"
        : normalizeString(row.experience_kind) === "evaluation"
          ? "evaluation"
          : "",
    experienceSlug: String(row.experience_slug ?? ""),
    relatedCashoutId: String(row.related_cashout_id ?? ""),
    relatedDistributionId: String(row.related_distribution_id ?? ""),
    relatedUserId: String(row.related_user_id ?? ""),
    relatedUserEmail: normalizeEmailAddress(row.related_user_email),
    reason,
    deltaPoints: normalizeInteger(row.delta_points),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapPointsRewardDistributionRow(
  row: Record<string, unknown>
): NavaiPointsRewardDistributionRecord {
  return {
    id: String(row.id ?? ""),
    experienceId: String(row.experience_id ?? ""),
    experienceKind:
      normalizeString(row.experience_kind) === "survey" ? "survey" : "evaluation",
    experienceSlug: String(row.experience_slug ?? ""),
    winnerUserId: String(row.winner_user_id ?? ""),
    winnerEmail: normalizeEmailAddress(row.winner_email),
    winnerRank: normalizePositiveInteger(row.winner_rank, 1),
    awardedPoints: normalizePointAmount(row.awarded_points, 0),
    awardedAmountCop: normalizeInteger(row.awarded_amount_cop),
    createdAt: String(row.created_at ?? ""),
  };
}

function doesReferralCodeExist(db: SqlJsDatabase, code: string, excludedUserId = "") {
  const normalizedCode = normalizeReferralCode(code);
  if (!normalizedCode) {
    return false;
  }

  const row = readFirstRow(
    db,
    `
      SELECT user_id
      FROM navai_referral_codes
      WHERE code = ?
        ${excludedUserId ? "AND user_id <> ?" : ""}
      LIMIT 1
    `,
    excludedUserId ? [normalizedCode, excludedUserId] : [normalizedCode]
  );

  return Boolean(row);
}

function generateUniqueReferralCode(db: SqlJsDatabase, excludedUserId = "") {
  for (let attempts = 0; attempts < 100; attempts += 1) {
    const candidate = generateRandomReferralCode();
    if (!doesReferralCodeExist(db, candidate, excludedUserId)) {
      return candidate;
    }
  }

  throw new Error("Could not generate a unique referral code.");
}

function readReferralCodeByUserId(db: SqlJsDatabase, userId: string) {
  const row = readFirstRow(
    db,
    `
      SELECT
        user_id,
        code,
        created_at,
        updated_at
      FROM navai_referral_codes
      WHERE user_id = ?
    `,
    [userId]
  );

  if (!row) {
    return null;
  }

  return {
    userId: String(row.user_id ?? ""),
    code: normalizeReferralCode(row.code),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function readReferralCodeOwnerByCode(db: SqlJsDatabase, code: string) {
  const normalizedCode = normalizeReferralCode(code);
  if (!normalizedCode) {
    return null;
  }

  const row = readFirstRow(
    db,
    `
      SELECT
        user_id,
        code
      FROM navai_referral_codes
      WHERE code = ?
      LIMIT 1
    `,
    [normalizedCode]
  );

  if (!row) {
    return null;
  }

  return {
    userId: String(row.user_id ?? ""),
    code: normalizeReferralCode(row.code),
  };
}

function ensureReferralCodeExists(db: SqlJsDatabase, userId: string) {
  const existing = readReferralCodeByUserId(db, userId);
  if (existing?.code) {
    return existing.code;
  }

  const now = new Date().toISOString();
  const code = generateUniqueReferralCode(db, userId);
  db.run(
    `
      INSERT INTO navai_referral_codes (
        user_id,
        code,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        code = excluded.code,
        updated_at = excluded.updated_at
    `,
    [userId, code, existing?.createdAt || now, now]
  );

  return code;
}

function readReferralByReferredUserId(db: SqlJsDatabase, userId: string) {
  const row = readFirstRow(
    db,
    `
      SELECT
        id,
        referrer_user_id,
        referrer_code,
        referred_user_id,
        referred_email,
        source_order_id,
        status,
        reward_credits,
        reward_applied_at,
        rejection_reason,
        created_at,
        updated_at
      FROM navai_referrals
      WHERE referred_user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  return row ? mapReferralRow(row) : null;
}

function listReferralsByReferrerUserId(
  db: SqlJsDatabase,
  userId: string,
  options: { limit?: number } = {}
) {
  const limit = Math.max(1, options.limit ?? 200);
  const rows = readStatementRows(
    db,
    `
      SELECT
        id,
        referrer_user_id,
        referrer_code,
        referred_user_id,
        referred_email,
        source_order_id,
        status,
        reward_credits,
        reward_applied_at,
        rejection_reason,
        created_at,
        updated_at
      FROM navai_referrals
      WHERE referrer_user_id = ?
      ORDER BY created_at DESC, updated_at DESC
      LIMIT ${limit}
    `,
    [userId]
  );

  return rows.map((row) => mapReferralRow(row));
}

function listReferralEntryLedgerByUserId(
  db: SqlJsDatabase,
  userId: string,
  options: { limit?: number } = {}
) {
  const limit = Math.max(1, options.limit ?? 300);
  const rows = readStatementRows(
    db,
    `
      SELECT
        id,
        user_id,
        referral_id,
        order_id,
        experience_id,
        experience_kind,
        experience_slug,
        conversation_id,
        related_user_id,
        related_user_email,
        reason,
        delta_credits,
        created_at
      FROM navai_referral_credit_ledger
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ${limit}
    `,
    [userId]
  );

  return rows.map((row) => mapReferralEntryLedgerRow(row));
}

function readReferralEntryTotals(db: SqlJsDatabase, userId: string): NavaiEntryTotalsRecord {
  const row = readFirstRow(
    db,
    `
      SELECT
        COALESCE(SUM(CASE WHEN delta_credits > 0 THEN delta_credits ELSE 0 END), 0) AS earned_credits,
        COALESCE(SUM(CASE WHEN delta_credits < 0 THEN ABS(delta_credits) ELSE 0 END), 0) AS consumed_credits,
        COALESCE(SUM(delta_credits), 0) AS available_credits
      FROM navai_referral_credit_ledger
      WHERE user_id = ?
    `,
    [userId]
  );

  return {
    earnedEntries: normalizeInteger(row?.earned_credits),
    consumedEntries: normalizeInteger(row?.consumed_credits),
    availableEntries: normalizeInteger(row?.available_credits),
  };
}

function appendReferralEntryLedgerEntry(
  db: SqlJsDatabase,
  input: {
    userId: string;
    referralId?: string;
    orderId?: string;
    experienceId?: string;
    experienceKind?: NavaiPanelExperienceKind | "";
    experienceSlug?: string;
    conversationId?: string;
    relatedUserId?: string;
    relatedUserEmail?: string;
    reason: NavaiReferralEntryLedgerRecord["reason"];
    deltaEntries: number;
  }
) {
  const normalizedUserId = validateUserId(input.userId);
  const deltaEntries = normalizeInteger(input.deltaEntries);
  if (!deltaEntries) {
    return null;
  }

  const createdAt = new Date().toISOString();
  const entryId = randomUUID();
  db.run(
    `
      INSERT INTO navai_referral_credit_ledger (
        id,
        user_id,
        referral_id,
        order_id,
        experience_id,
        experience_kind,
        experience_slug,
        conversation_id,
        related_user_id,
        related_user_email,
        reason,
        delta_credits,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      entryId,
      normalizedUserId,
      normalizeString(input.referralId),
      normalizeString(input.orderId),
      normalizeString(input.experienceId),
      input.experienceKind === "survey"
        ? "survey"
        : input.experienceKind === "evaluation"
          ? "evaluation"
          : "",
      normalizeString(input.experienceSlug),
      normalizeString(input.conversationId),
      normalizeString(input.relatedUserId),
      normalizeEmailAddress(input.relatedUserEmail),
      input.reason,
      deltaEntries,
      createdAt,
    ]
  );

  return entryId;
}

type NavaiPointsTotalsRecord = {
  earnedPoints: number;
  redeemedPoints: number;
  pendingRedeemPoints: number;
  availablePoints: number;
};

function readPointsTotals(db: SqlJsDatabase, userId: string): NavaiPointsTotalsRecord {
  const ledgerRow = readFirstRow(
    db,
    `
      SELECT
        COALESCE(SUM(CASE WHEN delta_points > 0 THEN delta_points ELSE 0 END), 0) AS earned_points,
        COALESCE(SUM(delta_points), 0) AS available_points
      FROM navai_points_ledger
      WHERE user_id = ?
    `,
    [userId]
  );

  const cashoutRow = readFirstRow(
    db,
    `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN status = 'pending' OR status = 'processing'
                THEN requested_points
              ELSE 0
            END
          ),
          0
        ) AS pending_points,
        COALESCE(
          SUM(
            CASE
              WHEN status = 'paid'
                THEN requested_points
              ELSE 0
            END
          ),
          0
        ) AS paid_points
      FROM navai_points_cashout_requests
      WHERE user_id = ?
    `,
    [userId]
  );

  const earnedPoints = normalizePointAmount(ledgerRow?.earned_points, 0);
  const pendingRedeemPoints = normalizePointAmount(cashoutRow?.pending_points, 0);
  const paidRedeemPoints = normalizePointAmount(cashoutRow?.paid_points, 0);
  const redeemedPoints = paidRedeemPoints + pendingRedeemPoints;
  const availablePoints = normalizeInteger(ledgerRow?.available_points);

  return {
    earnedPoints,
    redeemedPoints,
    pendingRedeemPoints,
    availablePoints: Math.max(0, availablePoints),
  };
}

function appendPointsLedgerEntry(
  db: SqlJsDatabase,
  input: {
    userId: string;
    experienceId?: string;
    experienceKind?: NavaiPanelExperienceKind | "";
    experienceSlug?: string;
    relatedCashoutId?: string;
    relatedDistributionId?: string;
    relatedUserId?: string;
    relatedUserEmail?: string;
    reason: NavaiPointsLedgerReason;
    deltaPoints: number;
  }
) {
  const normalizedUserId = validateUserId(input.userId);
  const deltaPoints = normalizeInteger(input.deltaPoints);
  if (!deltaPoints) {
    return null;
  }

  const createdAt = new Date().toISOString();
  const entryId = randomUUID();
  db.run(
    `
      INSERT INTO navai_points_ledger (
        id,
        user_id,
        experience_id,
        experience_kind,
        experience_slug,
        related_cashout_id,
        related_distribution_id,
        related_user_id,
        related_user_email,
        reason,
        delta_points,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      entryId,
      normalizedUserId,
      normalizeString(input.experienceId),
      input.experienceKind === "survey"
        ? "survey"
        : input.experienceKind === "evaluation"
          ? "evaluation"
          : "",
      normalizeString(input.experienceSlug),
      normalizeString(input.relatedCashoutId),
      normalizeString(input.relatedDistributionId),
      normalizeString(input.relatedUserId),
      normalizeEmailAddress(input.relatedUserEmail),
      input.reason,
      deltaPoints,
      createdAt,
    ]
  );

  return entryId;
}

function listPointsLedgerByUserId(
  db: SqlJsDatabase,
  userId: string,
  options: { limit?: number } = {}
) {
  const limit = Math.max(1, options.limit ?? 300);
  const rows = readStatementRows(
    db,
    `
      SELECT
        id,
        user_id,
        experience_id,
        experience_kind,
        experience_slug,
        related_cashout_id,
        related_distribution_id,
        related_user_id,
        related_user_email,
        reason,
        delta_points,
        created_at
      FROM navai_points_ledger
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ${limit}
    `,
    [userId]
  );

  return rows.map((row) => mapPointsLedgerRow(row));
}

function readPointsCashoutPaymentSettingsByUserId(db: SqlJsDatabase, userId: string) {
  const row = readFirstRow(
    db,
    `
      SELECT
        user_id,
        payment_method,
        account_holder,
        account_reference,
        notes,
        updated_at
      FROM navai_points_cashout_payment_settings
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  return mapPointsCashoutPaymentSettingsRow(row);
}

function listPointsCashoutRequestsByUserId(
  db: SqlJsDatabase,
  userId: string,
  options: { limit?: number } = {}
) {
  const limit = Math.max(1, options.limit ?? 200);
  const rows = readStatementRows(
    db,
    `
      SELECT
        requests.id,
        requests.user_id,
        COALESCE(profiles.email, '') AS user_email,
        requests.status,
        requests.requested_points,
        requests.requested_amount_cop,
        requests.payment_method,
        requests.account_holder,
        requests.account_reference,
        requests.notes,
        requests.response_message,
        requests.processed_at,
        requests.created_at,
        requests.updated_at
      FROM navai_points_cashout_requests AS requests
      LEFT JOIN navai_user_profiles AS profiles
        ON profiles.user_id = requests.user_id
      WHERE requests.user_id = ?
      ORDER BY requests.created_at DESC
      LIMIT ${limit}
    `,
    [userId]
  );

  return rows.map((row) => mapPointsCashoutRequestRow(row));
}

function listPointsCashoutRequests(
  db: SqlJsDatabase,
  options: { limit?: number; status?: NavaiPointsCashoutStatus | "" } = {}
) {
  const limit = Math.max(1, options.limit ?? 300);
  const normalizedStatus = normalizePointsCashoutStatus(options.status);
  const hasStatusFilter = Boolean(options.status);
  const rows = readStatementRows(
    db,
    `
      SELECT
        requests.id,
        requests.user_id,
        COALESCE(profiles.email, '') AS user_email,
        requests.status,
        requests.requested_points,
        requests.requested_amount_cop,
        requests.payment_method,
        requests.account_holder,
        requests.account_reference,
        requests.notes,
        requests.response_message,
        requests.processed_at,
        requests.created_at,
        requests.updated_at
      FROM navai_points_cashout_requests AS requests
      LEFT JOIN navai_user_profiles AS profiles
        ON profiles.user_id = requests.user_id
      ${hasStatusFilter ? "WHERE requests.status = ?" : ""}
      ORDER BY requests.created_at ASC, requests.updated_at ASC
      LIMIT ${limit}
    `,
    hasStatusFilter ? [normalizedStatus] : []
  );

  return rows.map((row) => mapPointsCashoutRequestRow(row));
}

function readPointsCashoutRequestById(db: SqlJsDatabase, requestId: string) {
  const normalizedId = normalizeString(requestId);
  if (!normalizedId) {
    return null;
  }

  const row = readFirstRow(
    db,
    `
      SELECT
        requests.id,
        requests.user_id,
        COALESCE(profiles.email, '') AS user_email,
        requests.status,
        requests.requested_points,
        requests.requested_amount_cop,
        requests.payment_method,
        requests.account_holder,
        requests.account_reference,
        requests.notes,
        requests.response_message,
        requests.processed_at,
        requests.created_at,
        requests.updated_at
      FROM navai_points_cashout_requests AS requests
      LEFT JOIN navai_user_profiles AS profiles
        ON profiles.user_id = requests.user_id
      WHERE requests.id = ?
      LIMIT 1
    `,
    [normalizedId]
  );

  return row ? mapPointsCashoutRequestRow(row) : null;
}

function readPurchasedEntryTotals(
  db: SqlJsDatabase,
  userId: string
): NavaiEntryTotalsRecord {
  const row = readFirstRow(
    db,
    `
      SELECT
        COALESCE(SUM(CASE WHEN delta_entries > 0 THEN delta_entries ELSE 0 END), 0) AS earned_entries,
        COALESCE(SUM(CASE WHEN delta_entries < 0 THEN ABS(delta_entries) ELSE 0 END), 0) AS consumed_entries,
        COALESCE(SUM(delta_entries), 0) AS available_entries
      FROM navai_entry_ledger
      WHERE user_id = ?
    `,
    [userId]
  );

  return {
    earnedEntries: normalizeInteger(row?.earned_entries),
    consumedEntries: normalizeInteger(row?.consumed_entries),
    availableEntries: normalizeInteger(row?.available_entries),
  };
}

function readAvailableEntryBalance(db: SqlJsDatabase, userId: string) {
  const purchasedEntries = readPurchasedEntryTotals(db, userId).availableEntries;
  const bonusEntries = readReferralEntryTotals(db, userId).availableEntries;
  return purchasedEntries + bonusEntries;
}

function appendPurchasedEntryLedgerEntry(
  db: SqlJsDatabase,
  input: {
    userId: string;
    orderId?: string;
    experienceId?: string;
    experienceKind?: NavaiPanelExperienceKind | "";
    experienceSlug?: string;
    conversationId?: string;
    reason: "order_purchase" | "experience_entry" | "manual_adjustment";
    deltaEntries: number;
  }
) {
  const normalizedUserId = validateUserId(input.userId);
  const deltaEntries = normalizeInteger(input.deltaEntries);
  if (!deltaEntries) {
    return null;
  }

  const createdAt = new Date().toISOString();
  const entryId = randomUUID();
  db.run(
    `
      INSERT INTO navai_entry_ledger (
        id,
        user_id,
        order_id,
        experience_id,
        experience_kind,
        experience_slug,
        conversation_id,
        reason,
        delta_entries,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      entryId,
      normalizedUserId,
      normalizeString(input.orderId),
      normalizeString(input.experienceId),
      input.experienceKind === "survey"
        ? "survey"
        : input.experienceKind === "evaluation"
          ? "evaluation"
          : "",
      normalizeString(input.experienceSlug),
      normalizeString(input.conversationId),
      input.reason,
      deltaEntries,
      createdAt,
    ]
  );

  return entryId;
}

function updateEntryOrderReferralFields(
  db: SqlJsDatabase,
  orderId: string,
  referralCode: string,
  referrerUserId: string
) {
  const normalizedOrderId = normalizeString(orderId);
  if (!normalizedOrderId) {
    return;
  }

  db.run(
    `
      UPDATE navai_plus_orders
      SET referral_code = ?, referrer_user_id = ?, updated_at = ?
      WHERE id = ?
    `,
    [
      normalizeReferralCode(referralCode),
      normalizeString(referrerUserId),
      new Date().toISOString(),
      normalizedOrderId,
    ]
  );
}

function hasCompletedEntryPurchase(db: SqlJsDatabase, userId: string) {
  const row = readFirstRow(
    db,
    `
      SELECT id
      FROM navai_plus_activations
      WHERE user_id = ?
      LIMIT 1
    `,
    [userId]
  );

  return Boolean(row);
}

function syncReferralRecordWithOrder(
  db: SqlJsDatabase,
  referral: NavaiReferralRecord,
  input: {
    orderId: string;
    referredEmail: string;
  }
) {
  const now = new Date().toISOString();
  db.run(
    `
      UPDATE navai_referrals
      SET
        referred_email = ?,
        source_order_id = CASE
          WHEN source_order_id = '' THEN ?
          ELSE source_order_id
        END,
        updated_at = ?
      WHERE id = ?
    `,
    [
      normalizeEmailAddress(input.referredEmail) || referral.referredEmail,
      normalizeString(input.orderId),
      now,
      referral.id,
    ]
  );
  updateEntryOrderReferralFields(db, input.orderId, referral.referrerCode, referral.referrerUserId);
}

function resolveReferralAttributionForEntryOrder(
  db: SqlJsDatabase,
  input: {
    orderId: string;
    referredUserId: string;
    referredEmail: string;
    referralCode?: string;
    existingOrder?: NavaiEntryOrderRecord | null;
  }
) {
  const normalizedReferredUserId = validateUserId(input.referredUserId);
  const normalizedReferredEmail = normalizeEmailAddress(input.referredEmail);
  const normalizedOrderId = normalizeString(input.orderId);
  const preferredCode =
    normalizeReferralCode(input.referralCode) ||
    normalizeReferralCode(input.existingOrder?.referralCode);
  const existingReferral = readReferralByReferredUserId(db, normalizedReferredUserId);

  if (existingReferral) {
    syncReferralRecordWithOrder(db, existingReferral, {
      orderId: normalizedOrderId,
      referredEmail: normalizedReferredEmail,
    });

    if (preferredCode && preferredCode !== existingReferral.referrerCode) {
      return buildReferralAttribution("already_assigned", {
        code: existingReferral.referrerCode,
        referrerUserId: existingReferral.referrerUserId,
        referralId: existingReferral.id,
      });
    }

    return buildReferralAttribution("accepted", {
      code: existingReferral.referrerCode,
      referrerUserId: existingReferral.referrerUserId,
      referralId: existingReferral.id,
    });
  }

  if (!preferredCode) {
    updateEntryOrderReferralFields(db, normalizedOrderId, "", "");
    return buildReferralAttribution("none");
  }

  const owner = readReferralCodeOwnerByCode(db, preferredCode);
  if (!owner) {
    updateEntryOrderReferralFields(db, normalizedOrderId, "", "");
    return buildReferralAttribution("invalid", { code: preferredCode });
  }

  if (owner.userId === normalizedReferredUserId) {
    updateEntryOrderReferralFields(db, normalizedOrderId, "", "");
    return buildReferralAttribution("self", {
      code: preferredCode,
      referrerUserId: owner.userId,
    });
  }

  if (hasCompletedEntryPurchase(db, normalizedReferredUserId)) {
    updateEntryOrderReferralFields(db, normalizedOrderId, "", "");
    return buildReferralAttribution("ineligible", {
      code: preferredCode,
      referrerUserId: owner.userId,
    });
  }

  const now = new Date().toISOString();
  const referralId = randomUUID();
  db.run(
    `
      INSERT INTO navai_referrals (
        id,
        referrer_user_id,
        referrer_code,
        referred_user_id,
        referred_email,
        source_order_id,
        status,
        reward_credits,
        reward_applied_at,
        rejection_reason,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      referralId,
      owner.userId,
      owner.code,
      normalizedReferredUserId,
      normalizedReferredEmail,
      normalizedOrderId,
      "pending",
      0,
      "",
      "",
      now,
      now,
    ]
  );
  updateEntryOrderReferralFields(db, normalizedOrderId, owner.code, owner.userId);

  return buildReferralAttribution("accepted", {
    code: owner.code,
    referrerUserId: owner.userId,
    referralId,
  });
}

function applyReferralRewardForOrder(db: SqlJsDatabase, order: NavaiEntryOrderRecord) {
  const referral = readReferralByReferredUserId(db, order.userId);
  if (!referral || !referral.referrerUserId || referral.status === "rejected") {
    return false;
  }

  syncReferralRecordWithOrder(db, referral, {
    orderId: order.id,
    referredEmail: order.wompiEmail || order.userEmail,
  });

  const existingRewardEntry = readFirstRow(
    db,
    `
      SELECT id
      FROM navai_referral_credit_ledger
      WHERE referral_id = ? AND reason = 'referral_reward'
      LIMIT 1
    `,
    [referral.id]
  );

  const now = new Date().toISOString();
  if (!existingRewardEntry) {
    appendReferralEntryLedgerEntry(db, {
      userId: referral.referrerUserId,
      referralId: referral.id,
      orderId: order.id,
      relatedUserId: order.userId,
      relatedUserEmail: order.wompiEmail || order.userEmail,
      reason: "referral_reward",
      deltaEntries: REFERRAL_REWARD_ENTRIES,
    });
  }

  db.run(
    `
      UPDATE navai_referrals
      SET
        referred_email = ?,
        source_order_id = ?,
        status = 'rewarded',
        reward_credits = ?,
        reward_applied_at = CASE
          WHEN reward_applied_at = '' THEN ?
          ELSE reward_applied_at
        END,
        rejection_reason = '',
        updated_at = ?
      WHERE id = ?
    `,
    [
      normalizeEmailAddress(order.wompiEmail || order.userEmail) || referral.referredEmail,
      order.id,
      REFERRAL_REWARD_ENTRIES,
      now,
      now,
      referral.id,
    ]
  );

  return !existingRewardEntry;
}

function buildReferralProgramRecord(db: SqlJsDatabase, userId: string) {
  const code = ensureReferralCodeExists(db, userId);
  const referrals = listReferralsByReferrerUserId(db, userId);
  const ledger = listReferralEntryLedgerByUserId(db, userId);
  const entries = readReferralEntryTotals(db, userId);

  return {
    code,
    rewardEntriesPerReferral: REFERRAL_REWARD_ENTRIES,
    totalReferrals: referrals.length,
    pendingReferrals: referrals.filter((item) => item.status === "pending").length,
    rewardedReferrals: referrals.filter((item) => item.status === "rewarded").length,
    earnedEntries: entries.earnedEntries,
    consumedEntries: entries.consumedEntries,
    availableEntries: entries.availableEntries,
    referrals,
    ledger,
  } satisfies NavaiReferralProgramRecord;
}

function listEntryPackages(
  db: SqlJsDatabase,
  exchangeRate: NavaiCurrencyExchangeRateRecord,
  options: { includeInactive?: boolean } = {}
) {
  const includeInactive = Boolean(options.includeInactive);
  const rows = readStatementRows(
    db,
    `
      SELECT
        key,
        name,
        description,
        entries_count,
        price_usd,
        vat_percentage,
        is_active,
        sort_order,
        created_at,
        updated_at
      FROM navai_entry_packages
      ${includeInactive ? "" : "WHERE is_active = 1"}
      ORDER BY is_active DESC, sort_order ASC, updated_at DESC, key ASC
    `
  );

  return rows.map((row) => mapEntryPackageRow(row, exchangeRate));
}

function readEntryPackageByKey(
  db: SqlJsDatabase,
  exchangeRate: NavaiCurrencyExchangeRateRecord,
  packageKey: string
) {
  const normalizedPackageKey = normalizeEntryPackageKey(packageKey, "");
  if (!normalizedPackageKey) {
    return null;
  }

  const row = readFirstRow(
    db,
    `
      SELECT
        key,
        name,
        description,
        entries_count,
        price_usd,
        vat_percentage,
        is_active,
        sort_order,
        created_at,
        updated_at
      FROM navai_entry_packages
      WHERE key = ?
      LIMIT 1
    `,
    [normalizedPackageKey]
  );

  return row ? mapEntryPackageRow(row, exchangeRate) : null;
}

function resolveDefaultEntryPackage(
  db: SqlJsDatabase,
  exchangeRate: NavaiCurrencyExchangeRateRecord
) {
  const activePackages = listEntryPackages(db, exchangeRate, { includeInactive: false });
  if (activePackages.length > 0) {
    return activePackages[0];
  }

  return {
    key: NAVAI_DEFAULT_ENTRY_PACKAGE_KEY,
    name: NAVAI_ENTRY_PRODUCT_NAME,
    description: "",
    entriesCount: NAVAI_DEFAULT_ENTRY_PACKAGE_ENTRIES,
    priceUsd: NAVAI_DEFAULT_ENTRY_PACKAGE_PRICE_USD,
    vatPercentage: NAVAI_DEFAULT_ENTRY_PACKAGE_VAT_PERCENTAGE,
    ...buildEntryPackagePricing(
      NAVAI_DEFAULT_ENTRY_PACKAGE_PRICE_USD,
      NAVAI_DEFAULT_ENTRY_PACKAGE_VAT_PERCENTAGE,
      exchangeRate.rate
    ),
    currency: NAVAI_ENTRY_CURRENCY,
    isActive: true,
    sortOrder: 0,
    updatedAt: "",
  } satisfies NavaiEntryPackageRecord;
}

function listEntryOrdersByUserId(
  db: SqlJsDatabase,
  userId: string,
  options: { limit?: number } = {}
) {
  const limit = Math.max(1, options.limit ?? 100);
  const rows = readStatementRows(
    db,
    `
      SELECT
        id,
        user_id,
        user_email,
        plan,
        product_name,
        package_key,
        entries_count,
        unit_price_usd,
        vat_percentage,
        environment,
        currency,
        amount_cents,
      status,
      checkout_url,
      wompi_link_id,
      referral_code,
      referrer_user_id,
      wompi_transaction_id,
      wompi_status,
      wompi_reference,
      wompi_email,
        confirmed_at,
        activated_at,
        created_at,
        updated_at
      FROM navai_plus_orders
      WHERE user_id = ?
      ORDER BY created_at DESC, updated_at DESC
      LIMIT ${limit}
    `,
    [userId]
  );

  return rows.map((row) => mapEntryOrderRow(row));
}

function listAllEntryOrders(db: SqlJsDatabase, options: { limit?: number } = {}) {
  const limit = Math.max(1, options.limit ?? 200);
  const rows = readStatementRows(
    db,
    `
      SELECT
        id,
        user_id,
        user_email,
        plan,
        product_name,
        package_key,
        entries_count,
        unit_price_usd,
        vat_percentage,
        environment,
        currency,
        amount_cents,
      status,
      checkout_url,
      wompi_link_id,
      referral_code,
      referrer_user_id,
      wompi_transaction_id,
      wompi_status,
      wompi_reference,
      wompi_email,
        confirmed_at,
        activated_at,
        created_at,
        updated_at
      FROM navai_plus_orders
      ORDER BY created_at DESC, updated_at DESC
      LIMIT ${limit}
    `
  );

  return rows.map((row) => mapEntryOrderRow(row));
}

function buildEntryBalance(
  orders: NavaiEntryOrderRecord[],
  purchasedEntries: NavaiEntryTotalsRecord,
  bonusEntries: NavaiEntryTotalsRecord
): NavaiEntryBalanceRecord {
  return {
    availableEntries: purchasedEntries.availableEntries + bonusEntries.availableEntries,
    purchasedEntries: purchasedEntries.availableEntries,
    bonusEntries: bonusEntries.availableEntries,
    consumedPurchasedEntries: purchasedEntries.consumedEntries,
    consumedBonusEntries: bonusEntries.consumedEntries,
    totalPurchasedEntries: purchasedEntries.earnedEntries,
    totalBonusEntries: bonusEntries.earnedEntries,
    lastOrderId: orders[0]?.id ?? "",
  };
}

function buildEntryAccountingSummary(
  orders: NavaiEntryOrderRecord[]
): NavaiEntryAccountingSummaryRecord {
  const approvedOrders = orders.filter(
    (order) => order.status === "APPROVED" || Boolean(order.creditedAt)
  );
  const pendingOrders = orders.filter((order) =>
    ["", "created", "PENDING"].includes(order.status)
  );

  return {
    totalOrders: orders.length,
    approvedOrders: approvedOrders.length,
    pendingOrders: pendingOrders.length,
    approvedAmountCents: approvedOrders.reduce(
      (total, order) => total + order.amountCents,
      0
    ),
    soldEntries: approvedOrders.reduce(
      (total, order) => total + Math.max(1, order.entriesCount || 1),
      0
    ),
  };
}

function readEntryOrderById(db: SqlJsDatabase, orderId: string) {
  const row = readFirstRow(
    db,
    `
      SELECT
        id,
        user_id,
        user_email,
        plan,
        product_name,
        package_key,
        entries_count,
        unit_price_usd,
        vat_percentage,
        environment,
        currency,
        amount_cents,
        status,
        checkout_url,
        wompi_link_id,
        referral_code,
        referrer_user_id,
        wompi_transaction_id,
        wompi_status,
        wompi_reference,
        wompi_email,
        confirmed_at,
        activated_at,
        created_at,
        updated_at
      FROM navai_plus_orders
      WHERE id = ?
    `,
    [orderId]
  );

  return row ? mapEntryOrderRow(row) : null;
}

function updateEntryOrderFromTransaction(
  db: SqlJsDatabase,
  orderId: string,
  transaction: WompiTransaction
) {
  const existing = readEntryOrderById(db, orderId);
  const now = new Date().toISOString();
  const normalizedAmount = normalizeInteger(transaction.amount_in_cents);
  const amountCents =
    normalizedAmount > 0 ? normalizedAmount : Math.max(1, existing?.amountCents ?? 1);
  const currency =
    normalizeString(transaction.currency) || existing?.currency || NAVAI_ENTRY_CURRENCY;
  db.run(
    `
      UPDATE navai_plus_orders
      SET
        amount_cents = ?,
        currency = ?,
        status = ?,
        wompi_transaction_id = ?,
        wompi_status = ?,
        wompi_reference = ?,
        wompi_email = ?,
        wompi_link_id = CASE
          WHEN wompi_link_id = '' THEN ?
          ELSE wompi_link_id
        END,
        confirmed_at = ?,
        updated_at = ?
      WHERE id = ?
    `,
    [
      amountCents,
      currency,
      normalizeString(transaction.status) || "created",
      normalizeString(transaction.id),
      normalizeString(transaction.status),
      normalizeString(transaction.reference),
      normalizeEmailAddress(transaction.customer_email),
      normalizeString(transaction.payment_link_id),
      now,
      now,
      orderId,
    ]
  );
}

function activateEntryOrder(db: SqlJsDatabase, orderId: string) {
  const order = readEntryOrderById(db, orderId);
  if (!order) {
    return false;
  }

  const existingActivation = readFirstRow(
    db,
    "SELECT id FROM navai_plus_activations WHERE order_id = ?",
    [orderId]
  );
  if (existingActivation) {
    if (!order.creditedAt) {
      const now = new Date().toISOString();
      db.run("UPDATE navai_plus_orders SET activated_at = ?, updated_at = ? WHERE id = ?", [
        now,
        now,
        orderId,
      ]);
    }
    applyReferralRewardForOrder(db, readEntryOrderById(db, orderId) ?? order);
    return true;
  }

  const createdAt = new Date().toISOString();

  db.run(
    `
      INSERT INTO navai_plus_activations (
        id,
        order_id,
        user_id,
        plan,
        period_start,
        period_end,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      randomUUID(),
      orderId,
      order.userId,
      NAVAI_ENTRY_PRODUCT_KEY,
      createdAt,
      createdAt,
      createdAt,
    ]
  );

  appendPurchasedEntryLedgerEntry(db, {
    userId: order.userId,
    orderId,
    reason: "order_purchase",
    deltaEntries: Math.max(1, order.entriesCount || 1),
  });
  db.run(
    "UPDATE navai_plus_orders SET activated_at = ?, status = ?, updated_at = ? WHERE id = ?",
    [createdAt, "APPROVED", createdAt, orderId]
  );
  applyReferralRewardForOrder(
    db,
    readEntryOrderById(db, orderId) ?? { ...order, creditedAt: createdAt, status: "APPROVED" }
  );

  return true;
}

function findEntryOrderByTransaction(
  db: SqlJsDatabase,
  transaction: WompiTransaction,
  options: { userId?: string } = {}
) {
  const normalizedTransactionId = normalizeString(transaction.id);
  if (normalizedTransactionId) {
    const byTransactionId = readFirstRow(
      db,
      `
        SELECT *
        FROM navai_plus_orders
        WHERE wompi_transaction_id = ?
        ${options.userId ? "AND user_id = ?" : ""}
        LIMIT 1
      `,
      options.userId ? [normalizedTransactionId, options.userId] : [normalizedTransactionId]
    );
    if (byTransactionId) {
      return mapEntryOrderRow(byTransactionId);
    }
  }

  const customerEmail = normalizeEmailAddress(transaction.customer_email);
  const paymentLinkId = normalizeString(transaction.payment_link_id);
  if (!customerEmail) {
    return null;
  }

  const fallbackRows = readStatementRows(
    db,
    `
      SELECT *
      FROM navai_plus_orders
      WHERE user_email = ?
        ${options.userId ? "AND user_id = ?" : ""}
        AND (wompi_transaction_id = '' OR wompi_transaction_id = ?)
        AND created_at >= ?
      ORDER BY created_at DESC
      LIMIT 5
    `,
    options.userId
      ? [
          customerEmail,
          options.userId,
          normalizedTransactionId,
          new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        ]
      : [
          customerEmail,
          normalizedTransactionId,
          new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        ]
  ).map((row) => mapEntryOrderRow(row));

  return (
    fallbackRows.find(
      (order) =>
        !paymentLinkId || !order.wompiLinkId || order.wompiLinkId === paymentLinkId
    ) ?? fallbackRows[0] ?? null
  );
}

export async function getNavaiEntryBilling(
  actor: NavaiPanelActor
): Promise<NavaiEntryBillingRecord> {
  await runEndedExperienceRewardsDistributionSweep();
  const normalizedUserId = validateUserId(actor.uid);
  const exchangeRate = await resolveUsdCopExchangeRateRecord();
  const { db } = await getWorkspaceSqliteState();
  const environment = getWompiEnvironment();
  const userOrders = listEntryOrdersByUserId(db, normalizedUserId);
  const allOrders = isNavaiPanelSupportActor(actor) ? listAllEntryOrders(db) : [];
  const packages = listEntryPackages(db, exchangeRate, {
    includeInactive: isNavaiPanelSupportActor(actor),
  });
  const defaultPackage = resolveDefaultEntryPackage(db, exchangeRate);
  const activePackage =
    packages.find((entryPackage) => entryPackage.isActive) ??
    defaultPackage;
  const purchasedEntries = readPurchasedEntryTotals(db, normalizedUserId);
  const bonusEntries = readReferralEntryTotals(db, normalizedUserId);
  const accounting = buildEntryAccountingSummary(
    isNavaiPanelSupportActor(actor) ? allOrders : userOrders
  );

  return {
    environment,
    exchangeRate,
    catalog: {
      key: activePackage.key,
      name: activePackage.name,
      priceCents: activePackage.totalCopCents,
      currency: activePackage.currency,
      entriesCount: activePackage.entriesCount,
      vatPercentage: activePackage.vatPercentage,
    },
    packages,
    balance: buildEntryBalance(userOrders, purchasedEntries, bonusEntries),
    orders: userOrders,
    accounting,
    allOrders,
  };
}

export async function listNavaiEntryPackagesForAdmin(
  actor: NavaiPanelActor
): Promise<NavaiEntryPackageRecord[]> {
  assertAdminVerificationActor(actor);
  const exchangeRate = await resolveUsdCopExchangeRateRecord();
  const { db } = await getWorkspaceSqliteState();
  return listEntryPackages(db, exchangeRate, { includeInactive: true });
}

export async function upsertNavaiEntryPackage(
  actor: NavaiPanelActor,
  packageKey: string,
  input: NavaiEntryPackageInput
): Promise<NavaiEntryPackageRecord> {
  assertAdminVerificationActor(actor);
  const normalizedPackageKey = normalizeEntryPackageKey(packageKey, "");
  if (!normalizedPackageKey) {
    throw new Error("Entry package key is required.");
  }
  const normalizedInput = validateEntryPackageInput(input);
  const exchangeRate = await resolveUsdCopExchangeRateRecord();

  return runSerializedMutation((db) => {
    const existing = readEntryPackageByKey(db, exchangeRate, normalizedPackageKey);
    if (existing && !normalizedInput.isActive && existing.isActive) {
      const activeCountRow = readFirstRow(
        db,
        `
          SELECT COUNT(*) AS active_count
          FROM navai_entry_packages
          WHERE is_active = 1
        `
      );
      const activeCount = normalizeInteger(activeCountRow?.active_count);
      if (activeCount <= 1) {
        throw new Error("At least one active entry package is required.");
      }
    }

    const now = new Date().toISOString();
    db.run(
      `
        INSERT INTO navai_entry_packages (
          key,
          name,
          description,
          entries_count,
          price_usd,
          vat_percentage,
          is_active,
          sort_order,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          entries_count = excluded.entries_count,
          price_usd = excluded.price_usd,
          vat_percentage = excluded.vat_percentage,
          is_active = excluded.is_active,
          sort_order = excluded.sort_order,
          updated_at = excluded.updated_at
      `,
      [
        normalizedPackageKey,
        normalizedInput.name,
        normalizedInput.description,
        normalizedInput.entriesCount,
        normalizedInput.priceUsd,
        normalizedInput.vatPercentage,
        normalizedInput.isActive ? 1 : 0,
        normalizedInput.sortOrder,
        now,
        now,
      ]
    );

    const saved = readEntryPackageByKey(db, exchangeRate, normalizedPackageKey);
    if (!saved) {
      throw new Error("Entry package was saved but could not be loaded.");
    }

    return saved;
  });
}

export async function getNavaiPointsWallet(
  actor: NavaiPanelActor
): Promise<NavaiPointsWalletRecord> {
  await runEndedExperienceRewardsDistributionSweep();
  const normalizedUserId = validateUserId(actor.uid);
  const { db } = await getWorkspaceSqliteState();
  const totals = readPointsTotals(db, normalizedUserId);
  const paymentSettings = readPointsCashoutPaymentSettingsByUserId(
    db,
    normalizedUserId
  );
  const cashoutRequests = listPointsCashoutRequestsByUserId(db, normalizedUserId);
  const ledger = listPointsLedgerByUserId(db, normalizedUserId);

  return {
    pointValueCop: NAVAI_POINT_VALUE_COP,
    availablePoints: totals.availablePoints,
    availableAmountCop: convertPointsToCop(totals.availablePoints),
    totalEarnedPoints: totals.earnedPoints,
    totalEarnedAmountCop: convertPointsToCop(totals.earnedPoints),
    totalRedeemedPoints: totals.redeemedPoints,
    totalRedeemedAmountCop: convertPointsToCop(totals.redeemedPoints),
    pendingRedeemPoints: totals.pendingRedeemPoints,
    pendingRedeemAmountCop: convertPointsToCop(totals.pendingRedeemPoints),
    paymentSettings,
    cashoutRequests,
    ledger,
  };
}

export async function updateNavaiPointsCashoutPaymentSettings(
  userId: string,
  input: NavaiPointsCashoutPaymentSettingsInput
): Promise<NavaiPointsCashoutPaymentSettingsRecord> {
  const normalizedUserId = validateUserId(userId);
  const normalizedInput = validatePointsCashoutPaymentSettingsInput(input);

  return runSerializedMutation((db) => {
    const now = new Date().toISOString();
    db.run(
      `
        INSERT INTO navai_points_cashout_payment_settings (
          user_id,
          payment_method,
          account_holder,
          account_reference,
          notes,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          payment_method = excluded.payment_method,
          account_holder = excluded.account_holder,
          account_reference = excluded.account_reference,
          notes = excluded.notes,
          updated_at = excluded.updated_at
      `,
      [
        normalizedUserId,
        normalizedInput.paymentMethod,
        normalizedInput.accountHolder,
        normalizedInput.accountReference,
        normalizedInput.notes,
        now,
      ]
    );

    const settings = readPointsCashoutPaymentSettingsByUserId(db, normalizedUserId);
    if (!settings) {
      throw new Error("Cashout settings were saved but could not be loaded.");
    }

    return settings;
  });
}

export async function createNavaiPointsCashoutRequest(
  userId: string,
  input: NavaiPointsCashoutRequestInput
): Promise<NavaiPointsCashoutRequestRecord> {
  const normalizedUserId = validateUserId(userId);
  const normalizedInput = validatePointsCashoutRequestInput(input);

  return runSerializedMutation((db) => {
    const totals = readPointsTotals(db, normalizedUserId);
    if (normalizedInput.requestedPoints > totals.availablePoints) {
      throw new Error("Insufficient available points for cashout request.");
    }

    const now = new Date().toISOString();
    db.run(
      `
        INSERT INTO navai_points_cashout_payment_settings (
          user_id,
          payment_method,
          account_holder,
          account_reference,
          notes,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          payment_method = excluded.payment_method,
          account_holder = excluded.account_holder,
          account_reference = excluded.account_reference,
          notes = excluded.notes,
          updated_at = excluded.updated_at
      `,
      [
        normalizedUserId,
        normalizedInput.paymentMethod,
        normalizedInput.accountHolder,
        normalizedInput.accountReference,
        normalizedInput.notes,
        now,
      ]
    );

    const requestId = randomUUID();
    db.run(
      `
        INSERT INTO navai_points_cashout_requests (
          id,
          user_id,
          status,
          requested_points,
          requested_amount_cop,
          payment_method,
          account_holder,
          account_reference,
          notes,
          response_message,
          processed_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        requestId,
        normalizedUserId,
        "pending",
        normalizedInput.requestedPoints,
        convertPointsToCop(normalizedInput.requestedPoints),
        normalizedInput.paymentMethod,
        normalizedInput.accountHolder,
        normalizedInput.accountReference,
        normalizedInput.notes,
        "",
        "",
        now,
        now,
      ]
    );

    appendPointsLedgerEntry(db, {
      userId: normalizedUserId,
      relatedCashoutId: requestId,
      reason: "cashout_request",
      deltaPoints: -normalizedInput.requestedPoints,
    });

    const request = readPointsCashoutRequestById(db, requestId);
    if (!request) {
      throw new Error("Cashout request was created but could not be loaded.");
    }

    return request;
  });
}

export async function listNavaiPointsCashoutRequests(
  actor: NavaiPanelActor,
  options: { status?: unknown; limit?: unknown } = {}
): Promise<NavaiPointsCashoutRequestRecord[]> {
  assertSupportCashoutActor(actor);
  const normalizedStatusInput = normalizeString(options.status);
  const normalizedStatus = normalizedStatusInput
    ? normalizePointsCashoutStatus(normalizedStatusInput)
    : "";
  const normalizedLimit = Math.min(500, Math.max(1, normalizePositiveInteger(options.limit, 300)));
  const { db } = await getWorkspaceSqliteState();

  return listPointsCashoutRequests(db, {
    status: normalizedStatus,
    limit: normalizedLimit,
  });
}

export async function reviewNavaiPointsCashoutRequest(
  actor: NavaiPanelActor,
  requestId: string,
  input: NavaiPointsCashoutReviewInput
): Promise<NavaiPointsCashoutRequestRecord> {
  assertSupportCashoutActor(actor);
  const normalizedRequestId = normalizeString(requestId);
  if (!normalizedRequestId) {
    throw new Error("Cashout request id is required.");
  }
  const normalizedInput = validatePointsCashoutReviewInput(input);

  return runSerializedMutation((db) => {
    const existing = readPointsCashoutRequestById(db, normalizedRequestId);
    if (!existing) {
      throw new Error("Cashout request not found.");
    }

    if (existing.status === "paid" || existing.status === "rejected") {
      throw new Error("Cashout request has already been processed.");
    }

    const now = new Date().toISOString();
    if (normalizedInput.status === "rejected") {
      appendPointsLedgerEntry(db, {
        userId: existing.userId,
        relatedCashoutId: existing.id,
        reason: "cashout_reverted",
        deltaPoints: existing.requestedPoints,
      });
    }

    db.run(
      `
        UPDATE navai_points_cashout_requests
        SET
          status = ?,
          response_message = ?,
          processed_at = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [
        normalizedInput.status,
        normalizedInput.responseMessage,
        now,
        now,
        normalizedRequestId,
      ]
    );

    const reviewed = readPointsCashoutRequestById(db, normalizedRequestId);
    if (!reviewed) {
      throw new Error("Cashout request was reviewed but could not be loaded.");
    }

    return reviewed;
  });
}

export async function getNavaiReferralProgram(
  userId: string
): Promise<NavaiReferralProgramRecord> {
  const normalizedUserId = validateUserId(userId);

  return runSerializedMutation((db) => buildReferralProgramRecord(db, normalizedUserId));
}

export async function createNavaiEntryOrder(
  userId: string,
  userEmail: string,
  input: { referralCode?: string; packageKey?: string } = {}
): Promise<NavaiEntryOrderCreateResult> {
  const normalizedUserId = validateUserId(userId);
  const normalizedUserEmail = normalizeEmailAddress(userEmail);
  const environment = getWompiEnvironment();
  const exchangeRate = await resolveUsdCopExchangeRateRecord();

  return runSerializedMutation(async (db) => {
    const requestedPackageKey = normalizeEntryPackageKey(input.packageKey, "");
    const requestedPackage = requestedPackageKey
      ? readEntryPackageByKey(db, exchangeRate, requestedPackageKey)
      : null;
    if (requestedPackageKey && (!requestedPackage || !requestedPackage.isActive)) {
      throw new Error("Entry package is not available.");
    }

    const resolvedPackage =
      requestedPackage?.isActive
        ? requestedPackage
        : resolveDefaultEntryPackage(db, exchangeRate);
    if (!resolvedPackage.isActive) {
      throw new Error("No active entry packages are configured.");
    }

    const existingPendingRow = readFirstRow(
      db,
      `
        SELECT *
        FROM navai_plus_orders
        WHERE user_id = ?
          AND package_key = ?
          AND activated_at = ''
          AND (wompi_status = '' OR wompi_status = 'PENDING' OR status = 'created')
          AND created_at >= ?
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [
        normalizedUserId,
        resolvedPackage.key,
        new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      ]
    );

    const existingPending = existingPendingRow
      ? mapEntryOrderRow(existingPendingRow)
      : null;
    if (existingPending) {
      const referralAttribution = resolveReferralAttributionForEntryOrder(db, {
        orderId: existingPending.id,
        referredUserId: normalizedUserId,
        referredEmail: normalizedUserEmail,
        referralCode: input.referralCode,
        existingOrder: existingPending,
      });
      const refreshedPendingOrder = readEntryOrderById(db, existingPending.id) ?? existingPending;
      return {
        order: refreshedPendingOrder,
        checkoutUrl: `${refreshedPendingOrder.checkoutUrl}${
          refreshedPendingOrder.checkoutUrl.includes("?") ? "&" : "?"
        }navai_order=${existingPending.id}`,
        environment: refreshedPendingOrder.environment,
        referralAttribution,
      };
    }

    const wompiLink = await createWompiPaymentLink(
      {
        name: resolvedPackage.name,
        description:
          resolvedPackage.description ||
          `${resolvedPackage.entriesCount} entradas NAVAI, IVA ${resolvedPackage.vatPercentage}%`,
        amountInCents: resolvedPackage.totalCopCents,
        currency: resolvedPackage.currency,
        singleUse: true,
        vatAmountInCents: resolvedPackage.taxCopCents,
      },
      environment
    );

    const now = new Date().toISOString();
    const id = randomUUID();
    const linkId = normalizeString(wompiLink.id) || extractCheckoutLinkCode(wompiLink.checkoutUrl);
    db.run(
      `
        INSERT INTO navai_plus_orders (
          id,
          user_id,
          user_email,
          plan,
          product_name,
          package_key,
          entries_count,
          unit_price_usd,
          vat_percentage,
          environment,
          currency,
          amount_cents,
          status,
          checkout_url,
          wompi_link_id,
          referral_code,
          referrer_user_id,
          wompi_transaction_id,
          wompi_status,
          wompi_reference,
          wompi_email,
          confirmed_at,
          activated_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        normalizedUserId,
        normalizedUserEmail,
        resolvedPackage.key,
        resolvedPackage.name,
        resolvedPackage.key,
        resolvedPackage.entriesCount,
        resolvedPackage.priceUsd,
        resolvedPackage.vatPercentage,
        environment,
        resolvedPackage.currency,
        resolvedPackage.totalCopCents,
        "created",
        wompiLink.checkoutUrl,
        linkId,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        now,
        now,
      ]
    );

    const referralAttribution = resolveReferralAttributionForEntryOrder(db, {
      orderId: id,
      referredUserId: normalizedUserId,
      referredEmail: normalizedUserEmail,
      referralCode: input.referralCode,
    });
    const createdOrder = readEntryOrderById(db, id);
    if (!createdOrder) {
      throw new Error("Entry order was created but could not be loaded.");
    }

    return {
      order: createdOrder,
      checkoutUrl: `${wompiLink.checkoutUrl}${
        wompiLink.checkoutUrl.includes("?") ? "&" : "?"
      }navai_order=${id}`,
      environment,
      referralAttribution,
    };
  });
}

export async function confirmNavaiEntryOrder(
  userId: string,
  input: { orderId?: string; transactionId?: string }
): Promise<NavaiEntryOrderConfirmResult> {
  const normalizedUserId = validateUserId(userId);
  const normalizedOrderId = normalizeString(input.orderId);
  const normalizedTransactionId = normalizeString(input.transactionId);
  if (!normalizedTransactionId) {
    throw new Error("Transaction id is required.");
  }

  const { db } = await getWorkspaceSqliteState();
  const requestedOrder = normalizedOrderId
    ? readEntryOrderById(db, normalizedOrderId)
    : null;
  if (requestedOrder && requestedOrder.userId !== normalizedUserId) {
    throw new Error("Order not found.");
  }

  const environment = requestedOrder?.environment ?? getWompiEnvironment();
  const transaction = await fetchWompiTransaction(normalizedTransactionId, environment);
  if (!transaction) {
    return {
      status: "UNKNOWN",
      applied: false,
      order: requestedOrder,
      balance: buildEntryBalance(
        listEntryOrdersByUserId(db, normalizedUserId),
        readPurchasedEntryTotals(db, normalizedUserId),
        readReferralEntryTotals(db, normalizedUserId)
      ),
      details: null,
    };
  }

  return runSerializedMutation((db) => {
    const resolveUserBalance = (targetUserId: string) =>
      buildEntryBalance(
        listEntryOrdersByUserId(db, targetUserId),
        readPurchasedEntryTotals(db, targetUserId),
        readReferralEntryTotals(db, targetUserId)
      );
    let order =
      requestedOrder ?? findEntryOrderByTransaction(db, transaction, { userId: normalizedUserId });
    if (!order) {
      return {
        status: "UNMATCHED",
        applied: false,
        order: null,
        balance: resolveUserBalance(normalizedUserId),
        details: {
          transactionId: normalizeString(transaction.id),
          reference: normalizeString(transaction.reference),
          email: normalizeEmailAddress(transaction.customer_email),
          amountInCents: normalizeInteger(transaction.amount_in_cents),
          currency: normalizeString(transaction.currency) || NAVAI_ENTRY_CURRENCY,
          paymentMethod: normalizeString(transaction.payment_method?.type),
          paymentLinkId: normalizeString(transaction.payment_link_id),
          createdAt: normalizeString(transaction.created_at),
        },
      } satisfies NavaiEntryOrderConfirmResult;
    }

    if (
      normalizeString(transaction.payment_link_id) &&
      order.wompiLinkId &&
      normalizeString(transaction.payment_link_id) !== order.wompiLinkId
    ) {
      return {
        status: "INVALID",
        applied: false,
        order,
        balance: resolveUserBalance(order.userId),
        details: {
          transactionId: normalizeString(transaction.id),
          reference: normalizeString(transaction.reference),
          email: normalizeEmailAddress(transaction.customer_email),
          amountInCents: normalizeInteger(transaction.amount_in_cents),
          currency: normalizeString(transaction.currency) || NAVAI_ENTRY_CURRENCY,
          paymentMethod: normalizeString(transaction.payment_method?.type),
          paymentLinkId: normalizeString(transaction.payment_link_id),
          createdAt: normalizeString(transaction.created_at),
        },
      } satisfies NavaiEntryOrderConfirmResult;
    }

    updateEntryOrderFromTransaction(db, order.id, transaction);
    let applied = false;
    if (normalizeString(transaction.status) === "APPROVED") {
      applied = activateEntryOrder(db, order.id);
    }

    order = readEntryOrderById(db, order.id) ?? order;

    return {
      status: normalizeString(transaction.status) || order.status,
      applied,
      order,
      balance: resolveUserBalance(order.userId),
      details: {
        transactionId: normalizeString(transaction.id),
        reference: normalizeString(transaction.reference),
        email: normalizeEmailAddress(transaction.customer_email),
        amountInCents: normalizeInteger(transaction.amount_in_cents),
        currency: normalizeString(transaction.currency) || NAVAI_ENTRY_CURRENCY,
        paymentMethod: normalizeString(transaction.payment_method?.type),
        paymentLinkId: normalizeString(transaction.payment_link_id),
        createdAt: normalizeString(transaction.created_at),
      },
    } satisfies NavaiEntryOrderConfirmResult;
  });
}

export async function processNavaiEntryWompiWebhook(
  payload: unknown,
  signature: string | undefined
) {
  const environment = getWompiEnvironment();
  const isSignatureValid = validateWompiSignature(payload, signature, environment);
  const transaction =
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    payload.data &&
    typeof payload.data === "object" &&
    "transaction" in payload.data
      ? (payload.data.transaction as WompiTransaction | undefined)
      : undefined;
  const eventType =
    payload &&
    typeof payload === "object" &&
    "event" in payload
      ? normalizeString(payload.event)
      : "";
  const eventId =
    payload &&
    typeof payload === "object" &&
    "id" in payload
      ? normalizeString(payload.id)
      : normalizeString(transaction?.id) || `wompi-${Date.now()}`;

  return runSerializedMutation((db) => {
    db.run(
      `
        INSERT OR IGNORE INTO navai_wompi_events (
          id,
          event_type,
          signature,
          payload_json,
          created_at
        ) VALUES (?, ?, ?, ?, ?)
      `,
      [
        eventId,
        eventType,
        normalizeString(signature),
        JSON.stringify(payload ?? {}),
        new Date().toISOString(),
      ]
    );

    if (!isSignatureValid || !transaction) {
      return { accepted: isSignatureValid, applied: false };
    }

    const matchedOrder = findEntryOrderByTransaction(db, transaction);
    if (!matchedOrder) {
      return { accepted: true, applied: false };
    }

    updateEntryOrderFromTransaction(db, matchedOrder.id, transaction);
    const applied =
      normalizeString(transaction.status) === "APPROVED"
        ? activateEntryOrder(db, matchedOrder.id)
        : false;

    return { accepted: true, applied };
  });
}
