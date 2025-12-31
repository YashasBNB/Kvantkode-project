/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CoreNavigationCommands } from '../coreCommands.js';
import { Position } from '../../common/core/position.js';
import * as platform from '../../../base/common/platform.js';
export class ViewController {
    constructor(configuration, viewModel, userInputEvents, commandDelegate) {
        this.configuration = configuration;
        this.viewModel = viewModel;
        this.userInputEvents = userInputEvents;
        this.commandDelegate = commandDelegate;
    }
    paste(text, pasteOnNewLine, multicursorText, mode) {
        this.commandDelegate.paste(text, pasteOnNewLine, multicursorText, mode);
    }
    type(text) {
        this.commandDelegate.type(text);
    }
    compositionType(text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) {
        this.commandDelegate.compositionType(text, replacePrevCharCnt, replaceNextCharCnt, positionDelta);
    }
    compositionStart() {
        this.commandDelegate.startComposition();
    }
    compositionEnd() {
        this.commandDelegate.endComposition();
    }
    cut() {
        this.commandDelegate.cut();
    }
    setSelection(modelSelection) {
        CoreNavigationCommands.SetSelection.runCoreEditorCommand(this.viewModel, {
            source: 'keyboard',
            selection: modelSelection,
        });
    }
    _validateViewColumn(viewPosition) {
        const minColumn = this.viewModel.getLineMinColumn(viewPosition.lineNumber);
        if (viewPosition.column < minColumn) {
            return new Position(viewPosition.lineNumber, minColumn);
        }
        return viewPosition;
    }
    _hasMulticursorModifier(data) {
        switch (this.configuration.options.get(79 /* EditorOption.multiCursorModifier */)) {
            case 'altKey':
                return data.altKey;
            case 'ctrlKey':
                return data.ctrlKey;
            case 'metaKey':
                return data.metaKey;
            default:
                return false;
        }
    }
    _hasNonMulticursorModifier(data) {
        switch (this.configuration.options.get(79 /* EditorOption.multiCursorModifier */)) {
            case 'altKey':
                return data.ctrlKey || data.metaKey;
            case 'ctrlKey':
                return data.altKey || data.metaKey;
            case 'metaKey':
                return data.ctrlKey || data.altKey;
            default:
                return false;
        }
    }
    dispatchMouse(data) {
        const options = this.configuration.options;
        const selectionClipboardIsOn = platform.isLinux && options.get(112 /* EditorOption.selectionClipboard */);
        const columnSelection = options.get(22 /* EditorOption.columnSelection */);
        if (data.middleButton && !selectionClipboardIsOn) {
            this._columnSelect(data.position, data.mouseColumn, data.inSelectionMode);
        }
        else if (data.startedOnLineNumbers) {
            // If the dragging started on the gutter, then have operations work on the entire line
            if (this._hasMulticursorModifier(data)) {
                if (data.inSelectionMode) {
                    this._lastCursorLineSelect(data.position, data.revealType);
                }
                else {
                    this._createCursor(data.position, true);
                }
            }
            else {
                if (data.inSelectionMode) {
                    this._lineSelectDrag(data.position, data.revealType);
                }
                else {
                    this._lineSelect(data.position, data.revealType);
                }
            }
        }
        else if (data.mouseDownCount >= 4) {
            this._selectAll();
        }
        else if (data.mouseDownCount === 3) {
            if (this._hasMulticursorModifier(data)) {
                if (data.inSelectionMode) {
                    this._lastCursorLineSelectDrag(data.position, data.revealType);
                }
                else {
                    this._lastCursorLineSelect(data.position, data.revealType);
                }
            }
            else {
                if (data.inSelectionMode) {
                    this._lineSelectDrag(data.position, data.revealType);
                }
                else {
                    this._lineSelect(data.position, data.revealType);
                }
            }
        }
        else if (data.mouseDownCount === 2) {
            if (!data.onInjectedText) {
                if (this._hasMulticursorModifier(data)) {
                    this._lastCursorWordSelect(data.position, data.revealType);
                }
                else {
                    if (data.inSelectionMode) {
                        this._wordSelectDrag(data.position, data.revealType);
                    }
                    else {
                        this._wordSelect(data.position, data.revealType);
                    }
                }
            }
        }
        else {
            if (this._hasMulticursorModifier(data)) {
                if (!this._hasNonMulticursorModifier(data)) {
                    if (data.shiftKey) {
                        this._columnSelect(data.position, data.mouseColumn, true);
                    }
                    else {
                        // Do multi-cursor operations only when purely alt is pressed
                        if (data.inSelectionMode) {
                            this._lastCursorMoveToSelect(data.position, data.revealType);
                        }
                        else {
                            this._createCursor(data.position, false);
                        }
                    }
                }
            }
            else {
                if (data.inSelectionMode) {
                    if (data.altKey) {
                        this._columnSelect(data.position, data.mouseColumn, true);
                    }
                    else {
                        if (columnSelection) {
                            this._columnSelect(data.position, data.mouseColumn, true);
                        }
                        else {
                            this._moveToSelect(data.position, data.revealType);
                        }
                    }
                }
                else {
                    this.moveTo(data.position, data.revealType);
                }
            }
        }
    }
    _usualArgs(viewPosition, revealType) {
        viewPosition = this._validateViewColumn(viewPosition);
        return {
            source: 'mouse',
            position: this._convertViewToModelPosition(viewPosition),
            viewPosition,
            revealType,
        };
    }
    moveTo(viewPosition, revealType) {
        CoreNavigationCommands.MoveTo.runCoreEditorCommand(this.viewModel, this._usualArgs(viewPosition, revealType));
    }
    _moveToSelect(viewPosition, revealType) {
        CoreNavigationCommands.MoveToSelect.runCoreEditorCommand(this.viewModel, this._usualArgs(viewPosition, revealType));
    }
    _columnSelect(viewPosition, mouseColumn, doColumnSelect) {
        viewPosition = this._validateViewColumn(viewPosition);
        CoreNavigationCommands.ColumnSelect.runCoreEditorCommand(this.viewModel, {
            source: 'mouse',
            position: this._convertViewToModelPosition(viewPosition),
            viewPosition: viewPosition,
            mouseColumn: mouseColumn,
            doColumnSelect: doColumnSelect,
        });
    }
    _createCursor(viewPosition, wholeLine) {
        viewPosition = this._validateViewColumn(viewPosition);
        CoreNavigationCommands.CreateCursor.runCoreEditorCommand(this.viewModel, {
            source: 'mouse',
            position: this._convertViewToModelPosition(viewPosition),
            viewPosition: viewPosition,
            wholeLine: wholeLine,
        });
    }
    _lastCursorMoveToSelect(viewPosition, revealType) {
        CoreNavigationCommands.LastCursorMoveToSelect.runCoreEditorCommand(this.viewModel, this._usualArgs(viewPosition, revealType));
    }
    _wordSelect(viewPosition, revealType) {
        CoreNavigationCommands.WordSelect.runCoreEditorCommand(this.viewModel, this._usualArgs(viewPosition, revealType));
    }
    _wordSelectDrag(viewPosition, revealType) {
        CoreNavigationCommands.WordSelectDrag.runCoreEditorCommand(this.viewModel, this._usualArgs(viewPosition, revealType));
    }
    _lastCursorWordSelect(viewPosition, revealType) {
        CoreNavigationCommands.LastCursorWordSelect.runCoreEditorCommand(this.viewModel, this._usualArgs(viewPosition, revealType));
    }
    _lineSelect(viewPosition, revealType) {
        CoreNavigationCommands.LineSelect.runCoreEditorCommand(this.viewModel, this._usualArgs(viewPosition, revealType));
    }
    _lineSelectDrag(viewPosition, revealType) {
        CoreNavigationCommands.LineSelectDrag.runCoreEditorCommand(this.viewModel, this._usualArgs(viewPosition, revealType));
    }
    _lastCursorLineSelect(viewPosition, revealType) {
        CoreNavigationCommands.LastCursorLineSelect.runCoreEditorCommand(this.viewModel, this._usualArgs(viewPosition, revealType));
    }
    _lastCursorLineSelectDrag(viewPosition, revealType) {
        CoreNavigationCommands.LastCursorLineSelectDrag.runCoreEditorCommand(this.viewModel, this._usualArgs(viewPosition, revealType));
    }
    _selectAll() {
        CoreNavigationCommands.SelectAll.runCoreEditorCommand(this.viewModel, { source: 'mouse' });
    }
    // ----------------------
    _convertViewToModelPosition(viewPosition) {
        return this.viewModel.coordinatesConverter.convertViewPositionToModelPosition(viewPosition);
    }
    emitKeyDown(e) {
        this.userInputEvents.emitKeyDown(e);
    }
    emitKeyUp(e) {
        this.userInputEvents.emitKeyUp(e);
    }
    emitContextMenu(e) {
        this.userInputEvents.emitContextMenu(e);
    }
    emitMouseMove(e) {
        this.userInputEvents.emitMouseMove(e);
    }
    emitMouseLeave(e) {
        this.userInputEvents.emitMouseLeave(e);
    }
    emitMouseUp(e) {
        this.userInputEvents.emitMouseUp(e);
    }
    emitMouseDown(e) {
        this.userInputEvents.emitMouseDown(e);
    }
    emitMouseDrag(e) {
        this.userInputEvents.emitMouseDrag(e);
    }
    emitMouseDrop(e) {
        this.userInputEvents.emitMouseDrop(e);
    }
    emitMouseDropCanceled() {
        this.userInputEvents.emitMouseDropCanceled();
    }
    emitMouseWheel(e) {
        this.userInputEvents.emitMouseWheel(e);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0NvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3L3ZpZXdDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxzQkFBc0IsRUFBK0IsTUFBTSxvQkFBb0IsQ0FBQTtBQUd4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFNeEQsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQTBDNUQsTUFBTSxPQUFPLGNBQWM7SUFNMUIsWUFDQyxhQUFtQyxFQUNuQyxTQUFxQixFQUNyQixlQUFvQyxFQUNwQyxlQUFpQztRQUVqQyxJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQTtRQUNsQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtRQUMxQixJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQTtRQUN0QyxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQTtJQUN2QyxDQUFDO0lBRU0sS0FBSyxDQUNYLElBQVksRUFDWixjQUF1QixFQUN2QixlQUFnQyxFQUNoQyxJQUFtQjtRQUVuQixJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUN4RSxDQUFDO0lBRU0sSUFBSSxDQUFDLElBQVk7UUFDdkIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUVNLGVBQWUsQ0FDckIsSUFBWSxFQUNaLGtCQUEwQixFQUMxQixrQkFBMEIsRUFDMUIsYUFBcUI7UUFFckIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQ25DLElBQUksRUFDSixrQkFBa0IsRUFDbEIsa0JB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