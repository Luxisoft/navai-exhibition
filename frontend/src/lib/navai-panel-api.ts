'use client';

import { buildBackendApiUrl } from "@/lib/backend-api";

export type NavaiPanelRoute = {
  id: string;
  label: string;
  url: string;
  description: string;
  openInNewTab: boolean;
};

export type NavaiPanelFunction = {
  id: string;
  name: string;
  label: string;
  description: string;
  code: string;
};

export type NavaiPanelParameter = {
  id: string;
  key: string;
  value: string;
  description: string;
};

export type NavaiPanelDomain = {
  id: string;
  userId: string;
  domain: string;
  label: string;
  description: string;
  functions: NavaiPanelFunction[];
  routes: NavaiPanelRoute[];
  parameters: NavaiPanelParameter[];
  createdAt: string;
  updatedAt: string;
};

export type NavaiPanelDomainInput = {
  domain: string;
  label: string;
  description: string;
  functions: NavaiPanelFunction[];
  routes: NavaiPanelRoute[];
  parameters: NavaiPanelParameter[];
};

export type NavaiPanelDashboardSummary = {
  domainsCount: number;
  evaluationsCount: number;
  surveyResponsesCount: number;
  openTicketsCount: number;
};

export type NavaiPanelActorRole = "user" | "support" | "moderator" | "admin";

export type NavaiPanelActorPermissions = {
  canEditTableData: boolean;
  canDeleteTableData: boolean;
  canManageUsers: boolean;
};

export type NavaiPanelActor = {
  uid: string;
  email: string;
  role: NavaiPanelActorRole;
  permissions: NavaiPanelActorPermissions;
};

export type NavaiPanelManagedUser = {
  uid: string;
  email: string;
  role: NavaiPanelActorRole;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
};

export type NavaiUserVerificationStatus =
  | "not_submitted"
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested";

export type NavaiUserAccountStatus = "active" | "deletion_pending" | "inactive";

export type NavaiUserVerificationDocumentType =
  | "citizenship_card"
  | "identity_card"
  | "passport"
  | "drivers_license"
  | "foreign_id"
  | "other";

export type NavaiPanelRolePermission = {
  role: NavaiPanelActorRole;
  permissions: NavaiPanelActorPermissions;
  updatedAt: string;
  isEditable: boolean;
};

export type NavaiPanelRouteAccess = {
  routeId: string;
  pathnamePattern: string;
  allowVisitor: boolean;
  allowUser: boolean;
  allowSupport: boolean;
  allowModerator: boolean;
  allowAdmin: boolean;
  editableVisitor: boolean;
  editableUser: boolean;
  editableSupport: boolean;
  editableModerator: boolean;
  editableAdmin: boolean;
  updatedAt: string;
};

export type NavaiPanelRouteAccessInput = {
  allowVisitor: boolean;
  allowUser: boolean;
  allowSupport: boolean;
  allowModerator: boolean;
  allowAdmin: boolean;
};

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

export const NAVAI_EXPERIENCE_REWARD_PAYMENT_METHOD_LABELS: Record<
  NavaiExperienceRewardPaymentMethod,
  string
> = {
  bancolombia: "Bancolombia",
  nequi: "Nequi",
  daviplata: "Daviplata",
  davivienda: "Davivienda",
  banco_de_bogota: "Banco de Bogota",
  bbva_colombia: "BBVA Colombia",
  paypal: "PayPal",
};

export const NAVAI_EXPERIENCE_REWARD_TYPES: readonly NavaiExperienceRewardType[] = [
  "money",
  "object",
  "travel",
  "voucher",
  "other",
] as const;

export const NAVAI_EXPERIENCE_REWARD_DELIVERY_METHODS: readonly NavaiExperienceRewardDeliveryMethod[] =
  ["manual_coordination", "bank_transfer", "digital_wallet", "hybrid", "in_person"] as const;

export const NAVAI_EXPERIENCE_REWARD_PAYMENT_METHODS: readonly NavaiExperienceRewardPaymentMethod[] =
  [
    "bancolombia",
    "nequi",
    "daviplata",
    "davivienda",
    "banco_de_bogota",
    "bbva_colombia",
    "paypal",
  ] as const;

export type NavaiPanelEvaluationQuestion = {
  id: string;
  question: string;
  expectedAnswer: string;
  allowAiGrading: boolean;
};

