<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authFetch } from '../../utils/authFetch'

const route = useRoute()
const router = useRouter()

const paymentId = route.params.id

const isView = computed(
  () => route.name === 'settings-payment-view'
)

const isEdit = computed(
  () => route.name === 'settings-payment-edit'
)

const isNew = computed(
  () => route.name === 'settings-payment-new'
)

const loading = ref(false)
const saving = ref(false)
const error = ref('')

const payment = ref({
  code: '',
  name: '',
  active: true,
  sort_order: 0,
})

const pageTitle = computed(() => {
  if (isView.value) {
    return 'View payment method'
  }

  if (isEdit.value) {
    return 'Edit payment method'
  }

  return 'New payment method'
})

async function loadPayment() {
  if (isNew.value) {
    return
  }

  try {
    loading.value = true
    error.value = ''

    const response = await authFetch(
      `/api/payment-methods/${paymentId}`
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Failed to load.'
      )
    }

    payment.value = {
      code: data.code || '',
      name: data.name || '',
      active: Boolean(data.active),
      sort_order: Number(data.sort_order) || 0,
    }

  } catch (err) {
    console.error(
      'Failed to load payment method:',
      err
    )

    error.value = err.message

  } finally {
    loading.value = false
  }
}

async function savePayment() {
  if (isView.value) {
    return
  }

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

    const url = isEdit.value
      ? `/api/payment-methods/${paymentId}`
      : '/api/payment-methods'

    const method = isEdit.value
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

    alert(
      isEdit.value
        ? 'Payment method updated successfully.'
        : 'Payment method created successfully.'
    )

    router.push('/settings/payments')

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

function editPayment() {
  router.push(
    `/settings/payments/edit/${paymentId}`
  )
}

function cancel() {
  router.push('/settings/payments')
}

onMounted(() => {
  loadPayment()
})
</script>

<template>
  <div class="page">

    <div class="page-header">
      <div>
        <h1>{{ pageTitle }}</h1>

        <p v-if="isView">
          Payment method details
        </p>

        <p v-else-if="isEdit">
          Edit payment method details
        </p>

        <p v-else>
          Enter payment method details
        </p>
      </div>
    </div>

    <div
      v-if="error"
      class="error-message"
    >
      {{ error }}
    </div>

    <div
      v-if="loading"
      class="loading"
    >
      Loading...
    </div>

    <form
      v-else
      class="payment-form"
      @submit.prevent="savePayment"
    >

      <div class="form-row">

        <div class="form-group">
          <label>Code *</label>

          <input
            v-model="payment.code"
            type="text"
            :disabled="isView"
            required
          />
        </div>

        <div class="form-group">
          <label>Order</label>

          <input
            v-model.number="payment.sort_order"
            type="number"
            min="0"
            :disabled="isView"
          />
        </div>

      </div>

      <div class="form-group">
        <label>Description *</label>

        <input
          v-model="payment.name"
          type="text"
          :disabled="isView"
          required
        />
      </div>

      <div class="form-group">

        <label class="checkbox-label">

          <input
            v-model="payment.active"
            type="checkbox"
            :disabled="isView"
          />

          <span>
            Payment method is active
          </span>

        </label>

      </div>

      <div class="form-actions">

        <button
          type="button"
          class="cancel-button"
          @click="cancel"
        >
          {{ isView ? 'Back' : 'Cancel' }}
        </button>

        <button
          v-if="isView"
          type="button"
          class="edit-button"
          @click="editPayment"
        >
          Edit
        </button>

        <button
          v-else
          type="submit"
          class="save-button"
          :disabled="saving"
        >
          {{ saving ? 'Saving...' : 'Save' }}
        </button>

      </div>

    </form>

  </div>
</template>

<style scoped>
.page {
  width: 100%;
  padding: 30px;
  box-sizing: border-box;
}

.page-header {
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

.payment-form {
  width: 100%;
  padding: 25px;

  box-sizing: border-box;

  background: white;
  border-radius: 10px;

  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;

  margin-bottom: 20px;
}

.form-group > label:not(.checkbox-label) {
  margin-bottom: 7px;

  color: #374151;

  font-size: 14px;
  font-weight: 600;
}

.form-group input[type="text"],
.form-group input[type="number"] {
  padding: 11px 12px;

  border: 1px solid #d1d5db;
  border-radius: 8px;

  font-size: 14px;

  outline: none;
}

.form-group input:focus {
  border-color: #2563eb;
}

.form-group input:disabled {
  background: #f3f4f6;
  color: #6b7280;

  cursor: not-allowed;
}

.checkbox-label {
  display: flex;
  flex-direction: row;
  align-items: center;

  gap: 9px;

  color: #374151;

  font-size: 14px;
  font-weight: 600;

  cursor: pointer;
}

.checkbox-label input {
  width: 17px;
  height: 17px;
}

.error-message {
  margin-bottom: 18px;
  padding: 12px 15px;

  border-radius: 8px;

  background: #fee2e2;
  color: #991b1b;
}

.loading {
  padding: 25px;

  color: #6b7280;
}

.form-actions {
  display: flex;
  justify-content: flex-end;

  gap: 10px;

  margin-top: 10px;
}

.cancel-button,
.save-button,
.edit-button {
  padding: 11px 18px;

  border: 0;
  border-radius: 8px;

  font-weight: 600;

  cursor: pointer;
}

.cancel-button {
  background: #e5e7eb;
  color: #374151;
}

.cancel-button:hover {
  background: #d1d5db;
}

.save-button,
.edit-button {
  background: #2563eb;
  color: white;
}

.save-button:hover,
.edit-button:hover {
  background: #1d4ed8;
}

.save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 700px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>