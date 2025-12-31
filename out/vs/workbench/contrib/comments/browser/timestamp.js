/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { fromNow } from '../../../../base/common/date.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { language } from '../../../../base/common/platform.js';
import { COMMENTS_SECTION } from '../common/commentsConfiguration.js';
export class TimestampWidget extends Disposable {
    constructor(configurationService, hoverService, container, timeStamp) {
        super();
        this.configurationService = configurationService;
        this._date = dom.append(container, dom.$('span.timestamp'));
        this._date.style.display = 'none';
        this._useRelativeTime = this.useRelativeTimeSetting;
        this.hover = this._register(hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this._date, ''));
        this.setTimestamp(timeStamp);
    }
    get useRelativeTimeSetting() {
        return this.configurationService.getValue(COMMENTS_SECTION)
            .useRelativeTime;
    }
    async setTimestamp(timestamp) {
        if (timestamp !== this._timestamp || this.useRelativeTimeSetting !== this._useRelativeTime) {
            this.updateDate(timestamp);
        }
        this._timestamp = timestamp;
        this._useRelativeTime = this.useRelativeTimeSetting;
    }
    updateDate(timestamp) {
        if (!timestamp) {
            this._date.textContent = '';
            this._date.style.display = 'none';
        }
        else if (timestamp !== this._timestamp ||
            this.useRelativeTimeSetting !== this._useRelativeTime) {
            this._date.style.display = '';
            let textContent;
            let tooltip;
            if (this.useRelativeTimeSetting) {
                textContent = this.getRelative(timestamp);
                tooltip = this.getDateString(timestamp);
            }
            else {
                textContent = this.getDateString(timestamp);
            }
            this._date.textContent = textContent;
            this.hover.update(tooltip ?? '');
        }
    }
    getRelative(date) {
        return fromNow(date, true, true);
    }
    getDateString(date) {
        return date.toLocaleString(language);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXN0YW1wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci90aW1lc3RhbXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV0RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUc5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQTBCLE1BQU0sb0NBQW9DLENBQUE7QUFFN0YsTUFBTSxPQUFPLGVBQWdCLFNBQVEsVUFBVTtJQU85QyxZQUNTLG9CQUEyQyxFQUNuRCxZQUEyQixFQUMzQixTQUFzQixFQUN0QixTQUFnQjtRQUVoQixLQUFLLEVBQUUsQ0FBQTtRQUxDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFNbkQsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQTtRQUMzRCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUE7UUFDbkQsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMxQixZQUFZLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FDaEYsQ0FBQTtRQUNELElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUVELElBQVksc0JBQXNCO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBeUIsZ0JBQWdCLENBQUM7YUFDakYsZUFBZSxDQUFBO0lBQ2xCLENBQUM7SUFFTSxLQUFLLENBQUMsWUFBWSxDQUFDLFNBQTJCO1FBQ3BELElBQUksU0FBUyxLQUFLLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLHNCQUFzQixLQUFLLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzVGLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDM0IsQ0FBQztRQUNELElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO1FBQzNCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUE7SUFDcEQsQ0FBQztJQUVPLFVBQVUsQ0FBQyxTQUFnQjtRQUNsQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFBO1lBQzNCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDbEMsQ0FBQzthQUFNLElBQ04sU0FBUyxLQUFLLElBQUksQ0FBQyxVQUFVO1lBQzdCLElBQUksQ0FBQyxzQkFBc0IsS0FBSyxJQUFJLENBQUMsZ0JBQWdCLEVBQ3BELENBQUM7WUFDRixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFBO1lBQzdCLElBQUksV0FBbUIsQ0FBQTtZQUN2QixJQUFJLE9BQTJCLENBQUE7WUFDL0IsSUFBSSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztnQkFDakMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ3pDLE9BQU8sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3hDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxXQUFXLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUM1QyxDQUFDO1lBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFBO1lBQ3BDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNqQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLFdBQVcsQ0FBQyxJQUFVO1FBQzdCLE9BQU8sT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVPLGFBQWEsQ0FBQyxJQUFVO1FBQy9CLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0NBQ0QifQ==