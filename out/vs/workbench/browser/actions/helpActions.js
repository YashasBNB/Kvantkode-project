/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import product from '../../../platform/product/common/product.js';
import { isMacintosh, isLinux, language, isWeb } from '../../../base/common/platform.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { URI } from '../../../base/common/uri.js';
import { MenuId, Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { KeyChord } from '../../../base/common/keyCodes.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
class KeybindingsReferenceAction extends Action2 {
    static { this.ID = 'workbench.action.keybindingsReference'; }
    static { this.AVAILABLE = !!(isLinux
        ? product.keyboardShortcutsUrlLinux
        : isMacintosh
            ? product.keyboardShortcutsUrlMac
            : product.keyboardShortcutsUrlWin); }
    constructor() {
        super({
            id: KeybindingsReferenceAction.ID,
            title: {
                ...localize2('keybindingsReference', 'Keyboard Shortcuts Reference'),
                mnemonicTitle: localize({ key: 'miKeyboardShortcuts', comment: ['&& denotes a mnemonic'] }, '&&Keyboard Shortcuts Reference'),
            },
            category: Categories.Help,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: null,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */),
            },
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '2_reference',
                order: 1,
            },
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        const url = isLinux
            ? productService.keyboardShortcutsUrlLinux
            : isMacintosh
                ? productService.keyboardShortcutsUrlMac
                : productService.keyboardShortcutsUrlWin;
        if (url) {
            openerService.open(URI.parse(url));
        }
    }
}
class OpenIntroductoryVideosUrlAction extends Action2 {
    static { this.ID = 'workbench.action.openVideoTutorialsUrl'; }
    static { this.AVAILABLE = !!product.introductoryVideosUrl; }
    constructor() {
        super({
            id: OpenIntroductoryVideosUrlAction.ID,
            title: {
                ...localize2('openVideoTutorialsUrl', 'Video Tutorials'),
                mnemonicTitle: localize({ key: 'miVideoTutorials', comment: ['&& denotes a mnemonic'] }, '&&Video Tutorials'),
            },
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '2_reference',
                order: 2,
            },
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        if (productService.introductoryVideosUrl) {
            openerService.open(URI.parse(productService.introductoryVideosUrl));
        }
    }
}
class OpenTipsAndTricksUrlAction extends Action2 {
    static { this.ID = 'workbench.action.openTipsAndTricksUrl'; }
    static { this.AVAILABLE = !!product.tipsAndTricksUrl; }
    constructor() {
        super({
            id: OpenTipsAndTricksUrlAction.ID,
            title: {
                ...localize2('openTipsAndTricksUrl', 'Tips and Tricks'),
                mnemonicTitle: localize({ key: 'miTipsAndTricks', comment: ['&& denotes a mnemonic'] }, 'Tips and Tri&&cks'),
            },
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '2_reference',
                order: 3,
            },
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        if (productService.tipsAndTricksUrl) {
            openerService.open(URI.parse(productService.tipsAndTricksUrl));
        }
    }
}
class OpenDocumentationUrlAction extends Action2 {
    static { this.ID = 'workbench.action.openDocumentationUrl'; }
    static { this.AVAILABLE = !!(isWeb ? product.serverDocumentationUrl : product.documentationUrl); }
    constructor() {
        super({
            id: OpenDocumentationUrlAction.ID,
            title: {
                ...localize2('openDocumentationUrl', 'Documentation'),
                mnemonicTitle: localize({ key: 'miDocumentation', comment: ['&& denotes a mnemonic'] }, '&&Documentation'),
            },
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '1_welcome',
                order: 3,
            },
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        const url = isWeb ? productService.serverDocumentationUrl : productService.documentationUrl;
        if (url) {
            openerService.open(URI.parse(url));
        }
    }
}
class OpenNewsletterSignupUrlAction extends Action2 {
    static { this.ID = 'workbench.action.openNewsletterSignupUrl'; }
    static { this.AVAILABLE = !!product.newsletterSignupUrl; }
    constructor() {
        super({
            id: OpenNewsletterSignupUrlAction.ID,
            title: localize2('newsletterSignup', 'Signup for the VS Code Newsletter'),
            category: Categories.Help,
            f1: true,
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        const telemetryService = accessor.get(ITelemetryService);
        openerService.open(URI.parse(`${productService.newsletterSignupUrl}?machineId=${encodeURIComponent(telemetryService.machineId)}`));
    }
}
class OpenYouTubeUrlAction extends Action2 {
    static { this.ID = 'workbench.action.openYouTubeUrl'; }
    static { this.AVAILABLE = !!product.youTubeUrl; }
    constructor() {
        super({
            id: OpenYouTubeUrlAction.ID,
            title: {
                ...localize2('openYouTubeUrl', 'Join Us on YouTube'),
                mnemonicTitle: localize({ key: 'miYouTube', comment: ['&& denotes a mnemonic'] }, '&&Join Us on YouTube'),
            },
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '3_feedback',
                order: 1,
            },
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        if (productService.youTubeUrl) {
            openerService.open(URI.parse(productService.youTubeUrl));
        }
    }
}
class OpenRequestFeatureUrlAction extends Action2 {
    static { this.ID = 'workbench.action.openRequestFeatureUrl'; }
    static { this.AVAILABLE = !!product.requestFeatureUrl; }
    constructor() {
        super({
            id: OpenRequestFeatureUrlAction.ID,
            title: {
                ...localize2('openUserVoiceUrl', 'Search Feature Requests'),
                mnemonicTitle: localize({ key: 'miUserVoice', comment: ['&& denotes a mnemonic'] }, '&&Search Feature Requests'),
            },
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '3_feedback',
                order: 2,
            },
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        if (productService.requestFeatureUrl) {
            openerService.open(URI.parse(productService.requestFeatureUrl));
        }
    }
}
class OpenLicenseUrlAction extends Action2 {
    static { this.ID = 'workbench.action.openLicenseUrl'; }
    static { this.AVAILABLE = !!(isWeb ? product.serverLicense : product.licenseUrl); }
    constructor() {
        super({
            id: OpenLicenseUrlAction.ID,
            title: {
                ...localize2('openLicenseUrl', 'View License'),
                mnemonicTitle: localize({ key: 'miLicense', comment: ['&& denotes a mnemonic'] }, 'View &&License'),
            },
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '4_legal',
                order: 1,
            },
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        const url = isWeb ? productService.serverLicenseUrl : productService.licenseUrl;
        if (url) {
            if (language) {
                const queryArgChar = url.indexOf('?') > 0 ? '&' : '?';
                openerService.open(URI.parse(`${url}${queryArgChar}lang=${language}`));
            }
            else {
                openerService.open(URI.parse(url));
            }
        }
    }
}
class OpenPrivacyStatementUrlAction extends Action2 {
    static { this.ID = 'workbench.action.openPrivacyStatementUrl'; }
    static { this.AVAILABE = !!product.privacyStatementUrl; }
    constructor() {
        super({
            id: OpenPrivacyStatementUrlAction.ID,
            title: {
                ...localize2('openPrivacyStatement', 'Privacy Statement'),
                mnemonicTitle: localize({ key: 'miPrivacyStatement', comment: ['&& denotes a mnemonic'] }, 'Privac&&y Statement'),
            },
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '4_legal',
                order: 2,
            },
        });
    }
    run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        if (productService.privacyStatementUrl) {
            openerService.open(URI.parse(productService.privacyStatementUrl));
        }
    }
}
class GetStartedWithAccessibilityFeatures extends Action2 {
    static { this.ID = 'workbench.action.getStartedWithAccessibilityFeatures'; }
    constructor() {
        super({
            id: GetStartedWithAccessibilityFeatures.ID,
            title: localize2('getStartedWithAccessibilityFeatures', 'Get Started with Accessibility Features'),
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '1_welcome',
                order: 6,
            },
        });
    }
    run(accessor) {
        const commandService = accessor.get(ICommandService);
        commandService.executeCommand('workbench.action.openWalkthrough', 'SetupAccessibility');
    }
}
class GetStartedWithCopilot extends Action2 {
    static { this.ID = 'workbench.action.getStartedWithCopilot'; }
    static { this.AVAILABE = !!product.defaultChatAgent?.documentationUrl; }
    constructor() {
        super({
            id: GetStartedWithCopilot.ID,
            title: localize2('getStartedWithCopilot', 'Get Started with Copilot'),
            category: Categories.Help,
            f1: true,
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '1_welcome',
                order: 7,
            },
        });
    }
    run(accessor) {
        const openerService = accessor.get(IOpenerService);
        openerService.open(URI.parse(product.defaultChatAgent.documentationUrl));
    }
}
// --- Actions Registration
if (KeybindingsReferenceAction.AVAILABLE) {
    registerAction2(KeybindingsReferenceAction);
}
if (OpenIntroductoryVideosUrlAction.AVAILABLE) {
    registerAction2(OpenIntroductoryVideosUrlAction);
}
if (OpenTipsAndTricksUrlAction.AVAILABLE) {
    registerAction2(OpenTipsAndTricksUrlAction);
}
if (OpenDocumentationUrlAction.AVAILABLE) {
    registerAction2(OpenDocumentationUrlAction);
}
if (OpenNewsletterSignupUrlAction.AVAILABLE) {
    registerAction2(OpenNewsletterSignupUrlAction);
}
if (OpenYouTubeUrlAction.AVAILABLE) {
    registerAction2(OpenYouTubeUrlAction);
}
if (OpenRequestFeatureUrlAction.AVAILABLE) {
    registerAction2(OpenRequestFeatureUrlAction);
}
if (OpenLicenseUrlAction.AVAILABLE) {
    registerAction2(OpenLicenseUrlAction);
}
if (OpenPrivacyStatementUrlAction.AVAILABE) {
    registerAction2(OpenPrivacyStatementUrlAction);
}
registerAction2(GetStartedWithAccessibilityFeatures);
if (GetStartedWithCopilot.AVAILABE) {
    registerAction2(GetStartedWithCopilot);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9hY3Rpb25zL2hlbHBBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDckQsT0FBTyxPQUFPLE1BQU0sNkNBQTZDLENBQUE7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFHcEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUUvRSxNQUFNLDBCQUEyQixTQUFRLE9BQU87YUFDL0IsT0FBRSxHQUFHLHVDQUF1QyxDQUFBO2FBQzVDLGNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPO1FBQ3JDLENBQUMsQ0FBQyxPQUFPLENBQUMseUJBQXlCO1FBQ25DLENBQUMsQ0FBQyxXQUFXO1lBQ1osQ0FBQyxDQUFDLE9BQU8sQ0FBQyx1QkFBdUI7WUFD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