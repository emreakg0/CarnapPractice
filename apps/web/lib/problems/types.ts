import type { ProofSystem } from "../proof.ts"
import type { Interpretation } from "../interpretation.ts"

export const categories = {
  derivations: { title: "TFL Derivations", description: "Build Fitch proofs with introduction, elimination, and derived rules.", mark: "⊢" },
  subproofs: { title: "TFL Derivations with Subproofs", description: "Practice Fitch assumptions, nested scopes, and closing subproofs.", mark: "│" },
  symbolization: { title: "FOL Symbolization", description: "Translate English sentences into first-order logic.", mark: "∀" },
  syntax: { title: "FOL Syntax and Scope", description: "Identify formulas, sentences, variables, and operator scopes.", mark: "¬" },
  interpretations: { title: "FOL Interpretations", description: "Evaluate quantified sentences in finite models.", mark: "∈" },
} as const
export type Category = keyof typeof categories
type Metadata = { id: string; difficulty: "Introductory" | "Intermediate" | "Advanced"; prompt: string; explanation: string; hint: string; concepts: string[] }
export type Derivation = Metadata & { category: "derivations" | "subproofs"; system: ProofSystem; premises: string[]; conclusion: string; solution: string }
export type Symbolization = Metadata & { category: "symbolization"; system?: "magnusQL"; key: Record<string, string>; answers: string[] }
export type Syntax = Metadata & {
  category: "syntax"; notation?: "courseFOL"; formula?: string; task: "formula" | "sentence" | "open" | "free" | "bound" | "main" | "scope"
  options: string[]; correct: number[]; target?: number[]
}
export type ModelQuestion = Metadata & { category: "interpretations"; model: Interpretation } & (
  | { formula: string; expected: boolean; options?: never }
  | { formula?: never; expected?: never; options: string[]; correct: number[]; select: boolean; reasons: string[] }
)
export type Problem = Derivation | Symbolization | Syntax | ModelQuestion
export function isDerivation(problem: Problem | undefined): problem is Derivation {
  return problem?.category === "derivations" || problem?.category === "subproofs"
}

export type Answer = string | number[] | boolean
