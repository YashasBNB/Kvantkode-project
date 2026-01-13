/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { escapeRegExpCharacters } from '../../../../../base/common/strings.js';
import { BracketAstNode } from './ast.js';
import { toLength } from './length.js';
import { identityKeyProvider, SmallImmutableSet } from './smallImmutableSet.js';
import { Token } from './tokenizer.js';
export class BracketTokens {
    static createFromLanguage(configuration, denseKeyProvider) {
        function getId(bracketInfo) {
            return denseKeyProvider.getKey(`${bracketInfo.languageId}:::${bracketInfo.bracketText}`);
        }
        const map = new Map();
        for (const openingBracket of configuration.bracketsNew.openingBrackets) {
            const length = toLength(0, openingBracket.bracketText.length);
            const openingTextId = getId(openingBracket);
            const bracketIds = SmallImmutableSet.getEmpty().add(openingTextId, identityKeyProvider);
            map.set(openingBracket.bracketText, new Token(length, 1 /* TokenKind.OpeningBracket */, openingTextId, bracketIds, BracketAstNode.create(length, openingBracket, bracketIds)));
        }
        for (const closingBracket of configuration.bracketsNew.closingBrackets) {
            const length = toLength(0, closingBracket.bracketText.length);
            let bracketIds = SmallImmutableSet.getEmpty();
            const closingBrackets = closingBracket.getOpeningBrackets();
            for (const bracket of closingBrackets) {
                bracketIds = bracketIds.add(getId(bracket), identityKeyProvider);
            }
            map.set(closingBracket.bracketText, new Token(length, 2 /* TokenKind.ClosingBracket */, getId(closingBrackets[0]), bracketIds, BracketAstNode.create(length, closingBracket, bracketIds)));
        }
        return new BracketTokens(map);
    }
    constructor(map) {
        this.map = map;
        this.hasRegExp = false;
        this._regExpGlobal = null;
    }
    getRegExpStr() {
        if (this.isEmpty) {
            return null;
        }
        else {
            const keys = [...this.map.keys()];
            keys.sort();
            keys.reverse();
            return keys.map((k) => prepareBracketForRegExp(k)).join('|');
        }
    }
    /**
     * Returns null if there is no such regexp (because there are no brackets).
     */
    get regExpGlobal() {
        if (!this.hasRegExp) {
            const regExpStr = this.getRegExpStr();
            this._regExpGlobal = regExpStr ? new RegExp(regExpStr, 'gi') : null;
            this.hasRegExp = true;
        }
        return this._regExpGlobal;
    }
    getToken(value) {
        return this.map.get(value.toLowerCase());
    }
    findClosingTokenText(openingBracketIds) {
        for (const [closingText, info] of this.map) {
            if (info.kind === 2 /* TokenKind.ClosingBracket */ && info.bracketIds.intersects(openingBracketIds)) {
                return closingText;
            }
        }
        return undefined;
    }
    get isEmpty() {
        return this.map.size === 0;
    }
}
function prepareBracketForRegExp(str) {
    let escaped = escapeRegExpCharacters(str);
    // These bracket pair delimiters start or end with letters
    // see https://github.com/microsoft/vscode/issues/132162 https://github.com/microsoft/vscode/issues/150440
    if (/^[\w ]+/.test(str)) {
        escaped = `\\b${escaped}`;
    }
    if (/[\w ]+$/.test(str)) {
        escaped = `${escaped}\\b`;
    }
    return escaped;
}
export class LanguageAgnosticBracketTokens {
    constructor(denseKeyProvider, getLanguageConfiguration) {
        this.denseKeyProvider = denseKeyProvider;
        this.getLanguageConfiguration = getLanguageConfiguration;
        this.languageIdToBracketTokens = new Map();
    }
    didLanguageChange(languageId) {
        // Report a change whenever the language configuration updates.
        return this.languageIdToBracketTokens.has(languageId);
    }
    getSingleLanguageBracketTokens(languageId) {
        let singleLanguageBracketTokens = this.languageIdToBracketTokens.get(languageId);
        if (!singleLanguageBracketTokens) {
            singleLanguageBracketTokens = BracketTokens.createFromLanguage(this.getLanguageConfiguration(languageId), this.denseKeyProvider);
            this.languageIdToBracketTokens.set(languageId, singleLanguageBracketTokens);
        }
        return singleLanguageBracketTokens;
    }
    getToken(value, languageId) {
        const singleLanguageBracketTokens = this.getSingleLanguageBracketTokens(languageId);
        return singleLanguageBracketTokens.getToken(value);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJzVGV4dE1vZGVsUGFydC9icmFja2V0UGFpcnNUcmVlL2JyYWNrZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFDekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUN0QyxPQUFPLEVBQW9CLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDakcsT0FBTyxFQUFvQixLQUFLLEVBQWEsTUFBTSxnQkFBZ0IsQ0FBQTtBQUVuRSxNQUFNLE9BQU8sYUFBYTtJQUN6QixNQUFNLENBQUMsa0JBQWtCLENBQ3hCLGFBQTRDLEVBQzVDLGdCQUEwQztRQUUxQyxTQUFTLEtBQUssQ0FBQyxXQUF3QjtZQUN0QyxPQUFPLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxVQUFVLE1BQU0sV0FBVyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7UUFDekYsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUFpQixDQUFBO1FBQ3BDLEtBQUssTUFBTSxjQUFjLElBQUksYUFBYSxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN4RSxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDN0QsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQzNDLE1BQU0sVUFBVSxHQUFHLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtZQUN2RixHQUFHLENBQUMsR0FBRyxDQUNOLGNBQWMsQ0FBQyxXQUFXLEVBQzFCLElBQUksS0FBSyxDQUNSLE1BQU0sb0NBRU4sYUFBYSxFQUNiLFVBQVUsRUFDVixjQUFjLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQ3pELENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFFRCxLQUFLLE1BQU0sY0FBYyxJQUFJLGFBQWEsQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDeEUsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzdELElBQUksVUFBVSxHQUFHLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQzdDLE1BQU0sZUFBZSxHQUFHLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO1lBQzNELEtBQUssTUFBTSxPQUFPLElBQUksZUFBZSxFQUFFLENBQUM7Z0JBQ3ZDLFVBQVUsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1lBQ2pFLENBQUM7WUFDRCxHQUFHLENBQUMsR0FBRyxDQUNOLGNBQWMsQ0FBQyxXQUFXLEVBQzFCLElBQUksS0FBSyxDQUNSLE1BQU0sb0NBRU4sS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUN6QixVQUFVLEVBQ1YsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUN6RCxDQUNELENBQUE7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBS0QsWUFBNkIsR0FBdUI7UUFBdkIsUUFBRyxHQUFILEdBQUcsQ0FBb0I7UUFINUMsY0FBUyxHQUFHLEtBQUssQ0FBQTtRQUNqQixrQkFBYSxHQUFrQixJQUFJLENBQUE7SUFFWSxDQUFDO0lBRXhELFlBQVk7UUFDWCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUNqQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDWCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDZCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzdELENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFJLFlBQVk7UUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtZQUNyQyxJQUFJLENBQUMsYUFBYSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7WUFDbkUsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7UUFDdEIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBRUQsUUFBUSxDQUFDLEtBQWE7UUFDckIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBRUQsb0JBQW9CLENBQUMsaUJBQXNEO1FBQzFFLEtBQUssTUFBTSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDNUMsSUFBSSxJQUFJLENBQUMsSUFBSSxxQ0FBNkIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7Z0JBQzdGLE9BQU8sV0FBVyxDQUFBO1lBQ25CLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFBO0lBQzNCLENBQUM7Q0FDRDtBQUVELFNBQVMsdUJBQXVCLENBQUMsR0FBVztJQUMzQyxJQUFJLE9BQU8sR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN6QywwREFBMEQ7SUFDMUQsMEdBQTBHO0lBQzFHLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sR0FBRyxNQUFNLE9BQU8sRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFDRCxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN6QixPQUFPLEdBQUcsR0FBRyxPQUFPLEtBQUssQ0FBQTtJQUMxQixDQUFDO0lBQ0QsT0FBTyxPQUFPLENBQUE7QUFDZixDQUFDO0FBRUQsTUFBTSxPQUFPLDZCQUE2QjtJQUd6QyxZQUNrQixnQkFBMEMsRUFDMUMsd0JBRWlCO1FBSGpCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBMEI7UUFDMUMsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUVQO1FBTmxCLDhCQUF5QixHQUFHLElBQUksR0FBRyxFQUF5QixDQUFBO0lBTzFFLENBQUM7SUFFRyxpQkFBaUIsQ0FBQyxVQUFrQjtRQUMxQywrREFBK0Q7UUFDL0QsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ3RELENBQUM7SUFFRCw4QkFBOEIsQ0FBQyxVQUFrQjtRQUNoRCxJQUFJLDJCQUEyQixHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDaEYsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUM7WUFDbEMsMkJBQTJCLEdBQUcsYUFBYSxDQUFDLGtCQUFrQixDQUM3RCxJQUFJLENBQUMsd0JBQXdCLENBQUMsVUFBVSxDQUFDLEVBQ3pDLElBQUksQ0FBQyxnQkFBZ0IsQ0FDckIsQ0FBQTtZQUNELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLDJCQUEyQixDQUFDLENBQUE7UUFDNUUsQ0FBQztRQUNELE9BQU8sMkJBQTJCLENBQUE7SUFDbkMsQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUFhLEVBQUUsVUFBa0I7UUFDekMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsOEJBQThCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDbkYsT0FBTywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDbkQsQ0FBQztDQUNEIn0=