import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, type RouteObject } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from '@/app/routes'

/** Load lazy routes up front so tests can query the page synchronously after rendering. */
async function resolveLazy(table: RouteObject[]): Promise<RouteObject[]> {
  return Promise.all(
    table.map(async (route) => {
      const { lazy, children, ...rest } = route
      const loaded = typeof lazy === 'function' ? await lazy() : {}
      const resolved = { ...rest, ...loaded } as RouteObject
      if (children)
        (resolved as { children?: RouteObject[] }).children = await resolveLazy(children)
      return resolved
    }),
  )
}

/** Render the real route table at a given URL using an in-memory router. */
export async function renderRoute(path: string) {
  const router = createMemoryRouter(await resolveLazy(routes), { initialEntries: [path] })
  // applyAccept: false — real file dialogs let users pick any file, so validation must be tested.
  const user = userEvent.setup({ applyAccept: false })
  const view = render(<RouterProvider router={router} />)
  return { ...view, router, user }
}
