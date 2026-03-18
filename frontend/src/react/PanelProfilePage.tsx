"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Clock3,
  ExternalLink,
  IdCard,
  ImagePlus,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import AppProvidersShell from "@/react/AppProvidersShell";
import { PanelModuleShellContent } from "@/react/PanelModuleShell";

import {
  PanelContentSkeleton,
  PanelSidebarCardsSkeleton,
} from "@/components/AppShellSkeletons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useI18n } from "@/lib/i18n/provider";
import {
  getNavaiPanelUserProfile,
  getNavaiPanelUserVerification,
  requestNavaiPanelUserAccountDeletion,
  submitNavaiPanelUserVerification,
  updateNavaiPanelUserProfile,
  uploadCloudflareImageBlob,
  type NavaiUserAccountStatus,
  type NavaiUserProfile,
  type NavaiUserProfileInput,
  type NavaiUserVerification,
  type NavaiUserVerificationDocumentType,
  type NavaiUserVerificationInput,
  type NavaiUserVerificationStatus,
} from "@/lib/navai-panel-api";

const MAX_VERIFICATION_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const VERIFICATION_DOCUMENT_TYPES: readonly NavaiUserVerificationDocumentType[] =
  [
    "citizenship_card",
    "identity_card",
    "passport",
    "drivers_license",
    "foreign_id",
    "other",
  ] as const;

type VerificationAssetField = "selfie" | "front" | "back";

const emptyProfileDraft = (): NavaiUserProfileInput => ({
  displayName: "",
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
});

const emptyVerificationDraft = (): NavaiUserVerificationInput => ({
  fullName: "",
  documentType: "citizenship_card",
  documentNumber: "",
  documentCountry: "",
  selfieImageId: "",
  selfieImageUrl: "",
  documentFrontImageId: "",
  documentFrontImageUrl: "",
  documentBackImageId: "",
  documentBackImageUrl: "",
});

