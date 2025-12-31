/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { findExpressionInStackFrame } from '../../browser/debugHover.js';
import { Scope, StackFrame, Thread, Variable } from '../../common/debugModel.js';
import { Source } from '../../common/debugSource.js';
import { createTestSession } from './callStack.test.js';
import { createMockDebugModel, mockUriIdentityService } from './mockDebugModel.js';
suite('Debug - Hover', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    test('find expression in stack frame', async () => {
        const model = createMockDebugModel(disposables);
        const session = disposables.add(createTestSession(model));
        const thread = new (class extends Thread {
            getCallStack() {
                return [stackFrame];
            }
        })(session, 'mockthread', 1);
        const firstSource = new Source({
            name: 'internalModule.js',
            path: 'a/b/c/d/internalModule.js',
            sourceReference: 10,
        }, 'aDebugSessionId', mockUriIdentityService, new NullLogService());
        const stackFrame = new (class extends StackFrame {
            getScopes() {
                return Promise.resolve([scope]);
            }
        })(thread, 1, firstSource, 'app.js', 'normal', { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 10 }, 1, true);
        const scope = new (class extends Scope {
            getChildren() {
                return Promise.resolve([variableA]);
            }
        })(stackFrame, 1, 'local', 1, false, 10, 10);
        const variableA = new (class extends Variable {
            getChildren() {
                return Promise.resolve([variableB]);
            }
        })(session, 1, scope, 2, 'A', 'A', undefined, 0, 0, undefined, {}, 'string');
        const variableB = new Variable(session, 1, scope, 2, 'B', 'A.B', undefined, 0, 0, undefined, {}, 'string');
        assert.strictEqual(await findExpressionInStackFrame(stackFrame, []), undefined);
        assert.strictEqual(await findExpressionInStackFrame(stackFrame, ['A']), variableA);
        assert.strictEqual(await findExpressionInStackFrame(stackFrame, ['doesNotExist', 'no']), undefined);
        assert.strictEqual(await findExpressionInStackFrame(stackFrame, ['a']), undefined);
        assert.strictEqual(await findExpressionInStackFrame(stackFrame, ['B']), undefined);
        assert.strictEqual(await findExpressionInStackFrame(stackFrame, ['A', 'B']), variableB);
        assert.strictEqual(await findExpressionInStackFrame(stackFrame, ['A', 'C']), undefined);
        // We do not search in expensive scopes
        scope.expensive = true;
        assert.strictEqual(await findExpressionInStackFrame(stackFrame, ['A']), undefined);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdIb3Zlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9icm93c2VyL2RlYnVnSG92ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXhFLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNoRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDcEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDdkQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLHNCQUFzQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFbEYsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7SUFDM0IsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUU3RCxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakQsTUFBTSxLQUFLLEdBQUcsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDL0MsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBRXpELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFNLFNBQVEsTUFBTTtZQUN2QixZQUFZO2dCQUMzQixPQUFP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