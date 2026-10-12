<script setup>
import { computed, onMounted, ref } from 'vue'
import { authFetch } from '../utils/authFetch'

const dashboard = ref(null)
const error = ref('')
const loading = ref(true)

const chartColors = ['#93c5fd', '#99f6e4', '#fde68a', '#ddd6fe', '#fecaca']
const statusColors = {
  DRAFT: '#cbd5e1',
  ISSUED: '#93c5fd',
  PAID: '#99f6e4',
  CANCELLED: '#fecaca',
}

const monthlyPoints = computed(() => {
  const monthlyInvoices = dashboard.value?.charts?.monthlyInvoices || []
  const byMonth = new Map(
    monthlyInvoices.map(item => [item.month.substring(0, 7), item])
  )
  const now = new Date()

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthData = byMonth.get(key)

    return {
      key,
      label: date.toLocaleString('en', { month: 'short' }),
      revenue: Number(monthData?.revenue || 0),
      count: Number(monthData?.count || 0),
    }
  })
})

const monthlyMaxRevenue = computed(() =>
  Math.max(1, ...monthlyPoints.value.map(point => point.revenue))
)

const monthlyChartPoints = computed(() =>
  monthlyPoints.value.map((point, index) => ({
    ...point,
    x: 44 + index * 94,
    y: 176 - (point.revenue / monthlyMaxRevenue.value) * 146,
  }))
)

const monthlyPolyline = computed(() =>
  monthlyChartPoints.value.map(point => `${point.x},${point.y}`).join(' ')
)

const statusSegments = computed(() => {
  const statuses = dashboard.value?.charts?.invoiceStatuses || []
  const total = statuses.reduce((sum, item) => sum + item.count, 0)
  let start = 0

  return statuses.map(item => {
    const percentage = total ? (item.count / total) * 100 : 0
    const segment = {
      ...item,
      label: formatStatus(item.status),
      color: statusColors[item.status] || '#64748b',
      start,
      end: start + percentage,
      percentage,
    }
    start += percentage
    return segment
  })
})

const statusDonutStyle = computed(() => {
  if (!statusSegments.value.length) {
    return { background: '#e5e7eb' }
  }

  const stops = statusSegments.value
    .map(segment =>
      `${segment.color} ${segment.start}% ${segment.end}%`
    )
    .join(', ')

  return { background: `conic-gradient(${stops})` }
})

const invoiceCount = computed(() =>
  statusSegments.value.reduce((total, segment) => total + segment.count, 0)
)

const topProducts = computed(() =>
  dashboard.value?.charts?.topProducts || []
)

const maxProductQuantity = computed(() =>
  Math.max(1, ...topProducts.value.map(product => product.quantity))
)

const topClients = computed(() =>
  dashboard.value?.charts?.topClients || []
)

const maxClientRevenue = computed(() =>
  Math.max(1, ...topClients.value.map(client => client.revenue))
)

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
}

function formatQuantity(value) {
  return Number(value || 0).toLocaleString('en-GB')
}

function formatStatus(status) {
  const labels = {
    DRAFT: 'Draft',
    ISSUED: 'Issued',
    PAID: 'Paid',
    CANCELLED: 'Cancelled',
  }

  return labels[status] || status
}

function printDashboard() {
  window.print()
}

