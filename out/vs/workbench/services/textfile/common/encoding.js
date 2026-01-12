/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { newWriteableStream, listenStream, } from '../../../../base/common/stream.js';
import { VSBuffer, } from '../../../../base/common/buffer.js';
import { importAMDNodeModule } from '../../../../amdX.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { coalesce } from '../../../../base/common/arrays.js';
export const UTF8 = 'utf8';
export const UTF8_with_bom = 'utf8bom';
export const UTF16be = 'utf16be';
export const UTF16le = 'utf16le';
export function isUTFEncoding(encoding) {
    return [UTF8, UTF8_with_bom, UTF16be, UTF16le].some((utfEncoding) => utfEncoding === encoding);
}
export const UTF16be_BOM = [0xfe, 0xff];
export const UTF16le_BOM = [0xff, 0xfe];
export const UTF8_BOM = [0xef, 0xbb, 0xbf];
const ZERO_BYTE_DETECTION_BUFFER_MAX_LEN = 512; // number of bytes to look at to decide about a file being binary or not
const NO_ENCODING_GUESS_MIN_BYTES = 512; // when not auto guessing the encoding, small number of bytes are enough
const AUTO_ENCODING_GUESS_MIN_BYTES = 512 * 8; // with auto guessing we want a lot more content to be read for guessing
const AUTO_ENCODING_GUESS_MAX_BYTES = 512 * 128; // set an upper limit for the number of bytes we pass on to jschardet
export var DecodeStreamErrorKind;
(function (DecodeStreamErrorKind) {
    /**
     * Error indicating that the stream is binary even
     * though `acceptTextOnly` was specified.
     */
    DecodeStreamErrorKind[DecodeStreamErrorKind["STREAM_IS_BINARY"] = 1] = "STREAM_IS_BINARY";
})(DecodeStreamErrorKind || (DecodeStreamErrorKind = {}));
export class DecodeStreamError extends Error {
    constructor(message, decodeStreamErrorKind) {
        super(message);
        this.decodeStreamErrorKind = decodeStreamErrorKind;
    }
}
class DecoderStream {
    /**
     * This stream will only load iconv-lite lazily if the encoding
     * is not UTF-8. This ensures that for most common cases we do
     * not pay the price of loading the module from disk.
     *
     * We still need to be careful when converting UTF-8 to a string
     * though because we read the file in chunks of Buffer and thus
     * need to decode it via TextDecoder helper that is available
     * in browser and node.js environments.
     */
    static async create(encoding) {
        let decoder = undefined;
        if (encoding !== UTF8) {
            const iconv = await importAMDNodeModule('@vscode/iconv-lite-umd', 'lib/iconv-lite-umd.js');
            decoder = iconv.getDecoder(toNodeEncoding(encoding));
        }
        else {
            const utf8TextDecoder = new TextDecoder();
            decoder = {
                write(buffer) {
                    return utf8TextDecoder.decode(buffer, {
                        // Signal to TextDecoder that potentially more data is coming
                        // and that we are calling `decode` in the end to consume any
                        // remainders
                        stream: true,
                    });
                },
                end() {
                    return utf8TextDecoder.decode();
                },
            };
        }
        return new DecoderStream(decoder);
    }
    constructor(iconvLiteDecoder) {
        this.iconvLiteDecoder = iconvLiteDecoder;
    }
    write(buffer) {
        return this.iconvLiteDecoder.write(buffer);
    }
    end() {
        return this.iconvLiteDecoder.end();
    }
}
export function toDecodeStream(source, options) {
    const minBytesRequiredForDetection = (options.minBytesRequiredForDetection ?? options.guessEncoding)
        ? AUTO_ENCODING_GUESS_MIN_BYTES
        : NO_ENCODING_GUESS_MIN_BYTES;
    return new Promise((resolve, reject) => {
        const target = newWriteableStream((strings) => strings.join(''));
        const bufferedChunks = [];
        let bytesBuffered = 0;
        let decoder = undefined;
        const cts = new CancellationTokenSource();
        const createDecoder = async () => {
            try {
                // detect encoding from buffer
                const detected = await detectEncodingFromBuffer({
                    buffer: VSBuffer.concat(bufferedChunks),
                    bytesRead: bytesBuffered,
                }, options.guessEncoding, options.candidateGuessEncodings);
                // throw early if the source seems binary and
                // we are instructed to only accept text
                if (detected.seemsBinary && options.acceptTextOnly) {
                    throw new DecodeStreamError('Stream is binary but only text is accepted for decoding', 1 /* DecodeStreamErrorKind.STREAM_IS_BINARY */);
                }
                // ensure to respect overwrite of encoding
                detected.encoding = await options.overwriteEncoding(detected.encoding);
                // decode and write buffered content
                decoder = await DecoderStream.create(detected.encoding);
                const decoded = decoder.write(VSBuffer.concat(bufferedChunks).buffer);
                target.write(decoded);
                bufferedChunks.length = 0;
                bytesBuffered = 0;
                // signal to the outside our detected encoding and final decoder stream
                resolve({
                    stream: target,
                    detected,
                });
            }
            catch (error) {
                // Stop handling anything from the source and target
                cts.cancel();
                target.destroy();
                reject(error);
            }
        };
        listenStream(source, {
            onData: async (chunk) => {
                // if the decoder is ready, we just write directly
                if (decoder) {
                    target.write(decoder.write(chunk.buffer));
                }
                // otherwise we need to buffer the data until the stream is ready
                else {
                    bufferedChunks.push(chunk);
                    bytesBuffered += chunk.byteLength;
                    // buffered enough data for encoding detection, create stream
                    if (bytesBuffered >= minBytesRequiredForDetection) {
                        // pause stream here until the decoder is ready
                        source.pause();
                        await createDecoder();
                        // resume stream now that decoder is ready but
                        // outside of this stack to reduce recursion
                        setTimeout(() => source.resume());
                    }
                }
            },
            onError: (error) => target.error(error), // simply forward to target
            onEnd: async () => {
                // we were still waiting for data to do the encoding
                // detection. thus, wrap up starting the stream even
                // without all the data to get things going
                if (!decoder) {
                    await createDecoder();
                }
                // end the target with the remainders of the decoder
                target.end(decoder?.end());
            },
        }, cts.token);
    });
}
export async function toEncodeReadable(readable, encoding, options) {
    const iconv = await importAMDNodeModule('@vscode/iconv-lite-umd', 'lib/iconv-lite-umd.js');
    const encoder = iconv.getEncoder(toNodeEncoding(encoding), options);
    let bytesWritten = false;
    let done = false;
    return {
        read() {
            if (done) {
                return null;
            }
            const chunk = readable.read();
            if (typeof chunk !== 'string') {
                done = true;
                // If we are instructed to add a BOM but we detect that no
                // bytes have been written, we must ensure to return the BOM
                // ourselves so that we comply with the contract.
                if (!bytesWritten && options?.addBOM) {
                    switch (encoding) {
                        case UTF8:
                        case UTF8_with_bom:
                            return VSBuffer.wrap(Uint8Array.from(UTF8_BOM));
                        case UTF16be:
                            return VSBuffer.wrap(Uint8Array.from(UTF16be_BOM));
                        case UTF16le:
                            return VSBuffer.wrap(Uint8Array.from(UTF16le_BOM));
                    }
                }
                const leftovers = encoder.end();
                if (leftovers && leftovers.length > 0) {
                    bytesWritten = true;
                    return VSBuffer.wrap(leftovers);
                }
                return null;
            }
            bytesWritten = true;
            return VSBuffer.wrap(encoder.write(chunk));
        },
    };
}
export async function encodingExists(encoding) {
    const iconv = await importAMDNodeModule('@vscode/iconv-lite-umd', 'lib/iconv-lite-umd.js');
    return iconv.encodingExists(toNodeEncoding(encoding));
}
export function toNodeEncoding(enc) {
    if (enc === UTF8_with_bom || enc === null) {
        return UTF8; // iconv does not distinguish UTF 8 with or without BOM, so we need to help it
    }
    return enc;
}
export function detectEncodingByBOMFromBuffer(buffer, bytesRead) {
    if (!buffer || bytesRead < UTF16be_BOM.length) {
        return null;
    }
    const b0 = buffer.readUInt8(0);
    const b1 = buffer.readUInt8(1);
    // UTF-16 BE
    if (b0 === UTF16be_BOM[0] && b1 === UTF16be_BOM[1]) {
        return UTF16be;
    }
    // UTF-16 LE
    if (b0 === UTF16le_BOM[0] && b1 === UTF16le_BOM[1]) {
        return UTF16le;
    }
    if (bytesRead < UTF8_BOM.length) {
        return null;
    }
    const b2 = buffer.readUInt8(2);
    // UTF-8
    if (b0 === UTF8_BOM[0] && b1 === UTF8_BOM[1] && b2 === UTF8_BOM[2]) {
        return UTF8_with_bom;
    }
    return null;
}
// we explicitly ignore a specific set of encodings from auto guessing
// - ASCII: we never want this encoding (most UTF-8 files would happily detect as
//          ASCII files and then you could not type non-ASCII characters anymore)
// - UTF-16: we have our own detection logic for UTF-16
// - UTF-32: we do not support this encoding in VSCode
const IGNORE_ENCODINGS = ['ascii', 'utf-16', 'utf-32'];
/**
 * Guesses the encoding from buffer.
 */
