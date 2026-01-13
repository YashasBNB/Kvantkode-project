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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9jb3JlQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFDbkMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXpELE9BQU8sS0FBSyxLQUFLLE1BQU0sNEJBQTRCLENBQUE7QUFDbkQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTNELE9BQU8sRUFDTixPQUFPLEVBQ1AsYUFBYSxFQUViLHFCQUFxQixFQUVyQixXQUFXLEVBQ1gsV0FBVyxFQUNYLGdCQUFnQixHQUNoQixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQXVCLE1BQU0sMkNBQTJDLENBQUE7QUFDaEcsT0FBTyxFQUNOLFdBQVcsR0FJWCxNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRTdFLE9BQU8sRUFDTixVQUFVLElBQUksV0FBVyxFQUN6QixrQkFBa0IsR0FDbEIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDekUsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUUvQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUdsRSxPQUFPLEVBQUUs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