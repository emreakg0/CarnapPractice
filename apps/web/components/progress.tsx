"use client"

import Link from "next/link"
import { bank, byId, categoryIds } from "@/lib/problems/bank"
import { categories } from "@/lib/problems/types"
import { emptyProgress, type Exam } from "@/lib/session"
import { useStored } from "./storage"

export function ProgressDashboard() {
  const [progress] = useStored("progress", emptyProgress)
  const [exam] = useStored<Exam | null>("exam", null)
  const attempts = Object.values(progress.items).reduce((total, item) => total + item.attempts, 0)
  const solved = bank.filter(problem => progress.items[problem.id]?.solved).length

  return <section className="workspace">
    <header className="workspace-header"><div><p className="back-link">Practice dashboard</p><h1>Your progress</h1></div></header>
    <div className="progress-totals">
      <div><strong>{solved}/{bank.length}</strong><span>Questions solved</span></div>
      <div><strong>{attempts}</strong><span>Practice submissions</span></div>
    </div>
    <div className="category-grid progress-grid">
      {categoryIds.map(category => {
        const items = bank.filter(problem => problem.category === category)
        const complete = items.filter(problem => progress.items[problem.id]?.solved).length
        return <Link className="category-card" href={`/practice/${category}`} key={category}>
          <h2>{categories[category].title}</h2>
          <span>{complete} of {items.length} solved</span>
          <progress value={complete} max={items.length} aria-label={`${categories[category].title} solved`} />
        </Link>
      })}
    </div>
    <section className="progress-recent">
      <h2>Recently solved</h2>
      {progress.recent.length ? <ul>{progress.recent.slice(0, 5).map(id => {
        const problem = byId[id]
        return problem && <li key={id}><Link href={`/practice/${problem.category}`}>{categories[problem.category].title}</Link> <span>· {problem.concepts[0]}</span></li>
      })}</ul> : <p>Submit a correct practice answer to start tracking your progress.</p>}
      {exam && <Link className="back-link" href="/exam">{exam.finishedAt ? "View latest exam results" : "Resume exam"}</Link>}
    </section>
  </section>
}
