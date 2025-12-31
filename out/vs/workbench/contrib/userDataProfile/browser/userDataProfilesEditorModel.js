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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlc0VkaXRvck1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdXNlckRhdGFQcm9maWxlL2Jyb3dzZXIvdXNlckRhdGFQcm9maWxlc0VkaXRvck1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFXLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBRU4saUJBQWlCLEVBRWpCLHdCQUF3QixFQUd4QixpQkFBaUIsR0FFakIsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN2RSxPQUFPLEVBR04sWUFBWSxFQUNaLG1DQUFtQyxFQUNuQyxpQ0FBaUMsRUFDakMsdUJBQXVCLEdBRXZCLE1BQU0sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sS0FBSyxNQUFNLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxXQUFXLEVBQUUs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