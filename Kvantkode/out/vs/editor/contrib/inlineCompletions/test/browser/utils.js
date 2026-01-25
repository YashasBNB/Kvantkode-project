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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL3Rlc3QvYnJvd3Nlci91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBVWpHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRSxNQUFNLE9BQU8sNkJBQTZCO0lBQTFDO1FBQ1MsZ0JBQVcsR0FBdUIsRUFBRSxDQUFBO1FBQ3BDLFlBQU8sR0FBVyxDQUFDLENBQUE7UUFFbkIsZ0JBQVcsR0FBRyxJQUFJLEtBQUssRUFBVyxDQUFBO1FBQ2xDLHNCQUFpQixHQUFHLEtBQUssQ0FBQTtRQTBCekIsZUFBVSxHQUF1QixTQUFTLENBQUE7SUE4Qm5ELENBQUM7SUF0RE8sY0FBYyxDQUFDLEtBQW1DLEVBQUUsVUFBa0IsQ0FBQztRQUM3RSxJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO0lBQ3ZCLENBQUM7SUFFTSxlQUFlLENBQUMsTUFBMEIsRUFBRSxVQUFrQixDQUFDO1FBQ3JFLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO0lBQ3ZCLENBQUM7SUFFTSxzQkFBc0I7UUFDNUIsTUFBTSxPQUFPLEdB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