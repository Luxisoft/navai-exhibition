'use client';

import type { ColumnDef } from "@tanstack/react-table";
import {
  BriefcaseBusiness,
  Building2,
  ExternalLink,
  FileImage,
  Globe,
  LifeBuoy,
  Mail,
  MapPin,
  Phone,
  Plus,
  SendHorizontal,
  Upload,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import AppProvidersShell from "./AppProvidersShell";

import { PanelContentSkeleton, PanelSidebarCardsSkeleton } from "@/components/AppShellSkeletons";
import KnowledgeTemplate from "@/components/KnowledgeTemplate";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { REQUEST_IMPLEMENTATION_HREF } from "@/lib/auth-redirect";
import {
  createCloudflareStreamDirectUpload,
  createNavaiPanelSupportMessage,
  createNavaiPanelSupportTicket,
  listNavaiPanelSupportTickets,
  uploadCloudflareImageBlob,
  uploadCloudflareStreamBlob,
  type NavaiPanelSupportAttachment,
  type NavaiPanelSupportAttachmentKind,
  type NavaiPanelSupportTicket,
} from "@/lib/navai-panel-api";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useI18n } from "@/lib/i18n/provider";
import { useNavaiPanelAccess } from "@/lib/navai-panel-access";
import { buildNavaiPanelSidebarGroups } from "@/lib/navai-panel-navigation";
import { useRouter } from "@/platform/navigation";

type SupportTicketFormPatch = {
  subject?: string;
  channel?: string;
  category?: string;
  priority?: string;
  message?: string;
};

type SupportTicketFormEventDetail = {
  openForm?: boolean;
  patch?: SupportTicketFormPatch;
};

type SupportReplyFormEventDetail = {
  body?: string;
};

