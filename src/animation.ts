function animationTime({ style }: { style: CSSStyleDeclaration }): number {
  const names = style.animationName.split(',').map((value) => value.trim())
  const durations = style.animationDuration.split(',')
  const delays = style.animationDelay.split(',')
  const iterations = style.animationIterationCount.split(',')
  const milliseconds = ({ value }: { value: string }) =>
    Number.parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000)

  return Math.max(
    0,
    ...names.map((name, index) => {
      if (!name || name === 'none') return 0
      const duration = milliseconds({ value: durations[index % durations.length] ?? '0s' })
      const delay = milliseconds({ value: delays[index % delays.length] ?? '0s' })
      const count = Number.parseFloat(iterations[index % iterations.length] ?? '1')
      // Infinite decorative animations must not prevent closure; wait one iteration.
      const end = delay + duration * (Number.isFinite(count) ? count : 1)
      return Number.isFinite(end) ? Math.max(0, end) : 0
    }),
  )
}

export function createAnimation(root: HTMLDialogElement) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let disposed = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let finishAnimation: (() => void) | undefined

  const cancel = () => {
    clearTimeout(timer)
    timer = undefined
    finishAnimation = undefined
  }

  const run = (onFinish: () => void) => {
    if (disposed) return

    cancel()

    const finish = () => {
      if (disposed || finishAnimation !== finish) return

      cancel()
      onFinish()
    }

    finishAnimation = finish

    const duration = reducedMotion.matches
      ? 0
      : Math.max(
          animationTime({ style: getComputedStyle(root) }),
          animationTime({ style: getComputedStyle(root, '::backdrop') }),
        )

    if (duration) {
      timer = setTimeout(finish, duration)
    } else {
      finish()
    }
  }

  const onReducedMotionChange = () => {
    if (reducedMotion.matches) finishAnimation?.()
  }

  reducedMotion.addEventListener('change', onReducedMotionChange)

  const dispose = () => {
    if (disposed) return

    disposed = true
    cancel()
    reducedMotion.removeEventListener('change', onReducedMotionChange)
  }

  return { run, cancel, dispose }
}
