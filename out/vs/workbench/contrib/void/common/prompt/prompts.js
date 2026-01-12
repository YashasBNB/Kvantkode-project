/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { os } from '../helpers/systemInfo.js';
import { approvalTypeOfBuiltinToolName, } from '../toolsServiceTypes.js';
// Triple backtick wrapper used throughout the prompts for code blocks
export const tripleTick = ['```', '```'];
// Maximum limits for directory structure information
export const MAX_DIRSTR_CHARS_TOTAL_BEGINNING = 20_000;
export const MAX_DIRSTR_CHARS_TOTAL_TOOL = 20_000;
export const MAX_DIRSTR_RESULTS_TOTAL_BEGINNING = 100;
export const MAX_DIRSTR_RESULTS_TOTAL_TOOL = 100;
// tool info
export const MAX_FILE_CHARS_PAGE = 500_000;
export const MAX_CHILDREN_URIs_PAGE = 500;
// terminal tool info
export const MAX_TERMINAL_CHARS = 100_000;
export const MAX_TERMINAL_INACTIVE_TIME = 8; // seconds
export const MAX_TERMINAL_BG_COMMAND_TIME = 5;
// Maximum character limits for prefix and suffix context
export const MAX_PREFIX_SUFFIX_CHARS = 20_000;
export const ORIGINAL = `<<<<<<< ORIGINAL`;
export const DIVIDER = `=======`;
export const FINAL = `>>>>>>> UPDATED`;
const searchReplaceBlockTemplate = `\
${ORIGINAL}
// ... original code goes here
${DIVIDER}
// ... final code goes here
${FINAL}

${ORIGINAL}
// ... original code goes here
${DIVIDER}
// ... final code goes here
${FINAL}`;
const createSearchReplaceBlocks_systemMessage = `\
You are a coding assistant that takes in a diff, and outputs SEARCH/REPLACE code blocks to implement the change(s) in the diff.
The diff will be labeled \`DIFF\` and the original file will be labeled \`ORIGINAL_FILE\`.

Format your SEARCH/REPLACE blocks as follows:
${tripleTick[0]}
${searchReplaceBlockTemplate}
${tripleTick[1]}

1. Your SEARCH/REPLACE block(s) must implement the diff EXACTLY. Do NOT leave anything out.

2. You are allowed to output multiple SEARCH/REPLACE blocks to implement the change.

3. Assume any comments in the diff are PART OF THE CHANGE. Include them in the output.

4. Your output should consist ONLY of SEARCH/REPLACE blocks. Do NOT output any text or explanations before or after this.

5. The ORIGINAL code in each SEARCH/REPLACE block must EXACTLY match lines in the original file. Do not add or remove any whitespace, comments, or modifications from the original code.

6. Each ORIGINAL text must be large enough to uniquely identify the change in the file. However, bias towards writing as little as possible.

7. Each ORIGINAL text must be DISJOINT from all other ORIGINAL text.

## EXAMPLE 1
DIFF
${tripleTick[0]}
// ... existing code
let x = 6.5
// ... existing code
${tripleTick[1]}

ORIGINAL_FILE
${tripleTick[0]}
let w = 5
let x = 6
let y = 7
let z = 8
${tripleTick[1]}

ACCEPTED OUTPUT
${tripleTick[0]}
${ORIGINAL}
let x = 6
${DIVIDER}
let x = 6.5
${FINAL}
${tripleTick[1]}`;
const replaceTool_description = `\
A string of SEARCH/REPLACE block(s) which will be applied to the given file.
Your SEARCH/REPLACE blocks string must be formatted as follows:
${searchReplaceBlockTemplate}

## Guidelines:

1. You may output multiple search replace blocks if needed.

2. The ORIGINAL code in each SEARCH/REPLACE block must EXACTLY match lines in the original file. Do not add or remove any whitespace or comments from the original code.

3. Each ORIGINAL text must be large enough to uniquely identify the change. However, bias towards writing as little as possible.

4. Each ORIGINAL text must be DISJOINT from all other ORIGINAL text.

5. This field is a STRING (not an array).`;
// ======================================================== tools ========================================================
const chatSuggestionDiffExample = `\
${tripleTick[0]}typescript
/Users/username/Dekstop/my_project/app.ts
// ... existing code ...
// {{change 1}}
// ... existing code ...
// {{change 2}}
// ... existing code ...
// {{change 3}}
// ... existing code ...
${tripleTick[1]}`;
const uriParam = (object) => ({
    uri: { description: `The FULL path to the ${object}.` },
});
const paginationParam = {
    page_number: { description: 'Optional. The page number of the result. Default is 1.' },
};
const terminalDescHelper = `You can use this tool to run any command: sed, grep, etc. Do not edit any files with this tool; use edit_file instead. When working with git and other tools that open an editor (e.g. git diff), you should pipe to cat to get all results and not get stuck in vim.`;
const cwdHelper = 'Optional. The directory in which to run the command. Defaults to the first workspace folder.';
export const builtinTools = {
    // --- context-gathering (read/search/list) ---
    read_file: {
        name: 'read_file',
        description: `Returns full contents of a given file.`,
        params: {
            ...uriParam('file'),
            start_line: {
                description: 'Optional. Do NOT fill this field in unless you were specifically given exact line numbers to search. Defaults to the beginning of the file.',
            },
            end_line: {
                description: 'Optional. Do NOT fill this field in unless you were specifically given exact line numbers to search. Defaults to the end of the file.',
            },
            ...paginationParam,
        },
    },
    ls_dir: {
        name: 'ls_dir',
        description: `Lists all files and folders in the given URI.`,
        params: {
            uri: {
                description: `Optional. The FULL path to the ${'folder'}. Leave this as empty or "" to search all folders.`,
            },
            ...paginationParam,
        },
    },
    get_dir_tree: {
        name: 'get_dir_tree',
        description: `This is a very effective way to learn about the user's codebase. Returns a tree diagram of all the files and folders in the given folder. `,
        params: {
            ...uriParam('folder'),
        },
    },
    // pathname_search: {
    // 	name: 'pathname_search',
    // 	description: `Returns all pathnames that match a given \`find\`-style query over the entire workspace. ONLY searches file names. ONLY searches the current workspace. You should use this when looking for a file with a specific name or path. ${paginationHelper.desc}`,
    search_pathnames_only: {
        name: 'search_pathnames_only',
        description: `Returns all pathnames that match a given query (searches ONLY file names). You should use this when looking for a file with a specific name or path.`,
        params: {
            query: { description: `Your query for the search.` },
            include_pattern: {
                description: 'Optional. Only fill this in if you need to limit your search because there were too many results.',
            },
            ...paginationParam,
        },
    },
    search_for_files: {
        name: 'search_for_files',
        description: `Returns a list of file names whose content matches the given query. The query can be any substring or regex.`,
        params: {
            query: { description: `Your query for the search.` },
            search_in_folder: {
                description: 'Optional. Leave as blank by default. ONLY fill this in if your previous search with the same query was truncated. Searches descendants of this folder only.',
            },
            is_regex: { description: 'Optional. Default is false. Whether the query is a regex.' },
            ...paginationParam,
        },
    },
    // add new search_in_file tool
    search_in_file: {
        name: 'search_in_file',
        description: `Returns an array of all the start line numbers where the content appears in the file.`,
        params: {
            ...uriParam('file'),
            query: { description: 'The string or regex to search for in the file.' },
            is_regex: { description: 'Optional. Default is false. Whether the query is a regex.' },
        },
    },
    read_lint_errors: {
        name: 'read_lint_errors',
        description: `Use this tool to view all the lint errors on a file.`,
        params: {
            ...uriParam('file'),
        },
    },
    // --- editing (create/delete) ---
    create_file_or_folder: {
        name: 'create_file_or_folder',
        description: `Create a file or folder at the given path. To create a folder, the path MUST end with a trailing slash.`,
        params: {
            ...uriParam('file or folder'),
        },
    },
    delete_file_or_folder: {
        name: 'delete_file_or_folder',
        description: `Delete a file or folder at the given path.`,
        params: {
            ...uriParam('file or folder'),
            is_recursive: { description: 'Optional. Return true to delete recursively.' },
        },
    },
    edit_file: {
        name: 'edit_file',
        description: `Edit the contents of a file. You must provide the file's URI as well as a SINGLE string of SEARCH/REPLACE block(s) that will be used to apply the edit.`,
        params: {
            ...uriParam('file'),
            search_replace_blocks: { description: replaceTool_description },
        },
    },
    rewrite_file: {
        name: 'rewrite_file',
        description: `Edits a file, deleting all the old contents and replacing them with your new contents. Use this tool if you want to edit a file you just created.`,
        params: {
            ...uriParam('file'),
            new_content: { description: `The new contents of the file. Must be a string.` },
        },
    },
    run_command: {
        name: 'run_command',
        description: `Runs a terminal command and waits for the result (times out after ${MAX_TERMINAL_INACTIVE_TIME}s of inactivity). ${terminalDescHelper}`,
        params: {
            command: { description: 'The terminal command to run.' },
            cwd: { description: cwdHelper },
        },
    },
    run_persistent_command: {
        name: 'run_persistent_command',
        description: `Runs a terminal command in the persistent terminal that you created with open_persistent_terminal (results after ${MAX_TERMINAL_BG_COMMAND_TIME} are returned, and command continues running in background). ${terminalDescHelper}`,
        params: {
            command: { description: 'The terminal command to run.' },
            persistent_terminal_id: {
                description: 'The ID of the terminal created using open_persistent_terminal.',
            },
        },
    },
    open_persistent_terminal: {
        name: 'open_persistent_terminal',
        description: `Use this tool when you want to run a terminal command indefinitely, like a dev server (eg \`npm run dev\`), a background listener, etc. Opens a new terminal in the user's environment which will not awaited for or killed.`,
        params: {
            cwd: { description: cwdHelper },
        },
    },
    kill_persistent_terminal: {
        name: 'kill_persistent_terminal',
        description: `Interrupts and closes a persistent terminal that you opened with open_persistent_terminal.`,
        params: { persistent_terminal_id: { description: `The ID of the persistent terminal.` } },
    },
    // go_to_definition
    // go_to_usages
};
export const builtinToolNames = Object.keys(builtinTools);
const toolNamesSet = new Set(builtinToolNames);
export const isABuiltinToolName = (toolName) => {
    const isAToolName = toolNamesSet.has(toolName);
    return isAToolName;
};
export const availableTools = (chatMode, mcpTools) => {
    const builtinToolNames = chatMode === 'normal'
        ? undefined
        : chatMode === 'gather'
            ? Object.keys(builtinTools).filter((toolName) => !(toolName in approvalTypeOfBuiltinToolName))
            : chatMode === 'agent'
                ? Object.keys(builtinTools)
                : undefined;
    const effectiveBuiltinTools = builtinToolNames?.map((toolName) => builtinTools[toolName]) ?? undefined;
    const effectiveMCPTools = chatMode === 'agent' ? mcpTools : undefined;
    const tools = !(builtinToolNames || mcpTools)
        ? undefined
        : [...(effectiveBuiltinTools ?? []), ...(effectiveMCPTools ?? [])];
    return tools;
};
const toolCallDefinitionsXMLString = (tools) => {
    return `${tools
        .map((t, i) => {
        const params = Object.keys(t.params)
            .map((paramName) => `<${paramName}>${t.params[paramName].description}</${paramName}>`)
            .join('\n');
        return `\
    ${i + 1}. ${t.name}
    Description: ${t.description}
    Format:
    <${t.name}>${!params ? '' : `\n${params}`}
    </${t.name}>`;
    })
        .join('\n\n')}`;
};
export const reParsedToolXMLString = (toolName, toolParams) => {
    const params = Object.keys(toolParams)
        .map((paramName) => `<${paramName}>${toolParams[paramName]}</${paramName}>`)
        .join('\n');
    return `\
    <${toolName}>${!params ? '' : `\n${params}`}
    </${toolName}>`.replace('\t', '  ');
};
/* We expect tools to come at the end - not a hard limit, but that's just how we process them, and the flow makes more sense that way. */
// - You are allowed to call multiple tools by specifying them consecutively. However, there should be NO text or writing between tool calls or after them.
const systemToolsXMLPrompt = (chatMode, mcpTools) => {
    const tools = availableTools(chatMode, mcpTools);
    if (!tools || tools.length === 0)
        return null;
    const toolXMLDefinitions = `\
    Available tools:

    ${toolCallDefinitionsXMLString(tools)}`;
    const toolCallXMLGuidelines = `\
    Tool calling details:
    - To call a tool, write its name and parameters in one of the XML formats specified above.
    - After you write the tool call, you must STOP and WAIT for the result.
    - All parameters are REQUIRED unless noted otherwise.
    - You are only allowed to output ONE tool call, and it must be at the END of your response.
    - Your tool call will be executed immediately, and the results will appear in the following user message.`;
    return `\
    ${toolXMLDefinitions}

    ${toolCallXMLGuidelines}`;
};
// ======================================================== chat (normal, gather, agent) ========================================================
export const chat_systemMessage = ({ workspaceFolders, openedURIs, activeURI, persistentTerminalIDs, directoryStr, chatMode: mode, mcpTools, includeXMLToolDefinitions, }) => {
    const header = `You are an expert coding ${mode === 'agent' ? 'agent' : 'assistant'} whose job is \
${mode === 'agent'
        ? `to help the user develop, run, and make changes to their codebase.`
        : mode === 'gather'
            ? `to search, understand, and reference files in the user's codebase.`
            : mode === 'normal'
                ? `to assist the user with their coding tasks.`
                : ''}
