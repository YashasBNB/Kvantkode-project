/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DeferredPromise, timeout } from '../../../../base/common/async.js';
import { bufferToReadable, bufferToStream, VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { consumeStream, newWriteableStream, } from '../../../../base/common/stream.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { FileType, isFileSystemWatcher, } from '../../common/files.js';
import { FileService } from '../../common/fileService.js';
import { NullFileSystemProvider } from '../common/nullFileSystemProvider.js';
import { NullLogService } from '../../../log/common/log.js';
suite('File Service', () => {
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    test('provider registration', async () => {
        const service = disposables.add(new FileService(new NullLogService()));
        const resource = URI.parse('test://foo/bar');
        const provider = new NullFileSystemProvider();
        assert.strictEqual(await service.canHandleResource(resource), false);
        assert.strictEqual(service.hasProvider(resource), false);
        assert.strictEqual(service.getProvider(resource.scheme), undefined);
        const registrations = [];
        disposables.add(service.onDidChangeFileSystemProviderRegistrations((e) => {
            registrations.push(e);
        }));
        const capabilityChanges = [];
        disposables.add(service.onDidChangeFileSystemProviderCapabilities((e) => {
            capabilityChanges.push(e);
        }));
        let registrationDisposable;
        let callCount = 0;
        disposables.add(service.onWillActivateFileSystemProvider((e) => {
            callCount++;
            if (e.scheme === 'test' && callCount === 1) {
                e.join(new Promise((resolve) => {
                    registrationDisposable = service.registerProvider('test', provider);
                    resolve();
                }));
            }
        }));
        assert.strictEqual(await service.canHandleResource(resource), true);
        assert.strictEqual(service.hasProvider(resource), true);
        assert.strictEqual(service.getProvider(resource.scheme), provider);
        assert.strictEqual(registrations.length, 1);
        assert.strictEqual(registrations[0].scheme, 'test');
        assert.strictEqual(registrations[0].added, true);
        assert.ok(registrationDisposable);
        assert.strictEqual(capabilityChanges.length, 0);
        provider.setCapabilities(8 /* FileSystemProviderCapabilities.FileFolderCopy */);
        assert.strictEqual(capabilityChanges.length, 1);
        provider.setCapabilities(2048 /* FileSystemProviderCapabilities.Readonly */);
        assert.strictEqual(capabilityChanges.length, 2);
        await service.activateProvider('test');
        assert.strictEqual(callCount, 2); // activation is called again
        assert.strictEqual(service.hasCapability(resource, 2048 /* FileSystemProviderCapabilities.Readonly */), true);
        assert.strictEqual(service.hasCapability(resource, 4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */), false);
        registrationDisposable.dispose();
        assert.strictEqual(await service.canHandleResource(resource), false);
        assert.strictEqual(service.hasProvider(resource), false);
        assert.strictEqual(registrations.length, 2);
        assert.strictEqual(registrations[1].scheme, 'test');
        assert.strictEqual(registrations[1].added, false);
    });
    test('watch', async () => {
        const service = disposables.add(new FileService(new NullLogService()));
        let disposeCounter = 0;
        disposables.add(service.registerProvider('test', new NullFileSystemProvider(() => {
            return toDisposable(() => {
                disposeCounter++;
            });
        })));
        await service.activateProvider('test');
        const resource1 = URI.parse('test://foo/bar1');
        const watcher1Disposable = service.watch(resource1);
        await timeout(0); // service.watch() is async
        assert.strictEqual(disposeCounter, 0);
        watcher1Disposable.dispose();
        assert.strictEqual(disposeCounter, 1);
        disposeCounter = 0;
        const resource2 = URI.parse('test://foo/bar2');
        const watcher2Disposable1 = service.watch(resource2);
        const watcher2Disposable2 = service.watch(resource2);
        const watcher2Disposable3 = service.watch(resource2);
        await timeout(0); // service.watch() is async
        assert.strictEqual(disposeCounter, 0);
        watcher2Disposable1.dispose();
        assert.strictEqual(disposeCounter, 0);
        watcher2Disposable2.dispose();
        assert.strictEqual(disposeCounter, 0);
        watcher2Disposable3.dispose();
        assert.strictEqual(disposeCounter, 1);
        disposeCounter = 0;
        const resource3 = URI.parse('test://foo/bar3');
        const watcher3Disposable1 = service.watch(resource3);
        const watcher3Disposable2 = service.watch(resource3, { recursive: true, excludes: [] });
        const watcher3Disposable3 = service.watch(resource3, {
            recursive: false,
            excludes: [],
            includes: [],
        });
        await timeout(0); // service.watch() is async
        assert.strictEqual(disposeCounter, 0);
        watcher3Disposable1.dispose();
        assert.strictEqual(disposeCounter, 1);
        watcher3Disposable2.dispose();
        assert.strictEqual(disposeCounter, 2);
        watcher3Disposable3.dispose();
        assert.strictEqual(disposeCounter, 3);
        service.dispose();
    });
    test('watch - with corelation', async () => {
        const service = disposables.add(new FileService(new NullLogService()));
        const provider = new (class extends NullFileSystemProvider {
            constructor() {
                super(...arguments);
                this._testOnDidChangeFile = new Emitter();
                this.onDidChangeFile = this._testOnDidChangeFile.event;
            }
            fireFileChange(changes) {
                this._testOnDidChangeFile.fire(changes);
            }
        })();
        disposables.add(service.registerProvider('test', provider));
        await service.activateProvider('test');
        const globalEvents = [];
        disposables.add(service.onDidFilesChange((e) => {
            globalEvents.push(e);
        }));
        const watcher0 = disposables.add(service.watch(URI.parse('test://watch/folder1'), {
            recursive: true,
            excludes: [],
            includes: [],
        }));
        assert.strictEqual(isFileSystemWatcher(watcher0), false);
        const watcher1 = disposables.add(service.watch(URI.parse('test://watch/folder2'), {
            recursive: true,
            excludes: [],
            includes: [],
            correlationId: 100,
        }));
        assert.strictEqual(isFileSystemWatcher(watcher1), true);
        const watcher2 = disposables.add(service.watch(URI.parse('test://watch/folder3'), {
            recursive: true,
            excludes: [],
            includes: [],
            correlationId: 200,
        }));
        assert.strictEqual(isFileSystemWatcher(watcher2), true);
        const watcher1Events = [];
        disposables.add(watcher1.onDidChange((e) => {
            watcher1Events.push(e);
        }));
        const watcher2Events = [];
        disposables.add(watcher2.onDidChange((e) => {
            watcher2Events.push(e);
        }));
        provider.fireFileChange([
            { resource: URI.parse('test://watch/folder1'), type: 1 /* FileChangeType.ADDED */ },
        ]);
        provider.fireFileChange([
            { resource: URI.parse('test://watch/folder2'), type: 1 /* FileChangeType.ADDED */, cId: 100 },
        ]);
        provider.fireFileChange([
            { resource: URI.parse('test://watch/folder2'), type: 1 /* FileChangeType.ADDED */, cId: 100 },
        ]);
        provider.fireFileChange([
            { resource: URI.parse('test://watch/folder3/file'), type: 0 /* FileChangeType.UPDATED */, cId: 200 },
        ]);
        provider.fireFileChange([
            { resource: URI.parse('test://watch/folder3'), type: 0 /* FileChangeType.UPDATED */, cId: 200 },
        ]);
        provider.fireFileChange([
            { resource: URI.parse('test://watch/folder4'), type: 1 /* FileChangeType.ADDED */, cId: 50 },
        ]);
        provider.fireFileChange([
            { resource: URI.parse('test://watch/folder4'), type: 1 /* FileChangeType.ADDED */, cId: 60 },
        ]);
        provider.fireFileChange([
            { resource: URI.parse('test://watch/folder4'), type: 1 /* FileChangeType.ADDED */, cId: 70 },
        ]);
        assert.strictEqual(globalEvents.length, 1);
        assert.strictEqual(watcher1Events.length, 2);
        assert.strictEqual(watcher2Events.length, 2);
    });
    test('error from readFile bubbles through (https://github.com/microsoft/vscode/issues/118060) - async', async () => {
        testReadErrorBubbles(true);
    });
    test('error from readFile bubbles through (https://github.com/microsoft/vscode/issues/118060)', async () => {
        testReadErrorBubbles(false);
    });
    async function testReadErrorBubbles(async) {
        const service = disposables.add(new FileService(new NullLogService()));
        const provider = new (class extends NullFileSystemProvider {
            async stat(resource) {
                return {
                    mtime: Date.now(),
                    ctime: Date.now(),
                    size: 100,
                    type: FileType.File,
                };
            }
            readFile(resource) {
                if (async) {
                    return timeout(5, CancellationToken.None).then(() => {
                        throw new Error('failed');
                    });
                }
                throw new Error('failed');
            }
            open(resource, opts) {
                if (async) {
                    return timeout(5, CancellationToken.None).then(() => {
                        throw new Error('failed');
                    });
                }
                throw new Error('failed');
            }
            readFileStream(resource, opts, token) {
                if (async) {
                    const stream = newWriteableStream((chunk) => chunk[0]);
                    timeout(5, CancellationToken.None).then(() => stream.error(new Error('failed')));
                    return stream;
                }
                throw new Error('failed');
            }
        })();
        disposables.add(service.registerProvider('test', provider));
        for (const capabilities of [
            2 /* FileSystemProviderCapabilities.FileReadWrite */,
            16 /* FileSystemProviderCapabilities.FileReadStream */,
            4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */,
        ]) {
            provider.setCapabilities(capabilities);
            let e1;
            try {
                await service.readFile(URI.parse('test://foo/bar'));
            }
            catch (error) {
                e1 = error;
            }
            assert.ok(e1);
            let e2;
            try {
                const stream = await service.readFileStream(URI.parse('test://foo/bar'));
                await consumeStream(stream.value, (chunk) => chunk[0]);
            }
            catch (error) {
                e2 = error;
            }
            assert.ok(e2);
        }
    }
    test('readFile/readFileStream supports cancellation (https://github.com/microsoft/vscode/issues/138805)', async () => {
        const service = disposables.add(new FileService(new NullLogService()));
        let readFileStreamReady = undefined;
        const provider = new (class extends NullFileSystemProvider {
            async stat(resource) {
                return {
                    mtime: Date.now(),
                    ctime: Date.now(),
                    size: 100,
                    type: FileType.File,
                };
            }
            readFileStream(resource, opts, token) {
                const stream = newWriteableStream((chunk) => chunk[0]);
                disposables.add(token.onCancellationRequested(() => {
                    stream.error(new Error('Expected cancellation'));
                    stream.end();
                }));
                readFileStreamReady.complete();
                return stream;
            }
        })();
        disposables.add(service.registerProvider('test', provider));
        provider.setCapabilities(16 /* FileSystemProviderCapabilities.FileReadStream */);
        let e1;
        try {
            const cts = new CancellationTokenSource();
            readFileStreamReady = new DeferredPromise();
            const promise = service.readFile(URI.parse('test://foo/bar'), undefined, cts.token);
            await Promise.all([readFileStreamReady.p.then(() => cts.cancel()), promise]);
        }
        catch (error) {
            e1 = error;
        }
        assert.ok(e1);
        let e2;
        try {
            const cts = new CancellationTokenSource();
            readFileStreamReady = new DeferredPromise();
            const stream = await service.readFileStream(URI.parse('test://foo/bar'), undefined, cts.token);
            await Promise.all([
                readFileStreamReady.p.then(() => cts.cancel()),
                consumeStream(stream.value, (chunk) => chunk[0]),
            ]);
        }
        catch (error) {
            e2 = error;
        }
        assert.ok(e2);
    });
    test('enforced atomic read/write/delete', async () => {
        const service = disposables.add(new FileService(new NullLogService()));
        const atomicResource = URI.parse('test://foo/bar/atomic');
        const nonAtomicResource = URI.parse('test://foo/nonatomic');
        let atomicReadCounter = 0;
        let atomicWriteCounter = 0;
        let atomicDeleteCounter = 0;
        const provider = new (class extends NullFileSystemProvider {
            async stat(resource) {
                return {
                    type: FileType.File,
                    ctime: Date.now(),
                    mtime: Date.now(),
                    size: 0,
                };
            }
            async readFile(resource, opts) {
                if (opts?.atomic) {
                    atomicReadCounter++;
                }
                return new Uint8Array();
            }
            readFileStream(resource, opts, token) {
                return newWriteableStream((chunk) => chunk[0]);
            }
            enforceAtomicReadFile(resource) {
                return isEqual(resource, atomicResource);
            }
            async writeFile(resource, content, opts) {
                if (opts.atomic) {
                    atomicWriteCounter++;
                }
            }
            enforceAtomicWriteFile(resource) {
                return isEqual(resource, atomicResource) ? { postfix: '.tmp' } : false;
            }
            async delete(resource, opts) {
                if (opts.atomic) {
                    atomicDeleteCounter++;
                }
            }
            enforceAtomicDelete(resource) {
                return isEqual(resource, atomicResource) ? { postfix: '.tmp' } : false;
            }
        })();
        provider.setCapabilities(2 /* FileSystemProviderCapabilities.FileReadWrite */ |
            4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */ |
            16 /* FileSystemProviderCapabilities.FileReadStream */ |
            16384 /* FileSystemProviderCapabilities.FileAtomicRead */ |
            32768 /* FileSystemProviderCapabilities.FileAtomicWrite */ |
            65536 /* FileSystemProviderCapabilities.FileAtomicDelete */);
        disposables.add(service.registerProvider('test', provider));
        await service.readFile(atomicResource);
        await service.readFile(nonAtomicResource);
        await service.readFileStream(atomicResource);
        await service.readFileStream(nonAtomicResource);
        await service.writeFile(atomicResource, VSBuffer.fromString(''));
        await service.writeFile(nonAtomicResource, VSBuffer.fromString(''));
        await service.writeFile(atomicResource, bufferToStream(VSBuffer.fromString('')));
        await service.writeFile(nonAtomicResource, bufferToStream(VSBuffer.fromString('')));
        await service.writeFile(atomicResource, bufferToReadable(VSBuffer.fromString('')));
        await service.writeFile(nonAtomicResource, bufferToReadable(VSBuffer.fromString('')));
        await service.del(atomicResource);
        await service.del(nonAtomicResource);
        assert.strictEqual(atomicReadCounter, 2);
        assert.strictEqual(atomicWriteCounter, 3);
        assert.strictEqual(atomicDeleteCounter, 1);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2ZpbGVzL3Rlc3QvYnJvd3Nlci9maWxlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFDTixhQUFhLEVBQ2Isa0JBQWtCLEdBRWxCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFJTixRQUFRLEVBWVIsbUJBQW1CLEdBR25CLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUUzRCxLQUFLLENBQUMsY0FB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