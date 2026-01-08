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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUb29sdGlwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsVG9vbHRpcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUl2RSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQVExRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFMUQsTUFBTSxVQUFVLG9CQUFvQixDQUNuQyxRQUEyQixFQUMzQixjQUErQjtJQUUvQixNQUFNLFlBQVksR0FBRyxRQUFRLENBQzVCLGNBQWMsQ0FBQyxHQUFHLHVIQUFnRSxJQUFJLEdBQUcsQ0FDekYsQ0FBQTtJQUNELElBQUksWUFBWSxHQUFHLEVBQUUsQ0FBQTtJQUNyQixNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQTtJQUM3QyxNQUFNLE9BQU8sR0FBaUMsRUFBRSxDQUFBO0lBQ2hELEtBQUssTUFBTSxNQUFNLElBQUksUUFBUSxFQUFFLENBQUM7UUFDL0IsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixJQUFJLE1BQU0sQ0FBQyxlQUFlLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM5QyxZQUFZO29CQUNYLGNBQWMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7d0JBQzNELENB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