# Product Opportunity lifecycle

One standalone, reusable Port plugin for all `product_opportunity` entities in
`org_DFaV0HHbGoNV1CV9`. Existing Related Context source is not modified.

## Delivery and verification status

- Plugin identifier: `product-opportunity-lifecycle`; version `0.1.3`.
- Uploaded to Port and placed first in Product Opportunity Overview using the
  verified Pages API `PATCH /v1/pages/{identifier}` and `custom-widget.pluginId`.
- The deployed HTML is checked byte-for-byte against the tested build.
- Authenticated API verification confirms placement, unchanged opportunity
  properties/relations, unchanged non-Overview tabs and all 14 existing workflows.
- Local browser validation uses **clearly labelled read-only live snapshots** for
  the reference opportunity and the configuration-restore opportunity in
  Engineering Review. It is not a signed-in Port browser verification.
- The integrated browser redirects Port to authentication. Final native host
  rendering and native tab/form opening remain to be checked by a signed-in user.
  Existing redundant widgets are deliberately preserved until that check passes.

Source is in [src](./src). The explicit, pure mapping is
[model.ts](./src/model.ts); host refresh logic is
[useOpportunity.ts](./src/useOpportunity.ts). The uploaded single-file build is
[dist/index.html](./dist/index.html). No production bundle contains preview
fixtures, snapshots, API keys, client secrets or a reference opportunity ID.

## Behavior

- Five keyboard-operable stages; clicking only selects read-only details.
- Status alone maps the current stage. Earlier stages are labelled **Previous
  stage**, not approved or historically completed.
- Working proposals and approved-artifact fields are distinguished explicitly.
  Conflicting status/artifact data is called out without promoting the stage.
- Rejected has no inferred rejection stage. Unknown/missing status is **Stage
  unavailable**. No inspected workflow sets `Approved`, so its meaning is shown
  as unverified, never as completed handoff.
- Signal identifiers are deduplicated. Original text and source links are
  separate from agent reasoning, evidence summary and confidence.
- Questions are unresolved, not enforced blockers. No explicit blocked state or
  enforced blocking rule was found, so the plugin does not show **Blocked**.
- No ADO relation is treated as created handoff work. Related items open their
  native Port records with a **Related context only** label.
- PRD and Engineering navigation uses the inspected `activeTab` parameter and
  exact existing group names. Requirements opens the existing dynamic
  requirements content group.
- In the existing decision section, **Review & Approve Requirements** appears
  only when the fetched entity's status is exactly `Requirements Review`.
  It uses SDK `0.4.0` `showRunWorkflowDialog` to open the existing
  `review_approve_requirements` / `trigger` dialog inside Port, with the current
  entity identifier and its unchanged `properties.requirements` Markdown in
  `initialData`. The existing Read requirements link remains available.
  The button is disabled during refresh, after a refresh error, or if requirements
  are missing, blank or not a string; missing requirements show an explanation.
  The plugin does not submit, save or transition anything, or report success.
  The existing workflow owns editing, approval and PRD generation. Existing
  context updates, visibility refresh, 60-second polling and manual Refresh
  reload the lifecycle; `PRD Review` hides the button without changing review
  navigation. Native field editability and cancellation still need verification
  inside Port without submitting the workflow.
- Ready for Engineering remains **Engineering handoff pending**. With consistent
  artifact data, the primary button opens the existing
  `create_engineering_work_item` / `trigger` form using SDK
  `showRunWorkflowDialog` and the current entity as initial input. It never
  submits the form. Development did not open this form in the real portal.
- Markdown is rendered through `react-markdown`: no raw HTML, unsafe URL schemes
  or remote images. Safe links use the SDK's installed parent-navigation bridge.

## Verified data limitations

The generation workflows currently populate both the working and approved
artifact fields. The PRD can also be manually edited without an approval.
Consequently, populated fields are availability evidence only, not a recorded
approval, even though the field is named "approved".

