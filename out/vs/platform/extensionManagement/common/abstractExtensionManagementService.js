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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RFeHRlbnNpb25NYW5hZ2VtZW50U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2Fic3RyYWN0RXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsZUFBZSxFQUNmLG1CQUFtQixHQUNuQixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDekQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFBO0FBQ3RDLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsd0JBQXdCLEVBUXhCLDBCQUEwQixFQUMxQixzQkFBc0IsRUFXdEIsa0NBQWtDLEVBQ2xDLHFCQUFxQixFQUdyQixnQ0FBZ0MsRUFHaEMsa0NBQWtDLEVBQ2xDLHlCQUF5QixHQUN6QixNQUFNLDBCQUEwQixD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