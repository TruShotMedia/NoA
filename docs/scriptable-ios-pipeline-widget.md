# NoA Scriptable iOS Pipeline Widget

This widget shows a read-only CRM pipeline summary from NoA:

- Not Started
- In Progress
- Ready for Revision
- Final Draft/Notes

It uses this public, minimal JSON endpoint:

```text
https://no-a.vercel.app/api/notion-jobs?display=widget
```

The endpoint returns counts only. It does not expose task names, clients, job links, or edit actions.

## Install

1. Install Scriptable from the App Store.
2. Open Scriptable.
3. Tap `+` to create a new script.
4. Name it `NoA Pipeline`.
5. Paste the contents of `widgets/scriptable-noa-pipeline-widget.js`.
6. Tap `Done`.

## Add to iPhone Lock Screen

1. Lock the iPhone.
2. Long press the Lock Screen.
3. Tap `Customize`.
4. Choose `Lock Screen`.
5. Tap the widget area.
6. Add a Scriptable widget.
7. Tap the newly added Scriptable widget.
8. Set `Script` to `NoA Pipeline`.
9. Use the circular widget for total active pipeline tasks, or rectangular for one count circle per status.
10. Tap `Done`.

## Refresh Behaviour

The widget asks iOS to refresh every 4 hours. iOS may delay widget refreshes depending on battery, network, and system scheduling.

## Widget Layouts

- Circular: one total active task counter.
- Rectangular: four compact circles, one each for `NS`, `IP`, `RR`, and `FD`.
- Inline: text-only summary, if iOS offers that placement.

If it looks stale:

1. Open Scriptable.
2. Run `NoA Pipeline` manually once.
3. Return to the Lock Screen.

## Security

This is intentionally read-only and public-safe. The endpoint only returns aggregate counts:

```json
{
  "type": "noa-pipeline-widget",
  "total": 12,
  "counts": [
    { "id": "not-started", "label": "Not Started", "count": 3 }
  ]
}
```

Do not change the widget script to use authenticated NoA endpoints unless you are comfortable storing credentials on the phone.