PRD approval advances to Engineering Review. Engineering-plan approval advances
to Ready for Engineering. Work-item creation registers and relates an ADO item,
but records no dedicated handoff provenance and does not change the opportunity
status. This entity model cannot distinguish a created handoff item from adjacent
engineering context. The plugin says creation is **not verified** rather than
inventing completion. It does not request run-history permissions or modify the
schema to fill that gap.

No reviewers, approval timestamps or artifact versions are displayed.
No workflow, agent, blueprint or entity was edited or executed.

## Live data and refresh

SDK `usePortPluginData` supplies the entity, temporary authenticated host token,
API base URL and theme. The browser reads opportunity, Signal and related ADO
records using that token. Client credentials remain exclusively in the existing
CLI configuration and are never copied into this project or sent to the browser.
Only trusted HTTPS Port API hosts can receive the host token.

### Theme correction in 0.1.1

The host's explicit light/dark mode applies to the document root, including
loading/error states. Port's documented `background-dim`, `background-primary`,
`background-dim-transparent` and `border-medium` tokens override the palette.
When individual tokens are absent, the fallback palette matches the host mode.
Without a valid host theme, CSS follows `prefers-color-scheme` and responds to
system-theme changes. An explicit light Port theme still wins over a dark OS.
The original preview supplied invented surface-token names and masked missing
dark fallbacks; regression checks now include empty/partial host theme CSS.

### Native typography polish in 0.1.2

Native Port controls were inspected in the signed-in entity page: DM Sans,
14px body/control text and 16px, weight-500 widget headings. The plugin now
matches that scale, uses restrained 4px control radii, removes its nested
rounded-card border and uses the actual host link/ocean-blue tokens. The font
stack prefers the host's DM Sans family with Arial/sans-serif fallback.
The SDK iframe cannot inherit the parent document's loaded font. Native portal
verification showed embedded fonts are blocked by the widget CSP, and parent
font assets fail CORS. No font requests or additional permissions are required;
the plugin intentionally uses the local fallback when DM Sans is unavailable.

The 0.1.2 reference entity was verified in the signed-in native Port portal:
14px body, 16px/500 heading, dark colors, no external font requests, no
horizontal overflow and 396px content in the 602px-wide iframe. See
[native Port screenshot](./screenshots/native-port-typography.png).
This supersedes the initial browser-authentication limitation for reference
rendering only; the second entity and native action navigation still need
acceptance before retiring existing widgets.

### Inter, concise copy and connectors in 0.1.3

Inter is now the first font, with bundled DM Sans as fallback. Both variable
Latin fonts are included as binary bytes in the JS bundle and registered with
the browser's `FontFace` binary-source API, not as URL/data-URI fonts. Native
Port verification confirms both faces are loaded under the existing policy,
with zero font network requests. No permissions or CSP changes were made.
SIL Open Font Licenses are included in the HTML.

Removed repeated human-decision copy, navigation notes, the generic approval
disclaimer row and the question disclaimer. The current explanation, artifact
availability, warnings and primary action remain. The earlier-stage distinction
is available on the stage label's tooltip; questions are expandable by count.
Freshness is a short Updated time; stale/failed-refresh states remain explicit.

Connectors stop 3px before each circle edge rather than spanning their centers.
Measured at both 602px (native Port) and 390px widths with no intersections or
horizontal overflow. Native reference content is now 340px tall. See
[Inter and concise panel screenshot](./screenshots/native-port-inter-concise.png).

Host entity/property/relation and token changes cause refresh. A documented
60-second polling fallback runs while visible and refreshes when visibility
returns. Requests are aborted and timers/listeners cleaned up on context change
or unmount. Late responses cannot replace the new entity's state.

Initial loading, denied/expired permissions, partial evidence failure and retry
are explicit. A refresh preserves the same entity's last successful data, labels
it as refreshing or stale, and shows its fetch time. Revoked tokens and changed
entity identities hide previous data immediately.

## Build and validate

### Native surface colors

