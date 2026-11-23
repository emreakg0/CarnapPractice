import Link from "next/link"
import { Button } from "@/components/ui/button"
import { bank, categoryIds } from "@/lib/problems/bank"
import { categories } from "@/lib/problems/types"

export default function Home() {
  return (
    <div className="landing">
      <section className="intro">
        <div className="intro-content">
          <p className="course">RUTGERS INTRO TO LOGIC · 01:730:101</p>
          <h1>Practice formal logic.</h1>
          <p>Prepare for Midterm 2 with Fitch proofs, first-order translations, syntax questions, and finite interpretations.</p>
          <div className="action-row">
            <Button asChild><Link href="#practice">Browse practice</Link></Button>
            <Button variant="outline" asChild><Link href="/exam">Take a timed exam</Link></Button>
          </div>
        </div>
        <div className="intro-proof" aria-label="Example proof of P implies R">
          <p>Conditional introduction</p>
          <div className="intro-proof-goal">P → Q, Q → R ⊢ P → R</div>
          <div className="intro-proof-line"><span>1</span><span>P → Q</span><span>PR</span></div>
          <div className="intro-proof-line"><span>2</span><span>Q → R</span><span>PR</span></div>
          <div className="intro-proof-line nested"><span>3</span><span>P</span><span>AS</span></div>
          <div className="intro-proof-line nested"><span>4</span><span>Q</span><span>→E 1,3</span></div>
          <div className="intro-proof-line nested"><span>5</span><span>R</span><span>→E 2,4</span></div>
          <div className="intro-proof-line"><span>6</span><span>P → R</span><span>→I 3–5</span></div>
        </div>
      </section>
      <section id="practice" aria-labelledby="practice-heading">
        <div className="section-heading"><h2 id="practice-heading">Practice by category</h2><p>{bank.length} exercises</p></div>
        <div className="category-grid">
          {categoryIds.map(id => (
            <Link key={id} className="category-card" href={`/practice/${id}`}>
              <span className="category-mark" aria-hidden="true">{categories[id].mark}</span>
              <h3>{categories[id].title}</h3>
              <p>{categories[id].description}</p>
              <span className="category-count">{bank.filter(p => p.category === id).length} Questions</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
