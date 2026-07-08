// NoA Pipeline Rings for Scriptable
// Lock Screen/Home Screen widget showing active CRM pipeline counts.

const ENDPOINT = 'https://no-a.vercel.app/api/notion-jobs?display=widget';
const REFRESH_HOURS = 4;
const STATUS_META = [
  { id: 'not-started', short: 'NS', color: '#60a5fa' },
  { id: 'in-progress', short: 'IP', color: '#34d399' },
  { id: 'ready-for-revision', short: 'RR', color: '#fbbf24' },
  { id: 'final-draft-notes', short: 'FD', color: '#c084fc' }
];

const report = await loadPipelineReport();
const widget = buildWidget(report);
widget.refreshAfterDate = new Date(Date.now() + REFRESH_HOURS * 60 * 60 * 1000);

Script.setWidget(widget);

if (!config.runsInWidget) {
  const family = config.widgetFamily || 'accessoryRectangular';
  if (family === 'accessoryCircular') {
    await widget.presentAccessoryCircular();
  } else if (family === 'accessoryInline') {
    await widget.presentAccessoryInline();
  } else if (family === 'accessoryRectangular') {
    await widget.presentAccessoryRectangular();
  } else {
    await widget.presentSmall();
  }
}

Script.complete();

async function loadPipelineReport() {
  const cache = getCache();
  try {
    const req = new Request(ENDPOINT);
    req.timeoutInterval = 12;
    const json = await req.loadJSON();
    if (json && Array.isArray(json.counts)) {
      writeCache(json);
      return json;
    }
    throw new Error('NoA returned an unexpected widget payload.');
  } catch (error) {
    if (cache) return { ...cache, stale: true };
    return {
      ok: false,
      total: 0,
      counts: STATUS_META.map((item) => ({ id: item.id, label: item.short, count: 0 })),
      error: error instanceof Error ? error.message : 'NoA widget sync failed.',
      stale: true
    };
  }
}

function buildWidget(report) {
  const widget = new ListWidget();
  widget.backgroundColor = new Color('#070b14');
  widget.url = 'https://no-a.vercel.app/';

  const family = config.widgetFamily || 'small';
  const isCircular = family === 'accessoryCircular';
  const isInline = family === 'accessoryInline';
  const isRectangular = family === 'accessoryRectangular';

  if (isInline) {
    const summary = normaliseCounts(report).map((item) => `${shortLabel(item)} ${item.count}`).join(' ');
    widget.addText(`NoA ${report.total || 0} | ${summary}`);
    return widget;
  }

  widget.setPadding(isCircular ? 0 : 8, isCircular ? 0 : 8, isCircular ? 0 : 8, isCircular ? 0 : 8);

  if (isCircular) {
    const img = widget.addImage(drawRings(report, 90, true));
    img.imageSize = new Size(58, 58);
    img.centerAlignImage();
    return widget;
  }

  if (isRectangular) {
    const row = widget.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    const img = row.addImage(drawRings(report, 112, false));
    img.imageSize = new Size(55, 55);
    row.addSpacer(8);
    const textStack = row.addStack();
    textStack.layoutVertically();
    const title = textStack.addText(`Pipeline ${report.total || 0}`);
    title.font = Font.boldSystemFont(12);
    title.textColor = Color.white();
    title.lineLimit = 1;
    const detail = textStack.addText(normaliseCounts(report).map((item) => `${shortLabel(item)} ${item.count}`).join('  '));
    detail.font = Font.mediumSystemFont(9);
    detail.textColor = new Color(report.stale ? '#fde68a' : '#b7c3d7');
    detail.lineLimit = 2;
    return widget;
  }

  const header = widget.addStack();
  header.layoutHorizontally();
  const title = header.addText('NoA Pipeline');
  title.font = Font.boldSystemFont(13);
  title.textColor = Color.white();
  header.addSpacer();
  const total = header.addText(String(report.total || 0));
  total.font = Font.boldSystemFont(18);
  total.textColor = Color.white();

  widget.addSpacer(8);
  const image = widget.addImage(drawRings(report, 220, false));
  image.imageSize = new Size(118, 118);
  image.centerAlignImage();
  widget.addSpacer(8);

  for (const item of normaliseCounts(report)) {
    const line = widget.addStack();
    line.layoutHorizontally();
    const label = line.addText(shortLabel(item));
    label.font = Font.mediumSystemFont(10);
    label.textColor = new Color(colorForId(item.id));
    line.addSpacer();
    const count = line.addText(String(item.count));
    count.font = Font.boldSystemFont(10);
    count.textColor = Color.white();
  }

  return widget;
}

