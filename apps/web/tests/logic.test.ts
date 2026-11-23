import assert from "node:assert/strict"
import { test } from "node:test"
import { analyzeVariables, children, FormulaError, formulaKey, isMagnusVariable, mainOperator, parseFormula, printFormula, translationKey } from "../lib/formula.ts"
import { gradeLocally } from "../lib/grading.ts"
import { evaluateFormula, type Interpretation } from "../lib/interpretation.ts"
import { parseProofFormula, proofRows, rulesFor, rutgersProofSystem, validateProof, type ProofSystem } from "../lib/proof.ts"
import { bank, byId, categoryIds, examCategoryIds, examOrder, practiceOrder, progressThrough } from "../lib/problems/bank.ts"
import { syntaxSelection } from "../lib/problems/syntax.ts"
import { emptyProgress, hasAnswer, recordAttempt } from "../lib/session.ts"
import magnusFixtures from "./magnusql-fixtures.json" with { type: "json" }
import { evaluateModelOption } from "../lib/problems/models.ts"
import zachFixtures from "./zachtfl-fixtures.json" with { type: "json" }

test("Calgary aliases, unary precedence, and explicit grouping", () => {
  const parse = (source: string) => parseFormula(source, "TFL")
  assert.equal(printFormula(parse("~P & [Q <=> R]")), "¬P ∧ (Q ↔ R)")
  assert.equal(printFormula(parse("P_1 /\\ (Q \\/ R)")), "P_1 ∧ (Q ∨ R)")
  assert.equal(printFormula(parse("P -> (Q > R)")), "P → (Q → R)")
  assert.equal(printFormula(parse("P and not Q")), "P ∧ ¬Q")
  for (const invalid of ["P & Q -> R", "P | Q | R", "(P -> Q]", "P Q", "AxFx", "P&", "P @ Q"]) {
    assert.throws(() => parse(invalid), FormulaError, invalid)
  }
})

test("ZachTFL justification names and aliases match the Calgary rule parser", () => {
  const operators = {
    "∧": ["∧", "&", "/\\"], "∨": ["∨", "v", "|", "\\/"], "→": ["→", "->", "=>", ">"],
    "↔": ["↔", "<->"], "¬": ["¬", "~", "-"],
  }
  for (const [symbol, aliases] of Object.entries(operators)) {
    for (const alias of aliases) for (const suffix of ["I", "E"]) {
      const [row] = proofRows(`P:${alias}${suffix}1`)
      assert.equal(row.rule, symbol + suffix)
      assert.equal(row.refs, "1")
    }
  }
  for (const name of ["AS", "PR", "R", "X", "IP", "DS", "MT", "DNE", "LEM", "DeM"]) {
    assert.equal(proofRows(`P:${name}`)[0].rule, name)
  }
  for (const unsupported of ["<=>I", "andI", "^I", "A/assumption", "dem", " E", " PR"]) {
    assert.equal(proofRows(`P:${unsupported}`)[0].rule, "")
  }
})

test("ZachTFL proof replay agrees with the observed public Carnap widget", () => {
  assert.equal(zachFixtures.length, 241)
  for (const { id, proof, premises, target, carnapSequent, carnapMarks, openGoal, system } of zachFixtures) {
    const issue = validateProof(proof, premises, target, system as ProofSystem | undefined)
    assert.equal(!issue, carnapSequent !== null && !openGoal, id)
    if (openGoal) {
      assert.match(issue?.message ?? "", /assumption outside the given premises/, id)
      assert.equal(validateProof(proof, [...premises, "Q"], target), undefined, id)
    } else if (!carnapSequent) {
      assert.equal(issue?.kind, carnapMarks.match(/[⚠?✗]/u)?.[0] === "⚠" ? "syntax" : "inference", id)
    }
  }
})

