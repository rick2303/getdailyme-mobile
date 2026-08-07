import { Component, type ReactNode } from 'react'
import { ScrollView, Text } from 'react-native'

// En release no existe la pantalla roja: un error sin capturar cierra la app
// sin decir nada, que es imposible de diagnosticar desde TestFlight. Esto lo
// convierte en texto legible que se puede fotografiar y traer.
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 12 }}>
            Algo se rompió al arrancar
          </Text>
          <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
            {String(this.state.error?.message ?? this.state.error)}
          </Text>
          <Text style={{ fontFamily: 'monospace', fontSize: 10, marginTop: 12, opacity: 0.6 }}>
            {String((this.state.error as Error)?.stack ?? '').slice(0, 1500)}
          </Text>
        </ScrollView>
      )
    }
    return this.props.children
  }
}
