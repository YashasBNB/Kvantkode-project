/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { NullApiDeprecationService } from '../../common/extHostApiDeprecationService.js';
import { ExtHostWebviews } from '../../common/extHostWebview.js';
import { ExtHostWebviewPanels } from '../../common/extHostWebviewPanels.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { decodeAuthority, webviewResourceBaseHost, } from '../../../contrib/webview/common/webview.js';
suite('ExtHostWebview', () => {
    let disposables;
    let rpcProtocol;
    setup(() => {
        disposables = new DisposableStore();
        const shape = createNoopMainThreadWebviews();
        rpcProtocol = SingleProxyRPCProtocol(shape);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function createWebview(rpcProtocol, remoteAuthority) {
        const extHostWebviews = disposables.add(new ExtHostWebviews(rpcProtocol, {
            authority: remoteAuthority,
            isRemote: !!remoteAuthority,
        }, undefined, new NullLogService(), NullApiDeprecationService));
        const extHostWebviewPanels = disposables.add(new ExtHostWebviewPanels(rpcProtocol, extHostWebviews, undefined));
        return disposables.add(extHostWebviewPanels.createWebviewPanel({
            extensionLocation: URI.from({
                scheme: remoteAuthority ? Schemas.vscodeRemote : Schemas.file,
                authority: remoteAuthority,
                path: '/ext/path',
            }),
        }, 'type', 'title', 1, {}));
    }
    test('Cannot register multiple serializers for the same view type', async () => {
        const viewType = 'view.type';
        const extHostWebviews = disposables.add(new ExtHostWebviews(rpcProtocol, { authority: undefined, isRemote: false }, undefined, new NullLogService(), NullApiDeprecationService));
        const extHostWebviewPanels = disposables.add(new ExtHostWebviewPanels(rpcProtocol, extHostWebviews, undefined));
        let lastInvokedDeserializer = undefined;
        class NoopSerializer {
            async deserializeWebviewPanel(webview, _state) {
                lastInvokedDeserializer = this;
                disposables.add(webview);
            }
        }
        const extension = {};
        const serializerA = new NoopSerializer();
        const serializerB = new NoopSerializer();
        const serializerARegistration = extHostWebviewPanels.registerWebviewPanelSerializer(extension, viewType, serializerA);
        await extHostWebviewPanels.$deserializeWebviewPanel('x', viewType, {
            title: 'title',
            state: {},
            panelOptions: {},
            webviewOptions: {},
            active: true,
        }, 0);
        assert.strictEqual(lastInvokedDeserializer, serializerA);
        assert.throws(() => disposables.add(extHostWebviewPanels.registerWebviewPanelSerializer(extension, viewType, serializerB)), 'Should throw when registering two serializers for the same view');
        serializerARegistration.dispose();
        disposables.add(extHostWebviewPanels.registerWebviewPanelSerializer(extension, viewType, serializerB));
        await extHostWebviewPanels.$deserializeWebviewPanel('x', viewType, {
            title: 'title',
            state: {},
            panelOptions: {},
            webviewOptions: {},
            active: true,
        }, 0);
        assert.strictEqual(lastInvokedDeserializer, serializerB);
    });
    test('asWebviewUri for local file paths', () => {
        const webview = createWebview(rpcProtocol, /* remoteAuthority */ undefined);
        assert.strictEqual(webview.webview.asWebviewUri(URI.parse('file:///Users/codey/file.html')).toString(), `https://file%2B.vscode-resource.${webviewResourceBaseHost}/Users/codey/file.html`, 'Unix basic');
        assert.strictEqual(webview.webview.asWebviewUri(URI.parse('file:///Users/codey/file.html#frag')).toString(), `https://file%2B.vscode-resource.${webviewResourceBaseHost}/Users/codey/file.html#frag`, 'Unix should preserve fragment');
        assert.strictEqual(webview.webview.asWebviewUri(URI.parse('file:///Users/codey/f%20ile.html')).toString(), `https://file%2B.vscode-resource.${webviewResourceBaseHost}/Users/codey/f%20ile.html`, 'Unix with encoding');
        assert.strictEqual(webview.webview.asWebviewUri(URI.parse('file://localhost/Users/codey/file.html')).toString(), `https://file%2Blocalhost.vscode-resource.${webviewResourceBaseHost}/Users/codey/file.html`, 'Unix should preserve authority');
        assert.strictEqual(webview.webview.asWebviewUri(URI.parse('file:///c:/codey/file.txt')).toString(), `https://file%2B.vscode-resource.${webviewResourceBaseHost}/c%3A/codey/file.txt`, 'Windows C drive');
    });
    test('asWebviewUri for remote file paths', () => {
        const webview = createWebview(rpcProtocol, /* remoteAuthority */ 'remote');
        assert.strictEqual(webview.webview.asWebviewUri(URI.parse('file:///Users/codey/file.html')).toString(), `https://vscode-remote%2Bremote.vscode-resource.${webviewResourceBaseHost}/Users/codey/file.html`, 'Unix basic');
    });
    test('asWebviewUri for remote with / and + in name', () => {
        const webview = createWebview(rpcProtocol, /* remoteAuthority */ 'remote');
        const authority = 'ssh-remote+localhost=foo/bar';
        const sourceUri = URI.from({
            scheme: 'vscode-remote',
            authority: authority,
            path: '/Users/cody/x.png',
        });
        const webviewUri = webview.webview.asWebviewUri(sourceUri);
        assert.strictEqual(webviewUri.toString(), `https://vscode-remote%2Bssh-002dremote-002blocalhost-003dfoo-002fbar.vscode-resource.vscode-cdn.net/Users/cody/x.png`, 'Check transform');
        assert.strictEqual(decodeAuthority(webviewUri.authority), `vscode-remote+${authority}.vscode-resource.vscode-cdn.net`, 'Check decoded authority');
    });
    test('asWebviewUri for remote with port in name', () => {
        const webview = createWebview(rpcProtocol, /* remoteAuthority */ 'remote');
        const authority = 'localhost:8080';
        const sourceUri = URI.from({
            scheme: 'vscode-remote',
            authority: authority,
            path: '/Users/cody/x.png',
        });
        const webviewUri = webview.webview.asWebviewUri(sourceUri);
        assert.strictEqual(webviewUri.toString(), `https://vscode-remote%2Blocalhost-003a8080.vscode-resource.vscode-cdn.net/Users/cody/x.png`, 'Check transform');
        assert.strictEqual(decodeAuthority(webviewUri.authority), `vscode-remote+${authority}.vscode-resource.vscode-cdn.net`, 'Check decoded authority');
    });
});
function createNoopMainThreadWebviews() {
    return new (class extends mock() {
        $disposeWebview() {
            /* noop */
        }
        $createWebviewPanel() {
            /* noop */
        }
        $registerSerializer() {
            /* noop */
        }
        $unregisterSerializer() {
            /* noop */
        }
    })();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RXZWJ2aWV3LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFdkUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3JFLE9BQU8sRUFDTixlQUFlLEVBQ2YsdUJBQXVCLEdBQ3ZCLE1BQU0sNENBQTRDLENBQUE7QUFLbkQsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUM1QixJQUFJLFdBQTRCLENBQUE7SUFDaEMsSUFBSSxXQUErRCxDQUFBO0lBRW5FLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUVuQyxNQUFNLEtBQUssR0FBRyw0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