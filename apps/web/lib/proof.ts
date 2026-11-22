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

export function proofRows(source: string) {
  return source.split("\n").map(raw => {
    const indent = raw.match(/^[ \t]*/)?.[0] ?? ""
    const [formula, justification = "", ...extra] = raw.trim().split(":")
    const [, name = "", refs = ""] = justification.trim().match(/^([^\d\s]+)\s*(.*)$/) ?? []
    const rule = /^(.*)([IE])$/.test(name) ? name.replace(/^(.*)([IE])$/, (_, op, mode) => (ruleAliases.get(op) ?? op) + mode) : name
    return { raw, indent, formula: formula.trim(), rule, refs, extra, separator: raw.trim() === "--" }
  })
}

type Line = { number: number; formula: Formula; scope: number[] }
type Range = { first: Line; last: Line; parent: number[] }
export type ProofIssue =
  | { kind: "incomplete"; message: string; line?: never }
  | { kind: "syntax" | "inference"; message: string; line: number }
const equal = (left: Formula, right: Formula) => formulaKey(left) === formulaKey(right)
const binary = (node: Formula, op: string) => node.kind === "binary" && node.op === op ? node : undefined
const negates = (negation: Formula, body: Formula) => negation.kind === "not" && equal(negation.body, body)
const accessible = (parent: number[], current: number[]) => parent.every((id, index) => current[index] === id)

function matchesRule(rule: Rule, result: Formula, cited: Formula[], ranges: Range[]) {
  const [a, b] = cited
  const fits = (count: number, blocks = 0) => cited.length === count && ranges.length === blocks
  const either = (test: (first: Formula, second: Formula) => boolean) => fits(2) && (test(a, b) || test(b, a))
  const cases = (test: (first: Range, second: Range) => boolean) => {
    const [first, second] = ranges
    return first.first.number !== second.first.number && (test(first, second) || test(second, first))
  }
  const ends = ({ first, last }: Range, start: Formula, end: Formula) => equal(first.formula, start) && equal(last.formula, end)
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
    return compare(first, second) && !!replacement
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
    case "LEM": return fits(0, 2) && cases((one, two) =>
      negates(two.first.formula, one.first.formula) && equal(one.last.formula, result) && equal(two.last.formula, result))
  }
}

export function validateProof(source: string, premises: readonly string[], conclusion: string): ProofIssue | undefined {
  if (source.length > 16000) return { kind: "incomplete", message: "Use a proof shorter than 16,000 characters." }
  const given = premises.map(premise => parseFormula(premise, "TFL"))
  const target = parseFormula(conclusion, "TFL")
  const lines = new Map<number, Line>()
  const ranges = new Map<string, Range>()
  const open: { indent: string; first: Line }[] = []
  let last: Line | undefined
  let final: Line | undefined
  let premiseSection = true
  const rows = proofRows(source)
  for (const [index, row] of rows.entries()) {
    const number = index + 1
    const issue = (message: string, kind: "syntax" | "inference" = "inference"): ProofIssue => ({ kind, line: number, message })
    if (!row.raw.trim()) continue
    if (!row.separator && (!Object.hasOwn(rules, row.rule) || row.extra.length)) {
      return issue("Enter a formula followed by a colon and a known rule, such as P :R 1.", "syntax")
    }
    const indent = row.indent.replace(/\t/g, "   ")
    const previousDepth = open.length
    while (open.length && !indent.startsWith(open.at(-1)!.indent)) {
      const { first } = open.pop()!
      if (last && last.scope.at(-1) === first.number && last.number > first.number) {
        ranges.set(`${first.number}-${last.number}`, { first, last, parent: first.scope.slice(0, -1) })
      }
    }
    const parentIndent = open.at(-1)?.indent ?? ""
    if (row.separator) {
      if (indent !== parentIndent) return issue("Put the separator at the enclosing proof’s indentation.")
      premiseSection = false
      continue
    }
    const rule = row.rule as Rule
    let formula: Formula
    try { formula = parseFormula(row.formula, "TFL") } catch (error) {
      return issue(error instanceof Error ? error.message : "Invalid formula.", "syntax")
    }
    const startsBlock = indent !== parentIndent
    if (startsBlock && row.rule !== "AS") return issue("Start an indented subproof with AS.")
    if (startsBlock && previousDepth > open.length) return issue("Put a -- separator between sibling subproofs, or return to the earlier indentation.")
    if (row.rule === "AS" && !startsBlock) return issue("Indent the first line of a subproof before using AS.")
    if (rule === "PR" && (!premiseSection || startsBlock || !given.some(premise => equal(premise, formula)))) {
      return issue("PR must be one of the given premises at the top level before the derivation.")
    }
    if (rule !== "PR") premiseSection = false
    const scope = open.map(block => block.first.number)
    if (startsBlock) scope.push(number)
    const cited: Formula[] = []
    const blocks: Range[] = []
    const refs = row.refs.trim()
    if (refs) {
      if (!/^\d+(?:\s*-\s*\d+)?(?:(?:\s*,\s*|\s+)\d+(?:\s*-\s*\d+)?)*$/.test(refs)) return issue("Separate references with commas or spaces. Use a hyphen for a subproof range, such as 2–4 written 2-4.", "syntax")
      for (const [ref] of refs.matchAll(/\d+(?:\s*-\s*\d+)?/g)) {
        const [start, end] = ref.split("-").map(Number)
        if (end !== undefined && start !== end) {
          const range = ranges.get(`${start}-${end}`)
          if (!range || range.parent.length !== scope.length || !accessible(range.parent, scope)) return issue(`Range ${start}-${end} must be a complete, closed subproof directly inside this scope.`)
          blocks.push(range)
        } else {
          const line = lines.get(start)
          if (!line) return issue(`Line ${start} must be an earlier assertion.`)
          if (!accessible(line.scope, scope)) return issue(`Line ${start} is inside a closed or sibling subproof.`)
          cited.push(line.formula)
        }
      }
    }
    if (!matchesRule(rule, formula, cited, blocks)) return issue(`${rule} does not justify this line. ${rules[rule]}.`)
    last = { number, formula, scope }
    lines.set(number, last)
    if (startsBlock) open.push({ indent, first: last })
    if (!scope.length) final = last
  }
  if (open.length) return { kind: "incomplete", message: "Close the open subproof and finish at the top level." }
  if (!final || !equal(target, final.formula)) return { kind: "incomplete", message: `The last top-level line must be ${printFormula(target)}.` }
}
