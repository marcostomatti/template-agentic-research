import { useState } from 'react';

import { Button } from '../../../atoms/Button';
import { PasswordStrength } from '../../../atoms/PasswordStrength';
import { passwordStrength } from '../../../lib';
import { StrokeIcon } from '../../../lib/icons';
import { CodeInput } from '../../../molecules/CodeInput';
import { FormField, TextInput } from '../../../organisms/FormKit';
import { AuthHeading, AuthShell } from '../../../templates/AuthShell';

/** Deep-link landing — code + new password in one tight screen. */
export const ResetCodePage = () => {
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const strength = passwordStrength(pw);
  const mismatch = pw2 !== '' && pw !== pw2;

  return (
    <AuthShell eyebrow="reset password">
      <AuthHeading
        title="Set a new password"
        sub="Code from your inbox, then pick a new password. You'll be signed in right after."
      />

      <FormField
        label="6-digit code"
        hint="Copy from the email — we'll auto-verify when all 6 are in."
        hintPlacement="above"
      >
        {/* eslint-disable-next-line jsx-a11y/no-autofocus --
            the code entry is this step's single task; autofocus matches
            the design source and the shipped behavior. */}
        <CodeInput length={6} value={code} onChange={setCode} autoFocus />
      </FormField>

      <FormField label="New password">
        <TextInput
          value={pw}
          onChange={setPw}
          type="password"
          placeholder="•••••••••••"
          prefix={<StrokeIcon name="key" size={14} />}
        />
        <PasswordStrength score={strength.score} label={strength.label} className="mt-1.5" />
      </FormField>

      <FormField
        label="Confirm new password"
        error={mismatch
          ? 'Doesn\'t match. Try again.'
          : undefined}
      >
        <TextInput
          value={pw2}
          onChange={setPw2}
          type="password"
          placeholder="•••••••••••"
          prefix={<StrokeIcon name="key" size={14} />}
          suffix={
            pw2 !== '' && !mismatch
              ? (
                <StrokeIcon name="check" size={14} className="text-success" />
              )
              : undefined
          }
        />
      </FormField>

      <Button variant="primary" block iconLeading={<StrokeIcon name="check" size={15} />}>
        Reset password & sign in
      </Button>
    </AuthShell>
  );
};

ResetCodePage.displayName = 'ResetCodePage';
