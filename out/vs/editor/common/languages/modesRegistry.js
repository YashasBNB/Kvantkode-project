/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import { Emitter } from '../../../base/common/event.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { Mimes } from '../../../base/common/mime.js';
import { Extensions as ConfigurationExtensions, } from '../../../platform/configuration/common/configurationRegistry.js';
// Define extension point ids
export const Extensions = {
    ModesRegistry: 'editor.modesRegistry',
};
export class EditorModesRegistry {
    constructor() {
        this._onDidChangeLanguages = new Emitter();
        this.onDidChangeLanguages = this._onDidChangeLanguages.event;
        this._languages = [];
    }
    registerLanguage(def) {
        this._languages.push(def);
        this._onDidChangeLanguages.fire(undefined);
        return {
            dispose: () => {
                for (let i = 0, len = this._languages.length; i < len; i++) {
                    if (this._languages[i] === def) {
                        this._languages.splice(i, 1);
                        return;
                    }
                }
            },
        };
    }
    getLanguages() {
        return this._languages;
    }
}
export const ModesRegistry = new EditorModesRegistry();
Registry.add(Extensions.ModesRegistry, ModesRegistry);
export const PLAINTEXT_LANGUAGE_ID = 'plaintext';
export const PLAINTEXT_EXTENSION = '.txt';
ModesRegistry.registerLanguage({
    id: PLAINTEXT_LANGUAGE_ID,
    extensions: [PLAINTEXT_EXTENSION],
    aliases: [nls.localize('plainText.alias', 'Plain Text'), 'text'],
    mimetypes: [Mimes.text],
});
Registry.as(ConfigurationExtensions.Configuration).registerDefaultConfigurations([
    {
        overrides: {
            '[plaintext]': {
                'editor.unicodeHighlight.ambiguousCharacters': false,
                'editor.unicodeHighlight.invisibleCharacters': false,
            },
            // TODO: Below is a workaround for: https://github.com/microsoft/vscode/issues/240567
            '[go]': {
                'editor.insertSpaces': false,
            },
            '[makefile]': {
                'editor.insertSpaces': false,
            },
            '[shellscript]': {
                'files.eol': '\n',
            },
            '[yaml]': {
                'editor.insertSpaces': true,
                'editor.tabSize': 2,
            },
        },
    },
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZXNSZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL21vZGVzUmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFFOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNwRCxPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixHQUNyQyxNQUFNLGlFQUFpRSxDQUFBO0FBRXhFLDZCQUE2QjtBQUM3QixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUc7SUFDekIsYUFBYSxFQUFFLHNCQUFzQjtDQUNyQyxDQUFBO0FBRUQsTUFBTSxPQUFPLG1CQUFtQjtJQU0vQjtRQUhpQiwwQkFBcUIsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO1FBQzVDLHlCQUFvQixHQUFnQixJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFBO1FBR25GLElBQUksQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFBO0lBQ3JCLENBQUM7SUFFTSxnQkFBZ0IsQ0FBQyxHQUE0QjtRQUNuRCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN6QixJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzFDLE9BQU87WUFDTixPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUNiLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQzVELElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQzt3QkFDaEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO3dCQUM1QixPQUFNO29CQUNQLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVNLFlBQVk7UUFDbEIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUE7QUFDdEQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFBO0FBRXJELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLFdBQVcsQ0FBQTtBQUNoRCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLENBQUE7QUFFekMsYUFBYSxDQUFDLGdCQUFnQixDQUFDO0lBQzlCLEVBQUUsRUFBRSxxQkFBcUI7SUFDekIsVUFBVSxFQUFFLENBQUMsbUJBQW1CLENBQUM7SUFDakMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxZQUFZLENBQUMsRUFBRSxNQUFNLENBQUM7SUFDaEUsU0FBUyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztDQUN2QixDQUFDLENBQUE7QUFFRixRQUFRLENBQUMsRUFBRSxDQUNWLHVCQUF1QixDQUFDLGFBQWEsQ0FDckMsQ0FBQyw2QkFBNkIsQ0FBQztJQUMvQjtRQUNDLFNBQVMsRUFBRTtZQUNWLGFBQWEsRUFBRTtnQkFDZCw2Q0FBNkMsRUFBRSxLQUFLO2dCQUNwRCw2Q0FBNkMsRUFBRSxLQUFLO2FBQ3BEO1lBQ0QscUZBQXFGO1lBQ3JGLE1BQU0sRUFBRTtnQkFDUCxxQkFBcUIsRUFBRSxLQUFLO2FBQzVCO1lBQ0QsWUFBWSxFQUFFO2dCQUNiLHFCQUFxQixFQUFFLEtBQUs7YUFDNUI7WUFDRCxlQUFlLEVBQUU7Z0JBQ2hCLFdBQVcsRUFBRSxJQUFJO2FBQ2pCO1lBQ0QsUUFBUSxFQUFFO2dCQUNULHFCQUFxQixFQUFFLElBQUk7Z0JBQzNCLGdCQUFnQixFQUFFLENBQUM7YUFDbkI7U0FDRDtLQUNEO0NBQ0QsQ0FBQyxDQUFBIn0=