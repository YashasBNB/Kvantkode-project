/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from './event.js';
export class Sequence {
    constructor() {
        this.elements = [];
        this._onDidSplice = new Emitter();
        this.onDidSplice = this._onDidSplice.event;
    }
    splice(start, deleteCount, toInsert = []) {
        this.elements.splice(start, deleteCount, ...toInsert);
        this._onDidSplice.fire({ start, deleteCount, toInsert });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VxdWVuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9zZXF1ZW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sWUFBWSxDQUFBO0FBaUIzQyxNQUFNLE9BQU8sUUFBUTtJQUFyQjtRQUNVLGFBQVEsR0FBUSxFQUFFLENBQUE7UUFFVixpQkFBWSxHQUFHLElBQUksT0FBTyxFQUFjLENBQUE7UUFDaEQsZ0JBQVcsR0FBc0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7SUFNbEUsQ0FBQztJQUpBLE1BQU0sQ0FBQyxLQUFhLEVBQUUsV0FBbUIsRUFBRSxXQUF5QixFQUFFO1FBQ3JFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQTtRQUNyRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0NBQ0QifQ==