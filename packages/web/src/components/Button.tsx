import clsx from "clsx"
import { ButtonHTMLAttributes, PropsWithChildren } from "react"

type Props = ButtonHTMLAttributes<HTMLButtonElement> & PropsWithChildren

const Button = ({ children, className, ...otherProps }: Props) => (
  <button
    className={clsx(
      "btn-shadow bg-[#2473B9] rounded-md p-2 text-lg font-semibold text-white",
      className,
    )}
    {...otherProps}
  >
    <span>{children}</span>
  </button>
)

export default Button
