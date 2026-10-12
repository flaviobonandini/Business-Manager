export async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token')

  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set(
      'Authorization',
      `Bearer ${token}`
    )
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Token mancante, non valido o scaduto
  if (response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    // Evitiamo redirect inutili se siamo già nel login
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  return response
}