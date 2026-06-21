# SmartSQL Logo System

## Core Mark

Geometry: 64 x 64 SVG viewBox, 16px corner radius, database cylinder drawn with top, side, and middle contour strokes. The hidden S is a continuous rounded SQL path running through the cylinder. The AI cue is a three-ray node constellation at the upper-right edge.

Symbolism: database geometry represents structured data, the hidden S represents SmartSQL and query flow, and the mint node represents AI assistance. The reading order is natural language -> SQL -> insights.

Colors: use Mintlify tokens only. Primary is `--mint-primary` / `#171717`, foreground is `--mint-on-primary` / `#ffffff`, accent is `--mint-green` / `#00d4a4`. Monochrome replaces the mint S with white.

Typography: Inter Semibold, optical weight 650 in static SVGs, tracking -1%.

## Variants

Primary logo: `smartsql-horizontal.svg`
Use on light backgrounds at 141 x 36 or 188 x 48. Clear space equals half the mark width. Minimum width 112px.

Horizontal logo: `smartsql-horizontal.svg`
Use in navbar, footer, auth headers, and email headers. Mark-to-word spacing is 12px. Do not stack.

Icon-only logo: `smartsql-mark.svg`
Use in sidebars, loading states, dense headers, and avatar-like app surfaces. Use 32px in navigation, 36px in dashboard headers, 48px in hero or admin entry screens.

Favicon version: `favicon.svg`
Uses simplified geometry with no AI rays for small-size clarity. Minimum browser size is 16px.

Dark theme version: `smartsql-horizontal-dark.svg`
White wordmark and white mark body with black database strokes. Use on `--mint-surface-code` or dark hero bands.

Light theme version: `smartsql-horizontal.svg`
Black mark and black wordmark. Use on `--mint-canvas`, `--mint-surface`, and cards.

Monochrome version: `smartsql-monochrome.svg`
Use where single-color reproduction is required. It must remain legible in print, PDF, favicons, and maskable icon contexts.

## Integration Map

Navbar: `frontend/app/page.tsx`, component `Navbar`, horizontal logo, 32px mark with wordmark. Reason: public entry brand recall.

Sidebar expanded: `frontend/components/Sidebar.tsx`, component `Sidebar`, icon plus wordmark, 32px mark. Reason: persistent app identity in docs-style navigation.

Sidebar collapsed: `frontend/components/Sidebar.tsx`, component `Sidebar`, icon-only, 32px. Reason: dense navigation without losing brand.

Login page: `frontend/app/login/page.tsx`, component `LoginPage`, horizontal logo, 32px. Reason: trusted auth entry.

Register page: `frontend/app/register/page.tsx`, component `RegisterPage`, horizontal logo, 32px. Reason: account creation brand continuity.

Forgot password page: `frontend/app/forgot-password/page.tsx`, component `ForgotPasswordPage`, horizontal logo, 32px. Reason: support flow consistency.

Reset password page: `frontend/app/reset-password/page.tsx`, component `ResetPasswordPage`, horizontal logo, 32px. Reason: support flow consistency.

Auth callback page: `frontend/app/auth/callback/page.tsx`, component `AuthCallbackPage`, horizontal logo in header and icon-only loading mark at 28px. Reason: OAuth transition trust.

Dashboard header: `frontend/app/(app)/dashboard/page.tsx`, component `DashboardPage`, icon-only at 36px. Reason: reinforce identity on first authenticated screen.

Loading screens: `frontend/app/(app)/layout.tsx`, `frontend/app/auth/callback/page.tsx`, `frontend/app/verify-email/page.tsx`, `frontend/app/verify-email-warning/page.tsx`, icon-only at 28-36px. Reason: branded waiting states.

Favicon: `frontend/app/layout.tsx`, metadata icons, `favicon.svg`. Reason: browser tab and bookmark identity.

Manifest icons: `frontend/public/manifest.webmanifest`, `favicon.svg` and `apple-touch-icon.svg`. Reason: installable app surfaces.

Open Graph image: `frontend/app/layout.tsx`, metadata image, `og-smartsql.svg` at 1200 x 630. Reason: link previews.

Email templates: `backend/src/services/email.service.ts`, `getEmailShell`, horizontal logo at 141 x 36. Reason: transactional email trust and recognition.

Admin: `frontend/app/moderator/page.tsx`, `frontend/app/moderator/login/page.tsx`, `frontend/app/moderator/dashboard/page.tsx`, dark or icon variants. Reason: separate moderator surface still belongs to SmartSQL.
