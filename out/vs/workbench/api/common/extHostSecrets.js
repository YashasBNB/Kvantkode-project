/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtensionIdentifier, } from '../../../platform/extensions/common/extensions.js';
import { Event } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
export class ExtensionSecrets {
    #secretState;
    constructor(extensionDescription, secretState) {
        this.disposables = new DisposableStore();
        this._id = ExtensionIdentifier.toKey(extensionDescription.identifier);
        this.#secretState = secretState;
        this.onDidChange = Event.map(Event.filter(this.#secretState.onDidChangePassword, (e) => e.extensionId === this._id), (e) => ({ key: e.key }), this.disposables);
    }
    dispose() {
        this.disposables.dispose();
    }
    get(key) {
        return this.#secretState.get(this._id, key);
    }
    store(key, value) {
        return this.#secretState.store(this._id, key, value);
    }
    delete(key) {
        return this.#secretState.delete(this._id, key);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNlY3JldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0U2VjcmV0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU9oRyxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVuRSxNQUFNLE9BQU8sZ0JBQWdCO0lBRW5CLFlBQVksQ0FBb0I7SUFLekMsWUFBWSxvQkFBMkMsRUFBRSxXQUErQjtRQUYvRSxnQkFBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFHM0MsSUFBSSxDQUFDLEdBQUcsR0FBRyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDckUsSUFBSSxDQUFDLFlBQVksR0FBRyxXQUFXLENBQUE7UUFFL0IsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUMzQixLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUN0RixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFDdkIsSUFBSSxDQUFDLFdBQVcsQ0FDaEIsQ0FBQTtJQUNGLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUMzQixDQUFDO0lBRUQsR0FBRyxDQUFDLEdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFXLEVBQUUsS0FBYTtRQUMvQixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFRCxNQUFNLENBQUMsR0FBVztRQUNqQixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDL0MsQ0FBQztDQUNEIn0=