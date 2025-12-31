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
var FilesConfigurationService_1;
import { localize } from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { RawContextKey, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { AutoSaveConfiguration, HotExitConfiguration, FILES_READONLY_INCLUDE_CONFIG, FILES_READONLY_EXCLUDE_CONFIG, IFileService, hasReadonlyCapability, } from '../../../../platform/files/common/files.js';
import { equals } from '../../../../base/common/objects.js';
import { isWeb } from '../../../../base/common/platform.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ResourceGlobMatcher } from '../../../common/resources.js';
import { GlobalIdleValue } from '../../../../base/common/async.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { LRUCache, ResourceMap } from '../../../../base/common/map.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
export const AutoSaveAfterShortDelayContext = new RawContextKey('autoSaveAfterShortDelayContext', false, true);
export var AutoSaveMode;
(function (AutoSaveMode) {
    AutoSaveMode[AutoSaveMode["OFF"] = 0] = "OFF";
    AutoSaveMode[AutoSaveMode["AFTER_SHORT_DELAY"] = 1] = "AFTER_SHORT_DELAY";
    AutoSaveMode[AutoSaveMode["AFTER_LONG_DELAY"] = 2] = "AFTER_LONG_DELAY";
    AutoSaveMode[AutoSaveMode["ON_FOCUS_CHANGE"] = 3] = "ON_FOCUS_CHANGE";
    AutoSaveMode[AutoSaveMode["ON_WINDOW_CHANGE"] = 4] = "ON_WINDOW_CHANGE";
})(AutoSaveMode || (AutoSaveMode = {}));
export var AutoSaveDisabledReason;
(function (AutoSaveDisabledReason) {
    AutoSaveDisabledReason[AutoSaveDisabledReason["SETTINGS"] = 1] = "SETTINGS";
    AutoSaveDisabledReason[AutoSaveDisabledReason["OUT_OF_WORKSPACE"] = 2] = "OUT_OF_WORKSPACE";
    AutoSaveDisabledReason[AutoSaveDisabledReason["ERRORS"] = 3] = "ERRORS";
    AutoSaveDisabledReason[AutoSaveDisabledReason["DISABLED"] = 4] = "DISABLED";
})(AutoSaveDisabledReason || (AutoSaveDisabledReason = {}));
export const IFilesConfigurationService = createDecorator('filesConfigurationService');
let FilesConfigurationService = class FilesConfigurationService extends Disposable {
    static { FilesConfigurationService_1 = this; }
    static { this.DEFAULT_AUTO_SAVE_MODE = isWeb
        ? AutoSaveConfiguration.AFTER_DELAY
        : AutoSaveConfiguration.OFF; }
    static { this.DEFAULT_AUTO_SAVE_DELAY = 1000; }
    static { this.READONLY_MESSAGES = {
        providerReadonly: {
            value: localize('providerReadonly', 'Editor is read-only because the file system of the file is read-only.'),
            isTrusted: true,
        },
        sessionReadonly: {
            value: localize({
                key: 'sessionReadonly',
                comment: [
                    'Please do not translate the word "command", it is part of our internal syntax which must not change',
                    '{Locked="](command:{0})"}',
                ],
            }, 'Editor is read-only because the file was set read-only in this session. [Click here](command:{0}) to set writeable.', 'workbench.action.files.setActiveEditorWriteableInSession'),
            isTrusted: true,
        },
        configuredReadonly: {
            value: localize({
                key: 'configuredReadonly',
                comment: [
                    'Please do not translate the word "command", it is part of our internal syntax which must not change',
                    '{Locked="](command:{0})"}',
                ],
            }, 'Editor is read-only because the file was set read-only via settings. [Click here](command:{0}) to configure or [toggle for this session](command:{1}).', `workbench.action.openSettings?${encodeURIComponent('["files.readonly"]')}`, 'workbench.action.files.toggleActiveEditorReadonlyInSession'),
            isTrusted: true,
        },
        fileLocked: {
            value: localize({
                key: 'fileLocked',
                comment: [
                    'Please do not translate the word "command", it is part of our internal syntax which must not change',
                    '{Locked="](command:{0})"}',
                ],
            }, 'Editor is read-only because of file permissions. [Click here](command:{0}) to set writeable anyway.', 'workbench.action.files.setActiveEditorWriteableInSession'),
            isTrusted: true,
        },
        fileReadonly: {
            value: localize('fileReadonly', 'Editor is read-only because the file is read-only.'),
            isTrusted: true,
        },
    }; }
    constructor(contextKeyService, configurationService, contextService, environmentService, uriIdentityService, fileService, markerService, textResourceConfigurationService) {
        super();
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.environmentService = environmentService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.markerService = markerService;
        this.textResourceConfigurationService = textResourceConfigurationService;
        this._onDidChangeAutoSaveConfiguration = this._register(new Emitter());
        this.onDidChangeAutoSaveConfiguration = this._onDidChangeAutoSaveConfiguration.event;
        this._onDidChangeAutoSaveDisabled = this._register(new Emitter());
        this.onDidChangeAutoSaveDisabled = this._onDidChangeAutoSaveDisabled.event;
        this._onDidChangeFilesAssociation = this._register(new Emitter());
        this.onDidChangeFilesAssociation = this._onDidChangeFilesAssociation.event;
        this._onDidChangeReadonly = this._register(new Emitter());
        this.onDidChangeReadonly = this._onDidChangeReadonly.event;
        this.autoSaveConfigurationCache = new LRUCache(1000);
        this.autoSaveAfterShortDelayOverrides = new ResourceMap();
        this.autoSaveDisabledOverrides = new ResourceMap();
        this.readonlyIncludeMatcher = this._register(new GlobalIdleValue(() => this.createReadonlyMatcher(FILES_READONLY_INCLUDE_CONFIG)));
        this.readonlyExcludeMatcher = this._register(new GlobalIdleValue(() => this.createReadonlyMatcher(FILES_READONLY_EXCLUDE_CONFIG)));
        this.sessionReadonlyOverrides = new ResourceMap((resource) => this.uriIdentityService.extUri.getComparisonKey(resource));
        this.autoSaveAfterShortDelayContext = AutoSaveAfterShortDelayContext.bindTo(contextKeyService);
        const configuration = configurationService.getValue();
        this.currentGlobalAutoSaveConfiguration = this.computeAutoSaveConfiguration(undefined, configuration.files);
        this.currentFilesAssociationConfiguration = configuration?.files?.associations;
        this.currentHotExitConfiguration = configuration?.files?.hotExit || HotExitConfiguration.ON_EXIT;
        this.onFilesConfigurationChange(configuration, false);
        this.registerListeners();
    }
    createReadonlyMatcher(config) {
        const matcher = this._register(new ResourceGlobMatcher((resource) => this.configurationService.getValue(config, { resource }), (event) => event.affectsConfiguration(config), this.contextService, this.configurationService));
        this._register(matcher.onExpressionChange(() => this._onDidChangeReadonly.fire()));
        return matcher;
    }
    isReadonly(resource, stat) {
        // if the entire file system provider is readonly, we respect that
        // and do not allow to change readonly. we take this as a hint that
        // the provider has no capabilities of writing.
        const provider = this.fileService.getProvider(resource.scheme);
        if (provider && hasReadonlyCapability(provider)) {
            return (provider.readOnlyMessage ?? FilesConfigurationService_1.READONLY_MESSAGES.providerReadonly);
        }
        // session override always wins over the others
        const sessionReadonlyOverride = this.sessionReadonlyOverrides.get(resource);
        if (typeof sessionReadonlyOverride === 'boolean') {
            return sessionReadonlyOverride === true
                ? FilesConfigurationService_1.READONLY_MESSAGES.sessionReadonly
                : false;
        }
        if (this.uriIdentityService.extUri.isEqualOrParent(resource, this.environmentService.userRoamingDataHome) ||
            this.uriIdentityService.extUri.isEqual(resource, this.contextService.getWorkspace().configuration ?? undefined)) {
            return false; // explicitly exclude some paths from readonly that we need for configuration
        }
        // configured glob patterns win over stat information
        if (this.readonlyIncludeMatcher.value.matches(resource)) {
            return !this.readonlyExcludeMatcher.value.matches(resource)
                ? FilesConfigurationService_1.READONLY_MESSAGES.configuredReadonly
                : false;
        }
        // check if file is locked and configured to treat as readonly
        if (this.configuredReadonlyFromPermissions && stat?.locked) {
            return FilesConfigurationService_1.READONLY_MESSAGES.fileLocked;
        }
        // check if file is marked readonly from the file system provider
        if (stat?.readonly) {
            return FilesConfigurationService_1.READONLY_MESSAGES.fileReadonly;
        }
        return false;
    }
    async updateReadonly(resource, readonly) {
        if (readonly === 'toggle') {
            let stat = undefined;
            try {
                stat = await this.fileService.resolve(resource, { resolveMetadata: true });
            }
            catch (error) {
                // ignore
            }
            readonly = !this.isReadonly(resource, stat);
        }
        if (readonly === 'reset') {
            this.sessionReadonlyOverrides.delete(resource);
        }
        else {
            this.sessionReadonlyOverrides.set(resource, readonly);
        }
        this._onDidChangeReadonly.fire();
    }
    registerListeners() {
        // Files configuration changes
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('files')) {
                this.onFilesConfigurationChange(this.configurationService.getValue(), true);
            }
        }));
    }
    onFilesConfigurationChange(configuration, fromEvent) {
        // Auto Save
        this.currentGlobalAutoSaveConfiguration = this.computeAutoSaveConfiguration(undefined, configuration.files);
        this.autoSaveConfigurationCache.clear();
        this.autoSaveAfterShortDelayContext.set(this.getAutoSaveMode(undefined).mode === 1 /* AutoSaveMode.AFTER_SHORT_DELAY */);
        if (fromEvent) {
            this._onDidChangeAutoSaveConfiguration.fire();
        }
        // Check for change in files associations
        const filesAssociation = configuration?.files?.associations;
        if (!equals(this.currentFilesAssociationConfiguration, filesAssociation)) {
            this.currentFilesAssociationConfiguration = filesAssociation;
            if (fromEvent) {
                this._onDidChangeFilesAssociation.fire();
            }
        }
        // Hot exit
        const hotExitMode = configuration?.files?.hotExit;
        if (hotExitMode === HotExitConfiguration.OFF ||
            hotExitMode === HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE) {
            this.currentHotExitConfiguration = hotExitMode;
        }
        else {
            this.currentHotExitConfiguration = HotExitConfiguration.ON_EXIT;
        }
        // Readonly
        const readonlyFromPermissions = Boolean(configuration?.files?.readonlyFromPermissions);
        if (readonlyFromPermissions !== Boolean(this.configuredReadonlyFromPermissions)) {
            this.configuredReadonlyFromPermissions = readonlyFromPermissions;
            if (fromEvent) {
                this._onDidChangeReadonly.fire();
            }
        }
    }
    getAutoSaveConfiguration(resourceOrEditor) {
        const resource = this.toResource(resourceOrEditor);
        if (resource) {
            let resourceAutoSaveConfiguration = this.autoSaveConfigurationCache.get(resource);
            if (!resourceAutoSaveConfiguration) {
                resourceAutoSaveConfiguration = this.computeAutoSaveConfiguration(resource, this.textResourceConfigurationService.getValue(resource, 'files'));
                this.autoSaveConfigurationCache.set(resource, resourceAutoSaveConfiguration);
            }
            return resourceAutoSaveConfiguration;
        }
        return this.currentGlobalAutoSaveConfiguration;
    }
    computeAutoSaveConfiguration(resource, filesConfiguration) {
        let autoSave;
        let autoSaveDelay;
        let autoSaveWorkspaceFilesOnly;
        let autoSaveWhenNoErrors;
        let isOutOfWorkspace;
        let isShortAutoSaveDelay;
        switch (filesConfiguration?.autoSave ?? FilesConfigurationService_1.DEFAULT_AUTO_SAVE_MODE) {
            case AutoSaveConfiguration.AFTER_DELAY: {
                autoSave = 'afterDelay';
                autoSaveDelay =
                    typeof filesConfiguration?.autoSaveDelay === 'number' &&
                        filesConfiguration.autoSaveDelay >= 0
                        ? filesConfiguration.autoSaveDelay
                        : FilesConfigurationService_1.DEFAULT_AUTO_SAVE_DELAY;
                isShortAutoSaveDelay = autoSaveDelay <= FilesConfigurationService_1.DEFAULT_AUTO_SAVE_DELAY;
                break;
            }
            case AutoSaveConfiguration.ON_FOCUS_CHANGE:
                autoSave = 'onFocusChange';
                break;
            case AutoSaveConfiguration.ON_WINDOW_CHANGE:
                autoSave = 'onWindowChange';
                break;
        }
        if (filesConfiguration?.autoSaveWorkspaceFilesOnly === true) {
            autoSaveWorkspaceFilesOnly = true;
            if (resource && !this.contextService.isInsideWorkspace(resource)) {
                isOutOfWorkspace = true;
                isShortAutoSaveDelay = undefined; // out of workspace file are not auto saved with this configuration
            }
        }
        if (filesConfiguration?.autoSaveWhenNoErrors === true) {
            autoSaveWhenNoErrors = true;
            isShortAutoSaveDelay = undefined; // this configuration disables short auto save delay
        }
        return {
            autoSave,
            autoSaveDelay,
            autoSaveWorkspaceFilesOnly,
            autoSaveWhenNoErrors,
            isOutOfWorkspace,
            isShortAutoSaveDelay,
        };
    }
    toResource(resourceOrEditor) {
        if (resourceOrEditor instanceof EditorInput) {
            return EditorResourceAccessor.getOriginalUri(resourceOrEditor, {
                supportSideBySide: SideBySideEditor.PRIMARY,
            });
        }
        return resourceOrEditor;
    }
    hasShortAutoSaveDelay(resourceOrEditor) {
        const resource = this.toResource(resourceOrEditor);
        if (resource && this.autoSaveAfterShortDelayOverrides.has(resource)) {
            return true; // overridden to be enabled after short delay
        }
        if (this.getAutoSaveConfiguration(resource).isShortAutoSaveDelay) {
            return !resource || !this.autoSaveDisabledOverrides.has(resource);
        }
        return false;
    }
    getAutoSaveMode(resourceOrEditor, saveReason) {
        const resource = this.toResource(resourceOrEditor);
        if (resource && this.autoSaveAfterShortDelayOverrides.has(resource)) {
            return { mode: 1 /* AutoSaveMode.AFTER_SHORT_DELAY */ }; // overridden to be enabled after short delay
        }
        if (resource && this.autoSaveDisabledOverrides.has(resource)) {
            return { mode: 0 /* AutoSaveMode.OFF */, reason: 4 /* AutoSaveDisabledReason.DISABLED */ };
        }
        const autoSaveConfiguration = this.getAutoSaveConfiguration(resource);
        if (typeof autoSaveConfiguration.autoSave === 'undefined') {
            return { mode: 0 /* AutoSaveMode.OFF */, reason: 1 /* AutoSaveDisabledReason.SETTINGS */ };
        }
        if (typeof saveReason === 'number') {
            if ((autoSaveConfiguration.autoSave === 'afterDelay' && saveReason !== 2 /* SaveReason.AUTO */) ||
                (autoSaveConfiguration.autoSave === 'onFocusChange' &&
                    saveReason !== 3 /* SaveReason.FOCUS_CHANGE */ &&
                    saveReason !== 4 /* SaveReason.WINDOW_CHANGE */) ||
                (autoSaveConfiguration.autoSave === 'onWindowChange' &&
                    saveReason !== 4 /* SaveReason.WINDOW_CHANGE */)) {
                return { mode: 0 /* AutoSaveMode.OFF */, reason: 1 /* AutoSaveDisabledReason.SETTINGS */ };
            }
        }
        if (resource) {
            if (autoSaveConfiguration.autoSaveWorkspaceFilesOnly &&
                autoSaveConfiguration.isOutOfWorkspace) {
                return { mode: 0 /* AutoSaveMode.OFF */, reason: 2 /* AutoSaveDisabledReason.OUT_OF_WORKSPACE */ };
            }
            if (autoSaveConfiguration.autoSaveWhenNoErrors &&
                this.markerService.read({ resource, take: 1, severities: MarkerSeverity.Error }).length > 0) {
                return { mode: 0 /* AutoSaveMode.OFF */, reason: 3 /* AutoSaveDisabledReason.ERRORS */ };
            }
        }
        switch (autoSaveConfiguration.autoSave) {
            case 'afterDelay':
                if (typeof autoSaveConfiguration.autoSaveDelay === 'number' &&
                    autoSaveConfiguration.autoSaveDelay <= FilesConfigurationService_1.DEFAULT_AUTO_SAVE_DELAY) {
                    // Explicitly mark auto save configurations as long running
                    // if they are configured to not run when there are errors.
                    // The rationale here is that errors may come in after auto
                    // save has been scheduled and then further delay the auto
                    // save until resolved.
                    return {
                        mode: autoSaveConfiguration.autoSaveWhenNoErrors
                            ? 2 /* AutoSaveMode.AFTER_LONG_DELAY */
                            : 1 /* AutoSaveMode.AFTER_SHORT_DELAY */,
                    };
                }
                return { mode: 2 /* AutoSaveMode.AFTER_LONG_DELAY */ };
            case 'onFocusChange':
                return { mode: 3 /* AutoSaveMode.ON_FOCUS_CHANGE */ };
            case 'onWindowChange':
                return { mode: 4 /* AutoSaveMode.ON_WINDOW_CHANGE */ };
        }
    }
    async toggleAutoSave() {
        const currentSetting = this.configurationService.getValue('files.autoSave');
        let newAutoSaveValue;
        if ([
            AutoSaveConfiguration.AFTER_DELAY,
            AutoSaveConfiguration.ON_FOCUS_CHANGE,
            AutoSaveConfiguration.ON_WINDOW_CHANGE,
        ].some((setting) => setting === currentSetting)) {
            newAutoSaveValue = AutoSaveConfiguration.OFF;
        }
        else {
            newAutoSaveValue = AutoSaveConfiguration.AFTER_DELAY;
        }
        return this.configurationService.updateValue('files.autoSave', newAutoSaveValue);
    }
    enableAutoSaveAfterShortDelay(resourceOrEditor) {
        const resource = this.toResource(resourceOrEditor);
        if (!resource) {
            return Disposable.None;
        }
        const counter = this.autoSaveAfterShortDelayOverrides.get(resource) ?? 0;
        this.autoSaveAfterShortDelayOverrides.set(resource, counter + 1);
        return toDisposable(() => {
            const counter = this.autoSaveAfterShortDelayOverrides.get(resource) ?? 0;
            if (counter <= 1) {
                this.autoSaveAfterShortDelayOverrides.delete(resource);
            }
            else {
                this.autoSaveAfterShortDelayOverrides.set(resource, counter - 1);
            }
        });
    }
    disableAutoSave(resourceOrEditor) {
        const resource = this.toResource(resourceOrEditor);
        if (!resource) {
            return Disposable.None;
        }
        const counter = this.autoSaveDisabledOverrides.get(resource) ?? 0;
        this.autoSaveDisabledOverrides.set(resource, counter + 1);
        if (counter === 0) {
            this._onDidChangeAutoSaveDisabled.fire(resource);
        }
        return toDisposable(() => {
            const counter = this.autoSaveDisabledOverrides.get(resource) ?? 0;
            if (counter <= 1) {
                this.autoSaveDisabledOverrides.delete(resource);
                this._onDidChangeAutoSaveDisabled.fire(resource);
            }
            else {
                this.autoSaveDisabledOverrides.set(resource, counter - 1);
            }
        });
    }
    get isHotExitEnabled() {
        if (this.contextService.getWorkspace().transient) {
            // Transient workspace: hot exit is disabled because
            // transient workspaces are not restored upon restart
            return false;
        }
        return this.currentHotExitConfiguration !== HotExitConfiguration.OFF;
    }
    get hotExitConfiguration() {
        return this.currentHotExitConfiguration;
    }
    preventSaveConflicts(resource, language) {
        return (this.configurationService.getValue('files.saveConflictResolution', {
            resource,
            overrideIdentifier: language,
        }) !== 'overwriteFileOnDisk');
    }
};
FilesConfigurationService = FilesConfigurationService_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, IConfigurationService),
    __param(2, IWorkspaceContextService),
    __param(3, IEnvironmentService),
    __param(4, IUriIdentityService),
    __param(5, IFileService),
    __param(6, IMarkerService),
    __param(7, ITextResourceConfigurationService)
], FilesConfigurationService);
export { FilesConfigurationService };
registerSingleton(IFilesConfigurationService, FilesConfigurationService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXNDb25maWd1cmF0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9maWxlc0NvbmZpZ3VyYXRpb24vY29tbW9uL2ZpbGVzQ29uZmlndXJhdGlvblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVGLE9BQU8sRUFDTixhQUFhLEVBQ2Isa0JBQWtCLEdBRWxCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLHFCQUFxQixFQUNyQixvQkFBb0IsRUFDcEIsNkJBQTZCLEVBQzdCLDZCQUE2QixFQUU3QixZQUFZLEVBRVoscUJBQXFCLEdBRXJCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtD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