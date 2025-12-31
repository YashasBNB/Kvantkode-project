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
    constructor(fileService, workspaceContextService, searchService, instantiationService, voidModelService, editCodeService, terminalToolService, commandBarService, directoryStrService, markerService, voidSettingsService) {
        this.terminalToolService = terminalToolService;
        this.commandBarService = commandBarService;
        this.directoryStrService = directoryStrService;
        this.markerService = markerService;
        this.voidSettingsService = voidSettingsService;
        const queryBuilder = instantiationService.createInstance(QueryBuilder);
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
            delete_file_or_folder: async ({ uri, isRecursive }) => {
                await fileService.del(uri, { recursive: isRecursive });
                return { result: {} };
            },
            rewrite_file: async ({ uri, newContent }) => {
                await voidModelService.initializeModel(uri);
                if (this.commandBarService.getStreamState(uri) === 'streaming') {
                    throw new Error(`Another LLM is currently making changes to this file. Please stop streaming for now and ask the user to resume later.`);
                }
                await editCodeService.callBeforeApplyOrEdit(uri);
                editCodeService.instantlyRewriteFile({ uri, newContent });
                // at end, get lint errors
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
                // at end, get lint errors
                const lintErrorsPromise = Promise.resolve().then(async () => {
                    await timeout(2000);
                    const { lintErrors } = this._getLintErrors(uri);
                    return { lintErrors };
                });
                return { result: lintErrorsPromise };
            },
            // ---
            run_command: async ({ command, cwd, terminalId }) => {
                const { resPromise, interrupt } = await this.terminalToolService.runCommand(command, {
                    type: 'temporary',
                    cwd,
                    terminalId,
                });
                return { result: resPromise, interruptTool: interrupt };
            },
            run_persistent_command: async ({ command, persistentTerminalId }) => {
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
    __param(10, IVoidSettingsService)
], ToolsService);
export { ToolsService };
registerSingleton(IToolsService, ToolsService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL3Rvb2xzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sZUFBZSxFQUNmLHFCQUFxQixHQUNyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFPL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFakUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbkUsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixvQkFBb0IsRUFDcEIsMkJBQTJCLEdBQzNCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtD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