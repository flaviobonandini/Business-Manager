import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },

    {
      path: '/',
      name: 'dashboard',
      component: HomeView,
    },

    {
      path: '/clients',
      name: 'clients',
      component: () => import('../views/ClientsView.vue'),
    },

    {
      path: '/clients/new',
      name: 'client-new',
      component: () => import('../views/ClientFormView.vue'),
    },

    {
      path: '/clients/view/:id',
      name: 'client-view',
      component: () => import('../views/ClientFormView.vue'),
    },

    {
      path: '/clients/edit/:id',
      name: 'client-edit',
      component: () => import('../views/ClientFormView.vue'),
    },

    {
      path: '/products',
      name: 'products',
      component: () => import('../views/ProductsView.vue'),
    },

    {
      path: '/products/new',
      name: 'product-new',
      component: () => import('../views/ProductFormView.vue'),
    },

    {
      path: '/products/view/:id',
      name: 'product-view',
      component: () => import('../views/ProductFormView.vue'),
    },

    {
      path: '/products/edit/:id',
      name: 'product-edit',
      component: () => import('../views/ProductFormView.vue'),
    },

    {
      path: '/users',
      name: 'users',
      component: () => import('../views/UsersView.vue'),
    },
    {
      path: '/users/new',
      name: 'user-new',
      component: () => import('../views/UserFormView.vue'),
    },
    {
      path: '/users/view/:id',
      name: 'user-view',
      component: () => import('../views/UserFormView.vue'),
    },
    {
      path: '/users/edit/:id',
      name: 'user-edit',
      component: () => import('../views/UserFormView.vue'),
    },
    {
      path: '/settings/payments',
      name: 'settings-payments',
      component: () => import('../views/settings/PaymentMethodsView.vue'),
    },
    {
      path: '/settings/payments/new',
      name: 'settings-payment-new',
      component: () => import('../views/settings/PaymentMethodFormView.vue'),
    },
    {
      path: '/settings/payments/view/:id',
      name: 'settings-payment-view',
      component: () =>
        import('../views/settings/PaymentMethodFormView.vue'),
    },
    {
      path: '/settings/payments/edit/:id',
      name: 'settings-payment-edit',
      component: () =>
        import('../views/settings/PaymentMethodFormView.vue'),
    },

    {
      path: '/settings/product-categories',
      name: 'product-categories',
      component: () =>
        import('../views/settings/ProductCategoriesView.vue')
    },

    {
      path: '/invoices',
      name: 'invoices',
      component: () => import('../views/InvoicesView.vue'),
    },
    {
      path: '/invoices/new',
      name: 'invoice-new',
      component: () => import('../views/InvoiceFormView.vue'),
    },
    {
      path: '/invoices/view/:id',
      name: 'invoice-view',
      component: () => import('../views/InvoiceFormView.vue'),
    },
    {
      path: '/invoices/edit/:id',
      name: 'invoice-edit',
      component: () => import('../views/InvoiceFormView.vue'),
    },

  ],
})

router.beforeEach((to) => {
  const rawUser = localStorage.getItem('user')
  const token = localStorage.getItem('token')

  // L'utente è autenticato solo se abbiamo ENTRAMBI
  const isAuthenticated = Boolean(rawUser && token)

  // Non autenticato -> Login
  if (!isAuthenticated && to.name !== 'login') {
    return { name: 'login' }
  }

  // Già autenticato -> niente pagina Login
  if (isAuthenticated && to.name === 'login') {
    return { name: 'dashboard' }
  }

  let user = null

  if (rawUser) {
    try {
      user = JSON.parse(rawUser)
    } catch {
      localStorage.removeItem('user')
      localStorage.removeItem('token')

      return { name: 'login' }
    }
  }

  const role = String(user?.role || '').toLowerCase()

  const isAdmin =
    role === 'admin' ||
    role === 'superadmin'

  // Gestione utenti consentita solo agli amministratori
  if (
    (
      to.path.startsWith('/users') ||
      to.path.startsWith('/settings')
    ) &&
    !isAdmin
  ) {
    return { name: 'dashboard' }
  }
  return true
})

export default router