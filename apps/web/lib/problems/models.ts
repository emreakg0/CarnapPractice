import { isMagnusVariable, parseFormula } from "../formula.ts"
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

function fixedModel(domain: string[], constants: Record<string, string>, extensions: Record<string, [number, string[][]]>): Interpretation {
  return {
    domain, constants,
    predicates: Object.fromEntries(Object.entries(extensions).map(([name, [arity, tuples]]) => [name, { arity, tuples }])),
  }
}

const museum = fixedModel(["Onyx", "Jade", "Pearl", "Amber"], { a: "Onyx", b: "Jade", c: "Onyx", d: "Pearl" }, {
  F: [1, [["Jade"], ["Pearl"]]], G: [1, []], R: [2, [["Onyx", "Jade"], ["Jade", "Pearl"], ["Amber", "Amber"]]],
  T: [3, [["Jade", "Onyx", "Pearl"], ["Pearl", "Pearl", "Jade"]]],
})
const harbor = fixedModel(["Cove", "Pier", "Beacon"], { a: "Cove", b: "Pier", c: "Beacon", d: "Pier" }, {
  H: [1, [["Pier"], ["Beacon"]]], S: [2, [["Cove", "Beacon"], ["Pier", "Beacon"], ["Beacon", "Beacon"], ["Pier", "Cove"]]],
  U: [3, [["Cove", "Pier", "Beacon"], ["Pier", "Pier", "Cove"]]],
})
const lab = fixedModel(["Iris", "Aster"], { a: "Iris", b: "Aster", c: "Aster" }, {
  F: [1, [["Iris"]]], G: [1, [["Iris"], ["Aster"]]], H: [1, []],
  L: [2, [["Iris", "Aster"], ["Aster", "Aster"]]],
})
const trail = fixedModel(["Hill", "Lake", "Pine", "Creek"], { a: "Lake", b: "Hill", c: "Pine", d: "Lake" }, {
  B: [1, [["Hill"], ["Pine"]]], C: [1, [["Lake"], ["Creek"]]], D: [1, []],
  R: [2, [["Lake", "Hill"], ["Hill", "Lake"], ["Pine", "Pine"], ["Creek", "Lake"]]],
})
const printShop = fixedModel(["Red", "Blue", "Gold", "Silver", "Black"], { a: "Red", b: "Blue", c: "Gold", d: "Black" }, {
  F: [1, [["Red"], ["Gold"]]], G: [1, [["Blue"], ["Gold"], ["Silver"]]], H: [1, []],
  S: [2, [["Red", "Blue"], ["Blue", "Blue"], ["Gold", "Blue"], ["Silver", "Blue"], ["Black", "Red"]]],
})

