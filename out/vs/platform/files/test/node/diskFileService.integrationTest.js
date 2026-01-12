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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTZXJ2aWNlLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvdGVzdC9ub2RlL2Rpc2tGaWxlU2VydmljZS5pbnRlZ3JhdGlvblRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsVUFBVSxFQUNWLFdBQVcsRUFDWCxZQUFZLEVBQ1osUUFBUSxFQUNSLGFBQWEsRUFDYixRQUFRLEdBQ1IsTUFBTSxJQUFJLENBQUE7QUFDWCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLGNBQWMsRUFDZCxjQUFjLEVBQ2QsNEJBQTRCLEVBQzVCLFFBQVEsR0FHUixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RixPQUFPLEVBQ04sSUFBSSxFQUdKLGtCQUFrQixFQUdsQixjQUFjLEVBRWQsMkJBQTJCLEVBQzNCLCtCQUErQixFQUsvQixrQ0FBa0MsRUFDbEMsMEJBQTBCLEdBRTFCLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUUzRCxTQUFTLFNBQVMsQ0FBQyxJQUFlLEVBQUUsSUFBWTtJQUMvQyxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDakMsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUE7QUFDMUQsQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQUMsT0FBZTtJQUM1QyxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2hDLE1BQU0sR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFO1FBQ3BDLElBQUksS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE9BQU8sSUFBSSxHQUFHLEtBQUssQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtJQUVGLE9BQU87UUFDTixJQUFJO1lBQ0gsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQzVCLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQy9CLE9BQU8sUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNsQyxDQUFDO1lBRUQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO0tBQ0QsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsc0JBQXNCO0lBQXRFOztRQUNDLG1CQUFjLEdBQVcsQ0FBQyxDQUFBO1FBRWxCLG9CQUFlLEdBQVksS0FBSyxDQUFBO1FBQ2hDLGtCQUFhLEdBQVksS0FBSyxDQUFBO1FBQzlCLGFBQVEsR0FBWSxLQUFLLENBQUE7SUE0RWxDLENBQUM7SUF6RUEsSUFBYSxZQUFZO1FBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsaUJBQWlCO2dCQUNyQjtpRkFDcUQ7MEVBQ1I7bUVBQ1Q7eUVBQ1M7NkVBQ0M7NkVBQ0Q7OEVBQ0M7K0VBQ0M7eUVBQ1AsQ0FBQTtZQUV6QyxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLElBQUksQ0FBQyxpQkFBaUIsK0RBQW9ELENBQUE7WUFDM0UsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtJQUM5QixDQUFDO0lBRUQsSUFBYSxZQUFZLENBQUMsWUFBNEM7UUFDckUsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFlBQVksQ0FBQTtJQUN0QyxDQUFDO0lBRUQsa0JBQWtCLENBQUMsT0FBZ0I7UUFDbEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUE7SUFDL0IsQ0FBQztJQUVELGdCQUFnQixDQUFDLE9BQWdCO1FBQ2hDLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFBO0lBQzdCLENBQUM7SUFFRCxXQUFXLENBQUMsUUFBaUI7UUFDNUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUE7SUFDekIsQ0FBQztJQUVRLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBYTtRQUNoQyxNQUFNLEdBQUcsR0FBRyxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFdEMsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDMUIsQ0FBQztZQUFDLEdBQVcsQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQVEsQ0FBQSxDQUFDLHVEQUF1RDtRQUNyRyxDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDL0IsQ0FBQztZQUFDLEdBQVcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZCLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMxQixDQUFDO1lBQUMsR0FBVyxDQUFDLFdBQVcsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFBO1FBQ3BELENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUM7SUFFUSxLQUFLLENBQUMsSUFBSSxDQUNsQixFQUFVLEVBQ1YsR0FBVyxFQUNYLElBQWdCLEVBQ2hCLE1BQWMsRUFDZCxNQUFjO1FBRWQsTUFBTSxTQUFTLEdBQUcsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUVqRSxJQUFJLENBQUMsY0FBYyxJQUFJLFNBQVMsQ0FBQTtRQUVoQyxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRVEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFhLEVBQUUsT0FBZ0M7UUFDdEUsTUFBTSxHQUFHLEdBQUcsTUFBTSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUVuRCxJQUFJLENBQUMsY0FBYyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUE7UUFFckMsT0FBTyxHQUFHLENBQUE7SUFDWCxDQUFDO0NBQ0Q7QUFFRCxzQkFBc0IsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQSxDQUFDLHNEQUFzRDtBQUUxRyxVQUFVLENBQUMsbUJBQW1CLEVBQUU7SUFDL0IsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFBO0lBRXpCLElBQUksT0FBb0IsQ0FBQTtJQUN4QixJQUFJLFlBQXdDLENBQUE7SUFDNUMsSUFBSSxZQUF3QyxDQUFBO0lBRTVDLElBQUksT0FBZSxDQUFBO0lBRW5CLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLE1BQU0sVUFBVSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7UUFFdkMsT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUV0RCxZQUFZLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBRXJFLFlBQVksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksMEJBQTBCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUMxRSxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUVuRSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFFcEUsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUU3RixNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDckUsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRW5CLE9BQU8sUUFBUSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUM1QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxjQUFjLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0IsSUFBSSxLQUFxQyxDQUFBO1FBQ3pDLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUV2RCxNQUFNLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFFN0UsTUFBTSxTQUFTLEdBQUcsTUFBTSxPQUFPLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFFL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFL0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNoQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsK0JBQXVCLENBQUE7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNwRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpREFBaUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsRSxJQUFJLEtBQXlCLENBQUE7UUFDN0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5RCxNQUFNLGdCQUFnQixHQUFHLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDekQsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUV2RCxNQUFNLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBRXJGLE1BQU0sU0FBUyxHQUFHLE1BQU0sT0FBTyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRS9ELE1BQU0sY0FBYyxHQUFHLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUUvRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQU0sQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsU0FBUywrQkFBdUIsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQU0sQ0FBQyxNQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM1RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQU0sQ0FBQyxNQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3JELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6QixJQUFJLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRWhDLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNsQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNqQyxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUNwQywwREFBMEQsQ0FDMUQsQ0FBQTtRQUNELE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVoRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlCLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QixNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDOUIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUJBQXFCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdEMsTUFBTSxhQUFhLEdBQUcsQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUVyRSxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLCtDQUErQyxDQUFDLENBQUE7UUFDdEYsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRTlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMxQixNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQzdCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDNUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzVCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRWhFLE1BQU0sQ0FBQyxFQUFFLENBQ1IsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUMvQixPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDbEMsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxJQUFJLENBQUE7WUFDaEQsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNqQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDMUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDekUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBQzVCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzNDLENBQUM7aUJBQU0sSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxZQUFZLEVBQUUsQ0FBQztnQkFDN0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDN0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDMUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDM0MsQ0FBQztpQkFBTSxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUMzRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUM3QixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUMzQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1lBQ25FLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RELE1BQU0sYUFBYSxHQUFHLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFckUsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUNuQyxVQUFVLENBQUMsU0FBUyxDQUFDLCtDQUErQyxDQUFDLEVBQ3JFLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxDQUN6QixDQUFBO1FBRUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNqQixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDMUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDM0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzNCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRWhFLE1BQU0sQ0FBQyxFQUFFLENBQ1IsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUMvQixPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDbEMsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxJQUFJLENBQUE7WUFDaEQsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVsRSxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ2pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUMxQyxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN6RSxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDNUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUMxQixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDM0IsQ0FBQztpQkFBTSxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLFlBQVksRUFBRSxDQUFDO2dCQUM3RCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUM3QixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUMxQixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQzFCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMzQixDQUFDO2lCQUFNLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssVUFBVSxFQUFFLENBQUM7Z0JBQzNELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBQzdCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQzFCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDMUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQzNCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLENBQUMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDbkUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0NBQW9DLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDckQsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDekQsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7U0FDNUMsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVoRCxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBRSxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDN0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0RBQWtELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkUsTUFBTSxvQkFBb0IsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUNoRCwrQ0FBK0MsQ0FDL0MsQ0FBQyxNQUFNLENBQUE7UUFDUixNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFO1lBQ3BFLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7U0FDL0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNqQixNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMxQixNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBRTdCLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUE7UUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXRDLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNoQixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRXJDLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNmLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM3QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvREFBb0QsRUFBRSxHQUFHLEVBQUU7UUFDL0QsT0FBTyw4QkFBOEIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM3QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1SEFBdUgsRUFBRSxHQUFHLEVBQUU7UUFDbEksT0FBTyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM1QyxDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssVUFBVSw4QkFBOEIsQ0FBQyxjQUF1QjtRQUNwRSxNQUFNLG9CQUFvQixHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQ2hELCtDQUErQyxDQUMvQyxDQUFDLE1BQU0sQ0FBQTtRQUNSLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FDbkMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUMsRUFDbkY7WUFDQyxTQUFTLEVBQUU7Z0JBQ1YsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBQ3ZELEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUztpQkFDMUMsQ0FBQztnQkFDRixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFDckQsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTO2lCQUMxQyxDQUFDO2FBQ0Y7U0FDRCxDQUNELENBQUE7UUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzFCLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUE7UUFFN0IsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFdEMsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFckMsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNuQixNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDakQsQ0FBQztJQUVELElBQUksQ0FBQywrQ0FBK0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNoRSxNQUFNLG9CQUFvQixHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQ2hELHFEQUFxRCxDQUNyRCxDQUFDLE1BQU0sQ0FBQTtRQUNSLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEVBQUU7WUFDcEUsNkJBQTZCLEVBQUUsSUFBSTtTQUNuQyxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzFCLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUE7UUFFN0IsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFdEMsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzdDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMzQixNQUFNLEdBQUcsR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUM7WUFDcEMsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDMUYsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUU7U0FDN0MsQ0FBQyxDQUFBO1FBRUYsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUssQ0FBQTtRQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxRQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTFDLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFFLENBQUE7UUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1QyxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSyxDQUFBO1FBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFFBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3BDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2pELE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFdEUsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNsRCxDQUFDLENBQUMsQ0FFRDtJQUFBLENBQUMsU0FBUztRQUNWLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHdFQUF3RTtRQUNwRixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsOEJBQThCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUN4RCxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFL0QsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDbEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUVBQXFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdEYsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUU5RSxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWhELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUMzQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxLQUFLLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FDdkQsQ0FBQTtRQUNELE1BQU0sQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUE7UUFFdkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ2pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGFBQWEsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM5QixNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUNwQywwREFBMEQsQ0FDMUQsQ0FBQTtRQUNELE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUU3QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDN0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzdCLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUM3QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuQyxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLCtDQUErQyxDQUFDLENBQUE7UUFDdEYsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRTNDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzNCLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUM1QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3QyxPQUFPLGNBQWMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDcEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekMsT0FBTyxjQUFjLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ25DLENBQUMsQ0FBQyxDQUVEO0lBQUEsQ0FBQyxPQUFPLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUMvRCx1QkFBdUIsRUFDdkIsS0FBSyxJQUFJLEVBQUU7UUFDVixPQUFPLGNBQWMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDbkMsQ0FBQyxDQUNELENBQUE7SUFFRCxLQUFLLFVBQVUsY0FBYyxDQUFDLFFBQWlCLEVBQUUsU0FBa0I7UUFDbEUsSUFBSSxLQUF5QixDQUFBO1FBQzdCLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUQsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQzdELE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUU5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0YsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtRQUUzRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTdELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBTSxDQUFDLENBQUE7UUFDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsU0FBUywrQkFBdUIsQ0FBQTtRQUUxRCxJQUFJLEtBQUssR0FBc0IsU0FBUyxDQUFBO1FBQ3hDLElBQUksQ0FBQztZQUNKLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUE7UUFDNUQsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ1YsQ0FBQztRQUVELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDaEIsTUFBTSxDQUFDLFdBQVcsQ0FDSSxLQUFNLENBQUMsbUJBQW1CLDZDQUUvQyxDQUFBO0lBQ0YsQ0FBQztJQUVELENBQUM7SUFBQSxDQUFDLFNBQVM7UUFDVixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx3RUFBd0U7UUFDcEYsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLHFDQUFxQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzFELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUE7UUFDeEQsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRWxELE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUUxQyxJQUFJLEtBQXlCLENBQUE7UUFDN0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbEUsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVsQyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTdELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBTSxDQUFDLENBQUE7UUFDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsU0FBUywrQkFBdUIsQ0FBQTtRQUUxRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUEsQ0FBQyw4Q0FBOEM7SUFDbkcsQ0FBQyxDQUFDLENBRUQ7SUFBQSxDQUFDLFNBQVM7UUFDVixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx3RUFBd0U7UUFDcEYsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLDJEQUEyRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2hGLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVsRCxJQUFJLEtBQXlCLENBQUE7UUFDN0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRWxELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBTSxDQUFDLENBQUE7UUFDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsU0FBUywrQkFBdUIsQ0FBQTtJQUMzRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQkFBMEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMzQyxPQUFPLHlCQUF5QixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUMvQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuRCxPQUFPLHlCQUF5QixDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFBO0lBQ2hFLENBQUMsQ0FBQyxDQUVEO0lBQUEsQ0FBQyxPQUFPLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUMvRCxvQ0FBb0MsRUFDcEMsS0FBSyxJQUFJLEVBQUU7UUFDVixPQUFPLHlCQUF5QixDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM5QyxDQUFDLENBQ0QsQ0FBQTtJQUVELEtBQUssVUFBVSx5QkFBeUIsQ0FDdkMsUUFBaUIsRUFDakIsTUFBa0M7UUFFbEMsSUFBSSxLQUF5QixDQUFBO1FBQzdCLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUQsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDaEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFDL0UsSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFFekUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3RCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQU0sQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLFNBQVMsK0JBQXVCLENBQUE7SUFDM0QsQ0FBQztJQUVELElBQUksQ0FBQyw4QkFBOEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMvQyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFOUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsWUFBWSxLQUFLLENBQUMsQ0FBQTtRQUV0RSxJQUFJLEtBQUssQ0FBQTtRQUNULElBQUksQ0FBQztZQUNKLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbkMsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ1YsQ0FBQztRQUVELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDakIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUNBQXVDLEVBQUUsR0FBRyxFQUFFO1FBQ2xELE9BQU8scUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDbkMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMkNBQTJDLEVBQUUsR0FBRyxFQUFFO1FBQ3RELE9BQU8scUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDcEMsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLFVBQVUscUJBQXFCLENBQUMsU0FBa0I7UUFDdEQsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLE1BQU0sT0FBTyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUV6RixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtRQUUxQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRUQsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLElBQUksRUFBRTtRQUN2QixJQUFJLEtBQXlCLENBQUE7UUFDN0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5RCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUNwRCxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRWxELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUVuRSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDL0QsTUFBTSxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUVsRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQU0sQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLFNBQVMsNkJBQXFCLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsTUFBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUUzRSxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRWxELE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDeEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLEVBQUUsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDekUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0RBQWdELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakUsZUFBZSxDQUFDLFlBQVksZ0VBQXdELENBQUE7UUFDcEYsZUFBZSxDQUFDLFlBQVksZ0VBQXdELENBQUE7UUFFcEYsT0FBTyx1QkFBdUIsRUFBRSxDQUFBO0lBQ2pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3JFLGVBQWUsQ0FBQyxZQUFZLHVEQUErQyxDQUFBO1FBQzNFLGVBQWUsQ0FBQyxZQUFZLHVEQUErQyxDQUFBO1FBRTNFLE9BQU8sdUJBQXVCLEVBQUUsQ0FBQTtJQUNqQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrREFBa0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuRSxlQUFlLENBQUMsWUFBWSxnRUFBd0QsQ0FBQTtRQUNwRixlQUFlLENBQUMsWUFBWSx1REFBK0MsQ0FBQTtRQUUzRSxPQUFPLHVCQUF1QixFQUFFLENBQUE7SUFDakMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0RBQWtELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkUsZUFBZSxDQUFDLFlBQVksdURBQStDLENBQUE7UUFDM0UsZUFBZSxDQUFDLFlBQVksZ0VBQXdELENBQUE7UUFFcEYsT0FBTyx1QkFBdUIsRUFBRSxDQUFBO0lBQ2pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdEQUF3RCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pFLGVBQWUsQ0FBQyxZQUFZLGdFQUF3RCxDQUFBO1FBQ3BGLGVBQWUsQ0FBQyxZQUFZLGdFQUF3RCxDQUFBO1FBRXBGLE9BQU8sdUJBQXVCLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDNUMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNERBQTRELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0UsZUFBZSxDQUFDLFlBQVksdURBQStDLENBQUE7UUFDM0UsZUFBZSxDQUFDLFlBQVksdURBQStDLENBQUE7UUFFM0UsT0FBTyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUM1QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwREFBMEQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMzRSxlQUFlLENBQUMsWUFBWSxnRUFBd0QsQ0FBQTtRQUNwRixlQUFlLENBQUMsWUFBWSx1REFBK0MsQ0FBQTtRQUUzRSxPQUFPLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzVDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBEQUEwRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzNFLGVBQWUsQ0FBQyxZQUFZLHVEQUErQyxDQUFBO1FBQzNFLGVBQWUsQ0FBQyxZQUFZLGdFQUF3RCxDQUFBO1FBRXBGLE9BQU8sdUJBQXVCLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDNUMsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLFVBQVUsdUJBQXVCLENBQUMsVUFBVSxHQUFHLFlBQVk7UUFDL0QsSUFBSSxLQUF5QixDQUFBO1FBQzdCLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDbEQsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVsRCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFFaEcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQy9ELE1BQU0sT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFNLENBQUMsQ0FBQTtRQUNqQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQU0sQ0FBQyxTQUFTLDZCQUFxQixDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLE1BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFM0UsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVsRCxNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxFQUFFLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFRCxJQUFJLENBQUMscUJBQXFCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdEMsSUFBSSxLQUF5QixDQUFBO1FBQzdCLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUQsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxHQUFHLGdCQUFnQixFQUFFLFlBQVksQ0FBQyxDQUFBO1FBRTVELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBRXBELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQ25GLElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVoRyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQU0sQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLFNBQVMsNkJBQXFCLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsTUFBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUM1RSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuQyxJQUFJLEtBQXlCLENBQUE7UUFDN0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5RCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUU5QyxNQUFNLENBQUMsV0FBVyxDQUNqQixNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUMvRSxJQUFJLENBQ0osQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFNUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFNLENBQUMsQ0FBQTtRQUNqQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQU0sQ0FBQyxTQUFTLDZCQUFxQixDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLE1BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDNUUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNERBQTRELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0UsZUFBZSxDQUFDLFlBQVksZ0VBQXdELENBQUE7UUFDcEYsZUFBZSxDQUFDLFlBQVksZ0VBQXdELENBQUE7UUFFcEYsT0FBTyw2QkFBNkIsRUFBRSxDQUFBO0lBQ3ZDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdFQUFnRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2pGLGVBQWUsQ0FBQyxZQUFZLHVEQUErQyxDQUFBO1FBQzNFLGVBQWUsQ0FBQyxZQUFZLHVEQUErQyxDQUFBO1FBRTNFLE9BQU8sNkJBQTZCLEVBQUUsQ0FBQTtJQUN2QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw4REFBOEQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMvRSxlQUFlLENBQUMsWUFBWSxnRUFBd0QsQ0FBQTtRQUNwRixlQUFlLENBQUMsWUFBWSx1REFBK0MsQ0FBQTtRQUUzRSxPQUFPLDZCQUE2QixFQUFFLENBQUE7SUFDdkMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOERBQThELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0UsZUFBZSxDQUFDLFlBQVksdURBQStDLENBQUE7UUFDM0UsZUFBZSxDQUFDLFlBQVksZ0VBQXdELENBQUE7UUFFcEYsT0FBTyw2QkFBNkIsRUFBRSxDQUFBO0lBQ3ZDLENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxVQUFVLDZCQUE2QjtRQUMzQyxJQUFJLEtBQXlCLENBQUE7UUFDN0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5RCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRWpELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQTtRQUU1RixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDL0QsTUFBTSxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUVsRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQU0sQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLFNBQVMsNkJBQXFCLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsTUFBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUUzRSxNQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDaEUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsQyxJQUFJLEtBQXlCLENBQUE7UUFDN0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5RCxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDLEVBQUU7WUFDM0UsZUFBZSxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRTFCLE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNqRixJQUFJLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUVsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBTSxDQUFDLENBQUE7UUFDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLFNBQVMsNkJBQXFCLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsTUFBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTFFLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDM0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM5QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuQyxJQUFJLEtBQXlCLENBQUE7UUFDN0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5RCxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDLEVBQUU7WUFDM0UsZUFBZSxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRTFCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUN4RSxJQUFJLENBQ0osQ0FBQTtRQUNELElBQUksT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBRW5GLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUNuRSxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQU0sQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQU0sQ0FBQyxTQUFTLDZCQUFxQixDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLE1BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFM0UsT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM5QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN0QyxJQUFJLEtBQXlCLENBQUE7UUFDN0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5RCxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDLEVBQUU7WUFDM0UsZUFBZSxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRTFCLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDdEMsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQztZQUNoQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN6RSxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hFLElBQUksT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRXpELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUNuRSxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQU0sQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQU0sQ0FBQyxTQUFTLDZCQUFxQixDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLE1BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFM0UsT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM5QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNqRCxJQUFJLEtBQXlCLENBQUE7UUFDN0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU5RCxJQUFJLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDLEVBQUU7WUFDekUsZUFBZSxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQTtRQUNoQyxNQUFNLENBQUMsRUFBRSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUUzQixNQUFNLENBQUMsRUFBRSxDQUNSLENBQUMsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoRixLQUFLLENBQ04sQ0FBQTtRQUVELElBQUksS0FBSyxDQUFBO1FBQ1QsSUFBSSxDQUFDO1lBQ0osTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM3RSxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLEtBQUssR0FBRyxDQUFDLENBQUE7UUFDVixDQUFDO1FBRUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNoQixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBTSxDQUFDLENBQUE7UUFFbEIsTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzlDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVDLElBQUksS0FBeUIsQ0FBQTtRQUM3QixXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTlELElBQUksTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUMsRUFBRTtZQUN6RSxlQUFlLEVBQUUsSUFBSTtTQUNyQixDQUFDLENBQUE7UUFDRixNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxFQUFFLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRTNCLE1BQU0sQ0FBQyxFQUFFLENBQ1IsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzlFLEtBQUssQ0FDTixDQUFBO1FBRUQsSUFBSSxLQUFLLENBQUE7UUFDVCxJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNFLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUNWLENBQUM7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsaURBQXlDLENBQUE7UUFDckYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQU0sQ0FBQyxDQUFBO1FBRWxCLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM5QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNwRCxJQUFJLFdBQStCLENBQUE7UUFDbkMsSUFBSSxTQUE2QixDQUFBO1FBQ2pDLElBQUksV0FBK0IsQ0FBQTtRQUNuQyxXQUFXLENBQUMsR0FBRyxDQUNkLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQy9CLElBQUksQ0FBQyxDQUFDLFNBQVMsaUNBQXlCLEVBQUUsQ0FBQztnQkFDMUMsV0FBVyxHQUFHLENBQUMsQ0FBQTtZQUNoQixDQUFDO2lCQUFNLElBQUksQ0FBQyxDQUFDLFNBQVMsaUNBQXlCLEVBQUUsQ0FBQztnQkFDakQsV0FBVyxHQUFHLENBQUMsQ0FBQTtZQUNoQixDQUFDO2lCQUFNLElBQUksQ0FBQyxDQUFDLFNBQVMsK0JBQXVCLEVBQUUsQ0FBQztnQkFDL0MsU0FBUyxHQUFHLENBQUMsQ0FBQTtZQUNkLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUN2RCxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxHQUFHLE1BQU0sT0FBTyxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNwRCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFFM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDekUsTUFBTSxLQUFLLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTFELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVksQ0FBQyxDQUFBO1FBQ3ZCLE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBWSxDQUFDLENBQUE7UUFDdkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFVLENBQUMsQ0FBQTtRQUNyQixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVUsQ0FBQyxNQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzdFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3hFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLElBQUksRUFBRTtRQUN2QixNQUFNLFVBQVUsRUFBRSxDQUFBO0lBQ25CLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtFQUFrRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ25GLGVBQWUsQ0FBQyxZQUFZLHVEQUErQyxDQUFBO1FBRTNFLE1BQU0sVUFBVSxFQUFFLENBQUE7SUFDbkIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0VBQXdFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekYsZUFBZSxDQUFDLFlBQVksdURBQStDLENBQUE7UUFFM0UsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDOUIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUVBQXlFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUYsZUFBZSxDQUFDLFlBQVksZ0VBQXdELENBQUE7UUFFcEYsTUFBTSxVQUFVLEVBQUUsQ0FBQTtJQUNuQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywrRUFBK0UsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNoRyxlQUFlLENBQUMsWUFBWSxnRUFBd0QsQ0FBQTtRQUVwRixNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUM5QixDQUFDLENBQUMsQ0FBQTtJQUVGLFNBQVMsZUFBZSxDQUN2QixRQUFvQyxFQUNwQyxZQUE0QztRQUU1QyxRQUFRLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQTtRQUNwQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsUUFBUSxDQUFDLFlBQVksK0RBQW9ELENBQUE7UUFDMUUsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLFVBQVUsVUFBVSxDQUFDLGFBQXFCLFlBQVk7UUFDMUQsSUFBSSxLQUF5QixDQUFBO1FBQzdCLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekUsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFFcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4RSxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUUxRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFNLENBQUMsQ0FBQTtRQUNqQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsU0FBUyw2QkFBcUIsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQU0sQ0FBQyxNQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTFFLE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzNELE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN4RSxNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUN6RSxDQUFDO0lBRUQsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3BELElBQUksV0FBK0IsQ0FBQTtRQUNuQyxJQUFJLFNBQTZCLENBQUE7UUFDakMsSUFBSSxXQUErQixDQUFBO1FBQ25DLFdBQVcsQ0FBQyxHQUFHLENBQ2QsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDL0IsSUFBSSxDQUFDLENBQUMsU0FBUyxpQ0FBeUIsRUFBRSxDQUFDO2dCQUMxQyxXQUFXLEdBQUcsQ0FBQyxDQUFBO1lBQ2hCLENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsU0FBUyxpQ0FBeUIsRUFBRSxDQUFDO2dCQUNqRCxXQUFXLEdBQUcsQ0FBQyxDQUFBO1lBQ2hCLENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsU0FBUywrQkFBdUIsRUFBRSxDQUFDO2dCQUMvQyxTQUFTLEdBQUcsQ0FBQyxDQUFBO1lBQ2QsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLEdBQUcsTUFBTSxPQUFPLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQTtRQUUzRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN6RSxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBWSxDQUFDLENBQUE7UUFDdkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxXQUFZLENBQUMsQ0FBQTtRQUN2QixNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVUsQ0FBQyxDQUFBO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBVSxDQUFDLE1BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDOUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDeEUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNENBQTRDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0QsSUFBSSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQyxFQUFFO1lBQ3pFLGVBQWUsRUFBRSxJQUFJO1NBQ3JCLENBQUMsQ0FBQTtRQUNGLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUE7UUFDaEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFM0IsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUU1RSxNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUU5RCxJQUFJLEtBQUssQ0FBQTtRQUNULElBQUksTUFBNkIsQ0FBQTtRQUNqQyxJQUFJLENBQUM7WUFDSixNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDckQsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ1YsQ0FBQztRQUVELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxZQUFZLENBQUMsQ0FBQyxDQUFBO1lBQy9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDOUMsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxZQUFZLEtBQUssQ0FBQyxDQUFBO1lBRW5DLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM5QyxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUNBQXlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUQsSUFBSSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQyxFQUFFO1lBQ3pFLGVBQWUsRUFBRSxJQUFJO1NBQ3JCLENBQUMsQ0FBQTtRQUNGLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUE7UUFDaEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFM0IsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUU1RSxNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFcEUsSUFBSSxLQUFLLENBQUE7UUFDVCxJQUFJLE1BQTZCLENBQUE7UUFDakMsSUFBSSxDQUFDO1lBQ0osTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMzRCxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLEtBQUssR0FBRyxDQUFDLENBQUE7UUFDVixDQUFDO1FBRUQsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNqQixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUVqQyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLFlBQVksQ0FBQyxDQUFDLENBQUE7WUFDL0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM5QyxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDaEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLFlBQVksS0FBSyxDQUFDLENBQUE7WUFFbkMsTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7WUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzlDLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMvRCxNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDLEVBQUU7WUFDNUUsZUFBZSxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRTNCLE1BQU0sT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FDakMsT0FBTyxDQUFDLFFBQVEsRUFDaEIsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FDN0QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRTlDLE1BQU0sT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUU7WUFDbkYsZUFBZSxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUV2RSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvRSxNQUFNLEdBQUcsR0FBRyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN6RCxNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDM0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkMsSUFBSSxLQUF5QixDQUFBO1FBQzdCLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQyxFQUFFO1lBQzNFLGVBQWUsRUFBRSxJQUFJO1NBQ3JCLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUUxQixNQUFNLENBQUMsV0FBVyxDQUNqQixNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFDeEUsSUFBSSxDQUNKLENBQUE7UUFDRCxJQUFJLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUVsRixNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFNLENBQUMsQ0FBQTtRQUNqQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsU0FBUyw2QkFBcUIsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQU0sQ0FBQyxNQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTFFLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDN0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUJBQXFCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdEMsSUFBSSxLQUF5QixDQUFBO1FBQzdCLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQyxFQUFFO1lBQzNFLGVBQWUsRUFBRSxJQUFJO1NBQ3JCLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUUxQixNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUM7WUFDaEMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDekUsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3pGLElBQUksTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFFekUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBTSxDQUFDLENBQUE7UUFDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLFNBQVMsNkJBQXFCLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsTUFBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUUxRSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzdDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUMvQixPQUFPLGFBQWEsRUFBRSxDQUFBO0lBQ3ZCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxlQUFlLENBQ2QsWUFBWSxFQUNaO2lFQUM4QyxDQUM5QyxDQUFBO1FBRUQsT0FBTyxhQUFhLEVBQUUsQ0FBQTtJQUN2QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7UUFDakMsZUFBZSxDQUFDLFlBQVksZ0VBQXdELENBQUE7UUFFcEYsT0FBTyxhQUFhLEVBQUUsQ0FBQTtJQUN2QixDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssVUFBVSxhQUFhO1FBQzNCLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sV0FBVyxHQUFHLENBQUMsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1FBRXBGLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sV0FBVyxHQUFHLENBQUMsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO1FBRXBGLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFdEMsdUJBQXVCO1FBQ3ZCLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFekMsOENBQThDO1FBQzlDLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUM7WUFDakMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7U0FDNUUsQ0FBQyxDQUFBO1FBRUYsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBRTFELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUVoRSxJQUFJLFdBQVcsR0FBRyxDQUFDLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtRQUVsRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUU1QyxnQ0FBZ0M7UUFDaEMsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBRTFELFdBQVcsR0FBRyxDQUFDLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtRQUU5RSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUUvQyx1Q0FBdUM7UUFDdkMsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQztZQUNqQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1NBQzFGLENBQUMsQ0FBQTtRQUVGLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUUxRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFFaEUsTUFBTSxXQUFXLEdBQUcsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7UUFFcEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVELElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7UUFDNUMsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMxRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLEVBQUU7UUFDN0MsZUFBZSxDQUFDLFlBQVksZ0VBQXdELENBQUE7UUFFcEYsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMxRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLEVBQUU7UUFDeEQsZUFBZSxDQUNkLFlBQVksRUFDWjs4REFDd0MsQ0FDeEMsQ0FBQTtRQUVELE9BQU8sWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDMUQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0NBQW9DLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDckQsZUFBZSxDQUFDLFlBQVksdURBQStDLENBQUE7UUFFM0UsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMxRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywrQ0FBK0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNoRSxlQUFlLENBQ2QsWUFBWSxFQUNaLHlHQUFzRixDQUN0RixDQUFBO1FBRUQsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMxRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuRCxlQUFlLENBQUMsWUFBWSx5REFBZ0QsQ0FBQTtRQUU1RSxPQUFPLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzFELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlELGVBQWUsQ0FDZCxZQUFZLEVBQ1osMkdBQXVGLENBQ3ZGLENBQUE7UUFFRCxPQUFPLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzFELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2xELE9BQU8sWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDMUQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0NBQWtDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkQsZUFBZSxDQUFDLFlBQVksZ0VBQXdELENBQUE7UUFFcEYsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMxRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNyRCxlQUFlLENBQUMsWUFBWSx1REFBK0MsQ0FBQTtRQUUzRSxPQUFPLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzFELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ25ELGVBQWUsQ0FBQyxZQUFZLHlEQUFnRCxDQUFBO1FBRTVFLE9BQU8sWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDMUQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDaEUsZUFBZSxDQUFDLFlBQVkseURBQWdELENBQUE7UUFFNUUsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUM1RSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6RCxlQUFlLENBQ2QsWUFBWSxFQUNaLGdIQUE0RixDQUM1RixDQUFBO1FBRUQsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUM1RSxDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssVUFBVSxZQUFZLENBQUMsUUFBYSxFQUFFLE9BQTBCO1FBQ3BFLE1BQU0sT0FBTyxHQUFHLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUN2RixDQUFDO0lBRUQsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtRQUNsRCxPQUFPLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDaEUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO1FBQ25ELGVBQWUsQ0FBQyxZQUFZLGdFQUF3RCxDQUFBO1FBRXBGLE9BQU8sa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNoRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQ0FBMEMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMzRCxlQUFlLENBQUMsWUFBWSx1REFBK0MsQ0FBQTtRQUUzRSxPQUFPLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDaEUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0NBQXdDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekQsZUFBZSxDQUFDLFlBQVkseURBQWdELENBQUE7UUFFNUUsT0FBTyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2hFLENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxVQUFVLGtCQUFrQixDQUFDLFFBQWE7UUFDOUMsTUFBTSxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRXRELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLENBQUMsTUFBTSxjQUFjLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQ2hELFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQ3hDLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3JFLE9BQU8sd0JBQXdCLEVBQUUsQ0FBQTtJQUNsQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxREFBcUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN0RSxlQUFlLENBQUMsWUFBWSxnRUFBd0QsQ0FBQTtRQUVwRixPQUFPLHdCQUF3QixFQUFFLENBQUE7SUFDbEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdURBQXVELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEUsZUFBZSxDQUFDLFlBQVksdURBQStDLENBQUE7UUFFM0UsT0FBTyx3QkFBd0IsRUFBRSxDQUFBO0lBQ2xDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFEQUFxRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RFLGVBQWUsQ0FBQyxZQUFZLHlEQUFnRCxDQUFBO1FBRTVFLE9BQU8sd0JBQXdCLEVBQUUsQ0FBQTtJQUNsQyxDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssVUFBVSx3QkFBd0I7UUFDdEMsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDdEQsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUU3RCxpQ0FBaUM7UUFDakMsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUVoRCw2Q0FBNkM7UUFDN0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU1RixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDeEUsQ0FBQztJQUVELElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3RCxPQUFPLDZCQUE2QixFQUFFLENBQUE7SUFDdkMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkNBQTZDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDOUQsZUFBZSxDQUFDLFlBQVksZ0VBQXdELENBQUE7UUFFcEYsT0FBTyw2QkFBNkIsRUFBRSxDQUFBO0lBQ3ZDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtDQUErQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2hFLGVBQWUsQ0FBQyxZQUFZLHVEQUErQyxDQUFBO1FBRTNFLE9BQU8sNkJBQTZCLEVBQUUsQ0FBQTtJQUN2QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM5RCxlQUFlLENBQUMsWUFBWSx5REFBZ0QsQ0FBQTtRQUU1RSxPQUFPLDZCQUE2QixFQUFFLENBQUE7SUFDdkMsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLFVBQVUsNkJBQTZCO1FBQzNDLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBRXJELE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUVsRSxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDdEQsQ0FBQztJQUVELElBQUksQ0FBQyxrREFBa0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuRSxPQUFPLDhCQUE4QixFQUFFLENBQUE7SUFDeEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbURBQW1ELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDcEUsZUFBZSxDQUFDLFlBQVksZ0VBQXdELENBQUE7UUFFcEYsT0FBTyw4QkFBOEIsRUFBRSxDQUFBO0lBQ3hDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFEQUFxRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RFLGVBQWUsQ0FBQyxZQUFZLHVEQUErQyxDQUFBO1FBRTNFLE9BQU8sOEJBQThCLEVBQUUsQ0FBQTtJQUN4QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtREFBbUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNwRSxlQUFlLENBQUMsWUFBWSx5REFBZ0QsQ0FBQTtRQUU1RSxPQUFPLDhCQUE4QixFQUFFLENBQUE7SUFDeEMsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLFVBQVUsOEJBQThCO1FBQzVDLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUE7UUFFNUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtZQUNqRCxRQUFRLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLE1BQU07U0FDakQsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxJQUFJLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdkQsT0FBTywwQkFBMEIsRUFBRSxDQUFBO0lBQ3BDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hELGVBQWUsQ0FBQyxZQUFZLGdFQUF3RCxDQUFBO1FBRXBGLE9BQU8sMEJBQTBCLEVBQUUsQ0FBQTtJQUNwQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMxRCxlQUFlLENBQUMsWUFBWSx1REFBK0MsQ0FBQTtRQUUzRSxPQUFPLDBCQUEwQixFQUFFLENBQUE7SUFDcEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUNBQXVDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEQsZUFBZSxDQUFDLFlBQVkseURBQWdELENBQUE7UUFFNUUsT0FBTywwQkFBMEIsRUFBRSxDQUFBO0lBQ3BDLENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxVQUFVLDBCQUEwQjtRQUN4QyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQTtRQUVyRCxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFRCxJQUFJLENBQUMsMENBQTBDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDM0QsT0FBTyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN0QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxlQUFlLENBQUMsWUFBWSxnRUFBd0QsQ0FBQTtRQUVwRixPQUFPLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3RDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlELGVBQWUsQ0FBQyxZQUFZLHVEQUErQyxDQUFBO1FBRTNFLE9BQU8sdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMkNBQTJDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsZUFBZSxDQUFDLFlBQVkseURBQWdELENBQUE7UUFFNUUsT0FBTyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN0QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQ0FBMEMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMzRCxPQUFPLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3RDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELGVBQWUsQ0FBQyxZQUFZLGdFQUF3RCxDQUFBO1FBRXBGLE9BQU8sdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkNBQTZDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDOUQsZUFBZSxDQUFDLFlBQVksdURBQStDLENBQUE7UUFFM0UsT0FBTyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN0QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxlQUFlLENBQUMsWUFBWSx5REFBZ0QsQ0FBQTtRQUU1RSxPQUFPLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3RDLENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxVQUFVLHVCQUF1QixDQUFDLE1BQWM7UUFDcEQsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFFckQsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFFN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUN0RCxDQUFDO0lBRUQsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9DLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBRWhELElBQUksS0FBSyxHQUFtQyxTQUFTLENBQUE7UUFDckQsSUFBSSxDQUFDO1lBQ0osTUFBTSxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pDLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsS0FBSyxHQUFHLEdBQUcsQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLG1CQUFtQixnREFBd0MsQ0FBQTtJQUNyRixDQUFDLENBQUMsQ0FFRDtJQUFBLENBQUMsU0FBUyxDQUFDLHlEQUF5RCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDeEYsK0JBQStCLEVBQy9CLEtBQUssSUFBSSxFQUFFO1FBQ1YsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBRWpFLElBQUksS0FBSyxHQUFtQyxTQUFTLENBQUE7UUFDckQsSUFBSSxDQUFDO1lBQ0osTUFBTSxPQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pDLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsS0FBSyxHQUFHLEdBQUcsQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLG1CQUFtQixpREFBeUMsQ0FBQTtJQUN0RixDQUFDLENBQ0QsQ0FBQTtJQUVELElBQUksQ0FBQywyQkFBMkIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1QyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUVwRCxJQUFJLEtBQUssR0FBbUMsU0FBUyxDQUFBO1FBQ3JELElBQUksQ0FBQztZQUNKLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNqQyxDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLEtBQUssR0FBRyxHQUFHLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNoQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsNkNBQXFDLENBQUE7SUFDbEYsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOENBQThDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0QsT0FBTyxvQkFBb0IsRUFBRSxDQUFBO0lBQzlCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtDQUErQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2hFLGVBQWUsQ0FBQyxZQUFZLGdFQUF3RCxDQUFBO1FBRXBGLE9BQU8sb0JBQW9CLEVBQUUsQ0FBQTtJQUM5QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpREFBaUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsRSxlQUFlLENBQUMsWUFBWSx1REFBK0MsQ0FBQTtRQUUzRSxPQUFPLG9CQUFvQixFQUFFLENBQUE7SUFDOUIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDaEUsZUFBZSxDQUFDLFlBQVkseURBQWdELENBQUE7UUFFNUUsT0FBTyxvQkFBb0IsRUFBRSxDQUFBO0lBQzlCLENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxVQUFVLG9CQUFvQjtRQUNsQyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUV0RCxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsWUFBWSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUE7UUFFL0IsSUFBSSxLQUFLLEdBQW1DLFNBQVMsQ0FBQTtRQUNyRCxJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzFELENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsS0FBSyxHQUFHLEdBQUcsQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLG1CQUFtQixzREFBOEMsQ0FBQTtRQUMxRixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssWUFBWSxrQ0FBa0MsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ25ELENBQUM7SUFFRCxJQUFJLENBQUMsNkdBQTZHLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDOUgsWUFBWSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXJDLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBRXRELE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVoQyxJQUFJLEtBQUssR0FBbUMsU0FBUyxDQUFBO1FBQ3JELElBQUksQ0FBQztZQUNKLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtRQUN0RCxDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLEtBQUssR0FBRyxHQUFHLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2xCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RELE9BQU8sZ0JBQWdCLEVBQUUsQ0FBQTtJQUMxQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN2RCxlQUFlLENBQUMsWUFBWSxnRUFBd0QsQ0FBQTtRQUVwRixPQUFPLGdCQUFnQixFQUFFLENBQUE7SUFDMUIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0NBQXdDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekQsZUFBZSxDQUFDLFlBQVksdURBQStDLENBQUE7UUFFM0UsT0FBTyxnQkFBZ0IsRUFBRSxDQUFBO0lBQzFCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3ZELGVBQWUsQ0FBQyxZQUFZLHlEQUFnRCxDQUFBO1FBRTVFLE9BQU8sZ0JBQWdCLEVBQUUsQ0FBQTtJQUMxQixDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssVUFBVSxnQkFBZ0I7UUFDOUIsTUFBTSxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUUvQix3Q0FBd0M7UUFDeEMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ25DLE9BQU8sa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUVELEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxhQUFzQjtRQUN2RCxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUV0RCxJQUFJLEtBQUssR0FBbUMsU0FBUyxDQUFBO1FBQ3JELElBQUksQ0FBQztZQUNKLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzNELENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsS0FBSyxHQUFHLEdBQUcsQ0FBQTtRQUNaLENBQUM7UUFFRCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLFlBQVksMEJBQTBCLENBQUMsQ0FBQTtZQUN0RCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sS0FBSyxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQTtRQUMxQyxDQUFDO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsbUJBQW1CLDZDQUFxQyxDQUFBO0lBQ25GLENBQUM7SUFFRCxDQUFDO0lBQUEsQ0FBQyxTQUFTO1FBQ1YsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsd0VBQXdFO1FBQ3BGLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDUCx1RkFBdUYsRUFDdkYsS0FBSyxJQUFJLEVBQUU7UUFDVixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQTtRQUNyRCxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFOUQsSUFBSSxLQUFLLEdBQW1DLFNBQVMsQ0FBQTtRQUNyRCxJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxLQUFLLEdBQUcsR0FBRyxDQUFBO1FBQ1osQ0FBQztRQUVELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDakIsQ0FBQyxDQUNELENBQUE7SUFFRCxJQUFJLENBQUMsWUFBWSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdCLE9BQU8sZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUNyRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN4QyxPQUFPLGdCQUFnQixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN2RixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN0QyxPQUFPLGdCQUFnQixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDckYsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLFVBQVUsZ0JBQWdCLENBQzlCLFNBQW9GO1FBRXBGLElBQUksS0FBeUIsQ0FBQTtRQUM3QixXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTlELE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQTtRQUM5QixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUVwRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvRCxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFL0UsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFNLENBQUMsQ0FBQTtRQUNqQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQU0sQ0FBQyxTQUFTLCtCQUF1QixDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBTSxDQUFDLE1BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNwRSxDQUFDO0lBRUQsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdELE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQTtRQUM5QixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUVwRCxhQUFhLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQSxDQUFDLGNBQWM7UUFFakQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxZQUFZLEtBQUssQ0FBQyxDQUFBO1FBRW5FLElBQUksS0FBSyxDQUFBO1FBQ1QsSUFBSSxDQUFDO1lBQ0osTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDbEUsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxLQUFLLEdBQUcsR0FBRyxDQUFBO1FBQ1osQ0FBQztRQUVELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDakIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMkNBQTJDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsSUFBSSxLQUF5QixDQUFBO1FBQzdCLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFOUQsTUFBTSxRQUFRLEdBQUcsYUFBYSxDQUFBO1FBQzlCLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBRXBELGFBQWEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFBLENBQUMsY0FBYztRQUVqRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNwRixNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDbEYsU0FBUyxFQUFFLElBQUk7U0FDZixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRS9FLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBTSxDQUFDLENBQUE7UUFDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsU0FBUywrQkFBdUIsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQU0sQ0FBQyxNQUFPLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDcEUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUJBQXFCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdEMsT0FBTyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDNUIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0Msc0JBQXNCLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbEQsSUFBSSxDQUFDO1lBQ0osT0FBTyxNQUFNLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNsQyxDQUFDO2dCQUFTLENBQUM7WUFDVixzQkFBc0IsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNwRCxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdkMsZUFBZSxDQUFDLFlBQVksZ0VBQXdELENBQUE7UUFFcEYsT0FBTyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDNUIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekMsZUFBZSxDQUFDLFlBQVksdURBQStDLENBQUE7UUFFM0UsT0FBTyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDNUIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOEJBQThCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0MsT0FBTyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDM0IsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUNBQXFDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdEQsc0JBQXNCLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbEQsSUFBSSxDQUFDO1lBQ0osT0FBTyxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqQyxDQUFDO2dCQUFTLENBQUM7WUFDVixzQkFBc0IsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNwRCxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0JBQStCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDaEQsZUFBZSxDQUNkLFlBQVksRUFDWjtzRUFDK0MsQ0FDL0MsQ0FBQTtRQUVELElBQUksQ0FBQyxDQUFBO1FBQ0wsSUFBSSxDQUFDO1lBQ0osTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDMUIsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsQ0FBQyxHQUFHLEtBQUssQ0FBQTtRQUNWLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2IsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbEQsZUFBZSxDQUNkLFlBQVksRUFDWixpSEFBNkYsQ0FDN0YsQ0FBQTtRQUVELE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzNCLENBQUMsQ0FBQyxDQUVEO0lBQUEsQ0FBQyxTQUFTO1FBQ1YsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsd0VBQXdFO1FBQ3BGLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxvREFBb0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6RSxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUUvRCxNQUFNLE9BQU8sR0FBRywyQkFBMkIsQ0FBQTtRQUMzQyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQy9GLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUVqRSxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2xELENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxVQUFVLGFBQWEsQ0FBQyxNQUFlO1FBQzNDLElBQUksS0FBeUIsQ0FBQTtRQUM3QixXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTlELE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBRXJELE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFFekMsTUFBTSxVQUFVLEdBQUcsMkJBQTJCLENBQUE7UUFDOUMsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ2xFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLO1NBQy9DLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBTSxDQUFDLENBQUE7UUFDakIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFNLENBQUMsU0FBUyw4QkFBc0IsQ0FBQTtRQUV6RCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDekUsQ0FBQztJQUVELElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuRCxPQUFPLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3BELGVBQWUsQ0FBQyxZQUFZLGdFQUF3RCxDQUFBO1FBRXBGLE9BQU8sa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDakMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUNBQXFDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdEQsZUFBZSxDQUFDLFlBQVksdURBQStDLENBQUE7UUFFM0UsT0FBTyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNqQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxPQUFPLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2hDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdELGVBQWUsQ0FDZCxZQUFZLEVBQ1o7c0VBQytDLENBQy9DLENBQUE7UUFFRCxJQUFJLENBQUMsQ0FBQTtRQUNMLElBQUksQ0FBQztZQUNKLE1BQU0sa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDL0IsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsQ0FBQyxHQUFHLEtBQUssQ0FBQTtRQUNWLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2IsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOENBQThDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0QsZUFBZSxDQUNkLFlBQVksRUFDWixpSEFBNkYsQ0FDN0YsQ0FBQTtRQUVELE9BQU8sa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDaEMsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLFVBQVUsa0JBQWtCLENBQUMsTUFBZTtRQUNoRCxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQTtRQUVyRCxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzdDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7UUFFMUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ25GLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLO1NBQy9DLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUU5QyxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDekUsQ0FBQztJQUVELElBQUksQ0FBQyx5RkFBeUYsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMxRyxlQUFlLENBQ2QsWUFBWSxFQUNaLGlIQUE2RixDQUM3RixDQUFBO1FBRUQsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFFckQsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM3QyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBRTFELE1BQU0sUUFBUSxHQUFxQyxFQUFFLENBQUE7UUFDckQsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQ2QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdCLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFBO1lBRXJFLFFBQVEsQ0FBQyxJQUFJLENBQ1osT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLFVBQVUsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7Z0JBQzVFLE1BQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUU7YUFDOUIsQ0FBQyxDQUNGLENBQUE7WUFDRCxNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRWxDLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLFVBQVUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pELGVBQWUsQ0FDZCxZQUFZLEVBQ1o7OERBQ3dDLENBQ3hDLENBQUE7UUFFRCxPQUFPLDJCQUEyQixFQUFFLENBQUE7SUFDckMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMENBQTBDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDM0QsZUFBZSxDQUNkLFlBQVksRUFDWix5R0FBc0YsQ0FDdEYsQ0FBQTtRQUVELE9BQU8sMkJBQTJCLEVBQUUsQ0FBQTtJQUNyQyxDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssVUFBVSwyQkFBMkI7UUFDekMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFFckQsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUV6QyxNQUFNLFVBQVUsR0FBRywyQkFBMkIsQ0FBQTtRQUU5QyxJQUFJLEtBQVksQ0FBQTtRQUNoQixJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUNuRSxDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLEtBQUssR0FBRyxHQUFHLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFNLENBQUMsQ0FBQTtJQUNsQixDQUFDO0lBRUQsSUFBSSxDQUFDLHVHQUF1RyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hILE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBRXJELE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDN0MsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUUxRCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUNoQyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3hELE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQTtZQUM1RixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDL0MsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQy9CLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNsRCxNQUFNLFdBQVcsR0FBRyxNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7WUFDdEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQSxDQUFDLHdEQUF3RDtRQUNyRyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUE7SUFDakQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0RBQWdELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakUsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFFckQsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM3QyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBRTFELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbkIsTUFBTSxDQUFDLEVBQUUsQ0FBQywrQkFBK0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBRXBELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQ2hDLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDeEQsTUFBTSxPQUFPLEdBQUcsTUFBTSxHQUFHLFVBQVUsQ0FBQTtZQUNuQyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQTtZQUV6RCxNQUFNLEVBQUUsR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUN6RSxJQUFJLENBQUM7Z0JBQ0osTUFBTSxRQUFRLENBQUMsS0FBSyxDQUNuQixFQUFFLEVBQ0YsQ0FBQyxFQUNELFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUNuQyxDQUFDLEVBQ0QsYUFBYSxDQUFDLFVBQVUsQ0FDeEIsQ0FBQTtnQkFFRCx5REFBeUQ7Z0JBQ3pELHlEQUF5RDtnQkFDekQsd0RBQXdEO2dCQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ25GLENBQUM7b0JBQVMsQ0FBQztnQkFDVixNQUFNLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDekIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHNEQUFzRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3ZFLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBRXJELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbkIsTUFBTSxDQUFDLEVBQUUsQ0FBQywrQkFBK0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBRXBELE1BQU0sR0FBRyxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQzNFLE1BQU0sR0FBRyxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBRTNFLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQTtRQUVoQyxJQUFJLENBQUM7WUFDSixNQUFNLFFBQVEsQ0FBQyxLQUFLLENBQ25CLEdBQUcsRUFDSCxDQUFDLEVBQ0QsUUFBUSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLEVBQ3RDLENBQUMsRUFDRCxRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQ2pELENBQUE7WUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBRXRGLE1BQU0sUUFBUSxDQUFDLEtBQUssQ0FDbkIsR0FBRyxFQUNILENBQUMsRUFDRCxRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sRUFDdEMsQ0FBQyxFQUNELFFBQVEsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FDakQsQ0FBQTtZQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDdkYsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakYsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDN0MsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFFMUQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNuQixNQUFNLENBQUMsRUFBRSxDQUFDLCtCQUErQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFFcEQsSUFBSSxLQUFLLEdBQXNCLFNBQVMsQ0FBQTtRQUN4QyxJQUFJLENBQUM7WUFDSixNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUNsRSxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLEtBQUssR0FBRyxDQUFDLENBQUE7UUFDVixDQUFDO1FBRUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQSxDQUFDLCtDQUErQztRQUVoRSxNQUFNLFFBQVEsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFL0IsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3pFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDMUQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUUvRCxNQUFNLEVBQUUsR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUM1RSxJQUFJLENBQUM7WUFDSixNQUFNLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7WUFFN0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUN6RixDQUFDO2dCQUFTLENBQUM7WUFDVixNQUFNLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDekIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBEQUEwRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzNFLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBRXJELE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDN0MsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUMxRCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFBO1FBRS9ELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbkIsTUFBTSxDQUFDLEVBQUUsQ0FBQywrQkFBK0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxFQUFFLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUVoRCxJQUFJLGlCQUFpQixHQUFvQyxTQUFTLENBQUE7UUFDbEUsTUFBTSxFQUFFLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDekUsSUFBSSxDQUFDO1lBQ0osdUNBQXVDO1lBQ3ZDLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7WUFFakUseUNBQXlDO1lBQ3pDLDRDQUE0QztZQUM1QyxNQUFNLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUVqQixNQUFNLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDOUUsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsTUFBTSxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3pCLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFFNUIsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLGlCQUFpQixDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQzdFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBEQUEwRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzNFLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBRXJELE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDN0MsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUMxRCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFBO1FBRS9ELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDbkIsTUFBTSxDQUFDLEVBQUUsQ0FBQywrQkFBK0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxFQUFFLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUVoRCxJQUFJLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFckUsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFDNUYsSUFBSSxDQUFDO2dCQUNKLE9BQU8sTUFBTSxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ3JGLENBQUM7b0JBQVMsQ0FBQztnQkFDVixNQUFNLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDekIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxnQkFBZ0IsR0FBRyxNQUFNLGlCQUFpQixDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUVuRSxNQUFNLFNBQVMsQ0FBQTtRQUVmLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDakUsZ0JBQWdCLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtRQUMxQyxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUM3RSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNqRCxPQUFPLHFCQUFxQixFQUFFLENBQUE7SUFDL0IsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbEQsZUFBZSxDQUFDLFlBQVksZ0VBQXdELENBQUE7UUFFcEYsT0FBTyxxQkFBcUIsRUFBRSxDQUFBO0lBQy9CLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3BELGVBQWUsQ0FBQyxZQUFZLHVEQUErQyxDQUFBO1FBRTNFLE9BQU8scUJBQXFCLEVBQUUsQ0FBQTtJQUMvQixDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssVUFBVSxxQkFBcUI7UUFDbkMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFFckQsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUV6QyxNQUFNLFVBQVUsR0FBRywyQkFBMkIsQ0FBQTtRQUM5QyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFFbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFRCxJQUFJLENBQUMsNkNBQTZDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDOUQsT0FBTywwQkFBMEIsRUFBRSxDQUFBO0lBQ3BDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDhDQUE4QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9ELGVBQWUsQ0FBQyxZQUFZLGdFQUF3RCxDQUFBO1FBRXBGLE9BQU8sMEJBQTBCLEVBQUUsQ0FBQTtJQUNwQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnREFBZ0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNqRSxlQUFlLENBQUMsWUFBWSx1REFBK0MsQ0FBQTtRQUUzRSxPQUFPLDBCQUEwQixFQUFFLENBQUE7SUFDcEMsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLFVBQVUsMEJBQTBCO1FBQ3hDLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBRXJELE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDN0MsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUUxRCxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDcEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBRTlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUN6RSxDQUFDO0lBRUQsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9DLE9BQU8sbUJBQW1CLEVBQUUsQ0FBQTtJQUM3QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywrQkFBK0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNoRCxlQUFlLENBQUMsWUFBWSxnRUFBd0QsQ0FBQTtRQUVwRixPQUFPLG1CQUFtQixFQUFFLENBQUE7SUFDN0IsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbEQsZUFBZSxDQUFDLFlBQVksdURBQStDLENBQUE7UUFFM0UsT0FBTyxtQkFBbUIsRUFBRSxDQUFBO0lBQzdCLENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxVQUFVLG1CQUFtQjtRQUNqQyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBRXhELE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FDdkMsTUFBTSxFQUNOLDRCQUE0QixDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUM3RCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFFbkQsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVELElBQUksQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxPQUFPLHdCQUF3QixFQUFFLENBQUE7SUFDbEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNENBQTRDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0QsZUFBZSxDQUFDLFlBQVksZ0VBQXdELENBQUE7UUFFcEYsT0FBTyx3QkFBd0IsRUFBRSxDQUFBO0lBQ2xDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDhDQUE4QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9ELGVBQWUsQ0FBQyxZQUFZLHVEQUErQyxDQUFBO1FBRTNFLE9BQU8sd0JBQXdCLEVBQUUsQ0FBQTtJQUNsQyxDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssVUFBVSx3QkFBd0I7UUFDdEMsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQTtRQUV4RCxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQ3ZDLE1BQU0sRUFDTiw0QkFBNEIsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FDN0QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBRW5ELE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQzNFLENBQUM7SUFFRCxJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDaEUsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFBO1FBRWhFLE1BQU0sT0FBTyxHQUFHLGtDQUFrQyxDQUFBO1FBQ2xELE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUVoRCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDdEUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0NBQXdDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekQsZUFBZSxDQUNkLFlBQVksRUFDWixnSEFBNkYsQ0FDN0YsQ0FBQTtRQUVELE9BQU8sZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzlCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2xFLGVBQWUsQ0FDZCxZQUFZLEVBQ1o7cUVBQytDLENBQy9DLENBQUE7UUFFRCxPQUFPLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM5QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2RUFBNkUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM5RixlQUFlLENBQUMsWUFBWSx1REFBK0MsQ0FBQTtRQUUzRSxPQUFPLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM3QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzRkFBc0YsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN2RyxlQUFlLENBQUMsWUFBWSxnRUFBd0QsQ0FBQTtRQUVwRixPQUFPLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM3QixDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssVUFBVSxlQUFlLENBQUMsV0FBb0I7UUFDbEQsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQTtRQUU1RCxNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtRQUN2RixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFekMsTUFBTSxLQUFLLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwRCxNQUFNLFFBQVEsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFNUQsSUFBSSxJQUFJLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVyQyxJQUFJLEtBQUssQ0FBQTtRQUNULE1BQU0sVUFBVSxHQUFHLHdCQUF3QixDQUFBO1FBQzNDLElBQUksQ0FBQztZQUNKLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ3JFLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUNWLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2hCLEtBQUssR0FBRyxTQUFTLENBQUE7UUFFakIsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUM7Z0JBQ0osTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7WUFDdkYsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osS0FBSyxHQUFHLENBQUMsQ0FBQTtZQUNWLENBQUM7WUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2pCLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxPQUFPLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7WUFDdEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBRTFFLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLDhDQUE4QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9ELE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFbEMsSUFBSSxLQUFLLEdBQXNCLFNBQVMsQ0FBQTtRQUN4QyxJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxDQUFBO1FBQzNGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsS0FBSyxHQUFHLEdBQUcsQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2pCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFEQUFxRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RFLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBRXJELE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUU1QyxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBRXpDLE1BQU0sVUFBVSxHQUFHLDJCQUEyQixDQUFBO1FBQzlDLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUNsRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7U0FDakIsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ3pFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdFQUF3RSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pGLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBRXJELE1BQU0sSUFBSSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUU1QyxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBRXpDLE1BQU0sVUFBVSxHQUFHLDJCQUEyQixDQUFBO1FBQzlDLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUNsRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7U0FDakIsQ0FBQyxDQUFBO1FBRUYsTUFBTSx3QkFBd0IsR0FBRyxVQUFVLEdBQUcsVUFBVSxDQUFBO1FBRXhELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQTtRQUN0QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUE7UUFFckIsSUFBSSxLQUFLLEdBQW1DLFNBQVMsQ0FBQTtRQUNyRCxJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsd0JBQXdCLENBQUMsRUFBRTtnQkFDaEYsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDO2dCQUNoRCxLQUFLLEVBQUUsU0FBUzthQUNoQixDQUFDLENBQUE7UUFDSCxDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLEtBQUssR0FBRyxHQUFHLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNoQixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssWUFBWSxrQkFBa0IsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLG1CQUFtQixrREFBMEMsQ0FBQTtJQUN2RixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrRUFBa0UsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuRixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQTtRQUVyRCxNQUFNLElBQUksR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFNUMsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUV6QyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUEsQ0FBQyxlQUFlO1FBQzFDLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUNsRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7U0FDakIsQ0FBQyxDQUFBO1FBRUYsTUFBTSwwQkFBMEIsR0FBRyxVQUFVLENBQUEsQ0FBQyx3Q0FBd0M7UUFFdEYsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFBO1FBQ3RCLE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUE7UUFFcEMsSUFBSSxLQUFLLEdBQW1DLFNBQVMsQ0FBQTtRQUNyRCxJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsMEJBQTBCLENBQUMsRUFBRTtnQkFDbEYsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDO2dCQUNsRCxLQUFLLEVBQUUsU0FBUzthQUNoQixDQUFDLENBQUE7UUFDSCxDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLEtBQUssR0FBRyxHQUFHLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2xCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFFQUFxRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RGLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBRXJELE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUUvQixNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBRXpDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQSxDQUFDLGVBQWU7UUFDMUMsSUFBSSxLQUFLLEdBQW1DLFNBQVMsQ0FBQTtRQUNyRCxJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQ3RCLFFBQVEsRUFDUixRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUMvQixFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FDNUMsQ0FBQTtRQUNGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsS0FBSyxHQUFHLEdBQUcsQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDbEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUZBQXVGLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEcsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFFckQsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRS9CLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFFekMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUEsQ0FBQyxrQkFBa0I7UUFDMUUsSUFBSSxLQUFLLEdBQW1DLFNBQVMsQ0FBQTtRQUNyRCxJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sQ0FBQyxTQUFTLENBQ3RCLFFBQVEsRUFDUixRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUMvQixFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FDNUMsQ0FBQTtRQUNGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsS0FBSyxHQUFHLEdBQUcsQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxZQUFZLGtCQUFrQixDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLGtEQUEwQyxDQUFBO0lBQ3ZGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlHQUFpRyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2xILE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFFbEUsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMzQyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFM0MsOERBQThEO1FBQzlELCtEQUErRDtRQUMvRCw4REFBOEQ7UUFDOUQsd0JBQXdCO1FBQ3hCLE1BQU0sVUFBVSxHQUFHLDJCQUEyQixDQUFBO1FBQzlDLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUNqQixPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3pELE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDekQsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUN6RCxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUNqQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5REFBeUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMxRSxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUV2RCxNQUFNLE9BQU8sQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUE7UUFFdEMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUVoRCxJQUFJLEtBQUssQ0FBQTtRQUNULE1BQU0sVUFBVSxHQUFHLDJCQUEyQixDQUFBO1FBQzlDLElBQUksQ0FBQztZQUNKLE1BQU0sT0FBTyxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBQ2xFLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUNWLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2pCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBRXJELHNDQUFzQztRQUN0QyxJQUFJLE1BQU0sR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2pDLElBQUksRUFBRSxHQUFHLE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUM3RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUIsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSw0QkFBNEIsQ0FBQyxDQUFBO1FBQ2pGLENBQUM7UUFDRCxNQUFNLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFNUIsMkNBQTJDO1FBQzNDLE1BQU0sR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzdCLEVBQUUsR0FBRyxNQUFNLFlBQVksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFFekQsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBRWpCLE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtRQUNoRixTQUFTLElBQUksRUFBRSxDQUFBO1FBRWYsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN0RCxTQUFTLElBQUksQ0FBQyxDQUFBO1FBRWQsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUNsRSxTQUFTLElBQUksRUFBRSxDQUFBO1FBRWYsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsd0NBQXdDLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUU5RCxNQUFNLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRWxFLE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLE1B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