export type NavaiPanelExperience = {
  id: string;
  userId: string;
  kind: "evaluation" | "survey";
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
  rewardAmountCop?: number;
  rewardAmountUsd?: number;
  rewardUsdAmount?: number;
  dailyAttemptLimit: number;
  agentId: string;
  agentName: string;
  questions: NavaiPanelEvaluationQuestion[];
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

export type NavaiPanelEvaluation = NavaiPanelExperience & {
  kind: "evaluation";
};

export type NavaiPanelSurvey = NavaiPanelExperience & {
  kind: "survey";
};

export type NavaiPanelExperienceInput = {
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
  rewardPoints?: number;
  rewardUsdAmount?: number;
  dailyAttemptLimit: number;
  agentId: string;
  questions: NavaiPanelEvaluationQuestion[];
  welcomeTitle: string;
  welcomeBody: string;
  autoStartConversation: boolean;
  enableEntryModal: boolean;
  enableHCaptcha: boolean;
  systemPrompt: string;
};

export type NavaiPanelAgentSettings = {
  name: string;
  agentModel: string;
  agentVoice: string;
  agentLanguage: string;
  agentVoiceAccent: string;
  agentVoiceTone: string;
};

export type NavaiPanelAgent = NavaiPanelAgentSettings & {
  id: string;
  userId: string;
  kind: "evaluation" | "survey";
  createdAt: string;
  updatedAt: string;
};

export type NavaiPanelSupportMessage = {
  id: string;
  ticketId: string;
  author: string;
  authorRole: "customer" | "support";
  body: string;
  attachments: NavaiPanelSupportAttachment[];
  createdAt: string;
};

export type NavaiPanelSupportAttachmentKind = "image" | "video";

export type NavaiPanelSupportAttachment = {
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

export type NavaiPanelSupportTicket = {
  id: string;
  userId: string;
  requesterEmail: string;
  requesterProfile: NavaiUserProfile;
  subject: string;
  channel: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: NavaiPanelSupportMessage[];
};

export type NavaiPublicExperience = {
  id: string;
  kind: "evaluation" | "survey";
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
  rewardAmountCop: number;
  rewardAmountUsd: number;
  rewardUsdAmount?: number;
  dailyAttemptLimit: number;
  agentId: string;
  agentName: string;
  questions: NavaiPanelEvaluationQuestion[];
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
  exchangeRate: NavaiCurrencyExchangeRate;
  organizer: NavaiPublicExperienceOrganizer | null;
  domain: Pick<
    NavaiPanelDomain,
    "id" | "domain" | "label" | "description" | "routes" | "parameters"
  > | null;
};

export type NavaiPublicConversationAnswer = {
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

export type NavaiPublicConversation = {
  id: string;
  experienceId: string;
  experienceKind: "evaluation" | "survey";
  experienceSlug: string;
  respondentUserId: string;
  respondentEmail: string;
  status: "Open" | "Completed" | "Abandoned";
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
  answers: NavaiPublicConversationAnswer[];
};

export type NavaiPublicExperienceTopEntry = {
  userId: string;
  email: string;
  displayName: string;
  photoUrl: string;
  totalScore: number;
  answeredQuestions: number;
  conversationsCount: number;
  latestActivityAt: string;
};

export type NavaiPublicExperienceComment = {
  id: string;
  experienceId: string;
  experienceKind: "evaluation" | "survey";
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

export type NavaiUserProfile = {
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

export type NavaiUserVerificationAsset = {
  assetId: string;
  url: string;
};

export type NavaiUserVerification = {
  userId: string;
  email: string;
  status: NavaiUserVerificationStatus;
  fullName: string;
  documentType: NavaiUserVerificationDocumentType;
  documentNumber: string;
  documentCountry: string;
  selfieImage: NavaiUserVerificationAsset | null;
  documentFrontImage: NavaiUserVerificationAsset | null;
  documentBackImage: NavaiUserVerificationAsset | null;
  responseMessage: string;
  submittedAt: string;
  reviewedAt: string;
  reviewedByUserId: string;
  reviewedByEmail: string;
  createdAt: string;
  updatedAt: string;
};

export type NavaiPanelPendingUserVerification = {
  verification: NavaiUserVerification;
  profile: NavaiUserProfile;
};

export type NavaiPublicExperienceOrganizer = NavaiUserProfile & {
  isVerified: boolean;
};

export type NavaiUserProfileInput = {
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

export type NavaiUserVerificationInput = {
  fullName: string;
  documentType: NavaiUserVerificationDocumentType;
  documentNumber: string;
  documentCountry: string;
  selfieImageId: string;
  selfieImageUrl: string;
  documentFrontImageId: string;
  documentFrontImageUrl: string;
  documentBackImageId: string;
  documentBackImageUrl: string;
};

export type NavaiUserVerificationReviewInput = {
  status: Exclude<NavaiUserVerificationStatus, "not_submitted">;
  responseMessage: string;
};

export type NavaiPanelExperienceResponse = NavaiPublicConversation;

export type NavaiPublicConversationTurnInput = {
  clientTurnId: string;
  role: "assistant" | "user";
  transcript: string;
  sourceEventType?: string;
};

export type NavaiPublicConversationAnswerInput = {
  questionId: string;
  questionText: string;
  answerText: string;
};

export type NavaiPublicConversationMediaInput = {
  storagePath: string;
  downloadUrl: string;
  contentType: string;
  sizeBytes: number;
  durationMs: number;
};

export type NavaiPublicConversationAudioInput = NavaiPublicConversationMediaInput;
export type NavaiPublicConversationVideoInput = NavaiPublicConversationMediaInput;

export type NavaiHCaptchaSiteKeyResponse = {
  siteKey: string;
};

export type NavaiEntryBalance = {
  availableEntries: number;
  purchasedEntries: number;
  bonusEntries: number;
  consumedPurchasedEntries: number;
  consumedBonusEntries: number;
  totalPurchasedEntries: number;
  totalBonusEntries: number;
  lastOrderId: string;
};

export type NavaiEntryOrder = {
  id: string;
  userId: string;
  userEmail: string;
  product: string;
  productName: string;
  packageKey: string;
  entriesCount: number;
  unitPriceUsd: number;
  vatPercentage: number;
  environment: "sandbox" | "production";
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

export type NavaiEntryAccountingSummary = {
  totalOrders: number;
  approvedOrders: number;
  pendingOrders: number;
  approvedAmountCents: number;
  soldEntries: number;
};

export type NavaiCurrencyExchangeRate = {
  key: "usd_cop";
  rate: number;
  sourceDate: string;
  fetchedAt: string;
  updatedAt: string;
};

export type NavaiEntryPackage = {
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

export type NavaiEntryBilling = {
  environment: "sandbox" | "production";
  exchangeRate: NavaiCurrencyExchangeRate;
  catalog: {
    key: string;
    name: string;
    priceCents: number;
    currency: string;
    entriesCount: number;
    vatPercentage: number;
  };
  packages: NavaiEntryPackage[];
  balance: NavaiEntryBalance;
  orders: NavaiEntryOrder[];
  accounting: NavaiEntryAccountingSummary;
  allOrders: NavaiEntryOrder[];
};

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

export type NavaiPointsCashoutPaymentSettings = {
  userId: string;
  paymentMethod: NavaiPointsCashoutPaymentMethod;
  accountHolder: string;
  accountReference: string;
  notes: string;
  updatedAt: string;
};

export type NavaiPointsCashoutRequest = {
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

export type NavaiPointsLedgerEntry = {
  id: string;
  userId: string;
  experienceId: string;
  experienceKind: "evaluation" | "survey" | "";
  experienceSlug: string;
  relatedCashoutId: string;
  relatedDistributionId: string;
  relatedUserId: string;
  relatedUserEmail: string;
  reason: NavaiPointsLedgerReason;
  deltaPoints: number;
  createdAt: string;
};

export type NavaiPointsWallet = {
  pointValueCop: number;
  availablePoints: number;
  availableAmountCop: number;
  totalEarnedPoints: number;
  totalEarnedAmountCop: number;
  totalRedeemedPoints: number;
  totalRedeemedAmountCop: number;
  pendingRedeemPoints: number;
  pendingRedeemAmountCop: number;
  paymentSettings: NavaiPointsCashoutPaymentSettings | null;
  cashoutRequests: NavaiPointsCashoutRequest[];
  ledger: NavaiPointsLedgerEntry[];
};

export type NavaiPointsCashoutPaymentSettingsInput = {
  paymentMethod: NavaiPointsCashoutPaymentMethod;
  accountHolder: string;
  accountReference: string;
  notes?: string;
};

export type NavaiPointsCashoutRequestInput = NavaiPointsCashoutPaymentSettingsInput & {
  requestedPoints: number;
};

export type NavaiPointsCashoutReviewInput = {
  status: Exclude<NavaiPointsCashoutStatus, "pending">;
  responseMessage?: string;
};

export type NavaiEntryPackageInput = {
  name: string;
  description: string;
  entriesCount: number;
  priceUsd: number;
  vatPercentage: number;
  isActive: boolean;
  sortOrder: number;
};

export type NavaiReferralAttributionStatus =
  | "none"
  | "accepted"
  | "invalid"
  | "self"
  | "already_assigned"
  | "ineligible";

export type NavaiReferralAttribution = {
  code: string;
  status: NavaiReferralAttributionStatus;
  referrerUserId: string;
  referralId: string;
};

export type NavaiReferral = {
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

export type NavaiReferralEntryLedger = {
  id: string;
  userId: string;
  referralId: string;
  orderId: string;
  experienceId: string;
  experienceKind: "evaluation" | "survey" | "";
  experienceSlug: string;
  conversationId: string;
  relatedUserId: string;
  relatedUserEmail: string;
  reason: "referral_reward" | "entry_consumed" | "manual_adjustment";
  deltaEntries: number;
  createdAt: string;
};

export type NavaiReferralProgram = {
  code: string;
  rewardEntriesPerReferral: number;
  totalReferrals: number;
  pendingReferrals: number;
  rewardedReferrals: number;
  earnedEntries: number;
  consumedEntries: number;
  availableEntries: number;
  referrals: NavaiReferral[];
  ledger: NavaiReferralEntryLedger[];
};

export type NavaiEntryOrderCreateResult = {
  order: NavaiEntryOrder;
  checkoutUrl: string;
  environment: "sandbox" | "production";
  referralAttribution: NavaiReferralAttribution;
};

export type NavaiEntryOrderConfirmResult = {
  status: string;
  applied: boolean;
  order: NavaiEntryOrder | null;
  balance: NavaiEntryBalance;
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

export type NavaiCloudflareStreamDirectUpload = {
  uploadURL: string;
  uid: string;
};

export type NavaiCloudflareImageDirectUpload = {
  id: string;
  uploadURL: string;
};

export type NavaiCloudflareImageAsset = {
  id: string;
  filename: string;
  uploaded: boolean;
  requireSignedURLs: boolean;
  variants: string[];
};

export type NavaiCloudflareStreamDownload = {
  type: "default" | "audio";
  status: string;
  url: string;
  percentComplete: number;
};

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { ok?: boolean; error?: string };
  if (!response.ok || payload.ok === false) {
    const message =
      typeof payload.error === "string" && payload.error.trim().length > 0
        ? payload.error
        : "The NAVAI panel request failed.";
    throw new Error(message);
  }

  return payload;
}

function buildAuthHeaders(idToken: string, hasBody = false) {
  return {
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    Accept: "application/json",
    Authorization: `Bearer ${idToken}`,
  };
}

export async function listNavaiPanelDomains(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/domains"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; items: NavaiPanelDomain[] }>(response);
}

export async function createNavaiPanelDomain(idToken: string, input: NavaiPanelDomainInput) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/domains"), {
    method: "POST",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true; item: NavaiPanelDomain }>(response);
}

export async function updateNavaiPanelDomain(idToken: string, id: string, input: NavaiPanelDomainInput) {
  const response = await fetch(buildBackendApiUrl(`/api/navai-panel/domains/${encodeURIComponent(id)}`), {
    method: "PUT",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true; item: NavaiPanelDomain }>(response);
}

export async function deleteNavaiPanelDomain(idToken: string, id: string) {
  const response = await fetch(buildBackendApiUrl(`/api/navai-panel/domains/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; id: string }>(response);
}

export async function getNavaiPanelDashboardSummary(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/dashboard-summary"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; summary: NavaiPanelDashboardSummary }>(response);
}

export async function getNavaiPanelActorAccess(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/auth/me"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; actor: NavaiPanelActor }>(response);
}

export async function listPublicNavaiRouteAccess() {
  const response = await fetch(buildBackendApiUrl("/api/navai-route-access"), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  return readApiResponse<{ ok: true; items: NavaiPanelRouteAccess[] }>(response);
}

export async function listNavaiPanelRouteAccess(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/admin/routes"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; items: NavaiPanelRouteAccess[] }>(response);
}

export async function updateNavaiPanelRouteAccess(
  idToken: string,
  routeId: string,
  input: NavaiPanelRouteAccessInput
) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-panel/admin/routes/${encodeURIComponent(routeId)}`),
    {
      method: "PUT",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify(input),
    }
  );

  return readApiResponse<{ ok: true; item: NavaiPanelRouteAccess }>(response);
}

export async function getNavaiPanelUserProfile(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/profile"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; profile: NavaiUserProfile }>(response);
}

export async function requestNavaiPanelUserAccountDeletion(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/profile/delete-request"), {
    method: "POST",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify({}),
  });

  return readApiResponse<{ ok: true; profile: NavaiUserProfile }>(response);
}

export async function getNavaiPanelUserVerification(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/profile/verification"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; verification: NavaiUserVerification }>(response);
}

export async function getNavaiEntryBilling(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/billing/entries"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; billing: NavaiEntryBilling }>(response);
}

export async function listNavaiEntryPackagesAdmin(idToken: string) {
  const response = await fetch(
    buildBackendApiUrl("/api/navai-panel/admin/entries/packages"),
    {
      method: "GET",
      headers: buildAuthHeaders(idToken),
    }
  );

  return readApiResponse<{ ok: true; items: NavaiEntryPackage[] }>(response);
}

export async function updateNavaiEntryPackageAdmin(
  idToken: string,
  packageKey: string,
  input: NavaiEntryPackageInput
) {
  const response = await fetch(
    buildBackendApiUrl(
      `/api/navai-panel/admin/entries/packages/${encodeURIComponent(packageKey)}`
    ),
    {
      method: "PUT",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify(input),
    }
  );

  return readApiResponse<{ ok: true; item: NavaiEntryPackage }>(response);
}

export async function getNavaiPointsWallet(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/points/wallet"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; wallet: NavaiPointsWallet }>(response);
}

export async function updateNavaiPointsCashoutPaymentSettings(
  idToken: string,
  input: NavaiPointsCashoutPaymentSettingsInput
) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/points/cashout/settings"), {
    method: "PUT",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true; settings: NavaiPointsCashoutPaymentSettings }>(
    response
  );
}

export async function createNavaiPointsCashoutRequest(
  idToken: string,
  input: NavaiPointsCashoutRequestInput
) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/points/cashout/requests"), {
    method: "POST",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true; item: NavaiPointsCashoutRequest }>(response);
}

export async function listNavaiPointsCashoutRequests(
  idToken: string,
  options: { status?: NavaiPointsCashoutStatus; limit?: number } = {}
) {
  const searchParams = new URLSearchParams();
  if (options.status) {
    searchParams.set("status", options.status);
  }
  if (typeof options.limit === "number" && Number.isFinite(options.limit)) {
    searchParams.set("limit", String(Math.max(1, Math.round(options.limit))));
  }

  const response = await fetch(
    buildBackendApiUrl(
      `/api/navai-panel/admin/points/cashout/requests${
        searchParams.toString() ? `?${searchParams.toString()}` : ""
      }`
    ),
    {
      method: "GET",
      headers: buildAuthHeaders(idToken),
    }
  );

  return readApiResponse<{ ok: true; items: NavaiPointsCashoutRequest[] }>(response);
}

export async function reviewNavaiPointsCashoutRequest(
  idToken: string,
  requestId: string,
  input: NavaiPointsCashoutReviewInput
) {
  const response = await fetch(
    buildBackendApiUrl(
      `/api/navai-panel/admin/points/cashout/requests/${encodeURIComponent(requestId)}`
    ),
    {
      method: "PUT",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify(input),
    }
  );

  return readApiResponse<{ ok: true; item: NavaiPointsCashoutRequest }>(response);
}

export async function getNavaiReferralProgram(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/referrals"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; program: NavaiReferralProgram }>(response);
}

export async function createNavaiEntryOrder(
  idToken: string,
  input: { referralCode?: string; packageKey?: string } = {}
) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/billing/entries/orders"), {
    method: "POST",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true } & NavaiEntryOrderCreateResult>(response);
}

export async function confirmNavaiEntryOrder(
  idToken: string,
  input: { orderId?: string; transactionId?: string }
) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/billing/entries/confirm"), {
    method: "POST",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true } & NavaiEntryOrderConfirmResult>(response);
}

