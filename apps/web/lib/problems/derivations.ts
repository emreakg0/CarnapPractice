import { rutgersProofSystem } from "../proof.ts"
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
    id: `tfl-${index + 1}`, category: "derivations", system: rutgersProofSystem, difficulty: index === 9 ? "Advanced" : [0, 4, 6, 7, 8].includes(index) ? "Intermediate" : "Introductory",
    prompt: "Derive the conclusion from the given premises.", premises, conclusion,
    solution, hint, explanation, concepts,
  }
})

const additions: typeof definitions = [
  [["P & (Q -> R)", "Q"], "R & P", "Q -> R:&E1;P:&E1;R:->E2,3;R & P:&I5,4", "Extract the conditional from the conjunction.", "Use the extracted conditional and Q before reassembling the goal.", ["Direct inference", "Conjunction"]],
  [["(P & Q) -> (R & S)", "P", "Q"], "S | T", "P & Q:&I2,3;R & S:->E1,4;S:&E5;S | T:|I6", "Build the whole antecedent.", "The conditional supplies both R and S. One conjunct supplies the needed disjunct.", ["Direct inference", "Conditional"]],
  [["(P | Q) <-> R", "R", "(P | Q) -> S"], "S", "P | Q:<->E1,2;S:->E3,4", "Use the biconditional in the right-to-left direction.", "R establishes P ∨ Q, which is the antecedent of the remaining conditional.", ["Direct inference", "Biconditional"]],
  [["P -> (Q <-> R)", "P & R"], "Q", "P:&E2;R:&E2;Q <-> R:->E1,3;Q:<->E5,4", "Find both the antecedent and the right side.", "The antecedent gives the biconditional. R gives Q from it.", ["Direct inference", "Biconditional"]],
  [["P & ~Q", "(~Q | R) -> (S & T)"], "P & T", "P:&E1;~Q:&E1;~Q | R:|I4;S & T:->E2,5;T:&E6;P & T:&I3,7", "Build the antecedent from ¬Q.", "Carry P forward while the negative conjunct supplies the other branch of the proof.", ["Direct inference", "Multi-step"]],
  [["P <-> (Q & R)", "Q", "R", "P -> S"], "S & R", "Q & R:&I2,3;P:<->E1,5;S:->E4,6;S & R:&I7,3", "The right side of the biconditional is a conjunction.", "The whole right side yields P, and then S.", ["Direct inference", "Multi-step"]],
  [["(P -> Q) & (R -> S)", "P & R"], "Q & S", "P -> Q:&E1;R -> S:&E1;P:&E2;R:&E2;Q:->E3,5;S:->E4,6;Q & S:&I7,8", "Split both premises into their components.", "Two independent applications of →E give the two final conjuncts.", ["Direct inference", "Parallel inference"]],
  [["(P | Q) -> R", "R <-> (S & T)", "Q"], "T", "P | Q:|I3;R:->E1,4;S & T:<->E2,5;T:&E6", "Q can supply the antecedent of the first conditional.", "The resulting R opens the left-to-right direction of the biconditional.", ["Direct inference", "Multi-step"]],
  [["Q -> R"], "P -> (Q -> R)", "   P:AS;   Q -> R:R1;P -> (Q -> R):->I2-3", "The premise remains available inside the assumption.", "The subproof can reach its conclusion by reiteration even when it does not use P.", ["Vacuous discharge", "Conditional introduction"]],
  [["P | Q", "P -> R", "Q -> S"], "R | S", "   P:AS;   R:->E2,4;   R | S:|I5;--;   Q:AS;   S:->E3,8;   R | S:|I9;R | S:|E1,4-6,8-10", "Make the last line of each branch the same disjunction.", "Each branch contributes a different disjunct but derives the same formula.", ["Proof by cases", "Sibling subproofs"]],
  [["P -> (Q & R)", "~R"], "~P", "   P:AS;   Q & R:->E1,3;   R:&E4;   !?:~E2,5;~P:~I3-6", "Assume P and extract the conjunct that conflicts with a premise.", "R and ¬R produce a contradiction inside the subproof.", ["Negation introduction", "Contradiction"]],
  [["~P -> (Q & ~Q)"], "P", "   ~P:AS;   Q & ~Q:->E1,2;   Q:&E3;   ~Q:&E3;   !?:~E4,5;P:IP2-6", "Use IP and split the resulting conjunction.", "The negation of the target yields both Q and ¬Q.", ["Indirect proof", "Contradiction"]],
  [["P -> Q", "~(Q | R)"], "~P & ~R", "~Q & ~R:DeM2;~Q:&E3;~R:&E3;~P:MT1,4;~P & ~R:&I6,5", "Apply DeM before looking for MT.", "DeM exposes ¬Q, and MT yields ¬P.", ["Derived rules", "De Morgan", "Modus tollens"]],
  [["P | (Q & R)", "~~~P"], "R", "~P:DNE2;Q & R:DS1,3;R:&E4", "Treat ¬P as the inner formula of the triple negation.", "DNE yields ¬P, so DS gives the whole remaining disjunct.", ["Derived rules", "Disjunctive syllogism", "Double negation"]],
  [["P -> R", "~P -> (R & S)"], "R", "   P:AS;   R:->E1,3;--;   ~P:AS;   R & S:->E2,6;   R:&E7;R:LEM3-4,6-8", "Consider P and ¬P separately.", "Both opposite assumptions yield R, which is the conclusion of LEM.", ["Derived rules", "Excluded middle"]],
  [[], "(P & Q) <-> (Q & P)", "   P & Q:AS;   P:&E1;   Q:&E1;   Q & P:&I3,2;--;   Q & P:AS;   Q:&E6;   P:&E6;   P & Q:&I8,7;(P & Q) <-> (Q & P):<->I1-4,6-9", "Open one subproof in each direction.", "Each direction extracts both conjuncts and introduces them in reverse order.", ["Theorem", "Biconditional introduction"]],
  [[], "(P & (Q | R)) -> ((P & Q) | (P & R))", "   P & (Q | R):AS;   P:&E1;   Q | R:&E1;      Q:AS;      P & Q:&I2,4;      (P & Q) | (P & R):|I5;   --;      R:AS;      P & R:&I2,8;      (P & Q) | (P & R):|I9;   (P & Q) | (P & R):|E3,4-6,8-10;(P & (Q | R)) -> ((P & Q) | (P & R)):->I1-11", "Keep P available across the two inner cases.", "The inner cases construct the same disjunction. The outer range proves the conditional.", ["Theorem", "Nested proof by cases"]],
  [[], "(P -> Q) -> ((Q -> R) -> (P -> R))", "   P -> Q:AS;      Q -> R:AS;         P:AS;         Q:->E1,3;         R:->E2,4;      P -> R:->I3-5;   (Q -> R) -> (P -> R):->I2-6;(P -> Q) -> ((Q -> R) -> (P -> R)):->I1-7", "Assume the antecedents from the outside in.", "After chaining the two conditional eliminations, close the ranges from the inside out.", ["Theorem", "Triple nesting"]],
  [[], "~(P & ~P)", "   P & ~P:AS;   P:&E1;   ~P:&E1;   !?:~E2,3;~(P & ~P):~I1-4", "Assume the conjunction as one formula.", "Its two conjuncts contradict each other, yielding negation introduction.", ["Theorem", "Negation introduction"]],
  [[], "P | ~P", "   ~(P | ~P):AS;      P:AS;      P | ~P:|I2;      !?:~E1,3;   ~P:~I2-4;   P | ~P:|I5;   !?:~E1,6;P | ~P:IP1-7", "Try IP on the whole disjunction, then use a nested assumption.", "The inner range establishes ¬P. It gives the very disjunction denied by the outer assumption.", ["Theorem", "Nested indirect proof"]],
]

for (const [index, [premises, conclusion, work, hint, explanation, concepts]] of additions.entries()) {
  derivations.push({
    id: `tfl-${11 + index}`, category: "derivations", system: rutgersProofSystem, premises, conclusion,
    difficulty: index < 4 ? "Introductory" : index < 15 ? "Intermediate" : "Advanced",
    prompt: "Derive the conclusion from the given premises.", hint, explanation, concepts,
    solution: [...premises.map(formula => formula + ":PR"), ...work.split(";")].join("\n"),
  })
}
