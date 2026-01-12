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
var UserDataProfilesEditorModel_1;
import { Action, Separator, toAction } from '../../../../base/common/actions.js';
import { Emitter } from '../../../../base/common/event.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { isUserDataProfile, IUserDataProfilesService, toUserDataProfile, } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { isProfileURL, IUserDataProfileImportExportService, IUserDataProfileManagementService, IUserDataProfileService, } from '../../../services/userDataProfile/common/userDataProfile.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import * as arrays from '../../../../base/common/arrays.js';
import { equals } from '../../../../base/common/objects.js';
import { EditorModel } from '../../../common/editor/editorModel.js';
import { ExtensionsResourceExportTreeItem, ExtensionsResourceImportTreeItem, } from '../../../services/userDataProfile/browser/extensionsResource.js';
import { SettingsResource, SettingsResourceTreeItem, } from '../../../services/userDataProfile/browser/settingsResource.js';
import { KeybindingsResource, KeybindingsResourceTreeItem, } from '../../../services/userDataProfile/browser/keybindingsResource.js';
import { TasksResource, TasksResourceTreeItem, } from '../../../services/userDataProfile/browser/tasksResource.js';
import { SnippetsResource, SnippetsResourceTreeItem, } from '../../../services/userDataProfile/browser/snippetsResource.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { InMemoryFileSystemProvider } from '../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { createCancelablePromise, RunOnceScheduler, } from '../../../../base/common/async.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { CONFIG_NEW_WINDOW_PROFILE } from '../../../common/configuration.js';
import { ResourceMap, ResourceSet } from '../../../../base/common/map.js';
import { getErrorMessage } from '../../../../base/common/errors.js';
import { isWeb } from '../../../../base/common/platform.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IWorkspaceContextService, WORKSPACE_SUFFIX, } from '../../../../platform/workspace/common/workspace.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { isString } from '../../../../base/common/types.js';
import { IWorkbenchExtensionManagementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
export function isProfileResourceTypeElement(element) {
    return element.resourceType !== undefined;
}
export function isProfileResourceChildElement(element) {
    return element.label !== undefined;
}
let AbstractUserDataProfileElement = class AbstractUserDataProfileElement extends Disposable {
    constructor(name, icon, flags, workspaces, isActive, userDataProfileManagementService, userDataProfilesService, commandService, workspaceContextService, hostService, uriIdentityService, fileService, extensionManagementService, instantiationService) {
        super();
        this.userDataProfileManagementService = userDataProfileManagementService;
        this.userDataProfilesService = userDataProfilesService;
        this.commandService = commandService;
        this.workspaceContextService = workspaceContextService;
        this.hostService = hostService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.extensionManagementService = extensionManagementService;
        this.instantiationService = instantiationService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.saveScheduler = this._register(new RunOnceScheduler(() => this.doSave(), 500));
        this._name = '';
        this._active = false;
        this._disabled = false;
        this._name = name;
        this._icon = icon;
        this._flags = flags;
        this._workspaces = workspaces;
        this._active = isActive;
        this._register(this.onDidChange((e) => {
            if (!e.message) {
                this.validate();
            }
            this.save();
        }));
        this._register(this.extensionManagementService.onProfileAwareDidInstallExtensions((results) => {
            const profile = this.getProfileToWatch();
            if (profile &&
                results.some((r) => !r.error &&
                    (r.applicationScoped ||
                        this.uriIdentityService.extUri.isEqual(r.profileLocation, profile.extensionsResource)))) {
                this._onDidChange.fire({ extensions: true });
            }
        }));
        this._register(this.extensionManagementService.onProfileAwareDidUninstallExtension((e) => {
            const profile = this.getProfileToWatch();
            if (profile &&
                !e.error &&
                (e.applicationScoped ||
                    this.uriIdentityService.extUri.isEqual(e.profileLocation, profile.extensionsResource))) {
                this._onDidChange.fire({ extensions: true });
            }
        }));
        this._register(this.extensionManagementService.onProfileAwareDidUpdateExtensionMetadata((e) => {
            const profile = this.getProfileToWatch();
            if ((profile && e.local.isApplicationScoped) ||
                this.uriIdentityService.extUri.isEqual(e.profileLocation, profile?.extensionsResource)) {
                this._onDidChange.fire({ extensions: true });
            }
        }));
    }
    get name() {
        return this._name;
    }
    set name(name) {
        name = name.trim();
        if (this._name !== name) {
            this._name = name;
            this._onDidChange.fire({ name: true });
        }
    }
    get icon() {
        return this._icon;
    }
    set icon(icon) {
        if (this._icon !== icon) {
            this._icon = icon;
            this._onDidChange.fire({ icon: true });
        }
    }
    get workspaces() {
        return this._workspaces;
    }
    set workspaces(workspaces) {
        if (!arrays.equals(this._workspaces, workspaces, (a, b) => a.toString() === b.toString())) {
            this._workspaces = workspaces;
            this._onDidChange.fire({ workspaces: true });
        }
    }
    get flags() {
        return this._flags;
    }
    set flags(flags) {
        if (!equals(this._flags, flags)) {
            this._flags = flags;
            this._onDidChange.fire({ flags: true });
        }
    }
    get active() {
        return this._active;
    }
    set active(active) {
        if (this._active !== active) {
            this._active = active;
            this._onDidChange.fire({ active: true });
        }
    }
    get message() {
        return this._message;
    }
    set message(message) {
        if (this._message !== message) {
            this._message = message;
            this._onDidChange.fire({ message: true });
        }
    }
    get disabled() {
        return this._disabled;
    }
    set disabled(saving) {
        if (this._disabled !== saving) {
            this._disabled = saving;
            this._onDidChange.fire({ disabled: true });
        }
    }
    getFlag(key) {
        return this.flags?.[key] ?? false;
    }
    setFlag(key, value) {
        const flags = this.flags ? { ...this.flags } : {};
        if (value) {
            flags[key] = true;
        }
        else {
            delete flags[key];
        }
        this.flags = flags;
    }
    validate() {
        if (!this.name) {
            this.message = localize('name required', 'Profile name is required and must be a non-empty value.');
            return;
        }
        if (this.shouldValidateName() &&
            this.name !== this.getInitialName() &&
            this.userDataProfilesService.profiles.some((p) => p.name === this.name)) {
            this.message = localize('profileExists', 'Profile with name {0} already exists.', this.name);
            return;
        }
        if (this.flags &&
            this.flags.settings &&
            this.flags.keybindings &&
            this.flags.tasks &&
            this.flags.snippets &&
            this.flags.extensions) {
            this.message = localize('invalid configurations', 'The profile should contain at least one configuration.');
            return;
        }
        this.message = undefined;
    }
    async getChildren(resourceType) {
        if (resourceType === undefined) {
            const resourceTypes = [
                "settings" /* ProfileResourceType.Settings */,
                "keybindings" /* ProfileResourceType.Keybindings */,
                "tasks" /* ProfileResourceType.Tasks */,
                "snippets" /* ProfileResourceType.Snippets */,
                "extensions" /* ProfileResourceType.Extensions */,
            ];
            return Promise.all(resourceTypes.map(async (r) => {
                const children = r === "settings" /* ProfileResourceType.Settings */ ||
                    r === "keybindings" /* ProfileResourceType.Keybindings */ ||
                    r === "tasks" /* ProfileResourceType.Tasks */
                    ? await this.getChildrenForResourceType(r)
                    : [];
                return {
                    handle: r,
                    checkbox: undefined,
                    resourceType: r,
                    openAction: children.length
                        ? toAction({
                            id: '_open',
                            label: localize('open', 'Open to the Side'),
                            class: ThemeIcon.asClassName(Codicon.goToFile),
                            run: () => children[0]?.openAction?.run(),
                        })
                        : undefined,
                };
            }));
        }
        return this.getChildrenForResourceType(resourceType);
    }
    async getChildrenForResourceType(resourceType) {
        return [];
    }
    async getChildrenFromProfile(profile, resourceType) {
        profile = this.getFlag(resourceType) ? this.userDataProfilesService.defaultProfile : profile;
        let children = [];
        switch (resourceType) {
            case "settings" /* ProfileResourceType.Settings */:
                children = await this.instantiationService
                    .createInstance(SettingsResourceTreeItem, profile)
                    .getChildren();
                break;
            case "keybindings" /* ProfileResourceType.Keybindings */:
                children = await this.instantiationService
                    .createInstance(KeybindingsResourceTreeItem, profile)
                    .getChildren();
                break;
            case "snippets" /* ProfileResourceType.Snippets */:
                children =
                    (await this.instantiationService
                        .createInstance(SnippetsResourceTreeItem, profile)
                        .getChildren()) ?? [];
                break;
            case "tasks" /* ProfileResourceType.Tasks */:
                children = await this.instantiationService
                    .createInstance(TasksResourceTreeItem, profile)
                    .getChildren();
                break;
            case "extensions" /* ProfileResourceType.Extensions */:
                children = await this.instantiationService
                    .createInstance(ExtensionsResourceExportTreeItem, profile)
                    .getChildren();
                break;
        }
        return children.map((child) => this.toUserDataProfileResourceChildElement(child));
    }
    toUserDataProfileResourceChildElement(child, primaryActions, contextMenuActions) {
        return {
            handle: child.handle,
            checkbox: child.checkbox,
            label: child.label?.label ?? '',
            description: isString(child.description) ? child.description : undefined,
            resource: URI.revive(child.resourceUri),
            icon: child.themeIcon,
            openAction: toAction({
                id: '_openChild',
                label: localize('open', 'Open to the Side'),
                class: ThemeIcon.asClassName(Codicon.goToFile),
                run: async () => {
                    if (child.parent.type === "extensions" /* ProfileResourceType.Extensions */) {
                        await this.commandService.executeCommand('extension.open', child.handle, undefined, true, undefined, true);
                    }
                    else if (child.resourceUri) {
                        await this.commandService.executeCommand(API_OPEN_EDITOR_COMMAND_ID, child.resourceUri, [SIDE_GROUP], undefined);
                    }
                },
            }),
            actions: {
                primary: primaryActions,
                contextMenu: contextMenuActions,
            },
        };
    }
    getInitialName() {
        return '';
    }
    shouldValidateName() {
        return true;
    }
    getCurrentWorkspace() {
        const workspace = this.workspaceContextService.getWorkspace();
        return workspace.configuration ?? workspace.folders[0]?.uri;
    }
    openWorkspace(workspace) {
        if (this.uriIdentityService.extUri.extname(workspace) === WORKSPACE_SUFFIX) {
            this.hostService.openWindow([{ workspaceUri: workspace }], { forceNewWindow: true });
        }
        else {
            this.hostService.openWindow([{ folderUri: workspace }], { forceNewWindow: true });
        }
    }
    save() {
        this.saveScheduler.schedule();
    }
    hasUnsavedChanges(profile) {
        if (this.name !== profile.name) {
            return true;
        }
        if (this.icon !== profile.icon) {
            return true;
        }
        if (!equals(this.flags ?? {}, profile.useDefaultFlags ?? {})) {
            return true;
        }
        if (!arrays.equals(this.workspaces ?? [], profile.workspaces ?? [], (a, b) => a.toString() === b.toString())) {
            return true;
        }
        return false;
    }
    async saveProfile(profile) {
        if (!this.hasUnsavedChanges(profile)) {
            return;
        }
        this.validate();
        if (this.message) {
            return;
        }
        const useDefaultFlags = this.flags
            ? this.flags.settings &&
                this.flags.keybindings &&
                this.flags.tasks &&
                this.flags.globalState &&
                this.flags.extensions
                ? undefined
                : this.flags
            : undefined;
        return await this.userDataProfileManagementService.updateProfile(profile, {
            name: this.name,
            icon: this.icon,
            useDefaultFlags: profile.useDefaultFlags && !useDefaultFlags ? {} : useDefaultFlags,
            workspaces: this.workspaces,
        });
    }
};
AbstractUserDataProfileElement = __decorate([
    __param(5, IUserDataProfileManagementService),
    __param(6, IUserDataProfilesService),
    __param(7, ICommandService),
    __param(8, IWorkspaceContextService),
    __param(9, IHostService),
    __param(10, IUriIdentityService),
    __param(11, IFileService),
    __param(12, IWorkbenchExtensionManagementService),
    __param(13, IInstantiationService)
], AbstractUserDataProfileElement);
export { AbstractUserDataProfileElement };
let UserDataProfileElement = class UserDataProfileElement extends AbstractUserDataProfileElement {
    get profile() {
        return this._profile;
    }
    constructor(_profile, titleButtons, actions, userDataProfileService, configurationService, userDataProfileManagementService, userDataProfilesService, commandService, workspaceContextService, hostService, uriIdentityService, fileService, extensionManagementService, instantiationService) {
        super(_profile.name, _profile.icon, _profile.useDefaultFlags, _profile.workspaces, userDataProfileService.currentProfile.id === _profile.id, userDataProfileManagementService, userDataProfilesService, commandService, workspaceContextService, hostService, uriIdentityService, fileService, extensionManagementService, instantiationService);
        this._profile = _profile;
        this.titleButtons = titleButtons;
        this.actions = actions;
        this.userDataProfileService = userDataProfileService;
        this.configurationService = configurationService;
        this._isNewWindowProfile = false;
        this._isNewWindowProfile =
            this.configurationService.getValue(CONFIG_NEW_WINDOW_PROFILE) === this.profile.name;
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(CONFIG_NEW_WINDOW_PROFILE)) {
                this.isNewWindowProfile =
                    this.configurationService.getValue(CONFIG_NEW_WINDOW_PROFILE) === this.profile.name;
            }
        }));
        this._register(this.userDataProfileService.onDidChangeCurrentProfile(() => (this.active = this.userDataProfileService.currentProfile.id === this.profile.id)));
        this._register(this.userDataProfilesService.onDidChangeProfiles(({ updated }) => {
            const profile = updated.find((p) => p.id === this.profile.id);
            if (profile) {
                this._profile = profile;
                this.reset();
                this._onDidChange.fire({ profile: true });
            }
        }));
        this._register(fileService.watch(this.profile.snippetsHome));
        this._register(fileService.onDidFilesChange((e) => {
            if (e.affects(this.profile.snippetsHome)) {
                this._onDidChange.fire({ snippets: true });
            }
        }));
    }
    getProfileToWatch() {
        return this.profile;
    }
    reset() {
        this.name = this._profile.name;
        this.icon = this._profile.icon;
        this.flags = this._profile.useDefaultFlags;
        this.workspaces = this._profile.workspaces;
    }
    updateWorkspaces(toAdd, toRemove) {
        const workspaces = new ResourceSet(this.workspaces ?? []);
        for (const workspace of toAdd) {
            workspaces.add(workspace);
        }
        for (const workspace of toRemove) {
            workspaces.delete(workspace);
        }
        this.workspaces = [...workspaces.values()];
    }
    async toggleNewWindowProfile() {
        if (this._isNewWindowProfile) {
            await this.configurationService.updateValue(CONFIG_NEW_WINDOW_PROFILE, null);
        }
        else {
            await this.configurationService.updateValue(CONFIG_NEW_WINDOW_PROFILE, this.profile.name);
        }
    }
    get isNewWindowProfile() {
        return this._isNewWindowProfile;
    }
    set isNewWindowProfile(isNewWindowProfile) {
        if (this._isNewWindowProfile !== isNewWindowProfile) {
            this._isNewWindowProfile = isNewWindowProfile;
            this._onDidChange.fire({ newWindowProfile: true });
        }
    }
    async toggleCurrentWindowProfile() {
        if (this.userDataProfileService.currentProfile.id === this.profile.id) {
            await this.userDataProfileManagementService.switchProfile(this.userDataProfilesService.defaultProfile);
        }
        else {
            await this.userDataProfileManagementService.switchProfile(this.profile);
        }
    }
    async doSave() {
        await this.saveProfile(this.profile);
    }
    async getChildrenForResourceType(resourceType) {
        if (resourceType === "extensions" /* ProfileResourceType.Extensions */) {
            const children = await this.instantiationService
                .createInstance(ExtensionsResourceExportTreeItem, this.profile)
                .getChildren();
            return children.map((child) => this.toUserDataProfileResourceChildElement(child, undefined, [
                {
                    id: 'applyToAllProfiles',
                    label: localize('applyToAllProfiles', 'Apply Extension to all Profiles'),
                    checked: child.applicationScoped,
                    enabled: true,
                    class: '',
                    tooltip: '',
                    run: async () => {
                        const extensions = await this.extensionManagementService.getInstalled(undefined, this.profile.extensionsResource);
                        const extension = extensions.find((e) => areSameExtensions(e.identifier, child.identifier));
                        if (extension) {
                            await this.extensionManagementService.toggleAppliationScope(extension, this.profile.extensionsResource);
                        }
                    },
                },
            ]));
        }
        return this.getChildrenFromProfile(this.profile, resourceType);
    }
    getInitialName() {
        return this.profile.name;
    }
};
UserDataProfileElement = __decorate([
    __param(3, IUserDataProfileService),
    __param(4, IConfigurationService),
    __param(5, IUserDataProfileManagementService),
    __param(6, IUserDataProfilesService),
    __param(7, ICommandService),
    __param(8, IWorkspaceContextService),
    __param(9, IHostService),
    __param(10, IUriIdentityService),
    __param(11, IFileService),
    __param(12, IWorkbenchExtensionManagementService),
    __param(13, IInstantiationService)
], UserDataProfileElement);
export { UserDataProfileElement };
const USER_DATA_PROFILE_TEMPLATE_PREVIEW_SCHEME = 'userdataprofiletemplatepreview';
let NewProfileElement = class NewProfileElement extends AbstractUserDataProfileElement {
    get copyFromTemplates() {
        return this._copyFromTemplates;
    }
    constructor(name, copyFrom, titleButtons, actions, userDataProfileImportExportService, userDataProfileManagementService, userDataProfilesService, commandService, workspaceContextService, hostService, uriIdentityService, fileService, extensionManagementService, instantiationService) {
        super(name, undefined, undefined, undefined, false, userDataProfileManagementService, userDataProfilesService, commandService, workspaceContextService, hostService, uriIdentityService, fileService, extensionManagementService, instantiationService);
        this.titleButtons = titleButtons;
        this.actions = actions;
        this.userDataProfileImportExportService = userDataProfileImportExportService;
        this._copyFromTemplates = new ResourceMap();
        this.template = null;
        this.previewProfileWatchDisposables = this._register(new DisposableStore());
        this.defaultName = name;
        this._copyFrom = copyFrom;
        this._copyFlags = this.getCopyFlagsFrom(copyFrom);
        this.initialize();
        this._register(this.fileService.registerProvider(USER_DATA_PROFILE_TEMPLATE_PREVIEW_SCHEME, this._register(new InMemoryFileSystemProvider())));
        this._register(toDisposable(() => {
            if (this.previewProfile) {
                this.userDataProfilesService.removeProfile(this.previewProfile);
            }
        }));
    }
    get copyFrom() {
        return this._copyFrom;
    }
    set copyFrom(copyFrom) {
        if (this._copyFrom !== copyFrom) {
            this._copyFrom = copyFrom;
            this._onDidChange.fire({ copyFrom: true });
            this.flags = undefined;
            this.copyFlags = this.getCopyFlagsFrom(copyFrom);
            if (copyFrom instanceof URI) {
                this.templatePromise?.cancel();
                this.templatePromise = undefined;
            }
            this.initialize();
        }
    }
    get copyFlags() {
        return this._copyFlags;
    }
    set copyFlags(flags) {
        if (!equals(this._copyFlags, flags)) {
            this._copyFlags = flags;
            this._onDidChange.fire({ copyFlags: true });
        }
    }
    get previewProfile() {
        return this._previewProfile;
    }
    set previewProfile(profile) {
        if (this._previewProfile !== profile) {
            this._previewProfile = profile;
            this._onDidChange.fire({ preview: true });
            this.previewProfileWatchDisposables.clear();
            if (this._previewProfile) {
                this.previewProfileWatchDisposables.add(this.fileService.watch(this._previewProfile.snippetsHome));
                this.previewProfileWatchDisposables.add(this.fileService.onDidFilesChange((e) => {
                    if (!this._previewProfile) {
                        return;
                    }
                    if (e.affects(this._previewProfile.snippetsHome)) {
                        this._onDidChange.fire({ snippets: true });
                    }
                }));
            }
        }
    }
    getProfileToWatch() {
        return this.previewProfile;
    }
    getCopyFlagsFrom(copyFrom) {
        return copyFrom
            ? {
                settings: true,
                keybindings: true,
                snippets: true,
                tasks: true,
                extensions: true,
            }
            : undefined;
    }
    async initialize() {
        this.disabled = true;
        try {
            if (this.copyFrom instanceof URI) {
                await this.resolveTemplate(this.copyFrom);
                if (this.template) {
                    this.copyFromTemplates.set(this.copyFrom, this.template.name);
                    if (this.defaultName === this.name) {
                        this.name = this.defaultName = this.template.name ?? '';
                    }
                    if (this.defaultIcon === this.icon) {
                        this.icon = this.defaultIcon = this.template.icon;
                    }
                    this.setCopyFlag("settings" /* ProfileResourceType.Settings */, !!this.template.settings);
                    this.setCopyFlag("keybindings" /* ProfileResourceType.Keybindings */, !!this.template.keybindings);
                    this.setCopyFlag("tasks" /* ProfileResourceType.Tasks */, !!this.template.tasks);
                    this.setCopyFlag("snippets" /* ProfileResourceType.Snippets */, !!this.template.snippets);
                    this.setCopyFlag("extensions" /* ProfileResourceType.Extensions */, !!this.template.extensions);
                    this._onDidChange.fire({ copyFromInfo: true });
                }
                return;
            }
            if (isUserDataProfile(this.copyFrom)) {
                if (this.defaultName === this.name) {
                    this.name = this.defaultName = localize('copy from', '{0} (Copy)', this.copyFrom.name);
                }
                if (this.defaultIcon === this.icon) {
                    this.icon = this.defaultIcon = this.copyFrom.icon;
                }
                this.setCopyFlag("settings" /* ProfileResourceType.Settings */, true);
                this.setCopyFlag("keybindings" /* ProfileResourceType.Keybindings */, true);
                this.setCopyFlag("tasks" /* ProfileResourceType.Tasks */, true);
                this.setCopyFlag("snippets" /* ProfileResourceType.Snippets */, true);
                this.setCopyFlag("extensions" /* ProfileResourceType.Extensions */, true);
                this._onDidChange.fire({ copyFromInfo: true });
                return;
            }
            if (this.defaultName === this.name) {
                this.name = this.defaultName = localize('untitled', 'Untitled');
            }
            if (this.defaultIcon === this.icon) {
                this.icon = this.defaultIcon = undefined;
            }
            this.setCopyFlag("settings" /* ProfileResourceType.Settings */, false);
            this.setCopyFlag("keybindings" /* ProfileResourceType.Keybindings */, false);
            this.setCopyFlag("tasks" /* ProfileResourceType.Tasks */, false);
            this.setCopyFlag("snippets" /* ProfileResourceType.Snippets */, false);
            this.setCopyFlag("extensions" /* ProfileResourceType.Extensions */, false);
            this._onDidChange.fire({ copyFromInfo: true });
        }
        finally {
            this.disabled = false;
        }
    }
    async resolveTemplate(uri) {
        if (!this.templatePromise) {
            this.templatePromise = createCancelablePromise(async (token) => {
                const template = await this.userDataProfileImportExportService.resolveProfileTemplate(uri);
                if (!token.isCancellationRequested) {
                    this.template = template;
                }
            });
        }
        await this.templatePromise;
        return this.template;
    }
    hasResource(resourceType) {
        if (this.template) {
            switch (resourceType) {
                case "settings" /* ProfileResourceType.Settings */:
                    return !!this.template.settings;
                case "keybindings" /* ProfileResourceType.Keybindings */:
                    return !!this.template.keybindings;
                case "snippets" /* ProfileResourceType.Snippets */:
                    return !!this.template.snippets;
                case "tasks" /* ProfileResourceType.Tasks */:
                    return !!this.template.tasks;
                case "extensions" /* ProfileResourceType.Extensions */:
                    return !!this.template.extensions;
            }
        }
        return true;
    }
    getCopyFlag(key) {
        return this.copyFlags?.[key] ?? false;
    }
    setCopyFlag(key, value) {
        const flags = this.copyFlags ? { ...this.copyFlags } : {};
        flags[key] = value;
        this.copyFlags = flags;
    }
    getCopyFromName() {
        if (isUserDataProfile(this.copyFrom)) {
            return this.copyFrom.name;
        }
        if (this.copyFrom instanceof URI) {
            return this.copyFromTemplates.get(this.copyFrom);
        }
        return undefined;
    }
    async getChildrenForResourceType(resourceType) {
        if (this.getFlag(resourceType)) {
            return this.getChildrenFromProfile(this.userDataProfilesService.defaultProfile, resourceType);
        }
        if (!this.getCopyFlag(resourceType)) {
            return [];
        }
        if (this.previewProfile) {
            return this.getChildrenFromProfile(this.previewProfile, resourceType);
        }
        if (this.copyFrom instanceof URI) {
            await this.resolveTemplate(this.copyFrom);
            if (!this.template) {
                return [];
            }
            return this.getChildrenFromProfileTemplate(this.template, resourceType);
        }
        if (this.copyFrom) {
            return this.getChildrenFromProfile(this.copyFrom, resourceType);
        }
        return [];
    }
    async getChildrenFromProfileTemplate(profileTemplate, resourceType) {
        const location = URI.from({
            scheme: USER_DATA_PROFILE_TEMPLATE_PREVIEW_SCHEME,
            path: `/root/profiles/${profileTemplate.name}`,
        });
        const cacheLocation = URI.from({
            scheme: USER_DATA_PROFILE_TEMPLATE_PREVIEW_SCHEME,
            path: `/root/cache/${profileTemplate.name}`,
        });
        const profile = toUserDataProfile(generateUuid(), this.name, location, cacheLocation);
        switch (resourceType) {
            case "settings" /* ProfileResourceType.Settings */:
                if (profileTemplate.settings) {
                    await this.instantiationService
                        .createInstance(SettingsResource)
                        .apply(profileTemplate.settings, profile);
                    return this.getChildrenFromProfile(profile, resourceType);
                }
                return [];
            case "keybindings" /* ProfileResourceType.Keybindings */:
                if (profileTemplate.keybindings) {
                    await this.instantiationService
                        .createInstance(KeybindingsResource)
                        .apply(profileTemplate.keybindings, profile);
                    return this.getChildrenFromProfile(profile, resourceType);
                }
                return [];
            case "snippets" /* ProfileResourceType.Snippets */:
                if (profileTemplate.snippets) {
                    await this.instantiationService
                        .createInstance(SnippetsResource)
                        .apply(profileTemplate.snippets, profile);
                    return this.getChildrenFromProfile(profile, resourceType);
                }
                return [];
            case "tasks" /* ProfileResourceType.Tasks */:
                if (profileTemplate.tasks) {
                    await this.instantiationService
                        .createInstance(TasksResource)
                        .apply(profileTemplate.tasks, profile);
                    return this.getChildrenFromProfile(profile, resourceType);
                }
                return [];
            case "extensions" /* ProfileResourceType.Extensions */:
                if (profileTemplate.extensions) {
                    const children = await this.instantiationService
                        .createInstance(ExtensionsResourceImportTreeItem, profileTemplate.extensions)
                        .getChildren();
                    return children.map((child) => this.toUserDataProfileResourceChildElement(child));
                }
                return [];
        }
        return [];
    }
    shouldValidateName() {
        return !this.copyFrom;
    }
    getInitialName() {
        return this.previewProfile?.name ?? '';
    }
    async doSave() {
        if (this.previewProfile) {
            const profile = await this.saveProfile(this.previewProfile);
            if (profile) {
                this.previewProfile = profile;
            }
        }
    }
};
NewProfileElement = __decorate([
    __param(4, IUserDataProfileImportExportService),
    __param(5, IUserDataProfileManagementService),
    __param(6, IUserDataProfilesService),
    __param(7, ICommandService),
    __param(8, IWorkspaceContextService),
    __param(9, IHostService),
    __param(10, IUriIdentityService),
    __param(11, IFileService),
    __param(12, IWorkbenchExtensionManagementService),
    __param(13, IInstantiationService)
], NewProfileElement);
export { NewProfileElement };
let UserDataProfilesEditorModel = class UserDataProfilesEditorModel extends EditorModel {
    static { UserDataProfilesEditorModel_1 = this; }
    static getInstance(instantiationService) {
        if (!UserDataProfilesEditorModel_1.INSTANCE) {
            UserDataProfilesEditorModel_1.INSTANCE = instantiationService.createInstance(UserDataProfilesEditorModel_1);
        }
        return UserDataProfilesEditorModel_1.INSTANCE;
    }
    get profiles() {
        return this._profiles
            .map(([profile]) => profile)
            .sort((a, b) => {
            if (a instanceof NewProfileElement) {
                return 1;
            }
            if (b instanceof NewProfileElement) {
                return -1;
            }
            if (a instanceof UserDataProfileElement && a.profile.isDefault) {
                return -1;
            }
            if (b instanceof UserDataProfileElement && b.profile.isDefault) {
                return 1;
            }
            return a.name.localeCompare(b.name);
        });
    }
    constructor(userDataProfileService, userDataProfilesService, userDataProfileManagementService, userDataProfileImportExportService, dialogService, telemetryService, hostService, productService, openerService, instantiationService) {
        super();
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.userDataProfileManagementService = userDataProfileManagementService;
        this.userDataProfileImportExportService = userDataProfileImportExportService;
        this.dialogService = dialogService;
        this.telemetryService = telemetryService;
        this.hostService = hostService;
        this.productService = productService;
        this.openerService = openerService;
        this.instantiationService = instantiationService;
        this._profiles = [];
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        for (const profile of userDataProfilesService.profiles) {
            if (!profile.isTransient) {
                this._profiles.push(this.createProfileElement(profile));
            }
        }
        this._register(toDisposable(() => this._profiles
            .splice(0, this._profiles.length)
            .map(([, disposables]) => disposables.dispose())));
        this._register(userDataProfilesService.onDidChangeProfiles((e) => this.onDidChangeProfiles(e)));
    }
    onDidChangeProfiles(e) {
        let changed = false;
        for (const profile of e.added) {
            if (!profile.isTransient && profile.name !== this.newProfileElement?.name) {
                changed = true;
                this._profiles.push(this.createProfileElement(profile));
            }
        }
        for (const profile of e.removed) {
            if (profile.id === this.newProfileElement?.previewProfile?.id) {
                this.newProfileElement.previewProfile = undefined;
            }
            const index = this._profiles.findIndex(([p]) => p instanceof UserDataProfileElement && p.profile.id === profile.id);
            if (index !== -1) {
                changed = true;
                this._profiles.splice(index, 1).map(([, disposables]) => disposables.dispose());
            }
        }
        if (changed) {
            this._onDidChange.fire(undefined);
        }
    }
    getTemplates() {
        if (!this.templates) {
            this.templates = this.userDataProfileManagementService.getBuiltinProfileTemplates();
        }
        return this.templates;
    }
    createProfileElement(profile) {
        const disposables = new DisposableStore();
        const activateAction = disposables.add(new Action('userDataProfile.activate', localize('active', 'Use this Profile for Current Window'), ThemeIcon.asClassName(Codicon.check), true, () => this.userDataProfileManagementService.switchProfile(profileElement.profile)));
        const copyFromProfileAction = disposables.add(new Action('userDataProfile.copyFromProfile', localize('copyFromProfile', 'Duplicate...'), ThemeIcon.asClassName(Codicon.copy), true, () => this.createNewProfile(profileElement.profile)));
        const exportAction = disposables.add(new Action('userDataProfile.export', localize('export', 'Export...'), ThemeIcon.asClassName(Codicon.export), true, () => this.userDataProfileImportExportService.exportProfile(profile)));
        const deleteAction = disposables.add(new Action('userDataProfile.delete', localize('delete', 'Delete'), ThemeIcon.asClassName(Codicon.trash), true, () => this.removeProfile(profileElement.profile)));
        const newWindowAction = disposables.add(new Action('userDataProfile.newWindow', localize('open new window', 'Open New Window with this Profile'), ThemeIcon.asClassName(Codicon.emptyWindow), true, () => this.openWindow(profileElement.profile)));
        const primaryActions = [];
        primaryActions.push(activateAction);
        primaryActions.push(newWindowAction);
        const secondaryActions = [];
        secondaryActions.push(copyFromProfileAction);
        secondaryActions.push(exportAction);
        if (!profile.isDefault) {
            secondaryActions.push(new Separator());
            secondaryActions.push(deleteAction);
        }
        const profileElement = disposables.add(this.instantiationService.createInstance(UserDataProfileElement, profile, [[], []], [primaryActions, secondaryActions]));
        activateAction.enabled =
            this.userDataProfileService.currentProfile.id !== profileElement.profile.id;
        disposables.add(this.userDataProfileService.onDidChangeCurrentProfile(() => (activateAction.enabled =
            this.userDataProfileService.currentProfile.id !== profileElement.profile.id)));
        return [profileElement, disposables];
    }
    async createNewProfile(copyFrom) {
        if (this.newProfileElement) {
            const result = await this.dialogService.confirm({
                type: 'info',
                message: localize('new profile exists', 'A new profile is already being created. Do you want to discard it and create a new one?'),
                primaryButton: localize('discard', 'Discard & Create'),
                cancelButton: localize('cancel', 'Cancel'),
            });
            if (!result.confirmed) {
                return;
            }
            this.revert();
        }
        if (copyFrom instanceof URI) {
            try {
                await this.userDataProfileImportExportService.resolveProfileTemplate(copyFrom);
            }
            catch (error) {
                this.dialogService.error(getErrorMessage(error));
                return;
            }
        }
        if (!this.newProfileElement) {
            const disposables = new DisposableStore();
            const cancellationTokenSource = new CancellationTokenSource();
            disposables.add(toDisposable(() => cancellationTokenSource.dispose(true)));
            const primaryActions = [];
            const secondaryActions = [];
            const createAction = disposables.add(new Action('userDataProfile.create', localize('create', 'Create'), undefined, true, () => this.saveNewProfile(false, cancellationTokenSource.token)));
            primaryActions.push(createAction);
            if (isWeb && copyFrom instanceof URI && isProfileURL(copyFrom)) {
                primaryActions.push(disposables.add(new Action('userDataProfile.createInDesktop', localize('import in desktop', 'Create in {0}', this.productService.nameLong), undefined, true, () => this.openerService.open(copyFrom, { openExternal: true }))));
            }
            const cancelAction = disposables.add(new Action('userDataProfile.cancel', localize('cancel', 'Cancel'), ThemeIcon.asClassName(Codicon.trash), true, () => this.discardNewProfile()));
            secondaryActions.push(cancelAction);
            const previewProfileAction = disposables.add(new Action('userDataProfile.preview', localize('preview', 'Preview'), ThemeIcon.asClassName(Codicon.openPreview), true, () => this.previewNewProfile(cancellationTokenSource.token)));
            secondaryActions.push(previewProfileAction);
            const exportAction = disposables.add(new Action('userDataProfile.export', localize('export', 'Export...'), ThemeIcon.asClassName(Codicon.export), isUserDataProfile(copyFrom), () => this.exportNewProfile(cancellationTokenSource.token)));
            this.newProfileElement = disposables.add(this.instantiationService.createInstance(NewProfileElement, copyFrom ? '' : localize('untitled', 'Untitled'), copyFrom, [primaryActions, secondaryActions], [[cancelAction], [exportAction]]));
            const updateCreateActionLabel = () => {
                if (createAction.enabled) {
                    if (this.newProfileElement?.copyFrom &&
                        this.userDataProfilesService.profiles.some((p) => !p.isTransient && p.name === this.newProfileElement?.name)) {
                        createAction.label = localize('replace', 'Replace');
                    }
                    else {
                        createAction.label = localize('create', 'Create');
                    }
                }
            };
            updateCreateActionLabel();
            disposables.add(this.newProfileElement.onDidChange((e) => {
                if (e.preview || e.disabled || e.message) {
                    createAction.enabled =
                        !this.newProfileElement?.disabled && !this.newProfileElement?.message;
                    previewProfileAction.enabled =
                        !this.newProfileElement?.previewProfile &&
                            !this.newProfileElement?.disabled &&
                            !this.newProfileElement?.message;
                }
                if (e.name || e.copyFrom) {
                    updateCreateActionLabel();
                    exportAction.enabled = isUserDataProfile(this.newProfileElement?.copyFrom);
                }
            }));
            disposables.add(this.userDataProfilesService.onDidChangeProfiles((e) => {
                updateCreateActionLabel();
                this.newProfileElement?.validate();
            }));
            this._profiles.push([this.newProfileElement, disposables]);
            this._onDidChange.fire(this.newProfileElement);
        }
        return this.newProfileElement;
    }
    revert() {
        this.removeNewProfile();
        this._onDidChange.fire(undefined);
    }
    removeNewProfile() {
        if (this.newProfileElement) {
            const index = this._profiles.findIndex(([p]) => p === this.newProfileElement);
            if (index !== -1) {
                this._profiles.splice(index, 1).map(([, disposables]) => disposables.dispose());
            }
            this.newProfileElement = undefined;
        }
    }
    async previewNewProfile(token) {
        if (!this.newProfileElement) {
            return;
        }
        if (this.newProfileElement.previewProfile) {
            return;
        }
        const profile = await this.saveNewProfile(true, token);
        if (profile) {
            this.newProfileElement.previewProfile = profile;
            if (isWeb) {
                await this.userDataProfileManagementService.switchProfile(profile);
            }
            else {
                await this.openWindow(profile);
            }
        }
    }
    async exportNewProfile(token) {
        if (!this.newProfileElement) {
            return;
        }
        if (!isUserDataProfile(this.newProfileElement.copyFrom)) {
            return;
        }
        const profile = toUserDataProfile(generateUuid(), this.newProfileElement.name, this.newProfileElement.copyFrom.location, this.newProfileElement.copyFrom.cacheHome, {
            icon: this.newProfileElement.icon,
            useDefaultFlags: this.newProfileElement.flags,
        }, this.userDataProfilesService.defaultProfile);
        await this.userDataProfileImportExportService.exportProfile(profile, this.newProfileElement.copyFlags);
    }
    async saveNewProfile(transient, token) {
        if (!this.newProfileElement) {
            return undefined;
        }
        this.newProfileElement.validate();
        if (this.newProfileElement.message) {
            return undefined;
        }
        this.newProfileElement.disabled = true;
        let profile;
        try {
            if (this.newProfileElement.previewProfile) {
                if (!transient) {
                    profile = await this.userDataProfileManagementService.updateProfile(this.newProfileElement.previewProfile, { transient: false });
                }
            }
            else {
                const { flags, icon, name, copyFrom } = this.newProfileElement;
                const useDefaultFlags = flags
                    ? flags.settings &&
                        flags.keybindings &&
                        flags.tasks &&
                        flags.globalState &&
                        flags.extensions
                        ? undefined
                        : flags
                    : undefined;
                const createProfileTelemetryData = {
                    source: copyFrom instanceof URI
                        ? 'template'
                        : isUserDataProfile(copyFrom)
                            ? 'profile'
                            : copyFrom
                                ? 'external'
                                : undefined,
                };
                if (copyFrom instanceof URI) {
                    const template = await this.newProfileElement.resolveTemplate(copyFrom);
                    if (template) {
                        this.telemetryService.publicLog2('userDataProfile.createFromTemplate', createProfileTelemetryData);
                        profile = await this.userDataProfileImportExportService.createProfileFromTemplate(template, {
                            name,
                            useDefaultFlags,
                            icon,
                            resourceTypeFlags: this.newProfileElement.copyFlags,
                            transient,
                        }, token ?? CancellationToken.None);
                    }
                }
                else if (isUserDataProfile(copyFrom)) {
                    profile = await this.userDataProfileImportExportService.createFromProfile(copyFrom, {
                        name,
                        useDefaultFlags,
                        icon: icon,
                        resourceTypeFlags: this.newProfileElement.copyFlags,
                        transient,
                    }, token ?? CancellationToken.None);
                }
                else {
                    profile = await this.userDataProfileManagementService.createProfile(name, {
                        useDefaultFlags,
                        icon,
                        transient,
                    });
                }
            }
        }
        finally {
            if (this.newProfileElement) {
                this.newProfileElement.disabled = false;
            }
        }
        if (token?.isCancellationRequested) {
            if (profile) {
                try {
                    await this.userDataProfileManagementService.removeProfile(profile);
                }
                catch (error) {
                    // ignore
                }
            }
            return;
        }
        if (profile && !profile.isTransient && this.newProfileElement) {
            this.removeNewProfile();
            const existing = this._profiles.find(([p]) => p.name === profile.name);
            if (existing) {
                this._onDidChange.fire(existing[0]);
            }
            else {
                this.onDidChangeProfiles({
                    added: [profile],
                    removed: [],
                    updated: [],
                    all: this.userDataProfilesService.profiles,
                });
            }
        }
        return profile;
    }
    async discardNewProfile() {
        if (!this.newProfileElement) {
            return;
        }
        if (this.newProfileElement.previewProfile) {
            await this.userDataProfileManagementService.removeProfile(this.newProfileElement.previewProfile);
            return;
        }
        this.removeNewProfile();
        this._onDidChange.fire(undefined);
    }
    async removeProfile(profile) {
        const result = await this.dialogService.confirm({
            type: 'info',
            message: localize('deleteProfile', "Are you sure you want to delete the profile '{0}'?", profile.name),
            primaryButton: localize('delete', 'Delete'),
            cancelButton: localize('cancel', 'Cancel'),
        });
        if (result.confirmed) {
            await this.userDataProfileManagementService.removeProfile(profile);
        }
    }
    async openWindow(profile) {
        await this.hostService.openWindow({ forceProfile: profile.name });
    }
};
UserDataProfilesEditorModel = UserDataProfilesEditorModel_1 = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IUserDataProfilesService),
    __param(2, IUserDataProfileManagementService),
    __param(3, IUserDataProfileImportExportService),
    __param(4, IDialogService),
    __param(5, ITelemetryService),
    __param(6, IHostService),
    __param(7, IProductService),
    __param(8, IOpenerService),
    __param(9, IInstantiationService)
], UserDataProfilesEditorModel);
export { UserDataProfilesEditorModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlc0VkaXRvck1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91c2VyRGF0YVByb2ZpbGUvYnJvd3Nlci91c2VyRGF0YVByb2ZpbGVzRWRpdG9yTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQVcsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFFTixpQkFBaUIsRUFFakIsd0JBQXdCLEVBR3hCLGlCQUFpQixHQUVqQixNQUFNLGdFQUFnRSxDQUFBO0FBQ3ZFLE9BQU8sRUFHTixZQUFZLEVBQ1osbUNBQW1DLEVBQ25DLGlDQUFpQyxFQUNqQyx1QkFBdUIsR0FFdkIsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0QsT0FBTyxFQUFFLFdBQVcs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