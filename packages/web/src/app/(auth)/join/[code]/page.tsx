"use client"

import { STATUS } from "@rahoot/common/types/game/status"
import Button from "@rahoot/web/components/Button"
import Form from "@rahoot/web/components/Form"
import Input from "@rahoot/web/components/Input"
import { useEvent, useSocket } from "@rahoot/web/contexts/socketProvider"
import { usePlayerStore } from "@rahoot/web/stores/player"
import { useParams, useRouter } from "next/navigation"
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"

const JoinWithCode = () => {
  const { code }: { code: string } = useParams()
  const router = useRouter()
  const { socket, isConnected, connect } = useSocket()
  const { gameId, join, login, setStatus } = usePlayerStore()
  const [username, setUsername] = useState("")
  const [roomJoined, setRoomJoined] = useState(false)
  const hasJoinedRef = useRef(false)

  // Connect socket on mount
  useEffect(() => {
    if (socket && !isConnected) {
      connect()
    }
  }, [socket, connect, isConnected])

  // Auto-join room when socket is connected
  useEffect(() => {
    if (isConnected && socket && code && !hasJoinedRef.current) {
      hasJoinedRef.current = true
      socket.emit("player:join", code)
    }
  }, [isConnected, socket, code])

  const handleSuccessRoom = useCallback(
    (receivedGameId: string) => {
      join(receivedGameId)
      setRoomJoined(true)
    },
    [join]
  )

  const handleErrorMessage = useCallback(
    (message: string) => {
      toast.error(message)
      router.replace("/")
    },
    [router]
  )

  const handleSuccessJoin = useCallback(
    (receivedGameId: string) => {
      setStatus(STATUS.WAIT, { text: "Waiting for the players" })
      login(username)
      router.replace(`/game/${receivedGameId}`)
    },
    [setStatus, login, username, router]
  )

  useEvent("game:successRoom", handleSuccessRoom)
  useEvent("game:errorMessage", handleErrorMessage)
  useEvent("game:successJoin", handleSuccessJoin)

  const handleLogin = () => {
    if (!gameId || !username.trim()) {
      return
    }
    socket?.emit("player:login", { gameId, data: { username: username.trim() } })
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      handleLogin()
    }
  }

  // Show loading while joining
  if (!roomJoined || !gameId) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2473B9] border-t-transparent"></div>
        <p className="text-lg font-semibold text-[#082F4F]">Joining game...</p>
      </div>
    )
  }

  return (
    <Form>
      <p className="mb-2 text-center text-lg font-semibold text-[#082F4F]">
        Enter your name to join
      </p>
      <Input
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Your name"
        autoFocus
      />
      <Button onClick={handleLogin}>Join Game</Button>
    </Form>
  )
}

export default JoinWithCode
