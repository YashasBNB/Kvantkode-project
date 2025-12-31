/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { deepClone } from '../../../../base/common/objects.js';
import { badgeBackground, buttonForeground, chartsBlue, chartsPurple, foreground, } from '../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable, registerColor, } from '../../../../platform/theme/common/colorUtils.js';
import { rot } from '../../../../base/common/numbers.js';
import { svgElem } from '../../../../base/browser/dom.js';
import { compareHistoryItemRefs } from './util.js';
export const SWIMLANE_HEIGHT = 22;
export const SWIMLANE_WIDTH = 11;
const SWIMLANE_CURVE_RADIUS = 5;
const CIRCLE_RADIUS = 4;
const CIRCLE_STROKE_WIDTH = 2;
/**
 * History item reference colors (local, remote, base)
 */
export const historyItemRefColor = registerColor('scmGraph.historyItemRefColor', chartsBlue, localize('scmGraphHistoryItemRefColor', 'History item reference color.'));
export const historyItemRemoteRefColor = registerColor('scmGraph.historyItemRemoteRefColor', chartsPurple, localize('scmGraphHistoryItemRemoteRefColor', 'History item remote reference color.'));
export const historyItemBaseRefColor = registerColor('scmGraph.historyItemBaseRefColor', '#EA5C00', localize('scmGraphHistoryItemBaseRefColor', 'History item base reference color.'));
/**
 * History item hover color
 */
export const historyItemHoverDefaultLabelForeground = registerColor('scmGraph.historyItemHoverDefaultLabelForeground', foreground, localize('scmGraphHistoryItemHoverDefaultLabelForeground', 'History item hover default label foreground color.'));
export const historyItemHoverDefaultLabelBackground = registerColor('scmGraph.historyItemHoverDefaultLabelBackground', badgeBackground, localize('scmGraphHistoryItemHoverDefaultLabelBackground', 'History item hover default label background color.'));
export const historyItemHoverLabelForeground = registerColor('scmGraph.historyItemHoverLabelForeground', buttonForeground, localize('scmGraphHistoryItemHoverLabelForeground', 'History item hover label foreground color.'));
export const historyItemHoverAdditionsForeground = registerColor('scmGraph.historyItemHoverAdditionsForeground', { light: '#587C0C', dark: '#81B88B', hcDark: '#A1E3AD', hcLight: '#374E06' }, localize('scmGraph.HistoryItemHoverAdditionsForeground', 'History item hover additions foreground color.'));
export const historyItemHoverDeletionsForeground = registerColor('scmGraph.historyItemHoverDeletionsForeground', { light: '#AD0707', dark: '#C74E39', hcDark: '#C74E39', hcLight: '#AD0707' }, localize('scmGraph.HistoryItemHoverDeletionsForeground', 'History item hover deletions foreground color.'));
/**
 * History graph color registry
 */
