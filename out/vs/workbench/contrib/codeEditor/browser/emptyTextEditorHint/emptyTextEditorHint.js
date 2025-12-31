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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1wdHlUZXh0RWRpdG9ySGludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9lbXB0eVRleHRFZGl0b3JIaW50L2VtcHR5VGV4dEVkaXRvckhpbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFPL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUUvRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBS3JHLE9BQU8sRUFFTiwwQkFBMEIsR0FDMUIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNoRyxPQUFPLEVBRU4sbUJBQW1CLEdBQ25CLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFD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