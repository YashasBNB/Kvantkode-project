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
import { mainWindow } from '../../../../base/browser/window.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { buttonBackground, buttonForeground, buttonHoverBackground, foreground, inputActiveOptionBorder, inputBackground, inputBorder, inputForeground, inputValidationErrorBackground, inputValidationErrorBorder, inputValidationErrorForeground, scrollbarSliderActiveBackground, scrollbarSliderHoverBackground, textLinkActiveForeground, textLinkForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { SIDE_BAR_BACKGROUND } from '../../../common/theme.js';
import { IIssueFormService, IWorkbenchIssueService, } from '../common/issue.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IIntegrityService } from '../../../services/integrity/common/integrity.js';
let NativeIssueService = class NativeIssueService {
    constructor(issueFormService, themeService, extensionManagementService, extensionEnablementService, workspaceTrustManagementService, experimentService, authenticationService, integrityService) {
        this.issueFormService = issueFormService;
        this.themeService = themeService;
        this.extensionManagementService = extensionManagementService;
        this.extensionEnablementService = extensionEnablementService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.experimentService = experimentService;
        this.authenticationService = authenticationService;
        this.integrityService = integrityService;
    }
    async openReporter(dataOverrides = {}) {
        const extensionData = [];
        try {
            const extensions = await this.extensionManagementService.getInstalled();
            const enabledExtensions = extensions.filter((extension) => this.extensionEnablementService.isEnabled(extension) ||
                (dataOverrides.extensionId && extension.identifier.id === dataOverrides.extensionId));
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
                    data: dataOverrides.data,
                    uri: dataOverrides.uri,
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
                version: '0.0.0',
                repositoryUrl: undefined,
                bugsUrl: undefined,
                extensionData: 'Extensions data loading',
                displayName: `Extensions not loaded: ${e}`,
                id: 'workbench.issue',
                isTheme: false,
                isBuiltin: true,
            });
        }
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
        const theme = this.themeService.getColorTheme();
        const issueReporterData = Object.assign({
            styles: getIssueReporterStyles(theme),
            zoomLevel: getZoomLevel(mainWindow),
            enabledExtensions: extensionData,
            experiments: experiments?.join('\n'),
            restrictedMode: !this.workspaceTrustManagementService.isWorkspaceTrusted(),
            isUnsupported,
            githubAccessToken,
        }, dataOverrides);
        return this.issueFormService.openReporter(issueReporterData);
    }
};
NativeIssueService = __decorate([
    __param(0, IIssueFormService),
    __param(1, IThemeService),
    __param(2, IExtensionManagementService),
    __param(3, IWorkbenchExtensionEnablementService),
    __param(4, IWorkspaceTrustManagementService),
    __param(5, IWorkbenchAssignmentService),
    __param(6, IAuthenticationService),
    __param(7, IIntegrityService)
], NativeIssueService);
export { NativeIssueService };
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
        sliderBackgroundColor: getColor(theme, SIDE_BAR_BACKGROUND),
        sliderHoverColor: getColor(theme, scrollbarSliderHoverBackground),
    };
}
function getColor(theme, key) {
    const color = theme.getColor(key);
    return color ? color.toString() : undefined;
}
registerSingleton(IWorkbenchIssueService, NativeIssueService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaXNzdWUvZWxlY3Ryb24tc2FuZGJveC9pc3N1ZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUVwSCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixnQkFBZ0IsRUFDaEIscUJBQXFCLEVBQ3JCLFVBQVUsRUFDVix1QkFBdUIsRUFDdkIsZUFBZSxFQUNmLFdBQVcsRUFDWCxlQUFlLEVBQ2YsOEJBQThCLEVBQzlCLDBCQUEwQixFQUMxQiw4QkFBOEIsRUFDOUIsK0JBQStCLEVBQy9CLDhCQUE4QixFQUM5Qix3QkFBd0IsRUFDeEIsa0JBQWtCLEdBQ2xCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFlLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzFHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlELE9BQU8sRUFDTixpQkFBaUIsRUFJakIsc0JBQXNCLEdBQ3RCLE1BQU0sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDdEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbEcs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