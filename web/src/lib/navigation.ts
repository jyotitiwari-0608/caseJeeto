export type HashTargetLookup = (id: string) => Pick<Element, 'scrollIntoView'> | null
export interface LinkActivation {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}

export function isUnmodifiedPrimaryActivation(event: LinkActivation) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

export function hashTargetId(hash: string) {
  if (!hash.startsWith('#') || hash.length === 1) return null
  try {
    return decodeURIComponent(hash.slice(1)) || null
  } catch {
    return null
  }
}

export function shouldResetScroll(hash: string) {
  return hashTargetId(hash) === null
}

export function scrollToLocationHash(hash: string, findTarget: HashTargetLookup = (id) => document.getElementById(id)) {
  const id = hashTargetId(hash)
  if (!id) return false
  const target = findTarget(id)
  if (!target) return false
  target.scrollIntoView({ behavior: 'instant', block: 'start' })
  return true
}

export function scrollRepeatedHashDestination(
  pathname: string,
  hash: string,
  destination: string,
  findTarget?: HashTargetLookup,
) {
  const destinationUrl = new URL(destination, 'https://casejeeto.local')
  if (pathname !== destinationUrl.pathname || hash !== destinationUrl.hash || !hashTargetId(hash)) return false
  return scrollToLocationHash(hash, findTarget)
}
