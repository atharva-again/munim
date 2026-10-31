# Project Guidance

## UI Text

- Use Title Case for visible UI titles and action labels, including page, section, card, and dialog headings, navigation labels, and button text. Capitalize major words, keeping short articles and prepositions lowercase unless they begin or end the title. For example, write “Good Afternoon” and “Record Transaction.”
- Keep explanatory and helper copy in sentence case.

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
- Do not add a Business Memory shortcut or promotional section beneath the Overview transaction panel.
- Use the existing professional geometric black-and-white logo and matching favicon. The logo contains no text or mascot.
- Use the existing Lucide outline icon family consistently. Match sidebar icons at roughly 20 pixels with a 1.6 stroke width.

## Layout and Workflows

- Keep Overview within the viewport without document scrolling on desktop and mobile. Let long transaction lists scroll within their panel. Keep longer page content accessible through internal scrolling.
- Transactions uses a semantic table, text search, settlement filters, and pagination. Clearly label the loaded subset; do not imply it includes records beyond the API response.
- Insights reads the full authenticated ledger, uses settlements for money movement and part payments, and excludes transfers. Outstanding balances cover all recorded history. Label entry age rather than inventing due dates, overdue claims, profit, forecasts, or AI recommendations.
- Business Memory separates Search Memory and Add Convention into tabs, with a dedicated results area and explicit empty, loading, success, and error states.
- Record Transaction is a full page, preserves its draft when navigating between pages, and disconnects voice when hidden. It prioritizes Voice, then Text, then Form. All modes share one backend draft; switching modes preserves it. Voice sessions listen continuously and allow interruptions after one initial connection.
- The form opens with no preselected transaction type, status, payment method, or custom direction. Do not automatically focus or highlight a form field; preserve keyboard focus indicators when the user navigates controls.
- Payment method is optional. Credit requires a counterparty, and partial payments require a valid amount paid. Require explicit valid details before enabling submission. Ask for Approval requires a review and confirmation; Full Autonomy saves complete voice/text entries directly and submits the form only on Save Entry. Switching tabs or changing a preference must never save a draft.
- Display real ledger and memory data only. Do not seed sample transactions or fabricate charts, statuses, or integration results.

## Frontend Performance and Verification

- Preserve lazy loading for the recording page and secondary screens, the local font preload, reusable formatters, and deduplicated ledger refreshes. Poll only while the document is visible.
- Keep independent requests parallel when their inputs are ready. Bound rendered transaction rows through pagination and avoid unnecessary memoization or dependencies.
- Run `pnpm build` after frontend changes. Verify affected behavior in the browser, including both themes and desktop/mobile sizes. Check that Overview has no document overflow and that the recording page does not highlight a field.

## Authentication and Voice

- Use Better Auth with Google sign-in only across the app. Do not add password login or a development auth bypass.
- Scope every ledger query and conversation to its authenticated account. Use the immutable Better Auth user ID for ledger ownership. Preserve existing prototype data separately until an explicit migration; never infer its ownership from the first login.
- Keep LiveKit and provider secrets server-side. Issue short-lived room-scoped tokens; validate conversation capabilities against the original active auth session.
- The model may propose or correct a draft and search business context. It cannot directly write the ledger, verify payment, or claim a save succeeded.
- Use two separate onboarding screens: conversation language first, then saving policy (Ask for Approval or Full Autonomy), with no default choices. Back preserves selections; save both preferences only when setup is completed. Store them per account and allow editing in Settings. Greet in that language on connection; accept Hindi, English, and Hinglish during the conversation without changing the saved preference automatically.
- Treat greetings, listening checks, unclear speech, and ordinary questions as conversation, not transaction proposals. Ask one short question for a missing material fact; infer bookkeeping categories and do not demand accounting terms or a date by default.
- VAD controls speech boundaries and interruptions, not speaker identity. Keep browser noise suppression and echo cancellation enabled. Do not claim shop-noise robustness without live audio validation or silently enable paid voice-isolation add-ons.
- In Ask for Approval, confirm the exact reviewed revision; interrupted or failed audio does not complete a spoken review. In Full Autonomy, only a complete validated proposal may save without review. Read and lock the authenticated account’s current policy at the write boundary. Keep confirmations brief and natural; leave descriptions, payment method, and other details visible on screen. Commit each entry and its settlement atomically and idempotently, with its own entry identity and recorded approval policy.
- Keep speculative financial actions disabled. A transcript cannot enable Full Autonomy; only the authenticated user’s explicit saved preference can. In approval mode, a final transcript is input, not permission to commit. Negation and corrections must never pass as a bare affirmative. Saved entries are immutable in this capture flow; never turn a correction of a saved entry into another financial event. Full Autonomy can continue with fresh entries in the same conversation without a New Entry click.
- Disconnect microphone and remote audio when the voice session ends or its component unmounts. Avoid uploading or recording raw audio by default.
- Distinguish local validation from live provider testing. Do not claim speech accuracy, latency, OAuth success, or a working cloud deployment from a build or fixture test.
