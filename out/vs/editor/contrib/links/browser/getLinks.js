/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { DisposableStore, isDisposable } from '../../../../base/common/lifecycle.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { Range } from '../../../common/core/range.js';
import { IModelService } from '../../../common/services/model.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
export class Link {
    constructor(link, provider) {
        this._link = link;
        this._provider = provider;
    }
    toJSON() {
        return {
            range: this.range,
            url: this.url,
            tooltip: this.tooltip,
        };
    }
    get range() {
        return this._link.range;
    }
    get url() {
        return this._link.url;
    }
    get tooltip() {
        return this._link.tooltip;
    }
    async resolve(token) {
        if (this._link.url) {
            return this._link.url;
        }
        if (typeof this._provider.resolveLink === 'function') {
            return Promise.resolve(this._provider.resolveLink(this._link, token)).then((value) => {
                this._link = value || this._link;
                if (this._link.url) {
                    // recurse
                    return this.resolve(token);
                }
                return Promise.reject(new Error('missing'));
            });
        }
        return Promise.reject(new Error('missing'));
    }
}
export class LinksList {
    static { this.Empty = new LinksList([]); }
    constructor(tuples) {
        this._disposables = new DisposableStore();
        let links = [];
        for (const [list, provider] of tuples) {
            // merge all links
            const newLinks = list.links.map((link) => new Link(link, provider));
            links = LinksList._union(links, newLinks);
            // register disposables
            if (isDisposable(list)) {
                this._disposables ??= new DisposableStore();
                this._disposables.add(list);
            }
        }
        this.links = links;
    }
    dispose() {
        this._disposables?.dispose();
        this.links.length = 0;
    }
    static _union(oldLinks, newLinks) {
        // reunite oldLinks with newLinks and remove duplicates
        const result = [];
        let oldIndex;
        let oldLen;
        let newIndex;
        let newLen;
        for (oldIndex = 0, newIndex = 0, oldLen = oldLinks.length, newLen = newLinks.length; oldIndex < oldLen && newIndex < newLen;) {
            const oldLink = oldLinks[oldIndex];
            const newLink = newLinks[newIndex];
            if (Range.areIntersectingOrTouching(oldLink.range, newLink.range)) {
                // Remove the oldLink
                oldIndex++;
                continue;
            }
            const comparisonResult = Range.compareRangesUsingStarts(oldLink.range, newLink.range);
            if (comparisonResult < 0) {
                // oldLink is before
                result.push(oldLink);
                oldIndex++;
            }
            else {
                // newLink is before
                result.push(newLink);
                newIndex++;
            }
        }
        for (; oldIndex < oldLen; oldIndex++) {
            result.push(oldLinks[oldIndex]);
        }
        for (; newIndex < newLen; newIndex++) {
            result.push(newLinks[newIndex]);
        }
        return result;
    }
}
export async function getLinks(providers, model, token) {
    const lists = [];
    // ask all providers for links in parallel
    const promises = providers
        .ordered(model)
        .reverse()
        .map(async (provider, i) => {
        try {
            const result = await provider.provideLinks(model, token);
            if (result) {
                lists[i] = [result, provider];
            }
        }
        catch (err) {
            onUnexpectedExternalError(err);
        }
    });
    await Promise.all(promises);
    let res = new LinksList(coalesce(lists));
    if (token.isCancellationRequested) {
        res.dispose();
        res = LinksList.Empty;
    }
    return res;
}
CommandsRegistry.registerCommand('_executeLinkProvider', async (accessor, ...args) => {
    let [uri, resolveCount] = args;
    assertType(uri instanceof URI);
    if (typeof resolveCount !== 'number') {
        resolveCount = 0;
    }
    const { linkProvider } = accessor.get(ILanguageFeaturesService);
    const model = accessor.get(IModelService).getModel(uri);
    if (!model) {
        return [];
    }
    const list = await getLinks(linkProvider, model, CancellationToken.None);
    if (!list) {
        return [];
    }
    // resolve links
    for (let i = 0; i < Math.min(resolveCount, list.links.length); i++) {
        await list.links[i].resolve(CancellationToken.None);
    }
    const result = list.links.slice(0);
    list.dispose();
    return result;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0TGlua3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9saW5rcy9icm93c2VyL2dldExpbmtzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRzdELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVuRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUV2RixNQUFNLE9BQU8sSUFBSTtJQUloQixZQUFZLElBQVcsRUFBRSxRQUFzQjtRQUM5QyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQTtRQUNqQixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtJQUMxQixDQUFDO0lBRUQsTUFBTTtRQUNMLE9BQU87WUFDTixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ2IsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1NBQ3JCLENBQUE7SUFDRixDQUFD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