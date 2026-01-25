/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { accessibleViewIsShown } from './accessibilityConfiguration.js';
import { AccessibilityHelpAction, AccessibleViewAction } from './accessibleViewActions.js';
import { IAccessibleViewService, } from '../../../../platform/accessibility/browser/accessibleView.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
export class AccesibleViewHelpContribution extends Disposable {
    constructor() {
        super();
        this._register(AccessibilityHelpAction.addImplementation(115, 'accessible-view-help', (accessor) => {
            accessor.get(IAccessibleViewService).showAccessibleViewHelp();
            return true;
        }, accessibleViewIsShown));
    }
}
export class AccesibleViewContributions extends Disposable {
    constructor() {
        super();
        AccessibleViewRegistry.getImplementations().forEach((impl) => {
            const implementation = (accessor) => {
                const provider = impl.getProvider(accessor);
                if (!provider) {
                    return false;
                }
                try {
                    accessor.get(IAccessibleViewService).show(provider);
                    return true;
                }
                catch {
                    provider.dispose();
                    return false;
                }
            };
            if (impl.type === "view" /* AccessibleViewType.View */) {
                this._register(AccessibleViewAction.addImplementation(impl.priority, impl.name, implementation, impl.when));
            }
            else {
                this._register(AccessibilityHelpAction.addImplementation(impl.priority, impl.name, implementation, impl.when));
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXdDb250cmlidXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvYWNjZXNzaWJsZVZpZXdDb250cmlidXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMxRixPQUFPLEVBSU4sc0JBQXNCLEdBQ3RCLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFHN0csTUFBTSxPQUFPLDZCQUE4QixTQUFRLFVBQVU7SUFFNUQ7UUFDQyxLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksQ0FBQyxTQUFTLENBQ2IsdUJBQXVCLENBQUMsaUJBQWlCLENBQ3hDLEdBQUcsRUFDSCxzQkFBc0IsRUFDdEIsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUNaLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO1lBQzdELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQyxFQUNELHFCQUFxQixDQUNyQixDQUNELENBQUE7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsVUFBVTtJQUV6RDtRQUNDLEtBQUssRUFBRSxDQUFBO1FBQ1Asc0JBQXNCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUM1RCxNQUFNLGNBQWMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsRUFBRTtnQkFDckQsTUFBTSxRQUFRLEdBQ2IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDM0IsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUNmLE9BQU8sS0FBSyxDQUFBO2dCQUNiLENBQUM7Z0JBQ0QsSUFBSSxDQUFDO29CQUNKLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7b0JBQ25ELE9BQU8sSUFBSSxDQUFBO2dCQUNaLENBQUM7Z0JBQUMsTUFBTSxDQUFDO29CQUNSLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtvQkFDbEIsT0FBTyxLQUFLLENBQUE7Z0JBQ2IsQ0FBQztZQUNGLENBQUMsQ0FBQTtZQUNELElBQUksSUFBSSxDQUFDLElBQUkseUNBQTRCLEVBQUUsQ0FBQztnQkFDM0MsSUFBSSxDQUFDLFNBQVMsQ0FDYixvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FDckMsSUFBSSxDQUFDLFFBQVEsRUFDYixJQUFJLENBQUMsSUFBSSxFQUNULGNBQWMsRUFDZCxJQUFJLENBQUMsSUFBSSxDQUNULENBQ0QsQ0FBQTtZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsU0FBUyxDQUNiLHVCQUF1QixDQUFDLGlCQUFpQixDQUN4QyxJQUFJLENBQUMsUUFBUSxFQUNiLElBQUksQ0FBQyxJQUFJLEVBQ1QsY0FBYyxFQUNkLElBQUksQ0FBQyxJQUFJLENBQ1QsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNEIn0=