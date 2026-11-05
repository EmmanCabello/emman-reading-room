const COMPARE = /\b(compare|comparison|compared|versus|vs\.?|differ(?:s|ence|ences)?|contrast|similarit(?:y|ies)|alike|better than)\b/i;
const SAVE = /\b(save|add|shelve|stage|bookmark|keep|put)\b.*\b(shelf|list|collection|them|these|those|it|first|second|third|last|one)\b|\b(save|shelve|stage)\b/i;
const PRIOR = /\b(them|these|those|it|that one|this one|both|all of them|the first|the second|the third|the last|first one|second one|third one|last one)\b/i;
const GREETING = /^\s*(hi|hello|hey|greetings|good (morning|afternoon|evening)|help|what can you do|who are you)\b/i;
const ABOUT = /\b(tell me about|what is|what's|describe|summari[sz]e|who wrote|who was|about the book|details (on|about)|record for|read the record)\b/i;

export const isComparison = (text: string) => COMPARE.test(text);
export const wantsSave = (text: string) => SAVE.test(text);
export const refersToPrior = (text: string) => PRIOR.test(text);
export const isGreeting = (text: string) => GREETING.test(text);
export const wantsDetails = (text: string) => ABOUT.test(text);

const trimPiece = (s: string) =>
  s
    .replace(/[?.!]+$/g, "")
    .replace(/^(the|these|those|books?|works?|titles?)\s+/i, "")
    .trim();

/** Pull the things being compared out of a natural-language question. */
export function comparisonSubjects(text: string): string[] {
  const patterns: RegExp[] = [
    /difference(?:s)? between (.+?) and (.+)/i,
    /how (?:does|do|is|are) (.+?) (?:differ(?:ent)? from|compare(?:d)? (?:to|with)|contrast(?:ed)? with|similar to) (.+)/i,
    /compare (.+?) (?:with|to|and|against|versus|vs\.?) (.+)/i,
    /(.+?) (?:versus|vs\.?) (.+)/i,
    /(?:contrast|comparison of) (.+?) (?:with|and|to) (.+)/i
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      const pieces = [trimPiece(m[1]), trimPiece(m[2])].filter((p) => p.length > 1);
      if (pieces.length === 2) return pieces;
    }
  }
  return [];
}

const ORDINALS: Array<[RegExp, number]> = [
  [/\b(first|1st|top)\b/i, 0],
  [/\b(second|2nd)\b/i, 1],
  [/\b(third|3rd)\b/i, 2],
  [/\b(fourth|4th)\b/i, 3],
  [/\b(fifth|5th)\b/i, 4]
];

/** Resolve "the second one", "both", "them" against the ids discussed last turn. */
export function pickFromPrior(text: string, prior: number[]): number[] {
  if (!prior.length) return [];
  if (/\b(both|all|them|these|those)\b/i.test(text)) return prior;
  if (/\blast\b/i.test(text)) return [prior[prior.length - 1]];
  for (const [re, idx] of ORDINALS) {
    if (re.test(text) && prior[idx] !== undefined) return [prior[idx]];
  }
  return prior.length === 1 ? prior : [prior[0]];
}

export function stageFromText(text: string): "to-read" | "reading" | "finished" {
  if (/\b(finished|read it already|already read|done reading)\b/i.test(text)) return "finished";
  if (/\b(currently reading|reading now|started)\b/i.test(text)) return "reading";
  return "to-read";
}

/** Remove command words so the remainder can be used as a catalogue query. */
export function topicOf(text: string): string {
  return text
    .replace(/\b(please|can you|could you|would you|i would like|i'd like|i want|show me|find me|find|recommend|suggest|give me|do you have|any|books?|titles?|works?|about|on|regarding|to my shelf|on my shelf|save|add|stage|shelve|tell me|what is|what's|describe|summari[sz]e|who wrote)\b/gi, " ")
    .replace(/[?.!,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
