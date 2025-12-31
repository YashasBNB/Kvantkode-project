var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TerminalInitialHintContribution_1;
import * as dom from '../../../../../base/browser/dom.js';
import { renderFormattedText, } from '../../../../../base/browser/formattedTextRenderer.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
import { status } from '../../../../../base/browser/ui/aria/aria.js';
import { KeybindingLabel } from '../../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../../base/common/lifecycle.js';
import { OS } from '../../../../../base/common/platform.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IStorageService, } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IChatAgentService } from '../../../chat/common/chatAgents.js';
import { ITerminalEditorService, ITerminalGroupService, ITerminalService, } from '../../../terminal/browser/terminal.js';
import { registerTerminalContribution, } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalInstance } from '../../../terminal/browser/terminalInstance.js';
import './media/terminalInitialHint.css';
import { ChatAgentLocation } from '../../../chat/common/constants.js';
const $ = dom.$;
var Constants;
(function (Constants) {
    Constants["InitialHintHideStorageKey"] = "terminal.initialHint.hide";
})(Constants || (Constants = {}));
export class InitialHintAddon extends Disposable {
    get onDidRequestCreateHint() {
        return this._onDidRequestCreateHint.event;
    }
    constructor(_capabilities, _onDidChangeAgents) {
        super();
        this._capabilities = _capabilities;
        this._onDidChangeAgents = _onDidChangeAgents;
        this._onDidRequestCreateHint = this._register(new Emitter());
        this._disposables = this._register(new MutableDisposable());
    }
    activate(terminal) {
        const store = this._register(new DisposableStore());
        this._disposables.value = store;
        const capability = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (capability) {
            store.add(Event.once(capability.promptInputModel.onDidStartInput)(() => this._onDidRequestCreateHint.fire()));
        }
        else {
            this._register(this._capabilities.onDidAddCapability((e) => {
                if (e.id === 2 /* TerminalCapability.CommandDetection */) {
                    const capability = e.capability;
                    store.add(Event.once(capability.promptInputModel.onDidStartInput)(() => this._onDidRequestCreateHint.fire()));
                    if (!capability.promptInputModel.value) {
                        this._onDidRequestCreateHint.fire();
                    }
                }
            }));
        }
        const agentListener = this._onDidChangeAgents((e) => {
            if (e?.locations.includes(ChatAgentLocation.Terminal)) {
                this._onDidRequestCreateHint.fire();
                agentListener.dispose();
            }
        });
        this._disposables.value?.add(agentListener);
    }
}
let TerminalInitialHintContribution = class TerminalInitialHintContribution extends Disposable {
    static { TerminalInitialHintContribution_1 = this; }
    static { this.ID = 'terminal.initialHint'; }
    static get(instance) {
        return instance.getContribution(TerminalInitialHintContribution_1.ID);
    }
    constructor(_ctx, _chatAgentService, _configurationService, _instantiationService, _storageService, _terminalEditorService, _terminalGroupService) {
        super();
        this._ctx = _ctx;
        this._chatAgentService = _chatAgentService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._storageService = _storageService;
        this._terminalEditorService = _terminalEditorService;
        this._terminalGroupService = _terminalGroupService;
        // Reset hint state when config changes
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("terminal.integrated.initialHint" /* TerminalInitialHintSettingId.Enabled */)) {
                this._storageService.remove("terminal.initialHint.hide" /* Constants.InitialHintHideStorageKey */, -1 /* StorageScope.APPLICATION */);
            }
        }));
    }
    xtermOpen(xterm) {
        // Don't show is the terminal was launched by an extension or a feature like debug
        if ('shellLaunchConfig' in this._ctx.instance &&
            (this._ctx.instance.shellLaunchConfig.isExtensionOwnedTerminal ||
                this._ctx.instance.shellLaunchConfig.isFeatureTerminal)) {
            return;
        }
        // Don't show if disabled
        if (this._storageService.getBoolean("terminal.initialHint.hide" /* Constants.InitialHintHideStorageKey */, -1 /* StorageScope.APPLICATION */, false)) {
            return;
        }
        // Only show for the first terminal
        if (this._terminalGroupService.instances.length + this._terminalEditorService.instances.length !==
            1) {
            return;
        }
        this._xterm = xterm;
        this._addon = this._register(this._instantiationService.createInstance(InitialHintAddon, this._ctx.instance.capabilities, this._chatAgentService.onDidChangeAgents));
        this._xterm.raw.loadAddon(this._addon);
        this._register(this._addon.onDidRequestCreateHint(() => this._createHint()));
    }
    _createHint() {
        const instance = this._ctx.instance instanceof TerminalInstance ? this._ctx.instance : undefined;
        const commandDetectionCapability = instance?.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (!instance ||
            !this._xterm ||
            this._hintWidget ||
            !commandDetectionCapability ||
            commandDetectionCapability.promptInputModel.value ||
            !!instance.shellLaunchConfig.attachPersistentProcess) {
            return;
        }
        if (!this._configurationService.getValue("terminal.integrated.initialHint" /* TerminalInitialHintSettingId.Enabled */)) {
            return;
        }
        if (!this._decoration) {
            const marker = this._xterm.raw.registerMarker();
            if (!marker) {
                return;
            }
            if (this._xterm.raw.buffer.active.cursorX === 0) {
                return;
            }
            this._register(marker);
            this._decoration = this._xterm.raw.registerDecoration({
                marker,
                x: this._xterm.raw.buffer.active.cursorX + 1,
            });
            if (this._decoration) {
                this._register(this._decoration);
            }
        }
        this._register(this._xterm.raw.onKey(() => this.dispose()));
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("terminal.integrated.initialHint" /* TerminalInitialHintSettingId.Enabled */) &&
                !this._configurationService.getValue("terminal.integrated.initialHint" /* TerminalInitialHintSettingId.Enabled */)) {
                this.dispose();
            }
        }));
        const inputModel = commandDetectionCapability.promptInputModel;
        if (inputModel) {
            this._register(inputModel.onDidChangeInput(() => {
                if (inputModel.value) {
                    this.dispose();
                }
            }));
        }
        if (!this._decoration) {
            return;
        }
        this._register(this._decoration);
        this._register(this._decoration.onRender((e) => {
            if (!this._hintWidget &&
                this._xterm?.isFocused &&
                this._terminalGroupService.instances.length +
                    this._terminalEditorService.instances.length ===
                    1) {
                const terminalAgents = this._chatAgentService
                    .getActivatedAgents()
                    .filter((candidate) => candidate.locations.includes(ChatAgentLocation.Terminal));
                if (terminalAgents?.length) {
                    const widget = this._register(this._instantiationService.createInstance(TerminalInitialHintWidget, instance));
                    this._addon?.dispose();
                    this._hintWidget = widget.getDomNode(terminalAgents);
                    if (!this._hintWidget) {
                        return;
                    }
                    e.appendChild(this._hintWidget);
                    e.classList.add('terminal-initial-hint');
                    const font = this._xterm.getFont();
                    if (font) {
                        e.style.fontFamily = font.fontFamily;
                        e.style.fontSize = font.fontSize + 'px';
                    }
                }
            }
            if (this._hintWidget && this._xterm) {
                const decoration = this._hintWidget.parentElement;
                if (decoration) {
                    decoration.style.width =
                        ((this._xterm.raw.cols - this._xterm.raw.buffer.active.cursorX) /
                            this._xterm.raw.cols) *
                            100 +
                            '%';
                }
            }
        }));
    }
};
TerminalInitialHintContribution = TerminalInitialHintContribution_1 = __decorate([
    __param(1, IChatAgentService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, IStorageService),
    __param(5, ITerminalEditorService),
    __param(6, ITerminalGroupService)
], TerminalInitialHintContribution);
export { TerminalInitialHintContribution };
registerTerminalContribution(TerminalInitialHintContribution.ID, TerminalInitialHintContribution, false);
let TerminalInitialHintWidget = class TerminalInitialHintWidget extends Disposable {
    constructor(_instance, _chatAgentService, _commandService, _configurationService, _contextMenuService, _keybindingService, _productService, _storageService, _telemetryService, _terminalService) {
        super();
        this._instance = _instance;
        this._chatAgentService = _chatAgentService;
        this._commandService = _commandService;
        this._configurationService = _configurationService;
        this._contextMenuService = _contextMenuService;
        this._keybindingService = _keybindingService;
        this._productService = _productService;
        this._storageService = _storageService;
        this._telemetryService = _telemetryService;
        this._terminalService = _terminalService;
        this._toDispose = this._register(new DisposableStore());
        this._isVisible = false;
        this._ariaLabel = '';
        this._toDispose.add(_instance.onDidFocus(() => {
            if (this._instance.hasFocus &&
                this._isVisible &&
                this._ariaLabel &&
                this._configurationService.getValue("accessibility.verbosity.terminalChat" /* AccessibilityVerbositySettingId.TerminalChat */)) {
                status(this._ariaLabel);
            }
        }));
        this._toDispose.add(_terminalService.onDidChangeInstances(() => {
            if (this._terminalService.instances.length !== 1) {
                this.dispose();
            }
        }));
        this._toDispose.add(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("terminal.integrated.initialHint" /* TerminalInitialHintSettingId.Enabled */) &&
                !this._configurationService.getValue("terminal.integrated.initialHint" /* TerminalInitialHintSettingId.Enabled */)) {
                this.dispose();
            }
        }));
    }
    _getHintInlineChat(agents) {
        let providerName = (agents.length === 1 ? agents[0].fullName : undefined) ?? this._productService.nameShort;
        const defaultAgent = this._chatAgentService.getDefaultAgent(ChatAgentLocation.Panel);
        if (defaultAgent?.extensionId.value === agents[0].extensionId.value) {
            providerName = defaultAgent.fullName ?? providerName;
        }
        let ariaLabel = `Ask ${providerName} something or start typing to dismiss.`;
        const handleClick = () => {
            this._storageService.store("terminal.initialHint.hide" /* Constants.InitialHintHideStorageKey */, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            this._telemetryService.publicLog2('workbenchActionExecuted', {
                id: 'terminalInlineChat.hintAction',
                from: 'hint',
            });
            this._commandService.executeCommand("workbench.action.terminal.chat.start" /* TerminalChatCommandId.Start */, { from: 'hint' });
        };
        this._toDispose.add(this._commandService.onDidExecuteCommand((e) => {
            if (e.commandId === "workbench.action.terminal.chat.start" /* TerminalChatCommandId.Start */) {
                this._storageService.store("terminal.initialHint.hide" /* Constants.InitialHintHideStorageKey */, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                this.dispose();
            }
        }));
        const hintHandler = {
            disposables: this._toDispose,
            callback: (index, _event) => {
                switch (index) {
                    case '0':
                        handleClick();
                        break;
                }
            },
        };
        const hintElement = $('div.terminal-initial-hint');
        hintElement.style.display = 'block';
        const keybindingHint = this._keybindingService.lookupKeybinding("workbench.action.terminal.chat.start" /* TerminalChatCommandId.Start */);
        const keybindingHintLabel = keybindingHint?.getLabel();
        if (keybindingHint && keybindingHintLabel) {
            const actionPart = localize('emptyHintText', 'Press {0} to ask {1} to do something. ', keybindingHintLabel, providerName);
            const [before, after] = actionPart.split(keybindingHintLabel).map((fragment) => {
                const hintPart = $('a', undefined, fragment);
                this._toDispose.add(dom.addDisposableListener(hintPart, dom.EventType.CLICK, handleClick));
                return hintPart;
            });
            hintElement.appendChild(before);
            const label = hintHandler.disposables.add(new KeybindingLabel(hintElement, OS));
            label.set(keybindingHint);
            label.element.style.width = 'min-content';
            label.element.style.display = 'inline';
            label.element.style.cursor = 'pointer';
            this._toDispose.add(dom.addDisposableListener(label.element, dom.EventType.CLICK, handleClick));
            hintElement.appendChild(after);
            const typeToDismiss = localize('hintTextDismiss', 'Start typing to dismiss.');
            const textHint2 = $('span.detail', undefined, typeToDismiss);
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
        return { ariaLabel, hintHandler, hintElement };
    }
    getDomNode(agents) {
        if (!this._domNode) {
            this._domNode = $('.terminal-initial-hint');
            this._domNode.style.paddingLeft = '4px';
            const { hintElement, ariaLabel } = this._getHintInlineChat(agents);
            this._domNode.append(hintElement);
            this._ariaLabel = ariaLabel.concat(localize('disableHint', ' Toggle {0} in settings to disable this hint.', "accessibility.verbosity.terminalChat" /* AccessibilityVerbositySettingId.TerminalChat */));
            this._toDispose.add(dom.addDisposableListener(this._domNode, 'click', () => {
                this._domNode?.remove();
                this._domNode = undefined;
            }));
            this._toDispose.add(dom.addDisposableListener(this._domNode, dom.EventType.CONTEXT_MENU, (e) => {
                this._contextMenuService.showContextMenu({
                    getAnchor: () => {
                        return new StandardMouseEvent(dom.getActiveWindow(), e);
                    },
                    getActions: () => {
                        return [
                            {
                                id: 'workench.action.disableTerminalInitialHint',
                                label: localize('disableInitialHint', 'Disable Initial Hint'),
                                tooltip: localize('disableInitialHint', 'Disable Initial Hint'),
                                enabled: true,
                                class: undefined,
                                run: () => this._configurationService.updateValue("terminal.integrated.initialHint" /* TerminalInitialHintSettingId.Enabled */, false),
                            },
                        ];
                    },
                });
            }));
        }
        return this._domNode;
    }
    dispose() {
        this._domNode?.remove();
        super.dispose();
    }
};
TerminalInitialHintWidget = __decorate([
    __param(1, IChatAgentService),
    __param(2, ICommandService),
    __param(3, IConfigurationService),
    __param(4, IContextMenuService),
    __param(5, IKeybindingService),
    __param(6, IProductService),
    __param(7, IStorageService),
    __param(8, ITelemetryService),
    __param(9, ITerminalService)
], TerminalInitialHintWidget);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuaW5pdGlhbEhpbnQuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXQvYnJvd3Nlci90ZXJtaW5hbC5pbml0aWFsSGludC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUtBLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUVOLG1CQUFtQixHQUNuQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFLbkcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixpQkFBaUIsR0FDakIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1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