type Statement = [formula: string, truth: boolean, reason: string]
type Selection = [model: Interpretation, select: boolean, difficulty: ModelQuestion["difficulty"], topic: string, statements: Statement[]]
const selections: Selection[] = [
  [museum, true, "Introductory", "Unary membership and identity", [
    ["Fb", true, "Jade is in F."], ["Fa", false, "Onyx is outside F."], ["a=c", true, "Both names refer to Onyx."], ["Gd", false, "G is empty."],
  ]],
  [museum, false, "Introductory", "Ordered pairs and empty extensions", [
    ["Rab", true, "(Onyx, Jade) is in R."], ["Rba", false, "(Jade, Onyx) is absent."], ["¬Ga", true, "G is empty."], ["Rbd", true, "(Jade, Pearl) is in R."],
  ]],
  [museum, true, "Introductory", "Ordered triples and repeated names", [
    ["Tbad", true, "(Jade, Onyx, Pearl) is listed."], ["Tabd", false, "Reversing the first two arguments changes the tuple."], ["Tbcd", true, "c has the same referent as a."], ["Tdbb", false, "(Pearl, Jade, Jade) is absent."],
  ]],
  [museum, false, "Introductory", "Compound statements without quantifiers", [
    ["Fc ∨ Fd", true, "Pearl is in F."], ["Ga ∧ Fb", false, "Ga is false."], ["Rba → Ga", true, "The antecedent is false."], ["a ≠ c", false, "a and c co-refer."],
  ]],
  [harbor, true, "Introductory", "Co-reference in ordered triples", [
    ["Uadc", true, "d and b both denote Pier."], ["Ubbc", false, "(Pier, Pier, Beacon) is absent."], ["Udda", true, "The tuple (Pier, Pier, Cove) is present."], ["a=d", false, "Cove and Pier differ."],
  ]],
  [harbor, false, "Introductory", "Relation direction and self-pairs", [
    ["Sab", false, "Cove points to Beacon alone."], ["Sba", true, "(Pier, Cove) is listed."], ["Scc", true, "(Beacon, Beacon) is listed."], ["Sbb", false, "Pier has no self-pair."],
  ]],
  [harbor, false, "Intermediate", "Biconditionals and ordered tuples", [
    ["Sbc ↔ Hc", true, "Both sides are true."], ["Sab ↔ Hb", false, "The sides differ."], ["¬Uaba", true, "That tuple is absent."], ["Ubba ∧ a ≠ d", true, "The triple is present and the names differ."],
  ]],
  [lab, true, "Introductory", "Negated atomic statements", [
    ["¬Fb", true, "Aster is outside F."], ["Lba", false, "(Aster, Iris) is absent."], ["b=c", true, "Both constants name Aster."], ["Ha", false, "H has no members."],
  ]],
  [lab, true, "Intermediate", "Universal and existential sentences", [
    ["∀xGx", true, "Both objects are in G."], ["∃xHx", false, "H is empty."], ["∃x(Fx ∧ Gx)", true, "Iris belongs to both."], ["∀xFx", false, "Aster is outside F."],
  ]],
  [lab, false, "Intermediate", "Restricted quantifiers and empty predicates", [
    ["∀x(Hx → Fx)", true, "No object satisfies the antecedent."], ["∃x(Fx ∧ Hx)", false, "The intersection is empty."], ["∃x(Gx ∧ ¬Fx)", true, "Aster is a witness."], ["∀x(Fx ↔ Gx)", false, "Aster satisfies G alone."],
  ]],
  [lab, true, "Intermediate", "Direction of a one-quantifier relation", [
    ["∀xLxb", true, "Both objects point to Aster."], ["∀xLbx", false, "Aster does not point to Iris."], ["∃x¬Lxx", true, "Iris has no self-pair."], ["∃xLxa", false, "No pair ends in Iris."],
  ]],
  [lab, false, "Intermediate", "Quantification with identity", [
    ["∃x(x=b ∧ x=c)", true, "Aster is identical to both referents."], ["∀x(x=a ∨ x=b)", true, "Iris and Aster exhaust the domain."], ["∃x(x=b ∧ Fx)", false, "Aster is outside F."], ["∃x(x ≠ a ∧ x ≠ b)", false, "The domain contains no third object."],
  ]],
  [trail, true, "Intermediate", "Universal counterexamples and witnesses", [
    ["∀x(Bx ∨ Cx)", true, "The two extensions cover the domain."], ["∀x(Bx → Cx)", false, "Hill witnesses failure."], ["∃x(Bx ∧ Rxx)", true, "Pine is a witness."], ["∃x(Bx ∧ Cx)", false, "The extensions are disjoint."],
  ]],
  [trail, false, "Intermediate", "Negating a quantified claim", [
    ["¬∀xRxx", true, "Lake lacks a self-pair."], ["¬∃xRxx", false, "Pine has a self-pair."], ["¬∃x(Dx ∨ Cx)", false, "Lake satisfies the disjunction."], ["¬∀x(Bx ↔ Cx)", true, "The two sets differ."],
  ]],
  [trail, true, "Advanced", "Conditional of separately quantified sentences", [
    ["∃xDx → ∀yBy", true, "The antecedent is false."], ["∃xCx → ∀yCy", false, "The antecedent is true and Hill falsifies the consequent."], ["∀x(Bx ∨ Cx) ↔ ¬∃yDy", true, "Both sides are true."], ["¬(∀xBx → ∃yDy)", false, "The negated conditional was already true."],
  ]],
  [trail, false, "Advanced", "Identity restrictions and self-pairs", [
    ["∀x(Rxx → x=c)", true, "Pine is the only object with a self-pair."], ["∀x(Cx → x=a)", false, "Creek is a second C."], ["∃x(x=d ∧ Rxb)", true, "Lake points to Hill."], ["∃x(x ≠ a ∧ x=d)", false, "a and d co-refer."],
  ]],
  [printShop, false, "Advanced", "Universal relation and exceptional object", [
    ["∀xSxb", false, "Black points to Red alone."], ["∀x(x ≠ d → Sxb)", true, "Every object other than Black points to Blue."], ["∀x(Sxb → Gx)", false, "Red points to Blue but is outside G."], ["∃x(Fx ∧ Sxb)", true, "Red is a witness."],
  ]],
  [printShop, true, "Advanced", "Biconditional under quantification", [
    ["∃x(Fx ↔ Gx)", true, "Gold satisfies both predicates."], ["∀x(Fx ↔ Gx)", false, "Red belongs to F alone."], ["∃x¬(Fx ∨ Gx)", true, "Black belongs to neither."], ["∀x(Hx ↔ Fx)", false, "Red belongs to F but H is empty."],
  ]],
  [printShop, false, "Advanced", "Quantifier scope across connectives", [
    ["∀x(Gx → Sxb)", true, "All three members of G point to Blue."], ["¬(∃xHx → ∀yFy)", false, "The empty antecedent makes the inner conditional true."], ["∃xFx ∧ ∃yHy", false, "The second conjunct is false."], ["∀xHx → ∃ySyb", true, "The antecedent is false."],
  ]],
  [printShop, true, "Advanced", "Identity and separated scopes", [
    ["∀x(x=b → Sxx)", true, "Blue has a self-pair."], ["∃x(x ≠ b ∧ Sxx)", false, "Blue is the only self-pair."], ["∀xSxb ∨ ∃xSxa", true, "Black points to Red, so the second disjunct holds."], ["∀x(Sxa ↔ x=b)", false, "Black points to Red, but Black is not Blue."],
  ]],
]

