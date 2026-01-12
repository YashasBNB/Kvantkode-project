/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// allow-any-unicode-comment-file
/**
 * Gets alternative Korean characters for the character code. This will return the ascii
 * character code(s) that a Hangul character may have been input with using a qwerty layout.
 *
 * This only aims to cover modern (not archaic) Hangul syllables.
 *
 * @param code The character code to get alternate characters for
 */
export function getKoreanAltChars(code) {
    const result = disassembleKorean(code);
    if (result && result.length > 0) {
        return new Uint32Array(result);
    }
    return undefined;
}
let codeBufferLength = 0;
const codeBuffer = new Uint32Array(10);
function disassembleKorean(code) {
    codeBufferLength = 0;
    // Initial consonants (초성)
    getCodesFromArray(code, modernConsonants, 4352 /* HangulRangeStartCode.InitialConsonant */);
    if (codeBufferLength > 0) {
        return codeBuffer.subarray(0, codeBufferLength);
    }
    // Vowels (중성)
    getCodesFromArray(code, modernVowels, 4449 /* HangulRangeStartCode.Vowel */);
    if (codeBufferLength > 0) {
        return codeBuffer.subarray(0, codeBufferLength);
    }
    // Final consonants (종성)
    getCodesFromArray(code, modernFinalConsonants, 4520 /* HangulRangeStartCode.FinalConsonant */);
    if (codeBufferLength > 0) {
        return codeBuffer.subarray(0, codeBufferLength);
    }
    // Hangul Compatibility Jamo
    getCodesFromArray(code, compatibilityJamo, 12593 /* HangulRangeStartCode.CompatibilityJamo */);
    if (codeBufferLength) {
        return codeBuffer.subarray(0, codeBufferLength);
    }
    // Hangul Syllables
    if (code >= 0xac00 && code <= 0xd7a3) {
        const hangulIndex = code - 0xac00;
        const vowelAndFinalConsonantProduct = hangulIndex % 588;
        // 0-based starting at 0x1100
        const initialConsonantIndex = Math.floor(hangulIndex / 588);
        // 0-based starting at 0x1161
        const vowelIndex = Math.floor(vowelAndFinalConsonantProduct / 28);
        // 0-based starting at 0x11A8
        // Subtract 1 as the standard algorithm uses the 0 index to represent no
        // final consonant
        const finalConsonantIndex = (vowelAndFinalConsonantProduct % 28) - 1;
        if (initialConsonantIndex < modernConsonants.length) {
            getCodesFromArray(initialConsonantIndex, modernConsonants, 0);
        }
        else if (4352 /* HangulRangeStartCode.InitialConsonant */ +
            initialConsonantIndex -
            12593 /* HangulRangeStartCode.CompatibilityJamo */ <
            compatibilityJamo.length) {
            getCodesFromArray(4352 /* HangulRangeStartCode.InitialConsonant */ + initialConsonantIndex, compatibilityJamo, 12593 /* HangulRangeStartCode.CompatibilityJamo */);
        }
        if (vowelIndex < modernVowels.length) {
            getCodesFromArray(vowelIndex, modernVowels, 0);
        }
        else if (4449 /* HangulRangeStartCode.Vowel */ + vowelIndex - 12593 /* HangulRangeStartCode.CompatibilityJamo */ <
            compatibilityJamo.length) {
            getCodesFromArray(4449 /* HangulRangeStartCode.Vowel */ + vowelIndex - 12593 /* HangulRangeStartCode.CompatibilityJamo */, compatibilityJamo, 12593 /* HangulRangeStartCode.CompatibilityJamo */);
        }
        if (finalConsonantIndex >= 0) {
            if (finalConsonantIndex < modernFinalConsonants.length) {
                getCodesFromArray(finalConsonantIndex, modernFinalConsonants, 0);
            }
            else if (4520 /* HangulRangeStartCode.FinalConsonant */ +
                finalConsonantIndex -
                12593 /* HangulRangeStartCode.CompatibilityJamo */ <
                compatibilityJamo.length) {
                getCodesFromArray(4520 /* HangulRangeStartCode.FinalConsonant */ +
                    finalConsonantIndex -
                    12593 /* HangulRangeStartCode.CompatibilityJamo */, compatibilityJamo, 12593 /* HangulRangeStartCode.CompatibilityJamo */);
            }
        }
        if (codeBufferLength > 0) {
            return codeBuffer.subarray(0, codeBufferLength);
        }
    }
    return undefined;
}
function getCodesFromArray(code, array, arrayStartIndex) {
    // Verify the code is within the array's range
    if (code >= arrayStartIndex && code < arrayStartIndex + array.length) {
        addCodesToBuffer(array[code - arrayStartIndex]);
    }
}
function addCodesToBuffer(codes) {
    // NUL is ignored, this is used for archaic characters to avoid using a Map
    // for the data
    if (codes === 0 /* AsciiCode.NUL */) {
        return;
    }
    // Number stored in format: OptionalThirdCode << 16 | OptionalSecondCode << 8 | Code
    codeBuffer[codeBufferLength++] = codes & 0xff;
    if (codes >> 8) {
        codeBuffer[codeBufferLength++] = (codes >> 8) & 0xff;
    }
    if (codes >> 16) {
        codeBuffer[codeBufferLength++] = (codes >> 16) & 0xff;
    }
}
var HangulRangeStartCode;
(function (HangulRangeStartCode) {
    HangulRangeStartCode[HangulRangeStartCode["InitialConsonant"] = 4352] = "InitialConsonant";
    HangulRangeStartCode[HangulRangeStartCode["Vowel"] = 4449] = "Vowel";
    HangulRangeStartCode[HangulRangeStartCode["FinalConsonant"] = 4520] = "FinalConsonant";
    HangulRangeStartCode[HangulRangeStartCode["CompatibilityJamo"] = 12593] = "CompatibilityJamo";
})(HangulRangeStartCode || (HangulRangeStartCode = {}));
var AsciiCode;
(function (AsciiCode) {
    AsciiCode[AsciiCode["NUL"] = 0] = "NUL";
    AsciiCode[AsciiCode["A"] = 65] = "A";
    AsciiCode[AsciiCode["B"] = 66] = "B";
    AsciiCode[AsciiCode["C"] = 67] = "C";
    AsciiCode[AsciiCode["D"] = 68] = "D";
    AsciiCode[AsciiCode["E"] = 69] = "E";
    AsciiCode[AsciiCode["F"] = 70] = "F";
    AsciiCode[AsciiCode["G"] = 71] = "G";
    AsciiCode[AsciiCode["H"] = 72] = "H";
    AsciiCode[AsciiCode["I"] = 73] = "I";
    AsciiCode[AsciiCode["J"] = 74] = "J";
    AsciiCode[AsciiCode["K"] = 75] = "K";
    AsciiCode[AsciiCode["L"] = 76] = "L";
    AsciiCode[AsciiCode["M"] = 77] = "M";
    AsciiCode[AsciiCode["N"] = 78] = "N";
    AsciiCode[AsciiCode["O"] = 79] = "O";
    AsciiCode[AsciiCode["P"] = 80] = "P";
    AsciiCode[AsciiCode["Q"] = 81] = "Q";
    AsciiCode[AsciiCode["R"] = 82] = "R";
    AsciiCode[AsciiCode["S"] = 83] = "S";
    AsciiCode[AsciiCode["T"] = 84] = "T";
    AsciiCode[AsciiCode["U"] = 85] = "U";
    AsciiCode[AsciiCode["V"] = 86] = "V";
    AsciiCode[AsciiCode["W"] = 87] = "W";
    AsciiCode[AsciiCode["X"] = 88] = "X";
    AsciiCode[AsciiCode["Y"] = 89] = "Y";
    AsciiCode[AsciiCode["Z"] = 90] = "Z";
    AsciiCode[AsciiCode["a"] = 97] = "a";
    AsciiCode[AsciiCode["b"] = 98] = "b";
    AsciiCode[AsciiCode["c"] = 99] = "c";
    AsciiCode[AsciiCode["d"] = 100] = "d";
    AsciiCode[AsciiCode["e"] = 101] = "e";
    AsciiCode[AsciiCode["f"] = 102] = "f";
    AsciiCode[AsciiCode["g"] = 103] = "g";
    AsciiCode[AsciiCode["h"] = 104] = "h";
    AsciiCode[AsciiCode["i"] = 105] = "i";
    AsciiCode[AsciiCode["j"] = 106] = "j";
    AsciiCode[AsciiCode["k"] = 107] = "k";
    AsciiCode[AsciiCode["l"] = 108] = "l";
    AsciiCode[AsciiCode["m"] = 109] = "m";
    AsciiCode[AsciiCode["n"] = 110] = "n";
    AsciiCode[AsciiCode["o"] = 111] = "o";
    AsciiCode[AsciiCode["p"] = 112] = "p";
    AsciiCode[AsciiCode["q"] = 113] = "q";
    AsciiCode[AsciiCode["r"] = 114] = "r";
    AsciiCode[AsciiCode["s"] = 115] = "s";
    AsciiCode[AsciiCode["t"] = 116] = "t";
    AsciiCode[AsciiCode["u"] = 117] = "u";
    AsciiCode[AsciiCode["v"] = 118] = "v";
    AsciiCode[AsciiCode["w"] = 119] = "w";
    AsciiCode[AsciiCode["x"] = 120] = "x";
    AsciiCode[AsciiCode["y"] = 121] = "y";
    AsciiCode[AsciiCode["z"] = 122] = "z";
})(AsciiCode || (AsciiCode = {}));
/**
 * Numbers that represent multiple ascii codes. These are precomputed at compile time to reduce
 * bundle and runtime overhead.
 */
