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
import { DisposableMap, DisposableStore, Disposable, } from '../../../../base/common/lifecycle.js';
import { ExtensionContentProvider, } from '../../../../platform/accessibility/browser/accessibleView.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { FocusedViewContext } from '../../../common/contextkeys.js';
import { Extensions } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
let ExtensionAccessibilityHelpDialogContribution = class ExtensionAccessibilityHelpDialogContribution extends Disposable {
    static { this.ID = 'extensionAccessibilityHelpDialogContribution'; }
    constructor(keybindingService) {
        super();
        this._viewHelpDialogMap = this._register(new DisposableMap());
        this._register(Registry.as(Extensions.ViewsRegistry).onViewsRegistered((e) => {
            for (const view of e) {
                for (const viewDescriptor of view.views) {
                    if (viewDescriptor.accessibilityHelpContent) {
                        this._viewHelpDialogMap.set(viewDescriptor.id, registerAccessibilityHelpAction(keybindingService, viewDescriptor));
                    }
                }
            }
        }));
        this._register(Registry.as(Extensions.ViewsRegistry).onViewsDeregistered((e) => {
            for (const viewDescriptor of e.views) {
                if (viewDescriptor.accessibilityHelpContent) {
                    this._viewHelpDialogMap.get(viewDescriptor.id)?.dispose();
                }
            }
        }));
    }
};
ExtensionAccessibilityHelpDialogContribution = __decorate([
    __param(0, IKeybindingService)
], ExtensionAccessibilityHelpDialogContribution);
export { ExtensionAccessibilityHelpDialogContribution };
function registerAccessibilityHelpAction(keybindingService, viewDescriptor) {
    const disposableStore = new DisposableStore();
    const content = viewDescriptor.accessibilityHelpContent?.value;
    if (!content) {
        throw new Error('No content provided for the accessibility help dialog');
    }
    disposableStore.add(AccessibleViewRegistry.register({
        priority: 95,
        name: viewDescriptor.id,
        type: "help" /* AccessibleViewType.Help */,
        when: FocusedViewContext.isEqualTo(viewDescriptor.id),
        getProvider: (accessor) => {
            const viewsService = accessor.get(IViewsService);
            return new ExtensionContentProvider(viewDescriptor.id, { type: "help" /* AccessibleViewType.Help */ }, () => content, () => viewsService.openView(viewDescriptor.id, true));
        },
    }));
    disposableStore.add(keybindingService.onDidUpdateKeybindings(() => {
        disposableStore.clear();
        disposableStore.add(registerAccessibilityHelpAction(keybindingService, viewDescriptor));
    }));
    return disposableStore;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uQWNjZXNpYmlsaXR5SGVscC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvZXh0ZW5zaW9uQWNjZXNpYmlsaXR5SGVscC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLGFBQWEsRUFFYixlQUFlLEVBQ2YsVUFBVSxHQUNWLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsT0FBTyxFQUVOLHdCQUF3QixHQUN4QixNQUFNLDhEQUE4RCxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQzdHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQWtCLFVBQVUsRUFBbUIsTUFBTSwwQkFBMEIsQ0FBQTtBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFdkUsSUFBTSw0Q0FBNEMsR0FBbEQsTUFBTSw0Q0FBNkMsU0FBUSxVQUFVO2FBQ3BFLE9BQUUsR0FBRyw4Q0FBOEMsQUFBakQsQ0FBaUQ7SUFFMUQsWUFBZ0MsaUJBQXFDO1FBQ3BFLEtBQUssRUFBRSxDQUFBO1FBRkEsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBdUIsQ0FBQyxDQUFBO1FBR3BGLElBQUksQ0FBQyxTQUFTLENBQ2IsUUFBUSxDQUFDLEVBQUUsQ0FBaUIsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFD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