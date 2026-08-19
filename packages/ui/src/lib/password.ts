export interface PasswordStrengthResult {
  /** 0 (empty) … 5 (great). */
  score: number;
  label: string;
}

const LABELS = ['weak', 'okay', 'good', 'strong', 'great'];

/** The auth screens' meter scoring: length 8+/12+, mixed case, digit, symbol. */
export const passwordStrength = (pw: string): PasswordStrengthResult => {
  if (!pw) return { score: 0, label: 'empty' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return { score, label: LABELS[score - 1] ?? 'weak' };
};
