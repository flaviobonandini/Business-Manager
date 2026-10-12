<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { authFetch } from '../utils/authFetch'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const isView = computed(() =>
  route.name === 'invoice-view'
)

const isEdit = computed(() =>
  route.name === 'invoice-edit'
)

const isNew = computed(() =>
  !isView.value && !isEdit.value
)

const loading = ref(true)
const error = ref('')
const notificationMessage = ref('')
const notificationType = ref('success')
let notificationTimer = null

const clients = ref([])
const paymentMethods = ref([])
const invoiceDetails = ref(null)
const productQuantityDiscounts = ref([])

const invoice = ref({
  invoice_number: '',
  invoice_date: new Date().toISOString().substring(0, 10),
  payment_due_date: '',
  payment_method_id: '',
  document_type: 'INVOICE',
  client_id: '',
  status: 'DRAFT',
  notes: '',
})

const products = ref([])

const items = ref([
  {
    product_id: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    vat_rate: 22,
  }
])

function addItem() {
  items.value.push({
    product_id: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    vat_rate: 22,
  })
}

function removeItem(index) {
  if (items.value.length === 1) {
    return
  }

  items.value.splice(index, 1)
}

function selectProduct(item) {
  const product = products.value.find(
    p => Number(p.id) === Number(item.product_id)
  )

  if (!product) {
    return
  }

  item.description = product.nome || ''
  item.unit_price = Number(product.prezzo) || 0
  item.vat_rate = Number(product.aliquota_iva) || 0
}

function discountPercent(item) {
  if (isView.value && item.discount_percent !== undefined) {
    return Number(item.discount_percent) || 0
  }

  const quantity = Number(item.quantity) || 0
  const tier = productQuantityDiscounts.value.find(discount => {
    if (Number(discount.product_id) !== Number(item.product_id)) {
      return false
    }

    const minQty = Number(discount.min_qty)
    const maxQty = discount.max_qty === null
      ? null
      : Number(discount.max_qty)

    return quantity >= minQty && (maxQty === null || quantity <= maxQty)
  })

  return tier ? Number(tier.discount_percent) || 0 : 0
}

function grossTaxableAmount(item) {
  return Math.round(
    (Number(item.quantity) || 0) *
    (Number(item.unit_price) || 0) *
    100
  ) / 100
}

function discountAmount(item) {
  return Math.round(
    grossTaxableAmount(item) * discountPercent(item)
  ) / 100
}

function taxableAmount(item) {
  if (isView.value && item.taxable_amount !== undefined) {
    return Number(item.taxable_amount) || 0
  }

  return (
    grossTaxableAmount(item) - discountAmount(item)
  )
}

function vatAmount(item) {
  if (isView.value && item.vat_amount !== undefined) {
    return Number(item.vat_amount) || 0
  }

  return Math.round((
    taxableAmount(item) *
    (Number(item.vat_rate) || 0) /
    100
  ) * 100) / 100
}

function itemTotal(item) {
  if (isView.value && item.total_amount !== undefined) {
    return Number(item.total_amount) || 0
  }

  return Math.round(
    (taxableAmount(item) + vatAmount(item)) * 100
  ) / 100
}

const invoiceTaxable = computed(() =>
  Math.round(items.value.reduce(
    (total, item) => total + taxableAmount(item),
    0
  ) * 100) / 100
)

const invoiceVat = computed(() =>
  Math.round(items.value.reduce(
    (total, item) => total + vatAmount(item),
    0
  ) * 100) / 100
)

const invoiceTotal = computed(() =>
  Math.round((invoiceTaxable.value + invoiceVat.value) * 100) / 100
)

function formatCurrency(value) {
  return Number(value || 0).toLocaleString(
    'it-IT',
    {
      style: 'currency',
      currency: 'EUR',
    }
  )
}

function formatPrintDate(value) {
  if (!value) {
    return '-'
  }

  return String(value).substring(0, 10).split('-').reverse().join('/')
}

function formatPrintVatRate(value) {
  return `${Number(value || 0).toLocaleString('it-IT')}%`
}

function printInvoice() {
  window.print()
}

