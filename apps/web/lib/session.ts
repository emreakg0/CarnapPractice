import { isDerivation } from "./problems/types.ts"
import { byId } from "./problems/bank.ts"
import type { Answer } from "./problems/types.ts"

export type Attempt = { attempts: number; solved: boolean }
export type Progress = { items: Record<string, Attempt>; recent: string[] }
export const emptyProgress: Progress = { items: {}, recent: [] }
export const examMinutes = 30

export type Exam = {
  ids: string[]; position: number; endsAt: number; answers: Record<string, Answer>
  submitted: string[]; finishedAt?: number
}

export function recordAttempt(progress: Progress, id: string, correct: boolean): Progress {
  const old = progress.items[id]
  return {
    items: { ...progress.items, [id]: { attempts: (old?.attempts ?? 0) + 1, solved: correct || !!old?.solved } },
    recent: correct ? [id, ...progress.recent.filter(item => item !== id)].slice(0, 20) : progress.recent,
  }
}

export function hasAnswer(id: string, answer: Answer | undefined): boolean {
  if (answer === undefined) return false
  if (typeof answer !== "string") return true
  if (!isDerivation(byId[id])) return !!answer.trim()
  return answer.split("\n").some(row => {
    const contents = row.trim()
    return contents && contents !== "--" && !/:\s*PR\s*$/.test(contents)
  })
}
