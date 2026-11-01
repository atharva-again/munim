# Project Guidance

## UI Text

- Use Title Case for visible UI titles and action labels, including page, section, card, and dialog headings, navigation labels, and button text. Capitalize major words, keeping short articles and prepositions lowercase unless they begin or end the title. For example, write “Good Afternoon” and “Record Transaction.”
- Keep explanatory and helper copy in sentence case.
- English and Hindi are the only app languages. The selected language applies to navigation, controls, helper text, errors, and dates through the shared translation layer. Keep original transaction descriptions, names, and spoken messages unchanged. Hindi-English code-switching is supported speech, not a third language option.
- Record presentation follows the app language through separate English/Hindi display copies: translate descriptions and transliterate proper names. Never rewrite source fields, transcripts or spoken replies when the app language changes. Keep original record text available in Details.

## Interaction Affordances

- Enabled clickable controls and links must use `cursor: pointer`.
- Disabled controls must use a disabled cursor and must not look interactive.

## Styling and Typography

- Use Tailwind CSS v4 utilities for all component styling and layouts. Keep shared utility strings in `apps/web/src/ui.tsx` when multiple components need them.
- `apps/web/src/tailwind.css` is the single Tailwind entry point. Limit it to the Tailwind import, custom variants, theme tokens, and the self-hosted font declaration. Do not add raw component selectors, CSS modules, separate stylesheets, or inline style objects.
- Use complete, statically detectable utility classes. Do not construct class names from fragments.
- Use the self-hosted Geist sans font with regular weight throughout. Do not introduce serif fonts, bold headings, or synthetic bold emphasis.
- Keep the browser title exactly `munim`.

## Color and Status

- Use pure black and white as the interface colors. Derive neutral borders, muted text, hover fills, and selected navigation backgrounds from those colors.
- Reserve blue, red, yellow, and green for meaningful status dots and important details. Keep navigation, primary buttons, hover states, and focus outlines monochrome.
- Voice call controls are a semantic exception: End uses a solid red background, Pause yellow, and Resume green. Keep their labels and icons black for contrast in both themes.
- Use the existing semantic Tailwind tokens: `status-blue` (`#0787F5`), `status-red` (`#EF4444`), `status-yellow` (`#EAB308`), and `status-green` (`#22C55E`).
- Green means settled, connected, successful, or incoming. Yellow means partial settlement, outstanding amounts, or warnings. Blue means open entries, transfers, or informational results. Red means errors, failed actions, or outgoing money.
- Reuse `StatusDot` for status dots and keep a visible status label alongside them. Never rely on color alone to communicate a state.
- Support light and dark mode through the root `data-theme` attribute. Apply the saved preference before rendering; follow the system preference until the user chooses a theme.

## Navigation and Branding

- Keep the sidebar flat and minimal, following the Vercel reference: outline icons, muted inactive labels, comfortable rows, and a subtle neutral active background.
- Main navigation contains Overview, Transactions, Insights, and Business Memory. Place Record Transaction in the sidebar, with Settings, Sign Out, and the theme switch at the bottom.
- Do not add a top navigation bar, refresh button, workspace switcher, profile controls, upgrade prompts, or unavailable features.
- On mobile, keep the main pages, Record, and Settings reachable through bottom navigation. Put the theme switch in Settings to keep navigation usable at narrow widths.
- Keep page names in navigation. Do not repeat them visibly in a top bar or as page-name headings; screen-reader-only headings are appropriate. The Overview introduction may remain.
- Overview shows Recent Transactions alongside compact, data-backed Insights and Business Memory previews with View All links. Insights shows actual payment movement for the last 30 days and a comparison with the previous period. Business Memory shows one recent saved fact only when a real fact is available; never show a promotional or empty memory card.
- Use the existing professional geometric black-and-white logo and matching favicon. The logo contains no text or mascot.
- Use the existing Lucide outline icon family consistently. Match sidebar icons at roughly 20 pixels with a 1.6 stroke width.

