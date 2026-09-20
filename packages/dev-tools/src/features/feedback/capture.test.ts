import { afterEach, describe, expect, it } from 'vitest';

import { captureScreen, FEEDBACK_CAPTURE_MIME } from './capture';

/**
 * ## Why every element in these cases is a stand-in
 *
 * jsdom cannot do either half of this module's job, measured under
 * this package's own jsdom project: `navigator.mediaDevices` is
 * `undefined`, and `canvas.getContext('2d')` answers `null` while
 * printing `Not implemented: HTMLCanvasElement's getContext() method:
 * without installing the canvas npm package`. A `<video>` it builds
 * accepts an assignment to `srcObject` and decodes nothing.
 *
 * So the cases below install three things and nothing more: a
 * `mediaDevices` that answers the prompt the way one case is about, a
 * `<video>` that reports what one case says it saw, and a `<canvas>`
 * that records what was drawn on it. Everything between them — which
 * events are listened to, when playback starts, how the canvas is
 * sized, what is asked of `toBlob`, when the tracks are stopped — is
 * the module's own, and is what each assertion reads.
 *
 * The absent-API case is the one that needs no stub at all, because
 * jsdom's default IS the refusal. It is written with the absence
 * asserted rather than assumed, and the accepting cases below are its
 * control: they reach a PNG through the same function, so a `null`
 * there would not be this module answering `null` for everything.
 *
 * ## Why nothing here waits on a timer
 *
 * Every event a case needs is fired from inside the fake's `play()`,
 * which the module calls synchronously after attaching its listeners.
 * A case therefore drives the whole capture with one `await` on the
 * returned promise and never races it — there is no `setTimeout`, no
 * fake clock and no polling anywhere in this file.
 *
 * ## `null` is the assertion, and the absence of a throw is too
 *
 * Spec decision 3: a refused capture answers `null` and the report
 * goes without. Each refusal case awaits `captureScreen()` directly
 * rather than through `rejects`/`toThrow`, so a module that threw
 * would red the case it was written for rather than pass it.
 */

/** Undo functions for whatever the current case installed. */
const restorers: (() => void)[] = [];

/** The four bytes every PNG starts with, enough to prove bytes. */
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

/**
 * Replace one property for the duration of one case.
 *
 * Same shape as `./context.test.ts`'s: the descriptor is put back, and
 * a property that was not an own property to begin with —
 * `navigator.mediaDevices`, `document.createElement` — is deleted so
 * the prototype's own answer comes back.
 *
 * @param target - The object carrying it.
 * @param key - The property name.
 * @param value - What it should answer while the case runs.
 */
function stubGlobal(target: object, key: string, value: unknown): void {
  const previous = Object.getOwnPropertyDescriptor(target, key);

  Object.defineProperty(target, key, {
    configurable: true,
    writable: true,
    value,
  });

  restorers.push(() => {
    if (previous === undefined) {
      Reflect.deleteProperty(target, key);

      return;
    }

    Object.defineProperty(target, key, previous);
  });
}

/** A stand-in for one track of a granted stream. */
interface FakeTrack {
  /** `video` or `audio`; only a video track can give a frame. */
  readonly kind: string;

  /** `live` until the user, or the case, ends it. */
  readyState: MediaStreamTrackState;

  /** How many times the module stopped this track. */
  stopCount: number;

  /** Listeners attached right now, to prove they come off again. */
  listenerCount: number;

  /** Fire the track's own `ended`, as "Stop sharing" does. */
  end: () => void;

  /** Stop, as the module does on its way out. */
  stop: () => void;

  /** @param type - The event name. @param listener - The handler. */
  addEventListener: (type: string, listener: EventListener) => void;

  /** @param type - The event name. @param listener - The handler. */
  removeEventListener: (type: string, listener: EventListener) => void;
}

/**
 * Build one track.
 *
 * @param kind - `video` by default, `audio` for the cases about a
 * grant that carries no frame.
 * @returns The track, live.
 */
