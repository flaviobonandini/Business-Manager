<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { authFetch } from '../../utils/authFetch'

const paymentMethods = ref([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const search = ref('')
const successMessage = ref('')

const editingId = ref(null)
let successTimer = null

const payment = ref({
  code: '',
  name: '',
  active: true,
  sort_order: 0,
})


function showSuccess(message) {

  successMessage.value = message

  if (successTimer) {
    clearTimeout(successTimer)
  }

  successTimer = setTimeout(() => {
    successMessage.value = ''
    successTimer = null
  }, 3200)
}


function closeSuccess() {

  successMessage.value = ''

  if (successTimer) {
    clearTimeout(successTimer)
    successTimer = null
  }
}


/* =========================================
   CARICAMENTO
========================================= */

async function loadPaymentMethods() {

  try {

    loading.value = true
    error.value = ''

    const response = await authFetch(
      '/api/payment-methods'
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Failed to load payment methods.'
      )
    }

    paymentMethods.value = data

  } catch (err) {

    console.error(
      'Failed to load payment methods:',
      err
    )

    error.value = err.message

  } finally {

    loading.value = false
  }
}


/* =========================================
   RICERCA
========================================= */

const filteredPaymentMethods = computed(() => {

  const value = search.value
    .trim()
    .toLowerCase()

  if (!value) {
    return paymentMethods.value
  }

  return paymentMethods.value.filter(payment => {

    return (
      String(payment.id).includes(value) ||

      String(payment.code || '')
        .toLowerCase()
        .includes(value) ||

      String(payment.name || '')
        .toLowerCase()
        .includes(value)
    )
  })
})


/* =========================================
   NUOVO
========================================= */

function newPayment() {

  editingId.value = null
  error.value = ''

  payment.value = {
    code: '',
    name: '',
    active: true,
    sort_order: 0,
  }
}


/* =========================================
   MODIFICA
========================================= */

function editPayment(item) {

  editingId.value = item.id
  error.value = ''

  payment.value = {
    code: item.code || '',
    name: item.name || '',
    active: Boolean(item.active),
    sort_order: Number(item.sort_order) || 0,
  }
}


/* =========================================
   SALVA
========================================= */

async function savePayment() {

  try {

    error.value = ''

    if (!payment.value.code.trim()) {
      error.value = 'Code is required.'
      return
    }

    if (!payment.value.name.trim()) {
      error.value = 'Description is required.'
      return
    }

    saving.value = true

    const url = editingId.value
      ? `/api/payment-methods/${editingId.value}`
      : '/api/payment-methods'

    const method = editingId.value
      ? 'PUT'
      : 'POST'

    const response = await authFetch(url, {

      method,

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify(payment.value),

    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Failed to save.'
      )
    }

    showSuccess(
      editingId.value
        ? 'Payment method updated successfully.'
        : 'Payment method created successfully.'
    )

    newPayment()

    await loadPaymentMethods()

  } catch (err) {

    console.error(
      'Failed to save payment method:',
      err
    )

    error.value = err.message

  } finally {

    saving.value = false
  }
}


/* =========================================
   ATTIVA / DISATTIVA
========================================= */

async function toggleActive(item) {

  try {

    error.value = ''

    const payload = {
      code: item.code,
      name: item.name,
      sort_order: Number(item.sort_order) || 0,
      active: !Boolean(item.active),
    }

    const response = await authFetch(
      `/api/payment-methods/${item.id}`,
      {
        method: 'PUT',

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
        'Failed to update the status.'
      )
    }

    await loadPaymentMethods()

  } catch (err) {

    console.error(
      'Failed to update payment method status:',
      err
    )

    error.value = err.message
  }
}


onMounted(() => {
  loadPaymentMethods()
})


onUnmounted(() => {
  if (successTimer) {
    clearTimeout(successTimer)
  }
})
</script>


<template>

  <div class="page">

    <Transition name="toast">
      <div
        v-if="successMessage"
        class="success-toast"
        role="status"
        aria-live="polite"
      >
        <span class="success-icon">
          ✓
        </span>

        <span>
          {{ successMessage }}
        </span>

        <button
          type="button"
          class="success-close"
          aria-label="Close notification"
          @click="closeSuccess"
        >
          ×
        </button>
      </div>
    </Transition>

    <!-- HEADER -->

    <div class="page-header">

      <div>

        <h1>
          Payment methods
        </h1>

        <p>
          Manage payment methods
        </p>

      </div>

      <button
        type="button"
        class="new-button"
        @click="newPayment"
      >
        + New payment method
      </button>

    </div>


    <!-- ERRORE -->

    <div
      v-if="error"
      class="error-message"
    >
      {{ error }}
    </div>


    <!-- LAYOUT -->

    <div class="settings-layout">


      <!-- =========================
           SINISTRA - ELENCO
      ========================== -->

      <div class="section list-section">

        <div class="list-header">

          <div>

            <h2>
              Payment methods
            </h2>

            <span class="count">
              {{ filteredPaymentMethods.length }}
              {{
                filteredPaymentMethods.length === 1
                  ? 'payment method'
                  : 'payment methods'
              }}
            </span>

          </div>

          <input
            v-model="search"
            type="text"
            class="search-input"
            placeholder="Search..."
          />

        </div>


        <div
          v-if="loading"
          class="loading"
        >
          Loading...
        </div>


        <div
          v-else
          class="table-container"
        >

          <table>

            <thead>

              <tr>
                <th>Order</th>
                <th>Code</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>

            </thead>


            <tbody>

              <tr
                v-for="item in filteredPaymentMethods"
                :key="item.id"
                :class="{
                  'selected-row':
                    editingId === item.id
                }"
              >

                <td>
                  {{ item.sort_order }}
                </td>

                <td>

                  <span class="code">
                    {{ item.code }}
                  </span>

                </td>

                <td>
                  {{ item.name }}
                </td>

                <td>

                  <span
                    class="status"
                    :class="
                      item.active
                        ? 'active'
                        : 'inactive'
                    "
                  >
                    {{
                      item.active
                        ? 'Active'
                        : 'Inactive'
                    }}
                  </span>

                </td>


                <td class="actions">

                  <!-- MODIFICA -->

                  <button
                    type="button"
                    class="action-button"
                    title="Edit"
                    aria-label="Edit payment method"
                    @click="editPayment(item)"
                  >
                    ✏️
                  </button>


                  <!-- ATTIVA / DISATTIVA -->

                  <button
                    type="button"
                    class="action-button"
                    :title="
                      item.active
                        ? 'Deactivate'
                        : 'Activate'
                    "
                    :aria-label="
                      item.active
                        ? 'Deactivate payment method'
                        : 'Activate payment method'
                    "
                    @click="toggleActive(item)"
                  >
                    {{
                      item.active
                        ? '🔴'
                        : '🟢'
                    }}
                  </button>

                </td>

              </tr>


              <tr
                v-if="
                  filteredPaymentMethods.length === 0
                "
              >

                <td
                  colspan="5"
                  class="empty"
                >
                  No payment methods found
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>


      <!-- =========================
           DESTRA - FORM
      ========================== -->

      <div class="section form-section">

        <div class="form-title">

          <h2>
            {{
              editingId
                ? 'Edit payment method'
                : 'New payment method'
            }}
          </h2>

          <span
            v-if="editingId"
            class="editing-badge"
          >
            Editing
          </span>

        </div>


        <form
          @submit.prevent="savePayment"
        >


          <!-- CODICE -->

          <div class="form-group">

            <label>
              Code *
            </label>

            <input
              v-model="payment.code"
              type="text"
              placeholder="e.g. BB"
              required
            />

          </div>


          <!-- DESCRIZIONE -->

          <div class="form-group">

            <label>
              Description *
            </label>

            <input
              v-model="payment.name"
              type="text"
              placeholder="e.g. Bank transfer"
              required
            />

          </div>


          <!-- ORDINE -->

          <div class="form-group">

            <label>
              Order
            </label>

            <input
              v-model.number="payment.sort_order"
              type="number"
              min="0"
              step="1"
            />

          </div>


          <!-- ATTIVO -->

          <div class="form-group">

            <label class="checkbox-label">

              <input
                v-model="payment.active"
                type="checkbox"
              />

              <span>
                Payment method is active
              </span>

            </label>

          </div>


          <!-- PULSANTI -->

          <div class="form-actions">

            <button
              v-if="editingId"
              type="button"
              class="cancel-button"
              @click="newPayment"
            >
              Cancel
            </button>


            <button
              type="submit"
              class="save-button"
              :disabled="saving"
            >
              {{
                saving
                  ? 'Saving...'
                  : editingId
                    ? 'Save changes'
                    : 'Create payment method'
              }}
            </button>

          </div>

        </form>

      </div>

    </div>

  </div>

