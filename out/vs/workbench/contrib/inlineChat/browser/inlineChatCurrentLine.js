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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdEN1cnJlbnRMaW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ2hhdC9icm93c2VyL2lubGluZUNoYXRDdXJyZW50TGluZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBR3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsRUFDbEIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDaEUsT0FBTyxFQUNOLFlBQVksRUFDWix5QkFBeUIsRUFDekIsdUJBQXVCLEdBRXZCLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUFFLGFBQWEsRUFBb0IsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDL0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNoRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVsRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRTlELE9BQU8sRUFDTixPQUFPLEVBQ1AsZ0JB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