/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { NativeWindow } from '../../electron-sandbox/window.js';
import { ITunnelService } from '../../../platform/tunnel/common/tunnel.js';
import { URI } from '../../../base/common/uri.js';
import { workbenchInstantiationService } from './workbenchTestServices.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
class TunnelMock {
    constructor() {
        this.assignedPorts = {};
        this.expectedDispose = false;
    }
    reset(ports) {
        this.assignedPorts = ports;
    }
    expectDispose() {
        this.expectedDispose = true;
    }
    getExistingTunnel() {
        return Promise.resolve(undefined);
    }
    openTunnel(_addressProvider, _host, port) {
        if (!this.assignedPorts[port]) {
            return Promise.reject(new Error('Unexpected tunnel request'));
        }
        const res = {
            localAddress: `localhost:${this.assignedPorts[port]}`,
            tunnelRemoteHost: '4.3.2.1',
            tunnelRemotePort: this.assignedPorts[port],
            privacy: '',
            dispose: () => {
                assert(this.expectedDispose, 'Unexpected dispose');
                this.expectedDispose = false;
                return Promise.resolve();
            },
        };
        delete this.assignedPorts[port];
        return Promise.resolve(res);
    }
    validate() {
        try {
            assert(Object.keys(this.assignedPorts).length === 0, 'Expected tunnel to be used');
            assert(!this.expectedDispose, 'Expected dispose to be called');
        }
        finally {
            this.expectedDispose = false;
        }
    }
}
class TestNativeWindow extends NativeWindow {
    create() { }
    registerListeners() { }
    enableMultiWindowAwareTimeout() { }
}
suite.skip('NativeWindow:resolveExternal', () => {
    const disposables = new DisposableStore();
    const tunnelMock = new TunnelMock();
    let window;
    setup(() => {
        const instantiationService = (workbenchInstantiationService(undefined, disposables));
        instantiationService.stub(ITunnelService, tunnelMock);
        window = disposables.add(instantiationService.createInstance(TestNativeWindow));
    });
    teardown(() => {
        disposables.clear();
    });
    async function doTest(uri, ports = {}, expectedUri) {
        tunnelMock.reset(ports);
        const res = await window.resolveExternalUri(URI.parse(uri), {
            allowTunneling: true,
            openExternal: true,
        });
        assert.strictEqual(!expectedUri, !res, `Expected URI ${expectedUri} but got ${res}`);
        if (expectedUri && res) {
            assert.strictEqual(res.resolved.toString(), URI.parse(expectedUri).toString());
        }
        tunnelMock.validate();
    }
    test('invalid', async () => {
        await doTest('file:///foo.bar/baz');
        await doTest('http://foo.bar/path');
    });
    test('simple', async () => {
        await doTest('http://localhost:1234/path', { 1234: 1234 }, 'http://localhost:1234/path');
    });
    test('all interfaces', async () => {
        await doTest('http://0.0.0.0:1234/path', { 1234: 1234 }, 'http://localhost:1234/path');
    });
    test('changed port', async () => {
        await doTest('http://localhost:1234/path', { 1234: 1235 }, 'http://localhost:1235/path');
    });
    test('query', async () => {
        await doTest('http://foo.bar/path?a=b&c=http%3a%2f%2flocalhost%3a4455', { 4455: 4455 }, 'http://foo.bar/path?a=b&c=http%3a%2f%2flocalhost%3a4455');
    });
    test('query with different port', async () => {
        tunnelMock.expectDispose();
        await doTest('http://foo.bar/path?a=b&c=http%3a%2f%2flocalhost%3a4455', { 4455: 4567 });
    });
    test('both url and query', async () => {
        await doTest('http://localhost:1234/path?a=b&c=http%3a%2f%2flocalhost%3a4455', { 1234: 4321, 4455: 4455 }, 'http://localhost:4321/path?a=b&c=http%3a%2f%2flocalhost%3a4455');
    });
    test('both url and query, query rejected', async () => {
        tunnelMock.expectDispose();
        await doTest('http://localhost:1234/path?a=b&c=http%3a%2f%2flocalhost%3a4455', { 1234: 4321, 4455: 5544 }, 'http://localhost:4321/path?a=b&c=http%3a%2f%2flocalhost%3a4455');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZUV4dGVybmFsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2VsZWN0cm9uLXNhbmRib3gvcmVzb2x2ZUV4dGVybmFsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsY0FBYyxFQUFnQixNQUFNLDJDQUEyQyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUdqRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFJbkUsTUFBTSxVQUFVO0lBQWhCO1FBQ1Msa0JBQWEsR0FBWSxFQUFFLENBQUE7UUFDM0Isb0JBQWUsR0FBRyxLQUFLLENBQUE7SUE2Q2hDLENBQUM7SUEzQ0EsS0FBSyxDQUFDLEtBQWM7UUFDbkIsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUE7SUFDM0IsQ0FBQztJQUVELGFBQWE7UUFDWixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQTtJQUM1QixDQUFDO0lBRUQsaUJBQWlCO1FBQ2hCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsVUFBVSxDQUNULGdCQUE4QyxFQUM5QyxLQUF5QixFQUN6QixJQUFZO1FBRVosSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxD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