function formatDateTime(value: string) {
  if (!value) {
    return "-";
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

function buildVerificationDraft(
  verification: NavaiUserVerification,
  fallbackName: string,
): NavaiUserVerificationInput {
  return {
    fullName: verification.fullName || fallbackName,
    documentType: verification.documentType || "citizenship_card",
    documentNumber: verification.documentNumber,
    documentCountry: verification.documentCountry,
    selfieImageId: verification.selfieImage?.assetId || "",
    selfieImageUrl: verification.selfieImage?.url || "",
    documentFrontImageId: verification.documentFrontImage?.assetId || "",
    documentFrontImageUrl: verification.documentFrontImage?.url || "",
    documentBackImageId: verification.documentBackImage?.assetId || "",
    documentBackImageUrl: verification.documentBackImage?.url || "",
  };
}

function buildProfileDraft(
  profile: NavaiUserProfile,
  fallback: Partial<NavaiUserProfileInput> = {},
): NavaiUserProfileInput {
  return {
    displayName: profile.displayName || fallback.displayName || "",
    photoUrl: profile.photoUrl || fallback.photoUrl || "",
    bio: profile.bio,
    professionalHeadline: profile.professionalHeadline,
    jobTitle: profile.jobTitle,
    company: profile.company,
    location: profile.location,
    phone: profile.phone,
    websiteUrl: profile.websiteUrl,
    linkedinUrl: profile.linkedinUrl,
    githubUrl: profile.githubUrl,
    xUrl: profile.xUrl,
    instagramUrl: profile.instagramUrl,
    facebookUrl: profile.facebookUrl,
  };
}

export default function PanelProfilePage() {
  return (
    <AppProvidersShell showMiniDock={true}>
      <PanelProfilePageContent />
    </AppProvidersShell>
  );
}

function PanelProfilePageContent() {
  const { messages } = useI18n();
  const { user } = useFirebaseAuth();
  const [profile, setProfile] = useState<NavaiUserProfile | null>(null);
  const [draft, setDraft] = useState<NavaiUserProfileInput>(emptyProfileDraft);
  const [verificationDraft, setVerificationDraft] =
    useState<NavaiUserVerificationInput>(emptyVerificationDraft);
  const [verification, setVerification] =
    useState<NavaiUserVerification | null>(null);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerificationSaving, setIsVerificationSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<
    VerificationAssetField | ""
  >("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verificationNotice, setVerificationNotice] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteRequestSaving, setIsDeleteRequestSaving] = useState(false);

  const syncLoadedProfile = (
    nextProfile: NavaiUserProfile,
    fallback: Partial<NavaiUserProfileInput> = {},
  ) => {
    setProfile(nextProfile);
    setDraft(buildProfileDraft(nextProfile, fallback));
    setEmail(nextProfile.email);
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!user) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const idToken = await user.getIdToken();
        const [profileResponse, verificationResponse] = await Promise.all([
          getNavaiPanelUserProfile(idToken),
          getNavaiPanelUserVerification(idToken),
        ]);
        if (!isMounted) {
          return;
        }

        const fallbackName =
          profileResponse.profile.displayName ||
          user.displayName ||
          user.email ||
          "";
        syncLoadedProfile(profileResponse.profile, {
          displayName: user.displayName || "",
          photoUrl: user.photoURL || "",
        });
        setVerification(verificationResponse.verification);
        setVerificationDraft(
          buildVerificationDraft(
            verificationResponse.verification,
            fallbackName,
          ),
        );
        setError("");
        setVerificationError("");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message =
          loadError instanceof Error
            ? loadError.message
            : messages.panelPage.userProfileLoadErrorMessage;
        setError(message);
        setVerificationError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [messages.panelPage.userProfileLoadErrorMessage, user]);

  const profilePreviewName = useMemo(
    () =>
      draft.displayName ||
      user?.displayName ||
      email ||
      messages.panelPage.profileNavLabel,
    [
      draft.displayName,
      email,
      messages.panelPage.profileNavLabel,
      user?.displayName,
    ],
  );

  const verificationStatus = verification?.status ?? "not_submitted";
  const verificationStatusLabel = getVerificationStatusLabel(
    verificationStatus,
    messages.panelPage,
  );
  const verificationDocumentTypeLabel = getVerificationDocumentTypeLabel(
    verificationDraft.documentType,
    messages.panelPage,
  );
  const verificationSummaryIcon = getVerificationStatusIcon(verificationStatus);
  const accountStatus = profile?.accountStatus ?? "active";
  const accountStatusLabel = getAccountStatusLabel(
    accountStatus,
    messages.panelPage,
  );
  const accountStatusIcon = getAccountStatusIcon(accountStatus);
  const isDeletionPending = accountStatus === "deletion_pending";
  const isInactive = accountStatus === "inactive";

  const handleSave = async () => {
    if (!user) {
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      const idToken = await user.getIdToken();
      const response = await updateNavaiPanelUserProfile(idToken, draft);
      syncLoadedProfile(response.profile);
      setNotice(messages.panelPage.userProfileSaveSuccessMessage);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : messages.panelPage.userProfileSaveErrorMessage,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerificationSubmit = async () => {
    if (!user) {
      return;
    }

    setIsVerificationSaving(true);
    setVerificationError("");
    setVerificationNotice("");

    try {
      const idToken = await user.getIdToken();
      const response = await submitNavaiPanelUserVerification(
        idToken,
        verificationDraft,
      );
      setVerification(response.verification);
      setVerificationDraft((current) =>
        buildVerificationDraft(
          response.verification,
          current.fullName || draft.displayName || user.displayName || email,
        ),
      );
      setVerificationNotice(
        messages.panelPage.userVerificationSubmitSuccessMessage,
      );
    } catch (submitError) {
      setVerificationError(
        submitError instanceof Error
          ? submitError.message
          : messages.panelPage.userVerificationSubmitErrorMessage,
      );
    } finally {
      setIsVerificationSaving(false);
    }
  };

  const handleVerificationFileUpload = async (
    field: VerificationAssetField,
    file: File | null,
  ) => {
    if (!user || !file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setVerificationError(
        messages.panelPage.userVerificationImageTypeErrorMessage,
      );
      return;
    }

    if (file.size > MAX_VERIFICATION_IMAGE_SIZE_BYTES) {
      setVerificationError(
        messages.panelPage.userVerificationImageSizeErrorMessage,
      );
      return;
    }

    setUploadingField(field);
    setVerificationError("");
    setVerificationNotice("");

    try {
      const idToken = await user.getIdToken();
      const upload = await uploadCloudflareImageBlob(idToken, file, file.name);
      if (!upload.url) {
        throw new Error(
          messages.panelPage.userVerificationImageUploadErrorMessage,
        );
      }

      setVerificationDraft((current) => {
        if (field === "selfie") {
          return {
            ...current,
            selfieImageId: upload.id,
            selfieImageUrl: upload.url,
          };
        }

        if (field === "front") {
          return {
            ...current,
            documentFrontImageId: upload.id,
            documentFrontImageUrl: upload.url,
          };
        }

        return {
          ...current,
          documentBackImageId: upload.id,
          documentBackImageUrl: upload.url,
        };
      });

      setVerificationNotice(
        messages.panelPage.userVerificationImageUploadSuccessMessage,
      );
    } catch (uploadError) {
      setVerificationError(
        uploadError instanceof Error
          ? uploadError.message
          : messages.panelPage.userVerificationImageUploadErrorMessage,
      );
    } finally {
      setUploadingField("");
    }
  };

  const handleDeletionRequestConfirm = async () => {
    if (!user) {
      return;
    }

    setIsDeleteRequestSaving(true);
    setError("");
    setNotice("");

    try {
      const idToken = await user.getIdToken();
      const response = await requestNavaiPanelUserAccountDeletion(idToken);
      syncLoadedProfile(response.profile);
      setIsDeleteDialogOpen(false);
      setNotice(messages.panelPage.userAccountDeletionRequestSuccessMessage);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : messages.panelPage.userAccountDeletionRequestErrorMessage,
      );
    } finally {
      setIsDeleteRequestSaving(false);
    }
  };

  if (isLoading) {
    return (
      <PanelModuleShellContent
        page="profile"
        description={messages.panelPage.userProfileDescription}
        rightSidebarExtra={<PanelSidebarCardsSkeleton />}
      >
        <PanelContentSkeleton />
      </PanelModuleShellContent>
    );
  }

  return (
    <PanelModuleShellContent
      page="profile"
      description={messages.panelPage.userProfileDescription}
      rightSidebarExtra={
        <>
          <section className="docs-section-block navai-panel-card navai-panel-profile-summary">
            <div className="flex w-full justify-center">
              <div className="navai-panel-profile-avatar-preview">
                {draft.photoUrl ? (
                  <img src={draft.photoUrl} alt={profilePreviewName} />
                ) : (
                  <span>{profilePreviewName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
            </div>
            <p className="mt-4 text-center text-base font-semibold text-foreground">
              {profilePreviewName}
            </p>
            <p className="mt-1 text-center text-sm text-muted-foreground break-all">
              {email || "-"}
            </p>
            <div className="mt-4 rounded-[1rem] border border-border/70 bg-background/35 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full border border-border/70 p-2">
                  {verificationSummaryIcon}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {messages.panelPage.userVerificationSidebarLabel}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {verificationStatusLabel}
                  </p>
                </div>
              </div>
              {verification?.submittedAt ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {messages.panelPage.userVerificationSubmittedAtLabel}:{" "}
                  {formatDateTime(verification.submittedAt)}
                </p>
              ) : null}
            </div>
          </section>

          <section className="docs-section-block navai-panel-card">
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-border/70 p-2">
                {accountStatusIcon}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {messages.panelPage.userAccountStatusSidebarLabel}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {accountStatusLabel}
                </p>
              </div>
            </div>
            {profile?.scheduledDeletionAt ? (
              <p className="mt-3 text-xs text-muted-foreground">
                {messages.panelPage.userAccountScheduledDeactivationAtLabel}:{" "}
                {formatDateTime(profile.scheduledDeletionAt)}
              </p>
            ) : null}
            {profile?.deactivatedAt ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {messages.panelPage.userAccountDeactivatedAtLabel}:{" "}
                {formatDateTime(profile.deactivatedAt)}
              </p>
            ) : null}
          </section>
        </>
      }
    >
      <article className="navai-panel-layout space-y-6">
        {error ? <p className="navai-panel-error">{error}</p> : null}
        {notice ? <p className="navai-panel-success">{notice}</p> : null}

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full max-w-[42rem] grid-cols-3">
            <TabsTrigger value="profile">
              {messages.panelPage.userProfileTabProfileLabel}
            </TabsTrigger>
            <TabsTrigger value="verification">
              {messages.panelPage.userProfileTabVerificationLabel}
            </TabsTrigger>
            <TabsTrigger value="account">
              {messages.panelPage.userProfileTabAccountLabel}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-0">
            <section className="docs-section-block navai-panel-card">
              <div className="navai-panel-tab-panel">
                <div className="navai-panel-form-grid">
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-profile-display-name">
                      {messages.panelPage.userProfileDisplayNameFieldLabel}
                    </Label>
                    <Input
                      id="panel-profile-display-name"
                      value={draft.displayName}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          displayName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-profile-photo-url">
                      {messages.panelPage.userProfilePhotoUrlFieldLabel}
                    </Label>
                    <Input
                      id="panel-profile-photo-url"
                      value={draft.photoUrl}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          photoUrl: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="navai-panel-field">
                  <Label htmlFor="panel-profile-email">
                    {messages.panelPage.userProfileEmailFieldLabel}
                  </Label>
                  <Input
                    id="panel-profile-email"
                    value={email}
                    disabled={true}
                  />
                </div>

                <div className="navai-panel-field">
                  <Label htmlFor="panel-profile-bio">
                    {messages.panelPage.userProfileBioFieldLabel}
                  </Label>
                  <Textarea
                    id="panel-profile-bio"
                    value={draft.bio}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        bio: event.target.value,
                      }))
                    }
                    className="min-h-[7rem]"
                  />
                </div>

                <div className="navai-panel-form-grid">
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-profile-headline">
                      {messages.panelPage.userProfileHeadlineFieldLabel}
                    </Label>
                    <Input
                      id="panel-profile-headline"
                      value={draft.professionalHeadline}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          professionalHeadline: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-profile-job-title">
                      {messages.panelPage.userProfileJobTitleFieldLabel}
                    </Label>
                    <Input
                      id="panel-profile-job-title"
                      value={draft.jobTitle}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          jobTitle: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-profile-company">
                      {messages.panelPage.userProfileCompanyFieldLabel}
                    </Label>
                    <Input
                      id="panel-profile-company"
                      value={draft.company}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          company: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-profile-location">
                      {messages.panelPage.userProfileLocationFieldLabel}
                    </Label>
                    <Input
                      id="panel-profile-location"
                      value={draft.location}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          location: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="navai-panel-form-grid">
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-profile-phone">
                      {messages.panelPage.userProfilePhoneFieldLabel}
                    </Label>
                    <Input
                      id="panel-profile-phone"
                      value={draft.phone}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-profile-website">
                      {messages.panelPage.userProfileWebsiteFieldLabel}
                    </Label>
                    <Input
                      id="panel-profile-website"
                      value={draft.websiteUrl}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          websiteUrl: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="navai-panel-form-grid">
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-profile-linkedin">
                      {messages.panelPage.userProfileLinkedinFieldLabel}
                    </Label>
                    <Input
                      id="panel-profile-linkedin"
                      value={draft.linkedinUrl}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          linkedinUrl: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-profile-github">
                      {messages.panelPage.userProfileGithubFieldLabel}
                    </Label>
                    <Input
                      id="panel-profile-github"
                      value={draft.githubUrl}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          githubUrl: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-profile-x">
                      {messages.panelPage.userProfileXFieldLabel}
                    </Label>
                    <Input
                      id="panel-profile-x"
                      value={draft.xUrl}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          xUrl: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-profile-instagram">
                      {messages.panelPage.userProfileInstagramFieldLabel}
                    </Label>
                    <Input
                      id="panel-profile-instagram"
                      value={draft.instagramUrl}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          instagramUrl: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-profile-facebook">
                      {messages.panelPage.userProfileFacebookFieldLabel}
                    </Label>
                    <Input
                      id="panel-profile-facebook"
                      value={draft.facebookUrl}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          facebookUrl: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="navai-panel-actions">
                  <Button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                  >
                    <Save aria-hidden="true" />
                    {messages.panelPage.saveButtonLabel}
                  </Button>
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="account" className="space-y-0">
            <section className="docs-section-block navai-panel-card">
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {messages.panelPage.userAccountDeletionSectionEyebrow}
                  </p>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-semibold text-foreground">
                        {messages.panelPage.userAccountDeletionSectionTitle}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {
                          messages.panelPage
                            .userAccountDeletionSectionDescription
                        }
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-border/70 bg-background/35 px-4 py-3 text-sm">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {messages.panelPage.userAccountStatusLabel}
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {accountStatusLabel}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1rem] border border-border/70 bg-background/35 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full border border-border/70 p-2">
                      <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {
                          messages.panelPage
                            .userAccountDeletionKeepRecordsNotice
                        }
                      </p>
                      {profile?.deletionRequestedAt ? (
                        <p className="text-sm text-muted-foreground">
                          {
                            messages.panelPage
                              .userAccountDeletionRequestedAtLabel
                          }
                          : {formatDateTime(profile.deletionRequestedAt)}
                        </p>
                      ) : null}
                      {profile?.scheduledDeletionAt ? (
                        <p className="text-sm text-muted-foreground">
                          {
                            messages.panelPage
                              .userAccountScheduledDeactivationAtLabel
                          }
                          : {formatDateTime(profile.scheduledDeletionAt)}
                        </p>
                      ) : null}
                      {profile?.deactivatedAt ? (
                        <p className="text-sm text-muted-foreground">
                          {messages.panelPage.userAccountDeactivatedAtLabel}:{" "}
                          {formatDateTime(profile.deactivatedAt)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="navai-panel-actions">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-rose-500"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={isDeletionPending || isInactive}
                  >
                    <Trash2 aria-hidden="true" />
                    {isDeletionPending
                      ? messages.panelPage
                          .userAccountDeletionRequestPendingLabel
                      : messages.panelPage
                          .userAccountDeletionRequestButtonLabel}
                  </Button>
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="verification" className="space-y-0">
            <section className="docs-section-block navai-panel-card">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {messages.panelPage.userVerificationSectionEyebrow}
                  </p>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-semibold text-foreground">
                        {messages.panelPage.userVerificationSectionTitle}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {messages.panelPage.userVerificationSectionDescription}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-border/70 bg-background/35 px-4 py-3 text-sm">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {messages.panelPage.userVerificationStatusLabel}
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {verificationStatusLabel}
                      </p>
                    </div>
                  </div>
                </div>

                {verificationError ? (
                  <p className="navai-panel-error">{verificationError}</p>
                ) : null}
                {verificationNotice ? (
                  <p className="navai-panel-success">{verificationNotice}</p>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                  <article className="rounded-[1rem] border border-border/70 bg-background/35 p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full border border-border/70 p-2">
                        <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {
                            messages.panelPage
                              .userVerificationCurrentStatusTitle
                          }
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {
                            messages.panelPage
                              .userVerificationCurrentStatusDescription
                          }
                        </p>
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-[0.9rem] border border-border/70 bg-background/45 p-4">
                        <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {messages.panelPage.userVerificationStatusLabel}
                        </dt>
                        <dd className="mt-2 text-sm font-medium text-foreground">
                          {verificationStatusLabel}
                        </dd>
                      </div>
                      <div className="rounded-[0.9rem] border border-border/70 bg-background/45 p-4">
                        <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {messages.panelPage.userVerificationDocumentTypeLabel}
                        </dt>
                        <dd className="mt-2 text-sm font-medium text-foreground">
                          {verificationDocumentTypeLabel}
                        </dd>
                      </div>
                      <div className="rounded-[0.9rem] border border-border/70 bg-background/45 p-4">
                        <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {messages.panelPage.userVerificationSubmittedAtLabel}
                        </dt>
                        <dd className="mt-2 text-sm font-medium text-foreground">
                          {formatDateTime(verification?.submittedAt ?? "")}
                        </dd>
                      </div>
                      <div className="rounded-[0.9rem] border border-border/70 bg-background/45 p-4">
                        <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {messages.panelPage.userVerificationReviewedAtLabel}
                        </dt>
                        <dd className="mt-2 text-sm font-medium text-foreground">
                          {formatDateTime(verification?.reviewedAt ?? "")}
                        </dd>
                      </div>
                    </dl>

                    {verification?.responseMessage ? (
                      <div className="mt-4 rounded-[0.9rem] border border-border/70 bg-background/45 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {messages.panelPage.userVerificationResponseLabel}
                        </p>
                        <p className="mt-2 text-sm text-foreground">
                          {verification.responseMessage}
                        </p>
                      </div>
                    ) : null}
                  </article>

                  <article className="rounded-[1rem] border border-border/70 bg-background/35 p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full border border-border/70 p-2">
                        <IdCard aria-hidden="true" className="h-4 w-4" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {messages.panelPage.userVerificationRequirementsTitle}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {
                            messages.panelPage
                              .userVerificationRequirementsDescription
                          }
                        </p>
                      </div>
                    </div>

                    <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                      <li>
                        {
                          messages.panelPage
                            .userVerificationRequirementFaceImage
                        }
                      </li>
                      <li>
                        {
                          messages.panelPage
                            .userVerificationRequirementFrontImage
                        }
                      </li>
                      <li>
                        {
                          messages.panelPage
                            .userVerificationRequirementBackImage
                        }
                      </li>
                      <li>
                        {
                          messages.panelPage
                            .userVerificationRequirementClearData
                        }
                      </li>
                    </ul>
                  </article>
                </div>

                <div className="navai-panel-form-grid">
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-verification-full-name">
                      {messages.panelPage.userVerificationFullNameLabel}
                    </Label>
                    <Input
                      id="panel-verification-full-name"
                      value={verificationDraft.fullName}
                      onChange={(event) =>
                        setVerificationDraft((current) => ({
                          ...current,
                          fullName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-verification-document-type">
                      {messages.panelPage.userVerificationDocumentTypeLabel}
                    </Label>
                    <select
                      id="panel-verification-document-type"
                      className="navai-panel-select"
                      value={verificationDraft.documentType}
                      onChange={(event) =>
                        setVerificationDraft((current) => ({
                          ...current,
                          documentType: event.target
                            .value as NavaiUserVerificationDocumentType,
                        }))
                      }
                    >
                      {VERIFICATION_DOCUMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {getVerificationDocumentTypeLabel(
                            type,
                            messages.panelPage,
                          )}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-verification-document-number">
                      {messages.panelPage.userVerificationDocumentNumberLabel}
                    </Label>
                    <Input
                      id="panel-verification-document-number"
                      value={verificationDraft.documentNumber}
                      onChange={(event) =>
                        setVerificationDraft((current) => ({
                          ...current,
                          documentNumber: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="navai-panel-field">
                    <Label htmlFor="panel-verification-document-country">
                      {messages.panelPage.userVerificationDocumentCountryLabel}
                    </Label>
                    <Input
                      id="panel-verification-document-country"
                      value={verificationDraft.documentCountry}
                      onChange={(event) =>
                        setVerificationDraft((current) => ({
                          ...current,
                          documentCountry: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <VerificationUploadCard
                    title={messages.panelPage.userVerificationSelfieTitle}
                    description={
                      messages.panelPage.userVerificationSelfieDescription
                    }
                    imageUrl={verificationDraft.selfieImageUrl}
                    inputId="panel-verification-selfie"
                    isUploading={uploadingField === "selfie"}
                    openLinkLabel={
                      messages.panelPage.userVerificationOpenFileButtonLabel
                    }
                    uploadButtonLabel={
                      messages.panelPage.userVerificationUploadFileButtonLabel
                    }
                    onFileSelected={(file) =>
                      void handleVerificationFileUpload("selfie", file)
                    }
                  />
                  <VerificationUploadCard
                    title={messages.panelPage.userVerificationFrontTitle}
                    description={
                      messages.panelPage.userVerificationFrontDescription
                    }
                    imageUrl={verificationDraft.documentFrontImageUrl}
                    inputId="panel-verification-front"
                    isUploading={uploadingField === "front"}
                    openLinkLabel={
                      messages.panelPage.userVerificationOpenFileButtonLabel
                    }
                    uploadButtonLabel={
                      messages.panelPage.userVerificationUploadFileButtonLabel
                    }
                    onFileSelected={(file) =>
                      void handleVerificationFileUpload("front", file)
                    }
                  />
                  <VerificationUploadCard
                    title={messages.panelPage.userVerificationBackTitle}
                    description={
                      messages.panelPage.userVerificationBackDescription
                    }
                    imageUrl={verificationDraft.documentBackImageUrl}
                    inputId="panel-verification-back"
                    isUploading={uploadingField === "back"}
                    openLinkLabel={
                      messages.panelPage.userVerificationOpenFileButtonLabel
                    }
                    uploadButtonLabel={
                      messages.panelPage.userVerificationUploadFileButtonLabel
                    }
                    onFileSelected={(file) =>
                      void handleVerificationFileUpload("back", file)
                    }
                  />
                </div>

                <div className="navai-panel-actions">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleVerificationSubmit()}
                    disabled={isVerificationSaving || uploadingField !== ""}
                  >
                    <ShieldCheck aria-hidden="true" />
                    {messages.panelPage.userVerificationSubmitButtonLabel}
                  </Button>
                </div>
              </div>
            </section>
          </TabsContent>
        </Tabs>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>
                {messages.panelPage.userAccountDeletionDialogTitle}
              </DialogTitle>
              <DialogDescription>
                {messages.panelPage.userAccountDeletionDialogDescription}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleteRequestSaving}
              >
                {messages.panelPage.userAccountDeletionDialogCancelLabel}
              </Button>
              <Button
                type="button"
                className="text-rose-500"
                onClick={() => void handleDeletionRequestConfirm()}
                disabled={isDeleteRequestSaving}
              >
                <Trash2 aria-hidden="true" />
                {messages.panelPage.userAccountDeletionDialogConfirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </article>
    </PanelModuleShellContent>
  );
}

function VerificationUploadCard({
  title,
  description,
  imageUrl,
  inputId,
  isUploading,
  uploadButtonLabel,
  openLinkLabel,
  onFileSelected,
}: {
  title: string;
  description: string;
  imageUrl: string;
  inputId: string;
  isUploading: boolean;
  uploadButtonLabel: string;
  openLinkLabel: string;
  onFileSelected: (file: File | null) => void;
}) {
  return (
    <article className="rounded-[1rem] border border-border/70 bg-background/35 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-full border border-border/70 p-2">
          <ImagePlus aria-hidden="true" className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[0.9rem] border border-border/70 bg-background/45">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-44 w-full object-cover"
          />
        ) : (
          <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
            {description}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="relative"
          disabled={isUploading}
        >
          <Upload aria-hidden="true" />
          {isUploading ? `${uploadButtonLabel}...` : uploadButtonLabel}
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(event) => {
              onFileSelected(event.target.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
          />
        </Button>

        {imageUrl ? (
          <Button type="button" variant="outline" asChild>
            <a href={imageUrl} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" />
              {openLinkLabel}
            </a>
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function getAccountStatusLabel(
  status: NavaiUserAccountStatus,
  panelMessages: ReturnType<typeof useI18n>["messages"]["panelPage"],
) {
  switch (status) {
    case "deletion_pending":
      return panelMessages.userAccountStatusDeletionPendingLabel;
    case "inactive":
      return panelMessages.userAccountStatusInactiveLabel;
    case "active":
    default:
      return panelMessages.userAccountStatusActiveLabel;
  }
}

function getAccountStatusIcon(status: NavaiUserAccountStatus) {
  switch (status) {
    case "deletion_pending":
      return <Clock3 aria-hidden="true" className="h-4 w-4" />;
    case "inactive":
      return <XCircle aria-hidden="true" className="h-4 w-4" />;
    case "active":
    default:
      return <BadgeCheck aria-hidden="true" className="h-4 w-4" />;
  }
}

function getVerificationStatusLabel(
  status: NavaiUserVerificationStatus,
  panelMessages: ReturnType<typeof useI18n>["messages"]["panelPage"],
) {
  switch (status) {
    case "pending":
      return panelMessages.userVerificationStatusPendingLabel;
    case "approved":
      return panelMessages.userVerificationStatusApprovedLabel;
    case "rejected":
      return panelMessages.userVerificationStatusRejectedLabel;
    case "changes_requested":
      return panelMessages.userVerificationStatusChangesRequestedLabel;
    default:
      return panelMessages.userVerificationStatusNotSubmittedLabel;
  }
}

function getVerificationDocumentTypeLabel(
  type: NavaiUserVerificationDocumentType,
  panelMessages: ReturnType<typeof useI18n>["messages"]["panelPage"],
) {
  switch (type) {
    case "identity_card":
      return panelMessages.userVerificationDocumentTypeIdentityCardLabel;
    case "passport":
      return panelMessages.userVerificationDocumentTypePassportLabel;
    case "drivers_license":
      return panelMessages.userVerificationDocumentTypeDriversLicenseLabel;
    case "foreign_id":
      return panelMessages.userVerificationDocumentTypeForeignIdLabel;
    case "other":
      return panelMessages.userVerificationDocumentTypeOtherLabel;
    case "citizenship_card":
    default:
      return panelMessages.userVerificationDocumentTypeCitizenshipCardLabel;
  }
}

function getVerificationStatusIcon(status: NavaiUserVerificationStatus) {
  switch (status) {
    case "approved":
      return <BadgeCheck aria-hidden="true" className="h-4 w-4" />;
    case "rejected":
      return <XCircle aria-hidden="true" className="h-4 w-4" />;
    case "pending":
    case "changes_requested":
      return <Clock3 aria-hidden="true" className="h-4 w-4" />;
    default:
      return <ShieldCheck aria-hidden="true" className="h-4 w-4" />;
  }
}
