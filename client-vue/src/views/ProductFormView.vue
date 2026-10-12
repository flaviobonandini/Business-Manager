<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { authFetch } from '../utils/authFetch'

const route = useRoute()
const router = useRouter()

const productId = computed(() => route.params.id)

const isView = computed(() => route.name === 'product-view')
const isEdit = computed(() => route.name === 'product-edit')
const isNew = computed(() => route.name === 'product-new')

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const notificationMessage = ref('')
const notificationType = ref('success')

const categories = ref([])

const selectedFile = ref(null)
const imagePreview = ref('')

const showImageModal = ref(false)
const printDiscounts = ref([])
const showDiscountModal = ref(false)
const loadingDiscounts = ref(false)
const savingDiscounts = ref(false)
const discountError = ref('')
const quantityDiscounts = ref([])
let notificationTimer = null

function defaultQuantityDiscounts() {
  return [
    { min_qty: 1, max_qty: 9, discount_percent: 0 },
    { min_qty: 10, max_qty: 49, discount_percent: 5 },
    { min_qty: 50, max_qty: 99, discount_percent: 10 },
    { min_qty: 100, max_qty: 499, discount_percent: 15 },
    { min_qty: 500, max_qty: null, discount_percent: 20 },
  ]
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

/* =========================================================
   PRODOTTO
========================================================= */

const product = ref({
  codice: '',
  nome: '',
  descrizione: '',
  category_id: '',
  prezzo: 0,
  costo: '',
  aliquota_iva: 22,
  quantita: 0,
  scorta_minima: 0,
  unita_misura: 'PZ',
  barcode: '',
  immagine: '',
  active: 1,
})

const editor = useEditor({
  content: '',
  extensions: [
    StarterKit,
  ],
  editorProps: {
    attributes: {
      class: 'tiptap-editor',
    },
  },
  onUpdate: ({ editor }) => {
    product.value.descrizione = editor.getHTML()
  },
})


/* =========================================================
   TITOLO PAGINA
========================================================= */

function pageTitle() {

  if (isView.value) {
    return 'View product'
  }

  if (isEdit.value) {
    return 'Edit product'
  }

  return 'New product'
}


/* =========================================================
   CARICA CATEGORIE
========================================================= */

async function loadCategories() {

  try {

    const response = await fetch(
      '/api/product-categories'
    )

    if (!response.ok) {
      return
    }

    categories.value =
      await response.json()

  } catch (err) {

    console.error(
      'Error loading categories:',
      err
    )
  }
}


/* =========================================================
   CARICA PRODOTTO
========================================================= */

async function loadProduct() {

  if (!productId.value) {
    return
  }

  loading.value = true
  error.value = ''

  try {

    const response = await authFetch(
      `/api/products/${productId.value}`
    )

    const data = await response.json()

    if (!response.ok) {

      throw new Error(
        data.message ||
        'Error loading product'
      )
    }

    product.value = {
      codice: data.codice || '',
      nome: data.nome || '',
      descrizione: data.descrizione || '',
      category_id: data.category_id || '',
      prezzo: data.prezzo ?? 0,
      costo: data.costo ?? '',
      aliquota_iva: data.aliquota_iva ?? 22,
      quantita: data.quantita ?? 0,
      scorta_minima: data.scorta_minima ?? 0,
      unita_misura: data.unita_misura || 'PZ',
      barcode: data.barcode || '',
      immagine: data.immagine || '',
      active: Number(data.active) === 0 ? 0 : 1,
    }

    if (editor.value) {
        editor.value.commands.setContent(
            product.value.descrizione || ''
        )
    }

  } catch (err) {

    error.value = err.message

  } finally {

    loading.value = false
  }
}


/* =========================================================
   IMMAGINE
========================================================= */

function getImageUrl() {

  if (imagePreview.value) {
    return imagePreview.value
  }

  if (!product.value.immagine) {
    return ''
  }

  /*
   * Il server restituisce:
   * /uploads/products/nomefile.jpg
   */
  if (
    product.value.immagine.startsWith(
      '/uploads/'
    )
  ) {
    return product.value.immagine
  }

  return `/uploads/products/${product.value.immagine}`
}

function descriptionText() {
  if (!product.value.descrizione) {
    return ''
  }

  return new DOMParser()
    .parseFromString(product.value.descrizione, 'text/html')
    .body.textContent
    .trim()
}

async function printProduct() {
  try {
    const response = await authFetch(
      `/api/products/${productId.value}/quantity-discounts`
    )
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Error loading quantity discounts')
    }

    printDiscounts.value = data
    await nextTick()
    window.print()
  } catch (err) {
    showNotification(err.message, 'error')
  }
}


