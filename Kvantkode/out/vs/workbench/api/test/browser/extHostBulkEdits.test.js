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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEJ1bGtFZGl0cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0QnVsa0VkaXRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxZQUFZLE1BQU0sOEJBQThCLENBQUE7QUFDNUQsT0FBTyxFQUNOLFdBQVcsR0FJWCxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUcvRixLQUFLLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO0lBQ2pELE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDckMsSUFBSSxTQUEyQixDQUFBO0lBQy9CLElBQUksc0JBQXlDLENBQUE7SUFFN0MsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLHNCQUFzQixHQUFHLElBQUss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