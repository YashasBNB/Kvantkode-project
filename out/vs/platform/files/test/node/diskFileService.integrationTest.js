/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { createReadStream, existsSync, readdirSync, readFileSync, statSync, writeFileSync, promises, } from 'fs';
import { tmpdir } from 'os';
import { timeout } from '../../../../base/common/async.js';
import { bufferToReadable, bufferToStream, streamToBuffer, streamToBufferReadableStream, VSBuffer, } from '../../../../base/common/buffer.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { FileAccess, Schemas } from '../../../../base/common/network.js';
import { basename, dirname, join, posix } from '../../../../base/common/path.js';
import { isLinux, isWindows } from '../../../../base/common/platform.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { Promises } from '../../../../base/node/pfs.js';
import { flakySuite, getRandomTestPath } from '../../../../base/test/node/testUtils.js';
import { etag, FileOperationError, FilePermission, hasFileAtomicReadCapability, hasOpenReadWriteCloseCapability, NotModifiedSinceFileOperationError, TooLargeFileOperationError, } from '../../common/files.js';
import { FileService } from '../../common/fileService.js';
import { DiskFileSystemProvider } from '../../node/diskFileSystemProvider.js';
import { NullLogService } from '../../../log/common/log.js';
function getByName(root, name) {
    if (root.children === undefined) {
        return undefined;
    }
    return root.children.find((child) => child.name === name);
}
function toLineByLineReadable(content) {
    let chunks = content.split('\n');
    chunks = chunks.map((chunk, index) => {
        if (index === 0) {
            return chunk;
        }
        return '\n' + chunk;
    });
    return {
        read() {
            const chunk = chunks.shift();
            if (typeof chunk === 'string') {
                return VSBuffer.fromString(chunk);
            }
            return null;
        },
    };
}
export class TestDiskFileSystemProvider extends DiskFileSystemProvider {
    constructor() {
        super(...arguments);
        this.totalBytesRead = 0;
        this.invalidStatSize = false;
        this.smallStatSize = false;
        this.readonly = false;
    }
    get capabilities() {
        if (!this._testCapabilities) {
            this._testCapabilities =
                2 /* FileSystemProviderCapabilities.FileReadWrite */ |
                    4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */ |
                    16 /* FileSystemProviderCapabilities.FileReadStream */ |
                    4096 /* FileSystemProviderCapabilities.Trash */ |
                    8 /* FileSystemProviderCapabilities.FileFolderCopy */ |
                    8192 /* FileSystemProviderCapabilities.FileWriteUnlock */ |
                    16384 /* FileSystemProviderCapabilities.FileAtomicRead */ |
                    32768 /* FileSystemProviderCapabilities.FileAtomicWrite */ |
                    65536 /* FileSystemProviderCapabilities.FileAtomicDelete */ |
                    131072 /* FileSystemProviderCapabilities.FileClone */;
            if (isLinux) {
                this._testCapabilities |= 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
            }
        }
        return this._testCapabilities;
    }
    set capabilities(capabilities) {
        this._testCapabilities = capabilities;
    }
    setInvalidStatSize(enabled) {
        this.invalidStatSize = enabled;
    }
    setSmallStatSize(enabled) {
        this.smallStatSize = enabled;
    }
    setReadonly(readonly) {
        this.readonly = readonly;
    }
    async stat(resource) {
        const res = await super.stat(resource);
        if (this.invalidStatSize) {
            ;
            res.size = String(res.size); // for https://github.com/microsoft/vscode/issues/72909
        }
        else if (this.smallStatSize) {
            ;
            res.size = 1;
        }
        else if (this.readonly) {
            ;
            res.permissions = FilePermission.Readonly;
        }
        return res;
    }
    async read(fd, pos, data, offset, length) {
        const bytesRead = await super.read(fd, pos, data, offset, length);
        this.totalBytesRead += bytesRead;
        return bytesRead;
    }
    async readFile(resource, options) {
        const res = await super.readFile(resource, options);
        this.totalBytesRead += res.byteLength;
        return res;
    }
}
DiskFileSystemProvider.configureFlushOnWrite(false); // speed up all unit tests by disabling flush on write
flakySuite('Disk File Service', function () {
    const testSchema = 'test';
    let service;
    let fileProvider;
    let testProvider;
    let testDir;
    const disposables = new DisposableStore();
    setup(async () => {
        const logService = new NullLogService();
        service = disposables.add(new FileService(logService));
        fileProvider = disposables.add(new TestDiskFileSystemProvider(logService));
        disposables.add(service.registerProvider(Schemas.file, fileProvider));
        testProvider = disposables.add(new TestDiskFileSystemProvider(logService));
        disposables.add(service.registerProvider(testSchema, testProvider));
        testDir = getRandomTestPath(tmpdir(), 'vsctests', 'diskfileservice');
        const sourceDir = FileAccess.asFileUri('vs/platform/files/test/node/fixtures/service').fsPath;
        await Promises.copy(sourceDir, testDir, { preserveSymlinks: false });
    });
    teardown(() => {
        disposables.clear();
        return Promises.rm(testDir);
    });
    test('createFolder', async () => {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const parent = await service.resolve(URI.file(testDir));
        const newFolderResource = URI.file(join(parent.resource.fsPath, 'newFolder'));
        const newFolder = await service.createFolder(newFolderResource);
        assert.strictEqual(newFolder.name, 'newFolder');
        assert.strictEqual(existsSync(newFolder.resource.fsPath), true);
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, newFolderResource.fsPath);
        assert.strictEqual(event.operation, 0 /* FileOperation.CREATE */);
        assert.strictEqual(event.target.resource.fsPath, newFolderResource.fsPath);
        assert.strictEqual(event.target.isDirectory, true);
    });
    test('createFolder: creating multiple folders at once', async () => {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const multiFolderPaths = ['a', 'couple', 'of', 'folders'];
        const parent = await service.resolve(URI.file(testDir));
        const newFolderResource = URI.file(join(parent.resource.fsPath, ...multiFolderPaths));
        const newFolder = await service.createFolder(newFolderResource);
        const lastFolderName = multiFolderPaths[multiFolderPaths.length - 1];
        assert.strictEqual(newFolder.name, lastFolderName);
        assert.strictEqual(existsSync(newFolder.resource.fsPath), true);
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, newFolderResource.fsPath);
        assert.strictEqual(event.operation, 0 /* FileOperation.CREATE */);
        assert.strictEqual(event.target.resource.fsPath, newFolderResource.fsPath);
        assert.strictEqual(event.target.isDirectory, true);
    });
    test('exists', async () => {
        let exists = await service.exists(URI.file(testDir));
        assert.strictEqual(exists, true);
        exists = await service.exists(URI.file(testDir + 'something'));
        assert.strictEqual(exists, false);
    });
    test('resolve - file', async () => {
        const resource = FileAccess.asFileUri('vs/platform/files/test/node/fixtures/resolver/index.html');
        const resolved = await service.resolve(resource);
        assert.strictEqual(resolved.name, 'index.html');
        assert.strictEqual(resolved.isFile, true);
        assert.strictEqual(resolved.isDirectory, false);
        assert.strictEqual(resolved.readonly, false);
        assert.strictEqual(resolved.isSymbolicLink, false);
        assert.strictEqual(resolved.resource.toString(), resource.toString());
        assert.strictEqual(resolved.children, undefined);
        assert.ok(resolved.mtime > 0);
        assert.ok(resolved.ctime > 0);
        assert.ok(resolved.size > 0);
    });
    test('resolve - directory', async () => {
        const testsElements = ['examples', 'other', 'index.html', 'site.css'];
        const resource = FileAccess.asFileUri('vs/platform/files/test/node/fixtures/resolver');
        const result = await service.resolve(resource);
        assert.ok(result);
        assert.strictEqual(result.resource.toString(), resource.toString());
        assert.strictEqual(result.name, 'resolver');
        assert.ok(result.children);
        assert.ok(result.children.length > 0);
        assert.ok(result.isDirectory);
        assert.strictEqual(result.readonly, false);
        assert.ok(result.mtime > 0);
        assert.ok(result.ctime > 0);
        assert.strictEqual(result.children.length, testsElements.length);
        assert.ok(result.children.every((entry) => {
            return testsElements.some((name) => {
                return basename(entry.resource.fsPath) === name;
            });
        }));
        result.children.forEach((value) => {
            assert.ok(basename(value.resource.fsPath));
            if (['examples', 'other'].indexOf(basename(value.resource.fsPath)) >= 0) {
                assert.ok(value.isDirectory);
                assert.strictEqual(value.mtime, undefined);
                assert.strictEqual(value.ctime, undefined);
            }
            else if (basename(value.resource.fsPath) === 'index.html') {
                assert.ok(!value.isDirectory);
                assert.ok(!value.children);
                assert.strictEqual(value.mtime, undefined);
                assert.strictEqual(value.ctime, undefined);
            }
            else if (basename(value.resource.fsPath) === 'site.css') {
                assert.ok(!value.isDirectory);
                assert.ok(!value.children);
                assert.strictEqual(value.mtime, undefined);
                assert.strictEqual(value.ctime, undefined);
            }
            else {
                assert.fail('Unexpected value ' + basename(value.resource.fsPath));
            }
        });
    });
    test('resolve - directory - with metadata', async () => {
        const testsElements = ['examples', 'other', 'index.html', 'site.css'];
        const result = await service.resolve(FileAccess.asFileUri('vs/platform/files/test/node/fixtures/resolver'), { resolveMetadata: true });
        assert.ok(result);
        assert.strictEqual(result.name, 'resolver');
        assert.ok(result.children);
        assert.ok(result.children.length > 0);
        assert.ok(result.isDirectory);
        assert.ok(result.mtime > 0);
        assert.ok(result.ctime > 0);
        assert.strictEqual(result.children.length, testsElements.length);
        assert.ok(result.children.every((entry) => {
            return testsElements.some((name) => {
                return basename(entry.resource.fsPath) === name;
            });
        }));
        assert.ok(result.children.every((entry) => entry.etag.length > 0));
        result.children.forEach((value) => {
            assert.ok(basename(value.resource.fsPath));
            if (['examples', 'other'].indexOf(basename(value.resource.fsPath)) >= 0) {
                assert.ok(value.isDirectory);
                assert.ok(value.mtime > 0);
                assert.ok(value.ctime > 0);
            }
            else if (basename(value.resource.fsPath) === 'index.html') {
                assert.ok(!value.isDirectory);
                assert.ok(!value.children);
                assert.ok(value.mtime > 0);
                assert.ok(value.ctime > 0);
            }
            else if (basename(value.resource.fsPath) === 'site.css') {
                assert.ok(!value.isDirectory);
                assert.ok(!value.children);
                assert.ok(value.mtime > 0);
                assert.ok(value.ctime > 0);
            }
            else {
                assert.fail('Unexpected value ' + basename(value.resource.fsPath));
            }
        });
    });
    test('resolve - directory with resolveTo', async () => {
        const resolved = await service.resolve(URI.file(testDir), {
            resolveTo: [URI.file(join(testDir, 'deep'))],
        });
        assert.strictEqual(resolved.children.length, 8);
        const deep = getByName(resolved, 'deep');
        assert.strictEqual(deep.children.length, 4);
    });
    test('resolve - directory - resolveTo single directory', async () => {
        const resolverFixturesPath = FileAccess.asFileUri('vs/platform/files/test/node/fixtures/resolver').fsPath;
        const result = await service.resolve(URI.file(resolverFixturesPath), {
            resolveTo: [URI.file(join(resolverFixturesPath, 'other/deep'))],
        });
        assert.ok(result);
        assert.ok(result.children);
        assert.ok(result.children.length > 0);
        assert.ok(result.isDirectory);
        const children = result.children;
        assert.strictEqual(children.length, 4);
        const other = getByName(result, 'other');
        assert.ok(other);
        assert.ok(other.children.length > 0);
        const deep = getByName(other, 'deep');
        assert.ok(deep);
        assert.ok(deep.children.length > 0);
        assert.strictEqual(deep.children.length, 4);
    });
    test('resolve directory - resolveTo multiple directories', () => {
        return testResolveDirectoryWithTarget(false);
    });
    test('resolve directory - resolveTo with a URI that has query parameter (https://github.com/microsoft/vscode/issues/128151)', () => {
        return testResolveDirectoryWithTarget(true);
    });
    async function testResolveDirectoryWithTarget(withQueryParam) {
        const resolverFixturesPath = FileAccess.asFileUri('vs/platform/files/test/node/fixtures/resolver').fsPath;
        const result = await service.resolve(URI.file(resolverFixturesPath).with({ query: withQueryParam ? 'test' : undefined }), {
            resolveTo: [
                URI.file(join(resolverFixturesPath, 'other/deep')).with({
                    query: withQueryParam ? 'test' : undefined,
                }),
                URI.file(join(resolverFixturesPath, 'examples')).with({
                    query: withQueryParam ? 'test' : undefined,
                }),
            ],
        });
        assert.ok(result);
        assert.ok(result.children);
        assert.ok(result.children.length > 0);
        assert.ok(result.isDirectory);
        const children = result.children;
        assert.strictEqual(children.length, 4);
        const other = getByName(result, 'other');
        assert.ok(other);
        assert.ok(other.children.length > 0);
        const deep = getByName(other, 'deep');
        assert.ok(deep);
        assert.ok(deep.children.length > 0);
        assert.strictEqual(deep.children.length, 4);
        const examples = getByName(result, 'examples');
        assert.ok(examples);
        assert.ok(examples.children.length > 0);
        assert.strictEqual(examples.children.length, 4);
    }
    test('resolve directory - resolveSingleChildFolders', async () => {
        const resolverFixturesPath = FileAccess.asFileUri('vs/platform/files/test/node/fixtures/resolver/other').fsPath;
        const result = await service.resolve(URI.file(resolverFixturesPath), {
            resolveSingleChildDescendants: true,
        });
        assert.ok(result);
        assert.ok(result.children);
        assert.ok(result.children.length > 0);
        assert.ok(result.isDirectory);
        const children = result.children;
        assert.strictEqual(children.length, 1);
        const deep = getByName(result, 'deep');
        assert.ok(deep);
        assert.ok(deep.children.length > 0);
        assert.strictEqual(deep.children.length, 4);
    });
    test('resolves', async () => {
        const res = await service.resolveAll([
            { resource: URI.file(testDir), options: { resolveTo: [URI.file(join(testDir, 'deep'))] } },
            { resource: URI.file(join(testDir, 'deep')) },
        ]);
        const r1 = res[0].stat;
        assert.strictEqual(r1.children.length, 8);
        const deep = getByName(r1, 'deep');
        assert.strictEqual(deep.children.length, 4);
        const r2 = res[1].stat;
        assert.strictEqual(r2.children.length, 4);
        assert.strictEqual(r2.name, 'deep');
    });
    test('resolve - folder symbolic link', async () => {
        const link = URI.file(join(testDir, 'deep-link'));
        await promises.symlink(join(testDir, 'deep'), link.fsPath, 'junction');
        const resolved = await service.resolve(link);
        assert.strictEqual(resolved.children.length, 4);
        assert.strictEqual(resolved.isDirectory, true);
        assert.strictEqual(resolved.isSymbolicLink, true);
    });
    (isWindows
        ? test.skip /* windows: cannot create file symbolic link without elevated context */
        : test)('resolve - file symbolic link', async () => {
        const link = URI.file(join(testDir, 'lorem.txt-linked'));
        await promises.symlink(join(testDir, 'lorem.txt'), link.fsPath);
        const resolved = await service.resolve(link);
        assert.strictEqual(resolved.isDirectory, false);
        assert.strictEqual(resolved.isSymbolicLink, true);
    });
    test('resolve - symbolic link pointing to nonexistent file does not break', async () => {
        await promises.symlink(join(testDir, 'foo'), join(testDir, 'bar'), 'junction');
        const resolved = await service.resolve(URI.file(testDir));
        assert.strictEqual(resolved.isDirectory, true);
        assert.strictEqual(resolved.children.length, 9);
        const resolvedLink = resolved.children?.find((child) => child.name === 'bar' && child.isSymbolicLink);
        assert.ok(resolvedLink);
        assert.ok(!resolvedLink?.isDirectory);
        assert.ok(!resolvedLink?.isFile);
    });
    test('stat - file', async () => {
        const resource = FileAccess.asFileUri('vs/platform/files/test/node/fixtures/resolver/index.html');
        const resolved = await service.stat(resource);
        assert.strictEqual(resolved.name, 'index.html');
        assert.strictEqual(resolved.isFile, true);
        assert.strictEqual(resolved.isDirectory, false);
        assert.strictEqual(resolved.readonly, false);
        assert.strictEqual(resolved.isSymbolicLink, false);
        assert.strictEqual(resolved.resource.toString(), resource.toString());
        assert.ok(resolved.mtime > 0);
        assert.ok(resolved.ctime > 0);
        assert.ok(resolved.size > 0);
    });
    test('stat - directory', async () => {
        const resource = FileAccess.asFileUri('vs/platform/files/test/node/fixtures/resolver');
        const result = await service.stat(resource);
        assert.ok(result);
        assert.strictEqual(result.resource.toString(), resource.toString());
        assert.strictEqual(result.name, 'resolver');
        assert.ok(result.isDirectory);
        assert.strictEqual(result.readonly, false);
        assert.ok(result.mtime > 0);
        assert.ok(result.ctime > 0);
    });
    test('deleteFile (non recursive)', async () => {
        return testDeleteFile(false, false);
    });
    test('deleteFile (recursive)', async () => {
        return testDeleteFile(false, true);
    });
    (isLinux /* trash is unreliable on Linux */ ? test.skip : test)('deleteFile (useTrash)', async () => {
        return testDeleteFile(true, false);
    });
    async function testDeleteFile(useTrash, recursive) {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const resource = URI.file(join(testDir, 'deep', 'conway.js'));
        const source = await service.resolve(resource);
        assert.strictEqual(await service.canDelete(source.resource, { useTrash, recursive }), true);
        await service.del(source.resource, { useTrash, recursive });
        assert.strictEqual(existsSync(source.resource.fsPath), false);
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, resource.fsPath);
        assert.strictEqual(event.operation, 1 /* FileOperation.DELETE */);
        let error = undefined;
        try {
            await service.del(source.resource, { useTrash, recursive });
        }
        catch (e) {
            error = e;
        }
        assert.ok(error);
        assert.strictEqual(error.fileOperationResult, 1 /* FileOperationResult.FILE_NOT_FOUND */);
    }
    ;
    (isWindows
        ? test.skip /* windows: cannot create file symbolic link without elevated context */
        : test)('deleteFile - symbolic link (exists)', async () => {
        const target = URI.file(join(testDir, 'lorem.txt'));
        const link = URI.file(join(testDir, 'lorem.txt-linked'));
        await promises.symlink(target.fsPath, link.fsPath);
        const source = await service.resolve(link);
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        assert.strictEqual(await service.canDelete(source.resource), true);
        await service.del(source.resource);
        assert.strictEqual(existsSync(source.resource.fsPath), false);
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, link.fsPath);
        assert.strictEqual(event.operation, 1 /* FileOperation.DELETE */);
        assert.strictEqual(existsSync(target.fsPath), true); // target the link pointed to is never deleted
    });
    (isWindows
        ? test.skip /* windows: cannot create file symbolic link without elevated context */
        : test)('deleteFile - symbolic link (pointing to nonexistent file)', async () => {
        const target = URI.file(join(testDir, 'foo'));
        const link = URI.file(join(testDir, 'bar'));
        await promises.symlink(target.fsPath, link.fsPath);
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        assert.strictEqual(await service.canDelete(link), true);
        await service.del(link);
        assert.strictEqual(existsSync(link.fsPath), false);
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, link.fsPath);
        assert.strictEqual(event.operation, 1 /* FileOperation.DELETE */);
    });
    test('deleteFolder (recursive)', async () => {
        return testDeleteFolderRecursive(false, false);
    });
    test('deleteFolder (recursive, atomic)', async () => {
        return testDeleteFolderRecursive(false, { postfix: '.vsctmp' });
    });
    (isLinux /* trash is unreliable on Linux */ ? test.skip : test)('deleteFolder (recursive, useTrash)', async () => {
        return testDeleteFolderRecursive(true, false);
    });
    async function testDeleteFolderRecursive(useTrash, atomic) {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const resource = URI.file(join(testDir, 'deep'));
        const source = await service.resolve(resource);
        assert.strictEqual(await service.canDelete(source.resource, { recursive: true, useTrash, atomic }), true);
        await service.del(source.resource, { recursive: true, useTrash, atomic });
        assert.strictEqual(existsSync(source.resource.fsPath), false);
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, resource.fsPath);
        assert.strictEqual(event.operation, 1 /* FileOperation.DELETE */);
    }
    test('deleteFolder (non recursive)', async () => {
        const resource = URI.file(join(testDir, 'deep'));
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
    test('deleteFolder empty folder (recursive)', () => {
        return testDeleteEmptyFolder(true);
    });
    test('deleteFolder empty folder (non recursive)', () => {
        return testDeleteEmptyFolder(false);
    });
    async function testDeleteEmptyFolder(recursive) {
        const { resource } = await service.createFolder(URI.file(join(testDir, 'deep', 'empty')));
        await service.del(resource, { recursive });
        assert.strictEqual(await service.exists(resource), false);
    }
    test('move', async () => {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const source = URI.file(join(testDir, 'index.html'));
        const sourceContents = readFileSync(source.fsPath);
        const target = URI.file(join(dirname(source.fsPath), 'other.html'));
        assert.strictEqual(await service.canMove(source, target), true);
        const renamed = await service.move(source, target);
        assert.strictEqual(existsSync(renamed.resource.fsPath), true);
        assert.strictEqual(existsSync(source.fsPath), false);
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, source.fsPath);
        assert.strictEqual(event.operation, 2 /* FileOperation.MOVE */);
        assert.strictEqual(event.target.resource.fsPath, renamed.resource.fsPath);
        const targetContents = readFileSync(target.fsPath);
        assert.strictEqual(sourceContents.byteLength, targetContents.byteLength);
        assert.strictEqual(sourceContents.toString(), targetContents.toString());
    });
    test('move - across providers (buffered => buffered)', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        setCapabilities(testProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testMoveAcrossProviders();
    });
    test('move - across providers (unbuffered => unbuffered)', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        setCapabilities(testProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testMoveAcrossProviders();
    });
    test('move - across providers (buffered => unbuffered)', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        setCapabilities(testProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testMoveAcrossProviders();
    });
    test('move - across providers (unbuffered => buffered)', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        setCapabilities(testProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testMoveAcrossProviders();
    });
    test('move - across providers - large (buffered => buffered)', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        setCapabilities(testProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testMoveAcrossProviders('lorem.txt');
    });
    test('move - across providers - large (unbuffered => unbuffered)', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        setCapabilities(testProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testMoveAcrossProviders('lorem.txt');
    });
    test('move - across providers - large (buffered => unbuffered)', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        setCapabilities(testProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testMoveAcrossProviders('lorem.txt');
    });
    test('move - across providers - large (unbuffered => buffered)', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        setCapabilities(testProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testMoveAcrossProviders('lorem.txt');
    });
    async function testMoveAcrossProviders(sourceFile = 'index.html') {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const source = URI.file(join(testDir, sourceFile));
        const sourceContents = readFileSync(source.fsPath);
        const target = URI.file(join(dirname(source.fsPath), 'other.html')).with({ scheme: testSchema });
        assert.strictEqual(await service.canMove(source, target), true);
        const renamed = await service.move(source, target);
        assert.strictEqual(existsSync(renamed.resource.fsPath), true);
        assert.strictEqual(existsSync(source.fsPath), false);
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, source.fsPath);
        assert.strictEqual(event.operation, 3 /* FileOperation.COPY */);
        assert.strictEqual(event.target.resource.fsPath, renamed.resource.fsPath);
        const targetContents = readFileSync(target.fsPath);
        assert.strictEqual(sourceContents.byteLength, targetContents.byteLength);
        assert.strictEqual(sourceContents.toString(), targetContents.toString());
    }
    test('move - multi folder', async () => {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const multiFolderPaths = ['a', 'couple', 'of', 'folders'];
        const renameToPath = join(...multiFolderPaths, 'other.html');
        const source = URI.file(join(testDir, 'index.html'));
        assert.strictEqual(await service.canMove(source, URI.file(join(dirname(source.fsPath), renameToPath))), true);
        const renamed = await service.move(source, URI.file(join(dirname(source.fsPath), renameToPath)));
        assert.strictEqual(existsSync(renamed.resource.fsPath), true);
        assert.strictEqual(existsSync(source.fsPath), false);
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, source.fsPath);
        assert.strictEqual(event.operation, 2 /* FileOperation.MOVE */);
        assert.strictEqual(event.target.resource.fsPath, renamed.resource.fsPath);
    });
    test('move - directory', async () => {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const source = URI.file(join(testDir, 'deep'));
        assert.strictEqual(await service.canMove(source, URI.file(join(dirname(source.fsPath), 'deeper'))), true);
        const renamed = await service.move(source, URI.file(join(dirname(source.fsPath), 'deeper')));
        assert.strictEqual(existsSync(renamed.resource.fsPath), true);
        assert.strictEqual(existsSync(source.fsPath), false);
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, source.fsPath);
        assert.strictEqual(event.operation, 2 /* FileOperation.MOVE */);
        assert.strictEqual(event.target.resource.fsPath, renamed.resource.fsPath);
    });
    test('move - directory - across providers (buffered => buffered)', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        setCapabilities(testProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testMoveFolderAcrossProviders();
    });
    test('move - directory - across providers (unbuffered => unbuffered)', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        setCapabilities(testProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testMoveFolderAcrossProviders();
    });
    test('move - directory - across providers (buffered => unbuffered)', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        setCapabilities(testProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testMoveFolderAcrossProviders();
    });
    test('move - directory - across providers (unbuffered => buffered)', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        setCapabilities(testProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testMoveFolderAcrossProviders();
    });
    async function testMoveFolderAcrossProviders() {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const source = URI.file(join(testDir, 'deep'));
        const sourceChildren = readdirSync(source.fsPath);
        const target = URI.file(join(dirname(source.fsPath), 'deeper')).with({ scheme: testSchema });
        assert.strictEqual(await service.canMove(source, target), true);
        const renamed = await service.move(source, target);
        assert.strictEqual(existsSync(renamed.resource.fsPath), true);
        assert.strictEqual(existsSync(source.fsPath), false);
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, source.fsPath);
        assert.strictEqual(event.operation, 3 /* FileOperation.COPY */);
        assert.strictEqual(event.target.resource.fsPath, renamed.resource.fsPath);
        const targetChildren = readdirSync(target.fsPath);
        assert.strictEqual(sourceChildren.length, targetChildren.length);
        for (let i = 0; i < sourceChildren.length; i++) {
            assert.strictEqual(sourceChildren[i], targetChildren[i]);
        }
    }
    test('move - MIX CASE', async () => {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const source = await service.resolve(URI.file(join(testDir, 'index.html')), {
            resolveMetadata: true,
        });
        assert.ok(source.size > 0);
        const renamedResource = URI.file(join(dirname(source.resource.fsPath), 'INDEX.html'));
        assert.strictEqual(await service.canMove(source.resource, renamedResource), true);
        let renamed = await service.move(source.resource, renamedResource);
        assert.strictEqual(existsSync(renamedResource.fsPath), true);
        assert.strictEqual(basename(renamedResource.fsPath), 'INDEX.html');
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, source.resource.fsPath);
        assert.strictEqual(event.operation, 2 /* FileOperation.MOVE */);
        assert.strictEqual(event.target.resource.fsPath, renamedResource.fsPath);
        renamed = await service.resolve(renamedResource, { resolveMetadata: true });
        assert.strictEqual(source.size, renamed.size);
    });
    test('move - same file', async () => {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const source = await service.resolve(URI.file(join(testDir, 'index.html')), {
            resolveMetadata: true,
        });
        assert.ok(source.size > 0);
        assert.strictEqual(await service.canMove(source.resource, URI.file(source.resource.fsPath)), true);
        let renamed = await service.move(source.resource, URI.file(source.resource.fsPath));
        assert.strictEqual(existsSync(renamed.resource.fsPath), true);
        assert.strictEqual(basename(renamed.resource.fsPath), 'index.html');
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, source.resource.fsPath);
        assert.strictEqual(event.operation, 2 /* FileOperation.MOVE */);
        assert.strictEqual(event.target.resource.fsPath, renamed.resource.fsPath);
        renamed = await service.resolve(renamed.resource, { resolveMetadata: true });
        assert.strictEqual(source.size, renamed.size);
    });
    test('move - same file #2', async () => {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const source = await service.resolve(URI.file(join(testDir, 'index.html')), {
            resolveMetadata: true,
        });
        assert.ok(source.size > 0);
        const targetParent = URI.file(testDir);
        const target = targetParent.with({
            path: posix.join(targetParent.path, posix.basename(source.resource.path)),
        });
        assert.strictEqual(await service.canMove(source.resource, target), true);
        let renamed = await service.move(source.resource, target);
        assert.strictEqual(existsSync(renamed.resource.fsPath), true);
        assert.strictEqual(basename(renamed.resource.fsPath), 'index.html');
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, source.resource.fsPath);
        assert.strictEqual(event.operation, 2 /* FileOperation.MOVE */);
        assert.strictEqual(event.target.resource.fsPath, renamed.resource.fsPath);
        renamed = await service.resolve(renamed.resource, { resolveMetadata: true });
        assert.strictEqual(source.size, renamed.size);
    });
    test('move - source parent of target', async () => {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        let source = await service.resolve(URI.file(join(testDir, 'index.html')), {
            resolveMetadata: true,
        });
        const originalSize = source.size;
        assert.ok(originalSize > 0);
        assert.ok((await service.canMove(URI.file(testDir), URI.file(join(testDir, 'binary.txt')))) instanceof
            Error);
        let error;
        try {
            await service.move(URI.file(testDir), URI.file(join(testDir, 'binary.txt')));
        }
        catch (e) {
            error = e;
        }
        assert.ok(error);
        assert.ok(!event);
        source = await service.resolve(source.resource, { resolveMetadata: true });
        assert.strictEqual(originalSize, source.size);
    });
    test('move - FILE_MOVE_CONFLICT', async () => {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        let source = await service.resolve(URI.file(join(testDir, 'index.html')), {
            resolveMetadata: true,
        });
        const originalSize = source.size;
        assert.ok(originalSize > 0);
        assert.ok((await service.canMove(source.resource, URI.file(join(testDir, 'binary.txt')))) instanceof
            Error);
        let error;
        try {
            await service.move(source.resource, URI.file(join(testDir, 'binary.txt')));
        }
        catch (e) {
            error = e;
        }
        assert.strictEqual(error.fileOperationResult, 4 /* FileOperationResult.FILE_MOVE_CONFLICT */);
        assert.ok(!event);
        source = await service.resolve(source.resource, { resolveMetadata: true });
        assert.strictEqual(originalSize, source.size);
    });
    test('move - overwrite folder with file', async () => {
        let createEvent;
        let moveEvent;
        let deleteEvent;
        disposables.add(service.onDidRunOperation((e) => {
            if (e.operation === 0 /* FileOperation.CREATE */) {
                createEvent = e;
            }
            else if (e.operation === 1 /* FileOperation.DELETE */) {
                deleteEvent = e;
            }
            else if (e.operation === 2 /* FileOperation.MOVE */) {
                moveEvent = e;
            }
        }));
        const parent = await service.resolve(URI.file(testDir));
        const folderResource = URI.file(join(parent.resource.fsPath, 'conway.js'));
        const f = await service.createFolder(folderResource);
        const source = URI.file(join(testDir, 'deep', 'conway.js'));
        assert.strictEqual(await service.canMove(source, f.resource, true), true);
        const moved = await service.move(source, f.resource, true);
        assert.strictEqual(existsSync(moved.resource.fsPath), true);
        assert.ok(statSync(moved.resource.fsPath).isFile);
        assert.ok(createEvent);
        assert.ok(deleteEvent);
        assert.ok(moveEvent);
        assert.strictEqual(moveEvent.resource.fsPath, source.fsPath);
        assert.strictEqual(moveEvent.target.resource.fsPath, moved.resource.fsPath);
        assert.strictEqual(deleteEvent.resource.fsPath, folderResource.fsPath);
    });
    test('copy', async () => {
        await doTestCopy();
    });
    test('copy - unbuffered (FileSystemProviderCapabilities.FileReadWrite)', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        await doTestCopy();
    });
    test('copy - unbuffered large (FileSystemProviderCapabilities.FileReadWrite)', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        await doTestCopy('lorem.txt');
    });
    test('copy - buffered (FileSystemProviderCapabilities.FileOpenReadWriteClose)', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        await doTestCopy();
    });
    test('copy - buffered large (FileSystemProviderCapabilities.FileOpenReadWriteClose)', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        await doTestCopy('lorem.txt');
    });
    function setCapabilities(provider, capabilities) {
        provider.capabilities = capabilities;
        if (isLinux) {
            provider.capabilities |= 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */;
        }
    }
    async function doTestCopy(sourceName = 'index.html') {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const source = await service.resolve(URI.file(join(testDir, sourceName)));
        const target = URI.file(join(testDir, 'other.html'));
        assert.strictEqual(await service.canCopy(source.resource, target), true);
        const copied = await service.copy(source.resource, target);
        assert.strictEqual(existsSync(copied.resource.fsPath), true);
        assert.strictEqual(existsSync(source.resource.fsPath), true);
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, source.resource.fsPath);
        assert.strictEqual(event.operation, 3 /* FileOperation.COPY */);
        assert.strictEqual(event.target.resource.fsPath, copied.resource.fsPath);
        const sourceContents = readFileSync(source.resource.fsPath);
        const targetContents = readFileSync(target.fsPath);
        assert.strictEqual(sourceContents.byteLength, targetContents.byteLength);
        assert.strictEqual(sourceContents.toString(), targetContents.toString());
    }
    test('copy - overwrite folder with file', async () => {
        let createEvent;
        let copyEvent;
        let deleteEvent;
        disposables.add(service.onDidRunOperation((e) => {
            if (e.operation === 0 /* FileOperation.CREATE */) {
                createEvent = e;
            }
            else if (e.operation === 1 /* FileOperation.DELETE */) {
                deleteEvent = e;
            }
            else if (e.operation === 3 /* FileOperation.COPY */) {
                copyEvent = e;
            }
        }));
        const parent = await service.resolve(URI.file(testDir));
        const folderResource = URI.file(join(parent.resource.fsPath, 'conway.js'));
        const f = await service.createFolder(folderResource);
        const source = URI.file(join(testDir, 'deep', 'conway.js'));
        assert.strictEqual(await service.canCopy(source, f.resource, true), true);
        const copied = await service.copy(source, f.resource, true);
        assert.strictEqual(existsSync(copied.resource.fsPath), true);
        assert.ok(statSync(copied.resource.fsPath).isFile);
        assert.ok(createEvent);
        assert.ok(deleteEvent);
        assert.ok(copyEvent);
        assert.strictEqual(copyEvent.resource.fsPath, source.fsPath);
        assert.strictEqual(copyEvent.target.resource.fsPath, copied.resource.fsPath);
        assert.strictEqual(deleteEvent.resource.fsPath, folderResource.fsPath);
    });
    test('copy - MIX CASE same target - no overwrite', async () => {
        let source = await service.resolve(URI.file(join(testDir, 'index.html')), {
            resolveMetadata: true,
        });
        const originalSize = source.size;
        assert.ok(originalSize > 0);
        const target = URI.file(join(dirname(source.resource.fsPath), 'INDEX.html'));
        const canCopy = await service.canCopy(source.resource, target);
        let error;
        let copied;
        try {
            copied = await service.copy(source.resource, target);
        }
        catch (e) {
            error = e;
        }
        if (isLinux) {
            assert.ok(!error);
            assert.strictEqual(canCopy, true);
            assert.strictEqual(existsSync(copied.resource.fsPath), true);
            assert.ok(readdirSync(testDir).some((f) => f === 'INDEX.html'));
            assert.strictEqual(source.size, copied.size);
        }
        else {
            assert.ok(error);
            assert.ok(canCopy instanceof Error);
            source = await service.resolve(source.resource, { resolveMetadata: true });
            assert.strictEqual(originalSize, source.size);
        }
    });
    test('copy - MIX CASE same target - overwrite', async () => {
        let source = await service.resolve(URI.file(join(testDir, 'index.html')), {
            resolveMetadata: true,
        });
        const originalSize = source.size;
        assert.ok(originalSize > 0);
        const target = URI.file(join(dirname(source.resource.fsPath), 'INDEX.html'));
        const canCopy = await service.canCopy(source.resource, target, true);
        let error;
        let copied;
        try {
            copied = await service.copy(source.resource, target, true);
        }
        catch (e) {
            error = e;
        }
        if (isLinux) {
            assert.ok(!error);
            assert.strictEqual(canCopy, true);
            assert.strictEqual(existsSync(copied.resource.fsPath), true);
            assert.ok(readdirSync(testDir).some((f) => f === 'INDEX.html'));
            assert.strictEqual(source.size, copied.size);
        }
        else {
            assert.ok(error);
            assert.ok(canCopy instanceof Error);
            source = await service.resolve(source.resource, { resolveMetadata: true });
            assert.strictEqual(originalSize, source.size);
        }
    });
    test('copy - MIX CASE different target - overwrite', async () => {
        const source1 = await service.resolve(URI.file(join(testDir, 'index.html')), {
            resolveMetadata: true,
        });
        assert.ok(source1.size > 0);
        const renamed = await service.move(source1.resource, URI.file(join(dirname(source1.resource.fsPath), 'CONWAY.js')));
        assert.strictEqual(existsSync(renamed.resource.fsPath), true);
        assert.ok(readdirSync(testDir).some((f) => f === 'CONWAY.js'));
        assert.strictEqual(source1.size, renamed.size);
        const source2 = await service.resolve(URI.file(join(testDir, 'deep', 'conway.js')), {
            resolveMetadata: true,
        });
        const target = URI.file(join(testDir, basename(source2.resource.path)));
        assert.strictEqual(await service.canCopy(source2.resource, target, true), true);
        const res = await service.copy(source2.resource, target, true);
        assert.strictEqual(existsSync(res.resource.fsPath), true);
        assert.ok(readdirSync(testDir).some((f) => f === 'conway.js'));
        assert.strictEqual(source2.size, res.size);
    });
    test('copy - same file', async () => {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const source = await service.resolve(URI.file(join(testDir, 'index.html')), {
            resolveMetadata: true,
        });
        assert.ok(source.size > 0);
        assert.strictEqual(await service.canCopy(source.resource, URI.file(source.resource.fsPath)), true);
        let copied = await service.copy(source.resource, URI.file(source.resource.fsPath));
        assert.strictEqual(existsSync(copied.resource.fsPath), true);
        assert.strictEqual(basename(copied.resource.fsPath), 'index.html');
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, source.resource.fsPath);
        assert.strictEqual(event.operation, 3 /* FileOperation.COPY */);
        assert.strictEqual(event.target.resource.fsPath, copied.resource.fsPath);
        copied = await service.resolve(source.resource, { resolveMetadata: true });
        assert.strictEqual(source.size, copied.size);
    });
    test('copy - same file #2', async () => {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const source = await service.resolve(URI.file(join(testDir, 'index.html')), {
            resolveMetadata: true,
        });
        assert.ok(source.size > 0);
        const targetParent = URI.file(testDir);
        const target = targetParent.with({
            path: posix.join(targetParent.path, posix.basename(source.resource.path)),
        });
        assert.strictEqual(await service.canCopy(source.resource, URI.file(target.fsPath)), true);
        let copied = await service.copy(source.resource, URI.file(target.fsPath));
        assert.strictEqual(existsSync(copied.resource.fsPath), true);
        assert.strictEqual(basename(copied.resource.fsPath), 'index.html');
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, source.resource.fsPath);
        assert.strictEqual(event.operation, 3 /* FileOperation.COPY */);
        assert.strictEqual(event.target.resource.fsPath, copied.resource.fsPath);
        copied = await service.resolve(source.resource, { resolveMetadata: true });
        assert.strictEqual(source.size, copied.size);
    });
    test('cloneFile - basics', () => {
        return testCloneFile();
    });
    test('cloneFile - via copy capability', () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */ |
            8 /* FileSystemProviderCapabilities.FileFolderCopy */);
        return testCloneFile();
    });
    test('cloneFile - via pipe', () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testCloneFile();
    });
    async function testCloneFile() {
        const source1 = URI.file(join(testDir, 'index.html'));
        const source1Size = (await service.resolve(source1, { resolveMetadata: true })).size;
        const source2 = URI.file(join(testDir, 'lorem.txt'));
        const source2Size = (await service.resolve(source2, { resolveMetadata: true })).size;
        const targetParent = URI.file(testDir);
        // same path is a no-op
        await service.cloneFile(source1, source1);
        // simple clone to existing parent folder path
        const target1 = targetParent.with({
            path: posix.join(targetParent.path, `${posix.basename(source1.path)}-clone`),
        });
        await service.cloneFile(source1, URI.file(target1.fsPath));
        assert.strictEqual(existsSync(target1.fsPath), true);
        assert.strictEqual(basename(target1.fsPath), 'index.html-clone');
        let target1Size = (await service.resolve(target1, { resolveMetadata: true })).size;
        assert.strictEqual(source1Size, target1Size);
        // clone to same path overwrites
        await service.cloneFile(source2, URI.file(target1.fsPath));
        target1Size = (await service.resolve(target1, { resolveMetadata: true })).size;
        assert.strictEqual(source2Size, target1Size);
        assert.notStrictEqual(source1Size, target1Size);
        // clone creates missing folders ad-hoc
        const target2 = targetParent.with({
            path: posix.join(targetParent.path, 'foo', 'bar', `${posix.basename(source1.path)}-clone`),
        });
        await service.cloneFile(source1, URI.file(target2.fsPath));
        assert.strictEqual(existsSync(target2.fsPath), true);
        assert.strictEqual(basename(target2.fsPath), 'index.html-clone');
        const target2Size = (await service.resolve(target2, { resolveMetadata: true })).size;
        assert.strictEqual(source1Size, target2Size);
    }
    test('readFile - small file - default', () => {
        return testReadFile(URI.file(join(testDir, 'small.txt')));
    });
    test('readFile - small file - buffered', () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testReadFile(URI.file(join(testDir, 'small.txt')));
    });
    test('readFile - small file - buffered / readonly', () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */ |
            2048 /* FileSystemProviderCapabilities.Readonly */);
        return testReadFile(URI.file(join(testDir, 'small.txt')));
    });
    test('readFile - small file - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testReadFile(URI.file(join(testDir, 'small.txt')));
    });
    test('readFile - small file - unbuffered / readonly', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */ | 2048 /* FileSystemProviderCapabilities.Readonly */);
        return testReadFile(URI.file(join(testDir, 'small.txt')));
    });
    test('readFile - small file - streamed', async () => {
        setCapabilities(fileProvider, 16 /* FileSystemProviderCapabilities.FileReadStream */);
        return testReadFile(URI.file(join(testDir, 'small.txt')));
    });
    test('readFile - small file - streamed / readonly', async () => {
        setCapabilities(fileProvider, 16 /* FileSystemProviderCapabilities.FileReadStream */ | 2048 /* FileSystemProviderCapabilities.Readonly */);
        return testReadFile(URI.file(join(testDir, 'small.txt')));
    });
    test('readFile - large file - default', async () => {
        return testReadFile(URI.file(join(testDir, 'lorem.txt')));
    });
    test('readFile - large file - buffered', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testReadFile(URI.file(join(testDir, 'lorem.txt')));
    });
    test('readFile - large file - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testReadFile(URI.file(join(testDir, 'lorem.txt')));
    });
    test('readFile - large file - streamed', async () => {
        setCapabilities(fileProvider, 16 /* FileSystemProviderCapabilities.FileReadStream */);
        return testReadFile(URI.file(join(testDir, 'lorem.txt')));
    });
    test('readFile - atomic (emulated on service level)', async () => {
        setCapabilities(fileProvider, 16 /* FileSystemProviderCapabilities.FileReadStream */);
        return testReadFile(URI.file(join(testDir, 'lorem.txt')), { atomic: true });
    });
    test('readFile - atomic (natively supported)', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */ & 16384 /* FileSystemProviderCapabilities.FileAtomicRead */);
        return testReadFile(URI.file(join(testDir, 'lorem.txt')), { atomic: true });
    });
    async function testReadFile(resource, options) {
        const content = await service.readFile(resource, options);
        assert.strictEqual(content.value.toString(), readFileSync(resource.fsPath).toString());
    }
    test('readFileStream - small file - default', () => {
        return testReadFileStream(URI.file(join(testDir, 'small.txt')));
    });
    test('readFileStream - small file - buffered', () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testReadFileStream(URI.file(join(testDir, 'small.txt')));
    });
    test('readFileStream - small file - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testReadFileStream(URI.file(join(testDir, 'small.txt')));
    });
    test('readFileStream - small file - streamed', async () => {
        setCapabilities(fileProvider, 16 /* FileSystemProviderCapabilities.FileReadStream */);
        return testReadFileStream(URI.file(join(testDir, 'small.txt')));
    });
    async function testReadFileStream(resource) {
        const content = await service.readFileStream(resource);
        assert.strictEqual((await streamToBuffer(content.value)).toString(), readFileSync(resource.fsPath).toString());
    }
    test('readFile - Files are intermingled #38331 - default', async () => {
        return testFilesNotIntermingled();
    });
    test('readFile - Files are intermingled #38331 - buffered', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testFilesNotIntermingled();
    });
    test('readFile - Files are intermingled #38331 - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testFilesNotIntermingled();
    });
    test('readFile - Files are intermingled #38331 - streamed', async () => {
        setCapabilities(fileProvider, 16 /* FileSystemProviderCapabilities.FileReadStream */);
        return testFilesNotIntermingled();
    });
    async function testFilesNotIntermingled() {
        const resource1 = URI.file(join(testDir, 'lorem.txt'));
        const resource2 = URI.file(join(testDir, 'some_utf16le.css'));
        // load in sequence and keep data
        const value1 = await service.readFile(resource1);
        const value2 = await service.readFile(resource2);
        // load in parallel in expect the same result
        const result = await Promise.all([service.readFile(resource1), service.readFile(resource2)]);
        assert.strictEqual(result[0].value.toString(), value1.value.toString());
        assert.strictEqual(result[1].value.toString(), value2.value.toString());
    }
    test('readFile - from position (ASCII) - default', async () => {
        return testReadFileFromPositionAscii();
    });
    test('readFile - from position (ASCII) - buffered', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testReadFileFromPositionAscii();
    });
    test('readFile - from position (ASCII) - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testReadFileFromPositionAscii();
    });
    test('readFile - from position (ASCII) - streamed', async () => {
        setCapabilities(fileProvider, 16 /* FileSystemProviderCapabilities.FileReadStream */);
        return testReadFileFromPositionAscii();
    });
    async function testReadFileFromPositionAscii() {
        const resource = URI.file(join(testDir, 'small.txt'));
        const contents = await service.readFile(resource, { position: 6 });
        assert.strictEqual(contents.value.toString(), 'File');
    }
    test('readFile - from position (with umlaut) - default', async () => {
        return testReadFileFromPositionUmlaut();
    });
    test('readFile - from position (with umlaut) - buffered', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testReadFileFromPositionUmlaut();
    });
    test('readFile - from position (with umlaut) - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testReadFileFromPositionUmlaut();
    });
    test('readFile - from position (with umlaut) - streamed', async () => {
        setCapabilities(fileProvider, 16 /* FileSystemProviderCapabilities.FileReadStream */);
        return testReadFileFromPositionUmlaut();
    });
    async function testReadFileFromPositionUmlaut() {
        const resource = URI.file(join(testDir, 'small_umlaut.txt'));
        const contents = await service.readFile(resource, {
            position: Buffer.from('Small File with Ü').length,
        });
        assert.strictEqual(contents.value.toString(), 'mlaut');
    }
    test('readFile - 3 bytes (ASCII) - default', async () => {
        return testReadThreeBytesFromFile();
    });
    test('readFile - 3 bytes (ASCII) - buffered', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testReadThreeBytesFromFile();
    });
    test('readFile - 3 bytes (ASCII) - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testReadThreeBytesFromFile();
    });
    test('readFile - 3 bytes (ASCII) - streamed', async () => {
        setCapabilities(fileProvider, 16 /* FileSystemProviderCapabilities.FileReadStream */);
        return testReadThreeBytesFromFile();
    });
    async function testReadThreeBytesFromFile() {
        const resource = URI.file(join(testDir, 'small.txt'));
        const contents = await service.readFile(resource, { length: 3 });
        assert.strictEqual(contents.value.toString(), 'Sma');
    }
    test('readFile - 20000 bytes (large) - default', async () => {
        return readLargeFileWithLength(20000);
    });
    test('readFile - 20000 bytes (large) - buffered', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return readLargeFileWithLength(20000);
    });
    test('readFile - 20000 bytes (large) - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return readLargeFileWithLength(20000);
    });
    test('readFile - 20000 bytes (large) - streamed', async () => {
        setCapabilities(fileProvider, 16 /* FileSystemProviderCapabilities.FileReadStream */);
        return readLargeFileWithLength(20000);
    });
    test('readFile - 80000 bytes (large) - default', async () => {
        return readLargeFileWithLength(80000);
    });
    test('readFile - 80000 bytes (large) - buffered', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return readLargeFileWithLength(80000);
    });
    test('readFile - 80000 bytes (large) - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return readLargeFileWithLength(80000);
    });
    test('readFile - 80000 bytes (large) - streamed', async () => {
        setCapabilities(fileProvider, 16 /* FileSystemProviderCapabilities.FileReadStream */);
        return readLargeFileWithLength(80000);
    });
    async function readLargeFileWithLength(length) {
        const resource = URI.file(join(testDir, 'lorem.txt'));
        const contents = await service.readFile(resource, { length });
        assert.strictEqual(contents.value.byteLength, length);
    }
    test('readFile - FILE_IS_DIRECTORY', async () => {
        const resource = URI.file(join(testDir, 'deep'));
        let error = undefined;
        try {
            await service.readFile(resource);
        }
        catch (err) {
            error = err;
        }
        assert.ok(error);
        assert.strictEqual(error.fileOperationResult, 0 /* FileOperationResult.FILE_IS_DIRECTORY */);
    });
    (isWindows /* error code does not seem to be supported on windows */ ? test.skip : test)('readFile - FILE_NOT_DIRECTORY', async () => {
        const resource = URI.file(join(testDir, 'lorem.txt', 'file.txt'));
        let error = undefined;
        try {
            await service.readFile(resource);
        }
        catch (err) {
            error = err;
        }
        assert.ok(error);
        assert.strictEqual(error.fileOperationResult, 9 /* FileOperationResult.FILE_NOT_DIRECTORY */);
    });
    test('readFile - FILE_NOT_FOUND', async () => {
        const resource = URI.file(join(testDir, '404.html'));
        let error = undefined;
        try {
            await service.readFile(resource);
        }
        catch (err) {
            error = err;
        }
        assert.ok(error);
        assert.strictEqual(error.fileOperationResult, 1 /* FileOperationResult.FILE_NOT_FOUND */);
    });
    test('readFile - FILE_NOT_MODIFIED_SINCE - default', async () => {
        return testNotModifiedSince();
    });
    test('readFile - FILE_NOT_MODIFIED_SINCE - buffered', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testNotModifiedSince();
    });
    test('readFile - FILE_NOT_MODIFIED_SINCE - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testNotModifiedSince();
    });
    test('readFile - FILE_NOT_MODIFIED_SINCE - streamed', async () => {
        setCapabilities(fileProvider, 16 /* FileSystemProviderCapabilities.FileReadStream */);
        return testNotModifiedSince();
    });
    async function testNotModifiedSince() {
        const resource = URI.file(join(testDir, 'index.html'));
        const contents = await service.readFile(resource);
        fileProvider.totalBytesRead = 0;
        let error = undefined;
        try {
            await service.readFile(resource, { etag: contents.etag });
        }
        catch (err) {
            error = err;
        }
        assert.ok(error);
        assert.strictEqual(error.fileOperationResult, 2 /* FileOperationResult.FILE_NOT_MODIFIED_SINCE */);
        assert.ok(error instanceof NotModifiedSinceFileOperationError && error.stat);
        assert.strictEqual(fileProvider.totalBytesRead, 0);
    }
    test('readFile - FILE_NOT_MODIFIED_SINCE does not fire wrongly - https://github.com/microsoft/vscode/issues/72909', async () => {
        fileProvider.setInvalidStatSize(true);
        const resource = URI.file(join(testDir, 'index.html'));
        await service.readFile(resource);
        let error = undefined;
        try {
            await service.readFile(resource, { etag: undefined });
        }
        catch (err) {
            error = err;
        }
        assert.ok(!error);
    });
    test('readFile - FILE_TOO_LARGE - default', async () => {
        return testFileTooLarge();
    });
    test('readFile - FILE_TOO_LARGE - buffered', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testFileTooLarge();
    });
    test('readFile - FILE_TOO_LARGE - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testFileTooLarge();
    });
    test('readFile - FILE_TOO_LARGE - streamed', async () => {
        setCapabilities(fileProvider, 16 /* FileSystemProviderCapabilities.FileReadStream */);
        return testFileTooLarge();
    });
    async function testFileTooLarge() {
        await doTestFileTooLarge(false);
        // Also test when the stat size is wrong
        fileProvider.setSmallStatSize(true);
        return doTestFileTooLarge(true);
    }
    async function doTestFileTooLarge(statSizeWrong) {
        const resource = URI.file(join(testDir, 'index.html'));
        let error = undefined;
        try {
            await service.readFile(resource, { limits: { size: 10 } });
        }
        catch (err) {
            error = err;
        }
        if (!statSizeWrong) {
            assert.ok(error instanceof TooLargeFileOperationError);
            assert.ok(typeof error.size === 'number');
        }
        assert.strictEqual(error.fileOperationResult, 7 /* FileOperationResult.FILE_TOO_LARGE */);
    }
    ;
    (isWindows
        ? test.skip /* windows: cannot create file symbolic link without elevated context */
        : test)('readFile - dangling symbolic link - https://github.com/microsoft/vscode/issues/116049', async () => {
        const link = URI.file(join(testDir, 'small.js-link'));
        await promises.symlink(join(testDir, 'small.js'), link.fsPath);
        let error = undefined;
        try {
            await service.readFile(link);
        }
        catch (err) {
            error = err;
        }
        assert.ok(error);
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
        const resource = URI.file(join(testDir, 'test.txt'));
        assert.strictEqual(await service.canCreateFile(resource), true);
        const fileStat = await service.createFile(resource, converter(contents));
        assert.strictEqual(fileStat.name, 'test.txt');
        assert.strictEqual(existsSync(fileStat.resource.fsPath), true);
        assert.strictEqual(readFileSync(fileStat.resource.fsPath).toString(), contents);
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, resource.fsPath);
        assert.strictEqual(event.operation, 0 /* FileOperation.CREATE */);
        assert.strictEqual(event.target.resource.fsPath, resource.fsPath);
    }
    test('createFile (does not overwrite by default)', async () => {
        const contents = 'Hello World';
        const resource = URI.file(join(testDir, 'test.txt'));
        writeFileSync(resource.fsPath, ''); // create file
        assert.ok((await service.canCreateFile(resource)) instanceof Error);
        let error;
        try {
            await service.createFile(resource, VSBuffer.fromString(contents));
        }
        catch (err) {
            error = err;
        }
        assert.ok(error);
    });
    test('createFile (allows to overwrite existing)', async () => {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const contents = 'Hello World';
        const resource = URI.file(join(testDir, 'test.txt'));
        writeFileSync(resource.fsPath, ''); // create file
        assert.strictEqual(await service.canCreateFile(resource, { overwrite: true }), true);
        const fileStat = await service.createFile(resource, VSBuffer.fromString(contents), {
            overwrite: true,
        });
        assert.strictEqual(fileStat.name, 'test.txt');
        assert.strictEqual(existsSync(fileStat.resource.fsPath), true);
        assert.strictEqual(readFileSync(fileStat.resource.fsPath).toString(), contents);
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, resource.fsPath);
        assert.strictEqual(event.operation, 0 /* FileOperation.CREATE */);
        assert.strictEqual(event.target.resource.fsPath, resource.fsPath);
    });
    test('writeFile - default', async () => {
        return testWriteFile(false);
    });
    test('writeFile - flush on write', async () => {
        DiskFileSystemProvider.configureFlushOnWrite(true);
        try {
            return await testWriteFile(false);
        }
        finally {
            DiskFileSystemProvider.configureFlushOnWrite(false);
        }
    });
    test('writeFile - buffered', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testWriteFile(false);
    });
    test('writeFile - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testWriteFile(false);
    });
    test('writeFile - default (atomic)', async () => {
        return testWriteFile(true);
    });
    test('writeFile - flush on write (atomic)', async () => {
        DiskFileSystemProvider.configureFlushOnWrite(true);
        try {
            return await testWriteFile(true);
        }
        finally {
            DiskFileSystemProvider.configureFlushOnWrite(false);
        }
    });
    test('writeFile - buffered (atomic)', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */ |
            32768 /* FileSystemProviderCapabilities.FileAtomicWrite */);
        let e;
        try {
            await testWriteFile(true);
        }
        catch (error) {
            e = error;
        }
        assert.ok(e);
    });
    test('writeFile - unbuffered (atomic)', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */ | 32768 /* FileSystemProviderCapabilities.FileAtomicWrite */);
        return testWriteFile(true);
    });
    (isWindows
        ? test.skip /* windows: cannot create file symbolic link without elevated context */
        : test)('writeFile - atomic writing does not break symlinks', async () => {
        const link = URI.file(join(testDir, 'lorem.txt-linked'));
        await promises.symlink(join(testDir, 'lorem.txt'), link.fsPath);
        const content = 'Updates to the lorem file';
        await service.writeFile(link, VSBuffer.fromString(content), { atomic: { postfix: '.vsctmp' } });
        assert.strictEqual(readFileSync(link.fsPath).toString(), content);
        const resolved = await service.resolve(link);
        assert.strictEqual(resolved.isSymbolicLink, true);
    });
    async function testWriteFile(atomic) {
        let event;
        disposables.add(service.onDidRunOperation((e) => (event = e)));
        const resource = URI.file(join(testDir, 'small.txt'));
        const content = readFileSync(resource.fsPath).toString();
        assert.strictEqual(content, 'Small File');
        const newContent = 'Updates to the small file';
        await service.writeFile(resource, VSBuffer.fromString(newContent), {
            atomic: atomic ? { postfix: '.vsctmp' } : false,
        });
        assert.ok(event);
        assert.strictEqual(event.resource.fsPath, resource.fsPath);
        assert.strictEqual(event.operation, 4 /* FileOperation.WRITE */);
        assert.strictEqual(readFileSync(resource.fsPath).toString(), newContent);
    }
    test('writeFile (large file) - default', async () => {
        return testWriteFileLarge(false);
    });
    test('writeFile (large file) - buffered', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testWriteFileLarge(false);
    });
    test('writeFile (large file) - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testWriteFileLarge(false);
    });
    test('writeFile (large file) - default (atomic)', async () => {
        return testWriteFileLarge(true);
    });
    test('writeFile (large file) - buffered (atomic)', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */ |
            32768 /* FileSystemProviderCapabilities.FileAtomicWrite */);
        let e;
        try {
            await testWriteFileLarge(true);
        }
        catch (error) {
            e = error;
        }
        assert.ok(e);
    });
    test('writeFile (large file) - unbuffered (atomic)', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */ | 32768 /* FileSystemProviderCapabilities.FileAtomicWrite */);
        return testWriteFileLarge(true);
    });
    async function testWriteFileLarge(atomic) {
        const resource = URI.file(join(testDir, 'lorem.txt'));
        const content = readFileSync(resource.fsPath);
        const newContent = content.toString() + content.toString();
        const fileStat = await service.writeFile(resource, VSBuffer.fromString(newContent), {
            atomic: atomic ? { postfix: '.vsctmp' } : false,
        });
        assert.strictEqual(fileStat.name, 'lorem.txt');
        assert.strictEqual(readFileSync(resource.fsPath).toString(), newContent);
    }
    test('writeFile (large file) - unbuffered (atomic) - concurrent writes with multiple services', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */ | 32768 /* FileSystemProviderCapabilities.FileAtomicWrite */);
        const resource = URI.file(join(testDir, 'lorem.txt'));
        const content = readFileSync(resource.fsPath);
        const newContent = content.toString() + content.toString();
        const promises = [];
        let suffix = 0;
        for (let i = 0; i < 10; i++) {
            const service = disposables.add(new FileService(new NullLogService()));
            disposables.add(service.registerProvider(Schemas.file, fileProvider));
            promises.push(service.writeFile(resource, VSBuffer.fromString(`${newContent}${++suffix}`), {
                atomic: { postfix: '.vsctmp' },
            }));
            await timeout(0);
        }
        await Promise.allSettled(promises);
        assert.strictEqual(readFileSync(resource.fsPath).toString(), `${newContent}${suffix}`);
    });
    test('writeFile - buffered - readonly throws', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */ |
            2048 /* FileSystemProviderCapabilities.Readonly */);
        return testWriteFileReadonlyThrows();
    });
    test('writeFile - unbuffered - readonly throws', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */ | 2048 /* FileSystemProviderCapabilities.Readonly */);
        return testWriteFileReadonlyThrows();
    });
    async function testWriteFileReadonlyThrows() {
        const resource = URI.file(join(testDir, 'small.txt'));
        const content = readFileSync(resource.fsPath).toString();
        assert.strictEqual(content, 'Small File');
        const newContent = 'Updates to the small file';
        let error;
        try {
            await service.writeFile(resource, VSBuffer.fromString(newContent));
        }
        catch (err) {
            error = err;
        }
        assert.ok(error);
    }
    test('writeFile (large file) - multiple parallel writes queue up and atomic read support (via file service)', async () => {
        const resource = URI.file(join(testDir, 'lorem.txt'));
        const content = readFileSync(resource.fsPath);
        const newContent = content.toString() + content.toString();
        const writePromises = Promise.all(['0', '00', '000', '0000', '00000'].map(async (offset) => {
            const fileStat = await service.writeFile(resource, VSBuffer.fromString(offset + newContent));
            assert.strictEqual(fileStat.name, 'lorem.txt');
        }));
        const readPromises = Promise.all(['0', '00', '000', '0000', '00000'].map(async () => {
            const fileContent = await service.readFile(resource, { atomic: true });
            assert.ok(fileContent.value.byteLength > 0); // `atomic: true` ensures we never read a truncated file
        }));
        await Promise.all([writePromises, readPromises]);
    });
    test('provider - write barrier prevents dirty writes', async () => {
        const resource = URI.file(join(testDir, 'lorem.txt'));
        const content = readFileSync(resource.fsPath);
        const newContent = content.toString() + content.toString();
        const provider = service.getProvider(resource.scheme);
        assert.ok(provider);
        assert.ok(hasOpenReadWriteCloseCapability(provider));
        const writePromises = Promise.all(['0', '00', '000', '0000', '00000'].map(async (offset) => {
            const content = offset + newContent;
            const contentBuffer = VSBuffer.fromString(content).buffer;
            const fd = await provider.open(resource, { create: true, unlock: false });
            try {
                await provider.write(fd, 0, VSBuffer.fromString(content).buffer, 0, contentBuffer.byteLength);
                // Here since `close` is not called, all other writes are
                // waiting on the barrier to release, so doing a readFile
                // should give us a consistent view of the file contents
                assert.strictEqual((await promises.readFile(resource.fsPath)).toString(), content);
            }
            finally {
                await provider.close(fd);
            }
        }));
        await Promise.all([writePromises]);
    });
    test('provider - write barrier is partitioned per resource', async () => {
        const resource1 = URI.file(join(testDir, 'lorem.txt'));
        const resource2 = URI.file(join(testDir, 'test.txt'));
        const provider = service.getProvider(resource1.scheme);
        assert.ok(provider);
        assert.ok(hasOpenReadWriteCloseCapability(provider));
        const fd1 = await provider.open(resource1, { create: true, unlock: false });
        const fd2 = await provider.open(resource2, { create: true, unlock: false });
        const newContent = 'Hello World';
        try {
            await provider.write(fd1, 0, VSBuffer.fromString(newContent).buffer, 0, VSBuffer.fromString(newContent).buffer.byteLength);
            assert.strictEqual((await promises.readFile(resource1.fsPath)).toString(), newContent);
            await provider.write(fd2, 0, VSBuffer.fromString(newContent).buffer, 0, VSBuffer.fromString(newContent).buffer.byteLength);
            assert.strictEqual((await promises.readFile(resource2.fsPath)).toString(), newContent);
        }
        finally {
            await Promise.allSettled([await provider.close(fd1), await provider.close(fd2)]);
        }
    });
    test('provider - write barrier not becoming stale', async () => {
        const newFolder = join(testDir, 'new-folder');
        const newResource = URI.file(join(newFolder, 'lorem.txt'));
        const provider = service.getProvider(newResource.scheme);
        assert.ok(provider);
        assert.ok(hasOpenReadWriteCloseCapability(provider));
        let error = undefined;
        try {
            await provider.open(newResource, { create: true, unlock: false });
        }
        catch (e) {
            error = e;
        }
        assert.ok(error); // expected because `new-folder` does not exist
        await promises.mkdir(newFolder);
        const content = readFileSync(URI.file(join(testDir, 'lorem.txt')).fsPath);
        const newContent = content.toString() + content.toString();
        const newContentBuffer = VSBuffer.fromString(newContent).buffer;
        const fd = await provider.open(newResource, { create: true, unlock: false });
        try {
            await provider.write(fd, 0, newContentBuffer, 0, newContentBuffer.byteLength);
            assert.strictEqual((await promises.readFile(newResource.fsPath)).toString(), newContent);
        }
        finally {
            await provider.close(fd);
        }
    });
    test('provider - atomic reads (write pending when read starts)', async () => {
        const resource = URI.file(join(testDir, 'lorem.txt'));
        const content = readFileSync(resource.fsPath);
        const newContent = content.toString() + content.toString();
        const newContentBuffer = VSBuffer.fromString(newContent).buffer;
        const provider = service.getProvider(resource.scheme);
        assert.ok(provider);
        assert.ok(hasOpenReadWriteCloseCapability(provider));
        assert.ok(hasFileAtomicReadCapability(provider));
        let atomicReadPromise = undefined;
        const fd = await provider.open(resource, { create: true, unlock: false });
        try {
            // Start reading while write is pending
            atomicReadPromise = provider.readFile(resource, { atomic: true });
            // Simulate a slow write, giving the read
            // a chance to succeed if it were not atomic
            await timeout(20);
            await provider.write(fd, 0, newContentBuffer, 0, newContentBuffer.byteLength);
        }
        finally {
            await provider.close(fd);
        }
        assert.ok(atomicReadPromise);
        const atomicReadResult = await atomicReadPromise;
        assert.strictEqual(atomicReadResult.byteLength, newContentBuffer.byteLength);
    });
    test('provider - atomic reads (read pending when write starts)', async () => {
        const resource = URI.file(join(testDir, 'lorem.txt'));
        const content = readFileSync(resource.fsPath);
        const newContent = content.toString() + content.toString();
        const newContentBuffer = VSBuffer.fromString(newContent).buffer;
        const provider = service.getProvider(resource.scheme);
        assert.ok(provider);
        assert.ok(hasOpenReadWriteCloseCapability(provider));
        assert.ok(hasFileAtomicReadCapability(provider));
        let atomicReadPromise = provider.readFile(resource, { atomic: true });
        const fdPromise = provider.open(resource, { create: true, unlock: false }).then(async (fd) => {
            try {
                return await provider.write(fd, 0, newContentBuffer, 0, newContentBuffer.byteLength);
            }
            finally {
                await provider.close(fd);
            }
        });
        let atomicReadResult = await atomicReadPromise;
        assert.strictEqual(atomicReadResult.byteLength, content.byteLength);
        await fdPromise;
        atomicReadPromise = provider.readFile(resource, { atomic: true });
        atomicReadResult = await atomicReadPromise;
        assert.strictEqual(atomicReadResult.byteLength, newContentBuffer.byteLength);
    });
    test('writeFile (readable) - default', async () => {
        return testWriteFileReadable();
    });
    test('writeFile (readable) - buffered', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testWriteFileReadable();
    });
    test('writeFile (readable) - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testWriteFileReadable();
    });
    async function testWriteFileReadable() {
        const resource = URI.file(join(testDir, 'small.txt'));
        const content = readFileSync(resource.fsPath).toString();
        assert.strictEqual(content, 'Small File');
        const newContent = 'Updates to the small file';
        await service.writeFile(resource, toLineByLineReadable(newContent));
        assert.strictEqual(readFileSync(resource.fsPath).toString(), newContent);
    }
    test('writeFile (large file - readable) - default', async () => {
        return testWriteFileLargeReadable();
    });
    test('writeFile (large file - readable) - buffered', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testWriteFileLargeReadable();
    });
    test('writeFile (large file - readable) - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testWriteFileLargeReadable();
    });
    async function testWriteFileLargeReadable() {
        const resource = URI.file(join(testDir, 'lorem.txt'));
        const content = readFileSync(resource.fsPath);
        const newContent = content.toString() + content.toString();
        const fileStat = await service.writeFile(resource, toLineByLineReadable(newContent));
        assert.strictEqual(fileStat.name, 'lorem.txt');
        assert.strictEqual(readFileSync(resource.fsPath).toString(), newContent);
    }
    test('writeFile (stream) - default', async () => {
        return testWriteFileStream();
    });
    test('writeFile (stream) - buffered', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testWriteFileStream();
    });
    test('writeFile (stream) - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testWriteFileStream();
    });
    async function testWriteFileStream() {
        const source = URI.file(join(testDir, 'small.txt'));
        const target = URI.file(join(testDir, 'small-copy.txt'));
        const fileStat = await service.writeFile(target, streamToBufferReadableStream(createReadStream(source.fsPath)));
        assert.strictEqual(fileStat.name, 'small-copy.txt');
        const targetContents = readFileSync(target.fsPath).toString();
        assert.strictEqual(readFileSync(source.fsPath).toString(), targetContents);
    }
    test('writeFile (large file - stream) - default', async () => {
        return testWriteFileLargeStream();
    });
    test('writeFile (large file - stream) - buffered', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testWriteFileLargeStream();
    });
    test('writeFile (large file - stream) - unbuffered', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testWriteFileLargeStream();
    });
    async function testWriteFileLargeStream() {
        const source = URI.file(join(testDir, 'lorem.txt'));
        const target = URI.file(join(testDir, 'lorem-copy.txt'));
        const fileStat = await service.writeFile(target, streamToBufferReadableStream(createReadStream(source.fsPath)));
        assert.strictEqual(fileStat.name, 'lorem-copy.txt');
        const targetContents = readFileSync(target.fsPath).toString();
        assert.strictEqual(readFileSync(source.fsPath).toString(), targetContents);
    }
    test('writeFile (file is created including parents)', async () => {
        const resource = URI.file(join(testDir, 'other', 'newfile.txt'));
        const content = 'File is created including parent';
        const fileStat = await service.writeFile(resource, VSBuffer.fromString(content));
        assert.strictEqual(fileStat.name, 'newfile.txt');
        assert.strictEqual(readFileSync(resource.fsPath).toString(), content);
    });
    test('writeFile - locked files and unlocking', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */ | 8192 /* FileSystemProviderCapabilities.FileWriteUnlock */);
        return testLockedFiles(false);
    });
    test('writeFile (stream) - locked files and unlocking', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */ |
            8192 /* FileSystemProviderCapabilities.FileWriteUnlock */);
        return testLockedFiles(false);
    });
    test('writeFile - locked files and unlocking throws error when missing capability', async () => {
        setCapabilities(fileProvider, 2 /* FileSystemProviderCapabilities.FileReadWrite */);
        return testLockedFiles(true);
    });
    test('writeFile (stream) - locked files and unlocking throws error when missing capability', async () => {
        setCapabilities(fileProvider, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */);
        return testLockedFiles(true);
    });
    async function testLockedFiles(expectError) {
        const lockedFile = URI.file(join(testDir, 'my-locked-file'));
        const content = await service.writeFile(lockedFile, VSBuffer.fromString('Locked File'));
        assert.strictEqual(content.locked, false);
        const stats = await promises.stat(lockedFile.fsPath);
        await promises.chmod(lockedFile.fsPath, stats.mode & ~0o200);
        let stat = await service.stat(lockedFile);
        assert.strictEqual(stat.locked, true);
        let error;
        const newContent = 'Updates to locked file';
        try {
            await service.writeFile(lockedFile, VSBuffer.fromString(newContent));
        }
        catch (e) {
            error = e;
        }
        assert.ok(error);
        error = undefined;
        if (expectError) {
            try {
                await service.writeFile(lockedFile, VSBuffer.fromString(newContent), { unlock: true });
            }
            catch (e) {
                error = e;
            }
            assert.ok(error);
        }
        else {
            await service.writeFile(lockedFile, VSBuffer.fromString(newContent), { unlock: true });
            assert.strictEqual(readFileSync(lockedFile.fsPath).toString(), newContent);
            stat = await service.stat(lockedFile);
            assert.strictEqual(stat.locked, false);
        }
    }
    test('writeFile (error when folder is encountered)', async () => {
        const resource = URI.file(testDir);
        let error = undefined;
        try {
            await service.writeFile(resource, VSBuffer.fromString('File is created including parent'));
        }
        catch (err) {
            error = err;
        }
        assert.ok(error);
    });
    test('writeFile (no error when providing up to date etag)', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        const stat = await service.resolve(resource);
        const content = readFileSync(resource.fsPath).toString();
        assert.strictEqual(content, 'Small File');
        const newContent = 'Updates to the small file';
        await service.writeFile(resource, VSBuffer.fromString(newContent), {
            etag: stat.etag,
            mtime: stat.mtime,
        });
        assert.strictEqual(readFileSync(resource.fsPath).toString(), newContent);
    });
    test('writeFile - error when writing to file that has been updated meanwhile', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        const stat = await service.resolve(resource);
        const content = readFileSync(resource.fsPath).toString();
        assert.strictEqual(content, 'Small File');
        const newContent = 'Updates to the small file';
        await service.writeFile(resource, VSBuffer.fromString(newContent), {
            etag: stat.etag,
            mtime: stat.mtime,
        });
        const newContentLeadingToError = newContent + newContent;
        const fakeMtime = 1000;
        const fakeSize = 1000;
        let error = undefined;
        try {
            await service.writeFile(resource, VSBuffer.fromString(newContentLeadingToError), {
                etag: etag({ mtime: fakeMtime, size: fakeSize }),
                mtime: fakeMtime,
            });
        }
        catch (err) {
            error = err;
        }
        assert.ok(error);
        assert.ok(error instanceof FileOperationError);
        assert.strictEqual(error.fileOperationResult, 3 /* FileOperationResult.FILE_MODIFIED_SINCE */);
    });
    test('writeFile - no error when writing to file where size is the same', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        const stat = await service.resolve(resource);
        const content = readFileSync(resource.fsPath).toString();
        assert.strictEqual(content, 'Small File');
        const newContent = content; // same content
        await service.writeFile(resource, VSBuffer.fromString(newContent), {
            etag: stat.etag,
            mtime: stat.mtime,
        });
        const newContentLeadingToNoError = newContent; // writing the same content should be OK
        const fakeMtime = 1000;
        const actualSize = newContent.length;
        let error = undefined;
        try {
            await service.writeFile(resource, VSBuffer.fromString(newContentLeadingToNoError), {
                etag: etag({ mtime: fakeMtime, size: actualSize }),
                mtime: fakeMtime,
            });
        }
        catch (err) {
            error = err;
        }
        assert.ok(!error);
    });
    test('writeFile - no error when writing to file where content is the same', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        await service.resolve(resource);
        const content = readFileSync(resource.fsPath).toString();
        assert.strictEqual(content, 'Small File');
        const newContent = content; // same content
        let error = undefined;
        try {
            await service.writeFile(resource, VSBuffer.fromString(newContent), { etag: 'anything', mtime: 0 } /* fake it */);
        }
        catch (err) {
            error = err;
        }
        assert.ok(!error);
    });
    test('writeFile - error when writing to file where content is the same length but different', async () => {
        const resource = URI.file(join(testDir, 'small.txt'));
        await service.resolve(resource);
        const content = readFileSync(resource.fsPath).toString();
        assert.strictEqual(content, 'Small File');
        const newContent = content.split('').reverse().join(''); // reverse content
        let error = undefined;
        try {
            await service.writeFile(resource, VSBuffer.fromString(newContent), { etag: 'anything', mtime: 0 } /* fake it */);
        }
        catch (err) {
            error = err;
        }
        assert.ok(error);
        assert.ok(error instanceof FileOperationError);
        assert.strictEqual(error.fileOperationResult, 3 /* FileOperationResult.FILE_MODIFIED_SINCE */);
    });
    test('writeFile - no error when writing to same nonexistent folder multiple times different new files', async () => {
        const newFolder = URI.file(join(testDir, 'some', 'new', 'folder'));
        const file1 = joinPath(newFolder, 'file-1');
        const file2 = joinPath(newFolder, 'file-2');
        const file3 = joinPath(newFolder, 'file-3');
        // this essentially verifies that the mkdirp logic implemented
        // in the file service is able to receive multiple requests for
        // the same folder and will not throw errors if another racing
        // call succeeded first.
        const newContent = 'Updates to the small file';
        await Promise.all([
            service.writeFile(file1, VSBuffer.fromString(newContent)),
            service.writeFile(file2, VSBuffer.fromString(newContent)),
            service.writeFile(file3, VSBuffer.fromString(newContent)),
        ]);
        assert.ok(service.exists(file1));
        assert.ok(service.exists(file2));
        assert.ok(service.exists(file3));
    });
    test('writeFile - error when writing to folder that is a file', async () => {
        const existingFile = URI.file(join(testDir, 'my-file'));
        await service.createFile(existingFile);
        const newFile = joinPath(existingFile, 'file-1');
        let error;
        const newContent = 'Updates to the small file';
        try {
            await service.writeFile(newFile, VSBuffer.fromString(newContent));
        }
        catch (e) {
            error = e;
        }
        assert.ok(error);
    });
    test('read - mixed positions', async () => {
        const resource = URI.file(join(testDir, 'lorem.txt'));
        // read multiple times from position 0
        let buffer = VSBuffer.alloc(1024);
        let fd = await fileProvider.open(resource, { create: false });
        for (let i = 0; i < 3; i++) {
            await fileProvider.read(fd, 0, buffer.buffer, 0, 26);
            assert.strictEqual(buffer.slice(0, 26).toString(), 'Lorem ipsum dolor sit amet');
        }
        await fileProvider.close(fd);
        // read multiple times at various locations
        buffer = VSBuffer.alloc(1024);
        fd = await fileProvider.open(resource, { create: false });
        let posInFile = 0;
        await fileProvider.read(fd, posInFile, buffer.buffer, 0, 26);
        assert.strictEqual(buffer.slice(0, 26).toString(), 'Lorem ipsum dolor sit amet');
        posInFile += 26;
        await fileProvider.read(fd, posInFile, buffer.buffer, 0, 1);
        assert.strictEqual(buffer.slice(0, 1).toString(), ',');
        posInFile += 1;
        await fileProvider.read(fd, posInFile, buffer.buffer, 0, 12);
        assert.strictEqual(buffer.slice(0, 12).toString(), ' consectetur');
        posInFile += 12;
        await fileProvider.read(fd, 98 /* no longer in sequence of posInFile */, buffer.buffer, 0, 9);
        assert.strictEqual(buffer.slice(0, 9).toString(), 'fermentum');
        await fileProvider.read(fd, 27, buffer.buffer, 0, 12);
        assert.strictEqual(buffer.slice(0, 12).toString(), ' consectetur');
        await fileProvider.read(fd, 26, buffer.buffer, 0, 1);
        assert.strictEqual(buffer.slice(0, 1).toString(), ',');
        await fileProvider.read(fd, 0, buffer.buffer, 0, 26);
        assert.strictEqual(buffer.slice(0, 26).toString(), 'Lorem ipsum dolor sit amet');
        await fileProvider.read(fd, posInFile /* back in sequence */, buffer.buffer, 0, 11);
        assert.strictEqual(buffer.slice(0, 11).toString(), ' adipiscing');
        await fileProvider.close(fd);
    });
    test('write - mixed positions', async () => {
        const resource = URI.file(join(testDir, 'lorem.txt'));
        const buffer = VSBuffer.alloc(1024);
        const fdWrite = await fileProvider.open(resource, { create: true, unlock: false });
        const fdRead = await fileProvider.open(resource, { create: false });
        let posInFileWrite = 0;
        let posInFileRead = 0;
        const initialContents = VSBuffer.fromString('Lorem ipsum dolor sit amet');
        await fileProvider.write(fdWrite, posInFileWrite, initialContents.buffer, 0, initialContents.byteLength);
        posInFileWrite += initialContents.byteLength;
        await fileProvider.read(fdRead, posInFileRead, buffer.buffer, 0, 26);
        assert.strictEqual(buffer.slice(0, 26).toString(), 'Lorem ipsum dolor sit amet');
        posInFileRead += 26;
        const contents = VSBuffer.fromString('Hello World');
        await fileProvider.write(fdWrite, posInFileWrite, contents.buffer, 0, contents.byteLength);
        posInFileWrite += contents.byteLength;
        await fileProvider.read(fdRead, posInFileRead, buffer.buffer, 0, contents.byteLength);
        assert.strictEqual(buffer.slice(0, contents.byteLength).toString(), 'Hello World');
        posInFileRead += contents.byteLength;
        await fileProvider.write(fdWrite, 6, contents.buffer, 0, contents.byteLength);
        await fileProvider.read(fdRead, 0, buffer.buffer, 0, 11);
        assert.strictEqual(buffer.slice(0, 11).toString(), 'Lorem Hello');
        await fileProvider.write(fdWrite, posInFileWrite, contents.buffer, 0, contents.byteLength);
        posInFileWrite += contents.byteLength;
        await fileProvider.read(fdRead, posInFileWrite - contents.byteLength, buffer.buffer, 0, contents.byteLength);
        assert.strictEqual(buffer.slice(0, contents.byteLength).toString(), 'Hello World');
        await fileProvider.close(fdWrite);
        await fileProvider.close(fdRead);
    });
    test('readonly - is handled properly for a single resource', async () => {
        fileProvider.setReadonly(true);
        const resource = URI.file(join(testDir, 'index.html'));
        const resolveResult = await service.resolve(resource);
        assert.strictEqual(resolveResult.readonly, true);
        const readResult = await service.readFile(resource);
        assert.strictEqual(readResult.readonly, true);
        let writeFileError = undefined;
        try {
            await service.writeFile(resource, VSBuffer.fromString('Hello Test'));
        }
        catch (error) {
            writeFileError = error;
        }
        assert.ok(writeFileError);
        let deleteFileError = undefined;
        try {
            await service.del(resource);
        }
        catch (error) {
            deleteFileError = error;
        }
        assert.ok(deleteFileError);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTZXJ2aWNlLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL3Rlc3Qvbm9kZS9kaXNrRmlsZVNlcnZpY2UuaW50ZWdyYXRpb25UZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLFVBQVUsRUFDVixXQUFXLEVBQ1gsWUFBWSxFQUNaLFFBQVEsRUFDUixhQUFhLEVBQ2IsUUFBUSxHQUNSLE1BQU0sSUFBSSxDQUFBO0FBQ1gsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixjQUFjLEVBQ2QsY0FBYyxFQUNkLDRCQUE0QixFQUM1QixRQUFRLEdBR1IsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDaEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RCxPQUFP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QUFVLEVBQUUsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3pFLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUM1QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUMzQyxDQUFDO2lCQUFNLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssWUFBWSxFQUFFLENBQUM7Z0JBQzdELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBQzdCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzNDLENBQUM7aUJBQU0sSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDM0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDN0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDMUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUs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QUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNmLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM3QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxVQUFVLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDM0IsTUFBTSxHQUFHLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDO1lBQ3BDLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzFGLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFO1NBQzdDLENBQUMsQ0FBQTtRQUVGLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFLLENBQUE7UUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsUUFBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUxQyxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBRSxDQUFBO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFNUMsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUssQ0FBQTtRQUN2QixNQUFN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Q0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUU5QyxNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQyxFQUFFO1lBQ25GLGVBQWUsRUFBRSxJQUFJO1NBQ3JCLENBQUMsQ0FBQTtRQUNGLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDL0UsTUFBTSxHQUFHLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDekQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssV0FBVyxD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RCxzQ0FBc0M7UUFDdEMsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqQyxJQUFJLEVBQUUsR0FBRyxNQUFNLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDN0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzVCLE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtRQUNqRixDQUFDO1FBQ0QsTUFBTSxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRTVCLDJDQUEyQztRQUMzQyxNQUFNLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM3QixFQUFFLEdBQUcsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBRXpELElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtRQUVqQixNQUFNLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLDRCQUE0QixDQUFDLENBQUE7UUFDaEYsU0FBUyxJQUFJLEVBQUUsQ0FBQTtRQUVmLE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDdEQsU0FBUyxJQUFJLENBQUMsQ0FBQTtRQUVkLE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDbEUsU0FBUyxJQUFJLEVBQUUsQ0FBQTtRQUVmLE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLHdDQUF3QyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdGLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFFOUQsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUVsRSxNQUFNLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxNQUFNLENB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