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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFnaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9wYWdpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUNuQyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sYUFBYSxDQUFBO0FBb0IvQyxTQUFTLFVBQVUsQ0FBSSxRQUFjO0lBQ3BDLE9BQU87UUFDTixVQUFVLEVBQUUsQ0FBQyxDQUFDLFFBQVE7UUFDdEIsT0FBTyxFQUFFLElBQUk7UUFDYixHQUFHLEVBQUUsSUFBSTtRQUNULGNBQWMsRUFBRSxJQUFJLEdBQUcsRUFBVTtRQUNqQyxRQUFRLEVBQUUsUUFBUSxJQUFJLEVBQUU7S0FDeEIsQ0FBQTtBQUNGLENBQUM7QUFZRCxNQUFNLFVBQVUsZUFBZSxDQUFJLFFBQWE7SUFDL0MsT0FBTztRQUNOLFNBQVMsRUFBRSxRQUFRO1FBQ25CLEtBQUssRUFBRSxRQUFRLENBQUMsTUFBTTtRQUN0QixRQUFRLEVBQUUsUUFBUSxDQUFDLE1BQU07UUFDekIsT0FBTyxFQUFFLENBQUMsU0FBaUIsRUFBRSxpQkFBb0MsRUFBZ0IsRUFBRTtZQUNsRixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakMsQ0FBQztLQUNELENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxPQUFPLFVBQVU7SUFJdEIsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQTtJQUN4QixDQUFDO0lBRUQsWUFBWSxHQUFvQjtRQU54QixVQUFLLEdBQWUsRUFBRSxDQUFBO1FBTzdCLElBQUksQ0FBQyxLQUFLLEdBQUcs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