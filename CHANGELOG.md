# Changelog

## 1.3.0

- Fix: `where[...]` filters now work. Bracketed query parameter names broke n8n's lodash-style parameter lookup, so setting any such filter failed at runtime with "Could not get parameter". Fields are renamed internally to path-safe names (e.g. `where[step_id]` → `where_step_id`); the query string sent to the API is unchanged, and display names are untouched.
- Note: if you previously set a `where[...]` filter (it would have errored), open the node and re-select the filter — values saved under the old bracketed name are ignored, so the node would otherwise run unfiltered.

## 1.2.1

- Fix: `get_cards` returns empty output instead of sentinel message when no cards found (prevents downstream 404 errors)

## 1.2.0

- Feat: add `get_cards` operation — fetch active workflow cards across multiple workflows with optional step ID filtering
- Feat: add `promote_until_completed` option to `promote` — loops until card reaches Completed status

## 1.1.1

- Fix: lowercase class export for pcoWorkflowActions

## 1.1.0

- Feat: add PCO Workflow Actions node with skip, promote, go_back, and skip_to_step operations
- Built-in rate limit handling with Retry-After support

## 1.0.0

- Initial release with Planning Center People node
- Full People API v2 coverage via OpenAPI spec
- Basic authentication with Application ID / Secret
