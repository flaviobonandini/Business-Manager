<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { authFetch } from '../utils/authFetch'

const router = useRouter()

const products = ref([])
const loading = ref(true)
const error = ref('')

const search = ref('')
const itemsPerPage = ref(10)
const currentPage = ref(1)

const sortKey = ref('id')
const sortDirection = ref('asc')

const selectedImage = ref('')
const selectedProductName = ref('')
const showImageModal = ref(false)
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

const currentUser = JSON.parse(
  localStorage.getItem('user') || 'null'
)

const role = String(
  currentUser?.role || ''
).toLowerCase()

const isAdmin =
  role === 'admin' ||
  role === 'superadmin'

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

/* =========================================================
   CARICAMENTO PRODOTTI
========================================================= */

async function loadProducts() {
  try {
    loading.value = true
    error.value = ''

    const response = await authFetch('/api/products')

    if (!response.ok) {
      throw new Error('Failed to load products')
    }

    products.value = await response.json()

  } catch (err) {
    error.value = err.message

  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProducts()
})

onUnmounted(() => {
  if (notificationTimer) {
    clearTimeout(notificationTimer)
  }

  if (confirmDialog.value.resolve) {
    confirmDialog.value.resolve(false)
  }
})

/* =========================================================
   RESET PAGINA
========================================================= */

watch(search, () => {
  currentPage.value = 1
})

watch(itemsPerPage, () => {
  currentPage.value = 1
})

/* =========================================================
   RICERCA
========================================================= */

const filteredProducts = computed(() => {
  const text = search.value.toLowerCase().trim()

  if (!text) {
    return products.value
  }

  return products.value.filter((product) => {
    return Object.values(product).some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(text)
    )
  })
})

/* =========================================================
   ORDINAMENTO
========================================================= */

function sortBy(key) {
  if (sortKey.value === key) {
    sortDirection.value =
      sortDirection.value === 'asc'
        ? 'desc'
        : 'asc'
  } else {
    sortKey.value = key
    sortDirection.value = 'asc'
  }

  currentPage.value = 1
}

const sortedProducts = computed(() => {
  return [...filteredProducts.value].sort((a, b) => {
    let valueA = a[sortKey.value]
    let valueB = b[sortKey.value]

    valueA = valueA ?? ''
    valueB = valueB ?? ''

    if (
      !isNaN(Number(valueA)) &&
      !isNaN(Number(valueB)) &&
      valueA !== '' &&
      valueB !== ''
    ) {
      valueA = Number(valueA)
      valueB = Number(valueB)
    } else {
      valueA = String(valueA).toLowerCase()
      valueB = String(valueB).toLowerCase()
    }

    if (valueA < valueB) {
      return sortDirection.value === 'asc' ? -1 : 1
    }

    if (valueA > valueB) {
      return sortDirection.value === 'asc' ? 1 : -1
    }

    return 0
  })
})

/* =========================================================
   PAGINAZIONE
========================================================= */

const totalPages = computed(() => {
  return Math.ceil(
    filteredProducts.value.length /
    itemsPerPage.value
  )
})

const visibleProducts = computed(() => {
  const start =
    (currentPage.value - 1) *
    itemsPerPage.value

  const end =
    start + itemsPerPage.value

  return sortedProducts.value.slice(
    start,
    end
  )
})

function isLowStock(product) {
  return (
    Number(product.active) === 1 &&
    Number(product.quantita) <= Number(product.scorta_minima)
  )
}

function printProducts() {
  window.print()
}

function previousPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

function goToPage(page) {
  currentPage.value = page
}

/* =========================================================
   IMMAGINI
========================================================= */

function getProductImage(product) {
  if (!product.immagine) {
    return ''
  }

  // Se nel DB è già salvato il percorso completo
  if (product.immagine.startsWith('/uploads/')) {
    return product.immagine
  }

  // Altrimenti consideriamo immagine come nome file
  return `/uploads/products/${product.immagine}`
}

