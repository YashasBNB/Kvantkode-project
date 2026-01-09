/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as resources from '../../../../base/common/resources.js';
export class TMScopeRegistry {
    constructor() {
        this._scopeNameToLanguageRegistration = Object.create(null);
    }
    reset() {
        this._scopeNameToLanguageRegistration = Object.create(null);
    }
    register(def) {
        if (this._scopeNameToLanguageRegistration[def.scopeName]) {
            const existingRegistration = this._scopeNameToLanguageRegistration[def.scopeName];
            if (!resources.isEqual(existingRegistration.location, def.location)) {
                console.warn(`Overwriting grammar scope name to file mapping for scope ${def.scopeName}.\n` +
                    `Old grammar file: ${existingRegistration.location.toString()}.\n` +
                    `New grammar file: ${def.location.toString()}`);
            }
        }
        this._scopeNameToLanguageRegistration[def.scopeName] = def;
    }
    getGrammarDefinition(scopeName) {
        return this._scopeNameToLanguageRegistration[scopeName] || null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVE1TY29wZVJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dE1hdGUvY29tbW9uL1RNU2NvcGVSZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssU0FBUyxNQUFNLHNDQUFzQyxDQUFBO0FBd0JqRSxNQUFNLE9BQU8sZUFBZTtJQUczQjtRQUNDLElBQUksQ0FBQyxnQ0FBZ0MsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzVELENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxDQUFDLGdDQUFnQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVNLFFBQVEsQ0FBQyxHQUE0QjtRQUMzQyxJQUFJLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUMxRCxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDakYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUNyRSxPQUFPLENBQUMsSUFBSSxDQUNYLDREQUE0RCxHQUFHLENBQUMsU0FBUyxLQUFLO29CQUM3RSxxQkFBcUIsb0JBQW9CLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxLQUFLO29CQUNsRSxxQkFBcUIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUMvQyxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsZ0NBQWdDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsQ0FBQTtJQUMzRCxDQUFDO0lBRU0sb0JBQW9CLENBQUMsU0FBaUI7UUFDNUMsT0FBTyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFBO0lBQ2hFLENBQUM7Q0FDRCJ9