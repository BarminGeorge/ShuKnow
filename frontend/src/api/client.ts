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

  const hasStringBody = fetchOptions.body && typeof fetchOptions.body === "string";
  if (!headers.has("Content-Type") && hasStringBody) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: shouldSkipAuth ? fetchOptions.credentials : (fetchOptions.credentials ?? "include"),
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
