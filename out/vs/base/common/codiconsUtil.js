import { isString } from './types.js';
const _codiconFontCharacters = Object.create(null);
export function register(id, fontCharacter) {
    if (isString(fontCharacter)) {
        const val = _codiconFontCharacters[fontCharacter];
        if (val === undefined) {
            throw new Error(`${id} references an unknown codicon: ${fontCharacter}`);
        }
        fontCharacter = val;
    }
    _codiconFontCharacters[id] = fontCharacter;
    return { id };
}
/**
 * Only to be used by the iconRegistry.
 */
export function getCodiconFontCharacters() {
    return _codiconFontCharacters;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kaWNvbnNVdGlsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9jb2RpY29uc1V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBS0EsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVyQyxNQUFNLHNCQUFzQixHQUE2QixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBRTVFLE1BQU0sVUFBVSxRQUFRLENBQUMsRUFBVSxFQUFFLGFBQThCO0lBQ2xFLElBQUksUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7UUFDN0IsTUFBTSxHQUFHLEdBQUcsc0JBQXNCLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDakQsSUFBSSxHQUFHLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLEVBQUUsbUNBQW1DLGFBQWEsRUFBRSxDQUFDLENBQUE7UUFDekUsQ0FBQztRQUNELGFBQWEsR0FBRyxHQUFHLENBQUE7SUFDcEIsQ0FBQztJQUNELHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxHQUFHLGFBQWEsQ0FBQTtJQUMxQyxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUE7QUFDZCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsd0JBQXdCO0lBQ3ZDLE9BQU8sc0JBQXNCLENBQUE7QUFDOUIsQ0FBQyJ9