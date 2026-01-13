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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbkVkaXRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uL2NvbW1vbi9jb25maWd1cmF0aW9uRWRpdGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBS3JFLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsbUNBQW1DLEVBQ25DLHVCQUF1QixFQUN2Qix3QkFBd0IsRUFDeEIsOEJBQThCLEVBQzlCLGFBQWEsRUFDYixhQUFhLEVBQ2IsOEJBQThCLEVBQzlCLGtCQUFrQixFQUNsQixxQkFBcUIsR0FDckIsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBR04sWUFBWSxHQUNaLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEVBRXJDLDBCQUEwQixFQUMxQix1QkFBdUIsR0FDdkIsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsY0FB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