export async function updateNavaiPanelUserProfile(
  idToken: string,
  input: NavaiUserProfileInput
) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/profile"), {
    method: "PUT",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true; profile: NavaiUserProfile }>(response);
}

export async function submitNavaiPanelUserVerification(
  idToken: string,
  input: NavaiUserVerificationInput
) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/profile/verification"), {
    method: "PUT",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true; verification: NavaiUserVerification }>(response);
}

export async function listNavaiPanelManagedUsers(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/admin/users"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; items: NavaiPanelManagedUser[] }>(response);
}

export async function listNavaiPanelPendingUserVerifications(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/admin/verifications/pending"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; items: NavaiPanelPendingUserVerification[] }>(response);
}

export async function listNavaiPanelRolePermissions(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/admin/roles"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; items: NavaiPanelRolePermission[] }>(response);
}

export async function updateNavaiPanelManagedUserRole(
  idToken: string,
  uid: string,
  input: { role: NavaiPanelActorRole },
) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-panel/admin/users/${encodeURIComponent(uid)}/role`),
    {
      method: "PUT",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify(input),
    },
  );

  return readApiResponse<{ ok: true; item: NavaiPanelManagedUser }>(response);
}

export async function updateNavaiPanelRolePermissions(
  idToken: string,
  role: NavaiPanelActorRole,
  input: NavaiPanelActorPermissions,
) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-panel/admin/roles/${encodeURIComponent(role)}`),
    {
      method: "PUT",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify(input),
    },
  );

  return readApiResponse<{ ok: true; item: NavaiPanelRolePermission }>(response);
}

