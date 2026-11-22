import { analyzeVariables, children, isMagnusVariable, mainOperator, parseFormula, printFormula } from "../formula.ts"
import type { Syntax } from "./types.ts"

type Definition = Pick<Syntax, "task" | "options" | "formula" | "target" | "notation"> & { expected: number[] }
const definitions: Definition[] = [
  { task: "formula", options: ["∃xFa", "FaGb", "∃x(Fx ∧ Gx → Hx)", "∃xy(Fx ∧ Gy)", "∃x¬¬∀y(Fx ∧ Gy)"], expected: [0, 4] },
  { task: "sentence", options: ["∀x(Fx → Gy)", "∃xLxa", "Fa", "∃x∃y(x = y)", "∀yLxy"], expected: [1, 2, 3] },
  { task: "free", formula: "∀x(Fx → Gy)", options: ["x", "y", "z", "None"], expected: [1] },
  { task: "scope", formula: "∀x(Fx → Gy)", target: [], options: ["Fx", "Gy", "Fx → Gy", "∀x(Fx → Gy)"], expected: [2] },
  { task: "main", formula: "¬∀x(Fx ∨ Gx)", options: ["¬", "∀x", "∨", "None"], expected: [0] },
  { task: "bound", formula: "(∃xLxy) ∧ (∀zLzx)", options: ["x", "y", "z", "None"], expected: [0, 2] },
  { task: "scope", formula: "∀x(∃yLxy → Fx)", target: [0, 0], options: ["Lxy", "Fx", "∃yLxy", "(∃yLxy) → Fx"], expected: [0] },
  { task: "free", formula: "Fx ∧ ∃xLxa", options: ["x", "y", "a", "None"], expected: [0] },
  { task: "sentence", options: ["∀x(Fx ∧ ∃yLyx)", "Fa ∨ Gz", "∀xFx → ∃zLxz", "∃y(y = a)", "∀x∀yLxy"], expected: [0, 3, 4] },
  { task: "scope", formula: "∀x(¬(Fx ∧ Gx) ↔ Hx)", target: [0, 0], options: ["Fx", "Gx", "Fx ∧ Gx", "Hx", "¬(Fx ∧ Gx)"], expected: [2] },
]

const courseQuestions: Definition[] = [
  { task: "formula", options: ["Rab", "∃x", "a = y", "Q", "Fa ∧ ¬Gb"], expected: [0, 2, 4] },
  { task: "formula", options: ["(∀zTaz)", "(Hab ∨ Hba)", "∃x∃yLxy", "¬", "x = a = b"], expected: [1, 2] },
  { task: "formula", options: ["∀aFa", "¬¬Rabc", "∀x(Fx → )", "Rxy = a", "∃y (Hy ∧ y ≠ a)"], expected: [1, 4] },
  { task: "formula", options: ["(Ra)", "∃x[Fx → ∀yGxy]", "∀yzRyz", "FxaGya", "∃z z = z"], expected: [1, 4] },
  { task: "formula", options: ["F(a)", "∃xFx ∨ ∀yGy", "a ∨ b", "Wx", "∃x(Fx ∨ Gx → Hx)"], expected: [1, 3] },
  { task: "sentence", options: ["Ryaa", "∀yRyaa", "a ≠ b", "∃x(Fx ∧ Gz)", "¬∀zHz"], expected: [1, 2, 4] },
  { task: "sentence", options: ["∀xRxx → Fa", "∃xLxy ∧ ∀yFy", "∀z∃xSzxz", "∃x∃xUx", "∀zFa ∧ Gz"], expected: [0, 2, 3] },
  { task: "sentence", options: ["∃x(∀yRxy → Gx)", "∀x(Fa ∧ Gz)", "∀z(Fa ∧ Gz)", "∃y y ≠ x", "¬∃y y = b"], expected: [0, 2, 4] },
  { task: "sentence", options: ["∃x¬∃y(Rxy ∧ y = b)", "∀xFz", "∀x∃yTxyz", "∀z∀x∃yTxyz", "¬a = a"], expected: [0, 3, 4] },
  { task: "open", options: ["∃yRyxa", "∀x∃yRyxa", "Fx → ∀xGx", "∃z¬Rzaz", "a = y"], expected: [0, 2, 4] },
  { task: "open", options: ["∃x(Fx ∧ ∃yRyx)", "∀z(Fz ↔ Gx)", "Fx ∧ ∀xGx", "¬∃z(Fz ∨ Gz)", "∀y∀xRxy"], expected: [1, 2] },
  { task: "open", options: ["∀x(Rxy ∨ ∀yLyx)", "∀zRzz", "Raa ↔ ∃yQy", "∀y(Fy ∧ ∃yHzy)", "¬∃x∃y x ≠ y"], expected: [0, 3] },
  { task: "open", options: ["∃xRxz → ∃zFz", "∀z∃x(Rxz → Fz)", "∀x(Fx ↔ ∃xGx)", "∃z(z = y ∨ ∃yFy)", "Fa"], expected: [0, 3] },
  { task: "bound", formula: "∀x(∃xFxy ∧ ∃zRzx)", options: ["x", "y", "z", "None"], expected: [0, 2] },
  { task: "scope", formula: "∀x(∃y(Rxy ∧ Gy) → Fx)", target: [0, 0], options: ["Rxy", "Rxy ∧ Gy", "∃y(Rxy ∧ Gy)", "∃y(Rxy ∧ Gy) → Fx"], expected: [1] },
  { task: "scope", formula: "∃x(∀zQzx ↔ ¬∃ySyx)", target: [0, 0], options: ["Qzx", "∀zQzx", "∃ySyx", "∀zQzx ↔ ¬∃ySyx"], expected: [0] },
  { task: "scope", formula: "¬∃x∀y(∃zTxyz → Fy)", target: [0, 0], options: ["Txyz", "∃zTxyz", "∀y(∃zTxyz → Fy)", "∃zTxyz → Fy"], expected: [3] },
  { task: "scope", formula: "∀z(¬(∃xFx ↔ Gz) ∧ Hz)", target: [0, 0], options: ["Fx", "∃xFx ↔ Gz", "Gz ∧ Hz", "¬(∃xFx ↔ Gz)"], expected: [1] },
  { task: "scope", formula: "∀x(∃y(∀zRxyz ∧ y = a) ∨ Fx)", target: [0, 0, 0, 0], options: ["∀zRxyz", "Rxyz", "∀zRxyz ∧ y = a", "y = a"], expected: [1] },
  { task: "main", formula: "∃x(∀yRxy → Fx) ↔ ¬∃xGx", options: ["∃x", "¬", "→", "↔"], expected: [3] },
]

