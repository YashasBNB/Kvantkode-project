/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import * as platform from '../../../../../base/common/platform.js';
function hasModifier(e, modifier) {
    return !!e[modifier];
}
/**
 * An event that encapsulates the various trigger modifiers logic needed for go to definition.
 */
export class ClickLinkMouseEvent {
    constructor(source, opts) {
        this.target = source.target;
        this.isLeftClick = source.event.leftButton;
        this.isMiddleClick = source.event.middleButton;
        this.isRightClick = source.event.rightButton;
        this.hasTriggerModifier = hasModifier(source.event, opts.triggerModifier);
        this.hasSideBySideModifier = hasModifier(source.event, opts.triggerSideBySideModifier);
        this.isNoneOrSingleMouseDown = source.event.detail <= 1;
    }
}
/**
 * An event that encapsulates the various trigger modifiers logic needed for go to definition.
 */
export class ClickLinkKeyboardEvent {
    constructor(source, opts) {
        this.keyCodeIsTriggerKey = source.keyCode === opts.triggerKey;
        this.keyCodeIsSideBySideKey = source.keyCode === opts.triggerSideBySideKey;
        this.hasTriggerModifier = hasModifier(source, opts.triggerModifier);
    }
}
export class ClickLinkOptions {
    constructor(triggerKey, triggerModifier, triggerSideBySideKey, triggerSideBySideModifier) {
        this.triggerKey = triggerKey;
        this.triggerModifier = triggerModifier;
        this.triggerSideBySideKey = triggerSideBySideKey;
        this.triggerSideBySideModifier = triggerSideBySideModifier;
    }
    equals(other) {
        return (this.triggerKey === other.triggerKey &&
            this.triggerModifier === other.triggerModifier &&
            this.triggerSideBySideKey === other.triggerSideBySideKey &&
            this.triggerSideBySideModifier === other.triggerSideBySideModifier);
    }
}
function createOptions(multiCursorModifier) {
    if (multiCursorModifier === 'altKey') {
        if (platform.isMacintosh) {
            return new ClickLinkOptions(57 /* KeyCode.Meta */, 'metaKey', 6 /* KeyCode.Alt */, 'altKey');
        }
        return new ClickLinkOptions(5 /* KeyCode.Ctrl */, 'ctrlKey', 6 /* KeyCode.Alt */, 'altKey');
    }
    if (platform.isMacintosh) {
        return new ClickLinkOptions(6 /* KeyCode.Alt */, 'altKey', 57 /* KeyCode.Meta */, 'metaKey');
    }
    return new ClickLinkOptions(6 /* KeyCode.Alt */, 'altKey', 5 /* KeyCode.Ctrl */, 'ctrlKey');
}
export class ClickLinkGesture extends Disposable {
    constructor(editor, opts) {
        super();
        this._onMouseMoveOrRelevantKeyDown = this._register(new Emitter());
        this.onMouseMoveOrRelevantKeyDown = this._onMouseMoveOrRelevantKeyDown.event;
        this._onExecute = this._register(new Emitter());
        this.onExecute = this._onExecute.event;
        this._onCancel = this._register(new Emitter());
        this.onCancel = this._onCancel.event;
        this._editor = editor;
        this._extractLineNumberFromMouseEvent =
            opts?.extractLineNumberFromMouseEvent ??
                ((e) => (e.target.position ? e.target.position.lineNumber : 0));
        this._opts = createOptions(this._editor.getOption(79 /* EditorOption.multiCursorModifier */));
        this._lastMouseMoveEvent = null;
        this._hasTriggerKeyOnMouseDown = false;
        this._lineNumberOnMouseDown = 0;
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(79 /* EditorOption.multiCursorModifier */)) {
                const newOpts = createOptions(this._editor.getOption(79 /* EditorOption.multiCursorModifier */));
                if (this._opts.equals(newOpts)) {
                    return;
                }
                this._opts = newOpts;
                this._lastMouseMoveEvent = null;
                this._hasTriggerKeyOnMouseDown = false;
                this._lineNumberOnMouseDown = 0;
                this._onCancel.fire();
            }
        }));
        this._register(this._editor.onMouseMove((e) => this._onEditorMouseMove(new ClickLinkMouseEvent(e, this._opts))));
        this._register(this._editor.onMouseDown((e) => this._onEditorMouseDown(new ClickLinkMouseEvent(e, this._opts))));
        this._register(this._editor.onMouseUp((e) => this._onEditorMouseUp(new ClickLinkMouseEvent(e, this._opts))));
        this._register(this._editor.onKeyDown((e) => this._onEditorKeyDown(new ClickLinkKeyboardEvent(e, this._opts))));
        this._register(this._editor.onKeyUp((e) => this._onEditorKeyUp(new ClickLinkKeyboardEvent(e, this._opts))));
        this._register(this._editor.onMouseDrag(() => this._resetHandler()));
        this._register(this._editor.onDidChangeCursorSelection((e) => this._onDidChangeCursorSelection(e)));
        this._register(this._editor.onDidChangeModel((e) => this._resetHandler()));
        this._register(this._editor.onDidChangeModelContent(() => this._resetHandler()));
        this._register(this._editor.onDidScrollChange((e) => {
            if (e.scrollTopChanged || e.scrollLeftChanged) {
                this._resetHandler();
            }
        }));
    }
    _onDidChangeCursorSelection(e) {
        if (e.selection && e.selection.startColumn !== e.selection.endColumn) {
            this._resetHandler(); // immediately stop this feature if the user starts to select (https://github.com/microsoft/vscode/issues/7827)
        }
    }
    _onEditorMouseMove(mouseEvent) {
        this._lastMouseMoveEvent = mouseEvent;
        this._onMouseMoveOrRelevantKeyDown.fire([mouseEvent, null]);
    }
    _onEditorMouseDown(mouseEvent) {
        // We need to record if we had the trigger key on mouse down because someone might select something in the editor
        // holding the mouse down and then while mouse is down start to press Ctrl/Cmd to start a copy operation and then
        // release the mouse button without wanting to do the navigation.
        // With this flag we prevent goto definition if the mouse was down before the trigger key was pressed.
        this._hasTriggerKeyOnMouseDown = mouseEvent.hasTriggerModifier;
        this._lineNumberOnMouseDown = this._extractLineNumberFromMouseEvent(mouseEvent);
    }
    _onEditorMouseUp(mouseEvent) {
        const currentLineNumber = this._extractLineNumberFromMouseEvent(mouseEvent);
        if (this._hasTriggerKeyOnMouseDown &&
            this._lineNumberOnMouseDown &&
            this._lineNumberOnMouseDown === currentLineNumber) {
            this._onExecute.fire(mouseEvent);
        }
    }
    _onEditorKeyDown(e) {
        if (this._lastMouseMoveEvent &&
            (e.keyCodeIsTriggerKey || // User just pressed Ctrl/Cmd (normal goto definition)
                (e.keyCodeIsSideBySideKey && e.hasTriggerModifier)) // User pressed Ctrl/Cmd+Alt (goto definition to the side)
        ) {
            this._onMouseMoveOrRelevantKeyDown.fire([this._lastMouseMoveEvent, e]);
        }
        else if (e.hasTriggerModifier) {
            this._onCancel.fire(); // remove decorations if user holds another key with ctrl/cmd to prevent accident goto declaration
        }
    }
    _onEditorKeyUp(e) {
        if (e.keyCodeIsTriggerKey) {
            this._onCancel.fire();
        }
    }
    _resetHandler() {
        this._lastMouseMoveEvent = null;
        this._hasTriggerKeyOnMouseDown = false;
        this._onCancel.fire();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpY2tMaW5rR2VzdHVyZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2dvdG9TeW1ib2wvYnJvd3Nlci9saW5rL2NsaWNrTGlua0dlc3R1cmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEtBQUssUUFBUSxNQUFNLHdDQUF3QyxDQUFBO0FBS2xFLFNBQVMsV0FBVyxDQUNuQixDQUE2RSxFQUM3RSxRQUF1RDtJQUV2RCxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUE7QUFDckIsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLG1CQUFtQjtJQVMvQixZQUFZLE1BQXlCLEVBQUUsSUFBc0I7UUFDNUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFBO1FBQzNCLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUE7UUFDMUMsSUFBSSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQTtRQUM5QyxJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFBO1FBQzVDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDekUsSUFBSSxDQUFDLHFCQUFxQixHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQ3RGLElBQUksQ0FBQyx1QkFB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