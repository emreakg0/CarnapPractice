import { analyzeVariables, formulaKey, parseFormula, printFormula } from "./formula.ts"
import { evaluateFormula } from "./interpretation.ts"
import { validateProof } from "./proof.ts"
import type { Answer, Problem } from "./problems/types.ts"

export type Grade = { correct: boolean; message: string; detail?: string; line?: number }
export interface ValidationEngine {
  grade(problem: Problem, answer: Answer | undefined): Grade | Promise<Grade>
}

export function gradeLocally(problem: Problem, answer: Answer | undefined): Grade {
  if (answer === undefined || answer === "") return { correct: false, message: "No answer submitted." }
  switch (problem.category) {
    case "derivations": {
      if (typeof answer !== "string") return { correct: false, message: "Enter a proof." }
      const issue = validateProof(answer, problem.premises, problem.conclusion, problem.system)
      return issue ? { correct: false, message: "The proof is incomplete or incorrect.", detail: issue.message, line: issue.line } : { correct: true, message: "Correct!" }
    }
    case "symbolization": {
      if (typeof answer !== "string") return { correct: false, message: "Enter a formula." }
      let formula
      try { formula = parseFormula(answer) } catch (error) {
        return { correct: false, message: "That formula isn’t grammatical.", detail: error instanceof Error ? error.message : undefined }
      }
      const free = analyzeVariables(formula).free
      if (free.length) return { correct: false, message: "The formula has free variables.", detail: `Bind ${free.join(", ")} to make a sentence.` }
      const correct = problem.answers.some(template => formulaKey(parseFormula(template), true) === formulaKey(formula, true))
      return { correct, message: correct ? "Correct!" : "Not quite. Try again?", detail: `Read as ${printFormula(formula)}.` }
    }
    case "syntax": {
      const correct = Array.isArray(answer) && answer.length === problem.correct.length && problem.correct.every(index => answer.includes(index))
      return { correct, message: correct ? "Correct!" : "Incorrect selection." }
    }
    case "interpretations": {
      const result = evaluateFormula(parseFormula(problem.formula), problem.model)
      const correct = answer === result.value
      return { correct, message: correct ? "Correct!" : "Incorrect truth value.", detail: result.evidence }
    }
  }
}

export const validationEngine: ValidationEngine = { grade: gradeLocally }