test("exercise metadata controls the proof parser and derived rules", () => {
  const modern = "thomasBolducAndZachTFL2019"
  assert.equal(printFormula(parseProofFormula("P | Q & R", modern)), "(P ∨ Q) ∧ R")
  assert.throws(() => parseProofFormula("P | Q & R", rutgersProofSystem), FormulaError)
  assert.throws(() => parseProofFormula("P -> Q & R", modern), FormulaError)
  for (const rule of ["DS", "MT", "DNE", "LEM", "DeM"]) {
    assert.ok(Object.hasOwn(rulesFor(rutgersProofSystem), rule))
    assert.ok(!Object.hasOwn(rulesFor(modern), rule))
  }
  const problem = byId["tfl-8"]
  if (problem?.category !== "derivations") assert.fail("Missing derivation")
  const short = "~~P:PR\nP:DNE1"
  assert.equal(gradeLocally(problem, short).correct, true)
  assert.equal(gradeLocally({ ...problem, system: modern }, short).correct, false)
  assert.equal(gradeLocally({ ...problem, system: modern }, problem.solution).correct, true)

  for (const item of bank) {
    if (item.category !== "derivations") continue
    const record = zachFixtures.find(({ id }) => id === `${item.id} worked solution`)
    assert.equal(item.system, rutgersProofSystem)
    assert.equal(record?.proof, item.solution, item.id)
    assert.equal(formulaKey(parseProofFormula(record!.target, item.system)), formulaKey(parseProofFormula(item.conclusion, item.system)))
  }
})

test("new translation templates match original Magnus grammar and their exercise vocabulary", () => {
  for (const problem of bank) {
    if (problem.category !== "symbolization" || problem.system !== "magnusQL") continue
    const observations = magnusFixtures.filter(row => row.id === problem.id)
    // The recorded Carnap fixtures retain the original predicate letters used
    // when they were captured. The practice bank now avoids unary "Ax", which
    // can be confused with Carnap's "Ax" universal-quantifier alias.
    const historicalAnswers = problem.id === "sym-12"
      ? ["Ag -> (Th & Tg)"]
      : problem.id === "sym-18"
        ? ["~Ex((Ax & Rxa) & ~Rxb)", "Ax((Ax & Rxa) -> Rxb)"]
        : problem.answers
    assert.deepEqual(observations.map(row => row.formula), historicalAnswers)
    assert.ok(observations.every(row => row.message && !row.message.includes("grammatical")))
    const { key } = problem
    for (const answer of problem.answers) {
      const formula = parseFormula(answer, "magnusQL")
      assert.equal(analyzeVariables(formula, isMagnusVariable).sentence, true, problem.id)
      function check(node: ReturnType<typeof parseFormula>) {
        if (node.kind === "atom") assert.ok(Object.keys(key).some(symbol =>
          symbol.startsWith(node.name) && symbol.length - node.name.length === node.terms.length), problem.id)
        const terms = node.kind === "atom" ? node.terms : node.kind === "identity" ? [node.left, node.right] : []
        for (const term of terms) if (!isMagnusVariable(term)) assert.ok(Object.hasOwn(key, term), problem.id)
        children(node).forEach(check)
      }
      check(formula)
    }
  }
  for (const invalid of ["P", "F(a)", "(Fa)", "(∀xFx)", "∀sFs", "a ≠ b", "⊥"]) {
    assert.throws(() => parseFormula(invalid, "magnusQL"), FormulaError, invalid)
  }
  const formula = parseFormula("Fa & Gb → ∀xRxb", "magnusQL")
  assert.equal(printFormula(formula), "(Fa ∧ Gb) → ∀xRxb")
  assert.equal(analyzeVariables(parseFormula("Vv & Fs", "magnusQL"), isMagnusVariable).sentence, true)
  assert.equal(printFormula(parseFormula("Fa v Gb", "magnusQL")), "Fa ∨ Gb")
})