function drawRings(report, size, compact) {
  const counts = normaliseCounts(report);
  const total = Number(report.total || counts.reduce((sum, item) => sum + item.count, 0));
  const maxCount = Math.max(1, ...counts.map((item) => item.count));
  const ctx = new DrawContext();
  ctx.size = new Size(size, size);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  const cx = size / 2;
  const cy = size / 2;
  const baseRadius = compact ? size * 0.39 : size * 0.42;
  const gap = compact ? 7 : 10;
  const width = compact ? 4.5 : 7;

  counts.forEach((item, index) => {
    const radius = baseRadius - index * gap;
    const rect = new Rect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.setStrokeColor(new Color('#293244', 0.86));
    ctx.setLineWidth(width);
    ctx.strokeEllipse(rect);
    const progress = item.count <= 0 ? 0 : Math.max(0.08, item.count / maxCount);
    drawArc(ctx, cx, cy, radius, -90, -90 + 360 * progress, new Color(colorForId(item.id)), width);
  });

  ctx.setTextAlignedCenter();
  ctx.setTextColor(Color.white());
  ctx.setFont(Font.boldSystemFont(compact ? 18 : 30));
  ctx.drawTextInRect(String(total), new Rect(0, cy - (compact ? 11 : 17), size, compact ? 24 : 36));
  ctx.setFont(Font.mediumSystemFont(compact ? 6 : 10));
  ctx.setTextColor(new Color(report.stale ? '#fde68a' : '#b7c3d7'));
  ctx.drawTextInRect(report.stale ? 'STALE' : 'CRM', new Rect(0, cy + (compact ? 8 : 17), size, compact ? 10 : 14));
  return ctx.getImage();
}

function drawArc(ctx, cx, cy, radius, startDeg, endDeg, color, width) {
  const path = new Path();
  const steps = Math.max(8, Math.ceil(Math.abs(endDeg - startDeg) / 8));
  for (let i = 0; i <= steps; i += 1) {
    const degrees = startDeg + ((endDeg - startDeg) * i) / steps;
    const radians = (degrees * Math.PI) / 180;
    const point = new Point(cx + Math.cos(radians) * radius, cy + Math.sin(radians) * radius);
    if (i === 0) path.move(point);
    else path.addLine(point);
  }
  ctx.addPath(path);
  ctx.setStrokeColor(color);
  ctx.setLineWidth(width);
  ctx.strokePath();
}

function normaliseCounts(report) {
  const source = Array.isArray(report.counts) ? report.counts : [];
  return STATUS_META.map((meta) => {
    const found = source.find((item) => item.id === meta.id || String(item.label || '').toLowerCase() === meta.id.replace(/-/g, ' '));
    return {
      id: meta.id,
      label: found?.label || meta.short,
      count: Number(found?.count || 0)
    };
  });
}

function shortLabel(item) {
  return STATUS_META.find((meta) => meta.id === item.id)?.short || item.label || '';
}

function colorForId(id) {
  return STATUS_META.find((item) => item.id === id)?.color || '#93c5fd';
}

function getCachePath() {
  const fm = FileManager.local();
  return fm.joinPath(fm.documentsDirectory(), 'noa-pipeline-widget-cache.json');
}

function getCache() {
  const fm = FileManager.local();
  const path = getCachePath();
  if (!fm.fileExists(path)) return null;
  try {
    return JSON.parse(fm.readString(path));
  } catch (_) {
    return null;
  }
}

function writeCache(json) {
  const fm = FileManager.local();
  fm.writeString(getCachePath(), JSON.stringify(json));
}