function createTrack(kind = 'video'): FakeTrack {
  const target = new EventTarget();

  const track: FakeTrack = {
    kind,
    readyState: 'live',
    stopCount: 0,
    listenerCount: 0,
    end: () => {
      track.readyState = 'ended';
      target.dispatchEvent(new Event('ended'));
    },
    stop: () => {
      track.stopCount += 1;
      track.readyState = 'ended';
    },
    addEventListener: (type, listener) => {
      track.listenerCount += 1;
      target.addEventListener(type, listener);
    },
    removeEventListener: (type, listener) => {
      track.listenerCount -= 1;
      target.removeEventListener(type, listener);
    },
  };

  return track;
}

/**
 * Build the stream a granted prompt answers.
 *
 * @param tracks - Its tracks, in the order the browser lists them.
 * @returns The stream, cast at this one boundary because jsdom has no
 * `MediaStream` constructor at all (`typeof MediaStream` is
 * `'undefined'`, measured).
 */
function createStream(tracks: readonly FakeTrack[]): MediaStream {
  return {
    getTracks: () => tracks,
    getVideoTracks: () => tracks.filter((track) => track.kind === 'video'),
  } as unknown as MediaStream;
}

/** One `drawImage` call, as the fake canvas recorded it. */
interface DrawnFrame {
  /** What was drawn; the element the module attached the stream to. */
  readonly source: unknown;

  /** Destination x, y, width and height. */
  readonly box: readonly [number, number, number, number];
}

/** A stand-in for the detached `<video>` the module builds. */
interface FakeVideo {
  /** The frame's own pixel width; `0` until a case says otherwise. */
  videoWidth: number;

  /** The frame's own pixel height. */
  videoHeight: number;

  /** Set by the module, and checked: autoplay depends on it. */
  muted: boolean;

  /** Set by the module, and checked: iOS depends on it. */
  playsInline: boolean;

  /** What is attached now. */
  srcObject: MediaStream | null;

  /** Every value assigned to {@link FakeVideo.srcObject}, in order. */
  readonly attached: readonly (MediaStream | null)[];

  /** Listeners attached right now. */
  listenerCount: number;

  /** Fire one event at the module's listeners. */
  emit: (type: string) => void;

  /** What the module calls to start decoding. */
  play: () => Promise<void>;

  /** @param type - The event name. @param listener - The handler. */
  addEventListener: (type: string, listener: EventListener) => void;

  /** @param type - The event name. @param listener - The handler. */
  removeEventListener: (type: string, listener: EventListener) => void;
}

/**
 * What one case's element does when the module plays it.
 *
 * Called synchronously from `play()`, after the module has attached
 * every listener, which is what makes these cases deterministic.
 */
type PlayBehaviour = (video: FakeVideo) => Promise<void>;

/**
 * A behaviour that reports a frame of the given size.
 *
 * @param width - The frame's pixel width.
 * @param height - The frame's pixel height.
 * @returns The behaviour.
 */
function deliversFrame(width: number, height: number): PlayBehaviour {
  return (video) => {
    video.videoWidth = width;
    video.videoHeight = height;
    video.emit('loadeddata');

    return Promise.resolve();
  };
}

/**
 * A behaviour that fires one event instead of a frame.
 *
 * @param type - `error` or `ended`.
 * @returns The behaviour.
 */
function fires(type: string): PlayBehaviour {
  return (video) => {
    video.emit(type);

    return Promise.resolve();
  };
}

/**
 * Build the element the module will draw from.
 *
 * @param behaviour - What it does when played.
 * @returns The element.
 */
function createVideo(behaviour: PlayBehaviour): FakeVideo {
  const target = new EventTarget();
  const attached: (MediaStream | null)[] = [];
  let current: MediaStream | null = null;

  const video: FakeVideo = {
    videoWidth: 0,
    videoHeight: 0,
    muted: false,
    playsInline: false,
    attached,
    listenerCount: 0,

    get srcObject(): MediaStream | null {
      return current;
    },

    set srcObject(value: MediaStream | null) {
      current = value;
      attached.push(value);
    },

    emit: (type) => {
      target.dispatchEvent(new Event(type));
    },
    play: () => behaviour(video),
    addEventListener: (type, listener) => {
      video.listenerCount += 1;
      target.addEventListener(type, listener);
    },
    removeEventListener: (type, listener) => {
      video.listenerCount -= 1;
      target.removeEventListener(type, listener);
    },
  };

  return video;
}

/** A stand-in for the detached `<canvas>` the module draws onto. */
interface FakeCanvas {
  /** Sized by the module from the frame. */
  width: number;

