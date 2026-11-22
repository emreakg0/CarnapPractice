"use client"

import { CircleCheck, CircleHelp } from "lucide-react"
import { useState } from "react"
import { parseFormula, printFormula } from "@/lib/formula"
import type { Grade } from "@/lib/grading"
import { parseProofFormula, rulesFor, rutgersProofSystem, validateProof } from "@/lib/proof"
import type { Answer, Derivation, Problem } from "@/lib/problems/types"
import { FormulaInput, ModelFields, SymbolizationKey, SyntaxChoices, SyntaxReview } from "./exercise-fields"
import { ProofEditor, ProofPreview, ProofStatus } from "./proof-editor"
import { useExerciseStyle } from "./settings"
import { Button } from "./ui/button"

export function starterAnswer(problem: Problem) {
  return problem.category === "derivations" ? problem.premises.map(formula => `${printFormula(parseProofFormula(formula, problem.system))} :PR\n`).join("") : undefined
}

export function Exercise({ problem, number, answer, onChange, onSubmit, exam = false, grade, busy = false, saved = false }: {
  problem: Problem; number: number; answer: Answer | undefined; onChange: (answer: Answer) => void
  onSubmit: (save: boolean) => void; exam?: boolean; grade?: Grade; busy?: boolean; saved?: boolean
}) {
  const [style] = useExerciseStyle()
  const [hint, setHint] = useState(false)
  const [reveal, setReveal] = useState(false)
  const modern = style === "modern"
  const proof = typeof answer === "string" ? answer : ""
  const proofIssue = !exam && problem.category === "derivations" ? validateProof(proof, problem.premises, problem.conclusion, problem.system) : undefined
  const actions = <div className="exercise-actions">
    <Button type="submit" disabled={busy} className="exercise-submit">{exam ? "Save answer" : "Submit"} <CircleCheck aria-hidden="true" size={16} /></Button>
    {!exam && (problem.category !== "symbolization" || modern) && <Button type="button" disabled={busy} onClick={() => onSubmit(false)} className="exercise-check">
      Check <CircleHelp aria-hidden="true" size={16} />
    </Button>}
  </div>

  return <div className={`exercise-layout ${style}`}>
    <form className={`exercise-card exercise-${problem.category}`} aria-label="Exercise" onSubmit={event => {
      event.preventDefault()
      onSubmit(true)
    }}>
      <span className="exercise-number"><span className="sr-only">Question </span>{number}</span>
      <span className="exercise-points">1 pts</span>
      <div className={`exercise-body ${grade?.correct || (!exam && problem.category === "derivations" && !proofIssue) ? "is-correct" : grade ? "is-incorrect" : ""}`}>
        {problem.category === "derivations" && <>
          <div className="proof-widget">
            <div className="proof-goal classic-prompt">
              <span className="sr-only">{problem.prompt}</span>
              <ProofGoal problem={problem} />
              {!exam && (!proofIssue || proofIssue.kind === "incomplete") && <ProofStatus
                className="proof-result" symbol={proofIssue ? "⚠" : "✓"}
                label={proofIssue ? "Proof incomplete" : "Proof complete"}
                detail={proofIssue?.message ?? "This proof establishes the conclusion."} />}
            </div>
            <ProofEditor system={problem.system} modern={modern} value={proof}
              onChange={onChange} issue={proofIssue} showStatus={!exam} onCheck={() => onSubmit(exam)} />
            {actions}
          </div>
          {!exam && <ProofPreview system={problem.system} source={proof} live issue={proofIssue} />}
        </>}
        {problem.category === "symbolization" && <>
          <SymbolizationKey entries={problem.key} />
          {modern && <div className="classic-prompt">{problem.prompt}</div>}
          <FormulaInput modern={modern} actions={actions} value={typeof answer === "string" ? answer : ""} change={onChange} onEnter={() => onSubmit(exam)} />
          {!modern && <div className="classic-prompt translation-prompt">{problem.prompt}{grade?.correct && <span aria-hidden="true">✓</span>}</div>}
        </>}
        {problem.category === "syntax" && <>
          <SyntaxChoices problem={problem} answer={Array.isArray(answer) ? answer : []} change={onChange} done={!!grade} />
          {actions}
        </>}
        {problem.category === "interpretations" && <>
          <ModelFields problem={problem} answer={typeof answer === "boolean" ? answer : undefined} change={onChange} actions={actions} />
        </>}
      </div>

      {exam ? <p className="exam-save-status" role="status">{saved ? "Answer saved." : ""}</p> : <>
        <div className="exercise-feedback" role="status" aria-atomic="true">
          {grade && <div className={grade.correct ? "feedback correct" : "feedback incorrect"}>
            <strong>{grade.message}</strong>
            {grade.detail && <p>{grade.line ? `Line ${grade.line}: ` : ""}{grade.detail}</p>}
            <p>{problem.explanation}</p>
          </div>}
        </div>
        {problem.category === "syntax" && grade && <div className="syntax-feedback"><SyntaxReview problem={problem} /></div>}
      </>}
    </form>
    <aside className="exercise-tools" aria-label="Exercise tools">
      <SyntaxReference problem={problem} />
      {!exam && <>
        <div className="action-row">
          <Button variant="outline" type="button" aria-expanded={hint} onClick={() => setHint(!hint)}>{hint ? "Hide hint" : "Show hint"}</Button>
          <Button variant="outline" type="button" aria-expanded={reveal} onClick={() => setReveal(!reveal)}>{reveal ? "Hide solution" : "Worked solution"}</Button>
        </div>
        {hint && <p className="hint">{problem.hint}</p>}
        {reveal && <div className="worked-solution"><Solution problem={problem} /></div>}
      </>}
    </aside>
  </div>
}

