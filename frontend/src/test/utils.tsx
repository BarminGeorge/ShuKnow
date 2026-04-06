import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'jotai';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialValues?: Array<[any, any]>;
}

export function renderWithJotai(
  ui: ReactElement,
  { initialValues = [], ...renderOptions }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider>{children}</Provider>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export * from '@testing-library/react';
export { renderWithJotai as render };
