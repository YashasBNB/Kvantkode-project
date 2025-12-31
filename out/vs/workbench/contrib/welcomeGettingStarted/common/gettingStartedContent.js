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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRDb250ZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUdldHRpbmdTdGFydGVkL2NvbW1vbi9nZXR0aW5nU3RhcnRlZENvbnRlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxrQkFBa0IsTUFBTSx5QkFBeUIsQ0FBQTtBQUN4RCxPQUFPLHNCQUFzQixNQUFNLDRCQUE0QixDQUFBO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUUvRyxPQUFPLE9BQU8sTUFBTSxnREFBZ0QsQ0FBQTtBQU1wRSxNQUFNLHFDQUFxQztJQUEzQztRQUNrQixjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQTBDLENBQUE7SUFTL0UsQ0FBQztJQVBBLGdCQUFnQixDQUFDLFFBQWdCLEVBQUUsUUFBd0M7UUFDMUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFRCxXQUFXLENBQUMsUUFBZ0I7UUFDM0IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0NBQ0Q7QUFDRCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLHFDQUFxQyxFQUFFLENBQUE7QUFFeEYsTUFBTSxDQUFDLEtBQUss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