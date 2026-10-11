export interface ModalEntry {
  dialog: HTMLDialogElement
  returnFocus: HTMLElement | null
}

interface SavedOverflow {
  element: HTMLElement
  properties: { name: string; value: string; priority: string }[]
}

const stack: ModalEntry[] = []

let savedOverflow: SavedOverflow[] = []

export function isTop(entry: ModalEntry): boolean {
  return stack.at(-1) === entry
}

export function addModal(entry: ModalEntry): void {
  if (!stack.length) {
    savedOverflow = [document.documentElement, document.body].map((element) => ({
      element,
      properties: ['overflow-x', 'overflow-y'].map((name) => ({
        name,
        value: element.style.getPropertyValue(name),
        priority: element.style.getPropertyPriority(name),
      })),
    }))

    for (const { element } of savedOverflow) {
      element.style.setProperty('overflow', 'hidden', 'important')
    }
  }

  stack.push(entry)
}

export function removeModal(entry: ModalEntry): void {
  const index = stack.indexOf(entry)

  if (index < 0) {
    return
  }

  const wasTop = isTop(entry)
  stack.splice(index, 1)

  for (const remaining of stack) {
    if (remaining.returnFocus && entry.dialog.contains(remaining.returnFocus)) {
      remaining.returnFocus = entry.returnFocus
    }
  }

  try {
    entry.dialog.close()
  } finally {
    if (!stack.length) {
      for (const { element, properties } of savedOverflow) {
        element.style.removeProperty('overflow')
        for (const { name, value, priority } of properties) {
          if (value) {
            element.style.setProperty(name, value, priority)
          }
        }
      }
      savedOverflow = []
    }

    const top = stack.at(-1)
    const target = entry.returnFocus

    if (
      wasTop &&
      target?.isConnected &&
      !target.closest('[inert], [hidden], dialog:not([open])') &&
      (!top || top.dialog.contains(target))
    ) {
      target.focus({ preventScroll: true })
    }

    if (top && !top.dialog.contains(document.activeElement)) {
      top.dialog.focus({ preventScroll: true })
    }
  }
}
