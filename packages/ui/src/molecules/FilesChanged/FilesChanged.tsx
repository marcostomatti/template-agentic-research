import type { IconName } from 'lucide-react/dynamic';

import { forwardRef, type HTMLAttributes } from 'react';

import { Icon } from '../../atoms';
import { formatNumber } from '../../lib';
import { SectionCard } from '../SectionCard';

import {
  filesChangedDelta,
  filesChangedPath,
  filesChangedSummary,
} from './FilesChanged.variants';

export interface FileChange {
  /** File path (mono, truncates from the middle of the card). */
  path: string;
  /** Lines added (`+n`, green). */
  additions: number;
  /** Lines removed (`-n`, red). */
  deletions: number;
  /** File-type icon override; inferred from the extension otherwise. */
  icon?: IconName;
}

export interface FilesChangedProps
  extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  files: FileChange[];
  /** Card title (defaults to "Files changed"). */
  title?: string;
  locale?: string;
}

/** Extension → lucide file-type glyph (data-driven via the 03a Icon). */
const EXTENSION_ICONS: Record<string, IconName> = {
  ts: 'file-code',
  tsx: 'file-code',
  js: 'file-code',
  jsx: 'file-code',
  mjs: 'file-code',
  py: 'file-code',
  go: 'file-code',
  rs: 'file-code',
  css: 'file-code',
  scss: 'file-code',
  html: 'file-code',
  json: 'file-json',
  md: 'file-text',
  txt: 'file-text',
  png: 'file-image',
  jpg: 'file-image',
  jpeg: 'file-image',
  gif: 'file-image',
  svg: 'file-image',
  webp: 'file-image',
  sh: 'file-terminal',
  zsh: 'file-terminal',
  yml: 'file-cog',
  yaml: 'file-cog',
  toml: 'file-cog',
  lock: 'file-lock',
};

const iconFor = (file: FileChange): IconName => {
  if (file.icon != null) return file.icon;
  const extension = file.path
    .split('.')
    .pop()
    ?.toLowerCase() ?? '';
  return EXTENSION_ICONS[extension] ?? 'file';
};

/**
 * FilesChanged — the "files touched" card (session view, PR summaries).
 * Spec: "FilesChanged" (no design artboard):
 * header carries the file count + total additions (green) and deletions
 * (red); each row shows a file-type icon, the path, and `+n` / `-n`.
 *
 * Interpretation decision: zero deltas render dimmed (`+0`/`-0` at half
 * opacity) so the columns stay scannable without shouting zeros.
 */
export const FilesChanged = forwardRef<HTMLElement, FilesChangedProps>(
  ({ className, files, title = 'Files changed', locale, ...props }, ref) => {
    const additions = files.reduce((acc, f) => acc + f.additions, 0);
    const deletions = files.reduce((acc, f) => acc + f.deletions, 0);
    const format = (value: number): string => formatNumber(value, { locale });
    return (
      <SectionCard
        ref={ref}
        title={title}
        className={className}
        padded={false}
        action={
          <div className="flex items-baseline gap-3">
            <span className={filesChangedSummary()}>
              {files.length === 1
                ? '1 file'
                : `${format(files.length)} files`}
            </span>
            <span className={filesChangedSummary({ kind: 'additions' })}>
              {`+${format(additions)}`}
            </span>
            <span className={filesChangedSummary({ kind: 'deletions' })}>
              {`-${format(deletions)}`}
            </span>
          </div>
        }
        {...props}
      >
        <ul className="divide-y divide-border-soft">
          {files.map((file) => (
            <li
              key={file.path}
              className="flex items-center gap-2.5 px-[18px] py-2"
            >
              <Icon name={iconFor(file)} size={14} className="shrink-0 text-fg3" />
              <span className={filesChangedPath()} title={file.path}>
                {file.path}
              </span>
              <span
                className={filesChangedDelta({
                  kind: 'additions',
                  zero: file.additions === 0,
                })}
              >
                {`+${format(file.additions)}`}
              </span>
              <span
                className={filesChangedDelta({
                  kind: 'deletions',
                  zero: file.deletions === 0,
                })}
              >
                {`-${format(file.deletions)}`}
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>
    );
  },
);

FilesChanged.displayName = 'FilesChanged';
