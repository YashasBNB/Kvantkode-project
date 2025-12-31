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
import './media/chatStatus.css';
import { safeIntl } from '../../../../base/common/date.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { language } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { IStatusbarService, ShowTooltipCommand, } from '../../../services/statusbar/browser/statusbar.js';
import { $, addDisposableListener, append, clearNode, EventHelper, EventType, } from '../../../../base/browser/dom.js';
import { ChatEntitlement, ChatSentiment, IChatEntitlementService, } from '../common/chatEntitlementService.js';
import { defaultButtonStyles, defaultCheckboxStyles, } from '../../../../platform/theme/browser/defaultStyles.js';
import { Checkbox } from '../../../../base/browser/ui/toggle/toggle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { contrastBorder, inputValidationErrorBorder, inputValidationInfoBorder, inputValidationWarningBorder, registerColor, transparent, } from '../../../../platform/theme/common/colorRegistry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { Color } from '../../../../base/common/color.js';
import { Gesture, EventType as TouchEventType } from '../../../../base/browser/touch.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import product from '../../../../platform/product/common/product.js';
import { isObject } from '../../../../base/common/types.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IChatStatusItemService } from './chatStatusItemService.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
const gaugeBackground = registerColor('gauge.background', {
    dark: inputValidationInfoBorder,
    light: inputValidationInfoBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('gaugeBackground', 'Gauge background color.'));
registerColor('gauge.foreground', {
    dark: transparent(gaugeBackground, 0.3),
    light: transparent(gaugeBackground, 0.3),
    hcDark: Color.white,
    hcLight: Color.white,
}, localize('gaugeForeground', 'Gauge foreground color.'));
registerColor('gauge.border', {
    dark: null,
    light: null,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('gaugeBorder', 'Gauge border color.'));
const gaugeWarningBackground = registerColor('gauge.warningBackground', {
    dark: inputValidationWarningBorder,
    light: inputValidationWarningBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('gaugeWarningBackground', 'Gauge warning background color.'));
registerColor('gauge.warningForeground', {
    dark: transparent(gaugeWarningBackground, 0.3),
    light: transparent(gaugeWarningBackground, 0.3),
    hcDark: Color.white,
    hcLight: Color.white,
}, localize('gaugeWarningForeground', 'Gauge warning foreground color.'));
const gaugeErrorBackground = registerColor('gauge.errorBackground', {
    dark: inputValidationErrorBorder,
    light: inputValidationErrorBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, localize('gaugeErrorBackground', 'Gauge error background color.'));
registerColor('gauge.errorForeground', {
    dark: transparent(gaugeErrorBackground, 0.3),
    light: transparent(gaugeErrorBackground, 0.3),
    hcDark: Color.white,
    hcLight: Color.white,
}, localize('gaugeErrorForeground', 'Gauge error foreground color.'));
//#endregion
const defaultChat = {
    extensionId: product.defaultChatAgent?.extensionId ?? '',
    completionsEnablementSetting: product.defaultChatAgent?.completionsEnablementSetting ?? '',
    nextEditSuggestionsSetting: product.defaultChatAgent?.nextEditSuggestionsSetting ?? '',
};
let ChatStatusBarEntry = class ChatStatusBarEntry extends Disposable {
    static { this.ID = 'workbench.contrib.chatStatusBarEntry'; }
    constructor(chatEntitlementService, instantiationService, statusbarService, editorService, configurationService) {
        super();
        this.chatEntitlementService = chatEntitlementService;
        this.instantiationService = instantiationService;
        this.statusbarService = statusbarService;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.entry = undefined;
        this.dashboard = new Lazy(() => this.instantiationService.createInstance(ChatStatusDashboard));
        this.activeCodeEditorListener = this._register(new MutableDisposable());
        this.create();
        this.registerListeners();
    }
    async create() {
        const hidden = this.chatEntitlementService.sentiment === ChatSentiment.Disabled;
        if (!hidden) {
            this.entry ||= this.statusbarService.addEntry(this.getEntryProps(), 'chat.statusBarEntry', 1 /* StatusbarAlignment.RIGHT */, {
                location: { id: 'status.editor.mode', priority: 100.1 },
                alignment: 1 /* StatusbarAlignment.RIGHT */,
            });
            // TODO@bpasero: remove this eventually
            const completionsStatusId = `${defaultChat.extensionId}.status`;
            this.statusbarService.updateEntryVisibility(completionsStatusId, false);
            this.statusbarService.overrideEntry(completionsStatusId, {
                name: localize('codeCompletionsStatus', 'Copilot Code Completions'),
                text: localize('codeCompletionsStatusText', '$(copilot) Completions'),
            });
        }
        else {
            this.entry?.dispose();
            this.entry = undefined;
        }
    }
    registerListeners() {
        this._register(this.chatEntitlementService.onDidChangeQuotaExceeded(() => this.entry?.update(this.getEntryProps())));
        this._register(this.chatEntitlementService.onDidChangeSentiment(() => this.entry?.update(this.getEntryProps())));
        this._register(this.chatEntitlementService.onDidChangeEntitlement(() => this.entry?.update(this.getEntryProps())));
        this._register(this.editorService.onDidActiveEditorChange(() => this.onDidActiveEditorChange()));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(defaultChat.completionsEnablementSetting)) {
                this.entry?.update(this.getEntryProps());
            }
        }));
    }
    onDidActiveEditorChange() {
        this.entry?.update(this.getEntryProps());
        this.activeCodeEditorListener.clear();
        // Listen to language changes in the active code editor
        const activeCodeEditor = getCodeEditor(this.editorService.activeTextEditorControl);
        if (activeCodeEditor) {
            this.activeCodeEditorListener.value = activeCodeEditor.onDidChangeModelLanguage(() => {
                this.entry?.update(this.getEntryProps());
            });
        }
    }
    getEntryProps() {
        let text = '$(copilot)';
        let ariaLabel = localize('chatStatus', 'Copilot Status');
        let kind;
        if (!isNewUser(this.chatEntitlementService)) {
            const { chatQuotaExceeded, completionsQuotaExceeded } = this.chatEntitlementService.quotas;
            // Signed out
            if (this.chatEntitlementService.entitlement === ChatEntitlement.Unknown) {
                const signedOutWarning = localize('notSignedIntoCopilot', 'Signed out');
                text = `$(copilot-not-connected) ${signedOutWarning}`;
                ariaLabel = signedOutWarning;
                kind = 'prominent';
            }
            // Quota Exceeded
            else if (chatQuotaExceeded || completionsQuotaExceeded) {
                let quotaWarning;
                if (chatQuotaExceeded && !completionsQuotaExceeded) {
                    quotaWarning = localize('chatQuotaExceededStatus', 'Chat limit reached');
                }
                else if (completionsQuotaExceeded && !chatQuotaExceeded) {
                    quotaWarning = localize('completionsQuotaExceededStatus', 'Completions limit reached');
                }
                else {
                    quotaWarning = localize('chatAndCompletionsQuotaExceededStatus', 'Limit reached');
                }
                text = `$(copilot-warning) ${quotaWarning}`;
                ariaLabel = quotaWarning;
                kind = 'prominent';
            }
            // Completions Disabled
            else if (this.editorService.activeTextEditorLanguageId &&
                !isCompletionsEnabled(this.configurationService, this.editorService.activeTextEditorLanguageId)) {
                text = `$(copilot-not-connected)`;
                ariaLabel = localize('completionsDisabledStatus', 'Code Completions Disabled');
            }
        }
        return {
            name: localize('chatStatus', 'Copilot Status'),
            text,
            ariaLabel,
            command: ShowTooltipCommand,
            showInAllWindows: true,
            kind,
            tooltip: { element: (token) => this.dashboard.value.show(token) },
        };
    }
    dispose() {
        super.dispose();
        this.entry?.dispose();
        this.entry = undefined;
    }
};
ChatStatusBarEntry = __decorate([
    __param(0, IChatEntitlementService),
    __param(1, IInstantiationService),
    __param(2, IStatusbarService),
    __param(3, IEditorService),
    __param(4, IConfigurationService)
], ChatStatusBarEntry);
export { ChatStatusBarEntry };
function isNewUser(chatEntitlementService) {
    return (chatEntitlementService.sentiment !== ChatSentiment.Installed || // copilot not installed
        chatEntitlementService.entitlement === ChatEntitlement.Available); // not yet signed up to copilot
}
function canUseCopilot(chatEntitlementService) {
    const newUser = isNewUser(chatEntitlementService);
    const signedOut = chatEntitlementService.entitlement === ChatEntitlement.Unknown;
    const allQuotaReached = chatEntitlementService.quotas.chatQuotaExceeded &&
        chatEntitlementService.quotas.completionsQuotaExceeded;
    return !newUser && !signedOut && !allQuotaReached;
}
function isCompletionsEnabled(configurationService, modeId = '*') {
    const result = configurationService.getValue(defaultChat.completionsEnablementSetting);
    if (!isObject(result)) {
        return false;
    }
    if (typeof result[modeId] !== 'undefined') {
        return Boolean(result[modeId]); // go with setting if explicitly defined
    }
    return Boolean(result['*']); // fallback to global setting otherwise
}
let ChatStatusDashboard = class ChatStatusDashboard extends Disposable {
    constructor(chatEntitlementService, chatStatusItemService, commandService, configurationService, editorService, hoverService, languageService, openerService, telemetryService, textResourceConfigurationService) {
        super();
        this.chatEntitlementService = chatEntitlementService;
        this.chatStatusItemService = chatStatusItemService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.hoverService = hoverService;
        this.languageService = languageService;
        this.openerService = openerService;
        this.telemetryService = telemetryService;
        this.textResourceConfigurationService = textResourceConfigurationService;
        this.element = $('div.chat-status-bar-entry-tooltip');
        this.dateFormatter = new Lazy(() => safeIntl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric' }));
        this.entryDisposables = this._register(new MutableDisposable());
    }
    show(token) {
        clearNode(this.element);
        const disposables = (this.entryDisposables.value = new DisposableStore());
        disposables.add(token.onCancellationRequested(() => disposables.dispose()));
        let needsSeparator = false;
        const addSeparator = (label) => {
            if (needsSeparator) {
                this.element.appendChild($('hr'));
                needsSeparator = false;
            }
            if (label) {
                this.element.appendChild($('div.header', undefined, label));
            }
            needsSeparator = true;
        };
        // Quota Indicator
        if (this.chatEntitlementService.entitlement === ChatEntitlement.Limited) {
            const { chatTotal, chatRemaining, completionsTotal, completionsRemaining, quotaResetDate, chatQuotaExceeded, completionsQuotaExceeded, } = this.chatEntitlementService.quotas;
            addSeparator(localize('usageTitle', 'Copilot Free Plan Usage'));
            const chatQuotaIndicator = this.createQuotaIndicator(this.element, chatTotal, chatRemaining, localize('chatsLabel', 'Chat messages'));
            const completionsQuotaIndicator = this.createQuotaIndicator(this.element, completionsTotal, completionsRemaining, localize('completionsLabel', 'Code completions'));
            this.element.appendChild($('div.description', undefined, localize('limitQuota', 'Limits will reset on {0}.', this.dateFormatter.value.format(quotaResetDate))));
            if (chatQuotaExceeded || completionsQuotaExceeded) {
                const upgradePlanButton = disposables.add(new Button(this.element, {
                    ...defaultButtonStyles,
                    secondary: canUseCopilot(this.chatEntitlementService) /* use secondary color when copilot can still be used */,
                }));
                upgradePlanButton.label = localize('upgradeToCopilotPro', 'Upgrade to Copilot Pro');
                disposables.add(upgradePlanButton.onDidClick(() => this.runCommandAndClose('workbench.action.chat.upgradePlan')));
            }
            ;
            (async () => {
                await this.chatEntitlementService.update(token);
                if (token.isCancellationRequested) {
                    return;
                }
                const { chatTotal, chatRemaining, completionsTotal, completionsRemaining } = this.chatEntitlementService.quotas;
                chatQuotaIndicator(chatTotal, chatRemaining);
                completionsQuotaIndicator(completionsTotal, completionsRemaining);
            })();
        }
        // Contributions
        {
            for (const item of this.chatStatusItemService.getEntries()) {
                addSeparator(undefined);
                const chatItemDisposables = disposables.add(new MutableDisposable());
                let rendered = this.renderContributedChatStatusItem(item);
                chatItemDisposables.value = rendered.disposables;
                this.element.appendChild(rendered.element);
                disposables.add(this.chatStatusItemService.onDidChange((e) => {
                    if (e.entry.id === item.id) {
                        const oldEl = rendered.element;
                        rendered = this.renderContributedChatStatusItem(e.entry);
                        chatItemDisposables.value = rendered.disposables;
                        oldEl.replaceWith(rendered.element);
                    }
                }));
            }
        }
        // Settings
        {
            addSeparator(localize('settingsTitle', 'Settings'));
            this.createSettings(this.element, disposables);
        }
        // New to Copilot / Signed out
        {
            const newUser = isNewUser(this.chatEntitlementService);
            const signedOut = this.chatEntitlementService.entitlement === ChatEntitlement.Unknown;
            if (newUser || signedOut) {
                addSeparator(undefined);
                this.element.appendChild($('div.description', undefined, newUser
                    ? localize('activateDescription', 'Set up Copilot to use AI features.')
                    : localize('signInDescription', 'Sign in to use Copilot AI features.')));
                const button = disposables.add(new Button(this.element, { ...defaultButtonStyles }));
                button.label = newUser
                    ? localize('activateCopilotButton', 'Set up Copilot')
                    : localize('signInToUseCopilotButton', 'Sign in to use Copilot');
                disposables.add(button.onDidClick(() => this.runCommandAndClose(newUser
                    ? 'workbench.action.chat.triggerSetup'
                    : () => this.chatEntitlementService.requests?.value.signIn())));
            }
        }
        return this.element;
    }
    renderContributedChatStatusItem(item) {
        const disposables = new DisposableStore();
        const entryEl = $('div.contribution');
        entryEl.appendChild($('div.header', undefined, item.label));
        const bodyEl = entryEl.appendChild($('div.body'));
        const descriptionEl = bodyEl.appendChild($('span.description'));
        this.renderTextPlus(descriptionEl, item.description, disposables);
        if (item.detail) {
            const itemElement = bodyEl.appendChild($('div.detail-item'));
            this.renderTextPlus(itemElement, item.detail, disposables);
        }
        return { element: entryEl, disposables };
    }
    renderTextPlus(target, text, store) {
        for (const node of parseLinkedText(text).nodes) {
            if (typeof node === 'string') {
                const parts = renderLabelWithIcons(node);
                target.append(...parts);
            }
            else {
                store.add(new Link(target, node, undefined, this.hoverService, this.openerService));
            }
        }
    }
    runCommandAndClose(commandOrFn) {
        if (typeof commandOrFn === 'function') {
            commandOrFn();
        }
        else {
            this.telemetryService.publicLog2('workbenchActionExecuted', { id: commandOrFn, from: 'chat-status' });
            this.commandService.executeCommand(commandOrFn);
        }
        this.hoverService.hideHover(true);
    }
    createQuotaIndicator(container, total, remaining, label) {
        const quotaText = $('span');
        const quotaBit = $('div.quota-bit');
        const quotaIndicator = container.appendChild($('div.quota-indicator', undefined, $('div.quota-label', undefined, $('span', undefined, label), quotaText), $('div.quota-bar', undefined, quotaBit)));
        const update = (total, remaining) => {
            quotaIndicator.classList.remove('error');
            quotaIndicator.classList.remove('warning');
            if (typeof total === 'number' && typeof remaining === 'number') {
                let usedPercentage = Math.round(((total - remaining) / total) * 100);
                if (total !== remaining && usedPercentage === 0) {
                    usedPercentage = 1; // indicate minimal usage as 1%
                }
                quotaText.textContent = localize('quotaDisplay', '{0}%', usedPercentage);
                quotaBit.style.width = `${usedPercentage}%`;
                if (usedPercentage >= 90) {
                    quotaIndicator.classList.add('error');
                }
                else if (usedPercentage >= 75) {
                    quotaIndicator.classList.add('warning');
                }
            }
        };
        update(total, remaining);
        return update;
    }
    createSettings(container, disposables) {
        const modeId = this.editorService.activeTextEditorLanguageId;
        const settings = container.appendChild($('div.settings'));
        // --- Code Completions
        {
            const globalSetting = append(settings, $('div.setting'));
            this.createCodeCompletionsSetting(globalSetting, localize('settings.codeCompletions', 'Code Completions (all files)'), '*', disposables);
            if (modeId) {
                const languageSetting = append(settings, $('div.setting'));
                this.createCodeCompletionsSetting(languageSetting, localize('settings.codeCompletionsLanguage', 'Code Completions ({0})', this.languageService.getLanguageName(modeId) ?? modeId), modeId, disposables);
            }
        }
        // --- Next Edit Suggestions
        {
            const setting = append(settings, $('div.setting'));
            this.createNextEditSuggestionsSetting(setting, localize('settings.nextEditSuggestions', 'Next Edit Suggestions'), modeId, this.getCompletionsSettingAccessor(modeId), disposables);
        }
        return settings;
    }
    createSetting(container, settingId, label, accessor, disposables) {
        const checkbox = disposables.add(new Checkbox(label, Boolean(accessor.readSetting()), defaultCheckboxStyles));
        container.appendChild(checkbox.domNode);
        const settingLabel = append(container, $('span.setting-label', undefined, label));
        disposables.add(Gesture.addTarget(settingLabel));
        [EventType.CLICK, TouchEventType.Tap].forEach((eventType) => {
            disposables.add(addDisposableListener(settingLabel, eventType, (e) => {
                if (checkbox?.enabled) {
                    EventHelper.stop(e, true);
                    checkbox.checked = !checkbox.checked;
                    accessor.writeSetting(checkbox.checked);
                    checkbox.focus();
                }
            }));
        });
        disposables.add(checkbox.onChange(() => {
            accessor.writeSetting(checkbox.checked);
        }));
        disposables.add(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(settingId)) {
                checkbox.checked = Boolean(accessor.readSetting());
            }
        }));
        if (!canUseCopilot(this.chatEntitlementService)) {
            container.classList.add('disabled');
            checkbox.disable();
        }
        return checkbox;
    }
    createCodeCompletionsSetting(container, label, modeId, disposables) {
        this.createSetting(container, defaultChat.completionsEnablementSetting, label, this.getCompletionsSettingAccessor(modeId), disposables);
    }
    getCompletionsSettingAccessor(modeId = '*') {
        const settingId = defaultChat.completionsEnablementSetting;
        return {
            readSetting: () => isCompletionsEnabled(this.configurationService, modeId),
            writeSetting: (value) => {
                let result = this.configurationService.getValue(settingId);
                if (!isObject(result)) {
                    result = Object.create(null);
                }
                return this.configurationService.updateValue(settingId, { ...result, [modeId]: value });
            },
        };
    }
    createNextEditSuggestionsSetting(container, label, modeId, completionsSettingAccessor, disposables) {
        const nesSettingId = defaultChat.nextEditSuggestionsSetting;
        const completionsSettingId = defaultChat.completionsEnablementSetting;
        const resource = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        const checkbox = this.createSetting(container, nesSettingId, label, {
            readSetting: () => this.textResourceConfigurationService.getValue(resource, nesSettingId),
            writeSetting: (value) => this.textResourceConfigurationService.updateValue(resource, nesSettingId, value),
        }, disposables);
        // enablement of NES depends on completions setting
        // so we have to update our checkbox state accordingly
        if (!completionsSettingAccessor.readSetting()) {
            container.classList.add('disabled');
            checkbox.disable();
        }
        disposables.add(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(completionsSettingId)) {
                if (completionsSettingAccessor.readSetting() &&
                    canUseCopilot(this.chatEntitlementService)) {
                    checkbox.enable();
                    container.classList.remove('disabled');
                }
                else {
                    checkbox.disable();
                    container.classList.add('disabled');
                }
            }
        }));
    }
};
ChatStatusDashboard = __decorate([
    __param(0, IChatEntitlementService),
    __param(1, IChatStatusItemService),
    __param(2, ICommandService),
    __param(3, IConfigurationService),
    __param(4, IEditorService),
    __param(5, IHoverService),
    __param(6, ILanguageService),
    __param(7, IOpenerService),
    __param(8, ITelemetryService),
    __param(9, ITextResourceConfigurationService)
], ChatStatusDashboard);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFN0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0U3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLGlCQUFpQixHQUNqQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUdOLGlCQUFpQixFQUNqQixrQkFBa0IsR0FHbEIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQ04sQ0FBQyxFQUNELHFCQUFxQixFQUNyQixNQUFNLEVBQ04sU0FBUyxFQUNULFdBQVcsRUFDWCxTQUFTLEdBQ1QsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQ04sZUFBZSxFQUVmLGFBQWEsRUFDYix1QkFBdUIsR0FDdkIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU1QyxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLHFCQUFxQixHQUNyQixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFDTixjQUFjLEVB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