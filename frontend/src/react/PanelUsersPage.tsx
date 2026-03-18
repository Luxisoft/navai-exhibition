"use client";

import { type ColumnDef } from "@tanstack/react-table";
import {
  BadgeCheck,
  Clock3,
  ExternalLink,
  Pencil,
  Route,
  Save,
  Shield,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";

import AppProvidersShell from "@/react/AppProvidersShell";
import { PanelModuleShellContent } from "@/react/PanelModuleShell";

import {
  PanelContentSkeleton,
  PanelSidebarCardsSkeleton,
} from "@/components/AppShellSkeletons";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFirebaseAuth } from "@/lib/firebase-auth";
import { useI18n } from "@/lib/i18n/provider";
import { useNavaiPanelAccess } from "@/lib/navai-panel-access";
import {
  listNavaiPanelManagedUsers,
  listNavaiPanelPendingUserVerifications,
  listNavaiPanelRolePermissions,
  listNavaiPanelRouteAccess,
  reviewNavaiPanelUserVerification,
  updateNavaiPanelManagedUserRole,
  updateNavaiPanelRolePermissions,
  updateNavaiPanelRouteAccess,
  type NavaiPanelActorRole,
  type NavaiPanelManagedUser,
  type NavaiPanelPendingUserVerification,
  type NavaiPanelRolePermission,
  type NavaiPanelRouteAccess,
  type NavaiPanelRouteAccessInput,
  type NavaiUserVerificationDocumentType,
  type NavaiUserVerificationStatus,
} from "@/lib/navai-panel-api";
import { getNavaiRouteAccessDisplayLabel } from "@/lib/navai-route-access";

type UserRoleDrafts = Record<string, NavaiPanelActorRole>;
type RolePermissionDrafts = Record<
  NavaiPanelActorRole,
  NavaiPanelRolePermission["permissions"]
>;
type VerificationReviewDrafts = Record<
  string,
  {
    status: Exclude<NavaiUserVerificationStatus, "not_submitted">;
    responseMessage: string;
  }
>;
type RouteAccessDrafts = Record<string, NavaiPanelRouteAccessInput>;
type RouteParentFilter = "all" | "documentation" | "implementation" | "panel";

const PANEL_ROLE_ORDER: NavaiPanelActorRole[] = [
  "admin",
  "moderator",
  "support",
  "user",
];

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

function resolveRouteParentFilter(item: NavaiPanelRouteAccess): Exclude<RouteParentFilter, "all"> {
  if (item.pathnamePattern.startsWith("/documentation")) {
    return "documentation";
  }

  if (item.pathnamePattern.startsWith("/request-implementation")) {
    return "implementation";
  }

  return "panel";
}

