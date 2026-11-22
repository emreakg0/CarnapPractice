"use client"

import { useRef, type ReactNode } from "react"
import { children, parseFormula, printFormula } from "@/lib/formula"
import type { Answer, ModelQuestion, Symbolization, Syntax } from "@/lib/problems/types"
import { SyntaxTree } from "./syntax-tree"

export function FormulaInput({ value, change, modern, actions, onEnter }: {
  value: string; change: (value: string) => void; modern: boolean; actions: ReactNode; onEnter: () => void
}) {
  const field = useRef<HTMLInputElement>(null)
  return <>
    {modern && <div className="modern-toolbar" aria-label="Insert logical symbols">
      {["¬", "∧", "∨", "→", "↔", "∀", "∃", "="].map(symbol => <button type="button" key={symbol}
        onClick={() => {
          const input = field.current!
          input.focus()
          input.setRangeText(symbol, input.selectionStart ?? value.length, input.selectionEnd ?? value.length, "end")
          change(input.value)
        }}>{symbol}</button>)}
    </div>}
    <div className="formula-entry">
      <input ref={field} aria-label="Your formula" value={value} onChange={event => change(event.target.value)}
        onKeyDown={event => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); onEnter() } }}
        maxLength={2000} autoComplete="off" autoCapitalize="off" spellCheck={false} enterKeyHint="go" />
      {actions}
    </div>
  </>
}

export function SyntaxChoices({ problem, answer, change, done }: {
  problem: Syntax; answer: number[]; change: (value: number[]) => void; done: boolean
}) {
  const formula = problem.formula ? parseFormula(problem.formula, "notation" in problem ? problem.notation : undefined) : undefined
  return <>
    <div className="classic-prompt">
      {problem.id === "syn-1" ? <>Which of the following strings of symbols are *formulas* of FOL?</> : problem.prompt}
      {formula && <div className="math syntax-prompt-formula">{printFormula(formula)}</div>}
    </div>
    <CheckboxChoices options={problem.options} answer={answer} change={change} />
    {done && <span className="sr-only">Syntax tree available below the feedback.</span>}
  </>
}

function CheckboxChoices({ options, answer, change }: { options: string[]; answer: number[]; change: (value: number[]) => void }) {
  return (
    <div className="choice-list" role="group" aria-label="Answer choices">
      {options.map((option, index) => <label className="choice" key={option}>
        <input type="checkbox" checked={answer.includes(index)} onChange={event =>
          change(event.target.checked ? [...answer, index] : answer.filter(item => item !== index))} />
        <span className="math">{option}</span>
      </label>)}
    </div>
  )
}

export function ModelReview({ problem }: { problem: ModelQuestion & { options: string[] } }) {
  return <ul className="solution-choices" aria-label="Truth values by statement">
    {problem.options.map((formula, index) => <li key={formula}>
      <span className="math">{formula}</span>{" "}<strong>{problem.correct.includes(index) === problem.select ? "True" : "False"}</strong>
      <p>{problem.reasons[index]}</p>
    </li>)}
  </ul>
}

export function SyntaxReview({ problem }: { problem: Syntax }) {
  const options = problem.formula ? [[problem.formula, parseFormula(problem.formula, "notation" in problem ? problem.notation : undefined)] as const] : problem.correct.map(index => {
    const option = problem.options[index]
    return [option, parseFormula(option, problem.notation)] as const
  })
  const focused = !!problem.target && problem.formula
  return <>
    {focused && <p>Scope <span className="math">{printFormula(children(problem.target!.reduce((node, index) => children(node)[index], parseFormula(problem.formula!, problem.notation)))[0])}</span></p>}
    {options.map(([label, formula]) => <details key={label} open={!!problem.formula}>
      <summary>Syntax tree{options.length > 1 ? ` for ${label}` : ""}</summary>
      <SyntaxTree formula={formula} />
    </details>)}
  </>
}

export function ModelFields({ problem, answer, change, actions }: {
  problem: ModelQuestion; answer: Answer | undefined; change: (value: Answer) => void; actions: ReactNode
}) {
  const { domain, predicates } = problem.model
  const relations = Object.entries(predicates).filter(([, predicate]) => predicate.arity === 2)
  return <>
    {problem.options ? <>
      <div className="classic-prompt">{problem.prompt}</div>
      <div className="model-givens"><ModelData model={problem.model} /></div>
      <CheckboxChoices options={problem.options} answer={Array.isArray(answer) ? answer : []} change={change} />
    </> : <>
    <div className="classic-prompt">
      <span className="math">{printFormula(parseFormula(problem.formula))}</span>
    </div>
    <div className="model-givens">
      <ModelData model={problem.model} />
      <fieldset>
        <legend>{problem.prompt}</legend>
        {[true, false].map(value => <label className="choice" key={String(value)}>
          <input type="radio" name="truth-value" checked={answer === value} onChange={() => change(value)} /> {value ? "True" : "False"}
        </label>)}
      </fieldset>
    </div>
    </>}
    {actions}
    {relations.length > 0 && <details className="model-visual">
      <summary>View relation matrix</summary>
      {relations.map(([symbol, predicate]) => <table key={symbol}>
        <caption>{symbol} (rows are first arguments)</caption>
        <thead><tr><td />{domain.map(object => <th scope="col" key={object}>{object}</th>)}</tr></thead>
        <tbody>{domain.map(left => <tr key={left}><th scope="row">{left}</th>
          {domain.map(right => <td key={right}>{predicate.tuples.some(([a, b]) => a === left && b === right) ? "Yes" : "–"}</td>)}</tr>)}</tbody>
      </table>)}
    </details>}
  </>
}

export function ModelData({ model }: { model: ModelQuestion["model"] }) {
  const { domain, constants, predicates } = model
  return <div className="model-data">
      <div><span>Domain:</span> <code>{`{${domain.join(", ")}}`}</code></div>
      {Object.entries(constants).map(([symbol, referent]) => <div key={symbol}><span>{symbol}:</span> <code>{referent}</code></div>)}
      {Object.entries(predicates).map(([symbol, predicate]) => <div key={symbol}>
        <span>{symbol}({Array.from({ length: predicate.arity }, () => "_").join(",")}):</span>{" "}
        <code>{predicate.tuples.length ? `{${predicate.tuples.map(tuple => tuple.length === 1 ? tuple[0] : `(${tuple.join(", ")})`).join(", ")}}` : "∅"}</code>
      </div>)}
  </div>
}

export function SymbolizationKey({ entries }: { entries: Symbolization["key"] }) {
  return <dl className="symbolization-key" aria-label="Symbolization key">
    {Object.entries(entries).map(([name, description]) => <div key={name}><dt className="math">{name}</dt><dd>{description}</dd></div>)}
  </dl>
}
