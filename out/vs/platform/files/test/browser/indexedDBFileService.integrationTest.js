/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { IndexedDB } from '../../../../base/browser/indexedDB.js';
import { bufferToReadable, bufferToStream, VSBuffer, } from '../../../../base/common/buffer.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { basename, joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { flakySuite } from '../../../../base/test/common/testUtils.js';
import { IndexedDBFileSystemProvider } from '../../browser/indexedDBFileSystemProvider.js';
import { FileSystemProviderErrorCode, FileType, } from '../../common/files.js';
import { FileService } from '../../common/fileService.js';
import { NullLogService } from '../../../log/common/log.js';
flakySuite('IndexedDBFileSystemProvider', function () {
    let service;
    let userdataFileProvider;
    const testDir = '/';
    const userdataURIFromPaths = (paths) => joinPath(URI.from({ scheme: Schemas.vscodeUserData, path: testDir }), ...paths);
    const disposables = new DisposableStore();
    const initFixtures = async () => {
        await Promise.all([
            ['fixtures', 'resolver', 'examples'],
            ['fixtures', 'resolver', 'other', 'deep'],
            ['fixtures', 'service', 'deep'],
            ['batched'],
        ]
            .map((path) => userdataURIFromPaths(path))
            .map((uri) => service.createFolder(uri)));
        await Promise.all([
            [['fixtures', 'resolver', 'examples', 'company.js'], 'class company {}'],
            [['fixtures', 'resolver', 'examples', 'conway.js'], 'export function conway() {}'],
            [['fixtures', 'resolver', 'examples', 'employee.js'], 'export const employee = "jax"'],
            [['fixtures', 'resolver', 'examples', 'small.js'], ''],
            [['fixtures', 'resolver', 'other', 'deep', 'company.js'], 'class company {}'],
            [['fixtures', 'resolver', 'other', 'deep', 'conway.js'], 'export function conway() {}'],
            [
                ['fixtures', 'resolver', 'other', 'deep', 'employee.js'],
                'export const employee = "jax"',
            ],
            [['fixtures', 'resolver', 'other', 'deep', 'small.js'], ''],
            [['fixtures', 'resolver', 'index.html'], '<p>p</p>'],
            [['fixtures', 'resolver', 'site.css'], '.p {color: red;}'],
            [['fixtures', 'service', 'deep', 'company.js'], 'class company {}'],
            [['fixtures', 'service', 'deep', 'conway.js'], 'export function conway() {}'],
            [['fixtures', 'service', 'deep', 'employee.js'], 'export const employee = "jax"'],
            [['fixtures', 'service', 'deep', 'small.js'], ''],
            [['fixtures', 'service', 'binary.txt'], '<p>p</p>'],
        ]
            .map(([path, contents]) => [userdataURIFromPaths(path), contents])
            .map(([uri, contents]) => service.createFile(uri, VSBuffer.fromString(contents))));
    };
    const reload = async () => {
        const logService = new NullLogService();
        service = new FileService(logService);
        disposables.add(service);
        const indexedDB = await IndexedDB.create('vscode-web-db-test', 1, [
            'vscode-userdata-store',
            'vscode-logs-store',
        ]);
        userdataFileProvider = new IndexedDBFileSystemProvider(Schemas.vscodeUserData, indexedDB, 'vscode-userdata-store', true);
        disposables.add(service.registerProvider(Schemas.vscodeUserData, userdataFileProvider));
        disposables.add(userdataFileProvider);
    };
    setup(async function () {
        this.timeout(15000);
        await reload();
    });
    teardown(async () => {
        await userdataFileProvider.reset();
        disposables.clear();
    });
    test('root is always present', async () => {
        assert.strictEqual((await userdataFileProvider.stat(userdataURIFromPaths([]))).type, FileType.Directory);
        await userdataFileProvider.delete(userdataURIFromPaths([]), {
            recursive: true,
            useTrash: false,
            atomic: false,
        });
        assert.strictEqual((await userdataFileProvider.stat(userdataURIFromPaths([]))).type, FileType.Directory);
    });
    test('createFolder', async () => {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const parent = await service.resolve(userdataURIFromPaths([]));
        const newFolderResource = joinPath(parent.resource, 'newFolder');
        assert.strictEqual((await userdataFileProvider.readdir(parent.resource)).length, 0);
        const newFolder = await service.createFolder(newFolderResource);
        assert.strictEqual(newFolder.name, 'newFolder');
        assert.strictEqual((await userdataFileProvider.readdir(parent.resource)).length, 1);
        assert.strictEqual((await userdataFileProvider.stat(newFolderResource)).type, FileType.Directory);
        assert.ok(event);
        assert.strictEqual(event.resource.path, newFolderResource.path);
        assert.strictEqual(event.operation, 0 /* FileOperation.CREATE */);
        assert.strictEqual(event.target.resource.path, newFolderResource.path);
        assert.strictEqual(event.target.isDirectory, true);
    });
    test('createFolder: creating multiple folders at once', async () => {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const multiFolderPaths = ['a', 'couple', 'of', 'folders'];
        const parent = await service.resolve(userdataURIFromPaths([]));
        const newFolderResource = joinPath(parent.resource, ...multiFolderPaths);
        const newFolder = await service.createFolder(newFolderResource);
        const lastFolderName = multiFolderPaths[multiFolderPaths.length - 1];
        assert.strictEqual(newFolder.name, lastFolderName);
        assert.strictEqual((await userdataFileProvider.stat(newFolderResource)).type, FileType.Directory);
        assert.ok(event);
        assert.strictEqual(event.resource.path, newFolderResource.path);
        assert.strictEqual(event.operation, 0 /* FileOperation.CREATE */);
        assert.strictEqual(event.target.resource.path, newFolderResource.path);
        assert.strictEqual(event.target.isDirectory, true);
    });
    test('exists', async () => {
        let exists = await service.exists(userdataURIFromPaths([]));
        assert.strictEqual(exists, true);
        exists = await service.exists(userdataURIFromPaths(['hello']));
        assert.strictEqual(exists, false);
    });
    test('resolve - file', async () => {
        await initFixtures();
        const resource = userdataURIFromPaths(['fixtures', 'resolver', 'index.html']);
        const resolved = await service.resolve(resource);
        assert.strictEqual(resolved.name, 'index.html');
        assert.strictEqual(resolved.isFile, true);
        assert.strictEqual(resolved.isDirectory, false);
        assert.strictEqual(resolved.isSymbolicLink, false);
        assert.strictEqual(resolved.resource.toString(), resource.toString());
        assert.strictEqual(resolved.children, undefined);
        assert.ok(resolved.size > 0);
    });
    test('resolve - directory', async () => {
        await initFixtures();
        const testsElements = ['examples', 'other', 'index.html', 'site.css'];
        const resource = userdataURIFromPaths(['fixtures', 'resolver']);
        const result = await service.resolve(resource);
        assert.ok(result);
        assert.strictEqual(result.resource.toString(), resource.toString());
        assert.strictEqual(result.name, 'resolver');
        assert.ok(result.children);
        assert.ok(result.children.length > 0);
        assert.ok(result.isDirectory);
        assert.strictEqual(result.children.length, testsElements.length);
        assert.ok(result.children.every((entry) => {
            return testsElements.some((name) => {
                return basename(entry.resource) === name;
            });
        }));
        result.children.forEach((value) => {
            assert.ok(basename(value.resource));
            if (['examples', 'other'].indexOf(basename(value.resource)) >= 0) {
                assert.ok(value.isDirectory);
                assert.strictEqual(value.mtime, undefined);
                assert.strictEqual(value.ctime, undefined);
            }
            else if (basename(value.resource) === 'index.html') {
                assert.ok(!value.isDirectory);
                assert.ok(!value.children);
                assert.strictEqual(value.mtime, undefined);
                assert.strictEqual(value.ctime, undefined);
            }
            else if (basename(value.resource) === 'site.css') {
                assert.ok(!value.isDirectory);
                assert.ok(!value.children);
                assert.strictEqual(value.mtime, undefined);
                assert.strictEqual(value.ctime, undefined);
            }
            else {
                assert.fail('Unexpected value ' + basename(value.resource));
            }
        });
    });
    test('createFile', async () => {
        return assertCreateFile((contents) => VSBuffer.fromString(contents));
    });
    test('createFile (readable)', async () => {
        return assertCreateFile((contents) => bufferToReadable(VSBuffer.fromString(contents)));
    });
    test('createFile (stream)', async () => {
        return assertCreateFile((contents) => bufferToStream(VSBuffer.fromString(contents)));
    });
    async function assertCreateFile(converter) {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const contents = 'Hello World';
        const resource = userdataURIFromPaths(['test.txt']);
        assert.strictEqual(await service.canCreateFile(resource), true);
        const fileStat = await service.createFile(resource, converter(contents));
        assert.strictEqual(fileStat.name, 'test.txt');
        assert.strictEqual((await userdataFileProvider.stat(fileStat.resource)).type, FileType.File);
        assert.strictEqual(new TextDecoder().decode(await userdataFileProvider.readFile(fileStat.resource)), contents);
        assert.ok(event);
        assert.strictEqual(event.resource.path, resource.path);
        assert.strictEqual(event.operation, 0 /* FileOperation.CREATE */);
        assert.strictEqual(event.target.resource.path, resource.path);
    }
    const fileCreateBatchTester = (size, name) => {
        const batch = Array.from({ length: size }).map((_, i) => ({
            contents: `Hello${i}`,
            resource: userdataURIFromPaths(['batched', name, `Hello${i}.txt`]),
        }));
        let creationPromises = undefined;
        return {
            async create() {
                return (creationPromises = Promise.all(batch.map((entry) => userdataFileProvider.writeFile(entry.resource, VSBuffer.fromString(entry.contents).buffer, { create: true, overwrite: true, unlock: false, atomic: false }))));
            },
            async assertContentsCorrect() {
                if (!creationPromises) {
                    throw Error('read called before create');
                }
                await creationPromises;
                await Promise.all(batch.map(async (entry, i) => {
                    assert.strictEqual((await userdataFileProvider.stat(entry.resource)).type, FileType.File);
                    assert.strictEqual(new TextDecoder().decode(await userdataFileProvider.readFile(entry.resource)), entry.contents);
                }));
            },
        };
    };
    test('createFile - batch', async () => {
        const tester = fileCreateBatchTester(20, 'batch');
        await tester.create();
        await tester.assertContentsCorrect();
    });
    test('createFile - batch (mixed parallel/sequential)', async () => {
        const batch1 = fileCreateBatchTester(1, 'batch1');
        const batch2 = fileCreateBatchTester(20, 'batch2');
        const batch3 = fileCreateBatchTester(1, 'batch3');
        const batch4 = fileCreateBatchTester(20, 'batch4');
        batch1.create();
        batch2.create();
        await Promise.all([batch1.assertContentsCorrect(), batch2.assertContentsCorrect()]);
        batch3.create();
        batch4.create();
        await Promise.all([batch3.assertContentsCorrect(), batch4.assertContentsCorrect()]);
        await Promise.all([batch1.assertContentsCorrect(), batch2.assertContentsCorrect()]);
    });
    test('rename not existing resource', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFile = joinPath(parent.resource, 'sourceFile');
        const targetFile = joinPath(parent.resource, 'targetFile');
        try {
            await service.move(sourceFile, targetFile, false);
        }
        catch (error) {
            assert.deepStrictEqual(error.code, FileSystemProviderErrorCode.FileNotFound);
            return;
        }
        assert.fail('This should fail with error');
    });
    test('rename to an existing file without overwrite', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFile = joinPath(parent.resource, 'sourceFile');
        await service.writeFile(sourceFile, VSBuffer.fromString('This is source file'));
        const targetFile = joinPath(parent.resource, 'targetFile');
        await service.writeFile(targetFile, VSBuffer.fromString('This is target file'));
        try {
            await service.move(sourceFile, targetFile, false);
        }
        catch (error) {
            assert.deepStrictEqual(error.fileOperationResult, 4 /* FileOperationResult.FILE_MOVE_CONFLICT */);
            return;
        }
        assert.fail('This should fail with error');
    });
    test('rename folder to an existing folder without overwrite', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFolder = joinPath(parent.resource, 'sourceFolder');
        await service.createFolder(sourceFolder);
        const targetFolder = joinPath(parent.resource, 'targetFolder');
        await service.createFolder(targetFolder);
        try {
            await service.move(sourceFolder, targetFolder, false);
        }
        catch (error) {
            assert.deepStrictEqual(error.fileOperationResult, 4 /* FileOperationResult.FILE_MOVE_CONFLICT */);
            return;
        }
        assert.fail('This should fail with cannot overwrite error');
    });
    test('rename file to a folder', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFile = joinPath(parent.resource, 'sourceFile');
        await service.writeFile(sourceFile, VSBuffer.fromString('This is source file'));
        const targetFolder = joinPath(parent.resource, 'targetFolder');
        await service.createFolder(targetFolder);
        try {
            await service.move(sourceFile, targetFolder, false);
        }
        catch (error) {
            assert.deepStrictEqual(error.fileOperationResult, 4 /* FileOperationResult.FILE_MOVE_CONFLICT */);
            return;
        }
        assert.fail('This should fail with error');
    });
    test('rename folder to a file', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFolder = joinPath(parent.resource, 'sourceFile');
        await service.createFolder(sourceFolder);
        const targetFile = joinPath(parent.resource, 'targetFile');
        await service.writeFile(targetFile, VSBuffer.fromString('This is target file'));
        try {
            await service.move(sourceFolder, targetFile, false);
        }
        catch (error) {
            assert.deepStrictEqual(error.fileOperationResult, 4 /* FileOperationResult.FILE_MOVE_CONFLICT */);
            return;
        }
        assert.fail('This should fail with error');
    });
    test('rename file', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFile = joinPath(parent.resource, 'sourceFile');
        await service.writeFile(sourceFile, VSBuffer.fromString('This is source file'));
        const targetFile = joinPath(parent.resource, 'targetFile');
        await service.move(sourceFile, targetFile, false);
        const content = await service.readFile(targetFile);
        assert.strictEqual(await service.exists(sourceFile), false);
        assert.strictEqual(content.value.toString(), 'This is source file');
    });
    test('rename to an existing file with overwrite', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFile = joinPath(parent.resource, 'sourceFile');
        const targetFile = joinPath(parent.resource, 'targetFile');
        await Promise.all([
            service.writeFile(sourceFile, VSBuffer.fromString('This is source file')),
            service.writeFile(targetFile, VSBuffer.fromString('This is target file')),
        ]);
        await service.move(sourceFile, targetFile, true);
        const content = await service.readFile(targetFile);
        assert.strictEqual(await service.exists(sourceFile), false);
        assert.strictEqual(content.value.toString(), 'This is source file');
    });
    test('rename folder to a new folder', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFolder = joinPath(parent.resource, 'sourceFolder');
        await service.createFolder(sourceFolder);
        const targetFolder = joinPath(parent.resource, 'targetFolder');
        await service.move(sourceFolder, targetFolder, false);
        assert.deepStrictEqual(await service.exists(sourceFolder), false);
        assert.deepStrictEqual(await service.exists(targetFolder), true);
    });
    test('rename folder to an existing folder', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFolder = joinPath(parent.resource, 'sourceFolder');
        await service.createFolder(sourceFolder);
        const targetFolder = joinPath(parent.resource, 'targetFolder');
        await service.createFolder(targetFolder);
        await service.move(sourceFolder, targetFolder, true);
        assert.deepStrictEqual(await service.exists(sourceFolder), false);
        assert.deepStrictEqual(await service.exists(targetFolder), true);
    });
    test('rename a folder that has multiple files and folders', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFolder = joinPath(parent.resource, 'sourceFolder');
        const sourceFile1 = joinPath(sourceFolder, 'folder1', 'file1');
        const sourceFile2 = joinPath(sourceFolder, 'folder2', 'file1');
        const sourceEmptyFolder = joinPath(sourceFolder, 'folder3');
        await Promise.all([
            service.writeFile(sourceFile1, VSBuffer.fromString('Source File 1')),
            service.writeFile(sourceFile2, VSBuffer.fromString('Source File 2')),
            service.createFolder(sourceEmptyFolder),
        ]);
        const targetFolder = joinPath(parent.resource, 'targetFolder');
        const targetFile1 = joinPath(targetFolder, 'folder1', 'file1');
        const targetFile2 = joinPath(targetFolder, 'folder2', 'file1');
        const targetEmptyFolder = joinPath(targetFolder, 'folder3');
        await service.move(sourceFolder, targetFolder, false);
        assert.deepStrictEqual(await service.exists(sourceFolder), false);
        assert.deepStrictEqual(await service.exists(targetFolder), true);
        assert.strictEqual((await service.readFile(targetFile1)).value.toString(), 'Source File 1');
        assert.strictEqual((await service.readFile(targetFile2)).value.toString(), 'Source File 2');
        assert.deepStrictEqual(await service.exists(targetEmptyFolder), true);
    });
    test('rename a folder to another folder that has some files', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const sourceFolder = joinPath(parent.resource, 'sourceFolder');
        const sourceFile1 = joinPath(sourceFolder, 'folder1', 'file1');
        const targetFolder = joinPath(parent.resource, 'targetFolder');
        const targetFile1 = joinPath(targetFolder, 'folder1', 'file1');
        const targetFile2 = joinPath(targetFolder, 'folder1', 'file2');
        const targetFile3 = joinPath(targetFolder, 'folder2', 'file1');
        await Promise.all([
            service.writeFile(sourceFile1, VSBuffer.fromString('Source File 1')),
            service.writeFile(targetFile2, VSBuffer.fromString('Target File 2')),
            service.writeFile(targetFile3, VSBuffer.fromString('Target File 3')),
        ]);
        await service.move(sourceFolder, targetFolder, true);
        assert.deepStrictEqual(await service.exists(sourceFolder), false);
        assert.deepStrictEqual(await service.exists(targetFolder), true);
        assert.strictEqual((await service.readFile(targetFile1)).value.toString(), 'Source File 1');
        assert.strictEqual(await service.exists(targetFile2), false);
        assert.strictEqual(await service.exists(targetFile3), false);
    });
    test('deleteFile', async () => {
        await initFixtures();
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const anotherResource = userdataURIFromPaths(['fixtures', 'service', 'deep', 'company.js']);
        const resource = userdataURIFromPaths(['fixtures', 'service', 'deep', 'conway.js']);
        const source = await service.resolve(resource);
        assert.strictEqual(await service.canDelete(source.resource, { useTrash: false }), true);
        await service.del(source.resource, { useTrash: false });
        assert.strictEqual(await service.exists(source.resource), false);
        assert.strictEqual(await service.exists(anotherResource), true);
        assert.ok(event);
        assert.strictEqual(event.resource.path, resource.path);
        assert.strictEqual(event.operation, 1 /* FileOperation.DELETE */);
        {
            let error = undefined;
            try {
                await service.del(source.resource, { useTrash: false });
            }
            catch (e) {
                error = e;
            }
            assert.ok(error);
            assert.strictEqual(error.fileOperationResult, 1 /* FileOperationResult.FILE_NOT_FOUND */);
        }
        await reload();
        {
            let error = undefined;
            try {
                await service.del(source.resource, { useTrash: false });
            }
            catch (e) {
                error = e;
            }
            assert.ok(error);
            assert.strictEqual(error.fileOperationResult, 1 /* FileOperationResult.FILE_NOT_FOUND */);
        }
    });
    test('deleteFolder (recursive)', async () => {
        await initFixtures();
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const resource = userdataURIFromPaths(['fixtures', 'service', 'deep']);
        const subResource1 = userdataURIFromPaths(['fixtures', 'service', 'deep', 'company.js']);
        const subResource2 = userdataURIFromPaths(['fixtures', 'service', 'deep', 'conway.js']);
        assert.strictEqual(await service.exists(subResource1), true);
        assert.strictEqual(await service.exists(subResource2), true);
        const source = await service.resolve(resource);
        assert.strictEqual(await service.canDelete(source.resource, { recursive: true, useTrash: false }), true);
        await service.del(source.resource, { recursive: true, useTrash: false });
        assert.strictEqual(await service.exists(source.resource), false);
        assert.strictEqual(await service.exists(subResource1), false);
        assert.strictEqual(await service.exists(subResource2), false);
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, resource.fsPath);
        assert.strictEqual(event.operation, 1 /* FileOperation.DELETE */);
    });
    test('deleteFolder (non recursive)', async () => {
        await initFixtures();
        const resource = userdataURIFromPaths(['fixtures', 'service', 'deep']);
        const source = await service.resolve(resource);
        assert.ok((await service.canDelete(source.resource)) instanceof Error);
        let error;
        try {
            await service.del(source.resource);
        }
        catch (e) {
            error = e;
        }
        assert.ok(error);
    });
    test('delete empty folder', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const folder = joinPath(parent.resource, 'folder');
        await service.createFolder(folder);
        await service.del(folder);
        assert.deepStrictEqual(await service.exists(folder), false);
    });
    test('delete empty folder with reccursive', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const folder = joinPath(parent.resource, 'folder');
        await service.createFolder(folder);
        await service.del(folder, { recursive: true });
        assert.deepStrictEqual(await service.exists(folder), false);
    });
    test('deleteFolder with folders and files (recursive)', async () => {
        const parent = await service.resolve(userdataURIFromPaths([]));
        const targetFolder = joinPath(parent.resource, 'targetFolder');
        const file1 = joinPath(targetFolder, 'folder1', 'file1');
        await service.createFile(file1);
        const file2 = joinPath(targetFolder, 'folder2', 'file1');
        await service.createFile(file2);
        const emptyFolder = joinPath(targetFolder, 'folder3');
        await service.createFolder(emptyFolder);
        await service.del(targetFolder, { recursive: true });
        assert.deepStrictEqual(await service.exists(targetFolder), false);
        assert.deepStrictEqual(await service.exists(joinPath(targetFolder, 'folder1')), false);
        assert.deepStrictEqual(await service.exists(joinPath(targetFolder, 'folder2')), false);
        assert.deepStrictEqual(await service.exists(file1), false);
        assert.deepStrictEqual(await service.exists(file2), false);
        assert.deepStrictEqual(await service.exists(emptyFolder), false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhlZERCRmlsZVNlcnZpY2UuaW50ZWdyYXRpb25UZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvdGVzdC9icm93c2VyL2luZGV4ZWREQkZpbGVTZXJ2aWNlLmludGVncmF0aW9uVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsY0FBYyxFQUNkLFFBQVEsR0FHUixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzFGLE9BQU8sRUFNTiwyQkFBMkIsRUFDM0IsUUFBUSxHQUNSLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUUzRCxVQUFVLENBQUMsNkJBQTZCLEVBQUU7SUFDekMsSUFBSSxPQUFvQixDQUFBO0lBQ3hCLElBQUksb0JBQWlELENBQUE7SUFDckQsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFB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