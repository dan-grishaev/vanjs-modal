import van from 'vanjs-core'

import { Modal } from 'vanjs-modal'
import 'vanjs-modal/style.css'

const { button, h2, p } = van.tags

const open = van.state(false)

Modal(
  {
    open,
    title: 'Modal demo',
    onCloseRequest: () => {
      open.val = false
    },
  },
  h2('Modal demo'),
  p('Close the modal using the close button, Escape, or a click outside.'),
)

van.add(document.body, button({ onclick: () => (open.val = true) }, 'Open modal'))