function getVerificationStatusLabel(
  status: NavaiUserVerificationStatus,
  panelMessages: ReturnType<typeof useI18n>["messages"]["panelPage"]
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

function getVerificationDocumentTypeLabel(
  type: NavaiUserVerificationDocumentType,
  panelMessages: ReturnType<typeof useI18n>["messages"]["panelPage"]
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

export default function PanelUsersPage() {
  return (
    <AppProvidersShell showMiniDock={true}>
      <PanelUsersPageContent />
    </AppProvidersShell>
  );
}

function PanelUsersPageContent() {
  const { messages } = useI18n();
  const { user } = useFirebaseAuth();
  const { actor, canManageUsers, refresh } = useNavaiPanelAccess();
  const [users, setUsers] = useState<NavaiPanelManagedUser[]>([]);
  const [roles, setRoles] = useState<NavaiPanelRolePermission[]>([]);
  const [routes, setRoutes] = useState<NavaiPanelRouteAccess[]>([]);
  const [verifications, setVerifications] = useState<NavaiPanelPendingUserVerification[]>([]);
  const [userRoleDrafts, setUserRoleDrafts] = useState<UserRoleDrafts>({});
  const [rolePermissionDrafts, setRolePermissionDrafts] =
    useState<RolePermissionDrafts>({} as RolePermissionDrafts);
  const [routeAccessDrafts, setRouteAccessDrafts] = useState<RouteAccessDrafts>({});
  const [verificationReviewDrafts, setVerificationReviewDrafts] =
    useState<VerificationReviewDrafts>({});
  const [selectedVerificationUserId, setSelectedVerificationUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingUserId, setSavingUserId] = useState("");
  const [savingRole, setSavingRole] = useState<NavaiPanelActorRole | "">("");
  const [savingRouteId, setSavingRouteId] = useState("");
  const [savingVerificationUserId, setSavingVerificationUserId] = useState("");
  const [routeParentFilter, setRouteParentFilter] = useState<RouteParentFilter>("all");
  const [editingRouteId, setEditingRouteId] = useState("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!user || !canManageUsers) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const idToken = await user.getIdToken();
        const [usersResponse, rolesResponse, routesResponse, verificationsResponse] = await Promise.all([
          listNavaiPanelManagedUsers(idToken),
          listNavaiPanelRolePermissions(idToken),
          listNavaiPanelRouteAccess(idToken),
          listNavaiPanelPendingUserVerifications(idToken),
        ]);

        if (!isMounted) {
          return;
        }

        setUsers(usersResponse.items);
        setRoles(rolesResponse.items);
        setRoutes(routesResponse.items);
        setVerifications(verificationsResponse.items);
        setUserRoleDrafts(
          Object.fromEntries(
            usersResponse.items.map((item) => [item.uid, item.role]),
          ) as UserRoleDrafts,
        );
        setRolePermissionDrafts(
          Object.fromEntries(
            rolesResponse.items.map((item) => [item.role, { ...item.permissions }]),
          ) as RolePermissionDrafts,
        );
        setRouteAccessDrafts(
          Object.fromEntries(
            routesResponse.items.map((item) => [
              item.routeId,
              {
                allowVisitor: item.allowVisitor,
                allowUser: item.allowUser,
                allowSupport: item.allowSupport,
                allowModerator: item.allowModerator,
                allowAdmin: item.allowAdmin,
              },
            ]),
          ) as RouteAccessDrafts,
        );
        setVerificationReviewDrafts(
          Object.fromEntries(
            verificationsResponse.items.map((item) => [
              item.verification.userId,
              {
                status:
                  item.verification.status === "not_submitted"
                    ? "pending"
                    : item.verification.status,
                responseMessage: item.verification.responseMessage,
              },
            ]),
          ) as VerificationReviewDrafts
        );
        setSelectedVerificationUserId((current) => {
          if (
            current &&
            verificationsResponse.items.some(
              (item) => item.verification.userId === current,
            )
          ) {
            return current;
          }

          return verificationsResponse.items[0]?.verification.userId ?? "";
        });
        setError("");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : messages.panelPage.userManagementLoadErrorMessage,
        );
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
  }, [canManageUsers, messages.panelPage.userManagementLoadErrorMessage, user]);

  const roleLabelMap = useMemo(
    () => ({
      admin: messages.panelPage.userManagementRoleAdminLabel,
      moderator: messages.panelPage.userManagementRoleModeratorLabel,
      support: messages.panelPage.userManagementRoleSupportLabel,
      user: messages.panelPage.userManagementRoleUserLabel,
    }),
    [
      messages.panelPage.userManagementRoleAdminLabel,
      messages.panelPage.userManagementRoleModeratorLabel,
      messages.panelPage.userManagementRoleSupportLabel,
      messages.panelPage.userManagementRoleUserLabel,
    ],
  );

  const saveUserRole = async (managedUser: NavaiPanelManagedUser) => {
    if (!user) {
      return;
    }

    const nextRole = userRoleDrafts[managedUser.uid] ?? managedUser.role;
    if (nextRole === managedUser.role) {
      return;
    }

    setSavingUserId(managedUser.uid);
    setError("");
    setNotice("");

    try {
      const idToken = await user.getIdToken();
      const response = await updateNavaiPanelManagedUserRole(idToken, managedUser.uid, {
        role: nextRole,
      });

      setUsers((current) =>
        current.map((item) => (item.uid === response.item.uid ? response.item : item)),
      );
      setUserRoleDrafts((current) => ({
        ...current,
        [response.item.uid]: response.item.role,
      }));
      setNotice(messages.panelPage.userManagementUserSavedMessage);
      await refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : messages.panelPage.userManagementSaveErrorMessage,
      );
    } finally {
      setSavingUserId("");
    }
  };

  const saveRolePermissions = async (role: NavaiPanelActorRole) => {
    if (!user) {
      return;
    }

    const nextPermissions = rolePermissionDrafts[role];
    if (!nextPermissions) {
      return;
    }

    setSavingRole(role);
    setError("");
    setNotice("");

    try {
      const idToken = await user.getIdToken();
      const response = await updateNavaiPanelRolePermissions(
        idToken,
        role,
        nextPermissions,
      );

      setRoles((current) =>
        current.map((item) => (item.role === response.item.role ? response.item : item)),
      );
      setRolePermissionDrafts((current) => ({
        ...current,
        [response.item.role]: { ...response.item.permissions },
      }));
      setNotice(messages.panelPage.userManagementPermissionsSavedMessage);
      await refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : messages.panelPage.userManagementSaveErrorMessage,
      );
    } finally {
      setSavingRole("");
    }
  };

  const saveRouteAccess = async (route: NavaiPanelRouteAccess) => {
    if (!user) {
      return;
    }

    const draft = routeAccessDrafts[route.routeId];
    if (!draft) {
      return;
    }

    const hasChanges =
      draft.allowVisitor !== route.allowVisitor ||
      draft.allowUser !== route.allowUser ||
      draft.allowSupport !== route.allowSupport ||
      draft.allowModerator !== route.allowModerator ||
      draft.allowAdmin !== route.allowAdmin;
    if (!hasChanges) {
      return;
    }

    setSavingRouteId(route.routeId);
    setError("");
    setNotice("");

    try {
      const idToken = await user.getIdToken();
      const response = await updateNavaiPanelRouteAccess(idToken, route.routeId, draft);
      setRoutes((current) =>
        current.map((item) => (item.routeId === response.item.routeId ? response.item : item)),
      );
      setRouteAccessDrafts((current) => ({
        ...current,
        [response.item.routeId]: {
          allowVisitor: response.item.allowVisitor,
          allowUser: response.item.allowUser,
          allowSupport: response.item.allowSupport,
          allowModerator: response.item.allowModerator,
          allowAdmin: response.item.allowAdmin,
        },
      }));
      setNotice(messages.panelPage.userManagementRouteSavedMessage);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : messages.panelPage.userManagementSaveErrorMessage,
      );
    } finally {
      setSavingRouteId("");
    }
  };

  const updateRouteDraft = (
    route: NavaiPanelRouteAccess,
    patch: Partial<NavaiPanelRouteAccessInput>,
  ) => {
    setRouteAccessDrafts((current) => ({
      ...current,
      [route.routeId]: {
        ...(current[route.routeId] ?? {
          allowVisitor: route.allowVisitor,
          allowUser: route.allowUser,
          allowSupport: route.allowSupport,
          allowModerator: route.allowModerator,
          allowAdmin: route.allowAdmin,
        }),
        ...patch,
      },
    }));
  };

  const editingRoute = useMemo(
    () => routes.find((item) => item.routeId === editingRouteId) ?? null,
    [editingRouteId, routes]
  );

  const filteredRoutes = useMemo(
    () =>
      routes.filter((item) =>
        routeParentFilter === "all"
          ? true
          : resolveRouteParentFilter(item) === routeParentFilter
      ),
    [routeParentFilter, routes]
  );

  const editingRouteDraft = editingRoute
    ? (routeAccessDrafts[editingRoute.routeId] ?? {
        allowVisitor: editingRoute.allowVisitor,
        allowUser: editingRoute.allowUser,
        allowSupport: editingRoute.allowSupport,
        allowModerator: editingRoute.allowModerator,
        allowAdmin: editingRoute.allowAdmin,
      })
    : null;

  const editingRouteHasChanges = Boolean(
    editingRoute &&
      editingRouteDraft &&
      (editingRouteDraft.allowVisitor !== editingRoute.allowVisitor ||
        editingRouteDraft.allowUser !== editingRoute.allowUser ||
        editingRouteDraft.allowSupport !== editingRoute.allowSupport ||
        editingRouteDraft.allowModerator !== editingRoute.allowModerator ||
        editingRouteDraft.allowAdmin !== editingRoute.allowAdmin)
  );

  const selectedVerification = useMemo(
    () =>
      verifications.find(
        (item) => item.verification.userId === selectedVerificationUserId,
      ) ?? verifications[0] ?? null,
    [selectedVerificationUserId, verifications]
  );

  const saveVerificationReview = async (
    item: NavaiPanelPendingUserVerification,
  ) => {
    if (!user) {
      return;
    }

    const reviewDraft = verificationReviewDrafts[item.verification.userId];
    if (!reviewDraft) {
      return;
    }

    setSavingVerificationUserId(item.verification.userId);
    setError("");
    setNotice("");

    try {
      const idToken = await user.getIdToken();
      await reviewNavaiPanelUserVerification(idToken, item.verification.userId, reviewDraft);
      setVerifications((current) =>
        current.filter(
          (entry) => entry.verification.userId !== item.verification.userId,
        )
      );
      setVerificationReviewDrafts((current) => {
        const next = { ...current };
        delete next[item.verification.userId];
        return next;
      });
      setSelectedVerificationUserId((current) => {
        if (current !== item.verification.userId) {
          return current;
        }

        const remaining = verifications.filter(
          (entry) => entry.verification.userId !== item.verification.userId,
        );
        return remaining[0]?.verification.userId ?? "";
      });
      setNotice(messages.panelPage.userManagementVerificationSavedMessage);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : messages.panelPage.userManagementSaveErrorMessage,
      );
    } finally {
      setSavingVerificationUserId("");
    }
  };

  const userColumns = useMemo<ColumnDef<NavaiPanelManagedUser>[]>(
    () => [
      {
        id: "identity",
        accessorFn: (row) => `${row.email} ${row.uid} ${row.role}`,
        header: messages.panelPage.userManagementUserColumnLabel,
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {row.original.email || row.original.uid}
            </p>
            <p className="text-xs text-muted-foreground">{row.original.uid}</p>
          </div>
        ),
      },
      {
        id: "role",
        accessorFn: (row) => userRoleDrafts[row.uid] ?? row.role,
        header: messages.panelPage.userManagementRoleColumnLabel,
        cell: ({ row }) => (
          <select
            className="navai-panel-select min-w-[11rem]"
            value={userRoleDrafts[row.original.uid] ?? row.original.role}
            onChange={(event) =>
              setUserRoleDrafts((current) => ({
                ...current,
                [row.original.uid]: event.target.value as NavaiPanelActorRole,
              }))
            }
          >
            {PANEL_ROLE_ORDER.map((role) => (
              <option key={role} value={role}>
                {roleLabelMap[role]}
              </option>
            ))}
          </select>
        ),
      },
      {
        accessorKey: "lastSeenAt",
        header: messages.panelPage.userManagementLastSeenColumnLabel,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(row.original.lastSeenAt)}
          </span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: messages.panelPage.userManagementUpdatedAtColumnLabel,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(row.original.updatedAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: messages.panelPage.actionsColumnLabel,
        cell: ({ row }) => {
          const nextRole = userRoleDrafts[row.original.uid] ?? row.original.role;
          const hasChanges = nextRole !== row.original.role;
          return (
            <Button
              type="button"
              variant="outline"
              onClick={() => void saveUserRole(row.original)}
              disabled={!hasChanges || savingUserId === row.original.uid}
            >
              <Save aria-hidden="true" />
              <span>{messages.panelPage.userManagementSaveRoleButtonLabel}</span>
            </Button>
          );
        },
      },
    ],
    [
      messages.panelPage.actionsColumnLabel,
      messages.panelPage.userManagementLastSeenColumnLabel,
      messages.panelPage.userManagementRoleColumnLabel,
      messages.panelPage.userManagementSaveRoleButtonLabel,
      messages.panelPage.userManagementUpdatedAtColumnLabel,
      messages.panelPage.userManagementUserColumnLabel,
      roleLabelMap,
      savingUserId,
      userRoleDrafts,
    ],
  );

  const verificationColumns = useMemo<
    ColumnDef<NavaiPanelPendingUserVerification>[]
  >(
    () => [
      {
        id: "identity",
        accessorFn: (row) =>
          `${row.profile.displayName} ${row.profile.email} ${row.verification.documentNumber} ${row.verification.fullName}`,
        header: messages.panelPage.userManagementVerificationUserColumnLabel,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-background/45 text-xs font-semibold text-foreground">
              {row.original.profile.photoUrl ? (
                <img
                  src={row.original.profile.photoUrl}
                  alt={row.original.profile.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>
                  {(row.original.profile.displayName || row.original.profile.email || "NA")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                {row.original.profile.displayName || row.original.verification.fullName}
              </p>
              <p className="text-xs text-muted-foreground">
                {row.original.profile.email || row.original.verification.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "submittedAt",
        accessorFn: (row) => row.verification.submittedAt,
        header: messages.panelPage.userManagementVerificationSubmittedAtColumnLabel,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(row.original.verification.submittedAt)}
          </span>
        ),
      },
      {
        id: "document",
        accessorFn: (row) =>
          `${row.verification.documentType} ${row.verification.documentNumber} ${row.verification.documentCountry}`,
        header: messages.panelPage.userManagementVerificationDocumentColumnLabel,
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {getVerificationDocumentTypeLabel(
                row.original.verification.documentType,
                messages.panelPage,
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.original.verification.documentNumber}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        accessorFn: (row) => row.verification.status,
        header: messages.panelPage.userManagementVerificationStatusColumnLabel,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2 text-sm text-foreground">
            {getVerificationStatusIcon(row.original.verification.status)}
            {getVerificationStatusLabel(
              row.original.verification.status,
              messages.panelPage,
            )}
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
            onClick={() => setSelectedVerificationUserId(row.original.verification.userId)}
          >
            <ShieldCheck aria-hidden="true" />
            <span>{messages.panelPage.userManagementVerificationReviewButtonLabel}</span>
          </Button>
        ),
      },
    ],
    [messages.panelPage]
  );

  const roleColumns = useMemo<ColumnDef<NavaiPanelRolePermission>[]>(
    () => [
      {
        accessorKey: "role",
        header: messages.panelPage.userManagementRoleColumnLabel,
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {roleLabelMap[row.original.role]}
          </span>
        ),
      },
      {
        id: "canEditTableData",
        accessorFn: (row) =>
          Number(
            rolePermissionDrafts[row.role]?.canEditTableData ??
              row.permissions.canEditTableData,
          ),
        header: messages.panelPage.userManagementEditPermissionLabel,
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={
              rolePermissionDrafts[row.original.role]?.canEditTableData ??
              row.original.permissions.canEditTableData
            }
            disabled={!row.original.isEditable}
            onChange={(event) =>
              setRolePermissionDrafts((current) => ({
                ...current,
                [row.original.role]: {
                  ...(current[row.original.role] ?? row.original.permissions),
                  canEditTableData: event.target.checked,
                },
              }))
            }
          />
        ),
      },
      {
        id: "canDeleteTableData",
        accessorFn: (row) =>
          Number(
            rolePermissionDrafts[row.role]?.canDeleteTableData ??
              row.permissions.canDeleteTableData,
          ),
        header: messages.panelPage.userManagementDeletePermissionLabel,
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={
              rolePermissionDrafts[row.original.role]?.canDeleteTableData ??
              row.original.permissions.canDeleteTableData
            }
            disabled={!row.original.isEditable}
            onChange={(event) =>
              setRolePermissionDrafts((current) => ({
                ...current,
                [row.original.role]: {
                  ...(current[row.original.role] ?? row.original.permissions),
                  canDeleteTableData: event.target.checked,
                },
              }))
            }
          />
        ),
      },
      {
        id: "canManageUsers",
        accessorFn: (row) =>
          Number(
            rolePermissionDrafts[row.role]?.canManageUsers ??
              row.permissions.canManageUsers,
          ),
        header: messages.panelPage.userManagementManageUsersPermissionLabel,
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={
              rolePermissionDrafts[row.original.role]?.canManageUsers ??
              row.original.permissions.canManageUsers
            }
            disabled={!row.original.isEditable}
            onChange={(event) =>
              setRolePermissionDrafts((current) => ({
                ...current,
                [row.original.role]: {
                  ...(current[row.original.role] ?? row.original.permissions),
                  canManageUsers: event.target.checked,
                },
              }))
            }
          />
        ),
      },
      {
        accessorKey: "updatedAt",
        header: messages.panelPage.userManagementUpdatedAtColumnLabel,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.updatedAt
              ? formatDateTime(row.original.updatedAt)
              : messages.panelPage.userManagementSystemManagedLabel}
          </span>
        ),
      },
      {
        id: "actions",
        header: messages.panelPage.actionsColumnLabel,
        cell: ({ row }) =>
          row.original.isEditable ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void saveRolePermissions(row.original.role)}
              disabled={savingRole === row.original.role}
            >
              <Save aria-hidden="true" />
              <span>
                {messages.panelPage.userManagementSavePermissionsButtonLabel}
              </span>
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">
              {messages.panelPage.userManagementSystemManagedLabel}
            </span>
          ),
      },
    ],
    [
      messages.panelPage.actionsColumnLabel,
      messages.panelPage.userManagementDeletePermissionLabel,
      messages.panelPage.userManagementEditPermissionLabel,
      messages.panelPage.userManagementManageUsersPermissionLabel,
      messages.panelPage.userManagementRoleColumnLabel,
      messages.panelPage.userManagementSavePermissionsButtonLabel,
      messages.panelPage.userManagementSystemManagedLabel,
      messages.panelPage.userManagementUpdatedAtColumnLabel,
      roleLabelMap,
      rolePermissionDrafts,
      savingRole,
    ],
  );

  const routeColumns = useMemo<ColumnDef<NavaiPanelRouteAccess>[]>(
    () => [
      {
        id: "page",
        accessorFn: (row) =>
          `${getNavaiRouteAccessDisplayLabel(messages, row)} ${row.pathnamePattern} ${row.routeId}`,
        header: messages.panelPage.userManagementRouteColumnLabel,
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {getNavaiRouteAccessDisplayLabel(messages, row.original)}
            </p>
            <p className="text-xs text-muted-foreground">{row.original.pathnamePattern}</p>
          </div>
        ),
      },
      {
        id: "url",
        accessorFn: (row) => row.pathnamePattern,
        header: messages.panelPage.routeUrlFieldLabel,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.pathnamePattern}
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
            onClick={() => setEditingRouteId(row.original.routeId)}
          >
            <Pencil aria-hidden="true" />
            <span>{messages.panelPage.editActionLabel}</span>
          </Button>
        ),
      },
    ],
    [
      messages,
      messages.panelPage.actionsColumnLabel,
      messages.panelPage.userManagementRouteColumnLabel,
      messages.panelPage.routeUrlFieldLabel,
      messages.panelPage.editActionLabel,
    ],
  );

  const sidebarContent = isLoading ? (
    <PanelSidebarCardsSkeleton />
  ) : (
    <section className="navai-panel-sidebar-section">
      <div className="grid gap-3">
        <article className="rounded-[1rem] border border-border/70 bg-background/35 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-border/70 p-2">
              <Users aria-hidden="true" className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {messages.panelPage.userManagementUsersSectionLabel}
              </p>
              <p className="text-2xl font-semibold text-foreground">{users.length}</p>
            </div>
          </div>
        </article>
        <article className="rounded-[1rem] border border-border/70 bg-background/35 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-border/70 p-2">
              <Shield aria-hidden="true" className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {messages.panelPage.userManagementRolesSectionLabel}
              </p>
              <p className="text-2xl font-semibold text-foreground">{roles.length}</p>
            </div>
          </div>
        </article>
        <article className="rounded-[1rem] border border-border/70 bg-background/35 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-border/70 p-2">
              <Route aria-hidden="true" className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {messages.panelPage.userManagementRoutesSectionLabel}
              </p>
              <p className="text-2xl font-semibold text-foreground">{routes.length}</p>
            </div>
          </div>
        </article>
        <article className="rounded-[1rem] border border-border/70 bg-background/35 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-border/70 p-2">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {messages.panelPage.userManagementVerificationPendingCountLabel}
              </p>
              <p className="text-2xl font-semibold text-foreground">{verifications.length}</p>
            </div>
          </div>
        </article>
        {actor ? (
          <article className="rounded-[1rem] border border-border/70 bg-background/35 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {messages.panelPage.userManagementCurrentAdminLabel}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {actor.email || actor.uid}
            </p>
          </article>
        ) : null}
      </div>
    </section>
  );

  return (
    <PanelModuleShellContent
      page="users"
      requireAdmin={true}
      description={messages.panelPage.userManagementDescription}
      rightSidebarExtra={sidebarContent}
    >
      <article className="navai-panel-layout">
        <section className="docs-section-block navai-panel-card">
          {error ? <p className="navai-panel-error">{error}</p> : null}
          {notice ? <p className="navai-panel-success">{notice}</p> : null}

          {isLoading ? (
            <PanelContentSkeleton />
          ) : (
            <Tabs defaultValue="users" className="space-y-6">
              <TabsList className="grid w-full max-w-[56rem] grid-cols-4">
                <TabsTrigger value="users">
                  {messages.panelPage.userManagementUsersSectionLabel}
                </TabsTrigger>
                <TabsTrigger value="roles">
                  {messages.panelPage.userManagementRolesSectionLabel}
                </TabsTrigger>
                <TabsTrigger value="routes">
                  {messages.panelPage.userManagementRoutesSectionLabel}
                </TabsTrigger>
                <TabsTrigger value="verifications">
                  {messages.panelPage.userManagementVerificationsSectionLabel}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-foreground">
                    {messages.panelPage.userManagementUsersSectionLabel}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {messages.panelPage.userManagementUsersSectionDescription}
                  </p>
                </div>

                <DataTable
                  columns={userColumns}
                  data={users}
                  emptyMessage={messages.panelPage.userManagementUsersEmptyMessage}
                  filterColumnId="identity"
                  filterPlaceholder={
                    messages.panelPage.userManagementUsersFilterPlaceholder
                  }
                  columnsButtonLabel={messages.panelPage.tableColumnsButtonLabel}
                  previousPageLabel={messages.panelPage.tablePreviousPageLabel}
                  nextPageLabel={messages.panelPage.tableNextPageLabel}
                  paginationSummaryTemplate={
                    messages.panelPage.tablePaginationSummaryLabel
                  }
                />
              </TabsContent>

              <TabsContent value="roles" className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-foreground">
                    {messages.panelPage.userManagementRolesSectionLabel}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {messages.panelPage.userManagementRolesSectionDescription}
                  </p>
                </div>

                <DataTable
                  columns={roleColumns}
                  data={roles}
                  emptyMessage={messages.panelPage.userManagementRolesEmptyMessage}
                  filterColumnId="role"
                  filterPlaceholder={
                    messages.panelPage.userManagementRolesFilterPlaceholder
                  }
                  columnsButtonLabel={messages.panelPage.tableColumnsButtonLabel}
                  previousPageLabel={messages.panelPage.tablePreviousPageLabel}
                  nextPageLabel={messages.panelPage.tableNextPageLabel}
                  paginationSummaryTemplate={
                    messages.panelPage.tablePaginationSummaryLabel
                  }
                />
              </TabsContent>

              <TabsContent value="routes" className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-foreground">
                    {messages.panelPage.userManagementRoutesSectionLabel}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {messages.panelPage.userManagementRoutesSectionDescription}
                  </p>
                </div>

                <DataTable
                  columns={routeColumns}
                  data={filteredRoutes}
                  emptyMessage={messages.panelPage.userManagementRoutesEmptyMessage}
                  filterColumnId="page"
                  filterPlaceholder={
                    messages.panelPage.userManagementRoutesFilterPlaceholder
                  }
                  columnsButtonLabel={messages.panelPage.tableColumnsButtonLabel}
                  previousPageLabel={messages.panelPage.tablePreviousPageLabel}
                  nextPageLabel={messages.panelPage.tableNextPageLabel}
                  paginationSummaryTemplate={
                    messages.panelPage.tablePaginationSummaryLabel
                  }
                  toolbarActions={
                    <select
                      className="navai-panel-select w-full md:w-[13rem]"
                      value={routeParentFilter}
                      onChange={(event) =>
                        setRouteParentFilter(event.target.value as RouteParentFilter)
                      }
                    >
                      <option value="all">
                        {messages.panelPage.userManagementRoutesSectionLabel}
                      </option>
                      <option value="documentation">{messages.common.documentation}</option>
                      <option value="implementation">
                        {messages.common.requestImplementation}
                      </option>
                      <option value="panel">{messages.common.navaiPanel}</option>
                    </select>
                  }
                />

                <Dialog
                  open={Boolean(editingRoute)}
                  onOpenChange={(open) => {
                    if (!open) {
                      setEditingRouteId("");
                    }
                  }}
                >
                  <DialogContent className="max-w-[34rem]">
                    <DialogHeader>
                      <DialogTitle>
                        {messages.panelPage.userManagementRouteColumnLabel}
                      </DialogTitle>
                    </DialogHeader>

                    {editingRoute && editingRouteDraft ? (
                      <div className="space-y-4">
                        <div className="rounded-[0.9rem] border border-border/70 bg-background/45 p-3">
                          <p className="font-medium text-foreground">
                            {getNavaiRouteAccessDisplayLabel(messages, editingRoute)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {editingRoute.pathnamePattern}
                          </p>
                        </div>

                        <div className="grid gap-3">
                          <label className="navai-panel-checkbox-field">
                            <input
                              type="checkbox"
                              checked={editingRouteDraft.allowVisitor}
                              disabled={
                                !editingRoute.editableVisitor ||
                                savingRouteId === editingRoute.routeId
                              }
                              onChange={(event) =>
                                updateRouteDraft(editingRoute, {
                                  allowVisitor: event.target.checked,
                                })
                              }
                            />
                            <span>{messages.panelPage.userManagementRoleVisitorLabel}</span>
                          </label>

                          <label className="navai-panel-checkbox-field">
                            <input
                              type="checkbox"
                              checked={editingRouteDraft.allowUser}
                              disabled={
                                !editingRoute.editableUser ||
                                savingRouteId === editingRoute.routeId
                              }
                              onChange={(event) =>
                                updateRouteDraft(editingRoute, {
                                  allowUser: event.target.checked,
                                })
                              }
                            />
                            <span>{roleLabelMap.user}</span>
                          </label>

                          <label className="navai-panel-checkbox-field">
                            <input
                              type="checkbox"
                              checked={editingRouteDraft.allowSupport}
                              disabled={
                                !editingRoute.editableSupport ||
                                savingRouteId === editingRoute.routeId
                              }
                              onChange={(event) =>
                                updateRouteDraft(editingRoute, {
                                  allowSupport: event.target.checked,
                                })
                              }
                            />
                            <span>{roleLabelMap.support}</span>
                          </label>

                          <label className="navai-panel-checkbox-field">
                            <input
                              type="checkbox"
                              checked={editingRouteDraft.allowModerator}
                              disabled={
                                !editingRoute.editableModerator ||
                                savingRouteId === editingRoute.routeId
                              }
                              onChange={(event) =>
                                updateRouteDraft(editingRoute, {
                                  allowModerator: event.target.checked,
                                })
                              }
                            />
                            <span>{roleLabelMap.moderator}</span>
                          </label>

                          <label className="navai-panel-checkbox-field">
                            <input
                              type="checkbox"
                              checked={editingRouteDraft.allowAdmin}
                              disabled={
                                !editingRoute.editableAdmin ||
                                savingRouteId === editingRoute.routeId
                              }
                              onChange={(event) =>
                                updateRouteDraft(editingRoute, {
                                  allowAdmin: event.target.checked,
                                })
                              }
                            />
                            <span>{roleLabelMap.admin}</span>
                          </label>
                        </div>
                      </div>
                    ) : null}

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingRouteId("");
                        }}
                      >
                        <span>{messages.panelPage.cancelActionLabel}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (!editingRoute) {
                            return;
                          }
                          void saveRouteAccess(editingRoute);
                        }}
                        disabled={
                          !editingRoute ||
                          !editingRouteHasChanges ||
                          savingRouteId === editingRoute.routeId
                        }
                      >
                        <Save aria-hidden="true" />
                        <span>{messages.panelPage.userManagementRouteSaveButtonLabel}</span>
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              <TabsContent value="verifications" className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-foreground">
                    {messages.panelPage.userManagementVerificationsSectionLabel}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {messages.panelPage.userManagementVerificationsSectionDescription}
                  </p>
                </div>

                <DataTable
                  columns={verificationColumns}
                  data={verifications}
                  emptyMessage={messages.panelPage.userManagementVerificationsEmptyMessage}
                  filterColumnId="identity"
                  filterPlaceholder={
                    messages.panelPage.userManagementVerificationsFilterPlaceholder
                  }
                  columnsButtonLabel={messages.panelPage.tableColumnsButtonLabel}
                  previousPageLabel={messages.panelPage.tablePreviousPageLabel}
                  nextPageLabel={messages.panelPage.tableNextPageLabel}
                  paginationSummaryTemplate={
                    messages.panelPage.tablePaginationSummaryLabel
                  }
                />

                {selectedVerification ? (
                  <article className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <section className="rounded-[1rem] border border-border/70 bg-background/35 p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-background/45 text-lg font-semibold text-foreground">
                          {selectedVerification.profile.photoUrl ? (
                            <img
                              src={selectedVerification.profile.photoUrl}
                              alt={selectedVerification.profile.displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>
                              {(
                                selectedVerification.profile.displayName ||
                                selectedVerification.profile.email ||
                                "NA"
                              )
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {selectedVerification.profile.displayName ||
                              selectedVerification.verification.fullName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedVerification.profile.email ||
                              selectedVerification.verification.email}
                          </p>
                          {selectedVerification.profile.professionalHeadline ? (
                            <p className="text-sm text-muted-foreground">
                              {selectedVerification.profile.professionalHeadline}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <dl className="mt-5 grid gap-4">
                        <div className="rounded-[0.9rem] border border-border/70 bg-background/45 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {messages.panelPage.userVerificationDocumentTypeLabel}
                          </dt>
                          <dd className="mt-2 text-sm font-medium text-foreground">
                            {getVerificationDocumentTypeLabel(
                              selectedVerification.verification.documentType,
                              messages.panelPage,
                            )}
                          </dd>
                        </div>
                        <div className="rounded-[0.9rem] border border-border/70 bg-background/45 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {messages.panelPage.userVerificationDocumentNumberLabel}
                          </dt>
                          <dd className="mt-2 text-sm font-medium text-foreground">
                            {selectedVerification.verification.documentNumber}
                          </dd>
                        </div>
                        <div className="rounded-[0.9rem] border border-border/70 bg-background/45 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {messages.panelPage.userVerificationDocumentCountryLabel}
                          </dt>
                          <dd className="mt-2 text-sm font-medium text-foreground">
                            {selectedVerification.verification.documentCountry}
                          </dd>
                        </div>
                        <div className="rounded-[0.9rem] border border-border/70 bg-background/45 p-4">
                          <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {messages.panelPage.userVerificationSubmittedAtLabel}
                          </dt>
                          <dd className="mt-2 text-sm font-medium text-foreground">
                            {formatDateTime(selectedVerification.verification.submittedAt)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <VerificationLinkButton
                          href={selectedVerification.verification.selfieImage?.url || ""}
                          label={messages.panelPage.userVerificationSelfieTitle}
                        />
                        <VerificationLinkButton
                          href={
                            selectedVerification.verification.documentFrontImage?.url || ""
                          }
                          label={messages.panelPage.userVerificationFrontTitle}
                        />
                        <VerificationLinkButton
                          href={
                            selectedVerification.verification.documentBackImage?.url || ""
                          }
                          label={messages.panelPage.userVerificationBackTitle}
                        />
                      </div>
                    </section>

                    <section className="rounded-[1rem] border border-border/70 bg-background/35 p-5">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {messages.panelPage.userManagementVerificationReviewPanelTitle}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {messages.panelPage.userManagementVerificationReviewPanelDescription}
                        </p>
                      </div>

                      <div className="mt-5 space-y-4">
                        <div className="navai-panel-field">
                          <Label htmlFor="panel-verification-review-status">
                            {messages.panelPage.userManagementVerificationStatusColumnLabel}
                          </Label>
                          <select
                            id="panel-verification-review-status"
                            className="navai-panel-select"
                            value={
                              verificationReviewDrafts[
                                selectedVerification.verification.userId
                              ]?.status ?? "pending"
                            }
                            onChange={(event) =>
                              setVerificationReviewDrafts((current) => ({
                                ...current,
                                [selectedVerification.verification.userId]: {
                                  ...(current[selectedVerification.verification.userId] ?? {
                                    status: "pending",
                                    responseMessage: "",
                                  }),
                                  status: event.target.value as Exclude<
                                    NavaiUserVerificationStatus,
                                    "not_submitted"
                                  >,
                                },
                              }))
                            }
                          >
                            <option value="pending">
                              {messages.panelPage.userVerificationStatusPendingLabel}
                            </option>
                            <option value="approved">
                              {messages.panelPage.userVerificationStatusApprovedLabel}
                            </option>
                            <option value="changes_requested">
                              {messages.panelPage.userVerificationStatusChangesRequestedLabel}
                            </option>
                            <option value="rejected">
                              {messages.panelPage.userVerificationStatusRejectedLabel}
                            </option>
                          </select>
                        </div>

                        <div className="navai-panel-field">
                          <Label htmlFor="panel-verification-review-response">
                            {messages.panelPage.userManagementVerificationResponseFieldLabel}
                          </Label>
                          <Textarea
                            id="panel-verification-review-response"
                            className="min-h-[10rem]"
                            value={
                              verificationReviewDrafts[
                                selectedVerification.verification.userId
                              ]?.responseMessage ?? ""
                            }
                            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                              setVerificationReviewDrafts((current) => ({
                                ...current,
                                [selectedVerification.verification.userId]: {
                                  ...(current[selectedVerification.verification.userId] ?? {
                                    status: "pending",
                                    responseMessage: "",
                                  }),
                                  responseMessage: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>

                        <div className="navai-panel-actions">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void saveVerificationReview(selectedVerification)}
                            disabled={
                              savingVerificationUserId ===
                              selectedVerification.verification.userId
                            }
                          >
                            <Save aria-hidden="true" />
                            <span>
                              {messages.panelPage.userManagementVerificationSaveButtonLabel}
                            </span>
                          </Button>
                        </div>
                      </div>
                    </section>
                  </article>
                ) : null}
              </TabsContent>
            </Tabs>
          )}
        </section>
      </article>
    </PanelModuleShellContent>
  );
}

function VerificationLinkButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return href ? (
    <Button type="button" variant="outline" asChild>
      <a href={href} target="_blank" rel="noreferrer">
        <ExternalLink aria-hidden="true" />
        <span>{label}</span>
      </a>
    </Button>
  ) : (
    <Button type="button" variant="outline" disabled={true}>
      <ExternalLink aria-hidden="true" />
      <span>{label}</span>
    </Button>
  );
}
