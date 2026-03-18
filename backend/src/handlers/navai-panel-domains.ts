import type { Request, Response } from "express";

import {
  createNavaiPanelDomain,
  deleteNavaiPanelDomain,
  getNavaiPanelDomainById,
  listNavaiPanelDomains,
  updateNavaiPanelDomain,
} from "../lib/navai-panel-sqlite";
import { requireActiveFirebaseSession } from "../lib/firebase-id-token";
import { resolveStoredNavaiPanelActor } from "../lib/navai-panel-access-sqlite";
import { deleteNavaiWorkspaceItemsByDomain } from "../lib/navai-panel-workspace-sqlite";

function resolveErrorStatus(message: string) {
  if (message === "Domain not found.") {
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
    message === "Domain is required." ||
    message === "Domain id is required." ||
    message === "A domain with that host already exists."
  ) {
    return 400;
  }

  if (
    message === "Editing table data is not allowed for this role." ||
    message === "Deleting table data is not allowed for this role." ||
    message === "This account is inactive."
  ) {
    return 403;
  }

  return 500;
}

function readRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function assertCanEditTableData(actor: { permissions: { canEditTableData: boolean } }) {
  if (!actor.permissions.canEditTableData) {
    throw new Error("Editing table data is not allowed for this role.");
  }
}

function assertCanDeleteTableData(actor: { permissions: { canDeleteTableData: boolean } }) {
  if (!actor.permissions.canDeleteTableData) {
    throw new Error("Deleting table data is not allowed for this role.");
  }
}

export async function getNavaiPanelDomains(request: Request, response: Response) {
  try {
    const session = await requireActiveFirebaseSession(request);
    const items = await listNavaiPanelDomains(session.uid);
    response.json({ ok: true, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load domains.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function getNavaiPanelDomain(request: Request, response: Response) {
  try {
    const session = await requireActiveFirebaseSession(request);
    const item = await getNavaiPanelDomainById(session.uid, readRouteParam(request.params.id));
    if (!item) {
      response.status(404).json({ ok: false, error: "Domain not found." });
      return;
    }

    response.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load domain.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function postNavaiPanelDomain(request: Request, response: Response) {
  try {
    const session = await requireActiveFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanEditTableData(actor);
    const item = await createNavaiPanelDomain(session.uid, request.body ?? {});
    response.status(201).json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create domain.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function putNavaiPanelDomain(request: Request, response: Response) {
  try {
    const session = await requireActiveFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanEditTableData(actor);
    const item = await updateNavaiPanelDomain(
      session.uid,
      readRouteParam(request.params.id),
      request.body ?? {}
    );
    response.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update domain.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}

export async function deleteNavaiPanelDomainHandler(request: Request, response: Response) {
  try {
    const session = await requireActiveFirebaseSession(request);
    const actor = await resolveStoredNavaiPanelActor(session);
    assertCanDeleteTableData(actor);
    const domainId = readRouteParam(request.params.id);
    await deleteNavaiWorkspaceItemsByDomain(session.uid, domainId);
    const result = await deleteNavaiPanelDomain(session.uid, domainId);
    response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete domain.";
    response.status(resolveErrorStatus(message)).json({ ok: false, error: message });
  }
}
