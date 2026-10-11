# vanjs-modal

Controlled native modal dialogs for VanJS.

- Composable VanJS content.
- Centered and scrollable modals.
- Multiple modals with focus restoration.
- Page scroll locking.
- Reactive options.
- CSS customization.
- Animations with reduced-motion support.
- TypeScript support.

## Installation

```sh
npm install vanjs-modal
```

## Quick start

```ts
import van from 'vanjs-core'
import { Modal } from 'vanjs-modal'
import 'vanjs-modal/style.css'

const { h2, p, button } = van.tags
const open = van.state(false)

const modal = Modal(
  {
    open,
    title: 'Settings',
    class: 'settings-modal',
    onCloseRequest: () => {
      open.val = false
    },
  },
  h2('Settings'),
  p('Update your preferences.'),
  button({ onclick: () => (open.val = false) }, 'Save'),
)

van.add(document.body, button({ onclick: () => (open.val = true) }, 'Open settings'))
```

## API

```ts
Modal(options: ModalOptions, ...children: readonly ChildDom[]): ModalHandle
```

`Modal` appends a `<dialog>` to `document.body` and returns a cleanup handle, which must not be passed to `van.add`.

Children use VanJS's `ChildDom` type, including elements, primitives, states, binding functions, nested arrays, `null`, and `undefined`.

Exported types are `ModalOptions`, `ModalHandle`, and `ModalAnimationEvent`.

### Options

In the table below, `Reactive<T>` means `T | StateView<T> | (() => T)`, where `StateView` comes from `vanjs-core`.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `open` | `StateView<boolean> \| (() => boolean)` | Required | Controls whether the dialog is open. |
| `onCloseRequest` | `() => void` | Required | Handles close requests from the topmost modal; update `open` to accept a request. |
| `center` | `Reactive<boolean>` | `false` | Centers the dialog vertically with the package stylesheet or equivalent custom CSS. |
| `closeOnEscape` | `Reactive<boolean>` | `true` | Allows Escape and native cancel events to request closure. |
| `closeOnOutsideClick` | `Reactive<boolean>` | `true` | Allows a click that starts and finishes outside the dialog to request closure. |
| `showCloseButton` | `Reactive<boolean>` | `true` | Shows the built-in close button. |
| `title` | `Reactive<string>` | `''` | Sets the native dialog title used as its accessible name. |
| `class` | `Reactive<string>` | `''` | Adds classes to the dialog. |
| `onAnimationEnd` | `(event: ModalAnimationEvent) => void` | — | Receives `{ phase: 'opening' \| 'closing' }` after a completed transition, including when motion is disabled, but not after interruption or disposal. |

## Styling

Import `vanjs-modal/style.css` as shown in the quick start, or provide your own styles for `.vanjs-modal`, `.vanjs-modal_center`, and `.vanjs-modal__close`.

```css
.settings-modal {
  width: 28rem;
  padding: 1.5rem;
  border-radius: 0.5rem;
}

.settings-modal::backdrop {
  background: rgb(0 0 0 / 40%);
}
```

The package stylesheet applies 300 ms fade animations to the dialog and backdrop using `data-phase="opening"` and `data-phase="closing"`, and disables them for `prefers-reduced-motion: reduce`.

## Cleanup

Call `dispose()` when the owning view is removed to release the dialog and its listeners; repeated calls are safe.

```ts
modal.dispose()
```

## License

[MIT](./LICENSE)
