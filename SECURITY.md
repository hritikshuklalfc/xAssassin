# Security Notes

## Secrets policy
- Never commit `.env` or credential files.
- Keep Supabase keys in local environment variables.
- Treat `SUPABASE_SERVICE_ROLE_KEY` as sensitive and private.

## If keys were exposed publicly
1. Rotate Supabase keys immediately in Supabase dashboard.
2. Replace leaked keys in all deployments.
3. Invalidate old tokens/sessions where possible.
4. Rewrite git history if sensitive keys were committed.