export function evaluateModelOption(problem: ModelQuestion & { options: string[] }, index: number) {
  return evaluateFormula(parseFormula(problem.options[index], "courseFOL"), problem.model, isMagnusVariable)
}

for (const [index, [model, select, difficulty, topic, statements]] of selections.entries()) {
  const correct = statements.flatMap(([, truth], position) => truth === select ? [position] : [])
  const question: ModelQuestion & { options: string[] } = {
    id: `int-${11 + index}`, category: "interpretations", difficulty, model, select, correct,
    options: statements.map(([formula]) => formula),
    reasons: statements.map(([, , reason]) => reason),
    prompt: `Select all sentences that are ${select ? "true" : "false"} in this interpretation.`,
    explanation: "Check each formula against its predicate extensions, identity claims, and quantifier scope.",
    concepts: ["PS8 · " + topic],
    hint: "Resolve names first. For a quantifier, check domain members in order. For a relation, preserve argument order.",
  }
  statements.forEach(([, truth], position) => {
    const label = `${question.id}, option ${position + 1} (${question.options[position]})`
    try {
      if (evaluateModelOption(question, position).value !== truth) throw new Error("Computed truth value differs from the key.")
    } catch (error) {
      throw new Error(`Invalid interpretation question ${label}`, { cause: error })
    }
  })
  interpretationQuestions.push(question)
}
