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
import { distinct, isNonEmptyArray } from '../../../base/common/arrays.js';
import { Barrier, createCancelablePromise } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { CancellationError, getErrorMessage, isCancellationError, } from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { isWeb } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import * as nls from '../../../nls.js';
import { ExtensionManagementError, IExtensionGalleryService, isTargetPlatformCompatible, TargetPlatformToString, EXTENSION_INSTALL_DEP_PACK_CONTEXT, ExtensionGalleryError, EXTENSION_INSTALL_SOURCE_CONTEXT, ExtensionSignatureVerificationCode, IAllowedExtensionsService, } from './extensionManagement.js';
import { areSameExtensions, ExtensionKey, getGalleryExtensionId, getGalleryExtensionTelemetryData, getLocalExtensionTelemetryData, isMalicious, } from './extensionManagementUtil.js';
import { isApplicationScopedExtension, } from '../../extensions/common/extensions.js';
import { areApiProposalsCompatible } from '../../extensions/common/extensionValidator.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
let CommontExtensionManagementService = class CommontExtensionManagementService extends Disposable {
    constructor(productService, allowedExtensionsService) {
        super();
        this.productService = productService;
        this.allowedExtensionsService = allowedExtensionsService;
    }
    async canInstall(extension) {
        const allowedToInstall = this.allowedExtensionsService.isAllowed({
            id: extension.identifier.id,
            publisherDisplayName: extension.publisherDisplayName,
        });
        if (allowedToInstall !== true) {
            return new MarkdownString(nls.localize('not allowed to install', 'This extension cannot be installed because {0}', allowedToInstall.value));
        }
        if (!(await this.isExtensionPlatformCompatible(extension))) {
            const learnLink = isWeb
                ? 'https://aka.ms/vscode-web-extensions-guide'
                : 'https://aka.ms/vscode-platform-specific-extensions';
            return new MarkdownString(`${nls.localize('incompatible platform', "The '{0}' extension is not available in {1} for the {2}.", extension.displayName ?? extension.identifier.id, this.productService.nameLong, TargetPlatformToString(await this.getTargetPlatform()))} [${nls.localize('learn why', 'Learn Why')}](${learnLink})`);
        }
        return true;
    }
    async isExtensionPlatformCompatible(extension) {
        const currentTargetPlatform = await this.getTargetPlatform();
        return extension.allTargetPlatforms.some((targetPlatform) => isTargetPlatformCompatible(targetPlatform, extension.allTargetPlatforms, currentTargetPlatform));
    }
};
CommontExtensionManagementService = __decorate([
    __param(0, IProductService),
    __param(1, IAllowedExtensionsService)
], CommontExtensionManagementService);
export { CommontExtensionManagementService };
let AbstractExtensionManagementService = class AbstractExtensionManagementService extends CommontExtensionManagementService {
    get onInstallExtension() {
        return this._onInstallExtension.event;
    }
    get onDidInstallExtensions() {
        return this._onDidInstallExtensions.event;
    }
    get onUninstallExtension() {
        return this._onUninstallExtension.event;
    }
    get onDidUninstallExtension() {
        return this._onDidUninstallExtension.event;
    }
    get onDidUpdateExtensionMetadata() {
        return this._onDidUpdateExtensionMetadata.event;
    }
    constructor(galleryService, telemetryService, uriIdentityService, logService, productService, allowedExtensionsService, userDataProfilesService) {
        super(productService, allowedExtensionsService);
        this.galleryService = galleryService;
        this.telemetryService = telemetryService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.userDataProfilesService = userDataProfilesService;
        this.lastReportTimestamp = 0;
        this.installingExtensions = new Map();
        this.uninstallingExtensions = new Map();
        this._onInstallExtension = this._register(new Emitter());
        this._onDidInstallExtensions = this._register(new Emitter());
        this._onUninstallExtension = this._register(new Emitter());
        this._onDidUninstallExtension = this._register(new Emitter());
        this._onDidUpdateExtensionMetadata = this._register(new Emitter());
        this.participants = [];
        this._register(toDisposable(() => {
            this.installingExtensions.forEach(({ task }) => task.cancel());
            this.uninstallingExtensions.forEach((promise) => promise.cancel());
            this.installingExtensions.clear();
            this.uninstallingExtensions.clear();
        }));
    }
    async installFromGallery(extension, options = {}) {
        try {
            const results = await this.installGalleryExtensions([{ extension, options }]);
            const result = results.find(({ identifier }) => areSameExtensions(identifier, extension.identifier));
            if (result?.local) {
                return result?.local;
            }
            if (result?.error) {
                throw result.error;
            }
            throw new ExtensionManagementError(`Unknown error while installing extension ${extension.identifier.id}`, "Unknown" /* ExtensionManagementErrorCode.Unknown */);
        }
        catch (error) {
            throw toExtensionManagementError(error);
        }
    }
    async installGalleryExtensions(extensions) {
        if (!this.galleryService.isEnabled()) {
            throw new ExtensionManagementError(nls.localize('MarketPlaceDisabled', 'Marketplace is not enabled'), "NotAllowed" /* ExtensionManagementErrorCode.NotAllowed */);
        }
        const results = [];
        const installableExtensions = [];
        await Promise.allSettled(extensions.map(async ({ extension, options }) => {
            try {
                const compatible = await this.checkAndGetCompatibleVersion(extension, !!options?.installGivenVersion, !!options?.installPreReleaseVersion, options.productVersion ?? {
                    version: this.productService.version,
                    date: this.productService.date,
                });
                installableExtensions.push({ ...compatible, options });
            }
            catch (error) {
                results.push({
                    identifier: extension.identifier,
                    operation: 2 /* InstallOperation.Install */,
                    source: extension,
                    error,
                    profileLocation: options.profileLocation ?? this.getCurrentExtensionsManifestLocation(),
                });
            }
        }));
        if (installableExtensions.length) {
            results.push(...(await this.installExtensions(installableExtensions)));
        }
        return results;
    }
    async uninstall(extension, options) {
        this.logService.trace('ExtensionManagementService#uninstall', extension.identifier.id);
        return this.uninstallExtensions([{ extension, options }]);
    }
    async toggleAppliationScope(extension, fromProfileLocation) {
        if (isApplicationScopedExtension(extension.manifest) || extension.isBuiltin) {
            return extension;
        }
        if (extension.isApplicationScoped) {
            let local = await this.updateMetadata(extension, { isApplicationScoped: false }, this.userDataProfilesService.defaultProfile.extensionsResource);
            if (!this.uriIdentityService.extUri.isEqual(fromProfileLocation, this.userDataProfilesService.defaultProfile.extensionsResource)) {
                local = await this.copyExtension(extension, this.userDataProfilesService.defaultProfile.extensionsResource, fromProfileLocation);
            }
            for (const profile of this.userDataProfilesService.profiles) {
                const existing = (await this.getInstalled(1 /* ExtensionType.User */, profile.extensionsResource)).find((e) => areSameExtensions(e.identifier, extension.identifier));
                if (existing) {
                    this._onDidUpdateExtensionMetadata.fire({
                        local: existing,
                        profileLocation: profile.extensionsResource,
                    });
                }
                else {
                    this._onDidUninstallExtension.fire({
                        identifier: extension.identifier,
                        profileLocation: profile.extensionsResource,
                    });
                }
            }
            return local;
        }
        else {
            const local = this.uriIdentityService.extUri.isEqual(fromProfileLocation, this.userDataProfilesService.defaultProfile.extensionsResource)
                ? await this.updateMetadata(extension, { isApplicationScoped: true }, this.userDataProfilesService.defaultProfile.extensionsResource)
                : await this.copyExtension(extension, fromProfileLocation, this.userDataProfilesService.defaultProfile.extensionsResource, { isApplicationScoped: true });
            this._onDidInstallExtensions.fire([
                {
                    identifier: local.identifier,
                    operation: 2 /* InstallOperation.Install */,
                    local,
                    profileLocation: this.userDataProfilesService.defaultProfile.extensionsResource,
                    applicationScoped: true,
                },
            ]);
            return local;
        }
    }
    getExtensionsControlManifest() {
        const now = new Date().getTime();
        if (!this.extensionsControlManifest || now - this.lastReportTimestamp > 1000 * 60 * 5) {
            // 5 minute cache freshness
            this.extensionsControlManifest = this.updateControlCache();
            this.lastReportTimestamp = now;
        }
        return this.extensionsControlManifest;
    }
    registerParticipant(participant) {
        this.participants.push(participant);
    }
    async resetPinnedStateForAllUserExtensions(pinned) {
        try {
            await this.joinAllSettled(this.userDataProfilesService.profiles.map(async (profile) => {
                const extensions = await this.getInstalled(1 /* ExtensionType.User */, profile.extensionsResource);
                await this.joinAllSettled(extensions.map(async (extension) => {
                    if (extension.pinned !== pinned) {
                        await this.updateMetadata(extension, { pinned }, profile.extensionsResource);
                    }
                }));
            }));
        }
        catch (error) {
            this.logService.error('Error while resetting pinned state for all user extensions', getErrorMessage(error));
            throw error;
        }
    }
    async installExtensions(extensions) {
        const installExtensionResultsMap = new Map();
        const installingExtensionsMap = new Map();
        const alreadyRequestedInstallations = [];
        const getInstallExtensionTaskKey = (extension, profileLocation) => `${ExtensionKey.create(extension).toString()}-${profileLocation.toString()}`;
        const createInstallExtensionTask = (manifest, extension, options, root) => {
            if (!URI.isUri(extension)) {
                if (installingExtensionsMap.has(`${extension.identifier.id.toLowerCase()}-${options.profileLocation.toString()}`)) {
                    return;
                }
                const existingInstallingExtension = this.installingExtensions.get(getInstallExtensionTaskKey(extension, options.profileLocation));
                if (existingInstallingExtension) {
                    if (root && this.canWaitForTask(root, existingInstallingExtension.task)) {
                        const identifier = existingInstallingExtension.task.identifier;
                        this.logService.info('Waiting for already requested installing extension', identifier.id, root.identifier.id, options.profileLocation.toString());
                        existingInstallingExtension.waitingTasks.push(root);
                        // add promise that waits until the extension is completely installed, ie., onDidInstallExtensions event is triggered for this extension
                        alreadyRequestedInstallations.push(Event.toPromise(Event.filter(this.onDidInstallExtensions, (results) => results.some((result) => areSameExtensions(result.identifier, identifier)))).then((results) => {
                            this.logService.info('Finished waiting for already requested installing extension', identifier.id, root.identifier.id, options.profileLocation.toString());
                            const result = results.find((result) => areSameExtensions(result.identifier, identifier));
                            if (!result?.local) {
                                // Extension failed to install
                                throw new Error(`Extension ${identifier.id} is not installed`);
                            }
                        }));
                    }
                    return;
                }
            }
            const installExtensionTask = this.createInstallExtensionTask(manifest, extension, options);
            const key = `${getGalleryExtensionId(manifest.publisher, manifest.name)}-${options.profileLocation.toString()}`;
            installingExtensionsMap.set(key, { task: installExtensionTask, root });
            this._onInstallExtension.fire({
                identifier: installExtensionTask.identifier,
                source: extension,
                profileLocation: options.profileLocation,
            });
            this.logService.info('Installing extension:', installExtensionTask.identifier.id, options);
            // only cache gallery extensions tasks
            if (!URI.isUri(extension)) {
                this.installingExtensions.set(getInstallExtensionTaskKey(extension, options.profileLocation), { task: installExtensionTask, waitingTasks: [] });
            }
        };
        try {
            // Start installing extensions
            for (const { manifest, extension, options } of extensions) {
                const isApplicationScoped = options.isApplicationScoped || options.isBuiltin || isApplicationScopedExtension(manifest);
                const installExtensionTaskOptions = {
                    ...options,
                    isApplicationScoped,
                    profileLocation: isApplicationScoped
                        ? this.userDataProfilesService.defaultProfile.extensionsResource
                        : (options.profileLocation ?? this.getCurrentExtensionsManifestLocation()),
                    productVersion: options.productVersion ?? {
                        version: this.productService.version,
                        date: this.productService.date,
                    },
                };
                const existingInstallExtensionTask = !URI.isUri(extension)
                    ? this.installingExtensions.get(getInstallExtensionTaskKey(extension, installExtensionTaskOptions.profileLocation))
                    : undefined;
                if (existingInstallExtensionTask) {
                    this.logService.info('Extension is already requested to install', existingInstallExtensionTask.task.identifier.id, installExtensionTaskOptions.profileLocation.toString());
                    alreadyRequestedInstallations.push(existingInstallExtensionTask.task.waitUntilTaskIsFinished());
                }
                else {
                    createInstallExtensionTask(manifest, extension, installExtensionTaskOptions, undefined);
                }
            }
            // collect and start installing all dependencies and pack extensions
            await Promise.all([...installingExtensionsMap.values()].map(async ({ task }) => {
                if (task.options.donotIncludePackAndDependencies) {
                    this.logService.info('Installing the extension without checking dependencies and pack', task.identifier.id);
                }
                else {
                    try {
                        const allDepsAndPackExtensionsToInstall = await this.getAllDepsAndPackExtensions(task.identifier, task.manifest, !!task.options.installPreReleaseVersion, task.options.productVersion);
                        const installed = await this.getInstalled(undefined, task.options.profileLocation, task.options.productVersion);
                        const options = {
                            ...task.options,
                            context: { ...task.options.context, [EXTENSION_INSTALL_DEP_PACK_CONTEXT]: true },
                        };
                        for (const { gallery, manifest } of distinct(allDepsAndPackExtensionsToInstall, ({ gallery }) => gallery.identifier.id)) {
                            const existing = installed.find((e) => areSameExtensions(e.identifier, gallery.identifier));
                            // Skip if the extension is already installed and has the same application scope
                            if (existing && existing.isApplicationScoped === !!options.isApplicationScoped) {
                                continue;
                            }
                            createInstallExtensionTask(manifest, gallery, options, task);
                        }
                    }
                    catch (error) {
                        // Installing through VSIX
                        if (URI.isUri(task.source)) {
                            // Ignore installing dependencies and packs
                            if (isNonEmptyArray(task.manifest.extensionDependencies)) {
                                this.logService.warn(`Cannot install dependencies of extension:`, task.identifier.id, error.message);
                            }
                            if (isNonEmptyArray(task.manifest.extensionPack)) {
                                this.logService.warn(`Cannot install packed extensions of extension:`, task.identifier.id, error.message);
                            }
                        }
                        else {
                            this.logService.error('Error while preparing to install dependencies and extension packs of the extension:', task.identifier.id);
                            throw error;
                        }
                    }
                }
            }));
            const otherProfilesToUpdate = await this.getOtherProfilesToUpdateExtension([...installingExtensionsMap.values()].map(({ task }) => task));
            for (const [profileLocation, task] of otherProfilesToUpdate) {
                createInstallExtensionTask(task.manifest, task.source, { ...task.options, profileLocation }, undefined);
            }
            // Install extensions in parallel and wait until all extensions are installed / failed
            await this.joinAllSettled([...installingExtensionsMap.entries()].map(async ([key, { task }]) => {
                const startTime = new Date().getTime();
                let local;
                try {
                    local = await task.run();
                    await this.joinAllSettled(this.participants.map((participant) => participant.postInstall(local, task.source, task.options, CancellationToken.None)), "PostInstall" /* ExtensionManagementErrorCode.PostInstall */);
                }
                catch (e) {
                    const error = toExtensionManagementError(e);
                    if (!URI.isUri(task.source)) {
                        reportTelemetry(this.telemetryService, task.operation === 3 /* InstallOperation.Update */
                            ? 'extensionGallery:update'
                            : 'extensionGallery:install', {
                            extensionData: getGalleryExtensionTelemetryData(task.source),
                            error,
                            source: task.options.context?.[EXTENSION_INSTALL_SOURCE_CONTEXT],
                        });
                    }
                    installExtensionResultsMap.set(key, {
                        error,
                        identifier: task.identifier,
                        operation: task.operation,
                        source: task.source,
                        context: task.options.context,
                        profileLocation: task.options.profileLocation,
                        applicationScoped: task.options.isApplicationScoped,
                    });
                    this.logService.error('Error while installing the extension', task.identifier.id, getErrorMessage(error), task.options.profileLocation.toString());
                    throw error;
                }
                if (!URI.isUri(task.source)) {
                    const isUpdate = task.operation === 3 /* InstallOperation.Update */;
                    const durationSinceUpdate = isUpdate
                        ? undefined
                        : (new Date().getTime() - task.source.lastUpdated) / 1000;
                    reportTelemetry(this.telemetryService, isUpdate ? 'extensionGallery:update' : 'extensionGallery:install', {
                        extensionData: getGalleryExtensionTelemetryData(task.source),
                        verificationStatus: task.verificationStatus,
                        duration: new Date().getTime() - startTime,
                        durationSinceUpdate,
                        source: task.options.context?.[EXTENSION_INSTALL_SOURCE_CONTEXT],
                    });
                    // In web, report extension install statistics explicitly. In Desktop, statistics are automatically updated while downloading the VSIX.
                    if (isWeb && task.operation !== 3 /* InstallOperation.Update */) {
                        try {
                            await this.galleryService.reportStatistic(local.manifest.publisher, local.manifest.name, local.manifest.version, "install" /* StatisticType.Install */);
                        }
                        catch (error) {
                            /* ignore */
                        }
                    }
                }
                installExtensionResultsMap.set(key, {
                    local,
                    identifier: task.identifier,
                    operation: task.operation,
                    source: task.source,
                    context: task.options.context,
                    profileLocation: task.options.profileLocation,
                    applicationScoped: local.isApplicationScoped,
                });
            }));
            if (alreadyRequestedInstallations.length) {
                await this.joinAllSettled(alreadyRequestedInstallations);
            }
        }
        catch (error) {
            const getAllDepsAndPacks = (extension, profileLocation, allDepsOrPacks) => {
                const depsOrPacks = [];
                if (extension.manifest.extensionDependencies?.length) {
                    depsOrPacks.push(...extension.manifest.extensionDependencies);
                }
                if (extension.manifest.extensionPack?.length) {
                    depsOrPacks.push(...extension.manifest.extensionPack);
                }
                for (const id of depsOrPacks) {
                    if (allDepsOrPacks.includes(id.toLowerCase())) {
                        continue;
                    }
                    allDepsOrPacks.push(id.toLowerCase());
                    const installed = installExtensionResultsMap.get(`${id.toLowerCase()}-${profileLocation.toString()}`);
                    if (installed?.local) {
                        allDepsOrPacks = getAllDepsAndPacks(installed.local, profileLocation, allDepsOrPacks);
                    }
                }
                return allDepsOrPacks;
            };
            const getErrorResult = (task) => ({
                identifier: task.identifier,
                operation: 2 /* InstallOperation.Install */,
                source: task.source,
                context: task.options.context,
                profileLocation: task.options.profileLocation,
                error,
            });
            const rollbackTasks = [];
            for (const [key, { task, root }] of installingExtensionsMap) {
                const result = installExtensionResultsMap.get(key);
                if (!result) {
                    task.cancel();
                    installExtensionResultsMap.set(key, getErrorResult(task));
                }
                // If the extension is installed by a root task and the root task is failed, then uninstall the extension
                else if (result.local &&
                    root &&
                    !installExtensionResultsMap.get(`${root.identifier.id.toLowerCase()}-${task.options.profileLocation.toString()}`)?.local) {
                    rollbackTasks.push(this.createUninstallExtensionTask(result.local, {
                        versionOnly: true,
                        profileLocation: task.options.profileLocation,
                    }));
                    installExtensionResultsMap.set(key, getErrorResult(task));
                }
            }
            for (const [key, { task }] of installingExtensionsMap) {
                const result = installExtensionResultsMap.get(key);
                if (!result?.local) {
                    continue;
                }
                if (task.options.donotIncludePackAndDependencies) {
                    continue;
                }
                const depsOrPacks = getAllDepsAndPacks(result.local, task.options.profileLocation, [
                    result.local.identifier.id.toLowerCase(),
                ]).slice(1);
                if (depsOrPacks.some((depOrPack) => installingExtensionsMap.has(`${depOrPack.toLowerCase()}-${task.options.profileLocation.toString()}`) &&
                    !installExtensionResultsMap.get(`${depOrPack.toLowerCase()}-${task.options.profileLocation.toString()}`)?.local)) {
                    rollbackTasks.push(this.createUninstallExtensionTask(result.local, {
                        versionOnly: true,
                        profileLocation: task.options.profileLocation,
                    }));
                    installExtensionResultsMap.set(key, getErrorResult(task));
                }
            }
            if (rollbackTasks.length) {
                await Promise.allSettled(rollbackTasks.map(async (rollbackTask) => {
                    try {
                        await rollbackTask.run();
                        this.logService.info('Rollback: Uninstalled extension', rollbackTask.extension.identifier.id);
                    }
                    catch (error) {
                        this.logService.warn('Rollback: Error while uninstalling extension', rollbackTask.extension.identifier.id, getErrorMessage(error));
                    }
                }));
            }
        }
        finally {
            // Finally, remove all the tasks from the cache
            for (const { task } of installingExtensionsMap.values()) {
                if (task.source && !URI.isUri(task.source)) {
                    this.installingExtensions.delete(getInstallExtensionTaskKey(task.source, task.options.profileLocation));
                }
            }
        }
        const results = [...installExtensionResultsMap.values()];
        for (const result of results) {
            if (result.local) {
                this.logService.info(`Extension installed successfully:`, result.identifier.id, result.profileLocation.toString());
            }
        }
        this._onDidInstallExtensions.fire(results);
        return results;
    }
    async getOtherProfilesToUpdateExtension(tasks) {
        const otherProfilesToUpdate = [];
        const profileExtensionsCache = new ResourceMap();
        for (const task of tasks) {
            if (task.operation !== 3 /* InstallOperation.Update */ ||
                task.options.isApplicationScoped ||
                task.options.pinned ||
                task.options.installGivenVersion ||
                URI.isUri(task.source)) {
                continue;
            }
            for (const profile of this.userDataProfilesService.profiles) {
                if (this.uriIdentityService.extUri.isEqual(profile.extensionsResource, task.options.profileLocation)) {
                    continue;
                }
                let installedExtensions = profileExtensionsCache.get(profile.extensionsResource);
                if (!installedExtensions) {
                    installedExtensions = await this.getInstalled(1 /* ExtensionType.User */, profile.extensionsResource);
                    profileExtensionsCache.set(profile.extensionsResource, installedExtensions);
                }
                const installedExtension = installedExtensions.find((e) => areSameExtensions(e.identifier, task.identifier));
                if (installedExtension && !installedExtension.pinned) {
                    otherProfilesToUpdate.push([profile.extensionsResource, task]);
                }
            }
        }
        return otherProfilesToUpdate;
    }
    canWaitForTask(taskToWait, taskToWaitFor) {
        for (const [, { task, waitingTasks }] of this.installingExtensions.entries()) {
            if (task === taskToWait) {
                // Cannot be waited, If taskToWaitFor is waiting for taskToWait
                if (waitingTasks.includes(taskToWaitFor)) {
                    return false;
                }
                // Cannot be waited, If taskToWaitFor is waiting for tasks waiting for taskToWait
                if (waitingTasks.some((waitingTask) => this.canWaitForTask(waitingTask, taskToWaitFor))) {
                    return false;
                }
            }
            // Cannot be waited, if the taskToWait cannot be waited for the task created the taskToWaitFor
            // Because, the task waits for the tasks it created
            if (task === taskToWaitFor &&
                waitingTasks[0] &&
                !this.canWaitForTask(taskToWait, waitingTasks[0])) {
                return false;
            }
        }
        return true;
    }
    async joinAllSettled(promises, errorCode) {
        const results = [];
        const errors = [];
        const promiseResults = await Promise.allSettled(promises);
        for (const r of promiseResults) {
            if (r.status === 'fulfilled') {
                results.push(r.value);
            }
            else {
                errors.push(toExtensionManagementError(r.reason, errorCode));
            }
        }
        if (!errors.length) {
            return results;
        }
        // Throw if there are errors
        if (errors.length === 1) {
            throw errors[0];
        }
        let error = new ExtensionManagementError('', "Unknown" /* ExtensionManagementErrorCode.Unknown */);
        for (const current of errors) {
            error = new ExtensionManagementError(error.message ? `${error.message}, ${current.message}` : current.message, current.code !== "Unknown" /* ExtensionManagementErrorCode.Unknown */ &&
                current.code !== "Internal" /* ExtensionManagementErrorCode.Internal */
                ? current.code
                : error.code);
        }
        throw error;
    }
    async getAllDepsAndPackExtensions(extensionIdentifier, manifest, installPreRelease, productVersion) {
        if (!this.galleryService.isEnabled()) {
            return [];
        }
        const knownIdentifiers = [];
        const allDependenciesAndPacks = [];
        const collectDependenciesAndPackExtensionsToInstall = async (extensionIdentifier, manifest) => {
            knownIdentifiers.push(extensionIdentifier);
            const dependecies = manifest.extensionDependencies || [];
            const dependenciesAndPackExtensions = [...dependecies];
            if (manifest.extensionPack) {
                for (const extension of manifest.extensionPack) {
                    if (dependenciesAndPackExtensions.every((e) => !areSameExtensions({ id: e }, { id: extension }))) {
                        dependenciesAndPackExtensions.push(extension);
                    }
                }
            }
            if (dependenciesAndPackExtensions.length) {
                // filter out known extensions
                const ids = dependenciesAndPackExtensions.filter((id) => knownIdentifiers.every((galleryIdentifier) => !areSameExtensions(galleryIdentifier, { id })));
                if (ids.length) {
                    const galleryExtensions = await this.galleryService.getExtensions(ids.map((id) => ({ id, preRelease: installPreRelease })), CancellationToken.None);
                    for (const galleryExtension of galleryExtensions) {
                        if (knownIdentifiers.find((identifier) => areSameExtensions(identifier, galleryExtension.identifier))) {
                            continue;
                        }
                        const isDependency = dependecies.some((id) => areSameExtensions({ id }, galleryExtension.identifier));
                        let compatible;
                        try {
                            compatible = await this.checkAndGetCompatibleVersion(galleryExtension, false, installPreRelease, productVersion);
                        }
                        catch (error) {
                            if (!isDependency) {
                                this.logService.info('Skipping the packed extension as it cannot be installed', galleryExtension.identifier.id, getErrorMessage(error));
                                continue;
                            }
                            else {
                                throw error;
                            }
                        }
                        allDependenciesAndPacks.push({
                            gallery: compatible.extension,
                            manifest: compatible.manifest,
                        });
                        await collectDependenciesAndPackExtensionsToInstall(compatible.extension.identifier, compatible.manifest);
                    }
                }
            }
        };
        await collectDependenciesAndPackExtensionsToInstall(extensionIdentifier, manifest);
        return allDependenciesAndPacks;
    }
    async checkAndGetCompatibleVersion(extension, sameVersion, installPreRelease, productVersion) {
        let compatibleExtension;
        const extensionsControlManifest = await this.getExtensionsControlManifest();
        if (isMalicious(extension.identifier, extensionsControlManifest.malicious)) {
            throw new ExtensionManagementError(nls.localize('malicious extension', "Can't install '{0}' extension since it was reported to be problematic.", extension.identifier.id), "Malicious" /* ExtensionManagementErrorCode.Malicious */);
        }
        const deprecationInfo = extensionsControlManifest.deprecated[extension.identifier.id.toLowerCase()];
        if (deprecationInfo?.extension?.autoMigrate) {
            this.logService.info(`The '${extension.identifier.id}' extension is deprecated, fetching the compatible '${deprecationInfo.extension.id}' extension instead.`);
            compatibleExtension = (await this.galleryService.getExtensions([{ id: deprecationInfo.extension.id, preRelease: deprecationInfo.extension.preRelease }], { targetPlatform: await this.getTargetPlatform(), compatible: true, productVersion }, CancellationToken.None))[0];
            if (!compatibleExtension) {
                throw new ExtensionManagementError(nls.localize('notFoundDeprecatedReplacementExtension', "Can't install '{0}' extension since it was deprecated and the replacement extension '{1}' can't be found.", extension.identifier.id, deprecationInfo.extension.id), "Deprecated" /* ExtensionManagementErrorCode.Deprecated */);
            }
        }
        else {
            if ((await this.canInstall(extension)) !== true) {
                const targetPlatform = await this.getTargetPlatform();
                throw new ExtensionManagementError(nls.localize('incompatible platform', "The '{0}' extension is not available in {1} for the {2}.", extension.identifier.id, this.productService.nameLong, TargetPlatformToString(targetPlatform)), "IncompatibleTargetPlatform" /* ExtensionManagementErrorCode.IncompatibleTargetPlatform */);
            }
            compatibleExtension = await this.getCompatibleVersion(extension, sameVersion, installPreRelease, productVersion);
            if (!compatibleExtension) {
                const incompatibleApiProposalsMessages = [];
                if (!areApiProposalsCompatible(extension.properties.enabledApiProposals ?? [], incompatibleApiProposalsMessages)) {
                    throw new ExtensionManagementError(nls.localize('incompatibleAPI', "Can't install '{0}' extension. {1}", extension.displayName ?? extension.identifier.id, incompatibleApiProposalsMessages[0]), "IncompatibleApi" /* ExtensionManagementErrorCode.IncompatibleApi */);
                }
                /** If no compatible release version is found, check if the extension has a release version or not and throw relevant error */
                if (!installPreRelease &&
                    extension.properties.isPreReleaseVersion &&
                    (await this.galleryService.getExtensions([extension.identifier], CancellationToken.None))[0]) {
                    throw new ExtensionManagementError(nls.localize('notFoundReleaseExtension', "Can't install release version of '{0}' extension because it has no release version.", extension.displayName ?? extension.identifier.id), "ReleaseVersionNotFound" /* ExtensionManagementErrorCode.ReleaseVersionNotFound */);
                }
                throw new ExtensionManagementError(nls.localize('notFoundCompatibleDependency', "Can't install '{0}' extension because it is not compatible with the current version of {1} (version {2}).", extension.identifier.id, this.productService.nameLong, this.productService.version), "Incompatible" /* ExtensionManagementErrorCode.Incompatible */);
            }
        }
        this.logService.info('Getting Manifest...', compatibleExtension.identifier.id);
        const manifest = await this.galleryService.getManifest(compatibleExtension, CancellationToken.None);
        if (manifest === null) {
            throw new ExtensionManagementError(`Missing manifest for extension ${compatibleExtension.identifier.id}`, "Invalid" /* ExtensionManagementErrorCode.Invalid */);
        }
        if (manifest.version !== compatibleExtension.version) {
            throw new ExtensionManagementError(`Cannot install '${compatibleExtension.identifier.id}' extension because of version mismatch in Marketplace`, "Invalid" /* ExtensionManagementErrorCode.Invalid */);
        }
        return { extension: compatibleExtension, manifest };
    }
    async getCompatibleVersion(extension, sameVersion, includePreRelease, productVersion) {
        const targetPlatform = await this.getTargetPlatform();
        let compatibleExtension = null;
        if (!sameVersion &&
            extension.hasPreReleaseVersion &&
            extension.properties.isPreReleaseVersion !== includePreRelease) {
            compatibleExtension =
                (await this.galleryService.getExtensions([{ ...extension.identifier, preRelease: includePreRelease }], { targetPlatform, compatible: true, productVersion }, CancellationToken.None))[0] || null;
        }
        if (!compatibleExtension &&
            (await this.galleryService.isExtensionCompatible(extension, includePreRelease, targetPlatform, productVersion))) {
            compatibleExtension = extension;
        }
        if (!compatibleExtension) {
            if (sameVersion) {
                compatibleExtension =
                    (await this.galleryService.getExtensions([{ ...extension.identifier, version: extension.version }], { targetPlatform, compatible: true, productVersion }, CancellationToken.None))[0] || null;
            }
            else {
                compatibleExtension = await this.galleryService.getCompatibleExtension(extension, includePreRelease, targetPlatform, productVersion);
            }
        }
        return compatibleExtension;
    }
    async uninstallExtensions(extensions) {
        const getUninstallExtensionTaskKey = (extension, uninstallOptions) => `${extension.identifier.id.toLowerCase()}${uninstallOptions.versionOnly ? `-${extension.manifest.version}` : ''}@${uninstallOptions.profileLocation.toString()}`;
        const createUninstallExtensionTask = (extension, uninstallOptions) => {
            const uninstallExtensionTask = this.createUninstallExtensionTask(extension, uninstallOptions);
            this.uninstallingExtensions.set(getUninstallExtensionTaskKey(uninstallExtensionTask.extension, uninstallOptions), uninstallExtensionTask);
            this.logService.info('Uninstalling extension from the profile:', `${extension.identifier.id}@${extension.manifest.version}`, uninstallOptions.profileLocation.toString());
            this._onUninstallExtension.fire({
                identifier: extension.identifier,
                profileLocation: uninstallOptions.profileLocation,
                applicationScoped: extension.isApplicationScoped,
            });
            return uninstallExtensionTask;
        };
        const postUninstallExtension = (extension, uninstallOptions, error) => {
            if (error) {
                this.logService.error('Failed to uninstall extension from the profile:', `${extension.identifier.id}@${extension.manifest.version}`, uninstallOptions.profileLocation.toString(), error.message);
            }
            else {
                this.logService.info('Successfully uninstalled extension from the profile', `${extension.identifier.id}@${extension.manifest.version}`, uninstallOptions.profileLocation.toString());
            }
            reportTelemetry(this.telemetryService, 'extensionGallery:uninstall', {
                extensionData: getLocalExtensionTelemetryData(extension),
                error,
            });
            this._onDidUninstallExtension.fire({
                identifier: extension.identifier,
                error: error?.code,
                profileLocation: uninstallOptions.profileLocation,
                applicationScoped: extension.isApplicationScoped,
            });
        };
        const allTasks = [];
        const processedTasks = [];
        const alreadyRequestedUninstalls = [];
        const extensionsToRemove = [];
        const installedExtensionsMap = new ResourceMap();
        const getInstalledExtensions = async (profileLocation) => {
            let installed = installedExtensionsMap.get(profileLocation);
            if (!installed) {
                installedExtensionsMap.set(profileLocation, (installed = await this.getInstalled(1 /* ExtensionType.User */, profileLocation)));
            }
            return installed;
        };
        for (const { extension, options } of extensions) {
            const uninstallOptions = {
                ...options,
                profileLocation: extension.isApplicationScoped
                    ? this.userDataProfilesService.defaultProfile.extensionsResource
                    : (options?.profileLocation ?? this.getCurrentExtensionsManifestLocation()),
            };
            const uninstallExtensionTask = this.uninstallingExtensions.get(getUninstallExtensionTaskKey(extension, uninstallOptions));
            if (uninstallExtensionTask) {
                this.logService.info('Extensions is already requested to uninstall', extension.identifier.id);
                alreadyRequestedUninstalls.push(uninstallExtensionTask.waitUntilTaskIsFinished());
            }
            else {
                allTasks.push(createUninstallExtensionTask(extension, uninstallOptions));
            }
            if (uninstallOptions.remove) {
                extensionsToRemove.push(extension);
                for (const profile of this.userDataProfilesService.profiles) {
                    if (this.uriIdentityService.extUri.isEqual(profile.extensionsResource, uninstallOptions.profileLocation)) {
                        continue;
                    }
                    const installed = await getInstalledExtensions(profile.extensionsResource);
                    const profileExtension = installed.find((e) => areSameExtensions(e.identifier, extension.identifier));
                    if (profileExtension) {
                        const uninstallOptionsWithProfile = {
                            ...uninstallOptions,
                            profileLocation: profile.extensionsResource,
                        };
                        const uninstallExtensionTask = this.uninstallingExtensions.get(getUninstallExtensionTaskKey(profileExtension, uninstallOptionsWithProfile));
                        if (uninstallExtensionTask) {
                            this.logService.info('Extensions is already requested to uninstall', profileExtension.identifier.id);
                            alreadyRequestedUninstalls.push(uninstallExtensionTask.waitUntilTaskIsFinished());
                        }
                        else {
                            allTasks.push(createUninstallExtensionTask(profileExtension, uninstallOptionsWithProfile));
                        }
                    }
                }
            }
        }
        try {
            for (const task of allTasks.slice(0)) {
                const installed = await getInstalledExtensions(task.options.profileLocation);
                if (task.options.donotIncludePack) {
                    this.logService.info('Uninstalling the extension without including packed extension', `${task.extension.identifier.id}@${task.extension.manifest.version}`);
                }
                else {
                    const packedExtensions = this.getAllPackExtensionsToUninstall(task.extension, installed);
                    for (const packedExtension of packedExtensions) {
                        if (this.uninstallingExtensions.has(getUninstallExtensionTaskKey(packedExtension, task.options))) {
                            this.logService.info('Extensions is already requested to uninstall', packedExtension.identifier.id);
                        }
                        else {
                            allTasks.push(createUninstallExtensionTask(packedExtension, task.options));
                        }
                    }
                }
                if (task.options.donotCheckDependents) {
                    this.logService.info('Uninstalling the extension without checking dependents', `${task.extension.identifier.id}@${task.extension.manifest.version}`);
                }
                else {
                    this.checkForDependents(allTasks.map((task) => task.extension), installed, task.extension);
                }
            }
            // Uninstall extensions in parallel and wait until all extensions are uninstalled / failed
            await this.joinAllSettled(allTasks.map(async (task) => {
                try {
                    await task.run();
                    await this.joinAllSettled(this.participants.map((participant) => participant.postUninstall(task.extension, task.options, CancellationToken.None)));
                    // only report if extension has a mapped gallery extension. UUID identifies the gallery extension.
                    if (task.extension.identifier.uuid) {
                        try {
                            await this.galleryService.reportStatistic(task.extension.manifest.publisher, task.extension.manifest.name, task.extension.manifest.version, "uninstall" /* StatisticType.Uninstall */);
                        }
                        catch (error) {
                            /* ignore */
                        }
                    }
                }
                catch (e) {
                    const error = toExtensionManagementError(e);
                    postUninstallExtension(task.extension, task.options, error);
                    throw error;
                }
                finally {
                    processedTasks.push(task);
                }
            }));
            if (alreadyRequestedUninstalls.length) {
                await this.joinAllSettled(alreadyRequestedUninstalls);
            }
            for (const task of allTasks) {
                postUninstallExtension(task.extension, task.options);
            }
            if (extensionsToRemove.length) {
                await this.joinAllSettled(extensionsToRemove.map((extension) => this.removeExtension(extension)));
            }
        }
        catch (e) {
            const error = toExtensionManagementError(e);
            for (const task of allTasks) {
                // cancel the tasks
                try {
                    task.cancel();
                }
                catch (error) {
                    /* ignore */
                }
                if (!processedTasks.includes(task)) {
                    postUninstallExtension(task.extension, task.options, error);
                }
            }
            throw error;
        }
        finally {
            // Remove tasks from cache
            for (const task of allTasks) {
                if (!this.uninstallingExtensions.delete(getUninstallExtensionTaskKey(task.extension, task.options))) {
                    this.logService.warn('Uninstallation task is not found in the cache', task.extension.identifier.id);
                }
            }
        }
    }
    checkForDependents(extensionsToUninstall, installed, extensionToUninstall) {
        for (const extension of extensionsToUninstall) {
            const dependents = this.getDependents(extension, installed);
            if (dependents.length) {
                const remainingDependents = dependents.filter((dependent) => !extensionsToUninstall.some((e) => areSameExtensions(e.identifier, dependent.identifier)));
                if (remainingDependents.length) {
                    throw new Error(this.getDependentsErrorMessage(extension, remainingDependents, extensionToUninstall));
                }
            }
        }
    }
    getDependentsErrorMessage(dependingExtension, dependents, extensionToUninstall) {
        if (extensionToUninstall === dependingExtension) {
            if (dependents.length === 1) {
                return nls.localize('singleDependentError', "Cannot uninstall '{0}' extension. '{1}' extension depends on this.", extensionToUninstall.manifest.displayName || extensionToUninstall.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name);
            }
            if (dependents.length === 2) {
                return nls.localize('twoDependentsError', "Cannot uninstall '{0}' extension. '{1}' and '{2}' extensions depend on this.", extensionToUninstall.manifest.displayName || extensionToUninstall.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name, dependents[1].manifest.displayName || dependents[1].manifest.name);
            }
            return nls.localize('multipleDependentsError', "Cannot uninstall '{0}' extension. '{1}', '{2}' and other extension depend on this.", extensionToUninstall.manifest.displayName || extensionToUninstall.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name, dependents[1].manifest.displayName || dependents[1].manifest.name);
        }
        if (dependents.length === 1) {
            return nls.localize('singleIndirectDependentError', "Cannot uninstall '{0}' extension . It includes uninstalling '{1}' extension and '{2}' extension depends on this.", extensionToUninstall.manifest.displayName || extensionToUninstall.manifest.name, dependingExtension.manifest.displayName || dependingExtension.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name);
        }
        if (dependents.length === 2) {
            return nls.localize('twoIndirectDependentsError', "Cannot uninstall '{0}' extension. It includes uninstalling '{1}' extension and '{2}' and '{3}' extensions depend on this.", extensionToUninstall.manifest.displayName || extensionToUninstall.manifest.name, dependingExtension.manifest.displayName || dependingExtension.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name, dependents[1].manifest.displayName || dependents[1].manifest.name);
        }
        return nls.localize('multipleIndirectDependentsError', "Cannot uninstall '{0}' extension. It includes uninstalling '{1}' extension and '{2}', '{3}' and other extensions depend on this.", extensionToUninstall.manifest.displayName || extensionToUninstall.manifest.name, dependingExtension.manifest.displayName || dependingExtension.manifest.name, dependents[0].manifest.displayName || dependents[0].manifest.name, dependents[1].manifest.displayName || dependents[1].manifest.name);
    }
    getAllPackExtensionsToUninstall(extension, installed, checked = []) {
        if (checked.indexOf(extension) !== -1) {
            return [];
        }
        checked.push(extension);
        const extensionsPack = extension.manifest.extensionPack ? extension.manifest.extensionPack : [];
        if (extensionsPack.length) {
            const packedExtensions = installed.filter((i) => !i.isBuiltin && extensionsPack.some((id) => areSameExtensions({ id }, i.identifier)));
            const packOfPackedExtensions = [];
            for (const packedExtension of packedExtensions) {
                packOfPackedExtensions.push(...this.getAllPackExtensionsToUninstall(packedExtension, installed, checked));
            }
            return [...packedExtensions, ...packOfPackedExtensions];
        }
        return [];
    }
    getDependents(extension, installed) {
        return installed.filter((e) => e.manifest.extensionDependencies &&
            e.manifest.extensionDependencies.some((id) => areSameExtensions({ id }, extension.identifier)));
    }
    async updateControlCache() {
        try {
            this.logService.trace('ExtensionManagementService.updateControlCache');
            return await this.galleryService.getExtensionsControlManifest();
        }
        catch (err) {
            this.logService.trace('ExtensionManagementService.refreshControlCache - failed to get extension control manifest', getErrorMessage(err));
            return { malicious: [], deprecated: {}, search: [] };
        }
    }
};
AbstractExtensionManagementService = __decorate([
    __param(0, IExtensionGalleryService),
    __param(1, ITelemetryService),
    __param(2, IUriIdentityService),
    __param(3, ILogService),
    __param(4, IProductService),
    __param(5, IAllowedExtensionsService),
    __param(6, IUserDataProfilesService)
], AbstractExtensionManagementService);
export { AbstractExtensionManagementService };
export function toExtensionManagementError(error, code) {
    if (error instanceof ExtensionManagementError) {
        return error;
    }
    let extensionManagementError;
    if (error instanceof ExtensionGalleryError) {
        extensionManagementError = new ExtensionManagementError(error.message, error.code === "DownloadFailedWriting" /* ExtensionGalleryErrorCode.DownloadFailedWriting */
            ? "DownloadFailedWriting" /* ExtensionManagementErrorCode.DownloadFailedWriting */
            : "Gallery" /* ExtensionManagementErrorCode.Gallery */);
    }
    else {
        extensionManagementError = new ExtensionManagementError(error.message, isCancellationError(error)
            ? "Cancelled" /* ExtensionManagementErrorCode.Cancelled */
            : (code ?? "Internal" /* ExtensionManagementErrorCode.Internal */));
    }
    extensionManagementError.stack = error.stack;
    return extensionManagementError;
}
function reportTelemetry(telemetryService, eventName, { extensionData, verificationStatus, duration, error, source, durationSinceUpdate, }) {
    /* __GDPR__
        "extensionGallery:install" : {
            "owner": "sandy081",
            "success": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
            "duration" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
            "durationSinceUpdate" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "errorcode": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth" },
            "recommendationReason": { "retiredFromVersion": "1.23.0", "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
            "verificationStatus" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
            "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
            "${include}": [
                "${GalleryExtensionTelemetryData}"
            ]
        }
    */
    /* __GDPR__
        "extensionGallery:uninstall" : {
            "owner": "sandy081",
            "success": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
            "duration" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
            "errorcode": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth" },
            "${include}": [
                "${GalleryExtensionTelemetryData}"
            ]
        }
    */
    /* __GDPR__
        "extensionGallery:update" : {
            "owner": "sandy081",
            "success": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
            "duration" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true },
            "errorcode": { "classification": "CallstackOrException", "purpose": "PerformanceAndHealth" },
            "verificationStatus" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
            "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
            "${include}": [
                "${GalleryExtensionTelemetryData}"
            ]
        }
    */
    telemetryService.publicLog(eventName, {
        ...extensionData,
        source,
        duration,
        durationSinceUpdate,
        success: !error,
        errorcode: error?.code,
        verificationStatus: verificationStatus === ExtensionSignatureVerificationCode.Success
            ? 'Verified'
            : (verificationStatus ?? 'Unverified'),
    });
}
export class AbstractExtensionTask {
    constructor() {
        this.barrier = new Barrier();
    }
    async waitUntilTaskIsFinished() {
        await this.barrier.wait();
        return this.cancellablePromise;
    }
    run() {
        if (!this.cancellablePromise) {
            this.cancellablePromise = createCancelablePromise((token) => this.doRun(token));
        }
        this.barrier.open();
        return this.cancellablePromise;
    }
    cancel() {
        if (!this.cancellablePromise) {
            this.cancellablePromise = createCancelablePromise((token) => {
                return new Promise((c, e) => {
                    const disposable = token.onCancellationRequested(() => {
                        disposable.dispose();
                        e(new CancellationError());
                    });
                });
            });
            this.barrier.open();
        }
        this.cancellablePromise.cancel();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RFeHRlbnNpb25NYW5hZ2VtZW50U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vYWJzdHJhY3RFeHRlbnNpb25NYW5hZ2VtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUNOLGlCQUFpQixFQUNqQixlQUFlLEVBQ2YsbUJBQW1CLEdBQ25CLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUE7QUFDdEMsT0FBTyxFQUNOLHdCQUF3QixFQUN4Qix3QkFBd0IsRUFReEIsMEJBQTBCLEVBQzFCLHNCQUFzQixFQVd0QixrQ0FBa0MsRUFDbEMscUJBQXFCLEVBR3JCLGdDQUFnQyxFQUdoQyxrQ0FBa0MsRUFDbEMseUJBQXlCLEdBQ3pCLE1BQU0sMEJB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