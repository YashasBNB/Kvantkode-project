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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclBhcnNlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvdHJlZVNpdHRlclBhcnNlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRXpGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBR3RELE1BQU0sQ0FBQyxNQUFNLHFDQUFxQyxHQUFHLHNDQUFzQyxDQUFBO0FBQzNGLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7QUFFL0UsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQ3BDLGVBQWUsQ0FBMkIseUJBQXlCLENBQUMsQ0FBQTtBQXVFckUsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZUFBZSxDQUFzQixvQkFBb0IsQ0FBQyxDQUFBO0FBVTdGLE1BQU0sT0FBTyxrQkFBa0I7SUFJOUIsZ0JBQWUsQ0FBQztJQUVSLEtBQUssQ0FBQyxvQkFBb0I7UUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxNQUFNLG1CQUFtQixDQUNqRCwwQkFBMEIsRUFDMUIscUJBQXFCLENBQ3JCLENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUE7SUFDOUIsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN6QixDQUFDO0lBR00sS0FBSyxDQUFDLGNBQWM7UUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUMvRCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQ3pCLENBQUM7SUFHTSxLQUFLLENBQUMsZ0JBQWdCO1FBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUE7UUFDbkUsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUMzQixDQUFDO0lBR00sS0FBSyxDQUFDLGFBQWE7UUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQTtRQUM3RCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFBO0lBQ3hCLENBQUM7Q0FDRCJ9