DM Sans is now primary, matching native Port, with bundled Inter as fallback.
The full variable font uses optical size 9, matching the native rendered
DM Sans 9pt faces, weight 400 body text, normal tracking, and weight 500
headings and stage labels. Controls inherit the same family and tracking;
synthetic font styles are disabled. This supersedes the earlier Inter-first
typography notes.
Text is slightly enlarged: 15px body/actions, 17px headings and 13px secondary
text. Stage labels scale to 13px on laptops and 12px on narrow screens.
Verified in the signed-in portal using rendered-glyph inspection: headings,
stage labels and body text use **DM Sans 9pt**, matching the native font family
and optical size. Stage details and live refresh passed after deployment.
See the [native DM Sans screenshot](./screenshots/native-port-dm-sans.png).
The deployed reference was checked using Chromium's actual rendered-font
inspection: description glyphs use the bundled font, not Arial. All five stage
details, question expansion and refresh were exercised in native Port, and
plugin links opened the native PRD Review and Engineering Review tabs.
The second opportunity rendered Engineering-plan review with its consistency
warning and no horizontal overflow. No workflows were submitted.

The iframe paints Port's `--background-primary` explicitly, matching the
surrounding native Details widget instead of exposing the iframe's near-black
backdrop. Secondary surfaces use `--background-dim`; text, links and separators
retain the host tokens. Stage accents use Port's ocean blue with a neutral
selected-stage border. Dark-mode fallbacks match the inspected native charcoal
palette; explicit light mode and system-theme fallback remain supported.
Verified in the signed-in reference opportunity at 831px iframe width with no
horizontal overflow, plus light/dark token-switch checks. See the
[native color screenshot](./screenshots/native-port-theme-colors.png).

Node 20+ and npm are required. SDK `0.4.0` was verified against npm and the
installed definitions/examples before implementation.

```powershell
npm ci
npm run typecheck
npm test
npm run build
npm run test:bundle
```

17 focused model/API tests cover all requested mapping cases, host variants,
permission failures, mismatched records and trusted API URLs. Seven production
bundle scenario groups cover stage interaction, original evidence, navigation,
refresh/retry/stale data, context-switch races, handoff dialog payload,
requirements approval dialog payload and exact Markdown prefill, exact-status
visibility, loading/missing/stale-data guards, status-transition refresh,
safe markdown, polling, token revocation and cleanup. Injected permission-error
logs in tests are expected assertions, not production failures.

The requirements approval enhancement also passed the synthetic browser preview:
the new and existing actions remain visible without meaningful horizontal
overflow at desktop and narrow widths, and clicking sends only the expected
native dialog request. This preview cannot verify Port's actual field rendering,
editability or Cancel behavior. Check those inside Port without submitting.
No enhancement was uploaded or deployed. Pre-change source, tests, documentation
and built HTML are preserved in
[the restoration backup](./rollback/requirements-approval-20261013-142634).

Desktop browser checks measured roughly 317px for the reference panel including
freshness, and roughly 351px for Engineering Review including its consistency
warning, at an 837px iframe width. Narrow 390px rendering has no horizontal
overflow and naturally grows vertically. Stage controls were exercised with
Enter and a visible focus outline.

Port's enclosing dashboard row has a **400px minimum**. The panel stays compact
inside it; the supported SDK does not resize the parent card to its content.
Expanded stage content scrolls internally when lengthy.

## Preview and screenshots

```powershell
# Safe synthetic fixtures; default port 9000
npm run dev
```

Open <http://127.0.0.1:9000/preview>. The synthetic host intercepts reads and
records navigation messages without opening native actions. Its mock token is
not a credential. Preview code is not bundled for production.

To recreate the labelled live-snapshot preview, use the existing CLI config
without copying its contents:

```powershell
$env:PORT_CONFIG_PATH = 'C:\Users\Sagi\Downloads\related-context-source\.port\config'
node tools\capture-preview.mjs
node tools\preview.mjs --live
```

