"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Exercise, ProofGoal, Solution, starterAnswer } from "./exercise"
import { ModelData, SymbolizationKey } from "./exercise-fields"
import { parseFormula, printFormula } from "@/lib/formula"
import { useStored } from "./storage"
import { Button } from "./ui/button"
import { validationEngine, type Grade } from "@/lib/grading"
import { byId, categoryIds, examOrder } from "@/lib/problems/bank"
import { categories, type Answer, type Problem } from "@/lib/problems/types"
import { emptyProgress, examMinutes, hasAnswer, type Exam } from "@/lib/session"

export function ExamWorkspace() {
  const [exam, setExam] = useStored<Exam | null>("exam", null)
  const [progress] = useStored("progress", emptyProgress)
  const [now, setNow] = useState(0)
  const [confirm, setConfirm] = useState(false)
  const [results, setResults] = useState<Grade[] | undefined>()

  useEffect(() => {
    if (!exam || exam.finishedAt) return
    function tick() {
      const current = Date.now()
      setNow(current)
      setExam(previous => previous && !previous.finishedAt && current >= previous.endsAt
        ? { ...previous, finishedAt: previous.endsAt } : previous)
    }
    // Check the wall clock on return from a background tab or a reload.
    function checkDeadline() { if (Date.now() >= exam!.endsAt) tick(); else setNow(Date.now()) }
    checkDeadline()
    const interval = setInterval(checkDeadline, 1000)
    document.addEventListener("visibilitychange", checkDeadline)
    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", checkDeadline)
    }
  }, [exam, setExam])

  useEffect(() => {
    if (!exam?.finishedAt) return
    let cancelled = false
    Promise.all(exam.ids.map(async id => {
      const problem = byId[id]
      return problem ? validationEngine.grade(problem, exam.answers[id]) : { correct: false, message: "Question unavailable." }
    }))
      .then(grades => { if (!cancelled) setResults(grades) })
    return () => { cancelled = true }
  }, [exam])

  function update(change: (previous: Exam) => Exam) {
    setExam(previous => {
      if (!previous || previous.finishedAt) return previous
      const current = Date.now()
      return current >= previous.endsAt ? { ...previous, finishedAt: previous.endsAt } : change(previous)
    })
  }

  function start() {
    const current = Date.now()
    setNow(current)
    setResults(undefined)
    setConfirm(false)
    setExam({ ids: examOrder(progress.recent), position: 0, endsAt: current + examMinutes * 60_000, answers: {}, submitted: [] })
  }

  if (!exam) return <section className="workspace setup-panel">
    <h1>Practice exam</h1>
    <p>{examMinutes} minutes · 8 questions · 2 per category</p>
    <p>You can move between questions and edit your answers until time runs out. Your answers save as you type. Scores and solutions appear after the exam ends.</p>
    <Button onClick={start}>Start exam</Button>
  </section>

  if (exam.finishedAt) return <section className="workspace">
    <header className="workspace-header">
      <div><Link className="back-link" href="/progress">Progress dashboard</Link><h1>Exam results</h1></div>
      <Button variant="outline" onClick={start}>Start a new exam</Button>
    </header>
    {results ? <ExamResults exam={exam} results={results} /> : <p role="status">Grading answers…</p>}
  </section>

  const id = exam.ids[exam.position]
  const problem = byId[id]
  const remaining = now ? Math.max(0, Math.ceil((exam.endsAt - now) / 1000)) : undefined
  const answered = exam.ids.filter(item => hasAnswer(item, exam.answers[item])).length
  const timer = remaining === undefined ? "—" : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
  if (!problem) return <section className="workspace setup-panel"><h1>Practice exam</h1><p>The saved exam uses questions that are no longer available.</p><Button onClick={start}>Start a new exam</Button></section>
  return <div className="workspace">
    <header className="workspace-header">
      <div><p className="back-link">Practice exam</p><h1>{categories[problem.category].title}</h1></div>
      <div className="exam-timer" role="timer" aria-label="Time remaining">{timer}</div>
    </header>
    <div className="question-nav">
      <label>Question <select aria-label="Choose question" value={exam.position} onChange={event => update(previous => ({ ...previous, position: Number(event.target.value) }))}>
        {exam.ids.map((item, index) => <option key={item} value={index}>
          {index + 1} of {exam.ids.length}{hasAnswer(item, exam.answers[item]) ? " · Answered" : ""}
        </option>)}
      </select></label>
      <div className="action-row">
        <Button variant="outline" disabled={!exam.position} onClick={() => update(previous => ({ ...previous, position: previous.position - 1 }))}>Previous</Button>
        <Button variant="outline" disabled={exam.position + 1 === exam.ids.length} onClick={() => update(previous => ({ ...previous, position: previous.position + 1 }))}>Next</Button>
        <Button onClick={() => setConfirm(true)}>Finish exam</Button>
      </div>
    </div>
    {confirm && <div className="finish-confirm" role="group" aria-label="Finish confirmation">
      <p>{answered} of {exam.ids.length} answered. Submit this exam for grading?</p>
      <div className="action-row">
        <Button onClick={() => update(previous => ({ ...previous, finishedAt: Date.now() }))}>Submit exam</Button>
        <Button variant="outline" onClick={() => setConfirm(false)}>Keep working</Button>
      </div>
    </div>}
    <Exercise key={id} exam problem={problem} number={exam.position + 1} answer={exam.answers[id] ?? starterAnswer(problem)}
      saved={exam.submitted.includes(id)}
      onChange={answer => update(previous => ({
        ...previous, answers: { ...previous.answers, [id]: answer }, submitted: previous.submitted.filter(item => item !== id),
      }))}
      onSubmit={() => update(previous => ({
        ...previous, submitted: hasAnswer(id, previous.answers[id]) ? [...new Set([...previous.submitted, id])] : previous.submitted,
      }))} />
  </div>
}

