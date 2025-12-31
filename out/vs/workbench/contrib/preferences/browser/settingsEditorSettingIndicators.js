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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NFZGl0b3JTZXR0aW5nSW5kaWNhdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIvc2V0dGluZ3NFZGl0b3JTZXR0aW5nSW5kaWNhdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRWpGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVuRSxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXhGLE9BQU8sRUFBZSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBR2xGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRXpHLE9BQU8sRUFDTixrQ0FBa0MsRUFDbEMsa0JBQWtCLEVBQ2xCLDZCQUE2QixHQUM3QixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUczRSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBcUJmOzs7O0dB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