async function loadData() {
  try {

    loading.value = true
    error.value = ''

    const [
    clientsResponse,
    paymentsResponse,
    productsResponse,
    discountsResponse
    ] = await Promise.all([
    authFetch('/api/data'),
    authFetch('/api/payment-methods'),
    authFetch('/api/products'),
    authFetch('/api/product-quantity-discounts'),
    ])

    const productsData =
        await productsResponse.json()

    const clientsData =
      await clientsResponse.json()

    const paymentsData =
      await paymentsResponse.json()

    const discountsData =
      await discountsResponse.json()

    if (!clientsResponse.ok) {
      throw new Error(
        clientsData.message ||
        'Error loading customers'
      )
    }

    if (!paymentsResponse.ok) {
      throw new Error(
        paymentsData.message ||
        'Error loading payment methods'
      )
    }

    if (!productsResponse.ok) {
        throw new Error(
            productsData.message ||
            'Error loading products'
        )
    }

    if (!discountsResponse.ok) {
      throw new Error(
        discountsData.message ||
        'Error loading quantity discounts'
      )
    }

    clients.value = clientsData
    products.value = productsData
    productQuantityDiscounts.value = discountsData

    paymentMethods.value =
      paymentsData.filter(
        payment => Boolean(payment.active)
      )

  } catch (err) {

    console.error(
      'Errore caricamento dati fattura:',
      err
    )

    error.value = err.message

  } finally {

    loading.value = false
  }
}

async function loadInvoice(id = route.params.id, force = false) {

  if (!id || (isNew.value && !force)) {
    return
  }

  try {

    const response = await authFetch(
      `/api/invoices/${id}`
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Error loading invoice'
      )
    }

    console.log(
      'Fattura caricata:',
      data
    )

    invoiceDetails.value = data

    // TESTATA

    invoice.value = {
      invoice_number:
        data.invoice_number || '',

      invoice_date:
        data.invoice_date
          ? String(data.invoice_date).substring(0, 10)
          : '',

      payment_due_date:
        data.payment_due_date
          ? String(data.payment_due_date).substring(0, 10)
          : '',

      payment_method_id:
        data.payment_method_id || '',

      document_type:
        data.document_type || 'INVOICE',

      client_id:
        data.client_id || '',

      status:
        data.status || 'DRAFT',

      notes:
        data.notes || ''
    }

    // RIGHE

    items.value = data.items.map(item => ({
      id: item.id,

      product_id:
        item.product_id || '',

      description:
        item.description || '',

      quantity:
        Number(item.quantity) || 0,

      unit_price:
        Number(item.unit_price) || 0,

      discount_percent:
        Number(item.discount_percent) || 0,

      vat_rate:
        Number(item.vat_rate) || 0,

      taxable_amount:
        Number(item.taxable_amount) || 0,

      vat_amount:
        Number(item.vat_amount) || 0,

      total_amount:
        Number(item.total_amount) || 0
    }))

  } catch (err) {

    console.error(
      'Errore caricamento fattura:',
      err
    )

    error.value =
      err.message ||
      'Error loading invoice'
  }
}

function cancel() {
  router.push('/invoices')
}

const saving = ref(false)

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

async function saveInvoice() {

  try {

    saving.value = true
    error.value = ''

    const payload = {

        ...(isEdit.value && {
            invoice_number:
            invoice.value.invoice_number
        }),

      invoice_date:
        invoice.value.invoice_date,

      payment_due_date:
        invoice.value.payment_due_date || null,

      payment_method_id:
        invoice.value.payment_method_id || null,

      document_type:
        invoice.value.document_type,

      client_id:
        invoice.value.client_id,

      status:
        invoice.value.status,

      notes:
        invoice.value.notes,

      items: items.value.map((item, index) => ({
        product_id:
          item.product_id || null,

        description:
          item.description,

        quantity:
          Number(item.quantity),

        unit_price:
          Number(item.unit_price),

        vat_rate:
          Number(item.vat_rate),

        sort_order:
          index
      }))
    }

    console.log(
      'Invio fattura:',
      payload
    )

    const url = isEdit.value
      ? `/api/invoices/${route.params.id}`
      : '/api/invoices'

    const method = isEdit.value
      ? 'PUT'
      : 'POST'

    const response =
      await authFetch(
        url,
        {
          method,

          headers: {
            'Content-Type': 'application/json'
          },

          body:
            JSON.stringify(payload)
        }
      )

    const data =
      await response.json()

    if (!response.ok) {

      throw new Error(
        data.message ||
        'Error saving invoice'
      )
    }

    console.log(
      isEdit.value
        ? 'Fattura modificata:'
        : 'Fattura creata:',
      data
    )

    showNotification(
      isEdit.value
        ? 'Invoice updated successfully'
        : 'Invoice created successfully',
      'success',
      1800
    )

    await wait(900)

    await router.push(
      `/invoices/view/${data.id}`
    )

    await loadInvoice(data.id, true)

  } catch (err) {

    console.error(
      'Errore salvataggio fattura:',
      err
    )

    error.value =
      err.message ||
      'Error saving invoice'

    showNotification(
      error.value,
      'error'
    )

  } finally {

    saving.value = false
  }
}

