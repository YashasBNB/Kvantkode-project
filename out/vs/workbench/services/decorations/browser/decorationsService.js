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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbnNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2RlY29yYXRpb25zL2Jyb3dzZXIvZGVjb3JhdGlvbnNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDbEYsT0FBTyxFQUNOLG1CQUFtQixHQUtuQixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2hGLE9BQU8sRUFBZSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLGFBQWEsRUFDYixnQ0FBZ0MsR0FDaEMsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEtBQUssUUFBUSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFFTixp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