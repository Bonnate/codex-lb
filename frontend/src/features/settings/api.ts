import { get, getBlob, post, put } from "@/lib/api-client";
import {
  DashboardRestoreResponseSchema,
  DashboardSettingsSchema,
  SettingsUpdateRequestSchema,
} from "@/features/settings/schemas";

const SETTINGS_PATH = "/api/settings";

export function getSettings() {
  return get(SETTINGS_PATH, DashboardSettingsSchema);
}

export function updateSettings(payload: unknown) {
  const validated = SettingsUpdateRequestSchema.parse(payload);
  return put(SETTINGS_PATH, DashboardSettingsSchema, {
    body: validated,
  });
}

export function downloadBackup() {
  return getBlob(`${SETTINGS_PATH}/backup`);
}

export function restoreBackup(file: File) {
  const formData = new FormData();
  formData.append("backup_file", file);
  return post(`${SETTINGS_PATH}/restore`, DashboardRestoreResponseSchema, {
    body: formData,
  });
}
