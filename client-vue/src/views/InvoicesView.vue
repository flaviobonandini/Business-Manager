<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authFetch } from '../utils/authFetch'

const router = useRouter()

const invoices = ref([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const duplicatingId = ref(null)
const notificationMessage = ref('')
const notificationType = ref('success')
const confirmDialog = ref({
  show: false,
  title: '',
  message: '',
  confirmText: '',
  variant: 'primary',
  resolve: null,
})

let notificationTimer = null

const currentPage = ref(1)
const itemsPerPage = ref(10)

const sortColumn = ref('invoice_date')
const sortDirection = ref('desc')

async function loadInvoices() {
  try {
    loading.value = true
    error.value = ''

    const response = await authFetch('/api/invoices')

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message || 'Error loading invoices'
      )
    }

    invoices.value = data

  } catch (err) {
    console.error('Errore caricamento fatture:', err)
    error.value = err.message

  } finally {
    loading.value = false
  }
}

const filteredInvoices = computed(() => {
  const text = search.value.trim().toLowerCase()

  if (!text) {
    return invoices.value
  }

  return invoices.value.filter(invoice => {

    return [
      invoice.invoice_number,
      invoice.ragione_sociale,
      invoice.codice_cliente,
      invoice.owner_name,
      invoice.owner_username,
      invoice.document_type,
      invoice.payment_method,
      invoice.status,
      invoice.status_name,
    ]
      .some(value =>
        String(value || '')
          .toLowerCase()
          .includes(text)
      )
  })
})

const sortedInvoices = computed(() => {

  const data = [...filteredInvoices.value]

  data.sort((a, b) => {

    let valueA = a[sortColumn.value]
    let valueB = b[sortColumn.value]

    if (
      sortColumn.value === 'taxable_amount' ||
      sortColumn.value === 'vat_amount' ||
      sortColumn.value === 'total_amount'
    ) {
      valueA = Number(valueA || 0)
      valueB = Number(valueB || 0)
    } else {
      valueA = String(valueA || '').toLowerCase()
      valueB = String(valueB || '').toLowerCase()
    }

    if (valueA < valueB) {
      return sortDirection.value === 'asc' ? -1 : 1
    }

    if (valueA > valueB) {
      return sortDirection.value === 'asc' ? 1 : -1
    }

    return 0
  })

  return data
})

const totalPages = computed(() => {
  return Math.max(
    1,
    Math.ceil(
      sortedInvoices.value.length /
      itemsPerPage.value
    )
  )
})

const paginatedInvoices = computed(() => {

  const start =
    (currentPage.value - 1) *
    itemsPerPage.value

  return sortedInvoices.value.slice(
    start,
    start + itemsPerPage.value
  )
})

function sortBy(column) {

  if (sortColumn.value === column) {

    sortDirection.value =
      sortDirection.value === 'asc'
        ? 'desc'
        : 'asc'

  } else {

    sortColumn.value = column
    sortDirection.value = 'asc'
  }

  currentPage.value = 1
}

function sortIcon(column) {

  if (sortColumn.value !== column) {
    return ''
  }

  return sortDirection.value === 'asc'
    ? ' ↑'
    : ' ↓'
}

function formatDate(date) {

  if (!date) {
    return '-'
  }

  const value = new Date(date)

  return value.toLocaleDateString('it-IT')
}

function formatCurrency(value) {

  return Number(value || 0)
    .toLocaleString('it-IT', {
      style: 'currency',
      currency: 'EUR',
    })
}

function todayInputDate() {

  return new Date()
    .toISOString()
    .substring(0, 10)
}

function showNotification(
  message,
  type = 'success',
  duration = 3200
) {

  notificationMessage.value = message
  notificationType.value = type

  if (notificationTimer) {
    clearTimeout(notificationTimer)
  }

  notificationTimer = setTimeout(() => {
    notificationMessage.value = ''
    notificationTimer = null
  }, duration)
}

