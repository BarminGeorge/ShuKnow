/**
 * Actions API service
 * Handles AI action history and rollback
 */

import { apiRequest } from "./client";

// ── Types ─────────────────────────────────────

export interface ActionDto {
  id: string;
  summary: string;
  itemCount: number;
  canRollback: boolean;
}

export interface ActionItemDto {
  type: "FileCreated" | "FileMoved" | "FolderCreated";
  fileId?: string | null;
  folderId?: string | null;
  fileName?: string | null;
  folderName?: string | null;
  targetFolderName?: string | null;
}

export interface ActionDetailDto {
  id: string;
  summary: string;
  items: ActionItemDto[];
}

export interface RollbackItemDto {
  type: "FileDeleted" | "FileMovedBack" | "FolderDeleted";
  description: string;
}

export interface RollbackResultDto {
  actionId: string;
  restoredItems: RollbackItemDto[];
  fullyReverted: boolean;
}

export interface PagedActionResult {
  items: ActionDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

// ── API Functions ─────────────────────────────

/**
 * List AI-generated actions (paginated)
 */
export async function listActions(
  page: number = 1,
  pageSize: number = 20
): Promise<PagedActionResult> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());
  return apiRequest<PagedActionResult>(`/api/actions?${params}`);
}

/**
 * Get detailed view of an action
 */
export async function getAction(actionId: string): Promise<ActionDetailDto> {
  return apiRequest<ActionDetailDto>(`/api/actions/${actionId}`);
}

/**
 * Rollback a specific action by ID
 */
export async function rollbackAction(actionId: string): Promise<RollbackResultDto> {
  return apiRequest<RollbackResultDto>(`/api/actions/${actionId}/rollback`, {
    method: "POST",
  });
}

/**
 * Rollback the most recent eligible action
 */
export async function rollbackLastAction(): Promise<RollbackResultDto> {
  return apiRequest<RollbackResultDto>("/api/actions/rollback-last", {
    method: "POST",
  });
}
