export function replaceOntologyFieldPlaceholder(template: string, fieldName: string): string {
  return template
    .replace(/\{\{\s*(?:field|字段)\s*\}\}/giu, fieldName)
    .replace(/\$\{\s*(?:field|字段)\s*\}/giu, fieldName)
    .replace(/\{\s*(?:field|字段)\s*\}/giu, fieldName)
    .replace(/##\s*(?:field|字段)\s*##/giu, fieldName)
    .replace(/%s/iu, fieldName)
    .replace(/\bX\b/giu, fieldName)
}
