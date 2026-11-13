import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from '@/app/routes'

/** Render the real route table at a given URL using an in-memory router. */
export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  // applyAccept: false — real file dialogs let users pick any file, so validation must be tested.
  const user = userEvent.setup({ applyAccept: false })
  const view = render(<RouterProvider router={router} />)
  return { ...view, router, user }
}
