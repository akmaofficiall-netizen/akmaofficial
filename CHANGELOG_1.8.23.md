# AKMA 1.8.23

## Database / Raw Materials Fix
- Added a backwards-compatible additive schema repair for `raw_materials` and `raw_material_price_history`.
- The repair runs before raw-material GET/POST/GET-by-id/PUT operations and does not delete or rewrite existing data.
- Added server-side logging of PostgreSQL error code/detail for raw-material API failures without exposing secrets to clients.
- Improved raw-material code generation in the UI to avoid the previous tiny random namespace (`RM-100`..`RM-999`).
- Duplicate raw-material codes now return a clear Persian validation error.

## Deployment
- Project version bumped to `1.8.23`.
- No login/authentication/session behavior was intentionally changed.
