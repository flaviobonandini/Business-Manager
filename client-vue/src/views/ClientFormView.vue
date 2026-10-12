<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authFetch } from '../utils/authFetch'

const route = useRoute()
const router = useRouter()

const clientId = computed(() => route.params.id)

const isView = computed(() => route.name === 'client-view')
const isEdit = computed(() => route.name === 'client-edit')

const loading = ref(true)
const error = ref('')
const notificationMessage = ref('')
const notificationType = ref('success')
let notificationTimer = null
const countries = ref([])

const client = ref({
  codice_cliente: '',
  ragione_sociale: '',
  partita_iva: '',
  codice_fiscale: '',
  city: '',
  province: '',
  zip_code: '',
  indirizzo: '',
  country_id: null,
  city_ship: '',
  province_ship: '',
  zip_code_ship: '',
  indirizzo_ship: '',
  country_id_ship: null,
  contact: '',
  contact_phone: '',
  conctact_mail: '',
  logo_path: '',
})

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

function copyBillingAddress() {
  client.value.indirizzo_ship = client.value.indirizzo
  client.value.city_ship = client.value.city
  client.value.province_ship = client.value.province
  client.value.zip_code_ship = client.value.zip_code
  client.value.country_id_ship = client.value.country_id
}

function countryName(countryId) {
  return countries.value.find(
    country => Number(country.id) === Number(countryId)
  )?.nome || ''
}

function printClient() {
  window.print()
}