function describeAnswer(problem: Problem, answer: Answer | undefined) {
  if (!hasAnswer(problem.id, answer)) return "Unanswered"
  if (Array.isArray(answer) && problem.category === "syntax") return answer.map(index => problem.options[index]).join(", ") || "No choices selected"
  return typeof answer === "boolean" ? (answer ? "True" : "False") : String(answer)
}

function ExamResults({ exam, results }: { exam: Exam; results: Grade[] }) {
  const correct = results.filter(grade => grade.correct).length
  return <>
    <div className="score-summary">
      <div className="score"><strong>{correct}/{results.length}</strong><span>Correct answers</span></div>
      <dl className="category-results">
        {categoryIds.map(category => {
          const grades = results.filter((_, index) => byId[exam.ids[index]]?.category === category)
          return <div key={category}><dt>{categories[category].title}</dt><dd>{grades.filter(grade => grade.correct).length}/{grades.length}</dd></div>
        })}
      </dl>
    </div>
    <h2>Review incorrect answers</h2>
    {correct === results.length && <p>Every answer was correct.</p>}
    {results.map((grade, index) => {
      const problem = byId[exam.ids[index]]
      if (grade.correct || !problem) return null
      return <details className="exam-review" key={problem.id}>
        <summary>{index + 1}. {categories[problem.category].title} · {grade.message}</summary>
        <p>{problem.prompt}</p>
        {"formula" in problem && problem.formula && <p className="math">{printFormula(parseFormula(problem.formula))}</p>}
        {problem.category === "derivations" && <ProofGoal problem={problem} />}
        {problem.category === "symbolization" && <SymbolizationKey entries={problem.key} />}
        {problem.category === "interpretations" && <ModelData model={problem.model} />}
        {problem.category === "syntax" && <ul className="solution-choices">{problem.options.map(option => <li key={option}>{option}</li>)}</ul>}
        <p><strong>Your answer</strong></p>
        <pre>{describeAnswer(problem, exam.answers[problem.id])}</pre>
        {grade.detail && <p>{grade.line ? `Line ${grade.line}: ` : ""}{grade.detail}</p>}
        <p><strong>Worked solution</strong></p>
        <Solution problem={problem} />
      </details>
    })}
  </>
}
