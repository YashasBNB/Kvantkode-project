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
import './media/userDataProfileView.css';
import { localize } from '../../../../nls.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter } from '../../../../base/common/event.js';
import { IUserDataProfileImportExportService, PROFILE_FILTER, PROFILE_EXTENSION, IUserDataProfileService, PROFILES_CATEGORY, IUserDataProfileManagementService, PROFILE_URL_AUTHORITY, toUserDataProfileUri, isProfileURL, PROFILE_URL_AUTHORITY_PREFIX, } from '../common/userDataProfile.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { IDialogService, IFileDialogService, } from '../../../../platform/dialogs/common/dialogs.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { URI } from '../../../../base/common/uri.js';
import { IUserDataProfilesService, } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { SettingsResource, SettingsResourceTreeItem } from './settingsResource.js';
import { KeybindingsResource, KeybindingsResourceTreeItem } from './keybindingsResource.js';
import { SnippetsResource, SnippetsResourceTreeItem } from './snippetsResource.js';
import { TasksResource, TasksResourceTreeItem } from './tasksResource.js';
import { ExtensionsResource, ExtensionsResourceExportTreeItem, ExtensionsResourceTreeItem, } from './extensionsResource.js';
import { GlobalStateResource, GlobalStateResourceExportTreeItem, GlobalStateResourceTreeItem, } from './globalStateResource.js';
import { InMemoryFileSystemProvider } from '../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { joinPath } from '../../../../base/common/resources.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
import { Schemas } from '../../../../base/common/network.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import Severity from '../../../../base/common/severity.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { asText, IRequestService } from '../../../../platform/request/common/request.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { isUndefined } from '../../../../base/common/types.js';
import { createCancelablePromise } from '../../../../base/common/async.js';
function isUserDataProfileTemplate(thing) {
    const candidate = thing;
    return !!(candidate &&
        typeof candidate === 'object' &&
        candidate.name &&
        typeof candidate.name === 'string' &&
        (isUndefined(candidate.icon) || typeof candidate.icon === 'string') &&
        (isUndefined(candidate.settings) || typeof candidate.settings === 'string') &&
        (isUndefined(candidate.globalState) || typeof candidate.globalState === 'string') &&
        (isUndefined(candidate.extensions) || typeof candidate.extensions === 'string'));
}
let UserDataProfileImportExportService = class UserDataProfileImportExportService extends Disposable {
    constructor(instantiationService, userDataProfileService, userDataProfileManagementService, userDataProfilesService, extensionService, quickInputService, progressService, dialogService, clipboardService, openerService, requestService, productService, uriIdentityService) {
        super();
        this.instantiationService = instantiationService;
        this.userDataProfileService = userDataProfileService;
        this.userDataProfileManagementService = userDataProfileManagementService;
        this.userDataProfilesService = userDataProfilesService;
        this.extensionService = extensionService;
        this.quickInputService = quickInputService;
        this.progressService = progressService;
        this.dialogService = dialogService;
        this.clipboardService = clipboardService;
        this.openerService = openerService;
        this.requestService = requestService;
        this.productService = productService;
        this.uriIdentityService = uriIdentityService;
        this.profileContentHandlers = new Map();
        this.registerProfileContentHandler(Schemas.file, (this.fileUserDataProfileContentHandler = instantiationService.createInstance(FileUserDataProfileContentHandler)));
    }
    registerProfileContentHandler(id, profileContentHandler) {
        if (this.profileContentHandlers.has(id)) {
            throw new Error(`Profile content handler with id '${id}' already registered.`);
        }
        this.profileContentHandlers.set(id, profileContentHandler);
        return toDisposable(() => this.unregisterProfileContentHandler(id));
    }
    unregisterProfileContentHandler(id) {
        this.profileContentHandlers.delete(id);
    }
    async createFromProfile(from, options, token) {
        const disposables = new DisposableStore();
        let creationPromise;
        disposables.add(token.onCancellationRequested(() => creationPromise.cancel()));
        let profile;
        return this.progressService
            .withProgress({
            location: 15 /* ProgressLocation.Notification */,
            delay: 500,
            sticky: true,
            cancellable: true,
        }, async (progress) => {
            const reportProgress = (message) => progress.report({
                message: localize('create from profile', 'Create Profile: {0}', message),
            });
            creationPromise = createCancelablePromise(async (token) => {
                const userDataProfilesExportState = disposables.add(this.instantiationService.createInstance(UserDataProfileExportState, from, {
                    ...options?.resourceTypeFlags,
                    extensions: false,
                }));
                const profileTemplate = await userDataProfilesExportState.getProfileTemplate(options.name ?? from.name, options?.icon);
                profile = await this.getProfileToImport({ ...profileTemplate, name: options.name ?? profileTemplate.name }, !!options.transient, options);
                if (!profile) {
                    return;
                }
                if (token.isCancellationRequested) {
                    return;
                }
                await this.applyProfileTemplate(profileTemplate, profile, options, reportProgress, token);
            });
            try {
                await creationPromise;
                if (profile && (options?.resourceTypeFlags?.extensions ?? true)) {
                    reportProgress(localize('installing extensions', 'Installing Extensions...'));
                    await this.instantiationService
                        .createInstance(ExtensionsResource)
                        .copy(from, profile, false);
                }
            }
            catch (error) {
                if (profile) {
                    await this.userDataProfilesService.removeProfile(profile);
                    profile = undefined;
                }
            }
            return profile;
        }, () => creationPromise.cancel())
            .finally(() => disposables.dispose());
    }
    async createProfileFromTemplate(profileTemplate, options, token) {
        const disposables = new DisposableStore();
        let creationPromise;
        disposables.add(token.onCancellationRequested(() => creationPromise.cancel()));
        let profile;
        return this.progressService
            .withProgress({
            location: 15 /* ProgressLocation.Notification */,
            delay: 500,
            sticky: true,
            cancellable: true,
        }, async (progress) => {
            const reportProgress = (message) => progress.report({
                message: localize('create from profile', 'Create Profile: {0}', message),
            });
            creationPromise = createCancelablePromise(async (token) => {
                profile = await this.getProfileToImport({ ...profileTemplate, name: options.name ?? profileTemplate.name }, !!options.transient, options);
                if (!profile) {
                    return;
                }
                if (token.isCancellationRequested) {
                    return;
                }
                await this.applyProfileTemplate(profileTemplate, profile, options, reportProgress, token);
            });
            try {
                await creationPromise;
            }
            catch (error) {
                if (profile) {
                    await this.userDataProfilesService.removeProfile(profile);
                    profile = undefined;
                }
            }
            return profile;
        }, () => creationPromise.cancel())
            .finally(() => disposables.dispose());
    }
    async applyProfileTemplate(profileTemplate, profile, options, reportProgress, token) {
        if (profileTemplate.settings &&
            (options.resourceTypeFlags?.settings ?? true) &&
            !profile.useDefaultFlags?.settings) {
            reportProgress(localize('creating settings', 'Creating Settings...'));
            await this.instantiationService
                .createInstance(SettingsResource)
                .apply(profileTemplate.settings, profile);
        }
        if (token.isCancellationRequested) {
            return;
        }
        if (profileTemplate.keybindings &&
            (options.resourceTypeFlags?.keybindings ?? true) &&
            !profile.useDefaultFlags?.keybindings) {
            reportProgress(localize('create keybindings', 'Creating Keyboard Shortcuts...'));
            await this.instantiationService
                .createInstance(KeybindingsResource)
                .apply(profileTemplate.keybindings, profile);
        }
        if (token.isCancellationRequested) {
            return;
        }
        if (profileTemplate.tasks &&
            (options.resourceTypeFlags?.tasks ?? true) &&
            !profile.useDefaultFlags?.tasks) {
            reportProgress(localize('create tasks', 'Creating Tasks...'));
            await this.instantiationService
                .createInstance(TasksResource)
                .apply(profileTemplate.tasks, profile);
        }
        if (token.isCancellationRequested) {
            return;
        }
        if (profileTemplate.snippets &&
            (options.resourceTypeFlags?.snippets ?? true) &&
            !profile.useDefaultFlags?.snippets) {
            reportProgress(localize('create snippets', 'Creating Snippets...'));
            await this.instantiationService
                .createInstance(SnippetsResource)
                .apply(profileTemplate.snippets, profile);
        }
        if (token.isCancellationRequested) {
            return;
        }
        if (profileTemplate.globalState && !profile.useDefaultFlags?.globalState) {
            reportProgress(localize('applying global state', 'Applying UI State...'));
            await this.instantiationService
                .createInstance(GlobalStateResource)
                .apply(profileTemplate.globalState, profile);
        }
        if (token.isCancellationRequested) {
            return;
        }
        if (profileTemplate.extensions &&
            (options.resourceTypeFlags?.extensions ?? true) &&
            !profile.useDefaultFlags?.extensions) {
            reportProgress(localize('installing extensions', 'Installing Extensions...'));
            await this.instantiationService
                .createInstance(ExtensionsResource)
                .apply(profileTemplate.extensions, profile, reportProgress, token);
        }
    }
    async exportProfile(profile, exportFlags) {
        const disposables = new DisposableStore();
        try {
            const userDataProfilesExportState = disposables.add(this.instantiationService.createInstance(UserDataProfileExportState, profile, exportFlags));
            await this.doExportProfile(userDataProfilesExportState, 15 /* ProgressLocation.Notification */);
        }
        finally {
            disposables.dispose();
        }
    }
    async createTroubleshootProfile() {
        const userDataProfilesExportState = this.instantiationService.createInstance(UserDataProfileExportState, this.userDataProfileService.currentProfile, undefined);
        try {
            const profileTemplate = await userDataProfilesExportState.getProfileTemplate(localize('troubleshoot issue', 'Troubleshoot Issue'), undefined);
            await this.progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                delay: 1000,
                sticky: true,
            }, async (progress) => {
                const reportProgress = (message) => progress.report({
                    message: localize('troubleshoot profile progress', 'Setting up Troubleshoot Profile: {0}', message),
                });
                const profile = await this.doCreateProfile(profileTemplate, true, false, { useDefaultFlags: this.userDataProfileService.currentProfile.useDefaultFlags }, reportProgress);
                if (profile) {
                    reportProgress(localize('progress extensions', 'Applying Extensions...'));
                    await this.instantiationService
                        .createInstance(ExtensionsResource)
                        .copy(this.userDataProfileService.currentProfile, profile, true);
                    reportProgress(localize('switching profile', 'Switching Profile...'));
                    await this.userDataProfileManagementService.switchProfile(profile);
                }
            });
        }
        finally {
            userDataProfilesExportState.dispose();
        }
    }
    async doExportProfile(userDataProfilesExportState, location) {
        const profile = await userDataProfilesExportState.getProfileToExport();
        if (!profile) {
            return;
        }
        const disposables = new DisposableStore();
        try {
            await this.progressService.withProgress({
                location,
                title: localize('profiles.exporting', '{0}: Exporting...', PROFILES_CATEGORY.value),
            }, async (progress) => {
                const id = await this.pickProfileContentHandler(profile.name);
                if (!id) {
                    return;
                }
                const profileContentHandler = this.profileContentHandlers.get(id);
                if (!profileContentHandler) {
                    return;
                }
                const saveResult = await profileContentHandler.saveProfile(profile.name.replace('/', '-'), JSON.stringify(profile), CancellationToken.None);
                if (!saveResult) {
                    return;
                }
                const message = localize('export success', "Profile '{0}' was exported successfully.", profile.name);
                if (profileContentHandler.extensionId) {
                    const buttons = [];
                    const link = this.productService.webUrl
                        ? `${this.productService.webUrl}/${PROFILE_URL_AUTHORITY}/${id}/${saveResult.id}`
                        : toUserDataProfileUri(`/${id}/${saveResult.id}`, this.productService).toString();
                    buttons.push({
                        label: localize({ key: 'copy', comment: ['&& denotes a mnemonic'] }, '&&Copy Link'),
                        run: () => this.clipboardService.writeText(link),
                    });
                    if (this.productService.webUrl) {
                        buttons.push({
                            label: localize({ key: 'open', comment: ['&& denotes a mnemonic'] }, '&&Open Link'),
                            run: async () => {
                                await this.openerService.open(link);
                            },
                        });
                    }
                    else {
                        buttons.push({
                            label: localize({ key: 'open in', comment: ['&& denotes a mnemonic'] }, '&&Open in {0}', profileContentHandler.name),
                            run: async () => {
                                await this.openerService.open(saveResult.link.toString());
                            },
                        });
                    }
                    await this.dialogService.prompt({
                        type: Severity.Info,
                        message,
                        buttons,
                        cancelButton: localize('close', 'Close'),
                    });
                }
                else {
                    await this.dialogService.info(message);
                }
            });
        }
        finally {
            disposables.dispose();
        }
    }
    async resolveProfileTemplate(uri, options) {
        const profileContent = await this.resolveProfileContent(uri);
        if (profileContent === null) {
            return null;
        }
        let profileTemplate;
        try {
            profileTemplate = JSON.parse(profileContent);
        }
        catch (error) {
            throw new Error(localize('invalid profile content', 'This profile is not valid.'));
        }
        if (!isUserDataProfileTemplate(profileTemplate)) {
            throw new Error(localize('invalid profile content', 'This profile is not valid.'));
        }
        if (options?.name) {
            profileTemplate.name = options.name;
        }
        if (options?.icon) {
            profileTemplate.icon = options.icon;
        }
        if (options?.resourceTypeFlags?.settings === false) {
            profileTemplate.settings = undefined;
        }
        if (options?.resourceTypeFlags?.keybindings === false) {
            profileTemplate.keybindings = undefined;
        }
        if (options?.resourceTypeFlags?.snippets === false) {
            profileTemplate.snippets = undefined;
        }
        if (options?.resourceTypeFlags?.tasks === false) {
            profileTemplate.tasks = undefined;
        }
        if (options?.resourceTypeFlags?.globalState === false) {
            profileTemplate.globalState = undefined;
        }
        if (options?.resourceTypeFlags?.extensions === false) {
            profileTemplate.extensions = undefined;
        }
        return profileTemplate;
    }
    async doCreateProfile(profileTemplate, temporaryProfile, extensions, options, progress) {
        const profile = await this.getProfileToImport(profileTemplate, temporaryProfile, options);
        if (!profile) {
            return undefined;
        }
        if (profileTemplate.settings && !profile.useDefaultFlags?.settings) {
            progress(localize('progress settings', 'Applying Settings...'));
            await this.instantiationService
                .createInstance(SettingsResource)
                .apply(profileTemplate.settings, profile);
        }
        if (profileTemplate.keybindings && !profile.useDefaultFlags?.keybindings) {
            progress(localize('progress keybindings', 'Applying Keyboard Shortcuts...'));
            await this.instantiationService
                .createInstance(KeybindingsResource)
                .apply(profileTemplate.keybindings, profile);
        }
        if (profileTemplate.tasks && !profile.useDefaultFlags?.tasks) {
            progress(localize('progress tasks', 'Applying Tasks...'));
            await this.instantiationService
                .createInstance(TasksResource)
                .apply(profileTemplate.tasks, profile);
        }
        if (profileTemplate.snippets && !profile.useDefaultFlags?.snippets) {
            progress(localize('progress snippets', 'Applying Snippets...'));
            await this.instantiationService
                .createInstance(SnippetsResource)
                .apply(profileTemplate.snippets, profile);
        }
        if (profileTemplate.globalState && !profile.useDefaultFlags?.globalState) {
            progress(localize('progress global state', 'Applying State...'));
            await this.instantiationService
                .createInstance(GlobalStateResource)
                .apply(profileTemplate.globalState, profile);
        }
        if (profileTemplate.extensions && extensions && !profile.useDefaultFlags?.extensions) {
            progress(localize('progress extensions', 'Applying Extensions...'));
            await this.instantiationService
                .createInstance(ExtensionsResource)
                .apply(profileTemplate.extensions, profile);
        }
        return profile;
    }
    async resolveProfileContent(resource) {
        if (await this.fileUserDataProfileContentHandler.canHandle(resource)) {
            return this.fileUserDataProfileContentHandler.readProfile(resource, CancellationToken.None);
        }
        if (isProfileURL(resource)) {
            let handlerId, idOrUri;
            if (resource.authority === PROFILE_URL_AUTHORITY) {
                idOrUri = this.uriIdentityService.extUri.basename(resource);
                handlerId = this.uriIdentityService.extUri.basename(this.uriIdentityService.extUri.dirname(resource));
            }
            else {
                handlerId = resource.authority.substring(PROFILE_URL_AUTHORITY_PREFIX.length);
                idOrUri = URI.parse(resource.path.substring(1));
            }
            await this.extensionService.activateByEvent(`onProfile:${handlerId}`);
            const profileContentHandler = this.profileContentHandlers.get(handlerId);
            if (profileContentHandler) {
                return profileContentHandler.readProfile(idOrUri, CancellationToken.None);
            }
        }
        await this.extensionService.activateByEvent('onProfile');
        for (const profileContentHandler of this.profileContentHandlers.values()) {
            const content = await profileContentHandler.readProfile(resource, CancellationToken.None);
            if (content !== null) {
                return content;
            }
        }
        const context = await this.requestService.request({ type: 'GET', url: resource.toString(true) }, CancellationToken.None);
        if (context.res.statusCode === 200) {
            return await asText(context);
        }
        else {
            const message = await asText(context);
            throw new Error(`Failed to get profile from URL: ${resource.toString()}. Status code: ${context.res.statusCode}. Message: ${message}`);
        }
    }
    async pickProfileContentHandler(name) {
        await this.extensionService.activateByEvent('onProfile');
        if (this.profileContentHandlers.size === 1) {
            return this.profileContentHandlers.keys().next().value;
        }
        const options = [];
        for (const [id, profileContentHandler] of this.profileContentHandlers) {
            options.push({
                id,
                label: profileContentHandler.name,
                description: profileContentHandler.description,
            });
        }
        const result = await this.quickInputService.pick(options.reverse(), {
            title: localize('select profile content handler', "Export '{0}' profile as...", name),
            hideInput: true,
        });
        return result?.id;
    }
    async getProfileToImport(profileTemplate, temp, options) {
        const profileName = profileTemplate.name;
        const profile = this.userDataProfilesService.profiles.find((p) => p.name === profileName);
        if (profile) {
            if (temp) {
                return this.userDataProfilesService.createNamedProfile(`${profileName} ${this.getProfileNameIndex(profileName)}`, { ...options, transient: temp });
            }
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Info,
                message: localize('profile already exists', "Profile with name '{0}' already exists. Do you want to replace its contents?", profileName),
                primaryButton: localize({ key: 'overwrite', comment: ['&& denotes a mnemonic'] }, '&&Replace'),
            });
            if (!confirmed) {
                return undefined;
            }
            return profile.isDefault
                ? profile
                : this.userDataProfilesService.updateProfile(profile, options);
        }
        else {
            return this.userDataProfilesService.createNamedProfile(profileName, {
                ...options,
                transient: temp,
            });
        }
    }
    getProfileNameIndex(name) {
        const nameRegEx = new RegExp(`${escapeRegExpCharacters(name)}\\s(\\d+)`);
        let nameIndex = 0;
        for (const profile of this.userDataProfilesService.profiles) {
            const matches = nameRegEx.exec(profile.name);
            const index = matches ? parseInt(matches[1]) : 0;
            nameIndex = index > nameIndex ? index : nameIndex;
        }
        return nameIndex + 1;
    }
};
UserDataProfileImportExportService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IUserDataProfileService),
    __param(2, IUserDataProfileManagementService),
    __param(3, IUserDataProfilesService),
    __param(4, IExtensionService),
    __param(5, IQuickInputService),
    __param(6, IProgressService),
    __param(7, IDialogService),
    __param(8, IClipboardService),
    __param(9, IOpenerService),
    __param(10, IRequestService),
    __param(11, IProductService),
    __param(12, IUriIdentityService)
], UserDataProfileImportExportService);
export { UserDataProfileImportExportService };
let FileUserDataProfileContentHandler = class FileUserDataProfileContentHandler {
    constructor(fileDialogService, uriIdentityService, fileService, productService, textFileService) {
        this.fileDialogService = fileDialogService;
        this.uriIdentityService = uriIdentityService;
        this.fileService = fileService;
        this.productService = productService;
        this.textFileService = textFileService;
        this.name = localize('local', 'Local');
        this.description = localize('file', 'file');
    }
    async saveProfile(name, content, token) {
        const link = await this.fileDialogService.showSaveDialog({
            title: localize('export profile dialog', 'Save Profile'),
            filters: PROFILE_FILTER,
            defaultUri: this.uriIdentityService.extUri.joinPath(await this.fileDialogService.defaultFilePath(), `${name}.${PROFILE_EXTENSION}`),
        });
        if (!link) {
            return null;
        }
        await this.textFileService.create([
            { resource: link, value: content, options: { overwrite: true } },
        ]);
        return { link, id: link.toString() };
    }
    async canHandle(uri) {
        return (uri.scheme !== Schemas.http &&
            uri.scheme !== Schemas.https &&
            uri.scheme !== this.productService.urlProtocol &&
            (await this.fileService.canHandleResource(uri)));
    }
    async readProfile(uri, token) {
        if (await this.canHandle(uri)) {
            return (await this.fileService.readFile(uri, undefined, token)).value.toString();
        }
        return null;
    }
    async selectProfile() {
        const profileLocation = await this.fileDialogService.showOpenDialog({
            canSelectFolders: false,
            canSelectFiles: true,
            canSelectMany: false,
            filters: PROFILE_FILTER,
            title: localize('select profile', 'Select Profile'),
        });
        return profileLocation ? profileLocation[0] : null;
    }
};
FileUserDataProfileContentHandler = __decorate([
    __param(0, IFileDialogService),
    __param(1, IUriIdentityService),
    __param(2, IFileService),
    __param(3, IProductService),
    __param(4, ITextFileService)
], FileUserDataProfileContentHandler);
const USER_DATA_PROFILE_EXPORT_SCHEME = 'userdataprofileexport';
const USER_DATA_PROFILE_EXPORT_PREVIEW_SCHEME = 'userdataprofileexportpreview';
let UserDataProfileImportExportState = class UserDataProfileImportExportState extends Disposable {
    constructor(quickInputService) {
        super();
        this.quickInputService = quickInputService;
        this._onDidChangeRoots = this._register(new Emitter());
        this.onDidChangeRoots = this._onDidChangeRoots.event;
        this.roots = [];
    }
    async getChildren(element) {
        if (element) {
            const children = await element.getChildren();
            if (children) {
                for (const child of children) {
                    if (child.parent.checkbox && child.checkbox) {
                        child.checkbox.isChecked = child.parent.checkbox.isChecked && child.checkbox.isChecked;
                    }
                }
            }
            return children;
        }
        else {
            this.rootsPromise = undefined;
            this._onDidChangeRoots.fire();
            return this.getRoots();
        }
    }
    getRoots() {
        if (!this.rootsPromise) {
            this.rootsPromise = (async () => {
                this.roots = await this.fetchRoots();
                for (const root of this.roots) {
                    root.checkbox = {
                        isChecked: !root.isFromDefaultProfile(),
                        tooltip: localize('select', 'Select {0}', root.label.label),
                        accessibilityInformation: {
                            label: localize('select', 'Select {0}', root.label.label),
                        },
                    };
                    if (root.isFromDefaultProfile()) {
                        root.description = localize('from default', 'From Default Profile');
                    }
                }
                return this.roots;
            })();
        }
        return this.rootsPromise;
    }
    isEnabled(resourceType) {
        if (resourceType !== undefined) {
            return this.roots.some((root) => root.type === resourceType && this.isSelected(root));
        }
        return this.roots.some((root) => this.isSelected(root));
    }
    async getProfileTemplate(name, icon) {
        const roots = await this.getRoots();
        let settings;
        let keybindings;
        let tasks;
        let snippets;
        let extensions;
        let globalState;
        for (const root of roots) {
            if (!this.isSelected(root)) {
                continue;
            }
            if (root instanceof SettingsResourceTreeItem) {
                settings = await root.getContent();
            }
            else if (root instanceof KeybindingsResourceTreeItem) {
                keybindings = await root.getContent();
            }
            else if (root instanceof TasksResourceTreeItem) {
                tasks = await root.getContent();
            }
            else if (root instanceof SnippetsResourceTreeItem) {
                snippets = await root.getContent();
            }
            else if (root instanceof ExtensionsResourceTreeItem) {
                extensions = await root.getContent();
            }
            else if (root instanceof GlobalStateResourceTreeItem) {
                globalState = await root.getContent();
            }
        }
        return {
            name,
            icon,
            settings,
            keybindings,
            tasks,
            snippets,
            extensions,
            globalState,
        };
    }
    isSelected(treeItem) {
        if (treeItem.checkbox) {
            return (treeItem.checkbox.isChecked ||
                !!treeItem.children?.some((child) => child.checkbox?.isChecked));
        }
        return true;
    }
};
UserDataProfileImportExportState = __decorate([
    __param(0, IQuickInputService)
], UserDataProfileImportExportState);
let UserDataProfileExportState = class UserDataProfileExportState extends UserDataProfileImportExportState {
    constructor(profile, exportFlags, quickInputService, fileService, instantiationService) {
        super(quickInputService);
        this.profile = profile;
        this.exportFlags = exportFlags;
        this.fileService = fileService;
        this.instantiationService = instantiationService;
        this.disposables = this._register(new DisposableStore());
    }
    async fetchRoots() {
        this.disposables.clear();
        this.disposables.add(this.fileService.registerProvider(USER_DATA_PROFILE_EXPORT_SCHEME, this._register(new InMemoryFileSystemProvider())));
        const previewFileSystemProvider = this._register(new InMemoryFileSystemProvider());
        this.disposables.add(this.fileService.registerProvider(USER_DATA_PROFILE_EXPORT_PREVIEW_SCHEME, previewFileSystemProvider));
        const roots = [];
        const exportPreviewProfle = this.createExportPreviewProfile(this.profile);
        if (this.exportFlags?.settings ?? true) {
            const settingsResource = this.instantiationService.createInstance(SettingsResource);
            const settingsContent = await settingsResource.getContent(this.profile);
            await settingsResource.apply(settingsContent, exportPreviewProfle);
            const settingsResourceTreeItem = this.instantiationService.createInstance(SettingsResourceTreeItem, exportPreviewProfle);
            if (await settingsResourceTreeItem.hasContent()) {
                roots.push(settingsResourceTreeItem);
            }
        }
        if (this.exportFlags?.keybindings ?? true) {
            const keybindingsResource = this.instantiationService.createInstance(KeybindingsResource);
            const keybindingsContent = await keybindingsResource.getContent(this.profile);
            await keybindingsResource.apply(keybindingsContent, exportPreviewProfle);
            const keybindingsResourceTreeItem = this.instantiationService.createInstance(KeybindingsResourceTreeItem, exportPreviewProfle);
            if (await keybindingsResourceTreeItem.hasContent()) {
                roots.push(keybindingsResourceTreeItem);
            }
        }
        if (this.exportFlags?.snippets ?? true) {
            const snippetsResource = this.instantiationService.createInstance(SnippetsResource);
            const snippetsContent = await snippetsResource.getContent(this.profile);
            await snippetsResource.apply(snippetsContent, exportPreviewProfle);
            const snippetsResourceTreeItem = this.instantiationService.createInstance(SnippetsResourceTreeItem, exportPreviewProfle);
            if (await snippetsResourceTreeItem.hasContent()) {
                roots.push(snippetsResourceTreeItem);
            }
        }
        if (this.exportFlags?.tasks ?? true) {
            const tasksResource = this.instantiationService.createInstance(TasksResource);
            const tasksContent = await tasksResource.getContent(this.profile);
            await tasksResource.apply(tasksContent, exportPreviewProfle);
            const tasksResourceTreeItem = this.instantiationService.createInstance(TasksResourceTreeItem, exportPreviewProfle);
            if (await tasksResourceTreeItem.hasContent()) {
                roots.push(tasksResourceTreeItem);
            }
        }
        if (this.exportFlags?.globalState ?? true) {
            const globalStateResource = joinPath(exportPreviewProfle.globalStorageHome, 'globalState.json').with({ scheme: USER_DATA_PROFILE_EXPORT_PREVIEW_SCHEME });
            const globalStateResourceTreeItem = this.instantiationService.createInstance(GlobalStateResourceExportTreeItem, exportPreviewProfle, globalStateResource);
            const content = await globalStateResourceTreeItem.getContent();
            if (content) {
                await this.fileService.writeFile(globalStateResource, VSBuffer.fromString(JSON.stringify(JSON.parse(content), null, '\t')));
                roots.push(globalStateResourceTreeItem);
            }
        }
        if (this.exportFlags?.extensions ?? true) {
            const extensionsResourceTreeItem = this.instantiationService.createInstance(ExtensionsResourceExportTreeItem, exportPreviewProfle);
            if (await extensionsResourceTreeItem.hasContent()) {
                roots.push(extensionsResourceTreeItem);
            }
        }
        previewFileSystemProvider.setReadOnly(true);
        return roots;
    }
    createExportPreviewProfile(profile) {
        return {
            id: profile.id,
            name: profile.name,
            location: profile.location,
            isDefault: profile.isDefault,
            icon: profile.icon,
            globalStorageHome: profile.globalStorageHome,
            settingsResource: profile.settingsResource.with({ scheme: USER_DATA_PROFILE_EXPORT_SCHEME }),
            keybindingsResource: profile.keybindingsResource.with({
                scheme: USER_DATA_PROFILE_EXPORT_SCHEME,
            }),
            tasksResource: profile.tasksResource.with({ scheme: USER_DATA_PROFILE_EXPORT_SCHEME }),
            snippetsHome: profile.snippetsHome.with({ scheme: USER_DATA_PROFILE_EXPORT_SCHEME }),
            promptsHome: profile.promptsHome.with({ scheme: USER_DATA_PROFILE_EXPORT_SCHEME }),
            extensionsResource: profile.extensionsResource,
            cacheHome: profile.cacheHome,
            useDefaultFlags: profile.useDefaultFlags,
            isTransient: profile.isTransient,
        };
    }
    async getProfileToExport() {
        let name = this.profile.name;
        if (this.profile.isDefault) {
            name = await this.quickInputService.input({
                placeHolder: localize('export profile name', 'Name the profile'),
                title: localize('export profile title', 'Export Profile'),
                async validateInput(input) {
                    if (!input.trim()) {
                        return localize('profile name required', 'Profile name must be provided.');
                    }
                    return undefined;
                },
            });
            if (!name) {
                return null;
            }
        }
        return super.getProfileTemplate(name, this.profile.icon);
    }
};
UserDataProfileExportState = __decorate([
    __param(2, IQuickInputService),
    __param(3, IFileService),
    __param(4, IInstantiationService)
], UserDataProfileExportState);
registerSingleton(IUserDataProfileImportExportService, UserDataProfileImportExportService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlSW1wb3J0RXhwb3J0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhUHJvZmlsZS9icm93c2VyL3VzZXJEYXRhUHJvZmlsZUltcG9ydEV4cG9ydFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sbUNBQW1DLEVBQ25DLGNBQWMsRUFDZCxpQkFBaUIsRUFFakIsdUJBQXVCLEVBRXZCLGlCQUFpQixFQUNqQixpQ0FBaUMsRUFHakMscUJBQXFCLEVBQ3JCLG9CQUFvQixFQUVwQixZQUFZLEVBQ1osNEJBQTRCLEdBQzVCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsR0FFbEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLEdBQUcs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