var AsciiCodeCombo;
(function (AsciiCodeCombo) {
    AsciiCodeCombo[AsciiCodeCombo["fa"] = 24934] = "fa";
    AsciiCodeCombo[AsciiCodeCombo["fg"] = 26470] = "fg";
    AsciiCodeCombo[AsciiCodeCombo["fq"] = 29030] = "fq";
    AsciiCodeCombo[AsciiCodeCombo["fr"] = 29286] = "fr";
    AsciiCodeCombo[AsciiCodeCombo["ft"] = 29798] = "ft";
    AsciiCodeCombo[AsciiCodeCombo["fv"] = 30310] = "fv";
    AsciiCodeCombo[AsciiCodeCombo["fx"] = 30822] = "fx";
    AsciiCodeCombo[AsciiCodeCombo["hk"] = 27496] = "hk";
    AsciiCodeCombo[AsciiCodeCombo["hl"] = 27752] = "hl";
    AsciiCodeCombo[AsciiCodeCombo["ho"] = 28520] = "ho";
    AsciiCodeCombo[AsciiCodeCombo["ml"] = 27757] = "ml";
    AsciiCodeCombo[AsciiCodeCombo["nj"] = 27246] = "nj";
    AsciiCodeCombo[AsciiCodeCombo["nl"] = 27758] = "nl";
    AsciiCodeCombo[AsciiCodeCombo["np"] = 28782] = "np";
    AsciiCodeCombo[AsciiCodeCombo["qt"] = 29809] = "qt";
    AsciiCodeCombo[AsciiCodeCombo["rt"] = 29810] = "rt";
    AsciiCodeCombo[AsciiCodeCombo["sg"] = 26483] = "sg";
    AsciiCodeCombo[AsciiCodeCombo["sw"] = 30579] = "sw";
})(AsciiCodeCombo || (AsciiCodeCombo = {}));
/**
 * Hangul Jamo - Modern consonants #1
 *
 * Range U+1100..U+1112
 *
 * |        | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | A | B | C | D | E | F |
 * |--------|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
 * | U+110x | ᄀ | ᄁ | ᄂ | ᄃ | ᄄ | ᄅ | ᄆ | ᄇ | ᄈ | ᄉ | ᄊ | ᄋ | ᄌ | ᄍ | ᄎ | ᄏ |
 * | U+111x | ᄐ | ᄑ | ᄒ |
 */
