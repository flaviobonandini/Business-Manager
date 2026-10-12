<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { authFetch } from '../../utils/authFetch'

const categories = ref([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const search = ref('')
const editingId = ref(null)
const notificationMessage = ref('')
const notificationType = ref('success')
let notificationTimer = null

const form = ref({
  name: '',
  description: '',
  sort_order: 0,
  active: 1
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


const filteredCategories = computed(() => {

  const value = search.value
    .trim()
    .toLowerCase()

  if (!value) {
    return categories.value
  }

  return categories.value.filter(category => {

    return (
      String(category.id).includes(value) ||

      String(category.name || '')
        .toLowerCase()
        .includes(value) ||

      String(category.description || '')
        .toLowerCase()
        .includes(value)
    )
  })
})

function printCategories() {
  window.print()
}


async function loadCategories() {

  try {

    loading.value = true
    error.value = ''

    const response = await authFetch(
      '/api/product-categories/all'
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Failed to load categories.'
      )
    }

    categories.value = data

  } catch (err) {

    console.error(
      'Failed to load categories:',
      err
    )

    error.value = err.message

  } finally {

    loading.value = false
  }
}


function newCategory() {

  editingId.value = null

  form.value = {
    name: '',
    description: '',
    sort_order: 0,
    active: 1
  }
}


function editCategory(category) {

  editingId.value = category.id

  form.value = {
    name: category.name || '',
    description: category.description || '',
    sort_order: Number(category.sort_order) || 0,
    active: Number(category.active)
  }
}


async function saveCategory() {

  try {

    saving.value = true
    error.value = ''

    if (!form.value.name.trim()) {
      throw new Error(
        'Category name is required.'
      )
    }

    const payload = {
      name: form.value.name,
      description: form.value.description,
      sort_order: Number(form.value.sort_order) || 0,
      active: Number(form.value.active)
    }

    const url = editingId.value
      ? `/api/product-categories/${editingId.value}`
      : '/api/product-categories'

    const method = editingId.value
      ? 'PUT'
      : 'POST'

    const response = await authFetch(
      url,
      {
        method,

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify(payload)
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Failed to save the category.'
      )
    }

    showNotification(
      editingId.value
        ? 'Category updated successfully.'
        : 'Category created successfully.'
    )

    newCategory()

    await loadCategories()

  } catch (err) {

    console.error(
      'Failed to save category:',
      err
    )

    error.value = err.message
    showNotification(
      error.value,
      'error'
    )

  } finally {

    saving.value = false
  }
}


async function toggleActive(category) {

  try {

    const payload = {
      name: category.name,
      description: category.description,
      sort_order: category.sort_order,
      active: Number(category.active) === 1 ? 0 : 1
    }

    const response = await authFetch(
      `/api/product-categories/${category.id}`,
      {
        method: 'PUT',

        headers: {
          'Content-Type': 'application/json'
        },

        body: JSON.stringify(payload)
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Failed to update the category.'
      )
    }

    await loadCategories()

  } catch (err) {

    console.error(err)

    error.value = err.message
    showNotification(
      error.value,
      'error'
    )
  }
}


onMounted(() => {
  loadCategories()
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
        <h1>Product categories</h1>
        <p>
          Manage the categories used for products
        </p>
      </div>

      <button
        class="new-button"
        type="button"
        @click="newCategory"
      >
        + New category
      </button>

    </div>


    <div
      v-if="error"
      class="error-message"
    >
      {{ error }}
    </div>


    <div class="layout">

      <!-- LISTA -->

      <div class="section">

        <div class="list-header">

        <div>

            <h2>
            Product categories
            </h2>

            <span class="count">
            {{ filteredCategories.length }}
            {{
              filteredCategories.length === 1
                ? 'category'
                : 'categories'
            }}
            </span>

        </div>

        <div class="list-actions">
          <input
              v-model="search"
              type="text"
              class="search-input"
              placeholder="Search categories..."
          />

          <button
            type="button"
            class="print-button"
            @click="printCategories"
          >
            Print categories
          </button>
        </div>

        </div>

        <div v-if="loading">
          Loading...
        </div>

        <table v-else>

          <thead>

            <tr>
              <th>Order</th>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            <tr
            v-for="category in filteredCategories"
            :key="category.id"
            :class="{
                'selected-row': editingId === category.id
            }"
            >

              <td>
                {{ category.sort_order }}
              </td>

              <td>
                <strong>
                  {{ category.name }}
                </strong>
              </td>

              <td>
                {{ category.description || '-' }}
              </td>

              <td>

                <span
                  class="status"
                  :class="{
                    active: Number(category.active) === 1,
                    inactive: Number(category.active) === 0
                  }"
                >
                  {{
                    Number(category.active) === 1
                      ? 'Active'
                      : 'Inactive'
                  }}
                </span>

              </td>

              <td class="actions">

                <button
                  type="button"
                  class="action-button"
                  title="Edit"
                  aria-label="Edit category"
                  @click="editCategory(category)"
                >
                  ✏️
                </button>

                <button
                  type="button"
                  class="action-button"
                  :title="
                    Number(category.active) === 1
                      ? 'Deactivate'
                      : 'Activate'
                  "
                  :aria-label="
                    Number(category.active) === 1
                      ? 'Deactivate category'
                      : 'Activate category'
                  "
                  @click="toggleActive(category)"
                >
                  {{
                    Number(category.active) === 1
                      ? '🔴'
                      : '🟢'
                  }}
                </button>

              </td>

            </tr>

            <!-- SE NON CI SONO RISULTATI -->

            <tr
                v-if="filteredCategories.length === 0"
            >
                <td
                colspan="5"
                class="empty"
                >
                No categories found
                </td>
            </tr>

          </tbody>

        </table>

      </div>


      <!-- FORM -->

      <div class="section category-form">

        <h2>
          {{
            editingId
              ? 'Edit category'
              : 'New category'
          }}
        </h2>

        <div class="form-group">

          <label>
            Name *
          </label>

          <input
            v-model="form.name"
            type="text"
          />

        </div>


        <div class="form-group">

          <label>
            Description
          </label>

          <textarea
            v-model="form.description"
            rows="4"
          ></textarea>

        </div>


        <div class="form-group">

          <label>
            Order
          </label>

          <input
            v-model.number="form.sort_order"
            type="number"
            min="0"
            step="1"
          />

        </div>


        <div class="form-group checkbox-group">

          <input
            id="category-active"
            v-model="form.active"
            type="checkbox"
            :true-value="1"
            :false-value="0"
          />

          <label for="category-active">
            Category is active
          </label>

        </div>


        <div class="form-actions">

          <button
            v-if="editingId"
            type="button"
            class="cancel-button"
            @click="newCategory"
          >
            Cancel
          </button>

          <button
            type="button"
            class="save-button"
            :disabled="saving"
            @click="saveCategory"
          >
            {{
              saving
                ? 'Saving...'
                : editingId
                  ? 'Save changes'
                  : 'Create category'
            }}
          </button>

        </div>

      </div>

    </div>

  </div>

  <article class="categories-print">
    <header class="categories-print-header">
      <div>
        <h1>PRODUCT CATEGORIES</h1>
        <p>
          {{ filteredCategories.length }} categories
          <span v-if="search.trim()"> — Search: {{ search.trim() }}</span>
        </p>
      </div>
      <p>{{ new Date().toLocaleDateString('en-GB') }}</p>
    </header>

    <table>
      <thead>
        <tr>
          <th>Order</th>
          <th>Name</th>
          <th>Description</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="category in filteredCategories" :key="category.id">
          <td>{{ category.sort_order }}</td>
          <td>{{ category.name }}</td>
          <td>{{ category.description || '—' }}</td>
          <td>{{ Number(category.active) === 1 ? 'Active' : 'Inactive' }}</td>
        </tr>
        <tr v-if="filteredCategories.length === 0">
          <td colspan="4">No categories found</td>
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

.layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.section {
  padding: 22px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .1);
}

.section h2 {
  margin: 0 0 20px;
  font-size: 18px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 12px 10px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
}

th {
  background: #f9fafb;
  font-size: 13px;
  color: #374151;
}

td {
  font-size: 14px;
  color: #374151;
}

.actions {
  white-space: nowrap;
}

.action-button {
  border: 0;
  background: transparent;
  padding: 6px;
  cursor: pointer;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 18px;
}

.form-group label {
  margin-bottom: 6px;
  font-weight: 600;
  font-size: 14px;
  color: #374151;
}

.form-group input,
.form-group textarea {
  padding: 10px 11px;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  font-size: 14px;
}

.checkbox-group {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.checkbox-group label {
  margin: 0;
}

.status {
  padding: 4px 9px;
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

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

.cancel-button {
  padding: 10px 16px;
  border: 0;
  border-radius: 7px;
  background: #e5e7eb;
  cursor: pointer;
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
  padding: 12px;
  border-radius: 7px;
  background: #fee2e2;
  color: #991b1b;
}

.selected-row {
  background: #eff6ff;
}

.selected-row td:first-child {
  border-left: 3px solid #2563eb;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: 18px;
  gap: 16px;
}

.list-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.list-header h2 {
  margin: 0 0 4px;
}

.count {
  font-size: 13px;
  color: #6b7280;
}

.search-input {
  width: 220px;

  padding: 9px 11px;

  box-sizing: border-box;

  border: 1px solid #d1d5db;
  border-radius: 7px;

  font-size: 14px;

  outline: none;
}

.search-input:focus {
  border-color: #2563eb;
}

.print-button {
  flex: 0 0 auto;
  padding: 9px 13px;
  border: 1px solid #2563eb;
  border-radius: 7px;
  background: white;
  color: #2563eb;
  font-weight: 600;
  cursor: pointer;
}

.print-button:hover {
  background: #eff6ff;
}

.categories-print {
  display: none;
}

.empty {
  padding: 25px;

  text-align: center;

  color: #6b7280;
}

@media (max-width: 900px) {

  .layout {
    grid-template-columns: 1fr;
  }

  .list-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .list-actions {
    width: 100%;
  }

  .list-actions .search-input {
    flex: 1;
    min-width: 0;
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

  .categories-print,
  .categories-print * {
    visibility: visible !important;
  }

  .categories-print {
    display: block !important;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    color: #111;
    background: white;
    font: 9pt Arial, sans-serif;
  }

  .categories-print-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #999;
  }

  .categories-print-header h1 {
    margin: 0;
    font-size: 18pt;
  }

  .categories-print-header p {
    margin: 5px 0 0;
  }

  .categories-print table {
    width: 100%;
    border-collapse: collapse;
  }

  .categories-print th,
  .categories-print td {
    padding: 6px 7px;
    border: 1px solid #bbb;
    text-align: left;
    vertical-align: top;
  }

  .categories-print th {
    background: #f3f4f6 !important;
    font-weight: 700;
  }

  .categories-print tr {
    break-inside: avoid;
  }
}
</style>
