# WordPress Plugin

WordPress plugin reference page for NAVAI integration.

This page is the destination for the documentation home shortcut button "Plugin para wordpress".

## What This Covers

- WordPress plugin installation flow
- Required NAVAI backend endpoints
- Basic runtime configuration checklist
- Validation steps before production rollout

## Backend Requirements

Your backend must expose the standard NAVAI routes:

- `POST /navai/realtime/client-secret`
- `GET /navai/functions`
- `POST /navai/functions/execute`

## WordPress Integration Notes

- Install and activate the NAVAI WordPress plugin in the target site.
- Configure the backend base URL used by the plugin.
- Verify microphone permissions and HTTPS availability in the site environment.
- Test navigation and function execution using a non-production environment first.

## Next Steps

- Continue with the API installation guide if backend routes are not ready.
- Continue with the Web installation guide for frontend runtime details and integration patterns.
