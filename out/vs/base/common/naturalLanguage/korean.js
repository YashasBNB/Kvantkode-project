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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia29yZWFuLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vbmF0dXJhbExhbmd1YWdlL2tvcmVhbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxpQ0FBaUM7QUFFakM7Ozs7Ozs7R0FPRztBQUNILE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxJQUFZO0lBQzdDLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3RDLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDakMsT0FBTyxJQUFJLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQztBQUVELElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFBO0FBQ3hCLE1BQU0sVUFBVSxHQUFHLElBQUksV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0FBQ3RDLFNBQVMsaUJBQWlCLENBQUMsSUFBWTtJQUN0QyxnQkFBZ0IsR0FBRyxDQUFDLENBQUE7SUFFcEIsMEJBQTBCO0lBQzFCLGlCQUFpQixDQUFDLElBQUksRUFBRSxnQkFBZ0IsbURBQXdDLENBQUE7SUFDaEYsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUMxQixPQUFPLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUVELGNBQWM7SUFDZCxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsWUFBWSx3Q0FBNkIsQ0FBQTtJQUNqRSxJQUFJLGdCQUFnQixHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzFCLE9BQU8sVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRUQsd0JBQXdCO0lBQ3hCLGlCQUFpQixDQUFDLElBQUksRUFBRSxxQkFBcUIsaURBQXNDLENBQUE7SUFDbkYsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUMxQixPQUFPLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUVELDRCQUE0QjtJQUM1QixpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLHFEQUF5QyxDQUFBO0lBQ2xGLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztRQUN0QixPQUFPLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUE7SUFDaEQsQ0FBQztJQUVELG1CQUFtQjtJQUNuQixJQUFJLElBQUksSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQ3RDLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxNQUFNLENBQUE7UUFDakMsTUFBTSw2QkFBNkIsR0FBRyxXQUFXLEdBQUcsR0FBRyxDQUFBO1FBRXZELDZCQUE2QjtRQUM3QixNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQyxDQUFBO1FBQzNELDZCQUE2QjtRQUM3QixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLDZCQUE2QixHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQ2pFLDZCQUE2QjtRQUM3Qix3RUFBd0U7UUFDeEUsa0JBQWtCO1FBQ2xCLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyw2QkFBNkIsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFcEUsSUFBSSxxQkFBcUIsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNyRCxpQkFBaUIsQ0FBQyxxQkFBcUIsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM5RCxDQUFDO2FBQU0sSUFDTjtZQUNDLHFCQUFxQjs4REFDaUI7WUFDdkMsaUJBQWlCLENBQUMsTUFBTSxFQUN2QixDQUFDO1lBQ0YsaUJBQWlCLENBQ2hCLG1EQUF3QyxxQkFBcUIsRUFDN0QsaUJBQWlCLHFEQUVqQixDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksVUFBVSxHQUFHLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0QyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9DLENBQUM7YUFBTSxJQUNOLHdDQUE2QixVQUFVLHFEQUF5QztZQUNoRixpQkFBaUIsQ0FBQyxNQUFNLEVBQ3ZCLENBQUM7WUFDRixpQkFBaUIsQ0FDaEIsd0NBQTZCLFVBQVUscURBQXlDLEVBQ2hGLGlCQUFpQixxREFFakIsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUFJLG1CQUFtQixJQUFJLENBQUMsRUFBRSxDQUFDO1lBQzlCLElBQUksbUJBQW1CLEdBQUcscUJBQXFCLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3hELGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2pFLENBQUM7aUJBQU0sSUFDTjtnQkFDQyxtQkFBbUI7a0VBQ21CO2dCQUN2QyxpQkFBaUIsQ0FBQyxNQUFNLEVBQ3ZCLENBQUM7Z0JBQ0YsaUJBQWlCLENBQ2hCO29CQUNDLG1CQUFtQjtzRUFDbUIsRUFDdkMsaUJBQWlCLHFEQUVqQixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLGdCQUFnQixHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUNoRCxDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sU0FBUyxDQUFBO0FBQ2pCLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLElBQVksRUFBRSxLQUF3QixFQUFFLGVBQXVCO0lBQ3pGLDhDQUE4QztJQUM5QyxJQUFJLElBQUksSUFBSSxlQUFlLElBQUksSUFBSSxHQUFHLGVBQWUsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDdEUsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFBO0lBQ2hELENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxLQUFhO0lBQ3RDLDJFQUEyRTtJQUMzRSxlQUFlO0lBQ2YsSUFBSSxLQUFLLDBCQUFrQixFQUFFLENBQUM7UUFDN0IsT0FBTTtJQUNQLENBQUM7SUFDRCxvRkFBb0Y7SUFDcEYsVUFBVSxDQUFDLGdCQUFnQixFQUFFLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFBO0lBQzdDLElBQUksS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ2hCLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFBO0lBQ3JELENBQUM7SUFDRCxJQUFJLEtBQUssSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUNqQixVQUFVLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQTtJQUN0RCxDQUFDO0FBQ0YsQ0FBQztBQUVELElBQVcsb0JBS1Y7QUFMRCxXQUFXLG9CQUFvQjtJQUM5QiwwRkFBeUIsQ0FBQTtJQUN6QixvRUFBYyxDQUFBO0lBQ2Qsc0ZBQXVCLENBQUE7SUFDdkIsNkZBQTBCLENBQUE7QUFDM0IsQ0FBQyxFQUxVLG9CQUFvQixLQUFwQixvQkFBb0IsUUFLOUI7QUFFRCxJQUFXLFNBc0RWO0FBdERELFdBQVcsU0FBUztJQUNuQix1Q0FBTyxDQUFBO0lBQ1Asb0NBQU0sQ0FBQTtJQUNOLG9DQUFNLENBQUE7SUFDTixvQ0FBTSxDQUFBO0lBQ04sb0NBQU0sQ0FBQTtJQUNOLG9DQUFNLENBQUE7SUFDTixvQ0FBTSxDQUFBO0lBQ04sb0NBQU0sQ0FBQTtJQUNOLG9DQUFNLENBQUE7SUFDTixvQ0FBTSxDQUFBO0lBQ04sb0NBQU0sQ0FBQTtJQUNOLG9DQUFNLENBQUE7SUFDTixvQ0FBTSxDQUFBO0lBQ04sb0NBQU0sQ0FBQTtJQUNOLG9DQUFNLENBQUE7SUFDTixvQ0FBTSxDQUFBO0lBQ04sb0NBQU0sQ0FBQTtJQUNOLG9DQUFNLENBQUE7SUFDTixvQ0FBTSxDQUFBO0lBQ04sb0NBQU0sQ0FBQTtJQUNOLG9DQUFNLENBQUE7SUFDTixvQ0FBTSxDQUFBO0lBQ04sb0NBQU0sQ0FBQTtJQUNOLG9DQUFNLENBQUE7SUFDTixvQ0FBTSxDQUFBO0lBQ04sb0NBQU0sQ0FBQTtJQUNOLG9DQUFNLENBQUE7SUFDTixvQ0FBTSxDQUFBO0lBQ04sb0NBQU0sQ0FBQTtJQUNOLG9DQUFNLENBQUE7SUFDTixxQ0FBTyxDQUFBO0lBQ1AscUNBQU8sQ0FBQTtJQUNQLHFDQUFPLENBQUE7SUFDUCxxQ0FBTyxDQUFBO0lBQ1AscUNBQU8sQ0FBQTtJQUNQLHFDQUFPLENBQUE7SUFDUCxxQ0FBTyxDQUFBO0lBQ1AscUNBQU8sQ0FBQTtJQUNQLHFDQUFPLENBQUE7SUFDUCxxQ0FBTyxDQUFBO0lBQ1AscUNBQU8sQ0FBQTtJQUNQLHFDQUFPLENBQUE7SUFDUCxxQ0FBTyxDQUFBO0lBQ1AscUNBQU8sQ0FBQTtJQUNQLHFDQUFPLENBQUE7SUFDUCxxQ0FBTyxDQUFBO0lBQ1AscUNBQU8sQ0FBQTtJQUNQLHFDQUFPLENBQUE7SUFDUCxxQ0FBTyxDQUFBO0lBQ1AscUNBQU8sQ0FBQTtJQUNQLHFDQUFPLENBQUE7SUFDUCxxQ0FBTyxDQUFBO0lBQ1AscUNBQU8sQ0FBQTtBQUNSLENBQUMsRUF0RFUsU0FBUyxLQUFULFNBQVMsUUFzRG5CO0FBRUQ7OztHQUdHO0FBQ0gsSUFBVyxjQW1CVjtBQW5CRCxXQUFXLGNBQWM7SUFDeEIsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7SUFDckMsbURBQXFDLENBQUE7QUFDdEMsQ0FBQyxFQW5CVSxjQUFjLEtBQWQsY0FBYyxRQW1CeEI7QUFFRDs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLGdCQUFnQixHQUFHLElBQUksVUFBVSxDQUFDOzJCQUMxQixJQUFJOzBCQUNKLElBQUk7MkJBQ0osSUFBSTsyQkFDSixJQUFJOzBCQUNKLElBQUk7MkJBQ0osSUFBSTswQkFDSixJQUFJOzJCQUNKLElBQUk7MEJBQ0osSUFBSTsyQkFDSixJQUFJOzBCQUNKLElBQUk7MkJBQ0osSUFBSTsyQkFDSixJQUFJOzBCQUNKLElBQUk7MEJBQ0osSUFBSTsyQkFDSixJQUFJOzJCQUNKLElBQUk7MkJBQ0osSUFBSTsyQkFDSixJQUFJO0NBQ2pCLENBQUMsQ0FBQTtBQUVGOzs7Ozs7Ozs7R0FTRztBQUNILE1BQU0sWUFBWSxHQUFHLElBQUksV0FBVyxDQUFDOzJCQUN2QixRQUFROzJCQUNSLFFBQVE7MkJBQ1IsUUFBUTswQkFDUixRQUFROzJCQUNSLFFBQVE7MkJBQ1IsUUFBUTsyQkFDUixRQUFROzBCQUNSLFFBQVE7MkJBQ1IsUUFBUTttQ0FDRixRQUFRO21DQUNSLFFBQVE7bUNBQ1IsUUFBUTsyQkFDZCxRQUFROzJCQUNSLFFBQVE7bUNBQ0YsUUFBUTttQ0FDUixRQUFRO21DQUNSLFFBQVE7MEJBQ2QsUUFBUTsyQkFDUixRQUFRO21DQUNGLFFBQVE7MkJBQ2QsUUFBUTtDQUNyQixDQUFDLENBQUE7QUFFRjs7Ozs7Ozs7OztHQVVHO0FBQ0gsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLFdBQVcsQ0FBQzsyQkFDaEMsSUFBSTswQkFDSixJQUFJO21DQUNFLElBQUk7MkJBQ1YsSUFBSTttQ0FDRSxJQUFJO21DQUNKLElBQUk7MkJBQ1YsSUFBSTsyQkFDSixJQUFJO21DQUNFLElBQUk7bUNBQ0osSUFBSTttQ0FDSixJQUFJO21DQUNKLElBQUk7bUNBQ0osSUFBSTttQ0FDSixJQUFJO21DQUNKLElBQUk7MEJBQ1YsSUFBSTsyQkFDSixJQUFJO21DQUNFLElBQUk7MkJBQ1YsSUFBSTswQkFDSixJQUFJOzJCQUNKLElBQUk7MkJBQ0osSUFBSTswQkFDSixJQUFJOzJCQUNKLElBQUk7MkJBQ0osSUFBSTsyQkFDSixJQUFJOzJCQUNKLElBQUk7Q0FDakIsQ0FBQyxDQUFBO0FBRUY7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7QUFDSCxNQUFNLGlCQUFpQixHQUFHLElBQUksV0FBVyxDQUFDOzJCQUM1QixJQUFJOzBCQUNKLElBQUk7bUNBQ0UsSUFBSTsyQkFDVixJQUFJO21DQUNFLElBQUk7bUNBQ0osSUFBSTsyQkFDVixJQUFJOzBCQUNKLElBQUk7MkJBQ0osSUFBSTttQ0FDRSxJQUFJO21DQUNKLElBQUk7bUNBQ0osSUFBSTttQ0FDSixJQUFJO21DQUNKLElBQUk7bUNBQ0osSUFBSTttQ0FDSixJQUFJOzBCQUNWLElBQUk7MkJBQ0osSUFBSTswQkFDSixJQUFJO21DQUNFLElBQUk7MkJBQ1YsSUFBSTswQkFDSixJQUFJOzJCQUNKLElBQUk7MkJBQ0osSUFBSTswQkFDSixJQUFJOzBCQUNKLElBQUk7MkJBQ0osSUFBSTsyQkFDSixJQUFJOzJCQUNKLElBQUk7MkJBQ0osSUFBSTsyQkFDSixJQUFJOzJCQUNKLElBQUk7MkJBQ0osSUFBSTswQkFDSixJQUFJOzJCQUNKLElBQUk7MkJBQ0osSUFBSTsyQkFDSixJQUFJOzBCQUNKLElBQUk7MkJBQ0osSUFBSTttQ0FDRSxJQUFJO21DQUNKLElBQUk7bUNBQ0osSUFBSTsyQkFDVixJQUFJOzJCQUNKLElBQUk7bUNBQ0UsSUFBSTttQ0FDSixJQUFJO21DQUNKLElBQUk7MEJBQ1YsSUFBSTsyQkFDSixJQUFJO21DQUNFLElBQUk7MkJBQ1YsSUFBSTtJQUNqQix1REFBdUQ7SUFDdkQsSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7Q0FDSixDQUFDLENBQUEifQ==