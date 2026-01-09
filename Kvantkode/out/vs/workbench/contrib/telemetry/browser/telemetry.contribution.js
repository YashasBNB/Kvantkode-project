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
var TelemetryContribution_1;
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { ILifecycleService, } from '../../../services/lifecycle/common/lifecycle.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IWorkbenchThemeService } from '../../../services/themes/common/workbenchThemeService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { language } from '../../../../base/common/platform.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import ErrorTelemetry from '../../../../platform/telemetry/browser/errorTelemetry.js';
import { supportsTelemetry, TelemetryLogGroup, telemetryLogId, TelemetryTrustedValue, } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { ConfigurationTargetToString, IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { ITextFileService, } from '../../../services/textfile/common/textfiles.js';
import { extname, basename, isEqual, isEqualOrParent } from '../../../../base/common/resources.js';
import { Schemas } from '../../../../base/common/network.js';
import { getMimeTypes } from '../../../../editor/common/services/languagesAssociations.js';
import { hash } from '../../../../base/common/hash.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { isBoolean, isNumber, isString } from '../../../../base/common/types.js';
import { AutoRestartConfigurationKey, AutoUpdateConfigurationKey, } from '../../extensions/common/extensions.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { ILoggerService, LogLevel } from '../../../../platform/log/common/log.js';
let TelemetryContribution = class TelemetryContribution extends Disposable {
    static { TelemetryContribution_1 = this; }
    static { this.ALLOWLIST_JSON = [
        'package.json',
        'package-lock.json',
        'tsconfig.json',
        'jsconfig.json',
        'bower.json',
        '.eslintrc.json',
        'tslint.json',
        'composer.json',
    ]; }
    static { this.ALLOWLIST_WORKSPACE_JSON = [
        'settings.json',
        'extensions.json',
        'tasks.json',
        'launch.json',
    ]; }
    constructor(telemetryService, contextService, lifecycleService, editorService, keybindingsService, themeService, environmentService, userDataProfileService, paneCompositeService, productService, loggerService, outputService, textFileService) {
        super();
        this.telemetryService = telemetryService;
        this.contextService = contextService;
        this.userDataProfileService = userDataProfileService;
        this.loggerService = loggerService;
        this.outputService = outputService;
        const { filesToOpenOrCreate, filesToDiff, filesToMerge } = environmentService;
        const activeViewlet = paneCompositeService.getActivePaneComposite(0 /* ViewContainerLocation.Sidebar */);
        telemetryService.publicLog2('workspaceLoad', {
            windowSize: {
                innerHeight: mainWindow.innerHeight,
                innerWidth: mainWindow.innerWidth,
                outerHeight: mainWindow.outerHeight,
                outerWidth: mainWindow.outerWidth,
            },
            emptyWorkbench: contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */,
            'workbench.filesToOpenOrCreate': (filesToOpenOrCreate && filesToOpenOrCreate.length) || 0,
            'workbench.filesToDiff': (filesToDiff && filesToDiff.length) || 0,
            'workbench.filesToMerge': (filesToMerge && filesToMerge.length) || 0,
            customKeybindingsCount: keybindingsService.customKeybindingsCount(),
            theme: themeService.getColorTheme().id,
            language,
            pinnedViewlets: paneCompositeService.getPinnedPaneCompositeIds(0 /* ViewContainerLocation.Sidebar */),
            restoredViewlet: activeViewlet ? activeViewlet.getId() : undefined,
            restoredEditors: editorService.visibleEditors.length,
            startupKind: lifecycleService.startupKind,
        });
        // Error Telemetry
        this._register(new ErrorTelemetry(telemetryService));
        //  Files Telemetry
        this._register(textFileService.files.onDidResolve((e) => this.onTextFileModelResolved(e)));
        this._register(textFileService.files.onDidSave((e) => this.onTextFileModelSaved(e)));
        // Lifecycle
        this._register(lifecycleService.onDidShutdown(() => this.dispose()));
        if (supportsTelemetry(productService, environmentService)) {
            this.handleTelemetryOutputVisibility();
        }
    }
    onTextFileModelResolved(e) {
        const settingsType = this.getTypeIfSettings(e.model.resource);
        if (!settingsType) {
            this.telemetryService.publicLog2('fileGet', this.getTelemetryData(e.model.resource, e.reason));
        }
    }
    onTextFileModelSaved(e) {
        const settingsType = this.getTypeIfSettings(e.model.resource);
        if (!settingsType) {
            this.telemetryService.publicLog2('filePUT', this.getTelemetryData(e.model.resource, e.reason));
        }
    }
    getTypeIfSettings(resource) {
        if (extname(resource) !== '.json') {
            return '';
        }
        // Check for global settings file
        if (isEqual(resource, this.userDataProfileService.currentProfile.settingsResource)) {
            return 'global-settings';
        }
        // Check for keybindings file
        if (isEqual(resource, this.userDataProfileService.currentProfile.keybindingsResource)) {
            return 'keybindings';
        }
        // Check for snippets
        if (isEqualOrParent(resource, this.userDataProfileService.currentProfile.snippetsHome)) {
            return 'snippets';
        }
        // Check for workspace settings file
        const folders = this.contextService.getWorkspace().folders;
        for (const folder of folders) {
            if (isEqualOrParent(resource, folder.toResource('.vscode'))) {
                const filename = basename(resource);
                if (TelemetryContribution_1.ALLOWLIST_WORKSPACE_JSON.indexOf(filename) > -1) {
                    return `.vscode/${filename}`;
                }
            }
        }
        return '';
    }
    getTelemetryData(resource, reason) {
        let ext = extname(resource);
        // Remove query parameters from the resource extension
        const queryStringLocation = ext.indexOf('?');
        ext = queryStringLocation !== -1 ? ext.substr(0, queryStringLocation) : ext;
        const fileName = basename(resource);
        const path = resource.scheme === Schemas.file ? resource.fsPath : resource.path;
        const telemetryData = {
            mimeType: new TelemetryTrustedValue(getMimeTypes(resource).join(', ')),
            ext,
            path: hash(path),
            reason,
            allowlistedjson: undefined,
        };
        if (ext === '.json' && TelemetryContribution_1.ALLOWLIST_JSON.indexOf(fileName) > -1) {
            telemetryData['allowlistedjson'] = fileName;
        }
        return telemetryData;
    }
    async handleTelemetryOutputVisibility() {
        const that = this;
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.showTelemetry',
                    title: localize2('showTelemetry', 'Show Telemetry'),
                    category: Categories.Developer,
                    f1: true,
                });
            }
            async run() {
                for (const logger of that.loggerService.getRegisteredLoggers()) {
                    if (logger.group?.id === TelemetryLogGroup.id) {
                        that.loggerService.setLogLevel(logger.resource, LogLevel.Trace);
                        that.loggerService.setVisibility(logger.resource, true);
                    }
                }
                that.outputService.showChannel(TelemetryLogGroup.id);
            }
        }));
        if (![...this.loggerService.getRegisteredLoggers()].find((logger) => logger.id === telemetryLogId)) {
            await Event.toPromise(Event.filter(this.loggerService.onDidChangeLoggers, (e) => [...e.added].some((logger) => logger.id === telemetryLogId)));
        }
        let showTelemetry = false;
        for (const logger of this.loggerService.getRegisteredLoggers()) {
            if (logger.id === telemetryLogId) {
                showTelemetry = this.loggerService.getLogLevel() === LogLevel.Trace || !logger.hidden;
                if (showTelemetry) {
                    this.loggerService.setVisibility(logger.id, true);
                }
                break;
            }
        }
        if (showTelemetry) {
            const showExtensionTelemetry = (loggers) => {
                for (const logger of loggers) {
                    if (logger.group?.id === TelemetryLogGroup.id) {
                        that.loggerService.setLogLevel(logger.resource, LogLevel.Trace);
                        this.loggerService.setVisibility(logger.id, true);
                    }
                }
            };
            showExtensionTelemetry(this.loggerService.getRegisteredLoggers());
            this._register(this.loggerService.onDidChangeLoggers((e) => showExtensionTelemetry(e.added)));
        }
    }
};
TelemetryContribution = TelemetryContribution_1 = __decorate([
    __param(0, ITelemetryService),
    __param(1, IWorkspaceContextService),
    __param(2, ILifecycleService),
    __param(3, IEditorService),
    __param(4, IKeybindingService),
    __param(5, IWorkbenchThemeService),
    __param(6, IWorkbenchEnvironmentService),
    __param(7, IUserDataProfileService),
    __param(8, IPaneCompositePartService),
    __param(9, IProductService),
    __param(10, ILoggerService),
    __param(11, IOutputService),
    __param(12, ITextFileService)
], TelemetryContribution);
export { TelemetryContribution };
let ConfigurationTelemetryContribution = class ConfigurationTelemetryContribution extends Disposable {
    constructor(configurationService, userDataProfilesService, telemetryService) {
        super();
        this.configurationService = configurationService;
        this.userDataProfilesService = userDataProfilesService;
        this.telemetryService = telemetryService;
        this.configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        const { user, workspace } = configurationService.keys();
        for (const setting of user) {
            this.reportTelemetry(setting, 3 /* ConfigurationTarget.USER_LOCAL */);
        }
        for (const setting of workspace) {
            this.reportTelemetry(setting, 5 /* ConfigurationTarget.WORKSPACE */);
        }
    }
    /**
     * Report value of a setting only if it is an enum, boolean, or number or an array of those.
     */
    getValueToReport(key, target) {
        const inpsectData = this.configurationService.inspect(key);
        const value = target === 3 /* ConfigurationTarget.USER_LOCAL */
            ? inpsectData.user?.value
            : inpsectData.workspace?.value;
        if (isNumber(value) || isBoolean(value)) {
            return value.toString();
        }
        const schema = this.configurationRegistry.getConfigurationProperties()[key];
        if (isString(value)) {
            if (schema?.enum?.includes(value)) {
                return value;
            }
            return undefined;
        }
        if (Array.isArray(value)) {
            if (value.every((v) => isNumber(v) || isBoolean(v) || (isString(v) && schema?.enum?.includes(v)))) {
                return JSON.stringify(value);
            }
        }
        return undefined;
    }
    reportTelemetry(key, target) {
        const source = ConfigurationTargetToString(target);
        switch (key) {
            case "workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */:
                this.telemetryService.publicLog2('workbench.activityBar.location', {
                    settingValue: this.getValueToReport(key, target),
                    source,
                });
                return;
            case AutoUpdateConfigurationKey:
                this.telemetryService.publicLog2('extensions.autoUpdate', { settingValue: this.getValueToReport(key, target), source });
                return;
            case 'editor.stickyScroll.enabled':
                this.telemetryService.publicLog2('editor.stickyScroll.enabled', {
                    settingValue: this.getValueToReport(key, target),
                    source,
                });
                return;
            case 'typescript.experimental.expandableHover':
                this.telemetryService.publicLog2('typescript.experimental.expandableHover', {
                    settingValue: this.getValueToReport(key, target),
                    source,
                });
                return;
            case 'window.titleBarStyle':
                this.telemetryService.publicLog2('window.titleBarStyle', { settingValue: this.getValueToReport(key, target), source });
                return;
            case 'extensions.verifySignature':
                this.telemetryService.publicLog2('extensions.verifySignature', {
                    settingValue: this.getValueToReport(key, target),
                    source,
                });
                return;
            case 'window.newWindowProfile': {
                const valueToReport = this.getValueToReport(key, target);
                const settingValue = valueToReport === null
                    ? 'null'
                    : valueToReport === this.userDataProfilesService.defaultProfile.name
                        ? 'default'
                        : 'custom';
                this.telemetryService.publicLog2('window.newWindowProfile', { settingValue, source });
                return;
            }
            case AutoRestartConfigurationKey:
                this.telemetryService.publicLog2('extensions.autoRestart', { settingValue: this.getValueToReport(key, target), source });
                return;
        }
    }
};
ConfigurationTelemetryContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IUserDataProfilesService),
    __param(2, ITelemetryService)
], ConfigurationTelemetryContribution);
const workbenchContributionRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchContributionRegistry.registerWorkbenchContribution(TelemetryContribution, 3 /* LifecyclePhase.Restored */);
workbenchContributionRegistry.registerWorkbenchContribution(ConfigurationTelemetryContribution, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVsZW1ldHJ5L2Jyb3dzZXIvdGVsZW1ldHJ5LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixVQUFVLElBQUksbUJBQW1CLEdBR2pDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUVOLGlCQUFpQixHQUVqQixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDakcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDekcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxjQUFjLE1BQU0sMERBQTBELENBQUE7QUFDckYsT0FBTyxFQUNOLGlCQUFpQixFQUNqQixpQkFBaUIsRUFDakIsY0FBYyxFQUNkLHFCQUFxQixHQUNyQixN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