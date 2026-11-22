"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Exercise, starterAnswer } from "./exercise"
import { useStored } from "./storage"
import { Button } from "./ui/button"
import { validationEngine, type Grade } from "@/lib/grading"
import { byId, practiceOrder } from "@/lib/problems/bank"
import { categories, type Answer, type Category } from "@/lib/problems/types"
import { emptyProgress, recordAttempt, type Progress } from "@/lib/session"

type PracticeSession = { order: string[]; index: number; drafts: Record<string, Answer> }
const emptySession: PracticeSession = { order: [], index: 0, drafts: {} }

export function Practice({ category }: { category: Category }) {
  const [session, setSession] = useStored<PracticeSession>("practice:" + category, emptySession)
  const [progress, setProgress] = useStored<Progress>("progress", emptyProgress)
  const [feedback, setFeedback] = useState<{ id: string; grade: Grade } | undefined>()
  const [busy, setBusy] = useState(false)
  const request = useRef(0)
  const id = session.order[session.index]
  const problem = byId[id]
  const validOrder = session.order.some(item => byId[item]?.category === category)

  useEffect(() => {
    if (!validOrder) setSession(old => old.order.some(item => byId[item]?.category === category)
      ? old : { ...old, order: practiceOrder(category, progress.recent), index: 0 })
  }, [category, progress.recent, setSession, validOrder])

  function navigate(index: number) {
    request.current++
    setBusy(false)
    setFeedback(undefined)
    setSession(old => ({ ...old, index }))
  }

  async function submit(save: boolean) {
    if (!problem || busy) return
    const attempt = ++request.current
    setBusy(true)
    try {
      const grade = await validationEngine.grade(problem, session.drafts[id] ?? starterAnswer(problem))
      if (save) setProgress(previous => recordAttempt(previous, id, grade.correct))
      if (request.current === attempt) setFeedback({ id, grade })
    } finally {
      if (request.current === attempt) setBusy(false)
    }
  }

  const info = categories[category]
  return <div className="workspace">
    <header className="workspace-header">
      <div>
        <Link className="back-link" href="/#practice">Practice categories</Link>
        <h1>{info.title}</h1>
      </div>
      {problem && <p>{problem.difficulty}</p>}
    </header>
    {problem ? <>
      <div className="question-nav">
        <label>Question <select aria-label="Choose question" value={id} onChange={event => navigate(session.order.indexOf(event.target.value))}>
          {session.order.map((item, index) => <option value={item} key={item}>
            {index + 1} of {session.order.length}{progress.items[item]?.solved ? " · Solved" : ""}
          </option>)}
        </select></label>
        <div className="action-row">
          <Button variant="outline" disabled={!session.index} onClick={() => navigate(session.index - 1)}>Previous</Button>
          {session.index < session.order.length - 1
            ? <Button variant="outline" onClick={() => navigate(session.index + 1)}>Next</Button>
            : <Button variant="outline" onClick={() => {
              navigate(0)
              setSession(old => ({ ...old, order: practiceOrder(category, progress.recent), index: 0 }))
            }}>Shuffle again</Button>}
        </div>
      </div>
      <Exercise key={id} problem={problem} number={session.index + 1} answer={session.drafts[id] ?? starterAnswer(problem)}
        grade={feedback?.id === id ? feedback.grade : undefined} busy={busy} onSubmit={submit}
        onChange={answer => {
          request.current++
          setBusy(false)
          setFeedback(undefined)
          setSession(old => ({ ...old, drafts: { ...old.drafts, [id]: answer } }))
        }} />
    </> : <p role="status">Loading practice…</p>}
  </div>
}
