import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import writingReducer from '../store/modules/writingSlice'
import chatReducer from '../store/modules/chatSlice'

// Create a custom render function that includes providers
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      writing: writingReducer,
      chat: chatReducer
    },
    preloadedState
  })
}

interface AllTheProvidersProps {
  children: React.ReactNode
  preloadedState?: any
}

const AllTheProviders = ({ 
  children, 
  preloadedState = {} 
}: AllTheProvidersProps) => {
  const store = createTestStore(preloadedState)
  
  return (
    <Provider store={store}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    preloadedState?: any
  }
) => {
  const { preloadedState, ...renderOptions } = options || {}
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders 
      preloadedState={preloadedState}
    >
      {children}
    </AllTheProviders>
  )
  
  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

export * from '@testing-library/react'
export { customRender as render }