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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL3Byb21wdC9wcm9tcHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBTTFGLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUU3QyxPQUFPLEVBQ04sNkJBQTZCLEdBSzdCLE1BQU0seUJBQXlCLENBQUE7QUFHaEMsc0VBQXNFO0FBQ3RFLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUV4QyxxREFBcUQ7QUFDckQsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsTUFBTSxDQUFBO0FBQ3RELE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLE1BQU0sQ0FBQTtBQUNqRCxNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBRyxHQUFHLENBQUE7QUFDckQsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsR0FBRyxDQUFBO0FBRWhELFlBQVk7QUFDWixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUE7QUFDMUMsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsR0FBRyxDQUFBO0FBRXpDLHFCQUFxQjtBQUNyQixNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLENBQUE7QUFDekMsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsQ0FBQyxDQUFBLENBQUMsVUFBVTtBQUN0RCxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxDQUFDLENBQUE7QUFFN0MseURBQXlEO0FBQ3pELE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLE1BQU0sQ0FBQTtBQUU3QyxNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQUE7QUFDMUMsTUFB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