## Layout and Workflows

- Keep Overview within the viewport without document scrolling on desktop and mobile. Let long transaction lists scroll within their panel. Keep longer page content accessible through internal scrolling.
- Transactions uses a semantic table, text search, settlement filters, and pagination. Clearly label the loaded subset; do not imply it includes records beyond the API response.
- Insights reads the full authenticated ledger, uses settlements for money movement and part payments, and excludes transfers. Outstanding balances cover all recorded history. Label entry age rather than inventing due dates, overdue claims, profit, forecasts, or AI recommendations.
- Business Memory shows recent saved memories on opening, keeps Search Memory and Add Convention available, and provides explicit empty, loading, success, and error states. Recent listing is a bounded window, not an exhaustive memory search.
- Record Transaction is a full page and starts a fresh conversation when the user leaves and returns; leaving disconnects voice. It offers Voice first, then Text. Both modes share one backend draft during the visit; switching modes preserves it. Do not restore the Form option. Voice sessions listen continuously and allow interruptions after one initial connection.
- Design for understanding by seeing. Use a large accessible circle to connect/cancel/end voice, with the current temporary user/reply preview in a pill beside it. Show three activity dots only during actual communication, honor reduced motion, and keep compact Pause/Resume, End, and voice-mute controls together while connected. Use progressive disclosure: one obvious next action, plain language, and visible listening, processing, confirmation, or saved feedback. Keep full conversation history and secondary transaction details collapsed until requested. Provisional speech may appear only as temporary live preview; never persist it or treat it as authorization. Do not show implementation terms such as workers and API keys in the voice flow.
- Make corrections to the current draft through Voice or Text. Preserve keyboard focus indicators and do not automatically focus an entry field.
- Text entry uses a visible chat transcript above its reply composer. Keep follow-up questions adjacent to the messages and preserve the current exchange when switching modes. Place Shop Context in a stable shared side panel on desktop and a compact disclosure above recording on smaller screens; never remount it on every voice revision.
- Use familiar incoming/outgoing chat bubbles and timestamps in Text and Past Conversations. Expose archived finance-only conversations read-only at `/conversations`; reading history never resumes a draft or authorizes a financial write. Archive ownership follows the authenticated account independently of expired voice capabilities.
- Payment method is optional. Credit requires a counterparty, and partial payments require a valid amount paid. Require explicit valid details before enabling submission. Ask for Approval requires a review and confirmation; Full Autonomy saves complete voice/text entries directly. Switching tabs or changing a preference must never save a draft.
- Display real ledger and memory data only. Do not seed sample transactions or fabricate charts, statuses, or integration results.

## Frontend Performance and Verification

- Preserve lazy loading for the recording page and secondary screens, the local font preload, reusable formatters, and deduplicated ledger refreshes. Poll only while the document is visible.
- Keep independent requests parallel when their inputs are ready. Bound rendered transaction rows through pagination and avoid unnecessary memoization or dependencies.
- Run `pnpm build` after frontend changes. Verify affected behavior in the browser, including both themes and desktop/mobile sizes. Check that Overview has no document overflow and that the recording page does not highlight a field.

## Authentication and Voice