test("unary predicate keys avoid the universal quantifier alias Ax", () => {
  const authorized = byId["sym-12"]
  const apprentice = byId["sym-18"]
  if (authorized?.category !== "symbolization" || apprentice?.category !== "symbolization") {
    assert.fail("Missing symbolization questions")
  }
  assert.equal(authorized.key.Ux, "x is authorized")
  assert.equal(Object.hasOwn(authorized.key, "Ax"), false)
  assert.equal(gradeLocally(authorized, "Ug -> (Th & Tg)").correct, true)
  assert.equal(gradeLocally(authorized, "Ag -> (Th & Tg)").correct, false)

  assert.equal(apprentice.key.Px, "x is an apprentice")
  assert.equal(Object.hasOwn(apprentice.key, "Ax"), false)
  assert.equal(gradeLocally(apprentice, "~Ex((Px & Rxa) & ~Rxb)").correct, true)
  assert.equal(gradeLocally(apprentice, "Ax((Px & Rxa) -> Rxb)").correct, true)
  assert.equal(gradeLocally(apprentice, "~Ex((Ax & Rxa) & ~Rxb)").correct, false)
})

test("reviewed alternate translation keys agree across varied finite models", () => {
  let seed = 381
  function next(limit: number) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return Math.floor(seed / 2 ** 32 * limit)
  }
  for (const problem of bank) {
    if (problem.category !== "symbolization" || !problem.system || problem.answers.length < 2) continue
    const asts = problem.answers.map(answer => parseFormula(answer, problem.system))
    for (let trial = 0; trial < 90; trial++) {
      const domain = ["one", "two", "three"].slice(0, trial % 3 + 1)
      const constants: Record<string, string> = {}
      const predicates: Record<string, Interpretation["predicates"][string]> = {}
      for (const symbol of Object.keys(problem.key)) {
        if (symbol.length === 1) constants[symbol] = domain[next(domain.length)]
        else {
          let tuples: string[][] = [[]]
          for (let i = 1; i < symbol.length; i++) tuples = tuples.flatMap(prefix => domain.map(object => [...prefix, object]))
          predicates[symbol[0]] = { arity: symbol.length - 1, tuples: tuples.filter(() => next(2) === 1) }
        }
      }
      const values = asts.map(ast => evaluateFormula(ast, { domain, constants, predicates }, isMagnusVariable).value)
      assert.equal(new Set(values).size, 1, problem.id)
    }
  }
})

test("FOL parses both predicate styles, identity, and quantifier scopes", () => {
  const formula = parseFormula("Ax(F(x) -> Ey(Lxy & x = y))")
  assert.equal(printFormula(formula), "∀x(Fx → ∃y(Lxy ∧ x = y))")
  assert.equal(mainOperator(formula), "∀x")
  const [outerScope] = children(formula)
  assert.equal(mainOperator(outerScope), "→")
  const inner = children(outerScope)[1]
  assert.equal(mainOperator(inner), "∃y")
  assert.equal(printFormula(children(inner)[0]), "Lxy ∧ x = y")
  assert.equal(printFormula(parseFormula("AxFx -> Gy")), "∀xFx → Gy")
  assert.equal(printFormula(parseFormula("ExAyAyx")), "∃x∀yAyx")
  for (const invalid of ["∀aFa", "∃xy(Fx ∧ Gy)", "FaGb", "a = ", "F(x,)", "Ax(Fx ∧ Gx → Hx)", "F(f(a))"]) {
    assert.throws(() => parseFormula(invalid), FormulaError, invalid)
  }
})

test("free and bound occurrences, variable shadowing, and sentences", () => {
  assert.deepEqual(analyzeVariables(parseFormula("Ax(Fx -> Gy)")), { free: ["y"], bound: ["x"], sentence: false })
  assert.deepEqual(analyzeVariables(parseFormula("Fx & ExLxa")), { free: ["x"], bound: ["x"], sentence: false })
  assert.deepEqual(analyzeVariables(parseFormula("Ax(ExLxx & Fx)")), { free: [], bound: ["x"], sentence: true })
  assert.deepEqual(analyzeVariables(parseFormula("∃xFa")), { free: [], bound: [], sentence: true })
  assert.notEqual(formulaKey(parseFormula("AxExRxx"), true), formulaKey(parseFormula("AxEyRxy"), true))
})

