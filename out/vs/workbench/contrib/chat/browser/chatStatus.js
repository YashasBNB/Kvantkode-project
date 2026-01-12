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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFN0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRTdGF0dXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsaUJBQWlCLEdBQ2pCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBR04saUJBQWlCLEVBQ2pCLGtCQUFrQixHQUdsQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFDTixDQUFDLEVBQ0QscUJBQXFCLEVBQ3JCLE1BQU0sRUFDTixTQUFTLEVBQ1QsV0FBVyxFQUNYLFNBQVMsR0FDVCxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFDTixlQUFlLEVBRWYsYUFBYSxFQUNiLHVCQUF1QixHQUN2QixNQUFNLHFDQUFxQyxDQUFBO0FBRTVDLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIscUJBQXFCLEdBQ3JCLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUNOLGNB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