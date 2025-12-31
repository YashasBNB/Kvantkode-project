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
import { getErrorMessage } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { parse } from '../../../../base/common/json.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import * as network from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { CoreEditingCommands } from '../../../../editor/browser/coreCommands.js';
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { Extensions, getDefaultValue, OVERRIDE_PROPERTY_REGEX, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../common/editor.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { IJSONEditingService } from '../../configuration/common/jsonEditing.js';
import { IEditorGroupsService, } from '../../editor/common/editorGroupsService.js';
import { IEditorService, SIDE_GROUP } from '../../editor/common/editorService.js';
import { KeybindingsEditorInput } from './keybindingsEditorInput.js';
import { DEFAULT_SETTINGS_EDITOR_SETTING, FOLDER_SETTINGS_PATH, IPreferencesService, SETTINGS_AUTHORITY, USE_SPLIT_JSON_SETTING, validateSettingsEditorOptions, } from '../common/preferences.js';
import { SettingsEditor2Input } from '../common/preferencesEditorInput.js';
import { defaultKeybindingsContents, DefaultKeybindingsEditorModel, DefaultRawSettingsEditorModel, DefaultSettings, DefaultSettingsEditorModel, Settings2EditorModel, SettingsEditorModel, WorkspaceConfigurationEditorModel, } from '../common/preferencesModels.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { ITextEditorService } from '../../textfile/common/textEditorService.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { isObject } from '../../../../base/common/types.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { ResourceSet } from '../../../../base/common/map.js';
import { isEqual } from '../../../../base/common/resources.js';
import { IURLService } from '../../../../platform/url/common/url.js';
import { compareIgnoreCase } from '../../../../base/common/strings.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { findGroup } from '../../editor/common/editorGroupFinder.js';
const emptyEditableSettingsContent = '{\n}';
let PreferencesService = class PreferencesService extends Disposable {
    constructor(editorService, editorGroupService, textFileService, configurationService, notificationService, contextService, instantiationService, userDataProfileService, userDataProfilesService, textModelResolverService, keybindingService, modelService, jsonEditingService, labelService, remoteAgentService, textEditorService, urlService, extensionService, progressService) {
        super();
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.textFileService = textFileService;
        this.configurationService = configurationService;
        this.notificationService = notificationService;
        this.contextService = contextService;
        this.instantiationService = instantiationService;
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.textModelResolverService = textModelResolverService;
        this.jsonEditingService = jsonEditingService;
        this.labelService = labelService;
        this.remoteAgentService = remoteAgentService;
        this.textEditorService = textEditorService;
        this.extensionService = extensionService;
        this.progressService = progressService;
        this._onDispose = this._register(new Emitter());
        this._onDidDefaultSettingsContentChanged = this._register(new Emitter());
        this.onDidDefaultSettingsContentChanged = this._onDidDefaultSettingsContentChanged.event;
        this._requestedDefaultSettings = new ResourceSet();
        this._settingsGroups = undefined;
        this._cachedSettingsEditor2Input = undefined;
        this.defaultKeybindingsResource = URI.from({
            scheme: network.Schemas.vscode,
            authority: 'defaultsettings',
            path: '/keybindings.json',
        });
        this.defaultSettingsRawResource = URI.from({
            scheme: network.Schemas.vscode,
            authority: 'defaultsettings',
            path: '/defaultSettings.json',
        });
        // The default keybindings.json updates based on keyboard layouts, so here we make sure
        // if a model has been given out we update it accordingly.
        this._register(keybindingService.onDidUpdateKeybindings(() => {
            const model = modelService.getModel(this.defaultKeybindingsResource);
            if (!model) {
                // model has not been given out => nothing to do
                return;
            }
            modelService.updateModel(model, defaultKeybindingsContents(keybindingService));
        }));
        this._register(urlService.registerHandler(this));
    }
    get userSettingsResource() {
        return this.userDataProfileService.currentProfile.settingsResource;
    }
    get workspaceSettingsResource() {
        if (this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            return null;
        }
        const workspace = this.contextService.getWorkspace();
        return workspace.configuration || workspace.folders[0].toResource(FOLDER_SETTINGS_PATH);
    }
    createOrGetCachedSettingsEditor2Input() {
        if (!this._cachedSettingsEditor2Input || this._cachedSettingsEditor2Input.isDisposed()) {
            // Recreate the input if the user never opened the Settings editor,
            // or if they closed it and want to reopen it.
            this._cachedSettingsEditor2Input = new SettingsEditor2Input(this);
        }
        return this._cachedSettingsEditor2Input;
    }
    getFolderSettingsResource(resource) {
        const folder = this.contextService.getWorkspaceFolder(resource);
        return folder ? folder.toResource(FOLDER_SETTINGS_PATH) : null;
    }
    hasDefaultSettingsContent(uri) {
        return (this.isDefaultSettingsResource(uri) ||
            isEqual(uri, this.defaultSettingsRawResource) ||
            isEqual(uri, this.defaultKeybindingsResource));
    }
    getDefaultSettingsContent(uri) {
        if (this.isDefaultSettingsResource(uri)) {
            // We opened a split json editor in this case,
            // and this half shows the default settings.
            const target = this.getConfigurationTargetFromDefaultSettingsResource(uri);
            const defaultSettings = this.getDefaultSettings(target);
            if (!this._requestedDefaultSettings.has(uri)) {
                this._register(defaultSettings.onDidChange(() => this._onDidDefaultSettingsContentChanged.fire(uri)));
                this._requestedDefaultSettings.add(uri);
            }
            return defaultSettings.getContentWithoutMostCommonlyUsed(true);
        }
        if (isEqual(uri, this.defaultSettingsRawResource)) {
            if (!this._defaultRawSettingsEditorModel) {
                this._defaultRawSettingsEditorModel = this._register(this.instantiationService.createInstance(DefaultRawSettingsEditorModel, this.getDefaultSettings(3 /* ConfigurationTarget.USER_LOCAL */)));
                this._register(this._defaultRawSettingsEditorModel.onDidContentChanged(() => this._onDidDefaultSettingsContentChanged.fire(uri)));
            }
            return this._defaultRawSettingsEditorModel.content;
        }
        if (isEqual(uri, this.defaultKeybindingsResource)) {
            const defaultKeybindingsEditorModel = this.instantiationService.createInstance(DefaultKeybindingsEditorModel, uri);
            return defaultKeybindingsEditorModel.content;
        }
        return undefined;
    }
    async createPreferencesEditorModel(uri) {
        if (this.isDefaultSettingsResource(uri)) {
            return this.createDefaultSettingsEditorModel(uri);
        }
        if (this.userSettingsResource.toString() === uri.toString() ||
            this.userDataProfilesService.defaultProfile.settingsResource.toString() === uri.toString()) {
            return this.createEditableSettingsEditorModel(3 /* ConfigurationTarget.USER_LOCAL */, uri);
        }
        const workspaceSettingsUri = await this.getEditableSettingsURI(5 /* ConfigurationTarget.WORKSPACE */);
        if (workspaceSettingsUri && workspaceSettingsUri.toString() === uri.toString()) {
            return this.createEditableSettingsEditorModel(5 /* ConfigurationTarget.WORKSPACE */, workspaceSettingsUri);
        }
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            const settingsUri = await this.getEditableSettingsURI(6 /* ConfigurationTarget.WORKSPACE_FOLDER */, uri);
            if (settingsUri && settingsUri.toString() === uri.toString()) {
                return this.createEditableSettingsEditorModel(6 /* ConfigurationTarget.WORKSPACE_FOLDER */, uri);
            }
        }
        const remoteEnvironment = await this.remoteAgentService.getEnvironment();
        const remoteSettingsUri = remoteEnvironment ? remoteEnvironment.settingsPath : null;
        if (remoteSettingsUri && remoteSettingsUri.toString() === uri.toString()) {
            return this.createEditableSettingsEditorModel(4 /* ConfigurationTarget.USER_REMOTE */, uri);
        }
        return null;
    }
    openRawDefaultSettings() {
        return this.editorService.openEditor({ resource: this.defaultSettingsRawResource });
    }
    openRawUserSettings() {
        return this.editorService.openEditor({ resource: this.userSettingsResource });
    }
    shouldOpenJsonByDefault() {
        return this.configurationService.getValue('workbench.settings.editor') === 'json';
    }
    openSettings(options = {}) {
        options = {
            ...options,
            target: 3 /* ConfigurationTarget.USER_LOCAL */,
        };
        if (options.query) {
            options.jsonEditor = false;
        }
        return this.open(this.userSettingsResource, options);
    }
    openLanguageSpecificSettings(languageId, options = {}) {
        if (this.shouldOpenJsonByDefault()) {
            options.query = undefined;
            options.revealSetting = { key: `[${languageId}]`, edit: true };
        }
        else {
            options.query = `@lang:${languageId}${options.query ? ` ${options.query}` : ''}`;
        }
        options.target = options.target ?? 3 /* ConfigurationTarget.USER_LOCAL */;
        return this.open(this.userSettingsResource, options);
    }
    open(settingsResource, options) {
        options = {
            ...options,
            jsonEditor: options.jsonEditor ?? this.shouldOpenJsonByDefault(),
        };
        return options.jsonEditor
            ? this.openSettingsJson(settingsResource, options)
            : this.openSettings2(options);
    }
    async openSettings2(options) {
        const input = this.createOrGetCachedSettingsEditor2Input();
        options = {
            ...options,
            focusSearch: true,
        };
        const group = await this.getEditorGroupFromOptions(options);
        return group.openEditor(input, validateSettingsEditorOptions(options));
    }
    openApplicationSettings(options = {}) {
        options = {
            ...options,
            target: 3 /* ConfigurationTarget.USER_LOCAL */,
        };
        return this.open(this.userDataProfilesService.defaultProfile.settingsResource, options);
    }
    openUserSettings(options = {}) {
        options = {
            ...options,
            target: 3 /* ConfigurationTarget.USER_LOCAL */,
        };
        return this.open(this.userSettingsResource, options);
    }
    async openRemoteSettings(options = {}) {
        const environment = await this.remoteAgentService.getEnvironment();
        if (environment) {
            options = {
                ...options,
                target: 4 /* ConfigurationTarget.USER_REMOTE */,
            };
            this.open(environment.settingsPath, options);
        }
        return undefined;
    }
    openWorkspaceSettings(options = {}) {
        if (!this.workspaceSettingsResource) {
            this.notificationService.info(nls.localize('openFolderFirst', 'Open a folder or workspace first to create workspace or folder settings.'));
            return Promise.reject(null);
        }
        options = {
            ...options,
            target: 5 /* ConfigurationTarget.WORKSPACE */,
        };
        return this.open(this.workspaceSettingsResource, options);
    }
    async openFolderSettings(options = {}) {
        options = {
            ...options,
            target: 6 /* ConfigurationTarget.WORKSPACE_FOLDER */,
        };
        if (!options.folderUri) {
            throw new Error(`Missing folder URI`);
        }
        const folderSettingsUri = await this.getEditableSettingsURI(6 /* ConfigurationTarget.WORKSPACE_FOLDER */, options.folderUri);
        if (!folderSettingsUri) {
            throw new Error(`Invalid folder URI - ${options.folderUri.toString()}`);
        }
        return this.open(folderSettingsUri, options);
    }
    async openGlobalKeybindingSettings(textual, options) {
        options = { pinned: true, revealIfOpened: true, ...options };
        if (textual) {
            const emptyContents = '// ' +
                nls.localize('emptyKeybindingsHeader', 'Place your key bindings in this file to override the defaults') +
                '\n[\n]';
            const editableKeybindings = this.userDataProfileService.currentProfile.keybindingsResource;
            const openDefaultKeybindings = !!this.configurationService.getValue('workbench.settings.openDefaultKeybindings');
            // Create as needed and open in editor
            await this.createIfNotExists(editableKeybindings, emptyContents);
            if (openDefaultKeybindings) {
                const sourceGroupId = options.groupId ?? this.editorGroupService.activeGroup.id;
                const sideEditorGroup = this.editorGroupService.addGroup(sourceGroupId, 3 /* GroupDirection.RIGHT */);
                await Promise.all([
                    this.editorService.openEditor({
                        resource: this.defaultKeybindingsResource,
                        options: {
                            pinned: true,
                            preserveFocus: true,
                            revealIfOpened: true,
                            override: DEFAULT_EDITOR_ASSOCIATION.id,
                        },
                        label: nls.localize('defaultKeybindings', 'Default Keybindings'),
                        description: '',
                    }, sourceGroupId),
                    this.editorService.openEditor({ resource: editableKeybindings, options }, sideEditorGroup.id),
                ]);
            }
            else {
                await this.editorService.openEditor({ resource: editableKeybindings, options }, options.groupId);
            }
        }
        else {
            const editor = (await this.editorService.openEditor(this.instantiationService.createInstance(KeybindingsEditorInput), { ...options }, options.groupId));
            if (options.query) {
                editor.search(options.query);
            }
        }
    }
    openDefaultKeybindingsFile() {
        return this.editorService.openEditor({
            resource: this.defaultKeybindingsResource,
            label: nls.localize('defaultKeybindings', 'Default Keybindings'),
        });
    }
    async getEditorGroupFromOptions(options) {
        let group = options?.groupId !== undefined
            ? (this.editorGroupService.getGroup(options.groupId) ?? this.editorGroupService.activeGroup)
            : this.editorGroupService.activeGroup;
        if (options.openToSide) {
            group = (await this.instantiationService.invokeFunction(findGroup, {}, SIDE_GROUP))[0];
        }
        return group;
    }
    async openSettingsJson(resource, options) {
        const group = await this.getEditorGroupFromOptions(options);
        const editor = await this.doOpenSettingsJson(resource, options, group);
        if (editor && options?.revealSetting) {
            await this.revealSetting(options.revealSetting.key, !!options.revealSetting.edit, editor, resource);
        }
        return editor;
    }
    async doOpenSettingsJson(resource, options, group) {
        const openSplitJSON = !!this.configurationService.getValue(USE_SPLIT_JSON_SETTING);
        const openDefaultSettings = !!this.configurationService.getValue(DEFAULT_SETTINGS_EDITOR_SETTING);
        if (openSplitJSON || openDefaultSettings) {
            return this.doOpenSplitJSON(resource, options, group);
        }
        const configurationTarget = options?.target ?? 2 /* ConfigurationTarget.USER */;
        const editableSettingsEditorInput = await this.getOrCreateEditableSettingsEditorInput(configurationTarget, resource);
        options = { ...options, pinned: true };
        return await group.openEditor(editableSettingsEditorInput, {
            ...validateSettingsEditorOptions(options),
        });
    }
    async doOpenSplitJSON(resource, options = {}, group) {
        const configurationTarget = options.target ?? 2 /* ConfigurationTarget.USER */;
        await this.createSettingsIfNotExists(configurationTarget, resource);
        const preferencesEditorInput = this.createSplitJsonEditorInput(configurationTarget, resource);
        options = { ...options, pinned: true };
        return group.openEditor(preferencesEditorInput, validateSettingsEditorOptions(options));
    }
    createSplitJsonEditorInput(configurationTarget, resource) {
        const editableSettingsEditorInput = this.textEditorService.createTextEditor({ resource });
        const defaultPreferencesEditorInput = this.textEditorService.createTextEditor({
            resource: this.getDefaultSettingsResource(configurationTarget),
        });
        return this.instantiationService.createInstance(SideBySideEditorInput, editableSettingsEditorInput.getName(), undefined, defaultPreferencesEditorInput, editableSettingsEditorInput);
    }
    createSettings2EditorModel() {
        return this.instantiationService.createInstance(Settings2EditorModel, this.getDefaultSettings(3 /* ConfigurationTarget.USER_LOCAL */));
    }
    getConfigurationTargetFromDefaultSettingsResource(uri) {
        return this.isDefaultWorkspaceSettingsResource(uri)
            ? 5 /* ConfigurationTarget.WORKSPACE */
            : this.isDefaultFolderSettingsResource(uri)
                ? 6 /* ConfigurationTarget.WORKSPACE_FOLDER */
                : 3 /* ConfigurationTarget.USER_LOCAL */;
    }
    isDefaultSettingsResource(uri) {
        return (this.isDefaultUserSettingsResource(uri) ||
            this.isDefaultWorkspaceSettingsResource(uri) ||
            this.isDefaultFolderSettingsResource(uri));
    }
    isDefaultUserSettingsResource(uri) {
        return (uri.authority === 'defaultsettings' &&
            uri.scheme === network.Schemas.vscode &&
            !!uri.path.match(/\/(\d+\/)?settings\.json$/));
    }
    isDefaultWorkspaceSettingsResource(uri) {
        return (uri.authority === 'defaultsettings' &&
            uri.scheme === network.Schemas.vscode &&
            !!uri.path.match(/\/(\d+\/)?workspaceSettings\.json$/));
    }
    isDefaultFolderSettingsResource(uri) {
        return (uri.authority === 'defaultsettings' &&
            uri.scheme === network.Schemas.vscode &&
            !!uri.path.match(/\/(\d+\/)?resourceSettings\.json$/));
    }
    getDefaultSettingsResource(configurationTarget) {
        switch (configurationTarget) {
            case 5 /* ConfigurationTarget.WORKSPACE */:
                return URI.from({
                    scheme: network.Schemas.vscode,
                    authority: 'defaultsettings',
                    path: `/workspaceSettings.json`,
                });
            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                return URI.from({
                    scheme: network.Schemas.vscode,
                    authority: 'defaultsettings',
                    path: `/resourceSettings.json`,
                });
        }
        return URI.from({
            scheme: network.Schemas.vscode,
            authority: 'defaultsettings',
            path: `/settings.json`,
        });
    }
    async getOrCreateEditableSettingsEditorInput(target, resource) {
        await this.createSettingsIfNotExists(target, resource);
        return this.textEditorService.createTextEditor({ resource });
    }
    async createEditableSettingsEditorModel(configurationTarget, settingsUri) {
        const workspace = this.contextService.getWorkspace();
        if (workspace.configuration && workspace.configuration.toString() === settingsUri.toString()) {
            const reference = await this.textModelResolverService.createModelReference(settingsUri);
            return this.instantiationService.createInstance(WorkspaceConfigurationEditorModel, reference, configurationTarget);
        }
        const reference = await this.textModelResolverService.createModelReference(settingsUri);
        return this.instantiationService.createInstance(SettingsEditorModel, reference, configurationTarget);
    }
    async createDefaultSettingsEditorModel(defaultSettingsUri) {
        const reference = await this.textModelResolverService.createModelReference(defaultSettingsUri);
        const target = this.getConfigurationTargetFromDefaultSettingsResource(defaultSettingsUri);
        return this.instantiationService.createInstance(DefaultSettingsEditorModel, defaultSettingsUri, reference, this.getDefaultSettings(target));
    }
    getDefaultSettings(target) {
        if (target === 5 /* ConfigurationTarget.WORKSPACE */) {
            this._defaultWorkspaceSettingsContentModel ??= this._register(new DefaultSettings(this.getMostCommonlyUsedSettings(), target, this.configurationService));
            return this._defaultWorkspaceSettingsContentModel;
        }
        if (target === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */) {
            this._defaultFolderSettingsContentModel ??= this._register(new DefaultSettings(this.getMostCommonlyUsedSettings(), target, this.configurationService));
            return this._defaultFolderSettingsContentModel;
        }
        this._defaultUserSettingsContentModel ??= this._register(new DefaultSettings(this.getMostCommonlyUsedSettings(), target, this.configurationService));
        return this._defaultUserSettingsContentModel;
    }
    async getEditableSettingsURI(configurationTarget, resource) {
        switch (configurationTarget) {
            case 1 /* ConfigurationTarget.APPLICATION */:
                return this.userDataProfilesService.defaultProfile.settingsResource;
            case 2 /* ConfigurationTarget.USER */:
            case 3 /* ConfigurationTarget.USER_LOCAL */:
                return this.userSettingsResource;
            case 4 /* ConfigurationTarget.USER_REMOTE */: {
                const remoteEnvironment = await this.remoteAgentService.getEnvironment();
                return remoteEnvironment ? remoteEnvironment.settingsPath : null;
            }
            case 5 /* ConfigurationTarget.WORKSPACE */:
                return this.workspaceSettingsResource;
            case 6 /* ConfigurationTarget.WORKSPACE_FOLDER */:
                if (resource) {
                    return this.getFolderSettingsResource(resource);
                }
        }
        return null;
    }
    async createSettingsIfNotExists(target, resource) {
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ &&
            target === 5 /* ConfigurationTarget.WORKSPACE */) {
            const workspaceConfig = this.contextService.getWorkspace().configuration;
            if (!workspaceConfig) {
                return;
            }
            const content = await this.textFileService.read(workspaceConfig);
            if (Object.keys(parse(content.value)).indexOf('settings') === -1) {
                await this.jsonEditingService.write(resource, [{ path: ['settings'], value: {} }], true);
            }
            return undefined;
        }
        await this.createIfNotExists(resource, emptyEditableSettingsContent);
    }
    async createIfNotExists(resource, contents) {
        try {
            await this.textFileService.read(resource, { acceptTextOnly: true });
        }
        catch (error) {
            if (error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                try {
                    await this.textFileService.write(resource, contents);
                    return;
                }
                catch (error2) {
                    throw new Error(nls.localize('fail.createSettings', "Unable to create '{0}' ({1}).", this.labelService.getUriLabel(resource, { relative: true }), getErrorMessage(error2)));
                }
            }
            else {
                throw error;
            }
        }
    }
    getMostCommonlyUsedSettings() {
        return [
            'files.autoSave',
            'editor.fontSize',
            'editor.fontFamily',
            'editor.tabSize',
            'editor.renderWhitespace',
            'editor.cursorStyle',
            'editor.multiCursorModifier',
            'editor.insertSpaces',
            'editor.wordWrap',
            'files.exclude',
            'files.associations',
            'workbench.editor.enablePreview',
        ];
    }
    async revealSetting(settingKey, edit, editor, settingsResource) {
        const codeEditor = editor ? getCodeEditor(editor.getControl()) : null;
        if (!codeEditor) {
            return;
        }
        const settingsModel = await this.createPreferencesEditorModel(settingsResource);
        if (!settingsModel) {
            return;
        }
        const position = await this.getPositionToReveal(settingKey, edit, settingsModel, codeEditor);
        if (position) {
            codeEditor.setPosition(position);
            codeEditor.revealPositionNearTop(position);
            codeEditor.focus();
            if (edit) {
                SuggestController.get(codeEditor)?.triggerSuggest();
            }
        }
    }
    async getPositionToReveal(settingKey, edit, settingsModel, codeEditor) {
        const model = codeEditor.getModel();
        if (!model) {
            return null;
        }
        const schema = Registry.as(Extensions.Configuration).getConfigurationProperties()[settingKey];
        const isOverrideProperty = OVERRIDE_PROPERTY_REGEX.test(settingKey);
        if (!schema && !isOverrideProperty) {
            return null;
        }
        let position = null;
        const type = schema?.type ?? 'object'; /* Type not defined or is an Override Identifier */
        let setting = settingsModel.getPreference(settingKey);
        if (!setting && edit) {
            let defaultValue = type === 'object' || type === 'array'
                ? this.configurationService.inspect(settingKey).defaultValue
                : getDefaultValue(type);
            defaultValue = defaultValue === undefined && isOverrideProperty ? {} : defaultValue;
            if (defaultValue !== undefined) {
                const key = settingsModel instanceof WorkspaceConfigurationEditorModel
                    ? ['settings', settingKey]
                    : [settingKey];
                await this.jsonEditingService.write(settingsModel.uri, [{ path: key, value: defaultValue }], false);
                setting = settingsModel.getPreference(settingKey);
            }
        }
        if (setting) {
            if (edit) {
                if (isObject(setting.value) || Array.isArray(setting.value)) {
                    position = {
                        lineNumber: setting.valueRange.startLineNumber,
                        column: setting.valueRange.startColumn + 1,
                    };
                    codeEditor.setPosition(position);
                    await CoreEditingCommands.LineBreakInsert.runEditorCommand(null, codeEditor, null);
                    position = {
                        lineNumber: position.lineNumber + 1,
                        column: model.getLineMaxColumn(position.lineNumber + 1),
                    };
                    const firstNonWhiteSpaceColumn = model.getLineFirstNonWhitespaceColumn(position.lineNumber);
                    if (firstNonWhiteSpaceColumn) {
                        // Line has some text. Insert another new line.
                        codeEditor.setPosition({
                            lineNumber: position.lineNumber,
                            column: firstNonWhiteSpaceColumn,
                        });
                        await CoreEditingCommands.LineBreakInsert.runEditorCommand(null, codeEditor, null);
                        position = {
                            lineNumber: position.lineNumber,
                            column: model.getLineMaxColumn(position.lineNumber),
                        };
                    }
                }
                else {
                    position = {
                        lineNumber: setting.valueRange.startLineNumber,
                        column: setting.valueRange.endColumn,
                    };
                }
            }
            else {
                position = {
                    lineNumber: setting.keyRange.startLineNumber,
                    column: setting.keyRange.startColumn,
                };
            }
        }
        return position;
    }
    getSetting(settingId) {
        if (!this._settingsGroups) {
            const defaultSettings = this.getDefaultSettings(2 /* ConfigurationTarget.USER */);
            const defaultsChangedDisposable = this._register(new MutableDisposable());
            defaultsChangedDisposable.value = defaultSettings.onDidChange(() => {
                this._settingsGroups = undefined;
                defaultsChangedDisposable.clear();
            });
            this._settingsGroups = defaultSettings.getSettingsGroups();
        }
        for (const group of this._settingsGroups) {
            for (const section of group.sections) {
                for (const setting of section.settings) {
                    if (compareIgnoreCase(setting.key, settingId) === 0) {
                        return setting;
                    }
                }
            }
        }
        return undefined;
    }
    /**
     * Should be of the format:
     * 	code://settings/settingName
     * Examples:
     * 	code://settings/files.autoSave
     *
     */
    async handleURL(uri) {
        if (compareIgnoreCase(uri.authority, SETTINGS_AUTHORITY) !== 0) {
            return false;
        }
        const settingInfo = uri.path.split('/').filter((part) => !!part);
        const settingId = settingInfo.length > 0 ? settingInfo[0] : undefined;
        if (!settingId) {
            this.openSettings();
            return true;
        }
        let setting = this.getSetting(settingId);
        if (!setting && this.extensionService.extensions.length === 0) {
            // wait for extension points to be processed
            await this.progressService.withProgress({ location: 10 /* ProgressLocation.Window */ }, () => Event.toPromise(this.extensionService.onDidRegisterExtensions));
            setting = this.getSetting(settingId);
        }
        const openSettingsOptions = {};
        if (setting) {
            openSettingsOptions.query = settingId;
        }
        this.openSettings(openSettingsOptions);
        return true;
    }
    dispose() {
        if (this._cachedSettingsEditor2Input && !this._cachedSettingsEditor2Input.isDisposed()) {
            this._cachedSettingsEditor2Input.dispose();
        }
        this._onDispose.fire();
        super.dispose();
    }
};
PreferencesService = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService),
    __param(2, ITextFileService),
    __param(3, IConfigurationService),
    __param(4, INotificationService),
    __param(5, IWorkspaceContextService),
    __param(6, IInstantiationService),
    __param(7, IUserDataProfileService),
    __param(8, IUserDataProfilesService),
    __param(9, ITextModelService),
    __param(10, IKeybindingService),
    __param(11, IModelService),
    __param(12, IJSONEditingService),
    __param(13, ILabelService),
    __param(14, IRemoteAgentService),
    __param(15, ITextEditorService),
    __param(16, IURLService),
    __param(17, IExtensionService),
    __param(18, IProgressService)
], PreferencesService);
export { PreferencesService };
registerSingleton(IPreferencesService, PreferencesService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ByZWZlcmVuY2VzL2Jyb3dzZXIvcHJlZmVyZW5jZXNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFlLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEYsT0FBTyxFQUFFLGFBQWEsRUFBZSxNQUFNLDZDQUE2QyxDQUFBO0FBRXhGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZix1QkFBdUIsR0FDdkIsTUFBTSxvRUFBb0UsQ0FBQTtBQUUzRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixF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