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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jb2RpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS90ZXN0L25vZGUvZW5jb2RpbmcvZW5jb2RpbmcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxLQUFLLFFBQVEsTUFBTSw2QkFBNkIsQ0FBQTtBQUN2RCxPQUFPLEtBQUssT0FBTyxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xFLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsUUFBUSxFQUVSLDRCQUE0QixHQUM1QixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDckUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFckcsTUFBTSxDQUFDLEtBQUssVUFBVSxtQkFBbUIsQ0FDeEMsSUFBWTtJQUlaLElBQUksQ0FBQztRQUNKLE1BQU0sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFOUQsT0FBTyxRQUFRLENBQUMsNkJBQTZCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2hCLE9BQU8sSUFBSSxDQUFBLENBQUMsc0NBQXNDO0lBQ25ELENBQUM7QUFDRixDQUFDO0FBT0Qs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