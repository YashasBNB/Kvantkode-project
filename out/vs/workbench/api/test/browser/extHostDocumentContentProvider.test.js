/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ExtHostDocumentContentProvider } from '../../common/extHostDocumentContentProviders.js';
import { Emitter } from '../../../../base/common/event.js';
import { timeout } from '../../../../base/common/async.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
suite('ExtHostDocumentContentProvider', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const resource = URI.parse('foo:bar');
    let documentContentProvider;
    let mainThreadContentProvider;
    const changes = [];
    setup(() => {
        changes.length = 0;
        mainThreadContentProvider = new (class {
            $registerTextContentProvider(handle, scheme) { }
            $unregisterTextContentProvider(handle) { }
            async $onVirtualDocumentChange(uri, value) {
                await timeout(10);
                changes.push([uri, value]);
            }
            dispose() {
                throw new Error('Method not implemented.');
            }
        })();
        const ehContext = SingleProxyRPCProtocol(mainThreadContentProvider);
        const documentsAndEditors = new ExtHostDocumentsAndEditors(ehContext, new NullLogService());
        documentsAndEditors.$acceptDocumentsAndEditorsDelta({
            addedDocuments: [
                {
                    isDirty: false,
                    languageId: 'foo',
                    uri: resource,
                    versionId: 1,
                    lines: ['foo'],
                    EOL: '\n',
                    encoding: 'utf8',
                },
            ],
        });
        documentContentProvider = new ExtHostDocumentContentProvider(ehContext, documentsAndEditors, new NullLogService());
    });
    test('TextDocumentContentProvider drops onDidChange events when they happen quickly #179711', async () => {
        await runWithFakedTimers({}, async function () {
            const emitter = new Emitter();
            const contents = ['X', 'Y'];
            let counter = 0;
            let stack = 0;
            const d = documentContentProvider.registerTextDocumentContentProvider(resource.scheme, {
                onDidChange: emitter.event,
                async provideTextDocumentContent(_uri) {
                    assert.strictEqual(stack, 0);
                    stack++;
                    try {
                        await timeout(0);
                        return contents[counter++ % contents.length];
                    }
                    finally {
                        stack--;
                    }
                },
            });
            emitter.fire(resource);
            emitter.fire(resource);
            await timeout(100);
            assert.strictEqual(changes.length, 2);
            assert.strictEqual(changes[0][1], 'X');
            assert.strictEqual(changes[1][1], 'Y');
            d.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50Q29udGVudFByb3ZpZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0RG9jdW1lbnRDb250ZW50UHJvdmlkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUV4RixLQUFLLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO0lBQzVDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUNyQyxJQUFJLHVCQUF1RCxDQUFBO0lBQzNELElBQUkseUJBQWtFLENBQUE7SUFDdEUsTUFBTSxPQUFPLEdBQTBDLEVBQUUsQ0FBQTtJQUV6RCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsT0FB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