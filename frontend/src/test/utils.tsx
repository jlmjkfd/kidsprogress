import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../store/slices/authSlice'

// Create a custom render function that includes providers
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState
  })
}

// Create a query client for testing
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
})

interface AllTheProvidersProps {
  children: React.ReactNode
  preloadedState?: any
  queryClient?: QueryClient
}

const AllTheProviders = ({
  children,
  preloadedState = {},
  queryClient
}: AllTheProvidersProps) => {
  const store = createTestStore(preloadedState)
  const client = queryClient || createTestQueryClient()

  return (
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    preloadedState?: any
    queryClient?: QueryClient
  }
) => {
  const { preloadedState, queryClient, ...renderOptions } = options || {}

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders
      preloadedState={preloadedState}
      queryClient={queryClient}
    >
      {children}
    </AllTheProviders>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

export * from '@testing-library/react'
export { customRender as render, createTestQueryClient, createTestStore }
