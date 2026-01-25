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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvdGVzdC9icm93c2VyL2ZpbGVTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUNOLGFBQWEsRUFDYixrQkFBa0IsR0FFbEIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUlOLFFBQVEsRUFZUixtQkFBbUIsR0FHbkIsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDekQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRTNELEtBQUssQ0FB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