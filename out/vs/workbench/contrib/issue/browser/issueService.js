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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pc3N1ZS9icm93c2VyL2lzc3VlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDbEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBS3BILE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixnQkFBZ0IsRUFDaEIscUJBQXFCLEVBQ3JCLFVBQVUsRUFDVix1QkFBdUIsRUFDdkIsZUFBZSxFQUNmLFdBQVcsRUFDWCxlQUFlLEVBQ2YsOEJBQThCLEVBQzlCLDBCQUEwQixFQUMxQiw4QkFBOEIsRUFDOUIsK0JBQStCLEVBQy9CLHlCQUF5QixFQUN6Qiw4QkFBOEIsRUFDOUIsd0JBQXdCLEVBQ3hCLGtCQUFrQixHQUNsQixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBZSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsZ0NBQWdD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