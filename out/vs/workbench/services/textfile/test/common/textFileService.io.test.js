/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { snapshotToString, stringToSnapshot, } from '../../common/textfiles.js';
import { URI } from '../../../../../base/common/uri.js';
import { join, basename } from '../../../../../base/common/path.js';
import { UTF16le, UTF8_with_bom, UTF16be, UTF8, UTF16le_BOM, UTF16be_BOM, UTF8_BOM, } from '../../common/encoding.js';
import { bufferToStream, VSBuffer } from '../../../../../base/common/buffer.js';
import { createTextModel } from '../../../../../editor/test/common/testTextModel.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { createTextBufferFactoryFromStream } from '../../../../../editor/common/model/textModel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
/**
 * Allows us to reuse test suite across different environments.
 *
 * It introduces a bit of complexity with setup and teardown, however
 * it helps us to ensure that tests are added for all environments at once,
 * hence helps us catch bugs better.
 */
export default function createSuite(params) {
    let service;
    let testDir = '';
    const { exists, stat, readFile, detectEncodingByBOM } = params;
    const disposables = new DisposableStore();
    setup(async () => {
        const result = await params.setup();
        service = result.service;
        testDir = result.testDir;
    });
    teardown(async () => {
        await params.teardown();
        disposables.clear();
    });
    test('create - no encoding - content empty', async () => {
        const resource = URI.file(join(testDir, 'small_new.txt'));
        await service.create([{ resource }]);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, 0 /* no BOM */);
    });
    test('create - no encoding - content provided (string)', async () => {
        const resource = URI.file(join(testDir, 'small_new.txt'));
        await service.create([{ resource, value: 'Hello World' }]);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.toString(), 'Hello World');
        assert.strictEqual(res.byteLength, 'Hello World'.length);
    });
    test('create - no encoding - content provided (snapshot)', async () => {
        const resource = URI.file(join(testDir, 'small_new.txt'));
        await service.create([{ resource, value: stringToSnapshot('Hello World') }]);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.toString(), 'Hello World');
        assert.strictEqual(res.byteLength, 'Hello World'.length);
    });
    test('create - UTF 16 LE - no content', async () => {
        const resource = URI.file(join(testDir, 'small_new.utf16le'));
        await service.create([{ resource }]);
        assert.strictEqual(await exists(resource.fsPath), true);
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF16le);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, UTF16le_BOM.length);
    });
    test('create - UTF 16 LE - content provided', async () => {
        const resource = URI.file(join(testDir, 'small_new.utf16le'));
        await service.create([{ resource, value: 'Hello World' }]);
        assert.strictEqual(await exists(resource.fsPath), true);
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF16le);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, 'Hello World'.length * 2 /* UTF16 2bytes per char */ + UTF16le_BOM.length);
    });
    test('create - UTF 16 BE - no content', async () => {
        const resource = URI.file(join(testDir, 'small_new.utf16be'));
        await service.create([{ resource }]);
        assert.strictEqual(await exists(resource.fsPath), true);
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF16be);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, UTF16le_BOM.length);
    });
    test('create - UTF 16 BE - content provided', async () => {
        const resource = URI.file(join(testDir, 'small_new.utf16be'));
        await service.create([{ resource, value: 'Hello World' }]);
        assert.strictEqual(await exists(resource.fsPath), true);
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF16be);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, 'Hello World'.length * 2 /* UTF16 2bytes per char */ + UTF16be_BOM.length);
    });
    test('create - UTF 8 BOM - no content', async () => {
        const resource = URI.file(join(testDir, 'small_new.utf8bom'));
        await service.create([{ resource }]);
        assert.strictEqual(await exists(resource.fsPath), true);
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, UTF8_BOM.length);
    });
    test('create - UTF 8 BOM - content provided', async () => {
        const resource = URI.file(join(testDir, 'small_new.utf8bom'));
        await service.create([{ resource, value: 'Hello World' }]);
        assert.strictEqual(await exists(resource.fsPath), true);
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, 'Hello World'.length + UTF8_BOM.length);
    });
    function createTextModelSnapshot(text, preserveBOM) {
        const textModel = disposables.add(createTextModel(text));
        const snapshot = textModel.createSnapshot(preserveBOM);
        return snapshot;
    }
    test('create - UTF 8 BOM - empty content - snapshot', async () => {
        const resource = URI.file(join(testDir, 'small_new.utf8bom'));
        await service.create([{ resource, value: createTextModelSnapshot('') }]);
        assert.strictEqual(await exists(resource.fsPath), true);
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, UTF8_BOM.length);
    });
    test('create - UTF 8 BOM - content provided - snapshot', async () => {
        const resource = URI.file(join(testDir, 'small_new.utf8bom'));
        await service.create([{ resource, value: createTextModelSnapshot('Hello World') }]);
        assert.strictEqual(await exists(resource.fsPath), true);
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        const res = await readFile(resource.fsPath);
        assert.strictEqual(res.byteLength, 'Hello World'.length + UTF8_BOM.length);
    });
    test('write - use encoding (UTF 16 BE) - small content as string', async () => {
        await testEncoding(URI.file(join(testDir, 'small.txt')), UTF16be, 'Hello\nWorld', 'Hello\nWorld');
    });
    test('write - use encoding (UTF 16 BE) - small content as snapshot', async () => {
        await testEncoding(URI.file(join(testDir, 'small.txt')), UTF16be, createTextModelSnapshot('Hello\nWorld'), 'Hello\nWorld');
    });
    test('write - use encoding (UTF 16 BE) - large content as string', async () => {
        await testEncoding(URI.file(join(testDir, 'lorem.txt')), UTF16be, 'Hello\nWorld', 'Hello\nWorld');
    });
    test('write - use encoding (UTF 16 BE) - large content as snapshot', async () => {
        await testEncoding(URI.file(join(testDir, 'lorem.txt')), UTF16be, createTextModelSnapshot('Hello\nWorld'), 'Hello\nWorld');
    });
    async function testEncoding(resource, encoding, content, expectedContent) {
        await service.write(resource, content, { encoding });
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, encoding);
        const resolved = await service.readStream(resource);
        assert.strictEqual(resolved.encoding, encoding);
        const textBuffer = disposables.add(resolved.value.create(isWindows ? 2 /* DefaultEndOfLine.CRLF */ : 1 /* DefaultEndOfLine.LF */).textBuffer);
        assert.strictEqual(snapshotToString(textBuffer.createSnapshot(false)), expectedContent);
    }
    test('write - use encoding (cp1252)', async () => {
        const filePath = join(testDir, 'some_cp1252.txt');
        const contents = await readFile(filePath, 'utf8');
        const eol = /\r\n/.test(contents) ? '\r\n' : '\n';
        await testEncodingKeepsData(URI.file(filePath), 'cp1252', [
            'ObjectCount = LoadObjects("Öffentlicher Ordner");',
            '',
            'Private = "Persönliche Information"',
            '',
        ].join(eol));
    });
    test('write - use encoding (shiftjis)', async () => {
        await testEncodingKeepsData(URI.file(join(testDir, 'some_shiftjis.txt')), 'shiftjis', '中文abc');
    });
    test('write - use encoding (gbk)', async () => {
        await testEncodingKeepsData(URI.file(join(testDir, 'some_gbk.txt')), 'gbk', '中国abc');
    });
    test('write - use encoding (cyrillic)', async () => {
        await testEncodingKeepsData(URI.file(join(testDir, 'some_cyrillic.txt')), 'cp866', 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя');
    });
    test('write - use encoding (big5)', async () => {
        await testEncodingKeepsData(URI.file(join(testDir, 'some_big5.txt')), 'cp950', '中文abc');
    });
    async function testEncodingKeepsData(resource, encoding, expected) {
        let resolved = await service.readStream(resource, { encoding });
        const textBuffer = disposables.add(resolved.value.create(isWindows ? 2 /* DefaultEndOfLine.CRLF */ : 1 /* DefaultEndOfLine.LF */).textBuffer);
        const content = snapshotToString(textBuffer.createSnapshot(false));
        assert.strictEqual(content, expected);
        await service.write(resource, content, { encoding });
        resolved = await service.readStream(resource, { encoding });
        const textBuffer2 = disposables.add(resolved.value.create(2 /* DefaultEndOfLine.CRLF */).textBuffer);
        assert.strictEqual(snapshotToString(textBuffer2.createSnapshot(false)), content);
        await service.write(resource, createTextModelSnapshot(content), { encoding });
        resolved = await service.readStream(resource, { encoding });
        const textBuffer3 = disposables.add(resolved.value.create(2 /* DefaultEndOfLine.CRLF */).textBuffer);
        assert.strictEqual(snapshotToString(textBuffer3.createSnapshot(false)), content);
    }
    test('write - no encoding - content as string', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        const content = (await readFile(resource.fsPath)).toString();
        await service.write(resource, content);
        const resolved = await service.readStream(resource);
        assert.strictEqual(resolved.value.getFirstLineText(999999), content);
    });
    test('write - no encoding - content as snapshot', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        const content = (await readFile(resource.fsPath)).toString();
        await service.write(resource, createTextModelSnapshot(content));
        const resolved = await service.readStream(resource);
        assert.strictEqual(resolved.value.getFirstLineText(999999), content);
    });
    test('write - encoding preserved (UTF 16 LE) - content as string', async () => {
        const resource = URI.file(join(testDir, 'some_utf16le.css'));
        const resolved = await service.readStream(resource);
        assert.strictEqual(resolved.encoding, UTF16le);
        await testEncoding(URI.file(join(testDir, 'some_utf16le.css')), UTF16le, 'Hello\nWorld', 'Hello\nWorld');
    });
    test('write - encoding preserved (UTF 16 LE) - content as snapshot', async () => {
        const resource = URI.file(join(testDir, 'some_utf16le.css'));
        const resolved = await service.readStream(resource);
        assert.strictEqual(resolved.encoding, UTF16le);
        await testEncoding(URI.file(join(testDir, 'some_utf16le.css')), UTF16le, createTextModelSnapshot('Hello\nWorld'), 'Hello\nWorld');
    });
    test('write - UTF8 variations - content as string', async () => {
        const resource = URI.file(join(testDir, 'index.html'));
        let detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, null);
        const content = (await readFile(resource.fsPath)).toString() + 'updates';
        await service.write(resource, content, { encoding: UTF8_with_bom });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        // ensure BOM preserved if enforced
        await service.write(resource, content, { encoding: UTF8_with_bom });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        // allow to remove BOM
        await service.write(resource, content, { encoding: UTF8 });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, null);
        // BOM does not come back
        await service.write(resource, content, { encoding: UTF8 });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, null);
    });
    test('write - UTF8 variations - content as snapshot', async () => {
        const resource = URI.file(join(testDir, 'index.html'));
        let detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, null);
        const model = disposables.add(createTextModel((await readFile(resource.fsPath)).toString() + 'updates'));
        await service.write(resource, model.createSnapshot(), { encoding: UTF8_with_bom });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        // ensure BOM preserved if enforced
        await service.write(resource, model.createSnapshot(), { encoding: UTF8_with_bom });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        // allow to remove BOM
        await service.write(resource, model.createSnapshot(), { encoding: UTF8 });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, null);
        // BOM does not come back
        await service.write(resource, model.createSnapshot(), { encoding: UTF8 });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, null);
    });
    test('write - preserve UTF8 BOM - content as string', async () => {
        const resource = URI.file(join(testDir, 'some_utf8_bom.txt'));
        let detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
        await service.write(resource, 'Hello World', { encoding: detectedEncoding });
        detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
    });
    test('write - ensure BOM in empty file - content as string', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        await service.write(resource, '', { encoding: UTF8_with_bom });
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
    });
    test('write - ensure BOM in empty file - content as snapshot', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        await service.write(resource, createTextModelSnapshot(''), { encoding: UTF8_with_bom });
        const detectedEncoding = await detectEncodingByBOM(resource.fsPath);
        assert.strictEqual(detectedEncoding, UTF8_with_bom);
    });
    test('readStream - small text', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        await testReadStream(resource);
    });
    test('readStream - large text', async () => {
        const resource = URI.file(join(testDir, 'lorem.txt'));
        await testReadStream(resource);
    });
    async function testReadStream(resource) {
        const result = await service.readStream(resource);
        assert.strictEqual(result.name, basename(resource.fsPath));
        assert.strictEqual(result.size, (await stat(resource.fsPath)).size);
        const content = (await readFile(resource.fsPath)).toString();
        const textBuffer = disposables.add(result.value.create(1 /* DefaultEndOfLine.LF */).textBuffer);
        assert.strictEqual(snapshotToString(textBuffer.createSnapshot(false)), snapshotToString(createTextModelSnapshot(content, false)));
    }
    test('read - small text', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        await testRead(resource);
    });
    test('read - large text', async () => {
        const resource = URI.file(join(testDir, 'lorem.txt'));
        await testRead(resource);
    });
    async function testRead(resource) {
        const result = await service.read(resource);
        assert.strictEqual(result.name, basename(resource.fsPath));
        assert.strictEqual(result.size, (await stat(resource.fsPath)).size);
        assert.strictEqual(result.value, (await readFile(resource.fsPath)).toString());
    }
    test('readStream - encoding picked up (CP1252)', async () => {
        const resource = URI.file(join(testDir, 'some_small_cp1252.txt'));
        const encoding = 'windows1252';
        const result = await service.readStream(resource, { encoding });
        assert.strictEqual(result.encoding, encoding);
        assert.strictEqual(result.value.getFirstLineText(999999), 'Private = "Persönlicheß Information"');
    });
    test('read - encoding picked up (CP1252)', async () => {
        const resource = URI.file(join(testDir, 'some_small_cp1252.txt'));
        const encoding = 'windows1252';
        const result = await service.read(resource, { encoding });
        assert.strictEqual(result.encoding, encoding);
        assert.strictEqual(result.value, 'Private = "Persönlicheß Information"');
    });
    test('read - encoding picked up (binary)', async () => {
        const resource = URI.file(join(testDir, 'some_small_cp1252.txt'));
        const encoding = 'binary';
        const result = await service.read(resource, { encoding });
        assert.strictEqual(result.encoding, encoding);
        assert.strictEqual(result.value, 'Private = "Persönlicheß Information"');
    });
    test('read - encoding picked up (base64)', async () => {
        const resource = URI.file(join(testDir, 'some_small_cp1252.txt'));
        const encoding = 'base64';
        const result = await service.read(resource, { encoding });
        assert.strictEqual(result.encoding, encoding);
        assert.strictEqual(result.value, btoa('Private = "Persönlicheß Information"'));
    });
    test('readStream - user overrides BOM', async () => {
        const resource = URI.file(join(testDir, 'some_utf16le.css'));
        const result = await service.readStream(resource, { encoding: 'windows1252' });
        assert.strictEqual(result.encoding, 'windows1252');
    });
    test('readStream - BOM removed', async () => {
        const resource = URI.file(join(testDir, 'some_utf8_bom.txt'));
        const result = await service.readStream(resource);
        assert.strictEqual(result.value.getFirstLineText(999999), 'This is some UTF 8 with BOM file.');
    });
    test('readStream - invalid encoding', async () => {
        const resource = URI.file(join(testDir, 'index.html'));
        const result = await service.readStream(resource, { encoding: 'superduper' });
        assert.strictEqual(result.encoding, 'utf8');
    });
    test('readStream - encoding override', async () => {
        const resource = URI.file(join(testDir, 'some.utf16le'));
        const result = await service.readStream(resource, { encoding: 'windows1252' });
        assert.strictEqual(result.encoding, 'utf16le');
        assert.strictEqual(result.value.getFirstLineText(999999), 'This is some UTF 16 with BOM file.');
    });
    test('readStream - large Big5', async () => {
        await testLargeEncoding('big5', '中文abc');
    });
    test('readStream - large CP1252', async () => {
        await testLargeEncoding('cp1252', 'öäüß');
    });
    test('readStream - large Cyrillic', async () => {
        await testLargeEncoding('cp866', 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя');
    });
    test('readStream - large GBK', async () => {
        await testLargeEncoding('gbk', '中国abc');
    });
    test('readStream - large ShiftJIS', async () => {
        await testLargeEncoding('shiftjis', '中文abc');
    });
    test('readStream - large UTF8 BOM', async () => {
        await testLargeEncoding('utf8bom', 'öäüß');
    });
    test('readStream - large UTF16 LE', async () => {
        await testLargeEncoding('utf16le', 'öäüß');
    });
    test('readStream - large UTF16 BE', async () => {
        await testLargeEncoding('utf16be', 'öäüß');
    });
    async function testLargeEncoding(encoding, needle) {
        const resource = URI.file(join(testDir, `lorem_${encoding}.txt`));
        // Verify via `ITextFileService.readStream`
        const result = await service.readStream(resource, { encoding });
        assert.strictEqual(result.encoding, encoding);
        const textBuffer = disposables.add(result.value.create(1 /* DefaultEndOfLine.LF */).textBuffer);
        let contents = snapshotToString(textBuffer.createSnapshot(false));
        assert.strictEqual(contents.indexOf(needle), 0);
        assert.ok(contents.indexOf(needle, 10) > 0);
        // Verify via `ITextFileService.getDecodedTextFactory`
        const rawFile = await params.readFile(resource.fsPath);
        let rawFileVSBuffer;
        if (rawFile instanceof VSBuffer) {
            rawFileVSBuffer = rawFile;
        }
        else {
            rawFileVSBuffer = VSBuffer.wrap(rawFile);
        }
        const factory = await createTextBufferFactoryFromStream(await service.getDecodedStream(resource, bufferToStream(rawFileVSBuffer), { encoding }));
        const textBuffer2 = disposables.add(factory.create(1 /* DefaultEndOfLine.LF */).textBuffer);
        contents = snapshotToString(textBuffer2.createSnapshot(false));
        assert.strictEqual(contents.indexOf(needle), 0);
        assert.ok(contents.indexOf(needle, 10) > 0);
    }
    test('readStream - UTF16 LE (no BOM)', async () => {
        const resource = URI.file(join(testDir, 'utf16_le_nobom.txt'));
        const result = await service.readStream(resource);
        assert.strictEqual(result.encoding, 'utf16le');
    });
    test('readStream - UTF16 BE (no BOM)', async () => {
        const resource = URI.file(join(testDir, 'utf16_be_nobom.txt'));
        const result = await service.readStream(resource);
        assert.strictEqual(result.encoding, 'utf16be');
    });
    test('readStream - autoguessEncoding', async () => {
        const resource = URI.file(join(testDir, 'some_cp1252.txt'));
        const result = await service.readStream(resource, { autoGuessEncoding: true });
        assert.strictEqual(result.encoding, 'windows1252');
    });
    test('readStream - autoguessEncoding (candidateGuessEncodings)', async () => {
        // This file is determined to be Windows-1252 unless candidateDetectEncoding is set.
        const resource = URI.file(join(testDir, 'some.shiftjis.1.txt'));
        const result = await service.readStream(resource, {
            autoGuessEncoding: true,
            candidateGuessEncodings: ['utf-8', 'shiftjis', 'euc-jp'],
        });
        assert.strictEqual(result.encoding, 'shiftjis');
    });
    test('readStream - autoguessEncoding (candidateGuessEncodings is Empty)', async () => {
        const resource = URI.file(join(testDir, 'some_cp1252.txt'));
        const result = await service.readStream(resource, {
            autoGuessEncoding: true,
            candidateGuessEncodings: [],
        });
        assert.strictEqual(result.encoding, 'windows1252');
    });
    test('readStream - FILE_IS_BINARY', async () => {
        const resource = URI.file(join(testDir, 'binary.txt'));
        let error = undefined;
        try {
            await service.readStream(resource, { acceptTextOnly: true });
        }
        catch (err) {
            error = err;
        }
        assert.ok(error);
        assert.strictEqual(error.textFileOperationResult, 0 /* TextFileOperationResult.FILE_IS_BINARY */);
        const result = await service.readStream(URI.file(join(testDir, 'small.txt')), {
            acceptTextOnly: true,
        });
        assert.strictEqual(result.name, 'small.txt');
    });
    test('read - FILE_IS_BINARY', async () => {
        const resource = URI.file(join(testDir, 'binary.txt'));
        let error = undefined;
        try {
            await service.read(resource, { acceptTextOnly: true });
        }
        catch (err) {
            error = err;
        }
        assert.ok(error);
        assert.strictEqual(error.textFileOperationResult, 0 /* TextFileOperationResult.FILE_IS_BINARY */);
        const result = await service.read(URI.file(join(testDir, 'small.txt')), {
            acceptTextOnly: true,
        });
        assert.strictEqual(result.name, 'small.txt');
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVTZXJ2aWNlLmlvLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvdGVzdC9jb21tb24vdGV4dEZpbGVTZXJ2aWNlLmlvLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFFTixnQkFBZ0IsRUFHaEIsZ0JBQWdCLEdBQ2hCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbkUsT0FBTyxFQUNOLE9BQU8sRUFDUCxhQUFhLEVBQ2IsT0FBTyxFQUNQLElBQUksRUFDSixXQUFXLEVBQ1gsV0FBVyxFQUNYLFFBQVEsR0FDUixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRXBGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFtQnpFOzs7Ozs7R0FNRztBQUNILE1BQU0sQ0FBQyxPQUFPLFVBQVUsV0FBVyxDQUFDLE1BQWM7SUFDakQsSUFBSSxPQUF5QixDQUFBO0lBQzdCLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQTtJQUNoQixNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxRQUFRLEVB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QyxLQUFLLENBQUMsQ0FBQyxFQUNsRCxnQkFBZ0IsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FDekQsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDcEMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFFckQsTUFBTSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDekIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDcEMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFFckQsTUFBTSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDekIsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLFVBQVUsUUFBUSxDQUFDLFFBQWE7UUFDcEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRTNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsTUFBTSxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUMvRSxDQUFDO0lBRUQsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEtBQUss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