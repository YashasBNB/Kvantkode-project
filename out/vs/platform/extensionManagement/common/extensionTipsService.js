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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVGlwc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvblRpcHNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQVFqRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRWpFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQVVoRSxxQ0FBcUM7QUFFOUIsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBUW5ELFlBQ2UsV0FBNEMsRUFDekMsY0FBZ0Q7UUFFakUsS0FBSyxFQUFFLENBQUE7UUFIMEIs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