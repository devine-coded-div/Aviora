import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from './routes'

// Keep routing in sync with Vite's `base` (e.g. /ai-avatar-studio/ on GitHub Pages).
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'

const router = createBrowserRouter(routes, { basename })

export function App() {
  return <RouterProvider router={router} />
}
