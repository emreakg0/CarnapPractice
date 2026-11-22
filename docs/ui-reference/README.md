# Carnap Classic UI reference

The practice workspace defaults to Carnap Classic. The layout follows
public Carnap examples and the supplied Module C screenshot. The app
header, category navigation, and progress dashboard use the modern
site layout in both exercise styles.

Original captures were taken in Chrome with Playwright from publicly
accessible documentation on November 21, 2026. The Carnap host presented
an expired certificate during capture. The browser accepted that certificate
for this read-only public session. The reference set uses public examples
and the screenshot supplied for this task.

| Exercise | Primary reference | CarnapPractice baseline |
| --- | --- | --- |
| TFL derivation | [Public Fitch playground](original-proof.png) | [Nested subproofs](../../apps/web/ui-snapshots/darwin/classic-proof.png), [invalid line reference](../../apps/web/ui-snapshots/darwin/classic-proof-error.png) |
| FOL symbolization | [Public FOL translation widget](original-symbolization.png) | [Formula entry](../../apps/web/ui-snapshots/darwin/classic-symbolization.png), [grammatical error](../../apps/web/ui-snapshots/darwin/classic-symbolization-error.png) |
| FOL syntax and scope | [Supplied checkbox question](primary-syntax.png), [public syntax-tree example](original-syntax.png) | [Classic checkbox question](../../apps/web/ui-snapshots/darwin/classic-syntax.png) |
| FOL interpretation | [Public model-entry widget](original-model.png) | [Given interpretation with truth choices](../../apps/web/ui-snapshots/darwin/classic-interpretation.png) |

## What the comparison covers

- **Proofs.** The original uses a monospace textarea, a fixed number
  gutter, vertical Fitch guides, and horizontal lines under assumptions
  and the last premise. The baseline reproduces those features and the
  original colon and citation syntax, including the numbered `--`
  separator. The app displays the goal for every question and gives a
  red line marker and inline error with the citation that failed.
  Enter carries indentation forward. The original can enable Tab
  indentation per activity. The app uses Alt/Option with arrow keys
  so Tab remains available for navigation.
- **Symbolization.** The original shows a roughly 400 px monospace input
  with Submit beside it and the English prompt immediately below.
  Classic keeps that order. The key sits above the input. Enter checks
  the formula and Submit records the attempt. Carnap uses message
  dialogs for some errors. The app shows grammatical and translation
  feedback inline so the answer stays visible.
- **Syntax.** The supplied screenshot governs the card. Both show the
  number and points on the light outer border, a full-width prompt band,
  native checkboxes, compact mathematical notation, and joined Submit
  and Check controls beneath the choices. Question numbers follow the
  app's session order. The app adds an interactive syntax tree after
  checking. Carnap's separate public syntax widget reveals the tree
  incrementally as the student enters operators.
- **Interpretations.** The public widget shows the formula above stacked
  domain and predicate fields. It asks for a countermodel. This exercise
  supplies a fixed interpretation in similarly placed read-only fields
  and asks for a truth value. Binary relations can also be viewed in a
  table. Witness or counterexample feedback appears under the card controls.
- **Shared presentation.** Classic keeps the plain system type, thin
  blue-gray borders, and small square action buttons. Labels and button
  colors are darker for readability. The card narrows to fit a phone,
  and both themes are available. Modern uses the same exercises with
  styled selections, formula and rule insertion controls, and a rendered
  proof preview.

The source references include the exercise and proof CSS, the proof-page
wrapper, and the GHCJS exercise widgets.
[Exercise CSS](../../Carnap-Server/static/css/exercises.css)
[Proof CSS](../../Carnap-Server/static/css/proof.css)
[Proof widget](../../Carnap-GHCJS/src/Carnap/GHCJS/Widget/ProofCheckBox.hs)
[Translation widget](../../Carnap-GHCJS/src/Carnap/GHCJS/Action/Translate.hs)
[Qualitative widget](../../Carnap-GHCJS/src/Carnap/GHCJS/Action/QualitativeProblem.hs)
[Syntax widget](../../Carnap-GHCJS/src/Carnap/GHCJS/Action/SyntaxCheck.hs)
[Model widget](../../Carnap-GHCJS/src/Carnap/GHCJS/Action/CounterModel.hs)

Public reference pages and documentation licensing.
[Fitch playground](https://carnap.io/srv/doc/forallx-yyc.md)
[Translation](https://carnap.io/srv/doc/translation.md)
[Syntax](https://carnap.io/srv/doc/syntax-check.md)
[Countermodels](https://carnap.io/srv/doc/modelchecker.md)
[GPLv3](https://github.com/Carnap/Carnap-Documentation/blob/master/LICENSE)

The macOS Chrome snapshots guard the reviewed local layout against
regressions. Browser tests also assert line numbers, scope guides,
keyboard editing and focus, checkbox and button placement, formula
input placement, and feedback after incorrect submissions.
