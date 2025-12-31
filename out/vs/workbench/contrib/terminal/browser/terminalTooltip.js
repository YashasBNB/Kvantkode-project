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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUb29sdGlwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFRvb2x0aXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFJdkUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFRMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTFELE1BQU0sVUFBVSxvQkFBb0IsQ0FDbkMsUUFBMkIsRUFDM0IsY0FBK0I7SUFFL0IsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUM1QixjQUFjLENBQUMsR0FBRyx1SEFBZ0UsSUFBSSxHQUFHLENBQ3pGLENBQUE7SUFDRCxJQUFJLFlBQVksR0FBRyxFQUFFLENBQUE7SUFDckIsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUE7SUFDN0MsTUFBTSxPQUFPLEdBQWlDLEVBQUUsQ0FBQTtJQUNoRCxLQUFLLE1BQU0sTUFBTSxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQy9CLElBQUksWUFBWSxFQUFFLENBQUM7WUFDbEIsSUFBSSxNQUFNLENBQUMsZUFBZSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDOUMsWUFBWTtvQkFDWCxjQUFjLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO3dCQUMzRCxDQUFDLE1B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