function handleImageChange(event) {

  const file = event.target.files[0]

  if (!file) {
    return
  }

  if (imagePreview.value) {
    URL.revokeObjectURL(
      imagePreview.value
    )
  }

  selectedFile.value = file

  imagePreview.value =
    URL.createObjectURL(file)
}


/* =========================================================
   UPLOAD IMMAGINE
========================================================= */

async function uploadImage() {

  if (!selectedFile.value) {

    return product.value.immagine || null
  }

  const formData = new FormData()

  formData.append(
    'image',
    selectedFile.value
  )

  const response = await authFetch(
    '/api/products/upload',
    {
      method: 'POST',
      body: formData,
    }
  )

  const data = await response.json()

  if (!response.ok) {

    throw new Error(
      data.message ||
      'Error loading image'
    )
  }

  return data.path
}


/* =========================================================
   MODALE IMMAGINE
========================================================= */

function openImageModal() {

  if (!getImageUrl()) {
    return
  }

  showImageModal.value = true
}


function closeImageModal() {

  showImageModal.value = false
}


/* =========================================================
   SALVA PRODOTTO
========================================================= */

async function saveProduct() {

  if (isView.value) {
    return
  }

  if (!product.value.nome.trim()) {

    error.value =
      'Product name is required'

    showNotification(
      error.value,
      'error'
    )

    return
  }

  saving.value = true
  error.value = ''

  try {

    /*
     * Prima carichiamo l'eventuale
     * nuova immagine.
     */
    const imagePath =
      await uploadImage()


    const payload = {

      nome:
        product.value.nome.trim(),

      descrizione:
        product.value.descrizione,

      category_id:
        product.value.category_id || null,

      prezzo:
        product.value.prezzo,

      costo:
        product.value.costo,

      aliquota_iva:
        product.value.aliquota_iva,

      quantita:
        product.value.quantita,

      scorta_minima:
        product.value.scorta_minima,

      unita_misura:
        product.value.unita_misura,

      barcode:
        product.value.barcode,

      immagine:
        imagePath,

      active:
        product.value.active,
    }


    let url = '/api/products'
    let method = 'POST'


    if (isEdit.value) {

      url =
        `/api/products/${productId.value}`

      method = 'PUT'
    }


    const response = await authFetch(
      url,
      {
        method,

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify(payload),
      }
    )


    const data =
      await response.json()


    if (!response.ok) {

      throw new Error(
        data.message ||
        'Error while saving'
      )
    }


    showNotification(
      isNew.value
        ? `Product created successfully. Code: ${data.codice}`
        : 'Product updated successfully',
      'success',
      1800
    )

    if (isNew.value && data.id) {
      product.value.codice = data.codice
      await router.replace(`/products/edit/${data.id}`)
    }


  } catch (err) {

    error.value = err.message

    showNotification(
      err.message,
      'error'
    )

  } finally {

    saving.value = false
  }
}

