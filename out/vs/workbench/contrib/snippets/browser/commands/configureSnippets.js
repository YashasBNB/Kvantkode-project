/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isValidBasename } from '../../../../../base/common/extpath.js';
import { extname } from '../../../../../base/common/path.js';
import { basename, joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { getIconClassesForLanguageId } from '../../../../../editor/common/services/getIconClasses.js';
import * as nls from '../../../../../nls.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { SnippetsAction } from './abstractSnippetsActions.js';
import { ISnippetsService } from '../snippets.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
import { IUserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfile.js';
var ISnippetPick;
(function (ISnippetPick) {
    function is(thing) {
        return !!thing && URI.isUri(thing.filepath);
    }
    ISnippetPick.is = is;
})(ISnippetPick || (ISnippetPick = {}));
async function computePicks(snippetService, userDataProfileService, languageService, labelService) {
    const existing = [];
    const future = [];
    const seen = new Set();
    const added = new Map();
    for (const file of await snippetService.getSnippetFiles()) {
        if (file.source === 3 /* SnippetSource.Extension */) {
            // skip extension snippets
            continue;
        }
        if (file.isGlobalSnippets) {
            await file.load();
            // list scopes for global snippets
            const names = new Set();
            let source;
            outer: for (const snippet of file.data) {
                if (!source) {
                    source = snippet.source;
                }
                for (const scope of snippet.scopes) {
                    const name = languageService.getLanguageName(scope);
                    if (name) {
                        if (names.size >= 4) {
                            names.add(`${name}...`);
                            break outer;
                        }
                        else {
                            names.add(name);
                        }
                    }
                }
            }
            const snippet = {
                label: basename(file.location),
                filepath: file.location,
                description: names.size === 0
                    ? nls.localize('global.scope', '(global)')
                    : nls.localize('global.1', '({0})', [...names].join(', ')),
            };
            existing.push(snippet);
            if (!source) {
                continue;
            }
            const detail = nls.localize('detail.label', '({0}) {1}', source, labelService.getUriLabel(file.location, { relative: true }));
            const lastItem = added.get(basename(file.location));
            if (lastItem) {
                snippet.detail = detail;
                lastItem.snippet.detail = lastItem.detail;
            }
            added.set(basename(file.location), { snippet, detail });
        }
        else {
            // language snippet
            const mode = basename(file.location).replace(/\.json$/, '');
            existing.push({
                label: basename(file.location),
                description: `(${languageService.getLanguageName(mode) ?? mode})`,
                filepath: file.location,
            });
            seen.add(mode);
        }
    }
    const dir = userDataProfileService.currentProfile.snippetsHome;
    for (const languageId of languageService.getRegisteredLanguageIds()) {
        const label = languageService.getLanguageName(languageId);
        if (label && !seen.has(languageId)) {
            future.push({
                label: languageId,
                description: `(${label})`,
                filepath: joinPath(dir, `${languageId}.json`),
                hint: true,
                iconClasses: getIconClassesForLanguageId(languageId),
            });
        }
    }
    existing.sort((a, b) => {
        const a_ext = extname(a.filepath.path);
        const b_ext = extname(b.filepath.path);
        if (a_ext === b_ext) {
            return a.label.localeCompare(b.label);
        }
        else if (a_ext === '.code-snippets') {
            return -1;
        }
        else {
            return 1;
        }
    });
    future.sort((a, b) => {
        return a.label.localeCompare(b.label);
    });
    return { existing, future };
}
async function createSnippetFile(scope, defaultPath, quickInputService, fileService, textFileService, opener) {
    function createSnippetUri(input) {
        const filename = extname(input) !== '.code-snippets' ? `${input}.code-snippets` : input;
        return joinPath(defaultPath, filename);
    }
    await fileService.createFolder(defaultPath);
    const input = await quickInputService.input({
        placeHolder: nls.localize('name', 'Type snippet file name'),
        async validateInput(input) {
            if (!input) {
                return nls.localize('bad_name1', 'Invalid file name');
            }
            if (!isValidBasename(input)) {
                return nls.localize('bad_name2', "'{0}' is not a valid file name", input);
            }
            if (await fileService.exists(createSnippetUri(input))) {
                return nls.localize('bad_name3', "'{0}' already exists", input);
            }
            return undefined;
        },
    });
    if (!input) {
        return undefined;
    }
    const resource = createSnippetUri(input);
    await textFileService.write(resource, [
        '{',
        '\t// Place your ' +
            scope +
            ' snippets here. Each snippet is defined under a snippet name and has a scope, prefix, body and ',
        '\t// description. Add comma separated ids of the languages where the snippet is applicable in the scope field. If scope ',
        '\t// is left empty or omitted, the snippet gets applied to all languages. The prefix is what is ',
        '\t// used to trigger the snippet and the body will be expanded and inserted. Possible variables are: ',
        '\t// $1, $2 for tab stops, $0 for the final cursor position, and ${1:label}, ${2:another} for placeholders. ',
        '\t// Placeholders with the same ids are connected.',
        '\t// Example:',
        '\t// "Print to console": {',
        '\t// \t"scope": "javascript,typescript",',
        '\t// \t"prefix": "log",',
        '\t// \t"body": [',
        '\t// \t\t"console.log(\'$1\');",',
        '\t// \t\t"$2"',
        '\t// \t],',
        '\t// \t"description": "Log output to console"',
        '\t// }',
        '}',
    ].join('\n'));
    await opener.open(resource);
    return undefined;
}
async function createLanguageSnippetFile(pick, fileService, textFileService) {
    if (await fileService.exists(pick.filepath)) {
        return;
    }
    const contents = [
        '{',
        '\t// Place your snippets for ' +
            pick.label +
            ' here. Each snippet is defined under a snippet name and has a prefix, body and ',
        '\t// description. The prefix is what is used to trigger the snippet and the body will be expanded and inserted. Possible variables are:',
        '\t// $1, $2 for tab stops, $0 for the final cursor position, and ${1:label}, ${2:another} for placeholders. Placeholders with the ',
        '\t// same ids are connected.',
        '\t// Example:',
        '\t// "Print to console": {',
        '\t// \t"prefix": "log",',
        '\t// \t"body": [',
        '\t// \t\t"console.log(\'$1\');",',
        '\t// \t\t"$2"',
        '\t// \t],',
        '\t// \t"description": "Log output to console"',
        '\t// }',
        '}',
    ].join('\n');
    await textFileService.write(pick.filepath, contents);
}
export class ConfigureSnippetsAction extends SnippetsAction {
    constructor() {
        super({
            id: 'workbench.action.openSnippets',
            title: nls.localize2('openSnippet.label', 'Configure Snippets'),
            shortTitle: {
                ...nls.localize2('userSnippets', 'Snippets'),
                mnemonicTitle: nls.localize({ key: 'miOpenSnippets', comment: ['&& denotes a mnemonic'] }, '&&Snippets'),
            },
            f1: true,
            menu: [
                { id: MenuId.MenubarPreferencesMenu, group: '2_configuration', order: 5 },
                { id: MenuId.GlobalActivity, group: '2_configuration', order: 5 },
            ],
        });
    }
    async run(accessor) {
        const snippetService = accessor.get(ISnippetsService);
        const quickInputService = accessor.get(IQuickInputService);
        const opener = accessor.get(IOpenerService);
        const languageService = accessor.get(ILanguageService);
        const userDataProfileService = accessor.get(IUserDataProfileService);
        const workspaceService = accessor.get(IWorkspaceContextService);
        const fileService = accessor.get(IFileService);
        const textFileService = accessor.get(ITextFileService);
        const labelService = accessor.get(ILabelService);
        const picks = await computePicks(snippetService, userDataProfileService, languageService, labelService);
        const existing = picks.existing;
        const globalSnippetPicks = [
            {
                scope: nls.localize('new.global_scope', 'global'),
                label: nls.localize('new.global', 'New Global Snippets file...'),
                uri: userDataProfileService.currentProfile.snippetsHome,
            },
        ];
        const workspaceSnippetPicks = [];
        for (const folder of workspaceService.getWorkspace().folders) {
            workspaceSnippetPicks.push({
                scope: nls.localize('new.workspace_scope', '{0} workspace', folder.name),
                label: nls.localize('new.folder', "New Snippets file for '{0}'...", folder.name),
                uri: folder.toResource('.vscode'),
            });
        }
        if (existing.length > 0) {
            existing.unshift({
                type: 'separator',
                label: nls.localize('group.global', 'Existing Snippets'),
            });
            existing.push({ type: 'separator', label: nls.localize('new.global.sep', 'New Snippets') });
        }
        else {
            existing.push({ type: 'separator', label: nls.localize('new.global.sep', 'New Snippets') });
        }
        const pick = await quickInputService.pick([].concat(existing, globalSnippetPicks, workspaceSnippetPicks, picks.future), {
            placeHolder: nls.localize('openSnippet.pickLanguage', 'Select Snippets File or Create Snippets'),
            matchOnDescription: true,
        });
        if (globalSnippetPicks.indexOf(pick) >= 0) {
            return createSnippetFile(pick.scope, pick.uri, quickInputService, fileService, textFileService, opener);
        }
        else if (workspaceSnippetPicks.indexOf(pick) >= 0) {
            return createSnippetFile(pick.scope, pick.uri, quickInputService, fileService, textFileService, opener);
        }
        else if (ISnippetPick.is(pick)) {
            if (pick.hint) {
                await createLanguageSnippetFile(pick, fileService, textFileService);
            }
            return opener.open(pick.filepath);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJlU25pcHBldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zbmlwcGV0cy9icm93c2VyL2NvbW1hbmRzL2NvbmZpZ3VyZVNuaXBwZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDckYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDckcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDMUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRTVFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDaEYsT0FBTyxFQUNOLGtCQUFrQixHQUdsQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUVqRCxPQUFPLEVBQUUs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