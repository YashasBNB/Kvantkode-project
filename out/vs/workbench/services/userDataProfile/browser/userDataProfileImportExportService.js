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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlSW1wb3J0RXhwb3J0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVByb2ZpbGUvYnJvd3Nlci91c2VyRGF0YVByb2ZpbGVJbXBvcnRFeHBvcnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUNOLG1DQUFtQyxFQUNuQyxjQUFjLEVBQ2QsaUJBQWlCLEVBRWpCLHVCQUF1QixFQUV2QixpQkFBaUIsRUFDakIsaUNBQWlDLEVBR2pDLHFCQUFxQixFQUNyQixvQkFBb0IsRUFFcEIsWUFBWSxFQUNaLDRCQUE0QixHQUM1QixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEdBRWxCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDckUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUs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