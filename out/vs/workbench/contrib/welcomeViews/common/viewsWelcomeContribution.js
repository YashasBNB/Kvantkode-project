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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NXZWxjb21lQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZVZpZXdzL2NvbW1vbi92aWV3c1dlbGNvbWVDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBTXJGLE9BQU8sRUFHTixpQkFBaUIsR0FDakIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUNOLFVBQVUsSUFBSSx1QkFBdUIsR0FHckMsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUV4RixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFpQix1QkFBdUIsQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUV4RixNQUFNLE9BQU8sd0JBQXlCLFNBQVEsVUFBVTtJQUd2RCxZQUFZLGNBQTJEO1FBQ3RFLEtBQUssRUFBRSxDQUFBO1FBSEEsd0JBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUE7UUFLaEUsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFO1lBQ25ELEtBQUssTUFBTSxZQUFZLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ3BDLEtBQUssTUFBTSxPQUFPLElBQUksWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUMxQyxN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