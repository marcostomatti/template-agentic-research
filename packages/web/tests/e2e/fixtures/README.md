# e2e fixtures

- `devtools-feedback-screenshot.png` — an 8x8 opaque RGBA PNG (75 bytes) dropped
  onto the dev-tools feedback drawer's drop zone in
  `tests/e2e/dev-tools-feedback.spec.ts`. Screenshot capture itself cannot be
  driven under automation (a display-media prompt cannot be accepted), so the
  drop zone is exercised with this file instead. Produced by running, from this
  directory:

  ```sh
  python3 -c "
  import zlib,struct
  w=h=8
  raw=b''.join(b'\x00'+bytes([0x4f,0x7a,0xff,0xff]*w) for _ in range(h))
  def chunk(t,d):
      return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
  png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
  open('devtools-feedback-screenshot.png','wb').write(png)
  "
  ```
- `dev-tools-harness.html`, `dev-tools-harness.tsx` — the forced dev-tools
  Playwright project's entry page and mount.
