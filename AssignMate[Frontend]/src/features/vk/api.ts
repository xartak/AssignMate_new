import { apiRequest } from "@/shared/api/base";

export type VKCodeResponse = {
  code: string;
  expires_at: string;
  group_link: string;
  note?: string;
};

export function generateVKCode() {
  return apiRequest<VKCodeResponse>("/vk/generate-code/", {
    method: "POST",
  });
}