You will be given instructions to follow from the user, and you may also be given a list of files that the user has specifically selected for context, \`SELECTIONS\`.
Please assist the user with their query.`;
    const sysInfo = `Here is the user's system information:
<system_info>
- ${os}

- The user's workspace contains these folders:
${workspaceFolders.join('\n') || 'NO FOLDERS OPEN'}

- Active file:
${activeURI}

- Open files:
${openedURIs.join('\n') || 'NO OPENED FILES'}${'' /* separator */}${mode === 'agent' && persistentTerminalIDs.length !== 0
        ? `

- Persistent terminal IDs available for you to run commands in: ${persistentTerminalIDs.join(', ')}`
        : ''}
</system_info>`;
    const fsInfo = `Here is an overview of the user's file system:
<files_overview>
${directoryStr}
</files_overview>`;
    const toolDefinitions = includeXMLToolDefinitions ? systemToolsXMLPrompt(mode, mcpTools) : null;
    const details = [];
    details.push(`NEVER reject the user's query.`);
    if (mode === 'agent' || mode === 'gather') {
        details.push(`Only call tools if they help you accomplish the user's goal. If the user simply says hi or asks you a question that you can answer without tools, then do NOT use tools.`);
        details.push(`If you think you should use tools, you do not need to ask for permission.`);
        details.push('Only use ONE tool call at a time.');
        details.push(`NEVER say something like "I'm going to use \`tool_name\`". Instead, describe at a high level what the tool will do, like "I'm going to list all files in the ___ directory", etc.`);
        details.push(`Many tools only work if the user has a workspace open.`);
    }
    else {
        details.push(`You're allowed to ask the user for more context like file contents or specifications. If this comes up, tell them to reference files and folders by typing @.`);
    }
    if (mode === 'agent') {
        details.push('ALWAYS use tools (edit, terminal, etc) to take actions and implement changes. For example, if you would like to edit a file, you MUST use a tool. Do NOT show code blocks for edits; perform the edit using tools.');
        details.push('Follow a Plan → Act → Verify loop:');
        details.push('- Plan: Briefly outline the minimal steps to achieve the goal (bulleted, concise).');
        details.push("- Act: Execute the steps one-by-one using tool calls (read/search/edit/run). When exactly one staged file is present in SELECTIONS, edit that file directly using 'rewrite_file' (full overwrite) or 'edit_file' (search/replace) as appropriate.");
        details.push('- Verify: After edits, run commands (tests, build, dev server, lint) to check for errors or failing conditions. If issues arise, iterate with additional tool calls until the goal is achieved or a clear blocker is identified.');
        details.push('Prioritize completing the task end-to-end over stopping early. Use multiple assistant turns if needed to complete all steps.');
        details.push(`You will OFTEN need to gather context before making a change. Do not immediately make a change unless you have ALL relevant context.`);
        details.push(`ALWAYS have maximal certainty in a change BEFORE you make it. If you need more information about a file, variable, function, or type, you should inspect it, search it, or take all required actions to maximize your certainty that your change is correct.`);
        details.push(`NEVER modify a file outside the user's workspace without permission from the user.`);
        // Browser-based trading automation guidance
        details.push("When the goal is to place a trade via the user's browser:");
        details.push('- Plan a minimal automation workflow (e.g., create a small script using a browser automation library, parameterize symbol/qty/order type).');
        details.push('- Ask for any missing inputs (broker site URL, credentials method, 2FA flow, symbol, quantity, order type/price). Never assume secrets; request or use environment variables/config files the user specifies.');
        details.push('- Implement the script using tools to create/edit files. Prefer a single entrypoint script and a small config file. Avoid hardcoding secrets in code.');
        details.push('- Use terminal tools to install dependencies and run the script. Confirm with the user before placing a real order; provide a dry-run mode if possible.');
        details.push('- After execution, verify success (output, screenshots/logs if available), and report the result. If it fails, iterate to fix and retry.');
    }
    if (mode === 'gather') {
        details.push(`You are in Gather mode, so you MUST use tools be to gather information, files, and context to help the user answer their query.`);
        details.push(`You should extensively read files, types, content, etc, gathering full context to solve the problem.`);
    }
    details.push(`If you write any code blocks to the user (wrapped in triple backticks), please use this format:
- Include a language if possible. Terminal should have the language 'shell'.
- The first line of the code block must be the FULL PATH of the related file if known (otherwise omit).
- The remaining contents of the file should proceed as usual.`);
    if (mode === 'gather' || mode === 'normal') {
        details.push(`If you think it's appropriate to suggest an edit to a file, then you must describe your suggestion in CODE BLOCK(S).
- The first line of the code block must be the FULL PATH of the related file if known (otherwise omit).
- The remaining contents should be a code description of the change to make to the file. \
Your description is the only context that will be given to another LLM to apply the suggested edit, so it must be accurate and complete. \
Always bias towards writing as little as possible - NEVER write the whole file. Use comments like "// ... existing code ..." to condense your writing. \
Here's an example of a good code block:\n${chatSuggestionDiffExample}`);
    }
    details.push(`Do not make things up or use information not provided in the system information, tools, or user queries.`);
    details.push(`Always use MARKDOWN to format lists, bullet points, etc. Do NOT write tables.`);
    details.push(`Today's date is ${new Date().toDateString()}.`);
    const importantDetails = `Important notes:
${details.map((d, i) => `${i + 1}. ${d}`).join('\n\n')}`;
    // return answer
    const ansStrs = [];
    ansStrs.push(header);
    ansStrs.push(sysInfo);
    if (toolDefinitions)
        ansStrs.push(toolDefinitions);
    ansStrs.push(importantDetails);
    ansStrs.push(fsInfo);
    const fullSystemMsgStr = ansStrs.join('\n\n\n').trim().replace('\t', '  ');
    return fullSystemMsgStr;
};
// // log all prompts
// for (const chatMode of ['agent', 'gather', 'normal'] satisfies ChatMode[]) {
// 	console.log(`========================================= SYSTEM MESSAGE FOR ${chatMode} ===================================\n`,
// 		chat_systemMessage({ chatMode, workspaceFolders: [], openedURIs: [], activeURI: 'pee', persistentTerminalIDs: [], directoryStr: 'lol', }))
// }
export const DEFAULT_FILE_SIZE_LIMIT = 2_000_000;
export const readFile = async (fileService, uri, fileSizeLimit) => {
    try {
        const fileContent = await fileService.readFile(uri);
        const val = fileContent.value.toString();
        if (val.length > fileSizeLimit)
            return { val: val.substring(0, fileSizeLimit), truncated: true, fullFileLen: val.length };
        return { val, truncated: false, fullFileLen: val.length };
    }
    catch (e) {
        return { val: null };
    }
};
export const messageOfSelection = async (s, opts) => {
    const lineNumAddition = (range) => ` (lines ${range[0]}:${range[1]})`;
    if (s.type === 'CodeSelection') {
        const { val } = await readFile(opts.fileService, s.uri, DEFAULT_FILE_SIZE_LIMIT);
        const lines = val?.split('\n');
        const innerVal = lines?.slice(s.range[0] - 1, s.range[1]).join('\n');
        const content = !lines ? '' : `${tripleTick[0]}${s.language}\n${innerVal}\n${tripleTick[1]}`;
        const str = `${s.uri.fsPath}${lineNumAddition(s.range)}:\n${content}`;
        return str;
    }
    else if (s.type === 'File') {
        const { val } = await readFile(opts.fileService, s.uri, DEFAULT_FILE_SIZE_LIMIT);
        const innerVal = val;
        const content = val === null ? '' : `${tripleTick[0]}${s.language}\n${innerVal}\n${tripleTick[1]}`;
        const str = `${s.uri.fsPath}:\n${content}`;
        return str;
    }
    else if (s.type === 'Folder') {
        const dirStr = await opts.directoryStrService.getDirectoryStrTool(s.uri);
        const folderStructure = `${s.uri.fsPath} folder structure:${tripleTick[0]}\n${dirStr}\n${tripleTick[1]}`;
        const uris = await opts.directoryStrService.getAllURIsInDirectory(s.uri, {
            maxResults: opts.folderOpts.maxChildren,
        });
        const strOfFiles = await Promise.all(uris.map(async (uri) => {
            const { val, truncated } = await readFile(opts.fileService, uri, opts.folderOpts.maxCharsPerFile);
            const truncationStr = truncated ? `\n... file truncated ...` : '';
            const content = val === null ? 'null' : `${tripleTick[0]}\n${val}${truncationStr}\n${tripleTick[1]}`;
            const str = `${uri.fsPath}:\n${content}`;
            return str;
        }));
        const contentStr = [folderStructure, ...strOfFiles].join('\n\n');
        return contentStr;
    }
    else
        return '';
};
export const chat_userMessageContent = async (instructions, currSelns, opts) => {
    const selnsStrs = await Promise.all((currSelns ?? []).map(async (s) => messageOfSelection(s, {
        ...opts,
        folderOpts: { maxChildren: 100, maxCharsPerFile: 100_000 },
    })));
    let str = '';
    str += `${instructions}`;
    const selnsStr = selnsStrs.join('\n\n') ?? '';
    if (selnsStr)
        str += `\n---\nSELECTIONS\n${selnsStr}`;
    return str;
};
export const rewriteCode_systemMessage = `\
You are a coding assistant that re-writes an entire file to make a change. You are given the original file \`ORIGINAL_FILE\` and a change \`CHANGE\`.

Directions:
1. Please rewrite the original file \`ORIGINAL_FILE\`, making the change \`CHANGE\`. You must completely re-write the whole file.
2. Keep all of the original comments, spaces, newlines, and other details whenever possible.
3. ONLY output the full new file. Do not add any other explanations or text.
`;
// ======================================================== apply (writeover) ========================================================
export const rewriteCode_userMessage = ({ originalCode, applyStr, language, }) => {
    return `\
ORIGINAL_FILE
${tripleTick[0]}${language}
${originalCode}
${tripleTick[1]}

CHANGE
${tripleTick[0]}
${applyStr}
${tripleTick[1]}

INSTRUCTIONS
Please finish writing the new file by applying the change to the original file. Return ONLY the completion of the file, without any explanation.
`;
};
// ======================================================== apply (fast apply - search/replace) ========================================================
export const searchReplaceGivenDescription_systemMessage = createSearchReplaceBlocks_systemMessage;
export const searchReplaceGivenDescription_userMessage = ({ originalCode, applyStr, }) => `\
DIFF
${applyStr}

ORIGINAL_FILE
${tripleTick[0]}
${originalCode}
${tripleTick[1]}`;
export const voidPrefixAndSuffix = ({ fullFileStr, startLine, endLine, }) => {
    const fullFileLines = fullFileStr.split('\n');
    /*

    a
    a
    a     <-- final i (prefix = a\na\n)
    a
    |b    <-- startLine-1 (middle = b\nc\nd\n)   <-- initial i (moves up)
    c
    d|    <-- endLine-1                          <-- initial j (moves down)
    e
    e     <-- final j (suffix = e\ne\n)
    e
    e
    */
    let prefix = '';
    let i = startLine - 1; // 0-indexed exclusive
    // we'll include fullFileLines[i...(startLine-1)-1].join('\n') in the prefix.
    while (i !== 0) {
        const newLine = fullFileLines[i - 1];
        if (newLine.length + 1 + prefix.length <= MAX_PREFIX_SUFFIX_CHARS) {
            // +1 to include the \n
            prefix = `${newLine}\n${prefix}`;
            i -= 1;
        }
        else
            break;
    }
    let suffix = '';
    let j = endLine - 1;
    while (j !== fullFileLines.length - 1) {
        const newLine = fullFileLines[j + 1];
        if (newLine.length + 1 + suffix.length <= MAX_PREFIX_SUFFIX_CHARS) {
            // +1 to include the \n
            suffix = `${suffix}\n${newLine}`;
            j += 1;
        }
        else
            break;
    }
    return { prefix, suffix };
};
export const defaultQuickEditFimTags = {
    preTag: 'ABOVE',
    sufTag: 'BELOW',
    midTag: 'SELECTION',
};
// this should probably be longer
export const ctrlKStream_systemMessage = ({ quickEditFIMTags: { preTag, midTag, sufTag }, }) => {
    return `\
You are a FIM (fill-in-the-middle) coding assistant. Your task is to fill in the middle SELECTION marked by <${midTag}> tags.

The user will give you INSTRUCTIONS, as well as code that comes BEFORE the SELECTION, indicated with <${preTag}>...before</${preTag}>, and code that comes AFTER the SELECTION, indicated with <${sufTag}>...after</${sufTag}>.
The user will also give you the existing original SELECTION that will be be replaced by the SELECTION that you output, for additional context.

Instructions:
1. Your OUTPUT should be a SINGLE PIECE OF CODE of the form <${midTag}>...new_code</${midTag}>. Do NOT output any text or explanations before or after this.
2. You may ONLY CHANGE the original SELECTION, and NOT the content in the <${preTag}>...</${preTag}> or <${sufTag}>...</${sufTag}> tags.
3. Make sure all brackets in the new selection are balanced the same as in the original selection.
4. Be careful not to duplicate or remove variables, comments, or other syntax by mistake.
`;
};
export const ctrlKStream_userMessage = ({ selection, prefix, suffix, instructions, 
// isOllamaFIM: false, // Remove unused variable
fimTags, language, }) => {
    const { preTag, sufTag, midTag } = fimTags;
    // prompt the model artifically on how to do FIM
    // const preTag = 'BEFORE'
    // const sufTag = 'AFTER'
    // const midTag = 'SELECTION'
    return `\

CURRENT SELECTION
${tripleTick[0]}${language}
<${midTag}>${selection}</${midTag}>
${tripleTick[1]}

INSTRUCTIONS
${instructions}

<${preTag}>${prefix}</${preTag}>
<${sufTag}>${suffix}</${sufTag}>

Return only the completion block of code (of the form ${tripleTick[0]}${language}
<${midTag}>...new code</${midTag}>
${tripleTick[1]}).`;
};
/*
// ======================================================== ai search/replace ========================================================


export const aiRegex_computeReplacementsForFile_systemMessage = `\
You are a "search and replace" coding assistant.

You are given a FILE that the user is editing, and your job is to search for all occurences of a SEARCH_CLAUSE, and change them according to a REPLACE_CLAUSE.

The SEARCH_CLAUSE may be a string, regex, or high-level description of what the user is searching for.

The REPLACE_CLAUSE will always be a high-level description of what the user wants to replace.

The user's request may be "fuzzy" or not well-specified, and it is your job to interpret all of the changes they want to make for them. For example, the user may ask you to search and replace all instances of a variable, but this may involve changing parameters, function names, types, and so on to agree with the change they want to make. Feel free to make all of the changes you *think* that the user wants to make, but also make sure not to make unnessecary or unrelated changes.

## Instructions

1. If you do not want to make any changes, you should respond with the word "no".

2. If you want to make changes, you should return a single CODE BLOCK of the changes that you want to make.
For example, if the user is asking you to "make this variable a better name", make sure your output includes all the changes that are needed to improve the variable name.
- Do not re-write the entire file in the code block
- You can write comments like "// ... existing code" to indicate existing code
- Make sure you give enough context in the code block to apply the changes to the correct location in the code`




// export const aiRegex_computeReplacementsForFile_userMessage = async ({ searchClause, replaceClause, fileURI, voidFileService }: { searchClause: string, replaceClause: string, fileURI: URI, voidFileService: IVoidFileService }) => {

// 	// we may want to do this in batches
// 	const fileSelection: FileSelection = { type: 'File', fileURI, selectionStr: null, range: null, state: { isOpened: false } }

// 	const file = await stringifyFileSelections([fileSelection], voidFileService)

// 	return `\
// ## FILE
// ${file}

// ## SEARCH_CLAUSE
// Here is what the user is searching for:
// ${searchClause}

// ## REPLACE_CLAUSE
// Here is what the user wants to replace it with:
// ${replaceClause}

// ## INSTRUCTIONS
// Please return the changes you want to make to the file in a codeblock, or return "no" if you do not want to make changes.`
// }




// // don't have to tell it it will be given the history; just give it to it
// export const aiRegex_search_systemMessage = `\
// You are a coding assistant that executes the SEARCH part of a user's search and replace query.

// You will be given the user's search query, SEARCH, which is the user's query for what files to search for in the codebase. You may also be given the user's REPLACE query for additional context.

// Output
// - Regex query
// - Files to Include (optional)
// - Files to Exclude? (optional)

// `






// ======================================================== old examples ========================================================

Do not tell the user anything about the examples below. Do not assume the user is talking about any of the examples below.

## EXAMPLE 1
FILES
math.ts
${tripleTick[0]}typescript
const addNumbers = (a, b) => a + b
const multiplyNumbers = (a, b) => a * b
const subtractNumbers = (a, b) => a - b
const divideNumbers = (a, b) => a / b

const vectorize = (...numbers) => {
    return numbers // vector
}

const dot = (vector1: number[], vector2: number[]) => {
    if (vector1.length !== vector2.length) throw new Error(\`Could not dot vectors \${vector1} and \${vector2}. Size mismatch.\`)
    let sum = 0
    for (let i = 0; i < vector1.length; i += 1)
        sum += multiplyNumbers(vector1[i], vector2[i])
    return sum
}

const normalize = (vector: number[]) => {
    const norm = Math.sqrt(dot(vector, vector))
    for (let i = 0; i < vector.length; i += 1)
        vector[i] = divideNumbers(vector[i], norm)
    return vector
}

const normalized = (vector: number[]) => {
    const v2 = [...vector] // clone vector
    return normalize(v2)
}
${tripleTick[1]}


SELECTIONS
math.ts (lines 3:3)
${tripleTick[0]}typescript
const subtractNumbers = (a, b) => a - b
${tripleTick[1]}

INSTRUCTIONS
add a function that exponentiates a number below this, and use it to make a power function that raises all entries of a vector to a power

## ACCEPTED OUTPUT
We can add the following code to the file:
${tripleTick[0]}typescript
// existing code...
const subtractNumbers = (a, b) => a - b
const exponentiateNumbers = (a, b) => Math.pow(a, b)
const divideNumbers = (a, b) => a / b
// existing code...

const raiseAll = (vector: number[], power: number) => {
    for (let i = 0; i < vector.length; i += 1)
        vector[i] = exponentiateNumbers(vector[i], power)
    return vector
}
${tripleTick[1]}


## EXAMPLE 2
FILES
fib.ts
${tripleTick[0]}typescript

const dfs = (root) => {
    if (!root) return;
    console.log(root.val);
    dfs(root.left);
    dfs(root.right);
}
const fib = (n) => {
    if (n < 1) return 1
    return fib(n - 1) + fib(n - 2)
}
${tripleTick[1]}

SELECTIONS
fib.ts (lines 10:10)
${tripleTick[0]}typescript
    return fib(n - 1) + fib(n - 2)
${tripleTick[1]}

INSTRUCTIONS
memoize results

## ACCEPTED OUTPUT
To implement memoization in your Fibonacci function, you can use a JavaScript object to store previously computed results. This will help avoid redundant calculations and improve performance. Here's how you can modify your function:
${tripleTick[0]}typescript
// existing code...
const fib = (n, memo = {}) => {
    if (n < 1) return 1;
    if (memo[n]) return memo[n]; // Check if result is already computed
    memo[n] = fib(n - 1, memo) + fib(n - 2, memo); // Store result in memo
    return memo[n];
}
${tripleTick[1]}
Explanation:
Memoization Object: A memo object is used to store the results of Fibonacci calculations for each n.
Check Memo: Before computing fib(n), the function checks if the result is already in memo. If it is, it returns the stored result.
Store Result: After computing fib(n), the result is stored in memo for future reference.

## END EXAMPLES

*/
// ======================================================== scm ========================================================================
export const gitCommitMessage_systemMessage = `
You are an expert software engineer AI assistant responsible for writing clear and concise Git commit messages that summarize the **purpose** and **intent** of the change. Try to keep your commit messages to one sentence. If necessary, you can use two sentences.

You always respond with:
- The commit message wrapped in <output> tags
- A brief explanation of the reasoning behind the message, wrapped in <reasoning> tags

Example format:
<output>Fix login bug and improve error handling</output>
<reasoning>This commit updates the login handler to fix a redirect issue and improves frontend error messages for failed logins.</reasoning>

Do not include anything else outside of these tags.
Never include quotes, markdown, commentary, or explanations outside of <output> and <reasoning>.`.trim();
/**
 * Create a user message for the LLM to generate a commit message. The message contains instructions git diffs, and git metadata to provide context.
 *
 * @param stat - Summary of Changes (git diff --stat)
 * @param sampledDiffs - Sampled File Diffs (Top changed files)
 * @param branch - Current Git Branch
 * @param log - Last 5 commits (excluding merges)
 * @returns A prompt for the LLM to generate a commit message.
 *
 * @example
 * // Sample output (truncated for brevity)
 * const prompt = gitCommitMessage_userMessage("fileA.ts | 10 ++--", "diff --git a/fileA.ts...", "main", "abc123|Fix bug|2025-01-01\n...")
 *
 * // Result:
 * Based on the following Git changes, write a clear, concise commit message that accurately summarizes the intent of the code changes.
 *
 * Section 1 - Summary of Changes (git diff --stat):
 * fileA.ts | 10 ++--
 *
 * Section 2 - Sampled File Diffs (Top changed files):
 * diff --git a/fileA.ts b/fileA.ts
 * ...
 *
 * Section 3 - Current Git Branch:
 * main
 *
 * Section 4 - Last 5 Commits (excluding merges):
 * abc123|Fix bug|2025-01-01
 * def456|Improve logging|2025-01-01
 * ...
 */