export async function reviewNavaiPanelUserVerification(
  idToken: string,
  userId: string,
  input: NavaiUserVerificationReviewInput
) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-panel/admin/verifications/${encodeURIComponent(userId)}`),
    {
      method: "PUT",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify(input),
    }
  );

  return readApiResponse<{ ok: true; item: NavaiPanelPendingUserVerification }>(response);
}

export async function listNavaiPanelEvaluations(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/evaluations"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; items: NavaiPanelEvaluation[] }>(response);
}

export async function createNavaiPanelEvaluation(idToken: string, input: NavaiPanelExperienceInput) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/evaluations"), {
    method: "POST",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true; item: NavaiPanelEvaluation }>(response);
}

export async function updateNavaiPanelEvaluation(
  idToken: string,
  id: string,
  input: NavaiPanelExperienceInput
) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-panel/evaluations/${encodeURIComponent(id)}`),
    {
      method: "PUT",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify(input),
    }
  );

  return readApiResponse<{ ok: true; item: NavaiPanelEvaluation }>(response);
}

export async function deleteNavaiPanelEvaluation(idToken: string, id: string) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-panel/evaluations/${encodeURIComponent(id)}`),
    {
      method: "DELETE",
      headers: buildAuthHeaders(idToken),
    }
  );

  return readApiResponse<{ ok: true; id: string }>(response);
}

export async function listNavaiPanelEvaluationResponses(idToken: string, id: string) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-panel/evaluations/${encodeURIComponent(id)}/responses`),
    {
      method: "GET",
      headers: buildAuthHeaders(idToken),
    }
  );

  return readApiResponse<{ ok: true; items: NavaiPanelExperienceResponse[] }>(response);
}