async function openDiscountModal() {
  showDiscountModal.value = true
  loadingDiscounts.value = true
  discountError.value = ''

  try {
    const response = await authFetch(
      `/api/products/${productId.value}/quantity-discounts`
    )
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Error loading quantity discounts')
    }

    quantityDiscounts.value = data.length
      ? data.map(discount => ({
          min_qty: Number(discount.min_qty),
          max_qty: discount.max_qty === null
            ? null
            : Number(discount.max_qty),
          discount_percent: Number(discount.discount_percent),
        }))
      : defaultQuantityDiscounts()
  } catch (err) {
    discountError.value = err.message
  } finally {
    loadingDiscounts.value = false
  }
}

function addDiscountTier() {
  const lastTier = quantityDiscounts.value.at(-1)
  const nextMinQty = lastTier?.max_qty == null
    ? (Number(lastTier?.min_qty) || 0) + 1
    : Number(lastTier.max_qty) + 1

  quantityDiscounts.value.push({
    min_qty: nextMinQty,
    max_qty: null,
    discount_percent: 0,
  })
}

function validateDiscountTiers() {
  if (quantityDiscounts.value.length === 0) {
    return 'Add at least one quantity discount tier'
  }

  const tiers = quantityDiscounts.value
    .map((tier, index) => ({
      index,
      hasRequiredValue: tier.min_qty !== '' &&
        tier.min_qty !== null &&
        tier.min_qty !== undefined &&
        tier.discount_percent !== '' &&
        tier.discount_percent !== null &&
        tier.discount_percent !== undefined,
      min_qty: Number(tier.min_qty),
      max_qty: tier.max_qty === null || tier.max_qty === ''
        ? null
        : Number(tier.max_qty),
      discount_percent: Number(tier.discount_percent),
    }))
    .sort((a, b) => a.min_qty - b.min_qty)

  for (let index = 0; index < tiers.length; index += 1) {
    const tier = tiers[index]

    if (
      !tier.hasRequiredValue ||
      !Number.isInteger(tier.min_qty) ||
      tier.min_qty < 1 ||
      (tier.max_qty !== null &&
        (!Number.isInteger(tier.max_qty) || tier.max_qty < tier.min_qty)) ||
      !Number.isFinite(tier.discount_percent) ||
      tier.discount_percent < 0 ||
      tier.discount_percent > 100 ||
      Math.round(tier.discount_percent * 100) !== tier.discount_percent * 100
    ) {
      return `Check the values in row ${tier.index + 1}`
    }

    const nextTier = tiers[index + 1]
    if (
      nextTier &&
      (tier.max_qty === null || nextTier.min_qty <= tier.max_qty)
    ) {
      return 'Quantity ranges must not overlap'
    }
  }

  return ''
}

async function saveDiscounts() {
  discountError.value = validateDiscountTiers()
  if (discountError.value) {
    return
  }

  savingDiscounts.value = true

  try {
    const response = await authFetch(
      `/api/products/${productId.value}/quantity-discounts`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discounts: quantityDiscounts.value.map(tier => ({
            min_qty: Number(tier.min_qty),
            max_qty: tier.max_qty === null || tier.max_qty === ''
              ? null
              : Number(tier.max_qty),
            discount_percent: Number(tier.discount_percent),
          })),
        }),
      }
    )
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Error saving quantity discounts')
    }

    quantityDiscounts.value = data.discounts
    showDiscountModal.value = false
    showNotification('Quantity discounts saved successfully')
  } catch (err) {
    discountError.value = err.message
  } finally {
    savingDiscounts.value = false
  }
}


/* =========================================================
   MOUNT
========================================================= */

