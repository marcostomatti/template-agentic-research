import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';

import { Droppable, DroppableInline, DroppableRegion } from './Droppable';
import { fmtBytes } from './useDroppable';

/** Avatar stand-in. */
const AvatarCircle = () => (
  <span className="flex size-[72px] items-center justify-center rounded-full bg-primary font-display text-xl font-bold text-on-primary">
    RB
  </span>
);

/** 14px stroked file glyph matching the attachment tiles. */
const FileGlyph = ({ size = 15 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);

const meta = {
  title: 'Atoms/Droppable',
  component: Droppable,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    feedback: { control: 'select', options: ['zone', 'inline', 'region'] },
  },
} satisfies Meta<typeof Droppable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** zone — the standing dashed target. */
export const Zone: Story = {
  args: {
    feedback: 'zone',
    icon: <FileGlyph size={22} />,
    label: 'Drop a context file',
    hint: '.md or .txt · up to 1 MB',
    accept: { ext: ['.md', '.txt'], maxSize: 1048576, multiple: false },
  },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
};

/** compact zone — the FileDrop control's empty state. */
export const ZoneCompact: Story = {
  args: {
    feedback: 'zone',
    compact: true,
    icon: <FileGlyph size={18} />,
    label: 'Drop a context file',
    hint: '.md or .txt · up to 1 MB',
    accept: { ext: ['.md', '.txt'], maxSize: 1048576, multiple: false },
  },
  decorators: Zone.decorators,
};

/** inline — invisible until a drag hovers; wraps an avatar for replace. */
const InlineDemo = () => {
  const [img, setImg] = useState<{ name: string; url: string } | null>(null);
  return (
    <div className="flex flex-col items-center gap-3">
      <DroppableInline
        accept={{ mime: ['image/*'], maxSize: 4 * 1048576, multiple: false }}
        onDrop={(files) => {
          const f = files[0];
          if (f) setImg({ name: f.name, url: URL.createObjectURL(f) });
        }}
      >
        {img
          ? (
            <img
              src={img.url}
              alt=""
              className="block size-[72px] object-cover"
            />
          )
          : (
            <AvatarCircle />
          )}
      </DroppableInline>
      <div className="text-center text-xs leading-snug text-fg3">
        {img
          ? (
            <span className="font-mono font-semibold text-fg1">
              {img.name}
            </span>
          )
          : (
            'agent avatar'
          )}
        <br />
        drag an image on, or click
      </div>
    </div>
  );
};

export const Inline: Story = { render: () => <InlineDemo /> };

/** region — Google-Drive style overlay over a composer's attachments. */
const RegionDemo = () => {
  const [files, setFiles] = useState([
    { name: 'spec.md', size: 4200 },
    { name: 'trace.log', size: 18800 },
  ]);
  return (
    <div className="w-[560px]">
      <DroppableRegion
        minHeight={150}
        label="Drop files to attach to this session"
        hint="Any file · up to 8"
        accept={{ maxCount: 8 }}
        onDrop={(dropped) => setFiles((f) => [
          ...f,
          ...dropped.map((d) => ({ name: d.name, size: d.size })),
        ])
        }
      >
        <div className="min-h-[150px] rounded-lg border border-border-soft bg-surface-1 p-3.5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-fg3">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </span>
            <span className="text-[13px] font-semibold text-fg1">
              Attachments
            </span>
            <span className="font-mono text-[11.5px] text-fg3">
              {files.length} file{files.length !== 1
                ? 's'
                : ''}
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md border border-border-soft bg-surface-sunk px-2.5 py-2"
              >
                <span className="shrink-0 text-accent">
                  <FileGlyph />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-fg1">
                    {f.name}
                  </span>
                  <span className="block font-mono text-[10.5px] text-fg3">
                    {fmtBytes(f.size)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </DroppableRegion>
    </div>
  );
};

export const Region: Story = { render: () => <RegionDemo /> };
