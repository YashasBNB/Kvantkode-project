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
import './emptyTextEditorHint.css';
import * as dom from '../../../../../base/browser/dom.js';
import { DisposableStore, dispose } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { ChangeLanguageAction } from '../../../../browser/parts/editor/editorStatus.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { Schemas } from '../../../../../base/common/network.js';
import { Event } from '../../../../../base/common/event.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { registerEditorContribution, } from '../../../../../editor/browser/editorExtensions.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { renderFormattedText, } from '../../../../../base/browser/formattedTextRenderer.js';
import { ApplyFileSnippetAction } from '../../../snippets/browser/commands/fileTemplateSnippets.js';
import { IInlineChatSessionService } from '../../../inlineChat/browser/inlineChatSessionService.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { KeybindingLabel } from '../../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { OS } from '../../../../../base/common/platform.js';
import { status } from '../../../../../base/browser/ui/aria/aria.js';
import { LOG_MODE_ID, OUTPUT_MODE_ID } from '../../../../services/output/common/output.js';
import { SEARCH_RESULT_LANGUAGE_ID } from '../../../../services/search/common/search.js';
import { getDefaultHoverDelegate } from '../../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IChatAgentService } from '../../../chat/common/chatAgents.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
import { ChatAgentLocation } from '../../../chat/common/constants.js';
const $ = dom.$;
export const emptyTextEditorHintSetting = 'workbench.editor.empty.hint';
let EmptyTextEditorHintContribution = class EmptyTextEditorHintContribution {
    static { this.ID = 'editor.contrib.emptyTextEditorHint'; }
    constructor(editor, editorGroupsService, commandService, configurationService, hoverService, keybindingService, inlineChatSessionService, chatAgentService, telemetryService, productService, contextMenuService) {
        this.editor = editor;
        this.editorGroupsService = editorGroupsService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        this.keybindingService = keybindingService;
        this.inlineChatSessionService = inlineChatSessionService;
        this.chatAgentService = chatAgentService;
        this.telemetryService = telemetryService;
        this.productService = productService;
        this.contextMenuService = contextMenuService;
        this.toDispose = [];
        this.toDispose.push(this.editor.onDidChangeModel(() => this.update()));
        this.toDispose.push(this.editor.onDidChangeModelLanguage(() => this.update()));
        this.toDispose.push(this.editor.onDidChangeModelContent(() => this.update()));
        this.toDispose.push(this.chatAgentService.onDidChangeAgents(() => this.update()));
        this.toDispose.push(this.editor.onDidChangeModelDecorations(() => this.update()));
        this.toDispose.push(this.editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(96 /* EditorOption.readOnly */)) {
                this.update();
            }
        }));
        this.toDispose.push(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(emptyTextEditorHintSetting)) {
                this.update();
            }
        }));
        this.toDispose.push(inlineChatSessionService.onWillStartSession((editor) => {
            if (this.editor === editor) {
                this.textHintContentWidget?.dispose();
            }
        }));
        this.toDispose.push(inlineChatSessionService.onDidEndSession((e) => {
            if (this.editor === e.editor) {
                this.update();
            }
        }));
    }
    _getOptions() {
        return { clickable: true };
    }
    _shouldRenderHint() {
        const configValue = this.configurationService.getValue(emptyTextEditorHintSetting);
        if (configValue === 'hidden') {
            return false;
        }
        if (this.editor.getOption(96 /* EditorOption.readOnly */)) {
            return false;
        }
        const model = this.editor.getModel();
        const languageId = model?.getLanguageId();
        if (!model ||
            languageId === OUTPUT_MODE_ID ||
            languageId === LOG_MODE_ID ||
            languageId === SEARCH_RESULT_LANGUAGE_ID) {
            return false;
        }
        if (this.inlineChatSessionService.getSession(this.editor, model.uri)) {
            return false;
        }
        if (this.editor.getModel()?.getValueLength()) {
            return false;
        }
        const hasConflictingDecorations = Boolean(this.editor
            .getLineDecorations(1)
            ?.find((d) => d.options.beforeContentClassName ||
            d.options.afterContentClassName ||
            d.options.before?.content ||
            d.options.after?.content));
        if (hasConflictingDecorations) {
            return false;
        }
        const hasEditorAgents = Boolean(this.chatAgentService.getDefaultAgent(ChatAgentLocation.Editor));
        const shouldRenderDefaultHint = model?.uri.scheme === Schemas.untitled && languageId === PLAINTEXT_LANGUAGE_ID;
        return hasEditorAgents || shouldRenderDefaultHint;
    }
    update() {
        const shouldRenderHint = this._shouldRenderHint();
        if (shouldRenderHint && !this.textHintContentWidget) {
            this.textHintContentWidget = new EmptyTextEditorHintContentWidget(this.editor, this._getOptions(), this.editorGroupsService, this.commandService, this.configurationService, this.hoverService, this.keybindingService, this.chatAgentService, this.telemetryService, this.productService, this.contextMenuService);
        }
        else if (!shouldRenderHint && this.textHintContentWidget) {
            this.textHintContentWidget.dispose();
            this.textHintContentWidget = undefined;
        }
    }
    dispose() {
        dispose(this.toDispose);
        this.textHintContentWidget?.dispose();
    }
};
EmptyTextEditorHintContribution = __decorate([
    __param(1, IEditorGroupsService),
    __param(2, ICommandService),
    __param(3, IConfigurationService),
    __param(4, IHoverService),
    __param(5, IKeybindingService),
    __param(6, IInlineChatSessionService),
    __param(7, IChatAgentService),
    __param(8, ITelemetryService),
    __param(9, IProductService),
    __param(10, IContextMenuService)
], EmptyTextEditorHintContribution);
export { EmptyTextEditorHintContribution };
class EmptyTextEditorHintContentWidget {
    static { this.ID = 'editor.widget.emptyHint'; }
    constructor(editor, options, editorGroupsService, commandService, configurationService, hoverService, keybindingService, chatAgentService, telemetryService, productService, contextMenuService) {
        this.editor = editor;
        this.options = options;
        this.editorGroupsService = editorGroupsService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        this.keybindingService = keybindingService;
        this.chatAgentService = chatAgentService;
        this.telemetryService = telemetryService;
        this.productService = productService;
        this.contextMenuService = contextMenuService;
        this.isVisible = false;
        this.ariaLabel = '';
        this.toDispose = new DisposableStore();
        this.toDispose.add(this.editor.onDidChangeConfiguration((e) => {
            if (this.domNode && e.hasChanged(52 /* EditorOption.fontInfo */)) {
                this.editor.applyFontInfo(this.domNode);
            }
        }));
        const onDidFocusEditorText = Event.debounce(this.editor.onDidFocusEditorText, () => undefined, 500);
        this.toDispose.add(onDidFocusEditorText(() => {
            if (this.editor.hasTextFocus() &&
                this.isVisible &&
                this.ariaLabel &&
                this.configurationService.getValue("accessibility.verbosity.emptyEditorHint" /* AccessibilityVerbositySettingId.EmptyEditorHint */)) {
                status(this.ariaLabel);
            }
        }));
        this.editor.addContentWidget(this);
    }
    getId() {
        return EmptyTextEditorHintContentWidget.ID;
    }
    _disableHint(e) {
        const disableHint = () => {
            this.configurationService.updateValue(emptyTextEditorHintSetting, 'hidden');
            this.dispose();
            this.editor.focus();
        };
        if (!e) {
            disableHint();
            return;
        }
        this.contextMenuService.showContextMenu({
            getAnchor: () => {
                return new StandardMouseEvent(dom.getActiveWindow(), e);
            },
            getActions: () => {
                return [
                    {
                        id: 'workench.action.disableEmptyEditorHint',
                        label: localize('disableEditorEmptyHint', 'Disable Empty Editor Hint'),
                        tooltip: localize('disableEditorEmptyHint', 'Disable Empty Editor Hint'),
                        enabled: true,
                        class: undefined,
                        run: () => {
                            disableHint();
                        },
                    },
                ];
            },
        });
    }
    _getHintInlineChat(providers) {
        const providerName = (providers.length === 1 ? providers[0].fullName : undefined) ?? this.productService.nameShort;
        const inlineChatId = 'inlineChat.start';
        let ariaLabel = `Ask ${providerName} something or start typing to dismiss.`;
        const handleClick = () => {
            this.telemetryService.publicLog2('workbenchActionExecuted', {
                id: 'inlineChat.hintAction',
                from: 'hint',
            });
            this.commandService.executeCommand(inlineChatId, { from: 'hint' });
        };
        const hintHandler = {
            disposables: this.toDispose,
            callback: (index, _event) => {
                switch (index) {
                    case '0':
                        handleClick();
                        break;
                }
            },
        };
        const hintElement = $('empty-hint-text');
        hintElement.style.display = 'block';
        const keybindingHint = this.keybindingService.lookupKeybinding(inlineChatId);
        const keybindingHintLabel = keybindingHint?.getLabel();
        if (keybindingHint && keybindingHintLabel) {
            const actionPart = localize('emptyHintText', 'Press {0} to ask {1} to do something. ', keybindingHintLabel, providerName);
            const [before, after] = actionPart.split(keybindingHintLabel).map((fragment) => {
                if (this.options.clickable) {
                    const hintPart = $('a', undefined, fragment);
                    hintPart.style.fontStyle = 'italic';
                    hintPart.style.cursor = 'pointer';
                    this.toDispose.add(dom.addDisposableListener(hintPart, dom.EventType.CONTEXT_MENU, (e) => this._disableHint(e)));
                    this.toDispose.add(dom.addDisposableListener(hintPart, dom.EventType.CLICK, handleClick));
                    return hintPart;
                }
                else {
                    const hintPart = $('span', undefined, fragment);
                    hintPart.style.fontStyle = 'italic';
                    return hintPart;
                }
            });
            hintElement.appendChild(before);
            const label = hintHandler.disposables.add(new KeybindingLabel(hintElement, OS));
            label.set(keybindingHint);
            label.element.style.width = 'min-content';
            label.element.style.display = 'inline';
            if (this.options.clickable) {
                label.element.style.cursor = 'pointer';
                this.toDispose.add(dom.addDisposableListener(label.element, dom.EventType.CONTEXT_MENU, (e) => this._disableHint(e)));
                this.toDispose.add(dom.addDisposableListener(label.element, dom.EventType.CLICK, handleClick));
            }
            hintElement.appendChild(after);
            const typeToDismiss = localize('emptyHintTextDismiss', 'Start typing to dismiss.');
            const textHint2 = $('span', undefined, typeToDismiss);
            textHint2.style.fontStyle = 'italic';
            hintElement.appendChild(textHint2);
            ariaLabel = actionPart.concat(typeToDismiss);
        }
        else {
            const hintMsg = localize({
                key: 'inlineChatHint',
                comment: ['Preserve double-square brackets and their order'],
            }, '[[Ask {0} to do something]] or start typing to dismiss.', providerName);
            const rendered = renderFormattedText(hintMsg, { actionHandler: hintHandler });
            hintElement.appendChild(rendered);
        }
        return { ariaLabel, hintElement };
    }
    _getHintDefault() {
        const hintHandler = {
            disposables: this.toDispose,
            callback: (index, event) => {
                switch (index) {
                    case '0':
                        languageOnClickOrTap(event.browserEvent);
                        break;
                    case '1':
                        snippetOnClickOrTap(event.browserEvent);
                        break;
                    case '2':
                        chooseEditorOnClickOrTap(event.browserEvent);
                        break;
                    case '3':
                        this._disableHint();
                        break;
                }
            },
        };
        // the actual command handlers...
        const languageOnClickOrTap = async (e) => {
            e.stopPropagation();
            // Need to focus editor before so current editor becomes active and the command is properly executed
            this.editor.focus();
            this.telemetryService.publicLog2('workbenchActionExecuted', {
                id: ChangeLanguageAction.ID,
                from: 'hint',
            });
            await this.commandService.executeCommand(ChangeLanguageAction.ID);
            this.editor.focus();
        };
        const snippetOnClickOrTap = async (e) => {
            e.stopPropagation();
            this.telemetryService.publicLog2('workbenchActionExecuted', {
                id: ApplyFileSnippetAction.Id,
                from: 'hint',
            });
            await this.commandService.executeCommand(ApplyFileSnippetAction.Id);
        };
        const chooseEditorOnClickOrTap = async (e) => {
            e.stopPropagation();
            const activeEditorInput = this.editorGroupsService.activeGroup.activeEditor;
            this.telemetryService.publicLog2('workbenchActionExecuted', {
                id: 'welcome.showNewFileEntries',
                from: 'hint',
            });
            const newEditorSelected = await this.commandService.executeCommand('welcome.showNewFileEntries', { from: 'hint' });
            // Close the active editor as long as it is untitled (swap the editors out)
            if (newEditorSelected &&
                activeEditorInput !== null &&
                activeEditorInput.resource?.scheme === Schemas.untitled) {
                this.editorGroupsService.activeGroup.closeEditor(activeEditorInput, { preserveFocus: true });
            }
        };
        const hintMsg = localize({
            key: 'message',
            comment: [
                'Preserve double-square brackets and their order',
                'language refers to a programming language',
            ],
        }, "[[Select a language]], or [[fill with template]], or [[open a different editor]] to get started.\nStart typing to dismiss or [[don't show]] this again.");
        const hintElement = renderFormattedText(hintMsg, {
            actionHandler: hintHandler,
            renderCodeSegments: false,
        });
        hintElement.style.fontStyle = 'italic';
        // ugly way to associate keybindings...
        const keybindingsLookup = [
            ChangeLanguageAction.ID,
            ApplyFileSnippetAction.Id,
            'welcome.showNewFileEntries',
        ];
        const keybindingLabels = keybindingsLookup.map((id) => this.keybindingService.lookupKeybinding(id)?.getLabel() ?? id);
        const ariaLabel = localize('defaultHintAriaLabel', 'Execute {0} to select a language, execute {1} to fill with template, or execute {2} to open a different editor and get started. Start typing to dismiss.', ...keybindingLabels);
        for (const anchor of hintElement.querySelectorAll('a')) {
            anchor.style.cursor = 'pointer';
            const id = keybindingsLookup.shift();
            const title = id && this.keybindingService.lookupKeybinding(id)?.getLabel();
            hintHandler.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), anchor, title ?? ''));
        }
        return { hintElement, ariaLabel };
    }
    getDomNode() {
        if (!this.domNode) {
            this.domNode = $('.empty-editor-hint');
            this.domNode.style.width = 'max-content';
            this.domNode.style.paddingLeft = '4px';
            const inlineChatProviders = this.chatAgentService
                .getActivatedAgents()
                .filter((candidate) => candidate.locations.includes(ChatAgentLocation.Editor));
            const { hintElement, ariaLabel } = !inlineChatProviders.length
                ? this._getHintDefault()
                : this._getHintInlineChat(inlineChatProviders);
            this.domNode.append(hintElement);
            this.ariaLabel = ariaLabel.concat(localize('disableHint', ' Toggle {0} in settings to disable this hint.', "accessibility.verbosity.emptyEditorHint" /* AccessibilityVerbositySettingId.EmptyEditorHint */));
            this.toDispose.add(dom.addDisposableListener(this.domNode, 'click', () => {
                this.editor.focus();
            }));
            this.editor.applyFontInfo(this.domNode);
        }
        return this.domNode;
    }
    getPosition() {
        return {
            position: { lineNumber: 1, column: 1 },
            preference: [0 /* ContentWidgetPositionPreference.EXACT */],
        };
    }
    dispose() {
        this.editor.removeContentWidget(this);
        dispose(this.toDispose);
    }
}
registerEditorContribution(EmptyTextEditorHintContribution.ID, EmptyTextEditorHintContribution, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to render a help message
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1wdHlUZXh0RWRpdG9ySGludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL2VtcHR5VGV4dEVkaXRvckhpbnQvZW1wdHlUZXh0RWRpdG9ySGludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQU8vRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRS9GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFLckcsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ2hHLE9BQU8sRUFFTixtQkFBbUIsR0FDbkIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0REFBNEQsQ0FB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