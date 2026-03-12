export interface AppError {
  code: string;
  message: string;
  cause?: unknown;
}

export const createAppError = (
  code: string,
  message: string,
  cause?: unknown,
): AppError => ({
  code,
  message,
  cause,
});
