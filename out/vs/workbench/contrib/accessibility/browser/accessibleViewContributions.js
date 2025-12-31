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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJsZVZpZXdDb250cmlidXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYWNjZXNzaWJpbGl0eS9icm93c2VyL2FjY2Vzc2libGVWaWV3Q29udHJpYnV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDMUYsT0FBTyxFQUlOLHNCQUFzQixHQUN0QixNQUFNLDhEQUE4RCxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBRzdHLE1BQU0sT0FBTyw2QkFBOEIsU0FBUSxVQUFVO0lBRTVEO1FBQ0MsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsU0FBUyxDQUNiLHVCQUF1QixDQUFDLGlCQUFpQixDQUN4QyxHQUFHLEVBQ0gsc0JBQXNCLEVBQ3RCLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDWixRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtZQUM3RCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUMsRUFDRCxxQkFBcUIsQ0FDckIsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDBCQUEyQixTQUFRLFVBQVU7SUFFekQ7UUFDQyxLQUFLLEVBQUUsQ0FBQTtRQUNQLHNCQUFzQixDQUFDLGtCQUFrQixFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDNUQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEVBQUU7Z0JBQ3JELE1BQU0sUUFBUSxHQUNiLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQzNCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDZixPQUFPLEtBQUssQ0FBQTtnQkFDYixDQUFDO2dCQUNELElBQUksQ0FBQztvQkFDSixRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO29CQUNuRCxPQUFPLElBQUksQ0FBQTtnQkFDWixDQUFDO2dCQUFDLE1BQU0sQ0FBQztvQkFDUixRQUFRLENBQUMsT0FBTyxFQUFFLENBQUE7b0JBQ2xCLE9BQU8sS0FBSyxDQUFBO2dCQUNiLENBQUM7WUFDRixDQUFDLENBQUE7WUFDRCxJQUFJLElBQUksQ0FBQyxJQUFJLHlDQUE0QixFQUFFLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxTQUFTLENBQ2Isb0JBQW9CLENBQUMsaUJBQWlCLENBQ3JDLElBQUksQ0FBQyxRQUFRLEVBQ2IsSUFBSSxDQUFDLElBQUksRUFDVCxjQUFjLEVBQ2QsSUFBSSxDQUFDLElBQUksQ0FDVCxDQUNELENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FDYix1QkFBdUIsQ0FBQyxpQkFBaUIsQ0FDeEMsSUFBSSxDQUFDLFFBQVEsRUFDYixJQUFJLENBQUMsSUFBSSxFQUNULGNBQWMsRUFDZCxJQUFJLENBQUMsSUFBSSxDQUNULENBQ0QsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCJ9