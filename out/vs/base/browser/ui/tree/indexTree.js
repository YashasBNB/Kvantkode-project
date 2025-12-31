/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AbstractTree } from './abstractTree.js';
import { IndexTreeModel } from './indexTreeModel.js';
import { TreeError } from './tree.js';
import { Iterable } from '../../../common/iterator.js';
import './media/tree.css';
export class IndexTree extends AbstractTree {
    constructor(user, container, delegate, renderers, rootElement, options = {}) {
        super(user, container, delegate, renderers, options);
        this.user = user;
        this.rootElement = rootElement;
    }
    splice(location, deleteCount, toInsert = Iterable.empty()) {
        this.model.splice(location, deleteCount, toInsert);
    }
    rerender(location) {
        if (location === undefined) {
            this.view.rerender();
            return;
        }
        this.model.rerender(location);
    }
    updateElementHeight(location, height) {
        if (location.length === 0) {
            throw new TreeError(this.user, `Update element height failed: invalid location`);
        }
        const elementIndex = this.model.getListIndex(location);
        if (elementIndex === -1) {
            return;
        }
        this.view.updateElementHeight(elementIndex, height);
    }
    createModel(user, options) {
        return new IndexTreeModel(user, this.rootElement, options);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3RyZWUvaW5kZXhUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxZQUFZLEVBQXdCLE1BQU0sbUJBQW1CLENBQUE7QUFDdEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3BELE9BQU8sRUFBMkMsU0FBUyxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN0RCxPQUFPLGtCQUFrQixDQUFBO0FBS3pCLE1BQU0sT0FBTyxTQUFpQyxTQUFRLFlBQXNDO0lBRzNGLFlBQ2tCLElBQVksRUFDN0IsU0FBc0IsRUFDdEIsUUFBaUMsRUFDakMsU0FBK0MsRUFDdkMsV0FBYyxFQUN0QixVQUE2QyxFQUFFO1FBRS9DLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFQbkMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUlyQixnQkFBVyxHQUFYLFdBQVcsQ0FBRztJQUl2QixDQUFDO0lBRUQsTUFBTSxDQUNMLFFBQWtCLEVBQ2xCLFdBQW1CLEVBQ25CLFdBQXNDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7UUFFdEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBRUQsUUFBUSxDQUFDLFFBQW1CO1FBQzNCLElBQUksUUFBUSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDcEIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBRUQsbUJBQW1CLENBQUMsUUFBa0IsRUFBRSxNQUFjO1FBQ3JELElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMzQixNQUFNLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsZ0RBQWdELENBQUMsQ0FBQTtRQUNqRixDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdEQsSUFBSSxZQUFZLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUN6QixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFUyxXQUFXLENBQ3BCLElBQVksRUFDWixPQUEwQztRQUUxQyxPQUFPLElBQUksY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzNELENBQUM7Q0FDRCJ9