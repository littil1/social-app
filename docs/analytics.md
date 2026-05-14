# Analytics

APP uses PostHog through `posthog-js` for privacy-first product analytics.

## Setup

Set these public environment variables in Vercel:

- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`
- `NEXT_PUBLIC_POSTHOG_HOST`

Analytics initializes only in production and only when both variables exist. Missing variables make analytics a no-op, so the app does not crash.

## Tracked Events

- `page_viewed`
- `login_modal_opened`
- `signup_started`
- `signup_completed`
- `login_completed`
- `login_completed_after_gated_action`
- `post_composer_opened`
- `post_submitted`
- `post_submit_failed`
- `comment_section_opened`
- `comment_submitted`
- `comment_submit_failed`
- `reaction_clicked`
- `reaction_failed`
- `boost_clicked`
- `boost_submitted`
- `boost_failed`
- `report_opened`
- `report_submitted`
- `report_submit_failed`
- `input_idea_submitted`
- `input_idea_submit_failed`
- `input_support_clicked`
- `input_comment_submitted`
- `road_viewed`
- `road_cta_clicked`
- `road_original_idea_clicked`
- `road_achievement_created`
- `road_achievement_updated`
- `profile_saved`
- `profile_save_failed`
- `avatar_upload_started`
- `avatar_upload_failed`
- `avatar_uploaded`
- `account_delete_started`
- `account_delete_confirmed`
- `account_delete_failed`

## Privacy Rules

- No user-generated text.
- No emails.
- No usernames.
- No bios.
- No avatar URLs.
- No post IDs, comment IDs, idea IDs, or user IDs in event properties.
- No raw error messages.
- Only structured failure categories are sent: `validation`, `auth`, `rate_limited`, `network`, `unknown`.
- `identify` uses only Supabase `user.id` after authentication.

## Disabled Features

- Session Replay is intentionally disabled.
- Autocapture is disabled.
- Pageviews are captured manually without query parameters.

## Billing

Set PostHog billing limits before production rollout.
