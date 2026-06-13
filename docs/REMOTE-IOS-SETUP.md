# Remote iPhone Access

Goal: run NoA/Noah on the Windows home-base machine, then access it from an iPhone as a Home Screen app.

## Recommended Architecture

Use a secure HTTPS tunnel in front of the NoA LAN server.

```text
iPhone Home Screen app
  -> HTTPS tunnel with login
  -> Windows NoA home base on port 5188
  -> OpenAI, Notion, Supabase, n8n
```

Do not expose port `5188` directly through router port forwarding. Use an authenticated tunnel.

## Best Option: Cloudflare Tunnel + Cloudflare Access

1. Install Cloudflare Tunnel on the Windows home-base machine.
2. Create a tunnel that points to:

```text
http://localhost:5188
```

3. Put Cloudflare Access in front of the tunnel.
4. Allow only your email address.
5. Open the HTTPS URL on your iPhone.
6. In Safari, use Share -> Add to Home Screen.

## iPhone Notes

- iOS requires HTTPS for proper Home Screen app behavior and service worker support.
- Voice and microphone permissions must be allowed in Safari for the NoA URL.
- If Cloudflare Access is enabled, you may occasionally need to re-authenticate.

## NoA PWA Support Added

NoA includes:

- `manifest.webmanifest`
- iOS web app meta tags
- app icons
- service worker shell caching

This makes the remote HTTPS URL install cleanly as a Home Screen app.
