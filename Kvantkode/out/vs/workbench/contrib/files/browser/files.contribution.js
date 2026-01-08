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
import * as nls from '../../../../nls.js';
import { sep } from '../../../../base/common/path.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { EditorExtensions, } from '../../../common/editor.js';
import { AutoSaveConfiguration, HotExitConfiguration, FILES_EXCLUDE_CONFIG, FILES_ASSOCIATIONS_CONFIG, FILES_READONLY_INCLUDE_CONFIG, FILES_READONLY_EXCLUDE_CONFIG, FILES_READONLY_FROM_PERMISSIONS_CONFIG, } from '../../../../platform/files/common/files.js';
import { FILE_EDITOR_INPUT_ID, BINARY_TEXT_FILE_MODE, } from '../common/files.js';
import { TextFileEditorTracker } from './editors/textFileEditorTracker.js';
import { TextFileSaveErrorHandler } from './editors/textFileSaveErrorHandler.js';
import { FileEditorInput } from './editors/fileEditorInput.js';
import { BinaryFileEditor } from './editors/binaryFileEditor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { isNative, isWeb, isWindows } from '../../../../base/common/platform.js';
import { ExplorerViewletViewsContribution } from './explorerViewlet.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ExplorerService, UNDO_REDO_SOURCE } from './explorerService.js';
import { GUESSABLE_ENCODINGS, SUPPORTED_ENCODINGS, } from '../../../services/textfile/common/encoding.js';
import { Schemas } from '../../../../base/common/network.js';
import { WorkspaceWatcher } from './workspaceWatcher.js';
import { editorConfigurationBaseNode } from '../../../../editor/common/config/editorConfigurationSchema.js';
import { DirtyFilesIndicator } from '../common/dirtyFilesIndicator.js';
import { UndoCommand, RedoCommand } from '../../../../editor/browser/editorExtensions.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { IExplorerService } from './files.js';
import { FileEditorInputSerializer, FileEditorWorkingCopyEditorHandler, } from './editors/fileEditorHandler.js';
import { ModesRegistry } from '../../../../editor/common/languages/modesRegistry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { TextFileEditor } from './editors/textFileEditor.js';
let FileUriLabelContribution = class FileUriLabelContribution {
    static { this.ID = 'workbench.contrib.fileUriLabel'; }
    constructor(labelService) {
        labelService.registerFormatter({
            scheme: Schemas.file,
            formatting: {
                label: '${authority}${path}',
                separator: sep,
                tildify: !isWindows,
                normalizeDriveLetter: isWindows,
                authorityPrefix: sep + sep,
                workspaceSuffix: '',
            },
        });
    }
};
FileUriLabelContribution = __decorate([
    __param(0, ILabelService)
], FileUriLabelContribution);
registerSingleton(IExplorerService, ExplorerService, 1 /* InstantiationType.Delayed */);
// Register file editors
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(TextFileEditor, TextFileEditor.ID, nls.localize('textFileEditor', 'Text File Editor')), [new SyncDescriptor(FileEditorInput)]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(BinaryFileEditor, BinaryFileEditor.ID, nls.localize('binaryFileEditor', 'Binary File Editor')), [new SyncDescriptor(FileEditorInput)]);
// Register default file input factory
Registry.as(EditorExtensions.EditorFactory).registerFileEditorFactory({
    typeId: FILE_EDITOR_INPUT_ID,
    createFileEditor: (resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents, instantiationService) => {
        return instantiationService.createInstance(FileEditorInput, resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents);
    },
    isFileEditor: (obj) => {
        return obj instanceof FileEditorInput;
    },
});
// Register Editor Input Serializer & Handler
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(FILE_EDITOR_INPUT_ID, FileEditorInputSerializer);
registerWorkbenchContribution2(FileEditorWorkingCopyEditorHandler.ID, FileEditorWorkingCopyEditorHandler, 2 /* WorkbenchPhase.BlockRestore */);
// Register Explorer views
registerWorkbenchContribution2(ExplorerViewletViewsContribution.ID, ExplorerViewletViewsContribution, 1 /* WorkbenchPhase.BlockStartup */);
// Register Text File Editor Tracker
registerWorkbenchContribution2(TextFileEditorTracker.ID, TextFileEditorTracker, 1 /* WorkbenchPhase.BlockStartup */);
// Register Text File Save Error Handler
registerWorkbenchContribution2(TextFileSaveErrorHandler.ID, TextFileSaveErrorHandler, 1 /* WorkbenchPhase.BlockStartup */);
// Register uri display for file uris
registerWorkbenchContribution2(FileUriLabelContribution.ID, FileUriLabelContribution, 1 /* WorkbenchPhase.BlockStartup */);
// Register Workspace Watcher
registerWorkbenchContribution2(WorkspaceWatcher.ID, WorkspaceWatcher, 3 /* WorkbenchPhase.AfterRestored */);
// Register Dirty Files Indicator
registerWorkbenchContribution2(DirtyFilesIndicator.ID, DirtyFilesIndicator, 1 /* WorkbenchPhase.BlockStartup */);
// Configuration
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
const hotExitConfiguration = isNative
    ? {
        type: 'string',
        scope: 1 /* ConfigurationScope.APPLICATION */,
        enum: [
            HotExitConfiguration.OFF,
            HotExitConfiguration.ON_EXIT,
            HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE,
        ],
        default: HotExitConfiguration.ON_EXIT,
        markdownEnumDescriptions: [
            nls.localize('hotExit.off', 'Disable hot exit. A prompt will show when attempting to close a window with editors that have unsaved changes.'),
            nls.localize('hotExit.onExit', 'Hot exit will be triggered when the last window is closed on Windows/Linux or when the `workbench.action.quit` command is triggered (command palette, keybinding, menu). All windows without folders opened will be restored upon next launch. A list of previously opened windows with unsaved files can be accessed via `File > Open Recent > More...`'),
            nls.localize('hotExit.onExitAndWindowClose', "Hot exit will be triggered when the last window is closed on Windows/Linux or when the `workbench.action.quit` command is triggered (command palette, keybinding, menu), and also for any window with a folder opened regardless of whether it's the last window. All windows without folders opened will be restored upon next launch. A list of previously opened windows with unsaved files can be accessed via `File > Open Recent > More...`"),
        ],
        markdownDescription: nls.localize('hotExit', '[Hot Exit](https://aka.ms/vscode-hot-exit) controls whether unsaved files are remembered between sessions, allowing the save prompt when exiting the editor to be skipped.', HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE),
    }
    : {
        type: 'string',
        scope: 1 /* ConfigurationScope.APPLICATION */,
        enum: [HotExitConfiguration.OFF, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE],
        default: HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE,
        markdownEnumDescriptions: [
            nls.localize('hotExit.off', 'Disable hot exit. A prompt will show when attempting to close a window with editors that have unsaved changes.'),
            nls.localize('hotExit.onExitAndWindowCloseBrowser', 'Hot exit will be triggered when the browser quits or the window or tab is closed.'),
        ],
        markdownDescription: nls.localize('hotExit', '[Hot Exit](https://aka.ms/vscode-hot-exit) controls whether unsaved files are remembered between sessions, allowing the save prompt when exiting the editor to be skipped.', HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE),
    };
