"use client"

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import { printFormula } from "@/lib/formula"
import { parseProofFormula, proofRows, rulesFor, type ProofIssue, type ProofSystem } from "@/lib/proof"

function proofLayout(source: string, system: ProofSystem) {
  const scopes: number[] = []
  return proofRows(source, system).map(row => {
    const columns = row.indent.replace(/\t/g, "   ").length
    if (row.raw.trim()) {
      while (scopes.length && columns < scopes.at(-1)!) scopes.pop()
      if (!row.separator && columns > (scopes.at(-1) ?? 0)) scopes.push(columns)
    }
    return { ...row, columns, scopes: [...scopes] }
  })
}

export function ProofEditor({ system, value, onChange, modern, issue, showStatus, onCheck }: {
  system: ProofSystem; value: string; onChange: (value: string) => void; modern: boolean; issue?: ProofIssue; showStatus: boolean; onCheck: () => void
}) {
  const field = useRef<HTMLTextAreaElement>(null)
  const leaveOnTab = useRef(false)
  const [scroll, setScroll] = useState({ top: 0, left: 0 })
  const [visible, setVisible] = useState<{ height: number; leading: number; padding: number }>()
  useEffect(() => {
    const input = field.current!
    const observer = new ResizeObserver(() => {
      const css = getComputedStyle(input)
      setVisible({ height: input.clientHeight, leading: Number.parseFloat(css.lineHeight), padding: Number.parseFloat(css.paddingTop) })
    })
    observer.observe(input)
    return () => observer.disconnect()
  }, [])
  const rows = proofLayout(value, system)
  const finalPremise = rows.findIndex(row => row.rule !== "PR") - 1
  const premiseEnd = finalPremise === -2 ? rows.length - 1 : finalPremise

  function replace(text: string, start?: number, end?: number) {
    const input = field.current!
    const from = start ?? input.selectionStart
    const to = end ?? input.selectionEnd
    input.focus()
    input.setRangeText(text, from, to, "end")
    onChange(input.value)
  }

  function keys(event: KeyboardEvent<HTMLTextAreaElement>) {
    const input = event.currentTarget
    const start = input.selectionStart
    const end = input.selectionEnd
    const rowStart = start ? value.lastIndexOf("\n", start - 1) + 1 : 0
    const currentLine = value.slice(rowStart, value.indexOf("\n", rowStart) === -1 ? undefined : value.indexOf("\n", rowStart))
    const indent = currentLine.match(/^[ \t]*/)?.[0] ?? ""
    if (event.key === "Escape") {
      leaveOnTab.current = true
      return
    }
    const leave = leaveOnTab.current
    leaveOnTab.current = false
    if (event.key === "Tab" && !leave && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      replace("    ")
    } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      onCheck()
    } else if (event.key === "Enter" && indent) {
      event.preventDefault()
      replace("\n" + indent)
    } else if (event.altKey && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
      event.preventDefault()
      const forward = event.key === "ArrowRight"
      const lastBreak = value.indexOf("\n", end)
      const rowEnd = lastBreak === -1 ? value.length : lastBreak
      const rowNumber = value.slice(0, rowStart).split("\n").length - 1
      const outerIndent = rows[rowNumber].scopes.filter(depth => depth < indent.length).at(-1) ?? 0
      const spaces = Math.max(0, indent.length - outerIndent) || 4
      const adjusted = value.slice(rowStart, rowEnd).split("\n").map(row =>
        forward ? "    " + row : row.replace(/^ +/, indentation => indentation.slice(spaces))).join("\n")
      replace(adjusted, rowStart, rowEnd)
      if (start !== end) input.setSelectionRange(rowStart, rowStart + adjusted.length)
      else {
        const cursor = Math.max(rowStart, start + adjusted.length - currentLine.length)
        input.setSelectionRange(cursor, cursor)
      }
    }
  }

  return (
    <div>
      {modern && <div className="modern-toolbar" aria-label="Proof editing tools">
        <button type="button" onClick={() => {
          const input = field.current!
          const from = input.selectionStart
          const lineStart = from ? value.lastIndexOf("\n", from - 1) + 1 : 0
          const indent = value.slice(lineStart).match(/^[ \t]*/)?.[0] ?? ""
          const blankLine = !value.slice(lineStart, from).trim() && (!value.slice(from) || value[from] === "\n")
          if (blankLine) replace(indent + "    ", lineStart, from)
          else replace("\n" + indent + "    ")
        }}>Indent new assumption</button>
        <label>Insert rule <select value="" onChange={event => { if (event.target.value) replace(event.target.value) }}>
          <option value="">Choose…</option>
          {Object.entries(rulesFor(system)).map(([rule, description]) => <option key={rule} value={rule}>{rule} · {description}</option>)}
        </select></label>
      </div>}
      <div className="proof-input-frame">
        <div className="proof-numbers" aria-hidden="true">
          <div style={{ transform: `translateY(${-scroll.top}px)` }}>
            {rows.map((_, index) => <div className={issue?.line === index + 1 ? "line-error" : ""} key={index}>{index + 1}</div>)}
          </div>
        </div>
        <div className="proof-guides" aria-hidden="true">
          <div style={{ transform: `translate(${-scroll.left}px, ${-scroll.top}px)` }}>
            {rows.map((row, index) => {
              const { columns, scopes } = row
              return <div key={index} className="guide-row">
                {index === premiseEnd && <i className="premise-guide" style={{ width: `${row.raw.trim().length + 1}ch` }} />}
                {scopes.map(column => <i key={column} className={row.rule === "AS" && column === columns ? "assumption-guide" : ""}
                  style={{ left: `${Math.max(0, column - 2)}ch`, width: row.rule === "AS" && column === columns ? `${row.raw.trim().length + 2}ch` : undefined }} />)}
              </div>
            })}
          </div>
        </div>
        <textarea ref={field} value={value} aria-label="Proof editor" aria-describedby="proof-entry-help"
          onChange={event => onChange(event.target.value)} onKeyDown={keys} onBlur={() => { leaveOnTab.current = false }}
          onScroll={event => setScroll({ top: event.currentTarget.scrollTop, left: event.currentTarget.scrollLeft })}
          spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" maxLength={16000}
          rows={Math.min(18, Math.max(6, rows.length + 1))} />
        {showStatus && <div className="proof-line-statuses">
          {rows.map((row, index) => {
            const line = index + 1
            if ((!row.raw.trim() && issue?.line !== line) || row.separator || (issue?.line && line > issue.line)) return null
            const offset = visible ? visible.padding + index * visible.leading - scroll.top : undefined
            if (visible && offset !== undefined && (offset < 0 || offset + visible.leading > visible.height)) return null
            const top = `calc(var(--proof-pad) + ${index} * var(--proof-leading) - ${scroll.top}px)`
            if (line === issue?.line) return <ProofStatus key={line} className="proof-line-status line-error"
              top={top} symbol={issue.kind === "syntax" ? "⚠" : "?"}
              label={issue.kind === "syntax" ? `Syntax error on line ${line}` : `Inference error on line ${line}`}
              detail={issue.message} />
            return <span className="proof-line-status" key={line} style={{ top }} title={`Line ${line} is valid`}>+</span>
          })}
        </div>}
      </div>
      <span id="proof-entry-help" className="sr-only">Write one formula and justification per line, separated by a colon. Tab inserts four spaces. Enter keeps indentation. To move focus forward, press Escape then Tab.</span>
    </div>
  )
}