test("symbolization distinguishes grammar, open formulas, incorrect meaning, and verified alternatives", () => {
  const cats = byId["sym-1"]!
  assert.match(gradeLocally(cats, "∀x(Cx ->").message, /grammatical/)
  assert.match(gradeLocally(cats, "Ax(Cx -> Lyx)").message, /free variables/)
  assert.equal(gradeLocally(cats, "Ax(Cx -> Ey(Cy & Lyx))").correct, false)
  assert.equal(gradeLocally(cats, "∀z(C(z) → ∃w(L(z,w) ∧ C(w)))").correct, true)
  assert.equal(gradeLocally(cats, "~Ex(Cx & ~Ey(Cy & Lxy))").correct, true)
  assert.equal(gradeLocally(byId["sym-10"]!, "Ax(Fex | Fox)").correct, false)
})


test("symbolization accepts equivalent quantifier-negation and conditional forms", () => {
  const birds = byId["sym-3"]
  if (birds?.category !== "symbolization") assert.fail("Missing bird/mammal exercise")
  for (const answer of [
    "~Ex(Bx&Mx)", "Ax~(Bx&Mx)", "Ax(Bx->~Mx)",
    "Ax(~Bx|~Mx)", "~Ex(Mx&Bx)", "Ax(Mx->~Bx)",
  ]) {
    assert.equal(gradeLocally(birds, answer).correct, true, answer)
    assert.equal(gradeLocally({ ...birds, system: "magnusQL" }, answer).correct, true, "Magnus: " + answer)
  }
  for (const answer of ["Ax(~Bx&Mx)", "Ax~(Bx|Mx)", "Ex(Bx&Mx)", "Ax(Bx->Mx)"]) {
    assert.equal(gradeLocally(birds, answer).correct, false, answer)
  }
  assert.equal(translationKey(parseFormula("~AxBx")), translationKey(parseFormula("Ex~Bx")))
  assert.equal(translationKey(parseFormula("~ExBx")), translationKey(parseFormula("Ax~Bx")))
  assert.equal(translationKey(parseFormula("~~AxBx")), translationKey(parseFormula("AxBx")))
  assert.notEqual(translationKey(parseFormula("Ax(Bx&Mx)")), translationKey(parseFormula("~Ex(Bx&Mx)")))
})

test("all derived rules are checked for their actual inference patterns", () => {
  const direct = [
    { premises: ["P | Q", "~Q"], target: "P", line: "P :DS 1,2", invalid: "R :DS 1,2" },
    { premises: ["P -> Q", "~Q"], target: "~P", line: "~P :MT 2,1", invalid: "P :MT 2,1" },
    { premises: ["~~P"], target: "P", line: "P :DNE 1", invalid: "Q :DNE 1" },
    { premises: ["~(P & Q)"], target: "~P | ~Q", line: "~P | ~Q :DeM 1", invalid: "~P & ~Q :DeM 1" },
    { premises: ["~P & ~Q"], target: "~(P | Q)", line: "~(P | Q) :DeM 1", invalid: "~(P & Q) :DeM 1" },
  ]
  for (const { premises, target, line, invalid } of direct) {
    const start = premises.map(formula => formula + " :PR\n").join("")
    assert.equal(validateProof(start + line, premises, target), undefined, line)
    assert.equal(validateProof(start + invalid, premises, target)?.line, premises.length + 1)
  }
  assert.equal(validateProof("~(P & Q) -> R :PR\n(~P | ~Q) -> R :DeM 1", ["~(P & Q) -> R"], "(~P | ~Q) -> R"), undefined)
  const lem = "Q :PR\n   P :AS\n   Q :R 1\n--\n   ~P :AS\n   Q :R 1\nQ :LEM 2-3,5-6"
  assert.equal(validateProof(lem, ["Q"], "Q"), undefined)
  assert.match(validateProof(lem.replace("~P :AS", "R :AS"), ["Q"], "Q")?.message ?? "", /LEM/)
})

