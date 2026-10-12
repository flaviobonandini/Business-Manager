<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authFetch } from '../utils/authFetch'

const route = useRoute()
const router = useRouter()

const userId = computed(() => route.params.id)

const isView = computed(() => route.name === 'user-view')
const isEdit = computed(() => route.name === 'user-edit')
const isNew = computed(() => route.name === 'user-new')

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const notificationMessage = ref('')
const notificationType = ref('success')
let notificationTimer = null

const user = ref({
  username: '',
  email: '',
  nome: '',
  cognome: '',
  password: '',
  confirmPassword: '',
  role: 'user',
  level: 10,
  active: 1,
  last_login: null,
  created_at: null,
})

function pageTitle() {
  if (isView.value) return 'View user'
  if (isEdit.value) return 'Edit user'
  return 'New user'
}

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('en-US')
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

async function loadUser() {
  if (!userId.value) {
    return
  }

  try {
    loading.value = true
    error.value = ''

    const response = await authFetch(`/api/users/${userId.value}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Failed to load the user.'
      )
    }

    user.value = {
      ...user.value,
      ...data,
      password: '',
      confirmPassword: '',
    }

  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function saveUser() {
  if (isView.value) {
    return
  }

  error.value = ''

  if (!user.value.username.trim()) {
    error.value = 'Username is required.'
    showNotification(error.value, 'error')
    return
  }

  if (!user.value.email.trim()) {
    error.value = 'Email is required.'
    showNotification(error.value, 'error')
    return
  }

  if (isNew.value && !user.value.password) {
    error.value = 'Password is required.'
    showNotification(error.value, 'error')
    return
  }

  if (
    user.value.password &&
    user.value.password !== user.value.confirmPassword
  ) {
    error.value = 'The passwords do not match.'
    showNotification(error.value, 'error')
    return
  }

  try {
    saving.value = true

    const payload = {
      username: user.value.username.trim(),
      email: user.value.email.trim(),
      nome: user.value.nome,
      cognome: user.value.cognome,
      role: user.value.role,
      level: Number(user.value.level),
      active: Number(user.value.active),
      password: user.value.password,
    }

    const url = isEdit.value
      ? `/api/users/${userId.value}`
      : '/api/users'

    const method = isEdit.value
      ? 'PUT'
      : 'POST'

    const response = await authFetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Failed to save the user.'
      )
    }

    showNotification(
      isEdit.value
        ? 'User updated successfully.'
        : 'User created successfully.',
      'success',
      1800
    )

    //await wait(900)

    //router.push('/users')

  } catch (err) {
    error.value = err.message
    showNotification(
      error.value,
      'error'
    )
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (isEdit.value || isView.value) {
    await loadUser()
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
        <h1>{{ pageTitle() }}</h1>

        <p v-if="isEdit || isView">
          User ID: {{ userId }}
        </p>

        <p v-else>
          Create a new account
        </p>
      </div>

      <button
        type="button"
        class="back-button"
        @click="router.push('/users')"
      >
        ← Back to users
      </button>
    </div>

    <div v-if="loading">
      Loading...
    </div>

    <div
      v-else-if="error && isView"
      class="error"
    >
      {{ error }}
    </div>

    <form
      v-else
      class="user-form"
      @submit.prevent="saveUser"
    >

      <div class="form-section">
        <h2>User details</h2>

        <div class="form-grid">

          <div class="form-group">
            <label>Username *</label>

            <input
              v-model="user.username"
              type="text"
              :disabled="isView"
            />
          </div>

          <div class="form-group">
            <label>Email *</label>

            <input
              v-model="user.email"
              type="email"
              :disabled="isView"
            />
          </div>

          <div class="form-group">
            <label>First name</label>

            <input
              v-model="user.nome"
              type="text"
              :disabled="isView"
            />
          </div>

          <div class="form-group">
            <label>Last name</label>

            <input
              v-model="user.cognome"
              type="text"
              :disabled="isView"
            />
          </div>

        </div>
      </div>

      <div class="form-section">

        <h2>
          {{
            isEdit
              ? 'Change password'
              : 'Password'
          }}
        </h2>

        <p
          v-if="isEdit"
          class="password-help"
        >
          Leave blank to keep the current password.
        </p>

        <div
          v-if="!isView"
          class="form-grid"
        >

          <div class="form-group">
            <label>
              {{
                isNew
                  ? 'Password *'
                  : 'New password'
              }}
            </label>

            <input
              v-model="user.password"
              type="password"
              autocomplete="new-password"
            />
          </div>

          <div class="form-group">
            <label>Confirm password</label>

            <input
              v-model="user.confirmPassword"
              type="password"
              autocomplete="new-password"
            />
          </div>

        </div>

        <div
          v-else
          class="readonly-password"
        >
          Password cannot be displayed
        </div>

      </div>

      <div class="form-section">

        <h2>Permissions</h2>

        <div class="form-grid">

          <div class="form-group">
            <label>Role</label>

            <select
              v-model="user.role"
              :disabled="isView"
            >
              <option value="user">
                User
              </option>

              <option value="admin">
                Admin
              </option>

              <option value="superAdmin">
                Super Admin
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Level</label>

            <input
              v-model.number="user.level"
              type="number"
              min="0"
              :disabled="isView"
            />
          </div>

          <div class="form-group">
            <label>Status</label>

            <select
              v-model.number="user.active"
              :disabled="isView"
            >
              <option :value="1">
                Active
              </option>

              <option :value="0">
                Disabled
              </option>
            </select>
          </div>

        </div>
      </div>

      <div
        v-if="isEdit || isView"
        class="form-section"
      >
        <h2>Login information</h2>

        <div class="form-grid">

          <div class="form-group">
            <label>Last login</label>

            <input
              :value="formatDate(user.last_login)"
              type="text"
              disabled
            />
          </div>

          <div class="form-group">
            <label>Created on</label>

            <input
              :value="formatDate(user.created_at)"
              type="text"
              disabled
            />
          </div>

        </div>
      </div>

      <div
        v-if="error"
        class="error"
      >
        {{ error }}
      </div>

      <div class="form-actions">

        <button
          type="button"
          class="cancel-button"
          @click="router.push('/users')"
        >
          {{
            isView
              ? 'Close'
              : 'Cancel'
          }}
        </button>

        <button
          v-if="isView"
          type="button"
          class="edit-button"
          @click="router.push(`/users/edit/${userId}`)"
        >
          ✏️ Edit
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
              : isEdit
                ? 'Save changes'
                : 'Save user'
          }}
        </button>

      </div>

    </form>

  </div>
</template>

<style scoped>
.page {
  width: 100%;
  padding: 30px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 25px;
}

.page-header h1 {
  margin: 0;
}

.page-header p {
  margin: 5px 0 0;
  color: #6b7280;
}

.user-form {
  width: 100%;
}

.form-section {
  margin-bottom: 22px;
  padding: 22px;

  background: white;

  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.form-section h2 {
  margin: 0 0 20px;
  font-size: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
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
.form-group select {
  width: 100%;
  padding: 10px 12px;

  border: 1px solid #d1d5db;
  border-radius: 6px;

  background: white;

  font-size: 14px;
}

.form-group input:disabled,
.form-group select:disabled {
  background: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}

.password-help {
  margin: -10px 0 20px;
  color: #6b7280;
  font-size: 13px;
}

.readonly-password {
  padding: 12px;
  background: #f3f4f6;
  border-radius: 6px;
  color: #6b7280;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.save-button,
.cancel-button,
.back-button,
.edit-button {
  padding: 10px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.save-button,
.edit-button {
  border: 0;
  background: #2563eb;
  color: white;
}

.save-button:hover:not(:disabled),
.edit-button:hover {
  background: #1d4ed8;
}

.cancel-button,
.back-button {
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
}

.cancel-button:hover,
.back-button:hover {
  background: #f3f4f6;
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
  margin-bottom: 20px;
  padding: 12px;

  border-radius: 6px;

  background: #fee2e2;
  color: #991b1b;
}

@media (max-width: 800px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    gap: 15px;
    flex-direction: column;
  }
}
</style>