function openImageModal(product) {
  const image = getProductImage(product)

  if (!image) {
    return
  }

  selectedImage.value = image
  selectedProductName.value = product.nome
  showImageModal.value = true
}

function closeImageModal() {
  showImageModal.value = false
  selectedImage.value = ''
  selectedProductName.value = ''
}

async function deleteProduct(product) {

  const confirmed = await askConfirmation({
    title: 'Delete product',
    message: `Are you sure you want to delete the product "${product.nome}"?`,
    confirmText: 'Delete',
    variant: 'danger',
  })

  if (!confirmed) {
    return
  }

  try {

    const response = await authFetch(
      `/api/products/${product.id}`,
      {
        method: 'DELETE',
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.error ||
        'Error deleting product'
      )
    }

    // Tolgo il prodotto dalla tabella
    // senza ricaricare la pagina
    products.value = products.value.filter(
      (item) => item.id !== product.id
    )

    // Se abbiamo eliminato l'ultimo prodotto
    // della pagina, torniamo alla precedente
    if (
      currentPage.value > 1 &&
      visibleProducts.value.length === 0
    ) {
      currentPage.value--
    }

    showNotification(
      'Product deleted successfully'
    )

  } catch (err) {

    error.value = err.message

    showNotification(
      error.value,
      'error'
    )

  }
}

