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
import * as nls from '../../../../nls.js';
import * as json from '../../../../base/common/json.js';
import { setProperty } from '../../../../base/common/jsonEdit.js';
import { Queue } from '../../../../base/common/async.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { FOLDER_SETTINGS_PATH, WORKSPACE_STANDALONE_CONFIGURATIONS, TASKS_CONFIGURATION_KEY, LAUNCH_CONFIGURATION_KEY, USER_STANDALONE_CONFIGURATIONS, TASKS_DEFAULT, FOLDER_SCOPES, IWorkbenchConfigurationService, APPLICATION_SCOPES, MCP_CONFIGURATION_KEY, } from './configuration.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { Extensions as ConfigurationExtensions, keyFromOverrideIdentifiers, OVERRIDE_PROPERTY_REGEX, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IPreferencesService } from '../../preferences/common/preferences.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { ErrorNoTelemetry } from '../../../../base/common/errors.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
export var ConfigurationEditingErrorCode;
(function (ConfigurationEditingErrorCode) {
    /**
     * Error when trying to write a configuration key that is not registered.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_UNKNOWN_KEY"] = 0] = "ERROR_UNKNOWN_KEY";
    /**
     * Error when trying to write an application setting into workspace settings.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION"] = 1] = "ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION";
    /**
     * Error when trying to write a machne setting into workspace settings.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE"] = 2] = "ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE";
    /**
     * Error when trying to write an invalid folder configuration key to folder settings.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INVALID_FOLDER_CONFIGURATION"] = 3] = "ERROR_INVALID_FOLDER_CONFIGURATION";
    /**
     * Error when trying to write to user target but not supported for provided key.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INVALID_USER_TARGET"] = 4] = "ERROR_INVALID_USER_TARGET";
    /**
     * Error when trying to write to user target but not supported for provided key.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INVALID_WORKSPACE_TARGET"] = 5] = "ERROR_INVALID_WORKSPACE_TARGET";
    /**
     * Error when trying to write a configuration key to folder target
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INVALID_FOLDER_TARGET"] = 6] = "ERROR_INVALID_FOLDER_TARGET";
    /**
     * Error when trying to write to language specific setting but not supported for preovided key
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INVALID_RESOURCE_LANGUAGE_CONFIGURATION"] = 7] = "ERROR_INVALID_RESOURCE_LANGUAGE_CONFIGURATION";
    /**
     * Error when trying to write to the workspace configuration without having a workspace opened.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_NO_WORKSPACE_OPENED"] = 8] = "ERROR_NO_WORKSPACE_OPENED";
    /**
     * Error when trying to write and save to the configuration file while it is dirty in the editor.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_CONFIGURATION_FILE_DIRTY"] = 9] = "ERROR_CONFIGURATION_FILE_DIRTY";
    /**
     * Error when trying to write and save to the configuration file while it is not the latest in the disk.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_CONFIGURATION_FILE_MODIFIED_SINCE"] = 10] = "ERROR_CONFIGURATION_FILE_MODIFIED_SINCE";
    /**
     * Error when trying to write to a configuration file that contains JSON errors.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INVALID_CONFIGURATION"] = 11] = "ERROR_INVALID_CONFIGURATION";
    /**
     * Error when trying to write a policy configuration
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_POLICY_CONFIGURATION"] = 12] = "ERROR_POLICY_CONFIGURATION";
    /**
     * Internal Error.
     */
    ConfigurationEditingErrorCode[ConfigurationEditingErrorCode["ERROR_INTERNAL"] = 13] = "ERROR_INTERNAL";
})(ConfigurationEditingErrorCode || (ConfigurationEditingErrorCode = {}));
export class ConfigurationEditingError extends ErrorNoTelemetry {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
export var EditableConfigurationTarget;
(function (EditableConfigurationTarget) {
    EditableConfigurationTarget[EditableConfigurationTarget["USER_LOCAL"] = 1] = "USER_LOCAL";
    EditableConfigurationTarget[EditableConfigurationTarget["USER_REMOTE"] = 2] = "USER_REMOTE";
    EditableConfigurationTarget[EditableConfigurationTarget["WORKSPACE"] = 3] = "WORKSPACE";
    EditableConfigurationTarget[EditableConfigurationTarget["WORKSPACE_FOLDER"] = 4] = "WORKSPACE_FOLDER";
})(EditableConfigurationTarget || (EditableConfigurationTarget = {}));
let ConfigurationEditing = class ConfigurationEditing {
    constructor(remoteSettingsResource, configurationService, contextService, userDataProfileService, userDataProfilesService, fileService, textModelResolverService, textFileService, notificationService, preferencesService, editorService, uriIdentityService, filesConfigurationService) {
        this.remoteSettingsResource = remoteSettingsResource;
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.fileService = fileService;
        this.textModelResolverService = textModelResolverService;
        this.textFileService = textFileService;
        this.notificationService = notificationService;
        this.preferencesService = preferencesService;
        this.editorService = editorService;
        this.uriIdentityService = uriIdentityService;
        this.filesConfigurationService = filesConfigurationService;
        this.queue = new Queue();
    }
    async writeConfiguration(target, value, options = {}) {
        const operation = this.getConfigurationEditOperation(target, value, options.scopes || {});
        // queue up writes to prevent race conditions
        return this.queue.queue(async () => {
            try {
                await this.doWriteConfiguration(operation, options);
            }
            catch (error) {
                if (options.donotNotifyError) {
                    throw error;
                }
                await this.onError(error, operation, options.scopes);
            }
        });
    }
    async doWriteConfiguration(operation, options) {
        await this.validate(operation.target, operation, !options.handleDirtyFile, options.scopes || {});
        const resource = operation.resource;
        const reference = await this.resolveModelReference(resource);
        try {
            const formattingOptions = this.getFormattingOptions(reference.object.textEditorModel);
            await this.updateConfiguration(operation, reference.object.textEditorModel, formattingOptions, options);
        }
        finally {
            reference.dispose();
        }
    }
    async updateConfiguration(operation, model, formattingOptions, options) {
        if (this.hasParseErrors(model.getValue(), operation)) {
            throw this.toConfigurationEditingError(11 /* ConfigurationEditingErrorCode.ERROR_INVALID_CONFIGURATION */, operation.target, operation);
        }
        if (this.textFileService.isDirty(model.uri) && options.handleDirtyFile) {
            switch (options.handleDirtyFile) {
                case 'save':
                    await this.save(model, operation);
                    break;
                case 'revert':
                    await this.textFileService.revert(model.uri);
                    break;
            }
        }
        const edit = this.getEdits(operation, model.getValue(), formattingOptions)[0];
        if (edit) {
            let disposable;
            try {
                // Optimization: we apply edits to a text model and save it
                // right after. Use the files config service to signal this
                // to the workbench to optimise the UI during this operation.
                // For example, avoids to briefly show dirty indicators.
                disposable = this.filesConfigurationService.enableAutoSaveAfterShortDelay(model.uri);
                if (this.applyEditsToBuffer(edit, model)) {
                    await this.save(model, operation);
                }
            }
            finally {
                disposable?.dispose();
            }
        }
    }
    async save(model, operation) {
        try {
            await this.textFileService.save(model.uri, { ignoreErrorHandler: true });
        }
        catch (error) {
            if (error.fileOperationResult === 3 /* FileOperationResult.FILE_MODIFIED_SINCE */) {
                throw this.toConfigurationEditingError(10 /* ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_MODIFIED_SINCE */, operation.target, operation);
            }
            throw new ConfigurationEditingError(nls.localize('fsError', 'Error while writing to {0}. {1}', this.stringifyTarget(operation.target), error.message), 13 /* ConfigurationEditingErrorCode.ERROR_INTERNAL */);
        }
    }
    applyEditsToBuffer(edit, model) {
        const startPosition = model.getPositionAt(edit.offset);
        const endPosition = model.getPositionAt(edit.offset + edit.length);
        const range = new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column);
        const currentText = model.getValueInRange(range);
        if (edit.content !== currentText) {
            const editOperation = currentText
                ? EditOperation.replace(range, edit.content)
                : EditOperation.insert(startPosition, edit.content);
            model.pushEditOperations([
                new Selection(startPosition.lineNumber, startPosition.column, startPosition.lineNumber, startPosition.column),
            ], [editOperation], () => []);
            return true;
        }
        return false;
    }
    getEdits({ value, jsonPath }, modelContent, formattingOptions) {
        if (jsonPath.length) {
            return setProperty(modelContent, jsonPath, value, formattingOptions);
        }
        // Without jsonPath, the entire configuration file is being replaced, so we just use JSON.stringify
        const content = JSON.stringify(value, null, formattingOptions.insertSpaces && formattingOptions.tabSize
            ? ' '.repeat(formattingOptions.tabSize)
            : '\t');
        return [
            {
                content,
                length: modelContent.length,
                offset: 0,
            },
        ];
    }
    getFormattingOptions(model) {
        const { insertSpaces, tabSize } = model.getOptions();
        const eol = model.getEOL();
        return { insertSpaces, tabSize, eol };
    }
    async onError(error, operation, scopes) {
        switch (error.code) {
            case 11 /* ConfigurationEditingErrorCode.ERROR_INVALID_CONFIGURATION */:
                this.onInvalidConfigurationError(error, operation);
                break;
            case 9 /* ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY */:
                this.onConfigurationFileDirtyError(error, operation, scopes);
                break;
            case 10 /* ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_MODIFIED_SINCE */:
                return this.doWriteConfiguration(operation, { scopes, handleDirtyFile: 'revert' });
            default:
                this.notificationService.error(error.message);
        }
    }
    onInvalidConfigurationError(error, operation) {
        const openStandAloneConfigurationActionLabel = operation.workspaceStandAloneConfigurationKey === TASKS_CONFIGURATION_KEY
            ? nls.localize('openTasksConfiguration', 'Open Tasks Configuration')
            : operation.workspaceStandAloneConfigurationKey === LAUNCH_CONFIGURATION_KEY
                ? nls.localize('openLaunchConfiguration', 'Open Launch Configuration')
                : operation.workspaceStandAloneConfigurationKey === MCP_CONFIGURATION_KEY
                    ? nls.localize('openMcpConfiguration', 'Open MCP Configuration')
                    : null;
        if (openStandAloneConfigurationActionLabel) {
            this.notificationService.prompt(Severity.Error, error.message, [
                {
                    label: openStandAloneConfigurationActionLabel,
                    run: () => this.openFile(operation.resource),
                },
            ]);
        }
        else {
            this.notificationService.prompt(Severity.Error, error.message, [
                {
                    label: nls.localize('open', 'Open Settings'),
                    run: () => this.openSettings(operation),
                },
            ]);
        }
    }
    onConfigurationFileDirtyError(error, operation, scopes) {
        const openStandAloneConfigurationActionLabel = operation.workspaceStandAloneConfigurationKey === TASKS_CONFIGURATION_KEY
            ? nls.localize('openTasksConfiguration', 'Open Tasks Configuration')
            : operation.workspaceStandAloneConfigurationKey === LAUNCH_CONFIGURATION_KEY
                ? nls.localize('openLaunchConfiguration', 'Open Launch Configuration')
                : null;
        if (openStandAloneConfigurationActionLabel) {
            this.notificationService.prompt(Severity.Error, error.message, [
                {
                    label: nls.localize('saveAndRetry', 'Save and Retry'),
                    run: () => {
                        const key = operation.key
                            ? `${operation.workspaceStandAloneConfigurationKey}.${operation.key}`
                            : operation.workspaceStandAloneConfigurationKey;
                        this.writeConfiguration(operation.target, { key, value: operation.value }, { handleDirtyFile: 'save', scopes });
                    },
                },
                {
                    label: openStandAloneConfigurationActionLabel,
                    run: () => this.openFile(operation.resource),
                },
            ]);
        }
        else {
            this.notificationService.prompt(Severity.Error, error.message, [
                {
                    label: nls.localize('saveAndRetry', 'Save and Retry'),
                    run: () => this.writeConfiguration(operation.target, { key: operation.key, value: operation.value }, { handleDirtyFile: 'save', scopes }),
                },
                {
                    label: nls.localize('open', 'Open Settings'),
                    run: () => this.openSettings(operation),
                },
            ]);
        }
    }
    openSettings(operation) {
        const options = { jsonEditor: true };
        switch (operation.target) {
            case 1 /* EditableConfigurationTarget.USER_LOCAL */:
                this.preferencesService.openUserSettings(options);
                break;
            case 2 /* EditableConfigurationTarget.USER_REMOTE */:
                this.preferencesService.openRemoteSettings(options);
                break;
            case 3 /* EditableConfigurationTarget.WORKSPACE */:
                this.preferencesService.openWorkspaceSettings(options);
                break;
            case 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */:
                if (operation.resource) {
                    const workspaceFolder = this.contextService.getWorkspaceFolder(operation.resource);
                    if (workspaceFolder) {
                        this.preferencesService.openFolderSettings({
                            folderUri: workspaceFolder.uri,
                            jsonEditor: true,
                        });
                    }
                }
                break;
        }
    }
    openFile(resource) {
        this.editorService.openEditor({ resource, options: { pinned: true } });
    }
    toConfigurationEditingError(code, target, operation) {
        const message = this.toErrorMessage(code, target, operation);
        return new ConfigurationEditingError(message, code);
    }
    toErrorMessage(error, target, operation) {
        switch (error) {
            // API constraints
            case 12 /* ConfigurationEditingErrorCode.ERROR_POLICY_CONFIGURATION */:
                return nls.localize('errorPolicyConfiguration', 'Unable to write {0} because it is configured in system policy.', operation.key);
            case 0 /* ConfigurationEditingErrorCode.ERROR_UNKNOWN_KEY */:
                return nls.localize('errorUnknownKey', 'Unable to write to {0} because {1} is not a registered configuration.', this.stringifyTarget(target), operation.key);
            case 1 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION */:
                return nls.localize('errorInvalidWorkspaceConfigurationApplication', 'Unable to write {0} to Workspace Settings. This setting can be written only into User settings.', operation.key);
            case 2 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE */:
                return nls.localize('errorInvalidWorkspaceConfigurationMachine', 'Unable to write {0} to Workspace Settings. This setting can be written only into User settings.', operation.key);
            case 3 /* ConfigurationEditingErrorCode.ERROR_INVALID_FOLDER_CONFIGURATION */:
                return nls.localize('errorInvalidFolderConfiguration', 'Unable to write to Folder Settings because {0} does not support the folder resource scope.', operation.key);
            case 4 /* ConfigurationEditingErrorCode.ERROR_INVALID_USER_TARGET */:
                return nls.localize('errorInvalidUserTarget', 'Unable to write to User Settings because {0} does not support for global scope.', operation.key);
            case 5 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_TARGET */:
                return nls.localize('errorInvalidWorkspaceTarget', 'Unable to write to Workspace Settings because {0} does not support for workspace scope in a multi folder workspace.', operation.key);
            case 6 /* ConfigurationEditingErrorCode.ERROR_INVALID_FOLDER_TARGET */:
                return nls.localize('errorInvalidFolderTarget', 'Unable to write to Folder Settings because no resource is provided.');
            case 7 /* ConfigurationEditingErrorCode.ERROR_INVALID_RESOURCE_LANGUAGE_CONFIGURATION */:
                return nls.localize('errorInvalidResourceLanguageConfiguration', 'Unable to write to Language Settings because {0} is not a resource language setting.', operation.key);
            case 8 /* ConfigurationEditingErrorCode.ERROR_NO_WORKSPACE_OPENED */:
                return nls.localize('errorNoWorkspaceOpened', 'Unable to write to {0} because no workspace is opened. Please open a workspace first and try again.', this.stringifyTarget(target));
            // User issues
            case 11 /* ConfigurationEditingErrorCode.ERROR_INVALID_CONFIGURATION */: {
                if (operation.workspaceStandAloneConfigurationKey === TASKS_CONFIGURATION_KEY) {
                    return nls.localize('errorInvalidTaskConfiguration', 'Unable to write into the tasks configuration file. Please open it to correct errors/warnings in it and try again.');
                }
                if (operation.workspaceStandAloneConfigurationKey === LAUNCH_CONFIGURATION_KEY) {
                    return nls.localize('errorInvalidLaunchConfiguration', 'Unable to write into the launch configuration file. Please open it to correct errors/warnings in it and try again.');
                }
                if (operation.workspaceStandAloneConfigurationKey === MCP_CONFIGURATION_KEY) {
                    return nls.localize('errorInvalidMCPConfiguration', 'Unable to write into the MCP configuration file. Please open it to correct errors/warnings in it and try again.');
                }
                switch (target) {
                    case 1 /* EditableConfigurationTarget.USER_LOCAL */:
                        return nls.localize('errorInvalidConfiguration', 'Unable to write into user settings. Please open the user settings to correct errors/warnings in it and try again.');
                    case 2 /* EditableConfigurationTarget.USER_REMOTE */:
                        return nls.localize('errorInvalidRemoteConfiguration', 'Unable to write into remote user settings. Please open the remote user settings to correct errors/warnings in it and try again.');
                    case 3 /* EditableConfigurationTarget.WORKSPACE */:
                        return nls.localize('errorInvalidConfigurationWorkspace', 'Unable to write into workspace settings. Please open the workspace settings to correct errors/warnings in the file and try again.');
                    case 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */: {
                        let workspaceFolderName = '<<unknown>>';
                        if (operation.resource) {
                            const folder = this.contextService.getWorkspaceFolder(operation.resource);
                            if (folder) {
                                workspaceFolderName = folder.name;
                            }
                        }
                        return nls.localize('errorInvalidConfigurationFolder', "Unable to write into folder settings. Please open the '{0}' folder settings to correct errors/warnings in it and try again.", workspaceFolderName);
                    }
                    default:
                        return '';
                }
            }
            case 9 /* ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY */: {
                if (operation.workspaceStandAloneConfigurationKey === TASKS_CONFIGURATION_KEY) {
                    return nls.localize('errorTasksConfigurationFileDirty', 'Unable to write into tasks configuration file because the file has unsaved changes. Please save it first and then try again.');
                }
                if (operation.workspaceStandAloneConfigurationKey === LAUNCH_CONFIGURATION_KEY) {
                    return nls.localize('errorLaunchConfigurationFileDirty', 'Unable to write into launch configuration file because the file has unsaved changes. Please save it first and then try again.');
                }
                if (operation.workspaceStandAloneConfigurationKey === MCP_CONFIGURATION_KEY) {
                    return nls.localize('errorMCPConfigurationFileDirty', 'Unable to write into MCP configuration file because the file has unsaved changes. Please save it first and then try again.');
                }
                switch (target) {
                    case 1 /* EditableConfigurationTarget.USER_LOCAL */:
                        return nls.localize('errorConfigurationFileDirty', 'Unable to write into user settings because the file has unsaved changes. Please save the user settings file first and then try again.');
                    case 2 /* EditableConfigurationTarget.USER_REMOTE */:
                        return nls.localize('errorRemoteConfigurationFileDirty', 'Unable to write into remote user settings because the file has unsaved changes. Please save the remote user settings file first and then try again.');
                    case 3 /* EditableConfigurationTarget.WORKSPACE */:
                        return nls.localize('errorConfigurationFileDirtyWorkspace', 'Unable to write into workspace settings because the file has unsaved changes. Please save the workspace settings file first and then try again.');
                    case 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */: {
                        let workspaceFolderName = '<<unknown>>';
                        if (operation.resource) {
                            const folder = this.contextService.getWorkspaceFolder(operation.resource);
                            if (folder) {
                                workspaceFolderName = folder.name;
                            }
                        }
                        return nls.localize('errorConfigurationFileDirtyFolder', "Unable to write into folder settings because the file has unsaved changes. Please save the '{0}' folder settings file first and then try again.", workspaceFolderName);
                    }
                    default:
                        return '';
                }
            }
            case 10 /* ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_MODIFIED_SINCE */:
                if (operation.workspaceStandAloneConfigurationKey === TASKS_CONFIGURATION_KEY) {
                    return nls.localize('errorTasksConfigurationFileModifiedSince', 'Unable to write into tasks configuration file because the content of the file is newer.');
                }
                if (operation.workspaceStandAloneConfigurationKey === LAUNCH_CONFIGURATION_KEY) {
                    return nls.localize('errorLaunchConfigurationFileModifiedSince', 'Unable to write into launch configuration file because the content of the file is newer.');
                }
                if (operation.workspaceStandAloneConfigurationKey === MCP_CONFIGURATION_KEY) {
                    return nls.localize('errorMCPConfigurationFileModifiedSince', 'Unable to write into MCP configuration file because the content of the file is newer.');
                }
                switch (target) {
                    case 1 /* EditableConfigurationTarget.USER_LOCAL */:
                        return nls.localize('errorConfigurationFileModifiedSince', 'Unable to write into user settings because the content of the file is newer.');
                    case 2 /* EditableConfigurationTarget.USER_REMOTE */:
                        return nls.localize('errorRemoteConfigurationFileModifiedSince', 'Unable to write into remote user settings because the content of the file is newer.');
                    case 3 /* EditableConfigurationTarget.WORKSPACE */:
                        return nls.localize('errorConfigurationFileModifiedSinceWorkspace', 'Unable to write into workspace settings because the content of the file is newer.');
                    case 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */:
                        return nls.localize('errorConfigurationFileModifiedSinceFolder', 'Unable to write into folder settings because the content of the file is newer.');
                }
            case 13 /* ConfigurationEditingErrorCode.ERROR_INTERNAL */:
                return nls.localize('errorUnknown', 'Unable to write to {0} because of an internal error.', this.stringifyTarget(target));
        }
    }
    stringifyTarget(target) {
        switch (target) {
            case 1 /* EditableConfigurationTarget.USER_LOCAL */:
                return nls.localize('userTarget', 'User Settings');
            case 2 /* EditableConfigurationTarget.USER_REMOTE */:
                return nls.localize('remoteUserTarget', 'Remote User Settings');
            case 3 /* EditableConfigurationTarget.WORKSPACE */:
                return nls.localize('workspaceTarget', 'Workspace Settings');
            case 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */:
                return nls.localize('folderTarget', 'Folder Settings');
            default:
                return '';
        }
    }
    defaultResourceValue(resource) {
        const basename = this.uriIdentityService.extUri.basename(resource);
        const configurationValue = basename.substr(0, basename.length - this.uriIdentityService.extUri.extname(resource).length);
        switch (configurationValue) {
            case TASKS_CONFIGURATION_KEY:
                return TASKS_DEFAULT;
            default:
                return '{}';
        }
    }
    async resolveModelReference(resource) {
        const exists = await this.fileService.exists(resource);
        if (!exists) {
            await this.textFileService.write(resource, this.defaultResourceValue(resource), {
                encoding: 'utf8',
            });
        }
        return this.textModelResolverService.createModelReference(resource);
    }
    hasParseErrors(content, operation) {
        // If we write to a workspace standalone file and replace the entire contents (no key provided)
        // we can return here because any parse errors can safely be ignored since all contents are replaced
        if (operation.workspaceStandAloneConfigurationKey && !operation.key) {
            return false;
        }
        const parseErrors = [];
        json.parse(content, parseErrors, { allowTrailingComma: true, allowEmptyContent: true });
        return parseErrors.length > 0;
    }
    async validate(target, operation, checkDirty, overrides) {
        if (this.configurationService.inspect(operation.key).policyValue !== undefined) {
            throw this.toConfigurationEditingError(12 /* ConfigurationEditingErrorCode.ERROR_POLICY_CONFIGURATION */, target, operation);
        }
        const configurationProperties = Registry.as(ConfigurationExtensions.Configuration).getConfigurationProperties();
        const configurationScope = configurationProperties[operation.key]?.scope;
        /**
         * Key to update must be a known setting from the registry unless
         * 	- the key is standalone configuration (eg: tasks, debug)
         * 	- the key is an override identifier
         * 	- the operation is to delete the key
         */
        if (!operation.workspaceStandAloneConfigurationKey) {
            const validKeys = this.configurationService.keys().default;
            if (validKeys.indexOf(operation.key) < 0 &&
                !OVERRIDE_PROPERTY_REGEX.test(operation.key) &&
                operation.value !== undefined) {
                throw this.toConfigurationEditingError(0 /* ConfigurationEditingErrorCode.ERROR_UNKNOWN_KEY */, target, operation);
            }
        }
        if (operation.workspaceStandAloneConfigurationKey) {
            // Global launches are not supported
            if (operation.workspaceStandAloneConfigurationKey !== TASKS_CONFIGURATION_KEY &&
                operation.workspaceStandAloneConfigurationKey !== MCP_CONFIGURATION_KEY &&
                (target === 1 /* EditableConfigurationTarget.USER_LOCAL */ ||
                    target === 2 /* EditableConfigurationTarget.USER_REMOTE */)) {
                throw this.toConfigurationEditingError(4 /* ConfigurationEditingErrorCode.ERROR_INVALID_USER_TARGET */, target, operation);
            }
        }
        // Target cannot be workspace or folder if no workspace opened
        if ((target === 3 /* EditableConfigurationTarget.WORKSPACE */ ||
            target === 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */) &&
            this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            throw this.toConfigurationEditingError(8 /* ConfigurationEditingErrorCode.ERROR_NO_WORKSPACE_OPENED */, target, operation);
        }
        if (target === 3 /* EditableConfigurationTarget.WORKSPACE */) {
            if (!operation.workspaceStandAloneConfigurationKey &&
                !OVERRIDE_PROPERTY_REGEX.test(operation.key)) {
                if (configurationScope && APPLICATION_SCOPES.includes(configurationScope)) {
                    throw this.toConfigurationEditingError(1 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION */, target, operation);
                }
                if (configurationScope === 2 /* ConfigurationScope.MACHINE */) {
                    throw this.toConfigurationEditingError(2 /* ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE */, target, operation);
                }
            }
        }
        if (target === 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */) {
            if (!operation.resource) {
                throw this.toConfigurationEditingError(6 /* ConfigurationEditingErrorCode.ERROR_INVALID_FOLDER_TARGET */, target, operation);
            }
            if (!operation.workspaceStandAloneConfigurationKey &&
                !OVERRIDE_PROPERTY_REGEX.test(operation.key)) {
                if (configurationScope !== undefined && !FOLDER_SCOPES.includes(configurationScope)) {
                    throw this.toConfigurationEditingError(3 /* ConfigurationEditingErrorCode.ERROR_INVALID_FOLDER_CONFIGURATION */, target, operation);
                }
            }
        }
        if (overrides.overrideIdentifiers?.length) {
            if (configurationScope !== 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */) {
                throw this.toConfigurationEditingError(7 /* ConfigurationEditingErrorCode.ERROR_INVALID_RESOURCE_LANGUAGE_CONFIGURATION */, target, operation);
            }
        }
        if (!operation.resource) {
            throw this.toConfigurationEditingError(6 /* ConfigurationEditingErrorCode.ERROR_INVALID_FOLDER_TARGET */, target, operation);
        }
        if (checkDirty && this.textFileService.isDirty(operation.resource)) {
            throw this.toConfigurationEditingError(9 /* ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY */, target, operation);
        }
    }
    getConfigurationEditOperation(target, config, overrides) {
        // Check for standalone workspace configurations
        if (config.key) {
            const standaloneConfigurationMap = target === 1 /* EditableConfigurationTarget.USER_LOCAL */
                ? USER_STANDALONE_CONFIGURATIONS
                : WORKSPACE_STANDALONE_CONFIGURATIONS;
            const standaloneConfigurationKeys = Object.keys(standaloneConfigurationMap);
            for (const key of standaloneConfigurationKeys) {
                const resource = this.getConfigurationFileResource(target, key, standaloneConfigurationMap[key], overrides.resource, undefined);
                // Check for prefix
                const keyRemainsNested = this.isWorkspaceConfigurationResource(resource) ||
                    resource?.fsPath === this.userDataProfileService.currentProfile.settingsResource.fsPath;
                if (config.key === key) {
                    const jsonPath = keyRemainsNested ? [key] : [];
                    return {
                        key: jsonPath[jsonPath.length - 1],
                        jsonPath,
                        value: config.value,
                        resource: resource ?? undefined,
                        workspaceStandAloneConfigurationKey: key,
                        target,
                    };
                }
                // Check for prefix.<setting>
                const keyPrefix = `${key}.`;
                if (config.key.indexOf(keyPrefix) === 0) {
                    const jsonPath = keyRemainsNested
                        ? [key, config.key.substr(keyPrefix.length)]
                        : [config.key.substr(keyPrefix.length)];
                    return {
                        key: jsonPath[jsonPath.length - 1],
                        jsonPath,
                        value: config.value,
                        resource: resource ?? undefined,
                        workspaceStandAloneConfigurationKey: key,
                        target,
                    };
                }
            }
        }
        const key = config.key;
        const configurationProperties = Registry.as(ConfigurationExtensions.Configuration).getConfigurationProperties();
        const configurationScope = configurationProperties[key]?.scope;
        let jsonPath = overrides.overrideIdentifiers?.length
            ? [keyFromOverrideIdentifiers(overrides.overrideIdentifiers), key]
            : [key];
        if (target === 1 /* EditableConfigurationTarget.USER_LOCAL */ ||
            target === 2 /* EditableConfigurationTarget.USER_REMOTE */) {
            return {
                key,
                jsonPath,
                value: config.value,
                resource: this.getConfigurationFileResource(target, key, '', null, configurationScope) ?? undefined,
                target,
            };
        }
        const resource = this.getConfigurationFileResource(target, key, FOLDER_SETTINGS_PATH, overrides.resource, configurationScope);
        if (this.isWorkspaceConfigurationResource(resource)) {
            jsonPath = ['settings', ...jsonPath];
        }
        return { key, jsonPath, value: config.value, resource: resource ?? undefined, target };
    }
    isWorkspaceConfigurationResource(resource) {
        const workspace = this.contextService.getWorkspace();
        return !!(workspace.configuration &&
            resource &&
            workspace.configuration.fsPath === resource.fsPath);
    }
    getConfigurationFileResource(target, key, relativePath, resource, scope) {
        if (target === 1 /* EditableConfigurationTarget.USER_LOCAL */) {
            if (key === TASKS_CONFIGURATION_KEY) {
                return this.userDataProfileService.currentProfile.tasksResource;
            }
            else {
                if (!this.userDataProfileService.currentProfile.isDefault &&
                    this.configurationService.isSettingAppliedForAllProfiles(key)) {
                    return this.userDataProfilesService.defaultProfile.settingsResource;
                }
                return this.userDataProfileService.currentProfile.settingsResource;
            }
        }
        if (target === 2 /* EditableConfigurationTarget.USER_REMOTE */) {
            return this.remoteSettingsResource;
        }
        const workbenchState = this.contextService.getWorkbenchState();
        if (workbenchState !== 1 /* WorkbenchState.EMPTY */) {
            const workspace = this.contextService.getWorkspace();
            if (target === 3 /* EditableConfigurationTarget.WORKSPACE */) {
                if (workbenchState === 3 /* WorkbenchState.WORKSPACE */) {
                    return workspace.configuration ?? null;
                }
                if (workbenchState === 2 /* WorkbenchState.FOLDER */) {
                    return workspace.folders[0].toResource(relativePath);
                }
            }
            if (target === 4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */) {
                if (resource) {
                    const folder = this.contextService.getWorkspaceFolder(resource);
                    if (folder) {
                        return folder.toResource(relativePath);
                    }
                }
            }
        }
        return null;
    }
};
ConfigurationEditing = __decorate([
    __param(1, IWorkbenchConfigurationService),
    __param(2, IWorkspaceContextService),
    __param(3, IUserDataProfileService),
    __param(4, IUserDataProfilesService),
    __param(5, IFileService),
    __param(6, ITextModelService),
    __param(7, ITextFileService),
    __param(8, INotificationService),
    __param(9, IPreferencesService),
    __param(10, IEditorService),
    __param(11, IUriIdentityService),
    __param(12, IFilesConfigurationService)
], ConfigurationEditing);
export { ConfigurationEditing };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbkVkaXRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvbi9jb21tb24vY29uZmlndXJhdGlvbkVkaXRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUtyRSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLG1DQUFtQyxFQUNuQyx1QkFBdUIsRUFDdkIsd0JBQXdCLEVBQ3hCLDhCQUE4QixFQUM5QixhQUFhLEVBQ2IsYUFBYSxFQUNiLDhCQUE4QixFQUM5QixrQkFBa0IsRUFDbEIscUJBQXFCLEdBQ3JCLE1BQU0sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUdOLFlBQVksR0FDWixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixFQUVyQywwQkFBMEIsRUFDMUIsdUJBQXVCLEdBQ3ZCLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFB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