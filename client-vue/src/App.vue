<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import ScrollToTop from './components/ScrollToTop.vue'

const router = useRouter()
const route = useRoute()

const settingsOpen = ref(false)
const currentUser = ref(null)

function loadCurrentUser() {
  const storedUser = localStorage.getItem('user')

  currentUser.value = storedUser
    ? JSON.parse(storedUser)
    : null
}

loadCurrentUser()

watch(
  () => route.fullPath,
  () => {
    loadCurrentUser()

    // Se entri in una pagina settings,
    // il sottomenu resta aperto
    if (route.path.startsWith('/settings')) {
      settingsOpen.value = true
    }
  },
  {
    immediate: true,
  }
)

const canManageUsers = computed(() => {
  if (!currentUser.value) {
    return false
  }

  const role = String(
    currentUser.value.role || ''
  ).toLowerCase()

  return (
    role === 'admin' ||
    role === 'superadmin'
  )
})

function logout() {
  localStorage.removeItem('user')
  localStorage.removeItem('token')

  currentUser.value = null

  router.push('/login')
}
</script>

<template>
  <div class="app-layout">

    <aside class="sidebar">

      <!-- UTENTE -->
      <div class="sidebar-user">

        <div class="user-name">
          {{ currentUser?.nome || currentUser?.username }}
          {{ currentUser?.cognome || '' }}
        </div>

        <div class="user-role">
          {{ currentUser?.role }}
        </div>

      </div>


      <!-- TITOLO -->
      <div class="sidebar-title">
        Business Manager
      </div>


      <!-- MENU -->
      <nav class="sidebar-nav">

        <RouterLink to="/">
          Dashboard
        </RouterLink>

        <RouterLink to="/clients">
          Clients
        </RouterLink>

        <RouterLink to="/invoices">
          Invoices
        </RouterLink>
        
        <RouterLink to="/products">
          Products
        </RouterLink>

        <RouterLink
          v-if="canManageUsers"
          to="/users"
        >
          Users
        </RouterLink>


        <!-- SETTINGS -->
        <div
          v-if="canManageUsers"
          class="sidebar-group"
        >

          <button
            type="button"
            class="sidebar-group-button"
            :class="{
              active: route.path.startsWith('/settings')
            }"
            @click="settingsOpen = !settingsOpen"
          >

            <span class="settings-label">
              <span>⚙️</span>
              <span>Settings</span>
            </span>

            <span class="settings-arrow">
              {{ settingsOpen ? '▾' : '▸' }}
            </span>

          </button>


          <div
            v-if="settingsOpen"
            class="sidebar-submenu"
          >

            <RouterLink
              to="/settings/payments"
            >
              Payments
            </RouterLink>

            <RouterLink
              to="/settings/product-categories"
            >
              Product categories
            </RouterLink>

          </div>

        </div>

      </nav>


      <!-- LOGOUT -->
      <div class="sidebar-footer">

        <button
          type="button"
          class="logout-button"
          @click="logout"
        >
          Logout
        </button>

      </div>

    </aside>


    <!-- CONTENUTO -->
    <main class="main-content">
      <RouterView />
    </main>

  </div>

  <ScrollToTop />
</template>

<style scoped>
/* =========================================================
   LAYOUT
========================================================= */

.app-layout {
  min-height: 100vh;
  background: #f3f4f6;
}


/* =========================================================
   SIDEBAR
========================================================= */

.sidebar {
  position: fixed;

  top: 0;
  left: 0;

  width: 240px;
  height: 100vh;

  display: flex;
  flex-direction: column;

  box-sizing: border-box;

  padding: 20px 16px;

  background: #111827;
  color: white;

  overflow-y: auto;

  z-index: 1000;
}


/* =========================================================
   UTENTE
========================================================= */

.sidebar-user {
  padding: 0 12px 18px;

  margin-bottom: 18px;

  border-bottom: 1px solid #374151;
}

.user-name {
  color: white;

  font-size: 15px;
  font-weight: 600;
}

.user-role {
  margin-top: 4px;

  color: #9ca3af;

  font-size: 12px;

  text-transform: capitalize;
}


/* =========================================================
   TITOLO
========================================================= */

.sidebar-title {
  padding: 0 12px;

  margin-bottom: 25px;

  font-size: 22px;
  font-weight: 700;

  color: white;
}


/* =========================================================
   MENU PRINCIPALE
========================================================= */

.sidebar-nav {
  display: flex;
  flex-direction: column;

  gap: 8px;
}

.sidebar-nav > a {
  display: block;

  padding: 12px 14px;

  border-radius: 8px;

  color: #d1d5db;

  text-decoration: none;

  transition:
    background 0.2s,
    color 0.2s;
}

.sidebar-nav > a:hover {
  background: #1f2937;
  color: white;
}

.sidebar-nav > a.router-link-exact-active {
  background: #2563eb;
  color: white;
}


/* =========================================================
   SETTINGS
========================================================= */

.sidebar-group {
  display: flex;
  flex-direction: column;

  gap: 4px;
}

.sidebar-group-button {
  width: 100%;

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 12px 14px;

  border: 0;
  border-radius: 8px;

  background: transparent;
  color: #d1d5db;

  font-family: inherit;
  font-size: 14px;

  cursor: pointer;

  transition:
    background 0.2s,
    color 0.2s;
}

.sidebar-group-button:hover {
  background: #1f2937;
  color: white;
}

.sidebar-group-button.active {
  background: #1f2937;
  color: white;
}

.settings-label {
  display: flex;
  align-items: center;

  gap: 8px;
}

.settings-arrow {
  font-size: 13px;
}


/* =========================================================
   SOTTOMENU
========================================================= */

.sidebar-submenu {
  display: flex;
  flex-direction: column;

  padding-left: 18px;

  margin-top: 2px;
}

.sidebar-submenu a {
  display: block;

  padding: 9px 12px;

  border-radius: 7px;

  color: #9ca3af;

  font-size: 13px;

  text-decoration: none;

  transition:
    background 0.2s,
    color 0.2s;
}

.sidebar-submenu a:hover {
  background: #1f2937;
  color: white;
}

.sidebar-submenu a.router-link-exact-active {
  background: #374151;
  color: white;
}


/* =========================================================
   LOGOUT
========================================================= */

.sidebar-footer {
  margin-top: auto;

  padding-top: 20px;
}

.logout-button {
  width: 100%;

  padding: 12px 14px;

  border: 0;
  border-radius: 8px;

  background: #991b1b;
  color: white;

  font-weight: 600;

  cursor: pointer;

  transition: background 0.2s;
}

.logout-button:hover {
  background: #7f1d1d;
}


/* =========================================================
   CONTENUTO PRINCIPALE
========================================================= */

.main-content {
  margin-left: 240px;

  width: calc(100% - 240px);
  min-height: 100vh;

  box-sizing: border-box;
}


/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 800px) {

  .sidebar {
    width: 210px;
  }

  .main-content {
    margin-left: 210px;

    width: calc(100% - 210px);
  }

}
</style>