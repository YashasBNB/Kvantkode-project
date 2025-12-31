/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function findMatchingThemeRule(theme, scopes, onlyColorRules = true) {
    for (let i = scopes.length - 1; i >= 0; i--) {
        const parentScopes = scopes.slice(0, i);
        const scope = scopes[i];
        const r = findMatchingThemeRule2(theme, scope, parentScopes, onlyColorRules);
        if (r) {
            return r;
        }
    }
    return null;
}
function findMatchingThemeRule2(theme, scope, parentScopes, onlyColorRules) {
    let result = null;
    // Loop backwards, to ensure the last most specific rule wins
    for (let i = theme.tokenColors.length - 1; i >= 0; i--) {
        const rule = theme.tokenColors[i];
        if (onlyColorRules && !rule.settings.foreground) {
            continue;
        }
        let selectors;
        if (typeof rule.scope === 'string') {
            selectors = rule.scope.split(/,/).map((scope) => scope.trim());
        }
        else if (Array.isArray(rule.scope)) {
            selectors = rule.scope;
        }
        else {
            continue;
        }
        for (let j = 0, lenJ = selectors.length; j < lenJ; j++) {
            const rawSelector = selectors[j];
            const themeRule = new ThemeRule(rawSelector, rule.settings);
            if (themeRule.matches(scope, parentScopes)) {
                if (themeRule.isMoreSpecific(result)) {
                    result = themeRule;
                }
            }
        }
    }
    return result;
}
export class ThemeRule {
    constructor(rawSelector, settings) {
        this.rawSelector = rawSelector;
        this.settings = settings;
        const rawSelectorPieces = this.rawSelector.split(/ /);
        this.scope = rawSelectorPieces[rawSelectorPieces.length - 1];
        this.parentScopes = rawSelectorPieces.slice(0, rawSelectorPieces.length - 1);
    }
    matches(scope, parentScopes) {
        return ThemeRule._matches(this.scope, this.parentScopes, scope, parentScopes);
    }
    static _cmp(a, b) {
        if (a === null && b === null) {
            return 0;
        }
        if (a === null) {
            // b > a
            return -1;
        }
        if (b === null) {
            // a > b
            return 1;
        }
        if (a.scope.length !== b.scope.length) {
            // longer scope length > shorter scope length
            return a.scope.length - b.scope.length;
        }
        const aParentScopesLen = a.parentScopes.length;
        const bParentScopesLen = b.parentScopes.length;
        if (aParentScopesLen !== bParentScopesLen) {
            // more parents > less parents
            return aParentScopesLen - bParentScopesLen;
        }
        for (let i = 0; i < aParentScopesLen; i++) {
            const aLen = a.parentScopes[i].length;
            const bLen = b.parentScopes[i].length;
            if (aLen !== bLen) {
                return aLen - bLen;
            }
        }
        return 0;
    }
    isMoreSpecific(other) {
        return ThemeRule._cmp(this, other) > 0;
    }
    static _matchesOne(selectorScope, scope) {
        const selectorPrefix = selectorScope + '.';
        if (selectorScope === scope || scope.substring(0, selectorPrefix.length) === selectorPrefix) {
            return true;
        }
        return false;
    }
    static _matches(selectorScope, selectorParentScopes, scope, parentScopes) {
        if (!this._matchesOne(selectorScope, scope)) {
            return false;
        }
        let selectorParentIndex = selectorParentScopes.length - 1;
        let parentIndex = parentScopes.length - 1;
        while (selectorParentIndex >= 0 && parentIndex >= 0) {
            if (this._matchesOne(selectorParentScopes[selectorParentIndex], parentScopes[parentIndex])) {
                selectorParentIndex--;
            }
            parentIndex--;
        }
        if (selectorParentIndex === -1) {
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVE1IZWxwZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dE1hdGUvY29tbW9uL1RNSGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBa0JoRyxNQUFNLFVBQVUscUJBQXFCLENBQ3BDLEtBQWtCLEVBQ2xCLE1BQWdCLEVBQ2hCLGlCQUEwQixJQUFJO0lBRTlCLEtBQUssSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzdDLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2QixNQUFNLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUM1RSxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ1AsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQztBQUVELFNBQVMsc0JBQXNCLENBQzlCLEtBQWtCLEVBQ2xCLEtBQWEsRUFDYixZQUFzQixFQUN0QixjQUF1QjtJQUV2QixJQUFJLE1BQU0sR0FBcUIsSUFBSSxDQUFBO0lBRW5DLDZEQUE2RDtJQUM3RCxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDeEQsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxD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