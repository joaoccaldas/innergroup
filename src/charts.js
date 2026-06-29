const charts = new Map();

const palette = {
  forest: '#30483d', sage: '#8ea493', peach: '#e8a77b', sand: '#dfd2c0',
  good: '#477a5b', warn: '#b77932', bad: '#a94f45', ink: '#26372f', grid: 'rgba(38,55,47,.09)'
};

function removeChart(id) {
  const existing = charts.get(id);
  if (existing) existing.destroy();
  charts.delete(id);
}

function options(overrides = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { labels: { usePointStyle: true, boxWidth: 8, color: palette.ink } },
      tooltip: {
        callbacks: {
          label(context) {
            const value = Number(context.raw || 0).toLocaleString('sv-SE', { maximumFractionDigits: 0 });
            return `${context.dataset.label || ''}: ${value} SEK`;
          }
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: palette.ink } },
      y: { grid: { color: palette.grid }, ticks: { color: palette.ink, callback: value => `${Math.round(Number(value) / 1000)}k` } }
    },
    ...overrides
  };
}

export function renderLine(id, labels, datasets, overrides = {}) {
  removeChart(id);
  const canvas = document.getElementById(id);
  if (!canvas || !window.Chart) return;
  charts.set(id, new window.Chart(canvas, { type: 'line', data: { labels, datasets }, options: options(overrides) }));
}

export function renderBar(id, labels, datasets, overrides = {}) {
  removeChart(id);
  const canvas = document.getElementById(id);
  if (!canvas || !window.Chart) return;
  charts.set(id, new window.Chart(canvas, { type: 'bar', data: { labels, datasets }, options: options(overrides) }));
}

export function renderDoughnut(id, labels, values) {
  removeChart(id);
  const canvas = document.getElementById(id);
  if (!canvas || !window.Chart) return;
  charts.set(id, new window.Chart(canvas, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: [palette.forest, palette.peach, palette.sage, palette.sand, palette.warn, palette.good], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '67%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } } }
  }));
}

export function scenarioPalette() {
  return { downside: palette.bad, mostLikely: palette.warn, upside: palette.good };
}

export function clearCharts() {
  for (const id of [...charts.keys()]) removeChart(id);
}
