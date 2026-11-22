import { derivations } from "./derivations.ts"
import { interpretationQuestions } from "./models.ts"
import { symbolizations } from "./symbolization.ts"
import { syntaxQuestions } from "./syntax.ts"
import { categories, type Category, type Problem } from "./types.ts"

export const bank: readonly Problem[] = [...derivations, ...symbolizations, ...syntaxQuestions, ...interpretationQuestions]
export const categoryIds = Object.keys(categories) as Category[]
export const byId = Object.fromEntries(bank.map(item => [item.id, item])) as Record<string, Problem | undefined>

export function practiceOrder(category: Category, recent: readonly string[], random = Math.random): string[] {
  const candidates = bank.filter(item => item.category === category)
  const shuffled = candidates.map(({ id }) => ({ id, key: random() })).sort((a, b) => a.key - b.key)
  return shuffled.map(({ id }) => id).sort((a, b) => {
    return Number(recent.includes(a)) - Number(recent.includes(b)) || recent.indexOf(b) - recent.indexOf(a)
  })
}

export function progressThrough(category: Category, recent: readonly string[], random = Math.random): string[] {
  const levels = ["Introductory", "Intermediate", "Advanced"]
  return practiceOrder(category, recent, random).sort((left, right) =>
    levels.indexOf(byId[left]!.difficulty) - levels.indexOf(byId[right]!.difficulty))
}

export function examOrder(recent: readonly string[], random = Math.random): string[] {
  const queues = categoryIds.map(category => practiceOrder(category, recent, random))
  return [0, 1].flatMap(index => queues.map(queue => queue[index]))
}
