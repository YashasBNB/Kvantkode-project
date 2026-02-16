/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class StableEditorScrollState {
    static capture(editor) {
        if (editor.getScrollTop() === 0 || editor.hasPendingScrollAnimation()) {
            // Never mess with the scroll top if the editor is at the top of the file or if there is a pending scroll animation
            return new StableEditorScrollState(editor.getScrollTop(), editor.getContentHeight(), null, 0, null);
        }
        let visiblePosition = null;
        let visiblePositionScrollDelta = 0;
        const visibleRanges = editor.getVisibleRanges();
        if (visibleRanges.length > 0) {
            visiblePosition = visibleRanges[0].getStartPosition();
            const visiblePositionScrollTop = editor.getTopForPosition(visiblePosition.lineNumber, visiblePosition.column);
            visiblePositionScrollDelta = editor.getScrollTop() - visiblePositionScrollTop;
        }
        return new StableEditorScrollState(editor.getScrollTop(), editor.getContentHeight(), visiblePosition, visiblePositionScrollDelta, editor.getPosition());
    }
    constructor(_initialScrollTop, _initialContentHeight, _visiblePosition, _visiblePositionScrollDelta, _cursorPosition) {
        this._initialScrollTop = _initialScrollTop;
        this._initialContentHeight = _initialContentHeight;
        this._visiblePosition = _visiblePosition;
        this._visiblePositionScrollDelta = _visiblePositionScrollDelta;
        this._cursorPosition = _cursorPosition;
    }
    restore(editor) {
        if (this._initialContentHeight === editor.getContentHeight() &&
            this._initialScrollTop === editor.getScrollTop()) {
            // The editor's content height and scroll top haven't changed, so we don't need to do anything
            return;
        }
        if (this._visiblePosition) {
            const visiblePositionScrollTop = editor.getTopForPosition(this._visiblePosition.lineNumber, this._visiblePosition.column);
            editor.setScrollTop(visiblePositionScrollTop + this._visiblePositionScrollDelta);
        }
    }
    restoreRelativeVerticalPositionOfCursor(editor) {
        if (this._initialContentHeight === editor.getContentHeight() &&
            this._initialScrollTop === editor.getScrollTop()) {
            // The editor's content height and scroll top haven't changed, so we don't need to do anything
            return;
        }
        const currentCursorPosition = editor.getPosition();
        if (!this._cursorPosition || !currentCursorPosition) {
            return;
        }
        const offset = editor.getTopForLineNumber(currentCursorPosition.lineNumber) -
            editor.getTopForLineNumber(this._cursorPosition.lineNumber);
        editor.setScrollTop(editor.getScrollTop() + offset, 1 /* ScrollType.Immediate */);
    }
}
export class StableEditorBottomScrollState {
    static capture(editor) {
        if (editor.hasPendingScrollAnimation()) {
            // Never mess with the scroll if there is a pending scroll animation
            return new StableEditorBottomScrollState(editor.getScrollTop(), editor.getContentHeight(), null, 0);
        }
        let visiblePosition = null;
        let visiblePositionScrollDelta = 0;
        const visibleRanges = editor.getVisibleRanges();
        if (visibleRanges.length > 0) {
            visiblePosition = visibleRanges.at(-1).getEndPosition();
            const visiblePositionScrollBottom = editor.getBottomForLineNumber(visiblePosition.lineNumber);
            visiblePositionScrollDelta = visiblePositionScrollBottom - editor.getScrollTop();
        }
        return new StableEditorBottomScrollState(editor.getScrollTop(), editor.getContentHeight(), visiblePosition, visiblePositionScrollDelta);
    }
    constructor(_initialScrollTop, _initialContentHeight, _visiblePosition, _visiblePositionScrollDelta) {
        this._initialScrollTop = _initialScrollTop;
        this._initialContentHeight = _initialContentHeight;
        this._visiblePosition = _visiblePosition;
        this._visiblePositionScrollDelta = _visiblePositionScrollDelta;
    }
    restore(editor) {
        if (this._initialContentHeight === editor.getContentHeight() &&
            this._initialScrollTop === editor.getScrollTop()) {
            // The editor's content height and scroll top haven't changed, so we don't need to do anything
            return;
        }
        if (this._visiblePosition) {
            const visiblePositionScrollBottom = editor.getBottomForLineNumber(this._visiblePosition.lineNumber);
            editor.setScrollTop(visiblePositionScrollBottom - this._visiblePositionScrollDelta, 1 /* ScrollType.Immediate */);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhYmxlRWRpdG9yU2Nyb2xsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9zdGFibGVFZGl0b3JTY3JvbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsTUFBTSxPQUFPLHVCQUF1QjtJQUM1QixNQUFNLENBQUMsT0FBTyxDQUFDLE1BQW1CO1FBQ3hDLElBQUksTUFBTSxDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMseUJBQXlCLEVBQUUsRUFBRSxDQUFDO1lBQ3ZFLG1IQUFtSDtZQUNuSCxPQUFPLElBQUksdUJBQXVCLENBQ2pDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsRUFDckIsTUFBTSxDQUFDLGdCQUFnQixFQUFFLEVBQ3pCLElBQUksRUFDSixDQUFDLEVBQ0QsSUFBSSxDQUNKLENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxlQUFlLEdBQW9CLElBQUksQ0FBQTtRQUMzQyxJQUFJLDBCQUEwQixHQUFHLENBQUMsQ0FBQTtRQUNsQyxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUMvQyxJQUFJLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDOUIsZUFBZSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1lBQ3JELE1BQU0sd0JBQXdCLEdBQUcsTUFBTSxDQUFDLGlCQUFpQixDQUN4RCxlQUFlLENBQUMsVUFBVSxFQUMxQixlQUFlLENBQUMsTUFBTSxDQUN0QixDQUFBO1lBQ0QsMEJBQTBCLEdBQUcsTUFBTSxDQUFDLFlBQVksRUFBRSxHQUFHLHdCQUF3QixDQUFBO1FBQzlFLENBQUM7UUFDRCxPQUFPLElBQUksdUJBQXVCLENBQ2pDLE1BQU0s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