export function syntaxSelection({ task, options, formula, target, notation }: Omit<Definition, "expected">) {
  if (task === "formula" || task === "sentence" || task === "open") return options.flatMap((option, index) => {
    try {
      const ast = parseFormula(option, notation)
      const sentence = analyzeVariables(ast, notation ? isMagnusVariable : undefined).sentence
      return task === "formula" || (task === "sentence" ? sentence : !sentence) ? [index] : []
    } catch { return [] }
  })
  const ast = parseFormula(formula!, notation)
  const variables = analyzeVariables(ast, notation ? isMagnusVariable : undefined)
  const operator = target?.reduce((node, index) => children(node)[index], ast) ?? ast
  const key = task === "scope" ? printFormula(children(operator)[0]) : mainOperator(ast)
  return options.flatMap((option, index) => {
    if (task === "free" || task === "bound") return (variables[task].length ? variables[task].includes(option) : option === "None") ? [index] : []
    return option === key ? [index] : []
  })
}

export const syntaxQuestions: Syntax[] = [...definitions, ...courseQuestions.map(item => ({ ...item, notation: "courseFOL" as const }))].map(({ expected, ...definition }, index) => {
  const { task, formula, target, notation } = definition
  const correct = syntaxSelection(definition)
  if (correct.join() !== expected.join()) throw new Error(`Syntax question ${index + 1} disagrees with its answer key.`)
  const ast = formula ? parseFormula(formula, notation) : undefined
  const operator = target?.reduce((node, branch) => children(node)[branch], ast!) ?? ast
  const prompts = {
    formula: "Which of the following strings of symbols are formulas of FOL?",
    sentence: "Which of the following formulas are sentences of FOL?",
    open: "Select every formula with at least one free variable occurrence.",
    free: "Which variables occur free in this formula?",
    bound: "Which variables have a bound occurrence in this formula?",
    main: "What is the main logical operator of this formula?",
    scope: `What is the scope of ${operator ? mainOperator(operator) : "the indicated operator"} in this formula?`,
  }
  const hints = {
    formula: "Check that each quantifier has one variable and a scope, and that binary connectives are grouped.",
    sentence: "A sentence has no free variable occurrences.",
    open: "Look for at least one variable occurrence outside any matching binder.",
    free: "Look for variables outside the scope of their own quantifier.",
    bound: "Look for variable occurrences inside the scope of a quantifier for that variable.",
    main: "Look for the operator at the outermost level.",
    scope: "Find the entire immediate subformula governed by the named operator.",
  }
  const explanations = {
    formula: "A formula must have a complete construction from predicate or identity formulas, using properly grouped connectives and quantifiers with one variable and a scope.",
    sentence: "In each selected formula every variable occurrence falls within a quantifier that binds it.",
    open: "Each selected formula has an occurrence outside the scope of a quantifier for that variable.",
    free: "A variable can have a free occurrence even when another occurrence of the same variable is bound elsewhere.",
    bound: "A quantifier binds occurrences of its variable inside its scope.",
    main: "The main operator is the one whose syntax tree contains the full formula.",
    scope: "The scope is the immediate child of the indicated unary operator in the syntax tree.",
  }
  return {
    ...definition, id: `syn-${index + 1}`, category: "syntax", difficulty: index < 10 ? index >= 7 ? "Advanced" : index >= 3 ? "Intermediate" : "Introductory" : index < 16 ? "Introductory" : index < 24 ? "Intermediate" : "Advanced",
    prompt: prompts[task], hint: hints[task], correct, explanation: explanations[task], concepts: [notation ? "PS7 · " + task : task === "main" ? "Main operator" : task === "scope" ? "Operator scope" : "Well-formedness and binding"],
  }
})
