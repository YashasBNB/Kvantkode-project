/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { MainThreadDocumentContentProviders } from '../../browser/mainThreadDocumentContentProviders.js';
import { createTextModel } from '../../../../editor/test/common/testTextModel.js';
import { mock } from '../../../../base/test/common/mock.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('MainThreadDocumentContentProviders', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('events are processed properly', function () {
        const uri = URI.parse('test:uri');
        const model = createTextModel('1', undefined, undefined, uri);
        const providers = new MainThreadDocumentContentProviders(new TestRPCProtocol(), null, null, new (class extends mock() {
            getModel(_uri) {
                assert.strictEqual(uri.toString(), _uri.toString());
                return model;
            }
        })(), new (class extends mock() {
            computeMoreMinimalEdits(_uri, data) {
                assert.strictEqual(model.getValue(), '1');
                return Promise.resolve(data);
            }
        })());
        store.add(model);
        store.add(providers);
        return new Promise((resolve, reject) => {
            let expectedEvents = 1;
            store.add(model.onDidChangeContent((e) => {
                expectedEvents -= 1;
                try {
                    assert.ok(expectedEvents >= 0);
                }
                catch (err) {
                    reject(err);
                }
                if (model.getValue() === '1\n2\n3') {
                    model.dispose();
                    resolve();
                }
            }));
            providers.$onVirtualDocumentChange(uri, '1\n2');
            providers.$onVirtualDocumentChange(uri, '1\n2\n3');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50Q29udGVudFByb3ZpZGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvbWFpblRocmVhZERvY3VtZW50Q29udGVudFByb3ZpZGVycy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDeEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUczRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsS0FBSyxDQUFDLG9DQUFvQyxFQUFFO0lBQzNDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsSUFBSSxDQUFDLCtCQUErQixFQUFFO1FBQ3JDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDakMsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBRTdELE1BQU0sU0FBUyxHQUFHLElBQUksa0NBQWtDLENBQ3ZELElBQUksZUFBZSxFQUFFLEVBQ3JCLElBQUssRUFDTCxJQUFLLEVBQ0wsSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQWlCO1lBQzlCLFFBQVEsQ0FBQyxJQUFTO2dCQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtnQkFDbkQsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1NBQ0QsQ0FBQyxFQUFFLEVBQ0osSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQXdCO1lBQ3JDLHVCQUF1QixDQUFDLElBQVMsRUFBRSxJQUE0QjtnQkFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBQ3pDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM3QixDQUFDO1NBQ0QsQ0FBQyxFQUFFLENBQ0osQ0FBQTtRQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDaEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUVwQixPQUFPLElBQUksT0FBTyxDQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzVDLElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQTtZQUN0QixLQUFLLENBQUMsR0FBRyxDQUNSLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUM5QixjQUFjLElBQUksQ0FBQyxDQUFBO2dCQUNuQixJQUFJLENBQUM7b0JBQ0osTUFBTSxDQUFDLEVBQUUsQ0FBQyxjQUFjLElBQUksQ0FBQyxDQUFDLENBQUE7Z0JBQy9CLENBQUM7Z0JBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztvQkFDZCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ1osQ0FBQztnQkFDRCxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDcEMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO29CQUNmLE9BQU8sRUFBRSxDQUFBO2dCQUNWLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1lBQ0QsU0FBUyxDQUFDLHdCQUF3QixDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUMvQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ25ELENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9