export async function gradeNavaiPanelEvaluationResponse(
  idToken: string,
  id: string,
  conversationId: string
) {
  const response = await fetch(
    buildBackendApiUrl(
      `/api/navai-panel/evaluations/${encodeURIComponent(id)}/responses/${encodeURIComponent(conversationId)}/grade`
    ),
    {
      method: "POST",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify({}),
    }
  );

  return readApiResponse<{ ok: true; item: NavaiPanelExperienceResponse }>(response);
}

export async function getNavaiPanelEvaluationAgentSettings(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/evaluations/settings"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; settings: NavaiPanelAgentSettings }>(response);
}

export async function listNavaiPanelEvaluationAgents(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/evaluations/agents"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; items: NavaiPanelAgent[] }>(response);
}

export async function createNavaiPanelEvaluationAgent(
  idToken: string,
  input: NavaiPanelAgentSettings
) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/evaluations/agents"), {
    method: "POST",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true; item: NavaiPanelAgent }>(response);
}

export async function updateNavaiPanelEvaluationAgent(
  idToken: string,
  id: string,
  input: NavaiPanelAgentSettings
) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-panel/evaluations/agents/${encodeURIComponent(id)}`),
    {
      method: "PUT",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify(input),
    }
  );

  return readApiResponse<{ ok: true; item: NavaiPanelAgent }>(response);
}

export async function deleteNavaiPanelEvaluationAgent(idToken: string, id: string) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-panel/evaluations/agents/${encodeURIComponent(id)}`),
    {
      method: "DELETE",
      headers: buildAuthHeaders(idToken),
    }
  );

  return readApiResponse<{ ok: true; id: string }>(response);
}

