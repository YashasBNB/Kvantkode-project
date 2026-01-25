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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50Q29udGVudFByb3ZpZGVycy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9tYWluVGhyZWFkRG9jdW1lbnRDb250ZW50UHJvdmlkZXJzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDakYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixLQUFLLENBQUMsb0NBQW9DLEVBQUU7SUFDM0MsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLENBQUMsK0JBQStCLEVBQUU7UUFDckMsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNqQyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFN0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxrQ0FBa0MsQ0FDdkQsSUFBSSxlQUFlLEVBQUUsRUFDckIsSUFBSyxFQUNMLElBQUssRUFDTCxJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBaUI7WUFDOUIsUUFBUSxDQUFDLElBQVM7Z0JBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO2dCQUNuRCxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7U0FDRCxDQUFDLEVBQUUsRUFDSixJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBd0I7WUFDckMsdUJBQXVCLENBQUMsSUFBUyxFQUFFLElBQTRCO2dCQUN2RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDekMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzdCLENBQUM7U0FDRCxDQUFDLEVBQUUsQ0FDSixDQUFBO1FBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNoQixLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRXBCLE9BQU8sSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDNUMsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFBO1lBQ3RCLEtBQUssQ0FBQyxHQUFHLENBQ1IsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQzlCLGNBQWMsSUFBSSxDQUFDLENBQUE7Z0JBQ25CLElBQUksQ0FBQztvQkFDSixNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsSUFBSSxDQUFDLENBQUMsQ0FBQTtnQkFDL0IsQ0FBQztnQkFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO29CQUNkLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDWixDQUFDO2dCQUNELElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRSxLQUFLLFNBQVMsRUFBRSxDQUFDO29CQUNwQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7b0JBQ2YsT0FBTyxFQUFFLENBQUE7Z0JBQ1YsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRCxTQUFTLENBQUMsd0JBQXdCLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQy9DLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDbkQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=