<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { authFetch } from '../utils/authFetch'

const clients = ref([])
const loading = ref(true)
const error = ref('')

// Ricerca
const search = ref('')

// Numero righe da visualizzare
const itemsPerPage = ref(10)

const currentPage = ref(1)

const sortKey = ref('id')
const sortDirection = ref('asc')

const currentUser = JSON.parse(
  localStorage.getItem('user') || 'null'
)

const role = String(
  currentUser?.role || ''
).toLowerCase()

const isAdmin =
  role === 'admin' ||
  role === 'superadmin'


onMounted(async () => {
  try {
    const response = await authFetch('/api/data')

    if (!response.ok) {
      throw new Error('Failed to load clients')
    }

    clients.value = await response.json()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})

watch(search, () => {
  currentPage.value = 1
})

watch(itemsPerPage, () => {
  currentPage.value = 1
})

function sortBy(key) {
  if (sortKey.value === key) {
    sortDirection.value =
      sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDirection.value = 'asc'
  }

  currentPage.value = 1
}

const filteredClients = computed(() => {
  const text = search.value.toLowerCase().trim()

  if (!text) {
    return clients.value
  }

  return clients.value.filter((client) => {
    return Object.values(client).some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(text),
    )
  })
})

async function deleteClient(client) {

  const confirmed = confirm(
    `Are you sure you want to delete the client "${client.ragione_sociale}"?`
  )

  if (!confirmed) {
    return
  }

  try {

    const response = await authFetch(`/api/clients/${client.id}`, {
      method: 'DELETE',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.error ||
        'Error deleting client'
      )
    }

    // Rimuove il cliente dalla tabella senza ricaricare la pagina
    clients.value = clients.value.filter(
      (item) => item.id !== client.id
    )

    // Se cancellando l'ultimo elemento rimaniamo
    // su una pagina non più esistente, torniamo indietro
    if (
      currentPage.value > 1 &&
      visibleClients.value.length === 0
    ) {
      currentPage.value--
    }

    alert('Client deleted successfully')

  } catch (err) {

    alert(err.message)

  }
}

async function duplicateClient(client) {

  const confirmed = confirm(
    `Are you sure you want to duplicate the client "${client.ragione_sociale}"?`
  )

  if (!confirmed) {
    return
  }

  try {

    const response = await authFetch(
      `/api/clients/${client.id}/copy`,
      {
        method: 'POST',
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.error ||
        'Error duplicating client'
      )
    }

    alert(
      `Client duplicated successfully\nNew code: ${data.codice_cliente}`
    )

    // Apre subito il nuovo cliente in modifica
    window.location.href = `/clients/edit/${data.id}`

  } catch (err) {

    alert(err.message)

  }
}

const totalPages = computed(() => {
  return Math.ceil(filteredClients.value.length / itemsPerPage.value)
})