onMounted(async () => {

  await loadCategories()

  if (productId.value) {
    await loadProduct()
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

    <!-- HEADER -->

    <div class="page-header">

      <div>

        <h1>
          {{ pageTitle() }}
        </h1>

        <p
          v-if="product.codice"
          class="product-code"
        >
          {{ product.codice }}
        </p>

      </div>


      <button
        type="button"
        class="back-button"
        @click="router.push('/products')"
      >
        ← Back to products
      </button>

    </div>

    <div v-if="isView && !loading && !error" class="print-toolbar">
      <button
        type="button"
        class="print-button"
        @click="printProduct"
      >
        Print product
      </button>
    </div>


    <!-- CARICAMENTO -->

    <div v-if="loading">
      Loading...
    </div>


    <!-- ERRORE -->

    <div
      v-else-if="error && isView"
      class="error"
    >
      {{ error }}
    </div>


    <!-- FORM -->

    <form
      v-else
      class="product-form"
      @submit.prevent="saveProduct"
    >

      <!-- DATI PRINCIPALI -->

      <div class="form-section">

        <h2>
          Product details
        </h2>


        <div class="form-grid">


          <!-- CODICE -->

          <div
            v-if="!isNew"
            class="form-group"
          >

            <label>
              Code
            </label>

            <input
              v-model="product.codice"
              type="text"
              disabled
            />

          </div>


          <!-- NOME -->

          <div class="form-group">

            <label>
              Name *
            </label>

            <input
              v-model="product.nome"
              type="text"
              :disabled="isView"
              required
            />

          </div>


          <!-- CATEGORIA -->

          <div class="form-group">

            <label>
              Category
            </label>

            <select
              v-model="product.category_id"
              :disabled="isView"
            >

              <option value="">
                No category
              </option>

              <option
                v-for="category in categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>

            </select>

          </div>


          <!-- BARCODE -->

          <div class="form-group">

            <label>
              Barcode
            </label>

            <input
              v-model="product.barcode"
              type="text"
              :disabled="isView"
            />

          </div>


          <!-- UNITÃ€ -->

          <div class="form-group">

            <label>
              Unit of measure
            </label>

            <select
              v-model="product.unita_misura"
              :disabled="isView"
            >

              <option value="PZ">
                PZ
              </option>

              <option value="KG">
                KG
              </option>

              <option value="G">
                G
              </option>

              <option value="L">
                L
              </option>

              <option value="ML">
                ML
              </option>

              <option value="MT">
                MT
              </option>

              <option value="MQ">
                MQ
              </option>

            </select>

          </div>


          <!-- STATO -->

          <div class="form-group">

            <label>
              Status
            </label>

            <select
              v-model.number="product.active"
              :disabled="isView"
            >

              <option :value="1">
                Active
              </option>

              <option :value="0">
                Inactive
              </option>

            </select>

          </div>

        </div>


        <!-- DESCRIZIONE -->

        <div class="form-group description">

        <label>
            Description
        </label>

        <div
            v-if="editor"
            class="editor-wrapper"
        >

            <div
            v-if="!isView"
            class="editor-toolbar"
            >
            <button
                type="button"
                :class="{ active: editor.isActive('bold') }"
                @click="editor.chain().focus().toggleBold().run()"
            >
                B
            </button>

            <button
                type="button"
                :class="{ active: editor.isActive('italic') }"
                @click="editor.chain().focus().toggleItalic().run()"
            >
                I
            </button>

            <button
                type="button"
                :class="{ active: editor.isActive('strike') }"
                @click="editor.chain().focus().toggleStrike().run()"
            >
                S
            </button>

            <button
                type="button"
                :class="{ active: editor.isActive('heading', { level: 2 }) }"
                @click="
                editor
                    .chain()
                    .focus()
                    .toggleHeading({ level: 2 })
                    .run()
                "
            >
                H2
            </button>

            <button
                type="button"
                :class="{ active: editor.isActive('bulletList') }"
                @click="
                editor
                    .chain()
                    .focus()
                    .toggleBulletList()
                    .run()
                "
            >
                • Bullet list
            </button>

            <button
                type="button"
                :class="{ active: editor.isActive('orderedList') }"
                @click="
                editor
                    .chain()
                    .focus()
                    .toggleOrderedList()
                    .run()
                "
            >
                1. Numbered list
            </button>
            </div>

            <EditorContent
            :editor="editor"
            :class="{ 'editor-readonly': isView }"
            />

        </div>

        </div>

      </div>


      <!-- PREZZI -->

      <div class="form-section">

        <h2>
          Pricing and VAT
        </h2>

        <button
          v-if="!isNew"
          type="button"
          class="discount-open-button"
          @click="openDiscountModal"
        >
          Quantity discounts
        </button>


        <div class="form-grid">


          <div class="form-group">

            <label>
              Price (€)
            </label>

            <input
              v-model.number="product.prezzo"
              type="number"
              min="0"
              step="0.01"
              :disabled="isView"
            />

          </div>


          <div class="form-group">

            <label>
              Cost (€)
            </label>

            <input
              v-model="product.costo"
              type="number"
              min="0"
              step="0.01"
              :disabled="isView"
            />

          </div>


          <div class="form-group">

            <label>
              VAT rate (%)
            </label>

            <input
              v-model.number="
                product.aliquota_iva
              "
              type="number"
              min="0"
              step="0.01"
              :disabled="isView"
            />

          </div>

        </div>

      </div>


      <!-- MAGAZZINO -->

      <div class="form-section">

        <h2>
          Inventory
        </h2>


        <div class="form-grid">


          <div class="form-group">

            <label>
              Quantity
            </label>

            <input
              v-model.number="
                product.quantita
              "
              type="number"
              min="0"
              step="1"
              :disabled="isView"
            />

          </div>


          <div class="form-group">

            <label>
              Minimum stock
            </label>

            <input
              v-model.number="
                product.scorta_minima
              "
              type="number"
              min="0"
              step="1"
              :disabled="isView"
            />

          </div>

        </div>

      </div>


      <!-- IMMAGINE -->

      <div class="form-section">

        <h2>
          Product image
        </h2>


        <div
          v-if="!isView"
          class="form-group image-input"
        >

          <label>
            Select image
          </label>

          <input
            type="file"
            accept="image/*"
            @change="handleImageChange"
          />

        </div>


        <div
          v-if="getImageUrl()"
          class="image-preview-container"
        >

          <img
            :src="getImageUrl()"
            :alt="product.nome"
            class="image-preview"
            title="Click to enlarge"
            @click="openImageModal"
          />

          <span class="image-help">
            Click the image to enlarge
          </span>

        </div>


        <div
          v-else
          class="no-product-image"
        >
          No image available
        </div>

      </div>


      <!-- PULSANTI -->

      <div class="form-actions">

        <button
          type="button"
          class="cancel-button"
          @click="router.push('/products')"
        >
          {{ isView ? 'Close' : 'Cancel' }}
        </button>


        <button
          v-if="isView"
          type="button"
          class="edit-button"
          @click="
            router.push(
              `/products/edit/${productId}`
            )
          "
        >
          Edit
        </button>


        <button
          v-if="!isView"
          type="submit"
          class="save-button"
          :disabled="saving"
        >

          {{
            saving
              ? 'Saving...'
              : 'Save product'
          }}

        </button>

      </div>

    </form>

  </div>

  <article v-if="isView && !loading && !error" class="product-print">
    <header class="product-print-header">
      <div>
        <h1>PRODUCT DETAILS</h1>
        <p>{{ product.codice }}</p>
      </div>
      <img
        v-if="getImageUrl()"
        :src="getImageUrl()"
        :alt="product.nome"
        class="product-print-image"
      />
    </header>

    <section class="product-print-summary">
      <h2>{{ product.nome }}</h2>
      <p v-if="product.category_id">
        <strong>Category:</strong>
        {{ categories.find(category => Number(category.id) === Number(product.category_id))?.name || '-' }}
      </p>
      <p v-if="product.barcode">
        <strong>Barcode:</strong> {{ product.barcode }}
      </p>
      <p v-if="descriptionText()">
        <strong>Description:</strong> {{ descriptionText() }}
      </p>
    </section>

    <section class="product-print-details">
      <div>
        <h2>Pricing</h2>
        <p><strong>Price:</strong> {{ Number(product.prezzo || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) }}</p>
        <p><strong>VAT rate:</strong> {{ Number(product.aliquota_iva || 0).toLocaleString('it-IT') }}%</p>
        <p><strong>Unit of measure:</strong> {{ product.unita_misura }}</p>
      </div>
      <div>
        <h2>Inventory</h2>
        <p><strong>Quantity:</strong> {{ product.quantita }} {{ product.unita_misura }}</p>
        <p><strong>Minimum stock:</strong> {{ product.scorta_minima }} {{ product.unita_misura }}</p>
        <p><strong>Status:</strong> {{ Number(product.active) === 1 ? 'Active' : 'Inactive' }}</p>
      </div>
    </section>

    <section v-if="printDiscounts.length" class="product-print-discounts">
      <h2>Quantity discounts</h2>
      <table>
        <thead>
          <tr>
            <th>Minimum quantity</th>
            <th>Maximum quantity</th>
            <th>Discount</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="discount in printDiscounts" :key="discount.id">
            <td>{{ discount.min_qty }}</td>
            <td>{{ discount.max_qty ?? 'No limit' }}</td>
            <td>{{ Number(discount.discount_percent).toLocaleString('it-IT') }}%</td>
          </tr>
        </tbody>
      </table>
    </section>
  </article>

  <!-- QUANTITY DISCOUNT MODAL -->

  <Teleport to="body">
    <div
      v-if="showDiscountModal"
      class="discount-modal"
      @click.self="showDiscountModal = false"
    >
      <section
        class="discount-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="discount-modal-title"
      >
        <header class="discount-modal-header">
          <div>
            <h2 id="discount-modal-title">Quantity discounts</h2>
            <p>{{ product.nome }}</p>
          </div>
          <button
            type="button"
            class="discount-close-button"
            aria-label="Close"
            @click="showDiscountModal = false"
          >
            ×
          </button>
        </header>

        <div v-if="loadingDiscounts" class="discount-loading">
          Loading quantity discounts...
        </div>

        <template v-else>
          <p v-if="discountError" class="discount-error" role="alert">
            {{ discountError }}
          </p>

          <div class="discount-table-wrapper">
            <table class="discount-table">
              <thead>
                <tr>
                  <th>Minimum quantity</th>
                  <th>Maximum quantity</th>
                  <th>Discount (%)</th>
                  <th v-if="!isView">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(tier, index) in quantityDiscounts"
                  :key="index"
                >
                  <td>
                    <input
                      v-model.number="tier.min_qty"
                      type="number"
                      min="1"
                      step="1"
                      :disabled="isView"
                      aria-label="Minimum quantity"
                    />
                  </td>
                  <td>
                    <input
                      v-model.number="tier.max_qty"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="No limit"
                      :disabled="isView"
                      aria-label="Maximum quantity"
                    />
                  </td>
                  <td>
                    <input
                      v-model.number="tier.discount_percent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      :disabled="isView"
                      aria-label="Discount percentage"
                    />
                  </td>
                  <td v-if="!isView">
                    <button
                      type="button"
                      class="discount-remove-button"
                      aria-label="Remove tier"
                      @click="quantityDiscounts.splice(index, 1)"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
                <tr v-if="quantityDiscounts.length === 0">
                  <td :colspan="isView ? 3 : 4" class="discount-empty">
                    No discount tiers configured.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <footer class="discount-modal-actions">
            <button
              v-if="!isView"
              type="button"
              class="discount-add-button"
              @click="addDiscountTier"
            >
              + Add tier
            </button>
            <span class="discount-actions-spacer"></span>
            <button
              type="button"
              class="cancel-button"
              @click="showDiscountModal = false"
            >
              {{ isView ? 'Close' : 'Cancel' }}
            </button>
            <button
              v-if="!isView"
              type="button"
              class="save-button"
              :disabled="savingDiscounts || loadingDiscounts"
              @click="saveDiscounts"
            >
              {{ savingDiscounts ? 'Saving...' : 'Save discounts' }}
            </button>
          </footer>
        </template>
      </section>
    </div>
  </Teleport>

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
          @click="closeImageModal"
        >
          X
        </button>


        <div class="modal-title">
          {{ product.nome }}
        </div>


        <img
          :src="getImageUrl()"
          :alt="product.nome"
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
  align-items: center;

  margin-bottom: 25px;
}

.page-header h1 {
  margin: 0;
}

.product-code {
  margin: 5px 0 0;

  color: #6b7280;

  font-size: 14px;
  font-weight: 600;
}

.back-button {
  padding: 9px 14px;

  border: 1px solid #d1d5db;
  border-radius: 6px;

  background: white;

  cursor: pointer;
}

.back-button:hover {
  background: #f3f4f6;
}

.print-toolbar {
  display: flex;
  justify-content: flex-end;
  margin: -8px 0 18px;
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

.product-print {
  display: none;
}


/* FORM */

.product-form {
  width: 100%;
}

.form-section {
  margin-bottom: 25px;
  padding: 22px;

  background: white;

  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.form-section h2 {
  margin: 0 0 20px;

  font-size: 18px;

  color: #111827;
}

.discount-open-button,
.discount-add-button {
  margin: 0 0 18px;
  padding: 9px 13px;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
  cursor: pointer;
}

.discount-open-button:hover,
.discount-add-button:hover {
  background: #dbeafe;
}

.form-grid {
  display: grid;

  grid-template-columns:
    repeat(3, minmax(0, 1fr));

  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;

  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;

  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;

  padding: 10px 12px;

  border: 1px solid #d1d5db;
  border-radius: 6px;

  background: white;

  font-family: inherit;
  font-size: 14px;

  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;

  border-color: #2563eb;

  box-shadow:
    0 0 0 2px
    rgba(37, 99, 235, 0.1);
}

.form-group input:disabled,
.form-group select:disabled,
.form-group textarea:disabled {
  background: #f3f4f6;

  color: #6b7280;

  cursor: not-allowed;
}

.description {
  margin-top: 20px;
}

.description textarea {
  resize: vertical;
}


/* IMMAGINE */

.image-input {
  max-width: 500px;

  margin-bottom: 20px;
}

.image-preview-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  gap: 8px;
}

.image-preview {
  max-width: 300px;
  max-height: 220px;

  object-fit: contain;

  padding: 5px;

  border: 1px solid #e5e7eb;
  border-radius: 8px;

  background: white;

  cursor: pointer;
}

.image-preview:hover {
  opacity: 0.85;
}

.image-help {
  color: #6b7280;

  font-size: 12px;
}

.no-product-image {
  padding: 25px;

  color: #9ca3af;

  background: #f9fafb;

  border: 1px dashed #d1d5db;
  border-radius: 6px;

  text-align: center;
}


/* AZIONI */

.form-actions {
  display: flex;
  justify-content: flex-end;

  gap: 10px;

  margin-top: 20px;
}

.cancel-button,
.save-button,
.edit-button {
  padding: 10px 18px;

  border-radius: 6px;

  font-weight: 600;

  cursor: pointer;
}

.cancel-button {
  border: 1px solid #d1d5db;

  background: white;

  color: #374151;
}

.cancel-button:hover {
  background: #f3f4f6;
}

.save-button,
.edit-button {
  border: none;

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


/* ERRORE */

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

.error {
  padding: 15px;

  background: #fee2e2;

  color: #991b1b;

  border-radius: 6px;
}


/* MODALE */

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

.modal-title {
  width: 100%;

  margin-bottom: 15px;

  color: #111827;

  font-size: 18px;
  font-weight: 600;

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

.discount-modal {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.58);
}

.discount-modal-content {
  width: min(760px, 100%);
  max-height: min(90vh, 760px);
  overflow: auto;
  padding: 24px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
}

.discount-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.discount-modal-header h2 {
  margin: 0;
  color: #111827;
  font-size: 20px;
}

.discount-modal-header p {
  margin: 5px 0 0;
  color: #6b7280;
}

.discount-close-button {
  border: 0;
  background: transparent;
  color: #6b7280;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.discount-table-wrapper {
  overflow-x: auto;
}

.discount-table {
  width: 100%;
  border-collapse: collapse;
}

.discount-table th,
.discount-table td {
  padding: 9px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
}

.discount-table th {
  color: #4b5563;
  font-size: 13px;
}

.discount-table input {
  width: 100%;
  min-width: 95px;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  box-sizing: border-box;
}

.discount-table input:disabled {
  background: #f3f4f6;
  color: #6b7280;
}

.discount-remove-button {
  padding: 7px 9px;
  border: 1px solid #fecaca;
  border-radius: 5px;
  background: #fef2f2;
  color: #b91c1c;
  cursor: pointer;
}

.discount-empty,
.discount-loading {
  padding: 20px;
  color: #6b7280;
  text-align: center;
}

.discount-error {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 6px;
  background: #fef2f2;
  color: #991b1b;
}

.discount-modal-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
}

.discount-modal-actions .discount-add-button {
  margin: 0;
}

.discount-actions-spacer {
  flex: 1;
}

.discount-modal-actions .save-button,
.discount-modal-actions .cancel-button {
  padding: 9px 13px;
}

.discount-modal-actions .save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}


/* RESPONSIVE */

@media (max-width: 900px) {

  .form-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;

    gap: 15px;
  }

  .discount-modal-content {
    padding: 16px;
  }

  .discount-modal-actions {
    flex-wrap: wrap;
  }

  .discount-actions-spacer {
    flex-basis: 100%;
  }
}

.editor-wrapper {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  overflow: hidden;
  background: white;
}

.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  padding: 8px;

  border-bottom: 1px solid #e5e7eb;

  background: #f9fafb;
}

