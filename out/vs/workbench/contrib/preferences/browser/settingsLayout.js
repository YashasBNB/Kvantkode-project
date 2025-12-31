/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWeb, isWindows } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
const defaultCommonlyUsedSettings = [
    'files.autoSave',
    'editor.fontSize',
    'editor.fontFamily',
    'editor.tabSize',
    'editor.renderWhitespace',
    'editor.cursorStyle',
    'editor.multiCursorModifier',
    'editor.insertSpaces',
    'editor.wordWrap',
    'files.exclude',
    'files.associations',
    'workbench.editor.enablePreview',
];
export function getCommonlyUsedData(toggleData) {
    return {
        id: 'commonlyUsed',
        label: localize('commonlyUsed', 'Commonly Used'),
        settings: toggleData?.commonlyUsed ?? defaultCommonlyUsedSettings,
    };
}
export const tocData = {
    id: 'root',
    label: 'root',
    children: [
        {
            id: 'editor',
            label: localize('textEditor', 'Text Editor'),
            settings: ['editor.*'],
            children: [
                {
                    id: 'editor/cursor',
                    label: localize('cursor', 'Cursor'),
                    settings: ['editor.cursor*'],
                },
                {
                    id: 'editor/find',
                    label: localize('find', 'Find'),
                    settings: ['editor.find.*'],
                },
                {
                    id: 'editor/font',
                    label: localize('font', 'Font'),
                    settings: ['editor.font*'],
                },
                {
                    id: 'editor/format',
                    label: localize('formatting', 'Formatting'),
                    settings: ['editor.format*'],
                },
                {
                    id: 'editor/diffEditor',
                    label: localize('diffEditor', 'Diff Editor'),
                    settings: ['diffEditor.*'],
                },
                {
                    id: 'editor/multiDiffEditor',
                    label: localize('multiDiffEditor', 'Multi-File Diff Editor'),
                    settings: ['multiDiffEditor.*'],
                },
                {
                    id: 'editor/minimap',
                    label: localize('minimap', 'Minimap'),
                    settings: ['editor.minimap.*'],
                },
                {
                    id: 'editor/suggestions',
                    label: localize('suggestions', 'Suggestions'),
                    settings: ['editor.*suggest*'],
                },
                {
                    id: 'editor/files',
                    label: localize('files', 'Files'),
                    settings: ['files.*'],
                },
            ],
        },
        {
            id: 'workbench',
            label: localize('workbench', 'Workbench'),
            settings: ['workbench.*'],
            children: [
                {
                    id: 'workbench/appearance',
                    label: localize('appearance', 'Appearance'),
                    settings: [
                        'workbench.activityBar.*',
                        'workbench.*color*',
                        'workbench.fontAliasing',
                        'workbench.iconTheme',
                        'workbench.sidebar.location',
                        'workbench.*.visible',
                        'workbench.tips.enabled',
                        'workbench.tree.*',
                        'workbench.view.*',
                    ],
                },
                {
                    id: 'workbench/breadcrumbs',
                    label: localize('breadcrumbs', 'Breadcrumbs'),
                    settings: ['breadcrumbs.*'],
                },
                {
                    id: 'workbench/editor',
                    label: localize('editorManagement', 'Editor Management'),
                    settings: ['workbench.editor.*'],
                },
                {
                    id: 'workbench/settings',
                    label: localize('settings', 'Settings Editor'),
                    settings: ['workbench.settings.*'],
                },
                {
                    id: 'workbench/zenmode',
                    label: localize('zenMode', 'Zen Mode'),
                    settings: ['zenmode.*'],
                },
                {
                    id: 'workbench/screencastmode',
                    label: localize('screencastMode', 'Screencast Mode'),
                    settings: ['screencastMode.*'],
                },
            ],
        },
        {
            id: 'window',
            label: localize('window', 'Window'),
            settings: ['window.*'],
            children: [
                {
                    id: 'window/newWindow',
                    label: localize('newWindow', 'New Window'),
                    settings: ['window.*newwindow*'],
                },
            ],
        },
        {
            id: 'features',
            label: localize('features', 'Features'),
            children: [
                {
                    id: 'features/accessibilitySignals',
                    label: localize('accessibility.signals', 'Accessibility Signals'),
                    settings: ['accessibility.signal*'],
                },
                {
                    id: 'features/accessibility',
                    label: localize('accessibility', 'Accessibility'),
                    settings: ['accessibility.*'],
                },
                {
                    id: 'features/explorer',
                    label: localize('fileExplorer', 'Explorer'),
                    settings: ['explorer.*', 'outline.*'],
                },
                {
                    id: 'features/search',
                    label: localize('search', 'Search'),
                    settings: ['search.*'],
                },
                {
                    id: 'features/debug',
                    label: localize('debug', 'Debug'),
                    settings: ['debug.*', 'launch'],
                },
                {
                    id: 'features/testing',
                    label: localize('testing', 'Testing'),
                    settings: ['testing.*'],
                },
                {
                    id: 'features/scm',
                    label: localize('scm', 'Source Control'),
                    settings: ['scm.*'],
                },
                {
                    id: 'features/extensions',
                    label: localize('extensions', 'Extensions'),
                    settings: ['extensions.*'],
                },
                {
                    id: 'features/terminal',
                    label: localize('terminal', 'Terminal'),
                    settings: ['terminal.*'],
                },
                {
                    id: 'features/task',
                    label: localize('task', 'Task'),
                    settings: ['task.*'],
                },
                {
                    id: 'features/problems',
                    label: localize('problems', 'Problems'),
                    settings: ['problems.*'],
                },
                {
                    id: 'features/output',
                    label: localize('output', 'Output'),
                    settings: ['output.*'],
                },
                {
                    id: 'features/comments',
                    label: localize('comments', 'Comments'),
                    settings: ['comments.*'],
                },
                {
                    id: 'features/remote',
                    label: localize('remote', 'Remote'),
                    settings: ['remote.*'],
                },
                {
                    id: 'features/timeline',
                    label: localize('timeline', 'Timeline'),
                    settings: ['timeline.*'],
                },
                {
                    id: 'features/notebook',
                    label: localize('notebook', 'Notebook'),
                    settings: ['notebook.*', 'interactiveWindow.*'],
                },
                {
                    id: 'features/mergeEditor',
                    label: localize('mergeEditor', 'Merge Editor'),
                    settings: ['mergeEditor.*'],
                },
                {
                    id: 'features/chat',
                    label: localize('chat', 'Chat'),
                    settings: ['chat.*', 'inlineChat.*', 'mcp'],
                },
                {
                    id: 'features/issueReporter',
                    label: localize('issueReporter', 'Issue Reporter'),
                    settings: ['issueReporter.*'],
                    hide: !isWeb,
                },
            ],
        },
        {
            id: 'application',
            label: localize('application', 'Application'),
            children: [
                {
                    id: 'application/http',
                    label: localize('proxy', 'Proxy'),
                    settings: ['http.*'],
                },
                {
                    id: 'application/keyboard',
                    label: localize('keyboard', 'Keyboard'),
                    settings: ['keyboard.*'],
                },
                {
                    id: 'application/update',
                    label: localize('update', 'Update'),
                    settings: ['update.*'],
                },
                {
                    id: 'application/telemetry',
                    label: localize('telemetry', 'Telemetry'),
                    settings: ['telemetry.*'],
                },
                {
                    id: 'application/settingsSync',
                    label: localize('settingsSync', 'Settings Sync'),
                    settings: ['settingsSync.*'],
                },
                {
                    id: 'application/experimental',
                    label: localize('experimental', 'Experimental'),
                    settings: ['application.experimental.*'],
                },
                {
                    id: 'application/other',
                    label: localize('other', 'Other'),
                    settings: ['application.*'],
                    hide: isWindows,
                },
            ],
        },
        {
            id: 'security',
            label: localize('security', 'Security'),
            settings: ['security.*'],
            children: [
                {
                    id: 'security/workspace',
                    label: localize('workspace', 'Workspace'),
                    settings: ['security.workspace.*'],
                },
            ],
        },
    ],
};
export const knownAcronyms = new Set();
['css', 'html', 'scss', 'less', 'json', 'js', 'ts', 'ie', 'id', 'php', 'scm'].forEach((str) => knownAcronyms.add(str));
export const knownTermMappings = new Map();
knownTermMappings.set('power shell', 'PowerShell');
knownTermMappings.set('powershell', 'PowerShell');
knownTermMappings.set('javascript', 'JavaScript');
knownTermMappings.set('typescript', 'TypeScript');
knownTermMappings.set('github', 'GitHub');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NMYXlvdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9icm93c2VyL3NldHRpbmdzTGF5b3V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBWTdDLE1BQU0sMkJBQTJCLEdBQWE7SUFDN0MsZ0JBQWdCO0lBQ2hCLGlCQUFpQjtJQUNqQixtQkFBbUI7SUFDbkIsZ0JBQWdCO0lBQ2hCLHlCQUF5QjtJQUN6QixvQkFBb0I7SUFDcEIsNEJBQTRCO0lBQzVCLHFCQUFxQjtJQUNyQixpQkFBaUI7SUFDakIsZUFBZTtJQUNmLG9CQUFvQjtJQUNwQixnQ0FBZ0M7Q0FDaEMsQ0FBQTtBQUVELE1BQU0sVUFBVSxtQkFBbUIsQ0FDbEMsVUFBMkM7SUFFM0MsT0FBTztRQUNOLEVBQUUsRUFBRSxjQUFjO1FBQ2xCLEtBQUssRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQztRQUNoRCxRQUFRLEVBQUUsVUFBVSxFQUFFLFlBQVksSUFBSSwyQkFBMkI7S0FDakUsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxPQUFPLEdBQXNCO0lBQ3pDLEVBQUUsRUFBRSxNQUFNO0lBQ1YsS0FBSyxFQUFFLE1BQU07SUFDYixRQUFRLEVBQUU7UUFDVDtZQUNDLEVBQUUsRUFBRSxRQUFRO1lBQ1osS0FBSyxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDO1lBQzVDLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQztZQUN0QixRQUFRLEVBQUU7Z0JBQ1Q7b0JBQ0MsRUFBRSxFQUFFLGVBQWU7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