async function duplicateProduct(product) {

  const confirmed = await askConfirmation({
    title: 'Duplicate product',
    message: `Are you sure you want to duplicate the product "${product.nome}"?`,
    confirmText: 'Duplicate',
  })

  if (!confirmed) {
    return
  }

  try {

    const response = await authFetch(
      `/api/products/${product.id}/copy`,
      {
        method: 'POST',
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.error ||
        'Error duplicating product'
      )
    }

    showNotification(
      `Product duplicated successfully. New code: ${data.codice}`,
      'success',
      1800
    )

    await wait(900)

    // Apre direttamente il prodotto duplicato in modifica
    router.push(`/products/edit/${data.id}`)

  } catch (err) {

    error.value = err.message

    showNotification(
      error.value,
      'error'
    )

  }
}
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
          <span v-if="notificationType === 'success'">
            &#10003;
          </span>

          <span v-else>
            !
          </span>
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
          &times;
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
        <h1>Products</h1>

        <p class="product-count">
          {{ filteredProducts.length }} products
        </p>
      </div>


      <div class="header-actions">

        <!-- MOSTRA -->
        <div class="page-size">
          <span>Show</span>

          <select v-model.number="itemsPerPage">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </div>


        <!-- CERCA -->
        <input
          v-model="search"
          type="text"
          class="search-input"
          placeholder="Search products..."
        />

        <button
          type="button"
          class="print-button"
          @click="printProducts"
        >
          Print products
        </button>


        <!-- NUOVO -->
        <button
          type="button"
          class="new-button"
          @click="router.push('/products/new')"
        >
          + New product
        </button>

      </div>

    </div>


    <!-- LOADING -->
    <div v-if="loading">
      Loading...
    </div>


    <!-- ERRORE -->
    <div
      v-else-if="error"
      class="error"
    >
      {{ error }}
    </div>


    <!-- TABELLA -->
    <table v-else>

      <thead>
        <tr>

          <th
            class="sortable"
            @click="sortBy('id')"
          >
            ID
            <span v-if="sortKey === 'id'">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
          </th>


          <th
            class="sortable"
            @click="sortBy('codice')"
          >
            Code
            <span v-if="sortKey === 'codice'">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
          </th>


          <th>Image</th>


          <th
            class="sortable"
            @click="sortBy('nome')"
          >
            Name
            <span v-if="sortKey === 'nome'">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
          </th>


          <th
            class="sortable"
            @click="sortBy('categoria')"
          >
            Category
            <span v-if="sortKey === 'categoria'">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
          </th>


          <th
            class="sortable number-column"
            @click="sortBy('prezzo')"
          >
            Price
            <span v-if="sortKey === 'prezzo'">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
          </th>


          <th
            class="sortable number-column"
            @click="sortBy('quantita')"
          >
            Quantity
            <span v-if="sortKey === 'quantita'">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
          </th>


          <th
            class="sortable number-column"
            @click="sortBy('scorta_minima')"
          >
            Min. stock
            <span v-if="sortKey === 'scorta_minima'">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
          </th>


          <th
            class="sortable"
            @click="sortBy('active')"
          >
            Status
            <span v-if="sortKey === 'active'">
              {{ sortDirection === 'asc' ? '↑' : '↓' }}
            </span>
          </th>


          <th class="actions-column">
            Actions
          </th>

        </tr>
      </thead>


      <tbody>

        <tr
          v-for="product in visibleProducts"
          :key="product.id"
          :class="{ 'low-stock-row': isLowStock(product) }"
        >

          <td>
            {{ product.id }}
          </td>


          <td>
            {{ product.codice }}
          </td>


          <!-- IMMAGINE -->
          <td>
            <div class="product-image-cell">

              <img
                v-if="product.immagine"
                :src="getProductImage(product)"
                :alt="product.nome"
                class="product-image"
                title="Click to enlarge"
                @click="openImageModal(product)"
              />

              <span
                v-else
                class="no-image"
              >
                —
              </span>

            </div>
          </td>


          <td>
            {{ product.nome }}
          </td>


          <td>
            {{ product.categoria || '—' }}
          </td>


          <td class="number-column">
            {{
              Number(product.prezzo || 0)
                .toLocaleString(
                  'it-IT',
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )
            }}
            €
          </td>


          <td class="number-column">
            <span
              :class="{ 'low-stock-quantity': isLowStock(product) }"
            >
              {{ product.quantita }}
              {{ product.unita_misura }}
            </span>
            <span
              v-if="isLowStock(product)"
              class="low-stock-badge"
            >
              Low stock
            </span>
          </td>


          <td class="number-column">
            {{ product.scorta_minima }}
          </td>


          <td>
            <span
              class="status"
              :class="
                Number(product.active) === 1
                  ? 'active'
                  : 'inactive'
              "
            >
              {{
                Number(product.active) === 1
                  ? 'Active'
                  : 'Inactive'
              }}
            </span>
          </td>


          <!-- AZIONI -->
          <td class="actions-cell">

            <div class="actions">

            <button
              type="button"
              class="action-button view"
              title="View"
              @click="
                router.push(
                  `/products/view/${product.id}`
                )
              "
            >
              👁
            </button>


            <button
              type="button"
              class="action-button edit"
              title="Edit"
              @click="
                router.push(
                  `/products/edit/${product.id}`
                )
              "
            >
              ✏️
            </button>

            <button
              type="button"
              class="action-button copy"
              title="Duplicate"
              @click="duplicateProduct(product)"
            >
              📋
            </button>

            <button
              v-if="isAdmin"
              type="button"
              class="action-button delete"
              title="Delete"
              @click="deleteProduct(product)"
            >
              🗑
            </button>

            </div>
          </td>

        </tr>


        <!-- NESSUN RISULTATO -->
        <tr v-if="visibleProducts.length === 0">
          <td
            colspan="10"
            class="no-results"
          >
            No products found
          </td>
        </tr>

      </tbody>

    </table>


    <!-- PAGINAZIONE -->
    <div
      v-if="
        !loading &&
        !error &&
        totalPages > 1
      "
      class="pagination"
    >

      <button
        type="button"
        :disabled="currentPage === 1"
        @click="previousPage"
      >
        ← Previous
      </button>


      <button
        v-for="page in totalPages"
        :key="page"
        type="button"
        class="page-number"
        :class="{
          active: currentPage === page
        }"
        @click="goToPage(page)"
      >
        {{ page }}
      </button>


      <button
        type="button"
        :disabled="
          currentPage === totalPages
        "
        @click="nextPage"
      >
        Next →
      </button>

    </div>

  </div>

  <article class="products-print">
    <header class="products-print-header">
      <div>
        <h1>PRODUCTS</h1>
        <p>
          {{ filteredProducts.length }} products
          <span v-if="search.trim()"> — Search: {{ search.trim() }}</span>
        </p>
      </div>
      <p>{{ new Date().toLocaleDateString('en-GB') }}</p>
    </header>

    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Name</th>
          <th>Category</th>
          <th>Price</th>
          <th>Quantity</th>
          <th>Min. stock</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="product in sortedProducts"
          :key="product.id"
          :class="{ 'print-low-stock': isLowStock(product) }"
        >
          <td>{{ product.codice }}</td>
          <td>{{ product.nome }}</td>
          <td>{{ product.categoria || '—' }}</td>
          <td class="print-number">
            {{ Number(product.prezzo || 0).toLocaleString('en-GB', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) }} €
          </td>
          <td class="print-number">
            {{ product.quantita }} {{ product.unita_misura }}
          </td>
          <td class="print-number">{{ product.scorta_minima }}</td>
          <td>
            {{ Number(product.active) === 1 ? 'Active' : 'Inactive' }}
            <span v-if="isLowStock(product)"> (Low stock)</span>
          </td>
        </tr>
        <tr v-if="sortedProducts.length === 0">
          <td colspan="7">No products found</td>
        </tr>
      </tbody>
    </table>
  </article>


  <!-- MODALE IMMAGINE -->
  <Teleport to="body">

    <div
      v-if="showImageModal"
      class="image-modal"
      @click="closeImageModal"
    >

      <div
        class="image-modal-content"
        @click.stop
      >

        <button
          type="button"
          class="image-modal-close"
          title="Close"
          @click="closeImageModal"
        >
          ×
        </button>


        <div class="modal-product-name">
          {{ selectedProductName }}
        </div>


        <img
          :src="selectedImage"
          :alt="selectedProductName"
        />

      </div>

    </div>

  </Teleport>