type SupportAttachmentDraft = {
  id: string;
  kind: NavaiPanelSupportAttachmentKind;
  assetId: string;
  url: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

type SupportAttachmentTarget = "ticket" | "reply";

const SUPPORT_TICKET_FORM_EVENT = "navai:panel-support-ticket-form";
const SUPPORT_TICKET_SAVE_EVENT = "navai:panel-support-ticket-save";
const SUPPORT_REPLY_FORM_EVENT = "navai:panel-support-reply-form";
const SUPPORT_REPLY_SEND_EVENT = "navai:panel-support-reply-send";
const SUPPORT_FILTER_ALL = "all";
const MAX_SUPPORT_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_SUPPORT_VIDEO_SIZE_BYTES = 200 * 1024 * 1024;

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

function buildInitials(value: string) {
  const tokens = value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "NA";
  }

  return tokens
    .map((token) => token.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

function buildSupportAttachmentDraftId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildSupportIdentity(ticket: NavaiPanelSupportTicket) {
  return [
    ticket.subject,
    ticket.requesterEmail,
    ticket.requesterProfile.displayName,
    ticket.priority,
    ticket.category,
    ticket.channel,
    ticket.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function toSupportAttachmentDraft(
  attachment: Omit<SupportAttachmentDraft, "id">
): SupportAttachmentDraft {
  return {
    id: buildSupportAttachmentDraftId(),
    ...attachment,
  };
}

function getSupportAttachmentIcon(kind: NavaiPanelSupportAttachmentKind) {
  return kind === "video" ? (
    <Video aria-hidden="true" className="h-4 w-4" />
  ) : (
    <FileImage aria-hidden="true" className="h-4 w-4" />
  );
}

function PanelSupportContent() {
  const { messages } = useI18n();
  const { isInitializing, user } = useFirebaseAuth();
  const { canManageUsers } = useNavaiPanelAccess();
  const router = useRouter();
  const [tickets, setTickets] = useState<NavaiPanelSupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [composer, setComposer] = useState("");
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketChannel, setNewTicketChannel] = useState("Web");
  const [newTicketCategory, setNewTicketCategory] = useState("General");
  const [newTicketPriority, setNewTicketPriority] = useState("Medium");
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [newTicketAttachments, setNewTicketAttachments] = useState<
    SupportAttachmentDraft[]
  >([]);
  const [replyAttachments, setReplyAttachments] = useState<SupportAttachmentDraft[]>(
    []
  );
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploadingAttachmentTarget, setUploadingAttachmentTarget] = useState<
    SupportAttachmentTarget | ""
  >("");
  const [priorityFilter, setPriorityFilter] = useState(SUPPORT_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState(SUPPORT_FILTER_ALL);
  const [categoryFilter, setCategoryFilter] = useState(SUPPORT_FILTER_ALL);
  const [channelFilter, setChannelFilter] = useState(SUPPORT_FILTER_ALL);
  const ticketFileInputRef = useRef<HTMLInputElement | null>(null);
  const replyFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!user) {
      router.replace(REQUEST_IMPLEMENTATION_HREF);
    }
  }, [isInitializing, router, user]);

  const panelGroups = buildNavaiPanelSidebarGroups(messages, { canManageUsers });
  const isAdminInbox = canManageUsers;

  useEffect(() => {
    let isMounted = true;

    const loadTickets = async () => {
      setIsLoadingTickets(true);
      setError("");

      try {
        const idToken = await user?.getIdToken();
        if (!idToken) {
          return;
        }

        const response = await listNavaiPanelSupportTickets(idToken);
        if (!isMounted) {
          return;
        }

        setTickets(response.items);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : messages.panelPage.loadErrorMessage
        );
      } finally {
        if (isMounted) {
          setIsLoadingTickets(false);
        }
      }
    };

    void loadTickets();

    return () => {
      isMounted = false;
    };
  }, [messages.panelPage.loadErrorMessage, user]);

  const adminInboxTickets = useMemo(() => {
    if (!user) {
      return [];
    }

    return tickets.filter((ticket) => ticket.userId !== user.uid);
  }, [tickets, user]);

  const filteredAdminInboxTickets = useMemo(() => {
    return adminInboxTickets.filter((ticket) => {
      if (
        priorityFilter !== SUPPORT_FILTER_ALL &&
        ticket.priority !== priorityFilter
      ) {
        return false;
      }
      if (statusFilter !== SUPPORT_FILTER_ALL && ticket.status !== statusFilter) {
        return false;
      }
      if (
        categoryFilter !== SUPPORT_FILTER_ALL &&
        ticket.category !== categoryFilter
      ) {
        return false;
      }
      if (channelFilter !== SUPPORT_FILTER_ALL && ticket.channel !== channelFilter) {
        return false;
      }
      return true;
    });
  }, [
    adminInboxTickets,
    categoryFilter,
    channelFilter,
    priorityFilter,
    statusFilter,
  ]);

  const visibleSidebarTickets = useMemo(() => {
    return isAdminInbox ? filteredAdminInboxTickets : tickets;
  }, [filteredAdminInboxTickets, isAdminInbox, tickets]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [selectedTicketId, tickets]
  );

  useEffect(() => {
    if (isCreatingTicket && !isAdminInbox) {
      return;
    }

    if (visibleSidebarTickets.length === 0) {
      setSelectedTicketId("");
      return;
    }

    const hasSelectedTicket = visibleSidebarTickets.some(
      (ticket) => ticket.id === selectedTicketId
    );
    if (!hasSelectedTicket) {
      setSelectedTicketId(visibleSidebarTickets[0]?.id ?? "");
    }
  }, [isAdminInbox, isCreatingTicket, selectedTicketId, visibleSidebarTickets]);

  const handleSend = async () => {
    const nextBody = composer.trim();
    if (!selectedTicket || (!nextBody && replyAttachments.length === 0)) {
      return;
    }

    const idToken = await user?.getIdToken();
    if (!idToken) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const response = await createNavaiPanelSupportMessage(idToken, selectedTicket.id, {
        body: nextBody,
        attachments: replyAttachments.map((attachment) => ({
          kind: attachment.kind,
          assetId: attachment.assetId,
          url: attachment.url,
          fileName: attachment.fileName,
          contentType: attachment.contentType,
          sizeBytes: attachment.sizeBytes,
        })),
      });

      setTickets((current) =>
        current.map((ticket) => (ticket.id === response.item.id ? response.item : ticket))
      );
      setComposer("");
      setReplyAttachments([]);
      setNotice(messages.panelPage.saveSuccessMessage);
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : messages.panelPage.saveErrorMessage
      );
    }
  };

  const handleCreateTicket = async () => {
    const subject = newTicketSubject.trim();
    const message = newTicketMessage.trim();
    if (!subject || (!message && newTicketAttachments.length === 0)) {
      return;
    }

    const idToken = await user?.getIdToken();
    if (!idToken) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const response = await createNavaiPanelSupportTicket(idToken, {
        subject,
        channel: newTicketChannel,
        category: newTicketCategory,
        priority: newTicketPriority,
        message,
        attachments: newTicketAttachments.map((attachment) => ({
          kind: attachment.kind,
          assetId: attachment.assetId,
          url: attachment.url,
          fileName: attachment.fileName,
          contentType: attachment.contentType,
          sizeBytes: attachment.sizeBytes,
        })),
      });

      setTickets((current) => [...current, response.item]);
      setSelectedTicketId(response.item.id);
      setNewTicketSubject("");
      setNewTicketChannel("Web");
      setNewTicketCategory("General");
      setNewTicketPriority("Medium");
      setNewTicketMessage("");
      setNewTicketAttachments([]);
      setIsCreatingTicket(false);
      setNotice(messages.panelPage.createSuccessMessage);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : messages.panelPage.saveErrorMessage
      );
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleTicketFormEvent = (event: Event) => {
      if (isAdminInbox) {
        return;
      }

      const customEvent = event as CustomEvent<SupportTicketFormEventDetail>;
      const patch = customEvent.detail?.patch ?? {};

      setNewTicketSubject((current) =>
        typeof patch.subject === "string" ? patch.subject : current
      );
      setNewTicketChannel((current) =>
        typeof patch.channel === "string" ? patch.channel : current
      );
      setNewTicketCategory((current) =>
        typeof patch.category === "string" ? patch.category : current
      );
      setNewTicketPriority((current) =>
        typeof patch.priority === "string" ? patch.priority : current
      );
      setNewTicketMessage((current) =>
        typeof patch.message === "string" ? patch.message : current
      );

      if (customEvent.detail?.openForm !== false) {
        setSelectedTicketId("");
        setIsCreatingTicket(true);
      }
    };

    const handleTicketSaveEvent = () => {
      void handleCreateTicket();
    };

    const handleReplyFormEvent = (event: Event) => {
      const customEvent = event as CustomEvent<SupportReplyFormEventDetail>;
      setComposer(typeof customEvent.detail?.body === "string" ? customEvent.detail.body : "");
    };

    const handleReplySendEvent = () => {
      void handleSend();
    };

    window.addEventListener(SUPPORT_TICKET_FORM_EVENT, handleTicketFormEvent as EventListener);
    window.addEventListener(SUPPORT_TICKET_SAVE_EVENT, handleTicketSaveEvent);
    window.addEventListener(SUPPORT_REPLY_FORM_EVENT, handleReplyFormEvent as EventListener);
    window.addEventListener(SUPPORT_REPLY_SEND_EVENT, handleReplySendEvent);

    return () => {
      window.removeEventListener(SUPPORT_TICKET_FORM_EVENT, handleTicketFormEvent as EventListener);
      window.removeEventListener(SUPPORT_TICKET_SAVE_EVENT, handleTicketSaveEvent);
      window.removeEventListener(SUPPORT_REPLY_FORM_EVENT, handleReplyFormEvent as EventListener);
      window.removeEventListener(SUPPORT_REPLY_SEND_EVENT, handleReplySendEvent);
    };
  }, [handleCreateTicket, handleSend, isAdminInbox]);

  const uploadAttachments = async (
    target: SupportAttachmentTarget,
    fileList: FileList | null
  ) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const idToken = await user?.getIdToken();
    if (!idToken) {
      return;
    }

    setUploadingAttachmentTarget(target);
    setError("");
    setNotice("");

    const uploadedAttachments: SupportAttachmentDraft[] = [];
    let lastError = "";

    try {
      for (const file of Array.from(fileList)) {
        if (file.type.startsWith("image/")) {
          if (file.size > MAX_SUPPORT_IMAGE_SIZE_BYTES) {
            lastError = messages.panelPage.supportAttachmentImageSizeErrorMessage;
            continue;
          }

          try {
            const upload = await uploadCloudflareImageBlob(idToken, file, file.name);
            uploadedAttachments.push(
              toSupportAttachmentDraft({
                kind: "image",
                assetId: upload.id,
                url: upload.url,
                fileName: file.name,
                contentType: file.type || "image/*",
                sizeBytes: file.size,
              })
            );
          } catch {
            lastError = messages.panelPage.supportAttachmentUploadErrorMessage;
          }
          continue;
        }

        if (file.type.startsWith("video/")) {
          if (file.size > MAX_SUPPORT_VIDEO_SIZE_BYTES) {
            lastError = messages.panelPage.supportAttachmentVideoSizeErrorMessage;
            continue;
          }

          try {
            const streamUpload = await createCloudflareStreamDirectUpload(idToken, {
              maxDurationSeconds: 900,
            });
            const upload = await uploadCloudflareStreamBlob(
              streamUpload.uploadURL,
              streamUpload.uid,
              file,
              file.name,
              file.type || "video/mp4"
            );
            uploadedAttachments.push(
              toSupportAttachmentDraft({
                kind: "video",
                assetId: upload.uid,
                url: upload.playbackUrl,
                fileName: file.name,
                contentType: upload.contentType,
                sizeBytes: upload.sizeBytes,
              })
            );
          } catch {
            lastError = messages.panelPage.supportAttachmentUploadErrorMessage;
          }
          continue;
        }

        lastError = messages.panelPage.supportAttachmentTypeErrorMessage;
      }

      if (uploadedAttachments.length > 0) {
        if (target === "ticket") {
          setNewTicketAttachments((current) => [...current, ...uploadedAttachments]);
        } else {
          setReplyAttachments((current) => [...current, ...uploadedAttachments]);
        }
        setNotice(messages.panelPage.supportAttachmentUploadSuccessMessage);
      }

      if (lastError) {
        setError(lastError);
      }
    } finally {
      setUploadingAttachmentTarget("");
      if (target === "ticket" && ticketFileInputRef.current) {
        ticketFileInputRef.current.value = "";
      }
      if (target === "reply" && replyFileInputRef.current) {
        replyFileInputRef.current.value = "";
      }
    }
  };

  const supportPriorityOptions = [
    {
      value: "Low",
      label: messages.panelPage.supportPriorityLowOptionLabel,
    },
    {
      value: "Medium",
      label: messages.panelPage.supportPriorityMediumOptionLabel,
    },
    {
      value: "High",
      label: messages.panelPage.supportPriorityHighOptionLabel,
    },
    {
      value: "Urgent",
      label: messages.panelPage.supportPriorityUrgentOptionLabel,
    },
  ];

  const supportStatusOptions = Array.from(
    new Set(adminInboxTickets.map((ticket) => ticket.status))
  ).sort((left, right) => left.localeCompare(right));

  const supportChannelOptions = Array.from(
    new Set(adminInboxTickets.map((ticket) => ticket.channel))
  ).sort((left, right) => left.localeCompare(right));

  const supportCategoryOptions = Array.from(
    new Set(adminInboxTickets.map((ticket) => ticket.category))
  ).sort((left, right) => left.localeCompare(right));

  const adminInboxColumns = useMemo<ColumnDef<NavaiPanelSupportTicket>[]>(
    () => [
      {
        id: "identity",
        accessorFn: (row) => buildSupportIdentity(row),
        header: messages.panelPage.supportTicketRequesterColumnLabel,
        cell: ({ row }) => {
          const profile = row.original.requesterProfile;
          const name =
            profile.displayName || profile.email || row.original.requesterEmail;
          return (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.original.requesterEmail}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "subject",
        header: messages.panelPage.supportTicketSubjectColumnLabel,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.subject}</span>
        ),
      },
      {
        accessorKey: "priority",
        header: messages.panelPage.supportTicketPriorityColumnLabel,
      },
      {
        accessorKey: "category",
        header: messages.panelPage.supportTicketCategoryColumnLabel,
      },
      {
        accessorKey: "channel",
        header: messages.panelPage.supportTicketChannelColumnLabel,
      },
      {
        accessorKey: "status",
        header: messages.panelPage.supportTicketStatusColumnLabel,
        cell: ({ row }) => (
          <span className="navai-panel-table-badge">{row.original.status}</span>
        ),
      },
      {
        id: "messages",
        accessorFn: (row) => row.messages.length,
        header: messages.panelPage.supportTicketMessagesColumnLabel,
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.messages.length}</span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: messages.panelPage.supportTicketCreatedAtColumnLabel,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: messages.panelPage.supportTicketUpdatedAtColumnLabel,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(row.original.updatedAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: messages.panelPage.actionsColumnLabel,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSelectedTicketId(row.original.id);
              setIsCreatingTicket(false);
              setNotice("");
              setError("");
            }}
          >
            <span>{messages.panelPage.supportOpenTicketButtonLabel}</span>
          </Button>
        ),
      },
    ],
    [
      messages.panelPage.actionsColumnLabel,
      messages.panelPage.supportOpenTicketButtonLabel,
      messages.panelPage.supportTicketCategoryColumnLabel,
      messages.panelPage.supportTicketChannelColumnLabel,
      messages.panelPage.supportTicketCreatedAtColumnLabel,
      messages.panelPage.supportTicketMessagesColumnLabel,
      messages.panelPage.supportTicketPriorityColumnLabel,
      messages.panelPage.supportTicketRequesterColumnLabel,
      messages.panelPage.supportTicketStatusColumnLabel,
      messages.panelPage.supportTicketSubjectColumnLabel,
      messages.panelPage.supportTicketUpdatedAtColumnLabel,
    ]
  );

  const renderAttachmentDrafts = (
    items: SupportAttachmentDraft[],
    target: SupportAttachmentTarget
  ) => {
    if (items.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          {messages.panelPage.supportAttachmentsEmptyMessage}
        </p>
      );
    }

    return (
      <div className="grid gap-2">
        {items.map((attachment) => (
          <div
            key={attachment.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[0.9rem] border border-border/70 bg-background/35 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                {getSupportAttachmentIcon(attachment.kind)}
                <span className="truncate">{attachment.fileName}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {attachment.contentType} · {Math.ceil(attachment.sizeBytes / 1024)} KB
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild={true} type="button" variant="outline" size="sm">
                <a href={attachment.url} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" />
                  <span>{messages.panelPage.supportOpenAttachmentButtonLabel}</span>
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const setState =
                    target === "ticket" ? setNewTicketAttachments : setReplyAttachments;
                  setState((current) =>
                    current.filter((item) => item.id !== attachment.id)
                  );
                }}
              >
                <span>{messages.panelPage.supportRemoveAttachmentButtonLabel}</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMessageAttachments = (attachments: NavaiPanelSupportAttachment[]) => {
    if (attachments.length === 0) {
      return null;
    }

    return (
      <div className="grid gap-2">
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {messages.panelPage.supportAttachmentsSectionTitle}
        </span>
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <Button asChild={true} key={attachment.id} type="button" variant="outline" size="sm">
              <a href={attachment.url} target="_blank" rel="noreferrer">
                {getSupportAttachmentIcon(attachment.kind)}
                <span>{attachment.fileName || messages.panelPage.supportOpenAttachmentButtonLabel}</span>
              </a>
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const ticketSidebar = isLoadingTickets ? (
    <PanelSidebarCardsSkeleton />
  ) : (
    <section className="navai-panel-sidebar-section">
      <div className="navai-panel-sidebar-header">
        <div className="navai-panel-sidebar-copy">
          <h2>
            {isAdminInbox
              ? messages.panelPage.supportAdminInboxTitle
              : messages.panelPage.supportTicketsTitle}
          </h2>
          {isAdminInbox ? (
            <p className="text-sm text-muted-foreground">
              {messages.panelPage.supportAdminInboxDescription}
            </p>
          ) : null}
        </div>
        {!isAdminInbox ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSelectedTicketId("");
              setIsCreatingTicket(true);
            }}
            className="navai-panel-sidebar-create-button"
          >
            <Plus aria-hidden="true" />
            <span>{messages.panelPage.supportNewTicketButtonLabel}</span>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3">
        {isAdminInbox ? (
          <article className="rounded-[1rem] border border-border/70 bg-background/35 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {messages.panelPage.supportTicketMessagesColumnLabel}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {adminInboxTickets.length}
            </p>
          </article>
        ) : null}

        {visibleSidebarTickets.length > 0 ? (
          <div className="navai-support-ticket-items">
            {visibleSidebarTickets.map((ticket) => {
              const isActive = ticket.id === selectedTicket?.id;
              return (
                <button
                  key={ticket.id}
                  type="button"
                  className={`navai-support-ticket-item${isActive ? " is-active" : ""}`}
                  onClick={() => {
                    setSelectedTicketId(ticket.id);
                    setIsCreatingTicket(false);
                    setError("");
                    setNotice("");
                  }}
                >
                  <strong>{ticket.subject}</strong>
                  <span>
                    {isAdminInbox
                      ? `${ticket.requesterProfile.displayName || ticket.requesterEmail} · ${ticket.priority}`
                      : `${ticket.category} · ${ticket.priority}`}
                  </span>
                  <small>{ticket.status}</small>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {messages.panelPage.supportEmptyTicketsMessage}
          </p>
        )}
      </div>
    </section>
  );

  if (isInitializing || !user) {
    return (
      <KnowledgeTemplate
        activeTopNav="navai-panel"
        title={messages.panelPage.supportNavLabel}
        description={messages.panelPage.supportDescription}
        sidebarTitle=""
        sections={[]}
        sidebarPageGroups={panelGroups}
        showRightSidebarSourceLink={false}
        showRightSidebarToc={false}
        rightSidebarContent={<PanelSidebarCardsSkeleton />}
        sourceLabel={messages.common.sourceRepository}
        sourceHref="https://github.com/Luxisoft/navai"
        customSectionsContent={<PanelContentSkeleton />}
      />
    );
  }

  return (
    <KnowledgeTemplate
      activeTopNav="navai-panel"
      title={messages.panelPage.supportNavLabel}
      description={messages.panelPage.supportDescription}
      sidebarTitle=""
      sections={[]}
      sidebarPageGroups={panelGroups}
      showRightSidebarSourceLink={false}
      showRightSidebarToc={false}
      rightSidebarContent={ticketSidebar}
      sourceLabel={messages.common.sourceRepository}
      sourceHref="https://github.com/Luxisoft/navai"
      customSectionsContent={
        <article className="navai-panel-layout">
          {isLoadingTickets ? <PanelContentSkeleton /> : null}
          {error ? <p className="navai-panel-error">{error}</p> : null}
          {notice ? <p className="navai-panel-success">{notice}</p> : null}
          {!isLoadingTickets && isAdminInbox ? (
            <section className="docs-section-block navai-panel-card space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">
                  {messages.panelPage.supportAdminInboxTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {messages.panelPage.supportAdminInboxDescription}
                </p>
              </div>

              <DataTable
                columns={adminInboxColumns}
                data={filteredAdminInboxTickets}
                emptyMessage={messages.panelPage.supportEmptyTicketsMessage}
                filterColumnId="identity"
                filterPlaceholder={messages.panelPage.supportTicketsFilterPlaceholder}
                columnsButtonLabel={messages.panelPage.tableColumnsButtonLabel}
                previousPageLabel={messages.panelPage.tablePreviousPageLabel}
                nextPageLabel={messages.panelPage.tableNextPageLabel}
                paginationSummaryTemplate={messages.panelPage.tablePaginationSummaryLabel}
                toolbarActions={
                  <>
                    <select
                      value={priorityFilter}
                      onChange={(event) => setPriorityFilter(event.target.value)}
                      className="navai-panel-select"
                      aria-label={messages.panelPage.supportPriorityPlaceholder}
                    >
                      <option value={SUPPORT_FILTER_ALL}>
                        {messages.panelPage.supportFilterAllOptionLabel}
                      </option>
                      {supportPriorityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="navai-panel-select"
                      aria-label={messages.panelPage.supportStatusPlaceholder}
                    >
                      <option value={SUPPORT_FILTER_ALL}>
                        {messages.panelPage.supportFilterAllOptionLabel}
                      </option>
                      {supportStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <select
                      value={categoryFilter}
                      onChange={(event) => setCategoryFilter(event.target.value)}
                      className="navai-panel-select"
                      aria-label={messages.panelPage.supportCategoryPlaceholder}
                    >
                      <option value={SUPPORT_FILTER_ALL}>
                        {messages.panelPage.supportFilterAllOptionLabel}
                      </option>
                      {supportCategoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <select
                      value={channelFilter}
                      onChange={(event) => setChannelFilter(event.target.value)}
                      className="navai-panel-select"
                      aria-label={messages.panelPage.supportChannelPlaceholder}
                    >
                      <option value={SUPPORT_FILTER_ALL}>
                        {messages.panelPage.supportFilterAllOptionLabel}
                      </option>
                      {supportChannelOptions.map((channel) => (
                        <option key={channel} value={channel}>
                          {channel}
                        </option>
                      ))}
                    </select>
                  </>
                }
              />
            </section>
          ) : null}
          {!isLoadingTickets && selectedTicket && isAdminInbox ? (
            <section className="docs-section-block navai-panel-card">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <section className="rounded-[1rem] border border-border/70 bg-background/35 p-5">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {messages.panelPage.supportRequesterInfoTitle}
                    </p>
                    <h3 className="text-xl font-semibold text-foreground">
                      {messages.panelPage.supportRequesterInfoTitle}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {messages.panelPage.supportRequesterInfoDescription}
                    </p>
                  </div>

                  <div className="mt-5 flex items-start gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-background/45 text-lg font-semibold text-foreground">
                      {selectedTicket.requesterProfile.photoUrl ? (
                        <img
                          src={selectedTicket.requesterProfile.photoUrl}
                          alt={
                            selectedTicket.requesterProfile.displayName ||
                            selectedTicket.requesterEmail
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>
                          {buildInitials(
                            selectedTicket.requesterProfile.displayName ||
                              selectedTicket.requesterEmail
                          )}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold text-foreground">
                        {selectedTicket.requesterProfile.displayName ||
                          selectedTicket.requesterEmail}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {selectedTicket.requesterEmail}
                      </p>
                      {selectedTicket.requesterProfile.professionalHeadline ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {selectedTicket.requesterProfile.professionalHeadline}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3">
                    {selectedTicket.requesterProfile.jobTitle ? (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <BriefcaseBusiness aria-hidden="true" className="mt-0.5 h-4 w-4" />
                        <span>{selectedTicket.requesterProfile.jobTitle}</span>
                      </div>
                    ) : null}
                    {selectedTicket.requesterProfile.company ? (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Building2 aria-hidden="true" className="mt-0.5 h-4 w-4" />
                        <span>{selectedTicket.requesterProfile.company}</span>
                      </div>
                    ) : null}
                    {selectedTicket.requesterProfile.location ? (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4" />
                        <span>{selectedTicket.requesterProfile.location}</span>
                      </div>
                    ) : null}
                    {selectedTicket.requesterProfile.phone ? (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Phone aria-hidden="true" className="mt-0.5 h-4 w-4" />
                        <span>{selectedTicket.requesterProfile.phone}</span>
                      </div>
                    ) : null}
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Mail aria-hidden="true" className="mt-0.5 h-4 w-4" />
                      <span>{selectedTicket.requesterEmail}</span>
                    </div>
                    {selectedTicket.requesterProfile.websiteUrl ? (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Globe aria-hidden="true" className="mt-0.5 h-4 w-4" />
                        <a
                          href={selectedTicket.requesterProfile.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all underline-offset-4 hover:underline"
                        >
                          {selectedTicket.requesterProfile.websiteUrl}
                        </a>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="navai-support-chat-card rounded-[1rem] border border-border/70 bg-background/35 p-5">
                  <div className="navai-support-chat-header">
                    <div>
                      <h2>{messages.panelPage.supportConversationTitle}</h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedTicket.subject}
                      </p>
                    </div>
                    <div className="navai-support-chat-status">
                      <span className="navai-panel-table-badge">{selectedTicket.status}</span>
                    </div>
                  </div>

                  <div className="navai-support-chat-thread">
                    {selectedTicket.messages.map((message) => (
                      <article
                        key={message.id}
                        className={`navai-support-message${message.authorRole === "support" ? " is-team" : ""}`}
                      >
                        <header>
                          <strong>{message.author}</strong>
                          <span>{formatDateTime(message.createdAt)}</span>
                        </header>
                        {message.body ? <p>{message.body}</p> : null}
                        {renderMessageAttachments(message.attachments)}
                      </article>
                    ))}
                  </div>

                  <div className="navai-support-composer">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {messages.panelPage.supportAttachmentsSectionTitle}
                      </p>
                      {renderAttachmentDrafts(replyAttachments, "reply")}
                    </div>

                    <input
                      ref={replyFileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple={true}
                      className="hidden"
                      onChange={(event) =>
                        void uploadAttachments("reply", event.target.files)
                      }
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => replyFileInputRef.current?.click()}
                      disabled={uploadingAttachmentTarget === "reply"}
                      className="w-fit"
                    >
                      <Upload aria-hidden="true" />
                      <span>{messages.panelPage.supportUploadAttachmentsButtonLabel}</span>
                    </Button>

                    <Textarea
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                      placeholder={messages.panelPage.supportReplyPlaceholder}
                      className="min-h-[7rem]"
                    />
                    <Button type="button" onClick={() => void handleSend()}>
                      <SendHorizontal aria-hidden="true" />
                      <span>{messages.panelPage.supportSendButtonLabel}</span>
                    </Button>
                  </div>
                </section>
              </div>
            </section>
          ) : null}
          {!isLoadingTickets && !selectedTicket && isAdminInbox ? (
            <section className="docs-section-block navai-panel-card">
              <p className="text-sm text-muted-foreground">
                {messages.panelPage.supportSelectTicketMessage}
              </p>
            </section>
          ) : null}
          {!isLoadingTickets && !isAdminInbox ? (
            <section className="docs-section-block navai-panel-card navai-support-chat-card">
              {selectedTicket && !isCreatingTicket ? (
                <div className="navai-support-chat-status">
                  <span className="navai-panel-table-badge">{selectedTicket.status}</span>
                </div>
              ) : null}

              {isCreatingTicket || !selectedTicket ? (
                <div className="navai-support-composer">
                  <Input
                    value={newTicketSubject}
                    onChange={(event) => setNewTicketSubject(event.target.value)}
                    placeholder={messages.panelPage.supportSubjectPlaceholder}
                  />
                  <div className="navai-support-composer-grid">
                    <select
                      value={newTicketChannel}
                      onChange={(event) => setNewTicketChannel(event.target.value)}
                      className="navai-panel-select"
                      aria-label={messages.panelPage.supportChannelPlaceholder}
                    >
                      <option value="Web">{messages.panelPage.supportChannelWebOptionLabel}</option>
                      <option value="Email">{messages.panelPage.supportChannelEmailOptionLabel}</option>
                      <option value="WhatsApp">{messages.panelPage.supportChannelWhatsappOptionLabel}</option>
                    </select>
                    <select
                      value={newTicketCategory}
                      onChange={(event) => setNewTicketCategory(event.target.value)}
                      className="navai-panel-select"
                      aria-label={messages.panelPage.supportCategoryPlaceholder}
                    >
                      <option value="General">{messages.panelPage.supportCategoryGeneralOptionLabel}</option>
                      <option value="Access">{messages.panelPage.supportCategoryAccessOptionLabel}</option>
                      <option value="Bug">{messages.panelPage.supportCategoryBugOptionLabel}</option>
                      <option value="Billing">{messages.panelPage.supportCategoryBillingOptionLabel}</option>
                      <option value="Integration">{messages.panelPage.supportCategoryIntegrationOptionLabel}</option>
                    </select>
                    <select
                      value={newTicketPriority}
                      onChange={(event) => setNewTicketPriority(event.target.value)}
                      className="navai-panel-select"
                      aria-label={messages.panelPage.supportPriorityPlaceholder}
                    >
                      <option value="Low">{messages.panelPage.supportPriorityLowOptionLabel}</option>
                      <option value="Medium">{messages.panelPage.supportPriorityMediumOptionLabel}</option>
                      <option value="High">{messages.panelPage.supportPriorityHighOptionLabel}</option>
                      <option value="Urgent">{messages.panelPage.supportPriorityUrgentOptionLabel}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {messages.panelPage.supportAttachmentsSectionTitle}
                    </p>
                    {renderAttachmentDrafts(newTicketAttachments, "ticket")}
                  </div>

                  <input
                    ref={ticketFileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple={true}
                    className="hidden"
                    onChange={(event) =>
                      void uploadAttachments("ticket", event.target.files)
                    }
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => ticketFileInputRef.current?.click()}
                    disabled={uploadingAttachmentTarget === "ticket"}
                    className="w-fit"
                  >
                    <Upload aria-hidden="true" />
                    <span>{messages.panelPage.supportUploadAttachmentsButtonLabel}</span>
                  </Button>

                  <Textarea
                    value={newTicketMessage}
                    onChange={(event) => setNewTicketMessage(event.target.value)}
                    placeholder={messages.panelPage.supportReplyPlaceholder}
                    className="min-h-[10rem]"
                  />
                  <Button type="button" onClick={() => void handleCreateTicket()}>
                    <LifeBuoy aria-hidden="true" />
                    <span>{messages.panelPage.supportStartTicketButtonLabel}</span>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="navai-support-chat-header">
                    <div>
                      <h2>{messages.panelPage.supportConversationTitle}</h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedTicket.subject}
                      </p>
                    </div>
                  </div>

                  <div className="navai-support-chat-thread">
                    {selectedTicket.messages.map((message) => (
                      <article
                        key={message.id}
                        className={`navai-support-message${message.authorRole === "support" ? " is-team" : ""}`}
                      >
                        <header>
                          <strong>{message.author}</strong>
                          <span>{formatDateTime(message.createdAt)}</span>
                        </header>
                        {message.body ? <p>{message.body}</p> : null}
                        {renderMessageAttachments(message.attachments)}
                      </article>
                    ))}
                  </div>

                  <div className="navai-support-composer">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {messages.panelPage.supportAttachmentsSectionTitle}
                      </p>
                      {renderAttachmentDrafts(replyAttachments, "reply")}
                    </div>

                    <input
                      ref={replyFileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple={true}
                      className="hidden"
                      onChange={(event) =>
                        void uploadAttachments("reply", event.target.files)
                      }
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => replyFileInputRef.current?.click()}
                      disabled={uploadingAttachmentTarget === "reply"}
                      className="w-fit"
                    >
                      <Upload aria-hidden="true" />
                      <span>{messages.panelPage.supportUploadAttachmentsButtonLabel}</span>
                    </Button>

                    <Textarea
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                      placeholder={messages.panelPage.supportReplyPlaceholder}
                      className="min-h-[7rem]"
                    />
                    <Button type="button" onClick={() => void handleSend()}>
                      <SendHorizontal aria-hidden="true" />
                      <span>{messages.panelPage.supportSendButtonLabel}</span>
                    </Button>
                  </div>
                </>
              )}
            </section>
          ) : null}
        </article>
      }
    />
  );
}

export default function PanelSupportPage() {
  return (
    <AppProvidersShell showMiniDock={true}>
      <PanelSupportContent />
    </AppProvidersShell>
  );
}
