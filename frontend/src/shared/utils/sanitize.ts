const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const MULTIPLE_WHITESPACE = /\s+/g;

export const sanitizeTextInput = (
  rawValue: string,
  maxLength = 1000,
): string => {
  const normalized = rawValue
    .replace(CONTROL_CHARS, " ")
    .replace(MULTIPLE_WHITESPACE, " ")
    .trim();

  return normalized.slice(0, maxLength);
};

export const sanitizeMultilineInput = (
  rawValue: string,
  maxLength = 5000,
): string => {
  const valueWithoutControls = rawValue.replace(CONTROL_CHARS, "");
  return valueWithoutControls.slice(0, maxLength).trim();
};

export const sanitizeFileName = (rawValue: string): string => {
  const withoutUnsafeChars = rawValue.replace(/[\\/:*?"<>|]+/g, " ");
  return sanitizeTextInput(withoutUnsafeChars, 120);
};
