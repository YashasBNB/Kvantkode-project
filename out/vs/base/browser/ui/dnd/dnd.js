/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $ } from '../../dom.js';
import './dnd.css';
export function applyDragImage(event, container, label, extraClasses = []) {
    if (!event.dataTransfer) {
        return;
    }
    const dragImage = $('.monaco-drag-image');
    dragImage.textContent = label;
    dragImage.classList.add(...extraClasses);
    const getDragImageContainer = (e) => {
        while (e && !e.classList.contains('monaco-workbench')) {
            e = e.parentElement;
        }
        return e || container.ownerDocument.body;
    };
    const dragContainer = getDragImageContainer(container);
    dragContainer.appendChild(dragImage);
    event.dataTransfer.setDragImage(dragImage, -10, -10);
    // Removes the element when the DND operation is done
    setTimeout(() => dragImage.remove(), 0);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2RuZC9kbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUNoQyxPQUFPLFdBQVcsQ0FBQTtBQUVsQixNQUFNLFVBQVUsY0FBYyxDQUM3QixLQUFnQixFQUNoQixTQUFzQixFQUN0QixLQUFhLEVBQ2IsZUFBeUIsRUFBRTtJQUUzQixJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3pCLE9BQU07SUFDUCxDQUFDO0lBRUQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDekMsU0FBUyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUE7SUFDN0IsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxZQUFZLENBQUMsQ0FBQTtJQUV4QyxNQUFNLHFCQUFxQixHQUFHLENBQUMsQ0FBcUIsRUFBRSxFQUFFO1FBQ3ZELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDO1lBQ3ZELENBQUMsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFBO1FBQ3BCLENBQUM7UUFDRCxPQUFPLENBQUMsSUFBSSxTQUFTLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQTtJQUN6QyxDQUFDLENBQUE7SUFFRCxNQUFNLGFBQWEsR0FBRyxxQkFBcUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUN0RCxhQUFhLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ3BDLEtBQUssQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBRXBELHFEQUFxRDtJQUNyRCxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ3hDLENBQUMifQ==