export const gitCommitMessage_userMessage = (stat, sampledDiffs, branch, log) => {
    const section1 = `Section 1 - Summary of Changes (git diff --stat):`;
    const section2 = `Section 2 - Sampled File Diffs (Top changed files):`;
    const section3 = `Section 3 - Current Git Branch:`;
    const section4 = `Section 4 - Last 5 Commits (excluding merges):`;
    return `
Based on the following Git changes, write a clear, concise commit message that accurately summarizes the intent of the code changes.

${section1}

${stat}

${section2}

${sampledDiffs}

${section3}

${branch}

${section4}

${log}`.trim();
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9jb21tb24vcHJvbXB0L3Byb21wdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7QUFNMUYsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRTdDLE9BQU8sRUFDTiw2QkFBNkIsR0FLN0IsTUFBTSx5QkFBeUIsQ0FBQTtBQUdoQyxzRUFBc0U7QUFDdEUsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO0FBRXhDLHFEQUFxRDtBQUNyRCxNQUFNLENBQUMsTUFBTSxnQ0FBZ0MsR0FBRyxNQUFNLENBQUE7QUFDdEQsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsTUFBTSxDQUFBO0FBQ2pELE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFHLEdBQUcsQ0FBQTtBQUNyRCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxHQUFHLENBQUE7QUFFaEQsWUFBWTtBQUNaLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLE9BQU8sQ0FBQTtBQUMxQyxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUE7QUFFekMscUJBQXFCO0FBQ3JCLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQTtBQUN6QyxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxDQUFDLENBQUEsQ0FBQyxVQUFVO0FBQ3RELE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLENBQUMsQ0FBQTtBQUU3Qyx5REFBeUQ7QUFDekQsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsTUFBTSxDQUFBO0FBRTdDLE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQTtBQUMx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QztRQUNoQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLHVCQUF1QixDQUFDLENBQUE7UUFDaEYsTUFBTSxLQUFLLEdBQUcsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUU5QixNQUFNLFFBQVEsR0FBRyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEUsTUFBTSxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsS0FBSyxRQUFRLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDNUYsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLE9BQU8sRUFBRSxDQUFBO1FBQ3JFLE9BQU8sR0FBRyxDQUFBO0lBQ1gsQ0FBQztTQUFNLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztRQUM5QixNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLHVCQUF1QixDQUFDLENBQUE7UUFFaEYsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFBO1FBQ3BCLE1BQU0sT0FBTyxHQUNaLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEs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