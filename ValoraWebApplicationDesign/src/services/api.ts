import type { UserProfile, Conversation, Message, Notification } from "../types";
import {
  currentUser as mockUser,
  profiles as mockProfiles,
  matches as mockMatches,
  conversations as mockConversations,
  notifications as mockNotifications,
} from "../data/mock";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8080/api/v1";
const WS_BASE = (import.meta.env.VITE_WS_URL as string) || "ws://localhost:8080/ws/chat";
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
    version?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
    role: string;
    accountStatus: string;
    isVerified: boolean;
  };
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

// ── Storage Helpers ──────────────────────────────────────────────────────────
export const tokenStorage = {
  get: (): string | null => {
    try {
      return localStorage.getItem("valora_token");
    } catch {
      return null;
    }
  },
  set: (token: string): void => {
    try {
      localStorage.setItem("valora_token", token);
    } catch {}
  },
  clear: (): void => {
    try {
      localStorage.removeItem("valora_token");
      localStorage.removeItem("valora_refresh_token");
    } catch {}
  },
  getRefreshToken: (): string | null => {
    try {
      return localStorage.getItem("valora_refresh_token");
    } catch {
      return null;
    }
  },
  setRefreshToken: (token: string): void => {
    try {
      localStorage.setItem("valora_refresh_token", token);
    } catch {}
  },
};

// ── Core Fetch Wrapper ───────────────────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
  fallbackData?: T
): Promise<T> {
  const token = tokenStorage.get();
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      if (res.status === 401 && tokenStorage.getRefreshToken()) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          headers.set("Authorization", `Bearer ${tokenStorage.get()}`);
          const retryRes = await fetch(url, { ...options, headers });
          if (retryRes.ok) {
            const retryJson: ApiResponse<T> = await retryRes.json();
            return retryJson.data;
          }
        }
      }
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.error?.message || `HTTP ${res.status} ${res.statusText}`;
      console.warn(`[Valora API Error] ${path}: ${errMsg}`);
      if (USE_MOCKS && fallbackData !== undefined) return fallbackData;
      throw new Error(errMsg);
    }

    const json: ApiResponse<T> = await res.json();
    return json.data;
  } catch (err) {
    console.warn(`[Valora API Network] ${path} failed:`, (err as Error).message);
    if (USE_MOCKS && fallbackData !== undefined) return fallbackData;
    throw err;
  }
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (res.ok) {
      const json = await res.json();
      tokenStorage.set(json.data.accessToken);
      if (json.data.refreshToken) tokenStorage.setRefreshToken(json.data.refreshToken);
      return true;
    }
  } catch {}
  tokenStorage.clear();
  return false;
}

// ── Auth Service ─────────────────────────────────────────────────────────────
export const authApi = {
  async signup(data: { email: string; password?: string; name: string; termsAccepted: boolean }): Promise<AuthSession> {
    const res = await request<AuthSession>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
    tokenStorage.set(res.accessToken);
    if (res.refreshToken) tokenStorage.setRefreshToken(res.refreshToken);
    return res;
  },

  async login(email: string, password?: string): Promise<AuthSession> {
    const res = await request<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    tokenStorage.set(res.accessToken);
    if (res.refreshToken) tokenStorage.setRefreshToken(res.refreshToken);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch {}
    tokenStorage.clear();
  },

  async resetPassword(email: string): Promise<{ message: string }> {
    return request<{ message: string }>(
      "/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
      { message: "If that email is registered, instructions will be sent." }
    );
  },

  async verifyEmail(token: string): Promise<{ verified: boolean }> {
    return request<{ verified: boolean }>(
      "/auth/verify-email",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      },
      { verified: true }
    );
  },
};

// ── Profiles Service ─────────────────────────────────────────────────────────
export const profilesApi = {
  async getMe(): Promise<UserProfile> {
    return request<UserProfile>("/profiles/me", { method: "GET" }, mockUser);
  },

  async updateMe(data: Partial<UserProfile>): Promise<UserProfile> {
    return request<UserProfile>(
      "/profiles/me",
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      { ...mockUser, ...data }
    );
  },

  async submitOnboarding(data: Record<string, unknown>): Promise<UserProfile> {
    return request<UserProfile>(
      "/profiles/onboarding",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      mockUser
    );
  },
};

// ── Discovery & Matches Service ──────────────────────────────────────────────
export const discoveryApi = {
  async getFeed(params?: { lifestyle?: string; limit?: number; offset?: number }): Promise<UserProfile[]> {
    const query = new URLSearchParams();
    if (params?.lifestyle && params.lifestyle !== "All") query.set("lifestyle", params.lifestyle);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));

    const path = `/discovery/feed${query.toString() ? `?${query.toString()}` : ""}`;
    return request<UserProfile[]>(path, { method: "GET" }, mockProfiles);
  },

  async pass(targetProfileId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(
      `/discovery/pass/${targetProfileId}`,
      { method: "POST" },
      { success: true }
    );
  },

  async reachOut(targetUserId: string): Promise<{ status: "sent" | "matched"; conversationId?: string }> {
    return request<{ status: "sent" | "matched"; conversationId?: string }>(
      "/connections/reach-out",
      {
        method: "POST",
        body: JSON.stringify({ targetUserId }),
      },
      { status: "sent" }
    );
  },

  async getMatches(): Promise<UserProfile[]> {
    return request<UserProfile[]>("/connections/matches", { method: "GET" }, mockMatches);
  },
};

