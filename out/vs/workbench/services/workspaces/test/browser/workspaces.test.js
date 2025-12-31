/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { getWorkspaceIdentifier, getSingleFolderWorkspaceIdentifier, } from '../../browser/workspaces.js';
suite('Workspaces', () => {
    test('workspace identifiers are stable', function () {
        // workspace identifier
        assert.strictEqual(getWorkspaceIdentifier(URI.parse('vscode-remote:/hello/test')).id, '474434e4');
        // single folder identifier
        assert.strictEqual(getSingleFolderWorkspaceIdentifier(URI.parse('vscode-remote:/hello/test'))?.id, '474434e4');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtzcGFjZXMvdGVzdC9icm93c2VyL3dvcmtzcGFjZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsa0NBQWtDLEdBQ2xDLE1BQU0sNkJBQTZCLENBQUE7QUFFcEMsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7SUFDeEIsSUFBSSxDQUFDLGtDQUFrQyxFQUFFO1FBQ3hDLHVCQUF1QjtRQUN2QixNQUFNLENBQUMsV0FBVyxDQUNqQixzQkFBc0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQ2pFLFVBQVUsQ0FDVixDQUFBO1FBRUQsMkJBQTJCO1FBQzNCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLGtDQUFrQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFDOUUsVUFBVSxDQUNWLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7QUFDMUMsQ0FBQyxDQUFDLENBQUEifQ==