const modernConsonants = new Uint8Array([
    114 /* AsciiCode.r */, // ㄱ
    82 /* AsciiCode.R */, // ㄲ
    115 /* AsciiCode.s */, // ㄴ
    101 /* AsciiCode.e */, // ㄷ
    69 /* AsciiCode.E */, // ㄸ
    102 /* AsciiCode.f */, // ㄹ
    97 /* AsciiCode.a */, // ㅁ
    113 /* AsciiCode.q */, // ㅂ
    81 /* AsciiCode.Q */, // ㅃ
    116 /* AsciiCode.t */, // ㅅ
    84 /* AsciiCode.T */, // ㅆ
    100 /* AsciiCode.d */, // ㅇ
    119 /* AsciiCode.w */, // ㅈ
    87 /* AsciiCode.W */, // ㅉ
    99 /* AsciiCode.c */, // ㅊ
    122 /* AsciiCode.z */, // ㅋ
    120 /* AsciiCode.x */, // ㅌ
    118 /* AsciiCode.v */, // ㅍ
    103 /* AsciiCode.g */, // ㅎ
]);
/**
 * Hangul Jamo - Modern Vowels
 *
 * Range U+1161..U+1175
 *
 * |        | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | A | B | C | D | E | F |
 * |--------|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
 * | U+116x |   | ᅡ | ᅢ | ᅣ | ᅤ | ᅥ | ᅦ | ᅧ | ᅨ | ᅩ | ᅪ | ᅫ | ᅬ | ᅭ | ᅮ | ᅯ |
 * | U+117x | ᅰ | ᅱ | ᅲ | ᅳ | ᅴ | ᅵ |
 */
