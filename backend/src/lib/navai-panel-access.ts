function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function readEmailList(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(/[,\n;]/)
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
}

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

export function getDefaultNavaiPanelRolePermissions(
  role: NavaiPanelActorRole,
): NavaiPanelActorPermissions {
  switch (role) {
    case "support":
      return {
        canEditTableData: true,
        canDeleteTableData: false,
        canManageUsers: false,
      };
    case "moderator":
      return {
        canEditTableData: true,
        canDeleteTableData: true,
        canManageUsers: false,
      };
    case "admin":
      return {
        canEditTableData: true,
        canDeleteTableData: true,
        canManageUsers: true,
      };
    default:
      return {
        canEditTableData: false,
        canDeleteTableData: false,
        canManageUsers: false,
      };
  }
}

export function resolveNavaiPanelActor(session: { uid: string; email?: string }) {
  const email = normalizeEmail(session.email);
  const adminUsers = readEmailList(process.env.NAVAI_ADMIN_USER);
  const moderatorUsers = readEmailList(process.env.NAVAI_MOD_USER);
  const supportUsers = readEmailList(process.env.NAVAI_SUPPORT_USER);

  let role: NavaiPanelActorRole = "user";
  if (email && supportUsers.includes(email)) {
    role = "support";
  }
  if (email && moderatorUsers.includes(email)) {
    role = "moderator";
  }
  if (email && adminUsers.includes(email)) {
    role = "admin";
  }

  return {
    uid: session.uid,
    email,
    role,
    permissions: getDefaultNavaiPanelRolePermissions(role),
  } satisfies NavaiPanelActor;
}

export function isNavaiPanelSupportActor(actor: NavaiPanelActor) {
  return actor.role === "support" || actor.role === "moderator" || actor.role === "admin";
}

export function getNavaiPanelMessageAuthor(actor: NavaiPanelActor) {
  return isNavaiPanelSupportActor(actor) ? "Soporte NAVAI" : "Cliente";
}

export function getNavaiPanelMessageAuthorRole(actor: NavaiPanelActor) {
  return isNavaiPanelSupportActor(actor) ? "support" : "customer";
}

export function getNavaiPanelSupportRecipients() {
  return Array.from(
    new Set(
      [
        ...readEmailList(process.env.NAVAI_SUPPORT_USER),
        ...readEmailList(process.env.NAVAI_MOD_USER),
        ...readEmailList(process.env.NAVAI_ADMIN_USER),
      ].filter(Boolean)
    )
  );
}
