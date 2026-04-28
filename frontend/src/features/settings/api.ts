import { get, getBlob, post, put } from "@/lib/api-client";
import {
  DashboardRestoreResponseSchema,
  DashboardSettingsSchema,
  SettingsUpdateRequestSchema,
} from "@/features/settings/schemas";
import { applyCostDisplayFromSettings } from "@/features/settings/cost-display";

const SETTINGS_PATH = "/api/settings";

export async function getSettings() {
  const data = await get(SETTINGS_PATH, DashboardSettingsSchema);
  applyCostDisplayFromSettings(data);
  return data;
}

export async function updateSettings(payload: unknown) {
  const validated = SettingsUpdateRequestSchema.parse(payload);
  const data = await put(SETTINGS_PATH, DashboardSettingsSchema, {
    body: validated,
  });
  applyCostDisplayFromSettings(data);
  return data;
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
