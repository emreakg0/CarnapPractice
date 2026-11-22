import { children, formulaKey, parseFormula, printFormula, type Formula } from "./formula.ts"

export const rules = {
  PR: "Given premise", AS: "First line of an indented subproof", R: "One accessible line",
  "∧I": "Two lines, one for each conjunct", "∧E": "One conjunction",
  "∨I": "One disjunct", "∨E": "Disjunction and two case ranges ending in the same result",
  "→I": "A range from antecedent to consequent", "→E": "Conditional and antecedent",
  "↔I": "Two ranges proving each side from the other", "↔E": "Biconditional and either side",
  "¬I": "A range from the unnegated assumption to ⊥", "¬E": "A formula and its negation",
  X: "A line containing ⊥", IP: "A range from the negated conclusion to ⊥",
  DS: "Disjunction and negation of one disjunct", MT: "Conditional and negation of its consequent",
  DNE: "A double negation", DeM: "A line matching a De Morgan law",
  LEM: "Two ranges assuming opposites and ending in the same result",
} as const
type Rule = keyof typeof rules
const ruleAliases = new Map([
  ["&", "∧"], ["/\\", "∧"], ["v", "∨"], ["\\/", "∨"], ["|", "∨"],
  ["->", "→"], ["=>", "→"], [">", "→"], ["<->", "↔"], ["~", "¬"], ["-", "¬"],
])

const ruleNames = [...Object.keys(rules), ...[...ruleAliases.keys()].flatMap(alias => [alias + "I", alias + "E"])]
  .sort((a, b) => b.length - a.length)

export function proofRows(source: string) {
  return source.split("\n").map(raw => {
    const indent = raw.match(/^ */)?.[0] ?? ""
    const colon = raw.indexOf(":")
    const formula = (colon === -1 ? raw : raw.slice(0, colon)).trim()
    const justification = colon === -1 ? "" : raw.slice(colon + 1)
    const name = ruleNames.find(rule => justification.startsWith(rule)) ?? ""
    const rule = name.replace(/^(.*)([IE])$/, (_, op, mode) => (ruleAliases.get(op) ?? op) + mode)
    const rest = justification.slice(name.length).trimStart()
    // Carnap parses a justification prefix. A consumed comma still requires another citation.
    const refs = rest.match(/^\d+(?:-\d+)?(?:(?:\s*,\s*|\s+)\d+(?:-\d+)?)*/)?.[0] ?? ""
    const badReferences = !!refs && rest.slice(refs.length).trimStart().startsWith(",")
    return { raw, indent, formula, rule, refs, badReferences, separator: /^ *--\s*$/.test(raw) }
  })
}

type Assertion = { formula: Formula; dependencies: Set<string> }
type Range = { assumption: Assertion; conclusion: Assertion }
export type ProofIssue =
  | { kind: "incomplete"; message: string; line?: never }
  | { kind: "syntax" | "inference"; message: string; line: number }
const equal = (left: Formula, right: Formula) => formulaKey(left) === formulaKey(right)
const binary = (node: Formula, op: string) => node.kind === "binary" && node.op === op ? node : undefined
function usesSchematicLetter(formula: Formula): boolean {
  return (formula.kind === "atom" && /^[ζφψχθγξ]/.test(formula.name)) || children(formula).some(usesSchematicLetter)
}
const negates = (negation: Formula, body: Formula) => negation.kind === "not" && equal(negation.body, body)