onMounted(async () => {

  await loadData()

  if (!isNew.value) {
    await loadInvoice()
  }

})

onUnmounted(() => {
  if (notificationTimer) {
    clearTimeout(notificationTimer)
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

    <div class="page-header">

    <div>
        <h1>
        {{
            isView
            ? 'View invoice'
            : isEdit
                ? 'Edit invoice'
                : 'New invoice'
        }}
        </h1>

        <p v-if="!isNew">
        Invoice {{ invoice.invoice_number }}
        </p>

        <p v-if="invoiceDetails?.owner_name || invoiceDetails?.owner_username">
        Owner: {{ invoiceDetails.owner_name || invoiceDetails.owner_username }}
        </p>

        <p v-if="isNew">
        Enter invoice details
        </p>
    </div>

    <button
        type="button"
        class="back-button"
        @click="router.push('/invoices')"
    >
        ← Back to invoices
    </button>

    </div>

    <div v-if="isView" class="print-toolbar">
    <button
      type="button"
      class="print-button"
      @click="printInvoice"
    >
      Print invoice
    </button>
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
        class="invoice-form"
        @submit.prevent="saveInvoice"
    >

      <!-- DATI DOCUMENTO -->

      <div class="section">

        <h2>Document details</h2>

        <div class="form-row">

            <div class="form-group">

            <label>
                Invoice number
            </label>

            <input
                v-if="isNew"
                type="text"
                value="Automatically assigned on save"
                disabled
            />

            <input
                v-else
                v-model="invoice.invoice_number"
                type="text"
                disabled
            />

            </div>

          <div class="form-group">

            <label>
              Document type
            </label>

            <select
              v-model="invoice.document_type"
              :disabled="isView"
            >

              <option value="Invoice">
                Invoice
              </option>
              <option value="Quote">
                Quote
              </option>
              <option value="Delivery note">
                Delivery note
              </option>
            </select>

          </div>

        </div>


        <div class="form-row">

          <div class="form-group">

            <label>
              Invoice date *
            </label>

            <input
              v-model="invoice.invoice_date"
              type="date"
              required
              :disabled="isView"
            />

          </div>

          <div class="form-group">

            <label>
              Due date
            </label>

            <input
              v-model="invoice.payment_due_date"
              type="date"
              :disabled="isView"
            />

          </div>

        </div>

      </div>


      <!-- CLIENTE -->

      <div class="section">

        <h2>Customer</h2>

        <div class="form-group">

          <label>
            Customer *
          </label>

          <select
            v-model="invoice.client_id"
            required
            :disabled="isView"
          >

            <option value="">
              Select a customer...
            </option>

            <option
              v-for="client in clients"
              :key="client.id"
              :value="client.id"
            >
              {{ client.codice_cliente }}
              -
              {{ client.ragione_sociale }}
            </option>

          </select>

        </div>

      </div>


      <!-- PAGAMENTO -->

      <div class="section">

        <h2>Payment</h2>

        <div class="form-row">

          <div class="form-group">

            <label>
              Payment method
            </label>

            <select
              v-model="invoice.payment_method_id"
              :disabled="isView"
            >

              <option value="">
                Select...
              </option>

              <option
                v-for="payment in paymentMethods"
                :key="payment.id"
                :value="payment.id"
              >
                {{ payment.name }}
              </option>

            </select>

          </div>


          <div class="form-group">

            <label>
              Status
            </label>

            <select
              v-model="invoice.status"
              :disabled="isView"
            >

              <option value="DRAFT">
                Draft
              </option>

              <option value="ISSUED">
                Issued
              </option>

              <option value="PAID">
                Paid
              </option>

              <option value="CANCELLED">
                Cancelled
              </option>

            </select>

          </div>

        </div>

      </div>

        <!-- RIGHE FATTURA -->

        <div class="section invoice-items-section">

        <div class="section-header">

            <div class="section-title">
            <span class="section-icon">▦</span>
            <h2>Invoice items</h2>
            </div>

            <button
            v-if="!isView"
            type="button"
            class="add-row-button"
            @click="addItem"
            >
            + Add item
            </button>

        </div>


        <div class="items-table">

            <table>

            <thead>
                <tr>
                <th class="product-column">Product</th>
                <th class="description-column">Description</th>
                <th class="quantity-column">Qty</th>
                <th class="price-column">Price (€)</th>
                <th class="vat-column">VAT %</th>
                <th class="vat-column">Discount %</th>
                <th class="amount-column">Discount (€)</th>
                <th class="amount-column">Taxable amount (€)</th>
                <th class="amount-column">Total (€)</th>
                <th
                    v-if="!isView"
                    class="actions-column"
                >
                    Actions
                </th>
                </tr>
            </thead>

            <tbody>

                <tr
                v-for="(item, index) in items"
                :key="index"
                >

                <!-- PRODOTTO -->

                <td>

                    <select
                    v-model="item.product_id"
                    :disabled="isView"
                    @change="selectProduct(item)"
                    >
                    <option value="">
                        Select...
                    </option>

                    <option
                        v-for="product in products"
                        :key="product.id"
                        :value="product.id"
                    >
                        {{ product.codice }} - {{ product.nome }}
                    </option>

                    </select>

                </td>


                <!-- DESCRIZIONE -->

                <td>

                    <input
                    v-model="item.description"
                    type="text"
                    placeholder="Description"
                    readonly
                    />

                </td>


                <!-- QUANTITÀ -->

                <td>

                    <input
                    v-model.number="item.quantity"
                    type="number"
                    min="1"
                    step="1"
                    :disabled="isView"
                    />

                </td>


                <!-- PREZZO -->

                <td>

                    <input
                    v-model.number="item.unit_price"
                    type="number"
                    min="0"
                    step="0.01"
                    readonly
                    />

                </td>


                <!-- IVA -->

                <td>

                    <input
                    v-model.number="item.vat_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    readonly
                    />

                </td>

                <td class="readonly-amount">
                    {{ discountPercent(item).toLocaleString('it-IT') }}%
                </td>

                <td class="readonly-amount">
                    {{ formatCurrency(discountAmount(item)) }}
                </td>


                <!-- IMPONIBILE -->

                <td class="readonly-amount">
                    {{ formatCurrency(taxableAmount(item)) }}
                </td>


                <!-- TOTALE -->

                <td class="readonly-amount total-row">
                    {{ formatCurrency(itemTotal(item)) }}
                </td>


                <!-- AZIONI -->

                <td
                    v-if="!isView"
                    class="row-actions"
                >

                    <button
                    type="button"
                    class="remove-row-button"
                    title="Remove item"
                    :disabled="items.length === 1"
                    @click="removeItem(index)"
                    >
                    🗑️
                    </button>

                </td>

                </tr>

            </tbody>

            </table>

        </div>


        <!-- TOTALI -->

        <div class="invoice-totals-wrapper">

            <div class="invoice-totals">

            <div class="total-line">

                <span>
                Taxable amount
                </span>

                <strong>
                {{ formatCurrency(invoiceTaxable) }}
                </strong>

            </div>


            <div class="total-line">

                <span>
                VAT total
                </span>

                <strong>
                {{ formatCurrency(invoiceVat) }}
                </strong>

            </div>


            <div class="total-divider"></div>


            <div class="total-line grand-total">

                <span>
                Invoice total
                </span>

                <strong>
                {{ formatCurrency(invoiceTotal) }}
                </strong>

            </div>

            </div>

        </div>

        </div>


      <!-- NOTE -->

      <div class="section">

        <h2>Note</h2>

        <div class="form-group">

          <textarea
            v-model="invoice.notes"
            rows="4"
            placeholder="Invoice notes..."
          ></textarea>

        </div>

      </div>


      <!-- PULSANTI -->

        <div class="form-actions">

            <button
                type="button"
                class="cancel-button"
                @click="cancel"
            >
                Back
            </button>

            <button
                v-if="isView"
                type="button"
                class="next-button"
                @click="router.push(`/invoices/edit/${route.params.id}`)"
            >
                Edit
            </button>

            <button
                v-else
                type="button"
                class="next-button"
                :disabled="saving"
                @click="saveInvoice"
            >
                {{ saving ? 'Saving...' : (isEdit ? 'Save changes' : 'Save invoice') }}
            </button>

        </div>

    </form>

    <article
      v-if="isView && invoiceDetails"
      class="invoice-print"
    >
      <header class="print-header">
        <div>
          <h1>INVOICE</h1>
          <p>{{ invoice.document_type }}</p>
        </div>
        <div class="print-number">
          <span>Invoice no.</span>
          <strong>{{ invoice.invoice_number }}</strong>
        </div>
      </header>

      <section class="print-parties">
        <div>
          <h2>Bill to</h2>
          <strong>{{ invoiceDetails.ragione_sociale }}</strong>
          <p v-if="invoiceDetails.codice_cliente">
            Customer code: {{ invoiceDetails.codice_cliente }}
          </p>
          <p v-if="invoiceDetails.partita_iva">
            VAT number: {{ invoiceDetails.partita_iva }}
          </p>
          <p v-if="invoiceDetails.codice_fiscale">
            Tax code: {{ invoiceDetails.codice_fiscale }}
          </p>
          <p v-if="invoiceDetails.indirizzo">
            {{ invoiceDetails.indirizzo }}
          </p>
          <p>
            {{
              [
                invoiceDetails.zip_code,
                invoiceDetails.city,
                invoiceDetails.province
              ].filter(Boolean).join(' ')
            }}
          </p>
          <p v-if="invoiceDetails.country_name">
            {{ invoiceDetails.country_name }}
          </p>
        </div>

        <div>
          <h2>Ship to</h2>
          <strong>{{ invoiceDetails.ragione_sociale }}</strong>
          <p v-if="invoiceDetails.indirizzo_ship">
            {{ invoiceDetails.indirizzo_ship }}
          </p>
          <p v-if="invoiceDetails.indirizzo_ship || invoiceDetails.indirizzo">
            {{ invoiceDetails.indirizzo_ship || invoiceDetails.indirizzo }}
          </p>
          <p>
            {{
              [
                invoiceDetails.zip_code_ship || invoiceDetails.zip_code,
                invoiceDetails.city_ship || invoiceDetails.city,
                invoiceDetails.province_ship || invoiceDetails.province
              ].filter(Boolean).join(' ')
            }}
          </p>
          <p v-if="invoiceDetails.country_ship_name || invoiceDetails.country_name">
            {{ invoiceDetails.country_ship_name || invoiceDetails.country_name }}
          </p>
        </div>

        <dl class="print-metadata">
          <div v-if="invoiceDetails.owner_name || invoiceDetails.owner_username">
            <dt>Owner</dt>
            <dd>{{ invoiceDetails.owner_name || invoiceDetails.owner_username }}</dd>
          </div>
          <div>
            <dt>Invoice date</dt>
            <dd>{{ formatPrintDate(invoice.invoice_date) }}</dd>
          </div>
          <div v-if="invoice.payment_due_date">
            <dt>Due date</dt>
            <dd>{{ formatPrintDate(invoice.payment_due_date) }}</dd>
          </div>
          <div v-if="invoiceDetails.payment_method_name">
            <dt>Payment</dt>
            <dd>{{ invoiceDetails.payment_method_name }}</dd>
          </div>
        </dl>
      </section>

      <table class="print-items">
        <thead>
          <tr>
            <th>Qty</th>
            <th>Description</th>
            <th>Unit price</th>
            <th>Discount</th>
            <th>Discount amount</th>
            <th>VAT</th>
            <th>Taxable amount</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in items" :key="item.id || index">
            <td>{{ item.quantity }}</td>
            <td>{{ item.description }}</td>
            <td>{{ formatCurrency(item.unit_price) }}</td>
            <td>{{ formatPrintVatRate(item.discount_percent) }}</td>
            <td>{{ formatCurrency(discountAmount(item)) }}</td>
            <td>{{ formatPrintVatRate(item.vat_rate) }}</td>
            <td>{{ formatCurrency(item.taxable_amount ?? taxableAmount(item)) }}</td>
          </tr>
        </tbody>
      </table>

      <section class="print-summary">
        <div>
          <span>Taxable amount</span>
          <strong>{{ formatCurrency(invoiceDetails.taxable_amount) }}</strong>
        </div>
        <div>
          <span>VAT total</span>
          <strong>{{ formatCurrency(invoiceDetails.vat_amount) }}</strong>
        </div>
        <div class="print-grand-total">
          <span>TOTAL</span>
          <strong>{{ formatCurrency(invoiceDetails.total_amount) }}</strong>
        </div>
      </section>

      <section v-if="invoice.notes" class="print-notes">
        <h2>Note</h2>
        <p>{{ invoice.notes }}</p>
      </section>
    </article>

  </div>

</template>

<style scoped>

.page {
  width: 100%;
  padding: 30px;
  box-sizing: border-box;
}

.print-toolbar {
  display: flex;
  justify-content: flex-end;
  margin: -10px 0 20px;
}

.print-button {
  padding: 10px 16px;
  border: 0;
  border-radius: 6px;
  background: #2563eb;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.invoice-print {
  display: none;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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

.invoice-form {
  width: 100%;
}

.section {
  margin-bottom: 20px;
  padding: 25px;

  background: white;
  border-radius: 10px;

  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.1);
}

.section h2 {
  margin: 0 0 20px;

  font-size: 18px;
  color: #111827;

  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 12px;
}

.form-row {
  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;

  margin-bottom: 18px;
}

.form-group label {
  margin-bottom: 7px;

  color: #374151;

  font-size: 14px;
  font-weight: 600;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;

  padding: 11px 12px;

  box-sizing: border-box;

  border: 1px solid #d1d5db;
  border-radius: 8px;

  background: white;

  color: #374151;
  font-size: 14px;

  outline: none;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #2563eb;
}

.form-group textarea {
  resize: vertical;
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

  padding-bottom: 30px;
}

.cancel-button,
.next-button {
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

.next-button {
  background: #2563eb;
  color: white;
}

.next-button:hover {
  background: #1d4ed8;
}

.back-button {
  padding: 10px 16px;

  background: white;
  color: #374151;

  border: 1px solid #d1d5db;
  border-radius: 6px;

  font-size: 14px;
  font-weight: 600;

  cursor: pointer;
}

.back-button:hover {
  background: #f3f4f6;
}

.section-title h2 {
  margin: 0;
  padding: 0;
  border: 0;
}

/* =====================================================
   RIGHE FATTURA - STILE DEFINITIVO
===================================================== */

.invoice-items-section {
  padding: 24px;
  background: #ffffff;
  border-radius: 10px;
}

.invoice-items-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  margin-bottom: 20px;
  padding-bottom: 14px;

  border-bottom: 1px solid #e5e7eb;
}

.invoice-items-section .section-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.invoice-items-section .section-title h2 {
  margin: 0;
  padding: 0;
  border: 0;

  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.invoice-items-section .section-icon {
  font-size: 20px;
  color: #2563eb;
}


/* AGGIUNGI RIGA */

.invoice-items-section .add-row-button {
  padding: 10px 16px;

  border: none;
  border-radius: 7px;

  background: #2563eb;
  color: #ffffff;

  font-weight: 600;
  font-size: 14px;

  cursor: pointer;
}

.invoice-items-section .add-row-button:hover {
  background: #1d4ed8;
}


/* TABELLA */

.invoice-items-section .items-table {
  width: 100%;
  overflow-x: auto;

  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.invoice-items-section .items-table table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.invoice-items-section .items-table th {
  padding: 12px 10px;

  background: #f3f4f6;

  border-bottom: 1px solid #e5e7eb;

  font-size: 13px;
  font-weight: 600;
  color: #374151;

  text-align: left;
}

.invoice-items-section .items-table td {
  padding: 8px 6px;

  border-bottom: 1px solid #e5e7eb;

  vertical-align: middle;
}

.invoice-items-section .items-table tbody tr:last-child td {
  border-bottom: none;
}


/* INPUT E SELECT */

.invoice-items-section .items-table input,
.invoice-items-section .items-table select {
  width: 100%;
  height: 38px;

  padding: 7px 9px;

  box-sizing: border-box;

  border: 1px solid #d1d5db;
  border-radius: 6px;

  background: #ffffff;

  color: #374151;
  font-size: 14px;
}

.invoice-items-section .items-table input:focus,
.invoice-items-section .items-table select:focus {
  outline: none;
  border-color: #2563eb;
}

.invoice-items-section .items-table input:disabled,
.invoice-items-section .items-table select:disabled {
  background: #f9fafb;
  color: #374151;
  opacity: 1;
}


/* COLONNE */

.invoice-items-section .product-column {
  width: 18%;
}

.invoice-items-section .description-column {
  width: 20%;
}

.invoice-items-section .quantity-column {
  width: 8%;
}

.invoice-items-section .price-column {
  width: 12%;
}

.invoice-items-section .vat-column {
  width: 8%;
}

.invoice-items-section .amount-column {
  width: 12%;
}

.invoice-items-section .actions-column {
  width: 7%;
  text-align: center;
}


/* IMPORTI */

.invoice-items-section .readonly-amount {
  background: #f9fafb;

  text-align: right;

  font-weight: 500;

  white-space: nowrap;
}

.invoice-items-section .total-row {
  font-weight: 700;
}


/* AZIONI */

.invoice-items-section .row-actions {
  text-align: center;
}

.invoice-items-section .remove-row-button {
  width: 36px;
  height: 36px;

  padding: 0;

  border: 1px solid #ef4444;
  border-radius: 6px;

  background: #ffffff;

  cursor: pointer;
}

.invoice-items-section .remove-row-button:hover:not(:disabled) {
  background: #fee2e2;
}

.invoice-items-section .remove-row-button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}


/* TOTALI */

.invoice-items-section .invoice-totals-wrapper {
  display: flex;
  justify-content: flex-end;

  margin-top: 24px;
}

.invoice-items-section .invoice-totals {
  width: 420px;

  padding: 18px 22px;

  background: #eff6ff;

  border-radius: 8px;

  box-sizing: border-box;
}

.invoice-items-section .total-line {
  display: flex;
  justify-content: space-between;
  align-items: center;

  padding: 7px 0;

  font-size: 15px;
  color: #374151;
}

.invoice-items-section .total-divider {
  margin: 8px 0;

  border-top: 1px solid #bfdbfe;
}

.invoice-items-section .grand-total {
  font-size: 18px;
  font-weight: 700;
}

.invoice-items-section .grand-total strong {
  font-size: 22px;
  color: #2563eb;
}


/* RESPONSIVE */

@media (max-width: 900px) {

  .invoice-items-section .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .invoice-items-section .invoice-totals {
    width: 100%;
  }

}

@media (max-width: 700px) {

  .form-row {
    grid-template-columns: 1fr;
  }

}

@page {
  size: A4;
  margin: 16mm;
}

@media print {
  :global(body *) {
    visibility: hidden !important;
  }

  .invoice-print,
  .invoice-print * {
    visibility: visible !important;
  }

  .invoice-print {
    display: block !important;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    padding: 0;
    color: #111;
    background: white;
    font: 10pt Arial, sans-serif;
  }

  .print-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 1px solid #999;
  }

  .print-header h1 {
    margin: 0;
    font-size: 22pt;
  }

  .print-header p,
  .print-parties p,
  .print-notes p {
    margin: 4px 0;
  }

  .print-number {
    display: grid;
    gap: 4px;
    text-align: right;
  }

  .print-number strong {
    font-size: 14pt;
  }

  .print-parties {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    margin-bottom: 24px;
  }

  .print-parties h2,
  .print-notes h2 {
    margin: 0 0 8px;
    font-size: 10pt;
  }

  .print-parties p {
    font-size: 9pt;
  }

  .print-metadata {
    margin: 0;
  }

  .print-metadata div {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 5px;
  }

  .print-metadata dt {
    font-weight: 600;
  }

  .print-metadata dd {
    margin: 0;
    text-align: right;
  }

  .print-items {
    width: 100%;
    border-collapse: collapse;
  }

  .print-items th,
  .print-items td {
    padding: 8px;
    border: 1px solid #bbb;
  }

  .print-items th {
    background: #f1f1f1 !important;
    text-align: left;
  }

  .print-items th:first-child,
  .print-items td:first-child {
    width: 8%;
    text-align: center;
  }

  .print-items th:nth-child(n + 3),
  .print-items td:nth-child(n + 3) {
    text-align: right;
    white-space: nowrap;
  }

  .print-summary {
    width: 48%;
    margin: 12px 0 0 auto;
  }

  .print-summary div {
    display: flex;
    justify-content: space-between;
    padding: 5px 8px;
  }

  .print-summary .print-grand-total {
    margin-top: 4px;
    border: 1px solid #777;
    font-size: 13pt;
    font-weight: 700;
  }

  .print-notes {
    margin-top: 24px;
    break-inside: avoid;
  }
}

</style>
