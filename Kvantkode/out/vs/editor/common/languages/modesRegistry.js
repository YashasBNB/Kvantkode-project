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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZXNSZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9sYW5ndWFnZXMvbW9kZXNSZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFeEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3BELE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBQ3JDLE1BQU0saUVBQWlFLENBQUE7QUFFeEUsNkJBQTZCO0FBQzdCLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRztJQUN6QixhQUFhLEVBQUUsc0JBQXNCO0NBQ3JDLENBQUE7QUFFRCxNQUFNLE9BQU8sbUJBQW1CO0lBTS9CO1FBSGlCLDBCQUFxQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUE7UUFDNUMseUJBQW9CLEdBQWdCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUE7UUFHbkYsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUVNLGdCQUFnQixDQUFDLEdBQTRCO1FBQ25ELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3pCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDMUMsT0FBTztZQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDNUQsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO3dCQUNoQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7d0JBQzVCLE9BQU07b0JBQ1AsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUE7SUFDRixDQUFDO0lBRU0sWUFBWTtRQUNsQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUE7SUFDdkIsQ0FBQztDQUNEO0FBRUQsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLElBQUksbUJBQW1CLEVBQUUsQ0FBQTtBQUN0RCxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUE7QUFFckQsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsV0FBVyxDQUFBO0FBQ2hELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLE1BQU0sQ0FBQTtBQUV6QyxhQUFhLENBQUMsZ0JBQWdCLENBQUM7SUFDOUIsRUFBRSxFQUFFLHFCQUFxQjtJQUN6QixVQUFVLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQztJQUNqQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLFlBQVksQ0FBQyxFQUFFLE1BQU0sQ0FBQztJQUNoRSxTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0NBQ3ZCLENBQUMsQ0FBQTtBQUVGLFFBQVEsQ0FBQyxFQUFFLENBQ1YsdUJBQXVCLENBQUMsYUFBYSxDQUNyQyxDQUFDLDZCQUE2QixDQUFDO0lBQy9CO1FBQ0MsU0FBUyxFQUFFO1lBQ1YsYUFBYSxFQUFFO2dCQUNkLDZDQUE2QyxFQUFFLEtBQUs7Z0JBQ3BELDZDQUE2QyxFQUFFLEtBQUs7YUFDcEQ7WUFDRCxxRkFBcUY7WUFDckYsTUFBTSxFQUFFO2dCQUNQLHFCQUFxQixFQUFFLEtBQUs7YUFDNUI7WUFDRCxZQUFZLEVBQUU7Z0JBQ2IscUJBQXFCLEVBQUUsS0FBSzthQUM1QjtZQUNELGVBQWUsRUFBRTtnQkFDaEIsV0FBVyxFQUFFLElBQUk7YUFDakI7WUFDRCxRQUFRLEVBQUU7Z0JBQ1QscUJBQXFCLEVBQUUsSUFBSTtnQkFDM0IsZ0JBQWdCLEVBQUUsQ0FBQzthQUNuQjtTQUNEO0tBQ0Q7Q0FDRCxDQUFDLENBQUEifQ==