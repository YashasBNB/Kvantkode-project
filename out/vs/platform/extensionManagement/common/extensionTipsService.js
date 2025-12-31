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
import { isNonEmptyArray } from '../../../base/common/arrays.js';
import { Disposable, MutableDisposable } from '../../../base/common/lifecycle.js';
import { joinPath } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { IFileService } from '../../files/common/files.js';
import { IProductService } from '../../product/common/productService.js';
import { disposableTimeout } from '../../../base/common/async.js';
import { Event } from '../../../base/common/event.js';
import { join } from '../../../base/common/path.js';
import { isWindows } from '../../../base/common/platform.js';
import { env } from '../../../base/common/process.js';
import { areSameExtensions } from './extensionManagementUtil.js';
//#region Base Extension Tips Service
let ExtensionTipsService = class ExtensionTipsService extends Disposable {
    constructor(fileService, productService) {
        super();
        this.fileService = fileService;
        this.productService = productService;
        this.allConfigBasedTips = new Map();
        if (this.productService.configBasedExtensionTips) {
            Object.entries(this.productService.configBasedExtensionTips).forEach(([, value]) => this.allConfigBasedTips.set(value.configPath, value));
        }
    }
    getConfigBasedTips(folder) {
        return this.getValidConfigBasedTips(folder);
    }
    async getImportantExecutableBasedTips() {
        return [];
    }
    async getOtherExecutableBasedTips() {
        return [];
    }
    async getValidConfigBasedTips(folder) {
        const result = [];
        for (const [configPath, tip] of this.allConfigBasedTips) {
            if (tip.configScheme && tip.configScheme !== folder.scheme) {
                continue;
            }
            try {
                const content = (await this.fileService.readFile(joinPath(folder, configPath))).value.toString();
                for (const [key, value] of Object.entries(tip.recommendations)) {
                    if (!value.contentPattern || new RegExp(value.contentPattern, 'mig').test(content)) {
                        result.push({
                            extensionId: key,
                            extensionName: value.name,
                            configName: tip.configName,
                            important: !!value.important,
                            isExtensionPack: !!value.isExtensionPack,
                            whenNotInstalled: value.whenNotInstalled,
                        });
                    }
                }
            }
            catch (error) {
                /* Ignore */
            }
        }
        return result;
    }
};
ExtensionTipsService = __decorate([
    __param(0, IFileService),
    __param(1, IProductService)
], ExtensionTipsService);
export { ExtensionTipsService };
const promptedExecutableTipsStorageKey = 'extensionTips/promptedExecutableTips';
const lastPromptedMediumImpExeTimeStorageKey = 'extensionTips/lastPromptedMediumImpExeTime';
export class AbstractNativeExtensionTipsService extends ExtensionTipsService {
    constructor(userHome, windowEvents, telemetryService, extensionManagementService, storageService, extensionRecommendationNotificationService, fileService, productService) {
        super(fileService, productService);
        this.userHome = userHome;
        this.windowEvents = windowEvents;
        this.telemetryService = telemetryService;
        this.extensionManagementService = extensionManagementService;
        this.storageService = storageService;
        this.extensionRecommendationNotificationService = extensionRecommendationNotificationService;
        this.highImportanceExecutableTips = new Map();
        this.mediumImportanceExecutableTips = new Map();
        this.allOtherExecutableTips = new Map();
        this.highImportanceTipsByExe = new Map();
        this.mediumImportanceTipsByExe = new Map();
        if (productService.exeBasedExtensionTips) {
            Object.entries(productService.exeBasedExtensionTips).forEach(([key, exeBasedExtensionTip]) => {
                const highImportanceRecommendations = [];
                const mediumImportanceRecommendations = [];
                const otherRecommendations = [];
                Object.entries(exeBasedExtensionTip.recommendations).forEach(([extensionId, value]) => {
                    if (value.important) {
                        if (exeBasedExtensionTip.important) {
                            highImportanceRecommendations.push({
                                extensionId,
                                extensionName: value.name,
                                isExtensionPack: !!value.isExtensionPack,
                            });
                        }
                        else {
                            mediumImportanceRecommendations.push({
                                extensionId,
                                extensionName: value.name,
                                isExtensionPack: !!value.isExtensionPack,
                            });
                        }
                    }
                    else {
                        otherRecommendations.push({
                            extensionId,
                            extensionName: value.name,
                            isExtensionPack: !!value.isExtensionPack,
                        });
                    }
                });
                if (highImportanceRecommendations.length) {
                    this.highImportanceExecutableTips.set(key, {
                        exeFriendlyName: exeBasedExtensionTip.friendlyName,
                        windowsPath: exeBasedExtensionTip.windowsPath,
                        recommendations: highImportanceRecommendations,
                    });
                }
                if (mediumImportanceRecommendations.length) {
                    this.mediumImportanceExecutableTips.set(key, {
                        exeFriendlyName: exeBasedExtensionTip.friendlyName,
                        windowsPath: exeBasedExtensionTip.windowsPath,
                        recommendations: mediumImportanceRecommendations,
                    });
                }
                if (otherRecommendations.length) {
                    this.allOtherExecutableTips.set(key, {
                        exeFriendlyName: exeBasedExtensionTip.friendlyName,
                        windowsPath: exeBasedExtensionTip.windowsPath,
                        recommendations: otherRecommendations,
                    });
                }
            });
        }
        /*
            3s has come out to be the good number to fetch and prompt important exe based recommendations
            Also fetch important exe based recommendations for reporting telemetry
        */
        disposableTimeout(async () => {
            await this.collectTips();
            this.promptHighImportanceExeBasedTip();
            this.promptMediumImportanceExeBasedTip();
        }, 3000, this._store);
    }
    async getImportantExecutableBasedTips() {
        const highImportanceExeTips = await this.getValidExecutableBasedExtensionTips(this.highImportanceExecutableTips);
        const mediumImportanceExeTips = await this.getValidExecutableBasedExtensionTips(this.mediumImportanceExecutableTips);
        return [...highImportanceExeTips, ...mediumImportanceExeTips];
    }
    getOtherExecutableBasedTips() {
        return this.getValidExecutableBasedExtensionTips(this.allOtherExecutableTips);
    }
    async collectTips() {
        const highImportanceExeTips = await this.getValidExecutableBasedExtensionTips(this.highImportanceExecutableTips);
        const mediumImportanceExeTips = await this.getValidExecutableBasedExtensionTips(this.mediumImportanceExecutableTips);
        const local = await this.extensionManagementService.getInstalled();
        this.highImportanceTipsByExe = this.groupImportantTipsByExe(highImportanceExeTips, local);
        this.mediumImportanceTipsByExe = this.groupImportantTipsByExe(mediumImportanceExeTips, local);
    }
    groupImportantTipsByExe(importantExeBasedTips, local) {
        const importantExeBasedRecommendations = new Map();
        importantExeBasedTips.forEach((tip) => importantExeBasedRecommendations.set(tip.extensionId.toLowerCase(), tip));
        const { installed, uninstalled: recommendations } = this.groupByInstalled([...importantExeBasedRecommendations.keys()], local);
        /* Log installed and uninstalled exe based recommendations */
        for (const extensionId of installed) {
            const tip = importantExeBasedRecommendations.get(extensionId);
            if (tip) {
                this.telemetryService.publicLog2('exeExtensionRecommendations:alreadyInstalled', { extensionId, exeName: tip.exeName });
            }
        }
        for (const extensionId of recommendations) {
            const tip = importantExeBasedRecommendations.get(extensionId);
            if (tip) {
                this.telemetryService.publicLog2('exeExtensionRecommendations:notInstalled', { extensionId, exeName: tip.exeName });
            }
        }
        const promptedExecutableTips = this.getPromptedExecutableTips();
        const tipsByExe = new Map();
        for (const extensionId of recommendations) {
            const tip = importantExeBasedRecommendations.get(extensionId);
            if (tip &&
                (!promptedExecutableTips[tip.exeName] ||
                    !promptedExecutableTips[tip.exeName].includes(tip.extensionId))) {
                let tips = tipsByExe.get(tip.exeName);
                if (!tips) {
                    tips = [];
                    tipsByExe.set(tip.exeName, tips);
                }
                tips.push(tip);
            }
        }
        return tipsByExe;
    }
    /**
     * High importance tips are prompted once per restart session
     */
    promptHighImportanceExeBasedTip() {
        if (this.highImportanceTipsByExe.size === 0) {
            return;
        }
        const [exeName, tips] = [...this.highImportanceTipsByExe.entries()][0];
        this.promptExeRecommendations(tips).then((result) => {
            switch (result) {
                case "reacted" /* RecommendationsNotificationResult.Accepted */:
                    this.addToRecommendedExecutables(tips[0].exeName, tips);
                    break;
                case "ignored" /* RecommendationsNotificationResult.Ignored */:
                    this.highImportanceTipsByExe.delete(exeName);
                    break;
                case "incompatibleWindow" /* RecommendationsNotificationResult.IncompatibleWindow */: {
                    // Recommended in incompatible window. Schedule the prompt after active window change
                    const onActiveWindowChange = Event.once(Event.latch(Event.any(this.windowEvents.onDidOpenMainWindow, this.windowEvents.onDidFocusMainWindow)));
                    this._register(onActiveWindowChange(() => this.promptHighImportanceExeBasedTip()));
                    break;
                }
                case "toomany" /* RecommendationsNotificationResult.TooMany */: {
                    // Too many notifications. Schedule the prompt after one hour
                    const disposable = this._register(new MutableDisposable());
                    disposable.value = disposableTimeout(() => {
                        disposable.dispose();
                        this.promptHighImportanceExeBasedTip();
                    }, 60 * 60 * 1000 /* 1 hour */);
                    break;
                }
            }
        });
    }
    /**
     * Medium importance tips are prompted once per 7 days
     */
    promptMediumImportanceExeBasedTip() {
        if (this.mediumImportanceTipsByExe.size === 0) {
            return;
        }
        const lastPromptedMediumExeTime = this.getLastPromptedMediumExeTime();
        const timeSinceLastPrompt = Date.now() - lastPromptedMediumExeTime;
        const promptInterval = 7 * 24 * 60 * 60 * 1000; // 7 Days
        if (timeSinceLastPrompt < promptInterval) {
            // Wait until interval and prompt
            const disposable = this._register(new MutableDisposable());
            disposable.value = disposableTimeout(() => {
                disposable.dispose();
                this.promptMediumImportanceExeBasedTip();
            }, promptInterval - timeSinceLastPrompt);
            return;
        }
        const [exeName, tips] = [...this.mediumImportanceTipsByExe.entries()][0];
        this.promptExeRecommendations(tips).then((result) => {
            switch (result) {
                case "reacted" /* RecommendationsNotificationResult.Accepted */: {
                    // Accepted: Update the last prompted time and caches.
                    this.updateLastPromptedMediumExeTime(Date.now());
                    this.mediumImportanceTipsByExe.delete(exeName);
                    this.addToRecommendedExecutables(tips[0].exeName, tips);
                    // Schedule the next recommendation for next internval
                    const disposable1 = this._register(new MutableDisposable());
                    disposable1.value = disposableTimeout(() => {
                        disposable1.dispose();
                        this.promptMediumImportanceExeBasedTip();
                    }, promptInterval);
                    break;
                }
                case "ignored" /* RecommendationsNotificationResult.Ignored */:
                    // Ignored: Remove from the cache and prompt next recommendation
                    this.mediumImportanceTipsByExe.delete(exeName);
                    this.promptMediumImportanceExeBasedTip();
                    break;
                case "incompatibleWindow" /* RecommendationsNotificationResult.IncompatibleWindow */: {
                    // Recommended in incompatible window. Schedule the prompt after active window change
                    const onActiveWindowChange = Event.once(Event.latch(Event.any(this.windowEvents.onDidOpenMainWindow, this.windowEvents.onDidFocusMainWindow)));
                    this._register(onActiveWindowChange(() => this.promptMediumImportanceExeBasedTip()));
                    break;
                }
                case "toomany" /* RecommendationsNotificationResult.TooMany */: {
                    // Too many notifications. Schedule the prompt after one hour
                    const disposable2 = this._register(new MutableDisposable());
                    disposable2.value = disposableTimeout(() => {
                        disposable2.dispose();
                        this.promptMediumImportanceExeBasedTip();
                    }, 60 * 60 * 1000 /* 1 hour */);
                    break;
                }
            }
        });
    }
    async promptExeRecommendations(tips) {
        const installed = await this.extensionManagementService.getInstalled(1 /* ExtensionType.User */);
        const extensions = tips
            .filter((tip) => !tip.whenNotInstalled ||
            tip.whenNotInstalled.every((id) => installed.every((local) => !areSameExtensions(local.identifier, { id }))))
            .map(({ extensionId }) => extensionId.toLowerCase());
        return this.extensionRecommendationNotificationService.promptImportantExtensionsInstallNotification({
            extensions,
            source: 3 /* RecommendationSource.EXE */,
            name: tips[0].exeFriendlyName,
            searchValue: `@exe:"${tips[0].exeName}"`,
        });
    }
    getLastPromptedMediumExeTime() {
        let value = this.storageService.getNumber(lastPromptedMediumImpExeTimeStorageKey, -1 /* StorageScope.APPLICATION */);
        if (!value) {
            value = Date.now();
            this.updateLastPromptedMediumExeTime(value);
        }
        return value;
    }
    updateLastPromptedMediumExeTime(value) {
        this.storageService.store(lastPromptedMediumImpExeTimeStorageKey, value, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    getPromptedExecutableTips() {
        return JSON.parse(this.storageService.get(promptedExecutableTipsStorageKey, -1 /* StorageScope.APPLICATION */, '{}'));
    }
    addToRecommendedExecutables(exeName, tips) {
        const promptedExecutableTips = this.getPromptedExecutableTips();
        promptedExecutableTips[exeName] = tips.map(({ extensionId }) => extensionId.toLowerCase());
        this.storageService.store(promptedExecutableTipsStorageKey, JSON.stringify(promptedExecutableTips), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    groupByInstalled(recommendationsToSuggest, local) {
        const installed = [], uninstalled = [];
        const installedExtensionsIds = local.reduce((result, i) => {
            result.add(i.identifier.id.toLowerCase());
            return result;
        }, new Set());
        recommendationsToSuggest.forEach((id) => {
            if (installedExtensionsIds.has(id.toLowerCase())) {
                installed.push(id);
            }
            else {
                uninstalled.push(id);
            }
        });
        return { installed, uninstalled };
    }
    async getValidExecutableBasedExtensionTips(executableTips) {
        const result = [];
        const checkedExecutables = new Map();
        for (const exeName of executableTips.keys()) {
            const extensionTip = executableTips.get(exeName);
            if (!extensionTip || !isNonEmptyArray(extensionTip.recommendations)) {
                continue;
            }
            const exePaths = [];
            if (isWindows) {
                if (extensionTip.windowsPath) {
                    exePaths.push(extensionTip.windowsPath
                        .replace('%USERPROFILE%', () => env['USERPROFILE'])
                        .replace('%ProgramFiles(x86)%', () => env['ProgramFiles(x86)'])
                        .replace('%ProgramFiles%', () => env['ProgramFiles'])
                        .replace('%APPDATA%', () => env['APPDATA'])
                        .replace('%WINDIR%', () => env['WINDIR']));
                }
            }
            else {
                exePaths.push(join('/usr/local/bin', exeName));
                exePaths.push(join('/usr/bin', exeName));
                exePaths.push(join(this.userHome.fsPath, exeName));
            }
            for (const exePath of exePaths) {
                let exists = checkedExecutables.get(exePath);
                if (exists === undefined) {
                    exists = await this.fileService.exists(URI.file(exePath));
                    checkedExecutables.set(exePath, exists);
                }
                if (exists) {
                    for (const { extensionId, extensionName, isExtensionPack, whenNotInstalled, } of extensionTip.recommendations) {
                        result.push({
                            extensionId,
                            extensionName,
                            isExtensionPack,
                            exeName,
                            exeFriendlyName: extensionTip.exeFriendlyName,
                            windowsPath: extensionTip.windowsPath,
                            whenNotInstalled: whenNotInstalled,
                        });
                    }
                }
            }
        }
        return result;
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVGlwc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25UaXBzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRWpGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFRakQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDckQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFVaEUscUNBQXFDO0FBRTlCLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTtJQVFuRCxZQUNlLFdBQTRDLEVBQ3pDLGNBQWdEO1FBRWpFLEtBQUssRUFBRSxDQUFBO1FBSDBCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FB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