</template>


<style scoped>
.page {
  width: 100%;
  padding: 30px;
}


/* HEADER */

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
}

.product-count {
  margin: 5px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-size {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
}

.page-size select {
  padding: 9px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
}

.search-input {
  width: 220px;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.search-input:focus,
.page-size select:focus {
  outline: none;
  border-color: #2563eb;
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

.products-print {
  display: none;
}


/* TABELLA */

table {
  width: 100%;
  background: white;

  border-collapse: collapse;

  border: 1px solid #e5e7eb;
}

th,
td {
  padding: 12px;

  border-bottom: 1px solid #e5e7eb;

  text-align: left;
  vertical-align: middle;
}

th {
  background: #f3f4f6;
  font-size: 14px;
}

td {
  font-size: 14px;
}

tbody tr:hover {
  background: #f9fafb;
}

tbody tr.low-stock-row {
  background: #fff7ed;
}

tbody tr.low-stock-row:hover {
  background: #ffedd5;
}

.low-stock-quantity {
  color: #c2410c;
  font-weight: 700;
}

.low-stock-badge {
  display: inline-block;
  margin-left: 6px;
  padding: 3px 7px;
  border-radius: 10px;
  background: #ffedd5;
  color: #9a3412;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.sortable:hover {
  background: #e5e7eb;
}

.number-column {
  text-align: right;
}


/* IMMAGINE */

.product-image-cell {
  width: 55px;
  height: 45px;

  display: flex;
  align-items: center;
  justify-content: center;
}

.product-image {
  max-width: 50px;
  max-height: 40px;

  object-fit: contain;

  border-radius: 4px;

  background: white;

  cursor: pointer;
}

.product-image:hover {
  opacity: 0.8;
}

.no-image {
  color: #9ca3af;
}


/* Status */

.status {
  display: inline-block;

  padding: 4px 8px;

  border-radius: 20px;

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


/* Actions */

.actions-column {
  width: 180px;
  min-width: 180px;
  text-align: center;
}

.actions-cell {
  width: 180px;
  min-width: 180px;
  padding: 8px 12px;
  text-align: center;
}

.actions {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 6px;

  white-space: nowrap;
}

.action-button {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;

  display: flex;
  align-items: center;
  justify-content: center;

  border: 1px solid #d1d5db;
  border-radius: 6px;

  background: white;

  cursor: pointer;

  font-size: 15px;
  line-height: 1;
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


/* NESSUN RISULTATO */

.no-results {
  text-align: center;

  padding: 30px;

  color: #6b7280;
}


/* PAGINAZIONE */

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;

  gap: 6px;

  margin-top: 20px;
}

.pagination button {
  min-width: 38px;
  height: 38px;

  padding: 0 12px;

  border: 1px solid #d1d5db;
  border-radius: 6px;

  background: white;
  color: #374151;

  cursor: pointer;
}

.pagination button:hover:not(:disabled) {
  background: #f3f4f6;
}

.pagination button.active {
  background: #2563eb;

  border-color: #2563eb;

  color: white;
}

.pagination button:disabled {
  opacity: 0.4;

  cursor: not-allowed;
}


/* MODALE IMMAGINE */

.image-modal {
  position: fixed;
  inset: 0;

  z-index: 99999;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 30px;

  background: rgba(0, 0, 0, 0.8);
}

.image-modal-content {
  position: relative;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  max-width: 90vw;
  max-height: 90vh;

  padding: 20px;

  background: white;

  border-radius: 10px;
}

.image-modal-content img {
  display: block;

  max-width: 85vw;
  max-height: 75vh;

  object-fit: contain;
}

.modal-product-name {
  width: 100%;

  margin-bottom: 15px;

  font-size: 18px;
  font-weight: 600;

  color: #111827;

  text-align: center;
}

.image-modal-close {
  position: absolute;

  top: -15px;
  right: -15px;

  width: 40px;
  height: 40px;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 0;

  border: none;
  border-radius: 50%;

  background: white;
  color: #111827;

  font-size: 28px;

  cursor: pointer;

  box-shadow:
    0 2px 10px
    rgba(0, 0, 0, 0.35);
}


/* MESSAGGI E CONFERME */

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


/* ERRORE */

.error {
  padding: 15px;

  background: #fee2e2;

  color: #991b1b;

  border-radius: 6px;
}


/* RESPONSIVE */

@media (max-width: 900px) {

  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

}

.action-button.delete:hover {
  border-color: #dc2626;
}

@page {
  size: A4 landscape;
  margin: 12mm;
}

@media print {
  :global(body *) {
    visibility: hidden !important;
  }

  .products-print,
  .products-print * {
    visibility: visible !important;
  }

  .products-print {
    display: block !important;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    color: #111;
    background: white;
    font: 9pt Arial, sans-serif;
  }

  .products-print-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #999;
  }

  .products-print-header h1 {
    margin: 0;
    font-size: 18pt;
  }

  .products-print-header p {
    margin: 5px 0 0;
  }

  .products-print table {
    width: 100%;
    border-collapse: collapse;
  }

  .products-print th,
  .products-print td {
    padding: 6px 7px;
    border: 1px solid #bbb;
    text-align: left;
    vertical-align: top;
  }

  .products-print th {
    background: #f3f4f6 !important;
    font-weight: 700;
  }

  .products-print .print-number {
    text-align: right;
    white-space: nowrap;
  }

  .products-print tr.print-low-stock {
    background: #fff7ed !important;
  }

  .products-print tr {
    break-inside: avoid;
  }
}

</style>
