/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toDisposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IRemoteSocketFactoryService = createDecorator('remoteSocketFactoryService');
export class RemoteSocketFactoryService {
    constructor() {
        this.factories = {};
    }
    register(type, factory) {
        this.factories[type] ??= [];
        this.factories[type].push(factory);
        return toDisposable(() => {
            const idx = this.factories[type]?.indexOf(factory);
            if (typeof idx === 'number' && idx >= 0) {
                this.factories[type]?.splice(idx, 1);
            }
        });
    }
    getSocketFactory(messagePassing) {
        const factories = (this.factories[messagePassing.type] || []);
        return factories.find((factory) => factory.supports(messagePassing));
    }
    connect(connectTo, path, query, debugLabel) {
        const socketFactory = this.getSocketFactory(connectTo);
        if (!socketFactory) {
            throw new Error(`No socket factory found for ${connectTo}`);
        }
        return socketFactory.connect(connectTo, path, query, debugLabel);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlU29ja2V0RmFjdG9yeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZW1vdGUvY29tbW9uL3JlbW90ZVNvY2tldEZhY3RvcnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFPN0UsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsZUFBZSxDQUN6RCw0QkFBNEIsQ0FDNUIsQ0FBQTtBQStCRCxNQUFNLE9BQU8sMEJBQTBCO0lBQXZDO1FBR2tCLGNBQVMsR0FBMEQsRUFBRSxDQUFBO0lBbUN2RixDQUFDO0lBakNPLFFBQVEsQ0FDZCxJQUFPLEVBQ1AsT0FBMEI7UUFFMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDbkMsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ2xELElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDekMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3JDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxnQkFBZ0IsQ0FDdkIsY0FBeUM7UUFFekMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQXdCLENBQUE7UUFDcEYsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7SUFDckUsQ0FBQztJQUVNLE9BQU8sQ0FDYixTQUEyQixFQUMzQixJQUFZLEVBQ1osS0FBYSxFQUNiLFVBQWtCO1FBRWxCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN0RCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDcEIsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsU0FBUyxFQUFFLENBQUMsQ0FBQTtRQUM1RCxDQUFDO1FBQ0QsT0FBTyxhQUFhLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7Q0FDRCJ9