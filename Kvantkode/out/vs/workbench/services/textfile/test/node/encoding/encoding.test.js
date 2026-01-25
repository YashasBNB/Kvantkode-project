/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as fs from 'fs';
import * as encoding from '../../../common/encoding.js';
import * as streams from '../../../../../../base/common/stream.js';
import { newWriteableBufferStream, VSBuffer, streamToBufferReadableStream, } from '../../../../../../base/common/buffer.js';
import { splitLines } from '../../../../../../base/common/strings.js';
import { FileAccess } from '../../../../../../base/common/network.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
export async function detectEncodingByBOM(file) {
    try {
        const { buffer, bytesRead } = await readExactlyByFile(file, 3);
        return encoding.detectEncodingByBOMFromBuffer(buffer, bytesRead);
    }
    catch (error) {
        return null; // ignore errors (like file not found)
    }
}
function readExactlyByFile(file, totalBytes) {
    return new Promise((resolve, reject) => {
        fs.open(file, 'r', null, (err, fd) => {
            if (err) {
                return reject(err);
            }
            function end(err, resultBuffer, bytesRead) {
                fs.close(fd, (closeError) => {
                    if (closeError) {
                        return reject(closeError);
                    }
                    if (err && err.code === 'EISDIR') {
                        return reject(err); // we want to bubble this error up (file is actually a folder)
                    }
                    return resolve({ buffer: resultBuffer ? VSBuffer.wrap(resultBuffer) : null, bytesRead });
                });
            }
            const buffer = Buffer.allocUnsafe(totalBytes);
            let offset = 0;
            function readChunk() {
                fs.read(fd, buffer, offset, totalBytes - offset, null, (err, bytesRead) => {
                    if (err) {
                        return end(err, null, 0);
                    }
                    if (bytesRead === 0) {
                        return end(null, buffer, offset);
                    }
                    offset += bytesRead;
                    if (offset === totalBytes) {
                        return end(null, buffer, offset);
                    }
                    return readChunk();
                });
            }
            readChunk();
        });
    });
}
suite('Encoding', () => {
    test('detectBOM does not return error for non existing file', async () => {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/not-exist.css').fsPath;
        const detectedEncoding = await detectEncodingByBOM(file);
        assert.strictEqual(detectedEncoding, null);
    });
    test('detectBOM UTF-8', async () => {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_utf8.css').fsPath;
        const detectedEncoding = await detectEncodingByBOM(file);
        assert.strictEqual(detectedEncoding, 'utf8bom');
    });
    test('detectBOM UTF-16 LE', async () => {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_utf16le.css').fsPath;
        const detectedEncoding = await detectEncodingByBOM(file);
        assert.strictEqual(detectedEncoding, 'utf16le');
    });
    test('detectBOM UTF-16 BE', async () => {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_utf16be.css').fsPath;
        const detectedEncoding = await detectEncodingByBOM(file);
        assert.strictEqual(detectedEncoding, 'utf16be');
    });
    test('detectBOM ANSI', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_ansi.css').fsPath;
        const detectedEncoding = await detectEncodingByBOM(file);
        assert.strictEqual(detectedEncoding, null);
    });
    test('detectBOM ANSI (2)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/empty.txt').fsPath;
        const detectedEncoding = await detectEncodingByBOM(file);
        assert.strictEqual(detectedEncoding, null);
    });
    test('detectEncodingFromBuffer (JSON saved as PNG)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.json.png').fsPath;
        const buffer = await readExactlyByFile(file, 512);
        const mimes = encoding.detectEncodingFromBuffer(buffer);
        assert.strictEqual(mimes.seemsBinary, false);
    });
    test('detectEncodingFromBuffer (PNG saved as TXT)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.png.txt').fsPath;
        const buffer = await readExactlyByFile(file, 512);
        const mimes = encoding.detectEncodingFromBuffer(buffer);
        assert.strictEqual(mimes.seemsBinary, true);
    });
    test('detectEncodingFromBuffer (XML saved as PNG)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.xml.png').fsPath;
        const buffer = await readExactlyByFile(file, 512);
        const mimes = encoding.detectEncodingFromBuffer(buffer);
        assert.strictEqual(mimes.seemsBinary, false);
    });
    test('detectEncodingFromBuffer (QWOFF saved as TXT)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.qwoff.txt').fsPath;
        const buffer = await readExactlyByFile(file, 512);
        const mimes = encoding.detectEncodingFromBuffer(buffer);
        assert.strictEqual(mimes.seemsBinary, true);
    });
    test('detectEncodingFromBuffer (CSS saved as QWOFF)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.css.qwoff').fsPath;
        const buffer = await readExactlyByFile(file, 512);
        const mimes = encoding.detectEncodingFromBuffer(buffer);
        assert.strictEqual(mimes.seemsBinary, false);
    });
    test('detectEncodingFromBuffer (PDF)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.pdf').fsPath;
        const buffer = await readExactlyByFile(file, 512);
        const mimes = encoding.detectEncodingFromBuffer(buffer);
        assert.strictEqual(mimes.seemsBinary, true);
    });
    test('detectEncodingFromBuffer (guess UTF-16 LE from content without BOM)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/utf16_le_nobom.txt').fsPath;
        const buffer = await readExactlyByFile(file, 512);
        const mimes = encoding.detectEncodingFromBuffer(buffer);
        assert.strictEqual(mimes.encoding, encoding.UTF16le);
        assert.strictEqual(mimes.seemsBinary, false);
    });
    test('detectEncodingFromBuffer (guess UTF-16 BE from content without BOM)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/utf16_be_nobom.txt').fsPath;
        const buffer = await readExactlyByFile(file, 512);
        const mimes = encoding.detectEncodingFromBuffer(buffer);
        assert.strictEqual(mimes.encoding, encoding.UTF16be);
        assert.strictEqual(mimes.seemsBinary, false);
    });
    test('autoGuessEncoding (UTF8)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_file.css').fsPath;
        const buffer = await readExactlyByFile(file, 512 * 8);
        const mimes = await encoding.detectEncodingFromBuffer(buffer, true);
        assert.strictEqual(mimes.encoding, 'utf8');
    });
    test('autoGuessEncoding (ASCII)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_ansi.css').fsPath;
        const buffer = await readExactlyByFile(file, 512 * 8);
        const mimes = await encoding.detectEncodingFromBuffer(buffer, true);
        assert.strictEqual(mimes.encoding, null);
    });
    test('autoGuessEncoding (ShiftJIS)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.shiftjis.txt').fsPath;
        const buffer = await readExactlyByFile(file, 512 * 8);
        const mimes = await encoding.detectEncodingFromBuffer(buffer, true);
        assert.strictEqual(mimes.encoding, 'shiftjis');
    });
    test('autoGuessEncoding (CP1252)', async function () {
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.cp1252.txt').fsPath;
        const buffer = await readExactlyByFile(file, 512 * 8);
        const mimes = await encoding.detectEncodingFromBuffer(buffer, true);
        assert.strictEqual(mimes.encoding, 'windows1252');
    });
    test('autoGuessEncoding (candidateGuessEncodings - ShiftJIS)', async function () {
        // This file is determined to be windows1252 unless candidateDetectEncoding is set.
        const file = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some.shiftjis.1.txt').fsPath;
        const buffer = await readExactlyByFile(file, 512 * 8);
        const mimes = await encoding.detectEncodingFromBuffer(buffer, true, [
            'utf8',
            'shiftjis',
            'eucjp',
        ]);
        assert.strictEqual(mimes.encoding, 'shiftjis');
    });
    async function readAndDecodeFromDisk(path, fileEncoding) {
        return new Promise((resolve, reject) => {
            fs.readFile(path, (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(importAMDNodeModule('@vscode/iconv-lite-umd', 'lib/iconv-lite-umd.js').then((iconv) => iconv.decode(data, encoding.toNodeEncoding(fileEncoding))));
                }
            });
        });
    }
    function newTestReadableStream(buffers) {
        const stream = newWriteableBufferStream();
        buffers.map(VSBuffer.wrap).forEach((buffer) => {
            setTimeout(() => {
                stream.write(buffer);
            });
        });
        setTimeout(() => {
            stream.end();
        });
        return stream;
    }
    async function readAllAsString(stream) {
        return streams.consumeStream(stream, (strings) => strings.join(''));
    }
    test('toDecodeStream - some stream', async function () {
        const source = newTestReadableStream([
            Buffer.from([65, 66, 67]),
            Buffer.from([65, 66, 67]),
            Buffer.from([65, 66, 67]),
        ]);
        const { detected, stream } = await encoding.toDecodeStream(source, {
            acceptTextOnly: true,
            minBytesRequiredForDetection: 4,
            guessEncoding: false,
            candidateGuessEncodings: [],
            overwriteEncoding: async (detected) => detected || encoding.UTF8,
        });
        assert.ok(detected);
        assert.ok(stream);
        const content = await readAllAsString(stream);
        assert.strictEqual(content, 'ABCABCABC');
    });
    test('toDecodeStream - some stream, expect too much data', async function () {
        const source = newTestReadableStream([
            Buffer.from([65, 66, 67]),
            Buffer.from([65, 66, 67]),
            Buffer.from([65, 66, 67]),
        ]);
        const { detected, stream } = await encoding.toDecodeStream(source, {
            acceptTextOnly: true,
            minBytesRequiredForDetection: 64,
            guessEncoding: false,
            candidateGuessEncodings: [],
            overwriteEncoding: async (detected) => detected || encoding.UTF8,
        });
        assert.ok(detected);
        assert.ok(stream);
        const content = await readAllAsString(stream);
        assert.strictEqual(content, 'ABCABCABC');
    });
    test('toDecodeStream - some stream, no data', async function () {
        const source = newWriteableBufferStream();
        source.end();
        const { detected, stream } = await encoding.toDecodeStream(source, {
            acceptTextOnly: true,
            minBytesRequiredForDetection: 512,
            guessEncoding: false,
            candidateGuessEncodings: [],
            overwriteEncoding: async (detected) => detected || encoding.UTF8,
        });
        assert.ok(detected);
        assert.ok(stream);
        const content = await readAllAsString(stream);
        assert.strictEqual(content, '');
    });
    test('toDecodeStream - encoding, utf16be', async function () {
        const path = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_utf16be.css').fsPath;
        const source = streamToBufferReadableStream(fs.createReadStream(path));
        const { detected, stream } = await encoding.toDecodeStream(source, {
            acceptTextOnly: true,
            minBytesRequiredForDetection: 64,
            guessEncoding: false,
            candidateGuessEncodings: [],
            overwriteEncoding: async (detected) => detected || encoding.UTF8,
        });
        assert.strictEqual(detected.encoding, 'utf16be');
        assert.strictEqual(detected.seemsBinary, false);
        const expected = await readAndDecodeFromDisk(path, detected.encoding);
        const actual = await readAllAsString(stream);
        assert.strictEqual(actual, expected);
    });
    test('toDecodeStream - empty file', async function () {
        const path = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/empty.txt').fsPath;
        const source = streamToBufferReadableStream(fs.createReadStream(path));
        const { detected, stream } = await encoding.toDecodeStream(source, {
            acceptTextOnly: true,
            guessEncoding: false,
            candidateGuessEncodings: [],
            overwriteEncoding: async (detected) => detected || encoding.UTF8,
        });
        const expected = await readAndDecodeFromDisk(path, detected.encoding);
        const actual = await readAllAsString(stream);
        assert.strictEqual(actual, expected);
    });
    test('toDecodeStream - decodes buffer entirely', async function () {
        const emojis = Buffer.from('🖥️💻💾');
        const incompleteEmojis = emojis.slice(0, emojis.length - 1);
        const buffers = [];
        for (let i = 0; i < incompleteEmojis.length; i++) {
            buffers.push(incompleteEmojis.slice(i, i + 1));
        }
        const source = newTestReadableStream(buffers);
        const { stream } = await encoding.toDecodeStream(source, {
            acceptTextOnly: true,
            minBytesRequiredForDetection: 4,
            guessEncoding: false,
            candidateGuessEncodings: [],
            overwriteEncoding: async (detected) => detected || encoding.UTF8,
        });
        const expected = new TextDecoder().decode(incompleteEmojis);
        const actual = await readAllAsString(stream);
        assert.strictEqual(actual, expected);
    });
    test('toDecodeStream - some stream (GBK issue #101856)', async function () {
        const path = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_gbk.txt').fsPath;
        const source = streamToBufferReadableStream(fs.createReadStream(path));
        const { detected, stream } = await encoding.toDecodeStream(source, {
            acceptTextOnly: true,
            minBytesRequiredForDetection: 4,
            guessEncoding: false,
            candidateGuessEncodings: [],
            overwriteEncoding: async () => 'gbk',
        });
        assert.ok(detected);
        assert.ok(stream);
        const content = await readAllAsString(stream);
        assert.strictEqual(content.length, 65537);
    });
    test('toDecodeStream - some stream (UTF-8 issue #102202)', async function () {
        const path = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/issue_102202.txt').fsPath;
        const source = streamToBufferReadableStream(fs.createReadStream(path));
        const { detected, stream } = await encoding.toDecodeStream(source, {
            acceptTextOnly: true,
            minBytesRequiredForDetection: 4,
            guessEncoding: false,
            candidateGuessEncodings: [],
            overwriteEncoding: async () => 'utf-8',
        });
        assert.ok(detected);
        assert.ok(stream);
        const content = await readAllAsString(stream);
        const lines = splitLines(content);
        assert.strictEqual(lines[981].toString(), '啊啊啊啊啊啊aaa啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊啊，啊啊啊啊啊啊啊啊啊啊啊。');
    });
    test('toDecodeStream - binary', async function () {
        const source = () => {
            return newTestReadableStream([
                Buffer.from([0, 0, 0]),
                Buffer.from('Hello World'),
                Buffer.from([0]),
            ]);
        };
        // acceptTextOnly: true
        let error = undefined;
        try {
            await encoding.toDecodeStream(source(), {
                acceptTextOnly: true,
                guessEncoding: false,
                candidateGuessEncodings: [],
                overwriteEncoding: async (detected) => detected || encoding.UTF8,
            });
        }
        catch (e) {
            error = e;
        }
        assert.ok(error instanceof encoding.DecodeStreamError);
        assert.strictEqual(error.decodeStreamErrorKind, 1 /* encoding.DecodeStreamErrorKind.STREAM_IS_BINARY */);
        // acceptTextOnly: false
        const { detected, stream } = await encoding.toDecodeStream(source(), {
            acceptTextOnly: false,
            guessEncoding: false,
            candidateGuessEncodings: [],
            overwriteEncoding: async (detected) => detected || encoding.UTF8,
        });
        assert.ok(detected);
        assert.strictEqual(detected.seemsBinary, true);
        assert.ok(stream);
    });
    test('toEncodeReadable - encoding, utf16be', async function () {
        const path = FileAccess.asFileUri('vs/workbench/services/textfile/test/node/encoding/fixtures/some_utf16be.css').fsPath;
        const source = await readAndDecodeFromDisk(path, encoding.UTF16be);
        const iconv = await importAMDNodeModule('@vscode/iconv-lite-umd', 'lib/iconv-lite-umd.js');
        const expected = VSBuffer.wrap(iconv.encode(source, encoding.toNodeEncoding(encoding.UTF16be))).toString();
        const actual = streams
            .consumeReadable(await encoding.toEncodeReadable(streams.toReadable(source), encoding.UTF16be), VSBuffer.concat)
            .toString();
        assert.strictEqual(actual, expected);
    });
    test('toEncodeReadable - empty readable to utf8', async function () {
        const source = {
            read() {
                return null;
            },
        };
        const actual = streams
            .consumeReadable(await encoding.toEncodeReadable(source, encoding.UTF8), VSBuffer.concat)
            .toString();
        assert.strictEqual(actual, '');
    });
    [
        {
            utfEncoding: encoding.UTF8,
            relatedBom: encoding.UTF8_BOM,
        },
        {
            utfEncoding: encoding.UTF8_with_bom,
            relatedBom: encoding.UTF8_BOM,
        },
        {
            utfEncoding: encoding.UTF16be,
            relatedBom: encoding.UTF16be_BOM,
        },
        {
            utfEncoding: encoding.UTF16le,
            relatedBom: encoding.UTF16le_BOM,
        },
    ].forEach(({ utfEncoding, relatedBom }) => {
        test(`toEncodeReadable - empty readable to ${utfEncoding} with BOM`, async function () {
            const source = {
                read() {
                    return null;
                },
            };
            const encodedReadable = encoding.toEncodeReadable(source, utfEncoding, { addBOM: true });
            const expected = VSBuffer.wrap(Buffer.from(relatedBom)).toString();
            const actual = streams.consumeReadable(await encodedReadable, VSBuffer.concat).toString();
            assert.strictEqual(actual, expected);
        });
    });
    test('encodingExists', async function () {
        for (const enc in encoding.SUPPORTED_ENCODINGS) {
            if (enc === encoding.UTF8_with_bom) {
                continue; // skip over encodings from us
            }
            const iconv = await importAMDNodeModule('@vscode/iconv-lite-umd', 'lib/iconv-lite-umd.js');
            assert.strictEqual(iconv.encodingExists(enc), true, enc);
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jb2RpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRmaWxlL3Rlc3Qvbm9kZS9lbmNvZGluZy9lbmNvZGluZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEtBQUssUUFBUSxNQUFNLDZCQUE2QixDQUFBO0FBQ3ZELE9BQU8sS0FBSyxPQUFPLE1BQU0seUNBQXlDLENBQUE7QUFDbEUsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixRQUFRLEVBRVIsNEJBQTRCLEdBQzVCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVyRyxNQUFNLENBQUMsS0FBSyxVQUFVLG1CQUFtQixDQUN4QyxJQUFZO0lBSVosSUFBSSxDQUFDO1FBQ0osTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU5RCxPQUFPLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDaEIsT0FBTyxJQUFJLENBQUEsQ0FBQyxzQ0FBc0M7SUFDbkQsQ0FBQztBQUNGLENBQUM7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