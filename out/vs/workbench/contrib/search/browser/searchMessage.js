/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import Severity from '../../../../base/common/severity.js';
import { SeverityIcon } from '../../../../base/browser/ui/severityIcon/severityIcon.js';
import { TextSearchCompleteMessageType, } from '../../../services/search/common/searchExtTypes.js';
import { Schemas } from '../../../../base/common/network.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { URI } from '../../../../base/common/uri.js';
export const renderSearchMessage = (message, instantiationService, notificationService, openerService, commandService, disposableStore, triggerSearch) => {
    const div = dom.$('div.providerMessage');
    const linkedText = parseLinkedText(message.text);
    dom.append(div, dom.$('.' +
        SeverityIcon.className(message.type === TextSearchCompleteMessageType.Information
            ? Severity.Info
            : Severity.Warning)
            .split(' ')
            .join('.')));
    for (const node of linkedText.nodes) {
        if (typeof node === 'string') {
            dom.append(div, document.createTextNode(node));
        }
        else {
            const link = instantiationService.createInstance(Link, div, node, {
                opener: async (href) => {
                    if (!message.trusted) {
                        return;
                    }
                    const parsed = URI.parse(href, true);
                    if (parsed.scheme === Schemas.command && message.trusted) {
                        const result = await commandService.executeCommand(parsed.path);
                        if (result?.triggerSearch) {
                            triggerSearch();
                        }
                    }
                    else if (parsed.scheme === Schemas.https) {
                        openerService.open(parsed);
                    }
                    else {
                        if (parsed.scheme === Schemas.command && !message.trusted) {
                            notificationService.error(nls.localize('unable to open trust', 'Unable to open command link from untrusted source: {0}', href));
                        }
                        else {
                            notificationService.error(nls.localize('unable to open', 'Unable to open unknown link: {0}', href));
                        }
                    }
                },
            });
            disposableStore.add(link);
        }
    }
    return div;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTWVzc2FnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaE1lc3NhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBRXRELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN2RSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUcxRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDdkYsT0FBTyxFQUVOLDZCQUE2QixHQUM3QixNQUFNLG1EQUFtRCxDQUFBO0FBRTFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLENBQ2xDLE9BQWtDLEVBQ2xDLG9CQUEyQyxFQUMzQyxtQkFBeUMsRUFDekMsYUFBNkIsRUFDN0IsY0FBK0IsRUFDL0IsZUFBZ0MsRUFDaEMsYUFBeUIsRUFDWCxFQUFFO0lBQ2hCLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQTtJQUN4QyxNQUFNLFVBQVUsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2hELEdBQUcsQ0FBQyxNQUFNLENBQ1QsR0FBRyxFQUNILEdBQUcsQ0FBQyxDQUFDLENBQ0osR0FBRztRQUNGLFlBQVksQ0FBQyxTQUFTLENBQ3JCLE9BQU8sQ0FBQyxJQUFJLEtBQUssNkJBQTZCLENBQUMsV0FBVztZQUN6RCxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUk7WUFDZixDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FDbkI7YUFDQyxLQUFLLENBQUMsR0FBRyxDQUFDO2FBQ1YsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUNaLENBQ0QsQ0FBQTtJQUVELEtBQUssTUFBTSxJQUFJLElBQUksVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3JDLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDOUIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQy9DLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxJQUFJLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFO2dCQUNqRSxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO29CQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUN0QixPQUFNO29CQUNQLENBQUM7b0JBQ0QsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7b0JBQ3BDLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDMUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxjQUFjLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTt3QkFDL0QsSUFBSyxNQUFjLEVBQUUsYUFBYSxFQUFFLENBQUM7NEJBQ3BDLGFBQWEsRUFBRSxDQUFBO3dCQUNoQixDQUFDO29CQUNGLENBQUM7eUJBQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFDNUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtvQkFDM0IsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDOzRCQUMzRCxtQkFBbUIsQ0FBQyxLQUFLLENBQ3hCLEdBQUcsQ0FBQyxRQUFRLENBQ1gsc0JBQXNCLEVBQ3RCLHdEQUF3RCxFQUN4RCxJQUFJLENBQ0osQ0FDRCxDQUFBO3dCQUNGLENBQUM7NkJBQU0sQ0FBQzs0QkFDUCxtQkFBbUIsQ0FBQyxLQUFLLENBQ3hCLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsa0NBQWtDLEVBQUUsSUFBSSxDQUFDLENBQ3hFLENBQUE7d0JBQ0YsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7YUFDRCxDQUFDLENBQUE7WUFDRixlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzFCLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxHQUFHLENBQUE7QUFDWCxDQUFDLENBQUEifQ==