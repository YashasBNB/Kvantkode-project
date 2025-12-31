/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
export class MockChatWidgetService {
    constructor() {
        this.onDidAddWidget = Event.None;
    }
    getWidgetByInputUri(uri) {
        return undefined;
    }
    getWidgetBySessionId(sessionId) {
        return undefined;
    }
    getWidgetsByLocations(location) {
        return [];
    }
    getAllWidgets() {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0NoYXRXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvYnJvd3Nlci9tb2NrQ2hhdFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFLM0QsTUFBTSxPQUFPLHFCQUFxQjtJQUFsQztRQUNVLG1CQUFjLEdBQXVCLEtBQUssQ0FBQyxJQUFJLENBQUE7SUF3QnpELENBQUM7SUFmQSxtQkFBbUIsQ0FBQyxHQUFRO1FBQzNCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxTQUFpQjtRQUNyQyxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQscUJBQXFCLENBQUMsUUFBMkI7UUFDaEQsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsYUFBYTtRQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0NBQ0QifQ==