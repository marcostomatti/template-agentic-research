import { Button } from '../../../atoms/Button';
import { StrokeIcon } from '../../../lib/icons';
import { CodeInput } from '../../../molecules/CodeInput';
import { FormField } from '../../../organisms/FormKit';
import { AuthHeading, AuthShell } from '../../../templates/AuthShell';

const CODE_LENGTH = 6;
const CODE_LABEL = '6-digit code';

export interface StepUpPageProps {
  /** Which method this screen is collecting. Drives the copy, not the layout. */
  method: 'email_otp' | 'totp';
  /** Masked destination, shown only for `email_otp`. */
  maskedEmail?: string;
  /** Controlled code value + change handler. */
  code: string;
  onCodeChange: (code: string) => void;
  onSubmit: () => void;
  /** Inline error copy — wrong code, expired code, transport failure. */
  error?: string;
  busy?: boolean;
  /** Shown only when BOTH methods are available, so the user can switch. */
  onUseOtherMethod?: () => void;
  /** Escape hatch for a failed code request (e.g. a transport error while
   *  fetching the email code) — re-issues it. Rendered only when provided;
   *  the caller decides when that's warranted (e.g. a single-method flow
   *  with no `onUseOtherMethod` to fall back on). */
  onRetry?: () => void;
}

/**
 * Identity re-check for an action the user already started — never
 * enrollment. Handles both SAM step-up methods: email OTP and TOTP.
 */
export const StepUpPage = ({
  method,
  maskedEmail,
  code,
  onCodeChange,
  onSubmit,
  error,
  busy = false,
  onUseOtherMethod,
  onRetry,
}: StepUpPageProps) => (
  <AuthShell eyebrow="security · verify it's you">
    <AuthHeading
      title="Confirm it's you"
      sub={method === 'email_otp'
        ? <>We sent a 6-digit code to <b className="text-fg1">{maskedEmail}</b>. Enter it to continue.</>
        : 'Enter the current 6-digit code from your authenticator app.'}
    />

    <FormField
      label={CODE_LABEL}
      error={error != null
        ? <span role="alert">{error}</span>
        : undefined}
    >
      {/* eslint-disable-next-line jsx-a11y/no-autofocus --
          the code entry is this step's single task; autofocus matches
          the design source and the shipped behavior. */}
      <CodeInput length={CODE_LENGTH} value={code} onChange={onCodeChange} label={CODE_LABEL} autoFocus />
    </FormField>

    <Button
      variant="primary"
      block
      disabled={busy}
      aria-busy={busy}
      iconLeading={<StrokeIcon name="check" size={15} />}
      onClick={onSubmit}
    >
      {busy
        ? 'Confirming…'
        : 'Confirm'}
    </Button>

    {onRetry != null && (
      <a
        href="#retry"
        aria-disabled={busy}
        className="text-center text-[13px] font-semibold text-accent !no-underline"
        onClick={(e) => {
          e.preventDefault();
          if (busy) return;
          onRetry();
        }}
      >
        Try again
      </a>
    )}

    {onUseOtherMethod != null && (
      <a
        href="#use-other-method"
        aria-disabled={busy}
        className="text-center text-[13px] font-semibold text-accent !no-underline"
        onClick={(e) => {
          e.preventDefault();
          if (busy) return;
          onUseOtherMethod();
        }}
      >
        Use a different method
      </a>
    )}
  </AuthShell>
);

StepUpPage.displayName = 'StepUpPage';
