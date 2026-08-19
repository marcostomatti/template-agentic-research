import type { ReactNode } from 'react';

/** Display title + supporting line — the first block inside every auth card. */
export interface AuthHeadingProps {
  title: ReactNode;
  sub?: ReactNode;
}

export const AuthHeading = ({ title, sub }: AuthHeadingProps) => (
  <div>
    <h2 className="!m-0 font-display !text-[26px] font-bold !tracking-[-0.02em] !leading-[normal] text-balance text-fg1">
      {title}
    </h2>
    {sub != null && (
      <div className="mt-1.5 text-sm leading-normal text-pretty text-fg2">{sub}</div>
    )}
  </div>
);

AuthHeading.displayName = 'AuthHeading';
