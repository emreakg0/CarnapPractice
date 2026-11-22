import type { Derivation } from "./types.ts"

const definitions: [string[], string, string, string, string, string[]][] = [
  [["P -> Q", "Q -> R"], "P -> R", "   P :AS\n   Q :->E 1,3\n   R :->E 2,4\nP -> R :->I 3-5", "Assume P, then apply conditional elimination twice.", "The subproof establishes R under the assumption P, which conditional introduction discharges.", ["Conditional introduction", "Conditional elimination"]],
  [["P & Q"], "Q & P", "Q :&E 1\nP :&E 1\nQ & P :&I 2,3", "Extract both parts of the premise.", "Conjunction elimination gives the individual conjuncts. Conjunction introduction puts them in the requested order.", ["Conjunction"]],
  [["P"], "Q | P", "Q | P :|I 1", "One disjunct suffices.", "A true right disjunct is enough for the disjunction.", ["Disjunction introduction"]],
  [["P", "~P"], "Q", "!? :~E 1,2\nQ :X 3", "Derive a contradiction first.", "Negation elimination yields ⊥ and explosion allows Q.", ["Contradiction", "Explosion"]],
  [["P -> Q", "~Q"], "~P", "   P :AS\n   Q :->E 1,3\n   !? :~E 2,4\n~P :~I 3-5", "Assume P and look for a contradiction.", "The assumption P gives Q, contradicting ¬Q. Negation introduction discharges P. MT also applies directly.", ["Negation introduction", "Modus tollens"]],
  [["P <-> Q", "Q"], "P", "P :<->E 1,2", "A biconditional gives both directions.", "With Q and P ↔ Q, biconditional elimination yields P.", ["Biconditional elimination"]],
  [["P -> Q", "Q -> P"], "P <-> Q", "   P :AS\n   Q :->E 1,3\n--\n   Q :AS\n   P :->E 2,6\nP <-> Q :<->I 3-4,6-7", "Prove each direction in a separate subproof.", "The two discharged subproofs show both directions required by biconditional introduction.", ["Biconditional introduction", "Sibling subproofs"]],
  [["~~P"], "P", "   ~P :AS\n   !? :~E 1,2\nP :IP 2-3", "Assume the negation of the target.", "The assumption ¬P contradicts ¬¬P. Indirect proof discharges ¬P. DNE also applies directly.", ["Indirect proof", "Double negation elimination"]],
  [["P | Q", "P -> R", "Q -> R"], "R", "   P :AS\n   R :->E 2,4\n--\n   Q :AS\n   R :->E 3,7\nR :|E 1,4-5,7-8", "Show R in each of the two cases.", "Each disjunct leads to R, so R follows by disjunction elimination.", ["Disjunction elimination", "Proof by cases"]],
  [[], "(P | Q) -> (Q | P)", "   P | Q :AS\n      P :AS\n      Q | P :|I 2\n   --\n      Q :AS\n      Q | P :|I 5\n   Q | P :|E 1,2-3,5-6\n(P | Q) -> (Q | P) :->I 1-7", "Start by assuming P ∨ Q, then open a separate subproof for each disjunct.", "Disjunction elimination proves the reordered disjunction within the outer assumption. Conditional introduction then closes that assumption.", ["Nested subproofs", "Disjunction elimination"]],
]

export const derivations: Derivation[] = definitions.map(([premises, conclusion, work, hint, explanation, concepts], index) => {
  const initial = premises.map(formula => formula + " :PR")
  const solution = [...initial, work].join("\n")
  return {
    id: `tfl-${index + 1}`, category: "derivations", difficulty: index >= 8 ? "Advanced" : index >= 4 ? "Intermediate" : "Introductory",
    prompt: "Derive the conclusion from the given premises.", premises, conclusion,
    solution, hint, explanation, concepts,
  }
})
