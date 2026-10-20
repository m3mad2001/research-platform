# Engineering Nexus · design and release notes

**Identity:** Integrated Engineering Research Platform  
**Slogan:** From Silicon to Intelligent Healthcare  
**Journey:** Learn · Design · Build · Experiment · Analyze · Impact

## Brand system

The SVG mark combines a connected integrated circuit and a sensing waveform. The same mark is used in navigation and as the SVG and ICO favicon. Hero and card artwork lives under `public/healthtwin/` (an internal legacy asset path); the imagery contains no interface text. Keep text in HTML for accessibility and translation.

| Token | Value | Usage |
| --- | --- | --- |
| Midnight | `#061726` | Page background |
| Navy | `#071A2B` | Panels and navigation |
| Deep blue | `#123A59` | Depth and muted highlights |
| Cyan | `#35D8ED` | Actions, focus, engineering links |
| Violet | `#7161ED` | AI and research accent |
| Pink | `#FF789E` | Physiological accent and errors |

Typography uses the existing Geist font with headings at approximately 30–92px by context; body text 14–17px and labels at 11–13px. Spacing uses 4px increments, with common gaps at 8, 16, 24 and 32px. Form, feature, navigation and status styles share CSS in `src/app/healthtwin.css`. Interactive elements retain visible focus outlines and reduced motion is respected.

The five research pillars are **IC Design → Sensing Systems → Data & AI → Healthcare Digital Twin → Real-World Impact**. Their inline SVG icons have consistent dimensions and stroke. On narrow screens the pillar strip becomes a two-column grid, with the final item spanning both columns.

## Screens and data boundaries

| Screen | Visual direction | Existing integration |
| --- | --- | --- |
| Home | Scientific journey, pillars, module discovery | Login links lead into existing approval flow |
| Registration | Cinematic visual with real account form | Existing Supabase signup and public visits counter |
| Login | Matching imagery and clear access message | Existing password authentication, profile checks and redirect |
| Review | Submitted and pending account state | Existing request result; no promised review date or email |
| Researcher dashboard | Research hero, accessible resource navigation, permission-gated cards | Existing profile, visits, counts and granted resources |
| Courses and SILO | Branded headers and topic imagery | Existing editor roles, SQL policies and content |
| Administration | Branded research command center | Existing approvals, account management, charts and reports |

Resource imagery is illustrative. The visible content, access rules, counters and administrative reports continue to use existing backend values. No new data, account state or authentication provider is invented.

## Responsive guidance

- Desktop: hero landscape, 3-column resource cards, full sidebar on wide dashboards.
- Tablet: two-column resource grid and condensed navigation.
- Mobile (under 768px): stacked cards, two-column pillar grid, scrollable navigation for existing routes, stacked login and registration artwork and form.
- No decorative text is embedded into hero images; form inputs use solid dark backgrounds.

## Release and verification

1. Back up your existing local `.env.local` and `.vercel` link before replacing project files. This package excludes both. Keep the current Supabase values and Vercel project connection.
2. Extract this project over your local source; do not replace your private configuration or existing Supabase database.
3. In your project folder run `npm ci`, then `npm run build`. Run `npm run lint` to check code style.
4. Check registration, pending accounts, active researcher resources, disabled resources, instructor and SILO permissions, administrator approvals, reports and actual visit metrics against your own Supabase instance.
5. From PowerShell run `npx.cmd vercel --prod` and verify the existing production alias after deployment.

No SQL migration is needed for this visual redesign. The old files and permissions must remain in Supabase; local build success alone does not establish the health of an external Supabase deployment.