function wait(ms) {

  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

/* =========================================================
   LOGO
========================================================= */

const selectedLogo = ref(null)
const logoPreview = ref('')
const showLogoModal = ref(false)

function openLogoModal() {
  if (logoPreview.value || client.value.logo_path) {
    showLogoModal.value = true
  }
}

function closeLogoModal() {
  showLogoModal.value = false
}

function handleLogoChange(event) {
  const file = event.target.files[0]

  if (!file) {
    selectedLogo.value = null
    logoPreview.value = ''
    return
  }

  if (!file.type.startsWith('image/')) {
    showNotification(
      'Select an image file',
      'error'
    )
    event.target.value = ''
    return
  }

  selectedLogo.value = file

  // Elimina la vecchia preview se presente
  if (logoPreview.value) {
    URL.revokeObjectURL(logoPreview.value)
  }

  logoPreview.value = URL.createObjectURL(file)
}

/* =========================================================
   CARICA CLIENTE
========================================================= */

async function loadClient() {
  try {
    loading.value = true
    error.value = ''

    const response = await authFetch(`/api/clients/${clientId.value}`)

    if (!response.ok) {
      throw new Error('Client not found')
    }

    const data = await response.json()

    client.value = {
      ...client.value,
      ...data,
    }

  } catch (err) {
    error.value = err.message

  } finally {
    loading.value = false
  }
}

async function loadCountries() {
  const response = await authFetch('/api/countries')

  if (!response.ok) {
    throw new Error('Failed to load countries')
  }

  countries.value = await response.json()
}

/* =========================================================
   SALVA CLIENTE
========================================================= */

async function saveClient() {
  try {
    error.value = ''

    if (
      client.value.partita_iva &&
      client.value.partita_iva.length > 11
    ) {
      error.value = 'The VAT number must be no more than 11 characters'
      showNotification(error.value, 'error')
      return
    }

    if (
      client.value.codice_fiscale &&
      client.value.codice_fiscale.length > 16
    ) {
      error.value = 'The tax code must be no more than 16 characters'
      showNotification(error.value, 'error')
      return
    }

    const formData = new FormData()

    formData.append(
      'ragione_sociale',
      client.value.ragione_sociale
    )

    formData.append(
      'partita_iva',
      client.value.partita_iva || ''
    )

    formData.append(
      'codice_fiscale',
      client.value.codice_fiscale || ''
    )

    formData.append(
      'indirizzo',
      client.value.indirizzo || ''
    )

    formData.append(
      'city',
      client.value.city || ''
    )

    formData.append(
      'province',
      client.value.province || ''
    )

    formData.append(
      'zip_code',
      client.value.zip_code || ''
    )

    formData.append('country_id', client.value.country_id ?? '')

    formData.append(
      'city_ship',
      client.value.city_ship || ''
    )

    formData.append(
      'province_ship',
      client.value.province_ship || ''
    )

    formData.append(
      'zip_code_ship',
      client.value.zip_code_ship || ''
    )

    formData.append(
      'indirizzo_ship',
      client.value.indirizzo_ship || ''
    )

    formData.append('country_id_ship', client.value.country_id_ship ?? '')

    formData.append('contact', client.value.contact || '')
    formData.append('contact_phone', client.value.contact_phone || '')
    formData.append('conctact_mail', client.value.conctact_mail || '')

    // In modifica manteniamo il codice cliente
    if (isEdit.value) {
      formData.append(
        'codice_cliente',
        client.value.codice_cliente
      )
    }

    // Nuovo logo
    if (selectedLogo.value) {
      formData.append(
        'logo',
        selectedLogo.value
      )
    }

    const url = isEdit.value
      ? `/api/clients/${clientId.value}`
      : '/api/clients'

    const method = isEdit.value
      ? 'PUT'
      : 'POST'

    const response = await authFetch(url, {
      method,
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.error ||
        'Error while saving'
      )
    }

    showNotification(
      isEdit.value
        ? 'Client updated successfully'
        : 'Client created successfully',
      'success',
      1800
    )

    //await wait(900)

    //router.push('/clients')

  } catch (err) {
    console.error(
      'Error saving client:',
      err
    )

    error.value = err.message
    showNotification(
      error.value,
      'error'
    )
  }
}

/* =========================================================
   INIT
========================================================= */

onMounted(async () => {
  try {
    loading.value = true

    await loadCountries()

    // Modifica e visualizzazione devono caricare il cliente
    if (isEdit.value || isView.value) {
      await loadClient()
    } else {
      loading.value = false
    }

  } catch (err) {
    error.value = err.message
    loading.value = false
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

    <!-- ===================================================
         HEADER
    ==================================================== -->

    <div class="page-header">

      <div>

        <h1>
          {{
            isView
              ? 'View client'
              : isEdit
                ? 'Edit client'
                : 'New client'
          }}
        </h1>

        <p v-if="isView || isEdit">
          Client ID: {{ clientId }}
        </p>

        <p v-else>
          Enter the new client's details
        </p>

      </div>

      <button
        type="button"
        class="back-button"
        @click="router.push('/clients')"
      >
        ← Back to clients
      </button>

    </div>

    <div v-if="isView && !loading && !error" class="print-toolbar">
      <button
        type="button"
        class="print-button"
        @click="printClient"
      >
        Print client
      </button>
    </div>


    <!-- ===================================================
         LOADING
    ==================================================== -->

    <div
      v-if="loading"
      class="loading"
    >
      Loading client...
    </div>


    <!-- ===================================================
         ERRORE
    ==================================================== -->

    <div
      v-else-if="error"
      class="error"
    >
      {{ error }}
    </div>


    <!-- ===================================================
         FORM
    ==================================================== -->

    <form
      v-else
      class="client-form"
      @submit.prevent="saveClient"
    >

      <!-- CODICE / RAGIONE SOCIALE -->

      <div class="form-row">

        <div class="form-group">

          <label>Client code</label>

          <input
            v-model="client.codice_cliente"
            type="text"
            readonly
            :placeholder="
              isEdit || isView
                ? ''
                : 'Generated automatically'
            "
          />

        </div>


        <div class="form-group">

          <label>Company name</label>

          <input
            v-model="client.ragione_sociale"
            type="text"
            :disabled="isView"
          />

        </div>

      </div>


      <!-- PIVA / CF -->

      <div class="form-row">

        <div class="form-group">

          <label>VAT number</label>

          <input
            v-model="client.partita_iva"
            type="text"
            maxlength="11"
            :disabled="isView"
          />

        </div>


        <div class="form-group">

          <label>Tax code</label>

          <input
            v-model="client.codice_fiscale"
            type="text"
            maxlength="16"
            :disabled="isView"
          />

        </div>

      </div>

      <hr><br>
      <div class="shipping-header">
        <h2 class="section-title">Contact details</h2>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Contact</label>
          <input
            v-model="client.contact"
            type="text"
            maxlength="100"
            :disabled="isView"
          />
        </div>

        <div class="form-group">
          <label>Contact phone</label>
          <input
            v-model="client.contact_phone"
            type="tel"
            maxlength="50"
            :disabled="isView"
          />
        </div>
      </div>

      <div class="form-group">
        <label>Contact email</label>
        <input
          v-model="client.conctact_mail"
          type="email"
          maxlength="50"
          :disabled="isView"
        />
      </div>

      <hr><br>
      <div class="shipping-header">
        <h2 class="section-title">Billing address</h2>
      
      </div>

      <!-- INDIRIZZO -->

      <div class="form-group">

        <label>Address</label>

        <input
          v-model="client.indirizzo"
          type="text"
          :disabled="isView"
        />

      </div>


      <!-- CITTÀ / PROVINCIA / CAP -->

      <div class="form-row address-row">

        <div class="form-group">

          <label>City</label>

          <input
            v-model="client.city"
            type="text"
            :disabled="isView"
          />

        </div>

        <div class="form-group">

          <label>Province</label>

          <input
            v-model="client.province"
            type="text"
            :disabled="isView"
          />

        </div>        

        <div class="form-group">

          <label>Postal code</label>

          <input
            v-model="client.zip_code"
            type="text"
            :disabled="isView"
          />

        </div>

      </div>


      <!-- COUNTRY -->

      <div class="form-group">

        <label>Country</label>

        <select
          v-model="client.country_id"
          :disabled="isView"
        >
          <option :value="null">Select a country</option>
          <option
            v-for="country in countries"
            :key="country.id"
            :value="country.id"
          >
            {{ country.nome }}
          </option>
        </select>

      </div>
      <hr><br>
      <div class="shipping-header">
        <h2 class="section-title">Shipping address</h2>
        <button
          v-if="!isView"
          type="button"
          class="copy-address-button"
          @click="copyBillingAddress"
        >
          Copy from billing details
        </button>
      </div>

      <div class="form-group">
        <label>Shipping address</label>
        <input
          v-model="client.indirizzo_ship"
          type="text"
          maxlength="220"
          :disabled="isView"
        />
      </div>

      <div class="form-row address-row">
        <div class="form-group">
          <label>Shipping city</label>
          <input
            v-model="client.city_ship"
            type="text"
            maxlength="100"
            :disabled="isView"
          />
        </div>

        <div class="form-group">
          <label>Shipping province</label>
          <input
            v-model="client.province_ship"
            type="text"
            maxlength="30"
            :disabled="isView"
          />
        </div>

        <div class="form-group">
          <label>Shipping postal code</label>
          <input
            v-model="client.zip_code_ship"
            type="text"
            maxlength="30"
            :disabled="isView"
          />
        </div>
      </div>

      <div class="form-group">
        <label>Shipping country</label>
        <select
          v-model="client.country_id_ship"
          :disabled="isView"
        >
          <option :value="null">Select a country</option>
          <option
            v-for="country in countries"
            :key="country.id"
            :value="country.id"
          >
            {{ country.nome }}
          </option>
        </select>
      </div>

      <hr><br>
      <!-- =================================================
           LOGO
      ================================================== -->

      <div class="form-group">

        <label>Client logo</label>

        <input
          v-if="!isView"
          type="file"
          accept="image/*"
          @change="handleLogoChange"
        />


        <!-- NUOVO LOGO -->

        <div
          v-if="logoPreview"
          class="logo-preview"
          title="Click to enlarge"
          @click="openLogoModal"
        >

          <img
            :src="logoPreview"
            alt="New logo preview"
          />

        </div>


        <!-- LOGO SALVATO -->

        <div
          v-else-if="client.logo_path"
          class="logo-preview"
          title="Click to enlarge"
          @click="openLogoModal"
        >

          <img
            :src="
              `/uploads/logos/${client.logo_path}`
            "
            alt="Client logo"
          />

        </div>


        <!-- NOME NUOVO FILE -->

        <div
          v-if="selectedLogo"
          class="logo-filename"
        >
          {{ selectedLogo.name }}
        </div>


        <!-- NOME FILE SALVATO -->

        <div
          v-else-if="client.logo_path"
          class="logo-filename"
        >
          {{ client.logo_path }}
        </div>

      </div>


      <!-- =================================================
           AZIONI
      ================================================== -->

      <div class="form-actions">

        <button
          type="button"
          class="cancel-button"
          @click="router.push('/clients')"
        >
          {{
            isView
              ? 'Back to clients'
              : 'Cancel'
          }}
        </button>


        <button
          v-if="!isView"
          type="submit"
          class="save-button"
        >
          Save
        </button>

      </div>

    </form>

    <article v-if="isView && !loading && !error" class="client-print">
      <header class="client-print-header">
        <div>
          <h1>CLIENT DETAILS</h1>
          <p>{{ client.codice_cliente }}</p>
        </div>
        <img
          v-if="client.logo_path"
          :src="`/uploads/logos/${client.logo_path}`"
          :alt="`Logo for ${client.ragione_sociale}`"
          class="client-print-logo"
        />
      </header>

      <section class="client-print-company">
        <h2>{{ client.ragione_sociale }}</h2>
        <p v-if="client.partita_iva">
          <strong>VAT number:</strong> {{ client.partita_iva }}
        </p>
        <p v-if="client.codice_fiscale">
          <strong>Tax code:</strong> {{ client.codice_fiscale }}
        </p>
        <p v-if="client.contact">
          <strong>Contact:</strong> {{ client.contact }}
        </p>
        <p v-if="client.contact_phone">
          <strong>Contact phone:</strong> {{ client.contact_phone }}
        </p>
        <p v-if="client.conctact_mail">
          <strong>Contact email:</strong> {{ client.conctact_mail }}
        </p>
      </section>

      <section class="client-print-addresses">
        <div>
          <h2>Billing address</h2>
          <p v-if="client.indirizzo">{{ client.indirizzo }}</p>
          <p>
            {{
              [
                client.zip_code,
                client.city,
                client.province
              ].filter(Boolean).join(' ')
            }}
          </p>
          <p v-if="countryName(client.country_id)">
            {{ countryName(client.country_id) }}
          </p>
        </div>

        <div>
          <h2>Shipping address</h2>
          <p v-if="client.indirizzo_ship || client.indirizzo">
            {{ client.indirizzo_ship || client.indirizzo }}
          </p>
          <p>
            {{
              [
                client.zip_code_ship || client.zip_code,
                client.city_ship || client.city,
                client.province_ship || client.province
              ].filter(Boolean).join(' ')
            }}
          </p>
          <p v-if="countryName(client.country_id_ship || client.country_id)">
            {{ countryName(client.country_id_ship || client.country_id) }}
          </p>
        </div>
      </section>
    </article>

  </div>


  <!-- =====================================================
       MODALE LOGO

       Teleport sposta fisicamente la modale nel BODY,
       evitando problemi con il layout della pagina.
  ====================================================== -->

  <Teleport to="body">

    <div
      v-if="showLogoModal"
      class="image-modal"
      @click="closeLogoModal"
    >

      <div
        class="image-modal-content"
        @click.stop
      >

        <button
          type="button"
          class="image-modal-close"
          title="Close"
          @click="closeLogoModal"
        >
          ×
        </button>


        <img
          :src="
            logoPreview
              ? logoPreview
              : `/uploads/logos/${client.logo_path}`
          "
          alt="Enlarged client logo"
        />

      </div>

    </div>

  </Teleport>

</template>


<style scoped>

/* =========================================================
   PAGINA
========================================================= */

.page {
  width: 100%;
  padding: 30px;
}

.client-form {
  width: 100%;
  background: white;
  padding: 25px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}


/* =========================================================
   HEADER
========================================================= */

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  margin-bottom: 25px;
}

.page-header h1 {
  margin: 0;
}

.page-header p {
  margin: 5px 0 0;
  color: #6b7280;
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

.client-print {
  display: none;
}


/* =========================================================
   FORM
========================================================= */

.client-form {
  background: white;

  padding: 25px;

  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.form-row {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 20px;
}

.address-row {
  grid-template-columns: 2fr 1fr 0.7fr;
}

.form-group {
  display: flex;
  flex-direction: column;

  margin-bottom: 20px;
}

.shipping-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.copy-address-button {
  padding: 8px 12px;
  border: 1px solid #2563eb;
  border-radius: 6px;
  background: white;
  color: #2563eb;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.copy-address-button:hover {
  background: #eff6ff;
}

.form-group label {
  margin-bottom: 7px;

  font-size: 14px;
  font-weight: 600;

  color: #374151;
}

.form-group input,
.form-group select {
  width: 100%;

  padding: 10px 12px;

  border: 1px solid #d1d5db;
  border-radius: 6px;

  background: white;

  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;

  border-color: #2563eb;
}

.form-group input:disabled,
.form-group select:disabled {
  background: #f3f4f6;

  color: #6b7280;

  cursor: not-allowed;
}


/* =========================================================
   BOTTONI
========================================================= */

.form-actions {
  display: flex;

  justify-content: flex-end;

  gap: 10px;

  margin-top: 10px;
  padding-top: 20px;

  border-top: 1px solid #e5e7eb;
}

.back-button,
.cancel-button,
.save-button {
  padding: 10px 16px;

  border-radius: 6px;

  cursor: pointer;

  font-weight: 600;
}

.back-button,
.cancel-button {
  background: white;

  border: 1px solid #d1d5db;

  color: #374151;
}

.back-button:hover,
.cancel-button:hover {
  background: #f3f4f6;
}

.save-button {
  background: #2563eb;

  border: 1px solid #2563eb;

  color: white;
}

.save-button:hover {
  background: #1d4ed8;
}


/* =========================================================
   MESSAGGI
========================================================= */

.loading {
  padding: 20px;
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

.error {
  padding: 15px;

  background: #fee2e2;

  color: #991b1b;

  border-radius: 6px;
}


/* =========================================================
   LOGO
========================================================= */

.logo-preview {
  margin-top: 15px;

  width: 180px;
  height: 120px;

  border: 1px solid #d1d5db;
  border-radius: 8px;

  background: white;

  display: flex;
  align-items: center;
  justify-content: center;

  overflow: hidden;

  cursor: pointer;

  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.logo-preview:hover {
  border-color: #2563eb;

  box-shadow:
    0 0 0 2px
    rgba(37, 99, 235, 0.1);
}

.logo-preview img {
  max-width: 100%;
  max-height: 100%;

  object-fit: contain;
}

.logo-filename {
  margin-top: 8px;

  font-size: 13px;

  color: #6b7280;
}


/* =========================================================
   MODALE IMMAGINE
========================================================= */

.image-modal {
  position: fixed;

  inset: 0;

  z-index: 99999;

  display: flex;

  align-items: center;
  justify-content: center;

  padding: 30px;

  background:
    rgba(0, 0, 0, 0.80);
}

.image-modal-content {
  position: relative;

  display: flex;

  align-items: center;
  justify-content: center;

  max-width: 90vw;
  max-height: 90vh;

  padding: 20px;

  background: white;

  border-radius: 10px;

  box-shadow:
    0 10px 30px
    rgba(0, 0, 0, 0.4);
}

.image-modal-content img {
  display: block;

  max-width: 85vw;
  max-height: 80vh;

  object-fit: contain;
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
  line-height: 1;

  cursor: pointer;

  box-shadow:
    0 2px 10px
    rgba(0, 0, 0, 0.35);
}

.image-modal-close:hover {
  background: #f3f4f6;
}


/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 700px) {

  .page {
    padding: 15px;
  }

  .page-header {
    align-items: flex-start;

    gap: 15px;

    flex-direction: column;
  }

  .form-row {
    grid-template-columns: 1fr;

    gap: 0;
  }

  .image-modal {
    padding: 15px;
  }

  .image-modal-content {
    padding: 10px;
  }

  .image-modal-content img {
    max-width: 90vw;
    max-height: 80vh;
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

  .client-print,
  .client-print * {
    visibility: visible !important;
  }

  .client-print {
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

  .client-print-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 1px solid #999;
  }

  .client-print-header h1 {
    margin: 0;
    font-size: 22pt;
  }

  .client-print-header p {
    margin: 6px 0 0;
    color: #555;
  }

  .client-print-logo {
    max-width: 120px;
    max-height: 80px;
    object-fit: contain;
  }

  .client-print-company {
    margin-bottom: 24px;
  }

  .client-print-company h2 {
    margin: 0 0 10px;
    font-size: 15pt;
  }

  .client-print-company p,
  .client-print-addresses p {
    margin: 4px 0;
  }

  .client-print-addresses {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .client-print-addresses h2 {
    margin: 0 0 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #ddd;
    font-size: 11pt;
  }
}

</style>
