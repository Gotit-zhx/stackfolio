import { Github } from './social-icons/icons'

// Reuse the starter's Simple Icons brand asset; Lucide covers interface icons.
export default function GitHubIcon({ size = 16 }: { size?: number }) {
  return <Github width={size} height={size} fill="currentColor" aria-hidden="true" />
}
