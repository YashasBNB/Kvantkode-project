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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEJ1bGtFZGl0cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9tYWluVGhyZWFkQnVsa0VkaXRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBS3BELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRWxHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLEtBQUssQ0FBQyxxQkFBcUIsRUFBRTtJQUM1Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyw4REFBOEQsRUFBRTtRQUNwRSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBZ0I7WUFBbEM7O2dCQUNmLDhDQUF5QyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7Z0JBQ3RELCtDQUEwQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7WUFhakUsQ0FBQztZQVhTLFdBQVcsQ0FBQyxHQUFRO2dCQUM1QixPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7WUFFUSxhQUFhLENBQUMsUUFBYSxFQUFFLFVBQTBDO2dCQUMvRSx1R0FBdUc7Z0JBQ3ZHLGlCQUFpQjtnQkFDakIsSUFBSTtnQkFDSixnREFBZ0Q7Z0JBQ2hELE9BQU8sS0FBSyxD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