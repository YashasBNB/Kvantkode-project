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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsZWdhdGluZ0VkaXRvckltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2RlbGVnYXRpbmdFZGl0b3JJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFrQmpFLE1BQU0sT0FBZ0IsZ0JBQWlCLFNBQVEsVUFBVTtJQUF6RDs7UUFFa0IsUUFBRyxHQUFHLEVBQUUsZ0JBQWdCLENBQUMsU0FBUyxDQUFBO1FBRWxDLGtCQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDcEQsaUJBQVksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQTtRQW9NdkQsYUFBYTtJQUNkLENBQUM7YUF6TWUsY0FBUyxHQUFHLENBQUMsQUFBSixDQUFJO0lBUTVCLEtBQUs7UUFDSixPQUFPLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQTtJQUNoRCxDQUFDO0lBYUQsbUVBQW1FO0lBRTVELDRCQUE0QixDQUFDLFFBQW1CO1FBQ3RELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRU0sa0JBQWtCLENBQUMsUUFBbUI7UUFDNUMsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFTSxXQUFXO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxX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