function matchesRule(rule: Exclude<Rule, "LEM">, result: Formula, cited: Formula[], ranges: Range[]) {
  const [a, b] = cited
  const fits = (count: number, blocks = 0) => cited.length === count && ranges.length === blocks
  const either = (test: (first: Formula, second: Formula) => boolean) => fits(2) && (test(a, b) || test(b, a))
  const cases = (test: (first: Range, second: Range) => boolean) => {
    const [first, second] = ranges
    return test(first, second) || test(second, first)
  }
  const ends = (range: Range, start: Formula, end: Formula) => equal(range.assumption.formula, start) && equal(range.conclusion.formula, end)
  const deMorgan = (first: Formula, second: Formula) => {
    if (first.kind !== "not" || first.body.kind !== "binary") return false
    const inner = first.body
    const opposite = inner.op === "∧" ? binary(second, "∨") : inner.op === "∨" ? binary(second, "∧") : undefined
    return !!opposite && negates(opposite.left, inner.left) && negates(opposite.right, inner.right)
  }
  function deMorganInContext(first: Formula, second: Formula) {
    let replacement: [Formula, Formula] | undefined
    function compare(left: Formula, right: Formula): boolean {
      if (equal(left, right)) return true
      if (replacement && equal(left, replacement[0]) && equal(right, replacement[1])) return true
      if (!replacement && (deMorgan(left, right) || deMorgan(right, left))) {
        replacement = [left, right]
        return true
      }
      const sameOperator = (left.kind === "not" && right.kind === "not") ||
        (left.kind === "binary" && right.kind === "binary" && left.op === right.op)
      return sameOperator && children(left).every((child, index) => compare(child, children(right)[index]))
    }
    return compare(first, second)
  }
  switch (rule) {
    case "PR": case "AS": return fits(0)
    case "R": return fits(1) && equal(a, result)
    case "∧I": return result.kind === "binary" && result.op === "∧" && either((left, right) => equal(left, result.left) && equal(right, result.right))
    case "∧E": return fits(1) && a.kind === "binary" && a.op === "∧" && (equal(a.left, result) || equal(a.right, result))
    case "∨I": return fits(1) && result.kind === "binary" && result.op === "∨" && (equal(a, result.left) || equal(a, result.right))
    case "∨E": return fits(1, 2) && a.kind === "binary" && a.op === "∨" && cases((one, two) => ends(one, a.left, result) && ends(two, a.right, result))
    case "→I": return fits(0, 1) && result.kind === "binary" && result.op === "→" && ends(ranges[0], result.left, result.right)
    case "→E": return either((conditional, antecedent) => {
      const node = binary(conditional, "→")
      return !!node && equal(node.left, antecedent) && equal(node.right, result)
    })
    case "↔I": return fits(0, 2) && result.kind === "binary" && result.op === "↔" &&
      cases((one, two) => ends(one, result.left, result.right) && ends(two, result.right, result.left))
    case "↔E": return either((biconditional, side) => {
      const node = binary(biconditional, "↔")
      return !!node && ((equal(node.left, side) && equal(node.right, result)) || (equal(node.right, side) && equal(node.left, result)))
    })
    case "¬I": return fits(0, 1) && result.kind === "not" && ends(ranges[0], result.body, { kind: "bottom" })
    case "¬E": return result.kind === "bottom" && either(negates)
    case "X": return fits(1) && a.kind === "bottom"
    case "IP": return fits(0, 1) && ends(ranges[0], { kind: "not", body: result }, { kind: "bottom" })
    case "DS": return either((disjunction, negation) => {
      const node = binary(disjunction, "∨")
      return !!node && ((negates(negation, node.left) && equal(node.right, result)) || (negates(negation, node.right) && equal(node.left, result)))
    })
    case "MT": return either((conditional, negation) => {
      const node = binary(conditional, "→")
      return !!node && negates(negation, node.right) && negates(result, node.left)
    })
    case "DNE": return fits(1) && a.kind === "not" && negates(a.body, result)
    case "DeM": return fits(1) && deMorganInContext(a, result)

  }
}

function lemDependencies(result: Formula, blocks: Range[]) {
  const endpoints = blocks.flatMap(block => [block.assumption, block.conclusion])
  const isIdentity = ({ formula, dependencies }: Assertion) => dependencies.size === 1 && dependencies.has(formulaKey(formula))
  // Carnap permutes the four sequents passed by its typed LEM rule.
  for (const [i, positive] of endpoints.entries()) {
    if (!isIdentity(positive)) continue
    for (const [j, negative] of endpoints.entries()) {
      if (i === j || !isIdentity(negative) || !negates(negative.formula, positive.formula)) continue
      const cases = endpoints.filter((_, index) => index !== i && index !== j)
      if (!cases.every(endpoint => equal(endpoint.formula, result))) continue
      const assumed = [formulaKey(positive.formula), formulaKey(negative.formula)]
      return new Set(cases.flatMap((endpoint, index) => [...endpoint.dependencies].filter(key => key !== assumed[index])))
    }
  }
}

