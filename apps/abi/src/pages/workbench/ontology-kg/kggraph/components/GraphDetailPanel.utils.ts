import { getMappedAttributeDisplayName } from '../../entity/utils/attributePresentation'
import type { OntologyEntityAttribute } from '../../shared-network-types'

export function getGraphAttributeDisplayName(attribute: OntologyEntityAttribute): string {
  return getMappedAttributeDisplayName(attribute.attributeName) || '-'
}
