/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export class DelegatingEditor extends Disposable {
    constructor() {
        super(...arguments);
        this._id = ++DelegatingEditor.idCounter;
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        // #endregion
    }
    static { this.idCounter = 0; }
    getId() {
        return this.getEditorType() + ':v2:' + this._id;
    }
    // #region editorBrowser.IDiffEditor: Delegating to modified Editor
    getVisibleColumnFromPosition(position) {
        return this._targetEditor.getVisibleColumnFromPosition(position);
    }
    getStatusbarColumn(position) {
        return this._targetEditor.getStatusbarColumn(position);
    }
    getPosition() {
        return this._targetEditor.getPosition();
    }
    setPosition(position, source = 'api') {
        this._targetEditor.setPosition(position, source);
    }
    revealLine(lineNumber, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealLine(lineNumber, scrollType);
    }
    revealLineInCenter(lineNumber, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealLineInCenter(lineNumber, scrollType);
    }
    revealLineInCenterIfOutsideViewport(lineNumber, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealLineInCenterIfOutsideViewport(lineNumber, scrollType);
    }
    revealLineNearTop(lineNumber, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealLineNearTop(lineNumber, scrollType);
    }
    revealPosition(position, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealPosition(position, scrollType);
    }
    revealPositionInCenter(position, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealPositionInCenter(position, scrollType);
    }
    revealPositionInCenterIfOutsideViewport(position, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealPositionInCenterIfOutsideViewport(position, scrollType);
    }
    revealPositionNearTop(position, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealPositionNearTop(position, scrollType);
    }
    getSelection() {
        return this._targetEditor.getSelection();
    }
    getSelections() {
        return this._targetEditor.getSelections();
    }
    setSelection(something, source = 'api') {
        this._targetEditor.setSelection(something, source);
    }
    setSelections(ranges, source = 'api') {
        this._targetEditor.setSelections(ranges, source);
    }
    revealLines(startLineNumber, endLineNumber, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealLines(startLineNumber, endLineNumber, scrollType);
    }
    revealLinesInCenter(startLineNumber, endLineNumber, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealLinesInCenter(startLineNumber, endLineNumber, scrollType);
    }
    revealLinesInCenterIfOutsideViewport(startLineNumber, endLineNumber, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealLinesInCenterIfOutsideViewport(startLineNumber, endLineNumber, scrollType);
    }
    revealLinesNearTop(startLineNumber, endLineNumber, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealLinesNearTop(startLineNumber, endLineNumber, scrollType);
    }
    revealRange(range, scrollType = 0 /* ScrollType.Smooth */, revealVerticalInCenter = false, revealHorizontal = true) {
        this._targetEditor.revealRange(range, scrollType, revealVerticalInCenter, revealHorizontal);
    }
    revealRangeInCenter(range, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealRangeInCenter(range, scrollType);
    }
    revealRangeInCenterIfOutsideViewport(range, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealRangeInCenterIfOutsideViewport(range, scrollType);
    }
    revealRangeNearTop(range, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealRangeNearTop(range, scrollType);
    }
    revealRangeNearTopIfOutsideViewport(range, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealRangeNearTopIfOutsideViewport(range, scrollType);
    }
    revealRangeAtTop(range, scrollType = 0 /* ScrollType.Smooth */) {
        this._targetEditor.revealRangeAtTop(range, scrollType);
    }
    getSupportedActions() {
        return this._targetEditor.getSupportedActions();
    }
    focus() {
        this._targetEditor.focus();
    }
    trigger(source, handlerId, payload) {
        this._targetEditor.trigger(source, handlerId, payload);
    }
    createDecorationsCollection(decorations) {
        return this._targetEditor.createDecorationsCollection(decorations);
    }
    changeDecorations(callback) {
        return this._targetEditor.changeDecorations(callback);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsZWdhdGluZ0VkaXRvckltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9kZWxlZ2F0aW5nRWRpdG9ySW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBa0JqRSxNQUFNLE9BQWdCLGdCQUFpQixTQUFRLFVBQVU7SUFBekQ7O1FBRWtCLFFBQUcsR0FBRyxFQUFFLGdCQUFnQixDQUFDLFNBQVMsQ0FBQTtRQUVsQyxrQkFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ3BELGlCQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUE7UUFvTXZELGFBQWE7SUFDZCxDQUFDO2FBek1lLGNBQVMsR0FBRyxDQUFDLEFBQUosQ0FBSTtJQVE1QixLQUFLO1FBQ0osT0FBTyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUE7SUFDaEQsQ0FBQztJQWFELG1FQUFtRTtJQUU1RCw0QkFBNEIsQ0FBQyxRQUFtQjtRQUN0RCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsNEJBQTRCLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUVNLGtCQUFrQixDQUFDLFFBQW1CO1FBQzVDLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRU0sV0FBVztRQUNqQixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLENBQUE7SUFDeEMsQ0FB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