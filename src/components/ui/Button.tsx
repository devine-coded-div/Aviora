import type { ComponentPropsWithRef } from 'react'
import { Link, type LinkProps } from 'react-router'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './button-variants'

interface StyleProps {
  variant?: ButtonVariant | undefined
  size?: ButtonSize | undefined
}

export type ButtonProps = ComponentPropsWithRef<'button'> & StyleProps

/** Native button. Defaults to `type="button"` so it never submits a form by accident. */
export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />
}

export type ButtonLinkProps = LinkProps & StyleProps

/** Router link styled as a button — use for navigation, `Button` for actions. */
export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return (
    <Link
      className={buttonClasses({ variant, size, className: className as string | undefined })}
      {...props}
    />
  )
}