</template>


<style scoped>

.page {
  width: 100%;
  padding: 30px;
  box-sizing: border-box;
}


/* HEADER */

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  margin-bottom: 25px;
}

.page-header h1 {
  margin: 0;

  font-size: 28px;
  color: #111827;
}

.page-header p {
  margin: 6px 0 0;

  color: #6b7280;
}


/* LAYOUT */

.settings-layout {
  display: grid;

  grid-template-columns:
    minmax(0, 2fr)
    minmax(320px, 1fr);

  gap: 20px;

  align-items: start;
}


/* CARD */

.section {
  background: white;

  border-radius: 10px;

  box-shadow:
    0 1px 3px rgba(0, 0, 0, .1);
}


/* LISTA */

.list-section {
  overflow: hidden;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 20px;
}

.list-header h2 {
  margin: 0 0 4px;

  font-size: 18px;
  color: #111827;
}

.count {
  font-size: 13px;
  color: #6b7280;
}


/* RICERCA */

.search-input {
  width: 220px;

  padding: 9px 11px;

  box-sizing: border-box;

  border: 1px solid #d1d5db;
  border-radius: 7px;

  outline: none;
}

.search-input:focus {
  border-color: #2563eb;
}


/* TABELLA */

.table-container {
  overflow-x: auto;
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
}

