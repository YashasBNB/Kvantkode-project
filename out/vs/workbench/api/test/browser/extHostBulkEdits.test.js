/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as extHostTypes from '../../common/extHostTypes.js';
import { MainContext, } from '../../common/extHost.protocol.js';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ExtHostDocumentsAndEditors } from '../../common/extHostDocumentsAndEditors.js';
import { SingleProxyRPCProtocol, TestRPCProtocol } from '../common/testRPCProtocol.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { ExtHostBulkEdits } from '../../common/extHostBulkEdits.js';
import { nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostBulkEdits.applyWorkspaceEdit', () => {
    const resource = URI.parse('foo:bar');
    let bulkEdits;
    let workspaceResourceEdits;
    setup(() => {
        workspaceResourceEdits = null;
        const rpcProtocol = new TestRPCProtocol();
        rpcProtocol.set(MainContext.MainThreadBulkEdits, new (class extends mock() {
            $tryApplyWorkspaceEdit(_workspaceResourceEdits) {
                workspaceResourceEdits = _workspaceResourceEdits.value;
                return Promise.resolve(true);
            }
        })());
        const documentsAndEditors = new ExtHostDocumentsAndEditors(SingleProxyRPCProtocol(null), new NullLogService());
        documentsAndEditors.$acceptDocumentsAndEditorsDelta({
            addedDocuments: [
                {
                    isDirty: false,
                    languageId: 'foo',
                    uri: resource,
                    versionId: 1337,
                    lines: ['foo'],
                    EOL: '\n',
                    encoding: 'utf8',
                },
            ],
        });
        bulkEdits = new ExtHostBulkEdits(rpcProtocol, documentsAndEditors);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('uses version id if document available', async () => {
        const edit = new extHostTypes.WorkspaceEdit();
        edit.replace(resource, new extHostTypes.Range(0, 0, 0, 0), 'hello');
        await bulkEdits.applyWorkspaceEdit(edit, nullExtensionDescription, undefined);
        assert.strictEqual(workspaceResourceEdits.edits.length, 1);
        const [first] = workspaceResourceEdits.edits;
        assert.strictEqual(first.versionId, 1337);
    });
    test('does not use version id if document is not available', async () => {
        const edit = new extHostTypes.WorkspaceEdit();
        edit.replace(URI.parse('foo:bar2'), new extHostTypes.Range(0, 0, 0, 0), 'hello');
        await bulkEdits.applyWorkspaceEdit(edit, nullExtensionDescription, undefined);
        assert.strictEqual(workspaceResourceEdits.edits.length, 1);
        const [first] = workspaceResourceEdits.edits;
        assert.ok(typeof first.versionId === 'undefined');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEJ1bGtFZGl0cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdEJ1bGtFZGl0cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssWUFBWSxNQUFNLDhCQUE4QixDQUFBO0FBQzVELE9BQU8sRUFDTixXQUFXLEdBSVgsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDNUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFHL0YsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtJQUNqRCxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ3JDLElBQUksU0FBMkIsQ0FBQTtJQUMvQixJQUFJLHNCQUF5QyxDQUFBO0lBRTdDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixzQkFBc0IsR0FBRyxJQUFLLENBQUE7UUFFOUIsTUFBTSxXQUFXLEdB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