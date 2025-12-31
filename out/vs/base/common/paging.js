/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { range } from './arrays.js';
import { CancellationTokenSource } from './cancellation.js';
import { CancellationError } from './errors.js';
function createPage(elements) {
    return {
        isResolved: !!elements,
        promise: null,
        cts: null,
        promiseIndexes: new Set(),
        elements: elements || [],
    };
}
export function singlePagePager(elements) {
    return {
        firstPage: elements,
        total: elements.length,
        pageSize: elements.length,
        getPage: (pageIndex, cancellationToken) => {
            return Promise.resolve(elements);
        },
    };
}
export class PagedModel {
    get length() {
        return this.pager.total;
    }
    constructor(arg) {
        this.pages = [];
        this.pager = Array.isArray(arg) ? singlePagePager(arg) : arg;
        const totalPages = Math.ceil(this.pager.total / this.pager.pageSize);
        this.pages = [
            createPage(this.pager.firstPage.slice()),
            ...range(totalPages - 1).map(() => createPage()),
        ];
    }
    isResolved(index) {
        const pageIndex = Math.floor(index / this.pager.pageSize);
        const page = this.pages[pageIndex];
        return !!page.isResolved;
    }
    get(index) {
        const pageIndex = Math.floor(index / this.pager.pageSize);
        const indexInPage = index % this.pager.pageSize;
        const page = this.pages[pageIndex];
        return page.elements[indexInPage];
    }
    resolve(index, cancellationToken) {
        if (cancellationToken.isCancellationRequested) {
            return Promise.reject(new CancellationError());
        }
        const pageIndex = Math.floor(index / this.pager.pageSize);
        const indexInPage = index % this.pager.pageSize;
        const page = this.pages[pageIndex];
        if (page.isResolved) {
            return Promise.resolve(page.elements[indexInPage]);
        }
        if (!page.promise) {
            page.cts = new CancellationTokenSource();
            page.promise = this.pager.getPage(pageIndex, page.cts.token).then((elements) => {
                page.elements = elements;
                page.isResolved = true;
                page.promise = null;
                page.cts = null;
            }, (err) => {
                page.isResolved = false;
                page.promise = null;
                page.cts = null;
                return Promise.reject(err);
            });
        }
        const listener = cancellationToken.onCancellationRequested(() => {
            if (!page.cts) {
                return;
            }
            page.promiseIndexes.delete(index);
            if (page.promiseIndexes.size === 0) {
                page.cts.cancel();
            }
        });
        page.promiseIndexes.add(index);
        return page.promise.then(() => page.elements[indexInPage]).finally(() => listener.dispose());
    }
}
export class DelayedPagedModel {
    get length() {
        return this.model.length;
    }
    constructor(model, timeout = 500) {
        this.model = model;
        this.timeout = timeout;
    }
    isResolved(index) {
        return this.model.isResolved(index);
    }
    get(index) {
        return this.model.get(index);
    }
    resolve(index, cancellationToken) {
        return new Promise((c, e) => {
            if (cancellationToken.isCancellationRequested) {
                return e(new CancellationError());
            }
            const timer = setTimeout(() => {
                if (cancellationToken.isCancellationRequested) {
                    return e(new CancellationError());
                }
                timeoutCancellation.dispose();
                this.model.resolve(index, cancellationToken).then(c, e);
            }, this.timeout);
            const timeoutCancellation = cancellationToken.onCancellationRequested(() => {
                clearTimeout(timer);
                timeoutCancellation.dispose();
                e(new CancellationError());
            });
        });
    }
}
/**
 * Similar to array.map, `mapPager` lets you map the elements of an
 * abstract paged collection to another type.
 */
export function mapPager(pager, fn) {
    return {
        firstPage: pager.firstPage.map(fn),
        total: pager.total,
        pageSize: pager.pageSize,
        getPage: (pageIndex, token) => pager.getPage(pageIndex, token).then((r) => r.map(fn)),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFnaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vcGFnaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDbkMsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQzlFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQW9CL0MsU0FBUyxVQUFVLENBQUksUUFBYztJQUNwQyxPQUFPO1FBQ04sVUFBVSxFQUFFLENBQUMsQ0FBQyxRQUFRO1FBQ3RCLE9BQU8sRUFBRSxJQUFJO1FBQ2IsR0FBRyxFQUFFLElBQUk7UUFDVCxjQUFjLEVBQUUsSUFBSSxHQUFHLEVBQVU7UUFDakMsUUFBUSxFQUFFLFFBQVEsSUFBSSxFQUFFO0tBQ3hCLENBQUE7QUFDRixDQUFDO0FBWUQsTUFBTSxVQUFVLGVBQWUsQ0FBSSxRQUFhO0lBQy9DLE9BQU87UUFDTixTQUFTLEVBQUUsUUFBUTtRQUNuQixLQUFLLEVBQUUsUUFBUSxDQUFDLE1BQU07UUFDdEIsUUFBUSxFQUFFLFFBQVEsQ0FBQyxNQUFNO1FBQ3pCLE9BQU8sRUFBRSxDQUFDLFNBQWlCLEVBQUUsaUJBQW9DLEVBQWdCLEVBQUU7WUFDbEYsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pDLENBQUM7S0FDRCxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sT0FBTyxVQUFVO0lBSXRCLElBQUksTUFBTTtRQUNULE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUE7SUFDeEIsQ0FBQztJQUVELFlBQVksR0FBb0I7UUFOeEIsVUFBSyxHQUFlLEVBQUUsQ0FBQTtRQU83QixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUss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