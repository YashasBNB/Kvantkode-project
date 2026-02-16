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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uQWNjZXNpYmlsaXR5SGVscC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci9leHRlbnNpb25BY2Nlc2liaWxpdHlIZWxwLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sYUFBYSxFQUViLGVBQWUsRUFDZixVQUFVLEdBQ1YsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3QyxPQUFPLEVBRU4sd0JBQXdCLEdBQ3hCLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDN0csT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25FLE9BQU8sRUFBa0IsVUFBVSxFQUFtQixNQUFNLDBCQUEwQixDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RSxJQUFNLDRDQUE0QyxHQUFsRCxNQUFNLDRDQUE2QyxTQUFRLFVBQVU7YUFDcEUsT0FBRSxHQUFHLDhDQUE4QyxBQUFqRCxDQUFpRDtJQUUxRCxZQUFnQyxpQkFBcUM7UUFDcEUsS0FBSyxFQUFFLENBQUE7UUFGQSx1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUF1QixDQUFDLENBQUE7UUFHcEYsSUFBSSxDQUFDLFNBQVMsQ0FDYixRQUFRLENBQUMsRUFBRSxDQUFpQixV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