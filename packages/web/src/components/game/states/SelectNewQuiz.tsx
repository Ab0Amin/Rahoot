"use client"

import { ManagerStatusDataMap } from "@rahoot/common/types/game/status"
import Button from "@rahoot/web/components/Button"
import { useSocket } from "@rahoot/web/contexts/socketProvider"
import { useManagerStore } from "@rahoot/web/stores/manager"

type Props = {
  data: ManagerStatusDataMap["SELECT_NEW_QUIZ"]
}

const SelectNewQuiz = ({ data: { quizzes } }: Props) => {
  const { socket } = useSocket()
  const { gameId } = useManagerStore()

  const handleSelectQuiz = (quizzId: string) => {
    if (!gameId) return
    socket?.emit("manager:selectNewQuiz", { gameId, quizzId })
  }

  return (
    <section className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 p-4">
      <h2 className="anim-show text-center text-3xl font-bold text-[#082F4F] md:text-4xl">
        Select New Quiz
      </h2>
      <p className="text-center text-lg text-[#082F4F]/70">
        Players will stay in the game with their scores reset
      </p>
      <div className="flex w-full flex-col gap-3">
        {quizzes.map((quiz) => (
          <Button
            key={quiz.id}
            className="w-full py-4 text-xl"
            onClick={() => handleSelectQuiz(quiz.id)}
          >
            {quiz.subject}
          </Button>
        ))}
      </div>
    </section>
  )
}

export default SelectNewQuiz