export async function updateNavaiPanelEvaluationAgentSettings(
  idToken: string,
  input: NavaiPanelAgentSettings
) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/evaluations/settings"), {
    method: "PUT",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true; settings: NavaiPanelAgentSettings }>(response);
}

export async function listNavaiPanelSurveys(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/surveys"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; items: NavaiPanelSurvey[] }>(response);
}

export async function createNavaiPanelSurvey(idToken: string, input: NavaiPanelExperienceInput) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/surveys"), {
    method: "POST",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true; item: NavaiPanelSurvey }>(response);
}

export async function updateNavaiPanelSurvey(
  idToken: string,
  id: string,
  input: NavaiPanelExperienceInput
) {
  const response = await fetch(buildBackendApiUrl(`/api/navai-panel/surveys/${encodeURIComponent(id)}`), {
    method: "PUT",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true; item: NavaiPanelSurvey }>(response);
}

export async function deleteNavaiPanelSurvey(idToken: string, id: string) {
  const response = await fetch(buildBackendApiUrl(`/api/navai-panel/surveys/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; id: string }>(response);
}

export async function listNavaiPanelSurveyResponses(idToken: string, id: string) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-panel/surveys/${encodeURIComponent(id)}/responses`),
    {
      method: "GET",
      headers: buildAuthHeaders(idToken),
    }
  );

  return readApiResponse<{ ok: true; items: NavaiPanelExperienceResponse[] }>(response);
}

export async function gradeNavaiPanelSurveyResponse(
  idToken: string,
  id: string,
  conversationId: string
) {
  const response = await fetch(
    buildBackendApiUrl(
      `/api/navai-panel/surveys/${encodeURIComponent(id)}/responses/${encodeURIComponent(conversationId)}/grade`
    ),
    {
      method: "POST",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify({}),
    }
  );

  return readApiResponse<{ ok: true; item: NavaiPanelExperienceResponse }>(response);
}

export async function getNavaiPanelSurveyAgentSettings(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/surveys/settings"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; settings: NavaiPanelAgentSettings }>(response);
}

export async function listNavaiPanelSurveyAgents(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/surveys/agents"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; items: NavaiPanelAgent[] }>(response);
}

export async function createNavaiPanelSurveyAgent(idToken: string, input: NavaiPanelAgentSettings) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/surveys/agents"), {
    method: "POST",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true; item: NavaiPanelAgent }>(response);
}

export async function updateNavaiPanelSurveyAgent(
  idToken: string,
  id: string,
  input: NavaiPanelAgentSettings
) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-panel/surveys/agents/${encodeURIComponent(id)}`),
    {
      method: "PUT",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify(input),
    }
  );

  return readApiResponse<{ ok: true; item: NavaiPanelAgent }>(response);
}

export async function deleteNavaiPanelSurveyAgent(idToken: string, id: string) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-panel/surveys/agents/${encodeURIComponent(id)}`),
    {
      method: "DELETE",
      headers: buildAuthHeaders(idToken),
    }
  );

  return readApiResponse<{ ok: true; id: string }>(response);
}

