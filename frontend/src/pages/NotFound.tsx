import { LinkButton, Message } from '../components/States'
import { useDocumentTitle } from '../lib/hooks'

export function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <Message title="This page doesn't exist" action={<LinkButton to="/">Go home</LinkButton>}>
      The link may be mistyped. Every verse lives at an address like /verse/2/47.
    </Message>
  )
}
