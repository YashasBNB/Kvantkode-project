/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedExternalError } from '../../../../../base/common/errors.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
export class NotebookCellStatusBarService extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChangeProviders = this._register(new Emitter());
        this.onDidChangeProviders = this._onDidChangeProviders.event;
        this._onDidChangeItems = this._register(new Emitter());
        this.onDidChangeItems = this._onDidChangeItems.event;
        this._providers = [];
    }
    registerCellStatusBarItemProvider(provider) {
        this._providers.push(provider);
        let changeListener;
        if (provider.onDidChangeStatusBarItems) {
            changeListener = provider.onDidChangeStatusBarItems(() => this._onDidChangeItems.fire());
        }
        this._onDidChangeProviders.fire();
        return toDisposable(() => {
            changeListener?.dispose();
            const idx = this._providers.findIndex((p) => p === provider);
            this._providers.splice(idx, 1);
        });
    }
    async getStatusBarItemsForCell(docUri, cellIndex, viewType, token) {
        const providers = this._providers.filter((p) => p.viewType === viewType || p.viewType === '*');
        return await Promise.all(providers.map(async (p) => {
            try {
                return (await p.provideCellStatusBarItems(docUri, cellIndex, token)) ?? { items: [] };
            }
            catch (e) {
                onUnexpectedExternalError(e);
                return { items: [] };
            }
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsU3RhdHVzQmFyU2VydmljZUltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3NlcnZpY2VzL25vdGVib29rQ2VsbFN0YXR1c0JhclNlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBUS9GLE1BQU0sT0FBTyw0QkFDWixTQUFRLFVBQVU7SUFEbkI7O1FBTWtCLDBCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ25FLHlCQUFvQixHQUFnQixJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFBO1FBRTVELHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQy9ELHFCQUFnQixHQUFnQixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO1FBRXBELGVBQVUsR0FBeUMsRUFBRSxDQUFBO0lBb0N2RSxDQUFDO0lBbENBLGlDQUFpQyxDQUFDLFFBQTRDO1FBQzdFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzlCLElBQUksY0FBdUMsQ0FBQTtRQUMzQyxJQUFJLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1lBQ3hDLGNBQWMsR0FBRyxRQUFRLENBQUMseUJBQXlCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7UUFDekYsQ0FBQztRQUVELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUVqQyxPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDeEIsY0FBYyxFQUFFLE9BQU8sRUFBRSxDQUFBO1lBQ3pCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUE7WUFDNUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9CLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyx3QkFBd0IsQ0FDN0IsTUFBVyxFQUNYLFNBQWlCLEVBQ2pCLFFBQWdCLEVBQ2hCLEtBQXdCO1FBRXhCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLFFBQVEsSUFBSSxDQUFDLENBQUMsUUFBUSxLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQzlGLE9BQU8sTUFBTSxPQUFPLENBQUMsR0FBRyxDQUN2QixTQUFTLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN6QixJQUFJLENBQUM7Z0JBQ0osT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLHlCQUF5QixDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQTtZQUN0RixDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWix5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQTtZQUNyQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7Q0FDRCJ9