export async function updateNavaiPanelSurveyAgentSettings(
  idToken: string,
  input: NavaiPanelAgentSettings
) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/surveys/settings"), {
    method: "PUT",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true; settings: NavaiPanelAgentSettings }>(response);
}

export async function getPublicNavaiEvaluation(slug: string) {
  const response = await fetch(buildBackendApiUrl(`/api/navai-public/evaluations/${encodeURIComponent(slug)}`), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  return readApiResponse<{ ok: true; item: NavaiPublicExperience }>(response);
}

export async function getPublicNavaiSurvey(slug: string) {
  const response = await fetch(buildBackendApiUrl(`/api/navai-public/surveys/${encodeURIComponent(slug)}`), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  return readApiResponse<{ ok: true; item: NavaiPublicExperience }>(response);
}

export async function listPublicNavaiExperienceTop(
  kind: "evaluation" | "survey",
  slug: string
) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-public/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}/top`),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  return readApiResponse<{ ok: true; items: NavaiPublicExperienceTopEntry[] }>(response);
}

export async function getPublicNavaiExperienceAccess(
  idToken: string,
  kind: "evaluation" | "survey",
  slug: string
) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-public/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}/access`),
    {
      method: "GET",
      headers: buildAuthHeaders(idToken),
    }
  );

  return readApiResponse<{ ok: true; canStart: boolean; error: string }>(response);
}

export async function listPublicNavaiExperienceComments(
  kind: "evaluation" | "survey",
  slug: string
) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-public/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}/comments`),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  return readApiResponse<{ ok: true; items: NavaiPublicExperienceComment[] }>(response);
}

export async function createPublicNavaiExperienceComment(
  idToken: string,
  kind: "evaluation" | "survey",
  slug: string,
  input: { body: string; rating: number }
) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-public/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}/comments`),
    {
      method: "POST",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify(input),
    }
  );

  return readApiResponse<{ ok: true; item: NavaiPublicExperienceComment }>(response);
}

export async function updatePublicNavaiExperienceComment(
  idToken: string,
  commentId: string,
  input: { body: string; rating: number }
) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-public/comments/${encodeURIComponent(commentId)}`),
    {
      method: "PUT",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify(input),
    }
  );

  return readApiResponse<{ ok: true; item: NavaiPublicExperienceComment }>(response);
}

export async function deletePublicNavaiExperienceComment(idToken: string, commentId: string) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-public/comments/${encodeURIComponent(commentId)}`),
    {
      method: "DELETE",
      headers: buildAuthHeaders(idToken),
    }
  );

  return readApiResponse<{ ok: true; id: string }>(response);
}

export async function getPublicNavaiUserProfile(userId: string) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-public/users/${encodeURIComponent(userId)}/profile`),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  return readApiResponse<{ ok: true; profile: NavaiUserProfile }>(response);
}

export async function trackPublicNavaiEvaluationLaunch(slug: string) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-public/evaluations/${encodeURIComponent(slug)}/launch`),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    }
  );

  return readApiResponse<{ ok: true; item: NavaiPublicExperience }>(response);
}

export async function trackPublicNavaiSurveyLaunch(slug: string) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-public/surveys/${encodeURIComponent(slug)}/launch`),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    }
  );

  return readApiResponse<{ ok: true; item: NavaiPublicExperience }>(response);
}

export async function getHCaptchaSiteKey() {
  const response = await fetch(buildBackendApiUrl("/api/hcaptcha/site-key"), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  return readApiResponse<NavaiHCaptchaSiteKeyResponse>(response);
}

export async function createCloudflareStreamDirectUpload(
  idToken: string,
  input: { maxDurationSeconds?: number } = {}
) {
  const response = await fetch(buildBackendApiUrl("/api/cloudflare/stream/direct-upload"), {
    method: "POST",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true } & NavaiCloudflareStreamDirectUpload>(response);
}

export async function createCloudflareImageDirectUpload(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/cloudflare/images/direct-upload"), {
    method: "POST",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true } & NavaiCloudflareImageDirectUpload>(response);
}

export async function getCloudflareImageDetails(idToken: string, id: string) {
  const response = await fetch(
    buildBackendApiUrl(`/api/cloudflare/images/${encodeURIComponent(id)}`),
    {
      method: "GET",
      headers: buildAuthHeaders(idToken),
    }
  );

  return readApiResponse<{ ok: true } & NavaiCloudflareImageAsset>(response);
}

export async function createCloudflareStreamDownload(
  idToken: string,
  uid: string,
  input: { type?: "default" | "audio" } = {}
) {
  const response = await fetch(
    buildBackendApiUrl(`/api/cloudflare/stream/${encodeURIComponent(uid)}/downloads`),
    {
      method: "POST",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify(input),
    }
  );

  return readApiResponse<{ ok: true } & NavaiCloudflareStreamDownload>(response);
}

export async function uploadCloudflareStreamBlob(
  uploadURL: string,
  uid: string,
  blob: Blob,
  fileName: string,
  contentType: string
) {
  const form = new FormData();
  form.append("file", blob, fileName);

  const response = await fetch(uploadURL, {
    method: "POST",
    body: form,
  });
  const text = await response.text();

  let payload: Record<string, any> | null = null;
  try {
    payload = text ? (JSON.parse(text) as Record<string, any>) : null;
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    throw new Error("cloudflare_stream_upload_failed");
  }

  const assetUid =
    typeof payload?.result?.uid === "string" && payload.result.uid.trim()
      ? payload.result.uid.trim()
      : uid;

  return {
    uid: assetUid,
    playbackUrl: `https://iframe.videodelivery.net/${assetUid}`,
    contentType: contentType || blob.type || "video/webm",
    sizeBytes: blob.size,
  };
}

