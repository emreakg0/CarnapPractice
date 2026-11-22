import { analyzeVariables, children, isVariable, printFormula, type Formula } from "./formula.ts"

export type Interpretation = {
  domain: readonly string[]
  constants: Readonly<Record<string, string>>
  predicates: Readonly<Record<string, { arity: number; tuples: readonly (readonly string[])[] }>>
}

export function evaluateFormula(formula: Formula, model: Interpretation) {
  const { domain, constants, predicates } = model
  if (!domain.length || new Set(domain).size !== domain.length) throw new Error("The domain must be nonempty and contain distinct objects.")
  if (analyzeVariables(formula).free.length) throw new Error("An interpretation question must use a sentence.")
  function validate(node: Formula) {
    const terms = node.kind === "atom" ? node.terms : node.kind === "identity" ? [node.left, node.right] : []
    for (const term of terms) {
      if (!isVariable(term) && !domain.includes(constants[term])) throw new Error(`Missing or invalid referent for ${term}.`)
    }
    if (node.kind === "atom") {
      const predicate = predicates[node.name]
      if (predicate?.arity !== node.terms.length) throw new Error(`Missing or invalid extension for ${node.name}.`)
      if (predicate.tuples.some(tuple => tuple.length !== predicate.arity || tuple.some(member => !domain.includes(member)))) {
        throw new Error(`Invalid tuple in the extension of ${node.name}.`)
      }
    }
    children(node).forEach(validate)
  }
  validate(formula)

  function evaluate(node: Formula, env: Record<string, string>): { value: boolean; evidence?: string } {
    const referent = (term: string) => isVariable(term) ? env[term] : constants[term]
    switch (node.kind) {
      case "bottom": return { value: false }
      case "top": return { value: true }
      case "identity": return { value: referent(node.left) === referent(node.right) }
      case "atom": return {
        value: predicates[node.name].tuples.some(tuple => node.terms.every((term, index) => referent(term) === tuple[index])),
      }
      case "not": {
        const result = evaluate(node.body, env)
        return { value: !result.value, evidence: result.evidence }
      }
      case "binary": {
        const left = evaluate(node.left, env)
        const right = evaluate(node.right, env)
        switch (node.op) {
          case "∧": return { value: left.value && right.value, evidence: (!left.value ? left : right).evidence ?? left.evidence }
          case "∨": return { value: left.value || right.value, evidence: (left.value ? left : right).evidence ?? left.evidence }
          case "→": return { value: !left.value || right.value, evidence: (left.value ? right : left).evidence }
          case "↔": return { value: left.value === right.value, evidence: left.evidence ?? right.evidence }
        }
      }
      case "quantifier": {
        const exists = node.op === "∃"
        let example: string | undefined
        for (const object of domain) {
          const result = evaluate(node.body, { ...env, [node.variable]: object })
          if (result.evidence && !example) example = ` For ${node.variable} = ${object}: ${result.evidence}`
          if (result.value === exists) return {
            value: exists,
            evidence: `${exists ? "Witness" : "Counterexample"} for ${printFormula(node)}: ${node.variable} = ${object} makes its scope ${exists ? "true" : "false"}.${result.evidence ? " " + result.evidence : ""}`,
          }
        }
        const summary = exists ? `No object witnesses ${printFormula(node)}.` : `Every object satisfies the scope of ${printFormula(node)}.`
        return { value: !exists, evidence: summary + (example ?? "") }
      }
    }
  }
  return evaluate(formula, {})
}
