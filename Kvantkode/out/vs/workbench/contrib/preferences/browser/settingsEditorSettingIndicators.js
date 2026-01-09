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
import * as DOM from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { SimpleIconLabel } from '../../../../base/browser/ui/iconLabel/simpleIconLabel.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { EXPERIMENTAL_INDICATOR_DESCRIPTION, POLICY_SETTING_TAG, PREVIEW_INDICATOR_DESCRIPTION, } from '../common/preferences.js';
import { IWorkbenchConfigurationService } from '../../../services/configuration/common/configuration.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
const $ = DOM.$;
/**
 * Contains a set of the sync-ignored settings
 * to keep the sync ignored indicator and the getIndicatorsLabelAriaLabel() function in sync.
 * SettingsTreeIndicatorsLabel#updateSyncIgnored provides the source of truth.
 */
let cachedSyncIgnoredSettingsSet = new Set();
/**
 * Contains a copy of the sync-ignored settings to determine when to update
 * cachedSyncIgnoredSettingsSet.
 */
let cachedSyncIgnoredSettings = [];
/**
 * Renders the indicators next to a setting, such as "Also Modified In".
 */
let SettingsTreeIndicatorsLabel = class SettingsTreeIndicatorsLabel {
    constructor(container, configurationService, hoverService, userDataSyncEnablementService, languageService, commandService) {
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.languageService = languageService;
        this.commandService = commandService;
        /** Indicators that each have their own square container at the top-right of the setting */
        this.isolatedIndicators = [];
        this.keybindingListeners = new DisposableStore();
        this.focusedIndex = 0;
        this.defaultHoverOptions = {
            trapFocus: true,
            position: {
                hoverPosition: 2 /* HoverPosition.BELOW */,
            },
            appearance: {
                showPointer: true,
                compact: false,
            },
        };
        this.indicatorsContainerElement = DOM.append(container, $('.setting-indicators-container'));
        this.indicatorsContainerElement.style.display = 'inline';
        this.previewIndicator = this.createPreviewIndicator();
        this.isolatedIndicators = [this.previewIndicator];
        this.workspaceTrustIndicator = this.createWorkspaceTrustIndicator();
        this.scopeOverridesIndicator = this.createScopeOverridesIndicator();
        this.syncIgnoredIndicator = this.createSyncIgnoredIndicator();
        this.defaultOverrideIndicator = this.createDefaultOverrideIndicator();
        this.parenthesizedIndicators = [
            this.workspaceTrustIndicator,
            this.scopeOverridesIndicator,
            this.syncIgnoredIndicator,
            this.defaultOverrideIndicator,
        ];
    }
    addHoverDisposables(disposables, element, showHover) {
        disposables.clear();
        const scheduler = disposables.add(new RunOnceScheduler(() => {
            const hover = showHover(false);
            if (hover) {
                disposables.add(hover);
            }
        }, this.configurationService.getValue('workbench.hover.delay')));
        disposables.add(DOM.addDisposableListener(element, DOM.EventType.MOUSE_OVER, () => {
            if (!scheduler.isScheduled()) {
                scheduler.schedule();
            }
        }));
        disposables.add(DOM.addDisposableListener(element, DOM.EventType.MOUSE_LEAVE, () => {
            scheduler.cancel();
        }));
        disposables.add(DOM.addDisposableListener(element, DOM.EventType.KEY_DOWN, (e) => {
            const evt = new StandardKeyboardEvent(e);
            if (evt.equals(10 /* KeyCode.Space */) || evt.equals(3 /* KeyCode.Enter */)) {
                const hover = showHover(true);
                if (hover) {
                    disposables.add(hover);
                }
                e.preventDefault();
            }
        }));
    }
    createWorkspaceTrustIndicator() {
        const disposables = new DisposableStore();
        const workspaceTrustElement = $('span.setting-indicator.setting-item-workspace-trust');
        const workspaceTrustLabel = disposables.add(new SimpleIconLabel(workspaceTrustElement));
        workspaceTrustLabel.text =
            '$(shield) ' + localize('workspaceUntrustedLabel', 'Requires workspace trust');
        const content = localize('trustLabel', 'The setting value can only be applied in a trusted workspace.');
        const showHover = (focus) => {
            return this.hoverService.showInstantHover({
                ...this.defaultHoverOptions,
                content,
                target: workspaceTrustElement,
                actions: [
                    {
                        label: localize('manageWorkspaceTrust', 'Manage Workspace Trust'),
                        commandId: 'workbench.trust.manage',
                        run: (target) => {
                            this.commandService.executeCommand('workbench.trust.manage');
                        },
                    },
                ],
            }, focus);
        };
        this.addHoverDisposables(disposables, workspaceTrustElement, showHover);
        return {
            element: workspaceTrustElement,
            label: workspaceTrustLabel,
            disposables,
        };
    }
    createScopeOverridesIndicator() {
        const disposables = new DisposableStore();
        // Don't add .setting-indicator class here, because it gets conditionally added later.
        const otherOverridesElement = $('span.setting-item-overrides');
        const otherOverridesLabel = disposables.add(new SimpleIconLabel(otherOverridesElement));
        return {
            element: otherOverridesElement,
            label: otherOverridesLabel,
            disposables,
        };
    }
    createSyncIgnoredIndicator() {
        const disposables = new DisposableStore();
        const syncIgnoredElement = $('span.setting-indicator.setting-item-ignored');
        const syncIgnoredLabel = disposables.add(new SimpleIconLabel(syncIgnoredElement));
        syncIgnoredLabel.text = localize('extensionSyncIgnoredLabel', 'Not synced');
        const syncIgnoredHoverContent = localize('syncIgnoredTitle', 'This setting is ignored during sync');
        const showHover = (focus) => {
            return this.hoverService.showInstantHover({
                ...this.defaultHoverOptions,
                content: syncIgnoredHoverContent,
                target: syncIgnoredElement,
            }, focus);
        };
        this.addHoverDisposables(disposables, syncIgnoredElement, showHover);
        return {
            element: syncIgnoredElement,
            label: syncIgnoredLabel,
            disposables,
        };
    }
    createDefaultOverrideIndicator() {
        const disposables = new DisposableStore();
        const defaultOverrideIndicator = $('span.setting-indicator.setting-item-default-overridden');
        const defaultOverrideLabel = disposables.add(new SimpleIconLabel(defaultOverrideIndicator));
        defaultOverrideLabel.text = localize('defaultOverriddenLabel', 'Default value changed');
        return {
            element: defaultOverrideIndicator,
            label: defaultOverrideLabel,
            disposables,
        };
    }
    createPreviewIndicator() {
        const disposables = new DisposableStore();
        const previewIndicator = $('span.setting-indicator.setting-item-preview');
        const previewLabel = disposables.add(new SimpleIconLabel(previewIndicator));
        return {
            element: previewIndicator,
            label: previewLabel,
            disposables,
        };
    }
    render() {
        this.indicatorsContainerElement.innerText = '';
        this.indicatorsContainerElement.style.display = 'none';
        const isolatedIndicatorsToShow = this.isolatedIndicators.filter((indicator) => {
            return indicator.element.style.display !== 'none';
        });
        if (isolatedIndicatorsToShow.length) {
            this.indicatorsContainerElement.style.display = 'inline';
            for (let i = 0; i < isolatedIndicatorsToShow.length; i++) {
                DOM.append(this.indicatorsContainerElement, isolatedIndicatorsToShow[i].element);
            }
        }
        const parenthesizedIndicatorsToShow = this.parenthesizedIndicators.filter((indicator) => {
            return indicator.element.style.display !== 'none';
        });
        if (parenthesizedIndicatorsToShow.length) {
            this.indicatorsContainerElement.style.display = 'inline';
            DOM.append(this.indicatorsContainerElement, $('span', undefined, '('));
            for (let i = 0; i < parenthesizedIndicatorsToShow.length - 1; i++) {
                DOM.append(this.indicatorsContainerElement, parenthesizedIndicatorsToShow[i].element);
                DOM.append(this.indicatorsContainerElement, $('span.comma', undefined, ' • '));
            }
            DOM.append(this.indicatorsContainerElement, parenthesizedIndicatorsToShow[parenthesizedIndicatorsToShow.length - 1].element);
            DOM.append(this.indicatorsContainerElement, $('span', undefined, ')'));
        }
        this.resetIndicatorNavigationKeyBindings([
            ...isolatedIndicatorsToShow,
            ...parenthesizedIndicatorsToShow,
        ]);
    }
    resetIndicatorNavigationKeyBindings(indicators) {
        this.keybindingListeners.clear();
        this.indicatorsContainerElement.role = indicators.length >= 1 ? 'toolbar' : 'button';
        if (!indicators.length) {
            return;
        }
        const firstElement = indicators[0].focusElement ?? indicators[0].element;
        firstElement.tabIndex = 0;
        this.keybindingListeners.add(DOM.addDisposableListener(this.indicatorsContainerElement, 'keydown', (e) => {
            const ev = new StandardKeyboardEvent(e);
            let handled = true;
            if (ev.equals(14 /* KeyCode.Home */)) {
                this.focusIndicatorAt(indicators, 0);
            }
            else if (ev.equals(13 /* KeyCode.End */)) {
                this.focusIndicatorAt(indicators, indicators.length - 1);
            }
            else if (ev.equals(17 /* KeyCode.RightArrow */)) {
                const indexToFocus = (this.focusedIndex + 1) % indicators.length;
                this.focusIndicatorAt(indicators, indexToFocus);
            }
            else if (ev.equals(15 /* KeyCode.LeftArrow */)) {
                const indexToFocus = this.focusedIndex ? this.focusedIndex - 1 : indicators.length - 1;
                this.focusIndicatorAt(indicators, indexToFocus);
            }
            else {
                handled = false;
            }
            if (handled) {
                e.preventDefault();
                e.stopPropagation();
            }
        }));
    }
    focusIndicatorAt(indicators, index) {
        if (index === this.focusedIndex) {
            return;
        }
        const indicator = indicators[index];
        const elementToFocus = indicator.focusElement ?? indicator.element;
        elementToFocus.tabIndex = 0;
        elementToFocus.focus();
        const currentlyFocusedIndicator = indicators[this.focusedIndex];
        const previousFocusedElement = currentlyFocusedIndicator.focusElement ?? currentlyFocusedIndicator.element;
        previousFocusedElement.tabIndex = -1;
        this.focusedIndex = index;
    }
    updateWorkspaceTrust(element) {
        this.workspaceTrustIndicator.element.style.display = element.isUntrusted ? 'inline' : 'none';
        this.render();
    }
    updateSyncIgnored(element, ignoredSettings) {
        this.syncIgnoredIndicator.element.style.display =
            this.userDataSyncEnablementService.isEnabled() &&
                ignoredSettings.includes(element.setting.key)
                ? 'inline'
                : 'none';
        this.render();
        if (cachedSyncIgnoredSettings !== ignoredSettings) {
            cachedSyncIgnoredSettings = ignoredSettings;
            cachedSyncIgnoredSettingsSet = new Set(cachedSyncIgnoredSettings);
        }
    }
    updatePreviewIndicator(element) {
        const isPreviewSetting = element.tags?.has('preview');
        const isExperimentalSetting = element.tags?.has('experimental');
        this.previewIndicator.element.style.display =
            isPreviewSetting || isExperimentalSetting ? 'inline' : 'none';
        this.previewIndicator.label.text = isPreviewSetting
            ? localize('previewLabel', 'Preview')
            : localize('experimentalLabel', 'Experimental');
        const content = isPreviewSetting
            ? PREVIEW_INDICATOR_DESCRIPTION
            : EXPERIMENTAL_INDICATOR_DESCRIPTION;
        const showHover = (focus) => {
            return this.hoverService.showInstantHover({
                ...this.defaultHoverOptions,
                content,
                target: this.previewIndicator.element,
            }, focus);
        };
        this.addHoverDisposables(this.previewIndicator.disposables, this.previewIndicator.element, showHover);
        this.render();
    }
    getInlineScopeDisplayText(completeScope) {
        const [scope, language] = completeScope.split(':');
        const localizedScope = scope === 'user'
            ? localize('user', 'User')
            : scope === 'workspace'
                ? localize('workspace', 'Workspace')
                : localize('remote', 'Remote');
        if (language) {
            return `${this.languageService.getLanguageName(language)} > ${localizedScope}`;
        }
        return localizedScope;
    }
    dispose() {
        this.keybindingListeners.dispose();
        for (const indicator of this.isolatedIndicators) {
            indicator.disposables.dispose();
        }
        for (const indicator of this.parenthesizedIndicators) {
            indicator.disposables.dispose();
        }
    }
    updateScopeOverrides(element, onDidClickOverrideElement, onApplyFilter) {
        this.scopeOverridesIndicator.disposables.clear();
        this.scopeOverridesIndicator.element.innerText = '';
        this.scopeOverridesIndicator.element.style.display = 'none';
        this.scopeOverridesIndicator.focusElement = this.scopeOverridesIndicator.element;
        if (element.hasPolicyValue) {
            // If the setting falls under a policy, then no matter what the user sets, the policy value takes effect.
            this.scopeOverridesIndicator.element.style.display = 'inline';
            this.scopeOverridesIndicator.element.classList.add('setting-indicator');
            this.scopeOverridesIndicator.label.text =
                '$(briefcase) ' + localize('policyLabelText', 'Managed by organization');
            const content = localize('policyDescription', 'This setting is managed by your organization and its actual value cannot be changed.');
            const showHover = (focus) => {
                return this.hoverService.showInstantHover({
                    ...this.defaultHoverOptions,
                    content,
                    actions: [
                        {
                            label: localize('policyFilterLink', 'View policy settings'),
                            commandId: '_settings.action.viewPolicySettings',
                            run: (_) => {
                                onApplyFilter.fire(`@${POLICY_SETTING_TAG}`);
                            },
                        },
                    ],
                    target: this.scopeOverridesIndicator.element,
                }, focus);
            };
            this.addHoverDisposables(this.scopeOverridesIndicator.disposables, this.scopeOverridesIndicator.element, showHover);
        }
        else if (element.settingsTarget === 3 /* ConfigurationTarget.USER_LOCAL */ &&
            this.configurationService.isSettingAppliedForAllProfiles(element.setting.key)) {
            this.scopeOverridesIndicator.element.style.display = 'inline';
            this.scopeOverridesIndicator.element.classList.add('setting-indicator');
            this.scopeOverridesIndicator.label.text = localize('applicationSetting', 'Applies to all profiles');
            const content = localize('applicationSettingDescription', 'The setting is not specific to the current profile, and will retain its value when switching profiles.');
            const showHover = (focus) => {
                return this.hoverService.showInstantHover({
                    ...this.defaultHoverOptions,
                    content,
                    target: this.scopeOverridesIndicator.element,
                }, focus);
            };
            this.addHoverDisposables(this.scopeOverridesIndicator.disposables, this.scopeOverridesIndicator.element, showHover);
        }
        else if (element.overriddenScopeList.length ||
            element.overriddenDefaultsLanguageList.length) {
            if (element.overriddenScopeList.length === 1 &&
                !element.overriddenDefaultsLanguageList.length) {
                // We can inline the override and show all the text in the label
                // so that users don't have to wait for the hover to load
                // just to click into the one override there is.
                this.scopeOverridesIndicator.element.style.display = 'inline';
                this.scopeOverridesIndicator.element.classList.remove('setting-indicator');
                const prefaceText = element.isConfigured
                    ? localize('alsoConfiguredIn', 'Also modified in')
                    : localize('configuredIn', 'Modified in');
                this.scopeOverridesIndicator.label.text = `${prefaceText} `;
                const overriddenScope = element.overriddenScopeList[0];
                const view = DOM.append(this.scopeOverridesIndicator.element, $('a.modified-scope', undefined, this.getInlineScopeDisplayText(overriddenScope)));
                view.tabIndex = -1;
                this.scopeOverridesIndicator.focusElement = view;
                const onClickOrKeydown = (e) => {
                    const [scope, language] = overriddenScope.split(':');
                    onDidClickOverrideElement.fire({
                        settingKey: element.setting.key,
                        scope: scope,
                        language,
                    });
                    e.preventDefault();
                    e.stopPropagation();
                };
                this.scopeOverridesIndicator.disposables.add(DOM.addDisposableListener(view, DOM.EventType.CLICK, (e) => {
                    onClickOrKeydown(e);
                }));
                this.scopeOverridesIndicator.disposables.add(DOM.addDisposableListener(view, DOM.EventType.KEY_DOWN, (e) => {
                    const ev = new StandardKeyboardEvent(e);
                    if (ev.equals(10 /* KeyCode.Space */) || ev.equals(3 /* KeyCode.Enter */)) {
                        onClickOrKeydown(e);
                    }
                }));
            }
            else {
                this.scopeOverridesIndicator.element.style.display = 'inline';
                this.scopeOverridesIndicator.element.classList.add('setting-indicator');
                const scopeOverridesLabelText = element.isConfigured
                    ? localize('alsoConfiguredElsewhere', 'Also modified elsewhere')
                    : localize('configuredElsewhere', 'Modified elsewhere');
                this.scopeOverridesIndicator.label.text = scopeOverridesLabelText;
                let contentMarkdownString = '';
                if (element.overriddenScopeList.length) {
                    const prefaceText = element.isConfigured
                        ? localize('alsoModifiedInScopes', 'The setting has also been modified in the following scopes:')
                        : localize('modifiedInScopes', 'The setting has been modified in the following scopes:');
                    contentMarkdownString = prefaceText;
                    for (const scope of element.overriddenScopeList) {
                        const scopeDisplayText = this.getInlineScopeDisplayText(scope);
                        contentMarkdownString += `\n- [${scopeDisplayText}](${encodeURIComponent(scope)} "${getAccessibleScopeDisplayText(scope, this.languageService)}")`;
                    }
                }
                if (element.overriddenDefaultsLanguageList.length) {
                    if (contentMarkdownString) {
                        contentMarkdownString += `\n\n`;
                    }
                    const prefaceText = localize('hasDefaultOverridesForLanguages', 'The following languages have default overrides:');
                    contentMarkdownString += prefaceText;
                    for (const language of element.overriddenDefaultsLanguageList) {
                        const scopeDisplayText = this.languageService.getLanguageName(language);
                        contentMarkdownString += `\n- [${scopeDisplayText}](${encodeURIComponent(`default:${language}`)} "${scopeDisplayText}")`;
                    }
                }
                const content = {
                    value: contentMarkdownString,
                    isTrusted: false,
                    supportHtml: false,
                };
                this.scopeOverridesIndicator.disposables.add(this.hoverService.setupDelayedHover(this.scopeOverridesIndicator.element, () => ({
                    ...this.defaultHoverOptions,
                    content,
                    linkHandler: (url) => {
                        const [scope, language] = decodeURIComponent(url).split(':');
                        onDidClickOverrideElement.fire({
                            settingKey: element.setting.key,
                            scope: scope,
                            language,
                        });
                    },
                }), { setupKeyboardEvents: true }));
            }
        }
        this.render();
    }
    updateDefaultOverrideIndicator(element) {
        this.defaultOverrideIndicator.element.style.display = 'none';
        let sourceToDisplay = getDefaultValueSourceToDisplay(element);
        if (sourceToDisplay !== undefined) {
            this.defaultOverrideIndicator.element.style.display = 'inline';
            this.defaultOverrideIndicator.disposables.clear();
            // Show source of default value when hovered
            if (Array.isArray(sourceToDisplay) && sourceToDisplay.length === 1) {
                sourceToDisplay = sourceToDisplay[0];
            }
            let defaultOverrideHoverContent;
            if (!Array.isArray(sourceToDisplay)) {
                defaultOverrideHoverContent = localize('defaultOverriddenDetails', 'Default setting value overridden by `{0}`', sourceToDisplay);
            }
            else {
                sourceToDisplay = sourceToDisplay.map((source) => `\`${source}\``);
                defaultOverrideHoverContent = localize('multipledefaultOverriddenDetails', 'A default values has been set by {0}', sourceToDisplay.slice(0, -1).join(', ') + ' & ' + sourceToDisplay.slice(-1));
            }
            const showHover = (focus) => {
                return this.hoverService.showInstantHover({
                    content: new MarkdownString().appendMarkdown(defaultOverrideHoverContent),
                    target: this.defaultOverrideIndicator.element,
                    position: {
                        hoverPosition: 2 /* HoverPosition.BELOW */,
                    },
                    appearance: {
                        showPointer: true,
                        compact: false,
                    },
                }, focus);
            };
            this.addHoverDisposables(this.defaultOverrideIndicator.disposables, this.defaultOverrideIndicator.element, showHover);
        }
        this.render();
    }
};
SettingsTreeIndicatorsLabel = __decorate([
    __param(1, IWorkbenchConfigurationService),
    __param(2, IHoverService),
    __param(3, IUserDataSyncEnablementService),
    __param(4, ILanguageService),
    __param(5, ICommandService)
], SettingsTreeIndicatorsLabel);
export { SettingsTreeIndicatorsLabel };
function getDefaultValueSourceToDisplay(element) {
    let sourceToDisplay;
    const defaultValueSource = element.defaultValueSource;
    if (defaultValueSource) {
        if (defaultValueSource instanceof Map) {
            sourceToDisplay = [];
            for (const [, value] of defaultValueSource) {
                const newValue = typeof value !== 'string' ? (value.displayName ?? value.id) : value;
                if (!sourceToDisplay.includes(newValue)) {
                    sourceToDisplay.push(newValue);
                }
            }
        }
        else if (typeof defaultValueSource === 'string') {
            sourceToDisplay = defaultValueSource;
        }
        else {
            sourceToDisplay = defaultValueSource.displayName ?? defaultValueSource.id;
        }
    }
    return sourceToDisplay;
}
function getAccessibleScopeDisplayText(completeScope, languageService) {
    const [scope, language] = completeScope.split(':');
    const localizedScope = scope === 'user'
        ? localize('user', 'User')
        : scope === 'workspace'
            ? localize('workspace', 'Workspace')
            : localize('remote', 'Remote');
    if (language) {
        return localize('modifiedInScopeForLanguage', 'The {0} scope for {1}', localizedScope, languageService.getLanguageName(language));
    }
    return localizedScope;
}
function getAccessibleScopeDisplayMidSentenceText(completeScope, languageService) {
    const [scope, language] = completeScope.split(':');
    const localizedScope = scope === 'user'
        ? localize('user', 'User')
        : scope === 'workspace'
            ? localize('workspace', 'Workspace')
            : localize('remote', 'Remote');
    if (language) {
        return localize('modifiedInScopeForLanguageMidSentence', 'the {0} scope for {1}', localizedScope.toLowerCase(), languageService.getLanguageName(language));
    }
    return localizedScope;
}
export function getIndicatorsLabelAriaLabel(element, configurationService, userDataProfilesService, languageService) {
    const ariaLabelSections = [];
    // Add preview or experimental indicator text
    if (element.tags?.has('preview')) {
        ariaLabelSections.push(localize('previewLabel', 'Preview'));
    }
    else if (element.tags?.has('experimental')) {
        ariaLabelSections.push(localize('experimentalLabel', 'Experimental'));
    }
    // Add workspace trust text
    if (element.isUntrusted) {
        ariaLabelSections.push(localize('workspaceUntrustedAriaLabel', 'Workspace untrusted; setting value not applied'));
    }
    if (element.hasPolicyValue) {
        ariaLabelSections.push(localize('policyDescriptionAccessible', 'Managed by organization policy; setting value not applied'));
    }
    else if (element.settingsTarget === 3 /* ConfigurationTarget.USER_LOCAL */ &&
        configurationService.isSettingAppliedForAllProfiles(element.setting.key)) {
        ariaLabelSections.push(localize('applicationSettingDescriptionAccessible', 'Setting value retained when switching profiles'));
    }
    else {
        // Add other overrides text
        const otherOverridesStart = element.isConfigured
            ? localize('alsoConfiguredIn', 'Also modified in')
            : localize('configuredIn', 'Modified in');
        const otherOverridesList = element.overriddenScopeList
            .map((scope) => getAccessibleScopeDisplayMidSentenceText(scope, languageService))
            .join(', ');
        if (element.overriddenScopeList.length) {
            ariaLabelSections.push(`${otherOverridesStart} ${otherOverridesList}`);
        }
    }
    // Add sync ignored text
    if (cachedSyncIgnoredSettingsSet.has(element.setting.key)) {
        ariaLabelSections.push(localize('syncIgnoredAriaLabel', 'Setting ignored during sync'));
    }
    // Add default override indicator text
    let sourceToDisplay = getDefaultValueSourceToDisplay(element);
    if (sourceToDisplay !== undefined) {
        if (Array.isArray(sourceToDisplay) && sourceToDisplay.length === 1) {
            sourceToDisplay = sourceToDisplay[0];
        }
        let overriddenDetailsText;
        if (!Array.isArray(sourceToDisplay)) {
            overriddenDetailsText = localize('defaultOverriddenDetailsAriaLabel', '{0} overrides the default value', sourceToDisplay);
        }
        else {
            overriddenDetailsText = localize('multipleDefaultOverriddenDetailsAriaLabel', '{0} override the default value', sourceToDisplay.slice(0, -1).join(', ') + ' & ' + sourceToDisplay.slice(-1));
        }
        ariaLabelSections.push(overriddenDetailsText);
    }
    // Add text about default values being overridden in other languages
    const otherLanguageOverridesList = element.overriddenDefaultsLanguageList
        .map((language) => languageService.getLanguageName(language))
        .join(', ');
    if (element.overriddenDefaultsLanguageList.length) {
        const otherLanguageOverridesText = localize('defaultOverriddenLanguagesList', 'Language-specific default values exist for {0}', otherLanguageOverridesList);
        ariaLabelSections.push(otherLanguageOverridesText);
    }
    const ariaLabel = ariaLabelSections.join('. ');
    return ariaLabel;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NFZGl0b3JTZXR0aW5nSW5kaWNhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9zZXR0aW5nc0VkaXRvclNldHRpbmdJbmRpY2F0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRW5FLE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFeEYsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFHbEYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFekcsT0FBTyxFQUNOLGtDQUFrQyxFQUNsQyxrQkFBa0IsRUFDbEIsNkJBQTZCLEdBQzdCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDeEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRzNFLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFxQmY7Ozs7R0FJRztBQUNILElBQUksNEJBQTRCLEdBQWdCLElBQUksR0FBRyxFQUFVLENBQUE7QUFFakU7OztHQUdHO0FBQ0gsSUFBSSx5QkFBeUIsR0FBYSxFQUFFLENBQUE7QUFFNUM7O0dBRUc7QUFDSSxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUEyQjtJQWlCdkMsWUFDQyxTQUFzQixFQUV0QixvQkFBcUUsRUFDdEQsWUFBNEMsRUFFM0QsNkJBQThFLEVBQzVELGVBQWtELEVBQ25ELGNBQWdEO1FBTGhELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBZ0M7UUFDckMsaUJBQVksR0FBWixZQUFZLENBQWU7UUFFMUMsa0NBQTZCLEdBQTdCLDZCQUE2QixDQUFnQztRQUMzQyxvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDbEMsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBaEJsRSwyRkFBMkY7UUFDMUUsdUJBQWtCLEdBQXVCLEVBQUUsQ0FBQTtRQUkzQyx3QkFBbUIsR0FBb0IsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUNyRSxpQkFBWSxHQUFHLENBQUMsQ0FBQTtRQThCaEIsd0JBQW1CLEdBQTJCO1lBQ3JELFNBQVMsRUFBRSxJQUFJO1lBQ2YsUUFBUSxFQUFFO2dCQUNULGFBQWEsNkJBQXFCO2FBQ2xDO1lBQ0QsVUFBVSxFQUFFO2dCQUNYLFdBQVcsRUFBRSxJQUFJO2dCQUNqQixPQUFPLEVBQUUsS0FBSzthQUNkO1NBQ0QsQ0FBQTtRQTNCQSxJQUFJLENBQUMsMEJBQTBCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQTtRQUMzRixJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUE7UUFFeEQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO1FBQ3JELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBRWpELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQTtRQUNuRSxJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixFQUFFLENBQUE7UUFDbkUsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFBO1FBQzdELElBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQTtRQUNyRSxJQUFJLENBQUMsdUJBQXVCLEdBQUc7WUFDOUIsSUFBSSxDQUFDLHVCQUF1QjtZQUM1QixJQUFJLENBQUMsdUJBQXVCO1lBQzVCLElBQUksQ0FBQyxvQkFBb0I7WUFDekIsSUFBSSxDQUFDLHdCQUF3QjtTQUM3QixDQUFBO0lBQ0YsQ0FBQztJQWFPLG1CQUFtQixDQUMxQixXQUE0QixFQUM1QixPQUFvQixFQUNwQixTQUF1RDtRQUV2RCxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDbkIsTUFBTSxTQUFTLEdBQXFCLFdBQVcsQ0FBQyxHQUFHLENBQ2xELElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQ3pCLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM5QixJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdkIsQ0FBQztRQUNGLENBQUMsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFTLHVCQUF1QixDQUFDLENBQUMsQ0FDdkUsQ0FBQTtRQUNELFdBQVcsQ0FBQyxHQUFHLENBQ2QsR0FBRyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7WUFDakUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO2dCQUM5QixTQUFTLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDckIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1lBQ2xFLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNuQixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FDZCxHQUFHLENBQUMscUJBQXFCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDaEUsTUFBTSxHQUFHLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN4QyxJQUFJLEdBQUcsQ0FBQyxNQUFNLHdCQUFlLElBQUksR0FBRyxDQUFDLE1BQU0sdUJBQWUsRUFBRSxDQUFDO2dCQUM1RCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzdCLElBQUksS0FBSyxFQUFFLENBQUM7b0JBQ1gsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDdkIsQ0FBQztnQkFDRCxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUE7WUFDbkIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8sNkJBQTZCO1FBQ3BDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDekMsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLENBQUMscURBQXFELENBQUMsQ0FBQTtRQUN0RixNQUFNLG1CQUFtQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFBO1FBQ3ZGLG1CQUFtQixDQUFDLElBQUk7WUFDdkIsWUFBWSxHQUFHLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBRS9FLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FDdkIsWUFBWSxFQUNaLCtEQUErRCxDQUMvRCxDQUFBO1FBQ0QsTUFBTSxTQUFTLEdBQUcsQ0FBQyxLQUFjLEVBQUUsRUFBRTtZQUNwQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQ3hDO2dCQUNDLEdBQUcsSUFBSSxDQUFDLG1CQUFtQjtnQkFDM0IsT0FBTztnQkFDUCxNQUFNLEVBQUUscUJBQXFCO2dCQUM3QixPQUFPLEVBQUU7b0JBQ1I7d0JBQ0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSx3QkFBd0IsQ0FBQzt3QkFDakUsU0FBUyxFQUFFLHdCQUF3Qjt3QkFDbkMsR0FBRyxFQUFFLENBQUMsTUFBbUIsRUFBRSxFQUFFOzRCQUM1QixJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO3dCQUM3RCxDQUFDO3FCQUNEO2lCQUNEO2FBQ0QsRUFDRCxLQUFLLENBQ0wsQ0FBQTtRQUNGLENBQUMsQ0FBQTtRQUNELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDdkUsT0FBTztZQUNOLE9BQU8sRUFBRSxxQkFBcUI7WUFDOUIsS0FBSyxFQUFFLG1CQUFtQjtZQUMxQixXQUFXO1NBQ1gsQ0FBQTtJQUNGLENBQUM7SUFFTyw2QkFBNkI7UUFDcEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxzRkFBc0Y7UUFDdEYsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQTtRQUM5RCxNQUFNLG1CQUFtQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFBO1FBQ3ZGLE9BQU87WUFDTixPQUFPLEVBQUUscUJBQXFCO1lBQzlCLEtBQUssRUFBRSxtQkFBbUI7WUFDMUIsV0FBVztTQUNYLENBQUE7SUFDRixDQUFDO0lBRU8sMEJBQTBCO1FBQ2pDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDekMsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLENBQUMsNkNBQTZDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLGdCQUFnQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLGdCQUFnQixDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFFM0UsTUFBTSx1QkFBdUIsR0FBRyxRQUFRLENBQ3ZDLGtCQUFrQixFQUNsQixxQ0FBcUMsQ0FDckMsQ0FBQTtRQUNELE1BQU0sU0FBUyxHQUFHLENBQUMsS0FBYyxFQUFFLEVBQUU7WUFDcEMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUN4QztnQkFDQyxHQUFHLElBQUksQ0FBQyxtQkFBbUI7Z0JBQzNCLE9BQU8sRUFBRSx1QkFBdUI7Z0JBQ2hDLE1BQU0sRUFBRSxrQkFBa0I7YUFDMUIsRUFDRCxLQUFLLENBQ0wsQ0FBQTtRQUNGLENBQUMsQ0FBQTtRQUNELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFcEUsT0FBTztZQUNOLE9BQU8sRUFBRSxrQkFBa0I7WUFDM0IsS0FBSyxFQUFFLGdCQUFnQjtZQUN2QixXQUFXO1NBQ1gsQ0FBQTtJQUNGLENBQUM7SUFFTyw4QkFBOEI7UUFDckMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLHdCQUF3QixHQUFHLENBQUMsQ0FBQyx3REFBd0QsQ0FBQyxDQUFBO1FBQzVGLE1BQU0sb0JBQW9CLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUE7UUFDM0Ysb0JBQW9CLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBRXZGLE9BQU87WUFDTixPQUFPLEVBQUUsd0JBQXdCO1lBQ2pDLEtBQUssRUFBRSxvQkFBb0I7WUFDM0IsV0FBVztTQUNYLENBQUE7SUFDRixDQUFDO0lBRU8sc0JBQXNCO1FBQzdCLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDekMsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsNkNBQTZDLENBQUMsQ0FBQTtRQUN6RSxNQUFNLFlBQVksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZUFBZSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQTtRQUUzRSxPQUFPO1lBQ04sT0FBTyxFQUFFLGdCQUFnQjtZQUN6QixLQUFLLEVBQUUsWUFBWTtZQUNuQixXQUFXO1NBQ1gsQ0FBQTtJQUNGLENBQUM7SUFFTyxNQUFNO1FBQ2IsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7UUFDOUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBRXRELE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsRUFBRSxFQUFFO1lBQzdFLE9BQU8sU0FBUyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxLQUFLLE1BQU0sQ0FBQTtRQUNsRCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksd0JBQXdCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFBO1lBQ3hELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDMUQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDakYsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLDZCQUE2QixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRTtZQUN2RixPQUFPLFNBQVMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sS0FBSyxNQUFNLENBQUE7UUFDbEQsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLDZCQUE2QixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQTtZQUN4RCxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3RFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyw2QkFBNkIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ25FLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNyRixHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO1lBQy9FLENBQUM7WUFDRCxHQUFHLENBQUMsTUFBTSxDQUNULElBQUksQ0FBQywwQkFBMEIsRUFDL0IsNkJBQTZCLENBQUMsNkJBQTZCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FDL0UsQ0FBQTtZQUNELEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDdkUsQ0FBQztRQUNELElBQUksQ0FBQyxtQ0FBbUMsQ0FBQztZQUN4QyxHQUFHLHdCQUF3QjtZQUMzQixHQUFHLDZCQUE2QjtTQUNoQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sbUNBQW1DLENBQUMsVUFBOEI7UUFDekUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2hDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFBO1FBQ3BGLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDeEIsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUE7UUFDeEUsWUFBWSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUE7UUFDekIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FDM0IsR0FBRyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMzRSxNQUFNLEVBQUUsR0FBRyxJQUFJLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQTtZQUNsQixJQUFJLEVBQUUsQ0FBQyxNQUFNLHVCQUFjLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNyQyxDQUFDO2lCQUFNLElBQUksRUFBRSxDQUFDLE1BQU0sc0JBQWEsRUFBRSxDQUFDO2dCQUNuQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDekQsQ0FBQztpQkFBTSxJQUFJLEVBQUUsQ0FBQyxNQUFNLDZCQUFvQixFQUFFLENBQUM7Z0JBQzFDLE1BQU0sWUFBWSxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFBO2dCQUNoRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ2hELENBQUM7aUJBQU0sSUFBSSxFQUFFLENBQUMsTUFBTSw0QkFBbUIsRUFBRSxDQUFDO2dCQUN6QyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7Z0JBQ3RGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFDaEQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sR0FBRyxLQUFLLENBQUE7WUFDaEIsQ0FBQztZQUVELElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFBO2dCQUNsQixDQUFDLENBQUMsZUFBZSxFQUFFLENBQUE7WUFDcEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8sZ0JBQWdCLENBQUMsVUFBOEIsRUFBRSxLQUFhO1FBQ3JFLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNqQyxPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNuQyxNQUFNLGNBQWMsR0FBRyxTQUFTLENBQUMsWUFBWSxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUE7UUFDbEUsY0FBYyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUE7UUFDM0IsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRXRCLE1BQU0seUJBQXlCLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUMvRCxNQUFNLHNCQUFzQixHQUMzQix5QkFBeUIsQ0FBQyxZQUFZLElBQUkseUJBQXlCLENBQUMsT0FBTyxDQUFBO1FBQzVFLHNCQUFzQixDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUVwQyxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQTtJQUMxQixDQUFDO0lBRUQsb0JBQW9CLENBQUMsT0FBbUM7UUFDdkQsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1FBQzVGLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUNkLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxPQUFtQyxFQUFFLGVBQXlCO1FBQy9FLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU87WUFDOUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFNBQVMsRUFBRTtnQkFDOUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztnQkFDNUMsQ0FBQyxDQUFDLFFBQVE7Z0JBQ1YsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUNWLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNiLElBQUkseUJBQXlCLEtBQUssZUFBZSxFQUFFLENBQUM7WUFDbkQseUJBQXlCLEdBQUcsZUFBZSxDQUFBO1lBQzNDLDRCQUE0QixHQUFHLElBQUksR0FBRyxDQUFTLHlCQUF5QixDQUFDLENBQUE7UUFDMUUsQ0FBQztJQUNGLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxPQUFtQztRQUN6RCxNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0scUJBQXFCLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDL0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTztZQUMxQyxnQkFBZ0IsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFDOUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsZ0JBQWdCO1lBQ2xELENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQztZQUNyQyxDQUFDLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRWhELE1BQU0sT0FBTyxHQUFHLGdCQUFnQjtZQUMvQixDQUFDLENBQUMsNkJBQTZCO1lBQy9CLENBQUMsQ0FBQyxrQ0FBa0MsQ0FBQTtRQUNyQyxNQUFNLFNBQVMsR0FBRyxDQUFDLEtBQWMsRUFBRSxFQUFFO1lBQ3BDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FDeEM7Z0JBQ0MsR0FBRyxJQUFJLENBQUMsbUJBQW1CO2dCQUMzQixPQUFPO2dCQUNQLE1BQU0sRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTzthQUNyQyxFQUNELEtBQUssQ0FDTCxDQUFBO1FBQ0YsQ0FBQyxDQUFBO1FBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUN2QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUNqQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUM3QixTQUFTLENBQ1QsQ0FBQTtRQUVELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUNkLENBQUM7SUFFTyx5QkFBeUIsQ0FBQyxhQUFxQjtRQUN0RCxNQUFNLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDbEQsTUFBTSxjQUFjLEdBQ25CLEtBQUssS0FBSyxNQUFNO1lBQ2YsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO1lBQzFCLENBQUMsQ0FBQyxLQUFLLEtBQUssV0FBVztnQkFDdEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDO2dCQUNwQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNqQyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxNQUFNLGNBQWMsRUFBRSxDQUFBO1FBQy9FLENBQUM7UUFDRCxPQUFPLGNBQWMsQ0FBQTtJQUN0QixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNsQyxLQUFLLE1BQU0sU0FBUyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ2pELFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDaEMsQ0FBQztRQUNELEtBQUssTUFBTSxTQUFTLElBQUksSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDdEQsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNoQyxDQUFDO0lBQ0YsQ0FBQztJQUVELG9CQUFvQixDQUNuQixPQUFtQyxFQUNuQyx5QkFBOEQsRUFDOUQsYUFBOEI7UUFFOUIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNoRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7UUFDbkQsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUMzRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUE7UUFDaEYsSUFBSSxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDNUIseUdBQXlHO1lBQ3pHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUE7WUFDN0QsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUE7WUFFdkUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxJQUFJO2dCQUN0QyxlQUFlLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixFQUFFLHlCQUF5QixDQUFDLENBQUE7WUFDekUsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUN2QixtQkFBbUIsRUFDbkIsc0ZBQXNGLENBQ3RGLENBQUE7WUFDRCxNQUFNLFNBQVMsR0FBRyxDQUFDLEtBQWMsRUFBRSxFQUFFO2dCQUNwQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQ3hDO29CQUNDLEdBQUcsSUFBSSxDQUFDLG1CQUFtQjtvQkFDM0IsT0FBTztvQkFDUCxPQUFPLEVBQUU7d0JBQ1I7NEJBQ0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxzQkFBc0IsQ0FBQzs0QkFDM0QsU0FBUyxFQUFFLHFDQUFxQzs0QkFDaEQsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0NBQ1YsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLGtCQUFrQixFQUFFLENBQUMsQ0FBQTs0QkFDN0MsQ0FBQzt5QkFDRDtxQkFDRDtvQkFDRCxNQUFNLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU87aUJBQzVDLEVBQ0QsS0FBSyxDQUNMLENBQUE7WUFDRixDQUFDLENBQUE7WUFDRCxJQUFJLENBQUMsbUJBQW1CLENBQ3ZCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLEVBQ3hDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLEVBQ3BDLFNBQVMsQ0FDVCxDQUFBO1FBQ0YsQ0FBQzthQUFNLElBQ04sT0FBTyxDQUFDLGNBQWMsMkNBQW1DO1lBQ3pELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyw4QkFBOEIsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUM1RSxDQUFDO1lBQ0YsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQTtZQUM3RCxJQUFJLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtZQUV2RSxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxRQUFRLENBQ2pELG9CQUFvQixFQUNwQix5QkFBeUIsQ0FDekIsQ0FBQTtZQUVELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FDdkIsK0JBQStCLEVBQy9CLHdHQUF3RyxDQUN4RyxDQUFBO1lBQ0QsTUFBTSxTQUFTLEdBQUcsQ0FBQyxLQUFjLEVBQUUsRUFBRTtnQkFDcEMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUN4QztvQkFDQyxHQUFHLElBQUksQ0FBQyxtQkFBbUI7b0JBQzNCLE9BQU87b0JBQ1AsTUFBTSxFQUFFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPO2lCQUM1QyxFQUNELEtBQUssQ0FDTCxDQUFBO1lBQ0YsQ0FBQyxDQUFBO1lBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUN2QixJQUFJLENBQUMsdUJBQXVCLENBQUMsV0FBVyxFQUN4QyxJQUFJLENBQUMsdUJBQXVCLENBQUMsT0FBTyxFQUNwQyxTQUFTLENBQ1QsQ0FBQTtRQUNGLENBQUM7YUFBTSxJQUNOLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNO1lBQ2xDLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLEVBQzVDLENBQUM7WUFDRixJQUNDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEtBQUssQ0FBQztnQkFDeEMsQ0FBQyxPQUFPLENBQUMsOEJBQThCLENBQUMsTUFBTSxFQUM3QyxDQUFDO2dCQUNGLGdFQUFnRTtnQkFDaEUseURBQXlEO2dCQUN6RCxnREFBZ0Q7Z0JBQ2hELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUE7Z0JBQzdELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO2dCQUUxRSxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsWUFBWTtvQkFDdkMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxrQkFBa0IsQ0FBQztvQkFDbEQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLENBQUE7Z0JBQzFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLEdBQUcsV0FBVyxHQUFHLENBQUE7Z0JBRTNELE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDdEQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FDdEIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sRUFDcEMsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMseUJBQXlCLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FDakYsQ0FBQTtnQkFDRCxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUNsQixJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQTtnQkFDaEQsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQVUsRUFBRSxFQUFFO29CQUN2QyxNQUFNLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBQ3BELHlCQUF5QixDQUFDLElBQUksQ0FBQzt3QkFDOUIsVUFBVSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRzt3QkFDL0IsS0FBSyxFQUFFLEtBQW9CO3dCQUMzQixRQUFRO3FCQUNSLENBQUMsQ0FBQTtvQkFDRixDQUFDLENBQUMsY0FBYyxFQUFFLENBQUE7b0JBQ2xCLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtnQkFDcEIsQ0FBQyxDQUFBO2dCQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUMzQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQzFELGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNwQixDQUFDLENBQUMsQ0FDRixDQUFBO2dCQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUMzQyxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQzdELE1BQU0sRUFBRSxHQUFHLElBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ3ZDLElBQUksRUFBRSxDQUFDLE1BQU0sd0JBQWUsSUFBSSxFQUFFLENBQUMsTUFBTSx1QkFBZSxFQUFFLENBQUM7d0JBQzFELGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUNwQixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQTtnQkFDN0QsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUE7Z0JBQ3ZFLE1BQU0sdUJBQXVCLEdBQUcsT0FBTyxDQUFDLFlBQVk7b0JBQ25ELENBQUMsQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUseUJBQXlCLENBQUM7b0JBQ2hFLENBQUMsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtnQkFDeEQsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsdUJBQXVCLENBQUE7Z0JBRWpFLElBQUkscUJBQXFCLEdBQUcsRUFBRSxDQUFBO2dCQUM5QixJQUFJLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDeEMsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLFlBQVk7d0JBQ3ZDLENBQUMsQ0FBQyxRQUFRLENBQ1Isc0JBQXNCLEVBQ3RCLDZEQUE2RCxDQUM3RDt3QkFDRixDQUFDLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHdEQUF3RCxDQUFDLENBQUE7b0JBQ3pGLHFCQUFxQixHQUFHLFdBQVcsQ0FBQTtvQkFDbkMsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLENBQUMsbUJBQW1CLEVBQUUsQ0FBQzt3QkFDakQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDLENBQUE7d0JBQzlELHFCQUFxQixJQUFJLFFBQVEsZ0JBQWdCLEtBQUssa0JBQWtCLENBQUMsS0FBSyxDQUFDLEtBQUssNkJBQTZCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFBO29CQUNuSixDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsSUFBSSxPQUFPLENBQUMsOEJBQThCLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ25ELElBQUkscUJBQXFCLEVBQUUsQ0FBQzt3QkFDM0IscUJBQXFCLElBQUksTUFBTSxDQUFBO29CQUNoQyxDQUFDO29CQUNELE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FDM0IsaUNBQWlDLEVBQ2pDLGlEQUFpRCxDQUNqRCxDQUFBO29CQUNELHFCQUFxQixJQUFJLFdBQVcsQ0FBQTtvQkFDcEMsS0FBSyxNQUFNLFFBQVEsSUFBSSxPQUFPLENBQUMsOEJBQThCLEVBQUUsQ0FBQzt3QkFDL0QsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQTt3QkFDdkUscUJBQXFCLElBQUksUUFBUSxnQkFBZ0IsS0FBSyxrQkFBa0IsQ0FBQyxXQUFXLFFBQVEsRUFBRSxDQUFDLEtBQUssZ0JBQWdCLElBQUksQ0FBQTtvQkFDekgsQ0FBQztnQkFDRixDQUFDO2dCQUNELE1BQU0sT0FBTyxHQUFvQjtvQkFDaEMsS0FBSyxFQUFFLHFCQUFxQjtvQkFDNUIsU0FBUyxFQUFFLEtBQUs7b0JBQ2hCLFdBQVcsRUFBRSxLQUFLO2lCQUNsQixDQUFBO2dCQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUMzQyxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUNsQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsT0FBTyxFQUNwQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO29CQUNOLEdBQUcsSUFBSSxDQUFDLG1CQUFtQjtvQkFDM0IsT0FBTztvQkFDUCxXQUFXLEVBQUUsQ0FBQyxHQUFXLEVBQUUsRUFBRTt3QkFDNUIsTUFBTSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7d0JBQzVELHlCQUF5QixDQUFDLElBQUksQ0FBQzs0QkFDOUIsVUFBVSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRzs0QkFDL0IsS0FBSyxFQUFFLEtBQW9COzRCQUMzQixRQUFRO3lCQUNSLENBQUMsQ0FBQTtvQkFDSCxDQUFDO2lCQUNELENBQUMsRUFDRixFQUFFLG1CQUFtQixFQUFFLElBQUksRUFBRSxDQUM3QixDQUNELENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUNkLENBQUM7SUFFRCw4QkFBOEIsQ0FBQyxPQUFtQztRQUNqRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQzVELElBQUksZUFBZSxHQUFHLDhCQUE4QixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzdELElBQUksZUFBZSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUE7WUFDOUQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUVqRCw0Q0FBNEM7WUFDNUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLGVBQWUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3BFLGVBQWUsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDckMsQ0FBQztZQUVELElBQUksMkJBQTJCLENBQUE7WUFDL0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztnQkFDckMsMkJBQTJCLEdBQUcsUUFBUSxDQUNyQywwQkFBMEIsRUFDMUIsMkNBQTJDLEVBQzNDLGVBQWUsQ0FDZixDQUFBO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGVBQWUsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxLQUFLLE1BQU0sSUFBSSxDQUFDLENBQUE7Z0JBQ2xFLDJCQUEyQixHQUFHLFFBQVEsQ0FDckMsa0NBQWtDLEVBQ2xDLHNDQUFzQyxFQUN0QyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUMzRSxDQUFBO1lBQ0YsQ0FBQztZQUVELE1BQU0sU0FBUyxHQUFHLENBQUMsS0FBYyxFQUFFLEVBQUU7Z0JBQ3BDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FDeEM7b0JBQ0MsT0FBTyxFQUFFLElBQUksY0FBYyxFQUFFLENBQUMsY0FBYyxDQUFDLDJCQUEyQixDQUFDO29CQUN6RSxNQUFNLEVBQUUsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU87b0JBQzdDLFFBQVEsRUFBRTt3QkFDVCxhQUFhLDZCQUFxQjtxQkFDbEM7b0JBQ0QsVUFBVSxFQUFFO3dCQUNYLFdBQVcsRUFBRSxJQUFJO3dCQUNqQixPQUFPLEVBQUUsS0FBSztxQkFDZDtpQkFDRCxFQUNELEtBQUssQ0FDTCxDQUFBO1lBQ0YsQ0FBQyxDQUFBO1lBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUN2QixJQUFJLENBQUMsd0JBQXdCLENBQUMsV0FBVyxFQUN6QyxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxFQUNyQyxTQUFTLENBQ1QsQ0FBQTtRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDZCxDQUFDO0NBQ0QsQ0FBQTtBQXhsQlksMkJBQTJCO0lBbUJyQyxXQUFBLDhCQUE4QixDQUFBO0lBRTlCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSw4QkFBOEIsQ0FBQTtJQUU5QixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsZUFBZSxDQUFBO0dBekJMLDJCQUEyQixDQXdsQnZDOztBQUVELFNBQVMsOEJBQThCLENBQ3RDLE9BQW1DO0lBRW5DLElBQUksZUFBOEMsQ0FBQTtJQUNsRCxNQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQTtJQUNyRCxJQUFJLGtCQUFrQixFQUFFLENBQUM7UUFDeEIsSUFBSSxrQkFBa0IsWUFBWSxHQUFHLEVBQUUsQ0FBQztZQUN2QyxlQUFlLEdBQUcsRUFBRSxDQUFBO1lBQ3BCLEtBQUssTUFBTSxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksa0JBQWtCLEVBQUUsQ0FBQztnQkFDNUMsTUFBTSxRQUFRLEdBQUcsT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7Z0JBQ3BGLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7b0JBQ3pDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQy9CLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQzthQUFNLElBQUksT0FBTyxrQkFBa0IsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNuRCxlQUFlLEdBQUcsa0JBQWtCLENBQUE7UUFDckMsQ0FBQzthQUFNLENBQUM7WUFDUCxlQUFlLEdBQUcsa0JBQWtCLENBQUMsV0FBVyxJQUFJLGtCQUFrQixDQUFDLEVBQUUsQ0FBQTtRQUMxRSxDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sZUFBZSxDQUFBO0FBQ3ZCLENBQUM7QUFFRCxTQUFTLDZCQUE2QixDQUNyQyxhQUFxQixFQUNyQixlQUFpQztJQUVqQyxNQUFNLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDbEQsTUFBTSxjQUFjLEdBQ25CLEtBQUssS0FBSyxNQUFNO1FBQ2YsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO1FBQzFCLENBQUMsQ0FBQyxLQUFLLEtBQUssV0FBVztZQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUM7WUFDcEMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDakMsSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUNkLE9BQU8sUUFBUSxDQUNkLDRCQUE0QixFQUM1Qix1QkFBdUIsRUFDdkIsY0FBYyxFQUNkLGVBQWUsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQ3pDLENBQUE7SUFDRixDQUFDO0lBQ0QsT0FBTyxjQUFjLENBQUE7QUFDdEIsQ0FBQztBQUVELFNBQVMsd0NBQXdDLENBQ2hELGFBQXFCLEVBQ3JCLGVBQWlDO0lBRWpDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNsRCxNQUFNLGNBQWMsR0FDbkIsS0FBSyxLQUFLLE1BQU07UUFDZixDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7UUFDMUIsQ0FBQyxDQUFDLEtBQUssS0FBSyxXQUFXO1lBQ3RCLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQztZQUNwQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNqQyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2QsT0FBTyxRQUFRLENBQ2QsdUNBQXVDLEVBQ3ZDLHVCQUF1QixFQUN2QixjQUFjLENBQUMsV0FBVyxFQUFFLEVBQzVCLGVBQWUsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQ3pDLENBQUE7SUFDRixDQUFDO0lBQ0QsT0FBTyxjQUFjLENBQUE7QUFDdEIsQ0FBQztBQUVELE1BQU0sVUFBVSwyQkFBMkIsQ0FDMUMsT0FBbUMsRUFDbkMsb0JBQW9ELEVBQ3BELHVCQUFpRCxFQUNqRCxlQUFpQztJQUVqQyxNQUFNLGlCQUFpQixHQUFhLEVBQUUsQ0FBQTtJQUV0Qyw2Q0FBNkM7SUFDN0MsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1FBQ2xDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUE7SUFDNUQsQ0FBQztTQUFNLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztRQUM5QyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUE7SUFDdEUsQ0FBQztJQUVELDJCQUEyQjtJQUMzQixJQUFJLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUN6QixpQkFBaUIsQ0FBQyxJQUFJLENBQ3JCLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxnREFBZ0QsQ0FBQyxDQUN6RixDQUFBO0lBQ0YsQ0FBQztJQUVELElBQUksT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzVCLGlCQUFpQixDQUFDLElBQUksQ0FDckIsUUFBUSxDQUNQLDZCQUE2QixFQUM3QiwyREFBMkQsQ0FDM0QsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztTQUFNLElBQ04sT0FBTyxDQUFDLGNBQWMsMkNBQW1DO1FBQ3pELG9CQUFvQixDQUFDLDhCQUE4QixDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQ3ZFLENBQUM7UUFDRixpQkFBaUIsQ0FBQyxJQUFJLENBQ3JCLFFBQVEsQ0FDUCx5Q0FBeUMsRUFDekMsZ0RBQWdELENBQ2hELENBQ0QsQ0FBQTtJQUNGLENBQUM7U0FBTSxDQUFDO1FBQ1AsMkJBQTJCO1FBQzNCLE1BQU0sbUJBQW1CLEdBQUcsT0FBTyxDQUFDLFlBQVk7WUFDL0MsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxrQkFBa0IsQ0FBQztZQUNsRCxDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUMxQyxNQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxtQkFBbUI7YUFDcEQsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyx3Q0FBd0MsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUM7YUFDaEYsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ1osSUFBSSxPQUFPLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDeEMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEdBQUcsbUJBQW1CLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZFLENBQUM7SUFDRixDQUFDO0lBRUQsd0JBQXdCO0lBQ3hCLElBQUksNEJBQTRCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUMzRCxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLDZCQUE2QixDQUFDLENBQUMsQ0FBQTtJQUN4RixDQUFDO0lBRUQsc0NBQXNDO0lBQ3RDLElBQUksZUFBZSxHQUFHLDhCQUE4QixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzdELElBQUksZUFBZSxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ25DLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxlQUFlLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BFLGVBQWUsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckMsQ0FBQztRQUVELElBQUkscUJBQXFCLENBQUE7UUFDekIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztZQUNyQyxxQkFBcUIsR0FBRyxRQUFRLENBQy9CLG1DQUFtQyxFQUNuQyxpQ0FBaUMsRUFDakMsZUFBZSxDQUNmLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLHFCQUFxQixHQUFHLFFBQVEsQ0FDL0IsMkNBQTJDLEVBQzNDLGdDQUFnQyxFQUNoQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUMzRSxDQUFBO1FBQ0YsQ0FBQztRQUNELGlCQUFpQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFRCxvRUFBb0U7SUFDcEUsTUFBTSwwQkFBMEIsR0FBRyxPQUFPLENBQUMsOEJBQThCO1NBQ3ZFLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUM1RCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDWixJQUFJLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNuRCxNQUFNLDBCQUEwQixHQUFHLFFBQVEsQ0FDMUMsZ0NBQWdDLEVBQ2hDLGdEQUFnRCxFQUNoRCwwQkFBMEIsQ0FDMUIsQ0FBQTtRQUNELGlCQUFpQixDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO0lBQ25ELENBQUM7SUFFRCxNQUFNLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDOUMsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQyJ9