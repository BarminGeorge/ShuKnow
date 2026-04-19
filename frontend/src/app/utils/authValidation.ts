export const LOGIN_MIN_LENGTH = 3;
export const LOGIN_MAX_LENGTH = 50;
export const PASSWORD_MIN_LENGTH = 8;

const LOGIN_PATTERN = /^[a-zA-Z0-9_]+$/;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_LOWERCASE = /[a-z]/;
const HAS_DIGIT = /[0-9]/;

export function getFormString(formData: FormData, fieldName: string): string {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value : "";
}

export function validateLoginValue(loginValue: string): string | null {
  if (!loginValue) {
    return "Введите логин";
  }
  if (loginValue.length < LOGIN_MIN_LENGTH || loginValue.length > LOGIN_MAX_LENGTH) {
    return "Логин должен быть от 3 до 50 символов";
  }
  if (!LOGIN_PATTERN.test(loginValue)) {
    return "Логин может содержать только латинские буквы, цифры и подчёркивания";
  }
  return null;
}

export function validateLoginPassword(password: string): string | null {
  if (!password) {
    return "Введите пароль";
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "Пароль должен быть не менее 8 символов";
  }
  return null;
}

export function validateRegistrationPassword(password: string): string | null {
  const baseError = validateLoginPassword(password);
  if (baseError) {
    return baseError;
  }
  if (!HAS_UPPERCASE.test(password)) {
    return "Пароль должен содержать заглавную букву";
  }
  if (!HAS_LOWERCASE.test(password)) {
    return "Пароль должен содержать строчную букву";
  }
  if (!HAS_DIGIT.test(password)) {
    return "Пароль должен содержать цифру";
  }
  return null;
}
