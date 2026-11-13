import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it, vi } from 'vitest'
import { Button, ButtonLink } from './Button'
import { buttonClasses } from './button-variants'

describe('Button', () => {
  it('defaults to type="button" and handles clicks', async () => {
    const onClick = vi.fn<() => void>()
    render(<Button onClick={onClick}>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })

    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn<() => void>()
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('merges custom classes over variant defaults', () => {
    expect(buttonClasses({ size: 'md', className: 'px-10' })).toContain('px-10')
    expect(buttonClasses({ size: 'md', className: 'px-10' })).not.toContain('px-5')
  })
})

describe('ButtonLink', () => {
  it('renders a router link', () => {
    const router = createMemoryRouter([
      { path: '/', element: <ButtonLink to="/studio">Go</ButtonLink> },
    ])
    render(<RouterProvider router={router} />)
    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute('href', '/studio')
  })
})
