import type { OAuthProvider } from '../../../atoms/OAuthButton';

import { useState } from 'react';

import { Button } from '../../../atoms/Button';
import { StrokeIcon } from '../../../lib/icons';
import { Stepper } from '../../../molecules/Stepper';
import { FormField, TextInput } from '../../../organisms/FormKit';
import { AuthHeading, AuthShell } from '../../../templates/AuthShell';
import { SIGNUP_STEPS, toHandle } from '../shared';

import { PROFILES, ProviderProfileCard } from './ProviderProfileCard';

export interface OAuthConfirmPageProps {
  provider: OAuthProvider;
}

/** OAuth sign-up confirm — prefilled provider card, pick a handle, done. */
export const OAuthConfirmPage = ({ provider }: OAuthConfirmPageProps) => {
  const profile = PROFILES[provider];
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState<string>(profile.name);

  return (
    <AuthShell eyebrow={`signed in with ${provider}`}>
      <AuthHeading
        title="One more thing"
        sub={<>We grabbed your details from {provider}. Pick a username and you're in.</>}
      />

      <Stepper tone="accent" size="sm" items={SIGNUP_STEPS} index={0} />

      <ProviderProfileCard provider={provider} />

      <FormField label="Username" hint="Lowercase. Shows up as @yourname." hintPlacement="above">
        <TextInput
          value={username || profile.handle || ''}
          onChange={(v) => setUsername(toHandle(v))}
          placeholder="sam"
          prefix="@"
        />
      </FormField>

      <FormField
        label="Display name"
        hint={`We pulled "${profile.name}" from ${provider}. Change it if you like.`}
        hintPlacement="above"
      >
        <TextInput value={displayName} onChange={setDisplayName} placeholder="Sam Lin" />
      </FormField>

      <Button variant="primary" block iconLeading={<StrokeIcon name="arrowRight" size={15} />}>
        Continue to workspace
      </Button>
    </AuthShell>
  );
};

OAuthConfirmPage.displayName = 'OAuthConfirmPage';