async function guessEncodingByBuffer(buffer, candidateGuessEncodings) {
    const jschardet = await importAMDNodeModule('jschardet', 'dist/jschardet.min.js');
    // ensure to limit buffer for guessing due to https://github.com/aadsm/jschardet/issues/53
    const limitedBuffer = buffer.slice(0, AUTO_ENCODING_GUESS_MAX_BYTES);
    // before guessing jschardet calls toString('binary') on input if it is a Buffer,
    // since we are using it inside browser environment as well we do conversion ourselves
    // https://github.com/aadsm/jschardet/blob/v2.1.1/src/index.js#L36-L40
    const binaryString = encodeLatin1(limitedBuffer.buffer);
    // ensure to convert candidate encodings to jschardet encoding names if provided
    if (candidateGuessEncodings) {
        candidateGuessEncodings = coalesce(candidateGuessEncodings.map((e) => toJschardetEncoding(e)));
        if (candidateGuessEncodings.length === 0) {
            candidateGuessEncodings = undefined;
        }
    }
    let guessed;
    try {
        guessed = jschardet.detect(binaryString, candidateGuessEncodings ? { detectEncodings: candidateGuessEncodings } : undefined);
    }
    catch (error) {
        return null; // jschardet throws for unknown encodings (https://github.com/microsoft/vscode/issues/239928)
    }
    if (!guessed || !guessed.encoding) {
        return null;
    }
    const enc = guessed.encoding.toLowerCase();
    if (0 <= IGNORE_ENCODINGS.indexOf(enc)) {
        return null; // see comment above why we ignore some encodings
    }
    return toIconvLiteEncoding(guessed.encoding);
}
const JSCHARDET_TO_ICONV_ENCODINGS = {
    ibm866: 'cp866',
    big5: 'cp950',
};
function normalizeEncoding(encodingName) {
    return encodingName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}
