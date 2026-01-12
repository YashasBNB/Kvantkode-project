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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0TGlua3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2xpbmtzL2Jyb3dzZXIvZ2V0TGlua3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDcEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFHN0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRW5GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRXZGLE1BQU0sT0FBTyxJQUFJO0lBSWhCLFlBQVksSUFBVyxFQUFFLFFBQXNCO1FBQzlDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFBO0lBQzFCLENBQUM7SUFFRCxNQUFNO1FBQ0wsT0FBTztZQUNOLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUc7WUFDYixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87U0FDckIsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFBO0lBQ3hCLENBQUM7SUFFRCxJQUFJLEdBQUc7UUFDTixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFBO0lBQ3RCLENBQUM7SUFFRCxJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFBO0lBQzFCLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQXdCO1FBQ3JDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNwQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFBO1FBQ3RCLENBQUM7UUFFRCxJQUFJLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDdEQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDcEYsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQTtnQkFDaEMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO29CQUNwQixVQUFVO29CQUNWLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDM0IsQ0FBQztnQkFFRCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtZQUM1QyxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sU0FBUzthQUNMLFVBQUssR0FBRyxJQUFJLFNBQVMsQ0FBQyxFQUFFLENBQUMsQUFBcEIsQ0FBb0I7SUFNekMsWUFBWSxNQUFvQztRQUYvQixpQkFBWSxHQUFnQyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBR2pGLElBQUksS0FBSyxHQUFXLEVBQUUsQ0FBQTtRQUN0QixLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksTUFBTSxFQUFFLENBQUM7WUFDdkMsa0JBQWtCO1lBQ2xCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQTtZQUNuRSxLQUFLLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDekMsdUJBQXVCO1lBQ3ZCLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxZQUFZLEtBQUssSUFBSSxlQUFlLEVBQUUsQ0FBQTtnQkFDM0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDNUIsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtJQUNuQixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFDNUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQ3RCLENBQUM7SUFFTyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQWdCLEVBQUUsUUFBZ0I7UUFDdkQsdURBQXVEO1FBQ3ZELE1BQU0sTUFBTSxHQUFXLEVBQUUsQ0FBQTtRQUN6QixJQUFJLFFBQWdCLENBQUE7UUFDcEIsSUFBSSxNQUFjLENBQUE7UUFDbEIsSUFBSSxRQUFnQixDQUFBO1FBQ3BCLElBQUksTUFBYyxDQUFBO1FBRWxCLEtBQ0MsUUFBUSxHQUFHLENBQUMsRUFBRSxRQUFRLEdBQUcsQ0FBQyxFQUFFLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxFQUM5RSxRQUFRLEdBQUcsTUFBTSxJQUFJLFFBQVEsR0FBRyxNQUFNLEdBRXJDLENBQUM7WUFDRixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDbEMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBRWxDLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ25FLHFCQUFxQjtnQkFDckIsUUFBUSxFQUFFLENBQUE7Z0JBQ1YsU0FBUTtZQUNULENBQUM7WUFFRCxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUVyRixJQUFJLGdCQUFnQixHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMxQixvQkFBb0I7Z0JBQ3BCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQ3BCLFFBQVEsRUFBRSxDQUFBO1lBQ1gsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLG9CQUFvQjtnQkFDcEIsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDcEIsUUFBUSxFQUFFLENBQUE7WUFDWCxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sUUFBUSxHQUFHLE1BQU0sRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDaEMsQ0FBQztRQUNELE9BQU8sUUFBUSxHQUFHLE1BQU0sRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDaEMsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQzs7QUFHRixNQUFNLENBQUMsS0FBSyxVQUFVLFFBQVEsQ0FDN0IsU0FBZ0QsRUFDaEQsS0FBaUIsRUFDakIsS0FBd0I7SUFFeEIsTUFBTSxLQUFLLEdBQWlDLEVBQUUsQ0FBQTtJQUU5QywwQ0FBMEM7SUFDMUMsTUFBTSxRQUFRLEdBQUcsU0FBUztTQUN4QixPQUFPLENBQUMsS0FBSyxDQUFDO1NBQ2QsT0FBTyxFQUFFO1NBQ1QsR0FBRyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDMUIsSUFBSSxDQUFDO1lBQ0osTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN4RCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUM5QixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMvQixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFSCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7SUFFM0IsSUFBSSxHQUFHLEdBQUcsSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFFeEMsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUNuQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDYixHQUFHLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQTtJQUN0QixDQUFDO0lBRUQsT0FBTyxHQUFHLENBQUE7QUFDWCxDQUFDO0FBRUQsZ0JBQWdCLENBQUMsZUFBZSxDQUMvQixzQkFBc0IsRUFDdEIsS0FBSyxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksRUFBb0IsRUFBRTtJQUM3QyxJQUFJLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxHQUFHLElBQUksQ0FBQTtJQUM5QixVQUFVLENBQUMsR0FBRyxZQUFZLEdBQUcsQ0FBQyxDQUFBO0lBRTlCLElBQUksT0FBTyxZQUFZLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDdEMsWUFBWSxHQUFHLENBQUMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsTUFBTSxFQUFFLFlBQVksRUFBRSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtJQUMvRCxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN2RCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFDRCxNQUFNLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxZQUFZLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3hFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNYLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVELGdCQUFnQjtJQUNoQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ3BFLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDcEQsQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2xDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNkLE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQyxDQUNELENBQUEifQ==