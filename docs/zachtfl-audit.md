# Carnap ZachTFL compatibility audit

The professor's Problem Set 4 HTML identifies the system as
`thomasBolducAndZachTFL`, with `fitch` guides, `tabindent render popout`
options, and the `proofchecker` widget type. This is the pre-2019
Calgary rule set. All 45 TFL exercises in CarnapPractice explicitly
select that system. The guide and widget options govern presentation
and editing. The selected system supplies the parser and proof rules.

This audit compares the workspace with the checked-in Haskell source, verified against the upstream rule,
formula parser, and Fitch checker files,
and the public Carnap `ZachTFL` playground. The archived fixture records
the input, goal sequent, and line markers observed in the browser.
Playground premises are unrestricted, so most replay cases use the
formulas labeled `PR` as the given premises. Seven directed cases
also exercised Carnap's assigned-premise and final-goal checks using
the professor's widget settings on public fixture pages. These cover
the professor's sample, both biconditional constructions, an invented
premise, and a remaining `LEM` dependency.

[Carnap Calgary documentation and playground](https://carnap.io/srv/doc/forallx-yyc.md)
[Recorded proof fixtures](../apps/web/tests/zachtfl-fixtures.json)

## Rule comparison

Both engines allow citation order to vary where the inferences still
fit, including the order of case ranges. They use an exact formula
match after parsing, so changing the order of a conjunction's operands
requires a derivation. The table describes the standard form of each
rule and records behavior relevant to compatibility.

| Rule | Original Carnap requirement and TypeScript coverage |
| --- | --- |
| `PR` | An assigned premise with zero citations. An assigned premise may appear after another inference or inside a subproof. The TypeScript front-only restriction was removed. |
| `AS` | Zero citations on a line with strictly greater space indentation than the preceding physical line. An assumption cannot start at depth zero. The TypeScript checker now tests that exact boundary. |
| `R` | One accessible citation with the same formula. |
| `∧I` | Two accessible citations supplying the two conjuncts. Citation order can vary. |
| `∧E` | One accessible conjunction. Either conjunct may be concluded. |
| `∨I` | One accessible citation matching either disjunct of the conclusion. The justification alias `vI` is valid, even though `v` is unavailable inside a Calgary formula. |
| `∨E` | One disjunction and two complete ranges, each assuming a disjunct and ending with the same conclusion. Vacuous use of an assumption is allowed. The live engine accepts the same range twice for identical disjuncts. TypeScript now does too. |
| `→I` | One complete range from antecedent assumption to consequent. The consequent may be derived without using the assumption. Reiterate the assumption before using it as the consequent. |
| `→E` | One conditional and a citation of its antecedent yield the consequent. |
| `↔I` | Two complete ranges proving the two directions. The public engine accepts the same range twice for identical sides. TypeScript now does too. |
| `↔E` | A biconditional and either side yield the other side. A biconditional alone is insufficient. |
| `¬I` | One complete range from the unnegated formula to `⊥`. |
| `¬E` | Two opposite formulas yield `⊥`. Use `X` on a separate line to derive an arbitrary formula. |
| `X` | One accessible `⊥` yields any ordinary TFL formula. |
| `IP` | One complete range from the negation of the target to `⊥`. |
| `DS` | A disjunction and the negation of either disjunct yield the remaining disjunct. |
| `MT` | A conditional and the negation of its consequent yield the negation of its antecedent. |
| `DNE` | One double negation yields its inner formula. |
| `DeM` | Both De Morgan laws work in either direction and within a context. One instantiation can replace several identical occurrences. Operand swaps and simultaneous distinct instantiations fail. The public engine also accepts an unchanged formula through a constant context. TypeScript now accepts that case. |
| `LEM` | The standard form cites two ranges assuming opposites and ending in the same result. The original permutes the four boundary sequents. An opposite pair can therefore match the endpoints in some nonstandard ranges. TypeScript now checks those permutations and tracks the remaining dependencies, so a playground sequent such as `Q ⊢ Q` cannot establish `Q` for an exercise that omits `Q` from its premises. The replay also covers both orientations of the two cases when both assumptions are used. |

[Upstream authoritative rule module](https://github.com/Carnap/Carnap/blob/master/Carnap/src/Carnap/Languages/PurePropositional/Logic/ThomasBolducAndZach.hs)
[Haskell rule registrations and aliases](../Carnap/src/Carnap/Languages/PurePropositional/Logic/ThomasBolducAndZach.hs)
[Haskell inference rule schemas](../Carnap/src/Carnap/Languages/PurePropositional/Logic/Rules.hs)
[Haskell checker and dependency permutations](../Carnap/src/Carnap/Calculi/NaturalDeduction/Checker.hs)

## Biconditional rules

**`↔I` requires two closed subproof ranges in the selected system.**
The Haskell parser maps `↔I` and `<->I` to the same four indirect
inference variants. Each variant applies a global restriction to the
pairs of assumption and final formula. For `P ↔ Q`, the endpoints
must be `P` to `Q` and `Q` to `P`. The variants allow either or both
branches to reach their result without relying on the assumption.
The cited ranges are still required in those cases.

The public checker rejected this derivation on line 3 with both
conditionals already established as premises. It also rejected
direct citations to previously derived conditionals, a mixed
direct citation and range, and direct citations to the two
range endings.

```text
P->Q:PR
Q->P:PR
P<->Q:<->I1,2
```

With the same premises, the public checker accepted this proof and
accepted the two ranges in either order. Replay also covers
introduction within an outer subproof and rejection when those
ranges are cited after the outer scope is closed.

```text
P->Q:PR
Q->P:PR
 P:AS
 Q:->E1,3
--
 Q:AS
 P:->E2,6
P<->Q:<->I3-4,6-7
```

**`↔E` requires two accessible assertions.** The Haskell parser maps
`↔E` and `<->E` to the two biconditional ponens variants. Given
`P ↔ Q`, a citation of `P` yields `Q`, and a citation of `Q`
yields `P`. The public checker accepted both directions and
reordered citations. It rejected inferring `P → Q` directly,
even when `P` was supplied as a second citation, and rejected
inferring `¬Q` from `¬P`. To derive `P → Q`, assume `P`,
apply `↔E` to get `Q`, then close the range with `→I`.

[Calgary rule registration and global restrictions](../Carnap/src/Carnap/Languages/PurePropositional/Logic/ThomasBolducAndZach.hs)
[Calgary rule definitions](../Carnap/src/Carnap/Languages/PurePropositional/Logic/Rules.hs)

## Syntax and subproof findings

- Calgary accepts `⊤`, `^`, `⊃`, `only if`, `<>`, `≡`,
  and `if and only if` in formulas. Parentheses and square brackets
  must enclose a binary formula. All binary connectives share a single
  non-associative precedence level. TypeScript now applies these
  rules to Rutgers TFL proofs. The professor's sample, reproduced
  below, was accepted by the original checker and is in the replay suite.
  FOL symbolization has its own parser settings.
- Justification names are case-sensitive and must begin immediately
  after the colon. Formula and justification aliases differ. For
  example, `<=>` is a formula alias and `<=>I` is invalid.
  Line references can be adjacent to the rule name. Successive
  references can use commas or spaces. A range uses an unspaced
  hyphen. Carnap parses the justification prefix, so `R1/note`
  and `R1junk` are read as `R1`. A consumed comma must have
  a following reference. These behaviors are covered by replay.
- Proof accessibility uses physical lines and the count of leading
  spaces. A direct citation cannot cross a less-indented line.
  Range endpoints must align, begin with an assumption, survive
  Carnap's tests on the indentation immediately outside the range,
  and stay accessible at the citing line. This can allow citing a
  completed range while working inside a later subproof, even though
  the earlier individual assertions cannot be cited directly there.
  TypeScript now follows the numeric depth checks.
- Internal blank lines are syntax errors. A separator `--` has
  an indentation and a line number. It cannot be cited as an
  assertion. When two sibling subproofs are adjacent, a separator at
  their enclosing indentation distinguishes them. An ordinary assertion
  at that indentation also separates the scopes and requires no
  separator. A separator written at the sibling indentation cannot
  open a new sibling. These cases were checked in the original widget.
  The last unindented assertion determines the conclusion.
  Carnap still checks all assertions and can accept a valid trailing
  indented block if the last top-level assertion proves the goal.
  TypeScript now follows that behavior.

```text
A/\B:PR
A->C:PR
A:/\E 1
C:->E 2,3
```

[Haskell formula configuration](../Carnap/src/Carnap/Languages/PurePropositional/Parser.hs)
[Haskell formula aliases](../Carnap/src/Carnap/Languages/Util/GenericParsers.hs)
[Haskell Fitch parser and range checks](../Carnap/src/Carnap/Calculi/NaturalDeduction/Parser/Fitch.hs)
[Haskell citation parser](../Carnap/src/Carnap/Calculi/NaturalDeduction/Parser/Util.hs)

## Calgary 2019 variant

| Behavior | `thomasBolducAndZachTFL` | `thomasBolducAndZachTFL2019` |
| --- | --- | --- |
| Rules | Basic rules and `DS`, `MT`, `DNE`, `LEM`, and `DeM` | Basic rules only |
| Ungrouped chains of ∧ and ∨ | Rejected | Accepted and grouped from the left, including mixed chains such as `P ∨ Q ∧ R` |
| Ungrouped binary chains involving → or ↔ | Rejected | Rejected |
| Fitch scope, citations, and basic rule aliases | Shared | Shared |

The Haskell 2019 constructor uses the core justification parser and
the 2019 formula operator table. The app applies the exercise's
`system` to grading, live feedback, displayed formulas, worked
solutions, and the rule picker. The dataset assigns the original
Rutgers system to every current proof exercise. The 2019 variant was
verified by setting the system identifier on a local copy of the
public widget HTML while running Carnap's original browser checker.

[Calgary systems documentation](https://github.com/Carnap/Carnap-Documentation/blob/master/doc/forallx-yyc.md)

## Verification boundary

- The recorded public-widget cases cover all 20 justification names
  and accepted and rejected examples across the rule family in 241
  captured proofs across both systems. These include all 45 current
  worked solutions and three alternate solutions. Every bank result
  was checked against the exercise's intended conclusion.
  Automated replay checks proof acceptance and the distinction
  between syntax and inference errors. The alias test enumerates
  the accepted justification spellings from Haskell.
- The TypeScript checker compares formula structures and range
  endpoints and tracks dependency sets. Carnap performs higher-order matching over sequents
  and their dependency sets. The observed matches establish
  compatibility for the recorded cases. Arbitrary schematic
  formulas and every possible dependency permutation remain
  outside that evidence. In particular, the local `LEM` checker
  prefers a valid pairing with the fewest remaining dependencies.
  Carnap selects from substitutions produced by its higher-order
  matcher. Ties between different remaining dependency sets have
  no exhaustive equivalence check. The app validates ordinary TFL proof
  assertions and reports the first error.
- The app inserts four spaces on Tab and shows the Fitch preview in
  practice. Escape then Tab leaves the editor. Carnap's separate
  pop-out proof window is a presentation difference.
- Oracle runs used the public Carnap browser checker with original
  rule code and, where applicable, a locally configured system.
  The professor's private assignment and exact Carnap build were
  outside the run. The app also enforces input limits and reports
  its own error messages.
