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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGZzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9ub2RlL3Bmcy9wZnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3BELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN2RCxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLFFBQVEsRUFDUixVQUFVLEVBQ1YsVUFBVSxFQUNWLGNBQWMsRUFDZCxhQUFhLEdBQ2IsTUFBTSxzQkFBc0IsQ0FBQTtBQUM3QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFFL0QscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUEsQ0FBQyxzREFBc0Q7QUFFbkYsVUFBVSxDQUFDLEtBQUssRUFBRTtJQUNqQixJQUFJLE9BQWUsQ0FBQTtJQUVuQixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ys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Q0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVsRSxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRTVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFbkUsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUE7UUFFM0YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUQsTUFBTSxRQUFRLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRTVCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7SUFDckMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdkMsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUMvRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ25ELE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN2QyxNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFeEMsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRW5ELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFbkUsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUNwQixJQUFJLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxFQUM5QixJQUFJLENBQUMsVUFBVSxFQUFFLGtCQUFrQixDQUFDLEVBQ3BDLEtBQUssQ0FDTCxDQUFBO1FBRUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUQsTUFBTSxRQUFRLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRTVCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7SUFDckMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDOUMsTUFBTSxrQkFBa0IsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDOUMsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ25DLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUV0QyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFaEUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFdkQsZ0RBQWdEO1FBQ2hELEVBQUU7UUFDRiw2REFBNkQ7UUFDN0QsNENBQTRDO1FBQzVDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7WUFFcEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7WUFFcEMsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLE1BQU0sY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUM5RCxNQUFNLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ3ZCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUE7WUFFakMsTUFBTSxNQUFNLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1lBRTlDLHdEQUF3RDtZQUV4RCxNQUFNLFFBQVEsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDN0IsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBRXJFLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1lBRXBDLE1BQU0sRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLEdBQUcsTUFBTSxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQzdFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUMxQixDQUFDO1FBRUQsNENBQTRDO1FBRTVDLE1BQU0sUUFBUSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUM3QixNQUFNLFFBQVEsQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUVyQyxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUEsQ0FBQyx3QkFBd0I7UUFFN0YsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE1BQU0sRUFBRSxZQUFZLEVBQUUsR0FBRyxNQUFNLGNBQWMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDOUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDbEMsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpRUFBaUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsRixnQkFBZ0I7UUFDaEIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQSxDQUFDLFlBQVk7UUFDeEUsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFBLENBQUMsc0JBQXNCO1FBQ25GLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxDQUFBLENBQUMsMEJBQTBCO1FBQzFGLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixFQUFFLFFBQVEsQ0FBQyxDQUFBLENBQUMsaUNBQWlDO1FBQ25HLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMscUJBQXFCLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNuRSxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUUvRCxNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxZQUFZLENBQUMsQ0FBQSxDQUFDLGlDQUFpQztRQUM5RyxFQUFFLENBQUMsV0FBVyxDQUFDLHFCQUFxQixFQUFFLDJCQUEyQixFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRTlFLGdCQUFnQjtRQUNoQixNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQSxDQUFDLDJCQUEyQjtRQUM3RixNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLENBQUMsQ0FBQSxDQUFDLCtCQUErQjtRQUMvRixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxRQUFRLENBQUMsQ0FBQSxDQUFDLHNDQUFzQztRQUN4RyxNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxZQUFZLENBQUMsQ0FBQSxDQUFDLHNDQUFzQztRQUVuSCx1REFBdUQ7UUFDdkQsRUFBRTtRQUNGLDZEQUE2RDtRQUM3RCw0Q0FBNEM7UUFDNUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7WUFFM0YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQTtZQUM5QyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFBO1lBQy9DLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUE7WUFDN0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQTtZQUNyRCxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFBO1lBRXJFLE1BQU0sVUFBVSxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtZQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1lBRXJELE1BQU0sUUFBUSxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQ3hDLENBQUM7UUFFRCx3REFBd0Q7UUFDeEQsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUU1RixNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZUFBZSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2hDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFBO1FBQzFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFBO1FBQzFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFBO1FBQzFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMzRCxFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsbUJBQW1CLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUVoRSxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2hELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1QixNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDckMsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRXhDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFdkQsRUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRW5ELElBQUksYUFBYSxHQUFHLE1BQU0sY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBRXZDLGFBQWEsR0FBRyxNQUFNLGNBQWMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDbEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbEQsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUV4QyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRXZELEVBQUUsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUVuRCxNQUFNLFFBQVEsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFNUIsTUFBTSxhQUFhLEdBQUcsTUFBTSxjQUFjLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxFQUFFLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxFQUFFLENBQUMsYUFBYSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNqRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUIsSUFBSSxPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssV0FBVyxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDOUUsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQTtZQUMvQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBRWxDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7WUFFcEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFFaEMsTUFBTSxRQUFRLEdBQUcsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsRUFDakMsSUFBSSxDQUNKLENBQUEsQ0FBQyxpQ0FBaUM7UUFDcEMsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVDLElBQUksT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzlFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDbkMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUVwRCxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUVuRSxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUVoQyxNQUFNLFFBQVEsR0FBRyxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7WUFFekUsTUFBTSxDQUFDLFdBQVcsQ0FDakIsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsRUFDdEMsSUFBSSxDQUNKLENBQUEsQ0FBQyxpQ0FBaUM7WUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQ3JDLElBQUksQ0FDSixDQUFBO1lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FDakIsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxjQUFjLENBQUMsRUFDL0MsSUFBSSxDQUNKLENBQUE7WUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsRUFDaEMsSUFBSSxDQUNKLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDckMsTUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFBO1FBQy9CLE1BQU0sT0FBTyxHQUFHLElBQUksS0FBSyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUU1RCxPQUFPLGFBQWEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUM3RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN0RCxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMzQixJQUFJLENBQUM7WUFDSixNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUE7WUFDL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBRTVELE9BQU8sTUFBTSxhQUFhLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDbkUsQ0FBQztnQkFBUyxDQUFDO1lBQ1YscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0IsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3JDLE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQTtRQUMvQixNQUFNLE9BQU8sR0FBRyxJQUFJLEtBQUssQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFFNUQsT0FBTyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUN2RixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6QyxNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUE7UUFDL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxLQUFLLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBRTVELE9BQU8sYUFBYSxDQUNuQixRQUFRLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFDckMsU0FBUyxFQUNULFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUNuQyxPQUFPLENBQ1AsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxVQUFVLGFBQWEsQ0FDM0IsU0FBdUMsRUFDdkMsY0FBc0IsRUFDdEIsT0FBcUMsRUFDckMsWUFBb0I7UUFFcEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUU3QyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUVqQyxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUV4RSxNQUFNLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUN2RSxDQUFDO0lBRUQsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3JELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFFN0MsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQSxDQUFDLHdFQUF3RTtRQUUvRixJQUFJLGFBQWdDLENBQUE7UUFDcEMsSUFBSSxDQUFDO1lBQ0osTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUNsRCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixhQUFhLEdBQUcsS0FBSyxDQUFBO1FBQ3RCLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ3pCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGVBQWUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNoQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBRTdDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBRXZFLE1BQU0sV0FBVyxHQUFHLElBQUksS0FBSyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUVoRSxhQUFhLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUN0RSxDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7QUFDMUMsQ0FBQyxDQUFDLENBQUEifQ==