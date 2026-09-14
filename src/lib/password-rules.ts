import { isCommonPassword } from "./common-passwords";

export const PASSWORD_MIN_LENGTH = 10;

export interface PasswordCheck {
  key: "length" | "letter" | "number" | "common";
  label: string;
  met: boolean;
}

/**
 * One shared source of truth for password rules, used both by the live
 * strength meter (so what the user sees while typing matches exactly
 * what the server will accept) and by the Zod schema below. Deliberately
 * no special-character requirement — per the brief, that pushes people
 * toward reused weak passwords rather than stronger ones.
 */
export function checkPassword(password: string): PasswordCheck[] {
  return [
    {
      key: "length",
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    { key: "letter", label: "At least one letter", met: /[a-zA-Z]/.test(password) },
    { key: "number", label: "At least one number", met: /[0-9]/.test(password) },
    {
      key: "common",
      label: "Not a commonly used password",
      met: password.length === 0 || !isCommonPassword(password),
    },
  ];
}

export function isPasswordValid(password: string) {
  return checkPassword(password).every((check) => check.met);
}

/** The single specific reason to show for a rejected password — checked
 *  in the same priority order the schema uses, so the message matches. */
export function firstPasswordIssue(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!/[a-zA-Z]/.test(password)) return "Password needs a letter";
  if (!/[0-9]/.test(password)) return "Password needs a number";
  if (isCommonPassword(password)) {
    return "That password is too common — choose something less guessable";
  }
  return null;
}