  /** Sized by the module from the frame. */
  height: number;

  /** Every `drawImage` call, in order. */
  readonly drawn: readonly DrawnFrame[];

  /** Every MIME type `toBlob` was asked for, in order. */
  readonly encoded: readonly (string | undefined)[];

  /** @param kind - The context id. @returns The context, or `null`. */
  getContext: (kind: string) => unknown;

  /** @param callback - Where the blob goes. @param type - The MIME. */
  toBlob: (callback: BlobCallback, type?: string) => void;
}

/** What one case needs its canvas to be unable to do. */
interface CanvasOptions {
  /** `false` for the browser that answers no 2D context. */
  readonly hasContext?: boolean;

  /** `false` for the browser whose `toBlob` hands back `null`. */
  readonly encodes?: boolean;
}

/**
 * Build the canvas the module will draw onto.
 *
 * @param options - Which of its two jobs this case denies it.
 * @returns The canvas.
 */
function createCanvas(options: CanvasOptions = {}): FakeCanvas {
  const drawn: DrawnFrame[] = [];
  const encoded: (string | undefined)[] = [];

  const context = {
    drawImage: (
      source: unknown,
      x: number,
      y: number,
      width: number,
      height: number,
    ) => {
      drawn.push({ source, box: [x, y, width, height] });
    },
  };

  return {
    width: 0,
    height: 0,
    drawn,
    encoded,
    getContext: (): unknown => (options.hasContext === false
      ? null
      : context),
    toBlob: (callback, type) => {
      encoded.push(type);
      callback(options.encodes === false
        ? null
        : new Blob([PNG_SIGNATURE], { type: type ?? '' }));
    },
  };
}

/** The stand-ins one case has for `document.createElement`. */
interface ElementStubs {
  /** Answered for `video`. */
  readonly video?: FakeVideo;

  /** Answered for `canvas`. */
  readonly canvas?: FakeCanvas;
}

/**
 * Hand the module stand-in elements, and record what it asked for.
 *
 * A tag with no stand-in falls through to jsdom, so nothing else in
 * the document changes while a case runs.
 *
 * @param stubs - What to answer for `video` and `canvas`.
 * @returns The tags asked for, in order, as the case runs.
 */
function stubCreateElement(stubs: ElementStubs): string[] {
  const asked: string[] = [];
  const original = document.createElement.bind(document);

  stubGlobal(document, 'createElement', (tag: string) => {
    asked.push(tag);

    if (tag === 'video' && stubs.video !== undefined) {
      return stubs.video;
    }

    if (tag === 'canvas' && stubs.canvas !== undefined) {
      return stubs.canvas;
    }

    return original(tag);
  });

  return asked;
}

/**
 * Install a `mediaDevices` whose prompt answers one way.
 *
 * @param answer - What `getDisplayMedia` does when asked.
 * @returns The options it was asked with, one entry per call.
 */
function stubDisplayMedia(answer: () => Promise<MediaStream>): unknown[] {
  const asked: unknown[] = [];

  stubGlobal(navigator, 'mediaDevices', {
    getDisplayMedia: (options: unknown) => {
      asked.push(options);

      return answer();
    },
  });

  return asked;
}

/**
 * Install a prompt that grants a stream of the given tracks.
 *
 * @param tracks - What the grant carries.
 * @returns The stream, so a case can pin what was attached and
 * stopped.
 */
function grant(tracks: readonly FakeTrack[]): MediaStream {
  const stream = createStream(tracks);

  stubDisplayMedia(() => Promise.resolve(stream));

  return stream;
}

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.();
  }
});

