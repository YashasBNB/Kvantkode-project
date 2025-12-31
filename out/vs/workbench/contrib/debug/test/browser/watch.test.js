/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { createMockDebugModel } from './mockDebugModel.js';
// Expressions
function assertWatchExpressions(watchExpressions, expectedName) {
    assert.strictEqual(watchExpressions.length, 2);
    watchExpressions.forEach((we) => {
        assert.strictEqual(we.available, false);
        assert.strictEqual(we.reference, 0);
        assert.strictEqual(we.name, expectedName);
    });
}
suite('Debug - Watch', () => {
    let model;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        model = createMockDebugModel(disposables);
    });
    test('watch expressions', () => {
        assert.strictEqual(model.getWatchExpressions().length, 0);
        model.addWatchExpression('console');
        model.addWatchExpression('console');
        let watchExpressions = model.getWatchExpressions();
        assertWatchExpressions(watchExpressions, 'console');
        model.renameWatchExpression(watchExpressions[0].getId(), 'new_name');
        model.renameWatchExpression(watchExpressions[1].getId(), 'new_name');
        assertWatchExpressions(model.getWatchExpressions(), 'new_name');
        assertWatchExpressions(model.getWatchExpressions(), 'new_name');
        model.addWatchExpression('mockExpression');
        model.moveWatchExpression(model.getWatchExpressions()[2].getId(), 1);
        watchExpressions = model.getWatchExpressions();
        assert.strictEqual(watchExpressions[0].name, 'new_name');
        assert.strictEqual(watchExpressions[1].name, 'mockExpression');
        assert.strictEqual(watchExpressions[2].name, 'new_name');
        model.removeWatchExpressions();
        assert.strictEqual(model.getWatchExpressions().length, 0);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2gudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3QvYnJvd3Nlci93YXRjaC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUUxRCxjQUFjO0FBRWQsU0FBUyxzQkFBc0IsQ0FBQyxnQkFBOEIsRUFBRSxZQUFvQjtJQUNuRixNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM5QyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtRQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUMxQyxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUM7QUFFRCxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUMzQixJQUFJLEtBQWlCLENBQUE7SUFDckIsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUU3RCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsS0FBSyxHQUFHLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzFDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUM5QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6RCxLQUFLLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDbkMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ25DLElBQUksZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDbEQsc0JBQXNCLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFbkQsS0FBSyxDQUFDLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ3BFLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNwRSxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUUvRCxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUUvRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUMxQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEUsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUV4RCxLQUFLLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtRQUM5QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMxRCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=