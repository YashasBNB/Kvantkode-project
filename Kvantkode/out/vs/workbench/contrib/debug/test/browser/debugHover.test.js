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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdIb3Zlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L2Jyb3dzZXIvZGVidWdIb3Zlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFeEUsT0FBTyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ2hGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUVsRixLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUMzQixNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRTdELElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNqRCxNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUMvQyxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFFekQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQU0sU0FBUSxNQUFN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