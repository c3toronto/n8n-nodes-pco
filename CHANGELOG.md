# Changelog

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
