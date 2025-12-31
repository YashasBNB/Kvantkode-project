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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdNb2RlbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9jb21tb24vZGVidWdNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUNOLFVBQVUsRUFDVixtQkFBbUIsRUFDbkIsa0JBQWtCLEdBRWxCLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDakQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFckYsS0FBSyxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7SUFDeEIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1lBQ3hCLE1BQU0sR0FBRyxHQUFHLElBQUksa0JBQWtCLENBQUM7Z0JBQ2xDLElBQUksRUFBRSxVQUFVO2dCQUNoQixPQUFPLEVBQUUsSUFBSTtnQkFDYixZQUFZLEVBQUUsZUFBZTtnQkFDN0IsU0FBUyxFQUFFLFdBQVc7Z0JBQ3RCLFVBQVUsRUFBRSxhQUFhO2FB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