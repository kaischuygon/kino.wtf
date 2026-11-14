# Supabase

kino.wtf uses Supabase for Postgres (game catalog, releases, player data), Auth, and pg_cron. This covers setting up a project and keeping it in sync with the repo. For how the pieces fit together, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Connect the app

Copy `.env.example` to `.env` and set:

- `VITE_SUPABASE_URL`: project URL
- `VITE_SUPABASE_KEY`: anon (public) key
- `VITE_AUTH_REDIRECT_URL` (optional): canonical base URL for auth links, e.g. `https://kino.wtf`

## Schema and migrations

- `supabase/schema.sql` is a full snapshot of the current schema.
- `supabase/migrations/` holds forward-only, timestamped migrations; `202603200001_initial_auth_and_games.sql` is the squashed baseline.

For a new project, run `supabase/schema.sql` in the SQL editor, then any migrations newer than the snapshot. For an existing project, apply new migrations in filename order, either in the SQL editor or with the CLI if the project is linked:

```sh
npx supabase db push --yes
```

Create a migration with `yarn db:migration:new -- add_descriptive_name`, and update `schema.sql` in the same change. If the CLI reports a migration-history mismatch, repair the remote migration table with the versions it lists and push again. The [migrations runbook](../supabase/migrations/README.md) covers this and catalog recovery.

### Tables

| Table                                                        | Access                                                  | Purpose                                    |
| ------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------ |
| `user_profiles`, `game_stats`, `game_states`, `played_games` | RLS, owner only (`auth.uid()`)                          | Player profiles, stats, drafts, archive    |
| `actor_games`, `movie_games`, `director_games`               | Service role writes; public reads via RPC               | Game catalog (append-only, insert history) |
| `game_releases`                                              | Written by `release_next_games()`; public reads via RPC | Release log: which index is live when      |
| `guessbox_options`                                           | Public reads via RPC                                    | Autocomplete suggestions                   |
| `game_catalog_row_history`, `game_catalog_table_snapshots`   | Internal                                                | Catalog audit trail and recovery           |

A trigger creates a `user_profiles` row for every new auth user.

### Scheduled releases (pg_cron)

Migration `202611140100_index_based_game_releases.sql` enables `pg_cron` and schedules `release-next-games` every 5 minutes. To check it:

```sql
select jobname, schedule, active from cron.job;
select * from cron.job_run_details order by start_time desc limit 5;
select game_mode, max(game_index), max(released_on) from public.game_releases group by 1;
```

The release boundary is midnight `America/Denver`. To change it, update `release_period_for_mode` in a new migration and `GAME_RELEASE_TIME_ZONE` in `src/lib/gameRelease.ts` together.

## Auth providers

Email/password (with password reset), Google, Discord, and GitHub are supported.

1. **Authentication → Providers:** enable Email, then Google, Discord, and GitHub with each provider's client ID and secret. For GitHub, create an OAuth App under GitHub Developer Settings.
2. **In each external provider,** set the callback URL to the Supabase callback URL shown on that provider's settings page.
3. **Authentication → URL Configuration:**
   - Site URL: the primary app URL (`https://kino.wtf`, or your local dev URL)
   - Redirect URLs: `<app-url>/auth` and `<app-url>/auth/confirmed`, for both local and production
4. In production, set `VITE_AUTH_REDIRECT_URL=https://kino.wtf` so signup, reset, and OAuth links all use the canonical domain.

## Confirmation email template

Supabase's free tier supports a custom confirmation email body (the sender stays Supabase-managed without custom SMTP).

1. **Authentication → Email Templates → Confirm signup**
2. Subject: `Confirm your kino.wtf account`
3. Paste the template below and save. Keep `{{ .ConfirmationURL }}` exactly as is; Supabase injects the signed link.

<details>
<summary>Template HTML</summary>

```html
<!doctype html>
<html>
  <body
    style="margin:0;padding:0;background:#111827;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#f3f4f6;"
  >
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      style="padding:24px 12px;background:radial-gradient(1200px circle at 0% 0%,#1f2937 0%,#111827 42%,#0b1020 100%);"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            style="max-width:560px;background:#1d232a;border:1px solid #2a3440;border-radius:16px;overflow:hidden;box-shadow:0 12px 36px rgba(0,0,0,0.4);"
          >
            <tr>
              <td style="padding:0;">
                <img
                  src="https://kino.wtf/og-image.png"
                  alt="kino.wtf"
                  width="560"
                  style="display:block;width:100%;max-width:560px;height:auto;border:0;"
                />
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  style="margin:0 0 12px 0;"
                >
                  <tr>
                    <td width="36" valign="middle" style="padding:0 10px 0 0;">
                      <img
                        src="https://kino.wtf/web-app-manifest-512x512.png"
                        alt="kino.wtf logo"
                        width="36"
                        height="36"
                        style="display:block;border-radius:8px;"
                      />
                    </td>
                    <td
                      valign="middle"
                      style="font-size:13px;letter-spacing:1.4px;text-transform:uppercase;color:#9ca3af;"
                    >
                      kino.wtf
                    </td>
                  </tr>
                </table>

                <h1 style="margin:0 0 12px 0;font-size:28px;line-height:1.2;color:#f9fafb;">
                  Roll credits. You are almost in.
                </h1>
                <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#d1d5db;">
                  Confirm your email to unlock cloud stats, streak sync, and your full archive.
                </p>
                <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#9ca3af;">
                  For security, this link expires automatically.
                </p>
                <p style="margin:0 0 22px 0;">
                  <a
                    href="{{ .ConfirmationURL }}"
                    style="display:inline-block;background:#22d3ee;color:#00131a;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:800;letter-spacing:0.2px;"
                    >Confirm Account</a
                  >
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;">
                  If you did not request this account, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

</details>

## Leaderboard test data

Scripts in `supabase/seed/` create synthetic users and finished games around each mode's latest released game, for testing the top-5 list, personal placement, and pagination:

```sh
npx supabase db query --linked -f supabase/seed/leaderboard_auth_users_seed.sql
npx supabase db query --linked -f supabase/seed/leaderboard_dev_seed.sql

# cleanup
npx supabase db query --linked -f supabase/seed/leaderboard_seed_cleanup.sql
```

See [supabase/seed/README.md](../supabase/seed/README.md) for details.
