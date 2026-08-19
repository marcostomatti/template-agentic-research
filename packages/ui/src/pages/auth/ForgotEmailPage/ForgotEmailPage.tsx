import { useState } from 'react';

import { Button } from '../../../atoms/Button';
import { StrokeIcon } from '../../../lib/icons';
import { FormField, TextInput } from '../../../organisms/FormKit';
import { AuthHeading, AuthShell } from '../../../templates/AuthShell';
import { preventPlaceholderNav } from '../shared';

/** Password recovery step 1 — email in, one-time code out. */
export const ForgotEmailPage = () => {
  const [email, setEmail] = useState('');

  return (
    <AuthShell
      eyebrow="password recovery"
      footer={<a href="#signin" onClick={preventPlaceholderNav} className="font-semibold text-accent">← Back to sign in</a>}
    >
      <AuthHeading
        title="Forgot your password?"
        sub="Type the email you sign in with. We'll send a one-time code so you can reset it."
      />

      <FormField label="Email">
        <TextInput
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="you@example.com"
          prefix={<StrokeIcon name="mail" size={14} />}
          /* eslint-disable-next-line jsx-a11y/no-autofocus --
             recovery screen has a single task; focusing its one field
             matches the design source and the shipped behavior. */
          autoFocus
        />
      </FormField>

      <Button variant="primary" block iconLeading={<StrokeIcon name="send" size={15} />}>
        Send reset code
      </Button>

      <div className="flex items-start gap-2.5 rounded-md border border-border-soft bg-surface-sunk p-3">
        <StrokeIcon name="helpCircle" size={14} className="mt-0.5 shrink-0 text-fg3" />
        <span className="text-xs leading-[1.55] text-fg2">
          If you signed up with Google or GitHub, you don't have a password — sign in through
          that provider instead.
        </span>
      </div>
    </AuthShell>
  );
};

ForgotEmailPage.displayName = 'ForgotEmailPage';
