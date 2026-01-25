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
var WorkspaceConfigurationRenderer_1;
import { EventHelper, getDomNodePagePosition } from '../../../../base/browser/dom.js';
import { SubmenuAction } from '../../../../base/common/actions.js';
import { Delayer } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { isEqual } from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ModelDecorationOptions } from '../../../../editor/common/model/textModel.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { CodeActionKind } from '../../../../editor/contrib/codeAction/common/types.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions, OVERRIDE_PROPERTY_REGEX, overrideIdentifiersFromKey, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService, MarkerSeverity, } from '../../../../platform/markers/common/markers.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { RangeHighlightDecorations } from '../../../browser/codeeditor.js';
import { settingsEditIcon } from './preferencesIcons.js';
import { EditPreferenceWidget } from './preferencesWidgets.js';
import { APPLICATION_SCOPES, APPLY_ALL_PROFILES_SETTING, IWorkbenchConfigurationService, } from '../../../services/configuration/common/configuration.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IPreferencesService, } from '../../../services/preferences/common/preferences.js';
import { DefaultSettingsEditorModel, WorkspaceConfigurationEditorModel, } from '../../../services/preferences/common/preferencesModels.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { EXPERIMENTAL_INDICATOR_DESCRIPTION, PREVIEW_INDICATOR_DESCRIPTION, } from '../common/preferences.js';
let UserSettingsRenderer = class UserSettingsRenderer extends Disposable {
    constructor(editor, preferencesModel, preferencesService, configurationService, instantiationService) {
        super();
        this.editor = editor;
        this.preferencesModel = preferencesModel;
        this.preferencesService = preferencesService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.modelChangeDelayer = new Delayer(200);
        this.settingHighlighter = this._register(instantiationService.createInstance(SettingHighlighter, editor));
        this.editSettingActionRenderer = this._register(this.instantiationService.createInstance(EditSettingRenderer, this.editor, this.preferencesModel, this.settingHighlighter));
        this._register(this.editSettingActionRenderer.onUpdateSetting(({ key, value, source }) => this.updatePreference(key, value, source)));
        this._register(this.editor
            .getModel()
            .onDidChangeContent(() => this.modelChangeDelayer.trigger(() => this.onModelChanged())));
        this.unsupportedSettingsRenderer = this._register(instantiationService.createInstance(UnsupportedSettingsRenderer, editor, preferencesModel));
    }
    render() {
        this.editSettingActionRenderer.render(this.preferencesModel.settingsGroups, this.associatedPreferencesModel);
        this.unsupportedSettingsRenderer.render();
    }
    updatePreference(key, value, source) {
        const overrideIdentifiers = source.overrideOf
            ? overrideIdentifiersFromKey(source.overrideOf.key)
            : null;
        const resource = this.preferencesModel.uri;
        this.configurationService
            .updateValue(key, value, { overrideIdentifiers, resource }, this.preferencesModel.configurationTarget)
            .then(() => this.onSettingUpdated(source));
    }
    onModelChanged() {
        if (!this.editor.hasModel()) {
            // model could have been disposed during the delay
            return;
        }
        this.render();
    }
    onSettingUpdated(setting) {
        this.editor.focus();
        setting = this.getSetting(setting);
        if (setting) {
            // TODO:@sandy Selection range should be template range
            this.editor.setSelection(setting.valueRange);
            this.settingHighlighter.highlight(setting, true);
        }
    }
    getSetting(setting) {
        const { key, overrideOf } = setting;
        if (overrideOf) {
            const setting = this.getSetting(overrideOf);
            for (const override of setting.overrides) {
                if (override.key === key) {
                    return override;
                }
            }
            return undefined;
        }
        return this.preferencesModel.getPreference(key);
    }
    focusPreference(setting) {
        const s = this.getSetting(setting);
        if (s) {
            this.settingHighlighter.highlight(s, true);
            this.editor.setPosition({
                lineNumber: s.keyRange.startLineNumber,
                column: s.keyRange.startColumn,
            });
        }
        else {
            this.settingHighlighter.clear(true);
        }
    }
    clearFocus(setting) {
        this.settingHighlighter.clear(true);
    }
    editPreference(setting) {
        const editableSetting = this.getSetting(setting);
        return !!(editableSetting && this.editSettingActionRenderer.activateOnSetting(editableSetting));
    }
};
UserSettingsRenderer = __decorate([
    __param(2, IPreferencesService),
    __param(3, IConfigurationService),
    __param(4, IInstantiationService)
], UserSettingsRenderer);
export { UserSettingsRenderer };
let WorkspaceSettingsRenderer = class WorkspaceSettingsRenderer extends UserSettingsRenderer {
    constructor(editor, preferencesModel, preferencesService, configurationService, instantiationService) {
        super(editor, preferencesModel, preferencesService, configurationService, instantiationService);
        this.workspaceConfigurationRenderer = this._register(instantiationService.createInstance(WorkspaceConfigurationRenderer, editor, preferencesModel));
    }
    render() {
        super.render();
        this.workspaceConfigurationRenderer.render();
    }
};
WorkspaceSettingsRenderer = __decorate([
    __param(2, IPreferencesService),
    __param(3, IConfigurationService),
    __param(4, IInstantiationService)
], WorkspaceSettingsRenderer);
export { WorkspaceSettingsRenderer };
let EditSettingRenderer = class EditSettingRenderer extends Disposable {
    constructor(editor, primarySettingsModel, settingHighlighter, configurationService, instantiationService, contextMenuService) {
        super();
        this.editor = editor;
        this.primarySettingsModel = primarySettingsModel;
        this.settingHighlighter = settingHighlighter;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.settingsGroups = [];
        this._onUpdateSetting = this._register(new Emitter());
        this.onUpdateSetting = this._onUpdateSetting.event;
        this.editPreferenceWidgetForCursorPosition = this._register(this.instantiationService.createInstance((EditPreferenceWidget), editor));
        this.editPreferenceWidgetForMouseMove = this._register(this.instantiationService.createInstance((EditPreferenceWidget), editor));
        this.toggleEditPreferencesForMouseMoveDelayer = new Delayer(75);
        this._register(this.editPreferenceWidgetForCursorPosition.onClick((e) => this.onEditSettingClicked(this.editPreferenceWidgetForCursorPosition, e)));
        this._register(this.editPreferenceWidgetForMouseMove.onClick((e) => this.onEditSettingClicked(this.editPreferenceWidgetForMouseMove, e)));
        this._register(this.editor.onDidChangeCursorPosition((positionChangeEvent) => this.onPositionChanged(positionChangeEvent)));
        this._register(this.editor.onMouseMove((mouseMoveEvent) => this.onMouseMoved(mouseMoveEvent)));
        this._register(this.editor.onDidChangeConfiguration(() => this.onConfigurationChanged()));
    }
    render(settingsGroups, associatedPreferencesModel) {
        this.editPreferenceWidgetForCursorPosition.hide();
        this.editPreferenceWidgetForMouseMove.hide();
        this.settingsGroups = settingsGroups;
        this.associatedPreferencesModel = associatedPreferencesModel;
        const settings = this.getSettings(this.editor.getPosition().lineNumber);
        if (settings.length) {
            this.showEditPreferencesWidget(this.editPreferenceWidgetForCursorPosition, settings);
        }
    }
    isDefaultSettings() {
        return this.primarySettingsModel instanceof DefaultSettingsEditorModel;
    }
    onConfigurationChanged() {
        if (!this.editor.getOption(59 /* EditorOption.glyphMargin */)) {
            this.editPreferenceWidgetForCursorPosition.hide();
            this.editPreferenceWidgetForMouseMove.hide();
        }
    }
    onPositionChanged(positionChangeEvent) {
        this.editPreferenceWidgetForMouseMove.hide();
        const settings = this.getSettings(positionChangeEvent.position.lineNumber);
        if (settings.length) {
            this.showEditPreferencesWidget(this.editPreferenceWidgetForCursorPosition, settings);
        }
        else {
            this.editPreferenceWidgetForCursorPosition.hide();
        }
    }
    onMouseMoved(mouseMoveEvent) {
        const editPreferenceWidget = this.getEditPreferenceWidgetUnderMouse(mouseMoveEvent);
        if (editPreferenceWidget) {
            this.onMouseOver(editPreferenceWidget);
            return;
        }
        this.settingHighlighter.clear();
        this.toggleEditPreferencesForMouseMoveDelayer.trigger(() => this.toggleEditPreferenceWidgetForMouseMove(mouseMoveEvent));
    }
    getEditPreferenceWidgetUnderMouse(mouseMoveEvent) {
        if (mouseMoveEvent.target.type === 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */) {
            const line = mouseMoveEvent.target.position.lineNumber;
            if (this.editPreferenceWidgetForMouseMove.getLine() === line &&
                this.editPreferenceWidgetForMouseMove.isVisible()) {
                return this.editPreferenceWidgetForMouseMove;
            }
            if (this.editPreferenceWidgetForCursorPosition.getLine() === line &&
                this.editPreferenceWidgetForCursorPosition.isVisible()) {
                return this.editPreferenceWidgetForCursorPosition;
            }
        }
        return undefined;
    }
    toggleEditPreferenceWidgetForMouseMove(mouseMoveEvent) {
        const settings = mouseMoveEvent.target.position
            ? this.getSettings(mouseMoveEvent.target.position.lineNumber)
            : null;
        if (settings && settings.length) {
            this.showEditPreferencesWidget(this.editPreferenceWidgetForMouseMove, settings);
        }
        else {
            this.editPreferenceWidgetForMouseMove.hide();
        }
    }
    showEditPreferencesWidget(editPreferencesWidget, settings) {
        const line = settings[0].valueRange.startLineNumber;
        if (this.editor.getOption(59 /* EditorOption.glyphMargin */) &&
            this.marginFreeFromOtherDecorations(line)) {
            editPreferencesWidget.show(line, nls.localize('editTtile', 'Edit'), settings);
            const editPreferenceWidgetToHide = editPreferencesWidget === this.editPreferenceWidgetForCursorPosition
                ? this.editPreferenceWidgetForMouseMove
                : this.editPreferenceWidgetForCursorPosition;
            editPreferenceWidgetToHide.hide();
        }
    }
    marginFreeFromOtherDecorations(line) {
        const decorations = this.editor.getLineDecorations(line);
        if (decorations) {
            for (const { options } of decorations) {
                if (options.glyphMarginClassName &&
                    options.glyphMarginClassName.indexOf(ThemeIcon.asClassName(settingsEditIcon)) === -1) {
                    return false;
                }
            }
        }
        return true;
    }
    getSettings(lineNumber) {
        const configurationMap = this.getConfigurationsMap();
        return this.getSettingsAtLineNumber(lineNumber).filter((setting) => {
            const configurationNode = configurationMap[setting.key];
            if (configurationNode) {
                if (configurationNode.policy &&
                    this.configurationService.inspect(setting.key).policyValue !== undefined) {
                    return false;
                }
                if (this.isDefaultSettings()) {
                    if (setting.key === 'launch') {
                        // Do not show because of https://github.com/microsoft/vscode/issues/32593
                        return false;
                    }
                    return true;
                }
                if (configurationNode.type === 'boolean' || configurationNode.enum) {
                    if (this.primarySettingsModel.configurationTarget !==
                        6 /* ConfigurationTarget.WORKSPACE_FOLDER */) {
                        return true;
                    }
                    if (configurationNode.scope === 5 /* ConfigurationScope.RESOURCE */ ||
                        configurationNode.scope === 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */) {
                        return true;
                    }
                }
            }
            return false;
        });
    }
    getSettingsAtLineNumber(lineNumber) {
        // index of setting, across all groups/sections
        let index = 0;
        const settings = [];
        for (const group of this.settingsGroups) {
            if (group.range.startLineNumber > lineNumber) {
                break;
            }
            if (lineNumber >= group.range.startLineNumber && lineNumber <= group.range.endLineNumber) {
                for (const section of group.sections) {
                    for (const setting of section.settings) {
                        if (setting.range.startLineNumber > lineNumber) {
                            break;
                        }
                        if (lineNumber >= setting.range.startLineNumber &&
                            lineNumber <= setting.range.endLineNumber) {
                            if (!this.isDefaultSettings() && setting.overrides.length) {
                                // Only one level because override settings cannot have override settings
                                for (const overrideSetting of setting.overrides) {
                                    if (lineNumber >= overrideSetting.range.startLineNumber &&
                                        lineNumber <= overrideSetting.range.endLineNumber) {
                                        settings.push({ ...overrideSetting, index, groupId: group.id });
                                    }
                                }
                            }
                            else {
                                settings.push({ ...setting, index, groupId: group.id });
                            }
                        }
                        index++;
                    }
                }
            }
        }
        return settings;
    }
    onMouseOver(editPreferenceWidget) {
        this.settingHighlighter.highlight(editPreferenceWidget.preferences[0]);
    }
    onEditSettingClicked(editPreferenceWidget, e) {
        EventHelper.stop(e.event, true);
        const actions = this.getSettings(editPreferenceWidget.getLine()).length === 1
            ? this.getActions(editPreferenceWidget.preferences[0], this.getConfigurationsMap()[editPreferenceWidget.preferences[0].key])
            : editPreferenceWidget.preferences.map((setting) => new SubmenuAction(`preferences.submenu.${setting.key}`, setting.key, this.getActions(setting, this.getConfigurationsMap()[setting.key])));
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.event,
            getActions: () => actions,
        });
    }
    activateOnSetting(setting) {
        const startLine = setting.keyRange.startLineNumber;
        const settings = this.getSettings(startLine);
        if (!settings.length) {
            return false;
        }
        this.editPreferenceWidgetForMouseMove.show(startLine, '', settings);
        const actions = this.getActions(this.editPreferenceWidgetForMouseMove.preferences[0], this.getConfigurationsMap()[this.editPreferenceWidgetForMouseMove.preferences[0].key]);
        this.contextMenuService.showContextMenu({
            getAnchor: () => this.toAbsoluteCoords(new Position(startLine, 1)),
            getActions: () => actions,
        });
        return true;
    }
    toAbsoluteCoords(position) {
        const positionCoords = this.editor.getScrolledVisiblePosition(position);
        const editorCoords = getDomNodePagePosition(this.editor.getDomNode());
        const x = editorCoords.left + positionCoords.left;
        const y = editorCoords.top + positionCoords.top + positionCoords.height;
        return { x, y: y + 10 };
    }
    getConfigurationsMap() {
        return Registry.as(ConfigurationExtensions.Configuration).getConfigurationProperties();
    }
    getActions(setting, jsonSchema) {
        if (jsonSchema.type === 'boolean') {
            return [
                {
                    id: 'truthyValue',
                    label: 'true',
                    tooltip: 'true',
                    enabled: true,
                    run: () => this.updateSetting(setting.key, true, setting),
                    class: undefined,
                },
                {
                    id: 'falsyValue',
                    label: 'false',
                    tooltip: 'false',
                    enabled: true,
                    run: () => this.updateSetting(setting.key, false, setting),
                    class: undefined,
                },
            ];
        }
        if (jsonSchema.enum) {
            return jsonSchema.enum.map((value) => {
                return {
                    id: value,
                    label: JSON.stringify(value),
                    tooltip: JSON.stringify(value),
                    enabled: true,
                    run: () => this.updateSetting(setting.key, value, setting),
                    class: undefined,
                };
            });
        }
        return this.getDefaultActions(setting);
    }
    getDefaultActions(setting) {
        if (this.isDefaultSettings()) {
            const settingInOtherModel = this.associatedPreferencesModel.getPreference(setting.key);
            return [
                {
                    id: 'setDefaultValue',
                    label: settingInOtherModel
                        ? nls.localize('replaceDefaultValue', 'Replace in Settings')
                        : nls.localize('copyDefaultValue', 'Copy to Settings'),
                    tooltip: settingInOtherModel
                        ? nls.localize('replaceDefaultValue', 'Replace in Settings')
                        : nls.localize('copyDefaultValue', 'Copy to Settings'),
                    enabled: true,
                    run: () => this.updateSetting(setting.key, setting.value, setting),
                    class: undefined,
                },
            ];
        }
        return [];
    }
    updateSetting(key, value, source) {
        this._onUpdateSetting.fire({ key, value, source });
    }
};
EditSettingRenderer = __decorate([
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IContextMenuService)
], EditSettingRenderer);
let SettingHighlighter = class SettingHighlighter extends Disposable {
    constructor(editor, instantiationService) {
        super();
        this.editor = editor;
        this.fixedHighlighter = this._register(instantiationService.createInstance(RangeHighlightDecorations));
        this.volatileHighlighter = this._register(instantiationService.createInstance(RangeHighlightDecorations));
    }
    highlight(setting, fix = false) {
        this.volatileHighlighter.removeHighlightRange();
        this.fixedHighlighter.removeHighlightRange();
        const highlighter = fix ? this.fixedHighlighter : this.volatileHighlighter;
        highlighter.highlightRange({
            range: setting.valueRange,
            resource: this.editor.getModel().uri,
        }, this.editor);
        this.editor.revealLineInCenterIfOutsideViewport(setting.valueRange.startLineNumber, 0 /* editorCommon.ScrollType.Smooth */);
    }
    clear(fix = false) {
        this.volatileHighlighter.removeHighlightRange();
        if (fix) {
            this.fixedHighlighter.removeHighlightRange();
        }
    }
};
SettingHighlighter = __decorate([
    __param(1, IInstantiationService)
], SettingHighlighter);
let UnsupportedSettingsRenderer = class UnsupportedSettingsRenderer extends Disposable {
    constructor(editor, settingsEditorModel, markerService, environmentService, configurationService, workspaceTrustManagementService, uriIdentityService, languageFeaturesService, userDataProfileService, userDataProfilesService) {
        super();
        this.editor = editor;
        this.settingsEditorModel = settingsEditorModel;
        this.markerService = markerService;
        this.environmentService = environmentService;
        this.configurationService = configurationService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.uriIdentityService = uriIdentityService;
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.renderingDelayer = new Delayer(200);
        this.codeActions = new ResourceMap((uri) => this.uriIdentityService.extUri.getComparisonKey(uri));
        this._register(this.editor.getModel().onDidChangeContent(() => this.delayedRender()));
        this._register(Event.filter(this.configurationService.onDidChangeConfiguration, (e) => e.source === 7 /* ConfigurationTarget.DEFAULT */)(() => this.delayedRender()));
        this._register(languageFeaturesService.codeActionProvider.register({ pattern: settingsEditorModel.uri.path }, this));
        this._register(userDataProfileService.onDidChangeCurrentProfile(() => this.delayedRender()));
    }
    delayedRender() {
        this.renderingDelayer.trigger(() => this.render());
    }
    render() {
        this.codeActions.clear();
        const markerData = this.generateMarkerData();
        if (markerData.length) {
            this.markerService.changeOne('UnsupportedSettingsRenderer', this.settingsEditorModel.uri, markerData);
        }
        else {
            this.markerService.remove('UnsupportedSettingsRenderer', [this.settingsEditorModel.uri]);
        }
    }
    async provideCodeActions(model, range, context, token) {
        const actions = [];
        const codeActionsByRange = this.codeActions.get(model.uri);
        if (codeActionsByRange) {
            for (const [codeActionsRange, codeActions] of codeActionsByRange) {
                if (codeActionsRange.containsRange(range)) {
                    actions.push(...codeActions);
                }
            }
        }
        return {
            actions,
            dispose: () => { },
        };
    }
    generateMarkerData() {
        const markerData = [];
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration).getConfigurationProperties();
        for (const settingsGroup of this.settingsEditorModel.settingsGroups) {
            for (const section of settingsGroup.sections) {
                for (const setting of section.settings) {
                    if (OVERRIDE_PROPERTY_REGEX.test(setting.key)) {
                        if (setting.overrides) {
                            this.handleOverrides(setting.overrides, configurationRegistry, markerData);
                        }
                        continue;
                    }
                    const configuration = configurationRegistry[setting.key];
                    if (configuration) {
                        this.handleUnstableSettingConfiguration(setting, configuration, markerData);
                        if (this.handlePolicyConfiguration(setting, configuration, markerData)) {
                            continue;
                        }
                        switch (this.settingsEditorModel.configurationTarget) {
                            case 3 /* ConfigurationTarget.USER_LOCAL */:
                                this.handleLocalUserConfiguration(setting, configuration, markerData);
                                break;
                            case 4 /* ConfigurationTarget.USER_REMOTE */:
                                this.handleRemoteUserConfiguration(setting, configuration, markerData);
                                break;
                            case 5 /* ConfigurationTarget.WORKSPACE */:
                                this.handleWorkspaceConfiguration(setting, configuration, markerData);
                                break;
                            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                                this.handleWorkspaceFolderConfiguration(setting, configuration, markerData);
                                break;
                        }
                    }
                    else {
                        markerData.push(this.generateUnknownConfigurationMarker(setting));
                    }
                }
            }
        }
        return markerData;
    }
    handlePolicyConfiguration(setting, configuration, markerData) {
        if (!configuration.policy) {
            return false;
        }
        if (this.configurationService.inspect(setting.key).policyValue === undefined) {
            return false;
        }
        if (this.settingsEditorModel.configurationTarget === 7 /* ConfigurationTarget.DEFAULT */) {
            return false;
        }
        markerData.push({
            severity: MarkerSeverity.Hint,
            tags: [1 /* MarkerTag.Unnecessary */],
            ...setting.range,
            message: nls.localize('unsupportedPolicySetting', 'This setting cannot be applied because it is configured in the system policy.'),
        });
        return true;
    }
    handleOverrides(overrides, configurationRegistry, markerData) {
        for (const setting of overrides || []) {
            const configuration = configurationRegistry[setting.key];
            if (configuration) {
                if (configuration.scope !== 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */) {
                    markerData.push({
                        severity: MarkerSeverity.Hint,
                        tags: [1 /* MarkerTag.Unnecessary */],
                        ...setting.range,
                        message: nls.localize('unsupportLanguageOverrideSetting', 'This setting cannot be applied because it is not registered as language override setting.'),
                    });
                }
            }
            else {
                markerData.push(this.generateUnknownConfigurationMarker(setting));
            }
        }
    }
    handleLocalUserConfiguration(setting, configuration, markerData) {
        if (!this.userDataProfileService.currentProfile.isDefault &&
            !this.userDataProfileService.currentProfile.useDefaultFlags?.settings) {
            if (isEqual(this.userDataProfilesService.defaultProfile.settingsResource, this.settingsEditorModel.uri) &&
                !this.configurationService.isSettingAppliedForAllProfiles(setting.key)) {
                // If we're in the default profile setting file, and the setting cannot be applied in all profiles
                markerData.push({
                    severity: MarkerSeverity.Hint,
                    tags: [1 /* MarkerTag.Unnecessary */],
                    ...setting.range,
                    message: nls.localize('defaultProfileSettingWhileNonDefaultActive', 'This setting cannot be applied while a non-default profile is active. It will be applied when the default profile is active.'),
                });
            }
            else if (isEqual(this.userDataProfileService.currentProfile.settingsResource, this.settingsEditorModel.uri)) {
                if (configuration.scope && APPLICATION_SCOPES.includes(configuration.scope)) {
                    // If we're in a profile setting file, and the setting is application-scoped, fade it out.
                    markerData.push(this.generateUnsupportedApplicationSettingMarker(setting));
                }
                else if (this.configurationService.isSettingAppliedForAllProfiles(setting.key)) {
                    // If we're in the non-default profile setting file, and the setting can be applied in all profiles, fade it out.
                    markerData.push({
                        severity: MarkerSeverity.Hint,
                        tags: [1 /* MarkerTag.Unnecessary */],
                        ...setting.range,
                        message: nls.localize('allProfileSettingWhileInNonDefaultProfileSetting', 'This setting cannot be applied because it is configured to be applied in all profiles using setting {0}. Value from the default profile will be used instead.', APPLY_ALL_PROFILES_SETTING),
                    });
                }
            }
        }
        if (this.environmentService.remoteAuthority &&
            (configuration.scope === 2 /* ConfigurationScope.MACHINE */ ||
                configuration.scope === 3 /* ConfigurationScope.APPLICATION_MACHINE */ ||
                configuration.scope === 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */)) {
            markerData.push({
                severity: MarkerSeverity.Hint,
                tags: [1 /* MarkerTag.Unnecessary */],
                ...setting.range,
                message: nls.localize('unsupportedRemoteMachineSetting', 'This setting cannot be applied in this window. It will be applied when you open a local window.'),
            });
        }
    }
    handleRemoteUserConfiguration(setting, configuration, markerData) {
        if (configuration.scope === 1 /* ConfigurationScope.APPLICATION */) {
            markerData.push(this.generateUnsupportedApplicationSettingMarker(setting));
        }
    }
    handleWorkspaceConfiguration(setting, configuration, markerData) {
        if (configuration.scope && APPLICATION_SCOPES.includes(configuration.scope)) {
            markerData.push(this.generateUnsupportedApplicationSettingMarker(setting));
        }
        if (configuration.scope === 2 /* ConfigurationScope.MACHINE */) {
            markerData.push(this.generateUnsupportedMachineSettingMarker(setting));
        }
        if (!this.workspaceTrustManagementService.isWorkspaceTrusted() && configuration.restricted) {
            const marker = this.generateUntrustedSettingMarker(setting);
            markerData.push(marker);
            const codeActions = this.generateUntrustedSettingCodeActions([marker]);
            this.addCodeActions(marker, codeActions);
        }
    }
    handleWorkspaceFolderConfiguration(setting, configuration, markerData) {
        if (configuration.scope && APPLICATION_SCOPES.includes(configuration.scope)) {
            markerData.push(this.generateUnsupportedApplicationSettingMarker(setting));
        }
        if (configuration.scope === 2 /* ConfigurationScope.MACHINE */) {
            markerData.push(this.generateUnsupportedMachineSettingMarker(setting));
        }
        if (configuration.scope === 4 /* ConfigurationScope.WINDOW */) {
            markerData.push({
                severity: MarkerSeverity.Hint,
                tags: [1 /* MarkerTag.Unnecessary */],
                ...setting.range,
                message: nls.localize('unsupportedWindowSetting', 'This setting cannot be applied in this workspace. It will be applied when you open the containing workspace folder directly.'),
            });
        }
        if (!this.workspaceTrustManagementService.isWorkspaceTrusted() && configuration.restricted) {
            const marker = this.generateUntrustedSettingMarker(setting);
            markerData.push(marker);
            const codeActions = this.generateUntrustedSettingCodeActions([marker]);
            this.addCodeActions(marker, codeActions);
        }
    }
    handleUnstableSettingConfiguration(setting, configuration, markerData) {
        if (configuration.tags?.includes('preview')) {
            markerData.push(this.generatePreviewSettingMarker(setting));
        }
        else if (configuration.tags?.includes('experimental')) {
            markerData.push(this.generateExperimentalSettingMarker(setting));
        }
    }
    generateUnsupportedApplicationSettingMarker(setting) {
        return {
            severity: MarkerSeverity.Hint,
            tags: [1 /* MarkerTag.Unnecessary */],
            ...setting.range,
            message: nls.localize('unsupportedApplicationSetting', 'This setting has an application scope and can be set only in the user settings file.'),
        };
    }
    generateUnsupportedMachineSettingMarker(setting) {
        return {
            severity: MarkerSeverity.Hint,
            tags: [1 /* MarkerTag.Unnecessary */],
            ...setting.range,
            message: nls.localize('unsupportedMachineSetting', 'This setting can only be applied in user settings in local window or in remote settings in remote window.'),
        };
    }
    generateUntrustedSettingMarker(setting) {
        return {
            severity: MarkerSeverity.Warning,
            ...setting.range,
            message: nls.localize('untrustedSetting', 'This setting can only be applied in a trusted workspace.'),
        };
    }
    generateUnknownConfigurationMarker(setting) {
        return {
            severity: MarkerSeverity.Hint,
            tags: [1 /* MarkerTag.Unnecessary */],
            ...setting.range,
            message: nls.localize('unknown configuration setting', 'Unknown Configuration Setting'),
        };
    }
    generateUntrustedSettingCodeActions(diagnostics) {
        return [
            {
                title: nls.localize('manage workspace trust', 'Manage Workspace Trust'),
                command: {
                    id: 'workbench.trust.manage',
                    title: nls.localize('manage workspace trust', 'Manage Workspace Trust'),
                },
                diagnostics,
                kind: CodeActionKind.QuickFix.value,
            },
        ];
    }
    generatePreviewSettingMarker(setting) {
        return {
            severity: MarkerSeverity.Hint,
            ...setting.range,
            message: PREVIEW_INDICATOR_DESCRIPTION,
        };
    }
    generateExperimentalSettingMarker(setting) {
        return {
            severity: MarkerSeverity.Hint,
            ...setting.range,
            message: EXPERIMENTAL_INDICATOR_DESCRIPTION,
        };
    }
    addCodeActions(range, codeActions) {
        let actions = this.codeActions.get(this.settingsEditorModel.uri);
        if (!actions) {
            actions = [];
            this.codeActions.set(this.settingsEditorModel.uri, actions);
        }
        actions.push([Range.lift(range), codeActions]);
    }
    dispose() {
        this.markerService.remove('UnsupportedSettingsRenderer', [this.settingsEditorModel.uri]);
        this.codeActions.clear();
        super.dispose();
    }
};
UnsupportedSettingsRenderer = __decorate([
    __param(2, IMarkerService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, IWorkbenchConfigurationService),
    __param(5, IWorkspaceTrustManagementService),
    __param(6, IUriIdentityService),
    __param(7, ILanguageFeaturesService),
    __param(8, IUserDataProfileService),
    __param(9, IUserDataProfilesService)
], UnsupportedSettingsRenderer);
let WorkspaceConfigurationRenderer = class WorkspaceConfigurationRenderer extends Disposable {
    static { WorkspaceConfigurationRenderer_1 = this; }
    static { this.supportedKeys = [
        'folders',
        'tasks',
        'launch',
        'extensions',
        'settings',
        'remoteAuthority',
        'transient',
    ]; }
    constructor(editor, workspaceSettingsEditorModel, workspaceContextService, markerService) {
        super();
        this.editor = editor;
        this.workspaceSettingsEditorModel = workspaceSettingsEditorModel;
        this.workspaceContextService = workspaceContextService;
        this.markerService = markerService;
        this.renderingDelayer = new Delayer(200);
        this.decorations = this.editor.createDecorationsCollection();
        this._register(this.editor
            .getModel()
            .onDidChangeContent(() => this.renderingDelayer.trigger(() => this.render())));
    }
    render() {
        const markerData = [];
        if (this.workspaceContextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ &&
            this.workspaceSettingsEditorModel instanceof WorkspaceConfigurationEditorModel) {
            const ranges = [];
            for (const settingsGroup of this.workspaceSettingsEditorModel.configurationGroups) {
                for (const section of settingsGroup.sections) {
                    for (const setting of section.settings) {
                        if (!WorkspaceConfigurationRenderer_1.supportedKeys.includes(setting.key)) {
                            markerData.push({
                                severity: MarkerSeverity.Hint,
                                tags: [1 /* MarkerTag.Unnecessary */],
                                ...setting.range,
                                message: nls.localize('unsupportedProperty', 'Unsupported Property'),
                            });
                        }
                    }
                }
            }
            this.decorations.set(ranges.map((range) => this.createDecoration(range)));
        }
        if (markerData.length) {
            this.markerService.changeOne('WorkspaceConfigurationRenderer', this.workspaceSettingsEditorModel.uri, markerData);
        }
        else {
            this.markerService.remove('WorkspaceConfigurationRenderer', [
                this.workspaceSettingsEditorModel.uri,
            ]);
        }
    }
    static { this._DIM_CONFIGURATION_ = ModelDecorationOptions.register({
        description: 'dim-configuration',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        inlineClassName: 'dim-configuration',
    }); }
    createDecoration(range) {
        return {
            range,
            options: WorkspaceConfigurationRenderer_1._DIM_CONFIGURATION_,
        };
    }
    dispose() {
        this.markerService.remove('WorkspaceConfigurationRenderer', [
            this.workspaceSettingsEditorModel.uri,
        ]);
        this.decorations.clear();
        super.dispose();
    }
};
WorkspaceConfigurationRenderer = WorkspaceConfigurationRenderer_1 = __decorate([
    __param(2, IWorkspaceContextService),
    __param(3, IMarkerService)
], WorkspaceConfigurationRenderer);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNSZW5kZXJlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIvcHJlZmVyZW5jZXNSZW5kZXJlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNyRixPQUFPLEVBQVcsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFakUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBT2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFVdkUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDckYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3RGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLDREQUE0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