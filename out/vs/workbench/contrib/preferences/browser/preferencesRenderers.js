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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNSZW5kZXJlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9icm93c2VyL3ByZWZlcmVuY2VzUmVuZGVyZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDckYsT0FBTyxFQUFXLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUcxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQU9oRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBVXZFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN0RixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FB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