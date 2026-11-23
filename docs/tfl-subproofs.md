# TFL Derivations with Subproofs

The [dedicated practice category](../apps/web/lib/problems/subproofs.ts)
contains 15 exercises in a fixed progression. Each uses Rutgers'
`thomasBolducAndZachTFL` and the existing Fitch editor. Drafts and solved
statuses use separate question IDs and practice navigation. The timed
exam still draws two from each of the four core categories.

| # | Difficulty | Premises ⊢ target | Techniques |
| ---: | --- | --- | --- |
| 1 | Introductory | P ⊢ Q → (P ∧ Q) | Assume the antecedent, reiterate a premise, and close the range |
| 2 | Introductory | P ∧ R ⊢ (P → Q) → Q | Assume a whole conditional and use it inside the range |
| 3 | Introductory | P ↔ Q, P ⊢ (R ∨ S) → (Q ∧ (R ∨ S)) | Assume a whole disjunction and use ↔E inside the range |
| 4 | Introductory | ⊢ P → (P ∨ (Q ∧ R)) | Open a proof with no premises and introduce a disjunction |
| 5 | Introductory | (P ∨ Q) → R ⊢ P → (R ∧ P) | Build an antecedent from the assumption, then use →I |
| 6 | Intermediate | P ∨ Q, P ↔ R, Q → (R ∧ S) ⊢ T → (R ∧ T) | Get the same result from two sibling cases via different rules, then use that result in a separate range |
| 7 | Intermediate | ¬Q ⊢ ¬(P ∧ (¬P ∨ Q)) | DS exposes a contradiction for ¬I |
| 8 | Intermediate | ⊢ ¬P ∨ (P ∨ Q) | Negate the whole target, apply DeM, and close with IP |
| 9 | Intermediate | P ⊢ Q ↔ (P ∧ Q) | Cite two opposing ranges for ↔I |
| 10 | Intermediate | ⊢ ¬((P ∧ ¬P) ∨ (¬Q ∧ Q)) | Use nested cases to move ⊥ to the outer scope, then close with ¬I |
| 11 | Advanced | Q ⊢ P ∨ (¬P ∧ Q) | Use opposite assumptions in two LEM ranges that reach the same compound target |
| 12 | Advanced | ⊢ ((P → Q) ∧ (P → R)) → (P → (Q ∧ R)) | Open nested assumptions, derive parallel consequents, and close inward to outward |
| 13 | Advanced | Q ⊢ (P ∨ ¬P) ∧ Q | Use ¬I inside IP and track which assumption survives each discharge |
| 14 | Advanced | ⊢ P ↔ ¬¬P | Use nested ¬I for one direction, DNE for the other, and ↔I to close both |
| 15 | Advanced | ⊢ (P ∨ Q) → ((P → R) → ((Q → R) → R)) | Run sibling cases inside three open assumptions and discharge them in reverse order |

## Why direct inference cannot solve these exercises

[Automated tests](../apps/web/tests/subproofs.test.ts) use a three-valued
check solely to certify that subproofs are necessary. For each exercise
they exhibit values that make every premise definitely true and leave
the target unknown. Every supported direct inference preserves
definite truth under those values. This includes DS, MT, DNE, and
DeM. Therefore each line in a proof using only direct rules would
remain definitely true, so it could never reach the unknown target.
The argument covers arbitrarily large intermediate formulas and
additional sentence letters. Grading still uses the Rutgers Fitch
checker and accepts alternative valid derivations.

All 15 worked solutions passed the local checker and the original
Carnap public checker. The tests confirm that every opening
assumption in each worked solution has a corresponding range
citation and that replacing the first discharge's ranges with direct
citations fails. Browser tests also exercise checking an incomplete or
incorrect proof without losing the draft and rejecting a citation
after its subproof has closed.