export function ProofGoal({ problem }: { problem: Derivation }) {
  return <span className="math">{problem.premises.map(premise => printFormula(parseProofFormula(premise, problem.system))).join(", ")} ⊢ {printFormula(parseProofFormula(problem.conclusion, problem.system))}</span>
}

export function Solution({ problem }: { problem: Problem }) {
  return <>
    {problem.category === "derivations" && <ProofPreview system={problem.system} source={problem.solution} />}
    {problem.category === "symbolization" && <p className="math">{printFormula(parseFormula(problem.answers[0]))}</p>}
    {problem.category === "syntax" && <ul className="solution-choices">{problem.correct.map(index => <li key={index} className="math">{problem.options[index]}</li>)}</ul>}
    {problem.category === "interpretations" && <p><strong>{problem.expected ? "True" : "False"}</strong></p>}
    <p>{problem.explanation}</p>
  </>
}

const shortcutPairs = [["¬", "~"], ["∧", "&"], ["∨", String.raw`\/`], ["→", "->"], ["↔", "<->"], ["⊥", "!?"]]

function SyntaxReference({ problem }: { problem: Problem }) {
  const derivation = problem.category === "derivations"
  return <details className="syntax-reference">
    <summary>{derivation ? "Syntax and rules" : "Syntax reference"}</summary>
    <dl className="shortcut-grid">
      {[...shortcutPairs, ...(!derivation ? [["∀x", "Ax"], ["∃x", "Ex"], ["x = y", "x = y"]] : [])].map(([symbol, keys]) =>
        <div key={symbol}><dt>{symbol}</dt><dd><kbd>{keys}</kbd></dd></div>)}
    </dl>
    {derivation ? <>
      <p>Enter one formula, a colon, and a justification per line, for example <code>Q :→E 1,3</code>.
        Put the rule immediately after the colon. Start a subproof by indenting its <code>AS</code> line. Tab inserts four spaces. Use Alt/Option + ← or → to change indentation. Enter keeps the current indentation. Press Escape, then Tab, to move focus forward.</p>
      <p>Close a subproof by returning to the enclosing indentation. Separate adjacent subproofs with <code>--</code> at that indentation. Cite a range as <code>2-4</code>.</p>
      {problem.system !== rutgersProofSystem && <p>Calgary 2019 allows ungrouped ∧ and ∨ chains, grouped from the left. Use the basic rules listed below.</p>}
      <dl className="rule-list">{Object.entries(rulesFor(problem.system)).map(([rule, meaning]) => <div key={rule}><dt>{rule}</dt><dd>{meaning}</dd></div>)}</dl>
    </> : <p>Predicate arguments can be compact (<code>Lxy</code>) or comma-separated (<code>L(x,y)</code>). Quantifiers bind the next unit. Group binary connectives with parentheses. {problem.category === "symbolization" && <>In practice, Enter checks your formula. Submit records the attempt.</>}</p>}
  </details>
}
