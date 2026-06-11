export function getKnowledgeSpaceId() {
  return Number(localStorage.getItem('spaceId')) || 0
}
