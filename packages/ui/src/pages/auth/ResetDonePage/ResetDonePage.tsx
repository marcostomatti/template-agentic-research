import { Button } from '../../../atoms/Button';
import { IconTile } from '../../../atoms/IconTile';
import { StrokeIcon } from '../../../lib/icons';
import { AuthHeading, AuthShell } from '../../../templates/AuthShell';

/** Reset complete — signed in here, signed out everywhere else. */
export const ResetDonePage = () => (
  <AuthShell eyebrow="password updated">
    <div className="flex flex-col items-center gap-3.5">
      <IconTile
        tone="success"
        size="xl"
        shape="circle"
        icon={<StrokeIcon name="shieldCheck" size={32} />}
      />
      <AuthHeading
        title="You're back in"
        sub="Your password is updated. We signed you out of all other devices for safety."
      />
    </div>

    <Button variant="primary" block iconLeading={<StrokeIcon name="arrowRight" size={15} />}>
      Continue to dashboard
    </Button>
  </AuthShell>
);

ResetDonePage.displayName = 'ResetDonePage';
