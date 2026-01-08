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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2FjdGlvbnMvaGVscEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUNyRCxPQUFPLE9BQU8sTUFBTSw2Q0FBNkMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM5RixPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLGtDQUFrQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUdwRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDdEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRS9FLE1BQU0sMEJBQTJCLFNBQVEsT0FBTzthQUMvQixPQUFFLEdBQUcsdUNBQXVDLENBQUE7YUFDNUMsY0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU87UUFDckMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUI7UUFDbkMsQ0FBQyxDQUFDLFdBQVc7WUFDWixDQUFDLENBQUMsT0FBTyxDQUFDLHVCQUF1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