const modernVowels = new Uint16Array([
    107 /* AsciiCode.k */, //  -> ㅏ
    111 /* AsciiCode.o */, //  -> ㅐ
    105 /* AsciiCode.i */, //  -> ㅑ
    79 /* AsciiCode.O */, //  -> ㅒ
    106 /* AsciiCode.j */, //  -> ㅓ
    112 /* AsciiCode.p */, //  -> ㅔ
    117 /* AsciiCode.u */, //  -> ㅕ
    80 /* AsciiCode.P */, //  -> ㅖ
    104 /* AsciiCode.h */, //  -> ㅗ
    27496 /* AsciiCodeCombo.hk */, //  -> ㅘ
    28520 /* AsciiCodeCombo.ho */, //  -> ㅙ
    27752 /* AsciiCodeCombo.hl */, //  -> ㅚ
    121 /* AsciiCode.y */, //  -> ㅛ
    110 /* AsciiCode.n */, //  -> ㅜ
    27246 /* AsciiCodeCombo.nj */, //  -> ㅝ
    28782 /* AsciiCodeCombo.np */, //  -> ㅞ
    27758 /* AsciiCodeCombo.nl */, //  -> ㅟ
    98 /* AsciiCode.b */, //  -> ㅠ
    109 /* AsciiCode.m */, //  -> ㅡ
    27757 /* AsciiCodeCombo.ml */, //  -> ㅢ
    108 /* AsciiCode.l */, //  -> ㅣ
]);
/**
 * Hangul Jamo - Modern Consonants #2
 *
 * Range U+11A8..U+11C2
 *
 * |        | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | A | B | C | D | E | F |
 * |--------|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
 * | U+11Ax |   |   |   |   |   |   |   |   | ᆨ | ᆩ | ᆪ | ᆫ | ᆬ | ᆭ | ᆮ | ᆯ |
 * | U+11Bx | ᆰ | ᆱ | ᆲ | ᆳ | ᆴ | ᆵ | ᆶ | ᆷ | ᆸ | ᆹ | ᆺ | ᆻ | ᆼ | ᆽ | ᆾ | ᆿ |
 * | U+11Cx | ᇀ | ᇁ | ᇂ |
 */
