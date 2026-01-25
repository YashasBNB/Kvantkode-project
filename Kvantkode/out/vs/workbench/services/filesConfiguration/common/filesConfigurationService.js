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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXNDb25maWd1cmF0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2ZpbGVzQ29uZmlndXJhdGlvbi9jb21tb24vZmlsZXNDb25maWd1cmF0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUYsT0FBTyxFQUNOLGFBQWEsRUFDYixrQkFBa0IsR0FFbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4scUJBQXFCLEVBQ3JCLG9CQUFvQixFQUNwQiw2QkFBNkIsRUFDN0IsNkJBQTZCLEVBRTdCLFlBQVksRUFFWixxQkFBcUIsR0FFckIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxr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