export function ProofStatus({ className, symbol, label, detail, top }: {
  className: string; symbol: string; label: string; detail: string; top?: string
}) {
  const id = useId()
  return <span className={`proof-status ${className}`} style={{ top }}>
    <button type="button" aria-label={label} aria-describedby={id} onClick={event => event.currentTarget.focus()}
      onKeyDown={event => { if (event.key === "Escape") event.currentTarget.blur() }}>{symbol}</button>
    <span className="proof-status-detail" id={id} role="tooltip"><strong>{label}.</strong> {detail}</span>
  </span>
}

export function ProofPreview({ system, source, live, issue }: { system: ProofSystem; source: string; live?: boolean; issue?: ProofIssue }) {
  return <div className={`worked-proof${live ? " live-proof" : ""}`} role="group" aria-label="Rendered proof">
    {proofLayout(source, system).map((row, index) => {
      if (!row.raw.trim()) return null
      let raw = issue?.kind === "syntax" && issue.line === index + 1
      let formula = row.formula
      if (!row.separator) {
        try { formula = printFormula(parseProofFormula(formula, system), !!live) }
        catch { raw = true }
        raw ||= !row.rule || row.badReferences
      }
      const depth = row.scopes.length
      return <div className="worked-line" key={index}>
        <span>{index + 1}{live ? "." : ""}</span>
        <span className="worked-formula">
          {Array.from({ length: depth }, (_, i) => <i key={i} aria-hidden="true" />)}
          <span className={row.rule === "AS" ? "worked-assumption" : ""}>{raw ? `"${row.raw.trim()}"` : formula}</span>
        </span>
        <span>{!raw && [row.rule, row.refs].filter(Boolean).join(" ")}</span>
      </div>
    })}
  </div>
}