- Use Better Auth with Google sign-in only across the app. Do not add password login or a development auth bypass.
- Scope every ledger query and conversation to its authenticated account. Use the immutable Better Auth user ID for ledger ownership. Preserve existing prototype data separately until an explicit migration; never infer its ownership from the first login.
- Keep LiveKit and provider secrets server-side. Issue short-lived room-scoped tokens; validate conversation capabilities against the original active auth session.
- The model may propose or correct a draft and reply conversationally; the backend retrieves bounded business context before reasoning. It cannot directly write the ledger, verify payment, or claim a save succeeded.
- Use three separate onboarding screens: app language (English or Hindi), shop name, then saving policy (Ask for Approval or Full Autonomy), with no default choices. Back preserves selections; save preferences only when setup is completed. Store them per account and allow editing in Settings. Display the shop name in navigation and the overview. Greet in the selected language on connection; accept Hindi, English, and mixed speech without changing the saved app language automatically.
- Use browser routes for all screens: `/overview`, `/record`, `/transactions`, `/insights`, `/business-memory`, `/conversations`, and `/settings`. `/` is the public landing page; its CTA leads to `/record` through authentication/setup as required. Preserve direct links through authentication, browser Back/Forward, and fresh recording state when leaving the route.
- The public landing page may use its own minimal header/footer navigation. Keep its Geist/monochrome identity, bilingual copy, reduced-motion support, and labelled local examples. Never imply demo data is a real customer record or invent adoption, speed, testimonials, pricing, or live payment claims.
- Treat greetings, listening checks, unclear speech, and ordinary questions as conversation, not transaction proposals. Ask one short question for a missing material fact; infer bookkeeping categories and do not demand accounting terms or a date by default.
- VAD controls speech boundaries and interruptions, not speaker identity. Keep browser noise suppression and echo cancellation enabled, and apply the included LiveKit Node noise-cancellation filter before STT and VAD. Require recognized speech before a VAD interruption and retain false-interruption recovery. Keep each short reply in a single synthesis request rather than splitting it at sentence boundaries. Do not claim shop-noise robustness without live audio validation or silently enable paid voice-isolation add-ons.
- In Ask for Approval, confirm the exact reviewed revision; interrupted or failed audio does not complete a spoken review. In Full Autonomy, only a complete validated proposal may save without review. Read and lock the authenticated account’s current policy at the write boundary. Keep confirmations brief and natural; leave descriptions, payment method, and other details visible on screen. Commit each entry and its settlement atomically and idempotently, with its own entry identity and recorded approval policy.
- Keep speculative financial actions disabled. A transcript cannot enable Full Autonomy; only the authenticated user’s explicit saved preference can. In approval mode, a final transcript is input, not permission to commit. Negation and corrections must never pass as a bare affirmative. Saved entries are immutable in this capture flow; never turn a correction of a saved entry into another financial event. Full Autonomy can continue with fresh entries in the same conversation without a New Entry click.
- Disconnect microphone and remote audio when the voice session ends or its component unmounts. Avoid uploading or recording raw audio by default.
- Give every voice connection a fresh room and agent dispatch. Publish the microphone only after the worker reports readiness, scope callbacks and timers to that connection, and end the worker session when its caller leaves. Screen confirmation may interrupt a spoken review only after the backend verifies that the entry was saved.
- Distinguish local validation from live provider testing. Do not claim speech accuracy, latency, OAuth success, or a working cloud deployment from a build or fixture test.

## Runtime Memory and Observability

- Provision a separate Meko runtime datapack for each authenticated account through the server-owned mapping. Never accept a client-selected datapack or infer isolation from agent_id/metadata. Keep bootstrap traces empty and team build datapacks separate.
- Save only validated finance-related exchanges into history and the durable extraction queue. Greetings and unrelated replies remain transient; the intent classifier is not a complete content guardrail.
- Retrieve actual Meko facts before interpretation, bound the recent-memory window and voice deadline, and disclose its incomplete coverage. Cite only IDs actually returned. Empty results, unavailable sources, and disabled memory are different states.
- Correct/Forget must mutate the verified owned memory and invalidate affected unsaved drafts/reviews. Do not use old conversation text to resurrect forgotten conventions. Promotion and staff/cross-shop sharing are outside this scope.
- Keep provider extraction outside financial transactions. Queue identity, leases, retries and expiry must survive restarts without repeating a ledger write. Successful captures clear their text payload.
- Use strict tool schemas plus application validation. Do not remove current-payment quote grounding or exact-revision approval to make output appear faster. Only an actual successfully played financial review sets voice-reviewed state.
- Log correlated timings and scalar usage only, without utterances, audio, secrets or memory text. Browser activity gaps are latency proxies, not calibrated acoustic measurements. No model/endpointing change establishes a production speed or quality win without representative measurements.
