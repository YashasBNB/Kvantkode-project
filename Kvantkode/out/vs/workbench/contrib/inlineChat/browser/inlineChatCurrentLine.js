/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var InlineChatHintsController_1;
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../nls.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { InlineChatController } from './inlineChatController.js';
import { ACTION_START, CTX_INLINE_CHAT_HAS_AGENT, CTX_INLINE_CHAT_VISIBLE, } from '../common/inlineChat.js';
import { EditorAction2 } from '../../../../editor/browser/editorExtensions.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Position } from '../../../../editor/common/core/position.js';
import { AbstractInline1ChatAction } from './inlineChatActions.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { URI } from '../../../../base/common/uri.js';
import { isEqual } from '../../../../base/common/resources.js';
import { autorun, derivedWithStore, observableFromEvent, observableValue, } from '../../../../base/common/observable.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import './media/inlineChat.css';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { InlineCompletionsController } from '../../../../editor/contrib/inlineCompletions/browser/controller/inlineCompletionsController.js';
import { IChatAgentService } from '../../chat/common/chatAgents.js';
import { IMarkerDecorationsService } from '../../../../editor/common/services/markerDecorations.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { toAction } from '../../../../base/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { observableCodeEditor } from '../../../../editor/browser/observableCodeEditor.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { createStyleSheet2 } from '../../../../base/browser/domStylesheets.js';
import { stringValue } from '../../../../base/browser/cssValue.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { Emitter } from '../../../../base/common/event.js';
import { ChatAgentLocation } from '../../chat/common/constants.js';
export const CTX_INLINE_CHAT_SHOWING_HINT = new RawContextKey('inlineChatShowingHint', false, localize('inlineChatShowingHint', 'Whether inline chat shows a contextual hint'));
const _inlineChatActionId = 'inlineChat.startWithCurrentLine';
export class InlineChatExpandLineAction extends EditorAction2 {
    constructor() {
        super({
            id: _inlineChatActionId,
            category: AbstractInline1ChatAction.category,
            title: localize2('startWithCurrentLine', 'Start in Editor with Current Line'),
            f1: true,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_VISIBLE.negate(), CTX_INLINE_CHAT_HAS_AGENT, EditorContextKeys.writable),
            keybinding: [
                {
                    when: CTX_INLINE_CHAT_SHOWING_HINT,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
                },
                {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 39 /* KeyCode.KeyI */),
                },
            ],
        });
    }
    async runEditorCommand(_accessor, editor) {
        const ctrl = InlineChatController.get(editor);
        if (!ctrl || !editor.hasModel()) {
            return;
        }
        const model = editor.getModel();
        const lineNumber = editor.getSelection().positionLineNumber;
        const lineContent = model.getLineContent(lineNumber);
        const startColumn = model.getLineFirstNonWhitespaceColumn(lineNumber);
        const endColumn = model.getLineMaxColumn(lineNumber);
        // clear the line
        let undoEdits = [];
        model.pushEditOperations(null, [EditOperation.replace(new Range(lineNumber, startColumn, lineNumber, endColumn), '')], (edits) => {
            undoEdits = edits;
            return null;
        });
        // trigger chat
        const accepted = await ctrl.run({
            autoSend: true,
            message: lineContent.trim(),
            position: new Position(lineNumber, startColumn),
        });
        if (!accepted) {
            model.pushEditOperations(null, undoEdits, () => null);
        }
    }
}
export class ShowInlineChatHintAction extends EditorAction2 {
    constructor() {
        super({
            id: 'inlineChat.showHint',
            category: AbstractInline1ChatAction.category,
            title: localize2('showHint', 'Show Inline Chat Hint'),
            f1: false,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_VISIBLE.negate(), CTX_INLINE_CHAT_HAS_AGENT, EditorContextKeys.writable),
        });
    }
    async runEditorCommand(_accessor, editor, ...args) {
        if (!editor.hasModel()) {
            return;
        }
        const ctrl = InlineChatHintsController.get(editor);
        if (!ctrl) {
            return;
        }
        const [uri, position] = args;
        if (!URI.isUri(uri) || !Position.isIPosition(position)) {
            ctrl.hide();
            return;
        }
        const model = editor.getModel();
        if (!isEqual(model.uri, uri)) {
            ctrl.hide();
            return;
        }
        model.tokenization.forceTokenization(position.lineNumber);
        const tokens = model.tokenization.getLineTokens(position.lineNumber);
        let totalLength = 0;
        let specialLength = 0;
        let lastTokenType;
        tokens.forEach((idx) => {
            const tokenType = tokens.getStandardTokenType(idx);
            const startOffset = tokens.getStartOffset(idx);
            const endOffset = tokens.getEndOffset(idx);
            totalLength += endOffset - startOffset;
            if (tokenType !== 0 /* StandardTokenType.Other */) {
                specialLength += endOffset - startOffset;
            }
            lastTokenType = tokenType;
        });
        if (specialLength / totalLength > 0.25) {
            ctrl.hide();
            return;
        }
        if (lastTokenType === 1 /* StandardTokenType.Comment */) {
            ctrl.hide();
            return;
        }
        ctrl.show();
    }
}
let InlineChatHintsController = class InlineChatHintsController extends Disposable {
    static { InlineChatHintsController_1 = this; }
    static { this.ID = 'editor.contrib.inlineChatHints'; }
    static get(editor) {
        return editor.getContribution(InlineChatHintsController_1.ID);
    }
    constructor(editor, contextKeyService, commandService, keybindingService, chatAgentService, markerDecorationService, _contextMenuService, _configurationService) {
        super();
        this._contextMenuService = _contextMenuService;
        this._configurationService = _configurationService;
        this._visibilityObs = observableValue(this, false);
        this._editor = editor;
        this._ctxShowingHint = CTX_INLINE_CHAT_SHOWING_HINT.bindTo(contextKeyService);
        const ghostCtrl = InlineCompletionsController.get(editor);
        this._store.add(commandService.onWillExecuteCommand((e) => {
            if (e.commandId === _inlineChatActionId || e.commandId === ACTION_START) {
                this.hide();
            }
        }));
        this._store.add(this._editor.onMouseDown((e) => {
            if (e.target.type !== 6 /* MouseTargetType.CONTENT_TEXT */) {
                return;
            }
            if (!e.target.element?.classList.contains('inline-chat-hint-text')) {
                return;
            }
            if (e.event.leftButton) {
                commandService.executeCommand(_inlineChatActionId);
                this.hide();
            }
            else if (e.event.rightButton) {
                e.event.preventDefault();
                this._showContextMenu(e.event, e.target.element?.classList.contains('whitespace')
                    ? "inlineChat.lineEmptyHint" /* InlineChatConfigKeys.LineEmptyHint */
                    : "inlineChat.lineNaturalLanguageHint" /* InlineChatConfigKeys.LineNLHint */);
            }
        }));
        const markerSuppression = this._store.add(new MutableDisposable());
        const decos = this._editor.createDecorationsCollection();
        const editorObs = observableCodeEditor(editor);
        const keyObs = observableFromEvent(keybindingService.onDidUpdateKeybindings, (_) => keybindingService.lookupKeybinding(ACTION_START)?.getLabel());
        const configHintEmpty = observableConfigValue("inlineChat.lineEmptyHint" /* InlineChatConfigKeys.LineEmptyHint */, false, this._configurationService);
        const configHintNL = observableConfigValue("inlineChat.lineNaturalLanguageHint" /* InlineChatConfigKeys.LineNLHint */, false, this._configurationService);
        const showDataObs = derivedWithStore((r, store) => {
            const ghostState = ghostCtrl?.model.read(r)?.state.read(r);
            const textFocus = editorObs.isTextFocused.read(r);
            let position = editorObs.cursorPosition.read(r);
            const model = editorObs.model.read(r);
            const kb = keyObs.read(r);
            if (ghostState !== undefined || !kb || !position || !model || !textFocus) {
                return undefined;
            }
            if (model.getLanguageId() === PLAINTEXT_LANGUAGE_ID || model.getLanguageId() === 'markdown') {
                return undefined;
            }
            // DEBT - I cannot use `model.onDidChangeContent` directly here
            // https://github.com/microsoft/vscode/issues/242059
            const emitter = store.add(new Emitter());
            store.add(model.onDidChangeContent(() => emitter.fire()));
            observableFromEvent(emitter.event, () => model.getVersionId()).read(r);
            // position can be wrong
            position = model.validatePosition(position);
            const visible = this._visibilityObs.read(r);
            const isEol = model.getLineMaxColumn(position.lineNumber) === position.column;
            const isWhitespace = model.getLineLastNonWhitespaceColumn(position.lineNumber) === 0 &&
                model.getValueLength() > 0 &&
                position.column > 1;
            if (isWhitespace) {
                return configHintEmpty.read(r) ? { isEol, isWhitespace, kb, position, model } : undefined;
            }
            if (visible && isEol && configHintNL.read(r)) {
                return { isEol, isWhitespace, kb, position, model };
            }
            return undefined;
        });
        const style = createStyleSheet2();
        this._store.add(style);
        this._store.add(autorun((r) => {
            const showData = showDataObs.read(r);
            if (!showData) {
                decos.clear();
                markerSuppression.clear();
                this._ctxShowingHint.reset();
                return;
            }
            const agentName = chatAgentService.getDefaultAgent(ChatAgentLocation.Editor)?.name ??
                localize('defaultTitle', 'Chat');
            const { position, isEol, isWhitespace, kb, model } = showData;
            const inlineClassName = [
                'a' /*HACK but sorts as we want*/,
                'inline-chat-hint',
                'inline-chat-hint-text',
            ];
            let content;
            if (isWhitespace) {
                content = '\u00a0' + localize('title2', '{0} to edit with {1}', kb, agentName);
            }
            else if (isEol) {
                content = '\u00a0' + localize('title1', '{0} to continue with {1}', kb, agentName);
            }
            else {
                content = '\u200a' + kb + '\u200a';
                inlineClassName.push('embedded');
            }
            style.setStyle(`.inline-chat-hint-text::after { content: ${stringValue(content)} }`);
            if (isWhitespace) {
                inlineClassName.push('whitespace');
            }
            this._ctxShowingHint.set(true);
            decos.set([
                {
                    range: Range.fromPositions(position),
                    options: {
                        description: 'inline-chat-hint-line',
                        showIfCollapsed: true,
                        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
                        afterContentClassName: inlineClassName.join(' '),
                    },
                },
            ]);
            markerSuppression.value = markerDecorationService.addMarkerSuppression(model.uri, model.validateRange(new Range(position.lineNumber, 1, position.lineNumber, Number.MAX_SAFE_INTEGER)));
        }));
    }
    _showContextMenu(event, setting) {
        this._contextMenuService.showContextMenu({
            getAnchor: () => ({ x: event.posx, y: event.posy }),
            getActions: () => [
                toAction({
                    id: 'inlineChat.disableHint',
                    label: localize('disableHint', 'Disable Inline Chat Hint'),
                    run: async () => {
                        await this._configurationService.updateValue(setting, false);
                    },
                }),
            ],
        });
    }
    show() {
        this._visibilityObs.set(true, undefined);
    }
    hide() {
        this._visibilityObs.set(false, undefined);
    }
};
InlineChatHintsController = InlineChatHintsController_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, ICommandService),
    __param(3, IKeybindingService),
    __param(4, IChatAgentService),
    __param(5, IMarkerDecorationsService),
    __param(6, IContextMenuService),
    __param(7, IConfigurationService)
], InlineChatHintsController);
export { InlineChatHintsController };
export class HideInlineChatHintAction extends EditorAction2 {
    constructor() {
        super({
            id: 'inlineChat.hideHint',
            title: localize2('hideHint', 'Hide Inline Chat Hint'),
            precondition: CTX_INLINE_CHAT_SHOWING_HINT,
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */ - 10,
                primary: 9 /* KeyCode.Escape */,
            },
        });
    }
    async runEditorCommand(_accessor, editor) {
        InlineChatHintsController.get(editor)?.hide();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdEN1cnJlbnRMaW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvaW5saW5lQ2hhdEN1cnJlbnRMaW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFHcEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sWUFBWSxFQUNaLHlCQUF5QixFQUN6Qix1QkFBdUIsR0FFdkIsTUFBTSx5QkFBeUIsQ0FBQTtBQUNoQyxPQUFPLEVBQUUsYUFBYSxFQUFvQixNQUFNLGdEQUFnRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRWxGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFOUQsT0FBTyxFQUNOLE9BQU8sRUFD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