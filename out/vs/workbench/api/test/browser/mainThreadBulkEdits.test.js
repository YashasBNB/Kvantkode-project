/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mock } from '../../../../base/test/common/mock.js';
import { Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { reviveWorkspaceEditDto } from '../../browser/mainThreadBulkEdits.js';
import { UriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentityService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('MainThreadBulkEdits', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('"Rename failed to apply edits" in monorepo with pnpm #158845', function () {
        const fileService = new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidChangeFileSystemProviderCapabilities = Event.None;
                this.onDidChangeFileSystemProviderRegistrations = Event.None;
            }
            hasProvider(uri) {
                return true;
            }
            hasCapability(resource, capability) {
                // if (resource.scheme === 'case' && capability === FileSystemProviderCapabilities.PathCaseSensitive) {
                // 	return false;
                // }
                // NO capabilities, esp not being case-sensitive
                return false;
            }
        })();
        const uriIdentityService = new UriIdentityService(fileService);
        const edits = [
            {
                resource: URI.from({ scheme: 'case', path: '/hello/WORLD/foo.txt' }),
                textEdit: {
                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    text: 'sss',
                },
                versionId: undefined,
            },
            {
                resource: URI.from({ scheme: 'case', path: '/heLLO/world/fOO.txt' }),
                textEdit: {
                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    text: 'sss',
                },
                versionId: undefined,
            },
            {
                resource: URI.from({ scheme: 'case', path: '/other/path.txt' }),
                textEdit: {
                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    text: 'sss',
                },
                versionId: undefined,
            },
            {
                resource: URI.from({ scheme: 'foo', path: '/other/path.txt' }),
                textEdit: {
                    range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
                    text: 'sss',
                },
                versionId: undefined,
            },
        ];
        const out = reviveWorkspaceEditDto({ edits }, uriIdentityService);
        assert.strictEqual(out.edits[0].resource.path, '/hello/WORLD/foo.txt');
        assert.strictEqual(out.edits[1].resource.path, '/hello/WORLD/foo.txt'); // the FIRST occurrence defined the shape!
        assert.strictEqual(out.edits[2].resource.path, '/other/path.txt');
        assert.strictEqual(out.edits[3].resource.path, '/other/path.txt');
        uriIdentityService.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEJ1bGtFZGl0cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvbWFpblRocmVhZEJ1bGtFZGl0cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUtwRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixLQUFLLENBQUMscUJBQXFCLEVBQUU7SUFDNUIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsOERBQThELEVBQUU7UUFDcEUsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQWdCO1lBQWxDOztnQkFDZiw4Q0FBeUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO2dCQUN0RCwrQ0FBMEMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1lBYWpFLENBQUM7WUFYUyxXQUFXLENBQUMsR0FBUTtnQkFDNUIsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBRVEsYUFBYSxDQUFDLFFBQWEsRUFBRSxVQUEwQztnQkFDL0UsdUdBQXVHO2dCQUN2RyxpQkFBaUI7Z0JBQ2pCLElBQUk7Z0JBQ0osZ0RBQWdEO2dCQUNoRCxPQUFPLEtBQUssQ0FBQTtZ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