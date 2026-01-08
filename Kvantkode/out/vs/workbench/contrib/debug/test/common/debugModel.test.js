/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DeferredPromise } from '../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mockObject } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { DebugModel, ExceptionBreakpoint, FunctionBreakpoint, } from '../../common/debugModel.js';
import { MockDebugStorage } from './mockDebug.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
suite('DebugModel', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('FunctionBreakpoint', () => {
        test('Id is saved', () => {
            const fbp = new FunctionBreakpoint({
                name: 'function',
                enabled: true,
                hitCondition: 'hit condition',
                condition: 'condition',
                logMessage: 'log message',
            });
            const strigified = JSON.stringify(fbp);
            const parsed = JSON.parse(strigified);
            assert.equal(parsed.id, fbp.getId());
        });
    });
    suite('ExceptionBreakpoint', () => {
        test('Restored matches new', () => {
            const ebp = new ExceptionBreakpoint({
                conditionDescription: 'condition description',
                description: 'description',
                filter: 'condition',
                label: 'label',
                supportsCondition: true,
                enabled: true,
            }, 'id');
            const strigified = JSON.stringify(ebp);
            const parsed = JSON.parse(strigified);
            const newEbp = new ExceptionBreakpoint(parsed);
            assert.ok(ebp.matches(newEbp));
        });
    });
    suite('DebugModel', () => {
        test('refreshTopOfCallstack resolves all returned promises when called multiple times', async () => {
            const topFrameDeferred = new DeferredPromise();
            const wholeStackDeferred = new DeferredPromise();
            const fakeThread = mockObject()({
                session: { capabilities: { supportsDelayedStackTraceLoading: true } },
                getCallStack: () => [],
                getStaleCallStack: () => [],
            });
            fakeThread.fetchCallStack.callsFake((levels) => {
                return levels === 1 ? topFrameDeferred.p : wholeStackDeferred.p;
            });
            fakeThread.getId.returns(1);
            const disposable = new DisposableStore();
            const storage = disposable.add(new TestStorageService());
            const model = new DebugModel(disposable.add(new MockDebugStorage(storage)), { isDirty: (e) => false }, undefined, new NullLogService());
            disposable.add(model);
            let top1Resolved = false;
            let whole1Resolved = false;
            let top2Resolved = false;
            let whole2Resolved = false;
            const result1 = model.refreshTopOfCallstack(fakeThread);
            result1.topCallStack.then(() => (top1Resolved = true));
            result1.wholeCallStack.then(() => (whole1Resolved = true));
            const result2 = model.refreshTopOfCallstack(fakeThread);
            result2.topCallStack.then(() => (top2Resolved = true));
            result2.wholeCallStack.then(() => (whole2Resolved = true));
            assert.ok(!top1Resolved);
            assert.ok(!whole1Resolved);
            assert.ok(!top2Resolved);
            assert.ok(!whole2Resolved);
            await topFrameDeferred.complete();
            await result1.topCallStack;
            await result2.topCallStack;
            assert.ok(!whole1Resolved);
            assert.ok(!whole2Resolved);
            await wholeStackDeferred.complete();
            await result1.wholeCallStack;
            await result2.wholeCallStack;
            disposable.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L2NvbW1vbi9kZWJ1Z01vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQ04sVUFBVSxFQUNWLG1CQUFtQixFQUNuQixrQkFBa0IsR0FFbEIsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVyRixLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtJQUN4Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7UUFDaEMsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7WUFDeEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQztnQkFDbEMsSUFBSSxFQUFFLFVBQVU7Z0JBQ2hCLE9BQU8sRUFBRSxJQUFJO2dCQUNiLFlBQVksRUFBRSxlQUFlO2dCQUM3QixTQUFTLEVBQUUsV0FBVztnQkFDdEIsVUFBVSxFQUFFLGFBQWE7YUFDekIsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ3JDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUNyQyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUNqQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1lBQ2pDLE1BQU0sR0FBRyxHQUFHLElBQUksbUJBQW1CLENBQ2xDO2dCQUNDLG9CQUFvQixFQUFFLHVCQUF1QjtnQkFDN0MsV0FBVyxFQUFFLGFBQWE7Z0JBQzFCLE1BQU0sRUFBRSxXQUFXO2dCQUNuQixLQUFLLEVBQUUsT0FBTztnQkFDZCxpQkFBaUIsRUFBRSxJQUFJO2dCQUN2QixPQUFPLEVBQUUsSUFBSTthQUNiLEVBQ0QsSUFBSSxDQUNKLENBQUE7WUFDRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDckMsTUFBTSxNQUFNLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM5QyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUMvQixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDeEIsSUFBSSxDQUFDLGlGQUFpRixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2xHLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxlQUFlLEVBQVEsQ0FBQTtZQUNwRCxNQUFNLGtCQUFrQixHQUFHLElBQUksZUFBZSxFQUFRLENBQUE7WUFDdEQsTUFBTSxVQUFVLEdBQUcsVUFBVSxFQUFVLENBQUM7Z0JBQ3ZDLE9BQU8sRUFBRSxFQUFFLFlBQVksRUFBRSxFQUFFLGdDQUFnQyxFQUFFLElBQUksRUFBRSxFQUFTO2dCQUM1RSxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtnQkFDdEIsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTthQUMzQixDQUFDLENBQUE7WUFDRixVQUFVLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQWMsRUFBRSxFQUFFO2dCQUN0RCxPQUFPLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO1lBQ2hFLENBQUMsQ0FBQyxDQUFBO1lBQ0YsVUFBVSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFM0IsTUFBTSxVQUFVLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtZQUN4QyxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxDQUFBO1lBQ3hELE1BQU0sS0FBSyxHQUFHLElBQUksVUFBVSxDQUMzQixVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsRUFDeEMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUNuQyxTQUFVLEVBQ1YsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtZQUNELFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFckIsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFBO1lBQ3hCLElBQUksY0FBYyxHQUFHLEtBQUssQ0FBQTtZQUMxQixJQUFJLFlBQVksR0FBRyxLQUFLLENBQUE7WUFDeEIsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFBO1lBQzFCLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxVQUFpQixDQUFDLENBQUE7WUFDOUQsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUN0RCxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBRTFELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxVQUFpQixDQUFDLENBQUE7WUFDOUQsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUN0RCxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBRTFELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDMUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ3hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUUxQixNQUFNLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ2pDLE1BQU0sT0FBTyxDQUFDLFlBQVksQ0FBQTtZQUMxQixNQUFNLE9BQU8sQ0FBQyxZQUFZLENBQUE7WUFDMUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQzFCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUUxQixNQUFNLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ25DLE1BQU0sT0FBTyxDQUFDLGNBQWMsQ0FBQTtZQUM1QixNQUFNLE9BQU8sQ0FBQyxjQUFjLENBQUE7WUFFNUIsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3JCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9