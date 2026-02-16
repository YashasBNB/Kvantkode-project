var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator, IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { QueryBuilder } from '../../../services/search/common/queryBuilder.js';
import { ISearchService } from '../../../services/search/common/search.js';
import { IEditCodeService } from './editCodeServiceInterface.js';
import { ITerminalToolService } from './terminalToolService.js';
import { IVoidModelService } from '../common/voidModelService.js';
import { IVoidCommandBarService } from './voidCommandBarService.js';
import { computeDirectoryTree1Deep, IDirectoryStrService, stringifyDirectoryTree1Deep, } from '../common/directoryStrService.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { timeout } from '../../../../base/common/async.js';
import { MAX_CHILDREN_URIs_PAGE, MAX_FILE_CHARS_PAGE, MAX_TERMINAL_BG_COMMAND_TIME, MAX_TERMINAL_INACTIVE_TIME, } from '../common/prompt/prompts.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
const isFalsy = (u) => {
    return !u || u === 'null' || u === 'undefined';
};
const validateStr = (argName, value) => {
    if (value === null)
        throw new Error(`Invalid LLM output: ${argName} was null.`);
    if (typeof value !== 'string')
        throw new Error(`Invalid LLM output format: ${argName} must be a string, but its type is "${typeof value}". Full value: ${JSON.stringify(value)}.`);
    return value;
};
// We are NOT checking to make sure in workspace
const validateURI = (uriStr) => {
    if (uriStr === null)
        throw new Error(`Invalid LLM output: uri was null.`);
    if (typeof uriStr !== 'string')
        throw new Error(`Invalid LLM output format: Provided uri must be a string, but it's a(n) ${typeof uriStr}. Full value: ${JSON.stringify(uriStr)}.`);
    // Check if it's already a full URI with scheme (e.g., vscode-remote://, file://, etc.)
    // Look for :// pattern which indicates a scheme is present
    // Examples of supported URIs:
    // - vscode-remote://wsl+Ubuntu/home/user/file.txt (WSL)
    // - vscode-remote://ssh-remote+myserver/home/user/file.txt (SSH)
    // - file:///home/user/file.txt (local file with scheme)
    // - /home/user/file.txt (local file path, will be converted to file://)
    // - C:\Users\file.txt (Windows local path, will be converted to file://)
    if (uriStr.includes('://')) {
        try {
            const uri = URI.parse(uriStr);
            return uri;
        }
        catch (e) {
            // If parsing fails, it's a malformed URI
            throw new Error(`Invalid URI format: ${uriStr}. Error: ${e}`);
        }
    }
    else {
        // No scheme present, treat as file path
        // This handles regular file paths like /home/user/file.txt or C:\Users\file.txt
        const uri = URI.file(uriStr);
        return uri;
    }
};
const validateOptionalURI = (uriStr) => {
    if (isFalsy(uriStr))
        return null;
    return validateURI(uriStr);
};
const validateOptionalStr = (argName, str) => {
    if (isFalsy(str))
        return null;
    return validateStr(argName, str);
};
const validatePageNum = (pageNumberUnknown) => {
    if (!pageNumberUnknown)
        return 1;
    const parsedInt = Number.parseInt(pageNumberUnknown + '');
    if (!Number.isInteger(parsedInt))
        throw new Error(`Page number was not an integer: "${pageNumberUnknown}".`);
    if (parsedInt < 1)
        throw new Error(`Invalid LLM output format: Specified page number must be 1 or greater: "${pageNumberUnknown}".`);
    return parsedInt;
};
const validateNumber = (numStr, opts) => {
    if (typeof numStr === 'number')
        return numStr;
    if (isFalsy(numStr))
        return opts.default;
    if (typeof numStr === 'string') {
        const parsedInt = Number.parseInt(numStr + '');
        if (!Number.isInteger(parsedInt))
            return opts.default;
        return parsedInt;
    }
    return opts.default;
};
const validateProposedTerminalId = (terminalIdUnknown) => {
    if (!terminalIdUnknown)
        throw new Error(`A value for terminalID must be specified, but the value was "${terminalIdUnknown}"`);
    const terminalId = terminalIdUnknown + '';
    return terminalId;
};
const validateBoolean = (b, opts) => {
    if (typeof b === 'string') {
        if (b === 'true')
            return true;
        if (b === 'false')
            return false;
    }
    if (typeof b === 'boolean') {
        return b;
    }
    return opts.default;
};
const checkIfIsFolder = (uriStr) => {
    uriStr = uriStr.trim();
    if (uriStr.endsWith('/') || uriStr.endsWith('\\'))
        return true;
    return false;
};
export const IToolsService = createDecorator('ToolsService');
let ToolsService = class ToolsService {
    constructor(fileService, workspaceContextService, searchService, instantiationService, voidModelService, editCodeService, terminalToolService, commandBarService, directoryStrService, markerService, voidSettingsService, dialogService) {
        this.terminalToolService = terminalToolService;
        this.commandBarService = commandBarService;
        this.directoryStrService = directoryStrService;
        this.markerService = markerService;
        this.voidSettingsService = voidSettingsService;
        this.dialogService = dialogService;
        const queryBuilder = instantiationService.createInstance(QueryBuilder);
        // Helper method to check if terminal command needs approval in Agent Mode
        this._shouldApproveTerminalCommand = () => {
            return this.voidSettingsService.state.globalSettings.chatMode === 'agent';
        };
        this.validateParams = {
            read_file: (params) => {
                const { uri: uriStr, start_line: startLineUnknown, end_line: endLineUnknown, page_number: pageNumberUnknown, } = params;
                const uri = validateURI(uriStr);
                const pageNumber = validatePageNum(pageNumberUnknown);
                let startLine = validateNumber(startLineUnknown, { default: null });
                let endLine = validateNumber(endLineUnknown, { default: null });
                if (startLine !== null && startLine < 1)
                    startLine = null;
                if (endLine !== null && endLine < 1)
                    endLine = null;
                return { uri, startLine, endLine, pageNumber };
            },
            ls_dir: (params) => {
                const { uri: uriStr, page_number: pageNumberUnknown } = params;
                const uri = validateURI(uriStr);
                const pageNumber = validatePageNum(pageNumberUnknown);
                return { uri, pageNumber };
            },
            get_dir_tree: (params) => {
                const { uri: uriStr } = params;
                const uri = validateURI(uriStr);
                return { uri };
            },
            search_pathnames_only: (params) => {
                const { query: queryUnknown, search_in_folder: includeUnknown, page_number: pageNumberUnknown, } = params;
                const queryStr = validateStr('query', queryUnknown);
                const pageNumber = validatePageNum(pageNumberUnknown);
                const includePattern = validateOptionalStr('include_pattern', includeUnknown);
                return { query: queryStr, includePattern, pageNumber };
            },
            search_for_files: (params) => {
                const { query: queryUnknown, search_in_folder: searchInFolderUnknown, is_regex: isRegexUnknown, page_number: pageNumberUnknown, } = params;
                const queryStr = validateStr('query', queryUnknown);
                const pageNumber = validatePageNum(pageNumberUnknown);
                const searchInFolder = validateOptionalURI(searchInFolderUnknown);
                const isRegex = validateBoolean(isRegexUnknown, { default: false });
                return {
                    query: queryStr,
                    isRegex,
                    searchInFolder,
                    pageNumber,
                };
            },
            search_in_file: (params) => {
                const { uri: uriStr, query: queryUnknown, is_regex: isRegexUnknown } = params;
                const uri = validateURI(uriStr);
                const query = validateStr('query', queryUnknown);
                const isRegex = validateBoolean(isRegexUnknown, { default: false });
                return { uri, query, isRegex };
            },
            read_lint_errors: (params) => {
                const { uri: uriUnknown } = params;
                const uri = validateURI(uriUnknown);
                return { uri };
            },
            // ---
            create_file_or_folder: (params) => {
                const { uri: uriUnknown } = params;
                const uri = validateURI(uriUnknown);
                const uriStr = validateStr('uri', uriUnknown);
                const isFolder = checkIfIsFolder(uriStr);
                return { uri, isFolder };
            },
            delete_file_or_folder: (params) => {
                const { uri: uriUnknown, is_recursive: isRecursiveUnknown } = params;
                const uri = validateURI(uriUnknown);
                const isRecursive = validateBoolean(isRecursiveUnknown, { default: false });
                const uriStr = validateStr('uri', uriUnknown);
                const isFolder = checkIfIsFolder(uriStr);
                return { uri, isRecursive, isFolder };
            },
            rewrite_file: (params) => {
                const { uri: uriStr, new_content: newContentUnknown } = params;
                const uri = validateURI(uriStr);
                const newContent = validateStr('newContent', newContentUnknown);
                return { uri, newContent };
            },
            edit_file: (params) => {
                const { uri: uriStr, search_replace_blocks: searchReplaceBlocksUnknown } = params;
                const uri = validateURI(uriStr);
                const searchReplaceBlocks = validateStr('searchReplaceBlocks', searchReplaceBlocksUnknown);
                return { uri, searchReplaceBlocks };
            },
            // ---
            run_command: (params) => {
                const { command: commandUnknown, cwd: cwdUnknown } = params;
                const command = validateStr('command', commandUnknown);
                const cwd = validateOptionalStr('cwd', cwdUnknown);
                const terminalId = generateUuid();
                return { command, cwd, terminalId };
            },
            run_persistent_command: (params) => {
                const { command: commandUnknown, persistent_terminal_id: persistentTerminalIdUnknown } = params;
                const command = validateStr('command', commandUnknown);
                const persistentTerminalId = validateProposedTerminalId(persistentTerminalIdUnknown);
                return { command, persistentTerminalId };
            },
            open_persistent_terminal: (params) => {
                const { cwd: cwdUnknown } = params;
                const cwd = validateOptionalStr('cwd', cwdUnknown);
                // No parameters needed; will open a new background terminal
                return { cwd };
            },
            kill_persistent_terminal: (params) => {
                const { persistent_terminal_id: terminalIdUnknown } = params;
                const persistentTerminalId = validateProposedTerminalId(terminalIdUnknown);
                return { persistentTerminalId };
            },
        };
        this.callTool = {
            read_file: async ({ uri, startLine, endLine, pageNumber }) => {
                await voidModelService.initializeModel(uri);
                const { model } = await voidModelService.getModelSafe(uri);
                if (model === null) {
                    throw new Error(`No contents; File does not exist.`);
                }
                let contents;
                if (startLine === null && endLine === null) {
                    contents = model.getValue(1 /* EndOfLinePreference.LF */);
                }
                else {
                    const startLineNumber = startLine === null ? 1 : startLine;
                    const endLineNumber = endLine === null ? model.getLineCount() : endLine;
                    contents = model.getValueInRange({ startLineNumber, startColumn: 1, endLineNumber, endColumn: Number.MAX_SAFE_INTEGER }, 1 /* EndOfLinePreference.LF */);
                }
                const totalNumLines = model.getLineCount();
                const fromIdx = MAX_FILE_CHARS_PAGE * (pageNumber - 1);
                const toIdx = MAX_FILE_CHARS_PAGE * pageNumber - 1;
                const fileContents = contents.slice(fromIdx, toIdx + 1); // paginate
                const hasNextPage = contents.length - 1 - toIdx >= 1;
                const totalFileLen = contents.length;
                return { result: { fileContents, totalFileLen, hasNextPage, totalNumLines } };
            },
            ls_dir: async ({ uri, pageNumber }) => {
                const dirResult = await computeDirectoryTree1Deep(fileService, uri, pageNumber);
                return { result: dirResult };
            },
            get_dir_tree: async ({ uri }) => {
                const str = await this.directoryStrService.getDirectoryStrTool(uri);
                return { result: { str } };
            },
            search_pathnames_only: async ({ query: queryStr, includePattern, pageNumber }) => {
                const query = queryBuilder.file(workspaceContextService.getWorkspace().folders.map((f) => f.uri), {
                    filePattern: queryStr,
                    includePattern: includePattern ?? undefined,
                    sortByScore: true, // makes results 10x better
                });
                const data = await searchService.fileSearch(query, CancellationToken.None);
                const fromIdx = MAX_CHILDREN_URIs_PAGE * (pageNumber - 1);
                const toIdx = MAX_CHILDREN_URIs_PAGE * pageNumber - 1;
                const uris = data.results
                    .slice(fromIdx, toIdx + 1) // paginate
                    .map(({ resource, results }) => resource);
                const hasNextPage = data.results.length - 1 - toIdx >= 1;
                return { result: { uris, hasNextPage } };
            },
            search_for_files: async ({ query: queryStr, isRegex, searchInFolder, pageNumber }) => {
                const searchFolders = searchInFolder === null
                    ? workspaceContextService.getWorkspace().folders.map((f) => f.uri)
                    : [searchInFolder];
                const query = queryBuilder.text({
                    pattern: queryStr,
                    isRegExp: isRegex,
                }, searchFolders);
                const data = await searchService.textSearch(query, CancellationToken.None);
                const fromIdx = MAX_CHILDREN_URIs_PAGE * (pageNumber - 1);
                const toIdx = MAX_CHILDREN_URIs_PAGE * pageNumber - 1;
                const uris = data.results
                    .slice(fromIdx, toIdx + 1) // paginate
                    .map(({ resource, results }) => resource);
                const hasNextPage = data.results.length - 1 - toIdx >= 1;
                return { result: { queryStr, uris, hasNextPage } };
            },
            search_in_file: async ({ uri, query, isRegex }) => {
                await voidModelService.initializeModel(uri);
                const { model } = await voidModelService.getModelSafe(uri);
                if (model === null) {
                    throw new Error(`No contents; File does not exist.`);
                }
                const contents = model.getValue(1 /* EndOfLinePreference.LF */);
                const contentOfLine = contents.split('\n');
                const totalLines = contentOfLine.length;
                const regex = isRegex ? new RegExp(query) : null;
                const lines = [];
                for (let i = 0; i < totalLines; i++) {
                    const line = contentOfLine[i];
                    if ((isRegex && regex.test(line)) || (!isRegex && line.includes(query))) {
                        const matchLine = i + 1;
                        lines.push(matchLine);
                    }
                }
                return { result: { lines } };
            },
            read_lint_errors: async ({ uri }) => {
                await timeout(1000);
                const { lintErrors } = this._getLintErrors(uri);
                return { result: { lintErrors } };
            },
            // ---
            create_file_or_folder: async ({ uri, isFolder }) => {
                if (isFolder)
                    await fileService.createFolder(uri);
                else {
                    await fileService.createFile(uri);
                }
                return { result: {} };
            },
            delete_file_or_folder: async ({ uri, isRecursive, isFolder }) => {
                await fileService.del(uri, { recursive: isFolder ? true : isRecursive });
                return { result: {} };
            },
            rewrite_file: async ({ uri, newContent }) => {
                await voidModelService.initializeModel(uri);
                if (this.commandBarService.getStreamState(uri) === 'streaming') {
                    throw new Error(`Another LLM is currently making changes to this file. Please stop streaming for now and ask the user to resume later.`);
                }
                await editCodeService.callBeforeApplyOrEdit(uri);
                editCodeService.instantlyRewriteFile({ uri, newContent });
                const lintErrorsPromise = Promise.resolve().then(async () => {
                    await timeout(2000);
                    const { lintErrors } = this._getLintErrors(uri);
                    return { lintErrors };
                });
                return { result: lintErrorsPromise };
            },
            edit_file: async ({ uri, searchReplaceBlocks }) => {
                await voidModelService.initializeModel(uri);
                if (this.commandBarService.getStreamState(uri) === 'streaming') {
                    throw new Error(`Another LLM is currently making changes to this file. Please stop streaming for now and ask the user to resume later.`);
                }
                await editCodeService.callBeforeApplyOrEdit(uri);
                editCodeService.instantlyApplySearchReplaceBlocks({ uri, searchReplaceBlocks });
                const lintErrorsPromise = Promise.resolve().then(async () => {
                    await timeout(2000);
                    const { lintErrors } = this._getLintErrors(uri);
                    return { lintErrors };
                });
                return { result: lintErrorsPromise };
            },
            run_command: async ({ command, cwd, terminalId }) => {
                // Require approval for terminal commands in Agent Mode
                if (this._shouldApproveTerminalCommand()) {
                    const result = await this.dialogService.confirm({
                        type: 'question',
                        message: 'Agent Mode: Execute Terminal Command',
                        detail: `Command: ${command}${cwd ? `\nWorking directory: ${cwd}` : ''}\n\nAllow the AI agent to run this terminal command?`,
                        primaryButton: 'Allow',
                        cancelButton: 'Deny',
                    });
                    if (!result.confirmed) {
                        throw new Error('Terminal command execution was denied by the user.');
                    }
                }
                const { resPromise, interrupt } = await this.terminalToolService.runCommand(command, {
                    type: 'temporary',
                    cwd,
                    terminalId,
                });
                return { result: resPromise, interruptTool: interrupt };
            },
            run_persistent_command: async ({ command, persistentTerminalId }) => {
                // Require approval for terminal commands in Agent Mode
                if (this._shouldApproveTerminalCommand()) {
                    const result = await this.dialogService.confirm({
                        type: 'question',
                        message: 'Agent Mode: Execute Terminal Command',
                        detail: `Command: ${command}\nTerminal: ${persistentTerminalId}\n\nAllow the AI agent to run this terminal command?`,
                        primaryButton: 'Allow',
                        cancelButton: 'Deny',
                    });
                    if (!result.confirmed) {
                        throw new Error('Terminal command execution was denied by the user.');
                    }
                }
                const { resPromise, interrupt } = await this.terminalToolService.runCommand(command, {
                    type: 'persistent',
                    persistentTerminalId,
                });
                return { result: resPromise, interruptTool: interrupt };
            },
            open_persistent_terminal: async ({ cwd }) => {
                const persistentTerminalId = await this.terminalToolService.createPersistentTerminal({
                    cwd,
                });
                return { result: { persistentTerminalId } };
            },
            kill_persistent_terminal: async ({ persistentTerminalId }) => {
                // Close the background terminal by sending exit
                await this.terminalToolService.killPersistentTerminal(persistentTerminalId);
                return { result: {} };
            },
        };
        const nextPageStr = (hasNextPage) => (hasNextPage ? '\n\n(more on next page...)' : '');
        const stringifyLintErrors = (lintErrors) => {
            return lintErrors
                .map((e, i) => `Error ${i + 1}:\nLines Affected: ${e.startLineNumber}-${e.endLineNumber}\nError message:${e.message}`)
                .join('\n\n')
                .substring(0, MAX_FILE_CHARS_PAGE);
        };
        // given to the LLM after the call for successful tool calls
        this.stringOfResult = {
            read_file: (params, result) => {
                return `${params.uri.fsPath}\n\`\`\`\n${result.fileContents}\n\`\`\`${nextPageStr(result.hasNextPage)}${result.hasNextPage ? `\nMore info because truncated: this file has ${result.totalNumLines} lines, or ${result.totalFileLen} characters.` : ''}`;
            },
            ls_dir: (params, result) => {
                const dirTreeStr = stringifyDirectoryTree1Deep(params, result);
                return dirTreeStr; // + nextPageStr(result.hasNextPage) // already handles num results remaining
            },
            get_dir_tree: (params, result) => {
                return result.str;
            },
            search_pathnames_only: (params, result) => {
                return result.uris.map((uri) => uri.fsPath).join('\n') + nextPageStr(result.hasNextPage);
            },
            search_for_files: (params, result) => {
                return result.uris.map((uri) => uri.fsPath).join('\n') + nextPageStr(result.hasNextPage);
            },
            search_in_file: (params, result) => {
                const { model } = voidModelService.getModel(params.uri);
                if (!model)
                    return '<Error getting string of result>';
                const lines = result.lines
                    .map((n) => {
                    const lineContent = model.getValueInRange({
                        startLineNumber: n,
                        startColumn: 1,
                        endLineNumber: n,
                        endColumn: Number.MAX_SAFE_INTEGER,
                    }, 1 /* EndOfLinePreference.LF */);
                    return `Line ${n}:\n\`\`\`\n${lineContent}\n\`\`\``;
                })
                    .join('\n\n');
                return lines;
            },
            read_lint_errors: (params, result) => {
                return result.lintErrors ? stringifyLintErrors(result.lintErrors) : 'No lint errors found.';
            },
            // ---
            create_file_or_folder: (params, result) => {
                return `URI ${params.uri.fsPath} successfully created.`;
            },
            delete_file_or_folder: (params, result) => {
                return `URI ${params.uri.fsPath} successfully deleted.`;
            },
            edit_file: (params, result) => {
                const lintErrsString = this.voidSettingsService.state.globalSettings.includeToolLintErrors
                    ? result.lintErrors
                        ? ` Lint errors found after change:\n${stringifyLintErrors(result.lintErrors)}.\nIf this is related to a change made while calling this tool, you might want to fix the error.`
                        : ` No lint errors found.`
                    : '';
                return `Change successfully made to ${params.uri.fsPath}.${lintErrsString}`;
            },
            rewrite_file: (params, result) => {
                const lintErrsString = this.voidSettingsService.state.globalSettings.includeToolLintErrors
                    ? result.lintErrors
                        ? ` Lint errors found after change:\n${stringifyLintErrors(result.lintErrors)}.\nIf this is related to a change made while calling this tool, you might want to fix the error.`
                        : ` No lint errors found.`
                    : '';
                return `Change successfully made to ${params.uri.fsPath}.${lintErrsString}`;
            },
            run_command: (params, result) => {
                const { resolveReason, result: result_ } = result;
                // success
                if (resolveReason.type === 'done') {
                    return `${result_}\n(exit code ${resolveReason.exitCode})`;
                }
                // normal command
                if (resolveReason.type === 'timeout') {
                    return `${result_}\nTerminal command ran, but was automatically killed by Void after ${MAX_TERMINAL_INACTIVE_TIME}s of inactivity and did not finish successfully. To try with more time, open a persistent terminal and run the command there.`;
                }
                throw new Error(`Unexpected internal error: Terminal command did not resolve with a valid reason.`);
            },
            run_persistent_command: (params, result) => {
                const { resolveReason, result: result_ } = result;
                const { persistentTerminalId } = params;
                // success
                if (resolveReason.type === 'done') {
                    return `${result_}\n(exit code ${resolveReason.exitCode})`;
                }
                // bg command
                if (resolveReason.type === 'timeout') {
                    return `${result_}\nTerminal command is running in terminal ${persistentTerminalId}. The given outputs are the results after ${MAX_TERMINAL_BG_COMMAND_TIME} seconds.`;
                }
                throw new Error(`Unexpected internal error: Terminal command did not resolve with a valid reason.`);
            },
            open_persistent_terminal: (_params, result) => {
                const { persistentTerminalId } = result;
                return `Successfully created persistent terminal. persistentTerminalId="${persistentTerminalId}"`;
            },
            kill_persistent_terminal: (params, _result) => {
                return `Successfully closed terminal "${params.persistentTerminalId}".`;
            },
        };
    }
    _getLintErrors(uri) {
        const lintErrors = this.markerService
            .read({ resource: uri })
            .filter((l) => l.severity === MarkerSeverity.Error || l.severity === MarkerSeverity.Warning)
            .slice(0, 100)
            .map((l) => ({
            code: typeof l.code === 'string' ? l.code : l.code?.value || '',
            message: (l.severity === MarkerSeverity.Error ? '(error) ' : '(warning) ') + l.message,
            startLineNumber: l.startLineNumber,
            endLineNumber: l.endLineNumber,
        }));
        if (!lintErrors.length)
            return { lintErrors: null };
        return { lintErrors };
    }
};
ToolsService = __decorate([
    __param(0, IFileService),
    __param(1, IWorkspaceContextService),
    __param(2, ISearchService),
    __param(3, IInstantiationService),
    __param(4, IVoidModelService),
    __param(5, IEditCodeService),
    __param(6, ITerminalToolService),
    __param(7, IVoidCommandBarService),
    __param(8, IDirectoryStrService),
    __param(9, IMarkerService),
    __param(10, IVoidSettingsService),
    __param(11, IDialogService)
], ToolsService);
export { ToolsService };
registerSingleton(IToolsService, ToolsService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvdG9vbHNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTixlQUFlLEVBQ2YscUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQU8vRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuRSxPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLG9CQUFvQixFQUNwQiwyQkFBMkIsR0FDM0IsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9GLE9BQU8sRUFB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