Captured data remains local and git-ignored. Refreshes in this preview re-read
the capture, **not** live Port data. Only the production plugin makes live reads.

Screenshots:

- [Reference desktop](./screenshots/reference-desktop.png)
- [Reference narrow](./screenshots/reference-narrow.png)
- [Engineering Review](./screenshots/engineering-desktop.png)
- [Dark theme](./screenshots/reference-dark.png)

## Portal configuration and remaining native verification

Original full page: [rollback/entity-page.json](./rollback/entity-page.json).
Applied widget payload: [rollback/overview-after.json](./rollback/overview-after.json).
API verification: [rollback/portal-verification.json](./rollback/portal-verification.json).
Hosted build verification: [rollback/deployment-result.json](./rollback/deployment-result.json).

In a signed-in browser:

1. Reload the reference opportunity in the requested organization. Confirm
   Requirements review, three linked signals, no later artifacts, seven
   unresolved questions, and ADO #11 only as related context in Handoff details.
2. Open "Automatic workspace configuration snapshot and restore". Confirm
   Engineering-plan review and the populated-plan consistency warning.
3. Open the existing PRD Review and Engineering Review navigation links.
   Inspect both unchanged review tabs. Do not submit any workflows.
4. Once native rendering is verified, retire only the direct replacements below:

```powershell
$env:PORT_CONFIG_PATH = 'C:\Users\Sagi\Downloads\related-context-source\.port\config'
node tools\integrate.mjs --retire-replaced
node tools\verify-portal.mjs
```

This deliberately requires a separate, explicit retirement command. The script
refuses to overwrite concurrent page edits. If refused, inspect and reconcile
the current configuration instead of disabling the guard.

Direct replacements identified:

| Widget ID             | Existing title                  |
| --------------------- | ------------------------------- |
| `ov-art-requirements` | Requirements text               |
| `ov-art-prd-proposal` | PRD proposal                    |
| `ov-art-prd-approved` | Approved PRD field              |
| `ov-art-eng-proposal` | Engineering plan proposal       |
| `ov-art-eng-approved` | Approved engineering plan field |
| `ov-next-step`        | Next human decision by stage    |

No standalone confidence-explanation widget exists in the inspected Overview.
Confidence in Record details is preserved; the panel adds an interpretation-only
explanation in Discovery. Signal count, evidence, problem, requirements,
acceptance criteria, questions, engineering-context tables and Related Context
remain unchanged. Both review tabs are preserved exactly.

## Updating after approval

The installed CLI's `update --file` replaces this existing plugin's HTML while
preserving its identifier, title, description and params. Run only after approval,
with your approved Port CLI authentication configured (local `.port/config`,
user-level `.port/config`, or the CLI's supported environment variables).
The previously documented Downloads configuration folder is not present in
this environment; authentication must be restored before deployment.

```powershell
& 'C:\Users\Sagi\AppData\Roaming\npm\port-plugins.cmd' update product-opportunity-lifecycle --file 'C:\Users\Sagi\Documents\Git\product-opportunity-lifecycle\dist\index.html'
```

From this plugin folder:

```powershell
$env:PORT_CLI_CONFIG_DIR = 'C:\Users\Sagi\Downloads\related-context-source'
node tools\verify-deployment.mjs
```

Plugin upload and page placement are already complete; the remaining step is
signed-in browser acceptance, not another deployment.

## Rollback

Run from this plugin folder:

```powershell
$env:PORT_CONFIG_PATH = 'C:\Users\Sagi\Downloads\related-context-source\.port\config'
node tools\integrate.mjs --rollback --dry-run
node tools\integrate.mjs --rollback
```

The dry run was executed successfully. Rollback restores the original Overview
group (including all original widgets/layout) while preserving the current
non-Overview groups. It replaces any later Overview edits, so review those
before running it. The uploaded plugin is left unused for easy re-enablement;
no entity or workflow state is rolled back because none was changed.
