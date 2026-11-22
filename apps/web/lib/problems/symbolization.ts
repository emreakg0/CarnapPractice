import type { Symbolization } from "./types.ts"

const definitions: [string, Record<string, string>, string[], string, string, string[]][] = [
  ["Every cat likes at least one cat.", { Cx: "x is a cat", Lxy: "x likes y" }, ["Ax(Cx -> Ey(Cy & Lxy))", "~Ex(Cx & ~Ey(Cy & Lxy))"], "Restrict both quantifiers to cats.", "For each cat x, at least one object y is both a cat and liked by x.", ["Restricted quantification", "Relations"]],
  ["Some musician is a teacher.", { Mx: "x is a musician", Tx: "x is a teacher" }, ["Ex(Mx & Tx)"], "A single object must satisfy both predicates.", "An existential quantifier binds the conjunction.", ["Existential quantification"]],
  ["No bird is a mammal.", { Bx: "x is a bird", Mx: "x is a mammal" }, ["~Ex(Bx & Mx)", "Ax(Bx -> ~Mx)", "Ax(Mx -> ~Bx)"], "Rule out any object that is both.", "The extensions of the two predicates must be disjoint.", ["Negated existential", "Universal restriction"]],
  ["Nora admires everyone.", { Axy: "x admires y", n: "Nora" }, ["AxAnx", "~Ex~Anx"], "Nora goes in the first argument position.", "For every object x, Nora admires x.", ["Universal quantification", "Constants"]],
  ["Someone is admired by everyone.", { Axy: "x admires y" }, ["ExAyAyx"], "Pick the admired object before quantifying over admirers.", "One and the same x must be admired by each y.", ["Quantifier order", "Relations"]],
  ["There are at least two dogs.", { Dx: "x is a dog" }, ["ExEy((Dx & Dy) & ~x = y)", "ExEy(Dx & (Dy & ~x = y))", "ExEy((Dx & ~x = y) & Dy)"], "Require two distinct witnesses.", "Without the negated identity, a single dog could serve as both witnesses.", ["Identity", "Counting"]],
  ["Only doctors are surgeons.", { Dx: "x is a doctor", Sx: "x is a surgeon" }, ["Ax(Sx -> Dx)", "~Ex(Sx & ~Dx)"], "Start the conditional with being a surgeon.", "Being a doctor is necessary for being a surgeon.", ["Only", "Conditional"]],
  ["A person is eligible exactly when they are registered.", { Ex: "x is eligible", Rx: "x is registered" }, ["∀x(Ex ↔ Rx)", "(∀x(Ex → Rx)) ∧ (∀x(Rx → Ex))"], "The phrase “exactly when” gives two directions.", "Every object has matching eligibility and registration status.", ["Biconditional", "Universal quantification"]],
  ["Exactly one librarian is on duty.", { Lx: "x is a librarian", Dx: "x is on duty" }, ["Ex((Lx & Dx) & Ay((Ly & Dy) -> y = x))"], "Assert existence and require every other candidate to be identical to the witness.", "One object is a librarian on duty, and any librarian on duty is that object.", ["Uniqueness", "Identity"]],
  ["Either Eva or Omar follows everyone.", { Fxy: "x follows y", e: "Eva", o: "Omar" }, ["(AxFex) | (AxFox)"], "Each side of the disjunction makes its own claim about everyone.", "One named person must follow everyone. Putting the universal outside the disjunction would allow a different follower for each person.", ["Scope", "Disjunction"]],
]
export const symbolizations: Symbolization[] = definitions.map(([prompt, key, answers, hint, explanation, concepts], index) => ({
  id: `sym-${index + 1}`, category: "symbolization", difficulty: index >= 8 ? "Advanced" : index >= 4 ? "Intermediate" : "Introductory",
  prompt, key, answers, hint, explanation, concepts,
}))