function toIconvLiteEncoding(encodingName) {
    const normalizedEncodingName = normalizeEncoding(encodingName);
    const mapped = JSCHARDET_TO_ICONV_ENCODINGS[normalizedEncodingName];
    return mapped || normalizedEncodingName;
}
function toJschardetEncoding(encodingName) {
    const normalizedEncodingName = normalizeEncoding(encodingName);
    const mapped = GUESSABLE_ENCODINGS[normalizedEncodingName];
    return mapped ? mapped.guessableName : undefined;
}
function encodeLatin1(buffer) {
    let result = '';
    for (let i = 0; i < buffer.length; i++) {
        result += String.fromCharCode(buffer[i]);
    }
    return result;
}
/**
 * The encodings that are allowed in a settings file don't match the canonical encoding labels specified by WHATWG.
 * See https://encoding.spec.whatwg.org/#names-and-labels
 * Iconv-lite strips all non-alphanumeric characters, but ripgrep doesn't. For backcompat, allow these labels.
 */
export function toCanonicalName(enc) {
    switch (enc) {
        case 'shiftjis':
            return 'shift-jis';
        case 'utf16le':
            return 'utf-16le';
        case 'utf16be':
            return 'utf-16be';
        case 'big5hkscs':
            return 'big5-hkscs';
        case 'eucjp':
            return 'euc-jp';
        case 'euckr':
            return 'euc-kr';
        case 'koi8r':
            return 'koi8-r';
        case 'koi8u':
            return 'koi8-u';
        case 'macroman':
            return 'x-mac-roman';
        case 'utf8bom':
            return 'utf8';
        default: {
            const m = enc.match(/windows(\d+)/);
            if (m) {
                return 'windows-' + m[1];
            }
            return enc;
        }
    }
}
export function detectEncodingFromBuffer({ buffer, bytesRead }, autoGuessEncoding, candidateGuessEncodings) {
    // Always first check for BOM to find out about encoding
    let encoding = detectEncodingByBOMFromBuffer(buffer, bytesRead);
    // Detect 0 bytes to see if file is binary or UTF-16 LE/BE
    // unless we already know that this file has a UTF-16 encoding
    let seemsBinary = false;
    if (encoding !== UTF16be && encoding !== UTF16le && buffer) {
        let couldBeUTF16LE = true; // e.g. 0xAA 0x00
        let couldBeUTF16BE = true; // e.g. 0x00 0xAA
        let containsZeroByte = false;
        // This is a simplified guess to detect UTF-16 BE or LE by just checking if
        // the first 512 bytes have the 0-byte at a specific location. For UTF-16 LE
        // this would be the odd byte index and for UTF-16 BE the even one.
        // Note: this can produce false positives (a binary file that uses a 2-byte
        // encoding of the same format as UTF-16) and false negatives (a UTF-16 file
        // that is using 4 bytes to encode a character).
        for (let i = 0; i < bytesRead && i < ZERO_BYTE_DETECTION_BUFFER_MAX_LEN; i++) {
            const isEndian = i % 2 === 1; // assume 2-byte sequences typical for UTF-16
            const isZeroByte = buffer.readUInt8(i) === 0;
            if (isZeroByte) {
                containsZeroByte = true;
            }
            // UTF-16 LE: expect e.g. 0xAA 0x00
            if (couldBeUTF16LE && ((isEndian && !isZeroByte) || (!isEndian && isZeroByte))) {
                couldBeUTF16LE = false;
            }
            // UTF-16 BE: expect e.g. 0x00 0xAA
            if (couldBeUTF16BE && ((isEndian && isZeroByte) || (!isEndian && !isZeroByte))) {
                couldBeUTF16BE = false;
            }
            // Return if this is neither UTF16-LE nor UTF16-BE and thus treat as binary
            if (isZeroByte && !couldBeUTF16LE && !couldBeUTF16BE) {
                break;
            }
        }
        // Handle case of 0-byte included
        if (containsZeroByte) {
            if (couldBeUTF16LE) {
                encoding = UTF16le;
            }
            else if (couldBeUTF16BE) {
                encoding = UTF16be;
            }
            else {
                seemsBinary = true;
            }
        }
    }
    // Auto guess encoding if configured
    if (autoGuessEncoding && !seemsBinary && !encoding && buffer) {
        return guessEncodingByBuffer(buffer.slice(0, bytesRead), candidateGuessEncodings).then((guessedEncoding) => {
            return {
                seemsBinary: false,
                encoding: guessedEncoding,
            };
        });
    }
    return { seemsBinary, encoding };
}
export const SUPPORTED_ENCODINGS = {
    utf8: {
        labelLong: 'UTF-8',
        labelShort: 'UTF-8',
        order: 1,
        alias: 'utf8bom',
        guessableName: 'UTF-8',
    },
    utf8bom: {
        labelLong: 'UTF-8 with BOM',
        labelShort: 'UTF-8 with BOM',
        encodeOnly: true,
        order: 2,
        alias: 'utf8',
    },
    utf16le: {
        labelLong: 'UTF-16 LE',
        labelShort: 'UTF-16 LE',
        order: 3,
        guessableName: 'UTF-16LE',
    },
    utf16be: {
        labelLong: 'UTF-16 BE',
        labelShort: 'UTF-16 BE',
        order: 4,
        guessableName: 'UTF-16BE',
    },
    windows1252: {
        labelLong: 'Western (Windows 1252)',
        labelShort: 'Windows 1252',
        order: 5,
        guessableName: 'windows-1252',
    },
    iso88591: {
        labelLong: 'Western (ISO 8859-1)',
        labelShort: 'ISO 8859-1',
        order: 6,
    },
    iso88593: {
        labelLong: 'Western (ISO 8859-3)',
        labelShort: 'ISO 8859-3',
        order: 7,
    },
    iso885915: {
        labelLong: 'Western (ISO 8859-15)',
        labelShort: 'ISO 8859-15',
        order: 8,
    },
    macroman: {
        labelLong: 'Western (Mac Roman)',
        labelShort: 'Mac Roman',
        order: 9,
    },
    cp437: {
        labelLong: 'DOS (CP 437)',
        labelShort: 'CP437',
        order: 10,
    },
    windows1256: {
        labelLong: 'Arabic (Windows 1256)',
        labelShort: 'Windows 1256',
        order: 11,
    },
    iso88596: {
        labelLong: 'Arabic (ISO 8859-6)',
        labelShort: 'ISO 8859-6',
        order: 12,
    },
    windows1257: {
        labelLong: 'Baltic (Windows 1257)',
        labelShort: 'Windows 1257',
        order: 13,
    },
    iso88594: {
        labelLong: 'Baltic (ISO 8859-4)',
        labelShort: 'ISO 8859-4',
        order: 14,
    },
    iso885914: {
        labelLong: 'Celtic (ISO 8859-14)',
        labelShort: 'ISO 8859-14',
        order: 15,
    },
    windows1250: {
        labelLong: 'Central European (Windows 1250)',
        labelShort: 'Windows 1250',
        order: 16,
        guessableName: 'windows-1250',
    },
    iso88592: {
        labelLong: 'Central European (ISO 8859-2)',
        labelShort: 'ISO 8859-2',
        order: 17,
        guessableName: 'ISO-8859-2',
    },
    cp852: {
        labelLong: 'Central European (CP 852)',
        labelShort: 'CP 852',
        order: 18,
    },
    windows1251: {
        labelLong: 'Cyrillic (Windows 1251)',
        labelShort: 'Windows 1251',
        order: 19,
        guessableName: 'windows-1251',
    },
    cp866: {
        labelLong: 'Cyrillic (CP 866)',
        labelShort: 'CP 866',
        order: 20,
        guessableName: 'IBM866',
    },
    cp1125: {
        labelLong: 'Cyrillic (CP 1125)',
        labelShort: 'CP 1125',
        order: 21,
        guessableName: 'IBM1125',
    },
    iso88595: {
        labelLong: 'Cyrillic (ISO 8859-5)',
        labelShort: 'ISO 8859-5',
        order: 22,
        guessableName: 'ISO-8859-5',
    },
    koi8r: {
        labelLong: 'Cyrillic (KOI8-R)',
        labelShort: 'KOI8-R',
        order: 23,
        guessableName: 'KOI8-R',
    },
    koi8u: {
        labelLong: 'Cyrillic (KOI8-U)',
        labelShort: 'KOI8-U',
        order: 24,
    },
    iso885913: {
        labelLong: 'Estonian (ISO 8859-13)',
        labelShort: 'ISO 8859-13',
        order: 25,
    },
    windows1253: {
        labelLong: 'Greek (Windows 1253)',
        labelShort: 'Windows 1253',
        order: 26,
        guessableName: 'windows-1253',
    },
    iso88597: {
        labelLong: 'Greek (ISO 8859-7)',
        labelShort: 'ISO 8859-7',
        order: 27,
        guessableName: 'ISO-8859-7',
    },
    windows1255: {
        labelLong: 'Hebrew (Windows 1255)',
        labelShort: 'Windows 1255',
        order: 28,
        guessableName: 'windows-1255',
    },
    iso88598: {
        labelLong: 'Hebrew (ISO 8859-8)',
        labelShort: 'ISO 8859-8',
        order: 29,
        guessableName: 'ISO-8859-8',
    },
    iso885910: {
        labelLong: 'Nordic (ISO 8859-10)',
        labelShort: 'ISO 8859-10',
        order: 30,
    },
    iso885916: {
        labelLong: 'Romanian (ISO 8859-16)',
        labelShort: 'ISO 8859-16',
        order: 31,
    },
    windows1254: {
        labelLong: 'Turkish (Windows 1254)',
        labelShort: 'Windows 1254',
        order: 32,
    },
    iso88599: {
        labelLong: 'Turkish (ISO 8859-9)',
        labelShort: 'ISO 8859-9',
        order: 33,
    },
    windows1258: {
        labelLong: 'Vietnamese (Windows 1258)',
        labelShort: 'Windows 1258',
        order: 34,
    },
    gbk: {
        labelLong: 'Simplified Chinese (GBK)',
        labelShort: 'GBK',
        order: 35,
    },
    gb18030: {
        labelLong: 'Simplified Chinese (GB18030)',
        labelShort: 'GB18030',
        order: 36,
    },
    cp950: {
        labelLong: 'Traditional Chinese (Big5)',
        labelShort: 'Big5',
        order: 37,
        guessableName: 'Big5',
    },
    big5hkscs: {
        labelLong: 'Traditional Chinese (Big5-HKSCS)',
        labelShort: 'Big5-HKSCS',
        order: 38,
    },
    shiftjis: {
        labelLong: 'Japanese (Shift JIS)',
        labelShort: 'Shift JIS',
        order: 39,
        guessableName: 'SHIFT_JIS',
    },
    eucjp: {
        labelLong: 'Japanese (EUC-JP)',
        labelShort: 'EUC-JP',
        order: 40,
        guessableName: 'EUC-JP',
    },
    euckr: {
        labelLong: 'Korean (EUC-KR)',
        labelShort: 'EUC-KR',
        order: 41,
        guessableName: 'EUC-KR',
    },
    windows874: {
        labelLong: 'Thai (Windows 874)',
        labelShort: 'Windows 874',
        order: 42,
    },
    iso885911: {
        labelLong: 'Latin/Thai (ISO 8859-11)',
        labelShort: 'ISO 8859-11',
        order: 43,
    },
    koi8ru: {
        labelLong: 'Cyrillic (KOI8-RU)',
        labelShort: 'KOI8-RU',
        order: 44,
    },
    koi8t: {
        labelLong: 'Tajik (KOI8-T)',
        labelShort: 'KOI8-T',
        order: 45,
    },
    gb2312: {
        labelLong: 'Simplified Chinese (GB 2312)',
        labelShort: 'GB 2312',
        order: 46,
        guessableName: 'GB2312',
    },
    cp865: {
        labelLong: 'Nordic DOS (CP 865)',
        labelShort: 'CP 865',
        order: 47,
    },
    cp850: {
        labelLong: 'Western European DOS (CP 850)',
        labelShort: 'CP 850',
        order: 48,
    },
};
export const GUESSABLE_ENCODINGS = (() => {
    const guessableEncodings = {};
    for (const encoding in SUPPORTED_ENCODINGS) {
        if (SUPPORTED_ENCODINGS[encoding].guessableName) {
            guessableEncodings[encoding] = SUPPORTED_ENCODINGS[encoding];
        }
    }
    return guessableEncodings;
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jb2RpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS9jb21tb24vZW5jb2RpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUdOLGtCQUFrQixFQUNsQixZQUFZLEdBQ1osTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQ04sUUFBUSxHQUdSLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDekQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTVELE1BQU0sQ0FBQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUE7QUFDMUIsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQTtBQUN0QyxNQUFNLENBQUMsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFBO0FBQ2hDLE1BQU0sQ0FBQyxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUE7QUFJaEMsTUFBTSxVQUFVLGFBQWEsQ0FBQyxRQUFnQjtJQUM3QyxPQUFPLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxXQUFXLEtBQUssUUFBUSxDQUFDLENBQUE7QUFDL0YsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUN2QyxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDdkMsTUFBTSxDQUFDLE1B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