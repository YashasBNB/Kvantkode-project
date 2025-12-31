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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhYmxlRWRpdG9yU2Nyb2xsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvc3RhYmxlRWRpdG9yU2Nyb2xsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE1BQU0sT0FBTyx1QkFBdUI7SUFDNUIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFtQjtRQUN4QyxJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLHlCQUF5QixFQUFFLEVBQUUsQ0FBQztZQUN2RSxtSEFBbUg7WUFDbkgsT0FBTyxJQUFJLHVCQUF1QixDQUNqQyxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQ3JCLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxFQUN6QixJQUFJLEVBQ0osQ0FBQyxFQUNELElBQUksQ0FDSixDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksZUFBZSxHQUFvQixJQUFJLENBQUE7UUFDM0MsSUFBSSwwQkFBMEIsR0FBRyxDQUFDLENBQUE7UUFDbEMsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUE7UUFDL0MsSUFBSSxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzlCLGVBQWUsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUNyRCxNQUFNLHdCQUF3QixHQUFHLE1BQU0sQ0FBQyxpQkFBaUIsQ0FDeEQsZUFBZSxDQUFDLFVBQVUsRUFDMUIsZUFBZSxDQUFDLE1BQU0sQ0FDdEIsQ0FBQTtZQUNELDBCQUEwQixHQUFHLE1BQU0sQ0FBQyxZQUFZLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQTtRQUM5RSxDQUFDO1FBQ0QsT0FBTyxJQUFJLHVCQUF1QixDQUNqQyxNQUFNLENBQUMsWUFBWSxFQUFFLEVBQ3JCLE1B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