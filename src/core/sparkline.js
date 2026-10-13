// Build a small SVG sparkline string from history points.
export function sparkline(points, { width = 160, height = 36, color = '#2563eb' } = {}) {
  if (!points || points.length < 2) return '';
  const xs = points.map(p => p.t), ys = points.map(p => p.p);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const sx = x => (x1 === x0 ? 0 : ((x - x0) / (x1 - x0)) * (width - 4) + 2);
  const sy = y => (y1 === y0 ? height / 2 : height - 2 - ((y - y0) / (y1 - y0)) * (height - 4));
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.t).toFixed(1)},${sy(p.p).toFixed(1)}`).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/></svg>`;
}
