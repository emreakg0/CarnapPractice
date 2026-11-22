"use client"

import { useState } from "react"
import { children, mainOperator, printFormula, type Formula } from "@/lib/formula"

export function SyntaxTree({ formula }: { formula: Formula }) {
  const [selected, setSelected] = useState<{ node: Formula; path: string }>({ node: formula, path: "root" })
  const { node } = selected
  const scope = children(node)
  return <div className="syntax-visual">
    <p>Selected subexpression <strong>{printFormula(node)}</strong></p>
    {scope.length > 0 && <p>{scope.length === 1 ? "Scope" : "Immediate subexpressions"}{" "}
      <mark>{scope.map(child => printFormula(child)).join(" · ")}</mark>
    </p>}
    <ul className="ast-tree">
      <TreeNode node={formula} path="root" selected={selected.path} choose={(node, path) => setSelected({ node, path })} />
    </ul>
  </div>
}

function TreeNode({ node, path, selected, choose }: {
  node: Formula; path: string; selected: string; choose: (node: Formula, path: string) => void
}) {
  const branches = children(node)
  return <li>
    <button type="button" aria-pressed={path === selected} className={path.startsWith(selected + ".") ? "in-scope" : ""}
      onClick={() => choose(node, path)}>{branches.length ? mainOperator(node) : printFormula(node)}</button>
    {branches.length > 0 && <ul>{branches.map((branch, index) => <TreeNode key={index} node={branch} path={`${path}.${index}`} selected={selected} choose={choose} />)}</ul>}
  </li>
}
