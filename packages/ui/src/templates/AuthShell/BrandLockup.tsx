import { TomatoMark } from '../../atoms/TomatoMark';

/** Mark + wordmark, linking out of the auth flow. Wordmark colors are theme-aware tokens. */
export const BrandLockup = ({ href = '#' }: { href?: string }) => (
  <a href={href} className="mb-6 inline-flex items-center gap-2.5 text-inherit !no-underline">
    <TomatoMark size={28} />
    <span className="font-display text-[19px] font-extrabold tracking-[-0.02em]">
      <span className="text-wordmark-open">open</span>{' '}
      <span className="text-wordmark-tomato">tomato</span>
    </span>
  </a>
);

BrandLockup.displayName = 'BrandLockup';
