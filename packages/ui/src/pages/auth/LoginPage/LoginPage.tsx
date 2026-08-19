import { useState } from 'react';

import { Button } from '../../../atoms/Button';
import { Divider } from '../../../atoms/Divider';
import { OAuthButton } from '../../../atoms/OAuthButton';
import { Switch } from '../../../atoms/Switch';
import { StrokeIcon } from '../../../lib/icons';
import { FormField, TextInput } from '../../../organisms/FormKit';
import { AuthHeading, AuthShell } from '../../../templates/AuthShell';
import { preventPlaceholderNav } from '../shared';

export interface LoginPageProps {
  /** 'error' renders the bad-credentials message under the password field. */
  mode?: 'default' | 'error';
  onForgot?: () => void;
  onSignup?: () => void;
}

/** One screen, three ways in — OAuth above the email form, links bookending. */
export const LoginPage = ({ mode = 'default', onForgot, onSignup }: LoginPageProps) => {
  const [email, setEmail] = useState('sam@example.dev');
  const [pw, setPw] = useState('••••••••••');
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);

  return (
    <AuthShell
      eyebrow="welcome back"
      footer={
        <>
          New here?{' '}
          <a
            href="#create-account"
            className="font-semibold text-accent"
            onClick={(e) => {
              e.preventDefault();
              onSignup?.();
            }}
          >
            Create an account
          </a>
        </>
      }
    >
      <AuthHeading title="Sign in" sub="Tend to your agents, check the harvest." />

      <div className="flex flex-col gap-2.5">
        <OAuthButton provider="google" />
        <OAuthButton provider="github" />
      </div>

      <Divider label="or with email" />

      <div className="flex flex-col gap-3.5">
        <FormField label="Email">
          <TextInput
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="you@example.com"
            prefix={<StrokeIcon name="mail" size={14} />}
          />
        </FormField>
        <FormField
          label="Password"
          labelEnd={
            <a
              href="#forgot-password"
              className="text-xs font-semibold text-accent"
              onClick={(e) => {
                e.preventDefault();
                onForgot?.();
              }}
            >
              Forgot?
            </a>
          }
          error={mode === 'error'
            ? 'That password doesn\'t match. Try again or reset it.'
            : undefined}
        >
          <TextInput
            value={pw}
            onChange={setPw}
            type={showPw
              ? 'text'
              : 'password'}
            placeholder="••••••••"
            prefix={<StrokeIcon name="key" size={14} />}
            suffix={
              <button
                type="button"
                aria-pressed={showPw}
                aria-label={showPw
                  ? 'Hide password'
                  : 'Show password'}
                className="cursor-pointer border-none bg-transparent p-0.5 text-fg3"
                onClick={() => setShowPw((s) => !s)}
              >
                <StrokeIcon name={showPw
                  ? 'eye'
                  : 'shield'} size={14} />
              </button>
            }
          />
        </FormField>
        <label
          htmlFor="login-remember"
          className="-mt-1 flex cursor-pointer items-center gap-2.5 text-[13px] text-fg2"
        >
          <Switch id="login-remember" size="sm" checked={remember} onChange={setRemember} />
          <span>Keep me signed in on this device</span>
        </label>
      </div>

      <Button variant="primary" block iconLeading={<StrokeIcon name="arrowRight" size={15} />}>
        Sign in
      </Button>

      <div className="text-center font-mono text-[11px] text-fg3">
        we're an open-source community · <a href="#terms" onClick={preventPlaceholderNav} className="text-accent">terms</a> ·{' '}
        <a href="#privacy" onClick={preventPlaceholderNav} className="text-accent">privacy</a>
      </div>
    </AuthShell>
  );
};

LoginPage.displayName = 'LoginPage';
