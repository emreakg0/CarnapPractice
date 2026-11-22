import { parseFormula } from "../formula.ts"
import { evaluateFormula, type Interpretation } from "../interpretation.ts"
import type { ModelQuestion } from "./types.ts"

type Definition = {
  formula: string; expected: boolean; constants?: Record<string, string>; unary?: Record<string, string[]>
  binary?: Record<string, string[][]>; explanation: string; concepts: string[]
}

const definitions: Definition[] = [
  { formula: "Ax(Fx -> Gx)", unary: { F: ["a", "c"], G: ["c"] }, expected: false, explanation: "a satisfies F but does not satisfy G.", concepts: ["Counterexample", "Universal conditional"] },
  { formula: "Ex(Fx & Gx)", unary: { F: ["a", "c"], G: ["c"] }, expected: true, explanation: "c belongs to both extensions.", concepts: ["Existential witness"] },
  { formula: "Fa -> Ga", constants: { a: "b" }, unary: { F: ["a"], G: [] }, expected: true, explanation: "The constant a refers to b, which is outside F, so the conditional is vacuously true.", concepts: ["Constants", "Vacuous truth"] },
  { formula: "a = b", constants: { a: "c", b: "c" }, expected: true, explanation: "Both constants refer to c.", concepts: ["Identity", "Co-reference"] },
  { formula: "AxEyRxy", binary: { R: [["a", "b"], ["b", "c"], ["c", "a"]] }, expected: true, explanation: "Every object starts an ordered pair in R.", concepts: ["Relations", "Nested quantifiers"] },
  { formula: "ExAyRxy", binary: { R: [["a", "b"], ["b", "c"], ["c", "a"]] }, expected: false, explanation: "Each object is related to just one object. No object is related to all three.", concepts: ["Quantifier order", "Relations"] },
  { formula: "~ExFx", unary: { F: [] }, expected: true, explanation: "The extension is empty, so the existential is false and its negation is true.", concepts: ["Empty extension", "Negation"] },
  { formula: "Ax(Fx <-> Gx)", unary: { F: ["b"], G: ["a", "b"] }, expected: false, explanation: "a is in G and outside F, so the two sides disagree.", concepts: ["Biconditional", "Counterexample"] },
  { formula: "AxAy(Rxy -> Ryx)", binary: { R: [["a", "b"], ["b", "a"], ["c", "c"], ["b", "c"]] }, expected: false, explanation: "(b,c) is in R but (c,b) is absent.", concepts: ["Symmetry", "Ordered pairs"] },
  { formula: "Ex(Fx & Ay(Fy -> y = x))", unary: { F: ["c"] }, expected: true, explanation: "c is in F, and every object in F is identical to c.", concepts: ["Uniqueness", "Identity"] },
]

export const interpretationQuestions: ModelQuestion[] = definitions.map((definition, index) => {
  const { formula, expected, constants = {}, unary = {}, binary = {}, explanation, concepts } = definition
  const model: Interpretation = {
    domain: ["a", "b", "c"], constants,
    predicates: Object.fromEntries([
      ...Object.entries(unary).map(([symbol, members]) => [symbol, { arity: 1, tuples: members.map(member => [member]) }]),
      ...Object.entries(binary).map(([symbol, tuples]) => [symbol, { arity: 2, tuples }]),
    ]),
  }
  if (evaluateFormula(parseFormula(formula), model).value !== expected) throw new Error(`Interpretation question ${index + 1} disagrees with its answer key.`)
  return {
    id: `int-${index + 1}`, category: "interpretations", difficulty: index >= 8 ? "Advanced" : index >= 3 ? "Intermediate" : "Introductory",
    prompt: "Is the formula true or false in the given interpretation?", formula, model, expected,
    explanation, concepts, hint: "For each quantifier, work through the domain in order. Read relation tuples from left to right.",
  }
})