export const colorRegistry = [
    registerColor('scmGraph.foreground1', '#FFB000', localize('scmGraphForeground1', 'Source control graph foreground color (1).')),
    registerColor('scmGraph.foreground2', '#DC267F', localize('scmGraphForeground2', 'Source control graph foreground color (2).')),
    registerColor('scmGraph.foreground3', '#994F00', localize('scmGraphForeground3', 'Source control graph foreground color (3).')),
    registerColor('scmGraph.foreground4', '#40B0A6', localize('scmGraphForeground4', 'Source control graph foreground color (4).')),
    registerColor('scmGraph.foreground5', '#B66DFF', localize('scmGraphForeground5', 'Source control graph foreground color (5).')),
];
function getLabelColorIdentifier(historyItem, colorMap) {
    for (const ref of historyItem.references ?? []) {
        const colorIdentifier = colorMap.get(ref.id);
        if (colorIdentifier !== undefined) {
            return colorIdentifier;
        }
    }
    return undefined;
}
function createPath(colorIdentifier) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '1px');
    path.setAttribute('stroke-linecap', 'round');
    path.style.stroke = asCssVariable(colorIdentifier);
    return path;
}
function drawCircle(index, radius, strokeWidth, colorIdentifier) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', `${SWIMLANE_WIDTH * (index + 1)}`);
    circle.setAttribute('cy', `${SWIMLANE_WIDTH}`);
    circle.setAttribute('r', `${radius}`);
    circle.style.strokeWidth = `${strokeWidth}px`;
    if (colorIdentifier) {
        circle.style.fill = asCssVariable(colorIdentifier);
    }
    return circle;
}
function drawVerticalLine(x1, y1, y2, color) {
    const path = createPath(color);
    path.setAttribute('d', `M ${x1} ${y1} V ${y2}`);
    return path;
}
function findLastIndex(nodes, id) {
    for (let i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].id === id) {
            return i;
        }
    }
    return -1;
}
export function renderSCMHistoryItemGraph(historyItemViewModel) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('graph');
    const historyItem = historyItemViewModel.historyItem;
    const inputSwimlanes = historyItemViewModel.inputSwimlanes;
    const outputSwimlanes = historyItemViewModel.outputSwimlanes;
    // Find the history item in the input swimlanes
    const inputIndex = inputSwimlanes.findIndex((node) => node.id === historyItem.id);
    // Circle index - use the input swimlane index if present, otherwise add it to the end
    const circleIndex = inputIndex !== -1 ? inputIndex : inputSwimlanes.length;
    // Circle color - use the output swimlane color if present, otherwise the input swimlane color
    const circleColor = circleIndex < outputSwimlanes.length
        ? outputSwimlanes[circleIndex].color
        : circleIndex < inputSwimlanes.length
            ? inputSwimlanes[circleIndex].color
            : historyItemRefColor;
    let outputSwimlaneIndex = 0;
    for (let index = 0; index < inputSwimlanes.length; index++) {
        const color = inputSwimlanes[index].color;
        // Current commit
        if (inputSwimlanes[index].id === historyItem.id) {
            // Base commit
            if (index !== circleIndex) {
                const d = [];
                const path = createPath(color);
                // Draw /
                d.push(`M ${SWIMLANE_WIDTH * (index + 1)} 0`);
                d.push(`A ${SWIMLANE_WIDTH} ${SWIMLANE_WIDTH} 0 0 1 ${SWIMLANE_WIDTH * index} ${SWIMLANE_WIDTH}`);
                // Draw -
                d.push(`H ${SWIMLANE_WIDTH * (circleIndex + 1)}`);
                path.setAttribute('d', d.join(' '));
                svg.append(path);
            }
            else {
                outputSwimlaneIndex++;
            }
        }
        else {
            // Not the current commit
            if (outputSwimlaneIndex < outputSwimlanes.length &&
                inputSwimlanes[index].id === outputSwimlanes[outputSwimlaneIndex].id) {
                if (index === outputSwimlaneIndex) {
                    // Draw |
                    const path = drawVerticalLine(SWIMLANE_WIDTH * (index + 1), 0, SWIMLANE_HEIGHT, color);
                    svg.append(path);
                }
                else {
                    const d = [];
                    const path = createPath(color);
                    // Draw |
                    d.push(`M ${SWIMLANE_WIDTH * (index + 1)} 0`);
                    d.push(`V 6`);
                    // Draw /
                    d.push(`A ${SWIMLANE_CURVE_RADIUS} ${SWIMLANE_CURVE_RADIUS} 0 0 1 ${SWIMLANE_WIDTH * (index + 1) - SWIMLANE_CURVE_RADIUS} ${SWIMLANE_HEIGHT / 2}`);
                    // Draw -
                    d.push(`H ${SWIMLANE_WIDTH * (outputSwimlaneIndex + 1) + SWIMLANE_CURVE_RADIUS}`);
                    // Draw /
                    d.push(`A ${SWIMLANE_CURVE_RADIUS} ${SWIMLANE_CURVE_RADIUS} 0 0 0 ${SWIMLANE_WIDTH * (outputSwimlaneIndex + 1)} ${SWIMLANE_HEIGHT / 2 + SWIMLANE_CURVE_RADIUS}`);
                    // Draw |
                    d.push(`V ${SWIMLANE_HEIGHT}`);
                    path.setAttribute('d', d.join(' '));
                    svg.append(path);
                }
                outputSwimlaneIndex++;
            }
        }
    }
    // Add remaining parent(s)
    for (let i = 1; i < historyItem.parentIds.length; i++) {
        const parentOutputIndex = findLastIndex(outputSwimlanes, historyItem.parentIds[i]);
        if (parentOutputIndex === -1) {
            continue;
        }
        // Draw -\
        const d = [];
        const path = createPath(outputSwimlanes[parentOutputIndex].color);
        // Draw \
        d.push(`M ${SWIMLANE_WIDTH * parentOutputIndex} ${SWIMLANE_HEIGHT / 2}`);
        d.push(`A ${SWIMLANE_WIDTH} ${SWIMLANE_WIDTH} 0 0 1 ${SWIMLANE_WIDTH * (parentOutputIndex + 1)} ${SWIMLANE_HEIGHT}`);
        // Draw -
        d.push(`M ${SWIMLANE_WIDTH * parentOutputIndex} ${SWIMLANE_HEIGHT / 2}`);
        d.push(`H ${SWIMLANE_WIDTH * (circleIndex + 1)} `);
        path.setAttribute('d', d.join(' '));
        svg.append(path);
    }
    // Draw | to *
    if (inputIndex !== -1) {
        const path = drawVerticalLine(SWIMLANE_WIDTH * (circleIndex + 1), 0, SWIMLANE_HEIGHT / 2, inputSwimlanes[inputIndex].color);
        svg.append(path);
    }
    // Draw | from *
    if (historyItem.parentIds.length > 0) {
        const path = drawVerticalLine(SWIMLANE_WIDTH * (circleIndex + 1), SWIMLANE_HEIGHT / 2, SWIMLANE_HEIGHT, circleColor);
        svg.append(path);
    }
    // Draw *
    if (historyItemViewModel.isCurrent) {
        // HEAD
        const outerCircle = drawCircle(circleIndex, CIRCLE_RADIUS + 3, CIRCLE_STROKE_WIDTH, circleColor);
        svg.append(outerCircle);
        const innerCircle = drawCircle(circleIndex, CIRCLE_STROKE_WIDTH, CIRCLE_RADIUS);
        svg.append(innerCircle);
    }
    else {
        if (historyItem.parentIds.length > 1) {
            // Multi-parent node
            const circleOuter = drawCircle(circleIndex, CIRCLE_RADIUS + 2, CIRCLE_STROKE_WIDTH, circleColor);
            svg.append(circleOuter);
            const circleInner = drawCircle(circleIndex, CIRCLE_RADIUS - 1, CIRCLE_STROKE_WIDTH, circleColor);
            svg.append(circleInner);
        }
        else {
            // Node
            const circle = drawCircle(circleIndex, CIRCLE_RADIUS + 1, CIRCLE_STROKE_WIDTH, circleColor);
            svg.append(circle);
        }
    }
    // Set dimensions
    svg.style.height = `${SWIMLANE_HEIGHT}px`;
    svg.style.width = `${SWIMLANE_WIDTH * (Math.max(inputSwimlanes.length, outputSwimlanes.length, 1) + 1)}px`;
    return svg;
}
export function renderSCMHistoryGraphPlaceholder(columns) {
    const elements = svgElem('svg', {
        style: { height: `${SWIMLANE_HEIGHT}px`, width: `${SWIMLANE_WIDTH * (columns.length + 1)}px` },
    });
    // Draw |
    for (let index = 0; index < columns.length; index++) {
        const path = drawVerticalLine(SWIMLANE_WIDTH * (index + 1), 0, SWIMLANE_HEIGHT, columns[index].color);
        elements.root.append(path);
    }
    return elements.root;
}
export function toISCMHistoryItemViewModelArray(historyItems, colorMap = new Map(), currentHistoryItemRef, currentHistoryItemRemoteRef, currentHistoryItemBaseRef) {
    let colorIndex = -1;
    const viewModels = [];
    for (let index = 0; index < historyItems.length; index++) {
        const historyItem = historyItems[index];
        const isCurrent = historyItem.id === currentHistoryItemRef?.revision;
        const outputSwimlanesFromPreviousItem = viewModels.at(-1)?.outputSwimlanes ?? [];
        const inputSwimlanes = outputSwimlanesFromPreviousItem.map((i) => deepClone(i));
        const outputSwimlanes = [];
        let firstParentAdded = false;
        // Add first parent to the output
        if (historyItem.parentIds.length > 0) {
            for (const node of inputSwimlanes) {
                if (node.id === historyItem.id) {
                    if (!firstParentAdded) {
                        outputSwimlanes.push({
                            id: historyItem.parentIds[0],
                            color: getLabelColorIdentifier(historyItem, colorMap) ?? node.color,
                        });
                        firstParentAdded = true;
                    }
                    continue;
                }
                outputSwimlanes.push(deepClone(node));
            }
        }
        // Add unprocessed parent(s) to the output
        for (let i = firstParentAdded ? 1 : 0; i < historyItem.parentIds.length; i++) {
            // Color index (label -> next color)
            let colorIdentifier;
            if (i === 0) {
                colorIdentifier = getLabelColorIdentifier(historyItem, colorMap);
            }
            else {
                const historyItemParent = historyItems.find((h) => h.id === historyItem.parentIds[i]);
                colorIdentifier = historyItemParent
                    ? getLabelColorIdentifier(historyItemParent, colorMap)
                    : undefined;
            }
            if (!colorIdentifier) {
                colorIndex = rot(colorIndex + 1, colorRegistry.length);
                colorIdentifier = colorRegistry[colorIndex];
            }
            outputSwimlanes.push({
                id: historyItem.parentIds[i],
                color: colorIdentifier,
            });
        }
        // Add colors to references
        const references = (historyItem.references ?? []).map((ref) => {
            let color = colorMap.get(ref.id);
            if (colorMap.has(ref.id) && color === undefined) {
                // Find the history item in the input swimlanes
                const inputIndex = inputSwimlanes.findIndex((node) => node.id === historyItem.id);
                // Circle index - use the input swimlane index if present, otherwise add it to the end
                const circleIndex = inputIndex !== -1 ? inputIndex : inputSwimlanes.length;
                // Circle color - use the output swimlane color if present, otherwise the input swimlane color
                color =
                    circleIndex < outputSwimlanes.length
                        ? outputSwimlanes[circleIndex].color
                        : circleIndex < inputSwimlanes.length
                            ? inputSwimlanes[circleIndex].color
                            : historyItemRefColor;
            }
            return { ...ref, color };
        });
        // Sort references
        references.sort((ref1, ref2) => compareHistoryItemRefs(ref1, ref2, currentHistoryItemRef, currentHistoryItemRemoteRef, currentHistoryItemBaseRef));
        viewModels.push({
            historyItem: {
                ...historyItem,
                references,
            },
            isCurrent,
            inputSwimlanes,
            outputSwimlanes,
        });
    }
    return viewModels;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtSGlzdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NjbS9icm93c2VyL3NjbUhpc3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sZUFBZSxFQUNmLGdCQUFnQixFQUNoQixVQUFVLEVBQ1YsWUFBWSxFQUNaLFVBQVUsR0FDVixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFDTixhQUFhLEVBRWIsYUFBYSxHQUNiLE1BQU0saURBQWlELENBQUE7QUFPeEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFFbEQsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLEVBQUUsQ0FBQTtBQUNqQyxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFBO0FBQ2hDLE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxDQUFBO0FBQy9CLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBQTtBQUN2QixNQUFNLG1CQUFtQixHQUFHLENBQUMsQ0FBQTtBQUU3Qjs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGFBQWEsQ0FDL0MsOEJBQThCLEVBQzlCLFVBQVUsRUFDVixRQUFRLENBQUMsNkJBQTZCLEVBQUUsK0JBQStCLENBQUMsQ0FDeEUsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGFBQWEsQ0FDckQsb0NBQW9D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