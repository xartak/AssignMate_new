import { apiRequest } from "@/shared/api/base";

export type TelegramLinkResponse = {
  link: string;
  token: string;
  expires_at: string;
  note?: string;
};

export function generateTelegramLink() {
  return apiRequest<TelegramLinkResponse>("/telegram/generate-link/", {
    method: "POST",
  });
}
