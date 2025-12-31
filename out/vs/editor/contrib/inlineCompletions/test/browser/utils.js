/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { timeout } from '../../../../../base/common/async.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { CoreEditingCommands, CoreNavigationCommands } from '../../../../browser/coreCommands.js';
import { autorun } from '../../../../../base/common/observable.js';
export class MockInlineCompletionsProvider {
    constructor() {
        this.returnValue = [];
        this.delayMs = 0;
        this.callHistory = new Array();
        this.calledTwiceIn50Ms = false;
        this.lastTimeMs = undefined;
    }
    setReturnValue(value, delayMs = 0) {
        this.returnValue = value ? [value] : [];
        this.delayMs = delayMs;
    }
    setReturnValues(values, delayMs = 0) {
        this.returnValue = values;
        this.delayMs = delayMs;
    }
    getAndClearCallHistory() {
        const history = [...this.callHistory];
        this.callHistory = [];
        return history;
    }
    assertNotCalledTwiceWithin50ms() {
        if (this.calledTwiceIn50Ms) {
            throw new Error('provideInlineCompletions has been called at least twice within 50ms. This should not happen.');
        }
    }
    async provideInlineCompletions(model, position, context, token) {
        const currentTimeMs = new Date().getTime();
        if (this.lastTimeMs && currentTimeMs - this.lastTimeMs < 50) {
            this.calledTwiceIn50Ms = true;
        }
        this.lastTimeMs = currentTimeMs;
        this.callHistory.push({
            position: position.toString(),
            triggerKind: context.triggerKind,
            text: model.getValue(),
        });
        const result = new Array();
        result.push(...this.returnValue);
        if (this.delayMs > 0) {
            await timeout(this.delayMs);
        }
        return { items: result };
    }
    freeInlineCompletions() { }
    handleItemDidShow() { }
}
export class GhostTextContext extends Disposable {
    get currentPrettyViewState() {
        return this._currentPrettyViewState;
    }
    constructor(model, editor) {
        super();
        this.editor = editor;
        this.prettyViewStates = new Array();
        this._register(autorun((reader) => {
            /** @description update */
            const ghostText = model.primaryGhostText.read(reader);
            let view;
            if (ghostText) {
                view = ghostText.render(this.editor.getValue(), true);
            }
            else {
                view = this.editor.getValue();
            }
            if (this._currentPrettyViewState !== view) {
                this.prettyViewStates.push(view);
            }
            this._currentPrettyViewState = view;
        }));
    }
    getAndClearViewStates() {
        const arr = [...this.prettyViewStates];
        this.prettyViewStates.length = 0;
        return arr;
    }
    keyboardType(text) {
        this.editor.trigger('keyboard', 'type', { text });
    }
    cursorUp() {
        CoreNavigationCommands.CursorUp.runEditorCommand(null, this.editor, null);
    }
    cursorRight() {
        CoreNavigationCommands.CursorRight.runEditorCommand(null, this.editor, null);
    }
    cursorLeft() {
        CoreNavigationCommands.CursorLeft.runEditorCommand(null, this.editor, null);
    }
    cursorDown() {
        CoreNavigationCommands.CursorDown.runEditorCommand(null, this.editor, null);
    }
    cursorLineEnd() {
        CoreNavigationCommands.CursorLineEnd.runEditorCommand(null, this.editor, null);
    }
    leftDelete() {
        CoreEditingCommands.DeleteLeft.runEditorCommand(null, this.editor, null);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy90ZXN0L2Jyb3dzZXIvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQVVqRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEUsTUFBTSxPQUFPLDZCQUE2QjtJQUExQztRQUNTLGdCQUFXLEdBQXVCLEVBQUUsQ0FBQTtRQUNwQyxZQUFPLEdBQVcsQ0FBQyxDQUFBO1FBRW5CLGdCQUFXLEdBQUcsSUFBSSxLQUFLLEVBQVcsQ0FBQTtRQUNsQyxzQkFBaUIsR0FBRyxLQUFLLENBQUE7UUEwQnpCLGVBQVUsR0FBdUIsU0FBUyxDQUFBO0lBOEJuRCxDQUFDO0lBdERPLGNBQWMsQ0FBQyxLQUFtQyxFQUFFLFVBQWtCLENBQUM7UUFDN0UsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUN2QyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtJQUN2QixDQUFDO0lBRU0sZUFBZSxDQUFDLE1BQTBCLEVBQUUsVUFBa0IsQ0FBQztRQUNyRSxJQUFJLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQTtRQUN6QixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQTtJQUN2QixDQUFDO0lBRU0sc0JBQXNCO1FBQzVCLE1BQU0sT0FBTyxHQUFHLENB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