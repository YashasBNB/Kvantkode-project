/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as fs from 'fs';
import { tmpdir } from 'os';
import { timeout } from '../../../common/async.js';
import { VSBuffer } from '../../../common/buffer.js';
import { randomPath } from '../../../common/extpath.js';
import { FileAccess } from '../../../common/network.js';
import { basename, dirname, join, sep } from '../../../common/path.js';
import { isWindows } from '../../../common/platform.js';
import { configureFlushOnWrite, Promises, RimRafMode, rimrafSync, SymlinkSupport, writeFileSync, } from '../../../node/pfs.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../common/utils.js';
import { flakySuite, getRandomTestPath } from '../testUtils.js';
configureFlushOnWrite(false); // speed up all unit tests by disabling flush on write
flakySuite('PFS', function () {
    let testDir;
    setup(() => {
        testDir = getRandomTestPath(tmpdir(), 'vsctests', 'pfs');
        return fs.promises.mkdir(testDir, { recursive: true });
    });
    teardown(() => {
        return Promises.rm(testDir);
    });
    test('writeFile', async () => {
        const testFile = join(testDir, 'writefile.txt');
        assert.ok(!(await Promises.exists(testFile)));
        await Promises.writeFile(testFile, 'Hello World', null);
        assert.strictEqual((await fs.promises.readFile(testFile)).toString(), 'Hello World');
    });
    test('writeFile - parallel write on different files works', async () => {
        const testFile1 = join(testDir, 'writefile1.txt');
        const testFile2 = join(testDir, 'writefile2.txt');
        const testFile3 = join(testDir, 'writefile3.txt');
        const testFile4 = join(testDir, 'writefile4.txt');
        const testFile5 = join(testDir, 'writefile5.txt');
        await Promise.all([
            Promises.writeFile(testFile1, 'Hello World 1', null),
            Promises.writeFile(testFile2, 'Hello World 2', null),
            Promises.writeFile(testFile3, 'Hello World 3', null),
            Promises.writeFile(testFile4, 'Hello World 4', null),
            Promises.writeFile(testFile5, 'Hello World 5', null),
        ]);
        assert.strictEqual(fs.readFileSync(testFile1).toString(), 'Hello World 1');
        assert.strictEqual(fs.readFileSync(testFile2).toString(), 'Hello World 2');
        assert.strictEqual(fs.readFileSync(testFile3).toString(), 'Hello World 3');
        assert.strictEqual(fs.readFileSync(testFile4).toString(), 'Hello World 4');
        assert.strictEqual(fs.readFileSync(testFile5).toString(), 'Hello World 5');
    });
    test('writeFile - parallel write on same files works and is sequentalized', async () => {
        const testFile = join(testDir, 'writefile.txt');
        await Promise.all([
            Promises.writeFile(testFile, 'Hello World 1', undefined),
            Promises.writeFile(testFile, 'Hello World 2', undefined),
            timeout(10).then(() => Promises.writeFile(testFile, 'Hello World 3', undefined)),
            Promises.writeFile(testFile, 'Hello World 4', undefined),
            timeout(10).then(() => Promises.writeFile(testFile, 'Hello World 5', undefined)),
        ]);
        assert.strictEqual(fs.readFileSync(testFile).toString(), 'Hello World 5');
    });
    test('rimraf - simple - unlink', async () => {
        fs.writeFileSync(join(testDir, 'somefile.txt'), 'Contents');
        fs.writeFileSync(join(testDir, 'someOtherFile.txt'), 'Contents');
        await Promises.rm(testDir);
        assert.ok(!fs.existsSync(testDir));
    });
    test('rimraf - simple - move', async () => {
        fs.writeFileSync(join(testDir, 'somefile.txt'), 'Contents');
        fs.writeFileSync(join(testDir, 'someOtherFile.txt'), 'Contents');
        await Promises.rm(testDir, RimRafMode.MOVE);
        assert.ok(!fs.existsSync(testDir));
    });
    test('rimraf - simple - move (with moveToPath)', async () => {
        fs.writeFileSync(join(testDir, 'somefile.txt'), 'Contents');
        fs.writeFileSync(join(testDir, 'someOtherFile.txt'), 'Contents');
        await Promises.rm(testDir, RimRafMode.MOVE, join(dirname(testDir), `${basename(testDir)}.vsctmp`));
        assert.ok(!fs.existsSync(testDir));
    });
    test('rimraf - path does not exist - move', async () => {
        const nonExistingDir = join(testDir, 'unknown-move');
        await Promises.rm(nonExistingDir, RimRafMode.MOVE);
    });
    test('rimraf - path does not exist - unlink', async () => {
        const nonExistingDir = join(testDir, 'unknown-unlink');
        await Promises.rm(nonExistingDir, RimRafMode.UNLINK);
    });
    test('rimraf - recursive folder structure - unlink', async () => {
        fs.writeFileSync(join(testDir, 'somefile.txt'), 'Contents');
        fs.writeFileSync(join(testDir, 'someOtherFile.txt'), 'Contents');
        fs.mkdirSync(join(testDir, 'somefolder'));
        fs.writeFileSync(join(testDir, 'somefolder', 'somefile.txt'), 'Contents');
        await Promises.rm(testDir);
        assert.ok(!fs.existsSync(testDir));
    });
    test('rimraf - recursive folder structure - move', async () => {
        fs.writeFileSync(join(testDir, 'somefile.txt'), 'Contents');
        fs.writeFileSync(join(testDir, 'someOtherFile.txt'), 'Contents');
        fs.mkdirSync(join(testDir, 'somefolder'));
        fs.writeFileSync(join(testDir, 'somefolder', 'somefile.txt'), 'Contents');
        await Promises.rm(testDir, RimRafMode.MOVE);
        assert.ok(!fs.existsSync(testDir));
    });
    test('rimraf - simple ends with dot - move', async () => {
        fs.writeFileSync(join(testDir, 'somefile.txt'), 'Contents');
        fs.writeFileSync(join(testDir, 'someOtherFile.txt'), 'Contents');
        await Promises.rm(testDir, RimRafMode.MOVE);
        assert.ok(!fs.existsSync(testDir));
    });
    test('rimraf - simple ends with dot slash/backslash - move', async () => {
        fs.writeFileSync(join(testDir, 'somefile.txt'), 'Contents');
        fs.writeFileSync(join(testDir, 'someOtherFile.txt'), 'Contents');
        await Promises.rm(`${testDir}${sep}`, RimRafMode.MOVE);
        assert.ok(!fs.existsSync(testDir));
    });
    test('rimrafSync - swallows file not found error', function () {
        const nonExistingDir = join(testDir, 'not-existing');
        rimrafSync(nonExistingDir);
        assert.ok(!fs.existsSync(nonExistingDir));
    });
    test('rimrafSync - simple', async () => {
        fs.writeFileSync(join(testDir, 'somefile.txt'), 'Contents');
        fs.writeFileSync(join(testDir, 'someOtherFile.txt'), 'Contents');
        rimrafSync(testDir);
        assert.ok(!fs.existsSync(testDir));
    });
    test('rimrafSync - recursive folder structure', async () => {
        fs.writeFileSync(join(testDir, 'somefile.txt'), 'Contents');
        fs.writeFileSync(join(testDir, 'someOtherFile.txt'), 'Contents');
        fs.mkdirSync(join(testDir, 'somefolder'));
        fs.writeFileSync(join(testDir, 'somefolder', 'somefile.txt'), 'Contents');
        rimrafSync(testDir);
        assert.ok(!fs.existsSync(testDir));
    });
    test('copy, rename and delete', async () => {
        const sourceDir = FileAccess.asFileUri('vs/base/test/node/pfs/fixtures').fsPath;
        const parentDir = join(tmpdir(), 'vsctests', 'pfs');
        const targetDir = randomPath(parentDir);
        const targetDir2 = randomPath(parentDir);
        await Promises.copy(sourceDir, targetDir, { preserveSymlinks: true });
        assert.ok(fs.existsSync(targetDir));
        assert.ok(fs.existsSync(join(targetDir, 'index.html')));
        assert.ok(fs.existsSync(join(targetDir, 'site.css')));
        assert.ok(fs.existsSync(join(targetDir, 'examples')));
        assert.ok(fs.statSync(join(targetDir, 'examples')).isDirectory());
        assert.ok(fs.existsSync(join(targetDir, 'examples', 'small.jxs')));
        await Promises.rename(targetDir, targetDir2);
        assert.ok(!fs.existsSync(targetDir));
        assert.ok(fs.existsSync(targetDir2));
        assert.ok(fs.existsSync(join(targetDir2, 'index.html')));
        assert.ok(fs.existsSync(join(targetDir2, 'site.css')));
        assert.ok(fs.existsSync(join(targetDir2, 'examples')));
        assert.ok(fs.statSync(join(targetDir2, 'examples')).isDirectory());
        assert.ok(fs.existsSync(join(targetDir2, 'examples', 'small.jxs')));
        await Promises.rename(join(targetDir2, 'index.html'), join(targetDir2, 'index_moved.html'));
        assert.ok(!fs.existsSync(join(targetDir2, 'index.html')));
        assert.ok(fs.existsSync(join(targetDir2, 'index_moved.html')));
        await Promises.rm(parentDir);
        assert.ok(!fs.existsSync(parentDir));
    });
    test('rename without retry', async () => {
        const sourceDir = FileAccess.asFileUri('vs/base/test/node/pfs/fixtures').fsPath;
        const parentDir = join(tmpdir(), 'vsctests', 'pfs');
        const targetDir = randomPath(parentDir);
        const targetDir2 = randomPath(parentDir);
        await Promises.copy(sourceDir, targetDir, { preserveSymlinks: true });
        await Promises.rename(targetDir, targetDir2, false);
        assert.ok(!fs.existsSync(targetDir));
        assert.ok(fs.existsSync(targetDir2));
        assert.ok(fs.existsSync(join(targetDir2, 'index.html')));
        assert.ok(fs.existsSync(join(targetDir2, 'site.css')));
        assert.ok(fs.existsSync(join(targetDir2, 'examples')));
        assert.ok(fs.statSync(join(targetDir2, 'examples')).isDirectory());
        assert.ok(fs.existsSync(join(targetDir2, 'examples', 'small.jxs')));
        await Promises.rename(join(targetDir2, 'index.html'), join(targetDir2, 'index_moved.html'), false);
        assert.ok(!fs.existsSync(join(targetDir2, 'index.html')));
        assert.ok(fs.existsSync(join(targetDir2, 'index_moved.html')));
        await Promises.rm(parentDir);
        assert.ok(!fs.existsSync(parentDir));
    });
    test('copy handles symbolic links', async () => {
        const symbolicLinkTarget = randomPath(testDir);
        const symLink = randomPath(testDir);
        const copyTarget = randomPath(testDir);
        await fs.promises.mkdir(symbolicLinkTarget, { recursive: true });
        fs.symlinkSync(symbolicLinkTarget, symLink, 'junction');
        // Copy preserves symlinks if configured as such
        //
        // Windows: this test does not work because creating symlinks
        // requires priviledged permissions (admin).
        if (!isWindows) {
            await Promises.copy(symLink, copyTarget, { preserveSymlinks: true });
            assert.ok(fs.existsSync(copyTarget));
            const { symbolicLink } = await SymlinkSupport.stat(copyTarget);
            assert.ok(symbolicLink);
            assert.ok(!symbolicLink.dangling);
            const target = await fs.promises.readlink(copyTarget);
            assert.strictEqual(target, symbolicLinkTarget);
            // Copy does not preserve symlinks if configured as such
            await Promises.rm(copyTarget);
            await Promises.copy(symLink, copyTarget, { preserveSymlinks: false });
            assert.ok(fs.existsSync(copyTarget));
            const { symbolicLink: symbolicLink2 } = await SymlinkSupport.stat(copyTarget);
            assert.ok(!symbolicLink2);
        }
        // Copy does not fail over dangling symlinks
        await Promises.rm(copyTarget);
        await Promises.rm(symbolicLinkTarget);
        await Promises.copy(symLink, copyTarget, { preserveSymlinks: true }); // this should not throw
        if (!isWindows) {
            const { symbolicLink } = await SymlinkSupport.stat(copyTarget);
            assert.ok(symbolicLink?.dangling);
        }
        else {
            assert.ok(!fs.existsSync(copyTarget));
        }
    });
    test('copy handles symbolic links when the reference is inside source', async () => {
        // Source Folder
        const sourceFolder = join(randomPath(testDir), 'copy-test'); // copy-test
        const sourceLinkTestFolder = join(sourceFolder, 'link-test'); // copy-test/link-test
        const sourceLinkMD5JSFolder = join(sourceLinkTestFolder, 'md5'); // copy-test/link-test/md5
        const sourceLinkMD5JSFile = join(sourceLinkMD5JSFolder, 'md5.js'); // copy-test/link-test/md5/md5.js
        await fs.promises.mkdir(sourceLinkMD5JSFolder, { recursive: true });
        await Promises.writeFile(sourceLinkMD5JSFile, 'Hello from MD5');
        const sourceLinkMD5JSFolderLinked = join(sourceLinkTestFolder, 'md5-linked'); // copy-test/link-test/md5-linked
        fs.symlinkSync(sourceLinkMD5JSFolder, sourceLinkMD5JSFolderLinked, 'junction');
        // Target Folder
        const targetLinkTestFolder = join(sourceFolder, 'link-test copy'); // copy-test/link-test copy
        const targetLinkMD5JSFolder = join(targetLinkTestFolder, 'md5'); // copy-test/link-test copy/md5
        const targetLinkMD5JSFile = join(targetLinkMD5JSFolder, 'md5.js'); // copy-test/link-test copy/md5/md5.js
        const targetLinkMD5JSFolderLinked = join(targetLinkTestFolder, 'md5-linked'); // copy-test/link-test copy/md5-linked
        // Copy with `preserveSymlinks: true` and verify result
        //
        // Windows: this test does not work because creating symlinks
        // requires priviledged permissions (admin).
        if (!isWindows) {
            await Promises.copy(sourceLinkTestFolder, targetLinkTestFolder, { preserveSymlinks: true });
            assert.ok(fs.existsSync(targetLinkTestFolder));
            assert.ok(fs.existsSync(targetLinkMD5JSFolder));
            assert.ok(fs.existsSync(targetLinkMD5JSFile));
            assert.ok(fs.existsSync(targetLinkMD5JSFolderLinked));
            assert.ok(fs.lstatSync(targetLinkMD5JSFolderLinked).isSymbolicLink());
            const linkTarget = await fs.promises.readlink(targetLinkMD5JSFolderLinked);
            assert.strictEqual(linkTarget, targetLinkMD5JSFolder);
            await Promises.rm(targetLinkTestFolder);
        }
        // Copy with `preserveSymlinks: false` and verify result
        await Promises.copy(sourceLinkTestFolder, targetLinkTestFolder, { preserveSymlinks: false });
        assert.ok(fs.existsSync(targetLinkTestFolder));
        assert.ok(fs.existsSync(targetLinkMD5JSFolder));
        assert.ok(fs.existsSync(targetLinkMD5JSFile));
        assert.ok(fs.existsSync(targetLinkMD5JSFolderLinked));
        assert.ok(fs.lstatSync(targetLinkMD5JSFolderLinked).isDirectory());
    });
    test('readDirsInDir', async () => {
        fs.mkdirSync(join(testDir, 'somefolder1'));
        fs.mkdirSync(join(testDir, 'somefolder2'));
        fs.mkdirSync(join(testDir, 'somefolder3'));
        fs.writeFileSync(join(testDir, 'somefile.txt'), 'Contents');
        fs.writeFileSync(join(testDir, 'someOtherFile.txt'), 'Contents');
        const result = await Promises.readDirsInDir(testDir);
        assert.strictEqual(result.length, 3);
        assert.ok(result.indexOf('somefolder1') !== -1);
        assert.ok(result.indexOf('somefolder2') !== -1);
        assert.ok(result.indexOf('somefolder3') !== -1);
    });
    test('stat link', async () => {
        const directory = randomPath(testDir);
        const symbolicLink = randomPath(testDir);
        await fs.promises.mkdir(directory, { recursive: true });
        fs.symlinkSync(directory, symbolicLink, 'junction');
        let statAndIsLink = await SymlinkSupport.stat(directory);
        assert.ok(!statAndIsLink?.symbolicLink);
        statAndIsLink = await SymlinkSupport.stat(symbolicLink);
        assert.ok(statAndIsLink?.symbolicLink);
        assert.ok(!statAndIsLink?.symbolicLink?.dangling);
    });
    test('stat link (non existing target)', async () => {
        const directory = randomPath(testDir);
        const symbolicLink = randomPath(testDir);
        await fs.promises.mkdir(directory, { recursive: true });
        fs.symlinkSync(directory, symbolicLink, 'junction');
        await Promises.rm(directory);
        const statAndIsLink = await SymlinkSupport.stat(symbolicLink);
        assert.ok(statAndIsLink?.symbolicLink);
        assert.ok(statAndIsLink?.symbolicLink?.dangling);
    });
    test('readdir', async () => {
        if (typeof process.versions['electron'] !== 'undefined' /* needs electron */) {
            const parent = randomPath(join(testDir, 'pfs'));
            const newDir = join(parent, 'öäü');
            await fs.promises.mkdir(newDir, { recursive: true });
            assert.ok(fs.existsSync(newDir));
            const children = await Promises.readdir(parent);
            assert.strictEqual(children.some((n) => n === 'öäü'), true); // Mac always converts to NFD, so
        }
    });
    test('readdir (with file types)', async () => {
        if (typeof process.versions['electron'] !== 'undefined' /* needs electron */) {
            const newDir = join(testDir, 'öäü');
            await fs.promises.mkdir(newDir, { recursive: true });
            await Promises.writeFile(join(testDir, 'somefile.txt'), 'contents');
            assert.ok(fs.existsSync(newDir));
            const children = await Promises.readdir(testDir, { withFileTypes: true });
            assert.strictEqual(children.some((n) => n.name === 'öäü'), true); // Mac always converts to NFD, so
            assert.strictEqual(children.some((n) => n.isDirectory()), true);
            assert.strictEqual(children.some((n) => n.name === 'somefile.txt'), true);
            assert.strictEqual(children.some((n) => n.isFile()), true);
        }
    });
    test('writeFile (string)', async () => {
        const smallData = 'Hello World';
        const bigData = new Array(100 * 1024).join('Large String\n');
        return testWriteFile(smallData, smallData, bigData, bigData);
    });
    test('writeFile (string) - flush on write', async () => {
        configureFlushOnWrite(true);
        try {
            const smallData = 'Hello World';
            const bigData = new Array(100 * 1024).join('Large String\n');
            return await testWriteFile(smallData, smallData, bigData, bigData);
        }
        finally {
            configureFlushOnWrite(false);
        }
    });
    test('writeFile (Buffer)', async () => {
        const smallData = 'Hello World';
        const bigData = new Array(100 * 1024).join('Large String\n');
        return testWriteFile(Buffer.from(smallData), smallData, Buffer.from(bigData), bigData);
    });
    test('writeFile (UInt8Array)', async () => {
        const smallData = 'Hello World';
        const bigData = new Array(100 * 1024).join('Large String\n');
        return testWriteFile(VSBuffer.fromString(smallData).buffer, smallData, VSBuffer.fromString(bigData).buffer, bigData);
    });
    async function testWriteFile(smallData, smallDataValue, bigData, bigDataValue) {
        const testFile = join(testDir, 'flushed.txt');
        assert.ok(fs.existsSync(testDir));
        await Promises.writeFile(testFile, smallData);
        assert.strictEqual(fs.readFileSync(testFile).toString(), smallDataValue);
        await Promises.writeFile(testFile, bigData);
        assert.strictEqual(fs.readFileSync(testFile).toString(), bigDataValue);
    }
    test('writeFile (string, error handling)', async () => {
        const testFile = join(testDir, 'flushed.txt');
        fs.mkdirSync(testFile); // this will trigger an error later because testFile is now a directory!
        let expectedError;
        try {
            await Promises.writeFile(testFile, 'Hello World');
        }
        catch (error) {
            expectedError = error;
        }
        assert.ok(expectedError);
    });
    test('writeFileSync', async () => {
        const testFile = join(testDir, 'flushed.txt');
        writeFileSync(testFile, 'Hello World');
        assert.strictEqual(fs.readFileSync(testFile).toString(), 'Hello World');
        const largeString = new Array(100 * 1024).join('Large String\n');
        writeFileSync(testFile, largeString);
        assert.strictEqual(fs.readFileSync(testFile).toString(), largeString);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGZzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3Qvbm9kZS9wZnMvcGZzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2xELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDdkQsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixRQUFRLEVBQ1IsVUFBVSxFQUNWLFVBQVUsRUFDVixjQUFjLEVBQ2QsYUFBYSxHQUNiLE1BQU0sc0JBQXNCLENBQUE7QUFDN0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRS9ELHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFBLENBQUMsc0RBQXNEO0FBRW5GLFVBQVUsQ0FBQyxLQUFLLEVBQUU7SUFDakIsSUFBSSxPQUFlLENBQUE7SUFFbkIsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLE9BQU8s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U0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFbEUsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUU1QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQTtRQUNsRSxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRW5FLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO1FBRTNGLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTlELE1BQU0sUUFBUSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUU1QixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO0lBQ3JDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3ZDLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFDL0UsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNuRCxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDdkMsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRXhDLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUVuRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQTtRQUNsRSxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRW5FLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FDcEIsSUFBSSxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsRUFDOUIsSUFBSSxDQUFDLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxFQUNwQyxLQUFLLENBQ0wsQ0FBQTtRQUVELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFB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