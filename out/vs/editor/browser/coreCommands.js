/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../nls.js';
import { isFirefox } from '../../base/browser/browser.js';
import * as types from '../../base/common/types.js';
import { status } from '../../base/browser/ui/aria/aria.js';
import { Command, EditorCommand, registerEditorCommand, UndoCommand, RedoCommand, SelectAllCommand, } from './editorExtensions.js';
import { ICodeEditorService } from './services/codeEditorService.js';
import { ColumnSelection } from '../common/cursor/cursorColumnSelection.js';
import { CursorState, } from '../common/cursorCommon.js';
import { DeleteOperations } from '../common/cursor/cursorDeleteOperations.js';
import { CursorMove as CursorMove_, CursorMoveCommands, } from '../common/cursor/cursorMoveCommands.js';
import { TypeOperations } from '../common/cursor/cursorTypeOperations.js';
import { Position } from '../common/core/position.js';
import { Range } from '../common/core/range.js';
import { EditorContextKeys } from '../common/editorContextKeys.js';
import { ContextKeyExpr } from '../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry, } from '../../platform/keybinding/common/keybindingsRegistry.js';
import { getActiveElement, isEditableElement } from '../../base/browser/dom.js';
import { EnterOperation } from '../common/cursor/cursorTypeEditOperations.js';
const CORE_WEIGHT = 0 /* KeybindingWeight.EditorCore */;
export class CoreEditorCommand extends EditorCommand {
    runEditorCommand(accessor, editor, args) {
        const viewModel = editor._getViewModel();
        if (!viewModel) {
            // the editor has no view => has no cursors
            return;
        }
        this.runCoreEditorCommand(viewModel, args || {});
    }
}
export var EditorScroll_;
(function (EditorScroll_) {
    const isEditorScrollArgs = function (arg) {
        if (!types.isObject(arg)) {
            return false;
        }
        const scrollArg = arg;
        if (!types.isString(scrollArg.to)) {
            return false;
        }
        if (!types.isUndefined(scrollArg.by) && !types.isString(scrollArg.by)) {
            return false;
        }
        if (!types.isUndefined(scrollArg.value) && !types.isNumber(scrollArg.value)) {
            return false;
        }
        if (!types.isUndefined(scrollArg.revealCursor) && !types.isBoolean(scrollArg.revealCursor)) {
            return false;
        }
        return true;
    };
    EditorScroll_.metadata = {
        description: 'Scroll editor in the given direction',
        args: [
            {
                name: 'Editor scroll argument object',
                description: `Property-value pairs that can be passed through this argument:
					* 'to': A mandatory direction value.
						\`\`\`
						'up', 'down'
						\`\`\`
					* 'by': Unit to move. Default is computed based on 'to' value.
						\`\`\`
						'line', 'wrappedLine', 'page', 'halfPage', 'editor'
						\`\`\`
					* 'value': Number of units to move. Default is '1'.
					* 'revealCursor': If 'true' reveals the cursor if it is outside view port.
				`,
                constraint: isEditorScrollArgs,
                schema: {
                    type: 'object',
                    required: ['to'],
                    properties: {
                        to: {
                            type: 'string',
                            enum: ['up', 'down'],
                        },
                        by: {
                            type: 'string',
                            enum: ['line', 'wrappedLine', 'page', 'halfPage', 'editor'],
                        },
                        value: {
                            type: 'number',
                            default: 1,
                        },
                        revealCursor: {
                            type: 'boolean',
                        },
                    },
                },
            },
        ],
    };
    /**
     * Directions in the view for editor scroll command.
     */
    EditorScroll_.RawDirection = {
        Up: 'up',
        Right: 'right',
        Down: 'down',
        Left: 'left',
    };
    /**
     * Units for editor scroll 'by' argument
     */
    EditorScroll_.RawUnit = {
        Line: 'line',
        WrappedLine: 'wrappedLine',
        Page: 'page',
        HalfPage: 'halfPage',
        Editor: 'editor',
        Column: 'column',
    };
    function parse(args) {
        let direction;
        switch (args.to) {
            case EditorScroll_.RawDirection.Up:
                direction = 1 /* Direction.Up */;
                break;
            case EditorScroll_.RawDirection.Right:
                direction = 2 /* Direction.Right */;
                break;
            case EditorScroll_.RawDirection.Down:
                direction = 3 /* Direction.Down */;
                break;
            case EditorScroll_.RawDirection.Left:
                direction = 4 /* Direction.Left */;
                break;
            default:
                // Illegal arguments
                return null;
        }
        let unit;
        switch (args.by) {
            case EditorScroll_.RawUnit.Line:
                unit = 1 /* Unit.Line */;
                break;
            case EditorScroll_.RawUnit.WrappedLine:
                unit = 2 /* Unit.WrappedLine */;
                break;
            case EditorScroll_.RawUnit.Page:
                unit = 3 /* Unit.Page */;
                break;
            case EditorScroll_.RawUnit.HalfPage:
                unit = 4 /* Unit.HalfPage */;
                break;
            case EditorScroll_.RawUnit.Editor:
                unit = 5 /* Unit.Editor */;
                break;
            case EditorScroll_.RawUnit.Column:
                unit = 6 /* Unit.Column */;
                break;
            default:
                unit = 2 /* Unit.WrappedLine */;
        }
        const value = Math.floor(args.value || 1);
        const revealCursor = !!args.revealCursor;
        return {
            direction: direction,
            unit: unit,
            value: value,
            revealCursor: revealCursor,
            select: !!args.select,
        };
    }
    EditorScroll_.parse = parse;
    let Direction;
    (function (Direction) {
        Direction[Direction["Up"] = 1] = "Up";
        Direction[Direction["Right"] = 2] = "Right";
        Direction[Direction["Down"] = 3] = "Down";
        Direction[Direction["Left"] = 4] = "Left";
    })(Direction = EditorScroll_.Direction || (EditorScroll_.Direction = {}));
    let Unit;
    (function (Unit) {
        Unit[Unit["Line"] = 1] = "Line";
        Unit[Unit["WrappedLine"] = 2] = "WrappedLine";
        Unit[Unit["Page"] = 3] = "Page";
        Unit[Unit["HalfPage"] = 4] = "HalfPage";
        Unit[Unit["Editor"] = 5] = "Editor";
        Unit[Unit["Column"] = 6] = "Column";
    })(Unit = EditorScroll_.Unit || (EditorScroll_.Unit = {}));
})(EditorScroll_ || (EditorScroll_ = {}));
export var RevealLine_;
(function (RevealLine_) {
    const isRevealLineArgs = function (arg) {
        if (!types.isObject(arg)) {
            return false;
        }
        const reveaLineArg = arg;
        if (!types.isNumber(reveaLineArg.lineNumber) && !types.isString(reveaLineArg.lineNumber)) {
            return false;
        }
        if (!types.isUndefined(reveaLineArg.at) && !types.isString(reveaLineArg.at)) {
            return false;
        }
        return true;
    };
    RevealLine_.metadata = {
        description: 'Reveal the given line at the given logical position',
        args: [
            {
                name: 'Reveal line argument object',
                description: `Property-value pairs that can be passed through this argument:
					* 'lineNumber': A mandatory line number value.
					* 'at': Logical position at which line has to be revealed.
						\`\`\`
						'top', 'center', 'bottom'
						\`\`\`
				`,
                constraint: isRevealLineArgs,
                schema: {
                    type: 'object',
                    required: ['lineNumber'],
                    properties: {
                        lineNumber: {
                            type: ['number', 'string'],
                        },
                        at: {
                            type: 'string',
                            enum: ['top', 'center', 'bottom'],
                        },
                    },
                },
            },
        ],
    };
    /**
     * Values for reveal line 'at' argument
     */
    RevealLine_.RawAtArgument = {
        Top: 'top',
        Center: 'center',
        Bottom: 'bottom',
    };
})(RevealLine_ || (RevealLine_ = {}));
class EditorOrNativeTextInputCommand {
    constructor(target) {
        // 1. handle case when focus is in editor.
        target.addImplementation(10000, 'code-editor', (accessor, args) => {
            // Only if editor text focus (i.e. not if editor has widget focus).
            const focusedEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
            if (focusedEditor && focusedEditor.hasTextFocus()) {
                return this._runEditorCommand(accessor, focusedEditor, args);
            }
            return false;
        });
        // 2. handle case when focus is in some other `input` / `textarea`.
        target.addImplementation(1000, 'generic-dom-input-textarea', (accessor, args) => {
            // Only if focused on an element that allows for entering text
            const activeElement = getActiveElement();
            if (activeElement && isEditableElement(activeElement)) {
                this.runDOMCommand(activeElement);
                return true;
            }
            return false;
        });
        // 3. (default) handle case when focus is somewhere else.
        target.addImplementation(0, 'generic-dom', (accessor, args) => {
            // Redirecting to active editor
            const activeEditor = accessor.get(ICodeEditorService).getActiveCodeEditor();
            if (activeEditor) {
                activeEditor.focus();
                return this._runEditorCommand(accessor, activeEditor, args);
            }
            return false;
        });
    }
    _runEditorCommand(accessor, editor, args) {
        const result = this.runEditorCommand(accessor, editor, args);
        if (result) {
            return result;
        }
        return true;
    }
}
export var NavigationCommandRevealType;
(function (NavigationCommandRevealType) {
    /**
     * Do regular revealing.
     */
    NavigationCommandRevealType[NavigationCommandRevealType["Regular"] = 0] = "Regular";
    /**
     * Do only minimal revealing.
     */
    NavigationCommandRevealType[NavigationCommandRevealType["Minimal"] = 1] = "Minimal";
    /**
     * Do not reveal the position.
     */
    NavigationCommandRevealType[NavigationCommandRevealType["None"] = 2] = "None";
})(NavigationCommandRevealType || (NavigationCommandRevealType = {}));
export var CoreNavigationCommands;
(function (CoreNavigationCommands) {
    class BaseMoveToCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            if (!args.position) {
                return;
            }
            viewModel.model.pushStackElement();
            const cursorStateChanged = viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, [
                CursorMoveCommands.moveTo(viewModel, viewModel.getPrimaryCursorState(), this._inSelectionMode, args.position, args.viewPosition),
            ]);
            if (cursorStateChanged && args.revealType !== 2 /* NavigationCommandRevealType.None */) {
                viewModel.revealAllCursors(args.source, true, true);
            }
        }
    }
    CoreNavigationCommands.MoveTo = registerEditorCommand(new BaseMoveToCommand({
        id: '_moveTo',
        inSelectionMode: false,
        precondition: undefined,
    }));
    CoreNavigationCommands.MoveToSelect = registerEditorCommand(new BaseMoveToCommand({
        id: '_moveToSelect',
        inSelectionMode: true,
        precondition: undefined,
    }));
    class ColumnSelectCommand extends CoreEditorCommand {
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            const result = this._getColumnSelectResult(viewModel, viewModel.getPrimaryCursorState(), viewModel.getCursorColumnSelectData(), args);
            if (result === null) {
                // invalid arguments
                return;
            }
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, result.viewStates.map((viewState) => CursorState.fromViewState(viewState)));
            viewModel.setCursorColumnSelectData({
                isReal: true,
                fromViewLineNumber: result.fromLineNumber,
                fromViewVisualColumn: result.fromVisualColumn,
                toViewLineNumber: result.toLineNumber,
                toViewVisualColumn: result.toVisualColumn,
            });
            if (result.reversed) {
                viewModel.revealTopMostCursor(args.source);
            }
            else {
                viewModel.revealBottomMostCursor(args.source);
            }
        }
    }
    CoreNavigationCommands.ColumnSelect = registerEditorCommand(new (class extends ColumnSelectCommand {
        constructor() {
            super({
                id: 'columnSelect',
                precondition: undefined,
            });
        }
        _getColumnSelectResult(viewModel, primary, prevColumnSelectData, args) {
            if (typeof args.position === 'undefined' ||
                typeof args.viewPosition === 'undefined' ||
                typeof args.mouseColumn === 'undefined') {
                return null;
            }
            // validate `args`
            const validatedPosition = viewModel.model.validatePosition(args.position);
            const validatedViewPosition = viewModel.coordinatesConverter.validateViewPosition(new Position(args.viewPosition.lineNumber, args.viewPosition.column), validatedPosition);
            const fromViewLineNumber = args.doColumnSelect
                ? prevColumnSelectData.fromViewLineNumber
                : validatedViewPosition.lineNumber;
            const fromViewVisualColumn = args.doColumnSelect
                ? prevColumnSelectData.fromViewVisualColumn
                : args.mouseColumn - 1;
            return ColumnSelection.columnSelect(viewModel.cursorConfig, viewModel, fromViewLineNumber, fromViewVisualColumn, validatedViewPosition.lineNumber, args.mouseColumn - 1);
        }
    })());
    CoreNavigationCommands.CursorColumnSelectLeft = registerEditorCommand(new (class extends ColumnSelectCommand {
        constructor() {
            super({
                id: 'cursorColumnSelectLeft',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */,
                    linux: { primary: 0 },
                },
            });
        }
        _getColumnSelectResult(viewModel, primary, prevColumnSelectData, args) {
            return ColumnSelection.columnSelectLeft(viewModel.cursorConfig, viewModel, prevColumnSelectData);
        }
    })());
    CoreNavigationCommands.CursorColumnSelectRight = registerEditorCommand(new (class extends ColumnSelectCommand {
        constructor() {
            super({
                id: 'cursorColumnSelectRight',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */,
                    linux: { primary: 0 },
                },
            });
        }
        _getColumnSelectResult(viewModel, primary, prevColumnSelectData, args) {
            return ColumnSelection.columnSelectRight(viewModel.cursorConfig, viewModel, prevColumnSelectData);
        }
    })());
    class ColumnSelectUpCommand extends ColumnSelectCommand {
        constructor(opts) {
            super(opts);
            this._isPaged = opts.isPaged;
        }
        _getColumnSelectResult(viewModel, primary, prevColumnSelectData, args) {
            return ColumnSelection.columnSelectUp(viewModel.cursorConfig, viewModel, prevColumnSelectData, this._isPaged);
        }
    }
    CoreNavigationCommands.CursorColumnSelectUp = registerEditorCommand(new ColumnSelectUpCommand({
        isPaged: false,
        id: 'cursorColumnSelectUp',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */,
            linux: { primary: 0 },
        },
    }));
    CoreNavigationCommands.CursorColumnSelectPageUp = registerEditorCommand(new ColumnSelectUpCommand({
        isPaged: true,
        id: 'cursorColumnSelectPageUp',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */,
            linux: { primary: 0 },
        },
    }));
    class ColumnSelectDownCommand extends ColumnSelectCommand {
        constructor(opts) {
            super(opts);
            this._isPaged = opts.isPaged;
        }
        _getColumnSelectResult(viewModel, primary, prevColumnSelectData, args) {
            return ColumnSelection.columnSelectDown(viewModel.cursorConfig, viewModel, prevColumnSelectData, this._isPaged);
        }
    }
    CoreNavigationCommands.CursorColumnSelectDown = registerEditorCommand(new ColumnSelectDownCommand({
        isPaged: false,
        id: 'cursorColumnSelectDown',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */,
            linux: { primary: 0 },
        },
    }));
    CoreNavigationCommands.CursorColumnSelectPageDown = registerEditorCommand(new ColumnSelectDownCommand({
        isPaged: true,
        id: 'cursorColumnSelectPageDown',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */,
            linux: { primary: 0 },
        },
    }));
    class CursorMoveImpl extends CoreEditorCommand {
        constructor() {
            super({
                id: 'cursorMove',
                precondition: undefined,
                metadata: CursorMove_.metadata,
            });
        }
        runCoreEditorCommand(viewModel, args) {
            const parsed = CursorMove_.parse(args);
            if (!parsed) {
                // illegal arguments
                return;
            }
            this._runCursorMove(viewModel, args.source, parsed);
        }
        _runCursorMove(viewModel, source, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(source, 3 /* CursorChangeReason.Explicit */, CursorMoveImpl._move(viewModel, viewModel.getCursorStates(), args));
            viewModel.revealAllCursors(source, true);
        }
        static _move(viewModel, cursors, args) {
            const inSelectionMode = args.select;
            const value = args.value;
            switch (args.direction) {
                case 0 /* CursorMove_.Direction.Left */:
                case 1 /* CursorMove_.Direction.Right */:
                case 2 /* CursorMove_.Direction.Up */:
                case 3 /* CursorMove_.Direction.Down */:
                case 4 /* CursorMove_.Direction.PrevBlankLine */:
                case 5 /* CursorMove_.Direction.NextBlankLine */:
                case 6 /* CursorMove_.Direction.WrappedLineStart */:
                case 7 /* CursorMove_.Direction.WrappedLineFirstNonWhitespaceCharacter */:
                case 8 /* CursorMove_.Direction.WrappedLineColumnCenter */:
                case 9 /* CursorMove_.Direction.WrappedLineEnd */:
                case 10 /* CursorMove_.Direction.WrappedLineLastNonWhitespaceCharacter */:
                    return CursorMoveCommands.simpleMove(viewModel, cursors, args.direction, inSelectionMode, value, args.unit);
                case 11 /* CursorMove_.Direction.ViewPortTop */:
                case 13 /* CursorMove_.Direction.ViewPortBottom */:
                case 12 /* CursorMove_.Direction.ViewPortCenter */:
                case 14 /* CursorMove_.Direction.ViewPortIfOutside */:
                    return CursorMoveCommands.viewportMove(viewModel, cursors, args.direction, inSelectionMode, value);
                default:
                    return null;
            }
        }
    }
    CoreNavigationCommands.CursorMoveImpl = CursorMoveImpl;
    CoreNavigationCommands.CursorMove = registerEditorCommand(new CursorMoveImpl());
    let Constants;
    (function (Constants) {
        Constants[Constants["PAGE_SIZE_MARKER"] = -1] = "PAGE_SIZE_MARKER";
    })(Constants || (Constants = {}));
    class CursorMoveBasedCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._staticArgs = opts.args;
        }
        runCoreEditorCommand(viewModel, dynamicArgs) {
            let args = this._staticArgs;
            if (this._staticArgs.value === -1 /* Constants.PAGE_SIZE_MARKER */) {
                // -1 is a marker for page size
                args = {
                    direction: this._staticArgs.direction,
                    unit: this._staticArgs.unit,
                    select: this._staticArgs.select,
                    value: dynamicArgs.pageSize || viewModel.cursorConfig.pageSize,
                };
            }
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(dynamicArgs.source, 3 /* CursorChangeReason.Explicit */, CursorMoveCommands.simpleMove(viewModel, viewModel.getCursorStates(), args.direction, args.select, args.value, args.unit));
            viewModel.revealAllCursors(dynamicArgs.source, true);
        }
    }
    CoreNavigationCommands.CursorLeft = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 0 /* CursorMove_.Direction.Left */,
            unit: 0 /* CursorMove_.Unit.None */,
            select: false,
            value: 1,
        },
        id: 'cursorLeft',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 15 /* KeyCode.LeftArrow */,
            mac: { primary: 15 /* KeyCode.LeftArrow */, secondary: [256 /* KeyMod.WinCtrl */ | 32 /* KeyCode.KeyB */] },
        },
    }));
    CoreNavigationCommands.CursorLeftSelect = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 0 /* CursorMove_.Direction.Left */,
            unit: 0 /* CursorMove_.Unit.None */,
            select: true,
            value: 1,
        },
        id: 'cursorLeftSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */,
        },
    }));
    CoreNavigationCommands.CursorRight = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 1 /* CursorMove_.Direction.Right */,
            unit: 0 /* CursorMove_.Unit.None */,
            select: false,
            value: 1,
        },
        id: 'cursorRight',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 17 /* KeyCode.RightArrow */,
            mac: { primary: 17 /* KeyCode.RightArrow */, secondary: [256 /* KeyMod.WinCtrl */ | 36 /* KeyCode.KeyF */] },
        },
    }));
    CoreNavigationCommands.CursorRightSelect = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 1 /* CursorMove_.Direction.Right */,
            unit: 0 /* CursorMove_.Unit.None */,
            select: true,
            value: 1,
        },
        id: 'cursorRightSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */,
        },
    }));
    CoreNavigationCommands.CursorUp = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 2 /* CursorMove_.Direction.Up */,
            unit: 2 /* CursorMove_.Unit.WrappedLine */,
            select: false,
            value: 1,
        },
        id: 'cursorUp',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 16 /* KeyCode.UpArrow */,
            mac: { primary: 16 /* KeyCode.UpArrow */, secondary: [256 /* KeyMod.WinCtrl */ | 46 /* KeyCode.KeyP */] },
        },
    }));
    CoreNavigationCommands.CursorUpSelect = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 2 /* CursorMove_.Direction.Up */,
            unit: 2 /* CursorMove_.Unit.WrappedLine */,
            select: true,
            value: 1,
        },
        id: 'cursorUpSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */,
            secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */],
            mac: { primary: 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */ },
            linux: { primary: 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */ },
        },
    }));
    CoreNavigationCommands.CursorPageUp = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 2 /* CursorMove_.Direction.Up */,
            unit: 2 /* CursorMove_.Unit.WrappedLine */,
            select: false,
            value: -1 /* Constants.PAGE_SIZE_MARKER */,
        },
        id: 'cursorPageUp',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 11 /* KeyCode.PageUp */,
        },
    }));
    CoreNavigationCommands.CursorPageUpSelect = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 2 /* CursorMove_.Direction.Up */,
            unit: 2 /* CursorMove_.Unit.WrappedLine */,
            select: true,
            value: -1 /* Constants.PAGE_SIZE_MARKER */,
        },
        id: 'cursorPageUpSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 1024 /* KeyMod.Shift */ | 11 /* KeyCode.PageUp */,
        },
    }));
    CoreNavigationCommands.CursorDown = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 3 /* CursorMove_.Direction.Down */,
            unit: 2 /* CursorMove_.Unit.WrappedLine */,
            select: false,
            value: 1,
        },
        id: 'cursorDown',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 18 /* KeyCode.DownArrow */,
            mac: { primary: 18 /* KeyCode.DownArrow */, secondary: [256 /* KeyMod.WinCtrl */ | 44 /* KeyCode.KeyN */] },
        },
    }));
    CoreNavigationCommands.CursorDownSelect = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 3 /* CursorMove_.Direction.Down */,
            unit: 2 /* CursorMove_.Unit.WrappedLine */,
            select: true,
            value: 1,
        },
        id: 'cursorDownSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */,
            secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */],
            mac: { primary: 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */ },
            linux: { primary: 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */ },
        },
    }));
    CoreNavigationCommands.CursorPageDown = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 3 /* CursorMove_.Direction.Down */,
            unit: 2 /* CursorMove_.Unit.WrappedLine */,
            select: false,
            value: -1 /* Constants.PAGE_SIZE_MARKER */,
        },
        id: 'cursorPageDown',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 12 /* KeyCode.PageDown */,
        },
    }));
    CoreNavigationCommands.CursorPageDownSelect = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 3 /* CursorMove_.Direction.Down */,
            unit: 2 /* CursorMove_.Unit.WrappedLine */,
            select: true,
            value: -1 /* Constants.PAGE_SIZE_MARKER */,
        },
        id: 'cursorPageDownSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 1024 /* KeyMod.Shift */ | 12 /* KeyCode.PageDown */,
        },
    }));
    CoreNavigationCommands.CreateCursor = registerEditorCommand(new (class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'createCursor',
                precondition: undefined,
            });
        }
        runCoreEditorCommand(viewModel, args) {
            if (!args.position) {
                return;
            }
            let newState;
            if (args.wholeLine) {
                newState = CursorMoveCommands.line(viewModel, viewModel.getPrimaryCursorState(), false, args.position, args.viewPosition);
            }
            else {
                newState = CursorMoveCommands.moveTo(viewModel, viewModel.getPrimaryCursorState(), false, args.position, args.viewPosition);
            }
            const states = viewModel.getCursorStates();
            // Check if we should remove a cursor (sort of like a toggle)
            if (states.length > 1) {
                const newModelPosition = newState.modelState ? newState.modelState.position : null;
                const newViewPosition = newState.viewState ? newState.viewState.position : null;
                for (let i = 0, len = states.length; i < len; i++) {
                    const state = states[i];
                    if (newModelPosition &&
                        !state.modelState.selection.containsPosition(newModelPosition)) {
                        continue;
                    }
                    if (newViewPosition && !state.viewState.selection.containsPosition(newViewPosition)) {
                        continue;
                    }
                    // => Remove the cursor
                    states.splice(i, 1);
                    viewModel.model.pushStackElement();
                    viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, states);
                    return;
                }
            }
            // => Add the new cursor
            states.push(newState);
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, states);
        }
    })());
    CoreNavigationCommands.LastCursorMoveToSelect = registerEditorCommand(new (class extends CoreEditorCommand {
        constructor() {
            super({
                id: '_lastCursorMoveToSelect',
                precondition: undefined,
            });
        }
        runCoreEditorCommand(viewModel, args) {
            if (!args.position) {
                return;
            }
            const lastAddedCursorIndex = viewModel.getLastAddedCursorIndex();
            const states = viewModel.getCursorStates();
            const newStates = states.slice(0);
            newStates[lastAddedCursorIndex] = CursorMoveCommands.moveTo(viewModel, states[lastAddedCursorIndex], true, args.position, args.viewPosition);
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, newStates);
        }
    })());
    class HomeCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, CursorMoveCommands.moveToBeginningOfLine(viewModel, viewModel.getCursorStates(), this._inSelectionMode));
            viewModel.revealAllCursors(args.source, true);
        }
    }
    CoreNavigationCommands.CursorHome = registerEditorCommand(new HomeCommand({
        inSelectionMode: false,
        id: 'cursorHome',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 14 /* KeyCode.Home */,
            mac: { primary: 14 /* KeyCode.Home */, secondary: [2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */] },
        },
    }));
    CoreNavigationCommands.CursorHomeSelect = registerEditorCommand(new HomeCommand({
        inSelectionMode: true,
        id: 'cursorHomeSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 1024 /* KeyMod.Shift */ | 14 /* KeyCode.Home */,
            mac: {
                primary: 1024 /* KeyMod.Shift */ | 14 /* KeyCode.Home */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */],
            },
        },
    }));
    class LineStartCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, this._exec(viewModel.getCursorStates()));
            viewModel.revealAllCursors(args.source, true);
        }
        _exec(cursors) {
            const result = [];
            for (let i = 0, len = cursors.length; i < len; i++) {
                const cursor = cursors[i];
                const lineNumber = cursor.modelState.position.lineNumber;
                result[i] = CursorState.fromModelState(cursor.modelState.move(this._inSelectionMode, lineNumber, 1, 0));
            }
            return result;
        }
    }
    CoreNavigationCommands.CursorLineStart = registerEditorCommand(new LineStartCommand({
        inSelectionMode: false,
        id: 'cursorLineStart',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 0,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */ },
        },
    }));
    CoreNavigationCommands.CursorLineStartSelect = registerEditorCommand(new LineStartCommand({
        inSelectionMode: true,
        id: 'cursorLineStartSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 0,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */ },
        },
    }));
    class EndCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, CursorMoveCommands.moveToEndOfLine(viewModel, viewModel.getCursorStates(), this._inSelectionMode, args.sticky || false));
            viewModel.revealAllCursors(args.source, true);
        }
    }
    CoreNavigationCommands.CursorEnd = registerEditorCommand(new EndCommand({
        inSelectionMode: false,
        id: 'cursorEnd',
        precondition: undefined,
        kbOpts: {
            args: { sticky: false },
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 13 /* KeyCode.End */,
            mac: { primary: 13 /* KeyCode.End */, secondary: [2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */] },
        },
        metadata: {
            description: `Go to End`,
            args: [
                {
                    name: 'args',
                    schema: {
                        type: 'object',
                        properties: {
                            sticky: {
                                description: nls.localize('stickydesc', 'Stick to the end even when going to longer lines'),
                                type: 'boolean',
                                default: false,
                            },
                        },
                    },
                },
            ],
        },
    }));
    CoreNavigationCommands.CursorEndSelect = registerEditorCommand(new EndCommand({
        inSelectionMode: true,
        id: 'cursorEndSelect',
        precondition: undefined,
        kbOpts: {
            args: { sticky: false },
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 1024 /* KeyMod.Shift */ | 13 /* KeyCode.End */,
            mac: {
                primary: 1024 /* KeyMod.Shift */ | 13 /* KeyCode.End */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */],
            },
        },
        metadata: {
            description: `Select to End`,
            args: [
                {
                    name: 'args',
                    schema: {
                        type: 'object',
                        properties: {
                            sticky: {
                                description: nls.localize('stickydesc', 'Stick to the end even when going to longer lines'),
                                type: 'boolean',
                                default: false,
                            },
                        },
                    },
                },
            ],
        },
    }));
    class LineEndCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, this._exec(viewModel, viewModel.getCursorStates()));
            viewModel.revealAllCursors(args.source, true);
        }
        _exec(viewModel, cursors) {
            const result = [];
            for (let i = 0, len = cursors.length; i < len; i++) {
                const cursor = cursors[i];
                const lineNumber = cursor.modelState.position.lineNumber;
                const maxColumn = viewModel.model.getLineMaxColumn(lineNumber);
                result[i] = CursorState.fromModelState(cursor.modelState.move(this._inSelectionMode, lineNumber, maxColumn, 0));
            }
            return result;
        }
    }
    CoreNavigationCommands.CursorLineEnd = registerEditorCommand(new LineEndCommand({
        inSelectionMode: false,
        id: 'cursorLineEnd',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 0,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 35 /* KeyCode.KeyE */ },
        },
    }));
    CoreNavigationCommands.CursorLineEndSelect = registerEditorCommand(new LineEndCommand({
        inSelectionMode: true,
        id: 'cursorLineEndSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 0,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 35 /* KeyCode.KeyE */ },
        },
    }));
    class TopCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, CursorMoveCommands.moveToBeginningOfBuffer(viewModel, viewModel.getCursorStates(), this._inSelectionMode));
            viewModel.revealAllCursors(args.source, true);
        }
    }
    CoreNavigationCommands.CursorTop = registerEditorCommand(new TopCommand({
        inSelectionMode: false,
        id: 'cursorTop',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 2048 /* KeyMod.CtrlCmd */ | 14 /* KeyCode.Home */,
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */ },
        },
    }));
    CoreNavigationCommands.CursorTopSelect = registerEditorCommand(new TopCommand({
        inSelectionMode: true,
        id: 'cursorTopSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 14 /* KeyCode.Home */,
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */ },
        },
    }));
    class BottomCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, CursorMoveCommands.moveToEndOfBuffer(viewModel, viewModel.getCursorStates(), this._inSelectionMode));
            viewModel.revealAllCursors(args.source, true);
        }
    }
    CoreNavigationCommands.CursorBottom = registerEditorCommand(new BottomCommand({
        inSelectionMode: false,
        id: 'cursorBottom',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 2048 /* KeyMod.CtrlCmd */ | 13 /* KeyCode.End */,
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */ },
        },
    }));
    CoreNavigationCommands.CursorBottomSelect = registerEditorCommand(new BottomCommand({
        inSelectionMode: true,
        id: 'cursorBottomSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 13 /* KeyCode.End */,
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */ },
        },
    }));
    class EditorScrollImpl extends CoreEditorCommand {
        constructor() {
            super({
                id: 'editorScroll',
                precondition: undefined,
                metadata: EditorScroll_.metadata,
            });
        }
        determineScrollMethod(args) {
            const horizontalUnits = [6 /* EditorScroll_.Unit.Column */];
            const verticalUnits = [
                1 /* EditorScroll_.Unit.Line */,
                2 /* EditorScroll_.Unit.WrappedLine */,
                3 /* EditorScroll_.Unit.Page */,
                4 /* EditorScroll_.Unit.HalfPage */,
                5 /* EditorScroll_.Unit.Editor */,
                6 /* EditorScroll_.Unit.Column */,
            ];
            const horizontalDirections = [4 /* EditorScroll_.Direction.Left */, 2 /* EditorScroll_.Direction.Right */];
            const verticalDirections = [1 /* EditorScroll_.Direction.Up */, 3 /* EditorScroll_.Direction.Down */];
            if (horizontalUnits.includes(args.unit) && horizontalDirections.includes(args.direction)) {
                return this._runHorizontalEditorScroll.bind(this);
            }
            if (verticalUnits.includes(args.unit) && verticalDirections.includes(args.direction)) {
                return this._runVerticalEditorScroll.bind(this);
            }
            return null;
        }
        runCoreEditorCommand(viewModel, args) {
            const parsed = EditorScroll_.parse(args);
            if (!parsed) {
                // illegal arguments
                return;
            }
            const runEditorScroll = this.determineScrollMethod(parsed);
            if (!runEditorScroll) {
                // Incompatible unit and direction
                return;
            }
            runEditorScroll(viewModel, args.source, parsed);
        }
        _runVerticalEditorScroll(viewModel, source, args) {
            const desiredScrollTop = this._computeDesiredScrollTop(viewModel, args);
            if (args.revealCursor) {
                // must ensure cursor is in new visible range
                const desiredVisibleViewRange = viewModel.getCompletelyVisibleViewRangeAtScrollTop(desiredScrollTop);
                viewModel.setCursorStates(source, 3 /* CursorChangeReason.Explicit */, [
                    CursorMoveCommands.findPositionInViewportIfOutside(viewModel, viewModel.getPrimaryCursorState(), desiredVisibleViewRange, args.select),
                ]);
            }
            viewModel.viewLayout.setScrollPosition({ scrollTop: desiredScrollTop }, 0 /* ScrollType.Smooth */);
        }
        _computeDesiredScrollTop(viewModel, args) {
            if (args.unit === 1 /* EditorScroll_.Unit.Line */) {
                // scrolling by model lines
                const futureViewport = viewModel.viewLayout.getFutureViewport();
                const visibleViewRange = viewModel.getCompletelyVisibleViewRangeAtScrollTop(futureViewport.top);
                const visibleModelRange = viewModel.coordinatesConverter.convertViewRangeToModelRange(visibleViewRange);
                let desiredTopModelLineNumber;
                if (args.direction === 1 /* EditorScroll_.Direction.Up */) {
                    // must go x model lines up
                    desiredTopModelLineNumber = Math.max(1, visibleModelRange.startLineNumber - args.value);
                }
                else {
                    // must go x model lines down
                    desiredTopModelLineNumber = Math.min(viewModel.model.getLineCount(), visibleModelRange.startLineNumber + args.value);
                }
                const viewPosition = viewModel.coordinatesConverter.convertModelPositionToViewPosition(new Position(desiredTopModelLineNumber, 1));
                return viewModel.viewLayout.getVerticalOffsetForLineNumber(viewPosition.lineNumber);
            }
            if (args.unit === 5 /* EditorScroll_.Unit.Editor */) {
                let desiredTopModelLineNumber = 0;
                if (args.direction === 3 /* EditorScroll_.Direction.Down */) {
                    desiredTopModelLineNumber =
                        viewModel.model.getLineCount() - viewModel.cursorConfig.pageSize;
                }
                return viewModel.viewLayout.getVerticalOffsetForLineNumber(desiredTopModelLineNumber);
            }
            let noOfLines;
            if (args.unit === 3 /* EditorScroll_.Unit.Page */) {
                noOfLines = viewModel.cursorConfig.pageSize * args.value;
            }
            else if (args.unit === 4 /* EditorScroll_.Unit.HalfPage */) {
                noOfLines = Math.round(viewModel.cursorConfig.pageSize / 2) * args.value;
            }
            else {
                noOfLines = args.value;
            }
            const deltaLines = (args.direction === 1 /* EditorScroll_.Direction.Up */ ? -1 : 1) * noOfLines;
            return (viewModel.viewLayout.getCurrentScrollTop() + deltaLines * viewModel.cursorConfig.lineHeight);
        }
        _runHorizontalEditorScroll(viewModel, source, args) {
            const desiredScrollLeft = this._computeDesiredScrollLeft(viewModel, args);
            viewModel.viewLayout.setScrollPosition({ scrollLeft: desiredScrollLeft }, 0 /* ScrollType.Smooth */);
        }
        _computeDesiredScrollLeft(viewModel, args) {
            const deltaColumns = (args.direction === 4 /* EditorScroll_.Direction.Left */ ? -1 : 1) * args.value;
            return (viewModel.viewLayout.getCurrentScrollLeft() +
                deltaColumns * viewModel.cursorConfig.typicalHalfwidthCharacterWidth);
        }
    }
    CoreNavigationCommands.EditorScrollImpl = EditorScrollImpl;
    CoreNavigationCommands.EditorScroll = registerEditorCommand(new EditorScrollImpl());
    CoreNavigationCommands.ScrollLineUp = registerEditorCommand(new (class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'scrollLineUp',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 11 /* KeyCode.PageUp */ },
                },
            });
        }
        runCoreEditorCommand(viewModel, args) {
            CoreNavigationCommands.EditorScroll.runCoreEditorCommand(viewModel, {
                to: EditorScroll_.RawDirection.Up,
                by: EditorScroll_.RawUnit.WrappedLine,
                value: 1,
                revealCursor: false,
                select: false,
                source: args.source,
            });
        }
    })());
    CoreNavigationCommands.ScrollPageUp = registerEditorCommand(new (class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'scrollPageUp',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 11 /* KeyCode.PageUp */,
                    win: { primary: 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */ },
                    linux: { primary: 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */ },
                },
            });
        }
        runCoreEditorCommand(viewModel, args) {
            CoreNavigationCommands.EditorScroll.runCoreEditorCommand(viewModel, {
                to: EditorScroll_.RawDirection.Up,
                by: EditorScroll_.RawUnit.Page,
                value: 1,
                revealCursor: false,
                select: false,
                source: args.source,
            });
        }
    })());
    CoreNavigationCommands.ScrollEditorTop = registerEditorCommand(new (class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'scrollEditorTop',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                },
            });
        }
        runCoreEditorCommand(viewModel, args) {
            CoreNavigationCommands.EditorScroll.runCoreEditorCommand(viewModel, {
                to: EditorScroll_.RawDirection.Up,
                by: EditorScroll_.RawUnit.Editor,
                value: 1,
                revealCursor: false,
                select: false,
                source: args.source,
            });
        }
    })());
    CoreNavigationCommands.ScrollLineDown = registerEditorCommand(new (class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'scrollLineDown',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 12 /* KeyCode.PageDown */ },
                },
            });
        }
        runCoreEditorCommand(viewModel, args) {
            CoreNavigationCommands.EditorScroll.runCoreEditorCommand(viewModel, {
                to: EditorScroll_.RawDirection.Down,
                by: EditorScroll_.RawUnit.WrappedLine,
                value: 1,
                revealCursor: false,
                select: false,
                source: args.source,
            });
        }
    })());
    CoreNavigationCommands.ScrollPageDown = registerEditorCommand(new (class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'scrollPageDown',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 12 /* KeyCode.PageDown */,
                    win: { primary: 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */ },
                    linux: { primary: 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */ },
                },
            });
        }
        runCoreEditorCommand(viewModel, args) {
            CoreNavigationCommands.EditorScroll.runCoreEditorCommand(viewModel, {
                to: EditorScroll_.RawDirection.Down,
                by: EditorScroll_.RawUnit.Page,
                value: 1,
                revealCursor: false,
                select: false,
                source: args.source,
            });
        }
    })());
    CoreNavigationCommands.ScrollEditorBottom = registerEditorCommand(new (class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'scrollEditorBottom',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                },
            });
        }
        runCoreEditorCommand(viewModel, args) {
            CoreNavigationCommands.EditorScroll.runCoreEditorCommand(viewModel, {
                to: EditorScroll_.RawDirection.Down,
                by: EditorScroll_.RawUnit.Editor,
                value: 1,
                revealCursor: false,
                select: false,
                source: args.source,
            });
        }
    })());
    CoreNavigationCommands.ScrollLeft = registerEditorCommand(new (class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'scrollLeft',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                },
            });
        }
        runCoreEditorCommand(viewModel, args) {
            CoreNavigationCommands.EditorScroll.runCoreEditorCommand(viewModel, {
                to: EditorScroll_.RawDirection.Left,
                by: EditorScroll_.RawUnit.Column,
                value: 2,
                revealCursor: false,
                select: false,
                source: args.source,
            });
        }
    })());
    CoreNavigationCommands.ScrollRight = registerEditorCommand(new (class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'scrollRight',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                },
            });
        }
        runCoreEditorCommand(viewModel, args) {
            CoreNavigationCommands.EditorScroll.runCoreEditorCommand(viewModel, {
                to: EditorScroll_.RawDirection.Right,
                by: EditorScroll_.RawUnit.Column,
                value: 2,
                revealCursor: false,
                select: false,
                source: args.source,
            });
        }
    })());
    class WordCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            if (!args.position) {
                return;
            }
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, [
                CursorMoveCommands.word(viewModel, viewModel.getPrimaryCursorState(), this._inSelectionMode, args.position),
            ]);
            if (args.revealType !== 2 /* NavigationCommandRevealType.None */) {
                viewModel.revealAllCursors(args.source, true, true);
            }
        }
    }
    CoreNavigationCommands.WordSelect = registerEditorCommand(new WordCommand({
        inSelectionMode: false,
        id: '_wordSelect',
        precondition: undefined,
    }));
    CoreNavigationCommands.WordSelectDrag = registerEditorCommand(new WordCommand({
        inSelectionMode: true,
        id: '_wordSelectDrag',
        precondition: undefined,
    }));
    CoreNavigationCommands.LastCursorWordSelect = registerEditorCommand(new (class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'lastCursorWordSelect',
                precondition: undefined,
            });
        }
        runCoreEditorCommand(viewModel, args) {
            if (!args.position) {
                return;
            }
            const lastAddedCursorIndex = viewModel.getLastAddedCursorIndex();
            const states = viewModel.getCursorStates();
            const newStates = states.slice(0);
            const lastAddedState = states[lastAddedCursorIndex];
            newStates[lastAddedCursorIndex] = CursorMoveCommands.word(viewModel, lastAddedState, lastAddedState.modelState.hasSelection(), args.position);
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, newStates);
        }
    })());
    class LineCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            if (!args.position) {
                return;
            }
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, [
                CursorMoveCommands.line(viewModel, viewModel.getPrimaryCursorState(), this._inSelectionMode, args.position, args.viewPosition),
            ]);
            if (args.revealType !== 2 /* NavigationCommandRevealType.None */) {
                viewModel.revealAllCursors(args.source, false, true);
            }
        }
    }
    CoreNavigationCommands.LineSelect = registerEditorCommand(new LineCommand({
        inSelectionMode: false,
        id: '_lineSelect',
        precondition: undefined,
    }));
    CoreNavigationCommands.LineSelectDrag = registerEditorCommand(new LineCommand({
        inSelectionMode: true,
        id: '_lineSelectDrag',
        precondition: undefined,
    }));
    class LastCursorLineCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            if (!args.position) {
                return;
            }
            const lastAddedCursorIndex = viewModel.getLastAddedCursorIndex();
            const states = viewModel.getCursorStates();
            const newStates = states.slice(0);
            newStates[lastAddedCursorIndex] = CursorMoveCommands.line(viewModel, states[lastAddedCursorIndex], this._inSelectionMode, args.position, args.viewPosition);
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, newStates);
        }
    }
    CoreNavigationCommands.LastCursorLineSelect = registerEditorCommand(new LastCursorLineCommand({
        inSelectionMode: false,
        id: 'lastCursorLineSelect',
        precondition: undefined,
    }));
    CoreNavigationCommands.LastCursorLineSelectDrag = registerEditorCommand(new LastCursorLineCommand({
        inSelectionMode: true,
        id: 'lastCursorLineSelectDrag',
        precondition: undefined,
    }));
    CoreNavigationCommands.CancelSelection = registerEditorCommand(new (class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'cancelSelection',
                precondition: EditorContextKeys.hasNonEmptySelection,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 9 /* KeyCode.Escape */,
                    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
                },
            });
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, [
                CursorMoveCommands.cancelSelection(viewModel, viewModel.getPrimaryCursorState()),
            ]);
            viewModel.revealAllCursors(args.source, true);
        }
    })());
    CoreNavigationCommands.RemoveSecondaryCursors = registerEditorCommand(new (class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'removeSecondaryCursors',
                precondition: EditorContextKeys.hasMultipleSelections,
                kbOpts: {
                    weight: CORE_WEIGHT + 1,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 9 /* KeyCode.Escape */,
                    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
                },
            });
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, [
                viewModel.getPrimaryCursorState(),
            ]);
            viewModel.revealAllCursors(args.source, true);
            status(nls.localize('removedCursor', 'Removed secondary cursors'));
        }
    })());
    CoreNavigationCommands.RevealLine = registerEditorCommand(new (class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'revealLine',
                precondition: undefined,
                metadata: RevealLine_.metadata,
            });
        }
        runCoreEditorCommand(viewModel, args) {
            const revealLineArg = args;
            const lineNumberArg = revealLineArg.lineNumber || 0;
            let lineNumber = typeof lineNumberArg === 'number' ? lineNumberArg + 1 : parseInt(lineNumberArg) + 1;
            if (lineNumber < 1) {
                lineNumber = 1;
            }
            const lineCount = viewModel.model.getLineCount();
            if (lineNumber > lineCount) {
                lineNumber = lineCount;
            }
            const range = new Range(lineNumber, 1, lineNumber, viewModel.model.getLineMaxColumn(lineNumber));
            let revealAt = 0 /* VerticalRevealType.Simple */;
            if (revealLineArg.at) {
                switch (revealLineArg.at) {
                    case RevealLine_.RawAtArgument.Top:
                        revealAt = 3 /* VerticalRevealType.Top */;
                        break;
                    case RevealLine_.RawAtArgument.Center:
                        revealAt = 1 /* VerticalRevealType.Center */;
                        break;
                    case RevealLine_.RawAtArgument.Bottom:
                        revealAt = 4 /* VerticalRevealType.Bottom */;
                        break;
                    default:
                        break;
                }
            }
            const viewRange = viewModel.coordinatesConverter.convertModelRangeToViewRange(range);
            viewModel.revealRange(args.source, false, viewRange, revealAt, 0 /* ScrollType.Smooth */);
        }
    })());
    CoreNavigationCommands.SelectAll = new (class extends EditorOrNativeTextInputCommand {
        constructor() {
            super(SelectAllCommand);
        }
        runDOMCommand(activeElement) {
            if (isFirefox) {
                ;
                activeElement.focus();
                activeElement.select();
            }
            activeElement.ownerDocument.execCommand('selectAll');
        }
        runEditorCommand(accessor, editor, args) {
            const viewModel = editor._getViewModel();
            if (!viewModel) {
                // the editor has no view => has no cursors
                return;
            }
            this.runCoreEditorCommand(viewModel, args);
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates('keyboard', 3 /* CursorChangeReason.Explicit */, [
                CursorMoveCommands.selectAll(viewModel, viewModel.getPrimaryCursorState()),
            ]);
        }
    })();
    CoreNavigationCommands.SetSelection = registerEditorCommand(new (class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'setSelection',
                precondition: undefined,
            });
        }
        runCoreEditorCommand(viewModel, args) {
            if (!args.selection) {
                return;
            }
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, [
                CursorState.fromModelSelection(args.selection),
            ]);
        }
    })());
})(CoreNavigationCommands || (CoreNavigationCommands = {}));
const columnSelectionCondition = ContextKeyExpr.and(EditorContextKeys.textInputFocus, EditorContextKeys.columnSelection);
function registerColumnSelection(id, keybinding) {
    KeybindingsRegistry.registerKeybindingRule({
        id: id,
        primary: keybinding,
        when: columnSelectionCondition,
        weight: CORE_WEIGHT + 1,
    });
}
registerColumnSelection(CoreNavigationCommands.CursorColumnSelectLeft.id, 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */);
registerColumnSelection(CoreNavigationCommands.CursorColumnSelectRight.id, 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */);
registerColumnSelection(CoreNavigationCommands.CursorColumnSelectUp.id, 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */);
registerColumnSelection(CoreNavigationCommands.CursorColumnSelectPageUp.id, 1024 /* KeyMod.Shift */ | 11 /* KeyCode.PageUp */);
registerColumnSelection(CoreNavigationCommands.CursorColumnSelectDown.id, 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */);
registerColumnSelection(CoreNavigationCommands.CursorColumnSelectPageDown.id, 1024 /* KeyMod.Shift */ | 12 /* KeyCode.PageDown */);
function registerCommand(command) {
    command.register();
    return command;
}
export var CoreEditingCommands;
(function (CoreEditingCommands) {
    class CoreEditingCommand extends EditorCommand {
        runEditorCommand(accessor, editor, args) {
            const viewModel = editor._getViewModel();
            if (!viewModel) {
                // the editor has no view => has no cursors
                return;
            }
            this.runCoreEditingCommand(editor, viewModel, args || {});
        }
    }
    CoreEditingCommands.CoreEditingCommand = CoreEditingCommand;
    CoreEditingCommands.LineBreakInsert = registerEditorCommand(new (class extends CoreEditingCommand {
        constructor() {
            super({
                id: 'lineBreakInsert',
                precondition: EditorContextKeys.writable,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 0,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 45 /* KeyCode.KeyO */ },
                },
            });
        }
        runCoreEditingCommand(editor, viewModel, args) {
            editor.pushUndoStop();
            editor.executeCommands(this.id, EnterOperation.lineBreakInsert(viewModel.cursorConfig, viewModel.model, viewModel.getCursorStates().map((s) => s.modelState.selection)));
        }
    })());
    CoreEditingCommands.Outdent = registerEditorCommand(new (class extends CoreEditingCommand {
        constructor() {
            super({
                id: 'outdent',
                precondition: EditorContextKeys.writable,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, EditorContextKeys.tabDoesNotMoveFocus),
                    primary: 1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */,
                },
            });
        }
        runCoreEditingCommand(editor, viewModel, args) {
            editor.pushUndoStop();
            editor.executeCommands(this.id, TypeOperations.outdent(viewModel.cursorConfig, viewModel.model, viewModel.getCursorStates().map((s) => s.modelState.selection)));
            editor.pushUndoStop();
        }
    })());
    CoreEditingCommands.Tab = registerEditorCommand(new (class extends CoreEditingCommand {
        constructor() {
            super({
                id: 'tab',
                precondition: EditorContextKeys.writable,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, EditorContextKeys.tabDoesNotMoveFocus),
                    primary: 2 /* KeyCode.Tab */,
                },
            });
        }
        runCoreEditingCommand(editor, viewModel, args) {
            editor.pushUndoStop();
            editor.executeCommands(this.id, TypeOperations.tab(viewModel.cursorConfig, viewModel.model, viewModel.getCursorStates().map((s) => s.modelState.selection)));
            editor.pushUndoStop();
        }
    })());
    CoreEditingCommands.DeleteLeft = registerEditorCommand(new (class extends CoreEditingCommand {
        constructor() {
            super({
                id: 'deleteLeft',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 1 /* KeyCode.Backspace */,
                    secondary: [1024 /* KeyMod.Shift */ | 1 /* KeyCode.Backspace */],
                    mac: {
                        primary: 1 /* KeyCode.Backspace */,
                        secondary: [
                            1024 /* KeyMod.Shift */ | 1 /* KeyCode.Backspace */,
                            256 /* KeyMod.WinCtrl */ | 38 /* KeyCode.KeyH */,
                            256 /* KeyMod.WinCtrl */ | 1 /* KeyCode.Backspace */,
                        ],
                    },
                },
            });
        }
        runCoreEditingCommand(editor, viewModel, args) {
            const [shouldPushStackElementBefore, commands] = DeleteOperations.deleteLeft(viewModel.getPrevEditOperationType(), viewModel.cursorConfig, viewModel.model, viewModel.getCursorStates().map((s) => s.modelState.selection), viewModel.getCursorAutoClosedCharacters());
            if (shouldPushStackElementBefore) {
                editor.pushUndoStop();
            }
            editor.executeCommands(this.id, commands);
            viewModel.setPrevEditOperationType(2 /* EditOperationType.DeletingLeft */);
        }
    })());
    CoreEditingCommands.DeleteRight = registerEditorCommand(new (class extends CoreEditingCommand {
        constructor() {
            super({
                id: 'deleteRight',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 20 /* KeyCode.Delete */,
                    mac: {
                        primary: 20 /* KeyCode.Delete */,
                        secondary: [256 /* KeyMod.WinCtrl */ | 34 /* KeyCode.KeyD */, 256 /* KeyMod.WinCtrl */ | 20 /* KeyCode.Delete */],
                    },
                },
            });
        }
        runCoreEditingCommand(editor, viewModel, args) {
            const [shouldPushStackElementBefore, commands] = DeleteOperations.deleteRight(viewModel.getPrevEditOperationType(), viewModel.cursorConfig, viewModel.model, viewModel.getCursorStates().map((s) => s.modelState.selection));
            if (shouldPushStackElementBefore) {
                editor.pushUndoStop();
            }
            editor.executeCommands(this.id, commands);
            viewModel.setPrevEditOperationType(3 /* EditOperationType.DeletingRight */);
        }
    })());
    CoreEditingCommands.Undo = new (class extends EditorOrNativeTextInputCommand {
        constructor() {
            super(UndoCommand);
        }
        runDOMCommand(activeElement) {
            activeElement.ownerDocument.execCommand('undo');
        }
        runEditorCommand(accessor, editor, args) {
            if (!editor.hasModel() || editor.getOption(96 /* EditorOption.readOnly */) === true) {
                return;
            }
            return editor.getModel().undo();
        }
    })();
    CoreEditingCommands.Redo = new (class extends EditorOrNativeTextInputCommand {
        constructor() {
            super(RedoCommand);
        }
        runDOMCommand(activeElement) {
            activeElement.ownerDocument.execCommand('redo');
        }
        runEditorCommand(accessor, editor, args) {
            if (!editor.hasModel() || editor.getOption(96 /* EditorOption.readOnly */) === true) {
                return;
            }
            return editor.getModel().redo();
        }
    })();
})(CoreEditingCommands || (CoreEditingCommands = {}));
/**
 * A command that will invoke a command on the focused editor.
 */