function closeNotification() {

  notificationMessage.value = ''

  if (notificationTimer) {
    clearTimeout(notificationTimer)
    notificationTimer = null
  }
}

function wait(ms) {

  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

function askConfirmation({
  title,
  message,
  confirmText,
  variant = 'primary',
}) {

  return new Promise(resolve => {
    confirmDialog.value = {
      show: true,
      title,
      message,
      confirmText,
      variant,
      resolve,
    }
  })
}

function closeConfirmDialog(result) {

  if (confirmDialog.value.resolve) {
    confirmDialog.value.resolve(result)
  }

  confirmDialog.value = {
    show: false,
    title: '',
    message: '',
    confirmText: '',
    variant: 'primary',
    resolve: null,
  }
}

function statusClass(status) {

  switch (String(status || '').toUpperCase()) {

    case 'PAID':
      return 'paid'

    case 'ISSUED':
      return 'issued'

    case 'CANCELLED':
      return 'cancelled'

    default:
      return 'draft'
  }
}

function formatStatus(status) {
  switch (String(status || '').toUpperCase()) {
    case 'DRAFT':
      return 'Draft'
    case 'ISSUED':
      return 'Issued'
    case 'PAID':
      return 'Paid'
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return status || '-'
  }
}

function printInvoices() {
  window.print()
}

function changePage(page) {

  if (
    page >= 1 &&
    page <= totalPages.value
  ) {
    currentPage.value = page
  }
}

async function deleteInvoice(invoice) {

  const confirmed = await askConfirmation({
    title: 'Delete invoice',
    message: `Are you sure you want to delete invoice ${invoice.invoice_number}?`,
    confirmText: 'Delete',
    variant: 'danger',
  })

  if (!confirmed) {
    return
  }

  try {

    error.value = ''

    const response = await authFetch(
      `/api/invoices/${invoice.id}`,
      {
        method: 'DELETE'
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Error deleting invoice'
      )
    }

    // Tolgo subito la fattura dalla lista
    invoices.value = invoices.value.filter(
      item => item.id !== invoice.id
    )

    // Se dopo l'eliminazione la pagina corrente
    // non esiste piÃ¹, torno alla precedente
    if (
      currentPage.value > 1 &&
      currentPage.value > totalPages.value
    ) {
      currentPage.value--
    }

    showNotification(
      'Invoice deleted successfully'
    )

  } catch (err) {

    console.error(
      'Errore eliminazione fattura:',
      err
    )

    error.value =
      err.message ||
      'Error deleting invoice'

    showNotification(
      error.value,
      'error'
    )
  }
}

async function duplicateInvoice(invoice) {

  const confirmed = await askConfirmation({
    title: 'Duplicate invoice',
    message: `Are you sure you want to duplicate invoice ${invoice.invoice_number}?`,
    confirmText: 'Duplicate',
  })

  if (!confirmed) {
    return
  }

  try {

    error.value = ''
    duplicatingId.value = invoice.id

    const originalResponse = await authFetch(
      `/api/invoices/${invoice.id}`
    )

    const original = await originalResponse.json()

    if (!originalResponse.ok) {
      throw new Error(
        original.message ||
        'Error loading invoice to duplicate'
      )
    }

    const payload = {
      invoice_date: todayInputDate(),
      payment_due_date: original.payment_due_date
        ? String(original.payment_due_date).substring(0, 10)
        : null,
      payment_method_id: original.payment_method_id || null,
      document_type: original.document_type || 'INVOICE',
      client_id: original.client_id,
      status: 'DRAFT',
      notes: original.notes || '',
      items: original.items.map((item, index) => ({
        product_id: item.product_id || null,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        vat_rate: Number(item.vat_rate),
        sort_order: item.sort_order ?? index,
      })),
    }

    const response = await authFetch(
      '/api/invoices',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Error duplicating invoice'
      )
    }

    showNotification(
      `Invoice duplicated successfully. New number: ${data.invoice_number}`,
      'success',
      1800
    )

    await wait(900)

    router.push(
      `/invoices/edit/${data.id}`
    )

  } catch (err) {

    console.error(
      'Errore duplicazione fattura:',
      err
    )

    error.value =
      err.message ||
      'Error duplicating invoice'

    showNotification(
      error.value,
      'error'
    )

  } finally {

    duplicatingId.value = null
  }
}


