import { useState } from 'react';

import { Button } from '../../../atoms/Button';
import { PasswordStrength } from '../../../atoms/PasswordStrength';
import { Switch } from '../../../atoms/Switch';
import { passwordStrength } from '../../../lib';
import { StrokeIcon } from '../../../lib/icons';
import { Stepper } from '../../../molecules/Stepper';
import { FormField, TextInput } from '../../../organisms/FormKit';
import { AuthHeading, AuthShell } from '../../../templates/AuthShell';
import { SIGNUP_STEPS, preventPlaceholderNav, toHandle } from '../shared';

/** Email sign-up, step 1 of 2 — username, email, password with live meter. */
export const SignupEmailPage = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const strength = passwordStrength(form.password);

  return (
    <AuthShell
      eyebrow="step 1 of 2"
      footer={
        <>
          Already signed up? <a href="#signin" onClick={preventPlaceholderNav} className="font-semibold text-accent">Sign in</a>
        </>
      }
    >
      <AuthHeading
        title="Plant your account"
        sub="Start with the basics. We'll set up your first workspace in a moment."
      />

      <Stepper tone="accent" size="sm" items={SIGNUP_STEPS} index={0} />

      <div className="flex flex-col gap-3.5">
        <FormField label="Username" hint="Lowercase. Shows up as @yourname." hintPlacement="above">
          <TextInput
            value={form.username}
            onChange={(v) => setForm({ ...form, username: toHandle(v) })}
            placeholder="sam"
            prefix="@"
            suffix={
              form.username.length >= 3
                ? (
                  <StrokeIcon name="check" size={14} className="text-success" />
                )
                : undefined
            }
          />
        </FormField>
        <FormField label="Email" hint="We'll send a confirmation link to verify." hintPlacement="above">
          <TextInput
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            type="email"
            placeholder="you@example.com"
            prefix={<StrokeIcon name="mail" size={14} />}
          />
        </FormField>
        <FormField label="Password" hint="At least 10 characters with a mix." hintPlacement="above">
          <TextInput
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            type="password"
            placeholder="•••••••••••"
            prefix={<StrokeIcon name="key" size={14} />}
          />
          <PasswordStrength score={strength.score} label={strength.label} className="mt-1.5" />
        </FormField>
      </div>

      <label className="flex items-start gap-2.5 text-xs leading-normal text-fg2">
        <Switch size="sm" checked onChange={() => {}} />
        <span>
          I agree to the <a href="#terms" onClick={preventPlaceholderNav} className="text-accent">terms</a> and{' '}
          <a href="#privacy" onClick={preventPlaceholderNav} className="text-accent">privacy</a> — we take both seriously.
        </span>
      </label>

      <Button variant="primary" block iconLeading={<StrokeIcon name="arrowRight" size={15} />}>
        Continue to workspace
      </Button>
    </AuthShell>
  );
};

SignupEmailPage.displayName = 'SignupEmailPage';