const modernFinalConsonants = new Uint16Array([
    114 /* AsciiCode.r */, // ㄱ
    82 /* AsciiCode.R */, // ㄲ
    29810 /* AsciiCodeCombo.rt */, // ㄳ
    115 /* AsciiCode.s */, // ㄴ
    30579 /* AsciiCodeCombo.sw */, // ㄵ
    26483 /* AsciiCodeCombo.sg */, // ㄶ
    101 /* AsciiCode.e */, // ㄷ
    102 /* AsciiCode.f */, // ㄹ
    29286 /* AsciiCodeCombo.fr */, // ㄺ
    24934 /* AsciiCodeCombo.fa */, // ㄻ
    29030 /* AsciiCodeCombo.fq */, // ㄼ
    29798 /* AsciiCodeCombo.ft */, // ㄽ
    30822 /* AsciiCodeCombo.fx */, // ㄾ
    30310 /* AsciiCodeCombo.fv */, // ㄿ
    26470 /* AsciiCodeCombo.fg */, // ㅀ
    97 /* AsciiCode.a */, // ㅁ
    113 /* AsciiCode.q */, // ㅂ
    29809 /* AsciiCodeCombo.qt */, // ㅄ
    116 /* AsciiCode.t */, // ㅅ
    84 /* AsciiCode.T */, // ㅆ
    100 /* AsciiCode.d */, // ㅇ
    119 /* AsciiCode.w */, // ㅈ
    99 /* AsciiCode.c */, // ㅊ
    122 /* AsciiCode.z */, // ㅋ
    120 /* AsciiCode.x */, // ㅌ
    118 /* AsciiCode.v */, // ㅍ
    103 /* AsciiCode.g */, // ㅎ
]);
/**
 * Hangul Compatibility Jamo
 *
 * Range U+3131..U+318F
 *
 * This includes range includes archaic jamo which we don't consider, these are
 * given the NUL character code in order to be ignored.
 *
 * |        | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | A | B | C | D | E | F |
 * |--------|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
 * | U+313x |   | ㄱ | ㄲ | ㄳ | ㄴ | ㄵ | ㄶ | ㄷ | ㄸ | ㄹ | ㄺ | ㄻ | ㄼ | ㄽ | ㄾ | ㄿ |
 * | U+314x | ㅀ | ㅁ | ㅂ | ㅃ | ㅄ | ㅅ | ㅆ | ㅇ | ㅈ | ㅉ | ㅊ | ㅋ | ㅌ | ㅍ | ㅎ | ㅏ |
 * | U+315x | ㅐ | ㅑ | ㅒ | ㅓ | ㅔ | ㅕ | ㅖ | ㅗ | ㅘ | ㅙ | ㅚ | ㅛ | ㅜ | ㅝ | ㅞ | ㅟ |
 * | U+316x | ㅠ | ㅡ | ㅢ | ㅣ | HF | ㅥ | ㅦ | ㅧ | ㅨ | ㅩ | ㅪ | ㅫ | ㅬ | ㅭ | ㅮ | ㅯ |
 * | U+317x | ㅰ | ㅱ | ㅲ | ㅳ | ㅴ | ㅵ | ㅶ | ㅷ | ㅸ | ㅹ | ㅺ | ㅻ | ㅼ | ㅽ | ㅾ | ㅿ |
 * | U+318x | ㆀ | ㆁ | ㆂ | ㆃ | ㆄ | ㆅ | ㆆ | ㆇ | ㆈ | ㆉ | ㆊ | ㆋ | ㆌ | ㆍ | ㆎ |
 */
