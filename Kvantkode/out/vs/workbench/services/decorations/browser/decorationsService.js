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
import { Emitter, DebounceEmitter } from '../../../../base/common/event.js';
import { IDecorationsService, } from '../common/decorations.js';
import { TernarySearchTree } from '../../../../base/common/ternarySearchTree.js';
import { toDisposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { isThenable } from '../../../../base/common/async.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { createStyleSheet, createCSSRule, removeCSSRulesContainingSelector, } from '../../../../base/browser/domStylesheets.js';
import * as cssValue from '../../../../base/browser/cssValue.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { localize } from '../../../../nls.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { hash } from '../../../../base/common/hash.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { asArray, distinct } from '../../../../base/common/arrays.js';
import { asCssVariable } from '../../../../platform/theme/common/colorRegistry.js';
import { getIconRegistry } from '../../../../platform/theme/common/iconRegistry.js';
class DecorationRule {
    static keyOf(data) {
        if (Array.isArray(data)) {
            return data.map(DecorationRule.keyOf).join(',');
        }
        else {
            const { color, letter } = data;
            if (ThemeIcon.isThemeIcon(letter)) {
                return `${color}+${letter.id}`;
            }
            else {
                return `${color}/${letter}`;
            }
        }
    }
    static { this._classNamesPrefix = 'monaco-decoration'; }
    constructor(themeService, data, key) {
        this.themeService = themeService;
        this._refCounter = 0;
        this.data = data;
        const suffix = hash(key).toString(36);
        this.itemColorClassName = `${DecorationRule._classNamesPrefix}-itemColor-${suffix}`;
        this.itemBadgeClassName = `${DecorationRule._classNamesPrefix}-itemBadge-${suffix}`;
        this.bubbleBadgeClassName = `${DecorationRule._classNamesPrefix}-bubbleBadge-${suffix}`;
        this.iconBadgeClassName = `${DecorationRule._classNamesPrefix}-iconBadge-${suffix}`;
    }
    acquire() {
        this._refCounter += 1;
    }
    release() {
        return --this._refCounter === 0;
    }
    appendCSSRules(element) {
        if (!Array.isArray(this.data)) {
            this._appendForOne(this.data, element);
        }
        else {
            this._appendForMany(this.data, element);
        }
    }
    _appendForOne(data, element) {
        const { color, letter } = data;
        // label
        createCSSRule(`.${this.itemColorClassName}`, `color: ${getColor(color)};`, element);
        if (ThemeIcon.isThemeIcon(letter)) {
            this._createIconCSSRule(letter, color, element);
        }
        else if (letter) {
            createCSSRule(`.${this.itemBadgeClassName}::after`, `content: "${letter}"; color: ${getColor(color)};`, element);
        }
    }
    _appendForMany(data, element) {
        // label
        const { color } = data.find((d) => !!d.color) ?? data[0];
        createCSSRule(`.${this.itemColorClassName}`, `color: ${getColor(color)};`, element);
        // badge or icon
        const letters = [];
        let icon;
        for (const d of data) {
            if (ThemeIcon.isThemeIcon(d.letter)) {
                icon = d.letter;
                break;
            }
            else if (d.letter) {
                letters.push(d.letter);
            }
        }
        if (icon) {
            this._createIconCSSRule(icon, color, element);
        }
        else {
            if (letters.length) {
                createCSSRule(`.${this.itemBadgeClassName}::after`, `content: "${letters.join(', ')}"; color: ${getColor(color)};`, element);
            }
            // bubble badge
            // TODO @misolori update bubble badge to adopt letter: ThemeIcon instead of unicode
            createCSSRule(`.${this.bubbleBadgeClassName}::after`, `content: "\uea71"; color: ${getColor(color)}; font-family: codicon; font-size: 14px; margin-right: 14px; opacity: 0.4;`, element);
        }
    }
    _createIconCSSRule(icon, color, element) {
        const modifier = ThemeIcon.getModifier(icon);
        if (modifier) {
            icon = ThemeIcon.modify(icon, undefined);
        }
        const iconContribution = getIconRegistry().getIcon(icon.id);
        if (!iconContribution) {
            return;
        }
        const definition = this.themeService.getProductIconTheme().getIcon(iconContribution);
        if (!definition) {
            return;
        }
        createCSSRule(`.${this.iconBadgeClassName}::after`, `content: '${definition.fontCharacter}';
			color: ${icon.color ? getColor(icon.color.id) : getColor(color)};
			font-family: ${cssValue.stringValue(definition.font?.id ?? 'codicon')};
			font-size: 16px;
			margin-right: 14px;
			font-weight: normal;
			${modifier === 'spin' ? 'animation: codicon-spin 1.5s steps(30) infinite; font-style: normal !important;' : ''};
			`, element);
    }
    removeCSSRules(element) {
        removeCSSRulesContainingSelector(this.itemColorClassName, element);
        removeCSSRulesContainingSelector(this.itemBadgeClassName, element);
        removeCSSRulesContainingSelector(this.bubbleBadgeClassName, element);
        removeCSSRulesContainingSelector(this.iconBadgeClassName, element);
    }
}
class DecorationStyles {
    constructor(_themeService) {
        this._themeService = _themeService;
        this._dispoables = new DisposableStore();
        this._styleElement = createStyleSheet(undefined, undefined, this._dispoables);
        this._decorationRules = new Map();
    }
    dispose() {
        this._dispoables.dispose();
    }
    asDecoration(data, onlyChildren) {
        // sort by weight
        data.sort((a, b) => (b.weight || 0) - (a.weight || 0));
        const key = DecorationRule.keyOf(data);
        let rule = this._decorationRules.get(key);
        if (!rule) {
            // new css rule
            rule = new DecorationRule(this._themeService, data, key);
            this._decorationRules.set(key, rule);
            rule.appendCSSRules(this._styleElement);
        }
        rule.acquire();
        const labelClassName = rule.itemColorClassName;
        let badgeClassName = rule.itemBadgeClassName;
        const iconClassName = rule.iconBadgeClassName;
        let tooltip = distinct(data.filter((d) => !isFalsyOrWhitespace(d.tooltip)).map((d) => d.tooltip)).join(' • ');
        const strikethrough = data.some((d) => d.strikethrough);
        if (onlyChildren) {
            // show items from its children only
            badgeClassName = rule.bubbleBadgeClassName;
            tooltip = localize('bubbleTitle', 'Contains emphasized items');
        }
        return {
            labelClassName,
            badgeClassName,
            iconClassName,
            strikethrough,
            tooltip,
            dispose: () => {
                if (rule?.release()) {
                    this._decorationRules.delete(key);
                    rule.removeCSSRules(this._styleElement);
                    rule = undefined;
                }
            },
        };
    }
}
class FileDecorationChangeEvent {
    constructor(all) {
        this._data = TernarySearchTree.forUris((_uri) => true); // events ignore all path casings
        this._data.fill(true, asArray(all));
    }
    affectsResource(uri) {
        return this._data.hasElementOrSubtree(uri);
    }
}
class DecorationDataRequest {
    constructor(source, thenable) {
        this.source = source;
        this.thenable = thenable;
    }
}
function getColor(color) {
    return color ? asCssVariable(color) : 'inherit';
}
let DecorationsService = class DecorationsService {
    constructor(uriIdentityService, themeService) {
        this._store = new DisposableStore();
        this._onDidChangeDecorationsDelayed = this._store.add(new DebounceEmitter({ merge: (all) => all.flat() }));
        this._onDidChangeDecorations = this._store.add(new Emitter());
        this.onDidChangeDecorations = this._onDidChangeDecorations.event;
        this._provider = new LinkedList();
        this._decorationStyles = new DecorationStyles(themeService);
        this._data = TernarySearchTree.forUris((key) => uriIdentityService.extUri.ignorePathCasing(key));
        this._store.add(this._onDidChangeDecorationsDelayed.event((event) => {
            this._onDidChangeDecorations.fire(new FileDecorationChangeEvent(event));
        }));
    }
    dispose() {
        this._store.dispose();
        this._data.clear();
    }
    registerDecorationsProvider(provider) {
        const rm = this._provider.unshift(provider);
        this._onDidChangeDecorations.fire({
            // everything might have changed
            affectsResource() {
                return true;
            },
        });
        // remove everything what came from this provider
        const removeAll = () => {
            const uris = [];
            for (const [uri, map] of this._data) {
                if (map.delete(provider)) {
                    uris.push(uri);
                }
            }
            if (uris.length > 0) {
                this._onDidChangeDecorationsDelayed.fire(uris);
            }
        };
        const listener = provider.onDidChange((uris) => {
            if (!uris) {
                // flush event -> drop all data, can affect everything
                removeAll();
            }
            else {
                // selective changes -> drop for resource, fetch again, send event
                for (const uri of uris) {
                    const map = this._ensureEntry(uri);
                    this._fetchData(map, uri, provider);
                }
            }
        });
        return toDisposable(() => {
            rm();
            listener.dispose();
            removeAll();
        });
    }
    _ensureEntry(uri) {
        let map = this._data.get(uri);
        if (!map) {
            // nothing known about this uri
            map = new Map();
            this._data.set(uri, map);
        }
        return map;
    }
    getDecoration(uri, includeChildren) {
        const all = [];
        let containsChildren = false;
        const map = this._ensureEntry(uri);
        for (const provider of this._provider) {
            let data = map.get(provider);
            if (data === undefined) {
                // sets data if fetch is sync
                data = this._fetchData(map, uri, provider);
            }
            if (data && !(data instanceof DecorationDataRequest)) {
                // having data
                all.push(data);
            }
        }
        if (includeChildren) {
            // (resolved) children
            const iter = this._data.findSuperstr(uri);
            if (iter) {
                for (const tuple of iter) {
                    for (const data of tuple[1].values()) {
                        if (data && !(data instanceof DecorationDataRequest)) {
                            if (data.bubble) {
                                all.push(data);
                                containsChildren = true;
                            }
                        }
                    }
                }
            }
        }
        return all.length === 0 ? undefined : this._decorationStyles.asDecoration(all, containsChildren);
    }
    _fetchData(map, uri, provider) {
        // check for pending request and cancel it
        const pendingRequest = map.get(provider);
        if (pendingRequest instanceof DecorationDataRequest) {
            pendingRequest.source.cancel();
            map.delete(provider);
        }
        const cts = new CancellationTokenSource();
        const dataOrThenable = provider.provideDecorations(uri, cts.token);
        if (!isThenable(dataOrThenable)) {
            // sync -> we have a result now
            cts.dispose();
            return this._keepItem(map, provider, uri, dataOrThenable);
        }
        else {
            // async -> we have a result soon
            const request = new DecorationDataRequest(cts, Promise.resolve(dataOrThenable)
                .then((data) => {
                if (map.get(provider) === request) {
                    this._keepItem(map, provider, uri, data);
                }
            })
                .catch((err) => {
                if (!isCancellationError(err) && map.get(provider) === request) {
                    map.delete(provider);
                }
            })
                .finally(() => {
                cts.dispose();
            }));
            map.set(provider, request);
            return null;
        }
    }
    _keepItem(map, provider, uri, data) {
        const deco = data ? data : null;
        const old = map.get(provider);
        map.set(provider, deco);
        if (deco || old) {
            // only fire event when something changed
            this._onDidChangeDecorationsDelayed.fire(uri);
        }
        return deco;
    }
};
DecorationsService = __decorate([
    __param(0, IUriIdentityService),
    __param(1, IThemeService)
], DecorationsService);
export { DecorationsService };
registerSingleton(IDecorationsService, DecorationsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbnNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZGVjb3JhdGlvbnMvYnJvd3Nlci9kZWNvcmF0aW9uc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRixPQUFPLEVBQ04sbUJBQW1CLEdBS25CLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDaEYsT0FBTyxFQUFlLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xFLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsYUFBYSxFQUNiLGdDQUFnQyxHQUNoQyxNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sS0FBSyxRQUFRLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxF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