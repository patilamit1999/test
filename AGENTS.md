# Project information

- This is a standalone Vite and Three.js web experience using vanilla JavaScript and CSS.
- All first-party visitor-facing text, accessibility labels, validation messages, song titles, and scene signs must be Marathi. Keep HTML lang="mr", use Devanagari fonts, and format visible numbers with mr-IN. Physical keyboard key names stay Latin; never translate video IDs, URLs, or programmatic selectors.
- The entrance greeting is “गणेश चतुर्थीच्या हार्दिक शुभेच्छा!” from “अंकित, अमित आणि पाटील परिवार”. The 3D banner reads its text from the accessible #entry-greeting element. Canvas labels redraw after the Devanagari font loads.
- Request Marathi controls from YouTube with hl=mr. Third-party video titles, ads, or unavailable translations remain under YouTube’s control.
- Install dependencies with `npm ci`; run locally with `npm run dev`.
- Verify changes with `npm test`, `npm run build`, and `npm run test:e2e`.
- Browser tests use installed Google Chrome. The Playwright config starts the Vite server on port 5173 or reuses a running local server. Install Chrome for CI with `npx playwright install chrome` if needed.
- Browser tests save desktop and mobile screenshots in the ignored `test-results/` directory.
- `src/scene.js` creates the procedural 3D environment and avatar controls. `src/world.js` contains the pure movement, collision, and proximity rules; keep obstacle coordinates aligned with the scene.
- `src/main.js` handles accessible DOM controls and session-only visitor state. Never insert visitor names into HTML; use textContent or canvas text.
- Mobile movement uses the pointer-captured #joystick, not directional buttons. `joystickVector` in `src/world.js` applies a radial dead zone and proportional speed; scene movement clamps combined keyboard/touch input without turning small analog input into full speed.
- Keep joystick and camera touch pointers independent. Reset joystick movement and visuals on release, cancellation, lost capture, focus loss, resize, teleport, leave, and dialogs. `createScene` receives the reset callback so game state and the control stay synchronized.
- Mobile controls must fit both portrait and short landscape viewports, respect safe-area insets, and not overlap the interaction button. Joystick browser tests use Chromium CDP touch events, including a second finger for looking around.
- `src/audio.js` manages a hidden YouTube IFrame API player (audio only) and a three-song Ganpati queue. It supports next/previous, native playlist auto-advance, shuffle, volume, additional YouTube video URLs, and playlist URLs without a backend API key. Songs remain session-only.
- YouTube is contacted only after the visitor presses Play or enters the mandap. The YouTube video is intentionally hidden (audio only); the iframe stays in the DOM for playback. Music auto-plays when the visitor enters the mandap and continues as background audio; it pauses only when the tab is hidden or the visitor leaves the mandap. Handle embedding restrictions and autoplay blocking without claiming playback succeeded.
- Music browser tests mock the YouTube IFrame API for deterministic queue and error coverage; a live check is still needed to verify third-party availability.
- The decoration is a stylized interpretation of the supplied floating-rock setup, not a photographic scan. All 3D geometry is local. Google Fonts have system-font fallbacks; optional music uses YouTube and is subject to ads and regional restrictions.
- This is a single-visitor experience with no backend, authentication, persistence, payments, or physical prasad fulfillment.
