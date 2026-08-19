import { Button } from '../../../atoms/Button';
import { IconTile } from '../../../atoms/IconTile';
import { StrokeIcon } from '../../../lib/icons';
import { AuthHeading, AuthShell } from '../../../templates/AuthShell';
import { preventPlaceholderNav } from '../shared';

/** Recovery code sent — confirmation with resend escape hatches. */
export const ForgotSentPage = () => (
  <AuthShell
    eyebrow="check your inbox"
    footer={<a href="#signin" onClick={preventPlaceholderNav} className="font-semibold text-accent">← Back to sign in</a>}
  >
    <div className="flex flex-col items-center gap-3.5">
      <IconTile
        size="lg"
        shape="circle"
        icon={<StrokeIcon name="mail" size={28} />}
      />
      <AuthHeading
        title="Reset code sent"
        sub={
          <>
            We sent a 6-digit code to <b className="text-fg1">sam@example.dev</b>. It
            expires in 15 minutes.
          </>
        }
      />
    </div>

    <Button variant="primary" block iconLeading={<StrokeIcon name="arrowRight" size={15} />}>
      Enter the code
    </Button>

    <div className="flex items-center justify-center gap-1.5 text-[13px] text-fg3">
      Didn't get it?
      <a href="#resend" onClick={preventPlaceholderNav} className="font-semibold text-accent">Resend</a>
      <span>·</span>
      <a href="#change-email" onClick={preventPlaceholderNav} className="font-semibold text-accent">Use a different email</a>
    </div>
  </AuthShell>
);

ForgotSentPage.displayName = 'ForgotSentPage';
