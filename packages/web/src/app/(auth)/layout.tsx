"use client"

import background from "@rahoot/web/assets/background.svg"
import logo from "@rahoot/web/assets/logo.svg"
import Loader from "@rahoot/web/components/Loader"
import { useSocket } from "@rahoot/web/contexts/socketProvider"
import Image from "next/image"
import { PropsWithChildren, useEffect } from "react"

const AuthLayout = ({ children }: PropsWithChildren) => {
  const { isConnected, connect } = useSocket()
  useEffect(() => {
    if (!isConnected) {
      connect()
    }
  }, [connect, isConnected])

  if (!isConnected) {
    return (
      <section className="relative flex min-h-screen flex-col items-center justify-center">
        <Image
          src={background}
          alt="background"
          className="pointer-events-none absolute h-full w-full object-cover"
          fill
        />

        {/* Logo in top right corner */}
        <div className="absolute top-4 right-4 z-20">
          <Image src={logo} className="h-16 w-auto" alt="logo" />
        </div>

        <Image src={logo} className="relative z-10 mb-6 h-32 w-auto" alt="logo" />
        <Loader className="relative z-10 h-23" />
        <h2 className="relative z-10 mt-2 text-center text-2xl font-bold text-[#082F4F] drop-shadow-lg md:text-3xl">
          Loading...
        </h2>
      </section>
    )
  }

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center">
      <Image
        src={background}
        alt="background"
        className="pointer-events-none absolute h-full w-full object-cover"
        fill
      />

      {/* Logo in top right corner */}
      <div className="absolute top-4 right-4 z-20">
        <Image src={logo} className="h-16 w-auto" alt="logo" />
      </div>

      <Image src={logo} className="relative z-10 mb-6 h-32 w-auto" alt="logo" />
      {children}
    </section>
  )
}

export default AuthLayout
