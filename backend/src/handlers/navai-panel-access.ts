import type { Request, Response } from "express";

import { requireActiveFirebaseSession } from "../lib/firebase-id-token";
import {
  listPublicNavaiRouteAccess,
  listNavaiPanelManagedUsers,
  listNavaiPanelRolePermissions,
  listNavaiPanelRouteAccess,
  resolveStoredNavaiPanelActor,
  updateNavaiPanelManagedUserRole,
  updateNavaiPanelRolePermissionRecord,
  updateNavaiPanelRouteAccessRecord,
} from "../lib/navai-panel-access-sqlite";

function resolveErrorStatus(message: string) {
  if (message === "User not found." || message === "Route not found.") {
    return 404;
  }

  if (
    message === "Authentication required." ||
    message === "Invalid Firebase token." ||
    message === "Invalid Firebase token header." ||
    message === "Invalid Firebase token payload." ||
    message === "Invalid Firebase token signature." ||
    message === "Firebase token has an invalid audience." ||
    message === "Firebase token has an invalid subject." ||
    message === "Firebase token has expired." ||
    message === "Firebase token has an invalid issue time." ||
    message === "Firebase token has an invalid auth time." ||
    message === "Firebase signing certificate was not found."
  ) {
    return 401;
  }

  if (
    message === "Administrator permissions are required." ||
    message === "This account is inactive."
  ) {
    return 403;
  }

  if (
    message === "User id is required." ||
    message === "Admin permissions cannot be changed."
  ) {
    return 400;
  }

  return 500;
}

function readRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function getNavaiPanelActorHandler(request: Request, response: Response) {
  try {
    const session = await requireActiveFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    response.json({ ok: true, actor });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load panel access.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPanelManagedUsersHandler(
  request: Request,
  response: Response,
) {
  try {
    const session = await requireActiveFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const items = await listNavaiPanelManagedUsers(actor);
    response.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load panel users.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPanelRolePermissionsHandler(
  request: Request,
  response: Response,
) {
  try {
    const session = await requireActiveFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const items = await listNavaiPanelRolePermissions(actor);
    response.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load panel roles.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getPublicNavaiRouteAccessHandler(
  _request: Request,
  response: Response,
) {
  try {
    const items = await listPublicNavaiRouteAccess();
    response.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load route access.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPanelRouteAccessHandler(
  request: Request,
  response: Response,
) {
  try {
    const session = await requireActiveFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const items = await listNavaiPanelRouteAccess(actor);
    response.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load route access.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putNavaiPanelManagedUserRoleHandler(
  request: Request,
  response: Response,
) {
  try {
    const session = await requireActiveFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const item = await updateNavaiPanelManagedUserRole(
      actor,
      readRouteParam(request.params.uid),
      request.body ?? {},
    );
    response.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update panel user.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putNavaiPanelRolePermissionsHandler(
  request: Request,
  response: Response,
) {
  try {
    const session = await requireActiveFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const item = await updateNavaiPanelRolePermissionRecord(
      actor,
      readRouteParam(request.params.role),
      request.body ?? {},
    );
    response.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update panel role.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putNavaiPanelRouteAccessHandler(
  request: Request,
  response: Response,
) {
  try {
    const session = await requireActiveFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    const item = await updateNavaiPanelRouteAccessRecord(
      actor,
      readRouteParam(request.params.routeId),
      request.body ?? {},
    );
    response.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update route access.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}
