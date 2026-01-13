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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdlYnZpZXcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdFdlYnZpZXcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUV4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDckUsT0FBTyxFQUNOLGVBQWUsRUFDZix1QkFBdUIsR0FDdkIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUtuRCxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBQzVCLElBQUksV0FBNEIsQ0FBQTtJQUNoQyxJQUFJLFdBQStELENBQUE7SUFFbkUsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFB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