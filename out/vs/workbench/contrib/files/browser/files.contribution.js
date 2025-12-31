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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci9maWxlcy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBR3JDLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUdOLDhCQUE4QixHQUM5QixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFHTixnQkFBZ0IsR0FDaEIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLG9CQUFvQixFQUNwQixvQkFBb0IsRUFDcEIseUJBQXlCLEVBQ3pCLDZCQUE2QixFQUM3Qiw2QkFBNkIsRUFDN0Isc0NBQXNDLEdBQ3RDLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUdOLG9CQUFvQixFQUNwQixxQkFBcUIsR0FHckIsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFaEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FB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