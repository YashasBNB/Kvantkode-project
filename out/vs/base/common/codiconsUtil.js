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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kaWNvbnNVdGlsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vY29kaWNvbnNVdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUtBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFckMsTUFBTSxzQkFBc0IsR0FBNkIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUU1RSxNQUFNLFVBQVUsUUFBUSxDQUFDLEVBQVUsRUFBRSxhQUE4QjtJQUNsRSxJQUFJLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1FBQzdCLE1BQU0sR0FBRyxHQUFHLHNCQUFzQixDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ2pELElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxFQUFFLG1DQUFtQyxhQUFhLEVBQUUsQ0FBQyxDQUFBO1FBQ3pFLENBQUM7UUFDRCxhQUFhLEdBQUcsR0FBRyxDQUFBO0lBQ3BCLENBQUM7SUFDRCxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFhLENBQUE7SUFDMUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFBO0FBQ2QsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLHdCQUF3QjtJQUN2QyxPQUFPLHNCQUFzQixDQUFBO0FBQzlCLENBQUMifQ==