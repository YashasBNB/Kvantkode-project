/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { Expression, StackFrame, Thread } from '../../common/debugModel.js';
import { Source } from '../../common/debugSource.js';
import { ViewModel } from '../../common/debugViewModel.js';
import { mockUriIdentityService } from './mockDebugModel.js';
import { MockSession } from '../common/mockDebug.js';
suite('Debug - View Model', () => {
    let model;
    setup(() => {
        model = new ViewModel(new MockContextKeyService());
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('focused stack frame', () => {
        assert.strictEqual(model.focusedStackFrame, undefined);
        assert.strictEqual(model.focusedThread, undefined);
        const session = new MockSession();
        const thread = new Thread(session, 'myThread', 1);
        const source = new Source({
            name: 'internalModule.js',
            sourceReference: 11,
            presentationHint: 'deemphasize',
        }, 'aDebugSessionId', mockUriIdentityService, new NullLogService());
        const frame = new StackFrame(thread, 1, source, 'app.js', 'normal', { startColumn: 1, startLineNumber: 1, endColumn: 1, endLineNumber: 1 }, 0, true);
        model.setFocus(frame, thread, session, false);
        assert.strictEqual(model.focusedStackFrame.getId(), frame.getId());
        assert.strictEqual(model.focusedThread.threadId, 1);
        assert.strictEqual(model.focusedSession.getId(), session.getId());
    });
    test('selected expression', () => {
        assert.strictEqual(model.getSelectedExpression(), undefined);
        const expression = new Expression('my expression');
        model.setSelectedExpression(expression, false);
        assert.strictEqual(model.getSelectedExpression()?.expression, expression);
    });
    test('multi session view and changed workbench state', () => {
        assert.strictEqual(model.isMultiSessionView(), false);
        model.setMultiSessionView(true);
        assert.strictEqual(model.isMultiSessionView(), true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdWaWV3TW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3QvYnJvd3Nlci9kZWJ1Z1ZpZXdNb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDM0UsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFcEQsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNoQyxJQUFJLEtBQWdCLENBQUE7SUFFcEIsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLEtBQUssR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLHFCQUFxQixFQUFFLENBQUMsQ0FBQTtJQUNuRCxDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDbEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQTtRQUNqQyxNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxDQUN4QjtZQUNDLElBQUksRUFBRSxtQkFBbUI7WUFDekIsZUFBZSxFQUFFLEVBQUU7WUFDbkIsZ0JBQWdCLEVBQUUsYUFBYTtTQUMvQixFQUNELGlCQUFpQixFQUNqQixzQkFBc0IsRUFDdEIsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQTtRQUNELE1BQU0sS0FBSyxHQUFHLElBQUksVUFBVSxDQUMzQixNQUFNLEVBQ04sQ0FBQyxFQUNELE1BQU0sRUFDTixRQUFRLEVBQ1IsUUFBUSxFQUNSLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxlQUFlLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRSxFQUN0RSxDQUFDLEVBQ0QsSUFBSSxDQUNKLENBQUE7UUFDRCxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGlCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGFBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBZSxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzVELE1BQU0sVUFBVSxHQUFHLElBQUksVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ2xELEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMscUJBQXFCLEVBQUUsRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDMUUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0RBQWdELEVBQUUsR0FBRyxFQUFFO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDckQsS0FBSyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDckQsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9