import '@mantine/core/styles.css'
import { createTheme, MantineProvider, type MantineColorsTuple } from '@mantine/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { LangProvider } from './LangProvider'
import './theme.css'
import './index.css'

// Index 6 is the brand colour exactly, because that is the step Mantine reaches
// for by default — `color="brand"` has to be #2BB77B and not an approximation.
const brand: MantineColorsTuple = [
  '#e7f7f0',
  '#c7eddd',
  '#9adfc3',
  '#6ad0a8',
  '#45c492',
  '#31bc83',
  '#2bb77b',
  '#22a16c',
  '#188e5d',
  '#0a794d',
]

// The neutral family, built from the brand's own slate rather than from
// Mantine's blue-grey, so surfaces and borders belong to the same palette as
// everything drawn on them. Index 5 is #373B46 exactly.
const slate: MantineColorsTuple = [
  '#c9cfd9',
  '#a9b2bf',
  '#8a94a3',
  '#6b7585',
  '#4c5666',
  '#373b46',
  '#2a2e37',
  '#1b1e24',
  '#14161a',
  '#0e1013',
]

const theme = createTheme({
  primaryColor: 'brand',
  // Left at 6 deliberately. `primaryShade` picks the step for *every* filled
  // colour, not only the primary one, so raising it for light mode turned every
  // neutral control on the board near-black.
  primaryShade: 6,
  colors: { brand, dark: slate },
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  // The same five steps the stylesheet declares, so a component can reach for
  // either without the two drifting apart.
  fontSizes: {
    xs: 'var(--fs-caption)',
    sm: 'var(--fs-body)',
    md: 'var(--fs-title)',
    lg: 'var(--fs-heading)',
    xl: 'var(--fs-display)',
  },
  headings: { fontWeight: '700' },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <LangProvider>
        <App />
      </LangProvider>
    </MantineProvider>
  </StrictMode>,
)