const compatibilityJamo = new Uint16Array([
    114 /* AsciiCode.r */, // ㄱ
    82 /* AsciiCode.R */, // ㄲ
    29810 /* AsciiCodeCombo.rt */, // ㄳ
    115 /* AsciiCode.s */, // ㄴ
    30579 /* AsciiCodeCombo.sw */, // ㄵ
    26483 /* AsciiCodeCombo.sg */, // ㄶ
    101 /* AsciiCode.e */, // ㄷ
    69 /* AsciiCode.E */, // ㄸ
    102 /* AsciiCode.f */, // ㄹ
    29286 /* AsciiCodeCombo.fr */, // ㄺ
    24934 /* AsciiCodeCombo.fa */, // ㄻ
    29030 /* AsciiCodeCombo.fq */, // ㄼ
    29798 /* AsciiCodeCombo.ft */, // ㄽ
    30822 /* AsciiCodeCombo.fx */, // ㄾ
    30310 /* AsciiCodeCombo.fv */, // ㄿ
    26470 /* AsciiCodeCombo.fg */, // ㅀ
    97 /* AsciiCode.a */, // ㅁ
    113 /* AsciiCode.q */, // ㅂ
    81 /* AsciiCode.Q */, // ㅃ
    29809 /* AsciiCodeCombo.qt */, // ㅄ
    116 /* AsciiCode.t */, // ㅅ
    84 /* AsciiCode.T */, // ㅆ
    100 /* AsciiCode.d */, // ㅇ
    119 /* AsciiCode.w */, // ㅈ
    87 /* AsciiCode.W */, // ㅉ
    99 /* AsciiCode.c */, // ㅊ
    122 /* AsciiCode.z */, // ㅋ
    120 /* AsciiCode.x */, // ㅌ
    118 /* AsciiCode.v */, // ㅍ
    103 /* AsciiCode.g */, // ㅎ
    107 /* AsciiCode.k */, // ㅏ
    111 /* AsciiCode.o */, // ㅐ
    105 /* AsciiCode.i */, // ㅑ
    79 /* AsciiCode.O */, // ㅒ
    106 /* AsciiCode.j */, // ㅓ
    112 /* AsciiCode.p */, // ㅔ
    117 /* AsciiCode.u */, // ㅕ
    80 /* AsciiCode.P */, // ㅖ
    104 /* AsciiCode.h */, // ㅗ
    27496 /* AsciiCodeCombo.hk */, // ㅘ
    28520 /* AsciiCodeCombo.ho */, // ㅙ
    27752 /* AsciiCodeCombo.hl */, // ㅚ
    121 /* AsciiCode.y */, // ㅛ
    110 /* AsciiCode.n */, // ㅜ
    27246 /* AsciiCodeCombo.nj */, // ㅝ
    28782 /* AsciiCodeCombo.np */, // ㅞ
    27758 /* AsciiCodeCombo.nl */, // ㅟ
    98 /* AsciiCode.b */, // ㅠ
    109 /* AsciiCode.m */, // ㅡ
    27757 /* AsciiCodeCombo.ml */, // ㅢ
    108 /* AsciiCode.l */, // ㅣ
    // HF: Hangul Filler (everything after this is archaic)
    // ㅥ
    // ㅦ
    // ㅧ
    // ㅨ
    // ㅩ
    // ㅪ
    // ㅫ
    // ㅬ
    // ㅮ
    // ㅯ
    // ㅰ
    // ㅱ
    // ㅲ
    // ㅳ
    // ㅴ
    // ㅵ
    // ㅶ
    // ㅷ
    // ㅸ
    // ㅹ
    // ㅺ
    // ㅻ
    // ㅼ
    // ㅽ
    // ㅾ
    // ㅿ
    // ㆀ
    // ㆁ
    // ㆂ
    // ㆃ
    // ㆄ
    // ㆅ
    // ㆆ
    // ㆇ
    // ㆈ
    // ㆉ
    // ㆊ
    // ㆋ
    // ㆌ
    // ㆍ
    // ㆎ
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia29yZWFuLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9uYXR1cmFsTGFuZ3VhZ2Uva29yZWFuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLGlDQUFpQztBQUVqQzs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUFDLElBQVk7SUFDN0MsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDdEMsSUFBSSxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUNqQyxPQUFPLElBQUksV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQy9CLENBQUM7SUFDRCxPQUFPLFNBQVMsQ0FBQTtBQUNqQixDQUFDO0FBRUQsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUE7QUFDeEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUE7QUFDdEMsU0FBUyxpQkFBaUIsQ0FBQyxJQUFZO0lBQ3RDLGdCQUFnQixHQUFHLENBQUMsQ0FBQTtJQUVwQiwwQkFBMEI7SUFDMUIsaUJBQWlCLENBQUMsSUFBSSxFQUFFLGdCQUFnQixtREFBd0MsQ0FBQTtJQUNoRixJQUFJLGdCQUFnQixHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzFCLE9BQU8sVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRUQsY0FBYztJQUNkLGlCQUFpQixDQUFDLElBQUksRUFBRSxZQUFZLHdDQUE2QixDQUFBO0lBQ2pFLElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDMUIsT0FBTyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO0lBQ2hE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LElBQUk7bUNBQ0osSUFBSTsyQkFDVixJQUFJOzJCQUNKLElBQUk7bUNBQ0UsSUFBSTttQ0FDSixJQUFJO21DQUNKLElBQUk7bUNBQ0osSUFBSTttQ0FDSixJQUFJO21DQUNKLElBQUk7bUNBQ0osSUFBSTswQkFDVixJQUFJOzJCQUNKLElBQUk7bUNBQ0UsSUFBSTsyQkFDVixJQUFJOzBCQUNKLElBQUk7MkJBQ0osSUFBSTsyQkFDSixJQUFJOzBCQUNKLElBQUk7MkJBQ0osSUFBSTsyQkFDSixJQUFJOzJCQUNKLElBQUk7MkJBQ0osSUFBSTtDQUNqQixDQUFDLENBQUE7QUFFRjs7Ozs7Ozs7Ozs7Ozs7OztHQWdCRztBQUNILE1BQU0saUJBQWlCLEdBQUcsSUFBSSxXQUFXLENBQUM7MkJBQzVCLElBQUk7MEJBQ0osSUFBSTttQ0FDRSxJQUFJOzJCQUNWLElBQUk7bUNBQ0UsSUFBSTttQ0FDSixJQUFJOzJCQUNWLElBQUk7MEJBQ0osSUFBSTsyQkFDSixJQUFJO21DQUNFLElBQUk7bUNBQ0osSUFBSTttQ0FDSixJQUFJO21DQUNKLElBQUk7bUNBQ0osSUFBSTttQ0FDSixJQUFJO21DQUNKLElBQUk7MEJBQ1YsSUFBSTsyQkFDSixJQUFJOzBCQUNKLElBQUk7bUNBQ0UsSUFBSTsyQkFDVixJQUFJOzBCQUNKLElBQUk7MkJBQ0osSUFBSTsyQkFDSixJQUFJOzBCQUNKLElBQUk7MEJBQ0osSUFBSTsyQkFDSixJQUFJOzJCQUNKLElBQUk7MkJBQ0osSUFBSTsyQkFDSixJQUFJOzJCQUNKLElBQUk7MkJBQ0osSUFBSTsyQkFDSixJQUFJOzBCQUNKLElBQUk7MkJBQ0osSUFBSTsyQkFDSixJQUFJOzJCQUNKLElBQUk7MEJBQ0osSUFBSTsyQkFDSixJQUFJO21DQUNFLElBQUk7bUNBQ0osSUFBSTttQ0FDSixJQUFJOzJCQUNWLElBQUk7MkJBQ0osSUFBSTttQ0FDRSxJQUFJO21DQUNKLElBQUk7bUNBQ0osSUFBSTswQkFDVixJQUFJOzJCQUNKLElBQUk7bUNBQ0UsSUFBSTsyQkFDVixJQUFJO0lBQ2pCLHVEQUF1RDtJQUN2RCxJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtDQUNKLENBQUMsQ0FBQSJ9