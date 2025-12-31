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
import { getZoomLevel } from '../../../../base/browser/browser.js';
import * as dom from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { userAgent } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { normalizeGitHubUrl } from '../common/issueReporterUtil.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { buttonBackground, buttonForeground, buttonHoverBackground, foreground, inputActiveOptionBorder, inputBackground, inputBorder, inputForeground, inputValidationErrorBackground, inputValidationErrorBorder, inputValidationErrorForeground, scrollbarSliderActiveBackground, scrollbarSliderBackground, scrollbarSliderHoverBackground, textLinkActiveForeground, textLinkForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { SIDE_BAR_BACKGROUND } from '../../../common/theme.js';
import { IIssueFormService, IWorkbenchIssueService, } from '../common/issue.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IIntegrityService } from '../../../services/integrity/common/integrity.js';
let BrowserIssueService = class BrowserIssueService {
    constructor(extensionService, productService, issueFormService, themeService, experimentService, workspaceTrustManagementService, integrityService, extensionManagementService, extensionEnablementService, authenticationService, configurationService) {
        this.extensionService = extensionService;
        this.productService = productService;
        this.issueFormService = issueFormService;
        this.themeService = themeService;
        this.experimentService = experimentService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.integrityService = integrityService;
        this.extensionManagementService = extensionManagementService;
        this.extensionEnablementService = extensionEnablementService;
        this.authenticationService = authenticationService;
        this.configurationService = configurationService;
    }
    async openReporter(options) {
        // If web reporter setting is false open the old GitHub issue reporter
        if (!this.configurationService.getValue('issueReporter.experimental.webReporter')) {
            const extensionId = options.extensionId;
            // If we don't have a extensionId, treat this as a Core issue
            if (!extensionId) {
                if (this.productService.reportIssueUrl) {
                    const uri = this.getIssueUriFromStaticContent(this.productService.reportIssueUrl);
                    dom.windowOpenNoOpener(uri);
                    return;
                }
                throw new Error(`No issue reporting URL configured for ${this.productService.nameLong}.`);
            }
            const selectedExtension = this.extensionService.extensions.filter((ext) => ext.identifier.value === options.extensionId)[0];
            const extensionGitHubUrl = this.getExtensionGitHubUrl(selectedExtension);
            if (!extensionGitHubUrl) {
                throw new Error(`Unable to find issue reporting url for ${extensionId}`);
            }
            const uri = this.getIssueUriFromStaticContent(`${extensionGitHubUrl}/issues/new`, selectedExtension);
            dom.windowOpenNoOpener(uri);
        }
        if (this.productService.reportIssueUrl) {
            const theme = this.themeService.getColorTheme();
            const experiments = await this.experimentService.getCurrentExperiments();
            let githubAccessToken = '';
            try {
                const githubSessions = await this.authenticationService.getSessions('github');
                const potentialSessions = githubSessions.filter((session) => session.scopes.includes('repo'));
                githubAccessToken = potentialSessions[0]?.accessToken;
            }
            catch (e) {
                // Ignore
            }
            // air on the side of caution and have false be the default
            let isUnsupported = false;
            try {
                isUnsupported = !(await this.integrityService.isPure()).isPure;
            }
            catch (e) {
                // Ignore
            }
            const extensionData = [];
            try {
                const extensions = await this.extensionManagementService.getInstalled();
                const enabledExtensions = extensions.filter((extension) => this.extensionEnablementService.isEnabled(extension) ||
                    (options.extensionId && extension.identifier.id === options.extensionId));
                extensionData.push(...enabledExtensions.map((extension) => {
                    const { manifest } = extension;
                    const manifestKeys = manifest.contributes ? Object.keys(manifest.contributes) : [];
                    const isTheme = !manifest.main &&
                        !manifest.browser &&
                        manifestKeys.length === 1 &&
                        manifestKeys[0] === 'themes';
                    const isBuiltin = extension.type === 0 /* ExtensionType.System */;
                    return {
                        name: manifest.name,
                        publisher: manifest.publisher,
                        version: manifest.version,
                        repositoryUrl: manifest.repository && manifest.repository.url,
                        bugsUrl: manifest.bugs && manifest.bugs.url,
                        displayName: manifest.displayName,
                        id: extension.identifier.id,
                        data: options.data,
                        uri: options.uri,
                        isTheme,
                        isBuiltin,
                        extensionData: 'Extensions data loading',
                    };
                }));
            }
            catch (e) {
                extensionData.push({
                    name: 'Workbench Issue Service',
                    publisher: 'Unknown',
                    version: 'Unknown',
                    repositoryUrl: undefined,
                    bugsUrl: undefined,
                    extensionData: `Extensions not loaded: ${e}`,
                    displayName: `Extensions not loaded: ${e}`,
                    id: 'workbench.issue',
                    isTheme: false,
                    isBuiltin: true,
                });
            }
            const issueReporterData = Object.assign({
                styles: getIssueReporterStyles(theme),
                zoomLevel: getZoomLevel(mainWindow),
                enabledExtensions: extensionData,
                experiments: experiments?.join('\n'),
                restrictedMode: !this.workspaceTrustManagementService.isWorkspaceTrusted(),
                isUnsupported,
                githubAccessToken,
            }, options);
            return this.issueFormService.openReporter(issueReporterData);
        }
        throw new Error(`No issue reporting URL configured for ${this.productService.nameLong}.`);
    }
    getExtensionGitHubUrl(extension) {
        if (extension.isBuiltin && this.productService.reportIssueUrl) {
            return normalizeGitHubUrl(this.productService.reportIssueUrl);
        }
        let repositoryUrl = '';
        const bugsUrl = extension?.bugs?.url;
        const extensionUrl = extension?.repository?.url;
        // If given, try to match the extension's bug url
        if (bugsUrl && bugsUrl.match(/^https?:\/\/github\.com\/(.*)/)) {
            repositoryUrl = normalizeGitHubUrl(bugsUrl);
        }
        else if (extensionUrl && extensionUrl.match(/^https?:\/\/github\.com\/(.*)/)) {
            repositoryUrl = normalizeGitHubUrl(extensionUrl);
        }
        return repositoryUrl;
    }
    getIssueUriFromStaticContent(baseUri, extension) {
        const issueDescription = `ADD ISSUE DESCRIPTION HERE

Version: ${this.productService.version}
Commit: ${this.productService.commit ?? 'unknown'}
User Agent: ${userAgent ?? 'unknown'}
Embedder: ${this.productService.embedderIdentifier ?? 'unknown'}
${extension?.version ? `\nExtension version: ${extension.version}` : ''}
<!-- generated by web issue reporter -->`;
        return `${baseUri}?body=${encodeURIComponent(issueDescription)}&labels=web`;
    }
};
BrowserIssueService = __decorate([
    __param(0, IExtensionService),
    __param(1, IProductService),
    __param(2, IIssueFormService),
    __param(3, IThemeService),
    __param(4, IWorkbenchAssignmentService),
    __param(5, IWorkspaceTrustManagementService),
    __param(6, IIntegrityService),
    __param(7, IExtensionManagementService),
    __param(8, IWorkbenchExtensionEnablementService),
    __param(9, IAuthenticationService),
    __param(10, IConfigurationService)
], BrowserIssueService);
export { BrowserIssueService };
export function getIssueReporterStyles(theme) {
    return {
        backgroundColor: getColor(theme, SIDE_BAR_BACKGROUND),
        color: getColor(theme, foreground),
        textLinkColor: getColor(theme, textLinkForeground),
        textLinkActiveForeground: getColor(theme, textLinkActiveForeground),
        inputBackground: getColor(theme, inputBackground),
        inputForeground: getColor(theme, inputForeground),
        inputBorder: getColor(theme, inputBorder),
        inputActiveBorder: getColor(theme, inputActiveOptionBorder),
        inputErrorBorder: getColor(theme, inputValidationErrorBorder),
        inputErrorBackground: getColor(theme, inputValidationErrorBackground),
        inputErrorForeground: getColor(theme, inputValidationErrorForeground),
        buttonBackground: getColor(theme, buttonBackground),
        buttonForeground: getColor(theme, buttonForeground),
        buttonHoverBackground: getColor(theme, buttonHoverBackground),
        sliderActiveColor: getColor(theme, scrollbarSliderActiveBackground),
        sliderBackgroundColor: getColor(theme, scrollbarSliderBackground),
        sliderHoverColor: getColor(theme, scrollbarSliderHoverBackground),
    };
}
function getColor(theme, key) {
    const color = theme.getColor(key);
    return color ? color.toString() : undefined;
}
registerSingleton(IWorkbenchIssueService, BrowserIssueService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaXNzdWUvYnJvd3Nlci9pc3N1ZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2xFLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUtwSCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLHFCQUFxQixFQUNyQixVQUFVLEVBQ1YsdUJBQXVCLEVBQ3ZCLGVBQWUsRUFDZixXQUFXLEVBQ1gsZUFBZSxFQUNmLDhCQUE4QixFQUM5QiwwQkFBMEIsRUFDMUIsOEJBQThCLEVBQzlCLCtCQUErQixFQUMvQix5QkFBeUIsRUFDekIsOEJBQThCLEVBQzlCLHdCQUF3QixFQUN4QixrQkFBa0IsR0FDbEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQWUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDOUYsT0FBTyxFQUFFLGdDQUFnQyxFQUFF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