onMounted(async () => {
  try {
    const response = await authFetch('/api/dashboard')

    if (!response.ok) {
      throw new Error('Failed to load the dashboard')
    }

    dashboard.value = await response.json()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="dashboard">
    <div class="dashboard-header">
      <div>
        <h1>Dashboard</h1>
        <p>Overview</p>
      </div>
      <button
        type="button"
        class="print-button"
        @click="printDashboard"
      >
        Print dashboard
      </button>
    </div>

    <div v-if="loading" class="loading">
      Loading...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <template v-else-if="dashboard">
      <div class="cards">
        <div class="card">
          <div class="card-title">Clients</div>
          <div class="card-value">{{ dashboard.clients }}</div>
          <div class="card-footer">Registered clients</div>
        </div>

        <div class="card">
          <div class="card-title">Products</div>
          <div class="card-value">{{ dashboard.products }}</div>
          <div class="card-footer">
            {{ dashboard.activeProducts }} active ·
            {{ dashboard.inactiveProducts }} inactive
          </div>
        </div>

        <div class="card">
          <div class="card-title">Users</div>
          <div class="card-value">{{ dashboard.users }}</div>
          <div class="card-footer">
            {{ dashboard.activeUsers }} active ·
            {{ dashboard.inactiveUsers }} inactive
          </div>
        </div>

        <div class="card warning">
          <div class="card-title">Low stock</div>
          <div class="card-value">{{ dashboard.lowStock }}</div>
          <div class="card-footer">Products to review</div>
        </div>
      </div>

      <section class="charts-grid" aria-label="Business charts">
        <article class="chart-card">
          <div class="chart-heading">
            <div>
              <h2>Monthly revenue</h2>
              <p>Last 6 months · excluding cancelled invoices</p>
            </div>
            <span class="chart-key"><i></i> Revenue</span>
          </div>

          <div class="chart-content line-chart">
            <svg viewBox="0 0 560 220" role="img" aria-label="Monthly revenue line chart">
              <line x1="44" y1="30" x2="514" y2="30" class="grid-line" />
              <line x1="44" y1="103" x2="514" y2="103" class="grid-line" />
              <line x1="44" y1="176" x2="514" y2="176" class="grid-line" />
              <text x="38" y="34" text-anchor="end" class="axis-label">
                {{ formatCurrency(monthlyMaxRevenue) }}
              </text>
              <text x="38" y="180" text-anchor="end" class="axis-label">€0</text>
              <polyline
                :points="monthlyPolyline"
                fill="none"
                stroke="#93c5fd"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <g v-for="point in monthlyChartPoints" :key="point.key">
                <circle :cx="point.x" :cy="point.y" r="4" class="line-point" />
                <text :x="point.x" y="205" text-anchor="middle" class="axis-label">
                  {{ point.label }}
                </text>
                <title>{{ point.label }}: {{ formatCurrency(point.revenue) }}</title>
              </g>
            </svg>
          </div>
          <table class="chart-data-table">
            <thead>
              <tr><th>Month</th><th>Invoices</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              <tr v-for="point in monthlyPoints" :key="point.key">
                <td>{{ point.label }}</td>
                <td>{{ point.count }}</td>
                <td>{{ formatCurrency(point.revenue) }}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="chart-card">
          <div class="chart-heading">
            <div>
              <h2>Invoices by status</h2>
              <p>All invoices</p>
            </div>
          </div>

          <div class="chart-content donut-layout">
            <div
              v-if="statusSegments.length"
              class="donut-chart"
              :style="statusDonutStyle"
              role="img"
              :aria-label="`Invoice status distribution: ${invoiceCount} invoices`"
            >
              <div class="donut-hole">
                <strong>{{ invoiceCount }}</strong>
                <span>Invoices</span>
              </div>
            </div>
            <p v-else class="empty-chart">No invoice data available</p>
          </div>
          <table v-if="statusSegments.length" class="chart-data-table">
            <thead>
              <tr><th>Status</th><th>Invoices</th><th>Share</th></tr>
            </thead>
            <tbody>
              <tr v-for="segment in statusSegments" :key="segment.status">
                <td>
                  <span class="table-label">
                    <i :style="{ background: segment.color }"></i>
                    {{ segment.label }}
                  </span>
                </td>
                <td>{{ segment.count }}</td>
                <td>{{ segment.percentage.toFixed(0) }}%</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="chart-card">
          <div class="chart-heading">
            <div>
              <h2>Top-selling products</h2>
              <p>Issued and paid invoices · quantity</p>
            </div>
          </div>

          <div v-if="topProducts.length" class="chart-content horizontal-bars">
            <div v-for="(product, index) in topProducts" :key="product.id" class="bar-row">
              <span class="bar-label" :title="product.name">{{ product.name }}</span>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  :style="{
                    width: `${(product.quantity / maxProductQuantity) * 100}%`,
                    background: chartColors[index % chartColors.length],
                  }"
                ></div>
              </div>
              <strong class="bar-value">{{ formatQuantity(product.quantity) }}</strong>
            </div>
          </div>
          <p v-else class="empty-chart">No sales data available</p>
          <table v-if="topProducts.length" class="chart-data-table">
            <thead>
              <tr><th>Product</th><th>Quantity sold</th></tr>
            </thead>
            <tbody>
              <tr v-for="product in topProducts" :key="product.id">
                <td>{{ product.name }}</td>
                <td>{{ formatQuantity(product.quantity) }}</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article class="chart-card">
          <div class="chart-heading">
            <div>
              <h2>Top customers</h2>
              <p>Issued and paid invoice revenue</p>
            </div>
          </div>

          <div v-if="topClients.length" class="chart-content column-chart">
            <div
              v-for="(client, index) in topClients"
              :key="client.id"
              class="column-item"
              :title="`${client.name}: ${formatCurrency(client.revenue)}`"
            >
              <strong class="column-value">{{ formatCurrency(client.revenue) }}</strong>
              <div class="column-track">
                <div
                  class="column-fill"
                  :style="{
                    height: `${(client.revenue / maxClientRevenue) * 100}%`,
                    background: chartColors[index % chartColors.length],
                  }"
                ></div>
              </div>
              <span class="column-label">{{ client.name }}</span>
            </div>
          </div>
          <p v-else class="empty-chart">No customer revenue data available</p>
          <table v-if="topClients.length" class="chart-data-table">
            <thead>
              <tr><th>Customer</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              <tr v-for="client in topClients" :key="client.id">
                <td>{{ client.name }}</td>
                <td>{{ formatCurrency(client.revenue) }}</td>
              </tr>
            </tbody>
          </table>
        </article>
      </section>
    </template>
  </main>
</template>

<style scoped>
.dashboard {
  width: 100%;
  padding: 30px;
  box-sizing: border-box;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 25px;
}

.print-button {
  padding: 10px 16px;
  border: 1px solid #2563eb;
  border-radius: 6px;
  background: white;
  color: #2563eb;
  font-weight: 600;
  cursor: pointer;
}

.print-button:hover {
  background: #eff6ff;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 30px;
  color: #1f2937;
}

.dashboard-header p {
  margin: 5px 0 0;
  color: #6b7280;
}

.cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.card,
.chart-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.card {
  padding: 22px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}

.card-value {
  margin: 12px 0;
  color: #111827;
  font-size: 36px;
  font-weight: bold;
}

.card-footer {
  color: #6b7280;
  font-size: 13px;
}

.warning {
  border-left: 4px solid #f59e0b;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.chart-card {
  min-width: 0;
  min-height: 310px;
  padding: 20px;
}

.chart-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.chart-heading h2 {
  margin: 0;
  color: #1f2937;
  font-size: 16px;
}

.chart-heading p {
  margin: 5px 0 0;
  color: #6b7280;
  font-size: 12px;
}

.chart-key,
.legend-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #6b7280;
  font-size: 12px;
}

