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

function extractApiErrorMessage(errorBody: unknown): string | undefined {
  if (!errorBody || typeof errorBody !== "object") {
    return undefined;
  }

  const body = errorBody as Record<string, unknown>;
  for (const key of ["detail", "title", "message"]) {
    if (typeof body[key] === "string" && body[key]) {
      return body[key];
    }
  }

  if (Array.isArray(body.errors)) {
    const firstError = body.errors[0];
    if (typeof firstError === "string") {
      return firstError;
    }
    if (firstError && typeof firstError === "object") {
      return extractApiErrorMessage(firstError);
    }
  }

  if (body.errors && typeof body.errors === "object") {
    const firstError = Object.values(body.errors as Record<string, unknown>)[0];
    if (Array.isArray(firstError) && typeof firstError[0] === "string") {
      return firstError[0];
    }
  }

  return undefined;
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
      errorMessage = extractApiErrorMessage(errorBody);
    } catch {
    }
    throw new ApiError(response.status, response.statusText, errorMessage);
  }

  if (response.status === 204) {
    return undefined as ResponseType;
  }

  const responseText = await response.text();
  if (!responseText.trim()) {
    return undefined as ResponseType;
  }

  return JSON.parse(responseText);
}