describe('what captureScreen refuses', () => {
  it('answers null when the browser has no media devices at all', async () => {
    // Arrange: jsdom's own default, asserted rather than assumed —
    // and the shape a page served over plain HTTP gets.
    expect(navigator.mediaDevices).toBeUndefined();

    // Act
    const captured = await captureScreen();

    // Assert
    expect(captured).toBeNull();
  });

  it('answers null when the devices cannot capture a display', async () => {
    // Arrange: Safari on iOS — the media API is there, this one
    // method is not.
    stubGlobal(navigator, 'mediaDevices', {});

    // Act
    const captured = await captureScreen();

    // Assert
    expect(captured).toBeNull();
  });

  it('answers null when the dialog is cancelled', async () => {
    // Arrange: what Chromium throws when the picker is dismissed.
    const asked = stubDisplayMedia(
      () => Promise.reject(new Error('NotAllowedError: Permission denied')),
    );
    const built = stubCreateElement({});

    // Act
    const captured = await captureScreen();

    // Assert: refused, and nothing was built to draw on.
    expect(captured).toBeNull();
    expect(asked).toHaveLength(1);
    expect(built).toEqual([]);
  });

  it('answers null when the grant carries no video track', async () => {
    // Arrange: a browser that honoured `audio` and nothing else.
    const audio = createTrack('audio');
    const built = stubCreateElement({});

    grant([audio]);

    // Act
    const captured = await captureScreen();

    // Assert: still stopped, so the page is not left recording.
    expect(captured).toBeNull();
    expect(built).toEqual([]);
    expect(audio.stopCount).toBe(1);
  });

  it('answers null when the track has already ended', async () => {
    // Arrange: the gap between the grant and the first draw, which a
    // fast "Stop sharing" lands in.
    const track = createTrack();
    const built = stubCreateElement({});

    track.readyState = 'ended';
    grant([track]);

    // Act
    const captured = await captureScreen();

    // Assert
    expect(captured).toBeNull();
    expect(built).toEqual([]);
    expect(track.stopCount).toBe(1);
  });

  it('answers null when the track ends before a frame arrives', async () => {
    // Arrange: the element is played, decodes nothing, and the user
    // stops sharing while it spins up.
    const track = createTrack();
    const video = createVideo((): Promise<void> => {
      track.end();

      return Promise.resolve();
    });

    grant([track]);
    stubCreateElement({ video });

    // Act
    const captured = await captureScreen();

    // Assert: refused, stopped, and nothing left listening or
    // attached.
    expect(captured).toBeNull();
    expect(track.stopCount).toBe(1);
    expect(track.listenerCount).toBe(0);
    expect(video.listenerCount).toBe(0);
    expect(video.attached.at(-1)).toBeNull();
  });

  it('answers null when the element ends before a frame arrives', async () => {
    // Arrange: the same stop, seen by the element rather than by the
    // track — either can be the first to say so.
    const track = createTrack();
    const video = createVideo(fires('ended'));

    grant([track]);
    stubCreateElement({ video });

    // Act
    const captured = await captureScreen();

    // Assert
    expect(captured).toBeNull();
    expect(track.stopCount).toBe(1);
  });

  it('answers null when the element cannot play the stream', async () => {
    // Arrange
    const track = createTrack();
    const video = createVideo(
      () => Promise.reject(new Error('NotSupportedError: no decoder')),
    );

    grant([track]);
    stubCreateElement({ video });

    // Act
    const captured = await captureScreen();

    // Assert
    expect(captured).toBeNull();
    expect(track.stopCount).toBe(1);
    expect(video.listenerCount).toBe(0);
  });

  it('answers null when playing throws instead of rejecting', async () => {
    // Arrange: a browser that reports the same failure the other way
    // round, which the module must not let out.
    const track = createTrack();
    const video = createVideo((): Promise<void> => {
      throw new Error('devtools-test: play threw');
    });

    grant([track]);
    stubCreateElement({ video });

    // Act
    const captured = await captureScreen();

    // Assert
    expect(captured).toBeNull();
    expect(track.stopCount).toBe(1);
  });

  it('answers null when the element fires an error', async () => {
    // Arrange
    const track = createTrack();
    const video = createVideo(fires('error'));

    grant([track]);
    stubCreateElement({ video });

    // Act
    const captured = await captureScreen();

    // Assert
    expect(captured).toBeNull();
    expect(track.stopCount).toBe(1);
  });

  it('answers null when the frame has no dimensions', async () => {
    // Arrange: a frame arrived and measures nothing, which is a
    // canvas of zero pixels rather than a screenshot.
    const track = createTrack();
    const video = createVideo(deliversFrame(0, 0));
    const built = stubCreateElement({ video });

    grant([track]);

    // Act
    const captured = await captureScreen();

    // Assert: no canvas was built at all.
    expect(captured).toBeNull();
    expect(built).toEqual(['video']);
    expect(track.stopCount).toBe(1);
  });

  it('answers null when the canvas has no 2D context', async () => {
    // Arrange: jsdom's own real answer without the `canvas` package,
    // and a browser that has exhausted its contexts.
    const track = createTrack();
    const video = createVideo(deliversFrame(800, 600));
    const canvas = createCanvas({ hasContext: false });

    grant([track]);
    stubCreateElement({ video, canvas });

    // Act
    const captured = await captureScreen();

    // Assert
    expect(captured).toBeNull();
    expect(canvas.drawn).toEqual([]);
    expect(track.stopCount).toBe(1);
  });

  it('answers null when the canvas cannot encode the frame', async () => {
    // Arrange: `toBlob` hands back `null` where the encoder failed.
    const track = createTrack();
    const video = createVideo(deliversFrame(800, 600));
    const canvas = createCanvas({ encodes: false });

    grant([track]);
    stubCreateElement({ video, canvas });

    // Act
    const captured = await captureScreen();

    // Assert: it was drawn, and there is still no screenshot.
    expect(captured).toBeNull();
    expect(canvas.drawn).toHaveLength(1);
    expect(track.stopCount).toBe(1);
  });
});

