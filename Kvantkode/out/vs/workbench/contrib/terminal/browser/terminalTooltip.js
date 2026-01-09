/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { asArray } from '../../../../base/common/arrays.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import Severity from '../../../../base/common/severity.js';
import { basename } from '../../../../base/common/path.js';
export function getInstanceHoverInfo(instance, storageService) {
    const showDetailed = parseInt(storageService.get("terminal.integrated.tabs.showDetailed" /* TerminalStorageKeys.TabsShowDetailed */, -1 /* StorageScope.APPLICATION */) ?? '0');
    let statusString = '';
    const statuses = instance.statusList.statuses;
    const actions = [];
    for (const status of statuses) {
        if (showDetailed) {
            if (status.detailedTooltip ?? status.tooltip) {
                statusString +=
                    `\n\n---\n\n${status.icon ? `$(${status.icon?.id}) ` : ''}` +
                        (status.detailedTooltip ?? status.tooltip ?? '');
            }
        }
        else {
            if (status.tooltip) {
                statusString +=
                    `\n\n---\n\n${status.icon ? `$(${status.icon?.id}) ` : ''}` + (status.tooltip ?? '');
            }
        }
        if (status.hoverActions) {
            actions.push(...status.hoverActions);
        }
    }
    actions.push({
        commandId: 'toggleDetailedInfo',
        label: showDetailed
            ? localize('hideDetails', 'Hide Details')
            : localize('showDetails', 'Show Details'),
        run() {
            storageService.store("terminal.integrated.tabs.showDetailed" /* TerminalStorageKeys.TabsShowDetailed */, (showDetailed + 1) % 2, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        },
    });
    const shellProcessString = getShellProcessTooltip(instance, !!showDetailed);
    const content = new MarkdownString(instance.title + shellProcessString + statusString, {
        supportThemeIcons: true,
    });
    return { content, actions };
}
export function getShellProcessTooltip(instance, showDetailed) {
    const lines = [];
    if (instance.processId && instance.processId > 0) {
        lines.push(localize({
            key: 'shellProcessTooltip.processId',
            comment: ['The first arg is "PID" which shouldn\'t be translated'],
        }, 'Process ID ({0}): {1}', 'PID', instance.processId) + '\n');
    }
    if (instance.shellLaunchConfig.executable) {
        let commandLine = '';
        if (!showDetailed && instance.shellLaunchConfig.executable.length > 32) {
            const base = basename(instance.shellLaunchConfig.executable);
            const sepIndex = instance.shellLaunchConfig.executable.length - base.length - 1;
            const sep = instance.shellLaunchConfig.executable.substring(sepIndex, sepIndex + 1);
            commandLine += `…${sep}${base}`;
        }
        else {
            commandLine += instance.shellLaunchConfig.executable;
        }
        const args = asArray(instance.injectedArgs || instance.shellLaunchConfig.args || [])
            .map((x) => (x.match(/\s/) ? `'${x}'` : x))
            .join(' ');
        if (args) {
            commandLine += ` ${args}`;
        }
        lines.push(localize('shellProcessTooltip.commandLine', 'Command line: {0}', commandLine));
    }
    return lines.length ? `\n\n---\n\n${lines.join('\n')}` : '';
}
export function refreshShellIntegrationInfoStatus(instance) {
    if (!instance.xterm) {
        return;
    }
    const cmdDetectionType = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)
        ?.hasRichCommandDetection
        ? localize('shellIntegration.rich', 'Rich')
        : instance.capabilities.has(2 /* TerminalCapability.CommandDetection */)
            ? localize('shellIntegration.basic', 'Basic')
            : instance.usedShellIntegrationInjection
                ? localize('shellIntegration.injectionFailed', 'Injection failed to activate')
                : localize('shellIntegration.no', 'No');
    const detailedAdditions = [];
    const seenSequences = Array.from(instance.xterm.shellIntegration.seenSequences);
    if (seenSequences.length > 0) {
        detailedAdditions.push(`Seen sequences: ${seenSequences.map((e) => `\`${e}\``).join(', ')}`);
    }
    const combinedString = instance.capabilities
        .get(2 /* TerminalCapability.CommandDetection */)
        ?.promptInputModel.getCombinedString();
    if (combinedString !== undefined) {
        detailedAdditions.push(`Prompt input: \`${combinedString}\``);
    }
    const detailedAdditionsString = detailedAdditions.length > 0 ? '\n\n' + detailedAdditions.map((e) => `- ${e}`).join('\n') : '';
    instance.statusList.add({
        id: "shell-integration-info" /* TerminalStatus.ShellIntegrationInfo */,
        severity: Severity.Info,
        tooltip: `${localize('shellIntegration', 'Shell integration')}: ${cmdDetectionType}`,
        detailedTooltip: `${localize('shellIntegration', 'Shell integration')}: ${cmdDetectionType}${detailedAdditionsString}`,
    });
}
