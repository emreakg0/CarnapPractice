import assert from "node:assert/strict"
import { test } from "node:test"
import { formulaKey, type Formula } from "../lib/formula.ts"
import { parseProofFormula, proofRows, rulesFor, rutgersProofSystem, validateProof } from "../lib/proof.ts"
import { gradeLocally } from "../lib/grading.ts"
import { progressThrough } from "../lib/problems/bank.ts"
import { derivations } from "../lib/problems/derivations.ts"
import { subproofDerivations } from "../lib/problems/subproofs.ts"
import zachFixtures from "./zachtfl-fixtures.json" with { type: "json" }

const indirect = new Set(["→I", "¬I", "IP", "∨E", "↔I", "LEM"])
const coveredRules = new Set([...indirect, "PR", "AS", "R", "∧I", "∧E", "∨I", "→E", "↔E", "¬E", "X", "DS", "MT", "DNE", "DeM"])

test("15 original Rutgers subproof exercises are ordered by difficulty and discharge every assumption", () => {
  assert.equal(subproofDerivations.length, 15)
  assert.equal(new Set(subproofDerivations.map(problem => problem.id)).size, 15)
  assert.deepEqual(progressThrough("subproofs", ["subproof-1"], () => 0.99), subproofDerivations.map(problem => problem.id))

  function argument(premises: string[], conclusion: string) {
    const key = (source: string) => formulaKey(parseProofFormula(source, rutgersProofSystem))
    return JSON.stringify([premises.map(key).sort(), key(conclusion)])
  }
  const seen = new Set(derivations.map(problem => argument(problem.premises, problem.conclusion)))
  const used = new Set<string>()
  subproofDerivations.forEach((problem, index) => {
    assert.equal(problem.system, rutgersProofSystem, problem.id)
    assert.equal(problem.category, "subproofs", problem.id)
    assert.equal(problem.difficulty, ["Introductory", "Intermediate", "Advanced"][Math.floor(index / 5)], problem.id)
    assert.ok(problem.hint && problem.explanation && problem.concepts.length, problem.id)
    const signature = argument(problem.premises, problem.conclusion)
    assert.ok(!seen.has(signature), problem.id)
    seen.add(signature)
    const original = zachFixtures.find(fixture => fixture.id === `${problem.id} worked solution`)
    assert.ok(original?.carnapSequent, problem.id)
    assert.equal(original.proof, problem.solution, problem.id)
    assert.equal(argument(original.premises, original.target), signature, problem.id)
    assert.equal(gradeLocally(problem, problem.solution).correct, true, problem.id)

    const rows = proofRows(problem.solution, problem.system)
    const assumptions = rows.flatMap((row, i) => row.rule === "AS" ? [i + 1] : [])
    assert.ok(assumptions.length > 0, problem.id)
    const starts = rows.flatMap(row => {
      used.add(row.rule)
      return indirect.has(row.rule) ? [...row.refs.matchAll(/(\d+)-(\d+)/g)].map(match => Number(match[1])) : []
    })
    assert.deepEqual([...new Set(starts)].sort((a, b) => a - b), assumptions, problem.id)

    const firstDischarge = rows.findIndex(row => indirect.has(row.rule))
    const withoutRanges = rows.map((row, i) => i === firstDischarge ? row.raw.replace(/(\d+)-\d+/g, "$1") : row.raw).join("\n")
    assert.equal(validateProof(withoutRanges, problem.premises, problem.conclusion, problem.system)?.line, firstDischarge + 1, problem.id)
  })
  for (const rule of [...indirect, "R"]) assert.ok(used.has(rule), rule)
})

type Truth = -1 | 0 | 1
type Valuation = Partial<Record<string, Truth>>
const values: Truth[] = [-1, 0, 1]
const negate = (value: Truth) => -value as Truth
const conjunction = (a: Truth, b: Truth) => Math.min(a, b) as Truth
const disjunction = (a: Truth, b: Truth) => Math.max(a, b) as Truth
const conditional = (a: Truth, b: Truth) => disjunction(negate(a), b)
const biconditional = (a: Truth, b: Truth) => conjunction(conditional(a, b), conditional(b, a))

function evaluate(formula: Formula, assignment: Valuation): Truth {
  switch (formula.kind) {
    case "atom": return assignment[formula.name] ?? 0
    case "bottom": return -1
    case "top": return 1
    case "not": return negate(evaluate(formula.body, assignment))
    case "binary": {
      const left = evaluate(formula.left, assignment)
      const right = evaluate(formula.right, assignment)
      switch (formula.op) {
        case "∧": return conjunction(left, right)
        case "∨": return disjunction(left, right)
        case "→": return conditional(left, right)
        case "↔": return biconditional(left, right)
      }
    }
    default: assert.fail("Expected a TFL formula")
  }
}

test("every direct rule preserves definite truth, including DeM inside a formula", () => {
  assert.deepEqual(Object.keys(rulesFor(rutgersProofSystem)).sort(), [...coveredRules].sort())
  const preserves = (premises: Truth[], conclusion: Truth, rule: string) => {
    if (premises.every(value => value === 1)) assert.equal(conclusion, 1, rule)
  }

  for (const a of values) for (const b of values) {
    preserves([a], a, "R")
    preserves([a, b], conjunction(a, b), "∧I")
    preserves([conjunction(a, b)], a, "∧E")
    preserves([conjunction(a, b)], b, "∧E")
    preserves([a], disjunction(a, b), "∨I")
    preserves([b], disjunction(a, b), "∨I")
    preserves([conditional(a, b), a], b, "→E")
    preserves([biconditional(a, b), a], b, "↔E")
    preserves([biconditional(a, b), b], a, "↔E")
    preserves([a, negate(a)], -1, "¬E")
    preserves([-1], a, "X")
    preserves([disjunction(a, b), negate(a)], b, "DS")
    preserves([disjunction(a, b), negate(b)], a, "DS")
    preserves([conditional(a, b), negate(b)], negate(a), "MT")
    preserves([negate(negate(a))], a, "DNE")
    // Equal values remain equal inside any truth-functional context.
    assert.equal(negate(conjunction(a, b)), disjunction(negate(a), negate(b)), "DeM")
    assert.equal(negate(disjunction(a, b)), conjunction(negate(a), negate(b)), "DeM")
  }
})

test("every subproof exercise has a certificate excluding all direct-only derivations", () => {
  // Definite truth is preserved on every direct line, by induction on the proof.
  // A valuation with true given premises and an unknown goal rules out any direct-only proof,
  // even one that introduces new atoms or arbitrarily complex intermediate formulas.
  const certificates: Valuation[] = [
    { P: 1 }, { P: 1, R: 1 }, { P: 1, Q: 1 }, {}, { R: 1 },
    { P: 1, Q: 1, R: 1, S: 1 }, { Q: -1 }, {}, { P: 1 }, {},
    { Q: 1 }, {}, { Q: 1 }, {}, {},
  ]
  assert.equal(certificates.length, subproofDerivations.length)
  for (const [index, problem] of subproofDerivations.entries()) {
    const valuation = certificates[index]
    for (const premise of problem.premises) {
      assert.equal(evaluate(parseProofFormula(premise, problem.system), valuation), 1, `${problem.id}: ${premise}`)
    }
    assert.equal(evaluate(parseProofFormula(problem.conclusion, problem.system), valuation), 0, problem.id)
  }
})
