import { analyzeVariables, children, mainOperator, parseFormula, printFormula } from "../formula.ts"
import type { Syntax } from "./types.ts"

type Definition = Pick<Syntax, "task" | "options" | "formula" | "target"> & { expected: number[] }
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

export function syntaxSelection({ task, options, formula, target }: Omit<Definition, "expected">) {
  if (task === "formula" || task === "sentence") return options.flatMap((option, index) => {
    try {
      const ast = parseFormula(option)
      return task === "formula" || analyzeVariables(ast).sentence ? [index] : []
    } catch { return [] }
  })
  const ast = parseFormula(formula!)
  const variables = analyzeVariables(ast)
  const operator = target?.reduce((node, index) => children(node)[index], ast) ?? ast
  const key = task === "scope" ? printFormula(children(operator)[0]) : mainOperator(ast)
  return options.flatMap((option, index) => {
    if (task === "free" || task === "bound") return (variables[task].length ? variables[task].includes(option) : option === "None") ? [index] : []
    return option === key ? [index] : []
  })
}

export const syntaxQuestions: Syntax[] = definitions.map(({ expected, ...definition }, index) => {
  const { task, options, formula, target } = definition
  const correct = syntaxSelection(definition)
  if (correct.join() !== expected.join()) throw new Error(`Syntax question ${index + 1} disagrees with its answer key.`)
  const ast = formula ? parseFormula(formula) : undefined
  const operator = target?.reduce((node, branch) => children(node)[branch], ast!) ?? ast
  const prompts = {
    formula: "Which of the following strings of symbols are formulas of FOL?",
    sentence: "Which of the following formulas are sentences of FOL?",
    free: "Which variables occur free in this formula?",
    bound: "Which variables have a bound occurrence in this formula?",
    main: "What is the main logical operator of this formula?",
    scope: `What is the scope of ${operator ? mainOperator(operator) : "the indicated operator"} in this formula?`,
  }
  const hints = {
    formula: "Check that each quantifier has one variable and a scope, and that binary connectives are grouped.",
    sentence: "A sentence has no free variable occurrences.",
    free: "Look for variables outside the scope of their own quantifier.",
    bound: "Look for variable occurrences inside the scope of a quantifier for that variable.",
    main: "Look for the operator at the outermost level.",
    scope: "Find the entire immediate subformula governed by the named operator.",
  }
  const explanations = {
    formula: "The other strings either join atoms without a connective, omit grouping for two binary connectives, or attach a second variable to one quantifier.",
    sentence: "In each selected formula every variable occurrence falls within a quantifier that binds it.",
    free: "A variable can have a free occurrence even when another occurrence of the same variable is bound elsewhere.",
    bound: "A quantifier binds occurrences of its variable inside its scope.",
    main: "The main operator is the one whose syntax tree contains the full formula.",
    scope: "The scope is the immediate child of the indicated unary operator in the syntax tree.",
  }
  return {
    ...definition, id: `syn-${index + 1}`, category: "syntax", difficulty: index >= 7 ? "Advanced" : index >= 3 ? "Intermediate" : "Introductory",
    prompt: prompts[task], hint: hints[task], correct, explanation: explanations[task], concepts: [task === "main" ? "Main operator" : task === "scope" ? "Operator scope" : "Well-formedness and binding"],
  }
})
