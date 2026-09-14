// The 100 most common passwords worldwide, compiled from the
// publicly-published annual "most common passwords" rankings (NordPass,
// SplashData/Dashlane, HaveIBeenPwned) — these lists overlap heavily
// year to year, so this is a stable, well-known set, not something tied
// to one specific year's breach data.
//
// To extend: just add more lowercase strings to this array. Matching is
// case-insensitive (see isCommonPassword below), so "Password1" and
// "PASSWORD1" are both caught by the single "password1" entry — don't
// bother adding case variants.
export const COMMON_PASSWORDS = [
  "123456", "123456789", "12345678", "12345", "1234567", "1234567890",
  "qwerty", "qwerty123", "qwertyuiop", "password", "password123",
  "123123", "111111", "1111111", "000000", "abc123", "iloveyou", "admin",
  "welcome", "welcome1", "monkey", "dragon", "letmein", "login", "starwars",
  "master", "hello", "freedom", "whatever", "qazwsx", "trustno1", "killer",
  "sunshine", "shadow", "princess", "football", "baseball", "basketball",
  "soccer", "superman", "batman", "michael", "jennifer", "jordan", "hunter",
  "harley", "ranger", "buster", "george", "charlie", "andrew", "michelle",
  "daniel", "corvette", "mustang", "cheese", "computer", "internet",
  "654321", "222222", "121212", "112233", "qwe123", "1q2w3e4r", "1qaz2wsx",
  "zaq12wsx", "asdfghjkl", "asdf1234", "aa123456", "passw0rd", "p@ssw0rd",
  "letmein1", "dragon1", "master1", "iloveyou1", "trustno1!", "changeme",
  "default", "guest", "test123", "temp123", "abcd1234", "a1b2c3d4",
  "qwerty1", "qwerty12", "1234", "12345678910", "google", "facebook",
  "instagram", "amazon123", "netflix", "spotify123", "apple123", "windows10",
  "summer2024", "winter2024", "welcome123", "login123", "access123",
  "chocolate", "flower", "sunflower", "butterfly",
] as const;

const COMMON_PASSWORDS_SET = new Set<string>(COMMON_PASSWORDS);

export function isCommonPassword(password: string) {
  return COMMON_PASSWORDS_SET.has(password.trim().toLowerCase());
}