export function validateProof(source: string, premises: readonly string[], conclusion: string): ProofIssue | undefined {
  if (source.length > 16000) return { kind: "incomplete", message: "Use a proof shorter than 16,000 characters." }
  const given = new Set(premises.map(premise => formulaKey(parseFormula(premise, "TFL"))))
  const target = parseFormula(conclusion, "TFL")
  const rows = proofRows(source.replace(/\n$/, ""))
  const depths = rows.map(row => row.indent.length)
  const assertions = new Map<number, Assertion>()
  let final: Assertion | undefined
  for (const [index, row] of rows.entries()) {
    const number = index + 1
    const depth = depths[index]
    const issue = (message: string, kind: "syntax" | "inference" = "inference"): ProofIssue => ({ kind, line: number, message })
    if (!source) break
    if (row.separator) continue
    const leadingNonIndentSpace = row.raw.slice(depth).match(/^\s/)
    const allowsLeadingSpace = /^(?:[¬~⊥⊤-]|not|!\?|_\|_)/.test(row.formula)
    if (!row.rule || (leadingNonIndentSpace && !allowsLeadingSpace)) {
      return issue("Enter a formula followed by a colon and a known rule, such as P :R 1.", "syntax")
    }
    if (row.badReferences) return issue("Enter a citation after the comma.", "syntax")
    const rule = row.rule as Rule
    let formula: Formula
    try { formula = parseFormula(row.formula, "TFL") } catch (error) {
      return issue(error instanceof Error ? error.message : "Invalid formula.", "syntax")
    }
    if (usesSchematicLetter(formula)) return issue("Use sentence letters A–Z in proof assertions. Greek letters are schematic.")
    if (rule === "AS" && depth <= (depths[index - 1] ?? 0)) {
      return issue("Indent the first line of a subproof before using AS.")
    }
    const formulaId = formulaKey(formula)
    if (rule === "PR" && !given.has(formulaId)) return issue("PR must be one of the given premises.")
    const cited: Assertion[] = []
    const blocks: Range[] = []
    for (const [ref] of row.refs.matchAll(/\d+(?:-\d+)?/g)) {
      const [first, last = first] = ref.split("-").map(Number)
      if (first === last) {
        const citedLine = assertions.get(first)
        if (!citedLine) return issue(`Line ${first} must be an earlier assertion.`)
        if (depths.slice(first, number).some(indent => indent < depths[first - 1])) {
          return issue(`Line ${first} is inside a closed or sibling subproof.`)
        }
        cited.push(citedLine)
      } else {
        const assumption = assertions.get(first)
        const conclusion = assertions.get(last)
        const startDepth = depths[first - 1]
        const after = depths[last]
        if (!assumption || !conclusion || first >= last || rows[first - 1].rule !== "AS" ||
          startDepth <= (depths[first - 2] ?? 0) || depths[last - 1] !== startDepth || after >= startDepth ||
          (first !== 1 && depths[first - 2] !== after) ||
          depths.slice(first, last).some(indent => indent < startDepth) ||
          depths.slice(last, number).some(indent => indent < after)) {
          return issue(`Range ${first}-${last} must be a complete, closed subproof accessible from this line.`)
        }
        blocks.push({ assumption, conclusion })
      }
    }
    let dependencies: Set<string> | undefined
    if (rule === "LEM") {
      if (!cited.length && blocks.length === 2) dependencies = lemDependencies(formula, blocks)
    } else if (matchesRule(rule, formula, cited.map(line => line.formula), blocks)) {
      dependencies = new Set(cited.flatMap(line => [...line.dependencies]))
      if (rule === "PR" || rule === "AS") dependencies.add(formulaId)
      for (const { assumption, conclusion } of blocks) {
        const discharged = formulaKey(assumption.formula)
        for (const dependency of conclusion.dependencies) {
          if (dependency !== discharged) dependencies.add(dependency)
        }
      }
    }
    if (!dependencies) return issue(`${rule} does not justify this line. ${rules[rule]}.`)
    const assertion = { formula, dependencies }
    assertions.set(number, assertion)
    if (!depth) final = assertion
  }
  if (!final || !equal(target, final.formula)) {
    if (depths.at(-1)) return { kind: "incomplete", message: "Close the open subproof and finish at the top level." }
    return { kind: "incomplete", message: `The last top-level line must be ${printFormula(target)}.` }
  }
  if ([...final.dependencies].some(key => !given.has(key))) return {
    kind: "incomplete", message: "The conclusion still depends on an assumption outside the given premises.",
  }
}
