import { Button } from '../../../atoms/Button';
import { IconTile } from '../../../atoms/IconTile';
import { StrokeIcon } from '../../../lib/icons';
import { AuthShell } from '../../../templates/AuthShell';
import { preventPlaceholderNav } from '../shared';

import { NextStep } from './NextStep';

/** Sign-up complete — celebratory check, concrete next steps, CTA in. */
export const SignupDonePage = () => (
  <AuthShell eyebrow="all set">
    <div className="flex flex-col items-center gap-3.5">
      <IconTile
        tone="success"
        size="2xl"
        shape="circle"
        pulse
        icon={<StrokeIcon name="check" size={36} />}
      />
      <h2 className="!m-0 text-center font-display !text-[26px] font-bold !tracking-[-0.02em] !leading-[normal] text-fg1">
        Welcome to <span className="text-accent">open-garden</span> 🍅
      </h2>
      <div className="text-center text-sm leading-relaxed text-pretty text-fg2">
        Your account is ready. We seeded an example agent so you can try a session right away.
      </div>
    </div>

    <div className="flex flex-col gap-2 rounded-md border border-border-soft bg-surface-sunk p-3.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg3">next steps</div>
      <NextStep icon="bot" label="Start your first session" sub="kicks off the example agent" />
      <NextStep icon="userPlus" label="Invite a teammate" sub="up to 5 free on the community plan" />
      <NextStep icon="shieldCheck" label="Turn on 2FA" sub="recommended · takes a minute" />
    </div>

    <Button variant="primary" block iconLeading={<StrokeIcon name="arrowRight" size={15} />}>
      Go to the dashboard
    </Button>
    <a href="#dashboard" onClick={preventPlaceholderNav} className="text-center text-[13px] text-fg3 !no-underline">
      I'll explore on my own →
    </a>
  </AuthShell>
);

SignupDonePage.displayName = 'SignupDonePage';