th {
  background: #f9fafb;

  color: #374151;

  font-size: 13px;
  font-weight: 600;
}

td {
  color: #374151;

  font-size: 14px;
}

tbody tr:hover {
  background: #f9fafb;
}


/* RIGA SELEZIONATA */

.selected-row {
  background: #eff6ff !important;
}

.selected-row td:first-child {
  border-left: 3px solid #2563eb;
}


/* CODICE */

.code {
  font-family: monospace;

  font-weight: 700;

  color: #374151;
}


/* STATO */

.status {
  display: inline-block;

  padding: 4px 9px;

  border-radius: 999px;

  font-size: 12px;
  font-weight: 600;
}

.status.active {
  background: #dcfce7;
  color: #166534;
}

.status.inactive {
  background: #fee2e2;
  color: #991b1b;
}


/* AZIONI */

.actions {
  white-space: nowrap;
}

.action-button {
  padding: 6px 8px;

  border: 0;
  border-radius: 6px;

  background: transparent;

  cursor: pointer;
}

.action-button:hover {
  background: #e5e7eb;
}


/* FORM */

.form-section {
  padding: 22px;

  position: sticky;
  top: 20px;
}

.form-title {
  display: flex;
  justify-content: space-between;
  align-items: center;

  margin-bottom: 22px;

  padding-bottom: 14px;

  border-bottom: 1px solid #e5e7eb;
}

.form-title h2 {
  margin: 0;

  font-size: 18px;
  color: #111827;
}

.editing-badge {
  padding: 4px 9px;

  border-radius: 999px;

  background: #dbeafe;
  color: #1d4ed8;

  font-size: 12px;
  font-weight: 600;
}


/* CAMPI */

.form-group {
  display: flex;
  flex-direction: column;

  margin-bottom: 18px;
}

.form-group > label:not(.checkbox-label) {
  margin-bottom: 7px;

  color: #374151;

  font-size: 14px;
  font-weight: 600;
}

.form-group input[type="text"],
.form-group input[type="number"] {
  width: 100%;

  padding: 10px 11px;

  box-sizing: border-box;

  border: 1px solid #d1d5db;
  border-radius: 7px;

  font-size: 14px;

  outline: none;
}

.form-group input:focus {
  border-color: #2563eb;
}


/* CHECKBOX */

.checkbox-label {
  display: flex;
  align-items: center;

  gap: 8px;

  color: #374151;

  font-size: 14px;
  font-weight: 600;

  cursor: pointer;
}

.checkbox-label input {
  width: 17px;
  height: 17px;
}


/* PULSANTI */

.new-button,
.save-button {
  padding: 10px 16px;

  border: 0;
  border-radius: 7px;

  background: #2563eb;
  color: white;

  font-weight: 600;

  cursor: pointer;
}

.new-button:hover,
.save-button:hover {
  background: #1d4ed8;
}

.save-button:disabled {
  opacity: .6;

  cursor: not-allowed;
}

.cancel-button {
  padding: 10px 16px;

  border: 0;
  border-radius: 7px;

  background: #e5e7eb;
  color: #374151;

  font-weight: 600;

  cursor: pointer;
}

.cancel-button:hover {
  background: #d1d5db;
}

.form-actions {
  display: flex;
  justify-content: flex-end;

  gap: 10px;

  margin-top: 25px;
}


/* MESSAGGI */

.success-toast {
  position: fixed;
  top: 22px;
  right: 22px;
  z-index: 50;

  display: flex;
  align-items: center;

  gap: 10px;

  max-width: min(420px, calc(100vw - 32px));

  padding: 13px 14px;

  border: 1px solid #bbf7d0;
  border-radius: 8px;

  background: #f0fdf4;
  color: #166534;

  box-shadow:
    0 12px 30px rgba(15, 23, 42, .14);

  font-size: 14px;
  font-weight: 600;
}

.success-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  flex: 0 0 auto;

  width: 22px;
  height: 22px;

  border-radius: 999px;

  background: #22c55e;
  color: white;

  font-size: 14px;
  font-weight: 800;
}

.success-close {
  margin-left: 6px;
  padding: 2px 6px;

  border: 0;
  border-radius: 6px;

  background: transparent;
  color: #166534;

  font-size: 18px;
  line-height: 1;

  cursor: pointer;
}

.success-close:hover {
  background: #dcfce7;
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

.error-message {
  margin-bottom: 18px;

  padding: 12px 15px;

  border-radius: 8px;

  background: #fee2e2;
  color: #991b1b;
}

.loading,
.empty {
  padding: 25px;

  text-align: center;

  color: #6b7280;
}


/* RESPONSIVE */

@media (max-width: 1000px) {

  .settings-layout {
    grid-template-columns: 1fr;
  }

  .form-section {
    position: static;
  }

}

</style>
