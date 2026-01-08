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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTWVzc2FnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoTWVzc2FnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFFdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3ZFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBRzFELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN2RixPQUFPLEVBRU4sNkJBQTZCLEdBQzdCLE1BQU0sbURBQW1ELENBQUE7QUFFMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsQ0FDbEMsT0FBa0MsRUFDbEMsb0JBQTJDLEVBQzNDLG1CQUF5QyxFQUN6QyxhQUE2QixFQUM3QixjQUErQixFQUMvQixlQUFnQyxFQUNoQyxhQUF5QixFQUNYLEVBQUU7SUFDaEIsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0lBQ3hDLE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDaEQsR0FBRyxDQUFDLE1BQU0sQ0FDVCxHQUFHLEVBQ0gsR0FBRyxDQUFDLENBQUMsQ0FDSixHQUFHO1FBQ0YsWUFBWSxDQUFDLFNBQVMsQ0FDckIsT0FBTyxDQUFDLElBQUksS0FBSyw2QkFBNkIsQ0FBQyxXQUFXO1lBQ3pELENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSTtZQUNmLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUNuQjthQUNDLEtBQUssQ0FBQyxHQUFHLENBQUM7YUFDVixJQUFJLENBQUMsR0FBRyxDQUFDLENBQ1osQ0FDRCxDQUFBO0lBRUQsS0FBSyxNQUFNLElBQUksSUFBSSxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDckMsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM5QixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDL0MsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLElBQUksR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUU7Z0JBQ2pFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7b0JBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQ3RCLE9BQU07b0JBQ1AsQ0FBQztvQkFDRCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtvQkFDcEMsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUMxRCxNQUFNLE1BQU0sR0FBRyxNQUFNLGNBQWMsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO3dCQUMvRCxJQUFLLE1BQWMsRUFBRSxhQUFhLEVBQUUsQ0FBQzs0QkFDcEMsYUFBYSxFQUFFLENBQUE7d0JBQ2hCLENBQUM7b0JBQ0YsQ0FBQzt5QkFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO3dCQUM1QyxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUMzQixDQUFDO3lCQUFNLENBQUM7d0JBQ1AsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7NEJBQzNELG1CQUFtQixDQUFDLEtBQUssQ0FDeEIsR0FBRyxDQUFDLFFBQVEsQ0FDWCxzQkFBc0IsRUFDdEIsd0RBQXdELEVBQ3hELElBQUksQ0FDSixDQUNELENBQUE7d0JBQ0YsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLG1CQUFtQixDQUFDLEtBQUssQ0FDeEIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxrQ0FBa0MsRUFBRSxJQUFJLENBQUMsQ0FDeEUsQ0FBQTt3QkFDRixDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQzthQUNELENBQUMsQ0FBQTtZQUNGLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQTtBQUNYLENBQUMsQ0FBQSJ9