describe('what captureScreen captures', () => {
  it('answers the first frame as a PNG sized to that frame', async () => {
    // Arrange
    const track = createTrack();
    const video = createVideo(deliversFrame(1280, 800));
    const canvas = createCanvas();
    const built = stubCreateElement({ video, canvas });

    grant([track]);

    // Act
    const captured = await captureScreen();

    // Assert
    expect(captured).toBeInstanceOf(Blob);
    expect(captured?.type).toBe('image/png');
    expect(captured?.size).toBe(PNG_SIGNATURE.byteLength);
    expect(built).toEqual(['video', 'canvas']);
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(800);
    expect(canvas.encoded).toEqual(['image/png']);
    expect(FEEDBACK_CAPTURE_MIME).toBe('image/png');
  });

  it('draws the element it attached the stream to, once, whole', async () => {
    // Arrange
    const track = createTrack();
    const video = createVideo(deliversFrame(640, 480));
    const canvas = createCanvas();

    const stream = grant([track]);

    stubCreateElement({ video, canvas });

    // Act
    await captureScreen();

    // Assert: one frame, the granted stream's element, no crop and no
    // scale.
    expect(canvas.drawn).toEqual([
      { source: video, box: [0, 0, 640, 480] },
    ]);
    expect(video.attached[0]).toBe(stream);
  });

  it('asks the prompt for the current tab, video only', async () => {
    // Arrange
    const track = createTrack();
    const video = createVideo(deliversFrame(800, 600));
    const stream = createStream([track]);
    const asked = stubDisplayMedia(() => Promise.resolve(stream));

    stubCreateElement({ video, canvas: createCanvas() });

    // Act
    await captureScreen();

    // Assert: audio is refused explicitly, and the tab preference is
    // the key spec decision 3 names.
    expect(asked).toEqual([
      { video: true, audio: false, preferCurrentTab: true },
    ]);
  });

  it('stops every track of the stream it captured', async () => {
    // Arrange: a grant that carried audio anyway, which a browser is
    // free to do.
    const video = createTrack();
    const audio = createTrack('audio');
    const second = createTrack();
    const element = createVideo(deliversFrame(800, 600));

    grant([video, audio, second]);
    stubCreateElement({ video: element, canvas: createCanvas() });

    // Act
    const captured = await captureScreen();

    // Assert: all three, once each, on the successful path.
    expect(captured).not.toBeNull();
    expect(video.stopCount).toBe(1);
    expect(audio.stopCount).toBe(1);
    expect(second.stopCount).toBe(1);
    expect(video.readyState).toBe('ended');
  });

  it('leaves nothing attached or listening once it has the frame', async () => {
    // Arrange
    const track = createTrack();
    const video = createVideo(deliversFrame(800, 600));

    grant([track]);
    stubCreateElement({ video, canvas: createCanvas() });

    // Act
    const captured = await captureScreen();

    // Assert: muted and inline are what let it play at all; the
    // detach and the removed listeners are what let it be collected.
    expect(captured).not.toBeNull();
    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video.attached).toHaveLength(2);
    expect(video.attached.at(-1)).toBeNull();
    expect(video.listenerCount).toBe(0);
    expect(track.listenerCount).toBe(0);
  });
});
