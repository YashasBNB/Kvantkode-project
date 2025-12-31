/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorCommand, registerEditorCommand } from '../../../browser/editorExtensions.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { createDecorator, } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { localize } from '../../../../nls.js';
const IEditorCancellationTokens = createDecorator('IEditorCancelService');
const ctxCancellableOperation = new RawContextKey('cancellableOperation', false, localize('cancellableOperation', "Whether the editor runs a cancellable operation, e.g. like 'Peek References'"));
registerSingleton(IEditorCancellationTokens, class {
    constructor() {
        this._tokens = new WeakMap();
    }
    add(editor, cts) {
        let data = this._tokens.get(editor);
        if (!data) {
            data = editor.invokeWithinContext((accessor) => {
                const key = ctxCancellableOperation.bindTo(accessor.get(IContextKeyService));
                const tokens = new LinkedList();
                return { key, tokens };
            });
            this._tokens.set(editor, data);
        }
        let removeFn;
        data.key.set(true);
        removeFn = data.tokens.push(cts);
        return () => {
            // remove w/o cancellation
            if (removeFn) {
                removeFn();
                data.key.set(!data.tokens.isEmpty());
                removeFn = undefined;
            }
        };
    }
    cancel(editor) {
        const data = this._tokens.get(editor);
        if (!data) {
            return;
        }
        // remove with cancellation
        const cts = data.tokens.pop();
        if (cts) {
            cts.cancel();
            data.key.set(!data.tokens.isEmpty());
        }
    }
}, 1 /* InstantiationType.Delayed */);
export class EditorKeybindingCancellationTokenSource extends CancellationTokenSource {
    constructor(editor, parent) {
        super(parent);
        this.editor = editor;
        this._unregister = editor.invokeWithinContext((accessor) => accessor.get(IEditorCancellationTokens).add(editor, this));
    }
    dispose() {
        this._unregister();
        super.dispose();
    }
}
registerEditorCommand(new (class extends EditorCommand {
    constructor() {
        super({
            id: 'editor.cancelOperation',
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
            },
            precondition: ctxCancellableOperation,
        });
    }
    runEditorCommand(accessor, editor) {
        accessor.get(IEditorCancellationTokens).cancel(editor);
    }
})());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0NhbmNlbGxhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2VkaXRvclN0YXRlL2Jyb3dzZXIva2V5YmluZGluZ0NhbmNlbGxhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFM0YsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixhQUFhLEdBRWIsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsdUJBQXVCLEVBQXFCLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xFLE9BQU8sRUFDTixlQUFlLEdBRWYsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE1BQU0seUJBQXlCLEdBQUcsZUFBZSxDQUE0QixzQkFBc0IsQ0FBQyxDQUFBO0FBUXBHLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxhQUFhLENBQ2hELHNCQUFzQixFQUN0QixLQUFLLEVBQ0wsUUFBUSxDQUNQLHNCQUFzQixFQUN0Qiw4RUFBOEUsQ0FDOUUsQ0FDRCxDQUFBO0FBRUQsaUJBQWlCLENBQ2hCLHlCQUF5QixFQUN6QjtJQUFBO1FBR2tCLFlBQU8sR0FBRyxJQUFJLE9BQU8sRUFHbkMsQ0FBQTtJQXdDSixDQUFDO0lBdENBLEdBQUcsQ0FBQyxNQUFtQixFQUFFLEdBQTRCO1FBQ3BELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FB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