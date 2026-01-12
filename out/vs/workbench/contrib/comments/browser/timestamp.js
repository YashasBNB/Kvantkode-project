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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXN0YW1wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL3RpbWVzdGFtcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBRXRELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRzlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBMEIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU3RixNQUFNLE9BQU8sZUFBZ0IsU0FBUSxVQUFVO0lBTzlDLFlBQ1Msb0JBQTJDLEVBQ25ELFlBQTJCLEVBQzNCLFNBQXNCLEVBQ3RCLFNBQWdCO1FBRWhCLEtBQUssRUFBRSxDQUFBO1FBTEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQU1uRCxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBQzNELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDakMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQTtRQUNuRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzFCLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUNoRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBRUQsSUFBWSxzQkFBc0I7UUFDakMsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUF5QixnQkFBZ0IsQ0FBQzthQUNqRixlQUFlLENBQUE7SUFDbEIsQ0FBQztJQUVNLEtBQUssQ0FBQyxZQUFZLENBQUMsU0FBMkI7UUFDcEQsSUFBSSxTQUFTLEtBQUssSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsc0JBQXNCLEtBQUssSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDNUYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMzQixDQUFDO1FBQ0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUE7UUFDM0IsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQTtJQUNwRCxDQUFDO0lBRU8sVUFBVSxDQUFDLFNBQWdCO1FBQ2xDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUE7WUFDM0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNsQyxDQUFDO2FBQU0sSUFDTixTQUFTLEtBQUssSUFBSSxDQUFDLFVBQVU7WUFDN0IsSUFBSSxDQUFDLHNCQUFzQixLQUFLLElBQUksQ0FBQyxnQkFBZ0IsRUFDcEQsQ0FBQztZQUNGLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUE7WUFDN0IsSUFBSSxXQUFtQixDQUFBO1lBQ3ZCLElBQUksT0FBMkIsQ0FBQTtZQUMvQixJQUFJLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO2dCQUNqQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDekMsT0FBTyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDeEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFdBQVcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzVDLENBQUM7WUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUE7WUFDcEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2pDLENBQUM7SUFDRixDQUFDO0lBRU8sV0FBVyxDQUFDLElBQVU7UUFDN0IsT0FBTyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRU8sYUFBYSxDQUFDLElBQVU7UUFDL0IsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7Q0FDRCJ9