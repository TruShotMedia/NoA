# NoA Philips Hue Relay Setup

The Hue Bridge lives on your private home network, so Vercel cannot call `192.168.x.x` directly. The Hue relay runs on a home computer, talks to the bridge locally, and gives NoA a secure public proxy URL.

## 1. Configure the local relay

Open:

```text
hue-relay\.env
```

If it does not exist, double-click `Run Hue Relay.bat` once and it will create it.

Set:

```env
HUE_RELAY_PORT=8787
HUE_RELAY_SECRET=make_this_a_long_random_secret
HUE_BRIDGE_URL=http://192.168.4.34
HUE_USERNAME=your_generated_hue_username
HUE_ALLOW_SELF_SIGNED=false
```

Prefer `http://192.168.4.34` for the Hue v1 local API. If you must use `https://192.168.4.34`, set:

```env
HUE_ALLOW_SELF_SIGNED=true
```

## 2. Run the relay

Double-click:

```text
Run Hue Relay.bat
```

Leave the window open.

Check locally:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
```

## 3. Expose the relay with a tunnel

Use a tunnel service that gives you an HTTPS URL pointing to:

```text
http://127.0.0.1:8787
```

Examples:

```powershell
cloudflared tunnel --url http://127.0.0.1:8787
```

or:

```powershell
ngrok http 8787
```

Copy the generated HTTPS URL.

## 4. Update Vercel environment variables

In Vercel, set:

```env
HUE_PROXY_URL=https://your-tunnel-url
HUE_PROXY_SECRET=the_same_value_as_HUE_RELAY_SECRET
```

You can leave these existing direct values in place, but once proxy mode is set NoA will use the proxy:

```env
HUE_BRIDGE_URL=http://192.168.4.34
HUE_USERNAME=your_generated_hue_username
```

Redeploy NoA.

## 5. Test in NoA

Open NoA, unlock, then:

1. Go to `Integrations`.
2. Click `Test all connections`.
3. Go to `Hue`.
4. Click `Refresh`.
5. Toggle one light first.

## Notes

The relay secret is required. NoA sends it as `x-noa-hue-secret`, and the local relay rejects requests that do not match.

If the tunnel URL changes, update `HUE_PROXY_URL` in Vercel and redeploy.