.chart-key i,
.legend-label i {
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  border-radius: 50%;
  background: #2563eb;
}

.chart-content {
  height: 235px;
}

.line-chart svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.grid-line {
  stroke: #e5e7eb;
  stroke-dasharray: 4 4;
}

.axis-label {
  fill: #6b7280;
  font-size: 11px;
}

.line-point {
  fill: white;
  stroke: #2563eb;
  stroke-width: 3;
}

.donut-layout {
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  gap: 18px;
}

.donut-chart {
  display: grid;
  width: 176px;
  height: 176px;
  flex: 0 0 176px;
  place-items: center;
  border-radius: 50%;
}

.donut-hole {
  display: flex;
  width: 112px;
  height: 112px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  background: white;
}

.donut-hole strong {
  color: #111827;
  font-size: 26px;
}

.donut-hole span {
  color: #6b7280;
  font-size: 12px;
}

.chart-legend {
  display: grid;
  gap: 13px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.chart-legend li {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.horizontal-bars {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
}

.bar-row {
  display: grid;
  grid-template-columns: minmax(90px, 1fr) minmax(80px, 2fr) 42px;
  align-items: center;
  gap: 12px;
}

.bar-label,
.column-label {
  overflow: hidden;
  color: #4b5563;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bar-track {
  height: 14px;
  overflow: hidden;
  border-radius: 8px;
  background: #f3f4f6;
}

.bar-fill {
  height: 100%;
  min-width: 2px;
  border-radius: inherit;
  transition: width 0.3s ease;
}

.bar-value {
  color: #374151;
  font-size: 12px;
  text-align: right;
}

.column-chart {
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  gap: 10px;
  padding-top: 6px;
}

.column-item {
  display: grid;
  min-width: 0;
  flex: 1;
  grid-template-rows: 24px 1fr 34px;
  justify-items: center;
  gap: 7px;
}

.column-value {
  color: #4b5563;
  font-size: 11px;
  white-space: nowrap;
}

.column-track {
  display: flex;
  width: min(44px, 70%);
  height: 100%;
  align-items: flex-end;
  overflow: hidden;
  border-radius: 6px 6px 0 0;
  background: #f3f4f6;
}

.column-fill {
  width: 100%;
  min-height: 3px;
  border-radius: 6px 6px 0 0;
  transition: height 0.3s ease;
}

.column-label {
  width: 100%;
  text-align: center;
}

.chart-data-table {
  width: 100%;
  margin-top: 12px;
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  color: #475569;
  font-size: 12px;
}

.chart-data-table th,
.chart-data-table td {
  padding: 8px 10px;
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.chart-data-table th:last-child,
.chart-data-table td:last-child {
  border-right: 0;
  text-align: right;
}

.chart-data-table tbody tr:last-child td {
  border-bottom: 0;
}

.chart-data-table th {
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
}

.table-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.table-label i {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
}

.empty-chart {
  display: grid;
  height: 195px;
  place-items: center;
  margin: 0;
  color: #9ca3af;
  font-size: 14px;
}

.loading {
  padding: 20px 0;
  color: #6b7280;
}

.error {
  padding: 15px;
  border-radius: 6px;
  background: #fee2e2;
  color: #991b1b;
}

@media (max-width: 1100px) {
  .cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .dashboard {
    padding: 15px;
  }

  .cards {
    grid-template-columns: 1fr;
  }

  .chart-card {
    padding: 16px;
  }

  .donut-layout {
    gap: 12px;
  }

  .donut-chart {
    width: 140px;
    height: 140px;
    flex-basis: 140px;
  }

  .donut-hole {
    width: 92px;
    height: 92px;
  }

  .bar-row {
    grid-template-columns: minmax(72px, 1fr) minmax(50px, 1.6fr) 38px;
    gap: 8px;
  }
}

@page {
  size: A4 landscape;
  margin: 12mm;
}

@media print {
  :global(body *) {
    visibility: hidden !important;
  }

  .dashboard,
  .dashboard * {
    visibility: visible !important;
  }

  .dashboard {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    padding: 0;
    color: #111;
    background: white;
    font: 9pt Arial, sans-serif;
  }

  .dashboard-header {
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #999;
  }

  .dashboard-header h1 {
    font-size: 18pt;
  }

  .print-button {
    display: none !important;
  }

  .cards {
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 14px;
  }

  .card,
  .chart-card {
    box-shadow: none;
    break-inside: avoid;
  }

  .card {
    padding: 12px;
  }

  .card-value {
    margin: 7px 0;
    font-size: 24px;
  }

  .charts-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .chart-card {
    min-height: 0;
    padding: 12px;
  }

  .chart-content {
    height: 190px;
  }

  .chart-data-table {
    margin-top: 8px;
  }

  .chart-data-table th,
  .chart-data-table td {
    padding: 5px 7px;
  }
}
</style>
