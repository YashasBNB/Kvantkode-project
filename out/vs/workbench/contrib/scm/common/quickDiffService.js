/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isEqualOrParent } from '../../../../base/common/resources.js';
import { score } from '../../../../editor/common/languageSelector.js';
import { Emitter } from '../../../../base/common/event.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
function createProviderComparer(uri) {
    return (a, b) => {
        if (a.rootUri && !b.rootUri) {
            return -1;
        }
        else if (!a.rootUri && b.rootUri) {
            return 1;
        }
        else if (!a.rootUri && !b.rootUri) {
            return 0;
        }
        const aIsParent = isEqualOrParent(uri, a.rootUri);
        const bIsParent = isEqualOrParent(uri, b.rootUri);
        if (aIsParent && bIsParent) {
            return a.rootUri.fsPath.length - b.rootUri.fsPath.length;
        }
        else if (aIsParent) {
            return -1;
        }
        else if (bIsParent) {
            return 1;
        }
        else {
            return 0;
        }
    };
}
let QuickDiffService = class QuickDiffService extends Disposable {
    constructor(uriIdentityService) {
        super();
        this.uriIdentityService = uriIdentityService;
        this.quickDiffProviders = new Set();
        this._onDidChangeQuickDiffProviders = this._register(new Emitter());
        this.onDidChangeQuickDiffProviders = this._onDidChangeQuickDiffProviders.event;
    }
    addQuickDiffProvider(quickDiff) {
        this.quickDiffProviders.add(quickDiff);
        this._onDidChangeQuickDiffProviders.fire();
        return {
            dispose: () => {
                this.quickDiffProviders.delete(quickDiff);
                this._onDidChangeQuickDiffProviders.fire();
            },
        };
    }
    isQuickDiff(diff) {
        return (!!diff.originalResource && typeof diff.label === 'string' && typeof diff.isSCM === 'boolean');
    }
    async getQuickDiffs(uri, language = '', isSynchronized = false) {
        const providers = Array.from(this.quickDiffProviders)
            .filter((provider) => !provider.rootUri ||
            this.uriIdentityService.extUri.isEqualOrParent(uri, provider.rootUri))
            .sort(createProviderComparer(uri));
        const diffs = await Promise.all(providers.map(async (provider) => {
            const scoreValue = provider.selector
                ? score(provider.selector, uri, language, isSynchronized, undefined, undefined)
                : 10;
            const diff = {
                originalResource: scoreValue > 0 ? ((await provider.getOriginalResource(uri)) ?? undefined) : undefined,
                label: provider.label,
                isSCM: provider.isSCM,
                visible: provider.visible,
            };
            return diff;
        }));
        return diffs.filter(this.isQuickDiff);
    }
};
QuickDiffService = __decorate([
    __param(0, IUriIdentityService)
], QuickDiffService);
export { QuickDiffService };
export async function getOriginalResource(quickDiffService, uri, language, isSynchronized) {
    const quickDiffs = await quickDiffService.getQuickDiffs(uri, language, isSynchronized);
    return quickDiffs.length > 0 ? quickDiffs[0].originalResource : null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tEaWZmU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NjbS9jb21tb24vcXVpY2tEaWZmU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFFOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFNUYsU0FBUyxzQkFBc0IsQ0FBQyxHQUFRO0lBQ3ZDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDZixJQUFJLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDN0IsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNWLENBQUM7YUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDcEMsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDO2FBQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDckMsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsT0FBUSxDQUFDLENBQUE7UUFDbEQsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMs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