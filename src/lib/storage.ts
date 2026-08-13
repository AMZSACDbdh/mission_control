/**
 * **Moved.** This module used to own storage; it now owns nothing.
 *
 * Its two halves went to the places that can be swapped for a desktop build:
 *
 *   • the localStorage mechanics, quota detection and honest write-failure
 *     reporting → `platform/web/storage.ts`
 *   • the key registry, JSON helpers and byte formatting → `services/store.ts`
 *
 * Types are re-exported here so nothing breaks, but new code should import from
 * `@/platform` or `@/services/store`. Delete this file once there is version
 * control to undo it with.
 */

export type { StorageUsage, WriteResult } from "@/platform";
export { ASSUMED_QUOTA_BYTES } from "@/platform/web/storage";
export { formatBytes } from "@/services/store";
