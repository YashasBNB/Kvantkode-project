/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { importAMDNodeModule } from '../../../amdX.js';
export const EDITOR_EXPERIMENTAL_PREFER_TREESITTER = 'editor.experimental.preferTreeSitter';
export const TREESITTER_ALLOWED_SUPPORT = ['css', 'typescript', 'ini', 'regex'];
export const ITreeSitterParserService = createDecorator('treeSitterParserService');
export const ITreeSitterImporter = createDecorator('treeSitterImporter');
export class TreeSitterImporter {
    constructor() { }
    async _getTreeSitterImport() {
        if (!this._treeSitterImport) {
            this._treeSitterImport = await importAMDNodeModule('@vscode/tree-sitter-wasm', 'wasm/tree-sitter.js');
        }
        return this._treeSitterImport;
    }
    get parserClass() {
        return this._parserClass;
    }
    async getParserClass() {
        if (!this._parserClass) {
            this._parserClass = (await this._getTreeSitterImport()).Parser;
        }
        return this._parserClass;
    }
    async getLanguageClass() {
        if (!this._languageClass) {
            this._languageClass = (await this._getTreeSitterImport()).Language;
        }
        return this._languageClass;
    }
    async getQueryClass() {
        if (!this._queryClass) {
            this._queryClass = (await this._getTreeSitterImport()).Query;
        }
        return this._queryClass;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclBhcnNlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL3RyZWVTaXR0ZXJQYXJzZXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUV6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUd0RCxNQUFNLENBQUMsTUFBTSxxQ0FBcUMsR0FBRyxzQ0FBc0MsQ0FBQTtBQUMzRixNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxDQUFDLEtBQUssRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0FBRS9FLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUNwQyxlQUFlLENBQTJCLHlCQUF5QixDQUFDLENBQUE7QUF1RXJFLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQTtBQVU3RixNQUFNLE9BQU8sa0JBQWtCO0lBSTlCLGdCQUFlLENBQUM7SUFFUixLQUFLLENBQUMsb0JBQW9CO1FBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsTUFBTSxtQkFBbUIsQ0FDakQsMEJBQTBCLEVBQzFCLHFCQUFxQixDQUNyQixDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO0lBQzlCLENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUE7SUFDekIsQ0FBQztJQUdNLEtBQUssQ0FBQyxjQUFjO1FBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFDL0QsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN6QixDQUFDO0lBR00sS0FBSyxDQUFDLGdCQUFnQjtRQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFBO1FBQ25FLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztJQUdNLEtBQUssQ0FBQyxhQUFhO1FBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUE7UUFDN0QsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUN4QixDQUFDO0NBQ0QifQ==