// ── Messaging Service ────────────────────────────────────────────────────────
export const messagingApi = {
  async getConversations(): Promise<Conversation[]> {
    return request<Conversation[]>("/messaging/conversations", { method: "GET" }, mockConversations);
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const conv = mockConversations.find((c) => c.id === conversationId);
    return request<Message[]>(
      `/messaging/conversations/${conversationId}/messages`,
      { method: "GET" },
      conv ? conv.messages : []
    );
  },

  async sendMessage(conversationId: string, text: string): Promise<Message> {
    const fallbackMsg: Message = {
      id: `m_${Date.now()}`,
      senderId: "me",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: false,
    };
    return request<Message>(
      `/messaging/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({ text }),
      },
      fallbackMsg
    );
  },

  async markRead(conversationId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(
      `/messaging/conversations/${conversationId}/read`,
      { method: "POST" },
      { success: true }
    );
  },
};

// ── Notifications Service ────────────────────────────────────────────────────
export const notificationsApi = {
  async getAll(): Promise<Notification[]> {
    return request<Notification[]>("/notifications", { method: "GET" }, mockNotifications);
  },

  async markRead(id?: string): Promise<{ success: boolean }> {
    const path = id ? `/notifications/${id}/read` : "/notifications/read-all";
    return request<{ success: boolean }>(path, { method: "POST" }, { success: true });
  },
};

// ── Settings & Safety Service ────────────────────────────────────────────────
export const settingsApi = {
  async getSettings(): Promise<any> {
    return request<any>("/settings", { method: "GET" }, null);
  },

  async updateAccount(data: { email?: string; currentPassword?: string; newPassword?: string }): Promise<any> {
    return request<any>("/settings/account", { method: "PATCH", body: JSON.stringify(data) }, { success: true });
  },

  async updateNotifications(data: { emailMatches?: boolean; emailMessages?: boolean; emailSystem?: boolean }): Promise<any> {
    return request<any>("/settings/notifications", { method: "PATCH", body: JSON.stringify(data) }, { success: true });
  },

  async updatePrivacy(data: { showLastActive?: boolean; showApproxLocation?: boolean; isPaused?: boolean }): Promise<any> {
    return request<any>("/settings/privacy", { method: "PATCH", body: JSON.stringify(data) }, { success: true });
  },

  async deleteAccount(): Promise<any> {
    return request<any>("/settings/account", { method: "DELETE" }, { success: true });
  },

  async block(targetUserId: string, reason?: string): Promise<any> {
    return request<any>("/safety/block", { method: "POST", body: JSON.stringify({ targetUserId, reason }) }, { success: true });
  },

  async report(targetUserId: string, reason: string, description?: string): Promise<any> {
    return request<any>(
      "/safety/report",
      {
        method: "POST",
        body: JSON.stringify({ targetUserId, reason, description }),
      },
      { success: true }
    );
  },

  async unmatch(targetUserId: string, reason?: string): Promise<any> {
    return request<any>("/safety/unmatch", { method: "POST", body: JSON.stringify({ targetUserId, reason }) }, { success: true });
  },
};

// ── Admin Service ────────────────────────────────────────────────────────────
export const adminApi = {
  async getOverview(): Promise<any> {
    return request<any>("/admin/overview", { method: "GET" }, null);
  },

  async getUsers(params?: { status?: string; role?: string; limit?: number }): Promise<any[]> {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.role) q.set("role", params.role);
    return request<any[]>(`/admin/users?${q.toString()}`, { method: "GET" }, []);
  },

  async updateUserStatus(userId: string, accountStatus: string, reason?: string): Promise<any> {
    return request<any>(
      `/admin/users/${userId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ accountStatus, reason }),
      },
      { success: true }
    );
  },

  async getReports(status?: string): Promise<any[]> {
    const q = status ? `?status=${status}` : "";
    return request<any[]>(`/admin/reports${q}`, { method: "GET" }, []);
  },

  async updateReportStatus(reportId: string, status: string, notes?: string): Promise<any> {
    return request<any>(
      `/admin/reports/${reportId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status, notes }),
      },
      { success: true }
    );
  },
};

// ── Billing Service ──────────────────────────────────────────────────────────
export const billingApi = {
  async getPlans(): Promise<any> {
    return request<any>("/billing/plans", { method: "GET" }, null);
  },

  async createCheckout(priceId: string): Promise<{ checkoutUrl: string }> {
    return request<{ checkoutUrl: string }>(
      "/billing/checkout",
      {
        method: "POST",
        body: JSON.stringify({ priceId }),
      },
      { checkoutUrl: "#" }
    );
  },

  async createPortal(): Promise<{ portalUrl: string }> {
    return request<{ portalUrl: string }>("/billing/portal", { method: "POST" }, { portalUrl: "#" });
  },
};

// ── WebSocket Real-Time Chat Helper ──────────────────────────────────────────
export type ChatEventHandler = (event: { type: string; payload: any }) => void;

export function connectChatWebSocket(onEvent: ChatEventHandler): () => void {
  const token = tokenStorage.get();
  const url = `${WS_BASE}${token ? `?token=${encodeURIComponent(token)}` : ""}`;

  let ws: WebSocket | null = null;
  let heartbeatTimer: any = null;
  let isClosedExplicitly = false;

  const connect = () => {
    if (isClosedExplicitly) return;
    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        heartbeatTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== "pong") {
            onEvent(data);
          }
        } catch {}
      };

      ws.onclose = () => {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (!isClosedExplicitly) {
          setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        if (ws?.readyState === WebSocket.OPEN) ws.close();
      };
    } catch {
      // Offline fallback
    }
  };

  connect();

  return () => {
    isClosedExplicitly = true;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (ws) ws.close();
  };
}