test("Fitch rejects bad premises, future or inaccessible lines, and malformed ranges", () => {
  const premises = ["P -> Q", "Q -> R"]
  const valid = "P -> Q :PR\nQ -> R :PR\n   P :AS\n   Q :->E 1,3\n   R :->E 2,4\nP -> R :->I 3-5"
  assert.equal(validateProof(valid, premises, "P -> R"), undefined)
  assert.equal(validateProof("P -> Q :PR", premises, "P -> R")?.kind, "incomplete")
  assert.equal(validateProof("P :E1", premises, "P -> R")?.kind, "syntax")
  assert.equal(validateProof("P :R 1,", premises, "P -> R")?.kind, "syntax")
  assert.equal(validateProof("P :R 1", premises, "P -> R")?.kind, "inference")
  assert.equal(validateProof(valid.replace("E 1,3", "E1 3"), premises, "P -> R"), undefined)
  assert.match(validateProof("P -> R :PR", premises, "P -> R")?.message ?? "", /given premises/)
  assert.match(validateProof(valid.replace("1,3", "1,5"), premises, "P -> R")?.message ?? "", /earlier assertion/)
  assert.match(validateProof(valid.replace("3-5", "3-4"), premises, "P -> R")?.message ?? "", /complete, closed subproof/)
  assert.match(validateProof(valid + "\nR :R 5", premises, "R")?.message ?? "", /closed or sibling/)
  assert.match(validateProof(valid.replace("2,4", "2,3"), premises, "P -> R")?.message ?? "", /does not justify/)
  assert.match(validateProof(valid.replace("   P :AS", "P :AS"), premises, "P -> R")?.message ?? "", /Indent/)
  assert.match(validateProof(valid.split("\n").slice(0, -1).join("\n"), premises, "P -> R")?.message ?? "", /Close/)
  const nested = byId["tfl-10"]
  assert.equal(nested?.category, "derivations")
  if (nested?.category !== "derivations") return
  assert.match(validateProof(nested.solution.replace("∨I", "|I").replace("   --", "      --"), [], nested.conclusion)?.message ?? "", /Indent/)
  assert.match(validateProof(nested.solution.replace("Q | P :|I 5", "Q | P :R 3"), [], nested.conclusion)?.message ?? "", /closed or sibling/)
  assert.match(validateProof(nested.solution.replace("2-3,5-6", "2-3,2-3"), [], nested.conclusion)?.message ?? "", /does not justify/)
  assert.match(validateProof(nested.solution.replace("1-7", "2-3"), [], nested.conclusion)?.message ?? "", /accessible from this line/)
})

test("finite interpretation witnesses, counterexamples, identity, and invalid models", () => {
  const question = byId["int-1"]
  if (question?.category !== "interpretations") assert.fail("Missing model")
  const model = question.model
  const evaluate = (source: string) => evaluateFormula(parseFormula(source), model)
  assert.equal(evaluate("Ax(Fx -> Gx)").value, false)
  assert.match(evaluate("Ax(Fx -> Gx)").evidence ?? "", /Counterexample.*x = a/)
  assert.equal(evaluate("Ex(Fx & Gx)").value, true)
  assert.match(evaluate("Ex(Fx & Gx)").evidence ?? "", /Witness.*x = c/)
  assert.equal(evaluate("Ax(ExGx & (x = x))").value, true)
  assert.throws(() => evaluate("Fx"), /sentence/)
  assert.throws(() => evaluate("Fa -> Ha"), /referent/)
  assert.throws(() => evaluate("Ex(Fx | Hx)"), /extension/)
  assert.throws(() => evaluateFormula(parseFormula("AxFx"), { ...model, domain: [] }), /nonempty/)
  assert.throws(() => evaluateFormula(parseFormula("ExFxx"), model), /extension/)
  assert.equal(gradeLocally(question, true).correct, false)
  assert.equal(gradeLocally(question, false).correct, true)
})

