import { apiRequest, apiUpload } from "@/shared/api/base";

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access: string;
  refresh: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    patronymic?: string | null;
    age?: number | null;
    avatar?: string | null;
    bio?: string | null;
    contact_method?: string | null;
    role: string;
  };
};

export type RegisterPayload = {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirm: string;
};

export type RegisterResponse = LoginResponse;
export type MeResponse = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  patronymic?: string | null;
  age?: number | null;
  avatar?: string | null;
  bio?: string | null;
  contact_method?: string | null;
  role: string;
  telegram_connected?: boolean;
};

export function login(payload: LoginPayload) {
  return apiRequest<LoginResponse>("/auth/login/", {
    method: "POST",
    json: payload,
  });
}

export function register(payload: RegisterPayload) {
  return apiRequest<RegisterResponse>("/auth/register/", {
    method: "POST",
    json: {
      ...payload,
      role: "STUDENT",
    },
  });
}

export function fetchMe() {
  return apiRequest<MeResponse>("/auth/me/");
}

export function updateMe(form: FormData) {
  return apiUpload<MeResponse>("/auth/me/", form, "PATCH");
}

export type RefreshResponse = { access: string; refresh?: string };

export function refreshToken(refresh: string) {
  return apiRequest<RefreshResponse>("/auth/refresh/", {
    method: "POST",
    json: { refresh },
  });
}

export function logoutRequest(refresh: string) {
  return apiRequest<null>("/auth/logout/", {
    method: "POST",
    json: { refresh },
  });
}
