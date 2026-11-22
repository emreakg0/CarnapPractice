import type { Metadata } from "next"
import Link from "next/link"
import { Settings } from "@/components/settings"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "CarnapPractice", template: "%s | CarnapPractice" },
  description: "Practice formal logic for Rutgers Intro to Logic Midterm 2.",
}

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <header className="site-header">
          <div className="site-width header-content">
            <Link href="/" className="wordmark"><span aria-hidden="true">⊢</span> CarnapPractice</Link>
            <nav aria-label="Main navigation">
              <Link href="/#practice">Practice</Link>
              <Link href="/exam">Exam</Link>
              <Link href="/progress">Progress</Link>
            </nav>
            <Settings />
          </div>
        </header>
        <main id="main" className="site-width">{children}</main>
        <footer className="site-width site-footer">
          <span>Rutgers Intro to Logic · 01:730:101</span>
          <a href="https://github.com/emreakg0/CarnapPractice">Open-source project</a>
        </footer>
      </body>
    </html>
  )
}