.editor-toolbar button {
  min-width: 34px;
  height: 32px;

  padding: 0 10px;

  border: 1px solid #d1d5db;
  border-radius: 5px;

  background: white;

  cursor: pointer;
}

.editor-toolbar button:hover {
  background: #f3f4f6;
}

.editor-toolbar button.active {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.tiptap-editor {
  min-height: 180px;

  padding: 12px;

  outline: none;
}

.tiptap-editor p {
  margin: 0 0 10px;
}

.tiptap-editor ul,
.tiptap-editor ol {
  padding-left: 25px;
}

.editor-readonly {
  background: #f3f4f6;
  pointer-events: none;
}

@page {
  size: A4;
  margin: 16mm;
}

@media print {
  :global(body *) {
    visibility: hidden !important;
  }

  .product-print,
  .product-print * {
    visibility: visible !important;
  }

  .product-print {
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

  .product-print-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 1px solid #999;
  }

  .product-print-header h1 {
    margin: 0;
    font-size: 22pt;
  }

  .product-print-header p {
    margin: 6px 0 0;
    color: #555;
  }

  .product-print-image {
    max-width: 140px;
    max-height: 100px;
    object-fit: contain;
  }

  .product-print-summary {
    margin-bottom: 24px;
  }

  .product-print-summary h2 {
    margin: 0 0 10px;
    font-size: 15pt;
  }

  .product-print-summary p,
  .product-print-details p {
    margin: 5px 0;
    line-height: 1.4;
  }

  .product-print-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 24px;
  }

  .product-print-details h2,
  .product-print-discounts h2 {
    margin: 0 0 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #ddd;
    font-size: 11pt;
  }

  .product-print-discounts table {
    width: 100%;
    border-collapse: collapse;
  }

  .product-print-discounts th,
  .product-print-discounts td {
    padding: 7px 9px;
    border: 1px solid #ddd;
    text-align: left;
  }

  .product-print-discounts th {
    background: #f3f4f6 !important;
  }
}

</style>
