export const approvalTypeOfBuiltinToolName = {
    create_file_or_folder: 'edits',
    delete_file_or_folder: 'edits',
    rewrite_file: 'edits',
    edit_file: 'edits',
    run_command: 'terminal',
    run_persistent_command: 'terminal',
    open_persistent_terminal: 'terminal',
    kill_persistent_terminal: 'terminal',
};
export const toolApprovalTypes = new Set([
    ...Object.values(approvalTypeOfBuiltinToolName),
    'MCP tools',
]);
