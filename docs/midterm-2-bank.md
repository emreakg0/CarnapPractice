# Midterm 2 question bank coverage

The supplied blueprint summarizes Rutgers Introduction to Logic Problem
Sets 4–8. It guided exercise format, notation, and progression. The
core bank contains 120 questions, including 80 original additions. The separate [subproof practice track](tfl-subproofs.md) adds 15 questions. The
assignments offer practice evidence and the actual midterm questions
remain unknown.

## Assignment progression

| Problem set | Formats and systems observed | How the bank applies them |
| --- | --- | --- |
| 4 | Direct Fitch derivations in `thomasBolducAndZachTFL`, with basic introduction and elimination, typed citations, and multi-step extraction. Supplemental TFL widgets use the 2019 variant. | Build whole antecedents, work through nested conjunctions and biconditionals, and combine independent chains without assumptions. |
| 5 | Nested and sibling subproofs, vacuous discharge, contradiction, IP, and derived rules. The first demonstration uses the 2019 system. The main exercises use `thomasBolducAndZachTFL`. | Build ranges, use cases, discharge assumptions, and practice all five supported derived rules. |
| 6 | Main TFL system for theorems. `magnusQL` translations move from one-place predicates to binary relations, then to single quantifiers. | Prove theorems without premises and translate with question-specific keys covering names, role order, self-relations, and restricted quantifiers. |
| 7 | Nested `magnusQL` translations without identity. Multi-select qualitative questions distinguish formulas, sentences, free variables, and quantifier scope. | Compare quantifier order and witness dependence. Use checkbox distractors for scope, shadowing, and formula formation. |
| 8 | `magnusQL` identity, counting, uniqueness, and exceptions. Qualitative truth selections use supplied interpretations and at most one quantifier per branch. | Evaluate true and false selections in five original models. Translate co-reference, named uniqueness, at-most and exactly-two claims, and exceptions. |

## Distribution

| Category | Count | Topic distribution |
| --- | ---: | --- |
| TFL derivations | 30 | 11 direct proofs (Set 4), 13 proofs in the subproof and derived-rule progression (Set 5), and 6 premise-free theorems (Set 6). |
| FOL symbolization | 30 | 3 unquantified unary, 3 unquantified binary, 9 with a single quantifier level (Set 6), 7 nested without identity (Set 7), and 8 identity and counting (Set 8). |
| FOL syntax and scope | 30 | 6 formula formation, 6 sentence classification, 4 identifying open formulas, 4 free or bound variable identification, 8 scope questions, and 2 main-operator questions (Set 7). All use checkboxes. |
| FOL interpretations | 30 | 10 quantifier-free, 16 at one quantifier level, and 4 legacy nested-quantifier supplements. The 20 new Set 8-style questions use checkbox groups and the 10 original true/false items keep their answer format. |

New practice queues progress by difficulty. The app shuffles within a
difficulty tier. For a saved queue, the app appends missing questions,
preserves the original queue order and current item, and retains drafts.
All 40 original IDs, progress records, active exam questions, and old
answer formats remain usable.

## Verification and limits

- All 30 worked proofs run through the local Fitch checker. Carnap's
  public `thomasBolducAndZachTFL` widget also accepted each worked
  solution. The fixture suite preserves those observations alongside
  valid and invalid cases from the [proof audit](zachtfl-audit.md).
- The 20 new translations use the compact `magnusQL` syntax from
  Sets 6–8. The parser follows the original system's variables
  `x`–`z`, constants `a`–`w`, prefix quantifiers, and identity
  notation. For example, enter `~a=b` for nonidentity. The 10 earlier
  translations keep their existing parser so earlier drafts remain valid.
  [Carnap systems reference](https://carnap.io/srv/doc/systems.md)
- Carnap's public `magnusQL` widget parsed all 28 new answer templates.
  The widget was a grammar oracle only. The English meanings were
  reviewed against the original authored keys. Tests check that each
  answer is closed, uses the exercise's vocabulary, and agrees with its
  alternate templates across sampled finite models. Broader logical
  equivalence can require an unlisted template.
- The course syntax questions use compact predicates and explicit
  binary grouping from the qualitative examples. The AST checks each
  authored selection, including free versus bound occurrences and
  quantifier scope.
- All 80 new model statements have an independently authored truth
  value and an explanation. The finite evaluator checks each value
  before the question enters the bank. The models exercise co-reference,
  unnamed objects, empty extensions, unary predicates, ordered pairs,
  and ordered triples. Set 8-style groups have no nested quantifiers.
- Remaining coverage gaps include Set 4's supplemental truth tables
  and TFL translations, standalone questions about interpretation
  definitions, model and countermodel construction, and FOL
  derivations. Multiple-level finite quantifier evaluation appears
  only in the four original supplemental questions.

No encoded assignment answer keys were used. The supplied blueprint
and downloaded assignment pages stay outside the repository.
