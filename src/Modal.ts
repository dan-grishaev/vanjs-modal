import van from 'vanjs-core'
import type { ChildDom, StateView } from 'vanjs-core'

import { createAnimation } from './animation.ts'
import { addModal, isTop, removeModal } from './stack.ts'
import type { ModalEntry } from './stack.ts'

type Reactive<T> = T | StateView<T> | (() => T)

export interface ModalAnimationEvent {
  phase: 'opening' | 'closing'
}

export interface ModalOptions {
  open: StateView<boolean> | (() => boolean)
  center?: Reactive<boolean>
  /** Completed transitions only; interrupted transitions and disposal do not notify. */
  onAnimationEnd?: (event: ModalAnimationEvent) => void
  onCloseRequest: () => void
  closeOnEscape?: Reactive<boolean>
  closeOnOutsideClick?: Reactive<boolean>
  showCloseButton?: Reactive<boolean>
  /** Native dialog title, also used as its accessible name. */
  title?: Reactive<string>
  class?: Reactive<string>
}

export interface ModalHandle {
  /** Releases the portal and its listeners. Safe to call more than once. */
  dispose(): void
}

function read<T>(value: Reactive<T>): T {
  if (typeof value === 'function') {
    return (value as () => T)()
  }
  return value !== null && typeof value === 'object' && 'val' in value ? value.val : value
}

export function Modal(options: ModalOptions, ...children: readonly ChildDom[]): ModalHandle {
  if (typeof document === 'undefined' || !document.body) {
    throw new Error('Modal requires a browser document with a body.')
  }

  if (typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) {
    throw new Error('Modal requires native HTMLDialogElement.showModal() support.')
  }

  let disposed = false
  let entry: ModalEntry | null = null
  let pointerStartedOutside = false
  let phase: 'closed' | 'open' | ModalAnimationEvent['phase'] = 'closed'

  const { dialog, button, span } = van.tags

  const root = dialog({ class: 'vanjs-modal' })
  const abort = new AbortController()
  const listenerOptions = { signal: abort.signal }
  const animation = createAnimation(root)

  const animate = ({ phase: nextPhase }: ModalAnimationEvent) => {
    phase = nextPhase
    root.dataset.phase = nextPhase

    animation.run(() => {
      if (disposed) {
        return
      }

      // State may have changed before VanJS has run its next binding update.
      if (read(options.open) !== (nextPhase === 'opening')) {
        sync(read(options.open))
        return
      }

      phase = nextPhase === 'opening' ? 'open' : 'closed'

      root.dataset.phase = phase

      if (phase === 'closed' && entry) {
        const removed = entry
        entry = null
        pointerStartedOutside = false
        removeModal(removed)
      }

      options.onAnimationEnd?.({ phase: nextPhase })
    })
  }

  const requestClose = () => {
    if (!disposed && entry && phase !== 'closing' && read(options.open) && isTop(entry)) {
      options.onCloseRequest()
    }
  }

  const closeButton = button(
    {
      type: 'button',
      class: 'vanjs-modal__close',
      title: 'Close',
      onclick: () => requestClose(),
    },
    '×',
  )

  const updateOptions = () => {
    root.className = ['vanjs-modal', read(options.class ?? '')].filter(Boolean).join(' ')
    root.classList.toggle('vanjs-modal_center', read(options.center ?? false))
    root.title = read(options.title ?? '')
    closeButton.hidden = !read(options.showCloseButton ?? true)
  }

  van.add(root, ...children, closeButton)

  const sync = (open: boolean) => {
    if (disposed) {
      return
    }

    if (open) {
      if (!entry) {
        const next = {
          dialog: root,
          returnFocus:
            document.activeElement instanceof HTMLElement ? document.activeElement : null,
        }

        root.showModal()

        entry = next

        addModal(next)

        animate({ phase: 'opening' })
      } else if (!root.open) {
        root.showModal()

        animate({ phase: 'opening' })
      } else if (phase === 'closing') {
        animate({ phase: 'opening' })
      }
    } else if (entry && phase !== 'closing') {
      animate({ phase: 'closing' })
    }
  }

  root.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key !== 'Escape' ||
        event.isComposing ||
        event.defaultPrevented ||
        !entry ||
        !isTop(entry)
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      if (read(options.closeOnEscape ?? true) && !event.repeat) {
        requestClose()
      }
    },
    listenerOptions,
  )

  root.addEventListener(
    'cancel',
    (event) => {
      event.preventDefault()

      if (read(options.closeOnEscape ?? true)) {
        requestClose()
      }
    },
    listenerOptions,
  )

  const isOutside = (event: MouseEvent) => {
    const rect = root.getBoundingClientRect()

    return (
      event.target === root &&
      (event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom)
    )
  }

  root.addEventListener(
    'pointerdown',
    (event) => {
      pointerStartedOutside = event.button === 0 && isOutside(event)
    },
    listenerOptions,
  )

  root.addEventListener(
    'pointercancel',
    () => {
      pointerStartedOutside = false
    },
    listenerOptions,
  )

  root.addEventListener(
    'click',
    (event) => {
      const shouldClose = pointerStartedOutside && isOutside(event)
      pointerStartedOutside = false
      if (shouldClose && read(options.closeOnOutsideClick ?? true)) {
        requestClose()
      }
    },
    listenerOptions,
  )

  root.addEventListener(
    'submit',
    (event) => {
      if (event.defaultPrevented || !(event.target instanceof HTMLFormElement)) {
        return
      }
      const submitter = event.submitter
      const method = submitter?.getAttribute('formmethod') ?? event.target.method
      if (method.toLowerCase() === 'dialog') {
        event.preventDefault()
        requestClose()
      }
    },
    listenerOptions,
  )

  root.addEventListener('close', () => sync(read(options.open)), listenerOptions)

  const dispose = () => {
    if (disposed) {
      return
    }

    disposed = true
    animation.dispose()
    abort.abort()

    try {
      if (entry) {
        const removed = entry
        entry = null
        removeModal(removed)
      }
    } finally {
      root.remove()
    }
  }

  document.body.append(root)

  try {
    updateOptions()
    sync(read(options.open))

    const binding = span({ hidden: true })
    root.append(binding)

    van.add(binding, () => {
      updateOptions()
      sync(read(options.open))
      return ''
    })
  } catch (error) {
    dispose()
    throw error
  }

  return { dispose }
}
