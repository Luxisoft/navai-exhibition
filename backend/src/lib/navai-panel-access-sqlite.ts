import fs from "node:fs/promises";
import path from "node:path";

import initSqlJs from "sql.js";

import {
  getDefaultNavaiPanelRolePermissions,
  resolveNavaiPanelActor,
  type NavaiPanelActor,
  type NavaiPanelActorPermissions,
  type NavaiPanelActorRole,
} from "./navai-panel-access";
import { resolveProjectRoot } from "./project-root";

type SqlJsDatabase = any;

type NavaiPanelAccessSqliteState = {
  db: SqlJsDatabase;
  filePath: string;
};

type StoredUserAccessRow = {
  uid: string;
  email: string;
  role: NavaiPanelActorRole;
  accountStatus: "active" | "deletion_pending" | "inactive";
  deletionRequestedAt: string;
  scheduledDeletionAt: string;
  deactivatedAt: string;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
};

export type NavaiPanelManagedUserRecord = StoredUserAccessRow;

export type NavaiPanelRolePermissionRecord = {
  role: NavaiPanelActorRole;
  permissions: NavaiPanelActorPermissions;
  updatedAt: string;
  isEditable: boolean;
};

export type NavaiPanelRouteAccessRecord = {
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

type NavaiPanelRolePermissionInput = {
  canEditTableData?: unknown;
  canDeleteTableData?: unknown;
  canManageUsers?: unknown;
};

type NavaiPanelRouteAccessInput = {
  allowVisitor?: unknown;
  allowUser?: unknown;
  allowSupport?: unknown;
  allowModerator?: unknown;
  allowAdmin?: unknown;
};

type NavaiRouteAccessDefinition = {
  routeId: string;
  pathnamePattern: string;
  defaults: {
    allowVisitor: boolean;
    allowUser: boolean;
    allowSupport: boolean;
    allowModerator: boolean;
    allowAdmin: boolean;
  };
  editable: {
    visitor: boolean;
    user: boolean;
    support: boolean;
    moderator: boolean;
    admin: boolean;
  };
};

const NAVAI_ROUTE_ACCESS_DEFINITIONS: readonly NavaiRouteAccessDefinition[] = [
  {
    routeId: "home",
    pathnamePattern: "/",
    defaults: {
      allowVisitor: true,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: true,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "documentation",
    pathnamePattern: "/documentation/*",
    defaults: {
      allowVisitor: true,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: true,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "request-implementation",
    pathnamePattern: "/request-implementation",
    defaults: {
      allowVisitor: true,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: true,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "evaluations-directory",
    pathnamePattern: "/evaluations",
    defaults: {
      allowVisitor: true,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: true,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "evaluation-public",
    pathnamePattern: "/evaluation/:slug",
    defaults: {
      allowVisitor: true,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: true,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "surveys-directory",
    pathnamePattern: "/surveys",
    defaults: {
      allowVisitor: true,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: true,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "survey-public",
    pathnamePattern: "/survey/:slug",
    defaults: {
      allowVisitor: true,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: true,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "example",
    pathnamePattern: "/example",
    defaults: {
      allowVisitor: true,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: true,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "panel-home",
    pathnamePattern: "/panel",
    defaults: {
      allowVisitor: false,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: false,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "panel-manage",
    pathnamePattern: "/panel/manage",
    defaults: {
      allowVisitor: false,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: false,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "panel-evaluations",
    pathnamePattern: "/panel/evaluations",
    defaults: {
      allowVisitor: false,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: false,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "panel-surveys",
    pathnamePattern: "/panel/surveys",
    defaults: {
      allowVisitor: false,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: false,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "panel-support",
    pathnamePattern: "/panel/support",
    defaults: {
      allowVisitor: false,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: false,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "panel-profile",
    pathnamePattern: "/panel/profile",
    defaults: {
      allowVisitor: false,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: false,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "panel-payments",
    pathnamePattern: "/panel/payments",
    defaults: {
      allowVisitor: false,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: false,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "panel-points",
    pathnamePattern: "/panel/points",
    defaults: {
      allowVisitor: false,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: false,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "panel-referrals",
    pathnamePattern: "/panel/referrals",
    defaults: {
      allowVisitor: false,
      allowUser: true,
      allowSupport: true,
      allowModerator: true,
      allowAdmin: true,
    },
    editable: {
      visitor: false,
      user: true,
      support: true,
      moderator: true,
      admin: false,
    },
  },
  {
    routeId: "panel-withdrawals",
    pathnamePattern: "/panel/withdrawals",
    defaults: {
      allowVisitor: false,
      allowUser: false,
      allowSupport: false,
      allowModerator: false,
      allowAdmin: true,
    },
    editable: {
      visitor: false,
      user: false,
      support: false,
      moderator: false,
      admin: false,
    },
  },
  {
    routeId: "panel-entry-packages",
    pathnamePattern: "/panel/entry-packages",
    defaults: {
      allowVisitor: false,
      allowUser: false,
      allowSupport: false,
      allowModerator: false,
      allowAdmin: true,
    },
    editable: {
      visitor: false,
      user: false,
      support: false,
      moderator: false,
      admin: false,
    },
  },
  {
    routeId: "panel-users",
    pathnamePattern: "/panel/users",
    defaults: {
      allowVisitor: false,
      allowUser: false,
      allowSupport: false,
      allowModerator: false,
      allowAdmin: true,
    },
    editable: {
      visitor: false,
      user: false,
      support: false,
      moderator: false,
      admin: false,
    },
  },
] as const;

let sqliteStatePromise: Promise<NavaiPanelAccessSqliteState> | null = null;
let sqliteMutationQueue = Promise.resolve();

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function normalizeRole(value: unknown): NavaiPanelActorRole {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === "support") {
    return "support";
  }
  if (normalized === "moderator") {
    return "moderator";
  }
  if (normalized === "admin") {
    return "admin";
  }
  return "user";
}

function normalizeAccountStatus(
  value: unknown,
): StoredUserAccessRow["accountStatus"] {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === "deletion_pending") {
    return "deletion_pending";
  }
  if (normalized === "inactive") {
    return "inactive";
  }
  return "active";
}

function readStatementRows(
  db: SqlJsDatabase,
  sql: string,
  params: unknown[] = [],
) {
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

async function resolveAccessSqliteFilePath() {
  const projectRoot = resolveProjectRoot();
  const directory = path.join(projectRoot, "backend", ".data");
  await fs.mkdir(directory, { recursive: true });
  return path.join(directory, "navai-panel-access.sqlite");
}

function mapStoredUserAccessRow(
  row: Record<string, unknown>,
): StoredUserAccessRow {
  return {
    uid: String(row.uid ?? ""),
    email: String(row.email ?? ""),
    role: normalizeRole(row.role),
    accountStatus: normalizeAccountStatus(row.account_status),
    deletionRequestedAt: String(row.deletion_requested_at ?? ""),
    scheduledDeletionAt: String(row.scheduled_deletion_at ?? ""),
    deactivatedAt: String(row.deactivated_at ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    lastSeenAt: String(row.last_seen_at ?? ""),
  };
}

function mapRolePermissionRow(
  row: Record<string, unknown> | null,
  role: NavaiPanelActorRole,
): NavaiPanelRolePermissionRecord {
  const defaults = getDefaultNavaiPanelRolePermissions(role);
  return {
    role,
    permissions: {
      canEditTableData:
        row === null
          ? defaults.canEditTableData
          : normalizeBoolean(row.can_edit_table_data),
      canDeleteTableData:
        row === null
          ? defaults.canDeleteTableData
          : normalizeBoolean(row.can_delete_table_data),
      canManageUsers:
        row === null
          ? defaults.canManageUsers
          : normalizeBoolean(row.can_manage_users),
    },
    updatedAt: row === null ? "" : String(row.updated_at ?? ""),
    isEditable: role !== "admin",
  };
}

function findRouteAccessDefinition(routeId: string) {
  return (
    NAVAI_ROUTE_ACCESS_DEFINITIONS.find((item) => item.routeId === routeId) ??
    null
  );
}

function mapRouteAccessRow(
  row: Record<string, unknown> | null,
  definition: NavaiRouteAccessDefinition,
): NavaiPanelRouteAccessRecord {
  return {
    routeId: definition.routeId,
    pathnamePattern: definition.pathnamePattern,
    allowVisitor:
      row === null
        ? definition.defaults.allowVisitor
        : normalizeBoolean(row.allow_visitor),
    allowUser:
      row === null
        ? definition.defaults.allowUser
        : normalizeBoolean(row.allow_user),
    allowSupport:
      row === null
        ? definition.defaults.allowSupport
        : normalizeBoolean(row.allow_support),
    allowModerator:
      row === null
        ? definition.defaults.allowModerator
        : normalizeBoolean(row.allow_moderator),
    allowAdmin:
      row === null
        ? definition.defaults.allowAdmin
        : normalizeBoolean(row.allow_admin),
    editableVisitor: definition.editable.visitor,
    editableUser: definition.editable.user,
    editableSupport: definition.editable.support,
    editableModerator: definition.editable.moderator,
    editableAdmin: definition.editable.admin,
    updatedAt: row === null ? "" : String(row.updated_at ?? ""),
  };
}

function ensureUserAccessAccountColumns(db: SqlJsDatabase) {
  const userAccessTableInfo = readStatementRows(
    db,
    "PRAGMA table_info(navai_panel_user_access)",
  );
  const userAccessColumns = new Set(
    userAccessTableInfo.map((column) => String(column.name ?? "")),
  );
  if (!userAccessColumns.has("account_status")) {
    db.run(
      "ALTER TABLE navai_panel_user_access ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'",
    );
  }
  if (!userAccessColumns.has("deletion_requested_at")) {
    db.run(
      "ALTER TABLE navai_panel_user_access ADD COLUMN deletion_requested_at TEXT NOT NULL DEFAULT ''",
    );
  }
  if (!userAccessColumns.has("scheduled_deletion_at")) {
    db.run(
      "ALTER TABLE navai_panel_user_access ADD COLUMN scheduled_deletion_at TEXT NOT NULL DEFAULT ''",
    );
  }
  if (!userAccessColumns.has("deactivated_at")) {
    db.run(
      "ALTER TABLE navai_panel_user_access ADD COLUMN deactivated_at TEXT NOT NULL DEFAULT ''",
    );
  }
}

function readRouteAccess(db: SqlJsDatabase, routeId: string) {
  const definition = findRouteAccessDefinition(routeId);
  if (!definition) {
    return null;
  }

  const row = readFirstRow(
    db,
    `
      SELECT
        route_id,
        allow_visitor,
        allow_user,
        allow_support,
        allow_moderator,
        allow_admin,
        updated_at
      FROM navai_panel_route_access
      WHERE route_id = ?
      LIMIT 1
    `,
    [routeId],
  );

  return mapRouteAccessRow(row, definition);
}

function readStoredUserAccessByUid(db: SqlJsDatabase, uid: string) {
  ensureUserAccessAccountColumns(db);
  const row = readFirstRow(
    db,
    `
      SELECT uid, email, role, created_at, updated_at, last_seen_at
      ,
      account_status,
      deletion_requested_at,
      scheduled_deletion_at,
      deactivated_at
      FROM navai_panel_user_access
      WHERE uid = ?
      LIMIT 1
    `,
    [uid],
  );

  return row ? mapStoredUserAccessRow(row) : null;
}

function readRolePermission(db: SqlJsDatabase, role: NavaiPanelActorRole) {
  const row = readFirstRow(
    db,
    `
      SELECT role, can_edit_table_data, can_delete_table_data, can_manage_users, updated_at
      FROM navai_panel_role_permissions
      WHERE role = ?
      LIMIT 1
    `,
    [role],
  );

  return mapRolePermissionRow(row, role);
}

function upsertRolePermission(
  db: SqlJsDatabase,
  role: NavaiPanelActorRole,
  permissions: NavaiPanelActorPermissions,
  updatedAt: string,
) {
  db.run(
    `
      INSERT INTO navai_panel_role_permissions (
        role,
        can_edit_table_data,
        can_delete_table_data,
        can_manage_users,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(role) DO UPDATE SET
        can_edit_table_data = excluded.can_edit_table_data,
        can_delete_table_data = excluded.can_delete_table_data,
        can_manage_users = excluded.can_manage_users,
        updated_at = excluded.updated_at
    `,
    [
      role,
      permissions.canEditTableData ? 1 : 0,
      permissions.canDeleteTableData ? 1 : 0,
      permissions.canManageUsers ? 1 : 0,
      updatedAt,
    ],
  );
}

function upsertRouteAccess(
  db: SqlJsDatabase,
  routeId: string,
  access: Pick<
    NavaiPanelRouteAccessRecord,
    | "allowVisitor"
    | "allowUser"
    | "allowSupport"
    | "allowModerator"
    | "allowAdmin"
  >,
  updatedAt: string,
) {
  db.run(
    `
      INSERT INTO navai_panel_route_access (
        route_id,
        allow_visitor,
        allow_user,
        allow_support,
        allow_moderator,
        allow_admin,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(route_id) DO UPDATE SET
        allow_visitor = excluded.allow_visitor,
        allow_user = excluded.allow_user,
        allow_support = excluded.allow_support,
        allow_moderator = excluded.allow_moderator,
        allow_admin = excluded.allow_admin,
        updated_at = excluded.updated_at
    `,
    [
      routeId,
      access.allowVisitor ? 1 : 0,
      access.allowUser ? 1 : 0,
      access.allowSupport ? 1 : 0,
      access.allowModerator ? 1 : 0,
      access.allowAdmin ? 1 : 0,
      updatedAt,
    ],
  );
}

function upsertKnownUserAccess(
  db: SqlJsDatabase,
  {
    uid,
    email,
    role,
    seenAt,
    accountStatus = "active",
    deletionRequestedAt = "",
    scheduledDeletionAt = "",
    deactivatedAt = "",
  }: {
    uid: string;
    email: string;
    role: NavaiPanelActorRole;
    seenAt: string;
    accountStatus?: StoredUserAccessRow["accountStatus"];
    deletionRequestedAt?: string;
    scheduledDeletionAt?: string;
    deactivatedAt?: string;
  },
) {
  const existing = readStoredUserAccessByUid(db, uid);
  const createdAt = existing?.createdAt || seenAt;
  db.run(
    `
      INSERT INTO navai_panel_user_access (
        uid,
        email,
        role,
        account_status,
        deletion_requested_at,
        scheduled_deletion_at,
        deactivated_at,
        created_at,
        updated_at,
        last_seen_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        email = excluded.email,
        role = excluded.role,
        account_status = excluded.account_status,
        deletion_requested_at = excluded.deletion_requested_at,
        scheduled_deletion_at = excluded.scheduled_deletion_at,
        deactivated_at = excluded.deactivated_at,
        updated_at = excluded.updated_at,
        last_seen_at = excluded.last_seen_at
    `,
    [
      uid,
      email,
      role,
      accountStatus,
      deletionRequestedAt,
      scheduledDeletionAt,
      deactivatedAt,
      createdAt,
      seenAt,
      seenAt,
    ],
  );
}

async function createAccessSqliteState(): Promise<NavaiPanelAccessSqliteState> {
  const projectRoot = resolveProjectRoot();
  const filePath = await resolveAccessSqliteFilePath();
  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      path.join(projectRoot, "node_modules", "sql.js", "dist", file),
  });

  let db: SqlJsDatabase;
  try {
    const fileBuffer = await fs.readFile(filePath);
    db = new SQL.Database(new Uint8Array(fileBuffer));
  } catch {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS navai_panel_user_access (
      uid TEXT PRIMARY KEY,
      email TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user',
      account_status TEXT NOT NULL DEFAULT 'active',
      deletion_requested_at TEXT NOT NULL DEFAULT '',
      scheduled_deletion_at TEXT NOT NULL DEFAULT '',
      deactivated_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS navai_panel_role_permissions (
      role TEXT PRIMARY KEY,
      can_edit_table_data INTEGER NOT NULL DEFAULT 0,
      can_delete_table_data INTEGER NOT NULL DEFAULT 0,
      can_manage_users INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS navai_panel_route_access (
      route_id TEXT PRIMARY KEY,
      allow_visitor INTEGER NOT NULL DEFAULT 1,
      allow_user INTEGER NOT NULL DEFAULT 1,
      allow_support INTEGER NOT NULL DEFAULT 1,
      allow_moderator INTEGER NOT NULL DEFAULT 1,
      allow_admin INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
  `);

  ensureUserAccessAccountColumns(db);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_navai_panel_user_access_role
      ON navai_panel_user_access(role, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_navai_panel_user_access_account_status
      ON navai_panel_user_access(account_status, scheduled_deletion_at ASC, updated_at DESC);
  `);

  const seededAt = new Date().toISOString();
  upsertRolePermission(
    db,
    "user",
    getDefaultNavaiPanelRolePermissions("user"),
    seededAt,
  );
  upsertRolePermission(
    db,
    "support",
    getDefaultNavaiPanelRolePermissions("support"),
    seededAt,
  );
  upsertRolePermission(
    db,
    "moderator",
    getDefaultNavaiPanelRolePermissions("moderator"),
    seededAt,
  );
  upsertRolePermission(
    db,
    "admin",
    getDefaultNavaiPanelRolePermissions("admin"),
    seededAt,
  );
  for (const definition of NAVAI_ROUTE_ACCESS_DEFINITIONS) {
    const existing = readRouteAccess(db, definition.routeId);
    if (existing) {
      continue;
    }

    upsertRouteAccess(
      db,
      definition.routeId,
      {
        allowVisitor: definition.defaults.allowVisitor,
        allowUser: definition.defaults.allowUser,
        allowSupport: definition.defaults.allowSupport,
        allowModerator: definition.defaults.allowModerator,
        allowAdmin: definition.defaults.allowAdmin,
      },
      seededAt,
    );
  }

  return { db, filePath };
}

async function getAccessSqliteState() {
  if (!sqliteStatePromise) {
    sqliteStatePromise = createAccessSqliteState().catch((error) => {
      sqliteStatePromise = null;
      throw error;
    });
  }

  return sqliteStatePromise;
}

async function persistAccessSqlite(state: NavaiPanelAccessSqliteState) {
  await fs.mkdir(path.dirname(state.filePath), { recursive: true });
  const exported = state.db.export();
  await fs.writeFile(state.filePath, Buffer.from(exported));
}

async function runSerializedMutation<T>(
  mutation: (db: SqlJsDatabase) => T | Promise<T>,
) {
  const state = await getAccessSqliteState();
  let result!: T;

  const nextMutation = sqliteMutationQueue.then(async () => {
    result = await mutation(state.db);
    await persistAccessSqlite(state);
  });

  sqliteMutationQueue = nextMutation.catch(() => undefined);
  await nextMutation;
  return result;
}

function normalizeRolePermissionInput(
  role: NavaiPanelActorRole,
  input: NavaiPanelRolePermissionInput,
): NavaiPanelActorPermissions {
  if (role === "admin") {
    return getDefaultNavaiPanelRolePermissions("admin");
  }

  return {
    canEditTableData: normalizeBoolean(input.canEditTableData),
    canDeleteTableData: normalizeBoolean(input.canDeleteTableData),
    canManageUsers: normalizeBoolean(input.canManageUsers),
  };
}

function assertAdminActor(actor: NavaiPanelActor) {
  if (!actor.permissions.canManageUsers || actor.role !== "admin") {
    throw new Error("Administrator permissions are required.");
  }
}

export async function resolveStoredNavaiPanelActor(session: {
  uid: string;
  email?: string;
}) {
  const envActor = resolveNavaiPanelActor(session);
  const normalizedUid = normalizeString(session.uid);
  if (!normalizedUid) {
    throw new Error("Authentication required.");
  }

  const state = await getAccessSqliteState();
  const storedUser = readStoredUserAccessByUid(state.db, normalizedUid);
  if (storedUser?.accountStatus === "inactive") {
    throw new Error("This account is inactive.");
  }
  const resolvedRole =
    envActor.role === "admin" ? "admin" : (storedUser?.role ?? envActor.role);
  const permissionRecord = readRolePermission(state.db, resolvedRole);
  const actor: NavaiPanelActor = {
    uid: normalizedUid,
    email: normalizeString(session.email),
    role: resolvedRole,
    permissions: permissionRecord.permissions,
  };

  const seenAt = new Date().toISOString();
  await runSerializedMutation((db) => {
    upsertKnownUserAccess(db, {
      uid: actor.uid,
      email: actor.email,
      role: actor.role,
      seenAt,
      accountStatus: storedUser?.accountStatus ?? "active",
      deletionRequestedAt: storedUser?.deletionRequestedAt ?? "",
      scheduledDeletionAt: storedUser?.scheduledDeletionAt ?? "",
      deactivatedAt: storedUser?.deactivatedAt ?? "",
    });
  });

  return actor;
}

export async function assertNavaiPanelAccessAccountIsActive(uid: string) {
  const normalizedUid = normalizeString(uid);
  if (!normalizedUid) {
    throw new Error("Authentication required.");
  }

  const state = await getAccessSqliteState();
  const storedUser = readStoredUserAccessByUid(state.db, normalizedUid);
  if (storedUser?.accountStatus === "inactive") {
    throw new Error("This account is inactive.");
  }
}

export async function listNavaiPanelManagedUsers(actor: NavaiPanelActor) {
  assertAdminActor(actor);
  const state = await getAccessSqliteState();
  const rows = readStatementRows(
    state.db,
    `
      SELECT
        uid,
        email,
        role,
        account_status,
        deletion_requested_at,
        scheduled_deletion_at,
        deactivated_at,
        created_at,
        updated_at,
        last_seen_at
      FROM navai_panel_user_access
      ORDER BY
        CASE role
          WHEN 'admin' THEN 0
          WHEN 'moderator' THEN 1
          WHEN 'support' THEN 2
          ELSE 3
        END,
        COALESCE(last_seen_at, '') DESC,
        updated_at DESC
    `,
  );

  return rows.map((row) => mapStoredUserAccessRow(row));
}

export async function listNavaiPanelRolePermissions(actor: NavaiPanelActor) {
  assertAdminActor(actor);
  const state = await getAccessSqliteState();
  const roles: NavaiPanelActorRole[] = [
    "admin",
    "moderator",
    "support",
    "user",
  ];
  return roles.map((role) => readRolePermission(state.db, role));
}

export async function listNavaiPanelRouteAccess(actor: NavaiPanelActor) {
  assertAdminActor(actor);
  const state = await getAccessSqliteState();
  return NAVAI_ROUTE_ACCESS_DEFINITIONS.map(
    (definition) =>
      readRouteAccess(state.db, definition.routeId) ??
      mapRouteAccessRow(null, definition),
  );
}

export async function listPublicNavaiRouteAccess() {
  const state = await getAccessSqliteState();
  return NAVAI_ROUTE_ACCESS_DEFINITIONS.map(
    (definition) =>
      readRouteAccess(state.db, definition.routeId) ??
      mapRouteAccessRow(null, definition),
  );
}

export async function updateNavaiPanelManagedUserRole(
  actor: NavaiPanelActor,
  uid: string,
  input: { role?: unknown },
) {
  assertAdminActor(actor);
  const normalizedUid = normalizeString(uid);
  if (!normalizedUid) {
    throw new Error("User id is required.");
  }

  const nextRole = normalizeRole(input.role);
  const updatedAt = new Date().toISOString();

  return runSerializedMutation((db) => {
    const existing = readStoredUserAccessByUid(db, normalizedUid);
    if (!existing) {
      throw new Error("User not found.");
    }

    const persistedRole =
      existing.email === actor.email &&
      actor.role === "admin" &&
      nextRole !== "admin"
        ? "admin"
        : nextRole;

    upsertKnownUserAccess(db, {
      uid: existing.uid,
      email: existing.email,
      role: persistedRole,
      seenAt: existing.lastSeenAt || updatedAt,
      accountStatus: existing.accountStatus,
      deletionRequestedAt: existing.deletionRequestedAt,
      scheduledDeletionAt: existing.scheduledDeletionAt,
      deactivatedAt: existing.deactivatedAt,
    });

    const updated = readStoredUserAccessByUid(db, normalizedUid);
    if (!updated) {
      throw new Error("User not found.");
    }

    return updated;
  });
}

export async function updateNavaiPanelRolePermissionRecord(
  actor: NavaiPanelActor,
  role: string,
  input: NavaiPanelRolePermissionInput,
) {
  assertAdminActor(actor);
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "admin") {
    throw new Error("Admin permissions cannot be changed.");
  }

  const updatedAt = new Date().toISOString();
  const permissions = normalizeRolePermissionInput(normalizedRole, input);

  return runSerializedMutation((db) => {
    upsertRolePermission(db, normalizedRole, permissions, updatedAt);
    return readRolePermission(db, normalizedRole);
  });
}

export async function updateNavaiPanelRouteAccessRecord(
  actor: NavaiPanelActor,
  routeId: string,
  input: NavaiPanelRouteAccessInput,
) {
  assertAdminActor(actor);
  const definition = findRouteAccessDefinition(normalizeString(routeId));
  if (!definition) {
    throw new Error("Route not found.");
  }

  const updatedAt = new Date().toISOString();

  return runSerializedMutation((db) => {
    const existing =
      readRouteAccess(db, definition.routeId) ??
      mapRouteAccessRow(null, definition);
    const nextItem: Pick<
      NavaiPanelRouteAccessRecord,
      | "allowVisitor"
      | "allowUser"
      | "allowSupport"
      | "allowModerator"
      | "allowAdmin"
    > = {
      allowVisitor: definition.editable.visitor
        ? normalizeBoolean(input.allowVisitor)
        : existing.allowVisitor,
      allowUser: definition.editable.user
        ? normalizeBoolean(input.allowUser)
        : existing.allowUser,
      allowSupport: definition.editable.support
        ? normalizeBoolean(input.allowSupport)
        : existing.allowSupport,
      allowModerator: definition.editable.moderator
        ? normalizeBoolean(input.allowModerator)
        : existing.allowModerator,
      allowAdmin: definition.editable.admin
        ? normalizeBoolean(input.allowAdmin)
        : existing.allowAdmin,
    };

    upsertRouteAccess(db, definition.routeId, nextItem, updatedAt);
    const updated = readRouteAccess(db, definition.routeId);
    if (!updated) {
      throw new Error("Route not found.");
    }

    return updated;
  });
}

export async function requestNavaiPanelAccessAccountDeletion(
  uid: string,
  email: string,
) {
  const normalizedUid = normalizeString(uid);
  const normalizedEmail = normalizeString(email);
  if (!normalizedUid) {
    throw new Error("Authentication required.");
  }

  return runSerializedMutation((db) => {
    const existing = readStoredUserAccessByUid(db, normalizedUid);
    const now = new Date();
    const nowIso = now.toISOString();
    const currentStatus = existing?.accountStatus ?? "active";
    const deletionRequestedAt =
      currentStatus === "deletion_pending" && existing?.deletionRequestedAt
        ? existing.deletionRequestedAt
        : nowIso;
    const scheduledDeletionAt =
      currentStatus === "deletion_pending" && existing?.scheduledDeletionAt
        ? existing.scheduledDeletionAt
        : new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const nextStatus =
      currentStatus === "inactive" ? "inactive" : "deletion_pending";

    upsertKnownUserAccess(db, {
      uid: normalizedUid,
      email: normalizedEmail || existing?.email || "",
      role: existing?.role ?? "user",
      seenAt: existing?.lastSeenAt || nowIso,
      accountStatus: nextStatus,
      deletionRequestedAt,
      scheduledDeletionAt,
      deactivatedAt: existing?.deactivatedAt ?? "",
    });

    const updated = readStoredUserAccessByUid(db, normalizedUid);
    if (!updated) {
      throw new Error("Authentication required.");
    }

    return updated;
  });
}

export async function deactivateExpiredNavaiPanelAccessAccounts(
  now = new Date(),
) {
  const nowIso = now.toISOString();
  return runSerializedMutation((db) => {
    db.run(
      `
        UPDATE navai_panel_user_access
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
      [nowIso, nowIso, nowIso],
    );

    const row = readFirstRow(db, "SELECT changes() AS count");
    return Number(row?.count ?? 0);
  });
}
