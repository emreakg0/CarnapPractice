export type Binary = "∧" | "∨" | "→" | "↔"
export type Formula =
  | { kind: "atom"; name: string; terms: string[] }
  | { kind: "identity"; left: string; right: string }
  | { kind: "bottom" }
  | { kind: "not"; body: Formula }
  | { kind: "binary"; op: Binary; left: Formula; right: Formula }
  | { kind: "quantifier"; op: "∀" | "∃"; variable: string; body: Formula }

const aliases = new Map<string, string>([
  ["<->", "↔"], ["<=>", "↔"], ["->", "→"], ["=>", "→"], [">", "→"],
  ["/\\", "∧"], ["&", "∧"], ["and", "∧"], ["\\/", "∨"], ["|", "∨"], ["or", "∨"],
  ["~", "¬"], ["-", "¬"], ["not", "¬"], ["!?", "⊥"], ["_|_", "⊥"],
])
const tokenPattern = /\s+|<->|<=>|->|=>|\/\\|\\\/|_\|_|!\?|and|not|or|[A-Za-z](?:_\d+)?|[\[\](),=∧∨→↔¬∀∃⊥~&|>\-]|./gu
const binaries: readonly string[] = ["∧", "∨", "→", "↔"]
const isTerm = (term: string) => /^[a-z](?:_\d+)?$/.test(term)
export const isVariable = (term: string) => /^[s-z](?:_\d+)?$/.test(term)

export class FormulaError extends Error {}

export function parseFormula(source: string, language: "TFL" | "FOL" = "FOL"): Formula {
  if (source.length > 2000) throw new FormulaError("Use a formula shorter than 2,000 characters.")
  const tokens = [...source.matchAll(tokenPattern)].filter(([s]) => s.trim())
  let cursor = 0
  const peek = (offset = 0) => {
    const raw = tokens[cursor + offset]?.[0] ?? ""
    return aliases.get(raw) ?? raw
  }
  const take = () => { const value = peek(); cursor++; return value }
  const fail = (message: string): never => {
    throw new FormulaError(`${message} (column ${(tokens[cursor]?.index ?? source.length) + 1}).`)
  }
  const expect = (expected: string) => {
    if (peek() !== expected) fail(`Expected '${expected}'`)
    take()
  }
  const term = () => {
    if (!isTerm(peek())) fail("Expected a variable or constant")
    return take()
  }
  function expression(): Formula {
    const left = unit()
    if (!binaries.includes(peek())) return left
    const op = take() as Binary
    const right = unit()
    if (binaries.includes(peek())) fail("Use parentheses to group binary connectives")
    return { kind: "binary", op, left, right }
  }
  const startsUnit = (token: string, next: string) =>
    /^([A-Z]|[∀∃¬⊥([])/.test(token) || (isTerm(token) && next === "=")
  function unit(): Formula {
    const token = peek()
    if (token === "(" || token === "[") {
      take()
      const inside = expression()
      expect(token === "(" ? ")" : "]")
      return inside
    }
    if (token === "¬") {
      take()
      return { kind: "not", body: unit() }
    }
    if (token === "⊥") {
      take()
      return { kind: "bottom" }
    }
    if (language === "FOL") {
      if (token === "∀" || token === "∃" || ((token === "A" || token === "E") && isVariable(peek(1)) && startsUnit(peek(2), peek(3)))) {
        take()
        if (!isVariable(peek())) fail("Expected a variable s–z after the quantifier")
        return { kind: "quantifier", op: token === "A" || token === "∀" ? "∀" : "∃", variable: take(), body: unit() }
      }
      if (isTerm(token)) {
        const left = term()
        expect("=")
        return { kind: "identity", left, right: term() }
      }
    }
    if (/^[A-Z](?:_\d+)?$/.test(token)) {
      take()
      const terms: string[] = []
      if (language === "FOL") {
        if (isTerm(peek())) {
          while (isTerm(peek())) terms.push(term())
        } else if (peek() === "(" && isTerm(peek(1)) && (peek(2) === "," || peek(2) === ")")) {
          take()
          terms.push(term())
          while (peek() === ",") { take(); terms.push(term()) }
          expect(")")
        }
      }
      return { kind: "atom", name: token, terms }
    }
    return fail("Expected a formula")
  }
  const result = expression()
  if (cursor < tokens.length) fail(`Unexpected '${peek()}'`)
  return result
}

export function children(formula: Formula): Formula[] {
  switch (formula.kind) {
    case "binary": return [formula.left, formula.right]
    case "not":
    case "quantifier": return [formula.body]
    default: return []
  }
}

export function printFormula(formula: Formula, grouped = false): string {
  switch (formula.kind) {
    case "atom": return formula.name + (formula.terms.some(term => term.includes("_")) ? `(${formula.terms.join(",")})` : formula.terms.join(""))
    case "identity": return `${formula.left} = ${formula.right}`
    case "bottom": return "⊥"
    case "not": return "¬" + printFormula(formula.body, true)
    case "quantifier": return formula.op + formula.variable + printFormula(formula.body, true)
    case "binary": {
      const body = `${printFormula(formula.left, true)} ${formula.op} ${printFormula(formula.right, true)}`
      return grouped ? `(${body})` : body
    }
  }
}

export function analyzeVariables(formula: Formula) {
  const free = new Set<string>()
  const bound = new Set<string>()
  function visit(node: Formula, bindings: string[]) {
    if (node.kind === "quantifier") {
      visit(node.body, [...bindings, node.variable])
      return
    }
    const terms = node.kind === "atom" ? node.terms : node.kind === "identity" ? [node.left, node.right] : []
    for (const term of terms.filter(isVariable)) {
      (bindings.includes(term) ? bound : free).add(term)
    }
    children(node).forEach(child => visit(child, bindings))
  }
  visit(formula, [])
  return { free: [...free].sort(), bound: [...bound].sort(), sentence: free.size === 0 }
}

export function mainOperator(formula: Formula): string {
  if (formula.kind === "quantifier") return formula.op + formula.variable
  if (formula.kind === "binary") return formula.op
  if (formula.kind === "not") return "¬"
  return "None"
}

export function formulaKey(formula: Formula, equivalent = false, binders: string[] = []): string {
  function termKey(term: string) {
    const index = binders.lastIndexOf(term)
    return equivalent && index !== -1 ? `#${binders.length - index}` : term
  }
  const key = (child: Formula) => formulaKey(child, equivalent, binders)
  switch (formula.kind) {
    case "atom": return JSON.stringify([formula.name, ...formula.terms.map(termKey)])
    case "identity": {
      const terms = [termKey(formula.left), termKey(formula.right)]
      return JSON.stringify(["=", ...(equivalent ? terms.sort() : terms)])
    }
    case "bottom": return "⊥"
    case "not": return JSON.stringify(["¬", key(formula.body)])
    case "quantifier": return JSON.stringify([
      formula.op, equivalent ? "" : formula.variable, formulaKey(formula.body, equivalent, [...binders, formula.variable]),
    ])
    case "binary": {
      const operands = [key(formula.left), key(formula.right)]
      if (equivalent && formula.op !== "→") operands.sort()
      return JSON.stringify([formula.op, ...operands])
    }
  }
}
