<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const username = ref('')
const password = ref('')

const loading = ref(false)
const error = ref('')

async function login() {
  error.value = ''

  if (!username.value || !password.value) {
    error.value = 'Enter your username and password'
    return
  }

  try {
    loading.value = true

    const response = await fetch('/api/login', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        username: username.value,
        password: password.value,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Login failed'
      )
    }

    localStorage.setItem(
      'user',
      JSON.stringify(data.user)
    )

    localStorage.setItem(
        'token',
        data.token
    )
    router.push('/')

  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">

    <div class="login-card">

      <div class="login-header">
        <h1>Business Manager</h1>

        <p>
          Sign in to your account
        </p>
      </div>

      <form
        class="login-form"
        @submit.prevent="login"
      >

        <div class="form-group">
          <label>
            Username
          </label>

          <input
            v-model="username"
            type="text"
            autocomplete="username"
            placeholder="Username"
            autofocus
          />
        </div>


        <div class="form-group">
          <label>
            Password
          </label>

          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Password"
          />
        </div>


        <div
          v-if="error"
          class="error"
        >
          {{ error }}
        </div>


        <button
          type="submit"
          class="login-button"
          :disabled="loading"
        >
          {{
            loading
              ? 'Signing in...'
              : 'Sign in'
          }}
        </button>

      </form>

    </div>

  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 20px;

  background: #f3f4f6;
}

.login-card {
  width: 100%;
  max-width: 420px;

  padding: 32px;

  background: white;

  border: 1px solid #e5e7eb;
  border-radius: 12px;

  box-shadow:
    0 10px 30px
    rgba(0, 0, 0, 0.08);
}

.login-header {
  margin-bottom: 28px;

  text-align: center;
}

.login-header h1 {
  margin: 0;

  color: #111827;
}

.login-header p {
  margin: 8px 0 0;

  color: #6b7280;
}

.login-form {
  display: flex;
  flex-direction: column;

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

.form-group input {
  width: 100%;

  padding: 11px 12px;

  border: 1px solid #d1d5db;
  border-radius: 6px;

  font-size: 14px;
}

.form-group input:focus {
  outline: none;

  border-color: #2563eb;

  box-shadow:
    0 0 0 2px
    rgba(37, 99, 235, 0.1);
}

.login-button {
  width: 100%;

  padding: 11px;

  border: none;
  border-radius: 6px;

  background: #2563eb;
  color: white;

  font-weight: 600;

  cursor: pointer;
}

.login-button:hover:not(:disabled) {
  background: #1d4ed8;
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  padding: 10px 12px;

  background: #fee2e2;
  color: #991b1b;

  border-radius: 6px;

  font-size: 14px;
}
</style>