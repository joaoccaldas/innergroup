const charts = new Map();

export function clearCharts() {
  for (const chart of charts.values()) chart.destroy();
  charts.clear();
}
