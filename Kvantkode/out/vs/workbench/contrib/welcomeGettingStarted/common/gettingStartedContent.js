/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import themePickerContent from './media/theme_picker.js';
import notebookProfileContent from './media/notebookProfile.js';
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { NotebookSetting } from '../../notebook/common/notebookCommon.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import product from '../../../../platform/product/common/product.js';
class GettingStartedContentProviderRegistry {
    constructor() {
        this.providers = new Map();
    }
    registerProvider(moduleId, provider) {
        this.providers.set(moduleId, provider);
    }
    getProvider(moduleId) {
        return this.providers.get(moduleId);
    }
}
export const gettingStartedContentRegistry = new GettingStartedContentProviderRegistry();
export async function moduleToContent(resource) {
    if (!resource.query) {
        throw new Error('Getting Started: invalid resource');
    }
    const query = JSON.parse(resource.query);
    if (!query.moduleId) {
        throw new Error('Getting Started: invalid resource');
    }
    const provider = gettingStartedContentRegistry.getProvider(query.moduleId);
    if (!provider) {
        throw new Error(`Getting Started: no provider registered for ${query.moduleId}`);
    }
    return provider();
}
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/theme_picker', themePickerContent);
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/notebookProfile', notebookProfileContent);
// Register empty media for accessibility walkthrough
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/empty', () => '');
const setupIcon = registerIcon('getting-started-setup', Codicon.zap, localize('getting-started-setup-icon', 'Icon used for the setup category of welcome page'));
const beginnerIcon = registerIcon('getting-started-beginner', Codicon.lightbulb, localize('getting-started-beginner-icon', 'Icon used for the beginner category of welcome page'));
export const startEntries = [
    {
        id: 'welcome.showNewFileEntries',
        title: localize('gettingStarted.newFile.title', 'New File...'),
        description: localize('gettingStarted.newFile.description', 'Open a new untitled text file, notebook, or custom editor.'),
        icon: Codicon.newFile,
        content: {
            type: 'startEntry',
            command: 'command:welcome.showNewFileEntries',
        },
    },
    {
        id: 'topLevelOpenMac',
        title: localize('gettingStarted.openMac.title', 'Open...'),
        description: localize('gettingStarted.openMac.description', 'Open a file or folder to start working'),
        icon: Codicon.folderOpened,
        when: '!isWeb && isMac',
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.files.openFileFolder',
        },
    },
    {
        id: 'topLevelOpenFile',
        title: localize('gettingStarted.openFile.title', 'Open File...'),
        description: localize('gettingStarted.openFile.description', 'Open a file to start working'),
        icon: Codicon.goToFile,
        when: 'isWeb || !isMac',
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.files.openFile',
        },
    },
    {
        id: 'topLevelOpenFolder',
        title: localize('gettingStarted.openFolder.title', 'Open Folder...'),
        description: localize('gettingStarted.openFolder.description', 'Open a folder to start working'),
        icon: Codicon.folderOpened,
        when: '!isWeb && !isMac',
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.files.openFolder',
        },
    },
    {
        id: 'topLevelOpenFolderWeb',
        title: localize('gettingStarted.openFolder.title', 'Open Folder...'),
        description: localize('gettingStarted.openFolder.description', 'Open a folder to start working'),
        icon: Codicon.folderOpened,
        when: "!openFolderWorkspaceSupport && workbenchState == 'workspace'",
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.files.openFolderViaWorkspace',
        },
    },
    {
        id: 'topLevelGitClone',
        title: localize('gettingStarted.topLevelGitClone.title', 'Clone Git Repository...'),
        description: localize('gettingStarted.topLevelGitClone.description', 'Clone a remote repository to a local folder'),
        when: 'config.git.enabled && !git.missing',
        icon: Codicon.sourceControl,
        content: {
            type: 'startEntry',
            command: 'command:git.clone',
        },
    },
    {
        id: 'topLevelGitOpen',
        title: localize('gettingStarted.topLevelGitOpen.title', 'Open Repository...'),
        description: localize('gettingStarted.topLevelGitOpen.description', 'Connect to a remote repository or pull request to browse, search, edit, and commit'),
        when: "workspacePlatform == 'webworker'",
        icon: Codicon.sourceControl,
        content: {
            type: 'startEntry',
            command: 'command:remoteHub.openRepository',
        },
    },
    {
        id: 'topLevelShowWalkthroughs',
        title: localize('gettingStarted.topLevelShowWalkthroughs.title', 'Open a Walkthrough...'),
        description: localize('gettingStarted.topLevelShowWalkthroughs.description', 'View a walkthrough on the editor or an extension'),
        icon: Codicon.checklist,
        when: 'allWalkthroughsHidden',
        content: {
            type: 'startEntry',
            command: 'command:welcome.showAllWalkthroughs',
        },
    },
    {
        id: 'topLevelRemoteOpen',
        title: localize('gettingStarted.topLevelRemoteOpen.title', 'Connect to...'),
        description: localize('gettingStarted.topLevelRemoteOpen.description', 'Connect to remote development workspaces.'),
        when: '!isWeb',
        icon: Codicon.remote,
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.remote.showMenu',
        },
    },
    {
        id: 'topLevelOpenTunnel',
        title: localize('gettingStarted.topLevelOpenTunnel.title', 'Open Tunnel...'),
        description: localize('gettingStarted.topLevelOpenTunnel.description', 'Connect to a remote machine through a Tunnel'),
        when: 'isWeb && showRemoteStartEntryInWeb',
        icon: Codicon.remote,
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.remote.showWebStartEntryActions',
        },
    },
];
const Button = (title, href) => `[${title}](${href})`;
const CopilotStepTitle = localize('gettingStarted.copilotSetup.title', 'Use AI features with Copilot for free');
const CopilotDescription = localize({
    key: 'gettingStarted.copilotSetup.description',
    comment: ['{Locked="["}', '{Locked="]({0})"}'],
}, 'You can use [Copilot]({0}) to generate code across multiple files, fix errors, ask questions about your code and much more using natural language.', product.defaultChatAgent?.documentationUrl ?? '');
const CopilotSignedOutButton = Button(localize('setupCopilotButton.signIn', 'Set up Copilot'), `command:workbench.action.chat.triggerSetup`);
const CopilotSignedInButton = Button(localize('setupCopilotButton.setup', 'Set up Copilot'), `command:workbench.action.chat.triggerSetup`);
const CopilotCompleteButton = Button(localize('setupCopilotButton.chatWithCopilot', 'Chat with Copilot'), 'command:workbench.action.chat.open');
function createCopilotSetupStep(id, button, when, includeTerms) {
    const description = includeTerms
        ? `${CopilotDescription}\n\n${button}`
        : `${CopilotDescription}\n${button}`;
    return {
        id,
        title: CopilotStepTitle,
        description,
        when,
        media: {
            type: 'svg',
            altText: 'VS Code Copilot multi file edits',
            path: 'multi-file-edits.svg',
        },
    };
}
export const walkthroughs = [
    {
        id: 'Setup',
        title: localize('gettingStarted.setup.title', 'Get Started with VS Code'),
        description: localize('gettingStarted.setup.description', 'Customize your editor, learn the basics, and start coding'),
        isFeatured: true,
        icon: setupIcon,
        when: '!isWeb',
        walkthroughPageTitle: localize('gettingStarted.setup.walkthroughPageTitle', 'Setup VS Code'),
        next: 'Beginner',
        content: {
            type: 'steps',
            steps: [
                createCopilotSetupStep('CopilotSetupSignedOut', CopilotSignedOutButton, 'chatSetupSignedOut', true),
                createCopilotSetupStep('CopilotSetupComplete', CopilotCompleteButton, 'chatSetupInstalled && (chatPlanPro || chatPlanLimited)', false),
                createCopilotSetupStep('CopilotSetupSignedIn', CopilotSignedInButton, '!chatSetupSignedOut && (!chatSetupInstalled || chatPlanCanSignUp)', true),
                {
                    id: 'pickColorTheme',
                    title: localize('gettingStarted.pickColor.title', 'Choose your theme'),
                    description: localize('gettingStarted.pickColor.description.interpolated', 'The right theme helps you focus on your code, is easy on your eyes, and is simply more fun to use.\n{0}', Button(localize('titleID', 'Browse Color Themes'), 'command:workbench.action.selectTheme')),
                    completionEvents: [
                        'onSettingChanged:workbench.colorTheme',
                        'onCommand:workbench.action.selectTheme',
                    ],
                    media: { type: 'markdown', path: 'theme_picker' },
                },
                {
                    id: 'extensionsWeb',
                    title: localize('gettingStarted.extensions.title', 'Code with extensions'),
                    description: localize('gettingStarted.extensionsWeb.description.interpolated', "Extensions are VS Code's power-ups. A growing number are becoming available in the web.\n{0}", Button(localize('browsePopularWeb', 'Browse Popular Web Extensions'), 'command:workbench.extensions.action.showPopularExtensions')),
                    when: "workspacePlatform == 'webworker'",
                    media: {
                        type: 'svg',
                        altText: 'VS Code extension marketplace with featured language extensions',
                        path: 'extensions-web.svg',
                    },
                },
                {
                    id: 'findLanguageExtensions',
                    title: localize('gettingStarted.findLanguageExts.title', 'Rich support for all your languages'),
                    description: localize('gettingStarted.findLanguageExts.description.interpolated', 'Code smarter with syntax highlighting, code completion, linting and debugging. While many languages are built-in, many more can be added as extensions.\n{0}', Button(localize('browseLangExts', 'Browse Language Extensions'), 'command:workbench.extensions.action.showLanguageExtensions')),
                    when: "workspacePlatform != 'webworker'",
                    media: {
                        type: 'svg',
                        altText: 'Language extensions',
                        path: 'languages.svg',
                    },
                },
                // Hidden in favor of copilot entry (to be revisited when copilot entry moves, if at all)
                // {
                // 	id: 'settings',
                // 	title: localize('gettingStarted.settings.title', "Tune your settings"),
                // 	description: localize('gettingStarted.settings.description.interpolated', "Customize every aspect of VS Code and your extensions to your liking. Commonly used settings are listed first to get you started.\n{0}", Button(localize('tweakSettings', "Open Settings"), 'command:toSide:workbench.action.openSettings')),
                // 	media: {
                // 		type: 'svg', altText: 'VS Code Settings', path: 'settings.svg'
                // 	},
                // },
                // {
                // 	id: 'settingsSync',
                // 	title: localize('gettingStarted.settingsSync.title', "Sync settings across devices"),
                // 	description: localize('gettingStarted.settingsSync.description.interpolated', "Keep your essential customizations backed up and updated across all your devices.\n{0}", Button(localize('enableSync', "Backup and Sync Settings"), 'command:workbench.userDataSync.actions.turnOn')),
                // 	when: 'syncStatus != uninitialized',
                // 	completionEvents: ['onEvent:sync-enabled'],
                // 	media: {
                // 		type: 'svg', altText: 'The "Turn on Sync" entry in the settings gear menu.', path: 'settingsSync.svg'
                // 	},
                // },
                {
                    id: 'settingsAndSync',
                    title: localize('gettingStarted.settings.title', 'Tune your settings'),
                    description: localize('gettingStarted.settingsAndSync.description.interpolated', 'Customize every aspect of VS Code and your extensions to your liking. [Back up and sync](command:workbench.userDataSync.actions.turnOn) your essential customizations across all your devices.\n{0}', Button(localize('tweakSettings', 'Open Settings'), 'command:toSide:workbench.action.openSettings')),
                    when: 'syncStatus != uninitialized',
                    completionEvents: ['onEvent:sync-enabled'],
                    media: {
                        type: 'svg',
                        altText: 'VS Code Settings',
                        path: 'settings.svg',
                    },
                },
                {
                    id: 'commandPaletteTask',
                    title: localize('gettingStarted.commandPalette.title', 'Unlock productivity with the Command Palette '),
                    description: localize('gettingStarted.commandPalette.description.interpolated', 'Run commands without reaching for your mouse to accomplish any task in VS Code.\n{0}', Button(localize('commandPalette', 'Open Command Palette'), 'command:workbench.action.showCommands')),
                    media: {
                        type: 'svg',
                        altText: 'Command Palette overlay for searching and executing commands.',
                        path: 'commandPalette.svg',
                    },
                },
                // Hidden in favor of copilot entry (to be revisited when copilot entry moves, if at all)
                // {
                // 	id: 'pickAFolderTask-Mac',
                // 	title: localize('gettingStarted.setup.OpenFolder.title', "Open up your code"),
                // 	description: localize('gettingStarted.setup.OpenFolder.description.interpolated', "You're all set to start coding. Open a project folder to get your files into VS Code.\n{0}", Button(localize('pickFolder', "Pick a Folder"), 'command:workbench.action.files.openFileFolder')),
                // 	when: 'isMac && workspaceFolderCount == 0',
                // 	media: {
                // 		type: 'svg', altText: 'Explorer view showing buttons for opening folder and cloning repository.', path: 'openFolder.svg'
                // 	}
                // },
                // {
                // 	id: 'pickAFolderTask-Other',
                // 	title: localize('gettingStarted.setup.OpenFolder.title', "Open up your code"),
                // 	description: localize('gettingStarted.setup.OpenFolder.description.interpolated', "You're all set to start coding. Open a project folder to get your files into VS Code.\n{0}", Button(localize('pickFolder', "Pick a Folder"), 'command:workbench.action.files.openFolder')),
                // 	when: '!isMac && workspaceFolderCount == 0',
                // 	media: {
                // 		type: 'svg', altText: 'Explorer view showing buttons for opening folder and cloning repository.', path: 'openFolder.svg'
                // 	}
                // },
                {
                    id: 'quickOpen',
                    title: localize('gettingStarted.quickOpen.title', 'Quickly navigate between your files'),
                    description: localize('gettingStarted.quickOpen.description.interpolated', 'Navigate between files in an instant with one keystroke. Tip: Open multiple files by pressing the right arrow key.\n{0}', Button(localize('quickOpen', 'Quick Open a File'), 'command:toSide:workbench.action.quickOpen')),
                    when: 'workspaceFolderCount != 0',
                    media: {
                        type: 'svg',
                        altText: 'Go to file in quick search.',
                        path: 'search.svg',
                    },
                },
                {
                    id: 'videoTutorial',
                    title: localize('gettingStarted.videoTutorial.title', 'Watch video tutorials'),
                    description: localize('gettingStarted.videoTutorial.description.interpolated', "Watch the first in a series of short & practical video tutorials for VS Code's key features.\n{0}", Button(localize('watch', 'Watch Tutorial'), 'https://aka.ms/vscode-getting-started-video')),
                    media: { type: 'svg', altText: 'VS Code Settings', path: 'learn.svg' },
                },
            ],
        },
    },
    {
        id: 'SetupWeb',
        title: localize('gettingStarted.setupWeb.title', 'Get Started with VS Code for the Web'),
        description: localize('gettingStarted.setupWeb.description', 'Customize your editor, learn the basics, and start coding'),
        isFeatured: true,
        icon: setupIcon,
        when: 'isWeb',
        next: 'Beginner',
        walkthroughPageTitle: localize('gettingStarted.setupWeb.walkthroughPageTitle', 'Setup VS Code Web'),
        content: {
            type: 'steps',
            steps: [
                {
                    id: 'pickColorThemeWeb',
                    title: localize('gettingStarted.pickColor.title', 'Choose your theme'),
                    description: localize('gettingStarted.pickColor.description.interpolated', 'The right theme helps you focus on your code, is easy on your eyes, and is simply more fun to use.\n{0}', Button(localize('titleID', 'Browse Color Themes'), 'command:workbench.action.selectTheme')),
                    completionEvents: [
                        'onSettingChanged:workbench.colorTheme',
                        'onCommand:workbench.action.selectTheme',
                    ],
                    media: { type: 'markdown', path: 'theme_picker' },
                },
                {
                    id: 'menuBarWeb',
                    title: localize('gettingStarted.menuBar.title', 'Just the right amount of UI'),
                    description: localize('gettingStarted.menuBar.description.interpolated', 'The full menu bar is available in the dropdown menu to make room for your code. Toggle its appearance for faster access. \n{0}', Button(localize('toggleMenuBar', 'Toggle Menu Bar'), 'command:workbench.action.toggleMenuBar')),
                    when: 'isWeb',
                    media: {
                        type: 'svg',
                        altText: 'Comparing menu dropdown with the visible menu bar.',
                        path: 'menuBar.svg',
                    },
                },
                {
                    id: 'extensionsWebWeb',
                    title: localize('gettingStarted.extensions.title', 'Code with extensions'),
                    description: localize('gettingStarted.extensionsWeb.description.interpolated', "Extensions are VS Code's power-ups. A growing number are becoming available in the web.\n{0}", Button(localize('browsePopularWeb', 'Browse Popular Web Extensions'), 'command:workbench.extensions.action.showPopularExtensions')),
                    when: "workspacePlatform == 'webworker'",
                    media: {
                        type: 'svg',
                        altText: 'VS Code extension marketplace with featured language extensions',
                        path: 'extensions-web.svg',
                    },
                },
                {
                    id: 'findLanguageExtensionsWeb',
                    title: localize('gettingStarted.findLanguageExts.title', 'Rich support for all your languages'),
                    description: localize('gettingStarted.findLanguageExts.description.interpolated', 'Code smarter with syntax highlighting, code completion, linting and debugging. While many languages are built-in, many more can be added as extensions.\n{0}', Button(localize('browseLangExts', 'Browse Language Extensions'), 'command:workbench.extensions.action.showLanguageExtensions')),
                    when: "workspacePlatform != 'webworker'",
                    media: {
                        type: 'svg',
                        altText: 'Language extensions',
                        path: 'languages.svg',
                    },
                },
                {
                    id: 'settingsSyncWeb',
                    title: localize('gettingStarted.settingsSync.title', 'Sync settings across devices'),
                    description: localize('gettingStarted.settingsSync.description.interpolated', 'Keep your essential customizations backed up and updated across all your devices.\n{0}', Button(localize('enableSync', 'Backup and Sync Settings'), 'command:workbench.userDataSync.actions.turnOn')),
                    when: 'syncStatus != uninitialized',
                    completionEvents: ['onEvent:sync-enabled'],
                    media: {
                        type: 'svg',
                        altText: 'The "Turn on Sync" entry in the settings gear menu.',
                        path: 'settingsSync.svg',
                    },
                },
                {
                    id: 'commandPaletteTaskWeb',
                    title: localize('gettingStarted.commandPalette.title', 'Unlock productivity with the Command Palette '),
                    description: localize('gettingStarted.commandPalette.description.interpolated', 'Run commands without reaching for your mouse to accomplish any task in VS Code.\n{0}', Button(localize('commandPalette', 'Open Command Palette'), 'command:workbench.action.showCommands')),
                    media: {
                        type: 'svg',
                        altText: 'Command Palette overlay for searching and executing commands.',
                        path: 'commandPalette.svg',
                    },
                },
                {
                    id: 'pickAFolderTask-WebWeb',
                    title: localize('gettingStarted.setup.OpenFolder.title', 'Open up your code'),
                    description: localize('gettingStarted.setup.OpenFolderWeb.description.interpolated', "You're all set to start coding. You can open a local project or a remote repository to get your files into VS Code.\n{0}\n{1}", Button(localize('openFolder', 'Open Folder'), 'command:workbench.action.addRootFolder'), Button(localize('openRepository', 'Open Repository'), 'command:remoteHub.openRepository')),
                    when: 'workspaceFolderCount == 0',
                    media: {
                        type: 'svg',
                        altText: 'Explorer view showing buttons for opening folder and cloning repository.',
                        path: 'openFolder.svg',
                    },
                },
                {
                    id: 'quickOpenWeb',
                    title: localize('gettingStarted.quickOpen.title', 'Quickly navigate between your files'),
                    description: localize('gettingStarted.quickOpen.description.interpolated', 'Navigate between files in an instant with one keystroke. Tip: Open multiple files by pressing the right arrow key.\n{0}', Button(localize('quickOpen', 'Quick Open a File'), 'command:toSide:workbench.action.quickOpen')),
                    when: 'workspaceFolderCount != 0',
                    media: {
                        type: 'svg',
                        altText: 'Go to file in quick search.',
                        path: 'search.svg',
                    },
                },
            ],
        },
    },
    {
        id: 'SetupAccessibility',
        title: localize('gettingStarted.setupAccessibility.title', 'Get Started with Accessibility Features'),
        description: localize('gettingStarted.setupAccessibility.description', 'Learn the tools and shortcuts that make VS Code accessible. Note that some actions are not actionable from within the context of the walkthrough.'),
        isFeatured: true,
        icon: setupIcon,
        when: CONTEXT_ACCESSIBILITY_MODE_ENABLED.key,
        next: 'Setup',
        walkthroughPageTitle: localize('gettingStarted.setupAccessibility.walkthroughPageTitle', 'Setup VS Code Accessibility'),
        content: {
            type: 'steps',
            steps: [
                {
                    id: 'accessibilityHelp',
                    title: localize('gettingStarted.accessibilityHelp.title', 'Use the accessibility help dialog to learn about features'),
                    description: localize('gettingStarted.accessibilityHelp.description.interpolated', 'The accessibility help dialog provides information about what to expect from a feature and the commands/keybindings to operate them.\n With focus in an editor, terminal, notebook, chat response, comment, or debug console, the relevant dialog can be opened with the Open Accessibility Help command.\n{0}', Button(localize('openAccessibilityHelp', 'Open Accessibility Help'), 'command:editor.action.accessibilityHelp')),
                    media: {
                        type: 'markdown',
                        path: 'empty',
                    },
                },
                {
                    id: 'accessibleView',
                    title: localize('gettingStarted.accessibleView.title', 'Screen reader users can inspect content line by line, character by character in the accessible view.'),
                    description: localize('gettingStarted.accessibleView.description.interpolated', 'The accessible view is available for the terminal, hovers, notifications, comments, notebook output, chat responses, inline completions, and debug console output.\n With focus in any of those features, it can be opened with the Open Accessible View command.\n{0}', Button(localize('openAccessibleView', 'Open Accessible View'), 'command:editor.action.accessibleView')),
                    media: {
                        type: 'markdown',
                        path: 'empty',
                    },
                },
                {
                    id: 'verbositySettings',
                    title: localize('gettingStarted.verbositySettings.title', 'Control the verbosity of aria labels'),
                    description: localize('gettingStarted.verbositySettings.description.interpolated', 'Screen reader verbosity settings exist for features around the workbench so that once a user is familiar with a feature, they can avoid hearing hints about how to operate it. For example, features for which an accessibility help dialog exists will indicate how to open the dialog until the verbosity setting for that feature has been disabled.\n These and other accessibility settings can be configured by running the Open Accessibility Settings command.\n{0}', Button(localize('openVerbositySettings', 'Open Accessibility Settings'), 'command:workbench.action.openAccessibilitySettings')),
                    media: {
                        type: 'markdown',
                        path: 'empty',
                    },
                },
                {
                    id: 'commandPaletteTaskAccessibility',
                    title: localize('gettingStarted.commandPaletteAccessibility.title', 'Unlock productivity with the Command Palette '),
                    description: localize('gettingStarted.commandPaletteAccessibility.description.interpolated', 'Run commands without reaching for your mouse to accomplish any task in VS Code.\n{0}', Button(localize('commandPalette', 'Open Command Palette'), 'command:workbench.action.showCommands')),
                    media: { type: 'markdown', path: 'empty' },
                },
                {
                    id: 'keybindingsAccessibility',
                    title: localize('gettingStarted.keyboardShortcuts.title', 'Customize your keyboard shortcuts'),
                    description: localize('gettingStarted.keyboardShortcuts.description.interpolated', 'Once you have discovered your favorite commands, create custom keyboard shortcuts for instant access.\n{0}', Button(localize('keyboardShortcuts', 'Keyboard Shortcuts'), 'command:toSide:workbench.action.openGlobalKeybindings')),
                    media: {
                        type: 'markdown',
                        path: 'empty',
                    },
                },
                {
                    id: 'accessibilitySignals',
                    title: localize('gettingStarted.accessibilitySignals.title', 'Fine tune which accessibility signals you want to receive via audio or a braille device'),
                    description: localize('gettingStarted.accessibilitySignals.description.interpolated', 'Accessibility sounds and announcements are played around the workbench for different events.\n These can be discovered and configured using the List Signal Sounds and List Signal Announcements commands.\n{0}\n{1}', Button(localize('listSignalSounds', 'List Signal Sounds'), 'command:signals.sounds.help'), Button(localize('listSignalAnnouncements', 'List Signal Announcements'), 'command:accessibility.announcement.help')),
                    media: {
                        type: 'markdown',
                        path: 'empty',
                    },
                },
                {
                    id: 'hover',
                    title: localize('gettingStarted.hover.title', 'Access the hover in the editor to get more information on a variable or symbol'),
                    description: localize('gettingStarted.hover.description.interpolated', 'While focus is in the editor on a variable or symbol, a hover can be can be focused with the Show or Open Hover command.\n{0}', Button(localize('showOrFocusHover', 'Show or Focus Hover'), 'command:editor.action.showHover')),
                    media: {
                        type: 'markdown',
                        path: 'empty',
                    },
                },
                {
                    id: 'goToSymbol',
                    title: localize('gettingStarted.goToSymbol.title', 'Navigate to symbols in a file'),
                    description: localize('gettingStarted.goToSymbol.description.interpolated', 'The Go to Symbol command is useful for navigating between important landmarks in a document.\n{0}', Button(localize('openGoToSymbol', 'Go to Symbol'), 'command:editor.action.goToSymbol')),
                    media: {
                        type: 'markdown',
                        path: 'empty',
                    },
                },
                {
                    id: 'codeFolding',
                    title: localize('gettingStarted.codeFolding.title', "Use code folding to collapse blocks of code and focus on the code you're interested in."),
                    description: localize('gettingStarted.codeFolding.description.interpolated', 'Fold or unfold a code section with the Toggle Fold command.\n{0}\n Fold or unfold recursively with the Toggle Fold Recursively Command\n{1}\n', Button(localize('toggleFold', 'Toggle Fold'), 'command:editor.toggleFold'), Button(localize('toggleFoldRecursively', 'Toggle Fold Recursively'), 'command:editor.toggleFoldRecursively')),
                    media: {
                        type: 'markdown',
                        path: 'empty',
                    },
                },
                {
                    id: 'intellisense',
                    title: localize('gettingStarted.intellisense.title', 'Use Intellisense to improve coding efficiency'),
                    description: localize('gettingStarted.intellisense.description.interpolated', 'Intellisense suggestions can be opened with the Trigger Intellisense command.\n{0}\n Inline intellisense suggestions can be triggered with Trigger Inline Suggestion\n{1}\n Useful settings include editor.inlineCompletionsAccessibilityVerbose and editor.screenReaderAnnounceInlineSuggestion.', Button(localize('triggerIntellisense', 'Trigger Intellisense'), 'command:editor.action.triggerSuggest'), Button(localize('triggerInlineSuggestion', 'Trigger Inline Suggestion'), 'command:editor.action.inlineSuggest.trigger')),
                    media: {
                        type: 'markdown',
                        path: 'empty',
                    },
                },
                {
                    id: 'accessibilitySettings',
                    title: localize('gettingStarted.accessibilitySettings.title', 'Configure accessibility settings'),
                    description: localize('gettingStarted.accessibilitySettings.description.interpolated', 'Accessibility settings can be configured by running the Open Accessibility Settings command.\n{0}', Button(localize('openAccessibilitySettings', 'Open Accessibility Settings'), 'command:workbench.action.openAccessibilitySettings')),
                    media: { type: 'markdown', path: 'empty' },
                },
            ],
        },
    },
    {
        id: 'Beginner',
        isFeatured: false,
        title: localize('gettingStarted.beginner.title', 'Learn the Fundamentals'),
        icon: beginnerIcon,
        description: localize('gettingStarted.beginner.description', 'Get an overview of the most essential features'),
        walkthroughPageTitle: localize('gettingStarted.beginner.walkthroughPageTitle', 'Essential Features'),
        content: {
            type: 'steps',
            steps: [
                {
                    id: 'extensions',
                    title: localize('gettingStarted.extensions.title', 'Code with extensions'),
                    description: localize('gettingStarted.extensions.description.interpolated', "Extensions are VS Code's power-ups. They range from handy productivity hacks, expanding out-of-the-box features, to adding completely new capabilities.\n{0}", Button(localize('browsePopular', 'Browse Popular Extensions'), 'command:workbench.extensions.action.showPopularExtensions')),
                    when: "workspacePlatform != 'webworker'",
                    media: {
                        type: 'svg',
                        altText: 'VS Code extension marketplace with featured language extensions',
                        path: 'extensions.svg',
                    },
                },
                {
                    id: 'terminal',
                    title: localize('gettingStarted.terminal.title', 'Built-in terminal'),
                    description: localize('gettingStarted.terminal.description.interpolated', 'Quickly run shell commands and monitor build output, right next to your code.\n{0}', Button(localize('showTerminal', 'Open Terminal'), 'command:workbench.action.terminal.toggleTerminal')),
                    when: "workspacePlatform != 'webworker' && remoteName != codespaces && !terminalIsOpen",
                    media: {
                        type: 'svg',
                        altText: 'Integrated terminal running a few npm commands',
                        path: 'terminal.svg',
                    },
                },
                {
                    id: 'debugging',
                    title: localize('gettingStarted.debug.title', 'Watch your code in action'),
                    description: localize('gettingStarted.debug.description.interpolated', 'Accelerate your edit, build, test, and debug loop by setting up a launch configuration.\n{0}', Button(localize('runProject', 'Run your Project'), 'command:workbench.action.debug.selectandstart')),
                    when: "workspacePlatform != 'webworker' && workspaceFolderCount != 0",
                    media: {
                        type: 'svg',
                        altText: 'Run and debug view.',
                        path: 'debug.svg',
                    },
                },
                {
                    id: 'scmClone',
                    title: localize('gettingStarted.scm.title', 'Track your code with Git'),
                    description: localize('gettingStarted.scmClone.description.interpolated', 'Set up the built-in version control for your project to track your changes and collaborate with others.\n{0}', Button(localize('cloneRepo', 'Clone Repository'), 'command:git.clone')),
                    when: 'config.git.enabled && !git.missing && workspaceFolderCount == 0',
                    media: {
                        type: 'svg',
                        altText: 'Source Control view.',
                        path: 'git.svg',
                    },
                },
                {
                    id: 'scmSetup',
                    title: localize('gettingStarted.scm.title', 'Track your code with Git'),
                    description: localize('gettingStarted.scmSetup.description.interpolated', 'Set up the built-in version control for your project to track your changes and collaborate with others.\n{0}', Button(localize('initRepo', 'Initialize Git Repository'), 'command:git.init')),
                    when: 'config.git.enabled && !git.missing && workspaceFolderCount != 0 && gitOpenRepositoryCount == 0',
                    media: {
                        type: 'svg',
                        altText: 'Source Control view.',
                        path: 'git.svg',
                    },
                },
                {
                    id: 'scm',
                    title: localize('gettingStarted.scm.title', 'Track your code with Git'),
                    description: localize('gettingStarted.scm.description.interpolated', 'No more looking up Git commands! Git and GitHub workflows are seamlessly integrated.\n{0}', Button(localize('openSCM', 'Open Source Control'), 'command:workbench.view.scm')),
                    when: "config.git.enabled && !git.missing && workspaceFolderCount != 0 && gitOpenRepositoryCount != 0 && activeViewlet != 'workbench.view.scm'",
                    media: {
                        type: 'svg',
                        altText: 'Source Control view.',
                        path: 'git.svg',
                    },
                },
                {
                    id: 'installGit',
                    title: localize('gettingStarted.installGit.title', 'Install Git'),
                    description: localize({
                        key: 'gettingStarted.installGit.description.interpolated',
                        comment: ['The placeholders are command link items should not be translated'],
                    }, 'Install Git to track changes in your projects.\n{0}\n{1}Reload window{2} after installation to complete Git setup.', Button(localize('installGit', 'Install Git'), 'https://aka.ms/vscode-install-git'), '[', '](command:workbench.action.reloadWindow)'),
                    when: 'git.missing',
                    media: {
                        type: 'svg',
                        altText: 'Install Git.',
                        path: 'git.svg',
                    },
                    completionEvents: ['onContext:git.state == initialized'],
                },
                {
                    id: 'tasks',
                    title: localize('gettingStarted.tasks.title', 'Automate your project tasks'),
                    when: "workspaceFolderCount != 0 && workspacePlatform != 'webworker'",
                    description: localize('gettingStarted.tasks.description.interpolated', 'Create tasks for your common workflows and enjoy the integrated experience of running scripts and automatically checking results.\n{0}', Button(localize('runTasks', 'Run Auto-detected Tasks'), 'command:workbench.action.tasks.runTask')),
                    media: {
                        type: 'svg',
                        altText: 'Task runner.',
                        path: 'runTask.svg',
                    },
                },
                {
                    id: 'shortcuts',
                    title: localize('gettingStarted.shortcuts.title', 'Customize your shortcuts'),
                    description: localize('gettingStarted.shortcuts.description.interpolated', 'Once you have discovered your favorite commands, create custom keyboard shortcuts for instant access.\n{0}', Button(localize('keyboardShortcuts', 'Keyboard Shortcuts'), 'command:toSide:workbench.action.openGlobalKeybindings')),
                    media: {
                        type: 'svg',
                        altText: 'Interactive shortcuts.',
                        path: 'shortcuts.svg',
                    },
                },
                {
                    id: 'workspaceTrust',
                    title: localize('gettingStarted.workspaceTrust.title', 'Safely browse and edit code'),
                    description: localize('gettingStarted.workspaceTrust.description.interpolated', '{0} lets you decide whether your project folders should **allow or restrict** automatic code execution __(required for extensions, debugging, etc)__.\nOpening a file/folder will prompt to grant trust. You can always {1} later.', Button(localize('workspaceTrust', 'Workspace Trust'), 'https://code.visualstudio.com/docs/editor/workspace-trust'), Button(localize('enableTrust', 'enable trust'), 'command:toSide:workbench.trust.manage')),
                    when: "workspacePlatform != 'webworker' && !isWorkspaceTrusted && workspaceFolderCount == 0",
                    media: {
                        type: 'svg',
                        altText: 'Workspace Trust editor in Restricted mode and a primary button for switching to Trusted mode.',
                        path: 'workspaceTrust.svg',
                    },
                },
            ],
        },
    },
    {
        id: 'notebooks',
        title: localize('gettingStarted.notebook.title', 'Customize Notebooks'),
        description: '',
        icon: setupIcon,
        isFeatured: false,
        when: `config.${NotebookSetting.openGettingStarted} && userHasOpenedNotebook`,
        walkthroughPageTitle: localize('gettingStarted.notebook.walkthroughPageTitle', 'Notebooks'),
        content: {
            type: 'steps',
            steps: [
                {
                    completionEvents: ['onCommand:notebook.setProfile'],
                    id: 'notebookProfile',
                    title: localize('gettingStarted.notebookProfile.title', 'Select the layout for your notebooks'),
                    description: localize('gettingStarted.notebookProfile.description', 'Get notebooks to feel just the way you prefer'),
                    when: 'userHasOpenedNotebook',
                    media: {
                        type: 'markdown',
                        path: 'notebookProfile',
                    },
                },
            ],
        },
    },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRDb250ZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lR2V0dGluZ1N0YXJ0ZWQvY29tbW9uL2dldHRpbmdTdGFydGVkQ29udGVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLGtCQUFrQixNQUFNLHlCQUF5QixDQUFBO0FBQ3hELE9BQU8sc0JBQXNCLE1BQU0sNEJBQTRCLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRS9HLE9BQU8sT0FBTyxNQUFNLGdEQUFnRCxDQUFBO0FBTXBFLE1BQU0scUNBQXFDO0lBQTNDO1FBQ2tCLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBMEMsQ0FBQTtJQVMvRSxDQUFDO0lBUEEsZ0JBQWdCLENBQUMsUUFBZ0IsRUFBRSxRQUF3QztRQUMxRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVELFdBQVcsQ0FBQyxRQUFnQjtRQUMzQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7Q0FDRDtBQUNELE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLElBQUkscUNBQXFDLEVBQUUsQ0FBQTtBQUV4RixNQUFNLENBQUMs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