class EditorHandlerCommand extends Command {
    constructor(id, handlerId, metadata) {
        super({
            id: id,
            precondition: undefined,
            metadata,
        });
        this._handlerId = handlerId;
    }
    runCommand(accessor, args) {
        const editor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (!editor) {
            return;
        }
        editor.trigger('keyboard', this._handlerId, args);
    }
}
function registerOverwritableCommand(handlerId, metadata) {
    registerCommand(new EditorHandlerCommand('default:' + handlerId, handlerId));
    registerCommand(new EditorHandlerCommand(handlerId, handlerId, metadata));
}
registerOverwritableCommand("type" /* Handler.Type */, {
    description: `Type`,
    args: [
        {
            name: 'args',
            schema: {
                type: 'object',
                required: ['text'],
                properties: {
                    text: {
                        type: 'string',
                    },
                },
            },
        },
    ],
});
registerOverwritableCommand("replacePreviousChar" /* Handler.ReplacePreviousChar */);
registerOverwritableCommand("compositionType" /* Handler.CompositionType */);
registerOverwritableCommand("compositionStart" /* Handler.CompositionStart */);
registerOverwritableCommand("compositionEnd" /* Handler.CompositionEnd */);
registerOverwritableCommand("paste" /* Handler.Paste */);
registerOverwritableCommand("cut" /* Handler.Cut */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29yZUNvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFBO0FBQ25DLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUV6RCxPQUFPLEtBQUssS0FBSyxNQUFNLDRCQUE0QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzRCxPQUFPLEVBQ04sT0FBTyxFQUNQLGFBQWEsRUFFYixxQkFBcUIsRUFFckIsV0FBVyxFQUNYLFdBQVcsRUFDWCxnQkFBZ0IsR0FDaEIsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUF1QixNQUFNLDJDQUEyQyxDQUFBO0FBQ2hHLE9BQU8sRUFDTixXQUFXLEdBSVgsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUU3RSxPQUFPLEVBQ04sVUFBVSxJQUFJLFdBQVcsRUFDekIsa0JBQWtCLEdBQ2xCLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3pFLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFL0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxD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