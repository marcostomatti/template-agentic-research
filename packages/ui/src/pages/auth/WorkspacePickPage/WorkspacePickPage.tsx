import { useState } from 'react';

import { Badge } from '../../../atoms/Badge';
import { Button } from '../../../atoms/Button';
import { Divider } from '../../../atoms/Divider';
import { WorkspaceMark } from '../../../atoms/WorkspaceMark';
import { StrokeIcon } from '../../../lib/icons';
import { OptionCard } from '../../../molecules/OptionCard';
import { Stepper } from '../../../molecules/Stepper';
import { AuthHeading, AuthShell } from '../../../templates/AuthShell';
import { SIGNUP_STEPS } from '../shared';

const INVITES = [
  { id: 'og', name: 'open-garden', desc: 'Main workspace · invited by sam', members: 12, tone: 'accent', role: 'member' },
  { id: 'tm', name: 'tomato-mainline', desc: 'Maintainers · invited by ren', members: 6, tone: 'primary', role: 'admin' },
  { id: 'sd', name: 'seed-bank', desc: 'Experiments · invited by kai', members: 3, tone: 'gold', role: 'viewer' },
] as const;

export interface WorkspacePickPageProps {
  /** invited = pick from open invites; fresh = seeded default workspace. */
  kind?: 'invited' | 'fresh';
}

/** Sign-up step 2 of 2 — drop into an invite or start fresh. */
export const WorkspacePickPage = ({ kind = 'invited' }: WorkspacePickPageProps) => {
  const [picked, setPicked] = useState(kind === 'invited'
    ? 'og'
    : 'default');
  const pickedName =
    picked === 'default'
      ? 'default'
      : INVITES.find((w) => w.id === picked)?.name;

  return (
    <AuthShell eyebrow="step 2 of 2" width="lg">
      <AuthHeading
        title={kind === 'invited'
          ? 'Pick a workspace'
          : 'Your workspace'}
        sub={
          kind === 'invited'
            ? 'You\'ve been invited to a few — drop into one to start. You can switch between them later.'
            : 'We\'re seeding a default workspace just for you. Rename it whenever, or spin up another from the sidebar.'
        }
      />

      <Stepper tone="accent" size="sm" items={SIGNUP_STEPS} index={1} />

      {kind === 'invited'
        ? (
          <div className="flex flex-col gap-2">
            {INVITES.map((w) => (
              <OptionCard
                key={w.id}
                selected={picked === w.id}
                onClick={() => setPicked(w.id)}
                leading={<WorkspaceMark name={w.name} tone={w.tone} />}
                title={w.name}
                meta={<Badge tone="neutral">{w.role}</Badge>}
                description={`${w.desc} · ${w.members} members`}
              />
            ))}

            <Divider label="or" className="mt-2" />
            <button
              type="button"
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-dashed border-border-strong bg-transparent p-3.5 font-body text-[13px] font-semibold text-fg2"
            >
              <StrokeIcon name="plus" size={16} /> Start a fresh workspace instead
            </button>
          </div>
        )
        : (
          <div className="flex items-center gap-3.5 rounded-lg border border-border-soft bg-surface-1 p-4">
            <WorkspaceMark name="default" size="lg" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-display text-[15px] font-bold text-fg1">default</span>
              <span className="mt-0.5 text-xs text-fg3">fresh workspace · just you · rename below</span>
            </span>
            <Badge tone="success" dot>seeded</Badge>
          </div>
        )}

      <Button variant="primary" block iconLeading={<StrokeIcon name="arrowRight" size={15} />}>
        Enter {pickedName}
      </Button>
    </AuthShell>
  );
};

WorkspacePickPage.displayName = 'WorkspacePickPage';