configurationRegistry.registerConfiguration({
    id: 'files',
    order: 9,
    title: nls.localize('filesConfigurationTitle', 'Files'),
    type: 'object',
    properties: {
        [FILES_EXCLUDE_CONFIG]: {
            type: 'object',
            markdownDescription: nls.localize('exclude', 'Configure [glob patterns](https://aka.ms/vscode-glob-patterns) for excluding files and folders. For example, the File Explorer decides which files and folders to show or hide based on this setting. Refer to the `#search.exclude#` setting to define search-specific excludes. Refer to the `#explorer.excludeGitIgnore#` setting for ignoring files based on your `.gitignore`.'),
            default: {
                ...{
                    '**/.git': true,
                    '**/.svn': true,
                    '**/.hg': true,
                    '**/.DS_Store': true,
                    '**/Thumbs.db': true,
                },
                ...(isWeb
                    ? { '**/*.crswap': true /* filter out swap files used for local file access */ }
                    : undefined),
            },
            scope: 5 /* ConfigurationScope.RESOURCE */,
            additionalProperties: {
                anyOf: [
                    {
                        type: 'boolean',
                        enum: [true, false],
                        enumDescriptions: [
                            nls.localize('trueDescription', 'Enable the pattern.'),
                            nls.localize('falseDescription', 'Disable the pattern.'),
                        ],
                        description: nls.localize('files.exclude.boolean', 'The glob pattern to match file paths against. Set to true or false to enable or disable the pattern.'),
                    },
                    {
                        type: 'object',
                        properties: {
                            when: {
                                type: 'string', // expression ({ "**/*.js": { "when": "$(basename).js" } })
                                pattern: '\\w*\\$\\(basename\\)\\w*',
                                default: '$(basename).ext',
                                markdownDescription: nls.localize({
                                    key: 'files.exclude.when',
                                    comment: ['\\$(basename) should not be translated'],
                                }, 'Additional check on the siblings of a matching file. Use \\$(basename) as variable for the matching file name.'),
                            },
                        },
                    },
                ],
            },
        },
        [FILES_ASSOCIATIONS_CONFIG]: {
            type: 'object',
            markdownDescription: nls.localize('associations', 'Configure [glob patterns](https://aka.ms/vscode-glob-patterns) of file associations to languages (for example `"*.extension": "html"`). Patterns will match on the absolute path of a file if they contain a path separator and will match on the name of the file otherwise. These have precedence over the default associations of the languages installed.'),
            additionalProperties: {
                type: 'string',
            },
        },
        'files.encoding': {
            type: 'string',
            enum: Object.keys(SUPPORTED_ENCODINGS),
            default: 'utf8',
            description: nls.localize('encoding', 'The default character set encoding to use when reading and writing files. This setting can also be configured per language.'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            enumDescriptions: Object.keys(SUPPORTED_ENCODINGS).map((key) => SUPPORTED_ENCODINGS[key].labelLong),
            enumItemLabels: Object.keys(SUPPORTED_ENCODINGS).map((key) => SUPPORTED_ENCODINGS[key].labelLong),
        },
        'files.autoGuessEncoding': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('autoGuessEncoding', 'When enabled, the editor will attempt to guess the character set encoding when opening files. This setting can also be configured per language. Note, this setting is not respected by text search. Only {0} is respected.', '`#files.encoding#`'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'files.candidateGuessEncodings': {
            type: 'array',
            items: {
                type: 'string',
                enum: Object.keys(GUESSABLE_ENCODINGS),
                enumDescriptions: Object.keys(GUESSABLE_ENCODINGS).map((key) => GUESSABLE_ENCODINGS[key].labelLong),
            },
            default: [],
            markdownDescription: nls.localize('candidateGuessEncodings', 'List of character set encodings that the editor should attempt to guess in the order they are listed. In case it cannot be determined, {0} is respected', '`#files.encoding#`'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'files.eol': {
            type: 'string',
            enum: ['\n', '\r\n', 'auto'],
            enumDescriptions: [
                nls.localize('eol.LF', 'LF'),
                nls.localize('eol.CRLF', 'CRLF'),
                nls.localize('eol.auto', 'Uses operating system specific end of line character.'),
            ],
            default: 'auto',
            description: nls.localize('eol', 'The default end of line character.'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'files.enableTrash': {
            type: 'boolean',
            default: true,
            description: nls.localize('useTrash', 'Moves files/folders to the OS trash (recycle bin on Windows) when deleting. Disabling this will delete files/folders permanently.'),
        },
        'files.trimTrailingWhitespace': {
            type: 'boolean',
            default: false,
            description: nls.localize('trimTrailingWhitespace', 'When enabled, will trim trailing whitespace when saving a file.'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'files.trimTrailingWhitespaceInRegexAndStrings': {
            type: 'boolean',
            default: true,
            description: nls.localize('trimTrailingWhitespaceInRegexAndStrings', "When enabled, trailing whitespace will be removed from multiline strings and regexes will be removed on save or when executing 'editor.action.trimTrailingWhitespace'. This can cause whitespace to not be trimmed from lines when there isn't up-to-date token information."),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'files.insertFinalNewline': {
            type: 'boolean',
            default: false,
            description: nls.localize('insertFinalNewline', 'When enabled, insert a final new line at the end of the file when saving it.'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'files.trimFinalNewlines': {
            type: 'boolean',
            default: false,
            description: nls.localize('trimFinalNewlines', 'When enabled, will trim all new lines after the final new line at the end of the file when saving it.'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'files.autoSave': {
            type: 'string',
            enum: [
                AutoSaveConfiguration.OFF,
                AutoSaveConfiguration.AFTER_DELAY,
                AutoSaveConfiguration.ON_FOCUS_CHANGE,
                AutoSaveConfiguration.ON_WINDOW_CHANGE,
            ],
            markdownEnumDescriptions: [
                nls.localize({
                    comment: [
                        'This is the description for a setting. Values surrounded by single quotes are not to be translated.',
                    ],
                    key: 'files.autoSave.off',
                }, 'An editor with changes is never automatically saved.'),
                nls.localize({
                    comment: [
                        'This is the description for a setting. Values surrounded by single quotes are not to be translated.',
                    ],
                    key: 'files.autoSave.afterDelay',
                }, 'An editor with changes is automatically saved after the configured `#files.autoSaveDelay#`.'),
                nls.localize({
                    comment: [
                        'This is the description for a setting. Values surrounded by single quotes are not to be translated.',
                    ],
                    key: 'files.autoSave.onFocusChange',
                }, 'An editor with changes is automatically saved when the editor loses focus.'),
                nls.localize({
                    comment: [
                        'This is the description for a setting. Values surrounded by single quotes are not to be translated.',
                    ],
                    key: 'files.autoSave.onWindowChange',
                }, 'An editor with changes is automatically saved when the window loses focus.'),
            ],
            default: isWeb ? AutoSaveConfiguration.AFTER_DELAY : AutoSaveConfiguration.OFF,
            markdownDescription: nls.localize({
                comment: [
                    'This is the description for a setting. Values surrounded by single quotes are not to be translated.',
                ],
                key: 'autoSave',
            }, 'Controls [auto save](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save) of editors that have unsaved changes.', AutoSaveConfiguration.OFF, AutoSaveConfiguration.AFTER_DELAY, AutoSaveConfiguration.ON_FOCUS_CHANGE, AutoSaveConfiguration.ON_WINDOW_CHANGE, AutoSaveConfiguration.AFTER_DELAY),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'files.autoSaveDelay': {
            type: 'number',
            default: 1000,
            minimum: 0,
            markdownDescription: nls.localize({
                comment: [
                    'This is the description for a setting. Values surrounded by single quotes are not to be translated.',
                ],
                key: 'autoSaveDelay',
            }, 'Controls the delay in milliseconds after which an editor with unsaved changes is saved automatically. Only applies when `#files.autoSave#` is set to `{0}`.', AutoSaveConfiguration.AFTER_DELAY),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'files.autoSaveWorkspaceFilesOnly': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('autoSaveWorkspaceFilesOnly', 'When enabled, will limit [auto save](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save) of editors to files that are inside the opened workspace. Only applies when {0} is enabled.', '`#files.autoSave#`'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'files.autoSaveWhenNoErrors': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('autoSaveWhenNoErrors', 'When enabled, will limit [auto save](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save) of editors to files that have no errors reported in them at the time the auto save is triggered. Only applies when {0} is enabled.', '`#files.autoSave#`'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'files.watcherExclude': {
            type: 'object',
            patternProperties: {
                '.*': { type: 'boolean' },
            },
            default: {
                '**/.git/objects/**': true,
                '**/.git/subtree-cache/**': true,
                '**/.hg/store/**': true,
            },
            markdownDescription: nls.localize('watcherExclude', 'Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) to exclude from file watching. Paths can either be relative to the watched folder or absolute. Glob patterns are matched relative from the watched folder. When you experience the file watcher process consuming a lot of CPU, make sure to exclude large folders that are of less interest (such as build output folders).'),
            scope: 5 /* ConfigurationScope.RESOURCE */,
        },
        'files.watcherInclude': {
            type: 'array',
            items: {
                type: 'string',
            },
            default: [],
            description: nls.localize('watcherInclude', 'Configure extra paths to watch for changes inside the workspace. By default, all workspace folders will be watched recursively, except for folders that are symbolic links. You can explicitly add absolute or relative paths to support watching folders that are symbolic links. Relative paths will be resolved to an absolute path using the currently opened workspace.'),
            scope: 5 /* ConfigurationScope.RESOURCE */,
        },
        'files.hotExit': hotExitConfiguration,
        'files.defaultLanguage': {
            type: 'string',
            markdownDescription: nls.localize('defaultLanguage', 'The default language identifier that is assigned to new files. If configured to `${activeEditorLanguage}`, will use the language identifier of the currently active text editor if any.'),
        },
        [FILES_READONLY_INCLUDE_CONFIG]: {
            type: 'object',
            patternProperties: {
                '.*': { type: 'boolean' },
            },
            default: {},
            markdownDescription: nls.localize('filesReadonlyInclude', 'Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) to mark as read-only. Glob patterns are always evaluated relative to the path of the workspace folder unless they are absolute paths. You can exclude matching paths via the `#files.readonlyExclude#` setting. Files from readonly file system providers will always be read-only independent of this setting.'),
            scope: 5 /* ConfigurationScope.RESOURCE */,
        },
        [FILES_READONLY_EXCLUDE_CONFIG]: {
            type: 'object',
            patternProperties: {
                '.*': { type: 'boolean' },
            },
            default: {},
            markdownDescription: nls.localize('filesReadonlyExclude', 'Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) to exclude from being marked as read-only if they match as a result of the `#files.readonlyInclude#` setting. Glob patterns are always evaluated relative to the path of the workspace folder unless they are absolute paths. Files from readonly file system providers will always be read-only independent of this setting.'),
            scope: 5 /* ConfigurationScope.RESOURCE */,
        },
        [FILES_READONLY_FROM_PERMISSIONS_CONFIG]: {
            type: 'boolean',
            markdownDescription: nls.localize('filesReadonlyFromPermissions', 'Marks files as read-only when their file permissions indicate as such. This can be overridden via `#files.readonlyInclude#` and `#files.readonlyExclude#` settings.'),
            default: false,
        },
        'files.restoreUndoStack': {
            type: 'boolean',
            description: nls.localize('files.restoreUndoStack', 'Restore the undo stack when a file is reopened.'),
            default: true,
        },
        'files.saveConflictResolution': {
            type: 'string',
            enum: ['askUser', 'overwriteFileOnDisk'],
            enumDescriptions: [
                nls.localize('askUser', 'Will refuse to save and ask for resolving the save conflict manually.'),
                nls.localize('overwriteFileOnDisk', 'Will resolve the save conflict by overwriting the file on disk with the changes in the editor.'),
            ],
            description: nls.localize('files.saveConflictResolution', 'A save conflict can occur when a file is saved to disk that was changed by another program in the meantime. To prevent data loss, the user is asked to compare the changes in the editor with the version on disk. This setting should only be changed if you frequently encounter save conflict errors and may result in data loss if used without caution.'),
            default: 'askUser',
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'files.dialog.defaultPath': {
            type: 'string',
            pattern: '^((\\/|\\\\\\\\|[a-zA-Z]:\\\\).*)?$', // slash OR UNC-root OR drive-root OR undefined
            patternErrorMessage: nls.localize('defaultPathErrorMessage', 'Default path for file dialogs must be an absolute path (e.g. C:\\\\myFolder or /myFolder).'),
            description: nls.localize('fileDialogDefaultPath', "Default path for file dialogs, overriding user's home path. Only used in the absence of a context-specific path, such as most recently opened file or folder."),
            scope: 2 /* ConfigurationScope.MACHINE */,
        },
        'files.simpleDialog.enable': {
            type: 'boolean',
            description: nls.localize('files.simpleDialog.enable', 'Enables the simple file dialog for opening and saving files and folders. The simple file dialog replaces the system file dialog when enabled.'),
            default: false,
        },
        'files.participants.timeout': {
            type: 'number',
            default: 60000,
            markdownDescription: nls.localize('files.participants.timeout', 'Timeout in milliseconds after which file participants for create, rename, and delete are cancelled. Use `0` to disable participants.'),
        },
    },
});
configurationRegistry.registerConfiguration({
    ...editorConfigurationBaseNode,
    properties: {
        'editor.formatOnSave': {
            type: 'boolean',
            markdownDescription: nls.localize('formatOnSave', 'Format a file on save. A formatter must be available and the editor must not be shutting down. When {0} is set to `afterDelay`, the file will only be formatted when saved explicitly.', '`#files.autoSave#`'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'editor.formatOnSaveMode': {
            type: 'string',
            default: 'file',
            enum: ['file', 'modifications', 'modificationsIfAvailable'],
            enumDescriptions: [
                nls.localize({ key: 'everything', comment: ['This is the description of an option'] }, 'Format the whole file.'),
                nls.localize({ key: 'modification', comment: ['This is the description of an option'] }, 'Format modifications (requires source control).'),
                nls.localize({ key: 'modificationIfAvailable', comment: ['This is the description of an option'] }, "Will attempt to format modifications only (requires source control). If source control can't be used, then the whole file will be formatted."),
            ],
            markdownDescription: nls.localize('formatOnSaveMode', 'Controls if format on save formats the whole file or only modifications. Only applies when `#editor.formatOnSave#` is enabled.'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
    },
});
configurationRegistry.registerConfiguration({
    id: 'explorer',
    order: 10,
    title: nls.localize('explorerConfigurationTitle', 'File Explorer'),
    type: 'object',
    properties: {
        'explorer.openEditors.visible': {
            type: 'number',
            description: nls.localize({ key: 'openEditorsVisible', comment: ['Open is an adjective'] }, 'The initial maximum number of editors shown in the Open Editors pane. Exceeding this limit will show a scroll bar and allow resizing the pane to display more items.'),
            default: 9,
            minimum: 1,
        },
        'explorer.openEditors.minVisible': {
            type: 'number',
            description: nls.localize({ key: 'openEditorsVisibleMin', comment: ['Open is an adjective'] }, 'The minimum number of editor slots pre-allocated in the Open Editors pane. If set to 0 the Open Editors pane will dynamically resize based on the number of editors.'),
            default: 0,
            minimum: 0,
        },
        'explorer.openEditors.sortOrder': {
            type: 'string',
            enum: ['editorOrder', 'alphabetical', 'fullPath'],
            description: nls.localize({ key: 'openEditorsSortOrder', comment: ['Open is an adjective'] }, 'Controls the sorting order of editors in the Open Editors pane.'),
            enumDescriptions: [
                nls.localize('sortOrder.editorOrder', 'Editors are ordered in the same order editor tabs are shown.'),
                nls.localize('sortOrder.alphabetical', 'Editors are ordered alphabetically by tab name inside each editor group.'),
                nls.localize('sortOrder.fullPath', 'Editors are ordered alphabetically by full path inside each editor group.'),
            ],
            default: 'editorOrder',
        },
        'explorer.autoReveal': {
            type: ['boolean', 'string'],
            enum: [true, false, 'focusNoScroll'],
            default: true,
            enumDescriptions: [
                nls.localize('autoReveal.on', 'Files will be revealed and selected.'),
                nls.localize('autoReveal.off', 'Files will not be revealed and selected.'),
                nls.localize('autoReveal.focusNoScroll', 'Files will not be scrolled into view, but will still be focused.'),
            ],
            description: nls.localize('autoReveal', 'Controls whether the Explorer should automatically reveal and select files when opening them.'),
        },
        'explorer.autoRevealExclude': {
            type: 'object',
            markdownDescription: nls.localize('autoRevealExclude', 'Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) for excluding files and folders from being revealed and selected in the Explorer when they are opened. Glob patterns are always evaluated relative to the path of the workspace folder unless they are absolute paths.'),
            default: { '**/node_modules': true, '**/bower_components': true },
            additionalProperties: {
                anyOf: [
                    {
                        type: 'boolean',
                        description: nls.localize('explorer.autoRevealExclude.boolean', 'The glob pattern to match file paths against. Set to true or false to enable or disable the pattern.'),
                    },
                    {
                        type: 'object',
                        properties: {
                            when: {
                                type: 'string', // expression ({ "**/*.js": { "when": "$(basename).js" } })
                                pattern: '\\w*\\$\\(basename\\)\\w*',
                                default: '$(basename).ext',
                                description: nls.localize('explorer.autoRevealExclude.when', 'Additional check on the siblings of a matching file. Use $(basename) as variable for the matching file name.'),
                            },
                        },
                    },
                ],
            },
        },
        'explorer.enableDragAndDrop': {
            type: 'boolean',
            description: nls.localize('enableDragAndDrop', 'Controls whether the Explorer should allow to move files and folders via drag and drop. This setting only effects drag and drop from inside the Explorer.'),
            default: true,
        },
        'explorer.confirmDragAndDrop': {
            type: 'boolean',
            description: nls.localize('confirmDragAndDrop', 'Controls whether the Explorer should ask for confirmation to move files and folders via drag and drop.'),
            default: true,
        },
        'explorer.confirmPasteNative': {
            type: 'boolean',
            description: nls.localize('confirmPasteNative', 'Controls whether the Explorer should ask for confirmation when pasting native files and folders.'),
            default: true,
        },
        'explorer.confirmDelete': {
            type: 'boolean',
            description: nls.localize('confirmDelete', 'Controls whether the Explorer should ask for confirmation when deleting a file via the trash.'),
            default: true,
        },
        'explorer.enableUndo': {
            type: 'boolean',
            description: nls.localize('enableUndo', 'Controls whether the Explorer should support undoing file and folder operations.'),
            default: true,
        },
        'explorer.confirmUndo': {
            type: 'string',
            enum: ["verbose" /* UndoConfirmLevel.Verbose */, "default" /* UndoConfirmLevel.Default */, "light" /* UndoConfirmLevel.Light */],
            description: nls.localize('confirmUndo', 'Controls whether the Explorer should ask for confirmation when undoing.'),
            default: "default" /* UndoConfirmLevel.Default */,
            enumDescriptions: [
                nls.localize('enableUndo.verbose', 'Explorer will prompt before all undo operations.'),
                nls.localize('enableUndo.default', 'Explorer will prompt before destructive undo operations.'),
                nls.localize('enableUndo.light', 'Explorer will not prompt before undo operations when focused.'),
            ],
        },
        'explorer.expandSingleFolderWorkspaces': {
            type: 'boolean',
            description: nls.localize('expandSingleFolderWorkspaces', 'Controls whether the Explorer should expand multi-root workspaces containing only one folder during initialization'),
            default: true,
        },
        'explorer.sortOrder': {
            type: 'string',
            enum: [
                "default" /* SortOrder.Default */,
                "mixed" /* SortOrder.Mixed */,
                "filesFirst" /* SortOrder.FilesFirst */,
                "type" /* SortOrder.Type */,
                "modified" /* SortOrder.Modified */,
                "foldersNestsFiles" /* SortOrder.FoldersNestsFiles */,
            ],
            default: "default" /* SortOrder.Default */,
            enumDescriptions: [
                nls.localize('sortOrder.default', 'Files and folders are sorted by their names. Folders are displayed before files.'),
                nls.localize('sortOrder.mixed', 'Files and folders are sorted by their names. Files are interwoven with folders.'),
                nls.localize('sortOrder.filesFirst', 'Files and folders are sorted by their names. Files are displayed before folders.'),
                nls.localize('sortOrder.type', 'Files and folders are grouped by extension type then sorted by their names. Folders are displayed before files.'),
                nls.localize('sortOrder.modified', 'Files and folders are sorted by last modified date in descending order. Folders are displayed before files.'),
                nls.localize('sortOrder.foldersNestsFiles', 'Files and folders are sorted by their names. Folders are displayed before files. Files with nested children are displayed before other files.'),
            ],
            markdownDescription: nls.localize('sortOrder', 'Controls the property-based sorting of files and folders in the Explorer. When `#explorer.fileNesting.enabled#` is enabled, also controls sorting of nested files.'),
        },
        'explorer.sortOrderLexicographicOptions': {
            type: 'string',
            enum: [
                "default" /* LexicographicOptions.Default */,
                "upper" /* LexicographicOptions.Upper */,
                "lower" /* LexicographicOptions.Lower */,
                "unicode" /* LexicographicOptions.Unicode */,
            ],
            default: "default" /* LexicographicOptions.Default */,
            enumDescriptions: [
                nls.localize('sortOrderLexicographicOptions.default', 'Uppercase and lowercase names are mixed together.'),
                nls.localize('sortOrderLexicographicOptions.upper', 'Uppercase names are grouped together before lowercase names.'),
                nls.localize('sortOrderLexicographicOptions.lower', 'Lowercase names are grouped together before uppercase names.'),
                nls.localize('sortOrderLexicographicOptions.unicode', 'Names are sorted in Unicode order.'),
            ],
            description: nls.localize('sortOrderLexicographicOptions', 'Controls the lexicographic sorting of file and folder names in the Explorer.'),
        },
        'explorer.sortOrderReverse': {
            type: 'boolean',
            description: nls.localize('sortOrderReverse', 'Controls whether the file and folder sort order, should be reversed.'),
            default: false,
        },
        'explorer.decorations.colors': {
            type: 'boolean',
            description: nls.localize('explorer.decorations.colors', 'Controls whether file decorations should use colors.'),
            default: true,
        },
        'explorer.decorations.badges': {
            type: 'boolean',
            description: nls.localize('explorer.decorations.badges', 'Controls whether file decorations should use badges.'),
            default: true,
        },
        'explorer.incrementalNaming': {
            type: 'string',
            enum: ['simple', 'smart', 'disabled'],
            enumDescriptions: [
                nls.localize('simple', 'Appends the word "copy" at the end of the duplicated name potentially followed by a number.'),
                nls.localize('smart', 'Adds a number at the end of the duplicated name. If some number is already part of the name, tries to increase that number.'),
                nls.localize('disabled', 'Disables incremental naming. If two files with the same name exist you will be prompted to overwrite the existing file.'),
            ],
            description: nls.localize('explorer.incrementalNaming', 'Controls which naming strategy to use when giving a new name to a duplicated Explorer item on paste.'),
            default: 'simple',
        },
        'explorer.autoOpenDroppedFile': {
            type: 'boolean',
            description: nls.localize('autoOpenDroppedFile', 'Controls whether the Explorer should automatically open a file when it is dropped into the explorer'),
            default: true,
        },
        'explorer.compactFolders': {
            type: 'boolean',
            description: nls.localize('compressSingleChildFolders', 'Controls whether the Explorer should render folders in a compact form. In such a form, single child folders will be compressed in a combined tree element. Useful for Java package structures, for example.'),
            default: true,
        },
        'explorer.copyRelativePathSeparator': {
            type: 'string',
            enum: ['/', '\\', 'auto'],
            enumDescriptions: [
                nls.localize('copyRelativePathSeparator.slash', 'Use slash as path separation character.'),
                nls.localize('copyRelativePathSeparator.backslash', 'Use backslash as path separation character.'),
                nls.localize('copyRelativePathSeparator.auto', 'Uses operating system specific path separation character.'),
            ],
            description: nls.localize('copyRelativePathSeparator', 'The path separation character used when copying relative file paths.'),
            default: 'auto',
        },
        'explorer.copyPathSeparator': {
            type: 'string',
            enum: ['/', '\\', 'auto'],
            enumDescriptions: [
                nls.localize('copyPathSeparator.slash', 'Use slash as path separation character.'),
                nls.localize('copyPathSeparator.backslash', 'Use backslash as path separation character.'),
                nls.localize('copyPathSeparator.auto', 'Uses operating system specific path separation character.'),
            ],
            description: nls.localize('copyPathSeparator', 'The path separation character used when copying file paths.'),
            default: 'auto',
        },
        'explorer.excludeGitIgnore': {
            type: 'boolean',
            markdownDescription: nls.localize('excludeGitignore', 'Controls whether entries in .gitignore should be parsed and excluded from the Explorer. Similar to {0}.', '`#files.exclude#`'),
            default: false,
            scope: 5 /* ConfigurationScope.RESOURCE */,
        },
        'explorer.fileNesting.enabled': {
            type: 'boolean',
            scope: 5 /* ConfigurationScope.RESOURCE */,
            markdownDescription: nls.localize('fileNestingEnabled', 'Controls whether file nesting is enabled in the Explorer. File nesting allows for related files in a directory to be visually grouped together under a single parent file.'),
            default: false,
        },
        'explorer.fileNesting.expand': {
            type: 'boolean',
            markdownDescription: nls.localize('fileNestingExpand', 'Controls whether file nests are automatically expanded. {0} must be set for this to take effect.', '`#explorer.fileNesting.enabled#`'),
            default: true,
        },
        'explorer.fileNesting.patterns': {
            type: 'object',
            scope: 5 /* ConfigurationScope.RESOURCE */,
            markdownDescription: nls.localize('fileNestingPatterns', "Controls nesting of files in the Explorer. {0} must be set for this to take effect. Each __Item__ represents a parent pattern and may contain a single `*` character that matches any string. Each __Value__ represents a comma separated list of the child patterns that should be shown nested under a given parent. Child patterns may contain several special tokens:\n- `${capture}`: Matches the resolved value of the `*` from the parent pattern\n- `${basename}`: Matches the parent file's basename, the `file` in `file.ts`\n- `${extname}`: Matches the parent file's extension, the `ts` in `file.ts`\n- `${dirname}`: Matches the parent file's directory name, the `src` in `src/file.ts`\n- `*`:  Matches any string, may only be used once per child pattern", '`#explorer.fileNesting.enabled#`'),
            patternProperties: {
                '^[^*]*\\*?[^*]*$': {
                    markdownDescription: nls.localize('fileNesting.description', 'Each key pattern may contain a single `*` character which will match any string.'),
                    type: 'string',
                    pattern: '^([^,*]*\\*?[^,*]*)(, ?[^,*]*\\*?[^,*]*)*$',
                },
            },
            additionalProperties: false,
            default: {
                '*.ts': '${capture}.js',
                '*.js': '${capture}.js.map, ${capture}.min.js, ${capture}.d.ts',
                '*.jsx': '${capture}.js',
                '*.tsx': '${capture}.ts',
                'tsconfig.json': 'tsconfig.*.json',
                'package.json': 'package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb, bun.lock',
            },
        },
    },
});
UndoCommand.addImplementation(110, 'explorer', (accessor) => {
    const undoRedoService = accessor.get(IUndoRedoService);
    const explorerService = accessor.get(IExplorerService);
    const configurationService = accessor.get(IConfigurationService);
    const explorerCanUndo = configurationService.getValue().explorer.enableUndo;
    if (explorerService.hasViewFocus() &&
        undoRedoService.canUndo(UNDO_REDO_SOURCE) &&
        explorerCanUndo) {
        undoRedoService.undo(UNDO_REDO_SOURCE);
        return true;
    }
    return false;
});
RedoCommand.addImplementation(110, 'explorer', (accessor) => {
    const undoRedoService = accessor.get(IUndoRedoService);
    const explorerService = accessor.get(IExplorerService);
    const configurationService = accessor.get(IConfigurationService);
    const explorerCanUndo = configurationService.getValue().explorer.enableUndo;
    if (explorerService.hasViewFocus() &&
        undoRedoService.canRedo(UNDO_REDO_SOURCE) &&
        explorerCanUndo) {
        undoRedoService.redo(UNDO_REDO_SOURCE);
        return true;
    }
    return false;
});
ModesRegistry.registerLanguage({
    id: BINARY_TEXT_FILE_MODE,
    aliases: ['Binary'],
    mimetypes: ['text/x-code-binary'],
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2ZpbGVzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsR0FHckMsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBR04sOEJBQThCLEdBQzlCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUdOLGdCQUFnQixHQUNoQixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsb0JBQW9CLEVBQ3BCLG9CQUFvQixFQUNwQix5QkFBeUIsRUFDekIsNkJBQTZCLEVBQzdCLDZCQUE2QixFQUM3QixzQ0FBc0MsR0FDdEMsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBR04sb0JBQW9CLEVBQ3BCLHFCQUFxQixHQUdyQixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENB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