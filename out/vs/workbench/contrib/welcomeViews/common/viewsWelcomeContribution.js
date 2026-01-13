/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ViewIdentifierMap, } from './viewsWelcomeExtensionPoint.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ViewContainerExtensions, } from '../../../common/views.js';
import { isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
const viewsRegistry = Registry.as(ViewContainerExtensions.ViewsRegistry);
export class ViewsWelcomeContribution extends Disposable {
    constructor(extensionPoint) {
        super();
        this.viewWelcomeContents = new Map();
        extensionPoint.setHandler((_, { added, removed }) => {
            for (const contribution of removed) {
                for (const welcome of contribution.value) {
                    const disposable = this.viewWelcomeContents.get(welcome);
                    disposable?.dispose();
                }
            }
            const welcomesByViewId = new Map();
            for (const contribution of added) {
                for (const welcome of contribution.value) {
                    const { group, order } = parseGroupAndOrder(welcome, contribution);
                    const precondition = ContextKeyExpr.deserialize(welcome.enablement);
                    const id = ViewIdentifierMap[welcome.view] ?? welcome.view;
                    let viewContentMap = welcomesByViewId.get(id);
                    if (!viewContentMap) {
                        viewContentMap = new Map();
                        welcomesByViewId.set(id, viewContentMap);
                    }
                    viewContentMap.set(welcome, {
                        content: welcome.contents,
                        when: ContextKeyExpr.deserialize(welcome.when),
                        precondition,
                        group,
                        order,
                    });
                }
            }
            for (const [id, viewContentMap] of welcomesByViewId) {
                const disposables = viewsRegistry.registerViewWelcomeContent2(id, viewContentMap);
                for (const [welcome, disposable] of disposables) {
                    this.viewWelcomeContents.set(welcome, disposable);
                }
            }
        });
    }
}
function parseGroupAndOrder(welcome, contribution) {
    let group;
    let order;
    if (welcome.group) {
        if (!isProposedApiEnabled(contribution.description, 'contribViewsWelcome')) {
            contribution.collector.warn(nls.localize('ViewsWelcomeExtensionPoint.proposedAPI', "The viewsWelcome contribution in '{0}' requires 'enabledApiProposals: [\"contribViewsWelcome\"]' in order to use the 'group' proposed property.", contribution.description.identifier.value));
            return { group, order };
        }
        const idx = welcome.group.lastIndexOf('@');
        if (idx > 0) {
            group = welcome.group.substr(0, idx);
            order = Number(welcome.group.substr(idx + 1)) || undefined;
        }
        else {
            group = welcome.group;
        }
    }
    return { group, order };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NXZWxjb21lQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lVmlld3MvY29tbW9uL3ZpZXdzV2VsY29tZUNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFNckYsT0FBTyxFQUdOLGlCQUFpQixHQUNqQixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sVUFBVSxJQUFJLHVCQUF1QixHQUdyQyxNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRXhGLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQWlCLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxDQUFBO0FBRXhGLE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxVQUFVO0lBR3ZELFlBQVksY0FBMkQ7UUFDdEUsS0FBSyxFQUFFLENBQUE7UUFIQSx3QkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFBNEIsQ0FBQTtRQUtoRSxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUU7WUFDbkQsS0FBSyxNQUFNLFlBQVksSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDcEMsS0FBSyxNQUFNLE9BQU8sSUFBSSxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQzFDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7b0JBRXhELFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQTtnQkFDdEIsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxFQUFvRCxDQUFBO1lBRXBGLEtBQUssTUFBTSxZQUFZLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ2xDLEtBQUssTUFBTSxPQUFPLElBQUksWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUMxQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQTtvQkFDbEUsTUFBTSxZQUFZLEdBQUcsY0FBYyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7b0JBRW5FLE1BQU0sRUFBRSxHQUFHLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFBO29CQUMxRCxJQUFJLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7b0JBQzdDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQzt3QkFDckIsY0FBYyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7d0JBQzFCLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUE7b0JBQ3pDLENBQUM7b0JBRUQsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUU7d0JBQzNCLE9BQU8sRUFBRSxPQUFPLENBQUMsUUFBUTt3QkFDekIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQzt3QkFDOUMsWUFBWTt3QkFDWixLQUFLO3dCQUNMLEtBQUs7cUJBQ0wsQ0FBQyxDQUFBO2dCQUNILENBQUM7WUFDRixDQUFDO1lBRUQsS0FBSyxNQUFNLENBQUMsRUFBRSxFQUFFLGNBQWMsQ0FBQyxJQUFJLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3JELE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUE7Z0JBRWpGLEtBQUssTUFBTSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQztvQkFDakQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUE7Z0JBQ2xELENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxTQUFTLGtCQUFrQixDQUMxQixPQUFvQixFQUNwQixZQUE2RDtJQUU3RCxJQUFJLEtBQXlCLENBQUE7SUFDN0IsSUFBSSxLQUF5QixDQUFBO0lBQzdCLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ25CLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLHFCQUFxQixDQUFDLEVBQUUsQ0FBQztZQUM1RSxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksQ0FDMUIsR0FBRyxDQUFDLFFBQVEsQ0FDWCx3Q0FBd0MsRUFDeEMsaUpBQWlKLEVBQ2pKLFlBQVksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDekMsQ0FDRCxDQUFBO1lBQ0QsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQTtRQUN4QixDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDMUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDYixLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ3BDLEtBQUssR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFBO1FBQzNELENBQUM7YUFBTSxDQUFDO1lBQ1AsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUE7UUFDdEIsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFBO0FBQ3hCLENBQUMifQ==