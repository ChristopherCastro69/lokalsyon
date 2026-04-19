import { customAlphabet } from "nanoid";

// 6-char order code. Alphabet excludes vowels and confusable chars (0/O, 1/l/I)
// to avoid accidentally-rude words and mis-reads on screenshots.
const ALPHABET = "23456789bcdfghjkmnpqrstvwxyz";

export const generateOrderCode = customAlphabet(ALPHABET, 6);