const sortedClients = computed(() => {
  return [...filteredClients.value].sort((a, b) => {
    let valueA = a[sortKey.value]
    let valueB = b[sortKey.value]

    // Gestione valori null
    valueA = valueA ?? ''
    valueB = valueB ?? ''

    // Se sono numeri
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

const visibleClients = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value

  return sortedClients.value.slice(start, end)
})

function printClients() {
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
</script>

<template>
  <div class="page">

    <!-- HEADER -->
    <div class="page-header">

      <!-- TITOLO -->
      <div>
        <h1>Clients</h1>

        <p class="client-count">
          {{ filteredClients.length }} clients
        </p>
      </div>

      <!-- AZIONI HEADER -->
      <div class="header-actions">

        <!-- NUMERO RIGHE -->
        <div class="page-size">
          <span>Show</span>

          <select v-model.number="itemsPerPage">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </div>

        <!-- RICERCA -->
        <input
          v-model="search"
          type="text"
          class="search-input"
          placeholder="Search clients..."
        />

        <button
          type="button"
          class="print-button"
          @click="printClients"
        >
          Print clients
        </button>

        <!-- NUOVO CLIENTE -->
        <button
          type="button"
          class="new-button"
          @click="$router.push('/clients/new')"
        >
          + New client
        </button>

      </div>

    </div>


    <!-- CARICAMENTO -->
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
            <th @click="sortBy('id')" class="sortable">
                ID
                <span v-if="sortKey === 'id'">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
            </th>

            <th @click="sortBy('codice_cliente')" class="sortable">
                Code
                <span v-if="sortKey === 'codice_cliente'">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
            </th>

            <th @click="sortBy('ragione_sociale')" class="sortable">
                Company name
                <span v-if="sortKey === 'ragione_sociale'">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
            </th>

            <th @click="sortBy('partita_iva')" class="sortable">
                VAT number
                <span v-if="sortKey === 'partita_iva'">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
            </th>

            <th @click="sortBy('indirizzo')" class="sortable">
                Address
                <span v-if="sortKey === 'indirizzo'">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
            </th>

            <th @click="sortBy('citta')" class="sortable">
                City
                <span v-if="sortKey === 'citta'">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
            </th>

            <th @click="sortBy('provincia')" class="sortable">
                Province
                <span v-if="sortKey === 'provincia'">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
            </th>

            <th @click="sortBy('cap')" class="sortable">
                Postal code
                <span v-if="sortKey === 'cap'">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
            </th>
            <th @click="sortBy('country_name')" class="sortable">
                Country
                <span v-if="sortKey === 'country_name'">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
            </th>
            <th>Logo</th>
            <th class="actions-column">
                Actions
            </th>
        </tr>
      </thead>

      <tbody>

        <tr
          v-for="client in visibleClients"
          :key="client.id"
        >
          <td>
            {{ client.id }}
          </td>

          <td>
            {{ client.codice_cliente }}
          </td>

          <td>
            {{ client.ragione_sociale }}
          </td>

          <td>
            {{ client.partita_iva }}
          </td>

          <td>
            {{ client.indirizzo }}
          </td>

          <td>
            {{ client.citta }}
          </td>

          <td>
            {{ client.provincia }}
          </td>

          <td>
            {{ client.cap }}
          </td>
          <td>
            {{ client.country_name }}
          </td>
          <td>
            <div class="client-logo-cell">
              <img
                v-if="client.logo_path"
                :src="`/uploads/logos/${client.logo_path}`"
                :alt="`Logo for ${client.ragione_sociale}`"
                class="client-logo"
              />

              <span
                v-else
                class="no-logo"
              >
                —
              </span>
            </div>
          </td>            
          <td class="actions">

          <button
            type="button"
            class="action-button view"
            title="View"
            @click="$router.push(`/clients/view/${client.id}`)"
          >
            👁
          </button>

            <button
            type="button"
            class="action-button edit"
            title="Edit"
            @click="$router.push(`/clients/edit/${client.id}`)"
            >
            ✏️
            </button>

            <button
              type="button"
              class="action-button copy"
              title="Duplicate"
              @click="duplicateClient(client)"
            >
              📋
            </button>
            <button
              v-if="isAdmin"
              class="action-button delete"
              title="Delete"
              @click="deleteClient(client)"
            >
              🗑️
            </button>

          </td>          
        </tr>


        <!-- NESSUN RISULTATO -->
        <tr v-if="visibleClients.length === 0">
          <td
            colspan="11"
            class="no-results"
          >
            No clients found
          </td>
        </tr>

      </tbody>

    </table>
    <div
    v-if="!loading && !error && totalPages > 1"
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
        :class="{ active: currentPage === page }"
        @click="goToPage(page)"
    >
        {{ page }}
    </button>

    <button
        type="button"
        :disabled="currentPage === totalPages"
        @click="nextPage"
    >
        Next →
    </button>
    </div>
  </div>

  <article class="clients-print">
    <header class="clients-print-header">
      <div>
        <h1>CLIENTS</h1>
        <p>
          {{ sortedClients.length }} clients
          <span v-if="search.trim()"> — Search: {{ search.trim() }}</span>
        </p>
      </div>
      <p>{{ new Date().toLocaleDateString('en-GB') }}</p>
    </header>

    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Code</th>
          <th>Company name</th>
          <th>VAT number</th>
          <th>Address</th>
          <th>City</th>
          <th>Province</th>
          <th>Postal code</th>
          <th>Country</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="client in sortedClients" :key="client.id">
          <td>{{ client.id }}</td>
          <td>{{ client.codice_cliente || '—' }}</td>
          <td>{{ client.ragione_sociale || '—' }}</td>
          <td>{{ client.partita_iva || '—' }}</td>
          <td>{{ client.indirizzo || '—' }}</td>
          <td>{{ client.citta || '—' }}</td>
          <td>{{ client.provincia || '—' }}</td>
          <td>{{ client.cap || '—' }}</td>
          <td>{{ client.country_name || '—' }}</td>
        </tr>
        <tr v-if="sortedClients.length === 0">
          <td colspan="9">No clients found</td>
        </tr>
      </tbody>
    </table>
  </article>
</template>

<style scoped>
.page {
  padding: 30px;
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
}

.client-count {
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

.clients-print {
  display: none;
}

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

.no-results {
  text-align: center;
  padding: 30px;
  color: #6b7280;
}

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

.sortable {
  cursor: pointer;
  user-select: none;
}

.sortable:hover {
  background: #e5e7eb;
}

.actions-column {
  width: 140px;
  text-align: center;
}

.actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
}

.action-button {
  width: 34px;
  height: 34px;

  display: flex;
  align-items: center;
  justify-content: center;

  border: 1px solid #d1d5db;
  border-radius: 6px;

  background: white;
  cursor: pointer;

  font-size: 15px;
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

.action-button.delete:hover {
  border-color: #dc2626;
}

@media (max-width: 800px) {
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

  .clients-print,
  .clients-print * {
    visibility: visible !important;
  }

  .clients-print {
    display: block !important;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    color: #111;
    background: white;
    font: 9pt Arial, sans-serif;
  }

  .clients-print-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #999;
  }

  .clients-print-header h1 {
    margin: 0;
    font-size: 18pt;
  }

  .clients-print-header p {
    margin: 5px 0 0;
  }

  .clients-print table {
    width: 100%;
    border-collapse: collapse;
  }

  .clients-print th,
  .clients-print td {
    padding: 6px 7px;
    border: 1px solid #bbb;
    text-align: left;
    vertical-align: top;
  }

  .clients-print th {
    background: #f3f4f6 !important;
    font-weight: 700;
  }

  .clients-print tr {
    break-inside: avoid;
  }
}

.client-logo-cell {
  width: 55px;
  height: 45px;

  display: flex;
  align-items: center;
  justify-content: center;
}

.client-logo {
  max-width: 50px;
  max-height: 40px;

  object-fit: contain;

  border-radius: 4px;

  background: white;
}

.no-logo {
  color: #9ca3af;
}

</style>