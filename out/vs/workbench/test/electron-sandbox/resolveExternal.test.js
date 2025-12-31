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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZUV4dGVybmFsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9lbGVjdHJvbi1zYW5kYm94L3Jlc29sdmVFeHRlcm5hbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGNBQWMsRUFBZ0IsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFHakQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBSW5FLE1BQU0sVUFBVTtJQUFoQjtRQUNTLGtCQUFhLEdBQVksRUFBRSxDQUFBO1FBQzNCLG9CQUFlLEdBQUcsS0FBSyxDQUFBO0lBNkNoQyxDQUFDO0lBM0NBLEtBQUssQ0FBQyxLQUFjO1FBQ25CLElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFBO0lBQzNCLENBQUM7SUFFRCxhQUFhO1FBQ1osSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUE7SUFDNUIsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELFVBQVUsQ0FDVCxnQkFBOEMsRUFDOUMsS0FBeUIsRUFDekIsSUFBWTtRQUVaLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDL0IsT0FB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