function resolveCloudflareImageVariantUrl(variants: string[]) {
  return (
    variants.find((variant) => variant.includes("/public")) ??
    variants.find(Boolean) ??
    ""
  );
}

export async function uploadCloudflareImageBlob(
  idToken: string,
  blob: Blob,
  fileName: string
) {
  const directUpload = await createCloudflareImageDirectUpload(idToken);
  const form = new FormData();
  form.append("file", blob, fileName);

  const uploadResponse = await fetch(directUpload.uploadURL, {
    method: "POST",
    body: form,
  });
  const uploadText = await uploadResponse.text().catch(() => "");

  let uploadPayload: Record<string, unknown> | null = null;
  try {
    uploadPayload = uploadText ? (JSON.parse(uploadText) as Record<string, unknown>) : null;
  } catch {
    uploadPayload = null;
  }

  if (!uploadResponse.ok || uploadPayload?.success === false) {
    throw new Error("cloudflare_image_upload_failed");
  }

  let details = await getCloudflareImageDetails(idToken, directUpload.id);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (details.uploaded && details.variants.length > 0) {
      break;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 450));
    details = await getCloudflareImageDetails(idToken, directUpload.id);
  }

  return {
    id: details.id || directUpload.id,
    url: resolveCloudflareImageVariantUrl(details.variants),
    variants: details.variants,
  };
}

export async function createPublicNavaiConversation(
  idToken: string,
  kind: "evaluation" | "survey",
  slug: string,
  input: { hcaptchaToken?: string; hcaptchaEkey?: string } = {}
) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-public/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}/conversations`),
    {
      method: "POST",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify(input),
    }
  );

  return readApiResponse<{
    ok: true;
    conversation: NavaiPublicConversation;
    latestAnswers: NavaiPublicConversationAnswer[];
    pendingQuestionIds: string[];
  }>(response);
}

export async function updatePublicNavaiConversationProgress(
  idToken: string,
  conversationId: string,
  input: {
    turns?: NavaiPublicConversationTurnInput[];
    answers?: NavaiPublicConversationAnswerInput[];
    status?: "Open" | "Completed" | "Abandoned";
    audio?: NavaiPublicConversationAudioInput;
    video?: NavaiPublicConversationVideoInput;
  }
) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-public/conversations/${encodeURIComponent(conversationId)}/progress`),
    {
      method: "POST",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify(input),
    }
  );

  return readApiResponse<{
    ok: true;
    conversation: NavaiPublicConversation;
    latestAnswers: NavaiPublicConversationAnswer[];
  }>(response);
}

export async function listNavaiPanelSupportTickets(idToken: string) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/support/tickets"), {
    method: "GET",
    headers: buildAuthHeaders(idToken),
  });

  return readApiResponse<{ ok: true; items: NavaiPanelSupportTicket[] }>(response);
}

export async function createNavaiPanelSupportTicket(
  idToken: string,
  input: {
    subject: string;
    channel: string;
    category: string;
    priority: string;
    message: string;
    attachments?: Array<{
      kind: NavaiPanelSupportAttachmentKind;
      assetId: string;
      url: string;
      fileName: string;
      contentType: string;
      sizeBytes: number;
    }>;
  }
) {
  const response = await fetch(buildBackendApiUrl("/api/navai-panel/support/tickets"), {
    method: "POST",
    headers: buildAuthHeaders(idToken, true),
    body: JSON.stringify(input),
  });

  return readApiResponse<{ ok: true; item: NavaiPanelSupportTicket }>(response);
}

export async function createNavaiPanelSupportMessage(
  idToken: string,
  ticketId: string,
  input: {
    body: string;
    attachments?: Array<{
      kind: NavaiPanelSupportAttachmentKind;
      assetId: string;
      url: string;
      fileName: string;
      contentType: string;
      sizeBytes: number;
    }>;
  }
) {
  const response = await fetch(
    buildBackendApiUrl(`/api/navai-panel/support/tickets/${encodeURIComponent(ticketId)}/messages`),
    {
      method: "POST",
      headers: buildAuthHeaders(idToken, true),
      body: JSON.stringify(input),
    }
  );

  return readApiResponse<{ ok: true; item: NavaiPanelSupportTicket }>(response);
}
