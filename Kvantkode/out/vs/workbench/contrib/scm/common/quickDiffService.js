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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tEaWZmU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2NvbW1vbi9xdWlja0RpZmZTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUU1RixTQUFTLHNCQUFzQixDQUFDLEdBQVE7SUFDdkMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNmLElBQUksQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM3QixPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ1YsQ0FBQzthQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNwQyxPQUFPLENBQUMsQ0FBQTtRQUNULENBQUM7YUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNyQyxPQUFPLENBQUMsQ0FBQTtRQUNULENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxPQUFRLENBQUMsQ0FBQTtRQUNsRCxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUMs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