import { LOCAL_STORAGE_AUTH_TOKEN_KEY } from "../constants";

export function getAuthToken(): string | null {
  return localStorage.getItem(LOCAL_STORAGE_AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(LOCAL_STORAGE_AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(LOCAL_STORAGE_AUTH_TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    errorMessage?: string
  ) {
    super(errorMessage || `API Error: ${status} ${statusText}`);
    this.name = "ApiError";
  }
}

interface ApiRequestOptions extends RequestInit {
  shouldSkipAuth?: boolean;
}

export async function apiRequest<ResponseType>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<ResponseType> {
  const { shouldSkipAuth, ...fetchOptions } = options;
  
  const headers = new Headers(fetchOptions.headers);
  
  if (!shouldSkipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const hasStringBody = fetchOptions.body && typeof fetchOptions.body === "string";
  if (!headers.has("Content-Type") && hasStringBody) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let errorMessage: string | undefined;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.detail || errorBody.title || errorBody.message;
    } catch {
    }
    throw new ApiError(response.status, response.statusText, errorMessage);
  }

  if (response.status === 204) {
    return undefined as ResponseType;
  }

  return response.json();
}
