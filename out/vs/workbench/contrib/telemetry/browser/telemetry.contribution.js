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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3RlbGVtZXRyeS9icm93c2VyL3RlbGVtZXRyeS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sVUFBVSxJQUFJLG1CQUFtQixHQUdqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFFTixpQkFBaUIsR0FFakIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sY0FBYyxNQUFNLDBEQUEwRCxDQUFBO0FBQ3JGLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsaUJBQWlCLEVBQ2pCLGNBQWMsRUFDZCxxQkFBcUIsR0FDckIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxP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