test("the bank has 135 unique graded problems and generated answers match authored keys", () => {
  assert.equal(new Set(bank.map(problem => problem.id)).size, 135)
  for (const category of categoryIds) assert.equal(bank.filter(item => item.category === category).length, category === "subproofs" ? 15 : 30)
  for (const problem of bank) {
    assert.equal(gradeLocally(problem, undefined).correct, false)
    switch (problem.category) {
      case "derivations":
      case "subproofs":
        assert.equal(gradeLocally(problem, problem.solution).correct, true, problem.id)
        assert.equal(gradeLocally(problem, problem.conclusion + " :PR").correct, false, problem.id)
        break
      case "symbolization":
        for (const answer of problem.answers) assert.equal(gradeLocally(problem, answer).correct, true, problem.id)
        assert.equal(gradeLocally(problem, "x = x").correct, false, problem.id)
        break
      case "syntax":
        assert.deepEqual(syntaxSelection(problem), problem.correct)
        if (problem.notation && ["sentence", "open"].includes(problem.task)) {
          for (const option of problem.options) assert.doesNotThrow(() => parseFormula(option, problem.notation), problem.id)
        }
        assert.equal(gradeLocally(problem, problem.correct).correct, true, problem.id)
        assert.equal(gradeLocally(problem, [...problem.correct, 100]).correct, false, problem.id)
        break
      case "interpretations":
        if (problem.options) {
          const options = problem.options
          const computed = options.flatMap((_, index) => evaluateModelOption(problem, index).value === problem.select ? [index] : [])
          assert.deepEqual(computed, problem.correct, problem.id)
          assert.ok(computed.length > 0 && computed.length < options.length)
          assert.equal(gradeLocally(problem, [...computed].reverse()).correct, true, problem.id)
          assert.equal(gradeLocally(problem, computed.slice(1)).correct, false, problem.id)
          assert.equal(gradeLocally(problem, options.map((_, index) => index).filter(index => !computed.includes(index))).correct, false, problem.id)
          assert.equal(gradeLocally(problem, true).correct, false, problem.id)
        } else {
          assert.equal(evaluateFormula(parseFormula(problem.formula), problem.model).value, problem.expected)
          assert.equal(gradeLocally(problem, !problem.expected).correct, false)
        }
    }
  }
})

test("question queues defer recent successes and exams are balanced without duplicates", () => {
  const progression = progressThrough("derivations", [], () => 0.5).map(id => byId[id]?.difficulty)
  const levels = ["Introductory", "Intermediate", "Advanced"]
  assert.deepEqual(progression, [...progression].sort((a, b) => levels.indexOf(a!) - levels.indexOf(b!)))
  const recent = ["tfl-1", "tfl-2"]
  const order = practiceOrder("derivations", recent, () => 0.5)
  assert.equal(new Set(order).size, 30)
  assert.deepEqual(order.slice(-2), ["tfl-2", "tfl-1"])
  const exam = examOrder(recent, () => 0.5)
  assert.equal(new Set(exam).size, 8)
  for (const category of examCategoryIds) assert.equal(exam.filter(id => byId[id]?.category === category).length, 2)
  assert.ok(exam.every(id => byId[id]?.category !== "subproofs"))
  let progress = recordAttempt(emptyProgress, "tfl-3", false)
  progress = recordAttempt(progress, "tfl-3", true)
  progress = recordAttempt(progress, "tfl-3", false)
  assert.deepEqual(progress.items["tfl-3"], { attempts: 3, solved: true })
  assert.deepEqual(progress.recent, ["tfl-3"])
  assert.equal(hasAnswer("tfl-3", "P :PR\n"), false)
  assert.equal(hasAnswer("int-1", false), true)
})