onMounted(() => {
  loadInvoices()
})

onUnmounted(() => {
  if (notificationTimer) {
    clearTimeout(notificationTimer)
  }

  if (confirmDialog.value.resolve) {
    confirmDialog.value.resolve(false)
  }
})
</script>

<template>

  <div class="page">

    <Transition name="toast">
      <div
        v-if="notificationMessage"
        class="notification-toast"
        :class="notificationType"
        role="status"
        aria-live="polite"
      >
        <span class="notification-icon">
          {{
            notificationType === 'success'
              ? '✓'
              : '!'
          }}
        </span>

        <span>
          {{ notificationMessage }}
        </span>

        <button
          type="button"
          class="notification-close"
          aria-label="Close notification"
          @click="closeNotification"
        >
          ×
        </button>
      </div>
    </Transition>

    <Teleport to="body">
      <div
        v-if="confirmDialog.show"
        class="confirm-overlay"
        @click="closeConfirmDialog(false)"
      >
        <div
          class="confirm-modal"
          role="dialog"
          aria-modal="true"
          @click.stop
        >
          <h2>
            {{ confirmDialog.title }}
          </h2>

          <p>
            {{ confirmDialog.message }}
          </p>

          <div class="confirm-actions">
            <button
              type="button"
              class="confirm-cancel"
              @click="closeConfirmDialog(false)"
            >
              Cancel
            </button>

            <button
              type="button"
              class="confirm-submit"
              :class="confirmDialog.variant"
              @click="closeConfirmDialog(true)"
            >
              {{ confirmDialog.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- HEADER -->

    <div class="page-header">
      <div>
        <h1>Invoices</h1>
        <p class="invoice-count">
        {{ filteredInvoices.length }}
        {{ filteredInvoices.length === 1 ? 'invoice' : 'invoices' }}
        </p>
      </div>

      <div class="header-actions">

        <div class="page-size">

          <span>Show</span>

          <select
            v-model.number="itemsPerPage"
            @change="currentPage = 1"
          >
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>

        </div>

        <input
          v-model="search"
          type="text"
          class="search-input"
          placeholder="Search invoices..."
          @input="currentPage = 1"
        />

        <button
          type="button"
          class="print-button"
          @click="printInvoices"
        >
          Print invoices
        </button>

        <button
          type="button"
          class="new-button"
          @click="router.push('/invoices/new')"
        >
          + New invoice
        </button>
      </div>

    </div>


    <!-- ERROR -->

    <div
      v-if="error"
      class="error-message"
    >
      {{ error }}
    </div>


    <!-- LOADING -->

    <div
      v-if="loading"
      class="loading"
    >
      Loading invoices...
    </div>


    <!-- TABELLA -->

    <div
      v-else
      class="table-container"
    >

      <table>

        <thead>

          <tr>

            <th
              @click="sortBy('invoice_number')"
            >
              Number{{ sortIcon('invoice_number') }}
            </th>

            <th
              @click="sortBy('invoice_date')"
            >
              Date{{ sortIcon('invoice_date') }}
            </th>

            <th
              @click="sortBy('ragione_sociale')"
            >
              Customer{{ sortIcon('ragione_sociale') }}
            </th>

            <th
              @click="sortBy('owner_name')"
            >
              Owner{{ sortIcon('owner_name') }}
            </th>

            <th
              @click="sortBy('document_type')"
            >
              Type{{ sortIcon('document_type') }}
            </th>

            <th
              @click="sortBy('payment_method')"
            >
              Payment Method{{ sortIcon('payment_method') }}
            </th>

            <th
              class="number"
              @click="sortBy('taxable_amount')"
            >
              Taxable amount{{ sortIcon('taxable_amount') }}
            </th>

            <th
              class="number"
              @click="sortBy('vat_amount')"
            >
              VAT{{ sortIcon('vat_amount') }}
            </th>

            <th
              class="number"
              @click="sortBy('total_amount')"
            >
              Total{{ sortIcon('total_amount') }}
            </th>

            <th
              @click="sortBy('status')"
            >
              Status{{ sortIcon('status') }}
            </th>

            <th class="actions-column">
              Actions
            </th>

          </tr>

        </thead>


        <tbody>

          <tr
            v-for="invoice in paginatedInvoices"
            :key="invoice.id"
          >

            <td class="invoice-number">
              {{ invoice.invoice_number }}
            </td>

            <td>
              {{ formatDate(invoice.invoice_date) }}
            </td>

            <td>

              <strong>
                {{ invoice.ragione_sociale }}
              </strong>

              <div class="client-code">
                {{ invoice.codice_cliente }}
              </div>

            </td>

            <td>
              {{ invoice.owner_name || invoice.owner_username || '-' }}
            </td>

            <td>
              {{ invoice.document_type }}
            </td>

            <td>
              {{ invoice.payment_method || '-' }}
            </td>

            <td class="number">
              {{ formatCurrency(invoice.taxable_amount) }}
            </td>

            <td class="number">
              {{ formatCurrency(invoice.vat_amount) }}
            </td>

            <td class="number total">
              {{ formatCurrency(invoice.total_amount) }}
            </td>

            <td>

              <span
                class="status"
                :class="statusClass(invoice.status)"
              >
                {{ formatStatus(invoice.status) }}
              </span>

            </td>

            <td class="actions">

              <button
                class="action-button view"
                title="View"
                @click="
                  router.push(
                    `/invoices/view/${invoice.id}`
                  )
                "
              >
                ðŸ‘ï¸
              </button>

              <button
                class="action-button edit"
                title="Edit"
                @click="
                  router.push(
                    `/invoices/edit/${invoice.id}`
                  )
                "
              >
                âœï¸
              </button>

              <button
                class="action-button copy"
                title="Duplicate"
                :disabled="duplicatingId === invoice.id"
                @click="duplicateInvoice(invoice)"
              >
                {{
                  duplicatingId === invoice.id
                    ? '...'
                    : '📋'
                }}
              </button>

                <button
                class="action-button delete"
                title="Delete"
                @click="deleteInvoice(invoice)"
                >
                ðŸ—‘ï¸
                </button>

            </td>

          </tr>


          <tr v-if="paginatedInvoices.length === 0">

            <td
              colspan="11"
              class="empty"
            >
              No invoices found
            </td>

          </tr>

        </tbody>

      </table>

    </div>


    <!-- PAGINAZIONE -->

    <div
      v-if="totalPages > 1"
      class="pagination"
    >

      <button
        :disabled="currentPage === 1"
        @click="changePage(currentPage - 1)"
      >
        â€¹
      </button>

      <button
        v-for="pageNumber in totalPages"
        :key="pageNumber"
        :class="{ active: pageNumber === currentPage }"
        @click="changePage(pageNumber)"
      >
        {{ pageNumber }}
      </button>

      <button
        :disabled="currentPage === totalPages"
        @click="changePage(currentPage + 1)"
      >
        â€º
      </button>

    </div>

  </div>

  <article class="invoices-print">
    <header class="invoices-print-header">
      <div>
        <h1>INVOICES</h1>
        <p>
          {{ sortedInvoices.length }} invoices
          <span v-if="search.trim()"> — Search: {{ search.trim() }}</span>
        </p>
      </div>
      <p>{{ new Date().toLocaleDateString('en-GB') }}</p>
    </header>

    <table>
      <thead>
        <tr>
          <th>Number</th>
          <th>Date</th>
          <th>Customer</th>
          <th>Owner</th>
          <th>Type</th>
          <th>Payment method</th>
          <th class="print-number">Taxable amount</th>
          <th class="print-number">VAT</th>
          <th class="print-number">Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="invoice in sortedInvoices" :key="invoice.id">
          <td>{{ invoice.invoice_number }}</td>
          <td>{{ formatDate(invoice.invoice_date) }}</td>
          <td>
            {{ invoice.ragione_sociale }}
            <span v-if="invoice.codice_cliente"> ({{ invoice.codice_cliente }})</span>
          </td>
          <td>{{ invoice.owner_name || invoice.owner_username || '-' }}</td>
          <td>{{ invoice.document_type || '-' }}</td>
          <td>{{ invoice.payment_method || '-' }}</td>
          <td class="print-number">{{ formatCurrency(invoice.taxable_amount) }}</td>
          <td class="print-number">{{ formatCurrency(invoice.vat_amount) }}</td>
          <td class="print-number">{{ formatCurrency(invoice.total_amount) }}</td>
          <td>{{ formatStatus(invoice.status) }}</td>
        </tr>
        <tr v-if="sortedInvoices.length === 0">
          <td colspan="10">No invoices found</td>
        </tr>
      </tbody>
    </table>
  </article>

</template>


<style scoped>

.page {
  width: 100%;
  padding: 30px;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  color: #111827;
}

.page-header p {
  margin: 5px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.new-button {
  padding: 10px 16px;
  border: 0;
  border-radius: 6px;
  background: #2563eb;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.new-button:hover {
  background: #1d4ed8;
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

.invoice-count {
  color: #6b7280;
  font-size: 14px;
  font-weight: 400;
}

.page-size {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  color: #111827;
}

.page-size select,
.search-input {
  padding: 9px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
}

.search-input {
  width: 220px;
  padding: 10px 12px;
  font-size: 14px;
}

.invoices-print {
  display: none;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 13px 12px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  white-space: nowrap;
}

th {
  background: #f9fafb;

  color: #374151;

  font-size: 13px;
  font-weight: 600;

  cursor: pointer;
}

td {
  color: #374151;
  font-size: 14px;
}

.number {
  text-align: right;
}

.total {
  font-weight: 700;
}

.invoice-number {
  font-weight: 600;
  color: #2563eb;
}

.client-code {
  margin-top: 3px;

  color: #9ca3af;
  font-size: 12px;
}

.status {
  display: inline-block;

  padding: 4px 9px;

  border-radius: 20px;

  font-size: 12px;
  font-weight: 600;
}

.status.draft {
  background: #e5e7eb;
  color: #374151;
}

.status.issued {
  background: #dbeafe;
  color: #1d4ed8;
}

.status.paid {
  background: #dcfce7;
  color: #166534;
}

.status.cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.actions-column {
  width: 160px;
  text-align: center;
  cursor: default;
}

.actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  height: 80px;
}

.action-button {
  width: 34px;
  height: 34px;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 0;

  border: 1px solid #d1d5db;
  border-radius: 6px;

  background: white;

  font-size: 0;

  cursor: pointer;
}

.action-button::before {
  font-size: 15px;
  line-height: 1;
}

.action-button.view::before {
  content: "\1F441";
}

.action-button.edit::before {
  content: "\270F\FE0F";
}

.action-button.copy::before {
  content: "\1F4CB";
}

.action-button.copy:disabled::before {
  content: "...";
}

.action-button.delete::before {
  content: "\1F5D1";
}

.action-button:hover {
  background: #f3f4f6;
}

.action-button.view:hover {
  border-color: #2563eb;
}

.action-button.edit:hover {
  border-color: #f59e0b;
}

.action-button.copy:hover {
  border-color: #6b7280;
}

.action-button.delete:hover {
  border-color: #dc2626;
}

.action-button:disabled {
  opacity: 0.5;

  cursor: not-allowed;
}

.notification-toast {
  position: fixed;
  top: 22px;
  right: 22px;
  z-index: 50;

  display: flex;
  align-items: center;

  gap: 10px;

  max-width: min(440px, calc(100vw - 32px));

  padding: 13px 14px;

  border-radius: 8px;

  box-shadow:
    0 12px 30px rgba(15, 23, 42, .14);

  font-size: 14px;
  font-weight: 600;
}

.notification-toast.success {
  border: 1px solid #bbf7d0;

  background: #f0fdf4;
  color: #166534;
}

.notification-toast.error {
  border: 1px solid #fecaca;

  background: #fef2f2;
  color: #991b1b;
}

.notification-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  flex: 0 0 auto;

  width: 22px;
  height: 22px;

  border-radius: 999px;

  color: white;

  font-size: 14px;
  font-weight: 800;
}

.notification-toast.success .notification-icon {
  background: #22c55e;
}

.notification-toast.error .notification-icon {
  background: #ef4444;
}

.notification-close {
  margin-left: 6px;
  padding: 2px 6px;

  border: 0;
  border-radius: 6px;

  background: transparent;
  color: inherit;

  font-size: 18px;
  line-height: 1;

  cursor: pointer;
}

.notification-close:hover {
  background: rgba(0, 0, 0, .06);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity .18s ease,
    transform .18s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 24px;

  background: rgba(17, 24, 39, .45);
}

.confirm-modal {
  width: min(420px, 100%);

  padding: 22px;

  border-radius: 8px;

  background: white;

  box-shadow:
    0 20px 50px rgba(15, 23, 42, .25);
}

.confirm-modal h2 {
  margin: 0 0 10px;

  color: #111827;

  font-size: 18px;
}

.confirm-modal p {
  margin: 0;

  color: #4b5563;

  font-size: 14px;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;

  gap: 10px;

  margin-top: 22px;
}

.confirm-cancel,
.confirm-submit {
  padding: 10px 16px;

  border-radius: 7px;

  font-weight: 600;

  cursor: pointer;
}

.confirm-cancel {
  border: 1px solid #d1d5db;

  background: white;
  color: #374151;
}

.confirm-cancel:hover {
  background: #f3f4f6;
}

.confirm-submit {
  border: 1px solid #2563eb;

  background: #2563eb;
  color: white;
}

.confirm-submit:hover {
  background: #1d4ed8;
}

.confirm-submit.danger {
  border-color: #dc2626;

  background: #dc2626;
}

.confirm-submit.danger:hover {
  background: #b91c1c;
}

.error-message {
  margin-bottom: 15px;
  padding: 12px;

  border-radius: 7px;

  background: #fee2e2;
  color: #991b1b;
}

.loading,
.empty {
  padding: 30px;
  text-align: center;
  color: #6b7280;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 5px;

  margin-top: 20px;
}

.pagination button {
  min-width: 36px;
  padding: 8px 10px;

  border: 1px solid #d1d5db;
  border-radius: 6px;

  background: white;

  cursor: pointer;
}

.pagination button.active {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-width: 800px) {

  .page {
    padding: 20px;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 15px;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .search-input {
    flex: 1;
    min-width: 180px;
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

  .invoices-print,
  .invoices-print * {
    visibility: visible !important;
  }

  .invoices-print {
    display: block !important;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    color: #111;
    background: white;
    font: 9pt Arial, sans-serif;
  }

  .invoices-print-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #999;
  }

  .invoices-print-header h1 {
    margin: 0;
    font-size: 18pt;
  }

  .invoices-print-header p {
    margin: 5px 0 0;
  }

  .invoices-print table {
    width: 100%;
    border-collapse: collapse;
  }

  .invoices-print th,
  .invoices-print td {
    padding: 6px 7px;
    border: 1px solid #bbb;
    text-align: left;
    vertical-align: top;
  }

  .invoices-print th {
    background: #f3f4f6 !important;
    font-weight: 700;
  }

  .invoices-print .print-number {
    text-align: right;
    white-space: nowrap;
  }

  .invoices-print tr {
    break-inside: avoid;
  }
}

</style>
